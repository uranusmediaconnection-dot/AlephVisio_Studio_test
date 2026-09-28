"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Rocket } from "lucide-react";
import { z } from "zod";
import { StepAssets, StepCompany, StepDomain } from "@/components/wizard-steps";
import { Button, Card, Spinner } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useWizardStore } from "@/store/wizard";

const step1Schema = z.object({
  name: z.string().trim().min(2, "Company name needs at least 2 characters"),
  industry: z.string().min(1, "Pick the closest industry"),
  phone: z
    .string()
    .trim()
    .regex(/^[+\d][\d\s().-]{5,}$/, "Enter a valid phone number"),
  address: z.string().trim().min(5, "Enter the full street address"),
});

const STEPS = [
  { n: 1, title: "Company", desc: "Core business details" },
  { n: 2, title: "Brand assets", desc: "Logo & references (optional)" },
  { n: 3, title: "Domain", desc: "RDAP availability check" },
];

export default function WizardPage() {
  const router = useRouter();
  const s = useWizardStore();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateStep = (step: number): boolean => {
    if (step === 1) {
      const parsed = step1Schema.safeParse({ name: s.name, industry: s.industry, phone: s.phone, address: s.address });
      if (!parsed.success) {
        const map: Record<string, string> = {};
        for (const issue of parsed.error.issues) map[String(issue.path[0])] = issue.message;
        setErrors(map);
        return false;
      }
    }
    setErrors({});
    return true;
  };

  const next = () => {
    if (!validateStep(s.step)) return;
    if (s.step === 2 && !s.domainChecked) void s.checkDomains();
    s.goTo(Math.min(3, s.step + 1));
  };

  const finish = async () => {
    if (!validateStep(1)) {
      s.goTo(1);
      return;
    }
    const id = await s.submit();
    if (id) router.push(`/projects/${id}?autostart=1`);
  };

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-2xl font-bold tracking-tight">Intake wizard</h1>
      <p className="mt-1 text-sm text-mist-300">
        Three steps. After that, a rotating ensemble of AI models builds the full site stage by stage.
      </p>

      {/* Stepper rail */}
      <ol className="mt-6 grid grid-cols-3 gap-2" aria-label="Wizard progress">
        {STEPS.map((step) => {
          const state = s.step === step.n ? "active" : s.step > step.n ? "done" : "todo";
          return (
            <li key={step.n}>
              <button
                onClick={() => step.n < s.step && s.goTo(step.n)}
                className={cn(
                  "w-full rounded-lg border px-3 py-2.5 text-left transition",
                  state === "active" && "border-teal-500/60 bg-teal-500/10",
                  state === "done" && "border-forest-500/40 bg-ink-900",
                  state === "todo" && "border-ink-700 bg-ink-900/50 opacity-70",
                )}
                disabled={step.n > s.step}
              >
                <span
                  className={cn(
                    "text-[11px] font-bold uppercase tracking-wider",
                    state === "active" ? "text-teal-400" : state === "done" ? "text-forest-400" : "text-mist-500",
                  )}
                >
                  Step {step.n} {state === "done" && "✓"}
                </span>
                <span className="block font-display text-sm font-bold">{step.title}</span>
                <span className="block text-[11px] text-mist-500">{step.desc}</span>
              </button>
            </li>
          );
        })}
      </ol>

      <Card className="mt-5 p-6 sm:p-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={s.step}
            initial={{ opacity: 0, x: 14 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -14 }}
            transition={{ duration: 0.18 }}
          >
            {s.step === 1 && <StepCompany errors={errors} />}
            {s.step === 2 && <StepAssets />}
            {s.step === 3 && <StepDomain errors={errors} />}
          </motion.div>
        </AnimatePresence>

        {s.error && <p className="mt-4 rounded-lg border border-ember-500/40 bg-ember-500/10 px-3 py-2 text-sm font-semibold text-ember-400">{s.error}</p>}

        <div className="mt-8 flex items-center justify-between border-t border-ink-700/70 pt-5">
          <Button variant="ghost" onClick={() => s.goTo(Math.max(1, s.step - 1))} disabled={s.step === 1}>
            <ArrowLeft size={15} /> Back
          </Button>
          {s.step < 3 ? (
            <Button onClick={next}>
              Continue <ArrowRight size={15} />
            </Button>
          ) : (
            <Button onClick={() => void finish()} disabled={s.submitting}>
              {s.submitting ? <Spinner /> : <Rocket size={15} />}
              Create project & start build
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
