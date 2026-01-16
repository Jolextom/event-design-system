"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    PanelLeftOpen,
    Eye
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- Types & Constants ---
import { GlobalSection, CategoryId, BUILDER_CATEGORIES, GLOBAL_NAV } from "./types";

// --- Components ---
import { GlobalSidebar } from "./components/Sidebar";
import { BackbonePane } from "./components/Backbone";

// --- Views ---
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

export default function AppContainer() {
    const [activeGlobal, setActiveGlobal] = useState<GlobalSection>("studio");
    const [activeBuilderCategory, setActiveBuilderCategory] = useState<CategoryId>("registration");
    const [isBackboneOpen, setIsBackboneOpen] = useState(true);
    const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
    const [isLive, setIsLive] = useState(false);
    // Fix: define selectedSegment state before usage
    // Removed selectedSegment state (no longer used)

    // Keyboard shortcut for Pane 2 toggle (Studio context only)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "b" && activeGlobal === "studio") {
                e.preventDefault();
                setIsBackboneOpen(prev => !prev);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [activeGlobal]);

    // PRD Business Rule: Backbone only appears in the Studio context
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
                                className="p-2.5 bg-gray-50 border border-gray-100 rounded-xl text-(--brand-blue) transition-all hover:bg-(--brand-blue) hover:text-white shadow-sm"
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
                                    {activeGlobal === "studio" ? BUILDER_CATEGORIES.find(c => c.id === activeBuilderCategory)?.label : GLOBAL_NAV.find(n => n.id === activeGlobal)?.label}
                                </span>
                                {isLive && <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-4 bg-gray-50/50 p-1.5 rounded-2xl border border-gray-100/80">
                            <button
                                title="Preview Registration"
                                className="p-2 text-gray-400 hover:text-gray-900 hover:bg-white hover:shadow-sm rounded-xl transition-all border border-transparent hover:border-gray-100"
                            >
                                <Eye className="w-4.5 h-4.5" />
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
                                <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 leading-none">{isLive ? "Live" : "Draft"}</span>
                            </div>
                        </div>

                        <button className="bg-gray-900 text-white px-8 py-3 rounded-xl text-[11px] font-black shadow-xl shadow-gray-200 hover:bg-black hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest">
                            Publish Changes
                        </button>
                    </div>
                </header>

                <main className="flex-1 overflow-hidden">
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
                                    {activeBuilderCategory === "registration" && <RegistrationView />}
                                    {activeBuilderCategory === "essentials" && <BasicInfoView />}
                                    {activeBuilderCategory === "ticketing" && <TicketingView />}
                                    {activeBuilderCategory === "variables" && (
                                        <SmartGroupsView
                                            onNavigateToRegistry={() => setActiveGlobal("registry")}
                                        />
                                    )}
                                </>
                            )}
                            {activeGlobal === "live" && <OperationsView />}

                            {/* Professional Organizer Views */}
                            {activeGlobal === "registry" && <RegistryView />}
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
