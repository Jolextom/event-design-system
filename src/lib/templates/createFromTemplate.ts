import type { SupabaseClient } from "@supabase/supabase-js";
import type { EventTemplate, TemplateInput, TemplateVariant } from "./types";

export type CreateFromTemplateResult =
    | { ok: true; tag: string; eventId: string }
    | { ok: false; error: string };

type Values = Record<string, string>;

const slugify = (title: string) =>
    title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/** "2026-12-10T23:59" written in the template's timezone (e.g. +01:00) -> ISO instant. */
export function localToIso(local: string, tzOffset: string): string {
    return new Date(`${local}:00${tzOffset}`).toISOString();
}

const MIGRATION_HINT =
    "Your database needs a one-time update before this can be created. " +
    "Run the last block of supabase/schema.sql (headed \"Checkout: sale windows, registration deadline, fees…\") in the Supabase SQL editor, then try again.";

/**
 * Checks what the organiser typed. Returns an error message, or the parsed values.
 * Pure, so it is unit-tested.
 */
export function parseInputs(
    template: EventTemplate,
    variant: TemplateVariant,
    values: Values
): { ok: true; parsed: Record<string, string | number> } | { ok: false; error: string } {
    const parsed: Record<string, string | number> = {};
    const inputs: TemplateInput[] = [...template.inputs, ...variant.inputs];

    for (const input of inputs) {
        const raw = (values[input.key] ?? "").toString().trim();
        if (!raw) {
            if (input.required) return { ok: false, error: `${input.label} is required.` };
            continue;
        }
        if (input.type === "number") {
            const n = Number(raw);
            if (!Number.isInteger(n) || n < 1) return { ok: false, error: `${input.label} must be a whole number of 1 or more.` };
            parsed[input.key] = n;
        } else if (input.type === "time") {
            if (!/^\d{2}:\d{2}$/.test(raw)) return { ok: false, error: `${input.label} must look like 18:00.` };
            parsed[input.key] = raw;
        } else {
            if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(raw) || Number.isNaN(Date.parse(`${raw}:00${template.tzOffset}`))) {
                return { ok: false, error: `${input.label} isn't a valid date and time.` };
            }
            parsed[input.key] = raw;
        }
    }

    const endTime = parsed.endTime as string | undefined;
    if (endTime && endTime <= template.startTime) {
        return { ok: false, error: `The end time must be after the ${template.startTime} start.` };
    }
    return { ok: true, parsed };
}

/**
 * Creates the template's event for `userId` using the caller's own Supabase
 * client (the logged-in organiser's session). Everything is written as that
 * user, so it shows up in their dashboard like an event they created by hand.
 *
 * Never publishes. Refuses to create a duplicate. If a step fails part-way it
 * removes what it just created (best effort) and says what went wrong.
 */
export async function createEventFromTemplate(args: {
    supabase: SupabaseClient;
    userId: string;
    template: EventTemplate;
    variantId: string;
    values: Values;
    /** Site origin, used to make the cover image URL absolute, e.g. https://maincharacterfest.vercel.app */
    origin?: string;
}): Promise<CreateFromTemplateResult> {
    const { supabase, userId, template, variantId, values, origin } = args;

    const variant = template.variants.find((v) => v.id === variantId);
    if (!variant) return { ok: false, error: "Unknown template option." };

    const checked = parseInputs(template, variant, values);
    if (!checked.ok) return checked;
    const p = checked.parsed;

    const title = template.title + (variant.titleSuffix ?? "");
    const usesNewColumns = !!variant.registrationClosesInput || variant.passes.some((x) => x.salesEndInput);

    // 1. Make sure the database has the columns we're about to write, BEFORE creating anything.
    if (usesNewColumns) {
        const [ev, ps] = await Promise.all([
            supabase.from("events").select("registration_closes_at").limit(1),
            supabase.from("passes").select("sales_end_at").limit(1),
        ]);
        if (ev.error || ps.error) return { ok: false, error: MIGRATION_HINT };
    }

    // 2. No duplicates.
    const { data: existing, error: dupErr } = await supabase
        .from("events")
        .select("id, tag")
        .eq("created_by", userId)
        .eq("event_title", title)
        .limit(1);
    if (dupErr) return { ok: false, error: `Couldn't check your existing events: ${dupErr.message}` };
    if (existing && existing.length > 0) {
        return { ok: false, error: `You already have "${title}". Open it from your events list instead.` };
    }

    // 3. The event.
    const startIso = localToIso(`${template.date}T${template.startTime}`, template.tzOffset);
    const endIso = localToIso(`${template.date}T${p.endTime as string}`, template.tzOffset);
    const tag = `${slugify(title)}-${Math.random().toString(36).substring(2, 6)}`;

    const eventRow: Record<string, unknown> = {
        created_by: userId,
        event_title: title,
        tag,
        event_format: "physical",
        start_date: startIso,
        end_date: endIso,
        start_time: template.startTime,
        end_time: p.endTime,
        is_published: false,
        location: template.location,
        description: template.description,
    };
    if (template.coverPath && origin) {
        eventRow.image = `${origin.replace(/\/$/, "")}${template.coverPath}`;
        eventRow.image_focus_y = 50;
    }
    if (variant.registrationClosesInput) {
        eventRow.registration_closes_at = localToIso(p[variant.registrationClosesInput] as string, template.tzOffset);
    }

    const { data: event, error: eventErr } = await supabase.from("events").insert(eventRow).select().single();
    if (eventErr || !event) return { ok: false, error: `Couldn't create the event: ${eventErr?.message ?? "unknown error"}` };

    const rollback = async () => {
        try {
            const { data: qs } = await supabase.from("questions").select("id").eq("event_id", event.id);
            const qIds = (qs ?? []).map((q: { id: string }) => q.id);
            if (qIds.length) await supabase.from("question_options").delete().in("question_id", qIds);
            await supabase.from("questions").delete().eq("event_id", event.id);
            await supabase.from("passes").delete().eq("event_id", event.id);
            await supabase.from("events").delete().eq("id", event.id);
        } catch {
            /* best effort */
        }
    };
    const failWith = async (what: string, message: string): Promise<CreateFromTemplateResult> => {
        await rollback();
        return { ok: false, error: `Couldn't create the ${what}: ${message}. Nothing was left half-made.` };
    };

    // 4. Registration questions (+ their options).
    const questionRows = template.questions.map((q, i) => ({
        event_id: event.id,
        campaign_id: null,
        title: q.title,
        question_type: q.type,
        is_required: !!q.required,
        question_order: i,
        page: q.page,
        logic_rules: null,
        property_key: q.property_key ?? null,
        scale_config: null,
        is_selection_logic: false,
    }));
    const { data: insertedQs, error: qErr } = await supabase.from("questions").insert(questionRows).select();
    if (qErr || !insertedQs || insertedQs.length !== questionRows.length) {
        return failWith("registration form", qErr?.message ?? "unexpected response");
    }
    const optionRows: { question_id: string; option_text: string; display_order: number }[] = [];
    template.questions.forEach((q, i) =>
        (q.options ?? []).forEach((text, oi) => optionRows.push({ question_id: insertedQs[i].id, option_text: text, display_order: oi }))
    );
    if (optionRows.length) {
        const { error: oErr } = await supabase.from("question_options").insert(optionRows);
        if (oErr) return failWith("form options", oErr.message);
    }

    // 5. Tickets.
    const passRows = variant.passes.map((pass, i) => ({
        event_id: event.id,
        title: pass.title,
        description: pass.description ?? null,
        price: pass.price,
        is_free: pass.price === 0,
        type: pass.type,
        quantity_available: typeof pass.quantity === "number" ? pass.quantity : (p[pass.quantity.input] as number),
        display_order: i,
        ...(pass.type === "group" ? { group_size: pass.groupSize } : { max_per_person: 1 }),
        ...(pass.salesEndInput ? { sales_end_at: localToIso(p[pass.salesEndInput] as string, template.tzOffset) } : {}),
    }));
    const { error: pErr } = await supabase.from("passes").insert(passRows);
    if (pErr) return failWith("tickets", pErr.message);

    return { ok: true, tag, eventId: event.id };
}
