/**
 * CD About Executor — ren renderer av brief.about (CD Create).
 * Läser endast låst creativeBrief via CdExecutorGuard.
 * Skriver endast sections.about.content när sektionen redan finns.
 */
(function (global) {
  "use strict";

  const CD_ABOUT_INCOMPLETE = "cd_about_incomplete";
  const CD_ABOUT_NOT_IN_SCOPE = "cd_about_not_in_scope";
  const CD_ABOUT_SECTION_MISSING = "cd_about_section_missing";

  function createError(code, detail, extra) {
    const err = new Error(code);
    err.code = code;
    err.detail = detail || code;
    if (extra) Object.assign(err, extra);
    return err;
  }

  function scopeIncludesAbout(brief) {
    const CBC = global.CreativeBriefContract;
    if (CBC && typeof CBC.scopeIncludesSection === "function") {
      return CBC.scopeIncludesSection(brief, "about");
    }
    const sections = brief && brief.scope && brief.scope.sections;
    if (!Array.isArray(sections)) return false;
    return sections.some(function (id) {
      return String(id).trim() === "about";
    });
  }

  function requireAboutDecision(brief) {
    const CBC = global.CreativeBriefContract;
    const errors = [];
    if (CBC && typeof CBC.validateAboutDecision === "function") {
      CBC.validateAboutDecision(brief && brief.about, errors, brief);
    } else if (!brief || !brief.about) {
      errors.push("about");
    }
    if (errors.length) {
      throw createError(CD_ABOUT_INCOMPLETE, "brief.about incomplete: " + errors.join(", "), {
        aboutErrors: errors,
      });
    }
    return brief.about;
  }

  function applyAboutContent(sec, about) {
    const title = String(about.title).trim();
    const p1 = String(about.p1).trim();
    const p2 = String(about.p2).trim();

    if (!title || !p1 || !p2) {
      throw createError(CD_ABOUT_INCOMPLETE, "about copy empty after render");
    }

    sec.content = {
      "about-title": title,
      "about-p1": p1,
      "about-p2": p2,
    };
  }

  /**
   * @param {object} doc
   * @returns {{ ok: boolean, about?: object, skipped?: boolean, reason?: string }}
   */
  function applyToDocument(doc) {
    const Guard = global.CdExecutorGuard;
    if (!Guard || typeof Guard.guardExecutor !== "function") {
      return { ok: false, reason: "cd_executor_guard_missing" };
    }
    if (!doc || !doc.page) {
      return { ok: false, reason: "missing_document" };
    }

    let about = null;
    let skipped = false;
    try {
      Guard.guardExecutor("about-copy", doc, function (brief) {
        if (!scopeIncludesAbout(brief)) {
          skipped = true;
          return;
        }

        const sec = doc.sections && doc.sections.about;
        if (!sec || typeof sec !== "object") {
          throw createError(
            CD_ABOUT_SECTION_MISSING,
            "sections.about missing — composition must own structure",
          );
        }

        about = requireAboutDecision(brief);
        applyAboutContent(sec, about);
      });
    } catch (err) {
      return {
        ok: false,
        reason: err.code || err.message,
        detail: err.detail || err.message,
      };
    }

    if (skipped) {
      return { ok: true, skipped: true, reason: CD_ABOUT_NOT_IN_SCOPE };
    }

    if (!about) {
      return { ok: false, reason: "about_render_failed" };
    }

    return { ok: true, about: about };
  }

  global.CdAboutExecutor = {
    CD_ABOUT_INCOMPLETE: CD_ABOUT_INCOMPLETE,
    CD_ABOUT_NOT_IN_SCOPE: CD_ABOUT_NOT_IN_SCOPE,
    CD_ABOUT_SECTION_MISSING: CD_ABOUT_SECTION_MISSING,
    applyToDocument: applyToDocument,
  };
})(typeof window !== "undefined" ? window : globalThis);
