import { Resend } from 'resend';
import {
    renderInviteEmailHtml,
    renderKiniSummitReminderEmailHtml,
    renderConfirmationEmailHtmlForTemplate,
    renderBroadcastEmailHtml,
    InviteEmailParams,
    ReminderEmailParams,
    ConfirmationEmailParams,
    BroadcastEmailParams
} from './email-templates';

// Re-export for convenience if needed, though direct import preferred
export * from './email-templates';

// A verified domain only sends through the Resend ACCOUNT that verified it.
// Most sender identities use the platform's own account (env var, cached as
// a singleton below); a tenant whose domain lives under a separate Resend
// account (their own API key) needs a client built with THAT key instead —
// reusing the platform singleton for them would silently try to send a
// domain the platform's account doesn't own.
let resendInstance: Resend | null = null;
const getResend = (apiKey?: string) => {
    if (typeof window !== 'undefined') {
        throw new Error('Resend cannot be initialized on the client side.');
    }
    if (apiKey) {
        return new Resend(apiKey);
    }
    if (!resendInstance) {
        if (!process.env.RESEND_API_KEY) {
            console.error('RESEND_API_KEY is missing');
        }
        resendInstance = new Resend(process.env.RESEND_API_KEY);
    }
    return resendInstance;
};

// ============================================================================
// INVITE EMAIL
// ============================================================================

interface SendInviteEmailParams extends InviteEmailParams {
    to: string;
    /** Verified sender From line, e.g. "Kini AI <noreply@kini-ai.com>". Callers should resolve this via resolveSender()/resolveSenderForUser() so unverified domains never get here. */
    from?: string;
    /** Where replies should land, e.g. a real person's inbox instead of the noreply address. */
    replyTo?: string;
    /** Only needed if the sender's domain lives under a different Resend account than the platform default. */
    resendApiKey?: string;
}

export async function sendInviteEmail({
    to,
    eventTitle,
    eventDate,
    eventLocation,
    inviterName,
    passType,
    inviteLink,
    eventImage,
    brandName,
    from,
    replyTo,
    resendApiKey
}: SendInviteEmailParams) {
    try {
        const html = renderInviteEmailHtml({
            eventTitle,
            eventDate,
            eventLocation,
            inviterName,
            passType,
            inviteLink,
            eventImage,
            brandName
        });

        const { data, error } = await getResend(resendApiKey).emails.send({
            from: from || 'EventFlow <noreply@partiesandeventz.com>',
            to: [to],
            replyTo: replyTo || undefined,
            // In dev mode, we can only send to verified email.
            // If to is not verified, it might fail depending on Resend plan.
            subject: `You're invited to ${eventTitle}!`,
            html,
        });

        if (error) {
            console.error('Failed to send invite email:', error);
            return { success: false, error };
        }

        return { success: true, data };
    } catch (error) {
        console.error('Failed to send invite email:', error);
        return { success: false, error };
    }
}

// ============================================================================
// CONFIRMATION EMAIL
// ============================================================================

interface SendConfirmationEmailParams extends ConfirmationEmailParams {
    to: string;
    /** Verified sender From line, e.g. "Kini AI <noreply@kini-ai.com>". Callers should resolve this via resolveSender()/resolveSenderForUser() so unverified domains never get here. */
    from?: string;
    /** Where replies should land, e.g. a real person's inbox instead of the noreply address. */
    replyTo?: string;
    /** Only needed if the sender's domain lives under a different Resend account than the platform default. */
    resendApiKey?: string;
    /** Selects a non-default confirmation design, e.g. 'kini_summit'. Resolved from events.confirmation_template by the caller. */
    templateKey?: string | null;
}

export async function sendConfirmationEmail({
    to,
    eventTitle,
    eventDate,
    eventLocation,
    orderRef,
    receiptLink,
    watchLink,
    attendeeName,
    eventImage,
    brandName,
    from,
    replyTo,
    resendApiKey,
    templateKey
}: SendConfirmationEmailParams) {
    try {
        const html = renderConfirmationEmailHtmlForTemplate(templateKey, {
            eventTitle,
            eventDate,
            eventLocation,
            orderRef,
            receiptLink,
            watchLink,
            attendeeName,
            eventImage,
            brandName
        });

        const { data, error } = await getResend(resendApiKey).emails.send({
            from: from || 'EventFlow <noreply@partiesandeventz.com>',
            to: [to],
            replyTo: replyTo || undefined,
            subject: `Registration Confirmed - ${eventTitle}`,
            html,
        });

        if (error) {
            console.error('Failed to send confirmation email:', error);
            return { success: false, error };
        }

        return { success: true, data };
    } catch (error) {
        console.error('Failed to send confirmation email:', error);
        return { success: false, error };
    }
}

// ============================================================================
// REMINDER EMAIL (pre-event check-in QR)
// ============================================================================

/**
 * Builds a hosted QR image URL encoding the given data — no dependency
 * added, and a normal external <img src> works reliably in email clients,
 * unlike a data: URI which many clients strip. Uses api.qrserver.com, a
 * free, no-signup QR image service; the data (an attendee ref like
 * "EF-AIFORAFRICASEDUCATIONSUMMIT-A1B2C3D4") is not personally identifying.
 */
export function buildQrCodeUrl(data: string, size: number = 240): string {
    const encoded = encodeURIComponent(data);
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}`;
}

interface SendReminderEmailParams extends ReminderEmailParams {
    to: string;
    /** Verified sender From line, e.g. "Kini AI <noreply@kini-ai.com>". Callers should resolve this via resolveSender()/resolveSenderForUser() so unverified domains never get here. */
    from?: string;
    /** Where replies should land, e.g. a real person's inbox instead of the noreply address. */
    replyTo?: string;
    /** Only needed if the sender's domain lives under a different Resend account than the platform default. */
    resendApiKey?: string;
}

export async function sendReminderEmail({
    to,
    eventTitle,
    eventDate,
    eventLocation,
    attendeeName,
    checkInRef,
    qrCodeUrl,
    googleCalendarLink,
    outlookCalendarLink,
    from,
    replyTo,
    resendApiKey,
}: SendReminderEmailParams) {
    try {
        const html = renderKiniSummitReminderEmailHtml({
            eventTitle,
            eventDate,
            eventLocation,
            attendeeName,
            checkInRef,
            qrCodeUrl,
            googleCalendarLink,
            outlookCalendarLink,
        });

        const { data, error } = await getResend(resendApiKey).emails.send({
            from: from || 'EventFlow <noreply@partiesandeventz.com>',
            to: [to],
            replyTo: replyTo || undefined,
            subject: `Your check-in code for ${eventTitle}`,
            html,
        });

        if (error) {
            console.error('Failed to send reminder email:', error);
            return { success: false, error };
        }

        return { success: true, data };
    } catch (error) {
        console.error('Failed to send reminder email:', error);
        return { success: false, error };
    }
}

// ============================================================================
// BROADCAST EMAIL
// ============================================================================

interface SendBroadcastEmailParams extends BroadcastEmailParams {
    to: string[];
    /** Verified sender From line, e.g. "Kini AI <surveys@kini-ai.com>". Callers must resolve this via resolveSender() so unverified domains never get here. */
    from?: string;
    /** Where replies should land, e.g. a real person's inbox instead of the noreply address. */
    replyTo?: string;
    /** Only needed if the sender's domain lives under a different Resend account than the platform default. */
    resendApiKey?: string;
}

export async function sendBroadcastEmail({
    to,
    eventTitle,
    messageTitle,
    messageBody,
    eventImage,
    actionLink,
    actionText,
    brandName,
    from,
    replyTo,
    resendApiKey
}: SendBroadcastEmailParams) {
    try {
        const html = renderBroadcastEmailHtml({
            eventTitle,
            messageTitle,
            messageBody,
            eventImage,
            actionLink,
            actionText,
            brandName
        });

        // Resend allows sending to multiple recipients (up to 50 per request usually)
        const { data, error } = await getResend(resendApiKey).emails.send({
            from: from || 'EventFlow <noreply@partiesandeventz.com>',
            to: to,
            replyTo: replyTo || undefined,
            subject: `${messageTitle} - ${eventTitle}`,
            html,
        });

        if (error) {
            console.error('Failed to send broadcast email:', error);
            return { success: false, error };
        }

        return { success: true, data };
    } catch (error) {
        console.error('Failed to send broadcast email:', error);
        return { success: false, error };
    }
}
