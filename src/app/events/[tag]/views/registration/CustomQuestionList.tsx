"use client";

import React from "react";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    TouchSensor,
    DragEndEvent
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { Question } from "../../types";
import { QuestionCard } from "./QuestionCard";

interface CustomQuestionListProps {
    questions: Question[];
    onReorder: (newOrder: Question[]) => void;
    onEdit: (q: Question) => void;
    onDelete: (id: string) => void;
}

export function CustomQuestionList({
    questions,
    onReorder,
    onEdit,
    onDelete
}: CustomQuestionListProps) {
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(TouchSensor, {
            // Hold for 250ms to activate drag on touch devices
            // Tolerance of 5px allows for slight movement during hold
            activationConstraint: {
                delay: 250,
                tolerance: 5,
            },
        })
    );

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = questions.findIndex((q) => q.id === active.id);
            const newIndex = questions.findIndex((q) => q.id === over.id);

            onReorder(arrayMove(questions, oldIndex, newIndex));
        }
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
        >
            <SortableContext
                items={questions}
                strategy={verticalListSortingStrategy}
            >
                <div className="space-y-4">
                    {questions.map((q) => (
                        <QuestionCard
                            key={q.id}
                            question={q}
                            onEdit={onEdit}
                            onDelete={onDelete}
                        />
                    ))}
                </div>
            </SortableContext>
        </DndContext>
    );
}
