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

  function sanitizeHtml(html) {
    var template = document.createElement("template");
    template.innerHTML = String(html || "");
    var forbidden = template.content.querySelectorAll("script, iframe, object, embed");
    forbidden.forEach(function (el) { el.remove(); });
    template.content.querySelectorAll("*").forEach(function (el) {
      Array.from(el.attributes).forEach(function (attr) {
        var name = attr.name.toLowerCase();
        if (name.startsWith("on")) el.removeAttribute(attr.name);
        if ((name === "href" || name === "src") && String(attr.value || "").trim().toLowerCase().startsWith("javascript:")) {
          el.removeAttribute(attr.name);
        }
      });
    });
    return template.innerHTML;
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
      const node = event.target.closest && event.target.closest("[data-content-ref], [data-asset-ref]");
      if (!node || !mainEl.contains(node) || document.body.getAttribute("data-studio-mode") === "readonly") return;
      event.preventDefault();
      const contentId = node.getAttribute("data-content-ref");
      const assetId = node.getAttribute("data-asset-ref");
      if ((!contentId && !assetId) || !global.StudioPanelModes) return;
      mainEl.querySelectorAll(".is-v2-editor-selected").forEach(function (item) {
        item.classList.remove("is-v2-editor-selected");
      });
      node.classList.add("is-v2-editor-selected");
      global.StudioPanelModes.selectV2Node({
        nodeId: node.getAttribute("data-node-id") || "",
        nodeKind: node.getAttribute("data-node-kind") || "",
        semanticRole: node.getAttribute("data-semantic-role") || "",
        contentId: contentId || "",
        assetId: assetId || "",
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
    const graphRevision = String(doc.page.v2SceneGraph && doc.page.v2SceneGraph.graphRevision && doc.page.v2SceneGraph.graphRevision.revisionNumber || 0);
    if (
      mainEl.dataset.v2ProfileId !== profile.profileId ||
      mainEl.dataset.v2GenerationId !== doc.page.v2GenerationId ||
      mainEl.dataset.v2GraphRevision !== graphRevision
    ) {
      mainEl.innerHTML = sanitizeHtml(String(profile.html || ""));
      mainEl.dataset.v2ProfileId = String(profile.profileId || "");
      mainEl.dataset.v2GenerationId = String(doc.page.v2GenerationId || "");
      mainEl.dataset.v2GraphRevision = graphRevision;
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
