"use client";

import React from "react";
import { Plus, Calendar, Globe, ChevronRight } from "lucide-react";

export function BasicInfoView() {
    return (
        <div className="h-full overflow-y-auto bg-white">
            <div className="max-w-4xl p-10 mx-auto space-y-10 pb-24">
                <header className="border-b border-gray-100 pb-8 mt-4">
                    <h2 className="text-2xl font-black tracking-tight text-gray-900">Basic Info</h2>
                    <p className="text-sm text-gray-400 mt-1.5 font-bold">The foundation of your event experience.</p>
                </header>

                <div className="space-y-8">
                    {/* Event Banner Placeholder */}
                    <div className="relative h-56 bg-gray-50 rounded-[32px] border-2 border-dashed border-gray-100 flex flex-col items-center justify-center group hover:border-[var(--brand-blue)]/30 transition-all overflow-hidden cursor-pointer shadow-inner">
                        <div className="p-3.5 bg-white rounded-xl shadow-sm mb-3 group-hover:scale-110 transition-transform">
                            <Plus className="w-5 h-5 text-gray-400" />
                        </div>
                        <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Add Event Banner</span>
                        <p className="text-[9px] text-gray-300 mt-1.5 font-bold uppercase tracking-[0.2em]">16:9 ratio recommended</p>
                    </div>

                    <div className="grid grid-cols-1 gap-10">
                        {/* Title Section */}
                        <div className="space-y-3">
                            <label className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-400 block ml-1">Event Title</label>
                            <input
                                placeholder="e.g. Global Design Gala 2026"
                                className="w-full text-3xl font-black tracking-tight text-gray-900 placeholder:text-gray-100 border-none outline-none focus:ring-0 p-0"
                            />
                        </div>

                        {/* Description Section */}
                        <div className="space-y-3">
                            <label className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-400 block ml-1">Description</label>
                            <textarea
                                placeholder="What's this event about?"
                                rows={4}
                                className="w-full text-base font-bold text-gray-600 placeholder:text-gray-100 border-none outline-none focus:ring-0 p-0 resize-none leading-relaxed"
                            />
                        </div>

                        {/* Logistics Grid */}
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-3 p-8 bg-gray-50/40 rounded-[32px] border border-gray-100 group hover:bg-white hover:shadow-2xl hover:shadow-gray-100/40 transition-all cursor-pointer">
                                <label className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-400 flex items-center gap-2">
                                    <Calendar className="w-3.5 h-3.5" /> Date & Time
                                </label>
                                <div className="space-y-1.5">
                                    <div className="text-lg font-black text-gray-900 tracking-tight">March 14, 2026</div>
                                    <div className="text-[11px] font-black text-gray-400 uppercase tracking-widest">09:00 AM • CEST</div>
                                </div>
                            </div>
                            <div className="space-y-3 p-8 bg-gray-50/40 rounded-[32px] border border-gray-100 group hover:bg-white hover:shadow-2xl hover:shadow-gray-100/40 transition-all cursor-pointer">
                                <label className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-400 flex items-center gap-2">
                                    <Globe className="w-3.5 h-3.5" /> Location
                                </label>
                                <div className="space-y-1.5">
                                    <div className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
                                        Virtual <ChevronRight className="w-4 h-4 text-gray-300" />
                                    </div>
                                    <div className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Streamed via EventFlow</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pt-8 flex justify-end">
                    <button className="bg-gray-900 text-white px-10 py-3.5 rounded-2xl font-black text-sm shadow-2xl shadow-gray-200 hover:bg-black hover:scale-[1.02] active:scale-95 transition-all">
                        Save Info
                    </button>
                </div>
            </div>
        </div>
    );
}
