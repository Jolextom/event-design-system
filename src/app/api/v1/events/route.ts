import { NextRequest } from "next/server";
import { adminClient, corsJson, corsPreflight } from "@/lib/apiV1";

export async function OPTIONS(req: NextRequest) {
    return corsPreflight(req);
}

/**
 * GET /api/v1/events
 * Public list of published events, for external sites to render their own
 * event listings. Newest start date first.
 */
export async function GET(req: NextRequest) {
    try {
        const supabase = adminClient();

        const { data, error } = await supabase
            .from("events")
            .select("id, event_title, tag, description, image, image_focus_y, start_date, end_date, start_time, end_time, location, event_format, virtual_platform")
            .eq("is_published", true)
            .order("start_date", { ascending: false });

        if (error) throw error;

        const events = (data || []).map(e => ({
            id: e.id,
            title: e.event_title,
            tag: e.tag,
            description: e.description,
            image: e.image,
            image_focus_y: e.image_focus_y,
            start_date: e.start_date,
            end_date: e.end_date,
            start_time: e.start_time,
            end_time: e.end_time,
            location: e.location,
            format: e.event_format || "physical",
            virtual_platform: e.virtual_platform,
        }));

        return corsJson(req, { events });
    } catch (err: any) {
        console.error("GET /api/v1/events failed:", err);
        return corsJson(req, { error: "Failed to load events" }, { status: 500 });
    }
}
