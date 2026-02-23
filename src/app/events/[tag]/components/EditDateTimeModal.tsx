"use client";

import React, { useState, useEffect } from "react";
import { Loader2, AlertCircle, Save } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { Modal, ModalButton } from "@/app/components/ui/Modal";
import { DateTimeStepper } from "@/app/components/ui/DateTimeStepper";

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
                <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
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

                {error && (
                    <div className="flex items-center gap-2 text-red-600 animate-in fade-in slide-in-from-top-1">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span className="text-xs font-bold">{error}</span>
                    </div>
                )}
            </form>
        </Modal>
    );
}
