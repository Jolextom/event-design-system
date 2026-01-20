"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, User, Users, CircleDollarSign, Hash, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PassType, CreatePassPayload } from "../types";
import { createClient } from "@supabase/supabase-js";

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
    const [maxPerPerson, setMaxPerPerson] = useState("5");
    const [groupSize, setGroupSize] = useState("2");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);

    // Ensure portal only renders on client
    useEffect(() => {
        setMounted(true);
    }, []);

    const resetForm = () => {
        setType("individual");
        setTitle("");
        setDescription("");
        setIsFree(true);
        setPrice("");
        setQuantity("");
        setMaxPerPerson("5");
        setGroupSize("2");
        setError(null);
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handleSubmit = async () => {
        if (!title.trim()) {
            setError("Title is required");
            return;
        }
        if (!quantity || parseInt(quantity) <= 0) {
            setError("Quantity must be greater than 0");
            return;
        }

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
                ...(type === "individual" && { max_per_person: parseInt(maxPerPerson) || 5 }),
                ...(type === "group" && { group_size: parseInt(groupSize) || 2 }),
            };

            const { error: insertError } = await supabase.from("passes").insert(payload);

            if (insertError) {
                setError(insertError.message);
                return;
            }

            handleClose();
            onPassCreated();
        } catch (err: any) {
            setError(err?.message || "Failed to create pass");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Don't render portal server-side
    if (!mounted) return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleClose}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none p-4"
                    >
                        <div className="bg-white rounded-[32px] shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto pointer-events-auto">
                            {/* Header */}
                            <div className="flex items-center justify-between p-8 pb-6 border-b border-gray-100">
                                <div>
                                    <h2 className="text-xl font-black text-gray-900 tracking-tight">Create Ticket</h2>
                                    <p className="text-xs text-gray-400 font-bold mt-1">Define a new ticket type for your event</p>
                                </div>
                                <button
                                    onClick={handleClose}
                                    className="p-2.5 rounded-xl bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-all"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="p-8 space-y-8">
                                {/* Type Selector */}
                                <div className="space-y-3">
                                    <label className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-400 block ml-1">
                                        Ticket Type
                                    </label>
                                    <div className="flex gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setType("individual")}
                                            className={cn(
                                                "flex-1 p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2",
                                                type === "individual"
                                                    ? "border-[var(--brand-blue)] bg-blue-50/50"
                                                    : "border-gray-100 bg-gray-50/50 hover:border-gray-200"
                                            )}
                                        >
                                            <div className={cn(
                                                "w-10 h-10 rounded-xl flex items-center justify-center",
                                                type === "individual" ? "bg-[var(--brand-blue)] text-white" : "bg-gray-100 text-gray-400"
                                            )}>
                                                <User className="w-5 h-5" />
                                            </div>
                                            <span className={cn(
                                                "text-xs font-black uppercase tracking-wider",
                                                type === "individual" ? "text-[var(--brand-blue)]" : "text-gray-500"
                                            )}>Individual</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setType("group")}
                                            className={cn(
                                                "flex-1 p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2",
                                                type === "group"
                                                    ? "border-[var(--brand-blue)] bg-blue-50/50"
                                                    : "border-gray-100 bg-gray-50/50 hover:border-gray-200"
                                            )}
                                        >
                                            <div className={cn(
                                                "w-10 h-10 rounded-xl flex items-center justify-center",
                                                type === "group" ? "bg-[var(--brand-blue)] text-white" : "bg-gray-100 text-gray-400"
                                            )}>
                                                <Users className="w-5 h-5" />
                                            </div>
                                            <span className={cn(
                                                "text-xs font-black uppercase tracking-wider",
                                                type === "group" ? "text-[var(--brand-blue)]" : "text-gray-500"
                                            )}>Group</span>
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-gray-400 font-bold flex items-center gap-1.5 ml-1">
                                        <Info className="w-3 h-3" />
                                        {type === "individual"
                                            ? "Each ticket admits one person"
                                            : "Each ticket admits a fixed group of people"}
                                    </p>
                                </div>

                                {/* Title */}
                                <div className="space-y-3">
                                    <label className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-400 block ml-1">
                                        Title <span className="text-red-400">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="e.g. Early Bird, VIP Experience"
                                        className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)]/20 focus:border-[var(--brand-blue)] transition-all"
                                    />
                                </div>

                                {/* Description */}
                                <div className="space-y-3">
                                    <label className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-400 block ml-1">
                                        Description
                                    </label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Optional perks or details..."
                                        rows={2}
                                        className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)]/20 focus:border-[var(--brand-blue)] transition-all resize-none"
                                    />
                                </div>

                                {/* Pricing */}
                                <div className="space-y-3">
                                    <label className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-400 block ml-1">
                                        Pricing
                                    </label>
                                    <div className="flex gap-4 items-center">
                                        <button
                                            type="button"
                                            onClick={() => setIsFree(!isFree)}
                                            className={cn(
                                                "flex items-center gap-2 px-4 py-3 rounded-xl border transition-all text-xs font-black uppercase tracking-wider",
                                                isFree
                                                    ? "bg-green-50 border-green-200 text-green-600"
                                                    : "bg-gray-50 border-gray-100 text-gray-400"
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
                                            <div className="flex-1 relative">
                                                <CircleDollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                                                <input
                                                    type="number"
                                                    value={price}
                                                    onChange={(e) => setPrice(e.target.value)}
                                                    placeholder="0.00"
                                                    min="0"
                                                    step="0.01"
                                                    className="w-full pl-10 pr-5 py-3.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)]/20 focus:border-[var(--brand-blue)] transition-all"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Quantity & Type-specific */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-3">
                                        <label className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-400 block ml-1">
                                            Total Capacity
                                        </label>
                                        <div className="relative">
                                            <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                                            <input
                                                type="number"
                                                value={quantity}
                                                onChange={(e) => setQuantity(e.target.value)}
                                                placeholder="100"
                                                min="1"
                                                className="w-full pl-10 pr-5 py-3.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)]/20 focus:border-[var(--brand-blue)] transition-all"
                                            />
                                        </div>
                                    </div>

                                    {type === "individual" ? (
                                        <div className="space-y-3">
                                            <label className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-400 block ml-1">
                                                Max per Person
                                            </label>
                                            <div className="relative">
                                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                                                <input
                                                    type="number"
                                                    value={maxPerPerson}
                                                    onChange={(e) => setMaxPerPerson(e.target.value)}
                                                    placeholder="5"
                                                    min="1"
                                                    max="10"
                                                    className="w-full pl-10 pr-5 py-3.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)]/20 focus:border-[var(--brand-blue)] transition-all"
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            <label className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-400 block ml-1">
                                                Group Size
                                            </label>
                                            <div className="relative">
                                                <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                                                <input
                                                    type="number"
                                                    value={groupSize}
                                                    onChange={(e) => setGroupSize(e.target.value)}
                                                    placeholder="2"
                                                    min="2"
                                                    max="50"
                                                    className="w-full pl-10 pr-5 py-3.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)]/20 focus:border-[var(--brand-blue)] transition-all"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Error display */}
                                {error && (
                                    <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 font-bold">
                                        {error}
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="p-8 pt-4 border-t border-gray-100 flex justify-end gap-3">
                                <button
                                    onClick={handleClose}
                                    className="px-6 py-3 text-sm font-black text-gray-500 hover:text-gray-900 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={isSubmitting}
                                    className={cn(
                                        "px-8 py-3 bg-gray-900 text-white rounded-2xl text-sm font-black shadow-xl shadow-gray-200 transition-all",
                                        isSubmitting
                                            ? "opacity-50 cursor-not-allowed"
                                            : "hover:bg-black hover:scale-[1.02] active:scale-95"
                                    )}
                                >
                                    {isSubmitting ? "Creating..." : "Create Ticket"}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>,
        document.body
    );
}
