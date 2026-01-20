"use client";

import React, { useState } from "react";
import { X, Plus, Trash2, ListChecks, Type, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { createClient } from "@supabase/supabase-js";
import { QuestionType } from "../types";

interface CreateQuestionModalProps {
    isOpen: boolean;
    onClose: () => void;
    eventId: string;
    onQuestionCreated: () => void;
    nextOrder: number;
}

export function CreateQuestionModal({ isOpen, onClose, eventId, onQuestionCreated, nextOrder }: CreateQuestionModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [title, setTitle] = useState("");
    const [type, setType] = useState<QuestionType>("text");
    const [isRequired, setIsRequired] = useState(false);
    const [options, setOptions] = useState<string[]>([""]);

    const handleAddOption = () => setOptions([...options, ""]);
    const handleRemoveOption = (index: number) => {
        if (options.length > 1) {
            setOptions(options.filter((_, i) => i !== index));
        }
    };
    const handleOptionChange = (index: number, value: string) => {
        const newOptions = [...options];
        newOptions[index] = value;
        setOptions(newOptions);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;
        if (type === "select" && options.some(opt => !opt.trim())) {
            setError("Please fill in all options or remove empty ones.");
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            );

            // 1. Insert Question
            const { data: questionData, error: questionErr } = await supabase
                .from("questions")
                .insert({
                    event_id: eventId,
                    title: title.trim(),
                    question_type: type,
                    is_required: isRequired,
                    question_order: nextOrder
                })
                .select()
                .single();

            if (questionErr) throw questionErr;

            // 2. Insert Options if type is select
            if (type === "select" && questionData) {
                const optionsToInsert = options
                    .filter(opt => opt.trim())
                    .map((opt, index) => ({
                        question_id: questionData.id,
                        option_text: opt.trim(),
                        display_order: index
                    }));

                if (optionsToInsert.length > 0) {
                    const { error: optionsErr } = await supabase
                        .from("question_options")
                        .insert(optionsToInsert);

                    if (optionsErr) throw optionsErr;
                }
            }

            onQuestionCreated();
            resetForm();
            onClose();
        } catch (err: any) {
            console.error("Error creating question:", err);
            setError(err.message || "Failed to create question");
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setTitle("");
        setType("text");
        setIsRequired(false);
        setOptions([""]);
        setError(null);
    };

    if (typeof document === "undefined") return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        key="question-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/40 backdrop-blur-md z-[100]"
                    />
                    <motion.div
                        key="question-modal"
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-xl bg-white rounded-[40px] shadow-2xl z-[101] overflow-hidden flex flex-col max-h-[90vh]"
                    >
                        <header className="px-10 pt-10 pb-6 flex justify-between items-center bg-white sticky top-0 z-10">
                            <div>
                                <h2 className="text-2xl font-black tracking-tight text-gray-900 leading-none">Add Question</h2>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">Configuration</p>
                            </div>
                            <button onClick={onClose} className="p-3 hover:bg-gray-100 rounded-2xl transition-all">
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </header>

                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar px-10 pb-10 space-y-8">
                            {error && (
                                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-xs font-bold leading-relaxed">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    {error}
                                </div>
                            )}

                            {/* Type Selector */}
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Question Type</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setType("text")}
                                        className={cn(
                                            "flex items-center gap-4 p-5 rounded-3xl border transition-all text-left group",
                                            type === "text"
                                                ? "bg-blue-50 border-[var(--brand-blue)] ring-2 ring-[var(--brand-blue)]/10"
                                                : "bg-white border-gray-100 hover:border-gray-200"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-10 h-10 rounded-2xl flex items-center justify-center transition-all",
                                            type === "text" ? "bg-[var(--brand-blue)] text-white" : "bg-gray-50 text-gray-400"
                                        )}>
                                            <Type className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className={cn("text-xs font-black", type === "text" ? "text-gray-900" : "text-gray-400")}>Short Answer</p>
                                            <p className="text-[9px] text-gray-400 font-bold mt-0.5">Simple text response</p>
                                        </div>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setType("select")}
                                        className={cn(
                                            "flex items-center gap-4 p-5 rounded-3xl border transition-all text-left group",
                                            type === "select"
                                                ? "bg-blue-50 border-[var(--brand-blue)] ring-2 ring-[var(--brand-blue)]/10"
                                                : "bg-white border-gray-100 hover:border-gray-200"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-10 h-10 rounded-2xl flex items-center justify-center transition-all",
                                            type === "select" ? "bg-[var(--brand-blue)] text-white" : "bg-gray-50 text-gray-400"
                                        )}>
                                            <ListChecks className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className={cn("text-xs font-black", type === "select" ? "text-gray-900" : "text-gray-400")}>Multiple Choice</p>
                                            <p className="text-[9px] text-gray-400 font-bold mt-0.5">Drop down list</p>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            {/* Title Input */}
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Question Title</label>
                                <div className="relative group">
                                    <input
                                        required
                                        type="text"
                                        placeholder="e.g. What is your t-shirt size?"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        className="w-full bg-gray-50 border border-gray-100 rounded-3xl py-5 px-7 text-sm font-bold placeholder:text-gray-300 focus:bg-white focus:border-[var(--brand-blue)] focus:ring-4 focus:ring-blue-50/50 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            {/* Options if Select */}
                            {type === "select" && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                                    <div className="flex justify-between items-center ml-1">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Options</label>
                                        <button
                                            type="button"
                                            onClick={handleAddOption}
                                            className="text-[10px] font-black text-[var(--brand-blue)] hover:bg-blue-50 px-3 py-1 rounded-full transition-all"
                                        >
                                            + Add Option
                                        </button>
                                    </div>
                                    <div className="space-y-3">
                                        {options.map((opt, index) => (
                                            <div key={index} className="flex gap-3 animate-in zoom-in-95 duration-200">
                                                <input
                                                    required
                                                    type="text"
                                                    placeholder={`Option ${index + 1}`}
                                                    value={opt}
                                                    onChange={(e) => handleOptionChange(index, e.target.value)}
                                                    className="flex-1 bg-white border border-gray-100 rounded-2xl py-3.5 px-6 text-sm font-bold focus:border-[var(--brand-blue)] outline-none transition-all"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveOption(index)}
                                                    className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Required Toggle */}
                            <div className="flex items-center justify-between p-6 bg-gray-50/50 rounded-[32px] border border-gray-100 border-dashed">
                                <div>
                                    <h4 className="text-[11px] font-black uppercase tracking-widest text-gray-900 mb-1">Mark as Required</h4>
                                    <p className="text-[10px] text-gray-400 font-bold">Guests must answer this to register.</p>
                                </div>
                                <div
                                    onClick={() => setIsRequired(!isRequired)}
                                    className={cn(
                                        "w-12 h-6.5 rounded-full p-1 cursor-pointer transition-all duration-300 shadow-inner block",
                                        isRequired ? "bg-green-500" : "bg-gray-200"
                                    )}
                                >
                                    <div className={cn("w-4.5 h-4.5 bg-white rounded-full transition-all shadow-md", isRequired ? "translate-x-5.5" : "translate-x-0")} />
                                </div>
                            </div>
                        </form>

                        <footer className="px-10 py-8 bg-white border-t border-gray-50 flex gap-4 mt-auto">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-4 text-xs font-black text-gray-500 hover:bg-gray-50 rounded-2xl transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                onClick={(e) => {
                                    e.preventDefault();
                                    handleSubmit(e as any);
                                }}
                                disabled={isSubmitting || !title.trim()}
                                className="flex-[2] py-4 bg-gray-900 text-white text-xs font-black rounded-2xl hover:bg-black transition-all shadow-xl shadow-gray-100 active:scale-[0.98] disabled:opacity-30 disabled:pointer-events-none"
                            >
                                {isSubmitting ? "Creating..." : "Create Question"}
                            </button>
                        </footer>
                    </motion.div>
                </>
            )}
        </AnimatePresence>,
        document.body
    );
}
