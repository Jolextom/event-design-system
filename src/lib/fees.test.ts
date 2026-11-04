// Run with:  npm test   (node:test, no extra dependencies; Node 22.6+)
import test from "node:test";
import assert from "node:assert/strict";
import { computeCharge, normalizeFeeConfig, paystackFeeKobo } from "./fees.ts";

const on = (extra: object = {}) => ({ enabled: true, ...extra });

test("Paystack fee: 1.5% + ₦100, flat waived under ₦2,500, capped at ₦2,000", () => {
    assert.equal(paystackFeeKobo(1_500_000), 22_500 + 10_000); // ₦15,000 -> ₦325
    assert.equal(paystackFeeKobo(250_000 - 1), Math.ceil((250_000 - 1) * 0.015)); // just under ₦2,500: no flat
    assert.equal(paystackFeeKobo(250_000), Math.ceil(250_000 * 0.015) + 10_000); // at ₦2,500: flat applies
    assert.equal(paystackFeeKobo(50_000_000), 200_000); // ₦500,000 hits the cap
    assert.equal(paystackFeeKobo(0), 0);
});

test("no config / disabled / junk => total equals ticket price (legacy behaviour)", () => {
    for (const cfg of [undefined, null, {}, { enabled: false }, { enabled: "yes" }, "x", 5]) {
        const c = computeCharge(15_000, cfg);
        assert.equal(c.applied, false);
        assert.equal(c.totalKobo, 1_500_000);
        assert.equal(c.serviceFeeKobo, 0);
    }
});

test("free ticket never gets a fee", () => {
    const c = computeCharge(0, on({ platform_fee: { flat: 500 } }));
    assert.equal(c.totalKobo, 0);
    assert.equal(c.applied, false);
});

test("pass-through only: organiser gets the price, platform nets ~nothing extra", () => {
    const c = computeCharge(15_000, on());
    assert.equal(c.totalKobo, 1_533_000); // ₦15,330 (₦15,329.95 rounded up to whole naira)
    assert.equal(c.serviceFee, 330);
    assert.ok(c.platformNetKobo >= 0 && c.platformNetKobo < 100, `net ${c.platformNetKobo}`);
    assert.equal(c.organiserKobo, 1_500_000);
});

test("pass-through is the MINIMUM total that covers price + Paystack's cut", () => {
    for (const price of [1_000, 2_400, 2_499, 2_500, 7_500, 15_000, 22_500, 100_000, 250_000, 900_000]) {
        const c = computeCharge(price, on({ round_to: 1 }));
        assert.ok(c.totalKobo - c.paystackFeeKobo >= c.subtotalKobo, `covers @${price}`);
        // one naira less would not cover it (unless that drops below the target by rounding)
        const t = c.totalKobo - 100;
        assert.ok(t - paystackFeeKobo(t) < c.subtotalKobo, `minimal @${price}`);
    }
});

test("platform flat fee on top of pass-through", () => {
    const c = computeCharge(15_000, on({ platform_fee: { flat: 500 } }));
    assert.equal(c.platformFeeKobo, 50_000);
    assert.ok(c.platformNetKobo >= 50_000, "platform keeps at least its fee after Paystack");
    assert.equal(c.totalKobo, c.subtotalKobo + c.serviceFeeKobo);
});

test("percent fee scales with the ticket", () => {
    const single = computeCharge(15_000, on({ platform_fee: { percent: 3 } }));
    const group = computeCharge(22_500, on({ platform_fee: { percent: 3 } }));
    assert.equal(single.platformFeeKobo, 45_000);
    assert.equal(group.platformFeeKobo, 67_500);
});

test("absorbing Paystack's fee: customer pays price + platform fee only; platform net can go negative", () => {
    const c = computeCharge(15_000, on({ pass_processing_fee: false, platform_fee: { flat: 200 } }));
    assert.equal(c.totalKobo, 1_520_000);
    assert.equal(c.platformNetKobo, 20_000 - c.paystackFeeKobo); // ₦200 - ₦328 = negative
    assert.ok(c.platformNetKobo < 0);
});

test("round_to rounds the total up to a clean figure; extra goes to the platform", () => {
    const base = computeCharge(15_000, on({ platform_fee: { flat: 500 } }));
    const rounded = computeCharge(15_000, on({ platform_fee: { flat: 500 }, round_to: 50 }));
    assert.equal(rounded.totalKobo % 5_000, 0);
    assert.ok(rounded.totalKobo >= base.totalKobo && rounded.totalKobo - base.totalKobo < 5_000);
    assert.ok(rounded.platformNetKobo >= base.platformNetKobo);
});

test("config is sanitised: junk values can't produce negative or absurd fees", () => {
    const n = normalizeFeeConfig({ enabled: true, platform_fee: { flat: -50, percent: 9999 }, round_to: 0, label: "   " });
    assert.equal(n?.platform_fee?.flat, 0);
    assert.equal(n?.platform_fee?.percent, 50);
    assert.equal(n?.round_to, 1);
    assert.equal(n?.label, "Service fee");
    const c = computeCharge(15_000, { enabled: true, platform_fee: { flat: "abc" } });
    assert.ok(c.totalKobo >= 1_500_000);
});

test("tiny tickets below the ₦2,500 flat-fee waiver converge correctly", () => {
    const c = computeCharge(1_000, on());
    assert.ok(c.totalKobo - c.paystackFeeKobo >= 100_000);
    assert.ok(c.totalKobo < 100_000 + 5_000);
});
