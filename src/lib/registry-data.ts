import type { ModelDef, ModelKey, Registry } from "./types";

/**
 * Default Model JSON Registry — pure data, importable from client components.
 * 5 branded models served across 2 providers (OpenRouter + Kilocode) = 10 routes.
 * Slugs are editable at runtime from Settings without a redeploy.
 */
export const DEFAULT_REGISTRY: Registry = {
  version: 1,
  providerPreference: ["openrouter", "kilocode"],
  models: [
    {
      key: "nemotron-ultra",
      name: "Nemotron Ultra",
      role: "flagship",
      description: "Flagship reasoning model — brand briefs, sitemaps, design tokens, ensemble judging.",
      vision: false,
      providers: {
        openrouter: { modelId: "nvidia/nemotron-3-ultra-550b-a55b:free" },
        kilocode: { modelId: "nvidia/nemotron-3-ultra-550b-a55b:free" },
      },
    },
    {
      key: "laguna",
      name: "Laguna",
      role: "code",
      description: "Poolside's code-specialist model — owns the HTML/CSS/JS generation stage.",
      vision: false,
      providers: {
        openrouter: { modelId: "poolside/laguna-s-2.1:free" },
        kilocode: { modelId: "poolside/laguna-s-2.1:free" },
      },
    },
    {
      key: "nemotron-super",
      name: "Nemotron Super",
      role: "balanced",
      description: "Balanced workhorse — content generation and universal fallback.",
      vision: false,
      providers: {
        openrouter: { modelId: "nvidia/nemotron-3-super-120b-a12b:free" },
        kilocode: { modelId: "nvidia/nemotron-3-super-120b-a12b:free" },
      },
    },
    {
      key: "inkling",
      name: "Inkling",
      role: "creative",
      description: "Thinking Machines' creative voice model — copywriting, tone, storytelling.",
      vision: false,
      providers: {
        openrouter: { modelId: "thinkingmachines/inkling:free" },
        kilocode: { modelId: "thinkingmachines/inkling-small:free" },
      },
    },
    {
      key: "nemotron-nano-omni",
      name: "Nemotron Nano Omni",
      role: "fast-omni",
      description: "Fast multimodal model — the only vision-capable route (validation + visual QA).",
      vision: true,
      providers: {
        openrouter: { modelId: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free" },
        kilocode: { modelId: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free" },
      },
    },
  ],
};

export function isValidRegistry(value: unknown): value is Registry {
  if (!value || typeof value !== "object") return false;
  const r = value as Registry;
  if (!Array.isArray(r.models) || r.models.length === 0) return false;
  const keys = new Set<string>();
  for (const m of r.models) {
    if (!m?.key || !m?.name || !m?.providers) return false;
    if (!m.providers.openrouter?.modelId || !m.providers.kilocode?.modelId) return false;
    if (keys.has(m.key)) return false;
    keys.add(m.key);
  }
  return true;
}

export function modelFromRegistry(registry: Registry, key: ModelKey): ModelDef | undefined {
  return registry.models.find((m) => m.key === key);
}

export function visionModels(registry: Registry): ModelDef[] {
  return registry.models.filter((m) => m.vision);
}
