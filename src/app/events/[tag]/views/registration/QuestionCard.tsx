"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
    ChevronUp, ChevronDown, Trash2, Check, X,
    ListChecks, Type, Loader2, ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@supabase/supabase-js";
import { Question, QuestionType } from "../../types";
import { OptionsEditor } from "./OptionsEditor";

interface QuestionCardProps {
    question: Question;
    index: number;
    total: number;
    isExpanded: boolean;
    onToggleExpand: () => void;
    onCollapseExpand: () => void;
    onDelete: (id: string) => void;
    onMoveUp: () => void;
    onMoveDown: () => void;
    onUpdated: () => void;
}

export function QuestionCard({
    question, index, total, isExpanded,
    onToggleExpand, onCollapseExpand, onDelete,
    onMoveUp, onMoveDown, onUpdated,
}: QuestionCardProps) {
    const [title, setTitle] = useState(question.title);
    const [type, setType] = useState<QuestionType>(question.question_type);
    const [isRequired, setIsRequired] = useState(question.is_required);
    const [options, setOptions] = useState<string[]>(
        question.options?.length ? question.options.map(o => o.option_text) : ["", ""]
    );
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Snapshot of values at expand-time for dirty check
    const originalTitle = question.title;
    const originalType = question.question_type;
    const originalRequired = question.is_required;
    const originalOptions = useMemo(
        () => question.options?.length ? question.options.map(o => o.option_text) : ["", ""],
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [question.id]
    );

    useEffect(() => {
        if (isExpanded) {
            setTitle(question.title);
            setType(question.question_type);
            setIsRequired(question.is_required);
            setOptions(question.options?.length ? question.options.map(o => o.option_text) : ["", ""]);
            setError(null);
        }
    }, [isExpanded, question]);

    // Dirty check — are any values different from original?
    const isDirty = useMemo(() => {
        if (title !== originalTitle) return true;
        if (type !== originalType) return true;
        if (isRequired !== originalRequired) return true;
        if (type === "select") {
            const cleanOpts = options.filter(o => o.trim());
            const cleanOrig = originalOptions.filter(o => o.trim());
            if (cleanOpts.length !== cleanOrig.length) return true;
            if (cleanOpts.some((o, i) => o !== cleanOrig[i])) return true;
        }
        return false;
    }, [title, type, isRequired, options, originalTitle, originalType, originalRequired, originalOptions]);

    const canSave = isDirty && !!title.trim() && (type !== "select" || options.filter(o => o.trim()).length >= 2);

    const handleSave = async () => {
        if (!canSave) return;

        const validOptions = options.filter(o => o.trim());
        if (type === "select" && validOptions.length < 2) {
            setError("Add at least 2 options for a multiple choice question"); return;
        }

        setIsSaving(true);
        setError(null);

        try {
            const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            );

            const { error: qErr } = await supabase
                .from("questions")
                .update({ title: title.trim(), question_type: type, is_required: isRequired })
                .eq("id", question.id);
            if (qErr) throw qErr;

            if (question.question_type === "select" || type === "select") {
                await supabase.from("question_options").delete().eq("question_id", question.id);
                if (type === "select" && validOptions.length > 0) {
                    const { error: oErr } = await supabase.from("question_options").insert(
                        validOptions.map((o, i) => ({ question_id: question.id, option_text: o.trim(), display_order: i }))
                    );
                    if (oErr) throw oErr;
                }
            }

            onUpdated();
            onCollapseExpand();
        } catch (err: any) {
            setError(err.message || "Failed to save");
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setTitle(question.title);
        setType(question.question_type);
        setIsRequired(question.is_required);
        setOptions(question.options?.length ? question.options.map(o => o.option_text) : ["", ""]);
        setError(null);
        onCollapseExpand();
    };

    return (
        <div className={cn(
            "rounded-[20px] border transition-all duration-200",
            isExpanded
                ? "border-[var(--brand-blue)]/40 shadow-xl shadow-blue-500/5 bg-white"
                : "border-gray-100 bg-white shadow-sm hover:border-gray-200 hover:shadow-md"
        )}>
            {/* ── Collapsed Header ── */}
            <div
                className={cn(
                    "flex items-center gap-3 p-5 cursor-pointer select-none group",
                    isExpanded && "border-b border-gray-100"
                )}
                onClick={onToggleExpand}
            >
                <div className={cn(
                    "p-2 rounded-xl border transition-all shrink-0",
                    isExpanded
                        ? "bg-blue-50 border-blue-200 text-[var(--brand-blue)]"
                        : "bg-gray-50 border-gray-100 text-gray-400 group-hover:text-[var(--brand-blue)] group-hover:bg-blue-50/50"
                )}>
                    {type === "select" ? <ListChecks className="w-4 h-4" /> : <Type className="w-4 h-4" />}
                </div>

                <div className="flex-1 min-w-0">
                    <p className="font-black text-sm text-gray-900 truncate">{question.title}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                        {question.question_type === "select" ? "Multiple Choice" : "Short Answer"}
                        {question.is_required && <span className="ml-2 text-orange-500">• Required</span>}
                        {question.options && question.options.length > 0 && (
                            <span className="ml-2 text-gray-300">• {question.options.length} option{question.options.length !== 1 ? "s" : ""}</span>
                        )}
                    </p>
                </div>

                <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button type="button" disabled={index === 0} onClick={onMoveUp} title="Move up"
                        className="p-1.5 rounded-lg text-gray-300 hover:text-gray-700 hover:bg-gray-100 transition-all disabled:opacity-20 disabled:pointer-events-none">
                        <ChevronUp className="w-4 h-4" />
                    </button>
                    <button type="button" disabled={index === total - 1} onClick={onMoveDown} title="Move down"
                        className="p-1.5 rounded-lg text-gray-300 hover:text-gray-700 hover:bg-gray-100 transition-all disabled:opacity-20 disabled:pointer-events-none">
                        <ChevronDown className="w-4 h-4" />
                    </button>
                    <div className="w-px h-4 bg-gray-100 mx-0.5" />
                    <button type="button" onClick={() => onDelete(question.id)} title="Delete"
                        className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all">
                        <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={onToggleExpand}
                        title={isExpanded ? "Collapse" : "Edit question"}
                        className="p-1.5 ml-0.5 rounded-lg hover:bg-gray-100 transition-all"
                    >
                        <ChevronRight className={cn("w-4 h-4 text-gray-400 transition-transform duration-200", isExpanded && "rotate-90")} />
                    </button>
                </div>
            </div>

            {/* ── Expanded Edit Form ── */}
            {isExpanded && (
                <div className="px-5 pb-5 pt-4 space-y-5 animate-in slide-in-from-top-2 duration-200">
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 font-bold flex items-center gap-2">
                            <X className="w-3.5 h-3.5 shrink-0" /> {error}
                        </div>
                    )}

                    {/* Type Picker */}
                    <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-400 block">Type</label>
                        <div className="flex gap-2">
                            {(["text", "select"] as QuestionType[]).map((t) => (
                                <button key={t} type="button" onClick={() => setType(t)}
                                    className={cn(
                                        "flex items-center gap-2.5 px-4 py-2.5 rounded-xl border-2 text-xs font-black transition-all",
                                        type === t ? "bg-blue-50 border-[var(--brand-blue)] text-[var(--brand-blue)]" : "bg-gray-50 border-gray-100 text-gray-400 hover:border-gray-200"
                                    )}>
                                    {t === "text" ? <Type className="w-3.5 h-3.5" /> : <ListChecks className="w-3.5 h-3.5" />}
                                    {t === "text" ? "Short Answer" : "Multiple Choice"}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Title */}
                    <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-400 block">Question</label>
                        <input
                            autoFocus
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g. What is your t-shirt size?"
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold text-gray-900 placeholder:text-gray-300 focus:outline-none focus:border-[var(--brand-blue)] focus:ring-2 focus:ring-[var(--brand-blue)]/15 focus:bg-white transition-all"
                        />
                    </div>

                    {/* Options */}
                    {type === "select" && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                            <OptionsEditor options={options} onChange={setOptions} />
                        </div>
                    )}

                    {/* Required + Save/Cancel */}
                    <div className="flex items-center justify-between gap-4 pt-1">
                        <button type="button" onClick={() => setIsRequired(!isRequired)}
                            className={cn(
                                "flex items-center gap-2.5 px-4 py-2 rounded-xl border-2 text-xs font-black transition-all",
                                isRequired ? "bg-green-50 border-green-300 text-green-700" : "bg-gray-50 border-gray-100 text-gray-400 hover:border-gray-200"
                            )}>
                            <div className={cn("w-4 h-4 rounded-md border-2 flex items-center justify-center", isRequired ? "bg-green-500 border-green-500" : "border-gray-300")}>
                                {isRequired && <Check className="w-2.5 h-2.5 text-white" />}
                            </div>
                            Required
                        </button>

                        <div className="flex items-center gap-2">
                            <button type="button" onClick={handleCancel}
                                className="px-4 py-2 rounded-xl text-xs font-black text-gray-500 hover:bg-gray-100 transition-all">Cancel</button>
                            <button type="button" onClick={handleSave} disabled={!canSave || isSaving}
                                className={cn(
                                    "flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-black transition-all active:scale-95",
                                    canSave && !isSaving
                                        ? "bg-gray-900 text-white hover:bg-black shadow-md shadow-gray-200"
                                        : "bg-gray-100 text-gray-400 cursor-not-allowed"
                                )}>
                                {isSaving
                                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</>
                                    : <><Check className="w-3.5 h-3.5" /> {isDirty ? "Save" : "No changes"}</>
                                }
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
