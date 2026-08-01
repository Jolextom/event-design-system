import { supabase as defaultSupabase } from "./supabaseClient";
import { sendWelcomeEmail } from "@/app/actions";
import { SupabaseClient } from "@supabase/supabase-js";
import { sendInviteEmail } from "./email";
import { generateGoogleCalendarLink, generateOutlookLink } from "./calendar";

export interface FulfillOrderParams {
    orderId: string;
    eventId: string;
    passId: string;
    eventTag: string;
    validGuests: any[];
    totalAmount?: number;
    expectedAmount?: number;
    supabaseClient?: SupabaseClient;
}

/**
 * Fulfills an order by creating attendees, saving responses, and sending emails.
 * This is used for both free registrations (direct) and paid registrations (via webhook).
 */
export async function fulfillOrder({
    orderId,
    eventId,
    passId,
    eventTag,
    validGuests,
    totalAmount = 0,
    expectedAmount,
    supabaseClient
}: FulfillOrderParams) {
    const supabase = supabaseClient || defaultSupabase;
    console.log(`Fulfilling order ${orderId} for event ${eventTag}. Guests count: ${validGuests?.length || 0}`);

    if (!validGuests || validGuests.length === 0) {
        console.error(`No valid guests found for order ${orderId}. This might indicate truncated metadata.`);
        // Note: For now we continue to allow status update but log the error
    }

    // 0. Verify Amount (Security Check)
    if (expectedAmount !== undefined && totalAmount < expectedAmount) {
        console.error(`Insufficient amount for order ${orderId}. Expected ${expectedAmount}, got ${totalAmount}`);
        throw new Error("Payment amount mismatch. Order not fulfilled.");
    }

    // 1. Mark order as completed (if not already)
    const { data: currentOrder } = await supabase
        .from("orders_table")
        .select("status")
        .eq("id", orderId)
        .single();
    
    if (currentOrder?.status === "completed") {
        console.log(`Order ${orderId} already fulfilled. Skipping fulfillment logic.`);
        return { success: true };
    }

    const { error: orderUpdateErr } = await supabase
        .from("orders_table")
        .update({
            status: "completed",
            total_amount: totalAmount,
            updated_at: new Date().toISOString()
        })
        .eq("id", orderId);

    if (orderUpdateErr) {
        console.error("Failed to update order status:", orderUpdateErr);
        throw new Error("Failed to fulfill order: " + orderUpdateErr.message);
    }

    // 2. Create attendees and save answers
    let primaryAttendeeId: string | null = null;

    // Fetch pass to check type (group vs individual)
    const { data: pass } = await supabase
        .from("passes")
        .select("type")
        .eq("id", passId)
        .single();

    const isGroupPass = pass?.type === "group";

    for (let i = 0; i < validGuests.length; i++) {
        const guest = validGuests[i];

        // Check if attendee already exists for this (eventId, email)
        const { data: existingAtt } = await supabase
            .from("attendees")
            .select("id")
            .eq("event_id", eventId)
            .eq("email", guest.email)
            .maybeSingle();

        let attendeeId = existingAtt?.id;

        if (!attendeeId) {
            const attendeeRef = `EF-${eventTag.toUpperCase()}-${crypto.randomUUID().replace(/-/g, '').substring(0, 8).toUpperCase()}`;

            // Logic for status:
            // 1. If name is provided -> registered
            // 2. If it's a group pass AND they chose 'invite' -> invited
            // 3. Otherwise -> registered
            const hasName = guest.firstName && guest.firstName.trim().length > 0;
            let status = "registered";
            
            if (hasName) {
                status = "registered";
            } else if (isGroupPass && guest.isInvite) {
                status = "invited";
            }

            const { data: attendee, error: attendeeErr } = await supabase
                .from("attendees")
                .insert({
                    event_id: eventId,
                    order_id: orderId,
                    pass_id: passId,
                    first_name: guest.firstName || "Guest",
                    last_name: guest.lastName || "",
                    email: guest.email,
                    ref: attendeeRef,
                    email_status: status
                })
                .select()
                .single();

            if (attendeeErr) {
                console.error(`Failed to create attendee for ${guest.email}:`, attendeeErr);
                continue; // Skip or handle error
            }

            attendeeId = attendee?.id;
        }

        if (i === 0 && attendeeId) {
            primaryAttendeeId = attendeeId;
        }

        // Save answers (upsert to handle retries)
        if (attendeeId && guest.answers && Object.keys(guest.answers).length > 0) {
            const answerInserts = Object.entries(guest.answers).map(([qId, answer]) => ({
                attendee_id: attendeeId,
                question_id: qId,
                answer_text: String(answer)
            }));

            const { error: answerErr } = await supabase
                .from("answers")
                .upsert(answerInserts, { onConflict: 'attendee_id,question_id' });
            
            if (answerErr) {
                console.error(`Failed to store answers for attendee ${attendeeId}:`, answerErr);
            }
        }
    }

    // 3. Update ticket quantity sold (rpc)
    const ticketQuantity = validGuests.length;
    await supabase.rpc('increment_quantity_sold', {
        pass_id_param: passId,
        amount: ticketQuantity
    });

    // 4. Send Emails (Directly and Parallelized)
    const { data: attendeesWithStatus, error: attFetchErr } = await supabase
        .from("attendees")
        .select("id, email, email_status, first_name, last_name, ref, pass:pass_id(title)")
        .eq("order_id", orderId);

    if (attFetchErr) {
        console.error("Failed to fetch attendees for email dispatch:", attFetchErr);
    } else if (attendeesWithStatus && attendeesWithStatus.length > 0) {
        // Fetch event data for emails
        const { data: event } = await supabase
            .from("events")
            .select("event_title, start_date, start_time, location, created_by")
            .eq("id", eventId)
            .single();

        if (event) {
            const { resolveSenderForUser } = await import("./senderDomains");
            const sender = await resolveSenderForUser(event.created_by);
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
            const eventDate = event.start_date
                ? new Date(event.start_date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                })
                : 'TBA';
            
            const startDateTime = event.start_date && event.start_time 
                ? `${event.start_date}T${event.start_time}:00` 
                : event.start_date;

            const emailPromises = attendeesWithStatus.map(async (att) => {
                // Case A: Invited guests get an invite email
                if (att.email_status === "invited") {
                    const inviteLink = `${baseUrl}/${eventTag}/join/${att.ref}`;
                    
                    const googleCalendarLink = startDateTime ? generateGoogleCalendarLink({
                        title: event.event_title,
                        location: event.location || 'TBA',
                        startDate: startDateTime,
                        description: `Registration Ref: ${att.ref}`
                    }) : undefined;
            
                    const outlookCalendarLink = startDateTime ? generateOutlookLink({
                        title: event.event_title,
                        location: event.location || 'TBA',
                        startDate: startDateTime,
                        description: `Registration Ref: ${att.ref}`
                    }) : undefined;

                    return sendInviteEmail({
                        to: att.email,
                        from: sender?.from,
                        brandName: sender?.brandName,
                        eventTitle: event.event_title,
                        eventDate,
                        eventLocation: event.location || 'TBA',
                        inviterName: `${validGuests[0].firstName} ${validGuests[0].lastName}`,
                        passType: (att.pass as any)?.title || 'General Admission',
                        inviteLink,
                        googleCalendarLink,
                        outlookCalendarLink
                    });
                }
                
                // Case B: Registered guests (including the primary) get the Welcome email
                // Note: We use the existing sendWelcomeEmail action which handles confirmation logging
                if (att.id === primaryAttendeeId || att.email_status === "registered") {
                    // Avoid double sending if multiple entries match (though shouldn't happen)
                    return sendWelcomeEmail(att.id, eventId);
                }
                
                return Promise.resolve({ success: true, skipped: true });
            });

            // Await all with settled to ensure one failure doesn't block others
            const results = await Promise.allSettled(emailPromises);
            results.forEach((res, idx) => {
                if (res.status === 'rejected') {
                    console.error(`Email dispatch ${idx} for order ${orderId} failed:`, res.reason);
                }
            });
        }
    }

    return { success: true };
}
