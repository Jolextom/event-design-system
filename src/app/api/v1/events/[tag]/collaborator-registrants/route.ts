import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/apiV1";
import { isLimited, rateLimit } from "@/lib/rateLimit";
import { buildReport } from "@/lib/eventReport";

/**
 * POST /api/v1/events/[tag]/collaborator-registrants
 *
 * Re-validates a collaborator's access code server-side (with the
 * service-role client) and returns only the attendee rows their configured
 * view_scope permits. Done server-side rather than as a direct anon-key
 * browser query because RLS on `attendees`/`events` in the live Supabase
 * project is unverified — see the plan's "Verified facts" notes.
 *
 * Body: { access_code: string }
 * Response: { collaborator, event, attendees: Array<Attendee & { isMine: boolean }> }
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ tag: string }> }
) {
    const { tag } = await params;

    try {
        const { access_code } = await req.json();
        if (!access_code || typeof access_code !== "string") {
            return NextResponse.json({ error: "access_code is required" }, { status: 400 });
        }

        // Access codes are short, so wrong guesses are limited: a handful of misses blocks that visitor for a while.
        const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
        const missKey = `collab-miss:${tag}:${ip}`;
        if (isLimited(missKey, 10, 10 * 60 * 1000)) {
            return NextResponse.json({ error: "Too many wrong codes. Please try again in a few minutes." }, { status: 429 });
        }

        const supabase = adminClient();

        const { data: event, error: eventErr } = await supabase
            .from("events")
            .select("id, event_title, tag")
            .eq("tag", tag)
            .single();

        if (eventErr || !event) {
            return NextResponse.json({ error: "Event not found" }, { status: 404 });
        }

        const { data: collaborator, error: collabErr } = await supabase
            .from("event_collaborators")
            .select("id, first_name, last_name, view_scope, status")
            .eq("event_id", event.id)
            .eq("access_code", access_code.trim())
            .single();

        if (collabErr || !collaborator) {
            rateLimit(missKey, 10, 10 * 60 * 1000); // count this miss
            return NextResponse.json({ error: "Invalid access code" }, { status: 401 });
        }

        if (collaborator.status !== "active") {
            return NextResponse.json({ error: "This access code has been revoked" }, { status: 403 });
        }

        let query = supabase
            .from("attendees")
            .select("id, first_name, last_name, email, ref, check_in, email_status, created_at, referred_by_collaborator_id, pass:passes(title), order:orders_table(total_amount)")
            .eq("event_id", event.id)
            .neq("email_status", "invited")
            .order("first_name", { ascending: true });

        if (collaborator.view_scope === "own_only") {
            query = query.eq("referred_by_collaborator_id", collaborator.id);
        }

        const { data: attendeesData, error: attendeesErr } = await query;

        if (attendeesErr) {
            console.error("collaborator-registrants: attendee fetch failed:", attendeesErr);
            return NextResponse.json({ error: "Failed to load registrants" }, { status: 500 });
        }

        const attendees = (attendeesData || []).map((a) => ({
            ...a,
            isMine: a.referred_by_collaborator_id === collaborator.id,
        }));

        // Totals and "started but hasn't paid yet" are event-wide, so only the full-list view gets them
        // (someone limited to their own referrals must not learn the whole event's numbers).
        let report: ReturnType<typeof buildReport> | null = null;
        if (collaborator.view_scope !== "own_only") {
            const [{ data: orders }, { data: passes }] = await Promise.all([
                supabase.from("orders_table").select("id, first_name, last_name, email, pass_id, created_at, status").eq("event_id", event.id).eq("status", "pending"),
                supabase.from("passes").select("id, title").eq("event_id", event.id),
            ]);
            report = buildReport({ attendees: attendees as any, orders: (orders ?? []) as any, passes: (passes ?? []) as any });
        }

        return NextResponse.json({
            generatedAt: new Date().toISOString(),
            summary: report?.summary ?? null,
            pending: report?.pending ?? null,
            collaborator: {
                id: collaborator.id,
                first_name: collaborator.first_name,
                last_name: collaborator.last_name,
                view_scope: collaborator.view_scope,
            },
            event: { id: event.id, event_title: event.event_title, tag: event.tag },
            attendees,
        });
    } catch (err: any) {
        console.error(`POST /api/v1/events/${tag}/collaborator-registrants failed:`, err);
        return NextResponse.json({ error: err.message || "Request failed" }, { status: 500 });
    }
}
