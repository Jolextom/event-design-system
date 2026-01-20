"use client";

import React, { useState, useMemo } from "react";
import { AlertCircle } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { Attendee, Question } from "../../types";
import { RegistryHeader } from "./RegistryHeader";
import { RegistryTable } from "./RegistryTable";
import { PaginationFooter } from "./PaginationFooter";
import { AddGuestModal } from "./AddGuestModal";

interface RegistryViewProps {
    attendees: Attendee[];
    questions?: Question[];
    loading?: boolean;
    error?: string | null;
    eventId: string | null;
    onRefresh?: () => void;
}

export function RegistryView({
    attendees,
    questions = [],
    loading,
    error,
    eventId,
    onRefresh
}: RegistryViewProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [isAddGuestModalOpen, setIsAddGuestModalOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;

    const handleAddGuest = async (formData: { first_name: string; last_name: string; email: string }) => {
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
        if (!searchTerm) return [...attendees];

        const lowSearch = searchTerm.toLowerCase();
        return attendees.filter(a => {
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
        const total = attendees.length;
        const checkedIn = attendees.filter(a => !!a.check_in_time).length;
        return { total, checkedIn };
    }, [attendees]);

    const totalPages = Math.ceil(filteredAttendees.length / itemsPerPage);
    const paginatedAttendees = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredAttendees.slice(start, start + itemsPerPage);
    }, [filteredAttendees, currentPage]);

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
                loading={loading}
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
        </div>
    );
}
