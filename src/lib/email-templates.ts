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
    googleCalendarLink?: string;
    outlookCalendarLink?: string;
    eventImage?: string;
    /** Sender brand shown in the header badge and footer. Defaults to the platform brand. */
    brandName?: string;
}

export function renderInviteEmailHtml({
    eventTitle,
    eventDate,
    eventLocation,
    inviterName,
    passType,
    inviteLink,
    googleCalendarLink,
    outlookCalendarLink,
    eventImage,
    brandName = 'EventFlow'
}: InviteEmailParams): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f6f9fc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="width: 100%; max-width: 540px; border-collapse: collapse;">
                    <tr>
                        <td style="text-align: center; padding-bottom: 24px;">
                            <div style="display: inline-flex; align-items: center; gap: 8px;">
                                <div style="width: 32px; height: 32px; background: #eef2ff; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 900; color: #4f46e5;">${brandName.charAt(0).toUpperCase()}</div>
                                <span style="font-weight: 900; font-size: 16px; letter-spacing: -0.5px; color: #111827;">${brandName}</span>
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td style="background: white; border-radius: 32px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.04); border: 1px solid #f1f5f9;">
                            ${eventImage ? `
                            <div style="width: 100%; height: 200px; overflow: hidden; position: relative;">
                                <img src="${eventImage}" alt="${eventTitle}" style="width: 100%; height: 100%; object-fit: cover; display: block;">
                                <div style="position: absolute; bottom: 0; left: 0; right: 0; height: 60px; background: linear-gradient(to top, rgba(0,0,0,0.4), transparent);"></div>
                            </div>
                            ` : `
                            <div style="height: 8px; background: linear-gradient(to right, #3b82f6, #8b5cf6);"></div>
                            `}
                            <div style="padding: 48px 40px;">
                                <div style="text-align: center; margin-bottom: 24px;">
                                    <div style="display: inline-block; background: #eff6ff; color: #3b82f6; padding: 8px 16px; border-radius: 100px; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px;">
                                        GUEST INVITATION
                                    </div>
                                </div>
                                <h1 style="margin: 0 0 12px; font-size: 32px; font-weight: 900; text-align: center; color: #111827; letter-spacing: -1.5px; line-height: 1.1;">
                                    You&apos;re <span style="color: #3b82f6;">Invited!</span>
                                </h1>
                                <p style="margin: 0 0 40px; font-size: 15px; color: #64748b; text-align: center; font-weight: 500;">
                                    <strong style="color: #111827;">${inviterName}</strong> thinks you&apos;d love this: <br/> 
                                    <strong style="color: #111827; font-size: 18px;">${eventTitle}</strong>
                                </p>
                                <div style="margin-bottom: 40px; text-align: center;">
                                    <a href="${inviteLink}" style="display: block; background: #111827; color: white; padding: 20px 32px; border-radius: 18px; text-decoration: none; font-weight: 800; font-size: 15px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                                        Claim Your Ticket →
                                    </a>
                                    <p style="margin-top: 12px; font-size: 11px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                                        Pass Type: <span style="color: #3b82f6;">${passType}</span>
                                    </p>
                                </div>
                                <div style="background: #f8fafc; border: 1px solid #f1f5f9; border-radius: 24px; padding: 28px;">
                                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                        <tr>
                                            <td style="padding-bottom: 20px;">
                                                <div style="font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 4px;">Date</div>
                                                <div style="font-size: 15px; font-weight: 800; color: #1e293b;">${eventDate}</div>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td>
                                                <div style="font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 4px;">Venue</div>
                                                <div style="font-size: 15px; font-weight: 800; color: #1e293b;">${eventLocation}</div>
                                            </td>
                                        </tr>
                                    </table>
                                </div>
                                ${(googleCalendarLink || outlookCalendarLink) ? `
                                <div style="margin-top: 40px; padding-top: 32px; border-top: 1px solid #f1f5f9; text-align: center;">
                                    <p style="font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 16px;">Add to Calendar</p>
                                    <div style="display: inline-flex; gap: 12px;">
                                        ${googleCalendarLink ? `<a href="${googleCalendarLink}" style="font-size: 11px; color: #3b82f6; text-decoration: none; font-weight: 800; padding: 10px 20px; background: #eff6ff; border-radius: 14px;">Google</a>` : ''}
                                        ${outlookCalendarLink ? `<a href="${outlookCalendarLink}" style="font-size: 11px; color: #3b82f6; text-decoration: none; font-weight: 800; padding: 10px 20px; background: #eff6ff; border-radius: 14px;">Outlook</a>` : ''}
                                    </div>
                                </div>
                                ` : ''}
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding-top: 32px; text-align: center;">
                            <p style="margin: 0; font-size: 12px; color: #94a3b8; font-weight: 500;">
                                Sent via <strong style="color: #64748b;">${brandName}</strong>
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
    watchLink?: string;
    attendeeName: string;
    classNotesHtml?: string;
    googleCalendarLink?: string;
    outlookCalendarLink?: string;
    eventImage?: string;
    /** Sender brand shown in the header badge and footer. Defaults to the platform brand. */
    brandName?: string;
}

export function renderConfirmationEmailHtml({
    eventTitle,
    eventDate,
    eventLocation,
    orderRef,
    receiptLink,
    watchLink,
    attendeeName,
    classNotesHtml,
    googleCalendarLink,
    outlookCalendarLink,
    eventImage,
    brandName = 'EventFlow'
}: ConfirmationEmailParams): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f6f9fc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="width: 100%; max-width: 540px; border-collapse: collapse;">
                    <tr>
                        <td style="text-align: center; padding-bottom: 24px;">
                            <div style="display: inline-flex; align-items: center; gap: 8px;">
                                <div style="width: 32px; height: 32px; background: #eef2ff; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 900; color: #4f46e5;">${brandName.charAt(0).toUpperCase()}</div>
                                <span style="font-weight: 900; font-size: 16px; letter-spacing: -0.5px; color: #111827;">${brandName}</span>
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td style="background: white; border-radius: 32px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.04); border: 1px solid #f1f5f9;">
                            ${eventImage ? `
                            <div style="width: 100%; height: 200px; overflow: hidden; position: relative;">
                                <img src="${eventImage}" alt="${eventTitle}" style="width: 100%; height: 100%; object-fit: cover; display: block;">
                                <div style="position: absolute; bottom: 0; left: 0; right: 0; height: 60px; background: linear-gradient(to top, rgba(0,0,0,0.4), transparent);"></div>
                            </div>
                            ` : `
                            <div style="height: 8px; background: linear-gradient(to right, #3b82f6, #8b5cf6);"></div>
                            `}
                            <div style="padding: 48px 40px;">
                                <div style="text-align: center; margin-bottom: 24px;">
                                    <div style="width: 48px; height: 48px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
                                        <span style="font-size: 20px; color: #16a34a;">✓</span>
                                    </div>
                                </div>
                                <h1 style="margin: 0 0 8px; font-size: 32px; font-weight: 900; text-align: center; color: #111827; letter-spacing: -1.5px; line-height: 1.1;">
                                    Registration <br/> <span style="color: #3b82f6;">Confirmed</span>
                                </h1>
                                <p style="margin: 0 0 40px; font-size: 15px; color: #64748b; text-align: center; font-weight: 500;">
                                    Hi ${attendeeName}, get ready for <br/> <strong style="color: #111827;">${eventTitle}</strong>
                                </p>
                                ${watchLink ? `
                                <div style="margin-bottom: 32px;">
                                    <a href="${watchLink}" style="display: block; background: #111827; color: white; padding: 20px 32px; border-radius: 18px; text-decoration: none; font-weight: 800; font-size: 15px; text-align: center; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                                        Join Digital Venue →
                                    </a>
                                    <p style="margin-top: 12px; font-size: 11px; color: #94a3b8; text-align: center; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                                        This link is your permanent gateway
                                    </p>
                                </div>
                                ` : ''}
                                <div style="background: #f8fafc; border: 1px solid #f1f5f9; border-radius: 24px; padding: 28px; margin-bottom: 32px;">
                                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                        <tr>
                                            <td style="padding-bottom: 20px;">
                                                <div style="font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 4px;">Date</div>
                                                <div style="font-size: 15px; font-weight: 800; color: #1e293b;">${eventDate}</div>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style="padding-bottom: 20px;">
                                                <div style="font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 4px;">Venue</div>
                                                <div style="font-size: 15px; font-weight: 800; color: #1e293b;">${eventLocation}</div>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td>
                                                <div style="font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 4px;">Ref Number</div>
                                                <div style="font-size: 13px; font-weight: 700; color: #64748b; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;">${orderRef}</div>
                                            </td>
                                        </tr>
                                    </table>
                                </div>
                                ${classNotesHtml ? `
                                <div style="background: #f0fdfa; border: 1px solid #ccfbf1; border-radius: 20px; padding: 24px; margin-bottom: 32px;">
                                    <div style="font-size: 10px; font-weight: 800; color: #0d9488; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 12px;">📅 Session Schedule</div>
                                    <div style="font-size: 13px; color: #134e4a;">
                                        ${classNotesHtml}
                                    </div>
                                </div>
                                ` : ''}
                                <div style="text-align: center;">
                                    <a href="${receiptLink}" style="font-size: 13px; font-weight: 700; color: #64748b; text-decoration: none; display: inline-flex; align-items: center; gap: 4px;">
                                        View Full Receipt & Wallet →
                                    </a>
                                </div>
                                ${(googleCalendarLink || outlookCalendarLink) ? `
                                <div style="margin-top: 40px; padding-top: 32px; border-top: 1px solid #f1f5f9; text-align: center;">
                                    <p style="font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 16px;">Add to Calendar</p>
                                    <div style="display: inline-flex; gap: 12px;">
                                        ${googleCalendarLink ? `<a href="${googleCalendarLink}" style="font-size: 11px; color: #3b82f6; text-decoration: none; font-weight: 800; padding: 10px 20px; background: #eff6ff; border-radius: 14px;">Google</a>` : ''}
                                        ${outlookCalendarLink ? `<a href="${outlookCalendarLink}" style="font-size: 11px; color: #3b82f6; text-decoration: none; font-weight: 800; padding: 10px 20px; background: #eff6ff; border-radius: 14px;">Outlook</a>` : ''}
                                    </div>
                                </div>
                                ` : ''}
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding-top: 32px; text-align: center;">
                            <p style="margin: 0; font-size: 12px; color: #94a3b8; font-weight: 500;">
                                Powered by <strong style="color: #64748b;">${brandName}</strong>
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
// BROADCAST EMAIL
// ============================================================================

export interface BroadcastEmailParams {
    eventTitle: string;
    messageTitle: string;
    messageBody: string;
    eventImage?: string;
    actionLink?: string;
    actionText?: string;
    /** Sender brand shown in the header badge. Defaults to the platform brand. */
    brandName?: string;
}

export function renderBroadcastEmailHtml({
    eventTitle,
    messageTitle,
    messageBody,
    eventImage,
    actionLink,
    actionText,
    brandName = 'EventFlow'
}: BroadcastEmailParams): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f6f9fc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="width: 100%; max-width: 540px; border-collapse: collapse;">
                    <tr>
                        <td style="text-align: center; padding-bottom: 24px;">
                            <div style="display: inline-flex; align-items: center; gap: 8px;">
                                <div style="width: 32px; height: 32px; background: #eef2ff; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 900; color: #4f46e5;">${brandName.charAt(0).toUpperCase()}</div>
                                <span style="font-weight: 900; font-size: 16px; letter-spacing: -0.5px; color: #111827;">${brandName}</span>
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td style="background: white; border-radius: 32px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.04); border: 1px solid #f1f5f9;">
                            ${eventImage ? `
                            <div style="width: 100%; height: 200px; overflow: hidden; position: relative;">
                                <img src="${eventImage}" alt="${eventTitle}" style="width: 100%; height: 100%; object-fit: cover; display: block;">
                                <div style="position: absolute; bottom: 0; left: 0; right: 0; height: 60px; background: linear-gradient(to top, rgba(0,0,0,0.4), transparent);"></div>
                            </div>
                            ` : `
                            <div style="height: 8px; background: linear-gradient(to right, #ef4444, #f59e0b);"></div>
                            `}
                            <div style="padding: 48px 40px;">
                                <div style="text-align: center; margin-bottom: 24px;">
                                    <div style="display: inline-block; background: #fef2f2; color: #ef4444; padding: 8px 16px; border-radius: 100px; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px;">
                                        EVENT UPDATE
                                    </div>
                                </div>
                                <h1 style="margin: 0 0 16px; font-size: 28px; font-weight: 900; text-align: center; color: #111827; letter-spacing: -1.2px; line-height: 1.2;">
                                    ${messageTitle}
                                </h1>
                                <div style="font-size: 16px; line-height: 1.6; color: #475569; margin-bottom: 40px; text-align: left;">
                                    ${messageBody.replace(/\n/g, '<br/>')}
                                </div>
                                ${actionLink ? `
                                <div style="margin-bottom: 40px; text-align: center;">
                                    <a href="${actionLink}" style="display: block; background: #111827; color: white; padding: 20px 32px; border-radius: 18px; text-decoration: none; font-weight: 800; font-size: 15px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                                        ${actionText || 'View Details'} →
                                    </a>
                                </div>
                                ` : ''}
                                <div style="background: #f8fafc; border: 1px solid #f1f5f9; border-radius: 24px; padding: 28px; text-align: center;">
                                    <p style="margin: 0; font-size: 12px; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 4px;">Regarding</p>
                                    <p style="margin: 0; font-size: 16px; font-weight: 800; color: #1e293b;">${eventTitle}</p>
                                </div>
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding-top: 32px; text-align: center;">
                            <p style="margin: 0; font-size: 12px; color: #94a3b8; font-weight: 500;">
                                You received this because you&apos;re registered for this event.
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
// HELPERS
// ============================================================================

export type EmailTemplateType = 'invite' | 'confirmation' | 'broadcast';

export function renderEmailFromParams(
    templateType: EmailTemplateType,
    params: any
): string | null {
    switch (templateType) {
        case 'invite':
            return renderInviteEmailHtml(params);
        case 'confirmation':
            return renderConfirmationEmailHtml(params);
        case 'broadcast':
            return renderBroadcastEmailHtml(params);
        default:
            return null;
    }
}
