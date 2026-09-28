import { db } from "@/db";
import { domainChecks } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Domain Availability Engine — RDAP lookups, no API key required.
 * 404 → available · 200 → taken · anything else → unknown.
 * Results cached in Postgres for 15 minutes.
 */

export const TLDS = ["com", "net", "org", "io", "co", "ai"] as const;
export const CACHE_TTL_MS = 15 * 60 * 1000;

export interface DomainResult {
  domain: string;
  available: boolean;
  status: "available" | "taken" | "unknown";
  cached: boolean;
}

/** Lowercase, ASCII, hyphenated, length-capped domain slug from a name. */
export function sanitizeSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30)
    .replace(/-+$/g, "");
}

export async function lookupRdap(domain: string): Promise<{ available: boolean; status: DomainResult["status"] }> {
  try {
    const res = await fetch(`https://rdap.org/domain/${encodeURIComponent(domain)}`, {
      signal: AbortSignal.timeout(9_000),
      headers: {
        Accept: "application/rdap+json, application/json",
        // rdap.org rejects undici's default user agent with a 403.
        "User-Agent": "AlephVisio-Studio/1.0 (+domain-availability-check)",
      },
    });
    if (res.status === 404) return { available: true, status: "available" };
    if (res.ok) return { available: false, status: "taken" };
    return { available: false, status: "unknown" };
  } catch {
    return { available: false, status: "unknown" };
  }
}

export async function checkDomainsFor(companyName: string): Promise<{ slug: string; results: DomainResult[] }> {
  const slug = sanitizeSlug(companyName);
  if (!slug) return { slug: "", results: [] };
  const results: DomainResult[] = [];

  for (const tld of TLDS) {
    const domain = `${slug}.${tld}`;
    const cached = await db.query.domainChecks.findFirst({ where: eq(domainChecks.domain, domain) });
    const fresh =
      cached && Date.now() - cached.checkedAt.getTime() < CACHE_TTL_MS;
    if (fresh && cached) {
      results.push({
        domain,
        available: cached.available,
        status: cached.status as DomainResult["status"],
        cached: true,
      });
      continue;
    }
    const live = await lookupRdap(domain);
    await db
      .insert(domainChecks)
      .values({ domain, available: live.available, status: live.status, checkedAt: new Date() })
      .onConflictDoUpdate({
        target: domainChecks.domain,
        set: { available: live.available, status: live.status, checkedAt: new Date() },
      });
    results.push({ domain, available: live.available, status: live.status, cached: false });
  }
  return { slug, results };
}
