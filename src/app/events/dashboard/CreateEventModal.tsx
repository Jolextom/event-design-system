"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, ArrowRight, Calendar as CalendarIcon, Clock, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";

interface CreateEventModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    onCreated: (tag: string) => void;
}

export function CreateEventModal({ isOpen, onClose, userId, onCreated }: CreateEventModalProps) {
    const [title, setTitle] = useState("");

    // Dates & Times
    const [startDate, setStartDate] = useState("");
    const [startTime, setStartTime] = useState("09:00");
    const [endTime, setEndTime] = useState("17:00");
    const [isMultiDay, setIsMultiDay] = useState(false);
    const [endDate, setEndDate] = useState("");

    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Initialize defaults when opening
    useEffect(() => {
        if (isOpen && !startDate) {
            const today = new Date().toISOString().split("T")[0];
            setStartDate(today);
            setEndDate(today);
        }
    }, [isOpen, startDate]);

    // Validation Effect
    useEffect(() => {
        validateTime();
    }, [startDate, startTime, endDate, endTime, isMultiDay]);

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

        if (!title.trim()) {
            setError("Please enter an event title");
            return;
        }

        if (!validateTime()) {
            return;
        }

        setIsSubmitting(true);
        // Slug generation
        const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.random().toString(36).substring(2, 6);
        const finalEndDate = isMultiDay && endDate ? endDate : startDate;

        try {
            const { data, error: insertError } = await supabase
                .from("events")
                .insert([
                    {
                        created_by: userId,
                        event_title: title,
                        tag: slug,
                        start_date: new Date(`${startDate}T${startTime}`).toISOString(),
                        end_date: new Date(`${finalEndDate}T${endTime}`).toISOString(),
                        start_time: startTime,
                        end_time: endTime,
                        is_published: false,
                        location: null,
                        description: null
                    }
                ])
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
                        className="relative w-full max-w-[500px] bg-white rounded-[32px] shadow-2xl overflow-hidden"
                    >
                        <div className="p-8">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-xl font-black text-gray-900 tracking-tight">Create Event</h3>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="p-2 -mr-2 hover:bg-gray-50 rounded-full transition-colors text-gray-400 hover:text-gray-900"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Event Name</label>
                                    <input
                                        required
                                        autoFocus
                                        type="text"
                                        placeholder="e.g. Product Launch 2026"
                                        className="w-full px-0 py-2 text-2xl font-black text-gray-900 placeholder:text-gray-200 border-b-2 border-gray-100 focus:border-black focus:ring-0 outline-none transition-all bg-transparent"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                    />
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Date & Time</label>

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

                                                    <div className="group relative bg-white border border-gray-200 hover:border-gray-300 transition-colors rounded-2xl px-4 py-3 flex items-center shadow-sm">
                                                        <input
                                                            required
                                                            type="time"
                                                            className="w-full bg-transparent border-none p-0 text-sm font-bold text-gray-900 focus:ring-0 outline-none font-mono tracking-tight [&::-webkit-calendar-picker-indicator]:hidden cursor-pointer"
                                                            value={endTime}
                                                            onChange={(e) => setEndTime(e.target.value)}
                                                            onClick={(e) => e.currentTarget.showPicker()}
                                                        />

                                                        {/* End Date Toggle - Positioned to left of icon */}
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
                                            Continue <ArrowRight className="w-4 h-4 ml-1" />
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
