"use client";

import React, { useMemo, useState } from "react";
import { AlertTriangle, Check, Copy, Info, Loader2, Save } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";
import type { Pass } from "../types";
import { ROUND_CHOICES, formFromEvent, paymentWarnings, previewRows, validatePayments, type PaymentsFormValues } from "@/lib/paymentsForm";
import { sqlForMissing } from "@/lib/templates/createFromTemplate";

interface PaymentsPanelProps {
    eventId: string;
    passes: Pass[];
    /** events.fee_config as stored (null/undefined = no fee). */
    feeConfig: unknown;
    /** events.paystack_subaccount_code as stored. */
    payoutCode: string | null;
    /** Called after a successful save so the rest of the page sees the new values. */
    onSaved: (updates: { fee_config: unknown; paystack_subaccount_code: string | null }) => void;
}

const input = "w-full px-4 py-3 bg-gray-50/50 border border-gray-100 rounded-2xl text-[13px] font-bold text-gray-900 focus:bg-white focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500/20 outline-none transition-all";
const label = "text-[11px] font-black text-gray-900 uppercase tracking-widest";
const naira = (n: number) => `₦${n.toLocaleString("en-NG", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })}`;

/**
 * Edit where this event's ticket money goes and what service fee is added.
 * Changes apply to NEW payments only: every order stores the exact amount it was charged.
 */
export function PaymentsPanel({ eventId, passes, feeConfig, payoutCode, onSaved }: PaymentsPanelProps) {
    const initial = useMemo(() => formFromEvent(feeConfig, payoutCode), [feeConfig, payoutCode]);
    const [form, setForm] = useState<PaymentsFormValues>(initial);
    const [baseline, setBaseline] = useState<PaymentsFormValues>(initial);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
    const [sql, setSql] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const set = <K extends keyof PaymentsFormValues>(key: K, value: PaymentsFormValues[K]) => {
        setForm((f) => ({ ...f, [key]: value }));
        setMessage(null);
        setSql(null);
    };

    const dirty = JSON.stringify(form) !== JSON.stringify(baseline);
    const warnings = useMemo(() => paymentWarnings(form, passes), [form, passes]);
    const rows = useMemo(() => previewRows(form, passes), [form, passes]);

    const save = async () => {
        setMessage(null);
        setSql(null);
        const checked = validatePayments(form);
        if (!checked.ok) return setMessage({ kind: "error", text: checked.error });

        setSaving(true);
        const { data, error } = await supabase
            .from("events")
            .update({ fee_config: checked.feeConfig, paystack_subaccount_code: checked.payoutCode })
            .eq("id", eventId)
            .select("id");
        setSaving(false);

        if (error) {
            if (/fee_config|paystack_subaccount_code|column/i.test(error.message) || error.code === "PGRST204" || error.code === "42703") {
                setMessage({ kind: "error", text: "Your database is missing the columns that store these settings. Run the SQL below once in the Supabase SQL editor, then press Save again." });
                setSql(sqlForMissing(["events.fee_config", "events.paystack_subaccount_code"]));
            } else {
                setMessage({ kind: "error", text: `Couldn't save: ${error.message}` });
            }
            return;
        }
        if (!data || data.length === 0) {
            return setMessage({ kind: "error", text: "Couldn't save. This event wasn't updated (are you signed in as its owner?)." });
        }
        setBaseline(form);
        onSaved({ fee_config: checked.feeConfig, paystack_subaccount_code: checked.payoutCode });
        setMessage({ kind: "ok", text: "Saved. This applies to new payments from now on; people who already paid are not affected." });
    };

    const copySql = async () => {
        if (!sql) return;
        try {
            await navigator.clipboard.writeText(sql);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            /* the SQL is still selectable on screen */
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <h3 className="text-sm font-black text-gray-900">Payments & fees</h3>
                <p className="mt-1 text-xs font-bold text-gray-400">
                    The service fee is how you earn from each ticket. The payout code sends the ticket price straight to the organiser.
                </p>
            </div>

            {/* Payout */}
            <section className="space-y-3 rounded-[24px] border border-gray-100 p-6">
                <h4 className="text-xs font-black uppercase tracking-widest text-gray-400">1 · Organiser payout</h4>
                <div className="space-y-2">
                    <label htmlFor="payout-code" className={label}>Organiser&apos;s Paystack subaccount code</label>
                    <input id="payout-code" value={form.payoutCode} onChange={(e) => set("payoutCode", e.target.value)} placeholder="ACCT_xxxxxxxxxx" className={cn(input, "font-mono")} />
                    <p className="text-[11px] font-bold leading-relaxed text-gray-400">
                        Paystack → Subaccounts. With a code, Paystack pays the organiser the ticket price directly and you keep the service fee. Leave it empty and
                        everything lands in your own Paystack account. Test mode and live mode have separate codes: use a TEST code with the test key and a LIVE code with the live key.
                    </p>
                </div>
            </section>

            {/* Fee */}
            <section className="space-y-5 rounded-[24px] border border-gray-100 p-6">
                <h4 className="text-xs font-black uppercase tracking-widest text-gray-400">2 · Service fee</h4>
                <label className="flex cursor-pointer items-start gap-3">
                    <input type="checkbox" className="mt-1 h-4 w-4" checked={form.feeOn} onChange={(e) => set("feeOn", e.target.checked)} />
                    <span>
                        <span className="block text-sm font-black text-gray-900">Charge a service fee</span>
                        <span className="mt-0.5 block text-[11px] font-bold leading-relaxed text-gray-400">
                            Customers see ONE extra line at checkout. The organiser still receives the full ticket price.
                        </span>
                    </span>
                </label>

                {form.feeOn && (
                    <div className="grid gap-5 sm:grid-cols-2">
                        <div className="space-y-2">
                            <label htmlFor="fee-flat" className={label}>Your fee per order (₦)</label>
                            <input id="fee-flat" inputMode="decimal" value={form.flat} onChange={(e) => set("flat", e.target.value)} className={input} />
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="fee-percent" className={label}>Plus a % of the ticket price</label>
                            <input id="fee-percent" inputMode="decimal" value={form.percent} onChange={(e) => set("percent", e.target.value)} className={input} />
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="fee-round" className={label}>Round the total up to the next</label>
                            <select id="fee-round" value={form.roundTo} onChange={(e) => set("roundTo", e.target.value)} className={input}>
                                {ROUND_CHOICES.map((r) => (
                                    <option key={r} value={String(r)}>₦{r}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="fee-label" className={label}>What customers see it called</label>
                            <input id="fee-label" value={form.label} onChange={(e) => set("label", e.target.value)} className={input} />
                        </div>
                        <label className="flex cursor-pointer items-start gap-3 sm:col-span-2">
                            <input type="checkbox" className="mt-1 h-4 w-4" checked={form.passProcessing} onChange={(e) => set("passProcessing", e.target.checked)} />
                            <span>
                                <span className="block text-sm font-black text-gray-900">Customers also pay Paystack&apos;s processing fee</span>
                                <span className="mt-0.5 block text-[11px] font-bold leading-relaxed text-gray-400">
                                    Recommended. Otherwise Paystack&apos;s fee comes out of your own share.
                                </span>
                            </span>
                        </label>
                    </div>
                )}
            </section>

            {/* Preview */}
            {rows.length > 0 && (
                <section className="rounded-[24px] border border-gray-100 bg-gray-50/60 p-6">
                    <h4 className="text-xs font-black uppercase tracking-widest text-gray-400">What happens on each ticket</h4>
                    <div className="mt-4 overflow-x-auto">
                        <table className="w-full text-left text-[13px]">
                            <thead>
                                <tr className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                    <th className="pb-2 pr-4">Ticket</th>
                                    <th className="pb-2 pr-4">Customer pays</th>
                                    <th className="pb-2 pr-4">Organiser gets</th>
                                    <th className="pb-2">You keep</th>
                                </tr>
                            </thead>
                            <tbody className="font-bold text-gray-700">
                                {rows.map((r) => (
                                    <tr key={r.title} className="border-t border-gray-100">
                                        <td className="py-2.5 pr-4 text-gray-900">{r.title}</td>
                                        <td className="py-2.5 pr-4">
                                            {naira(r.total)}
                                            {r.serviceFee > 0 && <span className="ml-1 text-[11px] text-gray-400">({naira(r.price)} + {naira(r.serviceFee)})</span>}
                                        </td>
                                        <td className="py-2.5 pr-4">{r.organiser === null ? <span className="text-gray-400">you pay them</span> : naira(r.organiser)}</td>
                                        <td className={cn("py-2.5", r.youKeep < 0 && "text-red-600")}>{naira(Math.round(r.youKeep * 100) / 100)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <p className="mt-3 text-[11px] font-bold text-gray-400">&quot;You keep&quot; is after Paystack&apos;s cut. A group ticket is one order, so the fee is charged once per group.</p>
                </section>
            )}

            {/* Warnings */}
            {warnings.map((w) => (
                <div
                    key={w.text}
                    role={w.level === "warn" ? "alert" : "note"}
                    className={cn(
                        "flex items-start gap-3 rounded-2xl border p-4 text-sm font-bold",
                        w.level === "warn" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-blue-100 bg-blue-50 text-blue-800"
                    )}
                >
                    {w.level === "warn" ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> : <Info className="mt-0.5 h-4 w-4 shrink-0" />}
                    <span>{w.text}</span>
                </div>
            ))}

            {/* Save */}
            <div className="flex flex-wrap items-center gap-4">
                <button
                    type="button"
                    onClick={save}
                    disabled={!dirty || saving}
                    className="flex items-center gap-2 rounded-xl bg-gray-900 px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-gray-200 transition-all hover:bg-black active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    {saving ? "Saving…" : "Save payments"}
                </button>
                {message && (
                    <span role="status" className={cn("flex items-center gap-1.5 text-xs font-bold", message.kind === "ok" ? "text-emerald-600" : "text-red-600")}>
                        {message.kind === "ok" && <Check className="h-3.5 w-3.5" />}
                        {message.text}
                    </span>
                )}
            </div>

            {sql && (
                <div className="rounded-2xl border border-gray-200 bg-gray-50">
                    <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Run in Supabase → SQL Editor</span>
                        <button type="button" onClick={copySql} className="flex items-center gap-1.5 text-xs font-black text-gray-600 hover:text-gray-900">
                            {copied ? <><Check className="h-3.5 w-3.5" /> Copied</> : <><Copy className="h-3.5 w-3.5" /> Copy</>}
                        </button>
                    </div>
                    <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words p-4 text-xs font-medium leading-relaxed text-gray-700">{sql}</pre>
                </div>
            )}
        </div>
    );
}
