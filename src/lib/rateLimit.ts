/**
 * Small in-memory rate limiter for public endpoints that can send email.
 *
 * HONEST LIMITS: on serverless hosting each instance has its own memory, so this
 * only slows down naive abuse (one script hammering one endpoint). The real
 * protection against email cost is the per-attendee budget in guests.ts, which
 * is stored in the database and so holds across instances.
 */
const hits = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs: number, now: number = Date.now()): { ok: boolean; retryAfterSec: number } {
    const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
    if (recent.length >= limit) {
        hits.set(key, recent);
        return { ok: false, retryAfterSec: Math.max(1, Math.ceil((windowMs - (now - recent[0])) / 1000)) };
    }
    recent.push(now);
    hits.set(key, recent);
    // keep the map from growing forever
    if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
    return { ok: true, retryAfterSec: 0 };
}

export function resetRateLimits() {
    hits.clear();
}
