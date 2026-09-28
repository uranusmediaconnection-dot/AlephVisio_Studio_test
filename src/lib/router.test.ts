import { describe, expect, it } from "vitest";
import { DEFAULT_REGISTRY } from "./registry";
import {
  avgLatency,
  BACKOFF_SCHEDULE_MS,
  CIRCUIT_FAILURE_THRESHOLD,
  CIRCUIT_OPEN_MS,
  leaderboardScore,
  MAX_ATTEMPTS,
  planRoutes,
  successRate,
  type RouteStatRow,
} from "./router";

function stat(overrides: Partial<RouteStatRow>): RouteStatRow {
  return {
    provider: "openrouter",
    modelId: "x",
    modelKey: "nemotron-ultra",
    displayName: "Nemotron Ultra",
    attempts: 0,
    successes: 0,
    failures: 0,
    consecutiveFailures: 0,
    circuitOpenUntil: null,
    totalLatencyMs: 0,
    lastOutcome: null,
    ...overrides,
  };
}

describe("router constants match the spec", () => {
  it("max 3 attempts with 1s → 2s → 4s backoff", () => {
    expect(MAX_ATTEMPTS).toBe(3);
    expect(BACKOFF_SCHEDULE_MS).toEqual([1000, 2000, 4000]);
  });

  it("circuit opens after 3 consecutive failures for 60s", () => {
    expect(CIRCUIT_FAILURE_THRESHOLD).toBe(3);
    expect(CIRCUIT_OPEN_MS).toBe(60_000);
  });
});

describe("telemetry math", () => {
  it("successRate defaults to neutral 0.5 with no data", () => {
    expect(successRate({ attempts: 0, successes: 0 })).toBe(0.5);
    expect(successRate({ attempts: 4, successes: 3 })).toBe(0.75);
  });

  it("avgLatency averages over successful calls only", () => {
    expect(avgLatency({ successes: 0, totalLatencyMs: 999 })).toBe(0);
    expect(avgLatency({ successes: 2, totalLatencyMs: 3000 })).toBe(1500);
  });

  it("leaderboardScore rewards success rate and punishes latency", () => {
    const fast = leaderboardScore({ attempts: 10, successes: 10, totalLatencyMs: 10_000 });
    const slow = leaderboardScore({ attempts: 10, successes: 10, totalLatencyMs: 60_000 });
    const flaky = leaderboardScore({ attempts: 10, successes: 4, totalLatencyMs: 10_000 });
    expect(fast).toBeGreaterThan(slow);
    expect(fast).toBeGreaterThan(flaky);
  });
});

describe("planRoutes", () => {
  const ultraId = DEFAULT_REGISTRY.models.find((m) => m.key === "nemotron-ultra")!;

  it("honours the stage chain order and default provider preference", () => {
    const refs = planRoutes(["nemotron-ultra", "nemotron-super"], DEFAULT_REGISTRY, [], { visionOnly: false });
    expect(refs.map((r) => `${r.modelKey}@${r.provider}`)).toEqual([
      "nemotron-ultra@openrouter",
      "nemotron-ultra@kilocode",
      "nemotron-super@openrouter",
      "nemotron-super@kilocode",
    ]);
  });

  it("ranks the healthier provider first using telemetry", () => {
    const stats: RouteStatRow[] = [
      stat({ provider: "openrouter", modelId: ultraId.providers.openrouter.modelId, attempts: 5, successes: 0, failures: 5 }),
      stat({ provider: "kilocode", modelId: ultraId.providers.kilocode.modelId, attempts: 5, successes: 5, totalLatencyMs: 20_000 }),
    ];
    const refs = planRoutes(["nemotron-ultra"], DEFAULT_REGISTRY, stats, { visionOnly: false });
    expect(refs[0].provider).toBe("kilocode");
  });

  it("sinks open circuits to the bottom", () => {
    const stats: RouteStatRow[] = [
      stat({
        provider: "openrouter",
        modelId: ultraId.providers.openrouter.modelId,
        attempts: 9,
        successes: 9,
        totalLatencyMs: 9000,
        circuitOpenUntil: new Date(Date.now() + 30_000),
      }),
      stat({ provider: "kilocode", modelId: ultraId.providers.kilocode.modelId, attempts: 1, successes: 0, failures: 1 }),
    ];
    const refs = planRoutes(["nemotron-ultra"], DEFAULT_REGISTRY, stats, { visionOnly: false });
    expect(refs[0].provider).toBe("kilocode");
  });

  it("vision auto-activation restricts routing strictly to vision-capable models", () => {
    const refs = planRoutes(["inkling", "nemotron-super"], DEFAULT_REGISTRY, [], { visionOnly: true });
    expect(refs.length).toBeGreaterThan(0);
    for (const r of refs) expect(r.modelKey).toBe("nemotron-nano-omni");
  });

  it("keeps vision models when the chain already contains one", () => {
    const refs = planRoutes(["nemotron-nano-omni", "nemotron-super"], DEFAULT_REGISTRY, [], { visionOnly: true });
    expect(refs.every((r) => r.modelKey === "nemotron-nano-omni")).toBe(true);
  });
});
