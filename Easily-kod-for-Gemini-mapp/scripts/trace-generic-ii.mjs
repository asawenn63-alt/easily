/**
 * Trace GENERIC pipeline (no miljo inference) — diagnostic only.
 */
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
function load(rel) {
  vm.runInThisContext(fs.readFileSync(path.join(ROOT, rel), "utf8"), { filename: rel });
}

["js/image-catalog.js", "js/image-selection-engine.js", "js/visual-stock.js", "js/image-intelligence-engine.js", "js/material-system.js"].forEach(load);

const IIE = globalThis.ImageIntelligenceEngine;
const ISE = globalThis.ImageSelectionEngine;
const IC = globalThis.ImageCatalog;

function makeDoc(patch) {
  return {
    page: Object.assign(
      {
        industry: "verksamhet",
        template: "editorial",
        theme: "minimal-white",
        brand: "Jretur",
        onboardingDescription: "",
        heroBgUrl: "",
      },
      patch.page || {},
    ),
    sections: Object.assign(
      {
        hero: {
          content: {
            "hero-title": "Jretur",
            "hero-lead": "Din partner i regionen.",
          },
        },
      },
      patch.sections || {},
    ),
    meta: { imageIntelligence: { version: 1, rejected: {}, served: {} } },
  };
}

function fullReport(label, doc, userText) {
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

  const selCtx = IIE.buildSelectionContext("hero", { userText, nonce: 9001 });
  const biz = IIE.resolveBusinessCategory(selCtx);
  const ctx = selCtx.ctx;

  console.log("\n" + "=".repeat(70));
  console.log(label);
  console.log("page.industry:", doc.page.industry, "| effective:", biz.industry, "| theme:", biz.themeId);
  console.log("signals text snippet:", biz.searchText.slice(0, 80));

  const selectedUrl = IIE.selectBest("hero", { userText, nonce: 9001 });
  const selectedId = IC.photoIdFromUrl(selectedUrl);
  const entry = IC.getEntry(selectedId);

  const scored = IIE.scoreCandidate({ url: selectedUrl, entry }, selCtx);
  const iseRaw = entry ? ISE.scoreEntry(entry, ctx) : null;
  const rej = IIE.evaluateCandidateRejection({ url: selectedUrl, entry }, selCtx, biz);

  console.log("\nSELECTED:", selectedId);
  console.log("Rejection:", rej.rejected ? rej.reason : "none");
  console.log("Tags:", entry && entry.tags);
  console.log("Industries:", entry && entry.industries);
  console.log("ISE raw:", iseRaw, "| businessRelevance:", scored.dimensions.businessRelevance);
  console.log("sectionSuitability:", scored.dimensions.sectionSuitability);
  console.log("designMemory:", scored.dimensions.designMemoryCompatibility);
  console.log("Final:", scored.overall);
  console.log("All dims:", JSON.stringify(scored.dimensions));

  const candidates = IIE.gatherCandidates(selCtx, { userText, nonce: 9001 });
  console.log("Pool size after gather:", candidates.length);

  const rows = candidates
    .map(function (c) {
      const e = c.entry || null;
      const id = IC.photoIdFromUrl(c.url);
      const r = IIE.evaluateCandidateRejection(c, selCtx, biz);
      const s = r.rejected ? null : IIE.scoreCandidate(c, selCtx);
      return {
        id,
        source: c.source,
        iseRaw: e ? ISE.scoreEntry(e, ctx) : null,
        overall: s ? s.overall : null,
        reject: r.rejected ? r.reason : "",
        tags: (e && e.tags) || [],
        ind: (e && e.industries) || [],
        dims: s ? s.dimensions : null,
      };
    })
    .sort(function (a, b) {
      return (b.overall || -1) - (a.overall || -1);
    });

  console.log("\nTOP 10 IN ACTUAL POOL:");
  rows.slice(0, 10).forEach(function (r, i) {
    console.log(
      (i + 1) +
        ". " +
        r.id +
        " src=" +
        r.source +
        " overall=" +
        r.overall +
        " ise=" +
        r.iseRaw +
        " ind=" +
        r.ind.join(",") +
        " tags=" +
        r.tags.slice(0, 5).join(",") +
        (r.reject ? " REJ:" + r.reject : "") +
        (r.id === selectedId ? " <--SEL" : ""),
    );
  });

  // Event image deep dive
  const eventId = "photo-1511578314322-379afb476865";
  const ev = IC.getEntry(eventId);
  if (ev) {
    const evRej = IIE.evaluateCandidateRejection({ url: "x", entry: ev }, selCtx, biz);
    const evSc = evRej.rejected ? null : IIE.scoreCandidate({ url: "x", entry: ev }, selCtx);
    console.log("\nEVENT IMAGE DEEP DIVE:", eventId);
    console.log("  tags:", ev.tags, "| industries:", ev.industries);
    console.log("  iseRaw:", ISE.scoreEntry(ev, ctx));
    console.log("  reject:", evRej.rejected ? evRej.reason : "none");
    console.log("  overall:", evSc && evSc.overall);
    if (evSc) console.log("  dims:", JSON.stringify(evSc.dimensions));
  }

  const recId = "photo-1611280615850-5f43c7a0a7c8";
  const rec = IC.getEntry(recId);
  if (rec) {
    const recRej = IIE.evaluateCandidateRejection({ url: "x", entry: rec }, selCtx, biz);
    const recSc = recRej.rejected ? null : IIE.scoreCandidate({ url: "x", entry: rec }, selCtx);
    console.log("\nRECYCLING IMAGE:", recId);
    console.log("  iseRaw:", ISE.scoreEntry(rec, ctx));
    console.log("  reject:", recRej.rejected ? recRej.reason : "none");
    console.log("  overall:", recSc && recSc.overall);
  }
}

fullReport(
  "GENERIC: verksamhet, no brief, generic hero",
  makeDoc({}),
  "byt hero-bild",
);

fullReport(
  "GENERIC: verksamhet + hero mentions återvinning (no onboarding)",
  makeDoc({
    sections: {
      hero: {
        content: {
          "hero-title": "Jretur — återvinning",
          "hero-lead": "Sophämtning och containers i Hudiksvall.",
        },
      },
    },
  }),
  "visa en till",
);

fullReport(
  "GENERIC: page.industry=miljo but simulate pre-fix (strip miljo rejection mentally via verksamhet effective)",
  makeDoc({ page: { industry: "miljo", onboardingDescription: "återvinning jretur hudiksvall" } }),
  "",
);

// Simulate generic-only: patch IIE resolve to NOT infer miljo — use monkeypatch in trace only
const origInfer = IIE.inferIndustryFromSignals;
if (typeof origInfer === "function") {
  IIE.inferIndustryFromSignals = function (signals) {
    return signals.industry;
  };
  fullReport(
    "STRIPPED: verksamhet forced (miljo inference disabled in trace)",
    makeDoc({
      page: { industry: "verksamhet", onboardingDescription: "återvinning i Hudiksvall, företagsnamn är jretur" },
      sections: {
        hero: {
          content: {
            "hero-title": "Jretur — Hudiksvall",
            "hero-lead": "Professionell återvinning i Hudiksvall.",
          },
        },
      },
    }),
    "återvinning i Hudiksvall",
  );
}
