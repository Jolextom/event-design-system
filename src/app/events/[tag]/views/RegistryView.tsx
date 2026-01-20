"use client";

import React, { useState } from "react";
import {
    Search,
    Filter,
    Download,
    MoreHorizontal,
    CheckCircle2,
    Clock,
    UserPlus,
    ShieldCheck,
    Mail
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const MOCK_GUESTS = [
    { id: "1", name: "Alex Rivera", email: "alex@design.com", type: "VIP", status: "Checked In", squad: "Luma Core", registered: "2h ago", avatar: "AR" },
    { id: "2", name: "Sarah Chen", email: "sarah@startup.io", type: "Standard", status: "Ready", squad: "Solo", registered: "5h ago", avatar: "SC" },
    { id: "3", name: "Jordan Smith", email: "j.smith@corp.com", type: "Speaker", status: "Ready", squad: "Hosts", registered: "1d ago", avatar: "JS" },
    { id: "4", name: "Elena Rodriguez", email: "elena@art.es", type: "Standard", status: "Invite Sent", squad: "Squad Alpha", registered: "2d ago", avatar: "ER" },
    { id: "5", name: "Marcus Thorne", email: "m.thorne@web3.vc", type: "VIP", status: "Checked In", squad: "Luma Core", registered: "2h ago", avatar: "MT" },
    { id: "6", name: "Lila Vance", email: "lila@vance.co", type: "Standard", status: "Refunded", squad: "Solo", registered: "3h ago", avatar: "LV" },
    { id: "7", name: "Davide Russo", email: "d.russo@milano.it", type: "Press", status: "Pending", squad: "Media Team", registered: "10m ago", avatar: "DR" },
    { id: "8", name: "Sophie Wu", email: "wu.sophie@tech.cn", type: "VIP", status: "Checked In", squad: "Investors", registered: "1h ago", avatar: "SW" },
    { id: "9", name: "James Miller", email: "j.miller@london.uk", type: "Standard", status: "Cancelled", squad: "Solo", registered: "4h ago", avatar: "JM" },
];

export function RegistryView({ initialSegment }: {
    initialSegment?: {
        name: string;
        options?: { label: string; count: number; guests: typeof MOCK_GUESTS }[];
        selectedOption?: string;
    };
}) {
    const [searchTerm, setSearchTerm] = useState("");
    // const [selectedRows, setSelectedRows] = useState<string[]>([]);
    const [activeSegment, setActiveSegment] = useState<typeof initialSegment | null>(initialSegment ?? null);

    const handleTabClick = (label: string) => {
        setActiveSegment((seg) => seg ? { ...seg, selectedOption: label } : seg);
    };

    const filteredGuests = activeSegment && activeSegment.options
        ? activeSegment.selectedOption === "All/Breakdown"
            ? activeSegment.options.flatMap(opt => opt.guests)
            : activeSegment.options.find(opt => opt.label === activeSegment.selectedOption)?.guests || []
        : MOCK_GUESTS;

    return (
        <div className="h-full flex flex-col bg-white overflow-hidden animate-in fade-in duration-500">
            {/* Compact Header, Stats, and Search/Filter Row */}
            {/* Enhanced Header Section */}
            <div className="flex flex-col px-8 py-5 bg-white border-b border-gray-100">
                {/* Header Title Row */}
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-3xl font-black tracking-tight text-gray-900">Guest Registry</h1>
                    <div className="flex items-center gap-2">
                        <button className="px-5 py-2.5 bg-gray-50 hover:bg-gray-100 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] text-gray-600 transition-all hover:shadow-sm flex items-center gap-2">
                            <Download className="w-3.5 h-3.5" />
                            EXPORT CSV
                        </button>
                        <button className="bg-gray-900 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] shadow-md hover:shadow-lg hover:bg-black transition-all flex items-center gap-2">
                            <UserPlus className="w-3.5 h-3.5" />
                            ADD GUEST
                        </button>
                    </div>
                </div>
                {/* Stats Row - Improved spacing and visual hierarchy */}
                <div className="flex gap-12 items-center mb-5">
                    <div className="flex items-baseline gap-2.5">
                        <span className="text-base font-black text-gray-900 tracking-tight leading-none">1,248</span>
                        <span className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-400">Total Guests</span>
                    </div>
                    <div className="flex items-baseline gap-2.5">
                        <span className="text-base font-black text-green-500 tracking-tight leading-none">842</span>
                        <span className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-400">Checked In</span>
                    </div>
                </div>
                {/* Search & Filter Row - Enhanced search bar */}
                <div className="flex items-center gap-3">
                    <div className="relative group flex-1 max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors z-10" />
                        <input
                            type="text"
                            placeholder="Search guests, emails, or squads..."
                            className="w-full pl-11 pr-16 py-2.5 bg-gray-50 border border-gray-200 rounded-full text-[13px] font-semibold text-gray-900 placeholder:text-gray-400/70 focus:bg-white focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500/30 outline-none transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5 px-2 py-1 bg-white border border-gray-200 rounded-md shadow-sm pointer-events-none group-focus-within:opacity-0 transition-opacity duration-200">
                            <span className="text-[10px] font-bold text-gray-400">⌘</span>
                            <span className="text-[10px] font-bold text-gray-400">K</span>
                        </div>
                    </div>
                    <button className="flex items-center gap-2 px-5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] text-gray-600 hover:bg-white hover:border-gray-300 hover:shadow-sm transition-all">
                        <Filter className="w-3.5 h-3.5" />
                        Filter
                    </button>
                </div>
            </div>

            {/* Compact Filtered by Segment & Tabs UI */}
            {activeSegment && (
                <div className="px-8 pt-2 pb-2 bg-white border-b border-gray-100 flex items-center gap-6">
                    <div className="flex flex-col gap-0 min-w-45">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Filtered by Segment</span>
                        <span className="text-base font-black text-gray-900 leading-tight">{activeSegment.name}</span>
                    </div>
                    <button
                        className="ml-2 px-2 py-1 text-xs font-bold text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                        title="Clear segment filter"
                        onClick={() => setActiveSegment(null)}
                    >
                        ×
                    </button>
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleTabClick("All/Breakdown")}
                            className={cn(
                                "px-5 py-2 rounded-full text-xs font-black transition-all",
                                activeSegment.selectedOption === "All/Breakdown"
                                    ? "bg-(--brand-blue) text-white shadow"
                                    : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                            )}
                        >
                            All/Breakdown
                        </button>
                        {activeSegment.options && activeSegment.options.map(opt => (
                            <button
                                key={opt.label}
                                onClick={() => handleTabClick(opt.label)}
                                className={cn(
                                    "px-5 py-2 rounded-full text-xs font-black transition-all",
                                    activeSegment.selectedOption === opt.label
                                        ? "bg-(--brand-blue) text-white shadow"
                                        : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                                )}
                            >
                                {opt.label} <span className="ml-2 text-[10px] font-bold text-gray-200">{opt.count}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Spacious Guest List Table */}
            <div className="flex-1 overflow-auto custom-scrollbar px-8 pt-2 pb-2 bg-white">
                <table className="w-full text-left border-collapse min-w-200">
                    <thead className="sticky top-0 bg-white/80 backdrop-blur-md z-10">
                        <tr className="border-b border-gray-100">
                            <th className="pl-8 py-6 w-12">
                                <input type="checkbox" className="w-4 h-4 rounded border-gray-200 accent-(--brand-blue)" />
                            </th>
                            <th className="px-4 py-6 text-[12px] font-black uppercase tracking-[0.2em] text-gray-400">Name</th>
                            <th className="px-4 py-6 text-[12px] font-black uppercase tracking-[0.2em] text-gray-400">Ticket Type</th>
                            <th className="px-4 py-6 text-[12px] font-black uppercase tracking-[0.2em] text-gray-400">Squad</th>
                            <th className="px-4 py-6 text-[12px] font-black uppercase tracking-[0.2em] text-gray-400">Registered</th>
                            <th className="px-4 py-6 text-[12px] font-black uppercase tracking-[0.2em] text-gray-400">Status</th>
                            <th className="px-4 py-6 text-[12px] font-black uppercase tracking-[0.2em] text-gray-400 text-right pr-8">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filteredGuests.map((guest, i) => (
                            <motion.tr
                                key={guest.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="group hover:bg-gray-50/50 transition-all cursor-default"
                            >
                                <td className="pl-8 py-4">
                                    <input type="checkbox" className="w-4 h-4 rounded border-gray-200 accent-(--brand-blue)" />
                                </td>
                                <td className="px-4 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center font-black text-[10px] text-gray-500 group-hover:bg-(--brand-blue) group-hover:text-white transition-all">
                                            {guest.avatar || guest.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-gray-900 tracking-tight leading-none mb-1">{guest.name}</p>
                                            <p className="text-[10px] font-bold text-gray-400">{guest.email}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-4">
                                    <span className={cn(
                                        "px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                                        guest.type === "VIP" ? "bg-amber-50 text-amber-600 border-amber-100" :
                                            guest.type === "Speaker" ? "bg-purple-50 text-purple-600 border-purple-100" :
                                                "bg-blue-50 text-blue-600 border-blue-100"
                                    )}>
                                        {guest.type}
                                    </span>
                                </td>
                                <td className="px-4 py-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-gray-200" />
                                        <span className="text-[11px] font-bold text-gray-600">{guest.squad}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-4">
                                    <div className="flex items-center gap-1.5 text-gray-400">
                                        <Clock className="w-3 h-3" />
                                        <span className="text-[10px] font-bold">{guest.registered}</span>
                                    </div>
                                </td>
                                <td className="px-4 py-4">
                                    <div className="flex items-center gap-2">
                                        {guest.status === "Checked In" ? (
                                            <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
                                        ) : guest.status === "Invite Sent" ? (
                                            <Mail className="w-3.5 h-3.5 text-blue-400" />
                                        ) : (
                                            <CheckCircle2 className="w-3.5 h-3.5 text-gray-300" />
                                        )}
                                        <span className={cn(
                                            "text-[10px] font-black uppercase tracking-widest",
                                            guest.status === "Checked In" ? "text-green-600" :
                                                guest.status === "Refunded" ? "text-red-400" :
                                                    "text-gray-500"
                                        )}>
                                            {guest.status}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-4 py-4 text-right pr-8">
                                    <button className="p-2 text-gray-300 hover:text-gray-900 hover:bg-white rounded-lg border border-transparent hover:border-gray-100 transition-all">
                                        <MoreHorizontal className="w-4 h-4" />
                                    </button>
                                </td>
                            </motion.tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination / Summary Footer */}
            <div className="p-4 border-t border-gray-100 bg-white flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-gray-400">
                <div className="flex items-center gap-6">
                    <span>Active Filters: <span className="text-gray-900 px-2 py-0.5 bg-gray-50 rounded border border-gray-100 ml-1">None</span></span>
                    <span>Total Guests: <span className="text-gray-900">1,482</span></span>
                </div>
                <div className="flex items-center gap-4">
                    <button className="px-3 py-1 hover:text-gray-900 transition-colors disabled:opacity-30" disabled>Previous</button>
                    <div className="flex items-center gap-1">
                        <span className="w-6 h-6 flex items-center justify-center bg-(--brand-blue) text-white rounded">1</span>
                        <span className="w-6 h-6 flex items-center justify-center hover:bg-gray-50 rounded transition-colors cursor-pointer">2</span>
                        <span className="w-6 h-6 flex items-center justify-center hover:bg-gray-50 rounded transition-colors cursor-pointer">3</span>
                    </div>
                    <button className="px-3 py-1 hover:text-gray-900 transition-colors">Next</button>
                </div>
            </div>
        </div>
    );
}
