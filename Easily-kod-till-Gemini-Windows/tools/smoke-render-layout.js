/**
 * Smoke: render sectionLayoutAttr — legacy vs CD layout path.
 * Run: node tools/smoke-render-layout.js
 */
"use strict";

const fs = require("fs");
const path = require("path");

const jsDir = path.join(__dirname, "..", "js");
const load = (f) => eval(fs.readFileSync(path.join(jsDir, f), "utf8"));

load("create-cd-gate.js");
load("site-composition-engine.js");
load("render.js");

let sceCalls = [];
const orig = SiteCompositionEngine.resolveSectionLayout;
SiteCompositionEngine.resolveSectionLayout = function (sectionId, page, sec) {
  sceCalls.push({
    sectionId: sectionId,
    createPath: page && page.createPath,
    hasSiteComposition: !!(page && page.siteComposition),
  });
  return orig.call(SiteCompositionEngine, sectionId, page, sec);
};

function extractLayout(html) {
  const m = html.match(/data-layout="([^"]*)"/);
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

// --- Legacy (gate off) ---
const legacyPage = {
  compositionLocked: true,
  siteComposition: {
    hero: { layout: "split" },
    services: { layout: "cards-2" },
    aboutLayout: "standard",
  },
  heroLayout: "split",
  template: "modern",
};

sceCalls = [];
const legacyHero = RenderEngine.renderSectionHTML("hero", {
  page: legacyPage,
  sections: { hero: { content: {} } },
});
const legacyAbout = RenderEngine.renderSectionHTML("about", {
  page: legacyPage,
  sections: { about: { content: {}, dataStyle: "" } },
});
const legacyServices = RenderEngine.renderSectionHTML("services", {
  page: legacyPage,
  sections: { services: { content: {}, layout: "cards-2" } },
});
const legacyFaq = RenderEngine.renderSectionHTML("faq", {
  page: legacyPage,
  sections: { faq: { content: {} } },
});

console.log("=== LEGACY (gate off) ===");
assert("SCE called for legacy sections", sceCalls.length >= 4);
assert("legacy hero = hero-split", extractLayout(legacyHero) === "hero-split");
assert("legacy about = about-standard", extractLayout(legacyAbout) === "about-standard");
assert("legacy services = services-cards-2", extractLayout(legacyServices) === "services-cards-2");
assert("legacy faq = faq-standard", extractLayout(legacyFaq) === "faq-standard");

// --- CD (gate on) ---
const cdPage = {
  createPath: "cd",
  compositionLocked: true,
  cdLayoutKeys: {
    hero: "split",
    about: "about-asymmetric",
    services: "services-cards-3",
    gallery: "gallery-masonry",
  },
  heroLayout: "split",
  heroStructure: "split",
  template: "modern",
};

sceCalls = [];
const cdHero = RenderEngine.renderSectionHTML("hero", {
  page: cdPage,
  sections: { hero: { content: {} } },
});
const cdAbout = RenderEngine.renderSectionHTML("about", {
  page: cdPage,
  sections: { about: { content: {}, dataStyle: "asymmetric" } },
});
const cdServices = RenderEngine.renderSectionHTML("services", {
  page: cdPage,
  sections: { services: { content: {}, layout: "cards-3" } },
});
const cdGallery = RenderEngine.renderSectionHTML("gallery", {
  page: cdPage,
  sections: { gallery: { content: {}, layout: "masonry" } },
});
const cdFaq = RenderEngine.renderSectionHTML("faq", {
  page: cdPage,
  sections: { faq: { content: {} } },
});
const cdContact = RenderEngine.renderSectionHTML("contact", {
  page: cdPage,
  sections: { contact: { content: {} } },
});

console.log("\n=== CD (gate on) ===");
assert("SCE never called on CD path", sceCalls.length === 0);
assert("CD hero from cdLayoutKeys", extractLayout(cdHero) === cdPage.cdLayoutKeys.hero);
assert("CD about from cdLayoutKeys", extractLayout(cdAbout) === cdPage.cdLayoutKeys.about);
assert("CD services from cdLayoutKeys", extractLayout(cdServices) === cdPage.cdLayoutKeys.services);
assert("CD gallery from cdLayoutKeys", extractLayout(cdGallery) === cdPage.cdLayoutKeys.gallery);
assert("CD faq not classic", extractLayout(cdFaq) !== "classic");
assert("CD contact not classic", extractLayout(cdContact) !== "classic");

// --- CD partial keys (no siteComposition) ---
const cdPartial = { createPath: "cd", compositionLocked: true, cdLayoutKeys: { hero: "center" } };
sceCalls = [];
const cdHeroOnly = RenderEngine.renderSectionHTML("hero", {
  page: cdPartial,
  sections: { hero: { content: {} } },
});
const cdAboutMissing = RenderEngine.renderSectionHTML("about", {
  page: cdPartial,
  sections: { about: { content: {} } },
});

console.log("\n=== CD partial keys ===");
assert("SCE never called (partial)", sceCalls.length === 0);
assert("CD hero partial key", extractLayout(cdHeroOnly) === "center");
assert("CD about missing key = empty", extractLayout(cdAboutMissing) === "");

console.log("\n" + (failed === 0 ? "ALL PASS" : failed + " FAILED"));
process.exit(failed === 0 ? 0 : 1);
