/**
 * The live report an organiser can share with someone (the client) through a collaborator access code:
 * who has registered and paid, who started but hasn't paid yet, and the totals. Pure functions, unit-tested.
 *
 * Money amounts are deliberately never included: the report says WHO has paid, not how much came in
 * (that is in Paystack).
 */

export interface ReportAttendee {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    check_in: boolean | null;
    created_at?: string | null;
    pass?: unknown;
    order?: unknown;
    isMine?: boolean;
    [k: string]: unknown;
}

export interface ReportOrder {
    id: string;
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
    pass_id?: string | null;
    created_at?: string | null;
    status?: string | null;
}

export interface PendingRow {
    id: string;
    name: string;
    email: string;
    ticket: string;
    startedAt: string | null;
}

export interface ReportSummary {
    registered: number;
    paid: number;
    checkedIn: number;
    notPaidYet: number;
    byTicket: { title: string; count: number }[];
}

/** PostgREST returns a to-one embed as an object, older code assumed an array: accept both. */
export function passTitleOf(pass: unknown): string {
    const p = Array.isArray(pass) ? pass[0] : pass;
    const title = (p as { title?: unknown } | null | undefined)?.title;
    return typeof title === "string" && title.trim() ? title : "General Admission";
}

/** Paid = the order behind this guest took money (a free ticket is "registered", not "paid"). */
export function isPaid(order: unknown): boolean {
    const o = Array.isArray(order) ? order[0] : order;
    const amount = Number((o as { total_amount?: unknown } | null | undefined)?.total_amount ?? 0);
    return Number.isFinite(amount) && amount > 0;
}

export function buildReport(input: { attendees: ReportAttendee[]; orders: ReportOrder[]; passes: { id: string; title: string }[] }): {
    summary: ReportSummary;
    pending: PendingRow[];
} {
    const { attendees, orders, passes } = input;
    const titles = new Map(passes.map((p) => [p.id, p.title]));
    const registeredEmails = new Set(attendees.map((a) => String(a.email ?? "").trim().toLowerCase()));

    // Someone who started, abandoned, then paid on a second try is registered, not "not paid yet".
    const seen = new Set<string>();
    const pending: PendingRow[] = [];
    for (const o of [...orders].sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")))) {
        if (o.status !== "pending") continue;
        const email = String(o.email ?? "").trim().toLowerCase();
        if (!email || registeredEmails.has(email) || seen.has(email)) continue;
        seen.add(email);
        pending.push({
            id: o.id,
            name: `${o.first_name ?? ""} ${o.last_name ?? ""}`.trim() || email,
            email,
            ticket: (o.pass_id && titles.get(o.pass_id)) || "Ticket",
            startedAt: o.created_at ?? null,
        });
    }

    const counts = new Map<string, number>();
    for (const a of attendees) counts.set(passTitleOf(a.pass), (counts.get(passTitleOf(a.pass)) ?? 0) + 1);

    return {
        summary: {
            registered: attendees.length,
            paid: attendees.filter((a) => isPaid(a.order)).length,
            checkedIn: attendees.filter((a) => !!a.check_in).length,
            notPaidYet: pending.length,
            byTicket: [...counts].map(([title, count]) => ({ title, count })).sort((a, b) => b.count - a.count),
        },
        pending,
    };
}

/** CSV a spreadsheet opens safely: quotes escaped, and cells that start with = + - @ can't run as formulas. */
export function toCsv(rows: (string | number | null | undefined)[][]): string {
    const cell = (v: string | number | null | undefined) => {
        let s = v === null || v === undefined ? "" : String(v);
        if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
        return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    return rows.map((r) => r.map(cell).join(",")).join("\r\n");
}

/** "just now", "5 min ago", "3 h ago", "2 d ago". */
export function ago(iso: string | null | undefined, now: number = Date.now()): string {
    const t = iso ? Date.parse(iso) : NaN;
    if (!Number.isFinite(t)) return "";
    const s = Math.max(0, Math.round((now - t) / 1000));
    if (s < 60) return "just now";
    if (s < 3600) return `${Math.floor(s / 60)} min ago`;
    if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
    return `${Math.floor(s / 86400)} d ago`;
}
