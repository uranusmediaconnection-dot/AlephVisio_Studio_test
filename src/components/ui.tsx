"use client";

import { create } from "zustand";
import { CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

/* --------------------------------- Button --------------------------------- */

type ButtonVariant = "primary" | "outline" | "ghost" | "danger" | "ruby";

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  const styles: Record<ButtonVariant, string> = {
    primary:
      "bg-teal-500 text-white shadow-[0_6px_18px_-6px_rgb(74_144_226/0.65)] hover:bg-teal-400 disabled:hover:bg-teal-500",
    outline: "border border-ink-600 bg-white text-mist-100 hover:border-teal-500 hover:text-teal-300",
    ghost: "text-mist-300 hover:bg-ink-800 hover:text-mist-100",
    danger: "border border-ember-400/50 text-ember-400 hover:bg-ember-400/10",
    ruby: "bg-ruby-300 text-white shadow-[0_6px_18px_-6px_rgb(154_52_101/0.6)] hover:bg-ruby-400",
  };
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50",
        styles[variant],
        className,
      )}
      {...props}
    />
  );
}

/* ---------------------------------- Card ---------------------------------- */

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-ink-700 bg-ink-850 shadow-[0_2px_16px_-4px_rgb(46_46_46/0.08)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

/* ------------------------------ Form controls ----------------------------- */

export function Label({ children, htmlFor, className }: { children: ReactNode; htmlFor?: string; className?: string }) {
  return (
    <label htmlFor={htmlFor} className={cn("mb-1.5 block text-[13px] font-bold text-mist-100", className)}>
      {children}
    </label>
  );
}

const fieldClasses =
  "w-full rounded-lg border border-ink-600 bg-white px-3 py-2 text-sm text-mist-100 placeholder:text-mist-500 transition focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/25";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldClasses, className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(fieldClasses, "min-h-20", className)} {...props} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(fieldClasses, "appearance-none", className)} {...props}>
      {children}
    </select>
  );
}

/* ---------------------------------- Badge --------------------------------- */

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: "neutral" | "ok" | "warn" | "error" | "teal" | "ruby";
  children: ReactNode;
  className?: string;
}) {
  const tones = {
    neutral: "bg-ink-800 text-mist-300 border border-ink-700",
    ok: "bg-forest-600/40 text-forest-300",
    warn: "bg-ruby-600/40 text-ruby-300",
    error: "bg-ember-400/10 text-ember-400",
    teal: "bg-teal-600/35 text-teal-300",
    ruby: "bg-ruby-600/40 text-ruby-300",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* --------------------------------- Spinner -------------------------------- */

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn("size-4 animate-spin", className)} viewBox="0 0 24 24" fill="none" aria-label="Loading">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/* ---------------------------------- Toasts -------------------------------- */

interface Toast {
  id: number;
  kind: "ok" | "error" | "info";
  msg: string;
}

interface ToastStore {
  toasts: Toast[];
  push: (kind: Toast["kind"], msg: string) => void;
  dismiss: (id: number) => void;
}

let toastId = 0;

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  push: (kind, msg) => {
    const id = ++toastId;
    set((s) => ({ toasts: [...s.toasts.slice(-3), { id, kind, msg }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 4200);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export function toast(kind: Toast["kind"], msg: string) {
  useToastStore.getState().push(kind, msg);
}

export function Toaster() {
  const { toasts, dismiss } = useToastStore();
  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-50 flex w-80 flex-col gap-2" aria-live="polite">
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => dismiss(t.id)}
          className={cn(
            "pointer-events-auto flex items-start gap-2 rounded-lg border bg-white px-3 py-2.5 text-left text-[13px] font-semibold shadow-[0_10px_30px_-8px_rgb(46_46_46/0.25)]",
            t.kind === "ok" && "border-forest-500/50 text-mist-100",
            t.kind === "error" && "border-ember-400/50 text-mist-100",
            t.kind === "info" && "border-ink-600 text-mist-100",
          )}
        >
          {t.kind === "ok" ? (
            <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-forest-300" />
          ) : t.kind === "error" ? (
            <XCircle size={16} className="mt-0.5 shrink-0 text-ember-400" />
          ) : (
            <Info size={16} className="mt-0.5 shrink-0 text-teal-400" />
          )}
          <span>{t.msg}</span>
        </button>
      ))}
    </div>
  );
}
