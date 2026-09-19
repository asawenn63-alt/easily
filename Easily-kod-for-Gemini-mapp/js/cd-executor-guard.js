/**
 * Executor guards — förbjudna kreativa källor och briefLocked (plan 1.1, steg 1).
 */
(function (global) {
  "use strict";

  const CD_BRIEF_NOT_LOCKED = "cd_brief_not_locked";
  const CD_FORBIDDEN_CREATIVE_SOURCE = "cd_forbidden_creative_source";
  const CD_INVALID_BRIEF_STATE = "cd_invalid_brief_state";

  /** Maskinellt kontrakt — förbjudna kreativa källor (P21). */
  const FORBIDDEN_CREATIVE_SOURCES = Object.freeze({
    onboardingDescription: {
      id: "onboardingDescription",
      label: "onboardingDescription / createBusinessBrief (kreativ input)",
    },
    createBusinessBrief: {
      id: "createBusinessBrief",
      label: "createBusinessBrief (kreativ input)",
    },
    artDirectorBrief: {
      id: "artDirectorBrief",
      label: "page.artDirectorBrief / composition.artDirector",
    },
    toGenerationBrief: {
      id: "toGenerationBrief",
      label: "SiteCompositionEngine.toGenerationBrief()",
    },
    pack: {
      id: "pack",
      label: "AISiteBuilder.pack() / branschmallar",
    },
    createDesignStyle: {
      id: "createDesignStyle",
      label: "UI createDesignStyle / createDesignStyleFamily (kreativ input)",
    },
    siteComposition: {
      id: "siteComposition",
      label: "page.siteComposition / designArchetype (identitetskälla)",
    },
    resolveBusinessPlan: {
      id: "resolveBusinessPlan",
      label: "resolveBusinessPlan() (kreativ CTA/resa-källa)",
    },
    buildCtaPlan: {
      id: "buildCtaPlan",
      label: "buildCtaPlan() (kreativ CTA/resa-källa)",
    },
    buildArtDirectorBrief: {
      id: "buildArtDirectorBrief",
      label: "buildArtDirectorBrief()",
    },
    buildPlanCompositionPreview: {
      id: "buildPlanCompositionPreview",
      label: "CreateBuildPlan.toGenerationText() kompositions-/SCE-preview",
    },
    pageCreateSections: {
      id: "pageCreateSections",
      label: "page.createSections / createBuildPlan.sections (scope ska läsas från brief.scope)",
    },
  });

  /** Executors som kräver briefLocked på CD-väg (steg 5+ använder samma lista). */
  const EXECUTORS_REQUIRING_BRIEF = Object.freeze([
    "composition",
    "hero-copy",
    "about-copy",
    "services-copy",
    "gallery-copy",
    "faq-copy",
    "booking-copy",
    "contact-copy",
    "design",
    "images",
    "text",
  ]);

  function gate() {
    return global.CreateCdGate;
  }

  function briefState() {
    return global.CreativeBriefState;
  }

  function isCdPathActive(doc, ctx) {
    const CDG = gate();
    if (CDG && typeof CDG.isCdPathActive === "function") {
      return CDG.isCdPathActive(doc, ctx);
    }
    return false;
  }

  function getCompositionInputContract() {
    const CBC = global.CreativeBriefContract;
    return CBC && CBC.COMPOSITION_INPUT_CONTRACT ? CBC.COMPOSITION_INPUT_CONTRACT : null;
  }

  function createGuardError(code, detail, extra) {
    const err = new Error(code);
    err.code = code;
    err.detail = detail || code;
    if (extra) Object.assign(err, extra);
    return err;
  }

  function assertForbiddenCreativeSource(sourceId, executorId) {
    if (!sourceId || !FORBIDDEN_CREATIVE_SOURCES[sourceId]) return;
    const src = FORBIDDEN_CREATIVE_SOURCES[sourceId];
    throw createGuardError(
      CD_FORBIDDEN_CREATIVE_SOURCE,
      "Forbidden creative source on CD path: " + src.label,
      { sourceId: sourceId, executorId: executorId || null },
    );
  }

  function traceForbiddenCreativeRead(sourceId, executorId, doc) {
    if (!isCdPathActive(doc)) return;
    assertForbiddenCreativeSource(sourceId, executorId);
  }

  function requireBriefLocked(doc, executorId) {
    if (!isCdPathActive(doc)) return;
    const CBS = briefState();
    if (CBS && typeof CBS.isBriefLocked === "function" && CBS.isBriefLocked(doc)) return;
    throw createGuardError(
      CD_BRIEF_NOT_LOCKED,
      "Executor " + String(executorId || "unknown") + " requires briefLocked on CD path",
      { executorId: executorId || null },
    );
  }

  function validatePageStateOrThrow(doc) {
    const CBS = briefState();
    if (!CBS || typeof CBS.validatePageState !== "function") return;
    if (!isCdPathActive(doc)) return;
    const v = CBS.validatePageState(doc);
    if (!v.ok) {
      throw createGuardError(
        CD_INVALID_BRIEF_STATE,
        "Invalid CD page state: " + v.errors.join(", "),
        { stateErrors: v.errors },
      );
    }
  }

  /**
   * Enda tillåtna kreativa läsning på CD-väg.
   * @returns {object} creativeBrief
   */
  function readAllowedCreativeBrief(doc, executorId) {
    requireBriefLocked(doc, executorId);
    validatePageStateOrThrow(doc);
    const CBS = briefState();
    const brief = CBS && typeof CBS.getCreativeBrief === "function" ? CBS.getCreativeBrief(doc) : null;
    if (!brief) {
      throw createGuardError(CD_BRIEF_NOT_LOCKED, "creativeBrief missing while briefLocked", {
        executorId: executorId || null,
      });
    }
    return brief;
  }

  /**
   * @returns {{ ok: boolean, code?: string, message?: string }}
   */
  function canExecutorStart(executorId, doc) {
    if (!isCdPathActive(doc)) {
      return { ok: true, skipped: true, reason: "legacy_path" };
    }
    try {
      validatePageStateOrThrow(doc);
      if (EXECUTORS_REQUIRING_BRIEF.indexOf(executorId) !== -1) {
        requireBriefLocked(doc, executorId);
      }
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        code: err.code || err.message,
        message: err.detail || err.message,
      };
    }
  }

  function guardExecutor(executorId, doc, runFn) {
    if (!isCdPathActive(doc)) {
      return typeof runFn === "function" ? runFn() : undefined;
    }
    validatePageStateOrThrow(doc);
    if (EXECUTORS_REQUIRING_BRIEF.indexOf(executorId) !== -1) {
      requireBriefLocked(doc, executorId);
    }
    return typeof runFn === "function" ? runFn(readAllowedCreativeBrief(doc, executorId)) : undefined;
  }

  global.CdExecutorGuard = {
    CD_BRIEF_NOT_LOCKED: CD_BRIEF_NOT_LOCKED,
    CD_FORBIDDEN_CREATIVE_SOURCE: CD_FORBIDDEN_CREATIVE_SOURCE,
    CD_INVALID_BRIEF_STATE: CD_INVALID_BRIEF_STATE,
    FORBIDDEN_CREATIVE_SOURCES: FORBIDDEN_CREATIVE_SOURCES,
    getCompositionInputContract: getCompositionInputContract,
    EXECUTORS_REQUIRING_BRIEF: EXECUTORS_REQUIRING_BRIEF,
    isCdPathActive: isCdPathActive,
    assertForbiddenCreativeSource: assertForbiddenCreativeSource,
    traceForbiddenCreativeRead: traceForbiddenCreativeRead,
    requireBriefLocked: requireBriefLocked,
    validatePageStateOrThrow: validatePageStateOrThrow,
    readAllowedCreativeBrief: readAllowedCreativeBrief,
    canExecutorStart: canExecutorStart,
    guardExecutor: guardExecutor,
    createGuardError: createGuardError,
  };
})(typeof window !== "undefined" ? window : globalThis);
