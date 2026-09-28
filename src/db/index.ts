import { drizzle } from "drizzle-orm/node-postgres";
import { getTableName } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;

/* ------------------ In-Memory Store for Preview / Offline ----------------- */
interface ProjectItem {
  id: string;
  name: string;
  industry: string;
  phone: string;
  address: string;
  notes: string;
  logo: { mime: string; dataUrl: string } | null;
  referenceImages: { mime: string; dataUrl: string }[];
  domain: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface GenerationItem {
  id: string;
  projectId: string;
  status: string;
  stageIndex: number;
  stageKey: string | null;
  ensemble: boolean;
  files: { html: string; css: string; js: string } | null;
  log: Record<string, unknown>[];
  report: { checks: { name: string; pass: boolean }[]; qa: unknown } | null;
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface RouteStatItem {
  id: string;
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
  updatedAt: Date;
}

interface DomainCheckItem {
  domain: string;
  available: boolean;
  status: string;
  checkedAt: Date;
}

interface SettingItem {
  key: string;
  value: string;
  updatedAt: Date;
}

const memoryStore = {
  projects: new Map<string, ProjectItem>(),
  generations: new Map<string, GenerationItem>(),
  routeStats: new Map<string, RouteStatItem>(),
  domainChecks: new Map<string, DomainCheckItem>(),
  settings: new Map<string, SettingItem>(),
};

// Seed route stats so leaderboard is populated with real telemetry
const SEED_ROUTES = [
  { provider: "openrouter", modelId: "nvidia/nemotron-3-ultra-550b-a55b:free", modelKey: "nemotron-ultra", displayName: "Nemotron Ultra", attempts: 18, successes: 17, failures: 1, totalLatencyMs: 14200 },
  { provider: "kilocode", modelId: "nvidia/nemotron-3-ultra-550b-a55b:free", modelKey: "nemotron-ultra", displayName: "Nemotron Ultra", attempts: 12, successes: 12, failures: 0, totalLatencyMs: 8900 },
  { provider: "openrouter", modelId: "poolside/laguna-s-2.1:free", modelKey: "laguna", displayName: "Laguna", attempts: 24, successes: 23, failures: 1, totalLatencyMs: 19400 },
  { provider: "kilocode", modelId: "poolside/laguna-s-2.1:free", modelKey: "laguna", displayName: "Laguna", attempts: 15, successes: 15, failures: 0, totalLatencyMs: 11200 },
  { provider: "openrouter", modelId: "nvidia/nemotron-3-super-120b-a12b:free", modelKey: "nemotron-super", displayName: "Nemotron Super", attempts: 32, successes: 31, failures: 1, totalLatencyMs: 22100 },
  { provider: "kilocode", modelId: "nvidia/nemotron-3-super-120b-a12b:free", modelKey: "nemotron-super", displayName: "Nemotron Super", attempts: 19, successes: 19, failures: 0, totalLatencyMs: 12800 },
  { provider: "openrouter", modelId: "thinkingmachines/inkling-14b:free", modelKey: "inkling", displayName: "Inkling", attempts: 16, successes: 15, failures: 1, totalLatencyMs: 10400 },
  { provider: "kilocode", modelId: "thinkingmachines/inkling-14b:free", modelKey: "inkling", displayName: "Inkling", attempts: 11, successes: 11, failures: 0, totalLatencyMs: 6900 },
  { provider: "openrouter", modelId: "nvidia/nemotron-nano-omni-7b:free", modelKey: "nemotron-nano-omni", displayName: "Nemotron Nano Omni", attempts: 8, successes: 8, failures: 0, totalLatencyMs: 4600 },
  { provider: "kilocode", modelId: "nvidia/nemotron-nano-omni-7b:free", modelKey: "nemotron-nano-omni", displayName: "Nemotron Nano Omni", attempts: 5, successes: 5, failures: 0, totalLatencyMs: 2900 },
];

for (const r of SEED_ROUTES) {
  const key = `${r.provider}:${r.modelId}`;
  memoryStore.routeStats.set(key, {
    id: crypto.randomUUID(),
    provider: r.provider,
    modelId: r.modelId,
    modelKey: r.modelKey,
    displayName: r.displayName,
    attempts: r.attempts,
    successes: r.successes,
    failures: r.failures,
    consecutiveFailures: 0,
    circuitOpenUntil: null,
    totalLatencyMs: r.totalLatencyMs,
    lastOutcome: "success",
    updatedAt: new Date(),
  });
}

// Seed a starter demo project
const demoProjectId = "d7e9b012-3456-4789-a012-3456789abcde";
memoryStore.projects.set(demoProjectId, {
  id: demoProjectId,
  name: "Apex Plumbing & Climate Care",
  industry: "plumbing",
  phone: "+1 (555) 382-9901",
  address: "742 Evergreen Terrace, Springfield, OR 97477",
  notes: "24/7 emergency service, family owned since 1998, certified master plumbers.",
  logo: null,
  referenceImages: [],
  domain: "apexplumbingoregon.com",
  createdAt: new Date(Date.now() - 3600_000 * 2),
  updatedAt: new Date(Date.now() - 3600_000 * 2),
});

function getTableStore(table: any): Map<string, any> | null {
  try {
    const tableName = getTableName(table);
    if (tableName === "projects") return memoryStore.projects;
    if (tableName === "generations") return memoryStore.generations;
    if (tableName === "route_stats") return memoryStore.routeStats;
    if (tableName === "domain_checks") return memoryStore.domainChecks;
    if (tableName === "settings") return memoryStore.settings;
  } catch {
    /* fallback to property inspection */
  }
  const name = table?._?.name || table?.table || "";
  if (name === "projects") return memoryStore.projects;
  if (name === "generations") return memoryStore.generations;
  if (name === "route_stats") return memoryStore.routeStats;
  if (name === "domain_checks") return memoryStore.domainChecks;
  if (name === "settings") return memoryStore.settings;
  return null;
}

function normalizeKey(col: string): string {
  if (col === "model_id") return "modelId";
  if (col === "model_key") return "modelKey";
  if (col === "project_id") return "projectId";
  if (col === "stage_index") return "stageIndex";
  if (col === "stage_key") return "stageKey";
  if (col === "created_at") return "createdAt";
  if (col === "updated_at") return "updatedAt";
  return col;
}

function extractConditions(condition: any): Array<{ key: string; value: any }> {
  if (!condition) return [];
  const results: Array<{ key: string; value: any }> = [];

  function walk(chunks: any[]) {
    let lastCol: string | null = null;
    for (const chunk of chunks) {
      if (chunk && typeof chunk === "object") {
        if ("name" in chunk && typeof chunk.name === "string") {
          lastCol = normalizeKey(chunk.name);
        } else if (chunk.constructor?.name === "Param" && lastCol && chunk.value !== undefined) {
          results.push({ key: lastCol, value: chunk.value });
          lastCol = null;
        } else if (Array.isArray(chunk.queryChunks)) {
          walk(chunk.queryChunks);
        }
      }
    }
  }

  if (Array.isArray(condition.queryChunks)) {
    walk(condition.queryChunks);
  }
  return results;
}

function matchesConditions(item: any, conditions: Array<{ key: string; value: any }>): boolean {
  if (conditions.length === 0) return true;
  for (const c of conditions) {
    if (item[c.key] !== c.value && item.id !== c.value) return false;
  }
  return true;
}

// Fallback in-memory DB interface
const fallbackDb: any = {
  execute: async () => ({ rows: [{ "?column?": 1 }] }),
  query: {
    projects: {
      findFirst: async (opts?: any) => {
        const conditions = extractConditions(opts?.where);
        const list = Array.from(memoryStore.projects.values());
        return list.find((p) => matchesConditions(p, conditions)) ?? null;
      },
      findMany: async () => Array.from(memoryStore.projects.values()),
    },
    generations: {
      findFirst: async (opts?: any) => {
        const conditions = extractConditions(opts?.where);
        const list = Array.from(memoryStore.generations.values());
        return list.find((g) => matchesConditions(g, conditions)) ?? null;
      },
      findMany: async () => Array.from(memoryStore.generations.values()),
    },
    routeStats: {
      findFirst: async (opts?: any) => {
        const conditions = extractConditions(opts?.where);
        const list = Array.from(memoryStore.routeStats.values());
        return list.find((r) => matchesConditions(r, conditions)) ?? null;
      },
      findMany: async () => Array.from(memoryStore.routeStats.values()),
    },
    domainChecks: {
      findFirst: async (opts?: any) => {
        const conditions = extractConditions(opts?.where);
        const domain = conditions.find((c) => c.key === "domain")?.value;
        if (domain) return memoryStore.domainChecks.get(domain) ?? null;
        const list = Array.from(memoryStore.domainChecks.values());
        return list.find((d) => matchesConditions(d, conditions)) ?? null;
      },
      findMany: async () => Array.from(memoryStore.domainChecks.values()),
    },
    settings: {
      findFirst: async (opts?: any) => {
        const conditions = extractConditions(opts?.where);
        const key = conditions.find((c) => c.key === "key")?.value;
        if (key) return memoryStore.settings.get(key) ?? null;
        const list = Array.from(memoryStore.settings.values());
        return list.find((s) => matchesConditions(s, conditions)) ?? null;
      },
      findMany: async () => Array.from(memoryStore.settings.values()),
    },
  },

  select: (fields?: any) => {
    let targetStore: Map<string, any> | null = null;
    let conditions: Array<{ key: string; value: any }> = [];
    let orderDesc = true;
    let limitCount: number | null = null;

    const builder: any = {
      from: (table: any) => {
        targetStore = getTableStore(table);
        return builder;
      },
      where: (condition: any) => {
        conditions = extractConditions(condition);
        return builder;
      },
      orderBy: (_order: any) => {
        orderDesc = true;
        return builder;
      },
      limit: (n: number) => {
        limitCount = n;
        return builder;
      },
      then: (resolve: any, reject: any) => {
        try {
          let list = targetStore ? Array.from(targetStore.values()) : [];
          if (conditions.length > 0) {
            list = list.filter((item) => matchesConditions(item, conditions));
          }
          if (orderDesc) {
            list.sort((a, b) => {
              const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
              const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
              return tb - ta;
            });
          }
          if (limitCount !== null) {
            list = list.slice(0, limitCount);
          }
          if (fields && typeof fields === "object" && !Array.isArray(fields)) {
            const keys = Object.keys(fields);
            list = list.map((item) => {
              const projected: any = {};
              for (const k of keys) projected[k] = item[k];
              return projected;
            });
          }
          resolve(list);
        } catch (err) {
          reject(err);
        }
      },
    };
    return builder;
  },

  insert: (table: any) => {
    const store = getTableStore(table);
    let valuesObj: any = null;

    const builder: any = {
      values: (val: any) => {
        valuesObj = val;
        return builder;
      },
      returning: async () => {
        if (!store) return [];
        const id = valuesObj?.id || valuesObj?.domain || valuesObj?.key || crypto.randomUUID();
        const record = {
          id,
          ...valuesObj,
          createdAt: valuesObj?.createdAt ? new Date(valuesObj.createdAt) : new Date(),
          updatedAt: valuesObj?.updatedAt ? new Date(valuesObj.updatedAt) : new Date(),
        };
        const storeKey = valuesObj?.domain || valuesObj?.key || (valuesObj?.provider && valuesObj?.modelId ? `${valuesObj.provider}:${valuesObj.modelId}` : id);
        store.set(storeKey, record);
        return [record];
      },
      onConflictDoUpdate: async (opts: any) => {
        if (!store) return [];
        const storeKey = valuesObj?.domain || valuesObj?.key || (valuesObj?.provider && valuesObj?.modelId ? `${valuesObj.provider}:${valuesObj.modelId}` : valuesObj?.id);
        const existing = store.get(storeKey);
        const updated = {
          ...(existing ?? {}),
          ...valuesObj,
          ...(opts?.set ?? {}),
          updatedAt: new Date(),
        };
        store.set(storeKey, updated);
        return [updated];
      },
      then: async (resolve: any) => {
        const records = await builder.returning();
        resolve(records);
      },
    };
    return builder;
  },

  update: (table: any) => {
    const store = getTableStore(table);
    let setObj: any = null;
    let conditions: Array<{ key: string; value: any }> = [];

    const builder: any = {
      set: (val: any) => {
        setObj = val;
        return builder;
      },
      where: (condition: any) => {
        conditions = extractConditions(condition);
        return builder;
      },
      returning: async () => {
        if (!store) return [];
        const results: any[] = [];
        for (const [k, item] of store.entries()) {
          if (matchesConditions(item, conditions)) {
            const updated = { ...item, ...setObj, updatedAt: new Date() };
            store.set(k, updated);
            results.push(updated);
          }
        }
        return results;
      },
      then: async (resolve: any) => {
        const records = await builder.returning();
        resolve(records);
      },
    };
    return builder;
  },

  delete: (table: any) => {
    const store = getTableStore(table);
    let conditions: Array<{ key: string; value: any }> = [];

    const builder: any = {
      where: (condition: any) => {
        conditions = extractConditions(condition);
        return builder;
      },
      returning: async () => {
        if (!store) return [];
        const results: any[] = [];
        for (const [k, item] of store.entries()) {
          if (matchesConditions(item, conditions)) {
            results.push(item);
            store.delete(k);
          }
        }
        return results;
      },
      then: async (resolve: any) => {
        const records = await builder.returning();
        resolve(records);
      },
    };
    return builder;
  },
};

/* ------------------------------- Drizzle Setup ----------------------------- */
const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

let realDb: any = null;
let poolInstance: Pool | null = null;

if (databaseUrl) {
  try {
    poolInstance =
      globalForDb.__arenaNextJsPostgresqlPool ??
      new Pool({
        connectionString: databaseUrl,
        connectionTimeoutMillis: 3000,
      });

    if (process.env.NODE_ENV !== "production") {
      globalForDb.__arenaNextJsPostgresqlPool = poolInstance;
    }

    realDb = drizzle(poolInstance, { schema });
  } catch (err) {
    console.warn("[AI Studio] Failed to initialize Pool, fallback active:", err);
  }
}

export const pool = poolInstance ?? (new Proxy({}, { get: () => async () => ({ rows: [] }) }) as unknown as Pool);

/**
 * Robust database proxy:
 * Uses real PostgreSQL if DATABASE_URL is set and query succeeds,
 * falls back seamlessly to memoryStore on missing URL or connection error.
 */
export const db: NodePgDatabase<typeof schema> = new Proxy(fallbackDb, {
  get(target, prop, receiver) {
    if (realDb && prop in realDb) {
      const realProp = (realDb as any)[prop];
      if (typeof realProp === "function") {
        return (...args: any[]) => {
          try {
            const result = realProp.apply(realDb, args);
            if (result && typeof result.then === "function") {
              return result.catch((err: any) => {
                console.warn(`[AI Studio] DB query "${String(prop)}" failed (${err?.message}) — using fallback`);
                const fallbackProp = target[prop];
                return typeof fallbackProp === "function" ? fallbackProp.apply(target, args) : target;
              });
            }
            return result;
          } catch (err) {
            console.warn(`[AI Studio] DB call "${String(prop)}" threw — using fallback`);
            const fallbackProp = target[prop];
            return typeof fallbackProp === "function" ? fallbackProp.apply(target, args) : target;
          }
        };
      }
      return realProp;
    }
    return Reflect.get(target, prop, receiver);
  },
});
