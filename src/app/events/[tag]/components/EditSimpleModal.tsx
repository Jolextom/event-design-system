"use client";

import React, { useState, useEffect } from "react";
import { Loader2, Save, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { Modal, ModalButton } from "@/app/components/ui/Modal";
import { Textarea } from "@/app/components/ui/Input";

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
            setError(null);
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
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            subtitle={`Update the ${field} for this event.`}
            size="md"
            footer={
                <>
                    <ModalButton variant="secondary" type="button" onClick={onClose}>
                        Cancel
                    </ModalButton>
                    <ModalButton
                        variant="primary"
                        onClick={(e) => handleSubmit(e as any)}
                        loading={isSubmitting}
                        loadingText="Saving..."
                    >
                        <Save className="w-4 h-4" />
                        Save Changes
                    </ModalButton>
                </>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <Textarea
                    autoFocus
                    rows={5}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder={`Enter ${field}...`}
                />
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
