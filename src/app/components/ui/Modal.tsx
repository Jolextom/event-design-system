"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    subtitle?: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
    size?: "sm" | "md" | "lg" | "xl";
    /** If true, clicking outside the modal does not close it */
    disableBackdropClose?: boolean;
    /** Extra classes for the outermost modal card */
    className?: string;
}

const sizeMap: Record<NonNullable<ModalProps["size"]>, string> = {
    sm: "max-w-sm",
    md: "max-w-[500px]",
    lg: "max-w-lg",
    xl: "max-w-2xl",
};

export function Modal({
    isOpen,
    onClose,
    title,
    subtitle,
    children,
    footer,
    size = "md",
    disableBackdropClose = false,
    className,
}: ModalProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Keyboard close
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isOpen) onClose();
        };
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [isOpen, onClose]);

    if (!mounted) return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        onClick={disableBackdropClose ? undefined : onClose}
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                    />

                    {/* Dialog */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.97, y: 12 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.97, y: 8 }}
                        transition={{ type: "spring", damping: 28, stiffness: 350 }}
                        role="dialog"
                        aria-modal="true"
                        aria-label={title}
                        className={cn(
                            "relative w-full bg-white rounded-[24px] shadow-2xl shadow-black/10 overflow-hidden flex flex-col max-h-[90vh]",
                            sizeMap[size],
                            className
                        )}
                    >
                        {/* Header */}
                        {(title || subtitle) && (
                            <div className="flex items-start justify-between px-7 pt-6 pb-5 border-b border-gray-100 shrink-0">
                                <div>
                                    {title && (
                                        <h2 className="text-lg font-black text-gray-900 tracking-tight">
                                            {title}
                                        </h2>
                                    )}
                                    {subtitle && (
                                        <p className="text-xs text-gray-400 font-semibold mt-0.5">
                                            {subtitle}
                                        </p>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="ml-4 mt-0.5 p-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-all"
                                    aria-label="Close"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        )}

                        {/* Body */}
                        <div className="px-7 py-6 overflow-y-auto flex-1 min-h-0">
                            {children}
                        </div>

                        {/* Footer */}
                        {footer && (
                            <div className="px-7 pb-6 pt-4 border-t border-gray-100 shrink-0 flex items-center justify-end gap-3">
                                {footer}
                            </div>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
}

/** Convenience button for modal footers */
interface ModalButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "danger";
    loading?: boolean;
    loadingText?: string;
}

export function ModalButton({
    variant = "primary",
    loading = false,
    loadingText = "Loading...",
    children,
    className,
    disabled,
    ...props
}: ModalButtonProps) {
    const base =
        "px-6 py-2.5 rounded-xl text-sm font-black transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
    const variants: Record<NonNullable<ModalButtonProps["variant"]>, string> = {
        primary:
            "bg-gray-900 text-white hover:bg-black hover:scale-[1.02] active:scale-95 shadow-lg shadow-gray-200",
        secondary:
            "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100 hover:text-gray-900",
        danger:
            "bg-red-500 text-white hover:bg-red-600 hover:scale-[1.02] active:scale-95 shadow-lg shadow-red-100",
    };

    return (
        <button
            className={cn(base, variants[variant], className)}
            disabled={loading || disabled}
            {...props}
        >
            {loading ? loadingText : children}
        </button>
    );
}
