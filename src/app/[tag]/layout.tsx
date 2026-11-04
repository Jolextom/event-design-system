import type { Metadata } from "next";
import { adminClient } from "@/lib/apiV1";
import { metaForTag } from "./theme";

/**
 * The browser tab title and the preview shown when an event link is shared (WhatsApp, X, search).
 * Events with their own wording in theme.ts (see `meta`) get it; every other event keeps the
 * site-wide defaults from the root layout, unchanged.
 */
async function coverImage(tag: string): Promise<string | null> {
    try {
        const lookup = adminClient().from("events").select("image").eq("tag", tag).maybeSingle();
        const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000));
        const res = await Promise.race([lookup, timeout]);
        const image = (res as { data?: { image?: string | null } } | null)?.data?.image;
        return typeof image === "string" && /^https?:\/\//.test(image) ? image : null;
    } catch {
        return null; // no image in the preview is better than no page
    }
}

export async function generateMetadata({ params }: { params: Promise<{ tag: string }> }): Promise<Metadata> {
    const { tag } = await params;
    const meta = metaForTag(tag);
    if (!meta) return {};
    const image = await coverImage(tag);
    return {
        title: meta.title,
        description: meta.description,
        robots: meta.noindex ? { index: false, follow: false } : undefined,
        openGraph: {
            type: "website",
            title: meta.title,
            description: meta.description,
            siteName: meta.siteName,
            images: image ? [{ url: image }] : undefined,
        },
        twitter: {
            card: image ? "summary_large_image" : "summary",
            title: meta.title,
            description: meta.description,
            images: image ? [image] : undefined,
        },
    };
}

export default function EventLayout({ children }: { children: React.ReactNode }) {
    return children;
}
