import type { ModelKey } from "./types";

/**
 * The Swarm — every routed model appears to the client as an IT specialist.
 * Each role wears its own hat so routing decisions are instantly readable:
 * top hat = architect, cap = developer, fedora = strategist,
 * beret = designer, hard hat = QA/tester.
 */

export type HatKind = "top" | "cap" | "fedora" | "beret" | "hardhat";

export interface Persona {
  name: string;
  role: string;
  hat: HatKind;
  specialty: string;
  modelKey: ModelKey;
}

export const PERSONAS: Record<ModelKey, Persona> = {
  "nemotron-ultra": {
    name: "Nova Reyes",
    role: "Principal Architect",
    hat: "top",
    specialty: "Brand briefs, sitemaps, design tokens — and judging ensemble duels.",
    modelKey: "nemotron-ultra",
  },
  laguna: {
    name: "Rio Laguna",
    role: "Full-Stack Developer",
    hat: "cap",
    specialty: "Writes the entire HTML / CSS / JS build in one clean pass.",
    modelKey: "laguna",
  },
  "nemotron-super": {
    name: "Sage Whitmore",
    role: "Content Strategist",
    hat: "fedora",
    specialty: "Service blocks, testimonials, FAQs — the universal backup specialist.",
    modelKey: "nemotron-super",
  },
  inkling: {
    name: "Indigo Marsh",
    role: "Brand Designer · Copywriter",
    hat: "beret",
    specialty: "Headlines, voice and tone — the words that make the site feel human.",
    modelKey: "inkling",
  },
  "nemotron-nano-omni": {
    name: "Quin Vale",
    role: "QA Engineer · Tester",
    hat: "hardhat",
    specialty: "Runs the validation loop and the visual QA critique with vision.",
    modelKey: "nemotron-nano-omni",
  },
};

export function personaForModel(key: ModelKey): Persona {
  return PERSONAS[key] ?? PERSONAS["nemotron-super"];
}

export const HAT_LABEL: Record<HatKind, string> = {
  top: "Top hat",
  cap: "Dev cap",
  fedora: "Fedora",
  beret: "Beret",
  hardhat: "Hard hat",
};
