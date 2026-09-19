import path from "path";
import { pathToFileURL } from "url";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const puppeteerPath = path.join(root, "server", "node_modules", "puppeteer", "lib", "puppeteer", "puppeteer.js");
const puppeteer = await import(pathToFileURL(puppeteerPath).href);
const base = process.argv[2] || "http://localhost:3847/studio.html";
const executablePath = process.env.EASILY_BROWSER_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const browser = await puppeteer.default.launch({ headless: "new", executablePath, args: ["--no-sandbox"] });

function assert(ok, message) { if (!ok) throw new Error(message); }

try {
  const off = await browser.newPage();
  await off.goto(base + "?new=1&questionEngine=0", { waitUntil: "domcontentloaded" });
  await off.waitForSelector("#studioCreateStep1:not([hidden])", { timeout: 15000 });
  assert(!(await off.$("#questionEngineWelcome")), "Question Engine mounted with gate off");
  await off.close();

  const on = await browser.newPage();
  await on.setViewport({ width: 760, height: 857, deviceScaleFactor: 1 });
  on.on("console", (msg) => { if (msg.type() === "error") console.error("BROWSER", msg.text()); });
  on.on("pageerror", (error) => console.error("PAGE ERROR", error.message));
  await on.goto(base + "?new=1&questionEngine=1", { waitUntil: "domcontentloaded" });
  await on.waitForSelector("#studioCreateStep1:not([hidden])", { timeout: 15000 });
  await on.evaluate(() => { document.body.dataset.studioPhase = "create"; });
  assert(
    await on.$eval("#siteMain", (el) => getComputedStyle(el).visibility === "hidden"),
    "previous site was visible before the Question Engine preview was ready"
  );
  await on.$eval("#studioCreateTypeChoices [data-site-type='foretag']", (input) => {
    input.checked = true;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await on.$eval("#studioCreateConfirm1", (button) => button.click());
  try {
    await on.waitForSelector("#studioCreateStep2:not([hidden])", { timeout: 15000 });
  } catch (error) {
    console.error("BUSINESS STEP DIAGNOSTICS", await on.evaluate(() => ({
      selected: document.querySelector("#studioCreateTypeChoices [data-site-type]:checked")?.value,
      revision: window.SiteState?.get?.()?.page?.creativeBrief?.revision,
      siteType: window.SiteState?.get?.()?.page?.creativeBrief?.customerFacts?.siteType,
      step1Hidden: document.getElementById("studioCreateStep1")?.hidden,
      step2Hidden: document.getElementById("studioCreateStep2")?.hidden,
      hasSubmitBusinessStep: !!window.QuestionEngineController?.submitBusinessStep,
    })));
    throw error;
  }
  await on.type("#welcomeCreateBusinessName", "Lundgrens Måleri");
  await on.type("#welcomeCreateBusinessDescription", "Målar lägenheter för privatpersoner i Malmö.");
  await on.$eval("#studioCreateConfirm2", (button) => button.click());
  await on.waitForSelector("#studioCreateStep3:not([hidden])", { timeout: 15000 });
  await on.$eval("#studioCreateStyleChoices [data-style-id='nordisk-ren']", (input) => {
    input.checked = true;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await on.$eval("#studioCreateConfirm3", (button) => button.click());
  try {
    await on.waitForFunction(() => document.querySelector("#studioCreateStep3")?.dataset.flowStatus === "preview", { timeout: 20000 });
    await on.waitForFunction(() =>
      document.getElementById("siteMain")?.dataset.createPath === "blueprint" &&
      document.querySelectorAll("#siteMain [data-bp-id]").length > 0,
      { timeout: 20000 }
    );
  } catch (error) {
    const diagnostics = await on.evaluate(() => ({
      flowStatus: document.querySelector("#studioCreateStep3")?.dataset.flowStatus,
      revision: window.SiteState?.get?.()?.page?.creativeBrief?.revision,
      createPath: window.SiteState?.get?.()?.page?.createPath,
      hasBlueprint: !!window.SiteState?.get?.()?.page?.siteBlueprint,
      hasRouter: !!window.QuestionRouter?.resolve,
      hasProjection: !!window.CreativeDirectorBriefProjection?.applyToDocument,
      hasCreativeDirector: !!window.CreativeDirector?.runBlueprint,
      hasBridge: !!window.BlueprintDocumentBridge?.applySiteBlueprintToDocument,
      routerResult: window.QuestionRouter?.resolve?.(
        window.QuestionRegistry?.get?.("business.offer.core"),
        window.SiteState?.get?.()?.page?.creativeBrief
      ),
    }));
    console.error("PREVIEW DIAGNOSTICS", diagnostics);
    throw error;
  }
  const result = await on.evaluate(() => ({
    active: document.documentElement.dataset.questionEngineActive,
    unconnectedStepsVisible: Array.from(document.querySelectorAll("#studioChatIntro [data-create-step='4'], #studioChatIntro [data-create-step='5']")).some((el) => !el.hidden),
    revision: window.SiteState.get().page.creativeBrief.revision,
    siteType: window.SiteState.get().page.creativeBrief.customerFacts.siteType,
    siteTypeEvidenceSource: window.SiteState.get().page.creativeBrief.provenance["customerFacts.siteType"][0].evidence[0].source,
    designStyleId: window.SiteState.get().page.creativeBrief.customerFacts.design.styleId,
    designEvidenceSource: window.SiteState.get().page.creativeBrief.provenance["customerFacts.design.styleId"][0].evidence[0].source,
    blueprintAccent: window.SiteState.get().page.siteBlueprint.design.tokens["color.accent"],
    businessName: window.SiteState.get().page.creativeBrief.customerFacts.businessName,
    offer: window.SiteState.get().page.creativeBrief.customerFacts.offer.summary,
    audience: window.SiteState.get().page.creativeBrief.customerFacts.audience.primary,
    evidence: window.SiteState.get().page.creativeBrief.provenance["customerFacts.businessName"][0].evidence[0].quote,
    derivedRevision: window.SiteState.get().page.creativeBrief.derived.basedOnRevision,
    readiness: window.SiteState.get().page.creativeBrief.derived.readiness,
    createPath: window.SiteState.get().page.createPath,
    blueprintLocked: window.SiteState.get().page.blueprintLocked,
    renderedPath: document.getElementById("siteMain")?.dataset.createPath,
    renderedSections: document.querySelectorAll("#siteMain [data-bp-id]").length,
    inputDisabled: Array.from(document.querySelectorAll("#studioCreateStyleChoices [data-style-id]")).every((input) => input.disabled),
    buttonDisabled: document.getElementById("studioCreateConfirm3")?.disabled,
    buttonText: document.getElementById("studioCreateConfirm3")?.textContent,
    previewState: document.body.dataset.studioPreview,
    emptyStateHidden: document.getElementById("studioPreviewEmpty")?.hidden,
    emptyStateDisplay: getComputedStyle(document.getElementById("studioPreviewEmpty")).display,
    previewVisibility: getComputedStyle(document.getElementById("siteMain")).visibility,
  }));
  assert(result.active === "1", "active marker missing");
  assert(result.unconnectedStepsVisible === false, "unconnected steps visible with gate on");
  assert(result.revision === 4, "brief revision was not incremented four times");
  assert(result.siteType === "foretag" && result.siteTypeEvidenceSource === "selected_option", "site type missing from Creative Brief");
  assert(result.designStyleId === "nordisk-ren" && result.designEvidenceSource === "selected_option", "design style missing from Creative Brief");
  assert(result.blueprintAccent === "#6f8b78", "selected design direction did not affect Blueprint colors");
  assert(result.businessName === "Lundgrens Måleri", "business name missing from Creative Brief");
  assert(result.evidence === "Lundgrens Måleri", "evidence missing from Creative Brief");
  assert(result.offer === "Målar lägenheter för privatpersoner i Malmö.", "offer missing from Creative Brief");
  assert(result.audience === "privatpersoner i Malmö", "audience missing from Creative Brief");
  assert(result.derivedRevision === 4, "Creative Director projection used wrong brief revision");
  assert(result.readiness === "ready", "Creative Director projection is not ready");
  assert(result.createPath === "blueprint" && result.blueprintLocked === true, "Blueprint was not applied");
  assert(result.renderedPath === "blueprint" && result.renderedSections > 0, "Blueprint preview was not rendered");
  assert(result.inputDisabled && result.buttonDisabled, "completed question controls are not disabled");
  assert(result.buttonText === "Webbplats skapad", "completed button lacks final state");
  assert(result.previewState === "site" && result.emptyStateHidden, "empty preview overlay still covers the Blueprint");
  assert(result.emptyStateDisplay === "none", "empty preview overlay is still visually displayed");
  assert(result.previewVisibility === "visible", "Question Engine preview was not revealed after mounting");
  await new Promise((resolve) => setTimeout(resolve, 3000));
  const delayedPreview = await on.evaluate(() => ({
    state: document.body.dataset.studioPreview,
    hidden: document.getElementById("studioPreviewEmpty")?.hidden,
    display: getComputedStyle(document.getElementById("studioPreviewEmpty")).display,
    emptyRect: document.getElementById("studioPreviewEmpty")?.getBoundingClientRect().toJSON(),
    mainRect: document.getElementById("siteMain")?.getBoundingClientRect().toJSON(),
    chatRect: document.getElementById("studioCreatePane")?.getBoundingClientRect().toJSON(),
    previewRect: document.getElementById("studioPreviewPane")?.getBoundingClientRect().toJSON(),
    questionRect: document.getElementById("studioCreateStep3")?.getBoundingClientRect().toJSON(),
    composeDisplay: getComputedStyle(document.getElementById("studioChatCompose")).display,
    visibleBrokenImages: Array.from(document.querySelectorAll("#siteMain img")).filter((img) =>
      !img.hidden && img.complete && !img.naturalWidth
    ).length,
    imageFallbacks: document.querySelectorAll("#siteMain .is-image-unavailable").length,
    imagesInsideFallbacks: document.querySelectorAll("#siteMain .is-image-unavailable img").length,
  }));
  assert(delayedPreview.display === "none", "empty preview overlay returned after rendering");
  assert(
    Math.abs(delayedPreview.chatRect.top - delayedPreview.previewRect.top) < 2 &&
      delayedPreview.previewRect.left >= delayedPreview.chatRect.right - 2,
    "Question Engine workspace stacked vertically instead of staying side by side"
  );
  assert(delayedPreview.questionRect.top - delayedPreview.chatRect.top < 120, "Question Engine is pinned below an empty chat area");
  assert(delayedPreview.composeDisplay === "none", "legacy chat composer is still visible");
  assert(delayedPreview.visibleBrokenImages === 0, "broken Blueprint images remain visible");
  assert(delayedPreview.imagesInsideFallbacks === 0, "broken image elements remain inside fallback surfaces");
  await on.evaluate(() => window.QuestionEngineController.submitDesignStep());
  assert(await on.evaluate(() => window.SiteState.get().page.creativeBrief.revision) === 4, "completed flow accepted another submission");
  console.log("PASS question-engine Studio gate off/on");
  console.log(result);
  await on.close();

  const resumed = await browser.newPage();
  await resumed.goto(base + "?questionEngine=1", { waitUntil: "domcontentloaded" });
  await resumed.waitForSelector("#studioCreateStep1:not([hidden])", { timeout: 15000 });
  await new Promise((resolve) => setTimeout(resolve, 500));
  assert(
    !(await resumed.$$eval("#studioChatIntro [data-create-step]:not([data-create-step='1'])", (steps) =>
      steps.some((step) => !step.hidden)
    )),
    "an unconnected Welcome Flow step reappeared on a resumed Question Engine page"
  );
  await resumed.close();
  console.log("PASS question-engine resumed page keeps legacy Welcome Flow hidden");
} finally {
  await browser.close();
}
