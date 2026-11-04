export const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || "";

// Overridable so tests can point at a local fake; production never sets this.
const PAYSTACK_API_BASE = process.env.PAYSTACK_API_BASE || "https://api.paystack.co";

interface InitializeOptions {
    email: string;
    amount: number;
    reference: string;
    metadata?: any;
    callbackUrl?: string;
    /**
     * Split payment: the organiser's Paystack subaccount (ACCT_xxx). The
     * subaccount receives `amount - transactionCharge`.
     */
    subaccount?: string;
    /**
     * Flat amount in KOBO that goes to the MAIN (platform) account instead of
     * the subaccount. Only meaningful together with `subaccount`.
     */
    transactionCharge?: number;
    /**
     * Who bears Paystack's processing fee. "account" (default) = the main
     * account, i.e. it comes out of the platform's share and the organiser
     * receives exactly `amount - transactionCharge`.
     */
    bearer?: "account" | "subaccount";
}

/**
 * Initialize a transaction with Paystack.
 *
 * NOT a server action on purpose: callers (checkout.ts) compute the amount on
 * the server. Exposing this to the browser would let anyone choose their own
 * price.
 */
export async function initializeTransaction(options: InitializeOptions) {
    if (!PAYSTACK_SECRET_KEY) {
        return { data: null, error: "PAYSTACK_SECRET_KEY is not defined in environment variables" };
    }

    try {
        const body: Record<string, unknown> = {
            email: options.email,
            amount: options.amount,
            reference: options.reference,
            metadata: options.metadata,
            callback_url: options.callbackUrl,
        };
        if (options.subaccount) {
            body.subaccount = options.subaccount;
            body.bearer = options.bearer ?? "account";
            if (options.transactionCharge && options.transactionCharge > 0) {
                body.transaction_charge = Math.round(options.transactionCharge);
            }
        }

        const res = await fetch(`${PAYSTACK_API_BASE}/transaction/initialize`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });

        const data = await res.json();
        if (!data.status) {
            return { data: null, error: data.message || "Failed to initialize Paystack transaction" };
        }

        return { data: data.data, error: null }; // { authorization_url, access_code, reference }
    } catch (err: any) {
        return { data: null, error: err.message || "Network error" };
    }
}

/**
 * Verify a transaction with Paystack
 */
export async function verifyTransaction(reference: string) {
    if (!PAYSTACK_SECRET_KEY) {
        throw new Error("PAYSTACK_SECRET_KEY is not defined");
    }

    const res = await fetch(`${PAYSTACK_API_BASE}/transaction/verify/${reference}`, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
            "Content-Type": "application/json",
        },
    });

    const data = await res.json();
    if (!data.status) {
        throw new Error(data.message || "Failed to verify Paystack transaction");
    }

    return data.data; // Includes status, amount, metadata, etc.
}
