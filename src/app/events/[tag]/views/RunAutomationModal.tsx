"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { X, Play, Loader2, Sparkles, Shuffle, Users } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { EventVariable, Group } from "../types";
import { runRandomSplit } from "../utils/automationLogic";
import { cn } from "@/lib/utils";

interface RunAutomationModalProps {
    isOpen: boolean;
    onClose: () => void;
    eventId: string;
    targetVariable?: EventVariable; // Optional pre-selected variable
    onComplete?: () => void;
}

export function RunAutomationModal({ isOpen, onClose, eventId, targetVariable, onComplete }: RunAutomationModalProps) {
    const [variables, setVariables] = useState<EventVariable[]>([]);
    const [segments, setSegments] = useState<Group[]>([]);
    const [selectedVariableId, setSelectedVariableId] = useState<string>("");
    const [selectedSegmentId, setSelectedSegmentId] = useState<string>(""); // "" = All Guests
    const [onlyEmpty, setOnlyEmpty] = useState(true); // Default to safely filling gaps
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState<{ current: number, total: number } | null>(null);

    // Fetch variables and segments on load
    useEffect(() => {
        if (isOpen && eventId) {
            const fetchData = async () => {
                const supabase = createClient(
                    process.env.NEXT_PUBLIC_SUPABASE_URL!,
                    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
                );

                // Fetch Variables
                const { data: varData } = await supabase
                    .from("event_variables")
                    .select("*")
                    .eq("event_id", eventId)
                    .in("type", ["select", "text"]);
                if (varData) setVariables(varData as EventVariable[]);

                // Fetch Segments
                const { data: segData } = await supabase
                    .from("smart_segments")
                    .select("*")
                    .eq("event_id", eventId);
                if (segData) setSegments(segData as Group[]);
            };
            fetchData();
        }
    }, [isOpen, eventId]);

    // Handle initial target variable
    useEffect(() => {
        if (isOpen && targetVariable) {
            setSelectedVariableId(targetVariable.id);
        } else if (isOpen) {
            setSelectedVariableId("");
        }
        setSelectedSegmentId(""); // Reset segment selection on open
    }, [isOpen, targetVariable]);

    const handleRun = async () => {
        const variable = variables.find(v => v.id === selectedVariableId);
        if (!variable) return;

        setLoading(true);

        let options = variable.options || [];
        if (options.length < 2) {
            alert("This variable needs at least 2 options to split.");
            setLoading(false);
            return;
        }

        const result = await runRandomSplit(
            eventId,
            {
                variableName: variable.name,
                options: options
            },
            onlyEmpty,
            selectedSegmentId, // Pass segment filter
            (curr, total) => {
                setProgress({ current: curr, total });
            }
        );

        setLoading(false);
        setProgress(null);
        if (result.success) {
            alert(`Successfully assigned ${variable.name} to ${result.count} guests!`);
            onClose();
            if (onComplete) onComplete();
        } else {
            alert("Failed: " + result.error);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[11000]"
            />
            {/* z-index ensuring it's above the drawer */}
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-3xl shadow-2xl z-[11001] overflow-hidden"
            >
                <div className="p-8">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
                                <Shuffle className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-gray-900">Random Split</h2>
                                <p className="text-xs font-bold text-gray-400">Distribute guests evenly across groups</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                            <X className="w-5 h-5 text-gray-400" />
                        </button>
                    </div>

                    <div className="space-y-5">
                        {/* Target Variable Display/Select */}
                        <div className="space-y-2">
                            {targetVariable ? (
                                <div className="p-4 bg-purple-50 border border-purple-100 rounded-xl">
                                    <h3 className="text-xs font-black uppercase tracking-widest text-purple-400 mb-1">Target Variable</h3>
                                    <p className="text-sm font-bold text-purple-900 flex items-center gap-2">
                                        <Shuffle className="w-3.5 h-3.5" />
                                        {targetVariable.name}
                                    </p>
                                    <p className="text-[10px] text-purple-600 mt-1 font-medium">
                                        Distribute values: {targetVariable.options?.join(", ")}
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <label className="text-sm font-bold text-gray-900">Choose Variable to Split</label>
                                    <select
                                        value={selectedVariableId}
                                        onChange={(e) => setSelectedVariableId(e.target.value)}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all"
                                    >
                                        <option value="">Select a variable...</option>
                                        {variables.map(v => (
                                            <option key={v.id} value={v.id}>{v.name} ({v.options?.length || 0} options)</option>
                                        ))}
                                    </select>
                                </>
                            )}
                        </div>

                        {/* Target Audience Dropdown (NEW) */}
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-900">Target Audience</label>
                            <div className="relative">
                                <select
                                    value={selectedSegmentId}
                                    onChange={(e) => setSelectedSegmentId(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all appearance-none"
                                >
                                    <option value="">All Guests</option>
                                    {segments.map(s => (
                                        <option key={s.id} value={s.id}>{s.name} ({s.count || '?'} guests)</option>
                                    ))}
                                </select>
                                <Users className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                            <p className="text-[10px] text-gray-400 font-medium px-1">
                                {selectedSegmentId
                                    ? "Only guests in this group will be assigned a value."
                                    : "Randomly assign to everyone in the event."}
                            </p>
                        </div>

                        {/* Smart Fill Options */}
                        <div className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-100 rounded-2xl cursor-pointer hover:bg-gray-100 transition-all" onClick={() => setOnlyEmpty(!onlyEmpty)}>
                            <div className={cn(
                                "w-6 h-6 rounded-lg border flex items-center justify-center transition-all",
                                onlyEmpty ? "bg-purple-500 border-purple-500 text-white" : "bg-white border-gray-300"
                            )}>
                                {onlyEmpty && <Sparkles className="w-3.5 h-3.5 fill-white" />}
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-gray-900">Smart Fill Gap Logic</h4>
                                <p className="text-[11px] font-medium text-gray-500 max-w-[260px]">Only assign values to guests who don't have one yet. Existing data won't be overwritten.</p>
                            </div>
                        </div>

                        {progress && (
                            <div className="space-y-2 bg-gray-50 p-4 rounded-xl">
                                <div className="flex justify-between text-xs font-bold text-gray-500">
                                    <span>Processing...</span>
                                    <span>{Math.round((progress.current / progress.total) * 100)}%</span>
                                </div>
                                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <motion.div
                                        className="h-full bg-purple-500"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(progress.current / progress.total) * 100}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        <button
                            onClick={handleRun}
                            disabled={!selectedVariableId || loading}
                            className={cn(
                                "w-full py-4 rounded-xl text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg",
                                !selectedVariableId || loading
                                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                    : "bg-gray-900 text-white hover:bg-black hover:scale-[1.02] shadow-purple-500/20"
                            )}
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                            {loading ? "Assigning..." : "RUN AUTOMATION"}
                        </button>
                    </div>
                </div>
            </motion.div>
        </>
    );
}
