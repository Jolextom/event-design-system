"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
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
    Map as MapIcon,
    ArrowRight,
    ArrowLeft,
    Plus,
    Minus,
    Mail,
    PlusCircle,
    Loader2,
    AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Event, Pass, Question } from "../events/[tag]/types";
import { initializeTransaction } from "@/app/actions";
import { fulfillOrder } from "@/lib/registrations";
import Script from "next/script";

export default function RegistrationPage() {
    const params = useParams();
    const tag = typeof params === "object" && params?.tag ? String(params.tag) : null;

    // --- State ---
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);  // Page-level error (event not found)
    const [formError, setFormError] = useState<string | null>(null);  // Form validation errors
    const [event, setEvent] = useState<Event | null>(null);
    const [passes, setPasses] = useState<Pass[]>([]);
    const [questions, setQuestions] = useState<Question[]>([]);

    const [step, setStep] = useState(1);
    const [selectedTicket, setSelectedTicket] = useState<string>("");
    const [quantity, setQuantity] = useState(1);
    const [guests, setGuests] = useState([{ firstName: "", lastName: "", email: "", isInvite: false, answers: {} as Record<string, string> }]);
    const [submitting, setSubmitting] = useState(false);

    // --- Trigger Question Logic (Dynamic Track Selection) ---
    const [triggerAnswers, setTriggerAnswers] = useState<Record<string, string>>({});
    const [currentTriggerIndex, setCurrentTriggerIndex] = useState(0);
    
    // Questions that have at least one option linked to a pass OR explicitly marked as selection logic
    const triggerQuestions = React.useMemo(() => {
        // Selection logic questions take precedence and are always triggers
        const selectionQuestions = questions.filter(q => q.is_selection_logic);
        
        // Also include questions that have options linked to passes (for backward compatibility or implicit logic)
        const logicQuestionIds = new Set(passes.map(p => {
             const opt = questions.flatMap(q => q.options || []).find(o => o.id === p.show_for_option_id);
             return opt?.question_id;
        }).filter(Boolean));
        
        const implicitLogicQuestions = questions.filter(q => logicQuestionIds.has(q.id) && !q.is_selection_logic);
        
        // Combine and sort, ensuring uniqueness by ID
        const combinedQuestions = [...selectionQuestions, ...implicitLogicQuestions];
        const uniqueQuestionsMap = new Map();
        combinedQuestions.forEach(q => {
            if (q && q.id) uniqueQuestionsMap.set(q.id, q);
        });
        
        const uniqueQuestionsList = Array.from(uniqueQuestionsMap.values()) as Question[];

        return uniqueQuestionsList.sort((a, b) => (a.question_order || 0) - (b.question_order || 0));
    }, [passes, questions]);

    // Filter passes based on selected trigger answers
    const filteredPasses = React.useMemo(() => {
        // If there are no trigger questions, show all passes
        if (triggerQuestions.length === 0) return passes;

        return passes.filter(p => {
            // If ticket is not linked to any option, it's always visible
            if (!p.show_for_option_id) return true;
            
            // If ticket is linked, only show if the user selected that option
            return Object.values(triggerAnswers).includes(p.show_for_option_id);
        });
    }, [passes, triggerAnswers, triggerQuestions]);

    // Auto-advance if no trigger questions or all answered
    const allTriggersAnswered = triggerQuestions.length === 0 || (Object.keys(triggerAnswers).length >= triggerQuestions.length && triggerQuestions.every(q => triggerAnswers[q.id]));

    // --- Data Fetching ---
    useEffect(() => {
        if (!tag) return;

        const fetchData = async () => {
            setLoading(true);
            setError(null);

            const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            );

            try {
                const { data, error: eventErr } = await supabase
                    .from("events")
                    .select(`
                        *,
                        passes (*),
                        questions (
                            *,
                            options:question_options (*)
                        )
                    `)
                    .eq("tag", tag)
                    .single();

                if (eventErr) {
                    if (eventErr.code === "PGRST116") {
                        setError("Event not found");
                    } else {
                        throw eventErr;
                    }
                    return;
                }

                if (data) {
                    setEvent(data);
                    const sortedPasses = (data.passes || []).sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0));
                    setPasses(sortedPasses);

                    if (sortedPasses.length > 0) {
                        setSelectedTicket(sortedPasses[0].id);
                    }

                    const sortedQuestions = (data.questions || [])
                        .sort((a: any, b: any) => a.question_order - b.question_order)
                        .map((q: any) => ({
                            ...q,
                            options: (q.options || []).sort((a: any, b: any) => a.display_order - b.display_order)
                        }));
                    setQuestions(sortedQuestions);
                }
            } catch (err: any) {
                console.error("Error fetching registration data:", err);
                setError(err.message || "Failed to load registration page");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [tag]);

    // --- Helpers ---
    const currentTicket = passes.find(t => t.id === selectedTicket);
    const totalGuests = currentTicket?.type === "group"
        ? (currentTicket.group_size || 1)
        : quantity;

    // Sync guests array when totalGuests changes
    useEffect(() => {
        setGuests(prev => {
            const newGuests = [...prev];
            if (newGuests.length < totalGuests) {
                for (let i = newGuests.length; i < totalGuests; i++) {
                    newGuests.push({ firstName: "", lastName: "", email: "", isInvite: true, answers: {} });
                }
            } else if (newGuests.length > totalGuests) {
                return newGuests.slice(0, totalGuests);
            }
            return newGuests;
        });
    }, [totalGuests]);

    const handleRegister = async () => {
        if (!event || !selectedTicket) return;
        setSubmitting(true);
        setFormError(null);

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        try {
            // Get the selected pass
            const pass = passes.find(p => p.id === selectedTicket);
            if (!pass) throw new Error("Selected ticket not found");

            // === VALIDATION 1: Check primary guest has required fields ===
            const primaryGuest = guests[0];
            if (!primaryGuest.firstName?.trim() && !primaryGuest.isInvite) {
                throw new Error("First name is required");
            }
            if (!primaryGuest.email?.trim()) {
                throw new Error("Email is required");
            }

            // Basic email format check
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (primaryGuest.email && !emailRegex.test(primaryGuest.email)) {
                throw new Error("Please enter a valid email address");
            }

            // === VALIDATION 2: Filter valid guests ===
            const validGuests = guests.filter(g => {
                if (g.isInvite && !g.email) return false;
                if (!g.isInvite && (!g.email || !g.firstName)) return false;
                return true;
            });

            if (validGuests.length === 0) {
                throw new Error("Please complete at least one guest's registration details");
            }

            // === VALIDATION 3: Check for duplicate emails in form ===
            const emailsInForm = validGuests.map(g => g.email.toLowerCase().trim());
            const uniqueEmails = new Set(emailsInForm);
            if (uniqueEmails.size !== emailsInForm.length) {
                throw new Error("Each attendee must have a unique email address");
            }

            // === VALIDATION 4: Check if emails already registered for this event (Attendees ONLY) ===
            const { data: existingAttendees } = await supabase
                .from("attendees")
                .select("email")
                .eq("event_id", event.id)
                .in("email", emailsInForm);

            if (existingAttendees && existingAttendees.length > 0) {
                const alreadyRegistered = existingAttendees.map(r => r.email).join(", ");
                throw new Error(`Already registered for this event: ${alreadyRegistered}`);
            }

            // === VALIDATION 5: Check required questions are answered ===
            const requiredQuestions = questions.filter(q => q.is_required);
            for (let i = 0; i < validGuests.length; i++) {
                const guest = validGuests[i];
                // Only check non-invite guests (invites just have email)
                if (!guest.isInvite) {
                    for (const rq of requiredQuestions) {
                        const answer = guest.answers[rq.id];
                        if (!answer || !String(answer).trim()) {
                            const guestLabel = i === 0 ? "Primary guest" : `Guest ${i + 1}`;
                            throw new Error(`${guestLabel} must answer: "${rq.title}"`);
                        }
                    }
                }
            }

            // === VALIDATION 6: Check ticket availability ===
            const ticketQuantity = pass.type === "group" ? 1 : validGuests.length;
            const remaining = (pass.quantity_available || 0) - (pass.quantity_sold || 0);
            if (ticketQuantity > remaining) {
                throw new Error(`Only ${remaining} ticket(s) remaining for ${pass.title}`);
            }

            // 4. Determine if payment is needed
            const isPaid = !currentTicket?.is_free && (currentTicket?.price ?? 0) > 0;
            const expectedPrice = currentTicket?.price ?? 0;

            // === CHECK IF ALREADY REGISTERED (Attendee is source of truth) ===
            const { data: existingAttendee } = await supabase
                .from("attendees")
                .select("id")
                .eq("event_id", event.id)
                .eq("email", primaryGuest.email)
                .maybeSingle();

            if (existingAttendee) {
                throw new Error(`Already registered for this event: ${primaryGuest.email}`);
            }

            // === CHECK FOR EXISTING PENDING ORDER ===
            const { data: existingOrder } = await supabase
                .from("orders_table")
                .select("id, order_ref, total_amount, pass_id")
                .eq("event_id", event.id)
                .eq("email", primaryGuest.email)
                .eq("status", "pending")
                .maybeSingle();

            // === IDEMPOTENCY LOGIC: Reuse order_ref if ticket and price are the same ===
            let orderRef: string;
            if (existingOrder && existingOrder.pass_id === pass.id && Number(existingOrder.total_amount) === expectedPrice) {
                // Same intent, reuse the Paystack reference to prevent double payment
                orderRef = existingOrder.order_ref;
            } else {
                // New intent or changed ticket/price, generate a new reference
                const uniquePart = crypto.randomUUID().replace(/-/g, '').substring(0, 10).toUpperCase();
                orderRef = `EF-${event.tag?.toUpperCase() || 'EV'}-${uniquePart}`;
            }

            // === UPSERT ORDER ===
            const orderData = {
                event_id: event.id,
                pass_id: pass.id,
                quantity: ticketQuantity,
                first_name: primaryGuest.firstName || "Guest",
                last_name: primaryGuest.lastName || "",
                email: primaryGuest.email,
                order_ref: orderRef,
                total_amount: isPaid ? expectedPrice : 0,
                expected_amount_kobo: isPaid ? Math.round(expectedPrice * 100) : 0,
                status: isPaid ? "pending" : "completed",
                updated_at: new Date().toISOString()
            };

            const { data: order, error: orderErr } = existingOrder 
                ? await supabase
                    .from("orders_table")
                    .update(orderData)
                    .eq("id", existingOrder.id)
                    .select()
                    .single()
                : await supabase
                    .from("orders_table")
                    .insert(orderData)
                    .select()
                    .single();

            if (orderErr) {
                console.error("Order processing failed:", orderErr);
                throw new Error(orderErr.message || "Failed to process order. Please try again.");
            }

            if (isPaid) {
                // === PAID FLOW: INITIATE PAYSTACK ===
                const amountInKobo = Math.round((currentTicket?.price ?? 0) * 100);
                
                const { data: paystackData, error: paystackErr } = await initializeTransaction({
                    email: guests[0].email,
                    amount: amountInKobo,
                    reference: orderRef,
                    metadata: {
                        orderId: order.id,
                        eventId: event.id,
                        passId: selectedTicket,
                        eventTag: event.tag,
                        validGuests: validGuests
                    },
                    callbackUrl: `${window.location.origin}/${event.tag}/receipt/${orderRef}`
                });

                if (paystackErr || !paystackData) {
                    throw new Error(paystackErr || "Failed to initialize payment");
                }

                // Redirect to Paystack
                window.location.href = paystackData.authorization_url;
                return;
            } else {
                // === FREE FLOW: FULFILL DIRECTLY ===
                await fulfillOrder({
                    orderId: order.id,
                    eventId: event.id,
                    passId: selectedTicket,
                    eventTag: event.tag || "event",
                    validGuests: validGuests,
                    totalAmount: 0
                });

                // === REDIRECT TO RECEIPT ===
                window.location.href = `/${event.tag}/receipt/${orderRef}`;
            }

        } catch (err: any) {
            console.error("Registration error:", err);
            // Provide user-friendly error message
            let errorMsg = String(err.message || "Failed to complete registration");
            // Clean up technical error messages
            if (errorMsg.includes("duplicate key") || errorMsg.includes("unique_event_email")) {
                errorMsg = "This email is already registered for this event";
            }
            setFormError(errorMsg);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <PublicPageSkeleton />;
    }

    if (error || !event) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
                <div className="w-20 h-20 bg-red-50 rounded-[32px] flex items-center justify-center mb-8 border border-red-100">
                    <AlertCircle className="w-10 h-10 text-red-600" />
                </div>
                <h1 className="text-3xl font-black text-gray-900 mb-4">{error || "Event not found"}</h1>
                <p className="text-gray-500 font-bold max-w-sm mb-10">We couldn't find the event you're looking for. Please check the URL and try again.</p>
                <Link href="/" className="px-8 py-4 bg-gray-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-gray-100">
                    Go Back Home
                </Link>
            </div>
        );
    }

    const TicketSelector = ({ isMobile = false, passes: passesProp = [] }: { isMobile?: boolean, passes?: Pass[] }) => {
        const displayPasses = passesProp && passesProp.length > 0 ? passesProp : (passes || []);
        const currentTrigger = triggerQuestions[currentTriggerIndex];

        if (!allTriggersAnswered && currentTrigger) {
            return (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="flex justify-between items-center mb-6">
                        <div className="space-y-1">
                            <h3 className={cn(
                                "font-black uppercase tracking-[0.3em] text-blue-600/40",
                                isMobile ? "text-[12px]" : "text-[10px]"
                            )}>
                                Preference {currentTriggerIndex + 1}/{triggerQuestions.length}
                            </h3>
                            <div className="h-1 w-12 bg-blue-600/10 rounded-full" />
                        </div>
                        {currentTriggerIndex > 0 && (
                             <button 
                             onClick={() => setCurrentTriggerIndex(prev => prev - 1)}
                             className="px-4 py-2 rounded-xl bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-gray-900 hover:bg-gray-100 transition-all border border-gray-100"
                         >
                             Back
                         </button>
                        )}
                    </div>
                    
                    <div className="space-y-4">
                        <h2 className="text-xl font-black text-gray-900 tracking-tight leading-tight">
                            {currentTrigger.title}
                        </h2>
                        <div className="space-y-3">
                            {currentTrigger.options?.map(opt => {
                                const isSelected = triggerAnswers[currentTrigger.id] === opt.id;
                                return (
                                    <button
                                        key={opt.id}
                                        onClick={() => {
                                            const newAnswers = { ...triggerAnswers, [currentTrigger.id]: opt.id };
                                            setTriggerAnswers(newAnswers);
                                            // Sync to primary guest answers
                                            setGuests(prev => {
                                                const updated = [...prev];
                                                updated[0] = { 
                                                    ...updated[0], 
                                                    answers: { ...updated[0].answers, [currentTrigger.id]: opt.option_text } 
                                                };
                                                return updated;
                                            });
                                            
                                            // Auto-advance to next trigger or show tickets
                                            if (currentTriggerIndex < triggerQuestions.length - 1) {
                                                setCurrentTriggerIndex(prev => prev + 1);
                                            }
                                        }}
                                        className={cn(
                                            "w-full p-5 rounded-[24px] border-2 transition-all flex items-center justify-between group",
                                            isSelected 
                                                ? "bg-blue-50/50 border-blue-600 shadow-sm" 
                                                : "bg-white border-gray-100 hover:border-gray-200"
                                        )}
                                    >
                                        <span className={cn("text-sm font-black transition-colors", isSelected ? "text-blue-700" : "text-gray-900")}>
                                            {opt.option_text}
                                        </span>
                                        <div className={cn(
                                            "w-8 h-8 rounded-xl flex items-center justify-center transition-colors",
                                            isSelected ? "bg-blue-600 text-white" : "bg-gray-50 text-gray-300 group-hover:bg-blue-50 group-hover:text-blue-500"
                                        )}>
                                            {isSelected ? <Check className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            );
        }
        
        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between mb-8">
                    <div className="space-y-1">
                        <h3 className={cn(
                            "font-black uppercase tracking-[0.3em] text-blue-600/40",
                            isMobile ? "text-[12px]" : "text-[10px]"
                        )}>
                            Available Passes
                        </h3>
                        <div className="h-1 w-12 bg-blue-600/10 rounded-full" />
                    </div>
                    {triggerQuestions.length > 0 && (
                        <button 
                            onClick={() => {
                                setTriggerAnswers({});
                                setCurrentTriggerIndex(0);
                            }}
                                                        className="text-[9px] font-black text-gray-400 uppercase tracking-widest hover:text-blue-600 transition-colors flex items-center gap-1.5"
                        >
                            <ArrowLeft className="w-3 h-3" /> Change Language
                        </button>
                    )}
                </div>
                <div className="space-y-3">
                    {displayPasses.map(ticket => {
                    const isSelected = selectedTicket === ticket.id;
                    return (
                        <div key={ticket.id} className="space-y-2">
                            <button
                                onClick={() => {
                                    setSelectedTicket(ticket.id);
                                    if (ticket.type === "group") setQuantity(1);
                                }}
                                className={cn(
                                    "w-full px-5 py-4 rounded-[24px] border-2 transition-all flex items-center justify-between group text-left",
                                    isSelected
                                        ? "bg-blue-50/30 border-blue-600 shadow-[0_8px_24px_-12px_rgba(59,130,246,0.2)]"
                                        : "bg-white border-gray-100/80 hover:border-gray-200"
                                )}
                            >
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className={cn("text-sm font-black transition-colors leading-none", isSelected ? "text-blue-600" : "text-gray-900")}>
                                            {ticket.title}
                                        </div>
                                        {ticket.type === "group" && (
                                            <span className="px-1 py-0.5 bg-gray-900 text-white text-[7px] font-black uppercase tracking-wider rounded-md">Group</span>
                                        )}
                                    </div>
                                    <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none">{ticket.description}</div>
                                </div>
                                <div className="text-right ml-4">
                                    <div className="text-lg font-black text-gray-900 tracking-tight">{ticket.is_free ? 'FREE' : `₦${(ticket.price ?? 0).toLocaleString()}`}</div>
                                </div>
                            </button>


                        </div>
                    );
                })}
            </div>
            {displayPasses.length === 0 && (
                <div className="py-10 text-center space-y-3">
                    <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto text-gray-200">
                        <Ticket className="w-6 h-6" />
                    </div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No tickets available for these choices.</p>
                </div>
            )}
        </div>
    );
};

    const titleParts = (event?.event_title || "").split(' ');
    const displayTitleMain = titleParts.slice(0, -1).join(' ');
    const displayTitleLast = titleParts[titleParts.length - 1];

    const displayDate = (() => {
        if (!event.start_date) return "Date TBA";

        const startDate = new Date(event.start_date);
        const startYear = startDate.getFullYear();
        const startMonth = startDate.toLocaleDateString('en-US', { month: 'short' });
        const startDay = startDate.getDate();
        const startWeekday = startDate.toLocaleDateString('en-US', { weekday: 'short' });

        let dateStr = `${startWeekday}, ${startMonth} ${startDay}, ${startYear}`;

        if (event.end_date) {
            const endDate = new Date(event?.end_date || "");
            const isSameDay = startDate.toDateString() === endDate.toDateString();

            if (!isSameDay) {
                const endYear = endDate.getFullYear();
                const endMonth = endDate.toLocaleDateString('en-US', { month: 'short' });
                const endDay = endDate.getDate();

                // Format: Jan 22 - 25, 2026
                if (startYear !== endYear) {
                    dateStr = `${startMonth} ${startDay}, ${startYear} – ${endMonth} ${endDay}, ${endYear}`;
                } else if (startMonth !== endMonth) {
                    dateStr = `${startMonth} ${startDay} – ${endMonth} ${endDay}, ${startYear}`;
                } else {
                    dateStr = `${startMonth} ${startDay} – ${endDay}, ${startYear}`;
                }
            }
        }
        return dateStr;
    })();

    return (
        <div className="min-h-screen bg-white text-[#111827] selection:bg-blue-100 pb-32 relative">
            {/* Redirection / Submitting Overlay */}
            <AnimatePresence>
                {submitting && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-white/90 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center"
                    >
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="space-y-8"
                        >
                            <div className="relative inline-block">
                                <div className="w-24 h-24 bg-gray-900 rounded-[32px] flex items-center justify-center shadow-2xl relative z-10 mx-auto">
                                    <Loader2 className="w-10 h-10 text-white animate-spin stroke-[3]" />
                                </div>
                                <div className="absolute inset-0 bg-blue-100 blur-3xl opacity-50 scale-150 animate-pulse" />
                            </div>
                            
                            <div className="space-y-3">
                                <h2 className="text-3xl font-black text-gray-900 tracking-tight leading-none uppercase italic">
                                    Securely Processing<br />
                                    <span className="text-blue-600">Your Registration</span>
                                </h2>
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">
                                    {(currentTicket as any) && !(currentTicket as any).is_free && ((currentTicket as any).price ?? 0) > 0 
                                        ? "Preparing secure payment gateway..." 
                                        : "Finalizing your spot and ticket..."}
                                </p>
                            </div>

                            <div className="flex items-center justify-center gap-1.5 pt-4">
                                {[0, 1, 2].map((i) => (
                                    <motion.div
                                        key={i}
                                        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 1, 0.3] }}
                                        transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.2 }}
                                        className="w-1.5 h-1.5 bg-blue-600 rounded-full"
                                    />
                                ))}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Top Navigation */}
            <header className="w-full p-6 md:px-10 md:py-8 flex items-center justify-between z-50 bg-white/80 backdrop-blur-md sticky top-0 border-b border-gray-50">
                <div className="flex items-center gap-2 group cursor-pointer">
                    <div className="w-7 h-7 flex items-center justify-center font-black text-xs bg-red-50 text-red-600 rounded-lg border border-red-100">❤</div>
                    <span className="font-black tracking-tighter text-gray-900 text-base">EventFlow</span>
                </div>
                <div className="flex items-center gap-3">
                    <button className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                        <Share2 className="w-5 h-5 text-gray-400" />
                    </button>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-6 md:px-10 pt-10 md:pt-14">

                {/* --- HEADER ARCHITECTURE (Integrated & Airy) --- */}
                <header className="max-w-3xl mb-10 space-y-6">
                    {/* Pre-header Badges */}
                    <div className="flex items-center gap-3">
                        <span className="px-3.5 py-1.5 bg-blue-50 text-blue-600 text-[9px] font-black uppercase tracking-[0.2em] rounded-full border border-blue-100">
                            {event?.event_format === 'virtual' ? 'Virtual Event' : event?.event_format === 'hybrid' ? 'Hybrid Event' : 'Physical Event'}
                        </span>
                        <div className="flex items-center gap-2 px-3.5 py-1.5 bg-green-50 text-green-600 text-[9px] font-black uppercase tracking-[0.2em] rounded-full border border-green-100">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                            Live
                        </div>
                    </div>

                    {/* Main Title */}
                    <h1 className="text-4xl md:text-6xl font-black tracking-tight text-gray-900 leading-[0.85]">
                        {displayTitleMain} <br />
                        <span className="text-gray-900/20">{displayTitleLast}</span>
                    </h1>

                    {/* Host Interaction */}
                    <div className="flex items-center gap-4">
                        <div className="w-11 h-11 bg-gray-50 text-gray-400 rounded-2xl flex items-center justify-center font-black text-sm border border-gray-100 shadow-inner">
                            {event?.event_title?.charAt(0)}
                        </div>
                        <div>
                            <div className="flex items-center gap-1.5 leading-none mb-1">
                                <span className="text-base font-black text-gray-900">Hosted by Team {event?.event_title?.split(' ')[0]}</span>
                                <Check className="w-3.5 h-3.5 text-blue-500 fill-blue-500" />
                            </div>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.1em] block">Verified Partner</span>
                        </div>
                    </div>
                </header>

                {/* --- CENTERED CARD HERO --- */}
                <section className="mb-16">
                    <div className="bg-gray-100 rounded-[48px] overflow-hidden relative group shadow-2xl shadow-gray-100 border border-gray-50">
                        {event?.image ? (
                            <div className="aspect-[16/9] md:aspect-[21/9] md:max-h-[520px] w-full relative overflow-hidden">
                                <img
                                    src={event.image}
                                    alt="Event Cover"
                                    className="w-full h-full object-cover"
                                    style={{
                                        objectPosition: `50% ${event.image_focus_y ?? 50}%`
                                    }}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-gray-900/10 to-transparent" />
                            </div>
                        ) : (
                            <div className="aspect-[16/9] md:aspect-[21/9] md:max-h-[520px] w-full bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center">
                                <Sparkles className="w-16 h-16 text-gray-200" />
                            </div>
                        )}
                    </div>
                </section>



                {/* --- NARRATIVE FIRST: The Story --- */}
                <section className="mb-20 max-w-4xl">
                    <div className="space-y-8">
                        <h2 className="text-[9px] font-black uppercase tracking-[0.4em] text-gray-300">The Narrative</h2>
                        <div
                            className="max-w-none [&_p]:text-xl [&_p]:md:text-3xl [&_p]:font-medium [&_p]:text-gray-600 [&_p]:leading-relaxed [&_strong]:text-gray-900 [&_strong]:font-black [&_em]:italic [&_ul]:list-disc [&_ul]:ml-6 [&_ol]:list-decimal [&_ol]:ml-6 [&_li]:text-xl [&_li]:md:text-2xl [&_a]:text-blue-600 [&_a]:underline"
                            dangerouslySetInnerHTML={{ __html: event?.description || "<p>Join us for this exclusive event.</p>" }}
                        />
                    </div>
                </section>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 md:gap-20">
                    {/* LEFT COL: LOGISTICS */}
                    <div className="lg:col-span-7 space-y-20">
                        {/* Info Tiles */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-y-10 gap-x-6 md:gap-8">
                            <div className="space-y-2.5">
                                <div className="flex items-center gap-2 text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1">
                                    <Calendar className="w-3 h-3" /> Date
                                </div>
                                <div className="text-[15px] font-black text-gray-900 leading-tight">
                                    {displayDate}
                                </div>
                            </div>
                            <div className="space-y-2.5 md:border-x px-0 md:px-8 border-gray-100">
                                <div className="flex items-center gap-2 text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1">
                                    <Clock className="w-3 h-3" /> Time
                                </div>
                                <div className="text-[15px] font-black text-gray-900 leading-tight">
                                    {event.start_time}
                                </div>
                            </div>
                            <div className="space-y-2.5 col-span-2 md:col-span-1 border-t md:border-t-0 pt-8 md:pt-0 border-gray-50">
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2 text-[9px] font-black text-gray-300 uppercase tracking-widest">
                                        <MapPin className="w-3 h-3" /> Location
                                    </div>
                                    {event.event_format !== 'virtual' && (
                                        <button className="text-[8px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-700 transition-colors flex items-center gap-1.5 px-2 py-1 bg-blue-50 rounded-lg">
                                            <MapIcon className="w-2.5 h-2.5" /> Map
                                        </button>
                                    )}
                                </div>
                                <div className="text-[15px] font-black text-gray-900 leading-tight">
                                    {event?.event_format === 'virtual' 
                                        ? (event?.virtual_platform || 'Google Meet') 
                                        : event?.event_format === 'hybrid' 
                                            ? `${event?.location} (and Online)` 
                                            : event?.location}
                                </div>
                            </div>
                        </div>

                        {/* UNIFIED TICKET SELECTOR */}
                        <div id="tickets-section" className="py-10 border-y border-gray-50 space-y-6 scroll-mt-32">
                            <TicketSelector isMobile={false} passes={filteredPasses} />
                            
                            {allTriggersAnswered && passes.length > 0 && (
                                <button
                                    onClick={() => setStep(2)}
                                    className="w-full py-5 bg-gray-900 text-white rounded-[24px] font-black text-base shadow-[0_20px_40px_-12px_rgba(0,0,0,0.15)] hover:bg-gray-800 active:scale-95 transition-all flex items-center justify-center gap-3"
                                >
                                    Next step <ArrowRight className="w-5 h-5" />
                                </button>
                            )}
                        </div>


                        {/* Footer Vibe (Commented out for now)
                        <div className="flex items-center gap-10 pt-10">
                            <div className="flex items-center gap-3 group cursor-pointer">
                                <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center border border-gray-100 group-hover:bg-red-50 group-hover:border-red-100 transition-all">
                                    <Heart className="w-5 h-5 text-gray-300 group-hover:text-red-500" />
                                </div>
                                <div>
                                    <div className="text-sm font-black text-gray-900">{Math.floor(Math.random() * 5 + 1)}k</div>
                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Interactions</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 group cursor-pointer">
                                <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center border border-gray-100 group-hover:bg-blue-50 group-hover:border-blue-100 transition-all">
                                    <MessageCircle className="w-5 h-5 text-gray-300 group-hover:text-blue-500" />
                                </div>
                                <div>
                                    <div className="text-sm font-black text-gray-900">{Math.floor(Math.random() * 200 + 50)}</div>
                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Public Chat</div>
                                </div>
                            </div>
                        </div>
                        */}
                    </div>

                    {/* RIGHT COL: STICKY SELECTOR (Desktop) */}
                    <div className="hidden lg:block lg:col-span-5">
                        <div className="sticky top-32">
                            <div className="bg-white border border-gray-100 shadow-[0_48px_96px_-32px_rgba(0,0,0,0.06)] rounded-[48px] overflow-hidden">
                                <div className="p-8 md:p-10 space-y-8">
                                    {passes.length > 0 ? (
                                        <div className="text-center py-4">
                                            <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">Select a ticket in the main section to continue</p>
                                        </div>
                                    ) : (
                                        <div className="text-center py-10 space-y-6">
                                            <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto border border-gray-100">
                                                <Ticket className="w-8 h-8 text-gray-300" />
                                            </div>
                                            <div className="space-y-2">
                                                <h3 className="text-xl font-black text-gray-900 tracking-tight">Tickets Not Available</h3>
                                                <p className="text-gray-400 font-medium text-sm leading-relaxed max-w-[240px] mx-auto">
                                                    Ticket sales haven't started for this event yet. Please check back later.
                                                </p>
                                            </div>
                                            <button disabled className="w-full py-4 bg-gray-100 text-gray-400 rounded-[24px] font-black text-sm uppercase tracking-wider cursor-not-allowed">
                                                Coming Soon
                                            </button>
                                        </div>
                                    )}
                                </div>
                                {/* Verified Badge (Commented out for now)
                                <div className="bg-gray-50/50 p-5 flex items-center justify-center border-t border-gray-50">
                                    <span className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">Verified Event — EventFlow Safe</span>
                                </div>
                                */}
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* --- MOBILE STICKY FOOTER --- */}
            <div className="fixed bottom-0 left-0 w-full p-6 md:hidden z-[60] bg-white/95 backdrop-blur-2xl border-t border-gray-100 shadow-[0_-20px_60px_rgba(0,0,0,0.08)]">
                {passes.length > 0 ? (
                    <div className="max-w-md mx-auto flex items-center justify-between gap-6">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-1">Your Pass</span>
                            <div className="flex items-baseline gap-1">
                                <span className="text-3xl font-black text-gray-900 tracking-tight">{currentTicket?.is_free ? 'FREE' : `₦${(currentTicket?.price ?? 0).toLocaleString()}`}</span>
                            </div>
                        </div>
                        <button
                            onClick={() => setStep(2)}
                            className="flex-1 py-5 bg-gray-900 text-white rounded-[24px] font-black text-base shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            Register <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                ) : (
                    <div className="max-w-md mx-auto">
                        <button disabled className="w-full py-4 bg-gray-100 text-gray-400 rounded-[24px] font-black text-sm uppercase tracking-wider cursor-not-allowed">
                            Tickets Coming Soon
                        </button>
                    </div>
                )}
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
                            className="bg-white max-w-xl w-full rounded-[40px] md:rounded-[56px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                        >
                            <div className="p-7 md:p-9 border-b border-gray-50 flex items-center justify-between bg-white sticky top-0 z-10">
                                <button onClick={() => setStep(1)} className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-all">
                                    <ChevronLeft className="w-4 h-4" /> Back
                                </button>
                                <h2 className="text-xl font-black text-gray-900 tracking-tight">Guest Info</h2>
                                <div className="w-10 h-1 bg-blue-50 rounded-full" />
                            </div>

                            <div className="p-6 md:p-10 overflow-y-auto space-y-8 custom-scrollbar">
                                <div className="space-y-12">
                                    {guests.map((guest, index) => {
                                        const isPrimary = index === 0;

                                        return (
                                            <div key={index} className="space-y-8">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-[10px] font-black text-gray-400 border border-gray-100 uppercase tracking-widest">
                                                            #{index + 1}
                                                        </div>
                                                        <h3 className="text-xs font-black text-gray-900 uppercase tracking-[0.2em]">
                                                            {isPrimary ? "Primary Guest" : `Guest ${index + 1}`}
                                                        </h3>
                                                    </div>

                                                    {!isPrimary && (
                                                        <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-100">
                                                            <button
                                                                onClick={() => {
                                                                    const ng = [...guests];
                                                                    ng[index].isInvite = false;
                                                                    setGuests(ng);
                                                                }}
                                                                className={cn(
                                                                    "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                                                                    !guest.isInvite ? "bg-white text-gray-900 shadow-sm" : "text-gray-400"
                                                                )}
                                                            >
                                                                Fill Info
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    const ng = [...guests];
                                                                    ng[index].isInvite = true;
                                                                    setGuests(ng);
                                                                }}
                                                                className={cn(
                                                                    "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                                                                    guest.isInvite ? "bg-white text-gray-900 shadow-sm" : "text-gray-400"
                                                                )}
                                                            >
                                                                Invite
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>

                                                <AnimatePresence mode="wait">
                                                    {!guest.isInvite || isPrimary ? (
                                                        <motion.div
                                                            key="form"
                                                            initial={{ opacity: 0, height: 0 }}
                                                            animate={{ opacity: 1, height: "auto" }}
                                                            exit={{ opacity: 0, height: 0 }}
                                                            className="space-y-6 overflow-hidden"
                                                        >
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                                <div className="space-y-3">
                                                                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">First Name</label>
                                                                    <input
                                                                        value={guest.firstName}
                                                                        onChange={(e) => {
                                                                            const newGuests = [...guests];
                                                                            newGuests[index].firstName = e.target.value;
                                                                            setGuests(newGuests);
                                                                        }}
                                                                        placeholder="Jane"
                                                                        className="w-full bg-gray-50/50 border-gray-100 focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-50 rounded-[20px] p-4 text-sm font-bold outline-none transition-all border"
                                                                    />
                                                                </div>
                                                                <div className="space-y-3">
                                                                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Last Name</label>
                                                                    <input
                                                                        value={guest.lastName}
                                                                        onChange={(e) => {
                                                                            const newGuests = [...guests];
                                                                            newGuests[index].lastName = e.target.value;
                                                                            setGuests(newGuests);
                                                                        }}
                                                                        placeholder="Smith"
                                                                        className="w-full bg-gray-50/50 border-gray-100 focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-50 rounded-[20px] p-4 text-sm font-bold outline-none transition-all border"
                                                                    />
                                                                </div>
                                                            </div>
                                                            <div className="space-y-3">
                                                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Email Address</label>
                                                                <input
                                                                    type="email"
                                                                    value={guest.email}
                                                                    onChange={(e) => {
                                                                        const newGuests = [...guests];
                                                                        newGuests[index].email = e.target.value;
                                                                        setGuests(newGuests);
                                                                    }}
                                                                    placeholder="jane@studio.com"
                                                                    className="w-full bg-gray-50/50 border-gray-100 focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-50 rounded-[20px] p-4 text-sm font-bold outline-none transition-all border"
                                                                />
                                                            </div>

                                                            {/* Custom Dynamic Questions */}
                                                            {questions.map((q) => (
                                                                <div key={q.id} className="space-y-3">
                                                                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">
                                                                        {q.title} {q.is_required && <span className="text-red-500">*</span>}
                                                                    </label>
                                                                    {q.question_type === 'select' ? (
                                                                        <div className="relative">
                                                                            <select
                                                                                value={guest.answers[q.id] || ""}
                                                                                onChange={(e) => {
                                                                                    const newGuests = [...guests];
                                                                                    newGuests[index].answers = { ...newGuests[index].answers, [q.id]: e.target.value };
                                                                                    setGuests(newGuests);
                                                                                }}
                                                                                className="w-full bg-gray-50/50 border-gray-100 focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-50 rounded-[20px] p-4 text-sm font-bold outline-none transition-all border appearance-none cursor-pointer"
                                                                            >
                                                                                <option value="" disabled>Select an option</option>
                                                                                {q.options?.map(opt => (
                                                                                    <option key={opt.id} value={opt.option_text}>{opt.option_text}</option>
                                                                                ))}
                                                                            </select>
                                                                            <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                                                                <PlusCircle className="w-4 h-4 rotate-45" />
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <input
                                                                            value={guest.answers[q.id] || ""}
                                                                            onChange={(e) => {
                                                                                const newGuests = [...guests];
                                                                                newGuests[index].answers = { ...newGuests[index].answers, [q.id]: e.target.value };
                                                                                setGuests(newGuests);
                                                                            }}
                                                                            placeholder="Your answer"
                                                                            className="w-full bg-gray-50/50 border-gray-100 focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-50 rounded-[20px] p-4 text-sm font-bold outline-none transition-all border"
                                                                        />
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </motion.div>
                                                    ) : (
                                                        <motion.div
                                                            key="invite"
                                                            initial={{ opacity: 0, scale: 0.95 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            exit={{ opacity: 0, scale: 0.95 }}
                                                            className="p-6 bg-blue-50/30 border border-blue-100 rounded-[24px] space-y-4"
                                                        >
                                                            <div className="space-y-3">
                                                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Enter email to invite guest</label>
                                                                <input
                                                                    type="email"
                                                                    value={guest.email}
                                                                    onChange={(e) => {
                                                                        const newGuests = [...guests];
                                                                        newGuests[index].email = e.target.value;
                                                                        setGuests(newGuests);
                                                                    }}
                                                                    placeholder="guest@email.com"
                                                                    className="w-full bg-white border-blue-100 focus:border-blue-600 focus:ring-4 focus:ring-blue-50 rounded-[20px] p-4 text-sm font-bold outline-none transition-all border"
                                                                />
                                                            </div>
                                                            <p className="text-[10px] font-bold text-gray-400 leading-relaxed italic">
                                                                We'll send them a dynamic link to complete their registration and answer custom questions.
                                                            </p>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>

                                                {index < guests.length - 1 && <div className="h-px bg-gray-50 w-full" />}
                                            </div>
                                        );
                                    })}


                                </div>

                                <div className="pt-4 space-y-4">
                                    {/* Inline Error Display */}
                                    {formError && (
                                        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3">
                                            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-sm font-bold text-red-600">{formError}</p>
                                                <button
                                                    onClick={() => setFormError(null)}
                                                    className="text-xs font-bold text-red-400 hover:text-red-600 mt-1 underline"
                                                >
                                                    Dismiss
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    <button
                                        onClick={handleRegister}
                                        disabled={submitting}
                                        className="w-full py-5 bg-gray-900 text-white rounded-[28px] font-black text-lg shadow-xl shadow-gray-200 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                                    >
                                        {submitting ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" /> Processing...
                                            </>
                                        ) : (
                                            "Complete Registration"
                                        )}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* --- SUCCESS STATE (DEDICATED RECEIPT PAGE) --- */}
            <AnimatePresence>
                {step === 3 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[110] bg-white overflow-y-auto custom-scrollbar"
                    >
                        {/* Immersive Backdrop */}
                        <div className="absolute top-0 left-0 w-full h-[40vh] bg-gradient-to-b from-blue-50/50 to-white -z-10" />
                        <div className="absolute top-20 right-[10%] w-64 h-64 bg-blue-100/30 blur-[100px] rounded-full -z-10" />
                        <div className="absolute top-40 left-[5%] w-96 h-96 bg-red-100/20 blur-[120px] rounded-full -z-10" />

                        <div className="max-w-4xl mx-auto px-6 py-16 md:py-24">
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                className="text-center space-y-12"
                            >
                                {/* Success Icon */}
                                <div className="relative inline-block">
                                    <div className="w-20 h-20 bg-green-500 rounded-[30px] flex items-center justify-center shadow-[0_20px_40px_-8px_rgba(34,197,94,0.3)] relative z-10 mx-auto">
                                        <Check className="w-10 h-10 text-white stroke-[4]" />
                                    </div>
                                    <div className="absolute inset-0 bg-green-200 blur-2xl opacity-40 scale-150 animate-pulse" />
                                </div>

                                {/* Headline */}
                                <div className="space-y-4">
                                    <h2 className="text-5xl md:text-8xl font-black tracking-tight text-gray-900 leading-[0.85]">
                                        See you at <br />
                                        <span className="text-gray-900/10 italic">{displayTitleLast}.</span>
                                    </h2>
                                    <p className="text-lg md:text-xl text-gray-400 font-bold max-w-lg mx-auto leading-relaxed">
                                        You're all set for <span className="text-gray-900">{event.start_date}</span>. We've sent a confirmation email to <span className="text-blue-600">{guests[0].email}</span>.
                                    </p>
                                </div>

                                {/* The Receipt Card (Fixed Overlap) */}
                                <div className="relative max-w-2xl mx-auto">
                                    <div className="absolute -inset-4 bg-gray-900/[0.02] rounded-[72px] -z-10" />

                                    <div className="bg-white rounded-[64px] border border-gray-100 shadow-[0_48px_96px_-32px_rgba(0,0,0,0.08)] overflow-hidden text-left relative">
                                        {/* Decorative Ticket Notch */}
                                        <div className="absolute top-1/2 -left-4 w-8 h-8 bg-white border border-gray-100 rounded-full -translate-y-1/2" />
                                        <div className="absolute top-1/2 -right-4 w-8 h-8 bg-white border border-gray-100 rounded-full -translate-y-1/2" />

                                        <div className="p-10 md:p-14 space-y-12">
                                            {/* Top: Branding & Reference */}
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 bg-red-50 text-red-600 rounded flex items-center justify-center font-black text-[10px] border border-red-100">❤</div>
                                                    <span className="font-black text-xs tracking-tighter uppercase italic">EventFlow</span>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-300">Reference</div>
                                                    <div className="text-xs font-bold text-gray-900">EF-{currentTicket?.id.slice(0, 4).toUpperCase()}-{Math.floor(Math.random() * 89999 + 10000)}</div>
                                                </div>
                                            </div>

                                            {/* Middle: Guest & Pass (Stacked to avoid overlap) */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                                <div className="space-y-2">
                                                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Lead Attendee</div>
                                                    <div className="text-4xl font-black text-gray-900 tracking-tight break-words">
                                                        {guests[0].firstName} {guests[0].lastName}
                                                    </div>
                                                </div>
                                                <div className="space-y-2 md:text-right">
                                                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Pass Hierarchy</div>
                                                    <div className="text-4xl font-black text-blue-600 tracking-tight">
                                                        {currentTicket?.title} (₦{(currentTicket?.price ?? 0).toLocaleString()})
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Bottom: Status & Action */}
                                            <div className="pt-10 border-t border-gray-50 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
                                                <div className="flex flex-wrap gap-3">
                                                    <div className="px-3 py-1.5 bg-green-50 text-green-600 text-[10px] font-black uppercase tracking-widest rounded-xl border border-green-100 flex items-center gap-2">
                                                        <Check className="w-3 h-3" /> Pass Active
                                                    </div>
                                                    {totalGuests > 1 && (
                                                        <div className="px-3 py-1.5 bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest rounded-xl border border-blue-100 flex items-center gap-2">
                                                            <Mail className="w-3 h-3" /> {guests.filter(g => g.isInvite).length} Invites Sent
                                                        </div>
                                                    )}
                                                </div>
                                                <button className="flex items-center gap-2.5 px-6 py-3 bg-gray-50 hover:bg-gray-100 transition-colors rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-600">
                                                    <Ticket className="w-4 h-4" /> View Wallet
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Shared Action Suite */}
                                <div className="pt-8 flex flex-col sm:flex-row items-center justify-center gap-6">
                                    <button className="w-full sm:w-auto px-10 py-5 bg-white border border-gray-100 text-gray-900 rounded-[24px] font-black text-sm hover:shadow-lg transition-all flex items-center justify-center gap-3">
                                        <Sparkles className="w-5 h-5 text-blue-500" /> Share Invitation
                                    </button>
                                    <button
                                        onClick={() => setStep(1)}
                                        className="w-full sm:w-auto px-10 py-5 bg-gray-900 text-white rounded-[24px] font-black text-sm hover:scale-[1.05] active:scale-95 transition-all shadow-xl shadow-gray-200 flex items-center justify-center gap-3"
                                    >
                                        <ArrowLeft className="w-5 h-5" /> Back to Event
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
}

function PublicPageSkeleton() {
    return (
        <div className="min-h-screen bg-white overflow-hidden flex flex-col relative">

            {/* Immersive Background */}
            <div className="w-full p-6 md:px-10 md:py-8 flex items-center justify-between border-b border-gray-50">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-gray-100 animate-pulse" />
                    <div className="w-24 h-6 rounded-lg bg-gray-100 animate-pulse" />
                </div>
            </div>

            <main className="max-w-6xl mx-auto px-6 md:px-10 pt-10 md:pt-14">
                {/* Header Skeleton */}
                <div className="max-w-3xl mb-10 space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="w-20 h-6 rounded-full bg-gray-100 animate-pulse" />
                        <div className="w-16 h-6 rounded-full bg-gray-100 animate-pulse" />
                    </div>
                    <div className="space-y-4">
                        <div className="w-3/4 h-16 rounded-3xl bg-gray-100 animate-pulse" />
                        <div className="w-1/2 h-8 rounded-2xl bg-gray-100 animate-pulse" />
                    </div>
                </div>

                {/* Cover Image Skeleton */}
                <div className="mb-16">
                    <div className="aspect-[16/9] md:aspect-[21/9] w-full rounded-[48px] bg-gray-100 animate-pulse" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 md:gap-20">
                    {/* Left Col Skeleton */}
                    <div className="lg:col-span-7 space-y-20">
                        {/* Info Tiles */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="space-y-3">
                                    <div className="w-16 h-4 rounded bg-gray-100 animate-pulse" />
                                    <div className="w-32 h-6 rounded bg-gray-100 animate-pulse" />
                                </div>
                            ))}
                        </div>

                        {/* Description Skeleton */}
                        <div className="space-y-6">
                            <div className="w-32 h-4 rounded bg-gray-100 animate-pulse" />
                            <div className="space-y-4">
                                <div className="w-full h-4 rounded bg-gray-100 animate-pulse" />
                                <div className="w-full h-4 rounded bg-gray-100 animate-pulse" />
                                <div className="w-2/3 h-4 rounded bg-gray-100 animate-pulse" />
                                <div className="w-full h-4 rounded bg-gray-100 animate-pulse" />
                                <div className="w-1/2 h-4 rounded bg-gray-100 animate-pulse" />
                            </div>
                        </div>
                    </div>

                    {/* Right Col Skeleton (Sticky) */}
                    <div className="hidden lg:block lg:col-span-5">
                        <div className="h-96 rounded-[48px] bg-gray-100 animate-pulse" />
                    </div>
                </div>
            </main>
        </div>
    );
}
