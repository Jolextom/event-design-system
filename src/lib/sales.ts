/**
 * Sale windows and registration deadlines. Pure, so the server (authoritative)
 * and the event page (display) apply exactly the same rules.
 *
 * All columns are optional: NULL/undefined means "no limit", so events and
 * tickets created before these columns existed keep working untouched.
 */

export type SaleState = "open" | "not_started" | "ended";

const ms = (v: unknown): number | null => {
    if (!v) return null;
    const t = Date.parse(String(v));
    return Number.isNaN(t) ? null : t;
};

/** Is this ticket currently on sale? (passes.sales_start_at / sales_end_at) */
export function passSaleState(
    pass: { sales_start_at?: string | null; sales_end_at?: string | null },
    now: Date = new Date()
): SaleState {
    const start = ms(pass.sales_start_at);
    const end = ms(pass.sales_end_at);
    if (start !== null && now.getTime() < start) return "not_started";
    if (end !== null && now.getTime() >= end) return "ended";
    return "open";
}

/** Has registration for the whole event closed? (events.registration_closes_at) */
export function registrationClosed(
    event: { registration_closes_at?: string | null },
    now: Date = new Date()
): boolean {
    const closes = ms(event.registration_closes_at);
    return closes !== null && now.getTime() >= closes;
}
