"use client";

import { motion } from "framer-motion";
import { Hat } from "@/components/hats";
import { Badge } from "@/components/ui";
import { PERSONAS } from "@/lib/personas";
import { cn } from "@/lib/utils";
import { useGenerationStore } from "@/store/generation";
import type { ModelKey } from "@/lib/types";

/** Stages each specialist is accountable for (matches the pipeline chains). */
export const PERSONA_STAGES: Record<ModelKey, number[]> = {
  "nemotron-ultra": [1, 2, 5],
  inkling: [3],
  "nemotron-super": [4],
  laguna: [6],
  "nemotron-nano-omni": [7, 8],
};

const ORDER: ModelKey[] = ["nemotron-ultra", "inkling", "nemotron-super", "laguna", "nemotron-nano-omni"];

export function SwarmStrip() {
  const stages = useGenerationStore((s) => s.stages);
  const stageRoutes = useGenerationStore((s) => s.stageRoutes);

  return (
    <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-5" aria-label="Specialist swarm">
      {ORDER.map((key, i) => {
        const persona = PERSONAS[key];
        const mine = PERSONA_STAGES[key];
        const working = stages.find((s) => mine.includes(s.index) && s.status === "running");
        const failed = stages.find((s) => mine.includes(s.index) && s.status === "failed");
        const doneCount = stages.filter((s) => mine.includes(s.index) && s.status === "complete").length;
        const route = [...mine].reverse().map((n) => stageRoutes[n]).find(Boolean);
        const status = working ? "working" : failed ? "blocked" : doneCount === mine.length && doneCount > 0 ? "done" : "standby";

        return (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.3 }}
            className={cn(
              "relative overflow-hidden rounded-xl border bg-white p-3.5 transition-shadow",
              status === "working" && "border-teal-500/70 shadow-[0_8px_24px_-10px_rgb(74_144_226/0.5)]",
              status === "blocked" && "border-ember-400/60",
              status === "done" && "border-forest-500/50",
              status === "standby" && "border-ink-700",
            )}
          >
            {status === "working" && (
              <span aria-hidden className="shimmer-line absolute inset-x-0 top-0 h-0.5" />
            )}
            <div className="flex items-center gap-2.5">
              <span
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-full border",
                  status === "working" && "border-teal-500/60 bg-teal-500/10",
                  status === "done" && "border-forest-500/50 bg-forest-600/30",
                  status === "blocked" && "border-ember-400/50 bg-ember-400/10",
                  status === "standby" && "border-ink-700 bg-ink-800",
                )}
              >
                <Hat kind={persona.hat} size={22} />
              </span>
              <div className="min-w-0">
                <p className="truncate font-display text-[13px] font-bold text-mist-100">{persona.name}</p>
                <p className="truncate text-[11px] font-semibold text-mist-500">{persona.role}</p>
              </div>
            </div>
            <div className="mt-2.5 flex items-center justify-between gap-2">
              <span className="truncate font-mono text-[10px] text-mist-500">
                st.{mine.join(",")} · {key}
              </span>
              {status === "working" && working && (
                <Badge tone="teal">
                  <span className="pulse-dot inline-block size-1.5 rounded-full bg-teal-500" /> on stage {working.index}
                </Badge>
              )}
              {status === "done" && <Badge tone="ok">{doneCount}/{mine.length} done</Badge>}
              {status === "blocked" && <Badge tone="error">blocked</Badge>}
              {status === "standby" && <Badge tone="neutral">standby</Badge>}
            </div>
            {route && (
              <p className="mt-1.5 truncate text-[10px] text-mist-500">
                via <span className="font-semibold text-teal-300">{route.provider}</span> · {route.latencyMs}ms
              </p>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
