"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, ArrowRight, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { DateTimeStepper } from "@/app/components/ui/DateTimeStepper";

interface CreateEventModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    onCreated: (tag: string) => void;
}

export function CreateEventModal({ isOpen, onClose, userId, onCreated }: CreateEventModalProps) {
    const [title, setTitle] = useState("");
    const [startDate, setStartDate] = useState("");
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");
    const [isMultiDay, setIsMultiDay] = useState(false);
    const [endDate, setEndDate] = useState("");
    const [eventFormat, setEventFormat] = useState<"physical" | "virtual" | "hybrid">("physical");

    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen && !startDate) {
            const today = new Date().toISOString().split("T")[0];
            setStartDate(today);
            setEndDate(today);
        }
    }, [isOpen, startDate]);

    useEffect(() => { validateTime(); }, [startDate, startTime, endDate, endTime, isMultiDay]);

    const validateTime = () => {
        if (!startDate || !startTime || !endTime) return true;
        const start = new Date(`${startDate}T${startTime}`);
        const endDay = isMultiDay && endDate ? endDate : startDate;
        const end = new Date(`${endDay}T${endTime}`);
        if (end <= start) { setError("End time must be after start time"); return false; }
        setError(null);
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!title.trim()) { setError("Please enter an event title"); return; }
        if (!validateTime()) return;

        setIsSubmitting(true);
        const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.random().toString(36).substring(2, 6);
        const finalEndDate = isMultiDay && endDate ? endDate : startDate;

        try {
            const { data, error: insertError } = await supabase
                .from("events")
                .insert([{
                    created_by: userId,
                    event_title: title,
                    tag: slug,
                    event_format: eventFormat,
                    start_date: new Date(`${startDate}T${startTime}`).toISOString(),
                    end_date: new Date(`${finalEndDate}T${endTime}`).toISOString(),
                    start_time: startTime,
                    end_time: endTime,
                    is_published: false,
                    location: null,
                    description: null
                }])
                .select()
                .single();

            if (insertError) throw insertError;
            onCreated(data.tag);
        } catch (err: any) {
            console.error("Error creating event:", err);
            setError(err.message || "Failed to create event");
            setIsSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98, y: 10 }}
                        className="relative w-full max-w-[500px] bg-white rounded-[32px] shadow-2xl overflow-hidden"
                    >
                        <div className="p-8">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-xl font-black text-gray-900 tracking-tight">Create Event</h3>
                                <button type="button" onClick={onClose} className="p-2 -mr-2 hover:bg-gray-50 rounded-full transition-colors text-gray-400 hover:text-gray-900">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-8">
                                {/* Title */}
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Event Name</label>
                                    <input
                                        required autoFocus
                                        type="text"
                                        placeholder="e.g. Product Launch 2026"
                                        className="w-full px-0 py-2 text-2xl font-black text-gray-900 placeholder:text-gray-200 border-b-2 border-gray-100 focus:border-black focus:ring-0 outline-none transition-all bg-transparent"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                    />
                                </div>

                                {/* Event Format */}
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Event Format</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { id: 'physical', label: 'Physical', icon: '📍', locked: false },
                                            { id: 'virtual', label: 'Virtual', icon: '🌐', locked: true },
                                            { id: 'hybrid', label: 'Hybrid', icon: '📍🌐', locked: true },
                                        ].map(format => (
                                            <div key={format.id} className="relative">
                                                <button
                                                    type="button"
                                                    disabled={format.locked}
                                                    onClick={() => !format.locked && setEventFormat(format.id as "physical" | "virtual" | "hybrid")}
                                                    className={`w-full py-3 px-4 rounded-2xl border transition-all text-sm font-bold flex flex-col items-center gap-1 ${
                                                        format.locked
                                                            ? 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed opacity-60'
                                                            : eventFormat === format.id
                                                                ? 'bg-gray-900 border-gray-900 text-white shadow-md'
                                                                : 'bg-white border-gray-100 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                                                    }`}
                                                >
                                                    <span className="text-xl mb-1">{format.icon}</span>
                                                    {format.label}
                                                </button>
                                                {format.locked && (
                                                    <span className="absolute -top-1.5 -right-1.5 text-[8px] font-black uppercase tracking-tight bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded-full">
                                                        Soon
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Date & Time */}
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Date & Time</label>
                                    <div className="bg-gray-50/60 rounded-3xl p-6 border border-gray-100">
                                        <DateTimeStepper
                                            startDate={startDate}
                                            startTime={startTime}
                                            endTime={endTime}
                                            endDate={endDate}
                                            isMultiDay={isMultiDay}
                                            onStartDateChange={setStartDate}
                                            onStartTimeChange={setStartTime}
                                            onEndTimeChange={setEndTime}
                                            onEndDateChange={setEndDate}
                                            onToggleMultiDay={() => { setIsMultiDay(p => !p); if (!endDate) setEndDate(startDate); }}
                                        />
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
                                    className="w-full py-5 bg-gray-900 text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2 shadow-xl shadow-gray-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                                >
                                    {isSubmitting
                                        ? <Loader2 className="w-4 h-4 animate-spin" />
                                        : <>Continue <ArrowRight className="w-4 h-4 ml-1" /></>
                                    }
                                </button>
                            </form>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
