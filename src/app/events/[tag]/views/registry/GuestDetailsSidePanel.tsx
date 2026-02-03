"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, Calendar, Hash, CheckCircle2, ShieldCheck, Clock, Ticket, MessageSquare, Trash2, Loader2, RotateCcw } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { Attendee, Question, Pass } from "../../types";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface GuestDetailsSidePanelProps {
    isOpen: boolean;
    onClose: () => void;
    attendee: Attendee | null;
    questions: Question[];
    passes: Pass[];
    onUpdate: () => void; // Refresh list after changes
}

export function GuestDetailsSidePanel({
    isOpen,
    onClose,
    attendee,
    questions,
    passes,
    onUpdate
}: GuestDetailsSidePanelProps) {
    const [activeTab, setActiveTab] = useState<"profile" | "answers" | "emails">("profile");
    const [emailHistory, setEmailHistory] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Fetch email history when panel opens for a guest
    useEffect(() => {
        if (isOpen && attendee) {
            fetchEmailHistory();
        }
    }, [isOpen, attendee]);

    const fetchEmailHistory = async () => {
        if (!attendee) return;
        setLoadingHistory(true);
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const { data } = await supabase
            .from("email_deliveries")
            .select("*")
            .eq("attendee_id", attendee.id)
            .order("created_at", { ascending: false });

        setEmailHistory(data || []);
        setLoadingHistory(false);
    };

    const handleCheckInToggle = async () => {
        if (!attendee) return;
        setActionLoading("checkin");
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const newStatus = !attendee.check_in_time;
        const updates = {
            check_in_time: newStatus ? new Date().toISOString() : null,
            check_in: newStatus // Keep deprecated bool in sync for now if needed
        };

        await supabase.from("attendees").update(updates).eq("id", attendee.id);

        // Optimistic update locally? Or just refresh
        onUpdate();
        setActionLoading(null);
    };

    const handleResendInvite = async () => {
        if (!attendee) return;
        setActionLoading("resend");
        try {
            // Assuming we can get the tag from the attendee or context, but usually it comes from props or URL. 
            // For now, we'll try to fetch it if not present, OR relies on the API to handle looking up event by ID if we pass eventID?
            // Actually the API expects eventTag. Since we are in the view, we might need to pass event tag down or look it up.
            // Let's assume we pass eventTag or similar. 
            // Wait, Attendee has event_id. API might support ID or we fetch event first.
            // For safety, let's fetch event tag first if we don't have it.
            // Actually, we are in `[tag]` folder, but this component is generic props.
            // Let's just do a fetch to the API and let it fail if tag missing, or improve the API.
            // Better: Pass `eventTag` as prop? Or fetch it.
            // Quick fix: Just use the API endpoint as is, and update API to optionally take ID? 
            // Current API takes `eventTag`. We'll pass it from parent.

            // Revert: I need `eventTag` in props. For now I will assume parent passes it or I fetch it.
            // Let's add `eventTag` to props for safety.

            // Temporary: fetch event to get tag
            const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            );
            const { data: ev } = await supabase.from("events").select("tag").eq("id", attendee.event_id).single();
            if (!ev?.tag) throw new Error("Event tag not found");

            await fetch('/api/send-invite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ attendeeId: attendee.id, eventTag: ev.tag })
            });

            alert("Invite resent successfully");
            fetchEmailHistory(); // Refresh history
        } catch (err) {
            console.error(err);
            alert("Failed to send invite");
        } finally {
            setActionLoading(null);
        }
    };

    if (!attendee) return null;

    const pass = passes.find(p => p.id === attendee.pass_id);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50"
                    />

                    {/* Panel */}
                    <motion.div
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 border-l border-gray-100 flex flex-col"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                            <div className="flex items-start justify-between mb-6">
                                <button onClick={onClose} className="p-2 -ml-2 hover:bg-white hover:shadow-sm rounded-xl transition-all text-gray-400 hover:text-gray-900">
                                    <X className="w-5 h-5" />
                                </button>
                                <div className="flex gap-2">
                                    {/* Status Badge */}
                                    {attendee.check_in_time ? (
                                        <div className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                                            <ShieldCheck className="w-3 h-3" /> Checked In
                                        </div>
                                    ) : attendee.email_status === 'invited' ? (
                                        <div className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                                            <Clock className="w-3 h-3" /> Invited
                                        </div>
                                    ) : (
                                        <div className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                                            <CheckCircle2 className="w-3 h-3" /> Confirmed
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="mb-2">
                                <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                                    {attendee.first_name} {attendee.last_name}
                                </h2>
                                <p className="text-sm font-bold text-gray-400">{attendee.email}</p>
                            </div>

                            {/* Quick Actions */}
                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={handleCheckInToggle}
                                    disabled={!!actionLoading}
                                    className={cn(
                                        "flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all",
                                        attendee.check_in_time
                                            ? "bg-white border-2 border-gray-200 text-gray-500 hover:border-red-200 hover:text-red-500"
                                            : "bg-gray-900 text-white hover:bg-black shadow-lg shadow-gray-200"
                                    )}
                                >
                                    {actionLoading === 'checkin' ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : attendee.check_in_time ? (
                                        <>Undo Check-in</>
                                    ) : (
                                        <>Check In</>
                                    )}
                                </button>

                                {attendee.email_status === 'invited' && (
                                    <button
                                        onClick={handleResendInvite}
                                        disabled={!!actionLoading}
                                        className="py-3 px-4 bg-blue-50 text-blue-600 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-blue-100 transition-all flex items-center gap-2"
                                    >
                                        {actionLoading === 'resend' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-gray-100 px-6">
                            {(["profile", "answers", "emails"] as const).map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={cn(
                                        "px-4 py-4 text-[11px] font-black uppercase tracking-widest border-b-2 transition-colors",
                                        activeTab === tab
                                            ? "border-gray-900 text-gray-900"
                                            : "border-transparent text-gray-400 hover:text-gray-600"
                                    )}
                                >
                                    {tab === 'answers' ? 'Form Data' : tab}
                                </button>
                            ))}
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">

                            {/* PROFILE TAB */}
                            {activeTab === "profile" && (
                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <div className="p-4 bg-gray-50 rounded-2xl space-y-3">
                                            <div className="flex items-center gap-3 text-sm font-bold text-gray-600">
                                                <Hash className="w-4 h-4 text-gray-400" />
                                                <span className="text-gray-400 min-w-[80px]">Reference</span>
                                                <span className="font-mono">{attendee.ref}</span>
                                            </div>
                                            <div className="flex items-center gap-3 text-sm font-bold text-gray-600">
                                                <Ticket className="w-4 h-4 text-gray-400" />
                                                <span className="text-gray-400 min-w-[80px]">Ticket</span>
                                                <span>{pass?.title || "Unknown Pass"}</span>
                                            </div>
                                            <div className="flex items-center gap-3 text-sm font-bold text-gray-600">
                                                <Calendar className="w-4 h-4 text-gray-400" />
                                                <span className="text-gray-400 min-w-[80px]">Registered</span>
                                                <span>{attendee.created_at ? new Date(attendee.created_at).toLocaleDateString() : "-"}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ANSWERS TAB */}
                            {activeTab === "answers" && (
                                <div className="space-y-4">
                                    {questions.length === 0 && (
                                        <p className="text-sm text-gray-400 italic text-center py-8">No custom questions for this event.</p>
                                    )}
                                    {questions.map(q => {
                                        const answer = (attendee as any).responses?.[q.id];
                                        return (
                                            <div key={q.id} className="p-4 border border-gray-100 rounded-2xl space-y-2">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{q.title}</p>
                                                <p className="text-sm font-bold text-gray-900">{answer || <span className="text-gray-300 italic">No answer</span>}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* EMAILS TAB */}
                            {activeTab === "emails" && (
                                <div className="space-y-4">
                                    {loadingHistory ? (
                                        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
                                    ) : emailHistory.length === 0 ? (
                                        <div className="text-center py-10 space-y-2">
                                            <Mail className="w-8 h-8 text-gray-200 mx-auto" />
                                            <p className="text-sm font-bold text-gray-400">No emails returned for this guest.</p>
                                        </div>
                                    ) : (
                                        emailHistory.map((email) => (
                                            <div key={email.id} className="p-4 bg-gray-50 rounded-2xl space-y-2 border border-gray-100">
                                                <div className="flex justify-between items-start">
                                                    <span className="text-xs font-black text-gray-900 uppercase tracking-wide">{email.email_type}</span>
                                                    <span className="text-[10px] font-bold text-gray-400">
                                                        {formatDistanceToNow(new Date(email.created_at), { addSuffix: true })}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {email.status === 'sent' ? (
                                                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[9px] font-black uppercase rounded-lg">Sent</span>
                                                    ) : (
                                                        <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[9px] font-black uppercase rounded-lg">{email.status}</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-gray-100 bg-gray-50/50">
                            <p className="text-[10px] text-gray-400 font-bold text-center">
                                Member ID: <span className="font-mono">{attendee.id.split('-').pop()}</span>
                            </p>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
