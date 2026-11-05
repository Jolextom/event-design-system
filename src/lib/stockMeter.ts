/**
 * The "only N left" line under a limited ticket (the nudge to not sleep on it).
 *
 * It only ever says how many are LEFT: never the total, never how many are gone, so it can't show how
 * the stock is doing, only that it is running down. The numbers are real (capacity minus completed
 * purchases); nothing here invents scarcity. An unlimited ticket, or a sold-out one, gets no line.
 */
export type StockTone = "calm" | "fast" | "last";

export interface StockMeterState {
    remaining: number;
    /** How hot the line should look. Worked out from the stock, but the stock itself is not exposed. */
    tone: StockTone;
    headline: string;
}

export interface StockNoun {
    singular: string;
    plural: string;
}

/** Fewer than this many left, or under 15% of the stock: "almost gone". */
export const LAST_COUNT = 10;
export const LAST_RATIO = 0.15;
/** Half the stock gone: "going fast". */
export const FAST_RATIO = 0.5;

export function stockMeter(
    pass: { quantity_available?: number | null; quantity_sold?: number | null },
    noun: StockNoun
): StockMeterState | null {
    const total = Number(pass.quantity_available ?? 0);
    if (!Number.isFinite(total) || total <= 0) return null; // no limit set: nothing to count down
    const sold = Math.max(0, Number(pass.quantity_sold ?? 0));
    const remaining = total - sold;
    if (remaining <= 0) return null; // sold out is shown by the ticket itself
    const ratio = remaining / total;
    const tone: StockTone = remaining <= LAST_COUNT || ratio <= LAST_RATIO ? "last" : ratio <= FAST_RATIO ? "fast" : "calm";
    const headline =
        tone === "last"
            ? remaining === 1
                ? `Last one: only 1 ${noun.singular} left`
                : `Almost gone: only ${remaining} ${noun.plural} left`
            : tone === "fast"
                ? `Going fast: only ${remaining} ${noun.plural} left`
                : `Only ${remaining} ${noun.plural} left`;
    return { remaining, tone, headline };
}
