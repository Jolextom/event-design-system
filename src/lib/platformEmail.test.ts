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

import { defaultReplyTo, isPlatformFrom, parseOptionalEmail } from "./platformEmail.ts";

test("the support address is optional and validated (nothing is guessed or hard-coded)", () => {
    assert.equal(parseOptionalEmail(undefined), null);
    assert.equal(parseOptionalEmail("not an email"), null);
    assert.equal(parseOptionalEmail("help@example.org"), "help@example.org");
    assert.equal(parseOptionalEmail("Support <help@example.org>"), "help@example.org");
});

test("Reply-To defaults to the support address for platform-sent mail only, never for an organiser's own domain", () => {
    const platform = "noreply@jolextom.com";
    assert.equal(defaultReplyTo(undefined, "help@example.org", platform), "help@example.org");
    assert.equal(defaultReplyTo("EventFlow <noreply@jolextom.com>", "help@example.org", platform), "help@example.org");
    assert.equal(defaultReplyTo("Main Character Fest <NOREPLY@jolextom.com>", "help@example.org", platform), "help@example.org");
    assert.equal(defaultReplyTo("Kini AI <noreply@kini-ai.com>", "help@example.org", platform), undefined, "another brand's replies must not land with the platform");
    assert.equal(defaultReplyTo(undefined, null, platform), undefined, "no support address set: no Reply-To");
    assert.equal(isPlatformFrom("Someone <x@other.com>", platform), false);
});

test("the email footer shows the support line only when there is an address, and escapes it", async () => {
    const { renderConfirmationEmailHtml, renderInviteEmailHtml, renderReminderEmailHtml } = await import("./email-templates.ts");
    const base = { eventTitle: "Fest", eventDate: "d", eventLocation: "l" };
    const conf = { ...base, orderRef: "EF-1", receiptLink: "https://x/r", attendeeName: "Ada" };
    const inv = { ...base, inviterName: "Bo", passType: "General", inviteLink: "https://x/i" };
    const rem = { ...base, attendeeName: "Ada", checkInRef: "R", qrCodeUrl: "https://x/q" };
    for (const [name, html, none] of [
        ["confirmation", renderConfirmationEmailHtml({ ...conf, supportEmail: "help@example.org" }), renderConfirmationEmailHtml(conf)],
        ["invite", renderInviteEmailHtml({ ...inv, supportEmail: "help@example.org" }), renderInviteEmailHtml(inv)],
        ["reminder", renderReminderEmailHtml({ ...rem, supportEmail: "help@example.org" }), renderReminderEmailHtml(rem)],
    ] as const) {
        assert.ok(html.includes('href="mailto:help@example.org"'), `${name}: support link`);
        assert.match(html, /Questions or a problem\? Reply to this email/, name);
        assert.ok(!none.includes("Questions or a problem?"), `${name}: no line without an address`);
    }
    assert.ok(!renderConfirmationEmailHtml({ ...conf, supportEmail: '"><script>x</script>' }).includes("<script>x</script>"), "escaped");
});
