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

/**
 * Where guests can send a complaint or a question: the SUPPORT address, set with NEXT_PUBLIC_SUPPORT_EMAIL in Vercel
 * (kept out of the code because the repository is public). It is used as the Reply-To of platform emails and shown in
 * the email footer and on the receipt page. Unset or unusable = no support line and no Reply-To.
 */
export function parseOptionalEmail(raw: string | undefined | null): string | null {
    const value = (raw ?? "").trim();
    const inner = /<([^>]+)>/.exec(value)?.[1]?.trim() ?? value;
    return EMAIL_RE.test(inner) ? inner : null;
}

export const SUPPORT_EMAIL = parseOptionalEmail(process.env.NEXT_PUBLIC_SUPPORT_EMAIL);

/** True when an email goes out from the platform's own address (not an organiser's own verified domain). */
export const isPlatformFrom = (from?: string | null, platformAddress: string = PLATFORM_FROM_ADDRESS) =>
    !from || (/<([^>]+)>/.exec(from)?.[1] ?? from).trim().toLowerCase() === platformAddress.toLowerCase();

/**
 * The Reply-To to use when the caller didn't give one: the support address for platform-sent mail, nothing for an
 * organiser's own domain (their replies must not land with the platform).
 */
export function defaultReplyTo(from?: string | null, support: string | null = SUPPORT_EMAIL, platformAddress: string = PLATFORM_FROM_ADDRESS): string | undefined {
    return support && isPlatformFrom(from, platformAddress) ? support : undefined;
}
