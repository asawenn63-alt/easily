/**
 * Page-state för creativeBrief + briefLocked (CD Create).
 */
(function (global) {
  "use strict";

  const CBC = function () {
    return global.CreativeBriefContract;
  };

  const CDG = function () {
    return global.CreateCdGate;
  };

  function isLegacyPath(doc, ctx) {
    const gate = CDG();
    if (gate && typeof gate.isLegacyPath === "function") {
      return gate.isLegacyPath(doc, ctx);
    }
    return true;
  }

  function initOnDocument(doc) {
    if (!doc) return doc;
    if (!doc.page) doc.page = {};
    if (doc.page.creativeBrief == null) {
      const contract = CBC();
      doc.page.creativeBrief =
        contract && typeof contract.createEmptyBrief === "function"
          ? contract.createEmptyBrief()
          : { briefVersion: "1.0", businessFacts: {} };
    }
    if (typeof doc.page.briefLocked !== "boolean") {
      doc.page.briefLocked = false;
    }
    return doc;
  }

  function isBriefLocked(doc) {
    if (!doc || !doc.page) return false;
    return doc.page.briefLocked === true;
  }

  function getCreativeBrief(doc) {
    if (!doc || !doc.page) return null;
    return doc.page.creativeBrief || null;
  }

  function setCreativeBrief(doc, brief, opts) {
    opts = opts || {};
    if (!doc) return { ok: false, errors: ["doc"] };
    if (!doc.page) doc.page = {};
    const contract = CBC();
    const validation =
      contract && typeof contract.validateCreativeBrief === "function"
        ? contract.validateCreativeBrief(brief, { requireComplete: opts.requireValid !== false })
        : { ok: true, errors: [] };
    if (opts.requireValid !== false && !validation.ok) {
      return validation;
    }
    doc.page.creativeBrief = brief;
    if (opts.locked === true) {
      doc.page.briefLocked = true;
      if (doc.page.creativeBrief) doc.page.creativeBrief.locked = true;
    } else if (opts.locked === false) {
      doc.page.briefLocked = false;
      if (doc.page.creativeBrief && doc.page.creativeBrief.locked != null) {
        doc.page.creativeBrief.locked = false;
      }
    }
    return { ok: true, errors: [] };
  }

  function validatePageState(doc) {
    if (!doc || isLegacyPath(doc)) {
      return { ok: true, errors: [] };
    }
    const errors = [];
    const page = doc.page || {};
    if (page.compositionLocked === true && page.briefLocked !== true) {
      errors.push("compositionLocked_without_briefLocked");
    }
    if (page.briefLocked === true) {
      const brief = page.creativeBrief;
      const contract = CBC();
      if (!brief) {
        errors.push("briefLocked_without_creativeBrief");
      } else if (contract && typeof contract.validateCreativeBrief === "function") {
        const v = contract.validateCreativeBrief(brief, { requireComplete: true });
        if (!v.ok) errors.push("invalid_locked_brief:" + v.errors.join(","));
      }
    }
    return { ok: errors.length === 0, errors: errors };
  }

  global.CreativeBriefState = {
    initOnDocument: initOnDocument,
    isBriefLocked: isBriefLocked,
    getCreativeBrief: getCreativeBrief,
    setCreativeBrief: setCreativeBrief,
    validatePageState: validatePageState,
    isLegacyPath: isLegacyPath,
  };
})(typeof window !== "undefined" ? window : globalThis);
