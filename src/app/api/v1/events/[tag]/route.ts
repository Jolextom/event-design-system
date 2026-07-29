import { NextRequest } from "next/server";
import { adminClient, corsJson, corsPreflight, shapeQuestion } from "@/lib/apiV1";

export async function OPTIONS(req: NextRequest) {
    return corsPreflight(req);
}

/**
 * GET /api/v1/events/[tag]
 * Full public detail for one published event: the event itself, its ticket
 * types (passes), and its registration questions (including selection-logic
 * trigger questions and which passes each option reveals) — everything an
 * external site needs to render its own registration UI.
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ tag: string }> }
) {
    const { tag } = await params;

    try {
        const supabase = adminClient();

        const { data: event, error } = await supabase
            .from("events")
            .select(`
                *,
                passes (*),
                questions (*, options:question_options (*))
            `)
            .eq("tag", tag)
            .eq("is_published", true)
            .single();

        if (error || !event) {
            return corsJson(req, { error: "Event not found" }, { status: 404 });
        }

        const passes = (event.passes || [])
            .filter((p: any) => !p.is_hidden)
            .sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0))
            .map((p: any) => ({
                id: p.id,
                title: p.title,
                description: p.description,
                price: p.price ?? 0,
                is_free: p.is_free,
                type: p.type,
                group_size: p.group_size,
                quantity_available: p.quantity_available,
                quantity_sold: p.quantity_sold ?? 0,
                sold_out: (p.quantity_sold ?? 0) >= p.quantity_available,
                show_for_option_id: p.show_for_option_id, // selection-logic linkage
            }));

        const questions = (event.questions || [])
            .sort((a: any, b: any) => a.question_order - b.question_order)
            .map(shapeQuestion);

        return corsJson(req, {
            event: {
                id: event.id,
                title: event.event_title,
                tag: event.tag,
                description: event.description,
                image: event.image,
                image_focus_y: event.image_focus_y,
                start_date: event.start_date,
                end_date: event.end_date,
                start_time: event.start_time,
                end_time: event.end_time,
                location: event.location,
                format: event.event_format || "physical",
                virtual_platform: event.virtual_platform,
            },
            passes,
            questions,
        });
    } catch (err: any) {
        console.error(`GET /api/v1/events/${tag} failed:`, err);
        return corsJson(req, { error: "Failed to load event" }, { status: 500 });
    }
}
