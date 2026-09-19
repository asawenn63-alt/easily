/**
 * System Validation Engine — quality gate for Easily AI platform.
 * Returns PASS | WARNING | FAIL per check. Never modifies product behaviour.
 */
(function (global) {
  "use strict";

  const STATUS = { PASS: "PASS", WARNING: "WARNING", FAIL: "FAIL" };
  const LOG_TAG = "[Easily · validation]";

  function log(msg, data) {
    try {
      console.info(LOG_TAG, msg, data || "");
    } catch (e) {
      /* ignore */
    }
  }

  function now() {
    return typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
  }

  const SUCCESS_RATE_GATE = 0.95;

  function createReport() {
    return {
      startedAt: new Date().toISOString(),
      finishedAt: null,
      durationMs: 0,
      summary: { pass: 0, warning: 0, fail: 0, total: 0 },
      library: { total: 0, pass: 0, warning: 0, fail: 0, successRate: 0, gate: SUCCESS_RATE_GATE },
      failedScenarios: [],
      scenarios: [],
      engines: {},
      coverage: {},
      performance: {},
      exitCode: 0,
    };
  }

  function recordCheck(report, category, name, result) {
    const entry = {
      category: category,
      name: name,
      status: result.status,
      reason: result.reason || "",
      durationMs: result.durationMs || 0,
      meta: result.meta || null,
    };
    if (!report.engines[category]) report.engines[category] = [];
    report.engines[category].push(entry);
    report.summary.total++;
    if (entry.status === STATUS.PASS) report.summary.pass++;
    else if (entry.status === STATUS.WARNING) report.summary.warning++;
    else report.summary.fail++;
    if (entry.status === STATUS.FAIL) report.exitCode = 1;
    return entry;
  }

  function markCoverage(report, key) {
    report.coverage[key] = true;
  }

  async function runCheck(category, name, fn) {
    const t0 = now();
    try {
      const out = await fn();
      const durationMs = Math.round(now() - t0);
      if (out && out.status) {
        return Object.assign({}, out, { durationMs: durationMs });
      }
      return { status: out ? STATUS.PASS : STATUS.FAIL, reason: out ? "" : "Check returned falsy", durationMs: durationMs };
    } catch (e) {
      return { status: STATUS.FAIL, reason: String(e && e.message ? e.message : e), durationMs: Math.round(now() - t0) };
    }
  }

  function recordLibraryScenario(report, scenarioReport, scenario) {
    if (!scenario || scenario.workflow) return;
    report.library.total++;
    if (scenarioReport.status === STATUS.PASS) report.library.pass++;
    else if (scenarioReport.status === STATUS.WARNING) report.library.warning++;
    else report.library.fail++;
    if (scenarioReport.status === STATUS.FAIL) {
      report.failedScenarios.push({
        id: scenarioReport.id,
        name: scenarioReport.name,
        category: scenario.category || "",
        reason: (scenarioReport.steps[0] && scenarioReport.steps[0].reason) || "",
      });
    }
  }

  async function runFlatScenario(report, scenario) {
    const t0 = now();
    const scenarioReport = {
      id: scenario.id,
      name: scenario.name,
      category: scenario.category || "",
      status: STATUS.PASS,
      steps: [],
      checks: [],
      durationMs: 0,
    };

    log("Flat scenario start", scenario.id);
    const stepT0 = now();
    let stepResult = { status: STATUS.PASS, reason: "" };
    try {
      stepResult = await scenario.run(scenario.ctx || {});
    } catch (e) {
      stepResult = { status: STATUS.FAIL, reason: String(e && e.message ? e.message : e) };
    }
    scenarioReport.steps.push({
      id: "run",
      label: scenario.name,
      status: stepResult.status || STATUS.FAIL,
      reason: stepResult.reason || "",
      durationMs: Math.round(now() - stepT0),
    });
    scenarioReport.status = stepResult.status || STATUS.FAIL;
    scenarioReport.durationMs = Math.round(now() - t0);
    report.scenarios.push(scenarioReport);
    report.performance[scenario.id] = scenarioReport.durationMs;
    recordLibraryScenario(report, scenarioReport, scenario);
    if (scenarioReport.status === STATUS.FAIL) report.exitCode = 1;
    log("Flat scenario done", { id: scenario.id, status: scenarioReport.status, ms: scenarioReport.durationMs });
    return scenarioReport;
  }

  async function runScenario(report, scenario) {
    if (scenario.flat && typeof scenario.run === "function") {
      return runFlatScenario(report, scenario);
    }
    if (!scenario.steps || !scenario.steps.length) {
      return runFlatScenario(report, Object.assign({}, scenario, { flat: true, run: scenario.run || async function () { return { status: STATUS.FAIL, reason: "No steps" }; } }));
    }

    const t0 = now();
    const scenarioReport = {
      id: scenario.id,
      name: scenario.name,
      category: scenario.category || "",
      status: STATUS.PASS,
      steps: [],
      checks: [],
      durationMs: 0,
    };

    log("Scenario start", scenario.id);

    for (let i = 0; i < scenario.steps.length; i++) {
      const step = scenario.steps[i];
      const stepT0 = now();
      let stepResult = { status: STATUS.PASS, reason: "" };
      try {
        stepResult = await step.run(scenario.ctx || {});
      } catch (e) {
        stepResult = { status: STATUS.FAIL, reason: String(e && e.message ? e.message : e) };
      }
      const stepEntry = {
        id: step.id,
        label: step.label,
        status: stepResult.status || STATUS.FAIL,
        reason: stepResult.reason || "",
        durationMs: Math.round(now() - stepT0),
      };
      scenarioReport.steps.push(stepEntry);
      if (stepEntry.status === STATUS.FAIL) scenarioReport.status = STATUS.FAIL;
      else if (stepEntry.status === STATUS.WARNING && scenarioReport.status === STATUS.PASS) {
        scenarioReport.status = STATUS.WARNING;
      }
    }

    if (scenario.verifyEngines) {
      for (let j = 0; j < scenario.verifyEngines.length; j++) {
        const ev = scenario.verifyEngines[j];
        const checkResult = await runCheck(scenario.id, ev.name, ev.run);
        const recorded = recordCheck(report, ev.category || "Engine", ev.name, checkResult);
        scenarioReport.checks.push(recorded);
        markCoverage(report, ev.category || ev.name);
        if (recorded.status === STATUS.FAIL) scenarioReport.status = STATUS.FAIL;
        else if (recorded.status === STATUS.WARNING && scenarioReport.status === STATUS.PASS) {
          scenarioReport.status = STATUS.WARNING;
        }
      }
    }

    scenarioReport.durationMs = Math.round(now() - t0);
    report.scenarios.push(scenarioReport);
    report.performance[scenario.id] = scenarioReport.durationMs;
    if (scenario.workflow) {
      report.summary.total++;
      if (scenarioReport.status === STATUS.PASS) report.summary.pass++;
      else if (scenarioReport.status === STATUS.WARNING) report.summary.warning++;
      else report.summary.fail++;
    }

    if (scenarioReport.status === STATUS.FAIL) report.exitCode = 1;
    else if (scenarioReport.status === STATUS.WARNING && report.exitCode === 0) report.exitCode = 0;

    log("Scenario done", { id: scenario.id, status: scenarioReport.status, ms: scenarioReport.durationMs });
    return scenarioReport;
  }

  function finalizeLibraryGate(report) {
    const lib = report.library;
    if (lib.total > 0) {
      lib.successRate = Math.round(((lib.total - lib.fail) / lib.total) * 1000) / 1000;
      if (lib.successRate < SUCCESS_RATE_GATE) {
        report.exitCode = 1;
        log("Library gate FAILED", { successRate: lib.successRate, gate: SUCCESS_RATE_GATE, fail: lib.fail });
      } else {
        log("Library gate PASSED", { successRate: lib.successRate, gate: SUCCESS_RATE_GATE });
        report.exitCode = 0;
      }
    }
  }

  async function runEngineAudit(report) {
    const audits = global.EasilyValidationScenarios && global.EasilyValidationScenarios.engineAudits;
    if (!audits) return;
    for (let i = 0; i < audits.length; i++) {
      const audit = audits[i];
      const result = await runCheck(audit.category, audit.name, audit.run);
      recordCheck(report, audit.category, audit.name, result);
      markCoverage(report, audit.category);
    }
  }

  async function runAll(opts) {
    opts = opts || {};
    const report = createReport();
    const t0 = now();

    const scenarios =
      (global.EasilyValidationScenarios && global.EasilyValidationScenarios.scenarios) || [];

    for (let i = 0; i < scenarios.length; i++) {
      const scenario = scenarios[i];
      if (scenario.before) await scenario.before();
      scenario.ctx = scenario.ctx || {};
      await runScenario(report, scenario);
    }

    await runEngineAudit(report);

    report.durationMs = Math.round(now() - t0);
    report.finishedAt = new Date().toISOString();
    report.coveragePercent = Math.round(
      (Object.keys(report.coverage).length / Math.max(1, (global.EasilyValidationScenarios && global.EasilyValidationScenarios.coverageTargets) || 11)) * 100,
    );

    finalizeLibraryGate(report);
    report.summary.total = report.library.total + report.scenarios.filter(function (s) {
      return (global.EasilyValidationScenarios && global.EasilyValidationScenarios.scenarios || []).some(function (sc) {
        return sc.id === s.id && sc.workflow;
      });
    }).length;

    log("Complete", { summary: report.summary, library: report.library });
    return report;
  }

  function formatTextReport(report) {
    const lines = [];
    lines.push("EASILY SYSTEM VALIDATION REPORT");
    lines.push("=".repeat(40));
    lines.push("Started:  " + report.startedAt);
    lines.push("Finished: " + report.finishedAt);
    lines.push("Duration: " + report.durationMs + " ms");
    lines.push("Summary:  PASS " + report.summary.pass + "  WARNING " + report.summary.warning + "  FAIL " + report.summary.fail);
    if (report.library && report.library.total) {
      const pct = Math.round((report.library.successRate || 0) * 1000) / 10;
      lines.push(
        "Library:  " +
          report.library.total +
          " scenarios · success " +
          pct +
          "% (gate ≥ " +
          Math.round((report.library.gate || 0.95) * 100) +
          "%) · FAIL " +
          report.library.fail,
      );
    }
    lines.push("Coverage: " + (report.coveragePercent || 0) + "%");
    if (report.failedScenarios && report.failedScenarios.length) {
      lines.push("");
      lines.push("Failed scenarios (bugs):");
      report.failedScenarios.forEach(function (f) {
        lines.push("  " + f.id + " [" + f.category + "] " + f.name + (f.reason ? " — " + f.reason : ""));
      });
    }
    lines.push("");

    report.scenarios.forEach(function (sc) {
      lines.push("Scenario: " + sc.name + " [" + sc.status + "] (" + sc.durationMs + " ms)");
      sc.steps.forEach(function (st) {
        lines.push("  Step " + st.id + " " + st.label + ": " + st.status + (st.reason ? " — " + st.reason : ""));
      });
      sc.checks.forEach(function (ch) {
        lines.push("  Check " + ch.name + ": " + ch.status + (ch.reason ? " — " + ch.reason : ""));
      });
      lines.push("");
    });

    lines.push("Engine audit");
    lines.push("-".repeat(40));
    Object.keys(report.engines).forEach(function (cat) {
      report.engines[cat].forEach(function (e) {
        lines.push(cat + " / " + e.name + ": " + e.status + (e.reason ? "\n  Reason: " + e.reason : ""));
      });
    });

    lines.push("");
    lines.push("Performance");
    Object.keys(report.performance).forEach(function (k) {
      lines.push("  " + k + ": " + report.performance[k] + " ms");
    });

    lines.push("");
    lines.push("Exit code: " + report.exitCode);
    return lines.join("\n");
  }

  global.EasilySystemValidation = {
    STATUS: STATUS,
    runAll: runAll,
    runScenario: runScenario,
    runCheck: runCheck,
    recordCheck: recordCheck,
    formatTextReport: formatTextReport,
    createReport: createReport,
  };
})(typeof window !== "undefined" ? window : globalThis);
