/**
 * Fee engine for paid tickets. Pure functions, no imports, so it runs on the
 * server (authoritative charge), in the browser (order summary) and in
 * scripts/tests with identical results.
 *
 * All money is handled in KOBO (integers) internally to avoid float drift.
 *
 * The model, per event (events.fee_config):
 *   - The organiser should receive exactly the ticket price.
 *   - The platform adds its own fee on top (flat and/or percent).
 *   - Optionally the customer also covers Paystack's processing fee, so the
 *     platform's fee isn't eaten by it ("pass-through", the default).
 *   - Customers see ONE combined line ("Service fee") = total - ticket price.
 *
 * With Paystack split payments the customer's total goes to the platform's
 * account, which keeps `total - ticketPrice` and forwards the ticket price to
 * the organiser's subaccount. See checkout.ts / paystack.ts.
 *
 * No fee_config (or enabled !== true) => total === ticket price, i.e. exactly
 * the behaviour events had before fees existed.
 */

/** Paystack's local-card pricing. Check paystack.com/pricing; change here if it changes. */
export const PAYSTACK_LOCAL = {
    percent: 0.015,
    flatKobo: 100 * 100,
    /** The flat part is waived for payments below this. */
    flatWaivedBelowKobo: 2500 * 100,
    /** Paystack never charges more than this per transaction. */
    capKobo: 2000 * 100,
} as const;

export interface FeeConfig {
    /** Master switch. Anything but `true` means "no fees". */
    enabled?: boolean;
    /** Customer also pays Paystack's processing fee (default true). */
    pass_processing_fee?: boolean;
    /** Platform's own fee on top of the ticket price. flat is in naira, percent is e.g. 2.5 for 2.5%. */
    platform_fee?: { flat?: number; percent?: number };
    /** Round the customer's total UP to a multiple of this many naira (default 1). The rounding goes to the platform. */
    round_to?: number;
    /** What the customer sees on the fee line (default "Service fee"). */
    label?: string;
}

export interface ChargeBreakdown {
    /** False when no fee applies (no config, disabled, or a free ticket). */
    applied: boolean;
    label: string;
    subtotalKobo: number;
    /** What the customer pays in total. */
    totalKobo: number;
    /** totalKobo - subtotalKobo: the single fee line the customer sees. */
    serviceFeeKobo: number;
    /** The platform's own fee, before Paystack's cut. */
    platformFeeKobo: number;
    /** What Paystack takes from the total. */
    paystackFeeKobo: number;
    /** What the platform keeps after Paystack's cut (can be negative if the fee is too small to cover it). */
    platformNetKobo: number;
    /** What the organiser receives: always the ticket subtotal. */
    organiserKobo: number;
    // Naira conveniences
    subtotal: number;
    serviceFee: number;
    total: number;
}

export const DEFAULT_FEE_LABEL = "Service fee";

export const toKobo = (naira: number) => Math.round(naira * 100);

/** Paystack's fee on a local-card payment of `amountKobo`. */
export function paystackFeeKobo(amountKobo: number): number {
    if (!(amountKobo > 0)) return 0;
    const pct = Math.ceil(amountKobo * PAYSTACK_LOCAL.percent);
    const flat = amountKobo >= PAYSTACK_LOCAL.flatWaivedBelowKobo ? PAYSTACK_LOCAL.flatKobo : 0;
    return Math.min(PAYSTACK_LOCAL.capKobo, pct + flat);
}

/** Defensive parse of events.fee_config (untrusted JSON from the DB). Returns null for "no fees". */
export function normalizeFeeConfig(raw: unknown): FeeConfig | null {
    if (!raw || typeof raw !== "object") return null;
    const r = raw as Record<string, unknown>;
    if (r.enabled !== true) return null;

    const num = (v: unknown, min: number, max: number, dflt: number) => {
        const n = typeof v === "number" ? v : Number(v);
        return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : dflt;
    };
    const pf = (r.platform_fee && typeof r.platform_fee === "object" ? r.platform_fee : {}) as Record<string, unknown>;
    const label = typeof r.label === "string" && r.label.trim() ? r.label.trim().slice(0, 40) : DEFAULT_FEE_LABEL;

    return {
        enabled: true,
        pass_processing_fee: r.pass_processing_fee === false ? false : true,
        platform_fee: { flat: num(pf.flat, 0, 1_000_000, 0), percent: num(pf.percent, 0, 50, 0) },
        round_to: Math.round(num(r.round_to, 1, 10_000, 1)),
        label,
    };
}

/**
 * The customer's total for a ticket subtotal (in naira) under `config`.
 * Pass the raw DB value or an already-normalised config; both are accepted.
 */
export function computeCharge(subtotalNaira: number, config?: FeeConfig | unknown | null): ChargeBreakdown {
    const S = Math.max(0, toKobo(subtotalNaira));
    const cfg = normalizeFeeConfig(config);
    const label = cfg?.label ?? DEFAULT_FEE_LABEL;

    let T = S;
    let F = 0;

    if (cfg && S > 0) {
        F = toKobo(cfg.platform_fee?.flat ?? 0) + Math.round((S * (cfg.platform_fee?.percent ?? 0)) / 100);
        const target = S + F; // what must be left after Paystack's cut

        if (cfg.pass_processing_fee) {
            // Smallest T with T - paystackFee(T) >= target. T = target + fee(T) is a
            // monotone fixed point (fee grows slower than T), so iterating from
            // `target` converges in a few steps; it also handles the ₦2,500 flat
            // waiver and the ₦2,000 cap without special-casing.
            T = target;
            for (let i = 0; i < 100; i++) {
                const next = target + paystackFeeKobo(T);
                if (next === T) break;
                T = next;
            }
        } else {
            T = target;
        }

        const step = (cfg.round_to ?? 1) * 100;
        if (step > 1) T = Math.ceil(T / step) * step;
    }

    const paystack = paystackFeeKobo(T);
    return {
        applied: !!cfg && S > 0,
        label,
        subtotalKobo: S,
        totalKobo: T,
        serviceFeeKobo: T - S,
        platformFeeKobo: F,
        paystackFeeKobo: paystack,
        platformNetKobo: T - paystack - S,
        organiserKobo: S,
        subtotal: S / 100,
        serviceFee: (T - S) / 100,
        total: T / 100,
    };
}
