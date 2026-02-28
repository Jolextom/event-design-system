"use client";

import React from "react";
import {
    Settings as SettingsIcon,
    Globe,
    Shield,
    Bell,
    Palette,
    FileText,
    UserCircle,
    Save
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export function SettingsView() {
    return (
        <div className="h-full overflow-y-auto bg-white custom-scrollbar">
            <div className="p-8 md:p-10 space-y-10 max-w-4xl mx-auto relative pb-24">
                {/* Header */}
                <header className="flex items-end justify-between relative z-10">
                    <div>
                        <div className="flex items-center gap-2.5 mb-2.5">
                            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-[var(--brand-blue)] opacity-70">Platform Controls</span>
                            <div className="h-[1px] w-8 bg-gray-100" />
                        </div>
                        <h1 className="text-2xl font-black tracking-tight text-gray-900 leading-none">Settings</h1>
                        <p className="text-sm text-gray-400 mt-2 font-bold opacity-80">Manage your workspace and event metadata.</p>
                    </div>
                    <button className="bg-gray-900 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-gray-200 hover:bg-black transition-all flex items-center gap-2">
                        <Save className="w-3.5 h-3.5" />
                        Save Changes
                    </button>
                </header>

                <div className="grid grid-cols-1 gap-8 relative z-10">
                    {/* General Settings Section */}
                    <div className="space-y-6">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 border-b border-gray-50 pb-4">General Configuration</h3>

                        <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-gray-900 uppercase tracking-widest">Workspace Name</label>
                                <input
                                    type="text"
                                    defaultValue="Global Design Lab"
                                    className="w-full px-4 py-3 bg-gray-50/50 border border-gray-100/50 rounded-2xl text-[13px] font-bold text-gray-900 focus:bg-white focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500/20 outline-none transition-all shadow-inner"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[11px] font-black text-gray-900 uppercase tracking-widest">Public Domain</label>
                                <div className="flex items-center">
                                    <span className="px-4 py-3 bg-gray-100/80 border border-r-0 border-gray-100/50 rounded-l-2xl text-[11px] font-black text-gray-400 uppercase tracking-tight">{process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, '') || 'localhost:3000/'}</span>
                                    <input
                                        type="text"
                                        defaultValue="annual-gala"
                                        className="flex-1 px-4 py-3 bg-gray-50/50 border border-gray-100/50 rounded-r-2xl text-[13px] font-bold text-gray-900 focus:bg-white focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500/20 outline-none transition-all shadow-inner"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Branding & Aesthetic */}
                    <div className="p-8 border border-gray-100 rounded-[32px] bg-gray-50/30 space-y-8">
                        <div className="flex items-center gap-3">
                            <Palette className="w-5 h-5 text-[var(--brand-blue)]" />
                            <h3 className="text-sm font-black text-gray-900 tracking-tight">Event Aesthetic</h3>
                        </div>

                        <div className="grid grid-cols-3 gap-6">
                            <div className="space-y-4">
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 block">Primary Accent</span>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-[var(--brand-blue)] shadow-lg shadow-blue-500/20" />
                                    <span className="text-xs font-black text-gray-900 font-mono">#3B82F6</span>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 block">Logo Rendering</span>
                                <div className="w-32 h-12 bg-white rounded-xl border border-gray-100 flex items-center justify-center">
                                    <UserCircle className="w-6 h-6 text-gray-200" />
                                </div>
                            </div>
                            <div className="space-y-4">
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 block">Glass Intensity</span>
                                <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                                    <div className="h-full w-[80%] bg-[var(--brand-blue)] rounded-full" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Toggle Settings */}
                    <div className="grid grid-cols-2 gap-6">
                        {[
                            { label: "Public Attendee Wall", desc: "Allow attendees to post on the hub.", icon: Globe, active: true },
                            { label: "Squad Pass Logic", desc: "Enable multi-guest registration forms.", icon: Shield, active: true },
                            { label: "Email Notifications", desc: "Send automated guest communications.", icon: Bell, active: true },
                            { label: "Analytics Privacy", desc: "Obfuscate individual sales data in exports.", icon: FileText, active: false },
                        ].map((item, i) => (
                            <div key={i} className="p-5 border border-gray-100 rounded-2xl flex items-center justify-between hover:border-gray-200 transition-all cursor-pointer">
                                <div className="flex items-center gap-4">
                                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", item.active ? "bg-blue-50 text-blue-600" : "bg-gray-50 text-gray-400")}>
                                        <item.icon className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-black text-gray-900 tracking-tight">{item.label}</h4>
                                        <p className="text-[10px] text-gray-400 font-bold mt-0.5">{item.desc}</p>
                                    </div>
                                </div>
                                <div className={cn("w-8 h-4.5 rounded-full relative transition-all duration-300 p-0.5", item.active ? "bg-emerald-500" : "bg-gray-200")}>
                                    <div className={cn("w-3.5 h-3.5 bg-white rounded-full shadow-sm transition-all", item.active ? "translate-x-3.5" : "translate-x-0")} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
