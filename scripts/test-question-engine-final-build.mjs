import path from "path";
import { pathToFileURL, fileURLToPath } from "url";
import { compileLayout } from "../v2/layout-compiler.mjs";
import { validLockedBlueprint, validRenderManifest, validResolvedSceneGraph, validSceneGraph } from "../test/v2-contract/fixtures.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const puppeteer = await import(pathToFileURL(path.join(root, "server/node_modules/puppeteer/lib/puppeteer/puppeteer.js")).href);
const browser = await puppeteer.default.launch({ headless: "new", protocolTimeout: 600000, executablePath: process.env.EASILY_BROWSER_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", args: ["--no-sandbox"] });
const assert = (ok, message) => { if (!ok) throw new Error(message); };

try {
  const page = await browser.newPage();
  const compiled = compileLayout({ lockedBlueprint: validLockedBlueprint, resolvedSceneGraph: validResolvedSceneGraph, renderManifest: validRenderManifest });
  await page.setRequestInterception(true);
  page.on("request", (request) => {
    if (request.url().endsWith("/api/v2/generate-site")) {
      request.respond({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          engineVersion: "v2",
          generationId: validSceneGraph.generationId,
          creativeVision: { selectedIndex: 0, candidates: [], selectionRationale: "test", executionMandate: "test" },
          sceneGraph: validSceneGraph,
          lockedBlueprint: validLockedBlueprint,
          resolvedProfiles: [validResolvedSceneGraph],
          renderManifests: [validRenderManifest],
          compiledProfiles: [{ profileId: "profile.desktop", query: {}, viewportInlinePx: 1440, viewportBlockPx: 900, ...compiled }],
        }),
      });
      return;
    }
    request.continue();
  });
  await page.goto((process.argv[2] || "http://localhost:3847/studio.html") + "?new=1&questionEngine=1", { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#studioCreateStep1:not([hidden])", { timeout: 15000 });
  await page.waitForFunction(() => document.documentElement.dataset.questionEngineActive === "1", { timeout: 15000 });
  await page.evaluate(() => { document.body.dataset.studioPhase = "create"; });
  const choose = async (selector) => page.$eval(selector, (input) => { input.checked = true; input.dispatchEvent(new Event("change", { bubbles: true })); });
  const click = async (selector) => page.$eval(selector, (button) => button.click());
  await choose("[data-site-type='webbutik']");
  await click("#studioCreateConfirm1");
  await page.waitForSelector("#studioCreateStep2:not([hidden])");
  await new Promise((resolve) => setTimeout(resolve, 500));
  await page.$eval("#welcomeCreateBusinessName", (input) => { input.value = "Babyproffsen"; input.dispatchEvent(new Event("input", { bubbles: true })); });
  await page.$eval("#welcomeCreateBusinessDescription", (input) => { input.value = "Säljer trygga saker för barn och nyblivna föräldrar."; input.dispatchEvent(new Event("input", { bubbles: true })); });
  await click("#studioCreateConfirm2");
  try {
    await page.waitForSelector("#studioCreateStep3:not([hidden])", { timeout: 15000 });
  } catch (error) {
    console.error("STEP 3 DIAGNOSTICS", await page.evaluate(() => ({
      step2Hidden: document.getElementById("studioCreateStep2")?.hidden,
      step3Hidden: document.getElementById("studioCreateStep3")?.hidden,
      nameError: document.getElementById("createErrorBusinessName")?.textContent,
      descriptionError: document.getElementById("createErrorBusinessDescription")?.textContent,
      revision: window.SiteState?.get?.()?.page?.creativeBrief?.revision,
      facts: window.SiteState?.get?.()?.page?.creativeBrief?.customerFacts,
      hasStyles: document.querySelectorAll("#studioCreateStyleChoices [data-style-id]").length,
    })));
    throw error;
  }
  await choose("[data-style-id='lekfull-kreativ']");
  await click("#studioCreateConfirm3");
  await page.waitForSelector("#studioCreateStep4:not([hidden])");
  await click("#studioCreateConfirm4");
  await page.waitForSelector("#studioCreateStep5:not([hidden])");
  await choose("[data-existing-id='from-scratch']");
  await click("#studioCreateConfirmV2");
  await page.waitForFunction(() => document.querySelector("#studioCreateStep5")?.dataset.flowStatus === "preview", { timeout: 600000 });
  await page.waitForSelector("#siteMain .easily-v2-site", { timeout: 20000 });
  const result = await page.evaluate(() => {
    const doc = window.SiteState.get();
    return {
      path: doc.page.createPath,
      renderedPath: document.getElementById("siteMain")?.dataset.createPath,
      mainWidth: document.getElementById("siteMain")?.clientWidth,
      mainHidden: document.getElementById("siteMain")?.hidden,
      mainHtml: document.getElementById("siteMain")?.innerHTML?.slice(0, 300),
      previewState: document.body.dataset.studioPreview,
      previewLive: document.body.dataset.studioPreviewLive,
      generationFlag: document.documentElement.dataset.studioCreateGeneration,
      name: doc.page.creativeBrief.customerFacts.businessName,
      source: doc.page.creativeBrief.customerFacts.source.mode,
      revision: doc.page.creativeBrief.revision,
      sceneGraph: !!doc.page.v2SceneGraph,
      phase: document.body.dataset.studioPhase,
      composeVisible: getComputedStyle(document.getElementById("studioChatCompose")).display !== "none",
      visibleText: document.getElementById("siteMain")?.innerText || "",
      visibleImages: Array.from(document.querySelectorAll("#siteMain img")).map((img) => img.src),
      hasShowGeneratedSite: typeof window.StudioWelcome?.showGeneratedSite === "function",
      railVisible: !document.getElementById("blueprintEditorRail")?.hidden,
      generationEngine: doc.meta.generationEngine,
      questionSteps: document.querySelectorAll("#studioChatIntro [data-create-step]").length,
      colorProvenance: doc.page.creativeBrief.provenance["customerFacts.colors.mode"]?.length || 0,
      sourceProvenance: doc.page.creativeBrief.provenance["customerFacts.source.mode"]?.length || 0,
      legacyIdentity: [doc.page.template, doc.page.designFamily, doc.page.layoutEngine, doc.page.siteComposition].filter(Boolean),
    };
  });
  console.log("FINAL V2 DIAGNOSTICS", result);
  assert(result.path === "v2" && result.renderedPath === "v2", "V2 render path was not used");
  assert(result.sceneGraph, "free scene graph missing");
  assert(result.name === "Babyproffsen", "business answer missing");
  assert(result.questionSteps === 5, "creation flow must contain exactly five questions");
  assert(result.colorProvenance > 0 && result.sourceProvenance > 0, "all five answers must remain traceable in the Creative Brief");
  assert(result.source === "from-scratch", "source answer missing");
  assert(result.generationEngine === "v2", "wrong generation engine was recorded");
  assert(result.legacyIdentity.length === 0, "legacy template identity leaked into the new document");
  assert(result.visibleText.length > 20, "free scene output did not reach the visible page");
  if (result.phase !== "edit" || !result.composeVisible) console.error("CHAT TRANSITION DIAGNOSTICS", result);
  assert(result.phase === "edit" && result.composeVisible, "AI chat did not open after creation");
  assert(result.railVisible, "visual editor rail did not open after creation");
  await click("[data-blueprint-editor-tool='manual']");
  assert(await page.evaluate(() => document.body.dataset.studioLeftTab) === "manual", "manual editor tool did not open manual panel");
  await click("[data-blueprint-editor-tool='ai']");
  assert(await page.evaluate(() => document.body.dataset.studioLeftTab) === "ai", "AI editor tool did not open AI panel");
  console.log("PASS final five-question flow builds V2 free scene without legacy", result);
} finally {
  await browser.close();
}
