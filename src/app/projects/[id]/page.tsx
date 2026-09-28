"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { ArrowLeft, RefreshCw, Trash2, Wand2 } from "lucide-react";
import { RouterConsole } from "@/components/console";
import { SitePreview } from "@/components/preview";
import { SwarmStrip } from "@/components/swarm";
import { Badge, Button, Card, toast } from "@/components/ui";
import { industryById } from "@/lib/industries";
import { cn } from "@/lib/utils";
import { useGenerationStore } from "@/store/generation";

interface GenerationRow {
  id: string;
  status: string;
  stageIndex: number;
  ensemble: boolean;
  files: { html: string; css: string; js: string } | null;
  report: { checks: { name: string; pass: boolean }[]; qa: { score: number; issues: string[] } | null } | null;
  error: string | null;
  createdAt: string;
}

interface ProjectDetail {
  project: {
    id: string;
    name: string;
    industry: string;
    phone: string;
    address: string;
    domain: string | null;
    logo: { mime: string; dataUrl: string } | null;
    referenceImages: { mime: string; dataUrl: string }[];
  };
  generations: GenerationRow[];
}

function StudioInner() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const gen = useGenerationStore();
  const [ensemble, setEnsemble] = useState(false);
  const autostarted = useRef(false);
  const finishedHandled = useRef<string | null>(null);

  const { data } = useQuery<ProjectDetail>({
    queryKey: ["project", id],
    queryFn: async () => (await fetch(`/api/projects/${id}`)).json(),
    refetchInterval: gen.running ? 6000 : false,
  });

  const completed = data?.generations.find((g) => g.status === "completed" && g.files) ?? null;

  useEffect(() => {
    if (searchParams.get("autostart") === "1" && data && !autostarted.current && !gen.running) {
      autostarted.current = true;
      void gen.start(id, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, id]);

  useEffect(() => {
    if (gen.finished && finishedHandled.current !== `${id}:${gen.finished}:${Date.now()}`) {
      finishedHandled.current = `${id}:${gen.finished}`;
      void queryClient.invalidateQueries({ queryKey: ["project", id] });
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
      if (gen.finished === "completed") toast("ok", "Build complete — site ready to preview and export.");
      else toast("error", "Build failed — inspect the router console for causes.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gen.finished]);

  const startBuild = () => {
    if (gen.running) return;
    void gen.start(id, ensemble);
  };

  const deleteProject = async () => {
    if (!confirm("Delete this project and all of its builds?")) return;
    const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast("info", "Project deleted.");
      router.push("/");
    } else toast("error", "Could not delete the project.");
  };

  const p = data?.project;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link href="/" className="flex items-center gap-1 text-sm font-semibold text-mist-500 hover:text-mist-100">
          <ArrowLeft size={15} /> Dashboard
        </Link>
        <span className="text-mist-500">/</span>
        <h1 className="font-display text-xl font-bold tracking-tight">{p?.name ?? "Loading…"}</h1>
        {p && <Badge tone="teal">{industryById(p.industry).label}</Badge>}
        {p?.domain && <Badge tone="ok">{p.domain}</Badge>}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setEnsemble(!ensemble)}
            disabled={gen.running}
            className={cn(
              "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold transition",
              ensemble ? "border-teal-500/60 bg-teal-500/10 text-teal-300" : "border-ink-600 text-mist-500 hover:text-mist-100",
            )}
            title="Race two routes in parallel and let a reasoning model pick the winner"
          >
            <span className={cn("inline-block size-2 rounded-full", ensemble ? "bg-teal-400" : "bg-ink-600")} />
            Ensemble mode
          </button>
          <Button onClick={startBuild} disabled={gen.running}>
            {gen.running ? <RefreshCw size={15} className="animate-spin" /> : <Wand2 size={15} />}
            {gen.running ? "Building…" : completed ? "Regenerate site" : "Generate site"}
          </Button>
          <Button variant="danger" onClick={() => void deleteProject()} disabled={gen.running} aria-label="Delete project">
            <Trash2 size={14} />
          </Button>
        </div>
      </div>

      <section className="mb-6" aria-label="The specialist swarm">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-mist-500">
            Specialist swarm · live routing
          </h2>
          <span className="font-mono text-[10px] text-mist-500">one hat, one role — every route has a face</span>
        </div>
        <SwarmStrip />
      </section>

      {p && (
        <p className="mb-5 text-sm text-mist-300">
          {p.phone} · {p.address}
          {p.referenceImages.length > 0 && (
            <span className="ml-2 text-xs text-teal-400">
              · {p.logo ? "logo" : ""}{p.logo && p.referenceImages.length > 0 ? " + " : ""}
              {p.referenceImages.length} reference image{p.referenceImages.length > 1 ? "s" : ""} → vision routing engaged
            </span>
          )}
        </p>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="min-w-0">
          <RouterConsole />
          {data && data.generations.length > 0 && (
            <Card className="mt-4 p-4">
              <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-mist-500">Build history</h3>
              <ul className="space-y-1.5 text-xs">
                {data.generations.map((g) => (
                  <li key={g.id} className="flex items-center justify-between gap-2 text-mist-300">
                    <span className="font-mono">
                      #{g.id.slice(0, 8)} · stage {g.stageIndex}/8 {g.ensemble && "· ensemble"}
                    </span>
                    {g.status === "completed" ? (
                      <Badge tone="ok">completed</Badge>
                    ) : g.status === "failed" ? (
                      <Badge tone="error">failed</Badge>
                    ) : (
                      <Badge tone="warn">{g.status}</Badge>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <div className="min-w-0">
          {completed?.files && p ? (
            <SitePreview
              projectName={p.name}
              files={completed.files}
              logo={p.logo}
              references={p.referenceImages}
              checks={completed.report?.checks}
              qa={completed.report?.qa ?? null}
            />
          ) : (
            <Card className="flex h-[560px] flex-col items-center justify-center gap-3 p-8 text-center">
              <div className="flex size-12 items-center justify-center rounded-xl bg-teal-500/15 text-teal-400">
                <Wand2 size={22} />
              </div>
              <h2 className="font-display text-lg font-bold">No completed build yet</h2>
              <p className="max-w-sm text-sm text-mist-300">
                {gen.running
                  ? "The ensemble is working — follow the router console on the left."
                  : "Hit “Generate site” and watch 8 stages stream through the model router: brief → sitemap → copy → content → tokens → code → validation → visual QA."}
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProjectPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-mist-500">Loading studio…</div>}>
      <StudioInner />
    </Suspense>
  );
}
