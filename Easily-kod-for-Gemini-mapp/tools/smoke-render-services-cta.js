/**
 * Smoke: renderServices card CTA — legacy vs CD path.
 * Run: node tools/smoke-render-services-cta.js
 */
"use strict";

const fs = require("fs");
const path = require("path");

const jsDir = path.join(__dirname, "..", "js");
const load = (f) => eval(fs.readFileSync(path.join(jsDir, f), "utf8"));

load("create-cd-gate.js");
load("render.js");

let defaultHrefCalls = 0;
const origDefaultHref = RenderEngine.defaultCardHrefForIntent;
RenderEngine.defaultCardHrefForIntent = function (intent) {
  defaultHrefCalls++;
  return origDefaultHref(intent);
};

function renderServicesHtml(page, cards) {
  return RenderEngine.renderSectionHTML("services", {
    page: page,
    sections: {
      services: {
        content: { "services-title": "Tjänster", "services-lead": "Lead" },
        cards: cards,
      },
    },
  });
}

function cardCtaBlocks(html) {
  return (html.match(/<a class="card__cta /g) || []).length;
}

function cardCtaText(html) {
  const m = html.match(/class="card__cta[^"]*"[^>]*>[\s\S]*?<span[^>]*>([^<]*)<\/span>/);
  return m ? m[1] : null;
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

const legacyCards = [
  { title: "A", body: "Body A", detail: "Long detail text", intent: "services" },
  { title: "B", body: "Body B", detail: "More detail", ctaText: "Boka nu", ctaHref: "#kontakt", intent: "process" },
];

defaultHrefCalls = 0;
const legacyHtml = renderServicesHtml(
  { compositionLocked: true, siteComposition: { services: { layout: "cards-2" } } },
  legacyCards
);

console.log("=== LEGACY (gate off) ===");
assert("legacy: detail card gets CTA", cardCtaBlocks(legacyHtml) >= 1);
assert("legacy: detail card CTA = Läs mer", legacyHtml.includes(">Läs mer<"));
assert("legacy: explicit CTA preserved", legacyHtml.includes(">Boka nu<"));
assert("legacy: defaultCardCtaHref may be called", defaultHrefCalls >= 0);

const cdCardsNoCta = [
  { title: "A", body: "Body A", detail: "Long detail text", intent: "services" },
  { title: "B", body: "Body B", intent: "packages" },
];

defaultHrefCalls = 0;
const cdNoCtaHtml = renderServicesHtml({ createPath: "cd", compositionLocked: true }, cdCardsNoCta);

console.log("\n=== CD (gate on, no doc CTA) ===");
assert("CD: defaultCardCtaHref never called", defaultHrefCalls === 0);
assert("CD: no card__cta when doc lacks CTA fields", cardCtaBlocks(cdNoCtaHtml) === 0);
assert("CD: no render-generated Läs mer", !cdNoCtaHtml.includes(">Läs mer<"));

const cdCardsWithCta = [
  { title: "A", body: "Body A", ctaText: "Kontakta oss", ctaHref: "#kontakt" },
  { title: "B", body: "Body B", detail: "Still has detail", intent: "services" },
];

defaultHrefCalls = 0;
const cdWithCtaHtml = renderServicesHtml({ createPath: "cd", compositionLocked: true }, cdCardsWithCta);

console.log("\n=== CD (gate on, doc CTA) ===");
assert("CD: defaultCardCtaHref never called", defaultHrefCalls === 0);
assert("CD: one CTA when only one card has doc fields", cardCtaBlocks(cdWithCtaHtml) === 1);
assert("CD: doc CTA text shown", cdWithCtaHtml.includes(">Kontakta oss<"));
assert("CD: detail-only card has no CTA", (cdWithCtaHtml.match(/<a class="card__cta /g) || []).length === 1);
assert("CD: no Läs mer fallback", !cdWithCtaHtml.includes(">Läs mer<"));

console.log("\n" + (failed === 0 ? "ALL PASS" : failed + " FAILED"));
process.exit(failed === 0 ? 0 : 1);
