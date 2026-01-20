"use client";


import { Plus, Calendar, Globe, ChevronRight } from "lucide-react";
import type { Event } from "../types";

interface BasicInfoViewProps {
    event?: Event | null;
}

export function BasicInfoView({ event }: BasicInfoViewProps) {
    return (
        <div className="h-full overflow-y-auto bg-white">
            <div className="max-w-4xl p-10 mx-auto space-y-10 pb-24">
                {!event ? (
                    <div className="text-center text-neutral-400 font-bold py-24 text-lg">No event data found.</div>
                ) : (
                    <>
                        <header className="border-b border-gray-100 pb-8 mt-4">
                            <h2 className="text-2xl font-black tracking-tight text-gray-900">Basic Info</h2>
                            <p className="text-sm text-gray-400 mt-1.5 font-bold">The foundation of your event experience.</p>
                        </header>

                        <div className="space-y-8">
                            {/* Event Banner Placeholder */}
                            <div className="relative h-56 bg-gray-50 rounded-4xl border-2 border-dashed border-gray-100 flex flex-col items-center justify-center group hover:border-(--brand-blue)/30 transition-all overflow-hidden cursor-pointer shadow-inner">
                                <div className="p-3.5 bg-white rounded-2xl shadow-sm mb-3 group-hover:scale-110 transition-transform">
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
                                        value={event.event_title}
                                        readOnly
                                        className="w-full text-3xl font-black tracking-tight text-gray-900 placeholder:text-gray-200 border-none outline-none focus:ring-0 p-0 bg-transparent"
                                    />
                                </div>

                                {/* Description Section */}
                                <div className="space-y-3">
                                    <label className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-400 block ml-1">Description</label>
                                    <textarea
                                        value={event.description}
                                        readOnly
                                        rows={4}
                                        className="w-full text-base font-bold text-gray-600 placeholder:text-gray-200 border-none outline-none focus:ring-0 p-0 resize-none leading-relaxed bg-transparent"
                                    />
                                </div>

                                {/* Logistics Grid */}
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-3 p-8 bg-gray-50/40 rounded-4xl border border-gray-100 group hover:bg-white hover:shadow-2xl hover:shadow-gray-100/40 transition-all cursor-pointer">
                                        <label className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-400 flex items-center gap-2">
                                            <Calendar className="w-3.5 h-3.5" /> Date & Time
                                        </label>
                                        <div className="space-y-1.5">
                                            <div className="text-lg font-black text-gray-900 tracking-tight">{event.start_date ? new Date(event.start_date).toLocaleDateString() : "No date"}</div>
                                            <div className="text-[11px] font-black text-gray-400 uppercase tracking-widest">{event.start_time || "--:--"} • {event.end_time || "--:--"}</div>
                                        </div>
                                    </div>
                                    <div className="space-y-3 p-8 bg-gray-50/40 rounded-4xl border border-gray-100 group hover:bg-white hover:shadow-2xl hover:shadow-gray-100/40 transition-all cursor-pointer">
                                        <label className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-400 flex items-center gap-2">
                                            <Globe className="w-3.5 h-3.5" /> Location
                                        </label>
                                        <div className="space-y-1.5">
                                            <div className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
                                                {event.location || "-"} <ChevronRight className="w-4 h-4 text-gray-300" />
                                            </div>
                                            <div className="text-[11px] font-black text-gray-400 uppercase tracking-widest">{event.tag ? `Tag: ${event.tag}` : ""}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-8 flex justify-end">
                            <button className="bg-gray-900 text-white px-10 py-3.5 rounded-2xl font-black text-sm shadow-2xl shadow-gray-200 hover:bg-black hover:scale-[1.02] active:scale-95 transition-all" disabled>
                                Save Info
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
