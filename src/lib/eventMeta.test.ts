import { test } from "node:test";
import assert from "node:assert/strict";
import { metaForTag, brandNameForTag, isTestTag, resolveTheme, DEFAULT_THEME } from "../app/[tag]/theme.ts";

test("Main Character Fest has its own tab title and a search/share description of sensible length", () => {
    const m = metaForTag("main-character-fest-2026-ab3d");
    assert.ok(m);
    assert.equal(m.title, "Main Character Fest 2026");
    assert.equal(m.noindex, false);
    assert.ok(m.description.length <= 160, `description is ${m.description.length} chars`);
    for (const must of ["19 Dec 2026", "Surulere", "costume"]) assert.ok(m.description.includes(must), must);
    assert.ok(!/eventflow|premium/i.test(`${m.title} ${m.description} ${m.siteName}`));
});

test("a test copy is labelled and kept out of search engines", () => {
    const m = metaForTag("main-character-fest-2026-test-fbdf");
    assert.ok(m);
    assert.equal(m.title, "[Test] Main Character Fest 2026");
    assert.equal(m.noindex, true);
    assert.equal(isTestTag("main-character-fest-2026-ab3d"), false);
    assert.equal(isTestTag("some-contest-event"), false, "'test' inside a word is not a test copy");
    assert.equal(isTestTag("my-event-test"), true);
});

test("other events are untouched: no custom meta, platform name kept", () => {
    for (const tag of ["kini-ai-summit", "random-event", "", null, undefined]) {
        assert.equal(metaForTag(tag), null, String(tag));
        assert.equal(brandNameForTag(tag), "EventFlow");
        assert.equal(resolveTheme(tag), DEFAULT_THEME);
    }
});

test("Main Character Fest pages show the event's name where EventFlow would be", () => {
    assert.equal(brandNameForTag("main-character-fest-2026-ab3d"), "Main Character Fest");
});

test("Main Character Fest: no invites, and a short code of conduct (expected behaviour + dress code only)", async () => {
    const { invitesAllowedForTag } = await import("../app/[tag]/theme.ts");
    assert.equal(invitesAllowedForTag("main-character-fest-2026-ab3d"), false);
    assert.equal(invitesAllowedForTag("kini-ai-summit"), true, "other events keep invites");
    assert.equal(invitesAllowedForTag(null), true);
    const c = resolveTheme("main-character-fest-2026").conduct;
    assert.ok(c);
    assert.deepEqual(c.sections.map((s) => s.heading), ["Expected behaviour", "Dress code"]);
    assert.equal(c.sections[0].items.length, 6);
    assert.ok(c.sections[1].items.some((i) => /revealing or sexually suggestive/.test(i)));
    assert.match(c.sections[1].intro ?? "", /modest/);
    assert.match(c.agreeLabel, /agree/i);
    assert.equal(resolveTheme("kini-ai-summit").conduct, undefined, "no conduct box on other events");
});

test("the WhatsApp group link: clean URL for the real event only, never for test copies or other events", async () => {
    const { communityForTag } = await import("../app/[tag]/theme.ts");
    const c = communityForTag("main-character-fest-2026-ab3d");
    assert.ok(c);
    assert.match(c.url, /^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]{15,}$/, "clean invite link, no tracking parameters");
    assert.equal(communityForTag("main-character-fest-2026-test-fbdf"), undefined, "test registrations don't get the real group");
    assert.equal(communityForTag("kini-ai-summit"), undefined);
    assert.equal(communityForTag(null), undefined);
});

test("the confirmation email carries the group button only when the event has one", async () => {
    const { renderConfirmationEmailHtml } = await import("./email-templates.ts");
    const base = { eventTitle: "Fest", eventDate: "d", eventLocation: "l", orderRef: "EF-1", receiptLink: "https://x/r", attendeeName: "Ada" };
    const withGroup = renderConfirmationEmailHtml({ ...base, community: { label: "Join the group", url: "https://chat.whatsapp.com/ABC123", note: "Please don't share <this>." } });
    assert.ok(withGroup.includes('href="https://chat.whatsapp.com/ABC123"'));
    assert.ok(withGroup.includes("Join the group"));
    assert.ok(withGroup.includes("Please don&#39;t share") || withGroup.includes("Please don't share"));
    assert.ok(!withGroup.includes("<this>"), "text is escaped");
    assert.ok(!renderConfirmationEmailHtml(base).includes("chat.whatsapp.com"));
});
