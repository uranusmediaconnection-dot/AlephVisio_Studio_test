import { avgLatency, leaderboardScore, loadAllStats, successRate } from "@/lib/router";
import { loadRegistry } from "@/lib/registry";
import { resolveCredentials } from "@/lib/settings";

export const dynamic = "force-dynamic";

/** GET — adaptive leaderboard: per-route telemetry across all 10 routes. */
export async function GET() {
  const [stats, registry, creds] = await Promise.all([loadAllStats(), loadRegistry(), resolveCredentials()]);

  const routes = registry.models.flatMap((model) =>
    (Object.keys(model.providers) as Array<"openrouter" | "kilocode">).map((provider) => {
      const stat = stats.find((s) => s.provider === provider && s.modelId === model.providers[provider].modelId);
      const circuitOpen = Boolean(stat?.circuitOpenUntil && stat.circuitOpenUntil.getTime() > Date.now());
      return {
        modelKey: model.key,
        modelName: model.name,
        role: model.role,
        vision: model.vision,
        provider,
        modelId: model.providers[provider].modelId,
        configured: provider === "openrouter" ? Boolean(creds.openrouter) : Boolean(creds.kilocode),
        attempts: stat?.attempts ?? 0,
        successes: stat?.successes ?? 0,
        failures: stat?.failures ?? 0,
        successRate: stat ? Math.round(successRate(stat) * 100) : null,
        avgLatencyMs: stat ? avgLatency(stat) : null,
        score: stat ? leaderboardScore(stat) : null,
        circuitOpen,
        circuitOpenUntil: circuitOpen ? stat!.circuitOpenUntil : null,
        consecutiveFailures: stat?.consecutiveFailures ?? 0,
        lastOutcome: stat?.lastOutcome ?? null,
      };
    }),
  );

  const leaderboard = routes
    .filter((r) => r.attempts > 0)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .map((r, i) => ({ rank: i + 1, ...r }));

  const totals = {
    attempts: routes.reduce((s, r) => s + r.attempts, 0),
    successes: routes.reduce((s, r) => s + r.successes, 0),
    openCircuits: routes.filter((r) => r.circuitOpen).length,
  };

  return Response.json({ routes, leaderboard, totals });
}
