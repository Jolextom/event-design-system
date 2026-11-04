import { test } from "node:test";
import assert from "node:assert/strict";
import { checkNewPassword, passwordStrength, MIN_PASSWORD_LENGTH } from "./passwordRules.ts";

const base = { current: "old-secret-1", confirm: "", email: "goldenprince724@gmail.com" };
const check = (next: string, confirm = next, extra = {}) => checkNewPassword({ ...base, next, confirm, ...extra });

test("a long, unrelated passphrase passes", () => {
    const r = check("purple-mango-staircase-42");
    assert.deepEqual(r, { ok: true, problems: [] });
});

test("too short is refused with the length stated", () => {
    const r = check("Sh0rt!pw");
    assert.equal(r.ok, false);
    assert.match(r.problems[0], new RegExp(String(MIN_PASSWORD_LENGTH)));
});

test("common and patterned passwords are refused even when long enough", () => {
    for (const pw of ["password2026", "Password123!", "1234567890", "abcdefghij", "aaaaaaaaaaaa", "qwertyuiop12", "EventFlow2026"])
        assert.equal(check(pw).ok, false, pw);
});

test("a password built from the email name is refused", () => {
    const r = check("goldenprince724-rocks");
    assert.equal(r.ok, false);
    assert.ok(r.problems.some((p) => /email/.test(p)));
});

test("the new password must differ from the current one", () => {
    const r = checkNewPassword({ current: "purple-mango-staircase-42", next: "purple-mango-staircase-42", confirm: "purple-mango-staircase-42", email: "a@b.com" });
    assert.equal(r.ok, false);
    assert.ok(r.problems.some((p) => /different/.test(p)));
});

test("the two new passwords must match", () => {
    const r = check("purple-mango-staircase-42", "purple-mango-staircase-4");
    assert.equal(r.ok, false);
    assert.ok(r.problems.some((p) => /match/.test(p)));
});

test("nothing is flagged on an empty form, but it is not ok either", () => {
    const r = checkNewPassword({ current: "", next: "", confirm: "", email: "a@b.com" });
    assert.deepEqual(r, { ok: false, problems: [] });
    assert.equal(check("purple-mango-staircase-42", "").ok, false, "confirmation is required");
    assert.equal(checkNewPassword({ ...base, current: "", next: "purple-mango-staircase-42", confirm: "purple-mango-staircase-42" }).ok, false, "current password is required");
});

test("strength meter: short/common is lowest, longer mixed passphrases score higher", () => {
    assert.equal(passwordStrength("short").score, 0);
    assert.equal(passwordStrength("password2026").score, 0);
    const fair = passwordStrength("purplemango");
    const strong = passwordStrength("Purple-Mango-Staircase-42!");
    assert.ok(fair.score >= 1 && strong.score > fair.score, JSON.stringify({ fair, strong }));
});
