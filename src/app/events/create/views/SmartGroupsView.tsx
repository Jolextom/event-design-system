"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Plus, Filter, Layers, ChevronRight, Sparkles, X, Mail, Download, UserCheck, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface Group {
    id: string;
    name: string;
    rule: string;
    count: number;
    color: string;
    type: string;
    // For breakdown segments, options represent sub-groups (e.g., poll answers)
    options?: BreakdownOption[];
}

interface BreakdownOption {
    label: string;
    count: number;
    pct: number;
    color: string;
    guests: Guest[];
}

interface Guest {
    name: string;
    email: string;
    status: string;
    avatar: string;
}

export function SmartGroupsView({ onNavigateToRegistry }: { onNavigateToRegistry?: () => void }) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setMounted(true), 0);
        return () => clearTimeout(timer);
    }, []);

    const MOCK_GUESTS: Guest[] = [
        { name: "Alex Rivera", email: "alex@design.co", status: "Registered", avatar: "AR" },
        { name: "Sarah Chen", email: "sarah.c@tech.com", status: "Checked In", avatar: "SC" },
        { name: "Marcus Thorne", email: "m.thorne@vibe.net", status: "Invited", avatar: "MT" },
        { name: "Elena Rossi", email: "elena@studio.it", status: "Registered", avatar: "ER" },
    ];

    // Mock breakdown options for a poll segment
    const MOCK_BREAKDOWN_OPTIONS: BreakdownOption[] = [
        {
            label: "Blue",
            count: 45,
            pct: 52,
            color: "bg-blue-500",
            guests: [MOCK_GUESTS[0], MOCK_GUESTS[1]],
        },
        {
            label: "Red",
            count: 28,
            pct: 32,
            color: "bg-red-500",
            guests: [MOCK_GUESTS[2]],
        },
        {
            label: "Green",
            count: 13,
            pct: 16,
            color: "bg-green-500",
            guests: [MOCK_GUESTS[3]],
        },
    ];

    // Mock for a custom question: 'What region are you from?'
    const REGION_OPTIONS: BreakdownOption[] = [
        { label: "Lagos", count: 120, pct: 40, color: "bg-blue-500", guests: MOCK_GUESTS },
        { label: "Campus", count: 80, pct: 27, color: "bg-green-500", guests: MOCK_GUESTS },
        { label: "Ibadan", count: 50, pct: 17, color: "bg-yellow-500", guests: MOCK_GUESTS },
        { label: "Abuja", count: 20, pct: 7, color: "bg-red-500", guests: MOCK_GUESTS },
        { label: "Port Harcourt", count: 10, pct: 3, color: "bg-purple-500", guests: MOCK_GUESTS },
        { label: "Enugu", count: 8, pct: 2, color: "bg-pink-500", guests: MOCK_GUESTS },
        { label: "Kano", count: 5, pct: 1, color: "bg-indigo-500", guests: MOCK_GUESTS },
        { label: "Kaduna", count: 4, pct: 1, color: "bg-teal-500", guests: MOCK_GUESTS },
        { label: "Jos", count: 3, pct: 1, color: "bg-orange-500", guests: MOCK_GUESTS },
        { label: "Benin", count: 2, pct: 1, color: "bg-gray-500", guests: MOCK_GUESTS },
        // ...add more options as needed up to 20
    ];

    const [groups] = useState<Group[]>([
        { id: "g0", name: "Verified Speakers", rule: "is_speaker = true", count: 12, color: "bg-emerald-100 text-emerald-700", type: "manual" },
        { id: "g1", name: "Team Red", rule: "team_color = 'Red'", count: 42, color: "bg-red-100 text-red-700", type: "automation" },
        { id: "g2", name: "VIP Attendees", rule: "priority = 'High'", count: 115, color: "bg-purple-100 text-purple-700", type: "manual" },
        { id: "g3", name: "Expertise: Senior", rule: "expertise = 'Senior'", count: 24, color: "bg-indigo-100 text-indigo-700", type: "auto-segment" },
        {
            id: "g4",
            name: "Poll: Fav Color",
            rule: "color_pref IS SET",
            count: 86,
            color: "bg-orange-100 text-orange-700",
            type: "breakdown",
            options: MOCK_BREAKDOWN_OPTIONS,
        },
        {
            id: "g5",
            name: "What region are you from?",
            rule: "region IS SET",
            count: 302,
            color: "bg-cyan-100 text-cyan-700",
            type: "breakdown",
            options: REGION_OPTIONS,
        },
    ]);

    const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
    // For breakdown segments, track selected option
    const [selectedBreakdown, setSelectedBreakdown] = useState<string | null>(null);

    // Auto-select first breakdown option when a breakdown group is opened
    useEffect(() => {
        if (selectedGroup && selectedGroup.type === "breakdown" && selectedGroup.options && selectedGroup.options.length > 0) {
            setTimeout(() => {
                setSelectedBreakdown((prev) => prev !== selectedGroup.options![0].label ? selectedGroup.options![0].label : prev);
            }, 0);
        } else {
            setTimeout(() => {
                setSelectedBreakdown((prev) => prev !== null ? null : prev);
            }, 0);
        }
    }, [selectedGroup]);

    return (
        <div className="h-full relative">
            <div className="h-full overflow-y-auto bg-white custom-scrollbar">
                <div className="max-w-4xl p-10 mx-auto space-y-10 pb-24">
                    <header className="flex justify-between items-end border-b border-gray-100 pb-8 mt-4">
                        <div>
                            <h2 className="text-2xl font-black tracking-tight text-gray-900">Guest Segment Definitions</h2>
                            <p className="text-sm text-gray-400 mt-1.5 font-bold">Find guests instantly based on their variables and metadata.</p>
                        </div>
                        <button className="flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-2xl text-xs font-black hover:bg-black transition-all shadow-xl shadow-gray-100 active:scale-95">
                            <Plus className="w-4 h-4" /> Create Group
                        </button>
                    </header>

                    <div className="grid grid-cols-1 gap-4">
                        {groups.map((group) => (
                            <div
                                key={group.id}
                                onClick={() => setSelectedGroup(group)}
                                className="p-7 border border-gray-100 rounded-3xl bg-white hover:border-(--brand-blue)/40 transition-all group shadow-sm hover:shadow-md cursor-pointer relative overflow-hidden"
                            >
                                {group.type === "auto-segment" && (
                                    <div className="absolute top-0 right-10 bg-(--brand-blue) text-white text-[7px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-b-lg shadow-sm">
                                        Auto-Generated
                                    </div>
                                )}
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-5">
                                        <div className={cn(
                                            "w-12 h-12 rounded-2xl flex items-center justify-center border transition-all",
                                            group.color
                                        )}>
                                            <Filter className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-black text-gray-900 tracking-tight">{group.name}</h3>
                                            <div className="flex items-center gap-3 mt-1">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                                                    <Layers className="w-3 h-3" /> {group.rule}
                                                </p>
                                                {group.type === "automation" && (
                                                    <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest bg-blue-50 px-1.5 py-0.5 rounded">Logic Driven</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-8">
                                        <div className="text-right">
                                            <div className="text-xl font-black text-gray-900 tracking-tighter">{group.count}</div>
                                            <div className="text-[9px] font-black uppercase tracking-widest text-gray-400">Guests</div>
                                        </div>
                                        <div className="flex items-center gap-2 p-1.5 bg-gray-50 rounded-xl border border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button className="p-1.5 text-gray-300 hover:text-gray-900 transition-colors"><ChevronRight className="w-4 h-4" /></button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>


                    <div className="bg-blue-50/50 rounded-4xl p-8 border border-blue-100 flex items-start gap-6 border-dashed">
                        <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-blue-100 flex items-center justify-center shrink-0">
                            <Sparkles className="w-6 h-6 text-(--brand-blue)" />
                        </div>
                        <div>
                            <h4 className="text-sm font-black text-gray-900 tracking-tight">How Smart Groups Work</h4>
                            <p className="text-xs text-gray-500 mt-1.5 font-bold leading-relaxed max-w-xl">
                                Any guest who matches your rules is automatically added here. You can use these groups to send targeted emails, print specific badges, or unlock private logic flows.
                            </p>
                            <button className="text-(--brand-blue) text-[10px] font-black uppercase tracking-widest mt-4 hover:underline">Read the Guide</button>
                        </div>
                    </div>
                </div>
            </div>

            {mounted && createPortal(
                <AnimatePresence>
                    {selectedGroup && (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setSelectedGroup(null)}
                                className="fixed inset-0 bg-white/20 backdrop-blur-sm z-9999"
                            />
                            <motion.div
                                initial={{ x: "100%" }}
                                animate={{ x: 0 }}
                                exit={{ x: "100%" }}
                                transition={{ type: "spring", damping: 30, stiffness: 300, mass: 0.8 }}
                                className="fixed right-0 top-0 bottom-0 w-120 bg-white shadow-2xl z-10000 flex flex-col overflow-hidden border-l border-gray-100"
                            >
                                <div className="p-8 border-b border-gray-100 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border", selectedGroup.color)}>
                                            <Filter className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-gray-900 tracking-tight">{selectedGroup.name}</h3>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-0.5">{selectedGroup.rule}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setSelectedGroup(null)}
                                        className="p-2.5 bg-gray-50 text-gray-400 hover:text-gray-900 rounded-xl transition-all"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-gray-50/30">
                                    {/* Action Bar */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <button className="flex items-center justify-center gap-2.5 bg-gray-900 text-white p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-gray-200 hover:bg-black transition-all">
                                            <Mail className="w-4 h-4" /> Message Group
                                        </button>
                                        <button className="flex items-center justify-center gap-2.5 bg-white border border-gray-100 p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-600 hover:border-gray-900 transition-all">
                                            <Download className="w-4 h-4" /> Export CSV
                                        </button>
                                    </div>

                                    {/* Stats */}
                                    {selectedGroup.type === "breakdown" && selectedGroup.options ? (
                                        <div className="space-y-4">
                                            <div className="p-6 bg-white border border-gray-100 rounded-3xl shadow-sm space-y-5">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Response Distribution</span>
                                                    <span className="text-[10px] font-bold text-gray-400">Total: {selectedGroup.count}</span>
                                                </div>
                                                <div className="flex flex-col gap-1 mb-2">
                                                    {selectedGroup.options
                                                        .slice() // copy
                                                        .sort((a, b) => b.pct - a.pct)
                                                        .slice(0, 5)
                                                        .map((opt) => (
                                                            <button
                                                                key={opt.label}
                                                                onClick={() => setSelectedBreakdown(opt.label)}
                                                                className={cn(
                                                                    "relative flex items-center w-full px-4 py-2 rounded-md transition-all text-left gap-3 border border-transparent overflow-hidden",
                                                                    selectedBreakdown === opt.label
                                                                        ? "bg-blue-50 font-extrabold text-blue-900"
                                                                        : "bg-white hover:bg-blue-50 text-blue-900"
                                                                )}
                                                                style={{ minHeight: 40 }}
                                                            >
                                                                {/* Progress bar background */}
                                                                <span
                                                                    className={cn(
                                                                        "absolute left-0 top-0 h-full transition-all z-0",
                                                                        selectedBreakdown === opt.label
                                                                            ? "bg-gradient-to-r from-(--brand-blue) to-blue-200"
                                                                            : "bg-blue-50"
                                                                    )}
                                                                    style={{ width: `${opt.pct}%` }}
                                                                />
                                                                {/* Icon placeholder, can be replaced with a real icon if needed */}
                                                                <span className={cn(
                                                                    "inline-block w-4 h-4 rounded-full mr-1 z-10",
                                                                    selectedBreakdown === opt.label
                                                                        ? "bg-(--brand-blue)"
                                                                        : "bg-blue-100"
                                                                )} />
                                                                <span className="font-medium text-[15px] z-10">{opt.label}</span>
                                                                <span className={cn("ml-auto text-[15px] font-extrabold z-10",
                                                                    selectedBreakdown === opt.label ? "text-(--brand-blue)" : "text-gray-400"
                                                                )}>{opt.pct}%</span>
                                                            </button>
                                                        ))}
                                                    {selectedGroup.options.length > 5 && (
                                                        <span className="px-4 py-2 rounded-md bg-gray-50 text-gray-400 text-xs font-bold align-middle select-none">
                                                            +{selectedGroup.options.length - 5} more options
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-[11px] text-gray-500 font-bold mt-1">
                                                    Click an option above to analyze its guests. Only the top 5 are shown for quick access.
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-6 bg-white border border-gray-100 rounded-3xl shadow-sm">
                                            <div className="flex justify-between items-end">
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Group Composition</p>
                                                    <div className="flex items-baseline gap-2">
                                                        <span className="text-3xl font-black text-gray-900">{selectedGroup.count}</span>
                                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Guests</span>
                                                    </div>
                                                </div>
                                                <div className="bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100 text-[10px] font-black text-emerald-600 flex items-center gap-1.5">
                                                    <UserCheck className="w-3.5 h-3.5" /> High Engagement
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Guest List */}
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Guest List Breakdown</h4>
                                            <div className="relative group max-w-[210px] w-full">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 group-focus-within:text-(--brand-blue) transition-colors z-10" />
                                                <input
                                                    type="text"
                                                    placeholder="Search guests, emails, or squads..."
                                                    className="w-full pl-9 pr-10 py-1.5 bg-white/80 border border-gray-100 rounded-full text-[13px] font-bold text-gray-400 placeholder:text-gray-300 focus:bg-white focus:ring-2 focus:ring-blue-100/40 focus:border-blue-100 outline-none transition-all shadow-sm shadow-gray-100"
                                                    style={{ boxShadow: '0 1px 4px 0 rgba(60,60,100,0.04)' }}
                                                />
                                                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 px-1.5 py-0.5 bg-white border border-gray-100 rounded-lg shadow-sm pointer-events-none group-focus-within:opacity-0 transition-opacity duration-200">
                                                    <span className="text-[10px] font-black text-gray-300">⌘</span>
                                                    <span className="text-[9px] font-black text-gray-300">K</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            {selectedGroup.type === "breakdown" && selectedGroup.options && selectedBreakdown
                                                ? selectedGroup.options.find(opt => opt.label === selectedBreakdown)?.guests.map((guest, i) => (
                                                    <div key={i} className="p-4 bg-white border border-gray-100 rounded-2xl flex items-center justify-between group/item hover:border-(--brand-blue)/20 transition-all cursor-pointer">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 bg-gray-900 text-white rounded-xl flex items-center justify-center text-[10px] font-black shadow-sm">
                                                                {guest.avatar}
                                                            </div>
                                                            <div>
                                                                <p className="font-black text-gray-900 text-xs tracking-tight leading-none">{guest.name}</p>
                                                                <p className="text-[10px] font-bold text-gray-400 mt-1">{guest.email}</p>
                                                            </div>
                                                        </div>
                                                        <span className={cn(
                                                            "text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg",
                                                            guest.status === "Checked In" ? "bg-green-50 text-green-600" : "bg-blue-50 text-blue-600"
                                                        )}>
                                                            {guest.status}
                                                        </span>
                                                    </div>
                                                ))
                                                : selectedGroup.type !== "breakdown"
                                                    ? MOCK_GUESTS.map((guest, i) => (
                                                        <div key={i} className="p-4 bg-white border border-gray-100 rounded-2xl flex items-center justify-between group/item hover:border-(--brand-blue)/20 transition-all cursor-pointer">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-9 h-9 bg-gray-900 text-white rounded-xl flex items-center justify-center text-[10px] font-black shadow-sm">
                                                                    {guest.avatar}
                                                                </div>
                                                                <div>
                                                                    <p className="font-black text-gray-900 text-xs tracking-tight leading-none">{guest.name}</p>
                                                                    <p className="text-[10px] font-bold text-gray-400 mt-1">{guest.email}</p>
                                                                </div>
                                                            </div>
                                                            <span className={cn(
                                                                "text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg",
                                                                guest.status === "Checked In" ? "bg-green-50 text-green-600" : "bg-blue-50 text-blue-600"
                                                            )}>
                                                                {guest.status}
                                                            </span>
                                                        </div>
                                                    ))
                                                    : null}
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6 border-t border-gray-100 flex items-center gap-3 bg-white mt-auto z-20">
                                    <button
                                        onClick={onNavigateToRegistry}
                                        className="w-full bg-(--brand-blue) text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-100 hover:scale-[1.02] active:scale-[0.98] transition-all"
                                    >
                                        Open in Full Registry
                                    </button>
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
}
