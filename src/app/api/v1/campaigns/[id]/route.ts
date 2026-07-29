import { NextRequest } from "next/server";
import { adminClient, corsJson, corsPreflight, shapeQuestion } from "@/lib/apiV1";

export async function OPTIONS(req: NextRequest) {
    return corsPreflight(req);
}

/**
 * GET /api/v1/campaigns/[id]
 * Public detail for one ACTIVE campaign (survey/form): name, type, and all
 * questions with options, scale config, and page-routing logic — everything
 * an external site needs to render the survey in its own UI. Drafts and
 * closed campaigns 404 here, same as the hosted /f/[id] page.
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    try {
        const supabase = adminClient();

        const { data: campaign, error } = await supabase
            .from("campaigns")
            .select("id, name, type, trigger, status, event_id")
            .eq("id", id)
            .single();

        if (error || !campaign || campaign.status !== "active") {
            return corsJson(req, { error: "Campaign not found" }, { status: 404 });
        }

        const { data: questions } = await supabase
            .from("questions")
            .select("*, options:question_options (*)")
            .eq("campaign_id", id)
            .order("question_order");

        const shaped = (questions || []).map(shapeQuestion);
        const pageCount = Math.max(1, ...shaped.map(q => q.page));

        return corsJson(req, {
            campaign: {
                id: campaign.id,
                name: campaign.name,
                type: campaign.type,
                trigger: campaign.trigger,
                event_id: campaign.event_id,
            },
            page_count: pageCount,
            questions: shaped,
        });
    } catch (err: any) {
        console.error(`GET /api/v1/campaigns/${id} failed:`, err);
        return corsJson(req, { error: "Failed to load campaign" }, { status: 500 });
    }
}
