"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Save, AlertCircle, Bold, Italic, List, ListOrdered } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';

interface EditDescriptionModalProps {
    isOpen: boolean;
    onClose: () => void;
    eventId: string;
    initialValue: string;
    onUpdate: (newValue: string) => void;
}

export function EditDescriptionModal({ isOpen, onClose, eventId, initialValue, onUpdate }: EditDescriptionModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const editor = useEditor({
        extensions: [
            StarterKit,
            Placeholder.configure({
                placeholder: 'Describe your event... (Press "/" for commands)',
            }),
        ],
        content: initialValue,
        editorProps: {
            attributes: {
                class: 'prose prose-sm sm:prose-base lg:prose-lg xl:prose-2xl focus:outline-none min-h-[200px] max-h-[400px] overflow-y-auto px-1 py-2 text-gray-900 font-medium prose-p:my-3 prose-p:leading-normal prose-headings:font-black prose-headings:tracking-tight prose-ul:list-disc prose-ol:list-decimal prose-li:ml-4',
            },
        },
        immediatelyRender: false,
    });

    useEffect(() => {
        if (isOpen && editor) {
            editor.commands.setContent(initialValue);
        }
    }, [isOpen, initialValue, editor]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editor) return;

        setIsSubmitting(true);
        setError(null);

        // Get HTML content
        const html = editor.getHTML();
        // Check if empty (sometimes returns <p></p>)
        const isEmpty = editor.getText().trim() === "" && !html.includes("<img");
        const finalValue = isEmpty ? "" : html;

        try {
            const { error: updateError } = await supabase
                .from("events")
                .update({ description: finalValue })
                .eq("id", eventId);

            if (updateError) throw updateError;

            // Critical: Optimistic update
            onUpdate(finalValue);
            onClose();
        } catch (err: any) {
            console.error("Error updating event:", err);
            setError(err.message || "Failed to update description");
        } finally {
            setIsSubmitting(false);
        }
    };



    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98, y: 10 }}
                        className="relative w-full max-w-[600px] bg-white rounded-[24px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                    >
                        <div className="p-5 pb-0">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-black text-gray-900 tracking-tight">Edit Description</h3>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="p-2 -mr-2 hover:bg-gray-50 rounded-full transition-colors text-gray-400 hover:text-gray-900"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="flex-1 flex flex-col px-5 pb-5 min-h-0">
                            <div className="flex-1 min-h-0 bg-gray-50/50 rounded-xl p-3 flex flex-col focus-within:bg-white transition-all">
                                {editor && <Toolbar editor={editor} />}
                                <EditorContent editor={editor} className="flex-1 overflow-y-auto custom-scrollbar" />
                            </div>

                            {error && (
                                <div className="flex items-center gap-2 text-red-600 animate-in fade-in slide-in-from-top-1 mt-4">
                                    <AlertCircle className="w-4 h-4" />
                                    <span className="text-xs font-bold">{error}</span>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-4 mt-5 bg-black text-white rounded-xl text-xs font-black uppercase tracking-widest hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2 shadow-xl shadow-gray-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none bg-gray-900 flex-shrink-0"
                            >
                                {isSubmitting ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <>
                                        <Save className="w-4 h-4" /> Save Description
                                    </>
                                )}
                            </button>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

function MenuButton({ onClick, isActive, icon: Icon, label }: { onClick: () => void, isActive: boolean, icon: any, label: string }) {
    return (
        <button
            type="button"
            onClick={onClick}
            title={label}
            className={`p-2 rounded-lg transition-all ${(isActive)
                ? 'bg-black text-white shadow-md'
                : 'text-gray-400 hover:bg-gray-100 hover:text-gray-900'
                }`}
        >
            <Icon className="w-4 h-4" />
        </button>
    );
}

function Toolbar({ editor }: { editor: any }) {
    if (!editor) return null;

    return (
        <div className="flex items-center gap-1 pb-3 mb-3 border-b border-gray-100 overflow-x-auto">
            <MenuButton
                onClick={() => editor.chain().focus().toggleBold().run()}
                isActive={editor.isActive('bold')}
                icon={Bold}
                label="Bold"
            />
            <MenuButton
                onClick={() => editor.chain().focus().toggleItalic().run()}
                isActive={editor.isActive('italic')}
                icon={Italic}
                label="Italic"
            />
            <div className="w-[1px] h-4 bg-gray-200 mx-2" />
            <MenuButton
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                isActive={editor.isActive('bulletList')}
                icon={List}
                label="Bullet List"
            />
            <MenuButton
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                isActive={editor.isActive('orderedList')}
                icon={ListOrdered}
                label="Numbered List"
            />
        </div>
    );
}
