/**
 * The address the PLATFORM sends email from when an event has no sending domain of its own
 * (registration confirmations, invites, reminders, broadcasts...).
 *
 * To change the domain, set PLATFORM_FROM_ADDRESS in Vercel (e.g. noreply@yourdomain.com) and redeploy: no code change.
 * The domain must be verified in Resend (SPF + DKIM records), otherwise Resend refuses every email.
 */
export const DEFAULT_PLATFORM_FROM_ADDRESS = "noreply@jolextom.com";

const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

/** Accepts "noreply@x.com" or "Name <noreply@x.com>" from the setting; anything unusable falls back to the default. */
export function parsePlatformAddress(raw: string | undefined | null): string {
    const value = (raw ?? "").trim();
    const inner = /<([^>]+)>/.exec(value)?.[1]?.trim() ?? value;
    return EMAIL_RE.test(inner) ? inner : DEFAULT_PLATFORM_FROM_ADDRESS;
}

export const PLATFORM_FROM_ADDRESS = parsePlatformAddress(process.env.PLATFORM_FROM_ADDRESS);

/** A From line from the platform address, e.g. `EventFlow <noreply@jolextom.com>`. */
export const platformFrom = (name = "EventFlow", address: string = PLATFORM_FROM_ADDRESS) => `${name} <${address}>`;
