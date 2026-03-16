import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendInviteEmail, sendConfirmationEmail } from '@/lib/email';
import { generateGoogleCalendarLink, generateOutlookLink } from '@/lib/calendar';

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
            .select('event_title, start_date, start_time, location, tag')
            .eq('id', attendee.event_id)
            .single();

        if (eventErr || !event) {
            return NextResponse.json(
                { error: 'Event not found' },
                { status: 404 }
            );
        }

        // Base URL and Date Formatting (Common)
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const eventDate = event.start_date
            ? new Date(event.start_date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            })
            : 'TBA';

        // Calendar Links
        const startDateTime = event.start_date && event.start_time 
            ? `${event.start_date}T${event.start_time}:00` 
            : event.start_date;
        
        const googleCalendarLink = startDateTime ? generateGoogleCalendarLink({
            title: event.event_title,
            location: event.location || 'TBA',
            startDate: startDateTime,
            description: `Registration Ref: ${attendee.ref}`
        }) : undefined;

        const outlookCalendarLink = startDateTime ? generateOutlookLink({
            title: event.event_title,
            location: event.location || 'TBA',
            startDate: startDateTime,
            description: `Registration Ref: ${attendee.ref}`
        }) : undefined;

        // Check for confirmation status
        const isConfirmed = attendee.email_status === 'confirmed' || attendee.email_status === 'registered';

        if (isConfirmed) {
            // Send Confirmation Email
            const receiptLink = `${baseUrl}/${event.tag}/receipt/${attendee.ref}`;
            const watchLink = `${baseUrl}/${event.tag}/join?token=${attendeeId}`;

            // Send email
            const result = await sendConfirmationEmail({
                to: attendee.email,
                eventTitle: event.event_title,
                eventDate,
                eventLocation: event.location || 'TBA',
                orderRef: attendee.ref,
                receiptLink,
                watchLink,
                attendeeName: `${attendee.first_name} ${attendee.last_name}`,
                googleCalendarLink,
                outlookCalendarLink
            });

            if (!result.success) {
                return NextResponse.json(
                    { error: 'Failed to send confirmation email' },
                    { status: 500 }
                );
            }

            // Update last_email_sent
            await supabase
                .from('attendees')
                .update({ last_email_sent: new Date().toISOString() })
                .eq('id', attendeeId);

            // Record delivery
            await supabase
                .from('email_deliveries')
                .insert({
                    attendee_id: attendeeId,
                    event_id: attendee.event_id,
                    email_type: 'confirmation',
                    status: 'sent',
                    resend_id: result.data ? result.data.id : null,
                    template_type: 'confirmation',
                    template_params: {
                        eventTitle: event.event_title,
                        eventDate,
                        eventLocation: event.location || 'TBA',
                        orderRef: attendee.ref,
                        receiptLink,
                        watchLink,
                        attendeeName: `${attendee.first_name} ${attendee.last_name}`,
                        recipient_email: attendee.email,
                        googleCalendarLink,
                        outlookCalendarLink
                    },
                    created_at: new Date().toISOString()
                });
        } else {
            // Send Invite Email
            const inviteLink = `${baseUrl}/${event.tag}/join/${attendee.ref}`;

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
                googleCalendarLink,
                outlookCalendarLink
            });

            if (!result.success) {
                return NextResponse.json(
                    { error: 'Failed to send invite email' },
                    { status: 500 }
                );
            }

            // Update last_email_sent
            await supabase
                .from('attendees')
                .update({ last_email_sent: new Date().toISOString() })
                .eq('id', attendeeId);

            // Record delivery
            await supabase
                .from('email_deliveries')
                .insert({
                    attendee_id: attendeeId,
                    event_id: attendee.event_id,
                    email_type: 'invite',
                    status: 'sent',
                    resend_id: result.data ? result.data.id : null,
                    template_type: 'invite',
                    template_params: {
                        eventTitle: event.event_title,
                        eventDate,
                        eventLocation: event.location || 'TBA',
                        inviterName,
                        passType: attendee.pass?.title || 'General Admission',
                        inviteLink,
                        recipient_email: attendee.email,
                        googleCalendarLink,
                        outlookCalendarLink
                    },
                    created_at: new Date().toISOString()
                });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Send invite error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
