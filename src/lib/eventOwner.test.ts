import { test } from "node:test";
import assert from "node:assert/strict";
import { checkEventOwner } from "./eventOwner.ts";

const db = (events: Record<string, any>[]) => ({
    from: () => {
        let id: any;
        const q: any = { select: () => q, eq: (_c: string, v: any) => { id = v; return q; }, maybeSingle: async () => ({ data: events.find((e) => e.id === id) ?? null, error: null }) };
        return q;
    },
}) as any;

const events = [{ id: "e1", created_by: "u1" }, { id: "e2", created_by: "u2" }];

test("the creator of the event is allowed", async () => {
    assert.deepEqual(await checkEventOwner(db(events), "e1", "u1"), { ok: true, userId: "u1" });
});
test("another logged-in user is refused", async () => {
    const r = await checkEventOwner(db(events), "e1", "u2");
    assert.equal(r.ok, false);
});
test("no user, missing or unknown event are refused", async () => {
    assert.equal((await checkEventOwner(db(events), "e1", "")).ok, false);
    assert.equal((await checkEventOwner(db(events), undefined, "u1")).ok, false);
    assert.equal((await checkEventOwner(db(events), "", "u1")).ok, false);
    const r = await checkEventOwner(db(events), "nope", "u1");
    assert.deepEqual(r, { ok: false, error: "Event not found." });
});
test("an event with no recorded creator is never matched by an empty user id", async () => {
    assert.equal((await checkEventOwner(db([{ id: "e3", created_by: null }]), "e3", "")).ok, false);
});
