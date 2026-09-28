"use client";

import { useEffect, useRef } from "react";
import { CheckCircle2, Circle, Loader2, XCircle } from "lucide-react";
import { Hat } from "@/components/hats";
import { personaForModel } from "@/lib/personas";
import { cn } from "@/lib/utils";
import { useGenerationStore, type ConsoleLine } from "@/store/generation";
import type { ModelKey } from "@/lib/types";

/** Terminal palette stays dark-on-light by design — the console is a cockpit. */
const LEVEL_COLORS: Record<ConsoleLine["level"], string> = {
  info: "text-[#a9b2bc]",
  route: "text-[#7db4f0]",
  ok: "text-[#63c08c]",
  warn: "text-[#e8b45a]",
  error: "text-[#f0767b]",
};

export function RouterConsole() {
  const { lines, stages, running, artifacts, stageRoutes } = useGenerationStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines.length]);

  return (
    <div className="overflow-hidden rounded-xl border border-ink-700 bg-white shadow-[0_2px_16px_-4px_rgb(46_46_46/0.08)]">
      {/* Stage rail with the specialist on duty */}
      <div className="border-b border-ink-700 px-4 py-3">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-display text-sm font-bold text-mist-100">Pipeline · 8 stages</h2>
          {running && (
            <span className="flex items-center gap-1.5 text-xs font-bold text-teal-300">
              <span className="pulse-dot inline-block size-1.5 rounded-full bg-teal-500" /> streaming
            </span>
          )}
        </div>
        <ol className="grid grid-cols-4 gap-1.5 sm:grid-cols-8" aria-label="Pipeline stages">
          {stages.map((st) => {
            const routed = stageRoutes[st.index];
            const persona = routed ? personaForModel(routed.modelKey as ModelKey) : null;
            return (
              <li
                key={st.key}
                className={cn(
                  "rounded-md border px-1.5 py-1.5 text-center",
                  st.status === "pending" && "border-ink-700 bg-ink-800 text-mist-500",
                  st.status === "running" && "border-teal-500/70 bg-teal-500/10 text-teal-300",
                  st.status === "complete" && "border-forest-500/50 bg-forest-600/25 text-forest-300",
                  st.status === "failed" && "border-ember-400/60 bg-ember-400/10 text-ember-400",
                )}
                title={persona ? `${st.title} — ${persona.name}, ${persona.role}` : st.title}
              >
                <span className="flex items-center justify-center gap-1 text-[10px] font-bold">
                  {st.status === "running" ? (
                    <Loader2 size={10} className="animate-spin" />
                  ) : st.status === "complete" ? (
                    <CheckCircle2 size={10} />
                  ) : st.status === "failed" ? (
                    <XCircle size={10} />
                  ) : (
                    <Circle size={10} />
                  )}
                  {st.index}
                </span>
                <span className="mt-0.5 flex items-center justify-center gap-1">
                  {persona && <Hat kind={persona.hat} size={12} />}
                  <span className="truncate text-[9px] font-semibold uppercase tracking-wide opacity-90">
                    {st.title}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Terminal — dark cockpit for contrast */}
      <div
        ref={scrollRef}
        className="console-scroll h-[380px] overflow-y-auto bg-[#1d2126] p-4 font-mono text-[12px] leading-[1.65]"
        role="log"
        aria-live="polite"
      >
        {lines.length === 0 ? (
          <p className="text-[#767e88]">
            <span className="text-[#7db4f0]">alephvisio</span> ▸ router console idle — start a build to watch the
            swarm route live, fail over and ship.
          </p>
        ) : (
          lines.map((line) => (
            <p key={line.id} className={cn("whitespace-pre-wrap break-words", LEVEL_COLORS[line.level])}>
              {line.stage ? <span className="mr-1 select-none text-[#5d6570]">[s{line.stage}]</span> : null}
              {line.msg}
            </p>
          ))
        )}
        {running && <p className="caret text-[#a9b2bc]" aria-hidden="true" />}
      </div>

      {/* Artifact summaries */}
      {Object.keys(artifacts).length > 0 && (
        <div className="border-t border-ink-700 px-4 py-3">
          <h3 className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-mist-500">Stage artifacts</h3>
          <ul className="grid gap-1 text-xs text-mist-300">
            {Object.entries(artifacts).map(([stage, summary]) => (
              <li key={stage} className="flex gap-2">
                <span className="shrink-0 font-mono font-semibold text-teal-300">{stage}</span>
                <span className="truncate">{summary}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
