"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, ArrowRight, Calendar as CalendarIcon, Clock, AlertCircle, Save } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

interface EditDateTimeModalProps {
    isOpen: boolean;
    onClose: () => void;
    eventId: string;
    initialData: {
        start_date: string;
        start_time: string;
        end_time: string;
        end_date?: string; // Optional for multi-day
    };
    onCreate?: (tag: string) => void;
    onUpdate: (data: { start_date: string, end_date: string, start_time: string, end_time: string }) => void;
}

export function EditDateTimeModal({ isOpen, onClose, eventId, initialData, onUpdate }: EditDateTimeModalProps) {
    const [startDate, setStartDate] = useState(initialData.start_date);
    const [startTime, setStartTime] = useState(initialData.start_time);
    const [endTime, setEndTime] = useState(initialData.end_time);
    const [isMultiDay, setIsMultiDay] = useState(!!initialData.end_date && initialData.end_date !== initialData.start_date);
    const [endDate, setEndDate] = useState(initialData.end_date || initialData.start_date);

    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setStartDate(initialData.start_date);
            setStartTime(initialData.start_time);
            setEndTime(initialData.end_time);
            // Check if multi-day
            const multi = !!initialData.end_date && initialData.end_date !== initialData.start_date;
            setIsMultiDay(multi);
            setEndDate(initialData.end_date || initialData.start_date);
        }
    }, [isOpen, initialData]);

    const validateTime = () => {
        if (!startDate || !startTime || !endTime) return true;

        const start = new Date(`${startDate}T${startTime}`);
        const endDay = isMultiDay && endDate ? endDate : startDate;
        const end = new Date(`${endDay}T${endTime}`);

        if (end <= start) {
            setError("End time must be after start time");
            return false;
        }

        setError(null);
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!validateTime()) {
            return;
        }

        setIsSubmitting(true);
        const finalEndDate = isMultiDay && endDate ? endDate : startDate;

        const updates = {
            start_date: new Date(`${startDate}T${startTime}`).toISOString(),
            end_date: new Date(`${finalEndDate}T${endTime}`).toISOString(),
            start_time: startTime,
            end_time: endTime,
        };

        try {
            const { error: updateError } = await supabase
                .from("events")
                .update(updates)
                .eq("id", eventId);

            if (updateError) throw updateError;
            onUpdate(updates);
            onClose();
        } catch (err: any) {
            console.error("Error updating event:", err);
            setError(err.message || "Failed to update event");
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
                                <h3 className="text-xl font-black text-gray-900 tracking-tight">Edit Date & Time</h3>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="p-2 -mr-2 hover:bg-gray-50 rounded-full transition-colors text-gray-400 hover:text-gray-900"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-3">
                                    <div className="bg-gray-50/50 rounded-3xl p-6 border border-gray-100">
                                        {/* Container for Timeline */}
                                        <div className="relative pl-8">
                                            {/* Vertical Line */}
                                            <div className="absolute left-[11px] top-4 bottom-4 w-[2px] bg-gray-200/60" />

                                            {/* Start Group */}
                                            <div className="relative mb-6">
                                                {/* Solid Dot */}
                                                <div className="absolute -left-8 top-1/2 -translate-y-1/2 w-6 h-6 bg-black rounded-full border-4 border-gray-50/50 shadow-sm z-10" />

                                                <div className="space-y-3">
                                                    <div className="group relative bg-white border border-gray-200 hover:border-gray-300 transition-colors rounded-2xl px-4 py-3 flex items-center shadow-sm">
                                                        <input
                                                            required
                                                            type="date"
                                                            className="w-full bg-transparent border-none p-0 text-sm font-bold text-gray-900 focus:ring-0 outline-none appearance-none font-mono tracking-tight [&::-webkit-calendar-picker-indicator]:hidden cursor-pointer"
                                                            value={startDate}
                                                            onChange={(e) => setStartDate(e.target.value)}
                                                            onClick={(e) => e.currentTarget.showPicker()}
                                                        />
                                                        <CalendarIcon className="w-4 h-4 text-gray-400 pointer-events-none absolute right-4" />
                                                    </div>
                                                    <div className="group relative bg-white border border-gray-200 hover:border-gray-300 transition-colors rounded-2xl px-4 py-3 flex items-center shadow-sm">
                                                        <input
                                                            required
                                                            type="time"
                                                            className="w-full bg-transparent border-none p-0 text-sm font-bold text-gray-900 focus:ring-0 outline-none font-mono tracking-tight [&::-webkit-calendar-picker-indicator]:hidden cursor-pointer"
                                                            value={startTime}
                                                            onChange={(e) => setStartTime(e.target.value)}
                                                            onClick={(e) => e.currentTarget.showPicker()}
                                                        />
                                                        <Clock className="w-4 h-4 text-gray-400 pointer-events-none absolute right-4" />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* End Group */}
                                            <div className="relative">
                                                {/* Hollow Dot */}
                                                <div className="absolute -left-8 top-1/2 -translate-y-1/2 w-6 h-6 bg-white border-[3px] border-black rounded-full z-10 box-border" />

                                                <div className="space-y-3">
                                                    {isMultiDay && (
                                                        <div className="group relative bg-white border border-gray-200 hover:border-gray-300 transition-colors rounded-2xl px-4 py-3 flex items-center shadow-sm animate-in fade-in slide-in-from-top-1">
                                                            <input
                                                                required
                                                                title="End Date"
                                                                type="date"
                                                                className="w-full bg-transparent border-none p-0 text-sm font-bold text-gray-900 focus:ring-0 outline-none appearance-none font-mono tracking-tight [&::-webkit-calendar-picker-indicator]:hidden cursor-pointer"
                                                                value={endDate}
                                                                min={startDate}
                                                                onChange={(e) => setEndDate(e.target.value)}
                                                                onClick={(e) => e.currentTarget.showPicker()}
                                                            />
                                                            <CalendarIcon className="w-4 h-4 text-gray-400 pointer-events-none absolute right-4" />
                                                        </div>
                                                    )}

                                                    <div className="group relative bg-white border border-gray-200 hover:border-gray-300 transition-colors rounded-2xl px-4 py-3 flex items-center justify-between shadow-sm">
                                                        <div className="flex items-center gap-2 relative w-full">
                                                            <input
                                                                required
                                                                type="time"
                                                                className="w-full bg-transparent border-none p-0 text-sm font-bold text-gray-900 focus:ring-0 outline-none font-mono tracking-tight [&::-webkit-calendar-picker-indicator]:hidden cursor-pointer"
                                                                value={endTime}
                                                                onChange={(e) => setEndTime(e.target.value)}
                                                                onClick={(e) => e.currentTarget.showPicker()}
                                                            />

                                                            {/* End Date Toggle */}
                                                            {!isMultiDay && (
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setIsMultiDay(true);
                                                                        if (!endDate) setEndDate(startDate);
                                                                    }}
                                                                    className="absolute right-12 z-20 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black transition-colors whitespace-nowrap bg-white/80 backdrop-blur-sm px-1"
                                                                >
                                                                    + End Date
                                                                </button>
                                                            )}

                                                            <Clock className="w-4 h-4 text-gray-400 pointer-events-none absolute right-4" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="h-6 flex items-center">
                                        {error && (
                                            <div className="flex items-center gap-2 text-red-600 animate-in fade-in slide-in-from-top-1">
                                                <AlertCircle className="w-4 h-4" />
                                                <span className="text-xs font-bold">{error}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmitting || !!error}
                                    className="w-full py-5 bg-black text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2 shadow-xl shadow-gray-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none bg-gray-900"
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
