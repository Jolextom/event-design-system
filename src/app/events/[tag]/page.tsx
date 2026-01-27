"use client";
import React, { useState, useEffect, useLayoutEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PanelLeftOpen, Eye, Menu, X } from "lucide-react";
import Link from 'next/link';
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
import { Toast, ToastType } from "./components/Toast";
import { ConfirmModal } from "./components/ConfirmModal";
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
import { useParams, useRouter, useSearchParams, usePathname } from "next/navigation";

type PageProps = {
    event?: Event | null;
};

export default function Page({ event: initialEvent }: PageProps) {
    return <AppContainer initialEvent={initialEvent ?? null} />;
}

function AppContainer({ initialEvent }: { initialEvent: Event | null }) {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const tag = typeof params === "object" && params?.tag ? String(params.tag) : null;

    // Initialize from URL or default
    const [activeGlobal, setActiveGlobal] = useState<GlobalSection>(() => {
        const view = searchParams.get("view");
        const validViews: GlobalSection[] = ["command", "studio", "registry", "automations", "broadcast", "live", "settings"];
        return (view && validViews.includes(view as GlobalSection)) ? (view as GlobalSection) : "studio";
    });

    // Event state: either provided by prop or fetched client-side
    const [event, setEvent] = useState<Event | null>(initialEvent);

    useEffect(() => {
        if (initialEvent) {
            setEvent(initialEvent);
        }
    }, [initialEvent]);

    const isPublished = event?.is_published || false;
    const globalLocked = !isPublished;

    // Can only publish (and access studio) if basic info is complete
    const isSetupComplete = Boolean(
        event?.event_title &&
        event?.start_date &&
        event?.location
    );

    const studioLocked = !isSetupComplete;

    // Determine initial builder category based on locked status or URL
    const [activeBuilderCategory, setActiveBuilderCategory] = useState<CategoryId>(() => {
        const section = searchParams.get("section");
        const validSections: CategoryId[] = ["essentials", "registration", "ticketing", "variables"];
        if (section && validSections.includes(section as CategoryId)) {
            return section as CategoryId;
        }
        return studioLocked ? "essentials" : "registration";
    });

    // Sync state to URL
    useEffect(() => {
        const params = new URLSearchParams(searchParams.toString());
        let changed = false;

        if (params.get("view") !== activeGlobal) {
            params.set("view", activeGlobal);
            changed = true;
        }

        // Only sync section if in studio (or relevant views)
        if (activeGlobal === "studio") {
            if (params.get("section") !== activeBuilderCategory) {
                params.set("section", activeBuilderCategory);
                changed = true;
            }
        } else {
            // Optional: clear section if not in studio to keep URL clean? 
            // Or keep it for history? Let's keep it clean.
            if (params.get("section")) {
                params.delete("section");
                changed = true;
            }
        }

        if (changed) {
            router.replace(`${pathname}?${params.toString()}`, { scroll: false });
        }
    }, [activeGlobal, activeBuilderCategory, pathname, router, searchParams]);

    const [isBackboneOpen, setIsBackboneOpen] = useState(true);
    const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);

    const [loadingEvent, setLoadingEvent] = useState<boolean>(!initialEvent && Boolean(tag));
    const [eventError, setEventError] = useState<string | null>(null);

    // Mobile responsive state
    const [isMobile, setIsMobile] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Detect mobile viewport
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 1024);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Close mobile menu when switching sections
    useEffect(() => {
        if (isMobile) {
            setIsMobileMenuOpen(false);
        }
    }, [activeGlobal, isMobile]);




    // Effect to enforce locking if event data updates and confirms incomplete setup
    useEffect(() => {
        if (event && !event.location && activeBuilderCategory !== "essentials") {
            setActiveBuilderCategory("essentials");
        }
    }, [event, activeBuilderCategory]);

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

    // UX State
    const [confirmUnpublishOpen, setConfirmUnpublishOpen] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);


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
                            responses:answers(*),
                            order:orders_table!order_id (email)
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
                responses:answers(*),
                order:orders_table!order_id (email)
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

    const handleEventUpdate = (updates: Partial<Event>) => {
        if (!event) return;
        setEvent({ ...event, ...updates });
        router.refresh();
    };

    const togglePublish = async () => {
        if (!event?.id) return;

        // This is the actual DB update function, separated from the button handler
        const newStatus = !isPublished;

        try {
            const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            );

            const { error } = await supabase
                .from("events")
                .update({ is_published: newStatus })
                .eq("id", event.id);

            if (error) throw error;

            // Optimistic update
            setEvent(prev => prev ? { ...prev, is_published: newStatus } : null);
            router.refresh();

            if (newStatus) {
                setToast({ message: "Event Launched Successfully!", type: "success" });
            } else {
                setToast({ message: "Event Returned to Draft.", type: "info" });
            }
        } catch (error) {
            console.error("Error updating publish status:", error);
            setToast({ message: "Failed to update status", type: "error" });
        }
    };

    const handlePublishClick = () => {
        if (!event?.id || (!isSetupComplete && !isPublished)) return;

        if (isPublished) {
            // Confirm unpublish
            setConfirmUnpublishOpen(true);
        } else {
            // Publish immediately
            togglePublish();
        }
    };

    const showBackbone = activeGlobal === "studio";

    return (
        <div className="flex h-screen bg-white overflow-hidden text-[#111827]">
            <Toast
                message={toast?.message ?? null}
                type={toast?.type}
                onClose={() => setToast(null)}
            />

            <ConfirmModal
                isOpen={confirmUnpublishOpen}
                onClose={() => setConfirmUnpublishOpen(false)}
                onConfirm={togglePublish}
                title="Unpublish Event?"
                description="This will hide the event from the public. Attendees will no longer be able to access the event page or register."
                confirmLabel="Unpublish"
                cancelLabel="Cancel"
                isDestructive={true}
            />

            {/* Pane 1: Global Context Switcher */}
            {/* Desktop: Always rendered, hidden on mobile via CSS */}
            <div className="hidden lg:block">
                <GlobalSidebar
                    activeId={activeGlobal}
                    onSelect={setActiveGlobal}
                    isExpanded={isSidebarExpanded}
                    onToggle={() => setIsSidebarExpanded(!isSidebarExpanded)}
                    contentLocked={globalLocked}
                    isLoading={loadingEvent}
                />
            </div>
            {/* Mobile: drawer overlay (JS controlled) */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <GlobalSidebar
                        activeId={activeGlobal}
                        onSelect={(id) => {
                            setActiveGlobal(id);
                            setIsMobileMenuOpen(false);
                        }}
                        isExpanded={true}
                        onToggle={() => setIsMobileMenuOpen(false)}
                        contentLocked={globalLocked}
                        isLoading={loadingEvent}
                        isMobile={true}
                        onClose={() => setIsMobileMenuOpen(false)}
                    />
                )}
            </AnimatePresence>

            {/* Pane 2: Contextual Backbone (Studio Only) - Hidden on mobile via CSS */}
            <div className="hidden lg:block">
                <AnimatePresence mode="popLayout">
                    {showBackbone && isBackboneOpen && (
                        <BackbonePane
                            isOpen={isBackboneOpen}
                            activeId={activeBuilderCategory}
                            onSelect={setActiveBuilderCategory}
                            onToggle={() => setIsBackboneOpen(false)}
                            contentLocked={studioLocked}
                            isLoading={loadingEvent}
                        />
                    )}
                </AnimatePresence>
            </div>

            {/* Pane 3: Main Action Surface */}
            <div className="flex-1 flex flex-col min-w-0 h-full relative bg-white">
                <header className="h-16 lg:h-20 border-b border-gray-100 px-4 lg:px-10 flex items-center justify-between bg-white/80 backdrop-blur-xl z-40 sticky top-0">
                    <div className="flex items-center gap-3 lg:gap-5">

                        {/* Mobile hamburger menu - hidden on desktop via CSS */}
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="lg:hidden p-2.5 bg-gray-50 border border-gray-100 rounded-xl text-gray-600 transition-all hover:bg-gray-100 shadow-sm"
                        >
                            <Menu className="w-5 h-5" />
                        </button>

                        {/* Desktop: Show backbone toggle - hidden on mobile via CSS */}
                        {!isBackboneOpen && showBackbone && (
                            <button
                                onClick={() => setIsBackboneOpen(true)}
                                className="hidden lg:flex p-2.5 bg-gray-50 border border-gray-100 rounded-xl text-[var(--brand-blue)] transition-all hover:bg-[var(--brand-blue)] hover:text-white shadow-sm"
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
                                {!loadingEvent && (
                                    isPublished ? (
                                        <div className="flex items-center gap-2 px-2 py-1 bg-green-50 border border-green-100 rounded-lg">
                                            <div className="w-2 h-2 rounded-full bg-green-500" />
                                            <span className="text-[10px] font-bold text-green-700 uppercase tracking-wide">Live</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 px-2 py-1 bg-yellow-50 border border-yellow-100 rounded-lg">
                                            <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                                            <span className="text-[10px] font-bold text-yellow-700 uppercase tracking-wide">Draft</span>
                                        </div>
                                    )
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-4 bg-gray-50/50 p-1.5 rounded-2xl border border-gray-100/80">
                            <Link
                                href={`/${event?.tag || ''}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Preview Registration"
                                className="p-2 text-gray-400 hover:text-gray-900 hover:bg-white hover:shadow-sm rounded-xl transition-all border border-transparent hover:border-gray-100 flex items-center justify-center"
                            >
                                <Eye className="w-5 h-5" />
                            </Link>
                        </div>

                        <button
                            disabled={!isSetupComplete && !isPublished}
                            onClick={handlePublishClick}
                            className={cn(
                                "px-4 lg:px-8 py-2.5 lg:py-3 rounded-xl text-[10px] lg:text-[11px] font-black shadow-xl transition-all uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none",
                                isPublished
                                    ? "bg-white text-red-500 border border-red-100 hover:bg-red-50 hover:border-red-200 shadow-sm"
                                    : (isSetupComplete
                                        ? "bg-[var(--brand-blue)] text-white hover:bg-blue-600 shadow-blue-200 shadow-lg"
                                        : "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none")
                            )}
                        >
                            <span className="hidden sm:inline">{isPublished ? "Unpublish Event" : "Publish Event"}</span>
                            <span className="sm:hidden">{isPublished ? "Unpublish" : "Publish"}</span>
                        </button>
                    </div>
                </header>

                {/* Mobile Studio Tabs - Show builder categories as tabs on mobile */}
                {isMobile && activeGlobal === "studio" && (
                    <div
                        className="flex overflow-x-auto border-b border-gray-100 bg-gray-50/50 px-4 py-2 gap-2 shrink-0"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
                    >
                        {BUILDER_CATEGORIES.map((cat) => {
                            const isActive = activeBuilderCategory === cat.id;
                            const isLocked = studioLocked && cat.id !== "essentials";
                            return (
                                <button
                                    key={cat.id}
                                    onClick={() => !isLocked && setActiveBuilderCategory(cat.id)}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0",
                                        isLocked
                                            ? "opacity-40 cursor-not-allowed bg-gray-100 text-gray-400"
                                            : isActive
                                                ? "bg-white text-[var(--brand-blue)] shadow-sm border border-gray-100"
                                                : "text-gray-500 hover:bg-white/50"
                                    )}
                                >
                                    <cat.icon className="w-4 h-4" />
                                    {cat.label}
                                </button>
                            );
                        })}
                    </div>
                )}

                <main className="flex-1 overflow-hidden">
                    {/* Show skeleton while loading, error state if failed, or content if ready */}
                    {loadingEvent ? (
                        <PageSkeleton />
                    ) : eventError ? (
                        <div className="flex flex-col items-center justify-center h-full gap-4">
                            <div className="text-center">
                                <p className="text-lg font-bold text-gray-900 mb-2">Event Not Found</p>
                                <p className="text-sm text-gray-500">{eventError}</p>
                            </div>
                            <a href="/events/dashboard" className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-bold text-gray-700 transition-colors">
                                Back to Dashboard
                            </a>
                        </div>
                    ) : !event ? (
                        <div className="flex flex-col items-center justify-center h-full gap-4">
                            <div className="text-center">
                                <p className="text-lg font-bold text-gray-900 mb-2">Event Not Found</p>
                                <p className="text-sm text-gray-500">This event doesn't exist or has been removed.</p>
                            </div>
                            <a href="/events/dashboard" className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-bold text-gray-700 transition-colors">
                                Back to Dashboard
                            </a>
                        </div>
                    ) : (
                        <AnimatePresence mode="popLayout">
                            <motion.div
                                key={activeGlobal}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.1 }}
                                className="h-full"
                            >
                                {activeGlobal === "command" && <CommandHubView />}

                                {activeGlobal === "studio" && (
                                    <AnimatePresence mode="wait">
                                        <motion.div
                                            key={activeBuilderCategory}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            transition={{ duration: 0.2, ease: "circOut" }}
                                            className="h-full"
                                        >
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
                                                <BasicInfoView
                                                    event={event}
                                                    hasTickets={passes.length > 0}
                                                    hasQuestions={questions.length > 0}
                                                    onNavigate={setActiveBuilderCategory}
                                                    onUpdate={handleEventUpdate}
                                                />
                                            )}
                                            {activeBuilderCategory === "ticketing" && (
                                                <TicketingView
                                                    passes={passes}
                                                    loading={loadingPasses}
                                                    error={passesError}
                                                    eventId={event?.id ?? null}
                                                    onPassCreated={refetchPasses}
                                                    attendees={attendees}
                                                />
                                            )}
                                            {activeBuilderCategory === "variables" && (
                                                <SmartGroupsView
                                                    onNavigateToRegistry={() => setActiveGlobal("registry")}
                                                />
                                            )}
                                        </motion.div>
                                    </AnimatePresence>
                                )}

                                {activeGlobal === "live" && <OperationsView />}

                                {/* Professional Organizer Views */}
                                {activeGlobal === "registry" && (
                                    <RegistryView
                                        attendees={attendees}
                                        questions={questions}
                                        passes={passes}
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
                    )}
                </main>
            </div >
        </div >
    );
}

// Skeleton component for initial page load
function PageSkeleton() {
    return (
        <div className="h-full flex flex-col animate-pulse">
            {/* Header skeleton */}
            <div className="p-10 border-b border-gray-100">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="h-3 w-20 bg-gray-100 rounded mb-3" />
                        <div className="h-6 w-48 bg-gray-100 rounded" />
                    </div>
                    <div className="h-10 w-32 bg-gray-100 rounded-xl" />
                </div>
            </div>

            {/* Content skeleton */}
            <div className="flex-1 p-10 space-y-8">
                {/* Banner placeholder */}
                <div className="h-56 bg-gray-50 rounded-4xl border-2 border-dashed border-gray-100" />

                {/* Title placeholder */}
                <div className="space-y-4">
                    <div className="h-8 w-64 bg-gray-100 rounded" />
                    <div className="h-4 w-96 bg-gray-50 rounded" />
                </div>

                {/* Cards grid placeholder */}
                <div className="grid grid-cols-2 gap-6">
                    <div className="h-32 bg-gray-50 rounded-3xl border border-gray-100" />
                    <div className="h-32 bg-gray-50 rounded-3xl border border-gray-100" />
                </div>
            </div>
        </div>
    );
}
