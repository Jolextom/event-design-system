"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Save, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

interface EditSimpleModalProps {
    isOpen: boolean;
    onClose: () => void;
    eventId: string;
    title: string;
    field: "location" | "description";
    initialValue: string;
    onUpdate: (value: string) => void;
}

export function EditSimpleModal({ isOpen, onClose, eventId, title, field, initialValue, onUpdate }: EditSimpleModalProps) {
    const [value, setValue] = useState(initialValue);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setValue(initialValue);
        }
    }, [isOpen, initialValue]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            const { error: updateError } = await supabase
                .from("events")
                .update({ [field]: value })
                .eq("id", eventId);

            if (updateError) throw updateError;
            onUpdate(value);
            onClose();
        } catch (err: any) {
            console.error("Error updating event:", err);
            setError(err.message || "Failed to update");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98, y: 10 }}
                        className="relative w-full max-w-[500px] bg-white rounded-[24px] shadow-2xl overflow-hidden"
                    >
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-black text-gray-900 tracking-tight">{title}</h3>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="p-2 -mr-2 hover:bg-gray-50 rounded-full transition-colors text-gray-400 hover:text-gray-900"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-5">
                                <textarea
                                    autoFocus
                                    className="w-full h-40 bg-gray-50 border border-gray-100 rounded-xl p-4 text-base font-bold text-gray-900 focus:ring-0 focus:border-black outline-none resize-none placeholder:text-gray-300 transition-colors"
                                    value={value}
                                    onChange={(e) => setValue(e.target.value)}
                                    placeholder={`Enter ${field}...`}
                                />

                                {error && (
                                    <div className="flex items-center gap-2 text-red-600 animate-in fade-in slide-in-from-top-1">
                                        <AlertCircle className="w-4 h-4" />
                                        <span className="text-xs font-bold">{error}</span>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full py-5 bg-black text-white rounded-xl text-sm font-black uppercase tracking-widest hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2 shadow-xl shadow-gray-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none bg-gray-900"
                                >
                                    {isSubmitting ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4" /> Save Changes
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
