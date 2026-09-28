import { maskKey } from "@/lib/crypto";
import { DEFAULT_REGISTRY, isValidRegistry } from "@/lib/registry";
import { DEFAULT_KILOCODE_BASE_URL, resolveCredentials, saveCredentials, saveRegistryJson, deleteSetting } from "@/lib/settings";
import { z } from "zod";

export const dynamic = "force-dynamic";

/** GET — masked credential status + effective model registry JSON. */
export async function GET() {
  const creds = await resolveCredentials();
  return Response.json({
    keys: {
      openrouter: creds.openrouter ? maskKey(creds.openrouter) : "",
      kilocode: creds.kilocode ? maskKey(creds.kilocode) : "",
    },
    kilocodeBaseUrl: creds.kilocodeBaseUrl,
    registry: JSON.stringify(await effectiveRegistryJson(), null, 2),
    envFallback: {
      openrouter: Boolean(process.env.OPENROUTER_API_KEY),
      kilocode: Boolean(process.env.KILOCODE_API_KEY),
      kilocodeBaseUrl: process.env.KILOCODE_BASE_URL ?? DEFAULT_KILOCODE_BASE_URL,
    },
  });
}

async function effectiveRegistryJson(): Promise<unknown> {
  // Reads the stored override if present, otherwise the compiled default.
  const { db } = await import("@/db");
  const { settings } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");
  const row = await db.query.settings.findFirst({ where: eq(settings.key, "registry") });
  if (row?.value) {
    try {
      const parsed = JSON.parse(row.value);
      if (isValidRegistry(parsed)) return parsed;
    } catch {
      /* corrupted override — fall back */
    }
  }
  return DEFAULT_REGISTRY;
}

const putSchema = z.object({
  openrouter: z.string().max(400).optional(),
  kilocode: z.string().max(2000).optional(),
  kilocodeBaseUrl: z.string().url().optional().or(z.literal("")),
  registry: z.string().max(60_000).optional(),
  resetRegistry: z.boolean().optional(),
});

/** PUT — persist credentials (encrypted) and/or the Model JSON Registry. */
export async function PUT(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = putSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "invalid input" }, { status: 422 });
  }
  const data = parsed.data;

  if (data.openrouter !== undefined || data.kilocode !== undefined || data.kilocodeBaseUrl !== undefined) {
    await saveCredentials({
      openrouter: data.openrouter,
      kilocode: data.kilocode,
      kilocodeBaseUrl: data.kilocodeBaseUrl,
    });
  }

  if (data.resetRegistry) {
    await deleteSetting("registry");
  } else if (data.registry !== undefined) {
    try {
      const parsedRegistry = JSON.parse(data.registry);
      if (!isValidRegistry(parsedRegistry)) {
        return Response.json(
          { error: "registry JSON is structurally invalid — every model needs key, name and provider modelIds" },
          { status: 422 },
        );
      }
    } catch {
      return Response.json({ error: "registry is not valid JSON" }, { status: 422 });
    }
    await saveRegistryJson(data.registry);
  }

  return Response.json({ ok: true });
}
