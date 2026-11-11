import { createClient } from "@supabase/supabase-js";
import { adminClient } from "@/lib/apiV1";
import { checkEventOwner, type Authz } from "@/lib/eventOwner";

export { checkEventOwner };
export type { Authz };

/**
 * Who is asking, and may they touch this event?
 *
 * Server actions and API routes can be called by anyone on the internet, so "the page only shows
 * this button to the organiser" is not protection. These helpers decide from the caller's login
 * token (checked against Supabase), never from anything the page claims.
 */

/** Who is behind a login token (id + email), or null if the token is missing, forged or expired. */
export async function verifiedUser(accessToken: unknown): Promise<{ id: string; email: string | null } | null> {
    if (typeof accessToken !== "string" || accessToken.length < 10 || accessToken.length > 4000) return null;
    const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { data, error } = await anon.auth.getUser(accessToken);
    return error || !data?.user ? null : { id: data.user.id, email: data.user.email ?? null };
}

/** The user id behind a login token, or null if the token is missing, forged or expired. */
export async function verifiedUserId(accessToken: unknown): Promise<string | null> {
    return (await verifiedUser(accessToken))?.id ?? null;
}

/** Login token + event id in, verdict out. Use at the top of an organiser-only server action. */
export async function authorizeEventOwner(accessToken: unknown, eventId: unknown): Promise<Authz> {
    const userId = await verifiedUserId(accessToken);
    if (!userId) return { ok: false, error: "Please log in again." };
    return checkEventOwner(adminClient(), eventId, userId);
}
