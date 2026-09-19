/**
 * Unified image apply: state patch + save + preview remount + hero sync.
 * Single entry point to avoid stale state overwriting fresh picks.
 */
(function (global) {
  "use strict";

  function canonicalUrl(raw) {
    const HIU = global.HeroImageUrl;
    if (HIU && typeof HIU.canonical === "function") {
      return HIU.canonical(raw) || String(raw || "").trim();
    }
    return String(raw || "").trim();
  }

  /**
   * Apply one section image to document state and refresh preview.
   * @param {"hero"|"about"|"card"|"gallery"} section
   * @param {string} url
   * @param {{ cardIndex?: number; galleryIndex?: number; skipRemount?: boolean }} [opts]
   */
  function applySectionImage(section, url, opts) {
    opts = opts || {};
    const SS = global.SiteState;
    const EE = global.EditorEngine;
    const stored = canonicalUrl(url);
    if (!SS || !SS.patch || !stored) return false;

    SS.patch(function (doc) {
      if (!doc.page) doc.page = {};
      if (!doc.page.material) doc.page.material = {};
      if (section === "hero") {
        doc.page.heroBgUrl = stored;
        doc.page.material.heroImageUrl = stored;
      } else if (section === "about") {
        if (!doc.sections) doc.sections = {};
        if (!doc.sections.about) doc.sections.about = { content: {}, hidden: false };
        doc.sections.about.imageUrl = stored;
        doc.sections.about.hidden = false;
        doc.page.material.aboutImageUrl = stored;
      } else if (section === "card") {
        const i = Number(opts.cardIndex) >= 0 ? Number(opts.cardIndex) : 0;
        if (doc.sections && doc.sections.services && doc.sections.services.cards && doc.sections.services.cards[i]) {
          doc.sections.services.cards[i].img = stored;
          if (!doc.page.material.serviceImages) doc.page.material.serviceImages = ["", "", ""];
          doc.page.material.serviceImages[i] = stored;
        }
      } else if (section === "gallery") {
        const gi = Number(opts.galleryIndex) >= 0 ? Number(opts.galleryIndex) : 0;
        if (!doc.sections) doc.sections = {};
        if (!doc.sections.gallery) doc.sections.gallery = { images: [], hidden: false };
        if (!Array.isArray(doc.sections.gallery.images)) doc.sections.gallery.images = [];
        while (doc.sections.gallery.images.length <= gi) doc.sections.gallery.images.push("");
        doc.sections.gallery.images[gi] = stored;
        doc.sections.gallery.hidden = false;
        if (!doc.page.material.galleryImages) doc.page.material.galleryImages = [];
        doc.page.material.galleryImages = doc.sections.gallery.images.slice();
      }
    });
    SS.save();

    if (!opts.skipRemount && EE && typeof EE.remount === "function") {
      EE.remount();
    }
    if (section === "hero" && EE && typeof EE.syncHeroFromState === "function") {
      EE.syncHeroFromState();
    }
    return true;
  }

  /**
   * Pick via ISE and apply in one step.
   */
  function pickAndApply(doc, opts) {
    const ISE = global.ImageSelectionEngine;
    if (!ISE || typeof ISE.pick !== "function") return "";
    const section = opts.section || "hero";
    const url = ISE.pick(doc || {}, opts);
    applySectionImage(section, url, opts);
    return url;
  }

  /**
   * Replace blocked or corrupt image URLs when loading saved projects.
   */
  function migrateBlockedImages(doc) {
    if (!doc || !doc.page) return false;
    const IC = global.ImageCatalog;
    const ISE = global.ImageSelectionEngine;
    const HIU = global.HeroImageUrl;
    if (!IC || !IC.isBlockedUrl) return false;
    let changed = false;

    function replaceIfBlocked(url, picker) {
      if (!url || !IC.isBlockedUrl(url)) return url;
      const next = picker ? picker() : HIU && HIU.recoverHeroUrl ? HIU.recoverHeroUrl(doc) : "";
      if (next && next !== url) {
        changed = true;
        return next;
      }
      return url;
    }

    if (doc.page.heroBgUrl) {
      const fixed = replaceIfBlocked(doc.page.heroBgUrl, function () {
        return ISE && ISE.pick
          ? ISE.pick(doc, {
              section: "hero",
              industry: doc.page.industry || "byggfirma",
              userText: doc.page.industry === "byggfirma" ? "snickare verktyg trä" : "",
              nonce: Date.now(),
            })
          : HIU.recoverHeroUrl(doc);
      });
      if (fixed !== doc.page.heroBgUrl) {
        doc.page.heroBgUrl = fixed;
        if (doc.page.material) doc.page.material.heroImageUrl = fixed;
      }
    }

    const about = doc.sections && doc.sections.about;
    if (about && about.imageUrl) {
      const fixedAbout = replaceIfBlocked(about.imageUrl, function () {
        return ISE && ISE.pick ? ISE.pick(doc, { section: "about", nonce: Date.now() }) : "";
      });
      if (fixedAbout && fixedAbout !== about.imageUrl) {
        about.imageUrl = fixedAbout;
        if (doc.page.material) doc.page.material.aboutImageUrl = fixedAbout;
      }
    }

    return changed;
  }

  global.ImageApply = {
    applySectionImage: applySectionImage,
    pickAndApply: pickAndApply,
    canonicalUrl: canonicalUrl,
    migrateBlockedImages: migrateBlockedImages,
  };
})(typeof window !== "undefined" ? window : globalThis);
