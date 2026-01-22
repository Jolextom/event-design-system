"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, AlertTriangle } from "lucide-react";

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    isDestructive?: boolean;
}

export function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    isDestructive = false
}: ConfirmModalProps) {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[100]"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white rounded-3xl shadow-2xl z-[101] overflow-hidden border border-gray-100 p-6"
                    >
                        <div className="flex flex-col items-center text-center">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${isDestructive ? "bg-red-50 text-red-500" : "bg-blue-50 text-blue-500"}`}>
                                {isDestructive ? <AlertTriangle className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
                            </div>

                            <h3 className="text-lg font-black text-gray-900 mb-2 tracking-tight">{title}</h3>
                            <p className="text-xs text-gray-500 font-medium leading-relaxed mb-8 px-4">
                                {description}
                            </p>

                            <div className="flex items-center gap-3 w-full">
                                <button
                                    onClick={onClose}
                                    className="flex-1 py-3 items-center justify-center rounded-xl text-xs font-black uppercase tracking-wider text-gray-500 hover:bg-gray-50 transition-colors"
                                >
                                    {cancelLabel}
                                </button>
                                <button
                                    onClick={() => {
                                        onConfirm();
                                        onClose();
                                    }}
                                    className={`flex-1 py-3 items-center justify-center rounded-xl text-xs font-black uppercase tracking-wider text-white shadow-lg transition-all transform active:scale-95 ${isDestructive
                                            ? "bg-red-500 hover:bg-red-600 shadow-red-200"
                                            : "bg-[var(--brand-blue)] hover:bg-blue-600 shadow-blue-200"
                                        }`}
                                >
                                    {confirmLabel}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
