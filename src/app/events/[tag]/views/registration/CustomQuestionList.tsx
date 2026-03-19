"use client";

import React, { useState, useEffect } from "react";
import { Plus, ListChecks, Type, Check, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@supabase/supabase-js";
import { Question, QuestionType } from "../../types";
import { QuestionCard } from "./QuestionCard";
import { OptionsEditor } from "./OptionsEditor";

interface CustomQuestionListProps {
    questions: Question[];
    eventId: string;
    onReorder: (newOrder: Question[]) => void;
    onDelete: (id: string) => void;
    onUpdated: () => void;
}

// ─── Inline Create Form ────────────────────────────────────────────────────

interface InlineCreateFormProps {
    eventId: string;
    insertAtOrder: number;
    onCreated: () => void;
    onCancel: () => void;
}

function InlineCreateForm({ eventId, insertAtOrder, onCreated, onCancel }: InlineCreateFormProps) {
    const [title, setTitle] = useState("");
    const [type, setType] = useState<QuestionType>("text");
    const [isRequired, setIsRequired] = useState(false);
    const [options, setOptions] = useState<string[]>(["", ""]);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSave = async () => {
        if (!title.trim()) { setError("Question title is required"); return; }
        const validOptions = options.filter(o => o.trim());
        if (type === "select" && validOptions.length < 2) {
            setError("Add at least 2 options for a multiple choice question");
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            );

            const { data: q, error: qErr } = await supabase
                .from("questions")
                .insert({ 
                    event_id: eventId, 
                    title: title.trim(), 
                    question_type: type, 
                    is_required: isRequired, 
                    question_order: insertAtOrder,
                    is_selection_logic: false 
                })
                .select().single();

            if (qErr) throw qErr;

            if (type === "select" && q && validOptions.length > 0) {
                const { error: oErr } = await supabase.from("question_options").insert(
                    validOptions.map((o, i) => ({ question_id: q.id, option_text: o.trim(), display_order: i }))
                );
                if (oErr) throw oErr;
            }

            onCreated();
        } catch (err: any) {
            setError(err.message || "Failed to create question");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="rounded-[20px] border-2 border-[var(--brand-blue)]/30 bg-blue-50/20 shadow-lg shadow-blue-500/5 animate-in slide-in-from-top-2 duration-200">
            <div className="p-5 space-y-4">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--brand-blue)]">New Question</p>

                {error && (
                    <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 font-bold flex items-center gap-2">
                        <X className="w-3.5 h-3.5 shrink-0" /> {error}
                    </div>
                )}

                <div className="flex gap-2">
                    {(["text", "select"] as QuestionType[]).map((t) => (
                        <button key={t} type="button" onClick={() => setType(t)}
                            className={cn(
                                "flex items-center gap-2 px-3.5 py-2 rounded-xl border-2 text-xs font-black transition-all",
                                type === t ? "bg-blue-50 border-[var(--brand-blue)] text-[var(--brand-blue)]" : "bg-white border-gray-100 text-gray-400 hover:border-gray-200"
                            )}>
                            {t === "text" ? <Type className="w-3.5 h-3.5" /> : <ListChecks className="w-3.5 h-3.5" />}
                            {t === "text" ? "Short Answer" : "Multiple Choice"}
                        </button>
                    ))}
                </div>

                <input
                    autoFocus
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && type === "text") handleSave(); if (e.key === "Escape") onCancel(); }}
                    placeholder="e.g. What is your t-shirt size?"
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold text-gray-900 placeholder:text-gray-300 focus:outline-none focus:border-[var(--brand-blue)] focus:ring-2 focus:ring-[var(--brand-blue)]/15 transition-all"
                />

                {type === "select" && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                        <OptionsEditor options={options} onChange={setOptions} />
                    </div>
                )}

                <div className="flex items-center justify-between gap-3">
                    <button type="button" onClick={() => setIsRequired(!isRequired)}
                        className={cn(
                            "flex items-center gap-2 px-3.5 py-2 rounded-xl border-2 text-xs font-black transition-all",
                            isRequired ? "bg-green-50 border-green-300 text-green-700" : "bg-white border-gray-100 text-gray-400 hover:border-gray-200"
                        )}>
                        <div className={cn("w-4 h-4 rounded-md border-2 flex items-center justify-center transition-all", isRequired ? "bg-green-500 border-green-500" : "border-gray-300")}>
                            {isRequired && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                        Required
                    </button>
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={onCancel} className="px-4 py-2 text-xs font-black text-gray-400 hover:bg-gray-100 rounded-xl transition-all">Cancel</button>
                        <button type="button" onClick={handleSave} disabled={isSaving || !title.trim()}
                            className="flex items-center gap-2 px-5 py-2 bg-gray-900 text-white rounded-xl text-xs font-black hover:bg-black transition-all disabled:opacity-40 disabled:pointer-events-none shadow-md shadow-gray-200 active:scale-95">
                            {isSaving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Creating…</> : <><Check className="w-3.5 h-3.5" /> Create Question</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Insert Zone ──────────────────────────────────────────────────────────

function InsertZone({ onClick, isActive }: { onClick: () => void; isActive: boolean }) {
    return (
        <div className="relative flex items-center justify-center h-8 group/zone">
            {/* Always-visible faint line */}
            <div className={cn(
                "absolute inset-x-6 top-1/2 border-t transition-colors duration-150",
                isActive ? "border-[var(--brand-blue)]/40" : "border-gray-100 group-hover/zone:border-gray-200"
            )} />
            {/* + button — faint by default, solid on hover/active */}
            <button
                type="button"
                onClick={onClick}
                title="Insert question here"
                className={cn(
                    "relative z-10 flex items-center justify-center w-6 h-6 rounded-full border-2 transition-all duration-150",
                    isActive
                        ? "bg-[var(--brand-blue)] border-[var(--brand-blue)] text-white shadow-md shadow-blue-200"
                        : "bg-white border-gray-200 text-gray-300 hover:border-[var(--brand-blue)] hover:text-[var(--brand-blue)] hover:bg-blue-50 hover:shadow-sm"
                )}
            >
                <Plus className="w-3 h-3" />
            </button>
        </div>
    );
}

// ─── Main List ────────────────────────────────────────────────────────────

export function CustomQuestionList({ questions, eventId, onReorder, onDelete, onUpdated }: CustomQuestionListProps) {
    // Local copy for optimistic reorder — syncs when `questions` prop changes from parent
    const [localQuestions, setLocalQuestions] = useState<Question[]>(questions);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [insertingAtIndex, setInsertingAtIndex] = useState<number | null>(null);

    useEffect(() => {
        setLocalQuestions(questions);
    }, [questions]);

    const handleToggleExpand = (id: string) => {
        setInsertingAtIndex(null);
        setExpandedId(prev => prev === id ? null : id);
    };

    const handleInsertAt = (index: number) => {
        setExpandedId(null);
        setInsertingAtIndex(prev => prev === index ? null : index);
    };

    // Optimistic: update local state instantly, fire DB in background
    const handleMoveUp = (index: number) => {
        if (index === 0) return;
        const next = [...localQuestions];
        [next[index - 1], next[index]] = [next[index], next[index - 1]];
        setLocalQuestions(next);
        onReorder(next);
    };

    const handleMoveDown = (index: number) => {
        if (index === localQuestions.length - 1) return;
        const next = [...localQuestions];
        [next[index], next[index + 1]] = [next[index + 1], next[index]];
        setLocalQuestions(next);
        onReorder(next);
    };

    return (
        <div>
            {localQuestions.length === 0 && (
                <div className="py-6 flex flex-col items-center gap-3 text-center">
                    <p className="text-sm font-bold text-gray-400">
                        No custom questions yet — click the <span className="inline-flex items-center justify-center w-5 h-5 rounded-full border-2 border-gray-300 text-gray-400 mx-0.5"><Plus className="w-3 h-3" /></span> below to add your first one.
                    </p>
                </div>
            )}

            {/* Top insert zone */}
            <InsertZone onClick={() => handleInsertAt(0)} isActive={insertingAtIndex === 0} />
            {insertingAtIndex === 0 && (
                <div className="mb-2">
                    <InlineCreateForm eventId={eventId} insertAtOrder={0}
                        onCreated={() => { setInsertingAtIndex(null); onUpdated(); }}
                        onCancel={() => setInsertingAtIndex(null)} />
                </div>
            )}

            {localQuestions.map((q, index) => (
                <React.Fragment key={q.id}>
                    <QuestionCard
                        question={q}
                        index={index}
                        total={localQuestions.length}
                        isExpanded={expandedId === q.id}
                        onToggleExpand={() => handleToggleExpand(q.id)}
                        onCollapseExpand={() => setExpandedId(null)}
                        onDelete={(id) => { setExpandedId(null); onDelete(id); }}
                        onMoveUp={() => handleMoveUp(index)}
                        onMoveDown={() => handleMoveDown(index)}
                        onUpdated={onUpdated}
                    />
                    <InsertZone onClick={() => handleInsertAt(index + 1)} isActive={insertingAtIndex === index + 1} />
                    {insertingAtIndex === index + 1 && (
                        <div className="mb-2">
                            <InlineCreateForm eventId={eventId} insertAtOrder={index + 1}
                                onCreated={() => { setInsertingAtIndex(null); onUpdated(); }}
                                onCancel={() => setInsertingAtIndex(null)} />
                        </div>
                    )}
                </React.Fragment>
            ))}
        </div>
    );
}
