import type { SupabaseClient } from "@supabase/supabase-js";
import { adminClient } from "./apiV1";
import { initializeTransaction } from "./paystack";
import { fulfillOrder } from "./registrations";
import { computeCharge } from "./fees";
import { passSaleState, registrationClosed } from "./sales";

/**
 * Server-side checkout. The ONE place where a registration becomes an order,
 * and (for free tickets) attendees.
 *
 * Why this exists: the hosted event page used to compute the price in the
 * browser and send it to Paystack, then run fulfilment with the public DB key.
 * Anything the browser says about price, guest count or deadlines is a
 * suggestion. Here the server loads the event + ticket from the database and
 * decides everything: availability, deadlines, how many guests the ticket
 * allows, the exact amount (incl. platform/processing fee) and the split.
 *
 * Used by both the hosted page (via a server action) and the public v1 API, so
 * the rules are identical no matter where a registration comes from.
 *
 * Everything new (deadlines, fees, split) is driven by nullable per-event /
 * per-ticket settings; with none set this behaves exactly like the old flow.
 */

export interface CheckoutGuestInput {
    firstName?: string;
    lastName?: string;
    email?: string;
    isInvite?: boolean;
    answers?: Record<string, string | string[] | number>;
}

export interface CheckoutInput {
    eventTag: string;
    passId: string;
    guests: CheckoutGuestInput[];
    /** ?ref= collaborator referral code */
    referralCode?: string | null;
    /** Where Paystack sends the customer afterwards. Defaults to the receipt page on `origin`. */
    callbackUrl?: string | null;
    /** Site origin used to build the default callback URL, e.g. https://events.example.com */
    origin?: string | null;
}

export interface CheckoutOptions {
    supabase?: SupabaseClient;
    /** v1 API: refuse unpublished events. The hosted page has never gated on this, so it stays off there. */
    requirePublished?: boolean;
    /**
     * v1 API keeps non-primary guests that have an email but no name (they
     * become "Guest"). The hosted page drops them. Default false (hosted).
     */
    lenientGuests?: boolean;
    now?: Date;
}

export type CheckoutResult =
    | { ok: true; status: "registered"; orderRef: string }
    | {
          ok: true;
          status: "payment_required";
          orderRef: string;
          authorizationUrl: string;
          /** What was actually charged, for logging / UI. */
          charge: { totalKobo: number; subtotalKobo: number; serviceFeeKobo: number };
      }
    | { ok: false; httpStatus: number; error: string };

const fail = (httpStatus: number, error: string): CheckoutResult => ({ ok: false, httpStatus, error });
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function createCheckout(input: CheckoutInput, opts: CheckoutOptions = {}): Promise<CheckoutResult> {
    const supabase = opts.supabase ?? adminClient();
    const now = opts.now ?? new Date();
    const { eventTag, passId, guests, referralCode } = input;

    if (!passId) return fail(400, "pass_id is required");
    if (!Array.isArray(guests) || guests.length === 0) return fail(400, "At least one guest is required");

    // --- Event (select * so columns added by later migrations come along only if they exist) ---
    const { data: event, error: eventErr } = await supabase
        .from("events")
        .select("*, questions (id, title, is_required, is_selection_logic, show_for_option_id, options:question_options!question_options_question_id_fkey(id, option_text))")
        .eq("tag", eventTag)
        .single();

    if (eventErr || !event) return fail(404, "Event not found");
    if (opts.requirePublished && !event.is_published) return fail(403, "Event is not open for registration");
    if (registrationClosed(event, now)) return fail(403, "Registration for this event has closed.");

    // --- Ticket ---
    const { data: pass, error: passErr } = await supabase
        .from("passes")
        .select("*")
        .eq("id", passId)
        .eq("event_id", event.id)
        .single();

    if (passErr || !pass) return fail(404, "Ticket type not found for this event");

    const saleState = passSaleState(pass, now);
    if (saleState === "ended") return fail(403, `Sales for "${pass.title}" have ended.`);
    if (saleState === "not_started") return fail(403, `Sales for "${pass.title}" haven't started yet.`);

    // --- Guests ---
    // The primary guest is the buyer: they need a name and a valid email.
    const primaryRaw = guests[0] || {};
    const primaryEmail = (primaryRaw.email || "").trim().toLowerCase();
    if (!primaryEmail) return fail(400, "Primary guest email is required");
    if (!EMAIL_RE.test(primaryEmail)) return fail(400, "Please enter a valid email address");
    if (!(primaryRaw.firstName || "").trim()) return fail(400, "Primary guest first name is required");

    const primary = {
        firstName: (primaryRaw.firstName || "").trim(),
        lastName: (primaryRaw.lastName || "").trim(),
        email: primaryEmail,
        isInvite: false,
        answers: primaryRaw.answers || {},
    };
    // Everyone else needs an email; unless the caller is lenient (v1 API), a
    // non-invited guest also needs a name, otherwise the empty slot is dropped.
    const finalGuests = [
        primary,
        ...guests
            .slice(1)
            .map((g) => ({
                firstName: (g.firstName || "").trim(),
                lastName: (g.lastName || "").trim(),
                email: (g.email || "").trim().toLowerCase(),
                isInvite: !!g.isInvite,
                answers: g.answers || {},
            }))
            .filter((g) => g.email && (opts.lenientGuests || g.isInvite || g.firstName)),
    ];

    const emails = finalGuests.map((g) => g.email);
    if (new Set(emails).size !== emails.length) return fail(400, "Each attendee must have a unique email address");

    // How many people may this ticket cover? (the server, not the browser, decides)
    const isGroup = pass.type === "group";
    const maxGuests = isGroup
        ? Math.max(1, pass.group_size || 1)
        : pass.max_per_person && pass.max_per_person > 0
            ? pass.max_per_person
            : Infinity;
    if (finalGuests.length > maxGuests) {
        return fail(
            400,
            isGroup
                ? `This ticket covers at most ${maxGuests} people.`
                : `This ticket allows at most ${maxGuests} guest${maxGuests === 1 ? "" : "s"} per order.`
        );
    }

    // Already registered for this event
    const { data: existingAttendees } = await supabase
        .from("attendees")
        .select("email")
        .eq("event_id", event.id)
        .in("email", emails);
    if (existingAttendees && existingAttendees.length > 0) {
        return fail(409, `Already registered for this event: ${existingAttendees.map((a: any) => a.email).join(", ")}`);
    }

    // Required questions (non-invite guests only), honouring track-gated questions
    const optionIndex = new Map<string, { questionId: string; text: string }>();
    for (const q of event.questions || []) {
        for (const opt of (q as any).options || []) optionIndex.set(opt.id, { questionId: q.id, text: opt.option_text });
    }
    const isQuestionRelevant = (q: any, answers: Record<string, any>) => {
        if (!q.show_for_option_id) return true;
        const linked = optionIndex.get(q.show_for_option_id);
        if (!linked) return false; // stale link: fail closed, like the hosted page's hidden behaviour
        return answers[linked.questionId] === linked.text;
    };
    const requiredQuestions = (event.questions || []).filter((q: any) => q.is_required && !q.is_selection_logic);
    for (let i = 0; i < finalGuests.length; i++) {
        const guest = finalGuests[i];
        if (guest.isInvite) continue;
        for (const rq of requiredQuestions) {
            if (!isQuestionRelevant(rq, guest.answers)) continue;
            const answer = guest.answers[rq.id];
            const isEmpty = answer === undefined || answer === null || answer === "" || (Array.isArray(answer) && answer.length === 0);
            if (isEmpty) return fail(400, `${i === 0 ? "Primary guest" : `Guest ${i + 1}`} must answer: "${rq.title}"`);
        }
    }

    // Availability
    const ticketQuantity = isGroup ? 1 : finalGuests.length;
    const remaining = (pass.quantity_available || 0) - (pass.quantity_sold || 0);
    if (ticketQuantity > remaining) return fail(409, `Only ${remaining} ticket(s) remaining for ${pass.title}`);

    // --- Price: from the database, never from the caller ---
    // Individual tickets are priced per person; a group ticket is one flat price.
    const unitPrice = Number(pass.price ?? 0);
    const subtotal = pass.is_free ? 0 : isGroup ? unitPrice : unitPrice * finalGuests.length;
    const isPaid = !pass.is_free && subtotal > 0;
    const charge = computeCharge(isPaid ? subtotal : 0, event.fee_config);

    // --- Order ---
    const { data: existingOrder } = await supabase
        .from("orders_table")
        .select("id")
        .eq("event_id", event.id)
        .eq("email", primary.email)
        .eq("status", "pending")
        .maybeSingle();

    // Fresh Paystack reference every time (retries of an abandoned checkout need a new one).
    const uniquePart = crypto.randomUUID().replace(/-/g, "").substring(0, 10).toUpperCase();
    // order_ref is varchar(50): cap the tag portion so long slugs can't overflow it.
    const safeTag = (event.tag || "EV").toUpperCase().substring(0, 20);
    const orderRef = `EF-${safeTag}-${uniquePart}`;

    let referredByCollaboratorId: string | null = null;
    if (referralCode) {
        const { data: collab } = await supabase
            .from("event_collaborators")
            .select("id, status")
            .eq("event_id", event.id)
            .eq("referral_code", referralCode)
            .maybeSingle();
        if (collab?.status === "active") referredByCollaboratorId = collab.id;
    }

    const orderData: Record<string, unknown> = {
        event_id: event.id,
        pass_id: pass.id,
        quantity: ticketQuantity,
        first_name: primary.firstName || "Guest",
        last_name: primary.lastName,
        email: primary.email,
        order_ref: orderRef,
        total_amount: isPaid ? charge.total : 0,
        // What Paystack must collect for this order to be fulfilled. Set here, on the server.
        expected_amount_kobo: isPaid ? charge.totalKobo : 0,
        // Always starts "pending": fulfillOrder() flips it to "completed" once attendees exist.
        status: "pending",
        updated_at: now.toISOString(),
        referred_by_collaborator_id: referredByCollaboratorId,
    };
    // Only write the new column when the migration has been applied (the events row carries fee_config then).
    if ("fee_config" in event) orderData.fee_amount = charge.serviceFee;

    const { data: order, error: orderErr } = existingOrder
        ? await supabase.from("orders_table").update(orderData).eq("id", existingOrder.id).select().single()
        : await supabase.from("orders_table").insert(orderData).select().single();

    if (orderErr || !order) {
        console.error("checkout: order upsert failed:", orderErr);
        return fail(500, "Failed to create order");
    }

    // --- Paid: hand over to Paystack (with the platform/organiser split if configured) ---
    if (isPaid) {
        const origin = (input.origin || process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
        const subaccount: string | undefined = event.paystack_subaccount_code || undefined;

        const { data: paystackData, error: paystackErr } = await initializeTransaction({
            email: primary.email,
            amount: charge.totalKobo,
            reference: orderRef,
            metadata: {
                orderId: order.id,
                eventId: event.id,
                passId: pass.id,
                eventTag: event.tag,
                validGuests: finalGuests,
                referrerCollaboratorId: referredByCollaboratorId,
                ticketAmountKobo: charge.subtotalKobo,
                feeAmountKobo: charge.serviceFeeKobo,
            },
            callbackUrl: input.callbackUrl || `${origin}/${event.tag}/receipt/${orderRef}`,
            // Organiser's subaccount gets the ticket price; the platform keeps the rest
            // (and pays Paystack's fee out of it, because bearer = "account").
            ...(subaccount ? { subaccount, transactionCharge: charge.serviceFeeKobo, bearer: "account" as const } : {}),
        });

        if (paystackErr || !paystackData) return fail(502, paystackErr || "Failed to initialize payment");

        return {
            ok: true,
            status: "payment_required",
            orderRef,
            authorizationUrl: paystackData.authorization_url,
            charge: { totalKobo: charge.totalKobo, subtotalKobo: charge.subtotalKobo, serviceFeeKobo: charge.serviceFeeKobo },
        };
    }

    // --- Free: fulfil now (attendees, answers, emails) ---
    await fulfillOrder({
        orderId: order.id,
        eventId: event.id,
        passId: pass.id,
        eventTag: event.tag || "event",
        validGuests: finalGuests,
        totalAmount: 0,
        supabaseClient: supabase,
        referredByCollaboratorId,
    });

    return { ok: true, status: "registered", orderRef };
}
