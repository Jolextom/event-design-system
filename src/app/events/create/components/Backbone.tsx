"use client";

import React from "react";
import { motion } from "framer-motion";
import { PanelLeftClose } from "lucide-react";
import { cn } from "@/lib/utils";
import { CategoryId, BUILDER_CATEGORIES } from "../types";

interface BackboneProps {
    isOpen: boolean;
    activeId: string;
    onSelect: (id: CategoryId) => void;
    onToggle: () => void;
}

export function BackbonePane({
    isOpen,
    activeId,
    onSelect,
    onToggle
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
                    {BUILDER_CATEGORIES.map((cat) => (
                        <div
                            key={cat.id}
                            onClick={() => onSelect(cat.id)}
                            className={cn(
                                "px-8 py-5.5 cursor-pointer transition-all relative border-l-4",
                                activeId === cat.id
                                    ? "bg-white border-[var(--brand-blue)] shadow-[0_4px_20px_rgba(0,0,0,0.03)]"
                                    : "border-transparent text-gray-500 hover:bg-white/50"
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
                    ))}
                </div>
            </div>
        </motion.div>
    );
}
