import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Shell } from "@/components/shell";
import { Toaster } from "@/components/ui";

const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "AlephVisio Studio";

export const metadata: Metadata = {
  title: {
    default: `${appName} — Ensemble-routed AI website builder`,
    template: `%s · ${appName}`,
  },
  description:
    "A rotating ensemble of AI models — routed across 10 live routes with failover, circuit breaking and an adaptive leaderboard — designs, writes, codes and QA-checks a complete business website in real time.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Manrope:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap"
          rel="stylesheet"
        />
        <link
          rel="icon"
          href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect x='1' y='1' width='30' height='30' rx='8' fill='%23004D61'/%3E%3Cpath d='M10 22.5 16 9.5l6 13M12.4 18h7.2' stroke='%23F0F0F0' stroke-width='2.4' stroke-linecap='round' fill='none'/%3E%3C/svg%3E"
        />
      </head>
      <body className="bg-ink-900 font-body text-mist-100 antialiased">
        <Providers>
          <Shell>{children}</Shell>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
