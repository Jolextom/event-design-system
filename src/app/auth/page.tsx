"use client";

import { useState } from "react";
import { useAuth } from "@/app/context/AuthContext";


export default function AuthPage() {
    const { signIn, signUp, user, loading } = useAuth();
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess("");
        if (isSignUp) {
            const { error } = await signUp(email, password);
            if (error) setError(error.message);
            else setSuccess("Check your email to confirm your account.");
        } else {
            const { error } = await signIn(email, password);
            if (error) setError(error.message);
            else setSuccess("Logged in!");
        }
    };

    if (user) {
        // Redirect to a static dashboard or home page (customize as needed)
        if (typeof window !== 'undefined') {
            window.location.href = "/events/dashboard";
        }
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="bg-white p-8 rounded-3xl shadow-xl text-center space-y-4 border border-[var(--color-neutral-100)] max-w-md w-full">
                    <h2 className="text-3xl font-black text-[var(--color-primary-700)] tracking-tight mb-2">Welcome!</h2>
                    <p className="text-[var(--color-neutral-600)] text-base font-semibold">You are logged in.</p>
                    <div className="flex justify-center mt-6">
                        <span className="inline-block bg-[var(--color-primary-600)] text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-[var(--color-primary-100)]">Redirecting...</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--color-neutral-50)]">
            <form onSubmit={handleSubmit} className="bg-white p-10 rounded-3xl shadow-xl w-full max-w-md space-y-8 border border-[var(--color-neutral-100)]">
                <h2 className="text-3xl font-black text-center mb-2 text-[var(--color-primary-700)] tracking-tight">
                    {isSignUp ? "Create your account" : "Sign in to EventFlow"}
                </h2>
                {error && <div className="text-red-500 text-sm text-center font-bold">{error}</div>}
                {success && <div className="text-green-600 text-sm text-center font-bold">{success}</div>}
                <div className="space-y-2">
                    <label className="block text-xs font-black uppercase tracking-widest text-[var(--color-neutral-500)] mb-1">Email</label>
                    <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full border border-[var(--color-neutral-200)] rounded-xl px-4 py-3 font-bold text-[var(--color-neutral-900)] bg-[var(--color-neutral-0)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-100)] placeholder:text-[var(--color-neutral-300)]"
                        placeholder="you@email.com"
                        required
                    />
                </div>
                <div className="space-y-2">
                    <label className="block text-xs font-black uppercase tracking-widest text-[var(--color-neutral-500)] mb-1">Password</label>
                    <input
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full border border-[var(--color-neutral-200)] rounded-xl px-4 py-3 font-bold text-[var(--color-neutral-900)] bg-[var(--color-neutral-0)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-100)] placeholder:text-[var(--color-neutral-300)]"
                        placeholder="••••••••"
                        required
                    />
                </div>
                <button
                    type="submit"
                    className="w-full bg-[var(--color-primary-700)] text-white py-4 rounded-2xl font-black text-base shadow-lg shadow-[var(--color-primary-100)] hover:bg-[var(--color-primary-900)] transition-all uppercase tracking-widest"
                    disabled={loading}
                >
                    {loading ? "Loading..." : isSignUp ? "Sign Up" : "Sign In"}
                </button>
                <div className="text-center text-xs font-bold text-[var(--color-neutral-500)]">
                    {isSignUp ? (
                        <>
                            Already have an account?{' '}
                            <button type="button" className="text-[var(--color-primary-700)] hover:underline" onClick={() => setIsSignUp(false)}>
                                Sign In
                            </button>
                        </>
                    ) : (
                        <>
                            Don&apos;t have an account?{' '}
                            <button type="button" className="text-[var(--color-primary-700)] hover:underline" onClick={() => setIsSignUp(true)}>
                                Sign Up
                            </button>
                        </>
                    )}
                </div>
            </form>
        </div>
    );
}
