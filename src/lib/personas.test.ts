import { describe, expect, it } from "vitest";
import { HAT_LABEL, PERSONAS, personaForModel } from "./personas";
import type { ModelKey } from "./types";

const KEYS: ModelKey[] = [
  "nemotron-ultra",
  "laguna",
  "nemotron-super",
  "inkling",
  "nemotron-nano-omni",
];

describe("persona swarm", () => {
  it("assigns a persona to every routed model", () => {
    for (const key of KEYS) {
      expect(PERSONAS[key]).toBeDefined();
      expect(PERSONAS[key].name.length).toBeGreaterThan(2);
      expect(PERSONAS[key].role.length).toBeGreaterThan(2);
    }
  });

  it("gives every role its own distinct hat", () => {
    const hats = KEYS.map((k) => PERSONAS[k].hat);
    expect(new Set(hats).size).toBe(hats.length);
    for (const hat of hats) expect(HAT_LABEL[hat]).toBeTruthy();
  });

  it("casts the right specialist per pipeline responsibility", () => {
    expect(personaForModel("laguna").role).toMatch(/Developer/i);
    expect(personaForModel("nemotron-nano-omni").role).toMatch(/QA|Tester/i);
    expect(personaForModel("inkling").role).toMatch(/Designer|Copywriter/i);
  });
});
