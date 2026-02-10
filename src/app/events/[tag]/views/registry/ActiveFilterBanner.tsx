import React from "react";
import { Filter, ChevronRight, X, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Group } from "../../types";

interface BreakdownOption {
    label: string;
    count: number;
    pct: number;
    color: string;
    guests: any[];
}

interface ActiveFilterBannerProps {
    activeFilter: { group: Group; breakdown?: string | null };
    onClear: () => void;
    onSelectBreakdown?: (breakdown: string | null) => void;
}

export function ActiveFilterBanner({ activeFilter, onClear, onSelectBreakdown }: ActiveFilterBannerProps) {
    const groupWithOptions = activeFilter.group as Group & { options?: BreakdownOption[] };
    const hasOptions = groupWithOptions.type === 'breakdown' && groupWithOptions.options && groupWithOptions.options.length > 0;

    // Sort options by count descending
    const sortedOptions = hasOptions
        ? groupWithOptions.options!.slice().sort((a, b) => b.count - a.count)
        : [];

    // Calculate "All" count
    const totalCount = sortedOptions.reduce((sum, opt) => sum + opt.count, 0);

    return (
        <div className="border-b border-blue-100 animate-in slide-in-from-top-2 duration-200 bg-blue-50/50">
            {/* Top bar: Segment name + clear */}
            <div className="px-4 lg:px-10 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center border", activeFilter.group.color)}>
                        <Filter className="w-4 h-4" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-blue-400">Active Filter</p>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-gray-900">{activeFilter.group.name}</span>
                            {!hasOptions && activeFilter.breakdown && (
                                <>
                                    <ChevronRight className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm font-medium text-gray-600">{activeFilter.breakdown}</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
                <button
                    onClick={onClear}
                    className="p-2 hover:bg-blue-100/50 rounded-lg text-blue-600 transition-colors"
                    title="Clear Filter"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Breakdown option pills */}
            {hasOptions && onSelectBreakdown && (
                <div className="px-4 lg:px-10 pb-3 flex items-center gap-2 overflow-x-auto custom-scrollbar">
                    {/* "All" pill */}
                    <button
                        onClick={() => onSelectBreakdown(null)}
                        className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all border",
                            !activeFilter.breakdown
                                ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                                : "bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:bg-blue-50"
                        )}
                    >
                        <Users className="w-3 h-3" />
                        All
                        <span className={cn(
                            "text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[20px] text-center",
                            !activeFilter.breakdown
                                ? "bg-white/20 text-white"
                                : "bg-gray-100 text-gray-500"
                        )}>
                            {totalCount}
                        </span>
                    </button>

                    {/* Individual option pills */}
                    {sortedOptions.map((opt, index) => (
                        <button
                            key={`${opt.label}-${index}`}
                            onClick={() => onSelectBreakdown(
                                activeFilter.breakdown === opt.label ? null : opt.label
                            )}
                            className={cn(
                                "flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all border",
                                activeFilter.breakdown === opt.label
                                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                                    : "bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:bg-blue-50"
                            )}
                        >
                            {opt.label}
                            <span className={cn(
                                "text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[20px] text-center",
                                activeFilter.breakdown === opt.label
                                    ? "bg-white/20 text-white"
                                    : "bg-gray-100 text-gray-500"
                            )}>
                                {opt.count}
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
