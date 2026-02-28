import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function GET() {
    try {
        const cookieStore = await cookies();
        const allCookies = cookieStore.getAll();
        console.log("All Cookies Received at /api/auth/me:", allCookies.map(c => c.name));

        const supabaseToken = cookieStore.get('sb-access-token')?.value
            || cookieStore.get(`sb-${new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split('.')[0]}-auth-token`)?.value;

        console.log("Extracted Supabase Token:", supabaseToken ? "Found" : "Missing");

        if (!supabaseToken) {
            return NextResponse.json({ user: null }, { status: 401 });
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                global: {
                    headers: {
                        Authorization: `Bearer ${supabaseToken}`
                    }
                }
            }
        );
        const { data: { user }, error } = await supabase.auth.getUser();

        if (error || !user) {
            return NextResponse.json({ user: null }, { status: 401 });
        }

        return NextResponse.json({ user });
    } catch (error) {
        console.error("Auth check failed:", error);
        return NextResponse.json({ user: null }, { status: 500 });
    }
}
