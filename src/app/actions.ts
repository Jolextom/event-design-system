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
        const result = await sendConfirmationEmail({
            to: attendee.email,
            eventTitle: event.event_title,
            eventDate: new Date(event.start_date).toLocaleDateString("en-US", {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }),
            eventLocation: event.location || "Virtual Event",
            orderRef: attendee?.order?.order_ref || "N/A",
            receiptLink: `${process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/${event.tag}/receipt/${attendee?.order?.order_ref}`,
            attendeeName: attendee.first_name
        });

        // 4. Update delivery status
        if (delivery) {
            await supabase
                .from("email_deliveries")
                .update({
                    status: result.success ? "sent" : "failed",
                    resend_id: result.success && result.data ? result.data.id : null,
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
