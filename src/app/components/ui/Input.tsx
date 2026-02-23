import React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    hint?: string;
    error?: string;
    iconLeft?: React.ReactNode;
    containerClassName?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ label, hint, error, iconLeft, containerClassName, className, id, ...props }, ref) => {
        const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

        return (
            <div className={cn("space-y-1.5", containerClassName)}>
                {label && (
                    <label
                        htmlFor={inputId}
                        className="block text-[9px] font-black uppercase tracking-[0.25em] text-gray-500"
                    >
                        {label}
                    </label>
                )}
                <div className="relative">
                    {iconLeft && (
                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                            {iconLeft}
                        </div>
                    )}
                    <input
                        ref={ref}
                        id={inputId}
                        className={cn(
                            "w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-900",
                            "placeholder:text-gray-400",
                            "focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)]/20 focus:border-[var(--brand-blue)]",
                            "transition-all duration-150",
                            "disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-gray-50",
                            error && "border-red-300 focus:ring-red-200 focus:border-red-400",
                            iconLeft && "pl-10",
                            className
                        )}
                        {...props}
                    />
                </div>
                {hint && !error && (
                    <p className="text-[10px] text-gray-400 font-medium">{hint}</p>
                )}
                {error && (
                    <p className="text-[10px] text-red-500 font-semibold">{error}</p>
                )}
            </div>
        );
    }
);

Input.displayName = "Input";


export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    hint?: string;
    error?: string;
    containerClassName?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ label, hint, error, containerClassName, className, id, rows = 4, ...props }, ref) => {
        const textareaId = id || label?.toLowerCase().replace(/\s+/g, "-");

        return (
            <div className={cn("space-y-1.5", containerClassName)}>
                {label && (
                    <label
                        htmlFor={textareaId}
                        className="block text-[9px] font-black uppercase tracking-[0.25em] text-gray-500"
                    >
                        {label}
                    </label>
                )}
                <textarea
                    ref={ref}
                    id={textareaId}
                    rows={rows}
                    className={cn(
                        "w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-900",
                        "placeholder:text-gray-400",
                        "focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)]/20 focus:border-[var(--brand-blue)]",
                        "transition-all duration-150 resize-none",
                        "disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-gray-50",
                        error && "border-red-300 focus:ring-red-200 focus:border-red-400",
                        className
                    )}
                    {...props}
                />
                {hint && !error && (
                    <p className="text-[10px] text-gray-400 font-medium">{hint}</p>
                )}
                {error && (
                    <p className="text-[10px] text-red-500 font-semibold">{error}</p>
                )}
            </div>
        );
    }
);

Textarea.displayName = "Textarea";
