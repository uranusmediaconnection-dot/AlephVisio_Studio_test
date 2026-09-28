import { db } from "@/db";
import { generations, projects } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const project = await db.query.projects.findFirst({ where: eq(projects.id, id) });
  if (!project) return Response.json({ error: "project not found" }, { status: 404 });
  const gens = await db
    .select()
    .from(generations)
    .where(eq(generations.projectId, id))
    .orderBy(desc(generations.createdAt))
    .limit(8);
  return Response.json({ project, generations: gens });
}

const patchSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  industry: z.string().trim().min(2).max(60).optional(),
  phone: z.string().trim().min(7).max(30).optional(),
  address: z.string().trim().min(5).max(240).optional(),
  notes: z.string().max(1200).optional(),
  domain: z.string().trim().max(120).nullable().optional(),
});

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "invalid input" }, { status: 422 });
  }
  const rows = await db
    .update(projects)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(projects.id, id))
    .returning();
  if (rows.length === 0) return Response.json({ error: "project not found" }, { status: 404 });
  return Response.json({ project: rows[0] });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  const rows = await db.delete(projects).where(and(eq(projects.id, id))).returning();
  if (rows.length === 0) return Response.json({ error: "project not found" }, { status: 404 });
  return Response.json({ ok: true });
}
