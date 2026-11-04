import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Deleting an event, for real.
 *
 * Why this exists: the database refuses to delete an event while anything still points at
 * it (tickets, guests, orders, form questions...), and some of those point at each other
 * (a ticket can be tied to a question option, and a question to another option). So
 * "delete the event" has to remove everything in the right order, after untangling the
 * circular links. Only the event's OWNER may do this, and an event that has guests or
 * orders needs its name typed to confirm.
 *
 * Takes the database client as an argument (the server action passes the privileged
 * one) so the logic is unit-tested against an in-memory database that enforces the same
 * kind of foreign keys.
 */

export interface EventDeletePreview {
    eventId: string;
    title: string;
    isPublished: boolean;
    tickets: number;
    guests: number;
    orders: number;
    /** Orders that finished (possibly real payments). Deleting the event does NOT refund anyone. */
    completedOrders: number;
    questions: number;
    /** Guests or orders exist, so the owner must type the event's name to confirm. */
    needsTypedConfirmation: boolean;
}

export type EventDeleteResult<T extends object = object> = ({ ok: true } & T) | { ok: false; error: string; status: number };
const fail = (status: number, error: string): { ok: false; error: string; status: number } => ({ ok: false, error, status });

/** Errors that just mean "this optional table/column isn't in this database": safe to skip. */
const MISSING = new Set(["PGRST205", "PGRST204", "42P01", "42703"]);
const CHUNK = 80;
const chunks = <T,>(xs: T[]): T[][] => {
    const out: T[][] = [];
    for (let i = 0; i < xs.length; i += CHUNK) out.push(xs.slice(i, i + CHUNK));
    return out;
};
const ids = (rows: { id: string }[] | null | undefined) => (rows ?? []).map((r) => r.id);

async function ownedEvent(supabase: SupabaseClient, eventId: string, userId: string) {
    const { data: event } = await supabase.from("events").select("id, event_title, is_published, created_by").eq("id", eventId).maybeSingle();
    if (!event) return { err: fail(404, "Event not found.") };
    // Never trust a caller-supplied identity: userId comes from a verified login token on the server.
    if (!userId || event.created_by !== userId) return { err: fail(403, "You can only delete your own events.") };
    return { event: event as { id: string; event_title: string; is_published: boolean; created_by: string } };
}

export async function previewEventDelete(supabase: SupabaseClient, eventId: string, userId: string): Promise<EventDeleteResult<{ preview: EventDeletePreview }>> {
    const { event, err } = await ownedEvent(supabase, eventId, userId);
    if (err) return err;
    const rows = async (table: string, cols = "id") => (await supabase.from(table).select(cols).eq("event_id", eventId)).data ?? [];
    const [passes, attendees, orders, questions] = await Promise.all([
        rows("passes"), rows("attendees"), rows("orders_table", "id, status"), rows("questions"),
    ]);
    const completed = (orders as unknown as { status: string }[]).filter((o) => o.status === "completed").length;
    return {
        ok: true,
        preview: {
            eventId,
            title: event!.event_title,
            isPublished: !!event!.is_published,
            tickets: passes.length,
            guests: attendees.length,
            orders: orders.length,
            completedOrders: completed,
            questions: questions.length,
            needsTypedConfirmation: attendees.length > 0 || orders.length > 0,
        },
    };
}

export async function deleteEvent(
    supabase: SupabaseClient,
    input: { eventId: string; userId: string; confirmTitle?: string }
): Promise<EventDeleteResult> {
    const pre = await previewEventDelete(supabase, input.eventId, input.userId);
    if (!pre.ok) return pre;
    const { preview } = pre;

    if (preview.needsTypedConfirmation && (input.confirmTitle ?? "").trim() !== preview.title.trim()) {
        return fail(400, `This event has ${preview.guests} guest(s) and ${preview.orders} order(s). Type its exact name to confirm.`);
    }

    const eventId = input.eventId;
    const step = async (what: string, run: () => PromiseLike<{ error: { code?: string; message: string } | null }>): Promise<string | null> => {
        const { error } = await run();
        if (!error || (error.code && MISSING.has(error.code))) return null;
        return `Couldn't remove ${what}: ${error.message}`;
    };
    const failed = (msg: string) =>
        fail(409, `${msg} Nothing else was changed after this point, and you can press Delete again once it's fixed.`);

    const [attendeeRows, questionRows] = await Promise.all([
        supabase.from("attendees").select("id").eq("event_id", eventId),
        supabase.from("questions").select("id").eq("event_id", eventId),
    ]);
    const attendeeIds = ids(attendeeRows.data), questionIds = ids(questionRows.data);

    // 1. Untangle the circular links (a ticket/question tied to a question option).
    for (const [what, run] of [
        ["ticket links", () => supabase.from("passes").update({ show_for_option_id: null }).eq("event_id", eventId)],
        ["question links", () => supabase.from("questions").update({ show_for_option_id: null }).eq("event_id", eventId)],
    ] as const) {
        const e = await step(what, run);
        if (e) return failed(e);
    }

    // 2. Everything that hangs off guests, then the guests.
    for (const batch of chunks(attendeeIds)) {
        const e = await step("answers", () => supabase.from("answers").delete().in("attendee_id", batch));
        if (e) return failed(e);
    }
    for (const batch of chunks(questionIds)) {
        const e = await step("answers", () => supabase.from("answers").delete().in("question_id", batch));
        if (e) return failed(e);
    }
    for (const [what, table] of [["live-watch records", "virtual_attendance"], ["email records", "email_deliveries"]] as const) {
        const e = await step(what, () => supabase.from(table).delete().eq("event_id", eventId));
        if (e) return failed(e);
    }
    for (const [what, table] of [["guests", "attendees"], ["orders", "orders_table"]] as const) {
        const e = await step(what, () => supabase.from(table).delete().eq("event_id", eventId));
        if (e) return failed(e);
    }

    // 3. The form, then the tickets.
    for (const batch of chunks(questionIds)) {
        const e = await step("question options", () => supabase.from("question_options").delete().in("question_id", batch));
        if (e) return failed(e);
    }
    for (const [what, table] of [["questions", "questions"], ["tickets", "passes"]] as const) {
        const e = await step(what, () => supabase.from(table).delete().eq("event_id", eventId));
        if (e) return failed(e);
    }

    // 4. The rest of the event's own data.
    for (const [what, table] of [
        ["check-in staff", "staff"],
        ["variables", "event_variables"],
        ["segments", "smart_segments"],
        ["segments", "event_segments"],
        ["collaborators", "event_collaborators"],
        ["campaigns", "campaigns"],
    ] as const) {
        const e = await step(what, () => supabase.from(table).delete().eq("event_id", eventId));
        if (e) return failed(e);
    }

    // 5. Finally the event itself.
    const { error } = await supabase.from("events").delete().eq("id", eventId);
    if (error) return failed(`Couldn't remove the event itself: ${error.message}`);

    // Make sure it's really gone (access rules can silently match zero rows).
    const { data: still } = await supabase.from("events").select("id").eq("id", eventId).maybeSingle();
    if (still) return fail(409, "The event is still there: the database refused to delete it. Nothing more was removed.");
    return { ok: true };
}
