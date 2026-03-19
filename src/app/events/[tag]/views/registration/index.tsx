"use client";

import React, { useState } from "react";
import { Plus, AlertTriangle } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { Question } from "../../types";
import { FixedFields } from "./FixedFields";
import { CustomQuestionList } from "./CustomQuestionList";
import { ConfirmModal } from "../../components/ConfirmModal";

interface RegistrationViewProps {
    questions: Question[];
    loading: boolean;
    error: string | null;
    eventId: string | null;
    onQuestionCreated: () => void;
}

export function RegistrationView({ questions, loading, error, eventId, onQuestionCreated }: RegistrationViewProps) {
    const [deleteQuestionId, setDeleteQuestionId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Batched reorder: fire all order updates in parallel, no refetch needed
    const handleReorder = async (newOrder: Question[]) => {
        if (!eventId) return;
        try {
            const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            );
            // Fire all updates concurrently — don't await so there's no skeleton reload
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
                            <h2 className="text-2xl font-black tracking-tight text-gray-900">Signup Form</h2>
                            <p className="text-sm text-gray-400 mt-1.5 font-bold">Ask the right questions to your guests.</p>
                        </div>
                    </header>

                    <div className="space-y-4">
                        <FixedFields />

                        {!loading && !error && eventId && (
                            <CustomQuestionList
                                questions={questions.filter(q => !q.is_selection_logic)}
                                eventId={eventId}
                                onReorder={handleReorder}
                                onDelete={setDeleteQuestionId}
                                onUpdated={onQuestionCreated}
                            />
                        )}

                        {!loading && !error && eventId && questions.length === 0 && (
                            <div className="py-10 flex flex-col items-center gap-4 text-center">
                                <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                                    <Plus className="w-6 h-6 text-gray-300" />
                                </div>
                                <p className="text-sm font-bold text-gray-400">
                                    No custom questions yet.<br />
                                    <span className="text-[var(--brand-blue)]">Use the + button above</span> to add your first one.
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

            {/* Delete Confirm */}
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
