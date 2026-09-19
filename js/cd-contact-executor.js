/**
 * CD Contact Executor — ren renderer av brief.contact (CD Create).
 * Läser endast låst creativeBrief via CdExecutorGuard.
 * Skriver endast sections.contact.content (contact-title, contact-lead).
 */
(function (global) {
  "use strict";

  const CD_CONTACT_INCOMPLETE = "cd_contact_incomplete";
  const CD_CONTACT_NOT_IN_SCOPE = "cd_contact_not_in_scope";
  const CD_CONTACT_SECTION_MISSING = "cd_contact_section_missing";

  function createError(code, detail, extra) {
    const err = new Error(code);
    err.code = code;
    err.detail = detail || code;
    if (extra) Object.assign(err, extra);
    return err;
  }

  function scopeIncludesContact(brief) {
    const CBC = global.CreativeBriefContract;
    if (CBC && typeof CBC.scopeIncludesSection === "function") {
      return CBC.scopeIncludesSection(brief, "contact");
    }
    const sections = brief && brief.scope && brief.scope.sections;
    if (!Array.isArray(sections)) return false;
    return sections.some(function (id) {
      return String(id).trim() === "contact";
    });
  }

  function requireContactDecision(brief) {
    const CBC = global.CreativeBriefContract;
    const errors = [];
    if (CBC && typeof CBC.validateContactDecision === "function") {
      CBC.validateContactDecision(brief && brief.contact, errors, brief);
    } else if (!brief || !brief.contact) {
      errors.push("contact");
    }
    if (errors.length) {
      throw createError(CD_CONTACT_INCOMPLETE, "brief.contact incomplete: " + errors.join(", "), {
        contactErrors: errors,
      });
    }
    return brief.contact;
  }

  function applyContactContent(sec, contact) {
    const title = String(contact.title).trim();
    const lead = String(contact.lead).trim();

    if (!title || !lead) {
      throw createError(CD_CONTACT_INCOMPLETE, "contact title or lead empty after render");
    }

    sec.content = {
      "contact-title": title,
      "contact-lead": lead,
    };
  }

  /**
   * @param {object} doc
   * @returns {{ ok: boolean, contact?: object, skipped?: boolean, reason?: string }}
   */
  function applyToDocument(doc) {
    const Guard = global.CdExecutorGuard;
    if (!Guard || typeof Guard.guardExecutor !== "function") {
      return { ok: false, reason: "cd_executor_guard_missing" };
    }
    if (!doc || !doc.page) {
      return { ok: false, reason: "missing_document" };
    }

    let contact = null;
    let skipped = false;
    try {
      Guard.guardExecutor("contact-copy", doc, function (brief) {
        if (!scopeIncludesContact(brief)) {
          skipped = true;
          return;
        }

        const sec = doc.sections && doc.sections.contact;
        if (!sec || typeof sec !== "object") {
          throw createError(
            CD_CONTACT_SECTION_MISSING,
            "sections.contact missing — composition must own structure",
          );
        }

        contact = requireContactDecision(brief);
        applyContactContent(sec, contact);
      });
    } catch (err) {
      return {
        ok: false,
        reason: err.code || err.message,
        detail: err.detail || err.message,
      };
    }

    if (skipped) {
      return { ok: true, skipped: true, reason: CD_CONTACT_NOT_IN_SCOPE };
    }

    if (!contact) {
      return { ok: false, reason: "contact_render_failed" };
    }

    return { ok: true, contact: contact };
  }

  global.CdContactExecutor = {
    CD_CONTACT_INCOMPLETE: CD_CONTACT_INCOMPLETE,
    CD_CONTACT_NOT_IN_SCOPE: CD_CONTACT_NOT_IN_SCOPE,
    CD_CONTACT_SECTION_MISSING: CD_CONTACT_SECTION_MISSING,
    applyToDocument: applyToDocument,
  };
})(typeof window !== "undefined" ? window : globalThis);
