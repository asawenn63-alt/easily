(function (global) {
  "use strict";

  let displayedProjectId = null;

  function currentDocument() {
    return global.SiteState && global.SiteState.get ? global.SiteState.get() : null;
  }

  function handlesPreview(doc) {
    doc = doc || currentDocument();
    if (!doc) return false;
    const meta = doc.meta || {};
    // Compatibility only: Greenfield may display an already-saved old project,
    // but it must never claim a blank/new document or generate another site.
    return meta.generationEngine === "greenfield" || !!meta.greenfieldPreviewPath || !!meta.greenfieldRunId;
  }

  function clearFrame() {
    if (global.WebsiteDocumentEditor) global.WebsiteDocumentEditor.close();
    const frame = document.getElementById("greenfieldPreviewFrame");
    if (frame) {
      frame.hidden = true;
      frame.removeAttribute("src");
      delete frame.dataset.runId;
    }
  }

  function setPreviewState(active, hasSite) {
    document.body.dataset.previewEngine = "greenfield";
    const main = document.getElementById("siteMain");
    const footer = document.getElementById("siteFooter");
    if (main) main.hidden = true;
    if (footer) footer.hidden = true;
    const empty = document.getElementById("studioPreviewEmpty");
    const loading = document.getElementById("studioPreviewLoading");
    if (empty) empty.hidden = active || hasSite;
    if (loading) {
      loading.hidden = !active;
      loading.setAttribute("aria-busy", active ? "true" : "false");
    }
    document.body.dataset.studioPreview = active ? "loading" : hasSite ? "site" : "empty";
    document.documentElement.removeAttribute("data-studio-preview-pending");
  }

  function mountPreview(previewPath, runId) {
    const pane = document.getElementById("studioPreviewPane");
    if (!pane || !previewPath) return false;
    if (global.WebsiteDocumentEditor) {
      const projectId = String(currentDocument()?.meta?.siteId || "");
      displayedProjectId = projectId;
      setPreviewState(false, true);
      global.WebsiteDocumentEditor.open(projectId, String(runId || ""));
      return true;
    }
    let frame = document.getElementById("greenfieldPreviewFrame");
    if (!frame) {
      frame = document.createElement("iframe");
      frame.id = "greenfieldPreviewFrame";
      frame.className = "greenfield-preview-frame";
      frame.title = "Genererad webbplats";
      frame.setAttribute("sandbox", "allow-scripts");
      pane.appendChild(frame);
    }
    const doc = currentDocument();
    const projectId = String(doc && doc.meta && doc.meta.siteId || "");
    const revision = String(runId || "");
    if (displayedProjectId !== projectId || frame.getAttribute("src") !== previewPath || frame.dataset.runId !== revision) {
      frame.src = previewPath;
    }
    displayedProjectId = projectId;
    frame.dataset.runId = revision;
    frame.hidden = false;
    setPreviewState(false, true);
    return true;
  }

  function restore() {
    const doc = currentDocument();
    const projectId = String(doc && doc.meta && doc.meta.siteId || "");
    if (displayedProjectId !== projectId) clearFrame();
    displayedProjectId = projectId;
    if (!handlesPreview(doc)) {
      clearFrame();
      delete document.body.dataset.previewEngine;
      ["siteMain", "siteFooter"].forEach(function (id) {
        const el = document.getElementById(id);
        if (el) el.hidden = false;
      });
      return false;
    }
    const previewPath = doc && doc.meta && doc.meta.greenfieldPreviewPath;
    if (previewPath) mountPreview(previewPath, doc.meta.greenfieldRunId);
    else {
      clearFrame();
      setPreviewState(false, false);
    }
    return true; // Preview ownership, not generation success.
  }

  document.addEventListener("studio:ready", function () {
    requestAnimationFrame(function () { requestAnimationFrame(restore); });
  });

  global.GreenfieldAdapter = Object.freeze({ mountPreview: mountPreview, restore: restore, handlesPreview: handlesPreview });
})(typeof window !== "undefined" ? window : globalThis);
