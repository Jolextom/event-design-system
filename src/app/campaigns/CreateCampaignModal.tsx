"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { Calendar, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { Modal, ModalButton } from "@/app/components/ui/Modal";
import { Input } from "@/app/components/ui/Input";
import type { Campaign, CampaignTrigger, CampaignType } from "../events/[tag]/types";

interface EventOption {
    id: string;
    event_title: string;
}

interface CreateCampaignModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    /** If provided, locks the campaign to this event (Event Campaign mode only) */
    fixedEventId?: string;
    onCreated: (campaign: Campaign) => void;
}

const TRIGGER_OPTIONS: { value: CampaignTrigger; label: string; hint: string }[] = [
    { value: "pre_registration", label: "Pre-Registration", hint: "Embedded into the signup flow, asked before a guest completes registration." },
    { value: "post_event", label: "Post-Event Feedback", hint: "Sent automatically once the event has ended or a guest checks in." },
    { value: "manual", label: "Manual / On-Demand", hint: "You control exactly when this form goes out." },
];

export function CreateCampaignModal({ isOpen, onClose, userId, fixedEventId, onCreated }: CreateCampaignModalProps) {
    const [type, setType] = useState<CampaignType>(fixedEventId ? "event" : "standalone");
    const [name, setName] = useState("");
    const [eventId, setEventId] = useState(fixedEventId || "");
    const [trigger, setTrigger] = useState<CampaignTrigger>("post_event");
    const [events, setEvents] = useState<EventOption[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const resetForm = () => {
        setType(fixedEventId ? "event" : "standalone");
        setName("");
        setEventId(fixedEventId || "");
        setTrigger("post_event");
        setError(null);
    };

    useEffect(() => {
        if (!isOpen) resetForm();
    }, [isOpen]);

    // Load the user's events when Event Campaign mode is selected (and no fixed event)
    useEffect(() => {
        if (!isOpen || type !== "event" || fixedEventId) return;
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        supabase
            .from("events")
            .select("id, event_title")
            .eq("created_by", userId)
            .order("start_date", { ascending: false })
            .then(({ data }) => setEvents(data || []));
    }, [isOpen, type, fixedEventId, userId]);

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handleSubmit = async () => {
        if (!name.trim()) { setError("Campaign name is required"); return; }
        if (type === "event" && !eventId) { setError("Select an event for this campaign"); return; }

        setIsSubmitting(true);
        setError(null);

        try {
            const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            );

            const payload = {
                type,
                event_id: type === "event" ? eventId : null,
                trigger: type === "event" ? trigger : null,
                name: name.trim(),
                status: "draft" as const,
                created_by: userId,
            };

            const { data, error: insertError } = await supabase
                .from("campaigns")
                .insert(payload)
                .select()
                .single();

            if (insertError) { setError(insertError.message); return; }

            handleClose();
            onCreated(data as Campaign);
        } catch (err: any) {
            setError(err?.message || "Failed to create campaign");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title="New Campaign"
            subtitle="Configuration"
            size="lg"
            footer={
                <>
                    <ModalButton variant="secondary" onClick={handleClose}>Cancel</ModalButton>
                    <ModalButton
                        variant="primary"
                        onClick={handleSubmit}
                        loading={isSubmitting}
                        loadingText="Creating..."
                        disabled={!name.trim() || (type === "event" && !eventId)}
                    >
                        Create Campaign
                    </ModalButton>
                </>
            }
        >
            <div className="space-y-6">
                {error && (
                    <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 font-bold">
                        {error}
                    </div>
                )}

                {/* Campaign Type */}
                {!fixedEventId && (
                    <div className="space-y-3">
                        <label className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-400 block">Campaign Type</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setType("event")}
                                className={cn(
                                    "flex items-start gap-3 p-4 rounded-2xl border-2 text-left transition-all",
                                    type === "event" ? "bg-blue-50 border-[var(--brand-blue)]" : "bg-gray-50 border-gray-100 hover:border-gray-200"
                                )}
                            >
                                <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", type === "event" ? "bg-[var(--brand-blue)] text-white" : "bg-white text-gray-400")}>
                                    <Calendar className="w-4.5 h-4.5" />
                                </div>
                                <div>
                                    <p className="text-xs font-black text-gray-900">Event Campaign</p>
                                    <p className="text-[10px] text-gray-400 font-bold mt-0.5">Tied to registration or feedback for one event</p>
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => setType("standalone")}
                                className={cn(
                                    "flex items-start gap-3 p-4 rounded-2xl border-2 text-left transition-all",
                                    type === "standalone" ? "bg-blue-50 border-[var(--brand-blue)]" : "bg-gray-50 border-gray-100 hover:border-gray-200"
                                )}
                            >
                                <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", type === "standalone" ? "bg-[var(--brand-blue)] text-white" : "bg-white text-gray-400")}>
                                    <Globe className="w-4.5 h-4.5" />
                                </div>
                                <div>
                                    <p className="text-xs font-black text-gray-900">Standalone Survey</p>
                                    <p className="text-[10px] text-gray-400 font-bold mt-0.5">Independent form, no event or ticket required</p>
                                </div>
                            </button>
                        </div>
                    </div>
                )}

                {/* Name */}
                <Input
                    label="Campaign Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={type === "event" ? "e.g. Post-Training Satisfaction Survey" : "e.g. Q3 Product Research"}
                    autoFocus
                />

                {/* Event picker (Event Campaign only, unless fixed) */}
                {type === "event" && !fixedEventId && (
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-500 block">Event</label>
                        <select
                            value={eventId}
                            onChange={(e) => setEventId(e.target.value)}
                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)]/20 focus:border-[var(--brand-blue)] transition-all"
                        >
                            <option value="" disabled>Select an event</option>
                            {events.map(ev => (
                                <option key={ev.id} value={ev.id}>{ev.event_title}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Trigger (Event Campaign only) */}
                {type === "event" && (
                    <div className="space-y-3">
                        <label className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-400 block">When should it run?</label>
                        <div className="space-y-2">
                            {TRIGGER_OPTIONS.map(opt => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setTrigger(opt.value)}
                                    className={cn(
                                        "w-full flex items-start gap-3 p-3.5 rounded-2xl border-2 text-left transition-all",
                                        trigger === opt.value ? "bg-blue-50 border-[var(--brand-blue)]" : "bg-gray-50 border-gray-100 hover:border-gray-200"
                                    )}
                                >
                                    <div className={cn("w-4 h-4 rounded-full border-2 flex items-center justify-center mt-0.5 shrink-0", trigger === opt.value ? "border-[var(--brand-blue)]" : "border-gray-300")}>
                                        {trigger === opt.value && <div className="w-2 h-2 rounded-full bg-[var(--brand-blue)]" />}
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-gray-900">{opt.label}</p>
                                        <p className="text-[10px] text-gray-400 font-bold mt-0.5">{opt.hint}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}
