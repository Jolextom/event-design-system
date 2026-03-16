/**
 * Utility to generate "Add to Calendar" links
 */

export interface CalendarEvent {
    title: string;
    description?: string;
    location?: string;
    startDate: string; // ISO string
    endDate?: string;  // ISO string
}

function formatGoogleDate(date: Date): string {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

/**
 * Generates a Google Calendar link
 */
export function generateGoogleCalendarLink(event: CalendarEvent): string {
    const start = new Date(event.startDate);
    const end = event.endDate 
        ? new Date(event.endDate) 
        : new Date(start.getTime() + 60 * 60 * 1000); // Default 1 hour

    const url = new URL("https://calendar.google.com/calendar/render");
    url.searchParams.append("action", "TEMPLATE");
    url.searchParams.append("text", event.title);
    url.searchParams.append("dates", `${formatGoogleDate(start)}/${formatGoogleDate(end)}`);
    if (event.description) url.searchParams.append("details", event.description);
    if (event.location) url.searchParams.append("location", event.location);

    return url.toString();
}

/**
 * Generates an Outlook.com (Web) calendar link
 */
export function generateOutlookLink(event: CalendarEvent): string {
    const start = new Date(event.startDate);
    const end = event.endDate 
        ? new Date(event.endDate) 
        : new Date(start.getTime() + 60 * 60 * 1000);

    const url = new URL("https://outlook.office.com/calendar/0/deeplink/compose");
    url.searchParams.append("path", "/calendar/action/compose");
    url.searchParams.append("rru", "addevent");
    url.searchParams.append("subject", event.title);
    url.searchParams.append("startdt", start.toISOString());
    url.searchParams.append("enddt", end.toISOString());
    if (event.description) url.searchParams.append("body", event.description);
    if (event.location) url.searchParams.append("location", event.location);

    return url.toString();
}
