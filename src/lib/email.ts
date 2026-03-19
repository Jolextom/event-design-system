import { Resend } from 'resend';
import {
    renderInviteEmailHtml,
    renderConfirmationEmailHtml,
    InviteEmailParams,
    ConfirmationEmailParams
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
}

export async function sendInviteEmail({
    to,
    eventTitle,
    eventDate,
    eventLocation,
    inviterName,
    passType,
    inviteLink,
}: SendInviteEmailParams) {
    try {
        const html = renderInviteEmailHtml({
            eventTitle,
            eventDate,
            eventLocation,
            inviterName,
            passType,
            inviteLink,
        });

        const { data, error } = await getResend().emails.send({
            from: 'EventFlow <noreply@partiesandeventz.com>',
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
        });

        const { data, error } = await getResend().emails.send({
            from: 'EventFlow <noreply@partiesandeventz.com>',
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
