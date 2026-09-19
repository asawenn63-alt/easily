import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { compileLayout } from "../v2/layout-compiler.mjs";
import {
  validLockedBlueprint,
  validRenderManifest,
  validResolvedSceneGraph,
  validSceneGraph,
} from "../test/v2-contract/fixtures.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const puppeteer = await import(pathToFileURL(path.join(root, "server/node_modules/puppeteer/lib/puppeteer/puppeteer.js")).href);
const browser = await puppeteer.default.launch({
  headless: "new",
  executablePath: process.env.EASILY_BROWSER_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  args: ["--no-sandbox"],
});

try {
  const compiled = compileLayout({
    lockedBlueprint: validLockedBlueprint,
    resolvedSceneGraph: validResolvedSceneGraph,
    renderManifest: validRenderManifest,
  });
  assert.equal(compiled.ok, true);
  const profile = {
    profileId: "profile.desktop",
    query: { minInlinePx: 701 },
    viewportInlinePx: 1440,
    viewportBlockPx: 900,
    ...compiled,
  };

  const page = await browser.newPage();
  page.on("console", (message) => { if (message.type() === "error") console.error("BROWSER", message.text()); });
  page.on("pageerror", (error) => console.error("PAGE ERROR", error.message));
  await page.setViewport({ width: 1500, height: 900, deviceScaleFactor: 1 });
  await page.goto("http://localhost:3847/studio.html?new=1", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.SiteState && window.EditorEngine && window.StudioPanelModes, { timeout: 20000 });
  await page.waitForFunction(() => document.documentElement.dataset.questionEngineActive === "1", { timeout: 20000 });
  await new Promise((resolve) => setTimeout(resolve, 500));
  await page.evaluate(async ({ sceneGraph, resolved, locked, manifest, compiledProfile }) => {
    const doc = window.AppDocument.createEmptyCreateDocument();
    doc.meta.siteId = "v2-runtime-smoke";
    doc.meta.generationEngine = "v2";
    doc.page.createPath = "v2";
    doc.page.v2GenerationId = sceneGraph.generationId;
    doc.page.v2SceneGraph = sceneGraph;
    doc.page.v2LockedBlueprint = locked;
    doc.page.v2ResolvedProfiles = [resolved];
    doc.page.v2RenderManifests = [manifest];
    doc.page.v2CompiledProfiles = [compiledProfile];
    window.SiteState.replace(doc);
    window.QuestionEngineController?.mount?.();
    // Låt studio-startens asynkrona tom-canvas slutföras innan den syntetiska
    // V2-fixturen visas. Det motsvarar läget efter att en riktig generation är klar.
    await new Promise((resolve) => setTimeout(resolve, 750));
    window.StudioWelcome.showGeneratedSite();
    await window.EditorEngine.remountAsyncForced();
    window.StudioPanelModes.refreshSiteChrome();
  }, {
    sceneGraph: validSceneGraph,
    resolved: validResolvedSceneGraph,
    locked: validLockedBlueprint,
    manifest: validRenderManifest,
    compiledProfile: profile,
  });

  try {
    await page.waitForSelector("#siteMain .easily-v2-site", { timeout: 20000 });
  } catch (error) {
    console.error("V2 RUNTIME DIAGNOSTICS", await page.evaluate(() => ({
      path: window.SiteState?.get?.()?.page?.createPath,
      hasGraph: !!window.SiteState?.get?.()?.page?.v2SceneGraph,
      profiles: window.SiteState?.get?.()?.page?.v2CompiledProfiles?.length,
      renderer: !!window.V2CompiledRenderer,
      mainWidth: document.getElementById("siteMain")?.clientWidth,
      mainHtml: document.getElementById("siteMain")?.innerHTML?.slice(0, 500),
      preview: document.body.dataset.studioPreview,
    })));
    throw error;
  }
  const initial = await page.evaluate(() => ({
    createPath: document.getElementById("siteMain").dataset.createPath,
    componentNodes: document.querySelectorAll("#siteMain [data-component], #siteMain [data-bp-id]").length,
    primitiveNodes: document.querySelectorAll("#siteMain [data-node-kind]").length,
    addVisible: !document.getElementById("studioTabAdd").hidden,
    manualVisible: !document.getElementById("studioTabManual").hidden,
    oldDesignVisible: !document.getElementById("studioTabDesign").hidden,
    legacySections: Object.keys(window.SiteState.get().sections || {}).length,
    legacyIdentity: ["template", "theme", "industry", "designFamily", "designSpec", "componentStrategy", "siteBlueprint"]
      .filter((key) => key in window.SiteState.get().page),
  }));
  assert.equal(initial.createPath, "v2");
  assert.equal(initial.componentNodes, 0);
  assert.ok(initial.primitiveNodes > 0);
  assert.equal(initial.addVisible, true);
  assert.equal(initial.manualVisible, true);
  assert.equal(initial.oldDesignVisible, false);
  assert.equal(initial.legacySections, 0);
  assert.deepEqual(initial.legacyIdentity, []);

  await page.click("#studioTabManual");
  await page.waitForSelector("[data-v2-content-field]");
  const manual = await page.evaluate(() => ({
    fields: document.querySelectorAll("[data-v2-content-field]").length,
    legacyFields: document.querySelectorAll("[data-manual-field]").length,
  }));
  assert.ok(manual.fields > 0);
  assert.equal(manual.legacyFields, 0);

  await page.click("#studioTabAdd");
  await page.waitForSelector(".website-document-add__v2-choice");
  assert.equal(await page.$$eval(".website-document-add__v2-choice", (items) => items.length), 7);

  await page.$eval('#siteMain [data-content-ref="content.intro.title"]', (node) => node.click());
  await page.waitForFunction(() => document.body.dataset.studioLeftTab === "manual");
  await page.waitForFunction(() => document.activeElement?.getAttribute("data-v2-content-field") === "content.intro.title");
  assert.equal(await page.$eval('[data-v2-content-field="content.intro.title"]', (field) => document.activeElement === field), true);

  console.log("PASS V2 Studio runtime uses one component-free scene for render, Add and Manual");
  console.log(initial, manual);
} finally {
  await browser.close();
}
