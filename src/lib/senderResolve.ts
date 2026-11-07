import { createClient } from "@supabase/supabase-js";

/**
 * Looks up which From address (and, for a few tenants, which Resend API key) an outgoing email should use.
 *
 * Deliberately NOT a "use server" file: these return a tenant's Resend API key, so they must only be called
 * by our own server code (src/app/actions.ts, src/lib/eventEmail.ts). They used to sit in senderDomains.ts,
 * where Next.js published every export as a public endpoint anyone could call.
 */
function admin() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
}

/**
 * Resolves the From line (+ optional Reply-To) for an outgoing email. Only
 * verified identities are honored; anything else falls back to the platform
 * default so mail never goes out through an unverified domain.
 */
export async function resolveSender(identityId?: string | null): Promise<{ from: string; replyTo?: string; resendApiKey?: string }> {
    const fallback = { from: "EventFlow <noreply@partiesandeventz.com>" };
    if (!identityId) return fallback;
    try {
        const { data } = await admin()
            .from("sender_identities")
            .select("from_name, from_email, reply_to, resend_api_key, status")
            .eq("id", identityId)
            .single();
        if (data && data.status === "verified") {
            return {
                from: `${data.from_name} <${data.from_email}>`,
                replyTo: data.reply_to || undefined,
                resendApiKey: data.resend_api_key || undefined,
            };
        }
    } catch { /* fall through */ }
    return fallback;
}

/**
 * Auto-resolves the sender + brand for transactional emails (invite,
 * confirmation) that fire without a UI step to pick a sender — e.g. right
 * after registration. Picks the event owner's most recently verified
 * identity. Returns null (caller falls back to the platform default) when
 * the owner has no verified domain, so unrelated tenants are unaffected.
 */
export async function resolveSenderForUser(
    userId?: string | null
): Promise<{ from: string; brandName: string; replyTo?: string; resendApiKey?: string } | null> {
    if (!userId) return null;
    try {
        const { data } = await admin()
            .from("sender_identities")
            .select("from_name, from_email, reply_to, resend_api_key")
            .eq("user_id", userId)
            .eq("status", "verified")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
        if (!data) return null;
        return {
            from: `${data.from_name} <${data.from_email}>`,
            brandName: data.from_name,
            replyTo: data.reply_to || undefined,
            resendApiKey: data.resend_api_key || undefined,
        };
    } catch (err) {
        console.error("resolveSenderForUser error:", err);
        return null;
    }
}
