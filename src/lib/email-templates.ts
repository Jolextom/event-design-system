// Shared email rendering logic (safe for client-side use)

// ============================================================================
// INVITE EMAIL
// ============================================================================

export interface InviteEmailParams {
    eventTitle: string;
    eventDate: string;
    eventLocation: string;
    inviterName: string;
    passType: string;
    inviteLink: string;
}

/**
 * Render invite email HTML from params (for preview/re-rendering)
 */
export function renderInviteEmailHtml({
    eventTitle,
    eventDate,
    eventLocation,
    inviterName,
    passType,
    inviteLink,
}: InviteEmailParams): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="width: 100%; max-width: 480px; border-collapse: collapse;">
                    <!-- Header -->
                    <tr>
                        <td style="text-align: center; padding-bottom: 32px;">
                            <div style="display: inline-flex; align-items: center; gap: 8px;">
                                <div style="width: 28px; height: 28px; background: #fef2f2; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 12px;">❤</div>
                                <span style="font-weight: 900; font-size: 14px; letter-spacing: -0.5px;">EventFlow</span>
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Main Card -->
                    <tr>
                        <td style="background: white; border-radius: 32px; padding: 48px 40px; box-shadow: 0 4px 24px rgba(0,0,0,0.06);">
                            <!-- Icon -->
                            <div style="text-align: center; margin-bottom: 24px;">
                                <div style="width: 56px; height: 56px; background: linear-gradient(135deg, #3b82f6, #8b5cf6); border-radius: 16px; display: inline-flex; align-items: center; justify-content: center;">
                                    <span style="font-size: 24px;">🎟️</span>
                                </div>
                            </div>
                            
                            <!-- Title -->
                            <h1 style="margin: 0 0 8px; font-size: 28px; font-weight: 900; text-align: center; color: #111827; letter-spacing: -1px;">
                                You're Invited!
                            </h1>
                            <p style="margin: 0 0 32px; font-size: 15px; color: #6b7280; text-align: center; font-weight: 500;">
                                <strong style="color: #111827;">${inviterName}</strong> has invited you to join their group for:
                            </p>
                            
                            <!-- Event Details -->
                            <div style="background: #f9fafb; border-radius: 20px; padding: 24px; margin-bottom: 32px;">
                                <h2 style="margin: 0 0 16px; font-size: 22px; font-weight: 900; color: #111827; letter-spacing: -0.5px;">
                                    ${eventTitle}
                                </h2>
                                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                    <tr>
                                        <td style="padding: 8px 0; font-size: 13px;">
                                            <span style="color: #9ca3af; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; font-size: 10px;">Date</span><br>
                                            <span style="color: #111827; font-weight: 600;">${eventDate}</span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; font-size: 13px;">
                                            <span style="color: #9ca3af; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; font-size: 10px;">Location</span><br>
                                            <span style="color: #111827; font-weight: 600;">${eventLocation}</span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; font-size: 13px;">
                                            <span style="color: #9ca3af; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; font-size: 10px;">Pass Type</span><br>
                                            <span style="color: #3b82f6; font-weight: 700;">${passType}</span>
                                        </td>
                                    </tr>
                                </table>
                            </div>
                            
                            <!-- CTA Button -->
                            <div style="text-align: center;">
                                <a href="${inviteLink}" style="display: inline-block; background: #111827; color: white; padding: 18px 40px; border-radius: 16px; text-decoration: none; font-weight: 900; font-size: 14px; letter-spacing: 0.5px;">
                                    Complete Registration →
                                </a>
                            </div>
                            
                            <p style="margin: 24px 0 0; font-size: 12px; color: #9ca3af; text-align: center;">
                                Or copy this link: <a href="${inviteLink}" style="color: #3b82f6;">${inviteLink}</a>
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding-top: 32px; text-align: center;">
                            <p style="margin: 0; font-size: 11px; color: #9ca3af; font-weight: 500;">
                                Sent via EventFlow • <a href="#" style="color: #9ca3af;">Unsubscribe</a>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();
}

// ============================================================================
// CONFIRMATION EMAIL
// ============================================================================

export interface ConfirmationEmailParams {
    eventTitle: string;
    eventDate: string;
    eventLocation: string;
    orderRef: string;
    receiptLink: string;
    attendeeName: string;
}

/**
 * Render confirmation email HTML from params (for preview/re-rendering)
 */
export function renderConfirmationEmailHtml({
    eventTitle,
    eventDate,
    eventLocation,
    orderRef,
    receiptLink,
    attendeeName,
}: ConfirmationEmailParams): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="width: 100%; max-width: 480px; border-collapse: collapse;">
                    <!-- Header -->
                    <tr>
                        <td style="text-align: center; padding-bottom: 32px;">
                            <div style="display: inline-flex; align-items: center; gap: 8px;">
                                <div style="width: 28px; height: 28px; background: #fef2f2; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 12px;">❤</div>
                                <span style="font-weight: 900; font-size: 14px; letter-spacing: -0.5px;">EventFlow</span>
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Main Card -->
                    <tr>
                        <td style="background: white; border-radius: 32px; padding: 48px 40px; box-shadow: 0 4px 24px rgba(0,0,0,0.06);">
                            <!-- Icon -->
                            <div style="text-align: center; margin-bottom: 24px;">
                                <div style="width: 56px; height: 56px; background: #22c55e; border-radius: 16px; display: inline-flex; align-items: center; justify-content: center;">
                                    <span style="font-size: 24px; color: white;">✓</span>
                                </div>
                            </div>
                            
                            <!-- Title -->
                            <h1 style="margin: 0 0 8px; font-size: 28px; font-weight: 900; text-align: center; color: #111827; letter-spacing: -1px;">
                                You're All Set!
                            </h1>
                            <p style="margin: 0 0 32px; font-size: 15px; color: #6b7280; text-align: center; font-weight: 500;">
                                Hi <strong style="color: #111827;">${attendeeName}</strong>, your registration is confirmed.
                            </p>
                            
                            <!-- Event Details -->
                            <div style="background: #f9fafb; border-radius: 20px; padding: 24px; margin-bottom: 32px;">
                                <h2 style="margin: 0 0 16px; font-size: 22px; font-weight: 900; color: #111827; letter-spacing: -0.5px;">
                                    ${eventTitle}
                                </h2>
                                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                    <tr>
                                        <td style="padding: 8px 0; font-size: 13px;">
                                            <span style="color: #9ca3af; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; font-size: 10px;">Date</span><br>
                                            <span style="color: #111827; font-weight: 600;">${eventDate}</span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; font-size: 13px;">
                                            <span style="color: #9ca3af; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; font-size: 10px;">Location</span><br>
                                            <span style="color: #111827; font-weight: 600;">${eventLocation}</span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; font-size: 13px;">
                                            <span style="color: #9ca3af; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; font-size: 10px;">Order Reference</span><br>
                                            <span style="color: #111827; font-weight: 700; font-family: monospace;">${orderRef}</span>
                                        </td>
                                    </tr>
                                </table>
                            </div>
                            
                            <!-- CTA Button -->
                            <div style="text-align: center;">
                                <a href="${receiptLink}" style="display: inline-block; background: #111827; color: white; padding: 18px 40px; border-radius: 16px; text-decoration: none; font-weight: 900; font-size: 14px; letter-spacing: 0.5px;">
                                    View Receipt →
                                </a>
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding-top: 32px; text-align: center;">
                            <p style="margin: 0; font-size: 11px; color: #9ca3af; font-weight: 500;">
                                Sent via EventFlow
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();
}

// ============================================================================
// EMAIL PREVIEW HELPER
// ============================================================================

export type EmailTemplateType = 'invite' | 'confirmation';

/**
 * Render email HTML from stored template type and params
 */
export function renderEmailFromParams(
    templateType: EmailTemplateType,
    params: Record<string, string>
): string | null {
    switch (templateType) {
        case 'invite':
            return renderInviteEmailHtml(params as unknown as InviteEmailParams);
        case 'confirmation':
            return renderConfirmationEmailHtml(params as unknown as ConfirmationEmailParams);
        default:
            return null;
    }
}
