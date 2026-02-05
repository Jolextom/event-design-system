"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, Calendar, Hash, CheckCircle2, ShieldCheck, Clock, Ticket, MessageSquare, Trash2, Loader2, RotateCcw, Edit2, Eye, MousePointer, AlertCircle, Send, ChevronDown } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { Attendee, Question, Pass, EventVariable } from "../../types";
import { formatDistanceToNow, format } from "date-fns";
import { cn } from "@/lib/utils";
import { GuestTimeline, TimelineEvent } from "./GuestTimeline";
import { EmailPreviewModal } from "./EmailPreviewModal";
import { EditEmailModal } from "./EditEmailModal";

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
    const [currentAttendeeId, setCurrentAttendeeId] = useState<string | null>(null);
    const [expandedEmailId, setExpandedEmailId] = useState<string | null>(null);

    // Variable State
    const [eventVariables, setEventVariables] = useState<EventVariable[]>([]);
    const [savingProp, setSavingProp] = useState<string | null>(null);

    // Modal states
    const [previewModalOpen, setPreviewModalOpen] = useState(false);
    const [previewData, setPreviewData] = useState<{ type: string, params: any } | null>(null);
    const [editEmailModalOpen, setEditEmailModalOpen] = useState(false);

    // Reset and fetch when attendee changes
    useEffect(() => {
        if (isOpen && attendee) {
            // If switching to a new attendee, clear old data first
            if (attendee.id !== currentAttendeeId) {
                setEmailHistory([]);
                setLoadingHistory(true);
                setCurrentAttendeeId(attendee.id);
            }
            fetchEmailHistory(attendee.id);
            fetchEventVariables(attendee.event_id || "");
        } else if (!isOpen) {
            // Optional: reset on close
            setCurrentAttendeeId(null);
            setExpandedEmailId(null);
        }
    }, [isOpen, attendee, currentAttendeeId]);


    // Handle initial expansion of latest email when history loads
    useEffect(() => {
        if (emailHistory.length > 0) {
            // Sort to find the latest
            const sorted = [...emailHistory].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            setExpandedEmailId(sorted[0].id);
        }
    }, [emailHistory]);

    const fetchEmailHistory = async (id: string) => {
        setLoadingHistory(true);
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const { data } = await supabase
            .from("email_deliveries")
            .select("*")
            .eq("attendee_id", id)
            .order("created_at", { ascending: false });

        setEmailHistory(data || []);
        setLoadingHistory(false);
    };

    const fetchEventVariables = async (eventId: string) => {
        if (!eventId) return;
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        const { data } = await supabase
            .from("event_variables")
            .select("*")
            .eq("event_id", eventId)
            .order("created_at", { ascending: true });

        if (data) setEventVariables(data as EventVariable[]);
    };

    const handleUpdateProperty = async (variableName: string, value: any) => {
        if (!attendee) return;
        setSavingProp(variableName);

        // Optimistic Update
        const updatedProperties = { ...(attendee.properties || {}), [variableName]: value };
        // Ideally we update the parent list too via onUpdate, but simplified here

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        // Update DB
        const { error } = await supabase
            .from("attendees")
            .update({ properties: updatedProperties })
            .eq("id", attendee.id);

        if (!error) {
            // Force refresh to ensure sync
            onUpdate();
        } else {
            alert("Failed to save property");
        }
        setSavingProp(null);
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

        onUpdate();
        setActionLoading(null);
    };

    const handleResendInvite = async () => {
        if (!attendee) return;
        setActionLoading("resend");
        try {
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
            if (attendee.id) fetchEmailHistory(attendee.id);
        } catch (err) {
            console.error(err);
            alert("Failed to send invite");
        } finally {
            setActionLoading(null);
        }
    };

    const openPreview = (email: any) => {
        if (email.template_type && email.template_params) {
            setPreviewData({
                type: email.template_type,
                params: email.template_params
            });
            setPreviewModalOpen(true);
        } else {
            alert("Preview unavailable for this email (no template data stored).");
        }
    };

    // Construct timeline events
    const timelineEvents = useMemo(() => {
        if (!attendee) return [];

        const events: TimelineEvent[] = [];

        // 1. Sent (Invite or Confirmation or any email)
        // Use latest email to show most recent activity
        const recentEmail = [...emailHistory].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

        // Or fallback to creation time if no emails (manually added)
        const sentDate = recentEmail ? recentEmail.created_at : (attendee.created_at || null);
        const hasSent = !!recentEmail || attendee.email_status !== 'invited';

        // Determing label tag
        let sentLabel = "Sent";
        let sentSubLabel = "Invite";
        if (recentEmail) {
            if (recentEmail.email_type === 'confirmation') sentSubLabel = "Confirmation";
            else if (recentEmail.email_type === 'invite') sentSubLabel = "Invite";
            else sentSubLabel = recentEmail.email_type;
        } else if (attendee.email_status === 'confirmed') {
            sentSubLabel = "Confirmation";
        }

        events.push({
            id: 'sent',
            label: 'Sent',
            subLabel: hasSent ? sentSubLabel : undefined,
            date: sentDate,
            status: hasSent ? 'completed' : 'pending',
            icon: Send
        });

        // 2. Registered
        // If confirmed or has confirmation email
        const isRegistered = attendee.email_status === 'registered' || attendee.email_status === 'confirmed' || emailHistory.some(e => e.email_type === 'confirmation');

        // Find registration date (approximate via confirmation email or created_at if manually confirmed)
        const regEmail = emailHistory.find(e => e.email_type === 'confirmation');
        const regDate = regEmail ? regEmail.created_at : (isRegistered ? attendee.created_at : null);

        events.push({
            id: 'registered',
            label: 'Registered',
            date: regDate,
            status: isRegistered ? 'completed' : 'pending',
            icon: Ticket
        });

        // 3. Bounced (Strictly check the LATEST email)
        // Only show bounced if the most recent attempt failed.
        if (recentEmail && recentEmail.status === 'bounced') {
            events.push({
                id: 'bounced',
                label: 'Bounced',
                date: recentEmail.bounced_at || recentEmail.updated_at,
                status: 'failed',
                icon: AlertCircle
            });
        }

        // 4. Check In
        if (attendee.check_in_time) {
            events.push({
                id: 'checked-in',
                label: 'Checked In',
                date: attendee.check_in_time,
                status: 'current',
                icon: ShieldCheck
            });
        } else {
            events.push({
                id: 'check-in-pending',
                label: 'Check In',
                date: null,
                status: 'pending',
                icon: ShieldCheck
            });
        }

        return events;
    }, [attendee, emailHistory]);

    // Skeleton Component
    const PanelSkeleton = () => (
        <div className="flex flex-col h-full animate-pulse">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                <div className="flex justify-between mb-6">
                    <div className="w-8 h-8 bg-gray-200 rounded-full" />
                    <div className="w-20 h-6 bg-gray-200 rounded-full" />
                </div>
                <div className="mb-6 space-y-2">
                    <div className="w-48 h-8 bg-gray-200 rounded-lg" />
                    <div className="w-32 h-4 bg-gray-200 rounded-lg" />
                </div>
                {/* Timeline Skeleton */}
                <div className="flex justify-between gap-4 mb-8 px-2">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="flex flex-col items-center gap-2">
                            <div className="w-8 h-8 bg-gray-200 rounded-full" />
                            <div className="w-16 h-3 bg-gray-200 rounded-lg" />
                        </div>
                    ))}
                </div>
                <div className="flex gap-3">
                    <div className="flex-1 h-10 bg-gray-200 rounded-xl" />
                </div>
            </div>
            <div className="flex border-b border-gray-100 px-6">
                <div className="w-20 h-10 bg-gray-200 border-b-2 border-white" />
                <div className="w-20 h-10 bg-white" />
            </div>
            <div className="p-6 space-y-4">
                <div className="w-full h-24 bg-gray-100 rounded-2xl" />
                <div className="w-full h-24 bg-gray-100 rounded-2xl" />
            </div>
        </div>
    );


    if (!attendee && isOpen) return null; // Should ideally show skeleton if just loading

    const pass = passes.find(p => p.id === attendee?.pass_id);
    const isLoading = loadingHistory && attendee?.id !== currentAttendeeId; // Use simple loading check

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
                        {(!attendee || (loadingHistory && emailHistory.length === 0)) ? (
                            <PanelSkeleton />
                        ) : (
                            <>
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

                                    <div className="mb-6">
                                        <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                                            {attendee.first_name} {attendee.last_name}
                                        </h2>
                                        <div className="flex items-center gap-2 mt-1">
                                            <p className="text-sm font-bold text-gray-400">{attendee.email}</p>
                                            <button
                                                onClick={() => setEditEmailModalOpen(true)}
                                                className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-all border border-transparent hover:border-gray-200"
                                                title="Edit Email & Resend"
                                            >
                                                <Edit2 className="w-3 h-3" />
                                                Edit Email
                                            </button>
                                        </div>
                                    </div>

                                    {/* Timeline */}
                                    <div className="mb-6">
                                        <GuestTimeline events={timelineEvents} />
                                    </div>

                                    {/* Quick Actions */}
                                    <div className="flex gap-3">
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
                                                "px-4 py-4 text-[11px] font-black uppercase tracking-widest border-b-2 transition-colors flex items-center gap-2",
                                                activeTab === tab
                                                    ? "border-gray-900 text-gray-900"
                                                    : "border-transparent text-gray-400 hover:text-gray-600"
                                            )}
                                        >
                                            {tab === 'answers' ? 'Form Data' : tab === 'emails' ? `Emails (${emailHistory.length})` : tab}
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

                                    {/* Custom Fields Section */}
                                    {eventVariables.length > 0 && activeTab === 'profile' && (
                                        <div className="space-y-4">
                                            <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">Custom Fields</h3>
                                            <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-5 shadow-sm">
                                                {eventVariables.map(variable => {
                                                    const currentValue = attendee.properties?.[variable.name] || "";
                                                    return (
                                                        <div key={variable.id} className="space-y-2">
                                                            <label className="text-sm font-bold text-gray-700 flex justify-between">
                                                                {variable.name}
                                                                {savingProp === variable.name && <Loader2 className="w-3 h-3 animate-spin text-gray-300" />}
                                                            </label>

                                                            {/* Input Types */}
                                                            {variable.type === 'select' ? (
                                                                <div className="relative">
                                                                    <select
                                                                        value={currentValue}
                                                                        onChange={(e) => handleUpdateProperty(variable.name, e.target.value)}
                                                                        className="w-full pl-3 pr-8 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[var(--brand-blue)]/20 focus:border-[var(--brand-blue)] outline-none transition-all appearance-none"
                                                                    >
                                                                        <option value="">Select option...</option>
                                                                        {variable.options?.map(opt => (
                                                                            <option key={opt} value={opt}>{opt}</option>
                                                                        ))}
                                                                    </select>
                                                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                                                </div>
                                                            ) : variable.type === 'boolean' ? (
                                                                <div className="flex items-center gap-3">
                                                                    <button
                                                                        onClick={() => handleUpdateProperty(variable.name, true)}
                                                                        className={cn(
                                                                            "px-4 py-2 rounded-lg text-xs font-bold border transition-all",
                                                                            currentValue === true
                                                                                ? "bg-green-50 border-green-200 text-green-700"
                                                                                : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
                                                                        )}
                                                                    >
                                                                        Yes
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleUpdateProperty(variable.name, false)}
                                                                        className={cn(
                                                                            "px-4 py-2 rounded-lg text-xs font-bold border transition-all",
                                                                            currentValue === false
                                                                                ? "bg-red-50 border-red-200 text-red-700"
                                                                                : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
                                                                        )}
                                                                    >
                                                                        No
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <input
                                                                    type={variable.type === 'number' ? 'number' : 'text'}
                                                                    defaultValue={currentValue}
                                                                    onBlur={(e) => handleUpdateProperty(variable.name, e.target.value)}
                                                                    placeholder={`Enter ${variable.name.toLowerCase()}...`}
                                                                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[var(--brand-blue)]/20 focus:border-[var(--brand-blue)] outline-none transition-all"
                                                                />
                                                            )}
                                                        </div>
                                                    );
                                                })}
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
                                                <>
                                                    {[...emailHistory]
                                                        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                                                        .map((email) => {
                                                            const isExpanded = expandedEmailId === email.id;

                                                            // Determine latest event for summary
                                                            let latestEvent = { label: 'Sent', date: email.created_at, color: 'text-gray-400' };
                                                            if (email.bounced_at) latestEvent = { label: 'Bounced', date: email.bounced_at, color: 'text-red-600' };
                                                            else if (email.clicked_at) latestEvent = { label: 'Clicked', date: email.clicked_at, color: 'text-purple-600' };
                                                            else if (email.opened_at) latestEvent = { label: 'Opened', date: email.opened_at, color: 'text-blue-600' };
                                                            else if (email.delivered_at) latestEvent = { label: 'Delivered', date: email.delivered_at, color: 'text-green-600' };

                                                            const recipientEmail = email.template_params?.recipient_email || attendee.email;

                                                            return (
                                                                <div key={email.id} className="bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden transition-all duration-200">
                                                                    <button
                                                                        onClick={() => setExpandedEmailId(isExpanded ? null : email.id)}
                                                                        className="w-full p-4 flex justify-between items-center hover:bg-gray-100/50 transition-colors"
                                                                    >
                                                                        <div className="flex items-center gap-3">
                                                                            <div className={cn(
                                                                                "w-8 h-8 rounded-full flex items-center justify-center border shadow-sm transition-colors",
                                                                                email.status === 'bounced' ? "bg-red-50 border-red-100 text-red-600" :
                                                                                    email.email_type === 'invite' ? "bg-blue-50 border-blue-100 text-blue-600" :
                                                                                        "bg-green-50 border-green-100 text-green-600"
                                                                            )}>
                                                                                {email.email_type === 'invite' ? <Mail className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                                                                            </div>
                                                                            <div className="text-left">
                                                                                <div className="flex items-center gap-2">
                                                                                    <p className="text-xs font-black text-gray-900 uppercase tracking-wide">
                                                                                        {email.email_type}
                                                                                    </p>
                                                                                    <span className="text-[10px] text-gray-300 transform scale-75">•</span>
                                                                                    <p className={cn("text-[10px] font-bold uppercase tracking-wider", latestEvent.color)}>
                                                                                        {latestEvent.label}
                                                                                    </p>
                                                                                </div>
                                                                                <div className="flex items-center gap-2 text-[10px] font-medium text-gray-400">
                                                                                    <span>{latestEvent.date ? format(new Date(latestEvent.date), 'MMM d, h:mm a') : '-'}</span>
                                                                                    <span className="text-gray-300 transform scale-75">•</span>
                                                                                    <span className="text-gray-500 tracking-wide">{recipientEmail}</span>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                        <div className={cn("text-gray-400 transition-transform duration-200", isExpanded ? "rotate-180" : "")}>
                                                                            <ChevronDown className="w-4 h-4" />
                                                                        </div>
                                                                    </button>

                                                                    {/* Expanded Content */}
                                                                    <AnimatePresence>
                                                                        {isExpanded && (
                                                                            <motion.div
                                                                                initial={{ height: 0, opacity: 0 }}
                                                                                animate={{ height: "auto", opacity: 1 }}
                                                                                exit={{ height: 0, opacity: 0 }}
                                                                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                                                                className="overflow-hidden"
                                                                            >
                                                                                <div className="p-4 pt-0 border-t border-gray-100/50">
                                                                                    <div className="relative pb-2 mt-4 ml-2">
                                                                                        {/* Vertical Line */}
                                                                                        <div className="absolute left-[11px] top-2 bottom-2 w-[2px] bg-gray-100 z-0" />

                                                                                        {[
                                                                                            { label: 'Sent', date: email.created_at, icon: Mail, color: 'text-gray-400', bg: 'bg-white border-gray-200' },
                                                                                            { label: 'Delivered', date: email.delivered_at, icon: CheckCircle2, color: email.delivered_at ? 'text-green-600' : 'text-gray-300', bg: email.delivered_at ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-gray-100 dashed-border' },
                                                                                            { label: 'Opened', date: email.opened_at, icon: Eye, color: email.opened_at ? 'text-blue-600' : 'text-gray-300', bg: email.opened_at ? 'bg-blue-50 border-blue-100' : 'bg-gray-50 border-gray-100 dashed-border' },
                                                                                            email.clicked_at ? { label: 'Clicked', date: email.clicked_at, icon: MousePointer, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-100' } : null,
                                                                                            email.bounced_at ? { label: 'Bounced', date: email.bounced_at, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50 border-red-100' } : null
                                                                                        ]
                                                                                            .filter((item): item is typeof item & { label: string, date: string | null } => !!item)
                                                                                            .map((event, i) => (
                                                                                                <div key={event.label} className="flex items-center gap-4 relative z-10 mb-5 last:mb-0 group">
                                                                                                    <div className={cn("w-6 h-6 rounded-full flex items-center justify-center border text-[10px] shadow-sm transition-all", event.bg)}>
                                                                                                        <event.icon className={cn("w-3 h-3", event.color)} />
                                                                                                    </div>
                                                                                                    <div className="flex-1 flex justify-between items-center">
                                                                                                        <span className={cn("text-xs font-bold transition-colors", event.color)}>{event.label}</span>
                                                                                                        <span className="text-[10px] font-medium text-gray-400 group-hover:text-gray-600 transition-colors">
                                                                                                            {event.date ? format(new Date(event.date), 'MMM d, h:mm a') : <span className="text-gray-300 italic text-[9px]">-</span>}
                                                                                                        </span>
                                                                                                    </div>
                                                                                                </div>
                                                                                            ))}
                                                                                    </div>

                                                                                    {email.bounce_reason && (
                                                                                        <div className="text-[10px] text-red-500 bg-red-50 p-2 rounded-lg font-medium flex items-start gap-1.5 mt-2">
                                                                                            <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                                                                                            {email.bounce_reason}
                                                                                        </div>
                                                                                    )}

                                                                                    <div className="pt-3 flex justify-end">
                                                                                        <button
                                                                                            onClick={(e) => {
                                                                                                e.stopPropagation();
                                                                                                openPreview(email);
                                                                                            }}
                                                                                            className="text-[10px] font-black uppercase tracking-wider text-gray-400 hover:text-gray-900 flex items-center gap-1.5 transition-colors"
                                                                                        >
                                                                                            <Eye className="w-3 h-3" /> View Email
                                                                                        </button>
                                                                                    </div>
                                                                                </div>
                                                                            </motion.div>
                                                                        )}
                                                                    </AnimatePresence>
                                                                </div>
                                                            )
                                                        })}
                                                </>
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
                            </>
                        )}
                    </motion.div>

                    {/* Modals */}
                    <EmailPreviewModal
                        isOpen={previewModalOpen}
                        onClose={() => setPreviewModalOpen(false)}
                        templateType={previewData?.type || null}
                        templateParams={previewData?.params || null}
                    />

                    {attendee && (
                        <EditEmailModal
                            isOpen={editEmailModalOpen}
                            onClose={() => setEditEmailModalOpen(false)}
                            attendee={attendee}
                            onUpdate={() => {
                                onUpdate(); // refresh list
                                if (attendee.id) fetchEmailHistory(attendee.id); // refresh emails
                            }}
                        />
                    )}
                </>
            )}
        </AnimatePresence>
    );
}
