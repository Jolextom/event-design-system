"use client";

import React, { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import {
    Search,
    UserCheck,
    Check,
    Loader2,
    AlertCircle,
    KeyRound,
    LogOut,
    Camera,
    Phone,
    Building2,
    GraduationCap,
    X,
    Copy,
    CheckCircle2,
    AlertTriangle,
    Info,
    ChevronDown,
    Sparkles,
    Trophy,
    Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@supabase/supabase-js";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import DelegationRosterModal, { DelegationStudent } from "./components/DelegationRosterModal";

// Dynamic import for camera scanner (no SSR)
const QrCameraScanner = dynamic(() => import("./components/QrCameraScanner"), {
    ssr: false,
    loading: () => (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
        </div>
    ),
});

// Types
interface AttendeeAnswer {
    question_id: string;
    answer_text: string;
    questions?: {
        title: string;
    } | null;
}

interface Attendee {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    ref: string | null;
    check_in: boolean;
    check_in_time: string | null;
    checked_in_by?: string | null;
    email_status?: string;
    pass?: { title: string } | { title: string }[] | null;
    answers?: AttendeeAnswer[];
    phone?: string;
    organization?: string;
    role?: string;
    unipodTour?: string;
    hackathon?: string;
    gender?: string;
    isSchoolDelegation?: boolean;
    schoolName?: string;
    pubPriv?: string;
    declaredTeachersCount?: number;
    declaredTeachersList?: string[];
    declaredStudentsCount?: number;
    studentsList?: DelegationStudent[];
    properties?: Record<string, any>;
}

interface Staff {
    id: string;
    first_name: string;
    last_name: string;
    role: string;
}

interface StoredSession {
    staff: Staff;
    eventId: string;
    eventTitle: string;
}

interface ScanNotification {
    type: "success" | "warning" | "not_found";
    title: string;
    message: string;
    attendee?: Attendee;
}

const STORAGE_KEY = "checkin_session";

// Web Audio synthesizer beep
function playScanSound(type: "success" | "warning" = "success") {
    try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        if (type === "success") {
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12);
            gain.gain.setValueAtTime(0.25, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.18);
        } else {
            osc.frequency.setValueAtTime(420, ctx.currentTime);
            osc.frequency.setValueAtTime(320, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.25);
        }
    } catch {
        // audio might be blocked before first user interaction
    }
}

function extractAttendeeDetails(raw: any): Attendee {
    const answers: AttendeeAnswer[] = raw.answers || [];
    let phone = "";
    let organization = "";
    let role = "";
    let unipodTour = "";
    let hackathon = "";
    let gender = "";
    let schoolName = "";
    let pubPriv = "";
    let rawTeachersText = "";
    let rawStudentsText = "";
    let declaredTeachersCount = 0;
    let declaredStudentsCount = 0;

    const passTitle = (Array.isArray(raw.pass) ? raw.pass[0]?.title : raw.pass?.title) || "";
    let isSchoolDelegation = passTitle.toLowerCase().includes("school");

    for (const ans of answers) {
        const title = (ans.questions?.title || "").toLowerCase();
        const val = ans.answer_text?.trim() || "";
        if (!val) continue;

        if (title.includes("how are you registering") && val.toLowerCase().includes("school")) {
            isSchoolDelegation = true;
        }

        if (title.includes("phone")) {
            phone = val;
        } else if (title.includes("school name")) {
            schoolName = val;
            if (!organization) organization = val;
        } else if (title.includes("organisation")) {
            organization = val;
            if (!schoolName) schoolName = val;
        } else if (title.includes("attending as") || title.includes("job title") || title.includes("role")) {
            role = val;
        } else if (title.includes("unipod")) {
            unipodTour = val;
        } else if (title.includes("hackathon")) {
            hackathon = val;
        } else if (title.includes("gender")) {
            gender = val;
        } else if (title.includes("public or private")) {
            pubPriv = val;
        } else if (title.includes("number of teachers")) {
            declaredTeachersCount = parseInt(val.replace(/[^0-9]/g, ""), 10) || 0;
        } else if (title.includes("full name of each teacher")) {
            rawTeachersText = val;
        } else if (title.includes("number of students")) {
            declaredStudentsCount = parseInt(val.replace(/[^0-9]/g, ""), 10) || 0;
        } else if (title.includes("full name of each student")) {
            rawStudentsText = val;
        }
    }

    const declaredTeachersList = rawTeachersText
        ? rawTeachersText.split("\n").map((s) => s.trim()).filter(Boolean)
        : [];

    if (declaredTeachersList.length > 0 && !declaredTeachersCount) {
        declaredTeachersCount = declaredTeachersList.length;
    }

    // Parse students list
    let studentsList: DelegationStudent[] = [];
    if (
        raw.properties?.schoolDelegation?.students &&
        Array.isArray(raw.properties.schoolDelegation.students)
    ) {
        studentsList = raw.properties.schoolDelegation.students;
    } else if (rawStudentsText) {
        const lines = rawStudentsText
            .split("\n")
            .map((s) => s.trim().replace(/^[0-9]+[.,\s-]+/, "").trim())
            .filter(
                (s) =>
                    s &&
                    s.toLowerCase() !== "nil" &&
                    s.toLowerCase() !== "none" &&
                    s !== "-"
            );

        studentsList = lines.map((name, i) => ({
            id: `student-${i + 1}`,
            name,
            present: false,
        }));
    }

    if (studentsList.length > 0 && !declaredStudentsCount) {
        declaredStudentsCount = studentsList.length;
    }

    return {
        ...raw,
        answers,
        phone,
        organization: organization || schoolName,
        role,
        unipodTour,
        hackathon,
        gender,
        isSchoolDelegation,
        schoolName: schoolName || organization,
        pubPriv,
        declaredTeachersCount: declaredTeachersCount || (isSchoolDelegation ? 1 : 0),
        declaredTeachersList,
        declaredStudentsCount,
        studentsList,
        properties: raw.properties || {},
    };
}

export default function CheckInPage() {
    const params = useParams();
    const tag = params?.tag as string;

    // Staff Auth State
    const [staff, setStaff] = useState<Staff | null>(null);
    const [accessCode, setAccessCode] = useState("");
    const [authLoading, setAuthLoading] = useState(true);
    const [authError, setAuthError] = useState("");

    // Event & Attendees State
    const [event, setEvent] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedPassFilter, setSelectedPassFilter] = useState<string | null>(null);
    const [filterTourOnly, setFilterTourOnly] = useState(false);
    const [attendees, setAttendees] = useState<Attendee[]>([]);
    const [filteredAttendees, setFilteredAttendees] = useState<Attendee[]>([]);
    const [uniquePasses, setUniquePasses] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [checkingIn, setCheckingIn] = useState<string | null>(null);
    const [successId, setSuccessId] = useState<string | null>(null);

    // Delegation Check-In State
    const [activeMode, setActiveMode] = useState<"individuals" | "schools" | "all">("individuals");
    const [selectedDelegationAttendee, setSelectedDelegationAttendee] = useState<Attendee | null>(null);
    const [savingDelegation, setSavingDelegation] = useState(false);

    // Scanner & Details State
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [scanNotification, setScanNotification] = useState<ScanNotification | null>(null);
    const [selectedAttendeeDetails, setSelectedAttendeeDetails] = useState<Attendee | null>(null);
    const [copiedRef, setCopiedRef] = useState<string | null>(null);

    // Check localStorage on mount for persisted session
    useEffect(() => {
        const restoreSession = async () => {
            const stored = localStorage.getItem(`${STORAGE_KEY}_${tag}`);
            if (stored) {
                try {
                    const session: StoredSession = JSON.parse(stored);
                    setStaff(session.staff);
                    setEvent({ id: session.eventId, event_title: session.eventTitle, tag });

                    const supabase = createClient(
                        process.env.NEXT_PUBLIC_SUPABASE_URL!,
                        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
                    );
                    await supabase
                        .from("staff")
                        .update({ status: "online", last_active: new Date().toISOString() })
                        .eq("id", session.staff.id);

                    fetchAttendees(session.eventId);
                } catch {
                    localStorage.removeItem(`${STORAGE_KEY}_${tag}`);
                }
            }
            setAuthLoading(false);
        };
        restoreSession();
    }, [tag]);

    // Login handler
    const handleLogin = async () => {
        if (!accessCode.trim()) {
            setAuthError("Please enter your access code");
            return;
        }
        setAuthLoading(true);
        setAuthError("");

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const { data: eventData } = await supabase
            .from("events")
            .select("id, event_title, tag")
            .eq("tag", tag)
            .single();

        if (!eventData) {
            setAuthError("Event not found");
            setAuthLoading(false);
            return;
        }

        const { data: staffData, error } = await supabase
            .from("staff")
            .select("id, first_name, last_name, role")
            .eq("event_id", eventData.id)
            .eq("access_code", accessCode.trim())
            .single();

        if (error || !staffData) {
            setAuthError("Invalid access code");
            setAuthLoading(false);
            return;
        }

        const session: StoredSession = {
            staff: staffData,
            eventId: eventData.id,
            eventTitle: eventData.event_title,
        };
        localStorage.setItem(`${STORAGE_KEY}_${tag}`, JSON.stringify(session));

        await supabase
            .from("staff")
            .update({ status: "online", last_active: new Date().toISOString() })
            .eq("id", staffData.id);

        setStaff(staffData);
        setEvent(eventData);
        setAuthLoading(false);

        fetchAttendees(eventData.id);
    };

    // Keep-alive: Update last_active every 30 seconds
    useEffect(() => {
        if (!staff) return;

        const updateLastActive = async () => {
            const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            );
            await supabase
                .from("staff")
                .update({ last_active: new Date().toISOString() })
                .eq("id", staff.id);
        };

        const interval = setInterval(updateLastActive, 30000);
        return () => clearInterval(interval);
    }, [staff]);

    // Fetch attendees with rich details
    const fetchAttendees = async (eventId: string) => {
        setLoading(true);
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const { data: attendeesData, error } = await supabase
            .from("attendees")
            .select(
                "id, first_name, last_name, email, ref, check_in, check_in_time, checked_in_by, email_status, properties, pass:passes(title), answers(question_id, answer_text, questions(title))"
            )
            .eq("event_id", eventId)
            .eq("email_status", "registered")
            .order("first_name", { ascending: true });

        if (error) {
            console.error("Error fetching attendees:", error);
        }

        const rawList = attendeesData || [];
        const enrichedList = rawList.map(extractAttendeeDetails);

        const passes = Array.from(
            new Set(
                enrichedList.map((a) => {
                    if (Array.isArray(a.pass)) return a.pass[0]?.title || "General Admission";
                    return a.pass?.title || "General Admission";
                })
            )
        ).sort();

        setUniquePasses(passes);
        setAttendees(enrichedList);
        setFilteredAttendees(enrichedList);
        setLoading(false);
    };

    // Save School Delegation Attendance
    const handleSaveDelegation = async (students: DelegationStudent[], notes: string) => {
        if (!selectedDelegationAttendee) return;
        setSavingDelegation(true);

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const now = new Date().toISOString();
        const staffName = staff ? `${staff.first_name} ${staff.last_name}` : null;
        const presentCount = students.filter((s) => s.present).length;

        const updatedProperties = {
            ...(selectedDelegationAttendee.properties || {}),
            schoolDelegation: {
                checkedIn: true,
                checkedInAt: now,
                checkedInBy: staffName,
                students,
                presentCount,
                totalCount: students.length,
                notes: notes || "",
            },
        };

        const updates = {
            check_in: true,
            check_in_time: selectedDelegationAttendee.check_in_time || now,
            checked_in_by_staff_id: staff?.id || null,
            checked_in_by: selectedDelegationAttendee.checked_in_by || staffName,
            properties: updatedProperties,
        };

        const { error } = await supabase
            .from("attendees")
            .update(updates)
            .eq("id", selectedDelegationAttendee.id);

        if (!error) {
            playScanSound("success");
            setAttendees((prev) =>
                prev.map((a) =>
                    a.id === selectedDelegationAttendee.id
                        ? {
                              ...a,
                              ...updates,
                              studentsList: students,
                          }
                        : a
                )
            );
            setSuccessId(selectedDelegationAttendee.id);
            setScanNotification({
                type: "success",
                title: "Delegation Check-In Confirmed!",
                message: `Checked in ${selectedDelegationAttendee.schoolName || selectedDelegationAttendee.first_name} (${presentCount} of ${students.length} students present).`,
            });
            setTimeout(() => setSuccessId(null), 3000);
            setSelectedDelegationAttendee(null);
        } else {
            console.error("Error saving delegation:", error);
            playScanSound("warning");
            alert("Failed to save delegation attendance: " + error.message);
        }
        setSavingDelegation(false);
    };

    // Search and Filter logic
    useEffect(() => {
        let result = attendees;

        // 0. Active Mode Filter
        if (activeMode === "individuals") {
            result = result.filter((a) => !a.isSchoolDelegation);
        } else if (activeMode === "schools") {
            result = result.filter((a) => a.isSchoolDelegation);
        }

        // 1. Pass Filter
        if (selectedPassFilter) {
            result = result.filter((a) => {
                const title = Array.isArray(a.pass) ? a.pass[0]?.title : a.pass?.title;
                return (title || "General Admission") === selectedPassFilter;
            });
        }

        // 2. UNIPOD Tour Filter
        if (filterTourOnly) {
            result = result.filter((a) => a.unipodTour?.toLowerCase() === "yes");
        }

        // 3. Search Query
        const query = searchQuery.toLowerCase().trim();
        if (query) {
            result = result.filter(
                (a) =>
                    a.first_name.toLowerCase().includes(query) ||
                    a.last_name.toLowerCase().includes(query) ||
                    a.email.toLowerCase().includes(query) ||
                    (a.ref && a.ref.toLowerCase().includes(query)) ||
                    (a.organization && a.organization.toLowerCase().includes(query)) ||
                    (a.schoolName && a.schoolName.toLowerCase().includes(query)) ||
                    (a.phone && a.phone.toLowerCase().includes(query)) ||
                    (a.role && a.role.toLowerCase().includes(query)) ||
                    (a.studentsList && a.studentsList.some((s) => s.name.toLowerCase().includes(query)))
            );
        }

        setFilteredAttendees(result);
    }, [searchQuery, selectedPassFilter, filterTourOnly, activeMode, attendees]);

    // Check In Action
    const handleCheckIn = async (attendeeId: string) => {
        setCheckingIn(attendeeId);
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const now = new Date().toISOString();
        const staffName = staff ? `${staff.first_name} ${staff.last_name}` : null;
        const updates = {
            check_in: true,
            check_in_time: now,
            checked_in_by_staff_id: staff?.id || null,
            checked_in_by: staffName,
        };

        const { error } = await supabase.from("attendees").update(updates).eq("id", attendeeId);

        if (!error) {
            setSuccessId(attendeeId);
            setAttendees((prev) =>
                prev.map((a) => (a.id === attendeeId ? { ...a, ...updates } : a))
            );
            setTimeout(() => setSuccessId(null), 2000);
        }
        setCheckingIn(null);
    };

    // Undo Check In
    const handleUndoCheckIn = async (attendeeId: string) => {
        setCheckingIn(attendeeId);
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const updates = {
            check_in: false,
            check_in_time: null,
            checked_in_by_staff_id: null,
            checked_in_by: null,
        };

        const { error } = await supabase.from("attendees").update(updates).eq("id", attendeeId);

        if (!error) {
            setAttendees((prev) =>
                prev.map((a) => (a.id === attendeeId ? { ...a, ...updates } : a))
            );
            if (scanNotification?.attendee?.id === attendeeId) {
                setScanNotification(null);
            }
        }
        setCheckingIn(null);
    };

    // Handle Scanned QR Code
    const handleQrScan = async (decodedText: string) => {
        const raw = decodedText.trim();
        let cleanCode = raw;

        // If QR is a URL (e.g. https://.../join/EF-...), extract the ref
        if (raw.includes("/join/")) {
            cleanCode = raw.split("/join/")[1]?.split("?")[0]?.split("/")[0] || raw;
        }

        const match = attendees.find((a) => {
            if (!a.ref) return false;
            return (
                a.ref.toLowerCase() === cleanCode.toLowerCase() ||
                a.ref.toLowerCase().includes(cleanCode.toLowerCase()) ||
                cleanCode.toLowerCase().includes(a.ref.toLowerCase()) ||
                a.id === cleanCode
            );
        });

        if (!match) {
            playScanSound("warning");
            setScanNotification({
                type: "not_found",
                title: "Guest Not Found",
                message: `No registered guest found matching "${cleanCode.substring(0, 24)}...". Try searching by name.`,
            });
            return;
        }

        // If it's a school delegation, open the delegation roster modal directly!
        if (match.isSchoolDelegation) {
            playScanSound("success");
            setSelectedDelegationAttendee(match);
            setIsScannerOpen(false);
            setScanNotification({
                type: "success",
                title: "School Delegation Detected!",
                message: `Opened student roster for ${match.schoolName || match.organization || match.first_name}.`,
                attendee: match,
            });
            return;
        }

        if (match.check_in) {
            playScanSound("warning");
            const timeStr = match.check_in_time
                ? new Date(match.check_in_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                : "earlier";
            setScanNotification({
                type: "warning",
                title: "Already Checked In",
                message: `${match.first_name} ${match.last_name} was already checked in at ${timeStr}${
                    match.checked_in_by ? ` by ${match.checked_in_by}` : ""
                }.`,
                attendee: match,
            });
            return;
        }

        // Auto check in
        playScanSound("success");
        await handleCheckIn(match.id);
        setScanNotification({
            type: "success",
            title: "Check-In Confirmed!",
            message: `Checked in ${match.first_name} ${match.last_name}`,
            attendee: { ...match, check_in: true },
        });
    };

    // Logout
    const handleLogout = async () => {
        if (staff) {
            const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            );
            await supabase.from("staff").update({ status: "offline" }).eq("id", staff.id);
        }

        localStorage.removeItem(`${STORAGE_KEY}_${tag}`);
        setStaff(null);
        setAccessCode("");
        setAttendees([]);
        setFilteredAttendees([]);
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedRef(text);
        setTimeout(() => setCopiedRef(null), 1500);
    };

    const checkedInCount = useMemo(() => attendees.filter((a) => a.check_in).length, [attendees]);
    const unipodTourCount = useMemo(
        () => attendees.filter((a) => a.unipodTour?.toLowerCase() === "yes").length,
        [attendees]
    );
    const individualCount = useMemo(
        () => attendees.filter((a) => !a.isSchoolDelegation).length,
        [attendees]
    );
    const schoolCount = useMemo(
        () => attendees.filter((a) => a.isSchoolDelegation).length,
        [attendees]
    );
    const totalStudentsPresent = useMemo(() => {
        let count = 0;
        attendees.forEach((a) => {
            if (a.isSchoolDelegation && a.studentsList) {
                count += a.studentsList.filter((s) => s.present).length;
            }
        });
        return count;
    }, [attendees]);

    // =========================================================================
    // 1. AUTH SCREEN
    // =========================================================================
    if (authLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--brand-blue)]" />
            </div>
        );
    }

    if (!staff) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-6">
                <div className="w-full max-w-sm bg-white rounded-3xl p-8 shadow-xl border border-gray-100 space-y-6">
                    <div className="text-center space-y-2">
                        <div className="w-14 h-14 bg-blue-50 text-[var(--brand-blue)] rounded-2xl mx-auto flex items-center justify-center">
                            <KeyRound className="w-7 h-7" />
                        </div>
                        <h2 className="text-xl font-black text-gray-900 tracking-tight">Staff Check-In</h2>
                        <p className="text-xs text-gray-400 font-bold">Enter your 6-digit access code</p>
                    </div>

                    {authError && (
                        <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-bold flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            {authError}
                        </div>
                    )}

                    <div className="space-y-4">
                        <input
                            type="password"
                            maxLength={6}
                            placeholder="••••••"
                            value={accessCode}
                            onChange={(e) => setAccessCode(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                            className="w-full text-center tracking-[0.5em] text-2xl font-black py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)] focus:bg-white transition-all text-gray-900"
                        />
                        <button
                            onClick={handleLogin}
                            disabled={authLoading || !accessCode.trim()}
                            className="w-full py-4 bg-gray-900 text-white rounded-2xl text-xs font-black hover:bg-black transition-all shadow-lg shadow-gray-200 disabled:opacity-50"
                        >
                            {authLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Access Check-In Desk"}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // =========================================================================
    // 2. CHECK-IN DESK (AUTHENTICATED)
    // =========================================================================
    return (
        <div className="min-h-screen bg-gray-50/50 flex flex-col font-sans">
            {/* Header */}
            <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-40">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-xs font-black text-white uppercase shadow-sm">
                            {staff.first_name.charAt(0)}
                            {staff.last_name.charAt(0)}
                        </div>
                        <div>
                            <div className="text-sm font-black text-gray-900 leading-tight">
                                {staff.first_name} {staff.last_name}
                            </div>
                            <div className="text-[10px] font-bold text-gray-400 capitalize">{staff.role} &middot; Door Desk</div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Live Check-in Counter */}
                        <div className="hidden sm:flex items-center gap-2 bg-gray-50 border border-gray-200/60 rounded-xl px-3 py-1.5">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-xs font-black text-gray-900">{checkedInCount}</span>
                            <span className="text-[10px] font-bold text-gray-400">/ {attendees.length} in</span>
                        </div>

                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-1.5 text-gray-400 hover:text-red-500 transition-colors text-xs font-bold px-2 py-1"
                        >
                            <LogOut className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Log Out</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-6 space-y-5">
                {/* Event Title & Quick Action Strip */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-gray-900">
                            {event?.event_title || "AAES Check-In Desk"}
                        </h1>
                        <p className="text-xs text-gray-400 font-bold mt-0.5">
                            Scan tickets or search to verify attendees at the door
                        </p>
                    </div>

                    {/* Camera Scanner Trigger */}
                    <button
                        onClick={() => {
                            setScanNotification(null);
                            setIsScannerOpen(true);
                        }}
                        className="inline-flex items-center justify-center gap-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs px-5 py-3.5 rounded-2xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
                    >
                        <Camera className="w-4 h-4" />
                        <span>Scan Attendee QR</span>
                    </button>
                </div>

                {/* Scan Notification Card (if scan happened) */}
                <AnimatePresence>
                    {scanNotification && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className={cn(
                                "p-4 sm:p-5 rounded-2xl border shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4",
                                scanNotification.type === "success" && "bg-green-50/90 border-green-200 text-green-950",
                                scanNotification.type === "warning" && "bg-amber-50/90 border-amber-200 text-amber-950",
                                scanNotification.type === "not_found" && "bg-red-50/90 border-red-200 text-red-950"
                            )}
                        >
                            <div className="flex items-start gap-3">
                                {scanNotification.type === "success" && (
                                    <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0 mt-0.5" />
                                )}
                                {scanNotification.type === "warning" && (
                                    <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                                )}
                                {scanNotification.type === "not_found" && (
                                    <AlertCircle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
                                )}

                                <div>
                                    <div className="text-sm font-black">{scanNotification.title}</div>
                                    <div className="text-xs font-bold opacity-90 mt-0.5">
                                        {scanNotification.message}
                                    </div>

                                    {/* Rich Badges for Scanned Attendee */}
                                    {scanNotification.attendee && (
                                        <div className="flex items-center gap-2 flex-wrap mt-2">
                                            {scanNotification.attendee.organization && (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-black bg-white/80 border border-current/10 px-2 py-0.5 rounded-md">
                                                    <Building2 className="w-2.5 h-2.5" />
                                                    {scanNotification.attendee.organization}
                                                </span>
                                            )}
                                            {scanNotification.attendee.role && (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-black bg-white/80 border border-current/10 px-2 py-0.5 rounded-md">
                                                    <GraduationCap className="w-2.5 h-2.5" />
                                                    {scanNotification.attendee.role}
                                                </span>
                                            )}
                                            {scanNotification.attendee.unipodTour?.toLowerCase() === "yes" && (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-black bg-emerald-600 text-white px-2 py-0.5 rounded-md shadow-xs">
                                                    <Sparkles className="w-2.5 h-2.5" />
                                                    UNIPOD TOUR: YES
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-2 self-end sm:self-center">
                                {scanNotification.attendee && scanNotification.type === "success" && (
                                    <button
                                        onClick={() => handleUndoCheckIn(scanNotification.attendee!.id)}
                                        className="text-xs font-black text-gray-500 hover:text-red-600 bg-white px-3 py-1.5 rounded-xl border border-gray-200 transition-colors"
                                    >
                                        Undo
                                    </button>
                                )}
                                <button
                                    onClick={() => setScanNotification(null)}
                                    className="text-xs font-black text-gray-400 hover:text-gray-700 px-2 py-1.5"
                                >
                                    Dismiss
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Mode Switcher: Individuals vs School Delegations */}
                <div className="grid grid-cols-3 gap-2 bg-gray-100/90 p-1.5 rounded-2xl border border-gray-200/60">
                    <button
                        onClick={() => setActiveMode("individuals")}
                        className={cn(
                            "py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5",
                            activeMode === "individuals"
                                ? "bg-white text-gray-900 shadow-sm"
                                : "text-gray-500 hover:text-gray-900"
                        )}
                    >
                        <span>Individuals</span>
                        <span
                            className={cn(
                                "px-2 py-0.5 rounded-full text-[10px]",
                                activeMode === "individuals"
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-gray-200 text-gray-600"
                            )}
                        >
                            {individualCount}
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveMode("schools")}
                        className={cn(
                            "py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5",
                            activeMode === "schools"
                                ? "bg-blue-600 text-white shadow-sm"
                                : "text-gray-500 hover:text-gray-900"
                        )}
                    >
                        <Building2 className="w-3.5 h-3.5" />
                        <span>Schools</span>
                        <span
                            className={cn(
                                "px-2 py-0.5 rounded-full text-[10px]",
                                activeMode === "schools"
                                    ? "bg-white text-blue-700 font-bold"
                                    : "bg-blue-100 text-blue-700"
                            )}
                        >
                            {schoolCount}
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveMode("all")}
                        className={cn(
                            "py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5",
                            activeMode === "all"
                                ? "bg-white text-gray-900 shadow-sm"
                                : "text-gray-500 hover:text-gray-900"
                        )}
                    >
                        <span>All</span>
                        <span
                            className={cn(
                                "px-2 py-0.5 rounded-full text-[10px]",
                                activeMode === "all"
                                    ? "bg-gray-900 text-white"
                                    : "bg-gray-200 text-gray-600"
                            )}
                        >
                            {attendees.length}
                        </span>
                    </button>
                </div>

                {/* School Delegations Highlight Banner when in schools mode */}
                {activeMode === "schools" && (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                                <Users className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="font-black text-gray-900 text-sm">
                                    {schoolCount} Registered School Delegations
                                </div>
                                <div className="font-bold text-gray-500 mt-0.5">
                                    Check in schools by delegation and mark student attendance directly.
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 self-start sm:self-auto bg-white/80 border border-blue-200 rounded-xl px-3 py-1.5 font-black text-blue-900">
                            <span>Students Checked In:</span>
                            <span className="text-emerald-600">{totalStudentsPresent} present</span>
                        </div>
                    </div>
                )}

                {/* Search Bar & Filter Controls */}
                <div className="bg-white p-3 sm:p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search name, school, email, phone, or EF-code..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-10 py-3 bg-gray-50/70 hover:bg-gray-50 focus:bg-white rounded-xl border border-gray-200/80 text-sm font-bold text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* Filter Pills */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
                        <button
                            onClick={() => setSelectedPassFilter(null)}
                            className={cn(
                                "px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-all",
                                selectedPassFilter === null
                                    ? "bg-gray-900 text-white"
                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            )}
                        >
                            All Passes ({attendees.length})
                        </button>

                        {uniquePasses.map((pass) => (
                            <button
                                key={pass}
                                onClick={() => setSelectedPassFilter(pass)}
                                className={cn(
                                    "px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-all",
                                    selectedPassFilter === pass
                                        ? "bg-blue-600 text-white"
                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                )}
                            >
                                {pass}
                            </button>
                        ))}

                        {/* Special UNIPOD Tour Filter Pill */}
                        <button
                            onClick={() => setFilterTourOnly(!filterTourOnly)}
                            className={cn(
                                "px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-all flex items-center gap-1.5 border",
                                filterTourOnly
                                    ? "bg-emerald-600 text-white border-emerald-600"
                                    : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                            )}
                        >
                            <Sparkles className="w-3 h-3" />
                            <span>UNIPOD Tour Only ({unipodTourCount})</span>
                        </button>
                    </div>
                </div>

                {/* Attendee Cards List */}
                <div className="space-y-3">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                            <span className="text-xs font-bold text-gray-400">Loading attendee registry...</span>
                        </div>
                    ) : filteredAttendees.length === 0 ? (
                        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200 p-6">
                            <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                            <h4 className="text-sm font-black text-gray-900">No matching guests found</h4>
                            <p className="text-xs text-gray-400 font-bold mt-1">
                                {searchQuery ? "Try searching by a different name, email, or school" : "No guests in this category"}
                            </p>
                        </div>
                    ) : (
                        filteredAttendees.map((attendee) => {
                            // If this is a school delegation, render dedicated delegation card
                            if (attendee.isSchoolDelegation) {
                                const presentStudents =
                                    attendee.studentsList?.filter((s) => s.present).length || 0;
                                const totalStudents =
                                    attendee.studentsList?.length || attendee.declaredStudentsCount || 0;
                                const pct =
                                    totalStudents > 0
                                        ? Math.round((presentStudents / totalStudents) * 100)
                                        : 0;
                                const isHackathon = attendee.hackathon?.toLowerCase() === "yes";
                                const isUnipod = attendee.unipodTour?.toLowerCase() === "yes";

                                return (
                                    <div
                                        key={attendee.id}
                                        className={cn(
                                            "p-4 sm:p-5 rounded-2xl border transition-all bg-white flex flex-col gap-3.5",
                                            attendee.check_in
                                                ? "border-emerald-300 bg-emerald-50/20 shadow-xs"
                                                : "border-blue-200/80 hover:border-blue-400 bg-white shadow-xs hover:shadow-sm"
                                        )}
                                    >
                                        {/* School Card Top: School Name, Badges & Check-in / Roster CTA */}
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                            <div className="flex items-start gap-3 min-w-0">
                                                <div
                                                    className={cn(
                                                        "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border",
                                                        attendee.check_in
                                                            ? "bg-emerald-100 border-emerald-300 text-emerald-700"
                                                            : "bg-blue-50 border-blue-200 text-blue-700"
                                                    )}
                                                >
                                                    {attendee.check_in ? (
                                                        <Check className="w-6 h-6 stroke-[2.5]" />
                                                    ) : (
                                                        <Building2 className="w-6 h-6" />
                                                    )}
                                                </div>

                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <h3 className="text-base sm:text-lg font-black text-gray-900 leading-tight">
                                                            {attendee.schoolName ||
                                                                attendee.organization ||
                                                                `${attendee.first_name}'s Delegation`}
                                                        </h3>
                                                        {attendee.pubPriv && (
                                                            <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md">
                                                                {attendee.pubPriv}
                                                            </span>
                                                        )}
                                                        <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-blue-100 text-blue-700 rounded-md">
                                                            School Delegation
                                                        </span>
                                                    </div>

                                                    {/* Contact Lead Details */}
                                                    <div className="text-xs text-gray-500 font-bold mt-1 flex items-center gap-2 flex-wrap">
                                                        <span>
                                                            Lead:{" "}
                                                            <strong className="text-gray-800">
                                                                {attendee.first_name} {attendee.last_name}
                                                            </strong>
                                                        </span>
                                                        <span>&middot;</span>
                                                        <span>{attendee.email}</span>
                                                        {attendee.phone && (
                                                            <>
                                                                <span>&middot;</span>
                                                                <a
                                                                    href={`tel:${attendee.phone}`}
                                                                    className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-800 hover:underline font-black"
                                                                >
                                                                    <Phone className="w-3 h-3" />
                                                                    <span>{attendee.phone}</span>
                                                                </a>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Main Action CTA Button: Open Student Roster */}
                                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                                {attendee.check_in && (
                                                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-100 px-3 py-2 rounded-xl border border-emerald-200">
                                                        Checked In
                                                    </span>
                                                )}
                                                <button
                                                    onClick={() => setSelectedDelegationAttendee(attendee)}
                                                    className={cn(
                                                        "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all shadow-md active:scale-95",
                                                        attendee.check_in
                                                            ? "bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
                                                            : "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20"
                                                    )}
                                                >
                                                    <Users className="w-4 h-4" />
                                                    <span>
                                                        {attendee.check_in
                                                            ? "Manage Student Roster"
                                                            : `Check In Students (${totalStudents})`}
                                                    </span>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Middle Section: Live Student Turnout Bar */}
                                        <div className="bg-gray-50/90 rounded-xl p-3 border border-gray-100 space-y-2">
                                            <div className="flex items-center justify-between text-xs">
                                                <div className="flex items-center gap-1.5 font-black text-gray-800">
                                                    <Users className="w-3.5 h-3.5 text-blue-600" />
                                                    <span>Student Attendance:</span>
                                                    <span
                                                        className={cn(
                                                            "px-2 py-0.5 rounded-md text-[11px]",
                                                            presentStudents > 0
                                                                ? "bg-emerald-100 text-emerald-800"
                                                                : "bg-gray-200 text-gray-700"
                                                        )}
                                                    >
                                                        {presentStudents} / {totalStudents} Present ({pct}%)
                                                    </span>
                                                </div>

                                                <span className="text-[11px] font-bold text-gray-500">
                                                    {attendee.declaredTeachersCount || 1} Teacher
                                                    {(attendee.declaredTeachersCount || 1) > 1 ? "s" : ""}
                                                </span>
                                            </div>

                                            {/* Progress bar */}
                                            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                                <div
                                                    className={cn(
                                                        "h-full rounded-full transition-all duration-300",
                                                        presentStudents === totalStudents && totalStudents > 0
                                                            ? "bg-emerald-500"
                                                            : "bg-blue-600"
                                                    )}
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                        </div>

                                        {/* Bottom Badges Strip: Hackathon, UNIPOD, Code, Details */}
                                        <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-gray-100 text-xs">
                                            {isHackathon && (
                                                <span className="inline-flex items-center gap-1 text-[11px] font-black bg-purple-50 border border-purple-200 text-purple-700 px-2.5 py-1 rounded-lg">
                                                    <Trophy className="w-3 h-3 text-purple-600" />
                                                    <span>Hackathon Registered</span>
                                                </span>
                                            )}

                                            {isUnipod && (
                                                <span className="inline-flex items-center gap-1 text-[11px] font-black bg-emerald-50 border border-emerald-300 text-emerald-800 px-2.5 py-1 rounded-lg">
                                                    <Sparkles className="w-3 h-3 text-emerald-600" />
                                                    <span>UNIPOD Tour: Yes (8:00 AM)</span>
                                                </span>
                                            )}

                                            {attendee.ref && (
                                                <button
                                                    onClick={() => copyToClipboard(attendee.ref!)}
                                                    className="inline-flex items-center gap-1 text-[10px] font-mono text-gray-400 hover:text-gray-700 px-2 py-1 bg-gray-50 rounded-lg border border-gray-200"
                                                    title="Click to copy delegation code"
                                                >
                                                    <span>Code: {attendee.ref}</span>
                                                    <Copy className="w-2.5 h-2.5" />
                                                    {copiedRef === attendee.ref && (
                                                        <span className="text-emerald-600 font-sans font-bold text-[9px]">
                                                            Copied!
                                                        </span>
                                                    )}
                                                </button>
                                            )}

                                            {attendee.check_in_time && (
                                                <span className="text-[10px] font-sans font-bold text-gray-400 ml-auto">
                                                    Checked in at{" "}
                                                    {new Date(attendee.check_in_time).toLocaleTimeString([], {
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                    })}
                                                    {attendee.checked_in_by ? ` by ${attendee.checked_in_by}` : ""}
                                                </span>
                                            )}

                                            <button
                                                onClick={() => setSelectedAttendeeDetails(attendee)}
                                                className={cn(
                                                    "inline-flex items-center gap-1 text-[11px] font-black text-blue-600 hover:text-blue-800 hover:underline py-1",
                                                    !attendee.check_in_time && "ml-auto"
                                                )}
                                            >
                                                <Info className="w-3 h-3" />
                                                <span>School Details</span>
                                            </button>
                                        </div>
                                    </div>
                                );
                            }

                            const passTitle = Array.isArray(attendee.pass)
                                ? attendee.pass[0]?.title
                                : attendee.pass?.title || "General Admission";

                            return (
                                <div
                                    key={attendee.id}
                                    className={cn(
                                        "p-4 sm:p-5 rounded-2xl border transition-all bg-white flex flex-col gap-3",
                                        attendee.check_in
                                            ? "border-green-200 bg-green-50/30"
                                            : "border-gray-200/70 hover:border-blue-400/60 shadow-xs hover:shadow-sm"
                                    )}
                                >
                                    {/* Card Top Row: Avatar, Name, Status/Check-in CTA */}
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div
                                                className={cn(
                                                    "w-11 h-11 rounded-xl flex items-center justify-center text-xs font-black uppercase shrink-0 transition-colors",
                                                    attendee.check_in
                                                        ? "bg-green-100 text-green-700 border border-green-200"
                                                        : "bg-gray-100 text-gray-600 border border-gray-200"
                                                )}
                                            >
                                                {attendee.check_in ? (
                                                    <Check className="w-5 h-5 stroke-[2.5]" />
                                                ) : (
                                                    `${attendee.first_name.charAt(0)}${attendee.last_name.charAt(0)}`
                                                )}
                                            </div>

                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h3 className="text-base font-black text-gray-900 truncate">
                                                        {attendee.first_name} {attendee.last_name}
                                                    </h3>
                                                    <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md">
                                                        {passTitle}
                                                    </span>
                                                </div>

                                                <div className="text-xs text-gray-500 font-bold truncate">
                                                    {attendee.email}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Action Button */}
                                        <div className="shrink-0">
                                            {attendee.check_in ? (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-black uppercase tracking-wider text-green-700 bg-green-100 px-3 py-1.5 rounded-xl border border-green-200">
                                                        Checked In
                                                    </span>
                                                    <button
                                                        onClick={() => handleUndoCheckIn(attendee.id)}
                                                        disabled={checkingIn === attendee.id}
                                                        className="text-[10px] font-black uppercase tracking-wider text-gray-400 hover:text-red-600 hover:bg-red-50 px-2.5 py-1.5 rounded-xl transition-colors"
                                                    >
                                                        Undo
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => handleCheckIn(attendee.id)}
                                                    disabled={checkingIn === attendee.id}
                                                    className={cn(
                                                        "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all active:scale-95",
                                                        successId === attendee.id
                                                            ? "bg-green-600 text-white"
                                                            : "bg-gray-900 text-white hover:bg-black shadow-md shadow-gray-200"
                                                    )}
                                                >
                                                    {checkingIn === attendee.id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : successId === attendee.id ? (
                                                        <Check className="w-4 h-4" />
                                                    ) : (
                                                        <UserCheck className="w-4 h-4" />
                                                    )}
                                                    <span>{successId === attendee.id ? "Done!" : "Check In"}</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Card Middle Row: High-Value Badges (Org, Role, Phone, UNIPOD) */}
                                    <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-gray-100">
                                        {attendee.organization && (
                                            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-gray-700 bg-gray-50 border border-gray-200/70 px-2.5 py-1 rounded-lg">
                                                <Building2 className="w-3 h-3 text-gray-400" />
                                                <span className="truncate max-w-[200px]">{attendee.organization}</span>
                                            </span>
                                        )}

                                        {attendee.role && (
                                            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-gray-700 bg-gray-50 border border-gray-200/70 px-2.5 py-1 rounded-lg">
                                                <GraduationCap className="w-3 h-3 text-blue-500" />
                                                <span>{attendee.role}</span>
                                            </span>
                                        )}

                                        {attendee.phone && (
                                            <a
                                                href={`tel:${attendee.phone}`}
                                                className="inline-flex items-center gap-1.5 text-[11px] font-bold text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200/70 px-2.5 py-1 rounded-lg transition-colors"
                                            >
                                                <Phone className="w-3 h-3 text-emerald-500" />
                                                <span>{attendee.phone}</span>
                                            </a>
                                        )}

                                        {/* UNIPOD Tour Badge */}
                                        {attendee.unipodTour && (
                                            <span
                                                className={cn(
                                                    "inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-lg border",
                                                    attendee.unipodTour.toLowerCase() === "yes"
                                                        ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                                                        : "bg-gray-50 border-gray-200 text-gray-400"
                                                )}
                                            >
                                                <Sparkles className="w-3 h-3" />
                                                <span>UNIPOD Tour: {attendee.unipodTour}</span>
                                            </span>
                                        )}

                                        {/* Hackathon Badge (if yes) */}
                                        {attendee.hackathon && attendee.hackathon.toLowerCase() === "yes" && (
                                            <span className="inline-flex items-center gap-1 text-[11px] font-black bg-purple-50 border border-purple-200 text-purple-700 px-2.5 py-1 rounded-lg">
                                                Hackathon: Yes
                                            </span>
                                        )}

                                        {/* View Full Info Trigger */}
                                        <button
                                            onClick={() => setSelectedAttendeeDetails(attendee)}
                                            className="ml-auto inline-flex items-center gap-1 text-[11px] font-black text-blue-600 hover:text-blue-800 hover:underline py-1"
                                        >
                                            <Info className="w-3 h-3" />
                                            <span>Full Info</span>
                                        </button>
                                    </div>

                                    {/* Card Footer: Check-in Code & Check-in Time */}
                                    <div className="flex items-center justify-between text-[10px] font-mono text-gray-400 pt-1">
                                        {attendee.ref && (
                                            <button
                                                onClick={() => copyToClipboard(attendee.ref!)}
                                                className="inline-flex items-center gap-1 hover:text-gray-700"
                                                title="Click to copy code"
                                            >
                                                <span>Code: {attendee.ref}</span>
                                                <Copy className="w-2.5 h-2.5" />
                                                {copiedRef === attendee.ref && (
                                                    <span className="text-green-600 font-sans font-bold text-[9px]">Copied!</span>
                                                )}
                                            </button>
                                        )}

                                        {attendee.check_in_time && (
                                            <span className="font-sans font-bold text-gray-400">
                                                Checked in at{" "}
                                                {new Date(attendee.check_in_time).toLocaleTimeString([], {
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })}
                                                {attendee.checked_in_by ? ` by ${attendee.checked_in_by}` : ""}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </main>

            {/* Footer Stats Bar */}
            <footer className="bg-white border-t border-gray-100 py-3 sticky bottom-0 z-30 shadow-md">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs">
                    <span className="font-bold text-gray-400 text-center sm:text-left">
                        Showing {filteredAttendees.length} of {attendees.length} guests
                    </span>
                    <div className="flex items-center gap-3">
                        <span className="font-bold text-gray-500">
                            UNIPOD Slots: <strong className="text-emerald-600">{unipodTourCount}</strong>
                        </span>
                        <div className="h-3 w-px bg-gray-200" />
                        <span className="font-bold text-gray-500">
                            Checked In:{" "}
                            <strong className="text-gray-900 font-black">
                                {checkedInCount} / {attendees.length}
                            </strong>
                        </span>
                    </div>
                </div>
            </footer>

            {/* Modal: Live Camera QR Scanner */}
            {isScannerOpen && (
                <QrCameraScanner
                    onScan={handleQrScan}
                    onClose={() => setIsScannerOpen(false)}
                    lastNotification={scanNotification}
                    onUndoCheckIn={handleUndoCheckIn}
                    onViewDetails={(att) => {
                        setSelectedAttendeeDetails(att as any);
                        setIsScannerOpen(false);
                    }}
                />
            )}

            {/* Modal: Full Attendee Information Sheet */}
            {selectedAttendeeDetails && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl border border-gray-100 w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-sm uppercase">
                                    {selectedAttendeeDetails.first_name.charAt(0)}
                                    {selectedAttendeeDetails.last_name.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-gray-900">
                                        {selectedAttendeeDetails.first_name} {selectedAttendeeDetails.last_name}
                                    </h3>
                                    <p className="text-xs font-bold text-gray-400">{selectedAttendeeDetails.email}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedAttendeeDetails(null)}
                                className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Modal Body: Registration Answers */}
                        <div className="p-6 overflow-y-auto space-y-4 flex-1">
                            {/* Key Summary Box */}
                            <div className="grid grid-cols-2 gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100 text-xs">
                                <div>
                                    <span className="text-[10px] font-black text-gray-400 uppercase">Check-in Code</span>
                                    <div className="font-mono font-bold text-gray-900 break-all">
                                        {selectedAttendeeDetails.ref || "None"}
                                    </div>
                                </div>
                                <div>
                                    <span className="text-[10px] font-black text-gray-400 uppercase">Ticket Tier</span>
                                    <div className="font-bold text-gray-900">
                                        {Array.isArray(selectedAttendeeDetails.pass)
                                            ? selectedAttendeeDetails.pass[0]?.title
                                            : selectedAttendeeDetails.pass?.title || "General Admission"}
                                    </div>
                                </div>
                                <div>
                                    <span className="text-[10px] font-black text-gray-400 uppercase">Phone</span>
                                    <div className="font-bold text-gray-900">
                                        {selectedAttendeeDetails.phone || "Not provided"}
                                    </div>
                                </div>
                                <div>
                                    <span className="text-[10px] font-black text-gray-400 uppercase">UNIPOD Tour Slot</span>
                                    <div
                                        className={cn(
                                            "font-black",
                                            selectedAttendeeDetails.unipodTour?.toLowerCase() === "yes"
                                                ? "text-emerald-600"
                                                : "text-gray-500"
                                        )}
                                    >
                                        {selectedAttendeeDetails.unipodTour || "Not specified"}
                                    </div>
                                </div>
                            </div>

                            {/* Full Question Responses */}
                            <div>
                                <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">
                                    Submitted Registration Answers
                                </h4>
                                {selectedAttendeeDetails.answers && selectedAttendeeDetails.answers.length > 0 ? (
                                    <div className="space-y-2 border border-gray-100 rounded-2xl overflow-hidden divide-y divide-gray-100">
                                        {selectedAttendeeDetails.answers.map((ans, idx) => (
                                            <div key={idx} className="p-3 bg-white text-xs">
                                                <div className="font-bold text-gray-500 text-[11px]">
                                                    {ans.questions?.title || "Question"}
                                                </div>
                                                <div className="font-black text-gray-900 mt-0.5 whitespace-pre-wrap">
                                                    {ans.answer_text || "—"}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-gray-400 font-bold italic">
                                        No custom question answers recorded.
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-500">
                                Status:{" "}
                                <strong
                                    className={cn(
                                        selectedAttendeeDetails.check_in ? "text-green-600" : "text-gray-700"
                                    )}
                                >
                                    {selectedAttendeeDetails.check_in ? "Checked In" : "Not Checked In"}
                                </strong>
                            </span>

                            {selectedAttendeeDetails.check_in ? (
                                <button
                                    onClick={async () => {
                                        await handleUndoCheckIn(selectedAttendeeDetails.id);
                                        setSelectedAttendeeDetails((prev) => (prev ? { ...prev, check_in: false } : null));
                                    }}
                                    className="px-4 py-2 bg-white text-red-600 border border-gray-200 text-xs font-black rounded-xl hover:bg-red-50 transition-colors"
                                >
                                    Undo Check-In
                                </button>
                            ) : (
                                <button
                                    onClick={async () => {
                                        await handleCheckIn(selectedAttendeeDetails.id);
                                        setSelectedAttendeeDetails((prev) => (prev ? { ...prev, check_in: true } : null));
                                    }}
                                    className="px-5 py-2.5 bg-gray-900 hover:bg-black text-white text-xs font-black rounded-xl transition-all shadow-md shadow-gray-200"
                                >
                                    Check In Guest
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: School Delegation Student Attendance Roster */}
            {selectedDelegationAttendee && (
                <DelegationRosterModal
                    isOpen={Boolean(selectedDelegationAttendee)}
                    onClose={() => setSelectedDelegationAttendee(null)}
                    schoolName={
                        selectedDelegationAttendee.schoolName ||
                        selectedDelegationAttendee.organization ||
                        "School Delegation"
                    }
                    pubPriv={selectedDelegationAttendee.pubPriv}
                    leadName={`${selectedDelegationAttendee.first_name} ${selectedDelegationAttendee.last_name}`}
                    leadEmail={selectedDelegationAttendee.email}
                    leadPhone={selectedDelegationAttendee.phone}
                    leadRole={selectedDelegationAttendee.role}
                    hackathon={selectedDelegationAttendee.hackathon?.toLowerCase() === "yes"}
                    unipodTour={selectedDelegationAttendee.unipodTour?.toLowerCase() === "yes"}
                    declaredTeachersCount={selectedDelegationAttendee.declaredTeachersCount || 1}
                    declaredTeachersList={selectedDelegationAttendee.declaredTeachersList || []}
                    initialStudents={selectedDelegationAttendee.studentsList || []}
                    initialNotes={selectedDelegationAttendee.properties?.schoolDelegation?.notes || ""}
                    onSave={handleSaveDelegation}
                    saving={savingDelegation}
                />
            )}
        </div>
    );
}
