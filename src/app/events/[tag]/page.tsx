"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PanelLeftOpen, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    GlobalSection,
    CategoryId,
    BUILDER_CATEGORIES,
    GLOBAL_NAV,
    Event,
    Pass,
    Question,
    QuestionOption,
    Attendee,
} from "./types";
import { GlobalSidebar } from "./components/Sidebar";
import { BackbonePane } from "./components/Backbone";
import { CommandHubView } from "./views/CommandHubView";
import { BasicInfoView } from "./views/BasicInfoView";
import { RegistrationView } from "./views/RegistrationView";
import { TicketingView } from "./views/TicketingView";
import { SmartGroupsView } from "./views/SmartGroupsView";
import { OperationsView } from "./views/OperationsView";
import { RegistryView } from "./views/RegistryView";
import { AutomationsView } from "./views/AutomationsView";
import { BroadcastView } from "./views/BroadcastView";
import { SettingsView } from "./views/SettingsView";

import { createClient } from "@supabase/supabase-js";
import { useParams } from "next/navigation";

type PageProps = {
    event?: Event | null;
};

export default function Page({ event: initialEvent }: PageProps) {
    return <AppContainer initialEvent={initialEvent ?? null} />;
}

function AppContainer({ initialEvent }: { initialEvent: Event | null }) {
    const params = useParams();
    const tag = typeof params === "object" && params?.tag ? String(params.tag) : null;

    const [activeGlobal, setActiveGlobal] = useState<GlobalSection>("studio");
    const [activeBuilderCategory, setActiveBuilderCategory] =
        useState<CategoryId>("registration");
    const [isBackboneOpen, setIsBackboneOpen] = useState(true);
    const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
    const [isLive, setIsLive] = useState(false);

    // Event state: either provided by prop or fetched client-side
    const [event, setEvent] = useState<Event | null>(initialEvent);
    const [loadingEvent, setLoadingEvent] = useState<boolean>(!initialEvent && Boolean(tag));
    const [eventError, setEventError] = useState<string | null>(null);

    // Passes state
    const [passes, setPasses] = useState<Pass[]>([]);
    const [loadingPasses, setLoadingPasses] = useState<boolean>(false);
    const [passesError, setPassesError] = useState<string | null>(null);

    // Registration Form State
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loadingQuestions, setLoadingQuestions] = useState<boolean>(false);
    const [questionsError, setQuestionsError] = useState<string | null>(null);

    // Attendees State
    const [attendees, setAttendees] = useState<Attendee[]>([]);
    const [loadingAttendees, setLoadingAttendees] = useState<boolean>(false);
    const [attendeesError, setAttendeesError] = useState<string | null>(null);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "b" && activeGlobal === "studio") {
                e.preventDefault();
                setIsBackboneOpen((prev) => !prev);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [activeGlobal]);

    // If no event was passed in, fetch it client-side by tag (reads tag from URL)
    useEffect(() => {
        if (initialEvent || !tag) return;

        let mounted = true;
        setLoadingEvent(true);
        setLoadingPasses(true);
        setLoadingQuestions(true);
        setLoadingAttendees(true);
        setEventError(null);
        setPassesError(null);
        setQuestionsError(null);
        setAttendeesError(null);

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        (async () => {
            try {
                // Fetch event by tag
                const { data: eventData, error: eventErr } = await supabase
                    .from("events")
                    .select("*")
                    .eq("tag", tag)
                    .single();

                if (!mounted) return;

                if (eventErr) {
                    setEventError(eventErr.message || "Failed to load event");
                    setEvent(null);
                    setLoadingEvent(false);
                    setLoadingPasses(false);
                    return;
                }

                setEvent(eventData ?? null);
                setLoadingEvent(false);

                // Fetch passes for this event
                if (eventData?.id) {
                    const { data: passesData, error: passesErr } = await supabase
                        .from("passes")
                        .select("*")
                        .eq("event_id", eventData.id)
                        .order("display_order", { ascending: true });

                    if (!mounted) return;

                    if (passesErr) {
                        setPassesError(passesErr.message || "Failed to load passes");
                    } else {
                        setPasses(passesData ?? []);
                    }

                    // Fetch questions with their options
                    const { data: questionsData, error: questionsErr } = await supabase
                        .from("questions")
                        .select(`
                            *,
                            options:question_options(*)
                        `)
                        .eq("event_id", eventData.id)
                        .order("question_order", { ascending: true });

                    if (!mounted) return;

                    if (questionsErr) {
                        setQuestionsError(questionsErr.message || "Failed to load questions");
                    } else {
                        // Ensure options are sorted by display_order
                        const sortedQuestions = (questionsData ?? []).map(q => ({
                            ...q,
                            options: (q.options ?? []).sort((a: any, b: any) => a.display_order - b.display_order)
                        }));
                        setQuestions(sortedQuestions);
                    }

                    // Fetch attendees for this event
                    const { data: attendeesData, error: attendeesErr } = await supabase
                        .from("attendees")
                        .select(`
                            *,
                            responses:answers(*)
                        `)
                        .eq("event_id", eventData.id)
                        .order("created_at", { ascending: false });

                    if (!mounted) return;

                    if (attendeesErr) {
                        setAttendeesError(attendeesErr.message || "Failed to load attendees");
                    } else {
                        const transformedAttendees = (attendeesData ?? []).map((a: any) => ({
                            ...a,
                            responses: (a.responses ?? []).reduce((acc: any, curr: any) => {
                                acc[curr.question_id] = curr.answer_text;
                                return acc;
                            }, {})
                        }));
                        setAttendees(transformedAttendees);
                    }
                }
            } catch (err: any) {
                if (!mounted) return;
                setEventError(err?.message ?? "An unexpected error occurred");
                setEvent(null);
            } finally {
                if (mounted) {
                    setLoadingPasses(false);
                    setLoadingQuestions(false);
                    setLoadingAttendees(false);
                }
            }
        })();

        return () => {
            mounted = false;
        };
    }, [initialEvent, tag]);

    const refetchQuestions = async () => {
        if (!event?.id) return;

        setLoadingQuestions(true);
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const { data, error } = await supabase
            .from("questions")
            .select(`
                *,
                options:question_options(*)
            `)
            .eq("event_id", event.id)
            .order("question_order", { ascending: true });

        if (error) {
            setQuestionsError(error.message);
        } else {
            const sortedQuestions = (data ?? []).map(q => ({
                ...q,
                options: (q.options ?? []).sort((a: any, b: any) => a.display_order - b.display_order)
            }));
            setQuestions(sortedQuestions);
            setQuestionsError(null);
        }
        setLoadingQuestions(false);
    };

    // Refetch attendees
    const refetchAttendees = async () => {
        if (!event?.id) return;

        setLoadingAttendees(true);
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const { data, error } = await supabase
            .from("attendees")
            .select(`
                *,
                responses:answers(*)
            `)
            .eq("event_id", event.id)
            .order("created_at", { ascending: false });

        if (error) {
            setAttendeesError(error.message);
        } else {
            const transformedAttendees = (data ?? []).map((a: any) => ({
                ...a,
                responses: (a.responses ?? []).reduce((acc: any, curr: any) => {
                    acc[curr.question_id] = curr.answer_text;
                    return acc;
                }, {})
            }));
            setAttendees(transformedAttendees);
            setAttendeesError(null);
        }
        setLoadingAttendees(false);
    };

    // Refetch passes (called after creating a new pass)
    const refetchPasses = async () => {
        if (!event?.id) return;

        setLoadingPasses(true);
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const { data, error } = await supabase
            .from("passes")
            .select("*")
            .eq("event_id", event.id)
            .order("display_order", { ascending: true });

        if (error) {
            setPassesError(error.message);
        } else {
            setPasses(data ?? []);
            setPassesError(null);
        }
        setLoadingPasses(false);
    };

    const showBackbone = activeGlobal === "studio";

    return (
        <div className="flex h-screen bg-white overflow-hidden text-[#111827]">
            {/* Pane 1: Global Context Switcher */}
            <GlobalSidebar
                activeId={activeGlobal}
                onSelect={setActiveGlobal}
                isExpanded={isSidebarExpanded}
                onToggle={() => setIsSidebarExpanded(!isSidebarExpanded)}
            />

            {/* Pane 2: Contextual Backbone (Studio Only) */}
            <AnimatePresence mode="popLayout">
                {showBackbone && isBackboneOpen && (
                    <BackbonePane
                        isOpen={isBackboneOpen}
                        activeId={activeBuilderCategory}
                        onSelect={setActiveBuilderCategory}
                        onToggle={() => setIsBackboneOpen(false)}
                    />
                )}
            </AnimatePresence>

            {/* Pane 3: Main Action Surface */}
            <div className="flex-1 flex flex-col min-w-0 h-full relative bg-white">
                <header className="h-20 border-b border-gray-100 px-10 flex items-center justify-between bg-white/80 backdrop-blur-xl z-40 sticky top-0">
                    <div className="flex items-center gap-5">
                        {!isBackboneOpen && showBackbone && (
                            <button
                                onClick={() => setIsBackboneOpen(true)}
                                className="p-2.5 bg-gray-50 border border-gray-100 rounded-xl text-[var(--brand-blue)] transition-all hover:bg-[var(--brand-blue)] hover:text-white shadow-sm"
                            >
                                <PanelLeftOpen className="w-5 h-5" />
                            </button>
                        )}

                        <div className="flex flex-col">
                            <div className="flex items-center gap-2 mb-1">
                                <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em] leading-none">
                                    {activeGlobal === "studio" ? "Event Studio" : "Intelligence"}
                                </h2>
                            </div>

                            <div className="flex items-center gap-2.5">
                                <span className="text-lg font-black text-gray-900 tracking-tight">
                                    {activeGlobal === "studio"
                                        ? BUILDER_CATEGORIES.find((c) => c.id === activeBuilderCategory)?.label
                                        : GLOBAL_NAV.find((n) => n.id === activeGlobal)?.label}
                                </span>
                                {isLive && (
                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-4 bg-gray-50/50 p-1.5 rounded-2xl border border-gray-100/80">
                            <button
                                title="Preview Registration"
                                className="p-2 text-gray-400 hover:text-gray-900 hover:bg-white hover:shadow-sm rounded-xl transition-all border border-transparent hover:border-gray-100"
                            >
                                <Eye className="w-5 h-5" />
                            </button>

                            <div className="w-px h-4 bg-gray-200" />

                            <div
                                title={isLive ? "Event is Public" : "Event is in Draft"}
                                className="flex items-center gap-3 pr-3 cursor-pointer"
                                onClick={() => setIsLive(!isLive)}
                            >
                                <div
                                    className={cn(
                                        "w-8 h-5 rounded-full relative transition-all duration-300 p-0.5 shadow-inner",
                                        isLive ? "bg-green-500" : "bg-gray-200"
                                    )}
                                >
                                    <motion.div
                                        animate={{ x: isLive ? 12 : 0 }}
                                        className="w-4 h-4 bg-white rounded-full shadow-md"
                                    />
                                </div>

                                <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 leading-none">
                                    {isLive ? "Live" : "Draft"}
                                </span>
                            </div>
                        </div>

                        <button className="bg-gray-900 text-white px-8 py-3 rounded-xl text-[11px] font-black shadow-xl shadow-gray-200 hover:bg-black hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest">
                            Publish Changes
                        </button>
                    </div>
                </header>

                <main className="flex-1 overflow-hidden">
                    {/* Show a small inline loader / error if event is loading or failed */}
                    {loadingEvent && (
                        <div className="p-4 text-sm text-gray-500">Loading event…</div>
                    )}
                    {eventError && (
                        <div className="p-4 text-sm text-red-600">Error: {eventError}</div>
                    )}

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={`${activeGlobal}-${activeBuilderCategory}`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2, ease: "circOut" }}
                            className="h-full"
                        >
                            {activeGlobal === "command" && <CommandHubView />}

                            {activeGlobal === "studio" && (
                                <>
                                    {activeBuilderCategory === "registration" && (
                                        <RegistrationView
                                            questions={questions}
                                            loading={loadingQuestions}
                                            error={questionsError}
                                            eventId={event?.id ?? null}
                                            onQuestionCreated={refetchQuestions}
                                        />
                                    )}
                                    {activeBuilderCategory === "essentials" && (
                                        <BasicInfoView event={event} />
                                    )}
                                    {activeBuilderCategory === "ticketing" && (
                                        <TicketingView
                                            passes={passes}
                                            loading={loadingPasses}
                                            error={passesError}
                                            eventId={event?.id ?? null}
                                            onPassCreated={refetchPasses}
                                        />
                                    )}
                                    {activeBuilderCategory === "variables" && (
                                        <SmartGroupsView
                                            onNavigateToRegistry={() => setActiveGlobal("registry")}
                                        />
                                    )}
                                </>
                            )}

                            {activeGlobal === "live" && <OperationsView />}

                            {/* Professional Organizer Views */}
                            {activeGlobal === "registry" && (
                                <RegistryView
                                    attendees={attendees}
                                    questions={questions}
                                    loading={loadingAttendees}
                                    error={attendeesError}
                                    eventId={event?.id ?? null}
                                    onRefresh={refetchAttendees}
                                />
                            )}
                            {activeGlobal === "automations" && <AutomationsView />}
                            {activeGlobal === "broadcast" && <BroadcastView />}
                            {activeGlobal === "settings" && <SettingsView />}
                        </motion.div>
                    </AnimatePresence>
                </main>
            </div>
        </div>
    );
}
