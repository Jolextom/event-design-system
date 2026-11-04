"use client";

import React, { useMemo, useState } from "react";
import { AlertCircle, Check, Copy } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { Modal, ModalButton } from "@/app/components/ui/Modal";
import { Input } from "@/app/components/ui/Input";
import { cn } from "@/lib/utils";
import { EVENT_TEMPLATES } from "@/lib/templates";
import { createEventFromTemplate } from "@/lib/templates/createFromTemplate";
import { computeCharge } from "@/lib/fees";
import type { EventTemplate, TemplateInput, TemplateVariant } from "@/lib/templates";

interface TemplateModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** The logged-in organiser. The new event is created as this user. */
    userId: string;
    onCreated: (tag: string) => void;
}

const inputType = (t: TemplateInput["type"]) => (t === "datetime" ? "datetime-local" : t);

/** Pre-filled values for a template + variant (what's already typed is kept by the callers). */
const defaultsFor = (template: EventTemplate, variantId: string): Record<string, string> => {
    const variant = template.variants.find((v) => v.id === variantId) ?? template.variants[0];
    const out: Record<string, string> = {};
    for (const i of [...template.inputs, ...variant.inputs]) if (i.defaultValue !== undefined) out[i.key] = String(i.defaultValue);
    return out;
};

export function TemplateModal({ isOpen, onClose, userId, onCreated }: TemplateModalProps) {
    const [template, setTemplate] = useState<EventTemplate>(EVENT_TEMPLATES[0]);
    const [variantId, setVariantId] = useState<string>("test"); // the harmless option is the default
    // Defaults are set up front and whenever the choice changes (in the click handler), not in an
    // effect after render: otherwise a ticked-by-default box would flash unticked first.
    const [values, setValues] = useState<Record<string, string>>(() => defaultsFor(EVENT_TEMPLATES[0], "test"));
    const [error, setError] = useState<string | null>(null);
    const [sql, setSql] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [busy, setBusy] = useState(false);

    const variant: TemplateVariant = useMemo(
        () => template.variants.find((v) => v.id === variantId) ?? template.variants[0],
        [template, variantId]
    );
    const inputs: TemplateInput[] = useMemo(() => [...template.inputs, ...variant.inputs], [template, variant]);
    const feeOn = !!variant.feeInput && values[variant.feeInput] === "true" && !!template.feeConfig;

    const choose = (nextTemplate: EventTemplate, nextVariantId: string) => {
        setTemplate(nextTemplate);
        setVariantId(nextVariantId);
        // keep whatever was already typed or chosen; only fill in what's missing
        setValues((prev) => ({ ...defaultsFor(nextTemplate, nextVariantId), ...prev }));
        setError(null);
        setSql(null);
    };

    const copySql = async () => {
        if (!sql) return;
        try {
            await navigator.clipboard.writeText(sql);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            /* clipboard blocked: the SQL is still selectable on screen */
        }
    };

    const create = async () => {
        setError(null);
        setSql(null);
        setBusy(true);
        const result = await createEventFromTemplate({
            supabase,
            userId,
            template,
            variantId: variant.id,
            values,
            origin: window.location.origin,
        });
        setBusy(false);
        if (!result.ok) {
            setError(result.error);
            setSql(result.sql ?? null);
            return;
        }
        onCreated(result.tag);
    };

    const ticketLine = (v: TemplateVariant) =>
        v.passes.map((p) => `${p.title} ${p.price === 0 ? "free" : `₦${p.price.toLocaleString()}`}`).join(" · ");

    return (
        <Modal
            isOpen={isOpen}
            onClose={busy ? () => {} : onClose}
            title="Start from a template"
            subtitle="Creates the whole event under your account as a draft. Nothing is published."
            size="lg"
            footer={
                <>
                    <ModalButton variant="secondary" onClick={onClose} disabled={busy}>Cancel</ModalButton>
                    <ModalButton onClick={create} loading={busy} loadingText="Creating…">
                        Create {variant.id === "test" ? "test event" : "event"}
                    </ModalButton>
                </>
            }
        >
            <div className="space-y-6">
                {EVENT_TEMPLATES.length > 1 && (
                    <div className="grid gap-2">
                        {EVENT_TEMPLATES.map((t) => (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => choose(t, t.variants[0].id)}
                                className={cn("text-left rounded-2xl border-2 px-4 py-3 transition-all", t.id === template.id ? "border-gray-900 bg-gray-50" : "border-gray-100 hover:border-gray-200")}
                            >
                                <div className="font-black text-gray-900">{t.name}</div>
                                <div className="text-xs font-bold text-gray-400">{t.summary}</div>
                            </button>
                        ))}
                    </div>
                )}

                <div>
                    <div className="font-black text-gray-900 text-lg">{template.name}</div>
                    <div className="text-xs font-bold text-gray-400 mt-0.5">{template.summary}</div>
                    <div className="text-xs font-bold text-gray-500 mt-3">
                        Includes the event page, a cover image, {template.questions.length} registration questions, tickets, and the deadlines.
                    </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                    {template.variants.map((v) => (
                        <button
                            key={v.id}
                            type="button"
                            onClick={() => choose(template, v.id)}
                            className={cn("text-left rounded-2xl border-2 px-4 py-3 transition-all", v.id === variant.id ? "border-gray-900 bg-gray-50" : "border-gray-100 hover:border-gray-200")}
                        >
                            <div className="font-black text-gray-900">{v.label}</div>
                            <div className="text-xs font-bold text-gray-500 mt-1 leading-relaxed">{v.hint}</div>
                            <div className="text-[11px] font-bold text-gray-400 mt-2">{ticketLine(v)}</div>
                        </button>
                    ))}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    {inputs.map((i) =>
                        i.type === "checkbox" ? (
                            <label key={`${variant.id}-${i.key}`} className="sm:col-span-2 flex cursor-pointer items-start gap-3 rounded-2xl border-2 border-gray-100 p-4 hover:border-gray-200">
                                <input
                                    type="checkbox"
                                    className="mt-1 h-4 w-4"
                                    checked={values[i.key] === "true"}
                                    onChange={(e) => setValues((prev) => ({ ...prev, [i.key]: e.target.checked ? "true" : "" }))}
                                />
                                <span>
                                    <span className="block text-sm font-black text-gray-900">{i.label}</span>
                                    {i.hint && <span className="mt-1 block text-xs font-bold leading-relaxed text-gray-500">{i.hint}</span>}
                                </span>
                            </label>
                        ) : (
                            <Input
                                key={`${variant.id}-${i.key}`}
                                label={i.label}
                                hint={i.hint}
                                type={inputType(i.type)}
                                min={i.type === "number" ? 1 : undefined}
                                required={i.required}
                                value={values[i.key] ?? ""}
                                onChange={(e) => setValues((prev) => ({ ...prev, [i.key]: e.target.value }))}
                                containerClassName={i.type === "datetime" || i.type === "text" || i.hint ? "sm:col-span-2" : undefined}
                            />
                        )
                    )}
                </div>

                {feeOn && (
                    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                        <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">What customers will pay</div>
                        <div className="mt-2 space-y-1.5">
                            {variant.passes.filter((p) => p.price > 0).map((p) => {
                                const c = computeCharge(p.price, template.feeConfig);
                                return (
                                    <div key={p.title} className="flex flex-wrap items-baseline justify-between gap-x-4 text-sm">
                                        <span className="font-black text-gray-900">{p.title}</span>
                                        <span className="font-bold text-gray-600">
                                            ₦{c.subtotal.toLocaleString()} + {c.label.toLowerCase()} ₦{c.serviceFee.toLocaleString()} = <span className="text-gray-900">₦{c.total.toLocaleString()}</span>
                                            <span className="ml-2 text-xs text-gray-400">you keep about ₦{Math.round(c.platformNetKobo / 100).toLocaleString()}</span>
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {error && (
                    <div role="alert" className="flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 p-4">
                        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                        <p className="text-sm font-bold text-red-600">{error}</p>
                    </div>
                )}

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
        </Modal>
    );
}
