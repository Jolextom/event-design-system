"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ListChecks, Type, Settings, Trash2, GripVertical } from "lucide-react";
import { Question } from "../../types";
import { cn } from "@/lib/utils";

interface QuestionCardProps {
    question: Question;
    onEdit: (q: Question) => void;
    onDelete: (id: string) => void;
}

export function QuestionCard({
    question,
    onEdit,
    onDelete
}: QuestionCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: question.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : "auto",
        position: isDragging ? "relative" as const : "static" as const,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "p-7 border border-gray-100 rounded-[24px] bg-white transition-all group shadow-sm list-none touch-none",
                isDragging ? "shadow-xl ring-2 ring-[var(--brand-blue)]/20 rotate-1" : "hover:border-[var(--brand-blue)]/40 hover:shadow-md"
            )}
        >
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-gray-50 rounded-xl text-gray-400 group-hover:text-[var(--brand-blue)] group-hover:bg-blue-50/50 transition-all border border-gray-100">
                        {question.question_type === "select" ? <ListChecks className="w-4.5 h-4.5" /> : <Type className="w-4.5 h-4.5" />}
                    </div>
                    <div>
                        <h4 className="font-black text-base text-gray-900">{question.title}</h4>
                        <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-widest">
                            {question.question_type} Field {question.is_required && "• Required"}
                        </p>
                    </div>
                </div>
                {/* Actions: Always visible on mobile/touch (lg:opacity-0 hides it on desktop until hover) */}
                <div className="flex items-center gap-2 p-1.5 bg-gray-50 rounded-xl border border-gray-100 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={() => onEdit(question)}
                        className="p-1.5 text-gray-300 hover:text-gray-900 transition-colors"
                        title="Edit question"
                    >
                        <Settings className="w-3.5 h-3.5" />
                    </button>
                    <div className="w-px h-3.5 bg-gray-200" />
                    <button
                        onClick={() => onDelete(question.id)}
                        className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"
                        title="Delete question"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <div className="w-px h-3.5 bg-gray-200" />
                    <button
                        className="p-1.5 text-gray-300 cursor-grab active:cursor-grabbing hover:text-gray-900 touch-none"
                        title="Drag to reorder"
                        {...attributes}
                        {...listeners}
                    >
                        <GripVertical className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {question.question_type === "select" && question.options && question.options.length > 0 && (
                <div className="pl-14 pt-5 border-t border-gray-50 flex gap-2.5 overflow-x-auto pb-1 no-scrollbar mt-5">
                    {question.options.map((opt) => (
                        <span key={opt.id} className="px-4 py-1.5 bg-gray-50 rounded-xl text-[12px] font-black text-gray-600 border border-gray-100 flex items-center gap-2.5 whitespace-nowrap">
                            {opt.option_text}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}
