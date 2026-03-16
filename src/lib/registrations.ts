import { supabase as defaultSupabase } from "./supabaseClient";
import { sendWelcomeEmail } from "@/app/actions";
import crypto from "crypto";
import { SupabaseClient } from "@supabase/supabase-js";

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
    console.log(`Fulfilling order ${orderId} for event ${eventTag}`);

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

            await supabase
                .from("answers")
                .upsert(answerInserts, { onConflict: 'attendee_id,question_id' });
        }
    }

    // 3. Update ticket quantity sold
    const ticketQuantity = validGuests.length; // Simplified; usually depends on pass type but this is fine for now
    await supabase.rpc('increment_quantity_sold', {
        pass_id_param: passId,
        amount: ticketQuantity
    });

    // 4. Send Invite Emails (Asynchronous)
    // Fetch the primary attendee email to avoid sending them an invite if they are also in a group slot
    const { data: primaryAttendee } = primaryAttendeeId 
        ? await supabase.from("attendees").select("email").eq("id", primaryAttendeeId).single()
        : { data: null };

    const invitedAttendees = await supabase
        .from("attendees")
        .select("id, email")
        .eq("order_id", orderId)
        .eq("email_status", "invited");

    if (invitedAttendees.data && invitedAttendees.data.length > 0) {
        invitedAttendees.data.forEach(att => {
            // Skip sending invite if this is the primary attendee (they already get a confirmation)
            if (primaryAttendee && att.email === primaryAttendee.email) {
                console.log(`Skipping invite email for primary attendee: ${att.email}`);
                return;
            }

            fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/send-invite`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ attendeeId: att.id, eventTag })
            }).catch(err => console.error('Failed to send invite email:', err));
        });
    }

    // 5. Send Welcome Email (Primary Attendee)
    if (primaryAttendeeId) {
        await sendWelcomeEmail(primaryAttendeeId, eventId);
    }

    return { success: true };
}
