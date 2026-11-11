/**
 * Turns what Resend says when it refuses an email into what to actually do about it.
 * Used by the "Send test email" button, so a failed test says what to fix instead of showing raw API text.
 */
export function explainEmailError(err: unknown): string {
    const e = err as { message?: unknown; name?: unknown } | string | null | undefined;
    const message = typeof e === "string" ? e : typeof e?.message === "string" ? e.message : "";
    const name = typeof e === "object" && e && typeof e.name === "string" ? e.name : "";
    const text = `${name} ${message}`;

    if (/testing emails to your own|only send testing emails/i.test(text))
        return "Resend only lets this domain send to your own Resend account address: the sending domain isn't verified for this API key's account yet. In Resend > Domains it must say Verified, in the SAME account the key belongs to.";
    if (/not verified|verify your domain|domain is not/i.test(text))
        return "Resend says the sending domain isn't verified. In Resend > Domains, wait until it says Verified (check the DNS records), and make sure it is in the same Resend account as the API key set in Vercel.";
    if (/restricted/i.test(text))
        return "That Resend API key is restricted (for example to one domain). Create a key with Sending access for all domains, or for the sending domain, then update RESEND_API_KEY in Vercel and redeploy.";
    if (/invalid.?api.?key|api key is invalid|missing.*api key|unauthorized/i.test(text))
        return "Resend refused the API key. RESEND_API_KEY in Vercel is missing, mistyped, or revoked: create a new one in Resend > API Keys, update it in Vercel and redeploy.";
    if (/rate.?limit|too many requests/i.test(text)) return "Resend is rate-limiting this account. Wait a minute and try again.";
    return message ? `Resend said: ${message}` : "The email could not be sent. Check the Resend dashboard (Emails > Logs) for the reason.";
}
