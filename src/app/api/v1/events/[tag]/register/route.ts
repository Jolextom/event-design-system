import { NextRequest } from "next/server";
import { adminClient, corsJson, corsPreflight } from "@/lib/apiV1";
import { initializeTransaction } from "@/lib/paystack";
import { fulfillOrder } from "@/lib/registrations";

export async function OPTIONS(req: NextRequest) {
    return corsPreflight(req);
}

interface RegisterGuest {
    firstName: string;
    lastName?: string;
    email: string;
    isInvite?: boolean;
    answers?: Record<string, string | string[] | number>;
}

/**
 * POST /api/v1/events/[tag]/register
 * Headless registration for external sites. Mirrors the hosted registration
 * page's flow and validations exactly.
 *
 * Body: {
 *   pass_id: string;
 *   guests: [{ firstName, lastName?, email, isInvite?, answers?: {questionId: text} }]
 *   callback_url?: string;   // where Paystack redirects after payment (paid passes)
 * }
 *
 * Response (free pass):  { status: "registered", order_ref }
 * Response (paid pass):  { status: "payment_required", order_ref, authorization_url }
 * The embedding site redirects the user to authorization_url; fulfillment
 * happens via the existing Paystack webhook exactly as on the hosted flow.
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ tag: string }> }
) {
    const { tag } = await params;

    try {
        const supabase = adminClient();
        const body = await req.json();
        const { pass_id, guests, callback_url, ref } = body as {
            pass_id: string;
            guests: RegisterGuest[];
            callback_url?: string;
            ref?: string;
        };

        if (!pass_id) return corsJson(req, { error: "pass_id is required" }, { status: 400 });
        if (!Array.isArray(guests) || guests.length === 0) {
            return corsJson(req, { error: "At least one guest is required" }, { status: 400 });
        }

        // Load event + pass + questions
        const { data: event, error: eventErr } = await supabase
            .from("events")
            .select("id, event_title, tag, is_published, questions (id, title, is_required, is_selection_logic, show_for_option_id, options:question_options!question_options_question_id_fkey(id, option_text))")
            .eq("tag", tag)
            .single();

        if (eventErr || !event) return corsJson(req, { error: "Event not found" }, { status: 404 });
        if (!event.is_published) return corsJson(req, { error: "Event is not open for registration" }, { status: 403 });

        const { data: pass, error: passErr } = await supabase
            .from("passes")
            .select("*")
            .eq("id", pass_id)
            .eq("event_id", event.id)
            .single();

        if (passErr || !pass) return corsJson(req, { error: "Ticket type not found for this event" }, { status: 404 });

        // Normalize guests: primary must have name+email; invites may be email-only
        const validGuests = guests
            .map((g, i) => ({
                firstName: (g.firstName || "").trim(),
                lastName: (g.lastName || "").trim(),
                email: (g.email || "").trim().toLowerCase(),
                isInvite: i === 0 ? false : !!g.isInvite,
                answers: g.answers || {},
            }))
            .filter(g => g.email);

        if (validGuests.length === 0 || !validGuests[0].email) {
            return corsJson(req, { error: "Primary guest email is required" }, { status: 400 });
        }
        if (!validGuests[0].firstName) {
            return corsJson(req, { error: "Primary guest first name is required" }, { status: 400 });
        }

        // Duplicate emails within the submission
        const emails = validGuests.map(g => g.email);
        if (new Set(emails).size !== emails.length) {
            return corsJson(req, { error: "Each attendee must have a unique email address" }, { status: 400 });
        }

        // Already registered for this event
        const { data: existingAttendees } = await supabase
            .from("attendees")
            .select("email")
            .eq("event_id", event.id)
            .in("email", emails);

        if (existingAttendees && existingAttendees.length > 0) {
            return corsJson(req, {
                error: `Already registered for this event: ${existingAttendees.map(a => a.email).join(", ")}`
            }, { status: 409 });
        }

        // Track-relevance index: an option id -> which question it belongs to
        // and its display text, so a question gated by show_for_option_id can
        // be skipped for guests whose own trigger answer doesn't match it.
        const optionIndex = new Map<string, { questionId: string; text: string }>();
        for (const q of event.questions || []) {
            for (const opt of (q as any).options || []) {
                optionIndex.set(opt.id, { questionId: q.id, text: opt.option_text });
            }
        }
        const isQuestionRelevant = (q: any, guestAnswers: Record<string, any>) => {
            if (!q.show_for_option_id) return true;
            const linked = optionIndex.get(q.show_for_option_id);
            if (!linked) return false; // stale/orphaned link — fail closed, matching the hosted page's hidden behavior
            return guestAnswers[linked.questionId] === linked.text;
        };

        // Required registration questions answered (non-invite guests only)
        const requiredQuestions = (event.questions || []).filter((q: any) => q.is_required && !q.is_selection_logic);
        for (let i = 0; i < validGuests.length; i++) {
            const guest = validGuests[i];
            if (guest.isInvite) continue;
            for (const rq of requiredQuestions) {
                if (!isQuestionRelevant(rq, guest.answers)) continue;
                const answer = guest.answers[rq.id];
                const isEmpty = answer === undefined || answer === null || answer === ""
                    || (Array.isArray(answer) && answer.length === 0);
                if (isEmpty) {
                    return corsJson(req, {
                        error: `${i === 0 ? "Primary guest" : `Guest ${i + 1}`} must answer: "${rq.title}"`
                    }, { status: 400 });
                }
            }
        }

        // Availability
        const ticketQuantity = pass.type === "group" ? 1 : validGuests.length;
        const remaining = (pass.quantity_available || 0) - (pass.quantity_sold || 0);
        if (ticketQuantity > remaining) {
            return corsJson(req, { error: `Only ${remaining} ticket(s) remaining for ${pass.title}` }, { status: 409 });
        }

        const isPaid = !pass.is_free && (pass.price ?? 0) > 0;
        const expectedPrice = pass.price ?? 0;
        const primary = validGuests[0];

        // Reuse an existing pending order for this email if present (retry-safe),
        // always regenerating the Paystack reference like the hosted flow does.
        const { data: existingOrder } = await supabase
            .from("orders_table")
            .select("id")
            .eq("event_id", event.id)
            .eq("email", primary.email)
            .eq("status", "pending")
            .maybeSingle();

        const uniquePart = crypto.randomUUID().replace(/-/g, "").substring(0, 10).toUpperCase();
        // order_ref is varchar(50) — long descriptive event tags can overflow it once
        // "EF-" + tag + "-" + uniquePart are combined, so the tag portion is capped.
        const safeTag = (event.tag || "EV").toUpperCase().substring(0, 20);
        const orderRef = `EF-${safeTag}-${uniquePart}`;

        // Resolve referral code (if the embedding site passed one through)
        let referredByCollaboratorId: string | null = null;
        if (ref) {
            const { data: collab } = await supabase
                .from("event_collaborators")
                .select("id, status")
                .eq("event_id", event.id)
                .eq("referral_code", ref)
                .maybeSingle();
            if (collab?.status === "active") referredByCollaboratorId = collab.id;
        }

        const orderData = {
            event_id: event.id,
            pass_id: pass.id,
            quantity: ticketQuantity,
            first_name: primary.firstName || "Guest",
            last_name: primary.lastName || "",
            email: primary.email,
            order_ref: orderRef,
            total_amount: isPaid ? expectedPrice : 0,
            expected_amount_kobo: isPaid ? Math.round(expectedPrice * 100) : 0,
            status: "pending",
            updated_at: new Date().toISOString(),
            referred_by_collaborator_id: referredByCollaboratorId,
        };

        const { data: order, error: orderErr } = existingOrder
            ? await supabase.from("orders_table").update(orderData).eq("id", existingOrder.id).select().single()
            : await supabase.from("orders_table").insert(orderData).select().single();

        if (orderErr || !order) {
            console.error("v1 register: order upsert failed:", orderErr);
            return corsJson(req, { error: "Failed to create order" }, { status: 500 });
        }

        if (isPaid) {
            const appUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
            const { data: paystackData, error: paystackErr } = await initializeTransaction({
                email: primary.email,
                amount: Math.round(expectedPrice * 100),
                reference: orderRef,
                metadata: {
                    orderId: order.id,
                    eventId: event.id,
                    passId: pass.id,
                    eventTag: event.tag,
                    validGuests,
                    referrerCollaboratorId: referredByCollaboratorId,
                },
                callbackUrl: callback_url || `${appUrl}/${event.tag}/receipt/${orderRef}`,
            });

            if (paystackErr || !paystackData) {
                return corsJson(req, { error: paystackErr || "Failed to initialize payment" }, { status: 502 });
            }

            return corsJson(req, {
                status: "payment_required",
                order_ref: orderRef,
                authorization_url: paystackData.authorization_url,
            });
        }

        // Free pass: fulfill immediately (creates attendees, saves answers, sends emails)
        await fulfillOrder({
            orderId: order.id,
            eventId: event.id,
            passId: pass.id,
            eventTag: event.tag || "event",
            validGuests,
            totalAmount: 0,
            supabaseClient: supabase,
            referredByCollaboratorId,
        });

        return corsJson(req, { status: "registered", order_ref: orderRef });
    } catch (err: any) {
        console.error(`POST /api/v1/events/${tag}/register failed:`, err);
        return corsJson(req, { error: err.message || "Registration failed" }, { status: 500 });
    }
}
