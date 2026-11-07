"use server";

import { createClient } from "@supabase/supabase-js";
import { verifiedUserId } from "@/lib/authz";

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

/**
 * SECURITY: every function exported from this file is a public web endpoint (that is what "use server" means),
 * and `admin()` bypasses the database's access rules. So each one below works out WHO is calling from their
 * login token (never from a user id the page sends) and only touches that person's own sender identities.
 * Functions that return secrets (the Resend API key) live in senderResolve.ts, which is NOT public.
 */
const LOG_IN_AGAIN = { error: "Please log in again." } as const;

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

export async function listSenderIdentities(accessToken: string): Promise<{ identities: SenderIdentity[] } | { error: string }> {
    const userId = await verifiedUserId(accessToken);
    if (!userId) return LOG_IN_AGAIN;
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
    accessToken,
    domain,
    fromName,
    fromLocalPart,
    replyTo,
    resendApiKey,
}: {
    /** The caller's login token: who is adding the domain is decided from this, on the server. */
    accessToken: string;
    domain: string;
    fromName: string;
    /** the part before the @, e.g. "surveys" for surveys@theirbrand.com */
    fromLocalPart: string;
    /** Optional: where replies should be forwarded, e.g. a real person's inbox instead of the noreply address. */
    replyTo?: string;
    /** Optional: only needed if this domain is verified under a DIFFERENT Resend account than the platform default (e.g. plan limits forced a separate account). */
    resendApiKey?: string;
}): Promise<{ identity: SenderIdentity } | { error: string }> {
    const userId = await verifiedUserId(accessToken);
    if (!userId) return LOG_IN_AGAIN;
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
        // Resend's own status for the domain, so a domain that's already
        // verified under this account shows Verified immediately instead of
        // sitting at Pending until someone clicks Verify.
        let resendStatus: string = "pending";
        if (res.ok) {
            resendDomainId = data.id;
            dnsRecords = data.records || null;
            resendStatus = data.status || "pending";
        } else {
            const listRes = await fetch(`${RESEND_API}/domains`, { headers: resendHeaders(cleanApiKey) });
            const listData = await listRes.json();
            const existing = (listData?.data || []).find((d: any) => d.name === cleanDomain);
            if (!existing) throw new Error(data?.message || "Failed to register domain with Resend");
            resendDomainId = existing.id;
            const detailRes = await fetch(`${RESEND_API}/domains/${resendDomainId}`, { headers: resendHeaders(cleanApiKey) });
            const detail = await detailRes.json();
            dnsRecords = detail.records || null;
            resendStatus = detail.status || existing.status || "pending";
        }
        const ourStatus = resendStatus === "verified" ? "verified" : (resendStatus === "failed" ? "failed" : "pending");

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
                status: ourStatus,
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

/**
 * Registers a sender identity for a domain you've already verified directly
 * on Resend (its own dashboard, a separate account, whatever) — skips the
 * Domains API registration dance entirely and just trusts the given API key
 * as proof. Use this instead of addSenderDomain() when there's nothing left
 * to verify; addSenderDomain is for domains that still need DNS records set up.
 */
export async function addVerifiedSender({
    accessToken,
    domain,
    fromName,
    fromLocalPart,
    replyTo,
    resendApiKey,
}: {
    /** The caller's login token: who is adding the sender is decided from this, on the server. */
    accessToken: string;
    domain: string;
    fromName: string;
    /** the part before the @, e.g. "surveys" for surveys@theirbrand.com */
    fromLocalPart: string;
    replyTo?: string;
    /** Required — this is the only proof we have that the domain is actually usable. */
    resendApiKey: string;
}): Promise<{ identity: SenderIdentity } | { error: string }> {
    const userId = await verifiedUserId(accessToken);
    if (!userId) return LOG_IN_AGAIN;
    try {
        const cleanApiKey = resendApiKey.trim();
        if (!cleanApiKey) throw new Error("A Resend API key is required for an already-verified domain");

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

        const { data: identity, error } = await admin()
            .from("sender_identities")
            .upsert({
                user_id: userId,
                domain: cleanDomain,
                from_name: fromName.trim() || "EventFlow",
                from_email: `${localPart}@${cleanDomain}`,
                reply_to: cleanReplyTo || null,
                resend_domain_id: null,
                resend_api_key: cleanApiKey,
                status: "verified",
                dns_records: null,
            }, { onConflict: "user_id,domain" })
            .select(PUBLIC_FIELDS)
            .single();

        if (error) throw error;
        return { identity: identity as SenderIdentity };
    } catch (err: any) {
        console.error("addVerifiedSender error:", err);
        return { error: err.message || "Failed to add sender" };
    }
}

export async function checkSenderDomain({
    accessToken,
    identityId,
}: {
    accessToken: string;
    identityId: string;
}): Promise<{ status: string; identity?: SenderIdentity } | { error: string }> {
    const userId = await verifiedUserId(accessToken);
    if (!userId) return LOG_IN_AGAIN;
    try {
        const supabase = admin();
        const { data: identity, error: idErr } = await supabase
            .from("sender_identities")
            .select("*")
            .eq("id", identityId)
            .eq("user_id", userId) // only YOUR identities
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
            .eq("user_id", userId)
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

export async function deleteSenderIdentity({ accessToken, identityId }: { accessToken: string; identityId: string }): Promise<{ success: boolean } | { error: string }> {
    const userId = await verifiedUserId(accessToken);
    if (!userId) return LOG_IN_AGAIN;
    try {
        const supabase = admin();
        // Only YOUR identity: otherwise nothing is deleted here and nothing is asked of Resend.
        const { data: identity } = await supabase
            .from("sender_identities")
            .select("resend_domain_id, resend_api_key")
            .eq("id", identityId)
            .eq("user_id", userId)
            .maybeSingle();
        if (!identity) return { error: "Sender identity not found" };

        if (identity?.resend_domain_id) {
            await fetch(`${RESEND_API}/domains/${identity.resend_domain_id}`, {
                method: "DELETE",
                headers: resendHeaders(identity.resend_api_key),
            }).catch(() => { /* best-effort; still remove our record */ });
        }

        const { error } = await supabase.from("sender_identities").delete().eq("id", identityId).eq("user_id", userId);
        if (error) throw error;
        return { success: true };
    } catch (err: any) {
        return { error: err.message || "Failed to delete sender identity" };
    }
}

/** Updates the Reply-To address on an existing sender identity. */
export async function updateSenderReplyTo({
    accessToken,
    identityId,
    replyTo,
}: {
    accessToken: string;
    identityId: string;
    replyTo: string;
}): Promise<{ identity: SenderIdentity } | { error: string }> {
    const userId = await verifiedUserId(accessToken);
    if (!userId) return LOG_IN_AGAIN;
    try {
        const cleanReplyTo = replyTo.trim();
        if (cleanReplyTo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanReplyTo)) {
            throw new Error("That doesn't look like a valid reply-to email address");
        }
        const { data, error } = await admin()
            .from("sender_identities")
            .update({ reply_to: cleanReplyTo || null })
            .eq("id", identityId)
            .eq("user_id", userId) // only YOUR identity: a stranger must not be able to redirect your replies
            .select(PUBLIC_FIELDS)
            .single();
        if (error) throw error;
        return { identity: data as any as SenderIdentity };
    } catch (err: any) {
        return { error: err.message || "Failed to update reply-to address" };
    }
}
