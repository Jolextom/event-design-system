import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Shared helpers for the public v1 API — the headless layer that external
 * sites (e.g. the Kini AI WordPress site) use to display events/campaigns
 * and submit registrations/survey responses from their own frontends.
 *
 * CORS: allowed origins come from API_ALLOWED_ORIGINS (comma-separated).
 * "*" allows any origin — fine for public read endpoints; submission
 * endpoints are still safe because they only touch public flows
 * (registration/survey submit) that are deliberately public anyway.
 */

function getAllowedOrigins(): string[] {
    return (process.env.API_ALLOWED_ORIGINS || "*")
        .split(",")
        .map(o => o.trim())
        .filter(Boolean);
}

export function corsHeaders(req: NextRequest): Record<string, string> {
    const origin = req.headers.get("origin") || "";
    const allowed = getAllowedOrigins();
    const allowOrigin = allowed.includes("*")
        ? "*"
        : (allowed.includes(origin) ? origin : allowed[0] || "");

    return {
        "Access-Control-Allow-Origin": allowOrigin,
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "86400",
    };
}

export function corsJson(req: NextRequest, body: unknown, init?: { status?: number }) {
    return NextResponse.json(body, {
        status: init?.status ?? 200,
        headers: corsHeaders(req),
    });
}

export function corsPreflight(req: NextRequest) {
    return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

/** Service-role client for API routes (bypasses RLS; server-only). */
export function adminClient(): SupabaseClient {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
}

/** Shapes a raw question row (+joined options) into the public API contract. */
export function shapeQuestion(q: any) {
    return {
        id: q.id,
        title: q.title,
        type: q.question_type,
        required: q.is_required,
        order: q.question_order,
        page: q.page || 1,
        is_selection_logic: q.is_selection_logic || false,
        options: (q.options || [])
            .sort((a: any, b: any) => a.display_order - b.display_order)
            .map((o: any) => ({ id: o.id, text: o.option_text })),
        scale: q.scale_config || null,
        logic: q.logic_rules || null,
    };
}
