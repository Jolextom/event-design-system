"use client";

import React, { useState, useEffect } from "react";
import { Plus, Check, Users, Activity, MoreHorizontal, Terminal, Loader2, RefreshCw, Scan, Link2, Copy, Ban } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@supabase/supabase-js";
import { useParams } from "next/navigation";
import { Staff, EventCollaborator } from "../types"; // Adjust path if needed
import { AddStaffModal } from "./registry/AddStaffModal";
import { AddCollaboratorModal } from "./registry/AddCollaboratorModal";
import { deleteStaffMember } from "@/app/actions";
import Link from "next/link";

export function OperationsView() {
    const params = useParams();
    const tag = params?.tag as string;

    const [event, setEvent] = useState<any>(null);
    const [staff, setStaff] = useState<Staff[]>([]);
    const [collaborators, setCollaborators] = useState<EventCollaborator[]>([]);
    const [referralCounts, setReferralCounts] = useState<Record<string, number>>({});
    const [checkInLogs, setCheckInLogs] = useState<any[]>([]);
    const [stats, setStats] = useState({ totalCheckedIn: 0, capacity: 0 });
    const [usherStats, setUsherStats] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isAddCollaboratorModalOpen, setIsAddCollaboratorModalOpen] = useState(false);
    const [copiedCollaboratorId, setCopiedCollaboratorId] = useState<string | null>(null);
    const [copiedStaffId, setCopiedStaffId] = useState<string | null>(null);

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

        // 2b. Get Collaborators
        const { data: collaboratorData } = await supabase
            .from("event_collaborators")
            .select("*")
            .eq("event_id", eventData.id)
            .order("created_at", { ascending: false });

        if (collaboratorData) setCollaborators(collaboratorData as EventCollaborator[]);

        // 3. Get Attendees (for stats and feed) - Only registered guests
        const { data: attendeesData } = await supabase
            .from("attendees")
            .select("id, first_name, last_name, check_in, check_in_time, email_status, checked_in_by_staff_id, checked_in_by, referred_by_collaborator_id")
            .eq("event_id", eventData.id)
            .neq("email_status", "invited");

        if (attendeesData) {
            // Referral Counts
            const rCounts: Record<string, number> = {};
            attendeesData.forEach(a => {
                if (a.referred_by_collaborator_id) {
                    rCounts[a.referred_by_collaborator_id] = (rCounts[a.referred_by_collaborator_id] || 0) + 1;
                }
            });
            setReferralCounts(rCounts);

            // Stats
            const checkedIn = attendeesData.filter(a => a.check_in).length;
            setStats({
                totalCheckedIn: checkedIn,
                capacity: attendeesData.length
            });

            // Usher Stats
            const uStats: Record<string, number> = {};
            attendeesData.forEach(a => {
                if (a.check_in && a.checked_in_by_staff_id) {
                    uStats[a.checked_in_by_staff_id] = (uStats[a.checked_in_by_staff_id] || 0) + 1;
                }
            });
            setUsherStats(uStats);

            // Live Feed (Latest 5 check-ins)
            const logs = attendeesData
                .filter(a => a.check_in && a.check_in_time)
                .sort((a, b) => new Date(b.check_in_time).getTime() - new Date(a.check_in_time).getTime())
                .slice(0, 5)
                .map(a => ({
                    id: a.id,
                    text: `${a.first_name} ${a.last_name} checked in ${a.checked_in_by ? `by ${a.checked_in_by}` : ''}`,
                    time: getTimeAgo(a.check_in_time),
                    dot: "bg-green-500"
                }));

            setCheckInLogs(logs);
        }

        setLoading(false);
    };

    const updateCollaboratorScope = async (id: string, viewScope: "own_only" | "full_highlighted") => {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        await supabase.from("event_collaborators").update({ view_scope: viewScope }).eq("id", id);
        setCollaborators(prev => prev.map(c => (c.id === id ? { ...c, view_scope: viewScope } : c)));
    };

    const revokeCollaborator = async (id: string) => {
        if (!confirm("Revoke this collaborator's access? They will no longer be able to log in or attribute new registrations. Past attribution is kept.")) return;
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        await supabase.from("event_collaborators").update({ status: "revoked" }).eq("id", id);
        setCollaborators(prev => prev.map(c => (c.id === id ? { ...c, status: "revoked" } : c)));
    };

    const copyReferralLink = async (collaborator: EventCollaborator) => {
        const link = `${window.location.origin}/${tag}?ref=${collaborator.referral_code}`;
        await navigator.clipboard.writeText(link);
        setCopiedCollaboratorId(collaborator.id);
        setTimeout(() => setCopiedCollaboratorId(null), 1500);
    };

    const copyStaffCode = async (staffId: string, code: string) => {
        await navigator.clipboard.writeText(code);
        setCopiedStaffId(staffId);
        setTimeout(() => setCopiedStaffId(null), 1500);
    };

    const handleDeleteStaff = async (staffId: string, name: string) => {
        if (!confirm(`Are you sure you want to remove ${name} from the staff list?`)) return;
        const res = await deleteStaffMember(staffId);
        if (!res.success) {
            alert(res.error || "Failed to remove staff member.");
        } else {
            setStaff((prev) => prev.filter((s) => s.id !== staffId));
        }
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
            <div className="max-w-5xl px-4 sm:px-6 md:px-10 py-6 md:py-8 mx-auto space-y-8 pb-24">
                {/* Header Strip */}
                <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-6">
                    <div>
                        <h2 className="text-xl sm:text-2xl font-black tracking-tight text-gray-900">Event Day</h2>
                        <p className="text-xs sm:text-sm text-gray-400 mt-1 font-bold">
                            Manage door staff, access codes, and track live check-ins.
                        </p>
                    </div>

                    <div className="flex items-center flex-wrap gap-2.5">
                        <Link
                            href={`/events/${tag}/checkin`}
                            className="inline-flex items-center gap-2 bg-[var(--brand-blue)] text-white px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl text-xs font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95"
                        >
                            <Scan className="w-4 h-4" /> Launch Check-in
                        </Link>
                        <button
                            onClick={() => setIsAddCollaboratorModalOpen(true)}
                            className="inline-flex items-center gap-2 bg-white border border-gray-200 text-gray-900 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl text-xs font-black hover:bg-gray-50 transition-all shadow-xs active:scale-95"
                        >
                            <Link2 className="w-4 h-4" /> Add Collaborator
                        </button>
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="inline-flex items-center gap-2 bg-gray-900 text-white px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl text-xs font-black hover:bg-black transition-all shadow-lg shadow-gray-200 active:scale-95"
                        >
                            <Plus className="w-4 h-4" /> Add Member
                        </button>
                    </div>
                </header>

                {/* Main Responsive Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
                    {/* Left Column: Team Presence & Collaborators & Live Feed */}
                    <div className="col-span-1 lg:col-span-8 space-y-8">
                        {/* Team Section */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">
                                    Team Presence
                                </h3>
                                <span className="text-[10px] font-bold text-gray-400">{staff.length} Members</span>
                            </div>

                            {loading ? (
                                <div className="flex justify-center py-16">
                                    <Loader2 className="w-8 h-8 animate-spin text-gray-200" />
                                </div>
                            ) : staff.length === 0 ? (
                                <div className="text-center py-14 px-4 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                                    <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                                    <h4 className="text-sm font-black text-gray-900 mb-1">No team members added yet</h4>
                                    <p className="text-xs text-gray-400 font-bold max-w-xs mx-auto mb-5">
                                        Add door staff to generate 6-digit access codes for the mobile check-in app.
                                    </p>
                                    <button
                                        onClick={() => setIsAddModalOpen(true)}
                                        className="px-5 py-2.5 bg-white border border-gray-200 shadow-xs rounded-xl text-xs font-black text-gray-900 hover:bg-gray-50 transition-colors"
                                    >
                                        Add First Member
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-3">
                                    {staff.map((member) => (
                                        <div
                                            key={member.id}
                                            className="p-4 sm:p-5 border border-gray-100 rounded-2xl sm:rounded-[24px] bg-white hover:border-[var(--brand-blue)]/30 transition-all shadow-xs hover:shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                                        >
                                            {/* Staff Avatar & Info */}
                                            <div className="flex items-center gap-3.5 min-w-0">
                                                <div className="relative shrink-0">
                                                    <div className="w-11 h-11 sm:w-12 sm:h-12 bg-gray-100 rounded-2xl flex items-center justify-center text-[11px] font-black text-gray-500 border border-gray-200 uppercase">
                                                        {member.first_name.charAt(0)}
                                                        {member.last_name.charAt(0)}
                                                    </div>
                                                    <div
                                                        className={cn(
                                                            "absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white",
                                                            member.status === "online" ? "bg-green-500" : "bg-gray-300"
                                                        )}
                                                    />
                                                </div>

                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <h4 className="text-sm sm:text-base font-black text-gray-900 tracking-tight truncate">
                                                            {member.first_name} {member.last_name}
                                                        </h4>
                                                        <span className="text-[9px] font-black px-2 py-0.5 bg-gray-100 text-gray-600 rounded uppercase border border-gray-200">
                                                            {member.role}
                                                        </span>
                                                    </div>
                                                    <p className="text-[11px] font-bold text-gray-400 mt-0.5">
                                                        {member.status === "online" ? (
                                                            <span className="text-green-600">Active now • {member.current_station || "Door Desk"}</span>
                                                        ) : (
                                                            <span>
                                                                <span className="text-gray-500">Offline</span>
                                                                <span className="text-gray-300"> • Last active </span>
                                                                <span className="text-gray-400">
                                                                    {member.last_active ? getTimeAgo(member.last_active) : "Never"}
                                                                </span>
                                                            </span>
                                                        )}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Staff Access Code Badge & Actions */}
                                            <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                                                {/* Prominent Access Code (Always visible on all screens!) */}
                                                <button
                                                    onClick={() => copyStaffCode(member.id, member.access_code)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-50 hover:bg-blue-50/60 border border-gray-200 hover:border-blue-200 transition-all text-xs font-mono font-bold text-gray-900"
                                                    title="Click to copy access code"
                                                >
                                                    <span className="text-[9px] font-black uppercase text-gray-400 font-sans">
                                                        Code
                                                    </span>
                                                    <span className="tracking-wider text-sm">{member.access_code}</span>
                                                    {copiedStaffId === member.id ? (
                                                        <span className="text-[9px] font-sans font-bold text-green-600 flex items-center gap-0.5 ml-1">
                                                            <Check className="w-3 h-3 text-green-600 shrink-0" />
                                                            Copied!
                                                        </span>
                                                    ) : (
                                                        <Copy className="w-3 h-3 text-gray-400 ml-1 shrink-0" />
                                                    )}
                                                </button>

                                                {/* Checked In Count */}
                                                <div className="text-center shrink-0 min-w-[50px]">
                                                    <div className="text-[9px] font-black uppercase tracking-wider text-gray-400">
                                                        Scanned
                                                    </div>
                                                    <div className="font-mono text-sm sm:text-base font-black text-[var(--brand-blue)] leading-tight">
                                                        {usherStats[member.id] || 0}
                                                    </div>
                                                </div>

                                                {/* Remove Staff */}
                                                <button
                                                    onClick={() =>
                                                        handleDeleteStaff(
                                                            member.id,
                                                            `${member.first_name} ${member.last_name}`
                                                        )
                                                    }
                                                    className="p-2 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all shrink-0"
                                                    title="Remove staff member"
                                                >
                                                    <Ban className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Collaborators Section */}
                        <div className="space-y-4 pt-2">
                            <div className="flex items-center justify-between">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">
                                    Collaborators & Referrals
                                </h3>
                                <span className="text-[10px] font-bold text-gray-400">{collaborators.length} People</span>
                            </div>

                            {collaborators.length === 0 ? (
                                <div className="text-center py-14 px-4 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                                    <Link2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                                    <h4 className="text-sm font-black text-gray-900 mb-1">No collaborators yet</h4>
                                    <p className="text-xs text-gray-400 font-bold max-w-xs mx-auto mb-5">
                                        Give partners a personal referral link and a scoped view of registrants.
                                    </p>
                                    <button
                                        onClick={() => setIsAddCollaboratorModalOpen(true)}
                                        className="px-5 py-2.5 bg-white border border-gray-200 shadow-xs rounded-xl text-xs font-black text-gray-900 hover:bg-gray-50 transition-colors"
                                    >
                                        Add First Collaborator
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-3">
                                    {collaborators.map((collaborator) => (
                                        <div
                                            key={collaborator.id}
                                            className={cn(
                                                "p-4 sm:p-5 border rounded-2xl sm:rounded-[24px] bg-white transition-all shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 group",
                                                collaborator.status === "revoked"
                                                    ? "border-gray-100 opacity-50"
                                                    : "border-gray-100 hover:border-[var(--brand-blue)]/30"
                                            )}
                                        >
                                            <div className="flex items-center gap-3.5 min-w-0">
                                                <div className="w-11 h-11 sm:w-12 sm:h-12 bg-gray-100 rounded-2xl flex items-center justify-center text-[11px] font-black text-gray-400 border border-gray-200 uppercase shrink-0">
                                                    {collaborator.first_name.charAt(0)}
                                                    {collaborator.last_name.charAt(0)}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <h4 className="text-sm sm:text-base font-black text-gray-900 tracking-tight truncate">
                                                            {collaborator.first_name} {collaborator.last_name}
                                                        </h4>
                                                        {collaborator.status === "revoked" && (
                                                            <span className="text-[8px] font-black px-1.5 py-0.5 bg-red-50 text-red-400 rounded uppercase border border-red-100">
                                                                Revoked
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-[10px] font-bold text-gray-400 mt-0.5">
                                                        {referralCounts[collaborator.id] || 0} referred
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                                                <select
                                                    value={collaborator.view_scope}
                                                    onChange={(e) =>
                                                        updateCollaboratorScope(
                                                            collaborator.id,
                                                            e.target.value as "own_only" | "full_highlighted"
                                                        )
                                                    }
                                                    disabled={collaborator.status === "revoked"}
                                                    className="h-9 px-3 rounded-xl bg-gray-50 border border-gray-100 text-[10px] font-black text-gray-600 outline-none appearance-none"
                                                >
                                                    <option value="full_highlighted">Full list, highlighted</option>
                                                    <option value="own_only">Own referrals only</option>
                                                </select>
                                                <button
                                                    onClick={() => copyReferralLink(collaborator)}
                                                    className="p-2.5 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-all"
                                                    title="Copy referral link"
                                                >
                                                    {copiedCollaboratorId === collaborator.id ? (
                                                        <Check className="w-4 h-4 text-green-600" />
                                                    ) : (
                                                        <Copy className="w-4 h-4" />
                                                    )}
                                                </button>
                                                {collaborator.status === "active" && (
                                                    <button
                                                        onClick={() => revokeCollaborator(collaborator.id)}
                                                        className="p-2.5 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                                        title="Revoke access"
                                                    >
                                                        <Ban className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Live Check-In Feed */}
                        <div className="space-y-4 pt-2">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">
                                Live Check-in Activity
                            </h3>
                            {checkInLogs.length === 0 ? (
                                <p className="text-xs text-center text-gray-400 font-bold py-6 bg-gray-50 rounded-2xl border border-gray-100">
                                    No check-ins yet today. Scanned guests will appear here live.
                                </p>
                            ) : (
                                <div className="space-y-4 pl-4 border-l-2 border-gray-100">
                                    {checkInLogs.map((log) => (
                                        <div key={log.id} className="relative pl-5">
                                            <div
                                                className={cn(
                                                    "absolute -left-[23px] top-1.5 w-3 h-3 rounded-full border-2 border-white",
                                                    log.dot
                                                )}
                                            />
                                            <div className="flex justify-between items-start gap-3">
                                                <p className="text-xs font-bold text-gray-700 leading-relaxed">
                                                    {log.text}
                                                </p>
                                                <span className="text-[9px] font-black text-gray-400 uppercase whitespace-nowrap">
                                                    {log.time}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Event Overview Card */}
                    <div className="col-span-1 lg:col-span-4 space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">
                                Event Progress
                            </h3>
                        </div>

                        {/* Black Stat Card */}
                        <div className="p-6 sm:p-8 bg-gray-900 rounded-3xl sm:rounded-[32px] text-white shadow-xl shadow-gray-200 flex flex-col items-center text-center relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                                <Users className="w-20 h-20" />
                            </div>

                            <div className="relative z-10 w-full">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                                    Total Checked In
                                </span>
                                <div className="text-5xl sm:text-6xl font-black mt-3 tracking-tight font-mono">
                                    {stats.totalCheckedIn}
                                </div>
                                <div className="text-xs font-bold text-gray-400 mt-1">
                                    out of {stats.capacity} registered guests
                                </div>

                                <div className="mt-6 w-full bg-gray-800 rounded-full h-2.5 overflow-hidden">
                                    <div
                                        className="bg-green-500 h-full rounded-full transition-all duration-1000"
                                        style={{
                                            width: `${
                                                stats.capacity > 0
                                                    ? Math.min(100, (stats.totalCheckedIn / stats.capacity) * 100)
                                                    : 0
                                            }%`,
                                        }}
                                    />
                                </div>

                                <div className="mt-4 flex items-center justify-between text-[11px] font-bold text-gray-400 px-1">
                                    <span>
                                        {stats.capacity > 0
                                            ? Math.round((stats.totalCheckedIn / stats.capacity) * 100)
                                            : 0}
                                        % Turnout
                                    </span>
                                    <span>{Math.max(0, stats.capacity - stats.totalCheckedIn)} Remaining</span>
                                </div>
                            </div>
                        </div>

                        {/* Quick Check-in Launcher Card */}
                        <div className="p-5 bg-blue-50/60 rounded-3xl border border-blue-100 space-y-3">
                            <div className="flex items-center gap-2 text-blue-700 font-black text-xs">
                                <Scan className="w-4 h-4" />
                                <span>Check-In Desk App</span>
                            </div>
                            <p className="text-xs text-gray-600 font-bold leading-relaxed">
                                Share the link below with your usher team. They just enter their 6-digit access code to start scanning.
                            </p>
                            <Link
                                href={`/events/${tag}/checkin`}
                                target="_blank"
                                className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs py-3 px-4 rounded-xl shadow-md shadow-blue-200 transition-all"
                            >
                                Open Desk in New Tab &rarr;
                            </Link>
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

            <AddCollaboratorModal
                isOpen={isAddCollaboratorModalOpen}
                onClose={() => setIsAddCollaboratorModalOpen(false)}
                currentEventId={event?.id}
                eventTag={tag}
                onSuccess={fetchData}
            />
        </div>
    );
}
