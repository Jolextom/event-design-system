"use client";

import React from "react";
import { Search, Filter, Download, UserPlus, Loader2, Tag as TagIcon, Zap, Shuffle } from "lucide-react";
import { Attendee } from "../../types";

interface RegistryHeaderProps {
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    totalGuests: number;
    checkedInCount: number;
    loading?: boolean;
    onExportCSV: () => void;
    onAddGuest: () => void;
    onManageFields: () => void;
}

export function RegistryHeader({
    searchTerm,
    setSearchTerm,
    totalGuests,
    checkedInCount,
    loading,
    onExportCSV,
    onAddGuest,
    onManageFields,
}: RegistryHeaderProps) {
    return (
        <div className="flex flex-col px-8 py-6 bg-white border-b border-gray-100">
            {/* Stats Row */}
            <div className="flex gap-10 items-center mb-6">
                <div className="flex items-baseline gap-2">
                    <span className="text-xl font-black text-gray-900 tracking-tighter">
                        {loading ? "..." : totalGuests.toLocaleString()}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Total Guests</span>
                </div>
                <div className="flex items-baseline gap-2">
                    <span className="text-xl font-black text-blue-600 tracking-tighter">
                        {loading ? "..." : checkedInCount.toLocaleString()}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Checked In</span>
                </div>
            </div>

            <div className="flex items-center justify-between gap-4">
                {/* Search */}
                <div className="flex-1 relative group max-w-2xl">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors z-10" />
                    <input
                        type="text"
                        placeholder="Search by name, email, ref, or answers..."
                        className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-[13px] font-bold outline-none focus:bg-white focus:ring-4 focus:ring-blue-50 focus:border-blue-100 transition-all placeholder:text-gray-400/70"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Actions */}


                <div className="flex items-center gap-2 shrink-0">
                    {/* Fields Management */}
                    <button
                        onClick={onManageFields}
                        className="flex items-center gap-2 px-4 py-3 bg-white border border-gray-200 text-gray-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:border-gray-900 hover:bg-gray-50 transition-all shrink-0"
                    >
                        <TagIcon className="w-4 h-4" /> Fields
                    </button>

                    <button
                        onClick={onExportCSV}
                        className="flex items-center gap-2 px-5 py-3 bg-white border border-gray-200 text-gray-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:border-gray-900 hover:bg-gray-50 transition-all shrink-0"
                    >
                        <Download className="w-4 h-4" /> Export CSV
                    </button>



                    <button
                        onClick={onAddGuest}
                        className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg shadow-gray-100 shrink-0"
                    >
                        <UserPlus className="w-4 h-4" /> Add Guest
                    </button>
                    {loading && <Loader2 className="w-5 h-5 text-blue-500 animate-spin ml-2" />}
                </div>
            </div>
        </div >
    );
}
