"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, User, Loader2 } from "lucide-react";

interface AddGuestModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (data: { first_name: string; last_name: string; email: string }) => Promise<void>;
}

export function AddGuestModal({
    isOpen,
    onClose,
    onAdd
}: AddGuestModalProps) {
    const [formData, setFormData] = useState({ first_name: "", last_name: "", email: "" });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        await onAdd(formData);
        setIsSubmitting(false);
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
                        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden"
                    >
                        <div className="p-8">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h3 className="text-2xl font-black text-gray-900 tracking-tight">Add Guest</h3>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Manual Entry</p>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-gray-50 rounded-xl transition-colors text-gray-400 hover:text-gray-900"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">First Name</label>
                                        <input
                                            required
                                            type="text"
                                            placeholder="Alex"
                                            className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold placeholder:text-gray-300 focus:bg-white focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500/30 outline-none transition-all"
                                            value={formData.first_name}
                                            onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Last Name</label>
                                        <input
                                            required
                                            type="text"
                                            placeholder="Rivera"
                                            className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold placeholder:text-gray-300 focus:bg-white focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500/30 outline-none transition-all"
                                            value={formData.last_name}
                                            onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Email Address</label>
                                    <input
                                        required
                                        type="email"
                                        placeholder="alex@design.com"
                                        className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold placeholder:text-gray-300 focus:bg-white focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500/30 outline-none transition-all"
                                        value={formData.email}
                                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full py-4 bg-gray-900 hover:bg-black text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-lg shadow-gray-200 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                >
                                    {isSubmitting ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <>
                                            <User className="w-4 h-4" />
                                            Confirm Access
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
