"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
    ChevronUp, ChevronDown, Trash2, Check, X,
    ListChecks, Type, Loader2, ChevronRight, CheckSquare,
    ChevronDownSquare, SlidersHorizontal, Star, AlignLeft, Zap, Tag
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@supabase/supabase-js";
import type { Question, QuestionType, QuestionLogicRule } from "../../../events/[tag]/types";
import { OptionsEditor } from "../../../events/[tag]/views/registration/OptionsEditor";

const TYPE_META: Record<QuestionType, { label: string; icon: React.ComponentType<{ className?: string }>; hasOptions: boolean }> = {
    text: { label: "Short Answer", icon: Type, hasOptions: false },
    long_text: { label: "Paragraph", icon: AlignLeft, hasOptions: false },
    select: { label: "Multiple Choice", icon: ListChecks, hasOptions: true },
    dropdown: { label: "Dropdown", icon: ChevronDownSquare, hasOptions: true },
    checkbox: { label: "Checkboxes", icon: CheckSquare, hasOptions: true },
    linear_scale: { label: "Linear Scale", icon: SlidersHorizontal, hasOptions: false },
    star_rating: { label: "Star Rating", icon: Star, hasOptions: false },
};

const ALL_TYPES: QuestionType[] = ["text", "long_text", "select", "dropdown", "checkbox", "linear_scale", "star_rating"];

interface CampaignQuestionCardProps {
    question: Question;
    index: number;
    total: number;
    pageCount: number;
    isExpanded: boolean;
    onToggleExpand: () => void;
    onCollapseExpand: () => void;
    onDelete: (id: string) => void;
    onMoveUp: () => void;
    onMoveDown: () => void;
    onUpdated: () => void;
}

export function CampaignQuestionCard({
    question, index, total, pageCount, isExpanded,
    onToggleExpand, onCollapseExpand, onDelete,
    onMoveUp, onMoveDown, onUpdated,
}: CampaignQuestionCardProps) {
    const [title, setTitle] = useState(question.title);
    const [type, setType] = useState<QuestionType>(question.question_type);
    const [isRequired, setIsRequired] = useState(question.is_required);
    const [options, setOptions] = useState<string[]>(
        question.options?.length ? question.options.map(o => o.option_text) : ["", ""]
    );
    const [propertyKey, setPropertyKey] = useState(question.property_key || "");
    const [logicRules, setLogicRules] = useState<QuestionLogicRule[]>(question.logic_rules || []);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const meta = TYPE_META[type];
    const Icon = meta.icon;

    useEffect(() => {
        if (isExpanded) {
            setTitle(question.title);
            setType(question.question_type);
            setIsRequired(question.is_required);
            setOptions(question.options?.length ? question.options.map(o => o.option_text) : ["", ""]);
            setPropertyKey(question.property_key || "");
            setLogicRules(question.logic_rules || []);
            setError(null);
        }
    }, [isExpanded, question]);

    const canSave = !!title.trim() && (!meta.hasOptions || options.filter(o => o.trim()).length >= 2);

    const updateRuleForOption = (optionText: string, goToPage: number | null) => {
        setLogicRules(prev => {
            const withoutThis = prev.filter(r => r.if_equals !== optionText);
            if (goToPage === null) return withoutThis;
            return [...withoutThis, { if_equals: optionText, go_to_page: goToPage }];
        });
    };

    const handleSave = async () => {
        if (!canSave) return;
        const validOptions = options.filter(o => o.trim());
        if (meta.hasOptions && validOptions.length < 2) {
            setError(`Add at least 2 options for a ${meta.label.toLowerCase()} question`);
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            );

            // Keep only logic rules whose option still exists
            const cleanedRules = meta.hasOptions
                ? logicRules.filter(r => validOptions.includes(r.if_equals))
                : [];

            const { error: qErr } = await supabase
                .from("questions")
                .update({
                    title: title.trim(),
                    question_type: type,
                    is_required: isRequired,
                    property_key: propertyKey.trim() || null,
                    logic_rules: cleanedRules.length > 0 ? cleanedRules : null,
                })
                .eq("id", question.id);
            if (qErr) throw qErr;

            if (meta.hasOptions) {
                await supabase.from("question_options").delete().eq("question_id", question.id);
                if (validOptions.length > 0) {
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
        setPropertyKey(question.property_key || "");
        setLogicRules(question.logic_rules || []);
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
            {/* Collapsed Header */}
            <div
                className={cn("flex items-center gap-3 p-5 cursor-pointer select-none group", isExpanded && "border-b border-gray-100")}
                onClick={onToggleExpand}
            >
                <div className={cn(
                    "p-2 rounded-xl border transition-all shrink-0",
                    isExpanded ? "bg-blue-50 border-blue-200 text-[var(--brand-blue)]" : "bg-gray-50 border-gray-100 text-gray-400 group-hover:text-[var(--brand-blue)] group-hover:bg-blue-50/50"
                )}>
                    <Icon className="w-4 h-4" />
                </div>

                <div className="flex-1 min-w-0">
                    <p className="font-black text-sm text-gray-900 truncate">{question.title}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                        {TYPE_META[question.question_type]?.label || question.question_type}
                        {question.is_required && <span className="ml-2 text-orange-500">• Required</span>}
                        {question.property_key && <span className="ml-2 text-[var(--brand-blue)]">• → {question.property_key}</span>}
                        {question.logic_rules && question.logic_rules.length > 0 && <span className="ml-2 text-purple-500">• Has logic</span>}
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
                    <button type="button" onClick={onToggleExpand} title={isExpanded ? "Collapse" : "Edit question"}
                        className="p-1.5 ml-0.5 rounded-lg hover:bg-gray-100 transition-all">
                        <ChevronRight className={cn("w-4 h-4 text-gray-400 transition-transform duration-200", isExpanded && "rotate-90")} />
                    </button>
                </div>
            </div>

            {/* Expanded Edit Form */}
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
                        <div className="flex flex-wrap gap-2">
                            {ALL_TYPES.map((t) => {
                                const TIcon = TYPE_META[t].icon;
                                return (
                                    <button key={t} type="button" onClick={() => setType(t)}
                                        className={cn(
                                            "flex items-center gap-2 px-3.5 py-2 rounded-xl border-2 text-xs font-black transition-all",
                                            type === t ? "bg-blue-50 border-[var(--brand-blue)] text-[var(--brand-blue)]" : "bg-gray-50 border-gray-100 text-gray-400 hover:border-gray-200"
                                        )}>
                                        <TIcon className="w-3.5 h-3.5" />
                                        {TYPE_META[t].label}
                                    </button>
                                );
                            })}
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
                            placeholder="e.g. How satisfied were you with this session?"
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold text-gray-900 placeholder:text-gray-300 focus:outline-none focus:border-[var(--brand-blue)] focus:ring-2 focus:ring-[var(--brand-blue)]/15 focus:bg-white transition-all"
                        />
                    </div>

                    {/* Options (select/dropdown/checkbox) */}
                    {meta.hasOptions && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                            <OptionsEditor options={options} onChange={setOptions} />
                        </div>
                    )}

                    {/* Scale hint */}
                    {(type === "linear_scale" || type === "star_rating") && (
                        <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl text-[11px] text-gray-500 font-bold">
                            Respondents will answer on a fixed 1–5 {type === "star_rating" ? "star" : "point"} scale.
                        </div>
                    )}

                    {/* Property mapping */}
                    <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-400 flex items-center gap-1.5">
                            <Tag className="w-3 h-3" /> Map to Registry Property (optional)
                        </label>
                        <input
                            type="text"
                            value={propertyKey}
                            onChange={(e) => setPropertyKey(e.target.value)}
                            placeholder="e.g. satisfaction_rating"
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold text-gray-900 placeholder:text-gray-300 focus:outline-none focus:border-[var(--brand-blue)] focus:ring-2 focus:ring-[var(--brand-blue)]/15 focus:bg-white transition-all"
                        />
                        <p className="text-[10px] text-gray-400 font-bold">Answers are written to the respondent's Registry profile under this key, so Smart Groups can filter on it.</p>
                    </div>

                    {/* Conditional page logic (choice types only) */}
                    {meta.hasOptions && pageCount > 1 && (
                        <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-400 flex items-center gap-1.5">
                                <Zap className="w-3 h-3" /> Page Logic
                            </label>
                            <div className="space-y-2">
                                {options.filter(o => o.trim()).map((opt) => {
                                    const rule = logicRules.find(r => r.if_equals === opt);
                                    return (
                                        <div key={opt} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-xl">
                                            <span className="text-xs font-bold text-gray-600 flex-1 truncate">If "{opt}"</span>
                                            <select
                                                value={rule?.go_to_page ?? ""}
                                                onChange={(e) => updateRuleForOption(opt, e.target.value ? parseInt(e.target.value) : null)}
                                                className="text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-lg px-2 py-1.5 outline-none"
                                            >
                                                <option value="">Continue normally</option>
                                                {Array.from({ length: pageCount }, (_, i) => i + 1).map(p => (
                                                    <option key={p} value={p}>Skip to page {p}</option>
                                                ))}
                                            </select>
                                        </div>
                                    );
                                })}
                            </div>
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
                                    canSave && !isSaving ? "bg-gray-900 text-white hover:bg-black shadow-md shadow-gray-200" : "bg-gray-100 text-gray-400 cursor-not-allowed"
                                )}>
                                {isSaving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</> : <><Check className="w-3.5 h-3.5" /> Save</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export { TYPE_META, ALL_TYPES };
