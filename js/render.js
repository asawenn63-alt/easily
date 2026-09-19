/** Renderer for the free-scene architecture. No legacy rendering paths exist here. */
(function (global) {
  "use strict";

  function showUnavailable(mainEl, footerEl) {
    mainEl.innerHTML = '<p class="v2-compiled-renderer__error">Den fria visuella scenen saknar ett kompilerat resultat. Ingen reservlayout har visats.</p>';
    if (footerEl) {
      footerEl.innerHTML = "";
      footerEl.hidden = true;
    }
  }

  function mount(doc, mainEl, footerEl) {
    if (!mainEl) return false;
    const renderer = global.V2CompiledRenderer;
    const isFreeScene = !!(doc && doc.page && doc.page.createPath === "v2");
    if (!isFreeScene || !renderer || typeof renderer.mount !== "function") {
      showUnavailable(mainEl, footerEl);
      return false;
    }
    let mounted = false;
    try {
      mounted = renderer.mount(doc, mainEl, footerEl) === true;
    } catch (error) {
      try { console.error("[Easily · free scene renderer]", error); } catch (ignored) { /* ignore */ }
    }
    if (!mounted) showUnavailable(mainEl, footerEl);
    return mounted;
  }

  global.RenderEngine = Object.freeze({ mount: mount });
})(window);
