import { test } from "node:test";
import assert from "node:assert/strict";
import { recountPassSold, syncPassSold } from "./stock.ts";

type Row = Record<string, any>;
/** A tiny stand-in for the database client: select(..., {count, head}) + eq filters, maybeSingle, update. */
function fakeDb(T: Record<string, Row[]>, opts: { failUpdate?: boolean } = {}) {
    const from = (table: string) => {
        const f: [string, any][] = [];
        let mode: "select" | "update" = "select"; let head = false; let patch: Row = {};
        const rows = () => (T[table] ?? []).filter((r) => f.every(([c, v]) => r[c] === v));
        const q: any = {
            select: (_c?: string, o?: { head?: boolean }) => { head = !!o?.head; return q; },
            update: (p: Row) => { mode = "update"; patch = p; return q; },
            eq: (c: string, v: any) => (f.push([c, v]), q),
            maybeSingle: async () => ({ data: rows()[0] ?? null, error: null }),
            then: (res: any, rej: any) => {
                if (mode === "update") { if (opts.failUpdate) return Promise.resolve({ error: { message: "nope" } }).then(res, rej); rows().forEach((r) => Object.assign(r, patch)); return Promise.resolve({ error: null }).then(res, rej); }
                const r = rows();
                return Promise.resolve(head ? { count: r.length, error: null } : { data: r, error: null }).then(res, rej);
            },
        };
        return q;
    };
    return { from } as any;
}

const data = () => ({
    passes: [{ id: "g", type: "group", quantity_sold: 0 }, { id: "s", type: "individual", quantity_sold: 0 }],
    orders_table: [
        { id: "o1", pass_id: "g", status: "completed" }, { id: "o2", pass_id: "g", status: "completed" },
        { id: "o3", pass_id: "g", status: "pending" }, { id: "o4", pass_id: "s", status: "completed" },
    ],
    attendees: [
        // the two paid groups: 3 people each (+1 invited, not yet registered)
        ...["a", "b", "c"].map((n) => ({ id: `1${n}`, pass_id: "g", order_id: "o1", email_status: "registered" })),
        ...["a", "b", "c"].map((n) => ({ id: `2${n}`, pass_id: "g", order_id: "o2", email_status: "registered" })),
        { id: "inv", pass_id: "g", order_id: "o2", email_status: "invited" },
        // singles
        { id: "s1", pass_id: "s", order_id: "o4", email_status: "registered" }, { id: "s2", pass_id: "s", order_id: "x", email_status: "confirmed" }, { id: "s3", pass_id: "s", order_id: "y", email_status: "invited" },
    ],
});

test("a group ticket counts GROUPS (completed orders), not the people in them, and not unpaid orders", async () => {
    assert.equal(await recountPassSold(fakeDb(data()), { id: "g", type: "group" }), 2);
});
test("any other ticket counts registered guests, not invited-only people", async () => {
    assert.equal(await recountPassSold(fakeDb(data()), { id: "s", type: "individual" }), 2);
});
test("syncPassSold stores the recount, and is right no matter what the stored number was (self-healing)", async () => {
    const T = data(); T.passes[0].quantity_sold = 99;
    const db = fakeDb(T);
    assert.equal(await syncPassSold(db, "g"), 2);
    assert.equal(T.passes[0].quantity_sold, 2);
    assert.equal(await syncPassSold(db, "g"), 2, "running it again changes nothing");
});
test("a failing stock update returns null (and is logged) instead of throwing, so a payment is never undone by it", async () => {
    const T = data();
    const orig = console.error; console.error = () => {};
    try { assert.equal(await syncPassSold(fakeDb(T, { failUpdate: true }), "g"), null); assert.equal(await syncPassSold(fakeDb(T), "nope"), null); } finally { console.error = orig; }
});
