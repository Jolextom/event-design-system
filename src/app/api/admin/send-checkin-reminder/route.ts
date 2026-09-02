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
 *   Test send (safe — if testEmail is itself a registered attendee, shows
 *   THEIR own real reminder content, delivered here instead of anywhere
 *   else being touched. If it isn't registered, falls back to whoever
 *   registered first, purely so there's realistic sample data to render):
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
 *   Real send to everyone who hasn't already gotten one (only run after a
 *   test looks right). Automatically skips anyone already sent — tracked in
 *   the existing email_deliveries table (email_type "checkin_reminder"), no
 *   new column needed — so re-running this later only reaches NEW
 *   registrants, never re-sends to someone already covered. Capped to 50
 *   per run by default (Resend's free-plan daily cap) — pass &limit= to
 *   change it, or re-run daily to work through a bigger backlog over a few
 *   days:
 *     GET /api/admin/send-checkin-reminder?tag=<event-tag>&secret=<SECRET>&confirm=yes
 *     GET /api/admin/send-checkin-reminder?tag=<event-tag>&secret=<SECRET>&confirm=yes&limit=30
 */
const SECRET = process.env.CHECKIN_REMINDER_SECRET;

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get("secret");
    const tag = searchParams.get("tag");
    const testEmail = searchParams.get("testEmail");
    const onlyEmail = searchParams.get("onlyEmail");
    const confirm = searchParams.get("confirm") === "yes";
    const limitParam = parseInt(searchParams.get("limit") || "50", 10);
    const batchLimit = Number.isFinite(limitParam) && limitParam > 0 ? limitParam : 50;
    const EMAIL_TYPE = "checkin_reminder";

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

    const baseAttendeesQuery = () =>
        supabase
            .from("attendees")
            .select("id, email, first_name, ref")
            .eq("event_id", event.id)
            .order("created_at", { ascending: true });

    // Whichever specific email we were given (onlyEmail, or testEmail when
    // used alone) — try to find THAT real attendee's own data first. This is
    // what makes `testEmail=someone-who-is-actually-registered@x.com` show
    // that person their own data instead of always defaulting to whoever
    // registered first, which was confusing in practice.
    //
    // Deliberately NOT filtering out attendees with no `ref` here — a real
    // attendee existing without one is a real bug worth surfacing (and
    // fixing on the spot below), not a reason to silently treat them as
    // unregistered and fall back to showing someone else's data instead.
    const lookupEmail = onlyEmail || testEmail;
    let attendees: { id: string; email: string; first_name: string | null; ref: string | null }[] = [];
    let usedFallbackAttendee = false;
    let backfilledRef = false;

    if (lookupEmail) {
        const { data, error } = await baseAttendeesQuery().eq("email", lookupEmail);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        attendees = data || [];

        // Found the real attendee, but they have no check-in ref (can happen
        // for attendees created before the ref/QR feature existed, or added
        // manually). Generate one now and save it, rather than treating a
        // real person as "not found".
        if (attendees.length > 0 && !attendees[0].ref) {
            const newRef = `EF-${event.tag.toUpperCase().replace(/[^A-Z0-9]/g, "")}-${crypto.randomUUID().replace(/-/g, "").substring(0, 8).toUpperCase()}`;
            const { error: updateErr } = await supabase
                .from("attendees")
                .update({ ref: newRef })
                .eq("id", attendees[0].id);
            if (updateErr) return NextResponse.json({ error: `Found the attendee but failed to assign a check-in ref: ${updateErr.message}` }, { status: 500 });
            attendees[0].ref = newRef;
            backfilledRef = true;
        }
    }

    // Still nothing at that address — and this is a design-only preview
    // (testEmail with no onlyEmail) — fall back to whoever registered first
    // AND has a ref already, purely to have realistic sample data to render.
    if (attendees.length === 0 && testEmail && !onlyEmail) {
        const { data, error } = await baseAttendeesQuery().not("ref", "is", null).limit(1);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        attendees = data || [];
        usedFallbackAttendee = true;
    }

    // Real send to everyone (no onlyEmail, no testEmail — confirm=yes alone).
    // Fetch the whole list, backfill any missing refs, skip whoever already
    // has a "sent" checkin_reminder delivery record for this event, then cap
    // to batchLimit so a run can't blow past Resend's daily send cap.
    let totalEligible = 0;
    let alreadySentCount = 0;
    if (!lookupEmail && confirm) {
        const { data: allAttendees, error: allErr } = await baseAttendeesQuery();
        if (allErr) return NextResponse.json({ error: allErr.message }, { status: 500 });

        for (const att of allAttendees || []) {
            if (!att.ref) {
                const newRef = `EF-${event.tag.toUpperCase().replace(/[^A-Z0-9]/g, "")}-${crypto.randomUUID().replace(/-/g, "").substring(0, 8).toUpperCase()}`;
                const { error: updateErr } = await supabase.from("attendees").update({ ref: newRef }).eq("id", att.id);
                if (!updateErr) att.ref = newRef;
            }
        }

        const { data: alreadySent, error: deliveryErr } = await supabase
            .from("email_deliveries")
            .select("attendee_id")
            .eq("event_id", event.id)
            .eq("email_type", EMAIL_TYPE)
            .eq("status", "sent");
        if (deliveryErr) return NextResponse.json({ error: deliveryErr.message }, { status: 500 });
        const sentIds = new Set((alreadySent || []).map((d) => d.attendee_id));

        const eligible = (allAttendees || []).filter((att) => att.ref && !sentIds.has(att.id));
        totalEligible = eligible.length;
        alreadySentCount = sentIds.size;
        attendees = eligible.slice(0, batchLimit);
    }

    if (attendees.length === 0) {
        return NextResponse.json({
            sent: 0,
            message: onlyEmail
                ? `No registered attendee found with email "${onlyEmail}" for this event.`
                : (!lookupEmail && confirm && alreadySentCount > 0)
                    ? `Nothing to send — all ${alreadySentCount} attendee(s) with a check-in ref have already received the reminder.`
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
            checkInRef: att.ref as string, // every entry here has one by this point — either it always did, or it was just backfilled above
            qrCodeUrl: buildQrCodeUrl(att.ref as string),
            googleCalendarLink,
            outlookCalendarLink,
        });

        if (result.success) {
            sent += 1;
            // Only record a real delivery when this actually reached the
            // attendee's own address — never for test/preview sends, since
            // those didn't really notify that person and shouldn't make
            // future bulk runs think they were covered.
            if (!testEmail) {
                await supabase.from("email_deliveries").insert({
                    attendee_id: att.id,
                    event_id: event.id,
                    email_type: EMAIL_TYPE,
                    status: "sent",
                    resend_id: (result.data as any)?.id || null,
                });
            }
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
        note = usedFallbackAttendee
            ? `${testEmail} isn't a registered attendee, so this used real data from ${attendees[0].email} (whoever registered first) instead — a design preview, not a real person's actual reminder.`
            : `Sent to ${testEmail}, using their own real registration data — this is their actual reminder content, just re-delivered here for you to check first.`;
    } else if (onlyEmail) {
        mode = "single-real";
    } else {
        mode = "real";
        const remaining = totalEligible - sent;
        note = `Sent ${sent} this run (batch limit ${batchLimit}). ${alreadySentCount} already had it from a previous run. ${remaining} still remaining — re-run this same URL to send the next batch (it will never re-send to anyone already covered).`;
    }
    if (backfilledRef) {
        note = `${note ? note + " " : ""}Note: this attendee had no check-in ref yet — one was generated and saved just now (${attendees[0].ref}), so this will work at the door going forward too.`;
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
