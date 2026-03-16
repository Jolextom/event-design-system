"use client";

import React, { Suspense, useState, useEffect, useRef } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { ShieldAlert, Loader2, ExternalLink, Video, Clock, CheckCircle2, Sparkles, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Event, Attendee } from "../../events/[tag]/types";

function detectPlatform(link: string) {
    if (!link) return { isZoom: false, isMeet: false, isYouTube: false, isExternal: false };
    const isYouTube = link.includes("youtube.com") || link.includes("youtu.be");
    const isZoom = link.includes("zoom.us");
    const isMeet = link.includes("meet.google.com");
    return { isYouTube, isZoom, isMeet, isExternal: !isYouTube && link.length > 0 };
}

function getPlatformMeta(link: string) {
    const p = detectPlatform(link);
    if (p.isZoom) return {
        label: "Zoom", icon: "🟦",
        btn: "bg-[#2D8CFF] hover:bg-[#2576e8]",
        glow: "shadow-[#2D8CFF]/30", ring: "ring-[#2D8CFF]/20",
        bg: "from-[#2D8CFF]/5 to-[#2D8CFF]/0",
    };
    if (p.isMeet) return {
        label: "Google Meet", icon: "🟢",
        btn: "bg-[#00AC47] hover:bg-[#009940]",
        glow: "shadow-[#00AC47]/30", ring: "ring-[#00AC47]/20",
        bg: "from-[#00AC47]/5 to-[#00AC47]/0",
    };
    if (p.isYouTube) return {
        label: "YouTube", icon: "🔴",
        btn: "bg-[#FF0000] hover:bg-[#e00000]",
        glow: "shadow-[#FF0000]/30", ring: "ring-[#FF0000]/20",
        bg: "from-[#FF0000]/5 to-[#FF0000]/0",
    };
    return {
        label: "Meeting", icon: "🔗",
        btn: "bg-gray-900 hover:bg-gray-800",
        glow: "shadow-gray-900/20", ring: "ring-gray-900/10",
        bg: "from-gray-100 to-gray-50",
    };
}

function JoinInner() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();
    const tag = typeof params === "object" && params?.tag ? String(params.tag) : null;
    const token = searchParams.get("token");

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [event, setEvent] = useState<Event | null>(null);
    const [attendee, setAttendee] = useState<Attendee | null>(null);
    const [isHost, setIsHost] = useState(false);
    const [joined, setJoined] = useState(false);

    const prevLink = useRef<string | null>(null);
    const heartbeatInterval = useRef<NodeJS.Timeout | null>(null);

    // Derived State
    const link = event?.virtual_link || "";
    const meta = getPlatformMeta(link);
    const platform = detectPlatform(link);

    let startTimeDisplay = "TBC";
    let startTime = new Date();
    if (event?.start_date) {
        const timeStr = event.start_time ? `T${event.start_time}` : "T00:00:00";
        startTime = new Date(`${event.start_date}${timeStr}`);
        startTimeDisplay = startTime.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })
            + " · " + startTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }

    const isBeforeStart = !isHost && new Date() < new Date(startTime.getTime() - 15 * 60000);

    let youtubeEmbedUrl = "";
    if (platform.isYouTube && link) {
        const videoId = link.split("v=")[1]?.split("&")[0] || link.split("youtu.be/")[1]?.split("?")[0];
        if (videoId) youtubeEmbedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    }

    // Hooks
    useEffect(() => {
        const currentLink = event?.virtual_link ?? null;
        if (prevLink.current !== null && prevLink.current !== currentLink) {
            setJoined(false);
        }
        prevLink.current = currentLink;
    }, [event?.virtual_link]);

    useEffect(() => {
        if (!tag) { setError("Event not found."); setLoading(false); return; }

        let activeChannel: ReturnType<typeof supabase.channel> | null = null;

        const init = async () => {
            try {
                const { data: eventData, error: eventErr } = await supabase
                    .from("events").select("*").eq("tag", tag).single();

                if (eventErr || !eventData) throw new Error("This event could not be found.");
                if (eventData.event_format === "physical") throw new Error("This is an in-person event.");

                setEvent(eventData);

                activeChannel = supabase
                    .channel("join_event_updates")
                    .on("postgres_changes", {
                        event: "UPDATE", schema: "public", table: "events",
                        filter: `id=eq.${eventData.id}`,
                    }, (payload) => setEvent(payload.new as Event))
                    .subscribe();

                const { data: { user } } = await supabase.auth.getUser();
                let attendeeData: Attendee | null = null;

                if (token) {
                    const { data: guestData } = await supabase.from("attendees")
                        .select("*").eq("id", token).eq("event_id", eventData.id).single();
                    if (guestData) attendeeData = guestData as Attendee;
                }

                if (!attendeeData && user && user.id === eventData.created_by) {
                    setIsHost(true);
                    const { data: profileData } = await supabase.from("profiles")
                        .select("*").eq("id", user.id).single();
                    attendeeData = {
                        id: user.id,
                        first_name: profileData?.first_name || user.user_metadata?.first_name || "Host",
                        last_name: profileData?.last_name || user.user_metadata?.last_name || "",
                        email: user.email || "",
                        event_id: eventData.id,
                        check_in: true,
                    } as Attendee;
                }

                if (!attendeeData) throw new Error("We couldn't find your invitation. Please use the link from your email.");
                setAttendee(attendeeData);

                if (!attendeeData.check_in && token) {
                    await supabase.from("attendees")
                        .update({ check_in: true, check_in_time: new Date().toISOString() })
                        .eq("id", attendeeData.id);
                }

                const { data: existing } = await supabase.from("virtual_attendance")
                    .select("id").eq("event_id", eventData.id).eq("guest_id", attendeeData.id).single();
                if (!existing) {
                    await supabase.from("virtual_attendance").insert({
                        event_id: eventData.id, guest_id: attendeeData.id,
                        join_time: new Date().toISOString(),
                        last_heartbeat_time: new Date().toISOString(),
                        total_minutes_watched: 0,
                    });
                }
            } catch (err: unknown) {
                setError(err instanceof Error ? err.message : "Something went wrong.");
            } finally {
                setLoading(false);
            }
        };

        init();
        return () => {
            if (activeChannel) supabase.removeChannel(activeChannel);
            if (heartbeatInterval.current) clearInterval(heartbeatInterval.current);
        };
    }, [tag, token]);

    useEffect(() => {
        // If we have a token and the event is ready, redirect DIRECTLY to the meeting link
        if (attendee && event && !isBeforeStart && event.virtual_link) {
            window.location.href = event.virtual_link;
        }
    }, [attendee, event, isBeforeStart]);

    // Redundant loading check removed - consolidated below
    if (loading) {
        return (
            <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-white/20 mb-4" />
                <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/30">Syncing with Venue...</span>
            </div>
        );
    }

    if (error || !event || !attendee) {
        return (
            <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6 text-center">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-20 h-20 rounded-[32px] bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-10"
                >
                    <ShieldAlert className="w-10 h-10 text-red-400" />
                </motion.div>
                <h1 className="text-3xl font-black text-white mb-4 tracking-tight uppercase italic italic">Access <span className="text-red-500">Denied</span></h1>
                <p className="text-gray-500 font-bold max-w-sm mb-12 leading-relaxed text-sm uppercase tracking-wide">{error}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="px-10 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all border border-white/10"
                >
                    System Reboot
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 overflow-hidden selection:bg-blue-100">
            {/* Background elements */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/[0.03] blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500/[0.03] blur-[120px] rounded-full" />
            </div>

            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="relative w-full max-w-lg bg-white/80 backdrop-blur-3xl rounded-[48px] p-12 text-center border border-white shadow-[0_32px_128px_-16px_rgba(0,0,0,0.08)]"
            >
                <div className="flex items-center justify-center gap-3 mb-12">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-[12px] font-black text-gray-400 uppercase tracking-[0.4em] italic">EventFlow</span>
                </div>

                {isBeforeStart ? (
                    <div className="space-y-8">
                        <div className="relative inline-block">
                            <div className="absolute inset-0 bg-blue-500/10 blur-2xl rounded-full scale-150 animate-pulse" />
                            <div className="relative w-24 h-24 rounded-[40px] bg-white border border-gray-100 flex items-center justify-center mx-auto shadow-sm">
                                <Clock className="w-10 h-10 text-blue-500" />
                            </div>
                        </div>
                        <div className="space-y-4">
                            <p className="text-[11px] font-black text-blue-600 uppercase tracking-[0.3em]">Opening Doors Soon</p>
                            <h1 className="text-4xl font-black text-gray-900 tracking-tighter leading-none italic uppercase">{event.event_title}</h1>
                            <p className="text-gray-500 text-sm font-bold tracking-wide">{startTimeDisplay}</p>
                        </div>
                        <div className="bg-gray-50/50 border border-gray-100 rounded-3xl p-6">
                            <p className="text-gray-400 text-[11px] font-bold uppercase tracking-widest leading-relaxed">
                                You&apos;re early! This session opens 15 minutes before the start time. Hang tight, the venue is preparing for your arrival.
                            </p>
                        </div>
                    </div>
                ) : !link ? (
                    <div className="space-y-8">
                        <div className="w-24 h-24 rounded-[40px] bg-gray-50/50 border border-gray-100 flex items-center justify-center mx-auto mb-8">
                            <Video className="w-10 h-10 text-gray-200" />
                        </div>
                        <div className="space-y-4">
                            <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em]">Awaiting Uplink</p>
                            <h1 className="text-4xl font-black text-gray-900 tracking-tighter leading-none italic uppercase">{event.event_title}</h1>
                        </div>
                        <p className="text-gray-400 text-[11px] font-bold uppercase tracking-widest leading-relaxed">
                            The organizer hasn&apos;t added a meeting link yet. Check back closer to the event time.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        <div className="relative inline-block">
                            <div className="absolute inset-0 bg-blue-500/10 blur-2xl rounded-full scale-150 animate-pulse" />
                            <div className="relative w-24 h-24 rounded-[40px] bg-white border border-gray-100 flex items-center justify-center mx-auto text-4xl shadow-xl">
                                {meta.icon}
                            </div>
                        </div>
                        <div className="space-y-4">
                            <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em]">{meta.label} Session</p>
                            <h1 className="text-4xl font-black text-gray-900 tracking-tighter leading-none italic uppercase">{event.event_title}</h1>
                        </div>
                        
                        <div className="flex flex-col gap-4">
                            <button
                                onClick={() => {
                                    if (event?.virtual_link) {
                                        window.location.href = event.virtual_link;
                                    }
                                }}
                                className="group relative overflow-hidden w-full flex items-center justify-center gap-4 py-6 px-10 bg-gray-900 text-white rounded-[32px] font-black uppercase tracking-widest text-sm shadow-xl transition-all hover:scale-[1.02] active:scale-95"
                            >
                                <div className="absolute inset-0 bg-blue-600 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                                <span className="relative z-10">Enter Digital Venue</span>
                                <ChevronRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-all" />
                            </button>
                            <p className="text-gray-300 text-[10px] font-black uppercase tracking-widest font-bold">Encrypted Connection Established</p>
                        </div>
                    </div>
                )}

                <div className="mt-16 pt-10 border-t border-gray-100 flex items-center justify-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center text-xs font-black text-gray-400 italic">
                        {attendee.first_name.charAt(0)}
                    </div>
                    <div className="text-left">
                        <p className="text-[12px] font-black text-gray-900 tracking-tighter italic uppercase">{attendee.first_name} {attendee.last_name}</p>
                        <p className="text-[9px] font-black text-gray-300 uppercase tracking-[0.2em]">{isHost ? "Venue Controller" : "Authenticated Guest"}</p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

export default function JoinPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-white/30" />
            </div>
        }>
            <JoinInner />
        </Suspense>
    );
}
