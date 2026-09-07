"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, UserPlus, Shield, RefreshCw, Check, Copy, MessageSquareShare } from "lucide-react";
import { cn } from "@/lib/utils";
import { addStaffMember } from "@/app/actions";

interface AddStaffModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentEventId: string; // Needed for DB insert
    onSuccess: () => void;
}

export function AddStaffModal({ isOpen, onClose, currentEventId, onSuccess }: AddStaffModalProps) {
    const [loading, setLoading] = useState(false);
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [role, setRole] = useState("Staff");
    const [accessCode, setAccessCode] = useState(generateCode());

    // Success screen state
    const [createdMember, setCreatedMember] = useState<{
        name: string;
        role: string;
        code: string;
    } | null>(null);
    const [copiedCode, setCopiedCode] = useState(false);
    const [copiedInvite, setCopiedInvite] = useState(false);

    function generateCode() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    const resetForm = () => {
        setFirstName("");
        setLastName("");
        setRole("Staff");
        setAccessCode(generateCode());
        setCreatedMember(null);
        setCopiedCode(false);
        setCopiedInvite(false);
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const res = await addStaffMember({
            eventId: currentEventId,
            firstName,
            lastName,
            role,
            accessCode,
        });

        if (!res.success) {
            alert(res.error || "Failed to add staff member.");
        } else {
            onSuccess();
            // Show confirmation screen instead of abruptly closing
            setCreatedMember({
                name: `${firstName} ${lastName}`.trim(),
                role,
                code: accessCode,
            });
        }
        setLoading(false);
    };

    const copyCodeOnly = async (code: string) => {
        await navigator.clipboard.writeText(code);
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
    };

    const copyInviteMessage = async (name: string, code: string) => {
        const loginUrl = `${window.location.origin}${window.location.pathname.replace(/\/$/, "")}/checkin`;
        const message = `Hello ${name}! You have been added as ${role} for the check-in desk.\n\nYour Desk Access Code: ${code}\nCheck-In App Link: ${loginUrl}\n\nPlease keep this code handy on event day.`;
        await navigator.clipboard.writeText(message);
        setCopiedInvite(true);
        setTimeout(() => setCopiedInvite(false), 2000);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleClose}
                        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[60]"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-none"
                    >
                        <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md pointer-events-auto overflow-hidden border border-gray-100">
                            {/* Modal Header */}
                            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                                <h3 className="text-xl font-black text-gray-900">
                                    {createdMember ? "Member Added!" : "Add Team Member"}
                                </h3>
                                <button onClick={handleClose} className="p-2 hover:bg-gray-50 rounded-xl transition-colors">
                                    <X className="w-5 h-5 text-gray-400" />
                                </button>
                            </div>

                            {createdMember ? (
                                /* Post-creation Confirmation Screen */
                                <div className="p-6 space-y-6">
                                    <div className="text-center space-y-2">
                                        <div className="w-12 h-12 bg-green-50 text-green-600 rounded-2xl mx-auto flex items-center justify-center border border-green-200">
                                            <Check className="w-6 h-6 stroke-[2.5]" />
                                        </div>
                                        <h4 className="text-lg font-black text-gray-900">{createdMember.name}</h4>
                                        <span className="inline-block text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 bg-gray-100 text-gray-600 rounded-md">
                                            {createdMember.role}
                                        </span>
                                    </div>

                                    {/* Prominent Access Code Display */}
                                    <div className="p-5 bg-gradient-to-b from-blue-50/60 to-blue-50/20 rounded-2xl border border-blue-100 space-y-2 text-center">
                                        <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest">
                                            Assigned Access Code
                                        </div>
                                        <div className="text-4xl font-mono font-black text-gray-900 tracking-[0.25em]">
                                            {createdMember.code}
                                        </div>
                                        <p className="text-xs text-gray-500 font-bold">
                                            Your team member enters this 6-digit code to log into the Check-In Desk.
                                        </p>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="space-y-2.5">
                                        <button
                                            type="button"
                                            onClick={() => copyCodeOnly(createdMember.code)}
                                            className="w-full py-3.5 px-4 bg-gray-900 hover:bg-black text-white rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-md shadow-gray-200"
                                        >
                                            {copiedCode ? (
                                                <>
                                                    <Check className="w-4 h-4 text-green-400" />
                                                    <span>Code Copied to Clipboard!</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Copy className="w-4 h-4" />
                                                    <span>Copy Access Code ({createdMember.code})</span>
                                                </>
                                            )}
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => copyInviteMessage(createdMember.name, createdMember.code)}
                                            className="w-full py-3 px-4 bg-white hover:bg-gray-50 text-gray-800 border border-gray-200 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2"
                                        >
                                            {copiedInvite ? (
                                                <>
                                                    <Check className="w-4 h-4 text-green-600" />
                                                    <span>Invite Text Copied!</span>
                                                </>
                                            ) : (
                                                <>
                                                    <MessageSquareShare className="w-4 h-4 text-blue-600" />
                                                    <span>Copy WhatsApp / SMS Invite</span>
                                                </>
                                            )}
                                        </button>
                                    </div>

                                    {/* Reassurance note */}
                                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-[11px] text-gray-500 font-bold text-center leading-relaxed">
                                        💡 <strong>You will always see this code again:</strong> It is permanently saved and displayed right on your Event Day team list whenever you need it.
                                    </div>

                                    <div className="flex items-center gap-3 pt-2">
                                        <button
                                            type="button"
                                            onClick={resetForm}
                                            className="flex-1 py-3 text-xs font-black text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-xl transition-all"
                                        >
                                            Add Another
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleClose}
                                            className="flex-1 py-3 text-xs font-black text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-md shadow-blue-200"
                                        >
                                            Done
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                /* Creation Form */
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
                                                required
                                                value={lastName}
                                                onChange={(e) => setLastName(e.target.value)}
                                                className="w-full h-12 px-4 rounded-xl bg-gray-50 border border-gray-100 focus:border-gray-900 focus:ring-0 transition-all font-bold text-gray-900 outline-none"
                                                placeholder="Doe"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Role</label>
                                        <select
                                            value={role}
                                            onChange={(e) => setRole(e.target.value)}
                                            className="w-full h-12 px-4 rounded-xl bg-gray-50 border border-gray-100 focus:border-gray-900 focus:ring-0 transition-all font-bold text-gray-900 outline-none appearance-none"
                                        >
                                            <option value="Staff">General Staff</option>
                                            <option value="Lead">Team Lead</option>
                                            <option value="Gatekeeper">Gatekeeper</option>
                                            <option value="Security">Security</option>
                                        </select>
                                    </div>

                                    {/* Generated Access Code */}
                                    <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-blue-600 font-black text-xs uppercase tracking-wider">
                                                <Shield className="w-3 h-3" /> Auto-Generated Access Code
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setAccessCode(generateCode())}
                                                className="p-1.5 hover:bg-blue-100 rounded-lg text-blue-400 hover:text-blue-600 transition-colors"
                                                title="Regenerate random code"
                                            >
                                                <RefreshCw className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                        <div className="text-3xl font-mono font-black text-gray-900 tracking-widest text-center py-2">
                                            {accessCode}
                                        </div>
                                        <p className="text-[10px] text-gray-400 text-center font-bold">
                                            You can copy and share this code anytime after creation.
                                        </p>
                                    </div>

                                    <div className="pt-2">
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-sm hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-gray-200 flex items-center justify-center gap-2 disabled:opacity-50"
                                        >
                                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                                            Add Member
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

