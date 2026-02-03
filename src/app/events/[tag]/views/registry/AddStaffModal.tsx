"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, UserPlus, Shield, RefreshCw } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { cn } from "@/lib/utils";

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

    // Auto-generate code on open? Or just on render. Let's do it simply.
    const [accessCode, setAccessCode] = useState(generateCode());

    function generateCode() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const { error } = await supabase.from("staff").insert({
            event_id: currentEventId,
            first_name: firstName,
            last_name: lastName,
            role: role,
            access_code: accessCode,
            status: 'offline'
        });

        if (error) {
            console.error(error);
            alert("Failed to add staff member. Code might be duplicate (rare), try regenerating.");
        } else {
            onSuccess();
            onClose();
            // Reset form
            setFirstName("");
            setLastName("");
            setRole("Staff");
            setAccessCode(generateCode());
        }
        setLoading(false);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
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
                                <h3 className="text-xl font-black text-gray-900">Add Team Member</h3>
                                <button onClick={onClose} className="p-2 hover:bg-gray-50 rounded-xl transition-colors">
                                    <X className="w-5 h-5 text-gray-400" />
                                </button>
                            </div>

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
                                            <Shield className="w-3 h-3" /> Access Code
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setAccessCode(generateCode())}
                                            className="p-1.5 hover:bg-blue-100 rounded-lg text-blue-400 hover:text-blue-600 transition-colors"
                                        >
                                            <RefreshCw className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                    <div className="text-3xl font-mono font-black text-gray-900 tracking-widest text-center py-2">
                                        {accessCode}
                                    </div>
                                    <p className="text-[10px] text-gray-400 text-center font-bold">
                                        Share this code with the staff member for app login.
                                    </p>
                                </div>

                                <div className="pt-2">
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-sm hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-gray-200 flex items-center justify-center gap-2"
                                    >
                                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                                        Add Member
                                    </button>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
