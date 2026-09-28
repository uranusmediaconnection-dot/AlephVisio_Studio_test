"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { BarChart3, LayoutGrid, Plus, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Logo({ size = 30 }: { size?: number }) {
  return (
    <span className="relative inline-flex" aria-hidden="true">
      <span className="absolute -inset-[2px] rounded-[10px] bg-teal-500/30 blur-[3px]" />
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className="relative">
        <rect x="1" y="1" width="30" height="30" rx="8" fill="#4A90E2" />
        <path
          d="M10 22.5 16 9.5l6 13M12.4 18h7.2"
          stroke="#FFFFFF"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "AlephVisio Studio";

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-ink-700 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-6 px-4 sm:px-6">
          <Link href="/" className="group flex items-center gap-3">
            <Logo />
            <span className="font-display text-[15px] font-semibold tracking-tight text-mist-100">
              {appName.replace(" Studio", "")}
              <span className="text-teal-300"> Studio</span>
            </span>
          </Link>

          <nav className="ml-auto flex items-center gap-1" aria-label="Primary">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "relative flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-semibold transition-colors",
                    active ? "bg-teal-500/10 text-teal-300" : "text-mist-300 hover:bg-ink-800 hover:text-mist-100",
                  )}
                >
                  <Icon size={15} strokeWidth={2.2} />
                  <span className="hidden sm:inline">{label}</span>
                  {active && (
                    <span className="absolute inset-x-3 -bottom-[13px] h-0.5 rounded-full bg-teal-500" />
                  )}
                </Link>
              );
            })}
            <Link
              href="/wizard"
              className="ml-2 flex items-center gap-1.5 rounded-lg bg-teal-500 px-4 py-2 text-[13px] font-bold text-white shadow-[0_6px_18px_-6px_rgb(74_144_226/0.7)] transition hover:bg-teal-400"
            >
              <Plus size={15} strokeWidth={2.6} />
              New project
            </Link>
          </nav>
        </div>
        <div className="shimmer-line h-px w-full opacity-30" />
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">{children}</main>

      <footer className="border-t border-ink-700 py-6">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-2 px-4 text-xs text-mist-500 sm:px-6">
          <span>{appName} — ensemble-routed AI website generation</span>
          <span className="flex items-center gap-3 font-mono">
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-teal-500" /> 10 routes
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-ruby-400" /> 2 providers
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-forest-400" /> 8 stages
            </span>
          </span>
        </div>
      </footer>
    </div>
  );
}
