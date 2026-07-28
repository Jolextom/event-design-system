"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
    ChevronUp, ChevronDown, Trash2, Check, X, Copy,
    ListChecks, Type, ChevronRight, CheckSquare,
    ChevronDownSquare, SlidersHorizontal, Star, AlignLeft, Zap, Tag, Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@supabase/supabase-js";
import type { Question, QuestionType, QuestionLogicRule, ScaleConfig } from "../../../events/[tag]/types";
import { OptionsEditor } from "../../../events/[tag]/views/registration/OptionsEditor";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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
    /** Patches the parent's local copy of this question without a network refetch, so the collapsed header reflects a just-autosaved edit with no flicker. */
    onSaved: (patch: Partial<Question>) => void;
}

export function CampaignQuestionCard({
    question, index, total, pageCount, isExpanded,
    onToggleExpand, onCollapseExpand, onDelete,
    onMoveUp, onMoveDown, onUpdated, onSaved,
}: CampaignQuestionCardProps) {
    const [title, setTitle] = useState(question.title);
    const [type, setType] = useState<QuestionType>(question.question_type);
    const [isRequired, setIsRequired] = useState(question.is_required);
    const [options, setOptions] = useState<string[]>(
        question.options?.length ? question.options.map(o => o.option_text) : ["", ""]
    );
    const [propertyKey, setPropertyKey] = useState(question.property_key || "");
    const [logicRules, setLogicRules] = useState<QuestionLogicRule[]>(question.logic_rules || []);
    const [scaleConfig, setScaleConfig] = useState<ScaleConfig>(question.scale_config || { min: 1, max: 5 });
    const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
    const [isDuplicating, setIsDuplicating] = useState(false);

    const meta = TYPE_META[type];
    const Icon = meta.icon;

    const updateRuleForOption = (optionText: string, goToPage: number | null) => {
        setLogicRules(prev => {
            const withoutThis = prev.filter(r => r.if_equals !== optionText);
            if (goToPage === null) return withoutThis;
            return [...withoutThis, { if_equals: optionText, go_to_page: goToPage }];
        });
    };

    // Always-current snapshot so a flush triggered by isExpanded flipping to
    // false (which fires in the same tick as the last keystroke's state
    // update) reads the latest values rather than a stale closure.
    const latestRef = useRef({ title, type, isRequired, options, propertyKey, logicRules, scaleConfig });
    useEffect(() => {
        latestRef.current = { title, type, isRequired, options, propertyKey, logicRules, scaleConfig };
    }, [title, type, isRequired, options, propertyKey, logicRules, scaleConfig]);

    const doSave = useCallback(async () => {
        const { title, type, isRequired, options, propertyKey, logicRules, scaleConfig } = latestRef.current;
        const meta = TYPE_META[type];
        const validOptions = options.filter(o => o.trim());

        // Not enough to save yet (e.g. still typing the title, or a choice
        // question with fewer than 2 options) — stay quiet, no error shown.
        if (!title.trim() || (meta.hasOptions && validOptions.length < 2)) return;

        setSaveState("saving");
        try {
            // Keep a rule if its target option still exists, OR if it's a
            // wildcard ("*") — wildcards apply regardless of question type,
            // so they must survive even when meta.hasOptions is false
            // (e.g. an imported free-text closing question routed to submit).
            const cleanedRules = logicRules.filter(r =>
                r.if_equals === "*" || (meta.hasOptions && validOptions.includes(r.if_equals))
            );
            const isScaleType = type === "linear_scale" || type === "star_rating";

            const { error: qErr } = await supabase
                .from("questions")
                .update({
                    title: title.trim(),
                    question_type: type,
                    is_required: isRequired,
                    property_key: propertyKey.trim() || null,
                    logic_rules: cleanedRules.length > 0 ? cleanedRules : null,
                    scale_config: isScaleType ? scaleConfig : null,
                })
                .eq("id", question.id);
            if (qErr) throw qErr;

            let savedOptions: Question["options"] = question.options;
            if (meta.hasOptions) {
                await supabase.from("question_options").delete().eq("question_id", question.id);
                if (validOptions.length > 0) {
                    const { data: inserted, error: oErr } = await supabase
                        .from("question_options")
                        .insert(validOptions.map((o, i) => ({ question_id: question.id, option_text: o.trim(), display_order: i })))
                        .select();
                    if (oErr) throw oErr;
                    savedOptions = inserted as Question["options"];
                } else {
                    savedOptions = [];
                }
            }

            onSaved({
                title: title.trim(),
                question_type: type,
                is_required: isRequired,
                property_key: propertyKey.trim() || null,
                logic_rules: cleanedRules.length > 0 ? cleanedRules : null,
                scale_config: isScaleType ? scaleConfig : null,
                options: savedOptions,
            });
            setSaveState("saved");
        } catch (err) {
            console.error("Auto-save failed:", err);
            setSaveState("error");
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [question.id]);

    // Debounced auto-save while actively editing — no button needed.
    useEffect(() => {
        if (!isExpanded) return;
        setSaveState("idle");
        const timer = setTimeout(() => { doSave(); }, 700);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [title, type, isRequired, options, propertyKey, logicRules, scaleConfig, isExpanded]);

    // Sync local state from props only on the false->true transition (card
    // just opened), and flush any pending edit on the true->false transition
    // (card just closed). Deliberately NOT keyed on `question` itself —
    // every auto-save patches the parent's copy of this question with a new
    // object (so the collapsed header updates), and if this effect re-ran
    // on that alone it would re-derive `options` via a fresh .map() (new
    // array reference every time even with identical content), which would
    // retrigger the debounced auto-save below, which saves again, which
    // patches the parent again — an infinite loop, once every ~700ms.
    const wasExpandedRef = useRef(isExpanded);
    useEffect(() => {
        const wasExpanded = wasExpandedRef.current;
        if (!wasExpanded && isExpanded) {
            setTitle(question.title);
            setType(question.question_type);
            setIsRequired(question.is_required);
            setOptions(question.options?.length ? question.options.map(o => o.option_text) : ["", ""]);
            setPropertyKey(question.property_key || "");
            setLogicRules(question.logic_rules || []);
            setScaleConfig(question.scale_config || { min: 1, max: 5 });
            setSaveState("idle");
        } else if (wasExpanded && !isExpanded) {
            doSave();
        }
        wasExpandedRef.current = isExpanded;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isExpanded, doSave]);

    const handleDuplicate = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsDuplicating(true);
        try {
            const { data: newQuestion, error: qErr } = await supabase
                .from("questions")
                .insert({
                    campaign_id: question.campaign_id,
                    event_id: null,
                    title: `${question.title} (copy)`,
                    question_type: question.question_type,
                    is_required: question.is_required,
                    question_order: question.question_order + 1,
                    page: question.page || 1,
                    property_key: question.property_key || null,
                    logic_rules: null, // logic references specific option text; safer to leave unset on the copy
                    is_selection_logic: false,
                })
                .select()
                .single();

            if (qErr) throw qErr;

            if (question.options?.length && newQuestion) {
                await supabase.from("question_options").insert(
                    question.options.map((o, i) => ({
                        question_id: newQuestion.id,
                        option_text: o.option_text,
                        display_order: i,
                    }))
                );
            }

            onUpdated();
        } catch (err) {
            console.error("Duplicate failed:", err);
        } finally {
            setIsDuplicating(false);
        }
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
                    <button type="button" onClick={handleDuplicate} disabled={isDuplicating} title="Duplicate question"
                        className="p-1.5 rounded-lg text-gray-300 hover:text-[var(--brand-blue)] hover:bg-blue-50 transition-all disabled:opacity-40">
                        {isDuplicating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
                    </button>
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
                    {saveState === "error" && (
                        <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 font-bold flex items-center gap-2">
                            <X className="w-3.5 h-3.5 shrink-0" /> Couldn't save — check your connection.
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

                    {/* Scale configuration */}
                    {(type === "linear_scale" || type === "star_rating") && (
                        <div className="space-y-3 p-4 bg-gray-50 border border-gray-100 rounded-xl">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 block">Min value</label>
                                    <input
                                        type="number"
                                        value={scaleConfig.min}
                                        onChange={(e) => setScaleConfig(prev => ({ ...prev, min: parseInt(e.target.value) || 1 }))}
                                        className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-semibold text-gray-900 outline-none focus:border-[var(--brand-blue)] transition-all"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 block">Max value</label>
                                    <input
                                        type="number"
                                        value={scaleConfig.max}
                                        onChange={(e) => setScaleConfig(prev => ({ ...prev, max: parseInt(e.target.value) || prev.min + 1 }))}
                                        className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-semibold text-gray-900 outline-none focus:border-[var(--brand-blue)] transition-all"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 block">Min label (optional)</label>
                                    <input
                                        type="text"
                                        value={scaleConfig.min_label || ""}
                                        onChange={(e) => setScaleConfig(prev => ({ ...prev, min_label: e.target.value }))}
                                        placeholder="e.g. Never reliable"
                                        className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs font-semibold text-gray-900 placeholder:text-gray-300 outline-none focus:border-[var(--brand-blue)] transition-all"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 block">Max label (optional)</label>
                                    <input
                                        type="text"
                                        value={scaleConfig.max_label || ""}
                                        onChange={(e) => setScaleConfig(prev => ({ ...prev, max_label: e.target.value }))}
                                        placeholder="e.g. Always reliable"
                                        className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs font-semibold text-gray-900 placeholder:text-gray-300 outline-none focus:border-[var(--brand-blue)] transition-all"
                                    />
                                </div>
                            </div>
                            <p className="text-[10px] text-gray-400 font-bold">
                                Respondents will answer on a {scaleConfig.min}–{scaleConfig.max} {type === "star_rating" ? "star" : "point"} scale.
                            </p>
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

                    {/* Required + autosave status */}
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

                        <div className="flex items-center gap-1.5 text-xs font-black text-gray-400">
                            {saveState === "saving" && <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</>}
                            {saveState === "saved" && <><Check className="w-3.5 h-3.5 text-green-600" /> Saved</>}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export { TYPE_META, ALL_TYPES };
