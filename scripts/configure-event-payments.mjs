/**
 * Configure an event's tickets, deadlines, fees and organiser payout from a JSON
 * file. Works for ANY event on the platform (not just one): the file says what
 * should be true, the script makes it so. Re-runnable.
 *
 * Usage (Node 22.6+; add --experimental-strip-types if older than 22.18):
 *   node scripts/configure-event-payments.mjs <event-tag> <config.json>            preview only
 *   node scripts/configure-event-payments.mjs <event-tag> <config.json> --apply    write it
 *
 * Needs (same as the other scripts):
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * and the migration at the bottom of supabase/schema.sql applied once.
 *
 * Config file (every top-level key is optional; only keys you include are changed):
 * {
 *   "registration_closes_at": "2026-12-10T23:59:00+01:00",   // after this nobody can register
 *   "paystack_subaccount_code": "ACCT_xxxxxxxxxx",            // organiser's Paystack subaccount; omit/null = no split
 *   "fee_config": {                                           // omit/null/enabled:false = no fee (price only)
 *     "enabled": true,
 *     "pass_processing_fee": true,                            // customer also pays Paystack's fee (default true)
 *     "platform_fee": { "flat": 500, "percent": 0 },          // your fee on top of the ticket price
 *     "round_to": 50,                                         // round totals up to a multiple of this many naira
 *     "label": "Service fee"                                  // what customers see
 *   },
 *   "passes": [                                               // matched to existing tickets by title; created if new
 *     { "title": "Single", "price": 15000, "type": "individual", "quantity_available": 120 },
 *     { "title": "Group of 3", "price": 22500, "type": "group", "group_size": 3,
 *       "quantity_available": 40, "sales_end_at": "2026-11-30T23:55:00+01:00" }
 *   ]
 * }
 * Use +01:00 for Lagos time. Ticket prices of tickets that already sold are never changed.
 */

import fs from "node:fs";

let fees;
try {
    fees = await import("../src/lib/fees.ts");
} catch (err) {
    console.error("Could not load src/lib/fees.ts. Use Node 22.6+ and run with --experimental-strip-types if needed.");
    console.error(String(err.message || err));
    process.exit(1);
}
const { computeCharge, normalizeFeeConfig } = fees;

const [tag, file] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const apply = process.argv.includes("--apply");
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const die = (m) => {
    console.error(m);
    process.exit(1);
};
if (!tag || !file) die("Usage: node scripts/configure-event-payments.mjs <event-tag> <config.json> [--apply]");

let cfg;
try {
    cfg = JSON.parse(fs.readFileSync(file, "utf8"));
} catch (e) {
    die(`Could not read ${file}: ${e.message}`);
}

// ---------- validate the file before touching anything ----------
const problems = [];
const isoOk = (v) => v === null || (typeof v === "string" && !Number.isNaN(Date.parse(v)) && /([zZ]|[+-]\d{2}:\d{2})$/.test(v));
if ("registration_closes_at" in cfg && !isoOk(cfg.registration_closes_at)) problems.push('registration_closes_at must be an ISO time WITH a timezone, e.g. "2026-12-10T23:59:00+01:00"');
if (cfg.paystack_subaccount_code && !/^ACCT_[A-Za-z0-9]+$/.test(cfg.paystack_subaccount_code)) problems.push("paystack_subaccount_code should look like ACCT_xxxxxxxxxx (from Paystack > Subaccounts)");
if (cfg.fee_config && cfg.fee_config.enabled === true && !normalizeFeeConfig(cfg.fee_config)) problems.push("fee_config is not valid");
(cfg.passes || []).forEach((p, i) => {
    const w = `passes[${i}] ("${p.title ?? "?"}")`;
    if (!p.title) problems.push(`${w}: title is required`);
    if (!(Number(p.price) >= 0)) problems.push(`${w}: price must be a number (0 = free)`);
    if (!["individual", "group"].includes(p.type || "individual")) problems.push(`${w}: type must be "individual" or "group"`);
    if (p.type === "group" && !(p.group_size >= 2)) problems.push(`${w}: group tickets need group_size >= 2`);
    if (!(Number.isInteger(p.quantity_available) && p.quantity_available > 0)) problems.push(`${w}: quantity_available is required (how many ${p.type === "group" ? "groups" : "tickets"} can be sold)`);
    for (const k of ["sales_start_at", "sales_end_at"]) if (k in p && !isoOk(p[k])) problems.push(`${w}: ${k} must be an ISO time WITH a timezone`);
});
if (problems.length) die("Config problems:\n  - " + problems.join("\n  - "));

const naira = (n) => `₦${Number(n).toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;

// ---------- preview what customers will pay ----------
console.log(`Event tag: ${tag}   (${apply ? "APPLY" : "preview only, nothing is written"})\n`);
const warnings = [];
const feeOn = !!normalizeFeeConfig(cfg.fee_config);
if (cfg.passes?.length) {
    console.log("TICKETS (what customers pay):");
    for (const p of cfg.passes) {
        const c = computeCharge(Number(p.price), cfg.fee_config);
        const unit = p.type === "group" ? `group of ${p.group_size}` : "per person";
        console.log(`  ${p.title.padEnd(18)} ${naira(p.price).padStart(10)}  (${unit})` +
            (c.applied ? `  + ${c.label} ${naira(c.serviceFee)} = ${naira(c.total)}   you keep ${naira(c.platformNetKobo / 100)}` : "") +
            (p.sales_end_at ? `   ends ${p.sales_end_at}` : ""));
        if (c.applied && c.platformNetKobo < 0) warnings.push(`"${p.title}": your fee doesn't cover Paystack's cut, so you LOSE ${naira(-c.platformNetKobo / 100)} per sale.`);
    }
    console.log();
}
if (feeOn && !cfg.paystack_subaccount_code && !("paystack_subaccount_code" in cfg))
    warnings.push("Fees are on but no paystack_subaccount_code is set in this file. If the event doesn't already have one, ALL money (including the organiser's share) lands in your Paystack account.");
if (cfg.paystack_subaccount_code && !feeOn)
    warnings.push("A subaccount is set but there is no fee: the organiser gets the full ticket price and YOUR account pays Paystack's fee on every sale.");
if (cfg.registration_closes_at) console.log(`Registration closes: ${cfg.registration_closes_at}`);
if (cfg.paystack_subaccount_code) console.log(`Organiser payout: subaccount ${cfg.paystack_subaccount_code} receives the ticket price; you keep the fee.`);
warnings.forEach((w) => console.log(`\n  WARNING: ${w}`));
console.log();

if (!apply) {
    console.log("Preview only. Add --apply to write this to the database.");
    process.exit(0);
}

// ---------- apply ----------
if (!SUPABASE_URL || !SERVICE_KEY) die("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");

async function sb(method, path, body) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
        method,
        headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json", Prefer: "return=representation" },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${text}`);
    return text ? JSON.parse(text) : null;
}

try {
    let events;
    try {
        events = await sb("GET", `events?tag=eq.${encodeURIComponent(tag)}&select=id,event_title,fee_config,registration_closes_at,paystack_subaccount_code`);
    } catch (e) {
        if (/column .* does not exist|42703/.test(e.message)) die("The database is missing the new columns. Run the 'Checkout' migration at the bottom of supabase/schema.sql in the Supabase SQL editor first.");
        throw e;
    }
    const event = events[0];
    if (!event) die(`No event with tag "${tag}".`);

    const eventUpdate = {};
    for (const k of ["registration_closes_at", "paystack_subaccount_code", "fee_config"]) if (k in cfg) eventUpdate[k] = cfg[k] ?? null;
    if (Object.keys(eventUpdate).length) {
        await sb("PATCH", `events?id=eq.${event.id}`, eventUpdate);
        console.log(`Updated event settings: ${Object.keys(eventUpdate).join(", ")}`);
    }

    const existing = await sb("GET", `passes?event_id=eq.${event.id}&select=*`);
    let order = existing.length;
    for (const p of cfg.passes || []) {
        const type = p.type || "individual";
        const row = {
            title: p.title,
            description: p.description ?? null,
            price: Number(p.price),
            is_free: Number(p.price) === 0,
            type,
            group_size: type === "group" ? p.group_size : null,
            max_per_person: type === "individual" ? 1 : null,
            quantity_available: p.quantity_available,
            ...("sales_start_at" in p ? { sales_start_at: p.sales_start_at } : {}),
            ...("sales_end_at" in p ? { sales_end_at: p.sales_end_at } : {}),
        };
        const match = existing.find((e) => e.title === p.title);
        if (match) {
            if ((match.quantity_sold || 0) > 0 && Number(match.price) !== row.price) {
                console.log(`  SKIPPED price change for "${p.title}": ${match.quantity_sold} already sold at ${naira(match.price)}.`);
                delete row.price;
                delete row.is_free;
            }
            await sb("PATCH", `passes?id=eq.${match.id}`, row);
            console.log(`  updated ticket "${p.title}"`);
        } else {
            await sb("POST", "passes", [{ ...row, event_id: event.id, display_order: order++ }]);
            console.log(`  created ticket "${p.title}"`);
        }
    }
    console.log("\nDone. The event page picks this up immediately.");
} catch (err) {
    die(`\nFailed: ${err.message}`);
}
