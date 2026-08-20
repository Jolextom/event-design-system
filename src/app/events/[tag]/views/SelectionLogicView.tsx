"use client";

import React, { useState } from "react";
import { Plus, Zap, ArrowRight, Check, ListChecks, Type, X, Ticket } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { Question } from "../types";
import { ConfirmModal } from "../components/ConfirmModal";
import { CreateQuestionModal } from "../components/CreateQuestionModal";
import { cn } from "@/lib/utils";

interface SelectionLogicViewProps {
    questions: Question[];
    passes: any[];
    loading: boolean;
    error: string | null;
    eventId: string | null;
    onQuestionCreated: () => void;
    onPassUpdated: () => void;
}

export function SelectionLogicView({ questions, passes, loading, error, eventId, onQuestionCreated, onPassUpdated }: SelectionLogicViewProps) {
    const [deleteQuestionId, setDeleteQuestionId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [createModalOpen, setCreateModalOpen] = useState(false);

    const selectionQuestions = questions.filter(q => q.is_selection_logic === true);

    const handleReorder = async (newOrder: Question[]) => {
        if (!eventId) return;
        try {
            const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            );
            Promise.all(
                newOrder.map((q, index) =>
                    supabase.from("questions").update({ question_order: index }).eq("id", q.id)
                )
            ).then((results) => {
                const failed = results.find(r => r.error);
                if (failed?.error) console.error("Reorder failed:", failed.error);
            });
        } catch (err) {
            console.error("Reorder error:", err);
        }
    };

    const handleDeleteQuestion = async () => {
        if (!deleteQuestionId) return;
        setIsDeleting(true);
        try {
            const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            );
            const { error: deleteError } = await supabase
                .from("questions")
                .delete()
                .eq("id", deleteQuestionId);
            if (!deleteError) onQuestionCreated();
        } catch (err) {
            console.error("Delete failed:", err);
        } finally {
            setIsDeleting(false);
            setDeleteQuestionId(null);
        }
    };

    return (
        <div className="flex h-full overflow-hidden">
            <div className="flex-1 h-full overflow-y-auto bg-white custom-scrollbar">
                <div className="max-w-3xl p-8 md:p-10 mx-auto space-y-10 pb-24">
                    <header className="flex justify-between items-end border-b border-gray-100 pb-8 mt-4">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                                    <Zap className="w-3.5 h-3.5" />
                                </div>
                                <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">Step 2: Logic</h2>
                            </div>
                            <h2 className="text-2xl font-black tracking-tight text-gray-900">Selection Logic</h2>
                            <p className="text-sm text-gray-400 mt-1.5 font-bold">Ask questions right before showing tickets to filter them.</p>
                        </div>
                        <button
                            onClick={() => setCreateModalOpen(true)}
                            className="bg-gray-900 text-white px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-gray-100 flex items-center gap-2 active:scale-95"
                        >
                            <Plus className="w-4 h-4" /> Add Question
                        </button>
                    </header>

                    <div className="space-y-6">
                        {/* Summary Card */}
                        <div className="p-8 bg-blue-50/50 border border-blue-100 rounded-[32px] space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center border border-blue-100 text-blue-600 shadow-sm">
                                    <ListChecks className="w-5 h-5" />
                                </div>
                                <h3 className="text-sm font-black text-gray-900">How it works</h3>
                            </div>
                            <p className="text-[13px] text-gray-600 leading-relaxed font-medium">
                                Selection questions are the first thing guests see on your registration page. 
                                Based on their answers, only specific tickets will be displayed. 
                                <span className="font-bold"> Use "Multiple Choice" questions and then link tickets to specific options in the "Ticket Types" section.</span>
                            </p>
                        </div>

                        <div className="grid grid-cols-1 gap-8">
                            {selectionQuestions.map(question => (
                                <div key={question.id} className="p-10 bg-gray-50/50 border border-gray-100 rounded-[40px] space-y-10 group hover:bg-white hover:border-blue-100/50 hover:shadow-2xl hover:shadow-blue-900/5 transition-all duration-500">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-white rounded-2xl border border-gray-100 flex items-center justify-center text-blue-500 shadow-sm">
                                                <ListChecks className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h4 className="text-lg font-black text-gray-900 leading-none mb-2">{question.title}</h4>
                                                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Trigger Question</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button 
                                                onClick={() => setDeleteQuestionId(question.id)}
                                                className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                            >
                                                <Plus className="w-4 h-4 rotate-45" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {question.options?.map(option => {
                                            const linkedPasses = passes.filter(p => p.show_for_option_id === option.id);
                                            const linkedQuestions = questions.filter(q => !q.is_selection_logic && q.show_for_option_id === option.id);
                                            const linkableQuestions = questions.filter(q => !q.is_selection_logic && q.show_for_option_id !== option.id);
                                            return (
                                                <div key={option.id} className="p-8 bg-white border border-gray-100 rounded-[32px] space-y-6 shadow-sm hover:border-blue-200 transition-all">
                                                    <div className="flex justify-between items-start">
                                                        <span className="text-sm font-black text-gray-900 leading-tight pr-4">{option.option_text}</span>
                                                        <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest bg-gray-50 px-2 py-1 rounded-md">Option</span>
                                                    </div>

                                                    <div className="space-y-3">
                                                        <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Tickets</p>
                                                        <div className="space-y-2">
                                                            {linkedPasses.length > 0 ? (
                                                                linkedPasses.map(ticket => (
                                                                    <div key={ticket.id} className="flex items-center justify-between p-3 bg-blue-50/50 rounded-xl group/ticket">
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                                                                            <span className="text-xs font-bold text-gray-700">{ticket.title}</span>
                                                                        </div>
                                                                        <button
                                                                            onClick={async () => {
                                                                                const supabase = createClient(
                                                                                    process.env.NEXT_PUBLIC_SUPABASE_URL!,
                                                                                    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
                                                                                );
                                                                                await supabase.from('passes').update({ show_for_option_id: null }).eq('id', ticket.id);
                                                                                onPassUpdated();
                                                                            }}
                                                                            className="p-1 text-gray-300 hover:text-red-500 hover:bg-white rounded-lg transition-all opacity-0 group-hover/ticket:opacity-100"
                                                                        >
                                                                            <X className="w-3 h-3" />
                                                                        </button>
                                                                    </div>
                                                                ))
                                                            ) : (
                                                                <p className="text-[10px] text-gray-400 font-bold italic py-2">No tickets linked</p>
                                                            )}
                                                        </div>

                                                        <div className="relative">
                                                            <select
                                                                className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest focus:ring-2 focus:ring-blue-100 outline-none appearance-none cursor-pointer hover:bg-blue-50 hover:text-blue-600 transition-all"
                                                                value=""
                                                                onChange={async (e) => {
                                                                    const passId = e.target.value;
                                                                    if (!passId) return;
                                                                    const supabase = createClient(
                                                                        process.env.NEXT_PUBLIC_SUPABASE_URL!,
                                                                        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
                                                                    );
                                                                    await supabase.from('passes').update({ show_for_option_id: option.id }).eq('id', passId);
                                                                    onPassUpdated();
                                                                }}
                                                            >
                                                                <option value="">+ Link Ticket</option>
                                                                {passes.filter(p => p.show_for_option_id !== option.id).map(p => (
                                                                    <option key={p.id} value={p.id}>{p.title}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-3 pt-2 border-t border-gray-50">
                                                        <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Questions</p>
                                                        <div className="space-y-2">
                                                            {linkedQuestions.length > 0 ? (
                                                                linkedQuestions.map(q => (
                                                                    <div key={q.id} className="flex items-center justify-between p-3 bg-purple-50/50 rounded-xl group/question">
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="w-2 h-2 rounded-full bg-purple-500" />
                                                                            <span className="text-xs font-bold text-gray-700">{q.title}</span>
                                                                        </div>
                                                                        <button
                                                                            onClick={async () => {
                                                                                const supabase = createClient(
                                                                                    process.env.NEXT_PUBLIC_SUPABASE_URL!,
                                                                                    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
                                                                                );
                                                                                await supabase.from('questions').update({ show_for_option_id: null }).eq('id', q.id);
                                                                                onQuestionCreated();
                                                                            }}
                                                                            className="p-1 text-gray-300 hover:text-red-500 hover:bg-white rounded-lg transition-all opacity-0 group-hover/question:opacity-100"
                                                                        >
                                                                            <X className="w-3 h-3" />
                                                                        </button>
                                                                    </div>
                                                                ))
                                                            ) : (
                                                                <p className="text-[10px] text-gray-400 font-bold italic py-2">No questions linked</p>
                                                            )}
                                                        </div>

                                                        <div className="relative">
                                                            <select
                                                                className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest focus:ring-2 focus:ring-purple-100 outline-none appearance-none cursor-pointer hover:bg-purple-50 hover:text-purple-600 transition-all"
                                                                value=""
                                                                onChange={async (e) => {
                                                                    const questionId = e.target.value;
                                                                    if (!questionId) return;
                                                                    const supabase = createClient(
                                                                        process.env.NEXT_PUBLIC_SUPABASE_URL!,
                                                                        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
                                                                    );
                                                                    await supabase.from('questions').update({ show_for_option_id: option.id }).eq('id', questionId);
                                                                    onQuestionCreated();
                                                                }}
                                                            >
                                                                <option value="">+ Link Question</option>
                                                                {linkableQuestions.map(q => (
                                                                    <option key={q.id} value={q.id}>{q.title}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {!loading && !error && eventId && selectionQuestions.length === 0 && (
                            <div className="py-20 flex flex-col items-center gap-4 text-center">
                                <div className="w-16 h-16 rounded-3xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-200">
                                    <Zap className="w-8 h-8" />
                                </div>
                                <p className="text-sm font-bold text-gray-400">
                                    No selection questions created yet.<br />
                                    <span className="text-blue-500">Add a question</span> to enable guided ticket selection.
                                </p>
                            </div>
                        )}

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
                    </div>
                </div>
            </div>

            <CreateQuestionModal
                isOpen={createModalOpen}
                onClose={() => setCreateModalOpen(false)}
                eventId={eventId || ""}
                onQuestionCreated={onQuestionCreated}
                nextOrder={questions.length}
                isSelectionLogic={true}
            />

            {/* Delete Confirm */}
            <ConfirmModal
                isOpen={!!deleteQuestionId}
                onClose={() => setDeleteQuestionId(null)}
                onConfirm={handleDeleteQuestion}
                title="Delete Question?"
                description="This will permanently remove the selection question and its visibility logic."
                confirmLabel={isDeleting ? "Deleting…" : "Delete"}
                cancelLabel="Cancel"
                isDestructive
            />
        </div>
    );
}
