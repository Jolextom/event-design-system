"use client";

import React, { useState, useMemo } from "react";
import { AlertCircle, Filter, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@supabase/supabase-js";
import { Attendee, Question, Pass, Group } from "../../types";
import { evaluateSegment } from "../../utils/segmentLogic";
import { ActiveFilterBanner } from "./ActiveFilterBanner";
import { RegistryHeader } from "./RegistryHeader";
import { RegistryTable } from "./RegistryTable";
import { PaginationFooter } from "./PaginationFooter";
import { AddGuestModal } from "./AddGuestModal";
import { GuestDetailsSidePanel } from "./GuestDetailsSidePanel";
import { GuestFieldsDrawer } from "../GuestFieldsDrawer";
import { CreateVariableModal } from "../CreateVariableModal";
import { RunAutomationModal } from "../RunAutomationModal";
import { EventVariable } from "../../types";
import { useRegistryLogic } from "./useRegistryLogic";

interface RegistryViewProps {
    attendees: Attendee[];
    questions?: Question[];
    passes?: Pass[];
    variables?: EventVariable[];
    loading?: boolean;
    error?: string | null;
    eventId: string | null;
    onRefresh?: () => void;
    initialFilter?: { group: Group; breakdown?: string | null } | null;
}

const itemsPerPage = 50;

export function RegistryView({
    attendees,
    questions = [],
    passes = [],
    variables: initialVariables = [],
    loading,
    error,
    eventId,
    onRefresh,
    initialFilter
}: RegistryViewProps) {
    const logic = useRegistryLogic({
        attendees,
        questions,
        passes,
        variables: initialVariables,
        eventId,
        initialFilter,
        onRefresh
    });

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
                searchTerm={logic.searchTerm}
                setSearchTerm={(term) => {
                    logic.setSearchTerm(term);
                    logic.setCurrentPage(1); // Reset to page 1 on search
                }}
                totalGuests={logic.stats.total}
                checkedInCount={logic.stats.checkedIn}
                loading={loading}
                onExportCSV={logic.exportToCSV}
                onAddGuest={() => logic.setIsAddGuestModalOpen(true)}
                onManageFields={() => logic.setIsGuestFieldsDrawerOpen(true)}
            />

            {logic.activeFilter && (
                <ActiveFilterBanner
                    activeFilter={logic.activeFilter}
                    onClear={() => logic.setActiveFilter(null)}
                    onSelectBreakdown={(breakdown) => {
                        logic.setActiveFilter(prev => prev ? { ...prev, breakdown } : prev);
                        logic.setCurrentPage(1);
                    }}
                />
            )}

            <RegistryTable
                attendees={logic.paginatedAttendees}
                questions={questions}
                passes={passes}
                groupStats={logic.groupStats}
                loading={loading}
                isDev={logic.isDev}
                onDelete={logic.handleDelete}
                onView={logic.setSelectedGuest}
                columnConfig={logic.columnConfig}
            />

            <PaginationFooter
                currentPage={logic.currentPage}
                totalPages={logic.totalPages}
                totalResults={logic.filteredAttendees.length}
                paginatedCount={logic.paginatedAttendees.length}
                searchTerm={logic.searchTerm}
                onPageChange={logic.setCurrentPage}
            />

            <AddGuestModal
                isOpen={logic.isAddGuestModalOpen}
                onClose={() => logic.setIsAddGuestModalOpen(false)}
                onAdd={logic.handleAddGuest}
            />

            <GuestDetailsSidePanel
                isOpen={!!logic.selectedGuest}
                onClose={() => logic.setSelectedGuest(null)}
                attendee={logic.selectedGuest}
                questions={questions}
                passes={passes}
                onUpdate={() => onRefresh?.()}
            />

            <GuestFieldsDrawer
                isOpen={logic.isGuestFieldsDrawerOpen}
                onClose={() => {
                    logic.setIsGuestFieldsDrawerOpen(false);
                    logic.setIsCreateVarModalOpen(false); // Close nested modal
                    logic.setEditingVariable(null);
                }}
                variables={logic.variables}
                columnConfig={logic.columnConfig}
                onOpenCreateModal={() => logic.setIsCreateVarModalOpen(true)}
                onEditVariable={(v) => { logic.setEditingVariable(v); logic.setIsCreateVarModalOpen(true); }}
                onDeleteVariable={logic.handleDeleteVariable}
                onRunAutomation={logic.handleRunAutomation}
                onToggleColumn={logic.handleToggleColumn}
                onMoveColumn={logic.handleMoveColumn}
            />

            <RunAutomationModal
                isOpen={logic.isRunAutomationModalOpen}
                onClose={() => {
                    logic.setIsRunAutomationModalOpen(false);
                    logic.setTargetVariable(undefined);
                }}
                eventId={eventId || ""}
                targetVariable={logic.targetVariable}
                onComplete={() => onRefresh?.()}
            />

            {(logic.isCreateVarModalOpen || logic.editingVariable) && (
                <CreateVariableModal
                    initialVariable={logic.editingVariable || undefined}
                    onClose={() => {
                        logic.setIsCreateVarModalOpen(false);
                        logic.setEditingVariable(null);
                    }}
                    onSave={logic.handleSaveVariable}
                />
            )}
        </div>
    );
}
