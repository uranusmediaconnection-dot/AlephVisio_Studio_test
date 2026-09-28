import { db } from "@/db";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { DEFAULT_REGISTRY, isValidRegistry } from "./registry-data";
import type { Registry } from "./types";

export { DEFAULT_REGISTRY, isValidRegistry, modelFromRegistry, visionModels } from "./registry-data";

const cache = { registry: null as Registry | null, at: 0 };

/** Load the effective registry: DB override if valid, otherwise defaults. */
export async function loadRegistry(): Promise<Registry> {
  if (cache.registry && Date.now() - cache.at < 5000) return cache.registry;
  try {
    const row = await db.query.settings.findFirst({ where: eq(settings.key, "registry") });
    if (row?.value) {
      const parsed = JSON.parse(row.value) as Registry;
      if (isValidRegistry(parsed)) {
        cache.registry = parsed;
        cache.at = Date.now();
        return parsed;
      }
    }
  } catch {
    /* fall back to defaults */
  }
  cache.registry = DEFAULT_REGISTRY;
  cache.at = Date.now();
  return DEFAULT_REGISTRY;
}
