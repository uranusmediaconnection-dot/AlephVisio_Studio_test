import { describe, expect, it } from "vitest";
import { DEFAULT_REGISTRY, isValidRegistry, modelFromRegistry, visionModels } from "./registry";

describe("DEFAULT_REGISTRY", () => {
  it("ships exactly 5 branded models", () => {
    expect(DEFAULT_REGISTRY.models).toHaveLength(5);
    expect(DEFAULT_REGISTRY.models.map((m) => m.key).sort()).toEqual(
      ["inkling", "laguna", "nemotron-nano-omni", "nemotron-super", "nemotron-ultra"].sort(),
    );
  });

  it("gives every model both providers = 10 routes", () => {
    let routes = 0;
    for (const m of DEFAULT_REGISTRY.models) {
      expect(m.providers.openrouter.modelId).toBeTruthy();
      expect(m.providers.kilocode.modelId).toBeTruthy();
      routes += 2;
    }
    expect(routes).toBe(10);
  });

  it("marks exactly one model as vision-capable (Nano Omni)", () => {
    const vision = visionModels(DEFAULT_REGISTRY);
    expect(vision).toHaveLength(1);
    expect(vision[0].key).toBe("nemotron-nano-omni");
  });

  it("uses free-tier slugs so zero-credit accounts can build", () => {
    for (const m of DEFAULT_REGISTRY.models) {
      expect(m.providers.kilocode.modelId.endsWith(":free")).toBe(true);
      expect(m.providers.openrouter.modelId.endsWith(":free")).toBe(true);
    }
  });
});

describe("isValidRegistry", () => {
  it("accepts the default registry", () => {
    expect(isValidRegistry(DEFAULT_REGISTRY)).toBe(true);
  });

  it("rejects registries with missing providers", () => {
    const broken = structuredClone(DEFAULT_REGISTRY);
    // @ts-expect-error deliberate sabotage for validation testing
    delete broken.models[0].providers.kilocode;
    expect(isValidRegistry(broken)).toBe(false);
  });

  it("rejects duplicate model keys", () => {
    const broken = structuredClone(DEFAULT_REGISTRY);
    broken.models.push({ ...broken.models[0] });
    expect(isValidRegistry(broken)).toBe(false);
  });

  it("rejects non-objects", () => {
    expect(isValidRegistry(null)).toBe(false);
    expect(isValidRegistry("hi")).toBe(false);
    expect(isValidRegistry({ models: [] })).toBe(false);
  });
});

describe("modelFromRegistry", () => {
  it("finds known models and returns undefined for unknown keys", () => {
    expect(modelFromRegistry(DEFAULT_REGISTRY, "laguna")?.name).toBe("Laguna");
    expect(modelFromRegistry(DEFAULT_REGISTRY, "ghost-model" as never)).toBeUndefined();
  });
});
