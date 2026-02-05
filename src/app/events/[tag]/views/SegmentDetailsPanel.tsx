import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { X, Filter, Mail, Download, UserCheck, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Attendee } from "../types";
import { evaluateSegment } from "../utils/segmentLogic";

interface Group {
    id: string;
    name: string;
    rule: string;
    count: number;
    color: string;
    type: string;
    options?: BreakdownOption[];
    rules_config?: any;
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

interface SegmentDetailsPanelProps {
    selectedGroup: Group;
    attendees: Attendee[];
    onClose: () => void;
    onNavigateToRegistry?: () => void;
    onSelectGuest: (guest: Attendee) => void;
}

export function SegmentDetailsPanel({ selectedGroup, attendees = [], onClose, onNavigateToRegistry, onSelectGuest }: SegmentDetailsPanelProps) {
    const [selectedBreakdown, setSelectedBreakdown] = useState<string | null>(null);

    // Filter guests for this group
    const groupGuests = React.useMemo(() => {
        if (!selectedGroup.rules_config) return [];
        return attendees.filter(g => evaluateSegment(g, selectedGroup.rules_config));
    }, [attendees, selectedGroup]);

    return (
        <>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 bg-white/20 backdrop-blur-sm z-[9999]"
            />
            <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 300, mass: 0.8 }}
                className="fixed right-0 top-0 bottom-0 w-120 bg-white shadow-2xl z-[10000] flex flex-col overflow-hidden border-l border-gray-100"
            >
                {/* Header */}
                <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-white">
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
                        onClick={onClose}
                        className="p-2.5 bg-gray-50 text-gray-400 hover:text-gray-900 rounded-xl transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
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

                    {/* Stats / Breakdown */}
                    {selectedGroup.type === "breakdown" && selectedGroup.options ? (
                        <div className="space-y-4">
                            <div className="p-6 bg-white border border-gray-100 rounded-3xl shadow-sm space-y-5">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Response Distribution</span>
                                    <span className="text-[10px] font-bold text-gray-400">Total: {selectedGroup.count}</span>
                                </div>
                                <div className="flex flex-col gap-1 mb-2">
                                    {selectedGroup.options
                                        .slice()
                                        .sort((a, b) => b.pct - a.pct)
                                        .slice(0, 5)
                                        .map((opt) => (
                                            <button
                                                key={opt.label}
                                                onClick={() => setSelectedBreakdown(opt.label)}
                                                className={cn(
                                                    "relative flex items-center w-full px-4 py-2 rounded-md transition-all text-left gap-3 border border-transparent overflow-hidden",
                                                    selectedBreakdown === opt.label
                                                        ? "bg-blue-100/60 font-extrabold text-blue-900"
                                                        : "bg-white hover:bg-blue-50 text-blue-900"
                                                )}
                                                style={{ minHeight: 40 }}
                                            >
                                                <span
                                                    className={cn(
                                                        "absolute left-0 top-0 h-full transition-all z-0",
                                                        selectedBreakdown === opt.label
                                                            ? "bg-blue-300/60"
                                                            : "bg-blue-100/40"
                                                    )}
                                                    style={{ width: `${opt.pct}%` }}
                                                />
                                                <span className="inline-block w-4 h-4 rounded-full bg-blue-200 mr-1 z-10" />
                                                <span className="font-medium text-[15px] z-10">{opt.label}</span>
                                                <span className={cn("ml-auto text-[15px] font-bold z-10", selectedBreakdown === opt.label ? "text-blue-700" : "text-gray-400")}>{opt.pct}%</span>
                                            </button>
                                        ))}
                                </div>
                                <div className="text-[11px] text-gray-500 font-bold mt-1">
                                    Click an option above to analyze its guests.
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
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Guest List</h4>
                            <div className="relative group max-w-52 w-full">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 group-focus-within:text-[var(--brand-blue)] transition-colors z-10" />
                                <input
                                    type="text"
                                    placeholder="Search guests..."
                                    className="w-full pl-9 pr-4 py-1.5 bg-white/80 border border-gray-100 rounded-full text-[13px] font-bold text-gray-400 focus:bg-white focus:ring-2 focus:ring-blue-100/40 focus:border-blue-100 outline-none transition-all"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            {/* Ideally, we filter real attendees here, but utilizing MOCK for simple display restoration first as requested to 'restore' the look */}
                            {/* {MOCK_GUESTS.map((guest, i) => (
                                <div key={i} className="p-4 bg-white border border-gray-100 rounded-2xl flex items-center justify-between group/item hover:border-[var(--brand-blue)]/20 transition-all cursor-pointer">
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
                            ))} */}
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-gray-100 flex items-center gap-3 bg-white mt-auto z-20">
                    <button
                        onClick={onNavigateToRegistry}
                        className="w-full bg-[var(--brand-blue)] text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-100 hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                        Open in Full Registry
                    </button>
                </div>
            </motion.div>
        </>
    );
}
