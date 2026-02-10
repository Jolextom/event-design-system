"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Sparkles, X, Mail, Download, UserCheck, Search, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@supabase/supabase-js";
import { evaluateSegment } from "../utils/segmentLogic";
import type { Attendee, EventVariable, Group, Question } from "../types";

// Components
import { CreateSmartGroupModal } from "./CreateSmartGroupModal";
import { CreateVariableModal } from "./CreateVariableModal";
import { RunAutomationModal } from "./RunAutomationModal";
import { SmartGroupsList } from "./SmartGroupsList";
// import { VariableManager } from "./VariableManager"; // Removed
import { GuestFieldsDrawer } from "./GuestFieldsDrawer";
import { SegmentDetailsPanel } from "./SegmentDetailsPanel";
import { GuestDetailsSidePanel } from "./registry/GuestDetailsSidePanel";

// Interfaces
// Interfaces removed (imported from types)

interface SmartGroupsViewProps {
    onNavigateToRegistry?: (group: Group, breakdown?: string | null) => void;
    eventId: string | null;
    attendees?: Attendee[];
    initialGroups: Group[];
    initialVariables: EventVariable[];
    questions?: Question[];
    loading?: boolean;
    onRefresh?: () => void;
}

export function SmartGroupsView({
    onNavigateToRegistry,
    eventId,
    attendees = [],
    initialGroups = [],
    initialVariables = [],
    questions = [],
    loading: parentLoading = false,
    onRefresh
}: SmartGroupsViewProps) {
    const [mounted, setMounted] = useState(false);

    // Supabase client
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Data State
    const [groups, setGroups] = useState<Group[]>(initialGroups);
    const [variables, setVariables] = useState<EventVariable[]>(initialVariables);

    // UI State
    const [loading, setLoading] = useState(parentLoading);

    // Modal State
    const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState<Group | null>(null);
    const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
    const [isGuestFieldsDrawerOpen, setIsGuestFieldsDrawerOpen] = useState(false);
    const [selectedGuest, setSelectedGuest] = useState<Attendee | null>(null);

    const [isCreateVarModalOpen, setIsCreateVarModalOpen] = useState(false);
    const [editingVariable, setEditingVariable] = useState<EventVariable | null>(null);
    const [isRunAutomationModalOpen, setIsRunAutomationModalOpen] = useState(false);
    const [targetVariable, setTargetVariable] = useState<EventVariable | undefined>(undefined);

    // Initial mount
    useEffect(() => {
        setMounted(true);
    }, []);

    // Sync props to state
    useEffect(() => {
        setGroups(initialGroups);
    }, [initialGroups]);

    useEffect(() => {
        setVariables(initialVariables);
    }, [initialVariables]);

    useEffect(() => {
        setLoading(parentLoading);
    }, [parentLoading]);

    // Generate Question Groups (Breakdown Type)
    const questionGroups = React.useMemo(() => {
        if (!questions.length) return [];

        return questions
            .filter(q => q.question_type === 'select' || q.question_type === 'text') // Text can also be broken down potentially, but select is main one
            .map(q => {
                // Calculate breakdown
                const totalAnswers = attendees.filter(a => a.responses && a.responses[q.id]).length;

                // Get unique options or all answers
                // For select, use defined options. For text, maybe group by value (though dangerous for cardinality)
                // Let's stick to SELECT for now as per user request
                if (q.question_type !== 'select') return null;

                const optionsBreakdown = (q.options || []).map(opt => {
                    const count = attendees.filter(a => a.responses?.[q.id] === opt.option_text).length;
                    return {
                        label: opt.option_text,
                        count,
                        pct: totalAnswers > 0 ? Math.round((count / totalAnswers) * 100) : 0,
                        color: "bg-blue-500", // Default or random
                        guests: [] // We don't need to populate this fully unless used
                    };
                });

                return {
                    id: `q-${q.id}`,
                    name: q.title,
                    type: 'breakdown',
                    rule: 'Question Group',
                    color: 'bg-indigo-100 text-indigo-700',
                    count: totalAnswers,
                    options: optionsBreakdown,
                    rules_config: { type: 'question', questionId: q.id } // Custom config for details panel to know what to do
                } as Group;
            })
            .filter(Boolean) as Group[];
    }, [questions, attendees]);

    // Recalculate counts for standard groups
    useEffect(() => {
        if (!attendees.length) return;

        setGroups(prevGroups => {
            const updated = prevGroups.map(group => {
                if (group.type === 'auto-segment' || group.type === 'manual') {
                    let count = 0;
                    if (group.rules_config) {
                        count = attendees.filter(guest => evaluateSegment(guest, group.rules_config)).length;
                    }
                    if (count !== group.count) return { ...group, count };
                }
                return group;
            });

            if (JSON.stringify(updated) !== JSON.stringify(prevGroups)) return updated;
            return prevGroups;
        });
    }, [attendees, isCreateGroupModalOpen]); // Removed groups.length to avoid loops with initialGroups sync logic if not careful

    // --- Handlers ---

    const handleSaveGroup = async (newGroup: any) => {
        // Optimistic UI
        if (groups.some(g => g.id === newGroup.id)) {
            setGroups(prev => prev.map(g => g.id === newGroup.id ? newGroup : g));
        } else {
            setGroups(prev => [...prev, newGroup]);
        }

        setIsCreateGroupModalOpen(false);
        setEditingGroup(null);

        if (eventId) {
            await supabase.from("smart_segments").upsert({
                ...(newGroup.id.startsWith('g-') ? {} : { id: newGroup.id }),
                event_id: eventId,
                name: newGroup.name,
                type: newGroup.type,
                rule: newGroup.rule,
                rules_config: newGroup.rules_config,
                color: newGroup.color,
                count: newGroup.count
            });

            if (onRefresh) onRefresh();
        }
    };

    const handleDeleteGroup = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!confirm("Delete this segment?")) return;
        setGroups(prev => prev.filter(g => g.id !== id));
        if (selectedGroup?.id === id) setSelectedGroup(null);
        if (eventId && !id.startsWith('g-')) {
            await supabase.from("smart_segments").delete().eq("id", id);
            if (onRefresh) onRefresh();
        }
    };

    const handleSaveVariable = async (variable: any) => {
        if (variable.id) {
            setVariables(prev => prev.map(v => v.id === variable.id ? { ...v, ...variable } : v));
        } else {
            setVariables(prev => [...prev, { ...variable, id: `temp-${Date.now()}` } as EventVariable]);
        }

        setIsCreateVarModalOpen(false);
        setEditingVariable(null);

        if (eventId) {
            const { data } = await supabase.from("event_variables").upsert({
                ...(variable.id && !variable.id.startsWith('temp-') ? { id: variable.id } : {}),
                event_id: eventId,
                name: variable.name,
                type: variable.type,
                options: variable.options
            }).select().single();

            setVariables(prev => prev.map(v => v.id.startsWith('temp-') && v.name === data.name ? (data as EventVariable) : v));
        }
        if (onRefresh) onRefresh();
    };

    const handleDeleteVariable = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!confirm("Delete variable?")) return;
        setVariables(prev => prev.filter(v => v.id !== id));
        if (eventId && !id.startsWith('temp-')) {
            await supabase.from("event_variables").delete().eq("id", id);
            if (onRefresh) onRefresh();
        }
    };

    // Column Configuration State (Mocked/Local for Drawer compatibility)
    const [columnConfig, setColumnConfig] = useState<{ id: string; label: string; type: 'standard' | 'custom'; visible: boolean }[]>([
        { id: 'attendee', label: 'Attendee', type: 'standard', visible: true },
        { id: 'ticket', label: 'Ticket', type: 'standard', visible: true },
        { id: 'ref', label: 'Reference', type: 'standard', visible: true },
        { id: 'created_at', label: 'Registered At', type: 'standard', visible: true },
        { id: 'status', label: 'Status', type: 'standard', visible: true },
    ]);

    // Sync variables to column config
    React.useEffect(() => {
        setColumnConfig(prev => {
            const existingIds = new Set(prev.map(c => c.id));
            const newCols = [...prev];

            // Add new variables that aren't in config
            variables.forEach(v => {
                if (!existingIds.has(v.id)) {
                    newCols.push({ id: v.id, label: v.name, type: 'custom', visible: true });
                }
            });

            // Filter out stale custom variables
            const variableIds = new Set(variables.map(v => v.id));
            return newCols.filter(c => c.type === 'standard' || variableIds.has(c.id));
        });
    }, [variables]);

    const handleToggleColumn = (id: string) => {
        setColumnConfig(prev => prev.map(c => c.id === id ? { ...c, visible: !c.visible } : c));
    };

    const handleMoveColumn = (id: string, direction: 'up' | 'down') => {
        setColumnConfig(prev => {
            const index = prev.findIndex(c => c.id === id);
            if (index === -1) return prev;
            if (direction === 'up' && index === 0) return prev;
            if (direction === 'down' && index === prev.length - 1) return prev;

            const newCols = [...prev];
            const swapIndex = direction === 'up' ? index - 1 : index + 1;
            [newCols[index], newCols[swapIndex]] = [newCols[swapIndex], newCols[index]];
            return newCols;
        });
    };

    // --- Render ---

    return (
        <div className="h-full relative">
            <div className="h-full overflow-y-auto bg-white custom-scrollbar">
                <div className="max-w-4xl p-10 mx-auto space-y-10 pb-24">

                    {/* Segments List - Pass onOpenDrawer for the button */}


                    <SmartGroupsList
                        groups={[...questionGroups, ...groups]}
                        onOpenCreateModal={() => setIsCreateGroupModalOpen(true)}
                        onSelectGroup={setSelectedGroup}
                        onEditGroup={(g) => { setEditingGroup(g); setIsCreateGroupModalOpen(true); }}
                        onDeleteGroup={handleDeleteGroup}
                        loading={loading}
                    />

                    {/* VariableManager was here - now hidden */}

                    {/* Info Helper */}
                    <div className="bg-blue-50/50 rounded-4xl p-8 border border-blue-100 flex items-start gap-6 border-dashed">
                        <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-blue-100 flex items-center justify-center shrink-0">
                            <Sparkles className="w-6 h-6 text-[var(--brand-blue)]" />
                        </div>
                        <div>
                            <h4 className="text-sm font-black text-gray-900 tracking-tight">How Smart Groups Work</h4>
                            <p className="text-xs text-gray-500 mt-1.5 font-bold leading-relaxed max-w-xl">
                                Any guest who matches your rules is automatically added here. You can use these groups to send targeted emails, print specific badges, or unlock private logic flows.
                            </p>
                            <button className="text-[var(--brand-blue)] text-[10px] font-black uppercase tracking-widest mt-4 hover:underline">Read the Guide</button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals & Slide-overs */}
            {mounted && createPortal(
                <AnimatePresence>
                    <GuestFieldsDrawer
                        isOpen={isGuestFieldsDrawerOpen}
                        onClose={() => setIsGuestFieldsDrawerOpen(false)}
                        variables={variables}
                        columnConfig={columnConfig}
                        onOpenCreateModal={() => setIsCreateVarModalOpen(true)}
                        onEditVariable={(v) => { setEditingVariable(v); setIsCreateVarModalOpen(true); }}
                        onDeleteVariable={handleDeleteVariable}
                        onRunAutomation={(v) => {
                            setTargetVariable(v);
                            setIsRunAutomationModalOpen(true);
                        }}
                        onToggleColumn={handleToggleColumn}
                        onMoveColumn={handleMoveColumn}
                    />

                    {/* Side Panel */}
                    {selectedGroup && (
                        <SegmentDetailsPanel
                            selectedGroup={selectedGroup}
                            attendees={attendees}
                            onClose={() => setSelectedGroup(null)}
                            onNavigateToRegistry={onNavigateToRegistry}
                            onSelectGuest={setSelectedGuest}
                        />
                    )}

                    {/* Guest Details Panel (for auditing/editing variables) */}
                    <GuestDetailsSidePanel
                        isOpen={!!selectedGuest}
                        onClose={() => setSelectedGuest(null)}
                        attendee={selectedGuest}
                        questions={[]} // Pass empty if unavailable in this view, typically fetched in parent or self-fetching
                        passes={[]} // Same
                        onUpdate={() => {
                            // Ideally trigger a re-fetch of attendees in parent
                            console.log("Guest updated");
                        }}
                    />

                    {/* Modals - Render LAST to be on top */}
                    {(isCreateGroupModalOpen || editingGroup) && (
                        <CreateSmartGroupModal
                            initialGroup={editingGroup || undefined}
                            onClose={() => {
                                setIsCreateGroupModalOpen(false);
                                setEditingGroup(null);
                            }}
                            onSave={handleSaveGroup}
                        />
                    )}
                    {(isCreateVarModalOpen || editingVariable) && (
                        <CreateVariableModal
                            initialVariable={editingVariable || undefined}
                            onClose={() => {
                                setIsCreateVarModalOpen(false);
                                setEditingVariable(null);
                            }}
                            onSave={handleSaveVariable}
                        />
                    )}

                    <RunAutomationModal
                        isOpen={isRunAutomationModalOpen}
                        onClose={() => {
                            setIsRunAutomationModalOpen(false);
                            setTargetVariable(undefined);
                        }}
                        eventId={eventId || ""}
                        targetVariable={targetVariable}
                        onComplete={() => {
                            // Optional refresh
                        }}
                    />


                </AnimatePresence>,
                document.body
            )}
        </div>
    );
}
