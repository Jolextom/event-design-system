"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/app/context/AuthContext";
import DashboardGuard from "@/app/components/DashboardGuard";
import { Plus, Globe, CheckCircle2, Clock, XCircle, RefreshCw, Trash2, Copy, Check } from "lucide-react";
import { Modal, ModalButton } from "@/app/components/ui/Modal";
import { Input } from "@/app/components/ui/Input";
import {
    listSenderIdentities, addSenderDomain, checkSenderDomain, deleteSenderIdentity, updateSenderReplyTo,
    type SenderIdentity,
} from "@/lib/senderDomains";

const STATUS_META: Record<string, { label: string; cls: string; icon: React.ComponentType<{ className?: string }> }> = {
    verified: { label: "Verified", cls: "bg-green-50 text-green-700", icon: CheckCircle2 },
    pending: { label: "Pending DNS", cls: "bg-amber-50 text-amber-700", icon: Clock },
    failed: { label: "Failed", cls: "bg-red-50 text-red-600", icon: XCircle },
};

export default function SenderSettingsPage() {
    const { user } = useAuth();
    const [identities, setIdentities] = useState<SenderIdentity[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [checkingId, setCheckingId] = useState<string | null>(null);
    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    // Add form state
    const [domain, setDomain] = useState("");
    const [fromName, setFromName] = useState("");
    const [localPart, setLocalPart] = useState("surveys");
    const [replyTo, setReplyTo] = useState("");
    const [resendApiKey, setResendApiKey] = useState("");
    const [addError, setAddError] = useState<string | null>(null);
    const [adding, setAdding] = useState(false);

    // Inline reply-to editing on existing identities
    const [editingReplyToId, setEditingReplyToId] = useState<string | null>(null);
    const [replyToDraft, setReplyToDraft] = useState("");
    const [savingReplyTo, setSavingReplyTo] = useState(false);

    const refresh = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        const result = await listSenderIdentities(user.id);
        if ("identities" in result) setIdentities(result.identities);
        setLoading(false);
    }, [user]);

    useEffect(() => { refresh(); }, [refresh]);

    const handleAdd = async () => {
        if (!user) return;
        setAdding(true);
        setAddError(null);
        const result = await addSenderDomain({
            userId: user.id,
            domain,
            fromName: fromName || "EventFlow",
            fromLocalPart: localPart,
            replyTo: replyTo || undefined,
            resendApiKey: resendApiKey || undefined,
        });
        setAdding(false);
        if ("error" in result) {
            setAddError(result.error);
        } else {
            setIsAddOpen(false);
            setDomain(""); setFromName(""); setLocalPart("surveys"); setReplyTo(""); setResendApiKey("");
            setExpandedId(result.identity.id);
            refresh();
        }
    };

    const startEditReplyTo = (identity: SenderIdentity) => {
        setEditingReplyToId(identity.id);
        setReplyToDraft(identity.reply_to || "");
    };

    const saveReplyTo = async (id: string) => {
        setSavingReplyTo(true);
        await updateSenderReplyTo({ identityId: id, replyTo: replyToDraft });
        setSavingReplyTo(false);
        setEditingReplyToId(null);
        refresh();
    };

    const handleCheck = async (id: string) => {
        setCheckingId(id);
        await checkSenderDomain({ identityId: id });
        setCheckingId(null);
        refresh();
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Remove this sender domain? Emails will fall back to the platform default.")) return;
        await deleteSenderIdentity({ identityId: id });
        refresh();
    };

    const copyValue = (key: string, value: string) => {
        navigator.clipboard.writeText(value);
        setCopiedKey(key);
        setTimeout(() => setCopiedKey(null), 1500);
    };

    return (
        <DashboardGuard>
            <div className="min-h-screen bg-[var(--color-neutral-50)] py-16">
                <div className="max-w-3xl mx-auto space-y-8 px-4">
                    <div className="bg-white border border-[var(--color-neutral-100)] rounded-3xl shadow-lg p-8">
                        <div className="flex items-center justify-between mb-2">
                            <div>
                                <a href="/events/dashboard" className="text-[11px] font-black text-[var(--color-neutral-400)] hover:text-[var(--color-primary-700)] transition-all uppercase tracking-widest mb-2 inline-block">
                                    ← Events Dashboard
                                </a>
                                <h2 className="text-2xl font-black text-[var(--color-primary-700)]">Sender Domains</h2>
                                <p className="text-xs text-[var(--color-neutral-400)] font-bold mt-1">
                                    Send campaigns and broadcasts from your own email domain instead of the platform default.
                                </p>
                            </div>
                            <button
                                onClick={() => setIsAddOpen(true)}
                                className="bg-[var(--color-primary-700)] text-white px-6 py-2 rounded-xl font-black text-xs shadow hover:bg-[var(--color-primary-900)] transition-all uppercase tracking-widest flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" /> Add Domain
                            </button>
                        </div>

                        {loading ? (
                            <div className="text-center text-[var(--color-neutral-400)] font-bold py-12">Loading...</div>
                        ) : identities.length === 0 ? (
                            <div className="text-center text-[var(--color-neutral-400)] font-bold py-12">
                                No sender domains yet. Emails currently send from the platform default.
                            </div>
                        ) : (
                            <div className="space-y-4 mt-6">
                                {identities.map(identity => {
                                    const meta = STATUS_META[identity.status] || STATUS_META.pending;
                                    const StatusIcon = meta.icon;
                                    const isExpanded = expandedId === identity.id;
                                    const records: any[] = Array.isArray(identity.dns_records) ? identity.dns_records : [];
                                    return (
                                        <div key={identity.id} className="border border-[var(--color-neutral-100)] rounded-2xl overflow-hidden">
                                            <div
                                                className="flex items-center justify-between px-6 py-5 bg-[var(--color-neutral-50)] cursor-pointer"
                                                onClick={() => setExpandedId(isExpanded ? null : identity.id)}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-white border border-[var(--color-neutral-100)] flex items-center justify-center text-[var(--color-primary-700)]">
                                                        <Globe className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-black text-gray-900">{identity.from_name} &lt;{identity.from_email}&gt;</div>
                                                        <div className="text-xs text-gray-400 font-bold">{identity.domain}</div>
                                                    </div>
                                                </div>
                                                <div className="text-xs text-gray-400 font-bold flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                    {editingReplyToId === identity.id ? (
                                                        <>
                                                            <input
                                                                value={replyToDraft}
                                                                onChange={(e) => setReplyToDraft(e.target.value)}
                                                                placeholder="replies go to..."
                                                                className="px-2 py-1 border border-gray-200 rounded-lg text-xs font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)]/20"
                                                                autoFocus
                                                            />
                                                            <button
                                                                onClick={() => saveReplyTo(identity.id)}
                                                                disabled={savingReplyTo}
                                                                className="text-[10px] font-black uppercase text-[var(--color-primary-700)] disabled:opacity-50"
                                                            >
                                                                Save
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <button
                                                            onClick={() => startEditReplyTo(identity)}
                                                            className="hover:text-gray-700 transition-all"
                                                        >
                                                            Replies to: {identity.reply_to || <span className="italic">not set</span>}
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${meta.cls}`}>
                                                        <StatusIcon className="w-3 h-3" /> {meta.label}
                                                    </span>
                                                    {identity.status !== "verified" && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleCheck(identity.id); }}
                                                            disabled={checkingId === identity.id}
                                                            className="flex items-center gap-1.5 bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-widest hover:bg-gray-50 transition-all disabled:opacity-50"
                                                        >
                                                            <RefreshCw className={`w-3 h-3 ${checkingId === identity.id ? "animate-spin" : ""}`} /> Verify
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDelete(identity.id); }}
                                                        className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            {isExpanded && identity.status !== "verified" && (
                                                <div className="px-6 py-5 space-y-4 bg-white">
                                                    <p className="text-xs text-gray-500 font-bold leading-relaxed">
                                                        Add these DNS records at your domain host (e.g. Namecheap, GoDaddy, Cloudflare), then hit Verify.
                                                        DNS changes can take a few minutes to a few hours to propagate.
                                                    </p>
                                                    {records.length === 0 ? (
                                                        <p className="text-xs text-gray-400 font-bold italic">No DNS records available — hit Verify to refresh them from Resend.</p>
                                                    ) : (
                                                        <div className="space-y-2">
                                                            {records.map((r: any, i: number) => (
                                                                <div key={i} className="p-3 bg-gray-50 rounded-xl text-[11px] font-mono space-y-1">
                                                                    <div className="flex items-center justify-between">
                                                                        <span className="font-black text-gray-500 uppercase">{r.record || r.type} · {r.type}</span>
                                                                        <span className="text-gray-400">{r.status || ""}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-gray-400 shrink-0">Name:</span>
                                                                        <span className="text-gray-900 break-all">{r.name}</span>
                                                                        <button onClick={() => copyValue(`${i}-name`, r.name)} className="p-1 text-gray-300 hover:text-gray-700 shrink-0">
                                                                            {copiedKey === `${i}-name` ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                                                                        </button>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-gray-400 shrink-0">Value:</span>
                                                                        <span className="text-gray-900 break-all">{r.value}</span>
                                                                        <button onClick={() => copyValue(`${i}-value`, r.value)} className="p-1 text-gray-300 hover:text-gray-700 shrink-0">
                                                                            {copiedKey === `${i}-value` ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <Modal
                isOpen={isAddOpen}
                onClose={() => setIsAddOpen(false)}
                title="Add Sender Domain"
                subtitle="Send from your own email address"
                footer={
                    <>
                        <ModalButton variant="secondary" onClick={() => setIsAddOpen(false)}>Cancel</ModalButton>
                        <ModalButton variant="primary" onClick={handleAdd} loading={adding} loadingText="Adding..." disabled={!domain.trim()}>
                            Add Domain
                        </ModalButton>
                    </>
                }
            >
                <div className="space-y-4">
                    {addError && (
                        <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 font-bold">{addError}</div>
                    )}
                    <Input label="Domain" value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="yourbrand.com" autoFocus />
                    <Input label="Sender Name" value={fromName} onChange={(e) => setFromName(e.target.value)} placeholder="e.g. Kini AI" />
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-500 block">Email address</label>
                        <div className="flex items-center gap-2">
                            <input
                                value={localPart}
                                onChange={(e) => setLocalPart(e.target.value)}
                                className="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)]/20 focus:border-[var(--brand-blue)] transition-all"
                                placeholder="surveys"
                            />
                            <span className="text-sm font-bold text-gray-400">@{domain.trim() || "yourbrand.com"}</span>
                        </div>
                    </div>
                    <Input
                        label="Reply-To (optional)"
                        value={replyTo}
                        onChange={(e) => setReplyTo(e.target.value)}
                        placeholder="a real person's inbox, e.g. bawoni@kini-ai.com"
                    />
                    <Input
                        label="Resend API Key (optional)"
                        type="password"
                        value={resendApiKey}
                        onChange={(e) => setResendApiKey(e.target.value)}
                        placeholder="only if this domain is on a different Resend account"
                        autoComplete="off"
                    />
                    <p className="text-[10px] text-gray-400 font-bold leading-relaxed">
                        You'll get DNS records to add at your domain host. Emails only send from this address once the domain verifies — until then everything falls back to the platform default.
                        Leave Reply-To blank if replies should go to the sender address itself.
                        Leave the API key blank unless this domain was verified under a <strong>separate</strong> Resend account from the platform's own — most domains don't need one.
                    </p>
                </div>
            </Modal>
        </DashboardGuard>
    );
}
