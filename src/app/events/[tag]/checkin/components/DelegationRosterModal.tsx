"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
    X,
    Check,
    Search,
    UserPlus,
    Trash2,
    Users,
    Sparkles,
    Trophy,
    GraduationCap,
    Phone,
    Building2,
    CheckCircle2,
    AlertCircle,
    Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface DelegationStudent {
    id: string;
    name: string;
    present: boolean;
    isWalkin?: boolean;
    addedAt?: string;
}

export interface DelegationRosterModalProps {
    isOpen: boolean;
    onClose: () => void;
    schoolName: string;
    pubPriv?: string;
    leadName: string;
    leadEmail: string;
    leadPhone?: string;
    leadRole?: string;
    hackathon?: boolean;
    unipodTour?: boolean;
    declaredTeachersCount: number;
    declaredTeachersList: string[];
    initialStudents: DelegationStudent[];
    initialNotes?: string;
    onSave: (students: DelegationStudent[], notes: string) => Promise<void>;
    saving?: boolean;
}

export default function DelegationRosterModal({
    isOpen,
    onClose,
    schoolName,
    pubPriv,
    leadName,
    leadEmail,
    leadPhone,
    leadRole,
    hackathon,
    unipodTour,
    declaredTeachersCount,
    declaredTeachersList,
    initialStudents,
    initialNotes = "",
    onSave,
    saving = false,
}: DelegationRosterModalProps) {
    const [students, setStudents] = useState<DelegationStudent[]>(initialStudents);
    const [searchQuery, setSearchQuery] = useState("");
    const [walkinName, setWalkinName] = useState("");
    const [notes, setNotes] = useState(initialNotes);
    const [errorMsg, setErrorMsg] = useState("");

    // Sync when initialStudents changes (e.g. on opening a different school)
    useEffect(() => {
        setStudents(initialStudents);
        setSearchQuery("");
        setWalkinName("");
        setNotes(initialNotes || "");
        setErrorMsg("");
    }, [initialStudents, initialNotes, isOpen]);

    const presentCount = useMemo(
        () => students.filter((s) => s.present).length,
        [students]
    );

    const totalCount = students.length;

    const filteredStudents = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();
        if (!q) return students;
        return students.filter((s) => s.name.toLowerCase().includes(q));
    }, [students, searchQuery]);

    if (!isOpen) return null;

    // Toggle single student presence
    const toggleStudent = (id: string) => {
        setStudents((prev) =>
            prev.map((s) => (s.id === id ? { ...s, present: !s.present } : s))
        );
    };

    // Mark all present
    const markAllPresent = () => {
        setStudents((prev) => prev.map((s) => ({ ...s, present: true })));
    };

    // Unmark all
    const unmarkAll = () => {
        setStudents((prev) => prev.map((s) => ({ ...s, present: false })));
    };

    // Add Walk-in Student
    const handleAddWalkin = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = walkinName.trim();
        if (!trimmed) return;

        // Check if student with same name already in list
        const exists = students.some(
            (s) => s.name.toLowerCase() === trimmed.toLowerCase()
        );
        if (exists) {
            setErrorMsg(`"${trimmed}" is already on this roster.`);
            setTimeout(() => setErrorMsg(""), 3000);
            return;
        }

        const newStudent: DelegationStudent = {
            id: `walkin-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            name: trimmed,
            present: true, // newly added walk-ins are present by default
            isWalkin: true,
            addedAt: new Date().toISOString(),
        };

        setStudents((prev) => [...prev, newStudent]);
        setWalkinName("");
        setErrorMsg("");
    };

    // Remove a walk-in student
    const handleRemoveWalkin = (id: string) => {
        setStudents((prev) => prev.filter((s) => s.id !== id));
    };

    // Confirm and save
    const handleConfirm = async () => {
        await onSave(students, notes);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs">
            <div
                className="bg-white w-full max-w-2xl max-h-[92vh] rounded-3xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
                role="dialog"
                aria-modal="true"
            >
                {/* 1. Header */}
                <div className="p-5 sm:p-6 border-b border-gray-100 bg-gray-50/50">
                    <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md">
                                    <Building2 className="w-3 h-3" />
                                    School Delegation
                                </span>
                                {pubPriv && (
                                    <span className="text-[10px] font-black uppercase tracking-wider bg-gray-200 text-gray-700 px-2 py-0.5 rounded-md">
                                        {pubPriv}
                                    </span>
                                )}
                                {hackathon && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-800 px-2 py-0.5 rounded-md">
                                        <Trophy className="w-3 h-3" />
                                        Hackathon Team
                                    </span>
                                )}
                                {unipodTour && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
                                        <Sparkles className="w-3 h-3" />
                                        UNIPOD Tour
                                    </span>
                                )}
                            </div>

                            <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight leading-tight">
                                {schoolName}
                            </h2>

                            <div className="flex items-center gap-3 text-xs text-gray-500 font-bold flex-wrap pt-0.5">
                                <span className="inline-flex items-center gap-1 text-gray-700">
                                    <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
                                    Lead: {leadName} {leadRole ? `(${leadRole})` : ""}
                                </span>
                                {leadPhone && (
                                    <span className="inline-flex items-center gap-1 text-gray-500">
                                        <Phone className="w-3.5 h-3.5" />
                                        {leadPhone}
                                    </span>
                                )}
                            </div>
                        </div>

                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors shrink-0"
                            aria-label="Close"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Quick Stats Strip */}
                    <div className="mt-4 pt-3 border-t border-gray-200/60 flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-500">Attendance:</span>
                            <div className="inline-flex items-center gap-1.5 bg-white border border-gray-200 px-3 py-1 rounded-xl shadow-xs">
                                <span className="text-sm font-black text-emerald-600">
                                    {presentCount}
                                </span>
                                <span className="text-xs font-bold text-gray-400">/ {totalCount} Present</span>
                            </div>
                        </div>

                        <div className="text-xs font-bold text-gray-500">
                            Teachers Declared: <strong className="text-gray-900">{declaredTeachersCount}</strong>
                            {declaredTeachersList.length > 0 && (
                                <span className="text-[11px] text-gray-400 font-normal ml-1">
                                    ({declaredTeachersList.slice(0, 2).join(", ")}
                                    {declaredTeachersList.length > 2 ? "..." : ""})
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* 2. Controls & Fast Action Strip */}
                <div className="p-4 border-b border-gray-100 bg-white space-y-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                        {/* Search inside delegation */}
                        <div className="relative flex-1 min-w-[180px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search student name..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-7 py-2 bg-gray-50 rounded-xl text-xs font-bold text-gray-900 placeholder:text-gray-400 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery("")}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        {/* Batch Action Buttons */}
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={markAllPresent}
                                className="text-xs font-black px-3 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition-colors"
                            >
                                Mark All Present
                            </button>
                            <button
                                type="button"
                                onClick={unmarkAll}
                                className="text-xs font-black px-3 py-2 bg-gray-50 text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors"
                            >
                                Clear All
                            </button>
                        </div>
                    </div>

                    {/* Add Walk-in Student Row */}
                    <form onSubmit={handleAddWalkin} className="flex items-center gap-2">
                        <input
                            type="text"
                            placeholder="+ Add walk-in student (e.g. Babatunde Fashola)..."
                            value={walkinName}
                            onChange={(e) => setWalkinName(e.target.value)}
                            className="flex-1 px-3 py-2 bg-gray-50 rounded-xl text-xs font-bold text-gray-900 placeholder:text-gray-400 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                            type="submit"
                            disabled={!walkinName.trim()}
                            className="inline-flex items-center gap-1 text-xs font-black px-3.5 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors shrink-0"
                        >
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>Add</span>
                        </button>
                    </form>

                    {errorMsg && (
                        <div className="text-[11px] font-bold text-amber-700 bg-amber-50 p-2 rounded-lg flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            {errorMsg}
                        </div>
                    )}
                </div>

                {/* 3. Student List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-1.5 divide-y divide-gray-50 max-h-[45vh]">
                    {filteredStudents.length === 0 ? (
                        <div className="py-12 text-center text-gray-400">
                            <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                            <p className="text-xs font-bold">
                                {searchQuery ? "No students matching your search" : "No students listed yet"}
                            </p>
                        </div>
                    ) : (
                        filteredStudents.map((student) => (
                            <div
                                key={student.id}
                                onClick={() => toggleStudent(student.id)}
                                className={cn(
                                    "pt-1.5 first:pt-0 flex items-center justify-between p-3 rounded-2xl cursor-pointer select-none transition-all",
                                    student.present
                                        ? "bg-emerald-50/70 hover:bg-emerald-50 text-emerald-950 border border-emerald-200/60"
                                        : "bg-gray-50/70 hover:bg-gray-100 text-gray-700 border border-transparent"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    {/* Big Checkbox */}
                                    <div
                                        className={cn(
                                            "w-6 h-6 rounded-lg flex items-center justify-center font-black transition-all text-xs shrink-0",
                                            student.present
                                                ? "bg-emerald-600 text-white shadow-xs"
                                                : "border-2 border-gray-300 bg-white"
                                        )}
                                    >
                                        {student.present && <Check className="w-4 h-4 stroke-[3]" />}
                                    </div>

                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-black">
                                                {student.name}
                                            </span>
                                            {student.isWalkin && (
                                                <span className="text-[10px] font-black uppercase bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded">
                                                    Walk-in
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <span
                                        className={cn(
                                            "text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md",
                                            student.present
                                                ? "bg-emerald-200/60 text-emerald-800"
                                                : "bg-gray-200/60 text-gray-500"
                                        )}
                                    >
                                        {student.present ? "Present" : "Absent"}
                                    </span>

                                    {student.isWalkin && (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleRemoveWalkin(student.id);
                                            }}
                                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Remove Walk-in Student"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* 4. Footer */}
                <div className="p-4 sm:p-5 border-t border-gray-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="text-xs text-gray-500 font-bold w-full sm:w-auto text-center sm:text-left">
                        Total students marked present:{" "}
                        <strong className="text-emerald-700 text-sm font-black">{presentCount}</strong> of{" "}
                        {totalCount}
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={saving}
                            className="flex-1 sm:flex-none px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors"
                        >
                            Cancel
                        </button>

                        <button
                            type="button"
                            onClick={handleConfirm}
                            disabled={saving}
                            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>Saving Attendance...</span>
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Confirm Check-In ({presentCount} Present)</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
