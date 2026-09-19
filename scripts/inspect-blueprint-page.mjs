import path from "node:path";
import { createRequire } from "node:module";

const runtimeRequire = createRequire(path.join(
  String(process.env.USERPROFILE || ""),
  ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json",
));
const { chromium } = runtimeRequire("playwright");

const projectId = process.argv[2];
const screenshotPath = path.resolve(process.argv[3] || `test/${projectId}-inspection.png`);
if (!projectId) throw new Error("project id is required");

const browser = await chromium.launch({
  headless: true,
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
});
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
try {
  await page.goto(`http://127.0.0.1:3847/editor/${projectId}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => !!window.SiteState?.get?.()?.page?.siteBlueprint, null, { timeout: 30000 });
  const scrollArg = process.argv.find((arg) => arg.startsWith("--scroll-y="));
  if (scrollArg) {
    const scrollY = Number(scrollArg.split("=")[1]) || 0;
    await page.evaluate((targetY) => {
      const candidates = Array.from(document.querySelectorAll("body *")).filter((element) => {
        const style = getComputedStyle(element);
        return element.scrollHeight > element.clientHeight + 100 && /(auto|scroll)/.test(style.overflowY);
      });
      const target = candidates.sort((a, b) => b.clientHeight - a.clientHeight)[0];
      if (target) target.scrollTop = targetY;
      else window.scrollTo(0, targetY);
    }, scrollY);
    await page.waitForTimeout(500);
  }
  await page.screenshot({ path: screenshotPath, fullPage: process.argv.includes("--full-page") });
  const result = await page.evaluate(() => ({
    phase: document.body.dataset.studioPhase || "",
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    visibleCreateSteps: Array.from(document.querySelectorAll('[id^="studioCreateStep"]')).filter((el) => !el.hidden).length,
    validation: document.querySelector("[data-blueprint-validation]")?.getAttribute("data-blueprint-validation") || "",
    sectionCount: document.querySelectorAll("[data-blueprint-section], .bp-v7-section").length,
    title: document.querySelector("main h1, #siteMain h1")?.textContent?.trim() || "",
    scrollables: Array.from(document.querySelectorAll("body *")).filter((element) => {
      const style = getComputedStyle(element);
      return element.scrollHeight > element.clientHeight + 100 && /(auto|scroll)/.test(style.overflowY);
    }).slice(0, 5).map((element) => ({
      tag: element.tagName, id: element.id, className: String(element.className || "").slice(0, 100),
      scrollTop: element.scrollTop, scrollHeight: element.scrollHeight, clientHeight: element.clientHeight,
    })),
  }));
  console.log(JSON.stringify({ ok: true, screenshotPath, result }, null, 2));
} finally {
  await browser.close();
}
