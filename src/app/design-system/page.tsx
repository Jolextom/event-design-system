"use client";

import {
    Sparkles,
    Activity,
    MessageSquare,
    BarChart2,
    Zap,
    Check,
    Trash2,
    Settings2,
    Calendar,
    MapPin,
    Mail,
    Type,
    Plus,
    ChevronRight,
    GripVertical
} from "lucide-react";
import { cn } from "@/lib/utils";

function ColorBlock({ color, label, hex }: { color: string; label: string; hex: string }) {
    return (
        <div className="space-y-2">
            <div className="h-20 w-full rounded-2xl border border-[var(--color-neutral-100)]" style={{ backgroundColor: color }} />
            <div>
                <div className="text-[11px] font-bold text-[var(--color-neutral-900)] uppercase tracking-tight">{label}</div>
                <div className="text-[10px] font-medium text-[var(--color-neutral-400)]">{hex}</div>
            </div>
        </div>
    );
}

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
    return (
        <div className="space-y-8">
            <header className="border-b border-[var(--color-neutral-100)] pb-6">
                <h2 className="text-xl font-bold text-[var(--color-neutral-900)]">{title}</h2>
                <p className="text-[13px] text-[var(--color-neutral-500)] mt-1">{description}</p>
            </header>
            {children}
        </div>
    );
}

export default function DesignSystemPage() {
    return (
        <div className="min-h-screen bg-[var(--color-neutral-50)]/50 pb-32">
            {/* Header */}
            <div className="bg-white border-b border-[var(--color-neutral-100)] px-12 py-12 mb-12">
                <div className="max-w-6xl mx-auto">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2.5 bg-[var(--color-primary-600)] text-white rounded-2xl shadow-lg shadow-[var(--color-primary-100)]">
                            <Sparkles className="w-6 h-6" />
                        </div>
                        <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-[var(--color-primary-600)]">EventFlow Core</span>
                    </div>
                    <h1 className="text-4xl font-bold text-[var(--color-neutral-900)]">Design System v2.0</h1>
                    <p className="text-lg text-[var(--color-neutral-500)] mt-3">A clean, high-precision SaaS aesthetic for event management.</p>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-12 space-y-32">

                {/* Colors */}
                <Section title="Color Palette" description="Vibrant but professional professional palette with deep blues and neutral slates.">
                    <div className="space-y-12">
                        <div className="grid grid-cols-2 md:grid-cols-6 lg:grid-cols-11 gap-4">
                            {["50", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"].map((weight) => (
                                <ColorBlock key={weight} color={`var(--color-primary-${weight})`} label={`Blue ${weight}`} hex="" />
                            ))}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-6 lg:grid-cols-11 gap-4">
                            {["0", "50", "100", "200", "300", "400", "500", "600", "700", "800", "900"].map((weight) => (
                                <ColorBlock key={weight} color={`var(--color-neutral-${weight})`} label={`Slate ${weight}`} hex="" />
                            ))}
                        </div>
                    </div>
                </Section>

                {/* Typography */}
                <Section title="Typography Scale" description="The Geist Sans typeface provides a technical yet approachable feel.">
                    <div className="space-y-12 bg-white p-12 rounded-[32px] border border-[var(--color-neutral-100)] shadow-sm">
                        <div className="flex items-end gap-12">
                            <div className="text-4xl font-bold">Aa</div>
                            <div className="flex-1 space-y-4">
                                <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-neutral-400)]">Primary Font: Geist Sans</p>
                                <p className="text-sm text-[var(--color-neutral-600)] leading-relaxed">
                                    The quick brown fox jumps over the lazy dog. A high-clarity font designed for data-heavy interfaces and creative workflows.
                                </p>
                            </div>
                        </div>
                        <div className="grid gap-8">
                            <div className="flex items-center justify-between border-b border-[var(--color-neutral-50)] pb-4">
                                <span className="text-[10px] font-bold text-[var(--color-neutral-400)]">Display 1</span>
                                <span className="text-4xl font-bold">Event Strategy</span>
                            </div>
                            <div className="flex items-center justify-between border-b border-[var(--color-neutral-50)] pb-4">
                                <span className="text-[10px] font-bold text-[var(--color-neutral-400)]">Heading 1</span>
                                <span className="text-2xl font-bold">Question Module</span>
                            </div>
                            <div className="flex items-center justify-between border-b border-[var(--color-neutral-50)] pb-4">
                                <span className="text-[10px] font-bold text-[var(--color-neutral-400)]">Label Caps</span>
                                <span className="label-caps">Registration Architecture</span>
                            </div>
                            <div className="flex items-center justify-between border-b border-[var(--color-neutral-50)] pb-4">
                                <span className="text-[10px] font-bold text-[var(--color-neutral-400)]">Body Large</span>
                                <span className="text-lg">Capturing the right data points...</span>
                            </div>
                        </div>
                    </div>
                </Section>

                {/* Components */}
                <Section title="UI Components" description="Foundational blocks built with precision and intent.">
                    <div className="grid md:grid-cols-2 gap-12">
                        {/* Buttons */}
                        <div className="space-y-6">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--color-neutral-400)]">Interactions</h3>
                            <div className="flex flex-wrap gap-4 px-8 py-10 bg-white border border-[var(--color-neutral-100)] rounded-3xl shadow-sm">
                                <button className="bg-[var(--color-neutral-900)] text-white px-8 py-3 rounded-2xl text-[13px] font-bold shadow-xl shadow-[var(--color-neutral-100)] hover:scale-[1.02] active:scale-95 transition-all">
                                    Primary Button
                                </button>
                                <button className="px-6 py-3 rounded-2xl text-[13px] font-bold text-[var(--color-neutral-600)] hover:bg-[var(--color-neutral-50)] border border-[var(--color-neutral-100)] transition-all">
                                    Secondary
                                </button>
                                <button className="p-3 bg-[var(--color-primary-50)] text-[var(--color-primary-600)] rounded-xl">
                                    <Plus className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Inputs */}
                        <div className="space-y-6">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--color-neutral-400)]">Forms</h3>
                            <div className="space-y-4 px-8 py-10 bg-white border border-[var(--color-neutral-100)] rounded-3xl shadow-sm">
                                <div className="space-y-2">
                                    <label className="label-caps">Field Label</label>
                                    <input type="text" placeholder="Enter value..." className="input-base" />
                                </div>
                                <div className="flex items-center justify-between p-4 bg-[var(--color-neutral-50)] rounded-xl">
                                    <span className="text-sm font-bold">Switch Component</span>
                                    <div className="w-10 h-5.5 bg-green-500 rounded-full relative p-1">
                                        <div className="w-3.5 h-3.5 bg-white rounded-full translate-x-4.5" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </Section>

                {/* Layout Panes */}
                <Section title="Layout Panes" description="The 3-column system that defines the EventFlow experience.">
                    <div className="grid grid-cols-12 h-[400px] border border-[var(--color-neutral-100)] rounded-[32px] overflow-hidden shadow-2xl bg-white">
                        <div className="col-span-1 border-r border-[var(--color-neutral-100)] flex flex-col items-center py-6 gap-6">
                            <div className="w-8 h-8 rounded-lg bg-[var(--color-primary-600)]" />
                            <div className="flex flex-col gap-4">
                                {[1, 2, 3].map(i => <div key={i} className="w-8 h-8 rounded-lg bg-[var(--color-neutral-50)]" />)}
                            </div>
                        </div>
                        <div className="col-span-3 border-r border-[var(--color-neutral-100)] p-6 bg-[var(--color-neutral-50)]/50">
                            <div className="w-1/2 h-2 bg-[var(--color-neutral-200)] rounded-full mb-8" />
                            <div className="space-y-3">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className={cn("h-10 rounded-xl", i === 1 ? "bg-[var(--color-primary-50)] border border-[var(--color-primary-100)]" : "bg-white border border-[var(--color-neutral-100)]")} />
                                ))}
                            </div>
                        </div>
                        <div className="col-span-8 p-12 overflow-hidden flex flex-col justify-center gap-6">
                            <div className="w-1/3 h-6 bg-[var(--color-neutral-100)] rounded-full mb-2" />
                            <div className="w-full h-4 bg-[var(--color-neutral-50)] rounded-full" />
                            <div className="w-full h-4 bg-[var(--color-neutral-50)] rounded-full" />
                            <div className="w-2/3 h-4 bg-[var(--color-neutral-50)] rounded-full" />
                            <div className="mt-8 grid grid-cols-2 gap-6">
                                <div className="h-24 rounded-3xl border border-[var(--color-neutral-100)] bg-white shadow-sm" />
                                <div className="h-24 rounded-3xl border border-[var(--color-neutral-100)] bg-white shadow-sm" />
                            </div>
                        </div>
                    </div>
                </Section>

            </div>
        </div>
    );
}
