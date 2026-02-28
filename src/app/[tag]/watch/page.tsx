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
    MessageSquare,
    Zap,
    Heart,
    ChevronRight,
    Play,
    Share2,
    Calendar,
    Clock,
    CheckCircle2
} from "lucide-react";
import type { Event, Attendee } from "../../events/[tag]/types";

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

    // Platform state
    const [platform, setPlatform] = useState<{ isYouTube: boolean, isDaily: boolean, isExternal: boolean }>({ isYouTube: false, isDaily: false, isExternal: false });

    // Video SDK State
    const videoContainerRef = useRef<HTMLDivElement>(null);
    const [videoActive, setVideoActive] = useState(false);
    const [meetingStatus, setMeetingStatus] = useState<number | null>(null);

    // Heartbeat tracking
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
                // 1. Fetch Event First (so we know who the host is supposed to be)
                const { data: eventData, error: eventErr } = await supabase
                    .from("events")
                    .select("*")
                    .eq("tag", tag)
                    .single();

                if (eventErr || !eventData) throw new Error("This event could not be found.");
                if (eventData.event_format === 'physical') throw new Error("This is an in-person event.");

                setEvent(eventData);

                // Update platform flags safely
                const link = String(eventData.virtual_link || "");
                const isYouTube = link.includes("youtube.com") || link.includes("youtu.be");
                const isDaily = link.includes("daily.co");
                setPlatform({
                    isYouTube,
                    isDaily,
                    isExternal: !isYouTube && !isDaily && link.length > 0
                });

                // 2. Real-time Subscription (WOW Feature)
                activeChannel = supabase
                    .channel('event_updates')
                    .on('postgres_changes', {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'events',
                        filter: `id=eq.${eventData.id}`
                    }, (payload) => {
                        console.log('Event updated in real-time:', payload.new);
                        setEvent(payload.new as Event);
                        const newLink = String(payload.new.virtual_link || "");
                        const isYouTube = newLink.includes("youtube.com") || newLink.includes("youtu.be");
                        const isDaily = newLink.includes("daily.co");
                        setPlatform({
                            isYouTube,
                            isDaily,
                            isExternal: !isYouTube && !isDaily && newLink.length > 0
                        });

                        if (payload.new.virtual_link !== eventData.virtual_link) {
                            setVideoActive(false);
                        }
                    })
                    .subscribe();

                // 3. Auth Priority Logic: Attendee Token takes precedence over Host Session
                // This allows owners to test as an attendee if they have a link.
                const { data: { user } } = await supabase.auth.getUser();
                let attendeeData: any = null;
                let identifiedAsHost = false;

                if (token) {
                    // CHECK ATTENDEE PATH
                    const { data: guestData } = await supabase
                        .from("attendees")
                        .select('*')
                        .eq("id", token)
                        .eq("event_id", eventData.id)
                        .single();

                    if (guestData) {
                        attendeeData = guestData;
                        console.log("Venue Auth: Identified as Attendee via Token");
                    }
                }

                if (!attendeeData && user) {
                    // CHECK HOST PATH (Only if no attendee token or token was invalid)
                    if (user.id === eventData.created_by) {
                        identifiedAsHost = true;
                        setIsHost(true);

                        const { data: profileData } = await supabase
                            .from('profiles')
                            .select('*')
                            .eq('id', user.id)
                            .single();

                        attendeeData = {
                            id: user.id,
                            first_name: profileData?.first_name || user.user_metadata?.first_name || user.user_metadata?.full_name?.split(' ')[0] || "Event",
                            last_name: profileData?.last_name || user.user_metadata?.last_name || user.user_metadata?.full_name?.split(' ')[1] || "Organizer",
                            email: user.email,
                            event_id: eventData.id,
                            check_in: true
                        };
                        console.log("Venue Auth: Identified as Host via Session");
                    }
                }

                if (!attendeeData) {
                    throw new Error("We couldn't find your invitation. Please check your email for the correct Magic Link.");
                }

                setAttendee(attendeeData);

                // 4. Check-in and Heartbeat (Guests Only)
                if (!attendeeData.check_in && !identifiedAsHost) {
                    await supabase
                        .from("attendees")
                        .update({ check_in: true, check_in_time: new Date().toISOString() })
                        .eq("id", attendeeData.id);
                }

                // Initialize Attendance
                const { data: existingAttendance } = await supabase
                    .from("virtual_attendance")
                    .select("id")
                    .eq("event_id", eventData.id)
                    .eq("guest_id", attendeeData.id)
                    .single();

                if (!existingAttendance) {
                    await supabase
                        .from("virtual_attendance")
                        .insert({
                            event_id: eventData.id,
                            guest_id: attendeeData.id,
                            join_time: new Date().toISOString(),
                            last_heartbeat_time: new Date().toISOString(),
                            total_minutes_watched: 0
                        });
                }

                // FIXME: Disabled heartbeat temporary per user request
                // startHeartbeat(supabase, eventData.id, attendeeData.id);

            } catch (err: any) {
                console.error("Venue Error:", err);
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

    const startHeartbeat = (supabase: any, eventId: string, guestId: string) => {
        heartbeatInterval.current = setInterval(async () => {
            if (document.visibilityState === 'visible') {
                try {
                    const { data: current } = await supabase
                        .from("virtual_attendance")
                        .select("total_minutes_watched")
                        .eq("event_id", eventId)
                        .eq("guest_id", guestId)
                        .single();

                    if (current) {
                        await supabase
                            .from("virtual_attendance")
                            .update({
                                last_heartbeat_time: new Date().toISOString(),
                                total_minutes_watched: (current.total_minutes_watched || 0) + 1
                            })
                            .eq("event_id", eventId)
                            .eq("guest_id", guestId);
                    }
                } catch (e) {
                    console.error("Heartbeat failed", e);
                }
            }
        }, 60000);
    };

    const initDailyClient = async (meetingUrl: string) => {
        console.log("initDailyClient called with:", { meetingUrl, videoActive, attendee: attendee?.id });
        if (!meetingUrl || !attendee || videoActive) {
            console.log("initDailyClient bailed early");
            return;
        }

        try {
            console.log("Venue Logic: Generating Secure Daily Token...");
            const roomName = meetingUrl.split('/').pop() || "";
            const tokenRes = await fetch('/api/daily/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    roomName: roomName,
                    isOwner: isHost,
                    userName: `${attendee.first_name} ${attendee.last_name}`,
                    userId: attendee.id
                })
            });
            console.log("Venue Logic: Requesting token with isOwner =", isHost);
            const { token, error: tokenError } = await tokenRes.json();

            console.log("Token response received:", { hasToken: !!token, error: tokenError });

            if (tokenError || !token) throw new Error(tokenError || "Failed to generate meeting token.");

            console.log("Dynamically importing @daily-co/daily-js...");
            const DailyIframe = (await import("@daily-co/daily-js")).default;
            console.log("Daily SDK loaded successfully.");

            if (videoContainerRef.current) {
                console.log("Creating Daily frame attached to:", videoContainerRef.current);
                const callFrame = DailyIframe.createFrame(videoContainerRef.current, {
                    iframeStyle: {
                        width: '100%',
                        height: '100%',
                        border: '0',
                        borderRadius: '0px'
                    },
                    showLeaveButton: true,
                    showFullscreenButton: true
                });

                // Set the user name in the call
                callFrame.setUserName(`${attendee.first_name} ${attendee.last_name}`);

                // 1. Tell React to stop showing the "Connecting..." spinner
                // IMPORTANT: We must do this *before* joining so the container doesn't have `display: none` or get obscured, 
                // otherwise Daily.co iframe might refuse to mount or calculate zero height.
                setVideoActive(true);

                // 2. Add connection listeners
                callFrame.on('joined-meeting', () => {
                    console.log("Daily SDK 'joined-meeting' event fired.");
                });

                callFrame.on('left-meeting', () => {
                    console.log("Daily SDK 'left-meeting' event fired.");
                    setMeetingStatus(3); // Ended
                });

                callFrame.on('error', (e) => {
                    console.error("Daily SDK Error:", e);
                    setError("Video encountered an error. Please refresh.");
                });

                // 3. Trigger the join
                console.log("Joining Daily call with token:", { hasToken: !!token });
                await callFrame.join({
                    url: meetingUrl,
                    token: token
                });
                console.log("Successfully joined Daily call.");

            } else {
                console.error("videoContainerRef.current is null! Daily Iframe cannot mount.");
                setError("Application Error: Video container is missing.");
            }

        } catch (err: any) {
            console.error("Venue Setup Exception Block Caught:", err);
            setError(`Venue Setup Error: ${err.message}`);
        }
    };

    useEffect(() => {
        if (event?.virtual_link && platform.isDaily && !videoActive && !loading && attendee) {
            initDailyClient(event.virtual_link);
        }
    }, [event?.virtual_link, platform.isDaily, loading, videoActive, attendee, isHost]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center text-gray-900">
                <Loader2 className="w-10 h-10 animate-spin mb-6 text-[var(--color-primary-500)]" />
                <div className="flex flex-col items-center gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-400">Welcome</span>
                    <h2 className="text-base font-bold text-gray-900 tracking-tight">Opening the Venue...</h2>
                </div>
            </div>
        );
    }

    if (error || !event || !attendee) {
        return (
            <div className="min-h-screen bg-[var(--color-neutral-50)] flex flex-col items-center justify-center p-6 text-center text-[var(--color-neutral-900)]">
                <ShieldAlert className="w-12 h-12 text-red-600 mb-8" />
                <h1 className="text-3xl font-bold mb-4 tracking-tight">Access Restricted</h1>
                <p className="text-[var(--color-neutral-500)] font-medium max-w-sm mb-10 leading-relaxed">{error}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="px-10 py-4 bg-[var(--color-neutral-900)] text-white rounded-2xl text-[13px] font-bold tracking-tight shadow-xl hover:scale-[1.02] transition-all"
                >
                    Try Again
                </button>
            </div>
        );
    }

    // Meeting states logic
    const now = new Date();

    // Improved Date/Time parsing for sidebar display
    let startTime = new Date();
    let startTimeDisplay = "Not set";

    if (event.start_date) {
        const timeStr = event.start_time ? `T${event.start_time}` : "T00:00:00";
        startTime = new Date(`${event.start_date}${timeStr}`);
        startTimeDisplay = startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    const isBeforeStart = !isHost && now < new Date(startTime.getTime() - 15 * 60000);
    const isMeetingEnded = meetingStatus === 3;

    let embedUrl = event.virtual_link || "";
    if (platform.isYouTube && embedUrl) {
        const videoId = embedUrl.split('v=')[1]?.split('&')[0] || embedUrl.split('youtu.be/')[1]?.split('?')[0];
        if (videoId) embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    }

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col font-sans overflow-x-hidden">
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
                            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-widest">Organizer Control</span>
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
                <div className="flex-1 flex flex-col min-w-0 min-h-[450px] md:min-h-[600px] lg:min-h-0 relative">
                    <div className="w-full flex-1 bg-black rounded-2xl overflow-hidden border border-gray-200 shadow-sm relative">

                        {isBeforeStart && !videoActive && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 z-[70] text-center p-12">
                                <div className="w-20 h-20 rounded-[32px] bg-white border border-gray-100 shadow-sm flex items-center justify-center mb-8">
                                    <Clock className="w-10 h-10 text-gray-400" />
                                </div>
                                <h2 className="text-2xl font-bold mb-3 tracking-tight text-gray-900">Opening Soon</h2>
                                <p className="text-gray-500 max-w-sm font-medium leading-relaxed">
                                    The session hasn't started yet. Doors open 15 minutes before the start time.
                                </p>
                            </div>
                        )}

                        {isMeetingEnded && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 z-[70] text-center p-12">
                                <CheckCircle2 className="w-16 h-16 text-green-500 mb-8" />
                                <h2 className="text-2xl font-bold mb-3 tracking-tight text-gray-900">Session Concluded</h2>
                                <p className="text-gray-500 max-w-sm font-medium leading-relaxed mb-8">
                                    Thank you for attending!
                                </p>
                                <button
                                    onClick={() => window.location.reload()}
                                    className="px-8 py-4 bg-[var(--color-primary-600)] hover:bg-[var(--color-primary-500)] text-white rounded-xl font-bold tracking-tight shadow-xl shadow-[var(--color-primary-600)]/10 transition-all font-sans"
                                >
                                    Rejoin Meeting
                                </button>
                            </div>
                        )}

                        {platform.isExternal && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 z-[70] text-center p-12">
                                <div className="w-20 h-20 rounded-[32px] bg-blue-50 flex items-center justify-center mb-8 border border-blue-100">
                                    <ExternalLink className="w-10 h-10 text-blue-500" />
                                </div>
                                <h2 className="text-2xl font-bold mb-3 tracking-tight text-gray-900">External Meeting</h2>
                                <p className="text-gray-500 max-w-sm font-medium leading-relaxed mb-8">
                                    This event is hosted on an external platform. Click below to join the meeting in a new tab.
                                </p>
                                <a
                                    href={embedUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={() => setVideoActive(true)}
                                    className="px-8 py-4 bg-[var(--color-primary-500)] hover:bg-[var(--color-primary-600)] text-white rounded-xl font-bold tracking-tight shadow-lg shadow-[var(--color-primary-500)]/20 transition-all text-sm"
                                >
                                    Join External Meeting
                                </a>
                            </div>
                        )}

                        <div className="absolute inset-0" ref={videoContainerRef}>
                            {platform.isYouTube && embedUrl && (
                                <iframe
                                    key={embedUrl}
                                    src={embedUrl}
                                    className="w-full h-full border-0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                />
                            )}
                        </div>

                        {!videoActive && platform.isDaily && !isBeforeStart && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 z-[60]">
                                <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary-500)] mb-4" />
                                <p className="text-sm font-bold text-gray-500">Opening Venue...</p>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-between mt-6 px-2 shrink-0">
                        <div className="flex flex-col">
                            <h2 className="text-xl font-bold tracking-tight text-gray-900 mb-1">{event.event_title}</h2>
                            <div className="flex items-center gap-3 text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                                <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Active Venue</span>
                                <span className="w-1 h-1 rounded-full bg-gray-300" />
                                <span className="text-[var(--color-primary-500)]">Live Experience</span>
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

                {/* Right Sidebar - Professional Tabs */}
                <div className="w-full lg:w-[420px] shrink-0 flex flex-col h-full min-h-[500px]">
                    <div className="flex-1 bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col overflow-hidden">
                        <div className="flex border-b border-gray-100">
                            <button className="flex-1 py-4 text-[11px] font-bold uppercase tracking-widest text-[#000] border-b-2 border-gray-900">
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
                                    dangerouslySetInnerHTML={{ __html: event.description || "No description provided for this event." }}
                                />
                            </div>

                            <div className="space-y-4 pt-6 border-t border-gray-50">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-500 font-medium">Platform</span>
                                    <span className="font-bold text-gray-900 uppercase text-[10px] tracking-widest bg-gray-100 px-2 py-1 rounded-md">
                                        {platform.isDaily ? "Premium Native" : platform.isYouTube ? "YouTube Stream" : "External"}
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
                                    Please be respectful to other attendees. Disruptive behavior may result in removal by the host.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
