import { describe, expect, it } from "vitest";
import { buildPreviewDoc, enforceCompliance, failingChecks, validateSite } from "./assemble";
import { fallbackFiles } from "./fallback";
import type { ProjectRecord } from "./types";

const project: ProjectRecord = {
  id: "p1",
  name: "Test Bakery",
  industry: "bakery",
  phone: "+1 (555) 123-4567",
  address: "9 Crumb Lane, Bakerville, CA 90210",
  notes: "",
  logo: null,
  referenceImages: [],
  domain: "testbakery.com",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe("validateSite on the deterministic build", () => {
  const files = fallbackFiles(project, {});

  it("passes every compliance check out of the box", () => {
    const checks = validateSite(files, project);
    const failing = checks.filter((c) => !c.pass);
    expect(failing, failing.map((f) => f.name).join(", ")).toEqual([]);
    expect(checks.length).toBeGreaterThanOrEqual(17);
  });

  it("embeds the real business phone, address and click-to-call link", () => {
    expect(files.html).toContain(project.phone);
    expect(files.html).toContain(project.address);
    expect(files.html).toMatch(/href="tel:\+?15551234567"/);
  });

  it("embeds the Google Maps iframe for the address", () => {
    expect(files.html).toContain("google.com/maps");
    expect(files.html).toContain(encodeURIComponent(project.address));
  });

  it("ships LocalBusiness schema and Open Graph tags", () => {
    expect(files.html).toContain("application/ld+json");
    expect(files.html).toContain("LocalBusiness");
    expect(files.html).toContain('property="og:title"');
  });
});

describe("enforceCompliance repairs broken output", () => {
  it("injects every missing requirement into a bare-bones page", () => {
    const broken = {
      html: `<!DOCTYPE html><html><head><title>x</title></head><body><h1>hi</h1><footer>bye</footer></body></html>`,
      css: "body{}",
      js: "",
    };
    const fixed = enforceCompliance(broken, project);
    const checks = validateSite(fixed, project);
    const names = checks.filter((c) => !c.pass).map((c) => c.name);
    // html-only structural checks are expected to pass after enforcement
    expect(names).not.toContain("LocalBusiness JSON-LD");
    expect(names).not.toContain("Open Graph tags");
    expect(names).not.toContain("Click-to-call tel: link");
    expect(names).not.toContain("Google Maps iframe");
    expect(names).not.toContain("Business phone in page");
    expect(fixed.js.trim().length).toBeGreaterThan(50);
  });

  it("never strips a valid existing JS payload", () => {
    const good = fallbackFiles(project, {});
    const fixed = enforceCompliance(good, project);
    expect(fixed.js).toBe(good.js);
  });
});

describe("enforceCompliance skeleton bootstrap", () => {
  it("wraps a bare fragment into a full document with anchors for injection", () => {
    const fragment = { html: "<h1>Hi</h1><p>text</p>", css: "h1{}", js: "" };
    const fixed = enforceCompliance(fragment, project);
    expect(fixed.html).toMatch(/^<!DOCTYPE html>/i);
    expect(fixed.html).toContain("<head");
    expect(fixed.html).toContain('property="og:title"');
    expect(fixed.html).toContain("LocalBusiness");
    expect(fixed.html).toMatch(/href="tel:/);
    expect(fixed.html).toContain("google.com/maps");
  });

});

describe("failingChecks", () => {
  it("reports concrete gaps for the repair prompt", () => {
    const gaps = failingChecks({ html: "<html></html>", css: "", js: "" }, project);
    expect(gaps.length).toBeGreaterThan(5);
    expect(gaps).toContain("Click-to-call tel: link");
  });
});

describe("buildPreviewDoc", () => {
  it("inlines styles.css and script.js for the sandboxed iframe", () => {
    const files = fallbackFiles(project, {});
    const doc = buildPreviewDoc(files);
    expect(doc).not.toContain('href="styles.css"');
    expect(doc).not.toContain('src="script.js"');
    expect(doc).toContain(files.css.slice(0, 40));
    expect(doc).toContain(files.js.slice(0, 40));
  });
});
