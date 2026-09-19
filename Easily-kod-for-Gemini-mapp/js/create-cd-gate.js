/**
 * Feature gate för Creative Director create-vägen (implementeringsplan 1.1, steg 0).
 * Nya webbplatser skapas alltid genom V2 (Brief → fri scen → dum kompilator).
 * Äldre blueprint/CD-dokument kan fortfarande öppnas, men de är aldrig
 * standardvägen för en ny generering.
 */
(function (global) {
  "use strict";

  const STORAGE_KEY = "easilyCdCreate";
  const URL_PARAM = "cdCreate";
  const BLUEPRINT_STORAGE_KEY = "easilyBlueprintCreate";
  const BLUEPRINT_URL_PARAM = "blueprintCreate";
  const QUESTION_ENGINE_STORAGE_KEY = "easilyQuestionEngine";
  const QUESTION_ENGINE_URL_PARAM = "questionEngine";
  const CD_NOT_READY = "cd_create_not_ready";

  function readBlueprintFromUrl() {
    try {
      const q = new URLSearchParams(global.location.search);
      const v = q.get(BLUEPRINT_URL_PARAM);
      if (v === "1" || v === "true") return true;
      if (v === "0" || v === "false") return false;
    } catch (eUrl) {
      /* ignore */
    }
    return null;
  }

  function isBlueprintEnabled() {
    return false;
  }

  function isV2Enabled() {
    return true;
  }

  function readGateFromUrl() {
    try {
      const q = new URLSearchParams(global.location.search);
      const v = q.get(URL_PARAM);
      if (v === "1" || v === "true") return true;
      if (v === "0" || v === "false") return false;
    } catch (eUrl) {
      /* ignore */
    }
    return null;
  }

  function isEnabled() {
    const fromUrl = readGateFromUrl();
    if (fromUrl !== null) return fromUrl;
    try {
      return global.localStorage.getItem(STORAGE_KEY) === "1";
    } catch (eStorage) {
      return false;
    }
  }

  function isQuestionEngineEnabled() {
    // Femstegsflödet ägs alltid av Question Engine. URL/localStorage får inte
    // längre växla tillbaka till den parallella welcome-generatorn.
    return true;
  }

  function getCreatePath() {
    return "v2";
  }

  function enrichContext(ctx) {
    if (!ctx || typeof ctx !== "object") return ctx;
    ctx.createPath = getCreatePath();
    ctx.v2CreateEnabled = true;
    ctx.blueprintCreateEnabled = false;
    ctx.creativeDirectorCreateEnabled = false;
    return ctx;
  }

  function isBlueprintPath(ctx) {
    if (ctx && ctx.blueprintCreateEnabled === true) return true;
    if (ctx && ctx.createPath === "blueprint") return true;
    return false;
  }

  function isBlueprintPathActive(doc, ctx) {
    if (isBlueprintPath(ctx)) return true;
    if (doc && doc.meta && doc.meta.blueprintCreateEnabled === true) return true;
    if (doc && doc.page && doc.page.createPath === "blueprint") return true;
    return false;
  }

  function isV2Path(ctx) {
    return !!(ctx && (ctx.v2CreateEnabled === true || ctx.createPath === "v2"));
  }

  function isV2PathActive(doc, ctx) {
    return isV2Path(ctx) || !!(doc && doc.page && doc.page.createPath === "v2");
  }

  /** Legacy executor-väg — endast befintliga dokument med createPath cd. */
  function isCdPath(ctx) {
    if (ctx && ctx.creativeDirectorCreateEnabled === true) return true;
    if (ctx && ctx.createPath === "cd") return true;
    return false;
  }

  function isCdPathActive(doc, ctx) {
    if (isCdPath(ctx)) return true;
    if (doc && doc.meta && doc.meta.creativeDirectorCreateEnabled === true) return true;
    if (doc && doc.page && doc.page.createPath === "cd") return true;
    return false;
  }

  function isLegacyPath(doc, ctx) {
    return !isV2PathActive(doc, ctx) && !isBlueprintPathActive(doc, ctx) && !isCdPathActive(doc, ctx);
  }

  function createNotReadyError(detail) {
    const err = new Error(CD_NOT_READY);
    err.code = CD_NOT_READY;
    err.detail =
      detail ||
      "Creative Director create path is active but not ready (implementation steps 1–7 pending).";
    return err;
  }

  /** Blueprint render-state — läser siteBlueprint, inte legacy. */
  function isBlueprintRenderPage(page) {
    if (!page || typeof page !== "object") return false;
    if (page.createPath === "blueprint") return true;
    if (page.blueprintLocked === true) return true;
    return false;
  }

  /** CD render-state — inte legacy-identitet (designFamily, industry, SCE). */
  function isCdRenderPage(page) {
    if (!page || typeof page !== "object") return false;
    if (page.createPath === "cd") return true;
    if (page.cdDesignLocked === true) return true;
    return false;
  }

  /** Ta bort legacy-identitetsfält som default-dokumentet annars bär in. */
  function purgeLegacyIdentityFields(page) {
    if (!page || typeof page !== "object") return page;
    delete page.template;
    delete page.theme;
    delete page.layoutEngine;
    delete page.layoutSpec;
    delete page.designFamily;
    delete page.designColorSetId;
    page.industry = "";
    delete page.designArchetype;
    delete page.designIntent;
    delete page.designRationale;
    delete page.artDirectorBrief;
    delete page.artDirectorReview;
    delete page.designSuitabilityReview;
    delete page.siteComposition;
    delete page.visualDesignFingerprint;
    delete page.createDesignStyle;
    delete page.createDesignStyleFamily;
    delete page.imageStyle;
    return page;
  }

  global.CreateCdGate = {
    STORAGE_KEY: STORAGE_KEY,
    URL_PARAM: URL_PARAM,
    BLUEPRINT_STORAGE_KEY: BLUEPRINT_STORAGE_KEY,
    BLUEPRINT_URL_PARAM: BLUEPRINT_URL_PARAM,
    QUESTION_ENGINE_STORAGE_KEY: QUESTION_ENGINE_STORAGE_KEY,
    QUESTION_ENGINE_URL_PARAM: QUESTION_ENGINE_URL_PARAM,
    CD_NOT_READY: CD_NOT_READY,
    isEnabled: isEnabled,
    isV2Enabled: isV2Enabled,
    isBlueprintEnabled: isBlueprintEnabled,
    isQuestionEngineEnabled: isQuestionEngineEnabled,
    getCreatePath: getCreatePath,
    enrichContext: enrichContext,
    isCdPath: isCdPath,
    isV2Path: isV2Path,
    isBlueprintPath: isBlueprintPath,
    isCdPathActive: isCdPathActive,
    isV2PathActive: isV2PathActive,
    isBlueprintPathActive: isBlueprintPathActive,
    isLegacyPath: isLegacyPath,
    isCdRenderPage: isCdRenderPage,
    isBlueprintRenderPage: isBlueprintRenderPage,
    purgeLegacyIdentityFields: purgeLegacyIdentityFields,
    createNotReadyError: createNotReadyError,
  };
})(typeof window !== "undefined" ? window : globalThis);
