"use server";

import { headers } from "next/headers";
import { createCheckout, type CheckoutGuestInput } from "@/lib/checkout";

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
