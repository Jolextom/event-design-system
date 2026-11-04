/**
 * Pay in a popup on the event page instead of leaving it.
 *
 * The SERVER still creates the Paystack transaction (price, fee and the organiser split are fixed
 * there, see checkout.ts). The browser only gets that transaction's access code and shows
 * Paystack's checkout for it, so nothing the page does can change what is charged.
 *
 * If the popup can't be shown for any reason (script blocked, offline, Paystack didn't respond,
 * no access code), we fall back to the old full-page redirect, so paying always still works.
 */

export interface PopupHandlers {
    /** Paid in the popup. Go to the receipt page: it verifies the payment with Paystack itself. */
    onSuccess: (reference?: string) => void;
    /** The customer closed the popup without paying. */
    onCancel: () => void;
    /** The popup isn't usable: send the customer to Paystack's payment page instead. */
    onFallback: () => void;
}

interface PopupLike {
    resumeTransaction(
        accessCode: string,
        callbacks: {
            onLoad?: () => void;
            onSuccess?: (tx: { reference?: string }) => void;
            onCancel?: () => void;
            onError?: (e: { message?: string }) => void;
        }
    ): unknown;
}
type Loader = () => Promise<{ default: new () => PopupLike }>;

const defaultLoader: Loader = () => import("@paystack/inline-js") as unknown as Promise<{ default: new () => PopupLike }>;

export async function openPaystackPopup(
    accessCode: string | null | undefined,
    handlers: PopupHandlers,
    opts: { load?: Loader; /** give up (and redirect) if Paystack hasn't shown the form by then */ loadTimeoutMs?: number } = {}
): Promise<void> {
    if (!accessCode) return handlers.onFallback();

    let settled = false;
    let loaded = false;
    const finish = (run: () => void) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        run();
    };
    const timer = setTimeout(() => { if (!loaded) finish(handlers.onFallback); }, opts.loadTimeoutMs ?? 10000);

    try {
        const mod = await (opts.load ?? defaultLoader)();
        const Pop = mod.default;
        new Pop().resumeTransaction(accessCode, {
            onLoad: () => { loaded = true; clearTimeout(timer); },
            onSuccess: (tx) => finish(() => handlers.onSuccess(tx?.reference)),
            onCancel: () => finish(handlers.onCancel),
            // Couldn't load the form at all -> redirect. Failed after the form was showing -> treat like closing it.
            onError: () => finish(loaded ? handlers.onCancel : handlers.onFallback),
        });
    } catch {
        finish(handlers.onFallback);
    }
}
