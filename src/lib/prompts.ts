import { industryById } from "./industries";
import type {
  ChatMessage,
  PipelineArtifacts,
  ProjectRecord,
  StageDescriptor,
  VisionContentPart,
} from "./types";

/** The 8-stage generation pipeline, each with its preferred model chain. */
export const STAGES: StageDescriptor[] = [
  { index: 1, key: "brief", title: "Brand Brief", chain: ["nemotron-ultra", "nemotron-super"], usesVision: true, json: true, temperature: 0.7, maxTokens: 1400 },
  { index: 2, key: "sitemap", title: "Sitemap", chain: ["nemotron-ultra", "nemotron-super"], usesVision: false, json: true, temperature: 0.5, maxTokens: 1200 },
  { index: 3, key: "copy", title: "Copy & Voice", chain: ["inkling", "nemotron-super"], usesVision: false, json: true, temperature: 0.9, maxTokens: 1500 },
  { index: 4, key: "content", title: "Content Blocks", chain: ["nemotron-super", "inkling"], usesVision: false, json: true, temperature: 0.8, maxTokens: 3000 },
  { index: 5, key: "tokens", title: "Design Tokens", chain: ["nemotron-ultra", "nemotron-super"], usesVision: true, json: true, temperature: 0.6, maxTokens: 900 },
  { index: 6, key: "codegen", title: "Code Generation", chain: ["laguna", "nemotron-super"], usesVision: true, json: false, temperature: 0.35, maxTokens: 8000 },
  { index: 7, key: "validate", title: "Validation Loop", chain: ["nemotron-nano-omni", "nemotron-super"], usesVision: true, json: false, temperature: 0.2, maxTokens: 8000 },
  { index: 8, key: "qa", title: "Visual QA", chain: ["nemotron-nano-omni"], usesVision: true, json: true, temperature: 0.3, maxTokens: 1600 },
];

export interface PromptContext {
  project: ProjectRecord;
  artifacts: PipelineArtifacts;
  hasImages: boolean;
  slug: string;
}

function projectBrief(ctx: PromptContext): string {
  const { project } = ctx;
  const industry = industryById(project.industry);
  return [
    `BUSINESS: ${project.name}`,
    `INDUSTRY: ${industry.label}`,
    `PHONE: ${project.phone}`,
    `ADDRESS: ${project.address}`,
    project.domain ? `DOMAIN: ${project.domain}` : "",
    project.notes ? `OWNER NOTES: ${project.notes}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function systemPrompt(stage: StageDescriptor, ctx: PromptContext): string {
  const base = `You are AlephVisio Studio's build engine, producing a production website for a local business. Work stage-by-stage; output ONLY what the stage requests — no commentary, no markdown outside the requested format.`;
  switch (stage.key) {
    case "brief":
      return `${base}\nSTAGE 1 — BRAND BRIEF. Analyze the business (and any attached brand imagery) and return strict JSON: {"positioning": string (2 sentences), "audience": string, "tone": string[3], "promises": string[3], "keywords": string[6]}.`;
    case "sitemap":
      return `${base}\nSTAGE 2 — SITEMAP. Return strict JSON array of 6-8 sections for a single-page site: [{"id": "kebab-case", "label": string, "purpose": string}]. Must include hero, services, gallery, testimonials, contact.`;
    case "copy":
      return `${base}\nSTAGE 3 — COPY & VOICE. Return strict JSON: {"tagline": string (<=6 words), "headline": string (<=10 words), "subheadline": string (<=28 words), "ctaPrimary": string (<=4 words), "ctaSecondary": string (<=4 words), "voice": string (one sentence style guide)}.`;
    case "content":
      return `${base}\nSTAGE 4 — CONTENT. Return strict JSON: {"about": string (3 sentences), "services": [{"title": string, "desc": string (<=20 words), "icon": "svg-path-name"}] (exactly 6), "testimonials": [{"quote": string, "name": string, "role": string}] (exactly 3), "gallery": [{"caption": string}] (exactly 6), "faq": [{"q": string, "a": string}] (exactly 4).`;
    case "tokens":
      return `${base}\nSTAGE 5 — DESIGN TOKENS. Return strict JSON: {"primary": "#hex", "primaryInk": "#hex (readable text on primary)", "accent": "#hex", "bg": "#hex", "surface": "#hex", "text": "#hex", "muted": "#hex", "fontDisplay": "css font stack", "fontBody": "css font stack", "radius": "px value"}. Ensure WCAG AA contrast (text on bg >= 4.5:1).`;
    case "codegen":
      return `${base}\nSTAGE 6 — CODE GENERATION. Write the complete website. Reply with EXACTLY three fenced blocks in this order: \`\`\`html (full index.html), \`\`\`css (complete styles.css), \`\`\`js (vanilla script.js). Nothing else.`;
    case "validate":
      return `${base}\nSTAGE 7 — VALIDATION & REPAIR. You receive the current HTML and a list of failing checks. Return the REPAIRED site as EXACTLY three fenced blocks (\`\`\`html, \`\`\`css, \`\`\`js) fixing every failure while keeping all working content. Nothing else.`;
    case "qa":
      return `${base}\nSTAGE 8 — VISUAL QA. Critique the rendered structure (layout, spacing, hierarchy, responsiveness, accessibility). Return strict JSON: {"score": number 0-100, "issues": string[] (max 5), "cssPatch": string (pure CSS appended to fix the issues)}.`;
    default:
      return base;
  }
}

function codegenRequirements(ctx: PromptContext): string {
  const { project } = ctx;
  return `HARD REQUIREMENTS (the build is rejected if any is missing):
1. Pure semantic HTML5 + CSS + Vanilla JS. No frameworks, no external assets, no CDNs, no remote images. Gallery tiles must be CSS gradients/patterns with captions.
2. Mobile-first, fully responsive, WCAG AA (contrast, focus states, aria labels, alt text, reduced-motion respect).
3. Sections in order: sticky nav (with skip-link), hero, about, services grid (6), gallery (6 tiles), testimonials (3), FAQ, contact (form + details), footer.
4. Contact form: name, email, phone, message — client-side validation in script.js with inline error messages and a success state (no network submit).
5. Click-to-call: every phone mention links via href="tel:${project.phone.replace(/[^\d+]/g, "")}".
6. Google Maps embed: <iframe src="https://www.google.com/maps?q=${encodeURIComponent(project.address)}&output=embed" ...> in the contact section.
7. SEO: unique <title>, meta description, Open Graph tags (og:title, og:description, og:type=website), and a <script type="application/ld+json"> LocalBusiness schema with name, telephone, address.
8. styles.css uses the provided design tokens as CSS custom properties on :root. script.js: mobile nav toggle, smooth scroll, sticky header shadow, form validation, gallery filter or lightbox (pure JS), reveal-on-scroll via IntersectionObserver.
9. Include the real business phone "${project.phone}" and address "${project.address}" verbatim in the contact section and footer.`;
}

function imageParts(ctx: PromptContext): VisionContentPart[] {
  if (!ctx.hasImages) return [];
  const parts: VisionContentPart[] = [];
  const { project } = ctx;
  if (project.logo?.dataUrl) {
    parts.push({ type: "text", text: "Attached: the business logo." }, { type: "image_url", image_url: { url: project.logo.dataUrl } });
  }
  project.referenceImages?.slice(0, 3).forEach((img, i) => {
    parts.push(
      { type: "text", text: `Attached: reference image ${i + 1}.` },
      { type: "image_url", image_url: { url: img.dataUrl } },
    );
  });
  return parts;
}

export function buildStageMessages(
  stage: StageDescriptor,
  ctx: PromptContext,
  extra?: { failingChecks?: string[]; repairHtml?: string },
): ChatMessage[] {
  const a = ctx.artifacts;
  const messages: ChatMessage[] = [{ role: "system", content: systemPrompt(stage, ctx) }];
  const user: VisionContentPart[] = [{ type: "text", text: projectBrief(ctx) }];

  if (stage.usesVision) user.push(...imageParts(ctx));

  switch (stage.key) {
    case "sitemap":
      if (a.brief) user.push({ type: "text", text: `BRAND BRIEF:\n${JSON.stringify(a.brief)}` });
      break;
    case "copy":
      if (a.brief) user.push({ type: "text", text: `BRAND BRIEF:\n${JSON.stringify(a.brief)}` });
      if (a.sitemap) user.push({ type: "text", text: `SITEMAP:\n${JSON.stringify(a.sitemap)}` });
      break;
    case "content":
      if (a.brief) user.push({ type: "text", text: `BRAND BRIEF:\n${JSON.stringify(a.brief)}` });
      if (a.copy) user.push({ type: "text", text: `COPY KIT:\n${JSON.stringify(a.copy)}` });
      break;
    case "tokens":
      if (a.brief) user.push({ type: "text", text: `BRAND BRIEF:\n${JSON.stringify(a.brief)}` });
      user.push({ type: "text", text: `Palette direction from the industry: ${industryById(ctx.project.industry).paletteHint}.` });
      break;
    case "codegen":
      user.push({
        type: "text",
        text: [
          `Build the complete single-page website now.`,
          a.brief ? `BRAND BRIEF:\n${JSON.stringify(a.brief)}` : "",
          a.sitemap ? `SITEMAP:\n${JSON.stringify(a.sitemap)}` : "",
          a.copy ? `COPY KIT:\n${JSON.stringify(a.copy)}` : "",
          a.content ? `CONTENT:\n${JSON.stringify(a.content)}` : "",
          a.tokens ? `DESIGN TOKENS:\n${JSON.stringify(a.tokens)}` : "",
          codegenRequirements(ctx),
        ]
          .filter(Boolean)
          .join("\n\n"),
      });
      break;
    case "validate":
      user.push({
        type: "text",
        text: [
          `Current HTML:\n\`\`\`html\n${(extra?.repairHtml ?? a.files?.html ?? "").slice(0, 24000)}\n\`\`\``,
          `Current CSS (first 6000 chars):\n\`\`\`css\n${(a.files?.css ?? "").slice(0, 6000)}\n\`\`\``,
          `Failing checks:\n${(extra?.failingChecks ?? []).map((c) => `- ${c}`).join("\n") || "- none reported; verify all requirements anyway"}`,
          codegenRequirements(ctx),
        ].join("\n\n"),
      });
      break;
    case "qa":
      user.push({
        type: "text",
        text: [
          `Rendered structure to critique:\n\`\`\`html\n${summarizeHtml(a.files?.html ?? "")}\n\`\`\``,
          `Active stylesheet (first 8000 chars):\n\`\`\`css\n${(a.files?.css ?? "").slice(0, 8000)}\n\`\`\``,
          a.tokens ? `DESIGN TOKENS:\n${JSON.stringify(a.tokens)}` : "",
        ]
          .filter(Boolean)
          .join("\n\n"),
      });
      break;
    default:
      user.push({ type: "text", text: `Produce the stage output now as specified.` });
  }

  messages.push({ role: "user", content: user });
  return messages;
}

/** Compact structural digest of the HTML for the QA critic. */
function summarizeHtml(html: string): string {
  const tags = html.match(/<(section|header|nav|main|footer|form|iframe|h1|h2)([^>]*)>/gi) ?? [];
  return [
    `total length: ${html.length} chars`,
    ...tags.slice(0, 80).map((t) => t.replace(/\s+/g, " ").slice(0, 160)),
  ].join("\n");
}

export function invalidOutputFollowUp(expected: string): ChatMessage {
  return {
    role: "user",
    content: `Your previous reply could not be parsed. Reply again with ONLY valid ${expected}. No prose, no code fences unless asked.`,
  };
}
