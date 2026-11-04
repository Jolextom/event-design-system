/**
 * Removes a throwaway TEST event and everything attached to it (attendees, orders,
 * answers, tickets, questions...). The dashboard has no "delete event" button, so
 * this is how you clean up after testing.
 *
 * SAFETY: it only ever deletes an event whose title contains "(TEST)" (what
 * `seed-main-character-fest.js --test` creates). It will refuse anything else,
 * so it cannot be pointed at a real event by mistake.
 *
 * Usage:
 *   node scripts/delete-test-event.mjs <event-tag>            preview: shows what would be deleted
 *   node scripts/delete-test-event.mjs <event-tag> --apply    delete it
 *
 * Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 */

const [tag] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const apply = process.argv.includes("--apply");
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const die = (m) => { console.error(m); process.exit(1); };
if (!tag) die("Usage: node scripts/delete-test-event.mjs <event-tag> [--apply]");
if (!URL_ || !KEY) die("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");

async function sb(method, path) {
    const res = await fetch(`${URL_}/rest/v1/${path}`, {
        method,
        headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", Prefer: "return=representation" },
    });
    const text = await res.text();
    if (res.status === 404) return null; // table doesn't exist in this database: nothing to delete
    if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${text}`);
    return text ? JSON.parse(text) : [];
}
const inList = (ids) => `in.(${ids.map((i) => `"${i}"`).join(",")})`;

const [event] = (await sb("GET", `events?tag=eq.${encodeURIComponent(tag)}&select=id,event_title,tag`)) || [];
if (!event) die(`No event with tag "${tag}".`);
if (!/\(TEST\)/.test(event.event_title)) die(`REFUSED: "${event.event_title}" is not a TEST event (its title must contain "(TEST)"). Nothing was touched.`);

const attendees = (await sb("GET", `attendees?event_id=eq.${event.id}&select=id`)) || [];
const questions = (await sb("GET", `questions?event_id=eq.${event.id}&select=id`)) || [];

console.log(`Event: ${event.event_title}  (${event.tag})  ${apply ? "DELETING" : "preview only"}`);
const plan = [
    ["answers", `attendee_id=${attendees.length ? inList(attendees.map((a) => a.id)) : "in.()"}`],
    ["email_deliveries", `event_id=eq.${event.id}`],
    ["attendees", `event_id=eq.${event.id}`],
    ["orders_table", `event_id=eq.${event.id}`],
    ["question_options", `question_id=${questions.length ? inList(questions.map((q) => q.id)) : "in.()"}`],
    ["questions", `event_id=eq.${event.id}`],
    ["passes", `event_id=eq.${event.id}`],
    ["staff", `event_id=eq.${event.id}`],
    ["event_variables", `event_id=eq.${event.id}`],
    ["smart_segments", `event_id=eq.${event.id}`],
    ["event_collaborators", `event_id=eq.${event.id}`],
    ["events", `id=eq.${event.id}`],
];

for (const [table, filter] of plan) {
    if (!apply) {
        const rows = await sb("GET", `${table}?${filter}&select=*`);
        console.log(`  ${table.padEnd(20)} ${rows === null ? "(no such table)" : rows.length + " row(s)"}`);
        continue;
    }
    if (filter.endsWith("in.()")) { console.log(`  ${table.padEnd(20)} 0 deleted`); continue; }
    try {
        const rows = await sb("DELETE", `${table}?${filter}`);
        console.log(`  ${table.padEnd(20)} ${rows === null ? "(no such table)" : rows.length + " deleted"}`);
    } catch (e) {
        die(`\nStopped at "${table}": ${e.message}\nNothing after this step was deleted. Fix the cause (usually a table that still references this event) and run again.`);
    }
}
console.log(apply ? "\nDone. The test event is gone." : "\nPreview only. Add --apply to delete.");
