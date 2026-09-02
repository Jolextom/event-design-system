import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/apiV1";
import { sendReminderEmail, buildQrCodeUrl } from "@/lib/email";
import { resolveSenderForUser } from "@/lib/senderDomains";
import { generateGoogleCalendarLink, generateOutlookLink } from "@/lib/calendar";

/**
 * Sends the pre-event check-in reminder (QR code + check-in ref) for one
 * named event. Deliberately separate from the confirmation email, which is
 * untouched — this is a one-time send, a few days before an event, to
 * everyone already registered.
 *
 * Requires a shared secret (below) because — unlike the sheet-sync backfill,
 * which can at worst duplicate a row — this sends real email. An open
 * endpoint here means anyone with the URL could spam every attendee.
 *
 * Four modes, and a bare hit does nothing:
 *
 *   Test send (safe — uses whichever attendee registered first, sent to an
 *   address of your choosing instead of theirs. Good for checking the
 *   design, but the data inside it belongs to a real, unrelated attendee):
 *     GET /api/admin/send-checkin-reminder?tag=<event-tag>&secret=<SECRET>&testEmail=you@example.com
 *
 *   Preview ONE named attendee's own real data, delivered to a different
 *   address instead of theirs (safe — nothing reaches the real attendee):
 *     GET /api/admin/send-checkin-reminder?tag=<event-tag>&secret=<SECRET>&onlyEmail=someone@example.com&testEmail=you@example.com
 *
 *   One real attendee, their own real email — an actual send (e.g.
 *   re-sending to someone who says they didn't get it):
 *     GET /api/admin/send-checkin-reminder?tag=<event-tag>&secret=<SECRET>&onlyEmail=someone@example.com&confirm=yes
 *
 *   Real send to everyone (only run after a test looks right):
 *     GET /api/admin/send-checkin-reminder?tag=<event-tag>&secret=<SECRET>&confirm=yes
 */
const SECRET = process.env.CHECKIN_REMINDER_SECRET;

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get("secret");
    const tag = searchParams.get("tag");
    const testEmail = searchParams.get("testEmail");
    const onlyEmail = searchParams.get("onlyEmail");
    const confirm = searchParams.get("confirm") === "yes";

    if (!SECRET || secret !== SECRET) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!tag) {
        return NextResponse.json({ error: "?tag=<event-tag> is required" }, { status: 400 });
    }
    // onlyEmail alone (no testEmail) is a real send to that real person —
    // require the explicit flag. onlyEmail + testEmail together is a safe
    // preview (their data, delivered to you instead), so it doesn't need it.
    if (onlyEmail && !testEmail && !confirm) {
        return NextResponse.json({
            error: "onlyEmail without testEmail sends a real email to that real attendee — pass &confirm=yes too, to make that explicit. Or add &testEmail=you@example.com to preview it safely instead."
        }, { status: 400 });
    }
    if (!testEmail && !onlyEmail && !confirm) {
        return NextResponse.json({
            error: "Nothing sent. Pass &testEmail=you@example.com for a safe test send, &onlyEmail=<address>&testEmail=<address> to safely preview one specific attendee's data, &onlyEmail=<address>&confirm=yes for a real send to one attendee, or &confirm=yes to email every registered attendee for real."
        }, { status: 400 });
    }

    const supabase = adminClient();

    const { data: event, error: eventErr } = await supabase
        .from("events")
        .select("id, tag, event_title, start_date, start_time, location, created_by")
        .eq("tag", tag)
        .single();
    if (eventErr || !event) {
        return NextResponse.json({ error: `No event found with tag "${tag}"` }, { status: 404 });
    }

    let attendeesQuery = supabase
        .from("attendees")
        .select("id, email, first_name, ref")
        .eq("event_id", event.id)
        .not("ref", "is", null)
        .order("created_at", { ascending: true });

    // Plain test mode (no onlyEmail) just needs any one real attendee's data.
    if (testEmail && !onlyEmail) attendeesQuery = attendeesQuery.limit(1);
    // onlyEmail scopes to exactly that attendee. Combined with testEmail this
    // is a safe preview (their data, delivered elsewhere); alone it's a real
    // send to their own address.
    if (onlyEmail) attendeesQuery = attendeesQuery.eq("email", onlyEmail);

    const { data: attendees, error: attErr } = await attendeesQuery;
    if (attErr) {
        return NextResponse.json({ error: attErr.message }, { status: 500 });
    }
    if (!attendees || attendees.length === 0) {
        return NextResponse.json({
            sent: 0,
            message: onlyEmail
                ? `No registered attendee found with email "${onlyEmail}" for this event.`
                : "No attendees with a check-in ref found for this event.",
        });
    }

    const eventDateStr = event.start_date
        ? new Date(event.start_date).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
        : "TBA";
    const eventLocation = event.location || "TBA";

    const startDateTime = event.start_date && event.start_time
        ? `${event.start_date}T${event.start_time}:00`
        : event.start_date;
    const googleCalendarLink = startDateTime ? generateGoogleCalendarLink({
        title: event.event_title, location: eventLocation, startDate: startDateTime, description: "AAES check-in reminder",
    }) : undefined;
    const outlookCalendarLink = startDateTime ? generateOutlookLink({
        title: event.event_title, location: eventLocation, startDate: startDateTime, description: "AAES check-in reminder",
    }) : undefined;

    const sender = await resolveSenderForUser(event.created_by);

    let sent = 0;
    const failures: { email: string; error: string }[] = [];

    for (const att of attendees) {
        const result = await sendReminderEmail({
            to: testEmail || att.email,
            from: sender?.from,
            replyTo: sender?.replyTo,
            resendApiKey: sender?.resendApiKey,
            eventTitle: event.event_title,
            eventDate: eventDateStr,
            eventLocation,
            attendeeName: att.first_name || "there",
            checkInRef: att.ref,
            qrCodeUrl: buildQrCodeUrl(att.ref),
            googleCalendarLink,
            outlookCalendarLink,
        });

        if (result.success) {
            sent += 1;
        } else {
            failures.push({ email: testEmail || att.email, error: JSON.stringify(result.error) });
        }
    }

    let mode: string;
    let note: string | undefined;
    if (testEmail && onlyEmail) {
        mode = "preview";
        note = `Preview of ${onlyEmail}'s own reminder, delivered to ${testEmail} instead — nothing was sent to ${onlyEmail}.`;
    } else if (testEmail) {
        mode = "test";
        note = `Test email sent to ${testEmail}, using real data from attendee ${attendees[0].email} (whoever registered first) — this is a design preview, not that attendee's real reminder.`;
    } else if (onlyEmail) {
        mode = "single-real";
    } else {
        mode = "real";
    }

    return NextResponse.json({
        mode,
        event: event.event_title,
        sent,
        failed: failures.length,
        failures: failures.length > 0 ? failures : undefined,
        ...(note ? { note } : {}),
    });
}
