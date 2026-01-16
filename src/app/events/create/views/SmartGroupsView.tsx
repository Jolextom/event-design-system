"use client";

import React, { useState } from "react";
import { Plus, Filter, Layers, ChevronRight, Sparkles, X, Mail, Download, UserCheck, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export function SmartGroupsView() {
    const [groups, setGroups] = useState([
        { id: "g0", name: "Verified Speakers", rule: "is_speaker = true", count: 12, color: "bg-emerald-100 text-emerald-700", type: "manual" },
        { id: "g1", name: "Team Red", rule: "team_color = 'Red'", count: 42, color: "bg-red-100 text-red-700", type: "automation" },
        { id: "g2", name: "VIP Attendees", rule: "priority = 'High'", count: 115, color: "bg-purple-100 text-purple-700", type: "manual" },
        { id: "g3", name: "Expertise: Senior", rule: "expertise = 'Senior'", count: 24, color: "bg-indigo-100 text-indigo-700", type: "auto-segment" },
    ]);

    const [selectedGroup, setSelectedGroup] = useState<any>(null);

    const MOCK_GUESTS = [
        { name: "Alex Rivera", email: "alex@design.co", status: "Registered", avatar: "AR" },
        { name: "Sarah Chen", email: "sarah.c@tech.com", status: "Checked In", avatar: "SC" },
        { name: "Marcus Thorne", email: "m.thorne@vibe.net", status: "Invited", avatar: "MT" },
        { name: "Elena Rossi", email: "elena@studio.it", status: "Registered", avatar: "ER" },
    ];

    return (
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
                            className="p-7 border border-gray-100 rounded-[24px] bg-white hover:border-[var(--brand-blue)]/40 transition-all group shadow-sm hover:shadow-md cursor-pointer relative overflow-hidden"
                        >
                            {group.type === "auto-segment" && (
                                <div className="absolute top-0 right-10 bg-[var(--brand-blue)] text-white text-[7px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-b-lg shadow-sm">
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

                <AnimatePresence>
                    {selectedGroup && (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setSelectedGroup(null)}
                                className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 overflow-hidden"
                            />
                            <motion.div
                                initial={{ x: "100%" }}
                                animate={{ x: 0 }}
                                exit={{ x: "100%" }}
                                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                                className="fixed right-0 top-0 bottom-0 w-[480px] bg-white shadow-2xl z-[60] flex flex-col overflow-hidden"
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
                                    <div className="p-6 bg-white border border-gray-100 rounded-[24px] shadow-sm">
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

                                    {/* Guest List */}
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Guest List Breakdown</h4>
                                            <div className="relative">
                                                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
                                                <input
                                                    type="text"
                                                    placeholder="Search this group..."
                                                    className="pl-9 pr-4 py-1.5 bg-white border border-gray-100 rounded-xl text-[10px] font-bold outline-none focus:border-[var(--brand-blue)]/50 transition-all"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            {MOCK_GUESTS.map((guest, i) => (
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
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="p-8 border-t border-gray-100 flex items-center gap-3">
                                    <button className="flex-1 bg-[var(--brand-blue)] text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-100 hover:scale-[1.02] active:scale-[0.98] transition-all">
                                        Open in Full Registry
                                    </button>
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>

                <div className="bg-blue-50/50 rounded-[32px] p-8 border border-blue-100 flex items-start gap-6 border-dashed">
                    <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-blue-100 flex items-center justify-center shrink-0">
                        <Sparkles className="w-6 h-6 text-[var(--brand-blue)]" />
                    </div>
                    <div>
                        <h4 className="text-sm font-black text-gray-900 tracking-tight">How Smart Groups Work</h4>
                        <p className="text-xs text-gray-500 mt-1.5 font-bold leading-relaxed max-w-xl">
                            Any guest who matches your rules is automatically added here. You can use these groups to send targeted emails, print specific badges, or unlock private logic flows.
                        </p>
                        <button className="text-[var(--brand-blue)] text-[10px] font-black uppercase tracking-widest mt-4 hover:underline">Read the Guide</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
