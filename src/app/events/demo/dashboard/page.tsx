"use client";



import { useAuth } from "@/app/context/AuthContext";
import DashboardGuard from "@/app/components/DashboardGuard";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";


export default function DemoDashboard() {
    const { user } = useAuth();
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchEvents = async () => {
            if (!user) return;
            setLoading(true);
            const { data, error } = await supabase
                .from("events")
                .select("id, event_title, tag, location, start_date, is_published")
                .eq("created_by", user.id)
                .order("start_date", { ascending: true });
            if (!error) setEvents(data || []);
            setLoading(false);
        };
        fetchEvents();
    }, [user]);

    return (
        <DashboardGuard>
            <div className="min-h-screen bg-[var(--color-neutral-50)] flex flex-col items-center py-16">
                <div className="w-full max-w-4xl space-y-10">
                    {/* User Profile Card */}
                    <div className="flex items-center gap-6 bg-white border border-[var(--color-neutral-100)] rounded-3xl shadow-lg px-8 py-6">
                        <div className="w-16 h-16 rounded-2xl bg-[var(--color-primary-100)] flex items-center justify-center text-2xl font-black text-[var(--color-primary-700)]">
                            {user?.email?.[0]?.toUpperCase() || "U"}
                        </div>
                        <div className="flex-1">
                            <div className="text-lg font-black text-[var(--color-primary-700)]">{user?.email || "Loading..."}</div>
                            <div className="text-xs text-[var(--color-neutral-400)] font-bold mt-1">Organizer</div>
                        </div>
                        <button className="bg-[var(--color-primary-700)] text-white px-6 py-2 rounded-xl font-black text-xs shadow hover:bg-[var(--color-primary-900)] transition-all uppercase tracking-widest">Sign Out</button>
                    </div>

                    {/* Event List */}
                    <div className="bg-white border border-[var(--color-neutral-100)] rounded-3xl shadow-lg p-8">
                        <h2 className="text-2xl font-black text-[var(--color-primary-700)] mb-6">Your Events</h2>
                        {loading ? (
                            <div className="text-center text-[var(--color-neutral-400)] font-bold py-12">Loading events...</div>
                        ) : events.length === 0 ? (
                            <div className="text-center text-[var(--color-neutral-400)] font-bold py-12">
                                You have no events yet. (Create event coming soon)
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {events.map(event => (
                                    <div key={event.id} className="flex items-center justify-between bg-[var(--color-neutral-50)] border border-[var(--color-neutral-100)] rounded-2xl px-6 py-5">
                                        <div className="flex flex-col gap-1">
                                            <div className="text-lg font-black text-[var(--color-primary-700)]">{event.event_title}</div>
                                            <div className="text-xs text-[var(--color-neutral-500)] font-bold">
                                                {event.start_date ? new Date(event.start_date).toLocaleDateString() : "No date"} &middot; {event.location}
                                            </div>
                                            <span className="inline-block mt-1 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-[var(--color-primary-50)] text-[var(--color-primary-700)]">
                                                {event.is_published ? "Published" : "Draft"}
                                            </span>
                                        </div>
                                        <a href={`/events/${event.tag}`} className="bg-[var(--color-primary-100)] text-[var(--color-primary-700)] px-6 py-2 rounded-xl font-black text-xs shadow hover:bg-[var(--color-primary-200)] transition-all uppercase tracking-widest">
                                            View
                                        </a>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </DashboardGuard>
    );
}
