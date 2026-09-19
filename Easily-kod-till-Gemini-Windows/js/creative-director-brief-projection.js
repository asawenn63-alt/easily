/** Creative Director-projektion från levande Creative Brief till Blueprint-preview. */
(function (global) {
  "use strict";

  function applyToDocument(doc, options) {
    options = options || {};
    if (!doc || !doc.page || !doc.page.creativeBrief) return { ok: false, reason: "brief_missing" };
    const liveBrief = doc.page.creativeBrief;
    const revision = Number(liveBrief.revision) || 0;
    const facts = liveBrief.customerFacts || {};
    if (!String(facts.businessName || "").trim() || !String(facts.offer && facts.offer.summary || "").trim()) {
      return { ok: false, reason: "brief_insufficient" };
    }
    const CD = global.CreativeDirector;
    if (!CD || typeof CD.runBlueprint !== "function") return { ok: false, reason: "creative_director_missing" };
    const result = CD.runBlueprint({ customerBrief: liveBrief, creativeConcept: options.creativeConcept });
    if (!result.ok) return result;

    const bridge = global.BlueprintDocumentBridge;
    if (!bridge || typeof bridge.applySiteBlueprintToDocument !== "function") {
      return { ok: false, reason: "blueprint_bridge_missing" };
    }
    const applied = bridge.applySiteBlueprintToDocument(doc, result.siteBlueprint, result.creativeConcept);
    if (!applied.ok) return applied;

    if (!liveBrief.derived || typeof liveBrief.derived !== "object") liveBrief.derived = {};
    liveBrief.derived.basedOnRevision = revision;
    liveBrief.derived.readiness = "ready";
    liveBrief.derived.concept = result.creativeConcept;
    liveBrief.derived.conceptSource = options.creativeConcept ? "openai" : "local";
    liveBrief.derived.executionBrief = result.creativeBrief;
    doc.page.creativeBrief = liveBrief;
    doc.page.questionEnginePreviewRevision = revision;
    return { ok: true, basedOnRevision: revision, siteBlueprint: result.siteBlueprint };
  }

  global.CreativeDirectorBriefProjection = Object.freeze({ applyToDocument: applyToDocument });
})(typeof window !== "undefined" ? window : globalThis);
