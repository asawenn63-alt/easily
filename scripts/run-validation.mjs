#!/usr/bin/env node
/**
 * Easily System Validation — regression runner (Node CLI).
 *
 * Usage:
 *   node scripts/run-validation.mjs
 *   node scripts/run-validation.mjs --url http://localhost:3847/validation.html
 *
 * Requires Easily server running for full browser scenarios.
 * Always runs Node-level syntax checks first.
 */
import { spawn, spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import http from "http";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const REPORT_PATH = path.join(ROOT, "validation-report.json");
const REPORT_TXT_PATH = path.join(ROOT, "validation-report.txt");

const args = process.argv.slice(2);
const urlArg = args.find((a) => a.startsWith("--url="));
const VALIDATION_URL = urlArg ? urlArg.split("=")[1] : "http://localhost:3847/validation.html?run=1";
const SKIP_BROWSER = args.includes("--node-only");

function log(msg) {
  console.log("[validation-runner] " + msg);
}

function syntaxCheckFiles() {
  const jsDir = path.join(ROOT, "js");
  const files = [
    "system-validation-engine.js",
    "validation-harness.js",
    "validation-assert.js",
    "validation-scenario-library.js",
    "validation-scenarios.js",
    "project-isolation.js",
    "generation-lifecycle.js",
    "generation-integrity.js",
    "intent-resolution-engine.js",
    "design-memory-engine.js",
    "image-intelligence-engine.js",
    "text-intelligence-engine.js",
    "ai-design-orchestrator.js",
    "edit-command-pipeline.js",
    "edit-session.js",
  ].map((f) => path.join(jsDir, f));

  files.push(path.join(ROOT, "ai.js"));

  const results = [];
  for (const file of files) {
    if (!fs.existsSync(file)) {
      results.push({ file, ok: false, reason: "missing" });
      continue;
    }
    const r = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
    results.push({ file: path.relative(ROOT, file), ok: r.status === 0, reason: r.stderr || "" });
  }
  return results;
}

function waitForServer(baseUrl, timeoutMs) {
  return new Promise((resolve) => {
    const u = new URL(baseUrl);
    const deadline = Date.now() + timeoutMs;
    const tick = () => {
      const req = http.get({ hostname: u.hostname, port: u.port || 80, path: "/", timeout: 2000 }, (res) => {
        res.resume();
        resolve(true);
      });
      req.on("error", () => {
        if (Date.now() > deadline) resolve(false);
        else setTimeout(tick, 500);
      });
    };
    tick();
  });
}

async function runWithPuppeteer(url) {
  let puppeteer;
  const candidates = [
    path.join(ROOT, "server", "node_modules", "puppeteer", "lib", "puppeteer", "puppeteer.js"),
    "puppeteer",
  ];
  for (const modPath of candidates) {
    try {
      const spec = modPath === "puppeteer" ? modPath : pathToFileURL(modPath).href;
      puppeteer = await import(spec);
      break;
    } catch {
      /* try next */
    }
  }
  if (!puppeteer) {
    log("puppeteer not installed — run: npm install puppeteer --prefix server");
    return null;
  }

  const browser = await puppeteer.default.launch({ headless: "new", args: ["--no-sandbox"] });
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle2", timeout: 120000 });
    await page.waitForFunction(() => window.__VALIDATION_DONE__ === true, { timeout: 120000 });
    const report = await page.evaluate(() => window.__VALIDATION_REPORT__);
    const text = await page.evaluate(() => {
      const SV = window.EasilySystemValidation;
      return SV && SV.formatTextReport ? SV.formatTextReport(window.__VALIDATION_REPORT__) : "";
    });
    return { report, text };
  } finally {
    await browser.close();
  }
}

function mergeReports(nodeChecks, browserReport) {
  const report = browserReport || {
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    durationMs: 0,
    summary: { pass: 0, warning: 0, fail: 0, total: 0 },
    scenarios: [],
    engines: { Node: [] },
    exitCode: 0,
  };

  if (!report.engines) report.engines = {};
  if (!report.engines.Node) report.engines.Node = [];

  nodeChecks.forEach((c) => {
    const status = c.ok ? "PASS" : "FAIL";
    report.engines.Node.push({ category: "Node", name: "syntax:" + c.file, status, reason: c.reason });
    report.summary.total++;
    if (c.ok) report.summary.pass++;
    else {
      report.summary.fail++;
      report.exitCode = 1;
    }
  });

  return report;
}

async function main() {
  log("Easily System Validation — regression suite");
  const nodeChecks = syntaxCheckFiles();
  const nodeFails = nodeChecks.filter((c) => !c.ok);
  if (nodeFails.length) {
    log("Node syntax FAIL: " + nodeFails.map((f) => f.file).join(", "));
  } else {
    log("Node syntax checks PASS (" + nodeChecks.length + " files)");
  }

  let browserReport = null;
  let textReport = "";

  if (!SKIP_BROWSER) {
    const up = await waitForServer(VALIDATION_URL.replace(/validation\.html.*/, ""), 8000);
    if (!up) {
      log("WARNING: Server not reachable at " + VALIDATION_URL + " — browser scenarios skipped");
      log("Start Easily with 1-STARTA-EASILY.bat then re-run");
    } else {
      log("Running browser scenarios at " + VALIDATION_URL);
      const result = await runWithPuppeteer(VALIDATION_URL);
      if (result) {
        browserReport = result.report;
        textReport = result.text;
      }
    }
  }

  const finalReport = mergeReports(nodeChecks, browserReport);
  fs.writeFileSync(REPORT_PATH, JSON.stringify(finalReport, null, 2), "utf8");

  if (textReport) {
    fs.writeFileSync(REPORT_TXT_PATH, textReport, "utf8");
    console.log("\n" + textReport);
    if (browserReport && browserReport.library) {
      const lib = browserReport.library;
      const pct = Math.round((lib.successRate || 0) * 1000) / 10;
      log("Library: " + lib.total + " scenarios · success " + pct + "% · FAIL " + lib.fail);
      if (lib.successRate < (lib.gate || 0.95)) {
        log("Library gate FAILED (need ≥ " + Math.round((lib.gate || 0.95) * 100) + "%)");
        finalReport.exitCode = 1;
      }
    }
  } else {
    const fallback =
      "EASILY VALIDATION (partial — browser scenarios not run)\n" +
      "Node syntax: " +
      (nodeFails.length ? "FAIL" : "PASS") +
      "\nSee validation-report.json\n";
    fs.writeFileSync(REPORT_TXT_PATH, fallback, "utf8");
    console.log("\n" + fallback);
  }

  log("Report written: " + REPORT_PATH);
  process.exit(finalReport.exitCode || 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
