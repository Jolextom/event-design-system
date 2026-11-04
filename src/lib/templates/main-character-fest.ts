import type { EventTemplate, TemplateInput } from "./types";

/**
 * Main Character Fest 2026 (Campus Yo-Pro Ministry).
 *
 * `description` and `questions` mirror events/main-character-fest-2026/
 * (description.html, registration-questions.json), which the command-line
 * script scripts/seed-main-character-fest.js reads. A test
 * (src/lib/templates/templates.test.ts) fails if the two ever drift apart.
 */
const SUBACCOUNT_INPUT: TemplateInput = {
    key: "subaccount",
    label: "Organiser's Paystack subaccount code (optional)",
    type: "text",
    pattern: "^ACCT_[A-Za-z0-9]+$",
    patternMessage: "That doesn't look like a subaccount code. It looks like ACCT_xxxxxxxxxx.",
    hint: "Leave empty to receive all payments in your own Paystack account. With a code, the organiser is paid the ticket price directly and you keep the fee. Use a TEST code on the test key and a LIVE code on the live key.",
};

export const mainCharacterFest: EventTemplate = {
    id: "main-character-fest-2026",
    name: "Main Character Fest 2026",
    summary: "Campus Yo-Pro Ministry · Sat 19 Dec 2026 · Surulere",
    title: "Main Character Fest 2026",
    date: "2026-12-19",
    startTime: "10:00",
    tzOffset: "+01:00",
    location: "16/18 Akanbi Onitiri Close, off Eric Moore, Surulere",
    coverPath: "/events/main-character-fest/cover.jpg",
    description: `<p><strong>This December, you're not an extra… you're the main character!</strong></p>
<p>Campus students and young professionals, your moment is calling. Pull up with your squad, step out in your favourite character-inspired outfit, and bring the energy to Main Character Fest.</p>
<ul>
<li>Live DJ</li>
<li>Costume Party</li>
<li>Assorted Games</li>
<li>Exhibition Booths</li>
<li>Lots to Chow</li>
</ul>
<p>Whether you're rocking superhero armour, a legendary movie look, or your own signature style, come ready to make memories, meet people, and give December a plot twist.</p>
<p><strong>Dress code:</strong> your favourite movie character.</p>
<p><strong>Bring your main character energy!</strong></p>`,
    inputs: [
        { key: "endTime", label: "Event end time (Lagos)", type: "time", required: true, hint: "Not decided yet? Put a placeholder, you can change it later in Basic Info." },
    ],
    // ₦500 flat on top of the ticket price, plus Paystack's own fee passed on to the buyer, rounded up
    // to the next ₦50 so totals look clean. Customers see ONE "Service fee" line.
    feeConfig: { enabled: true, pass_processing_fee: true, platform_fee: { flat: 500 }, round_to: 50, label: "Service fee" },
    questions: [
    { page: 1, title: "Phone number (WhatsApp preferred)", type: "text", required: true },
    { page: 1, title: "Are you attending as a", type: "select", required: true, options: ["Campus student", "Young professional", "Other"], property_key: "attending_as" },
    { page: 1, title: "School or organisation name", type: "text", required: true },
    { page: 1, title: "Region (e.g. Lagos Mainland, Lagos Island, Abuja)", type: "text", required: true, property_key: "region" },
    { page: 1, title: "Gender", type: "select", required: true, options: ["Male", "Female"], property_key: "gender" },
    { page: 1, title: "Which character are you coming as?", type: "text", required: false, property_key: "character_name" },
    { page: 1, title: "Which movie or franchise is your character from?", type: "text", required: false, property_key: "franchise" },
    { page: 1, title: "Squad or group name (if you're coming with others)", type: "text", required: false, property_key: "squad_name" },
    { page: 1, title: "Is this your first Campus Yo-Pro event?", type: "select", required: true, options: ["Yes, first time", "No, I've been before"], property_key: "first_timer" },
    { page: 1, title: "Any food allergies or dietary needs we should know about? (Type 'None' if not)", type: "text", required: false },
    { page: 1, title: "Consent for photographs or video taken on the day to be used in event reporting and promotion", type: "select", required: true, options: ["Yes, I consent"] },
    ],
    variants: [
        {
            id: "test",
            label: "Test copy",
            hint: "A separate throwaway event titled (TEST) with ₦100, ₦300 and free tickets, for trying payments over and over.",
            titleSuffix: " (TEST)",
            feeInput: "testFee",
            subaccountInput: "subaccount",
            inputs: [
                { key: "testFee", label: "Also charge the ₦500 service fee (to try the real checkout)", type: "checkbox", defaultValue: "" },
                SUBACCOUNT_INPUT,
            ],
            passes: [
                { title: "TEST single (₦100)", description: "Test ticket - not for sale", price: 100, type: "individual", quantity: 1000 },
                { title: "TEST group of 3 (₦300)", description: "Test ticket - not for sale", price: 300, type: "group", groupSize: 3, quantity: 1000 },
                { title: "TEST free", description: "Test ticket - not for sale", price: 0, type: "individual", quantity: 1000 },
            ],
        },
        {
            id: "real",
            label: "Real event",
            hint: "The real thing: Single ₦15,000 and Group of 3 ₦22,500 (50% off promo), promo while stock lasts, and the registration close date below. Stays a draft until you launch it.",
            registrationClosesInput: "registrationCloses",
            feeInput: "addFee",
            subaccountInput: "subaccount",
            inputs: [
                { key: "addFee", label: "Add the ₦500 service fee", type: "checkbox", defaultValue: "true", hint: "Customers pay the ticket price + Paystack's fee + ₦500, shown as ONE \"Service fee\" line at checkout. The organiser receives the full ticket price." },
                SUBACCOUNT_INPUT,
                { key: "singleQty", label: "Single tickets available", type: "number", required: true, hint: "How many single tickets can be sold." },
                { key: "groupQty", label: "Group-of-3 tickets available", type: "number", required: true, hint: "How many groups of 3 can be sold (each group is 3 people). The 50% promo runs while these last; when they are gone the ticket shows as sold out." },
                { key: "registrationCloses", label: "Registration closes (Lagos time)", type: "datetime", defaultValue: "2026-12-10T23:59", required: true, hint: "The time of day wasn't specified, so 11:59 PM is assumed. Change it if needed." },
            ],
            passes: [
                { title: "Single", description: "One person", price: 15000, type: "individual", quantity: { input: "singleQty" } },
                { title: "Group of 3", description: "Come as a squad. ₦7,500 each, 50% off while stock lasts.", price: 22500, type: "group", groupSize: 3, quantity: { input: "groupQty" } },
            ],
        },
    ],
};
