/**
 * The "how many are left" meter under a limited ticket (the nudge to not sleep on it).
 *
 * Only ever honest numbers: what is left is the ticket's capacity minus what has been sold (completed payments).
 * Nothing here invents scarcity: an unlimited ticket, or a sold-out one, gets no meter.
 */
export type StockTone = "calm" | "fast" | "last";

export interface StockMeterState {
    remaining: number;
    total: number;
    claimed: number;
    /** 0-100, how much of the stock is gone (drives the bar). */
    percentClaimed: number;
    tone: StockTone;
    headline: string;
    /** Social proof, only once enough have been claimed to mean something. */
    note: string | null;
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
/** Show "N already claimed" from here. */
export const SOCIAL_PROOF_FROM = 5;

export function stockMeter(
    pass: { quantity_available?: number | null; quantity_sold?: number | null },
    noun: StockNoun
): StockMeterState | null {
    const total = Number(pass.quantity_available ?? 0);
    if (!Number.isFinite(total) || total <= 0) return null; // no limit set: nothing to count down
    const sold = Math.max(0, Number(pass.quantity_sold ?? 0));
    const remaining = total - sold;
    if (remaining <= 0) return null; // sold out is shown by the ticket itself
    const claimed = Math.min(sold, total);
    const ratio = remaining / total;
    const tone: StockTone = remaining <= LAST_COUNT || ratio <= LAST_RATIO ? "last" : ratio <= FAST_RATIO ? "fast" : "calm";
    const word = (n: number) => (n === 1 ? noun.singular : noun.plural);
    const headline =
        tone === "last"
            ? remaining === 1
                ? `Last one: only 1 ${noun.singular} left`
                : `Almost gone: only ${remaining} ${noun.plural} left`
            : tone === "fast"
                ? `Going fast: only ${remaining} ${noun.plural} left`
                : `${remaining} of ${total} ${noun.plural} left`;
    return {
        remaining,
        total,
        claimed,
        percentClaimed: Math.round((claimed / total) * 100),
        tone,
        headline,
        note: claimed >= SOCIAL_PROOF_FROM ? `${claimed} ${word(claimed)} already claimed` : null,
    };
}
