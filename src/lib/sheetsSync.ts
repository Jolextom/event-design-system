/**
 * Fire-and-forget sync of newly fulfilled registrations to a Google Sheet,
 * via a Google Apps Script Web App acting as a webhook receiver. Never
 * throws — a sync failure must not block order fulfillment or emails.
 */
export interface SheetSyncRow {
    timestamp: string;
    event: string;
    firstName: string;
    lastName: string;
    email: string;
    pass: string;
    status: string;
    ref: string;
    /** Question title -> answer text, specific to whatever this event's form asks. */
    answers: Record<string, string>;
}

export async function syncRegistrationsToSheet(rows: SheetSyncRow[]) {
    const webhookUrl = process.env.REGISTRATIONS_SHEET_WEBHOOK_URL;
    const secret = process.env.REGISTRATIONS_SHEET_WEBHOOK_SECRET;
    if (!webhookUrl || rows.length === 0) return;

    try {
        await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ secret, rows }),
        });
    } catch (err) {
        console.error("Sheets sync failed (non-fatal):", err);
    }
}
