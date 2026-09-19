/**
 * GenerationTrace — diagnostisk provenance för canonical AI pipeline.
 * Innehåller inga kreativa beslut och förändrar aldrig designSpec/Blueprint.
 */
(function (global) {
  "use strict";

  const TRACE_VERSION = "1.0";
  const ARTIFACT_KEYS = Object.freeze([
    "creativeBrief",
    "creativeVision",
    "compositionPlan",
    "componentStrategyExecution",
    "blueprintBeforeGeometry",
    "geometryResolved",
    "renderManifest",
  ]);

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function createGenerationId() {
    try {
      if (global.crypto && typeof global.crypto.randomUUID === "function") {
        return "gen_" + global.crypto.randomUUID();
      }
    } catch (e) {
      /* deterministic shape fallback below */
    }
    return "gen_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 12);
  }

  function ensureStore(doc) {
    if (!doc.meta) doc.meta = {};
    if (!doc.meta.generationTrace || typeof doc.meta.generationTrace !== "object") {
      doc.meta.generationTrace = { version: TRACE_VERSION, activeGenerationId: "", generations: {} };
    }
    const store = doc.meta.generationTrace;
    store.version = TRACE_VERSION;
    if (!store.generations || typeof store.generations !== "object" || Array.isArray(store.generations)) {
      store.generations = {};
    }
    return store;
  }

  function beginDocument(doc, options) {
    options = options || {};
    const store = ensureStore(doc);
    const generationId = String(options.generationId || createGenerationId());
    if (store.generations[generationId]) return generationId;
    const now = new Date().toISOString();
    store.activeGenerationId = generationId;
    store.generations[generationId] = {
      traceVersion: TRACE_VERSION,
      generationId: generationId,
      source: String(options.source || "unknown"),
      status: "generating",
      createdAt: now,
      updatedAt: now,
      artifacts: {
        creativeBrief: clone(options.creativeBrief || null),
        creativeVision: null,
        compositionPlan: null,
        componentStrategyExecution: null,
        blueprintBeforeGeometry: null,
        geometryResolved: null,
        renderManifest: null,
      },
      persistence: { status: "pending", projectId: String(doc.meta.siteId || ""), draftRevision: null, error: "" },
    };
    return generationId;
  }

  function getTrace(doc, generationId) {
    const store = doc && doc.meta && doc.meta.generationTrace;
    const id = String(generationId || (store && store.activeGenerationId) || "");
    return store && store.generations ? store.generations[id] || null : null;
  }

  function createRenderManifest(doc, generationId, blueprint, resolvedDesignSpec) {
    return {
      generationId: String(generationId || ""),
      createPath: String(doc && doc.page && doc.page.createPath || ""),
      businessName: String(blueprint && blueprint.meta && blueprint.meta.businessName || ""),
      siteBlueprint: clone(blueprint),
      resolvedDesignSpec: clone(resolvedDesignSpec),
    };
  }

  function captureCanonicalArtifacts(doc, generationId, creativeBrief, concept, blueprint) {
    const trace = getTrace(doc, generationId);
    if (!trace) throw new Error("generation_trace_missing:" + generationId);
    const execution = concept && concept.execution;
    if (!execution) throw new Error("generation_trace_execution_missing:" + generationId);
    const resolver = global.BlueprintLayoutResolver;
    const resolvedDesignSpec = resolver && typeof resolver.resolveDesignSpec === "function"
      ? resolver.resolveDesignSpec(execution)
      : clone(execution);
    const artifacts = trace.artifacts;
    artifacts.creativeBrief = clone(creativeBrief);
    artifacts.creativeVision = clone(execution.creativeVision);
    artifacts.compositionPlan = clone(execution.compositionPlan);
    artifacts.componentStrategyExecution = {
      componentStrategy: clone(execution.componentStrategy || concept.componentStrategy || null),
      execution: clone(execution),
    };
    artifacts.blueprintBeforeGeometry = clone(blueprint);
    artifacts.geometryResolved = {
      siteBlueprint: clone(blueprint),
      resolvedDesignSpec: clone(resolvedDesignSpec),
      layoutResolution: clone(resolvedDesignSpec && resolvedDesignSpec.layoutResolution || null),
    };
    artifacts.renderManifest = createRenderManifest(doc, generationId, blueprint, resolvedDesignSpec);
    trace.status = "ready-to-persist";
    trace.updatedAt = new Date().toISOString();
    doc.meta.activeGenerationId = generationId;
    doc.meta.visibleGenerationId = generationId;
    doc.meta.generationCommitPending = generationId;
    return clone(trace);
  }

  function markPersisting(doc, generationId) {
    const trace = getTrace(doc, generationId);
    if (!trace) throw new Error("generation_trace_missing:" + generationId);
    trace.status = "persisting";
    trace.persistence.status = "persisting";
    trace.persistence.error = "";
    trace.updatedAt = new Date().toISOString();
  }

  function markPersisted(doc, generationId, result) {
    const trace = getTrace(doc, generationId);
    if (!trace) throw new Error("generation_trace_missing:" + generationId);
    trace.status = "persisted";
    trace.persistence.status = "persisted";
    trace.persistence.projectId = String(doc.meta && doc.meta.siteId || "");
    trace.persistence.draftRevision = result && result.draftRevision != null ? Number(result.draftRevision) : null;
    trace.persistence.persistedAt = String(result && result.updatedAt || new Date().toISOString());
    trace.persistence.error = "";
    trace.updatedAt = new Date().toISOString();
    doc.meta.persistedGenerationId = generationId;
  }

  function markPersistenceFailed(doc, generationId, error) {
    const trace = getTrace(doc, generationId);
    if (!trace) return;
    trace.status = "persistence-failed";
    trace.persistence.status = "failed";
    trace.persistence.error = String(error && (error.code || error.message) || error || "save_failed");
    trace.updatedAt = new Date().toISOString();
    if (doc.meta && doc.meta.previewGenerationId === generationId) delete doc.meta.previewGenerationId;
    if (doc.meta && doc.meta.generationCommitPending === generationId) delete doc.meta.generationCommitPending;
  }

  function verifyRenderManifest(doc, generationId, manifest) {
    const trace = getTrace(doc, generationId);
    if (!trace || trace.status !== "persisted") return { ok: false, reason: "generation_not_persisted" };
    const expected = trace.artifacts && trace.artifacts.renderManifest;
    if (!expected) return { ok: false, reason: "render_manifest_missing" };
    return JSON.stringify(expected) === JSON.stringify(manifest)
      ? { ok: true }
      : { ok: false, reason: "render_manifest_mismatch" };
  }

  function hasAllArtifacts(trace) {
    return !!trace && ARTIFACT_KEYS.every(function (key) {
      return trace.artifacts && trace.artifacts[key] != null;
    });
  }

  global.GenerationTrace = Object.freeze({
    TRACE_VERSION: TRACE_VERSION,
    ARTIFACT_KEYS: ARTIFACT_KEYS,
    createGenerationId: createGenerationId,
    beginDocument: beginDocument,
    getTrace: getTrace,
    captureCanonicalArtifacts: captureCanonicalArtifacts,
    createRenderManifest: createRenderManifest,
    markPersisting: markPersisting,
    markPersisted: markPersisted,
    markPersistenceFailed: markPersistenceFailed,
    verifyRenderManifest: verifyRenderManifest,
    hasAllArtifacts: hasAllArtifacts,
  });
})(typeof window !== "undefined" ? window : globalThis);
