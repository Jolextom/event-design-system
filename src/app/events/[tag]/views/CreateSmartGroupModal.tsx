"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { X, Plus, Trash2, Filter, Save, CheckCircle2, ChevronDown, ListFilter, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface CreateSmartGroupModalProps {
    onClose: () => void;
    onSave: (group: any) => void;
}

type LogicOperator = "AND" | "OR";
type ConditionOperator =
    | "equals" | "not_equals" | "contains" | "starts_with" | "is_set" | "is_not_set"
    | "gte" | "lte" | "gt" | "lt";

interface Condition {
    id: string;
    field: string;
    operator: ConditionOperator;
    value: string;
}

const FIELDS = [
    { value: "status", label: "Status" },
    { value: "ticket_type", label: "Ticket Type" },
    { value: "email", label: "Email" },
    { value: "company", label: "Company" },
    { value: "checked_in", label: "Checked In" },
    { value: "is_speaker", label: "Is Speaker" },
    { value: "priority", label: "Priority Variable" },
];

const OPERATORS: { value: ConditionOperator; label: string }[] = [
    { value: "equals", label: "Is equal to" },
    { value: "not_equals", label: "Is not equal to" },
    { value: "contains", label: "Contains" },
    { value: "starts_with", label: "Starts with" },
    { value: "gte", label: "Is greater than or equal to" },
    { value: "lte", label: "Is less than or equal to" },
    { value: "gt", label: "Is greater than" },
    { value: "lt", label: "Is less than" },
    { value: "is_set", label: "Is set (Any value)" },
    { value: "is_not_set", label: "Is empty" },
];

export function CreateSmartGroupModal({ onClose, onSave, initialGroup }: { onClose: () => void; onSave: (group: any) => void; initialGroup?: any }) {
    const [name, setName] = useState(initialGroup?.name || "");
    const [logicType, setLogicType] = useState<LogicOperator>(initialGroup?.rules_config?.logicType || "AND");

    // Default condition if new, or parse existing conditions
    const [conditions, setConditions] = useState<Condition[]>(
        initialGroup?.rules_config?.conditions || [{ id: "1", field: "status", operator: "equals", value: "" }]
    );

    const addCondition = () => {
        setConditions([
            ...conditions,
            { id: Math.random().toString(), field: "status", operator: "equals", value: "" }
        ]);
    };

    const removeCondition = (id: string) => {
        if (conditions.length === 1) return;
        setConditions(conditions.filter(c => c.id !== id));
    };

    const updateCondition = (id: string, key: keyof Condition, value: string) => {
        setConditions(conditions.map(c =>
            c.id === id ? { ...c, [key]: value } : c
        ));
    };

    const handleSave = () => {
        // Construct the readable rule string
        const OPERATOR_SYMBOLS: Partial<Record<ConditionOperator, string>> = {
            gte: ">=", lte: "<=", gt: ">", lt: "<"
        };
        const ruleString = conditions.map(c => {
            if (c.operator === 'is_set') return `${c.field} IS SET`;
            if (c.operator === 'is_not_set') return `${c.field} IS EMPTY`;
            const opLabel = OPERATOR_SYMBOLS[c.operator] || c.operator.replace('_', ' ');
            return `${c.field} ${opLabel} '${c.value}'`;
        }).join(` ${logicType} `);

        const newGroup = {
            id: initialGroup?.id || `g-${Date.now()}`, // Preserve ID if editing
            name: name || "Untitled Segment",
            rule: ruleString,
            rules_config: {
                logicType,
                conditions
            },
            count: initialGroup?.count || Math.floor(Math.random() * 100), // Keep existing count or mock new
            color: initialGroup?.color || "bg-blue-100 text-blue-700",
            type: initialGroup?.type || "auto-segment"
        };

        onSave(newGroup);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
            />

            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
                {/* Header */}
                <div className="p-8 border-b border-gray-100 flex items-start justify-between bg-white relative z-10">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <div className="bg-blue-50 text-blue-600 p-2 rounded-lg">
                                <Filter className="w-5 h-5" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">Smart Segment</span>
                        </div>
                        <h2 className="text-2xl font-black text-gray-900 tracking-tight">{initialGroup ? "Edit Segment" : "Create Dynamic Group"}</h2>
                        <p className="text-sm text-gray-400 mt-1 font-bold">Define rules to automatically organize your guest list.</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-xl transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-8 overflow-y-auto custom-scrollbar space-y-8">
                    {/* Name Input */}
                    <div className="space-y-3">
                        <label className="text-[11px] font-black uppercase tracking-widest text-gray-400 pl-1">Segment Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., VIP Speakers from London"
                            className="w-full px-5 py-4 bg-gray-50/50 border border-gray-200 rounded-2xl text-lg font-bold text-gray-900 placeholder:text-gray-300 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                        />
                    </div>

                    {/* Logic Builder */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="text-[11px] font-black uppercase tracking-widest text-gray-400 pl-1">Match Rules</label>

                            {/* Logic Toggle */}
                            <div className="bg-gray-100 p-1 rounded-xl flex">
                                <button
                                    onClick={() => setLogicType("AND")}
                                    className={cn(
                                        "px-4 py-1.5 rounded-lg text-[10px] font-black transition-all",
                                        logicType === "AND" ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"
                                    )}
                                >
                                    MATCH ALL
                                </button>
                                <button
                                    onClick={() => setLogicType("OR")}
                                    className={cn(
                                        "px-4 py-1.5 rounded-lg text-[10px] font-black transition-all",
                                        logicType === "OR" ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"
                                    )}
                                >
                                    MATCH ANY
                                </button>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {conditions.map((condition, index) => (
                                <div key={condition.id} className="flex gap-3 group animate-in fade-in slide-in-from-top-2 duration-300">
                                    {/* Line Connector for visuals */}
                                    {index > 0 && (
                                        <div className="absolute left-8 -mt-6 w-0.5 h-6 bg-gray-200 z-0 hidden" />
                                    )}

                                    <div className="flex-1 p-2 bg-white border border-gray-200 rounded-2xl flex items-center gap-2 shadow-sm focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/5 transition-all relative z-10">
                                        <div className="flex-1 min-w-[140px]">
                                            <div className="relative">
                                                <select
                                                    value={condition.field}
                                                    onChange={(e) => updateCondition(condition.id, "field", e.target.value)}
                                                    className="w-full pl-3 pr-8 py-2 bg-transparent text-xs font-bold text-gray-700 outline-none appearance-none cursor-pointer hover:bg-gray-50 rounded-lg transition-colors"
                                                >
                                                    {FIELDS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                                                </select>
                                                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                                            </div>
                                        </div>

                                        <div className="w-[1px] h-6 bg-gray-100" />

                                        <div className="flex-1 min-w-[140px]">
                                            <div className="relative">
                                                <select
                                                    value={condition.operator}
                                                    onChange={(e) => updateCondition(condition.id, "operator", e.target.value as ConditionOperator)}
                                                    className="w-full pl-3 pr-8 py-2 bg-transparent text-xs font-bold text-gray-600 outline-none appearance-none cursor-pointer hover:bg-gray-50 rounded-lg transition-colors"
                                                >
                                                    {OPERATORS.map(op => <option key={op.value} value={op.value}>{op.label}</option>)}
                                                </select>
                                                <ListFilter className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                                            </div>
                                        </div>

                                        {(condition.operator !== 'is_set' && condition.operator !== 'is_not_set') && (
                                            <>
                                                <div className="w-[1px] h-6 bg-gray-100" />
                                                <input
                                                    type={["gte", "lte", "gt", "lt"].includes(condition.operator) ? "number" : "text"}
                                                    value={condition.value}
                                                    onChange={(e) => updateCondition(condition.id, "value", e.target.value)}
                                                    placeholder="Value..."
                                                    className="flex-1 px-3 py-2 bg-gray-50 rounded-xl text-xs font-bold text-gray-900 placeholder:text-gray-400 outline-none focus:bg-blue-50/50 transition-colors"
                                                />
                                            </>
                                        )}
                                    </div>

                                    <button
                                        onClick={() => removeCondition(condition.id)}
                                        disabled={conditions.length === 1}
                                        className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-300"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={addCondition}
                            className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-4 py-3 rounded-xl transition-all w-full justify-center border border-dashed border-blue-200 hover:border-blue-300"
                        >
                            <Plus className="w-3.5 h-3.5" /> Add Condition
                        </button>
                    </div>

                    {/* Preview Box */}
                    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-6 text-white shadow-xl shadow-gray-200 overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-32 bg-blue-500/20 blur-[100px] rounded-full" />

                        <div className="relative z-10 flex items-center justify-between">
                            <div>
                                <div className="flex items-center gap-2 text-blue-300 mb-2">
                                    <Users className="w-4 h-4" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Live Preview</span>
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-4xl font-black tracking-tighter">
                                        {/* Mock random count based on inputs to feel alive */}
                                        {initialGroup?.count ?? (name ? Math.floor(Math.random() * 50) + 12 : 0)}
                                    </span>
                                    <span className="text-sm font-bold text-gray-400">Guests match this segment</span>
                                </div>
                            </div>

                            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/10">
                                <CheckCircle2 className="w-6 h-6 text-green-400" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 z-20">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 rounded-2xl text-xs font-black text-gray-500 hover:text-gray-900 hover:bg-gray-200/50 transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!name}
                        className="px-8 py-3 bg-[var(--brand-blue)] text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-200 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        <Save className="w-4 h-4" /> {initialGroup ? "Save Changes" : "Create Segment"}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
