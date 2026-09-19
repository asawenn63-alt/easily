/** Deterministisk webbläsarmount av redan kompilerade V2-profiler. */
(function (global) {
  "use strict";

  const STYLE_ID = "easily-v2-compiled-style";

  function matches(query, inlinePx, blockPx) {
    query = query || {};
    if (Number.isFinite(query.minInlinePx) && inlinePx < query.minInlinePx) return false;
    if (Number.isFinite(query.maxInlinePx) && inlinePx > query.maxInlinePx) return false;
    if (Number.isFinite(query.minBlockPx) && blockPx < query.minBlockPx) return false;
    if (Number.isFinite(query.maxBlockPx) && blockPx > query.maxBlockPx) return false;
    return true;
  }

  function selectProfile(profiles, inlinePx, blockPx) {
    return (profiles || [])
      .filter(function (profile) { return profile && profile.ok && matches(profile.query, inlinePx, blockPx); })
      .sort(function (left, right) {
        const leftWidth = Number(left.query && left.query.maxInlinePx || Infinity) - Number(left.query && left.query.minInlinePx || 0);
        const rightWidth = Number(right.query && right.query.maxInlinePx || Infinity) - Number(right.query && right.query.minInlinePx || 0);
        return leftWidth - rightWidth;
      })[0] || null;
  }

  function installCss(css) {
    let style = document.getElementById(STYLE_ID);
    if (!style) {
      style = document.createElement("style");
      style.id = STYLE_ID;
      document.head.appendChild(style);
    }
    if (style.textContent !== css) style.textContent = css;
  }

  function bindEditorSelection(mainEl) {
    if (!mainEl || mainEl.dataset.v2EditorSelectionBound === "1") return;
    mainEl.dataset.v2EditorSelectionBound = "1";
    mainEl.addEventListener("click", function (event) {
      const node = event.target.closest && event.target.closest("[data-content-ref]");
      if (!node || !mainEl.contains(node) || document.body.getAttribute("data-studio-mode") === "readonly") return;
      event.preventDefault();
      const contentId = node.getAttribute("data-content-ref");
      if (!contentId || !global.StudioPanelModes) return;
      global.StudioPanelModes.switchTab("manual");
      global.StudioPanelModes.refreshManualPanel();
      global.requestAnimationFrame(function () {
        const field = document.querySelector('[data-v2-content-field="' + CSS.escape(contentId) + '"]');
        if (field) {
          field.scrollIntoView({ block: "nearest", behavior: "smooth" });
          field.focus();
          field.select();
        }
      });
    });
  }

  function mount(doc, mainEl, footerEl) {
    if (!doc || !doc.page || doc.page.createPath !== "v2" || !mainEl) return false;
    const profiles = doc.page.v2CompiledProfiles;
    if (!Array.isArray(profiles) || !profiles.length) {
      mainEl.innerHTML = '<p role="alert">Den fria visuella scenen saknar ett kompilerat resultat.</p>';
      return true;
    }
    const inlinePx = Math.max(1, mainEl.clientWidth || global.innerWidth || 1440);
    const blockPx = Math.max(1, global.innerHeight || 900);
    const profile = selectProfile(profiles, inlinePx, blockPx);
    if (!profile) {
      mainEl.innerHTML = '<p role="alert">Ingen av designmotorns viewportprofiler matchar den här skärmen.</p>';
      return true;
    }
    installCss(String(profile.css || ""));
    bindEditorSelection(mainEl);
    if (mainEl.dataset.v2ProfileId !== profile.profileId || mainEl.dataset.v2GenerationId !== doc.page.v2GenerationId) {
      mainEl.innerHTML = String(profile.html || "");
      mainEl.dataset.v2ProfileId = String(profile.profileId || "");
      mainEl.dataset.v2GenerationId = String(doc.page.v2GenerationId || "");
      mainEl.dataset.createPath = "v2";
    }
    if (footerEl) {
      footerEl.innerHTML = "";
      footerEl.hidden = true;
    }
    return true;
  }

  let resizeTimer = null;
  global.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      const doc = global.SiteState && global.SiteState.get ? global.SiteState.get() : null;
      const main = document.getElementById("siteMain");
      const footer = document.getElementById("siteFooter");
      if (doc && doc.page && doc.page.createPath === "v2") {
        if (main) delete main.dataset.v2ProfileId;
        mount(doc, main, footer);
      }
    }, 100);
  });

  global.V2CompiledRenderer = { mount: mount, selectProfile: selectProfile };
})(typeof window !== "undefined" ? window : globalThis);
