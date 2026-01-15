"use client";

import React, { useState } from "react";
import { Plus, Check, Users, Activity, Shield, MoreHorizontal, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";

export function OperationsView() {
    const [staff, setStaff] = useState([
        { id: "s1", name: "Sarah Chen", role: "Lead Organizer", status: "online", station: "Admin Hub" },
        { id: "s2", name: "Marcus Wright", role: "Check-in Staff", status: "online", station: "Main Entrance" },
        { id: "s3", name: "Elena Rossi", role: "Staff", status: "offline", station: "VIP Lounge" },
    ]);

    const [stations, setStations] = useState([
        { id: "st1", name: "Main Entrance", health: "98%", status: "active" },
        { id: "st2", name: "VIP Lounge", health: "100%", status: "active" },
        { id: "st3", name: "Workshop Hall B", health: "0%", status: "inactive" },
    ]);

    return (
        <div className="h-full overflow-y-auto bg-white custom-scrollbar">
            <div className="max-w-5xl p-10 mx-auto space-y-10 pb-24">
                <header className="flex justify-between items-end border-b border-gray-100 pb-8 mt-4">
                    <div>
                        <h2 className="text-2xl font-black tracking-tight text-gray-900">Operations Hub</h2>
                        <p className="text-sm text-gray-400 mt-1.5 font-bold">Manage your team and monitor real-time check-in flow.</p>
                    </div>
                    <div className="flex gap-3">
                        <button className="flex items-center gap-2 bg-white border border-gray-100 text-gray-600 px-6 py-3 rounded-2xl text-xs font-black hover:bg-gray-50 transition-all shadow-sm active:scale-95">
                            <Terminal className="w-4 h-4" /> Live Logs
                        </button>
                        <button className="flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-2xl text-xs font-black hover:bg-black transition-all shadow-xl shadow-gray-100 active:scale-95">
                            <Plus className="w-4 h-4" /> Add Member
                        </button>
                    </div>
                </header>

                <div className="grid grid-cols-12 gap-8">
                    {/* Left: Team List */}
                    <div className="col-span-8 space-y-6">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Team Presence</h3>
                        <div className="grid grid-cols-1 gap-3">
                            {staff.map((member) => (
                                <div key={member.id} className="p-5 border border-gray-100 rounded-[24px] bg-white hover:border-[var(--brand-blue)]/30 transition-all shadow-sm flex items-center justify-between group">
                                    <div className="flex items-center gap-4">
                                        <div className="relative">
                                            <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center text-[11px] font-black text-gray-400 border border-gray-200 uppercase">
                                                {member.name.charAt(0)}
                                            </div>
                                            <div className={cn(
                                                "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white",
                                                member.status === "online" ? "bg-green-500" : "bg-gray-300"
                                            )} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="text-base font-black text-gray-900 tracking-tight">{member.name}</h4>
                                                <span className="text-[8px] font-black px-1.5 py-0.5 bg-gray-50 text-gray-400 rounded uppercase border border-gray-100">{member.role}</span>
                                            </div>
                                            <p className="text-[10px] font-bold text-gray-400 mt-0.5">Stationed at <span className="text-gray-600">{member.station}</span></p>
                                        </div>
                                    </div>
                                    <button className="p-2 text-gray-300 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-all">
                                        <MoreHorizontal className="w-5 h-5" />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="pt-6">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1 mb-6">Activity Feed</h3>
                            <div className="space-y-6 pl-4 border-l-2 border-gray-50">
                                {[
                                    { time: "2m ago", text: "Sarah Chen assigned VIP Badge to Michael Scott", dot: "bg-blue-500" },
                                    { time: "5m ago", text: "Marcus Wright logged into Main Entrance Station", dot: "bg-green-500" },
                                    { time: "12m ago", text: "Capacity reached 80% in Main Hall", dot: "bg-amber-500" },
                                ].map((log, i) => (
                                    <div key={i} className="relative pl-6">
                                        <div className={cn("absolute -left-[27px] top-1.5 w-3 h-3 rounded-full border-2 border-white", log.dot)} />
                                        <div className="flex justify-between items-start">
                                            <p className="text-xs font-bold text-gray-600 leading-relaxed">{log.text}</p>
                                            <span className="text-[9px] font-black text-gray-400 uppercase whitespace-nowrap">{log.time}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right: Station Status */}
                    <div className="col-span-4 space-y-6">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Live Stations</h3>
                        <div className="space-y-4">
                            {stations.map((station) => (
                                <div key={station.id} className="p-6 bg-gray-50/50 rounded-[32px] border border-gray-100 flex flex-col gap-4">
                                    <div className="flex justify-between items-start">
                                        <div className="p-2.5 bg-white rounded-2xl shadow-sm border border-gray-100">
                                            <Activity className={cn("w-4 h-4", station.status === "active" ? "text-green-500" : "text-gray-300")} />
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-0.5">Uptime</div>
                                            <div className="text-sm font-black text-gray-900">{station.health}</div>
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-black text-gray-900 tracking-tight">{station.name}</h4>
                                        <div className="flex items-center gap-2 mt-2">
                                            <div className={cn("w-1.5 h-1.5 rounded-full", station.status === "active" ? "bg-green-500" : "bg-gray-300")} />
                                            <span className="text-[8px] font-black uppercase tracking-widest text-gray-400">{station.status === "active" ? "Connected" : "Disconnected"}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-8 bg-[var(--brand-blue)] rounded-[32px] text-white space-y-4 shadow-xl shadow-blue-50 relative overflow-hidden group hover:scale-[1.02] transition-all cursor-pointer">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform">
                                <Shield className="w-16 h-16" />
                            </div>
                            <h4 className="text-sm font-black tracking-tight relative z-10">Access Control</h4>
                            <p className="text-[10px] text-blue-100/80 font-bold leading-relaxed relative z-10">Generate QR scanners or secure tokens for your team members.</p>
                            <button className="text-[9px] font-black uppercase tracking-widest bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl transition-all relative z-10">Manage Access</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
