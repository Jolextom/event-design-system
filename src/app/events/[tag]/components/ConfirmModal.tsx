"use client";

import React from "react";
import { AlertTriangle, CheckCircle } from "lucide-react";
import { Modal, ModalButton } from "@/app/components/ui/Modal";

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    isDestructive?: boolean;
}

export function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    isDestructive = false,
}: ConfirmModalProps) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="sm"
        >
            <div className="flex flex-col items-center text-center gap-4 py-2">
                {/* Icon */}
                <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isDestructive
                            ? "bg-red-50 text-red-500"
                            : "bg-blue-50 text-blue-500"
                        }`}
                >
                    {isDestructive ? (
                        <AlertTriangle className="w-7 h-7" />
                    ) : (
                        <CheckCircle className="w-7 h-7" />
                    )}
                </div>

                {/* Text */}
                <div>
                    <h3 className="text-lg font-black text-gray-900 tracking-tight mb-1.5">
                        {title}
                    </h3>
                    <p className="text-sm text-gray-500 font-medium leading-relaxed max-w-xs mx-auto">
                        {description}
                    </p>
                </div>

                {/* Buttons */}
                <div className="flex items-center gap-3 w-full pt-2">
                    <ModalButton
                        variant="secondary"
                        onClick={onClose}
                        className="flex-1 justify-center"
                    >
                        {cancelLabel}
                    </ModalButton>
                    <ModalButton
                        variant={isDestructive ? "danger" : "primary"}
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className="flex-1 justify-center"
                    >
                        {confirmLabel}
                    </ModalButton>
                </div>
            </div>
        </Modal>
    );
}
