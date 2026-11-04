import { supabase } from "@/lib/supabaseClient";

/**
 * The logged-in organiser's token, to send along with organiser-only server actions
 * (the server checks it and that the organiser owns the event). Empty string if logged out.
 */
export async function getAccessToken(): Promise<string> {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? "";
}
