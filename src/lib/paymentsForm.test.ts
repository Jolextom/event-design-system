// Run with:  npm test
import test from "node:test";
import assert from "node:assert/strict";
import { FEE_DEFAULTS, formFromEvent, paymentWarnings, previewRows, validatePayments, type PaymentsFormValues } from "./paymentsForm.ts";

const FEE_500 = { enabled: true, pass_processing_fee: true, platform_fee: { flat: 500 }, round_to: 50, label: "Service fee" };
const passes = [{ title: "Single", price: 15000, is_free: false }, { title: "Group of 3", price: 22500, is_free: false }, { title: "Free", price: 0, is_free: true }];
const base = (over: Partial<PaymentsFormValues> = {}): PaymentsFormValues => ({ ...formFromEvent(null, null), ...over });

test("an event with no settings loads as: no payout code, fee off, the ₦500 decision ready to switch on", () => {
    const f = formFromEvent(null, null);
    assert.deepEqual([f.payoutCode, f.feeOn, f.flat, f.roundTo, f.passProcessing, f.label], ["", false, FEE_DEFAULTS.flat, "50", true, "Service fee"]);
});

test("an event with the ₦500 fee loads exactly as stored", () => {
    const f = formFromEvent(FEE_500, "ACCT_abc123");
    assert.deepEqual([f.payoutCode, f.feeOn, f.flat, f.percent, f.roundTo, f.passProcessing], ["ACCT_abc123", true, "500", "0", "50", true]);
});

test("saving what loaded gives back the same settings (no accidental changes)", () => {
    const v = validatePayments(formFromEvent(FEE_500, "ACCT_abc123"));
    assert.equal(v.ok, true);
    if (v.ok) { assert.deepEqual(v.feeConfig, { ...FEE_500, platform_fee: { flat: 500, percent: 0 } }); assert.equal(v.payoutCode, "ACCT_abc123"); }
});

test("fee off clears the fee settings; an empty payout code clears the code", () => {
    const v = validatePayments(base({ feeOn: false, payoutCode: "   " }));
    assert.deepEqual(v, { ok: true, feeConfig: null, payoutCode: null });
});

test("validation: payout code format, fee ranges, rounding choice, label", () => {
    assert.equal(validatePayments(base({ payoutCode: "acct_lower" })).ok, false);
    assert.equal(validatePayments(base({ payoutCode: "my bank" })).ok, false);
    assert.equal(validatePayments(base({ payoutCode: "ACCT_ok1" })).ok, true);
    assert.equal(validatePayments(base({ feeOn: true, flat: "-5" })).ok, false);
    assert.equal(validatePayments(base({ feeOn: true, flat: "abc" })).ok, false);
    assert.equal(validatePayments(base({ feeOn: true, flat: "999999" })).ok, false);
    assert.equal(validatePayments(base({ feeOn: true, percent: "80" })).ok, false);
    assert.equal(validatePayments(base({ feeOn: true, roundTo: "7" })).ok, false);
    assert.equal(validatePayments(base({ feeOn: true, label: "   " })).ok, false);
    assert.equal(validatePayments(base({ feeOn: true, label: "x".repeat(41) })).ok, false);
    assert.equal(validatePayments(base({ feeOn: true, flat: "", percent: "" })).ok, true, "blank means 0");
});

test("preview shows the figures we told the organisers: ₦15,850 / ₦23,500, we keep ~₦512 / ~₦548, organiser gets the full price", () => {
    const rows = previewRows(formFromEvent(FEE_500, "ACCT_abc123"), passes);
    assert.equal(rows.length, 2, "free tickets are not listed");
    assert.deepEqual([rows[0].price, rows[0].serviceFee, rows[0].total, rows[0].organiser], [15000, 850, 15850, 15000]);
    assert.deepEqual([rows[1].price, rows[1].serviceFee, rows[1].total, rows[1].organiser], [22500, 1000, 23500, 22500]);
    assert.ok(Math.abs(rows[0].youKeep - 512.25) < 0.01 && Math.abs(rows[1].youKeep - 547.5) < 0.01);
});

test("preview is empty while the form is invalid (never shows nonsense numbers)", () => {
    assert.deepEqual(previewRows(base({ feeOn: true, flat: "abc" }), passes), []);
});

test("WARNING: payout code with no fee means Paystack's fee comes out of your pocket", () => {
    const w = paymentWarnings(base({ payoutCode: "ACCT_abc", feeOn: false }), passes);
    assert.equal(w.length, 1); assert.equal(w[0].level, "warn");
    assert.match(w[0].text, /YOUR own account/); assert.match(w[0].text, /₦325 on a ₦15,000 ticket/);
});

test("no warning when payout code + fee are both set (the intended setup)", () => {
    assert.deepEqual(paymentWarnings(formFromEvent(FEE_500, "ACCT_abc123"), passes), []);
});

test("info (not a warning) when the fee is on but there's no payout code", () => {
    const w = paymentWarnings(base({ feeOn: true }), passes);
    assert.equal(w.length, 1); assert.equal(w[0].level, "info"); assert.match(w[0].text, /pay the organiser yourself/);
});

test("WARNING: absorbing Paystack's fee with a too-small platform fee loses money per sale", () => {
    const w = paymentWarnings(base({ payoutCode: "ACCT_abc", feeOn: true, flat: "100", passProcessing: false }), passes);
    assert.ok(w.some((x) => x.level === "warn" && /lose/.test(x.text)), JSON.stringify(w));
});

test("nothing to warn about with no payout code and no fee", () => {
    assert.deepEqual(paymentWarnings(base(), passes), []);
});
