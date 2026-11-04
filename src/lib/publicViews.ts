import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * What the two "link" pages (the receipt after paying, and the invite link in an email) are
 * allowed to show, read on the SERVER for exactly one order / one invite.
 *
 * Before this, those pages asked the database directly from the visitor's browser with the
 * public key and `select *`, which only works if the database lets ANYONE read the whole
 * orders and guests tables. Now the browser asks us for one reference, and gets back only the
 * fields the page actually draws (no payment internals, phone numbers, answers or other
 * guests' records).
 */

const REF_RE = /^[A-Za-z0-9_-]{4,80}$/;
export const isValidRef = (ref: unknown): ref is string => typeof ref === "string" && REF_RE.test(ref);

const pick = <T extends Record<string, unknown>>(row: T | null | undefined, keys: string[]): Record<string, unknown> | null =>
    row ? Object.fromEntries(keys.filter((k) => k in row).map((k) => [k, row[k]])) : null;

const ORDER_KEYS = ["id", "order_ref", "first_name", "last_name", "email", "quantity", "total_amount", "status", "created_at", "pass_id", "event_id"];
const ATTENDEE_KEYS = ["id", "first_name", "last_name", "email", "ref", "email_status", "created_at", "event_id", "pass_id", "order_id"];
const PASS_KEYS = ["id", "title", "type", "group_size"];
const EVENT_KEYS = ["id", "event_title", "tag", "start_date", "start_time", "location", "image", "image_focus_y"];

const EVENT_SELECT = "id, event_title, tag, start_date, start_time, location, image, image_focus_y";
const QUESTION_SELECT = "*, options:question_options!question_options_question_id_fkey(*)";

async function loadQuestions(db: SupabaseClient, eventId: string) {
    const { data } = await db.from("questions").select(QUESTION_SELECT).eq("event_id", eventId);
    return ((data ?? []) as any[])
        .sort((a, b) => (a.question_order ?? 0) - (b.question_order ?? 0))
        .map((q) => ({ ...q, options: [...(q.options ?? [])].sort((a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0)) }));
}

export type ReceiptView = {
    order: Record<string, unknown>;
    attendees: Record<string, unknown>[];
    pass: Record<string, unknown> | null;
    event: Record<string, unknown> | null;
    questions: any[];
};

/** Everything the receipt page draws for ONE order reference; null if there is no such order. */
export async function receiptView(db: SupabaseClient, ref: unknown): Promise<ReceiptView | null> {
    if (!isValidRef(ref)) return null;
    const { data: order } = await db.from("orders_table").select("*").eq("order_ref", ref).maybeSingle();
    if (!order) return null;
    const [{ data: attendees }, pass, event] = await Promise.all([
        db.from("attendees").select("*").eq("order_id", order.id),
        order.pass_id ? db.from("passes").select("*").eq("id", order.pass_id).maybeSingle() : Promise.resolve({ data: null }),
        order.event_id ? db.from("events").select(EVENT_SELECT).eq("id", order.event_id).maybeSingle() : Promise.resolve({ data: null }),
    ]);
    return {
        order: pick(order, ORDER_KEYS)!,
        attendees: (attendees ?? []).map((a: any) => pick(a, ATTENDEE_KEYS)!),
        pass: pick(pass.data as any, PASS_KEYS),
        event: pick(event.data as any, EVENT_KEYS),
        questions: order.event_id ? await loadQuestions(db, order.event_id) : [],
    };
}

export type InviteView = {
    attendee: Record<string, unknown>;
    event: Record<string, unknown> | null;
    passTitle: string | null;
    questions: any[];
};

/** What the invite page draws for ONE guest reference; null if there is no such invite. */
export async function inviteView(db: SupabaseClient, ref: unknown): Promise<InviteView | null> {
    if (!isValidRef(ref)) return null;
    const { data: att } = await db.from("attendees").select("*").eq("ref", ref).maybeSingle();
    if (!att) return null;
    const { data: event } = await db.from("events").select(EVENT_SELECT).eq("id", att.event_id).maybeSingle();
    const finished = att.email_status === "registered" || att.email_status === "confirmed";
    let passTitle: string | null = null;
    if (!finished && att.pass_id) {
        const { data: pass } = await db.from("passes").select("title").eq("id", att.pass_id).maybeSingle();
        passTitle = (pass?.title as string) ?? null;
    }
    return {
        attendee: pick(att, ATTENDEE_KEYS)!,
        event: pick(event as any, EVENT_KEYS),
        passTitle,
        questions: finished ? [] : await loadQuestions(db, att.event_id),
    };
}
