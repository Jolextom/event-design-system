"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Clock, ShieldCheck, CheckCircle2, MoreHorizontal, User, Ticket, Users, Trash2, Calendar, Hash } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Attendee, Question, Pass } from "../../types";
import { cn } from "@/lib/utils";

interface ColumnConfig {
    id: string;
    label: string;
    type: 'standard' | 'custom';
    visible: boolean;
}

interface RegistryTableProps {
    attendees: Attendee[];
    questions: Question[];
    passes?: Pass[];
    loading?: boolean;
    groupStats?: Record<string, number>;
    onView?: (attendee: Attendee) => void;
    columnConfig?: ColumnConfig[]; // Optional to prevent breaking if not passed immediately
}

export function RegistryTable({
    attendees,
    questions,
    passes = [],
    loading,
    groupStats = {},
    isDev = false,
    onDelete,
    onView,
    columnConfig = [] // Default to empty, but we normally expect it populated
}: RegistryTableProps & { isDev?: boolean; onDelete?: (ids: string[]) => void }) {
    const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());

    // Fallback config if not provided (backward compatibility)
    const effectiveConfig: ColumnConfig[] = columnConfig.length > 0 ? columnConfig : [
        { id: 'attendee', label: 'Attendee', type: 'standard', visible: true },
        { id: 'ticket', label: 'Ticket', type: 'standard', visible: true },
        ...questions.map(q => ({ id: q.id, label: q.title, type: 'custom' as const, visible: true })),
        { id: 'ref', label: 'Reference', type: 'standard', visible: true },
        { id: 'created_at', label: 'Registered', type: 'standard', visible: true },
        { id: 'status', label: 'Status', type: 'standard', visible: true },
    ];

    const visibleColumns = effectiveConfig.filter(c => c.visible);

    // ... selection logic ...
    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(new Set(attendees.map(a => a.id)));
        } else {
            setSelectedIds(new Set());
        }
    };

    const handleSelectOne = (id: string, checked: boolean) => {
        const next = new Set(selectedIds);
        if (checked) next.add(id);
        else next.delete(id);
        setSelectedIds(next);
    };

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
        <div className="flex-1 overflow-auto custom-scrollbar bg-white border-t border-gray-50 pb-20">
            <table className="w-full text-left border-separate border-spacing-0 min-w-max">
                <thead className="sticky top-0 bg-white z-30 shadow-[0_1px_0_0_rgb(243,244,246)]">
                    <tr>
                        <th className="pl-8 py-6 w-12 text-center sticky left-0 bg-white z-40">
                            <input
                                type="checkbox"
                                className="w-4 h-4 rounded border-gray-200 accent-(--brand-blue)"
                                checked={allSelected}
                                ref={input => { if (input) input.indeterminate = isIndeterminate; }}
                                onChange={handleSelectAll}
                            />
                        </th>

                        {visibleColumns.map((col, index) => (
                            <th
                                key={col.id}
                                className={cn(
                                    "px-4 py-6 text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 whitespace-nowrap",
                                    col.id === 'attendee' && "min-w-[240px] sticky left-12 bg-white z-40"
                                )}
                            >
                                {col.id === 'attendee' && isDev && selectedIds.size > 0 ? (
                                    <button
                                        onClick={handleBulkDelete}
                                        className="flex items-center gap-2 text-red-500 hover:text-red-600 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Delete ({selectedIds.size})
                                    </button>
                                ) : (
                                    col.label
                                )}
                            </th>
                        ))}

                        <th className="px-8 py-6 text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 text-right sticky right-0 bg-white z-40">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    <AnimatePresence mode="wait" initial={false}>
                        {attendees.length === 0 && !loading ? (
                            <tr key="empty">
                                <td colSpan={visibleColumns.length + 2} className="py-20 text-center">
                                    <div className="flex flex-col items-center justify-center text-gray-400">
                                        <Search className="w-10 h-10 mb-4 opacity-20" />
                                        <p className="text-sm font-bold">No guests found matching your criteria</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            attendees.map((attendee) => {
                                const ticketName = passes.find(p => p.id === attendee.pass_id)?.title || "-";
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
                                        className="group hover:bg-gray-50/50 transition-all cursor-default"
                                    >
                                        <td className="pl-8 py-3 text-center sticky left-0 bg-white group-hover:bg-gray-50 z-20">
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 rounded border-gray-200 accent-(--brand-blue)"
                                                checked={selectedIds.has(attendee.id)}
                                                onChange={(e) => handleSelectOne(attendee.id, e.target.checked)}
                                            />
                                        </td>

                                        {visibleColumns.map((col) => {
                                            if (col.id === 'attendee') {
                                                return (
                                                    <td key={col.id} className="px-4 py-3 sticky left-12 bg-white group-hover:bg-gray-50 z-20 border-r border-gray-50/50">
                                                        <div className="flex items-center gap-3 pr-4">
                                                            <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center font-black text-[10px] text-gray-500 group-hover:bg-gray-900 group-hover:text-white transition-all border border-gray-100">
                                                                {attendee.first_name.charAt(0)}{attendee.last_name.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <p className="text-[13px] font-bold text-gray-900 tracking-tight leading-none mb-0.5">
                                                                    {attendee.first_name} {attendee.last_name}
                                                                </p>
                                                                <p className="text-[10px] font-bold text-gray-400">{attendee.email}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                );
                                            } else if (col.id === 'ticket') {
                                                return (
                                                    <td key={col.id} className="px-4 py-3">
                                                        <div className="flex items-center gap-2">
                                                            {/* ICON RENDER LOGIC */}
                                                            {(() => {
                                                                if (isPrimary) {
                                                                    return (
                                                                        <div className="w-5 h-5 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center ring-1 ring-blue-100">
                                                                            <Users className="w-2.5 h-2.5" />
                                                                        </div>
                                                                    );
                                                                }
                                                                if (isGroup) {
                                                                    return (
                                                                        <div className="w-5 h-5 rounded-md bg-gray-50 text-gray-400 flex items-center justify-center ring-1 ring-gray-100">
                                                                            <Users className="w-2.5 h-2.5" />
                                                                        </div>
                                                                    );
                                                                }
                                                                return (
                                                                    <div className="w-5 h-5 rounded-md bg-gray-50 text-gray-400 flex items-center justify-center ring-1 ring-gray-100">
                                                                        <Ticket className="w-2.5 h-2.5" />
                                                                    </div>
                                                                );
                                                            })()}

                                                            <span className="text-[11px] font-bold text-gray-600 truncate max-w-[140px]" title={ticketName}>
                                                                {ticketName}
                                                            </span>

                                                            {isPrimary && groupSize > 1 && (
                                                                <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-1.5 rounded-md border border-blue-100">
                                                                    {usedSlots}/{groupSize}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                );
                                            } else if (col.id === 'ref') {
                                                return (
                                                    <td key={col.id} className="px-4 py-3">
                                                        <span className="text-[10px] font-mono font-bold text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                                                            {attendee.ref}
                                                        </span>
                                                    </td>
                                                );
                                            } else if (col.id === 'created_at') {
                                                return (
                                                    <td key={col.id} className="px-4 py-3">
                                                        <div className="flex items-center gap-1.5 text-gray-400">
                                                            <span className="text-[11px] font-medium">
                                                                {attendee.created_at ? formatDistanceToNow(new Date(attendee.created_at.endsWith("Z") ? attendee.created_at : attendee.created_at + "Z"), { addSuffix: true }) : "-"}
                                                            </span>
                                                        </div>
                                                    </td>
                                                );
                                            } else if (col.id === 'status') {
                                                return (
                                                    <td key={col.id} className="px-4 py-3">
                                                        {attendee.check_in_time ? (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 text-[9px] font-black uppercase tracking-wider">
                                                                <ShieldCheck className="w-3 h-3" /> Checked In
                                                            </span>
                                                        ) : attendee.email_status === 'invited' ? (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-600 border border-yellow-100 text-[9px] font-black uppercase tracking-wider">
                                                                <Clock className="w-3 h-3" /> Invited
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-50 text-gray-500 border border-gray-100 text-[9px] font-black uppercase tracking-wider">
                                                                <CheckCircle2 className="w-3 h-3" /> Confirmed
                                                            </span>
                                                        )}
                                                    </td>
                                                );
                                            } else {
                                                // Default / Custom variable
                                                let value = "-";
                                                if (col.type === 'custom') {
                                                    // automationLogic writes to properties using variable name
                                                    value = attendee.properties?.[col.label] ||
                                                        attendee.properties?.[col.id] || // Fallback to ID if changed
                                                        "-";
                                                } else {
                                                    // Standard questions use ID in responses
                                                    value = (attendee as any).responses?.[col.id] || "-";
                                                }

                                                return (
                                                    <td key={col.id} className="px-4 py-3 max-w-[200px]">
                                                        <div className="text-[11px] font-medium text-gray-500 truncate" title={String(value)}>
                                                            {String(value)}
                                                        </div>
                                                    </td>
                                                );
                                            }
                                        })}

                                        <td className="px-8 py-3 text-right sticky right-0 bg-white group-hover:bg-gray-50 z-20 border-l border-gray-50/50">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => onView?.(attendee)}
                                                    className="px-3 py-1.5 bg-gray-900 text-white rounded-lg text-[10px] font-black uppercase tracking-wide hover:scale-105 transition-transform shadow-lg shadow-gray-200"
                                                >
                                                    View
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