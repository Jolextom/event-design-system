/**
 * One-off backfill: pushes registrations that already existed BEFORE the
 * live Google Sheet sync was added (see src/lib/sheetsSync.ts) into the
 * same sheet, through the same webhook, so the sheet ends up with full
 * history instead of only registrations from today onward.
 *
 * Usage:
 *   node scripts/backfill-registrations-sheet.js            # all events
 *   node scripts/backfill-registrations-sheet.js some-event-tag
 *
 * Requires (from .env.local, same as the running app):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   REGISTRATIONS_SHEET_WEBHOOK_URL
 *   REGISTRATIONS_SHEET_WEBHOOK_SECRET
 */
const { loadEnvConfig } = require("next/env");
const { createClient } = require("@supabase/supabase-js");

loadEnvConfig(process.cwd());

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const webhookUrl = process.env.REGISTRATIONS_SHEET_WEBHOOK_URL;
const secret = process.env.REGISTRATIONS_SHEET_WEBHOOK_SECRET;

function chunk(arr, size) {
    const out = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
}

async function main() {
    if (!webhookUrl) {
        console.error("REGISTRATIONS_SHEET_WEBHOOK_URL is not set. Aborting.");
        process.exit(1);
    }

    const eventTagArg = process.argv[2];
    let eventIdFilter = null;
    if (eventTagArg) {
        const { data: event, error } = await supabase
            .from("events")
            .select("id")
            .eq("tag", eventTagArg)
            .single();
        if (error || !event) {
            console.error(`No event found with tag "${eventTagArg}"`);
            process.exit(1);
        }
        eventIdFilter = event.id;
    }

    let query = supabase
        .from("attendees")
        .select("id, email, email_status, first_name, last_name, ref, created_at, pass:pass_id(title), event:event_id(tag, event_title)")
        .order("created_at", { ascending: true });
    if (eventIdFilter) query = query.eq("event_id", eventIdFilter);

    const { data: attendees, error: attErr } = await query;
    if (attErr) {
        console.error("Failed to fetch attendees:", attErr);
        process.exit(1);
    }
    console.log(`Found ${attendees.length} attendee(s) to backfill.`);
    if (attendees.length === 0) return;

    const answersByAttendee = new Map();
    for (const idBatch of chunk(attendees.map((a) => a.id), 500)) {
        const { data: answerRows, error: ansErr } = await supabase
            .from("answers")
            .select("attendee_id, answer_text, question:question_id(title)")
            .in("attendee_id", idBatch);
        if (ansErr) {
            console.error("Failed to fetch answers batch:", ansErr);
            continue;
        }
        for (const row of answerRows || []) {
            const title = row.question?.title;
            if (!title) continue;
            const bucket = answersByAttendee.get(row.attendee_id) || {};
            bucket[title] = row.answer_text || "";
            answersByAttendee.set(row.attendee_id, bucket);
        }
    }

    const rows = attendees.map((att) => ({
        timestamp: att.created_at || new Date().toISOString(),
        event: att.event?.event_title || att.event?.tag || "Unknown Event",
        firstName: att.first_name || "",
        lastName: att.last_name || "",
        email: att.email,
        pass: att.pass?.title || "",
        status: att.email_status || "",
        ref: att.ref || "",
        answers: answersByAttendee.get(att.id) || {},
    }));

    let posted = 0;
    for (const batch of chunk(rows, 100)) {
        const res = await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ secret, rows: batch }),
        });
        if (!res.ok) {
            console.error(`Batch failed (HTTP ${res.status}):`, await res.text());
            continue;
        }
        posted += batch.length;
        console.log(`Posted ${posted}/${rows.length}`);
    }

    console.log("Backfill complete.");
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
