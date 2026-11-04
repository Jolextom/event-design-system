import { test } from "node:test";
import assert from "node:assert/strict";
import { openPaystackPopup } from "./paystackPopup.ts";

type CB = { onLoad?: () => void; onSuccess?: (t: { reference?: string }) => void; onCancel?: () => void; onError?: (e: { message?: string }) => void };
function fake(script: (code: string, cb: CB) => void) {
    const seen: string[] = [];
    class Pop { resumeTransaction(code: string, cb: CB) { seen.push(code); script(code, cb); } }
    return { load: async () => ({ default: Pop as any }), seen };
}
const record = () => {
    const log: string[] = [];
    return { log, h: { onSuccess: (r?: string) => log.push(`success:${r}`), onCancel: () => log.push("cancel"), onFallback: () => log.push("fallback") } };
};

test("no access code: goes straight to the redirect fallback", async () => {
    const { h, log } = record();
    await openPaystackPopup(undefined, h, { load: fake(() => {}).load });
    assert.deepEqual(log, ["fallback"]);
});

test("opens the popup for THAT access code, and reports a successful payment once", async () => {
    const { h, log } = record();
    const f = fake((_c, cb) => { cb.onLoad?.(); cb.onSuccess?.({ reference: "EF-1" }); cb.onSuccess?.({ reference: "EF-1" }); });
    await openPaystackPopup("ac_123", h, { load: f.load });
    assert.deepEqual(f.seen, ["ac_123"]);
    assert.deepEqual(log, ["success:EF-1"]);
});

test("closing the popup is reported as a cancel, not a fallback", async () => {
    const { h, log } = record();
    await openPaystackPopup("ac", h, { load: fake((_c, cb) => { cb.onLoad?.(); cb.onCancel?.(); }).load });
    assert.deepEqual(log, ["cancel"]);
});

test("the form fails to load -> redirect fallback (and nothing else fires afterwards)", async () => {
    const { h, log } = record();
    await openPaystackPopup("ac", h, { load: fake((_c, cb) => { cb.onError?.({ message: "x" }); cb.onCancel?.(); }).load });
    assert.deepEqual(log, ["fallback"]);
});

test("an error AFTER the form was showing counts as closing it, not a second payment page", async () => {
    const { h, log } = record();
    await openPaystackPopup("ac", h, { load: fake((_c, cb) => { cb.onLoad?.(); cb.onError?.({}); }).load });
    assert.deepEqual(log, ["cancel"]);
});

test("the script can't be loaded (blocked/offline) or throws -> redirect fallback", async () => {
    for (const load of [async () => { throw new Error("blocked"); }, fake(() => { throw new Error("boom"); }).load]) {
        const { h, log } = record();
        await openPaystackPopup("ac", h, { load: load as any });
        assert.deepEqual(log, ["fallback"]);
    }
});

test("Paystack never answers: after the timeout we fall back to the redirect", async () => {
    const { h, log } = record();
    await openPaystackPopup("ac", h, { load: fake(() => {}).load, loadTimeoutMs: 30 });
    await new Promise((r) => setTimeout(r, 80));
    assert.deepEqual(log, ["fallback"]);
});

test("once the form has loaded, the timeout no longer triggers a redirect", async () => {
    const { h, log } = record();
    await openPaystackPopup("ac", h, { load: fake((_c, cb) => cb.onLoad?.()).load, loadTimeoutMs: 30 });
    await new Promise((r) => setTimeout(r, 80));
    assert.deepEqual(log, []);
});
