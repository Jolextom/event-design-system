"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Search, Check, Loader2, AlertCircle, KeyRound, LogOut, Star, RefreshCw, Download, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useParams } from "next/navigation";
import Link from "next/link";
import { CollaboratorRegistryTable, CollaboratorAttendeeRow } from "../views/registry/CollaboratorRegistryTable";
import { ago, passTitleOf, toCsv, type PendingRow, type ReportSummary } from "@/lib/eventReport";

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
/** How often the open page checks for new registrations and payments. */
const REFRESH_MS = 30000;

export default function CollaboratePage() {
    const params = useParams();
    const tag = params?.tag as string;

    const [collaborator, setCollaborator] = useState<Collaborator | null>(null);
    const [accessCode, setAccessCode] = useState("");
    const [authLoading, setAuthLoading] = useState(true);
    const [authError, setAuthError] = useState("");

    const [eventTitle, setEventTitle] = useState("");
    const [attendees, setAttendees] = useState<CollaboratorAttendeeRow[]>([]);
    const [summary, setSummary] = useState<ReportSummary | null>(null);
    const [pending, setPending] = useState<PendingRow[] | null>(null);
    const [generatedAt, setGeneratedAt] = useState<string | null>(null);
    const [refreshProblem, setRefreshProblem] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [now, setNow] = useState(() => Date.now());
    const [tab, setTab] = useState<"registered" | "pending">("registered");
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [mineOnly, setMineOnly] = useState(false);
    const activeCode = useRef<string | null>(null);

    const clearSession = () => {
        localStorage.removeItem(`${STORAGE_KEY}_${tag}`);
        activeCode.current = null;
        setCollaborator(null);
        setAccessCode("");
        setAttendees([]);
        setSummary(null);
        setPending(null);
        setSearchQuery("");
        setMineOnly(false);
        setTab("registered");
    };

    /** Loads the list. `silent` = a background refresh: no spinner, and a hiccup keeps what's on screen. */
    const fetchRegistrants = useCallback(async (code: string, silent = false) => {
        if (silent) setRefreshing(true); else setLoading(true);
        if (!silent) setAuthError("");
        try {
            const res = await fetch(`/api/v1/events/${tag}/collaborator-registrants`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ access_code: code }),
            });
            const data = await res.json();

            if (!res.ok) {
                if (silent && res.status !== 401 && res.status !== 403) {
                    setRefreshProblem(true); // keep showing the last good list
                    return false;
                }
                if (silent) { // the code was revoked or changed while the page was open
                    clearSession();
                    setAuthError(data.error || "Your access has ended.");
                    return false;
                }
                setAuthError(data.error || "Invalid access code");
                return false;
            }

            const session: StoredSession = { collaborator: data.collaborator, accessCode: code, eventTag: tag };
            localStorage.setItem(`${STORAGE_KEY}_${tag}`, JSON.stringify(session));
            activeCode.current = code;

            setCollaborator(data.collaborator);
            setEventTitle(data.event.event_title);
            setAttendees(data.attendees);
            setSummary(data.summary ?? null);
            setPending(data.pending ?? null);
            setGeneratedAt(data.generatedAt ?? new Date().toISOString());
            setRefreshProblem(false);
            return true;
        } catch {
            if (silent) { setRefreshProblem(true); return false; }
            setAuthError("Couldn't reach the server. Check your connection and try again.");
            return false;
        } finally {
            setLoading(false);
            setAuthLoading(false);
            setRefreshing(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tag]);

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
    }, [tag, fetchRegistrants]);

    // Live: re-check every 30s while the page is open and visible, and as soon as the tab comes back into view.
    const loggedIn = !!collaborator;
    useEffect(() => {
        if (!loggedIn) return;
        const refresh = () => {
            if (document.visibilityState === "visible" && activeCode.current) fetchRegistrants(activeCode.current, true);
        };
        const refreshTimer = setInterval(refresh, REFRESH_MS);
        const clock = setInterval(() => setNow(Date.now()), 10000);
        document.addEventListener("visibilitychange", refresh);
        return () => {
            clearInterval(refreshTimer);
            clearInterval(clock);
            document.removeEventListener("visibilitychange", refresh);
        };
    }, [loggedIn, fetchRegistrants]);

    const handleLogin = async () => {
        if (!accessCode.trim()) {
            setAuthError("Please enter your access code");
            return;
        }
        setAuthLoading(true);
        await fetchRegistrants(accessCode.trim().toUpperCase());
    };

    const q = searchQuery.toLowerCase().trim();
    const filteredAttendees = attendees.filter((a) => {
        if (mineOnly && !a.isMine) return false;
        if (!q) return true;
        return a.first_name.toLowerCase().includes(q) || a.last_name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q);
    });
    const filteredPending = (pending ?? []).filter((p) => !q || p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q));
    const myReferralCount = attendees.filter((a) => a.isMine).length;
    const showReport = !!summary;

    const download = () => {
        const date = new Date().toISOString().slice(0, 10);
        const rows =
            tab === "pending"
                ? [["Name", "Email", "Ticket", "Status", "Started"], ...filteredPending.map((p) => [p.name, p.email, p.ticket, "Not paid yet", p.startedAt ?? ""])]
                : [
                    ["Name", "Email", "Ticket", "Status", "Registered"],
                    ...filteredAttendees.map((a) => [`${a.first_name} ${a.last_name}`.trim(), a.email, passTitleOf(a.pass), a.check_in ? "Checked in" : "Registered", a.created_at ?? ""]),
                ];
        const blob = new Blob(["﻿" + toCsv(rows)], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${tag}-${tab === "pending" ? "not-paid-yet" : "registered"}-${date}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

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
                        <h1 className="text-2xl font-black tracking-tight text-gray-900">Event guest list</h1>
                        <p className="text-sm text-gray-400 font-bold mt-2">
                            Enter your access code to see who has registered
                        </p>
                    </div>

                    <div className="bg-white rounded-[32px] p-8 shadow-xl shadow-gray-100/50 border border-gray-100 space-y-6">
                        <div>
                            <label htmlFor="access-code" className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">
                                Access Code
                            </label>
                            <input
                                id="access-code"
                                type="text"
                                autoCapitalize="characters"
                                autoComplete="off"
                                spellCheck={false}
                                maxLength={12}
                                value={accessCode}
                                onChange={(e) => setAccessCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                                placeholder="ACCESS CODE"
                                className="w-full text-center text-2xl font-black tracking-[0.25em] py-5 px-4 bg-gray-50 rounded-2xl border border-gray-100 text-gray-900 placeholder:text-gray-200 placeholder:text-base placeholder:tracking-widest focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)]/20 focus:border-[var(--brand-blue)]"
                            />
                        </div>

                        {authError && (
                            <div role="alert" className="flex items-center gap-2 text-red-500 text-xs font-bold bg-red-50 p-3 rounded-xl">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                {authError}
                            </div>
                        )}

                        <button
                            onClick={handleLogin}
                            disabled={authLoading || accessCode.length < 6}
                            className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white py-4 rounded-2xl text-sm font-black hover:bg-black transition-all shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {authLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <Check className="w-5 h-5" />
                                    View guest list
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ========== GUEST LIST (AUTHENTICATED) ==========
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
                            <div className="text-[10px] font-bold text-gray-400">{showReport ? "Live guest list" : "Collaborator"}</div>
                        </div>
                    </div>
                    <button
                        onClick={clearSession}
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
                    {showReport ? (
                        <div className="mt-2 flex items-center justify-center gap-3 text-xs font-bold text-gray-400" data-testid="updated">
                            <span className="inline-flex items-center gap-1.5">
                                <span className="relative flex h-2 w-2">
                                    <span className={cn("absolute inline-flex h-full w-full rounded-full opacity-60", refreshProblem ? "bg-amber-400" : "bg-green-400 animate-ping")} />
                                    <span className={cn("relative inline-flex h-2 w-2 rounded-full", refreshProblem ? "bg-amber-500" : "bg-green-500")} />
                                </span>
                                {refreshProblem ? "Couldn't refresh, showing the last update" : "Live"}
                                {generatedAt && <> · updated {ago(generatedAt, now) || "just now"}</>}
                            </span>
                            <button
                                onClick={() => activeCode.current && fetchRegistrants(activeCode.current, true)}
                                disabled={refreshing}
                                className="inline-flex items-center gap-1 text-gray-400 hover:text-gray-900 disabled:opacity-50"
                                aria-label="Refresh now"
                            >
                                <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin")} /> Refresh
                            </button>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-400 font-bold mt-1">
                            {collaborator.view_scope === "own_only"
                                ? `You've referred ${myReferralCount} guest${myReferralCount === 1 ? "" : "s"}`
                                : `${myReferralCount} of ${attendees.length} guests referred by you`}
                        </p>
                    )}
                </div>

                {summary && (
                    <div className="space-y-3" data-testid="summary">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {[
                                { k: "registered", label: "Registered", value: summary.registered },
                                { k: "paid", label: "Paid", value: summary.paid },
                                { k: "checked", label: "Checked in", value: summary.checkedIn },
                                { k: "pending", label: "Not paid yet", value: summary.notPaidYet, amber: true },
                            ].map((t) => (
                                <button
                                    key={t.k}
                                    type="button"
                                    onClick={() => t.k === "pending" && setTab("pending")}
                                    className={cn(
                                        "rounded-2xl border bg-white p-4 text-left shadow-sm",
                                        t.amber && t.value > 0 ? "border-amber-200" : "border-gray-100",
                                        t.k === "pending" ? "cursor-pointer hover:bg-amber-50/40" : "cursor-default"
                                    )}
                                >
                                    <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t.label}</div>
                                    <div className={cn("mt-1 text-3xl font-black tracking-tight", t.amber && t.value > 0 ? "text-amber-600" : "text-gray-900")} data-testid={`tile-${t.k}`}>{t.value}</div>
                                </button>
                            ))}
                        </div>
                        {summary.byTicket.length > 0 && (
                            <p className="text-center text-xs font-bold text-gray-400">
                                {summary.byTicket.map((b) => `${b.title}: ${b.count}`).join("  ·  ")}
                            </p>
                        )}
                    </div>
                )}

                {pending && (
                    <div className="flex gap-2 rounded-2xl bg-gray-100 p-1.5" role="tablist">
                        {([
                            ["registered", `Registered (${attendees.length})`],
                            ["pending", `Not paid yet (${pending.length})`],
                        ] as const).map(([k, label]) => (
                            <button
                                key={k}
                                role="tab"
                                aria-selected={tab === k}
                                onClick={() => setTab(k)}
                                className={cn("flex-1 rounded-xl px-4 py-2.5 text-xs font-black transition-all", tab === k ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900")}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                )}

                <div className="space-y-4">
                    <div className="relative">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                        <input
                            type="text"
                            placeholder="Search by name or email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-14 pr-6 py-4 bg-white rounded-2xl border border-gray-100 shadow-sm text-sm font-bold text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)]/20"
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {collaborator.view_scope === "full_highlighted" && myReferralCount > 0 && tab === "registered" && (
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
                        {showReport && (
                            <button
                                onClick={download}
                                className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black bg-white text-gray-600 hover:text-gray-900 hover:bg-gray-50 border border-gray-100"
                            >
                                <Download className="w-3.5 h-3.5" /> Download CSV
                            </button>
                        )}
                    </div>
                </div>

                {tab === "pending" && pending ? (
                    <div className="space-y-3" data-testid="pending-list">
                        {filteredPending.length === 0 ? (
                            <div className="text-center py-16 bg-white rounded-[32px] border border-dashed border-gray-200">
                                <Check className="w-10 h-10 text-green-300 mx-auto mb-4" />
                                <h4 className="text-sm font-black text-gray-900 mb-1">{q ? "No match" : "Everyone who started has paid"}</h4>
                                <p className="text-xs text-gray-400 font-bold">{q ? "Try a different search" : "Nobody is waiting on a payment right now."}</p>
                            </div>
                        ) : (
                            filteredPending.map((p) => (
                                <div key={p.id} className="p-5 rounded-[24px] border border-amber-100 bg-white flex items-center justify-between">
                                    <div>
                                        <h4 className="text-base font-black text-gray-900 tracking-tight">{p.name}</h4>
                                        <p className="text-[10px] font-bold text-gray-400 mt-0.5">
                                            {p.email} • {p.ticket}{p.startedAt ? ` • started ${ago(p.startedAt, now)}` : ""}
                                        </p>
                                    </div>
                                    <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-amber-700 bg-amber-50 px-3 py-1.5 rounded-full">
                                        <Clock className="w-3 h-3" /> Not paid yet
                                    </span>
                                </div>
                            ))
                        )}
                        <p className="text-center text-[11px] font-bold text-gray-400">
                            These people started registering but their payment hasn't gone through. A payment that completes moves them to Registered.
                        </p>
                    </div>
                ) : (
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
                )}
            </main>

            <footer className="bg-white border-t border-gray-100 py-4 sticky bottom-0">
                <div className="max-w-3xl mx-auto px-6 flex justify-between items-center">
                    <div className="text-xs font-bold text-gray-400">
                        {tab === "pending" && pending
                            ? `Showing ${filteredPending.length} of ${pending.length} not paid yet`
                            : `Showing ${filteredAttendees.length} of ${attendees.length} guests`}
                    </div>
                    <Link href={`/${tag}`} className="text-[10px] font-bold text-gray-400 hover:text-gray-900 transition-colors">
                        View public event page →
                    </Link>
                </div>
            </footer>
        </div>
    );
}
