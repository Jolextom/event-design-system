// Run with:  npm test
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { mainCharacterFest as t } from "./main-character-fest.ts";
import { parseInputs, localToIso, requiredColumns, sqlForMissing, COLUMN_SQL } from "./createFromTemplate.ts";
import { computeCharge } from "../fees.ts";

const read = (f: string) => fs.readFileSync(new URL(`../../../events/main-character-fest-2026/${f}`, import.meta.url), "utf8");
const variant = (id: string) => t.variants.find((v) => v.id === id)!;

test("template description matches events/main-character-fest-2026/description.html (the CLI script's copy)", () => {
    assert.equal(t.description, read("description.html").trim());
});

test("template questions match registration-questions.json (the CLI script's copy)", () => {
    assert.deepEqual(JSON.parse(JSON.stringify(t.questions)), JSON.parse(read("registration-questions.json")));
});

test("every select-type question has options, and every question is on a page", () => {
    for (const q of t.questions) {
        assert.ok(q.page >= 1, q.title);
        if (["select", "dropdown", "checkbox"].includes(q.type)) assert.ok(q.options && q.options.length > 0, q.title);
    }
});

test("template prices and promo match what the organisers announced", () => {
    const real = variant("real");
    const single = real.passes.find((p) => p.title === "Single")!;
    const group = real.passes.find((p) => p.title === "Group of 3")!;
    assert.equal(single.price, 15000);
    assert.equal(group.price, 22500);
    assert.equal(group.groupSize, 3);
    assert.equal(group.price / 3, 7500);
    assert.equal(group.price, (single.price * 3) / 2); // 50% off
    // The promo runs while stock lasts (client feedback): no promo end date, the quantity is the limit.
    assert.equal(group.salesEndInput, undefined);
    assert.equal(real.inputs.find((i) => i.key === "promoEnds"), undefined);
    assert.match(group.description ?? "", /while stock lasts/);
    assert.doesNotMatch(group.description ?? "", /30 November/);
    assert.equal(real.inputs.find((i) => i.key === "registrationCloses")!.defaultValue, "2026-12-10T23:59");
});

test("every input a pass or deadline refers to actually exists", () => {
    for (const v of t.variants) {
        const keys = new Set([...t.inputs, ...v.inputs].map((i) => i.key));
        for (const p of v.passes) {
            if (typeof p.quantity !== "number") assert.ok(keys.has(p.quantity.input), `${v.id}/${p.title} quantity`);
            if (p.salesEndInput) assert.ok(keys.has(p.salesEndInput), `${v.id}/${p.title} salesEnd`);
        }
        if (v.registrationClosesInput) assert.ok(keys.has(v.registrationClosesInput));
        if (v.feeInput) assert.ok(keys.has(v.feeInput), `${v.id} feeInput`);
        if (v.subaccountInput) assert.ok(keys.has(v.subaccountInput), `${v.id} subaccountInput`);
    }
});

test("test variant needs no migration columns and no decisions from the organiser", () => {
    const v = variant("test");
    assert.equal(v.registrationClosesInput, undefined);
    assert.ok(v.passes.every((p) => !p.salesEndInput));
    assert.ok(v.inputs.every((i) => !i.required), "nothing here is mandatory");
    assert.deepEqual(v.passes.map((p) => p.price), [100, 300, 0]);
    assert.ok(!requiredColumns(v).includes("events.fee_config"), "fee columns are only needed when the fee is used");
});

test("the ₦500 flat fee gives the figures we told the organisers", () => {
    assert.deepEqual(t.feeConfig, { enabled: true, pass_processing_fee: true, platform_fee: { flat: 500 }, round_to: 50, label: "Service fee" });
    const single = computeCharge(15000, t.feeConfig), group = computeCharge(22500, t.feeConfig);
    assert.equal(single.total, 15850); assert.equal(single.serviceFee, 850);
    assert.equal(group.total, 23500); assert.equal(group.serviceFee, 1000);
    assert.equal(single.organiserKobo, 1_500_000, "organiser still gets the full ticket price");
    assert.equal(group.organiserKobo, 2_250_000);
    assert.ok(single.platformNetKobo >= 50_000 && group.platformNetKobo >= 50_000, "we keep at least the ₦500 after Paystack's cut");
});

test("real event: service fee is ON by default; test event: OFF by default; each variant has its OWN switch", () => {
    const real = variant("real"), test = variant("test");
    assert.notEqual(real.feeInput, test.feeInput, "sharing one key would carry Test's 'off' into Real when switching");
    assert.equal([...real.inputs].find((i) => i.key === real.feeInput)!.defaultValue, "true");
    assert.equal([...test.inputs].find((i) => i.key === test.feeInput)!.defaultValue, "");
});

test("payout (subaccount) code: optional, must look like ACCT_xxx, fee switch parsed", () => {
    const real = variant("real");
    const ok = { endTime: "18:00", singleQty: "120", groupQty: "40", registrationCloses: "2026-12-10T23:59" };
    const good = parseInputs(t, real, { ...ok, addFee: "true", subaccount: "ACCT_abc123XYZ" });
    assert.equal(good.ok, true);
    if (good.ok) { assert.equal(good.parsed.addFee, "true"); assert.equal(good.parsed.subaccount, "ACCT_abc123XYZ"); }
    assert.equal(parseInputs(t, real, { ...ok, addFee: "", subaccount: "" }).ok, true, "both are optional");
    assert.equal(parseInputs(t, real, { ...ok, subaccount: "acct_lowercase" }).ok, false);
    assert.equal(parseInputs(t, real, { ...ok, subaccount: "somebody's bank account" }).ok, false);
    const off = parseInputs(t, real, { ...ok, addFee: "false" });
    assert.equal(off.ok && off.parsed.addFee, "", "anything but 'true' means off");
});

test("fee/payout columns are only demanded when those options are used", () => {
    const real = variant("real");
    const none = requiredColumns(real);
    assert.ok(!none.includes("events.fee_config") && !none.includes("events.paystack_subaccount_code"));
    assert.ok(requiredColumns(real, { fee: true }).includes("events.fee_config"));
    assert.ok(requiredColumns(real, { subaccount: true }).includes("events.paystack_subaccount_code"));
    assert.ok(COLUMN_SQL["events.fee_config"] && COLUMN_SQL["events.paystack_subaccount_code"]);
});

test("input checking: required, numbers, times, dates", () => {
    const real = variant("real");
    const ok = { endTime: "18:00", singleQty: "120", groupQty: "40", registrationCloses: "2026-12-10T23:59" };
    const good = parseInputs(t, real, ok);
    assert.equal(good.ok, true);
    if (good.ok) { assert.equal(good.parsed.singleQty, 120); assert.equal(good.parsed.endTime, "18:00"); }

    const bad = (patch: Record<string, string>) => parseInputs(t, real, { ...ok, ...patch });
    assert.equal(bad({ endTime: "" }).ok, false);
    assert.equal(bad({ endTime: "9am" }).ok, false);
    assert.equal(bad({ endTime: "09:00" }).ok, false, "end before the 10:00 start");
    assert.equal(bad({ singleQty: "0" }).ok, false);
    assert.equal(bad({ singleQty: "12.5" }).ok, false);
    assert.equal(bad({ groupQty: "" }).ok, false);
    assert.equal(bad({ registrationCloses: "2026-13-45T99:99" }).ok, false);
    // the test variant needs only an end time
    assert.equal(parseInputs(t, variant("test"), { endTime: "18:00" }).ok, true);
    assert.equal(parseInputs(t, variant("test"), {}).ok, false);
});

test("Lagos times become the right instants (WAT = UTC+1)", () => {
    assert.equal(localToIso("2026-12-19T10:00", "+01:00"), "2026-12-19T09:00:00.000Z");
    assert.equal(localToIso("2026-11-30T23:55", "+01:00"), "2026-11-30T22:55:00.000Z");
    assert.equal(localToIso("2026-12-10T23:59", "+01:00"), "2026-12-10T22:59:00.000Z");
});

test("columns checked before creating: group tickets need group_size, the registration deadline needs its column", () => {
    const real = requiredColumns(variant("real"));
    for (const c of ["passes.type", "passes.display_order", "passes.group_size", "passes.max_per_person", "events.registration_closes_at"]) {
        assert.ok(real.includes(c), `real variant should check ${c}`);
    }
    assert.ok(!real.includes("passes.sales_end_at"), "no promo end date any more (the promo runs while stock lasts)");
    const test = requiredColumns(variant("test"));
    assert.ok(test.includes("passes.group_size"), "the test variant has a group ticket too");
    assert.ok(!test.includes("passes.sales_end_at") && !test.includes("events.registration_closes_at"));
});

test("every column we check has SQL to add it, and the fix SQL reloads the API's schema cache", () => {
    for (const v of t.variants) for (const c of requiredColumns(v)) assert.ok(COLUMN_SQL[c], `no SQL for ${c}`);
    const sql = sqlForMissing(["passes.group_size"]);
    assert.match(sql, /ALTER TABLE public\.passes ADD COLUMN IF NOT EXISTS group_size INTEGER;/);
    assert.match(sql, /NOTIFY pgrst, 'reload schema';/);
});

test("the shipped migration (schema.sql) adds every column the template writes", () => {
    const schema = fs.readFileSync(new URL("../../../supabase/schema.sql", import.meta.url), "utf8");
    for (const c of Object.keys(COLUMN_SQL)) {
        const [table, column] = c.split(".");
        assert.match(schema, new RegExp(`public\\.${table}\\s+ADD COLUMN IF NOT EXISTS ${column}\\b`), `schema.sql lacks ${c}`);
    }
});

test("registration questions: costume ones optional, squad question gone, region and gender after school", () => {
    const titles = t.questions.map((q) => q.title);
    const q = (start: string) => t.questions.find((x) => x.title.startsWith(start))!;
    assert.equal(q("Which character").required, false);
    assert.equal(q("Which movie or franchise").required, false);
    assert.equal(q("Squad or group name").required, false);
    assert.ok(!titles.some((x) => /Are you coming with a squad/.test(x)), "squad question removed");
    const school = titles.findIndex((x) => x.startsWith("School or organisation"));
    assert.ok(titles[school + 1].startsWith("Region"), "region right after school/organisation");
    assert.equal(titles[school + 2], "Gender");
    assert.deepEqual(q("Gender").options, ["Male", "Female"]);
    // things that must stay required
    for (const must of ["Phone number", "Are you attending as a", "School or organisation", "Consent for photographs"]) assert.equal(q(must).required, true, must);
});
