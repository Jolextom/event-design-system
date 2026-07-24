"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import { Plus, FileText, Send } from "lucide-react";
import { CreateCampaignModal } from "@/app/campaigns/CreateCampaignModal";
import type { Campaign } from "../types";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const STATUS_STYLES: Record<string, string> = {
    draft: "bg-gray-100 text-gray-500",
    active: "bg-green-50 text-green-700",
    closed: "bg-gray-50 text-gray-400",
};

interface CampaignsViewProps {
    eventId: string | null;
    createdBy: string | null;
}

export function CampaignsView({ eventId, createdBy }: CampaignsViewProps) {
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const fetchCampaigns = useCallback(async () => {
        if (!eventId) return;
        setLoading(true);
        const { data, error } = await supabase
            .from("campaigns")
            .select("*")
            .eq("event_id", eventId)
            .order("created_at", { ascending: false });
        if (!error) setCampaigns((data as Campaign[]) || []);
        setLoading(false);
    }, [eventId]);

    useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

    return (
        <div className="flex h-full overflow-hidden">
            <div className="flex-1 h-full overflow-y-auto bg-white custom-scrollbar">
                <div className="max-w-3xl p-8 md:p-10 mx-auto space-y-10 pb-24">
                    <header className="flex justify-between items-end border-b border-gray-100 pb-8 mt-4">
                        <div>
                            <h2 className="text-2xl font-black tracking-tight text-gray-900">Campaigns</h2>
                            <p className="text-sm text-gray-400 mt-1.5 font-bold">Pre-registration questions and post-event surveys for this event.</p>
                        </div>
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            disabled={!eventId}
                            className="bg-gray-900 text-white px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-gray-100 flex items-center gap-2 active:scale-95 disabled:opacity-40"
                        >
                            <Plus className="w-4 h-4" /> New Campaign
                        </button>
                    </header>

                    {loading ? (
                        <div className="space-y-4">
                            {[1, 2].map(i => (
                                <div key={i} className="h-24 bg-gray-50 border border-gray-100 rounded-[24px] animate-pulse" />
                            ))}
                        </div>
                    ) : campaigns.length === 0 ? (
                        <div className="py-20 flex flex-col items-center gap-4 text-center">
                            <div className="w-16 h-16 rounded-3xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-200">
                                <FileText className="w-8 h-8" />
                            </div>
                            <p className="text-sm font-bold text-gray-400">
                                No campaigns for this event yet.<br />
                                <span className="text-blue-500">Create one</span> to send a post-event survey or feedback form.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {campaigns.map(c => (
                                <div key={c.id} className="flex items-center justify-between bg-gray-50/50 border border-gray-100 rounded-[24px] px-6 py-5">
                                    <div className="flex flex-col gap-1">
                                        <div className="text-base font-black text-gray-900">{c.name}</div>
                                        <div className="text-xs text-gray-400 font-bold uppercase tracking-widest">
                                            {c.trigger?.replace("_", " ") || "manual"}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${STATUS_STYLES[c.status]}`}>
                                            {c.status}
                                        </span>
                                        <a href={`/campaigns/${c.id}/builder`} className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl font-black text-xs hover:bg-gray-50 transition-all uppercase tracking-widest flex items-center gap-1.5">
                                            <FileText className="w-3.5 h-3.5" /> Build
                                        </a>
                                        <a href={`/campaigns/${c.id}/responses`} className="bg-blue-50 text-blue-700 px-4 py-2 rounded-xl font-black text-xs hover:bg-blue-100 transition-all uppercase tracking-widest flex items-center gap-1.5">
                                            <Send className="w-3.5 h-3.5" /> Responses
                                        </a>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {eventId && createdBy && (
                <CreateCampaignModal
                    isOpen={isCreateModalOpen}
                    onClose={() => setIsCreateModalOpen(false)}
                    userId={createdBy}
                    fixedEventId={eventId}
                    onCreated={fetchCampaigns}
                />
            )}
        </div>
    );
}
