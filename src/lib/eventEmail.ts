import { emailConfigForTag } from "@/app/[tag]/theme";
import { resolveSenderForUser } from "./senderResolve";

import { PLATFORM_FROM_ADDRESS, SUPPORT_EMAIL } from "./platformEmail";
import { adminClient } from "./apiV1";
import { eventSupportEmail } from "./supportEmail";
export { PLATFORM_FROM_ADDRESS };

export interface EventSender {
    from?: string;
    replyTo?: string;
    resendApiKey?: string;
    brandName?: string;
}

/**
 * Who an email for this event is sent from. ONE place, used by confirmation,
 * invite and check-in emails, so a guest never gets a mix of senders.
 *
 *  - Event with its own email identity (theme.email): platform domain + that
 *    brand. Never the owner's account-wide identity.
 *  - Any other event: the owner's verified sender identity if they have one,
 *    exactly as before (existing events are unaffected).
 */
export async function resolveEventSender(event: { id?: string | null; tag?: string | null; created_by?: string | null }): Promise<EventSender | null> {
    // The organiser's own support address for this event (Settings > Support email), read live: no redeploy to change it.
    const own = await eventSupportEmail(adminClient(), event.id);
    const cfg = emailConfigForTag(event.tag);
    if (cfg) {
        return {
            from: `${cfg.fromName ?? cfg.brandName} <${PLATFORM_FROM_ADDRESS}>`,
            replyTo: cfg.replyTo ?? own ?? SUPPORT_EMAIL ?? undefined,
            brandName: cfg.brandName,
        };
    }
    const sender = await resolveSenderForUser(event.created_by);
    // An address typed for this event wins over the sender's default Reply-To. With no verified sender of their own the
    // email goes out from the platform address (callers treat a missing `from` that way), still with the organiser's Reply-To.
    if (own) return sender ? { ...sender, replyTo: own } : { replyTo: own };
    return sender;
}
