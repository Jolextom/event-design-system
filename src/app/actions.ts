'use server'

import { createClient } from "@supabase/supabase-js";

/** Pulls the display name out of a resolved "Name <email>" From line. */
function brandNameFromSender(fromLine: string): string {
    return fromLine.replace(/\s*<.*>\s*$/, '').trim() || 'EventFlow';
}
import { sendConfirmationEmail, sendBroadcastEmail } from "@/lib/email";
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

        // Auto-resolve the event owner's verified sender (e.g. Kini AI's
        // kini-ai.com identity) so their attendees don't see the platform
        // default. Falls back silently to the platform default otherwise.
        const { resolveSenderForUser } = await import("@/lib/senderDomains");
        const sender = await resolveSenderForUser(event.created_by);

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

        try {
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
        } catch (fulfillErr: any) {
            console.error("Fulfillment inner error:", fulfillErr);
            // If it's a payment amount mismatch, it's a fatal error
            if (fulfillErr.message && fulfillErr.message.includes("amount mismatch")) {
                return { success: false, fatalError: "We encountered an issue verifying your payment. Please contact support." };
            }
            throw fulfillErr; // Re-throw other unexpected errors
        }

        console.log(`Manual verification successful for reference ${reference}. Order fulfilled.`);
        return { success: true };

    } catch (error: any) {
        console.error("verifyAndFulfillPayment error:", error);
        return { success: false, error: error.message || "Verification failed" };
    }
}

export async function broadcastUpdate({
    eventId,
    messageTitle,
    messageBody,
    actionLink,
    actionText,
    segmentId,
    senderIdentityId
}: {
    eventId: string;
    messageTitle: string;
    messageBody: string;
    actionLink?: string;
    actionText?: string;
    /** If provided, only sends to attendees matching this Smart Group instead of all registered guests */
    segmentId?: string;
    /** A verified sender_identities id to send From; falls back to the platform default if missing/unverified */
    senderIdentityId?: string;
}) {
    try {
        // 1. Fetch Event Details
        const { data: event, error: eventErr } = await adminSupabase
            .from("events")
            .select("event_title, image, tag")
            .eq("id", eventId)
            .single();

        if (eventErr || !event) throw new Error("Event not found");

        // 2. Fetch Registered Attendees — filtered by Smart Group if one was selected
        let recipientEmails: string[];

        if (segmentId) {
            const { data: segment, error: segErr } = await adminSupabase
                .from("smart_segments")
                .select("rules_config")
                .eq("id", segmentId)
                .single();

            if (segErr || !segment) throw new Error("Smart Group not found");

            const { data: attendees, error: attErr } = await adminSupabase
                .from("attendees")
                .select("email, first_name, last_name, check_in, properties")
                .eq("event_id", eventId)
                .neq("email_status", "invited");

            if (attErr) throw new Error("Failed to fetch attendees: " + attErr.message);

            const { evaluateSegment } = await import("./events/[tag]/utils/segmentLogic");
            const matching = (attendees || []).filter((a: any) => evaluateSegment(a, segment.rules_config));

            if (matching.length === 0) {
                return { success: false, error: "No attendees match this Smart Group." };
            }
            recipientEmails = Array.from(new Set(matching.map((a: any) => a.email)));
        } else {
            const { data: attendees, error: attErr } = await adminSupabase
                .from("attendees")
                .select("email")
                .eq("event_id", eventId)
                .neq("email_status", "invited"); // Only registered guests

            if (attErr) throw new Error("Failed to fetch attendees: " + attErr.message);
            if (!attendees || attendees.length === 0) {
                return { success: false, error: "No registered attendees found to broadcast to." };
            }
            recipientEmails = Array.from(new Set(attendees.map(a => a.email)));
        }

        // Resolve the From line (only verified identities are honored)
        const { resolveSender } = await import("@/lib/senderDomains");
        const sender = await resolveSender(senderIdentityId);

        // 3. Send Emails in Batches (Resend to field is an array)
        // Note: Resend recommended batch size is ~50-100 per request
        const batchSize = 50;
        const totalBatches = Math.ceil(recipientEmails.length / batchSize);
        let successCount = 0;

        for (let i = 0; i < recipientEmails.length; i += batchSize) {
            const batch = recipientEmails.slice(i, i + batchSize);
            const result = await sendBroadcastEmail({
                to: batch,
                from: sender.from,
                replyTo: sender.replyTo,
                resendApiKey: sender.resendApiKey,
                brandName: brandNameFromSender(sender.from),
                eventTitle: event.event_title,
                messageTitle,
                messageBody,
                eventImage: event.image,
                actionLink: actionLink || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/${event.tag}`,
                actionText: actionText || 'View Event'
            });

            if (result.success) successCount += batch.length;
        }

        // 4. Log Broadcast (Optional: we could create a table for this)
        console.log(`Broadcast '${messageTitle}' sent to ${successCount}/${recipientEmails.length} recipients for event ${eventId}`);

        return { 
            success: true, 
            message: `Successfully sent to ${successCount} recipients.`,
            recipientCount: recipientEmails.length
        };

    } catch (error: any) {
        console.error("broadcastUpdate error:", error);
        return { success: false, error: error.message || "Failed to send broadcast." };
    }
}

/**
 * Sends an Event Campaign's public form link to attendees, each with their
 * own individualized ?attendee= link so their answers sync back to their
 * Registry profile. Skips anyone who has already responded. Optionally
 * scoped to a Smart Group instead of every attendee.
 */
export async function sendCampaignToAttendees({
    campaignId,
    eventId,
    segmentId,
    senderIdentityId
}: {
    campaignId: string;
    eventId: string;
    segmentId?: string;
    /** A verified sender_identities id to send From; falls back to the platform default if missing/unverified */
    senderIdentityId?: string;
}) {
    try {
        const { data: campaign, error: campaignErr } = await adminSupabase
            .from("campaigns")
            .select("name, status, type")
            .eq("id", campaignId)
            .single();

        if (campaignErr || !campaign) throw new Error("Campaign not found");
        if (campaign.type !== "event") throw new Error("Only Event Campaigns can be sent to attendees.");
        if (campaign.status !== "active") throw new Error("Publish the campaign before sending it.");

        const { data: event, error: eventErr } = await adminSupabase
            .from("events")
            .select("event_title, image")
            .eq("id", eventId)
            .single();

        if (eventErr || !event) throw new Error("Event not found");

        // Fetch the audience — everyone registered, or a specific Smart Group
        const { data: allAttendees, error: attErr } = await adminSupabase
            .from("attendees")
            .select("id, email, first_name, last_name, check_in, properties")
            .eq("event_id", eventId)
            .neq("email_status", "invited");

        if (attErr) throw new Error("Failed to fetch attendees: " + attErr.message);

        let audience = allAttendees || [];

        if (segmentId) {
            const { data: segment, error: segErr } = await adminSupabase
                .from("smart_segments")
                .select("rules_config")
                .eq("id", segmentId)
                .single();
            if (segErr || !segment) throw new Error("Smart Group not found");

            const { evaluateSegment } = await import("./events/[tag]/utils/segmentLogic");
            audience = audience.filter((a: any) => evaluateSegment(a, segment.rules_config));
        }

        if (audience.length === 0) {
            return { success: false, error: "No attendees match this audience." };
        }

        // Don't re-send to anyone who already responded to this campaign
        const { data: existingResponses } = await adminSupabase
            .from("form_responses")
            .select("attendee_id")
            .eq("campaign_id", campaignId);

        const alreadyResponded = new Set(
            (existingResponses || []).map((r: any) => r.attendee_id).filter(Boolean)
        );
        const targets = audience.filter((a: any) => !alreadyResponded.has(a.id));

        if (targets.length === 0) {
            return { success: false, error: "Everyone in this audience has already responded." };
        }

        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const { resolveSender } = await import("@/lib/senderDomains");
        const sender = await resolveSender(senderIdentityId);
        let sentCount = 0;

        const results = await Promise.allSettled(targets.map(async (attendee: any) => {
            const link = `${baseUrl}/f/${campaignId}?attendee=${attendee.id}`;

            const result = await sendBroadcastEmail({
                to: [attendee.email],
                from: sender.from,
                replyTo: sender.replyTo,
                resendApiKey: sender.resendApiKey,
                brandName: brandNameFromSender(sender.from),
                eventTitle: event.event_title,
                messageTitle: campaign.name,
                messageBody: "We'd love to hear your feedback — it only takes a minute.",
                eventImage: event.image,
                actionLink: link,
                actionText: "Share Your Feedback"
            });

            if (result.success) sentCount++;

            // Best-effort audit log; failure here shouldn't fail the send itself
            await adminSupabase.from("email_deliveries").insert({
                attendee_id: attendee.id,
                event_id: eventId,
                email_type: "campaign_survey",
                status: result.success ? "sent" : "failed",
            });
        }));

        results.forEach((res, idx) => {
            if (res.status === 'rejected') {
                console.error(`Campaign send ${idx} for campaign ${campaignId} failed:`, res.reason);
            }
        });

        return {
            success: true,
            message: `Sent to ${sentCount} of ${targets.length} attendee(s).`
        };
    } catch (error: any) {
        console.error("sendCampaignToAttendees error:", error);
        return { success: false, error: error.message || "Failed to send campaign." };
    }
}
