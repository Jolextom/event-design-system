import { test } from "node:test";
import assert from "node:assert/strict";
import { parsePlatformAddress, platformFrom, DEFAULT_PLATFORM_FROM_ADDRESS } from "./platformEmail.ts";

test("the default sending address is on jolextom.com, not the expired domain", () => {
    assert.equal(DEFAULT_PLATFORM_FROM_ADDRESS, "noreply@jolextom.com");
    assert.ok(!/partiesandeventz/.test(DEFAULT_PLATFORM_FROM_ADDRESS));
});

test("the setting can override it, as a bare address or as 'Name <address>'", () => {
    assert.equal(parsePlatformAddress("hello@mail.example.org"), "hello@mail.example.org");
    assert.equal(parsePlatformAddress("  hello@mail.example.org  "), "hello@mail.example.org");
    assert.equal(parsePlatformAddress("Events <hello@mail.example.org>"), "hello@mail.example.org");
});

test("a missing or unusable setting falls back to the default instead of breaking every email", () => {
    for (const bad of [undefined, null, "", "   ", "not an email", "a@b", "two@@x.com", "<>"]) assert.equal(parsePlatformAddress(bad as any), DEFAULT_PLATFORM_FROM_ADDRESS, String(bad));
});

test("From lines", () => {
    assert.equal(platformFrom("Main Character Fest", "noreply@jolextom.com"), "Main Character Fest <noreply@jolextom.com>");
    assert.match(platformFrom(), /^EventFlow <[^@\s]+@[^@\s]+>$/);
});
