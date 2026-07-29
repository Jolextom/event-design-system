"use client";

import React, { useState, useCallback } from "react";
import {
    DndContext, closestCenter, PointerSensor, useSensor, useSensors,
    DragEndEvent, DragOverlay, DragStartEvent
} from "@dnd-kit/core";
import {
    arrayMove, SortableContext, useSortable, verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, Trash2, Copy, Eraser, GripVertical, ClipboardPaste } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Internal item with stable ID ─────────────────────────────────────────
interface OptionItem { id: string; value: string; }

const makeId = () => crypto.randomUUID();

function toItems(values: string[]): OptionItem[] {
    return values.map(v => ({ id: makeId(), value: v }));
}

// ── Sortable row ─────────────────────────────────────────────────────────
interface SortableRowProps {
    item: OptionItem;
    index: number;
    total: number;
    onChange: (val: string) => void;
    onRemove: () => void;
    onInsertBelow: () => void;
    onDuplicate: () => void;
    overlay?: boolean;
}

function SortableRow({ item, index, total, onChange, onRemove, onInsertBelow, onDuplicate, overlay }: SortableRowProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition: transition ?? "transform 200ms cubic-bezier(0.2, 0, 0, 1)",
    };

    if (isDragging && !overlay) {
        // Ghost placeholder while dragging
        return (
            <div ref={setNodeRef} style={style}
                className="flex items-center gap-2 h-10 rounded-xl bg-blue-50/50 border-2 border-dashed border-[var(--brand-blue)]/30" />
        );
    }

    return (
        <div
            ref={overlay ? undefined : setNodeRef}
            style={overlay ? undefined : style}
            className={cn(
                "flex items-center gap-2 group/row",
                overlay && "shadow-xl rounded-xl bg-white ring-2 ring-[var(--brand-blue)]/20 rotate-[0.8deg]"
            )}
        >
            {/* Drag handle */}
            <button type="button"
                className="p-1.5 text-gray-200 hover:text-gray-500 cursor-grab active:cursor-grabbing shrink-0 touch-none transition-colors"
                {...(overlay ? {} : { ...attributes, ...listeners })}
            >
                <GripVertical className="w-3.5 h-3.5" />
            </button>

            <span className="w-4 text-center text-[10px] font-black text-gray-300 shrink-0 select-none">{index + 1}</span>

            <input
                data-option-input
                type="text"
                value={item.value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={`Option ${index + 1}`}
                onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); onInsertBelow(); }
                    if (e.key === "Backspace" && item.value === "" && total > 1) {
                        e.preventDefault();
                        onRemove();
                        setTimeout(() => {
                            const inputs = document.querySelectorAll<HTMLInputElement>("[data-option-input]");
                            inputs[Math.max(0, index - 1)]?.focus();
                        }, 30);
                    }
                }}
                className="flex-1 bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-gray-900 placeholder:text-gray-300 focus:outline-none focus:border-[var(--brand-blue)] focus:ring-2 focus:ring-[var(--brand-blue)]/15 transition-all"
            />

            <div className="flex items-center gap-0.5 opacity-0 group-hover/row:opacity-100 transition-opacity shrink-0">
                <button type="button" onClick={onInsertBelow} title="Insert below"
                    className="p-1.5 rounded-lg text-gray-300 hover:text-[var(--brand-blue)] hover:bg-blue-50 transition-all">
                    <Plus className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={onDuplicate} title="Duplicate"
                    className="p-1.5 rounded-lg text-gray-300 hover:text-gray-700 hover:bg-gray-100 transition-all">
                    <Copy className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={onRemove} disabled={total <= 1} title="Remove"
                    className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all disabled:opacity-25 disabled:pointer-events-none">
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
}

// ── Public interface ──────────────────────────────────────────────────────
interface OptionsEditorProps {
    options: string[];
    onChange: (options: string[]) => void;
}

export function OptionsEditor({ options, onChange }: OptionsEditorProps) {
    // Internal state uses stable IDs — synced from props only on mount / significant change
    const [items, setItems] = useState<OptionItem[]>(() => toItems(options));
    const [activeItem, setActiveItem] = useState<OptionItem | null>(null);
    const [pasteFocused, setPasteFocused] = useState(false);

    // Push changes up — stable callback to avoid infinite loops
    const pushUp = useCallback((next: OptionItem[]) => {
        onChange(next.map(i => i.value));
    }, [onChange]);

    const updateItem = (id: string, value: string) => {
        const next = items.map(i => i.id === id ? { ...i, value } : i);
        setItems(next);
        pushUp(next);
    };

    const insertBelow = (afterId: string) => {
        const idx = items.findIndex(i => i.id === afterId);
        const next = [...items];
        const newItem = { id: makeId(), value: "" };
        next.splice(idx + 1, 0, newItem);
        setItems(next);
        pushUp(next);
        setTimeout(() => {
            const inputs = document.querySelectorAll<HTMLInputElement>("[data-option-input]");
            inputs[idx + 1]?.focus();
        }, 50);
    };

    const addOption = () => {
        const newItem = { id: makeId(), value: "" };
        const next = [...items, newItem];
        setItems(next);
        pushUp(next);
        setTimeout(() => {
            const inputs = document.querySelectorAll<HTMLInputElement>("[data-option-input]");
            inputs[inputs.length - 1]?.focus();
        }, 50);
    };

    const removeItem = (id: string) => {
        if (items.length <= 1) return;
        const next = items.filter(i => i.id !== id);
        setItems(next);
        pushUp(next);
    };

    const duplicateItem = (id: string) => {
        const idx = items.findIndex(i => i.id === id);
        const next = [...items];
        next.splice(idx + 1, 0, { id: makeId(), value: items[idx].value + " (copy)" });
        setItems(next);
        pushUp(next);
    };

    const sortAZ = () => { const next = [...items].sort((a, b) => a.value.localeCompare(b.value)); setItems(next); pushUp(next); };
    const sortZA = () => { const next = [...items].sort((a, b) => b.value.localeCompare(a.value)); setItems(next); pushUp(next); };
    const clearAll = () => {
        const next = [{ id: makeId(), value: "" }, { id: makeId(), value: "" }];
        setItems(next); pushUp(next);
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const text = e.clipboardData.getData("text");
        let lines = text.split("\n").map(l => l.trim()).filter(Boolean);
        if (lines.length <= 1) lines = text.split(",").map(l => l.trim()).filter(Boolean);
        if (lines.length > 0) {
            const base = items.filter(i => i.value.trim());
            const merged = [...base, ...lines.map(v => ({ id: makeId(), value: v }))];
            const next = merged.length >= 2 ? merged : [...merged, { id: makeId(), value: "" }];
            setItems(next);
            pushUp(next);
        }
        setPasteFocused(false);
    };

    // DnD
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 1 } })
    );

    const handleDragStart = (event: DragStartEvent) => {
        const found = items.find(i => i.id === event.active.id);
        setActiveItem(found ?? null);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveItem(null);
        if (over && active.id !== over.id) {
            const oldIdx = items.findIndex(i => i.id === active.id);
            const newIdx = items.findIndex(i => i.id === over.id);
            const next = arrayMove(items, oldIdx, newIdx);
            setItems(next);
            pushUp(next);
        }
    };

    const hasMeaningful = items.some(i => i.value.trim());

    return (
        <div className="space-y-3">
            {/* Toolbar */}
            <div className="flex items-center justify-between">
                <label className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-400">
                    Options
                    <span className="ml-1.5 text-gray-300 font-semibold normal-case tracking-normal">
                        ({items.filter(i => i.value.trim()).length} / min 1)
                    </span>
                </label>
                {hasMeaningful && (
                    <div className="flex items-center gap-1">
                        <button type="button" onClick={sortAZ} className="px-2 py-1 rounded-lg text-[9px] font-black text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all">A–Z</button>
                        <button type="button" onClick={sortZA} className="px-2 py-1 rounded-lg text-[9px] font-black text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all">Z–A</button>
                        <div className="w-px h-3 bg-gray-200 mx-0.5" />
                        <button type="button" onClick={clearAll} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black text-red-400 hover:text-red-600 hover:bg-red-50 transition-all">
                            <Eraser className="w-3 h-3" /> Clear
                        </button>
                    </div>
                )}
            </div>

            {/* Paste zone */}
            <div
                tabIndex={0}
                onFocus={() => setPasteFocused(true)}
                onBlur={() => setPasteFocused(false)}
                onPaste={handlePaste}
                className={cn(
                    "flex items-center gap-2 p-3 rounded-xl border border-dashed cursor-text transition-all outline-none select-none",
                    pasteFocused
                        ? "border-[var(--brand-blue)]/50 bg-blue-50/50 ring-2 ring-[var(--brand-blue)]/15"
                        : "border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100/60"
                )}
            >
                <ClipboardPaste className={cn("w-3.5 h-3.5 shrink-0 transition-colors", pasteFocused ? "text-[var(--brand-blue)]" : "text-gray-400")} />
                <span className={cn("text-[10px] font-bold transition-colors", pasteFocused ? "text-[var(--brand-blue)]" : "text-gray-400")}>
                    {pasteFocused
                        ? "Press Ctrl+V (or ⌘V) to paste — newline or comma separated"
                        : "Click here then paste a list to bulk-add options"}
                </span>
            </div>

            {/* Draggable list */}
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                        {items.map((item, index) => (
                            <SortableRow
                                key={item.id}
                                item={item}
                                index={index}
                                total={items.length}
                                onChange={(val) => updateItem(item.id, val)}
                                onRemove={() => removeItem(item.id)}
                                onInsertBelow={() => insertBelow(item.id)}
                                onDuplicate={() => duplicateItem(item.id)}
                            />
                        ))}
                    </div>
                </SortableContext>

                {/* Smooth floating drag preview */}
                <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.2, 0, 0, 1)" }}>
                    {activeItem && (
                        <SortableRow
                            item={activeItem}
                            index={items.findIndex(i => i.id === activeItem.id)}
                            total={items.length}
                            onChange={() => { }}
                            onRemove={() => { }}
                            onInsertBelow={() => { }}
                            onDuplicate={() => { }}
                            overlay
                        />
                    )}
                </DragOverlay>
            </DndContext>

            {/* Add button */}
            <button type="button" onClick={addOption}
                className="flex items-center gap-2 w-full px-4 py-2.5 border border-dashed border-gray-200 rounded-xl text-[11px] font-black uppercase tracking-widest text-gray-400 hover:text-[var(--brand-blue)] hover:border-[var(--brand-blue)]/40 hover:bg-blue-50/30 transition-all">
                <Plus className="w-3.5 h-3.5" />
                Add option
                <span className="ml-auto text-[9px] text-gray-300 font-semibold normal-case tracking-normal">or press Enter in any field</span>
            </button>
        </div>
    );
}
