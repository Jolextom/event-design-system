"use client";

import React, { useMemo, useState, useRef, useEffect } from "react";
import {
    Users,
    BarChart2,
    CreditCard,
    Ticket,
    CheckCircle2,
    PieChart as PieChartIcon,
    MessageSquare,
    Send,
    Eye,
    Settings,
    UserPlus,
    ListChecks,
    ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { format, subDays, startOfDay, isSameDay } from "date-fns";
import type { Event, Attendee, Pass, Question, Group } from "../types";
import { evaluateSegment } from "../utils/segmentLogic";

interface CommandHubProps {
    event: Event | null;
    attendees: Attendee[];
    passes: Pass[];
    questions: Question[];
    smartSegments: Group[];
    loading?: boolean;
    onNavigate?: (view: string) => void;
}

// ── Skeleton Pulse ──────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
    return <div className={cn("animate-pulse bg-gray-100 rounded-xl", className)} />;
}

type ChartRange = 7 | 14 | 30 | 90 | "all";
type ChartViz = "daily" | "cumulative" | "weekly";
type ChartMetric = "registrations" | "revenue" | "tickets";

export function CommandHubView({ event, attendees, passes, questions, smartSegments, loading = false, onNavigate }: CommandHubProps) {
    const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
    const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
    const [chartRange, setChartRange] = useState<ChartRange>(14);
    const [chartViz, setChartViz] = useState<ChartViz>("daily");
    const [vizDropdownOpen, setVizDropdownOpen] = useState(false);
    const [chartMetric, setChartMetric] = useState<ChartMetric>("registrations");
    const vizRef = useRef<HTMLDivElement>(null);

    // Close viz dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (vizRef.current && !vizRef.current.contains(e.target as Node)) setVizDropdownOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    // ── Computed Metrics ──────────────────────────────────────────────
    const metrics = useMemo(() => {
        const confirmed = attendees.filter(a => a.email_status !== "invited");
        const invited = attendees.filter(a => a.email_status === "invited");
        const checkedIn = attendees.filter(a => a.check_in);

        const totalRegistrations = confirmed.length;
        const totalInvited = invited.length;
        const totalCheckedIn = checkedIn.length;
        const checkInRate = totalRegistrations > 0
            ? ((totalCheckedIn / totalRegistrations) * 100).toFixed(1)
            : "0.0";

        const netRevenue = passes.reduce((sum, p) => sum + (p.sales_volume || 0), 0);
        const ticketsSold = passes.reduce((sum, p) => sum + (p.quantity_sold || 0), 0);

        return { totalRegistrations, totalInvited, totalCheckedIn, checkInRate, netRevenue, ticketsSold };
    }, [attendees, passes]);

    // ── Build a pass-price lookup for revenue calc ─────────────────────
    const passPriceMap = useMemo(() => {
        const m: Record<string, number> = {};
        passes.forEach(p => { m[p.id] = p.price || 0; });
        return m;
    }, [passes]);

    // ── Chart Data (context-sensitive) ─────────────────────────────────
    const chartData = useMemo(() => {
        const today = startOfDay(new Date());
        const allWithDate = attendees.filter(a => a.created_at);

        // Determine day range
        let days: number;
        if (chartRange === "all") {
            if (allWithDate.length === 0) { days = 14; }
            else {
                const earliest = allWithDate.reduce((min, a) => {
                    const d = new Date(a.created_at!);
                    return d < min ? d : min;
                }, new Date());
                days = Math.max(Math.ceil((today.getTime() - startOfDay(earliest).getTime()) / 86400000) + 1, 2);
            }
        } else {
            days = chartRange;
        }

        // Build raw daily values
        const dailyCounts: { date: Date; value: number; label: string }[] = [];
        for (let i = days - 1; i >= 0; i--) {
            const day = subDays(today, i);
            const dayAttendees = allWithDate.filter(a => isSameDay(new Date(a.created_at!), day));
            let value: number;
            if (chartMetric === "revenue") {
                value = dayAttendees.reduce((sum, a) => sum + (a.pass_id ? (passPriceMap[a.pass_id] || 0) : 0), 0);
            } else if (chartMetric === "tickets") {
                value = dayAttendees.filter(a => a.pass_id).length;
            } else {
                value = dayAttendees.filter(a => a.email_status !== "invited").length;
            }
            dailyCounts.push({ date: day, value, label: format(day, "dd MMM") });
        }

        // Build display values based on viz mode
        let displayCounts: number[];
        if (chartViz === "cumulative") {
            let running = 0;
            displayCounts = dailyCounts.map(d => { running += d.value; return running; });
        } else if (chartViz === "weekly") {
            const weeklyBuckets: number[] = [];
            for (let i = 0; i < dailyCounts.length; i += 7) {
                const weekSlice = dailyCounts.slice(i, i + 7);
                weeklyBuckets.push(weekSlice.reduce((s, d) => s + d.value, 0));
            }
            displayCounts = weeklyBuckets;
        } else {
            displayCounts = dailyCounts.map(d => d.value);
        }

        // Build labels for weekly mode
        const displayLabels: string[] = chartViz === "weekly"
            ? Array.from({ length: Math.ceil(dailyCounts.length / 7) }, (_, i) => {
                const start = dailyCounts[i * 7];
                const end = dailyCounts[Math.min((i + 1) * 7 - 1, dailyCounts.length - 1)];
                return `${format(start.date, "dd MMM")} – ${format(end.date, "dd MMM")}`;
            })
            : dailyCounts.map(d => d.label);

        const maxCount = Math.max(...displayCounts, 1);
        const chartHeight = 200;
        const chartWidth = 800;
        const stepX = chartWidth / (displayCounts.length - 1 || 1);
        const barWidth = Math.min(stepX * 0.6, 40);

        const points = displayCounts.map((count, i) => ({
            x: i * stepX,
            y: chartHeight - (count / maxCount) * (chartHeight * 0.85) - 10,
            count,
            label: displayLabels[i] || "",
        }));

        const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
        const areaPath = `${linePath} L${chartWidth},${chartHeight} L0,${chartHeight} Z`;

        // Label skip for x-axis
        const labelSkip = chartViz === "weekly" ? 1 : (days <= 14 ? 3 : days <= 30 ? 5 : 10);

        return { dailyCounts: displayLabels.map((l, i) => ({ label: l, count: displayCounts[i] })), linePath, areaPath, points, maxCount, labelSkip, barWidth, chartHeight, chartWidth };
    }, [attendees, passes, passPriceMap, chartRange, chartViz, chartMetric]);

    // ── Question Analytics (all questions, using options for zero-counts) ──
    const questionAnalytics = useMemo(() => {
        if (questions.length === 0) return [];

        const totalGuests = attendees.length;
        if (totalGuests === 0) return [];

        return questions
            .filter(q => q.options && q.options.length > 0)
            .map(q => {
                // Count responses per option
                const optionCounts: { label: string; count: number }[] = (q.options || []).map(opt => ({
                    label: opt.option_text,
                    count: attendees.filter(a => a.responses?.[q.id] === opt.option_text).length,
                }));

                const totalResponded = optionCounts.reduce((s, o) => s + o.count, 0);

                return {
                    id: q.id,
                    title: q.title,
                    type: q.question_type,
                    options: optionCounts.map(o => ({
                        ...o,
                        percent: totalGuests > 0 ? Math.round((o.count / totalGuests) * 100) : 0,
                    })),
                    totalResponded,
                    totalGuests,
                };
            });
    }, [attendees, questions]);

    // ── Segment data with evaluated counts ────────────────────────────
    const segmentColors = [
        "bg-blue-500", "bg-purple-500", "bg-emerald-500", "bg-amber-500",
        "bg-rose-500", "bg-cyan-500", "bg-indigo-500", "bg-orange-500",
    ];

    const segmentData = useMemo(() => {
        return smartSegments.map((seg, i) => {
            const matchCount = attendees.filter(a => evaluateSegment(a, seg.rules_config)).length;
            return {
                id: seg.id,
                label: seg.name,
                count: matchCount,
                percent: attendees.length > 0 ? Math.round((matchCount / attendees.length) * 100) : 0,
                color: segmentColors[i % segmentColors.length],
                type: seg.type,
            };
        });
    }, [smartSegments, attendees]);

    // ── Format currency ───────────────────────────────────────────────
    const formatCurrency = (amount: number) => {
        if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}k`;
        return `$${amount.toLocaleString()}`;
    };

    // ── Primary Stats ─────────────────────────────────────────────────
    const primaryStats: { key: ChartMetric | "checkins"; label: string; value: string; sub: string; icon: any; color: string; bg: string; subColor: string; chartColor: string }[] = [
        { key: "registrations", label: "Registrations", value: metrics.totalRegistrations.toLocaleString(), sub: `${metrics.totalInvited} invited`, icon: Users, color: "text-blue-600", bg: "bg-blue-50", subColor: "text-blue-500 bg-blue-50", chartColor: "#3b82f6" },
        { key: "revenue", label: "Revenue", value: formatCurrency(metrics.netRevenue), sub: `${metrics.ticketsSold} tickets sold`, icon: CreditCard, color: "text-emerald-600", bg: "bg-emerald-50", subColor: "text-emerald-500 bg-emerald-50", chartColor: "#10b981" },
        { key: "tickets", label: "Tickets Sold", value: metrics.ticketsSold.toLocaleString(), sub: `${passes.length} ticket type${passes.length !== 1 ? "s" : ""}`, icon: Ticket, color: "text-indigo-600", bg: "bg-indigo-50", subColor: "text-indigo-500 bg-indigo-50", chartColor: "#6366f1" },
        { key: "checkins", label: "Check-ins", value: `${metrics.checkInRate}%`, sub: `${metrics.totalCheckedIn} of ${metrics.totalRegistrations}`, icon: CheckCircle2, color: "text-orange-600", bg: "bg-orange-50", subColor: "text-orange-500 bg-orange-50", chartColor: "#f97316" },
    ];

    // ── Chart context helpers ─────────────────────────────────────────
    const activeChartStat = primaryStats.find(s => s.key === chartMetric) || primaryStats[0];
    const chartTitles: Record<ChartMetric, string> = { registrations: "Registration Trends", revenue: "Revenue Trends", tickets: "Ticket Sales" };
    const chartIcons: Record<ChartMetric, any> = { registrations: Users, revenue: CreditCard, tickets: Ticket };

    const vizLabelMap: Record<ChartMetric, Record<ChartViz, string>> = {
        registrations: { daily: "Daily Signups", cumulative: "Cumulative", weekly: "Weekly Total" },
        revenue: { daily: "Daily Revenue", cumulative: "Cumulative Revenue", weekly: "Weekly Revenue" },
        tickets: { daily: "Daily Sales", cumulative: "Cumulative Sales", weekly: "Weekly Sales" },
    };

    const vizOptions: { id: ChartViz; label: string }[] = [
        { id: "daily", label: vizLabelMap[chartMetric].daily },
        { id: "cumulative", label: vizLabelMap[chartMetric].cumulative },
        { id: "weekly", label: vizLabelMap[chartMetric].weekly },
    ];

    // ── Quick Actions ─────────────────────────────────────────────────
    const quickActions = [
        { label: "View Guests", icon: Users, desc: "See your full guest list", view: "registry", hoverBg: "hover:bg-blue-50/60", hoverBorder: "hover:border-blue-200", iconBg: "group-hover:bg-blue-100", iconColor: "group-hover:text-blue-600" },
        { label: "Send Broadcast", icon: Send, desc: "Email all guests", view: "broadcast", hoverBg: "hover:bg-purple-50/60", hoverBorder: "hover:border-purple-200", iconBg: "group-hover:bg-purple-100", iconColor: "group-hover:text-purple-600" },
        { label: "Preview Event", icon: Eye, desc: "See how guests see it", view: "studio", hoverBg: "hover:bg-emerald-50/60", hoverBorder: "hover:border-emerald-200", iconBg: "group-hover:bg-emerald-100", iconColor: "group-hover:text-emerald-600" },
        { label: "Settings", icon: Settings, desc: "Manage your event", view: "settings", hoverBg: "hover:bg-amber-50/60", hoverBorder: "hover:border-amber-200", iconBg: "group-hover:bg-amber-100", iconColor: "group-hover:text-amber-600" },
    ];

    const rangeOptions: { value: ChartRange; label: string }[] = [
        { value: 7, label: "7d" },
        { value: 14, label: "14d" },
        { value: 30, label: "30d" },
        { value: 90, label: "90d" },
    ];

    const metricOptions: { key: ChartMetric; label: string }[] = [
        { key: "registrations", label: "Registrations" },
        { key: "revenue", label: "Revenue" },
        { key: "tickets", label: "Tickets Sold" },
    ];

    const ChartIcon = chartIcons[chartMetric];
    const chartColor = activeChartStat.chartColor;
    const formatTooltipValue = (v: number) => chartMetric === "revenue" ? `$${v.toLocaleString()}` : v.toLocaleString();
    const useBarChart = true; // Default to bar chart for now since viz toggle is gone

    return (
        <div className="h-full overflow-y-auto bg-white custom-scrollbar">
            <div className="p-8 md:p-10 space-y-8 max-w-6xl mx-auto relative pb-24">
                {/* Decorative background glows */}
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[var(--brand-blue)]/5 blur-[120px] rounded-full pointer-events-none" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none" />

                <header className="relative z-10 pt-4 flex items-end justify-between">
                    <div>
                        <div className="flex items-center gap-2.5 mb-2.5">
                            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-[var(--brand-blue)] opacity-70">Overview</span>
                            <div className="h-[1px] w-8 bg-gray-100" />
                        </div>
                        <h1 className="text-3xl font-black tracking-tight text-gray-900 leading-none">Dashboard</h1>
                        <p className="text-sm text-gray-400 mt-2 font-bold opacity-80">
                            Here's how <span className="text-gray-900 opacity-100 italic">{event?.event_title || "your event"}</span> is performing.
                        </p>
                    </div>
                    {event?.start_date && (
                        <div className="pb-1 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            {format(new Date(event.start_date), "MMMM dd, yyyy")}
                        </div>
                    )}
                </header>

                {/* ── Primary Metrics Grid ──────────────────────────────── */}
                <div className="grid grid-cols-4 gap-4 relative z-10">
                    {loading ? (
                        Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="p-6 border border-gray-100 rounded-[24px] bg-white/60">
                                <Skeleton className="w-10 h-10 rounded-2xl mb-5" />
                                <Skeleton className="w-20 h-3 mb-3" />
                                <Skeleton className="w-28 h-7" />
                            </div>
                        ))
                    ) : (
                        primaryStats.map((stat, i) => {
                            const isChartable = stat.key !== "checkins";
                            const isActive = isChartable && stat.key === chartMetric;
                            return (
                                <motion.div
                                    key={stat.label}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.08 }}
                                    onClick={() => { if (isChartable) setChartMetric(stat.key as ChartMetric); }}
                                    className={cn(
                                        "p-6 rounded-[24px] bg-white/60 backdrop-blur-md shadow-sm transition-all group",
                                        isChartable
                                            ? "cursor-pointer hover:shadow-xl hover:translate-y-[-2px]"
                                            : "cursor-default",
                                        isActive
                                            ? "border"
                                            : "border border-gray-100",
                                    )}
                                    // Much subtler border: 30% opacity
                                    style={isActive ? { borderColor: `${stat.chartColor}50` } : undefined}
                                >
                                    <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center mb-5 shadow-sm border border-transparent group-hover:border-gray-100 transition-all", stat.bg)}>
                                        <stat.icon className={cn("w-5 h-5", stat.color)} />
                                    </div>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1.5">{stat.label}</p>
                                    <div className="flex items-end gap-2">
                                        <span className="text-2xl font-black text-gray-900 tracking-tighter">{stat.value}</span>
                                        <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-md", stat.subColor)}>{stat.sub}</span>
                                    </div>
                                </motion.div>
                            );
                        })
                    )}
                </div>

                {/* ── Second Row: Trends Chart + Quick Actions ────────── */}
                <div className="grid grid-cols-12 gap-5 relative z-10">
                    {/* Context-Sensitive Chart */}
                    <div className="col-span-8 p-8 border border-gray-100 rounded-[32px] bg-white/60 backdrop-blur-md shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-sm font-black text-gray-900 tracking-tight flex items-center gap-2">
                                    <ChartIcon className="w-4 h-4" style={{ color: chartColor }} />
                                    {chartTitles[chartMetric]}
                                </h3>
                                {/* Date range filter pills */}
                                <div className="flex items-center gap-1 mt-2">
                                    {rangeOptions.map(opt => (
                                        <button
                                            key={opt.value}
                                            onClick={() => setChartRange(opt.value)}
                                            className={cn(
                                                "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                                                chartRange === opt.value
                                                    ? "text-white shadow-sm"
                                                    : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                                            )}
                                            style={chartRange === opt.value ? { backgroundColor: chartColor } : undefined}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {/* Metric Selection Dropdown */}
                            <div className="relative" ref={vizRef}>
                                <button
                                    onClick={() => setVizDropdownOpen(!vizDropdownOpen)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-100 hover:border-gray-200 bg-white hover:bg-gray-50 transition-all"
                                >
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: chartColor }} />
                                    <span className="text-[10px] font-bold text-gray-500">{metricOptions.find(m => m.key === chartMetric)?.label}</span>
                                    <ChevronDown className={cn("w-3 h-3 text-gray-400 transition-transform", vizDropdownOpen && "rotate-180")} />
                                </button>
                                {vizDropdownOpen && (
                                    <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-gray-100 rounded-xl shadow-xl z-50 py-1 overflow-hidden">
                                        {metricOptions.map(opt => (
                                            <button
                                                key={opt.key}
                                                onClick={() => { setChartMetric(opt.key); setVizDropdownOpen(false); }}
                                                className={cn(
                                                    "w-full text-left px-3 py-2 text-xs font-bold transition-all",
                                                    chartMetric === opt.key
                                                        ? "bg-blue-50 text-blue-600"
                                                        : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                                                )}
                                                style={chartMetric === opt.key ? { color: chartColor, backgroundColor: `${chartColor}10` } : undefined}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {loading ? (
                            <Skeleton className="w-full h-[200px] rounded-2xl" />
                        ) : (
                            <div className="relative h-[200px] overflow-visible"
                                onMouseLeave={() => setHoveredPoint(null)}>
                                <svg viewBox="0 0 800 200" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                                    <defs>
                                        <linearGradient id="chartGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                                            <stop offset="0%" style={{ stopColor: chartColor, stopOpacity: 0.12 }} />
                                            <stop offset="100%" style={{ stopColor: chartColor, stopOpacity: 0 }} />
                                        </linearGradient>
                                    </defs>

                                    {useBarChart ? (
                                        /* ── Bar Chart Mode ── */
                                        <>{chartData.points.map((pt, i) => {
                                            const barH = chartData.chartHeight - pt.y;
                                            return (
                                                <g key={i}>
                                                    <motion.rect
                                                        initial={{ height: 0, y: chartData.chartHeight }}
                                                        animate={{ height: barH, y: pt.y }}
                                                        transition={{ duration: 0.5, delay: i * 0.03, ease: "easeOut" }}
                                                        x={pt.x - chartData.barWidth / 2}
                                                        width={chartData.barWidth}
                                                        rx={4}
                                                        fill={hoveredPoint === i ? chartColor : `${chartColor}30`}
                                                        stroke={chartColor}
                                                        strokeWidth={hoveredPoint === i ? 1.5 : 0}
                                                        className="transition-colors duration-150"
                                                    />
                                                    <rect
                                                        x={pt.x - chartData.barWidth / 2 - 5}
                                                        y={0}
                                                        width={chartData.barWidth + 10}
                                                        height={200}
                                                        fill="transparent"
                                                        onMouseEnter={() => setHoveredPoint(i)}
                                                    />
                                                </g>
                                            );
                                        })}</>
                                    ) : (
                                        /* ── Area Chart Mode (cumulative) ── */
                                        <>
                                            <path d={chartData.areaPath} fill="url(#chartGrad)" />
                                            <motion.path
                                                initial={{ pathLength: 0, opacity: 0 }}
                                                animate={{ pathLength: 1, opacity: 1 }}
                                                transition={{ duration: 1.2, ease: "easeOut" }}
                                                d={chartData.linePath}
                                                fill="none"
                                                stroke={chartColor}
                                                strokeWidth="2.5"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            />
                                            {chartData.points.map((pt, i) => (
                                                <g key={i}>
                                                    <rect
                                                        x={pt.x - 25}
                                                        y={0}
                                                        width={50}
                                                        height={200}
                                                        fill="transparent"
                                                        onMouseEnter={() => setHoveredPoint(i)}
                                                    />
                                                    <circle
                                                        cx={pt.x}
                                                        cy={pt.y}
                                                        r={hoveredPoint === i ? 5 : 3}
                                                        fill={hoveredPoint === i ? chartColor : "white"}
                                                        stroke={chartColor}
                                                        strokeWidth={2}
                                                        className="transition-all duration-150"
                                                    />
                                                </g>
                                            ))}
                                        </>
                                    )}
                                </svg>

                                {/* Hover Tooltip */}
                                <AnimatePresence>
                                    {hoveredPoint !== null && chartData.points[hoveredPoint] && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 4 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: 4 }}
                                            className="absolute pointer-events-none bg-gray-900 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-lg"
                                            style={{
                                                left: `${(chartData.points[hoveredPoint].x / 800) * 100}%`,
                                                top: `${(chartData.points[hoveredPoint].y / 200) * 100 - 16}%`,
                                                transform: "translateX(-50%)",
                                            }}
                                        >
                                            <span className="font-black">{formatTooltipValue(chartData.points[hoveredPoint].count)}</span>
                                            <span className="text-white/60 ml-1.5">{chartData.points[hoveredPoint].label}</span>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* X-Axis labels */}
                                <div className="absolute bottom-[-22px] left-0 w-full flex justify-between px-0 text-[9px] font-bold text-gray-300">
                                    {chartData.dailyCounts
                                        .filter((_, i) => i % chartData.labelSkip === 0 || i === chartData.dailyCounts.length - 1)
                                        .map((d, i) => (
                                            <span key={i}>{d.label}</span>
                                        ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Quick Actions */}
                    <div className="col-span-4 p-6 border border-gray-100 rounded-[32px] bg-white/60 backdrop-blur-md shadow-sm">
                        <h3 className="text-sm font-black text-gray-900 tracking-tight flex items-center gap-2 mb-1">
                            <ListChecks className="w-4 h-4 text-blue-600" />
                            Quick Actions
                        </h3>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-5">Jump to a section</p>

                        <div className="space-y-2">
                            {quickActions.map((action) => (
                                <button
                                    key={action.label}
                                    onClick={() => onNavigate?.(action.view)}
                                    className={cn("w-full flex items-center gap-4 p-3.5 rounded-2xl border border-gray-100 transition-all group text-left", action.hoverBg, action.hoverBorder)}
                                >
                                    <div className={cn("w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center transition-colors shrink-0", action.iconBg)}>
                                        <action.icon className={cn("w-4 h-4 text-gray-400 transition-colors", action.iconColor)} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-black text-gray-900 leading-none">{action.label}</p>
                                        <p className="text-[10px] font-medium text-gray-400 mt-0.5">{action.desc}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── Third Row: Custom Questions + Guest Segments ────── */}
                <div className="grid grid-cols-12 gap-5 relative z-10">
                    {/* Custom Questions */}
                    <div className="col-span-12 md:col-span-7 p-8 border border-gray-100 rounded-[32px] bg-white/60 backdrop-blur-md shadow-sm relative overflow-hidden">
                        <header className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-sm font-black text-gray-900 tracking-tight flex items-center gap-2">
                                    <MessageSquare className="w-4 h-4 text-blue-600" />
                                    Custom Questions
                                </h3>
                                <p className="text-[10px] text-gray-400 font-bold mt-0.5 uppercase tracking-widest">Select-type questions only</p>
                            </div>
                            <span className="text-[10px] font-black text-gray-400 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100 shrink-0">{questionAnalytics.length} total</span>
                        </header>

                        {loading ? (
                            <div className="h-[320px]">
                                <div className="space-y-6">
                                    {Array.from({ length: 2 }).map((_, i) => (
                                        <div key={i}>
                                            <Skeleton className="w-40 h-3 mb-3" />
                                            <Skeleton className="w-full h-1.5 mb-2" />
                                            <Skeleton className="w-3/4 h-1.5 mb-2" />
                                            <Skeleton className="w-1/2 h-1.5" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : questionAnalytics.length > 0 ? (
                            <div className="h-[320px] flex flex-col">
                                {/* Active question card — absolute so height doesn't shift dots */}
                                <div className="flex-1 relative overflow-hidden">
                                    <AnimatePresence mode="wait">
                                        {(() => {
                                            const qa = questionAnalytics[activeQuestionIndex];
                                            if (!qa) return null;
                                            const sorted = qa.options.slice().sort((a, b) => b.percent - a.percent);
                                            const visible = sorted.slice(0, 5);
                                            const overflow = sorted.length - 5;

                                            return (
                                                <motion.div
                                                    key={qa.id}
                                                    className="absolute inset-0"
                                                    initial={{ opacity: 0, x: 30 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    exit={{ opacity: 0, x: -30 }}
                                                    transition={{ duration: 0.25, ease: "easeInOut" }}
                                                >
                                                    <div className="flex items-center justify-between mb-3">
                                                        <h4 className="text-[11px] font-black text-gray-700 truncate max-w-[70%]" title={qa.title}>{qa.title}</h4>
                                                        <span className="text-[9px] font-bold text-gray-400 shrink-0">{qa.totalResponded} of {qa.totalGuests} responded</span>
                                                    </div>
                                                    <div className="flex flex-col gap-1">
                                                        {visible.map((opt, oi) => (
                                                            <div
                                                                key={oi}
                                                                className="relative flex items-center w-full px-4 py-2 rounded-lg transition-all text-left gap-3 border border-transparent overflow-hidden bg-white hover:bg-blue-50"
                                                                style={{ minHeight: 38 }}
                                                            >
                                                                <span
                                                                    className="absolute left-0 top-0 h-full bg-blue-100/40 transition-all z-0"
                                                                    style={{ width: `${opt.percent}%` }}
                                                                />
                                                                <span className="inline-block w-3 h-3 rounded-full bg-blue-200 z-10 shrink-0" />
                                                                <span className="font-medium text-sm text-gray-700 z-10 flex-1 truncate">{opt.label}</span>
                                                                <span className="text-sm font-bold text-gray-400 z-10 shrink-0">{opt.percent}%</span>
                                                            </div>
                                                        ))}
                                                        {overflow > 0 && (
                                                            <div className="text-center pt-1">
                                                                <span className="text-[10px] font-bold text-gray-400">+{overflow} more option{overflow !== 1 ? "s" : ""}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            );
                                        })()}
                                    </AnimatePresence>
                                </div>

                                {/* Dot indicators pinned to bottom */}
                                {questionAnalytics.length > 1 && (
                                    <div className="flex items-center justify-center gap-1.5 pt-4">
                                        {questionAnalytics.map((_, i) => (
                                            <button
                                                key={i}
                                                onClick={() => setActiveQuestionIndex(i)}
                                                className={cn(
                                                    "rounded-full transition-all",
                                                    i === activeQuestionIndex
                                                        ? "w-5 h-2 bg-blue-500"
                                                        : "w-2 h-2 bg-gray-200 hover:bg-gray-300"
                                                )}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p className="text-xs text-gray-400 font-medium italic text-center py-8">No questions with options yet</p>
                        )}
                    </div>

                    {/* Guest Segments */}
                    <div className="col-span-12 md:col-span-5 p-8 border border-gray-100 rounded-[32px] bg-white/60 backdrop-blur-md shadow-sm">
                        <header className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-sm font-black text-gray-900 tracking-tight flex items-center gap-2">
                                    <PieChartIcon className="w-4 h-4 text-purple-600" />
                                    Guest Segments
                                </h3>
                                <p className="text-[10px] text-gray-400 font-bold mt-0.5 uppercase tracking-widest">How your guests are grouped</p>
                            </div>
                            <span className="text-[10px] font-black text-gray-400 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100 shrink-0">{smartSegments.length} total</span>
                        </header>

                        {loading ? (
                            <div className="space-y-4">
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <div key={i}>
                                        <Skeleton className="w-full h-3 mb-2" />
                                        <Skeleton className="w-full h-1.5" />
                                    </div>
                                ))}
                            </div>
                        ) : segmentData.length > 0 ? (
                            <div className="space-y-2">
                                {segmentData.slice(0, 5).map((seg, i) => (
                                    <motion.div
                                        key={seg.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.06 }}
                                        className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50/50 transition-all group"
                                    >
                                        <div className={cn("w-3 h-3 rounded-full shrink-0", seg.color)} />
                                        <span className="text-xs font-bold text-gray-700 group-hover:text-gray-900 transition-colors flex-1 truncate">{seg.label}</span>
                                        {seg.type === "breakdown" && (
                                            <span className="text-[8px] font-bold text-gray-300 uppercase tracking-wide shrink-0">breakdown</span>
                                        )}
                                        <span className="text-xs font-black text-gray-900 shrink-0">{seg.count}</span>
                                    </motion.div>
                                ))}
                                {segmentData.length > 5 && (
                                    <div className="text-center pt-1">
                                        <span className="text-[10px] font-bold text-gray-400">+{segmentData.length - 5} more segment{segmentData.length - 5 !== 1 ? "s" : ""}</span>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p className="text-xs text-gray-400 font-medium italic text-center py-6">No segments created yet</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
