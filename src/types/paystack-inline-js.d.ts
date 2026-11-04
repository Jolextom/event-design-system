// @paystack/inline-js ships no type definitions. Only the part we use is described here.
declare module "@paystack/inline-js" {
    export interface PaystackCallbacks {
        onLoad?: (data: { id: number; customer: unknown; accessCode: string }) => void;
        onSuccess?: (data: { id: number; reference: string; message: string }) => void;
        onCancel?: () => void;
        onError?: (error: { message: string }) => void;
    }
    export default class PaystackPop {
        constructor();
        resumeTransaction(accessCode: string, callbacks?: PaystackCallbacks): unknown;
    }
}
