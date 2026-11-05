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

export interface ConductText {
    title: string;
    sections: { heading: string; intro?: string; items: string[] }[];
    /** Label of the required tick box. */
    agreeLabel: string;
}

/** A group chat registered people are invited to (shown on the receipt page and in the confirmation email). */
export interface CommunityLink {
    label: string;
    /** The invite link. Use the clean form without tracking parameters. */
    url: string;
    note?: string;
}

export interface PageTheme {
    /** Shown under the cover as "Hosted By". Omit to hide the block (events have no host field yet). */
    hostName?: string;
    /**
     * Who emails for this event come from. When set, the platform's own sending
     * domain is used with this display name and brand, INSTEAD of whatever verified
     * sender identity the event owner's account happens to have (which, for an
     * account that also runs another brand, would put that other brand on this
     * event's emails). When omitted, the old behaviour applies unchanged.
     */
    email?: { brandName: string; fromName?: string; replyTo?: string };
    /**
     * Name shown where the platform's own name ("EventFlow") would otherwise appear on this event's
     * public pages (page header, receipt, join page footers). Omit to keep "EventFlow".
     */
    brandName?: string;
    /** The browser tab title and the text shown when the event link is shared or searched. Omit to keep the platform's generic ones. */
    meta?: { title: string; description: string; siteName?: string };
    /**
     * Whether a buyer of a group ticket may "Invite" the other people to fill in their own details later.
     * Set to false to make the buyer fill in every guest's details at checkout (and have the server
     * refuse invited guests and half-filled groups). Defaults to true.
     */
    allowInvites?: boolean;
    /**
     * A short code of conduct shown at the bottom of the registration form; the buyer must tick
     * "agree" before they can register or pay. Omit for none.
     */
    conduct?: ConductText;
    /**
     * A WhatsApp (or similar) group for registered guests. Apps can't add people to a group themselves, so we show
     * the invite link once the order is complete: on the receipt page and in the confirmation email.
     */
    community?: CommunityLink;
    /**
     * Tells the browser how this page's native controls (dropdown lists, date pickers, scrollbars) should be drawn.
     * A dark page must say "dark": otherwise an open dropdown is a white box and light text on it is invisible.
     * Defaults to "light".
     */
    colorScheme?: "light" | "dark";
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
    email: { brandName: "Campus Yo-Pro Ministry", fromName: "Main Character Fest" },
    brandName: "Main Character Fest",
    meta: {
        title: "Main Character Fest 2026",
        description:
            "Dress as your favourite movie character. Live DJ, costume party, games, booths and food. For campus students and young professionals. Sat 19 Dec 2026, Surulere.",
        siteName: "Campus Yo-Pro Ministry",
    },
    colorScheme: "dark",
    allowInvites: false,
    community: {
        label: "Join the Main Character Fest WhatsApp group",
        url: "https://chat.whatsapp.com/JHjcoEm79WrJQ1TGQa2yA6",
        note: "This group is for registered guests. Please don't share the link.",
    },
    conduct: {
        title: "Code of Conduct",
        sections: [
            {
                heading: "Expected behaviour",
                intro: "Participants are expected to:",
                items: [
                    "Treat everyone with courtesy, dignity, and respect.",
                    "Communicate honestly and professionally.",
                    "Respect personal boundaries, privacy, and consent.",
                    "Follow event rules, venue requirements, and reasonable instructions from event organisers and staff.",
                    "Help maintain a welcoming environment for people of all backgrounds, identities, abilities, and levels of experience.",
                    "Take responsibility for their words and actions.",
                ],
            },
            {
                heading: "Dress code",
                intro: "Come dressed as your favourite movie character: costumes are encouraged, not compulsory. Modest dress is still required for everyone.",
                items: [
                    "Dress decently and appropriately for a mixed gathering of campus students and young professionals. Outfits should not be revealing or sexually suggestive.",
                    "Costumes must not carry offensive, hateful, or inappropriate symbols, slogans, or imagery.",
                    "Organisers may ask a guest to adjust or cover up an outfit that does not meet this guideline, and may decline entry or ask someone to leave if the request is not followed.",
                ],
            },
        ],
        agreeLabel: "I have read and agree to the Code of Conduct.",
    },
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

/**
 * The group-chat link to show registered guests of this event, if it has one. Test copies of an event (tag contains
 * "-test") never get it, so someone trying the registration out doesn't end up in the real group.
 */
export function communityForTag(tag?: string | null): CommunityLink | undefined {
    if (isTestTag(tag)) return undefined;
    const c = resolveTheme(tag).community;
    return c && /^https:\/\//.test(c.url) ? c : undefined;
}

/** Can the buyer of a group ticket invite the others to fill in their own details? (False for events that want everyone filled in at checkout.) */
export function invitesAllowedForTag(tag?: string | null): boolean {
    return resolveTheme(tag).allowInvites !== false;
}

/** The name to show instead of the platform's own for this event's public pages. */
export function brandNameForTag(tag?: string | null): string {
    return resolveTheme(tag).brandName ?? "EventFlow";
}

/** Test copies of an event (tag contains "-test") are labelled and kept out of search engines. */
export const isTestTag = (tag?: string | null): boolean => !!tag && /-test(-|$)/.test(tag);

/** Tab title / link-preview text for this event's tag, or null to keep the site-wide defaults. */
export function metaForTag(tag?: string | null): { title: string; description: string; siteName?: string; noindex: boolean } | null {
    const meta = resolveTheme(tag).meta;
    if (!meta) return null;
    const test = isTestTag(tag);
    return { ...meta, title: test ? `[Test] ${meta.title}` : meta.title, noindex: test };
}

/** Email identity configured for this event's tag, if any (see PageTheme.email). */
export function emailConfigForTag(tag?: string | null): PageTheme["email"] | undefined {
    return resolveTheme(tag).email;
}

/** The theme's colours as CSS variables, to spread onto the page's root element. */
export function themeStyle(theme: PageTheme): CSSProperties {
    const c = theme.colors;
    return {
        colorScheme: theme.colorScheme ?? "light",
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
