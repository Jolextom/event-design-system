import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/apiV1";
import { verifyTransaction } from "@/lib/paystack";
import { verifyAndFulfillPayment } from "@/app/actions";

/**
 * Safety net for payments that completed at Paystack but never reached us as a
 * finished order, e.g. the customer paid and closed the tab before the receipt
 * page finished, AND the Paystack webhook isn't set up (or was down).
 *
 * It looks at orders still "pending" for ONE event, asks Paystack whether each was
 * really paid, and (only with &confirm=yes) completes the paid ones using the very
 * same verification the receipt page uses: amount must match what the server
 * charged, and an order is never fulfilled twice.
 *
 * Needs the env var RECONCILE_SECRET (any long random string you choose).
 *
 *   Look only (changes nothing):
 *     GET /api/admin/reconcile-orders?tag=<event-tag>&secret=<SECRET>
 *   Complete the paid ones:
 *     GET /api/admin/reconcile-orders?tag=<event-tag>&secret=<SECRET>&confirm=yes
 *
 * Optional: &minutes=15 (only orders at least this old, default 10, so it never
 * races a customer who is still on the payment page).
 */
const SECRET = process.env.RECONCILE_SECRET;
const MAX_PER_RUN = 25;

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    if (!SECRET || searchParams.get("secret") !== SECRET) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const tag = searchParams.get("tag");
    if (!tag) return NextResponse.json({ error: "?tag=<event-tag> is required" }, { status: 400 });
    const confirm = searchParams.get("confirm") === "yes";
    const minutes = Math.max(1, parseInt(searchParams.get("minutes") || "10", 10) || 10);

    const supabase = adminClient();
    const { data: event } = await supabase.from("events").select("id, event_title").eq("tag", tag).maybeSingle();
    if (!event) return NextResponse.json({ error: `No event with tag "${tag}"` }, { status: 404 });

    const { data: pending } = await supabase
        .from("orders_table")
        .select("id, order_ref, email, expected_amount_kobo, updated_at")
        .eq("event_id", event.id)
        .eq("status", "pending");

    const cutoff = Date.now() - minutes * 60 * 1000;
    const candidates = (pending ?? [])
        .filter((o: { expected_amount_kobo: number | null; updated_at: string }) => (o.expected_amount_kobo ?? 0) > 0 && Date.parse(o.updated_at) < cutoff)
        .slice(0, MAX_PER_RUN);

    const results: { order_ref: string; email: string; paidAtPaystack: boolean; action: string }[] = [];
    for (const o of candidates as { order_ref: string; email: string }[]) {
        let paid = false;
        try {
            const tx = await verifyTransaction(o.order_ref);
            paid = tx?.status === "success";
        } catch {
            paid = false; // Paystack has no such transaction: the customer never paid
        }
        if (!paid) {
            results.push({ order_ref: o.order_ref, email: o.email, paidAtPaystack: false, action: "none (not paid)" });
        } else if (!confirm) {
            results.push({ order_ref: o.order_ref, email: o.email, paidAtPaystack: true, action: "PAID but not completed: add &confirm=yes to complete it" });
        } else {
            const r = await verifyAndFulfillPayment(o.order_ref);
            results.push({
                order_ref: o.order_ref,
                email: o.email,
                paidAtPaystack: true,
                action: r.success ? "completed" : `not completed: ${r.fatalError || r.error || "unknown"}`,
            });
        }
    }

    return NextResponse.json({
        event: event.event_title,
        mode: confirm ? "completing paid orders" : "look only",
        pendingTotal: pending?.length ?? 0,
        checked: results.length,
        results,
    });
}
