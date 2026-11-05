"use client";

import { CheckCircle2, ChevronDown, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Question } from "@/app/events/[tag]/types";
import { choiceCls, hairline, inputCls, muted, Radio } from "./ui";

export type AnswerValue = string | string[] | number;

/** Dropdown entries use the page's own colours (the modal background and text), so they read on light and dark themes alike. */
const optionCls = "bg-[color:var(--pg-modal)] text-[color:var(--pg-text)]";

/**
 * One registration question, whatever its type (text, long text, single choice,
 * dropdown, checkboxes, scale, stars). Used by the event page, the invite page
 * and the receipt page's add-member box, so a guest sees the SAME form
 * wherever they fill it in.
 */
export function QuestionField({
    question: q,
    value,
    onChange,
}: {
    question: Question;
    value: AnswerValue | undefined;
    onChange: (value: AnswerValue) => void;
}) {
    const toggleCheckbox = (optionText: string) => {
        const current = (value as string[]) || [];
        onChange(current.includes(optionText) ? current.filter((v) => v !== optionText) : [...current, optionText]);
    };
    const scaleMin = q.scale_config?.min ?? 1;
    const scaleMax = q.scale_config?.max ?? 5;
    const scaleValues = Array.from({ length: Math.max(1, scaleMax - scaleMin + 1) }, (_, i) => scaleMin + i);

    return (
        <div>
            <label className="mb-1.5 block text-sm font-medium">
                {q.title}
                {q.is_required && <span className="ml-0.5 text-red-500">*</span>}
            </label>

            {q.question_type === "select" && (
                <div className="space-y-2">
                    {q.options?.map((opt) => {
                        const selected = value === opt.option_text;
                        return (
                            <button key={opt.id} type="button" onClick={() => onChange(opt.option_text)} className={choiceCls(selected)}>
                                <Radio selected={selected} />
                                {opt.option_text}
                            </button>
                        );
                    })}
                </div>
            )}

            {q.question_type === "dropdown" && (
                <div className="relative">
                    <select
                        value={(value as string) || ""}
                        onChange={(e) => onChange(e.target.value)}
                        className={cn(inputCls, "h-11 cursor-pointer appearance-none pr-10")}
                    >
                        {/* Explicit colours: the open list is drawn by the browser, and on a dark theme light text on its default white background is invisible. */}
                        <option value="" disabled className={optionCls}>
                            Select an option
                        </option>
                        {q.options?.map((opt) => (
                            <option key={opt.id} value={opt.option_text} className={optionCls}>
                                {opt.option_text}
                            </option>
                        ))}
                    </select>
                    <ChevronDown className={cn("pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2", muted)} />
                </div>
            )}

            {q.question_type === "checkbox" && (
                <div className="space-y-2">
                    {q.options?.map((opt) => {
                        const checked = ((value as string[]) || []).includes(opt.option_text);
                        return (
                            <button key={opt.id} type="button" onClick={() => toggleCheckbox(opt.option_text)} className={choiceCls(checked)}>
                                <span
                                    className={cn(
                                        "grid h-4 w-4 shrink-0 place-items-center rounded border",
                                        checked ? "border-[color:var(--pg-accent)] bg-[color:var(--pg-accent)] text-[color:var(--pg-btn-fg)]" : hairline
                                    )}
                                >
                                    {checked && <CheckCircle2 className="h-3 w-3" />}
                                </span>
                                {opt.option_text}
                            </button>
                        );
                    })}
                </div>
            )}

            {q.question_type === "long_text" && (
                <textarea
                    rows={4}
                    value={(value as string) || ""}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="Your answer"
                    className={cn(inputCls, "resize-none py-3")}
                />
            )}

            {q.question_type === "linear_scale" && (
                <div className="flex items-center gap-2">
                    {scaleValues.map((n) => (
                        <button
                            key={n}
                            type="button"
                            onClick={() => onChange(n)}
                            className={cn(choiceCls(value === n), "flex-1 justify-center px-0 py-2.5 font-medium")}
                        >
                            {n}
                        </button>
                    ))}
                </div>
            )}

            {q.question_type === "star_rating" && (
                <div className="flex items-center gap-1">
                    {scaleValues.map((n) => {
                        const val = (value as number) || 0;
                        return (
                            <button key={n} type="button" onClick={() => onChange(n)} aria-label={`${n} stars`} className="p-1">
                                <Star className={cn("h-6 w-6 transition", n <= val ? "fill-[color:var(--pg-accent)] text-[color:var(--pg-accent)]" : muted)} />
                            </button>
                        );
                    })}
                </div>
            )}

            {(q.question_type === "text" || !q.question_type) && (
                <input
                    value={(value as string) || ""}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="Your answer"
                    className={cn(inputCls, "h-11")}
                />
            )}
        </div>
    );
}
