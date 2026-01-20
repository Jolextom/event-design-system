"use client";

import React from "react";
import {
    Mail,
    Send,
    Layout,
    Calendar,
    BarChart3,
    Plus,
    MousePointer2,
    Eye,
    Settings
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const MOCK_CAMPAIGNS = [
    { id: "1", name: "Registration Confirmation", type: "Transactional", status: "Active", metrics: "98% Open" },
    { id: "2", name: "1-Day Reminder", type: "Scheduled", status: "Draft", metrics: "--" },
    { id: "3", name: "Post-Event Survey", type: "Automated", status: "Active", metrics: "42% Click" },
];

export function BroadcastView() {
    return (
        <div className="h-full overflow-y-auto bg-white custom-scrollbar">
            <div className="p-8 md:p-10 space-y-10 max-w-6xl mx-auto relative pb-24">
                {/* Header */}
                <header className="flex items-end justify-between relative z-10">
                    <div>
                        <div className="flex items-center gap-2.5 mb-2.5">
                            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-[var(--brand-blue)] opacity-70">Communication Studio</span>
                            <div className="h-[1px] w-8 bg-gray-100" />
                        </div>
                        <h1 className="text-2xl font-black tracking-tight text-gray-900 leading-none">Broadcasts</h1>
                        <p className="text-sm text-gray-400 mt-2 font-bold opacity-80">Design and automate your event communications.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-black uppercase tracking-widest text-gray-500 hover:bg-white hover:border-gray-200 transition-all shadow-sm">
                            <Layout className="w-3.5 h-3.5" />
                            Templates
                        </button>
                        <button className="bg-gray-900 text-white px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-gray-200 hover:bg-black transition-all flex items-center gap-2">
                            <Plus className="w-3.5 h-3.5" />
                            New Campaign
                        </button>
                    </div>
                </header>

                <div className="grid grid-cols-12 gap-8 relative z-10">
                    {/* Active Campaigns List */}
                    <div className="col-span-12 lg:col-span-7 space-y-4">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 px-2">Active Campaigns</h3>
                        {MOCK_CAMPAIGNS.map((camp, i) => (
                            <motion.div
                                key={camp.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="p-6 border border-gray-100 rounded-[24px] bg-white shadow-sm hover:shadow-md transition-all flex items-center justify-between group cursor-pointer"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={cn(
                                        "w-10 h-10 rounded-2xl flex items-center justify-center border transition-all",
                                        camp.status === "Active" ? "bg-emerald-50 border-emerald-100 text-emerald-600" : "bg-gray-50 border-transparent text-gray-300"
                                    )}>
                                        <Send className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="text-[13px] font-black text-gray-900 tracking-tight leading-none mb-1.5">{camp.name}</h4>
                                        <div className="flex items-center gap-3">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">{camp.type}</span>
                                            <span className="w-1 h-1 rounded-full bg-gray-200" />
                                            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500">{camp.metrics}</span>
                                        </div>
                                    </div>
                                </div>
                                <button className="p-2 text-gray-300 group-hover:text-gray-900 transition-colors">
                                    <Eye className="w-4 h-4" />
                                </button>
                            </motion.div>
                        ))}
                    </div>

                    {/* Quick Preview / Theme Editor Sidebar */}
                    <div className="col-span-12 lg:col-span-5 space-y-6">
                        <div className="p-8 border border-gray-100 rounded-[32px] bg-gray-50/50 flex flex-col items-center justify-center min-h-[400px] border-dashed group relative overflow-hidden">
                            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
                            <div className="w-full max-w-[280px] bg-white rounded-2xl shadow-xl p-6 space-y-4 scale-90 origin-center group-hover:scale-95 transition-transform">
                                <div className="w-12 h-4 bg-gray-100 rounded" />
                                <div className="aspect-video bg-gray-50 rounded-lg flex items-center justify-center">
                                    <Layout className="w-8 h-8 text-gray-200" />
                                </div>
                                <div className="space-y-2">
                                    <div className="h-3 w-3/4 bg-gray-100 rounded" />
                                    <div className="h-2 w-1/2 bg-gray-50 rounded" />
                                </div>
                                <div className="h-8 w-full bg-gray-900 rounded-lg" />
                            </div>
                            <div className="mt-8 text-center relative z-10">
                                <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-widest">Email Theme Sync</h4>
                                <p className="text-[10px] text-gray-400 font-bold mt-1">Logo & Brand Colors automatically applied.</p>
                            </div>
                            <button className="mt-6 flex items-center gap-2 px-6 py-2.5 bg-white border border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-600 hover:shadow-md transition-all active:scale-95">
                                <Settings className="w-3.5 h-3.5" />
                                Global Theme
                            </button>
                        </div>
                    </div>
                </div>

                {/* Automation Summary Card */}
                <div className="grid grid-cols-3 gap-5 relative z-10">
                    {[
                        { label: "Total Sent", value: "24.5k", icon: Mail, color: "text-blue-500", bg: "bg-blue-50" },
                        { label: "Avg Delivery", value: "99.8%", icon: BarChart3, color: "text-emerald-500", bg: "bg-emerald-50" },
                        { label: "Engagement", value: "None", icon: MousePointer2, color: "text-orange-500", bg: "bg-orange-50" },
                    ].map((stat, i) => (
                        <div key={i} className="p-6 border border-gray-100 rounded-2xl bg-white shadow-sm hover:shadow-md transition-all">
                            <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center mb-4", stat.bg)}>
                                <stat.icon className={cn("w-4 h-4", stat.color)} />
                            </div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">{stat.label}</p>
                            <p className="text-xl font-black text-gray-900 tracking-tighter">{stat.value}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
