import path from "node:path";
import { createRequire } from "node:module";

const runtimeRoot = String(process.env.USERPROFILE || "");
const runtimeRequire = createRequire(path.join(
  runtimeRoot,
  ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json",
));
const { chromium } = runtimeRequire("playwright");

const projectId = process.argv[2];
const base = process.argv[3] || "http://127.0.0.1:3847";
if (!projectId) throw new Error("project id is required");

const browser = await chromium.launch({
  headless: true,
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const failures = [];
page.on("pageerror", (error) => failures.push(error.message));
page.on("response", (response) => {
  if (response.status() >= 400 && response.url().includes("/api/")) {
    failures.push(`${response.status()} ${response.url()}`);
  }
});

try {
  await page.goto(`${base}/editor/${projectId}`, { waitUntil: "domcontentloaded" });
  const button = page.locator("#studioCreateConfirmV2");
  await button.waitFor({ state: "visible", timeout: 30000 });
  await button.click();
  await page.waitForFunction(() => {
    const control = document.querySelector("#studioCreateConfirmV2");
    return control && control.textContent.trim() === "Webbplats skapad";
  }, null, { timeout: 600000 });
  const result = await page.evaluate(() => ({
    phase: document.body.dataset.studioPhase || "",
    button: document.querySelector("#studioCreateConfirmV2")?.textContent?.trim() || "",
    error: document.querySelector("#createErrorExistingSite")?.textContent?.trim() || "",
    blueprint: !!window.SiteState?.get?.()?.page?.siteBlueprint,
    engine: window.SiteState?.get?.()?.meta?.generationEngine || "",
  }));
  console.log(JSON.stringify({ ok: true, projectId, result, failures }, null, 2));
} finally {
  await browser.close();
}
