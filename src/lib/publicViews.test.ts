import { test } from "node:test";
import assert from "node:assert/strict";
import { receiptView, inviteView, isValidRef } from "./publicViews.ts";

type Row = Record<string, any>;
function makeDb(T: Record<string, Row[]>) {
    return {
        from(table: string) {
            const f: [string, any][] = [];
            const q: any = {
                select: () => q,
                eq: (c: string, v: any) => (f.push([c, v]), q),
                maybeSingle: async () => ({ data: (T[table] ?? []).find((r) => f.every(([c, v]) => r[c] === v)) ?? null, error: null }),
                then: (res: any, rej: any) => Promise.resolve({ data: (T[table] ?? []).filter((r) => f.every(([c, v]) => r[c] === v)), error: null }).then(res, rej),
            };
            return q;
        },
    } as any;
}
const T = () => ({
    orders_table: [
        { id: "o1", order_ref: "EF-X-AAAA111122", first_name: "Ada", last_name: "L", email: "ada@x.com", quantity: 2, total_amount: 850, status: "completed", created_at: "t", pass_id: "p1", event_id: "e1", paystack_reference: "SECRET-REF", expected_amount_kobo: 85000, fee_amount: 550, ip: "1.2.3.4" },
        { id: "o2", order_ref: "EF-X-BBBB222233", first_name: "Bob", last_name: "M", email: "bob@x.com", quantity: 1, total_amount: 1, status: "completed", created_at: "t", pass_id: "p1", event_id: "e1" },
    ],
    attendees: [
        { id: "a1", order_id: "o1", event_id: "e1", pass_id: "p1", first_name: "Ada", last_name: "L", email: "ada@x.com", ref: "REF-A1", email_status: "confirmed", created_at: "t", phone: "0800", properties: { secret: 1 }, check_in: true },
        { id: "a2", order_id: "o1", event_id: "e1", pass_id: "p1", first_name: "Cy", last_name: "N", email: "cy@x.com", ref: "REF-A2", email_status: "invited", created_at: "t", phone: "0801" },
        { id: "a3", order_id: "o2", event_id: "e1", pass_id: "p1", first_name: "Bob", last_name: "M", email: "bob@x.com", ref: "REF-B1", email_status: "confirmed", created_at: "t" },
    ],
    passes: [{ id: "p1", title: "Group of 3", type: "group", group_size: 3, price: 22500, quantity_sold: 4 }],
    events: [{ id: "e1", event_title: "Fest", tag: "fest", start_date: "d", start_time: "10:00", location: "L", image: "i", created_by: "owner", paystack_subaccount_code: "ACCT_secret" }],
    questions: [{ id: "q2", event_id: "e1", question_order: 2, options: [] }, { id: "q1", event_id: "e1", question_order: 1 }],
    question_options: [],
});

test("reference format: only plain tokens are even looked up", () => {
    for (const bad of ["", "a b", "x'; drop", "../etc", "a".repeat(81), undefined, 5, null]) assert.equal(isValidRef(bad), false, String(bad));
    assert.equal(isValidRef("EF-MAIN-CHARACTER-FEST--F92AA249A0"), true);
});

test("receipt: returns only that order's guests, and none of the internals", async () => {
    const v = await receiptView(makeDb(T()), "EF-X-AAAA111122");
    assert.ok(v);
    assert.equal(v.attendees.length, 2, "Bob's guest is not included");
    assert.deepEqual(v.attendees.map((a) => a.ref), ["REF-A1", "REF-A2"]);
    const json = JSON.stringify(v);
    for (const secret of ["SECRET-REF", "expected_amount_kobo", "fee_amount", "1.2.3.4", "0800", "properties", "check_in", "ACCT_secret", "created_by", "owner", "quantity_sold", "price"])
        assert.ok(!json.includes(secret), `leaked: ${secret}`);
    assert.equal(v.order.total_amount, 850);
    assert.equal(v.event?.event_title, "Fest");
    assert.deepEqual(v.questions.map((q) => q.id), ["q1", "q2"], "questions come back in order");
});

test("receipt: unknown or malformed reference finds nothing", async () => {
    assert.equal(await receiptView(makeDb(T()), "EF-X-NOPE000000"), null);
    assert.equal(await receiptView(makeDb(T()), "x y"), null);
});

test("invite: one guest's own details only; finished invites skip the form data", async () => {
    const v = await inviteView(makeDb(T()), "REF-A2");
    assert.ok(v);
    assert.equal(v.attendee.first_name, "Cy");
    assert.equal(v.passTitle, "Group of 3");
    assert.equal(v.questions.length, 2);
    assert.ok(!JSON.stringify(v).includes("0801"), "phone not returned");
    const done = await inviteView(makeDb(T()), "REF-A1");
    assert.equal(done?.questions.length, 0);
    assert.equal(await inviteView(makeDb(T()), "REF-NOPE"), null);
});
