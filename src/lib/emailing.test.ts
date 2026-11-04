// Run with:  npm test
import test from "node:test";
import assert from "node:assert/strict";
import { isQuestionRelevant, missingRequiredQuestion, type RuleQuestion } from "./answers.ts";
import { rateLimit, resetRateLimits } from "./rateLimit.ts";
import { buildQrCodeUrl } from "./qr.ts";
import {
    renderConfirmationEmailHtml,
    renderInviteEmailHtml,
    renderReminderEmailHtml,
    renderReminderEmailHtmlForTemplate,
} from "./email-templates.ts";
import { emailConfigForTag } from "../app/[tag]/theme.ts";

// ---------------------------------------------------------------- answers
const opt = (id: string, text: string) => ({ id, option_text: text });
const qs: RuleQuestion[] = [
    { id: "phone", title: "Phone", is_required: true },
    { id: "who", title: "Attending as", is_required: true, options: [opt("o1", "Student"), opt("o2", "Professional")] },
    { id: "school", title: "School", is_required: true, show_for_option_id: "o1" },
    { id: "company", title: "Company", is_required: true, show_for_option_id: "o2" },
    { id: "notes", title: "Notes", is_required: false },
    { id: "trigger", title: "Track", is_required: true, is_selection_logic: true },
];

test("required answers: first unanswered required question is reported", () => {
    assert.equal(missingRequiredQuestion(qs, {})?.id, "phone");
    assert.equal(missingRequiredQuestion(qs, { phone: "1" })?.id, "who");
});

test("required answers: empty strings and empty checkbox lists count as unanswered; 0 does not", () => {
    assert.equal(missingRequiredQuestion(qs, { phone: "" })?.id, "phone");
    assert.equal(missingRequiredQuestion([{ id: "c", title: "C", is_required: true }], { c: [] })?.id, "c");
    assert.equal(missingRequiredQuestion([{ id: "s", title: "S", is_required: true }], { s: 0 }), null);
});

test("required answers: track-gated questions only apply to their track; selection-logic questions are never asked here", () => {
    assert.equal(missingRequiredQuestion(qs, { phone: "1", who: "Student" })?.id, "school");
    assert.equal(missingRequiredQuestion(qs, { phone: "1", who: "Professional" })?.id, "company");
    assert.equal(missingRequiredQuestion(qs, { phone: "1", who: "Student", school: "UNILAG" }), null);
});

test("relevance: a stale link fails closed", () => {
    assert.equal(isQuestionRelevant(qs, { id: "x", title: "X", show_for_option_id: "ghost" }, {}), false);
    assert.equal(isQuestionRelevant(qs, qs[2], { who: "Student" }), true);
    assert.equal(isQuestionRelevant(qs, qs[2], { who: "Professional" }), false);
});

// ------------------------------------------------------------ rate limit
test("rate limit: allows N in the window, then blocks with a retry time, then recovers", () => {
    resetRateLimits();
    const t0 = 1_000_000;
    for (let i = 0; i < 3; i++) assert.equal(rateLimit("k", 3, 60_000, t0 + i).ok, true);
    const blocked = rateLimit("k", 3, 60_000, t0 + 10);
    assert.equal(blocked.ok, false);
    assert.ok(blocked.retryAfterSec >= 59 && blocked.retryAfterSec <= 60);
    assert.equal(rateLimit("other", 3, 60_000, t0 + 10).ok, true, "different callers are independent");
    assert.equal(rateLimit("k", 3, 60_000, t0 + 61_000).ok, true, "window passed");
});

// ------------------------------------------------------- email branding
test("only events with their own email identity get one (existing events keep the old behaviour)", () => {
    const cfg = emailConfigForTag("main-character-fest-2026-ab3d");
    assert.equal(cfg?.brandName, "Campus Yo-Pro Ministry");
    assert.equal(cfg?.fromName, "Main Character Fest");
    assert.equal(emailConfigForTag("main-character-fest-2026-test-9zq1")?.brandName, "Campus Yo-Pro Ministry");
    assert.equal(emailConfigForTag("ai-for-africas-education-summit-x7fq"), undefined);
    assert.equal(emailConfigForTag("young-professionals-hangout-24-x7fq"), undefined);
    assert.equal(emailConfigForTag(null), undefined);
});

// ------------------------------------------------------------ the emails
const base = {
    eventTitle: "Main Character Fest 2026",
    eventDate: "Saturday, December 19, 2026",
    eventLocation: "16/18 Akanbi Onitiri Close, off Eric Moore, Surulere",
    attendeeName: "Ada",
    orderRef: "EF-MAIN-ORDER-1",
    receiptLink: "https://example.com/receipt/EF-MAIN-ORDER-1",
};
const FOREIGN = /Kini|AAES|UNILAG|kini-ai\.com|Faculty of (Social Sciences|Education)/i;

test("confirmation carries the attendee's OWN check-in pass (QR + code) when given", () => {
    const ref = "EF-MAIN-CHARACTER-FEST-A1B2C3D4";
    const html = renderConfirmationEmailHtml({ ...base, checkInRef: ref, qrCodeUrl: buildQrCodeUrl(ref), brandName: "Campus Yo-Pro Ministry" });
    assert.ok(html.includes("Your check-in pass"));
    assert.ok(html.includes(`data=${encodeURIComponent(ref)}`), "QR encodes the check-in code");
    assert.ok(html.includes(ref), "code is also printed as text");
    assert.ok(html.includes("Campus Yo-Pro Ministry"));
});

test("confirmation without a check-in code is unchanged (no empty pass block)", () => {
    const html = renderConfirmationEmailHtml(base);
    assert.ok(!html.includes("Your check-in pass"));
});

test("generic emails never mention another brand's name, venue or domain", () => {
    const ref = "EF-X-1";
    const params = { ...base, checkInRef: ref, qrCodeUrl: buildQrCodeUrl(ref), brandName: "Campus Yo-Pro Ministry" };
    assert.doesNotMatch(renderConfirmationEmailHtml(params), FOREIGN);
    assert.doesNotMatch(renderReminderEmailHtml(params), FOREIGN);
    assert.doesNotMatch(renderReminderEmailHtmlForTemplate(null, params), FOREIGN);
    assert.doesNotMatch(
        renderInviteEmailHtml({ eventTitle: base.eventTitle, eventDate: base.eventDate, eventLocation: base.eventLocation, inviterName: "Joseph", passType: "Group of 3", inviteLink: "https://x/join/1", brandName: "Campus Yo-Pro Ministry" }),
        FOREIGN
    );
});

test("reminder: shows the code, links the REAL venue to maps, and the Kini design is only used when asked for", () => {
    const params = { ...base, checkInRef: "EF-REF-9", qrCodeUrl: buildQrCodeUrl("EF-REF-9"), brandName: "Campus Yo-Pro Ministry" };
    const generic = renderReminderEmailHtmlForTemplate(undefined, params);
    assert.ok(generic.includes("EF-REF-9") && generic.includes("create-qr-code"));
    assert.ok(generic.includes(encodeURIComponent(base.eventLocation)), "maps link uses this event's venue");
    const kini = renderReminderEmailHtmlForTemplate("kini_summit", params);
    assert.match(kini, /AAES/, "events that explicitly use the Kini template keep it");
});

test("anything typed by a guest or organiser is escaped in the new templates", () => {
    const html = renderReminderEmailHtml({
        ...base,
        eventTitle: `<script>alert(1)</script> & "Fest"`,
        attendeeName: `<img src=x onerror=alert(1)>`,
        checkInRef: "EF-1",
        qrCodeUrl: buildQrCodeUrl("EF-1"),
    });
    assert.ok(!html.includes("<script>alert(1)</script>"));
    assert.ok(!html.includes("<img src=x onerror"));
    assert.ok(html.includes("&lt;script&gt;"));
});
