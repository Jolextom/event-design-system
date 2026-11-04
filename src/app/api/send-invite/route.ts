import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { resendGuestEmail } from "@/lib/guests";
import { rateLimit } from "@/lib/rateLimit";

/**
 * POST /api/send-invite   { attendeeId, orderRef? }   (+ optional Authorization: Bearer <login token>)
 *
 * (Re)sends an invite or ticket email to ONE attendee. It used to be open to anyone
 * who knew an attendee id, with no limit, so anyone could trigger unlimited email.
 * Now the caller must be either:
 *   - the event's organiser (their login token in the Authorization header), or
 *   - someone who holds the order reference (the buyer, from their receipt page),
 * and each person can only be emailed once every 2 minutes and 4 times a day.
 */
export async function POST(request: NextRequest) {
    try {
        const ip = (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
        const rl = rateLimit(`send-invite:${ip}`, 20, 10 * 60 * 1000);
        if (!rl.ok) {
            return NextResponse.json({ error: "Too many requests. Please try again shortly." }, { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } });
        }

        const body = await request.json().catch(() => ({}));
        const attendeeId = typeof body?.attendeeId === "string" ? body.attendeeId : "";
        const orderRef = typeof body?.orderRef === "string" ? body.orderRef : null;
        if (!attendeeId) return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

        // Organiser? Verify the login token with Supabase (never trust an id sent by the browser).
        let organiserUserId: string | null = null;
        const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
        if (token) {
            const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
            const { data } = await anon.auth.getUser(token);
            organiserUserId = data?.user?.id ?? null;
        }

        const res = await resendGuestEmail({ attendeeId, orderRef, organiserUserId });
        if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Send invite error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
