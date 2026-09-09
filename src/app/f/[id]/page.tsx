"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { Loader2, CheckCircle2, Star, ArrowRight, ArrowLeft, AlertCircle, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Campaign, Question } from "../../events/[tag]/types";
import { motion } from "framer-motion";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type AnswerValue = string | string[] | number;

export default function PublicFormPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const campaignId = params.id as string;
    const attendeeId = searchParams.get("attendee") || undefined;

    const [campaign, setCampaign] = useState<Campaign | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [notPublished, setNotPublished] = useState(false);

    const [currentPage, setCurrentPage] = useState(1);
    const [pageHistory, setPageHistory] = useState<number[]>([]);
    const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
    const [email, setEmail] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            const { data: campaignData, error: cErr } = await supabase
                .from("campaigns")
                .select("*")
                .eq("id", campaignId)
                .single();

            if (cErr || !campaignData) {
                setNotFound(true);
                setLoading(false);
                return;
            }

            if (campaignData.status !== "active") {
                setCampaign(campaignData as Campaign);
                setNotPublished(true);
                setLoading(false);
                return;
            }

            const { data: questionData } = await supabase
                .from("questions")
                .select("*, options:question_options!question_options_question_id_fkey(*)")
                .eq("campaign_id", campaignId)
                .order("question_order");

            setCampaign(campaignData as Campaign);
            setQuestions((questionData || []).map((q: any) => ({
                ...q,
                options: (q.options || []).sort((a: any, b: any) => a.display_order - b.display_order),
            })));
            setLoading(false);
        };
        load();
    }, [campaignId]);

    const pageCount = useMemo(() => Math.max(1, ...questions.map(q => q.page || 1)), [questions]);
    const questionsOnPage = useMemo(
        () => questions.filter(q => (q.page || 1) === currentPage),
        [questions, currentPage]
    );

    const setAnswer = (questionId: string, value: AnswerValue) => {
        setAnswers(prev => ({ ...prev, [questionId]: value }));
    };

    const toggleCheckbox = (questionId: string, optionText: string) => {
        setAnswers(prev => {
            const current = (prev[questionId] as string[]) || [];
            const next = current.includes(optionText)
                ? current.filter(v => v !== optionText)
                : [...current, optionText];
            return { ...prev, [questionId]: next };
        });
    };

    const validatePage = (): string | null => {
        for (const q of questionsOnPage) {
            if (!q.is_required) continue;
            const val = answers[q.id];
            const isEmpty = val === undefined || val === "" || (Array.isArray(val) && val.length === 0);
            if (isEmpty) return `Please answer: ${q.title}`;
        }
        return null;
    };

    const resolveNextPage = (): number => {
        for (const q of questionsOnPage) {
            if (!q.logic_rules || q.logic_rules.length === 0) continue;
            const answer = answers[q.id];
            const answerStr = Array.isArray(answer) ? answer[0] : answer;
            const rule = q.logic_rules.find(r => r.if_equals === answerStr) || q.logic_rules.find(r => r.if_equals === "*");
            if (rule) return rule.go_to_page;
        }
        return currentPage + 1;
    };

    const handleNext = () => {
        const validationError = validatePage();
        if (validationError) {
            setError(validationError);
            return;
        }
        setError(null);
        const next = resolveNextPage();
        if (next <= pageCount) {
            setPageHistory(prev => [...prev, currentPage]);
            setCurrentPage(next);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            handleSubmit();
        }
    };

    const handleBack = () => {
        setError(null);
        setPageHistory(prev => {
            if (prev.length === 0) {
                setCurrentPage(p => Math.max(1, p - 1));
                return prev;
            }
            const next = [...prev];
            const previousPage = next.pop()!;
            setCurrentPage(previousPage);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return next;
        });
    };

    const handleSubmit = async () => {
        const validationError = validatePage();
        if (validationError) {
            setError(validationError);
            return;
        }

        setSubmitting(true);
        setError(null);
        try {
            const res = await fetch(`/api/forms/${campaignId}/submit`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ attendeeId, email: email || undefined, answers }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "Failed to submit");
            setSubmitted(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err: any) {
            setError(err.message || "Something went wrong. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC]">
                <Loader2 className="w-8 h-8 animate-spin text-[#1255FB] mb-3" />
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Loading Survey...</p>
            </div>
        );
    }

    if (notFound || !campaign) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] px-4">
                <div className="bg-white border border-slate-200/80 rounded-3xl p-8 max-w-md w-full text-center shadow-xl shadow-slate-200/50">
                    <div className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="w-7 h-7" />
                    </div>
                    <h1 className="text-lg font-bold text-slate-900">Survey Not Found</h1>
                    <p className="text-sm text-slate-500 font-medium mt-2">
                        This link may be expired, closed, or incomplete.
                    </p>
                </div>
            </div>
        );
    }

    if (notPublished) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] px-4">
                <div className="bg-white border border-slate-200/80 rounded-3xl p-8 max-w-md w-full text-center shadow-xl shadow-slate-200/50">
                    <div className="w-14 h-14 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <HelpCircle className="w-7 h-7" />
                    </div>
                    <h1 className="text-lg font-bold text-slate-900">Draft Survey</h1>
                    <p className="text-sm text-slate-500 font-medium mt-2">
                        "{campaign.name}" is currently in draft mode. Publish the campaign in the dashboard to make it active.
                    </p>
                </div>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] px-4 py-12">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white border border-slate-200/80 rounded-3xl p-8 sm:p-10 max-w-md w-full text-center shadow-xl shadow-slate-200/50"
                >
                    <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-inner">
                        <CheckCircle2 className="w-9 h-9" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Thank You!</h1>
                    <p className="text-sm text-slate-600 font-medium mt-2 leading-relaxed">
                        Your response has been successfully recorded. We appreciate your insights!
                    </p>
                    <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-center gap-2 text-xs font-bold text-slate-400">
                        <span>AI FOR AFRICA'S EDUCATION SUMMIT</span>
                        <span>•</span>
                        <span className="text-[#1255FB]">KINI AI</span>
                    </div>
                </motion.div>
            </div>
        );
    }

    const isLastPage = resolveNextPage() > pageCount;
    const progressPercent = Math.round((currentPage / pageCount) * 100);

    return (
        <div className="min-h-screen bg-[#F8FAFC] py-8 sm:py-14 px-4 relative overflow-hidden" style={{
            backgroundImage: "radial-gradient(circle at 50% 0%, rgba(18, 85, 251, 0.08) 0%, rgba(248, 250, 252, 1) 70%)"
        }}>
            <div className="max-w-xl mx-auto space-y-6 relative z-10">
                
                {/* Brand Banner Badge */}
                <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#1255FB] animate-pulse" />
                        <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                            AI FOR AFRICA'S EDUCATION SUMMIT
                        </span>
                    </div>
                    <span className="text-[11px] font-extrabold text-[#1255FB] tracking-wide">
                        KINI AI
                    </span>
                </div>

                {/* Progress Bar */}
                {pageCount > 1 && (
                    <div className="bg-white/80 backdrop-blur border border-slate-200/80 rounded-2xl p-4 shadow-sm">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-600 mb-2">
                            <span>Step {currentPage} of {pageCount}</span>
                            <span className="text-[#1255FB]">{progressPercent}%</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-[#1255FB] rounded-full transition-all duration-500 ease-out"
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Main Card Header */}
                <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm">
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-snug">
                        {campaign.name}
                    </h1>
                </div>

                {/* Error Banner */}
                {error && (
                    <motion.div 
                        initial={{ opacity: 0, y: -6 }} 
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 bg-red-50/90 border border-red-200 rounded-2xl text-xs sm:text-sm text-red-600 font-semibold flex items-center gap-2.5 shadow-sm"
                    >
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{error}</span>
                    </motion.div>
                )}

                {/* Questions List */}
                <div className="space-y-4">
                    {questionsOnPage.map((q) => (
                        <div key={q.id} className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-7 shadow-sm space-y-4">
                            <label className="text-sm sm:text-base font-bold text-slate-900 block leading-snug">
                                {q.title} {q.is_required && <span className="text-red-500 font-bold">*</span>}
                            </label>

                            {/* Text Input */}
                            {q.question_type === "text" && (
                                <input
                                    type="text"
                                    value={(answers[q.id] as string) || ""}
                                    onChange={(e) => setAnswer(q.id, e.target.value)}
                                    placeholder="Type your response here..."
                                    className="w-full bg-slate-50/80 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm font-medium text-slate-900 outline-none focus:bg-white focus:border-[#1255FB] focus:ring-4 focus:ring-blue-500/10 transition-all"
                                />
                            )}

                            {/* Long Text Input */}
                            {q.question_type === "long_text" && (
                                <textarea
                                    rows={4}
                                    value={(answers[q.id] as string) || ""}
                                    onChange={(e) => setAnswer(q.id, e.target.value)}
                                    placeholder="Type your response here..."
                                    className="w-full bg-slate-50/80 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm font-medium text-slate-900 outline-none focus:bg-white focus:border-[#1255FB] focus:ring-4 focus:ring-blue-500/10 transition-all resize-none"
                                />
                            )}

                            {/* Single Select (Radio options) */}
                            {q.question_type === "select" && (
                                <div className="space-y-2.5">
                                    {q.options?.map(opt => {
                                        const isSelected = answers[q.id] === opt.option_text;
                                        return (
                                            <button
                                                key={opt.id}
                                                type="button"
                                                onClick={() => setAnswer(q.id, opt.option_text)}
                                                className={cn(
                                                    "w-full text-left px-4 py-3.5 rounded-2xl border-2 text-xs sm:text-sm font-semibold transition-all flex items-center justify-between gap-3",
                                                    isSelected 
                                                        ? "bg-blue-50/80 border-[#1255FB] text-[#00133F] shadow-sm ring-2 ring-blue-500/10" 
                                                        : "bg-slate-50/50 border-slate-200/80 text-slate-700 hover:bg-slate-100/80 hover:border-slate-300"
                                                )}
                                            >
                                                <span>{opt.option_text}</span>
                                                <div className={cn(
                                                    "w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                                                    isSelected ? "border-[#1255FB] bg-[#1255FB]" : "border-slate-300"
                                                )}>
                                                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Dropdown */}
                            {q.question_type === "dropdown" && (
                                <select
                                    value={(answers[q.id] as string) || ""}
                                    onChange={(e) => setAnswer(q.id, e.target.value)}
                                    className="w-full bg-slate-50/80 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm font-medium text-slate-900 outline-none focus:bg-white focus:border-[#1255FB] focus:ring-4 focus:ring-blue-500/10 transition-all"
                                >
                                    <option value="" disabled>Select an option...</option>
                                    {q.options?.map(opt => (
                                        <option key={opt.id} value={opt.option_text}>{opt.option_text}</option>
                                    ))}
                                </select>
                            )}

                            {/* Multi-select Checkbox */}
                            {q.question_type === "checkbox" && (
                                <div className="space-y-2.5">
                                    {q.options?.map(opt => {
                                        const checked = ((answers[q.id] as string[]) || []).includes(opt.option_text);
                                        return (
                                            <button
                                                key={opt.id}
                                                type="button"
                                                onClick={() => toggleCheckbox(q.id, opt.option_text)}
                                                className={cn(
                                                    "w-full flex items-center justify-between text-left px-4 py-3.5 rounded-2xl border-2 text-xs sm:text-sm font-semibold transition-all",
                                                    checked 
                                                        ? "bg-blue-50/80 border-[#1255FB] text-[#00133F] shadow-sm ring-2 ring-blue-500/10" 
                                                        : "bg-slate-50/50 border-slate-200/80 text-slate-700 hover:bg-slate-100/80 hover:border-slate-300"
                                                )}
                                            >
                                                <span>{opt.option_text}</span>
                                                <div className={cn(
                                                    "w-4 h-4 rounded-md border-2 flex items-center justify-center shrink-0 transition-all",
                                                    checked ? "bg-[#1255FB] border-[#1255FB]" : "border-slate-300"
                                                )}>
                                                    {checked && <CheckCircle2 className="w-3 h-3 text-white" />}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Linear Scale */}
                            {q.question_type === "linear_scale" && (() => {
                                const min = q.scale_config?.min ?? 1;
                                const max = q.scale_config?.max ?? 5;
                                const values = Array.from({ length: Math.max(1, max - min + 1) }, (_, i) => min + i);
                                return (
                                    <div className="space-y-3 pt-1">
                                        <div className="flex items-center gap-2">
                                            {values.map(n => (
                                                <button
                                                    key={n}
                                                    type="button"
                                                    onClick={() => setAnswer(q.id, n)}
                                                    className={cn(
                                                        "flex-1 py-3 rounded-xl border-2 text-sm font-bold transition-all",
                                                        answers[q.id] === n 
                                                            ? "bg-[#1255FB] border-[#1255FB] text-white shadow-md shadow-blue-500/20" 
                                                            : "bg-slate-50/80 border-slate-200/80 text-slate-700 hover:border-slate-300"
                                                    )}
                                                >
                                                    {n}
                                                </button>
                                            ))}
                                        </div>
                                        {(q.scale_config?.min_label || q.scale_config?.max_label) && (
                                            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 px-1">
                                                <span>{q.scale_config?.min_label}</span>
                                                <span>{q.scale_config?.max_label}</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}

                            {/* Star Rating */}
                            {q.question_type === "star_rating" && (() => {
                                const min = q.scale_config?.min ?? 1;
                                const max = q.scale_config?.max ?? 5;
                                const values = Array.from({ length: Math.max(1, max - min + 1) }, (_, i) => min + i);
                                const val = (answers[q.id] as number) || 0;
                                return (
                                    <div className="flex items-center gap-2 py-1">
                                        {values.map(n => (
                                            <button 
                                                key={n} 
                                                type="button" 
                                                onClick={() => setAnswer(q.id, n)} 
                                                className="p-1.5 rounded-xl hover:bg-amber-50 transition-all group"
                                            >
                                                <Star className={cn(
                                                    "w-8 h-8 transition-all", 
                                                    n <= val ? "fill-amber-400 text-amber-400 scale-110" : "text-slate-200 group-hover:text-amber-200"
                                                )} />
                                            </button>
                                        ))}
                                    </div>
                                );
                            })()}
                        </div>
                    ))}

                    {/* Anonymous Email Capture */}
                    {!attendeeId && isLastPage && (
                        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-7 shadow-sm space-y-3">
                            <label className="text-sm font-bold text-slate-900 block">
                                Your Email Address <span className="text-slate-400 font-medium text-xs">(optional)</span>
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                className="w-full bg-slate-50/80 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm font-medium text-slate-900 outline-none focus:bg-white focus:border-[#1255FB] focus:ring-4 focus:ring-blue-500/10 transition-all"
                            />
                        </div>
                    )}
                </div>

                {/* Bottom Navigation */}
                <div className="flex items-center gap-3 pt-2">
                    {currentPage > 1 && (
                        <button 
                            onClick={handleBack} 
                            className="flex items-center gap-2 px-5 py-3.5 rounded-2xl text-xs font-bold text-slate-600 bg-white border border-slate-200/80 hover:bg-slate-50 transition-all shadow-sm"
                        >
                            <ArrowLeft className="w-4 h-4" /> Back
                        </button>
                    )}
                    <button
                        onClick={handleNext}
                        disabled={submitting}
                        className="flex-1 flex items-center justify-center gap-2 py-4 bg-[#1255FB] hover:bg-[#0047E1] text-white rounded-2xl text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-blue-500/20 active:scale-[0.99] disabled:opacity-50"
                    >
                        {submitting ? (
                            <Loader2 className="w-4 h-4 animate-spin text-white" />
                        ) : (
                            <>{isLastPage ? "Submit Survey" : "Next Step"} <ArrowRight className="w-4 h-4" /></>
                        )}
                    </button>
                </div>

                {/* Footer Attribution */}
                <div className="text-center pt-6 text-[11px] font-bold text-slate-400 tracking-wider">
                    AI FOR AFRICA'S EDUCATION SUMMIT &middot; KINI AI
                </div>

            </div>
        </div>
    );
}

