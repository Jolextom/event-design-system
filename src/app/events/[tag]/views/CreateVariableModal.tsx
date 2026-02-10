import React, { useState } from "react";
import { motion } from "framer-motion";
import { X, Save, Plus, Trash2, Tag, Type, List, Hash, Calendar, CheckSquare, Zap, MousePointer2, Shuffle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EventVariable } from "../types";

interface CreateVariableModalProps {
    onClose: () => void;
    onSave: (variable: Omit<EventVariable, "id" | "event_id"> & { id?: string }, autoCreateSegments?: boolean, autoAssignNewGuests?: boolean) => void;
    initialVariable?: EventVariable;
}

export function CreateVariableModal({ onClose, onSave, initialVariable }: CreateVariableModalProps) {
    const [name, setName] = useState(initialVariable?.name || "");
    const [type, setType] = useState<EventVariable['type']>(initialVariable?.type || "text");
    const [options, setOptions] = useState<string[]>(initialVariable?.options || []);
    const [newOption, setNewOption] = useState("");
    const [assignmentMethod, setAssignmentMethod] = useState<NonNullable<NonNullable<EventVariable['settings']>['method']>>(initialVariable?.settings?.method || "manual");
    const [autoCreateSegments, setAutoCreateSegments] = useState(false);
    const [autoAssignNewGuests, setAutoAssignNewGuests] = useState(false);

    const handleAddOption = () => {
        if (newOption.trim()) {
            setOptions([...options, newOption.trim()]);
            setNewOption("");
        }
    };

    const handleRemoveOption = (index: number) => {
        setOptions(options.filter((_, i) => i !== index));
    };

    const handleSave = () => {
        onSave({
            id: initialVariable?.id,
            name,
            type,
            options: type === "select" ? options : undefined,
            settings: {
                method: type === "select" ? assignmentMethod : "manual"
            }
        }, autoCreateSegments, autoAssignNewGuests);
        onClose();
    };

    const getTypeIcon = (t: string) => {
        switch (t) {
            case "text": return <Type className="w-4 h-4" />;
            case "select": return <List className="w-4 h-4" />;
            case "number": return <Hash className="w-4 h-4" />;
            case "boolean": return <CheckSquare className="w-4 h-4" />;
            case "date": return <Calendar className="w-4 h-4" />;
            default: return <Type className="w-4 h-4" />;
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/5 transition-all"
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
                {/* Header */}
                <div className="p-8 border-b border-gray-100 flex items-start justify-between bg-white relative z-10">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <div className="bg-purple-50 p-2 rounded-lg border border-purple-100 text-purple-600">
                                <Tag className="w-5 h-5" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-purple-600">Variable Definition</span>
                        </div>
                        <h2 className="text-2xl font-black text-gray-900 tracking-tight">{initialVariable ? "Edit Variable" : "New Variable"}</h2>
                        <p className="text-sm text-gray-500 font-medium mt-1">Define a custom data point for your guests.</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 -mr-2 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-full transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-8 space-y-6">
                    {/* Name Input */}
                    <div className="space-y-3">
                        <label className="text-[11px] font-black uppercase tracking-widest text-gray-400">Variable Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Team Color, T-Shirt Size, Table Number"
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-100 focus:border-purple-200 transition-all"
                            autoFocus
                        />
                    </div>

                    {/* Type Selection */}
                    <div className="space-y-3">
                        <label className="text-[11px] font-black uppercase tracking-widest text-gray-400">Data Type</label>
                        <div className="grid grid-cols-2 gap-3">
                            {(["text", "select", "number", "boolean", "date"] as const).map((t) => (
                                <button
                                    key={t}
                                    onClick={() => setType(t)}
                                    className={cn(
                                        "flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-bold transition-all text-left",
                                        type === t
                                            ? "bg-purple-50 border-purple-200 text-purple-700 shadow-sm"
                                            : "bg-white border-gray-100 text-gray-600 hover:border-gray-200 hover:bg-gray-50"
                                    )}
                                >
                                    {getTypeIcon(t)}
                                    <span className="capitalize">{t}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Options (Only for Select) */}
                    {type === "select" && (
                        <div className="space-y-3 pt-2">
                            <div className="flex items-center justify-between">
                                <label className="text-[11px] font-black uppercase tracking-widest text-gray-400">Options</label>
                                <span className="text-[10px] font-bold text-gray-400">{options.length} options defined</span>
                            </div>

                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newOption}
                                    onChange={(e) => setNewOption(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleAddOption()}
                                    placeholder="Add an option..."
                                    className="flex-1 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:border-purple-300"
                                />
                                <button
                                    onClick={handleAddOption}
                                    disabled={!newOption.trim()}
                                    className="px-4 py-2.5 bg-gray-900 text-white rounded-xl hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="flex flex-wrap gap-2 mt-3">
                                {options.map((opt, i) => (
                                    <div key={i} className="flex items-center gap-2 pl-3 pr-2 py-1.5 bg-purple-50 border border-purple-100 rounded-lg text-purple-700 text-xs font-bold animate-in fade-in zoom-in duration-200">
                                        {opt}
                                        <button onClick={() => handleRemoveOption(i)} className="p-0.5 hover:bg-purple-100 rounded text-purple-400 hover:text-purple-700 transition-colors">
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                                {options.length === 0 && (
                                    <div className="w-full text-center py-6 text-gray-400 text-xs italic border border-dashed border-gray-200 rounded-xl">
                                        No options added yet.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Automation Integration Options (New) */}
                    {type === "select" && !initialVariable && (
                        <div className="space-y-4 pt-4 border-t border-gray-100">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Zap className="w-4 h-4 text-amber-500" />
                                    <label className="text-[11px] font-black uppercase tracking-widest text-amber-600">Smart Actions</label>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3">
                                <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 cursor-pointer transition-all">
                                    <input
                                        type="checkbox"
                                        checked={autoCreateSegments}
                                        onChange={(e) => setAutoCreateSegments(e.target.checked)}
                                        className="mt-1 w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                    />
                                    <div>
                                        <span className="text-sm font-bold text-gray-900 block">Create Smart Groups</span>
                                        <span className="text-xs text-gray-500">Automatically create a Smart Segment for each option (e.g. "Team: Red", "Team: Blue")</span>
                                    </div>
                                </label>

                                {assignmentMethod !== 'manual' && (
                                    <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 cursor-pointer transition-all">
                                        <input
                                            type="checkbox"
                                            checked={autoAssignNewGuests}
                                            onChange={(e) => setAutoAssignNewGuests(e.target.checked)}
                                            className="mt-1 w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                        />
                                        <div>
                                            <span className="text-sm font-bold text-gray-900 block">Auto-Assign New Guests</span>
                                            <span className="text-xs text-gray-500">Automatically run the distribution logic when new guests register.</span>
                                        </div>
                                    </label>
                                )}
                            </div>
                        </div>
                    )}

                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 z-20">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 text-gray-500 font-bold text-xs uppercase tracking-widest hover:text-gray-900 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!name || (type === "select" && options.length === 0)}
                        className="px-8 py-3 bg-purple-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-purple-200 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        <Save className="w-4 h-4" /> {initialVariable ? "Save Changes" : "Create Variable"}
                    </button>
                </div>
            </motion.div >
        </div >
    );
}
