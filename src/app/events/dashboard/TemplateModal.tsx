"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AlertCircle, Check, Copy } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { Modal, ModalButton } from "@/app/components/ui/Modal";
import { Input } from "@/app/components/ui/Input";
import { cn } from "@/lib/utils";
import { EVENT_TEMPLATES } from "@/lib/templates";
import { createEventFromTemplate } from "@/lib/templates/createFromTemplate";
import type { EventTemplate, TemplateInput, TemplateVariant } from "@/lib/templates";

interface TemplateModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** The logged-in organiser. The new event is created as this user. */
    userId: string;
    onCreated: (tag: string) => void;
}

const inputType = (t: TemplateInput["type"]) => (t === "datetime" ? "datetime-local" : t);

export function TemplateModal({ isOpen, onClose, userId, onCreated }: TemplateModalProps) {
    const [template, setTemplate] = useState<EventTemplate>(EVENT_TEMPLATES[0]);
    const [variantId, setVariantId] = useState<string>("test"); // the harmless option is the default
    const [values, setValues] = useState<Record<string, string>>({});
    const [error, setError] = useState<string | null>(null);
    const [sql, setSql] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [busy, setBusy] = useState(false);

    const variant: TemplateVariant = useMemo(
        () => template.variants.find((v) => v.id === variantId) ?? template.variants[0],
        [template, variantId]
    );
    const inputs: TemplateInput[] = useMemo(() => [...template.inputs, ...variant.inputs], [template, variant]);

    // Pre-fill defaults when the template/variant changes, without wiping what was typed.
    useEffect(() => {
        setValues((prev) => {
            const next = { ...prev };
            for (const i of inputs) if (next[i.key] === undefined && i.defaultValue !== undefined) next[i.key] = String(i.defaultValue);
            return next;
        });
        setError(null);
        setSql(null);
    }, [inputs]);

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
                                onClick={() => { setTemplate(t); setVariantId(t.variants[0].id); }}
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
                            onClick={() => setVariantId(v.id)}
                            className={cn("text-left rounded-2xl border-2 px-4 py-3 transition-all", v.id === variant.id ? "border-gray-900 bg-gray-50" : "border-gray-100 hover:border-gray-200")}
                        >
                            <div className="font-black text-gray-900">{v.label}</div>
                            <div className="text-xs font-bold text-gray-500 mt-1 leading-relaxed">{v.hint}</div>
                            <div className="text-[11px] font-bold text-gray-400 mt-2">{ticketLine(v)}</div>
                        </button>
                    ))}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    {inputs.map((i) => (
                        <Input
                            key={`${variant.id}-${i.key}`}
                            label={i.label}
                            hint={i.hint}
                            type={inputType(i.type)}
                            min={i.type === "number" ? 1 : undefined}
                            required={i.required}
                            value={values[i.key] ?? ""}
                            onChange={(e) => setValues((prev) => ({ ...prev, [i.key]: e.target.value }))}
                            containerClassName={i.type === "datetime" || i.hint ? "sm:col-span-2" : undefined}
                        />
                    ))}
                </div>

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
