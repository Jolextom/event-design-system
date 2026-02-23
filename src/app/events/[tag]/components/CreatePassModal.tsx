"use client";

import React, { useState, useEffect } from "react";
import { User, Users, CircleDollarSign, Hash, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PassType, CreatePassPayload } from "../types";
import { createClient } from "@supabase/supabase-js";
import { Modal, ModalButton } from "@/app/components/ui/Modal";
import { Input, Textarea } from "@/app/components/ui/Input";

interface CreatePassModalProps {
    isOpen: boolean;
    onClose: () => void;
    eventId: string;
    onPassCreated: () => void;
}

export function CreatePassModal({ isOpen, onClose, eventId, onPassCreated }: CreatePassModalProps) {
    const [type, setType] = useState<PassType>("individual");
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [isFree, setIsFree] = useState(true);
    const [price, setPrice] = useState("");
    const [quantity, setQuantity] = useState("");
    const [groupSize, setGroupSize] = useState("2");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const resetForm = () => {
        setType("individual");
        setTitle("");
        setDescription("");
        setIsFree(true);
        setPrice("");
        setQuantity("");
        setGroupSize("2");
        setError(null);
    };

    useEffect(() => {
        if (!isOpen) resetForm();
    }, [isOpen]);

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handleSubmit = async () => {
        if (!title.trim()) { setError("Title is required"); return; }
        if (!quantity || parseInt(quantity) <= 0) { setError("Quantity must be greater than 0"); return; }

        setIsSubmitting(true);
        setError(null);

        try {
            const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            );

            const payload: CreatePassPayload = {
                event_id: eventId,
                title: title.trim(),
                description: description.trim() || undefined,
                price: isFree ? 0 : parseFloat(price) || 0,
                is_free: isFree,
                type,
                quantity_available: parseInt(quantity),
                ...(type === "individual" && { max_per_person: 1 }),
                ...(type === "group" && { group_size: parseInt(groupSize) || 2 }),
            };

            const { error: insertError } = await supabase.from("passes").insert(payload);
            if (insertError) { setError(insertError.message); return; }

            handleClose();
            onPassCreated();
        } catch (err: any) {
            setError(err?.message || "Failed to create pass");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title="Create Ticket"
            subtitle="Define a new ticket type for your event."
            size="lg"
            footer={
                <>
                    <ModalButton variant="secondary" onClick={handleClose}>Cancel</ModalButton>
                    <ModalButton
                        variant="primary"
                        onClick={handleSubmit}
                        loading={isSubmitting}
                        loadingText="Creating..."
                    >
                        Create Ticket
                    </ModalButton>
                </>
            }
        >
            <div className="space-y-6">
                {/* Type Selector */}
                <div className="space-y-2.5">
                    <label className="block text-[9px] font-black uppercase tracking-[0.25em] text-gray-500">
                        Ticket Type
                    </label>
                    <div className="flex gap-3">
                        {[
                            { id: "individual" as PassType, label: "Individual", Icon: User, hint: "Each ticket admits one person" },
                            { id: "group" as PassType, label: "Group", Icon: Users, hint: "Each ticket admits a fixed group" },
                        ].map(({ id, label, Icon, hint }) => (
                            <button
                                key={id}
                                type="button"
                                onClick={() => setType(id)}
                                className={cn(
                                    "flex-1 p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2",
                                    type === id
                                        ? "border-[var(--brand-blue)] bg-blue-50/50"
                                        : "border-gray-200 bg-gray-50/50 hover:border-gray-300"
                                )}
                            >
                                <div className={cn(
                                    "w-10 h-10 rounded-xl flex items-center justify-center",
                                    type === id ? "bg-[var(--brand-blue)] text-white" : "bg-gray-100 text-gray-400"
                                )}>
                                    <Icon className="w-5 h-5" />
                                </div>
                                <span className={cn(
                                    "text-xs font-black uppercase tracking-wider",
                                    type === id ? "text-[var(--brand-blue)]" : "text-gray-500"
                                )}>{label}</span>
                            </button>
                        ))}
                    </div>
                    <p className="text-[10px] text-gray-400 font-semibold flex items-center gap-1.5">
                        <Info className="w-3 h-3" />
                        {type === "individual" ? "Each ticket admits one person" : "Each ticket admits a fixed group of people"}
                    </p>
                </div>

                {/* Title */}
                <Input
                    label="Title *"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Early Bird, VIP Experience"
                />

                {/* Description */}
                <Textarea
                    label="Description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional perks or details..."
                    rows={2}
                />

                {/* Pricing */}
                <div className="space-y-2.5">
                    <label className="block text-[9px] font-black uppercase tracking-[0.25em] text-gray-500">Pricing</label>
                    <div className="flex gap-4 items-center">
                        <button
                            type="button"
                            onClick={() => setIsFree(!isFree)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all text-xs font-black uppercase tracking-wider",
                                isFree
                                    ? "bg-green-50 border-green-300 text-green-700"
                                    : "bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300"
                            )}
                        >
                            <div className={cn(
                                "w-4 h-4 rounded-md border-2 flex items-center justify-center",
                                isFree ? "bg-green-500 border-green-500" : "border-gray-300"
                            )}>
                                {isFree && <span className="text-white text-[10px]">✓</span>}
                            </div>
                            Free
                        </button>
                        {!isFree && (
                            <div className="flex-1">
                                <Input
                                    type="number"
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                    placeholder="0.00"
                                    min="0"
                                    step="0.01"
                                    iconLeft={<CircleDollarSign className="w-4 h-4" />}
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Quantity & Type-specific */}
                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="Total Capacity *"
                        type="number"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        placeholder="100"
                        min="1"
                        iconLeft={<Hash className="w-4 h-4" />}
                    />
                    {type === "group" && (
                        <Input
                            label="Group Size"
                            type="number"
                            value={groupSize}
                            onChange={(e) => setGroupSize(e.target.value)}
                            placeholder="2"
                            min="2"
                            max="50"
                            iconLeft={<Users className="w-4 h-4" />}
                        />
                    )}
                </div>

                {/* Error */}
                {error && (
                    <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 font-bold">
                        {error}
                    </div>
                )}
            </div>
        </Modal>
    );
}
