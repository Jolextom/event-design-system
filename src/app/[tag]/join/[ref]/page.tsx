"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { motion } from "framer-motion";
import {
    Calendar,
    MapPin,
    Check,
    Loader2,
    AlertCircle,
    User,
    Mail,
    ChevronRight,
    Sparkles,
} from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Question } from "@/app/events/[tag]/types";

interface Attendee {
    id: string;
    event_id: string;
    email: string;
    first_name: string;
    last_name: string;
    ref: string;
    email_status: string;
    pass_id: string;
}

interface Event {
    id: string;
    event_title: string;
    tag: string;
    start_date: string;
    start_time: string;
    location: string;
    image: string;
    image_focus_y?: number;
}

interface Pass {
    id: string;
    title: string;
    type: string;
}

export default function JoinInvitePage() {
    const params = useParams();
    const router = useRouter();
    const tag = typeof params === "object" && params?.tag ? String(params.tag) : null;
    const ref = typeof params === "object" && params?.ref ? String(params.ref) : null;

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formError, setFormError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const [attendee, setAttendee] = useState<Attendee | null>(null);
    const [event, setEvent] = useState<Event | null>(null);
    const [pass, setPass] = useState<Pass | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);

    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [answers, setAnswers] = useState<Record<string, string>>({});

    useEffect(() => {
        if (!tag || !ref) return;

        const fetchData = async () => {
            setLoading(true);
            setError(null);

            try {
                const supabase = createClient(
                    process.env.NEXT_PUBLIC_SUPABASE_URL!,
                    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
                );

                // Fetch attendee by ref
                const { data: attendeeData, error: attendeeErr } = await supabase
                    .from("attendees")
                    .select("*")
                    .eq("ref", ref)
                    .single();

                if (attendeeErr || !attendeeData) {
                    throw new Error("Invite not found or expired");
                }

                // Check if already completed
                if (attendeeData.email_status === "registered") {
                    setAttendee(attendeeData);
                    setSuccess(true);
                    setLoading(false);
                    return;
                }

                setAttendee(attendeeData);

                // Fetch event
                const { data: eventData } = await supabase
                    .from("events")
                    .select("id, event_title, tag, start_date, start_time, location, image")
                    .eq("id", attendeeData.event_id)
                    .single();

                setEvent(eventData);

                // Fetch pass
                if (attendeeData.pass_id) {
                    const { data: passData } = await supabase
                        .from("passes")
                        .select("id, title, type")
                        .eq("id", attendeeData.pass_id)
                        .single();

                    setPass(passData);
                }

                // Fetch questions
                const { data: questionsData } = await supabase
                    .from("questions")
                    .select("*, options:question_options!question_options_question_id_fkey(*)")
                    .eq("event_id", attendeeData.event_id)
                    .order("question_order", { ascending: true });

                setQuestions(questionsData || []);

            } catch (err: any) {
                console.error("Failed to load invite:", err);
                setError(err.message || "Failed to load invite");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [tag, ref]);

    const handleSubmit = async () => {
        if (!attendee || !event) return;

        setFormError(null);

        // Validation
        if (!firstName.trim()) {
            setFormError("First name is required");
            return;
        }

        // Check required questions
        const requiredQuestions = questions.filter(q => q.is_required);
        for (const rq of requiredQuestions) {
            if (!answers[rq.id]?.trim()) {
                setFormError(`Please answer: "${rq.title}"`);
                return;
            }
        }

        setSubmitting(true);

        try {
            const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            );

            // Update attendee
            const { error: updateErr } = await supabase
                .from("attendees")
                .update({
                    first_name: firstName.trim(),
                    last_name: lastName.trim(),
                    email_status: "registered",
                })
                .eq("id", attendee.id);

            if (updateErr) throw updateErr;

            // Save answers
            if (Object.keys(answers).length > 0) {
                const answerInserts = Object.entries(answers).map(([qId, answer]) => ({
                    attendee_id: attendee.id,
                    question_id: qId,
                    answer_text: String(answer),
                }));

                await supabase.from("answers").insert(answerInserts);
            }

            setSuccess(true);

        } catch (err: any) {
            console.error("Registration error:", err);
            setFormError(err.message || "Failed to complete registration");
        } finally {
            setSubmitting(false);
        }
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return "";
        return new Date(dateStr).toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-6">
                    <Loader2 className="w-8 h-8 text-gray-900 animate-spin" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Loading...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mb-6">
                    <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
                <h1 className="text-xl font-black text-gray-900 mb-2">Invite Not Found</h1>
                <p className="text-sm text-gray-500 font-bold max-w-sm mb-6">{error}</p>
                <Link
                    href={tag ? `/${tag}` : "/"}
                    className="px-6 py-3 bg-gray-900 text-white rounded-2xl text-sm font-black"
                >
                    Go to Event
                </Link>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
                <div className="relative inline-block mb-8">
                    <div className="w-20 h-20 bg-green-500 rounded-[30px] flex items-center justify-center shadow-[0_20px_40px_-8px_rgba(34,197,94,0.3)]">
                        <Check className="w-10 h-10 text-white stroke-[4]" />
                    </div>
                    <div className="absolute inset-0 bg-green-200 blur-2xl opacity-40 scale-150 animate-pulse" />
                </div>
                <h1 className="text-3xl font-black text-gray-900 mb-3">You're In!</h1>
                <p className="text-base text-gray-500 font-bold max-w-sm mb-8">
                    Your registration for <span className="text-gray-900">{event?.event_title}</span> is complete.
                </p>
                <Link
                    href={`/${tag}`}
                    className="px-8 py-4 bg-gray-900 text-white rounded-2xl text-sm font-black hover:scale-105 transition-transform"
                >
                    View Event Details
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-blue-100">
            {/* Soft background glow */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden overflow-x-hidden">
                <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-50 blur-[120px] opacity-60 rounded-full" />
                <div className="absolute top-[60%] -right-[10%] w-[30%] h-[40%] bg-purple-50 blur-[120px] opacity-40 rounded-full" />
            </div>

            {/* Header */}
            <header className="relative w-full p-8 flex items-center justify-between max-w-7xl mx-auto z-10">
                <div className="flex items-center gap-3 group cursor-pointer">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform duration-500">
                        <Sparkles className="w-5 h-5 text-white animate-pulse" />
                    </div>
                    <span className="font-black tracking-tight text-gray-900 text-xl italic uppercase">EventFlow</span>
                </div>
            </header>

            {/* Main Content */}
            <main className="relative max-w-2xl mx-auto px-6 pt-12 pb-32 z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="space-y-10"
                >
                    {/* Event Banner & Intro */}
                    <div className="bg-white rounded-[40px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)] border border-gray-100 overflow-hidden group">
                        {event?.image && (
                            <div className="aspect-[24/10] w-full overflow-hidden relative">
                                <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent z-10" />
                                <img 
                                    src={event.image} 
                                    alt="Event" 
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" 
                                    style={{
                                        objectPosition: `50% ${event.image_focus_y ?? 50}%`
                                    }}
                                />
                            </div>
                        )}
                        <div className="p-10 -mt-10 relative z-20 space-y-6">
                            <div className="space-y-2">
                                <motion.div 
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.3 }}
                                    className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-full"
                                >
                                    <span className="w-1 h-1 bg-blue-600 rounded-full animate-ping" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Personal Invitation</span>
                                </motion.div>
                                <h1 className="text-4xl font-black text-gray-900 tracking-tight leading-none italic uppercase">
                                    {event?.event_title}
                                </h1>
                            </div>

                            <div className="flex flex-wrap gap-8 pt-2">
                                <div className="space-y-1">
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">When</p>
                                    <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                                        <Calendar className="w-4 h-4 text-blue-600" />
                                        {formatDate(event?.start_date || "")}
                                    </div>
                                </div>
                                {event?.location && (
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Where</p>
                                        <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                                            <MapPin className="w-4 h-4 text-blue-600" />
                                            {event.location}
                                        </div>
                                    </div>
                                )}
                                {pass && (
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Pass Type</p>
                                        <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                                            <div className="w-2 h-2 bg-blue-600 rounded-full" />
                                            {pass.title}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Registration Form */}
                    <div className="bg-white rounded-[40px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)] border border-gray-100 p-12 space-y-10 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/30 blur-3xl rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-1000" />
                        
                        <div className="relative">
                            <h2 className="text-2xl font-black text-gray-900 mb-2 italic uppercase">Complete Profile</h2>
                            <p className="text-sm text-gray-400 font-bold leading-relaxed">
                                Ready to join? Please confirm your details for <br />
                                <span className="text-blue-600 underline decoration-2 underline-offset-4">{attendee?.email}</span>
                            </p>
                        </div>

                        <div className="space-y-8 relative">
                            {/* Name Fields */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">
                                        First Name <span className="text-blue-600">*</span>
                                    </label>
                                    <div className="relative group/input">
                                        <div className="absolute inset-x-0 bottom-0 h-0.5 bg-blue-600 scale-x-0 group-focus-within/input:scale-x-100 transition-transform duration-500 origin-left" />
                                        <User className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 group-focus-within/input:text-blue-600 transition-colors" />
                                        <input
                                            value={firstName}
                                            onChange={(e) => setFirstName(e.target.value)}
                                            placeholder="Your name"
                                            className="w-full bg-gray-50/50 border-b border-gray-200 focus:bg-blue-50/20 rounded-t-2xl p-5 pl-12 text-sm font-bold outline-none transition-all placeholder:text-gray-300"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Last Name</label>
                                    <div className="relative group/input">
                                        <div className="absolute inset-x-0 bottom-0 h-0.5 bg-blue-600 scale-x-0 group-focus-within/input:scale-x-100 transition-transform duration-500 origin-left" />
                                        <input
                                            value={lastName}
                                            onChange={(e) => setLastName(e.target.value)}
                                            placeholder="Your surname"
                                            className="w-full bg-gray-50/50 border-b border-gray-200 focus:bg-blue-50/20 rounded-t-2xl p-5 text-sm font-bold outline-none transition-all placeholder:text-gray-300"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Custom Questions */}
                            {questions.length > 0 && (
                                <div className="space-y-10 pt-4">
                                    {questions.map((q) => (
                                        <div key={q.id} className="space-y-4">
                                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1 block">
                                                {q.title} {q.is_required && <span className="text-blue-600">*</span>}
                                            </label>
                                            
                                            {q.question_type === "select" && q.options ? (
                                                <div className="grid grid-cols-1 gap-3">
                                                    {q.options.map((opt) => (
                                                        <button
                                                            key={opt.id}
                                                            onClick={() => setAnswers({ ...answers, [q.id]: opt.option_text })}
                                                            className={cn(
                                                                "relative group/opt p-5 rounded-[20px] text-left text-sm font-bold transition-all border overflow-hidden",
                                                                answers[q.id] === opt.option_text
                                                                    ? "bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-500/20"
                                                                    : "bg-gray-50/50 border-gray-100 text-gray-600 hover:border-blue-200 hover:bg-white"
                                                            )}
                                                        >
                                                            {answers[q.id] === opt.option_text && (
                                                                <motion.div 
                                                                    layoutId="activeOpt"
                                                                    className="absolute inset-0 bg-blue-600 z-0" 
                                                                />
                                                            )}
                                                            <span className="relative z-10">{opt.option_text}</span>
                                                            <div className="absolute right-5 top-1/2 -translate-y-1/2 opacity-0 group-hover/opt:opacity-100 transition-opacity">
                                                                <ChevronRight className="w-4 h-4" />
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="relative group/input">
                                                    <div className="absolute inset-x-0 bottom-0 h-0.5 bg-blue-600 scale-x-0 group-focus-within/input:scale-x-100 transition-transform duration-500 origin-left" />
                                                    <input
                                                        value={answers[q.id] || ""}
                                                        onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                                                        placeholder="Write your answer..."
                                                        className="w-full bg-gray-50/50 border-b border-gray-200 focus:bg-blue-50/20 rounded-t-2xl p-5 text-sm font-bold outline-none transition-all placeholder:text-gray-200"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Error Display */}
                            <AnimatePresence>
                                {formError && (
                                    <motion.div 
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="p-5 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3"
                                    >
                                        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                        <p className="text-sm font-bold text-red-600">{formError}</p>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Submit */}
                            <div className="pt-6">
                                <button
                                    onClick={handleSubmit}
                                    disabled={submitting}
                                    className="w-full group relative overflow-hidden py-6 bg-gray-900 text-white rounded-[32px] font-black text-lg shadow-2xl shadow-gray-200 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                                >
                                    <div className="absolute inset-0 bg-blue-600 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                                    {submitting ? (
                                        <>
                                            <Loader2 className="w-6 h-6 animate-spin relative z-10" /> 
                                            <span className="relative z-10 italic uppercase">Processing...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="relative z-10 italic uppercase">Secure My Spot</span>
                                            <ChevronRight className="w-6 h-6 relative z-10 group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </button>
                                <p className="text-center mt-6 text-[10px] font-black text-gray-300 uppercase tracking-widest">
                                    Secure entry via EventFlow Cloud
                                </p>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </main>
        </div>
    );
}
