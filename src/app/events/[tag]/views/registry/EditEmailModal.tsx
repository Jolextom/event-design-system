import React, { useState } from 'react';
import { X, Loader2, Save, Mail, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@supabase/supabase-js';

interface EditEmailModalProps {
    isOpen: boolean;
    onClose: () => void;
    attendee: {
        id: string;
        email: string;
        event_id: string | null;
        first_name: string;
        last_name: string;
        email_status: string | null;
    };
    onUpdate: () => void;
}

export function EditEmailModal({
    isOpen,
    onClose,
    attendee,
    onUpdate
}: EditEmailModalProps) {
    const [newEmail, setNewEmail] = useState(attendee.email);
    const [shouldResend, setShouldResend] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSaving(true);

        try {
            const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            );

            const cleanEmail = newEmail.trim().toLowerCase();

            // 1. Check if email already registered in THIS event
            const { data: existing } = await supabase
                .from('attendees')
                .select('id')
                .eq('event_id', attendee.event_id)
                .ilike('email', cleanEmail)
                .neq('id', attendee.id)
                .maybeSingle();

            if (existing) {
                setError("This email address is already used by another guest in this event.");
                setSaving(false);
                return;
            }

            // 2. Update email in database
            const { error: updateError } = await supabase
                .from('attendees')
                .update({ email: cleanEmail })
                .eq('id', attendee.id);

            if (updateError) throw updateError;

            // 2. Resend invite if requested
            if (shouldResend) {
                // We'll need to fetch the event tag first to call the API
                // Or we can just call the API and let it handle lookups if we modify it, 
                // but currently it expects eventTag.
                const { data: ev } = await supabase.from('events').select('tag').eq('id', attendee.event_id).single();
                if (!ev?.tag) throw new Error("Could not find event tag");

                const res = await fetch('/api/send-invite', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ attendeeId: attendee.id, eventTag: ev.tag })
                });

                if (!res.ok) {
                    throw new Error("Email updated but failed to resend invite");
                }
            }

            onUpdate();
            onClose();
        } catch (err: any) {
            console.error(err);
            if (err.message?.includes('unique_event_email')) {
                setError("This email address is already used by another guest in this event.");
            } else {
                setError(err.message || "Failed to update email");
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
                    >
                        {/* Modal */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
                                <h3 className="text-lg font-black text-gray-900 tracking-tight">Edit Email Address</h3>
                                <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400 hover:text-gray-900">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Form */}
                            <form onSubmit={handleSave} className="p-6 space-y-6">
                                {error && (
                                    <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-bold flex items-start gap-2">
                                        <AlertCircle className="w-5 h-5 shrink-0" />
                                        <p>{error}</p>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase text-gray-500 tracking-widest ml-1">Current Email</label>
                                    <input
                                        type="email"
                                        value={newEmail}
                                        onChange={e => setNewEmail(e.target.value)}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-gray-900 font-bold focus:outline-none focus:ring-2 focus:ring-gray-900 focus:bg-white transition-all"
                                        placeholder="Enter new email address"
                                        required
                                    />
                                    <p className="text-xs text-gray-400 font-medium ml-1">
                                        Update email for {attendee.first_name} {attendee.last_name}
                                    </p>
                                </div>

                                <div className="p-4 border border-gray-200 rounded-xl flex items-start gap-3 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => setShouldResend(!shouldResend)}>
                                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${shouldResend ? 'bg-gray-900 border-gray-900' : 'border-gray-300 bg-white'}`}>
                                        {shouldResend && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-bold text-gray-900">
                                            Resend {attendee.email_status === 'confirmed' || attendee.email_status === 'registered' ? 'confirmation' : 'invite'} immediately
                                        </p>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            Sends a fresh {attendee.email_status === 'confirmed' || attendee.email_status === 'registered' ? 'confirmation' : 'invite'} email to the new address
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="flex-1 py-4 px-6 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving || !newEmail || newEmail === attendee.email}
                                        className="flex-[2] py-4 px-6 bg-gray-900 text-white rounded-xl text-sm font-bold shadow-lg shadow-gray-200 hover:bg-black hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
                                    >
                                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                        Save & {shouldResend ? 'Resend' : 'Update'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
