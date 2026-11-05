import { test } from "node:test";
import assert from "node:assert/strict";
import { stockMeter } from "./stockMeter.ts";

const group = { singular: "group", plural: "groups" };
const m = (available: number | null, sold: number | null) => stockMeter({ quantity_available: available, quantity_sold: sold }, group);

test("no line without a limit, or when sold out, or oversold", () => {
    assert.equal(m(null, 5), null);
    assert.equal(m(0, 0), null);
    assert.equal(m(40, 40), null);
    assert.equal(m(40, 43), null);
});

test("it only says how many are LEFT: never the total or how many are gone", () => {
    for (const sold of [0, 4, 20, 31, 39]) {
        const s = m(40, sold)!;
        const text = JSON.stringify(s);
        assert.ok(!/\bof\b/.test(s.headline), s.headline);
        assert.ok(!/claimed|taken|sold|\d+\s*(gone|used)/i.test(text), text); // ("Almost gone" is a phrase, not a count)
        assert.ok(!text.includes("40") || s.remaining === 40, `the total (40) must not appear: ${text}`);
        assert.deepEqual(Object.keys(s).sort(), ["headline", "remaining", "tone"], "no total / claimed / percent in the state");
    }
});

test("plenty left: the plain 'Only N left'", () => {
    const s = m(40, 7)!;
    assert.equal(s.tone, "calm");
    assert.equal(s.headline, "Only 33 groups left");
    assert.equal(s.remaining, 33);
});

test("half gone: going fast", () => {
    const s = m(40, 20)!;
    assert.equal(s.tone, "fast");
    assert.equal(s.headline, "Going fast: only 20 groups left");
});

test("under 10 left, or under 15% of a big stock: almost gone", () => {
    assert.equal(m(40, 31)!.tone, "last");
    assert.equal(m(40, 31)!.headline, "Almost gone: only 9 groups left");
    assert.equal(m(1000, 880)!.tone, "last", "120 of 1000 is 12%");
    assert.equal(m(1000, 840)!.tone, "fast", "160 of 1000 is 16%");
});

test("the very last one is said in the singular", () => {
    const s = m(40, 39)!;
    assert.equal(s.headline, "Last one: only 1 group left");
    assert.equal(s.tone, "last");
});

test("tiny stock heats up straight away; garbage input never produces nonsense", () => {
    assert.equal(m(5, 1)!.tone, "last");
    const s = stockMeter({ quantity_available: "40" as any, quantity_sold: "-3" as any }, group)!;
    assert.equal(s.remaining, 40);
});
