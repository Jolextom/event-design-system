import { test } from "node:test";
import assert from "node:assert/strict";
import { stockMeter } from "./stockMeter.ts";

const group = { singular: "group", plural: "groups" };
const m = (available: number | null, sold: number | null) => stockMeter({ quantity_available: available, quantity_sold: sold }, group);

test("no meter without a limit, or when sold out, or oversold", () => {
    assert.equal(m(null, 5), null);
    assert.equal(m(0, 0), null);
    assert.equal(m(40, 40), null);
    assert.equal(m(40, 43), null);
});

test("plenty left: calm headline with the real numbers, bar shows what's gone", () => {
    const s = m(40, 4)!;
    assert.equal(s.tone, "calm");
    assert.equal(s.headline, "36 of 40 groups left");
    assert.equal(s.percentClaimed, 10);
    assert.equal(s.note, null, "too few claimed to brag about");
});

test("half gone: going fast, with social proof", () => {
    const s = m(40, 20)!;
    assert.equal(s.tone, "fast");
    assert.equal(s.headline, "Going fast: only 20 groups left");
    assert.equal(s.percentClaimed, 50);
    assert.equal(s.note, "20 groups already claimed");
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

test("tiny stock: never claims more than there is", () => {
    const s = m(5, 1)!;
    assert.equal(s.remaining, 4);
    assert.equal(s.tone, "last");
    assert.equal(s.claimed, 1);
    assert.equal(s.note, null);
});

test("garbage in (strings from the database, negatives) never produces nonsense", () => {
    const s = stockMeter({ quantity_available: "40" as any, quantity_sold: "-3" as any }, group)!;
    assert.equal(s.remaining, 40);
    assert.equal(s.percentClaimed, 0);
});
