/** Small shared helpers (server + client safe — no node imports here). */

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function uid(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/**
 * Robustly extract the first JSON object/array from an LLM reply,
 * tolerating code fences and surrounding prose.
 */
export function extractJson<T = unknown>(text: string): T | null {
  if (!text) return null;
  const cleaned = text.replace(/```(?:json)?/gi, "```").trim();
  const fenced = cleaned.match(/```([\s\S]*?)```/);
  const candidates: string[] = [];
  if (fenced?.[1]) candidates.push(fenced[1]);
  const firstBrace = cleaned.indexOf("{");
  const firstBracket = cleaned.indexOf("[");
  const start =
    firstBracket !== -1 && (firstBracket < firstBrace || firstBrace === -1)
      ? firstBracket
      : firstBrace;
  const open = start === firstBracket && firstBracket !== -1 ? "[" : "{";
  const close = open === "[" ? "]" : "}";
  if (start !== -1) {
    let depth = 0;
    let inStr = false;
    let esc = false;
    for (let i = start; i < cleaned.length; i++) {
      const ch = cleaned[i];
      if (inStr) {
        if (esc) esc = false;
        else if (ch === "\\") esc = true;
        else if (ch === '"') inStr = false;
        continue;
      }
      if (ch === '"') inStr = true;
      else if (ch === open) depth++;
      else if (ch === close) {
        depth--;
        if (depth === 0) {
          candidates.push(cleaned.slice(start, i + 1));
          break;
        }
      }
    }
  }
  candidates.push(cleaned);
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as T;
    } catch {
      /* try next candidate */
    }
  }
  return null;
}

/**
 * Extract fenced ```html / ```css / ```js blocks from a code-gen reply.
 * Tolerates truncated streams: an opening fence without a closing fence
 * (token cap / dropped connection) is captured through end-of-text.
 */
export function parseFencedFiles(text: string): { html?: string; css?: string; js?: string } {
  const grab = (lang: string): string | undefined => {
    const closed = new RegExp("```" + lang + "[^\\n]*\\n([\\s\\S]*?)```", "i");
    const m = text.match(closed);
    if (m?.[1]?.trim()) return m[1].trim();
    const open = new RegExp("```" + lang + "[^\\n]*\\n([\\s\\S]*)$", "i");
    const m2 = text.match(open);
    const candidate = m2?.[1];
    if (candidate) {
      // Only accept an unterminated fence if it isn't the start of a later block.
      const nextFence = candidate.search(/```(?:css|js|html)/i);
      const slice = nextFence === -1 ? candidate : candidate.slice(0, nextFence);
      if (slice.trim().length > 120) return slice.trim();
    }
    return undefined;
  };
  return { html: grab("html"), css: grab("css"), js: grab("js") };
}

export function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + "…" : text;
}

export function timeAgo(iso: string | Date): string {
  const then = new Date(iso).getTime();
  const s = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(t);
      reject(new Error("aborted"));
    });
  });
}
