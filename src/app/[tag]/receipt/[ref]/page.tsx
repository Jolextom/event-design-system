"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
    Check,
    Calendar,
    Clock,
    MapPin,
    Users,
    Ticket,
    Copy,
    ExternalLink,
    Loader2,
    AlertCircle,
    Download,
    Share2,
    Mail,
    RefreshCw,
    Plus,
    UserPlus,
    X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { verifyAndFulfillPayment } from "@/app/actions";
import type { Question } from "@/app/events/[tag]/types";
import { addGroupMemberAction, getReceiptAction, resendInviteAction } from "../../actions";
import { QuestionField, type AnswerValue } from "../../QuestionField";
import { DEFAULT_THEME, brandNameForTag, themeStyle } from "../../theme";
import { isQuestionRelevant, missingRequiredQuestion, type RuleQuestion } from "@/lib/answers";

interface Order {
    id: string;
    order_ref: string;
    first_name: string;
    last_name: string;
    email: string;
    quantity: number;
    total_amount: number;
    status: string;
    created_at: string;
    pass_id: string;
}

interface Attendee {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    ref: string;
    email_status: string;
    created_at: string;
    event_id: string;
}

interface Pass {
    id: string;
    title: string;
    type: "individual" | "group";
    group_size?: number;
}

interface Event {
    id: string;
    event_title: string;
    tag: string;
    start_date: string;
    start_time: string;
    location: string;
    image?: string;
}

// ... existing interfaces ...

export default function ReceiptPage() {
    const params = useParams();
    const tag = typeof params === "object" && params?.tag ? String(params.tag) : null;
    const ref = typeof params === "object" && params?.ref ? String(params.ref) : null;

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [order, setOrder] = useState<Order | null>(null);
    const [attendees, setAttendees] = useState<Attendee[]>([]);
    const [pass, setPass] = useState<Pass | null>(null);
    const [event, setEvent] = useState<Event | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [copied, setCopied] = useState(false);
    const [resending, setResending] = useState<string | null>(null);

    // Add Member form state
    const [showAddForm, setShowAddForm] = useState(false);
    const [addingMember, setAddingMember] = useState(false);
    const [newMemberEmail, setNewMemberEmail] = useState("");
    const [newMemberFirstName, setNewMemberFirstName] = useState("");
    const [newMemberLastName, setNewMemberLastName] = useState("");
    const [newMemberAnswers, setNewMemberAnswers] = useState<Record<string, AnswerValue>>({});
    const [notice, setNotice] = useState<string | null>(null);
    const [newMemberMode, setNewMemberMode] = useState<"fill" | "invite">("invite");
    const [addError, setAddError] = useState<string | null>(null);
    const [hasFatalError, setHasFatalError] = useState<boolean>(false);

    useEffect(() => {
        if (!ref) return;
        
        // Proactively verify the payment immediately on landing
        // This makes the UI feel "snappy" instead of waiting for the webhook
        verifyAndFulfillPayment(ref).then(result => {
            if (result.fatalError) {
                console.error("Fatal verification error:", result.fatalError);
                setError(result.fatalError);
                setHasFatalError(true);
            } else if (result.success) {
                console.log("Immediate verification successful");
                // The polling/fetchData will catch the updated status automatically
            }
        }).catch(err => {
            console.warn("Immediate verification background check failed:", err);
        });
    }, [ref]);

    useEffect(() => {
        if (!tag || !ref || hasFatalError) return;

        const fetchData = async () => {
            if (loading) setLoading(true); // Only set loading on first fetch
            setError(null);

            try {
                // The server looks up this one order and returns only what this page draws.
                const res = await getReceiptAction(ref);
                if (!res.ok) throw new Error(res.error === "Not found." ? "Order not found" : res.error);
                const v = res.view;
                setOrder(v.order as unknown as Order);
                setAttendees(v.attendees as unknown as Attendee[]);
                setPass(v.pass as unknown as Pass | null);
                if (v.event) setEvent(v.event as unknown as Event);
                setQuestions(v.questions);

            } catch (err: any) {
                console.error("Failed to load receipt:", err);
                setError(err.message || "Failed to load receipt");
            } finally {
                setLoading(false);
            }
        };

        fetchData();

        // Polling if order is pending
        let interval: NodeJS.Timeout;
        if (order?.status === 'pending') {
            interval = setInterval(() => {
                fetchData();
            }, 3000); // Check every 3 seconds
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [tag, ref, order?.status, hasFatalError]);

    const handleCopyRef = () => {
        if (order?.order_ref) {
            navigator.clipboard.writeText(order.order_ref);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleShare = () => {
        if (navigator.share) {
            navigator.share({
                title: `Registration Confirmation - ${event?.event_title}`,
                text: `My registration for ${event?.event_title}`,
                url: window.location.href
            });
        } else {
            navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleResendInvite = async (attendeeId: string) => {
        if (!order) return;
        setResending(attendeeId);
        setNotice(null);
        try {
            const res = await resendInviteAction({ attendeeId, orderRef: order.order_ref });
            if (!res.ok) throw new Error(res.error);
            // Show success briefly
            setTimeout(() => setResending(null), 1500);
        } catch (err) {
            console.error('Failed to resend invite:', err);
            setNotice(err instanceof Error ? err.message : "Couldn't send the email.");
            setResending(null);
        }
    };

    // Questions this new member should answer (same rule as the registration form: no
    // ticket-selection questions, and track-gated ones only when they apply).
    const memberQuestions = questions.filter(
        (q) => !q.is_selection_logic && isQuestionRelevant(questions as unknown as RuleQuestion[], q as unknown as RuleQuestion, newMemberAnswers)
    );

    const handleAddMember = async () => {
        if (!order || !event || !pass) return;
        setAddError(null);
        setNotice(null);

        const email = newMemberEmail.trim();
        if (!email) return setAddError("Email is required");
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setAddError("Please enter a valid email address");

        if (newMemberMode === "fill") {
            if (!newMemberFirstName.trim()) return setAddError("First name is required");
            const missing = missingRequiredQuestion(questions as unknown as RuleQuestion[], newMemberAnswers);
            if (missing) return setAddError(`Please answer: ${missing.title}`);
        }
        if (attendees.some((a) => a.email.toLowerCase() === email.toLowerCase())) {
            return setAddError("This email is already in the group");
        }

        setAddingMember(true);
        try {
            // The server enforces the group size, creates the member and emails them
            // (an invite link, or their own ticket + check-in pass if you filled them in).
            const res = await addGroupMemberAction({
                orderRef: order.order_ref,
                mode: newMemberMode,
                email,
                firstName: newMemberFirstName,
                lastName: newMemberLastName,
                answers: newMemberAnswers,
            });
            if (!res.ok) throw new Error(res.error);

            setAttendees([...attendees, { ...res.attendee, created_at: new Date().toISOString(), event_id: event.id } as Attendee]);
            if (!res.emailSent) setNotice("Added, but we couldn't send the email just now. Use Resend in a minute.");

            setNewMemberEmail("");
            setNewMemberFirstName("");
            setNewMemberLastName("");
            setNewMemberAnswers({});
            setShowAddForm(false);
        } catch (err: unknown) {
            console.error("Failed to add member:", err);
            setAddError(err instanceof Error ? err.message : "Failed to add member");
        } finally {
            setAddingMember(false);
        }
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return "";
        return new Date(dateStr).toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric"
        });
    };

    if (loading || order?.status === 'pending') {
        return (
            <div className="min-h-screen bg-white overflow-y-auto custom-scrollbar relative overflow-hidden">
                {/* Immersive Backdrop (Subtle for loading) */}
                <div className="absolute top-0 left-0 w-full h-[40vh] bg-gradient-to-b from-gray-50 to-white -z-10" />
                <div className="absolute top-20 right-[10%] w-64 h-64 bg-gray-100/30 blur-[100px] rounded-full -z-10" />
                <div className="absolute top-40 left-[5%] w-96 h-96 bg-gray-50/20 blur-[120px] rounded-full -z-10" />

                <div className="max-w-4xl mx-auto px-6 py-16 md:py-24">
                    <div className="text-center space-y-12">
                        {/* Skeleton Icon */}
                        <div className="w-20 h-20 bg-gray-100 rounded-[30px] animate-pulse mx-auto shadow-sm" />

                        {/* Skeleton Headline */}
                        <div className="space-y-4 max-w-lg mx-auto flex flex-col items-center">
                            <div className="w-3/4 h-16 md:h-24 bg-gray-100 rounded-[2rem] animate-pulse" />
                            <div className="w-full h-6 bg-gray-50 rounded-full animate-pulse mt-4" />
                            <div className="w-2/3 h-5 bg-gray-50 rounded-full animate-pulse" />
                        </div>

                        {/* Skeleton Receipt Card */}
                        <div className="relative max-w-2xl mx-auto">
                            <div className="bg-white rounded-[64px] border border-gray-100 shadow-[0_48px_96px_-32px_rgba(0,0,0,0.04)] overflow-hidden text-left relative">
                                {/* Decorative Ticket Notch */}
                                <div className="absolute top-1/2 -left-4 w-8 h-8 bg-white border border-gray-100 rounded-full -translate-y-1/2" />
                                <div className="absolute top-1/2 -right-4 w-8 h-8 bg-white border border-gray-100 rounded-full -translate-y-1/2" />

                                <div className="p-10 md:p-14 space-y-12">
                                    {/* Top */}
                                    <div className="flex items-center justify-between">
                                        <div className="w-24 h-6 bg-gray-100 rounded-full animate-pulse" />
                                        <div className="w-32 h-6 bg-gray-50 rounded-full animate-pulse" />
                                    </div>

                                    {/* Middle */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                        <div className="space-y-3">
                                            <div className="w-24 h-3 bg-gray-100 rounded-full animate-pulse" />
                                            <div className="w-48 h-10 bg-gray-100 rounded-xl animate-pulse" />
                                        </div>
                                        <div className="space-y-3 md:flex md:flex-col md:items-end">
                                            <div className="w-20 h-3 bg-gray-100 rounded-full animate-pulse" />
                                            <div className="w-40 h-10 bg-gray-50 rounded-xl animate-pulse" />
                                        </div>
                                    </div>

                                    {/* Bottom Info */}
                                    <div className="pt-10 border-t border-gray-50 flex flex-col md:flex-row gap-8 opacity-50">
                                        <div className="w-full h-8 bg-gray-50 rounded-2xl animate-pulse" />
                                    </div>
                                    
                                    {/* Sub-text indication */}
                                    {order?.status === 'pending' && (
                                        <div className="absolute inset-x-0 bottom-4 flex justify-center">
                                            <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold animate-pulse">
                                                Finalizing Registration...
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mb-6">
                    <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
                <h1 className="text-xl font-black text-gray-900 mb-2">Receipt Not Found</h1>
                <p className="text-sm text-gray-500 font-bold max-w-sm mb-6">
                    {error || "We couldn't find this order. Please check the URL or contact support."}
                </p>
                <Link
                    href={tag ? `/${tag}` : "/"}
                    className="px-6 py-3 bg-gray-900 text-white rounded-2xl text-sm font-black"
                >
                    Back to Event
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white overflow-y-auto custom-scrollbar relative">
            {/* Immersive Backdrop */}
            <div className="absolute top-0 left-0 w-full h-[40vh] bg-gradient-to-b from-green-50/50 to-white -z-10" />
            <div className="absolute top-20 right-[10%] w-64 h-64 bg-green-100/30 blur-[100px] rounded-full -z-10" />
            <div className="absolute top-40 left-[5%] w-96 h-96 bg-blue-100/20 blur-[120px] rounded-full -z-10" />

            <div className="max-w-4xl mx-auto px-6 py-16 md:py-24">
                <div className="text-center space-y-12">
                    {/* Success Icon */}
                    <div className="relative inline-block">
                        <div className="w-20 h-20 bg-green-500 rounded-[30px] flex items-center justify-center shadow-[0_20px_40px_-8px_rgba(34,197,94,0.3)] relative z-10 mx-auto">
                            <Check className="w-10 h-10 text-white stroke-[4]" />
                        </div>
                        <div className="absolute inset-0 bg-green-200 blur-2xl opacity-40 scale-150 animate-pulse" />
                    </div>

                    {/* Headline */}
                    <div className="space-y-4">
                        <h2 className="tracking-tight">
                            <span className="block text-xl md:text-3xl font-bold text-gray-400 mb-3 md:mb-4">See you at</span>
                            <span className="block text-4xl md:text-7xl font-black text-gray-900 leading-[1.02] text-balance">{event?.event_title || "The Event"}</span>
                        </h2>
                        <p className="text-lg md:text-xl text-gray-400 font-bold max-w-lg mx-auto leading-relaxed">
                            You're all set for <span className="text-gray-900">{formatDate(event?.start_date || "")}</span>. (₦{(order.total_amount || 0).toLocaleString()}) <br />
                            We've sent a confirmation to <span className="text-blue-600">{order.email}</span>. <br />
                            <span className="text-sm opacity-60">(Check your spam folder if you don't see it)</span>
                        </p>
                    </div>

                    {/* The Receipt Card */}
                    <div className="relative max-w-2xl mx-auto">
                        <div className="absolute -inset-4 bg-gray-900/[0.02] rounded-[72px] -z-10" />

                        <div className="bg-white rounded-[64px] border border-gray-100 shadow-[0_48px_96px_-32px_rgba(0,0,0,0.08)] overflow-hidden text-left relative">
                            {/* Decorative Ticket Notch */}
                            <div className="absolute top-1/2 -left-4 w-8 h-8 bg-white border border-gray-100 rounded-full -translate-y-1/2" />
                            <div className="absolute top-1/2 -right-4 w-8 h-8 bg-white border border-gray-100 rounded-full -translate-y-1/2" />

                            <div className="p-10 md:p-14 space-y-12">
                                {/* Top: Branding & Reference */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 bg-red-50 text-red-500 rounded flex items-center justify-center font-black text-[10px] border border-red-100">❤</div>
                                        <span className="font-black text-xs tracking-tighter uppercase italic">{brandNameForTag(tag)}</span>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-300">Reference</div>
                                        <div className="text-xs font-bold text-gray-900 flex items-center gap-2 justify-end">
                                            {order.order_ref}
                                            <button
                                                onClick={handleCopyRef}
                                                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                                            >
                                                {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-gray-400" />}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Middle: Guest & Pass */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                    <div className="space-y-2">
                                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Lead Attendee</div>
                                        <div className="text-4xl font-black text-gray-900 tracking-tight break-words">
                                            {order.first_name} {order.last_name}
                                        </div>
                                    </div>
                                    <div className="space-y-2 md:text-right">
                                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Pass Type</div>
                                        <div className="text-4xl font-black text-blue-600 tracking-tight">
                                            {pass?.title || "General Admission"}
                                        </div>
                                    </div>
                                </div>

                                {/* Group Management (for group tickets) */}
                                {pass?.type === "group" && (
                                    <div className="space-y-4">
                                        {/* Progress Bar */}
                                        {(() => {
                                            const confirmed = attendees.filter(a => a.email_status === "registered").length;
                                            const pending = attendees.filter(a => a.email_status === "invited").length;
                                            const filled = attendees.length;
                                            const total = pass?.group_size || filled;
                                            const percentage = (filled / total) * 100;
                                            return (
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 flex items-center gap-2">
                                                            <Users className="w-4 h-4" /> Group Members
                                                        </div>
                                                        <div className="text-xs font-black text-gray-600">
                                                            {filled}/{total} Added{pending > 0 && <span className="text-yellow-600 ml-1">({pending} pending)</span>}
                                                        </div>
                                                    </div>
                                                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-green-500 rounded-full transition-all duration-500"
                                                            style={{ width: `${percentage}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {attendees
                                                .sort((a, b) => {
                                                    // Prioritize 'registered' over 'invited'
                                                    if (a.email_status === 'registered' && b.email_status !== 'registered') return -1;
                                                    if (a.email_status !== 'registered' && b.email_status === 'registered') return 1;
                                                    // Secondary sort by creation date (oldest first)
                                                    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                                                })
                                                .map((attendee, index) => (
                                                    <div
                                                        key={attendee.id}
                                                        className="flex items-center gap-3 p-3 bg-gray-50/80 rounded-2xl border border-gray-100"
                                                    >
                                                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center font-black text-xs text-gray-400 border border-gray-100">
                                                            {index + 1}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-bold text-sm text-gray-900 truncate">
                                                                {attendee.email_status === "invited" && attendee.first_name === "Guest"
                                                                    ? <span className="text-gray-400 italic">Pending...</span>
                                                                    : `${attendee.first_name} ${attendee.last_name}`
                                                                }
                                                            </p>
                                                            <p className="text-xs text-gray-400 truncate">{attendee.email}</p>
                                                        </div>
                                                        {attendee.email_status === "invited" ? (
                                                            <button
                                                                onClick={() => handleResendInvite(attendee.id)}
                                                                disabled={resending === attendee.id}
                                                                className="px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                                                            >
                                                                {resending === attendee.id ? (
                                                                    <><RefreshCw className="w-3 h-3 animate-spin" /> Sending...</>
                                                                ) : (
                                                                    <><Mail className="w-3 h-3" /> Resend</>
                                                                )}
                                                            </button>
                                                        ) : (
                                                            <div className="px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider bg-green-100 text-green-600">
                                                                Confirmed
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                        </div>

                                        {notice && <p className="mt-3 text-xs font-bold text-red-500">{notice}</p>}

                                        {/* Add Member Button/Form */}
                                        {pass?.type === "group" && pass?.group_size && attendees.length < pass.group_size && (
                                            <div className="mt-4">
                                                {!showAddForm ? (
                                                    <button
                                                        onClick={() => setShowAddForm(true)}
                                                        className="w-full p-4 border-2 border-dashed border-gray-200 rounded-2xl text-sm font-bold text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-colors flex items-center justify-center gap-2"
                                                    >
                                                        <UserPlus className="w-4 h-4" />
                                                        Add Member ({pass.group_size - attendees.length} slot{pass.group_size - attendees.length > 1 ? 's' : ''} available)
                                                    </button>
                                                ) : (
                                                    <div className="p-5 bg-blue-50/50 border border-blue-100 rounded-2xl space-y-4">
                                                        <div className="flex items-center justify-between">
                                                            <p className="text-sm font-black text-gray-900">Add Group Member</p>
                                                            <button
                                                                onClick={() => { setShowAddForm(false); setAddError(null); }}
                                                                className="p-1 hover:bg-blue-100 rounded-lg transition-colors"
                                                            >
                                                                <X className="w-4 h-4 text-gray-400" />
                                                            </button>
                                                        </div>

                                                        {/* Mode Toggle */}
                                                        <div className="flex bg-white p-1 rounded-xl border border-blue-100">
                                                            <button
                                                                onClick={() => setNewMemberMode("invite")}
                                                                className={cn(
                                                                    "flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                                                                    newMemberMode === "invite"
                                                                        ? "bg-blue-600 text-white"
                                                                        : "text-gray-400 hover:text-gray-600"
                                                                )}
                                                            >
                                                                Send Invite
                                                            </button>
                                                            <button
                                                                onClick={() => setNewMemberMode("fill")}
                                                                className={cn(
                                                                    "flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                                                                    newMemberMode === "fill"
                                                                        ? "bg-blue-600 text-white"
                                                                        : "text-gray-400 hover:text-gray-600"
                                                                )}
                                                            >
                                                                Fill Details
                                                            </button>
                                                        </div>

                                                        {/* Email Field */}
                                                        <div className="space-y-2">
                                                            <label className="text-[9px] font-black uppercase tracking-widest text-gray-400">Email *</label>
                                                            <input
                                                                type="email"
                                                                value={newMemberEmail}
                                                                onChange={(e) => setNewMemberEmail(e.target.value)}
                                                                placeholder="guest@email.com"
                                                                className="w-full bg-white border border-blue-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 rounded-xl p-3 text-sm font-bold outline-none transition-all"
                                                            />
                                                        </div>

                                                        {/* First & Last Name (only for fill mode) */}
                                                        {newMemberMode === "fill" && (
                                                            <div className="grid grid-cols-2 gap-3">
                                                                <div className="space-y-2">
                                                                    <label className="text-[9px] font-black uppercase tracking-widest text-gray-400">First Name *</label>
                                                                    <input
                                                                        value={newMemberFirstName}
                                                                        onChange={(e) => setNewMemberFirstName(e.target.value)}
                                                                        placeholder="John"
                                                                        className="w-full bg-white border border-blue-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 rounded-xl p-3 text-sm font-bold outline-none transition-all"
                                                                    />
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <label className="text-[9px] font-black uppercase tracking-widest text-gray-400">Last Name</label>
                                                                    <input
                                                                        value={newMemberLastName}
                                                                        onChange={(e) => setNewMemberLastName(e.target.value)}
                                                                        placeholder="Doe"
                                                                        className="w-full bg-white border border-blue-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 rounded-xl p-3 text-sm font-bold outline-none transition-all"
                                                                    />
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Same fields as the registration form (light colours on this page) */}
                                                        {newMemberMode === "fill" && memberQuestions.length > 0 && (
                                                            <div style={themeStyle(DEFAULT_THEME)} className="space-y-4 text-[color:var(--pg-text)]">
                                                                {memberQuestions.map((q) => (
                                                                    <QuestionField
                                                                        key={q.id}
                                                                        question={q}
                                                                        value={newMemberAnswers[q.id]}
                                                                        onChange={(value) => setNewMemberAnswers((prev) => ({ ...prev, [q.id]: value }))}
                                                                    />
                                                                ))}
                                                            </div>
                                                        )}

                                                        {/* Error */}
                                                        {addError && (
                                                            <p className="text-xs font-bold text-red-500">{addError}</p>
                                                        )}

                                                        {/* Submit */}
                                                        <button
                                                            onClick={handleAddMember}
                                                            disabled={addingMember}
                                                            className="w-full py-3 bg-blue-600 text-white rounded-xl font-black text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                                        >
                                                            {addingMember ? (
                                                                <><Loader2 className="w-4 h-4 animate-spin" /> Adding...</>
                                                            ) : (
                                                                <><Plus className="w-4 h-4" /> {newMemberMode === "invite" ? "Send Invite" : "Add Member"}</>
                                                            )}
                                                        </button>

                                                        {newMemberMode === "invite" && (
                                                            <p className="text-[10px] text-gray-400 font-bold text-center">
                                                                They'll receive an email to complete their registration
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Bottom: Status & Action */}
                                <div className="pt-10 border-t border-gray-50 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
                                    <div className="flex flex-wrap gap-3">
                                        <div className="px-3 py-1.5 bg-green-50 text-green-600 text-[10px] font-black uppercase tracking-widest rounded-xl border border-green-100 flex items-center gap-2">
                                            <Check className="w-3 h-3" /> Pass Active
                                        </div>
                                        {attendees.length > 1 && (
                                            <div className="px-3 py-1.5 bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest rounded-xl border border-blue-100 flex items-center gap-2">
                                                <Users className="w-3 h-3" /> {attendees.length} Guests
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-4 text-xs">
                                        <div className="flex items-center gap-2 text-gray-400 font-bold">
                                            <Calendar className="w-4 h-4" />
                                            {formatDate(event?.start_date || "")}
                                        </div>
                                        {event?.location && (
                                            <div className="flex items-center gap-2 text-gray-400 font-bold">
                                                <MapPin className="w-4 h-4" />
                                                <span className="max-w-[150px] truncate">{event.location}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Suite */}
                    <div className="pt-8 flex flex-col sm:flex-row items-center justify-center gap-6">
                        <button
                            onClick={handleShare}
                            className="w-full sm:w-auto px-10 py-5 bg-white border border-gray-100 text-gray-900 rounded-[24px] font-black text-sm hover:shadow-lg transition-all flex items-center justify-center gap-3"
                        >
                            <Share2 className="w-5 h-5 text-blue-500" /> Share Confirmation
                        </button>
                        <Link href={`/${tag}/join`}>
                            <button className="w-full sm:w-auto px-10 py-5 bg-gray-900 text-white rounded-[24px] font-black text-sm hover:scale-[1.05] active:scale-95 transition-all shadow-xl shadow-gray-200 flex items-center justify-center gap-3">
                                <ExternalLink className="w-5 h-5" /> View Event
                            </button>
                        </Link>
                    </div>

                    {/* Footer */}
                    <p className="text-xs text-gray-300 font-bold pt-8">
                        Confirmation sent to {order.email} • Check your spam folder • Powered by {brandNameForTag(tag)}
                    </p>
                </div>
            </div>
        </div>
    );
}
