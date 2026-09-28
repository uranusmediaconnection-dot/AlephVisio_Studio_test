"use client";

import { create } from "zustand";

export interface UploadedImage {
  mime: string;
  dataUrl: string;
  name: string;
}

export interface DomainResult {
  domain: string;
  available: boolean;
  status: "available" | "taken" | "unknown";
  cached: boolean;
}

interface WizardStore {
  step: number;
  name: string;
  industry: string;
  phone: string;
  address: string;
  notes: string;
  logo: UploadedImage | null;
  references: UploadedImage[];
  slug: string;
  domainResults: DomainResult[];
  domainLoading: boolean;
  domainChecked: boolean;
  selectedDomain: string | null;
  submitting: boolean;
  error: string | null;
  set: (patch: Partial<Omit<WizardStore, "set" | "checkDomains" | "submit" | "goTo">>) => void;
  goTo: (step: number) => void;
  checkDomains: () => Promise<void>;
  submit: () => Promise<string | null>;
}

const MAX_FILE_BYTES = 1_500_000;

export function fileToImage(file: File): Promise<UploadedImage> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) return reject(new Error("only image files are accepted"));
    if (file.size > MAX_FILE_BYTES) return reject(new Error("image exceeds 1.5MB limit"));
    const reader = new FileReader();
    reader.onload = () => resolve({ mime: file.type, dataUrl: String(reader.result), name: file.name });
    reader.onerror = () => reject(new Error("could not read file"));
    reader.readAsDataURL(file);
  });
}

export const useWizardStore = create<WizardStore>((set, get) => ({
  step: 1,
  name: "",
  industry: "",
  phone: "",
  address: "",
  notes: "",
  logo: null,
  references: [],
  slug: "",
  domainResults: [],
  domainLoading: false,
  domainChecked: false,
  selectedDomain: null,
  submitting: false,
  error: null,

  set: (patch) => set(patch),
  goTo: (step) => set({ step, error: null }),

  checkDomains: async () => {
    const { name } = get();
    if (!name.trim()) {
      set({ error: "Company name is required to check domains." });
      return;
    }
    set({ domainLoading: true, error: null });
    try {
      const res = await fetch(`/api/domains/check?name=${encodeURIComponent(name)}`);
      const data = (await res.json()) as { slug: string; results: DomainResult[] };
      const firstAvailable = data.results.find((r) => r.available)?.domain ?? null;
      set({
        slug: data.slug,
        domainResults: data.results,
        domainChecked: true,
        selectedDomain: firstAvailable,
        domainLoading: false,
      });
    } catch {
      set({ domainLoading: false, error: "Domain check failed — network unavailable. You can skip this step." });
    }
  },

  submit: async () => {
    const s = get();
    set({ submitting: true, error: null });
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: s.name.trim(),
          industry: s.industry,
          phone: s.phone.trim(),
          address: s.address.trim(),
          notes: s.notes.trim(),
          logo: s.logo ? { mime: s.logo.mime, dataUrl: s.logo.dataUrl } : null,
          referenceImages: s.references.map((r) => ({ mime: r.mime, dataUrl: r.dataUrl })),
          domain: s.selectedDomain,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.project?.id) {
        set({ submitting: false, error: data?.error ?? "Could not create the project." });
        return null;
      }
      set({ submitting: false });
      return data.project.id as string;
    } catch {
      set({ submitting: false, error: "Network error while creating the project." });
      return null;
    }
  },
}));
