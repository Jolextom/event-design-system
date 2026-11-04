import { computeCharge, normalizeFeeConfig, paystackFeeKobo, toKobo, type FeeConfig } from "./fees.ts";

/**
 * The rules behind the "Payments" card (edit an event's payout account and service fee)
 * and the warning in the template modal. Pure, so the two can't disagree and it is unit-tested.
 */

export interface PaymentsFormValues {
    /** Organiser's Paystack subaccount code (ACCT_...), or "" for "everything lands in our own account". */
    payoutCode: string;
    feeOn: boolean;
    /** naira, as typed */
    flat: string;
    /** percent of the ticket price, as typed */
    percent: string;
    /** Customer also pays Paystack's processing fee. */
    passProcessing: boolean;
    /** Round the customer's total up to a multiple of this many naira. */
    roundTo: string;
    label: string;
}

export const ROUND_CHOICES = [1, 10, 50, 100] as const;
export const PAYOUT_CODE_RE = /^ACCT_[A-Za-z0-9]+$/;

/** What a first-time "turn the fee on" starts from: the ₦500 decision. */
export const FEE_DEFAULTS = { flat: "500", percent: "0", passProcessing: true, roundTo: "50", label: "Service fee" } as const;

export function formFromEvent(feeConfig: unknown, payoutCode?: string | null): PaymentsFormValues {
    const cfg = normalizeFeeConfig(feeConfig);
    return {
        payoutCode: payoutCode ?? "",
        feeOn: !!cfg,
        flat: cfg ? String(cfg.platform_fee?.flat ?? 0) : FEE_DEFAULTS.flat,
        percent: cfg ? String(cfg.platform_fee?.percent ?? 0) : FEE_DEFAULTS.percent,
        passProcessing: cfg ? cfg.pass_processing_fee !== false : FEE_DEFAULTS.passProcessing,
        roundTo: cfg ? String(cfg.round_to ?? 1) : FEE_DEFAULTS.roundTo,
        label: cfg?.label ?? FEE_DEFAULTS.label,
    };
}

export type ValidatedPayments =
    | { ok: true; feeConfig: FeeConfig | null; payoutCode: string | null }
    | { ok: false; error: string };

/** Checks the form and returns exactly what should be stored on the event. */
export function validatePayments(v: PaymentsFormValues): ValidatedPayments {
    const code = v.payoutCode.trim();
    if (code && !PAYOUT_CODE_RE.test(code)) {
        return { ok: false, error: "The payout code should look like ACCT_xxxxxxxxxx (copy it from Paystack > Subaccounts)." };
    }
    if (!v.feeOn) return { ok: true, feeConfig: null, payoutCode: code || null };

    const flat = Number(v.flat === "" ? "0" : v.flat);
    const percent = Number(v.percent === "" ? "0" : v.percent);
    const roundTo = Number(v.roundTo);
    const label = v.label.trim();
    if (!Number.isFinite(flat) || flat < 0 || flat > 100_000) return { ok: false, error: "The flat fee must be a number from 0 to 100,000." };
    if (!Number.isFinite(percent) || percent < 0 || percent > 50) return { ok: false, error: "The percentage must be a number from 0 to 50." };
    if (!(ROUND_CHOICES as readonly number[]).includes(roundTo)) return { ok: false, error: "Choose how to round the total." };
    if (!label || label.length > 40) return { ok: false, error: "The label customers see must be 1 to 40 characters." };

    return {
        ok: true,
        payoutCode: code || null,
        feeConfig: { enabled: true, pass_processing_fee: v.passProcessing, platform_fee: { flat, percent }, round_to: roundTo, label },
    };
}

export interface PricedPass {
    title: string;
    price?: number | null;
    is_free?: boolean | null;
}
const paid = (passes: PricedPass[]) => passes.filter((p) => !p.is_free && (p.price ?? 0) > 0);
const naira = (n: number) => `₦${n.toLocaleString("en-NG", { maximumFractionDigits: 2 })}`;

export interface PaymentsWarning {
    level: "warn" | "info";
    text: string;
}

export function paymentWarnings(v: PaymentsFormValues, passes: PricedPass[]): PaymentsWarning[] {
    const out: PaymentsWarning[] = [];
    const code = v.payoutCode.trim();
    const tickets = paid(passes);

    if (code && !v.feeOn) {
        const sample = tickets[0];
        const fee = sample ? ` (about ${naira(paystackFeeKobo(toKobo(sample.price!)) / 100)} on a ${naira(sample.price!)} ticket)` : "";
        out.push({
            level: "warn",
            text: `A payout code is set but there is no service fee, so Paystack's fee${fee} comes out of YOUR own account on every sale. Turn the service fee on to cover it.`,
        });
    }
    if (!code && v.feeOn) {
        out.push({
            level: "info",
            text: "No payout code: every payment, including the organiser's share, lands in your own Paystack account and you would have to pay the organiser yourself.",
        });
    }

    const checked = validatePayments(v);
    if (v.feeOn && checked.ok) {
        for (const p of tickets) {
            const c = computeCharge(p.price!, checked.feeConfig);
            if (c.platformNetKobo < 0) {
                out.push({ level: "warn", text: `On "${p.title}" this fee doesn't cover Paystack's cut: you would lose ${naira(-c.platformNetKobo / 100)} on every sale.` });
            }
        }
    }
    return out;
}

export interface PreviewRow {
    title: string;
    price: number;
    serviceFee: number;
    total: number;
    /** What stays with us after Paystack's cut (negative = we pay out of our pocket). */
    youKeep: number;
    /** What the organiser receives, when a payout code is set. */
    organiser: number | null;
}

/** One row per paid ticket: what the customer pays and where the money goes. [] while the form is invalid. */
export function previewRows(v: PaymentsFormValues, passes: PricedPass[]): PreviewRow[] {
    const checked = validatePayments(v);
    if (!checked.ok) return [];
    return paid(passes).map((p) => {
        const c = computeCharge(p.price!, checked.feeConfig);
        const hasPayout = !!checked.payoutCode;
        return {
            title: p.title,
            price: c.subtotal,
            serviceFee: c.serviceFee,
            total: c.total,
            // with a payout code the organiser's share is paid straight out, so we keep only the fee; without one
            // everything lands with us and the ticket money isn't "kept" (it is owed to the organiser)
            youKeep: hasPayout || checked.feeConfig ? c.platformNetKobo / 100 : (c.totalKobo - c.paystackFeeKobo) / 100,
            organiser: hasPayout ? c.organiserKobo / 100 : null,
        };
    });
}
