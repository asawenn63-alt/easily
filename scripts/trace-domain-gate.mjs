/**
 * Compare hero Top 10 for Jretur / recycling brief after domain-gate IIE.
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
    industry: "verksamhet",
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
      cards: [{ title: "Sophämtning" }, { title: "Containers" }, { title: "Sortering" }],
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
  getConstraints: () => ({}),
  validateProposal: () => ({ score: 0.74, ok: true }),
};

[
  "js/image-catalog.js",
  "js/image-selection-engine.js",
  "js/visual-stock.js",
  "js/image-intelligence-engine.js",
].forEach(load);

const IIE = globalThis.ImageIntelligenceEngine;
const IC = globalThis.ImageCatalog;

function top10() {
  doc.meta.imageIntelligence = { version: 1, rejected: {}, served: {} };
  const selCtx = IIE.buildSelectionContext("hero", {
    userText: doc.page.onboardingDescription,
    nonce: 4242,
  });
  const biz = IIE.resolveBusinessCategory(selCtx);
  const domainCtx = IIE.buildDomainContext(selCtx, biz);

  console.log("Inferred industry:", biz.industry, "| theme:", biz.themeId);
  console.log("Domain tags:", domainCtx.domainTags.join(", "));

  const rows = IC.allEntries()
    .map(function (entry) {
      const c = { url: "x", entry: entry };
      const rej = IIE.evaluateCandidateRejection(c, selCtx, biz);
      const s = rej.rejected ? null : IIE.scoreCandidate(c, selCtx);
      return {
        id: entry.id,
        tags: entry.tags,
        industries: entry.industries,
        domain: IIE.computeDomainRelevance(entry, domainCtx),
        overall: s ? s.overall : null,
        bizRel: s ? s.dimensions.businessRelevance : null,
        sect: s ? s.dimensions.sectionSuitability : null,
        reject: rej.reason || "",
      };
    })
    .sort(function (a, b) {
      return (b.overall || -1) - (a.overall || -1);
    });

  const accepted = rows.filter(function (r) {
    return r.overall != null;
  });

  console.log("\nTOP 10 (domain-qualified):");
  accepted.slice(0, 10).forEach(function (r, i) {
    console.log(
      (i + 1) +
        ". " +
        r.id +
        " overall=" +
        r.overall +
        " domain=" +
        r.domain +
        " bizRel=" +
        r.bizRel +
        " sect=" +
        r.sect +
        " ind=" +
        r.industries.join(",") +
        " tags=" +
        r.tags.slice(0, 6).join(","),
    );
  });

  const selected = IIE.selectBest("hero", { userText: doc.page.onboardingDescription, nonce: 4242 });
  console.log("\nSELECTED:", IC.photoIdFromUrl(selected));

  const eventRej = IIE.evaluateCandidateRejection(
    { url: "x", entry: IC.getEntry("photo-1511578314322-379afb476865") },
    selCtx,
    biz,
  );
  console.log("Event venue rejection:", eventRej.rejected ? eventRej.reason : "none");
}

top10();
