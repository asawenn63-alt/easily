/**
 * Full IIE scoring trace — no production code changes.
 */
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function load(rel) {
  vm.runInThisContext(fs.readFileSync(path.join(ROOT, rel), "utf8"), { filename: rel });
}

function tagOverlap(a, b) {
  if (!a || !b || !a.length || !b.length) return 0;
  let n = 0;
  a.forEach(function (t) {
    if (b.indexOf(t) >= 0) n++;
  });
  return n;
}

function iseBreakdown(entry, ctx) {
  const IC = globalThis.ImageCatalog;
  const strategy = ctx.strategy || {};
  const industryProfile = ctx.industryProfile || {};
  const lines = [];
  let score = entry.quality || 6;
  lines.push(["base quality", entry.quality || 6, score]);

  if (entry.sections && entry.sections.length && entry.sections.indexOf(ctx.section) < 0) {
    score -= 4;
    lines.push(["section mismatch", -4, score]);
  }
  if (entry.industries && entry.industries.indexOf(ctx.industry) >= 0) {
    score += 8;
    lines.push(["industry match " + ctx.industry, +8, score]);
  }
  if (ctx.industry === "miljo" && ctx.section === "hero") {
    const recyclingTags = ["recycling", "waste", "container", "sorting", "industrial", "environment", "sustainability", "green"];
    const officeTags = ["office", "office-soft", "architect", "blueprint", "corporate", "business-meeting", "planning", "skyscraper", "whiteboard", "documents", "carpenter", "wood", "tools"];
    if (entry.industries && entry.industries.indexOf("miljo") >= 0) {
      score += 6;
      lines.push(["miljo hero miljo industry", +6, score]);
    }
    const noRec = entry.industries && entry.industries.indexOf("miljo") < 0 && tagOverlap(entry.tags, recyclingTags) === 0;
    if (noRec) {
      score -= 28;
      lines.push(["miljo hero no recycling tags", -28, score]);
    }
    const off = tagOverlap(entry.tags, officeTags);
    if (off) {
      score -= off * 16;
      lines.push(["miljo hero office tag penalty x" + off, -off * 16, score]);
    }
    const rec = tagOverlap(entry.tags, recyclingTags);
    if (rec) {
      score += rec * 4;
      lines.push(["miljo hero recycling tag bonus x" + rec, rec * 4, score]);
    }
  }
  const pref = tagOverlap(entry.tags, industryProfile.preferTags || []);
  if (pref) {
    score += pref * 3;
    lines.push(["industryProfile.preferTags x" + pref, pref * 3, score]);
  }
  const avoid = tagOverlap(entry.tags, industryProfile.avoidTags || []);
  if (avoid) {
    score -= avoid * 12;
    lines.push(["industryProfile.avoidTags x" + avoid, -avoid * 12, score]);
  }
  if (ctx.themeProfile) {
    const tp = tagOverlap(entry.tags, ctx.themeProfile.preferTags || []);
    if (tp) {
      score += tp * 5;
      lines.push(["themeProfile.preferTags x" + tp, tp * 5, score]);
    }
    const ta = tagOverlap(entry.tags, ctx.themeProfile.avoidTags || []);
    if (ta) {
      score -= ta * 15;
      lines.push(["themeProfile.avoidTags x" + ta, -ta * 15, score]);
    }
  }
  const sp = tagOverlap(entry.tags, strategy.preferTags || []);
  if (sp) {
    score += sp * 2;
    lines.push(["sectionStrategy.preferTags x" + sp, sp * 2, score]);
  }
  const sa = tagOverlap(entry.tags, strategy.avoidTags || []);
  if (sa) {
    score -= sa * 14;
    lines.push(["sectionStrategy.avoidTags x" + sa, -sa * 14, score]);
  }
  if (ctx.section === "hero") {
    if (strategy.orientation && strategy.orientation.indexOf(entry.orientation) < 0) {
      score -= 3;
      lines.push(["hero wrong orientation", -3, score]);
    }
    if (strategy.minHeadlineSpace && (entry.headlineSpace || 0) < strategy.minHeadlineSpace) {
      score -= 6;
      lines.push(["hero low headline space", -6, score]);
    }
    if (strategy.forbidText && entry.hasText) {
      score -= 20;
      lines.push(["hero has text", -20, score]);
    }
  }
  if (entry.moods && entry.moods.indexOf(ctx.mood) >= 0) {
    score += 2;
    lines.push(["mood match", +2, score]);
  }
  return { iseRaw: score, lines: lines };
}

function runScenario(label, pagePatch, userText) {
  const doc = {
    page: Object.assign(
      {
        industry: "verksamhet",
        template: "editorial",
        theme: "minimal-white",
        brand: "Jretur",
        onboardingDescription: "återvinning i Hudiksvall, företagsnamn är jretur",
        heroBgUrl: "",
      },
      pagePatch,
    ),
    sections: {
      hero: {
        content: {
          "hero-title": "Jretur — Hudiksvall",
          "hero-lead": "Professionell återvinning i Hudiksvall.",
        },
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

  const IIE = globalThis.ImageIntelligenceEngine;
  const IC = globalThis.ImageCatalog;
  const ISE = globalThis.ImageSelectionEngine;

  const selCtx = IIE.buildSelectionContext("hero", { userText: userText });
  const biz = IIE.resolveBusinessCategory(selCtx);
  const ctx = selCtx.ctx;

  console.log("\n" + "=".repeat(72));
  console.log("SCENARIO:", label);
  console.log("page.industry:", doc.page.industry, "| effective:", biz.industry, "| theme:", biz.themeId);
  console.log("userText:", userText);
  console.log("searchQuery:", IIE.buildSearchQuery(selCtx, biz));

  const selectedUrl = IIE.selectBest("hero", { userText: userText, nonce: 42001 });
  const selectedId = IC.photoIdFromUrl(selectedUrl);
  const selectedEntry = IC.getEntry(selectedId);

  console.log("\n--- SELECTED IMAGE ---");
  console.log("1. Image ID:", selectedId);
  const candMeta = { entry: selectedEntry, source: "selected" };
  const rej = IIE.evaluateCandidateRejection({ url: selectedUrl, entry: selectedEntry }, selCtx, biz);
  console.log("   Rejection:", rej.rejected ? rej.reason : "none");
  console.log("3. Tags:", (selectedEntry && selectedEntry.tags) || []);
  console.log("   Industries:", (selectedEntry && selectedEntry.industries) || []);
  console.log("   Sections:", (selectedEntry && selectedEntry.sections) || []);

  const scored = IIE.scoreCandidate({ url: selectedUrl, entry: selectedEntry }, selCtx);
  const ise = selectedEntry ? iseBreakdown(selectedEntry, ctx) : { iseRaw: null, lines: [] };
  console.log("4. ISE raw (industry score path):", ise.iseRaw);
  ise.lines.forEach(function (l) {
    console.log("   ", l[0] + ":", l[1], "→", l[2]);
  });
  console.log("5. Hero composition (sectionSuitability):", scored.dimensions.sectionSuitability);
  console.log("6. Business relevance:", scored.dimensions.businessRelevance);
  console.log("7. Design Memory:", scored.dimensions.designMemoryCompatibility);
  console.log("8-9. All IIE dimensions:", JSON.stringify(scored.dimensions, null, 2));
  console.log("10. Final score:", scored.overall);

  // Top catalog entries by ISE pre-filter (what enters pool)
  const all = IC.allEntries();
  const pool = all
    .map(function (entry) {
      const iseRaw = ISE.scoreEntry(entry, ctx);
      const rejection = IIE.evaluateCandidateRejection({ url: "x", entry: entry }, selCtx, biz);
      const s = rejection.rejected ? null : IIE.scoreCandidate({ url: "x", entry: entry }, selCtx);
      return {
        id: entry.id,
        tags: entry.tags,
        industries: entry.industries,
        iseRaw: iseRaw,
        overall: s ? s.overall : null,
        rejected: rejection.rejected ? rejection.reason : "",
        source: "catalog",
      };
    })
    .sort(function (a, b) {
      return (b.overall || -1) - (a.overall || -1);
    });

  console.log("\n--- TOP 10 BY IIE OVERALL (all catalog entries) ---");
  pool.slice(0, 10).forEach(function (row, i) {
    console.log(
      (i + 1) +
        ". " +
        row.id +
        " overall=" +
        row.overall +
        " iseRaw=" +
        row.iseRaw +
        " ind=" +
        (row.industries || []).join(",") +
        " tags=" +
        (row.tags || []).slice(0, 6).join(",") +
        (row.rejected ? " REJECT:" + row.rejected : "") +
        (row.id === selectedId ? " <-- SELECTED" : ""),
    );
  });

  const recycling = pool.filter(function (r) {
    return (r.industries || []).indexOf("miljo") >= 0 || tagOverlap(r.tags, ["recycling", "waste", "container"]) > 0;
  });
  console.log("\n--- RECYCLING CANDIDATES (top 5 by overall) ---");
  recycling.slice(0, 5).forEach(function (row, i) {
    console.log(
      (i + 1) +
        ". " +
        row.id +
        " overall=" +
        row.overall +
        " iseRaw=" +
        row.iseRaw +
        (row.rejected ? " REJECT:" + row.rejected : ""),
    );
  });

  // Event/conference candidates
  const events = pool.filter(function (r) {
    return tagOverlap(r.tags, ["event", "celebration", "people"]) > 0;
  });
  console.log("\n--- EVENT/VENUE CANDIDATES (top 5) ---");
  events.slice(0, 5).forEach(function (row, i) {
    console.log(
      (i + 1) +
        ". " +
        row.id +
        " overall=" +
        row.overall +
        " iseRaw=" +
        row.iseRaw +
        " tags=" +
        (row.tags || []).join(",") +
        (row.rejected ? " REJECT:" + row.rejected : "") +
        (row.id === selectedId ? " <-- SELECTED" : ""),
    );
  });
}

["js/image-catalog.js", "js/image-selection-engine.js", "js/visual-stock.js", "js/image-intelligence-engine.js"].forEach(load);

runScenario("A: Jretur miljo + full brief", { industry: "miljo" }, "återvinning i Hudiksvall, företagsnamn är jretur");
runScenario("B: Jretur verksamhet + full brief", { industry: "verksamhet" }, "återvinning i Hudiksvall, företagsnamn är jretur");
runScenario("C: verksamhet + byt hero-bild only", { industry: "verksamhet" }, "byt hero-bild");
runScenario("D: konsult + byt hero-bild", { industry: "konsult" }, "byt hero-bild");
