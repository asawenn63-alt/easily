import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const storage = new Map();
const saves = [];
const context = {
  console,
  Date,
  Math,
  JSON,
  Promise,
  setTimeout,
  clearTimeout,
  URL,
  crypto: globalThis.crypto,
  location: { href: "http://localhost:3847/editor/trace-test" },
  document: { body: { setAttribute() {}, removeAttribute() {} } },
  localStorage: {
    getItem: (key) => storage.get(key) || null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: (key) => storage.delete(key),
  },
  sessionStorage: {
    getItem: (key) => storage.get("session:" + key) || null,
    setItem: (key, value) => storage.set("session:" + key, String(value)),
    removeItem: (key) => storage.delete("session:" + key),
  },
};
context.globalThis = context;
context.window = context;
context.AppDocument = {
  normalize: (value) => JSON.parse(JSON.stringify(value)),
  touchMeta: (doc) => { doc.meta.updatedAt = new Date().toISOString(); },
  toExportPayload: (doc) => JSON.parse(JSON.stringify(doc)),
};
context.SiteApi = {
  getApiBase: () => "http://localhost:3847",
  saveProject: async (id, envelope) => {
    saves.push(JSON.parse(JSON.stringify({ id, envelope })));
    const generationId = String(envelope.document?.meta?.visibleGenerationId || "");
    return { ok: true, generationId, draftRevision: saves.length, updatedAt: new Date().toISOString() };
  },
};

function load(relative) {
  vm.runInNewContext(fs.readFileSync(path.join(root, relative), "utf8"), context, { filename: relative });
}

load("js/blueprint-layout-resolver.js");
load("js/generation-trace.js");
load("js/generation-lifecycle.js");
load("js/state.js");

const execution = {
  designSpecVersion: "7.0",
  creativeVision: { vision: "Trace fixture only" },
  componentStrategy: { strategy: "actual late execution" },
  design: { colors: { background: "#fff", text: "#111" } },
  compositionPlan: {
    sections: [
      { relativeHeight: "500px", paddingTop: "40px", paddingBottom: "40px", sceneArea: "1 / 1 / 2 / 13" },
      { relativeHeight: "240px", paddingTop: "32px", paddingBottom: "32px", sceneArea: "2 / 1 / 3 / 13" },
    ],
    viewportScenes: [
      { id: "opening", sectionIndexes: [0, 1], minHeight: "760px", gap: "20px", padding: "24px" },
    ],
  },
  sections: [
    { type: "hero", headline: "Hero", lead: "Lead", body: [], imageUrls: ["hero.webp"], layout: { headingSize: "64px", mediaHeight: "360px" }, items: [] },
    { type: "footer", headline: "Footer", lead: "", body: [], imageUrls: [], layout: { headingSize: "24px" }, items: [] },
  ],
};
const concept = { execution, componentStrategy: execution.componentStrategy };
const blueprint = {
  blueprintVersion: "1.0",
  meta: { businessName: "Tracebolaget" },
  tree: [{ type: "hero" }, { type: "footer" }],
};
const brief = { briefVersion: "1.0", customerFacts: { businessName: "Tracebolaget", offer: { summary: "Spårbarhet" } } };
const documentState = {
  meta: { siteId: "trace-project" },
  page: { createPath: "blueprint", creativeBrief: brief, creativeConcept: concept, designSpec: execution, siteBlueprint: blueprint },
};

context.SiteState.replace(documentState);
const lifecycle = context.GenerationLifecycle.beginRun("trace-test");
const generationId = lifecycle.generationId;
assert.match(generationId, /^gen_/);

context.SiteState.patch((doc) => {
  context.GenerationTrace.beginDocument(doc, { generationId, source: "trace-test", creativeBrief: brief });
  context.GenerationTrace.captureCanonicalArtifacts(doc, generationId, brief, concept, blueprint);
});

let traced = context.SiteState.get();
let trace = context.GenerationTrace.getTrace(traced, generationId);
assert.equal(context.GenerationTrace.hasAllArtifacts(trace), true, "all seven canonical artifacts must be present");
assert.deepEqual(Object.keys(trace.artifacts), [...context.GenerationTrace.ARTIFACT_KEYS]);
assert.notDeepEqual(trace.artifacts.geometryResolved.resolvedDesignSpec, execution, "geometry output must be captured separately");
assert.equal(context.GenerationTrace.verifyRenderManifest(traced, generationId, trace.artifacts.renderManifest).ok, false, "unpersisted generation must not render as committed");

context.SiteState.save(); // schedules an ordinary autosave; persistGeneration must cancel it.
const saveResult = await context.SiteState.persistGeneration(generationId);
assert.equal(saveResult.generationId, generationId);
assert.equal(saves.length, 1, "generation commit must replace the pending autosave");
assert.equal(saves[0].envelope.document.meta.visibleGenerationId, generationId, "saved snapshot must carry visible generation id");
assert.equal(saves[0].envelope.document.meta.generationTrace.generations[generationId].generationId, generationId);

traced = context.SiteState.get();
trace = context.GenerationTrace.getTrace(traced, generationId);
assert.equal(trace.status, "persisted");
assert.equal(trace.persistence.draftRevision, 1);
assert.equal(traced.meta.persistedGenerationId, generationId);
assert.notEqual(traced.meta.previewGenerationId, generationId, "persistence alone must not claim that DOM was rendered");
assert.equal(context.GenerationTrace.verifyRenderManifest(traced, generationId, trace.artifacts.renderManifest).ok, true);

const changedManifest = JSON.parse(JSON.stringify(trace.artifacts.renderManifest));
changedManifest.siteBlueprint.meta.businessName = "Wrong generation";
assert.equal(context.GenerationTrace.verifyRenderManifest(traced, generationId, changedManifest).reason, "render_manifest_mismatch");

const failedId = context.GenerationTrace.createGenerationId();
context.SiteState.patch((doc) => {
  context.GenerationTrace.beginDocument(doc, { generationId: failedId, source: "trace-failure", creativeBrief: brief });
  context.GenerationTrace.captureCanonicalArtifacts(doc, failedId, brief, concept, blueprint);
});
context.SiteApi.saveProject = async () => ({ ok: true, generationId: "gen_wrong", draftRevision: 2 });
await assert.rejects(() => context.SiteState.persistGeneration(failedId), /generation_save_ack_mismatch/);
const failedDoc = context.SiteState.get();
assert.equal(context.GenerationTrace.getTrace(failedDoc, failedId).status, "persistence-failed");
assert.notEqual(failedDoc.meta.previewGenerationId, failedId, "failed generation must never be marked as previewed");

console.log("PASS generation trace keeps the rendered manifest, persisted snapshot and generationId unambiguous");
