"use client";

import React from "react";
import { Users, BarChart2, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export function OverviewView() {
    return (
        <div className="h-full overflow-y-auto bg-white custom-scrollbar">
            <div className="p-8 md:p-10 space-y-10 max-w-5xl mx-auto relative pb-24">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[var(--brand-blue)]/5 blur-[120px] rounded-full pointer-events-none" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-green-500/5 blur-[100px] rounded-full pointer-events-none" />

                <header className="relative z-10 pt-4">
                    <span className="text-[9px] font-black uppercase tracking-[0.3em] text-[var(--brand-blue)] mb-2.5 block opacity-70">Good Afternoon, Greg</span>
                    <h1 className="text-3xl font-black tracking-tight text-gray-900 leading-none">Your Event at a Glance</h1>
                    <p className="text-sm text-gray-400 mt-2 font-bold opacity-80">Everything is looking great for <span className="text-gray-900 opacity-100">Global Design Gala 2026</span>.</p>
                </header>

                <div className="grid grid-cols-3 gap-5 relative z-10">
                    {[
                        { label: "Guests Growing", value: "1,248", change: "+12%", icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
                        { label: "Total Revenue", value: "$42.5k", change: "+8%", icon: BarChart2, color: "text-green-600", bg: "bg-green-50" },
                        { label: "Active Flow", value: "14 Nodes", change: "Synced", icon: Zap, color: "text-orange-600", bg: "bg-orange-50" },
                    ].map((stat, i) => (
                        <div key={i} className="p-8 border border-gray-100 rounded-[32px] bg-white/60 backdrop-blur-md shadow-sm hover:shadow-xl hover:scale-[1.01] transition-all cursor-default group">
                            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-6 shadow-sm border border-transparent group-hover:border-gray-100 transition-all", stat.bg)}>
                                <stat.icon className={cn("w-6 h-6", stat.color)} />
                            </div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">{stat.label}</p>
                            <div className="flex items-end gap-2.5">
                                <span className="text-3xl font-black text-gray-900 tracking-tighter">{stat.value}</span>
                                <span className="text-[10px] font-black text-green-600 mb-1.5">{stat.change}</span>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-8 p-8 bg-gray-900 rounded-[32px] text-white flex items-center justify-between relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative z-10">
                        <h3 className="text-lg font-black tracking-tight">Ready to invite your first guest?</h3>
                        <p className="text-gray-400 text-xs mt-1 font-bold">Your signup flow is 85% ready to go.</p>
                    </div>
                    <button className="relative z-10 bg-white text-gray-900 px-7 py-3 rounded-xl font-black text-xs hover:bg-gray-100 transition-all shadow-lg active:scale-95">
                        Open Setup
                    </button>
                </div>
            </div>
        </div>
    );
}
