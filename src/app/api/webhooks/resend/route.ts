import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Resend webhook event types we care about
type ResendWebhookEventType =
    | 'email.sent'
    | 'email.delivered'
    | 'email.opened'
    | 'email.clicked'
    | 'email.bounced'
    | 'email.complained';

interface ResendWebhookPayload {
    type: ResendWebhookEventType;
    created_at: string;
    data: {
        email_id: string;
        from: string;
        to: string[];
        subject: string;
        created_at: string;
        // For click events
        click?: {
            link: string;
            timestamp: string;
        };
        // For bounce events
        bounce?: {
            message: string;
        };
    };
}

export async function POST(request: NextRequest) {
    try {
        const payload: ResendWebhookPayload = await request.json();

        // Log for debugging (remove in production)
        console.log('Resend webhook received:', payload.type, payload.data.email_id);

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        // Find the email delivery record by Resend ID
        const { data: delivery, error: findError } = await supabase
            .from('email_deliveries')
            .select('id')
            .eq('resend_id', payload.data.email_id)
            .single();

        if (findError || !delivery) {
            console.warn('No delivery record found for resend_id:', payload.data.email_id);
            // Return 200 anyway to acknowledge webhook (Resend will retry otherwise)
            return NextResponse.json({ received: true, matched: false });
        }

        // Prepare update based on event type
        const timestamp = new Date().toISOString();
        let updateData: Record<string, unknown> = { updated_at: timestamp };

        switch (payload.type) {
            case 'email.delivered':
                updateData.delivered_at = timestamp;
                updateData.status = 'delivered';
                break;

            case 'email.opened':
                updateData.opened_at = timestamp;
                break;

            case 'email.clicked':
                updateData.clicked_at = timestamp;
                if (payload.data.click?.link) {
                    updateData.click_url = payload.data.click.link;
                }
                break;

            case 'email.bounced':
                updateData.bounced_at = timestamp;
                updateData.status = 'bounced';
                if (payload.data.bounce?.message) {
                    updateData.bounce_reason = payload.data.bounce.message;
                }
                break;

            case 'email.complained':
                updateData.status = 'complained';
                break;

            default:
                // For other events like 'email.sent', just log
                console.log('Unhandled webhook event type:', payload.type);
                return NextResponse.json({ received: true, handled: false });
        }

        // Update the delivery record
        const { error: updateError } = await supabase
            .from('email_deliveries')
            .update(updateData)
            .eq('id', delivery.id);

        if (updateError) {
            console.error('Failed to update delivery record:', updateError);
            return NextResponse.json({ error: 'Update failed' }, { status: 500 });
        }

        return NextResponse.json({ received: true, handled: true });
    } catch (error) {
        console.error('Webhook processing error:', error);
        // Return 200 to prevent Resend from retrying
        return NextResponse.json({ error: 'Processing failed' }, { status: 200 });
    }
}

// Resend may send OPTIONS request for CORS preflight
export async function OPTIONS() {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    });
}
