"use client";
import React, { useState } from "react";
import {
    Mail,
    Send,
    Layout,
    BarChart3,
    Plus,
    MousePointer2,
    Settings,
    Loader2,
    CheckCircle2,
    X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Event } from "../types";
import { broadcastUpdate } from "@/app/actions";

interface BroadcastViewProps {
    event: Event | null;
}

export function BroadcastView({ event }: BroadcastViewProps) {
    const [isComposing, setIsComposing] = useState(false);
    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

    const handleSend = async () => {
        if (!event?.id || !title || !message) return;
        
        setIsSending(true);
        setResult(null);
        
        try {
            const res = await broadcastUpdate({
                eventId: event.id,
                messageTitle: title,
                messageBody: message
            });
            
            if (res.success) {
                setResult({ success: true, message: res.message || "Message sent successfully!" });
                // Optionally reset form after delay
                setTimeout(() => {
                    setIsComposing(false);
                    setTitle("");
                    setMessage("");
                    setResult(null);
                }, 5000);
            } else {
                setResult({ success: false, message: res.error || "Failed to send message" });
            }
        } catch (err: any) {
            setResult({ success: false, message: err.message || "An unexpected error occurred." });
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="h-full overflow-y-auto bg-white custom-scrollbar">
            <div className="p-8 md:p-10 space-y-10 max-w-6xl mx-auto relative pb-24">
                {/* Header */}
                <header className="flex items-end justify-between relative z-10">
                    <div>
                        <div className="flex items-center gap-2.5 mb-2.5">
                            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-[var(--brand-blue)] opacity-70">Communication Studio</span>
                            <div className="h-[1px] w-8 bg-gray-100" />
                        </div>
                        <h1 className="text-2xl font-black tracking-tight text-gray-900 leading-none">Broadcasts</h1>
                        <p className="text-sm text-gray-400 mt-2 font-bold opacity-80">Design and automate your event communications.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {!isComposing ? (
                            <button 
                                onClick={() => setIsComposing(true)}
                                className="bg-gray-900 text-white px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-gray-200 hover:bg-black transition-all flex items-center gap-2"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                New Broadcast
                            </button>
                        ) : (
                            <button 
                                onClick={() => setIsComposing(false)}
                                className="bg-white text-gray-500 border border-gray-100 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all flex items-center gap-2"
                            >
                                <X className="w-3.5 h-3.5" />
                                Cancel
                            </button>
                        )}
                    </div>
                </header>

                <AnimatePresence mode="wait">
                    {isComposing ? (
                        <motion.div
                            key="composer"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="bg-gray-50/50 border border-gray-100 rounded-[32px] p-8 space-y-6 relative z-10"
                        >
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block ml-2">Broadcast Subject</label>
                                    <input 
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="e.g., Important: New Zoom Link for Session"
                                        className="w-full bg-white border border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block ml-2">Message Body</label>
                                    <textarea 
                                        rows={6}
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        placeholder="Write your message here. All registered attendees will receive this in a premium email template."
                                        className="w-full bg-white border border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-4">
                                <div className="flex items-center gap-3 text-xs font-bold text-gray-400">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                    Will be sent to all registered participants
                                </div>
                                <button 
                                    onClick={handleSend}
                                    disabled={isSending || !title || !message}
                                    className="bg-blue-600 text-white px-8 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-[0.15em] shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-3 disabled:opacity-50 disabled:bg-gray-400 disabled:shadow-none"
                                >
                                    {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                    {isSending ? "Sending Broadcast..." : "Launch Update"}
                                </button>
                            </div>

                            {result && (
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className={cn(
                                        "p-4 rounded-2xl flex items-center gap-3 text-sm font-bold mt-4",
                                        result.success ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-red-50 text-red-700 border border-red-100"
                                    )}
                                >
                                    {result.success ? <CheckCircle2 className="w-5 h-5" /> : <X className="w-5 h-5" />}
                                    {result.message}
                                </motion.div>
                            )}
                        </motion.div>
                    ) : (
                        <div className="grid grid-cols-12 gap-8 relative z-10">
                            {/* Stats */}
                            <div className="col-span-12 lg:col-span-7 space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-6 border border-gray-100 rounded-[24px] bg-white shadow-sm">
                                        <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500 mb-4">
                                            <Mail className="w-5 h-5" />
                                        </div>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Total Broadcasts</p>
                                        <p className="text-2xl font-black text-gray-900 tracking-tighter">0</p>
                                    </div>
                                    <div className="p-6 border border-gray-100 rounded-[24px] bg-white shadow-sm">
                                        <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500 mb-4">
                                            <BarChart3 className="w-5 h-5" />
                                        </div>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Avg Open Rate</p>
                                        <p className="text-2xl font-black text-gray-900 tracking-tighter">--</p>
                                    </div>
                                </div>

                                <div className="p-12 border border-dashed border-gray-200 rounded-[32px] flex flex-col items-center justify-center text-center space-y-4">
                                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300">
                                        <Send className="w-8 h-8" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest">No Broadcasts Yet</h4>
                                        <p className="text-xs text-gray-400 font-bold mt-1">Start by sending an update to your guests.</p>
                                    </div>
                                    <button 
                                        onClick={() => setIsComposing(true)}
                                        className="mt-2 text-blue-600 text-xs font-black uppercase tracking-widest hover:underline"
                                    >
                                        Create New →
                                    </button>
                                </div>
                            </div>

                            {/* Sidebar Info */}
                            <div className="col-span-12 lg:col-span-5 space-y-6">
                                <div className="p-8 border border-gray-100 rounded-[32px] bg-gray-50/50 flex flex-col items-center justify-center min-h-[400px] border-dashed group relative overflow-hidden">
                                    <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
                                    <div className="w-full max-w-[280px] bg-white rounded-2xl shadow-xl p-6 space-y-4 scale-90 origin-center">
                                        <div className="w-12 h-4 bg-gray-100 rounded" />
                                        <div className="aspect-video bg-gray-50 rounded-lg flex items-center justify-center">
                                            <Layout className="w-8 h-8 text-gray-200" />
                                        </div>
                                        <div className="space-y-2">
                                            <div className="h-3 w-3/4 bg-gray-100 rounded" />
                                            <div className="h-2 w-1/2 bg-gray-50 rounded" />
                                        </div>
                                        <div className="h-8 w-full bg-gray-900 rounded-lg" />
                                    </div>
                                    <div className="mt-8 text-center relative z-10">
                                        <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-widest text-[#111827]">Premium Branding</h4>
                                        <p className="text-[10px] text-gray-400 font-bold mt-1 max-w-[200px]">Your emails use the high-contrast aesthetic with your event banner.</p>
                                    </div>
                                    <button className="mt-6 flex items-center gap-2 px-6 py-2.5 bg-white border border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-600 hover:shadow-md transition-all active:scale-95">
                                        <Settings className="w-3.5 h-3.5" />
                                        Theme Preview
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </AnimatePresence>

                {/* Footer Insight */}
                <div className="p-6 bg-blue-50 rounded-[24px] border border-blue-100 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-500 shadow-sm">
                            <MousePointer2 className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[11px] font-black text-blue-900 uppercase tracking-widest">Growth Engine</p>
                            <p className="text-xs text-blue-700 font-bold">Attendees receiving updates are 40% more likely to engage with future events.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
