/* Shared domain types for the Model Router Engine and generation pipeline. */

export type ProviderKey = "openrouter" | "kilocode";

export type ModelKey =
  | "nemotron-ultra"
  | "laguna"
  | "nemotron-super"
  | "inkling"
  | "nemotron-nano-omni";

export interface ProviderModelRef {
  /** Provider-specific model slug sent on the wire. */
  modelId: string;
}

export interface ModelDef {
  key: ModelKey;
  name: string;
  role: "flagship" | "code" | "balanced" | "creative" | "fast-omni";
  description: string;
  vision: boolean;
  providers: Record<ProviderKey, ProviderModelRef>;
}

export interface Registry {
  version: number;
  models: ModelDef[];
  /** Default provider preference when telemetry is tied. */
  providerPreference: ProviderKey[];
}

export interface RouteRef {
  provider: ProviderKey;
  modelKey: ModelKey;
  modelId: string;
  modelName: string;
}

export type ChatRole = "system" | "user" | "assistant";

export interface VisionContentPart {
  type: "text" | "image_url";
  text?: string;
  image_url?: { url: string };
}

export interface ChatMessage {
  role: ChatRole;
  content: string | VisionContentPart[];
}

/* ------------------------------- Artifacts ------------------------------- */

export interface BrandBrief {
  positioning: string;
  audience: string;
  tone: string[];
  promises: string[];
  keywords: string[];
}

export interface SitemapItem {
  id: string;
  label: string;
  purpose: string;
}

export interface CopyKit {
  tagline: string;
  headline: string;
  subheadline: string;
  ctaPrimary: string;
  ctaSecondary: string;
  voice: string;
}

export interface ServiceItem {
  title: string;
  desc: string;
  icon: string;
}
export interface TestimonialItem {
  quote: string;
  name: string;
  role: string;
}
export interface FaqItem {
  q: string;
  a: string;
}

export interface ContentKit {
  about: string;
  services: ServiceItem[];
  testimonials: TestimonialItem[];
  gallery: { caption: string }[];
  faq: FaqItem[];
}

export interface DesignTokens {
  primary: string;
  primaryInk: string;
  accent: string;
  bg: string;
  surface: string;
  text: string;
  muted: string;
  fontDisplay: string;
  fontBody: string;
  radius: string;
}

export interface SiteFiles {
  html: string;
  css: string;
  js: string;
}

export interface QaReport {
  score: number;
  issues: string[];
  cssPatch: string;
}

export interface PipelineArtifacts {
  brief?: BrandBrief;
  sitemap?: SitemapItem[];
  copy?: CopyKit;
  content?: ContentKit;
  tokens?: DesignTokens;
  files?: SiteFiles;
  qa?: QaReport;
}

/* ------------------------------ SSE protocol ----------------------------- */

export type LogLevel = "info" | "route" | "ok" | "warn" | "error" | "token";

export interface StageDescriptor {
  index: number;
  key: string;
  title: string;
  chain: ModelKey[];
  usesVision: boolean;
  json: boolean;
  temperature: number;
  maxTokens: number;
}

export type GenEvent =
  | { type: "stage"; index: number; key: string; status: "running" | "complete" | "failed"; title?: string }
  | { type: "log"; level: LogLevel; msg: string; stage?: number }
  | { type: "artifact"; stage: string; summary: string }
  | { type: "routed"; stage: number; stageKey: string; modelName: string; modelKey: string; provider: string; latencyMs: number; via: string }
  | { type: "done"; generationId: string; status: "completed" | "failed" }
  | { type: "heartbeat" };

export interface ProjectInput {
  name: string;
  industry: string;
  phone: string;
  address: string;
  notes?: string;
  logo?: { mime: string; dataUrl: string } | null;
  referenceImages?: { mime: string; dataUrl: string }[];
  domain?: string | null;
}

export interface ProjectRecord extends Required<Omit<ProjectInput, "notes" | "logo" | "domain">> {
  id: string;
  notes: string;
  logo: { mime: string; dataUrl: string } | null;
  domain: string | null;
  createdAt: string;
  updatedAt: string;
}
