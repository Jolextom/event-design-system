"use client";

import React, { useState } from "react";
import { ListChecks, Sparkles, Plus, Type, Trash2, GripVertical, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function RegistrationView() {
    const [questions, setQuestions] = useState([
        { id: "q1", type: "text", label: "Full Name", required: true, autoSegment: false },
        { id: "q2", type: "select", label: "Expertise Level", options: ["Junior", "Mid", "Senior"], required: true, autoSegment: true },
    ]);

    return (
        <div className="flex h-full overflow-hidden">
            <div className="w-[72px] border-r border-gray-100 flex flex-col items-center py-8 gap-7 shrink-0 bg-gray-50/20">
                <div className="flex flex-col items-center gap-1.5 cursor-pointer group">
                    <div className="w-10 h-10 bg-[var(--brand-blue)] text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-100 group-hover:scale-105 transition-all">
                        <ListChecks className="w-5 h-5" />
                    </div>
                    <span className="text-[8px] font-black uppercase tracking-wider text-[var(--brand-blue)]">Fields</span>
                </div>
                <div className="flex flex-col items-center gap-1.5 opacity-30 cursor-not-allowed">
                    <div className="w-10 h-10 bg-white border border-gray-100 rounded-2xl flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-gray-400" />
                    </div>
                    <span className="text-[8px] font-black uppercase tracking-wider text-gray-400">Logic</span>
                </div>
            </div>

            <div className="flex-1 h-full overflow-y-auto bg-white custom-scrollbar">
                <div className="max-w-3xl p-8 md:p-10 mx-auto space-y-10 pb-24">
                    <header className="flex justify-between items-end border-b border-gray-100 pb-8 mt-4">
                        <div>
                            <h2 className="text-2xl font-black tracking-tight text-gray-900">Signup Form</h2>
                            <p className="text-sm text-gray-400 mt-1.5 font-bold">Ask the right questions to your guests.</p>
                        </div>
                        <button className="flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-2xl text-xs font-black hover:bg-black transition-all shadow-xl shadow-gray-100 active:scale-95">
                            <Plus className="w-4 h-4" /> Add Question
                        </button>
                    </header>

                    <div className="space-y-4">
                        {questions.map((q) => (
                            <div key={q.id} className="p-7 border border-gray-100 rounded-[24px] bg-white hover:border-[var(--brand-blue)]/40 transition-all group shadow-sm hover:shadow-md">
                                <div className="flex justify-between items-start mb-5">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2.5 bg-gray-50 rounded-xl text-gray-400 group-hover:text-[var(--brand-blue)] group-hover:bg-blue-50/50 transition-all border border-gray-100">
                                            {q.type === "select" ? <ListChecks className="w-4.5 h-4.5" /> : <Type className="w-4.5 h-4.5" />}
                                        </div>
                                        <div>
                                            <input
                                                value={q.label}
                                                className="font-black text-base bg-transparent border-none outline-none focus:ring-0 w-64 text-gray-900"
                                                onChange={() => { }}
                                            />
                                            <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-widest">{q.type} Field</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2.5 mr-2 pr-6 border-r border-gray-100">
                                            <div className="flex flex-col items-end">
                                                <span className="text-[9px] font-black uppercase tracking-widest text-blue-600">Auto-Segment</span>
                                                <span className="text-[7px] font-bold text-gray-300 uppercase">Reporting & Logic</span>
                                            </div>
                                            <div
                                                onClick={() => { }}
                                                className={cn("w-9 h-5 rounded-full p-0.5 cursor-pointer transition-all duration-300 shadow-inner", q.autoSegment ? "bg-[var(--brand-blue)]" : "bg-gray-100")}
                                            >
                                                <div className={cn("w-4 h-4 bg-white rounded-full transition-all shadow-md", q.autoSegment ? "translate-x-4" : "translate-x-0")} />
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2.5 mr-2">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-gray-300">Required</span>
                                            <div
                                                onClick={() => { }}
                                                className={cn("w-9 h-5 rounded-full p-0.5 cursor-pointer transition-all duration-300 shadow-inner", q.required ? "bg-green-500" : "bg-gray-100")}
                                            >
                                                <div className={cn("w-4 h-4 bg-white rounded-full transition-all shadow-md", q.required ? "translate-x-4" : "translate-x-0")} />
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 p-1.5 bg-gray-50 rounded-xl border border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                                            <div className="w-px h-3.5 bg-gray-200" />
                                            <button className="p-1.5 text-gray-300 cursor-grab active:cursor-grabbing"><GripVertical className="w-3.5 h-3.5" /></button>
                                        </div>
                                    </div>
                                </div>
                                {q.type === "select" && (
                                    <div className="pl-14 pt-5 border-t border-gray-50 flex gap-2.5 overflow-x-auto pb-1 no-scrollbar">
                                        {q.options?.map((opt, i) => (
                                            <span key={i} className="px-4 py-1.5 bg-gray-50 rounded-xl text-[12px] font-black text-gray-600 border border-gray-100 flex items-center gap-2.5 whitespace-nowrap hover:bg-white hover:shadow-sm transition-all">
                                                {opt}
                                                <X className="w-3 h-3 cursor-pointer text-gray-300 hover:text-red-500" />
                                            </span>
                                        ))}
                                        <button className="px-4 py-1.5 border-2 border-dashed border-gray-100 rounded-xl text-[12px] font-black text-gray-400 hover:border-gray-900 hover:text-gray-900 transition-all">+ Add Option</button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
