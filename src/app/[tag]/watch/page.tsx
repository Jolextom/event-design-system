"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
    ShieldAlert,
    Loader2,
    Users,
    ExternalLink,
    Sparkles,
    Zap,
    Heart,
    Share2,
    Clock,
    CheckCircle2,
    Video,
} from "lucide-react";
import { motion } from "framer-motion";
import type { Event, Attendee } from "../../events/[tag]/types";

// Detect platform from link
function detectPlatform(link: string) {
    if (!link) return { isZoom: false, isMeet: false, isYouTube: false, isExternal: false };
    const isYouTube = link.includes("youtube.com") || link.includes("youtu.be");
    const isZoom = link.includes("zoom.us");
    const isMeet = link.includes("meet.google.com");
    return {
        isYouTube,
        isZoom,
        isMeet,
        isExternal: !isYouTube && link.length > 0,
    };
}

function getPlatformLabel(link: string) {
    const p = detectPlatform(link);
    if (p.isZoom) return "Zoom";
    if (p.isMeet) return "Google Meet";
    if (p.isYouTube) return "YouTube";
    return "External";
}

function getPlatformColor(link: string) {
    const p = detectPlatform(link);
    if (p.isZoom) return { bg: "bg-blue-50", border: "border-blue-200", icon: "text-blue-600", btn: "bg-[#2D8CFF] hover:bg-[#2576e8]", shadow: "shadow-[#2D8CFF]/20" };
    if (p.isMeet) return { bg: "bg-green-50", border: "border-green-200", icon: "text-green-600", btn: "bg-[#00AC47] hover:bg-[#009940]", shadow: "shadow-[#00AC47]/20" };
    return { bg: "bg-gray-50", border: "border-gray-200", icon: "text-gray-600", btn: "bg-gray-900 hover:bg-gray-800", shadow: "shadow-gray-900/10" };
}

export default function DigitalVenuePage() {
    const params = useParams();
    const searchParams = useSearchParams();

    const tag = typeof params === "object" && params?.tag ? String(params.tag) : null;
    const token = searchParams.get("token");

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [event, setEvent] = useState<Event | null>(null);
    const [attendee, setAttendee] = useState<Attendee | null>(null);
    const [isHost, setIsHost] = useState(false);
    const [joined, setJoined] = useState(false);
    const prevLink = useRef<string | null>(null);

    // Reset joined state if host changes the meeting link
    useEffect(() => {
        const currentLink = event?.virtual_link ?? null;
        if (prevLink.current !== null && prevLink.current !== currentLink) {
            setJoined(false);
        }
        prevLink.current = currentLink;
    }, [event?.virtual_link]);

    const heartbeatInterval = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!tag) {
            setError("Event tag is missing.");
            setLoading(false);
            return;
        }

        let activeChannel: any = null;

        const initWatchPage = async () => {
            try {
                const { data: eventData, error: eventErr } = await supabase
                    .from("events")
                    .select("*")
                    .eq("tag", tag)
                    .single();

                if (eventErr || !eventData) throw new Error("This event could not be found.");
                if (eventData.event_format === "physical") throw new Error("This is an in-person event.");

                setEvent(eventData);

                // Realtime: update event data live
                activeChannel = supabase
                    .channel("event_updates")
                    .on("postgres_changes", {
                        event: "UPDATE",
                        schema: "public",
                        table: "events",
                        filter: `id=eq.${eventData.id}`,
                    }, (payload) => {
                        setEvent(payload.new as Event);
                    })
                    .subscribe();

                // Auth: token = attendee, no token + creator = host
                const { data: { user } } = await supabase.auth.getUser();
                let attendeeData: any = null;

                if (token) {
                    const { data: guestData } = await supabase
                        .from("attendees")
                        .select("*")
                        .eq("id", token)
                        .eq("event_id", eventData.id)
                        .single();

                    if (guestData) attendeeData = guestData;
                }

                if (!attendeeData && user) {
                    if (user.id === eventData.created_by) {
                        setIsHost(true);
                        const { data: profileData } = await supabase
                            .from("profiles")
                            .select("*")
                            .eq("id", user.id)
                            .single();

                        attendeeData = {
                            id: user.id,
                            first_name: profileData?.first_name || user.user_metadata?.first_name || "Event",
                            last_name: profileData?.last_name || user.user_metadata?.last_name || "Organizer",
                            email: user.email,
                            event_id: eventData.id,
                            check_in: true,
                        };
                    }
                }

                if (!attendeeData) {
                    throw new Error("We couldn't find your invitation. Please check your email for the correct link.");
                }

                setAttendee(attendeeData);

                // Check-in (guests only)
                if (!attendeeData.check_in && token) {
                    await supabase
                        .from("attendees")
                        .update({ check_in: true, check_in_time: new Date().toISOString() })
                        .eq("id", attendeeData.id);
                }

                // Virtual attendance record
                const { data: existing } = await supabase
                    .from("virtual_attendance")
                    .select("id")
                    .eq("event_id", eventData.id)
                    .eq("guest_id", attendeeData.id)
                    .single();

                if (!existing) {
                    await supabase.from("virtual_attendance").insert({
                        event_id: eventData.id,
                        guest_id: attendeeData.id,
                        join_time: new Date().toISOString(),
                        last_heartbeat_time: new Date().toISOString(),
                        total_minutes_watched: 0,
                    });
                }

            } catch (err: any) {
                setError(err.message || "Something went wrong.");
            } finally {
                setLoading(false);
            }
        };

        initWatchPage();

        return () => {
            if (activeChannel) supabase.removeChannel(activeChannel);
            if (heartbeatInterval.current) clearInterval(heartbeatInterval.current);
        };
    }, [tag, token]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center text-gray-900">
                <Loader2 className="w-10 h-10 animate-spin mb-6 text-[var(--color-primary-500)]" />
                <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-400">Opening the Venue...</span>
            </div>
        );
    }

    if (error || !event || !attendee) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
                <ShieldAlert className="w-12 h-12 text-red-600 mb-8" />
                <h1 className="text-3xl font-bold mb-4 tracking-tight text-gray-900">Access Restricted</h1>
                <p className="text-gray-500 font-medium max-w-sm mb-10 leading-relaxed">{error}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="px-10 py-4 bg-gray-900 text-white rounded-2xl text-[13px] font-bold tracking-tight shadow-xl hover:scale-[1.02] transition-all"
                >
                    Try Again
                </button>
            </div>
        );
    }

    const link = event.virtual_link || "";
    const platform = detectPlatform(link);
    const platformLabel = getPlatformLabel(link);
    const colors = getPlatformColor(link);

    // Date/time display
    let startTimeDisplay = "Not set";
    let startTime = new Date();
    if (event.start_date) {
        const timeStr = event.start_time ? `T${event.start_time}` : "T00:00:00";
        startTime = new Date(`${event.start_date}${timeStr}`);
        startTimeDisplay = startTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }

    const isBeforeStart = !isHost && new Date() < new Date(startTime.getTime() - 15 * 60000);

    // YouTube embed
    let youtubeEmbedUrl = "";
    if (platform.isYouTube && link) {
        const videoId = link.split("v=")[1]?.split("&")[0] || link.split("youtu.be/")[1]?.split("?")[0];
        if (videoId) youtubeEmbedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    }

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col font-sans overflow-x-hidden">

            {/* Header */}
            <header className="px-8 py-5 flex items-center justify-between border-b border-gray-200 bg-white/95 backdrop-blur-xl shrink-0 z-50">
                <div className="flex items-center gap-5">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[var(--color-primary-500)] to-[var(--color-primary-700)] flex items-center justify-center shadow-lg shadow-[var(--color-primary-500)]/20">
                        <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-base font-bold text-gray-900 tracking-tight leading-none mb-1">{event.event_title}</h1>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-primary-600)]">Live Venue</span>
                            <span className="w-1 h-1 rounded-full bg-gray-300" />
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{event.tag}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    {isHost && (
                        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-blue-50 border border-blue-100">
                            <Zap className="w-3.5 h-3.5 text-blue-600" />
                            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-widest">Organizer</span>
                        </div>
                    )}
                    <div className="flex items-center gap-3 pl-6 border-l border-gray-200">
                        <div className="text-right hidden md:block">
                            <p className="text-[12px] font-bold text-gray-900 mb-0.5">{attendee.first_name} {attendee.last_name}</p>
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">{isHost ? "Host" : "Guest"}</p>
                        </div>
                        <div className="w-10 h-10 rounded-2xl bg-gray-100 border border-gray-200 flex items-center justify-center font-bold text-sm text-gray-600">
                            {attendee.first_name.charAt(0)}
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-1 flex flex-col lg:flex-row w-full max-w-[1800px] mx-auto p-4 md:p-8 lg:p-12 gap-10">

                {/* Main area */}
                <div className="flex-1 flex flex-col min-w-0 min-h-[450px] md:min-h-[600px] lg:min-h-0">
                    <div className="w-full flex-1 bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-sm relative flex flex-col items-center justify-center p-12 text-center">

                        {/* --- PREMIUM WAITING/EMPTY STATES --- */}
                        {!youtubeEmbedUrl && (!joined || isBeforeStart) && (
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex flex-col items-center max-w-md w-full"
                            >
                                <div className="relative mb-12">
                                    <div className="absolute inset-0 bg-blue-100 blur-3xl opacity-30 scale-150 animate-pulse rounded-full" />
                                    <div className="relative w-24 h-24 bg-white rounded-[40px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] border border-gray-50 flex items-center justify-center group overflow-hidden">
                                        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                        {isBeforeStart ? (
                                            <Clock className="w-10 h-10 text-blue-600 relative z-10" />
                                        ) : !link ? (
                                            <Video className="w-10 h-10 text-gray-300 relative z-10" />
                                        ) : (
                                            <Video className={`w-10 h-10 ${colors.icon} relative z-10`} />
                                        )}
                                    </div>
                                    <motion.div 
                                        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                                        transition={{ repeat: Infinity, duration: 2 }}
                                        className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full border-4 border-white shadow-sm"
                                    />
                                </div>

                                <div className="space-y-4 mb-10">
                                    <h2 className="text-3xl font-black text-gray-900 tracking-tight leading-tight uppercase italic">
                                        {isBeforeStart ? "Venue Opening" : !link ? "No Link" : platformLabel} <br />
                                        <span className="text-blue-600">
                                            {isBeforeStart ? "Coming Soon" : !link ? "Yet" : "Meeting"}
                                        </span>
                                    </h2>
                                    <p className="text-sm font-medium text-gray-400 leading-relaxed px-4">
                                        {isBeforeStart 
                                            ? "The doors haven't opened yet. You'll be able to join 15 minutes before the start time." 
                                            : !link 
                                                ? "The organizer hasn't added a meeting link yet. Check back closer to the event time."
                                                : platform.isExternal 
                                                    ? `Ready to join the ${platformLabel} session? Click below to launch the digital venue.`
                                                    : "Preparing your secure stream access..."
                                        }
                                    </p>
                                </div>

                                {platform.isExternal && link && !isBeforeStart && !joined && (
                                    <button
                                        onClick={() => setJoined(true)}
                                        className={`group relative overflow-hidden px-10 py-5 ${colors.btn} text-white rounded-[24px] font-black text-sm uppercase tracking-widest shadow-2xl ${colors.shadow} transition-all active:scale-95 flex items-center justify-center gap-3 w-full`}
                                    >
                                        <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                                        <a
                                            href={link}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="flex items-center gap-3 relative z-10"
                                        >
                                            {isHost ? "Launch Venue" : "Secure Entry"}
                                            <ExternalLink className="w-4 h-4 opacity-70 group-hover:translate-x-1 transition-transform" />
                                        </a>
                                    </button>
                                )}

                                {!link && !isBeforeStart && (
                                    <div className="w-full h-px background-gradient-to-r from-transparent via-gray-100 to-transparent my-8" />
                                )}

                                {isBeforeStart && (
                                    <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-xl border border-gray-100">
                                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Awaiting Organizer</span>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* YouTube Stream (If link exists) */}
                        {platform.isYouTube && youtubeEmbedUrl && !isBeforeStart && (
                            <div className="absolute inset-0">
                                <iframe
                                    src={youtubeEmbedUrl}
                                    className="w-full h-full border-0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                />
                            </div>
                        )}

                        {/* "You're In" state for external meetings */}
                        {joined && platform.isExternal && !platform.isYouTube && !isBeforeStart && (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex flex-col items-center"
                            >
                                <div className="w-24 h-24 bg-green-50 rounded-[40px] border border-green-100 flex items-center justify-center mb-10 shadow-sm">
                                    <CheckCircle2 className="w-12 h-12 text-green-500" />
                                </div>
                                <h2 className="text-3xl font-black text-gray-900 tracking-tight leading-tight uppercase italic mb-4">
                                    Access <span className="text-green-600">Granted</span>
                                </h2>
                                <p className="text-sm font-medium text-gray-400 max-w-sm mb-12">
                                    The session has launched in a private tab. Use the control below if you need to re-enter.
                                </p>
                                <a
                                    href={link}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={`px-10 py-5 ${colors.btn} text-white rounded-[24px] font-black text-sm uppercase tracking-widest shadow-2xl ${colors.shadow} transition-all active:scale-95 flex items-center justify-center gap-3`}
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    <span>Return to Stage</span>
                                </a>
                            </motion.div>
                        )}
                    </div>

                    {/* Below video bar */}
                    <div className="flex items-center justify-between mt-6 px-2 shrink-0">
                        <div className="flex flex-col">
                            <h2 className="text-xl font-bold tracking-tight text-gray-900 mb-1">{event.event_title}</h2>
                            <div className="flex items-center gap-3 text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                                <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Live Venue</span>
                                <span className="w-1 h-1 rounded-full bg-gray-300" />
                                <span className="text-[var(--color-primary-500)] capitalize">{platformLabel}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button className="p-3 bg-white hover:bg-gray-50 border border-gray-200 shadow-sm rounded-2xl text-gray-500 hover:text-red-500 transition-all group">
                                <Heart className="w-4 h-4 group-hover:fill-red-500" />
                            </button>
                            <button className="px-6 py-3 bg-gray-900 hover:bg-gray-800 rounded-2xl text-white text-[12px] font-bold tracking-tight shadow-xl shadow-gray-900/10 transition-all flex items-center gap-2">
                                <Share2 className="w-4 h-4" /> Share
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Sidebar */}
                <div className="w-full lg:w-[420px] shrink-0 flex flex-col h-full min-h-[500px]">
                    <div className="flex-1 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col overflow-hidden">
                        <div className="flex border-b border-gray-100">
                            <button className="flex-1 py-4 text-[11px] font-bold uppercase tracking-widest text-gray-900 border-b-2 border-gray-900">
                                Event Details
                            </button>
                            <button className="flex-1 py-4 text-[11px] font-bold uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-colors">
                                Attendees
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8">
                            <div className="mb-8">
                                <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-[var(--color-primary-500)]" />
                                    About this Event
                                </h3>
                                <div
                                    className="text-sm text-gray-600 leading-relaxed font-medium prose prose-sm max-w-none"
                                    dangerouslySetInnerHTML={{ __html: event.description || "No description provided." }}
                                />
                            </div>

                            <div className="space-y-4 pt-6 border-t border-gray-100">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-500 font-medium">Platform</span>
                                    <span className="font-bold text-gray-900 uppercase text-[10px] tracking-widest bg-gray-100 px-2 py-1 rounded-md">
                                        {platformLabel}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-500 font-medium">Start Time</span>
                                    <span className="font-bold text-gray-900">{startTimeDisplay}</span>
                                </div>
                            </div>

                            <div className="mt-12 p-6 bg-blue-50 rounded-2xl border border-blue-100">
                                <h4 className="text-[11px] font-bold text-blue-800 uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <Zap className="w-3.5 h-3.5" /> Venue Policy
                                </h4>
                                <p className="text-xs text-blue-700/80 leading-relaxed font-medium">
                                    Please be respectful to all attendees. Disruptive behavior may result in removal by the host.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
