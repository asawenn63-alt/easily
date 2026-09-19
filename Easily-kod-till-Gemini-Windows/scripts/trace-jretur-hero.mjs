/**
 * Trace Image Intelligence hero selection for Jretur / miljo.
 */
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function load(rel) {
  vm.runInThisContext(fs.readFileSync(path.join(ROOT, rel), "utf8"), { filename: rel });
}

const doc = {
  page: {
    industry: "miljo",
    template: "editorial",
    theme: "minimal-white",
    brand: "Jretur",
    onboardingDescription: "återvinning i Hudiksvall, företagsnamn är jretur",
    heroBgUrl: "",
  },
  sections: {
    hero: {
      content: {
        "hero-title": "Jretur — Hudiksvall",
        "hero-lead": "Professionell återvinning i Hudiksvall.",
      },
    },
    services: {
      cards: [
        { title: "Sophämtning" },
        { title: "Containers" },
        { title: "Sortering" },
      ],
    },
  },
  meta: { imageIntelligence: { version: 1, rejected: {}, served: {} } },
};

globalThis.SiteState = {
  get: () => doc,
  patch(fn) {
    fn(doc);
  },
  save() {},
};

globalThis.DesignMemoryEngine = {
  getMemory: () => ({ sections: {} }),
  validateProposal: () => ({ score: 0.7, ok: true }),
};

const scripts = [
  "js/image-catalog.js",
  "js/image-selection-engine.js",
  "js/visual-stock.js",
  "js/design-memory-engine.js",
  "js/image-intelligence-engine.js",
  "js/material-system.js",
];

for (const s of scripts) load(s);

const IIE = globalThis.ImageIntelligenceEngine;
const ISE = globalThis.ImageSelectionEngine;
const IC = globalThis.ImageCatalog;

function traceCase(label, pagePatch) {
  Object.assign(doc.page, pagePatch);
  doc.meta.imageIntelligence = { version: 1, rejected: {}, served: {} };
  doc.page.heroBgUrl = "";

  const selCtx = IIE.buildSelectionContext("hero", {
    userText: doc.page.onboardingDescription,
  });
  const biz = IIE.resolveBusinessCategory(selCtx);
  const query = IIE.buildSearchQuery(selCtx, biz);
  const ctx = selCtx.ctx;

  console.log("\n=== " + label + " ===");
  console.log("1. searchQuery:", query);
  console.log("2. businessCategory:", biz.primaryBusiness, "| industry:", biz.industry, "| theme:", biz.themeId);
  console.log("3. keywords/preferTags:", (ctx.industryProfile && ctx.industryProfile.preferTags) || []);
  console.log("   theme preferTags:", (ctx.themeProfile && ctx.themeProfile.preferTags) || []);
  console.log("   enrichedText:", selCtx.enrichedText && selCtx.enrichedText.slice(0, 120));

  const candidates = IIE.gatherCandidates(selCtx, { userText: doc.page.onboardingDescription });
  console.log("4. candidates returned:", candidates.length);

  const rows = candidates.map(function (c) {
    const entry = c.entry || null;
    const id = IC.photoIdFromUrl(c.url);
    const rejection = IIE.evaluateCandidateRejection(c, selCtx, biz);
    const scored = IIE.scoreCandidate(c, selCtx);
    const iseRaw = entry && ISE.scoreEntry ? ISE.scoreEntry(entry, ctx) : null;
    return {
      id,
      tags: (entry && entry.tags) || [],
      industries: (entry && entry.industries) || [],
      iseRaw,
      overall: scored.overall,
      rejection: rejection.rejected ? rejection.reason : "",
      source: c.source,
    };
  });

  rows.sort(function (a, b) {
    return b.overall - a.overall;
  });

  const selectedUrl = IIE.selectBest("hero", { userText: doc.page.onboardingDescription });
  const selectedId = IC.photoIdFromUrl(selectedUrl);

  console.log("5-6. Top scored + selected:");
  console.log("   SELECTED:", selectedId, "score:", rows.find((r) => r.id === selectedId)?.overall);
  rows.slice(0, 8).forEach(function (r, i) {
    const mark = r.id === selectedId ? " <-- SELECTED" : "";
    console.log(
      "   " +
        (i + 1) +
        ". " +
        r.id +
        " overall=" +
        r.overall.toFixed(3) +
        " iseRaw=" +
        r.iseRaw +
        " tags=" +
        r.tags.slice(0, 6).join(",") +
        " ind=" +
        r.industries.join(",") +
        (r.rejection ? " REJECT:" + r.rejection : "") +
        mark,
    );
  });

  const officeIds = [
    "photo-1486718448742-163732cd1542",
    "photo-1497366754035-f200968a6e72",
    "photo-1542601906994-b5d5fb29d4d9",
    "photo-1522071820081-009f0129c71c",
  ];
  if (officeIds.indexOf(selectedId) >= 0) {
    console.log("FAIL: office/architect image selected");
  }
}

traceCase("Jretur miljo (correct industry)", { industry: "miljo" });
traceCase("Jretur verksamhet (misclassified)", { industry: "verksamhet" });
traceCase("Jretur konsult (misclassified)", { industry: "konsult" });
