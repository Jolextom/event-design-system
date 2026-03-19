'use server'

import { createClient } from "@supabase/supabase-js";
import { sendConfirmationEmail } from "@/lib/email";
import * as PaystackLib from "@/lib/paystack";
import { fulfillOrder } from "@/lib/registrations";
import { generateGoogleCalendarLink, generateOutlookLink } from "@/lib/calendar";

const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!serviceKey) {
    console.warn("SUPABASE_SERVICE_ROLE_KEY is missing. Administrative actions may fail due to RLS.");
}

const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function sendWelcomeEmail(attendeeId: string, eventId: string) {
    try {
        // Use admin client for administrative email tasks
        const { data: attendee, error: attendeeError } = await adminSupabase
            .from("attendees")
            .select("*, order:orders_table(order_ref)")
            .eq("id", attendeeId)
            .single();

        if (attendeeError || !attendee) throw new Error("Attendee not found");

        const { data: event, error: eventError } = await adminSupabase
            .from("events")
            .select("*")
            .eq("id", eventId)
            .single();

        if (eventError || !event) throw new Error("Event not found");

        // Fetch pass to build class-specific schedule notes
        let passTitle = '';
        if (attendee.pass_id) {
            const { data: passData } = await adminSupabase
                .from("passes")
                .select("title")
                .eq("id", attendee.pass_id)
                .single();
            if (passData) passTitle = passData.title;
        }

        // 2. Create initial delivery record
        const { data: delivery, error: deliveryError } = await adminSupabase
            .from("email_deliveries")
            .insert({
                attendee_id: attendeeId,
                event_id: eventId,
                email_type: "confirmation",
                status: "sending"
            })
            .select()
            .single();

        if (deliveryError) {
            console.error("Failed to create email delivery record:", deliveryError);
        }

        // ... rest of the function (no changes to email logic itself)
        const eventDateStr = new Date(event.start_date).toLocaleDateString("en-US", {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const eventLocation = event.location || "Virtual Event";
        const orderRef = attendee?.order?.order_ref || "N/A";
        const receiptLink = `${process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/${event.tag}/receipt/${attendee?.order?.order_ref}`;

        const isVirtual = event.event_format === 'virtual' || event.event_format === 'hybrid';
        const watchLink = isVirtual ? `${process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/${event.tag}/join?token=${attendeeId}` : undefined;

        // Build class-specific schedule block 
        let classNotesHtml: string | undefined;
        if (/child/i.test(passTitle)) {
            classNotesHtml = `
                <table role="presentation" style="width:100%; border-collapse:collapse;">
                    <tr><td style="padding: 6px 0; font-size: 13px; color: #166534; font-weight: 600;">🇳🇬 Ígbò Children</td><td style="padding: 6px 0; font-size: 12px; color: #15803d; text-align:right;">Friday 4–5pm GMT+1</td></tr>
                    <tr><td colspan="2" style="padding-bottom: 8px;"><a href="https://meet.google.com/gtj-nzmw-nsf" style="font-size: 12px; color: #16a34a;">meet.google.com/gtj-nzmw-nsf</a></td></tr>
                    <tr><td style="padding: 6px 0; font-size: 13px; color: #166534; font-weight: 600;">🇳🇬 Yorùbá Children</td><td style="padding: 6px 0; font-size: 12px; color: #15803d; text-align:right;">Friday 5–6pm GMT+1</td></tr>
                    <tr><td colspan="2"><a href="https://meet.google.com/mha-huvk-ckd" style="font-size: 12px; color: #16a34a;">meet.google.com/mha-huvk-ckd</a></td></tr>
                </table>`;
        } else if (/adult/i.test(passTitle)) {
            classNotesHtml = `
                <table role="presentation" style="width:100%; border-collapse:collapse;">
                    <tr><td style="padding: 6px 0; font-size: 13px; color: #166534; font-weight: 600;">🇳🇬 Ígbò Adult</td><td style="padding: 6px 0; font-size: 12px; color: #15803d; text-align:right;">Saturday 5–6pm GMT+1</td></tr>
                    <tr><td colspan="2" style="padding-bottom: 8px;"><a href="https://meet.google.com/mij-wnev-btb" style="font-size: 12px; color: #16a34a;">meet.google.com/mij-wnev-btb</a></td></tr>
                    <tr><td style="padding: 6px 0; font-size: 13px; color: #166534; font-weight: 600;">🇳🇬 Yorùbá Adult</td><td style="padding: 6px 0; font-size: 12px; color: #15803d; text-align:right;">Saturday 6–7pm GMT+1</td></tr>
                    <tr><td colspan="2"><a href="https://meet.google.com/wqh-mgfn-wgk" style="font-size: 12px; color: #16a34a;">meet.google.com/wqh-mgfn-wgk</a></td></tr>
                </table>`;
        }

        // Generate Calendar Links
        const startDateTime = event.start_date && event.start_time 
            ? `${event.start_date}T${event.start_time}:00` 
            : event.start_date;
        
        const googleCalendarLink = startDateTime ? generateGoogleCalendarLink({
            title: event.event_title,
            location: eventLocation,
            startDate: startDateTime,
            description: `Order Ref: ${orderRef}`
        }) : undefined;

        const outlookCalendarLink = startDateTime ? generateOutlookLink({
            title: event.event_title,
            location: eventLocation,
            startDate: startDateTime,
            description: `Order Ref: ${orderRef}`
        }) : undefined;

        const templateParams = {
            eventTitle: event.event_title,
            eventDate: eventDateStr,
            eventLocation,
            orderRef,
            receiptLink,
            watchLink,
            attendeeName: attendee.first_name,
            classNotesHtml,
            googleCalendarLink,
            outlookCalendarLink,
        };

        const result = await sendConfirmationEmail({
            to: attendee.email,
            ...templateParams
        });

        if (delivery) {
            await adminSupabase
                .from("email_deliveries")
                .update({
                    status: result.success ? "sent" : "failed",
                    resend_id: result.success && result.data ? result.data.id : null,
                    template_type: "confirmation",
                    template_params: templateParams,
                    updated_at: new Date().toISOString()
                })
                .eq("id", delivery.id);
        }

        return result;
    } catch (error) {
        console.error("sendWelcomeEmail error:", error);
        return { success: false, error };
    }
}

export async function initializeTransaction(options: any) {
    return PaystackLib.initializeTransaction(options);
}

export async function verifyAndFulfillPayment(reference: string) {
    try {
        console.log(`Manual verification triggered for reference: ${reference}`);
        
        const paystackData = await PaystackLib.verifyTransaction(reference);
        
        if (paystackData.status !== 'success') {
            return { success: false, error: "Payment not successful yet" };
        }

        const metadata = paystackData.metadata;
        if (!metadata || !metadata.orderId) {
            return { success: false, error: "Order metadata missing" };
        }

        // Use admin client to bypass RLS
        const { data: order, error: orderErr } = await adminSupabase
            .from("orders_table")
            .select("id, status, expected_amount_kobo")
            .eq("id", metadata.orderId)
            .single();

        if (orderErr || !order) {
            return { success: false, error: "Order not found in database" };
        }

        if (order.status === 'completed') {
            return { success: true, alreadyCompleted: true };
        }

        await fulfillOrder({
            orderId: metadata.orderId,
            eventId: metadata.eventId,
            passId: metadata.passId,
            eventTag: metadata.eventTag,
            validGuests: metadata.validGuests,
            totalAmount: paystackData.amount / 100,
            expectedAmount: order.expected_amount_kobo / 100,
            supabaseClient: adminSupabase
        });

        console.log(`Manual verification successful for reference ${reference}. Order fulfilled.`);
        return { success: true };

    } catch (error: any) {
        console.error("verifyAndFulfillPayment error:", error);
        return { success: false, error: error.message || "Verification failed" };
    }
}
