"use client";

import React, { useState, useEffect } from "react";
import { Search, Check, Loader2, AlertCircle, KeyRound, LogOut, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { useParams } from "next/navigation";
import Link from "next/link";
import { CollaboratorRegistryTable, CollaboratorAttendeeRow } from "../views/registry/CollaboratorRegistryTable";

interface Collaborator {
    id: string;
    first_name: string;
    last_name: string;
    view_scope: "own_only" | "full_highlighted";
}

interface StoredSession {
    collaborator: Collaborator;
    accessCode: string;
    eventTag: string;
}

const STORAGE_KEY = "collaborator_session";

export default function CollaboratePage() {
    const params = useParams();
    const tag = params?.tag as string;

    const [collaborator, setCollaborator] = useState<Collaborator | null>(null);
    const [accessCode, setAccessCode] = useState("");
    const [authLoading, setAuthLoading] = useState(true);
    const [authError, setAuthError] = useState("");

    const [eventTitle, setEventTitle] = useState("");
    const [attendees, setAttendees] = useState<CollaboratorAttendeeRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [mineOnly, setMineOnly] = useState(false);

    // Restore session on mount
    useEffect(() => {
        const restoreSession = async () => {
            const stored = localStorage.getItem(`${STORAGE_KEY}_${tag}`);
            if (stored) {
                try {
                    const session: StoredSession = JSON.parse(stored);
                    setCollaborator(session.collaborator);
                    await fetchRegistrants(session.accessCode);
                } catch {
                    localStorage.removeItem(`${STORAGE_KEY}_${tag}`);
                }
            }
            setAuthLoading(false);
        };
        if (tag) restoreSession();
    }, [tag]);

    const fetchRegistrants = async (code: string) => {
        setLoading(true);
        setAuthError("");

        const res = await fetch(`/api/v1/events/${tag}/collaborator-registrants`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ access_code: code }),
        });
        const data = await res.json();

        if (!res.ok) {
            setAuthError(data.error || "Invalid access code");
            setLoading(false);
            setAuthLoading(false);
            return false;
        }

        const session: StoredSession = {
            collaborator: data.collaborator,
            accessCode: code,
            eventTag: tag,
        };
        localStorage.setItem(`${STORAGE_KEY}_${tag}`, JSON.stringify(session));

        setCollaborator(data.collaborator);
        setEventTitle(data.event.event_title);
        setAttendees(data.attendees);
        setLoading(false);
        setAuthLoading(false);
        return true;
    };

    const handleLogin = async () => {
        if (!accessCode.trim()) {
            setAuthError("Please enter your access code");
            return;
        }
        setAuthLoading(true);
        await fetchRegistrants(accessCode.trim());
    };

    const handleLogout = () => {
        localStorage.removeItem(`${STORAGE_KEY}_${tag}`);
        setCollaborator(null);
        setAccessCode("");
        setAttendees([]);
        setSearchQuery("");
        setMineOnly(false);
    };

    const filteredAttendees = attendees.filter((a) => {
        if (mineOnly && !a.isMine) return false;
        const query = searchQuery.toLowerCase().trim();
        if (!query) return true;
        return (
            a.first_name.toLowerCase().includes(query) ||
            a.last_name.toLowerCase().includes(query) ||
            a.email.toLowerCase().includes(query)
        );
    });

    const myReferralCount = attendees.filter((a) => a.isMine).length;

    // Show loading while checking localStorage
    if (authLoading && !collaborator) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
            </div>
        );
    }

    // ========== LOGIN SCREEN ==========
    if (!collaborator) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-6">
                <div className="w-full max-w-md">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-[var(--brand-blue)] rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-100">
                            <KeyRound className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-2xl font-black tracking-tight text-gray-900">Collaborator Login</h1>
                        <p className="text-sm text-gray-400 font-bold mt-2">
                            Enter your access code to view registrants
                        </p>
                    </div>

                    <div className="bg-white rounded-[32px] p-8 shadow-xl shadow-gray-100/50 border border-gray-100 space-y-6">
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">
                                Access Code
                            </label>
                            <input
                                type="text"
                                inputMode="numeric"
                                maxLength={6}
                                value={accessCode}
                                onChange={(e) => setAccessCode(e.target.value.replace(/\D/g, ""))}
                                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                                placeholder="000000"
                                className="w-full text-center text-3xl font-black tracking-[0.3em] py-5 px-4 bg-gray-50 rounded-2xl border border-gray-100 text-gray-900 placeholder:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)] focus:border-transparent transition-all"
                            />
                        </div>

                        {authError && (
                            <div className="flex items-center gap-2 text-red-500 text-xs font-bold bg-red-50 p-3 rounded-xl">
                                <AlertCircle className="w-4 h-4" />
                                {authError}
                            </div>
                        )}

                        <button
                            onClick={handleLogin}
                            disabled={authLoading || accessCode.length < 6}
                            className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white py-4 rounded-2xl text-sm font-black hover:bg-black transition-all shadow-lg shadow-gray-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                        >
                            {authLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <Check className="w-5 h-5" />
                                    View Registrants
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ========== REGISTRANT VIEW (AUTHENTICATED) ==========
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
            <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-50">
                <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[var(--brand-blue)] rounded-xl flex items-center justify-center text-[10px] font-black text-white uppercase">
                            {collaborator.first_name.charAt(0)}{collaborator.last_name.charAt(0)}
                        </div>
                        <div>
                            <div className="text-sm font-black text-gray-900">{collaborator.first_name} {collaborator.last_name}</div>
                            <div className="text-[10px] font-bold text-gray-400">Collaborator</div>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 text-gray-400 hover:text-red-500 transition-colors text-xs font-bold"
                    >
                        <LogOut className="w-4 h-4" />
                        Log Out
                    </button>
                </div>
            </header>

            <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-8 space-y-6">
                <div className="text-center">
                    <h1 className="text-2xl font-black tracking-tight text-gray-900">{eventTitle || "Loading..."}</h1>
                    <p className="text-sm text-gray-400 font-bold mt-1">
                        {collaborator.view_scope === "own_only"
                            ? `You've referred ${myReferralCount} guest${myReferralCount === 1 ? "" : "s"}`
                            : `${myReferralCount} of ${attendees.length} guests referred by you`}
                    </p>
                </div>

                <div className="space-y-4">
                    <div className="relative">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                        <input
                            type="text"
                            placeholder="Search by name or email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-14 pr-6 py-4 bg-white rounded-2xl border border-gray-100 shadow-sm text-sm font-bold text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)] focus:border-transparent transition-all"
                        />
                    </div>

                    {collaborator.view_scope === "full_highlighted" && (
                        <button
                            onClick={() => setMineOnly((v) => !v)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all",
                                mineOnly
                                    ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                                    : "bg-white text-gray-500 hover:text-gray-900 hover:bg-gray-50 border border-gray-100"
                            )}
                        >
                            <Star className="w-3.5 h-3.5" /> My referrals only
                        </button>
                    )}
                </div>

                <CollaboratorRegistryTable
                    attendees={filteredAttendees}
                    loading={loading}
                    emptyMessage={
                        searchQuery
                            ? "Try a different search"
                            : collaborator.view_scope === "own_only"
                                ? "No one has registered through your link yet"
                                : "No registered guests yet"
                    }
                />
            </main>

            <footer className="bg-white border-t border-gray-100 py-4 sticky bottom-0">
                <div className="max-w-3xl mx-auto px-6 flex justify-between items-center">
                    <div className="text-xs font-bold text-gray-400">
                        Showing {filteredAttendees.length} of {attendees.length} guests
                    </div>
                    <Link href={`/${tag}`} className="text-[10px] font-bold text-gray-400 hover:text-gray-900 transition-colors">
                        View public event page →
                    </Link>
                </div>
            </footer>
        </div>
    );
}
