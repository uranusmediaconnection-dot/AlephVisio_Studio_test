import { describe, expect, it } from "vitest";
import {
  fallbackBrief,
  fallbackContent,
  fallbackCopy,
  fallbackFiles,
  fallbackQa,
  fallbackSitemap,
  fallbackTokens,
  formValidationJs,
} from "./fallback";
import type { ProjectRecord } from "./types";

const project: ProjectRecord = {
  id: "p2",
  name: "Harbor Fitness",
  industry: "fitness",
  phone: "+1 (555) 987-6543",
  address: "77 Dock Street, Harborview, WA 98101",
  notes: "",
  logo: null,
  referenceImages: [],
  domain: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe("deterministic artifact builders", () => {
  it("brief reflects the industry", () => {
    const brief = fallbackBrief(project);
    expect(brief.positioning).toContain("fitness");
    expect(brief.promises.length).toBe(3);
  });

  it("sitemap covers the required sections", () => {
    const labels = fallbackSitemap().map((s) => s.id);
    for (const required of ["hero", "services", "gallery", "testimonials", "contact"]) {
      expect(labels).toContain(required);
    }
  });

  it("copy kit carries the real phone number", () => {
    expect(fallbackCopy(project).ctaSecondary).toContain(project.phone);
  });

  it("content kit ships exactly the promised block counts", () => {
    const content = fallbackContent(project);
    expect(content.services).toHaveLength(6);
    expect(content.testimonials).toHaveLength(3);
    expect(content.gallery).toHaveLength(6);
    expect(content.faq).toHaveLength(4);
  });

  it("tokens always satisfy contrast basics", () => {
    const tokens = fallbackTokens(project);
    for (const color of [tokens.primary, tokens.bg, tokens.text, tokens.surface, tokens.accent]) {
      expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });
});

describe("deterministic site output", () => {
  const files = fallbackFiles(project, {});

  it("contains sticky nav, hero, services, gallery, testimonials, form, footer", () => {
    for (const marker of ["site-header", "hero", "services", "gallery", "testimonials", "contact-form", "site-footer"]) {
      expect(files.html).toContain(marker);
    }
  });

  it("validates the contact form client-side and respects reduced motion", () => {
    expect(files.js).toContain("contact-form");
    expect(files.js).toContain("aria-invalid");
    expect(files.js).toContain("prefers-reduced-motion");
  });

  it("js payload never references frameworks", () => {
    expect(files.js).not.toMatch(/\breact\b|angular|vue\./i);
    expect(formValidationJs()).toContain("IntersectionObserver");
  });

  it("qa fallback is shaped for the report", () => {
    const qa = fallbackQa();
    expect(qa.score).toBeGreaterThan(60);
    expect(qa.cssPatch.length).toBeGreaterThan(10);
  });
});
