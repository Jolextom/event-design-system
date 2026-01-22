"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PanelLeftClose, PanelLeftOpen, ArrowLeft, Lock, X } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { GlobalSection, GLOBAL_NAV } from "../types";

interface SidebarProps {
    activeId: GlobalSection;
    onSelect: (id: GlobalSection) => void;
    isExpanded: boolean;
    onToggle: () => void;
    contentLocked?: boolean;
    isLoading?: boolean;
    isMobile?: boolean;
    onClose?: () => void;
}

export function GlobalSidebar({
    activeId,
    onSelect,
    isExpanded,
    onToggle,
    contentLocked,
    isLoading,
    isMobile,
    onClose
}: SidebarProps) {
    // On mobile, always show expanded for better touch targets
    const effectiveExpanded = isMobile ? true : isExpanded;

    const sidebarContent = (
        <motion.div
            animate={{ width: effectiveExpanded ? 240 : 72 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={cn(
                "border-r border-gray-100 flex flex-col py-6 bg-white h-full shrink-0 z-50",
                isMobile && "w-full max-w-[280px]"
            )}
        >
            {/* Logo */}
            <div className="flex items-center px-5 mb-10 gap-3">
                <div className="w-10 h-10 flex items-center justify-center font-black text-2xl bg-red-50 text-[var(--brand-red)] rounded-2xl shrink-0">❤</div>
                {effectiveExpanded && (
                    <span className="font-black tracking-tight text-xl animate-in fade-in duration-300">EventFlow</span>
                )}
            </div>

            {/* Back to Events */}
            {/* Back to Events */}
            <div className="px-3 mb-2 relative group">
                <Link
                    href="/events/dashboard"
                    className="w-full flex items-center gap-4 p-3.5 rounded-2xl transition-all text-gray-500 hover:text-[var(--brand-blue)] hover:bg-blue-50/50 border border-transparent hover:border-blue-100/50"
                >
                    <ArrowLeft className="w-5 h-5 shrink-0" />
                    {effectiveExpanded && (
                        <span className="text-sm font-bold whitespace-nowrap animate-in fade-in duration-300">
                            Back to Events
                        </span>
                    )}
                </Link>

                {/* Tooltip for collapsed state - Only show on desktop */}
                {!effectiveExpanded && !isMobile && (
                    <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-[100] pointer-events-none">
                        <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-r-[6px] border-r-gray-900" />
                        <div className="bg-gray-900 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-xl border border-white/10 whitespace-nowrap">
                            Back to Events
                        </div>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <div className="flex flex-col gap-2 flex-1 px-3">
                {GLOBAL_NAV.map((item) => {
                    // During loading, only enable Studio. After loading, use contentLocked logic
                    const isLoadingState = isLoading && item.id !== "studio";
                    const isLocked = !isLoading && contentLocked && item.id !== "studio";
                    const isDisabled = isLoadingState || isLocked;

                    return (
                        <div key={item.id} className="relative group">
                            <button
                                onClick={() => !isDisabled && onSelect(item.id as GlobalSection)}
                                className={cn(
                                    "w-full flex items-center gap-4 p-3.5 rounded-2xl transition-all",
                                    isLoadingState
                                        ? "opacity-50 cursor-wait text-gray-400"
                                        : isLocked
                                            ? "opacity-40 cursor-not-allowed text-gray-400"
                                            : activeId === item.id
                                                ? "bg-gray-50 text-[var(--brand-blue)] shadow-sm"
                                                : "text-gray-400 hover:text-gray-600 hover:bg-gray-50/50"
                                )}
                            >
                                <item.icon className="w-5 h-5 shrink-0" />
                                {effectiveExpanded && (
                                    <span className="text-sm font-bold whitespace-nowrap animate-in fade-in duration-300">
                                        {item.label}
                                    </span>
                                )}
                            </button>
                            {/* Only show tooltips when NOT loading */}
                            {!isLoading && (
                                isLocked ? (
                                    isExpanded ? (
                                        // Expanded + Locked: Overlay on the item
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-[100] pointer-events-none bg-white/80 backdrop-blur-[1px] rounded-2xl">
                                            <div className="bg-gray-900 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-xl border border-white/10 whitespace-nowrap flex items-center gap-2">
                                                <Lock className="w-3 h-3" />
                                                <span className="font-black uppercase tracking-widest">Publish to Access</span>
                                            </div>
                                        </div>
                                    ) : (
                                        // Collapsed + Locked: Tooltip with arrow showing lock message
                                        <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-[100] pointer-events-none">
                                            <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-r-[6px] border-r-gray-900" />
                                            <div className="bg-gray-900 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-xl border border-white/10 whitespace-nowrap flex items-center gap-2">
                                                <Lock className="w-3 h-3" />
                                                <span className="font-black uppercase tracking-widest">Publish to Access</span>
                                            </div>
                                        </div>
                                    )
                                ) : (
                                    // Collapsed + Not Locked: Tooltip showing item name
                                    !isExpanded && (
                                        <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-[100] pointer-events-none">
                                            <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-r-[6px] border-r-gray-900" />
                                            <div className="bg-gray-900 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-xl border border-white/10 whitespace-nowrap">
                                                {item.label}
                                            </div>
                                        </div>
                                    )
                                )
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Footer */}
            <div className="flex flex-col gap-4 px-3">
                {/* Hide toggle on mobile */}
                {!isMobile && (
                    <button
                        onClick={onToggle}
                        className="flex items-center gap-4 p-3.5 rounded-2xl text-gray-400 hover:text-gray-600 hover:bg-gray-50/50 transition-all border border-transparent hover:border-gray-100"
                    >
                        {effectiveExpanded ? <PanelLeftClose className="w-5 h-5 shrink-0" /> : <PanelLeftOpen className="w-5 h-5 shrink-0" />}
                        {effectiveExpanded && (
                            <span className="text-sm font-bold whitespace-nowrap animate-in fade-in duration-300">Collapse Menu</span>
                        )}
                    </button>
                )}
                <div className="flex items-center gap-4 p-3 mb-2">
                    <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-[10px] font-black text-gray-400 border border-gray-200 uppercase shrink-0">G</div>
                    {effectiveExpanded && (
                        <div className="flex flex-col animate-in fade-in duration-300">
                            <span className="text-xs font-bold text-gray-900 leading-none">Greg Studio</span>
                            <span className="text-[10px] text-gray-400 mt-1 font-bold">Pro Organizer</span>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );

    // On mobile, wrap in overlay
    if (isMobile) {
        return (
            <>
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="fixed inset-0 bg-black/50 z-[100] lg:hidden"
                />
                {/* Drawer */}
                <motion.div
                    initial={{ x: -280 }}
                    animate={{ x: 0 }}
                    exit={{ x: -280 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="fixed left-0 top-0 h-full z-[101] lg:hidden"
                >
                    {/* Close button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 bg-gray-100 rounded-xl text-gray-500 hover:bg-gray-200 transition-colors z-10"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    {sidebarContent}
                </motion.div>
            </>
        );
    }

    // Desktop: render normally
    return sidebarContent;
}
