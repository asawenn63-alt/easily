/**
 * CD Gallery Executor — ren renderer av brief.gallery (CD Create).
 * Läser endast låst creativeBrief via CdExecutorGuard.
 * Skriver endast sections.gallery.content.
 */
(function (global) {
  "use strict";

  const CD_GALLERY_INCOMPLETE = "cd_gallery_incomplete";
  const CD_GALLERY_NOT_IN_SCOPE = "cd_gallery_not_in_scope";
  const CD_GALLERY_SECTION_MISSING = "cd_gallery_section_missing";

  function createError(code, detail, extra) {
    const err = new Error(code);
    err.code = code;
    err.detail = detail || code;
    if (extra) Object.assign(err, extra);
    return err;
  }

  function scopeIncludesGallery(brief) {
    const CBC = global.CreativeBriefContract;
    if (CBC && typeof CBC.scopeIncludesSection === "function") {
      return CBC.scopeIncludesSection(brief, "gallery");
    }
    const sections = brief && brief.scope && brief.scope.sections;
    if (!Array.isArray(sections)) return false;
    return sections.some(function (id) {
      return String(id).trim() === "gallery";
    });
  }

  function requireGalleryDecision(brief) {
    const CBC = global.CreativeBriefContract;
    const errors = [];
    if (CBC && typeof CBC.validateGalleryDecision === "function") {
      CBC.validateGalleryDecision(brief && brief.gallery, errors, brief);
    } else if (!brief || !brief.gallery) {
      errors.push("gallery");
    }
    if (errors.length) {
      throw createError(CD_GALLERY_INCOMPLETE, "brief.gallery incomplete: " + errors.join(", "), {
        galleryErrors: errors,
      });
    }
    return brief.gallery;
  }

  function applyGalleryContent(sec, gallery) {
    const title = String(gallery.title).trim();
    const lead = String(gallery.lead).trim();

    if (!title || !lead) {
      throw createError(CD_GALLERY_INCOMPLETE, "gallery title or lead empty after render");
    }

    sec.content = {
      "gallery-title": title,
      "gallery-lead": lead,
    };
  }

  /**
   * @param {object} doc
   * @returns {{ ok: boolean, gallery?: object, skipped?: boolean, reason?: string }}
   */
  function applyToDocument(doc) {
    const Guard = global.CdExecutorGuard;
    if (!Guard || typeof Guard.guardExecutor !== "function") {
      return { ok: false, reason: "cd_executor_guard_missing" };
    }
    if (!doc || !doc.page) {
      return { ok: false, reason: "missing_document" };
    }

    let gallery = null;
    let skipped = false;
    try {
      Guard.guardExecutor("gallery-copy", doc, function (brief) {
        if (!scopeIncludesGallery(brief)) {
          skipped = true;
          return;
        }

        const sec = doc.sections && doc.sections.gallery;
        if (!sec || typeof sec !== "object") {
          throw createError(
            CD_GALLERY_SECTION_MISSING,
            "sections.gallery missing — composition must own structure",
          );
        }

        gallery = requireGalleryDecision(brief);
        applyGalleryContent(sec, gallery);
      });
    } catch (err) {
      return {
        ok: false,
        reason: err.code || err.message,
        detail: err.detail || err.message,
      };
    }

    if (skipped) {
      return { ok: true, skipped: true, reason: CD_GALLERY_NOT_IN_SCOPE };
    }

    if (!gallery) {
      return { ok: false, reason: "gallery_render_failed" };
    }

    return { ok: true, gallery: gallery };
  }

  global.CdGalleryExecutor = {
    CD_GALLERY_INCOMPLETE: CD_GALLERY_INCOMPLETE,
    CD_GALLERY_NOT_IN_SCOPE: CD_GALLERY_NOT_IN_SCOPE,
    CD_GALLERY_SECTION_MISSING: CD_GALLERY_SECTION_MISSING,
    applyToDocument: applyToDocument,
  };
})(typeof window !== "undefined" ? window : globalThis);
