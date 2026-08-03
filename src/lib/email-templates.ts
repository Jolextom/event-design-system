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
// KINI AI — SUMMIT CONFIRMATION EMAIL
// A dedicated, non-generic template for Kini AI's own events (selected via
// events.confirmation_template — see renderConfirmationEmailHtmlForTemplate
// below) instead of the shared EventFlow-style card every other tenant gets.
// ============================================================================

export function renderKiniSummitConfirmationEmailHtml({
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
}: ConfirmationEmailParams): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; background-color:#f2f2f2; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
<table role="presentation" style="width:100%; border-collapse:collapse;">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table role="presentation" style="width:100%; max-width:560px; border-collapse:collapse;">

        <tr>
          <td style="padding-bottom:24px; text-align:center;">
            <span style="font-family:Georgia, 'Times New Roman', serif; font-weight:700; font-size:20px; letter-spacing:1px; color:#2b3a36;">KINI&nbsp;&middot;&nbsp;AI</span>
          </td>
        </tr>

        <tr>
          <td style="background:#ffffff; border-radius:20px; overflow:hidden; border:1px solid #ececeb; box-shadow:0 10px 30px rgba(0,0,0,0.06);">

            <table role="presentation" style="width:100%; border-collapse:collapse;">
              <tr>
                <td style="height:6px; background:linear-gradient(to right,#007cba,#7a2b2b);"></td>
              </tr>
            </table>

            <table role="presentation" style="width:100%; border-collapse:collapse;">
              <tr>
                <td style="padding:40px 36px 8px;">
                  <div style="display:inline-block; background:#eaf5fb; color:#007cba; padding:6px 14px; border-radius:100px; font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:1.5px; margin-bottom:20px;">
                    Registration Confirmed
                  </div>
                  <h1 style="margin:0 0 8px; font-size:26px; line-height:1.25; font-weight:800; color:#181818;">
                    You're in, ${attendeeName}.
                  </h1>
                  <p style="margin:0 0 28px; font-size:15px; line-height:1.7; color:#333333;">
                    Your spot at <strong style="color:#181818;">${eventTitle}</strong> is confirmed. See you there.
                  </p>

                  <table role="presentation" style="width:100%; border-collapse:collapse; background:#f8f8f7; border-radius:16px; margin-bottom:24px;">
                    <tr>
                      <td style="padding:20px 22px;">
                        <table role="presentation" style="width:100%; border-collapse:collapse; font-size:14px; color:#181818;">
                          <tr>
                            <td style="padding:5px 0; width:80px; font-weight:800; color:#8a8a88; vertical-align:top;">DATE</td>
                            <td style="padding:5px 0; font-weight:700;">${eventDate}</td>
                          </tr>
                          <tr>
                            <td style="padding:5px 0; font-weight:800; color:#8a8a88; vertical-align:top;">VENUE</td>
                            <td style="padding:5px 0; font-weight:700;">${eventLocation}</td>
                          </tr>
                          <tr>
                            <td style="padding:5px 0; font-weight:800; color:#8a8a88; vertical-align:top;">REF</td>
                            <td style="padding:5px 0; font-weight:700; font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size:12px;">${orderRef}</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  ${watchLink ? `
                  <table role="presentation" style="width:100%; border-collapse:collapse; margin-bottom:24px;">
                    <tr>
                      <td align="center">
                        <a href="${watchLink}" style="display:inline-block; background:#007cba; color:#ffffff; text-decoration:none; font-size:15px; font-weight:800; padding:16px 40px; border-radius:14px;">
                          Join Digital Venue &rarr;
                        </a>
                      </td>
                    </tr>
                  </table>
                  ` : ''}

                  ${classNotesHtml ? `
                  <div style="background:#f8f8f7; border-radius:16px; padding:20px 22px; margin-bottom:24px;">
                    <div style="font-size:11px; font-weight:800; color:#007cba; text-transform:uppercase; letter-spacing:1.5px; margin-bottom:12px;">Session Schedule</div>
                    <div style="font-size:13px; color:#333333;">${classNotesHtml}</div>
                  </div>
                  ` : ''}

                  <table role="presentation" style="width:100%; border-collapse:collapse; margin-bottom:8px;">
                    <tr>
                      <td align="center">
                        <a href="${receiptLink}" style="font-size:13px; font-weight:700; color:#007cba; text-decoration:none;">
                          View Full Receipt &rarr;
                        </a>
                      </td>
                    </tr>
                  </table>

                  ${(googleCalendarLink || outlookCalendarLink) ? `
                  <table role="presentation" style="width:100%; border-collapse:collapse; margin-top:24px; padding-top:24px; border-top:1px solid #ececeb;">
                    <tr>
                      <td align="center">
                        <p style="margin:0 0 12px; font-size:11px; font-weight:800; color:#8a8a88; text-transform:uppercase; letter-spacing:1.5px;">Add to Calendar</p>
                        ${googleCalendarLink ? `<a href="${googleCalendarLink}" style="font-size:12px; color:#007cba; text-decoration:none; font-weight:800; padding:10px 18px; background:#eaf5fb; border-radius:12px; margin:0 4px;">Google</a>` : ''}
                        ${outlookCalendarLink ? `<a href="${outlookCalendarLink}" style="font-size:12px; color:#007cba; text-decoration:none; font-weight:800; padding:10px 18px; background:#eaf5fb; border-radius:12px; margin:0 4px;">Outlook</a>` : ''}
                      </td>
                    </tr>
                  </table>
                  ` : ''}
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding-top:24px; text-align:center;">
            <p style="margin:0; font-size:12px; color:#9a9a98;">
              Kini AI &middot; <a href="https://www.kini-ai.com" style="color:#9a9a98;">www.kini-ai.com</a>
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

/**
 * Picks the confirmation email design for a given event. `null`/unknown
 * falls back to the shared EventFlow-style template every other tenant
 * gets — only events with an explicit override (events.confirmation_template)
 * get a custom design.
 */
export function renderConfirmationEmailHtmlForTemplate(
    templateKey: string | null | undefined,
    params: ConfirmationEmailParams
): string {
    switch (templateKey) {
        case 'kini_summit':
            return renderKiniSummitConfirmationEmailHtml(params);
        default:
            return renderConfirmationEmailHtml(params);
    }
}

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
