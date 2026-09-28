import { db } from "@/db";
import { routeStats } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { buildProviders, ProviderError, stripImages, type LLMProvider } from "./llm";
import { modelFromRegistry, visionModels } from "./registry";
import { providerLabel, type CredentialSet } from "./settings";
import type {
  ChatMessage,
  GenEvent,
  ModelKey,
  Registry,
  RouteRef,
} from "./types";
import { truncate } from "./utils";

export const MAX_ATTEMPTS = 3;
export const CIRCUIT_FAILURE_THRESHOLD = 3;
export const CIRCUIT_OPEN_MS = 60_000;
export const BACKOFF_SCHEDULE_MS = [1_000, 2_000, 4_000];

export class AllRoutesFailedError extends Error {
  constructor(
    message: string,
    public readonly causes: string[],
  ) {
    super(message);
    this.name = "AllRoutesFailedError";
  }
}

export interface RouteStatRow {
  provider: string;
  modelId: string;
  modelKey: string;
  displayName: string;
  attempts: number;
  successes: number;
  failures: number;
  consecutiveFailures: number;
  circuitOpenUntil: Date | null;
  totalLatencyMs: number;
  lastOutcome: string | null;
}

export interface RouterContext {
  registry: Registry;
  creds: CredentialSet;
  emit?: (ev: GenEvent) => void;
  signal?: AbortSignal;
  stageIndex?: number;
}

export interface RouteOutcome {
  text: string;
  route: RouteRef;
  latencyMs: number;
  attempts: number;
  via: "llm" | "ensemble" | "local-fallback";
  ensembleWinner?: "A" | "B";
}

/* ------------------------- telemetry / leaderboard ------------------------ */

export async function loadAllStats(): Promise<RouteStatRow[]> {
  const rows = await db.select().from(routeStats);
  return rows.map((r) => ({
    provider: r.provider,
    modelId: r.modelId,
    modelKey: r.modelKey,
    displayName: r.displayName,
    attempts: r.attempts,
    successes: r.successes,
    failures: r.failures,
    consecutiveFailures: r.consecutiveFailures,
    circuitOpenUntil: r.circuitOpenUntil,
    totalLatencyMs: r.totalLatencyMs,
    lastOutcome: r.lastOutcome,
  }));
}

export function successRate(s: { attempts: number; successes: number }): number {
  return s.attempts === 0 ? 0.5 : s.successes / s.attempts;
}

export function avgLatency(s: { successes: number; totalLatencyMs: number }): number {
  return s.successes === 0 ? 0 : Math.round(s.totalLatencyMs / s.successes);
}

/** Leaderboard score: success-rate dominant, latency as tie-breaker. */
export function leaderboardScore(s: { attempts: number; successes: number; totalLatencyMs: number }): number {
  if (s.attempts === 0) return 50;
  return Math.round(successRate(s) * 100) - Math.min(25, avgLatency(s) / 1000);
}

function circuitOpen(s: RouteStatRow | undefined): boolean {
  return Boolean(s?.circuitOpenUntil && s.circuitOpenUntil.getTime() > Date.now());
}

export async function recordOutcome(
  route: RouteRef,
  ok: boolean,
  latencyMs: number,
): Promise<void> {
  const values = {
    provider: route.provider,
    modelId: route.modelId,
    modelKey: route.modelKey,
    displayName: route.modelName,
    attempts: 1,
    successes: ok ? 1 : 0,
    failures: ok ? 0 : 1,
    consecutiveFailures: ok ? 0 : 1,
    totalLatencyMs: latencyMs,
    lastOutcome: ok ? "success" : "failure",
    circuitOpenUntil: null,
    updatedAt: new Date(),
  };
  await db
    .insert(routeStats)
    .values(values)
    .onConflictDoUpdate({
      target: [routeStats.provider, routeStats.modelId],
      set: {
        attempts: sql`${routeStats.attempts} + 1`,
        successes: sql`${routeStats.successes} + ${ok ? 1 : 0}`,
        failures: sql`${routeStats.failures} + ${ok ? 0 : 1}`,
        consecutiveFailures: ok ? sql`0` : sql`${routeStats.consecutiveFailures} + 1`,
        totalLatencyMs: sql`${routeStats.totalLatencyMs} + ${latencyMs}`,
        lastOutcome: ok ? "success" : "failure",
        updatedAt: new Date(),
      },
    });

  if (!ok) {
    // Circuit breaker: 3 consecutive failures → open for 60s.
    const row = await db.query.routeStats.findFirst({
      where: and(eq(routeStats.provider, route.provider), eq(routeStats.modelId, route.modelId)),
    });
    if (row && row.consecutiveFailures >= CIRCUIT_FAILURE_THRESHOLD) {
      await db
        .update(routeStats)
        .set({
          circuitOpenUntil: new Date(Date.now() + CIRCUIT_OPEN_MS),
          consecutiveFailures: 0,
        })
        .where(and(eq(routeStats.provider, route.provider), eq(routeStats.modelId, route.modelId)));
    }
  }
}

/* ------------------------------ route planning ---------------------------- */

function statFor(stats: RouteStatRow[], provider: string, modelId: string): RouteStatRow | undefined {
  return stats.find((s) => s.provider === provider && s.modelId === modelId);
}

/**
 * Expand a stage's preferred model chain into concrete (provider, model)
 * routes, ordered by adaptive leaderboard telemetry, skipping open circuits.
 */
export function planRoutes(
  chain: ModelKey[],
  registry: Registry,
  stats: RouteStatRow[],
  opts: { visionOnly: boolean },
): RouteRef[] {
  let modelKeys = chain.filter((k) => modelFromRegistry(registry, k));
  if (opts.visionOnly) {
    const visionKeys = new Set(visionModels(registry).map((m) => m.key));
    const restricted = modelKeys.filter((k) => visionKeys.has(k));
    modelKeys = restricted.length > 0 ? restricted : visionModels(registry).map((m) => m.key);
  }

  const refs: RouteRef[] = [];
  for (const key of modelKeys) {
    const def = modelFromRegistry(registry, key);
    if (!def) continue;
    const providerOrder = (["openrouter", "kilocode"] as const).slice().sort((a, b) => {
      const sa = statFor(stats, a, def.providers[a].modelId);
      const sb = statFor(stats, b, def.providers[b].modelId);
      // Closed circuits always sink to the bottom.
      const ca = circuitOpen(sa) ? 1 : 0;
      const cb = circuitOpen(sb) ? 1 : 0;
      if (ca !== cb) return ca - cb;
      const scoreDiff = leaderboardScore(sb ?? { attempts: 0, successes: 0, totalLatencyMs: 0 })
        - leaderboardScore(sa ?? { attempts: 0, successes: 0, totalLatencyMs: 0 });
      if (Math.abs(scoreDiff) > 1) return scoreDiff;
      const pa = registry.providerPreference.indexOf(a);
      const pb = registry.providerPreference.indexOf(b);
      return (pa === -1 ? 9 : pa) - (pb === -1 ? 9 : pb);
    });
    for (const provider of providerOrder) {
      refs.push({
        provider,
        modelKey: def.key,
        modelId: def.providers[provider].modelId,
        modelName: def.name,
      });
    }
  }
  return refs;
}

/* --------------------------------- routing -------------------------------- */

async function attemptRoute(
  route: RouteRef,
  provider: LLMProvider,
  params: {
    messages: ChatMessage[];
    vision: boolean;
    temperature: number;
    maxTokens: number;
    signal?: AbortSignal;
    onDelta?: (chunk: string) => void;
  },
): Promise<{ text: string; latencyMs: number }> {
  const started = Date.now();
  const text = await provider.complete({
    modelId: route.modelId,
    messages: params.vision ? params.messages : stripImages(params.messages),
    temperature: params.temperature,
    maxTokens: params.maxTokens,
    signal: params.signal,
    onDelta: params.onDelta,
  });
  if (!text.trim()) {
    throw new ProviderError("empty completion", 502, route.provider, route.modelId);
  }
  return { text, latencyMs: Date.now() - started };
}

export interface RouteChatRequest {
  chain: ModelKey[];
  messages: ChatMessage[];
  vision: boolean;
  temperature: number;
  maxTokens: number;
  ensemble: boolean;
  onDelta?: (chunk: string) => void;
}

/**
 * Dynamic routing with failover + exponential backoff.
 * Order: preferred model → same model on the other provider → next model in
 * the chain. Max 3 attempts total, backoff 1s → 2s → 4s. Vision inputs
 * restrict routing strictly to vision-capable models.
 */
export async function routeChat(ctx: RouterContext, req: RouteChatRequest): Promise<RouteOutcome> {
  const providers = buildProviders(ctx.creds);
  const stats = await loadAllStats();
  const visionOnly = req.vision;
  const candidates = planRoutes(req.chain, ctx.registry, stats, { visionOnly });
  if (candidates.length === 0) {
    throw new AllRoutesFailedError("no routes available in registry", []);
  }

  const openCandidates = candidates.filter((c) => {
    const s = statFor(stats, c.provider, c.modelId);
    return !circuitOpen(s) && providers[c.provider].available;
  });
  const usable = openCandidates.length > 0 ? openCandidates : candidates;
  if (openCandidates.length === 0) {
    const reasons = candidates
      .map((c) => {
        const s = statFor(stats, c.provider, c.modelId);
        const gated = circuitOpen(s)
          ? "circuit-open"
          : providers[c.provider].available
            ? "unknown-gate"
            : "no-api-key";
        return `${c.modelKey}@${c.provider}:${gated}`;
      })
      .join(" ");
    ctx.emit?.({
      type: "log",
      level: "warn",
      msg: `all routes gated (${reasons || "registry empty"}) — probing anyway (half-open)`,
      stage: ctx.stageIndex,
    });
  }

  if (req.ensemble && usable.length >= 2) {
    return runEnsemble(ctx, providers, usable, req);
  }

  const causes: string[] = [];
  let attempt = 0;
  for (const route of usable) {
    if (attempt >= MAX_ATTEMPTS) break;
    if (ctx.signal?.aborted) throw new AllRoutesFailedError("aborted", causes);
    attempt += 1;
    try {
      ctx.emit?.({
        type: "log",
        level: "route",
        msg: `→ attempt ${attempt}/${MAX_ATTEMPTS} · ${route.modelName} via ${providerLabel(route.provider)} [${route.modelId}]`,
        stage: ctx.stageIndex,
      });
      const { text, latencyMs } = await attemptRoute(route, providers[route.provider], req);
      await recordOutcome(route, true, latencyMs);
      ctx.emit?.({
        type: "log",
        level: "ok",
        msg: `✓ ${route.modelName} via ${providerLabel(route.provider)} responded in ${latencyMs}ms`,
        stage: ctx.stageIndex,
      });
      return { text, route, latencyMs, attempts: attempt, via: "llm" };
    } catch (err) {
      const latencyMs = err instanceof ProviderError ? 0 : 0;
      void latencyMs;
      const message = err instanceof Error ? err.message : String(err);
      causes.push(`${route.modelName}@${providerLabel(route.provider)}: ${truncate(message, 160)}`);
      await recordOutcome(route, false, 0);
      const retryable = !(err instanceof ProviderError) || err.retryable;
      ctx.emit?.({
        type: "log",
        level: "warn",
        msg: `✗ ${route.modelName}@${providerLabel(route.provider)} failed — ${truncate(message, 140)}${retryable ? "" : " (non-retryable)"}`,
        stage: ctx.stageIndex,
      });
      if (!retryable) continue;
      if (attempt < MAX_ATTEMPTS) {
        const delay = BACKOFF_SCHEDULE_MS[Math.min(attempt - 1, BACKOFF_SCHEDULE_MS.length - 1)];
        ctx.emit?.({
          type: "log",
          level: "info",
          msg: `↻ backoff ${delay / 1000}s before next route`,
          stage: ctx.stageIndex,
        });
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw new AllRoutesFailedError(`all ${attempt} route attempts failed`, causes);
}

/* ------------------------------ ensemble mode ----------------------------- */

async function runEnsemble(
  ctx: RouterContext,
  providers: Record<string, LLMProvider>,
  candidates: RouteRef[],
  req: RouteChatRequest,
): Promise<RouteOutcome> {
  const [a, b] = candidates;
  ctx.emit?.({
    type: "log",
    level: "route",
    msg: `⚖ ensemble mode — racing ${a.modelName}@${providerLabel(a.provider)} vs ${b.modelName}@${providerLabel(b.provider)}`,
    stage: ctx.stageIndex,
  });
  const started = Date.now();
  const single = (route: RouteRef) =>
    attemptRoute(route, providers[route.provider] as LLMProvider, {
      messages: req.messages,
      vision: req.vision,
      temperature: req.temperature,
      maxTokens: req.maxTokens,
      signal: ctx.signal,
    }).catch(async (err) => {
      await recordOutcome(route, false, 0);
      throw err;
    });

  const [ra, rb] = await Promise.allSettled([single(a), single(b)]);
  const textA = ra.status === "fulfilled" ? ra.value.text : "";
  const textB = rb.status === "fulfilled" ? rb.value.text : "";
  if (ra.status === "fulfilled") await recordOutcome(a, true, ra.value.latencyMs);
  if (rb.status === "fulfilled") await recordOutcome(b, true, rb.value.latencyMs);
  if (!textA && !textB) {
    throw new AllRoutesFailedError("ensemble: both routes failed", [
      ra.status === "rejected" ? String(ra.reason) : "",
      rb.status === "rejected" ? String(rb.reason) : "",
    ]);
  }
  if (!textA || !textB) {
    const winner = textA ? "A" : "B";
    const route = textA ? a : b;
    ctx.emit?.({
      type: "log",
      level: "warn",
      msg: `⚖ ensemble degraded — only candidate ${winner} returned output`,
      stage: ctx.stageIndex,
    });
    return {
      text: textA || textB,
      route,
      latencyMs: Date.now() - started,
      attempts: 2,
      via: "ensemble",
      ensembleWinner: winner,
    };
  }

  // Reasoning model judges the two outputs.
  let winner: "A" | "B" = textA.length >= textB.length ? "A" : "B";
  try {
    const judge = await routeChat(
      { ...ctx, stageIndex: ctx.stageIndex },
      {
        chain: ["nemotron-ultra", "nemotron-super"],
        vision: false,
        ensemble: false,
        temperature: 0,
        maxTokens: 20,
        messages: [
          {
            role: "system",
            content:
              "You are a strict judge in a website-build pipeline. Compare two candidate outputs for the same stage and pick the better one. Reply with exactly one character: A or B.",
          },
          {
            role: "user",
            content: `CANDIDATE A:\n${truncate(textA, 4000)}\n\nCANDIDATE B:\n${truncate(textB, 4000)}\n\nWhich candidate is more complete, accurate and higher quality? Reply only A or B.`,
          },
        ],
      },
    );
    const verdict = judge.text.trim().toUpperCase();
    if (verdict.startsWith("A")) winner = "A";
    else if (verdict.startsWith("B")) winner = "B";
    ctx.emit?.({
      type: "log",
      level: "ok",
      msg: `⚖ judge (${judge.route.modelName}) selected candidate ${winner}`,
      stage: ctx.stageIndex,
    });
  } catch {
    ctx.emit?.({
      type: "log",
      level: "warn",
      msg: `⚖ judge unavailable — heuristic selected candidate ${winner} (longer complete output)`,
      stage: ctx.stageIndex,
    });
  }

  return {
    text: winner === "A" ? textA : textB,
    route: winner === "A" ? a : b,
    latencyMs: Date.now() - started,
    attempts: 2,
    via: "ensemble",
    ensembleWinner: winner,
  };
}
