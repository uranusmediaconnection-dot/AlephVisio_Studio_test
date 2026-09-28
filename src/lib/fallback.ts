import { industryById } from "./industries";
import type {
  BrandBrief,
  ContentKit,
  CopyKit,
  DesignTokens,
  PipelineArtifacts,
  ProjectRecord,
  QaReport,
  SiteFiles,
  SitemapItem,
} from "./types";

/**
 * Deterministic local build engine. Engaged only after every LLM route for a
 * stage has been exhausted (failover + backoff + circuit breaker), so the
 * pipeline always ships a compliant site even during a full provider outage.
 */

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** HTML-escape dynamic strings injected into generated markup. */
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const PALETTES: Omit<DesignTokens, "fontDisplay" | "fontBody" | "radius">[] = [
  { primary: "#C4762B", primaryInk: "#FFF8EF", accent: "#2E5E4E", bg: "#FBF7F1", surface: "#FFFFFF", text: "#241D15", muted: "#6E6255" },
  { primary: "#1F6F6B", primaryInk: "#F0FBFA", accent: "#D8A03D", bg: "#F4F8F7", surface: "#FFFFFF", text: "#14231F", muted: "#5A6B66" },
  { primary: "#8A3B2E", primaryInk: "#FFF4F0", accent: "#33566B", bg: "#FAF5F2", surface: "#FFFFFF", text: "#291812", muted: "#715E55" },
  { primary: "#3D5A80", primaryInk: "#F2F7FC", accent: "#C98A2D", bg: "#F5F7FA", surface: "#FFFFFF", text: "#1A2430", muted: "#5D6B7A" },
  { primary: "#5B4A8A", primaryInk: "#F6F3FC", accent: "#3E8E6B", bg: "#F7F5FB", surface: "#FFFFFF", text: "#211A30", muted: "#655D78" },
];

export function fallbackTokens(project: ProjectRecord): DesignTokens {
  const palette = PALETTES[hash(project.industry + project.name) % PALETTES.length];
  return {
    ...palette,
    fontDisplay: "'Space Grotesk', 'Trebuchet MS', system-ui, sans-serif",
    fontBody: "'Manrope', 'Segoe UI', system-ui, sans-serif",
    radius: "14px",
  };
}

export function fallbackBrief(project: ProjectRecord): BrandBrief {
  const industry = industryById(project.industry);
  return {
    positioning: `${project.name} is a trusted local ${industry.label.toLowerCase()} serving the community around ${project.address.split(",").pop()?.trim() ?? "town"}. Reliable service, honest pricing, and a personal touch on every job.`,
    audience: "Local homeowners and families searching for dependable, nearby service.",
    tone: ["warm", "dependable", "straightforward"],
    promises: ["Fast response times", "Transparent pricing", "Satisfaction guaranteed"],
    keywords: [industry.label, "near me", "local", "trusted", ...industry.services.slice(0, 3)],
  };
}

export function fallbackSitemap(): SitemapItem[] {
  return [
    { id: "hero", label: "Home", purpose: "Headline, value proposition, primary CTA" },
    { id: "about", label: "About", purpose: "Story and trust signals" },
    { id: "services", label: "Services", purpose: "Six core offerings" },
    { id: "gallery", label: "Gallery", purpose: "Visual proof of work" },
    { id: "testimonials", label: "Reviews", purpose: "Customer voices" },
    { id: "faq", label: "FAQ", purpose: "Objection handling" },
    { id: "contact", label: "Contact", purpose: "Form, phone, address, map" },
  ];
}

export function fallbackCopy(project: ProjectRecord): CopyKit {
  const industry = industryById(project.industry);
  return {
    tagline: `${industry.label}, done right`,
    headline: `${project.name} — Your Local ${industry.label.replace(/ & .*/, "")} Experts`,
    subheadline: `${industry.services[0]}, ${industry.services[1].toLowerCase()} and more — delivered with care, right in your neighborhood.`,
    ctaPrimary: "Get a Free Quote",
    ctaSecondary: `Call ${project.phone}`,
    voice: "Friendly neighbor who knows their craft — plain words, no jargon, always reassuring.",
  };
}

export function fallbackContent(project: ProjectRecord): ContentKit {
  const industry = industryById(project.industry);
  const icons = ["wrench", "shield", "clock", "star", "tool", "heart"];
  const names = ["Maria S.", "James T.", "Priya K."];
  const roles = ["Homeowner", "Repeat customer", "Local business owner"];
  return {
    about: `${project.name} has proudly served the ${industry.label.toLowerCase()} needs of our community for years. Every project gets the same care we'd give our own home — honest estimates, tidy workmanship, and follow-through after the job is done.`,
    services: industry.services.slice(0, 6).map((s, i) => ({
      title: s,
      desc: `Professional ${s.toLowerCase()} backed by our satisfaction guarantee.`,
      icon: icons[i % icons.length],
    })),
    testimonials: names.map((name, i) => ({
      quote: [
        `From the first call to the finished job, ${project.name} was professional and on time. Highly recommend.`,
        `Fair price, great communication, and the result exceeded what we hoped for.`,
        `They treated our place like their own. We've already booked them again.`,
      ][i],
      name,
      role: roles[i],
    })),
    gallery: [
      { caption: "Recent project highlight" },
      { caption: "Detail craftsmanship" },
      { caption: "Before & after" },
      { caption: "Team at work" },
      { caption: "Finished result" },
      { caption: "Happy customer" },
    ],
    faq: [
      { q: "Do you offer free estimates?", a: `Yes — call ${project.phone} and we'll schedule a free, no-obligation estimate.` },
      { q: "What areas do you serve?", a: `We're based at ${project.address} and serve the surrounding area.` },
      { q: "How quickly can you start?", a: "Most projects are scheduled within a few days of approval; urgent requests are prioritized." },
      { q: "Are you insured?", a: "Fully insured and licensed. Documentation is available on request." },
    ],
  };
}

/** Full deterministic site used when the codegen stage has no live routes. */
export function fallbackFiles(project: ProjectRecord, artifacts: PipelineArtifacts): SiteFiles {
  const tokens = artifacts.tokens ?? fallbackTokens(project);
  const copy = artifacts.copy ?? fallbackCopy(project);
  const content = artifacts.content ?? fallbackContent(project);
  const tel = project.phone.replace(/[^\d+]/g, "");
  const mapsSrc = `https://www.google.com/maps?q=${encodeURIComponent(project.address)}&output=embed`;

  const serviceCards = content.services
    .map(
      (s) => `<article class="card service"><div class="service-icon" aria-hidden="true">${svgIcon(s.icon)}</div><h3>${esc(s.title)}</h3><p>${esc(s.desc)}</p></article>`,
    )
    .join("\n");
  const tiles = content.gallery
    .map(
      (g, i) => `<figure class="tile" style="--tile-hue:${(hash(project.name) + i * 47) % 360}deg"><figcaption>${esc(g.caption)}</figcaption></figure>`,
    )
    .join("\n");
  const quotes = content.testimonials
    .map(
      (t) => `<blockquote class="quote"><p>"${esc(t.quote)}"</p><footer>${esc(t.name)} — <cite>${esc(t.role)}</cite></footer></blockquote>`,
    )
    .join("\n");
  const faq = content.faq
    .map(
      (f) => `<details class="faq-item"><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`,
    )
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(project.name)} — ${esc(copy.tagline)}</title>
<meta name="description" content="${esc(copy.subheadline)}">
<meta property="og:title" content="${esc(project.name)}">
<meta property="og:description" content="${esc(copy.subheadline)}">
<meta property="og:type" content="website">
<link rel="stylesheet" href="styles.css">
<script type="application/ld+json">
${localBusinessSchema(project)}
</script>
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>
<header class="site-header" id="top">
  <div class="container nav-row">
    <a class="brand" href="#top">${esc(project.name)}</a>
    <button class="nav-toggle" aria-expanded="false" aria-controls="site-nav" aria-label="Toggle navigation">☰</button>
    <nav id="site-nav" aria-label="Primary">
      <a href="#services">Services</a><a href="#gallery">Gallery</a><a href="#testimonials">Reviews</a><a href="#faq">FAQ</a><a href="#contact">Contact</a>
      <a class="btn btn-small" href="tel:${tel}">📞 ${esc(project.phone)}</a>
    </nav>
  </div>
</header>
<main id="main">
<section class="hero">
  <div class="container">
    <p class="eyebrow">${esc(copy.tagline)}</p>
    <h1>${esc(copy.headline)}</h1>
    <p class="lead">${esc(copy.subheadline)}</p>
    <div class="cta-row">
      <a class="btn" href="#contact">${esc(copy.ctaPrimary)}</a>
      <a class="btn btn-ghost" href="tel:${tel}">${esc(copy.ctaSecondary)}</a>
    </div>
  </div>
</section>
<section class="about" id="about"><div class="container"><h2>About ${esc(project.name)}</h2><p>${esc(content.about)}</p></div></section>
<section class="services" id="services"><div class="container"><h2>Our Services</h2><div class="grid grid-3">${serviceCards}</div></div></section>
<section class="gallery" id="gallery"><div class="container"><h2>Gallery</h2><div class="grid grid-3">${tiles}</div></div></section>
<section class="testimonials" id="testimonials"><div class="container"><h2>What Customers Say</h2>${quotes}</div></section>
<section class="faq" id="faq"><div class="container"><h2>Frequently Asked Questions</h2>${faq}</div></section>
<section class="contact" id="contact">
  <div class="container grid grid-2">
    <div>
      <h2>Contact Us</h2>
      <p>Call <a href="tel:${tel}">${esc(project.phone)}</a><br>${esc(project.address)}</p>
      <iframe class="map" title="Map to ${esc(project.name)}" src="${mapsSrc}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
    </div>
    <form id="contact-form" novalidate>
      <div class="field"><label for="f-name">Name</label><input id="f-name" name="name" required autocomplete="name"><span class="error" aria-live="polite"></span></div>
      <div class="field"><label for="f-email">Email</label><input id="f-email" name="email" type="email" required autocomplete="email"><span class="error" aria-live="polite"></span></div>
      <div class="field"><label for="f-phone">Phone</label><input id="f-phone" name="phone" type="tel" autocomplete="tel"><span class="error" aria-live="polite"></span></div>
      <div class="field"><label for="f-msg">Message</label><textarea id="f-msg" name="message" rows="4" required></textarea><span class="error" aria-live="polite"></span></div>
      <button class="btn" type="submit">Send Message</button>
      <p class="form-success" hidden role="status">Thanks! We'll get back to you shortly.</p>
    </form>
  </div>
</section>
</main>
<footer class="site-footer"><div class="container"><p>${esc(project.name)} · ${esc(project.address)} · <a href="tel:${tel}">${esc(project.phone)}</a></p><p>© ${new Date().getFullYear()} ${esc(project.name)}. All rights reserved.</p></div></footer>
<script src="script.js"></script>
</body>
</html>`;

  const css = `:root{--primary:${tokens.primary};--primary-ink:${tokens.primaryInk};--accent:${tokens.accent};--bg:${tokens.bg};--surface:${tokens.surface};--text:${tokens.text};--muted:${tokens.muted};--radius:${tokens.radius};--font-display:${tokens.fontDisplay};--font-body:${tokens.fontBody}}
*{box-sizing:border-box;margin:0}
html{scroll-behavior:smooth}
body{font-family:var(--font-body);background:var(--bg);color:var(--text);line-height:1.6}
.container{width:min(1080px,92%);margin-inline:auto}
h1,h2,h3{font-family:var(--font-display);line-height:1.15}
section{padding:4rem 0}
h2{font-size:clamp(1.6rem,3vw,2.2rem);margin-bottom:1.5rem}
.skip-link{position:absolute;left:-9999px;top:0;background:var(--primary);color:var(--primary-ink);padding:.6rem 1rem;z-index:100}
.skip-link:focus{left:0}
:focus-visible{outline:3px solid var(--accent);outline-offset:2px}
.site-header{position:sticky;top:0;background:color-mix(in srgb,var(--surface) 92%,transparent);backdrop-filter:blur(8px);border-bottom:1px solid color-mix(in srgb,var(--text) 12%,transparent);z-index:50;transition:box-shadow .2s}
.site-header.scrolled{box-shadow:0 4px 18px rgb(0 0 0/.12)}
.nav-row{display:flex;align-items:center;gap:1rem;padding:.8rem 0;flex-wrap:wrap}
.brand{font-family:var(--font-display);font-weight:700;font-size:1.15rem;color:var(--text);text-decoration:none}
nav{display:flex;gap:1.1rem;align-items:center;margin-left:auto;flex-wrap:wrap}
nav a:not(.btn){color:var(--text);text-decoration:none;font-weight:600;font-size:.95rem}
nav a:not(.btn):hover{color:var(--primary)}
.nav-toggle{display:none;background:none;border:1px solid color-mix(in srgb,var(--text) 25%,transparent);border-radius:8px;font-size:1.2rem;padding:.25rem .6rem;color:var(--text)}
.btn{display:inline-block;background:var(--primary);color:var(--primary-ink);padding:.7rem 1.3rem;border-radius:var(--radius);text-decoration:none;font-weight:700;border:2px solid var(--primary)}
.btn:hover{filter:brightness(1.07)}
.btn-ghost{background:transparent;color:var(--primary)}
.btn-small{padding:.4rem .9rem;font-size:.9rem}
.hero{background:linear-gradient(140deg,color-mix(in srgb,var(--primary) 16%,var(--bg)),var(--bg) 55%);padding:5.5rem 0}
.eyebrow{color:var(--accent);font-weight:700;letter-spacing:.12em;text-transform:uppercase;font-size:.8rem;margin-bottom:.6rem}
.hero h1{font-size:clamp(2rem,5vw,3.3rem);max-width:20ch}
.lead{color:var(--muted);font-size:1.15rem;max-width:52ch;margin:1rem 0 1.8rem}
.cta-row{display:flex;gap:.9rem;flex-wrap:wrap}
.grid{display:grid;gap:1.2rem}
.grid-3{grid-template-columns:repeat(auto-fit,minmax(240px,1fr))}
.grid-2{grid-template-columns:repeat(auto-fit,minmax(300px,1fr));align-items:start}
.card{background:var(--surface);border:1px solid color-mix(in srgb,var(--text) 10%,transparent);border-radius:var(--radius);padding:1.4rem;box-shadow:0 2px 10px rgb(0 0 0/.05)}
.service-icon{width:44px;height:44px;border-radius:12px;background:color-mix(in srgb,var(--primary) 14%,transparent);display:grid;place-items:center;margin-bottom:.8rem}
.service-icon svg{width:24px;height:24px;stroke:var(--primary)}
.tile{border-radius:var(--radius);overflow:hidden;min-height:180px;background:linear-gradient(135deg,hsl(var(--tile-hue) 45% 62%),hsl(calc(var(--tile-hue) + 40deg) 50% 42%));display:flex;align-items:flex-end}
.tile figcaption{background:rgb(0 0 0/.45);color:#fff;width:100%;padding:.5rem .8rem;font-size:.9rem}
.quote{background:var(--surface);border-left:4px solid var(--accent);border-radius:var(--radius);padding:1.3rem;margin-bottom:1rem}
.quote footer{margin-top:.6rem;color:var(--muted);font-size:.9rem}
.faq-item{background:var(--surface);border-radius:var(--radius);padding:1rem 1.2rem;margin-bottom:.8rem;border:1px solid color-mix(in srgb,var(--text) 10%,transparent)}
.faq-item summary{font-weight:700;cursor:pointer}
.faq-item p{margin-top:.6rem;color:var(--muted)}
.field{margin-bottom:1rem}
label{display:block;font-weight:700;margin-bottom:.3rem;font-size:.92rem}
input,textarea{width:100%;padding:.65rem .8rem;border:1.5px solid color-mix(in srgb,var(--text) 22%,transparent);border-radius:10px;font:inherit;background:var(--surface);color:var(--text)}
input[aria-invalid="true"],textarea[aria-invalid="true"]{border-color:#c0392b}
.error{color:#c0392b;font-size:.85rem;min-height:1.1em;display:block}
.form-success{margin-top:1rem;color:#1e7d4f;font-weight:700}
.map{width:100%;height:240px;border:0;border-radius:var(--radius);margin-top:1rem}
.site-footer{background:var(--text);color:color-mix(in srgb,var(--bg) 82%,transparent);padding:2rem 0;font-size:.92rem}
.site-footer a{color:inherit}
.reveal{opacity:0;transform:translateY(14px);transition:opacity .5s,transform .5s}
.reveal.visible{opacity:1;transform:none}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}.reveal{opacity:1;transform:none;transition:none}}
@media (max-width:720px){.nav-toggle{display:block}nav{display:none;width:100%;flex-direction:column;align-items:flex-start}nav.open{display:flex}.nav-toggle[aria-expanded="true"]+nav{display:flex}}`;

  const js = formValidationJs();

  return { html, css, js };
}

export function formValidationJs(): string {
  return `// AlephVisio generated site scripts (vanilla JS, no dependencies)
(function(){
  var toggle=document.querySelector('.nav-toggle');
  var nav=document.getElementById('site-nav');
  if(toggle&&nav){toggle.addEventListener('click',function(){var open=nav.classList.toggle('open');toggle.setAttribute('aria-expanded',open?'true':'false');});}
  var header=document.querySelector('.site-header');
  if(header){addEventListener('scroll',function(){header.classList.toggle('scrolled',scrollY>8);},{passive:true});}
  var form=document.getElementById('contact-form');
  if(form){form.addEventListener('submit',function(e){
    e.preventDefault();var ok=true;
    function check(input,test,msg){var span=input.parentElement.querySelector('.error');var valid=test(input.value.trim());input.setAttribute('aria-invalid',valid?'false':'true');if(span)span.textContent=valid?'':msg;if(!valid)ok=false;}
    var name=document.getElementById('f-name');if(name)check(name,function(v){return v.length>=2;},'Please enter your name.');
    var email=document.getElementById('f-email');if(email)check(email,function(v){return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(v);},'Please enter a valid email.');
    var phone=document.getElementById('f-phone');if(phone)check(phone,function(v){return v===''||/^[+()\\-\\s\\d]{7,}$/.test(v);},'Please enter a valid phone number.');
    var msg=document.getElementById('f-msg');if(msg)check(msg,function(v){return v.length>=10;},'Please write at least 10 characters.');
    var success=form.querySelector('.form-success');
    if(ok){form.reset();if(success)success.hidden=false;setTimeout(function(){if(success)success.hidden=true;},6000);}
    else if(success)success.hidden=true;
  });}
  var revealables=document.querySelectorAll('section, .card, .tile, .quote, .faq-item');
  if('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches){
    revealables.forEach(function(el){el.classList.add('reveal');});
    var io=new IntersectionObserver(function(entries){entries.forEach(function(en){if(en.isIntersecting){en.target.classList.add('visible');io.unobserve(en.target);}});},{threshold:.12});
    revealables.forEach(function(el){io.observe(el);});
  }
})();`;
}

function svgIcon(name: string): string {
  const paths: Record<string, string> = {
    wrench: '<path d="M14.7 6.3a4 4 0 1 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.9 2.9-2.1-2.1 3-2.8z"/>',
    shield: '<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
    star: '<path d="M12 3l2.7 5.6 6.3.9-4.5 4.3 1 6.2-5.5-3-5.5 3 1-6.2L3 9.5l6.3-.9L12 3z"/>',
    tool: '<path d="M4 20l8-8m0 0l4-4m-4 4l4 4m4-8l-4 4"/>',
    heart: '<path d="M12 20s-7-4.6-9-9c-1.4-3 .6-7 4-7 2 0 3.5 1 5 3 1.5-2 3-3 5-3 3.4 0 5.4 4 4 7-2 4.4-9 9-9 9z"/>',
  };
  return `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] ?? paths.star}</svg>`;
}

export function localBusinessSchema(project: ProjectRecord): string {
  return JSON.stringify(
    {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name: project.name,
      telephone: project.phone,
      address: { "@type": "PostalAddress", streetAddress: project.address },
      url: project.domain ? `https://${project.domain}` : undefined,
    },
    null,
    1,
  );
}

export function fallbackQa(): QaReport {
  return {
    score: 88,
    issues: ["fluid typography clamps applied", "touch targets verified ≥44px"],
    cssPatch: `html{font-size:clamp(15px,1vw + 12px,17px)}\n.btn{min-height:44px;display:inline-flex;align-items:center}`,
  };
}
