"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Clock, ShieldCheck, CheckCircle2, MoreHorizontal, User, Ticket, Users, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Attendee, Question, Pass } from "../../types";
import { cn } from "@/lib/utils";

interface RegistryTableProps {
    attendees: Attendee[];
    questions: Question[];
    passes?: Pass[];
    loading?: boolean;
    groupStats?: Record<string, number>;
}

export function RegistryTable({
    attendees,
    questions,
    passes = [],
    loading,
    groupStats = {},
    isDev = false,
    onDelete
}: RegistryTableProps & { isDev?: boolean; onDelete?: (ids: string[]) => void }) {
    const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());

    // Handle Select All
    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(new Set(attendees.map(a => a.id)));
        } else {
            setSelectedIds(new Set());
        }
    };

    // Handle Individual Select
    const handleSelectOne = (id: string, checked: boolean) => {
        const next = new Set(selectedIds);
        if (checked) next.add(id);
        else next.delete(id);
        setSelectedIds(next);
    };

    // Handle Bulk Delete
    const handleBulkDelete = () => {
        if (!onDelete) return;
        if (confirm(`Delete ${selectedIds.size} attendees? This cannot be undone.`)) {
            onDelete(Array.from(selectedIds));
            setSelectedIds(new Set());
        }
    };

    const allSelected = attendees.length > 0 && selectedIds.size === attendees.length;
    const isIndeterminate = selectedIds.size > 0 && selectedIds.size < attendees.length;

    return (
        <div className="flex-1 overflow-auto custom-scrollbar bg-white border-t border-gray-50">
            <table className="w-full text-left border-separate border-spacing-0 min-w-max">
                <thead className="sticky top-0 bg-white z-30">
                    <tr className="border-b border-gray-100">
                        <th className="pl-8 py-6 w-12 text-center sticky left-0 bg-white z-40">
                            <input
                                type="checkbox"
                                className="w-4 h-4 rounded border-gray-200 accent-(--brand-blue)"
                                checked={allSelected}
                                ref={input => { if (input) input.indeterminate = isIndeterminate; }}
                                onChange={handleSelectAll}
                            />
                        </th>
                        <th className="px-4 py-6 text-[12px] font-black uppercase tracking-[0.2em] text-gray-400 sticky left-12 bg-white z-40 min-w-[240px]">
                            {isDev && selectedIds.size > 0 ? (
                                <button
                                    onClick={handleBulkDelete}
                                    className="flex items-center gap-2 text-red-500 hover:text-red-600 transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Delete ({selectedIds.size})
                                </button>
                            ) : (
                                "Attendee"
                            )}
                        </th>
                        <th className="px-4 py-6 text-[12px] font-black uppercase tracking-[0.2em] text-gray-400 bg-white">Ticket</th>
                        {questions.map(q => (
                            <th key={q.id} className="px-4 py-6 text-[12px] font-black uppercase tracking-[0.2em] text-gray-400 max-w-[200px] truncate bg-white">
                                {q.title}
                            </th>
                        ))}
                        <th className="px-4 py-6 text-[12px] font-black uppercase tracking-[0.2em] text-gray-400 bg-white">Reference</th>
                        <th className="px-4 py-6 text-[12px] font-black uppercase tracking-[0.2em] text-gray-400 bg-white">Registered</th>
                        <th className="px-4 py-6 text-[12px] font-black uppercase tracking-[0.2em] text-gray-400 bg-white">Status</th>
                        <th className="px-4 py-6 text-[12px] font-black uppercase tracking-[0.2em] text-gray-400 text-right pr-8 sticky right-0 bg-white z-40">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 min-h-[600px]">
                    <AnimatePresence mode="wait" initial={false}>
                        {attendees.length === 0 && !loading ? (
                            <tr key="empty">
                                <td colSpan={8 + questions.length} className="py-20 text-center">
                                    <div className="flex flex-col items-center justify-center text-gray-400">
                                        <Search className="w-10 h-10 mb-4 opacity-20" />
                                        <p className="text-sm font-bold">No guests found matching your criteria</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            attendees.map((attendee) => {
                                const ticketName = passes.find(p => p.id === attendee.pass_id)?.title || "-";

                                // Logic extracted here for cleaner usage in the JSX below
                                const pass = passes.find(p => p.id === attendee.pass_id);
                                const isGroup = pass?.type === 'group';
                                const isPrimary = isGroup && attendee.order?.email === attendee.email;
                                const groupSize = pass?.group_size || 0;
                                const usedSlots = (attendee.order_id && groupStats[attendee.order_id]) || 1;

                                return (
                                    <motion.tr
                                        key={attendee.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="group hover:bg-gray-50/50 transition-all cursor-default border-b border-gray-50 last:border-0"
                                    >
                                        <td className="pl-8 py-4 text-center sticky left-0 bg-white group-hover:bg-gray-50 z-20">
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 rounded border-gray-200 accent-(--brand-blue)"
                                                checked={selectedIds.has(attendee.id)}
                                                onChange={(e) => handleSelectOne(attendee.id, e.target.checked)}
                                            />
                                        </td>
                                        <td className="px-4 py-4 sticky left-12 bg-white group-hover:bg-gray-50 z-20 shadow-[6px_0_12px_-6px_rgba(0,0,0,0.05)] border-r border-gray-100">
                                            <div className="flex items-center gap-3 pr-4">
                                                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center font-black text-[11px] text-gray-500 group-hover:bg-(--brand-blue) group-hover:text-white transition-all border border-gray-100">
                                                    {attendee.first_name.charAt(0)}{attendee.last_name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="text-[13px] font-black text-gray-900 tracking-tight leading-none mb-1">
                                                        {attendee.first_name} {attendee.last_name}
                                                    </p>
                                                    <p className="text-[10px] font-bold text-gray-400">{attendee.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-2">
                                                {/* ICON RENDER LOGIC */}
                                                {(() => {
                                                    if (isPrimary) {
                                                        return (
                                                            <div className="w-6 h-6 rounded-lg bg-blue-500 text-white flex items-center justify-center shadow-blue-200 shadow-sm relative group/icon">
                                                                <Users className="w-3 h-3" />
                                                            </div>
                                                        );
                                                    }
                                                    if (isGroup) {
                                                        return (
                                                            <div className="w-6 h-6 rounded-lg bg-gray-100/50 flex items-center justify-center text-gray-400">
                                                                <Users className="w-3 h-3" />
                                                            </div>
                                                        );
                                                    }
                                                    return (
                                                        <div className="w-6 h-6 rounded-lg bg-gray-100/50 flex items-center justify-center text-gray-400">
                                                            <Ticket className="w-3 h-3" />
                                                        </div>
                                                    );
                                                })()}

                                                {/* TICKET NAME */}
                                                <span className="text-[11px] font-bold text-gray-600 truncate max-w-[140px]" title={ticketName}>
                                                    {ticketName}
                                                </span>

                                                {/* SLOT USAGE BADGE (Moved Here) */}
                                                {isPrimary && groupSize > 1 && (
                                                    <div className="flex items-center gap-1.5 px-1.5 py-0.5 bg-blue-50 border border-blue-100 rounded-md">
                                                        <span className="text-[9px] font-black text-blue-600 tracking-tight">
                                                            {usedSlots}/{groupSize}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        {questions.map(q => {
                                            const response = (attendee as any).responses?.[q.id] || "-";
                                            return (
                                                <td key={q.id} className="px-4 py-4 max-w-[200px] relative">
                                                    <div className="text-[11px] font-bold text-gray-500 truncate" title={response}>
                                                        {response}
                                                    </div>
                                                </td>
                                            );
                                        })}
                                        <td className="px-4 py-4">
                                            <span className="text-[11px] font-mono font-bold text-gray-600 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                                                {attendee.ref}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-1.5 text-gray-400">
                                                <Clock className="w-3 h-3" />
                                                <span className="text-[10px] font-bold">
                                                    {attendee.created_at ? formatDistanceToNow(new Date(attendee.created_at.endsWith("Z") ? attendee.created_at : attendee.created_at + "Z"), { addSuffix: true }) : "N/A"}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-2">
                                                {attendee.check_in_time ? (
                                                    <>
                                                        <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">Checked In</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <CheckCircle2 className="w-3.5 h-3.5 text-gray-300" />
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Confirmed</span>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-right pr-8 sticky right-0 bg-white group-hover:bg-gray-50 z-20 shadow-[-6px_0_12px_-6px_rgba(0,0,0,0.05)] border-l border-gray-100">
                                            <div className="flex items-center justify-end gap-2">
                                                {isDev && (
                                                    <button
                                                        onClick={() => onDelete?.([attendee.id])}
                                                        title="Delete (Dev Only)"
                                                        className="p-2 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <button className="p-2 text-gray-300 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all">
                                                    <MoreHorizontal className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </motion.tr>
                                );
                            })
                        )}
                    </AnimatePresence>
                </tbody>
            </table>
        </div>
    );
}