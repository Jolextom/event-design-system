"use client";

import React, { useState, useMemo } from "react";
import { AlertCircle } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { Attendee, Question, Pass } from "../../types";
import { RegistryHeader } from "./RegistryHeader";
import { RegistryTable } from "./RegistryTable";
import { PaginationFooter } from "./PaginationFooter";
import { AddGuestModal } from "./AddGuestModal";
import { GuestDetailsSidePanel } from "./GuestDetailsSidePanel";
import { GuestFieldsDrawer } from "../GuestFieldsDrawer";
import { RunAutomationModal } from "../RunAutomationModal";
import { CreateVariableModal } from "../CreateVariableModal";
import { EventVariable } from "../../types";

interface RegistryViewProps {
    attendees: Attendee[];
    questions?: Question[];
    passes?: Pass[];
    loading?: boolean;
    error?: string | null;
    eventId: string | null;
    onRefresh?: () => void;
}

export function RegistryView({
    attendees,
    questions = [],
    passes = [],
    loading,
    error,
    eventId,
    onRefresh
}: RegistryViewProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [isAddGuestModalOpen, setIsAddGuestModalOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedGuest, setSelectedGuest] = useState<Attendee | null>(null);

    const itemsPerPage = 20;

    // Fields & Automation State
    const [variables, setVariables] = useState<EventVariable[]>([]);
    const [isGuestFieldsDrawerOpen, setIsGuestFieldsDrawerOpen] = useState(false);
    const [isRunAutomationModalOpen, setIsRunAutomationModalOpen] = useState(false);
    const [targetVariable, setTargetVariable] = useState<EventVariable | undefined>(undefined);

    // Variable CRUD State
    const [isCreateVarModalOpen, setIsCreateVarModalOpen] = useState(false);
    const [editingVariable, setEditingVariable] = useState<EventVariable | null>(null);

    // Column Configuration
    const [columnConfig, setColumnConfig] = useState<{ id: string; label: string; type: 'standard' | 'question' | 'variable' | 'custom'; visible: boolean }[]>([]);

    // Sync Config (Standard + Questions + Variables)
    React.useEffect(() => {
        setColumnConfig(prev => {
            const currentIds = new Set(prev.map(c => c.id));

            // 1. Define Standard Columns
            const standardCols: { id: string; label: string; type: 'standard' | 'question' | 'variable' | 'custom'; visible: boolean }[] = [
                { id: 'attendee', label: 'Attendee', type: 'standard', visible: true },
                { id: 'ticket', label: 'Ticket', type: 'standard', visible: true },
            ];

            // 2. Questions
            const questionCols = questions.map(q => ({
                id: q.id,
                label: q.title,
                type: 'question' as const,
                visible: true
            }));

            // 3. Variables
            const variableCols = variables.map(v => ({
                id: v.id,
                label: v.name,
                type: 'variable' as const,
                visible: true
            }));

            // 4. Other Standard
            const metaCols: { id: string; label: string; type: 'standard' | 'question' | 'variable' | 'custom'; visible: boolean }[] = [
                { id: 'ref', label: 'Reference', type: 'standard', visible: true },
                { id: 'created_at', label: 'Registered', type: 'standard', visible: true },
                { id: 'status', label: 'Status', type: 'standard', visible: true },
            ];

            // Construction Logic:
            // If prev is empty, build default.
            if (prev.length === 0) {
                return [
                    ...standardCols,
                    ...questionCols,
                    ...variableCols,
                    ...metaCols
                ];
            }

            // If prev exists, merge new items (preserve order/visibility)
            const newCols = [...prev];

            // Add Missing Questions
            questionCols.forEach(q => {
                if (!currentIds.has(q.id)) newCols.push(q);
            });

            // Add Missing Variables
            variableCols.forEach(v => {
                if (!currentIds.has(v.id)) newCols.push(v);
            });

            // Remove Stale Items (that are likely deleted questions or variables)
            // We need to know valid IDs.
            const validIds = new Set([
                'attendee', 'ticket', 'ref', 'created_at', 'status',
                ...questions.map(q => q.id),
                ...variables.map(v => v.id)
            ]);

            return newCols.filter(c => validIds.has(c.id));
        });
    }, [variables, questions]);

    // Fetch variables on mount/change
    React.useEffect(() => {
        if (!eventId) return;
        const fetchVars = async () => {
            const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            );
            const { data } = await supabase
                .from("event_variables")
                .select("*")
                .eq("event_id", eventId)
                .order("created_at", { ascending: true });
            if (data) setVariables(data as EventVariable[]);
        };
        fetchVars();
    }, [eventId]);

    const handleSaveVariable = async (variable: any) => {
        // Optimistic update
        if (variable.id) {
            setVariables(prev => prev.map(v => v.id === variable.id ? { ...v, ...variable } : v));
        } else {
            setVariables(prev => [...prev, { ...variable, id: `temp-${Date.now()}` } as EventVariable]);
        }

        setIsCreateVarModalOpen(false);
        setEditingVariable(null);

        if (eventId) {
            const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            );
            const { data } = await supabase.from("event_variables").upsert({
                ...(variable.id && !variable.id.startsWith('temp-') ? { id: variable.id } : {}),
                event_id: eventId,
                name: variable.name,
                type: variable.type,
                options: variable.options,
                settings: variable.settings
            }).select().single();

            if (data && !variable.id) {
                // Replace temp ID with real ID
                setVariables(prev => prev.map(v => v.id.startsWith('temp-') && v.name === data.name ? (data as EventVariable) : v));
            }
        }
    };



    const handleAddGuest = async (formData: { first_name: string; last_name: string; email: string }) => {
        // ... existing add logic ...
        if (!eventId) return;

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const ref = Math.random().toString(36).substring(2, 10).toUpperCase();

        const { error: insertErr } = await supabase
            .from("attendees")
            .insert([{
                event_id: eventId,
                first_name: formData.first_name,
                last_name: formData.last_name,
                email: formData.email,
                ref: ref,
                check_in: false
            }]);

        if (insertErr) {
            console.error("Error adding guest:", insertErr.message);
            alert("Error adding guest: " + insertErr.message);
        } else {
            setIsAddGuestModalOpen(false);
            onRefresh?.();
        }
    };

    const exportToCSV = () => {
        // ... existing CSV logic ...
        if (attendees.length === 0) return;

        const headers = ["First Name", "Last Name", "Email", "Reference", "Status", "Registered At"];
        const rows = attendees.map(a => [
            a.first_name,
            a.last_name,
            a.email,
            a.ref,
            a.check_in_time ? "Checked In" : "Confirmed",
            a.created_at ? new Date(a.created_at).toLocaleString() : ""
        ]);

        const csvContent = [
            headers.join(","),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `attendees_${eventId || "event"}.csv`);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const filteredAttendees = useMemo(() => {
        // Filter out invited guests (only show registered)
        const activeAttendees = attendees.filter(a => a.email_status !== "invited");

        if (!searchTerm) return activeAttendees;

        const lowSearch = searchTerm.toLowerCase();
        return activeAttendees.filter(a => {
            // Search basic info
            const basicMatch =
                a.first_name.toLowerCase().includes(lowSearch) ||
                a.last_name.toLowerCase().includes(lowSearch) ||
                a.email.toLowerCase().includes(lowSearch) ||
                a.ref.toLowerCase().includes(lowSearch);

            if (basicMatch) return true;

            // Search custom answers
            if (a.responses) {
                return Object.values(a.responses).some(val =>
                    String(val).toLowerCase().includes(lowSearch)
                );
            }

            return false;
        });
    }, [attendees, searchTerm]);

    const stats = useMemo(() => {
        // Only count registered guests (exclude invited)
        const registeredGuests = attendees.filter(a => a.email_status !== "invited");
        const total = registeredGuests.length;
        const checkedIn = registeredGuests.filter(a => !!a.check_in_time).length;
        return { total, checkedIn };
    }, [attendees]);

    const totalPages = Math.ceil(filteredAttendees.length / itemsPerPage);
    const paginatedAttendees = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredAttendees.slice(start, start + itemsPerPage);
    }, [filteredAttendees, currentPage]);

    // Calculate group stats (order_id -> count) from ALL attendees to ensure accuracy across pages
    const groupStats = useMemo(() => {
        return attendees.reduce((acc, curr) => {
            if (curr.order_id && curr.email_status !== 'invited') {
                acc[curr.order_id] = (acc[curr.order_id] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);
    }, [attendees]);

    const handleDelete = async (ids: string[]) => {
        // ... existing delete logic ...
        if (!eventId) return;

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        // 1. Delete answers first (Foreign Key Constraint)
        const { error: answersErr } = await supabase
            .from("answers")
            .delete()
            .in("attendee_id", ids);

        if (answersErr) {
            console.error("Failed to delete answers:", answersErr);
            alert("Failed to delete answers: " + answersErr.message);
            return;
        }

        // 2. Delete email deliveries (Foreign Key Constraint)
        const { error: emailsErr } = await supabase
            .from("email_deliveries")
            .delete()
            .in("attendee_id", ids);

        if (emailsErr) {
            console.warn("Failed to delete email_deliveries:", emailsErr);
        }

        // 3. Delete attendees
        const { error: deleteErr } = await supabase
            .from("attendees")
            .delete()
            .in("id", ids);

        if (deleteErr) {
            console.error("Failed to delete attendees:", deleteErr);
            alert("Failed to delete: " + deleteErr.message);
        } else {
            onRefresh?.();
            // Close side panel if deleted guest was selected
            if (selectedGuest && ids.includes(selectedGuest.id)) {
                setSelectedGuest(null);
            }
        }
    };

    // --- Column & Variable Handlers ---

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

    const handleDeleteVariable = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!confirm("Delete this variable? Data associated with it will be permanently removed.")) return;

        const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
        await supabase.from("event_variables").delete().eq("id", id);

        // Optimistic update
        setVariables(prev => prev.filter(v => v.id !== id));
        onRefresh?.();
    };

    const handleRunAutomation = async (variable: EventVariable) => {
        const method = variable.settings?.method;

        if ((method === 'random_equal' || method === 'random_pure') && variable.options && variable.options.length > 0) {
            // Direct Smart Fill Logic
            if (confirm(`Run Smart Fill for "${variable.name}"?\n\nThis will assign values to guests who don't have one yet.`)) {
                try {
                    const { runRandomSplit } = await import("../../utils/automationLogic");
                    const result = await runRandomSplit(
                        eventId!,
                        {
                            variableName: variable.name,
                            options: variable.options
                        },
                        true // onlyEmpty
                    );

                    if (result.success) {
                        alert(`Success! Updated ${result.count} guests.`);
                        onRefresh?.();
                    } else {
                        alert(`Error: ${result.error}`);
                    }
                } catch (e) {
                    console.error("Automation error:", e);
                    alert("Failed to run automation.");
                }
            }
        } else {
            // Manual/Complex
            setTargetVariable(variable);
            setIsRunAutomationModalOpen(true);
        }
    };

    // Determine if we are in dev environment (client-side check)
    const [isDev, setIsDev] = useState(false);
    React.useEffect(() => {
        if (typeof window !== 'undefined') {
            setIsDev(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
        }
    }, []);

    if (error) {
        return (
            <div className="h-full flex flex-col items-center justify-center bg-white p-8">
                <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                <h3 className="text-lg font-black text-gray-900 mb-2">Failed to load registry</h3>
                <p className="text-sm text-gray-500 mb-6 text-center max-w-md">{error}</p>
                <button
                    onClick={onRefresh}
                    className="px-6 py-2 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all"
                >
                    Try Again
                </button>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-white overflow-hidden animate-in fade-in duration-500">
            <RegistryHeader
                searchTerm={searchTerm}
                setSearchTerm={(term) => {
                    setSearchTerm(term);
                    setCurrentPage(1); // Reset to page 1 on search
                }}
                totalGuests={stats.total}
                checkedInCount={stats.checkedIn}
                loading={loading}
                onExportCSV={exportToCSV}
                onAddGuest={() => setIsAddGuestModalOpen(true)}
                onManageFields={() => setIsGuestFieldsDrawerOpen(true)}
            />

            <RegistryTable
                attendees={paginatedAttendees}
                questions={questions}
                passes={passes}
                groupStats={groupStats}
                loading={loading}
                isDev={isDev}
                onDelete={handleDelete}
                onView={setSelectedGuest}
                columnConfig={columnConfig}
            />

            <PaginationFooter
                currentPage={currentPage}
                totalPages={totalPages}
                totalResults={filteredAttendees.length}
                paginatedCount={paginatedAttendees.length}
                searchTerm={searchTerm}
                onPageChange={setCurrentPage}
            />

            <AddGuestModal
                isOpen={isAddGuestModalOpen}
                onClose={() => setIsAddGuestModalOpen(false)}
                onAdd={handleAddGuest}
            />

            <GuestDetailsSidePanel
                isOpen={!!selectedGuest}
                onClose={() => setSelectedGuest(null)}
                attendee={selectedGuest}
                questions={questions}
                passes={passes}
                onUpdate={() => onRefresh?.()}
            />

            <GuestFieldsDrawer
                isOpen={isGuestFieldsDrawerOpen}
                onClose={() => {
                    setIsGuestFieldsDrawerOpen(false);
                    setIsCreateVarModalOpen(false); // Close nested modal
                    setEditingVariable(null);
                }}
                variables={variables}
                columnConfig={columnConfig}
                onOpenCreateModal={() => setIsCreateVarModalOpen(true)}
                onEditVariable={(v) => { setEditingVariable(v); setIsCreateVarModalOpen(true); }}
                onDeleteVariable={handleDeleteVariable}
                onRunAutomation={handleRunAutomation}
                onToggleColumn={handleToggleColumn}
                onMoveColumn={handleMoveColumn}
            />

            <RunAutomationModal
                isOpen={isRunAutomationModalOpen}
                onClose={() => {
                    setIsRunAutomationModalOpen(false);
                    setTargetVariable(undefined);
                }}
                eventId={eventId || ""}
                targetVariable={targetVariable}
                onComplete={() => onRefresh?.()}
            />

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
        </div>
    );
}
