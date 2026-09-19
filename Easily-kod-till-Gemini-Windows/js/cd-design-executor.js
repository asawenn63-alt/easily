/**
 * CD Design Executor — ren renderer av brief.design (CD Create).
 * Läser endast låst creativeBrief. Ingen identitet, ingen DesignFamilies.
 */
(function (global) {
  "use strict";

  const MOTOR = "cd-design-executor-v1";
  const CD_DESIGN_INCOMPLETE = "cd_design_incomplete";

  function createError(code, detail, extra) {
    const err = new Error(code);
    err.code = code;
    err.detail = detail || code;
    if (extra) Object.assign(err, extra);
    return err;
  }

  function requireDesignDecision(brief) {
    const CBC = global.CreativeBriefContract;
    const errors = [];
    if (CBC && typeof CBC.validateDesignDecision === "function") {
      CBC.validateDesignDecision(brief && brief.design, errors);
    } else if (!brief || !brief.design) {
      errors.push("design");
    }
    if (errors.length) {
      throw createError(CD_DESIGN_INCOMPLETE, "brief.design incomplete: " + errors.join(", "), {
        designErrors: errors,
      });
    }
    return brief.design;
  }

  function applyDesignToPage(page, design) {
    page.theme = String(design.theme).trim();
    page.template = String(design.template).trim();
    page.designColors = Object.assign({}, design.colors);
    page.cdDesignLocked = true;

    if (design.accentStyle) page.accentStyle = String(design.accentStyle).trim();
    else delete page.accentStyle;

    if (design.ctaEmphasis && design.ctaEmphasis !== "balanced") {
      page.ctaEmphasis = String(design.ctaEmphasis).trim();
    } else {
      delete page.ctaEmphasis;
    }

    if (design.buttonStyle) page.buttonStyle = String(design.buttonStyle).trim();
    else delete page.buttonStyle;

    if (design.fontPair) page.fontPair = String(design.fontPair).trim();
    else delete page.fontPair;

    page.cdDesignMeta = {
      motor: MOTOR,
      source: "creativeBrief.design",
    };

    const CDG = global.CreateCdGate;
    if (CDG && typeof CDG.purgeLegacyIdentityFields === "function") {
      CDG.purgeLegacyIdentityFields(page);
    }

    return page;
  }

  /**
   * @param {object} doc
   * @returns {{ ok: boolean, design?: object, reason?: string }}
   */
  function applyToDocument(doc) {
    const Guard = global.CdExecutorGuard;
    if (!Guard || typeof Guard.guardExecutor !== "function") {
      return { ok: false, reason: "cd_executor_guard_missing" };
    }
    if (!doc || !doc.page) {
      return { ok: false, reason: "missing_document" };
    }

    let design = null;
    try {
      Guard.guardExecutor("design", doc, function (brief) {
        design = requireDesignDecision(brief);
        applyDesignToPage(doc.page, design);
      });
    } catch (err) {
      return {
        ok: false,
        reason: err.code || err.message,
        detail: err.detail || err.message,
      };
    }

    if (!design) {
      return { ok: false, reason: "design_render_failed" };
    }

    return { ok: true, design: design };
  }

  global.CdDesignExecutor = {
    MOTOR: MOTOR,
    CD_DESIGN_INCOMPLETE: CD_DESIGN_INCOMPLETE,
    applyToDocument: applyToDocument,
  };
})(typeof window !== "undefined" ? window : globalThis);
