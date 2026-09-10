"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { Loader2, CheckCircle2, Star, ArrowRight, ArrowLeft, AlertCircle, HelpCircle, Check, Search, Menu, ChevronRight } from "lucide-react";
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
            <div className="min-h-screen flex flex-col items-center justify-center bg-white text-gray-900">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-3" />
                <p className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Loading Survey...</p>
            </div>
        );
    }

    if (notFound || !campaign) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white px-4 text-gray-900">
                <div className="bg-white border-2 border-gray-100 rounded-[32px] p-8 max-w-md w-full text-center shadow-lg">
                    <div className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-100">
                        <AlertCircle className="w-7 h-7" />
                    </div>
                    <h1 className="text-xl font-black text-gray-900 tracking-tight">Survey Not Available</h1>
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-2">
                        This survey link may be expired, closed, or incomplete.
                    </p>
                </div>
            </div>
        );
    }

    if (notPublished) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white px-4 text-gray-900">
                <div className="bg-white border-2 border-gray-100 rounded-[32px] p-8 max-w-md w-full text-center shadow-lg">
                    <div className="w-14 h-14 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-100">
                        <HelpCircle className="w-7 h-7" />
                    </div>
                    <h1 className="text-xl font-black text-gray-900 tracking-tight">Draft Survey</h1>
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-2">
                        "{campaign.name}" is currently in draft mode. Publish the campaign in the dashboard to make it active.
                    </p>
                </div>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white px-4 py-12 text-gray-900 selection:bg-blue-100">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white border-2 border-gray-100 rounded-[32px] p-8 sm:p-10 max-w-md w-full text-center shadow-xl"
                >
                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-[24px] flex items-center justify-center mx-auto mb-5 border border-blue-100">
                        <CheckCircle2 className="w-9 h-9" />
                    </div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Thank You!</h1>
                    <p className="text-sm font-bold text-gray-500 mt-3 leading-relaxed">
                        Your response has been successfully recorded. We appreciate your valuable insights!
                    </p>
                    <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                        <span>AI FOR AFRICA'S EDUCATION SUMMIT</span>
                    </div>
                </motion.div>
            </div>
        );
    }

    const isLastPage = resolveNextPage() > pageCount;

    return (
        <div className="min-h-screen bg-white text-[#111827] flex flex-col justify-between selection:bg-blue-100 relative">
            
            {/* Top Navigation Bar (Summit EventFlow style) */}
            <header className="w-full p-6 md:px-10 md:py-6 flex items-center justify-between z-50 bg-white/80 backdrop-blur-md sticky top-0 border-b border-gray-50">
                <div className="flex items-center gap-2 group cursor-pointer">
                    <div className="w-7 h-7 flex items-center justify-center font-black text-xs bg-red-50 text-red-600 rounded-lg border border-red-100">❤</div>
                    <span className="font-black tracking-tighter text-gray-900 text-base">EventFlow</span>
                </div>
                <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[9px] font-black uppercase tracking-[0.2em] rounded-full border border-blue-100">
                        Official Survey
                    </span>
                </div>
            </header>

            {/* Main Content Body */}
            <main className="flex-1 py-8 sm:py-14 px-4 flex flex-col items-center">
                <div className="max-w-2xl w-full space-y-8">
                    
                    {/* Campaign Header & Badges */}
                    <div className="text-center space-y-3">
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-blue-50 text-blue-600 text-[9px] font-black uppercase tracking-[0.2em] rounded-full border border-blue-100">
                            AI Readiness Survey
                        </div>
                        <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-gray-900 leading-tight">
                            {campaign.name}
                        </h1>
                        <p className="text-xs sm:text-sm font-bold text-gray-400 max-w-md mx-auto uppercase tracking-wider leading-relaxed">
                            Help us understand AI readiness across Lagos schools.
                        </p>
                    </div>

                    {/* Stepper Progress Bar */}
                    {pageCount > 1 && (
                        <div className="space-y-2 max-w-lg mx-auto">
                            <div className="flex items-center gap-1.5">
                                {Array.from({ length: pageCount }, (_, i) => i + 1).map(p => (
                                    <div 
                                        key={p} 
                                        className={cn(
                                            "h-1.5 flex-1 rounded-full transition-all duration-300",
                                            p <= currentPage ? "bg-blue-600" : "bg-gray-100"
                                        )} 
                                    />
                                ))}
                            </div>
                            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                                <span>Step {currentPage} of {pageCount}</span>
                                <span className="text-blue-600 font-black">{Math.round((currentPage / pageCount) * 100)}% Completed</span>
                            </div>
                        </div>
                    )}

                    {/* Error Banner */}
                    {error && (
                        <motion.div 
                            initial={{ opacity: 0, y: -6 }} 
                            animate={{ opacity: 1, y: 0 }}
                            className="p-4 bg-red-50 border-2 border-red-100 rounded-[20px] text-xs sm:text-sm text-red-600 font-black flex items-center gap-2.5 shadow-sm"
                        >
                            <AlertCircle className="w-4.5 h-4.5 shrink-0" />
                            <span>{error}</span>
                        </motion.div>
                    )}

                    {/* Questions Card */}
                    <div className="bg-white border-2 border-gray-100 rounded-[32px] p-6 sm:p-10 shadow-sm space-y-8">
                        {questionsOnPage.map((q) => (
                            <div key={q.id} className="space-y-4">
                                <label className="text-base sm:text-lg font-black text-gray-900 block leading-snug tracking-tight">
                                    {q.title} {q.is_required && <span className="text-blue-600">*</span>}
                                </label>

                                {/* Text Input */}
                                {q.question_type === "text" && (
                                    <input
                                        type="text"
                                        value={(answers[q.id] as string) || ""}
                                        onChange={(e) => setAnswer(q.id, e.target.value)}
                                        placeholder="Type your response here..."
                                        className="w-full bg-gray-50/50 border-2 border-gray-100 rounded-[20px] px-5 py-4 text-sm font-semibold text-gray-900 placeholder:text-gray-400 outline-none focus:border-blue-600 focus:bg-white transition-all"
                                    />
                                )}

                                {/* Long Text Input */}
                                {q.question_type === "long_text" && (
                                    <textarea
                                        rows={4}
                                        value={(answers[q.id] as string) || ""}
                                        onChange={(e) => setAnswer(q.id, e.target.value)}
                                        placeholder="Type your response here..."
                                        className="w-full bg-gray-50/50 border-2 border-gray-100 rounded-[20px] px-5 py-4 text-sm font-semibold text-gray-900 placeholder:text-gray-400 outline-none focus:border-blue-600 focus:bg-white transition-all resize-none"
                                    />
                                )}

                                {/* Dropdown or Select */}
                                {q.question_type === "dropdown" && (
                                    <select
                                        value={(answers[q.id] as string) || ""}
                                        onChange={(e) => setAnswer(q.id, e.target.value)}
                                        className="w-full bg-gray-50/50 border-2 border-gray-100 rounded-[20px] px-5 py-4 text-sm font-semibold text-gray-900 outline-none focus:border-blue-600 focus:bg-white transition-all"
                                    >
                                        <option value="" disabled className="text-gray-400">Select an option...</option>
                                        {q.options?.map(opt => (
                                            <option key={opt.id} value={opt.option_text} className="text-gray-900">
                                                {opt.option_text}
                                            </option>
                                        ))}
                                    </select>
                                )}

                                {/* Radio Options (Select) */}
                                {q.question_type === "select" && (
                                    <div className="space-y-3">
                                        {q.options?.map(opt => {
                                            const isSelected = answers[q.id] === opt.option_text;
                                            return (
                                                <button
                                                    key={opt.id}
                                                    type="button"
                                                    onClick={() => setAnswer(q.id, opt.option_text)}
                                                    className={cn(
                                                        "w-full text-left p-5 rounded-[24px] border-2 transition-all flex items-center justify-between gap-3 group",
                                                        isSelected 
                                                            ? "bg-blue-50/50 border-blue-600 shadow-sm" 
                                                            : "bg-white border-gray-100 hover:border-gray-200"
                                                    )}
                                                >
                                                    <span className={cn("text-sm font-black transition-colors", isSelected ? "text-blue-700" : "text-gray-900")}>
                                                        {opt.option_text}
                                                    </span>
                                                    <div className={cn(
                                                        "w-7 h-7 rounded-xl flex items-center justify-center transition-colors shrink-0",
                                                        isSelected ? "bg-blue-600 text-white" : "bg-gray-50 text-gray-300 group-hover:bg-blue-50 group-hover:text-blue-500"
                                                    )}>
                                                        {isSelected ? <Check className="w-4 h-4 stroke-[3]" /> : <ChevronRight className="w-4 h-4" />}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Multi-select Checkboxes */}
                                {q.question_type === "checkbox" && (
                                    <div className="space-y-3">
                                        {q.options?.map(opt => {
                                            const checked = ((answers[q.id] as string[]) || []).includes(opt.option_text);
                                            return (
                                                <button
                                                    key={opt.id}
                                                    type="button"
                                                    onClick={() => toggleCheckbox(q.id, opt.option_text)}
                                                    className={cn(
                                                        "w-full text-left p-5 rounded-[24px] border-2 transition-all flex items-center justify-between gap-3 group",
                                                        checked 
                                                            ? "bg-blue-50/50 border-blue-600 shadow-sm" 
                                                            : "bg-white border-gray-100 hover:border-gray-200"
                                                    )}
                                                >
                                                    <span className={cn("text-sm font-black transition-colors", checked ? "text-blue-700" : "text-gray-900")}>
                                                        {opt.option_text}
                                                    </span>
                                                    <div className={cn(
                                                        "w-7 h-7 rounded-xl flex items-center justify-center transition-colors shrink-0",
                                                        checked ? "bg-blue-600 text-white" : "bg-gray-50 text-gray-300 group-hover:bg-blue-50 group-hover:text-blue-500"
                                                    )}>
                                                        {checked ? <Check className="w-4 h-4 stroke-[3]" /> : <ChevronRight className="w-4 h-4" />}
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
                                                            "flex-1 py-4 rounded-[20px] border-2 text-sm font-black transition-all",
                                                            answers[q.id] === n 
                                                                ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20" 
                                                                : "bg-white border-gray-100 text-gray-700 hover:border-gray-200 hover:bg-gray-50"
                                                        )}
                                                    >
                                                        {n}
                                                    </button>
                                                ))}
                                            </div>
                                            {(q.scale_config?.min_label || q.scale_config?.max_label) && (
                                                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">
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
                                                    className="p-2 rounded-2xl hover:bg-gray-50 transition-all group"
                                                >
                                                    <Star className={cn(
                                                        "w-8 h-8 transition-all", 
                                                        n <= val ? "fill-amber-400 text-amber-400 scale-110" : "text-gray-200 group-hover:text-amber-300"
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
                            <div className="space-y-3 pt-4 border-t border-gray-100">
                                <label className="text-sm font-black text-gray-900 block">
                                    Your Email Address <span className="text-gray-400 font-bold text-xs uppercase tracking-wider">(optional)</span>
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    className="w-full bg-gray-50/50 border-2 border-gray-100 rounded-[20px] px-5 py-4 text-sm font-semibold text-gray-900 placeholder:text-gray-400 outline-none focus:border-blue-600 focus:bg-white transition-all"
                                />
                            </div>
                        )}

                        {/* Bottom Actions */}
                        <div className="flex items-center gap-3 pt-6 border-t border-gray-100">
                            {currentPage > 1 && (
                                <button 
                                    onClick={handleBack} 
                                    className="flex items-center gap-2 px-6 py-4 rounded-[24px] text-xs font-black text-gray-600 bg-gray-50 border-2 border-gray-100 hover:bg-gray-100 transition-all uppercase tracking-widest"
                                >
                                    <ArrowLeft className="w-4 h-4" /> Back
                                </button>
                            )}
                            <button
                                onClick={handleNext}
                                disabled={submitting}
                                className="flex-1 flex items-center justify-center gap-2 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-[24px] text-xs sm:text-sm font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20 active:scale-[0.99] disabled:opacity-50"
                            >
                                {submitting ? (
                                    <Loader2 className="w-5 h-5 animate-spin text-white" />
                                ) : (
                                    <>{isLastPage ? "Submit Survey" : "Next"} <ArrowRight className="w-4 h-4" /></>
                                )}
                            </button>
                        </div>
                    </div>

                </div>
            </main>

            {/* Footer */}
            <footer className="w-full border-t border-gray-100 bg-white py-8 px-4 text-gray-400 text-xs">
                <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <span className="font-black tracking-tighter text-gray-900 text-sm">EventFlow</span>
                    </div>
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                        AI FOR AFRICA'S EDUCATION SUMMIT 2026
                    </div>
                </div>
            </footer>

        </div>
    );
}


