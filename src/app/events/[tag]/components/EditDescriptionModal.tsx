"use client";

import React, { useState, useEffect } from "react";
import { Loader2, Save, AlertCircle, Bold, Italic, List, ListOrdered } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Modal, ModalButton } from "@/app/components/ui/Modal";

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
                placeholder: 'Describe your event...',
            }),
        ],
        content: initialValue,
        editorProps: {
            attributes: {
                class: 'prose prose-sm focus:outline-none min-h-[200px] max-h-[400px] overflow-y-auto px-1 py-2 text-gray-900 font-medium prose-p:my-3 prose-p:leading-normal prose-headings:font-black prose-headings:tracking-tight prose-ul:list-disc prose-ol:list-decimal prose-li:ml-4',
            },
        },
        immediatelyRender: false,
    });

    useEffect(() => {
        if (isOpen && editor) {
            editor.commands.setContent(initialValue);
            setError(null);
        }
    }, [isOpen, initialValue, editor]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editor) return;

        setIsSubmitting(true);
        setError(null);

        const html = editor.getHTML();
        const isEmpty = editor.getText().trim() === "" && !html.includes("<img");
        const finalValue = isEmpty ? "" : html;

        try {
            const { error: updateError } = await supabase
                .from("events")
                .update({ description: finalValue })
                .eq("id", eventId);

            if (updateError) throw updateError;

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
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Edit Description"
            subtitle="Tell people what your event is about."
            size="lg"
            footer={
                <>
                    <ModalButton variant="secondary" onClick={onClose}>Cancel</ModalButton>
                    <ModalButton
                        variant="primary"
                        onClick={(e) => handleSubmit(e as any)}
                        loading={isSubmitting}
                        loadingText="Saving..."
                    >
                        <Save className="w-4 h-4" /> Save Description
                    </ModalButton>
                </>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="bg-gray-50 rounded-xl border border-gray-200 p-3 focus-within:bg-white focus-within:border-[var(--brand-blue)] focus-within:ring-2 focus-within:ring-[var(--brand-blue)]/20 transition-all">
                    {editor && <Toolbar editor={editor} />}
                    <EditorContent editor={editor} className="overflow-y-auto" />
                </div>
                {error && (
                    <div className="flex items-center gap-2 text-red-600">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span className="text-xs font-bold">{error}</span>
                    </div>
                )}
            </form>
        </Modal>
    );
}

function MenuButton({ onClick, isActive, icon: Icon, label }: { onClick: () => void, isActive: boolean, icon: any, label: string }) {
    return (
        <button
            type="button"
            onClick={onClick}
            title={label}
            className={`p-2 rounded-lg transition-all ${isActive
                ? 'bg-gray-900 text-white shadow-sm'
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
        <div className="flex items-center gap-1 pb-2.5 mb-2.5 border-b border-gray-200 overflow-x-auto">
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
            <div className="w-[1px] h-4 bg-gray-200 mx-1.5" />
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
