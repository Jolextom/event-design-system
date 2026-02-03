import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendInviteEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { attendeeId, eventTag } = body;

        if (!attendeeId || !eventTag) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        // Fetch attendee
        const { data: attendee, error: attendeeErr } = await supabase
            .from('attendees')
            .select('*, order:order_id(first_name, last_name), pass:pass_id(title)')
            .eq('id', attendeeId)
            .single();

        if (attendeeErr || !attendee) {
            return NextResponse.json(
                { error: 'Attendee not found' },
                { status: 404 }
            );
        }

        // Fetch event
        const { data: event, error: eventErr } = await supabase
            .from('events')
            .select('event_title, start_date, location, tag')
            .eq('id', attendee.event_id)
            .single();

        if (eventErr || !event) {
            return NextResponse.json(
                { error: 'Event not found' },
                { status: 404 }
            );
        }

        // Build invite link
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const inviteLink = `${baseUrl}/${event.tag}/join/${attendee.ref}`;

        // Format date
        const eventDate = event.start_date
            ? new Date(event.start_date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            })
            : 'TBA';

        // Get inviter name
        const inviterName = attendee.order
            ? `${attendee.order.first_name} ${attendee.order.last_name}`.trim()
            : 'Someone';

        // Send email
        const result = await sendInviteEmail({
            to: attendee.email,
            eventTitle: event.event_title,
            eventDate,
            eventLocation: event.location || 'TBA',
            inviterName,
            passType: attendee.pass?.title || 'General Admission',
            inviteLink,
        });

        if (!result.success) {
            return NextResponse.json(
                { error: 'Failed to send email' },
                { status: 500 }
            );
        }

        // Update last_email_sent timestamp
        await supabase
            .from('attendees')
            .update({ last_email_sent: new Date().toISOString() })
            .eq('id', attendeeId);

        // Record email delivery
        await supabase
            .from('email_deliveries')
            .insert({
                attendee_id: attendeeId,
                event_id: attendee.event_id,
                email_type: 'invite',
                status: 'sent',
                resend_id: result.success && result.data ? result.data.id : null,
                created_at: new Date().toISOString()
            });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Send invite error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
