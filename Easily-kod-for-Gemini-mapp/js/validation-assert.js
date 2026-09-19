/**
 * Validation scenario helpers — assertions for user scenario library.
 */
(function (global) {
  "use strict";

  const S = global.EasilySystemValidation && global.EasilySystemValidation.STATUS;
  const PASS = S ? S.PASS : "PASS";
  const WARN = S ? S.WARNING : "WARNING";
  const FAIL = S ? S.FAIL : "FAIL";

  function H() {
    return global.EasilyValidationHarness;
  }

  function pass(reason) {
    return { status: PASS, reason: reason || "" };
  }

  function fail(reason) {
    return { status: FAIL, reason: reason || "" };
  }

  function warn(reason) {
    return { status: WARN, reason: reason || "" };
  }

  async function assertPipelineHandled(text, opts) {
    opts = opts || {};
    const h = H();
    const before = opts.snapshotBefore ? opts.snapshotBefore(h) : null;
    const r = await h.pipelineRun(text);
    if (!r) return fail("No pipeline response");
    if (r.handled === false && !opts.allowUnhandled) {
      return fail("Pipeline not handled: " + text);
    }
    if (opts.requireOk && !r.ok) {
      return fail("Pipeline ok=false: " + (r.failureReason || r.message || text));
    }
    if (opts.requireVerified && r.verified === false && r.ok) {
      return warn("Pipeline ok but unverified");
    }
    if (opts.snapshotAfter && before !== null) {
      const after = opts.snapshotAfter(h);
      if (opts.requireChange && after === before) {
        return fail("State unchanged after: " + text);
      }
    }
    return pass();
  }

  async function assertIREResolves(text, opts) {
    opts = opts || {};
    const IRE = global.IntentResolutionEngine;
    if (!IRE || !IRE.resolve) return fail("IRE missing");
    const r = IRE.resolve(text, H().buildPipelineHooks());
    if (!r) return fail("IRE returned null");
    if (opts.expectExecute && r.decision !== "execute") {
      return fail("Expected execute, got " + r.decision + " (" + (r.reason || "") + ")");
    }
    if (opts.expectClarify && r.decision !== "clarify") {
      return fail("Expected clarify, got " + r.decision);
    }
    if (opts.target) {
      const actual = (r.selectedAction && r.selectedAction.target) || r.target;
      if (actual !== opts.target) {
        return fail("Expected target " + opts.target + ", got " + actual);
      }
    }
    return pass();
  }

  function assertModule(name, obj) {
    return obj ? pass() : fail("Module missing: " + name);
  }

  function assertHeroUrl() {
    const u = H().readHeroUrl();
    return u ? pass() : fail("Hero URL empty");
  }

  function assertAboutUrl() {
    const u = H().readAboutUrl();
    return u ? pass() : fail("About image URL empty");
  }

  function assertHeroTitle() {
    const t = H().readHeroTitle();
    return t ? pass() : fail("Hero title empty");
  }

  function assertEngineSelectsImage(kind, userText) {
    const IIE = global.ImageIntelligenceEngine;
    if (!IIE || !IIE.selectBest) return fail("IIE missing");
    const url = IIE.selectBest(kind || "hero", { userText: userText || "" });
    return url ? pass() : fail("IIE selectBest returned empty");
  }

  function assertEngineGeneratesText(context, userText) {
    const TIE = global.TextIntelligenceEngine;
    if (!TIE || !TIE.generate) return fail("TIE missing");
    return TIE.generate(context || "hero", userText || "test", { userText: userText || "" }).then(function (g) {
      const has =
        (g && g.title) ||
        (g && g.lead) ||
        (g && g.p1) ||
        (g && g.text) ||
        (g && g.label);
      return has ? pass() : fail("TIE generate empty");
    });
  }

  global.EasilyValidationAssert = {
    PASS: PASS,
    WARN: WARN,
    FAIL: FAIL,
    pass: pass,
    fail: fail,
    warn: warn,
    assertPipelineHandled: assertPipelineHandled,
    assertIREResolves: assertIREResolves,
    assertModule: assertModule,
    assertHeroUrl: assertHeroUrl,
    assertAboutUrl: assertAboutUrl,
    assertHeroTitle: assertHeroTitle,
    assertEngineSelectsImage: assertEngineSelectsImage,
    assertEngineGeneratesText: assertEngineGeneratesText,
  };
})(typeof window !== "undefined" ? window : globalThis);
