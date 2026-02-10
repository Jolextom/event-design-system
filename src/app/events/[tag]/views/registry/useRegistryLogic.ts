import React, { useState, useMemo, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { Attendee, Question, Pass, Group, EventVariable } from "../../types";
import { evaluateSegment } from "../../utils/segmentLogic";
import { runRandomSplit } from "../../utils/automationLogic";

interface UseRegistryLogicProps {
    attendees: Attendee[];
    questions: Question[];
    passes: Pass[];
    variables: EventVariable[];
    eventId: string | null;
    initialFilter?: { group: Group; breakdown?: string | null } | null;
    onRefresh?: () => void;
}

const itemsPerPage = 50;

export function useRegistryLogic({
    attendees,
    questions,
    passes,
    variables: initialVariables,
    eventId,
    initialFilter,
    onRefresh
}: UseRegistryLogicProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [activeFilter, setActiveFilter] = useState<{ group: Group; breakdown?: string | null } | null>(initialFilter || null);

    // UI State
    const [selectedGuest, setSelectedGuest] = useState<Attendee | null>(null);
    const [isAddGuestModalOpen, setIsAddGuestModalOpen] = useState(false);
    const [isGuestFieldsDrawerOpen, setIsGuestFieldsDrawerOpen] = useState(false);
    const [isCreateVarModalOpen, setIsCreateVarModalOpen] = useState(false);
    const [isRunAutomationModalOpen, setIsRunAutomationModalOpen] = useState(false);
    const [editingVariable, setEditingVariable] = useState<EventVariable | null>(null);
    const [targetVariable, setTargetVariable] = useState<EventVariable | undefined>(undefined);

    // Data State
    const [variables, setVariables] = useState<EventVariable[]>(initialVariables);

    // Column Config — includes standard, question, and custom (variable) columns
    const [columnConfig, setColumnConfig] = useState<{ id: string; label: string; type: 'standard' | 'question' | 'custom'; visible: boolean }[]>(() => {
        const base = [
            { id: 'attendee', label: 'Attendee', type: 'standard' as const, visible: true },
            { id: 'ticket', label: 'Ticket', type: 'standard' as const, visible: true },
            ...questions.map(q => ({ id: q.id, label: q.title, type: 'question' as const, visible: true })),
            { id: 'ref', label: 'Reference', type: 'standard' as const, visible: true },
            { id: 'created_at', label: 'Registered At', type: 'standard' as const, visible: true },
            { id: 'status', label: 'Status', type: 'standard' as const, visible: true },
        ];
        return base;
    });

    // Environment
    const [isDev, setIsDev] = useState(false);
    useEffect(() => {
        if (typeof window !== 'undefined') {
            setIsDev(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
        }
    }, []);

    // Sync Effects
    useEffect(() => {
        setVariables(initialVariables);
    }, [initialVariables]);

    useEffect(() => {
        if (initialFilter) setActiveFilter(initialFilter);
    }, [initialFilter]);

    // Sync questions into column config
    useEffect(() => {
        setColumnConfig(prev => {
            const existingIds = new Set(prev.map(c => c.id));
            const questionIds = new Set(questions.map(q => q.id));
            let newCols = [...prev];

            // Add new questions that aren't in config
            questions.forEach(q => {
                if (q.id && !existingIds.has(q.id)) {
                    // Insert before 'ref' if possible
                    const refIndex = newCols.findIndex(c => c.id === 'ref');
                    if (refIndex >= 0) {
                        newCols.splice(refIndex, 0, { id: q.id, label: q.title, type: 'question', visible: true });
                    } else {
                        newCols.push({ id: q.id, label: q.title, type: 'question', visible: true });
                    }
                }
            });

            // Remove stale question columns
            newCols = newCols.filter(c => c.type !== 'question' || questionIds.has(c.id));
            return newCols;
        });
    }, [questions]);

    // Sync variables into column config
    useEffect(() => {
        setColumnConfig(prev => {
            const existingIds = new Set(prev.map(c => c.id));
            const newCols = [...prev];
            variables.forEach(v => {
                if (v.id && !existingIds.has(v.id)) {
                    newCols.push({ id: v.id, label: v.name, type: 'custom', visible: true });
                }
            });
            const variableIds = new Set(variables.filter(v => v.id).map(v => v.id));
            return newCols.filter(c => c.type === 'standard' || c.type === 'question' || variableIds.has(c.id));
        });
    }, [variables]);

    // Filtering & Memoization
    const filteredAttendees = useMemo(() => {
        let activeAttendees = attendees.filter(a => a.email_status !== "invited");

        if (activeFilter) {
            if (activeFilter.group.type === 'breakdown') {
                const questionId = activeFilter.group.rules_config?.questionId;
                if (questionId) {
                    activeAttendees = activeAttendees.filter(a => a.responses && a.responses[questionId]);
                    if (activeFilter.breakdown) {
                        activeAttendees = activeAttendees.filter(a => a.responses?.[questionId] === activeFilter.breakdown);
                    }
                }
            } else if (activeFilter.group.rules_config) {
                activeAttendees = activeAttendees.filter(g => evaluateSegment(g, activeFilter.group.rules_config));
            }
        }

        if (!searchTerm) return activeAttendees;

        const lowSearch = searchTerm.toLowerCase();
        return activeAttendees.filter(a => {
            // Include basic fields
            const basicMatch =
                a.first_name.toLowerCase().includes(lowSearch) ||
                a.last_name.toLowerCase().includes(lowSearch) ||
                a.email.toLowerCase().includes(lowSearch) ||
                a.ref.toLowerCase().includes(lowSearch);
            if (basicMatch) return true;
            // Include custom answers
            if (a.responses) {
                return Object.values(a.responses).some(val =>
                    String(val).toLowerCase().includes(lowSearch)
                );
            }
            return false;
        });
    }, [attendees, searchTerm, activeFilter]);

    const stats = useMemo(() => {
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

    const groupStats = useMemo(() => {
        return attendees.reduce((acc, curr) => {
            if (curr.order_id && curr.email_status !== 'invited') {
                acc[curr.order_id] = (acc[curr.order_id] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);
    }, [attendees]);

    // Handlers
    const exportToCSV = () => {
        if (!filteredAttendees.length) return;
        const headers = ["ID", "First Name", "Last Name", "Email", "Status", "Checked In", "Ticket", "Ref"];
        variables.forEach(v => headers.push(v.name));
        questions.forEach(q => headers.push(q.title));

        const csvContent = [
            headers.join(","),
            ...filteredAttendees.map(a => {
                const row = [
                    a.id,
                    `"${a.first_name || ''}"`,
                    `"${a.last_name || ''}"`,
                    `"${a.email || ''}"`,
                    a.email_status,
                    a.check_in ? "Yes" : "No",
                    passes.find(p => p.id === a.pass_id)?.title || "Unknown",
                    a.ref || ""
                ];
                variables.forEach(v => {
                    row.push(`"${a.properties?.[v.name] || ''}"`);
                });
                questions.forEach(q => {
                    const ans = a.responses?.[q.id];
                    row.push(`"${ans || ''}"`);
                });
                return row.join(",");
            })
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", `registry_export_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const handleAddGuest = async (guest: Partial<Attendee>) => {
        if (!eventId) return;
        const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
        const { error } = await supabase.from("attendees").insert({
            event_id: eventId,
            ...guest,
            email_status: 'registered'
        });
        if (error) {
            alert("Failed to add guest: " + error.message);
        } else {
            setIsAddGuestModalOpen(false);
            onRefresh?.();
        }
    };

    const handleDelete = async (ids: string[]) => {
        if (!eventId) return;
        const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

        // 1. Delete answers
        const { error: answersErr } = await supabase.from("answers").delete().in("attendee_id", ids);
        if (answersErr) return alert("Failed to delete answers: " + answersErr.message);

        // 2. Delete email deliveries
        await supabase.from("email_deliveries").delete().in("attendee_id", ids);

        // 3. Delete attendees
        const { error: deleteErr } = await supabase.from("attendees").delete().in("id", ids);
        if (deleteErr) {
            alert("Failed to delete: " + deleteErr.message);
        } else {
            onRefresh?.();
            if (selectedGuest && ids.includes(selectedGuest.id)) setSelectedGuest(null);
        }
    };

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

    const handleSaveVariable = async (variable: Partial<EventVariable>) => {
        if (!eventId) return;
        const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
        const payload: any = { ...variable, event_id: eventId };
        const { data, error } = await supabase.from("event_variables").upsert(payload).select().single();

        if (error) {
            alert("Failed to save variable: " + error.message);
        } else {
            setVariables((prev) => {
                const index = prev.findIndex(v => v.id === data.id);
                if (index >= 0) {
                    const newVars = [...prev];
                    newVars[index] = data;
                    return newVars;
                }
                return [...prev, data];
            });
            setIsCreateVarModalOpen(false);
            setEditingVariable(null);
            onRefresh?.();
        }
    };

    const handleDeleteVariable = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!confirm("Delete this variable? Data associated with it will be permanently removed.")) return;
        const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
        await supabase.from("event_variables").delete().eq("id", id);
        setVariables(prev => prev.filter(v => v.id !== id));
        onRefresh?.();
    };

    const handleRunAutomation = async (variable: EventVariable) => {
        const method = variable.settings?.method;
        if ((method === 'random_equal' || method === 'random_pure') && variable.options && variable.options.length > 0) {
            if (confirm(`Run Smart Fill for "${variable.name}"?\n\nThis will assign values to guests who don't have one yet.`)) {
                try {
                    const result = await runRandomSplit(
                        eventId!,
                        { variableName: variable.name, options: variable.options },
                        true
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
            setTargetVariable(variable);
            setIsRunAutomationModalOpen(true);
        }
    };

    return {
        // State
        searchTerm, setSearchTerm,
        currentPage, setCurrentPage,
        activeFilter, setActiveFilter,
        selectedGuest, setSelectedGuest,
        isAddGuestModalOpen, setIsAddGuestModalOpen,
        isGuestFieldsDrawerOpen, setIsGuestFieldsDrawerOpen,
        isCreateVarModalOpen, setIsCreateVarModalOpen,
        isRunAutomationModalOpen, setIsRunAutomationModalOpen,
        editingVariable, setEditingVariable,
        targetVariable, setTargetVariable,
        variables,
        columnConfig,
        isDev,

        // Data
        filteredAttendees,
        stats,
        totalPages,
        paginatedAttendees,
        groupStats,

        // Handlers
        exportToCSV,
        handleAddGuest,
        handleDelete,
        handleToggleColumn,
        handleMoveColumn,
        handleSaveVariable,
        handleDeleteVariable,
        handleRunAutomation
    };
}
