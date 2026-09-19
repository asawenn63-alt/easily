import assert from "node:assert/strict";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const base = process.argv[2] || "http://127.0.0.1:3847";

const puppeteer = await import(pathToFileURL(path.join(root, "server/node_modules/puppeteer/lib/puppeteer/puppeteer.js")).href);
const browser = await puppeteer.default.launch({
  headless: "new",
  protocolTimeout: 420000,
  executablePath: process.env.EASILY_BROWSER_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  args: ["--no-sandbox"],
});

try {
  const page = await browser.newPage();
  page.on("console", (message) => {
    if (message.type() === "error") console.error("BROWSER", message.text());
  });
  await page.goto(base + "/studio.html?new=1&questionEngine=1", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector("#studioCreateStep1:not([hidden])", { timeout: 30000 });
  await page.evaluate(() => {
    document.body.dataset.studioPhase = "create";
  });

  const choose = (selector) => page.$eval(selector, (input) => {
    input.checked = true;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  const click = (selector) => page.$eval(selector, (button) => button.click());

  await choose("[data-site-type='foretag']");
  await page.waitForFunction(() => document.getElementById("studioCreateConfirm1")?.dataset.questionEngineBound === "1");
  await click("#studioCreateConfirm1");
  await page.waitForSelector("#studioCreateStep2:not([hidden])");
  await page.waitForFunction(() => document.getElementById("studioCreateConfirm2")?.dataset.questionEngineBound === "1");
  await page.type("#welcomeCreateBusinessName", "Spårbar Form");
  await page.type("#welcomeCreateBusinessDescription", "En svensk designstudio som skapar tydliga visuella identiteter för små företag.");
  await click("#studioCreateConfirm2");
  await page.waitForSelector("#studioCreateStep3:not([hidden])");
  await page.waitForFunction(() => document.getElementById("studioCreateConfirm3")?.dataset.questionEngineBound === "1");
  await choose("[data-style-id='nordisk-ren']");
  await click("#studioCreateConfirm3");
  await page.waitForSelector("#studioCreateStep4:not([hidden])");
  await page.waitForFunction(() => document.getElementById("studioCreateConfirm4")?.dataset.questionEngineBound === "1");
  await page.$$eval("#studioCreateSectionChoices [data-section-id]", (inputs) => {
    inputs.slice(0, 2).forEach((input) => {
      input.checked = true;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
  });
  await click("#studioCreateConfirm4");
  await page.waitForSelector("#studioCreateStep5:not([hidden])");
  assert.equal(await page.$eval("#siteMain", (node) => node.dataset.generationId || ""), "", "generation became visible before step 5");
  await choose("[data-existing-id='from-scratch']");
  await click("#studioCreateConfirm5");

  await page.waitForFunction(() => {
    const status = document.querySelector("#studioCreateStep5")?.dataset.flowStatus;
    return status === "preview" || status === "error";
  }, { timeout: 360000, polling: 500 });

  const initialFlowStatus = await page.$eval("#studioCreateStep5", (node) => node.dataset.flowStatus || "");
  if (initialFlowStatus !== "preview") {
    // Existing visual validation may reject the flow for design reasons outside P0.
    // Reload the exact persisted project and verify provenance independently of P1/P2.
    const provisionedId = await page.evaluate(() => String(window.SiteState.get()?.meta?.siteId || ""));
    assert.ok(provisionedId, "question flow did not provision a durable project before AI generation");
    await page.goto(base + "/editor/" + encodeURIComponent(provisionedId) + "?questionEngine=1", { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForFunction(() => /^gen_/.test(document.getElementById("siteMain")?.dataset.generationId || ""), { timeout: 60000 });
  }

  const client = await page.evaluate(() => {
    const doc = window.SiteState.get();
    const generationId = String(doc.meta?.previewGenerationId || "");
    const trace = doc.meta?.generationTrace?.generations?.[generationId];
    return {
      flowStatus: document.querySelector("#studioCreateStep5")?.dataset.flowStatus || "reloaded-persisted-preview",
      generationId,
      visibleGenerationId: doc.meta?.visibleGenerationId,
      domGenerationId: document.getElementById("siteMain")?.dataset.generationId,
      status: trace?.status,
      artifactKeys: Object.keys(trace?.artifacts || {}),
      renderManifest: trace?.artifacts?.renderManifest,
      draftRevision: trace?.persistence?.draftRevision,
      siteId: doc.meta?.siteId,
      errorText: document.getElementById("createErrorExistingSite")?.textContent || "",
    };
  });

  assert.ok(client.flowStatus === "preview" || client.flowStatus === "reloaded-persisted-preview", "real generation did not reach a traceable preview: " + JSON.stringify(client));
  assert.match(client.generationId, /^gen_/);
  assert.equal(client.domGenerationId, client.generationId, "visible DOM is not bound to the persisted generation");
  assert.equal(client.visibleGenerationId, client.generationId);
  assert.equal(client.status, "persisted");
  assert.deepEqual(client.artifactKeys, [
    "creativeBrief",
    "creativeVision",
    "compositionPlan",
    "componentStrategyExecution",
    "blueprintBeforeGeometry",
    "geometryResolved",
    "renderManifest",
  ]);

  let stored;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    stored = await fetch(base + "/api/projects/" + encodeURIComponent(client.siteId)).then((response) => response.json());
    if (stored.project?.draftDocument?.meta?.previewGenerationId === client.generationId) break;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  const serverDoc = stored.project?.draftDocument;
  const serverTrace = serverDoc?.meta?.generationTrace?.generations?.[client.generationId];
  assert.equal(serverDoc?.meta?.previewGenerationId, client.generationId);
  assert.equal(serverDoc?.meta?.persistedGenerationId, client.generationId);
  assert.equal(serverDoc?.meta?.visibleGenerationId, client.generationId);
  assert.equal(serverTrace?.generationId, client.generationId);
  assert.equal(serverTrace?.status, "persisted");
  assert.deepEqual(serverTrace?.artifacts?.renderManifest, client.renderManifest, "renderer input differs from persisted render manifest");

  console.log("PASS real AI generation trace", {
    projectId: client.siteId,
    generationId: client.generationId,
    draftRevision: client.draftRevision,
    artifactCount: client.artifactKeys.length,
    domGenerationId: client.domGenerationId,
    initialFlowStatus,
  });
} finally {
  await browser.close();
}
