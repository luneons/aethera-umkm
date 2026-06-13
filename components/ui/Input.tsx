"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils/cn";

interface FieldWrapProps {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}

export function Field({ label, error, hint, required, children }: FieldWrapProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-[var(--color-text-secondary)]">
          {label}
          {required && <span className="text-[var(--color-danger)]"> *</span>}
        </label>
      )}
      {children}
      {error ? (
        <span className="text-xs text-[var(--color-danger)]">{error}</span>
      ) : hint ? (
        <span className="text-xs text-[var(--color-text-muted)]">{hint}</span>
      ) : null}
    </div>
  );
}

const baseInput =
  "w-full rounded-xl border bg-[var(--color-bg-secondary)] px-3.5 text-[var(--color-text-primary)] " +
  "placeholder:text-[var(--color-text-muted)] transition-colors " +
  "focus:outline-none focus:border-[var(--color-accent-gold)] focus:ring-1 focus:ring-[var(--color-accent-gold)]/40";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, ...props },
  ref
) {
  return (
    <input
      ref={ref}
      className={cn(
        baseInput,
        "h-11",
        invalid ? "border-[var(--color-danger)]" : "border-[var(--color-border)]",
        className
      )}
      {...props}
    />
  );
});

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ className, invalid, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        className={cn(
          baseInput,
          "py-2.5 min-h-[80px] resize-y",
          invalid ? "border-[var(--color-danger)]" : "border-[var(--color-border)]",
          className
        )}
        {...props}
      />
    );
  }
);

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, invalid, children, ...props },
  ref
) {
  return (
    <select
      ref={ref}
      className={cn(
        baseInput,
        "h-11 appearance-none bg-[var(--color-bg-secondary)]",
        invalid ? "border-[var(--color-danger)]" : "border-[var(--color-border)]",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
});
