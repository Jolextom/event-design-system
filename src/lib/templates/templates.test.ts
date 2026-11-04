// Run with:  npm test
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { mainCharacterFest as t } from "./main-character-fest.ts";
import { parseInputs, localToIso } from "./createFromTemplate.ts";

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
    assert.equal(group.salesEndInput, "promoEnds");
    assert.equal(real.inputs.find((i) => i.key === "promoEnds")!.defaultValue, "2026-11-30T23:55");
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
    }
});

test("test variant needs no migration columns and no decisions from the organiser", () => {
    const v = variant("test");
    assert.equal(v.registrationClosesInput, undefined);
    assert.ok(v.passes.every((p) => !p.salesEndInput));
    assert.equal(v.inputs.length, 0);
    assert.deepEqual(v.passes.map((p) => p.price), [100, 300, 0]);
});

test("input checking: required, numbers, times, dates", () => {
    const real = variant("real");
    const ok = { endTime: "18:00", singleQty: "120", groupQty: "40", promoEnds: "2026-11-30T23:55", registrationCloses: "2026-12-10T23:59" };
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
    assert.equal(bad({ promoEnds: "30/11/2026" }).ok, false);
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
