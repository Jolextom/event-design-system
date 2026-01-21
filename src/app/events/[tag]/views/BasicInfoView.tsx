"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Calendar, Globe, Save, Loader2, Link2, Ticket, QrCode, Check } from "lucide-react";
import type { Event } from "../types";
import { supabase } from "@/lib/supabaseClient";
import { EditDateTimeModal } from "../components/EditDateTimeModal";
import { EditSimpleModal } from "../components/EditSimpleModal";
import { EditDescriptionModal } from "../components/EditDescriptionModal";
import { useRouter } from "next/navigation";

interface BasicInfoViewProps {
    event?: Event | null;
}

export function BasicInfoView({ event }: BasicInfoViewProps) {
    const router = useRouter();
    const [formData, setFormData] = useState({
        event_title: "",
        tag: "",
        description: "",
        location: "",
        start_date: "",
        start_time: "",
        end_time: "",
        end_date: "",
    });

    // Modals Control
    const [isDateModalOpen, setDateModalOpen] = useState(false);
    const [isLocModalOpen, setLocModalOpen] = useState(false);
    const [isDescModalOpen, setDescModalOpen] = useState(false);

    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    useEffect(() => {
        if (event) {
            setFormData({
                event_title: event.event_title || "",
                tag: event.tag || "",
                description: event.description || "",
                location: event.location || "",
                start_date: event.start_date || "",
                start_time: event.start_time || "",
                end_time: event.end_time || "",
                end_date: event.end_date || "",
            });
        }
    }, [event]);

    const handleChange = (field: string, value: string) => {
        let finalValue = value;
        if (field === "tag") {
            finalValue = value.toLowerCase().replace(/[^a-z0-9-]/g, "");
        }
        setFormData(prev => ({ ...prev, [field]: finalValue }));
        setHasChanges(true);
    };

    const handleSaveTitleTag = async () => {
        if (!event?.id) return;

        // Check if changes actually occurred
        const titleChanged = formData.event_title !== (event.event_title || "");
        const tagChanged = formData.tag !== (event.tag || "");

        if (!titleChanged && !tagChanged) return;

        setIsSaving(true);
        try {
            const updates: any = {
                event_title: formData.event_title,
            };

            if (formData.tag && formData.tag !== event.tag) {
                updates.tag = formData.tag;
            }

            const { error } = await supabase
                .from("events")
                .update(updates)
                .eq("id", event.id);

            if (error) throw error;
            setHasChanges(false);

            if (formData.tag && formData.tag !== event.tag) {
                window.location.href = `/events/${formData.tag}`;
                return;
            }

            // Refresh to ensure sync
            router.refresh();
        } catch (err: any) {
            console.error("Error saving:", err);
            alert("Failed to save changes. Tag might be taken.");
        } finally {
            setIsSaving(false);
        }
    };

    // Optimistic Update Handlers
    const handleLocationUpdate = (newLocation: string) => {
        setFormData(prev => ({ ...prev, location: newLocation }));
        router.refresh(); // Still refresh server component for consistency
    };

    const handleDescriptionUpdate = (newDescription: string) => {
        setFormData(prev => ({ ...prev, description: newDescription }));
        router.refresh();
    };

    const handleDateTimeUpdate = (data: { start_date: string, end_date: string, start_time: string, end_time: string }) => {
        setFormData(prev => ({
            ...prev,
            start_date: data.start_date,
            end_date: data.end_date,
            start_time: data.start_time,
            end_time: data.end_time
        }));
        router.refresh();
    };

    if (!event) return <div className="text-center text-neutral-400 font-bold py-24 text-lg">No event data found.</div>;

    const isSetupComplete = !!(formData.event_title && formData.start_date && formData.location);

    // Format Date/Time for display
    const formatDateDisplay = () => {
        if (!formData.start_date) return { dateStr: "Set Date & Time", timeStr: "" };
        const d = new Date(formData.start_date);
        const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

        let timeStr = "";
        if (formData.start_time) {
            const formatTime = (t: string) => {
                const [h, m] = t.split(':');
                const hour = parseInt(h);
                const ampm = hour >= 12 ? 'PM' : 'AM';
                const hour12 = hour % 12 || 12;
                return `${hour12}:${m} ${ampm}`;
            };
            timeStr = formatTime(formData.start_time);
            if (formData.end_time) {
                timeStr += ` - ${formatTime(formData.end_time)}`;
            }
        }
        return { dateStr, timeStr };
    };

    const { dateStr, timeStr } = formatDateDisplay();

    return (
        <div className="h-full overflow-hidden bg-white flex relative">
            {/* Fixed Status Toast (Top Right) */}
            <div className="absolute top-6 right-6 z-50 flex flex-col items-end gap-2 pointer-events-none">
                <AnimatePresence>
                    {isSaving && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="bg-white/80 backdrop-blur-md border border-gray-100 shadow-lg px-4 py-2 rounded-full flex items-center gap-2"
                        >
                            <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Saving...</span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Main Form Area */}
            <div className="flex-1 overflow-y-auto">
                <div className="max-w-4xl p-10 mr-auto space-y-10 pb-24">
                    <header className="border-b border-gray-100 pb-8 mt-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-black tracking-tight text-gray-900">Basic Info</h2>
                                <p className="text-sm text-gray-400 mt-1.5 font-bold">The foundation of your event experience.</p>
                            </div>
                            {!isSetupComplete ? (
                                <div className="bg-amber-50 px-4 py-2 rounded-xl border border-amber-100 flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">Setup Incomplete</span>
                                </div>
                            ) : event?.is_published ? (
                                <div className="bg-green-50 px-4 py-2 rounded-xl border border-green-100 flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-green-500" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-green-600">Launched</span>
                                </div>
                            ) : (
                                <div className="bg-green-50 px-4 py-2 rounded-xl border border-green-100 flex items-center gap-2">
                                    <Check className="w-3 h-3 text-green-600" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-green-600">Ready to Launch</span>
                                </div>
                            )}
                        </div>
                    </header>

                    <div className="space-y-8">
                        {/* Event Banner Placeholder */}
                        <div className="relative h-56 bg-gray-50 rounded-4xl border-2 border-dashed border-gray-100 flex flex-col items-center justify-center group hover:border-[var(--brand-blue)]/30 transition-all overflow-hidden cursor-pointer shadow-inner">
                            <div className="p-3.5 bg-white rounded-2xl shadow-sm mb-3 group-hover:scale-110 transition-transform">
                                <Plus className="w-5 h-5 text-gray-400" />
                            </div>
                            <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Add Event Banner</span>
                            <p className="text-[9px] text-gray-300 mt-1.5 font-bold uppercase tracking-[0.2em]">16:9 ratio recommended</p>
                        </div>

                        <div className="grid grid-cols-1 gap-10">
                            {/* Title & Tag Section */}
                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-400 block ml-1">Event Title</label>
                                    </div>
                                    <input
                                        value={formData.event_title}
                                        onChange={(e) => handleChange("event_title", e.target.value)}
                                        onBlur={handleSaveTitleTag}
                                        placeholder="Untitled Event"
                                        className="w-full text-3xl font-black tracking-tight text-gray-900 placeholder:text-gray-200 border-none outline-none focus:ring-0 p-0 bg-transparent focus:placeholder:text-gray-300 transition-colors"
                                    />
                                </div>

                                {/* Tag Input */}
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-400 block ml-1">Event Identifier</label>
                                    <div className="flex items-center">
                                        <span className="px-4 py-3 bg-gray-100/80 border border-r-0 border-gray-100/50 rounded-l-2xl text-[11px] font-black text-gray-400 uppercase tracking-tight">design.event/</span>
                                        <input
                                            type="text"
                                            value={formData.tag}
                                            onChange={(e) => handleChange("tag", e.target.value)}
                                            onBlur={handleSaveTitleTag}
                                            placeholder="event-slug"
                                            className="flex-1 px-4 py-3 bg-gray-50/50 border border-gray-100/50 rounded-r-2xl text-[13px] font-bold text-gray-900 focus:bg-white focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500/20 outline-none transition-all shadow-inner"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Description Section (Modal Trigger) */}
                            <div className="space-y-3">
                                <label className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-400 block ml-1">Description</label>
                                <div
                                    onClick={() => setDescModalOpen(true)}
                                    className="w-full min-h-[120px] bg-transparent border-none outline-none p-0 cursor-pointer group"
                                >
                                    {formData.description ? (
                                        <div
                                            className="prose prose-sm max-w-none text-gray-600 group-hover:text-gray-900 transition-colors"
                                            dangerouslySetInnerHTML={{ __html: formData.description }}
                                        />
                                    ) : (
                                        <p className="text-base font-bold text-gray-200 group-hover:text-gray-300 transition-colors italic">Click to add description...</p>
                                    )}
                                </div>
                            </div>

                            {/* Logistics Grid (Modal Triggers) */}
                            <div className="grid grid-cols-2 gap-6">
                                <div
                                    onClick={() => setDateModalOpen(true)}
                                    className="space-y-3 p-8 bg-gray-50/40 rounded-4xl border border-gray-100 group hover:bg-white hover:shadow-2xl hover:shadow-gray-100/40 transition-all cursor-pointer relative"
                                >
                                    <label className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-400 flex items-center gap-2">
                                        <Calendar className="w-3.5 h-3.5" /> Date & Time
                                    </label>
                                    <div className="space-y-1">
                                        <p className="text-lg font-black text-gray-900 tracking-tight">{dateStr}</p>
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{timeStr}</p>
                                    </div>
                                    <div className="absolute top-8 right-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">Edit</span>
                                    </div>
                                </div>

                                <div
                                    onClick={() => setLocModalOpen(true)}
                                    className="space-y-3 p-8 bg-gray-50/40 rounded-4xl border border-gray-100 group hover:bg-white hover:shadow-2xl hover:shadow-gray-100/40 transition-all cursor-pointer relative"
                                >
                                    <label className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-400 flex items-center gap-2">
                                        <Globe className="w-3.5 h-3.5" /> Location
                                    </label>
                                    <div className="max-h-[80px] overflow-hidden">
                                        {formData.location ? (
                                            <p className="text-lg font-black text-gray-900 tracking-tight leading-snug">{formData.location}</p>
                                        ) : (
                                            <p className="text-lg font-black text-gray-200 tracking-tight italic">Set location...</p>
                                        )}
                                    </div>
                                    <div className="absolute top-8 right-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">Edit</span>
                                    </div>
                                </div>
                            </div>
                        </div>


                    </div>
                </div>
            </div>

            {/* Quick Actions Sidebar */}
            <div className="w-80 border-l border-gray-100 bg-gray-50/50 p-8 hidden xl:flex flex-col gap-8 h-full overflow-y-auto">
                <div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4">Quick Actions</h3>
                    <div className="space-y-3">
                        <ActionCard
                            icon={Ticket}
                            title="Add Ticket Type"
                            description="Create passes for your event."
                            disabled={!isSetupComplete}
                            onClick={() => alert("Navigate to tickets...")}
                        />
                        <ActionCard
                            icon={Link2}
                            title="Share Link"
                            description="Get the public link."
                            disabled={!isSetupComplete}
                            onClick={() => alert("Copied!")} // Placeholder
                        />
                        <ActionCard
                            icon={QrCode}
                            title="Check-in App"
                            description="Download for staff."
                            disabled={!isSetupComplete}
                            onClick={() => { }}
                        />
                    </div>
                </div>

                {!isSetupComplete && (
                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                        <p className="text-[11px] text-blue-700 font-bold leading-relaxed">
                            Complete the basic info (Title, Date, Location) to unlock more features.
                        </p>
                    </div>
                )}
            </div>

            {/* Modals */}
            <EditDateTimeModal
                isOpen={isDateModalOpen}
                onClose={() => setDateModalOpen(false)}
                eventId={event.id}
                initialData={{
                    start_date: formData.start_date ? new Date(formData.start_date).toISOString().split('T')[0] : "",
                    start_time: formData.start_time || "",
                    end_time: formData.end_time || "",
                    end_date: formData.end_date ? new Date(formData.end_date).toISOString().split('T')[0] : undefined
                }}
                onUpdate={handleDateTimeUpdate}
            />

            <EditSimpleModal
                isOpen={isLocModalOpen}
                onClose={() => setLocModalOpen(false)}
                eventId={event.id}
                title="Edit Location"
                field="location"
                initialValue={formData.location || ""}
                onUpdate={handleLocationUpdate}
            />

            <EditDescriptionModal
                isOpen={isDescModalOpen}
                onClose={() => setDescModalOpen(false)}
                eventId={event.id}
                initialValue={formData.description || ""}
                onUpdate={handleDescriptionUpdate}
            />
        </div>
    );
}

function ActionCard({ icon: Icon, title, description, disabled, onClick }: { icon: any, title: string, description: string, disabled?: boolean, onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className="w-full text-left p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md hover:border-blue-100 transition-all group disabled:opacity-60 disabled:cursor-not-allowed"
        >
            <div className="flex items-center gap-3 mb-1">
                <div className="p-1.5 bg-gray-50 rounded-lg group-hover:bg-blue-50 text-gray-400 group-hover:text-blue-500 transition-colors">
                    <Icon className="w-4 h-4" />
                </div>
                <span className="text-xs font-black text-gray-900">{title}</span>
            </div>
            <p className="text-[10px] text-gray-400 font-bold pl-[34px]">{description}</p>
        </button>
    );
}
