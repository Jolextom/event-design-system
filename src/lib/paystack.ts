export const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || "";

interface InitializeOptions {
    email: string;
    amount: number;
    reference: string;
    metadata?: any;
    callbackUrl?: string;
}

/**
 * Initialize a transaction with Paystack
 */
export async function initializeTransaction(options: InitializeOptions) {
    if (!PAYSTACK_SECRET_KEY) {
        return { data: null, error: "PAYSTACK_SECRET_KEY is not defined in environment variables" };
    }

    try {
        const res = await fetch("https://api.paystack.co/transaction/initialize", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                email: options.email,
                amount: options.amount,
                reference: options.reference,
                metadata: options.metadata,
                callback_url: options.callbackUrl,
            }),
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

    const res = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
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
