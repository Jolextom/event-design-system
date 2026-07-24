import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: campaignId } = await params;

    try {
        // Instantiated per-request rather than at module scope so that
        // `next build`'s page-data collection step (which imports this
        // module without runtime env vars present) doesn't throw.
        //
        // Uses the service role key (same pattern as src/app/actions.ts) rather
        // than the public anon key: this route needs to read back the row it
        // just inserted (.insert().select()), which the anon role can't do
        // under RLS unless we also grant public SELECT on form_responses/
        // form_answers — and we don't want survey responses/emails readable
        // by anyone with the anon key via a direct API call. Running as a
        // privileged server route sidesteps that without loosening RLS.
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const body = await req.json();
        const { attendeeId, email, answers } = body as {
            attendeeId?: string;
            email?: string;
            answers: Record<string, string | string[] | number>;
        };

        if (!answers || Object.keys(answers).length === 0) {
            return NextResponse.json({ error: "No answers provided" }, { status: 400 });
        }

        // Confirm the campaign exists and is active before accepting a submission
        const { data: campaign, error: campaignErr } = await supabase
            .from("campaigns")
            .select("id, status")
            .eq("id", campaignId)
            .single();

        if (campaignErr || !campaign) {
            return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
        }
        if (campaign.status !== "active") {
            return NextResponse.json({ error: "This form is not currently accepting responses" }, { status: 403 });
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
            console.error("Failed to create form_response:", responseErr);
            return NextResponse.json({ error: "Failed to save response" }, { status: 500 });
        }

        const answerRows = Object.entries(answers).map(([questionId, value]) => ({
            response_id: response.id,
            question_id: questionId,
            value,
        }));

        const { error: answersErr } = await supabase.from("form_answers").insert(answerRows);

        if (answersErr) {
            console.error("Failed to save form_answers:", answersErr);
            return NextResponse.json({ error: "Failed to save answers" }, { status: 500 });
        }

        return NextResponse.json({ success: true, responseId: response.id });
    } catch (err: any) {
        console.error("Form submission error:", err);
        return NextResponse.json({ error: err.message || "Unexpected error" }, { status: 500 });
    }
}
