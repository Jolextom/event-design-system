import type { SupabaseClient } from "@supabase/supabase-js";
import { adminClient } from "./apiV1";
import { sendInviteEmail } from "./email";
import { resolveEventSender } from "./eventEmail";
import { generateGoogleCalendarLink, generateOutlookLink } from "./calendar";
import { missingRequiredQuestion, type RuleQuestion, type AnswerValue } from "./answers";
import { sendWelcomeEmail } from "@/lib/welcomeEmail";

/**
 * What happens to a guest AFTER the order exists, all on the server:
 *  - an invited person completes their registration (and gets their own ticket + check-in pass)
 *  - the buyer of a group ticket adds / invites the other members
 *  - (re)sending an invite or ticket email, with limits, because email costs money
 *
 * Previously the browser did the first two directly with the public database key and
 * the group-size limit existed only on screen; a completed invite emailed nobody.
 */

/** Minimum wait between two emails to the same person. */
export const EMAIL_COOLDOWN_SEC = 120;
/** Most invite/ticket emails one person can be sent in 24 hours (initial send included). */
export const EMAIL_MAX_PER_DAY = 4;

export type GuestResult<T extends object = object> = ({ ok: true } & T) | { ok: false; error: string; status: number };
const fail = (status: number, error: string): { ok: false; error: string; status: number } => ({ ok: false, error, status });
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface EventRow {
    id: string; tag: string | null; event_title: string; start_date: string | null; start_time: string | null;
    location: string | null; created_by: string | null; image?: string | null;
}
interface AttendeeRow {
    id: string; event_id: string; order_id: string | null; pass_id: string | null; email: string;
    first_name: string | null; last_name: string | null; ref: string; email_status: string | null;
}

const answerRows = (attendeeId: string, answers: Record<string, AnswerValue>) =>
    Object.entries(answers)
        .filter(([, v]) => v !== undefined && v !== null && v !== "")
        .map(([question_id, v]) => ({ attendee_id: attendeeId, question_id, answer_text: String(v) }));

async function loadQuestions(supabase: SupabaseClient, eventId: string): Promise<RuleQuestion[]> {
    const { data } = await supabase
        .from("questions")
        .select("id, title, is_required, is_selection_logic, show_for_option_id, options:question_options!question_options_question_id_fkey(id, option_text)")
        .eq("event_id", eventId);
    return (data ?? []) as unknown as RuleQuestion[];
}

// ---------------------------------------------------------------------------
// Email budget: protects against email bombing and surprise bills.
// Stored in email_deliveries (already written on every send), so it holds
// across serverless instances, unlike an in-memory counter.
// ---------------------------------------------------------------------------
export async function emailBudget(
    supabase: SupabaseClient,
    attendeeId: string,
    now: number = Date.now()
): Promise<{ ok: true } | { ok: false; error: string; retryAfterSec: number }> {
    const { data } = await supabase
        .from("email_deliveries")
        .select("created_at, email_type")
        .eq("attendee_id", attendeeId)
        .in("email_type", ["invite", "confirmation"]);

    const times = (data ?? [])
        .map((r: { created_at: string }) => Date.parse(r.created_at))
        .filter((t: number) => !Number.isNaN(t) && now - t < 24 * 3600 * 1000)
        .sort((a: number, b: number) => b - a);

    if (times.length > 0 && now - times[0] < EMAIL_COOLDOWN_SEC * 1000) {
        const wait = Math.ceil((EMAIL_COOLDOWN_SEC * 1000 - (now - times[0])) / 1000);
        return { ok: false, error: `An email was just sent to this person. Please wait ${wait} seconds before sending another.`, retryAfterSec: wait };
    }
    if (times.length >= EMAIL_MAX_PER_DAY) {
        const wait = Math.ceil((24 * 3600 * 1000 - (now - times[EMAIL_MAX_PER_DAY - 1])) / 1000);
        return { ok: false, error: `This person has already been emailed ${EMAIL_MAX_PER_DAY} times today. Try again later.`, retryAfterSec: wait };
    }
    return { ok: true };
}

// ---------------------------------------------------------------------------
// Invite email (branded per event, logged so the budget above can see it)
// ---------------------------------------------------------------------------
export async function sendInviteForAttendee(
    supabase: SupabaseClient,
    attendee: AttendeeRow,
    event: EventRow,
    inviterName: string
): Promise<boolean> {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const eventDate = event.start_date
        ? new Date(event.start_date).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
        : "TBA";
    const startDateTime = event.start_date && event.start_time ? `${event.start_date}T${event.start_time}:00` : event.start_date;
    const cal = startDateTime
        ? {
              google: generateGoogleCalendarLink({ title: event.event_title, location: event.location || "TBA", startDate: startDateTime, description: `Registration Ref: ${attendee.ref}` }),
              outlook: generateOutlookLink({ title: event.event_title, location: event.location || "TBA", startDate: startDateTime, description: `Registration Ref: ${attendee.ref}` }),
          }
        : undefined;

    let passTitle = "General Admission";
    if (attendee.pass_id) {
        const { data: pass } = await supabase.from("passes").select("title").eq("id", attendee.pass_id).single();
        if (pass?.title) passTitle = pass.title;
    }

    const sender = await resolveEventSender(event);
    const result = await sendInviteEmail({
        to: attendee.email,
        from: sender?.from,
        replyTo: sender?.replyTo,
        resendApiKey: sender?.resendApiKey,
        brandName: sender?.brandName,
        eventTitle: event.event_title,
        eventDate,
        eventLocation: event.location || "TBA",
        eventImage: event.image || undefined,
        inviterName,
        passType: passTitle,
        inviteLink: `${baseUrl.replace(/\/$/, "")}/${event.tag}/join/${attendee.ref}`,
        googleCalendarLink: cal?.google,
        outlookCalendarLink: cal?.outlook,
    });

    await supabase.from("email_deliveries").insert({
        attendee_id: attendee.id,
        event_id: event.id,
        email_type: "invite",
        status: result.success ? "sent" : "failed",
        resend_id: result.success && result.data ? result.data.id : null,
        template_type: "invite",
        created_at: new Date().toISOString(),
    });
    if (result.success) await supabase.from("attendees").update({ last_email_sent: new Date().toISOString() }).eq("id", attendee.id);
    return result.success;
}

// ---------------------------------------------------------------------------
// 1. An invited person completes their registration
// ---------------------------------------------------------------------------
export async function completeInvite(
    input: { ref: string; firstName: string; lastName?: string; answers?: Record<string, AnswerValue> },
    supabase: SupabaseClient = adminClient()
): Promise<GuestResult<{ alreadyDone?: boolean; emailSent?: boolean; email?: string }>> {
    const firstName = (input.firstName || "").trim();
    if (!input.ref) return fail(400, "Invite not found");
    if (!firstName) return fail(400, "First name is required");

    const { data: attendee } = await supabase.from("attendees").select("*").eq("ref", input.ref).maybeSingle();
    if (!attendee) return fail(404, "Invite not found or expired");
    const att = attendee as AttendeeRow;

    if (att.email_status === "registered" || att.email_status === "confirmed") {
        return { ok: true, alreadyDone: true, email: att.email }; // already completed: never email twice
    }
    if (att.email_status !== "invited") return fail(409, "This invite can't be completed.");

    const questions = await loadQuestions(supabase, att.event_id);
    const answers = input.answers ?? {};
    const missing = missingRequiredQuestion(questions, answers);
    if (missing) return fail(400, `Please answer: "${missing.title}"`);

    // Only flip it if it's STILL invited, so two quick clicks can't send two tickets.
    const { data: updated, error: upErr } = await supabase
        .from("attendees")
        .update({ first_name: firstName, last_name: (input.lastName || "").trim(), email_status: "registered" })
        .eq("id", att.id)
        .eq("email_status", "invited")
        .select();
    if (upErr) return fail(500, "Couldn't complete your registration. Please try again.");
    if (!updated || updated.length === 0) return { ok: true, alreadyDone: true, email: att.email };

    const rows = answerRows(att.id, answers);
    if (rows.length) await supabase.from("answers").upsert(rows, { onConflict: "attendee_id,question_id" });

    // Their OWN ticket + check-in pass, exactly like the person who bought it.
    let emailSent = false;
    try {
        const res = await sendWelcomeEmail(att.id, att.event_id);
        emailSent = !!(res && (res as { success?: boolean }).success);
    } catch (err) {
        console.error("completeInvite: ticket email failed:", err);
    }
    return { ok: true, emailSent, email: att.email };
}

// ---------------------------------------------------------------------------
// 2. The buyer of a group ticket adds / invites another member
// ---------------------------------------------------------------------------
export async function addGroupMember(
    input: {
        orderRef: string;
        mode: "fill" | "invite";
        email: string;
        firstName?: string;
        lastName?: string;
        answers?: Record<string, AnswerValue>;
    },
    supabase: SupabaseClient = adminClient()
): Promise<GuestResult<{ attendee: Pick<AttendeeRow, "id" | "first_name" | "last_name" | "email" | "ref" | "email_status">; emailSent: boolean }>> {
    const email = (input.email || "").trim().toLowerCase();
    if (!EMAIL_RE.test(email)) return fail(400, "Please enter a valid email address");
    if (input.mode !== "fill" && input.mode !== "invite") return fail(400, "Invalid request");

    const { data: order } = await supabase
        .from("orders_table")
        .select("id, event_id, pass_id, status, first_name, last_name")
        .eq("order_ref", input.orderRef)
        .maybeSingle();
    if (!order) return fail(404, "Order not found");
    if (order.status !== "completed") return fail(409, "This order isn't complete yet.");

    const { data: pass } = await supabase.from("passes").select("id, type, group_size").eq("id", order.pass_id).single();
    if (!pass || pass.type !== "group" || !pass.group_size) return fail(400, "This ticket doesn't include extra people.");

    const { data: event } = await supabase
        .from("events")
        .select("id, tag, event_title, start_date, start_time, location, created_by, image")
        .eq("id", order.event_id)
        .single();
    if (!event) return fail(404, "Event not found");

    const limit: number = pass.group_size;
    const { data: members } = await supabase.from("attendees").select("id").eq("order_id", order.id);
    if ((members?.length ?? 0) >= limit) return fail(409, "This group is full.");

    const { data: dupe } = await supabase.from("attendees").select("id").eq("event_id", event.id).eq("email", email);
    if (dupe && dupe.length > 0) return fail(409, "This email is already registered for this event.");

    const firstName = (input.firstName || "").trim();
    const answers = input.answers ?? {};
    if (input.mode === "fill") {
        if (!firstName) return fail(400, "First name is required");
        const missing = missingRequiredQuestion(await loadQuestions(supabase, event.id), answers);
        if (missing) return fail(400, `Please answer: "${missing.title}"`);
    }

    const ref = `EF-${(event.tag || "EV").toUpperCase().substring(0, 20)}-${crypto.randomUUID().replace(/-/g, "").substring(0, 8).toUpperCase()}`;
    const { data: created, error: insErr } = await supabase
        .from("attendees")
        .insert({
            event_id: event.id,
            order_id: order.id,
            pass_id: order.pass_id,
            first_name: input.mode === "fill" ? firstName : "Guest",
            last_name: input.mode === "fill" ? (input.lastName || "").trim() : "",
            email,
            ref,
            email_status: input.mode === "invite" ? "invited" : "registered",
            check_in: false,
        })
        .select()
        .single();
    if (insErr || !created) {
        if (insErr?.code === "23505") return fail(409, "This email is already registered for this event.");
        return fail(500, "Couldn't add this person. Please try again.");
    }

    // Two people adding at the same moment could both pass the check above; settle it here.
    const { data: after } = await supabase.from("attendees").select("id").eq("order_id", order.id);
    if ((after?.length ?? 0) > limit) {
        await supabase.from("attendees").delete().eq("id", created.id);
        return fail(409, "This group is full.");
    }

    if (input.mode === "fill") {
        const rows = answerRows(created.id, answers);
        if (rows.length) await supabase.from("answers").upsert(rows, { onConflict: "attendee_id,question_id" });
    }

    let emailSent = false;
    try {
        if (input.mode === "fill") {
            const res = await sendWelcomeEmail(created.id, event.id); // their own ticket + check-in pass
            emailSent = !!(res && (res as { success?: boolean }).success);
        } else {
            const inviter = `${order.first_name ?? ""} ${order.last_name ?? ""}`.trim() || "Someone";
            emailSent = await sendInviteForAttendee(supabase, created as AttendeeRow, event as EventRow, inviter);
        }
    } catch (err) {
        console.error("addGroupMember: email failed:", err);
    }

    return {
        ok: true,
        emailSent,
        attendee: { id: created.id, first_name: created.first_name, last_name: created.last_name, email: created.email, ref: created.ref, email_status: created.email_status },
    };
}

// ---------------------------------------------------------------------------
// 3. (Re)send an invite or ticket email. Caller proves who they are by EITHER
//    being the event's organiser OR knowing the order's reference.
// ---------------------------------------------------------------------------
export async function resendGuestEmail(
    input: { attendeeId: string; orderRef?: string | null; organiserUserId?: string | null },
    supabase: SupabaseClient = adminClient()
): Promise<GuestResult> {
    const { data: attendee } = await supabase.from("attendees").select("*").eq("id", input.attendeeId).maybeSingle();
    if (!attendee) return fail(404, "Attendee not found");
    const att = attendee as AttendeeRow;

    const { data: event } = await supabase
        .from("events")
        .select("id, tag, event_title, start_date, start_time, location, created_by, image")
        .eq("id", att.event_id)
        .single();
    if (!event) return fail(404, "Event not found");

    let allowed = !!input.organiserUserId && input.organiserUserId === event.created_by;
    let inviter = "Someone";
    if (att.order_id) {
        const { data: order } = await supabase.from("orders_table").select("order_ref, first_name, last_name").eq("id", att.order_id).maybeSingle();
        if (order) {
            inviter = `${order.first_name ?? ""} ${order.last_name ?? ""}`.trim() || inviter;
            if (!allowed && input.orderRef && order.order_ref === input.orderRef) allowed = true;
        }
    }
    if (!allowed) return fail(403, "You can't send email for this person.");

    const budget = await emailBudget(supabase, att.id);
    if (!budget.ok) return fail(429, budget.error);

    let sent = false;
    if (att.email_status === "invited") {
        sent = await sendInviteForAttendee(supabase, att, event as EventRow, inviter);
    } else {
        const res = await sendWelcomeEmail(att.id, att.event_id);
        sent = !!(res && (res as { success?: boolean }).success);
        if (sent) await supabase.from("attendees").update({ last_email_sent: new Date().toISOString() }).eq("id", att.id);
    }
    return sent ? { ok: true } : fail(502, "The email couldn't be sent. Please try again later.");
}
