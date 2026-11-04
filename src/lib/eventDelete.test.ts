import { test } from "node:test";
import assert from "node:assert/strict";
import { deleteEvent, previewEventDelete } from "./eventDelete.ts";

/**
 * An in-memory database that enforces foreign keys the way Postgres does: deleting a row that
 * another row still points at is refused (23503). This is what makes "delete the event" hard
 * for real, so these tests would catch a wrong deletion order.
 */
type Row = Record<string, any>;
type Fk = { table: string; col: string; refs: string };
const FKS: Fk[] = [
    { table: "attendees", col: "event_id", refs: "events" },
    { table: "attendees", col: "order_id", refs: "orders_table" },
    { table: "attendees", col: "pass_id", refs: "passes" },
    { table: "orders_table", col: "event_id", refs: "events" },
    { table: "orders_table", col: "pass_id", refs: "passes" },
    { table: "answers", col: "attendee_id", refs: "attendees" },
    { table: "answers", col: "question_id", refs: "questions" },
    { table: "email_deliveries", col: "attendee_id", refs: "attendees" },
    { table: "email_deliveries", col: "event_id", refs: "events" },
    { table: "questions", col: "event_id", refs: "events" },
    { table: "questions", col: "show_for_option_id", refs: "question_options" },
    { table: "question_options", col: "question_id", refs: "questions" },
    { table: "passes", col: "event_id", refs: "events" },
    { table: "passes", col: "show_for_option_id", refs: "question_options" },
    { table: "staff", col: "event_id", refs: "events" },
    { table: "event_variables", col: "event_id", refs: "events" },
    { table: "smart_segments", col: "event_id", refs: "events" },
    { table: "event_collaborators", col: "event_id", refs: "events" },
];

function makeDb(data: Record<string, Row[]>, extraFks: Fk[] = [], opts: { events_delete_noop?: boolean } = {}) {
    const T: Record<string, Row[]> = JSON.parse(JSON.stringify(data));
    const fks = [...FKS, ...extraFks];
    const calls: string[] = [];
    const missing = (t: string) => (T[t] ? null : { code: "PGRST205", message: `no table ${t}` });

    function from(table: string) {
        const filters: ((r: Row) => boolean)[] = [];
        let op: "select" | "update" | "delete" = "select";
        let patch: Row = {};
        const run = () => {
            const m = missing(table);
            if (m) return { data: null, error: m };
            const hit = T[table].filter((r) => filters.every((f) => f(r)));
            if (op === "select") return { data: hit.map((r) => ({ ...r })), error: null };
            if (op === "update") { hit.forEach((r) => Object.assign(r, patch)); return { data: null, error: null }; }
            calls.push(`delete ${table}`);
            for (const r of hit) for (const fk of fks) {
                if (fk.refs !== table || !T[fk.table]) continue;
                if (T[fk.table].some((c) => c[fk.col] === r.id && !hit.includes(c)))
                    return { data: null, error: { code: "23503", message: `violates foreign key: ${fk.table}.${fk.col} -> ${table}` } };
            }
            if (table === "events" && opts.events_delete_noop) return { data: null, error: null };
            T[table] = T[table].filter((r) => !hit.includes(r));
            return { data: null, error: null };
        };
        const q: any = {
            select: () => q,
            update: (p: Row) => { op = "update"; patch = p; return q; },
            delete: () => { op = "delete"; return q; },
            eq: (c: string, v: any) => { filters.push((r) => r[c] === v); return q; },
            in: (c: string, vs: any[]) => { filters.push((r) => vs.includes(r[c])); return q; },
            maybeSingle: async () => { const r = run(); return { data: r.data?.[0] ?? null, error: r.error }; },
            then: (res: any, rej: any) => Promise.resolve(run()).then(res, rej),
        };
        return q;
    }
    return { client: { from } as any, T, calls };
}

const OWNER = "u1";
const base = (): Record<string, Row[]> => ({
    events: [
        { id: "e1", event_title: "Fest", is_published: true, created_by: OWNER },
        { id: "e2", event_title: "Other", is_published: false, created_by: OWNER },
        { id: "e3", event_title: "Theirs", is_published: false, created_by: "u2" },
    ],
    question_options: [
        { id: "o1", question_id: "q1" }, { id: "o2", question_id: "q2" },
        { id: "o9", question_id: "q9" },
    ],
    questions: [
        { id: "q1", event_id: "e1", show_for_option_id: "o2" },
        { id: "q2", event_id: "e1", show_for_option_id: null },
        { id: "q9", event_id: "e2", show_for_option_id: null },
    ],
    passes: [
        { id: "p1", event_id: "e1", show_for_option_id: "o1" },
        { id: "p9", event_id: "e2", show_for_option_id: "o9" },
    ],
    orders_table: [{ id: "ord1", event_id: "e1", pass_id: "p1", status: "completed" }, { id: "ord2", event_id: "e1", pass_id: "p1", status: "pending" }],
    attendees: [{ id: "a1", event_id: "e1", order_id: "ord1", pass_id: "p1" }],
    answers: [{ id: "an1", attendee_id: "a1", question_id: "q1" }],
    email_deliveries: [{ id: "em1", event_id: "e1", attendee_id: "a1" }],
    virtual_attendance: [],
    staff: [{ id: "s1", event_id: "e1" }],
    event_variables: [{ id: "v1", event_id: "e1" }],
    event_collaborators: [],
    // smart_segments, event_segments, campaigns: tables this database doesn't have
});

test("only the owner can preview or delete; unknown events are 404", async () => {
    const { client, T } = makeDb(base());
    const other = await deleteEvent(client, { eventId: "e1", userId: "u2", confirmTitle: "Fest" });
    assert.deepEqual(other, { ok: false, status: 403, error: "You can only delete your own events." });
    const anon = await previewEventDelete(client, "e1", "");
    assert.equal(anon.ok === false && anon.status, 403);
    const theirs = await deleteEvent(client, { eventId: "e3", userId: OWNER });
    assert.equal(theirs.ok === false && theirs.status, 403);
    const none = await deleteEvent(client, { eventId: "nope", userId: OWNER });
    assert.equal(none.ok === false && none.status, 404);
    assert.equal(T.events.length, 3, "nothing was deleted");
});

test("preview counts what is inside and says typing is needed", async () => {
    const { client } = makeDb(base());
    const r = await previewEventDelete(client, "e1", OWNER);
    assert.ok(r.ok);
    assert.deepEqual(r.preview, {
        eventId: "e1", title: "Fest", isPublished: true, tickets: 1, guests: 1, orders: 2, completedOrders: 1, questions: 2, needsTypedConfirmation: true,
    });
});

test("an event with guests or orders needs its exact name; nothing is touched without it", async () => {
    const { client, T, calls } = makeDb(base());
    for (const confirmTitle of [undefined, "", "fest", "Fest 2"]) {
        const r = await deleteEvent(client, { eventId: "e1", userId: OWNER, confirmTitle });
        assert.equal(r.ok === false && r.status, 400);
    }
    assert.equal(calls.length, 0, "no delete was even attempted");
    assert.ok(T.events.some((e) => e.id === "e1"));
});

test("a full event (circular ticket/question links, guests, answers, orders) is deleted, and ONLY that event", async () => {
    const { client, T } = makeDb(base());
    const r = await deleteEvent(client, { eventId: "e1", userId: OWNER, confirmTitle: "  Fest " });
    assert.deepEqual(r, { ok: true });
    assert.deepEqual(T.events.map((e) => e.id), ["e2", "e3"]);
    for (const t of ["attendees", "orders_table", "answers", "email_deliveries", "staff", "event_variables"]) assert.equal(T[t].length, 0, t);
    // the other event's data, including ITS circular link, is intact
    assert.deepEqual(T.questions.map((q) => q.id), ["q9"]);
    assert.deepEqual(T.question_options.map((o) => o.id), ["o9"]);
    assert.deepEqual(T.passes, [{ id: "p9", event_id: "e2", show_for_option_id: "o9" }]);
});

test("an empty event needs no typing", async () => {
    const { client, T } = makeDb(base());
    const r = await deleteEvent(client, { eventId: "e2", userId: OWNER });
    assert.deepEqual(r, { ok: true });
    assert.deepEqual(T.events.map((e) => e.id), ["e1", "e3"]);
    assert.equal(T.passes.some((p) => p.event_id === "e2"), false);
});

test("many guests (more than one batch) are all cleared", async () => {
    const d = base();
    d.attendees = Array.from({ length: 200 }, (_, i) => ({ id: `g${i}`, event_id: "e1", order_id: "ord1", pass_id: "p1" }));
    d.answers = d.attendees.map((a, i) => ({ id: `x${i}`, attendee_id: a.id, question_id: "q1" }));
    d.email_deliveries = [];
    const { client, T } = makeDb(d);
    assert.deepEqual(await deleteEvent(client, { eventId: "e1", userId: OWNER, confirmTitle: "Fest" }), { ok: true });
    assert.equal(T.attendees.length, 0);
    assert.equal(T.answers.length, 0);
});

test("an unexpected extra link: a clear error naming it, nothing more is removed, and a retry works once it is fixed", async () => {
    const d = base();
    d.notes = [{ id: "n1", attendee_id: "a1" }]; // a table this code doesn't know about
    const { client, T } = makeDb(d, [{ table: "notes", col: "attendee_id", refs: "attendees" }]);
    const r = await deleteEvent(client, { eventId: "e1", userId: OWNER, confirmTitle: "Fest" });
    assert.ok(!r.ok && r.status === 409);
    assert.match(r.error, /Couldn't remove guests/);
    assert.match(r.error, /notes\.attendee_id/);
    assert.match(r.error, /press Delete again/);
    assert.ok(T.events.some((e) => e.id === "e1"), "the event itself is still there");
    T.notes.length = 0; // the owner fixes the data
    assert.deepEqual(await deleteEvent(client, { eventId: "e1", userId: OWNER, confirmTitle: "Fest" }), { ok: true });
    assert.deepEqual(T.events.map((e) => e.id), ["e2", "e3"]);
});

test("optional tables that don't exist in this database are skipped, not treated as failures", async () => {
    const d = base();
    delete d.virtual_attendance; delete d.staff; delete d.event_variables; delete d.event_collaborators;
    const { client } = makeDb(d);
    assert.deepEqual(await deleteEvent(client, { eventId: "e1", userId: OWNER, confirmTitle: "Fest" }), { ok: true });
});

test("if access rules silently refuse the final delete, it says so instead of claiming success", async () => {
    const { client, T } = makeDb(base(), [], { events_delete_noop: true });
    const r = await deleteEvent(client, { eventId: "e2", userId: OWNER });
    assert.ok(!r.ok && r.status === 409);
    assert.match(r.error, /still there/);
    assert.ok(T.events.some((e) => e.id === "e2"));
});
