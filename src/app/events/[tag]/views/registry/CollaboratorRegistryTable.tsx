"use client";

import React from "react";
import { AlertCircle, Check, Loader2, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export interface CollaboratorAttendeeRow {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    ref: string;
    check_in: boolean | null;
    isMine: boolean;
    pass?: { title: string }[] | null;
}

interface CollaboratorRegistryTableProps {
    attendees: CollaboratorAttendeeRow[];
    loading: boolean;
    emptyMessage: string;
}

/**
 * Read-only registrant list for the collaborator view — deliberately a
 * separate, smaller component from the owner's RegistryTable, which assumes
 * full CRUD/export capability throughout. No edit/delete/export actions here.
 */
export function CollaboratorRegistryTable({ attendees, loading, emptyMessage }: CollaboratorRegistryTableProps) {
    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
            </div>
        );
    }

    if (attendees.length === 0) {
        return (
            <div className="text-center py-20 bg-white rounded-[32px] border border-dashed border-gray-200">
                <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-4" />
                <h4 className="text-sm font-black text-gray-900 mb-1">No guests found</h4>
                <p className="text-xs text-gray-400 font-bold">{emptyMessage}</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <AnimatePresence>
                {attendees.map((attendee) => (
                    <motion.div
                        key={attendee.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className={cn(
                            "p-5 rounded-[24px] border flex items-center justify-between transition-all",
                            attendee.isMine ? "bg-blue-50/50 border-blue-100" : "bg-white border-gray-100"
                        )}
                    >
                        <div className="flex items-center gap-4">
                            <div
                                className={cn(
                                    "w-12 h-12 rounded-2xl flex items-center justify-center text-[11px] font-black uppercase",
                                    attendee.check_in
                                        ? "bg-green-100 text-green-600 border border-green-200"
                                        : "bg-gray-100 text-gray-400 border border-gray-200"
                                )}
                            >
                                {attendee.check_in ? (
                                    <Check className="w-5 h-5" />
                                ) : (
                                    `${attendee.first_name.charAt(0)}${attendee.last_name.charAt(0)}`
                                )}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h4 className="text-base font-black text-gray-900 tracking-tight">
                                        {attendee.first_name} {attendee.last_name}
                                    </h4>
                                    {attendee.isMine && (
                                        <span className="flex items-center gap-1 text-[8px] font-black px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded uppercase border border-blue-200">
                                            <Star className="w-2.5 h-2.5" /> Referred by you
                                        </span>
                                    )}
                                </div>
                                <p className="text-[10px] font-bold text-gray-400 mt-0.5">
                                    {attendee.email} • {attendee.pass?.[0]?.title || "General Admission"}
                                </p>
                            </div>
                        </div>

                        <div className="text-right">
                            {attendee.check_in ? (
                                <span className="text-[9px] font-black uppercase tracking-widest text-green-600 bg-green-100 px-3 py-1.5 rounded-full">
                                    Checked In
                                </span>
                            ) : (
                                <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 bg-gray-50 px-3 py-1.5 rounded-full">
                                    Registered
                                </span>
                            )}
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}
