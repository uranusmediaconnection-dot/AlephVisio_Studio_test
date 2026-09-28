import { describe, expect, it } from "vitest";
import { extractJson, parseFencedFiles, truncate } from "./utils";

describe("extractJson", () => {
  it("parses clean JSON objects", () => {
    expect(extractJson<{ a: number }>('{"a": 1}')).toEqual({ a: 1 });
  });

  it("parses JSON wrapped in code fences", () => {
    const text = 'Here you go:\n```json\n{"a": [1, 2]}\n```\nDone.';
    expect(extractJson<{ a: number[] }>(text)).toEqual({ a: [1, 2] });
  });

  it("finds JSON embedded in prose", () => {
    const text = 'Sure! The result is {"headline": "Hi"} as requested.';
    expect(extractJson<{ headline: string }>(text)).toEqual({ headline: "Hi" });
  });

  it("parses top-level arrays", () => {
    expect(extractJson<number[]>("[1, 2, 3]")).toEqual([1, 2, 3]);
  });

  it("handles nested braces and strings with braces inside", () => {
    const text = '{"a": "text with } brace", "b": {"c": 2}}';
    expect(extractJson<{ a: string; b: { c: number } }>(text)).toEqual({
      a: "text with } brace",
      b: { c: 2 },
    });
  });

  it("returns null for garbage", () => {
    expect(extractJson("no json here at all")).toBeNull();
    expect(extractJson("")).toBeNull();
  });
});

describe("parseFencedFiles", () => {
  it("extracts all three closed blocks", () => {
    const text = "```html\n<h1>x</h1>\n```\n```css\nbody{}\n```\n```js\nvar a=1;\n```";
    const parsed = parseFencedFiles(text);
    expect(parsed.html).toBe("<h1>x</h1>");
    expect(parsed.css).toBe("body{}");
    expect(parsed.js).toBe("var a=1;");
  });

  it("recovers a truncated final fence (token cap / dropped stream)", () => {
    const longHtml = "<!DOCTYPE html><html><body>" + "<p>row</p>".repeat(30) + "<footer>f</footer>";
    const text = "```html\n" + longHtml + "\n```\n```css\nbody{color:red}\n```\n```js\n" + "console.log(1);".repeat(20);
    const parsed = parseFencedFiles(text);
    expect(parsed.html).toContain("<footer>");
    expect(parsed.css).toBe("body{color:red}");
    expect(parsed.js).toContain("console.log(1);");
  });

  it("returns undefined for absent blocks", () => {
    const parsed = parseFencedFiles("plain text, no fences");
    expect(parsed.html).toBeUndefined();
    expect(parsed.css).toBeUndefined();
    expect(parsed.js).toBeUndefined();
  });
});

describe("truncate", () => {
  it("keeps short strings intact and clips long ones with an ellipsis", () => {
    expect(truncate("abc", 10)).toBe("abc");
    expect(truncate("abcdefghij", 5)).toBe("abcde…");
  });
});
