import { NextRequest, NextResponse } from "next/server";
import { adminClient } from "@/lib/apiV1";

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
            return NextResponse.json({ error: "Invalid access code" }, { status: 401 });
        }

        if (collaborator.status !== "active") {
            return NextResponse.json({ error: "This access code has been revoked" }, { status: 403 });
        }

        let query = supabase
            .from("attendees")
            .select("id, first_name, last_name, email, ref, check_in, email_status, referred_by_collaborator_id, pass:passes(title)")
            .eq("event_id", event.id)
            .eq("email_status", "registered")
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

        return NextResponse.json({
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
