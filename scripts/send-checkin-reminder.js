/**
 * Sends the pre-event check-in reminder (QR code + check-in ref) directly,
 * with no server, no deployment, no public endpoint. Zero dependencies —
 * uses Node's built-in fetch against Supabase's REST API and Resend's API
 * directly, so npm install is not required to run this.
 *
 * Reads credentials from environment variables you set before running it
 * (never hardcode real keys into this file — it may get committed):
 *
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   RESEND_API_KEY
 *
 * Usage:
 *   node scripts/send-checkin-reminder.js <event-tag> --only you@example.com
 *       Sends to exactly one real attendee, their own real data, their own
 *       real address. Safe to use as the test — it's just one email.
 *
 *   node scripts/send-checkin-reminder.js <event-tag> --all [--limit 50]
 *       Sends to every registered attendee who hasn't already gotten one.
 *       Tracked in the existing email_deliveries table (email_type
 *       "checkin_reminder") — no new column needed — so re-running this
 *       later, e.g. daily, only reaches NEW registrants and never re-sends
 *       to anyone already covered. Capped to 50 per run by default
 *       (Resend's free-plan daily cap); pass --limit to change it.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_KEY = process.env.RESEND_API_KEY;

const tag = process.argv[2];
const flag = process.argv[3];
const flagValue = process.argv[4];
const limitFlagIndex = process.argv.indexOf("--limit");
const batchLimit = limitFlagIndex !== -1 && process.argv[limitFlagIndex + 1] ? parseInt(process.argv[limitFlagIndex + 1], 10) : 50;
const EMAIL_TYPE = "checkin_reminder";

if (!SUPABASE_URL || !SERVICE_KEY || !RESEND_KEY) {
    console.error("Missing one of: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY (set as environment variables before running).");
    process.exit(1);
}
if (!tag || (flag !== "--only" && flag !== "--all")) {
    console.error("Usage: node scripts/send-checkin-reminder.js <event-tag> --only you@example.com");
    console.error("   or: node scripts/send-checkin-reminder.js <event-tag> --all");
    process.exit(1);
}
if (flag === "--only" && !flagValue) {
    console.error("Usage: --only requires an email address, e.g. --only you@example.com");
    process.exit(1);
}

async function sb(path) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
        headers: {
            apikey: SERVICE_KEY,
            Authorization: `Bearer ${SERVICE_KEY}`,
        },
    });
    if (!res.ok) throw new Error(`Supabase ${path} -> ${res.status}: ${await res.text()}`);
    return res.json();
}

async function sbUpdate(path, body) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
        method: "PATCH",
        headers: {
            apikey: SERVICE_KEY,
            Authorization: `Bearer ${SERVICE_KEY}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
        },
        body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Supabase update ${path} -> ${res.status}: ${await res.text()}`);
}

async function sbInsert(path, body) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
        method: "POST",
        headers: {
            apikey: SERVICE_KEY,
            Authorization: `Bearer ${SERVICE_KEY}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
        },
        body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Supabase insert ${path} -> ${res.status}: ${await res.text()}`);
}

function buildQrCodeUrl(data, size = 240) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;
}

// Same AAES palette as the in-app template (src/lib/email-templates.ts ->
// renderKiniSummitReminderEmailHtml) — duplicated here since this script
// intentionally has no dependency on the TypeScript build.
function renderReminderHtml({ eventTitle, eventDate, eventLocation, attendeeName, checkInRef, qrCodeUrl }) {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#1255fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
<table role="presentation" style="width:100%;border-collapse:collapse;"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" style="width:100%;max-width:520px;border-collapse:collapse;">
<tr><td style="padding-bottom:24px;text-align:center;"><span style="font-weight:800;font-size:15px;letter-spacing:2px;color:#ffffff;text-transform:uppercase;">AAES &middot; AI for Africa&#39;s Education Summit</span></td></tr>
<tr><td style="background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid rgba(209,254,251,0.6);">
<table role="presentation" style="width:100%;border-collapse:collapse;"><tr><td style="height:6px;background:#1255fb;"></td></tr></table>
<table role="presentation" style="width:100%;border-collapse:collapse;"><tr><td style="padding:36px 32px 8px;">
<div style="display:inline-block;background:#d1fefb;color:#000000;padding:6px 14px;border-radius:100px;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:20px;">Almost here</div>
<h1 style="margin:0 0 8px;font-size:24px;line-height:1.3;font-weight:800;color:#01123c;">See you soon, ${attendeeName}.</h1>
<p style="margin:0 0 28px;font-size:15px;line-height:1.7;color:#01123c;"><strong>${eventTitle}</strong> is coming up. Your check-in code is below &mdash; show it at the entrance, no printing needed.</p>
<table role="presentation" style="width:100%;border-collapse:collapse;background:#1255fb;border-radius:16px;margin-bottom:24px;"><tr><td align="center" style="padding:28px 22px;">
<table role="presentation" style="background:#ffffff;border-radius:14px;padding:14px;"><tr><td><img src="${qrCodeUrl}" width="200" height="200" alt="Your check-in QR code" style="display:block;width:200px;height:200px;"></td></tr></table>
<p style="margin:16px 0 0;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:13px;letter-spacing:0.5px;color:#ffffff;">${checkInRef}</p>
</td></tr></table>
<table role="presentation" style="width:100%;border-collapse:collapse;background:#fffae3;border-radius:16px;margin-bottom:8px;"><tr><td style="padding:20px 22px;">
<table role="presentation" style="width:100%;border-collapse:collapse;font-size:14px;color:#01123c;">
<tr><td style="padding:5px 0;width:80px;font-weight:800;color:#01123c; opacity:0.6;vertical-align:top;">DATE</td><td style="padding:5px 0;font-weight:700;">${eventDate}</td></tr>
<tr><td style="padding:5px 0;font-weight:800;color:#01123c; opacity:0.6;vertical-align:top;">VENUE</td><td style="padding:5px 0;font-weight:700;">${eventLocation}</td></tr>
</table></td></tr></table>
</td></tr></table></td></tr>
<tr><td style="padding-top:24px;text-align:center;"><p style="margin:0;font-size:12px;color:#ffffff;">Kini AI &middot; <a href="https://www.kini-ai.com" style="color:#ffffff;">www.kini-ai.com</a></p></td></tr>
</table></td></tr></table></body></html>`;
}

async function sendEmail({ to, from, subject, html }) {
    const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${RESEND_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ from, to: [to], subject, html }),
    });
    const body = await res.json();
    if (!res.ok) return { success: false, error: body };
    return { success: true, data: body };
}

async function main() {
    const events = await sb(`events?tag=eq.${encodeURIComponent(tag)}&select=id,event_title,start_date,location,created_by`);
    const event = events[0];
    if (!event) {
        console.error(`No event found with tag "${tag}"`);
        process.exit(1);
    }

    let attendees;
    if (flag === "--only") {
        // Deliberately NOT filtering out attendees with no ref here — if this
        // real person exists but has no check-in ref (e.g. added before the
        // QR feature existed), that's worth fixing, not treating as "not found".
        attendees = await sb(`attendees?event_id=eq.${event.id}&email=eq.${encodeURIComponent(flagValue)}&select=id,email,first_name,ref&order=created_at.asc`);
        if (attendees.length === 0) {
            console.log(`No registered attendee found with email "${flagValue}".`);
            return;
        }
        if (!attendees[0].ref) {
            const newRef = `EF-${tag.toUpperCase().replace(/[^A-Z0-9]/g, "")}-${crypto.randomUUID().replace(/-/g, "").substring(0, 8).toUpperCase()}`;
            await sbUpdate(`attendees?id=eq.${attendees[0].id}`, { ref: newRef });
            attendees[0].ref = newRef;
            console.log(`${flagValue} had no check-in ref — generated and saved ${newRef}.`);
        }
    } else {
        // --all: backfill any missing refs first, then skip whoever already
        // has a "sent" checkin_reminder delivery record, then cap to batchLimit.
        const all = await sb(`attendees?event_id=eq.${event.id}&select=id,email,first_name,ref&order=created_at.asc`);
        for (const att of all) {
            if (!att.ref) {
                const newRef = `EF-${tag.toUpperCase().replace(/[^A-Z0-9]/g, "")}-${crypto.randomUUID().replace(/-/g, "").substring(0, 8).toUpperCase()}`;
                await sbUpdate(`attendees?id=eq.${att.id}`, { ref: newRef });
                att.ref = newRef;
            }
        }

        const alreadySent = await sb(`email_deliveries?event_id=eq.${event.id}&email_type=eq.${EMAIL_TYPE}&status=eq.sent&select=attendee_id`);
        const sentIds = new Set(alreadySent.map((d) => d.attendee_id));

        const eligible = all.filter((att) => att.ref && !sentIds.has(att.id));
        attendees = eligible.slice(0, batchLimit);

        console.log(`${all.length} total attendees. ${sentIds.size} already sent. ${eligible.length} eligible. Sending up to ${batchLimit} this run.\n`);

        if (attendees.length === 0) {
            console.log(sentIds.size > 0 ? "Nothing to send — everyone eligible has already received it." : "No attendees with a check-in ref found.");
            return;
        }
    }

    let senderFrom = null;
    const senders = await sb(`sender_identities?user_id=eq.${event.created_by}&status=eq.verified&select=from_name,from_email&order=created_at.desc&limit=1`);
    if (senders.length > 0) {
        senderFrom = `${senders[0].from_name} <${senders[0].from_email}>`;
    }

    const eventDateStr = event.start_date
        ? new Date(event.start_date).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
        : "TBA";
    const eventLocation = event.location || "TBA";

    let sentCount = 0;
    for (const att of attendees) {
        const html = renderReminderHtml({
            eventTitle: event.event_title,
            eventDate: eventDateStr,
            eventLocation,
            attendeeName: att.first_name || "there",
            checkInRef: att.ref,
            qrCodeUrl: buildQrCodeUrl(att.ref),
        });

        const result = await sendEmail({
            to: att.email,
            from: senderFrom || "EventFlow <noreply@partiesandeventz.com>",
            subject: `Your check-in code for ${event.event_title}`,
            html,
        });

        if (result.success) {
            sentCount += 1;
            console.log(`Sent to ${att.email} (ref ${att.ref})`);
            try {
                await sbInsert("email_deliveries", {
                    attendee_id: att.id,
                    event_id: event.id,
                    email_type: EMAIL_TYPE,
                    status: "sent",
                    resend_id: (result.data && result.data.id) || null,
                });
            } catch (err) {
                console.error(`  (sent OK, but failed to record delivery for ${att.email} — a future run might re-send to them):`, err.message);
            }
        } else {
            console.error(`FAILED for ${att.email}:`, JSON.stringify(result.error));
        }
    }

    console.log(`\nDone. ${sentCount}/${attendees.length} sent.`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
