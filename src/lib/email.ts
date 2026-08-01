import { Resend } from 'resend';
import {
    renderInviteEmailHtml,
    renderConfirmationEmailHtml,
    renderBroadcastEmailHtml,
    InviteEmailParams,
    ConfirmationEmailParams,
    BroadcastEmailParams
} from './email-templates';

// Re-export for convenience if needed, though direct import preferred
export * from './email-templates';

// Initialize Resend lazily to avoid issues if this file is imported in a client component
let resendInstance: Resend | null = null;
const getResend = () => {
    if (typeof window !== 'undefined') {
        throw new Error('Resend cannot be initialized on the client side.');
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
    from
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

        const { data, error } = await getResend().emails.send({
            from: from || 'EventFlow <noreply@partiesandeventz.com>',
            to: [to],
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
    from
}: SendConfirmationEmailParams) {
    try {
        const html = renderConfirmationEmailHtml({
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

        const { data, error } = await getResend().emails.send({
            from: from || 'EventFlow <noreply@partiesandeventz.com>',
            to: [to],
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
// BROADCAST EMAIL
// ============================================================================

interface SendBroadcastEmailParams extends BroadcastEmailParams {
    to: string[];
    /** Verified sender From line, e.g. "Kini AI <surveys@kini-ai.com>". Callers must resolve this via resolveSender() so unverified domains never get here. */
    from?: string;
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
    from
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
        const { data, error } = await getResend().emails.send({
            from: from || 'EventFlow <noreply@partiesandeventz.com>',
            to: to,
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
