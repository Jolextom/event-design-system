"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { Plus, ArrowLeft, ExternalLink, Rocket, Copy, Check, Send } from "lucide-react";
import DashboardGuard from "@/app/components/DashboardGuard";
import { CampaignQuestionCard } from "./CampaignQuestionCard";
import { SendCampaignModal } from "./SendCampaignModal";
import type { Campaign, Question } from "../../../events/[tag]/types";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function CampaignBuilderPage() {
    const params = useParams();
    const router = useRouter();
    const campaignId = params.id as string;

    const [campaign, setCampaign] = useState<Campaign | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);
    const [activePage, setActivePage] = useState(1);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [name, setName] = useState("");
    const [copied, setCopied] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [isSendModalOpen, setIsSendModalOpen] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        const [{ data: campaignData }, { data: questionData }] = await Promise.all([
            supabase.from("campaigns").select("*").eq("id", campaignId).single(),
            supabase.from("questions").select("*, options:question_options(*)").eq("campaign_id", campaignId).order("question_order"),
        ]);

        if (campaignData) {
            setCampaign(campaignData as Campaign);
            setName((campaignData as Campaign).name);
        }
        if (questionData) {
            setQuestions(questionData.map((q: any) => ({
                ...q,
                options: (q.options || []).sort((a: any, b: any) => a.display_order - b.display_order),
            })));
        }
        setLoading(false);
    }, [campaignId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const pageCount = useMemo(() => {
        return Math.max(1, ...questions.map(q => q.page || 1));
    }, [questions]);

    const questionsOnPage = useMemo(
        () => questions.filter(q => (q.page || 1) === activePage),
        [questions, activePage]
    );

    const handleAddQuestion = async () => {
        const nextOrder = questions.length;
        const { data, error } = await supabase.from("questions").insert({
            campaign_id: campaignId,
            event_id: null,
            title: "Untitled question",
            question_type: "text",
            is_required: false,
            question_order: nextOrder,
            page: activePage,
            is_selection_logic: false,
        }).select().single();

        if (!error && data) {
            setQuestions(prev => [...prev, { ...data, options: [] }]);
            setExpandedId(data.id);
        }
    };

    const handleAddPage = () => setActivePage(pageCount + 1);

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this question? Existing responses to it will remain but be orphaned.")) return;
        await supabase.from("questions").delete().eq("id", id);
        setQuestions(prev => prev.filter(q => q.id !== id));
    };

    const handleMove = (index: number, direction: "up" | "down") => {
        const pageQs = [...questionsOnPage];
        const swapIndex = direction === "up" ? index - 1 : index + 1;
        if (swapIndex < 0 || swapIndex >= pageQs.length) return;
        [pageQs[index], pageQs[swapIndex]] = [pageQs[swapIndex], pageQs[index]];

        // Recompute global order: questions on other pages keep relative order, this page reorders
        const others = questions.filter(q => (q.page || 1) !== activePage);
        const merged = [...others, ...pageQs];
        setQuestions(merged);

        Promise.all(
            pageQs.map((q, i) => supabase.from("questions").update({ question_order: i }).eq("id", q.id))
        ).catch(console.error);
    };

    const handleSaveName = async () => {
        if (!campaign || !name.trim() || name === campaign.name) return;
        await supabase.from("campaigns").update({ name: name.trim() }).eq("id", campaignId);
        setCampaign(prev => prev ? { ...prev, name: name.trim() } : prev);
    };

    const handlePublish = async () => {
        if (!campaign) return;
        setPublishing(true);
        const newStatus = campaign.status === "active" ? "draft" : "active";
        const { error } = await supabase.from("campaigns").update({ status: newStatus }).eq("id", campaignId);
        if (!error) setCampaign(prev => prev ? { ...prev, status: newStatus } : prev);
        setPublishing(false);
    };

    const publicUrl = typeof window !== "undefined" ? `${window.location.origin}/f/${campaignId}` : "";

    const handleCopyLink = () => {
        navigator.clipboard.writeText(publicUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (loading) {
        return (
            <DashboardGuard>
                <div className="min-h-screen flex items-center justify-center text-gray-400 font-bold">Loading campaign...</div>
            </DashboardGuard>
        );
    }

    if (!campaign) {
        return (
            <DashboardGuard>
                <div className="min-h-screen flex items-center justify-center text-gray-400 font-bold">Campaign not found.</div>
            </DashboardGuard>
        );
    }

    return (
        <DashboardGuard>
            <div className="min-h-screen bg-[var(--color-neutral-50)] py-12">
                <div className="max-w-3xl mx-auto space-y-8 px-4">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <button onClick={() => router.push("/campaigns")} className="flex items-center gap-2 text-xs font-black text-gray-400 hover:text-gray-700 transition-all">
                            <ArrowLeft className="w-4 h-4" /> All Campaigns
                        </button>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleCopyLink}
                                className="flex items-center gap-1.5 bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-xl text-xs font-black hover:bg-gray-50 transition-all"
                            >
                                {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                                {copied ? "Copied" : "Copy Link"}
                            </button>
                            <a href={publicUrl} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1.5 bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-xl text-xs font-black hover:bg-gray-50 transition-all">
                                <ExternalLink className="w-3.5 h-3.5" /> Preview
                            </a>
                            <button
                                onClick={handlePublish}
                                disabled={publishing || questions.length === 0}
                                className={`flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-black transition-all disabled:opacity-40 ${
                                    campaign.status === "active"
                                        ? "bg-gray-900 text-white hover:bg-black"
                                        : "bg-[var(--color-primary-700)] text-white hover:bg-[var(--color-primary-900)]"
                                }`}
                            >
                                <Rocket className="w-3.5 h-3.5" />
                                {campaign.status === "active" ? "Unpublish" : "Publish"}
                            </button>
                            {campaign.type === "event" && campaign.status === "active" && (
                                <button
                                    onClick={() => setIsSendModalOpen(true)}
                                    className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-black bg-emerald-600 text-white hover:bg-emerald-700 transition-all"
                                >
                                    <Send className="w-3.5 h-3.5" /> Send to Attendees
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Campaign name */}
                    <div className="bg-white border border-gray-100 rounded-3xl shadow-sm p-6">
                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            onBlur={handleSaveName}
                            className="w-full text-2xl font-black text-gray-900 outline-none bg-transparent"
                        />
                        <p className="text-xs text-gray-400 font-bold mt-1">
                            {campaign.type === "event" ? `Event campaign · ${campaign.trigger?.replace("_", " ")}` : "Standalone survey"}
                            {" · "}
                            <span className={campaign.status === "active" ? "text-green-600" : "text-gray-400"}>{campaign.status}</span>
                        </p>
                    </div>

                    {/* Page Tabs */}
                    {pageCount > 1 && (
                        <div className="flex items-center gap-2">
                            {Array.from({ length: pageCount }, (_, i) => i + 1).map(p => (
                                <button
                                    key={p}
                                    onClick={() => setActivePage(p)}
                                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                                        activePage === p ? "bg-gray-900 text-white" : "bg-white border border-gray-200 text-gray-500 hover:bg-gray-50"
                                    }`}
                                >
                                    Page {p}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Questions */}
                    <div className="space-y-3">
                        {questionsOnPage.map((q, index) => (
                            <CampaignQuestionCard
                                key={q.id}
                                question={q}
                                index={index}
                                total={questionsOnPage.length}
                                pageCount={pageCount}
                                isExpanded={expandedId === q.id}
                                onToggleExpand={() => setExpandedId(prev => prev === q.id ? null : q.id)}
                                onCollapseExpand={() => setExpandedId(null)}
                                onDelete={handleDelete}
                                onMoveUp={() => handleMove(index, "up")}
                                onMoveDown={() => handleMove(index, "down")}
                                onUpdated={fetchData}
                            />
                        ))}

                        {questionsOnPage.length === 0 && (
                            <div className="py-12 flex flex-col items-center gap-3 text-center bg-white border border-dashed border-gray-200 rounded-3xl">
                                <p className="text-sm font-bold text-gray-400">No questions on this page yet.</p>
                            </div>
                        )}
                    </div>

                    {/* Add Question / Add Page */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleAddQuestion}
                            className="flex-1 flex items-center justify-center gap-2 py-3.5 border-2 border-dashed border-gray-200 rounded-2xl text-xs font-black uppercase tracking-widest text-gray-400 hover:text-[var(--brand-blue)] hover:border-[var(--brand-blue)]/40 hover:bg-blue-50/30 transition-all"
                        >
                            <Plus className="w-4 h-4" /> Add Question
                        </button>
                        <button
                            onClick={handleAddPage}
                            className="px-5 py-3.5 border-2 border-dashed border-gray-200 rounded-2xl text-xs font-black uppercase tracking-widest text-gray-400 hover:text-gray-700 hover:border-gray-300 transition-all"
                        >
                            + Page
                        </button>
                    </div>
                </div>
            </div>

            {campaign.type === "event" && campaign.event_id && (
                <SendCampaignModal
                    isOpen={isSendModalOpen}
                    onClose={() => setIsSendModalOpen(false)}
                    campaignId={campaignId}
                    eventId={campaign.event_id}
                />
            )}
        </DashboardGuard>
    );
}
