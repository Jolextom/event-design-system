"use client";

import React, { useState } from "react";
import { Plus, Tag, CircleDollarSign, Users, User, Settings, Trash2, Infinity as InfinityIcon, Clock, AlertTriangle, X, Hash, ListChecks, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Pass, Question } from "../types";
import { CreatePassModal } from "../components/CreatePassModal";
import { EditPassModal } from "../components/EditPassModal";
import { createClient } from "@supabase/supabase-js";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { SelectionLogicView } from "./SelectionLogicView";

interface TicketingViewProps {
    passes: Pass[];
    questions: Question[];
    loading: boolean;
    error: string | null;
    eventId: string | null;
    onPassCreated: () => void;
    onPassUpdated: () => void;
    onQuestionCreated: () => void;
    attendees: any[];
}

// Skeleton loading component for a single pass card
function PassCardSkeleton() {
    return (
        <div className="p-7 border border-gray-100 rounded-[24px] bg-white animate-pulse">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-gray-100" />
                    <div className="space-y-2">
                        <div className="h-5 w-32 bg-gray-100 rounded-lg" />
                        <div className="flex items-center gap-3">
                            <div className="h-3 w-16 bg-gray-100 rounded" />
                            <div className="w-1 h-1 bg-gray-100 rounded-full" />
                            <div className="h-3 w-20 bg-gray-100 rounded" />
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    <div className="flex flex-col items-end gap-1.5">
                        <div className="h-3 w-12 bg-gray-100 rounded" />
                        <div className="w-24 h-1 bg-gray-100 rounded-full" />
                    </div>
                </div>
            </div>
        </div>
    );
}

export function TicketingView({ 
    passes, 
    questions = [], 
    loading, 
    error, 
    eventId, 
    onPassCreated, 
    onPassUpdated,
    onQuestionCreated,
    attendees = [] 
}: TicketingViewProps) {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [deletePassId, setDeletePassId] = useState<string | null>(null);
    const [deletePassTitle, setDeletePassTitle] = useState<string>("");
    const [isDeleting, setIsDeleting] = useState(false);
    const [editingPassId, setEditingPassId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'tickets' | 'logic'>('tickets');

    // Delete pass handler
    const handleDeletePass = async () => {
        if (!deletePassId) return;

        setIsDeleting(true);
        try {
            const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            );

            const { error: deleteError } = await supabase
                .from("passes")
                .delete()
                .eq("id", deletePassId);

            if (deleteError) {
                console.error("Failed to delete pass:", deleteError);
            } else {
                onPassCreated(); // Refetch passes
            }
        } catch (err) {
            console.error("Delete error:", err);
        } finally {
            setIsDeleting(false);
            setDeletePassId(null);
            setDeletePassTitle("");
        }
    };

    // Map pass data to display values
    const getPassStatus = (pass: Pass) => {
        if (pass.is_hidden) return "hidden";
        return "active";
    };

    const formatPrice = (pass: Pass) => {
        if (pass.is_free) return "Free";
        if (pass.price === null || pass.price === 0) return "Free";
        return `$${pass.price.toFixed(2)}`;
    };

    const getSoldCount = (passId: string) => {
        // Fallback to database count if attendees list is empty (e.g. initial load or error)
        // AND we have a DB count. But generally, the live list is the source of truth for "who is coming".
        // However, for "sold", we want confirmed orders. Attendees basically ARE confirmed.
        const count = attendees.filter(a => a.pass_id === passId && a.email_status !== "invited").length;
        return count;
    };

    const getSoldPercentage = (pass: Pass) => {
        const sold = getSoldCount(pass.id);
        const available = pass.quantity_available;
        if (available <= 0) return 0;
        return Math.min((sold / available) * 100, 100);
    };

    return (
        <div className="h-full overflow-y-auto bg-white custom-scrollbar">
            <div className="max-w-3xl px-4 py-8 md:p-10 mx-auto space-y-10 pb-24">
                <header className="flex justify-between items-end border-b border-gray-100 pb-8 mt-4">
                    <div>
                        <h2 className="text-2xl font-black tracking-tight text-gray-900">Tickets & Logic</h2>
                        <p className="text-sm text-gray-400 mt-1.5 font-bold">Manage your tickets and their visibility logic.</p>
                    </div>
                </header>

                <div className="flex gap-4 p-1.5 bg-gray-50 rounded-2xl border border-gray-100 w-fit">
                    <button
                        onClick={() => setActiveTab('tickets')}
                        className={cn(
                            "px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all",
                            activeTab === 'tickets' ? "bg-white text-gray-900 shadow-sm border border-gray-100" : "text-gray-400 hover:text-gray-600"
                        )}
                    >
                        Ticket Types
                    </button>
                    <button
                        onClick={() => setActiveTab('logic')}
                        className={cn(
                            "px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                            activeTab === 'logic' ? "bg-white text-gray-900 shadow-sm border border-gray-100" : "text-gray-400 hover:text-gray-600"
                        )}
                    >
                        <Zap className="w-3.5 h-3.5" /> Selection Logic
                    </button>
                </div>

                {activeTab === 'tickets' ? (
                    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="text-sm font-black text-gray-900">Available Tickets</h3>
                                <p className="text-xs text-gray-400 font-bold">Define what tickets are available for purchase.</p>
                            </div>
                            <button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg active:scale-95"
                            >
                                <Plus className="w-3.5 h-3.5" /> Create Ticket
                            </button>
                        </div>

                        {/* Create Pass Modal */}
                        {eventId && (
                            <CreatePassModal
                                isOpen={isCreateModalOpen}
                                onClose={() => setIsCreateModalOpen(false)}
                                eventId={eventId}
                                onPassCreated={onPassCreated}
                            />
                        )}

                        {/* Edit Pass Modal */}
                        {editingPassId && passes.find(p => p.id === editingPassId) && (
                            <EditPassModal
                                isOpen={!!editingPassId}
                                onClose={() => setEditingPassId(null)}
                                pass={passes.find(p => p.id === editingPassId)!}
                                onPassUpdated={() => {
                                    setEditingPassId(null);
                                    onPassCreated();
                                }}
                            />
                        )}

                        {/* Error state */}
                        {error && (
                            <div className="p-6 bg-red-50 border border-red-100 rounded-2xl text-sm text-red-600 font-bold">
                                Failed to load passes: {error}
                            </div>
                        )}

                        {/* Loading skeleton */}
                        {loading && (
                            <div className="grid grid-cols-1 gap-4">
                                <PassCardSkeleton />
                                <PassCardSkeleton />
                                <PassCardSkeleton />
                            </div>
                        )}

                        {/* Empty state */}
                        {!loading && !error && passes.length === 0 && (
                            <div className="p-12 border-2 border-dashed border-gray-100 rounded-[32px] text-center">
                                <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <Tag className="w-6 h-6 text-gray-300" />
                                </div>
                                <h3 className="text-sm font-black text-gray-900 mb-1">No passes yet</h3>
                                <p className="text-xs text-gray-400 font-bold">Create your first ticket type to get started.</p>
                            </div>
                        )}

                        {/* Passes list */}
                        {!loading && !error && passes.length > 0 && (
                            <div className="grid grid-cols-1 gap-4">
                                {passes.map((pass) => {
                                    const status = getPassStatus(pass);
                                    const sold = getSoldCount(pass.id);
                                    const capacity = pass.quantity_available;
                                    const soldPercentage = getSoldPercentage(pass);

                                    return (
                                        <div key={pass.id} className="p-7 border border-gray-100 rounded-[24px] bg-white hover:border-[var(--brand-blue)]/40 transition-all group shadow-sm hover:shadow-md">
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-5">
                                                    <div className={cn(
                                                        "w-12 h-12 rounded-2xl flex items-center justify-center border transition-all",
                                                        status === "active" ? "bg-blue-50 border-blue-100 text-[var(--brand-blue)]" : "bg-gray-50 border-gray-100 text-gray-400"
                                                    )}>
                                                        {pass.type === 'group' ? <Users className="w-5 h-5" /> : <User className="w-5 h-5" />}
                                                    </div>
                                                    <div>
                                                        <h3 className="text-lg font-black text-gray-900 tracking-tight">{pass.title}</h3>
                                                        <div className="flex items-center gap-3 mt-1">
                                                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
                                                                <CircleDollarSign className="w-3 h-3" /> {formatPrice(pass)}
                                                            </span>
                                                            <div className="w-1 h-1 bg-gray-200 rounded-full" />
                                                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
                                                                <Users className="w-3 h-3" /> {sold}/{capacity} Sold
                                                            </span>
                                                            {pass.show_for_option_id && (
                                                                <>
                                                                    <div className="w-1 h-1 bg-gray-200 rounded-full" />
                                                                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-500 flex items-center gap-1.5">
                                                                        <ListChecks className="w-3 h-3" /> Conditional
                                                                    </span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-6">
                                                    <div className="flex flex-col items-end gap-1.5">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                                                                {status === "active" ? "Active" : "Paused"}
                                                            </span>
                                                            <div
                                                                className={cn(
                                                                    "w-8 h-4.5 rounded-full p-0.5 cursor-pointer transition-all duration-300 shadow-inner",
                                                                    status === "active" ? "bg-green-500" : "bg-gray-200"
                                                                )}
                                                            >
                                                                <div className={cn("w-3.5 h-3.5 bg-white rounded-full transition-all shadow-md", status === "active" ? "translate-x-3" : "translate-x-0")} />
                                                            </div>
                                                        </div>
                                                        <div className="w-24 h-1 bg-gray-100 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-[var(--brand-blue)] transition-all duration-1000"
                                                                style={{ width: `${soldPercentage}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 p-1.5 bg-gray-50 rounded-xl border border-gray-100 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => setEditingPassId(pass.id)}
                                                            title="Edit pass"
                                                            className="p-1.5 text-gray-300 hover:text-gray-900 transition-colors"
                                                        >
                                                            <Settings className="w-3.5 h-3.5" />
                                                        </button>
                                                        <div className="w-px h-3.5 bg-gray-200" />
                                                        <button
                                                            onClick={() => {
                                                                setDeletePassId(pass.id);
                                                                setDeletePassTitle(pass.title);
                                                            }}
                                                            title="Delete pass"
                                                            className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 min-h-[600px]">
                        <SelectionLogicView
                            questions={questions}
                            passes={passes}
                            loading={loading}
                            error={error}
                            eventId={eventId}
                            onQuestionCreated={onQuestionCreated}
                            onPassUpdated={onPassUpdated}
                        />
                    </div>
                )}

                <div className="pt-10 grid grid-cols-2 gap-6">
                    <div className="p-8 bg-gray-50/50 rounded-[32px] border border-gray-100 border-dashed flex flex-col items-center justify-center text-center cursor-pointer group hover:bg-white hover:border-[var(--brand-blue)]/30 transition-all">
                        <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <InfinityIcon className="w-5 h-5 text-gray-400" />
                        </div>
                        <h4 className="text-[11px] font-black uppercase tracking-widest text-gray-900 mb-1">Unlimited Capacity</h4>
                        <p className="text-[10px] text-gray-400 font-bold max-w-[180px]">Remove global sales limits for this event.</p>
                    </div>
                    <div className="p-8 bg-gray-50/50 rounded-[32px] border border-gray-100 border-dashed flex flex-col items-center justify-center text-center cursor-pointer group hover:bg-white hover:border-[var(--brand-blue)]/30 transition-all">
                        <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <Clock className="w-5 h-5 text-gray-400" />
                        </div>
                        <h4 className="text-[11px] font-black uppercase tracking-widest text-gray-900 mb-1">Sale Schedule</h4>
                        <p className="text-[10px] text-gray-400 font-bold max-w-[180px]">Automate when your tickets go live.</p>
                    </div>
                </div>

                {deletePassId && typeof document !== 'undefined' && createPortal(
                    <AnimatePresence>
                        <motion.div
                            key="delete-backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => { setDeletePassId(null); setDeletePassTitle(""); }}
                            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
                        />
                        <motion.div
                            key="delete-modal"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none p-4"
                        >
                            <div className="bg-white rounded-[28px] shadow-2xl max-w-sm w-full pointer-events-auto p-8">
                                <div className="flex items-center justify-center w-14 h-14 bg-red-50 rounded-2xl mx-auto mb-5">
                                    <AlertTriangle className="w-7 h-7 text-red-500" />
                                </div>
                                <h3 className="text-lg font-black text-gray-900 text-center mb-2">Delete Ticket</h3>
                                <p className="text-sm text-gray-500 text-center font-bold mb-6">
                                    Are you sure you want to delete <span className="text-gray-900">{deletePassTitle}</span>? This action cannot be undone.
                                </p>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => { setDeletePassId(null); setDeletePassTitle(""); }}
                                        className="flex-1 px-5 py-3 text-sm font-black text-gray-500 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleDeletePass}
                                        disabled={isDeleting}
                                        className={cn(
                                            "flex-1 px-5 py-3 text-sm font-black text-white bg-red-500 rounded-xl transition-all",
                                            isDeleting ? "opacity-50 cursor-not-allowed" : "hover:bg-red-600 active:scale-95"
                                        )}
                                    >
                                        {isDeleting ? "Deleting..." : "Delete"}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </AnimatePresence>,
                    document.body
                )}
            </div>
        </div>
    );
}
