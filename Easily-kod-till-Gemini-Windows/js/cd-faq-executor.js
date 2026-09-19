/**
 * CD FAQ Executor — ren renderer av brief.faq (CD Create).
 * Läser endast låst creativeBrief via CdExecutorGuard.
 * Skriver sections.faq.content och FAQ-posternas q/a (copy).
 */
(function (global) {
  "use strict";

  const CD_FAQ_INCOMPLETE = "cd_faq_incomplete";
  const CD_FAQ_NOT_IN_SCOPE = "cd_faq_not_in_scope";
  const CD_FAQ_SECTION_MISSING = "cd_faq_section_missing";
  const CD_FAQ_ITEM_MISMATCH = "cd_faq_item_mismatch";

  function createError(code, detail, extra) {
    const err = new Error(code);
    err.code = code;
    err.detail = detail || code;
    if (extra) Object.assign(err, extra);
    return err;
  }

  function scopeIncludesFaq(brief) {
    const CBC = global.CreativeBriefContract;
    if (CBC && typeof CBC.scopeIncludesSection === "function") {
      return CBC.scopeIncludesSection(brief, "faq");
    }
    const sections = brief && brief.scope && brief.scope.sections;
    if (!Array.isArray(sections)) return false;
    return sections.some(function (id) {
      return String(id).trim() === "faq";
    });
  }

  function requireFaqDecision(brief) {
    const CBC = global.CreativeBriefContract;
    const errors = [];
    if (CBC && typeof CBC.validateFaqDecision === "function") {
      CBC.validateFaqDecision(brief && brief.faq, errors, brief);
    } else if (!brief || !brief.faq) {
      errors.push("faq");
    }
    if (errors.length) {
      throw createError(CD_FAQ_INCOMPLETE, "brief.faq incomplete: " + errors.join(", "), {
        faqErrors: errors,
      });
    }
    return brief.faq;
  }

  function applyFaqContent(sec, faq) {
    const title = String(faq.title).trim();
    const lead = String(faq.lead).trim();

    if (!title || !lead) {
      throw createError(CD_FAQ_INCOMPLETE, "faq title or lead empty after render");
    }

    sec.content = {
      "faq-title": title,
      "faq-lead": lead,
    };

    const briefItems = faq.items;
    const docItems = sec.items;
    if (!Array.isArray(docItems) || docItems.length !== briefItems.length) {
      throw createError(
        CD_FAQ_ITEM_MISMATCH,
        "sections.faq.items length must match brief.faq.items (" +
          briefItems.length +
          " vs " +
          (docItems ? docItems.length : 0) +
          ")",
      );
    }

    briefItems.forEach(function (item, i) {
      const q = String(item.q).trim();
      const a = String(item.a).trim();
      if (!q || !a) {
        throw createError(CD_FAQ_INCOMPLETE, "faq item " + i + " q or a empty");
      }
      docItems[i].q = q;
      docItems[i].a = a;
    });
  }

  /**
   * @param {object} doc
   * @returns {{ ok: boolean, faq?: object, skipped?: boolean, reason?: string }}
   */
  function applyToDocument(doc) {
    const Guard = global.CdExecutorGuard;
    if (!Guard || typeof Guard.guardExecutor !== "function") {
      return { ok: false, reason: "cd_executor_guard_missing" };
    }
    if (!doc || !doc.page) {
      return { ok: false, reason: "missing_document" };
    }

    let faq = null;
    let skipped = false;
    try {
      Guard.guardExecutor("faq-copy", doc, function (brief) {
        if (!scopeIncludesFaq(brief)) {
          skipped = true;
          return;
        }

        const sec = doc.sections && doc.sections.faq;
        if (!sec || typeof sec !== "object") {
          throw createError(
            CD_FAQ_SECTION_MISSING,
            "sections.faq missing — composition must own structure",
          );
        }

        faq = requireFaqDecision(brief);
        applyFaqContent(sec, faq);
      });
    } catch (err) {
      return {
        ok: false,
        reason: err.code || err.message,
        detail: err.detail || err.message,
      };
    }

    if (skipped) {
      return { ok: true, skipped: true, reason: CD_FAQ_NOT_IN_SCOPE };
    }

    if (!faq) {
      return { ok: false, reason: "faq_render_failed" };
    }

    return { ok: true, faq: faq };
  }

  global.CdFaqExecutor = {
    CD_FAQ_INCOMPLETE: CD_FAQ_INCOMPLETE,
    CD_FAQ_NOT_IN_SCOPE: CD_FAQ_NOT_IN_SCOPE,
    CD_FAQ_SECTION_MISSING: CD_FAQ_SECTION_MISSING,
    CD_FAQ_ITEM_MISMATCH: CD_FAQ_ITEM_MISMATCH,
    applyToDocument: applyToDocument,
  };
})(typeof window !== "undefined" ? window : globalThis);
