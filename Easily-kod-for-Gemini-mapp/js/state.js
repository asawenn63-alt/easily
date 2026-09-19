/**
 * SiteState — autosave, dokument-version, redo/undo-vänlig klon.
 * Lokal cache (localStorage) + synk mot backend via POST /api/projects/:id/save
 * (payload: SiteState.serializeForApi() eller { document }).
 */
(function (global) {
  "use strict";

  const STORAGE_KEY = "ai-site-studio-document-v1";
  const STORAGE_LEGACY_V2 = "ai-site-studio-state-v2";
  const LAST_PROJECT_KEY = "easily-last-project-id";
  const SESSION_PROJECT_KEY = "studioActiveProjectId";
  const DEFAULT_HERO_TITLE = "Tydligt erbjudande i en mening";

  let doc = null;
  let apiSaveTimer = null;
  let apiSavePending = false;
  let remoteSaveChain = Promise.resolve();

  function get() {
    return doc ? JSON.parse(JSON.stringify(doc)) : null;
  }

  function replace(next) {
    const v = global.AppDocument?.normalize ? global.AppDocument.normalize(next) : next;
    if (global.ImageApply && typeof global.ImageApply.migrateBlockedImages === "function") {
      global.ImageApply.migrateBlockedImages(v);
    }
    doc = v;
    applyPageToBody();
  }

  function patch(mutator) {
    const clone = get();
    mutator(clone);
    replace(clone);
  }

  function applyPageToBody() {
    if (!doc || !doc.page) return;
    if (doc.page.createPath === "v2") {
      document.body.removeAttribute("data-theme");
      document.body.removeAttribute("data-template");
      document.body.removeAttribute("data-industry");
      document.body.setAttribute("data-create-path", "v2");
      return;
    }
    document.body.removeAttribute("data-create-path");
    if (global.DesignFamilies && typeof global.DesignFamilies.applyToPreviewDOM === "function") {
      global.DesignFamilies.applyToPreviewDOM(doc.page);
      return;
    }
    const p = doc.page;
    const CDG = global.CreateCdGate;
    const cdRender = CDG && typeof CDG.isCdRenderPage === "function" && CDG.isCdRenderPage(p);
    document.body.setAttribute("data-theme", p.theme || "minimal-white");
    document.body.setAttribute("data-template", p.template || "editorial");
    if (cdRender) document.body.removeAttribute("data-industry");
    else document.body.setAttribute("data-industry", p.industry || "verksamhet");
  }

  function hasRemoteProject() {
    const id = doc?.meta?.siteId;
    return !!(id && global.SiteApi && global.SiteApi.getApiBase && global.SiteApi.getApiBase());
  }

  function writeLocalCache() {
    if (global.AppDocument?.touchMeta && doc) global.AppDocument.touchMeta(doc);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(doc));
    if (doc?.meta?.siteId) rememberLastProjectId(doc.meta.siteId);
  }

  function performRemoteSave(options) {
    options = options || {};
    if (!hasRemoteProject()) {
      if (options.expectedGenerationId) throw new Error("generation_persistence_unavailable");
      return Promise.resolve({ ok: true, localOnly: true });
    }
    const id = doc.meta.siteId;
    const envelope = global.SiteState.serializeForApi ? global.SiteState.serializeForApi() : { document: get() };
    const sentGenerationId = String(envelope.document?.meta?.visibleGenerationId || "");
    if (options.expectedGenerationId && sentGenerationId !== String(options.expectedGenerationId)) {
      throw new Error("generation_save_snapshot_mismatch");
    }
    if (global.ProjectThumbnail && typeof global.ProjectThumbnail.buildSvg === "function") {
      try {
        var svg = global.ProjectThumbnail.buildSvg(global.SiteState.get());
        if (svg) envelope.thumbnailSvg = svg;
      } catch (eTh) {
        console.warn("SiteState thumbnail", eTh);
      }
    }
    return global.SiteApi.saveProject(id, envelope).then(function (res) {
      if (options.expectedGenerationId && String(res?.generationId || "") !== String(options.expectedGenerationId)) {
        throw new Error("generation_save_ack_mismatch");
      }
      if (!res || res.draftRevision == null || !doc) return;
      try {
        global.SiteState.patch(function (d) {
          if (!d.meta) d.meta = {};
          d.meta.draftRevision = res.draftRevision;
          if (res.updatedAt) d.meta.lastSyncedAt = res.updatedAt;
        });
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(global.SiteState.get()));
        } catch (e2) {
          console.warn("SiteState local cache efter server-save", e2);
        }
      } catch (e) {
        console.warn("SiteState flushRemoteSave meta sync", e);
      }
      return res;
    });
  }

  function flushRemoteSave(options) {
    options = options || {};
    const task = remoteSaveChain.then(function () { return performRemoteSave(options); });
    remoteSaveChain = task.catch(function () {});
    if (options.throwOnError) return task;
    return task.catch(function (e) {
      console.warn("SiteState remote save", e);
      return { ok: false, error: String(e?.message || e) };
    });
  }

  async function persistGeneration(generationId) {
    const id = String(generationId || "");
    if (!id || !global.GenerationTrace) throw new Error("generation_trace_unavailable");
    clearTimeout(apiSaveTimer);
    apiSaveTimer = null;
    apiSavePending = false;
    try {
      patch(function (d) { global.GenerationTrace.markPersisting(d, id); });
      writeLocalCache();
      const result = await flushRemoteSave({ throwOnError: true, expectedGenerationId: id });
      patch(function (d) { global.GenerationTrace.markPersisted(d, id, result); });
      writeLocalCache();
      return result;
    } catch (error) {
      patch(function (d) { global.GenerationTrace.markPersistenceFailed(d, id, error); });
      try { writeLocalCache(); } catch (cacheError) { console.warn("SiteState generation failure cache", cacheError); }
      throw error;
    }
  }

  function scheduleRemoteSave() {
    if (!hasRemoteProject()) return;
    apiSavePending = true;
    clearTimeout(apiSaveTimer);
    apiSaveTimer = setTimeout(function () {
      apiSaveTimer = null;
      if (!apiSavePending) return;
      apiSavePending = false;
      flushRemoteSave();
    }, 900);
  }

  function rememberLastProjectId(id) {
    if (!id) return;
    const trimmed = String(id).trim();
    try {
      localStorage.setItem(LAST_PROJECT_KEY, trimmed);
    } catch (e) {
      /* ignore */
    }
    try {
      sessionStorage.setItem(SESSION_PROJECT_KEY, trimmed);
    } catch (e2) {
      /* ignore */
    }
    if (global.STUDIO) global.STUDIO.siteIdFromUrl = trimmed;
  }

  function getSessionProjectId() {
    try {
      return (sessionStorage.getItem(SESSION_PROJECT_KEY) || "").trim();
    } catch (e) {
      return "";
    }
  }

  function isNewSiteRequest() {
    if (global.STUDIO && global.STUDIO.isNewSiteRequest) return true;
    try {
      return new URL(window.location.href).searchParams.get("new") === "1";
    } catch (e) {
      return false;
    }
  }

  function hasExplicitProjectInUrl() {
    return !!(global.STUDIO && String(global.STUDIO.siteIdFromUrl || "").trim());
  }

  function loadBlankStudioDocument() {
    if (global.ProjectIsolation && typeof global.ProjectIsolation.beginNewProject === "function") {
      global.ProjectIsolation.beginNewProject({ source: "studio-blank", skipPreviewClear: true });
      return;
    }
    replace(global.AppDocument.createDefaultDocument());
  }

  function isResumeableDocument(d) {
    if (!d || typeof d !== "object") return false;
    if (d.meta && d.meta.siteId) return true;
    if (String(d.page?.onboardingDescription || "").trim()) return true;
    const ht = d.sections?.hero?.content?.["hero-title"];
    if (ht && String(ht).trim() && ht !== DEFAULT_HERO_TITLE) return true;
    return false;
  }

  function save() {
    try {
      writeLocalCache();
    } catch (e) {
      console.warn("SiteState.save", e);
    }
    scheduleRemoteSave();
  }

  /**
   * Samma JSON som kan POST:as till API (webb + ev. publicerad HTML genereras server-side).
   * @param {{ client?: string }} [opts]
   */
  function serializeForApi(opts) {
    if (!doc) return { apiVersion: 1, document: null, error: "no-document" };
    const payload = global.AppDocument?.toExportPayload ? global.AppDocument.toExportPayload(doc) : JSON.parse(JSON.stringify(doc));
    return {
      apiVersion: 1,
      client: opts?.client || "ai-site-studio-web",
      sentAt: new Date().toISOString(),
      document: payload,
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const merged = global.AppDocument?.normalize ? global.AppDocument.normalize(parsed) : parsed;
        const v = global.AppDocument?.validate?.(merged);
        if (v && v.ok) {
          replace(merged);
          return true;
        }
      }
      if (localStorage.getItem(STORAGE_LEGACY_V2)) {
        console.info("SiteState: v2 snapshot finns kvar — används inte. Ny dokumentmodell (v1) laddas.");
      }
    } catch (e) {
      console.warn("SiteState.load", e);
    }
    replace(global.AppDocument.createDefaultDocument());
    return false;
  }

  async function applyServerProject(p, data) {
    const merged = global.AppDocument?.normalize ? global.AppDocument.normalize(p.document) : p.document;
    if (!merged.meta) merged.meta = {};
    merged.meta.siteId = p.id;
    merged.meta.slug = p.slug || merged.meta.slug;
    if (data.publishedRevision != null) merged.meta.publishedRevision = data.publishedRevision;
    if (data.publishedAt) merged.meta.publishedAt = data.publishedAt;
    replace(merged);
    rememberLastProjectId(p.id);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    } catch (e2) {
      /* ignore */
    }
  }

  async function tryLoadProjectFromServer(id) {
    const data = await global.SiteApi.getProject(id);
    const p = data.project;
    if (p && p.document) {
      await applyServerProject(p, data);
      return true;
    }
    return false;
  }

  function tryLoadLocalResumeForProject(id) {
    if (!id) return false;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      const merged = global.AppDocument?.normalize ? global.AppDocument.normalize(parsed) : parsed;
      if (String(merged?.meta?.siteId || "").trim() !== String(id).trim()) return false;
      const v = global.AppDocument?.validate?.(merged);
      if (v && v.ok && isResumeableDocument(merged)) {
        replace(merged);
        rememberLastProjectId(id);
        return true;
      }
    } catch (e) {
      console.warn("hydrateFromUrl local project", e);
    }
    return false;
  }

  function tryLoadLocalResume() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      const merged = global.AppDocument?.normalize ? global.AppDocument.normalize(parsed) : parsed;
      const v = global.AppDocument?.validate?.(merged);
      if (v && v.ok && isResumeableDocument(merged)) {
        replace(merged);
        if (merged.meta?.siteId) rememberLastProjectId(merged.meta.siteId);
        return true;
      }
    } catch (e) {
      console.warn("hydrateFromUrl local", e);
    }
    return false;
  }

  async function autoResumeLatestProject() {
    if (!global.SiteApi?.getApiBase?.()) return false;
    try {
      let lastId = "";
      try {
        lastId = (localStorage.getItem(LAST_PROJECT_KEY) || "").trim();
      } catch (e0) {
        /* ignore */
      }
      if (lastId) {
        try {
          if (await tryLoadProjectFromServer(lastId)) return true;
        } catch (e1) {
          console.warn("hydrateFromUrl last project", e1);
        }
      }
      const list = await global.SiteApi.listProjects();
      const projects = (list && list.projects) || [];
      if (projects.length > 0) {
        return await tryLoadProjectFromServer(projects[0].id);
      }
    } catch (e2) {
      console.warn("hydrateFromUrl auto-resume", e2);
    }
    return false;
  }

  /**
   * Laddar publicerad vy eller projekt från server före första render.
   * Anropas från editor-engine init (async).
   */
  async function hydrateFromUrl() {
    const ST = global.STUDIO || {};
    const urlProjectId = String(ST.siteIdFromUrl || "").trim();

    if (ST.isPublicView && ST.publicSlug) {
      if (!global.SiteApi?.getApiBase?.()) {
        console.warn("Public vy kräver ?api= eller sparad API-bas.");
        loadBlankStudioDocument();
        return;
      }
      try {
        const data = await global.SiteApi.fetchPublicDocument(ST.publicSlug);
        const d = data.document;
        const merged = global.AppDocument?.normalize ? global.AppDocument.normalize(d) : d;
        replace(merged);
        document.body.setAttribute("data-studio-mode", "readonly");
        return;
      } catch (e) {
        console.warn("hydrateFromUrl public", e);
        loadBlankStudioDocument();
        return;
      }
    }

    if (isNewSiteRequest()) {
      try {
        sessionStorage.removeItem(SESSION_PROJECT_KEY);
      } catch (eRm) {
        /* ignore */
      }
      loadBlankStudioDocument();
      return;
    }

    /* Explicit /editor/:id or ?site= — load only that project. */
    if (urlProjectId && global.SiteApi?.getApiBase?.()) {
      try {
        if (await tryLoadProjectFromServer(urlProjectId)) return;
      } catch (e) {
        console.warn("hydrateFromUrl project", e);
      }
    }

    if (urlProjectId && tryLoadLocalResumeForProject(urlProjectId)) return;

    if (urlProjectId) {
      console.warn("hydrateFromUrl: project not found", urlProjectId);
      loadBlankStudioDocument();
      return;
    }

    /* Plain /studio.html — never auto-resume last project from cache or session. */
    loadBlankStudioDocument();
  }

  global.SiteState = {
    get,
    replace,
    patch,
    save,
    persistGeneration,
    load,
    loadBlankStudioDocument,
    hydrateFromUrl,
    flushRemoteSave,
    applyPageToBody,
    serializeForApi,
    hasExplicitProjectInUrl,
    STORAGE_KEY,
    LAST_PROJECT_KEY,
    SESSION_PROJECT_KEY,
    rememberLastProjectId,
    getSessionProjectId,
    isResumeableDocument,
  };
})(typeof window !== "undefined" ? window : globalThis);
