import { emailConfigForTag } from "@/app/[tag]/theme";
import { resolveSenderForUser } from "./senderResolve";

import { PLATFORM_FROM_ADDRESS } from "./platformEmail";
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
export async function resolveEventSender(event: { tag?: string | null; created_by?: string | null }): Promise<EventSender | null> {
    const cfg = emailConfigForTag(event.tag);
    if (cfg) {
        return {
            from: `${cfg.fromName ?? cfg.brandName} <${PLATFORM_FROM_ADDRESS}>`,
            replyTo: cfg.replyTo,
            brandName: cfg.brandName,
        };
    }
    return resolveSenderForUser(event.created_by);
}
