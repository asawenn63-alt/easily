/**
 * Läser query-parametrar och path innan övriga skript kör (sync).
 * ?view=1&slug=…  = publicerad readonly-vy (API public snapshot)
 * ?site=…        = ladda projekt-id (kräver API-bas)
 * /editor/:id    = studio med projekt-id (server injicerar data-studio-editor-id)
 *
 * Viktigt: sessionStorage används ALDRIG som projekt-id på /studio.html —
 * annars visas föregående projekt efter hård omladdning.
 */
(function () {
  "use strict";
  var q = new URLSearchParams(window.location.search);
  var editorIdFromPath = "";
  try {
    var m = /^\/editor\/([^/]+)\/?$/.exec(window.location.pathname || "");
    if (m) editorIdFromPath = decodeURIComponent(m[1]).trim();
  } catch (e0) {
    /* ignore */
  }
  var editorIdFromBody = "";
  try {
    editorIdFromBody = (document.body.getAttribute("data-studio-editor-id") || "").trim();
  } catch (e1) {
    /* ignore */
  }
  var editorIdFromQuery = (q.get("site") || "").trim();
  var explicitProjectId = editorIdFromPath || editorIdFromQuery || editorIdFromBody;

  window.STUDIO = {
    isPublicView: q.get("view") === "1" && !!q.get("slug"),
    publicSlug: (q.get("slug") || "").trim(),
    /** Endast explicit URL/body — aldrig sessionStorage. */
    siteIdFromUrl: explicitProjectId,
    isEditorRoute: !!editorIdFromPath,
    isNewSiteRequest: q.get("new") === "1",
    openProjectsFromUrl: q.get("projects") === "1",
  };
})();
