"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import DashboardGuard from "@/app/components/DashboardGuard";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Plus, Calendar, Globe, FileText } from "lucide-react";
import { CreateCampaignModal } from "./CreateCampaignModal";
import type { Campaign } from "../events/[tag]/types";

interface CampaignWithEvent extends Campaign {
    event?: { event_title: string; tag: string | null } | null;
}

const STATUS_STYLES: Record<string, string> = {
    draft: "bg-gray-100 text-gray-500",
    active: "bg-green-50 text-green-700",
    closed: "bg-gray-50 text-gray-400",
};

export default function CampaignsPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [campaigns, setCampaigns] = useState<CampaignWithEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const fetchCampaigns = async () => {
        if (!user) return;
        setLoading(true);
        const { data, error } = await supabase
            .from("campaigns")
            .select("*, event:event_id(event_title, tag)")
            .eq("created_by", user.id)
            .order("created_at", { ascending: false });
        if (!error) setCampaigns((data as CampaignWithEvent[]) || []);
        setLoading(false);
    };

    useEffect(() => {
        fetchCampaigns();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    const handleCampaignCreated = (campaign: Campaign) => {
        router.push(`/campaigns/${campaign.id}/builder`);
    };

    return (
        <DashboardGuard>
            <div className="min-h-screen bg-[var(--color-neutral-50)] flex flex-col items-center py-16">
                <div className="w-full max-w-4xl space-y-10">
                    <div className="bg-white border border-[var(--color-neutral-100)] rounded-3xl shadow-lg p-8">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-2xl font-black text-[var(--color-primary-700)]">Campaigns</h2>
                                <p className="text-xs text-[var(--color-neutral-400)] font-bold mt-1">Forms and surveys — event-linked or standalone.</p>
                            </div>
                            <button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="bg-[var(--color-primary-700)] text-white px-6 py-2 rounded-xl font-black text-xs shadow hover:bg-[var(--color-primary-900)] transition-all uppercase tracking-widest flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" /> New Campaign
                            </button>
                        </div>

                        {loading ? (
                            <div className="text-center text-[var(--color-neutral-400)] font-bold py-12">Loading campaigns...</div>
                        ) : campaigns.length === 0 ? (
                            <div className="text-center text-[var(--color-neutral-400)] font-bold py-12">
                                No campaigns yet. Click "New Campaign" to build your first form or survey.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {campaigns.map(c => (
                                    <div key={c.id} className="flex items-center justify-between bg-[var(--color-neutral-50)] border border-[var(--color-neutral-100)] rounded-2xl px-6 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-white border border-[var(--color-neutral-100)] flex items-center justify-center text-[var(--color-primary-700)] shrink-0">
                                                {c.type === "event" ? <Calendar className="w-5 h-5" /> : <Globe className="w-5 h-5" />}
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <div className="text-base font-black text-[var(--color-primary-700)]">{c.name}</div>
                                                <div className="text-xs text-[var(--color-neutral-500)] font-bold">
                                                    {c.type === "event"
                                                        ? `${c.event?.event_title || "Event"} · ${c.trigger?.replace("_", " ") || "manual"}`
                                                        : "Standalone survey"}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${STATUS_STYLES[c.status]}`}>
                                                {c.status}
                                            </span>
                                            <a href={`/campaigns/${c.id}/builder`} className="bg-white border border-[var(--color-neutral-200)] text-[var(--color-neutral-700)] px-4 py-2 rounded-xl font-black text-xs hover:bg-[var(--color-neutral-50)] transition-all uppercase tracking-widest flex items-center gap-1.5">
                                                <FileText className="w-3.5 h-3.5" /> Build
                                            </a>
                                            <a href={`/campaigns/${c.id}/responses`} className="bg-[var(--color-primary-100)] text-[var(--color-primary-700)] px-4 py-2 rounded-xl font-black text-xs shadow hover:bg-[var(--color-primary-200)] transition-all uppercase tracking-widest">
                                                Responses
                                            </a>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {user && (
                    <CreateCampaignModal
                        isOpen={isCreateModalOpen}
                        onClose={() => setIsCreateModalOpen(false)}
                        userId={user.id}
                        onCreated={handleCampaignCreated}
                    />
                )}
            </div>
        </DashboardGuard>
    );
}
