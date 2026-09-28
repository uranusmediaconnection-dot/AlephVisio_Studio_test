import { describe, expect, it } from "vitest";
import { sanitizeSlug, TLDS } from "./rdap";

describe("sanitizeSlug", () => {
  it("lowercases and hyphenates spaces", () => {
    expect(sanitizeSlug("Meridian Dental Group")).toBe("meridian-dental-group");
  });

  it("strips punctuation and special characters", () => {
    expect(sanitizeSlug("O'Reilly & Sons, Ltd.!")).toBe("o-reilly-sons-ltd");
  });

  it("folds accented characters", () => {
    expect(sanitizeSlug("Événement & Gastronomie")).toBe("evenement-gastronomie");
  });

  it("caps length at 30 characters without trailing hyphens", () => {
    const slug = sanitizeSlug("A Very Long Company Name That Definitely Exceeds The Limit");
    expect(slug.length).toBeLessThanOrEqual(30);
    expect(slug.endsWith("-")).toBe(false);
  });

  it("returns empty for unusable names", () => {
    expect(sanitizeSlug("!!!")).toBe("");
    expect(sanitizeSlug("")).toBe("");
  });

  it("probes six TLDs", () => {
    expect(TLDS).toEqual(["com", "net", "org", "io", "co", "ai"]);
  });
});
