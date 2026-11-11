"use server";

import { adminClient } from "@/lib/apiV1";
import { checkEventOwner, verifiedUser, verifiedUserId } from "@/lib/authz";
import { rateLimit } from "@/lib/rateLimit";
import { sendConfirmationEmail } from "@/lib/email";
import { resolveEventSender } from "@/lib/eventEmail";
import { platformFrom } from "@/lib/platformEmail";
import { explainEmailError } from "@/lib/emailTestHelp";
import { deleteEvent, previewEventDelete, type EventDeletePreview } from "@/lib/eventDelete";

/**
 * Deleting an event from the dashboard.
 *
 * The browser sends only its login token. Who you are is worked out HERE from that token
 * (never from anything the page claims), and only the event's owner may continue; see
 * src/lib/eventDelete.ts. The privileged database client is used because the delete has to
 * clear rows that the owner's own browser session isn't allowed to touch.
 */

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

export type TestEmailResponse = { ok: true; to: string; from: string } | { ok: false; error: string };

/**
 * "Send test email": a sample confirmation email, sent through the same sender setup real registrations use, to the
 * LOGGED-IN organiser's own address only (never an address the page supplies, so it can't be used to email strangers).
 * It reads the event but writes nothing: no order, guest or delivery record. Safe to use on a live event.
 */
export async function sendTestEmailAction(input: { accessToken: string; eventId?: string | null }): Promise<TestEmailResponse> {
    const user = await verifiedUser(input?.accessToken);
    if (!user) return { ok: false, error: "Please log in again." };
    if (!user.email) return { ok: false, error: "Your account has no email address to send the test to." };
    const rl = rateLimit(`test-email:${user.id}`, 5, 10 * 60 * 1000);
    if (!rl.ok) return { ok: false, error: `Too many test emails. Try again in ${rl.retryAfterSec}s.` };

    let event: { tag?: string | null; created_by?: string | null; event_title?: string | null; start_date?: string | null; location?: string | null; image?: string | null; confirmation_template?: string | null } | null = null;
    if (input?.eventId) {
        const db = adminClient();
        const owner = await checkEventOwner(db, input.eventId, user.id);
        if (!owner.ok) return { ok: false, error: owner.error };
        const { data } = await db.from("events").select("*").eq("id", input.eventId).maybeSingle();
        event = data;
    }

    const sender = event ? await resolveEventSender(event) : null;
    const from = sender?.from || platformFrom();
    const site = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
    const date = event?.start_date ? new Date(event.start_date) : null;
    const result = await sendConfirmationEmail({
        to: user.email,
        eventTitle: `[TEST] ${event?.event_title || "Email check"}`,
        eventDate: date && !isNaN(date.getTime()) ? date.toDateString() : "Date to be announced",
        eventLocation: event?.location || "Venue",
        orderRef: "TEST-0000",
        receiptLink: site ? `${site}/${event?.tag ?? ""}` : "#",
        attendeeName: user.email.split("@")[0],
        eventImage: event?.image ?? undefined,
        brandName: sender?.brandName,
        from: sender?.from,
        replyTo: sender?.replyTo,
        resendApiKey: sender?.resendApiKey,
        templateKey: event?.confirmation_template ?? null,
    });
    if (!result.success) return { ok: false, error: explainEmailError((result as { error?: unknown }).error) };
    return { ok: true, to: user.email, from };
}
