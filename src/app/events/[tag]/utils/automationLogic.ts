import { createClient } from "@supabase/supabase-js";
import { Attendee, EventVariable } from "../types";

export interface RandomSplitConfig {
    variableName: string;
    options: string[]; // e.g. ["Red", "Blue"]
}

export async function runRandomSplit(
    eventId: string,
    config: RandomSplitConfig,
    onlyEmpty: boolean = true, // Default to true for safety
    onProgress?: (progress: number, total: number) => void
): Promise<{ success: boolean; count: number; error?: string }> {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // 1. Fetch Attendees
    let query = supabase
        .from("attendees")
        .select("id, properties")
        .eq("event_id", eventId);

    // If onlyEmpty, we ideally filter in DB, but for JSONB reliability with "missing key" vs "null value",
    // fetching all and filtering in memory is robust for small-medium datasets (<10k). 
    // Let's do memory filter for now to ensure we catch "undefined" properties too.

    const { data: attendees, error: fetchError } = await query;

    if (fetchError || !attendees) {
        return { success: false, count: 0, error: fetchError?.message || "Failed to fetch attendees" };
    }

    // 2. Filter if needed
    let targets = attendees;
    if (onlyEmpty) {
        targets = attendees.filter(a => {
            const val = a.properties?.[config.variableName];
            return val === undefined || val === null || val === "";
        });
    }

    if (targets.length === 0) {
        return { success: true, count: 0 };
    }

    // 3. Shuffle Targets (Fisher-Yates)
    const shuffled = [...targets];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // 3. Assign Values
    const total = shuffled.length;
    const updatePromises: PromiseLike<any>[] = [];

    // Calculate chunk size
    const optionCount = config.options.length;

    shuffled.forEach((attendee, index) => {
        // Round robin assignment for perfect equality (or as close as possible)
        const optionIndex = index % optionCount;
        const assignedValue = config.options[optionIndex];

        const updatedProperties = {
            ...(attendee.properties || {}),
            [config.variableName]: assignedValue
        };

        const p = supabase
            .from("attendees")
            .update({ properties: updatedProperties })
            .eq("id", attendee.id)
            .then(() => {
                if (onProgress) onProgress(index + 1, total);
            });

        updatePromises.push(p);
    });

    // 4. Wait for all updates (batching would be better for huge datasets, but ok for now)
    await Promise.all(updatePromises);

    return { success: true, count: total };
}
