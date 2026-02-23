"use client";

import React, { useState, useEffect } from "react";
import { Search, UserCheck, Check, ArrowLeft, Loader2, AlertCircle, KeyRound, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@supabase/supabase-js";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

// Types
interface Attendee {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    check_in: boolean;
    check_in_time: string | null;
    pass?: { title: string }[] | null;
}

interface Staff {
    id: string;
    first_name: string;
    last_name: string;
    role: string;
}

interface StoredSession {
    staff: Staff;
    eventId: string;
    eventTitle: string;
}

const STORAGE_KEY = "checkin_session";

export default function CheckInPage() {
    const params = useParams();
    const tag = params?.tag as string;

    // Staff Auth State
    const [staff, setStaff] = useState<Staff | null>(null);
    const [accessCode, setAccessCode] = useState("");
    const [authLoading, setAuthLoading] = useState(true); // Start true to check localStorage
    const [authError, setAuthError] = useState("");

    // Event & Attendees State
    const [event, setEvent] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedPassFilter, setSelectedPassFilter] = useState<string | null>(null);
    const [attendees, setAttendees] = useState<Attendee[]>([]);
    const [filteredAttendees, setFilteredAttendees] = useState<Attendee[]>([]);
    const [uniquePasses, setUniquePasses] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [checkingIn, setCheckingIn] = useState<string | null>(null);
    const [successId, setSuccessId] = useState<string | null>(null);

    // Check localStorage on mount for persisted session
    useEffect(() => {
        const restoreSession = async () => {
            const stored = localStorage.getItem(`${STORAGE_KEY}_${tag}`);
            if (stored) {
                try {
                    const session: StoredSession = JSON.parse(stored);
                    setStaff(session.staff);
                    setEvent({ id: session.eventId, event_title: session.eventTitle, tag });

                    // Update status to online when restoring session
                    const supabase = createClient(
                        process.env.NEXT_PUBLIC_SUPABASE_URL!,
                        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
                    );
                    await supabase
                        .from("staff")
                        .update({ status: "online", last_active: new Date().toISOString() })
                        .eq("id", session.staff.id);

                    fetchAttendees(session.eventId);
                } catch {
                    localStorage.removeItem(`${STORAGE_KEY}_${tag}`);
                }
            }
            setAuthLoading(false);
        };
        restoreSession();
    }, [tag]);

    // Verify staff access code
    const handleLogin = async () => {
        if (!accessCode.trim()) {
            setAuthError("Please enter your access code");
            return;
        }
        setAuthLoading(true);
        setAuthError("");

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        // First get the event
        const { data: eventData } = await supabase
            .from("events")
            .select("id, event_title, tag")
            .eq("tag", tag)
            .single();

        if (!eventData) {
            setAuthError("Event not found");
            setAuthLoading(false);
            return;
        }

        // Check staff access code for this event
        const { data: staffData, error } = await supabase
            .from("staff")
            .select("id, first_name, last_name, role")
            .eq("event_id", eventData.id)
            .eq("access_code", accessCode.trim())
            .single();

        if (error || !staffData) {
            setAuthError("Invalid access code");
            setAuthLoading(false);
            return;
        }

        // Success - persist to localStorage
        const session: StoredSession = {
            staff: staffData,
            eventId: eventData.id,
            eventTitle: eventData.event_title
        };
        localStorage.setItem(`${STORAGE_KEY}_${tag}`, JSON.stringify(session));

        // Update staff status to online
        await supabase
            .from("staff")
            .update({ status: "online", last_active: new Date().toISOString() })
            .eq("id", staffData.id);

        setStaff(staffData);
        setEvent(eventData);
        setAuthLoading(false);

        // Fetch attendees
        fetchAttendees(eventData.id);
    };

    // Keep-alive: Update last_active every 30 seconds while logged in
    useEffect(() => {
        if (!staff) return;

        const updateLastActive = async () => {
            const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            );
            await supabase
                .from("staff")
                .update({ last_active: new Date().toISOString() })
                .eq("id", staff.id);
        };

        const interval = setInterval(updateLastActive, 30000); // 30 seconds
        return () => clearInterval(interval);
    }, [staff]);

    const fetchAttendees = async (eventId: string) => {
        setLoading(true);
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        // Fetch attendees with pass relation - only registered guests
        const { data: attendeesData, error } = await supabase
            .from("attendees")
            .select("id, first_name, last_name, email, check_in, check_in_time, email_status, pass:passes(title)")
            .eq("event_id", eventId)
            .eq("email_status", "registered")
            .order("first_name", { ascending: true });

        if (error) {
            console.error("Error fetching attendees:", error);
        }

        const data = attendeesData || [];

        // Extract unique pass titles
        const passes = Array.from(new Set(data.map(a => a.pass?.[0]?.title || "General Admission"))).sort();
        setUniquePasses(passes);

        setAttendees(data);
        setFilteredAttendees(data);
        setLoading(false);
    };

    // Search and Pass filter
    useEffect(() => {
        let result = attendees;

        // 1. Pass Filter
        if (selectedPassFilter) {
            result = result.filter(a => (a.pass?.[0]?.title || "General Admission") === selectedPassFilter);
        }

        // 2. Search Query
        const query = searchQuery.toLowerCase().trim();
        if (query) {
            result = result.filter(
                (a) =>
                    a.first_name.toLowerCase().includes(query) ||
                    a.last_name.toLowerCase().includes(query) ||
                    a.email.toLowerCase().includes(query)
            );
        }

        setFilteredAttendees(result);
    }, [searchQuery, selectedPassFilter, attendees]);

    const handleCheckIn = async (attendeeId: string) => {
        setCheckingIn(attendeeId);
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const updates = {
            check_in: true,
            check_in_time: new Date().toISOString(),
            checked_in_by_staff_id: staff?.id || null,
            checked_in_by: staff ? `${staff.first_name} ${staff.last_name}` : null
        };

        const { error } = await supabase
            .from("attendees")
            .update(updates)
            .eq("id", attendeeId);

        if (!error) {
            setSuccessId(attendeeId);
            setAttendees((prev) =>
                prev.map((a) =>
                    a.id === attendeeId ? { ...a, ...updates } : a
                )
            );
            setTimeout(() => setSuccessId(null), 2000);
        }
        setCheckingIn(null);
    };

    const handleUndoCheckIn = async (attendeeId: string) => {
        setCheckingIn(attendeeId);
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const updates = {
            check_in: false,
            check_in_time: null,
            checked_in_by_staff_id: null,
            checked_in_by: null
        };

        const { error } = await supabase
            .from("attendees")
            .update(updates)
            .eq("id", attendeeId);

        if (!error) {
            setAttendees((prev) =>
                prev.map((a) =>
                    a.id === attendeeId ? { ...a, ...updates } : a
                )
            );
        }
        setCheckingIn(null);
    };

    const handleLogout = async () => {
        // Set staff status to offline
        if (staff) {
            const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            );
            await supabase
                .from("staff")
                .update({ status: "offline" })
                .eq("id", staff.id);
        }

        localStorage.removeItem(`${STORAGE_KEY}_${tag}`);
        setStaff(null);
        setAccessCode("");
        setAttendees([]);
        setFilteredAttendees([]);
    };

    // Show loading while checking localStorage
    if (authLoading && !staff) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
            </div>
        );
    }

    // ========== LOGIN SCREEN ==========
    if (!staff) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-6">
                <div className="w-full max-w-md">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-[var(--brand-blue)] rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-100">
                            <KeyRound className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-2xl font-black tracking-tight text-gray-900">Staff Check-in</h1>
                        <p className="text-sm text-gray-400 font-bold mt-2">
                            Enter your 6-digit access code to begin
                        </p>
                    </div>

                    <div className="bg-white rounded-[32px] p-8 shadow-xl shadow-gray-100/50 border border-gray-100 space-y-6">
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">
                                Access Code
                            </label>
                            <input
                                type="text"
                                inputMode="numeric"
                                maxLength={6}
                                value={accessCode}
                                onChange={(e) => setAccessCode(e.target.value.replace(/\D/g, ""))}
                                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                                placeholder="000000"
                                className="w-full text-center text-3xl font-black tracking-[0.3em] py-5 px-4 bg-gray-50 rounded-2xl border border-gray-100 text-gray-900 placeholder:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)] focus:border-transparent transition-all"
                            />
                        </div>

                        {authError && (
                            <div className="flex items-center gap-2 text-red-500 text-xs font-bold bg-red-50 p-3 rounded-xl">
                                <AlertCircle className="w-4 h-4" />
                                {authError}
                            </div>
                        )}

                        <button
                            onClick={handleLogin}
                            disabled={authLoading || accessCode.length < 6}
                            className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white py-4 rounded-2xl text-sm font-black hover:bg-black transition-all shadow-lg shadow-gray-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                        >
                            {authLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <Check className="w-5 h-5" />
                                    Start Check-in
                                </>
                            )}
                        </button>
                    </div>

                    <div className="text-center mt-6">
                        <Link
                            href={`/events/${tag}?view=live`}
                            className="text-xs font-bold text-gray-400 hover:text-gray-900 transition-colors"
                        >
                            ← Back to Event Day
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // ========== CHECK-IN SCREEN (AUTHENTICATED) ==========
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
            {/* Header */}
            <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-50">
                <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[var(--brand-blue)] rounded-xl flex items-center justify-center text-[10px] font-black text-white uppercase">
                            {staff.first_name.charAt(0)}{staff.last_name.charAt(0)}
                        </div>
                        <div>
                            <div className="text-sm font-black text-gray-900">{staff.first_name} {staff.last_name}</div>
                            <div className="text-[10px] font-bold text-gray-400">{staff.role}</div>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 text-gray-400 hover:text-red-500 transition-colors text-xs font-bold"
                    >
                        <LogOut className="w-4 h-4" />
                        Log Out
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-8 space-y-6">
                {/* Event Title */}
                <div className="text-center">
                    <h1 className="text-2xl font-black tracking-tight text-gray-900">
                        {event?.event_title || "Loading..."}
                    </h1>
                    <p className="text-sm text-gray-400 font-bold mt-1">
                        Search for a guest to check them in
                    </p>
                </div>

                {/* Search Bar & Filters */}
                <div className="space-y-4">
                    <div className="relative">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                        <input
                            type="text"
                            placeholder="Search by name or email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-14 pr-6 py-4 bg-white rounded-2xl border border-gray-100 shadow-sm text-sm font-bold text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)] focus:border-transparent transition-all"
                        />
                    </div>

                    {/* Pass Type Filter Pills */}
                    {uniquePasses.length > 1 && (
                        <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar mask-fade-right">
                            <button
                                onClick={() => setSelectedPassFilter(null)}
                                className={cn(
                                    "px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all flex items-center gap-2",
                                    selectedPassFilter === null
                                        ? "bg-gray-900 text-white shadow-md shadow-gray-200"
                                        : "bg-white text-gray-500 hover:text-gray-900 hover:bg-gray-50 border border-gray-100"
                                )}
                            >
                                All Tickets
                            </button>
                            {uniquePasses.map(pass => (
                                <button
                                    key={pass}
                                    onClick={() => setSelectedPassFilter(pass)}
                                    className={cn(
                                        "px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all",
                                        selectedPassFilter === pass
                                            ? "bg-[var(--brand-blue)] text-white shadow-md shadow-blue-200"
                                            : "bg-white text-gray-500 hover:text-gray-900 hover:bg-gray-50 border border-gray-100"
                                    )}
                                >
                                    {pass}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Guest List */}
                <div className="space-y-3">
                    {loading ? (
                        <div className="flex justify-center py-20">
                            <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
                        </div>
                    ) : filteredAttendees.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-[32px] border border-dashed border-gray-200">
                            <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-4" />
                            <h4 className="text-sm font-black text-gray-900 mb-1">No guests found</h4>
                            <p className="text-xs text-gray-400 font-bold">
                                {searchQuery ? "Try a different search" : "No registered guests yet"}
                            </p>
                        </div>
                    ) : (
                        <AnimatePresence>
                            {filteredAttendees.map((attendee) => (
                                <motion.div
                                    key={attendee.id}
                                    layout
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className={cn(
                                        "p-5 rounded-[24px] border flex items-center justify-between transition-all",
                                        attendee.check_in
                                            ? "bg-green-50/50 border-green-200"
                                            : "bg-white border-gray-100 hover:border-[var(--brand-blue)]/30 hover:shadow-md"
                                    )}
                                >
                                    <div className="flex items-center gap-4">
                                        <div
                                            className={cn(
                                                "w-12 h-12 rounded-2xl flex items-center justify-center text-[11px] font-black uppercase",
                                                attendee.check_in
                                                    ? "bg-green-100 text-green-600 border border-green-200"
                                                    : "bg-gray-100 text-gray-400 border border-gray-200"
                                            )}
                                        >
                                            {attendee.check_in ? (
                                                <Check className="w-5 h-5" />
                                            ) : (
                                                `${attendee.first_name.charAt(0)}${attendee.last_name.charAt(0)}`
                                            )}
                                        </div>
                                        <div>
                                            <h4 className="text-base font-black text-gray-900 tracking-tight">
                                                {attendee.first_name} {attendee.last_name}
                                            </h4>
                                            <p className="text-[10px] font-bold text-gray-400 mt-0.5">
                                                {attendee.pass?.[0]?.title || "General Admission"}
                                            </p>
                                        </div>
                                    </div>

                                    {attendee.check_in ? (
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-green-600 bg-green-100 px-3 py-1.5 rounded-full">
                                                Checked In
                                            </span>
                                            <button
                                                onClick={() => handleUndoCheckIn(attendee.id)}
                                                disabled={checkingIn === attendee.id}
                                                className="text-[9px] font-black uppercase tracking-widest text-gray-400 hover:text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1"
                                            >
                                                {checkingIn === attendee.id ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : "Undo"}
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => handleCheckIn(attendee.id)}
                                            disabled={checkingIn === attendee.id}
                                            className={cn(
                                                "flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-black transition-all active:scale-95",
                                                successId === attendee.id
                                                    ? "bg-green-500 text-white"
                                                    : "bg-gray-900 text-white hover:bg-black shadow-lg shadow-gray-200"
                                            )}
                                        >
                                            {checkingIn === attendee.id ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : successId === attendee.id ? (
                                                <Check className="w-4 h-4" />
                                            ) : (
                                                <UserCheck className="w-4 h-4" />
                                            )}
                                            {successId === attendee.id ? "Done!" : "Check In"}
                                        </button>
                                    )}
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    )}
                </div>
            </main>

            {/* Footer Stats */}
            <footer className="bg-white border-t border-gray-100 py-4 sticky bottom-0">
                <div className="max-w-3xl mx-auto px-6 flex justify-between items-center">
                    <div className="text-xs font-bold text-gray-400">
                        Showing {filteredAttendees.length} of {attendees.length} guests
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-gray-900">
                            {attendees.filter((a) => a.check_in).length}
                        </span>
                        <span className="text-[10px] font-bold text-gray-400">checked in</span>
                    </div>
                </div>
            </footer>
        </div>
    );
}
