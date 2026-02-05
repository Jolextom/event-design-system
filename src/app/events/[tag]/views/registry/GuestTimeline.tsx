import React from 'react';
import { Check, Mail, MousePointer, ShieldCheck, Ticket, AlertCircle } from 'lucide-react';
import { formatDistance, format } from 'date-fns';
import { cn } from '@/lib/utils';

export interface TimelineEvent {
    id: string;
    label: string;
    subLabel?: string;
    description?: string;
    date: string | null;
    status: 'completed' | 'pending' | 'failed' | 'current';
    icon: React.ElementType;
}

interface GuestTimelineProps {
    events: TimelineEvent[];
}

export function GuestTimeline({ events }: GuestTimelineProps) {
    return (
        <div className="w-full overflow-x-auto pb-4 custom-scrollbar">
            <div className="flex items-start min-w-max px-2">
                {events.map((event, i) => {
                    const isLast = i === events.length - 1;

                    return (
                        <div key={event.id} className="flex flex-col items-center relative group min-w-[80px]">
                            {/* Connecting Line (Positioned relative to Node) */}
                            {!isLast && (
                                <div className={cn(
                                    "absolute top-[44px] left-[50%] w-full h-0.5 -z-10", // 2rem is approx center of 32px (h-8) node + styling offset
                                    // Adjust top based on the height of the date element above it.
                                    // Let's rely on flexible alignment or hardcoded offsets.
                                    // If Date is above (approx 24px?), Node is 32px. Center of Node is at 24 + 16 = 40px?
                                    // Easier: Absolute position the line based on the container, but centering on the node is tricky if node position varies.
                                    // Let's use a fixed height for the Date container to ensure alignment.
                                    // 24px (date height) + 16px (half node) + margins? Let's check styling below.
                                    event.status === 'completed'
                                        ? "bg-gray-900"
                                        : "bg-gray-200 border-t border-dashed border-gray-300 bg-transparent"
                                )} />
                            )}

                            {/* Date (Above) */}
                            <div className="h-6 flex items-end justify-center mb-1.5 w-full">
                                {event.date ? (
                                    <div className="text-center transition-transform group-hover:scale-105">
                                        <p className="text-[10px] font-bold text-gray-500 leading-none">
                                            {format(new Date(event.date), 'MMM d')}
                                        </p>
                                        <p className="text-[9px] text-gray-400 leading-none">
                                            {format(new Date(event.date), 'h:mm a')}
                                        </p>
                                    </div>
                                ) : (
                                    <p className="text-[9px] text-gray-300 font-medium italic">Pending</p>
                                )}
                            </div>

                            {/* Node */}
                            <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center border-2 bg-white transition-all relative z-10",
                                event.status === 'completed'
                                    ? "border-gray-900 text-gray-900 shadow-md shadow-gray-200"
                                    : event.status === 'current'
                                        ? "border-blue-500 text-blue-500 ring-4 ring-blue-50"
                                        : event.status === 'failed'
                                            ? "border-red-500 text-red-500 bg-red-50"
                                            : "border-gray-200 text-gray-300"
                            )}>
                                <event.icon className="w-3.5 h-3.5" />
                            </div>

                            {/* Label (Below) */}
                            <div className="text-center w-24 flex flex-col items-center mt-2">
                                <p className={cn(
                                    "text-[10px] font-black uppercase tracking-widest mb-0.5",
                                    event.status === 'pending' ? "text-gray-400" : "text-gray-900"
                                )}>
                                    {event.label}
                                </p>

                                {event.subLabel && (
                                    <span className="inline-block px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-500 text-[8px] font-bold uppercase tracking-wider">
                                        {event.subLabel}
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
