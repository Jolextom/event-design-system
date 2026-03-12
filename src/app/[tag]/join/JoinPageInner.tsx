"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { ShieldAlert, Loader2, ExternalLink, Video, Clock, CheckCircle2 } from "lucide-react";
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

export default function JoinPageInner() {
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
    const heartbeatInterval = useRef<NodeJS.Timeout | null>(null);

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

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-white/30" />
            </div>
        );
    }

    if (error || !event || !attendee) {
        return (
            <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-8">
                    <ShieldAlert className="w-8 h-8 text-red-400" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-3 tracking-tight">Access Restricted</h1>
                <p className="text-gray-400 font-medium max-w-sm mb-10 leading-relaxed text-sm">{error}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="px-8 py-3.5 bg-white/10 hover:bg-white/15 text-white rounded-2xl text-[13px] font-bold tracking-tight transition-all border border-white/10"
                >
                    Try Again
                </button>
            </div>
        );
    }

    const link = event.virtual_link || "";
    const meta = getPlatformMeta(link);
    const platform = detectPlatform(link);

    let startTimeDisplay = "TBC";
    let startTime = new Date();
    if (event.start_date) {
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

    return (
        <div className={`min-h-screen bg-gradient-to-br ${meta.bg} bg-gray-950 flex flex-col items-center justify-center p-6`}
            style={{ backgroundColor: "#09090b" }}>

            {!isBeforeStart && platform.isYouTube && youtubeEmbedUrl && (
                <div className="fixed inset-0 z-0">
                    <iframe src={youtubeEmbedUrl} className="w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen />
                </div>
            )}

            <div className={`relative w-full max-w-md ring-1 ${meta.ring} bg-white/5 backdrop-blur-xl rounded-[32px] p-10 text-center border border-white/[0.08] shadow-2xl`}>

                <div className="flex items-center justify-center gap-2 mb-10">
                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[var(--color-primary-500)] to-[var(--color-primary-700)] flex items-center justify-center text-[10px]">✦</div>
                    <span className="text-[11px] font-bold text-white/40 uppercase tracking-[0.2em]">EventFlow</span>
                </div>

                {isBeforeStart && (
                    <>
                        <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-8">
                            <Clock className="w-8 h-8 text-white/40" />
                        </div>
                        <p className="text-[11px] font-bold text-white/40 uppercase tracking-widest mb-3">Opening Soon</p>
                        <h1 className="text-2xl font-bold text-white mb-3 tracking-tight">{event.event_title}</h1>
                        <p className="text-gray-400 text-sm font-medium mb-6">{startTimeDisplay}</p>
                        <p className="text-gray-500 text-xs leading-relaxed">You&apos;re early! This session opens 15 minutes before the start time.</p>
                    </>
                )}

                {!isBeforeStart && !link && (
                    <>
                        <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-8">
                            <Video className="w-8 h-8 text-white/30" />
                        </div>
                        <p className="text-[11px] font-bold text-white/40 uppercase tracking-widest mb-3">No Link Yet</p>
                        <h1 className="text-2xl font-bold text-white mb-3 tracking-tight">{event.event_title}</h1>
                        <p className="text-gray-500 text-sm leading-relaxed">The organizer hasn&apos;t added a meeting link yet. Check back closer to the event time.</p>
                    </>
                )}

                {!isBeforeStart && link && !joined && (
                    <>
                        <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-8 text-3xl">
                            {meta.icon}
                        </div>
                        <p className="text-[11px] font-bold text-white/40 uppercase tracking-widest mb-3">{meta.label}</p>
                        <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">{event.event_title}</h1>
                        <p className="text-gray-500 text-sm mb-10">{startTimeDisplay}</p>
                        <a
                            href={link}
                            target="_blank"
                            rel="noreferrer"
                            onClick={() => setJoined(true)}
                            className={`w-full flex items-center justify-center gap-3 py-4 px-8 ${meta.btn} text-white rounded-2xl font-bold tracking-tight shadow-xl ${meta.glow} transition-all hover:scale-[1.02] text-sm`}
                        >
                            <Video className="w-4 h-4" />
                            {isHost ? `Start on ${meta.label}` : `Join on ${meta.label}`}
                            <ExternalLink className="w-3.5 h-3.5 opacity-60" />
                        </a>
                        <p className="text-gray-600 text-xs mt-5">Opens in a new tab</p>
                    </>
                )}

                {!isBeforeStart && link && joined && (
                    <>
                        <div className="w-16 h-16 rounded-3xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-8">
                            <CheckCircle2 className="w-8 h-8 text-green-400" />
                        </div>
                        <p className="text-[11px] font-bold text-green-400/60 uppercase tracking-widest mb-3">You&apos;re In</p>
                        <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">{event.event_title}</h1>
                        <p className="text-gray-500 text-sm mb-10">The {meta.label} meeting opened in a new tab.</p>
                        <a
                            href={link}
                            target="_blank"
                            rel="noreferrer"
                            className="w-full flex items-center justify-center gap-3 py-4 px-8 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-bold tracking-tight transition-all text-sm border border-white/10"
                        >
                            <ExternalLink className="w-4 h-4" />
                            Rejoin {meta.label}
                        </a>
                    </>
                )}

                <div className="mt-10 pt-8 border-t border-white/5 flex items-center justify-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center text-[11px] font-bold text-white/50">
                        {attendee.first_name.charAt(0)}
                    </div>
                    <span className="text-[12px] text-white/30 font-medium">
                        {attendee.first_name} {attendee.last_name}
                        <span className="text-white/20 ml-1.5">· {isHost ? "Organizer" : "Guest"}</span>
                    </span>
                </div>
            </div>
        </div>
    );
}
