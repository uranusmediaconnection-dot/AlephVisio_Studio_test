"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Globe, Phone, Plus, Sparkles } from "lucide-react";
import { Badge, Card, Spinner } from "@/components/ui";
import { industryById } from "@/lib/industries";
import { timeAgo } from "@/lib/utils";

interface ProjectCard {
  id: string;
  name: string;
  industry: string;
  phone: string;
  address: string;
  domain: string | null;
  createdAt: string;
  logo: { mime: string; dataUrl: string } | null;
  latestGeneration: {
    id: string;
    status: string;
    stageKey: string | null;
    stageIndex: number;
    createdAt: string;
  } | null;
}

function statusBadge(gen: ProjectCard["latestGeneration"]) {
  if (!gen) return <Badge tone="neutral">not built yet</Badge>;
  if (gen.status === "completed") return <Badge tone="ok">live build</Badge>;
  if (gen.status === "running" || gen.status === "queued")
    return (
      <Badge tone="ruby">
        <span className="pulse-dot inline-block size-1.5 rounded-full bg-ruby-300" />
        building · stage {gen.stageIndex}/8
      </Badge>
    );
  return <Badge tone="error">failed · stage {gen.stageIndex}/8</Badge>;
}

export default function DashboardPage() {
  const { data, isLoading } = useQuery<{ projects: ProjectCard[] }>({
    queryKey: ["projects"],
    queryFn: async () => (await fetch("/api/projects")).json(),
    refetchInterval: 8000,
  });

  const projects = data?.projects ?? [];

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.18em] text-teal-300">
            <Sparkles size={13} /> Model Router Engine online
          </p>
          <h1 className="font-display text-3xl font-bold tracking-tight">Projects</h1>
          <p className="mt-1 max-w-xl text-sm text-mist-300">
            Every build streams live through 8 pipeline stages, dynamically routed across 5 models and 2 providers
            with failover, circuit breaking and an adaptive leaderboard.
          </p>
        </div>
        <Link
          href="/wizard"
          className="flex items-center gap-2 rounded-lg bg-forest-600 px-4 py-2.5 text-sm font-bold text-mist-100 shadow-[0_8px_24px_-8px_rgb(62_86_65)] transition hover:bg-forest-500"
        >
          <Plus size={16} strokeWidth={2.6} /> New project
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-3 py-20 text-mist-300">
          <Spinner /> Loading projects…
        </div>
      ) : projects.length === 0 ? (
        <Card className="mx-auto max-w-lg p-10 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-teal-600/20 text-teal-300">
            <Sparkles size={22} />
          </div>
          <h2 className="font-display text-lg font-bold">No projects yet</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-mist-300">
            Run the intake wizard — company details, brand assets, domain — and watch the ensemble build your first
            site.
          </p>
          <Link
            href="/wizard"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-forest-600 px-4 py-2 text-sm font-bold text-mist-100 hover:bg-forest-500"
          >
            Start the wizard <ArrowRight size={15} />
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              <Link href={`/projects/${p.id}`} className="group block h-full">
                <Card className="flex h-full flex-col p-5 transition-all group-hover:-translate-y-1 group-hover:border-teal-500/60 group-hover:shadow-[0_16px_40px_-12px_rgb(74_144_226/0.35)]">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {p.logo?.dataUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.logo.dataUrl}
                          alt=""
                          className="size-10 rounded-lg border border-ink-600 bg-white/95 object-contain p-0.5"
                        />
                      ) : (
                        <div className="flex size-10 items-center justify-center rounded-lg bg-ink-700 font-display text-sm font-bold text-teal-300">
                          {p.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <h3 className="font-display text-[15px] font-bold leading-tight">{p.name}</h3>
                        <p className="text-xs text-mist-500">{industryById(p.industry).label}</p>
                      </div>
                    </div>
                    {statusBadge(p.latestGeneration)}
                  </div>
                  <div className="mt-auto space-y-1.5 border-t border-ink-700/70 pt-3 text-xs text-mist-300">
                    <p className="flex items-center gap-1.5">
                      <Globe size={12} className="text-mist-500" />
                      {p.domain ?? <span className="text-mist-500">no domain selected</span>}
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Phone size={12} className="text-mist-500" /> {p.phone}
                    </p>
                    <p className="text-mist-500">created {timeAgo(p.createdAt)}</p>
                  </div>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
