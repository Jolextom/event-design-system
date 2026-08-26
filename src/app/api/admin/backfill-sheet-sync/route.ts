import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/apiV1";
import { syncRegistrationsToSheet } from "@/lib/sheetsSync";

/**
 * One-off, live-triggered backfill for registrations that existed before the
 * Google Sheet sync was added (see src/lib/sheetsSync.ts). Meant to be hit
 * ONCE per event you want backfilled, straight from a browser — no local
 * script or local env vars needed, everything runs on Vercel with the
 * env vars already configured there.
 *
 *   GET /api/admin/backfill-sheet-sync?tag=<event-tag>&secret=<ADMIN_BACKFILL_SECRET>
 *
 * `tag` is required and deliberately not optional — this scopes a run to a
 * single named event so it can never accidentally sweep every event in the
 * database into the sheet.
 */
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get("secret");
    const tag = searchParams.get("tag");

    if (!process.env.ADMIN_BACKFILL_SECRET || secret !== process.env.ADMIN_BACKFILL_SECRET) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!tag) {
        return NextResponse.json({ error: "?tag=<event-tag> is required" }, { status: 400 });
    }

    const supabase = adminClient();

    const { data: event, error: eventErr } = await supabase
        .from("events")
        .select("id, tag, event_title")
        .eq("tag", tag)
        .single();
    if (eventErr || !event) {
        return NextResponse.json({ error: `No event found with tag "${tag}"` }, { status: 404 });
    }

    const { data: attendees, error: attErr } = await supabase
        .from("attendees")
        .select("id, email, email_status, first_name, last_name, ref, created_at, pass:pass_id(title)")
        .eq("event_id", event.id)
        .order("created_at", { ascending: true });
    if (attErr) {
        return NextResponse.json({ error: attErr.message }, { status: 500 });
    }
    if (!attendees || attendees.length === 0) {
        return NextResponse.json({ synced: 0, message: "No attendees found for this event." });
    }

    const answersByAttendee = new Map<string, Record<string, string>>();
    const attendeeIds = attendees.map((a) => a.id);
    for (let i = 0; i < attendeeIds.length; i += 500) {
        const idBatch = attendeeIds.slice(i, i + 500);
        const { data: answerRows } = await supabase
            .from("answers")
            .select("attendee_id, answer_text, question:question_id(title)")
            .in("attendee_id", idBatch);
        for (const row of answerRows || []) {
            const title = (row.question as any)?.title;
            if (!title) continue;
            const bucket = answersByAttendee.get(row.attendee_id) || {};
            bucket[title] = row.answer_text || "";
            answersByAttendee.set(row.attendee_id, bucket);
        }
    }

    const rows = attendees.map((att) => ({
        timestamp: att.created_at || new Date().toISOString(),
        event: event.event_title || event.tag,
        firstName: att.first_name || "",
        lastName: att.last_name || "",
        email: att.email,
        pass: (att.pass as any)?.title || "",
        status: att.email_status || "",
        ref: att.ref || "",
        answers: answersByAttendee.get(att.id) || {},
    }));

    for (let i = 0; i < rows.length; i += 100) {
        await syncRegistrationsToSheet(rows.slice(i, i + 100));
    }

    return NextResponse.json({ synced: rows.length, event: event.event_title || event.tag });
}
