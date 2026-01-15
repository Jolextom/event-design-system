"use client";

import React from "react";
import { motion } from "framer-motion";
import {
    CalendarPlus,
    MapPin,
    Sparkles,
    Share2,
    MessageCircle,
    Heart,
    PlusCircle,
    Bell,
    Users,
    QrCode,
    Smartphone,
    Download,
    MessageSquare
} from "lucide-react";
import { cn } from "@/lib/utils";

const EVENT_DATA = {
    title: "Global Design Gala 2026",
    date: "Saturday, March 14",
    time: "9:00 AM — 4:00 PM CEST",
    location: "Palais de Tokyo, Paris",
    host: {
        name: "Design Alliance",
        verified: true,
        avatar: "DA"
    },
    daysRemaining: 58
};

const USER_PASS = {
    name: "Joseph Farinloye",
    type: "Squad Pass",
    id: "EF-T3-MAR-2642",
    status: "Active",
    groupMembers: [
        { name: "Joseph Farinloye", status: "Ready", isLead: true },
        { name: "Sarah J. (Invited)", status: "Pending", isLead: false },
        { name: "Mike R. (Invited)", status: "Pending", isLead: false },
        { name: "Alex P. (Invited)", status: "Pending", isLead: false },
    ]
};

export default function GuestDashboard() {
    return (
        <div className="min-h-screen bg-white text-[#111827] selection:bg-blue-100 pb-20 overflow-x-hidden">
            {/* Immersive Background Elements */}
            <div className="fixed top-0 left-0 w-full h-[50vh] bg-gradient-to-b from-blue-50/40 via-white to-transparent -z-10" />
            <div className="fixed top-[10%] right-[-5%] w-[500px] h-[500px] bg-red-100/20 blur-[120px] rounded-full -z-10 animate-pulse" />
            <div className="fixed bottom-[10%] left-[-5%] w-[600px] h-[600px] bg-blue-100/20 blur-[150px] rounded-full -z-10" />

            {/* Navigation */}
            <header className="w-full px-6 py-5 md:px-10 flex items-center justify-between sticky top-0 z-50 bg-white/60 backdrop-blur-xl border-b border-gray-100/50">
                <div className="flex items-center gap-2 group cursor-pointer">
                    <div className="w-7 h-7 flex items-center justify-center font-black text-xs bg-red-50 text-[var(--brand-red)] rounded-lg border border-red-100">❤</div>
                    <span className="font-black tracking-tighter text-gray-900 text-base">EventFlow</span>
                </div>

                <div className="flex items-center gap-4">
                    <button className="p-2 relative rounded-xl hover:bg-gray-100 transition-all text-gray-400 hover:text-gray-900">
                        <Bell className="w-5 h-5" />
                        <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
                    </button>
                    <div className="w-9 h-9 bg-gray-900 rounded-xl flex items-center justify-center text-white font-black text-xs shadow-lg">
                        JF
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-6 md:px-10 pt-8 md:pt-12">

                {/* Dashboard Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <span className="px-3 py-1 bg-green-50 text-green-600 text-[9px] font-black uppercase tracking-[0.2em] rounded-full border border-green-100 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                                Confirmed
                            </span>
                            <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">{EVENT_DATA.daysRemaining} Days to go</span>
                        </div>
                        <h1 className="text-4xl md:text-6xl font-black tracking-tight text-gray-900 leading-[0.9]">
                            {EVENT_DATA.title} <br />
                            <span className="text-gray-900/10 italic">Guest Hub</span>
                        </h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <button className="flex items-center gap-2 px-5 py-3 bg-white border border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-600 hover:shadow-md transition-all">
                            <Share2 className="w-4 h-4" /> Share Hub
                        </button>
                        <button className="flex items-center gap-2 px-5 py-3 bg-gray-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-gray-200 hover:bg-gray-800 transition-all">
                            <CalendarPlus className="w-4 h-4" /> Add to Calendar
                        </button>
                    </div>
                </div>

                {/* THE GRID */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12">

                    {/* LEFT COL: PASS (The "Wallet") */}
                    <div className="lg:col-span-4 space-y-8">
                        <motion.div
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            className="bg-gradient-to-br from-gray-900 via-[#111827] to-black text-white rounded-[40px] p-8 relative overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.3)] sticky top-32 border border-white/5"
                        >
                            {/* Premium Glass Highlights */}
                            <div className="absolute top-[-10%] right-[-10%] w-[120%] h-[40%] bg-gradient-to-b from-white/5 to-transparent rotate-12 pointer-events-none" />
                            <div className="absolute bottom-[-10%] left-[-10%] w-[120%] h-[40%] bg-gradient-to-t from-white/5 to-transparent -rotate-12 pointer-events-none" />

                            {/* Decorative Glowing Orbs */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/30 blur-[60px] rounded-full opacity-50" />
                            <div className="absolute bottom-0 left-0 w-24 h-24 bg-red-500/20 blur-[50px] rounded-full opacity-30" />

                            <div className="relative z-10 flex flex-col h-full justify-between gap-12">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <div className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em]">Access Type</div>
                                        <div className="flex items-center gap-2">
                                            <div className="text-2xl font-black italic tracking-tighter text-blue-400">{USER_PASS.type}</div>
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                                        </div>
                                    </div>
                                    <div className="w-10 h-10 bg-white/5 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/10 shadow-inner">
                                        <QrCode className="w-6 h-6 text-white/80" />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="w-full aspect-square bg-white rounded-3xl p-6 flex items-center justify-center relative group cursor-pointer shadow-[inset_0_4px_12px_rgba(0,0,0,0.1)]">
                                        {/* Mock QR Code UI */}
                                        <div className="w-full h-full border-[10px] border-gray-900 relative">
                                            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-gray-900" />
                                            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-gray-900" />
                                            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-gray-900" />
                                            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-gray-900" />
                                            {/* Static Mock QR blocks */}
                                            <div className="w-full h-full flex flex-col gap-2 p-2 opacity-20">
                                                <div className="h-4 bg-gray-900 rounded" />
                                                <div className="h-4 bg-gray-900 rounded w-2/3" />
                                                <div className="h-4 bg-gray-900 rounded" />
                                                <div className="h-4 bg-gray-900 rounded w-1/2" />
                                            </div>
                                        </div>
                                        <div className="absolute inset-0 bg-gray-900/0 group-hover:bg-gray-900/80 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 rounded-3xl">
                                            <div className="text-center space-y-2">
                                                <Smartphone className="w-8 h-8 text-white mx-auto mb-2" />
                                                <div className="text-[10px] font-black uppercase tracking-widest text-white">Tap to Expand</div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-[10px] font-black tracking-[0.3em] text-white/30 truncate">{USER_PASS.id}</div>
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-white/10 flex items-center justify-between">
                                    <div>
                                        <div className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em] mb-1">Pass Holder</div>
                                        <div className="text-base font-black tracking-tight">{USER_PASS.name}</div>
                                    </div>
                                    <button className="w-10 h-10 bg-white text-gray-900 rounded-xl flex items-center justify-center hover:scale-105 transition-all shadow-lg hover:shadow-white/20">
                                        <Download className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* RIGHT COL: CONTENT & SOCIAL */}
                    <div className="lg:col-span-8 space-y-8">

                        {/* Highlights Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            {/* Squad Section (ELEVATED TO FIRST ON MOBILE/TABLET) */}
                            <div className="bg-white border border-gray-100 rounded-[32px] p-8 hover:shadow-2xl hover:shadow-blue-500/5 transition-all group flex flex-col min-h-[380px]">
                                {USER_PASS.groupMembers.length > 1 ? (
                                    <>
                                        <div className="flex items-center justify-between mb-8">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500 group-hover:scale-110 group-hover:bg-blue-500 group-hover:text-white transition-all shadow-sm">
                                                    <Users className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <div className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-0.5">Your Hub</div>
                                                    <div className="text-lg font-black tracking-tight text-gray-900">The Squad</div>
                                                </div>
                                            </div>
                                            <div className="flex -space-x-2">
                                                {USER_PASS.groupMembers.slice(0, 3).map((m, i) => (
                                                    <div key={i} className="w-8 h-8 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center text-[8px] font-black text-blue-600 uppercase shadow-sm">
                                                        {m.name[0]}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar pr-4">
                                            {USER_PASS.groupMembers.map((member, i) => (
                                                <div key={i} className="flex items-center justify-between p-3.5 bg-gray-50/50 rounded-2xl border border-gray-100/50 hover:bg-white hover:border-blue-100 hover:shadow-md transition-all group/member">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center text-[10px] font-black text-gray-400 border border-gray-100 shadow-sm group-hover/member:text-blue-500 transition-colors">
                                                            {member.name.split(' ').map(n => n[0]).join('')}
                                                        </div>
                                                        <div className="text-xs font-bold text-gray-900">{member.name}</div>
                                                    </div>
                                                    <div className={cn(
                                                        "px-2.5 py-1 rounded-lg text-[7px] font-black uppercase tracking-wider",
                                                        member.status === "Ready" ? "bg-green-50 text-green-600 border border-green-100/50" : "bg-blue-50 text-blue-600 animate-pulse border border-blue-100/50"
                                                    )}>
                                                        {member.status}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <button className="w-full py-4 mt-6 bg-gray-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-gray-200 flex items-center justify-center gap-3 hover:bg-gray-800 hover:scale-[1.02] active:scale-[0.98] transition-all">
                                            <PlusCircle className="w-4 h-4" /> Manage Invitation List
                                        </button>
                                    </>
                                ) : (
                                    <div className="h-full flex flex-col justify-between">
                                        <div className="space-y-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500 group-hover:scale-110 transition-all shadow-sm">
                                                    <Sparkles className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <div className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-0.5">Prepare Yourself</div>
                                                    <div className="text-lg font-black tracking-tight text-gray-900">Get Ready</div>
                                                </div>
                                            </div>
                                            <p className="text-sm font-bold text-gray-400 leading-relaxed">
                                                You're all set for the {EVENT_DATA.title}. Keep your QR code ready for quick check-in at the venue. Would you like to invite someone to join you?
                                            </p>
                                        </div>
                                        <div className="space-y-3 mt-6">
                                            <button className="w-full py-4 bg-gray-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-gray-200 flex items-center justify-center gap-3 hover:bg-gray-800 transition-all">
                                                <Download className="w-4 h-4" /> Save to Wallet
                                            </button>
                                            <button className="w-full py-3 text-gray-400 hover:text-gray-900 text-[9px] font-black uppercase tracking-widest transition-all">
                                                + Add Plus One
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Map Section */}
                            <div className="bg-white border border-gray-100 rounded-[32px] p-8 hover:shadow-xl transition-all group cursor-pointer flex flex-col">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform shadow-sm">
                                        <MapPin className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-0.5">Logistics</div>
                                        <div className="text-lg font-black tracking-tight text-gray-900">Live Map & Travel</div>
                                    </div>
                                </div>
                                <div className="flex-1 bg-gray-50 rounded-[28px] overflow-hidden relative border border-gray-100">
                                    <div className="absolute inset-0 bg-blue-400/10" />
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 bg-blue-500 rounded-full border-[6px] border-white shadow-2xl animate-bounce" />
                                    <div className="absolute bottom-4 left-4 right-4 bg-white/60 backdrop-blur-md p-3 rounded-[20px] border border-white/40 shadow-sm">
                                        <div className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Destination</div>
                                        <div className="text-[10px] font-black text-gray-900 truncate">{EVENT_DATA.location}</div>
                                    </div>
                                </div>
                            </div>

                        </div>

                        {/* Social Wall */}
                        <div className="bg-white border border-gray-100 rounded-[40px] overflow-hidden shadow-sm">
                            <div className="p-8 border-b border-gray-50 flex items-center justify-between">
                                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-900 flex items-center gap-2">
                                    <MessageSquare className="w-4 h-4 text-blue-500" /> Public Event Wall
                                </h3>
                                <div className="flex -space-x-2">
                                    {[1, 2, 3, 4, 5].map(i => (
                                        <motion.div
                                            key={i}
                                            whileHover={{ y: -4, scale: 1.1, zIndex: 10 }}
                                            className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white overflow-hidden shadow-sm cursor-pointer"
                                        >
                                            <img src={`https://i.pravatar.cc/100?u=s${i}`} alt="Attendee" className="w-full h-full object-cover" />
                                        </motion.div>
                                    ))}
                                    <div className="w-8 h-8 rounded-full bg-gray-50 border-2 border-white flex items-center justify-center text-[8px] font-black text-gray-400 uppercase cursor-pointer hover:bg-white transition-colors">
                                        +2k
                                    </div>
                                </div>
                            </div>
                            <div className="p-8 space-y-8">
                                <div className="flex gap-4">
                                    <div className="w-10 h-10 bg-gray-900 rounded-xl flex-shrink-0 flex items-center justify-center text-white font-black text-xs shadow-lg shadow-gray-200">JF</div>
                                    <div className="flex-1 space-y-3">
                                        <div className="bg-gray-50/50 rounded-2xl p-4 text-sm font-bold text-gray-400 border border-gray-100 focus-within:bg-white focus-within:border-blue-100 transition-all">
                                            <textarea
                                                placeholder="Say hello to your fellow attendees..."
                                                className="w-full bg-transparent outline-none resize-none"
                                                rows={1}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex gap-2">
                                                <button className="px-3 py-2 bg-gray-50 rounded-lg text-[9px] font-black text-gray-400 uppercase tracking-widest hover:bg-gray-100 transition-all flex items-center gap-2">
                                                    <Sparkles className="w-3 h-3 text-blue-400" /> Interaction
                                                </button>
                                            </div>
                                            <button className="px-6 py-2 bg-gray-900 text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg shadow-gray-200 hover:scale-105 active:scale-95 transition-all">Broadcast</button>
                                        </div>
                                    </div>
                                </div>
                                <div className="h-px bg-gray-50" />
                                <div className="space-y-6">
                                    {[
                                        { name: "Sarah Jenkins", time: "2m ago", text: "Can't wait to see the spatial computing keynotes! Anyone else flying in from London? ✈", avatar: "sarah", likes: 12 },
                                        { name: "Marcus Thorne", time: "15m ago", text: "The Squad Pass flow was so smooth. See you all in Paris! 🇫🇷", avatar: "marcus", likes: 8 }
                                    ].map((post, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.1 }}
                                            className="flex gap-4 group"
                                        >
                                            <div className="w-10 h-10 bg-gray-100 rounded-xl flex-shrink-0 overflow-hidden border border-gray-100 group-hover:scale-110 transition-transform">
                                                <img src={`https://i.pravatar.cc/100?u=${post.avatar}`} alt="User" className="w-full h-full object-cover" />
                                            </div>
                                            <div className="flex-1 space-y-1.5">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[11px] font-black text-gray-900">{post.name}</span>
                                                    <span className="text-[9px] font-bold text-gray-300 uppercase">{post.time}</span>
                                                </div>
                                                <p className="text-sm font-bold text-gray-500/90 leading-relaxed">
                                                    {post.text}
                                                </p>
                                                <div className="flex items-center gap-4 pt-1">
                                                    <button className="flex items-center gap-1.5 text-[10px] font-black text-gray-300 hover:text-red-500 transition-all group/like">
                                                        <Heart className="w-3.5 h-3.5 group-hover/like:fill-red-500" /> {post.likes}
                                                    </button>
                                                    <button className="flex items-center gap-1.5 text-[10px] font-black text-gray-300 hover:text-blue-500 transition-all">
                                                        <MessageCircle className="w-3.5 h-3.5" /> Reply
                                                    </button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
