"use client";

import React, { useEffect, useState } from "react";
import { AlertCircle, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { Modal, ModalButton } from "@/app/components/ui/Modal";
import { Input } from "@/app/components/ui/Input";
import type { EventDeletePreview } from "@/lib/eventDelete";
import { deleteEventAction, previewDeleteEventAction } from "./actions";

interface Props {
    event: { id: string; event_title: string } | null;
    onClose: () => void;
    onDeleted: (eventId: string) => void;
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export function DeleteEventModal({ event, onClose, onDeleted }: Props) {
    const [preview, setPreview] = useState<EventDeletePreview | null>(null);
    const [typed, setTyped] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const eventId = event?.id ?? null;
    useEffect(() => {
        setPreview(null);
        setTyped("");
        setError(null);
        if (!eventId) return;
        let cancelled = false;
        (async () => {
            const { data } = await supabase.auth.getSession();
            const token = data.session?.access_token;
            if (!token) return !cancelled && setError("Please log in again.");
            const r = await previewDeleteEventAction({ eventId, accessToken: token });
            if (cancelled) return;
            if (r.ok) setPreview(r.preview);
            else setError(r.error);
        })();
        return () => {
            cancelled = true;
        };
    }, [eventId]);

    const needsName = !!preview?.needsTypedConfirmation;
    const nameMatches = !needsName || typed.trim() === preview!.title.trim();

    const confirm = async () => {
        if (!event || !preview) return;
        setBusy(true);
        setError(null);
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (!token) {
            setBusy(false);
            return setError("Please log in again.");
        }
        const r = await deleteEventAction({ eventId: event.id, accessToken: token, confirmTitle: typed });
        setBusy(false);
        if (r.ok) onDeleted(event.id);
        else setError(r.error);
    };

    return (
        <Modal
            isOpen={!!event}
            onClose={busy ? () => {} : onClose}
            title="Delete event"
            subtitle={event ? `“${event.event_title}” will be removed for good.` : undefined}
            size="md"
            footer={
                <>
                    <ModalButton variant="secondary" onClick={onClose} disabled={busy}>Cancel</ModalButton>
                    <ModalButton variant="danger" onClick={confirm} disabled={!preview || !nameMatches} loading={busy} loadingText="Deleting…">
                        Delete forever
                    </ModalButton>
                </>
            }
        >
            <div className="space-y-4">
                {!preview && !error && <div className="text-sm font-bold text-gray-400">Checking what is inside…</div>}

                {preview && (
                    <>
                        <p className="text-sm font-bold text-gray-600">
                            This permanently deletes the event page and everything attached to it: {plural(preview.tickets, "ticket type")},{" "}
                            {plural(preview.guests, "guest")}, {plural(preview.orders, "order")} and {plural(preview.questions, "form question")}.
                            This cannot be undone.
                        </p>

                        {preview.isPublished && (
                            <div role="note" className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">
                                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                                <span>This event is published. Its public link will stop working immediately.</span>
                            </div>
                        )}

                        {preview.completedOrders > 0 && (
                            <div role="note" className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">
                                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                                <span>
                                    {plural(preview.completedOrders, "order")} {preview.completedOrders === 1 ? "is" : "are"} completed and may be real payments.
                                    Deleting the event does <u>not</u> refund anyone. Refund in Paystack first if needed.
                                </span>
                            </div>
                        )}

                        {needsName && (
                            <Input
                                label="Type the event's exact name to confirm"
                                hint={preview.title}
                                value={typed}
                                onChange={(e) => setTyped(e.target.value)}
                                autoComplete="off"
                            />
                        )}
                    </>
                )}

                {error && (
                    <div role="alert" className="flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 p-4">
                        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                        <p className="text-sm font-bold text-red-600">{error}</p>
                    </div>
                )}
            </div>
        </Modal>
    );
}
