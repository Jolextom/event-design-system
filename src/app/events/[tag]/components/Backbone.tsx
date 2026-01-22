"use client";

import React from "react";
import { motion } from "framer-motion";
import { PanelLeftClose, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { CategoryId, BUILDER_CATEGORIES } from "../types";

interface BackboneProps {
    isOpen: boolean;
    activeId: string;
    onSelect: (id: CategoryId) => void;
    onToggle: () => void;
    contentLocked?: boolean;
    isLoading?: boolean;
}

export function BackbonePane({
    isOpen,
    activeId,
    onSelect,
    onToggle,
    contentLocked,
    isLoading
}: BackboneProps) {
    return (
        <motion.div
            initial={false}
            animate={{ width: isOpen ? 340 : 0, opacity: isOpen ? 1 : 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="border-r border-gray-100 flex flex-col bg-gray-50/30 h-full shrink-0 overflow-hidden relative"
        >
            <div className="min-w-[340px] h-full flex flex-col">
                <div className="p-7 border-b border-gray-100/50 flex items-center justify-between bg-white/50">
                    <h2 className="text-[11px] font-black uppercase tracking-[0.25em] text-gray-400">Setup Steps</h2>
                    <button onClick={onToggle} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-300 transition-all">
                        <PanelLeftClose className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto py-6">
                    {BUILDER_CATEGORIES.map((cat) => {
                        // During loading, only enable essentials. After loading, use contentLocked logic
                        const isLoadingState = isLoading && cat.id !== "essentials";
                        const isLocked = !isLoading && contentLocked && cat.id !== "essentials";
                        const isDisabled = isLoadingState || isLocked;

                        return (
                            <div key={cat.id} className="relative group">
                                <div
                                    onClick={() => !isDisabled && onSelect(cat.id)}
                                    className={cn(
                                        "px-8 py-5.5 transition-all relative border-l-4",
                                        isLoadingState
                                            ? "border-transparent opacity-50 cursor-wait bg-gray-50/50"
                                            : isLocked
                                                ? "border-transparent opacity-60 cursor-not-allowed bg-gray-50/50"
                                                : activeId === cat.id
                                                    ? "bg-white border-[var(--brand-blue)] shadow-[0_4px_20px_rgba(0,0,0,0.03)] cursor-pointer"
                                                    : "border-transparent text-gray-500 hover:bg-white/50 cursor-pointer"
                                    )}
                                >
                                    <div className="flex items-start gap-5">
                                        <div className={cn(
                                            "p-2.5 rounded-xl transition-all",
                                            activeId === cat.id ? "bg-[var(--brand-blue)] text-white shadow-lg shadow-blue-100" : "bg-white text-gray-400 border border-gray-100 shadow-sm"
                                        )}>
                                            <cat.icon className="w-4 h-4" />
                                        </div>
                                        <div className="flex-1 pt-0.5">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className={cn("text-sm font-bold tracking-tight", activeId === cat.id ? "text-gray-900" : "text-gray-600")}>
                                                    {cat.label}
                                                </span>
                                                {cat.badge && (
                                                    <span className="text-[8px] font-black bg-green-100 text-green-700 px-1.5 py-0.5 rounded tracking-tighter uppercase">
                                                        {cat.badge}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-gray-400 leading-normal font-bold opacity-80">{cat.description}</p>
                                        </div>
                                    </div>
                                </div>
                                {/* Only show tooltip when NOT loading */}
                                {!isLoading && isLocked && (
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-[100] pointer-events-none bg-white/60 backdrop-blur-[1px]">
                                        <div className="bg-gray-900 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-xl border border-white/10 whitespace-nowrap flex items-center gap-2">
                                            <Lock className="w-3 h-3" />
                                            <span className="font-black uppercase tracking-widest">Publish to Access</span>
                                        </div>
                                    </div>
                                )}

                            </div>
                        );
                    })}
                </div>
            </div>
        </motion.div >
    );
}
