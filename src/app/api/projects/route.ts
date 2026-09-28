import { db } from "@/db";
import { projects } from "@/db/schema";
import { desc } from "drizzle-orm";
import { z } from "zod";

export const dynamic = "force-dynamic";

const imageSchema = z.object({
  mime: z.string().refine((m) => /^image\/(png|jpe?g|webp|svg\+xml)$/.test(m), "unsupported image type"),
  dataUrl: z.string().max(2_000_000, "image too large (max ~1.5MB)"),
});

export const projectInputSchema = z.object({
  name: z.string().trim().min(2, "company name is required").max(120),
  industry: z.string().trim().min(2).max(60),
  phone: z
    .string()
    .trim()
    .min(7, "enter a valid phone number")
    .max(30)
    .regex(/^[+\d][\d\s().-]{5,}$/, "enter a valid phone number"),
  address: z.string().trim().min(5, "enter the full street address").max(240),
  notes: z.string().max(1200).optional().default(""),
  logo: imageSchema.nullable().optional(),
  referenceImages: z.array(imageSchema).max(3).optional().default([]),
  domain: z.string().trim().max(120).nullable().optional(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = projectInputSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "invalid input" }, { status: 422 });
  }
  const data = parsed.data;
  const rows = await db
    .insert(projects)
    .values({
      name: data.name,
      industry: data.industry,
      phone: data.phone,
      address: data.address,
      notes: data.notes ?? "",
      logo: data.logo ?? null,
      referenceImages: data.referenceImages ?? [],
      domain: data.domain ?? null,
    })
    .returning();
  return Response.json({ project: rows[0] }, { status: 201 });
}

export async function GET() {
  const { generations } = await import("@/db/schema");
  const rows = await db.select().from(projects).orderBy(desc(projects.createdAt));
  const gens = await db
    .select({
      projectId: generations.projectId,
      id: generations.id,
      status: generations.status,
      stageKey: generations.stageKey,
      stageIndex: generations.stageIndex,
      createdAt: generations.createdAt,
    })
    .from(generations);
  const latestByProject = new Map<string, (typeof gens)[number]>();
  for (const g of gens) {
    const existing = latestByProject.get(g.projectId);
    if (!existing || g.createdAt > existing.createdAt) latestByProject.set(g.projectId, g);
  }
  return Response.json({
    projects: rows.map((p) => ({ ...p, latestGeneration: latestByProject.get(p.id) ?? null })),
  });
}
