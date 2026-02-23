"use client";

import React, { useState, useEffect, useRef } from "react";
import { Calendar as CalendarIcon, Clock, Check, Plus, X, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import * as Popover from "@radix-ui/react-popover";
import { DayPicker } from "react-day-picker";
import { format, parse, isValid, startOfDay, isBefore } from "date-fns";
import "react-day-picker/dist/style.css";

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDisplayDate(val: string) {
    if (!val) return "";
    try {
        return format(new Date(val + "T00:00:00"), "EEE, MMM d, yyyy");
    } catch { return val; }
}

function formatDisplayTime(val: string) {
    if (!val) return "";
    try {
        const [h, m] = val.split(":").map(Number);
        const d = new Date();
        d.setHours(h, m);
        return format(d, "h:mm a");
    } catch { return val; }
}

// ── Custom Pickers ────────────────────────────────────────────────────────

// 1. Date Picker Popover
function DatePicker({ value, min, onChange, children, open, onOpenChange }: any) {
    const selected = value ? new Date(value + "T00:00:00") : undefined;
    const disabled = min ? { before: new Date(min + "T00:00:00") } : false;

    return (
        <Popover.Root open={open} onOpenChange={onOpenChange}>
            <Popover.Trigger asChild>{children}</Popover.Trigger>
            <Popover.Portal>
                <Popover.Content
                    sideOffset={8}
                    className="z-[9999] bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 p-4 animate-in zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 duration-200"
                >
                    <DayPicker
                        mode="single"
                        selected={selected}
                        onSelect={(date) => {
                            if (date) {
                                onChange(format(date, "yyyy-MM-dd"));
                                onOpenChange(false);
                            }
                        }}
                        disabled={disabled}
                        showOutsideDays
                        className="font-sans"
                        classNames={{
                            months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                            month: "space-y-4",
                            caption: "flex justify-center pt-1 relative items-center",
                            caption_label: "text-sm font-black text-gray-900 tracking-tight",
                            nav: "space-x-1 flex items-center",
                            nav_button: "h-7 w-7 bg-transparent p-0 hover:bg-gray-100 rounded-full transition-colors flex items-center justify-center text-gray-500",
                            nav_button_previous: "absolute left-1",
                            nav_button_next: "absolute right-1",
                            table: "w-full border-collapse space-y-1",
                            head_row: "flex",
                            head_cell: "text-gray-400 rounded-md w-9 font-bold text-[10px] uppercase tracking-widest",
                            row: "flex w-full mt-2",
                            cell: "h-9 w-9 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
                            day: "h-9 w-9 p-0 font-bold hover:bg-gray-100 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)] text-gray-700",
                            day_selected: "bg-[var(--brand-blue)] text-white hover:bg-[var(--brand-blue)] hover:text-white focus:bg-[var(--brand-blue)] focus:text-white font-black",
                            day_today: "bg-gray-50 text-gray-900",
                            day_outside: "text-gray-300 opacity-50",
                            day_disabled: "text-gray-300 opacity-50 cursor-not-allowed hover:bg-transparent",
                            day_hidden: "invisible",
                        }}

                    />
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    );
}

// 2. Time Picker Popover (Generates a clean list of 15-min intervals)
function TimePicker({ value, onChange, children, open, onOpenChange }: any) {
    const times = Array.from({ length: 96 }).map((_, i) => {
        const h = Math.floor(i / 4);
        const m = (i % 4) * 15;
        const d = new Date();
        d.setHours(h, m, 0);
        return {
            value: format(d, "HH:mm"),
            label: format(d, "h:mm a"),
            isAM: h < 12
        };
    });

    const scrollRef = useRef<HTMLDivElement>(null);

    // Scroll to active time when opening
    useEffect(() => {
        if (open && value && scrollRef.current) {
            const el = scrollRef.current.querySelector(`[data-value="${value}"]`);
            if (el) el.scrollIntoView({ block: "center" });
        }
    }, [open, value]);

    return (
        <Popover.Root open={open} onOpenChange={onOpenChange}>
            <Popover.Trigger asChild>{children}</Popover.Trigger>
            <Popover.Portal>
                <Popover.Content
                    sideOffset={8}
                    className="z-[9999] bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 p-2 animate-in zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 duration-200 w-48 flex flex-col max-h-[300px]"
                >
                    <div className="px-3 py-3 border-b border-gray-50 mb-1 shrink-0 space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block">Exact Time</label>
                        <input
                            type="time"
                            value={value}
                            onChange={(e) => {
                                if (e.target.value) {
                                    onChange(e.target.value);
                                    // Don't auto-close popover when typing
                                }
                            }}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-[var(--brand-blue)] outline-none font-mono tracking-tight"
                        />
                    </div>
                    <div ref={scrollRef} className="overflow-y-auto custom-scrollbar flex-1 p-1 space-y-0.5">
                        {times.map((t) => {
                            const isSelected = t.value === value;
                            return (
                                <button
                                    key={t.value}
                                    data-value={t.value}
                                    onClick={() => {
                                        onChange(t.value);
                                        onOpenChange(false);
                                    }}
                                    className={cn(
                                        "w-full text-left px-3 py-2 rounded-xl text-sm font-bold transition-all flex items-center justify-between",
                                        isSelected
                                            ? "bg-[var(--brand-blue)] text-white shadow-sm"
                                            : "hover:bg-gray-50 text-gray-700"
                                    )}
                                >
                                    <span>{t.label.split(' ')[0]}</span>
                                    <span className={cn(
                                        "text-[10px] font-black uppercase tracking-widest",
                                        isSelected ? "text-white/80" : "text-gray-400"
                                    )}>{t.label.split(' ')[1]}</span>
                                </button>
                            );
                        })}
                    </div>
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    );
}


// ── Field Row ─────────────────────────────────────────────────────────────

interface FieldRowProps {
    label: string;
    Icon: React.ElementType;
    type: "date" | "time";
    value: string;
    min?: string;
    onChange: (v: string) => void;
    rightSlot?: React.ReactNode;
}

function FieldRow({ label, Icon, type, value, min, onChange, rightSlot }: FieldRowProps) {
    const [open, setOpen] = useState(false);
    const isDone = !!value;

    const TriggerContent = (
        <button
            type="button"
            className={cn(
                "w-full flex items-center gap-3 rounded-2xl border px-4 py-3.5 text-left transition-all duration-200 group flex-1",
                open
                    ? "border-[var(--brand-blue)] ring-2 ring-[var(--brand-blue)]/10 bg-white shadow-sm"
                    : isDone
                        ? "border-gray-200 bg-white shadow-sm hover:border-gray-300"
                        : "border-dashed border-gray-200 bg-gray-50/40 hover:bg-white hover:border-gray-300"
            )}
        >
            <Icon className={cn(
                "w-4 h-4 shrink-0 transition-colors",
                open ? "text-[var(--brand-blue)]" : isDone ? "text-gray-400" : "text-gray-300"
            )} />

            <div className="flex-1 min-w-0 text-left">
                {isDone && (
                    <p className={cn(
                        "text-[9px] font-black uppercase tracking-widest leading-none mb-1 transition-colors",
                        open ? "text-[var(--brand-blue)]" : "text-gray-400"
                    )}>
                        {label}
                    </p>
                )}
                <p className={cn(
                    "text-sm font-bold leading-none",
                    isDone ? "text-gray-900" : "text-gray-400"
                )}>
                    {isDone
                        ? (type === "date" ? formatDisplayDate(value) : formatDisplayTime(value))
                        : (type === "date" ? "Pick a date" : "Pick a time")
                    }
                </p>
            </div>
        </button>
    );

    return (
        <div className="flex items-center gap-2 relative">
            {/* The actual dropdown picker */}
            <div className="flex-1 min-w-0">
                {type === "date" ? (
                    <DatePicker value={value} min={min} onChange={onChange} open={open} onOpenChange={setOpen}>
                        {TriggerContent}
                    </DatePicker>
                ) : (
                    <TimePicker value={value} onChange={onChange} open={open} onOpenChange={setOpen}>
                        {TriggerContent}
                    </TimePicker>
                )}
            </div>

            {/* Sibling right action slotted outside the button */}
            {rightSlot && <div className="shrink-0">{rightSlot}</div>}
        </div>
    );
}

// ── Step Dot ──────────────────────────────────────────────────────────────

function StepDot({ done, active }: { done: boolean; active: boolean }) {
    if (done) return (
        <div className="w-6 h-6 rounded-full bg-[var(--brand-blue)] flex items-center justify-center shadow-sm shadow-blue-200 ring-4 ring-[var(--brand-blue)]/10 z-20">
            <Check className="w-3 h-3 text-white stroke-[3]" />
        </div>
    );
    if (active) return (
        <div className="relative flex items-center justify-center w-6 h-6 z-20">
            <span className="absolute inset-0 rounded-full bg-[var(--brand-blue)]/15 animate-ping" style={{ animationDuration: "2s" }} />
            <div className="relative w-5 h-5 rounded-full bg-white border-2 border-[var(--brand-blue)] z-10 shadow-sm" />
        </div>
    );
    return <div className="w-5 h-5 rounded-full border-2 border-gray-200 bg-white z-20" />;
}

// ── Public API ────────────────────────────────────────────────────────────

interface DateTimeStepperProps {
    startDate: string;
    startTime: string;
    endTime: string;
    endDate: string;
    isMultiDay: boolean;
    onStartDateChange: (val: string) => void;
    onStartTimeChange: (val: string) => void;
    onEndTimeChange: (val: string) => void;
    onEndDateChange: (val: string) => void;
    onToggleMultiDay: () => void;
}

export function DateTimeStepper({
    startDate, startTime, endTime, endDate, isMultiDay,
    onStartDateChange, onStartTimeChange,
    onEndTimeChange, onEndDateChange, onToggleMultiDay,
}: DateTimeStepperProps) {
    const startDone = !!startDate && !!startTime;
    const endDone = !!endTime;
    const activeStep = !startDone ? 0 : !endDone ? 1 : -1;

    return (
        <div className="relative pl-9">
            {/* Vertical track */}
            <div className="absolute left-[10px] top-5 bottom-5 w-[2px] bg-gray-100 rounded-full z-0">
                <div
                    className="w-full rounded-full bg-[var(--brand-blue)] transition-all duration-500 ease-out z-0"
                    style={{ height: startDone ? (endDone ? "100%" : "60%") : "0%" }}
                />
            </div>

            {/* ── START ─────────────────────────────────────────────── */}
            <div className="relative mb-3">
                <div className="absolute -left-9 top-1/2 -translate-y-1/2 z-20">
                    <StepDot done={startDone} active={activeStep === 0} />
                </div>

                <div className="space-y-2 relative z-10">
                    <FieldRow
                        label="Start date"
                        Icon={CalendarIcon}
                        type="date"
                        value={startDate}
                        min={format(new Date(), "yyyy-MM-dd")}
                        onChange={onStartDateChange}
                    />
                    {startDate && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-200 mt-2">
                            <FieldRow
                                label="Start time"
                                Icon={Clock}
                                type="time"
                                value={startTime}
                                onChange={onStartTimeChange}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* ── END ───────────────────────────────────────────────── */}
            {startDone && (
                <div className="relative animate-in fade-in slide-in-from-top-4 duration-300 mt-6 pt-3">

                    {/* Visual connection spacer for the line animation */}
                    <div className="absolute -top-6 left-[10px] w-[2px] h-6 bg-transparent z-0" />

                    <div className="absolute -left-9 top-1/2 -translate-y-1/2 z-20">
                        <StepDot done={endDone} active={activeStep === 1} />
                    </div>

                    <div className="space-y-2 relative z-10">
                        {isMultiDay && (
                            <div className="animate-in fade-in slide-in-from-top-2 duration-200 mb-2">
                                <FieldRow
                                    label="End date"
                                    Icon={CalendarIcon}
                                    type="date"
                                    value={endDate}
                                    min={startDate}
                                    onChange={onEndDateChange}
                                />
                            </div>
                        )}

                        <FieldRow
                            label="End time"
                            Icon={Clock}
                            type="time"
                            value={endTime}
                            onChange={onEndTimeChange}
                            rightSlot={
                                isMultiDay ? (
                                    <button
                                        type="button"
                                        onClick={onToggleMultiDay}
                                        className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-gray-400 hover:text-red-500 transition-colors h-12 px-3 rounded-xl hover:bg-red-50"
                                    >
                                        <X className="w-3 h-3" /> <span className="hidden sm:inline">Multi-day</span>
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={onToggleMultiDay}
                                        className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-gray-400 hover:text-[var(--brand-blue)] transition-colors whitespace-nowrap group/add h-12 px-3 rounded-xl hover:bg-blue-50"
                                    >
                                        <span className="w-4 h-4 rounded-full border border-gray-300 group-hover/add:border-[var(--brand-blue)] flex items-center justify-center transition-colors bg-white">
                                            <Plus className="w-2.5 h-2.5" />
                                        </span>
                                        End date
                                    </button>
                                )
                            }
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
