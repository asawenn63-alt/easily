import path from "path";
import { pathToFileURL, fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const puppeteer = await import(pathToFileURL(path.join(root, "server/node_modules/puppeteer/lib/puppeteer/puppeteer.js")).href);
const browser = await puppeteer.default.launch({
  headless: "new",
  executablePath: process.env.EASILY_BROWSER_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  args: ["--no-sandbox"],
});
const assert = (ok, message) => { if (!ok) throw new Error(message); };

try {
  const page = await browser.newPage();
  let conceptResponse = null;
  page.on("response", async (response) => {
    if (!response.url().includes("/api/creative-concept")) return;
    try { conceptResponse = await response.json(); } catch { conceptResponse = { ok: false, error: "unreadable-response" }; }
  });
  await page.goto((process.argv[2] || "http://localhost:3847/studio.html") + "?new=1&questionEngine=1", { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#studioCreateStep1:not([hidden])", { timeout: 15000 });
  await page.waitForFunction(() => document.documentElement.dataset.questionEngineActive === "1", { timeout: 15000 });
  await page.evaluate(() => { document.body.dataset.studioPhase = "create"; });
  const choose = (selector) => page.$eval(selector, (input) => {
    input.checked = true;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  const click = (selector) => page.$eval(selector, (button) => button.click());

  await choose("[data-site-type='webbutik']");
  await click("#studioCreateConfirm1");
  await page.waitForSelector("#studioCreateStep2:not([hidden])");
  await page.waitForFunction(() => document.getElementById("studioCreateConfirm2")?.dataset.questionEngineBound === "1");
  await page.type("#welcomeCreateBusinessName", "Stickarpelle");
  await page.type("#welcomeCreateBusinessDescription", "Garner, tyger, stickor och virknålar för kreativa handarbetare.");
  await click("#studioCreateConfirm2");
  await page.waitForSelector("#studioCreateStep3:not([hidden])");
  await page.waitForFunction(() => document.getElementById("studioCreateConfirm3")?.dataset.questionEngineBound === "1");
  await choose("[data-style-id='lekfull-kreativ']");
  await click("#studioCreateConfirm3");
  await page.waitForSelector("#studioCreateStep4:not([hidden])");
  await page.waitForFunction(() => document.getElementById("studioCreateConfirm4")?.dataset.questionEngineBound === "1");
  assert(await page.$$eval("#siteMain .site-section", (nodes) => nodes.length) === 0, "A site was rendered before all five answers were complete");
  assert(conceptResponse === null, "Creative Director was called before step 5");
  await page.$$eval("#studioCreateSectionChoices [data-section-id]", (inputs) => {
    inputs.slice(0, 2).forEach((input) => {
      input.checked = true;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
  });
  await click("#studioCreateConfirm4");
  await page.waitForSelector("#studioCreateStep5:not([hidden])");
  assert(await page.$$eval("#siteMain .site-section", (nodes) => nodes.length) === 0, "A site was rendered before step 5 confirmation");
  assert(conceptResponse === null, "Creative Director was called before step 5 confirmation");
  await choose("[data-existing-id='from-scratch']");
  await click("#studioCreateConfirm5");

  await page.waitForFunction(() => {
    const status = document.querySelector("#studioCreateStep5")?.dataset.flowStatus;
    return status === "preview" || status === "complete";
  }, { timeout: 300000 });
  const result = await page.evaluate(() => {
    const doc = window.SiteState.get();
    const children = doc.page.siteBlueprint?.root?.children || [];
    return {
      createPath: doc.page.createPath,
      source: doc.page.creativeBrief?.derived?.conceptSource,
      industry: doc.page.creativeBrief?.derived?.concept?.meta?.industry,
      types: children.map((node) => node.type),
      button: document.querySelector("#studioCreateConfirm5")?.textContent,
      flowStatus: document.querySelector("#studioCreateStep5")?.dataset.flowStatus,
    };
  });

  if (result.flowStatus !== "preview") {
    throw new Error("Build failed after AI response: " + JSON.stringify({ result, conceptResponse }));
  }

  assert(result.createPath === "blueprint", "legacy create path used");
  assert(result.source === "openai", "AI concept was not used");
  assert(String(result.industry || "").length > 8 && !/inredning|möbel/i.test(result.industry), "AI misunderstood the business: " + result.industry);
  assert(result.types.filter((type) => type === "brand-header").length === 1, "duplicate brand header");
  assert(result.types.filter((type) => type === "footer").length === 1, "duplicate footer");
  assert(result.button === "Webbplats skapad", "flow did not reach completed state");
  console.log("PASS Studio Creative Brief → OpenAI concept → Blueprint", result);
} finally {
  await browser.close();
}
