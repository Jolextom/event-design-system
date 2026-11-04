import type { SupabaseClient } from "@supabase/supabase-js";

export type Authz = { ok: true; userId: string } | { ok: false; error: string };

/** Is this user the one who created this event? (Pure given a database client; unit-tested.) */
export async function checkEventOwner(db: SupabaseClient, eventId: unknown, userId: string): Promise<Authz> {
    if (typeof eventId !== "string" || !eventId) return { ok: false, error: "Missing event." };
    const { data: event } = await db.from("events").select("created_by").eq("id", eventId).maybeSingle();
    if (!event) return { ok: false, error: "Event not found." };
    if (!userId || event.created_by !== userId) return { ok: false, error: "You can only do this for your own events." };
    return { ok: true, userId };
}
