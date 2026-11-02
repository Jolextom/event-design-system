"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { motion, AnimatePresence } from "framer-motion";
import { Inter, Sora } from "next/font/google";
import {
    ArrowLeft,
    ArrowUpRight,
    Check,
    CheckCircle2,
    ChevronDown,
    Globe,
    Loader2,
    AlertCircle,
    MapPin,
    Share2,
    Star,
    Ticket,
    X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Event, Pass, Question } from "../events/[tag]/types";
import { initializeTransaction } from "@/app/actions";
import { fulfillOrder } from "@/lib/registrations";
import { resolveTheme, themeStyle } from "./theme";

// Inter for body text, Sora for headings (applied via the `display` class below).
const inter = Inter({ subsets: ["latin"], display: "swap" });
const sora = Sora({ subsets: ["latin"], display: "swap", variable: "--font-sora" });
const display = "font-[family-name:var(--font-sora)]";

export default function RegistrationPage() {
    const params = useParams();
    const tag = typeof params === "object" && params?.tag ? String(params.tag) : null;
    const searchParams = useSearchParams();
    const referralCode = searchParams.get("ref");

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
    const [guests, setGuests] = useState([{ firstName: "", lastName: "", email: "", isInvite: false, answers: {} as Record<string, string | string[] | number> }]);
    const [submitting, setSubmitting] = useState(false);
    const [linkCopied, setLinkCopied] = useState(false);

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

    // Non-trigger questions to actually render on the guest-info form,
    // filtered the same way filteredPasses filters tickets — a question
    // with no show_for_option_id is always visible, one with it set is
    // only visible once the matching trigger option has been picked.
    const visibleFormQuestions = React.useMemo(() => {
        return questions.filter(q =>
            !q.is_selection_logic &&
            (!q.show_for_option_id || Object.values(triggerAnswers).includes(q.show_for_option_id))
        );
    }, [questions, triggerAnswers]);

    // Trigger answers resolved to their option text, keyed by question id —
    // this is what gets written into each guest's `answers` object (see the
    // totalGuests sync effect below), matching what the trigger-question
    // click handler stores for guest 0.
    const triggerAnswerTexts = React.useMemo(() => {
        const map: Record<string, string> = {};
        Object.entries(triggerAnswers).forEach(([questionId, optionId]) => {
            const opt = questions.find(q => q.id === questionId)?.options?.find(o => o.id === optionId);
            if (opt) map[questionId] = opt.option_text;
        });
        return map;
    }, [triggerAnswers, questions]);

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
                            options:question_options!question_options_question_id_fkey (*)
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

    // Sync guests array when totalGuests changes. Also keeps every guest's
    // trigger-question answers in sync with triggerAnswerTexts — previously
    // only guest 0 ever got the trigger answer written into it, so guests
    // 2+ on a group pass never carried the track they registered under.
    useEffect(() => {
        setGuests(prev => {
            let newGuests = [...prev];
            if (newGuests.length < totalGuests) {
                for (let i = newGuests.length; i < totalGuests; i++) {
                    newGuests.push({ firstName: "", lastName: "", email: "", isInvite: true, answers: { ...triggerAnswerTexts } });
                }
            } else if (newGuests.length > totalGuests) {
                newGuests = newGuests.slice(0, totalGuests);
            }
            return newGuests.map(g => ({ ...g, answers: { ...g.answers, ...triggerAnswerTexts } }));
        });
    }, [totalGuests, triggerAnswerTexts]);

    // Esc closes the registration dialog.
    useEffect(() => {
        if (step !== 2) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setStep(1); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [step]);

    const handleShare = async () => {
        const url = window.location.href;
        try {
            if (navigator.share) {
                await navigator.share({ title: event?.event_title, url });
            } else {
                await navigator.clipboard.writeText(url);
                setLinkCopied(true);
                setTimeout(() => setLinkCopied(false), 2000);
            }
        } catch {
            // Share sheet dismissed, or clipboard blocked — nothing to do.
        }
    };

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
            // visibleFormQuestions already excludes selection-logic questions
            // and anything hidden for the track that wasn't picked.
            const requiredQuestions = visibleFormQuestions.filter(q => q.is_required);
            for (let i = 0; i < validGuests.length; i++) {
                const guest = validGuests[i];
                // Only check non-invite guests (invites just have email)
                if (!guest.isInvite) {
                    for (const rq of requiredQuestions) {
                        const answer = guest.answers[rq.id];
                        const isEmpty = answer === undefined || answer === null || answer === ""
                            || (Array.isArray(answer) && answer.length === 0);
                        if (isEmpty) {
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

            // === PAYSTACK REFERENCE GENERATION ===
            // We ALWAYS generate a new, unique reference to prevent Paystack's "Duplicate Transaction Reference" error.
            // If the user is retrying a failed or abandoned checkout, Paystack requires a fresh reference.
            // Our webhook relies on orderId in metadata, so changing the order_ref on the DB record is safe.
            const uniquePart = crypto.randomUUID().replace(/-/g, '').substring(0, 10).toUpperCase();
            // order_ref is varchar(50) — long descriptive event tags (e.g. full-sentence
            // slugs) can overflow it once "EF-" + tag + "-" + uniquePart are combined,
            // so the tag portion is capped to leave safe headroom.
            const safeTag = (event.tag?.toUpperCase() || 'EV').substring(0, 20);
            const orderRef = `EF-${safeTag}-${uniquePart}`;

            // === RESOLVE REFERRAL CODE (if a ?ref= link was used) ===
            let referredByCollaboratorId: string | null = null;
            if (referralCode) {
                const { data: collab } = await supabase
                    .from("event_collaborators")
                    .select("id, status")
                    .eq("event_id", event.id)
                    .eq("referral_code", referralCode)
                    .maybeSingle();
                if (collab?.status === "active") referredByCollaboratorId = collab.id;
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
                // Always starts "pending" — fulfillOrder() is what flips it to "completed"
                // once attendees are actually created and emails sent. Marking it completed
                // here would make fulfillOrder's idempotency guard skip fulfillment entirely.
                status: "pending",
                updated_at: new Date().toISOString(),
                referred_by_collaborator_id: referredByCollaboratorId
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
                        validGuests: validGuests,
                        referrerCollaboratorId: referredByCollaboratorId
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
                    totalAmount: 0,
                    referredByCollaboratorId
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
            <div className={cn(`${inter.className} ${sora.variable}`, "flex min-h-screen flex-col items-center justify-center bg-white p-6 text-center text-[#131517]")}>
                <div className="mb-6 grid h-14 w-14 place-items-center rounded-full bg-red-50 text-red-600">
                    <AlertCircle className="h-7 w-7" />
                </div>
                <h1 className={cn(display, "mb-2 text-2xl font-bold")}>{error || "Event not found"}</h1>
                <p className="mb-8 max-w-sm text-[15px] text-[#6b6f76]">We couldn&apos;t find the event you&apos;re looking for. Please check the link and try again.</p>
                <Link href="/" className="rounded-lg bg-[#131517] px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90">
                    Go home
                </Link>
            </div>
        );
    }

    // --- Presentation helpers ---
    const theme = resolveTheme(event.tag ?? tag);
    const isPaid = !currentTicket?.is_free && (currentTicket?.price ?? 0) > 0;
    const isSoldOut = (p: Pass) => (p.quantity_available || 0) - (p.quantity_sold || 0) <= 0;
    const priceLabel = (p: Pass) => (p.is_free ? "Free" : `₦${(p.price ?? 0).toLocaleString()}`);
    const canRegister = !!currentTicket && !isSoldOut(currentTicket);

    const startDate = event.start_date ? new Date(event.start_date) : null;
    const endDate = event.end_date ? new Date(event.end_date) : null;
    const isMultiDay = !!(startDate && endDate && startDate.toDateString() !== endDate.toDateString());
    const showYear = !!startDate && startDate.getFullYear() !== new Date().getFullYear();
    const fmt = (d: Date, o: Intl.DateTimeFormatOptions) => d.toLocaleDateString("en-US", o);

    const dateTitle = !startDate
        ? "Date to be announced"
        : isMultiDay && endDate
            ? `${fmt(startDate, { weekday: "short", month: "short", day: "numeric" })} – ${fmt(endDate, { weekday: "short", month: "short", day: "numeric", ...(showYear ? { year: "numeric" } : {}) })}`
            : fmt(startDate, { weekday: "long", month: "long", day: "numeric", ...(showYear ? { year: "numeric" } : {}) });
    const timeLine = event.start_time
        ? `${formatClock(event.start_time)}${event.end_time ? ` – ${formatClock(event.end_time)}` : ""}`
        : "Time to be announced";

    const isVirtual = event.event_format === "virtual";
    const isHybrid = event.event_format === "hybrid";
    const locationTitle = isVirtual ? (event.virtual_platform || "Online event") : (event.location || "Location to be announced");
    const mapsUrl = !isVirtual && event.location
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`
        : null;

    // Shared class strings
    const muted = "text-[color:var(--pg-muted)]";
    const hairline = "border-[color:var(--pg-border)]";
    const tile = cn("grid h-11 w-11 shrink-0 place-items-center rounded-lg border bg-[color:var(--pg-surface)]", hairline);
    const inputCls = cn(
        "w-full rounded-lg border bg-[color:var(--pg-input)] px-3.5 text-[15px] text-[color:var(--pg-text)] outline-none transition",
        "placeholder:text-[color:var(--pg-muted)] focus:border-[color:var(--pg-accent)] focus:ring-4 focus:ring-[color:var(--pg-ring)]",
        hairline
    );
    const choiceCls = (selected: boolean, disabled = false) => cn(
        "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-[15px] transition",
        selected ? "border-[color:var(--pg-accent)] bg-[color:var(--pg-selected)]" : cn(hairline, "hover:bg-[color:var(--pg-surface)]"),
        disabled && "cursor-not-allowed opacity-50 hover:bg-transparent"
    );
    const primaryBtn = "flex w-full items-center justify-center gap-2 rounded-xl bg-[color:var(--pg-btn)] font-medium text-[color:var(--pg-btn-fg)] transition hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40";

    const TicketSelector = ({ passes: passesProp = [] }: { passes?: Pass[] }) => {
        const displayPasses = passesProp && passesProp.length > 0 ? passesProp : (passes || []);
        const currentTrigger = triggerQuestions[currentTriggerIndex];

        if (!allTriggersAnswered && currentTrigger) {
            return (
                <div className="space-y-3">
                    <div className={cn("flex items-center justify-between text-sm", muted)}>
                        <span>Question {currentTriggerIndex + 1} of {triggerQuestions.length}</span>
                        {currentTriggerIndex > 0 && (
                            <button type="button" onClick={() => setCurrentTriggerIndex(prev => prev - 1)} className="font-medium transition hover:text-[color:var(--pg-text)]">
                                Back
                            </button>
                        )}
                    </div>
                    <h3 className="text-base font-medium">{currentTrigger.title}</h3>
                    <div className="space-y-2">
                        {currentTrigger.options?.map(opt => {
                            const isSelected = triggerAnswers[currentTrigger.id] === opt.id;
                            return (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => {
                                        // Guest answers are kept in sync via the totalGuests
                                        // effect (keyed on triggerAnswerTexts) — covers every
                                        // guest, not just guest 0.
                                        setTriggerAnswers({ ...triggerAnswers, [currentTrigger.id]: opt.id });

                                        // Auto-advance to next trigger or show tickets
                                        if (currentTriggerIndex < triggerQuestions.length - 1) {
                                            setCurrentTriggerIndex(prev => prev + 1);
                                        }
                                    }}
                                    className={choiceCls(isSelected)}
                                >
                                    <Radio selected={isSelected} />
                                    <span className="flex-1">{opt.option_text}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            );
        }

        return (
            <div className="space-y-3">
                {triggerQuestions.length > 0 && (
                    <button
                        type="button"
                        onClick={() => {
                            setTriggerAnswers({});
                            setCurrentTriggerIndex(0);
                        }}
                        className={cn("flex items-center gap-1.5 text-sm font-medium transition hover:text-[color:var(--pg-text)]", muted)}
                    >
                        <ArrowLeft className="h-3.5 w-3.5" /> Change my answers
                    </button>
                )}
                <div className="space-y-2">
                    {displayPasses.map(ticket => {
                        const isSelected = selectedTicket === ticket.id;
                        const soldOut = isSoldOut(ticket);
                        return (
                            <button
                                key={ticket.id}
                                type="button"
                                disabled={soldOut}
                                onClick={() => {
                                    setSelectedTicket(ticket.id);
                                    if (ticket.type === "group") setQuantity(1);
                                }}
                                className={choiceCls(isSelected && !soldOut, soldOut)}
                            >
                                <Radio selected={isSelected && !soldOut} />
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium">{ticket.title}</span>
                                        {ticket.type === "group" && (
                                            <span className="rounded-md bg-[color:var(--pg-selected)] px-1.5 py-0.5 text-[11px] font-medium">Group</span>
                                        )}
                                    </div>
                                    {ticket.description && <div className={cn("text-sm", muted)}>{ticket.description}</div>}
                                </div>
                                <div className="font-medium">{soldOut ? "Sold out" : priceLabel(ticket)}</div>
                            </button>
                        );
                    })}
                </div>
                {displayPasses.length === 0 && (
                    <p className={cn("py-4 text-center text-sm", muted)}>No tickets available for these choices.</p>
                )}
            </div>
        );
    };

    const hostBlock = theme.hostName ? (
        <div>
            <div className={cn("border-b pb-2 text-sm font-medium", hairline, muted)}>Hosted By</div>
            <div className="flex items-center gap-2.5 pt-3">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-[color:var(--pg-accent)] text-[11px] font-bold text-[color:var(--pg-btn-fg)]">
                    {theme.hostName.charAt(0)}
                </span>
                <span className="text-[15px] font-medium">{theme.hostName}</span>
            </div>
        </div>
    ) : null;

    return (
        <div
            className={cn(`${inter.className} ${sora.variable}`, "relative min-h-screen overflow-x-hidden pb-28 selection:bg-[color:var(--pg-accent)] selection:text-[color:var(--pg-btn-fg)] md:pb-20")}
            style={{ ...themeStyle(theme), background: "var(--pg-bg)", color: "var(--pg-text)" }}
        >
            {/* Ambient background: the cover image, heavily blurred, plus the theme's glow */}
            <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
                {event.image && (
                    <img
                        src={event.image}
                        alt=""
                        className="absolute inset-0 h-full w-full scale-150 object-cover blur-[90px] saturate-150"
                        style={{ opacity: theme.ambientOpacity }}
                    />
                )}
                {theme.glow && (
                    <>
                        <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full opacity-40 blur-[130px]" style={{ background: theme.glow[0] }} />
                        <div className="absolute -right-40 top-1/3 h-[460px] w-[460px] rounded-full opacity-25 blur-[130px]" style={{ background: theme.glow[1] }} />
                    </>
                )}
                <div className="absolute inset-0" style={{ background: theme.veil }} />
            </div>

            {/* Processing overlay (shown while redirecting to receipt / payment) */}
            <AnimatePresence>
                {submitting && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[120] flex flex-col items-center justify-center gap-4 bg-[color:var(--pg-bg)]/90 p-6 text-center backdrop-blur-md"
                    >
                        <Loader2 className="h-8 w-8 animate-spin text-[color:var(--pg-accent)]" />
                        <div>
                            <h2 className={cn(display, "text-lg font-semibold")}>Processing your registration</h2>
                            <p className={cn("mt-1 text-sm", muted)}>
                                {isPaid ? "Preparing secure payment…" : "Finalizing your spot…"}
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="relative z-10">
                {/* Top bar */}
                <header className="mx-auto flex h-14 max-w-[880px] items-center justify-between px-4">
                    <span className="text-[15px] font-bold tracking-tight">EventFlow</span>
                    <button
                        type="button"
                        onClick={handleShare}
                        aria-label="Share event"
                        className={cn("flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium transition hover:bg-[color:var(--pg-surface)] hover:text-[color:var(--pg-text)]", muted)}
                    >
                        {linkCopied ? <><Check className="h-4 w-4" /> Link copied</> : <Share2 className="h-4 w-4" />}
                    </button>
                </header>

                <main className="mx-auto grid max-w-[880px] gap-x-8 gap-y-6 px-4 pt-2 md:grid-cols-[340px_minmax(0,1fr)] md:pt-6">
                    {/* LEFT: cover + host */}
                    <aside className="space-y-6">
                        <div className={cn("relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-2xl border bg-[color:var(--pg-surface)] shadow-2xl shadow-black/15 md:mx-0 md:max-w-none", hairline)}>
                            {event.image ? (
                                <img
                                    src={event.image}
                                    alt={`${event.event_title} cover`}
                                    className="h-full w-full object-cover"
                                    style={{ objectPosition: `50% ${event.image_focus_y ?? 50}%` }}
                                />
                            ) : (
                                <div className={cn("grid h-full w-full place-items-center", muted)}>
                                    <Ticket className="h-12 w-12 opacity-40" />
                                </div>
                            )}
                        </div>
                        <div className="hidden md:block">{hostBlock}</div>
                    </aside>

                    {/* RIGHT: details, registration, about */}
                    <div className="min-w-0">
                        <h1 className={cn(display, "text-[28px] font-bold leading-[1.15] tracking-tight sm:text-[32px] md:text-[40px]")}>{event.event_title}</h1>

                        <div className="mt-6 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className={cn(tile, "content-center")}>
                                    <span className={cn("text-[10px] font-medium uppercase leading-none", muted)}>
                                        {startDate ? fmt(startDate, { month: "short" }) : "TBA"}
                                    </span>
                                    <span className="text-[17px] font-medium leading-tight">{startDate ? startDate.getDate() : "–"}</span>
                                </div>
                                <div>
                                    <div className="text-base font-medium leading-snug">{dateTitle}</div>
                                    <div className={cn("text-sm", muted)}>{timeLine}</div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className={tile}>
                                    {isVirtual ? <Globe className="h-5 w-5" /> : <MapPin className="h-5 w-5" />}
                                </div>
                                <div className="min-w-0">
                                    {mapsUrl ? (
                                        <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-base font-medium leading-snug hover:underline">
                                            {locationTitle}
                                            <ArrowUpRight className={cn("h-4 w-4 shrink-0", muted)} />
                                        </a>
                                    ) : (
                                        <div className="text-base font-medium leading-snug">{locationTitle}</div>
                                    )}
                                    {isHybrid && <div className={cn("text-sm", muted)}>Also available online</div>}
                                </div>
                            </div>
                        </div>

                        {/* Registration card */}
                        <section id="tickets-section" className={cn("mt-6 scroll-mt-6 overflow-hidden rounded-2xl border bg-[color:var(--pg-surface)] backdrop-blur-md", hairline)}>
                            <div className={cn("flex items-center gap-2 border-b px-4 py-2.5 text-sm font-medium", hairline, muted)}>
                                <Ticket className="h-4 w-4" /> Registration
                            </div>
                            <div className="space-y-4 p-4">
                                {passes.length > 0 ? (
                                    <>
                                        <p className={cn("text-[15px] leading-relaxed", muted)}>{theme.welcomeText}</p>
                                        <TicketSelector passes={filteredPasses} />
                                        {allTriggersAnswered && (
                                            <button type="button" onClick={() => setStep(2)} disabled={!canRegister} className={cn(primaryBtn, "h-11 text-[15px]")}>
                                                {canRegister ? theme.ctaLabel : "Sold out"}
                                            </button>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <div>
                                            <h3 className="text-base font-medium">Registration opens soon</h3>
                                            <p className={cn("mt-1 text-[15px] leading-relaxed", muted)}>
                                                Ticket sales haven&apos;t started yet. Check back soon.
                                            </p>
                                        </div>
                                        <button type="button" disabled className={cn(primaryBtn, "h-11 text-[15px]")}>
                                            Tickets coming soon
                                        </button>
                                    </>
                                )}
                            </div>
                        </section>

                        <div className="mt-6 md:hidden">{hostBlock}</div>

                        {/* About */}
                        <section className="mt-8">
                            <h2 className={cn("border-b pb-2 text-sm font-medium", hairline, muted)}>About Event</h2>
                            <div
                                className="mt-4 text-base leading-relaxed [&_a]:underline [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-bold [&_h3]:mb-2 [&_h3]:text-lg [&_h3]:font-bold [&_li]:mb-1 [&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-4 [&_strong]:font-bold [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-5"
                                dangerouslySetInnerHTML={{ __html: event.description || "<p>Join us for this exclusive event.</p>" }}
                            />
                        </section>
                    </div>
                </main>
            </div>

            {/* Mobile sticky action bar */}
            <div className={cn("fixed inset-x-0 bottom-0 z-40 border-t bg-[color:var(--pg-modal)]/95 px-4 py-3 backdrop-blur-md md:hidden", hairline)}>
                {passes.length > 0 ? (
                    <div className="mx-auto flex max-w-md items-center gap-4">
                        <div className="leading-tight">
                            <div className={cn("text-xs", muted)}>{currentTicket?.title ?? "Ticket"}</div>
                            <div className="text-lg font-bold">{currentTicket ? priceLabel(currentTicket) : "–"}</div>
                        </div>
                        <button
                            type="button"
                            onClick={() => (allTriggersAnswered ? setStep(2) : document.getElementById("tickets-section")?.scrollIntoView({ behavior: "smooth" }))}
                            disabled={allTriggersAnswered && !canRegister}
                            className={cn(primaryBtn, "h-11 flex-1 text-[15px]")}
                        >
                            {allTriggersAnswered ? (canRegister ? theme.ctaLabel : "Sold out") : "Choose a ticket"}
                        </button>
                    </div>
                ) : (
                    <button type="button" disabled className={cn(primaryBtn, "mx-auto h-11 max-w-md text-[15px]")}>
                        Tickets coming soon
                    </button>
                )}
            </div>

            {/* Registration dialog */}
            <AnimatePresence>
                {step === 2 && (
                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        aria-label={`Register for ${event.event_title}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setStep(1)}
                        className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-6"
                    >
                        <motion.div
                            initial={{ y: 24, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 24, opacity: 0 }}
                            transition={{ duration: 0.18 }}
                            onClick={(e) => e.stopPropagation()}
                            className={cn("flex max-h-[92vh] w-full max-w-[480px] flex-col overflow-hidden rounded-t-3xl border bg-[color:var(--pg-modal)] shadow-2xl sm:rounded-2xl", hairline)}
                        >
                            <div className={cn("flex items-start justify-between gap-4 border-b px-5 py-4", hairline)}>
                                <div className="min-w-0">
                                    <h2 className={cn(display, "truncate text-lg font-bold leading-tight")}>{event.event_title}</h2>
                                    <p className={cn("mt-0.5 text-sm", muted)}>
                                        {currentTicket ? `${currentTicket.title} · ${priceLabel(currentTicket)}` : "Registration"}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setStep(1)}
                                    aria-label="Close"
                                    className={cn("-mr-1.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg transition hover:bg-[color:var(--pg-surface)] hover:text-[color:var(--pg-text)]", muted)}
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="space-y-8 overflow-y-auto px-5 py-5">
                                {guests.map((guest, index) => {
                                    const isPrimary = index === 0;

                                    return (
                                        <div key={index} className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-[15px] font-bold">{isPrimary ? "Your details" : `Guest ${index + 1}`}</h3>

                                                {!isPrimary && (
                                                    <div className={cn("flex rounded-lg border p-0.5 text-sm", hairline)}>
                                                        {([["Fill info", false], ["Invite", true]] as const).map(([label, invite]) => (
                                                            <button
                                                                key={label}
                                                                type="button"
                                                                onClick={() => {
                                                                    const ng = [...guests];
                                                                    ng[index].isInvite = invite;
                                                                    setGuests(ng);
                                                                }}
                                                                className={cn(
                                                                    "rounded-md px-3 py-1 font-medium transition",
                                                                    guest.isInvite === invite ? "bg-[color:var(--pg-selected)] text-[color:var(--pg-text)]" : muted
                                                                )}
                                                            >
                                                                {label}
                                                            </button>
                                                        ))}
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
                                                        className="space-y-4 overflow-hidden px-0.5 py-0.5"
                                                    >
                                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                                            <div>
                                                                <label htmlFor={`g${index}-first`} className="mb-1.5 block text-sm font-medium">First name</label>
                                                                <input
                                                                    id={`g${index}-first`}
                                                                    value={guest.firstName}
                                                                    onChange={(e) => {
                                                                        const newGuests = [...guests];
                                                                        newGuests[index].firstName = e.target.value;
                                                                        setGuests(newGuests);
                                                                    }}
                                                                    placeholder="Jane"
                                                                    className={cn(inputCls, "h-11")}
                                                                />
                                                            </div>
                                                            <div>
                                                                <label htmlFor={`g${index}-last`} className="mb-1.5 block text-sm font-medium">Last name</label>
                                                                <input
                                                                    id={`g${index}-last`}
                                                                    value={guest.lastName}
                                                                    onChange={(e) => {
                                                                        const newGuests = [...guests];
                                                                        newGuests[index].lastName = e.target.value;
                                                                        setGuests(newGuests);
                                                                    }}
                                                                    placeholder="Smith"
                                                                    className={cn(inputCls, "h-11")}
                                                                />
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <label htmlFor={`g${index}-email`} className="mb-1.5 block text-sm font-medium">Email</label>
                                                            <input
                                                                id={`g${index}-email`}
                                                                type="email"
                                                                value={guest.email}
                                                                onChange={(e) => {
                                                                    const newGuests = [...guests];
                                                                    newGuests[index].email = e.target.value;
                                                                    setGuests(newGuests);
                                                                }}
                                                                placeholder="jane@example.com"
                                                                className={cn(inputCls, "h-11")}
                                                            />
                                                        </div>

                                                        {/* Custom Dynamic Questions */}
                                                        {visibleFormQuestions.map((q) => {
                                                            const setAnswer = (value: string | string[] | number) => {
                                                                const newGuests = [...guests];
                                                                newGuests[index].answers = { ...newGuests[index].answers, [q.id]: value };
                                                                setGuests(newGuests);
                                                            };
                                                            const toggleCheckbox = (optionText: string) => {
                                                                const current = (guest.answers[q.id] as string[]) || [];
                                                                setAnswer(current.includes(optionText) ? current.filter(v => v !== optionText) : [...current, optionText]);
                                                            };
                                                            const scaleMin = q.scale_config?.min ?? 1;
                                                            const scaleMax = q.scale_config?.max ?? 5;
                                                            const scaleValues = Array.from({ length: Math.max(1, scaleMax - scaleMin + 1) }, (_, i) => scaleMin + i);

                                                            return (
                                                                <div key={q.id}>
                                                                    <label className="mb-1.5 block text-sm font-medium">
                                                                        {q.title}{q.is_required && <span className="ml-0.5 text-red-500">*</span>}
                                                                    </label>

                                                                    {q.question_type === "select" && (
                                                                        <div className="space-y-2">
                                                                            {q.options?.map(opt => {
                                                                                const selected = guest.answers[q.id] === opt.option_text;
                                                                                return (
                                                                                    <button key={opt.id} type="button" onClick={() => setAnswer(opt.option_text)} className={choiceCls(selected)}>
                                                                                        <Radio selected={selected} />
                                                                                        {opt.option_text}
                                                                                    </button>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    )}

                                                                    {q.question_type === "dropdown" && (
                                                                        <div className="relative">
                                                                            <select
                                                                                value={(guest.answers[q.id] as string) || ""}
                                                                                onChange={(e) => setAnswer(e.target.value)}
                                                                                className={cn(inputCls, "h-11 cursor-pointer appearance-none pr-10")}
                                                                            >
                                                                                <option value="" disabled>Select an option</option>
                                                                                {q.options?.map(opt => (
                                                                                    <option key={opt.id} value={opt.option_text}>{opt.option_text}</option>
                                                                                ))}
                                                                            </select>
                                                                            <ChevronDown className={cn("pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2", muted)} />
                                                                        </div>
                                                                    )}

                                                                    {q.question_type === "checkbox" && (
                                                                        <div className="space-y-2">
                                                                            {q.options?.map(opt => {
                                                                                const checked = ((guest.answers[q.id] as string[]) || []).includes(opt.option_text);
                                                                                return (
                                                                                    <button key={opt.id} type="button" onClick={() => toggleCheckbox(opt.option_text)} className={choiceCls(checked)}>
                                                                                        <span className={cn(
                                                                                            "grid h-4 w-4 shrink-0 place-items-center rounded border",
                                                                                            checked ? "border-[color:var(--pg-accent)] bg-[color:var(--pg-accent)] text-[color:var(--pg-btn-fg)]" : hairline
                                                                                        )}>
                                                                                            {checked && <CheckCircle2 className="h-3 w-3" />}
                                                                                        </span>
                                                                                        {opt.option_text}
                                                                                    </button>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    )}

                                                                    {q.question_type === "long_text" && (
                                                                        <textarea
                                                                            rows={4}
                                                                            value={(guest.answers[q.id] as string) || ""}
                                                                            onChange={(e) => setAnswer(e.target.value)}
                                                                            placeholder="Your answer"
                                                                            className={cn(inputCls, "resize-none py-3")}
                                                                        />
                                                                    )}

                                                                    {q.question_type === "linear_scale" && (
                                                                        <div className="flex items-center gap-2">
                                                                            {scaleValues.map(n => (
                                                                                <button
                                                                                    key={n}
                                                                                    type="button"
                                                                                    onClick={() => setAnswer(n)}
                                                                                    className={cn(choiceCls(guest.answers[q.id] === n), "flex-1 justify-center px-0 py-2.5 font-medium")}
                                                                                >
                                                                                    {n}
                                                                                </button>
                                                                            ))}
                                                                        </div>
                                                                    )}

                                                                    {q.question_type === "star_rating" && (
                                                                        <div className="flex items-center gap-1">
                                                                            {scaleValues.map(n => {
                                                                                const val = (guest.answers[q.id] as number) || 0;
                                                                                return (
                                                                                    <button key={n} type="button" onClick={() => setAnswer(n)} aria-label={`${n} stars`} className="p-1">
                                                                                        <Star className={cn("h-6 w-6 transition", n <= val ? "fill-[color:var(--pg-accent)] text-[color:var(--pg-accent)]" : muted)} />
                                                                                    </button>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    )}

                                                                    {(q.question_type === "text" || !q.question_type) && (
                                                                        <input
                                                                            value={(guest.answers[q.id] as string) || ""}
                                                                            onChange={(e) => setAnswer(e.target.value)}
                                                                            placeholder="Your answer"
                                                                            className={cn(inputCls, "h-11")}
                                                                        />
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </motion.div>
                                                ) : (
                                                    <motion.div
                                                        key="invite"
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        exit={{ opacity: 0 }}
                                                        className="space-y-2 px-0.5 py-0.5"
                                                    >
                                                        <label htmlFor={`g${index}-invite`} className="mb-1.5 block text-sm font-medium">Guest&apos;s email</label>
                                                        <input
                                                            id={`g${index}-invite`}
                                                            type="email"
                                                            value={guest.email}
                                                            onChange={(e) => {
                                                                const newGuests = [...guests];
                                                                newGuests[index].email = e.target.value;
                                                                setGuests(newGuests);
                                                            }}
                                                            placeholder="guest@example.com"
                                                            className={cn(inputCls, "h-11")}
                                                        />
                                                        <p className={cn("text-sm", muted)}>
                                                            We&apos;ll email them a link to complete their own registration.
                                                        </p>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>

                                            {index < guests.length - 1 && <div className={cn("h-px w-full border-t", hairline)} />}
                                        </div>
                                    );
                                })}
                            </div>

                            <div className={cn("space-y-3 border-t px-5 py-4", hairline)}>
                                {formError && (
                                    <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-3">
                                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                                        <div className="text-sm">
                                            <p className="font-medium text-red-500">{formError}</p>
                                            <button type="button" onClick={() => setFormError(null)} className={cn("mt-0.5 underline", muted)}>
                                                Dismiss
                                            </button>
                                        </div>
                                    </div>
                                )}
                                <button type="button" onClick={handleRegister} disabled={submitting} className={cn(primaryBtn, "h-12 text-base")}>
                                    {submitting ? (
                                        <><Loader2 className="h-5 w-5 animate-spin" /> Processing…</>
                                    ) : isPaid ? (
                                        "Continue to payment"
                                    ) : (
                                        "Complete registration"
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

/** "10:00" / "10:00:00" -> "10:00 AM". Falls back to the raw string if it isn't HH:mm. */
function formatClock(t?: string | null) {
    if (!t) return "";
    const m = /^(\d{1,2}):(\d{2})/.exec(t);
    if (!m) return t;
    const h = Number(m[1]);
    return `${h % 12 || 12}:${m[2]} ${h >= 12 ? "PM" : "AM"}`;
}

function Radio({ selected }: { selected: boolean }) {
    return (
        <span className={cn(
            "grid h-4 w-4 shrink-0 place-items-center rounded-full border",
            selected ? "border-[color:var(--pg-accent)] bg-[color:var(--pg-accent)]" : "border-[color:var(--pg-border)]"
        )}>
            {selected && <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--pg-btn-fg)]" />}
        </span>
    );
}

function PublicPageSkeleton() {
    const bar = "animate-pulse rounded-lg bg-black/[0.06]";
    return (
        <div className={cn(`${inter.className} ${sora.variable}`, "min-h-screen bg-white")}>
            <div className="mx-auto flex h-14 max-w-[880px] items-center px-4">
                <div className={cn(bar, "h-5 w-24")} />
            </div>
            <div className="mx-auto grid max-w-[880px] gap-x-8 gap-y-6 px-4 pt-2 md:grid-cols-[340px_minmax(0,1fr)] md:pt-6">
                <div className={cn(bar, "mx-auto aspect-square w-full max-w-sm !rounded-2xl md:mx-0 md:max-w-none")} />
                <div className="space-y-6">
                    <div className="space-y-3">
                        <div className={cn(bar, "h-10 w-4/5")} />
                        <div className={cn(bar, "h-10 w-1/2")} />
                    </div>
                    <div className="space-y-4">
                        {[0, 1].map(i => (
                            <div key={i} className="flex items-center gap-3">
                                <div className={cn(bar, "h-11 w-11")} />
                                <div className="space-y-2">
                                    <div className={cn(bar, "h-4 w-44")} />
                                    <div className={cn(bar, "h-3 w-28")} />
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className={cn(bar, "h-44 w-full !rounded-2xl")} />
                    <div className="space-y-3">
                        <div className={cn(bar, "h-4 w-full")} />
                        <div className={cn(bar, "h-4 w-full")} />
                        <div className={cn(bar, "h-4 w-2/3")} />
                    </div>
                </div>
            </div>
        </div>
    );
}
