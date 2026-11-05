import { test } from "node:test";
import assert from "node:assert/strict";
import { buildReport, passTitleOf, isPaid, toCsv, ago } from "./eventReport.ts";

const att = (id: string, email: string, extra: Record<string, unknown> = {}) => ({ id, first_name: id, last_name: "X", email, check_in: false, ...extra });
const passes = [{ id: "p1", title: "Single" }, { id: "p2", title: "Group of 3" }];

test("the ticket name works whether the database sends an object or an array (it used to always say General Admission)", () => {
    assert.equal(passTitleOf({ title: "Single" }), "Single");
    assert.equal(passTitleOf([{ title: "Group of 3" }]), "Group of 3");
    assert.equal(passTitleOf(null), "General Admission");
    assert.equal(passTitleOf({ title: "  " }), "General Admission");
});

test("paid means the order took money; free is just registered", () => {
    assert.equal(isPaid({ total_amount: 850 }), true);
    assert.equal(isPaid([{ total_amount: "850" }]), true);
    assert.equal(isPaid({ total_amount: 0 }), false);
    assert.equal(isPaid(null), false);
});

test("totals: registered, paid, checked in, per ticket", () => {
    const { summary } = buildReport({
        attendees: [
            att("a", "a@x.com", { pass: { title: "Single" }, order: { total_amount: 15850 }, check_in: true }),
            att("b", "b@x.com", { pass: { title: "Group of 3" }, order: { total_amount: 23500 } }),
            att("c", "c@x.com", { pass: { title: "Group of 3" }, order: { total_amount: 23500 } }),
            att("d", "d@x.com", { pass: { title: "Single" }, order: { total_amount: 0 } }),
        ],
        orders: [], passes,
    });
    assert.deepEqual(summary, { registered: 4, paid: 3, checkedIn: 1, notPaidYet: 0, byTicket: [{ title: "Single", count: 2 }, { title: "Group of 3", count: 2 }] });
});

test("not paid yet: pending orders only, newest first, one per person, and not people who paid on a later try", () => {
    const { pending, summary } = buildReport({
        attendees: [att("a", "paid@x.com")],
        orders: [
            { id: "o1", email: "Late@x.com", first_name: "Late", last_name: "Larry", pass_id: "p2", status: "pending", created_at: "2026-11-01T10:00:00Z" },
            { id: "o2", email: "late@x.com", first_name: "Late", last_name: "Larry", pass_id: "p2", status: "pending", created_at: "2026-11-02T10:00:00Z" },
            { id: "o3", email: "paid@x.com", first_name: "Paid", last_name: "Pat", pass_id: "p1", status: "pending", created_at: "2026-11-01T09:00:00Z" },
            { id: "o4", email: "done@x.com", first_name: "D", last_name: "D", pass_id: "p1", status: "completed", created_at: "2026-11-01T09:00:00Z" },
            { id: "o5", email: "new@x.com", first_name: "", last_name: "", pass_id: null, status: "pending", created_at: "2026-11-03T10:00:00Z" },
        ],
        passes,
    });
    assert.deepEqual(pending.map((p) => [p.email, p.name, p.ticket]), [["new@x.com", "new@x.com", "Ticket"], ["late@x.com", "Late Larry", "Group of 3"]]);
    assert.equal(summary.notPaidYet, 2);
});

test("CSV: quotes and commas escaped, spreadsheet formulas defused", () => {
    const csv = toCsv([["Name", "Note"], ['Ada "A" O', "a,b"], ["=HYPERLINK(1)", "+1"], [null, 5]]);
    assert.equal(csv, 'Name,Note\r\n"Ada ""A"" O","a,b"\r\n\'=HYPERLINK(1),\'+1\r\n,5');
});

test("ago", () => {
    const now = Date.parse("2026-11-05T12:00:00Z");
    assert.equal(ago("2026-11-05T11:59:40Z", now), "just now");
    assert.equal(ago("2026-11-05T11:55:00Z", now), "5 min ago");
    assert.equal(ago("2026-11-05T09:00:00Z", now), "3 h ago");
    assert.equal(ago("2026-11-03T12:00:00Z", now), "2 d ago");
    assert.equal(ago(null, now), "");
});
