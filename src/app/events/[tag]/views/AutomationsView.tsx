"use client";

import React, { useState } from "react";
import {
    Zap,
    Plus,
    Settings2,
    ArrowRight,
    Mail,
    Tag as TagIcon,
    ShieldAlert,
    CircleDot,
    PlayCircle,
    Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { RunAutomationModal } from "./RunAutomationModal";

interface AutomationsViewProps {
    eventId: string;
}

const MOCK_FLOWS = [
    { id: "1", name: "Speaker Onboarding", triggers: ["Ticket: Speaker"], actions: ["Assign Variable: {is_speaker: true}", "Mail: Speaker_Success_Kit"], active: true, usage: "12 hits" },
    { id: "2", name: "Team Color Shuffle", triggers: ["Registration: Confirmed"], actions: ["Assign Variable: {team_color: 'Random'}", "Mail: Team_Welcome"], active: true, usage: "852 hits" },
    { id: "3", name: "VIP Welcome Sequence", triggers: ["Ticket: VIP"], actions: ["Assign Variable: {priority: 'High'}", "Mail: Welcome_VIP"], active: true, usage: "142 hits" },
];

export function AutomationsView({ eventId }: AutomationsViewProps) {
    const [isRunModalOpen, setIsRunModalOpen] = useState(false);

    return (
        <div className="h-full overflow-y-auto bg-white custom-scrollbar">
            <AnimatePresence>
                <RunAutomationModal
                    isOpen={isRunModalOpen}
                    onClose={() => setIsRunModalOpen(false)}
                    eventId={eventId}
                />
            </AnimatePresence>
            <div className="p-8 md:p-10 space-y-10 max-w-5xl mx-auto relative pb-24">
                {/* Header */}
                <header className="flex items-end justify-between relative z-10">
                    <div>
                        <div className="flex items-center gap-2.5 mb-2.5">
                            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-[var(--brand-blue)] opacity-70">Logic Flow Manager</span>
                            <div className="h-[1px] w-8 bg-gray-100" />
                        </div>
                        <h1 className="text-2xl font-black tracking-tight text-gray-900 leading-none">Automations</h1>
                        <p className="text-sm text-gray-400 mt-2 font-bold opacity-80">Design the rules that power your event lifecycle.</p>
                    </div>
                    <button className="bg-gray-900 text-white px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-gray-200 hover:bg-black transition-all flex items-center gap-2 mb-1">
                        <Plus className="w-3.5 h-3.5" />
                        Create Flow
                    </button>
                </header>

                {/* Workflow Cards */}
                <div className="grid grid-cols-1 gap-6 relative z-10">
                    {MOCK_FLOWS.map((flow, i) => (
                        <motion.div
                            key={flow.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="p-8 border border-gray-100 rounded-[32px] bg-white shadow-sm hover:shadow-xl hover:scale-[1.005] transition-all group"
                        >
                            <div className="flex items-start justify-between mb-8">
                                <div className="flex items-center gap-4">
                                    <div className={cn(
                                        "w-12 h-12 rounded-2xl flex items-center justify-center border transition-all",
                                        flow.active ? "bg-blue-50 border-blue-100 text-blue-600 shadow-sm" : "bg-gray-50 border-transparent text-gray-300"
                                    )}>
                                        <Zap className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-gray-900 tracking-tight leading-none mb-2">{flow.name}</h3>
                                        <div className="flex items-center gap-3">
                                            <span className={cn(
                                                "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded",
                                                flow.active ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-400"
                                            )}>
                                                {flow.active ? "Active" : "Paused"}
                                            </span>
                                            <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest flex items-center gap-1.5">
                                                <PlayCircle className="w-3 h-3" />
                                                {flow.usage}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button className="p-2.5 text-gray-300 hover:text-gray-900 border border-transparent hover:border-gray-100 rounded-xl transition-all">
                                        <Settings2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Trigger-Action visualization */}
                            <div className="flex items-center gap-6 p-4 bg-gray-50/50 rounded-2xl border border-gray-100/50">
                                <div className="flex flex-col gap-2 flex-1">
                                    <span className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">When matches</span>
                                    <div className="flex flex-wrap gap-2">
                                        {flow.triggers.map((t, ti) => (
                                            <div key={ti} className="px-3 py-1.5 bg-white border border-gray-100 rounded-xl text-[10px] font-black text-gray-600 flex items-center gap-2 shadow-sm">
                                                <CircleDot className="w-3 h-3 text-blue-500" />
                                                {t}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <ArrowRight className="w-5 h-5 text-gray-300 shrink-0" />

                                <div className="flex flex-col gap-2 flex-1">
                                    <span className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Execute logic</span>
                                    <div className="flex flex-wrap gap-2">
                                        {flow.actions.map((a, ai) => (
                                            <div key={ai} className={cn(
                                                "px-3 py-1.5 rounded-xl text-[10px] font-black flex items-center gap-2 shadow-sm transition-all",
                                                a.startsWith("Assign") ? "bg-[var(--brand-blue)] text-white" : "bg-gray-900 text-white shadow-md"
                                            )}>
                                                {a.startsWith("Mail") ? <Mail className="w-3.5 h-3.5 text-blue-400" /> : <Sparkles className="w-3.5 h-3.5 text-blue-200" />}
                                                {a}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}

                    {/* Pro Tip */}
                    <div className="mt-4 p-8 bg-[var(--brand-blue)] rounded-[32px] text-white flex items-center justify-between relative overflow-hidden group shadow-2xl shadow-blue-100/50 transition-all hover:scale-[1.01]">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-transparent opacity-100" />
                        <div className="relative z-10 flex items-center gap-6">
                            <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20">
                                <ShieldAlert className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black tracking-tight">Logical Interaction Map</h3>
                                <p className="text-white/60 text-xs mt-1 font-bold">Your "Team Shuffle" variable is currently being used by 3 separate Broadcast templates.</p>
                            </div>
                        </div>
                        <button className="relative z-10 bg-white text-gray-900 px-6 py-3 rounded-2xl font-black text-xs hover:bg-gray-100 transition-all shadow-lg active:scale-95">
                            Run Analysis
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
