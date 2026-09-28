"use client";

import { useRef, useState } from "react";
import { CheckCircle2, HelpCircle, Image as ImageIcon, Loader2, MinusCircle, Upload, X } from "lucide-react";
import { Badge, Button, Input, Label, Select, Spinner, Textarea } from "@/components/ui";
import { INDUSTRIES } from "@/lib/industries";
import { cn } from "@/lib/utils";
import { fileToImage, useWizardStore, type UploadedImage } from "@/store/wizard";

/* ------------------------------ Step 1 · Company -------------------------- */

export function StepCompany({ errors }: { errors: Record<string, string> }) {
  const s = useWizardStore();
  return (
    <div className="grid gap-5">
      <div>
        <Label htmlFor="w-name">Company name *</Label>
        <Input
          id="w-name"
          placeholder="e.g. Meridian Dental Group"
          value={s.name}
          onChange={(e) => s.set({ name: e.target.value })}
          aria-invalid={Boolean(errors.name)}
        />
        {errors.name && <FieldError msg={errors.name} />}
      </div>
      <div>
        <Label htmlFor="w-industry">Industry *</Label>
        <Select
          id="w-industry"
          value={s.industry}
          onChange={(e) => s.set({ industry: e.target.value })}
          aria-invalid={Boolean(errors.industry)}
        >
          <option value="" disabled>
            Select the closest industry…
          </option>
          {INDUSTRIES.map((i) => (
            <option key={i.id} value={i.id}>
              {i.label}
            </option>
          ))}
        </Select>
        {errors.industry && <FieldError msg={errors.industry} />}
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="w-phone">Phone *</Label>
          <Input
            id="w-phone"
            type="tel"
            placeholder="+1 (555) 012-3456"
            value={s.phone}
            onChange={(e) => s.set({ phone: e.target.value })}
            aria-invalid={Boolean(errors.phone)}
          />
          {errors.phone && <FieldError msg={errors.phone} />}
        </div>
        <div>
          <Label htmlFor="w-address">Street address *</Label>
          <Input
            id="w-address"
            placeholder="412 Harbor Ave, Portside, OR 97201"
            value={s.address}
            onChange={(e) => s.set({ address: e.target.value })}
            aria-invalid={Boolean(errors.address)}
          />
          {errors.address && <FieldError msg={errors.address} />}
        </div>
      </div>
      <div>
        <Label htmlFor="w-notes">Anything the AI should know? (optional)</Label>
        <Textarea
          id="w-notes"
          placeholder="Differentiators, tone preferences, specialties…"
          value={s.notes}
          onChange={(e) => s.set({ notes: e.target.value })}
        />
      </div>
    </div>
  );
}

function FieldError({ msg }: { msg: string }) {
  return <p className="mt-1 text-xs font-semibold text-ember-400">{msg}</p>;
}

/* ---------------------------- Step 2 · Brand assets ------------------------ */

export function StepAssets() {
  const s = useWizardStore();
  const [busy, setBusy] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const refsRef = useRef<HTMLInputElement>(null);

  const addImage = async (file: File | undefined, target: "logo" | "reference") => {
    if (!file) return;
    setBusy(target);
    setLocalError(null);
    try {
      const img = await fileToImage(file);
      if (target === "logo") s.set({ logo: img });
      else if (s.references.length < 3) s.set({ references: [...s.references, img] });
      else setLocalError("Maximum 3 reference images.");
    } catch (err) {
      setLocalError((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="grid gap-6">
      <p className="text-sm text-mist-300">
        Optional, but recommended — uploads enable <span className="font-bold text-teal-400">vision routing</span>{" "}
        (builds are then handled strictly by the multimodal Nemotron Nano Omni route).
      </p>

      <div>
        <Label>Logo</Label>
        <input ref={logoRef} type="file" accept="image/*" hidden onChange={(e) => addImage(e.target.files?.[0], "logo")} />
        {s.logo ? (
          <Thumb img={s.logo} onRemove={() => s.set({ logo: null })} />
        ) : (
          <DropZone
            busy={busy === "logo"}
            label="Drop the logo here or click to browse"
            hint="PNG · JPG · SVG — up to 1.5MB"
            onClick={() => logoRef.current?.click()}
          />
        )}
      </div>

      <div>
        <Label>Reference images ({s.references.length}/3)</Label>
        <input
          ref={refsRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            void addImage(e.target.files?.[0], "reference");
            e.target.value = "";
          }}
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {s.references.map((r, i) => (
            <Thumb key={i} img={r} onRemove={() => s.set({ references: s.references.filter((_, j) => j !== i) })} />
          ))}
          {s.references.length < 3 && (
            <button
              onClick={() => refsRef.current?.click()}
              className="flex min-h-24 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-ink-600 p-3 text-xs font-semibold text-mist-500 transition hover:border-teal-500/60 hover:text-teal-400"
            >
              {busy === "reference" ? <Spinner /> : <ImageIcon size={18} />}
              Add image
            </button>
          )}
        </div>
      </div>

      {localError && <FieldError msg={localError} />}
    </div>
  );
}

function Thumb({ img, onRemove }: { img: UploadedImage; onRemove: () => void }) {
  return (
    <div className="relative inline-block">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={img.dataUrl} alt={img.name} className="h-24 w-32 rounded-lg border border-ink-600 bg-white object-contain p-1" />
      <button
        onClick={onRemove}
        aria-label="Remove image"
        className="absolute -right-2 -top-2 rounded-full border border-ink-600 bg-ink-800 p-1 text-mist-300 hover:text-ember-400"
      >
        <X size={12} />
      </button>
    </div>
  );
}

function DropZone({ label, hint, onClick, busy }: { label: string; hint: string; onClick: () => void; busy: boolean }) {
  return (
    <button
      onClick={onClick}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        onClick();
      }}
      className="flex w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-ink-600 p-8 text-center transition hover:border-teal-500/60"
    >
      {busy ? <Loader2 size={20} className="animate-spin text-teal-400" /> : <Upload size={20} className="text-mist-500" />}
      <span className="text-sm font-semibold text-mist-100">{label}</span>
      <span className="text-xs text-mist-500">{hint}</span>
    </button>
  );
}

/* ----------------------------- Step 3 · Domain ----------------------------- */

export function StepDomain({ errors }: { errors: Record<string, string> }) {
  const s = useWizardStore();
  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-52 flex-1">
          <Label htmlFor="w-domain-name">Company name used for the domain</Label>
          <Input id="w-domain-name" value={s.name} readOnly className="opacity-80" />
          <p className="mt-1 flex items-center gap-1 text-xs text-mist-500">
            <HelpCircle size={12} /> Sanitized to <span className="font-mono text-teal-400">{s.slug || "…"}.tld</span> · checked via RDAP (no API key) · cached 15 min
          </p>
        </div>
        <Button variant="outline" onClick={() => void s.checkDomains()} disabled={s.domainLoading} className="mb-0.5">
          {s.domainLoading ? <Spinner /> : <CheckCircle2 size={15} />}
          {s.domainChecked ? "Re-check availability" : "Check availability"}
        </Button>
      </div>

      {s.domainChecked && s.domainResults.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-ink-700">
          {s.domainResults.map((r) => {
            const selected = s.selectedDomain === r.domain;
            const selectable = r.status === "available";
            return (
              <button
                key={r.domain}
                disabled={!selectable}
                onClick={() => s.set({ selectedDomain: selected ? null : r.domain })}
                className={cn(
                  "flex w-full items-center justify-between border-b border-ink-700/60 px-4 py-3 text-left text-sm last:border-0",
                  selectable ? "transition hover:bg-ink-800/70" : "cursor-not-allowed opacity-60",
                  selected && "bg-teal-500/10",
                )}
              >
                <span className="flex items-center gap-2 font-mono text-[13px]">
                  {selectable ? (
                    selected ? <CheckCircle2 size={15} className="text-teal-400" /> : <MinusCircle size={15} className="text-mist-500" />
                  ) : (
                    <X size={15} className="text-ember-400" />
                  )}
                  {r.domain}
                </span>
                <span className="flex items-center gap-2">
                  {r.cached && <span className="text-[10px] uppercase text-mist-500">cached</span>}
                  {r.status === "available" && <Badge tone="ok">available</Badge>}
                  {r.status === "taken" && <Badge tone="error">taken</Badge>}
                  {r.status === "unknown" && <Badge tone="warn">unknown</Badge>}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {errors.domain && <FieldError msg={errors.domain} />}
      <p className="text-xs text-mist-500">
        You can skip domain selection — the site is generated either way and the domain is used for SEO tags.
      </p>
    </div>
  );
}
