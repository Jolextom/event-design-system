"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Plus, Upload, ChevronLeft, ChevronRight } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { Question } from "../../types";
import { FixedFields } from "./FixedFields";
import { ConfirmModal } from "../../components/ConfirmModal";
import { CampaignQuestionCard } from "@/app/campaigns/[id]/builder/CampaignQuestionCard";
import { ImportQuestionsModal } from "@/app/campaigns/[id]/builder/ImportQuestionsModal";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface RegistrationViewProps {
    questions: Question[];
    loading: boolean;
    error: string | null;
    eventId: string | null;
    onQuestionCreated: () => void;
}

export function RegistrationView({ questions, loading, error, eventId, onQuestionCreated }: RegistrationViewProps) {
    const [localQuestions, setLocalQuestions] = useState<Question[]>(questions);
    const [activePage, setActivePage] = useState(1);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [deleteQuestionId, setDeleteQuestionId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Selection-logic (ticket-routing) questions live in their own tab — keep them out of here.
    const signupQuestions = useMemo(
        () => localQuestions.filter(q => !q.is_selection_logic),
        [localQuestions]
    );

    useEffect(() => {
        setLocalQuestions(questions);
    }, [questions]);

    const pageCount = useMemo(
        () => Math.max(1, ...signupQuestions.map(q => q.page || 1)),
        [signupQuestions]
    );
    const questionsOnPage = useMemo(
        () => signupQuestions.filter(q => (q.page || 1) === activePage),
        [signupQuestions, activePage]
    );

    const handleAddQuestion = async () => {
        if (!eventId) return;
        const nextOrder = signupQuestions.length;
        const { data, error: insertErr } = await supabase.from("questions").insert({
            event_id: eventId,
            campaign_id: null,
            title: "Untitled question",
            question_type: "text",
            is_required: false,
            question_order: nextOrder,
            page: activePage,
            is_selection_logic: false,
        }).select().single();

        if (!insertErr && data) {
            setLocalQuestions(prev => [...prev, { ...data, options: [] }]);
            setExpandedId(data.id);
        }
    };

    const handleAddPage = () => setActivePage(pageCount + 1);

    const handleDeleteQuestion = async () => {
        if (!deleteQuestionId) return;
        setIsDeleting(true);
        try {
            const { error: deleteError } = await supabase.from("questions").delete().eq("id", deleteQuestionId);
            if (!deleteError) {
                setLocalQuestions(prev => prev.filter(q => q.id !== deleteQuestionId));
                onQuestionCreated();
            }
        } finally {
            setIsDeleting(false);
            setDeleteQuestionId(null);
        }
    };

    const handleMove = (index: number, direction: "up" | "down") => {
        const pageQs = [...questionsOnPage];
        const swapIndex = direction === "up" ? index - 1 : index + 1;
        if (swapIndex < 0 || swapIndex >= pageQs.length) return;
        [pageQs[index], pageQs[swapIndex]] = [pageQs[swapIndex], pageQs[index]];

        const others = localQuestions.filter(q => q.is_selection_logic || (q.page || 1) !== activePage);
        setLocalQuestions([...others, ...pageQs]);

        Promise.all(
            pageQs.map((q, i) => supabase.from("questions").update({ question_order: i }).eq("id", q.id))
        ).catch(console.error);
    };

    return (
        <div className="flex h-full overflow-hidden">
            <div className="flex-1 h-full overflow-y-auto bg-white custom-scrollbar">
                <div className="max-w-3xl p-8 md:p-10 mx-auto space-y-10 pb-24">
                    <header className="flex justify-between items-end border-b border-gray-100 pb-8 mt-4">
                        <div>
                            <h2 className="text-2xl font-black tracking-tight text-gray-900">Signup Form</h2>
                            <p className="text-sm text-gray-400 mt-1.5 font-bold">Ask the right questions to your guests.</p>
                        </div>
                    </header>

                    <div className="space-y-4">
                        <FixedFields />

                        {loading && (
                            <div className="space-y-4">
                                {[1, 2].map(i => (
                                    <div key={i} className="h-24 bg-gray-50 border border-gray-100 rounded-[24px] animate-pulse" />
                                ))}
                            </div>
                        )}

                        {error && (
                            <div className="p-6 bg-red-50 border border-red-100 rounded-2xl text-sm text-red-600 font-bold">
                                {error}
                            </div>
                        )}

                        {!loading && !error && eventId && (
                            <>
                                {pageCount > 1 && (
                                    <div className="flex items-center justify-between bg-white border border-gray-200 rounded-2xl px-3 py-2.5">
                                        <button
                                            onClick={() => setActivePage(p => Math.max(1, p - 1))}
                                            disabled={activePage === 1}
                                            className="p-2 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-30 disabled:pointer-events-none transition-all"
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                        </button>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Page</span>
                                            <select
                                                value={activePage}
                                                onChange={(e) => setActivePage(parseInt(e.target.value))}
                                                className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-black text-gray-900 outline-none focus:border-[var(--brand-blue)] transition-all"
                                            >
                                                {Array.from({ length: pageCount }, (_, i) => i + 1).map(p => (
                                                    <option key={p} value={p}>{p}</option>
                                                ))}
                                            </select>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">of {pageCount}</span>
                                        </div>
                                        <button
                                            onClick={() => setActivePage(p => Math.min(pageCount, p + 1))}
                                            disabled={activePage === pageCount}
                                            className="p-2 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-30 disabled:pointer-events-none transition-all"
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}

                                <div className="space-y-3">
                                    {questionsOnPage.map((q, index) => (
                                        <CampaignQuestionCard
                                            key={q.id}
                                            question={q}
                                            index={index}
                                            total={questionsOnPage.length}
                                            pageCount={pageCount}
                                            isExpanded={expandedId === q.id}
                                            onToggleExpand={() => setExpandedId(prev => prev === q.id ? null : q.id)}
                                            onCollapseExpand={() => setExpandedId(null)}
                                            onDelete={setDeleteQuestionId}
                                            onMoveUp={() => handleMove(index, "up")}
                                            onMoveDown={() => handleMove(index, "down")}
                                            onUpdated={onQuestionCreated}
                                            onSaved={(patch) => setLocalQuestions(prev => prev.map(pq => pq.id === q.id ? { ...pq, ...patch } : pq))}
                                        />
                                    ))}
                                </div>

                                {signupQuestions.length === 0 && (
                                    <div className="py-10 flex flex-col items-center gap-4 text-center">
                                        <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                                            <Plus className="w-6 h-6 text-gray-300" />
                                        </div>
                                        <p className="text-sm font-bold text-gray-400">
                                            No custom questions yet.<br />
                                            Use the buttons below to add your first one, or import a whole set at once.
                                        </p>
                                    </div>
                                )}

                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={handleAddQuestion}
                                        className="flex-1 flex items-center justify-center gap-2 py-3.5 border-2 border-dashed border-gray-200 rounded-2xl text-xs font-black uppercase tracking-widest text-gray-400 hover:text-[var(--brand-blue)] hover:border-[var(--brand-blue)]/40 hover:bg-blue-50/30 transition-all"
                                    >
                                        <Plus className="w-4 h-4" /> Add Question
                                    </button>
                                    <button
                                        onClick={handleAddPage}
                                        className="px-5 py-3.5 border-2 border-dashed border-gray-200 rounded-2xl text-xs font-black uppercase tracking-widest text-gray-400 hover:text-gray-700 hover:border-gray-300 transition-all"
                                    >
                                        + Page
                                    </button>
                                    <button
                                        onClick={() => setIsImportModalOpen(true)}
                                        className="flex items-center gap-2 px-5 py-3.5 border-2 border-dashed border-gray-200 rounded-2xl text-xs font-black uppercase tracking-widest text-gray-400 hover:text-purple-600 hover:border-purple-300 hover:bg-purple-50/30 transition-all"
                                    >
                                        <Upload className="w-4 h-4" /> Import
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {eventId && (
                <ImportQuestionsModal
                    isOpen={isImportModalOpen}
                    onClose={() => setIsImportModalOpen(false)}
                    eventId={eventId}
                    nextOrder={signupQuestions.length}
                    onImported={onQuestionCreated}
                />
            )}

            <ConfirmModal
                isOpen={!!deleteQuestionId}
                onClose={() => setDeleteQuestionId(null)}
                onConfirm={handleDeleteQuestion}
                title="Delete Question?"
                description="This will permanently remove the question and all existing responses."
                confirmLabel={isDeleting ? "Deleting…" : "Delete"}
                cancelLabel="Cancel"
                isDestructive
            />
        </div>
    );
}
