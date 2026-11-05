"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StockMeterState } from "@/lib/stockMeter";

/**
 * "How many are left" under a limited ticket: the bar fills to what has gone, the line says it in words,
 * and it gets louder as the stock runs down. Colours come from the page's theme variables.
 * It is only ever drawn with real numbers (see src/lib/stockMeter.ts).
 */
export function StockMeter({ meter }: { meter: StockMeterState }) {
    const reduce = useReducedMotion();
    const loud = meter.tone === "last";
    const warm = meter.tone !== "calm";

    return (
        <div className="mt-2.5 space-y-1.5" data-testid="stock-meter" data-tone={meter.tone}>
            <div className="flex items-center gap-2 text-sm font-semibold text-[color:var(--pg-accent)]">
                {warm && (
                    <span className="relative flex h-4 w-4 shrink-0 items-center justify-center" aria-hidden>
                        {loud && !reduce && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[color:var(--pg-accent)] opacity-30" />}
                        <Flame className={cn("relative h-4 w-4", loud && !reduce && "animate-pulse")} />
                    </span>
                )}
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

            <div
                role="progressbar"
                aria-label="Share of this ticket already claimed"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={meter.percentClaimed}
                className="h-1.5 w-full overflow-hidden rounded-full bg-[color:var(--pg-border)]"
            >
                <motion.div
                    className={cn("h-full rounded-full bg-[color:var(--pg-accent)]", loud && !reduce && "animate-pulse")}
                    style={loud ? { boxShadow: "0 0 10px var(--pg-accent)" } : undefined}
                    initial={reduce ? false : { width: 0 }}
                    animate={{ width: `${meter.percentClaimed}%` }}
                    transition={{ duration: 0.9, ease: "easeOut" }}
                    data-testid="stock-bar"
                />
            </div>

            {meter.note && <p className="text-xs text-[color:var(--pg-muted)]">{meter.note}</p>}
        </div>
    );
}
