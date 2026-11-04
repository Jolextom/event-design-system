"use server";

import { createClient } from "@supabase/supabase-js";
import { adminClient } from "@/lib/apiV1";
import { rateLimit } from "@/lib/rateLimit";
import { deleteEvent, previewEventDelete, type EventDeletePreview } from "@/lib/eventDelete";

/**
 * Deleting an event from the dashboard.
 *
 * The browser sends only its login token. Who you are is worked out HERE from that token
 * (never from anything the page claims), and only the event's owner may continue; see
 * src/lib/eventDelete.ts. The privileged database client is used because the delete has to
 * clear rows that the owner's own browser session isn't allowed to touch.
 */

async function verifiedUserId(accessToken: unknown): Promise<string | null> {
    if (typeof accessToken !== "string" || accessToken.length < 10 || accessToken.length > 4000) return null;
    const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { data, error } = await anon.auth.getUser(accessToken);
    return error || !data?.user ? null : data.user.id;
}

export type PreviewDeleteResponse = { ok: true; preview: EventDeletePreview } | { ok: false; error: string };
export type DeleteResponse = { ok: true } | { ok: false; error: string };

const notLoggedIn = { ok: false as const, error: "Please log in again." };

export async function previewDeleteEventAction(input: { eventId: string; accessToken: string }): Promise<PreviewDeleteResponse> {
    if (!input || typeof input.eventId !== "string") return { ok: false, error: "Missing event." };
    const userId = await verifiedUserId(input.accessToken);
    if (!userId) return notLoggedIn;
    const r = await previewEventDelete(adminClient(), input.eventId, userId);
    return r.ok ? { ok: true, preview: r.preview } : { ok: false, error: r.error };
}

export async function deleteEventAction(input: { eventId: string; accessToken: string; confirmTitle?: string }): Promise<DeleteResponse> {
    if (!input || typeof input.eventId !== "string") return { ok: false, error: "Missing event." };
    const userId = await verifiedUserId(input.accessToken);
    if (!userId) return notLoggedIn;
    const rl = rateLimit(`delete-event:${userId}`, 10, 10 * 60 * 1000);
    if (!rl.ok) return { ok: false, error: `Too many attempts. Try again in ${rl.retryAfterSec}s.` };
    const r = await deleteEvent(adminClient(), {
        eventId: input.eventId,
        userId,
        confirmTitle: typeof input.confirmTitle === "string" ? input.confirmTitle : undefined,
    });
    return r.ok ? { ok: true } : { ok: false, error: r.error };
}
