import { cn } from "@/lib/utils";

/**
 * Look-and-feel pieces shared by every public event page (the event page itself,
 * the invite page, the receipt page's add-member box). They read the --pg-*
 * colour variables set by themeStyle() on the page root, so a themed event
 * looks the same on every one of them.
 */
export const muted = "text-[color:var(--pg-muted)]";
export const hairline = "border-[color:var(--pg-border)]";

export const inputCls = cn(
    "w-full rounded-lg border bg-[color:var(--pg-input)] px-3.5 text-[15px] text-[color:var(--pg-text)] outline-none transition",
    "placeholder:text-[color:var(--pg-muted)] focus:border-[color:var(--pg-accent)] focus:ring-4 focus:ring-[color:var(--pg-ring)]",
    hairline
);

export const choiceCls = (selected: boolean, disabled = false) =>
    cn(
        "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-[15px] transition",
        selected ? "border-[color:var(--pg-accent)] bg-[color:var(--pg-selected)]" : cn(hairline, "hover:bg-[color:var(--pg-surface)]"),
        disabled && "cursor-not-allowed opacity-50 hover:bg-transparent"
    );

export const primaryBtn =
    "flex w-full items-center justify-center gap-2 rounded-xl bg-[color:var(--pg-btn)] font-medium text-[color:var(--pg-btn-fg)] transition hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40";

export function Radio({ selected }: { selected: boolean }) {
    return (
        <span
            className={cn(
                "grid h-4 w-4 shrink-0 place-items-center rounded-full border",
                selected ? "border-[color:var(--pg-accent)] bg-[color:var(--pg-accent)]" : "border-[color:var(--pg-border)]"
            )}
        >
            {selected && <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--pg-btn-fg)]" />}
        </span>
    );
}
