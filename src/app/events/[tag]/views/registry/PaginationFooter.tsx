"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface PaginationFooterProps {
    currentPage: number;
    totalPages: number;
    totalResults: number;
    paginatedCount: number;
    searchTerm?: string;
    onPageChange: (page: number) => void;
}

export function PaginationFooter({
    currentPage,
    totalPages,
    totalResults,
    paginatedCount,
    searchTerm,
    onPageChange
}: PaginationFooterProps) {
    return (
        <div className="p-4 border-t border-gray-100 bg-white flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-gray-400">
            <div className="flex items-center gap-6">
                <span>
                    Showing <span className="text-gray-900">{paginatedCount}</span> of <span className="text-gray-900">{totalResults}</span> guests
                </span>
                {searchTerm && (
                    <span>
                        Filtered by: <span className="text-gray-900 px-2 py-0.5 bg-gray-50 rounded border border-gray-100 ml-1">"{searchTerm}"</span>
                    </span>
                )}
            </div>
            <div className="flex items-center gap-4">
                <button
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 hover:text-gray-900 transition-colors disabled:opacity-30"
                >
                    Previous
                </button>
                <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <button
                            key={page}
                            onClick={() => onPageChange(page)}
                            className={cn(
                                "w-6 h-6 flex items-center justify-center rounded transition-all",
                                currentPage === page
                                    ? "bg-(--brand-blue) text-white"
                                    : "hover:bg-gray-50 text-gray-400 hover:text-gray-900"
                            )}
                        >
                            {page}
                        </button>
                    ))}
                </div>
                <button
                    onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="px-3 py-1 hover:text-gray-900 transition-colors disabled:opacity-30"
                >
                    Next
                </button>
            </div>
        </div>
    );
}
