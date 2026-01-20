"use client";

import { motion } from "framer-motion";
import {
  Calendar,
  Users,
  BarChart3,
  QrCode,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Zap,
} from "lucide-react";

const features = [
  {
    icon: Calendar,
    title: "Event Creation",
    description: "Set up events with custom questions, variable assignments, and conditional logic.",
  },
  {
    icon: Users,
    title: "Group Registration",
    description: "Seamless individual or group sign-ups with email confirmations and QR receipts.",
  },
  {
    icon: BarChart3,
    title: "Live Analytics",
    description: "Real-time insights on registrations, check-ins, and attendee distributions.",
  },
  {
    icon: QrCode,
    title: "Event Day Ops",
    description: "Staff roles, QR check-ins, and live metrics during your event.",
  },
];

const stats = [
  { value: "99.9%", label: "Uptime" },
  { value: "50K+", label: "Events Hosted" },
  { value: "2M+", label: "Attendees" },
  { value: "4.9★", label: "Rating" },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[var(--color-neutral-0)]">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background Gradient */}
        <div className="absolute inset-0 gradient-bg-subtle" />
        <div
          className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full opacity-30"
          style={{
            background: "radial-gradient(circle, var(--color-primary-200) 0%, transparent 70%)",
          }}
        />

        <div className="relative max-w-7xl mx-auto px-6 pt-20 pb-32">
          {/* Nav */}
          <nav className="flex items-center justify-between mb-20">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-[var(--color-neutral-900)]">EventFlow</span>
            </div>
            <div className="flex items-center gap-4">
              <a href="/auth" className="btn btn-secondary">Sign In</a>
              <a href="/auth" className="btn btn-primary">Get Started</a>
            </div>
          </nav>

          {/* Hero Content */}
          <div className="max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-[var(--color-primary-100)] text-[var(--color-primary-700)] mb-6">
                <Zap className="w-4 h-4" />
                Now with AI-powered insights
              </span>
            </motion.div>

            <motion.h1
              className="text-5xl md:text-6xl font-bold leading-tight mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <span className="text-[var(--color-neutral-900)]">Events that </span>
              <span className="gradient-text">connect</span>
              <span className="text-[var(--color-neutral-900)]">, simplified.</span>
            </motion.h1>

            <motion.p
              className="text-xl text-[var(--color-neutral-600)] mb-8 max-w-2xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              The complete platform for creating, managing, and analyzing events.
              From registration to check-in, deliver seamless experiences.
            </motion.p>

            <motion.div
              className="flex flex-wrap gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <a href="/auth" className="btn btn-primary text-base px-8 py-4 flex items-center gap-2">
                Start Free Trial
                <ArrowRight className="w-5 h-5" />
              </a>
              <button className="btn btn-secondary text-base px-8 py-4">
                Watch Demo
              </button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 border-y border-[var(--color-neutral-200)]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <div className="text-4xl font-bold gradient-text mb-2">{stat.value}</div>
                <div className="text-[var(--color-neutral-500)]">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-[var(--color-neutral-900)] mb-4">
              Everything you need to run events
            </h2>
            <p className="text-lg text-[var(--color-neutral-600)] max-w-2xl mx-auto">
              Powerful tools for organizers, seamless experiences for attendees.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                className="group p-6 rounded-2xl bg-[var(--color-neutral-0)] border border-[var(--color-neutral-200)] hover-lift"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <div className="w-12 h-12 rounded-xl bg-[var(--color-primary-100)] flex items-center justify-center mb-4 group-hover:bg-[var(--color-primary-500)] transition-colors duration-200">
                  <feature.icon className="w-6 h-6 text-[var(--color-primary-600)] group-hover:text-white transition-colors duration-200" />
                </div>
                <h3 className="text-lg font-semibold text-[var(--color-neutral-900)] mb-2">
                  {feature.title}
                </h3>
                <p className="text-[var(--color-neutral-600)] text-sm leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            className="relative rounded-3xl overflow-hidden gradient-bg p-12 md:p-16"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <div
              className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-20"
              style={{
                background: "radial-gradient(circle, white 0%, transparent 70%)",
              }}
            />
            <div className="relative max-w-2xl">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Ready to transform your events?
              </h2>
              <p className="text-lg text-white/80 mb-8">
                Join thousands of organizers creating memorable experiences.
              </p>
              <div className="flex flex-wrap gap-4">
                <button className="btn bg-white text-[var(--color-primary-700)] hover:bg-[var(--color-neutral-100)] px-8 py-4 text-base">
                  Get Started Free
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
              <div className="flex items-center gap-6 mt-8 text-white/80 text-sm">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Free 14-day trial
                </span>
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> No credit card required
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-[var(--color-neutral-200)]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-[var(--color-neutral-900)]">EventFlow</span>
            </div>
            <p className="text-sm text-[var(--color-neutral-500)]">
              © 2026 EventFlow. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
