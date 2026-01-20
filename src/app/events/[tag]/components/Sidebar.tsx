"use client";

import React from "react";
import { motion } from "framer-motion";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { GlobalSection, GLOBAL_NAV } from "../types";

interface SidebarProps {
    activeId: GlobalSection;
    onSelect: (id: GlobalSection) => void;
    isExpanded: boolean;
    onToggle: () => void;
}

export function GlobalSidebar({
    activeId,
    onSelect,
    isExpanded,
    onToggle
}: SidebarProps) {
    return (
        <motion.div
            animate={{ width: isExpanded ? 240 : 72 }}
            className="border-r border-gray-100 flex flex-col py-6 bg-white h-full shrink-0 z-50 overflow-hidden"
        >
            <div className="flex items-center px-5 mb-10 gap-3 min-w-[240px]">
                <div className="w-10 h-10 flex items-center justify-center font-black text-2xl bg-red-50 text-[var(--brand-red)] rounded-2xl shrink-0">❤</div>
                <span className={cn("font-black tracking-tight text-xl transition-opacity duration-200", isExpanded ? "opacity-100" : "opacity-0 invisible")}>EventFlow</span>
            </div>

            <div className="flex flex-col gap-2 flex-1 px-3 min-w-[240px]">
                {GLOBAL_NAV.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => onSelect(item.id as GlobalSection)}
                        className={cn(
                            "flex items-center gap-4 p-3.5 rounded-2xl transition-all group",
                            activeId === item.id ? "bg-gray-50 text-[var(--brand-blue)] shadow-sm" : "text-gray-400 hover:text-gray-600 hover:bg-gray-50/50"
                        )}
                    >
                        <item.icon className="w-5 h-5 shrink-0" />
                        <span className={cn("text-sm font-bold transition-opacity whitespace-nowrap", isExpanded ? "opacity-100" : "opacity-0 invisible")}>
                            {item.label}
                        </span>
                    </button>
                ))}
            </div>

            <div className="flex flex-col gap-4 px-3 min-w-[240px]">
                <button
                    onClick={onToggle}
                    className="flex items-center gap-4 p-3.5 rounded-2xl text-gray-400 hover:text-gray-600 hover:bg-gray-50/50 transition-all border border-transparent hover:border-gray-100"
                >
                    {isExpanded ? <PanelLeftClose className="w-5 h-5 shrink-0" /> : <PanelLeftOpen className="w-5 h-5 shrink-0" />}
                    <span className={cn("text-sm font-bold transition-opacity whitespace-nowrap", isExpanded ? "opacity-100" : "opacity-0 invisible")}>Collapse Menu</span>
                </button>
                <div className="flex items-center gap-4 p-3 mb-2">
                    <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-[10px] font-black text-gray-400 border border-gray-200 uppercase shrink-0">G</div>
                    <div className={cn("flex flex-col transition-opacity overflow-hidden", isExpanded ? "opacity-100" : "opacity-0 invisible")}>
                        <span className="text-xs font-bold text-gray-900 leading-none">Greg Studio</span>
                        <span className="text-[10px] text-gray-400 mt-1 font-bold">Pro Organizer</span>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
