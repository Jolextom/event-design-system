"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowLeft, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";
import DashboardGuard from "@/app/components/DashboardGuard";
import { Input } from "@/app/components/ui/Input";
import { supabase } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";
import { checkNewPassword, passwordStrength, MIN_PASSWORD_LENGTH } from "@/lib/passwordRules";

const METER = ["bg-red-400", "bg-amber-400", "bg-lime-500", "bg-green-600"];

export default function ChangePasswordPage() {
    const { user } = useAuth();
    const [current, setCurrent] = useState("");
    const [next, setNext] = useState("");
    const [confirm, setConfirm] = useState("");
    const [show, setShow] = useState(false);
    const [signOutOthers, setSignOutOthers] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState<{ others: boolean } | null>(null);

    // An old error shouldn't linger while the person retypes.
    useEffect(() => { setError(null); }, [current, next, confirm]);

    const check = useMemo(() => checkNewPassword({ current, next, confirm, email: user?.email }), [current, next, confirm, user?.email]);
    const strength = useMemo(() => passwordStrength(next), [next]);
    const fieldType = show ? "text" : "password";

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!check.ok || !user?.email || busy) return;
        setBusy(true);
        setError(null);
        setDone(null);
        try {
            // 1. Prove it's really you: someone on an unlocked laptop shouldn't be able to change it.
            const { error: signInErr } = await supabase.auth.signInWithPassword({ email: user.email, password: current });
            if (signInErr) {
                setError("Your current password isn't right.");
                return;
            }
            // 2. Set the new one.
            const { error: updateErr } = await supabase.auth.updateUser({ password: next });
            if (updateErr) {
                setError(updateErr.message || "Couldn't change the password. Please try again.");
                return;
            }
            // 3. Optionally log out every other device (this one stays signed in).
            let others = false;
            if (signOutOthers) {
                const { error: outErr } = await supabase.auth.signOut({ scope: "others" });
                others = !outErr;
            }
            setCurrent("");
            setNext("");
            setConfirm("");
            setDone({ others });
        } catch {
            setError("Something went wrong. Please check your connection and try again.");
        } finally {
            setBusy(false);
        }
    };

    return (
        <DashboardGuard>
            <div className="min-h-screen bg-[var(--color-neutral-50)] flex flex-col items-center py-16 px-4">
                <div className="w-full max-w-lg space-y-6">
                    <Link href="/events/dashboard" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[var(--color-neutral-500)] hover:text-[var(--color-neutral-900)]">
                        <ArrowLeft className="h-4 w-4" /> Dashboard
                    </Link>

                    <form onSubmit={submit} className="bg-white border border-[var(--color-neutral-100)] rounded-3xl shadow-lg p-8 space-y-6">
                        <div>
                            <h1 className="text-2xl font-black text-[var(--color-primary-700)]">Change password</h1>
                            <p className="mt-1 text-sm font-bold text-[var(--color-neutral-400)]">{user?.email}</p>
                        </div>

                        {done && (
                            <div role="status" className="flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-bold text-green-800">
                                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                                <span>
                                    Password changed.{" "}
                                    {done.others
                                        ? "You were signed out of every other device."
                                        : signOutOthers
                                            ? "We couldn't sign out your other devices. Sign out and in again to be sure."
                                            : "Other devices stay signed in."}
                                </span>
                            </div>
                        )}
                        {error && (
                            <div role="alert" className="flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 p-4">
                                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                                <p className="text-sm font-bold text-red-600">{error}</p>
                            </div>
                        )}

                        <Input id="current-password" label="Current password" type={fieldType} autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />

                        <div className="space-y-2">
                            <Input
                                id="new-password"
                                label="New password"
                                type={fieldType}
                                autoComplete="new-password"
                                hint={`At least ${MIN_PASSWORD_LENGTH} characters. A few unrelated words works well.`}
                                value={next}
                                onChange={(e) => setNext(e.target.value)}
                            />
                            {next.length > 0 && (
                                <div className="flex items-center gap-3" aria-live="polite">
                                    <div className="flex flex-1 gap-1">
                                        {[0, 1, 2, 3].map((i) => (
                                            <span key={i} className={cn("h-1.5 flex-1 rounded-full", i <= strength.score ? METER[strength.score] : "bg-gray-200")} />
                                        ))}
                                    </div>
                                    <span data-testid="strength" className="text-[11px] font-black uppercase tracking-widest text-[var(--color-neutral-500)]">{strength.label}</span>
                                </div>
                            )}
                        </div>

                        <Input id="confirm-password" label="Confirm new password" type={fieldType} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />

                        {check.problems.length > 0 && (
                            <ul className="space-y-1 text-sm font-bold text-red-600" aria-label="Password problems">
                                {check.problems.map((p) => <li key={p}>{p}</li>)}
                            </ul>
                        )}

                        <label className="flex cursor-pointer items-center gap-3 text-sm font-bold text-[var(--color-neutral-700)]">
                            <input type="checkbox" className="h-4 w-4" checked={show} onChange={(e) => setShow(e.target.checked)} /> Show passwords
                        </label>
                        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border-2 border-gray-100 p-4 text-sm hover:border-gray-200">
                            <input type="checkbox" className="mt-0.5 h-4 w-4" checked={signOutOthers} onChange={(e) => setSignOutOthers(e.target.checked)} />
                            <span>
                                <span className="block font-black text-gray-900">Sign out of all other devices</span>
                                <span className="mt-0.5 block text-xs font-bold text-gray-500">Recommended. Anyone who was signed in with the old password is logged out.</span>
                            </span>
                        </label>

                        <button
                            type="submit"
                            disabled={!check.ok || busy}
                            className="w-full rounded-2xl bg-[var(--color-primary-700)] py-4 text-base font-black uppercase tracking-widest text-white shadow-lg shadow-[var(--color-primary-100)] transition-all hover:bg-[var(--color-primary-900)] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {busy ? "Changing…" : "Change password"}
                        </button>
                    </form>
                </div>
            </div>
        </DashboardGuard>
    );
}
