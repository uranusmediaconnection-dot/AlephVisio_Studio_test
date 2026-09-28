"use client";

import { create } from "zustand";
import type { GenEvent } from "@/lib/types";

export interface ConsoleLine {
  id: number;
  level: "info" | "route" | "ok" | "warn" | "error";
  msg: string;
  stage?: number;
}

export interface StageState {
  index: number;
  key: string;
  title: string;
  status: "pending" | "running" | "complete" | "failed";
}

export interface StageRouteInfo {
  modelName: string;
  modelKey: string;
  provider: string;
  latencyMs: number;
  via: string;
}

interface GenerationStore {
  connected: boolean;
  running: boolean;
  finished: "completed" | "failed" | null;
  lines: ConsoleLine[];
  stages: StageState[];
  artifacts: Record<string, string>;
  stageRoutes: Record<number, StageRouteInfo>;
  abortController: AbortController | null;
  start: (projectId: string, ensemble: boolean) => Promise<void>;
  stop: () => void;
  reset: () => void;
}

let lineId = 0;

export const STAGE_TITLES: [string, string][] = [
  ["brief", "Brand Brief"],
  ["sitemap", "Sitemap"],
  ["copy", "Copy & Voice"],
  ["content", "Content Blocks"],
  ["tokens", "Design Tokens"],
  ["codegen", "Code Generation"],
  ["validate", "Validation Loop"],
  ["qa", "Visual QA"],
];

export const useGenerationStore = create<GenerationStore>((set, get) => ({
  connected: false,
  running: false,
  finished: null,
  lines: [],
  stages: STAGE_TITLES.map(([key, title], i) => ({ index: i + 1, key, title, status: "pending" })),
  artifacts: {},
  stageRoutes: {},
  abortController: null,

  reset: () =>
    set({
      connected: false,
      running: false,
      finished: null,
      lines: [],
      artifacts: {},
      stageRoutes: {},
      stages: STAGE_TITLES.map(([key, title], i) => ({ index: i + 1, key, title, status: "pending" })),
    }),

  stop: () => {
    get().abortController?.abort();
    set({ running: false, connected: false });
  },

  start: async (projectId, ensemble) => {
    const controller = new AbortController();
    set({
      connected: true,
      running: true,
      finished: null,
      lines: [],
      artifacts: {},
      stageRoutes: {},
      abortController: controller,
      stages: STAGE_TITLES.map(([key, title], i) => ({ index: i + 1, key, title, status: "pending" })),
    });

    const apply = (ev: GenEvent) => {
      if (ev.type === "log") {
        if (ev.level === "token") return; // streaming deltas are not console lines
        const line: ConsoleLine = {
          id: ++lineId,
          level: ev.level as ConsoleLine["level"],
          msg: ev.msg,
          stage: ev.stage,
        };
        set((s) => ({ lines: [...s.lines.slice(-400), line] }));
      } else if (ev.type === "stage") {
        set((s) => ({
          stages: s.stages.map((st) => (st.key === ev.key ? { ...st, status: ev.status } : st)),
        }));
      } else if (ev.type === "artifact") {
        set((s) => ({ artifacts: { ...s.artifacts, [ev.stage]: ev.summary } }));
      } else if (ev.type === "routed") {
        const info: StageRouteInfo = {
          modelName: ev.modelName,
          modelKey: ev.modelKey,
          provider: ev.provider,
          latencyMs: ev.latencyMs,
          via: ev.via,
        };
        set((s) => ({ stageRoutes: { ...s.stageRoutes, [ev.stage]: info } }));
      } else if (ev.type === "done") {
        set({ running: false, connected: false, finished: ev.status });
      }
    };

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, ensemble }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        set((s) => ({
          running: false,
          connected: false,
          lines: [...s.lines, { id: ++lineId, level: "error", msg: err.error ?? "generation failed to start" }],
        }));
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split("\n\n");
        buffer = frames.pop() ?? "";
        for (const frame of frames) {
          const dataLine = frame.split("\n").find((l) => l.startsWith("data:"));
          if (!dataLine) continue;
          try {
            apply(JSON.parse(dataLine.slice(5).trim()) as GenEvent);
          } catch {
            /* malformed frame */
          }
        }
      }
      if (get().running) set({ running: false, connected: false });
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        set((s) => ({
          running: false,
          connected: false,
          lines: [...s.lines, { id: ++lineId, level: "error", msg: `connection lost: ${(err as Error).message}` }],
        }));
      } else {
        set({ running: false, connected: false });
      }
    }
  },
}));
