/**
 * Smoke: renderCompositionBlock — legacy vs CD path (no CTA fallbacks on CD).
 * Run: node tools/smoke-render-composition-block.js
 */
"use strict";

const fs = require("fs");
const path = require("path");

const jsDir = path.join(__dirname, "..", "js");
const load = (f) => eval(fs.readFileSync(path.join(jsDir, f), "utf8"));

load("create-cd-gate.js");
load("render.js");

function mountHtml(page, sections) {
  const mainEl = {
    _html: "",
    set innerHTML(v) {
      this._html = v;
    },
    get innerHTML() {
      return this._html;
    },
  };
  RenderEngine.mount({ page: page, sections: sections || {} }, mainEl, null);
  return mainEl.innerHTML;
}

function compositionBtnCount(html) {
  return (html.match(/site-composition-block[\s\S]*?class="btn btn--primary/g) || []).length;
}

let failed = 0;
function assert(label, ok) {
  if (!ok) {
    console.log("FAIL:", label);
    failed++;
  } else {
    console.log("PASS:", label);
  }
}

const legacyBlocks = [
  {
    id: "legacy-banner",
    type: "banner",
    variant: "promo",
    afterSection: "services",
    content: { title: "Banner", lead: "Lead text" },
  },
  {
    id: "legacy-cta",
    type: "cta-band",
    afterSection: "about",
    content: { title: "CTA band", lead: "Band lead" },
  },
];

const legacyHtml = mountHtml(
  {
    sectionOrder: ["hero", "about", "services"],
    compositionBlocks: legacyBlocks,
  },
  {
    hero: { content: {}, hidden: false },
    about: { content: {}, hidden: false },
    services: { content: {}, cards: [], hidden: false },
  }
);

console.log("=== LEGACY (gate off) ===");
assert("legacy: banner fallback CTA = Läs mer", legacyHtml.includes(">Läs mer<"));
assert("legacy: cta-band fallback = Kom igång", legacyHtml.includes(">Kom igång<"));
assert("legacy: banner fallback href #kontakt", legacyHtml.includes('href="#kontakt"'));

const cdBlocksEmpty = [
  {
    id: "cd-banner",
    type: "banner",
    variant: "trust",
    afterSection: "services",
    content: {},
  },
  {
    id: "cd-cta",
    type: "cta-band",
    afterSection: "about",
    content: {},
  },
];

const cdEmptyHtml = mountHtml(
  {
    createPath: "cd",
    sectionOrder: ["hero", "about", "services"],
    compositionBlocks: cdBlocksEmpty,
  },
  {
    hero: { content: {}, hidden: false },
    about: { content: {}, hidden: false },
    services: { content: {}, cards: [], hidden: false },
  }
);

console.log("\n=== CD (gate on, empty content) ===");
assert("CD: no Läs mer", !cdEmptyHtml.includes(">Läs mer<"));
assert("CD: no Kom igång", !cdEmptyHtml.includes(">Kom igång<"));
assert("CD: no fallback #kontakt in composition blocks", !cdEmptyHtml.includes('site-composition-block') || !cdEmptyHtml.match(/site-composition-block[\s\S]*?href="#kontakt"/));
assert("CD: no composition block CTA buttons", compositionBtnCount(cdEmptyHtml) === 0);

const cdBlocksWithCta = [
  {
    id: "cd-banner-doc",
    type: "banner",
    variant: "promo",
    afterSection: "services",
    content: { title: "Doc title", ctaText: "Boka möte", ctaHref: "#bokning" },
  },
];

const cdDocHtml = mountHtml(
  {
    createPath: "cd",
    sectionOrder: ["hero", "services"],
    compositionBlocks: cdBlocksWithCta,
  },
  {
    hero: { content: {}, hidden: false },
    services: { content: {}, cards: [], hidden: false },
  }
);

console.log("\n=== CD (gate on, doc CTA) ===");
assert("CD: doc CTA text shown", cdDocHtml.includes(">Boka möte<"));
assert("CD: doc CTA href shown", cdDocHtml.includes('href="#bokning"'));
assert("CD: exactly one composition CTA", compositionBtnCount(cdDocHtml) === 1);
assert("CD: doc title shown", cdDocHtml.includes(">Doc title<"));

console.log("\n" + (failed === 0 ? "ALL PASS" : failed + " FAILED"));
process.exit(failed === 0 ? 0 : 1);
