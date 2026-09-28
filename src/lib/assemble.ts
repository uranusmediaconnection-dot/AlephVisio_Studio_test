import { formValidationJs, localBusinessSchema } from "./fallback";
import type { ProjectRecord, SiteFiles } from "./types";

export interface SiteCheck {
  name: string;
  pass: boolean;
}

/** Structural validation of the generated site against the output spec. */
export function validateSite(files: SiteFiles, project: ProjectRecord): SiteCheck[] {
  const html = files.html;
  const checks: SiteCheck[] = [
    { name: "DOCTYPE + <html> document", pass: /<!DOCTYPE html>/i.test(html) && /<html[\s>]/i.test(html) },
    { name: "<head> with charset + viewport", pass: /<meta[^>]+charset/i.test(html) && /<meta[^>]+viewport/i.test(html) },
    { name: "<title> present", pass: /<title>[^<]+<\/title>/i.test(html) },
    { name: "Sticky navigation (<nav>)", pass: /<nav[\s>]/i.test(html) },
    { name: "Hero section (<h1>)", pass: /<h1[\s>]/i.test(html) },
    { name: "Services section", pass: /id="services"|services/i.test(html) },
    { name: "Gallery section", pass: /id="gallery"|gallery/i.test(html) },
    { name: "Testimonials", pass: /testimonial|review/i.test(html) },
    { name: "Contact <form>", pass: /<form[\s>]/i.test(html) },
    { name: "<footer>", pass: /<footer[\s>]/i.test(html) },
    { name: "Click-to-call tel: link", pass: /href="tel:/i.test(html) },
    { name: "Google Maps iframe", pass: /<iframe[^>]+google\.com\/maps/i.test(html) },
    { name: "LocalBusiness JSON-LD", pass: /application\/ld\+json/i.test(html) && /LocalBusiness/.test(html) },
    { name: "Open Graph tags", pass: /property="og:title"/i.test(html) },
    { name: "Business phone in page", pass: html.includes(project.phone) },
    { name: "Business address in page", pass: html.includes(project.address) },
    { name: "Stylesheet content present", pass: files.css.trim().length > 200 },
    { name: "Vanilla JS present", pass: files.js.trim().length > 50 && !/\breact\b|angular|vue\./i.test(files.js) },
  ];
  return checks;
}

export function failingChecks(files: SiteFiles, project: ProjectRecord): string[] {
  return validateSite(files, project)
    .filter((c) => !c.pass)
    .map((c) => c.name);
}

/**
 * Deterministic compliance enforcement — injects anything still missing after
 * the LLM validation loop so the shipped site always satisfies the spec.
 */
export function enforceCompliance(files: SiteFiles, project: ProjectRecord): SiteFiles {
  let html = files.html;
  let css = files.css;
  const tel = project.phone.replace(/[^\d+]/g, "");

  // Bootstrap a document skeleton when the model returned a fragment, so the
  // regex injections below always have <head>/</head>/</body> anchors.
  if (!/<head[\s>]/i.test(html)) {
    const fragment = html.replace(/^<!DOCTYPE html>\s*/i, "");
    html = `<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>${project.name}</title>\n</head>\n<body>\n${fragment}\n</body>\n</html>`;
  } else if (!/<!DOCTYPE html>/i.test(html)) {
    html = `<!DOCTYPE html>\n${html}`;
  }

  // Head essentials
  if (!/<meta[^>]+charset/i.test(html)) {
    html = html.replace(/<head([^>]*)>/i, `<head$1>\n<meta charset="UTF-8">`);
  }
  if (!/<meta[^>]+viewport/i.test(html)) {
    html = html.replace(/<head([^>]*)>/i, `<head$1>\n<meta name="viewport" content="width=device-width, initial-scale=1">`);
  }
  if (!/<title>[^<]+<\/title>/i.test(html)) {
    html = html.replace(/<head([^>]*)>/i, `<head$1>\n<title>${project.name}</title>`);
  }
  if (!/property="og:title"/i.test(html)) {
    html = html.replace(
      /<\/head>/i,
      `<meta property="og:title" content="${project.name}">\n<meta property="og:description" content="${project.name} — ${project.address}. Call ${project.phone}.">\n<meta property="og:type" content="website">\n</head>`,
    );
  }
  if (!/application\/ld\+json/i.test(html)) {
    html = html.replace(
      /<\/head>/i,
      `<script type="application/ld+json">\n${localBusinessSchema(project)}\n</script>\n</head>`,
    );
  }
  if (!/href="tel:/i.test(html)) {
    const phonePlain = project.phone.replace(/[&<>"]/g, "");
    if (html.includes(project.phone)) {
      html = html.replace(project.phone, `<a href="tel:${tel}">${phonePlain}</a>`);
    } else {
      html = html.replace(/<footer/i, `<p style="padding:1rem 0"><a href="tel:${tel}">Call ${phonePlain}</a></p>\n<footer`);
    }
  }
  if (!/<iframe[^>]+google\.com\/maps/i.test(html)) {
    const iframe = `<iframe class="map" title="Map to ${project.name}" src="https://www.google.com/maps?q=${encodeURIComponent(project.address)}&output=embed" loading="lazy" referrerpolicy="no-referrer-when-downgrade" style="width:100%;height:240px;border:0;border-radius:12px"></iframe>`;
    if (/<\/form>/i.test(html)) {
      html = html.replace(/(<\/form>)/i, `$1\n${iframe}`);
    } else if (/<footer/i.test(html)) {
      html = html.replace(/<footer/i, `${iframe}\n<footer`);
    } else {
      html = html.replace(/<\/body>/i, `${iframe}\n</body>`);
    }
  }
  if (!/<footer[\s>]/i.test(html)) {
    html += `\n<footer><p>${project.name} · ${project.address} · <a href="tel:${tel}">${project.phone}</a></p></footer>`;
  }
  // Ensure styles and scripts are referenced or inline.
  if (!/<link[^>]+styles\.css/i.test(html) && !/<style[\s>]/i.test(html)) {
    html = html.replace(/<\/head>/i, `<link rel="stylesheet" href="styles.css">\n</head>`);
  }
  if (!/<script[^>]*script\.js/i.test(html)) {
    html = html.replace(/<\/body>/i, `<script src="script.js"></script>\n</body>`);
  }
  if (!/:root/.test(css)) {
    css = `:root{--primary:#004D61;--primary-ink:#F0F0F0;--accent:#822659;--bg:#F6F4EF;--surface:#fff;--text:#1A1A1A;--muted:#5C5C5C;--radius:14px}\n${css}`;
  }
  // A shipped site must always carry working vanilla JS — supply the
  // deterministic interaction layer if the model omitted it.
  const js = files.js && files.js.trim().length >= 50 ? files.js : formValidationJs();
  return { html, css, js };
}

/**
 * Build a self-contained preview document: styles.css / script.js references
 * are replaced with inline blocks so the sandboxed iframe renders fully.
 */
export function buildPreviewDoc(files: SiteFiles): string {
  let doc = files.html;
  doc = doc.replace(
    /<link[^>]+href=["']styles\.css["'][^>]*>/i,
    `<style>\n${files.css}\n</style>`,
  );
  doc = doc.replace(
    /<script[^>]+src=["']script\.js["'][^>]*>\s*<\/script>/i,
    `<script>\n${files.js}\n</script>`,
  );
  // If the model inlined everything already, still make sure css/js are there.
  if (!doc.includes(files.css.slice(0, 40)) && files.css.trim()) {
    doc = doc.replace(/<\/head>/i, `<style>${files.css}</style></head>`);
  }
  if (files.js.trim() && !doc.includes(files.js.slice(0, 40))) {
    doc = doc.replace(/<\/body>/i, `<script>${files.js}</script></body>`);
  }
  return doc;
}
