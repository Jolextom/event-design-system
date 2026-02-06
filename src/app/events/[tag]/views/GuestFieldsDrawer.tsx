import React from "react";
import { motion } from "framer-motion";
import { X, Tag, Plus, Trash2, Shuffle, Eye, EyeOff, GripVertical, ChevronUp, ChevronDown, User, Ticket, Calendar, Hash, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EventVariable } from "../types";

interface ColumnConfig {
    id: string;
    label: string;
    type: 'standard' | 'custom';
    visible: boolean;
}

interface GuestFieldsDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    // Data
    variables: EventVariable[];
    columnConfig: ColumnConfig[];
    // Actions
    onOpenCreateModal: () => void;
    onEditVariable: (variable: EventVariable) => void;
    onDeleteVariable: (e: React.MouseEvent, id: string) => void;
    onRunAutomation: (variable: EventVariable) => void;
    onToggleColumn: (id: string) => void;
    onMoveColumn: (id: string, direction: 'up' | 'down') => void;
}

export function GuestFieldsDrawer({
    isOpen,
    onClose,
    variables,
    columnConfig,
    onOpenCreateModal,
    onEditVariable,
    onDeleteVariable,
    onRunAutomation,
    onToggleColumn,
    onMoveColumn
}: GuestFieldsDrawerProps) {
    if (!isOpen) return null;

    const getIconForField = (type: string, id: string) => {
        if (type === 'custom') return <Tag className="w-4 h-4" />;
        switch (id) {
            case 'attendee': return <User className="w-4 h-4" />;
            case 'ticket': return <Ticket className="w-4 h-4" />;
            case 'created_at': return <Calendar className="w-4 h-4" />;
            case 'ref': return <Hash className="w-4 h-4" />;
            case 'status': return <CheckCircle2 className="w-4 h-4" />;
            default: return <Tag className="w-4 h-4" />;
        }
    };

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
                className="fixed right-0 top-0 bottom-0 w-[480px] bg-white shadow-2xl z-[10000] flex flex-col overflow-hidden border-l border-gray-100"
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
                        <p className="text-sm text-gray-500 font-medium mt-1">Manage, reorder, and toggle fields.</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 -mr-2 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-full transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-8 bg-gray-50/50">
                    <div className="space-y-6">
                        {/* Add New Button */}
                        <button
                            onClick={onOpenCreateModal}
                            className="w-full py-6 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer hover:border-purple-300 hover:bg-purple-50/50 transition-all gap-3 group bg-transparent"
                        >
                            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 group-hover:bg-purple-100 group-hover:text-purple-500 transition-colors shadow-sm">
                                <Plus className="w-5 h-5" />
                            </div>
                            <span className="text-sm font-black text-gray-900 group-hover:text-purple-700">Add New Guest Field</span>
                        </button>

                        <div className="space-y-3">
                            {columnConfig.filter(c => c.id !== 'attendee').map((col, index) => {
                                const variable = variables.find(v => v.id === col.id);
                                const isCustom = col.type === 'custom';

                                return (
                                    <div
                                        key={col.id}
                                        className={cn(
                                            "group flex items-center gap-3 p-3 rounded-xl border transition-all bg-white relative",
                                            col.visible ? "border-gray-100 hover:border-purple-200 hover:shadow-sm" : "border-gray-100 opacity-60 bg-gray-50"
                                        )}
                                        onClick={() => isCustom && variable && onEditVariable(variable)}
                                    >
                                        {/* Ordering Actions */}
                                        <div className="flex flex-col gap-1 text-gray-300" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                onClick={() => onMoveColumn(col.id, 'up')}
                                                disabled={index === 0}
                                                className="hover:text-purple-600 disabled:opacity-20 transition-colors"
                                            >
                                                <ChevronUp className="w-3 h-3" />
                                            </button>
                                            <button
                                                onClick={() => onMoveColumn(col.id, 'down')}
                                                disabled={index === columnConfig.length - 1}
                                                className="hover:text-purple-600 disabled:opacity-20 transition-colors"
                                            >
                                                <ChevronDown className="w-3 h-3" />
                                            </button>
                                        </div>

                                        {/* Icon */}
                                        <div className={cn(
                                            "w-10 h-10 rounded-lg flex items-center justify-center border",
                                            isCustom ? "bg-purple-50 text-purple-600 border-purple-100" : "bg-gray-100 text-gray-500 border-gray-200"
                                        )}>
                                            {getIconForField(col.type, col.id)}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <h3 className="text-sm font-bold text-gray-900 truncate">{col.label}</h3>
                                                {!col.visible && (
                                                    <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">Hidden</span>
                                                )}
                                                {isCustom && (
                                                    <span className="text-[9px] font-bold uppercase tracking-wider text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">Custom</span>
                                                )}
                                            </div>

                                            {/* Metadata / Badges (Only for Custom Variables) */}
                                            {isCustom && variable && (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] text-gray-400 font-medium capitalize">
                                                        {variable.type}
                                                    </span>
                                                    {variable.type === 'select' && variable.settings?.method === 'random_equal' && (
                                                        <span className="text-[9px] font-bold text-purple-400 flex items-center gap-1 bg-purple-50 px-1.5 rounded">
                                                            <Shuffle className="w-2.5 h-2.5" />
                                                            Auto-Distribute
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                            {/* Toggle Visibility */}
                                            <button
                                                onClick={() => onToggleColumn(col.id)}
                                                className={cn(
                                                    "p-2 rounded-lg transition-all",
                                                    col.visible ? "text-gray-400 hover:bg-gray-100 hover:text-gray-900" : "text-gray-400 bg-gray-100 hover:bg-gray-200"
                                                )}
                                                title={col.visible ? "Hide Field" : "Show Field"}
                                            >
                                                {col.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                            </button>

                                            {/* Custom Actions: Smart Fill & Delete */}
                                            {isCustom && variable && (
                                                <>
                                                    {variable.type === 'select' && variable.settings?.method?.includes('random') && (
                                                        <button
                                                            onClick={() => onRunAutomation(variable)}
                                                            className="p-2 text-purple-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
                                                            title="Run Smart Fill"
                                                        >
                                                            <Shuffle className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={(e) => onDeleteVariable(e, variable.id)}
                                                        className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                        title="Delete Field"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </motion.div >
        </>
    );
}
