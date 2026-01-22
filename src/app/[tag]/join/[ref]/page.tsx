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
} from "lucide-react";
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
                    .select("*, options:question_options(*)")
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
        <div className="min-h-screen bg-gradient-to-b from-blue-50/50 via-white to-white">
            {/* Header */}
            <header className="w-full p-6 flex items-center justify-center">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 flex items-center justify-center font-black text-xs bg-red-50 text-red-600 rounded-lg border border-red-100">❤</div>
                    <span className="font-black tracking-tighter text-gray-900 text-base">EventFlow</span>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-lg mx-auto px-6 pb-20">
                {/* Event Card */}
                <div className="bg-white rounded-[32px] shadow-xl shadow-gray-100/50 border border-gray-100 overflow-hidden mb-8">
                    {event?.image && (
                        <div className="aspect-[21/9] w-full overflow-hidden">
                            <img src={event.image} alt="Event" className="w-full h-full object-cover" />
                        </div>
                    )}
                    <div className="p-6 space-y-4">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-1">You're Invited To</p>
                            <h1 className="text-2xl font-black text-gray-900 tracking-tight">{event?.event_title}</h1>
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-500 font-bold">
                            <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                {formatDate(event?.start_date || "")}
                            </div>
                            {event?.location && (
                                <div className="flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-gray-400" />
                                    {event.location}
                                </div>
                            )}
                        </div>
                        {pass && (
                            <div className="inline-block px-3 py-1.5 bg-blue-50 text-blue-600 text-xs font-black uppercase tracking-wider rounded-lg">
                                {pass.title}
                            </div>
                        )}
                    </div>
                </div>

                {/* Registration Form */}
                <div className="bg-white rounded-[32px] shadow-xl shadow-gray-100/50 border border-gray-100 p-8 space-y-8">
                    <div>
                        <h2 className="text-lg font-black text-gray-900 mb-1">Complete Your Registration</h2>
                        <p className="text-sm text-gray-400 font-bold">
                            We'll confirm your spot at <span className="text-gray-600">{attendee?.email}</span>
                        </p>
                    </div>

                    {/* Name Fields */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">
                                First Name <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                                <input
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    placeholder="John"
                                    className="w-full bg-gray-50/50 border border-gray-100 focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-50 rounded-[20px] p-4 pl-11 text-sm font-bold outline-none transition-all"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Last Name</label>
                            <input
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                placeholder="Doe"
                                className="w-full bg-gray-50/50 border border-gray-100 focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-50 rounded-[20px] p-4 text-sm font-bold outline-none transition-all"
                            />
                        </div>
                    </div>

                    {/* Custom Questions */}
                    {questions.length > 0 && (
                        <div className="space-y-6 pt-4 border-t border-gray-50">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Event Questions</p>
                            {questions.map((q) => (
                                <div key={q.id} className="space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">
                                        {q.title} {q.is_required && <span className="text-red-500">*</span>}
                                    </label>
                                    {q.question_type === "select" && q.options ? (
                                        <div className="space-y-2">
                                            {q.options.map((opt) => (
                                                <button
                                                    key={opt.id}
                                                    onClick={() => setAnswers({ ...answers, [q.id]: opt.option_text })}
                                                    className={cn(
                                                        "w-full p-4 rounded-2xl text-left text-sm font-bold transition-all border",
                                                        answers[q.id] === opt.option_text
                                                            ? "bg-blue-50 border-blue-200 text-blue-700"
                                                            : "bg-gray-50/50 border-gray-100 text-gray-600 hover:bg-gray-100"
                                                    )}
                                                >
                                                    {opt.option_text}
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <input
                                            value={answers[q.id] || ""}
                                            onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                                            placeholder="Your answer"
                                            className="w-full bg-gray-50/50 border border-gray-100 focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-50 rounded-[20px] p-4 text-sm font-bold outline-none transition-all"
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Error Display */}
                    {formError && (
                        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                            <p className="text-sm font-bold text-red-600">{formError}</p>
                        </div>
                    )}

                    {/* Submit */}
                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="w-full py-5 bg-gray-900 text-white rounded-[28px] font-black text-lg shadow-xl shadow-gray-200 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" /> Confirming...
                            </>
                        ) : (
                            <>
                                Confirm Registration <ChevronRight className="w-5 h-5" />
                            </>
                        )}
                    </button>
                </div>
            </main>
        </div>
    );
}
