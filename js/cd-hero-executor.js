/**
 * CD Hero Executor — ren renderer av brief.hero (CD Create).
 * Läser endast låst creativeBrief. Ingen kreativ sammansättning.
 */
(function (global) {
  "use strict";

  const MOTOR = "cd-hero-executor-v1";
  const CD_HERO_INCOMPLETE = "cd_hero_incomplete";

  function createError(code, detail, extra) {
    const err = new Error(code);
    err.code = code;
    err.detail = detail || code;
    if (extra) Object.assign(err, extra);
    return err;
  }

  function requireHeroDecision(brief) {
    const CBC = global.CreativeBriefContract;
    const errors = [];
    if (CBC && typeof CBC.validateHeroDecision === "function") {
      CBC.validateHeroDecision(brief && brief.hero, errors);
    } else if (!brief || !brief.hero) {
      errors.push("hero");
    }
    if (errors.length) {
      throw createError(CD_HERO_INCOMPLETE, "brief.hero incomplete: " + errors.join(", "), {
        heroErrors: errors,
      });
    }
    return brief.hero;
  }

  function applyHeroContent(doc, hero) {
    if (!doc.sections) doc.sections = {};
    if (!doc.sections.hero) doc.sections.hero = { content: {}, hidden: false };
    if (!doc.sections.hero.content) doc.sections.hero.content = {};

    const c = doc.sections.hero.content;
    c["hero-title"] = String(hero.title).trim();
    c["hero-lead"] = String(hero.lead).trim();
    c["hero-cta-1-text"] = String(hero.primaryCta.text).trim();
    c["hero-cta-1-href"] = String(hero.primaryCta.href).trim();
    c["hero-cta-2-text"] = String(hero.secondaryCta.text).trim();
    c["hero-cta-2-href"] = String(hero.secondaryCta.href).trim();

    if (!c["hero-title"] || !c["hero-lead"]) {
      throw createError(CD_HERO_INCOMPLETE, "hero title or lead empty after render");
    }

    if (!doc.page) doc.page = {};
    doc.page.cdHeroMeta = {
      motor: MOTOR,
      source: "creativeBrief.hero",
    };

    return doc;
  }

  /**
   * @param {object} doc
   * @returns {{ ok: boolean, hero?: object, reason?: string }}
   */
  function applyToDocument(doc) {
    const Guard = global.CdExecutorGuard;
    if (!Guard || typeof Guard.guardExecutor !== "function") {
      return { ok: false, reason: "cd_executor_guard_missing" };
    }
    if (!doc || !doc.page) {
      return { ok: false, reason: "missing_document" };
    }

    let hero = null;
    try {
      Guard.guardExecutor("hero-copy", doc, function (brief) {
        hero = requireHeroDecision(brief);
        applyHeroContent(doc, hero);
      });
    } catch (err) {
      return {
        ok: false,
        reason: err.code || err.message,
        detail: err.detail || err.message,
      };
    }

    if (!hero) {
      return { ok: false, reason: "hero_render_failed" };
    }

    return { ok: true, hero: hero };
  }

  global.CdHeroExecutor = {
    MOTOR: MOTOR,
    CD_HERO_INCOMPLETE: CD_HERO_INCOMPLETE,
    applyToDocument: applyToDocument,
  };
})(typeof window !== "undefined" ? window : globalThis);
