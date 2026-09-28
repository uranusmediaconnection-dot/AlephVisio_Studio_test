import { db } from "@/db";
import { generations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { enforceCompliance, failingChecks, validateSite } from "./assemble";
import {
  fallbackBrief,
  fallbackContent,
  fallbackCopy,
  fallbackFiles,
  fallbackQa,
  fallbackSitemap,
  fallbackTokens,
  formValidationJs,
} from "./fallback";
import { buildStageMessages, STAGES } from "./prompts";
import { loadRegistry } from "./registry";
import { AllRoutesFailedError, routeChat, type RouterContext } from "./router";
import { resolveCredentials } from "./settings";
import type {
  BrandBrief,
  ContentKit,
  CopyKit,
  DesignTokens,
  GenEvent,
  PipelineArtifacts,
  ProjectRecord,
  QaReport,
  SiteFiles,
  SitemapItem,
  StageDescriptor,
} from "./types";
import { extractJson, parseFencedFiles, truncate } from "./utils";

export interface PipelineOptions {
  project: ProjectRecord;
  generationId: string;
  ensemble: boolean;
  emit: (ev: GenEvent) => void;
  signal?: AbortSignal;
}

const jsonStageFallbacks: Partial<
  Record<string, (project: ProjectRecord, artifacts: PipelineArtifacts) => unknown>
> = {
  brief: (p) => fallbackBrief(p),
  sitemap: () => fallbackSitemap(),
  copy: (p) => fallbackCopy(p),
  content: (p) => fallbackContent(p),
  tokens: (p) => fallbackTokens(p),
};

export async function runPipeline(opts: PipelineOptions): Promise<void> {
  const { project, generationId, ensemble, emit, signal } = opts;
  const artifacts: PipelineArtifacts = {};
  const transcript: Record<string, unknown>[] = [];
  const hasImages = Boolean(project.logo?.dataUrl) || (project.referenceImages?.length ?? 0) > 0;

  const registry = await loadRegistry();
  const creds = await resolveCredentials();
  const slug = project.domain ?? `${project.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.example`;

  const pushLog = (ev: GenEvent) => {
    transcript.push({ at: new Date().toISOString(), ...ev });
    emit(ev);
  };
  const routerBase: RouterContext = {
    registry,
    creds,
    signal,
    emit: (ev) => {
      if (ev.type === "log") pushLog(ev);
    },
  };

  pushLog({
    type: "log",
    level: "info",
    msg: `AlephVisio pipeline started for “${project.name}” · ensemble=${ensemble ? "on" : "off"} · vision inputs=${hasImages ? "yes (Nano Omni engaged)" : "none"}`,
  });

  await db
    .update(generations)
    .set({ status: "running", ensemble, updatedAt: new Date() })
    .where(eq(generations.id, generationId));

  try {
    for (const stage of STAGES) {
      if (signal?.aborted) throw new Error("generation aborted by client");
      const ctx: RouterContext = { ...routerBase, stageIndex: stage.index };
      pushLog({ type: "stage", index: stage.index, key: stage.key, status: "running", title: stage.title });
      pushLog({ type: "log", level: "info", msg: `━━ Stage ${stage.index}/8 · ${stage.title} · chain ${stage.chain.join(" → ")}`, stage: stage.index });

      try {
        if (stage.key === "validate") await runValidationStage(ctx, project, artifacts, pushLog, ensemble);
        else if (stage.key === "qa") await runQaStage(ctx, project, artifacts, pushLog, ensemble);
        else await runArtifactStage(ctx, stage, project, artifacts, hasImages, slug, pushLog, ensemble);
        pushLog({ type: "stage", index: stage.index, key: stage.key, status: "complete" });
      } catch (err) {
        if (signal?.aborted) throw err;
        // Belt-and-braces: even if a stage-level handler let an exhaustion
        // error escape, the deterministic engine keeps the build shippable.
        if (err instanceof AllRoutesFailedError && emergencyFallback(stage, project, artifacts, pushLog)) {
          pushLog({ type: "stage", index: stage.index, key: stage.key, status: "complete" });
        } else {
          pushLog({
            type: "log",
            level: "error",
            msg: `stage ${stage.key} failed: ${err instanceof Error ? truncate(err.message, 220) : String(err)}`,
            stage: stage.index,
          });
          pushLog({ type: "stage", index: stage.index, key: stage.key, status: "failed" });
          throw err;
        }
      }

      await db
        .update(generations)
        .set({ stageIndex: stage.index, stageKey: stage.key, updatedAt: new Date() })
        .where(eq(generations.id, generationId));
    }

    const files = artifacts.files!;
    const checks = validateSite(files, project);
    const report = { checks, qa: artifacts.qa ?? null };

    await db
      .update(generations)
      .set({
        status: "completed",
        files,
        report,
        log: transcript.slice(-600),
        updatedAt: new Date(),
      })
      .where(eq(generations.id, generationId));

    pushLog({
      type: "log",
      level: "ok",
      msg: `✔ build complete — ${checks.filter((c) => c.pass).length}/${checks.length} checks passed · ${(files.html.length / 1024).toFixed(1)} KB HTML · ${(files.css.length / 1024).toFixed(1)} KB CSS`,
    });
    pushLog({ type: "done", generationId, status: "completed" });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db
      .update(generations)
      .set({ status: "failed", error: truncate(message, 500), log: transcript.slice(-600), updatedAt: new Date() })
      .where(eq(generations.id, generationId));
    pushLog({ type: "log", level: "error", msg: `✖ pipeline failed: ${truncate(message, 260)}` });
    pushLog({ type: "done", generationId, status: "failed" });
  }
}

/* ------------------------------ stage runners ----------------------------- */

async function runArtifactStage(
  ctx: RouterContext,
  stage: StageDescriptor,
  project: ProjectRecord,
  artifacts: PipelineArtifacts,
  hasImages: boolean,
  slug: string,
  pushLog: (ev: GenEvent) => void,
  ensemble: boolean,
): Promise<void> {
  const messages = buildStageMessages(stage, { project, artifacts, hasImages, slug });
  const vision = hasImages; // vision auto-activation restricts routing to omni routes

  let text: string;
  try {
    const outcome = await routeChat(ctx, {
      chain: stage.chain,
      messages,
      vision,
      temperature: stage.temperature,
      maxTokens: stage.maxTokens,
      ensemble,
    });
    text = outcome.text;
    pushLog({
      type: "log",
      level: "route",
      msg: `→ Stage ${stage.index} · routed to ${outcome.route.modelName} via ${outcome.route.provider === "openrouter" ? "OpenRouter" : "Kilocode"} (${outcome.latencyMs}ms${outcome.via === "ensemble" ? `, ensemble winner ${outcome.ensembleWinner}` : ""})`,
      stage: stage.index,
    });
    pushLog({
      type: "routed",
      stage: stage.index,
      stageKey: stage.key,
      modelName: outcome.route.modelName,
      modelKey: outcome.route.modelKey,
      provider: outcome.route.provider,
      latencyMs: outcome.latencyMs,
      via: outcome.via,
    });
  } catch (err) {
    if (err instanceof AllRoutesFailedError) {
      pushLog({
        type: "log",
        level: "warn",
        msg: `⚠ all routes exhausted for ${stage.key} (${err.causes.join(" | ") || "no providers configured"}) — engaging local build engine`,
        stage: stage.index,
      });
      applyLocalFallback(stage, project, artifacts, pushLog);
      return;
    }
    throw err;
  }

  if (stage.key === "codegen") {
    const parsed = parseFencedFiles(text);
    if (parsed.html && parsed.css) {
      artifacts.files = {
        html: parsed.html,
        css: parsed.css,
        js: parsed.js ?? "",
      };
      pushLog({
        type: "artifact",
        stage: stage.key,
        summary: `code generated — ${(parsed.html.length / 1024).toFixed(1)} KB HTML, ${(parsed.css.length / 1024).toFixed(1)} KB CSS, ${((parsed.js ?? "").length / 1024).toFixed(1)} KB JS`,
      });
    } else {
      pushLog({
        type: "log",
        level: "warn",
        msg: `⚠ codegen output missing fenced html/css blocks — engaging local build engine`,
        stage: stage.index,
      });
      artifacts.files = fallbackFiles(project, artifacts);
    }
    return;
  }

  // JSON artifact stages
  const json = extractJson<Record<string, unknown>>(text);
  if (!json) {
    // one structured retry, then local engine
    try {
      const retry = await routeChat(ctx, {
        chain: stage.chain,
        messages: [...messages, { role: "assistant", content: truncate(text, 1500) }, {
          role: "user",
          content: "That output could not be parsed. Respond again with ONLY the exact JSON specified — no prose, no fences.",
        }],
        vision: false,
        temperature: Math.max(0.1, stage.temperature - 0.3),
        maxTokens: stage.maxTokens,
        ensemble: false,
      });
      const retried = extractJson<Record<string, unknown>>(retry.text);
      if (retried) {
        assignArtifact(stage, artifacts, retried);
        summarize(stage, artifacts, pushLog);
        return;
      }
    } catch {
      /* fall through to local engine */
    }
    pushLog({
      type: "log",
      level: "warn",
      msg: `⚠ ${stage.key} output unparsable — engaging local build engine for this artifact`,
      stage: stage.index,
    });
    applyLocalFallback(stage, project, artifacts, pushLog);
    return;
  }
  assignArtifact(stage, artifacts, json);
  summarize(stage, artifacts, pushLog);
}

function assignArtifact(stage: StageDescriptor, artifacts: PipelineArtifacts, json: Record<string, unknown>): void {
  switch (stage.key) {
    case "brief":
      artifacts.brief = json as unknown as BrandBrief;
      break;
    case "sitemap":
      artifacts.sitemap = (Array.isArray(json) ? json : (json as { sections?: SitemapItem[] }).sections ?? []) as SitemapItem[];
      break;
    case "copy":
      artifacts.copy = json as unknown as CopyKit;
      break;
    case "content":
      artifacts.content = json as unknown as ContentKit;
      break;
    case "tokens":
      artifacts.tokens = json as unknown as DesignTokens;
      break;
  }
}

function summarize(stage: StageDescriptor, artifacts: PipelineArtifacts, pushLog: (ev: GenEvent) => void): void {
  const a = artifacts;
  const map: Record<string, string> = {
    brief: a.brief ? `positioning: ${truncate(a.brief.positioning ?? "", 120)}` : "",
    sitemap: a.sitemap ? `${a.sitemap.length} sections: ${a.sitemap.map((s) => s.label ?? s.id).join(", ")}` : "",
    copy: a.copy ? `headline: “${a.copy.headline}”` : "",
    content: a.content
      ? `${a.content.services?.length ?? 0} services · ${a.content.testimonials?.length ?? 0} testimonials · ${a.content.gallery?.length ?? 0} gallery tiles · ${a.content.faq?.length ?? 0} FAQs`
      : "",
    tokens: a.tokens ? `palette ${a.tokens.primary} / ${a.tokens.accent} / ${a.tokens.bg} · radius ${a.tokens.radius}` : "",
  };
  if (map[stage.key]) pushLog({ type: "artifact", stage: stage.key, summary: map[stage.key] });
}

function applyLocalFallback(
  stage: StageDescriptor,
  project: ProjectRecord,
  artifacts: PipelineArtifacts,
  pushLog: (ev: GenEvent) => void,
): void {
  if (stage.key === "codegen") {
    artifacts.files = fallbackFiles(project, artifacts);
    pushLog({ type: "artifact", stage: stage.key, summary: "local build engine produced index.html + styles.css + script.js" });
    return;
  }
  const builder = jsonStageFallbacks[stage.key];
  if (!builder) return;
  const value = builder(project, artifacts) as Record<string, unknown>;
  assignArtifact(stage, artifacts, value);
  summarize(stage, artifacts, pushLog);
}

/**
 * Last-line safety net. Returns true when the stage was salvaged locally so
 * the pipeline can move on instead of failing the whole generation.
 */
function emergencyFallback(
  stage: StageDescriptor,
  project: ProjectRecord,
  artifacts: PipelineArtifacts,
  pushLog: (ev: GenEvent) => void,
): boolean {
  pushLog({
    type: "log",
    level: "warn",
    msg: `⚠ stage ${stage.key}: all LLM routes unavailable — local build engine engaged`,
    stage: stage.index,
  });
  if (stage.key === "codegen") {
    if (!artifacts.files) artifacts.files = fallbackFiles(project, artifacts);
    return true;
  }
  if (stage.key === "validate") {
    if (!artifacts.files) artifacts.files = fallbackFiles(project, artifacts);
    artifacts.files = enforceCompliance(artifacts.files, project);
    return true;
  }
  if (stage.key === "qa") {
    const qa = fallbackQa();
    artifacts.qa = qa;
    if (artifacts.files && qa.cssPatch) {
      artifacts.files = { ...artifacts.files, css: `${artifacts.files.css}\n${qa.cssPatch}` };
    }
    return true;
  }
  if (jsonStageFallbacks[stage.key]) {
    applyLocalFallback(stage, project, artifacts, pushLog);
    return true;
  }
  return false;
}

/* -------------------------- validation + QA stages ------------------------ */

async function runValidationStage(
  ctx: RouterContext,
  project: ProjectRecord,
  artifacts: PipelineArtifacts,
  pushLog: (ev: GenEvent) => void,
  ensemble: boolean,
): Promise<void> {
  if (!artifacts.files) artifacts.files = fallbackFiles(project, artifacts);
  // A site without its interaction layer never needs an LLM round-trip —
  // attach the deterministic vanilla-JS layer before validation runs.
  if (!artifacts.files.js || artifacts.files.js.trim().length < 50) {
    artifacts.files = { ...artifacts.files, js: formValidationJs() };
    pushLog({
      type: "log",
      level: "info",
      msg: "code arrived without script.js — deterministic interaction layer attached",
      stage: 7,
    });
  }
  const hasImages = false;

  let failures = failingChecks(artifacts.files, project);
  if (failures.length > 0) {
    pushLog({
      type: "log",
      level: "warn",
      msg: `validation found ${failures.length} issue(s): ${failures.join("; ")}`,
      stage: 7,
    });
    try {
      const stage = STAGES.find((s) => s.key === "validate")!;
      const messages = buildStageMessages(stage, { project, artifacts, hasImages, slug: project.domain ?? "" }, { failingChecks: failures, repairHtml: artifacts.files.html });
      const outcome = await routeChat(ctx, {
        chain: stage.chain,
        messages,
        vision: false,
        temperature: stage.temperature,
        maxTokens: stage.maxTokens,
        ensemble,
      });
      pushLog({
        type: "log",
        level: "route",
        msg: `→ Stage 7 · repair routed to ${outcome.route.modelName} via ${outcome.route.provider === "openrouter" ? "OpenRouter" : "Kilocode"} (${outcome.latencyMs}ms)`,
        stage: 7,
      });
      pushLog({
        type: "routed",
        stage: 7,
        stageKey: "validate",
        modelName: outcome.route.modelName,
        modelKey: outcome.route.modelKey,
        provider: outcome.route.provider,
        latencyMs: outcome.latencyMs,
        via: outcome.via,
      });
      const repaired = parseFencedFiles(outcome.text);
      if (repaired.html && repaired.css) {
        const candidate = { html: repaired.html, css: repaired.css, js: repaired.js ?? artifacts.files.js };
        const candidateFailures = failingChecks(candidate, project);
        // Only accept a repair that is strictly better than what we have.
        if (candidateFailures.length <= failures.length) {
          artifacts.files = candidate;
          failures = candidateFailures;
          pushLog({
            type: "log",
            level: failures.length ? "warn" : "ok",
            msg: failures.length ? `repair pass left ${failures.length} issue(s): ${failures.join("; ")}` : "repair pass resolved every failing check",
            stage: 7,
          });
        } else {
          pushLog({
            type: "log",
            level: "warn",
            msg: `repair reply regressed the site (${candidateFailures.length} > ${failures.length} issues) — keeping previous build`,
            stage: 7,
          });
        }
      } else {
        pushLog({ type: "log", level: "warn", msg: "repair reply had no fenced blocks — applying deterministic patches", stage: 7 });
      }
    } catch (err) {
      if (err instanceof AllRoutesFailedError) {
        pushLog({ type: "log", level: "warn", msg: "⚠ validation routes unavailable — applying deterministic patches", stage: 7 });
      } else {
        throw err;
      }
    }
  } else {
    pushLog({ type: "log", level: "ok", msg: "static validation passed on first inspection", stage: 7 });
  }

  // Deterministic safety net — the shipped artifact must satisfy the spec.
  artifacts.files = enforceCompliance(artifacts.files, project);
  const finalFailures = failingChecks(artifacts.files, project);
  if (finalFailures.length > 0) {
    pushLog({ type: "log", level: "warn", msg: `compliance enforcement could not fix: ${finalFailures.join("; ")}`, stage: 7 });
  }
  const checks = validateSite(artifacts.files, project);
  pushLog({
    type: "artifact",
    stage: "validate",
    summary: `${checks.filter((c) => c.pass).length}/${checks.length} compliance checks green`,
  });
}

async function runQaStage(
  ctx: RouterContext,
  project: ProjectRecord,
  artifacts: PipelineArtifacts,
  pushLog: (ev: GenEvent) => void,
  ensemble: boolean,
): Promise<void> {
  const files = artifacts.files ?? fallbackFiles(project, artifacts);
  const stage = STAGES.find((s) => s.key === "qa")!;

  let qa: QaReport | null = null;
  try {
    const messages = buildStageMessages(stage, {
      project,
      artifacts: { ...artifacts, files },
      hasImages: false,
      slug: project.domain ?? "",
    });
    const outcome = await routeChat(ctx, {
      chain: stage.chain,
      messages,
      vision: false,
      temperature: stage.temperature,
      maxTokens: stage.maxTokens,
      ensemble,
    });
    pushLog({
      type: "log",
      level: "route",
      msg: `→ Stage 8 · routed to ${outcome.route.modelName} via ${outcome.route.provider === "openrouter" ? "OpenRouter" : "Kilocode"} (${outcome.latencyMs}ms)`,
      stage: 8,
    });
    pushLog({
      type: "routed",
      stage: 8,
      stageKey: "qa",
      modelName: outcome.route.modelName,
      modelKey: outcome.route.modelKey,
      provider: outcome.route.provider,
      latencyMs: outcome.latencyMs,
      via: outcome.via,
    });
    const parsed = extractJson<QaReport>(outcome.text);
    if (parsed && typeof parsed.score === "number") qa = parsed;
  } catch (err) {
    if (!(err instanceof AllRoutesFailedError)) throw err;
    pushLog({ type: "log", level: "warn", msg: "⚠ QA routes unavailable — applying deterministic polish patch", stage: 8 });
  }

  if (!qa) qa = fallbackQa();
  artifacts.qa = qa;

  if (qa.cssPatch?.trim()) {
    artifacts.files = {
      ...files,
      css: `${files.css}\n/* ── Visual QA patch (score ${qa.score}/100) ── */\n${qa.cssPatch}`,
    };
  }
  pushLog({
    type: "artifact",
    stage: "qa",
    summary: `score ${qa.score}/100 · ${qa.issues.length ? qa.issues.join("; ") : "no layout issues"} · CSS patch ${qa.cssPatch?.trim() ? "applied" : "not needed"}`,
  });
  pushLog({
    type: "log",
    level: "ok",
    msg: `visual QA verdict: ${qa.score}/100${qa.issues.length ? ` — ${qa.issues.join("; ")}` : ""}`,
    stage: 8,
  });
}
