/**
 * Read-only diagnostic: lists every attendee for a given event who has no
 * check-in ref yet. Doesn't change anything — for finding out how many
 * people are in the same situation Osaz was in before running the reminder
 * send (which backfills a ref for whoever it actually emails, one at a
 * time, but doesn't proactively fix everyone).
 *
 * Root cause (confirmed by reading the code, not guessed): "Add Guest" in
 * the dashboard (handleAddGuest in useRegistryLogic.ts) inserts an attendee
 * with no ref at all. If that person later actually registers themselves
 * with the same email, fulfillOrder() finds the existing row and reuses it
 * — but its ref-generation logic only runs when creating a brand-new row,
 * so a reused row stays ref-less forever, even though everything else about
 * it (answers, phone, gender) gets filled in normally.
 *
 * Requires the same three env vars as send-checkin-reminder.js:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage:
 *   node scripts/list-missing-checkin-refs.js <event-tag>
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const tag = process.argv[2];

if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (set as environment variables before running).");
    process.exit(1);
}
if (!tag) {
    console.error("Usage: node scripts/list-missing-checkin-refs.js <event-tag>");
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

async function main() {
    const events = await sb(`events?tag=eq.${encodeURIComponent(tag)}&select=id,event_title`);
    const event = events[0];
    if (!event) {
        console.error(`No event found with tag "${tag}"`);
        process.exit(1);
    }

    const all = await sb(`attendees?event_id=eq.${event.id}&select=id,email,first_name,last_name,ref&order=created_at.asc`);
    const missing = all.filter((a) => !a.ref);

    console.log(`Event: ${event.event_title}`);
    console.log(`Total attendees: ${all.length}`);
    console.log(`Missing a check-in ref: ${missing.length}\n`);

    if (missing.length > 0) {
        for (const att of missing) {
            console.log(`  - ${att.first_name || ""} ${att.last_name || ""} <${att.email}>`.trim());
        }
        console.log("\nEach of these will get a ref generated automatically the first time you send them a reminder (test or real). Nothing here has been changed.");
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
