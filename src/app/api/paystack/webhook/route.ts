import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { PAYSTACK_SECRET_KEY } from "@/lib/paystack";
import { fulfillOrder } from "@/lib/registrations";
import { supabase } from "@/lib/supabaseClient";

export async function POST(req: NextRequest) {
    const rawBody = await req.text();
    
    if (!rawBody) {
        console.error("Paystack webhook received with empty body");
        return NextResponse.json({ error: "Empty body" }, { status: 400 });
    }

    try {
        const body = JSON.parse(rawBody);
        const signature = req.headers.get("x-paystack-signature");

        if (!signature) {
            return NextResponse.json({ error: "No signature provided" }, { status: 401 });
        }

        // 1. Verify signature
        const hash = crypto
            .createHmac("sha512", PAYSTACK_SECRET_KEY)
            .update(rawBody) // Use rawBody for verification
            .digest("hex");

        if (hash !== signature) {
            console.error("Invalid Paystack signature");
            return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
        }

        // 2. Handle event
        const eventType = body.event;
        console.log(`Paystack Webhook received: ${eventType}`);

        if (eventType === "charge.success") {
            const { reference, metadata, amount } = body.data;
            const paidAmountNaira = amount / 100;

            console.log("Webhook metadata received:", metadata);
            console.log("Webhook reference:", reference);

            // Handle potential stringified metadata
            let metadataObj = metadata;
            if (typeof metadata === "string") {
                try {
                    metadataObj = JSON.parse(metadata);
                } catch (e) {
                    console.error("Failed to parse stringified metadata:", e);
                }
            }

            // Extract fulfillment details from metadata
            const { orderId, eventId, passId, eventTag, validGuests } = metadataObj || {};

            if (!orderId || !eventId || !passId || !eventTag || !validGuests) {
                console.error("Missing fulfillment metadata in Paystack webhook. Metadata:", metadataObj);
                return NextResponse.json({ error: "Missing metadata" }, { status: 400 });
            }

            // Create a local client to avoid singleton issues in edge/server environments
            // Use SERVICE_ROLE_KEY to bypass RLS for administrative fulfillment
            const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
            
            if (!serviceKey) {
                console.error("SUPABASE_SERVICE_ROLE_KEY is missing in production environment");
                return NextResponse.json({ error: "Configuration error" }, { status: 500 });
            }

            const adminSupabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                serviceKey
            );

            // 3. Security: Double check expected amount from database
            console.log(`Looking up order with ID: ${orderId}`);
            const { data: orderData, error: orderFetchErr } = await adminSupabase
                .from("orders_table")
                .select("expected_amount_kobo, status")
                .eq("id", orderId)
                .single();
            
            if (orderFetchErr || !orderData) {
                console.error("Order lookup failed for ID:", orderId, "Error:", orderFetchErr);
                return NextResponse.json({ error: "Order not found" }, { status: 404 });
            }

            console.log(`Order found. Current status: ${orderData.status}. Expected amount: ${orderData.expected_amount_kobo}`);

            // Paystack amount is in Kobo
            const expectedKobo = orderData.expected_amount_kobo;

            // Fulfill the order
            await fulfillOrder({
                orderId,
                eventId,
                passId,
                eventTag,
                validGuests,
                totalAmount: paidAmountNaira,
                expectedAmount: expectedKobo / 100,
                supabaseClient: adminSupabase
            });

            console.log(`Payment successful for order ${orderId}, reference ${reference}`);
        }

        return NextResponse.json({ status: "success" });
    } catch (error: any) {
        console.error("Paystack webhook error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
