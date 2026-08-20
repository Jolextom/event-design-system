"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, UserPlus, Shield, RefreshCw, Link2, Copy, Check } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

interface AddCollaboratorModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentEventId: string;
    eventTag: string;
    onSuccess: () => void;
}

function generateAccessCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

function slugify(name: string) {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") || "guest";
}

function randomSuffix() {
    return Math.random().toString(36).slice(2, 6);
}

export function AddCollaboratorModal({ isOpen, onClose, currentEventId, eventTag, onSuccess }: AddCollaboratorModalProps) {
    const [loading, setLoading] = useState(false);
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [viewScope, setViewScope] = useState<"full_highlighted" | "own_only">("full_highlighted");
    const [accessCode, setAccessCode] = useState(generateAccessCode());

    // Set after a successful insert so we can show the links to copy.
    const [created, setCreated] = useState<{ accessCode: string; referralCode: string } | null>(null);
    const [copiedField, setCopiedField] = useState<"login" | "referral" | null>(null);

    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

    const resetForm = () => {
        setFirstName("");
        setLastName("");
        setEmail("");
        setViewScope("full_highlighted");
        setAccessCode(generateAccessCode());
        setCreated(null);
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        let referralCode = `${slugify(firstName)}-${randomSuffix()}`;
        let attempt = 0;
        let insertError: any = null;

        // Retry on referral_code collision (rare) rather than requiring a
        // globally-unique slug up front.
        while (attempt < 3) {
            const { error } = await supabase.from("event_collaborators").insert({
                event_id: currentEventId,
                first_name: firstName,
                last_name: lastName,
                email: email || null,
                access_code: accessCode,
                referral_code: referralCode,
                view_scope: viewScope,
                status: "active",
            });

            if (!error) {
                insertError = null;
                break;
            }

            insertError = error;
            if (error.code === "23505" && error.message?.includes("referral_code")) {
                referralCode = `${slugify(firstName)}-${randomSuffix()}`;
                attempt += 1;
                continue;
            }
            break;
        }

        if (insertError) {
            console.error(insertError);
            alert("Failed to add collaborator. The access code might be duplicate, try regenerating.");
        } else {
            setCreated({ accessCode, referralCode });
            onSuccess();
        }
        setLoading(false);
    };

    const copy = async (text: string, field: "login" | "referral") => {
        await navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 1500);
    };

    const loginLink = `${baseUrl}/events/${eventTag}/collaborate`;
    const referralLink = created ? `${baseUrl}/${eventTag}?ref=${created.referralCode}` : "";

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleClose}
                        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60]"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-none"
                    >
                        <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md pointer-events-auto overflow-hidden">
                            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                                <h3 className="text-xl font-black text-gray-900">
                                    {created ? "Collaborator Added" : "Add Collaborator"}
                                </h3>
                                <button onClick={handleClose} className="p-2 hover:bg-gray-50 rounded-xl transition-colors">
                                    <X className="w-5 h-5 text-gray-400" />
                                </button>
                            </div>

                            {created ? (
                                <div className="p-6 space-y-5">
                                    <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-2">
                                        <div className="flex items-center gap-2 text-blue-600 font-black text-xs uppercase tracking-wider">
                                            <Link2 className="w-3 h-3" /> Referral Link
                                        </div>
                                        <p className="text-[10px] text-gray-400 font-bold">Registrations through this link get attributed to them.</p>
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 text-xs font-mono font-bold text-gray-900 bg-white rounded-lg border border-gray-100 px-3 py-2 truncate">
                                                {referralLink}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => copy(referralLink, "referral")}
                                                className="p-2.5 bg-white border border-gray-100 rounded-lg text-gray-500 hover:text-gray-900 transition-colors"
                                            >
                                                {copiedField === "referral" ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
                                        <div className="flex items-center gap-2 text-gray-600 font-black text-xs uppercase tracking-wider">
                                            <Shield className="w-3 h-3" /> Registrant View Login
                                        </div>
                                        <p className="text-[10px] text-gray-400 font-bold">Share the link and code so they can view registrants.</p>
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 text-xs font-mono font-bold text-gray-900 bg-white rounded-lg border border-gray-100 px-3 py-2 truncate">
                                                {loginLink}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => copy(loginLink, "login")}
                                                className="p-2.5 bg-white border border-gray-100 rounded-lg text-gray-500 hover:text-gray-900 transition-colors"
                                            >
                                                {copiedField === "login" ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                                            </button>
                                        </div>
                                        <div className="text-2xl font-mono font-black text-gray-900 tracking-widest text-center py-2">
                                            {created.accessCode}
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleClose}
                                        className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-sm hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-gray-200"
                                    >
                                        Done
                                    </button>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">First Name</label>
                                            <input
                                                required
                                                value={firstName}
                                                onChange={(e) => setFirstName(e.target.value)}
                                                className="w-full h-12 px-4 rounded-xl bg-gray-50 border border-gray-100 focus:border-gray-900 focus:ring-0 transition-all font-bold text-gray-900 outline-none"
                                                placeholder="Jane"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Last Name</label>
                                            <input
                                                value={lastName}
                                                onChange={(e) => setLastName(e.target.value)}
                                                className="w-full h-12 px-4 rounded-xl bg-gray-50 border border-gray-100 focus:border-gray-900 focus:ring-0 transition-all font-bold text-gray-900 outline-none"
                                                placeholder="Doe"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Email (optional)</label>
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full h-12 px-4 rounded-xl bg-gray-50 border border-gray-100 focus:border-gray-900 focus:ring-0 transition-all font-bold text-gray-900 outline-none"
                                            placeholder="jane@example.com"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Registrant View</label>
                                        <select
                                            value={viewScope}
                                            onChange={(e) => setViewScope(e.target.value as "full_highlighted" | "own_only")}
                                            className="w-full h-12 px-4 rounded-xl bg-gray-50 border border-gray-100 focus:border-gray-900 focus:ring-0 transition-all font-bold text-gray-900 outline-none appearance-none"
                                        >
                                            <option value="full_highlighted">Full list, their referrals highlighted</option>
                                            <option value="own_only">Only their own referrals</option>
                                        </select>
                                    </div>

                                    <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-blue-600 font-black text-xs uppercase tracking-wider">
                                                <Shield className="w-3 h-3" /> Access Code
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setAccessCode(generateAccessCode())}
                                                className="p-1.5 hover:bg-blue-100 rounded-lg text-blue-400 hover:text-blue-600 transition-colors"
                                            >
                                                <RefreshCw className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                        <div className="text-3xl font-mono font-black text-gray-900 tracking-widest text-center py-2">
                                            {accessCode}
                                        </div>
                                        <p className="text-[10px] text-gray-400 text-center font-bold">
                                            Share this code with the collaborator to log into their registrant view.
                                        </p>
                                    </div>

                                    <div className="pt-2">
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-sm hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-gray-200 flex items-center justify-center gap-2"
                                        >
                                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                                            Add Collaborator
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
