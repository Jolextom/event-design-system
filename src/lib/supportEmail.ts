import type { SupabaseClient } from "@supabase/supabase-js";
import { parseOptionalEmail } from "./platformEmail.ts";

/**
 * The support address an organiser typed for THIS event (Settings > Support email), if any.
 *
 * Read from the database at the moment an email is sent or a receipt is shown, so changing it takes effect at once: no redeploy.
 * Tolerant on purpose: if the column hasn't been added yet (or anything goes wrong) this returns null and email carries on
 * exactly as before. A failed lookup must never stop a confirmation email.
 */
export async function eventSupportEmail(db: SupabaseClient, eventId?: string | null): Promise<string | null> {
    if (!eventId || typeof eventId !== "string") return null;
    try {
        const { data, error } = await db.from("events").select("support_email").eq("id", eventId).maybeSingle();
        if (error || !data) return null;
        return parseOptionalEmail((data as { support_email?: string | null }).support_email);
    } catch {
        return null;
    }
}

/** The SQL that adds the column, shown to the organiser if saving finds it missing. */
export const SUPPORT_EMAIL_COLUMN_SQL = "ALTER TABLE public.events ADD COLUMN IF NOT EXISTS support_email TEXT;\nNOTIFY pgrst, 'reload schema';";
