/**
 * Project Isolation — ensures zero state leakage between website projects.
 *
 * Every new project MUST call beginNewProject() before the first render.
 * Every project switch MUST call resetEditingIntelligence() before loading the next document.
 */
(function (global) {
  "use strict";

  const LOG_TAG = "[Easily · isolation]";
  let currentDocumentProvisionPromise = null;

  function log(msg, detail) {
    try {
      console.info(LOG_TAG, msg, detail || "");
    } catch (e) {
      /* ignore */
    }
  }

  function cloneDocument(doc) {
    return JSON.parse(JSON.stringify(doc));
  }

  /** Remove cross-project intelligence meta that must never carry over. */
  function stripCrossProjectMeta(doc) {
    if (!doc || !doc.meta) return doc;
    delete doc.meta.designMemory;
    delete doc.meta.imageIntelligence;
    return doc;
  }

  function createIsolatedDocument(partial) {
    const AD = global.AppDocument;
    if (!AD) return partial ? cloneDocument(partial) : { page: {}, sections: {}, meta: {} };
    const normalized =
      partial && typeof AD.normalize === "function"
        ? AD.normalize(partial)
        : typeof AD.createDefaultDocument === "function"
          ? AD.createDefaultDocument()
          : partial || {};
    return stripCrossProjectMeta(cloneDocument(normalized));
  }

  function clearLocalDocumentCache() {
    const SS = global.SiteState;
    const key = SS && SS.STORAGE_KEY;
    if (!key) return;
    try {
      localStorage.removeItem(key);
    } catch (e) {
      /* ignore */
    }
  }

  function clearSessionProjectId() {
    const SS = global.SiteState;
    const key = SS && SS.SESSION_PROJECT_KEY;
    if (!key) return;
    try {
      sessionStorage.removeItem(key);
    } catch (e) {
      /* ignore */
    }
  }

  /** Reset in-memory editing intelligence — no document change. */
  function resetEditingIntelligence(opts) {
    opts = opts || {};
    const ES = global.EditSession;
    if (ES && typeof ES.resetSession === "function") {
      ES.resetSession();
    }

    const CP = global.EditCommandPipeline;
    if (CP && typeof CP.resetConversation === "function") {
      CP.resetConversation();
    }

    if (!opts.skipChatReset) {
      const SW = global.StudioWelcome;
      if (SW && typeof SW.resetChatState === "function") {
        SW.resetChatState();
      }
    }

    const HD = global.HeroImageDebug;
    if (HD && typeof HD.clear === "function") {
      HD.clear();
    }

    log("editing_intelligence_reset");
  }

  function clearPreviewDom() {
    const main = document.getElementById("siteMain");
    const footer = document.getElementById("siteFooter");
    if (main) main.replaceChildren();
    if (footer) footer.replaceChildren();
  }

  function setGeneratingNewWebsite(active) {
    if (active) {
      document.documentElement.dataset.studioCreateGeneration = "1";
      document.documentElement.dataset.studioPreviewPending = "1";
    } else {
      delete document.documentElement.dataset.studioCreateGeneration;
    }
  }

  function isGeneratingNewWebsite() {
    return document.documentElement.dataset.studioCreateGeneration === "1";
  }

  /**
   * Called synchronously when user starts a brand-new website generation.
   * Destroys preview, clears all project state, shows loading canvas only.
   */
  function prepareForNewGeneration(opts) {
    opts = opts || {};
    log("prepare_for_new_generation", { source: opts.source || "unknown" });

    const GL = global.GenerationLifecycle;
    if (GL && typeof GL.beginRun === "function") {
      GL.beginRun(opts.source || "prepare-generation");
    }
    if (GL && typeof GL.log === "function") {
      GL.log("START_GENERATION", { source: opts.source || "unknown" });
    }

    const EE = global.EditorEngine;
    if (EE && typeof EE.cancelPendingRemounts === "function") {
      EE.cancelPendingRemounts();
    }

    setGeneratingNewWebsite(true);

    if (!opts.skipBeginNewProject) {
      beginNewProject({
        source: opts.source || "prepare-generation",
        skipPreviewClear: true,
        keepSessionProjectId: opts.keepSessionProjectId,
      });
    } else {
      resetEditingIntelligence({ skipChatReset: opts.skipChatReset });
    }

    clearPreviewDom();

    const SW = global.StudioWelcome;
    if (SW && typeof SW.enterGenerationCanvas === "function") {
      SW.enterGenerationCanvas();
    }

    return global.SiteState && global.SiteState.get ? global.SiteState.get() : null;
  }

  function endNewGeneration() {
    setGeneratingNewWebsite(false);
    log("end_new_generation");
  }

  /**
   * Create a brand-new editor project with a fresh id, navigate to /editor/:id,
   * and isolate state before generation.
   * @returns {Promise<{ projectId: string, document: object }>}
   */
  async function beginNewEditorProject(opts) {
    opts = opts || {};
    const SS = global.SiteState;
    const AD = global.AppDocument;
    const name = String(opts.name || opts.brand || "Ny hemsida").trim().slice(0, 64) || "Ny hemsida";
    let projectId = "";

    if (global.SiteApi && typeof global.SiteApi.getApiBase === "function" && global.SiteApi.getApiBase()) {
      try {
        const d = AD && typeof AD.createDefaultDocument === "function" ? AD.createDefaultDocument() : {};
        const res = await global.SiteApi.createProject({ name: name, document: d });
        if (res && res.id) projectId = String(res.id).trim();
      } catch (e) {
        log("begin_new_editor_project_api_failed", e);
      }
    }

    if (!projectId) {
      try {
        projectId =
          typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
            ? crypto.randomUUID()
            : "local-" + Date.now().toString(36);
      } catch (e2) {
        projectId = "local-" + Date.now().toString(36);
      }
    }

    log("begin_new_editor_project", { projectId: projectId, source: opts.source || "unknown" });

    resetEditingIntelligence({ skipChatReset: opts.skipChatReset });
    clearLocalDocumentCache();
    clearSessionProjectId();

    const isolated = createIsolatedDocument(null);
    if (!isolated.meta) isolated.meta = {};
    isolated.meta.siteId = projectId;

    if (SS && typeof SS.replace === "function") {
      SS.replace(isolated);
      if (typeof SS.save === "function") SS.save();
      if (typeof SS.rememberLastProjectId === "function") SS.rememberLastProjectId(projectId);
    }

    resetEditorHistory(isolated);

    const EE = global.EditorEngine;
    if (EE && typeof EE.syncProjectUrl === "function") {
      EE.syncProjectUrl(projectId);
    } else if (global.STUDIO) {
      global.STUDIO.siteIdFromUrl = projectId;
      try {
        sessionStorage.setItem(SS && SS.SESSION_PROJECT_KEY ? SS.SESSION_PROJECT_KEY : "studioActiveProjectId", projectId);
      } catch (e3) {
        /* ignore */
      }
    }

    if (!opts.skipPreviewClear) clearPreviewDom();
    return { projectId: projectId, document: isolated };
  }

  /**
   * Give the already collected create-flow document a durable server project
   * without replacing or resetting it. This is intentionally provenance-only:
   * it does not alter the brief, creative decisions, blueprint or rendered DOM.
   *
   * @returns {Promise<{ projectId: string, document: object, created: boolean }>}
   */
  async function ensureCurrentDocumentProject(opts) {
    opts = opts || {};
    const SS = global.SiteState;
    const api = global.SiteApi;
    const current = SS && typeof SS.get === "function" ? SS.get() : null;
    const existingId = String(current && current.meta && current.meta.siteId || "").trim();
    if (existingId) {
      return { projectId: existingId, document: current, created: false };
    }
    if (currentDocumentProvisionPromise) return currentDocumentProvisionPromise;
    if (!current || !SS || typeof SS.patch !== "function") {
      throw new Error("generation_project_document_unavailable");
    }
    if (!api || typeof api.createProject !== "function" || !api.getApiBase || !api.getApiBase()) {
      throw new Error("generation_project_api_unavailable");
    }

    const snapshot = cloneDocument(current);
    const name = String(opts.name || opts.brand || "Ny hemsida").trim().slice(0, 64) || "Ny hemsida";
    currentDocumentProvisionPromise = (async function () {
      const res = await api.createProject({ name: name, document: snapshot });
      const projectId = String(res && res.id || "").trim();
      if (!projectId) throw new Error("generation_project_create_failed");

      SS.patch(function (doc) {
        if (!doc.meta) doc.meta = {};
        const competingId = String(doc.meta.siteId || "").trim();
        if (competingId && competingId !== projectId) {
          throw new Error("generation_project_identity_conflict");
        }
        doc.meta.siteId = projectId;
        if (res.slug) doc.meta.slug = String(res.slug);
        if (res.draftRevision != null) doc.meta.draftRevision = res.draftRevision;
        if (res.updatedAt) doc.meta.lastSyncedAt = res.updatedAt;
      });

      if (typeof SS.rememberLastProjectId === "function") SS.rememberLastProjectId(projectId);
      const EE = global.EditorEngine;
      if (EE && typeof EE.syncProjectUrl === "function") EE.syncProjectUrl(projectId);
      if (typeof SS.save === "function") SS.save();

      const attached = typeof SS.get === "function" ? SS.get() : null;
      if (EE && typeof EE.resetHistoryForDocument === "function") {
        EE.resetHistoryForDocument(attached);
      }
      log("ensure_current_document_project", { projectId: projectId, source: opts.source || "unknown" });
      return { projectId: projectId, document: attached, created: true };
    })();

    try {
      return await currentDocumentProvisionPromise;
    } finally {
      currentDocumentProvisionPromise = null;
    }
  }

  function resetEditorHistory(doc) {
    if (global.GreenfieldAdapter && typeof global.GreenfieldAdapter.restore === "function") {
      global.GreenfieldAdapter.restore();
    }
    const EE = global.EditorEngine;
    if (EE && typeof EE.resetHistoryForDocument === "function") {
      EE.resetHistoryForDocument(doc);
    }
  }

  /**
   * Full isolation for a brand-new project.
   * @param {object} opts
   * @param {object} [opts.document] — server/partial doc; omit for blank default
   * @param {string} [opts.source] — telemetry label
   * @param {boolean} [opts.keepSessionProjectId] — keep sessionStorage project id
   * @param {boolean} [opts.skipPreviewClear] — skip DOM preview wipe
   */
  function beginNewProject(opts) {
    opts = opts || {};
    log("begin_new_project", { source: opts.source || "unknown" });

    resetEditingIntelligence({ skipChatReset: opts.skipChatReset });
    clearLocalDocumentCache();
    if (!opts.keepSessionProjectId) {
      clearSessionProjectId();
    }

    const isolated = createIsolatedDocument(opts.document || null);
    const SS = global.SiteState;
    if (SS && typeof SS.replace === "function") {
      SS.replace(isolated);
      if (typeof SS.save === "function") {
        SS.save();
      }
    }

    if (!opts.skipPreviewClear) {
      clearPreviewDom();
    }

    resetEditorHistory(isolated);
    return isolated;
  }

  /**
   * Switch to a different existing project — reset intelligence, load doc, no localStorage bleed.
   */
  function switchToProject(document, opts) {
    opts = opts || {};
    log("switch_project", { source: opts.source || "unknown" });

    resetEditingIntelligence();
    const isolated = createIsolatedDocument(document);
    stripCrossProjectMeta(isolated);

    const SS = global.SiteState;
    if (SS && typeof SS.replace === "function") {
      SS.replace(isolated);
      if (typeof SS.save === "function") {
        SS.save();
      }
    }

    resetEditorHistory(isolated);
    return isolated;
  }

  /** Test helper — snapshot markers from current project for isolation assertions. */
  function captureProjectMarkers() {
    const SS = global.SiteState;
    const doc = SS && SS.get ? SS.get() : null;
    const ES = global.EditSession;
    const session = ES && ES.getSession ? ES.getSession() : null;
    const CP = global.EditCommandPipeline;
    const conv = CP && CP.getConversationContext ? CP.getConversationContext() : null;
    return {
      heroUrl: doc && doc.page ? String(doc.page.heroBgUrl || "") : "",
      heroTitle:
        doc && doc.sections && doc.sections.hero && doc.sections.hero.content
          ? String(doc.sections.hero.content["hero-title"] || "")
          : "",
      designColor: doc && doc.page ? String(doc.page.designColorSetId || "") : "",
      designMemory: doc && doc.meta && doc.meta.designMemory ? cloneDocument(doc.meta.designMemory) : null,
      imageIntelligence:
        doc && doc.meta && doc.meta.imageIntelligence ? cloneDocument(doc.meta.imageIntelligence) : null,
      aboutUrl:
        doc && doc.sections && doc.sections.about ? String(doc.sections.about.imageUrl || "") : "",
      acceptedLocks: session && session.acceptedLocks ? cloneDocument(session.acceptedLocks) : {},
      pendingVerification: session && session.pendingVerification ? true : false,
      pipelinePending: conv && conv.pending ? true : false,
      onboardingDescription: doc && doc.page ? String(doc.page.onboardingDescription || "") : "",
    };
  }

  global.ProjectIsolation = {
    beginNewProject: beginNewProject,
    beginNewEditorProject: beginNewEditorProject,
    ensureCurrentDocumentProject: ensureCurrentDocumentProject,
    switchToProject: switchToProject,
    resetEditingIntelligence: resetEditingIntelligence,
    prepareForNewGeneration: prepareForNewGeneration,
    endNewGeneration: endNewGeneration,
    isGeneratingNewWebsite: isGeneratingNewWebsite,
    createIsolatedDocument: createIsolatedDocument,
    stripCrossProjectMeta: stripCrossProjectMeta,
    clearLocalDocumentCache: clearLocalDocumentCache,
    clearPreviewDom: clearPreviewDom,
    captureProjectMarkers: captureProjectMarkers,
  };
})(typeof window !== "undefined" ? window : globalThis);
