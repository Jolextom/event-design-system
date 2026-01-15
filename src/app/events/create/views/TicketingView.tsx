"use client";

import React, { useState } from "react";
import { Plus, Tag, CircleDollarSign, Users, Settings, Trash2, Infinity as InfinityIcon, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export function TicketingView() {
    const [tickets, setTickets] = useState([
        { id: "t1", name: "Early Bird", price: 49, capacity: 100, sold: 45, status: "active" },
        { id: "t2", name: "General Admission", price: 79, capacity: 500, sold: 120, status: "active" },
        { id: "t3", name: "VIP Experience", price: 199, capacity: 50, sold: 12, status: "paused" },
    ]);

    return (
        <div className="h-full overflow-y-auto bg-white custom-scrollbar">
            <div className="max-w-4xl p-10 mx-auto space-y-10 pb-24">
                <header className="flex justify-between items-end border-b border-gray-100 pb-8 mt-4">
                    <div>
                        <h2 className="text-2xl font-black tracking-tight text-gray-900">Ticket Types</h2>
                        <p className="text-sm text-gray-400 mt-1.5 font-bold">Set your pricing strategy and availability.</p>
                    </div>
                    <button className="flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-xl text-xs font-black hover:bg-black transition-all shadow-xl shadow-gray-100 active:scale-95">
                        <Plus className="w-4 h-4" /> Create Ticket
                    </button>
                </header>

                <div className="grid grid-cols-1 gap-4">
                    {tickets.map((ticket) => (
                        <div key={ticket.id} className="p-7 border border-gray-100 rounded-[24px] bg-white hover:border-[var(--brand-blue)]/40 transition-all group shadow-sm hover:shadow-md">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-5">
                                    <div className={cn(
                                        "w-12 h-12 rounded-xl flex items-center justify-center border transition-all",
                                        ticket.status === "active" ? "bg-blue-50 border-blue-100 text-[var(--brand-blue)]" : "bg-gray-50 border-gray-100 text-gray-400"
                                    )}>
                                        <Tag className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-gray-900 tracking-tight">{ticket.name}</h3>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
                                                <CircleDollarSign className="w-3 h-3" /> ${ticket.price}
                                            </span>
                                            <div className="w-1 h-1 bg-gray-200 rounded-full" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
                                                <Users className="w-3 h-3" /> {ticket.sold}/{ticket.capacity} Sold
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6">
                                    <div className="flex flex-col items-end gap-1.5">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                                                {ticket.status === "active" ? "Active" : "Paused"}
                                            </span>
                                            <div
                                                onClick={() => { }}
                                                className={cn(
                                                    "w-8 h-4.5 rounded-full p-0.5 cursor-pointer transition-all duration-300 shadow-inner",
                                                    ticket.status === "active" ? "bg-green-500" : "bg-gray-200"
                                                )}
                                            >
                                                <div className={cn("w-3.5 h-3.5 bg-white rounded-full transition-all shadow-md", ticket.status === "active" ? "translate-x-3" : "translate-x-0")} />
                                            </div>
                                        </div>
                                        <div className="w-24 h-1 bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-[var(--brand-blue)] transition-all duration-1000"
                                                style={{ width: `${(ticket.sold / ticket.capacity) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 p-1 bg-gray-50 rounded-lg border border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button className="p-1.5 text-gray-300 hover:text-gray-900 transition-colors"><Settings className="w-3.5 h-3.5" /></button>
                                        <div className="w-px h-3.5 bg-gray-200" />
                                        <button className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="pt-10 grid grid-cols-2 gap-6">
                    <div className="p-8 bg-gray-50/50 rounded-[32px] border border-gray-100 border-dashed flex flex-col items-center justify-center text-center cursor-pointer group hover:bg-white hover:border-[var(--brand-blue)]/30 transition-all">
                        <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <InfinityIcon className="w-5 h-5 text-gray-400" />
                        </div>
                        <h4 className="text-[11px] font-black uppercase tracking-widest text-gray-900 mb-1">Unlimited Capacity</h4>
                        <p className="text-[10px] text-gray-400 font-bold max-w-[180px]">Remove global sales limits for this event.</p>
                    </div>
                    <div className="p-8 bg-gray-50/50 rounded-[32px] border border-gray-100 border-dashed flex flex-col items-center justify-center text-center cursor-pointer group hover:bg-white hover:border-[var(--brand-blue)]/30 transition-all">
                        <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <Clock className="w-5 h-5 text-gray-400" />
                        </div>
                        <h4 className="text-[11px] font-black uppercase tracking-widest text-gray-900 mb-1">Sale Schedule</h4>
                        <p className="text-[10px] text-gray-400 font-bold max-w-[180px]">Automate when your tickets go live.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
