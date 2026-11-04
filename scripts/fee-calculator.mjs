/**
 * Fee calculator: "if I charge X on top, what does the customer pay and what do I keep?"
 * Uses the exact engine the checkout uses (src/lib/fees.ts), so the numbers match
 * what customers will really be charged.
 *
 * Usage (Node 22.6+; add --experimental-strip-types if your Node is older than 22.18):
 *   node scripts/fee-calculator.mjs 15000 22500                  compare common options
 *   node scripts/fee-calculator.mjs 15000 --flat 500             one specific fee
 *   node scripts/fee-calculator.mjs 15000 --percent 3 --round 50
 *   node scripts/fee-calculator.mjs 15000 --flat 500 --absorb    YOU pay Paystack's fee, not the customer
 *
 *   --flat N      platform fee in naira, added to every ticket
 *   --percent P   platform fee as a % of the ticket price
 *   --round N     round the customer's total up to a multiple of N naira (e.g. 50)
 *   --absorb      don't pass Paystack's processing fee on to the customer
 *
 * "You keep" = what is left in the platform account after Paystack's cut.
 * "Organiser gets" = always the full ticket price (sent to their subaccount).
 */

let fees;
try {
    fees = await import("../src/lib/fees.ts");
} catch (err) {
    console.error("Could not load src/lib/fees.ts. Use Node 22.6+ and run:\n  node --experimental-strip-types scripts/fee-calculator.mjs ...");
    console.error(String(err.message || err));
    process.exit(1);
}
const { computeCharge } = fees;

const args = process.argv.slice(2);
const prices = args.filter((a, i) => /^\d+(\.\d+)?$/.test(a) && !String(args[i - 1] || "").startsWith("--")).map(Number);
const flag = (name) => {
    const i = args.indexOf(`--${name}`);
    return i === -1 ? undefined : args[i + 1];
};
if (prices.length === 0) {
    console.error("Give at least one ticket price, e.g.  node scripts/fee-calculator.mjs 15000 22500");
    process.exit(1);
}

const naira = (kobo) => {
    const n = kobo / 100;
    const s = Math.abs(n).toLocaleString("en-NG", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 });
    return `${n < 0 ? "-" : ""}₦${s}`;
};
const pad = (s, n) => String(s).padEnd(n);
const padL = (s, n) => String(s).padStart(n);

const absorb = args.includes("--absorb");
const round = flag("round") ? Number(flag("round")) : 1;
const custom = flag("flat") !== undefined || flag("percent") !== undefined;

const options = custom
    ? [{ name: `${flag("flat") ? `₦${flag("flat")} flat` : ""}${flag("flat") && flag("percent") ? " + " : ""}${flag("percent") ? `${flag("percent")}%` : ""}`, flat: Number(flag("flat") || 0), percent: Number(flag("percent") || 0) }]
    : [
          { name: "No platform fee (only Paystack's)", flat: 0, percent: 0 },
          { name: "₦300 flat", flat: 300, percent: 0 },
          { name: "₦500 flat", flat: 500, percent: 0 },
          { name: "₦750 flat", flat: 750, percent: 0 },
          { name: "₦1,000 flat", flat: 1000, percent: 0 },
          { name: "2%", flat: 0, percent: 2 },
          { name: "3%", flat: 0, percent: 3 },
          { name: "5%", flat: 0, percent: 5 },
      ];

console.log(`Paystack fee ${absorb ? "paid by YOU (absorbed)" : "paid by the CUSTOMER (passed through)"}; totals rounded up to the next ₦${round}\n`);

for (const price of prices) {
    console.log(`Ticket ₦${price.toLocaleString()}`);
    console.log(`  ${pad("Platform fee", 36)}${padL("Customer pays", 15)}${padL("Fee line", 11)}${padL("Paystack", 11)}${padL("You keep", 11)}${padL("Fee % of price", 16)}`);
    for (const o of options) {
        const c = computeCharge(price, {
            enabled: true,
            pass_processing_fee: !absorb,
            platform_fee: { flat: o.flat, percent: o.percent },
            round_to: round,
        });
        const pct = ((c.serviceFeeKobo / c.subtotalKobo) * 100).toFixed(1) + "%";
        console.log(`  ${pad(o.name, 36)}${padL(naira(c.totalKobo), 15)}${padL(naira(c.serviceFeeKobo), 11)}${padL(naira(c.paystackFeeKobo), 11)}${padL(naira(c.platformNetKobo), 11)}${padL(pct, 16)}`);
    }
    console.log();
}
console.log("Customer pays = ticket + the single fee line they see at checkout. Organiser gets the full ticket price.");
console.log("Paystack's rates are set in src/lib/fees.ts (1.5% + ₦100, ₦100 waived under ₦2,500, capped at ₦2,000): confirm at paystack.com/pricing.");
