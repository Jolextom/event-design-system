"use server";

import { headers } from "next/headers";
import { createCheckout, type CheckoutGuestInput } from "@/lib/checkout";
import { addGroupMember, completeInvite, resendGuestEmail } from "@/lib/guests";
import { rateLimit } from "@/lib/rateLimit";
import type { AnswerValue } from "@/lib/answers";

export type RegistrationResult =
    | { ok: true; status: "registered"; orderRef: string }
    | { ok: true; status: "payment_required"; orderRef: string; authorizationUrl: string }
    | { ok: false; error: string };

/**
 * Entry point for the hosted event page's "Register" button.
 *
 * The browser only says WHO is registering and for WHICH ticket. Price, fees,
 * deadlines, guest limits and the Paystack split are all decided on the server
 * in createCheckout (src/lib/checkout.ts); nothing the browser sends can change
 * what is charged.
 */
export async function submitRegistration(input: {
    eventTag: string;
    passId: string;
    guests: CheckoutGuestInput[];
    referralCode?: string | null;
}): Promise<RegistrationResult> {
    if (
        !input ||
        typeof input.eventTag !== "string" ||
        typeof input.passId !== "string" ||
        !Array.isArray(input.guests) ||
        input.guests.length === 0 ||
        input.guests.length > 50
    ) {
        return { ok: false, error: "Invalid registration request" };
    }

    // Where Paystack should send the customer afterwards: this deployment's own origin
    // (works on previews and custom domains), falling back to NEXT_PUBLIC_SITE_URL.
    const h = await headers();
    const host = h.get("x-forwarded-host") || h.get("host");
    const isLocal = !!host && /^(localhost|127\.|\[::1\])/.test(host);
    const proto = h.get("x-forwarded-proto") || (isLocal ? "http" : "https");
    const origin = host ? `${proto}://${host}` : null;

    try {
        const result = await createCheckout({
            eventTag: input.eventTag,
            passId: input.passId,
            guests: input.guests,
            referralCode: typeof input.referralCode === "string" ? input.referralCode : null,
            origin,
        });

        if (!result.ok) return { ok: false, error: result.error };
        if (result.status === "payment_required") {
            return { ok: true, status: "payment_required", orderRef: result.orderRef, authorizationUrl: result.authorizationUrl };
        }
        return { ok: true, status: "registered", orderRef: result.orderRef };
    } catch (err: unknown) {
        console.error("submitRegistration failed:", err);
        const message = err instanceof Error ? err.message : "";
        return {
            ok: false,
            error: message.includes("duplicate key") || message.includes("unique_event_email")
                ? "This email is already registered for this event"
                : message || "Failed to complete registration",
        };
    }
}


// ---------------------------------------------------------------------------
// Guest actions (invites, group members). Each one is rate-limited per caller
// IP (best effort) on top of the database-backed per-person email budget in
// src/lib/guests.ts.
// ---------------------------------------------------------------------------
async function callerKey(scope: string) {
    const h = await headers();
    const ip = (h.get("x-forwarded-for") || "").split(",")[0].trim() || h.get("x-real-ip") || "unknown";
    return `${scope}:${ip}`;
}
const tooMany = (retryAfterSec: number) => ({ ok: false as const, error: `Too many requests. Please try again in ${retryAfterSec} seconds.` });

export async function completeInviteAction(input: {
    ref: string;
    firstName: string;
    lastName?: string;
    answers?: Record<string, AnswerValue>;
}): Promise<{ ok: true; alreadyDone?: boolean; emailSent?: boolean; email?: string } | { ok: false; error: string }> {
    const rl = rateLimit(await callerKey("complete-invite"), 10, 10 * 60 * 1000);
    if (!rl.ok) return tooMany(rl.retryAfterSec);
    const res = await completeInvite({
        ref: String(input?.ref ?? ""),
        firstName: String(input?.firstName ?? ""),
        lastName: input?.lastName ? String(input.lastName) : "",
        answers: input?.answers ?? {},
    });
    return res.ok ? { ok: true, alreadyDone: res.alreadyDone, emailSent: res.emailSent, email: res.email } : { ok: false, error: res.error };
}

export async function addGroupMemberAction(input: {
    orderRef: string;
    mode: "fill" | "invite";
    email: string;
    firstName?: string;
    lastName?: string;
    answers?: Record<string, AnswerValue>;
}) {
    const rl = rateLimit(await callerKey("add-member"), 15, 10 * 60 * 1000);
    if (!rl.ok) return tooMany(rl.retryAfterSec);
    const res = await addGroupMember({
        orderRef: String(input?.orderRef ?? ""),
        mode: input?.mode === "fill" ? "fill" : "invite",
        email: String(input?.email ?? ""),
        firstName: input?.firstName ? String(input.firstName) : "",
        lastName: input?.lastName ? String(input.lastName) : "",
        answers: input?.answers ?? {},
    });
    return res.ok ? { ok: true as const, attendee: res.attendee, emailSent: res.emailSent } : { ok: false as const, error: res.error };
}

export async function resendInviteAction(input: { attendeeId: string; orderRef: string }) {
    const rl = rateLimit(await callerKey("resend"), 6, 10 * 60 * 1000);
    if (!rl.ok) return tooMany(rl.retryAfterSec);
    const res = await resendGuestEmail({ attendeeId: String(input?.attendeeId ?? ""), orderRef: String(input?.orderRef ?? "") });
    return res.ok ? { ok: true as const } : { ok: false as const, error: res.error };
}
