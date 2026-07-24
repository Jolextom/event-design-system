"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { ArrowLeft, Download, Star, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Campaign, Question } from "../../../events/[tag]/types";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface FormResponseRow {
    id: string;
    attendee_id: string | null;
    email: string | null;
    submitted_at: string;
    attendee?: { first_name: string; last_name: string; email: string } | null;
}

interface FormAnswerRow {
    id: string;
    response_id: string;
    question_id: string;
    value: string | string[] | number;
}

const BAR_COLORS = ["bg-blue-500", "bg-indigo-500", "bg-purple-500", "bg-pink-500", "bg-amber-500", "bg-emerald-500", "bg-cyan-500"];

export default function CampaignResponsesPage() {
    const params = useParams();
    const router = useRouter();
    const campaignId = params.id as string;

    const [campaign, setCampaign] = useState<Campaign | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [responses, setResponses] = useState<FormResponseRow[]>([]);
    const [answers, setAnswers] = useState<FormAnswerRow[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setLoading(true);
        const [{ data: campaignData }, { data: questionData }, { data: responseData }] = await Promise.all([
            supabase.from("campaigns").select("*").eq("id", campaignId).single(),
            supabase.from("questions").select("*, options:question_options(*)").eq("campaign_id", campaignId).order("question_order"),
            supabase.from("form_responses").select("*, attendee:attendee_id(first_name, last_name, email)").eq("campaign_id", campaignId).order("submitted_at", { ascending: false }),
        ]);

        setCampaign(campaignData as Campaign);
        setQuestions((questionData || []).map((q: any) => ({
            ...q,
            options: (q.options || []).sort((a: any, b: any) => a.display_order - b.display_order),
        })));
        setResponses((responseData as FormResponseRow[]) || []);

        const responseIds = (responseData || []).map((r: any) => r.id);
        if (responseIds.length > 0) {
            const { data: answerData } = await supabase
                .from("form_answers")
                .select("*")
                .in("response_id", responseIds);
            setAnswers((answerData as FormAnswerRow[]) || []);
        } else {
            setAnswers([]);
        }
        setLoading(false);
    }, [campaignId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const answersByQuestion = useMemo(() => {
        const map: Record<string, FormAnswerRow[]> = {};
        for (const a of answers) {
            if (!map[a.question_id]) map[a.question_id] = [];
            map[a.question_id].push(a);
        }
        return map;
    }, [answers]);

    const answersByResponse = useMemo(() => {
        const map: Record<string, Record<string, string | string[] | number>> = {};
        for (const a of answers) {
            if (!map[a.response_id]) map[a.response_id] = {};
            map[a.response_id][a.question_id] = a.value;
        }
        return map;
    }, [answers]);

    const handleExportCSV = () => {
        if (!responses.length) return;
        const headers = ["Response ID", "Name", "Email", "Submitted At", ...questions.map(q => q.title)];
        const rows = responses.map(r => {
            const rAnswers = answersByResponse[r.id] || {};
            const name = r.attendee ? `${r.attendee.first_name} ${r.attendee.last_name}`.trim() : "";
            const email = r.attendee?.email || r.email || "";
            const row = [
                r.id,
                `"${name}"`,
                `"${email}"`,
                new Date(r.submitted_at).toLocaleString(),
                ...questions.map(q => {
                    const val = rAnswers[q.id];
                    const str = Array.isArray(val) ? val.join("; ") : (val ?? "");
                    return `"${String(str).replace(/"/g, '""')}"`;
                }),
            ];
            return row.join(",");
        });

        const csvContent = [headers.join(","), ...rows].join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${(campaign?.name || "campaign").replace(/\s+/g, "_")}_responses.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center text-gray-400 font-bold">Loading responses...</div>;
    }

    if (!campaign) {
        return <div className="min-h-screen flex items-center justify-center text-gray-400 font-bold">Campaign not found.</div>;
    }

    return (
        <div className="min-h-screen bg-[var(--color-neutral-50)] py-12">
            <div className="max-w-4xl mx-auto space-y-8 px-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <a href="/events/dashboard" className="flex items-center gap-2 text-xs font-black text-gray-300 hover:text-gray-600 transition-all">
                            <ArrowLeft className="w-4 h-4" /> Events Dashboard
                        </a>
                        <div className="w-px h-4 bg-gray-100" />
                        <button onClick={() => router.push("/campaigns")} className="flex items-center gap-2 text-xs font-black text-gray-400 hover:text-gray-700 transition-all">
                            All Campaigns
                        </button>
                    </div>
                    <button
                        onClick={handleExportCSV}
                        disabled={responses.length === 0}
                        className="flex items-center gap-1.5 bg-gray-900 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-black transition-all disabled:opacity-40"
                    >
                        <Download className="w-3.5 h-3.5" /> Export CSV
                    </button>
                </div>

                {/* Title + stats */}
                <div className="bg-white border border-gray-100 rounded-3xl shadow-sm p-8">
                    <h1 className="text-2xl font-black text-gray-900">{campaign.name}</h1>
                    <div className="flex items-center gap-2 mt-3 text-sm text-gray-500 font-bold">
                        <Users className="w-4 h-4" />
                        {responses.length} response{responses.length !== 1 ? "s" : ""}
                    </div>
                </div>

                {responses.length === 0 ? (
                    <div className="py-20 text-center bg-white border border-dashed border-gray-200 rounded-3xl">
                        <p className="text-sm font-bold text-gray-400">No responses yet.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {questions.map(q => {
                            const qAnswers = answersByQuestion[q.id] || [];
                            const isChoice = ["select", "dropdown", "checkbox"].includes(q.question_type);
                            const isScale = ["linear_scale", "star_rating"].includes(q.question_type);

                            return (
                                <div key={q.id} className="bg-white border border-gray-100 rounded-3xl shadow-sm p-8">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-sm font-black text-gray-900">{q.title}</h3>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-300">{qAnswers.length} answer{qAnswers.length !== 1 ? "s" : ""}</span>
                                    </div>

                                    {isChoice && (() => {
                                        const counts: Record<string, number> = {};
                                        (q.options || []).forEach(o => { counts[o.option_text] = 0; });
                                        qAnswers.forEach(a => {
                                            const vals = Array.isArray(a.value) ? a.value : [a.value];
                                            vals.forEach(v => {
                                                const key = String(v);
                                                counts[key] = (counts[key] || 0) + 1;
                                            });
                                        });
                                        const max = Math.max(1, ...Object.values(counts));
                                        return (
                                            <div className="space-y-3">
                                                {Object.entries(counts).map(([label, count], i) => (
                                                    <div key={label} className="space-y-1.5">
                                                        <div className="flex items-center justify-between text-xs font-bold text-gray-600">
                                                            <span>{label}</span>
                                                            <span>{count}</span>
                                                        </div>
                                                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                                            <div
                                                                className={cn("h-full rounded-full transition-all", BAR_COLORS[i % BAR_COLORS.length])}
                                                                style={{ width: `${(count / max) * 100}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    })()}

                                    {isScale && (() => {
                                        const nums = qAnswers.map(a => Number(a.value)).filter(n => !Number.isNaN(n));
                                        const avg = nums.length > 0 ? (nums.reduce((s, n) => s + n, 0) / nums.length) : 0;
                                        const distribution = [1, 2, 3, 4, 5].map(n => nums.filter(v => v === n).length);
                                        const max = Math.max(1, ...distribution);
                                        return (
                                            <div className="space-y-5">
                                                <div className="flex items-baseline gap-2">
                                                    <span className="text-3xl font-black text-gray-900">{avg.toFixed(1)}</span>
                                                    <span className="text-xs font-bold text-gray-400">average out of 5</span>
                                                    {q.question_type === "star_rating" && <Star className="w-4 h-4 fill-yellow-400 text-yellow-400 ml-1" />}
                                                </div>
                                                <div className="flex items-end gap-2 h-24">
                                                    {distribution.map((count, i) => (
                                                        <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                                                            <div className="w-full bg-gray-100 rounded-t-lg overflow-hidden flex items-end" style={{ height: "80px" }}>
                                                                <div
                                                                    className="w-full bg-blue-500 rounded-t-lg transition-all"
                                                                    style={{ height: `${(count / max) * 100}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-[10px] font-black text-gray-400">{i + 1}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {!isChoice && !isScale && (
                                        <div className="space-y-2 max-h-72 overflow-y-auto">
                                            {qAnswers.length === 0 && (
                                                <p className="text-xs text-gray-300 font-bold italic">No answers yet.</p>
                                            )}
                                            {qAnswers.map(a => (
                                                <div key={a.id} className="p-3 bg-gray-50 rounded-xl text-sm text-gray-700 font-medium">
                                                    {String(a.value)}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
