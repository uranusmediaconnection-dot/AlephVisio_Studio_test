import { db } from "@/db";
import { generations, projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { runPipeline } from "@/lib/pipeline";
import type { GenEvent, ProjectRecord } from "@/lib/types";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const maxDuration = 900;

const bodySchema = z.object({
  projectId: z.string().uuid(),
  ensemble: z.boolean().optional().default(false),
});

/**
 * POST /api/generate — launches the 8-stage pipeline and streams its
 * progress as Server-Sent Events.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "invalid input" }, { status: 422 });
  }
  const { projectId, ensemble } = parsed.data;

  const project = await db.query.projects.findFirst({ where: eq(projects.id, projectId) });
  if (!project) return Response.json({ error: "project not found" }, { status: 404 });

  const [generation] = await db
    .insert(generations)
    .values({ projectId, status: "queued", ensemble })
    .returning();

  const projectRecord: ProjectRecord = {
    id: project.id,
    name: project.name,
    industry: project.industry,
    phone: project.phone,
    address: project.address,
    notes: project.notes,
    logo: project.logo,
    referenceImages: project.referenceImages ?? [],
    domain: project.domain,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };

  const encoder = new TextEncoder();
  const abort = new AbortController();
  req.signal.addEventListener("abort", () => abort.abort());

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const send = (ev: GenEvent) => {
        if (closed) return;
        const eventName = ev.type === "log" && ev.level === "token" ? "token" : "message";
        controller.enqueue(encoder.encode(`event: ${eventName}\ndata: ${JSON.stringify(ev)}\n\n`));
      };
      const heartbeat = setInterval(() => {
        if (closed) return;
        controller.enqueue(encoder.encode(`event: message\ndata: ${JSON.stringify({ type: "heartbeat" } satisfies GenEvent)}\n\n`));
      }, 15_000);

      runPipeline({
        project: projectRecord,
        generationId: generation.id,
        ensemble,
        signal: abort.signal,
        emit: send,
      })
        .catch((err) => {
          try {
            send({ type: "log", level: "error", msg: `unexpected pipeline error: ${err instanceof Error ? err.message : String(err)}` });
            send({ type: "done", generationId: generation.id, status: "failed" });
          } catch {
            /* stream already closed */
          }
        })
        .finally(() => {
          clearInterval(heartbeat);
          if (!closed) {
            closed = true;
            try {
              controller.close();
            } catch {
              /* already closed */
            }
          }
        });
    },
    cancel() {
      abort.abort();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
