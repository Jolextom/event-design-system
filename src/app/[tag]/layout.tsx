import type { Metadata } from "next";
import { adminClient } from "@/lib/apiV1";
import { metaForTag } from "./theme";

/**
 * The browser tab title and the preview shown when an event link is shared (WhatsApp, X, search).
 * Events with their own wording in theme.ts (see `meta`) get it; every other event keeps the
 * site-wide defaults from the root layout, unchanged.
 */
async function eventFacts(tag: string): Promise<{ image: string | null; groupInStock: boolean }> {
    try {
        const lookup = adminClient()
            .from("events")
            .select("image, passes(type, quantity_available, quantity_sold)")
            .eq("tag", tag)
            .maybeSingle();
        const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000));
        const res = await Promise.race([lookup, timeout]);
        const row = (res as { data?: { image?: string | null; passes?: { type?: string; quantity_available?: number | null; quantity_sold?: number | null }[] } } | null)?.data;
        const image = row?.image;
        const groupInStock = (row?.passes ?? []).some((p) => p.type === "group" && Number(p.quantity_available ?? 0) - Number(p.quantity_sold ?? 0) > 0);
        return { image: typeof image === "string" && /^https?:\/\//.test(image) ? image : null, groupInStock };
    } catch {
        return { image: null, groupInStock: false }; // no image / no promo line in the preview is better than no page
    }
}

export async function generateMetadata({ params }: { params: Promise<{ tag: string }> }): Promise<Metadata> {
    const { tag } = await params;
    const meta = metaForTag(tag);
    if (!meta) return {};
    const { image, groupInStock } = await eventFacts(tag);
    // The promo line is only added while a group ticket still has stock, so a preview never advertises a sold-out deal.
    // (Chat apps keep a preview for hours to days, so the wording says "while stock lasts" and never a live number.)
    const description = groupInStock && meta.promoLine ? `${meta.description} ${meta.promoLine}` : meta.description;
    return {
        title: meta.title,
        description,
        robots: meta.noindex ? { index: false, follow: false } : undefined,
        openGraph: {
            type: "website",
            title: meta.title,
            description,
            siteName: meta.siteName,
            images: image ? [{ url: image }] : undefined,
        },
        twitter: {
            card: image ? "summary_large_image" : "summary",
            title: meta.title,
            description,
            images: image ? [image] : undefined,
        },
    };
}

export default function EventLayout({ children }: { children: React.ReactNode }) {
    return children;
}
