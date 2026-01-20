"use client";

import React from "react";
import { User, Mail, Info } from "lucide-react";

export function FixedFields() {
    return (
        <div className="space-y-4">
            <div className="p-6 border border-gray-100 rounded-[24px] bg-gray-50/30 transition-all shadow-sm opacity-80">
                <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-white rounded-xl text-gray-400 border border-gray-100">
                            <User className="w-4.5 h-4.5" />
                        </div>
                        <div>
                            <h4 className="font-black text-base text-gray-900">Full Name</h4>
                            <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-widest">Fixed Field • Text</p>
                        </div>
                    </div>
                    <span className="px-3 py-1 bg-white border border-gray-100 rounded-full text-[9px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
                        <Info className="w-3 h-3" /> System
                    </span>
                </div>
            </div>

            <div className="p-6 border border-gray-100 rounded-[24px] bg-gray-50/30 transition-all shadow-sm opacity-80">
                <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-white rounded-xl text-gray-400 border border-gray-100">
                            <Mail className="w-4.5 h-4.5" />
                        </div>
                        <div>
                            <h4 className="font-black text-base text-gray-900">Email Address</h4>
                            <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-widest">Fixed Field • Email</p>
                        </div>
                    </div>
                    <span className="px-3 py-1 bg-white border border-gray-100 rounded-full text-[9px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
                        <Info className="w-3 h-3" /> System
                    </span>
                </div>
            </div>
        </div>
    );
}
