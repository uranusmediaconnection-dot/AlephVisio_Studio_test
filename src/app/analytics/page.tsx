"use client";

import { useQuery } from "@tanstack/react-query";
import { Activity, CircuitBoard, Eye, Gauge, Trophy } from "lucide-react";
import { Badge, Card, Spinner } from "@/components/ui";
import { cn } from "@/lib/utils";

interface RouteRow {
  rank?: number;
  modelKey: string;
  modelName: string;
  role: string;
  vision: boolean;
  provider: "openrouter" | "kilocode";
  modelId: string;
  configured: boolean;
  attempts: number;
  successes: number;
  failures: number;
  successRate: number | null;
  avgLatencyMs: number | null;
  score: number | null;
  circuitOpen: boolean;
  circuitOpenUntil: string | null;
  consecutiveFailures: number;
  lastOutcome: string | null;
}

interface StatsPayload {
  routes: RouteRow[];
  leaderboard: RouteRow[];
  totals: { attempts: number; successes: number; openCircuits: number };
}

export default function AnalyticsPage() {
  const { data, isLoading } = useQuery<StatsPayload>({
    queryKey: ["stats"],
    queryFn: async () => (await fetch("/api/stats")).json(),
    refetchInterval: 10_000,
  });

  if (isLoading || !data) {
    return (
      <div className="flex items-center gap-3 py-20 text-mist-300">
        <Spinner /> Loading route telemetry…
      </div>
    );
  }

  const overallRate = data.totals.attempts ? Math.round((data.totals.successes / data.totals.attempts) * 100) : null;
  const maxScore = Math.max(1, ...data.leaderboard.map((r) => r.score ?? 0));

  return (
    <div>
      <h1 className="font-display text-2xl font-bold tracking-tight">Model analytics</h1>
      <p className="mt-1 text-sm text-mist-300">
        Adaptive leaderboard — every routed call updates per-route success rate and latency, which reorders future
        routing decisions. 3 consecutive failures open a circuit for 60 seconds.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={<Gauge size={16} />} label="Total attempts" value={String(data.totals.attempts)} />
        <StatCard icon={<Activity size={16} />} label="Successes" value={String(data.totals.successes)} />
        <StatCard
          icon={<Trophy size={16} />}
          label="Overall success rate"
          value={overallRate === null ? "—" : `${overallRate}%`}
        />
        <StatCard
          icon={<CircuitBoard size={16} />}
          label="Open circuits"
          value={String(data.totals.openCircuits)}
          tone={data.totals.openCircuits > 0 ? "warn" : "ok"}
        />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        {/* Leaderboard */}
        <Card className="p-5">
          <h2 className="mb-3 flex items-center gap-2 font-display text-base font-bold">
            <Trophy size={16} className="text-teal-400" /> Leaderboard
          </h2>
          {data.leaderboard.length === 0 ? (
            <p className="py-8 text-center text-sm text-mist-500">No routed calls yet — run a build to collect telemetry.</p>
          ) : (
            <ol className="space-y-3">
              {data.leaderboard.map((r) => (
                <li key={`${r.provider}:${r.modelId}`}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-semibold">
                      <span className="mr-1.5 font-mono text-mist-500">#{r.rank}</span>
                      {r.modelName}
                      <span className="ml-1.5 text-xs text-mist-500">@{r.provider}</span>
                    </span>
                    <span className="font-mono text-xs text-teal-400">{r.score ?? 0} pts</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-ink-700">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-teal-500 via-ruby-400 to-forest-400"
                      style={{ width: `${Math.max(4, ((r.score ?? 0) / maxScore) * 100)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Card>

        {/* Route table */}
        <Card className="overflow-hidden">
          <h2 className="border-b border-ink-700 px-5 py-4 font-display text-base font-bold">All 10 routes</h2>
          <div className="slim-scroll max-h-[520px] overflow-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-ink-850 text-[10px] uppercase tracking-wider text-mist-500">
                <tr>
                  <th className="px-4 py-2.5">Model</th>
                  <th className="px-2 py-2.5">Provider</th>
                  <th className="px-2 py-2.5 text-right">Att.</th>
                  <th className="px-2 py-2.5 text-right">Succ%</th>
                  <th className="px-2 py-2.5 text-right">Latency</th>
                  <th className="px-4 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.routes.map((r) => (
                  <tr key={`${r.provider}:${r.modelId}`} className="border-t border-ink-800">
                    <td className="px-4 py-2.5">
                      <span className="font-bold text-mist-100">{r.modelName}</span>
                      <span className="ml-1.5 text-mist-500">{r.role}</span>
                      {r.vision && <Eye size={11} className="ml-1 inline text-teal-400" />}
                      <span className="block font-mono text-[10px] text-mist-500">{r.modelId}</span>
                    </td>
                    <td className={cn("px-2 py-2.5 font-mono", r.provider === "openrouter" ? "text-teal-300" : "text-ruby-300")}>
                      {r.provider}
                    </td>
                    <td className="px-2 py-2.5 text-right font-mono">{r.attempts}</td>
                    <td className="px-2 py-2.5 text-right font-mono">{r.successRate === null ? "—" : `${r.successRate}%`}</td>
                    <td className="px-2 py-2.5 text-right font-mono">{r.avgLatencyMs === null ? "—" : `${r.avgLatencyMs}ms`}</td>
                    <td className="px-4 py-2.5">
                      {!r.configured ? (
                        <Badge tone="neutral">no key</Badge>
                      ) : r.circuitOpen ? (
                        <Badge tone="error">circuit open</Badge>
                      ) : r.consecutiveFailures > 0 ? (
                        <Badge tone="warn">{r.consecutiveFailures} fail</Badge>
                      ) : r.lastOutcome === "success" ? (
                        <Badge tone="ok">healthy</Badge>
                      ) : (
                        <Badge tone="neutral">idle</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone?: "ok" | "warn" }) {
  return (
    <Card className="p-4">
      <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-mist-500">
        {icon} {label}
      </p>
      <p className={cn("mt-1 font-display text-2xl font-bold", tone === "warn" ? "text-ruby-300" : tone === "ok" ? "text-forest-400" : "text-mist-100")}>
        {value}
      </p>
    </Card>
  );
}
