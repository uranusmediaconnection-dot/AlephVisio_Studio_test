"use client";

import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, animate, motion, useInView, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import {
  ArrowRight,
  CircuitBoard,
  Eye,
  FileCode2,
  Gauge,
  Layers,
  Package,
  Route,
  Scale,
  ShieldCheck,
  Sparkles,
  Terminal,
  Trophy,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Hat } from "@/components/hats";
import { Logo } from "@/components/shell";
import { Badge, Card } from "@/components/ui";
import { PERSONAS } from "@/lib/personas";
import { DEFAULT_REGISTRY } from "@/lib/registry-data";
import { cn } from "@/lib/utils";

/* ------------------------------ micro helpers ----------------------------- */

function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => `${Math.round(v)}${suffix}`);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      mv.set(to);
      return;
    }
    const controls = animate(mv, to, { duration: 1.4, ease: [0.22, 1, 0.36, 1] });
    return controls.stop;
  }, [inView, to, mv, reduce]);

  return (
    <span ref={ref} className="tabular-nums">
      <motion.span>{rounded}</motion.span>
    </span>
  );
}

const TERMINAL_LINES = [
  { c: "text-mist-500", t: "━━ Stage 1/8 · Brand Brief · chain nemotron-ultra → nemotron-super" },
  { c: "text-teal-300", t: "→ attempt 1/3 · Nemotron Ultra via OpenRouter" },
  { c: "text-ruby-300", t: "✗ 429 rate limited — circuit armed" },
  { c: "text-mist-300", t: "↻ backoff 1s before next route" },
  { c: "text-teal-300", t: "→ attempt 2/3 · Nemotron Ultra via Kilocode" },
  { c: "text-forest-300", t: "✓ routed to Nemotron Ultra via Kilocode (10 476ms)" },
  { c: "text-mist-500", t: "━━ Stage 6/8 · Code Generation · chain laguna → nemotron-super" },
  { c: "text-ruby-300", t: "⚖ ensemble mode — racing 2 routes in parallel" },
  { c: "text-forest-300", t: "⚖ judge selected candidate B" },
  { c: "text-forest-300", t: "✔ build complete — 18/18 checks passed" },
];

const SWARM_ORDER = ["nemotron-ultra", "inkling", "nemotron-super", "laguna", "nemotron-nano-omni"] as const;

const STAGES = [
  { n: 1, title: "Brand Brief", chain: "Ultra → Super" },
  { n: 2, title: "Sitemap", chain: "Ultra → Super" },
  { n: 3, title: "Copy & Voice", chain: "Inkling → Super" },
  { n: 4, title: "Content Blocks", chain: "Super → Inkling" },
  { n: 5, title: "Design Tokens", chain: "Ultra → Super" },
  { n: 6, title: "Code Generation", chain: "Laguna → Super" },
  { n: 7, title: "Validation Loop", chain: "Nano Omni → Super" },
  { n: 8, title: "Visual QA", chain: "Nano Omni" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 26 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

/* --------------------------------- hero ---------------------------------- */

function HeroTerminal() {
  const [idx, setIdx] = useState(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % TERMINAL_LINES.length), 1900);
    return () => clearInterval(t);
  }, []);

  const visible = Array.from({ length: 5 }, (_, k) => TERMINAL_LINES[(idx + k) % TERMINAL_LINES.length]);

  return (
    <div className="relative overflow-hidden rounded-xl border border-ink-600 bg-[#111]/95 font-mono text-[11.5px] leading-relaxed shadow-2xl">
      <div className="flex items-center gap-1.5 border-b border-ink-700 px-3 py-2">
        <span className="size-2.5 rounded-full bg-ruby-500/80" />
        <span className="size-2.5 rounded-full bg-forest-500/80" />
        <span className="size-2.5 rounded-full bg-teal-500/80" />
        <span className="ml-2 text-[10px] uppercase tracking-widest text-mist-500">router console — live</span>
      </div>
      <div className="h-40 overflow-hidden p-3.5">
        <AnimatePresence mode="popLayout">
          {visible.map((line, k) => (
            <motion.p
              key={`${idx}-${k}`}
              layout
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: k === 4 ? 0.45 : 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className={cn("whitespace-nowrap", line.c)}
            >
              {line.t}
            </motion.p>
          ))}
        </AnimatePresence>
        <p className="caret text-mist-300" />
      </div>
      <div className="shimmer-line absolute inset-x-0 bottom-0 h-px opacity-70" />
    </div>
  );
}

function Hero() {
  return (
    <section className="bg-grid relative overflow-hidden border-b border-ink-800">
      {/* jewel orbs */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -top-32 right-[8%] size-[420px] rounded-full opacity-35 blur-3xl"
        style={{ background: "radial-gradient(circle, rgb(74 144 226 / 0.5) 0%, transparent 70%)" }}
        animate={{ y: [0, 30, 0], x: [0, -20, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute top-40 left-[-6%] size-[380px] rounded-full opacity-30 blur-3xl"
        style={{ background: "radial-gradient(circle, rgb(46 46 46 / 0.26) 0%, transparent 70%)" }}
        animate={{ y: [0, -24, 0] }}
        transition={{ duration: 13, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="mx-auto grid w-full max-w-7xl items-center gap-14 px-4 pb-24 pt-20 sm:px-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div>
          <motion.div variants={fadeUp} initial="hidden" animate="show">
            <span className="inline-flex items-center gap-2 rounded-full border border-teal-600/50 bg-teal-600/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-teal-300">
              <span className="pulse-dot size-1.5 rounded-full bg-teal-300" />
              Ensemble-routed AI generation
            </span>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={1}
            className="mt-5 font-display text-4xl font-bold leading-[1.08] tracking-tight sm:text-6xl"
          >
            Websites conjured by a <span className="text-jewel">rotating ensemble</span> of AI models.
          </motion.h1>

          <motion.p variants={fadeUp} initial="hidden" animate="show" custom={2} className="mt-5 max-w-xl text-base leading-relaxed text-mist-300">
            Feed AlephVisio a business. Five models across two providers draft the brief, write the copy, paint the
            design tokens, generate the code and QA the render — streamed live, with failover, circuit breaking and an
            adaptive leaderboard deciding every route.
          </motion.p>

          <motion.div variants={fadeUp} initial="hidden" animate="show" custom={3} className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/wizard"
              className="group flex items-center gap-2 rounded-lg bg-forest-600 px-6 py-3 text-sm font-bold text-mist-100 shadow-[0_10px_32px_-8px_rgb(62_86_65)] transition hover:bg-forest-500"
            >
              <Sparkles size={16} /> Start building
              <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/dashboard"
              className="flex items-center gap-2 rounded-lg border border-ink-600 px-6 py-3 text-sm font-bold text-mist-100 transition hover:border-teal-500/70 hover:text-teal-300"
            >
              Open dashboard
            </Link>
          </motion.div>

          <motion.p variants={fadeUp} initial="hidden" animate="show" custom={4} className="mt-6 font-mono text-xs text-mist-500">
            10 routes · 2 providers · 8 stages · SSE streaming · sandboxed preview · ZIP export
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30, rotateX: 8 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: 0.7, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="relative"
        >
          <div aria-hidden className="jewel-ring absolute -inset-3 rounded-2xl opacity-25 blur-md" />
          <div className="relative space-y-3">
            <HeroTerminal />
            <div className="grid grid-cols-4 gap-2">
              {STAGES.slice(0, 8).map((s, i) => (
                <motion.div
                  key={s.n}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 + i * 0.06 }}
                  className={cn(
                    "rounded-md border px-1 py-1.5 text-center text-[9px] font-bold uppercase tracking-wide",
                    i < 6
                      ? "border-forest-600/50 bg-forest-600/15 text-forest-300"
                      : i === 6
                        ? "border-teal-600/60 bg-teal-600/15 text-teal-300"
                        : "border-ink-600 bg-ink-850 text-mist-500",
                  )}
                >
                  {s.n} · {s.title.split(" ")[0]}
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ------------------------------ telemetry band ---------------------------- */

function TelemetryBand() {
  const { data } = useQuery<{ totals: { attempts: number; successes: number; openCircuits: number }; routes: unknown[]; leaderboard: { modelName: string; provider: string; avgLatencyMs: number | null }[] }>({
    queryKey: ["stats"],
    queryFn: async () => (await fetch("/api/stats")).json(),
    refetchInterval: 12_000,
  });

  const attempts = data?.totals.attempts ?? 0;
  const successes = data?.totals.successes ?? 0;
  const rate = attempts ? Math.round((successes / attempts) * 100) : 100;
  const top = data?.leaderboard[0];

  const cells = [
    { icon: <Route size={15} />, label: "Live routes", value: data ? 10 : 0, suffix: "" },
    { icon: <Gauge size={15} />, label: "Routed calls", value: attempts, suffix: "" },
    { icon: <ShieldCheck size={15} />, label: "Success rate", value: rate, suffix: "%" },
    { icon: <CircuitBoard size={15} />, label: "Open circuits", value: data?.totals.openCircuits ?? 0, suffix: "" },
  ];

  return (
    <section className="border-b border-ink-800 bg-ink-950/60">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-2 gap-px overflow-hidden px-4 py-8 sm:px-6 lg:grid-cols-4">
        {cells.map((c, i) => (
          <motion.div
            key={c.label}
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-40px" }}
            custom={i}
            className="flex items-center gap-3 px-4 py-2"
          >
            <span className="flex size-9 items-center justify-center rounded-lg border border-ink-600 bg-ink-850 text-teal-300">
              {c.icon}
            </span>
            <div>
              <p className="font-display text-2xl font-bold">
                <Counter to={c.value} suffix={c.suffix} />
              </p>
              <p className="text-[11px] font-bold uppercase tracking-wider text-mist-500">{c.label}</p>
            </div>
          </motion.div>
        ))}
      </div>
      {top && (
        <p className="pb-6 text-center font-mono text-[11px] text-mist-500">
          leaderboard leader ▸ <span className="text-teal-300">{top.modelName}</span>
          <span className="text-mist-500">@{top.provider}</span>
          {top.avgLatencyMs ? <span> · {top.avgLatencyMs}ms avg</span> : null}
        </p>
      )}
    </section>
  );
}

/* ----------------------------- pipeline section --------------------------- */

function PipelineSection() {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-24 sm:px-6">
      <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }} className="max-w-2xl">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-ruby-300">
          <Layers size={13} /> The pipeline
        </p>
        <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Eight stages, streamed live to your console.
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-mist-300">
          Every stage declares a preferred model chain. The router resolves it against live telemetry, streams tokens
          over SSE, and hands each artifact forward — brief → sitemap → copy → content → tokens → code → validation →
          visual QA.
        </p>
      </motion.div>

      <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {STAGES.map((s, i) => (
          <motion.div
            key={s.n}
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-30px" }}
            custom={i}
            whileHover={{ y: -4 }}
            transition={{ type: "spring", stiffness: 300, damping: 22 }}
          >
            <Card className="group h-full p-4 transition-colors hover:border-teal-600/60">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] font-bold text-teal-400">0{s.n}</span>
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    s.n <= 5 ? "bg-teal-400" : s.n === 6 ? "bg-ruby-400" : "bg-forest-400",
                  )}
                />
              </div>
              <h3 className="mt-2 font-display text-[15px] font-bold">{s.title}</h3>
              <p className="mt-1 font-mono text-[10.5px] text-mist-500">{s.chain}</p>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------ router bento ------------------------------ */

const ROUTER_FEATURES = [
  {
    icon: <Route size={18} />,
    title: "Failover & exponential backoff",
    body: "429 or 5xx? The same model is retried on the other provider, then the next preferred model. Max 3 attempts with 1s → 2s → 4s backoff.",
    tone: "teal",
    span: true,
  },
  {
    icon: <CircuitBoard size={18} />,
    title: "Circuit breaker",
    body: "3 consecutive failures open the circuit for 60 seconds — dead routes stop burning attempts.",
    tone: "ruby",
  },
  {
    icon: <Trophy size={18} />,
    title: "Adaptive leaderboard",
    body: "Success rate and latency persist per route in Postgres and re-rank future routing in real time.",
    tone: "teal",
  },
  {
    icon: <Eye size={18} />,
    title: "Vision auto-activation",
    body: "Upload a logo or references and routing locks strictly to the multimodal Nano Omni route.",
    tone: "ruby",
  },
  {
    icon: <Scale size={18} />,
    title: "Ensemble mode",
    body: "Race two routes in parallel and let a flagship reasoning model judge the winner.",
    tone: "teal",
    span: true,
  },
];

function RouterBento() {
  return (
    <section className="border-y border-ink-800 bg-ink-950/50">
      <div className="mx-auto w-full max-w-7xl px-4 py-24 sm:px-6">
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }} className="max-w-2xl">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-teal-300">
            <Zap size={13} /> Model Router Engine
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Ten routes. One self-healing engine.
          </h2>
        </motion.div>

        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ROUTER_FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-30px" }}
              custom={i}
              className={cn(f.span && "lg:col-span-2")}
            >
              <Card
                className={cn(
                  "h-full p-5 transition-all hover:-translate-y-1",
                  f.tone === "ruby" ? "hover:border-ruby-500/60" : "hover:border-teal-500/60",
                )}
              >
                <span
                  className={cn(
                    "inline-flex size-10 items-center justify-center rounded-lg border",
                    f.tone === "ruby"
                      ? "border-ruby-600/50 bg-ruby-600/15 text-ruby-300"
                      : "border-teal-600/50 bg-teal-600/15 text-teal-300",
                  )}
                >
                  {f.icon}
                </span>
                <h3 className="mt-3 font-display text-base font-bold">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-mist-300">{f.body}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------ model lineup ------------------------------ */

function ModelLineup() {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-24 sm:px-6">
      <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }} className="max-w-2xl">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-forest-300">
          <Terminal size={13} /> Meet the swarm
        </p>
        <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Real specialists. Distinct hats. Ten live routes behind them.
        </h2>
        <p className="mt-3 text-sm text-mist-300">
          Every routed model appears as an IT specialist on your build — architect, designer, strategist, developer
          and tester. Under each hat: five models served over OpenRouter and the Kilocode gateway.
        </p>
      </motion.div>

      <div className="mt-10 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {SWARM_ORDER.map((key, i) => {
          const persona = PERSONAS[key];
          const modelDef = DEFAULT_REGISTRY.models.find((m) => m.key === key);
          return (
            <motion.div
              key={key}
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-30px" }}
              custom={i}
              whileHover={{ y: -5 }}
              transition={{ type: "spring", stiffness: 280, damping: 20 }}
            >
              <Card className="flex h-full flex-col p-4 transition-colors hover:border-teal-500/60">
                <div className="flex items-center justify-between">
                  <span className="flex size-11 items-center justify-center rounded-full border border-ink-700 bg-ink-800">
                    <Hat kind={persona.hat} size={24} />
                  </span>
                  <Badge tone={i % 2 === 0 ? "teal" : "ruby"}>{persona.modelKey === "nemotron-nano-omni" ? "vision" : persona.role.split(" ")[0]}</Badge>
                </div>
                <h3 className="mt-3 font-display text-[15px] font-bold leading-tight">{persona.name}</h3>
                <p className="text-[11px] font-bold uppercase tracking-wide text-teal-300">{persona.role}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-mist-300">{persona.specialty}</p>
                <div className="mt-auto pt-3">
                  <p className="truncate border-t border-ink-700 pt-2.5 font-mono text-[10px] text-mist-500">
                    {modelDef?.providers.kilocode.modelId.replace(":free", "") ?? key}
                  </p>
                  <div className="mt-2 flex gap-1.5">
                    <span className="rounded bg-teal-600/30 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase text-teal-300">openrouter</span>
                    <span className="rounded bg-ruby-600/40 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase text-ruby-300">kilocode</span>
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

/* ------------------------------- output section --------------------------- */

function OutputSection() {
  const files = ["index.html", "styles.css", "script.js", "assets/"];
  const specs = [
    "Semantic HTML5 · CSS · Vanilla JS — zero frameworks",
    "Mobile-first, WCAG AA accessible",
    "Sticky nav · hero · services · gallery · testimonials",
    "Validated contact form · click-to-call · Maps embed",
    "LocalBusiness schema · Open Graph SEO",
    "Sandboxed live preview · one-click ZIP export",
  ];
  return (
    <section className="border-t border-ink-800 bg-ink-950/50">
      <div className="mx-auto grid w-full max-w-7xl items-center gap-12 px-4 py-24 sm:px-6 lg:grid-cols-2">
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }}>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-teal-300">
            <Package size={13} /> What ships
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            A complete, self-contained website — not a mockup.
          </h2>
          <ul className="mt-6 space-y-2.5">
            {specs.map((s, i) => (
              <motion.li
                key={s}
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                custom={i}
                className="flex items-start gap-2.5 text-sm text-mist-300"
              >
                <CheckDot /> {s}
              </motion.li>
            ))}
          </ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="panel-glow-teal relative rounded-xl border border-ink-600 bg-ink-850 p-5">
            <div className="flex items-center justify-between border-b border-ink-700 pb-3">
              <span className="flex items-center gap-2 font-mono text-xs text-mist-300">
                <FileCode2 size={14} className="text-forest-300" /> delivery.zip
              </span>
              <Badge tone="ok">export ready</Badge>
            </div>
            <ul className="divide-y divide-ink-700/60">
              {files.map((f, i) => (
                <motion.li
                  key={f}
                  initial={{ opacity: 0, x: 14 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.15 + i * 0.08 }}
                  className="flex items-center justify-between py-3 font-mono text-[13px]"
                >
                  <span className="text-mist-100">{f}</span>
                  <span className="text-[10px] uppercase tracking-wider text-mist-500">{f.endsWith("/") ? "folder" : "utf-8"}</span>
                </motion.li>
              ))}
            </ul>
            <p className="pt-3 text-[11px] text-mist-500">Rendered live in a sandboxed iframe · ZIP bundles everything, assets included.</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function CheckDot() {
  return (
    <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-forest-600/30">
      <span className="size-1.5 rounded-full bg-forest-300" />
    </span>
  );
}

/* ---------------------------------- CTA ----------------------------------- */

function FinalCta() {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-24 sm:px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-2xl border border-ink-600 px-6 py-16 text-center"
      >
        <div aria-hidden className="jewel-ring absolute inset-0 opacity-[0.08]" />
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 size-[480px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-30 blur-3xl"
          style={{ background: "radial-gradient(circle, rgb(74 144 226 / 0.45), transparent 65%)" }}
        />
        <Logo size={40} />
        <h2 className="mx-auto mt-6 max-w-2xl font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Your business deserves a website built by an <span className="text-jewel">ensemble</span>.
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-mist-300">
          Three intake steps. One live console. Eight stages of routed intelligence. A shippable site in minutes.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/wizard"
            className="group flex items-center gap-2 rounded-lg bg-forest-600 px-7 py-3 text-sm font-bold text-mist-100 shadow-[0_12px_36px_-10px_rgb(62_86_65)] transition hover:bg-forest-500"
          >
            Launch the intake wizard
            <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link href="/analytics" className="flex items-center gap-2 rounded-lg border border-ink-600 px-7 py-3 text-sm font-bold transition hover:border-ruby-500/70 hover:text-ruby-300">
            Watch the leaderboard
          </Link>
        </div>
      </motion.div>
    </section>
  );
}

/* ---------------------------------- page ---------------------------------- */

export default function LandingPage() {
  return (
    <>
      <Hero />
      <TelemetryBand />
      <PipelineSection />
      <RouterBento />
      <ModelLineup />
      <OutputSection />
      <FinalCta />
    </>
  );
}
