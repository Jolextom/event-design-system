"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Calendar,
    MapPin,
    Clock,
    ChevronRight,
    Check,
    Ticket,
    ChevronLeft,
    Sparkles,
    Share2,
    CalendarPlus,
    MessageCircle,
    Heart,
    ExternalLink,
    Map,
    ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- Types ---
interface TicketTier {
    id: string;
    name: string;
    description: string;
    price: number;
    status: "Active" | "Sold Out";
    type: "individual" | "group";
    groupSize?: number;
}

interface EventData {
    title: string;
    host: { name: string; avatar: string; verified: boolean };
    date: string;
    time: string;
    location: string;
    isVirtual: boolean;
    description: string;
    coverImage?: string;
    tickets: TicketTier[];
}

// --- Mock Data ---
const EVENT_DATA: EventData = {
    title: "Global Design Gala 2026",
    host: {
        name: "Greg Studio",
        avatar: "G",
        verified: true
    },
    date: "Saturday, March 14",
    time: "9:00 AM — 4:00 PM CEST",
    location: "Palais de Tokyo, Paris",
    isVirtual: true,
    description: `Join us for the 10th anniversary of the Global Design Gala. This year, we're converging at the intersection of AI, spatial computing, and human-centric craft.

Expect a day filled with:
• Keynotes from world-class designers
• Interactive spatial workshops
• Exclusive networking lounges
• After-party at the rooftop garden

We're bringing together 1,200 of the brightest minds in design to shape the next decade of our industry.`,
    coverImage: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=2070&auto=format&fit=crop",
    tickets: [
        { id: "t1", name: "Early Bird", description: "Limit 1 per peron", price: 49, status: "Active", type: "individual" },
        { id: "t2", name: "General Admission", description: "Standard entry", price: 99, status: "Active", type: "individual" },
        { id: "t3", name: "Squad Pass (4 People)", description: "Bulk discount for teams", price: 299, status: "Active", type: "group", groupSize: 4 },
        { id: "t4", name: "VIP Experience", description: "All-access + dinner", price: 499, status: "Active", type: "individual" },
    ]
};

export default function RegistrationPage() {
    const [step, setStep] = useState(1);
    const [selectedTicket, setSelectedTicket] = useState<string>("t2");
    const [quantity, setQuantity] = useState(1);
    const [guests, setGuests] = useState([{ firstName: "", lastName: "", email: "" }]);

    const currentTicket = EVENT_DATA.tickets.find(t => t.id === selectedTicket);
    const totalGuests = currentTicket?.type === "group"
        ? (currentTicket.groupSize || 1) * quantity
        : quantity;

    // Sync guests array when totalGuests changes
    React.useEffect(() => {
        setGuests(prev => {
            const newGuests = [...prev];
            if (newGuests.length < totalGuests) {
                for (let i = newGuests.length; i < totalGuests; i++) {
                    newGuests.push({ firstName: "", lastName: "", email: "" });
                }
            } else {
                return newGuests.slice(0, totalGuests);
            }
            return newGuests;
        });
    }, [totalGuests]);

    const TicketSelector = ({ isMobile = false }) => (
        <div className="space-y-6">
            <h3 className={cn(
                "font-black uppercase tracking-[0.3em] text-gray-300",
                isMobile ? "text-[12px] mb-4" : "text-[10px]"
            )}>
                Select Ticket
            </h3>
            <div className="space-y-4">
                {EVENT_DATA.tickets.map(ticket => (
                    <button
                        key={ticket.id}
                        onClick={() => setSelectedTicket(ticket.id)}
                        className={cn(
                            "w-full p-6 rounded-[32px] border-2 transition-all flex items-center justify-between group text-left",
                            selectedTicket === ticket.id
                                ? "bg-blue-50/30 border-[var(--brand-blue)] shadow-[0_12px_32px_-12px_rgba(59,130,246,0.2)] scale-[1.02]"
                                : "bg-white border-gray-100 hover:border-gray-200"
                        )}
                    >
                        <div className="flex-1">
                            <div className={cn("text-base font-black transition-colors leading-none mb-1.5", selectedTicket === ticket.id ? "text-[var(--brand-blue)]" : "text-gray-900")}>
                                {ticket.name}
                            </div>
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">{ticket.description}</div>
                        </div>
                        <div className="text-right ml-4">
                            <div className="text-xl font-black text-gray-900 tracking-tight">${ticket.price}</div>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-white text-[#111827] selection:bg-blue-100 pb-32">

            {/* Top Navigation */}
            <header className="w-full p-6 md:px-10 md:py-8 flex items-center justify-between z-50 bg-white/80 backdrop-blur-md sticky top-0 border-b border-gray-50">
                <div className="flex items-center gap-2.5 group cursor-pointer">
                    <div className="w-8 h-8 flex items-center justify-center font-black text-base bg-red-50 text-[var(--brand-red)] rounded-lg border border-red-100">❤</div>
                    <span className="font-black tracking-tighter text-gray-900 text-lg">EventFlow</span>
                </div>
                <div className="flex items-center gap-3">
                    <button className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                        <Share2 className="w-5 h-5 text-gray-400" />
                    </button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 md:px-10 pt-10 md:pt-16">

                {/* --- HEADER ARCHITECTURE (Integrated & Airy) --- */}
                <header className="max-w-4xl mb-12 space-y-8">
                    {/* Pre-header Badges */}
                    <div className="flex items-center gap-3">
                        <span className="px-3.5 py-1.5 bg-blue-50 text-[var(--brand-blue)] text-[9px] font-black uppercase tracking-[0.2em] rounded-full border border-blue-100">
                            {EVENT_DATA.isVirtual ? "Hybrid Event" : "In-Person"}
                        </span>
                        <div className="flex items-center gap-2 px-3.5 py-1.5 bg-green-50 text-green-600 text-[9px] font-black uppercase tracking-[0.2em] rounded-full border border-green-100">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                            Live
                        </div>
                    </div>

                    {/* Main Title */}
                    <h1 className="text-5xl md:text-8xl font-black tracking-tight text-gray-900 leading-[0.85]">
                        {EVENT_DATA.title.split(' ').slice(0, -1).join(' ')} <br />
                        <span className="text-gray-900/20">{EVENT_DATA.title.split(' ').pop()}</span>
                    </h1>

                    {/* Host Interaction */}
                    <div className="flex items-center gap-4">
                        <div className="w-11 h-11 bg-gray-50 text-gray-400 rounded-2xl flex items-center justify-center font-black text-sm border border-gray-100 shadow-inner">
                            {EVENT_DATA.host.avatar}
                        </div>
                        <div>
                            <div className="flex items-center gap-1.5 leading-none mb-1">
                                <span className="text-base font-black text-gray-900">Hosted by {EVENT_DATA.host.name}</span>
                                {EVENT_DATA.host.verified && <Check className="w-3.5 h-3.5 text-blue-500 fill-blue-500" />}
                            </div>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em] block">Verified Partner</span>
                        </div>
                    </div>
                </header>

                {/* --- CENTERED CARD HERO --- */}
                <section className="mb-16">
                    <div className="bg-gray-100 rounded-[48px] overflow-hidden relative group shadow-2xl shadow-gray-100 border border-gray-50">
                        {EVENT_DATA.coverImage ? (
                            <div className="aspect-[16/9] md:aspect-[21/9] md:max-h-[520px] w-full relative overflow-hidden">
                                <img
                                    src={EVENT_DATA.coverImage}
                                    alt="Event Cover"
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-gray-900/10 to-transparent" />
                            </div>
                        ) : (
                            <div className="aspect-[21/9] md:h-[300px] w-full bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center">
                                <Sparkles className="w-16 h-16 text-gray-200" />
                            </div>
                        )}
                    </div>
                </section>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 md:gap-24">

                    {/* LEFT COL: STORY & ACTIONS */}
                    <div className="lg:col-span-7 space-y-20">

                        {/* Info Tiles */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2 text-[10px] font-black text-gray-300 uppercase tracking-widest">
                                        <Calendar className="w-3.5 h-3.5" /> Date
                                    </div>
                                    <button className="text-[9px] font-black text-[var(--brand-blue)] uppercase tracking-widest hover:text-blue-700 transition-colors flex items-center gap-1.5 px-2 py-1 bg-blue-50 rounded-lg">
                                        <CalendarPlus className="w-3 h-3" /> Save
                                    </button>
                                </div>
                                <div className="text-xl font-black text-gray-900">{EVENT_DATA.date}</div>
                            </div>
                            <div className="space-y-4 md:border-x px-0 md:px-10 border-gray-50">
                                <div className="flex items-center gap-2 text-[10px] font-black text-gray-300 uppercase tracking-widest mb-2">
                                    <Clock className="w-3.5 h-3.5" /> Time
                                </div>
                                <div className="text-xl font-black text-gray-900 leading-tight">{EVENT_DATA.time}</div>
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2 text-[10px] font-black text-gray-300 uppercase tracking-widest">
                                        <MapPin className="w-3.5 h-3.5" /> Location
                                    </div>
                                    <button className="text-[9px] font-black text-[var(--brand-blue)] uppercase tracking-widest hover:text-blue-700 transition-colors flex items-center gap-1.5 px-2 py-1 bg-blue-50 rounded-lg">
                                        <Map className="w-3 h-3" /> Map
                                    </button>
                                </div>
                                <div className="text-xl font-black text-gray-900">{EVENT_DATA.location}</div>
                            </div>
                        </div>

                        {/* MOBILE TICKETS */}
                        <div className="md:hidden py-10 border-y border-gray-50">
                            <TicketSelector isMobile={true} />
                        </div>

                        {/* Event Story */}
                        <div className="space-y-8">
                            <h2 className="text-[11px] font-black uppercase tracking-[0.4em] text-gray-300">The Narrative</h2>
                            <div className="text-2xl md:text-3xl font-bold text-gray-500 leading-[1.6] whitespace-pre-line selection:bg-blue-50">
                                {EVENT_DATA.description}
                            </div>
                        </div>

                        {/* Footer Vibe */}
                        <div className="flex items-center gap-10 pt-10">
                            <div className="flex items-center gap-3 group cursor-pointer">
                                <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center border border-gray-100 group-hover:bg-red-50 group-hover:border-red-100 transition-all">
                                    <Heart className="w-5 h-5 text-gray-300 group-hover:text-red-500" />
                                </div>
                                <div>
                                    <div className="text-sm font-black text-gray-900">2.4k</div>
                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Interactions</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 group cursor-pointer">
                                <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center border border-gray-100 group-hover:bg-blue-50 group-hover:border-blue-100 transition-all">
                                    <MessageCircle className="w-5 h-5 text-gray-300 group-hover:text-blue-500" />
                                </div>
                                <div>
                                    <div className="text-sm font-black text-gray-900">142</div>
                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Public Chat</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COL: STICKY SELECTOR (Desktop) */}
                    <div className="hidden lg:block lg:col-span-5">
                        <div className="sticky top-32">
                            <div className="bg-white border border-gray-100 shadow-[0_64px_128px_-32px_rgba(0,0,0,0.08)] rounded-[64px] overflow-hidden">
                                <div className="p-10 md:p-12 space-y-10">
                                    <TicketSelector />

                                    <div className="space-y-5 pt-4">
                                        <button
                                            onClick={() => setStep(2)}
                                            className="w-full py-6 bg-gray-900 text-white rounded-[32px] font-black text-lg shadow-[0_24px_48px_-12px_rgba(0,0,0,0.2)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                                        >
                                            Next step <ArrowRight className="w-6 h-6" />
                                        </button>
                                        <div className="flex items-center justify-center gap-4">
                                            <div className="flex -space-x-2">
                                                {[1, 2, 3, 4].map(i => (
                                                    <div key={i} className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white overflow-hidden">
                                                        <img src={`https://i.pravatar.cc/100?u=${i}`} alt="User" />
                                                    </div>
                                                ))}
                                            </div>
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">+1.2k attending</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gray-50/50 p-6 flex items-center justify-center border-t border-gray-50">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Verified Event — EventFlow Safe</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* --- MOBILE STICKY FOOTER --- */}
            <div className="fixed bottom-0 left-0 w-full p-6 md:hidden z-[60] bg-white/95 backdrop-blur-2xl border-t border-gray-100 shadow-[0_-20px_60px_rgba(0,0,0,0.08)]">
                <div className="max-w-md mx-auto flex items-center justify-between gap-6">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-1">Your Pass</span>
                        <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-black text-gray-900 tracking-tight">${currentTicket?.price}</span>
                        </div>
                    </div>
                    <button
                        onClick={() => setStep(2)}
                        className="flex-1 py-5 bg-gray-900 text-white rounded-[24px] font-black text-base shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        Register <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* --- REGISTRATION MODAL --- */}
            <AnimatePresence>
                {step === 2 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-gray-900/40 backdrop-blur-lg"
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 30 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 30 }}
                            className="bg-white max-w-xl w-full rounded-[48px] md:rounded-[64px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                        >
                            <div className="p-10 md:p-12 border-b border-gray-50 flex items-center justify-between bg-white sticky top-0 z-10">
                                <button onClick={() => setStep(1)} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-all">
                                    <ChevronLeft className="w-4 h-4" /> Back
                                </button>
                                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Guest Info</h2>
                                <div className="w-10 h-1bg-blue-50 rounded-full" />
                            </div>

                            <div className="p-10 md:p-16 overflow-y-auto space-y-12 custom-scrollbar">
                                <div className="space-y-10">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">First Name</label>
                                            <input placeholder="Jane" className="w-full bg-gray-50/50 border-gray-100 focus:border-[var(--brand-blue)] focus:bg-white focus:ring-8 focus:ring-blue-50 rounded-[28px] p-5 text-base font-bold outline-none transition-all border" />
                                        </div>
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Last Name</label>
                                            <input placeholder="Smith" className="w-full bg-gray-50/50 border-gray-100 focus:border-[var(--brand-blue)] focus:bg-white focus:ring-8 focus:ring-blue-50 rounded-[28px] p-5 text-base font-bold outline-none transition-all border" />
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Email Address</label>
                                        <input type="email" placeholder="jane@studio.com" className="w-full bg-gray-50/50 border-gray-100 focus:border-[var(--brand-blue)] focus:bg-white focus:ring-8 focus:ring-blue-50 rounded-[28px] p-5 text-base font-bold outline-none transition-all border" />
                                    </div>
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Notes for Greg Studio</label>
                                        <textarea placeholder="Dietary requirements or special requests?" rows={3} className="w-full bg-gray-50/50 border-gray-100 focus:border-[var(--brand-blue)] focus:bg-white focus:ring-8 focus:ring-blue-50 rounded-[28px] p-5 text-base font-bold outline-none transition-all border resize-none" />
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <button
                                        onClick={() => setStep(3)}
                                        className="w-full py-6 bg-gray-900 text-white rounded-[32px] font-black text-xl shadow-2xl shadow-gray-200 hover:scale-[1.02] active:scale-95 transition-all"
                                    >
                                        Get ticket
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* --- SUCCESS STATE --- */}
            <AnimatePresence>
                {step === 3 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-white"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="max-w-xl w-full text-center space-y-12"
                        >
                            <div className="relative inline-block">
                                <div className="w-24 h-24 bg-green-500 rounded-[36px] flex items-center justify-center shadow-[0_24px_48px_-8px_rgba(34,197,94,0.3)] relative z-10 mx-auto">
                                    <Check className="w-12 h-12 text-white stroke-[5]" />
                                </div>
                                <div className="absolute inset-0 bg-green-200 blur-3xl opacity-40 scale-150 animate-pulse" />
                            </div>

                            <div className="space-y-6">
                                <h2 className="text-5xl md:text-7xl font-black tracking-tight text-gray-900 leading-[0.9]">
                                    See you at <br />
                                    <span className="text-gray-900/20">The Gala.</span>
                                </h2>
                                <p className="text-xl text-gray-400 font-bold max-w-sm mx-auto leading-relaxed">
                                    Your spot is confirmed for <span className="text-gray-900">{EVENT_DATA.date}</span>. Check your inbox for the digital link.
                                </p>
                            </div>

                            <div className="bg-gray-50 rounded-[48px] p-10 md:p-14 text-left border border-gray-100 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:scale-110 transition-transform">
                                    <Ticket className="w-40 h-40 transform rotate-12" />
                                </div>
                                <div className="flex justify-between items-start mb-12 relative z-10">
                                    <div>
                                        <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Guest</div>
                                        <div className="text-3xl font-black text-gray-900">Jane Smith</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Pass</div>
                                        <div className="text-3xl font-black text-[var(--brand-blue)]">General</div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-8 relative z-10">
                                    <div>
                                        <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Reference</div>
                                        <div className="text-xl font-black text-gray-900 tracking-tighter">EF-GALA-26-88Z</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Actions</div>
                                        <div className="flex justify-end gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center cursor-pointer hover:bg-gray-100">
                                                <ExternalLink className="w-4 h-4 text-gray-400" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row items-center justify-center gap-5 pt-4">
                                <button className="w-full sm:w-auto px-12 py-6 bg-gray-50 text-gray-900 rounded-[28px] font-black text-base hover:bg-gray-100 transition-all flex items-center justify-center gap-3">
         