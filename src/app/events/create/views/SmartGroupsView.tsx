"use client";

import React, { useState } from "react";
import { Plus, Filter, Layers, ChevronRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function SmartGroupsView() {
    const [groups, setGroups] = useState([
        { id: "g1", name: "VIP Attendees", rule: "Ticket Type = VIP", count: 12, color: "bg-purple-100 text-purple-700" },
        { id: "g2", name: "Early Signups", rule: "Joined before March 1st", count: 45, color: "bg-blue-100 text-blue-700" },
        { id: "g3", name: "Dietary Requests", rule: "Has Vegan/Allergy Info", count: 8, color: "bg-amber-100 text-amber-700" },
    ]);

    return (
        <div className="h-full overflow-y-auto bg-white custom-scrollbar">
            <div className="max-w-4xl p-10 mx-auto space-y-10 pb-24">
                <header className="flex justify-between items-end border-b border-gray-100 pb-8 mt-4">
                    <div>
                        <h2 className="text-2xl font-black tracking-tight text-gray-900">Guest Groups</h2>
                        <p className="text-sm text-gray-400 mt-1.5 font-bold">Automatically segment your guests with smart rules.</p>
                    </div>
                    <button className="flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-xl text-xs font-black hover:bg-black transition-all shadow-xl shadow-gray-100 active:scale-95">
                        <Plus className="w-4 h-4" /> Create Group
                    </button>
                </header>

                <div className="grid grid-cols-1 gap-4">
                    {groups.map((group) => (
                        <div key={group.id} className="p-7 border border-gray-100 rounded-[24px] bg-white hover:border-[var(--brand-blue)]/40 transition-all group shadow-sm hover:shadow-md cursor-pointer">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-5">
                                    <div className={cn(
                                        "w-12 h-12 rounded-xl flex items-center justify-center border transition-all",
                                        group.color
                                    )}>
                                        <Filter className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-gray-900 tracking-tight">{group.name}</h3>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1 flex items-center gap-2">
                                            <Layers className="w-3 h-3" /> {group.rule}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-8">
                                    <div className="text-right">
                                        <div className="text-xl font-black text-gray-900 tracking-tighter">{group.count}</div>
                                        <div className="text-[9px] font-black uppercase tracking-widest text-gray-400">Guests</div>
                                    </div>
                                    <div className="flex items-center gap-2 p-1 bg-gray-50 rounded-lg border border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button className="p-1.5 text-gray-300 hover:text-gray-900 transition-colors"><ChevronRight className="w-4 h-4" /></button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="bg-blue-50/50 rounded-[32px] p-8 border border-blue-100 flex items-start gap-6 border-dashed">
                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-blue-100 flex items-center justify-center shrink-0">
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
