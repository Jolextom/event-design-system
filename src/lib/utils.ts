import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind CSS classes with proper precedence
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * Format date for display
 */
export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions) {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        ...options,
    });
}

/**
 * Format time for display
 */
export function formatTime(date: Date | string) {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
    });
}
/**
 * Parse a Zoom URL into meeting number and password
 */
export function parseZoomUrl(url: string) {
    if (!url) return { meetingNumber: null, password: null };

    // Common patterns:
    // https://zoom.us/j/123456789?pwd=abc
    // https://us02web.zoom.us/j/123456789/
    // https://zoom.us/s/123456789
    // https://zoom.us/w/123456789
    try {
        const u = new URL(url);

        // Remove trailing slash if present
        let path = u.pathname;
        if (path.endsWith('/')) {
            path = path.slice(0, -1);
        }

        const segments = path.split('/');
        // The meeting number is usually the last segment for /j/, /s/, /w/
        let meetingNumber = segments[segments.length - 1];

        // If the segment is not numeric-ish, it might be a vanity URL or malformed
        if (meetingNumber && !/[\d]/.test(meetingNumber)) {
            // Check if it's in a different segment? 
            // Usually not. If vanity /my/name, we can't get the MN without API.
        }

        const password = u.searchParams.get('pwd');

        return {
            meetingNumber: meetingNumber?.replace(/[^\d]/g, '') || null,
            password: password
        };
    } catch (e) {
        return { meetingNumber: null, password: null };
    }
}
