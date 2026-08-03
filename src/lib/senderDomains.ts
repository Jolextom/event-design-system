"use server";

import { createClient } from "@supabase/supabase-js";

/**
 * Custom sender domains via the Resend Domains API.
 *
 * Flow: the user adds a domain -> we register it with Resend and store the
 * DNS records Resend requires (SPF/DKIM) -> the user adds those records at
 * their DNS host -> they hit Verify -> once Resend reports "verified",
 * the identity becomes usable as a From address for campaigns/broadcasts.
 */

const RESEND_API = "https://api.resend.com";

/**
 * A domain is only sendable/verifiable through the Resend ACCOUNT that
 * registered it — its API key, not just its name. Most identities use the
 * platform's own account (env var), but a tenant may verify their domain
 * under a separate Resend account instead (e.g. because the platform
 * account's plan caps out at one domain). In that case their identity
 * stores its own key and every Resend call for it must use that key, never
 * the platform default.
 */
function resendHeaders(apiKey?: string | null) {
    return {
        Authorization: `Bearer ${apiKey || process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
    };
}

function admin() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
}

export interface SenderIdentity {
    id: string;
    user_id: string;
    domain: string;
    from_name: string;
    from_email: string;
    /** Where replies should land — e.g. a real person's inbox instead of the noreply address itself. */
    reply_to: string | null;
    resend_domain_id: string | null;
    /** Set only when this domain lives under a different Resend account than the platform default. Never sent to the client. */
    resend_api_key: string | null;
    status: "pending" | "verified" | "failed";
    dns_records: any;
    created_at: string;
}

/** Fields safe to show in the UI — deliberately excludes resend_api_key. */
const PUBLIC_FIELDS = "id, user_id, domain, from_name, from_email, reply_to, resend_domain_id, status, dns_records, created_at";

export async function listSenderIdentities(userId: string): Promise<{ identities: SenderIdentity[] } | { error: string }> {
    try {
        const { data, error } = await admin()
            .from("sender_identities")
            .select(PUBLIC_FIELDS)
            .eq("user_id", userId)
            .order("created_at", { ascending: false });
        if (error) throw error;
        return { identities: (data as any as SenderIdentity[]) || [] };
    } catch (err: any) {
        return { error: err.message || "Failed to load sender identities" };
    }
}

export async function addSenderDomain({
    userId,
    domain,
    fromName,
    fromLocalPart,
    replyTo,
    resendApiKey,
}: {
    userId: string;
    domain: string;
    fromName: string;
    /** the part before the @, e.g. "surveys" for surveys@theirbrand.com */
    fromLocalPart: string;
    /** Optional: where replies should be forwarded, e.g. a real person's inbox instead of the noreply address. */
    replyTo?: string;
    /** Optional: only needed if this domain is verified under a DIFFERENT Resend account than the platform default (e.g. plan limits forced a separate account). */
    resendApiKey?: string;
}): Promise<{ identity: SenderIdentity } | { error: string }> {
    try {
        const cleanApiKey = resendApiKey?.trim() || null;
        if (!cleanApiKey && !process.env.RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured");

        const cleanDomain = domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
        if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(cleanDomain)) {
            throw new Error("That doesn't look like a valid domain (e.g. yourbrand.com)");
        }
        const localPart = fromLocalPart.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");
        if (!localPart) throw new Error("Enter the email name before the @ (e.g. surveys)");
        const cleanReplyTo = replyTo?.trim();
        if (cleanReplyTo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanReplyTo)) {
            throw new Error("That doesn't look like a valid reply-to email address");
        }

        // Register the domain with Resend (under the given account's key, if any)
        const res = await fetch(`${RESEND_API}/domains`, {
            method: "POST",
            headers: resendHeaders(cleanApiKey),
            body: JSON.stringify({ name: cleanDomain }),
        });
        const data = await res.json();

        // The POST can fail for two different reasons that both mean "this
        // domain is already on the account": a straight 422 "already exists",
        // or (as seen with kini-ai.com) a plan-limit rejection ("Your plan
        // includes 1 domain...") that fires before Resend even checks for a
        // duplicate. Either way, the fix is the same: look the domain up by
        // name and reuse it instead of failing. Only throw if it's genuinely
        // not found — i.e. some other domain is actually over the limit.
        let resendDomainId: string;
        let dnsRecords: any;
        if (res.ok) {
            resendDomainId = data.id;
            dnsRecords = data.records || null;
        } else {
            const listRes = await fetch(`${RESEND_API}/domains`, { headers: resendHeaders(cleanApiKey) });
            const listData = await listRes.json();
            const existing = (listData?.data || []).find((d: any) => d.name === cleanDomain);
            if (!existing) throw new Error(data?.message || "Failed to register domain with Resend");
            resendDomainId = existing.id;
            const detailRes = await fetch(`${RESEND_API}/domains/${resendDomainId}`, { headers: resendHeaders(cleanApiKey) });
            const detail = await detailRes.json();
            dnsRecords = detail.records || null;
        }

        const { data: identity, error } = await admin()
            .from("sender_identities")
            .upsert({
                user_id: userId,
                domain: cleanDomain,
                from_name: fromName.trim() || "EventFlow",
                from_email: `${localPart}@${cleanDomain}`,
                reply_to: cleanReplyTo || null,
                resend_domain_id: resendDomainId,
                resend_api_key: cleanApiKey,
                status: "pending",
                dns_records: dnsRecords,
            }, { onConflict: "user_id,domain" })
            .select(PUBLIC_FIELDS)
            .single();

        if (error) throw error;
        return { identity: identity as SenderIdentity };
    } catch (err: any) {
        console.error("addSenderDomain error:", err);
        return { error: err.message || "Failed to add sender domain" };
    }
}

export async function checkSenderDomain({
    identityId,
}: {
    identityId: string;
}): Promise<{ status: string; identity?: SenderIdentity } | { error: string }> {
    try {
        const supabase = admin();
        const { data: identity, error: idErr } = await supabase
            .from("sender_identities")
            .select("*")
            .eq("id", identityId)
            .single();
        if (idErr || !identity) throw new Error("Sender identity not found");
        if (!identity.resend_domain_id) throw new Error("Domain was never registered with Resend");

        // Ask Resend to (re)verify, then read back current status — using
        // this identity's own account key if it has one, not the platform default.
        await fetch(`${RESEND_API}/domains/${identity.resend_domain_id}/verify`, {
            method: "POST",
            headers: resendHeaders(identity.resend_api_key),
        });

        const res = await fetch(`${RESEND_API}/domains/${identity.resend_domain_id}`, {
            headers: resendHeaders(identity.resend_api_key),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || "Failed to check domain status");

        // Resend statuses: not_started | pending | verified | failed | temporary_failure
        const newStatus = data.status === "verified" ? "verified"
            : (data.status === "failed" ? "failed" : "pending");

        const { data: updated } = await supabase
            .from("sender_identities")
            .update({ status: newStatus, dns_records: data.records || identity.dns_records })
            .eq("id", identityId)
            .select(PUBLIC_FIELDS)
            .single();

        // Never send resend_api_key back over the wire to the client.
        const safeIdentity = updated || { ...identity, resend_api_key: undefined };
        return { status: newStatus, identity: safeIdentity as SenderIdentity };
    } catch (err: any) {
        console.error("checkSenderDomain error:", err);
        return { error: err.message || "Failed to verify domain" };
    }
}

export async function deleteSenderIdentity({ identityId }: { identityId: string }): Promise<{ success: boolean } | { error: string }> {
    try {
        const supabase = admin();
        const { data: identity } = await supabase
            .from("sender_identities")
            .select("resend_domain_id, resend_api_key")
            .eq("id", identityId)
            .single();

        if (identity?.resend_domain_id) {
            await fetch(`${RESEND_API}/domains/${identity.resend_domain_id}`, {
                method: "DELETE",
                headers: resendHeaders(identity.resend_api_key),
            }).catch(() => { /* best-effort; still remove our record */ });
        }

        const { error } = await supabase.from("sender_identities").delete().eq("id", identityId);
        if (error) throw error;
        return { success: true };
    } catch (err: any) {
        return { error: err.message || "Failed to delete sender identity" };
    }
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

/** Updates the Reply-To address on an existing sender identity. */
export async function updateSenderReplyTo({
    identityId,
    replyTo,
}: {
    identityId: string;
    replyTo: string;
}): Promise<{ identity: SenderIdentity } | { error: string }> {
    try {
        const cleanReplyTo = replyTo.trim();
        if (cleanReplyTo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanReplyTo)) {
            throw new Error("That doesn't look like a valid reply-to email address");
        }
        const { data, error } = await admin()
            .from("sender_identities")
            .update({ reply_to: cleanReplyTo || null })
            .eq("id", identityId)
            .select(PUBLIC_FIELDS)
            .single();
        if (error) throw error;
        return { identity: data as any as SenderIdentity };
    } catch (err: any) {
        return { error: err.message || "Failed to update reply-to address" };
    }
}
