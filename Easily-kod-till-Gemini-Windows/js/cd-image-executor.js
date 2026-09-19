/**
 * CD Image Executor — ren renderer av brief.images (CD Create).
 * Läser endast låst creativeBrief. Ingen legacy image-pipeline.
 */
(function (global) {
  "use strict";

  const MOTOR = "cd-image-executor-v1";
  const CD_IMAGES_INCOMPLETE = "cd_images_incomplete";

  function createError(code, detail, extra) {
    const err = new Error(code);
    err.code = code;
    err.detail = detail || code;
    if (extra) Object.assign(err, extra);
    return err;
  }

  function requireImageDecision(brief) {
    const CBC = global.CreativeBriefContract;
    const errors = [];
    if (CBC && typeof CBC.validateImageDecision === "function") {
      CBC.validateImageDecision(brief && brief.images, errors);
    } else if (!brief || !brief.images) {
      errors.push("images");
    }
    if (errors.length) {
      throw createError(CD_IMAGES_INCOMPLETE, "brief.images incomplete: " + errors.join(", "), {
        imageErrors: errors,
      });
    }
    return brief.images;
  }

  function slotUrl(slot) {
    return String(slot && slot.url ? slot.url : "").trim();
  }

  function applyImagesToDocument(doc, images) {
    if (!doc.page) doc.page = {};
    if (!doc.sections) doc.sections = {};

    const heroUrl = slotUrl(images.hero);
    if (!heroUrl) {
      throw createError(CD_IMAGES_INCOMPLETE, "images.hero.url missing after render");
    }
    doc.page.heroBgUrl = heroUrl;
    doc.page.cdImagesLocked = true;

    if (!doc.page.material) doc.page.material = {};
    doc.page.material.heroImageUrl = heroUrl;

    if (doc.sections.about) {
      const aboutUrl = slotUrl(images.about);
      if (aboutUrl) {
        doc.sections.about.imageUrl = aboutUrl;
        doc.page.material.aboutImageUrl = aboutUrl;
      }
    }

    if (doc.sections.services && Array.isArray(images.cards)) {
      if (!doc.sections.services.cards) doc.sections.services.cards = [];
      images.cards.forEach(function (slot, i) {
        const url = slotUrl(slot);
        if (!url) return;
        if (!doc.sections.services.cards[i]) {
          doc.sections.services.cards[i] = { title: "", body: "", intent: "services", img: "" };
        }
        doc.sections.services.cards[i].img = url;
      });
      if (!doc.page.material.serviceImages) doc.page.material.serviceImages = ["", "", ""];
      images.cards.forEach(function (slot, i) {
        const url = slotUrl(slot);
        if (url) doc.page.material.serviceImages[i] = url;
      });
    }

    if (doc.sections.gallery && Array.isArray(images.gallery)) {
      doc.sections.gallery.images = images.gallery.map(function (slot) {
        return slotUrl(slot);
      }).filter(Boolean);
      doc.page.material.galleryImages = doc.sections.gallery.images.slice();
    }

    doc.page.cdImagesMeta = {
      motor: MOTOR,
      source: "creativeBrief.images",
    };

    return doc;
  }

  /**
   * @param {object} doc
   * @returns {{ ok: boolean, images?: object, reason?: string }}
   */
  function applyToDocument(doc) {
    const Guard = global.CdExecutorGuard;
    if (!Guard || typeof Guard.guardExecutor !== "function") {
      return { ok: false, reason: "cd_executor_guard_missing" };
    }
    if (!doc || !doc.page) {
      return { ok: false, reason: "missing_document" };
    }

    let images = null;
    try {
      Guard.guardExecutor("images", doc, function (brief) {
        images = requireImageDecision(brief);
        applyImagesToDocument(doc, images);
      });
    } catch (err) {
      return {
        ok: false,
        reason: err.code || err.message,
        detail: err.detail || err.message,
      };
    }

    if (!images) {
      return { ok: false, reason: "images_render_failed" };
    }

    return { ok: true, images: images };
  }

  global.CdImageExecutor = {
    MOTOR: MOTOR,
    CD_IMAGES_INCOMPLETE: CD_IMAGES_INCOMPLETE,
    applyToDocument: applyToDocument,
  };
})(typeof window !== "undefined" ? window : globalThis);
