import React, { useState, useEffect } from 'react';
import { X, Loader2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { renderEmailFromParams, EmailTemplateType } from '@/lib/email-templates';
import { cn } from '@/lib/utils';

// Helper to sanitize/prepare HTML for iframe
// In a real app we might want to use DOMPurify if we were accepting arbitrary HTML,
// but here we are rendering our own templates so it's safer.
const prepareHtmlForIframe = (html: string) => {
    return html;
};

interface EmailPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    templateType: string | null;
    templateParams: any | null;
}

export function EmailPreviewModal({
    isOpen,
    onClose,
    templateType,
    templateParams
}: EmailPreviewModalProps) {
    const [htmlContent, setHtmlContent] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && templateType && templateParams) {
            try {
                const html = renderEmailFromParams(
                    templateType as EmailTemplateType,
                    templateParams
                );

                if (html) {
                    setHtmlContent(html);
                    setError(null);
                } else {
                    setError(`Unknown template type: ${templateType}`);
                }
            } catch (err) {
                console.error("Failed to render email:", err);
                setError("Failed to render email preview.");
            }
        }
    }, [isOpen, templateType, templateParams]);

    // Close on escape key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
                    >
                        {/* Modal */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl h-[85vh] flex flex-col overflow-hidden"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
                                <div>
                                    <h3 className="text-xl font-black text-gray-900 tracking-tight">Email Preview</h3>
                                    <p className="text-sm font-medium text-gray-500">
                                        Viewing {templateType || 'unknown'} email
                                    </p>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400 hover:text-gray-900"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="flex-1 bg-gray-100 flex items-center justify-center p-4 md:p-8 overflow-hidden">
                                {error ? (
                                    <div className="bg-white p-8 rounded-2xl shadow-sm text-center max-w-sm mx-auto">
                                        <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center text-red-500 mx-auto mb-4">
                                            <AlertCircle className="w-6 h-6" />
                                        </div>
                                        <h4 className="text-lg font-bold text-gray-900 mb-2">Preview Unavailable</h4>
                                        <p className="text-gray-500 text-sm mb-6">{error}</p>
                                        <button
                                            onClick={onClose}
                                            className="px-4 py-2 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-black transition-colors"
                                        >
                                            Close Preview
                                        </button>
                                    </div>
                                ) : htmlContent ? (
                                    <div className="w-full h-full bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
                                        <iframe
                                            srcDoc={prepareHtmlForIframe(htmlContent)}
                                            title="Email Preview"
                                            className="w-full h-full"
                                            style={{ border: 'none' }}
                                        />
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-3 text-gray-400">
                                        <Loader2 className="w-8 h-8 animate-spin" />
                                        <span className="text-sm font-bold">Rendering preview...</span>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
