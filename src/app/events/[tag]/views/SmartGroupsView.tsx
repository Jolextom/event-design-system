"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Sparkles, X, Mail, Download, UserCheck, Search, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@supabase/supabase-js";
import { evaluateSegment } from "../utils/segmentLogic";
import type { Attendee, EventVariable } from "../types";

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
interface Group {
    id: string;
    name: string;
    rule: string;
    count: number;
    color: string;
    type: string;
    options?: BreakdownOption[];
    rules_config?: any;
}

interface BreakdownOption {
    label: string;
    count: number;
    pct: number;
    color: string;
    guests: Guest[];
}

interface Guest {
    name: string;
    email: string;
    status: string;
    avatar: string;
}

interface SmartGroupsViewProps {
    onNavigateToRegistry?: () => void;
    eventId: string | null;
    attendees?: Attendee[];
}

export function SmartGroupsView({ onNavigateToRegistry, eventId, attendees = [] }: SmartGroupsViewProps) {
    const [mounted, setMounted] = useState(false);

    // Supabase client
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Data State
    const [groups, setGroups] = useState<Group[]>([]);
    const [variables, setVariables] = useState<EventVariable[]>([]);

    // UI State
    const [loading, setLoading] = useState(false);

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

    // Fetch Data
    useEffect(() => {
        const fetchData = async () => {
            if (!eventId) return;
            setLoading(true);

            // Fetch Segments
            const { data: segData } = await supabase
                .from("smart_segments")
                .select("*")
                .eq("event_id", eventId)
                .order("created_at", { ascending: true });

            if (segData) {
                const dbGroups: Group[] = segData.map((seg: any) => ({
                    id: seg.id,
                    name: seg.name,
                    rule: seg.rule,
                    count: seg.count ?? 0,
                    color: seg.color ?? "bg-blue-100 text-blue-700",
                    type: seg.type,
                    rules_config: seg.rules_config,
                }));
                setGroups(dbGroups);
            }

            // Fetch Variables
            const { data: varData } = await supabase
                .from("event_variables")
                .select("*")
                .eq("event_id", eventId)
                .order("created_at", { ascending: true });

            if (varData) {
                setVariables(varData as EventVariable[]);
            }

            setLoading(false);
        };

        fetchData();
    }, [eventId]);

    // Recalculate counts
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
    }, [attendees, groups.length, isCreateGroupModalOpen]);

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
        }
    };

    const handleDeleteGroup = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!confirm("Delete this segment?")) return;
        setGroups(prev => prev.filter(g => g.id !== id));
        if (selectedGroup?.id === id) setSelectedGroup(null);
        if (eventId && !id.startsWith('g-')) {
            await supabase.from("smart_segments").delete().eq("id", id);
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

            if (data && !variable.id) {
                setVariables(prev => prev.map(v => v.id.startsWith('temp-') && v.name === data.name ? (data as EventVariable) : v));
            }
        }
    };

    const handleDeleteVariable = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!confirm("Delete variable?")) return;
        setVariables(prev => prev.filter(v => v.id !== id));
        if (eventId && !id.startsWith('temp-')) {
            await supabase.from("event_variables").delete().eq("id", id);
        }
    };

    // --- Render ---

    return (
        <div className="h-full relative">
            <div className="h-full overflow-y-auto bg-white custom-scrollbar">
                <div className="max-w-4xl p-10 mx-auto space-y-10 pb-24">

                    {/* Segments List - Pass onOpenDrawer for the button */}


                    <SmartGroupsList
                        groups={groups}
                        onOpenCreateModal={() => setIsCreateGroupModalOpen(true)}
                        onSelectGroup={setSelectedGroup}
                        onEditGroup={(g) => { setEditingGroup(g); setIsCreateGroupModalOpen(true); }}
                        onDeleteGroup={handleDeleteGroup}
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
                        onOpenCreateModal={() => setIsCreateVarModalOpen(true)}
                        onEditVariable={(v) => { setEditingVariable(v); setIsCreateVarModalOpen(true); }}
                        onDeleteVariable={handleDeleteVariable}
                        onRunAutomation={(v) => {
                            setTargetVariable(v);
                            setIsRunAutomationModalOpen(true);
                        }}
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
