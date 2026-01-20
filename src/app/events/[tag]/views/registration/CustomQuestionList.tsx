"use client";

import React from "react";
import { Reorder } from "framer-motion";
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
    return (
        <Reorder.Group axis="y" values={questions} onReorder={onReorder} className="space-y-4">
            {questions.map((q) => (
                <QuestionCard
                    key={q.id}
                    question={q}
                    onEdit={onEdit}
                    onDelete={onDelete}
                />
            ))}
        </Reorder.Group>
    );
}
