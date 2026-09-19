// Regression guard: Greenfield is read-only compatibility for saved projects.
// It must never become a creation path again.
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import test from "node:test";

const adapterSource = fs.readFileSync(new URL("../js/greenfield-adapter.js", import.meta.url), "utf8");
const serverSource = fs.readFileSync(new URL("../server/index.mjs", import.meta.url), "utf8");
const questionSource = fs.readFileSync(new URL("../js/question-engine-controller.js", import.meta.url), "utf8");
const welcomeSource = fs.readFileSync(new URL("../js/welcome-flow.js", import.meta.url), "utf8");
const gateSource = fs.readFileSync(new URL("../js/create-cd-gate.js", import.meta.url), "utf8");
const documentSource = fs.readFileSync(new URL("../js/app-document.js", import.meta.url), "utf8");

function setup(initial) {
  const state = structuredClone(initial);
  const elements = new Map();
  const listeners = new Map();
  function element(id) {
    const attributes = {};
    return {
      id, hidden: false, dataset: {}, srcWrites: 0,
      setAttribute(key, value) { attributes[key] = String(value); },
      getAttribute(key) { return attributes[key] ?? null; },
      removeAttribute(key) { delete attributes[key]; },
      appendChild(child) { elements.set(child.id, child); },
      set src(value) { this.srcWrites++; attributes.src = value; },
      get src() { return attributes.src; },
    };
  }
  for (const id of ["studioPreviewPane", "studioPreviewEmpty", "studioPreviewLoading", "siteMain", "siteFooter"]) {
    elements.set(id, element(id));
  }
  const document = {
    body: element("body"), documentElement: element("html"),
    getElementById: id => elements.get(id), createElement: () => element(""),
    addEventListener: (name, fn) => listeners.set(name, fn),
  };
  const context = {
    document, console, requestAnimationFrame: fn => fn(),
    SiteState: { get: () => structuredClone(state) },
  };
  context.window = context;
  vm.runInNewContext(adapterSource, context);
  return { adapter: context.GreenfieldAdapter, document, el: id => elements.get(id) };
}

test("Greenfield exposes no generation API and the server exposes no generation route", () => {
  const h = setup({ meta: { siteId: "new" }, page: {}, sections: {} });
  assert.equal(h.adapter.generate, undefined);
  assert.equal(h.adapter.toBrief, undefined);
  assert.doesNotMatch(serverSource, /api\\\/greenfield\\\/projects/);
  assert.doesNotMatch(serverSource, /runGreenfieldGenerator|greenfieldRuns|runtime-briefs/);
});

test("a blank new document is never claimed by Greenfield", () => {
  const h = setup({ meta: { siteId: "new" }, page: {}, sections: {} });
  assert.equal(h.adapter.handlesPreview(), false);
  assert.equal(h.adapter.restore(), false);
  assert.equal(h.el("siteMain").hidden, false);
});

test("an explicitly saved old Greenfield project remains viewable", () => {
  const previewPath = "/greenfield-site/easily-old/index.html";
  const h = setup({
    meta: { siteId: "old", generationEngine: "greenfield", greenfieldPreviewPath: previewPath, greenfieldRunId: "run-1" },
    page: {}, sections: {},
  });
  assert.equal(h.adapter.restore(), true);
  assert.equal(h.el("greenfieldPreviewFrame").src, previewPath);
  assert.equal(h.document.body.dataset.studioPreview, "site");
});

test("new creation is hard-wired to Blueprint and cannot fall through to legacy", () => {
  const buildStart = questionSource.indexOf("async function buildFromCompletedFlow");
  const buildEnd = questionSource.indexOf("function bindFinalBlueprintBuild", buildStart);
  const build = questionSource.slice(buildStart, buildEnd);
  assert.match(build, /generationEngine = "creative-director-blueprint"/);
  assert.match(build, /buildAiPreview/);
  assert.doesNotMatch(build, /GreenfieldAdapter|adapter\\.generate|AISiteBuilder/);
  assert.match(welcomeSource, /if \(createMode === "new"\)[\s\S]{0,180}new_generation_requires_blueprint/);
});

test("normalizing a Blueprint document cannot restore a legacy template", () => {
  const context = {
    console,
    location: { search: "" },
    localStorage: { getItem() { return null; } },
    SectionRegistry: { SECTION_IDS: ["hero", "footer"] },
  };
  context.window = context;
  vm.runInNewContext(gateSource, context);
  vm.runInNewContext(documentSource, context);
  const doc = context.AppDocument.createEmptyCreateDocument();
  doc.page.createPath = "blueprint";
  doc.page.template = "luxury-brand";
  doc.page.theme = "minimal-white";
  doc.page.designFamily = "salon";
  doc.page.siteComposition = { template: "luxury-brand" };
  const normalized = context.AppDocument.normalize(doc);
  assert.equal(normalized.page.createPath, "blueprint");
  assert.equal(normalized.page.template, undefined);
  assert.equal(normalized.page.theme, undefined);
  assert.equal(normalized.page.designFamily, undefined);
  assert.equal(normalized.page.siteComposition, undefined);
});
