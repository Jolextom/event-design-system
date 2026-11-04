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
