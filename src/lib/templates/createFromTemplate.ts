import type { SupabaseClient } from "@supabase/supabase-js";
import type { EventTemplate, TemplateInput, TemplateVariant } from "./types";

export type CreateFromTemplateResult =
    | { ok: true; tag: string; eventId: string }
    | {
          ok: false;
          error: string;
          /** When the database is missing columns: the SQL to run once in the Supabase SQL editor. */
          sql?: string;
      };

type Values = Record<string, string>;

const slugify = (title: string) =>
    title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/** "2026-12-10T23:59" written in the template's timezone (e.g. +01:00) -> ISO instant. */
export function localToIso(local: string, tzOffset: string): string {
    return new Date(`${local}:00${tzOffset}`).toISOString();
}

/**
 * Every database column creating from a template writes, and the SQL that adds it
 * if it's missing. Older databases may not have some of these (for example
 * passes.group_size is only ever written when someone makes a group ticket), so
 * we check before creating anything instead of failing half-way.
 */
export const COLUMN_SQL: Record<string, string> = {
    "passes.type": "ALTER TABLE public.passes ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'individual';",
    "passes.group_size": "ALTER TABLE public.passes ADD COLUMN IF NOT EXISTS group_size INTEGER;",
    "passes.max_per_person": "ALTER TABLE public.passes ADD COLUMN IF NOT EXISTS max_per_person INTEGER;",
    "passes.display_order": "ALTER TABLE public.passes ADD COLUMN IF NOT EXISTS display_order INTEGER;",
    "passes.sales_end_at": "ALTER TABLE public.passes ADD COLUMN IF NOT EXISTS sales_end_at TIMESTAMP WITH TIME ZONE;",
    "events.registration_closes_at": "ALTER TABLE public.events ADD COLUMN IF NOT EXISTS registration_closes_at TIMESTAMP WITH TIME ZONE;",
};

/** The columns this variant will write, as "table.column". */
export function requiredColumns(variant: TemplateVariant): string[] {
    const cols = new Set<string>(["passes.type", "passes.display_order"]);
    for (const p of variant.passes) {
        cols.add(p.type === "group" ? "passes.group_size" : "passes.max_per_person");
        if (p.salesEndInput) cols.add("passes.sales_end_at");
    }
    if (variant.registrationClosesInput) cols.add("events.registration_closes_at");
    return [...cols];
}

/** SQL for the given missing columns, plus a schema-cache reload so the API sees them straight away. */
export function sqlForMissing(missing: string[]): string {
    return [...missing.map((m) => COLUMN_SQL[m]).filter(Boolean), "NOTIFY pgrst, 'reload schema';"].join("\n");
}

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

    // 1. Make sure the database has every column we're about to write, BEFORE creating anything.
    const needed = requiredColumns(variant);
    const probes = await Promise.all(
        needed.map(async (full) => {
            const [table, column] = full.split(".");
            const { error } = await supabase.from(table).select(column).limit(1);
            return error ? full : null;
        })
    );
    const missing = probes.filter((x): x is string => !!x);
    if (missing.length) {
        return {
            ok: false,
            error:
                `Your database is missing ${missing.length === 1 ? "a column" : `${missing.length} columns`} this needs (${missing.join(", ")}). ` +
                "Run the SQL below once in the Supabase SQL editor, then press Create again. Nothing was created.",
            sql: sqlForMissing(missing),
        };
    }

    // 2. Duplicates. A finished event with this title blocks us; an UNFINISHED draft (no tickets:
    //    left behind by an earlier failed attempt) is picked up and completed instead.
    const { data: existing, error: dupErr } = await supabase
        .from("events")
        .select("id, tag, is_published")
        .eq("created_by", userId)
        .eq("event_title", title)
        .limit(1);
    if (dupErr) return { ok: false, error: `Couldn't check your existing events: ${dupErr.message}` };

    let resuming: { id: string; tag: string } | null = null;
    if (existing && existing.length > 0) {
        const ex = existing[0];
        const { data: exPasses, error: exErr } = await supabase.from("passes").select("id").eq("event_id", ex.id).limit(1);
        if (exErr) return { ok: false, error: `Couldn't check your existing event: ${exErr.message}` };
        if (ex.is_published || (exPasses && exPasses.length > 0)) {
            return { ok: false, error: `You already have "${title}". Open it from your events list instead.` };
        }
        resuming = { id: ex.id, tag: ex.tag };
    }

    // 3. The event.
    const startIso = localToIso(`${template.date}T${template.startTime}`, template.tzOffset);
    const endIso = localToIso(`${template.date}T${p.endTime as string}`, template.tzOffset);
    const tag = resuming?.tag ?? `${slugify(title)}-${Math.random().toString(36).substring(2, 6)}`;

    const eventRow: Record<string, unknown> = {
        event_title: title,
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

    const clearChildren = async (eventId: string) => {
        const { data: qs } = await supabase.from("questions").select("id").eq("event_id", eventId);
        const qIds = (qs ?? []).map((q: { id: string }) => q.id);
        if (qIds.length) await supabase.from("question_options").delete().in("question_id", qIds);
        await supabase.from("questions").delete().eq("event_id", eventId);
        await supabase.from("passes").delete().eq("event_id", eventId);
    };

    let event: { id: string };
    if (resuming) {
        // Start the unfinished draft from a clean slate, then refresh its details.
        try { await clearChildren(resuming.id); } catch { /* best effort */ }
        const { error: upErr } = await supabase.from("events").update(eventRow).eq("id", resuming.id);
        if (upErr) return { ok: false, error: `Couldn't update your unfinished draft: ${upErr.message}` };
        event = { id: resuming.id };
    } else {
        const { data: created, error: eventErr } = await supabase
            .from("events")
            .insert({ ...eventRow, created_by: userId, tag })
            .select()
            .single();
        if (eventErr || !created) return { ok: false, error: `Couldn't create the event: ${eventErr?.message ?? "unknown error"}` };
        event = created;
    }

    // If a later step fails, undo what we made. Deleting the EVENT row can be blocked by your
    // database's access rules (the dashboard has no delete-event button), so we check, and say
    // so honestly: a leftover draft is harmless and Create will finish it next time.
    const failWith = async (what: string, message: string): Promise<CreateFromTemplateResult> => {
        let removed = false;
        try {
            await clearChildren(event.id);
            await supabase.from("events").delete().eq("id", event.id);
            const { data: still } = await supabase.from("events").select("id").eq("id", event.id).limit(1);
            removed = !still || still.length === 0;
        } catch {
            /* best effort */
        }
        return {
            ok: false,
            error:
                `Couldn't create the ${what}: ${message}. ` +
                (removed
                    ? "Nothing was left behind."
                    : `An unfinished draft of "${title}" is in your events list. That's harmless: press Create again and it will be completed.`),
        };
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
