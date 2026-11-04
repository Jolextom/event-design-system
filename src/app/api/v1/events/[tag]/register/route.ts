import { NextRequest } from "next/server";
import { corsJson, corsPreflight } from "@/lib/apiV1";
import { createCheckout, type CheckoutGuestInput } from "@/lib/checkout";

export async function OPTIONS(req: NextRequest) {
    return corsPreflight(req);
}

/**
 * POST /api/v1/events/[tag]/register
 * Headless registration for external sites. Same server-side checkout as the
 * hosted page (src/lib/checkout.ts), so deadlines, ticket limits, fees and the
 * organiser split apply identically whichever way someone registers.
 *
 * Body: {
 *   pass_id: string;
 *   guests: [{ firstName, lastName?, email, isInvite?, answers?: {questionId: text} }]
 *   callback_url?: string;   // where Paystack redirects after payment (paid passes)
 *   ref?: string;            // collaborator referral code
 * }
 *
 * Response (free pass):  { status: "registered", order_ref }
 * Response (paid pass):  { status: "payment_required", order_ref, authorization_url }
 * Errors: { error } with 400 / 403 / 404 / 409 / 500 / 502.
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ tag: string }> }
) {
    const { tag } = await params;

    try {
        const body = await req.json();
        const { pass_id, guests, callback_url, ref } = body as {
            pass_id: string;
            guests: CheckoutGuestInput[];
            callback_url?: string;
            ref?: string;
        };

        const result = await createCheckout(
            { eventTag: tag, passId: pass_id, guests, referralCode: ref, callbackUrl: callback_url },
            { requirePublished: true, lenientGuests: true }
        );

        if (!result.ok) return corsJson(req, { error: result.error }, { status: result.httpStatus });
        if (result.status === "payment_required") {
            return corsJson(req, {
                status: "payment_required",
                order_ref: result.orderRef,
                authorization_url: result.authorizationUrl,
            });
        }
        return corsJson(req, { status: "registered", order_ref: result.orderRef });
    } catch (err: any) {
        console.error(`POST /api/v1/events/${tag}/register failed:`, err);
        return corsJson(req, { error: err.message || "Registration failed" }, { status: 500 });
    }
}
