"use client";

import React, { useState, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import { Upload, FileJson, AlertCircle, CheckCircle2 } from "lucide-react";
import { Modal, ModalButton } from "@/app/components/ui/Modal";
import type { QuestionType } from "../../../events/[tag]/types";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const VALID_TYPES: QuestionType[] = ["text", "long_text", "select", "dropdown", "checkbox", "linear_scale", "star_rating"];

interface ImportQuestion {
    page: number;
    title: string;
    type: QuestionType;
    required?: boolean;
    options?: string[];
    scale?: { min: number; max: number; min_label?: string; max_label?: string };
    logic?: { if_equals: string; go_to_page: number }[];
    property_key?: string;
}

interface ImportQuestionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    campaignId: string;
    nextOrder: number;
    onImported: () => void;
}

function validate(raw: string): { questions: ImportQuestion[] } | { error: string } {
    let parsed: any;
    try {
        parsed = JSON.parse(raw);
    } catch {
        return { error: "That's not valid JSON — check for a missing comma or bracket." };
    }

    const list = Array.isArray(parsed) ? parsed : parsed.questions;
    if (!Array.isArray(list) || list.length === 0) {
        return { error: 'Expected either a JSON array of questions, or an object like { "questions": [...] }.' };
    }

    for (let i = 0; i < list.length; i++) {
        const q = list[i];
        if (!q.title || typeof q.title !== "string") {
            return { error: `Question ${i + 1} is missing a "title".` };
        }
        if (!VALID_TYPES.includes(q.type)) {
            return { error: `Question ${i + 1} ("${q.title}") has an invalid type "${q.type}". Must be one of: ${VALID_TYPES.join(", ")}.` };
        }
        if (["select", "dropdown", "checkbox"].includes(q.type) && (!Array.isArray(q.options) || q.options.length < 1)) {
            return { error: `Question ${i + 1} ("${q.title}") is a ${q.type} question and needs an "options" array with at least 1 entry.` };
        }
        if (!q.page || typeof q.page !== "number") {
            return { error: `Question ${i + 1} ("${q.title}") is missing a numeric "page".` };
        }
    }

    return { questions: list as ImportQuestion[] };
}

export function ImportQuestionsModal({ isOpen, onClose, campaignId, nextOrder, onImported }: ImportQuestionsModalProps) {
    const [raw, setRaw] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [preview, setPreview] = useState<ImportQuestion[] | null>(null);
    const [importing, setImporting] = useState(false);
    const [success, setSuccess] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleValidate = () => {
        setError(null);
        setSuccess(null);
        const result = validate(raw);
        if ("error" in result) {
            setError(result.error);
            setPreview(null);
        } else {
            setPreview(result.questions);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            setRaw(String(ev.target?.result || ""));
            setPreview(null);
            setError(null);
        };
        reader.readAsText(file);
    };

    const handleImport = async () => {
        if (!preview) return;
        setImporting(true);
        setError(null);
        try {
            const questionRows = preview.map((q, i) => ({
                campaign_id: campaignId,
                event_id: null,
                title: q.title,
                question_type: q.type,
                is_required: q.required || false,
                question_order: nextOrder + i,
                page: q.page,
                logic_rules: q.logic && q.logic.length > 0 ? q.logic : null,
                property_key: q.property_key || null,
                scale_config: (q.type === "linear_scale" || q.type === "star_rating") && q.scale ? q.scale : null,
                is_selection_logic: false,
            }));

            const { data: inserted, error: qErr } = await supabase
                .from("questions")
                .insert(questionRows)
                .select();
            if (qErr) throw qErr;
            if (!inserted || inserted.length !== preview.length) {
                throw new Error("Insert succeeded but returned an unexpected number of rows — please check the builder before importing again.");
            }

            const optionRows: { question_id: string; option_text: string; display_order: number }[] = [];
            preview.forEach((q, i) => {
                if (q.options && q.options.length > 0) {
                    q.options.forEach((opt, oi) => {
                        optionRows.push({ question_id: inserted[i].id, option_text: opt, display_order: oi });
                    });
                }
            });

            if (optionRows.length > 0) {
                const { error: oErr } = await supabase.from("question_options").insert(optionRows);
                if (oErr) throw oErr;
            }

            setSuccess(`Imported ${preview.length} question${preview.length !== 1 ? "s" : ""} across ${new Set(preview.map(q => q.page)).size} page(s).`);
            setPreview(null);
            setRaw("");
            onImported();
        } catch (err: any) {
            setError(err.message || "Import failed.");
        } finally {
            setImporting(false);
        }
    };

    const handleClose = () => {
        setRaw("");
        setError(null);
        setPreview(null);
        setSuccess(null);
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title="Import Questions"
            subtitle="Bulk-add questions from a JSON file"
            size="lg"
            footer={
                success ? (
                    <ModalButton variant="primary" onClick={handleClose}>Done</ModalButton>
                ) : preview ? (
                    <>
                        <ModalButton variant="secondary" onClick={() => setPreview(null)}>Back</ModalButton>
                        <ModalButton variant="primary" onClick={handleImport} loading={importing} loadingText="Importing...">
                            Import {preview.length} Question{preview.length !== 1 ? "s" : ""}
                        </ModalButton>
                    </>
                ) : (
                    <>
                        <ModalButton variant="secondary" onClick={handleClose}>Cancel</ModalButton>
                        <ModalButton variant="primary" onClick={handleValidate} disabled={!raw.trim()}>
                            Preview Import
                        </ModalButton>
                    </>
                )
            }
        >
            <div className="space-y-5">
                {success ? (
                    <div className="p-4 bg-green-50 border border-green-100 rounded-xl text-sm text-green-700 font-bold flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0" /> {success}
                    </div>
                ) : preview ? (
                    <div className="space-y-3">
                        {error && (
                            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 font-bold flex items-center gap-2">
                                <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
                            </div>
                        )}
                        <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700 font-bold">
                            {preview.length} questions found across {new Set(preview.map(q => q.page)).size} page(s). Review below, then import.
                        </div>
                        <div className="max-h-80 overflow-y-auto space-y-2 border border-gray-100 rounded-xl p-3">
                            {preview.map((q, i) => (
                                <div key={i} className="p-2.5 bg-gray-50 rounded-lg text-xs">
                                    <span className="font-black text-gray-400 mr-2">p{q.page}</span>
                                    <span className="font-bold text-gray-900">{q.title}</span>
                                    <span className="ml-2 text-gray-400">({q.type}{q.options ? `, ${q.options.length} options` : ""}{q.logic?.length ? ", has logic" : ""})</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <>
                        {error && (
                            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 font-bold flex items-center gap-2">
                                <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
                            </div>
                        )}
                        <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-500 block">Paste JSON, or upload a file</label>
                            <textarea
                                value={raw}
                                onChange={(e) => setRaw(e.target.value)}
                                placeholder='[{ "page": 1, "title": "...", "type": "select", "options": ["Yes", "No"] }]'
                                rows={10}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-mono text-gray-900 placeholder:text-gray-300 focus:outline-none focus:border-[var(--brand-blue)] focus:ring-2 focus:ring-[var(--brand-blue)]/15 focus:bg-white transition-all resize-none"
                            />
                            <input ref={fileInputRef} type="file" accept=".json,application/json" onChange={handleFileUpload} className="hidden" />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="flex items-center gap-2 px-4 py-2.5 border border-dashed border-gray-200 rounded-xl text-xs font-black text-gray-400 hover:text-[var(--brand-blue)] hover:border-[var(--brand-blue)]/40 transition-all"
                            >
                                <Upload className="w-3.5 h-3.5" /> Upload .json file
                            </button>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-xl text-[10px] text-gray-400 font-bold leading-relaxed flex items-start gap-2">
                            <FileJson className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span>Each question needs: page (number), title, type (text/long_text/select/dropdown/checkbox/linear_scale/star_rating). Choice types need an options array. Optional: required, scale ({"{"}min, max, min_label, max_label{"}"}), logic (array of {"{"}if_equals, go_to_page{"}"} — use "*" for if_equals to match any answer, and a go_to_page higher than your page count to jump straight to Submit), property_key.</span>
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
}
