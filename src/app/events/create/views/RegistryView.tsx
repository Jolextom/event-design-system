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
    ArrowUpDown,
    Tag as TagIcon,
    Mail
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const MOCK_GUESTS = [
    { id: "1", name: "Alex Rivera", email: "alex@design.com", type: "VIP", status: "Checked In", squad: "Luma Core", registered: "2h ago" },
    { id: "2", name: "Sarah Chen", email: "sarah@startup.io", type: "Standard", status: "Ready", squad: "Solo", registered: "5h ago" },
    { id: "3", name: "Jordan Smith", email: "j.smith@corp.com", type: "Speaker", status: "Ready", squad: "Hosts", registered: "1d ago" },
    { id: "4", name: "Elena Rodriguez", email: "elena@art.es", type: "Standard", status: "Invite Sent", squad: "Squad Alpha", registered: "2d ago" },
    { id: "5", name: "Marcus Thorne", email: "m.thorne@web3.vc", type: "VIP", status: "Checked In", squad: "Luma Core", registered: "2h ago" },
    { id: "6", name: "Lila Vance", email: "lila@vance.co", type: "Standard", status: "Refunded", squad: "Solo", registered: "3h ago" },
];

export function RegistryView() {
    const [searchTerm, setSearchTerm] = useState("");

    return (
        <div className="h-full flex flex-col bg-white">
            {/* Action Bar */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between gap-4 bg-white/50 backdrop-blur-md sticky top-0 z-20">
                <div className="flex items-center gap-3 flex-1 max-w-md">
                    <div className="relative flex-1 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[var(--brand-blue)] transition-colors z-10" />
                        <input
                            type="text"
                            placeholder="Search guests, emails, or squads..."
                            className="w-full pl-11 pr-12 py-3 bg-gray-50/50 border border-gray-100/50 rounded-2xl text-[13px] font-bold text-gray-900 placeholder:text-gray-400/60 focus:bg-white focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500/20 outline-none transition-all shadow-inner"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2 py-1 bg-white border border-gray-100 rounded-lg shadow-sm pointer-events-none group-focus-within:opacity-0 transition-opacity duration-200">
                            <span className="text-[10px] font-black text-gray-300">⌘</span>
                            <span className="text-[9px] font-black text-gray-300">K</span>
                        </div>
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-xs font-black uppercase tracking-widest text-gray-500 hover:bg-white hover:border-gray-200 transition-all shadow-sm">
                        <Filter className="w-3.5 h-3.5" />
                        Filter
                    </button>
                </div>
                <div className="flex items-center gap-3">
                    <button className="p-2.5 text-gray-400 hover:text-gray-900 border border-transparent hover:border-gray-100 rounded-xl transition-all">
                        <Download className="w-4.5 h-4.5" />
                    </button>
                    <div className="w-px h-6 bg-gray-100 mx-1" />
                    <button className="bg-gray-900 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-gray-200 hover:bg-black transition-all flex items-center gap-2">
                        <UserPlus className="w-3.5 h-3.5" />
                        Add Guest
                    </button>
                </div>
            </div>

            {/* Grid Table */}
            <div className="flex-1 overflow-auto custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead className="sticky top-0 bg-white/80 backdrop-blur-md z-10">
                        <tr className="border-b border-gray-100">
                            <th className="pl-8 py-4 w-12">
                                <input type="checkbox" className="w-4 h-4 rounded border-gray-200 accent-[var(--brand-blue)]" />
                            </th>
                            <th className="px-4 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                                <span className="flex items-center gap-2">Name <ArrowUpDown className="w-3 h-3" /></span>
                            </th>
                            <th className="px-4 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Ticket Type</th>
                            <th className="px-4 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Squad</th>
                            <th className="px-4 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Status</th>
                            <th className="px-4 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 text-right pr-8">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {MOCK_GUESTS.map((guest, i) => (
                            <motion.tr
                                key={guest.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="group hover:bg-gray-50/50 transition-all cursor-default"
                            >
                                <td className="pl-8 py-4">
                                    <input type="checkbox" className="w-4 h-4 rounded border-gray-200 accent-[var(--brand-blue)]" />
                                </td>
                                <td className="px-4 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center font-black text-[10px] text-gray-500 group-hover:bg-[var(--brand-blue)] group-hover:text-white transition-all">
                                            {guest.name.charAt(0)}
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
                                    <p className="text-[9px] font-bold text-gray-300 mt-0.5">{guest.registered}</p>
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
                        <span className="w-6 h-6 flex items-center justify-center bg-[var(--brand-blue)] text-white rounded">1</span>
                        <span className="w-6 h-6 flex items-center justify-center hover:bg-gray-50 rounded transition-colors cursor-pointer">2</span>
                        <span className="w-6 h-6 flex items-center justify-center hover:bg-gray-50 rounded transition-colors cursor-pointer">3</span>
                    </div>
                    <button className="px-3 py-1 hover:text-gray-900 transition-colors">Next</button>
                </div>
            </div>
        </div>
    );
}
