import React from "react";
import { motion } from "framer-motion";
import { X, Tag, Plus, Trash2, Shuffle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EventVariable } from "../types";

interface GuestFieldsDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    variables: EventVariable[];
    onOpenCreateModal: () => void;
    onEditVariable: (variable: EventVariable) => void;
    onDeleteVariable: (e: React.MouseEvent, id: string) => void;
    onRunAutomation: (variable: EventVariable) => void;
}

export function GuestFieldsDrawer({
    isOpen,
    onClose,
    variables,
    onOpenCreateModal,
    onEditVariable,
    onDeleteVariable,
    onRunAutomation
}: GuestFieldsDrawerProps) {
    if (!isOpen) return null;

    return (
        <>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 bg-white/20 backdrop-blur-sm z-[9999]"
            />
            <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 300, mass: 0.8 }}
                className="fixed right-0 top-0 bottom-0 w-120 bg-white shadow-2xl z-[10000] flex flex-col overflow-hidden border-l border-gray-100"
            >
                {/* Header */}
                <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-white relative z-10">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <div className="bg-purple-50 p-2 rounded-lg border border-purple-100 text-purple-600">
                                <Tag className="w-5 h-5" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-purple-600">Configuration</span>
                        </div>
                        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Guest Fields</h2>
                        <p className="text-sm text-gray-500 font-medium mt-1">Manage custom data points for your guests.</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 -mr-2 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-full transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-gray-50/50">
                    <button
                        onClick={onOpenCreateModal}
                        className="w-full py-4 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer hover:border-purple-300 hover:bg-purple-50 transition-all gap-2 group bg-white"
                    >
                        <div className="p-2 bg-gray-100 rounded-full text-gray-400 group-hover:bg-purple-100 group-hover:text-purple-500 transition-colors">
                            <Plus className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-bold text-gray-600 group-hover:text-purple-700">Add New Guest Field</span>
                    </button>

                    <div className="space-y-3">
                        {variables.map((v) => (
                            <div
                                key={v.id}
                                onClick={() => onEditVariable(v)}
                                className="group p-5 bg-white border border-gray-100 rounded-2xl hover:border-purple-200 hover:shadow-md transition-all cursor-pointer relative"
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="text-sm font-black text-gray-900">{v.name}</h3>
                                    <button
                                        onClick={(e) => onDeleteVariable(e, v.id)}
                                        className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-black uppercase tracking-widest bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                                        {v.type}
                                    </span>
                                    {v.type === 'select' && (
                                        <span className="text-[9px] font-bold text-gray-400">
                                            {v.options?.length || 0} options
                                        </span>
                                    )}
                                </div>


                                {
                                    v.type === 'select' && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onRunAutomation(v);
                                            }}
                                            className="absolute right-4 bottom-4 p-2 bg-purple-50 text-purple-600 rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-purple-100 hover:scale-105 flex items-center gap-1.5"
                                            title="Smart Fill (Random Split)"
                                        >
                                            <Shuffle className="w-3.5 h-3.5" />
                                            <span className="text-[9px] font-black uppercase tracking-widest">Smart Fill</span>
                                        </button>
                                    )
                                }
                            </div>
                        ))}
                    </div>
                </div>
            </motion.div >
        </>
    );
}
