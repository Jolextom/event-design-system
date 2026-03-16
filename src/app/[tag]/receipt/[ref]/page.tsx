"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
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

interface QuestionOption {
    id: string;
    question_id: string;
    option_text: string;
    display_order: number;
}

interface Question {
    id: string;
    title: string;
    question_type: "text" | "select";
    is_required: boolean;
    question_order: number;
    options?: QuestionOption[];
}

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
    const [newMemberAnswers, setNewMemberAnswers] = useState<Record<string, string>>({});
    const [newMemberMode, setNewMemberMode] = useState<"fill" | "invite">("invite");
    const [addError, setAddError] = useState<string | null>(null);

    useEffect(() => {
        if (!ref) return;
        
        // Proactively verify the payment immediately on landing
        // This makes the UI feel "snappy" instead of waiting for the webhook
        verifyAndFulfillPayment(ref).then(result => {
            if (result.success) {
                console.log("Immediate verification successful");
                // The polling/fetchData will catch the updated status automatically
            }
        }).catch(err => {
            console.warn("Immediate verification background check failed:", err);
        });
    }, [ref]);

    useEffect(() => {
        if (!tag || !ref) return;

        const fetchData = async () => {
            if (loading) setLoading(true); // Only set loading on first fetch
            setError(null);

            try {
                const supabase = createClient(
                    process.env.NEXT_PUBLIC_SUPABASE_URL!,
                    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
                );

                // Fetch order by ref
                const { data: orderData, error: orderErr } = await supabase
                    .from("orders_table")
                    .select("*")
                    .eq("order_ref", ref)
                    .single();

                if (orderErr || !orderData) {
                    throw new Error("Order not found");
                }

                setOrder(orderData);

                // Fetch attendees for this order
                const { data: attendeesData } = await supabase
                    .from("attendees")
                    .select("*")
                    .eq("order_id", orderData.id);

                setAttendees(attendeesData || []);

                // Fetch pass details
                if (orderData.pass_id) {
                    const { data: passData } = await supabase
                        .from("passes")
                        .select("id, title, type, group_size")
                        .eq("id", orderData.pass_id)
                        .single();

                    setPass(passData);
                }

                // Fetch event details
                if (orderData.event_id) {
                    const { data: eventData } = await supabase
                        .from("events")
                        .select(`
                            id, event_title, tag, start_date, start_time, location, image,
                            questions (
                                *,
                                options:question_options (*)
                            )
                        `)
                        .eq("id", orderData.event_id)
                        .single();

                    if (eventData) {
                        setEvent({
                            id: eventData.id,
                            event_title: eventData.event_title,
                            tag: eventData.tag,
                            start_date: eventData.start_date,
                            start_time: eventData.start_time,
                            location: eventData.location,
                            image: eventData.image
                        });

                        // Sort and set questions
                        const sortedQuestions = (eventData.questions || [])
                            .sort((a: any, b: any) => a.question_order - b.question_order)
                            .map((q: any) => ({
                                ...q,
                                options: (q.options || []).sort((a: any, b: any) => a.display_order - b.display_order)
                            }));
                        setQuestions(sortedQuestions);
                    }
                }

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
    }, [tag, ref, order?.status]);

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
        if (!event?.tag) return;
        setResending(attendeeId);
        try {
            const res = await fetch('/api/send-invite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ attendeeId, eventTag: event.tag })
            });
            if (!res.ok) throw new Error('Failed to send');
            // Show success briefly
            setTimeout(() => setResending(null), 1500);
        } catch (err) {
            console.error('Failed to resend invite:', err);
            setResending(null);
        }
    };

    const handleAddMember = async () => {
        if (!order || !event || !pass) return;
        setAddError(null);

        // Validate email
        if (!newMemberEmail.trim()) {
            setAddError("Email is required");
            return;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(newMemberEmail)) {
            setAddError("Please enter a valid email address");
            return;
        }

        // Validate fill mode fields
        if (newMemberMode === "fill") {
            if (!newMemberFirstName.trim()) {
                setAddError("First name is required");
                return;
            }
            if (!newMemberLastName.trim()) {
                setAddError("Last name is required");
                return;
            }

            // Check required questions
            for (const q of questions) {
                if (q.is_required) {
                    const ans = newMemberAnswers[q.id];
                    if (!ans || !ans.trim()) {
                        setAddError(`Please answer: ${q.title}`);
                        return;
                    }
                }
            }
        }

        // Check for duplicate email
        if (attendees.some(a => a.email.toLowerCase() === newMemberEmail.toLowerCase())) {
            setAddError("This email is already in the group");
            return;
        }

        setAddingMember(true);

        try {
            const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            );

            // Create attendee
            const attendeeRef = `EF-${event.tag?.toUpperCase() || 'EV'}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

            const { data: newAttendee, error: insertErr } = await supabase
                .from("attendees")
                .insert({
                    event_id: event.id,
                    order_id: order.id,
                    pass_id: pass.id,
                    first_name: newMemberMode === "fill" ? newMemberFirstName.trim() : "Guest",
                    last_name: newMemberMode === "fill" ? newMemberLastName.trim() : "",
                    email: newMemberEmail.trim().toLowerCase(),
                    ref: attendeeRef,
                    email_status: newMemberMode === "invite" ? "invited" : "registered",
                    check_in: false
                })
                .select()
                .single();

            if (insertErr) {
                if (insertErr.code === "23505") {
                    throw new Error("This email is already registered for this event");
                }
                throw insertErr;
            }

            // Save answers if in fill mode
            if (newMemberMode === "fill" && newAttendee && Object.keys(newMemberAnswers).length > 0) {
                const answerInserts = Object.entries(newMemberAnswers).map(([qId, answer]) => ({
                    attendee_id: newAttendee.id,
                    question_id: qId,
                    answer_text: String(answer)
                }));

                const { error: answerErr } = await supabase.from("answers").insert(answerInserts);
                if (answerErr) {
                    console.error("Failed to save answers:", answerErr);
                    // Non-blocking error, but good to note
                }
            }

            // Add to local state (with empty responses for now, or update if needed)
            setAttendees([...attendees, newAttendee]);

            // Reset form
            setNewMemberEmail("");
            setNewMemberFirstName("");
            setNewMemberLastName("");
            setNewMemberAnswers({});
            setShowAddForm(false);

            // Send invite if in invite mode
            if (newMemberMode === "invite" && newAttendee) {
                fetch('/api/send-invite', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ attendeeId: newAttendee.id, eventTag: event.tag })
                }).catch(err => console.error('Failed to send invite:', err));
            }

        } catch (err: any) {
            console.error("Failed to add member:", err);
            setAddError(err.message || "Failed to add member");
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

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-6">
                    <Loader2 className="w-8 h-8 text-gray-900 animate-spin" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Loading Receipt...</p>
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

    if (order.status === 'pending') {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
                <div className="relative mb-8">
                    <div className="w-20 h-20 bg-blue-600 rounded-[30px] flex items-center justify-center shadow-2xl relative z-10 mx-auto">
                        <RefreshCw className="w-10 h-10 text-white animate-spin stroke-[3]" />
                    </div>
                    <div className="absolute inset-0 bg-blue-100 blur-2xl opacity-40 scale-150 animate-pulse" />
                </div>
                <h1 className="text-3xl font-black text-gray-900 mb-4 uppercase italic">Verifying Payment</h1>
                <p className="text-gray-400 font-bold max-w-sm mb-10 leading-relaxed uppercase tracking-widest text-[10px]">
                    We're confirming your transaction with Paystack. <br />
                    This usually takes a few seconds. Don't close this page.
                </p>
                <div className="flex items-center justify-center gap-1.5 pt-4">
                    {[0, 1, 2].map((i) => (
                        <div
                            key={i}
                            className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce"
                            style={{ animationDelay: `${i * 0.2}s` }}
                        />
                    ))}
                </div>
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
                        <h2 className="text-5xl md:text-8xl font-black tracking-tight text-gray-900 leading-[0.85]">
                            See you at <br />
                            <span className="text-gray-900/10 italic">{event?.event_title || "The Event"}.</span>
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
                                        <span className="font-black text-xs tracking-tighter uppercase italic">EventFlow</span>
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
                                                                    <label className="text-[9px] font-black uppercase tracking-widest text-gray-400">Last Name *</label>
                                                                    <input
                                                                        value={newMemberLastName}
                                                                        onChange={(e) => setNewMemberLastName(e.target.value)}
                                                                        placeholder="Doe"
                                                                        className="w-full bg-white border border-blue-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 rounded-xl p-3 text-sm font-bold outline-none transition-all"
                                                                    />
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Custom Questions (only for fill mode) */}
                                                        {newMemberMode === "fill" && questions.map((q) => (
                                                            <div key={q.id} className="space-y-2">
                                                                <label className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                                                                    {q.title} {q.is_required && <span className="text-red-500">*</span>}
                                                                </label>
                                                                {q.question_type === 'select' ? (
                                                                    <div className="relative">
                                                                        <select
                                                                            value={newMemberAnswers[q.id] || ""}
                                                                            onChange={(e) => setNewMemberAnswers({ ...newMemberAnswers, [q.id]: e.target.value })}
                                                                            className="w-full bg-white border border-blue-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 rounded-xl p-3 text-sm font-bold outline-none transition-all appearance-none cursor-pointer"
                                                                        >
                                                                            <option value="" disabled>Select an option</option>
                                                                            {q.options?.map(opt => (
                                                                                <option key={opt.id} value={opt.option_text}>{opt.option_text}</option>
                                                                            ))}
                                                                        </select>
                                                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                                                            <Plus className="w-4 h-4 rotate-45" />
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <input
                                                                        value={newMemberAnswers[q.id] || ""}
                                                                        onChange={(e) => setNewMemberAnswers({ ...newMemberAnswers, [q.id]: e.target.value })}
                                                                        placeholder="Your answer"
                                                                        className="w-full bg-white border border-blue-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 rounded-xl p-3 text-sm font-bold outline-none transition-all"
                                                                    />
                                                                )}
                                                            </div>
                                                        ))}

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
                        Confirmation sent to {order.email} • Check your spam folder • Powered by EventFlow
                    </p>
                </div>
            </div>
        </div>
    );
}
