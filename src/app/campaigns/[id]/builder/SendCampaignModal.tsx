"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { Users, Send, AtSign } from "lucide-react";
import { Modal, ModalButton } from "@/app/components/ui/Modal";
import { sendCampaignToAttendees } from "@/app/actions";
import { useAuth } from "@/app/context/AuthContext";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface SegmentOption {
    id: string;
    name: string;
    count: number;
}

interface SendCampaignModalProps {
    isOpen: boolean;
    onClose: () => void;
    campaignId: string;
    eventId: string;
}

interface SenderOption {
    id: string;
    from_name: string;
    from_email: string;
}

export function SendCampaignModal({ isOpen, onClose, campaignId, eventId }: SendCampaignModalProps) {
    const { user } = useAuth();
    const [segments, setSegments] = useState<SegmentOption[]>([]);
    const [selectedSegmentId, setSelectedSegmentId] = useState("");
    const [senders, setSenders] = useState<SenderOption[]>([]);
    const [selectedSenderId, setSelectedSenderId] = useState("");
    const [sending, setSending] = useState(false);
    const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

    useEffect(() => {
        if (!isOpen) {
            setResult(null);
            setSelectedSegmentId("");
            setSelectedSenderId("");
            return;
        }
        supabase
            .from("smart_segments")
            .select("id, name, count")
            .eq("event_id", eventId)
            .then(({ data }) => setSegments(data || []));

        if (user) {
            supabase
                .from("sender_identities")
                .select("id, from_name, from_email")
                .eq("user_id", user.id)
                .eq("status", "verified")
                .then(({ data }) => setSenders(data || []));
        }
    }, [isOpen, eventId, user]);

    const handleSend = async () => {
        setSending(true);
        setResult(null);
        try {
            const res = await sendCampaignToAttendees({
                campaignId,
                eventId,
                segmentId: selectedSegmentId || undefined,
                senderIdentityId: selectedSenderId || undefined
            });
            setResult({ success: res.success, message: res.success ? res.message! : res.error! });
        } catch (err: any) {
            setResult({ success: false, message: err.message || "Something went wrong." });
        } finally {
            setSending(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Send to Attendees"
            subtitle="Each recipient gets their own personalized link"
            footer={
                <>
                    <ModalButton variant="secondary" onClick={onClose}>Close</ModalButton>
                    <ModalButton variant="primary" onClick={handleSend} loading={sending} loadingText="Sending...">
                        <Send className="w-4 h-4" /> Send Now
                    </ModalButton>
                </>
            }
        >
            <div className="space-y-5">
                <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-500 block">Audience</label>
                    <div className="relative">
                        <select
                            value={selectedSegmentId}
                            onChange={(e) => setSelectedSegmentId(e.target.value)}
                            className="w-full appearance-none px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)]/20 focus:border-[var(--brand-blue)] transition-all"
                        >
                            <option value="">All Registered Attendees</option>
                            {segments.map(s => (
                                <option key={s.id} value={s.id}>{s.name} ({s.count})</option>
                            ))}
                        </select>
                        <Users className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
                    </div>
                </div>

                {senders.length > 0 && (
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-500 block">Send From</label>
                        <div className="relative">
                            <select
                                value={selectedSenderId}
                                onChange={(e) => setSelectedSenderId(e.target.value)}
                                className="w-full appearance-none px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)]/20 focus:border-[var(--brand-blue)] transition-all"
                            >
                                <option value="">EventFlow (platform default)</option>
                                {senders.map(s => (
                                    <option key={s.id} value={s.id}>{s.from_name} &lt;{s.from_email}&gt;</option>
                                ))}
                            </select>
                            <AtSign className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 pointer-events-none" />
                        </div>
                    </div>
                )}

                <p className="text-[11px] text-gray-400 font-medium leading-relaxed">
                    Anyone who has already responded to this campaign is automatically skipped. Everyone else receives an email with their own personal link — answers sync back to their Registry profile.
                </p>

                {result && (
                    <div className={`p-3 rounded-xl text-xs font-bold ${result.success ? "bg-green-50 text-green-700 border border-green-100" : "bg-red-50 text-red-600 border border-red-100"}`}>
                        {result.message}
                    </div>
                )}
            </div>
        </Modal>
    );
}
