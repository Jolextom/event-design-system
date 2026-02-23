"use client";

import React, { useState, useEffect } from "react";
import { Loader2, ArrowRight, Calendar as CalendarIcon, Clock, AlertCircle, Save } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { Modal, ModalButton } from "@/app/components/ui/Modal";

interface EditDateTimeModalProps {
    isOpen: boolean;
    onClose: () => void;
    eventId: string;
    initialData: {
        start_date: string;
        start_time: string;
        end_time: string;
        end_date?: string;
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
            const multi = !!initialData.end_date && initialData.end_date !== initialData.start_date;
            setIsMultiDay(multi);
            setEndDate(initialData.end_date || initialData.start_date);
            setError(null);
        }
    }, [isOpen, initialData]);

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
        if (!validateTime()) return;

        setIsSubmitting(true);
        const finalEndDate = isMultiDay && endDate ? endDate : startDate;
        const updates = {
            start_date: new Date(`${startDate}T${startTime}`).toISOString(),
            end_date: new Date(`${finalEndDate}T${endTime}`).toISOString(),
            start_time: startTime,
            end_time: endTime,
        };

        try {
            const { error: updateError } = await supabase.from("events").update(updates).eq("id", eventId);
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
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Edit Date & Time"
            subtitle="Set when your event starts and ends."
            size="md"
            footer={
                <>
                    <ModalButton variant="secondary" onClick={onClose}>Cancel</ModalButton>
                    <ModalButton
                        variant="primary"
                        onClick={(e) => handleSubmit(e as any)}
                        loading={isSubmitting}
                        loadingText="Saving..."
                        disabled={!!error}
                    >
                        <Save className="w-4 h-4" /> Save Changes
                    </ModalButton>
                </>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-5">
                <div className="bg-gray-50 rounded-2xl p-5 border border-gray-200 space-y-3">
                    {/* Timeline visual */}
                    <div className="relative pl-8">
                        {/* Vertical Line */}
                        <div className="absolute left-[11px] top-4 bottom-4 w-[2px] bg-gray-200" />

                        {/* Start Group */}
                        <div className="relative mb-5">
                            <div className="absolute -left-8 top-1/2 -translate-y-1/2 w-6 h-6 bg-gray-900 rounded-full border-4 border-gray-50 shadow-sm z-10" />
                            <div className="space-y-3">
                                <div className="group relative bg-white border border-gray-200 hover:border-gray-300 transition-colors rounded-xl px-4 py-3 flex items-center shadow-sm">
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
                                <div className="group relative bg-white border border-gray-200 hover:border-gray-300 transition-colors rounded-xl px-4 py-3 flex items-center shadow-sm">
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
                            <div className="absolute -left-8 top-1/2 -translate-y-1/2 w-6 h-6 bg-white border-[3px] border-gray-900 rounded-full z-10 box-border" />
                            <div className="space-y-3">
                                {isMultiDay && (
                                    <div className="group relative bg-white border border-gray-200 hover:border-gray-300 transition-colors rounded-xl px-4 py-3 flex items-center shadow-sm">
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
                                <div className="group relative bg-white border border-gray-200 hover:border-gray-300 transition-colors rounded-xl px-4 py-3 flex items-center shadow-sm">
                                    <div className="flex items-center gap-2 relative w-full">
                                        <input
                                            required
                                            type="time"
                                            className="w-full bg-transparent border-none p-0 text-sm font-bold text-gray-900 focus:ring-0 outline-none font-mono tracking-tight [&::-webkit-calendar-picker-indicator]:hidden cursor-pointer"
                                            value={endTime}
                                            onChange={(e) => setEndTime(e.target.value)}
                                            onClick={(e) => e.currentTarget.showPicker()}
                                        />
                                        {!isMultiDay && (
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); setIsMultiDay(true); if (!endDate) setEndDate(startDate); }}
                                                className="absolute right-8 z-20 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black transition-colors whitespace-nowrap bg-white/80 backdrop-blur-sm px-1"
                                            >
                                                + End Date
                                            </button>
                                        )}
                                        <Clock className="w-4 h-4 text-gray-400 pointer-events-none absolute right-0" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="flex items-center gap-2 text-red-600">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span className="text-xs font-bold">{error}</span>
                    </div>
                )}
            </form>
        </Modal>
    );
}
