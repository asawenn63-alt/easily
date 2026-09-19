import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { applyDocumentPatches } from './website-document-ai.mjs';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const escaped = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
function fail(code, status = 400) { throw Object.assign(new Error(code), { status }); }

function plain(value, max = 4000) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export function businessFactsFromProject(project) {
  const document = project?.draftDocument || project?.document || {};
  const meta = document.meta || {};
  const page = document.page || {};
  const saved = meta.greenfieldAnswers || project?.greenfieldAnswers || {};
  const customerFacts = page.creativeBrief?.customerFacts || {};
  return {
    businessName: plain(saved.name || customerFacts.businessName || page.createBusinessName || project?.name || project?.title, 160),
    location: plain(saved.location || customerFacts.location || page.createBusinessLocation, 240),
    description: plain(saved.description || customerFacts.offer?.summary || page.createBusinessDescription, 4000),
    siteType: plain(saved.siteType || customerFacts.siteType, 80),
    designTone: plain(saved.design || customerFacts.design?.styleId, 160)
  };
}

function fallbackAboutContent(facts) {
  if (!facts.description) return null;
  return {
    eyebrow: 'Om verksamheten',
    heading: facts.businessName ? `Om ${facts.businessName}` : 'Om oss',
    paragraphs: [
      ...(facts.businessName ? [`Välkommen till ${facts.businessName}.`] : []),
      facts.description,
      ...(facts.location ? [`Verksamheten finns i ${facts.location}.`] : [])
    ].slice(0, 3)
  };
}

const storefrontSections = {
  'new-arrivals': { label: 'Nyheter', intro: 'Upptäck det senaste i butiken.', count: 4 },
  sale: { label: 'Rea', intro: 'Utvalda erbjudanden just nu.', count: 4 },
  featured: { label: 'Utvalda produkter', intro: 'Produkter vi särskilt vill lyfta fram.', count: 3 },
  favorites: { label: 'Våra favoriter', intro: 'Några av butikens handplockade favoriter.', count: 3 },
  campaign: { label: 'Kampanj', intro: 'Berätta om butikens aktuella kampanj.' },
  categories: { label: 'Kategorier', intro: 'Hitta rätt genom butikens kategorier.', count: 3 }
};

const contentSections = {
  about: { label: 'Om oss' }
};

const contentPlaceholderSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900" role="img" aria-label="Platshållare för bild"><rect width="1200" height="900" fill="#e8ebe9"/><circle cx="600" cy="370" r="105" fill="none" stroke="#7c8580" stroke-width="20"/><path d="M350 720c42-150 142-225 250-225s208 75 250 225" fill="none" stroke="#7c8580" stroke-width="20" stroke-linecap="round"/></svg>`;

const contentSectionCss = `
/* easily-content-sections */
.easily-content-section{padding:clamp(3rem,7vw,6rem) clamp(1rem,5vw,4rem);color:inherit;background:var(--easily-content-background,inherit)}
.easily-content-inner{width:min(1180px,100%);margin:0 auto}
.easily-content-about{display:grid;grid-template-columns:minmax(0,1fr) minmax(18rem,.9fr);align-items:center;gap:clamp(2rem,6vw,6rem)}
.easily-content-about__copy>span{display:block;margin-bottom:.75rem;font:inherit;font-size:.8rem;font-weight:700;letter-spacing:.09em;text-transform:uppercase}
.easily-content-about__copy h2{margin:0 0 1rem;font:inherit;font-size:clamp(2.25rem,5vw,4.5rem);font-weight:700;line-height:1.05}
.easily-content-about__copy p{max-width:42rem;margin:0 0 1rem;font:inherit;line-height:1.65;opacity:.78}
.easily-content-about__image{display:block;width:100%;aspect-ratio:4/3;object-fit:cover;background:#e8ebe9}
@media(max-width:760px){.easily-content-about{grid-template-columns:1fr}.easily-content-about__image{order:-1}}
`;

function contentSectionMarkup(kind, copy) {
  if (!Object.hasOwn(contentSections, kind)) fail('invalid-content-section');
  if (kind === 'about') {
    if (!copy || typeof copy.heading !== 'string' || !Array.isArray(copy.paragraphs) || !copy.paragraphs.length) fail('business-details-missing', 422);
    const eyebrow = plain(copy.eyebrow, 80) || 'Om verksamheten';
    const heading = plain(copy.heading, 180);
    const paragraphs = copy.paragraphs.map(item => plain(item, 1600)).filter(Boolean).slice(0, 3);
    if (!heading || !paragraphs.length) fail('business-details-missing', 422);
    return `<section class="easily-content-section" data-easily-content-section="about"><div class="easily-content-inner easily-content-about"><div class="easily-content-about__copy"><span>${escaped(eyebrow)}</span><h2>${escaped(heading)}</h2>${paragraphs.map(item => `<p>${escaped(item)}</p>`).join('')}</div><img class="easily-content-about__image" src="assets/easily-content-placeholder.svg" alt="Bild om verksamheten"></div></section>`;
  }
  fail('invalid-content-section');
}

function topLevelSectionRanges(html) {
  const mainStart = /<main\b(?:[^>"']|"[^"]*"|'[^']*')*>/i.exec(html);
  const containerStart = mainStart ? mainStart.index + mainStart[0].length : 0;
  const containerEnd = mainStart ? html.toLowerCase().lastIndexOf('</main>') : html.length;
  const source = html.slice(containerStart, containerEnd > containerStart ? containerEnd : html.length);
  const ranges = [];
  const stack = [];
  const tokens = /<!--[\s\S]*?-->|<(script|style|textarea|template)\b[^>]*>[\s\S]*?<\/\1\s*>|<(?:[^>"']|"[^"]*"|'[^']*')*>/gi;
  for (const token of source.matchAll(tokens)) {
    if (/^<section\b/i.test(token[0]) && !/\/\s*>$/.test(token[0])) {
      stack.push({ start: containerStart + token.index, opening: token[0], topLevel: stack.length === 0 });
    } else if (/^<\/section\s*>/i.test(token[0]) && stack.length) {
      const section = stack.pop();
      if (section.topLevel) ranges.push({ ...section, end: containerStart + token.index + token[0].length });
    }
  }
  return ranges.sort((a, b) => a.start - b.start);
}

const storefrontPlaceholderSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="900" viewBox="0 0 900 900" role="img" aria-label="Platshållare för produktbild"><rect width="900" height="900" fill="#e8ebe9"/><rect x="185" y="185" width="530" height="530" rx="28" fill="none" stroke="#7c8580" stroke-width="18"/><circle cx="350" cy="350" r="58" fill="none" stroke="#7c8580" stroke-width="18"/><path d="M220 650l170-180 110 110 80-80 100 150" fill="none" stroke="#7c8580" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

const storefrontCss = `
/* easily-storefront-sections */
section[data-easily-placeholder-section="true"]{display:none!important}
.easily-storefront-section{padding:clamp(3rem,7vw,6rem) clamp(1rem,5vw,4rem);color:inherit;background:var(--easily-storefront-background,inherit)}
.easily-storefront-inner{width:min(1180px,100%);margin:0 auto}
section[data-easily-width="narrow"] .easily-storefront-inner{width:min(820px,100%)}
section[data-easily-width="wide"] .easily-storefront-inner{width:min(1440px,100%)}
section[data-easily-width="full"] .easily-storefront-inner{width:100%}
.easily-storefront-header{display:flex;align-items:end;justify-content:space-between;gap:2rem;margin-bottom:clamp(1.5rem,3vw,2.5rem)}
.easily-storefront-header h2{margin:0;font-size:clamp(2rem,4vw,3.5rem);font-weight:700;line-height:1.05}
.easily-storefront-header p{max-width:34rem;margin:.5rem 0 0;opacity:.72}
.easily-storefront-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:clamp(1rem,2vw,1.75rem)}
.easily-storefront-grid--three{grid-template-columns:repeat(3,minmax(0,1fr))}
.easily-storefront-card{position:relative;min-width:0}
.easily-storefront-image{display:block;width:100%;aspect-ratio:3/4;object-fit:contain;background:#e8ebe9}
.easily-storefront-card h3{margin:.75rem 0 .25rem;font-size:1.05rem;font-weight:700}
.easily-storefront-card p{margin:0;opacity:.72}
.easily-storefront-price{display:block;margin-top:.5rem;font-weight:700}
.easily-storefront-badge{position:absolute;z-index:1;top:.75rem;left:.75rem;padding:.35rem .6rem;background:var(--ink,currentColor);color:var(--paper,#fff);font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em}
.easily-storefront-campaign{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(18rem,.85fr);align-items:stretch;border:1px solid currentColor}
.easily-storefront-campaign img{width:100%;height:100%;min-height:26rem;object-fit:cover}
.easily-storefront-campaign__copy{display:flex;flex-direction:column;justify-content:center;padding:clamp(2rem,5vw,5rem)}
.easily-storefront-campaign__copy h2{margin:0 0 1rem;font-size:clamp(2.25rem,5vw,4.5rem);font-weight:700;line-height:1}
.easily-storefront-action{display:inline-block;width:max-content;margin-top:1.5rem;padding:.8rem 1.1rem;border:1px solid currentColor;font-weight:700}
.easily-storefront-category{position:relative;overflow:hidden}
.easily-storefront-category img{aspect-ratio:4/3;object-fit:cover}
.easily-storefront-category h3{position:absolute;left:1rem;bottom:1rem;margin:0;padding:.55rem .75rem;background:var(--paper,#fff);color:var(--ink,currentColor)}
section[data-easily-item-count="2"] [data-easily-product-slot]:nth-child(n+3),section[data-easily-item-count="2"] [data-easily-category-slot]:nth-child(n+3){display:none}
section[data-easily-item-count="3"] [data-easily-product-slot]:nth-child(n+4),section[data-easily-item-count="3"] [data-easily-category-slot]:nth-child(n+4){display:none}
section[data-easily-item-count="4"] [data-easily-product-slot]:nth-child(n+5),section[data-easily-item-count="4"] [data-easily-category-slot]:nth-child(n+5){display:none}
section[data-easily-item-count="6"] [data-easily-product-slot]:nth-child(n+7),section[data-easily-item-count="6"] [data-easily-category-slot]:nth-child(n+7){display:none}
@media(max-width:800px){.easily-storefront-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.easily-storefront-campaign{grid-template-columns:1fr}.easily-storefront-campaign img{min-height:18rem}}
@media(max-width:520px){.easily-storefront-header{display:block}.easily-storefront-grid,.easily-storefront-grid--three{grid-template-columns:1fr}}
`;

function storefrontCard(index, sale = false) {
  return `<article class="easily-storefront-card" data-easily-product-slot="${index}" data-easily-placeholder="true">${sale ? '<span class="easily-storefront-badge">Rea</span>' : ''}<img class="easily-storefront-image" src="assets/easily-product-placeholder.svg" alt="Platshållare för produktbild"><h3>Produktnamn</h3><p>Kort produktbeskrivning</p><span class="easily-storefront-price">Pris</span></article>`;
}

function storefrontMarkup(kind) {
  const config = storefrontSections[kind];
  if (!config) fail('invalid-storefront-section');
  if (kind === 'campaign') return `<section class="easily-storefront-section" data-easily-storefront-section="${kind}" data-easily-width="normal" data-easily-placeholder-section="true"><div class="easily-storefront-inner"><div class="easily-storefront-campaign"><img src="assets/easily-product-placeholder.svg" alt="Platshållare för kampanjbild"><div class="easily-storefront-campaign__copy"><p>Aktuellt i butiken</p><h2>Kampanjrubrik</h2><p>Här visas en kort presentation av kampanjen när innehållet är klart.</p><span class="easily-storefront-action">Se kampanjen</span></div></div></div></section>`;
  if (kind === 'categories') {
    const cards = Array.from({ length: 8 }, (_, index) => `<article class="easily-storefront-card easily-storefront-category" data-easily-category-slot="${index + 1}" data-easily-placeholder="true"><img class="easily-storefront-image" src="assets/easily-product-placeholder.svg" alt="Platshållare för kategoribild"><h3>Kategori ${index + 1}</h3></article>`).join('');
    return `<section class="easily-storefront-section" data-easily-storefront-section="${kind}" data-easily-item-count="${config.count}" data-easily-width="normal" data-easily-placeholder-section="true"><div class="easily-storefront-inner"><header class="easily-storefront-header"><div><h2>${config.label}</h2><p>${config.intro}</p></div></header><div class="easily-storefront-grid easily-storefront-grid--three">${cards}</div></div></section>`;
  }
  const cards = Array.from({ length: 8 }, (_, index) => storefrontCard(index + 1, kind === 'sale')).join('');
  const gridClass = config.count === 3 ? ' easily-storefront-grid--three' : '';
  return `<section class="easily-storefront-section" data-easily-storefront-section="${kind}" data-easily-item-count="${config.count}" data-easily-width="normal" data-easily-placeholder-section="true"><div class="easily-storefront-inner"><header class="easily-storefront-header"><div><h2>${config.label}</h2><p>${config.intro}</p></div></header><div class="easily-storefront-grid${gridClass}">${cards}</div></div></section>`;
}

// Source offsets, not a replacement HTML serializer: untouched bytes stay untouched.
// Editable scope for the first milestone is text nodes inside h1–h6 only.
export function headingSources(html) {
  const headings = [];
  let current = null;
  const tokens = /<!--[\s\S]*?-->|<(script|style|textarea|template)\b[^>]*>[\s\S]*?<\/\1\s*>|<(?:[^>"']|"[^"]*"|'[^']*')*>|[^<]+/gi;
  for (const token of html.matchAll(tokens)) {
    const value = token[0];
    const start = value.match(/^<h([1-6])\b/i);
    if (start) {
      current = { key: String(headings.length), level: start[1], tagStart: token.index, tagEnd: token.index + value.length, texts: [] };
      headings.push(current);
    } else if (/^<\/h[1-6]\s*>/i.test(value)) current = null;
    else if (current && !value.startsWith('<')) {
      current.texts.push({ start: token.index, end: token.index + value.length, raw: value });
    }
  }
  return headings;
}

// Editable non-heading copy. Nested markup (for example a <span> inside a
// button) is kept intact; only the selected source text node is replaced.
export function textSources(html) {
  const elements = [];
  const editable = new Set(['p', 'a', 'button']);
  const voidTags = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
  const tokens = /<!--[\s\S]*?-->|<(script|style|textarea|template)\b[^>]*>[\s\S]*?<\/\1\s*>|<(?:[^>"']|"[^"]*"|'[^']*')*>|[^<]+/gi;
  let current = null;
  let depth = 0;
  for (const token of html.matchAll(tokens)) {
    const value = token[0];
    const start = value.match(/^<([a-z][a-z0-9:-]*)\b/i);
    const end = value.match(/^<\/([a-z][a-z0-9:-]*)\s*>/i);
    if (start) {
      const tag = start[1].toLowerCase();
      const closed = /\/\s*>$/.test(value) || voidTags.has(tag);
      if (!current && editable.has(tag)) {
        current = { key: String(elements.length), tag, tagStart: token.index, tagEnd: token.index + value.length, texts: [] };
        if (tag === 'a') {
          const href = /(\s+href\s*=\s*)(["'])([^"']*)\2/i.exec(value);
          if (href) {
            current.href = href[3];
            current.hrefAttributeStart = token.index + href.index;
            current.hrefAttributeEnd = token.index + href.index + href[0].length;
            current.hrefStart = token.index + href.index + href[1].length + 1;
            current.hrefEnd = current.hrefStart + href[3].length;
          } else current.href = '';
        }
        elements.push(current);
        depth = closed ? 0 : 1;
        if (closed) current = null;
      } else if (current && !closed) depth++;
    } else if (end && current) {
      depth--;
      if (depth <= 0) { current = null; depth = 0; }
    } else if (current && !value.startsWith('<')) {
      current.texts.push({ start: token.index, end: token.index + value.length, raw: value });
    }
  }
  return elements.filter(item => item.texts.some(text => text.raw.trim()));
}

export function imageSources(html) {
  const images = [];
  const tokens = /<!--[\s\S]*?-->|<(script|style|textarea|template)\b[^>]*>[\s\S]*?<\/\1\s*>|<(?:[^>"']|"[^"]*"|'[^']*')*>|[^<]+/gi;
  for (const token of html.matchAll(tokens)) {
    const value = token[0];
    if (!/^<img\b/i.test(value)) continue;
    const source = /\bsrc\s*=\s*(["'])([^"']+)\1/i.exec(value);
    if (!source) continue;
    const offset = source.index + source[0].indexOf(source[2]);
    const alt = /\balt\s*=\s*(["'])([^"']*)\1/i.exec(value)?.[2] || '';
    images.push({ key: String(images.length), tagStart: token.index, tagEnd: token.index + value.length, srcStart: token.index + offset, srcEnd: token.index + offset + source[2].length, src: source[2], alt, selfClosing: /\/\s*>$/.test(value) });
  }
  return images;
}

function setOpeningAttribute(opening, name, value) {
  const safe = String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  const expression = new RegExp(`(\\s+${name}\\s*=\\s*)(["'])([^"']*)\\2`, 'i');
  const match = expression.exec(opening);
  if (match) return opening.slice(0, match.index) + `${match[1]}${match[2]}${safe}${match[2]}` + opening.slice(match.index + match[0].length);
  const at = /\/\s*>$/.test(opening) ? opening.length - 2 : opening.length - 1;
  return opening.slice(0, at) + ` ${name}="${safe}"` + opening.slice(at);
}

export function editImagePresentation(html, { image, fit, position, alt, clearCaption = false }) {
  const fits = new Set(['contain', 'cover']);
  const positions = new Set(['center', 'top', 'bottom', 'left', 'right']);
  if (!fits.has(fit) || !positions.has(position) || (alt !== undefined && (typeof alt !== 'string' || alt.length > 500))) fail('invalid-image-style');
  const source = imageSources(html).find(item => item.key === String(image));
  if (!source) fail('image-not-found');
  const opening = html.slice(source.tagStart, source.tagEnd);
  const styleMatch = /(\s+style\s*=\s*)(["'])([^"']*)\2/i.exec(opening);
  const declarations = new Map();
  if (styleMatch) {
    for (const part of styleMatch[3].split(';')) {
      const at = part.indexOf(':');
      if (at > 0) declarations.set(part.slice(0, at).trim().toLowerCase(), part.slice(at + 1).trim());
    }
  }
  declarations.set('object-fit', fit);
  declarations.set('object-position', position);
  const style = [...declarations].map(([property, value]) => `${property}: ${value}`).join('; ');
  let editedOpening = setOpeningAttribute(opening, 'style', style);
  if (alt !== undefined) editedOpening = setOpeningAttribute(editedOpening, 'alt', alt.trim());
  let edited = html.slice(0, source.tagStart) + editedOpening + html.slice(source.tagEnd);
  if (clearCaption) {
    const after = source.tagStart + editedOpening.length;
    const tail = edited.slice(after);
    const caption = /^(\s*)(?:<span\b(?=[^>]*\bclass\s*=\s*(["'])[^"']*\bimage-note\b[^"']*\2)[^>]*>[\s\S]*?<\/span\s*>|<figcaption\b[^>]*>[\s\S]*?<\/figcaption\s*>)/i.exec(tail);
    if (caption) edited = edited.slice(0, after) + caption[1] + tail.slice(caption[0].length);
  }
  return edited;
}

export function editHeading(html, { heading, textIndex, text }) {
  if (typeof text !== 'string' || text.length > 4000 || !Number.isInteger(textIndex)) fail('invalid-heading-edit');
  const source = headingSources(html).find(item => item.key === heading)?.texts[textIndex];
  if (!source) fail('heading-text-not-found');
  return html.slice(0, source.start) + escaped(text) + html.slice(source.end);
}

export function editText(html, { element, textIndex, text }) {
  if (typeof text !== 'string' || text.length > 4000 || !Number.isInteger(textIndex)) fail('invalid-text-edit');
  const source = textSources(html).find(item => item.key === element)?.texts[textIndex];
  if (!source) fail('text-node-not-found');
  return html.slice(0, source.start) + escaped(text) + html.slice(source.end);
}

function safeHref(value) {
  if (typeof value !== 'string' || value.length > 2048) fail('invalid-link');
  const href = value.trim();
  if (!href) return '';
  if (/^(?:#|\/(?!\/)|\.\.?\/)/.test(href) || /^(?:mailto|tel):[^\s]+$/i.test(href)) return href;
  try {
    const url = new URL(href);
    if (!['http:', 'https:'].includes(url.protocol)) fail('invalid-link');
    return href;
  } catch (error) {
    if (error.message === 'invalid-link') throw error;
    fail('invalid-link');
  }
}

export function editLink(html, { element, href }) {
  const source = textSources(html).find(item => item.key === element && item.tag === 'a');
  if (!source) fail('link-not-found');
  const next = safeHref(href);
  if (source.hrefAttributeStart !== undefined) {
    if (!next) return html.slice(0, source.hrefAttributeStart) + html.slice(source.hrefAttributeEnd);
    const escapedHref = next.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
    return html.slice(0, source.hrefStart) + escapedHref + html.slice(source.hrefEnd);
  }
  if (!next) return html;
  const escapedHref = next.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  return html.slice(0, source.tagEnd - 1) + ` href="${escapedHref}"` + html.slice(source.tagEnd - 1);
}

export function editButtonTarget(html, { element, href }) {
  const source = textSources(html).find(item => item.key === element && item.tag === 'button');
  if (!source) fail('button-not-found');
  const next = safeHref(href);
  const opening = html.slice(source.tagStart, source.tagEnd);
  const match = /(\s+data-easily-href\s*=\s*)(["'])([^"']*)\2/i.exec(opening);
  let editedOpening;
  if (match) {
    if (!next) editedOpening = opening.slice(0, match.index) + opening.slice(match.index + match[0].length);
    else {
      const escapedHref = next.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
      editedOpening = opening.slice(0, match.index) + `${match[1]}${match[2]}${escapedHref}${match[2]}` + opening.slice(match.index + match[0].length);
    }
  } else if (next) {
    const escapedHref = next.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
    editedOpening = opening.slice(0, -1) + ` data-easily-href="${escapedHref}"` + opening.slice(-1);
  } else return html;
  return html.slice(0, source.tagStart) + editedOpening + html.slice(source.tagEnd);
}

function editableElement(html, kind, key) {
  const source = (kind === 'heading' ? headingSources(html) : textSources(html)).find(item => item.key === key);
  if (!source) fail('editable-element-not-found');
  return source;
}

export function editElementStyle(html, { kind, key, fontFamily, fontSize, color, fontWeight, fontStyle }) {
  if (!['heading', 'text'].includes(kind)) fail('invalid-style-edit');
  const families = {
    '': '',
    sans: 'Arial, Helvetica, sans-serif',
    serif: 'Georgia, Times New Roman, serif',
    modern: 'Inter, Arial, sans-serif',
    system: 'system-ui, sans-serif',
    playful: 'Segoe Print, Bradley Hand, Comic Sans MS, cursive'
  };
  if (!(fontFamily in families)) fail('invalid-style-edit');
  const size = fontSize === '' || fontSize == null ? '' : Number(fontSize);
  if (size !== '' && (!Number.isFinite(size) || size < 10 || size > 200)) fail('invalid-style-edit');
  if (color !== '' && color != null && !/^#[0-9a-f]{6}$/i.test(color)) fail('invalid-style-edit');
  const weight = fontWeight == null ? '' : String(fontWeight);
  if (!['', '400', '500', '600', '700', '800', '900'].includes(weight)) fail('invalid-style-edit');
  const slant = fontStyle == null ? '' : String(fontStyle);
  if (!['', 'normal', 'italic'].includes(slant)) fail('invalid-style-edit');

  const source = editableElement(html, kind, key);
  const opening = html.slice(source.tagStart, source.tagEnd);
  const match = /(\s+style\s*=\s*)(["'])([^"']*)\2/i.exec(opening);
  const declarations = new Map();
  if (match) {
    for (const part of match[3].split(';')) {
      const at = part.indexOf(':');
      if (at > 0) declarations.set(part.slice(0, at).trim().toLowerCase(), part.slice(at + 1).trim());
    }
  }
  const values = {
    'font-family': families[fontFamily],
    'font-size': size === '' ? '' : `${size}px`,
    color: color || '',
    'font-weight': weight,
    'font-style': slant
  };
  for (const [property, value] of Object.entries(values)) {
    if (value) declarations.set(property, value);
    else declarations.delete(property);
  }
  const style = [...declarations].map(([property, value]) => `${property}: ${value}`).join('; ');
  let editedOpening;
  if (match) {
    const start = match.index;
    editedOpening = style
      ? opening.slice(0, start) + `${match[1]}${match[2]}${style}${match[2]}` + opening.slice(start + match[0].length)
      : opening.slice(0, start) + opening.slice(start + match[0].length);
  } else if (style) editedOpening = opening.slice(0, -1) + ` style="${style.replaceAll('"', '&quot;')}"` + opening.slice(-1);
  else return html;
  return html.slice(0, source.tagStart) + editedOpening + html.slice(source.tagEnd);
}

export function editorHtml(html, token, revisionId) {
  let result = html;
  // All offsets refer to the untouched source. Apply every insertion in one
  // descending pass so an earlier image can never shift a later heading (or
  // vice versa) and leak editor attributes into visible page text.
  const insertions = [];
  for (const image of imageSources(html)) {
    insertions.push({
      at: image.tagEnd - (image.selfClosing ? 2 : 1),
      value: ` data-easily-image="${image.key}"`
    });
  }
  for (const heading of headingSources(html)) {
    const texts = Buffer.from(JSON.stringify(heading.texts.map(item => item.raw))).toString('base64');
    insertions.push({
      at: heading.tagEnd - 1,
      value: ` data-easily-heading="${heading.key}" data-easily-texts="${texts}"`
    });
  }
  for (const element of textSources(html)) {
    const texts = Buffer.from(JSON.stringify(element.texts.map(item => item.raw))).toString('base64');
    insertions.push({
      at: element.tagEnd - 1,
      value: ` data-easily-text="${element.key}" data-easily-kind="${element.tag}" data-easily-texts="${texts}"`
    });
  }
  for (const insertion of insertions.sort((a, b) => b.at - a.at)) {
    result = result.slice(0, insertion.at) + insertion.value + result.slice(insertion.at);
  }
  const editorOnlyStyle = '<style data-easily-editor-only>section[data-easily-placeholder-section="true"]{display:block!important}</style>';
  const headEnd = result.toLowerCase().lastIndexOf('</head>');
  result = headEnd >= 0 ? result.slice(0, headEnd) + editorOnlyStyle + result.slice(headEnd) : editorOnlyStyle + result;
  return result + `\n<script src="/_website-editor/bridge.js?token=${encodeURIComponent(token)}&revision=${encodeURIComponent(revisionId)}"></script>`;
}

export function createWebsiteDocumentStore(root) {
  function folder(projectId) {
    if (!uuid.test(projectId)) fail('invalid-project-id');
    return path.join(root, projectId);
  }
  function read(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  function state(projectId) {
    const file = path.join(folder(projectId), 'state.json');
    return fs.existsSync(file) ? read(file) : null;
  }
  function revision(projectId, revisionId) {
    if (!uuid.test(revisionId || '')) fail('invalid-revision');
    const item = read(path.join(folder(projectId), 'revisions', `${revisionId}.json`));
    if (item.projectId !== projectId || item.id !== revisionId) fail('revision-integrity-failed', 500);
    return item;
  }
  function file(projectId, rev, filename) {
    const hash = rev.files[filename];
    if (!/^[a-f0-9]{64}$/.test(hash || '')) fail('document-file-not-found', 404);
    const content = fs.readFileSync(path.join(folder(projectId), 'blobs', hash));
    if (digest(content) !== hash) fail('document-integrity-failed', 500);
    return content;
  }
  function blob(projectId, bytes) {
    const hash = digest(bytes);
    const target = path.join(folder(projectId), 'blobs', hash);
    if (!fs.existsSync(target)) fs.writeFileSync(target, bytes, { flag: 'wx' });
    return hash;
  }
  function conversation(projectId, current = state(projectId)) {
    if (!current) return [];
    if (Array.isArray(current.conversation)) return current.conversation;
    // Existing projects already saved successful AI exchanges in their revisions.
    return current.revisionIds.flatMap(id => {
      const rev = revision(projectId, id), op = rev.operation;
      return op?.type === 'ai-edit' ? [{ requestId: op.requestId, baseRevision: rev.parentRevision, revisionId: id, instruction: op.instruction, message: op.message, changed: true, createdAt: rev.createdAt }] : [];
    });
  }
  function products(projectId, rev) {
    const current = state(projectId);
    const selected = rev || (current && revision(projectId, current.headRevision));
    if (!selected) return [];
    if (selected.files['products.json']) {
      try {
        const value = JSON.parse(file(projectId, selected, 'products.json').toString('utf8'));
        if (Array.isArray(value)) return value;
      } catch { fail('product-catalog-invalid', 500); }
    }
    // Recover products created before the catalog file was introduced.
    const html = file(projectId, selected, 'index.html').toString('utf8');
    const recovered = [];
    for (const revisionId of current?.revisionIds || []) {
      const item = revision(projectId, revisionId);
      if (item.operation?.type !== 'product-add' || typeof item.operation.instruction !== 'string') continue;
      const match = /auktoritativa:\s*(\{[^\n]+?\})\. Bildens src/.exec(item.operation.instruction);
      if (!match) continue;
      try {
        const product = JSON.parse(match[1]);
        const id = /^assets\/product-([0-9a-f-]{36})\./i.exec(product.image || '')?.[1];
        if (id && selected.files[product.image] && html.includes(product.image) && !recovered.some(entry => entry.id === id)) recovered.push({ id, ...product });
      } catch { /* An older malformed operation is ignored, never shown as a product. */ }
    }
    return recovered;
  }
  function writeState(projectId, next) {
    const dir = folder(projectId);
    const temp = path.join(dir, `state.${crypto.randomUUID()}.tmp`);
    try {
      fs.writeFileSync(temp, JSON.stringify(next, null, 2), { flag: 'wx' });
      fs.renameSync(temp, path.join(dir, 'state.json'));
    } finally { if (fs.existsSync(temp)) fs.unlinkSync(temp); }
  }
  function commit(projectId, baseRevision, files, operation, sourceRunId, turn) {
    const previous = state(projectId);
    if ((previous?.headRevision ?? null) !== baseRevision) fail('revision-conflict', 409);
    const id = crypto.randomUUID();
    const rev = { id, projectId, parentRevision: baseRevision, sourceRunId, operation, createdAt: new Date().toISOString(), files };
    rev.contentHash = digest(JSON.stringify(Object.entries(files).sort(([a], [b]) => a.localeCompare(b))));
    const dir = folder(projectId);
    fs.mkdirSync(path.join(dir, 'revisions'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'revisions', `${id}.json`), JSON.stringify(rev, null, 2), { flag: 'wx' });
    const next = { ...previous, schemaVersion: 1, projectId, headRevision: id, revisionIds: [...(previous?.revisionIds || []), id] };
    if (turn) next.conversation = [...conversation(projectId, previous), { ...turn, revisionId: id }];
    else if (operation === 'generation-import') next.conversation = [];
    // Only this atomic pointer swap makes a revision visible. A failed save leaves the old head intact.
    writeState(projectId, next);
    return rev;
  }
  function importGeneration(projectId, source, sourceRunId, replace = false, expectedRevision) {
    const previous = state(projectId);
    if (expectedRevision !== undefined && (previous?.headRevision ?? null) !== expectedRevision) fail('revision-conflict', 409);
    if (previous && !replace) return revision(projectId, previous.headRevision);
    fs.mkdirSync(path.join(folder(projectId), 'blobs'), { recursive: true });
    const files = {};
    function collect(dir, prefix = '') {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const relative = prefix + entry.name;
        if (entry.isSymbolicLink()) fail('symlink-not-allowed');
        if (entry.isDirectory() && relative === 'assets') collect(path.join(dir, entry.name), 'assets/');
        else if (entry.isFile() && (/^(index\.html|styles\.css|site\.js)$/.test(relative) || /^assets\/[a-zA-Z0-9_.-]+\.(webp|png|jpe?g|gif|svg|woff2?)$/.test(relative))) {
          files[relative] = blob(projectId, fs.readFileSync(path.join(dir, entry.name)));
        }
      }
    }
    collect(source);
    for (const required of ['index.html', 'styles.css', 'site.js']) if (!files[required]) fail('incomplete-generated-website');
    return commit(projectId, previous?.headRevision ?? null, files, 'generation-import', sourceRunId);
  }
  function saveHeading(projectId, change) {
    const latest = state(projectId);
    if (!latest || change.baseRevision !== latest.headRevision) fail('revision-conflict', 409);
    const base = revision(projectId, latest.headRevision);
    const html = file(projectId, base, 'index.html').toString('utf8');
    const edited = editHeading(html, change);
    if (edited === html) return base;
    const files = { ...base.files, 'index.html': blob(projectId, Buffer.from(edited)) };
    return commit(projectId, base.id, files, 'heading-edit', base.sourceRunId);
  }
  function saveStorefrontSection(projectId, change) {
    const latest = state(projectId);
    if (!latest || change?.baseRevision !== latest.headRevision) fail('revision-conflict', 409);
    if (!Object.hasOwn(storefrontSections, change?.kind || '')) fail('invalid-storefront-section');
    const base = revision(projectId, latest.headRevision);
    const html = file(projectId, base, 'index.html').toString('utf8');
    if (html.includes(`data-easily-storefront-section="${change.kind}"`)) fail('storefront-section-exists', 409);
    const section = storefrontMarkup(change.kind);
    const lower = html.toLowerCase();
    let at = lower.lastIndexOf('</main>');
    if (at < 0) at = lower.lastIndexOf('</body>');
    if (at < 0) fail('incomplete-generated-website');
    const edited = html.slice(0, at) + section + html.slice(at);
    const css = file(projectId, base, 'styles.css').toString('utf8');
    const nextCss = css.includes('/* easily-storefront-sections */') ? css : css + storefrontCss;
    const files = {
      ...base.files,
      'index.html': blob(projectId, Buffer.from(edited)),
      'styles.css': blob(projectId, Buffer.from(nextCss)),
      'assets/easily-product-placeholder.svg': blob(projectId, Buffer.from(storefrontPlaceholderSvg))
    };
    return commit(projectId, base.id, files, { type: 'storefront-section-add', kind: change.kind, label: storefrontSections[change.kind].label }, base.sourceRunId);
  }
  function saveContentSection(projectId, change, content) {
    const latest = state(projectId);
    if (!latest || change?.baseRevision !== latest.headRevision) fail('revision-conflict', 409);
    if (!Object.hasOwn(contentSections, change?.kind || '')) fail('invalid-content-section');
    const base = revision(projectId, latest.headRevision);
    const html = file(projectId, base, 'index.html').toString('utf8');
    const existingPattern = new RegExp(`<section\\b(?=[^>]*data-easily-content-section=["']${change.kind}["'])[^>]*>[\\s\\S]*?<\\/section\\s*>`, 'i');
    const existing = existingPattern.exec(html);
    if (existing && change.refresh !== true) fail('content-section-exists', 409);
    const section = contentSectionMarkup(change.kind, content);
    const lower = html.toLowerCase();
    let edited;
    if (existing) edited = html.slice(0, existing.index) + section + html.slice(existing.index + existing[0].length);
    else {
      let at = lower.lastIndexOf('</main>');
      if (at < 0) at = lower.lastIndexOf('</body>');
      if (at < 0) fail('incomplete-generated-website');
      edited = html.slice(0, at) + section + html.slice(at);
    }
    const css = file(projectId, base, 'styles.css').toString('utf8');
    const nextCss = css.includes('/* easily-content-sections */') ? css : css + contentSectionCss;
    const files = {
      ...base.files,
      'index.html': blob(projectId, Buffer.from(edited)),
      'styles.css': blob(projectId, Buffer.from(nextCss)),
      'assets/easily-content-placeholder.svg': blob(projectId, Buffer.from(contentPlaceholderSvg))
    };
    if (edited === html && nextCss === css) return base;
    return commit(projectId, base.id, files, { type: existing ? 'content-section-refresh' : 'content-section-add', kind: change.kind, label: contentSections[change.kind].label }, base.sourceRunId);
  }
  function removeStorefrontSection(projectId, change) {
    const latest = state(projectId);
    if (!latest || change?.baseRevision !== latest.headRevision) fail('revision-conflict', 409);
    if (!Object.hasOwn(storefrontSections, change?.kind || '')) fail('invalid-storefront-section');
    const base = revision(projectId, latest.headRevision);
    const html = file(projectId, base, 'index.html').toString('utf8');
    const pattern = new RegExp(`<section\\b(?=[^>]*data-easily-storefront-section=["']${change.kind}["'])[^>]*>[\\s\\S]*?<\\/section\\s*>`, 'i');
    const match = pattern.exec(html);
    if (!match) fail('storefront-section-not-found', 404);
    const edited = html.slice(0, match.index) + html.slice(match.index + match[0].length);
    const files = { ...base.files, 'index.html': blob(projectId, Buffer.from(edited)) };
    return commit(projectId, base.id, files, { type: 'storefront-section-remove', kind: change.kind, label: storefrontSections[change.kind].label }, base.sourceRunId);
  }
  function removeContentSection(projectId, change) {
    const latest = state(projectId);
    if (!latest || change?.baseRevision !== latest.headRevision) fail('revision-conflict', 409);
    if (!Object.hasOwn(contentSections, change?.kind || '')) fail('invalid-content-section');
    const base = revision(projectId, latest.headRevision);
    const html = file(projectId, base, 'index.html').toString('utf8');
    const pattern = new RegExp(`<section\\b(?=[^>]*data-easily-content-section=["']${change.kind}["'])[^>]*>[\\s\\S]*?<\\/section\\s*>`, 'i');
    const match = pattern.exec(html);
    if (!match) fail('content-section-not-found', 404);
    const edited = html.slice(0, match.index) + html.slice(match.index + match[0].length);
    const files = { ...base.files, 'index.html': blob(projectId, Buffer.from(edited)) };
    return commit(projectId, base.id, files, { type: 'content-section-remove', kind: change.kind, label: contentSections[change.kind].label }, base.sourceRunId);
  }
  function adoptContentSection(projectId, change) {
    const latest = state(projectId);
    if (!latest || change?.baseRevision !== latest.headRevision) fail('revision-conflict', 409);
    if (change?.kind !== 'about') fail('invalid-content-section');
    const base = revision(projectId, latest.headRevision);
    const html = file(projectId, base, 'index.html').toString('utf8');
    if (/data-easily-content-section=["']about["']/i.test(html)) fail('content-section-exists', 409);
    const sections = topLevelSectionRanges(html);
    const source = sections.find(section => /\bclass=["'][^"']*\bteam-section\b[^"']*["']/i.test(section.opening) && /\bid=["']team["']/i.test(section.opening));
    if (!source) fail('adoptable-content-section-not-found', 404);
    let opening = setOpeningAttribute(source.opening, 'id', 'om');
    opening = setOpeningAttribute(opening, 'data-easily-content-section', 'about');
    const edited = html.slice(0, source.start) + opening + html.slice(source.start + source.opening.length);
    const files = { ...base.files, 'index.html': blob(projectId, Buffer.from(edited)) };
    return commit(projectId, base.id, files, { type: 'content-section-adopt', kind: 'about', label: contentSections.about.label }, base.sourceRunId);
  }
  function moveSection(projectId, change) {
    const latest = state(projectId);
    if (!latest || change?.baseRevision !== latest.headRevision) fail('revision-conflict', 409);
    const catalogs = change?.sectionType === 'content' ? contentSections : change?.sectionType === 'storefront' ? storefrontSections : null;
    if (!catalogs || !Object.hasOwn(catalogs, change?.kind || '') || !['up', 'down', 'top', 'bottom'].includes(change?.direction)) fail('invalid-section-move');
    const attribute = change.sectionType === 'content' ? 'data-easily-content-section' : 'data-easily-storefront-section';
    const base = revision(projectId, latest.headRevision);
    const html = file(projectId, base, 'index.html').toString('utf8');
    const ranges = topLevelSectionRanges(html);
    const selectedIndex = ranges.findIndex(section => new RegExp(`\\b${attribute}=["']${change.kind}["']`, 'i').test(section.opening));
    if (selectedIndex < 0) fail('section-not-found', 404);
    const firstIsManaged = /\bdata-easily-(?:content|storefront)-section=["']/i.test(ranges[0]?.opening || '');
    const firstMovable = firstIsManaged ? 0 : Math.min(1, ranges.length - 1);
    let targetIndex = selectedIndex;
    if (change.direction === 'up') targetIndex = Math.max(firstMovable, selectedIndex - 1);
    if (change.direction === 'down') targetIndex = Math.min(ranges.length - 1, selectedIndex + 1);
    if (change.direction === 'top') targetIndex = firstMovable;
    if (change.direction === 'bottom') targetIndex = ranges.length - 1;
    if (targetIndex === selectedIndex) return base;
    const selected = ranges[selectedIndex];
    const block = html.slice(selected.start, selected.end);
    let edited;
    if (targetIndex < selectedIndex) {
      const insertion = ranges[targetIndex].start;
      edited = html.slice(0, insertion) + block + '\n' + html.slice(insertion, selected.start) + html.slice(selected.end);
    } else {
      const insertion = ranges[targetIndex].end;
      edited = html.slice(0, selected.start) + html.slice(selected.end, insertion) + '\n' + block + html.slice(insertion);
    }
    const files = { ...base.files, 'index.html': blob(projectId, Buffer.from(edited)) };
    return commit(projectId, base.id, files, { type: 'section-move', sectionType: change.sectionType, kind: change.kind, direction: change.direction, label: catalogs[change.kind].label }, base.sourceRunId);
  }
  function normalizeStorefrontFrame(projectId, change) {
    const latest = state(projectId);
    if (!latest || change?.baseRevision !== latest.headRevision) fail('revision-conflict', 409);
    const base = revision(projectId, latest.headRevision);
    const css = file(projectId, base, 'styles.css').toString('utf8');
    const sharedRule = '.easily-storefront-image{display:block;width:100%;aspect-ratio:3/4;object-fit:contain;background:#e8ebe9}';
    let edited = css.replace(/\.easily-storefront-image\{display:block;width:100%;aspect-ratio:(?:1\/1|4\/5|3\/4);object-fit:(?:cover|contain);background:#e8ebe9\}/, sharedRule);
    edited = edited.replace('.easily-storefront-header h2{margin:0;font:inherit;', '.easily-storefront-header h2{margin:0;');
    edited = edited.replace('.easily-storefront-card h3{margin:.75rem 0 .25rem;font:inherit;', '.easily-storefront-card h3{margin:.75rem 0 .25rem;');
    edited = edited.replace('.easily-storefront-campaign__copy h2{margin:0 0 1rem;font:inherit;', '.easily-storefront-campaign__copy h2{margin:0 0 1rem;');
    edited = edited.replace('.easily-storefront-category img{aspect-ratio:4/3}', '.easily-storefront-category img{aspect-ratio:4/3;object-fit:cover}');
    if (!edited.includes('/* easily-shared-product-frame */')) {
      edited += '\n/* easily-shared-product-frame */\n.product-image-wrap{min-height:0;aspect-ratio:3/4;overflow:hidden}\n.product-image-wrap img{width:100%;height:100%;min-height:0;object-fit:contain}\n';
    }
    if (edited === css) return base;
    const files = { ...base.files, 'styles.css': blob(projectId, Buffer.from(edited)) };
    return commit(projectId, base.id, files, { type: 'storefront-frame-update', frame: 'portrait-3-4-contain' }, base.sourceRunId);
  }
  function saveText(projectId, change) {
    const latest = state(projectId);
    if (!latest || change.baseRevision !== latest.headRevision) fail('revision-conflict', 409);
    const base = revision(projectId, latest.headRevision);
    const html = file(projectId, base, 'index.html').toString('utf8');
    const edited = editText(html, change);
    if (edited === html) return base;
    const files = { ...base.files, 'index.html': blob(projectId, Buffer.from(edited)) };
    return commit(projectId, base.id, files, { type: 'text-edit', element: String(change.element) }, base.sourceRunId);
  }
  function saveLink(projectId, change) {
    const latest = state(projectId);
    if (!latest || change?.baseRevision !== latest.headRevision) fail('revision-conflict', 409);
    const base = revision(projectId, latest.headRevision);
    const html = file(projectId, base, 'index.html').toString('utf8');
    const edited = editLink(html, change);
    if (edited === html) return base;
    const files = { ...base.files, 'index.html': blob(projectId, Buffer.from(edited)) };
    return commit(projectId, base.id, files, { type: 'link-edit', element: String(change.element), href: safeHref(change.href) }, base.sourceRunId);
  }
  function saveTarget(projectId, change) {
    const latest = state(projectId);
    if (!latest || change?.baseRevision !== latest.headRevision) fail('revision-conflict', 409);
    if (!['a', 'button'].includes(change.kind)) fail('invalid-target-edit');
    const base = revision(projectId, latest.headRevision);
    const html = file(projectId, base, 'index.html').toString('utf8');
    const edited = change.kind === 'a' ? editLink(html, change) : editButtonTarget(html, change);
    if (edited === html) return base;
    const files = { ...base.files, 'index.html': blob(projectId, Buffer.from(edited)) };
    if (change.kind === 'button' && safeHref(change.href)) {
      const script = file(projectId, base, 'site.js').toString('utf8');
      const marker = '/* easily-button-targets */';
      if (!script.includes(marker)) {
        const runtime = `\n${marker}\ndocument.addEventListener('click',function(event){var button=event.target.closest&&event.target.closest('button[data-easily-href]');if(!button)return;event.preventDefault();window.location.assign(button.getAttribute('data-easily-href'));});\n`;
        files['site.js'] = blob(projectId, Buffer.from(script + runtime));
      }
    }
    return commit(projectId, base.id, files, { type: 'target-edit', kind: change.kind, element: String(change.element), href: safeHref(change.href) }, base.sourceRunId);
  }
  function saveStyle(projectId, change) {
    const latest = state(projectId);
    if (!latest || change?.baseRevision !== latest.headRevision) fail('revision-conflict', 409);
    const base = revision(projectId, latest.headRevision);
    const html = file(projectId, base, 'index.html').toString('utf8');
    const edited = editElementStyle(html, change);
    if (edited === html) return base;
    const files = { ...base.files, 'index.html': blob(projectId, Buffer.from(edited)) };
    return commit(projectId, base.id, files, { type: 'style-edit', kind: change.kind, key: String(change.key) }, base.sourceRunId);
  }
  function imageSelection(projectId, change) {
    const latest = state(projectId);
    if (!latest || change?.baseRevision !== latest.headRevision) fail('revision-conflict', 409);
    const base = revision(projectId, latest.headRevision);
    const html = file(projectId, base, 'index.html').toString('utf8');
    const source = imageSources(html).find(item => item.key === String(change.image));
    if (!source) fail('image-not-found');
    return { base, html, source };
  }
  function saveImageBytes(projectId, change, bytes, mimeType, operation) {
    const extension = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' }[mimeType];
    if (!extension || !Buffer.isBuffer(bytes) || !bytes.length || bytes.length > 20_000_000) fail('invalid-image');
    const { base, html, source } = imageSelection(projectId, change);
    const prefix = operation?.type === 'ai-image-edit' ? 'generated' : 'user';
    const name = `assets/${prefix}-${crypto.randomUUID()}.${extension}`;
    const assetHash = blob(projectId, bytes);
    let edited = html.slice(0, source.srcStart) + name + html.slice(source.srcEnd);
    if (operation?.type === 'image-edit') {
      edited = editImagePresentation(edited, {
        image: change.image,
        fit: change.fit || 'contain',
        position: change.position || 'center',
        alt: change.alt === undefined ? '' : change.alt,
        clearCaption: change.clearCaption !== false
      });
    }
    const files = { ...base.files, [name]: assetHash, 'index.html': blob(projectId, Buffer.from(edited)) };
    return commit(projectId, base.id, files, { ...operation, image: String(change.image), filename: name }, base.sourceRunId);
  }
  function saveImage(projectId, change) {
    imageSelection(projectId, change);
    if (typeof change.dataUrl !== 'string' || change.dataUrl.length > 7_000_000) fail('invalid-image');
    const match = /^data:(image\/(?:png|jpeg|webp|gif));base64,([a-zA-Z0-9+/=]+)$/.exec(change.dataUrl);
    if (!match) fail('invalid-image');
    const bytes = Buffer.from(match[2], 'base64');
    if (!bytes.length || bytes.length > 5_000_000 || bytes.toString('base64').replace(/=+$/, '') !== match[2].replace(/=+$/, '')) fail('invalid-image');
    return saveImageBytes(projectId, change, bytes, match[1], { type: 'image-edit' });
  }
  function saveGeneratedImage(projectId, change, generated) {
    if (!uuid.test(change?.requestId || '') || typeof change?.prompt !== 'string' || !change.prompt.trim() || change.prompt.length > 2000) fail('invalid-image-prompt');
    return saveImageBytes(projectId, change, generated?.bytes, generated?.mimeType, {
      type: 'ai-image-edit',
      requestId: change.requestId,
      prompt: change.prompt.trim(),
      providerRequestId: generated?.providerRequestId || null
    });
  }
  function saveImageStyle(projectId, change) {
    const latest = state(projectId);
    if (!latest || change?.baseRevision !== latest.headRevision) fail('revision-conflict', 409);
    const base = revision(projectId, latest.headRevision);
    const html = file(projectId, base, 'index.html').toString('utf8');
    const edited = editImagePresentation(html, change);
    if (edited === html) return base;
    const files = { ...base.files, 'index.html': blob(projectId, Buffer.from(edited)) };
    return commit(projectId, base.id, files, { type: 'image-style-edit', image: String(change.image), fit: change.fit, position: change.position }, base.sourceRunId);
  }
  async function edit(projectId, change, proposeEdit, attachment) {
    if (!change || typeof change.instruction !== 'string' || !change.instruction.trim() || change.instruction.length > 4000 || (change.displayInstruction !== undefined && (typeof change.displayInstruction !== 'string' || !change.displayInstruction.trim() || change.displayInstruction.length > 1000)) || !uuid.test(change.requestId || '')) fail('invalid-edit-request');
    const latest = state(projectId);
    if (!latest) fail('document-not-found', 404);
    const base = revision(projectId, latest.headRevision);
    const history = conversation(projectId, latest);
    const historyVersion = digest(JSON.stringify(history));
    const replay = history.find(turn => turn.requestId === change.requestId);
    if (replay) {
      if (replay.instruction !== change.instruction || replay.baseRevision !== change.baseRevision) fail('invalid-edit-request');
      if (replay.revisionId !== base.id) fail('revision-conflict', 409);
      return { rev: base, message: replay.message, changed: replay.changed };
    }
    if (base.id !== change.baseRevision) fail('revision-conflict', 409);
    if (change.conversationVersion && change.conversationVersion !== historyVersion) fail('conversation-conflict', 409);
    if (typeof proposeEdit !== 'function') fail('ai-not-configured', 503);
    const files = Object.fromEntries(['index.html', 'styles.css', 'site.js'].map(name => [name, file(projectId, base, name).toString('utf8')]));
    if (Object.values(files).join('').length > 300000) fail('document-too-large', 413);
    // Bound model context, keeping complete recent exchanges and role provenance.
    const recent = [];
    let size = 0;
    for (const turn of history.slice(-12).reverse()) {
      size += turn.instruction.length + turn.message.length;
      if (size > 24000) break;
      recent.unshift({ instruction: turn.instruction, message: turn.message, changed: turn.changed });
    }
    const assets = Object.keys(base.files).filter(name => name.startsWith('assets/'));
    if (attachment) {
      const validBytes = attachment.bytes == null || (Buffer.isBuffer(attachment.bytes) && attachment.bytes.length && attachment.bytes.length <= 5_000_000);
      if (!/^assets\/product-[a-f0-9-]+\.(?:png|jpg|webp|gif)$/.test(attachment.name || '') || !validBytes || !attachment.product || !uuid.test(attachment.product.id || '') || !['add', 'edit'].includes(attachment.mode)) fail('invalid-product');
      if (!assets.includes(attachment.name)) assets.push(attachment.name);
    }
    const result = await proposeEdit({ instruction: change.instruction, history: recent, files, assets });
    const next = applyDocumentPatches(files, result);
    if (attachment && !next['index.html'].includes(attachment.name)) fail('incomplete-ai-section');
    if (change.requiredAsset && !next['index.html'].includes(change.requiredAsset)) fail('incomplete-ai-section');
    // A manual edit or second request may have completed while AI was working.
    if (state(projectId).headRevision !== base.id) fail('revision-conflict', 409);
    if (digest(JSON.stringify(conversation(projectId))) !== historyVersion) fail('conversation-conflict', 409);
    const changed = Object.keys(next).filter(name => next[name] !== files[name]);
    const turn = { requestId: change.requestId, baseRevision: base.id, instruction: change.instruction, displayInstruction: change.displayInstruction?.trim() || change.instruction, message: result.message, changed: !!changed.length, createdAt: new Date().toISOString() };
    if (!changed.length) {
      // A clarification is conversation metadata, not a new website version.
      writeState(projectId, { ...latest, conversation: [...history, { ...turn, revisionId: base.id }] });
      return { rev: base, message: result.message, changed: false };
    }
    const hashes = { ...base.files };
    for (const name of changed) hashes[name] = blob(projectId, Buffer.from(next[name]));
    if (attachment) {
      if (attachment.bytes) hashes[attachment.name] = blob(projectId, attachment.bytes);
      const catalog = products(projectId, base);
      const nextCatalog = attachment.mode === 'edit' ? catalog.map(item => item.id === attachment.product.id ? attachment.product : item) : [...catalog, attachment.product];
      hashes['products.json'] = blob(projectId, Buffer.from(JSON.stringify(nextCatalog, null, 2)));
    }
    const operation = { type: attachment ? (attachment.mode === 'edit' ? 'product-edit' : 'product-add') : (change.operationType || 'ai-edit'), requestId: change.requestId, instruction: change.instruction, message: result.message };
    return { rev: commit(projectId, base.id, hashes, operation, base.sourceRunId, turn), message: result.message, changed: true };
  }
  function restore(projectId, change) {
    const latest = state(projectId);
    if (!latest || change?.baseRevision !== latest.headRevision) fail('revision-conflict', 409);
    if (!['undo', 'redo', 'history'].includes(change?.reason) || !uuid.test(change?.targetRevision || '') || !latest.revisionIds.includes(change.targetRevision)) fail('invalid-restore');
    const base = revision(projectId, latest.headRevision);
    const target = revision(projectId, change.targetRevision);
    if (change.reason === 'undo' && target.id !== base.parentRevision) fail('invalid-undo');
    if (change.reason === 'redo' && (base.operation?.type !== 'restore' || base.operation.reason !== 'undo' || target.id !== base.operation.sourceRevision)) fail('invalid-redo');
    if (target.id === base.id) return base;
    return commit(projectId, base.id, { ...target.files }, { type: 'restore', reason: change.reason, sourceRevision: base.id, targetRevision: target.id }, base.sourceRunId);
  }
  function removeProduct(projectId, change) {
    const latest = state(projectId);
    if (!latest || change?.baseRevision !== latest.headRevision) fail('revision-conflict', 409);
    if (!uuid.test(change?.productId || '')) fail('invalid-product');
    const base = revision(projectId, latest.headRevision);
    const catalog = products(projectId, base);
    const product = catalog.find(item => item.id === change.productId);
    if (!product) fail('product-not-found', 404);
    const html = file(projectId, base, 'index.html').toString('utf8');
    const sections = [...html.matchAll(/<section\b[^>]*>[\s\S]*?<\/section\s*>/gi)].filter(match => match[0].includes(product.image));
    if (sections.length !== 1) fail('product-section-not-found');
    const section = sections[0];
    const edited = html.slice(0, section.index) + html.slice(section.index + section[0].length);
    const files = { ...base.files, 'index.html': blob(projectId, Buffer.from(edited)), 'products.json': blob(projectId, Buffer.from(JSON.stringify(catalog.filter(item => item.id !== product.id), null, 2))) };
    delete files[product.image];
    return commit(projectId, base.id, files, { type: 'product-remove', productId: product.id, name: product.name }, base.sourceRunId);
  }
  function saveProductRecord(projectId, change, product, bytes) {
    const latest = state(projectId);
    if (!latest || change?.baseRevision !== latest.headRevision) fail('revision-conflict', 409);
    if (!product || !uuid.test(product.id || '') || !/^assets\/product-[a-f0-9-]+\.(?:png|jpg|webp|gif)$/.test(product.image || '') || (bytes && (!Buffer.isBuffer(bytes) || !bytes.length || bytes.length > 5_000_000))) fail('invalid-product');
    const base = revision(projectId, latest.headRevision);
    const catalog = products(projectId, base);
    const existing = catalog.find(item => item.id === product.id);
    const nextCatalog = existing ? catalog.map(item => item.id === product.id ? product : item) : [...catalog, product];
    const files = { ...base.files, 'products.json': blob(projectId, Buffer.from(JSON.stringify(nextCatalog, null, 2))) };
    if (bytes) files[product.image] = blob(projectId, bytes);
    if (existing && existing.image !== product.image) delete files[existing.image];
    return commit(projectId, base.id, files, { type: existing ? 'product-edit' : 'product-add', productId: product.id, name: product.name }, base.sourceRunId);
  }
  function versions(projectId) {
    const current = state(projectId);
    if (!current) return [];
    return current.revisionIds.map(id => {
      const rev = revision(projectId, id), operation = typeof rev.operation === 'string' ? { type: rev.operation } : rev.operation;
      return { id: rev.id, parentRevision: rev.parentRevision, createdAt: rev.createdAt, contentHash: rev.contentHash, operation, current: rev.id === current.headRevision, published: rev.id === current.publishedRevisionId };
    });
  }
  function publish(projectId, revisionId) {
    const current = state(projectId);
    if (!current || !uuid.test(revisionId || '') || !current.revisionIds.includes(revisionId)) fail('invalid-publish-version');
    const rev = revision(projectId, revisionId);
    writeState(projectId, { ...current, publishedRevisionId: revisionId, publishedAt: new Date().toISOString() });
    return rev;
  }
  return { state, revision, file, importGeneration, saveHeading, saveStorefrontSection, removeStorefrontSection, saveContentSection, removeContentSection, adoptContentSection, moveSection, normalizeStorefrontFrame, saveText, saveLink, saveTarget, saveStyle, saveImage, saveImageStyle, saveGeneratedImage, imageSelection, edit, conversation, products, saveProductRecord, removeProduct, restore, versions, publish };
}

export function createWebsiteDocumentRoutes({ dataRoot, outputRoot, root, loadProject, requireWriteAuth, parseBody, sendJson, proposeEdit, generateImage, composeAbout, publishDocument }) {
  const store = createWebsiteDocumentStore(path.join(dataRoot, 'website-documents'));
  function summary(projectId, rev) {
    const history = store.conversation(projectId);
    const versions = store.versions(projectId);
    const current = versions.find(item => item.current);
    return { ok: true, projectId, revisionId: rev.id, contentHash: rev.contentHash, sourceRunId: rev.sourceRunId, path: `/website-document/${projectId}/${rev.id}/index.html`, conversationVersion: digest(JSON.stringify(history)), conversation: history.slice(-40).map(({ instruction, displayInstruction, message, changed }) => ({ instruction, displayInstruction: displayInstruction || instruction, message, changed })), versions: versions.slice(-50), canUndo: !!current?.parentRevision, redoRevision: current?.operation?.type === 'restore' && current.operation.reason === 'undo' ? current.operation.sourceRevision : null };
  }
  async function handle(req, res, url) {
    const api = url.pathname.match(/^\/api\/website-documents\/([^/]+)\/(open|products|heading|text|link|target|style|image|image-style|generate-image|product|product-section|product-remove|storefront-section|storefront-remove|storefront-frame|content-section|content-remove|content-adopt|section-move|edit|restore|publish)$/);
    const page = url.pathname.match(/^\/website-document\/([^/]+)\/([^/]+)\/(.+)$/);
    if (!api && !page && url.pathname !== '/_website-editor/bridge.js') return false;
    try {
      if (api) {
        if (req.method !== 'POST') fail('method-not-allowed', 405);
        if (!requireWriteAuth(req)) fail('unauthorized', 401);
        const [, projectId, action] = api;
        if (!uuid.test(projectId)) fail('invalid-project-id');
        const rec = loadProject(projectId);
        if (!rec) fail('project-not-found', 404);
        let rev;
        if (action === 'open') {
          const existing = store.state(projectId);
          if (existing) rev = store.revision(projectId, existing.headRevision);
          else {
            const draft = rec.draftDocument || rec.document;
            const previewPath = rec.greenfield?.previewPath || draft?.meta?.greenfieldPreviewPath || '';
            const match = previewPath.match(/^\/greenfield-site\/([a-z][a-z0-9-]{1,50})\/index\.html$/);
            if (!match) fail('generated-website-not-found', 404);
            const source = path.join(outputRoot, match[1]);
            const generation = JSON.parse(fs.readFileSync(path.join(source, 'generation.json'), 'utf8'));
            const expected = rec.greenfield?.runId || draft?.meta?.greenfieldRunId;
            if (!expected || generation.runId !== expected) fail('generation-source-mismatch', 409);
            rev = store.importGeneration(projectId, source, expected);
          }
        } else if (action === 'products') {
          const current = store.state(projectId);
          if (!current) fail('document-not-found', 404);
          rev = store.revision(projectId, current.headRevision);
          const html = store.file(projectId, rev, 'index.html').toString('utf8');
          sendJson(res, 200, { ...summary(projectId, rev), products: store.products(projectId, rev).map(product => ({ ...product, placed: html.includes(product.image) })) });
          return true;
        } else if (action === 'storefront-section') {
          rev = store.saveStorefrontSection(projectId, await parseBody(req));
        } else if (action === 'storefront-remove') {
          rev = store.removeStorefrontSection(projectId, await parseBody(req));
        } else if (action === 'content-section') {
          const body = await parseBody(req);
          const facts = businessFactsFromProject(rec);
          const fallback = fallbackAboutContent(facts);
          let copy = fallback;
          if (composeAbout) {
            try { copy = await composeAbout({ facts }) || fallback; }
            catch { copy = fallback; }
          }
          rev = store.saveContentSection(projectId, body, copy);
        } else if (action === 'content-remove') {
          rev = store.removeContentSection(projectId, await parseBody(req));
        } else if (action === 'content-adopt') {
          rev = store.adoptContentSection(projectId, await parseBody(req));
        } else if (action === 'section-move') {
          rev = store.moveSection(projectId, await parseBody(req));
        } else if (action === 'storefront-frame') {
          rev = store.normalizeStorefrontFrame(projectId, await parseBody(req));
        } else if (action === 'product-remove') {
          rev = store.removeProduct(projectId, await parseBody(req));
        } else if (action === 'product-section') {
          const body = await parseBody(req);
          if (!body || !uuid.test(body.productId || '') || !uuid.test(body.requestId || '')) fail('invalid-product');
          const current = store.state(projectId);
          if (!current || body.baseRevision !== current.headRevision) fail('revision-conflict', 409);
          const base = store.revision(projectId, current.headRevision);
          const product = store.products(projectId, base).find(item => item.id === body.productId);
          if (!product) fail('product-not-found', 404);
          if (store.file(projectId, base, 'index.html').toString('utf8').includes(product.image)) fail('product-already-placed', 409);
          const instruction = `Lägg till exakt en komplett produktsektion för denna redan sparade produkt utan att ändra något annat: ${JSON.stringify(product)}. Bildens src måste vara exakt ${product.image}. Visa namn, beskrivning och pris samt kategori om den finns. Återanvänd webbplatsens befintliga visuella språk och gör sektionen responsiv. Hitta inte på fler uppgifter, produkter, lagerstatus eller erbjudanden.`;
          const result = await store.edit(projectId, { baseRevision: body.baseRevision, conversationVersion: body.conversationVersion, requestId: body.requestId, instruction, displayInstruction: `Visa produkten ${product.name} på sidan`, requiredAsset: product.image, operationType: 'product-place' }, proposeEdit);
          sendJson(res, 200, { ...summary(projectId, result.rev), message: result.message, changed: result.changed ?? true });
          return true;
        } else if (action === 'product') {
          const body = await parseBody(req);
          const fields = ['name', 'description', 'price'];
          if (!body || fields.some(key => typeof body[key] !== 'string' || !body[key].trim()) || body.name.length > 160 || body.description.length > 2000 || body.price.length > 80 || (body.category !== undefined && (typeof body.category !== 'string' || body.category.length > 120)) || (body.imageAlt !== undefined && (typeof body.imageAlt !== 'string' || body.imageAlt.length > 500)) || (body.productId !== undefined && !uuid.test(body.productId || '')) || (body.imageDataUrl !== undefined && (typeof body.imageDataUrl !== 'string' || body.imageDataUrl.length > 7_000_000))) fail('invalid-product');
          const current = store.state(projectId);
          if (!current || body.baseRevision !== current.headRevision) fail('revision-conflict', 409);
          const base = store.revision(projectId, current.headRevision);
          const existing = body.productId ? store.products(projectId, base).find(item => item.id === body.productId) : null;
          if (body.productId && !existing) fail('product-not-found', 404);
          const image = body.imageDataUrl ? /^data:(image\/(?:png|jpeg|webp|gif));base64,([a-zA-Z0-9+/=]+)$/.exec(body.imageDataUrl) : null;
          if (!existing && !image) fail('invalid-product');
          if (body.imageDataUrl && !image) fail('invalid-product');
          const bytes = image ? Buffer.from(image[2], 'base64') : null;
          if (bytes && (!bytes.length || bytes.length > 5_000_000 || bytes.toString('base64').replace(/=+$/, '') !== image[2].replace(/=+$/, ''))) fail('invalid-product');
          const extension = image ? { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' }[image[1]] : null;
          const productId = existing?.id || crypto.randomUUID();
          const assetName = image ? `assets/product-${productId}.${extension}` : existing.image;
          const product = { id: productId, name: body.name.trim(), description: body.description.trim(), price: body.price.trim(), category: String(body.category || '').trim(), image: assetName, imageAlt: String(body.imageAlt || body.name).trim() };
          const instruction = existing
            ? `Ändra endast den befintliga produktsektion som innehåller bildsökvägen ${existing.image}. Tidigare verifierade produktuppgifter: ${JSON.stringify(existing)}. Ersätt dem med dessa verifierade uppgifter: ${JSON.stringify(product)}. Bildens src måste efter ändringen vara exakt ${assetName}. Bevara sektionens layout och webbplatsens övriga innehåll. Hitta inte på fler uppgifter.`
            : `Lägg till exakt en komplett produktsektion i den befintliga webbplatsen utan att ändra något annat. Använd produktuppgifterna i denna JSON som verifierade och auktoritativa: ${JSON.stringify(product)}. Bildens src måste vara exakt ${assetName}. Visa namn, beskrivning och pris samt kategori om den finns. Återanvänd webbplatsens befintliga visuella språk och gör sektionen responsiv. Hitta inte på fler uppgifter, produkter, lagerstatus eller erbjudanden.`;
          const placed = !!existing && store.file(projectId, base, 'index.html').toString('utf8').includes(existing.image);
          if (!placed) {
            rev = store.saveProductRecord(projectId, body, product, bytes);
            sendJson(res, 200, summary(projectId, rev));
            return true;
          }
          const result = await store.edit(projectId, { baseRevision: body.baseRevision, conversationVersion: body.conversationVersion, requestId: body.requestId, instruction, displayInstruction: `Ändra produkten ${product.name}` }, proposeEdit, { mode: 'edit', name: assetName, bytes, product });
          sendJson(res, 200, { ...summary(projectId, result.rev), message: result.message, changed: result.changed ?? true });
          return true;
        } else if (action === 'edit') {
          const result = await store.edit(projectId, await parseBody(req), proposeEdit);
          sendJson(res, 200, { ...summary(projectId, result.rev), message: result.message, changed: result.changed ?? true });
          return true;
        } else if (action === 'generate-image') {
          const body = await parseBody(req);
          if (typeof generateImage !== 'function') fail('image-ai-not-configured', 503);
          if (!uuid.test(body?.requestId || '') || typeof body?.prompt !== 'string' || !body.prompt.trim() || body.prompt.length > 2000) fail('invalid-image-prompt');
          const current = store.state(projectId);
          const replay = store.versions(projectId).map(item => store.revision(projectId, item.id)).find(item => item.operation?.type === 'ai-image-edit' && item.operation.requestId === body.requestId);
          if (replay) {
            if (replay.parentRevision !== body.baseRevision || current?.headRevision !== replay.id) fail('revision-conflict', 409);
            sendJson(res, 200, summary(projectId, replay));
            return true;
          }
          store.imageSelection(projectId, body);
          const generated = await generateImage({ prompt: body.prompt, aspectRatio: body.aspectRatio });
          rev = store.saveGeneratedImage(projectId, body, generated);
        } else if (action === 'restore') rev = store.restore(projectId, await parseBody(req));
        else if (action === 'publish') {
          const body = await parseBody(req);
          if (typeof publishDocument !== 'function') fail('publication-not-configured', 503);
          const current = store.state(projectId);
          if (!current?.revisionIds.includes(body.revisionId)) fail('invalid-publish-version');
          store.revision(projectId, body.revisionId);
          const publication = publishDocument(projectId, body.revisionId);
          rev = store.publish(projectId, body.revisionId);
          sendJson(res, 200, { ...summary(projectId, rev), ...publication });
          return true;
        }
        else if (action === 'image') rev = store.saveImage(projectId, await parseBody(req));
        else if (action === 'image-style') rev = store.saveImageStyle(projectId, await parseBody(req));
        else if (action === 'link') rev = store.saveLink(projectId, await parseBody(req));
        else if (action === 'target') rev = store.saveTarget(projectId, await parseBody(req));
        else if (action === 'style') rev = store.saveStyle(projectId, await parseBody(req));
        else if (action === 'text') rev = store.saveText(projectId, await parseBody(req));
        else rev = store.saveHeading(projectId, await parseBody(req));
        sendJson(res, 200, summary(projectId, rev));
      } else {
        if (req.method !== 'GET') fail('method-not-allowed', 405);
        let bytes;
        let type;
        const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.gif': 'image/gif', '.woff': 'font/woff', '.woff2': 'font/woff2' };
        if (page) {
          const [, projectId, revisionId, rawName] = page;
          const name = decodeURIComponent(rawName);
          const current = store.state(projectId);
          if (!current?.revisionIds.includes(revisionId)) fail('revision-not-found', 404);
          bytes = store.file(projectId, store.revision(projectId, revisionId), name);
          type = types[path.extname(name)] || 'application/octet-stream';
          if (name === 'index.html' && url.searchParams.has('edit')) {
            const token = url.searchParams.get('edit');
            if (!uuid.test(token)) fail('invalid-editor-session');
            bytes = Buffer.from(editorHtml(bytes.toString('utf8'), token, revisionId));
          }
        } else {
          bytes = fs.readFileSync(path.join(root, 'js', 'website-document-bridge.js'));
          type = types['.js'];
        }
        res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; font-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'self'" });
        res.end(bytes);
      }
    } catch (error) { sendJson(res, error.status || 500, { ok: false, error: error.status ? error.message : 'document-save-or-load-failed' }); }
    return true;
  }
  return { handle, store };
}
