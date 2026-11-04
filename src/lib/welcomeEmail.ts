import { adminClient } from "@/lib/apiV1";
import { sendConfirmationEmail, buildQrCodeUrl } from "@/lib/email";
import { generateGoogleCalendarLink, generateOutlookLink } from "@/lib/calendar";

/**
 * Sends one guest's confirmation email (event details, calendar links, QR check-in pass).
 *
 * This deliberately lives OUTSIDE src/app/actions.ts: every exported function in a "use server"
 * file can be called from the browser by anyone. This one is only for our own server code
 * (checkout, payment fulfilment, invite completion, resend), which has already checked who is
 * asking. See src/lib/checkout.ts, registrations.ts and guests.ts.
 */

/** Pulls the display name out of a resolved "Name <email>" From line. */
function brandNameFromSender(fromLine: string): string {
    return fromLine.replace(/\s*<.*>\s*$/, '').trim() || 'EventFlow';
}

const adminSupabase = adminClient();

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
        let eventDateStr = "TBA";
        try {
            const d = new Date(event.start_date);
            if (!isNaN(d.getTime())) {
                eventDateStr = d.toLocaleDateString("en-US", {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
            }
        } catch (e) {
            console.error("Error formatting event date:", e);
        }
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

        // Who the email comes from: the event's own email identity if it has one,
        // otherwise the owner's verified sender (e.g. Kini AI's kini-ai.com
        // identity), otherwise the platform default. See src/lib/eventEmail.ts.
        const { resolveEventSender } = await import("@/lib/eventEmail");
        const sender = await resolveEventSender(event);

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
            eventImage: event.image,
            brandName: sender?.brandName,
            // Every attendee's OWN check-in code (not the order ref, which a whole group shares).
            checkInRef: attendee.ref || undefined,
            qrCodeUrl: attendee.ref ? buildQrCodeUrl(attendee.ref) : undefined,
        };

        const result = await sendConfirmationEmail({
            from: sender?.from,
            replyTo: sender?.replyTo,
            resendApiKey: sender?.resendApiKey,
            templateKey: event.confirmation_template,
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
