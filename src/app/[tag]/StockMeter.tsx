"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StockMeterState } from "@/lib/stockMeter";

/**
 * "Only N left" under a limited ticket. It says how many are left and nothing about how many have gone
 * (see src/lib/stockMeter.ts), and it gets hotter as the number drops: a quiet flame, then a pulsing one,
 * then a glowing pill. Colours come from the page's theme variables.
 */
export function StockMeter({ meter }: { meter: StockMeterState }) {
    const reduce = useReducedMotion();
    const hot = meter.tone !== "calm";
    const loud = meter.tone === "last";

    return (
        <div className="mt-2.5" data-testid="stock-meter" data-tone={meter.tone}>
            <div
                className="inline-flex items-center gap-2 rounded-full border bg-[color:var(--pg-selected)] px-3 py-1.5 text-sm font-bold text-[color:var(--pg-accent)]"
                style={{
                    borderColor: "color-mix(in srgb, var(--pg-accent) 45%, transparent)",
                    boxShadow: loud ? "0 0 18px -2px var(--pg-accent)" : undefined,
                }}
            >
                <span className="relative flex h-4 w-4 shrink-0 items-center justify-center" aria-hidden>
                    {loud && !reduce && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[color:var(--pg-accent)] opacity-30" />}
                    <Flame className={cn("relative h-4 w-4", hot && !reduce && "animate-pulse")} />
                </span>
                {/* Re-keyed on the words, so a change (someone just claimed one) slides in instead of snapping. */}
                <motion.span
                    key={meter.headline}
                    initial={reduce ? false : { opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    data-testid="stock-headline"
                >
                    {meter.headline}
                </motion.span>
            </div>
        </div>
    );
}
