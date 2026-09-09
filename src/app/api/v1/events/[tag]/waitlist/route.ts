import { NextRequest } from "next/server";
import { adminClient, corsJson, corsPreflight } from "@/lib/apiV1";

export async function OPTIONS(req: NextRequest) {
    return corsPreflight(req);
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ tag: string }> }
) {
    const { tag } = await params;

    try {
        const supabase = adminClient();
        const body = await req.json();
        const { name, email, phone, organization, role, type = "livestream", track = "individual" } = body;

        if (!name || !name.trim()) {
            return corsJson(req, { error: "Full Name is required" }, { status: 400 });
        }
        if (!email || !email.trim() || !email.includes("@")) {
            return corsJson(req, { error: "A valid Email address is required" }, { status: 400 });
        }
        if (!organization || !organization.trim()) {
            return corsJson(req, { error: "Organisation / School name is required" }, { status: 400 });
        }
        if (!role || !role.trim()) {
            return corsJson(req, { error: "Role is required" }, { status: 400 });
        }
        if (type === "waitlist" && (!phone || !phone.trim())) {
            return corsJson(req, { error: "Phone number (WhatsApp) is required for in-person waitlist" }, { status: 400 });
        }

        // 1. Fetch Event
        const { data: event, error: eventErr } = await supabase
            .from("events")
            .select("id, event_title, tag, created_by, start_date, location")
            .eq("tag", tag)
            .single();

        if (eventErr || !event) {
            return corsJson(req, { error: "Event not found" }, { status: 404 });
        }

        const cleanEmail = email.trim().toLowerCase();
        const nameParts = name.trim().split(/\s+/);
        const firstName = nameParts[0] || "";
        const lastName = nameParts.slice(1).join(" ") || "";
        const cleanPhone = (phone || "").trim();
        const cleanOrg = organization.trim();
        const cleanRole = role.trim();
        const cleanType = type === "waitlist" ? "waitlist" : "livestream";
        const cleanTrack = track === "school" ? "school" : "individual";

        // 2. Check if already in attendees table
        const { data: existing } = await supabase
            .from("attendees")
            .select("id, email, properties")
            .eq("event_id", event.id)
            .eq("email", cleanEmail)
            .maybeSingle();

        if (existing) {
            if (!existing.properties?.waitlist && !existing.properties?.livestream) {
                return corsJson(req, {
                    status: "already_registered",
                    type: cleanType,
                    message: "You are already registered for an in-person pass! Check your inbox for your check-in code."
                });
            }

            // Update existing waitlist / livestream entry
            await supabase.from("attendees").update({
                first_name: firstName,
                last_name: lastName,
                properties: {
                    ...(existing.properties || {}),
                    type: cleanType,
                    waitlist: cleanType === "waitlist",
                    livestream: cleanType === "livestream",
                    track: cleanTrack,
                    organization: cleanOrg,
                    role: cleanRole,
                    phone: cleanPhone,
                    updated_at: new Date().toISOString()
                }
            }).eq("id", existing.id);

            return corsJson(req, {
                status: "success",
                type: cleanType,
                message: cleanType === "livestream"
                    ? "Your livestream registration has been updated! We will email you the broadcast link tomorrow morning before 9:00am."
                    : "Your waitlist entry has been updated! We will notify you if an in-person seat opens up at UNILAG."
            });
        }

        // 3. New Entry
        const refCode = `EF-${cleanType === "waitlist" ? "WL" : "LS"}-${crypto.randomUUID().replace(/-/g, "").substring(0, 8).toUpperCase()}`;

        const { error: insertErr } = await supabase.from("attendees").insert({
            event_id: event.id,
            first_name: firstName,
            last_name: lastName,
            email: cleanEmail,
            ref: refCode,
            properties: {
                type: cleanType,
                waitlist: cleanType === "waitlist",
                livestream: cleanType === "livestream",
                track: cleanTrack,
                organization: cleanOrg,
                role: cleanRole,
                phone: cleanPhone,
                created_at: new Date().toISOString()
            }
        });

        if (insertErr) {
            console.error("Failed to insert waitlist entry:", insertErr);
            return corsJson(req, { error: "Failed to save registration. Please try again." }, { status: 500 });
        }

        // 4. Send Confirmation Email via Resend if available
        try {
            const { data: sender } = await supabase
                .from("sender_identities")
                .select("from_name, from_email, resend_api_key")
                .eq("user_id", event.created_by)
                .eq("status", "verified")
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();

            const resendKey = process.env.RESEND_API_KEY || sender?.resend_api_key;
            const fromHeader = sender ? `${sender.from_name} <${sender.from_email}>` : "Kini AI <summit@kini-ai.com>";

            if (resendKey) {
                const isWaitlist = cleanType === "waitlist";
                const subject = isWaitlist
                    ? `You're on the Waitlist for ${event.event_title}`
                    : `You're registered for the ${event.event_title} Livestream`;

                const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#1255fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
<table role="presentation" style="width:100%;border-collapse:collapse;"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" style="width:100%;max-width:520px;border-collapse:collapse;">
<tr><td style="padding-bottom:20px;text-align:center;"><span style="font-weight:800;font-size:15px;letter-spacing:2px;color:#ffffff;text-transform:uppercase;">AAES &middot; AI for Africa&#39;s Education Summit</span></td></tr>
<tr><td style="background:#ffffff;border-radius:20px;overflow:hidden;padding:36px 32px;">
<div style="display:inline-block;background:${isWaitlist ? '#fffae3' : '#d1fefb'};color:#01123c;padding:6px 14px;border-radius:100px;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:20px;">${isWaitlist ? 'Physical Standby' : 'Virtual Attendance'}</div>
<h1 style="margin:0 0 12px;font-size:24px;line-height:1.3;font-weight:800;color:#01123c;">Hello ${firstName || "there"},</h1>
<p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#01123c;">
${isWaitlist
    ? "You are now on the <strong>In-Person Waitlist</strong> for the Summit at the Faculty of Social Sciences Lecture Theatre, UNILAG. Because physical hall capacity is full, seats are allocated on standby. If an opening becomes available, we will contact you immediately via email and WhatsApp."
    : "You are successfully registered for the <strong>Official Livestream Broadcast</strong> of the Summit! You will experience all keynotes, panel discussions, and student hackathon presentations in real time."}
</p>
<div style="background:#f1f5f9;border-radius:14px;padding:18px 20px;margin-bottom:24px;">
<p style="margin:0 0 6px;font-size:13px;font-weight:800;color:#01123c;text-transform:uppercase;letter-spacing:1px;">Event Details</p>
<p style="margin:0 0 4px;font-size:14px;color:#01123c;"><strong>Date:</strong> Thursday, 10 September 2026 &middot; 9:00 AM Prompt</p>
<p style="margin:0 0 4px;font-size:14px;color:#01123c;"><strong>Broadcast:</strong> Direct link will be sent to your email early tomorrow morning before 9:00 AM.</p>
</div>
<p style="margin:0;font-size:14px;line-height:1.6;color:#01123c;">Thank you for your interest in the future of education in Africa.<br><br><strong>Kini AI Team</strong></p>
</td></tr>
<tr><td style="padding-top:20px;text-align:center;"><p style="margin:0;font-size:12px;color:#ffffff;">Kini AI &middot; <a href="https://kini-ai.com/summit" style="color:#ffffff;">kini-ai.com/summit</a></p></td></tr>
</table></td></tr></table></body></html>`;

                await fetch("https://api.resend.com/emails", {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${resendKey}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        from: fromHeader,
                        to: [cleanEmail],
                        subject,
                        html,
                    }),
                });
            }
        } catch (mailErr) {
            console.warn("Could not send confirmation email:", mailErr);
        }

        return corsJson(req, {
            status: "success",
            type: cleanType,
            message: cleanType === "livestream"
                ? "You're registered for the livestream! We'll email you the direct broadcast link tomorrow morning before 9:00am."
                : "You've been added to the physical waitlist! We will contact you if in-person seats become available."
        });

    } catch (err: any) {
        console.error("Waitlist error:", err);
        return corsJson(req, { error: err.message || "Something went wrong" }, { status: 500 });
    }
}
