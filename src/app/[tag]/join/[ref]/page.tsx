"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertCircle, Check, Loader2, MapPin, Ticket } from "lucide-react";
import { cn } from "@/lib/utils";
import { isQuestionRelevant, missingRequiredQuestion, type RuleQuestion } from "@/lib/answers";
import { buildQrCodeUrl } from "@/lib/qr";
import type { Question } from "@/app/events/[tag]/types";
import { resolveTheme, themeStyle } from "../../theme";
import { inter, sora, display } from "../../fonts";
import { QuestionField, type AnswerValue } from "../../QuestionField";
import { completeInviteAction, getInviteAction } from "../../actions";
import { hairline, inputCls, muted, primaryBtn } from "../../ui";

interface InviteAttendee {
    id: string;
    event_id: string;
    email: string;
    first_name: string;
    last_name: string;
    ref: string;
    email_status: string;
    pass_id: string | null;
}
interface InviteEvent {
    id: string;
    event_title: string;
    tag: string;
    start_date: string | null;
    start_time: string | null;
    location: string | null;
    image: string | null;
    image_focus_y?: number;
}

/**
 * Where an invited person finishes their own registration (the link in the invite
 * email). Same look, fonts and form fields as the event page, so they answer the
 * same questions the buyer did, then get their own ticket and check-in pass.
 */
export default function JoinInvitePage() {
    const params = useParams();
    const tag = typeof params === "object" && params?.tag ? String(params.tag) : null;
    const ref = typeof params === "object" && params?.ref ? String(params.ref) : null;
    const theme = resolveTheme(tag);

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formError, setFormError] = useState<string | null>(null);
    const [done, setDone] = useState<{ emailSent: boolean } | null>(null);

    const [attendee, setAttendee] = useState<InviteAttendee | null>(null);
    const [event, setEvent] = useState<InviteEvent | null>(null);
    const [passTitle, setPassTitle] = useState<string | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);

    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});

    useEffect(() => {
        if (!tag || !ref) return;
        (async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await getInviteAction(ref);
                if (!res.ok) throw new Error("Invite not found or expired");
                const v = res.view;
                const att = v.attendee as unknown as InviteAttendee;
                setAttendee(att);
                setEvent(v.event as unknown as InviteEvent | null);

                if (att.email_status === "registered" || att.email_status === "confirmed") {
                    setDone({ emailSent: true }); // already finished earlier: just show their pass
                    return;
                }

                setPassTitle(v.passTitle);
                setQuestions(v.questions as Question[]);
            } catch (err: unknown) {
                setError(err instanceof Error ? err.message : "Failed to load invite");
            } finally {
                setLoading(false);
            }
        })();
    }, [tag, ref]);

    // Same rule as the event page: questions that don't apply to this person's track stay hidden.
    const ruleQuestions = questions as unknown as RuleQuestion[];
    const visibleQuestions = useMemo(
        () => questions.filter((q) => !q.is_selection_logic && isQuestionRelevant(ruleQuestions, q as unknown as RuleQuestion, answers)),
        [questions, ruleQuestions, answers]
    );

    const submit = async () => {
        if (!attendee) return;
        setFormError(null);
        if (!firstName.trim()) return setFormError("First name is required");
        const missing = missingRequiredQuestion(ruleQuestions, answers);
        if (missing) return setFormError(`Please answer: "${missing.title}"`);

        setSubmitting(true);
        const res = await completeInviteAction({ ref: attendee.ref, firstName, lastName, answers });
        setSubmitting(false);
        if (!res.ok) return setFormError(res.error);
        setDone({ emailSent: res.alreadyDone ? true : res.emailSent !== false });
    };

    const fmtDate = (d: string | null) =>
        d ? new Date(d).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }) : "Date to be announced";
    const fmtTime = (t: string | null) => {
        const m = t ? /^(\d{1,2}):(\d{2})/.exec(t) : null;
        return m ? `${Number(m[1]) % 12 || 12}:${m[2]} ${Number(m[1]) >= 12 ? "PM" : "AM"}` : "";
    };

    const rootClass = cn(inter.className, sora.variable, "min-h-screen");
    const rootStyle = { ...themeStyle(theme), background: "var(--pg-bg)", color: "var(--pg-text)" } as React.CSSProperties;

    if (loading) {
        return (
            <div className={rootClass} style={rootStyle}>
                <div className="grid min-h-screen place-items-center">
                    <Loader2 className={cn("h-7 w-7 animate-spin", muted)} />
                </div>
            </div>
        );
    }

    if (error || !attendee || !event) {
        return (
            <div className={rootClass} style={rootStyle}>
                <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
                    <AlertCircle className="mb-4 h-10 w-10 text-red-500" />
                    <h1 className={cn(display, "mb-2 text-2xl font-bold")}>Invite not found</h1>
                    <p className={cn("mb-8 text-[15px]", muted)}>{error || "This invite link isn't valid any more."}</p>
                    <Link href={tag ? `/${tag}` : "/"} className={cn(primaryBtn, "h-11 px-6 text-[15px] w-auto")}>
                        Go to the event
                    </Link>
                </div>
            </div>
        );
    }

    const header = (
        <div className="flex items-center gap-4">
            {event.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={event.image}
                    alt=""
                    className={cn("h-20 w-20 shrink-0 rounded-xl border object-cover", hairline)}
                    style={{ objectPosition: `50% ${event.image_focus_y ?? 50}%` }}
                />
            )}
            <div className="min-w-0">
                <div className={cn("text-sm", muted)}>{done ? "You're registered for" : "You're invited to"}</div>
                <h1 className={cn(display, "text-2xl font-bold leading-tight tracking-tight sm:text-[28px]")}>{event.event_title}</h1>
                <div className={cn("mt-1 text-sm", muted)}>
                    {fmtDate(event.start_date)}
                    {event.start_time ? ` · ${fmtTime(event.start_time)}` : ""}
                </div>
                {event.location && (
                    <div className={cn("mt-0.5 flex items-center gap-1 text-sm", muted)}>
                        <MapPin className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{event.location}</span>
                    </div>
                )}
            </div>
        </div>
    );

    if (done) {
        return (
            <div className={rootClass} style={rootStyle}>
                <main className="mx-auto max-w-xl px-4 py-10">
                    {header}
                    <div className={cn("mt-8 rounded-2xl border bg-[color:var(--pg-surface)] p-6 text-center", hairline)}>
                        <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-full bg-[color:var(--pg-accent)] text-[color:var(--pg-btn-fg)]">
                            <Check className="h-6 w-6" />
                        </div>
                        <h2 className={cn(display, "text-xl font-bold")}>You&apos;re in!</h2>
                        <p className={cn("mt-1 text-[15px]", muted)}>
                            {done.emailSent
                                ? `We've emailed your ticket and check-in pass to ${attendee.email}. Check your spam folder if you don't see it.`
                                : "Your registration is complete, but we couldn't email your ticket just now. Your check-in pass is below. Screenshot it."}
                        </p>

                        <div className="mt-6 inline-block rounded-2xl bg-white p-3">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={buildQrCodeUrl(attendee.ref, 220)} alt="Your check-in QR code" width={180} height={180} className="block h-[180px] w-[180px]" />
                        </div>
                        <div className="mt-3 font-mono text-sm tracking-wide">{attendee.ref}</div>
                        <p className={cn("mt-1 text-xs", muted)}>Show this at the entrance. It&apos;s personal to you.</p>
                    </div>
                    <div className="mt-6 text-center">
                        <Link href={`/${event.tag}`} className={cn("text-sm font-medium underline", muted)}>
                            View event details
                        </Link>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className={rootClass} style={rootStyle}>
            <main className="mx-auto max-w-xl px-4 py-10">
                {header}

                <section className={cn("mt-8 rounded-2xl border bg-[color:var(--pg-surface)]", hairline)}>
                    <div className={cn("flex items-center gap-2 border-b px-4 py-2.5 text-sm font-medium", hairline, muted)}>
                        <Ticket className="h-4 w-4" /> Complete your registration{passTitle ? ` · ${passTitle}` : ""}
                    </div>

                    <div className="space-y-4 p-4">
                        <div>
                            <label htmlFor="invite-email" className="mb-1.5 block text-sm font-medium">Email</label>
                            <input id="invite-email" value={attendee.email} readOnly disabled className={cn(inputCls, "h-11 opacity-70")} />
                        </div>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <label htmlFor="invite-first" className="mb-1.5 block text-sm font-medium">First name</label>
                                <input id="invite-first" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Jane" className={cn(inputCls, "h-11")} />
                            </div>
                            <div>
                                <label htmlFor="invite-last" className="mb-1.5 block text-sm font-medium">Last name</label>
                                <input id="invite-last" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Smith" className={cn(inputCls, "h-11")} />
                            </div>
                        </div>

                        {visibleQuestions.map((q) => (
                            <QuestionField
                                key={q.id}
                                question={q}
                                value={answers[q.id]}
                                onChange={(value) => setAnswers((prev) => ({ ...prev, [q.id]: value }))}
                            />
                        ))}

                        {formError && (
                            <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-3">
                                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                                <p className="text-sm font-medium text-red-500">{formError}</p>
                            </div>
                        )}

                        <button type="button" onClick={submit} disabled={submitting} className={cn(primaryBtn, "h-12 text-base")}>
                            {submitting ? (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin" /> Saving…
                                </>
                            ) : (
                                "Complete registration"
                            )}
                        </button>
                    </div>
                </section>
            </main>
        </div>
    );
}
