"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

interface AuthContextType {
    user: any;
    loading: boolean;
    signUp: (email: string, password: string) => Promise<any>;
    signIn: (email: string, password: string) => Promise<any>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const session = supabase.auth.getSession().then(({ data }) => {
            setUser(data.session?.user ?? null);
            setLoading(false);
        });
        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });
        return () => {
            listener.subscription.unsubscribe();
        };
    }, []);

    const signUp = async (email: string, password: string) => {
        setLoading(true);
        const { data, error } = await supabase.auth.signUp({ email, password });
        setLoading(false);
        return { data, error };
    };

    const signIn = async (email: string, password: string) => {
        setLoading(true);
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        setLoading(false);
        return { data, error };
    };

    const signOut = async () => {
        setLoading(true);
        await supabase.auth.signOut();
        setLoading(false);
    };

    return (
        <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used within AuthProvider");
    return context;
}
