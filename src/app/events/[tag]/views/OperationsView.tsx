"use client";

import React, { useState, useEffect } from "react";
import { Plus, Check, Users, Activity, MoreHorizontal, Terminal, Loader2, RefreshCw, Scan } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@supabase/supabase-js";
import { useParams } from "next/navigation";
import { Staff } from "../types"; // Adjust path if needed
import { AddStaffModal } from "./registry/AddStaffModal";
import Link from "next/link";

export function OperationsView() {
    const params = useParams();
    const tag = params?.tag as string;

    const [event, setEvent] = useState<any>(null);
    const [staff, setStaff] = useState<Staff[]>([]);
    const [checkInLogs, setCheckInLogs] = useState<any[]>([]);
    const [stats, setStats] = useState({ totalCheckedIn: 0, capacity: 0 });
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    useEffect(() => {
        if (tag) {
            fetchData();
        }
    }, [tag]);

    const fetchData = async () => {
        setLoading(true);
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        // 1. Get Event ID
        const { data: eventData, error: eventError } = await supabase
            .from("events")
            .select("id, event_title")
            .eq("tag", tag)
            .single();

        if (eventError || !eventData) {
            console.error("Event not found");
            setLoading(false);
            return;
        }

        setEvent(eventData);

        // 2. Get Staff
        const { data: staffData } = await supabase
            .from("staff")
            .select("*")
            .eq("event_id", eventData.id)
            .order("created_at", { ascending: false });

        if (staffData) setStaff(staffData as Staff[]);

        // 3. Get Attendees (for stats and feed) - Only registered guests
        const { data: attendeesData } = await supabase
            .from("attendees")
            .select("id, first_name, last_name, check_in, check_in_time, email_status")
            .eq("event_id", eventData.id)
            .eq("email_status", "registered");

        if (attendeesData) {
            // Stats
            const checkedIn = attendeesData.filter(a => a.check_in).length;
            setStats({
                totalCheckedIn: checkedIn,
                capacity: attendeesData.length
            });

            // Live Feed (Latest 5 check-ins)
            const logs = attendeesData
                .filter(a => a.check_in && a.check_in_time)
                .sort((a, b) => new Date(b.check_in_time).getTime() - new Date(a.check_in_time).getTime())
                .slice(0, 5)
                .map(a => ({
                    id: a.id,
                    text: `${a.first_name} ${a.last_name} checked in`,
                    time: getTimeAgo(a.check_in_time),
                    dot: "bg-green-500"
                }));

            setCheckInLogs(logs);
        }

        setLoading(false);
    };

    const getTimeAgo = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return "Just now";
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        return "Yesterday";
    };

    return (
        <div className="h-full overflow-y-auto bg-white custom-scrollbar">
            <div className="max-w-5xl p-10 mx-auto space-y-10 pb-24">
                <header className="flex justify-between items-end border-b border-gray-100 pb-8 mt-4">
                    <div>
                        <h2 className="text-2xl font-black tracking-tight text-gray-900">Event Day</h2>
                        <p className="text-sm text-gray-400 mt-1.5 font-bold">Manage your team and monitor real-time check-in flow.</p>
                    </div>
                    <div className="flex gap-3">
                        <Link
                            href={`/events/${tag}/checkin`}
                            className="flex items-center gap-2 bg-[var(--brand-blue)] text-white px-6 py-3 rounded-2xl text-xs font-black hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 active:scale-95"
                        >
                            <Scan className="w-4 h-4" /> Launch Check-in
                        </Link>
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-2xl text-xs font-black hover:bg-black transition-all shadow-xl shadow-gray-100 active:scale-95"
                        >
                            <Plus className="w-4 h-4" /> Add Member
                        </button>
                    </div>
                </header>

                <div className="grid grid-cols-12 gap-8">
                    {/* Left: Team List */}
                    <div className="col-span-8 space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Team Presence</h3>
                            <span className="text-[10px] font-bold text-gray-400">{staff.length} Members</span>
                        </div>

                        {loading ? (
                            <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-gray-200" /></div>
                        ) : staff.length === 0 ? (
                            <div className="text-center py-20 bg-gray-50 rounded-[32px] border border-dashed border-gray-200">
                                <Users className="w-10 h-10 text-gray-300 mx-auto mb-4" />
                                <h4 className="text-sm font-black text-gray-900 mb-2">No team members yet</h4>
                                <p className="text-xs text-gray-400 font-bold max-w-xs mx-auto mb-6">Add staff members to generate access codes for the check-in app.</p>
                                <button
                                    onClick={() => setIsAddModalOpen(true)}
                                    className="px-6 py-3 bg-white border border-gray-200 shadow-sm rounded-xl text-xs font-black text-gray-900 hover:bg-gray-50 transition-colors"
                                >
                                    Add First Member
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-3">
                                {staff.map((member) => (
                                    <div key={member.id} className="p-5 border border-gray-100 rounded-[24px] bg-white hover:border-[var(--brand-blue)]/30 transition-all shadow-sm flex items-center justify-between group">
                                        <div className="flex items-center gap-4">
                                            <div className="relative">
                                                <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center text-[11px] font-black text-gray-400 border border-gray-200 uppercase">
                                                    {member.first_name.charAt(0)}{member.last_name.charAt(0)}
                                                </div>
                                                <div className={cn(
                                                    "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white",
                                                    member.status === "online" ? "bg-green-500" : "bg-gray-300"
                                                )} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h4 className="text-base font-black text-gray-900 tracking-tight">{member.first_name} {member.last_name}</h4>
                                                    <span className="text-[8px] font-black px-1.5 py-0.5 bg-gray-50 text-gray-400 rounded uppercase border border-gray-100">{member.role}</span>
                                                </div>
                                                <p className="text-[10px] font-bold text-gray-400 mt-0.5">
                                                    {member.status === 'online' ? (
                                                        <span className="text-green-600">Active now • {member.current_station || 'Roaming'}</span>
                                                    ) : (
                                                        <span>
                                                            <span className="text-gray-500">Offline</span>
                                                            <span className="text-gray-300"> • Last active </span>
                                                            <span className="text-gray-400">{member.last_active ? getTimeAgo(member.last_active) : 'Never'}</span>
                                                        </span>
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right hidden sm:block">
                                                <div className="text-[9px] font-black uppercase tracking-widest text-gray-300">Code</div>
                                                <div className="font-mono text-xs font-bold text-gray-900 tracking-widest">{member.access_code}</div>
                                            </div>
                                            <button className="p-2 text-gray-300 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-all">
                                                <MoreHorizontal className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="pt-6">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1 mb-6">Live Check-in Feed</h3>
                            {checkInLogs.length === 0 ? (
                                <p className="text-xs text-center text-gray-400 font-bold py-4">No recent activity</p>
                            ) : (
                                <div className="space-y-6 pl-4 border-l-2 border-gray-50">
                                    {checkInLogs.map((log) => (
                                        <div key={log.id} className="relative pl-6">
                                            <div className={cn("absolute -left-[27px] top-1.5 w-3 h-3 rounded-full border-2 border-white", log.dot)} />
                                            <div className="flex justify-between items-start">
                                                <p className="text-xs font-bold text-gray-600 leading-relaxed">{log.text}</p>
                                                <span className="text-[9px] font-black text-gray-400 uppercase whitespace-nowrap">{log.time}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Event Overview */}
                    <div className="col-span-4 space-y-6">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Event Overview</h3>

                        <div className="p-6 bg-gray-900 rounded-[32px] text-white shadow-xl shadow-gray-200 flex flex-col items-center text-center relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <Users className="w-16 h-16" />
                            </div>
                            <div className="relative z-10 w-full">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Total Checked In</span>
                                <div className="text-5xl font-black mt-2 tracking-tight">{stats.totalCheckedIn}</div>
                                <div className="text-xs font-bold text-gray-500 mt-1">out of {stats.capacity} guests</div>

                                <div className="mt-6 w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                                    <div
                                        className="bg-green-500 h-full rounded-full transition-all duration-1000"
                                        style={{ width: `${stats.capacity > 0 ? (stats.totalCheckedIn / stats.capacity) * 100 : 0}%` }}
                                    />
                                </div>
                            </div>
                        </div>


                    </div>
                </div>
            </div>

            <AddStaffModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                currentEventId={event?.id}
                onSuccess={fetchData}
            />
        </div>
    );
}
