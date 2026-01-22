"use client";

import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Info, AlertTriangle } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

interface ToastProps {
    message: string | null;
    type?: ToastType;
    onClose: () => void;
    duration?: number;
}

export function Toast({ message, type = "success", onClose, duration = 3000 }: ToastProps) {
    useEffect(() => {
        if (message) {
            const timer = setTimeout(onClose, duration);
            return () => clearTimeout(timer);
        }
    }, [message, duration, onClose]);

    const icons = {
        success: <Check className="w-4 h-4 text-green-600" />,
        error: <X className="w-4 h-4 text-red-600" />,
        info: <Info className="w-4 h-4 text-blue-600" />,
        warning: <AlertTriangle className="w-4 h-4 text-amber-600" />
    };

    const styles = {
        success: "bg-white border-green-100 text-green-800 shadow-green-100",
        error: "bg-white border-red-100 text-red-800 shadow-red-100",
        info: "bg-white border-blue-100 text-blue-800 shadow-blue-100",
        warning: "bg-white border-amber-100 text-amber-800 shadow-amber-100"
    };

    return (
        <AnimatePresence>
            {message && (
                <motion.div
                    initial={{ opacity: 0, y: -20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                    className={`fixed top-6 right-6 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg backdrop-blur-md ${styles[type]}`}
                >
                    <div className={`p-1 rounded-full ${type === 'success' ? 'bg-green-100' : type === 'error' ? 'bg-red-100' : type === 'warning' ? 'bg-amber-100' : 'bg-blue-100'}`}>
                        {icons[type]}
                    </div>
                    <span className="text-xs font-black tracking-wide pr-2">{message}</span>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
