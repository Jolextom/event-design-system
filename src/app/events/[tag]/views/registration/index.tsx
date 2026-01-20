"use client";

import React, { useState } from "react";
import { Plus, AlertTriangle } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { Question } from "../../types";
import { CreateQuestionModal } from "../../components/CreateQuestionModal";
import { EditQuestionModal } from "../../components/EditQuestionModal";
import { FixedFields } from "./FixedFields";
import { CustomQuestionList } from "./CustomQuestionList";

interface RegistrationViewProps {
    questions: Question[];
    loading: boolean;
    error: string | null;
    eventId: string | null;
    onQuestionCreated: () => void;
}

export function RegistrationView({ questions, loading, error, eventId, onQuestionCreated }: RegistrationViewProps) {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
    const [deleteQuestionId, setDeleteQuestionId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isReordering, setIsReordering] = useState(false);

    const handleReorder = async (newOrder: Question[]) => {
        setIsReordering(true);
        try {
            const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            );
            const updates = newOrder.map((q, index) => ({
                id: q.id,
                question_order: index
            }));
            for (const update of updates) {
                await supabase
                    .from("questions")
                    .update({ question_order: update.question_order })
                    .eq("id", update.id);
            }
            onQuestionCreated();
        } catch (err) {
            console.error("Reorder failed:", err);
        } finally {
            setIsReordering(false);
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
                            <h2 className="text-2xl font-black tracking-tight text-gray-900">Signup Form</h2>
                            <p className="text-sm text-gray-400 mt-1.5 font-bold">Ask the right questions to your guests.</p>
                        </div>
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-2xl text-xs font-black hover:bg-black transition-all shadow-xl shadow-gray-100 active:scale-95"
                        >
                            <Plus className="w-4 h-4" /> Add Question
                        </button>
                    </header>

                    <div className="space-y-4">
                        <FixedFields />

                        {!loading && !error && (
                            <CustomQuestionList
                                questions={questions}
                                onReorder={handleReorder}
                                onEdit={setEditingQuestion}
                                onDelete={setDeleteQuestionId}
                            />
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

            {editingQuestion && (
                <EditQuestionModal
                    isOpen={!!editingQuestion}
                    onClose={() => setEditingQuestion(null)}
                    question={editingQuestion}
                    onQuestionUpdated={onQuestionCreated}
                />
            )}

            {isCreateModalOpen && eventId && (
                <CreateQuestionModal
                    isOpen={isCreateModalOpen}
                    onClose={() => setIsCreateModalOpen(false)}
                    eventId={eventId}
                    onQuestionCreated={onQuestionCreated}
                    nextOrder={questions.length}
                />
            )}

            {deleteQuestionId && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteQuestionId(null)} />
                    <div className="relative bg-white rounded-[32px] p-8 max-w-sm w-full shadow-2xl">
                        <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mb-6">
                            <AlertTriangle className="w-7 h-7 text-red-600" />
                        </div>
                        <h3 className="text-lg font-black text-gray-900 mb-2">Delete Question?</h3>
                        <p className="text-sm text-gray-500 font-bold mb-8">Permanently remove this question and all data.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteQuestionId(null)} className="flex-1 py-3 text-sm font-black text-gray-500 hover:bg-gray-50 rounded-xl transition-all">Cancel</button>
                            <button onClick={handleDeleteQuestion} disabled={isDeleting} className="flex-1 py-3 bg-red-600 text-white text-sm font-black rounded-xl hover:bg-red-700 transition-all disabled:opacity-50">
                                {isDeleting ? "Deleting..." : "Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
