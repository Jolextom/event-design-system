import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * How many of a ticket have been sold, COUNTED FROM THE RECORDS themselves:
 *  - a group ticket: the number of completed orders on it (one order = one group, whatever its size);
 *  - any other ticket: the number of registered guests holding it (invited-but-not-yet-registered people don't count).
 *
 * This replaces a database counter (the `increment_quantity_sold` function) that was never created in the live database:
 * the call silently failed, so sales went through and "N left" never moved. A recount can't drift or fail quietly: it is
 * right after every sale no matter what the stored number was before.
 */
export async function recountPassSold(db: SupabaseClient, pass: { id: string; type?: string | null }): Promise<number> {
    const head = { count: "exact" as const, head: true };
    if (pass.type === "group") {
        const { count, error } = await db.from("orders_table").select("id", head).eq("pass_id", pass.id).eq("status", "completed");
        if (error) throw error;
        return count ?? 0;
    }
    const [all, invited] = await Promise.all([
        db.from("attendees").select("id", head).eq("pass_id", pass.id),
        db.from("attendees").select("id", head).eq("pass_id", pass.id).eq("email_status", "invited"),
    ]);
    if (all.error) throw all.error;
    if (invited.error) throw invited.error;
    return Math.max(0, (all.count ?? 0) - (invited.count ?? 0));
}

/** Recounts a ticket's sold number and stores it. Never throws: a stock hiccup must not undo a payment, but it is logged loudly. */
export async function syncPassSold(db: SupabaseClient, passId: string): Promise<number | null> {
    try {
        const { data: pass, error: passErr } = await db.from("passes").select("id, type").eq("id", passId).maybeSingle();
        if (passErr || !pass) throw passErr ?? new Error(`ticket ${passId} not found`);
        const sold = await recountPassSold(db, pass as { id: string; type?: string | null });
        const { error } = await db.from("passes").update({ quantity_sold: sold }).eq("id", passId);
        if (error) throw error;
        return sold;
    } catch (err) {
        console.error(`STOCK COUNT FAILED for ticket ${passId}: the sold number was not updated.`, err);
        return null;
    }
}
