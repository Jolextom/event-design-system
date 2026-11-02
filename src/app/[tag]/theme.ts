import type { CSSProperties } from "react";

/**
 * Look-and-feel for the public event page.
 *
 * The page layout is the same for every event (a Luma-style two-column
 * page). A theme only changes colours, the ambient glow behind the page,
 * and a few words of copy. Events with no matching theme get DEFAULT_THEME,
 * a clean light page whose background picks up colours from the cover image.
 *
 * To theme another event, add an entry to THEMES below. Entries are matched
 * against the start of the event's tag (the URL slug), so
 * "main-character-fest-2026-ab3d" matches the "main-character-fest" key.
 */

export interface PageTheme {
    /** Shown under the cover as "Hosted By". Omit to hide the block (events have no host field yet). */
    hostName?: string;
    /** Label on the main registration button. */
    ctaLabel: string;
    /** Line shown at the top of the registration card. */
    welcomeText: string;
    /** How strongly the blurred cover image tints the page background (0–1). */
    ambientOpacity: number;
    /** Two soft colour blobs behind the page. Omit for none. */
    glow?: [string, string];
    /** Gradient laid over the ambient layer so text stays readable. */
    veil: string;
    colors: {
        bg: string;
        /** Cards and panels sitting on the page. */
        surface: string;
        /** The registration dialog. */
        modal: string;
        border: string;
        text: string;
        muted: string;
        input: string;
        /** Primary button. */
        btn: string;
        btnFg: string;
        /** Focus and selected-state colour. */
        accent: string;
        /** Focus ring. */
        ring: string;
        /** Background of a selected option row. */
        selected: string;
    };
}

export const DEFAULT_THEME: PageTheme = {
    ctaLabel: "Register",
    welcomeText: "Welcome! To join the event, please register below.",
    ambientOpacity: 0.55,
    veil: "linear-gradient(180deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.9) 55%, #ffffff 100%)",
    colors: {
        bg: "#ffffff",
        surface: "rgba(255,255,255,0.72)",
        modal: "#ffffff",
        border: "rgba(19,21,23,0.1)",
        text: "#131517",
        muted: "#6b6f76",
        input: "#ffffff",
        btn: "#131517",
        btnFg: "#ffffff",
        accent: "#131517",
        ring: "rgba(19,21,23,0.12)",
        selected: "rgba(19,21,23,0.04)",
    },
};

const MAIN_CHARACTER_FEST: PageTheme = {
    hostName: "Campus Yo-Pro Ministry",
    ctaLabel: "Claim your role",
    welcomeText: "Everybody has a role. Pull up as your favourite character and register below.",
    ambientOpacity: 0.5,
    // Purple and gold, taken from the event logo.
    glow: ["#7c3aed", "#f5b700"],
    veil: "linear-gradient(180deg, rgba(11,7,20,0.3) 0%, rgba(11,7,20,0.82) 55%, #0b0714 100%)",
    colors: {
        bg: "#0b0714",
        surface: "rgba(255,255,255,0.06)",
        modal: "#15101f",
        border: "rgba(255,255,255,0.13)",
        text: "#ffffff",
        muted: "rgba(255,255,255,0.66)",
        input: "rgba(255,255,255,0.06)",
        btn: "#f7c948",
        btnFg: "#1a1206",
        accent: "#f7c948",
        ring: "rgba(247,201,72,0.28)",
        selected: "rgba(247,201,72,0.12)",
    },
};

const THEMES: Record<string, PageTheme> = {
    "main-character-fest": MAIN_CHARACTER_FEST,
};

export function resolveTheme(tag?: string | null): PageTheme {
    if (!tag) return DEFAULT_THEME;
    const key = Object.keys(THEMES).find((prefix) => tag.startsWith(prefix));
    return key ? THEMES[key] : DEFAULT_THEME;
}

/** The theme's colours as CSS variables, to spread onto the page's root element. */
export function themeStyle(theme: PageTheme): CSSProperties {
    const c = theme.colors;
    return {
        "--pg-bg": c.bg,
        "--pg-surface": c.surface,
        "--pg-modal": c.modal,
        "--pg-border": c.border,
        "--pg-text": c.text,
        "--pg-muted": c.muted,
        "--pg-input": c.input,
        "--pg-btn": c.btn,
        "--pg-btn-fg": c.btnFg,
        "--pg-accent": c.accent,
        "--pg-ring": c.ring,
        "--pg-selected": c.selected,
    } as CSSProperties;
}
