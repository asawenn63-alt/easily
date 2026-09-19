/**

 * Generation lifecycle — trace data flow from create click to rendered DOM.

 * Pipeline stages log INPUT / OUTPUT / VALIDATION at each step.

 */

(function (global) {

  "use strict";



  const LOG_TAG = "[Easily · generation]";

  const LEGACY_STAGES = [

    "START_GENERATION",

    "DOCUMENT_CREATED",

    "STATE_UPDATED",

    "PREVIEW_UPDATED",

    "DOM_RENDERED",

  ];



  const PIPELINE_STAGES = [

    "BUSINESS_BRIEF",

    "INTENT",

    "SITE_GENERATION",

    "IMAGE_INTELLIGENCE",

    "TEXT_INTELLIGENCE",

    "COMPANY_IDENTITY",

    "PLACEHOLDER_REPLACEMENT",

    "FINAL_RENDER",

    "FINAL_VALIDATION",

    "ART_DIRECTOR_SCORE",

    "CD_CREATE_PATH",

    "CREATIVE_DIRECTOR",

    "CD_COMPOSITION",

    "CD_EXECUTOR_GUARD",

    "CD_IMAGES",

  ];



  const STAGES = LEGACY_STAGES.concat(PIPELINE_STAGES);



  let lastRun = null;

  function createGenerationId() {
    const trace = global.GenerationTrace;
    if (trace && typeof trace.createGenerationId === "function") return trace.createGenerationId();
    try {
      if (global.crypto && typeof global.crypto.randomUUID === "function") return "gen_" + global.crypto.randomUUID();
    } catch (e) { /* fallback below */ }
    return "gen_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 12);
  }



  function beginRun(source) {

    lastRun = {

      generationId: createGenerationId(),

      source: source || "unknown",

      startedAt: Date.now(),

      stages: [],

      pipeline: [],

    };

    return lastRun;

  }

  function getGenerationId() {
    return lastRun && lastRun.generationId ? lastRun.generationId : "";
  }



  function log(stage, detail) {

    if (STAGES.indexOf(stage) < 0) {

      console.warn(LOG_TAG, "unknown stage", stage);

    }

    const entry = {

      stage: stage,

      at: Date.now(),

      detail: detail || null,

    };

    if (!lastRun) beginRun("implicit");

    lastRun.stages.push(entry);

    try {

      console.info(LOG_TAG, stage, detail || "");

    } catch (e) {

      /* ignore */

    }

    try {

      document.dispatchEvent(

        new CustomEvent("easily:generation-lifecycle", {

          detail: { stage: stage, detail: detail || null, run: lastRun },

        }),

      );

    } catch (e2) {

      /* ignore */

    }

  }



  /**

   * Log a pipeline stage with INPUT, OUTPUT, VALIDATION.

   * @param {string} stage — one of PIPELINE_STAGES

   * @param {{ input?: *, output?: *, validation?: { ok: boolean, reason?: string, failures?: *[] } }} payload

   */

  function logPipelineStage(stage, payload) {

    payload = payload || {};

    const entry = {

      stage: stage,

      at: Date.now(),

      input: payload.input != null ? payload.input : null,

      output: payload.output != null ? payload.output : null,

      validation: payload.validation || { ok: true },

    };

    if (!lastRun) beginRun("implicit");

    if (!lastRun.pipeline) lastRun.pipeline = [];

    lastRun.pipeline.push(entry);

    log(stage, {

      INPUT: entry.input,

      OUTPUT: entry.output,

      VALIDATION: entry.validation,

    });

    return entry;

  }



  function getLastRun() {

    return lastRun ? JSON.parse(JSON.stringify(lastRun)) : null;

  }



  function hasStage(stage) {

    return !!(

      lastRun &&

      lastRun.stages.some(function (s) {

        return s.stage === stage;

      })

    );

  }



  function firstMissingStage() {

    for (let i = 0; i < LEGACY_STAGES.length; i++) {

      if (!hasStage(LEGACY_STAGES[i])) return LEGACY_STAGES[i];

    }

    return null;

  }



  function firstFailedPipelineStage() {

    if (!lastRun || !lastRun.pipeline) return null;

    for (let i = 0; i < lastRun.pipeline.length; i++) {

      const v = lastRun.pipeline[i].validation;

      if (v && v.ok === false) return lastRun.pipeline[i].stage;

    }

    return null;

  }



  global.GenerationLifecycle = {

    STAGES: STAGES,

    LEGACY_STAGES: LEGACY_STAGES,

    PIPELINE_STAGES: PIPELINE_STAGES,

    beginRun: beginRun,

    getGenerationId: getGenerationId,

    log: log,

    logPipelineStage: logPipelineStage,

    getLastRun: getLastRun,

    hasStage: hasStage,

    firstMissingStage: firstMissingStage,

    firstFailedPipelineStage: firstFailedPipelineStage,

  };

})(typeof window !== "undefined" ? window : globalThis);

