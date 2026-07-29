import { NextRequest } from "next/server";
import { adminClient, corsJson, corsPreflight } from "@/lib/apiV1";

export async function OPTIONS(req: NextRequest) {
    return corsPreflight(req);
}

/**
 * POST /api/v1/campaigns/[id]/submit
 * CORS-enabled version of the campaign submission endpoint, for external
 * sites rendering the survey in their own UI.
 *
 * Body: {
 *   attendeeId?: string;   // links the response to a Registry profile (property sync)
 *   email?: string;        // captured for anonymous respondents
 *   answers: { [questionId]: string | string[] | number }
 * }
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: campaignId } = await params;

    try {
        const supabase = adminClient();

        const body = await req.json();
        const { attendeeId, email, answers } = body as {
            attendeeId?: string;
            email?: string;
            answers: Record<string, string | string[] | number>;
        };

        if (!answers || Object.keys(answers).length === 0) {
            return corsJson(req, { error: "No answers provided" }, { status: 400 });
        }

        const { data: campaign, error: campaignErr } = await supabase
            .from("campaigns")
            .select("id, status")
            .eq("id", campaignId)
            .single();

        if (campaignErr || !campaign) {
            return corsJson(req, { error: "Campaign not found" }, { status: 404 });
        }
        if (campaign.status !== "active") {
            return corsJson(req, { error: "This form is not currently accepting responses" }, { status: 403 });
        }

        const { data: response, error: responseErr } = await supabase
            .from("form_responses")
            .insert({
                campaign_id: campaignId,
                attendee_id: attendeeId || null,
                email: email || null,
            })
            .select()
            .single();

        if (responseErr || !response) {
            console.error("v1 submit: failed to create form_response:", responseErr);
            return corsJson(req, { error: "Failed to save response" }, { status: 500 });
        }

        const answerRows = Object.entries(answers).map(([questionId, value]) => ({
            response_id: response.id,
            question_id: questionId,
            value,
        }));

        const { error: answersErr } = await supabase.from("form_answers").insert(answerRows);

        if (answersErr) {
            console.error("v1 submit: failed to save form_answers:", answersErr);
            return corsJson(req, { error: "Failed to save answers" }, { status: 500 });
        }

        return corsJson(req, { success: true, responseId: response.id });
    } catch (err: any) {
        console.error("v1 campaign submit error:", err);
        return corsJson(req, { error: err.message || "Unexpected error" }, { status: 500 });
    }
}
