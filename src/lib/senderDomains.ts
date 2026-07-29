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

function resendHeaders() {
    return {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
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
    resend_domain_id: string | null;
    status: "pending" | "verified" | "failed";
    dns_records: any;
    created_at: string;
}

export async function listSenderIdentities(userId: string): Promise<{ identities: SenderIdentity[] } | { error: string }> {
    try {
        const { data, error } = await admin()
            .from("sender_identities")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: false });
        if (error) throw error;
        return { identities: (data as SenderIdentity[]) || [] };
    } catch (err: any) {
        return { error: err.message || "Failed to load sender identities" };
    }
}

export async function addSenderDomain({
    userId,
    domain,
    fromName,
    fromLocalPart,
}: {
    userId: string;
    domain: string;
    fromName: string;
    /** the part before the @, e.g. "surveys" for surveys@theirbrand.com */
    fromLocalPart: string;
}): Promise<{ identity: SenderIdentity } | { error: string }> {
    try {
        if (!process.env.RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured");

        const cleanDomain = domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
        if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(cleanDomain)) {
            throw new Error("That doesn't look like a valid domain (e.g. yourbrand.com)");
        }
        const localPart = fromLocalPart.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");
        if (!localPart) throw new Error("Enter the email name before the @ (e.g. surveys)");

        // Register the domain with Resend
        const res = await fetch(`${RESEND_API}/domains`, {
            method: "POST",
            headers: resendHeaders(),
            body: JSON.stringify({ name: cleanDomain }),
        });
        const data = await res.json();

        // Resend returns 422 if the domain already exists on the account —
        // in that case, look it up so re-adding is idempotent rather than fatal.
        let resendDomainId: string;
        let dnsRecords: any;
        if (res.ok) {
            resendDomainId = data.id;
            dnsRecords = data.records || null;
        } else if (res.status === 422 || /already exists/i.test(data?.message || "")) {
            const listRes = await fetch(`${RESEND_API}/domains`, { headers: resendHeaders() });
            const listData = await listRes.json();
            const existing = (listData?.data || []).find((d: any) => d.name === cleanDomain);
            if (!existing) throw new Error(data?.message || "Failed to register domain with Resend");
            resendDomainId = existing.id;
            const detailRes = await fetch(`${RESEND_API}/domains/${resendDomainId}`, { headers: resendHeaders() });
            const detail = await detailRes.json();
            dnsRecords = detail.records || null;
        } else {
            throw new Error(data?.message || "Failed to register domain with Resend");
        }

        const { data: identity, error } = await admin()
            .from("sender_identities")
            .upsert({
                user_id: userId,
                domain: cleanDomain,
                from_name: fromName.trim() || "EventFlow",
                from_email: `${localPart}@${cleanDomain}`,
                resend_domain_id: resendDomainId,
                status: "pending",
                dns_records: dnsRecords,
            }, { onConflict: "user_id,domain" })
            .select()
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

        // Ask Resend to (re)verify, then read back current status
        await fetch(`${RESEND_API}/domains/${identity.resend_domain_id}/verify`, {
            method: "POST",
            headers: resendHeaders(),
        });

        const res = await fetch(`${RESEND_API}/domains/${identity.resend_domain_id}`, {
            headers: resendHeaders(),
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
            .select()
            .single();

        return { status: newStatus, identity: (updated || identity) as SenderIdentity };
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
            .select("resend_domain_id")
            .eq("id", identityId)
            .single();

        if (identity?.resend_domain_id) {
            await fetch(`${RESEND_API}/domains/${identity.resend_domain_id}`, {
                method: "DELETE",
                headers: resendHeaders(),
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
 * Resolves the From line for an outgoing email. Only verified identities are
 * honored; anything else falls back to the platform default so mail never
 * goes out through an unverified domain.
 */
export async function resolveSender(identityId?: string | null): Promise<string> {
    const fallback = "EventFlow <noreply@partiesandeventz.com>";
    if (!identityId) return fallback;
    try {
        const { data } = await admin()
            .from("sender_identities")
            .select("from_name, from_email, status")
            .eq("id", identityId)
            .single();
        if (data && data.status === "verified") {
            return `${data.from_name} <${data.from_email}>`;
        }
    } catch { /* fall through */ }
    return fallback;
}
