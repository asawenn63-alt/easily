/** Minimal Studio host for one free scene and one document history. */
(function (global) {
  "use strict";

  let remountToken = 0;

  function currentProjectId() {
    const match = global.location.pathname.match(/^\/editor\/([^/]+)\/?$/);
    return match ? decodeURIComponent(match[1]) : "";
  }

  function syncProjectUrl(projectId) {
    const id = String(projectId || "").trim();
    if (!id || currentProjectId() === id) return;
    global.history.replaceState({}, "", "/editor/" + encodeURIComponent(id));
  }

  function remount() {
    const doc = global.SiteState && global.SiteState.get ? global.SiteState.get() : null;
    const mainEl = document.getElementById("siteMain");
    const footerEl = document.getElementById("siteFooter");
    if (!doc || !mainEl || !global.RenderEngine || typeof global.RenderEngine.mount !== "function") return false;
    const mounted = global.RenderEngine.mount(doc, mainEl, footerEl);
    if (global.SiteState && typeof global.SiteState.applyPageToBody === "function") global.SiteState.applyPageToBody();
    document.dispatchEvent(new CustomEvent("studio:preview-mounted", { detail: { mounted: mounted } }));
    return mounted;
  }

  function remountAsync() {
    const token = ++remountToken;
    return new Promise((resolve) => {
      requestAnimationFrame(() => resolve(token === remountToken ? remount() : false));
    });
  }

  function cancelPendingRemounts() {
    remountToken += 1;
  }

  const api = Object.freeze({
    remount: remount,
    remountAsync: remountAsync,
    remountAsyncForced: remountAsync,
    cancelPendingRemounts: cancelPendingRemounts,
    syncProjectUrl: syncProjectUrl,
    undo: function () { return false; },
    redo: function () { return false; },
    canUndo: function () { return false; },
    canRedo: function () { return false; },
    pushHistory: function () { return false; },
    resetHistoryForDocument: function () { return false; },
    syncHeroFromState: function () { return false; },
    applyHeroPhotoToDom: function () { return false; },
    syncVisibilityFromState: function () { return false; },
  });
  global.EditorEngine = api;

  async function init() {
    document.documentElement.classList.remove("studio-is-generating");
    try {
      if (global.SiteState && typeof global.SiteState.hydrateFromUrl === "function") await global.SiteState.hydrateFromUrl();
      else if (global.SiteState && typeof global.SiteState.load === "function") global.SiteState.load();
    } catch (error) {
      try { if (global.SiteState && typeof global.SiteState.load === "function") global.SiteState.load(); } catch (ignored) { /* ignore */ }
    }
    const doc = global.SiteState && global.SiteState.get ? global.SiteState.get() : null;
    if (doc?.meta?.siteId) syncProjectUrl(doc.meta.siteId);
    remount();
    document.dispatchEvent(new CustomEvent("studio:ready", {
      detail: { readOnly: document.body.getAttribute("data-studio-mode") === "readonly" },
    }));
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})(window);
