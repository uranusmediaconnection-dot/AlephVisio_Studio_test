import { db } from "@/db";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { decryptSecret, encryptSecret } from "./crypto";
import type { ProviderKey } from "./types";

export interface CredentialSet {
  openrouter: string;
  kilocode: string;
  kilocodeBaseUrl: string;
}

export const DEFAULT_KILOCODE_BASE_URL = "https://api.kilo.ai/api/gateway";

async function getSetting(key: string): Promise<string | null> {
  const row = await db.query.settings.findFirst({ where: eq(settings.key, key) });
  return row?.value ?? null;
}

async function setSetting(key: string, value: string): Promise<void> {
  const existing = await getSetting(key);
  if (existing === null) {
    await db.insert(settings).values({ key, value });
  } else {
    await db.update(settings).set({ value, updatedAt: new Date() }).where(eq(settings.key, key));
  }
}

/**
 * Resolve effective credentials: runtime Settings override → .env fallback.
 * Secrets are only ever read server-side.
 */
export async function resolveCredentials(): Promise<CredentialSet> {
  let stored: Partial<Record<"openrouter" | "kilocode" | "kilocodeBaseUrl", string>> = {};
  try {
    const raw = await getSetting("secrets");
    if (raw) stored = JSON.parse(decryptSecret(raw)) as typeof stored;
  } catch {
    stored = {};
  }
  return {
    openrouter: stored.openrouter || process.env.OPENROUTER_API_KEY || "",
    kilocode: stored.kilocode || process.env.KILOCODE_API_KEY || "",
    kilocodeBaseUrl:
      stored.kilocodeBaseUrl || process.env.KILOCODE_BASE_URL || DEFAULT_KILOCODE_BASE_URL,
  };
}

export async function saveCredentials(patch: {
  openrouter?: string;
  kilocode?: string;
  kilocodeBaseUrl?: string;
}): Promise<void> {
  const current = await resolveCredentials();
  const next = {
    openrouter: patch.openrouter?.trim() ? patch.openrouter.trim() : current.openrouter,
    kilocode: patch.kilocode?.trim() ? patch.kilocode.trim() : current.kilocode,
    kilocodeBaseUrl: patch.kilocodeBaseUrl?.trim()
      ? patch.kilocodeBaseUrl.trim()
      : current.kilocodeBaseUrl,
  };
  await setSetting("secrets", encryptSecret(JSON.stringify(next)));
}

export async function saveRegistryJson(json: string): Promise<void> {
  await setSetting("registry", json);
}

export async function deleteSetting(key: string): Promise<void> {
  await db.delete(settings).where(eq(settings.key, key));
}

export function providerLabel(provider: ProviderKey): string {
  return provider === "openrouter" ? "OpenRouter" : "Kilocode";
}
