"use client";

import React from "react";
import {
    Users,
    BarChart2,
    Zap,
    ArrowUpRight,
    TrendingUp,
    Target,
    Activity,
    CreditCard,
    PieChart,
    PieChart as PieChartIcon,
    ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export function CommandHubView() {
    return (
        <div className="h-full overflow-y-auto bg-white custom-scrollbar">
            <div className="p-8 md:p-10 space-y-10 max-w-6xl mx-auto relative pb-24">
                {/* Decorative background glows */}
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[var(--brand-blue)]/5 blur-[120px] rounded-full pointer-events-none" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none" />

                <header className="relative z-10 pt-4 flex items-end justify-between">
                    <div>
                        <div className="flex items-center gap-2.5 mb-2.5">
                            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-[var(--brand-blue)] opacity-70">Strategic Overview</span>
                            <div className="h-[1px] w-8 bg-gray-100" />
                        </div>
                        <h1 className="text-3xl font-black tracking-tight text-gray-900 leading-none">Command Center</h1>
                        <p className="text-sm text-gray-400 mt-2 font-bold opacity-80">
                            Welcome back, <span className="text-gray-900 opacity-100">Lead</span>. Everything is tracking to target for <span className="text-gray-900 opacity-100 italic">Global Design Gala</span>.
                        </p>
                    </div>
                    <div className="flex items-center gap-2 pb-1">
                        <div className="px-3 py-1.5 bg-green-50 rounded-full flex items-center gap-2 border border-green-100">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-[10px] font-black text-green-700 uppercase tracking-widest">Live Pulse</span>
                        </div>
                    </div>
                </header>

                {/* Primary Metrics Grid */}
                <div className="grid grid-cols-4 gap-4 relative z-10">
                    {[
                        { label: "Total Registrations", value: "1,482", change: "+12.5%", icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
                        { label: "Net Revenue", value: "$64,280", change: "+8.2%", icon: CreditCard, color: "text-emerald-600", bg: "bg-emerald-50" },
                        { label: "Squad Velocity", value: "48 packs", change: "Hot", icon: TrendingUp, color: "text-indigo-600", bg: "bg-indigo-50" },
                        { label: "Check-in Health", value: "98.2%", change: "Stable", icon: Activity, color: "text-orange-600", bg: "bg-orange-50" },
                    ].map((stat, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="p-6 border border-gray-100 rounded-[24px] bg-white/60 backdrop-blur-md shadow-sm hover:shadow-xl hover:translate-y-[-2px] transition-all cursor-default group"
                        >
                            <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center mb-5 shadow-sm border border-transparent group-hover:border-gray-100 transition-all", stat.bg)}>
                                <stat.icon className={cn("w-5 h-5", stat.color)} />
                            </div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1.5">{stat.label}</p>
                            <div className="flex items-end gap-2">
                                <span className="text-2xl font-black text-gray-900 tracking-tighter">{stat.value}</span>
                                <span className={cn("text-[9px] font-black mb-1 px-1.5 py-0.5 rounded-md",
                                    stat.change.startsWith("+") ? "text-green-600 bg-green-50" : "text-blue-600 bg-blue-50"
                                )}>{stat.change}</span>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Second Row: Detailed Insights */}
                <div className="grid grid-cols-12 gap-5 relative z-10">
                    {/* Sales Velocity Chart Placeholder */}
                    <div className="col-span-8 p-8 border border-gray-100 rounded-[32px] bg-white/60 backdrop-blur-md shadow-sm">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-sm font-black text-gray-900 tracking-tight flex items-center gap-2">
                                    <BarChart2 className="w-4 h-4 text-blue-600" />
                                    Sales Velocity
                                </h3>
                                <p className="text-[10px] text-gray-400 font-bold mt-0.5 uppercase tracking-widest">Last 14 Days Registration Flow</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Individual</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-indigo-500" />
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Squads</span>
                                </div>
                            </div>
                        </div>

                        {/* Jagged Line Mockup */}
                        <div className="relative h-[200px] flex items-end justify-between px-2 overflow-hidden group">
                            <svg viewBox="0 0 800 200" className="absolute inset-0 w-full h-full overflow-visible">
                                <defs>
                                    <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
                                        <stop offset="0%" style={{ stopColor: '#3b82f6', stopOpacity: 0.15 }} />
                                        <stop offset="100%" style={{ stopColor: '#3b82f6', stopOpacity: 0 }} />
                                    </linearGradient>
                                </defs>
                                <motion.path
                                    initial={{ pathLength: 0, opacity: 0 }}
                                    animate={{ pathLength: 1, opacity: 1 }}
                                    transition={{ duration: 1.5, ease: "easeInOut" }}
                                    d="M0,150 L50,130 L100,160 L150,80 L200,110 L250,40 L300,90 L350,60 L400,100 L450,30 L500,70 L550,50 L600,120 L650,40 L700,60 L750,20 L800,40"
                                    fill="none"
                                    stroke="#3b82f6"
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                                <path
                                    d="M0,150 L50,130 L100,160 L150,80 L200,110 L250,40 L300,90 L350,60 L400,100 L450,30 L500,70 L550,50 L600,120 L650,40 L700,60 L750,20 L800,40 L800,200 L0,200 Z"
                                    fill="url(#grad)"
                                />
                            </svg>

                            {/* X-Axis labels */}
                            <div className="absolute bottom-[-20px] left-0 w-full flex justify-between px-2 opacity-30 text-[9px] font-black uppercase tracking-widest">
                                <span>01 Jan</span>
                                <span>05 Jan</span>
                                <span>10 Jan</span>
                                <span>Today</span>
                            </div>
                        </div>
                    </div>

                    {/* Conversion Funnel */}
                    <div className="col-span-4 p-8 border border-gray-100 rounded-[32px] bg-white/60 backdrop-blur-md shadow-sm space-y-6">
                        <header>
                            <h3 className="text-sm font-black text-gray-900 tracking-tight flex items-center gap-2">
                                <Target className="w-4 h-4 text-orange-600" />
                                Growth Funnel
                            </h3>
                            <p className="text-[10px] text-gray-400 font-bold mt-0.5 uppercase tracking-widest">Conversion Efficiency</p>
                        </header>

                        <div className="space-y-5">
                            {[
                                { label: "Views", value: "12,402", percent: 100, color: "bg-gray-100" },
                                { label: "Selection", value: "4,280", percent: 72, color: "bg-blue-100" },
                                { label: "Checkout", value: "1,820", percent: 45, color: "bg-indigo-100" },
                                { label: "Confirmed", value: "1,482", percent: 34, color: "bg-emerald-100" },
                            ].map((step, i) => (
                                <div key={i} className="space-y-1.5">
                                    <div className="flex justify-between items-end">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">{step.label}</span>
                                        <span className="text-[11px] font-black text-gray-900">{step.value}</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-gray-50 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${step.percent}%` }}
                                            transition={{ duration: 1, delay: i * 0.1 }}
                                            className={cn("h-full rounded-full opacity-80", step.color.replace('bg-', 'bg-'))}
                                            style={{ backgroundColor: step.color === 'bg-blue-100' ? '#3b82f6' : step.color === 'bg-indigo-100' ? '#6366f1' : step.color === 'bg-emerald-100' ? '#10b981' : '#e5e7eb' }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Third Row: Distribution & Question Analytics */}
                <div className="grid grid-cols-12 gap-5 relative z-10">
                    {/* Segment Distribution */}
                    <div className="col-span-12 md:col-span-5 p-8 border border-gray-100 rounded-[32px] bg-white/60 backdrop-blur-md shadow-sm">
                        <header className="flex justify-between items-start mb-8">
                            <div>
                                <h3 className="text-sm font-black text-gray-900 tracking-tight flex items-center gap-2">
                                    <PieChartIcon className="w-4 h-4 text-purple-600" />
                                    Segment Distribution
                                </h3>
                                <p className="text-[10px] text-gray-400 font-bold mt-0.5 uppercase tracking-widest">Guest Roles as defined by Smart Segments</p>
                            </div>
                            <button className="text-[var(--brand-blue)] text-[9px] font-black uppercase tracking-widest hover:underline">View All</button>
                        </header>

                        <div className="space-y-4">
                            {[
                                { label: "General Attendees", count: "1,152", percent: 78, color: "bg-blue-500" },
                                { label: "VIP Guests", count: "115", percent: 12, color: "bg-purple-500" },
                                { label: "Verified Speakers", count: "12", percent: 4, color: "bg-emerald-500" },
                                { label: "Partners & Staff", count: "203", percent: 6, color: "bg-amber-500" },
                            ].map((seg, i) => (
                                <div key={i} className="group cursor-pointer">
                                    <div className="flex justify-between items-end mb-1.5">
                                        <span className="text-[10px] font-black text-gray-600 group-hover:text-gray-900 transition-colors">{seg.label}</span>
                                        <span className="text-[10px] font-bold text-gray-400">{seg.count}</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-gray-50 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${seg.percent}%` }}
                                            transition={{ duration: 1, delay: i * 0.1 }}
                                            className={cn("h-full rounded-full transition-all group-hover:opacity-100 opacity-70", seg.color)}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Question Analytics */}
                    <div className="col-span-12 md:col-span-7 p-8 border border-gray-100 rounded-[32px] bg-white text-gray-900 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                            <BarChart2 className="w-32 h-32" />
                        </div>

                        <header className="flex justify-between items-start mb-8 relative z-10">
                            <div>
                                <h3 className="text-sm font-black tracking-tight flex items-center gap-2">
                                    <Activity className="w-4 h-4 text-orange-500" />
                                    Custom Question Insights
                                </h3>
                                <p className="text-[10px] text-gray-400 font-bold mt-0.5 uppercase tracking-widest">Based on field: "How did you hear about us?"</p>
                            </div>
                            <div className="bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100 text-[9px] font-black uppercase tracking-widest text-gray-500">
                                4 Questions Total
                            </div>
                        </header>

                        <div className="grid grid-cols-2 gap-8 relative z-10">
                            <div className="space-y-5">
                                {[
                                    { label: "Social Media", percent: 42, color: "bg-blue-600" },
                                    { label: "Personal Invite", percent: 31, color: "bg-emerald-600" },
                                    { label: "Online Search", percent: 15, color: "bg-gray-900" },
                                    { label: "Other", percent: 12, color: "bg-gray-400" },
                                ].map((ans, i) => (
                                    <div key={i} className="flex items-center gap-4">
                                        <div className="w-10 text-[11px] font-black tracking-tighter text-blue-600 text-right">{ans.percent}%</div>
                                        <div className="flex-1 space-y-1">
                                            <div className="text-[9px] font-black uppercase tracking-widest text-gray-400">{ans.label}</div>
                                            <div className="h-1 w-full bg-gray-50 rounded-full">
                                                <div className={cn("h-full rounded-full", ans.color)} style={{ width: `${ans.percent}%` }} />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="bg-gray-50 rounded-[24px] p-6 flex flex-col justify-center border border-gray-100">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2">Pro Insight</h4>
                                <p className="text-xs font-bold text-gray-600 leading-relaxed italic">
                                    "Your Personal Invite conversion is 2x higher than Social Media. Direct outreach is your winning channel."
                                </p>
                                <button className="flex items-center gap-1.5 text-[var(--brand-blue)] text-[9px] font-black uppercase tracking-widest mt-4 hover:gap-2 transition-all">
                                    Detailed Drill-down <ArrowRight className="w-3 h-3" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Row: Engagement & Status */}
                <div className="grid grid-cols-2 gap-5 relative z-10">
                    <div className="p-8 border border-gray-100 rounded-[32px] bg-white/60 backdrop-blur-md shadow-sm flex items-center justify-between group">
                        <div className="flex items-center gap-5">
                            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center border border-blue-100 group-hover:scale-110 transition-transform">
                                <Zap className="w-7 h-7 text-blue-600" />
                            </div>
                            <div>
                                <h4 className="font-black text-gray-900 tracking-tight">Active Automation Flow</h4>
                                <p className="text-xs text-gray-400 font-bold mt-0.5">Invite reminders sent every 24h.</p>
                            </div>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-xl font-black text-gray-900 leading-none">Healthy</span>
                            <span className="text-[9px] font-black uppercase tracking-widest text-green-600 mt-1">Operational</span>
                        </div>
                    </div>

                    <div className="p-8 bg-gray-900 rounded-[32px] text-white flex items-center justify-between relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/30 to-violet-600/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative z-10">
                            <h3 className="text-lg font-black tracking-tight flex items-center gap-3">
                                <ArrowUpRight className="w-5 h-5 text-blue-400" />
                                Optimization Tip
                            </h3>
                            <p className="text-white/50 text-xs mt-1 font-medium">Your squad invitations are converting 20% faster than individuals. Consider a featured "Squad Pack".</p>
                        </div>
                        <button className="relative z-10 bg-white/10 backdrop-blur-md border border-white/20 text-white px-7 py-3 rounded-2xl font-black text-xs hover:bg-white hover:text-gray-900 transition-all shadow-lg active:scale-95">
                            Learn More
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
