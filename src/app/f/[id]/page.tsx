"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { Loader2, CheckCircle2, Star, ArrowRight, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Campaign, Question } from "../../events/[tag]/types";

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

    const [currentPage, setCurrentPage] = useState(1);
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
                .eq("status", "active")
                .single();

            if (cErr || !campaignData) { setNotFound(true); setLoading(false); return; }

            const { data: questionData } = await supabase
                .from("questions")
                .select("*, options:question_options(*)")
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
        // Any answered choice-type question on this page with a matching logic rule wins (first match)
        for (const q of questionsOnPage) {
            if (!q.logic_rules || q.logic_rules.length === 0) continue;
            const answer = answers[q.id];
            const answerStr = Array.isArray(answer) ? answer[0] : answer;
            const rule = q.logic_rules.find(r => r.if_equals === answerStr);
            if (rule) return rule.go_to_page;
        }
        return currentPage + 1;
    };

    const handleNext = () => {
        const validationError = validatePage();
        if (validationError) { setError(validationError); return; }
        setError(null);
        const next = resolveNextPage();
        if (next <= pageCount) {
            setCurrentPage(next);
        } else {
            handleSubmit();
        }
    };

    const handleBack = () => {
        setError(null);
        setCurrentPage(prev => Math.max(1, prev - 1));
    };

    const handleSubmit = async () => {
        const validationError = validatePage();
        if (validationError) { setError(validationError); return; }

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
        } catch (err: any) {
            setError(err.message || "Something went wrong. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
            </div>
        );
    }

    if (notFound || !campaign) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
                <div className="text-center">
                    <h1 className="text-lg font-black text-gray-900">Form not available</h1>
                    <p className="text-sm text-gray-400 font-bold mt-1">This form may have been closed or the link is incorrect.</p>
                </div>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
                <div className="text-center max-w-sm">
                    <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="w-8 h-8 text-green-500" />
                    </div>
                    <h1 className="text-lg font-black text-gray-900">Thank you!</h1>
                    <p className="text-sm text-gray-400 font-bold mt-1">Your response has been recorded.</p>
                </div>
            </div>
        );
    }

    const isLastPage = resolveNextPage() > pageCount;

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4">
            <div className="max-w-lg mx-auto space-y-6">
                {/* Progress */}
                {pageCount > 1 && (
                    <div className="flex items-center gap-1.5">
                        {Array.from({ length: pageCount }, (_, i) => i + 1).map(p => (
                            <div key={p} className={cn("h-1.5 flex-1 rounded-full transition-all", p <= currentPage ? "bg-[var(--brand-blue,#2563eb)]" : "bg-gray-200")} />
                        ))}
                    </div>
                )}

                {/* Header */}
                <div className="bg-white border border-gray-100 rounded-3xl shadow-sm p-8">
                    <h1 className="text-xl font-black text-gray-900">{campaign.name}</h1>
                </div>

                {error && (
                    <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-sm text-red-600 font-bold">{error}</div>
                )}

                {/* Questions */}
                <div className="space-y-4">
                    {questionsOnPage.map(q => (
                        <div key={q.id} className="bg-white border border-gray-100 rounded-3xl shadow-sm p-6 space-y-3">
                            <label className="text-sm font-black text-gray-900 block">
                                {q.title} {q.is_required && <span className="text-red-500">*</span>}
                            </label>

                            {q.question_type === "text" && (
                                <input
                                    value={(answers[q.id] as string) || ""}
                                    onChange={(e) => setAnswer(q.id, e.target.value)}
                                    placeholder="Your answer"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-[var(--brand-blue,#2563eb)] focus:ring-2 focus:ring-blue-100 transition-all"
                                />
                            )}

                            {q.question_type === "long_text" && (
                                <textarea
                                    rows={4}
                                    value={(answers[q.id] as string) || ""}
                                    onChange={(e) => setAnswer(q.id, e.target.value)}
                                    placeholder="Your answer"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-[var(--brand-blue,#2563eb)] focus:ring-2 focus:ring-blue-100 transition-all resize-none"
                                />
                            )}

                            {q.question_type === "select" && (
                                <div className="space-y-2">
                                    {q.options?.map(opt => (
                                        <button
                                            key={opt.id}
                                            type="button"
                                            onClick={() => setAnswer(q.id, opt.option_text)}
                                            className={cn(
                                                "w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-bold transition-all",
                                                answers[q.id] === opt.option_text ? "bg-blue-50 border-[var(--brand-blue,#2563eb)] text-gray-900" : "bg-gray-50 border-gray-100 text-gray-600 hover:border-gray-200"
                                            )}
                                        >
                                            {opt.option_text}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {q.question_type === "dropdown" && (
                                <select
                                    value={(answers[q.id] as string) || ""}
                                    onChange={(e) => setAnswer(q.id, e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-[var(--brand-blue,#2563eb)] focus:ring-2 focus:ring-blue-100 transition-all"
                                >
                                    <option value="" disabled>Select an option</option>
                                    {q.options?.map(opt => (
                                        <option key={opt.id} value={opt.option_text}>{opt.option_text}</option>
                                    ))}
                                </select>
                            )}

                            {q.question_type === "checkbox" && (
                                <div className="space-y-2">
                                    {q.options?.map(opt => {
                                        const checked = ((answers[q.id] as string[]) || []).includes(opt.option_text);
                                        return (
                                            <button
                                                key={opt.id}
                                                type="button"
                                                onClick={() => toggleCheckbox(q.id, opt.option_text)}
                                                className={cn(
                                                    "w-full flex items-center gap-3 text-left px-4 py-3 rounded-xl border-2 text-sm font-bold transition-all",
                                                    checked ? "bg-blue-50 border-[var(--brand-blue,#2563eb)] text-gray-900" : "bg-gray-50 border-gray-100 text-gray-600 hover:border-gray-200"
                                                )}
                                            >
                                                <div className={cn("w-4 h-4 rounded-md border-2 flex items-center justify-center shrink-0", checked ? "bg-[var(--brand-blue,#2563eb)] border-[var(--brand-blue,#2563eb)]" : "border-gray-300")}>
                                                    {checked && <CheckCircle2 className="w-3 h-3 text-white" />}
                                                </div>
                                                {opt.option_text}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            {q.question_type === "linear_scale" && (
                                <div className="flex items-center gap-2">
                                    {[1, 2, 3, 4, 5].map(n => (
                                        <button
                                            key={n}
                                            type="button"
                                            onClick={() => setAnswer(q.id, n)}
                                            className={cn(
                                                "flex-1 py-3 rounded-xl border-2 text-sm font-black transition-all",
                                                answers[q.id] === n ? "bg-blue-50 border-[var(--brand-blue,#2563eb)] text-gray-900" : "bg-gray-50 border-gray-100 text-gray-500 hover:border-gray-200"
                                            )}
                                        >
                                            {n}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {q.question_type === "star_rating" && (
                                <div className="flex items-center gap-1.5">
                                    {[1, 2, 3, 4, 5].map(n => {
                                        const val = (answers[q.id] as number) || 0;
                                        return (
                                            <button key={n} type="button" onClick={() => setAnswer(q.id, n)} className="p-1">
                                                <Star className={cn("w-7 h-7 transition-all", n <= val ? "fill-yellow-400 text-yellow-400" : "text-gray-200")} />
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Email capture (anonymous respondents, last page only) */}
                    {!attendeeId && isLastPage && (
                        <div className="bg-white border border-gray-100 rounded-3xl shadow-sm p-6 space-y-3">
                            <label className="text-sm font-black text-gray-900 block">Email <span className="text-gray-400 font-bold text-xs">(optional)</span></label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-[var(--brand-blue,#2563eb)] focus:ring-2 focus:ring-blue-100 transition-all"
                            />
                        </div>
                    )}
                </div>

                {/* Navigation */}
                <div className="flex items-center gap-3">
                    {currentPage > 1 && (
                        <button onClick={handleBack} className="flex items-center gap-1.5 px-5 py-3.5 rounded-2xl text-xs font-black text-gray-500 hover:bg-gray-100 transition-all">
                            <ArrowLeft className="w-4 h-4" /> Back
                        </button>
                    )}
                    <button
                        onClick={handleNext}
                        disabled={submitting}
                        className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-gray-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-black transition-all disabled:opacity-50"
                    >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                            <>{isLastPage ? "Submit" : "Next"} <ArrowRight className="w-4 h-4" /></>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
