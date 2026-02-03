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
            if (curr.order_id) {
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
        </div>
    );
}
