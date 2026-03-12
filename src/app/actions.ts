'use server'

import { createClient } from "@supabase/supabase-js";
import { sendConfirmationEmail } from "@/lib/email";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function sendWelcomeEmail(attendeeId: string, eventId: string) {
    try {
        // 1. Fetch attendee and event details
        const { data: attendee, error: attendeeError } = await supabase
            .from("attendees")
            .select("*, order:orders_table(order_ref)")
            .eq("id", attendeeId)
            .single();

        if (attendeeError || !attendee) throw new Error("Attendee not found");

        const { data: event, error: eventError } = await supabase
            .from("events")
            .select("*")
            .eq("id", eventId)
            .single();

        if (eventError || !event) throw new Error("Event not found");

        // Fetch pass to build class-specific schedule notes
        let passTitle = '';
        if (attendee.pass_id) {
            const { data: passData } = await supabase
                .from("passes")
                .select("title")
                .eq("id", attendee.pass_id)
                .single();
            if (passData) passTitle = passData.title;
        }

        // 2. Create initial delivery record
        const { data: delivery, error: deliveryError } = await supabase
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
            // Proceed anyway to ensure user gets email, implementation detail shouldn't block user value
        }

        // 3. Send the email
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

        // Build class-specific schedule block (for events with multiple sessions per pass)
        const isChildPass = /child/i.test(passTitle);
        const isAdultPass = /adult/i.test(passTitle);
        let classNotesHtml: string | undefined;

        if (isChildPass) {
            classNotesHtml = `
                <table role="presentation" style="width:100%; border-collapse:collapse;">
                    <tr><td style="padding: 6px 0; font-size: 13px; color: #166534; font-weight: 600;">🇳🇬 Ígbò Children</td><td style="padding: 6px 0; font-size: 12px; color: #15803d; text-align:right;">Friday 4–5pm GMT+1</td></tr>
                    <tr><td colspan="2" style="padding-bottom: 8px;"><a href="https://meet.google.com/gtj-nzmw-nsf" style="font-size: 12px; color: #16a34a;">meet.google.com/gtj-nzmw-nsf</a></td></tr>
                    <tr><td style="padding: 6px 0; font-size: 13px; color: #166534; font-weight: 600;">🇳🇬 Yorùbá Children</td><td style="padding: 6px 0; font-size: 12px; color: #15803d; text-align:right;">Friday 5–6pm GMT+1</td></tr>
                    <tr><td colspan="2"><a href="https://meet.google.com/mha-huvk-ckd" style="font-size: 12px; color: #16a34a;">meet.google.com/mha-huvk-ckd</a></td></tr>
                </table>`;
        } else if (isAdultPass) {
            classNotesHtml = `
                <table role="presentation" style="width:100%; border-collapse:collapse;">
                    <tr><td style="padding: 6px 0; font-size: 13px; color: #166534; font-weight: 600;">🇳🇬 Ígbò Adult</td><td style="padding: 6px 0; font-size: 12px; color: #15803d; text-align:right;">Saturday 5–6pm GMT+1</td></tr>
                    <tr><td colspan="2" style="padding-bottom: 8px;"><a href="https://meet.google.com/mij-wnev-btb" style="font-size: 12px; color: #16a34a;">meet.google.com/mij-wnev-btb</a></td></tr>
                    <tr><td style="padding: 6px 0; font-size: 13px; color: #166534; font-weight: 600;">🇳🇬 Yorùbá Adult</td><td style="padding: 6px 0; font-size: 12px; color: #15803d; text-align:right;">Saturday 6–7pm GMT+1</td></tr>
                    <tr><td colspan="2"><a href="https://meet.google.com/wqh-mgfn-wgk" style="font-size: 12px; color: #16a34a;">meet.google.com/wqh-mgfn-wgk</a></td></tr>
                </table>`;
        }

        // Prepare params for storage
        const templateParams = {
            eventTitle: event.event_title,
            eventDate: eventDateStr,
            eventLocation,
            orderRef,
            receiptLink,
            watchLink,
            attendeeName: attendee.first_name,
            classNotesHtml,
        };

        const result = await sendConfirmationEmail({
            to: attendee.email,
            ...templateParams
        });

        // 4. Update delivery status
        if (delivery) {
            await supabase
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
