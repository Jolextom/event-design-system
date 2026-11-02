/**
 * Sets up "Main Character Fest 2026" (Campus Yo-Pro Ministry) in the event
 * tool: creates the event record and its registration questions in one go,
 * exactly as the dashboard's Create Event + Registration > Import would.
 *
 * What it creates (all content lives in events/main-character-fest-2026/):
 *   - the event (title, date/time, venue, description.html), UNPUBLISHED
 *   - the registration questions (registration-questions.json)
 *
 * What it deliberately does NOT do:
 *   - publish the event (do that from the dashboard once you're happy). Note
 *     that the hosted page /<tag> does not check is_published, so an
 *     unpublished event is still reachable by anyone who has the link.
 *   - create a ticket/pass. The ticket fee is "COMING SOON", and the public
 *     page already shows a disabled "Tickets Coming Soon" state while an
 *     event has no passes. A placeholder FREE pass would let people register
 *     without paying, so add the real pass in Ticketing once the fee is set.
 *   - upload a cover image (do that in Basic Info; the page crops it to 21:9)
 *
 * Safe by default: without --apply it only prints what it WOULD create and
 * touches nothing (and needs no credentials). With --apply it refuses to run
 * if you already have an event with the same title, and if anything fails
 * part-way it removes what it just created.
 *
 * Env vars for --apply (same as the other scripts here):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage:
 *   node scripts/seed-main-character-fest.js --end-time 18:00
 *   node scripts/seed-main-character-fest.js --end-time 18:00 --owner <user-uuid> --apply
 *
 *   --end-time HH:MM   REQUIRED. Event end time (WAT). Not in the brief, so it
 *                      has no default; the tool stores one for every event.
 *   --owner <uuid>     REQUIRED with --apply. The dashboard user who should own
 *                      the event (events.created_by), i.e. your auth user id.
 *                      Can also be set via EVENT_OWNER_ID.
 *   --apply            Actually write to the database.
 */

const fs = require("fs");
const path = require("path");

const DIR = path.join(__dirname, "..", "events", "main-character-fest-2026");

// All times are Lagos (WAT, UTC+1 year-round) — the same instant the
// dashboard would store when created from a browser in Lagos.
const EVENT = {
    title: "Main Character Fest 2026",
    date: "2026-12-19", // Saturday
    startTime: "10:00",
    tzOffset: "+01:00",
    location: "16/18 Akanbi Onitiri Close, off Eric Moore, Surulere",
    format: "physical",
};

const VALID_TYPES = ["text", "long_text", "select", "dropdown", "checkbox", "linear_scale", "star_rating"];

function arg(name) {
    const i = process.argv.indexOf(`--${name}`);
    return i === -1 ? undefined : process.argv[i + 1];
}

function fail(msg) {
    console.error(msg);
    process.exit(1);
}

/** Same checks the dashboard's ImportQuestionsModal applies. */
function loadQuestions() {
    const list = JSON.parse(fs.readFileSync(path.join(DIR, "registration-questions.json"), "utf8"));
    if (!Array.isArray(list) || list.length === 0) fail("registration-questions.json must be a non-empty array.");
    list.forEach((q, i) => {
        if (!q.title) fail(`Question ${i + 1} is missing a title.`);
        if (!VALID_TYPES.includes(q.type)) fail(`Question ${i + 1} ("${q.title}") has invalid type "${q.type}".`);
        if (!q.page || typeof q.page !== "number") fail(`Question ${i + 1} ("${q.title}") is missing a numeric page.`);
        if (["select", "dropdown", "checkbox"].includes(q.type) && !(Array.isArray(q.options) && q.options.length)) {
            fail(`Question ${i + 1} ("${q.title}") needs an options array.`);
        }
    });
    return list;
}

function buildEvent(endTime, owner) {
    const description = fs.readFileSync(path.join(DIR, "description.html"), "utf8").trim();
    const start = new Date(`${EVENT.date}T${EVENT.startTime}:00${EVENT.tzOffset}`);
    const end = new Date(`${EVENT.date}T${endTime}:00${EVENT.tzOffset}`);
    if (isNaN(end.getTime())) fail(`Invalid --end-time "${endTime}" (expected HH:MM, e.g. 18:00).`);
    if (end <= start) fail(`--end-time ${endTime} must be after the ${EVENT.startTime} start.`);

    // Mirrors CreateEventModal's slug: title -> kebab-case + 4 random chars.
    const tag = EVENT.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Math.random().toString(36).substring(2, 6);

    return {
        created_by: owner || null,
        event_title: EVENT.title,
        tag,
        event_format: EVENT.format,
        start_date: start.toISOString(),
        end_date: end.toISOString(),
        start_time: EVENT.startTime,
        end_time: endTime,
        is_published: false,
        location: EVENT.location,
        description,
    };
}

function print(event, questions) {
    console.log("EVENT");
    console.log(`  title:     ${event.event_title}`);
    console.log(`  tag:       ${event.tag}`);
    console.log(`  starts:    ${event.start_date}  (${event.start_time} WAT)`);
    console.log(`  ends:      ${event.end_date}  (${event.end_time} WAT)`);
    console.log(`  location:  ${event.location}`);
    console.log(`  format:    ${event.event_format}   published: ${event.is_published}`);
    console.log(`  owner:     ${event.created_by || "(not set — required with --apply)"}`);
    console.log(`\nREGISTRATION QUESTIONS (${questions.length}; Full Name + Email are built-in fixed fields)`);
    questions.forEach((q, i) => {
        const opts = q.options ? `  [${q.options.join(" | ")}]` : "";
        console.log(`  ${String(i + 1).padStart(2)}. ${q.required ? "*" : " "} ${q.title}  (${q.type})${opts}${q.property_key ? `  -> ${q.property_key}` : ""}`);
    });
    console.log("\nTICKETS: none created (fee coming soon)  |  COVER IMAGE: none (upload in Basic Info)");
}

async function main() {
    const endTime = arg("end-time");
    if (!endTime) fail("Missing --end-time HH:MM (e.g. --end-time 18:00). The brief has no end time, so it must be given.");
    const apply = process.argv.includes("--apply");
    const owner = arg("owner") || process.env.EVENT_OWNER_ID;

    const questions = loadQuestions();
    const event = buildEvent(endTime, owner);
    print(event, questions);

    if (!apply) {
        console.log("\nDRY RUN — nothing was written. Re-run with --owner <uuid> --apply to create it.");
        return;
    }

    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!SUPABASE_URL || !SERVICE_KEY) fail("\nMissing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
    if (!owner) fail("\n--apply needs --owner <user-uuid> (or EVENT_OWNER_ID) so the event shows up in your dashboard.");

    async function sb(method, p, body) {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/${p}`, {
            method,
            headers: {
                apikey: SERVICE_KEY,
                Authorization: `Bearer ${SERVICE_KEY}`,
                "Content-Type": "application/json",
                Prefer: "return=representation",
            },
            body: body === undefined ? undefined : JSON.stringify(body),
        });
        if (!res.ok) throw new Error(`${method} ${p} -> ${res.status}: ${await res.text()}`);
        return res.status === 204 ? null : res.json();
    }

    const existing = await sb("GET", `events?created_by=eq.${encodeURIComponent(owner)}&event_title=eq.${encodeURIComponent(event.event_title)}&select=id,tag`);
    if (existing.length > 0) {
        fail(`\nYou already have "${event.event_title}" (tag ${existing[0].tag}). Not creating a duplicate — nothing was written.`);
    }

    let eventId = null;
    try {
        const [created] = await sb("POST", "events", [event]);
        eventId = created.id;

        const rows = questions.map((q, i) => ({
            event_id: eventId,
            campaign_id: null,
            title: q.title,
            question_type: q.type,
            is_required: !!q.required,
            question_order: i,
            page: q.page,
            logic_rules: q.logic && q.logic.length ? q.logic : null,
            property_key: q.property_key || null,
            scale_config: null,
            is_selection_logic: false,
        }));
        const inserted = await sb("POST", "questions", rows);
        if (inserted.length !== questions.length) throw new Error("Unexpected number of question rows returned.");

        const optionRows = [];
        questions.forEach((q, i) => (q.options || []).forEach((text, oi) => {
            optionRows.push({ question_id: inserted[i].id, option_text: text, display_order: oi });
        }));
        if (optionRows.length) await sb("POST", "question_options", optionRows);

        console.log(`\nCreated (unpublished): ${event.event_title}`);
        console.log(`  dashboard:   /events/${event.tag}`);
        console.log(`  public page: /${event.tag}`);
        console.log("  NOTE: \"unpublished\" does NOT hide the hosted page — anyone with that link can open it (and register once a ticket exists).");
        console.log("        It only keeps the event out of the public API/listing. Don't share the link, or add a ticket, until you're ready.");
    } catch (err) {
        console.error(`\nFailed: ${err.message}`);
        if (eventId) {
            try {
                await sb("DELETE", `questions?event_id=eq.${eventId}`);
                await sb("DELETE", `events?id=eq.${eventId}`);
                console.error("Rolled back — the partially created event was removed. Safe to re-run.");
            } catch (e) {
                console.error(`Rollback also failed (${e.message}). Remove event ${eventId} manually before re-running.`);
            }
        }
        process.exit(1);
    }
}

main().catch((err) => fail(err.message));
