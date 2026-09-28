import {
  pgTable,
  uuid,
  text,
  integer,
  bigint,
  boolean,
  timestamp,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/** A business on-boarded through the Intake Wizard. */
export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  industry: text("industry").notNull(),
  phone: text("phone").notNull(),
  address: text("address").notNull(),
  notes: text("notes").notNull().default(""),
  /** Uploaded logo as { mime, dataUrl } — null when not provided. */
  logo: jsonb("logo").$type<{ mime: string; dataUrl: string } | null>(),
  /** Optional reference images for vision routing: [{ mime, dataUrl }]. */
  referenceImages: jsonb("reference_images")
    .$type<{ mime: string; dataUrl: string }[]>()
    .notNull()
    .default([]),
  domain: text("domain"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** One end-to-end run of the 8-stage generation pipeline. */
export const generations = pgTable("generations", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("queued"), // queued | running | completed | failed
  stageIndex: integer("stage_index").notNull().default(0),
  stageKey: text("stage_key"),
  ensemble: boolean("ensemble").notNull().default(false),
  /** Final deliverable: { html, css, js }. */
  files: jsonb("files").$type<{ html: string; css: string; js: string } | null>(),
  /** Full router console transcript (audit trail of every routing decision). */
  log: jsonb("log").$type<Record<string, unknown>[]>().notNull().default([]),
  /** Quality report from validation + visual QA. */
  report: jsonb("report").$type<{ checks: { name: string; pass: boolean }[]; qa: unknown } | null>(),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Adaptive leaderboard telemetry per (provider, modelId) route. */
export const routeStats = pgTable(
  "route_stats",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => `${crypto.randomUUID()}`),
    provider: text("provider").notNull(), // openrouter | kilocode
    modelId: text("model_id").notNull(), // provider-specific slug
    modelKey: text("model_key").notNull(), // branded model key
    displayName: text("display_name").notNull(),
    attempts: integer("attempts").notNull().default(0),
    successes: integer("successes").notNull().default(0),
    failures: integer("failures").notNull().default(0),
    consecutiveFailures: integer("consecutive_failures").notNull().default(0),
    circuitOpenUntil: timestamp("circuit_open_until", { withTimezone: true }),
    totalLatencyMs: bigint("total_latency_ms", { mode: "number" }).notNull().default(0),
    lastOutcome: text("last_outcome"), // success | failure
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("route_stats_provider_model_idx").on(t.provider, t.modelId)],
);

/** RDAP availability cache (TTL 15 minutes). */
export const domainChecks = pgTable("domain_checks", {
  domain: text("domain").primaryKey(),
  available: boolean("available").notNull(),
  status: text("status").notNull().default("available"), // available | taken | unknown
  checkedAt: timestamp("checked_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Encrypted secrets + model registry overrides. */
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
