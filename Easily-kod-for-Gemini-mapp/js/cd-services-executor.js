/**
 * CD Services Executor — ren renderer av brief.services (CD Create).
 * Läser endast låst creativeBrief via CdExecutorGuard.
 * Skriver endast sections.services.content och card title/body (copy).
 */
(function (global) {
  "use strict";

  const CD_SERVICES_INCOMPLETE = "cd_services_incomplete";
  const CD_SERVICES_NOT_IN_SCOPE = "cd_services_not_in_scope";
  const CD_SERVICES_SECTION_MISSING = "cd_services_section_missing";
  const CD_SERVICES_CARD_MISMATCH = "cd_services_card_mismatch";

  function createError(code, detail, extra) {
    const err = new Error(code);
    err.code = code;
    err.detail = detail || code;
    if (extra) Object.assign(err, extra);
    return err;
  }

  function scopeIncludesServices(brief) {
    const CBC = global.CreativeBriefContract;
    if (CBC && typeof CBC.scopeIncludesSection === "function") {
      return CBC.scopeIncludesSection(brief, "services");
    }
    const sections = brief && brief.scope && brief.scope.sections;
    if (!Array.isArray(sections)) return false;
    return sections.some(function (id) {
      return String(id).trim() === "services";
    });
  }

  function requireServicesDecision(brief) {
    const CBC = global.CreativeBriefContract;
    const errors = [];
    if (CBC && typeof CBC.validateServicesDecision === "function") {
      CBC.validateServicesDecision(brief && brief.services, errors, brief);
    } else if (!brief || !brief.services) {
      errors.push("services");
    }
    if (errors.length) {
      throw createError(CD_SERVICES_INCOMPLETE, "brief.services incomplete: " + errors.join(", "), {
        servicesErrors: errors,
      });
    }
    return brief.services;
  }

  function applyServicesContent(sec, services) {
    const title = String(services.title).trim();
    const lead = String(services.lead).trim();

    if (!title || !lead) {
      throw createError(CD_SERVICES_INCOMPLETE, "services title or lead empty after render");
    }

    sec.content = {
      "services-title": title,
      "services-lead": lead,
    };

    const briefCards = services.cards;
    const docCards = sec.cards;
    if (!Array.isArray(docCards) || docCards.length !== briefCards.length) {
      throw createError(
        CD_SERVICES_CARD_MISMATCH,
        "sections.services.cards length must match brief.services.cards (" +
          briefCards.length +
          " vs " +
          (docCards ? docCards.length : 0) +
          ")",
      );
    }

    briefCards.forEach(function (card, i) {
      const cardTitle = String(card.title).trim();
      const cardBody = String(card.body).trim();
      if (!cardTitle || !cardBody) {
        throw createError(CD_SERVICES_INCOMPLETE, "services card " + i + " title or body empty");
      }
      docCards[i].title = cardTitle;
      docCards[i].body = cardBody;
    });
  }

  /**
   * @param {object} doc
   * @returns {{ ok: boolean, services?: object, skipped?: boolean, reason?: string }}
   */
  function applyToDocument(doc) {
    const Guard = global.CdExecutorGuard;
    if (!Guard || typeof Guard.guardExecutor !== "function") {
      return { ok: false, reason: "cd_executor_guard_missing" };
    }
    if (!doc || !doc.page) {
      return { ok: false, reason: "missing_document" };
    }

    let services = null;
    let skipped = false;
    try {
      Guard.guardExecutor("services-copy", doc, function (brief) {
        if (!scopeIncludesServices(brief)) {
          skipped = true;
          return;
        }

        const sec = doc.sections && doc.sections.services;
        if (!sec || typeof sec !== "object") {
          throw createError(
            CD_SERVICES_SECTION_MISSING,
            "sections.services missing — composition must own structure",
          );
        }

        services = requireServicesDecision(brief);
        applyServicesContent(sec, services);
      });
    } catch (err) {
      return {
        ok: false,
        reason: err.code || err.message,
        detail: err.detail || err.message,
      };
    }

    if (skipped) {
      return { ok: true, skipped: true, reason: CD_SERVICES_NOT_IN_SCOPE };
    }

    if (!services) {
      return { ok: false, reason: "services_render_failed" };
    }

    return { ok: true, services: services };
  }

  global.CdServicesExecutor = {
    CD_SERVICES_INCOMPLETE: CD_SERVICES_INCOMPLETE,
    CD_SERVICES_NOT_IN_SCOPE: CD_SERVICES_NOT_IN_SCOPE,
    CD_SERVICES_SECTION_MISSING: CD_SERVICES_SECTION_MISSING,
    CD_SERVICES_CARD_MISMATCH: CD_SERVICES_CARD_MISMATCH,
    applyToDocument: applyToDocument,
  };
})(typeof window !== "undefined" ? window : globalThis);
