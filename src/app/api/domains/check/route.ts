import { checkDomainsFor, sanitizeSlug } from "@/lib/rdap";

export const dynamic = "force-dynamic";

/**
 * GET /api/domains/check?name=Acme+Plumbing
 * Sanitizes the company name and probes TLDs via RDAP (404 = available,
 * 200 = taken), cached 15 minutes.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const name = url.searchParams.get("name") ?? "";
  const slug = sanitizeSlug(name);
  if (!slug) {
    return Response.json({ error: "provide a company name" }, { status: 422 });
  }
  const result = await checkDomainsFor(name);
  return Response.json(result);
}
