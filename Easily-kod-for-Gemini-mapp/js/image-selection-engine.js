/**
 * Intelligent Image Selection Engine (ISE) for Easily.
 * Evaluates business context, section strategy, design mood, and visual consistency.
 */
(function (global) {
  "use strict";

  /** @typedef {"hero"|"about"|"card"|"gallery"} SectionKind */

  function simpleHash(s) {
    let h = 0;
    const str = String(s || "");
    for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
    return Math.abs(h);
  }

  function buildUrl(photoId, w, h) {
    return (
      "https://images.unsplash.com/" +
      photoId +
      "?auto=format&fit=crop&w=" +
      w +
      "&h=" +
      h +
      "&q=80"
    );
  }

  function normalizeTemplate(t) {
    const r = (t || "editorial").trim();
    const leg = {
      "modern-agency": "editorial",
      "minimal-portfolio": "swiss-grid",
      event: "landmark",
      restaurant: "atelier",
      "neo-brutal": "landmark",
    };
    const x = leg[r] || r;
    const ok = new Set(["editorial", "atelier", "swiss-grid", "luxury-brand", "landmark"]);
    return ok.has(x) ? x : "editorial";
  }

  function moodForTemplate(template) {
    const t = normalizeTemplate(template);
    if (t === "luxury-brand") return "lux";
    if (t === "swiss-grid" || t === "landmark") return "sharp";
    return "soft";
  }

  function tagOverlap(a, b) {
    if (!a || !b || !a.length || !b.length) return 0;
    let n = 0;
    a.forEach(function (t) {
      if (b.indexOf(t) >= 0) n++;
    });
    return n;
  }

  function extractServices(doc) {
    const cards = doc && doc.sections && doc.sections.services && doc.sections.services.cards;
    if (!Array.isArray(cards)) return [];
    return cards
      .map(function (c) {
        return String((c && c.title) || "").trim();
      })
      .filter(Boolean);
  }

  function extractPurpose(doc) {
    const page = (doc && doc.page) || {};
    if (page.onboardingDescription) return String(page.onboardingDescription).slice(0, 400);
    const lead =
      doc && doc.sections && doc.sections.hero && doc.sections.hero.content && doc.sections.hero.content["hero-lead"];
    return String(lead || "").slice(0, 400);
  }

  function collectUsedPhotoIds(doc) {
    const used = [];
    const IC = global.ImageCatalog;
    if (!IC || !IC.photoIdFromUrl) return used;
    const page = doc && doc.page;
    if (page && page.heroBgUrl) {
      const id = IC.photoIdFromUrl(page.heroBgUrl);
      if (id) used.push(id);
    }
    const about = doc && doc.sections && doc.sections.about;
    if (about && about.imageUrl) {
      const id = IC.photoIdFromUrl(about.imageUrl);
      if (id) used.push(id);
    }
    const cards = doc && doc.sections && doc.sections.services && doc.sections.services.cards;
    if (Array.isArray(cards)) {
      cards.forEach(function (c) {
        const id = c && c.img && IC.photoIdFromUrl(c.img);
        if (id) used.push(id);
      });
    }
    const gallery = doc && doc.sections && doc.sections.gallery && doc.sections.gallery.images;
    if (Array.isArray(gallery)) {
      gallery.forEach(function (u) {
        const id = IC.photoIdFromUrl(u);
        if (id) used.push(id);
      });
    }
    return used;
  }

  /**
   * Build full selection context from document + options.
   * @param {object} doc
   * @param {object} opts
   */
  function buildContext(doc, opts) {
    opts = opts || {};
    const IC = global.ImageCatalog;
    const page = (doc && doc.page) || {};
    const industry = opts.industry || page.industry || "verksamhet";
    const template = opts.template || page.template || "editorial";
    const mood = moodForTemplate(template);
    const section = opts.section || opts.kind || "hero";
    const briefText = String(
      opts.userText || page.onboardingDescription || page.textLogoSubline || "",
    ).trim();
    const theme =
      opts.theme ||
      (briefText && IC && IC.parseThemeFromText ? IC.parseThemeFromText(briefText) : null);
    const profileKey =
      industry === "verksamhet" && theme && theme.id ? industry : industry;
    const industryProfile =
      (IC && IC.INDUSTRY_PROFILES && IC.INDUSTRY_PROFILES[profileKey]) ||
      (IC && IC.INDUSTRY_PROFILES && IC.INDUSTRY_PROFILES.verksamhet) ||
      (IC && IC.INDUSTRY_PROFILES.konsult);
    const strategy =
      (IC && IC.SECTION_STRATEGIES && IC.SECTION_STRATEGIES[section]) || (IC && IC.SECTION_STRATEGIES.hero);

    return {
      doc: doc || { page: {} },
      industry: industry,
      template: template,
      mood: mood,
      section: section,
      strategy: strategy,
      industryProfile: industryProfile,
      theme: theme,
      themeProfile:
        (opts.theme && opts.theme.profile) ||
        (theme && IC && IC.THEME_PROFILES ? IC.THEME_PROFILES[theme.id] : null),
      services: extractServices(doc),
      purpose: extractPurpose(doc),
      designFamily: page.designColorSetId || page.theme || "",
      imageStyle: page.imageStyle || "",
      heroLayout: page.heroLayout || "center",
      cardIndex: Number(opts.cardIndex) >= 0 ? Number(opts.cardIndex) : 0,
      galleryIndex: Number(opts.galleryIndex) >= 0 ? Number(opts.galleryIndex) : 0,
      nonce: opts.nonce != null ? opts.nonce : Date.now() + Math.random(),
      excludeIds: (opts.excludeIds || []).concat(collectUsedPhotoIds(doc)),
      userText: briefText || String(opts.userText || ""),
    };
  }

  function scoreEntry(entry, ctx) {
    if (!entry || entry.blocked) return -1000;

    const IC = global.ImageCatalog;
    const strategy = ctx.strategy || {};
    const industryProfile = ctx.industryProfile || {};
    let score = entry.quality || 6;

    if (entry.sections && entry.sections.length && entry.sections.indexOf(ctx.section) < 0) {
      score -= 4;
    }

    if (entry.industries && entry.industries.length && entry.industries.indexOf(ctx.industry) >= 0) {
      score += 8;
    }

    if (ctx.industry === "miljo" && ctx.section === "hero") {
      const recyclingTags = ["recycling", "waste", "container", "sorting", "industrial", "environment", "sustainability", "green"];
      const officeTags = ["office", "office-soft", "architect", "blueprint", "corporate", "business-meeting", "planning", "skyscraper", "whiteboard", "documents", "carpenter", "wood", "tools"];
      if (entry.industries && entry.industries.indexOf("miljo") >= 0) score += 6;
      if (entry.industries && entry.industries.indexOf("miljo") < 0 && tagOverlap(entry.tags, recyclingTags) === 0) {
        score -= 28;
      }
      score -= tagOverlap(entry.tags, officeTags) * 16;
      score += tagOverlap(entry.tags, recyclingTags) * 4;
    }

    const animalIndustries = ["hundsalong", "hunddagis"];
    if (animalIndustries.indexOf(ctx.industry) < 0) {
      score -= tagOverlap(entry.tags, ["dog", "pet", "grooming", "puppy", "puppies"]) * 18;
    }

    if (entry.moods && entry.moods.indexOf(ctx.mood) >= 0) score += 2;

    score += tagOverlap(entry.tags, industryProfile.preferTags || []) * 3;
    score -= tagOverlap(entry.tags, industryProfile.avoidTags || []) * 12;

    if (ctx.themeProfile) {
      score += tagOverlap(entry.tags, ctx.themeProfile.preferTags || []) * 5;
      score -= tagOverlap(entry.tags, ctx.themeProfile.avoidTags || []) * 15;
    }

    score += tagOverlap(entry.tags, strategy.preferTags || []) * 2;
    score -= tagOverlap(entry.tags, strategy.avoidTags || []) * 14;

    if (ctx.section === "hero") {
      if (strategy.orientation && strategy.orientation.indexOf(entry.orientation) < 0) score -= 3;
      if (strategy.minHeadlineSpace && (entry.headlineSpace || 0) < strategy.minHeadlineSpace) score -= 6;
      if (strategy.forbidText && entry.hasText) score -= 20;
      if (strategy.requireRealistic && entry.quality < 6) score -= 4;
    }

    if (ctx.section === "about") {
      if (strategy.preferPeople && entry.hasPeople) score += 6;
      if (strategy.preferPeople && !entry.hasPeople) score -= 3;
    }

    if (ctx.excludeIds && ctx.excludeIds.indexOf(entry.id) >= 0) score -= 8;

    if (ctx.section === "card" && ctx.cardIndex > 0) {
      score += (simpleHash(entry.id + "|card|" + ctx.cardIndex) % 5) * 0.2;
    }
    if (ctx.section === "gallery" && ctx.galleryIndex > 0) {
      score += (simpleHash(entry.id + "|gal|" + ctx.galleryIndex) % 7) * 0.15;
    }

    return score;
  }

  function candidateEntries(ctx) {
    const IC = global.ImageCatalog;
    if (!IC || !IC.allEntries) return [];
    return IC.allEntries().filter(function (entry) {
      if (!entry || entry.blocked) return false;
      if (entry.sections && entry.sections.length && entry.sections.indexOf(ctx.section) < 0) {
        if (entry.industries.indexOf(ctx.industry) < 0) return false;
      }
      return scoreEntry(entry, ctx) > -100;
    });
  }

  function pickFromCandidates(candidates, ctx) {
    if (!candidates.length) return null;
    const scored = candidates
      .map(function (entry) {
        return { entry: entry, score: scoreEntry(entry, ctx) };
      })
      .sort(function (a, b) {
        return b.score - a.score;
      });

    const topN = Math.min(8, scored.length);
    const salt = String(ctx.nonce) + "|" + ctx.section + "|" + ctx.industry;
    const pickIdx = simpleHash(salt) % topN;
    return scored[pickIdx].entry;
  }

  /**
   * Pick single image URL for context.
   * @param {object} docOrContext — document or prebuilt context
   * @param {object} [opts]
   */
  function pick(docOrContext, opts) {
    opts = opts || {};
    const ctx =
      docOrContext && docOrContext.strategy && docOrContext.section
        ? docOrContext
        : buildContext(docOrContext || {}, opts);
    const strategy = ctx.strategy || {};
    const dims = strategy.dimensions || { w: 1920, h: 1080 };

    let candidates = candidateEntries(ctx);
    if (!candidates.length && global.ImageCatalog) {
      candidates = global.ImageCatalog.allEntries().filter(function (e) {
        return e && !e.blocked;
      });
    }

    const chosen = pickFromCandidates(candidates, ctx);
    if (!chosen) return picsumFallback(ctx.section, ctx.nonce);
    return buildUrl(chosen.id, dims.w, dims.h);
  }

  /**
   * Pick N diverse URLs (gallery/cards).
   */
  function pickMany(doc, opts, count) {
    opts = opts || {};
    count = Math.max(1, Number(count) || 1);
    const urls = [];
    const usedIds = (opts.excludeIds || []).slice();
    for (let i = 0; i < count; i++) {
      const loopOpts = Object.assign({}, opts, {
        nonce: (opts.nonce != null ? opts.nonce : Date.now()) + i * 997,
        cardIndex: opts.section === "card" ? i : opts.cardIndex,
        galleryIndex: opts.section === "gallery" ? i : opts.galleryIndex,
        excludeIds: usedIds.slice(),
      });
      const url = pick(doc, loopOpts);
      urls.push(url);
      const IC = global.ImageCatalog;
      const id = IC && IC.photoIdFromUrl ? IC.photoIdFromUrl(url) : null;
      if (id) usedIds.push(id);
    }
    return urls;
  }

  function picsumFallback(section, salt) {
    const dim =
      section === "hero"
        ? "1920/1080"
        : section === "about"
          ? "800/900"
          : section === "card"
            ? "640/400"
            : "800/600";
    const enc = encodeURIComponent("fb-" + section + "-" + String(salt));
    return "https://picsum.photos/seed/" + enc + "/" + dim;
  }

  function isManagedStock(url) {
    const u = String(url || "").trim().toLowerCase();
    if (!u) return true;
    return u.includes("picsum.photos") || u.includes("images.unsplash.com");
  }

  function isPlaceholderStock(url) {
    const u = String(url || "").trim().toLowerCase();
    return !u || u.includes("picsum.photos");
  }

  function applyToDocument(doc, opts) {
    const IIE = global.ImageIntelligenceEngine;
    if (IIE && typeof IIE.applyToDocument === "function") {
      return IIE.applyToDocument(doc, opts);
    }
    if (!doc || !doc.page) return doc;
    opts = opts || {};
    const replaceStock = !!opts.replaceStock;
    const shouldReplace = replaceStock ? isManagedStock : isPlaceholderStock;
    const userText = String(opts.userText || doc.page.onboardingDescription || "").trim();
    const pickOpts = function (section, extra) {
      return Object.assign({ section: section, userText: userText, nonce: Date.now() }, extra || {});
    };

    const heroUrl = pick(doc, pickOpts("hero"));
    if (shouldReplace(doc.page.heroBgUrl)) {
      doc.page.heroBgUrl = heroUrl;
      if (doc.page.material) doc.page.material.heroImageUrl = heroUrl;
    }

    if (doc.sections && doc.sections.about && shouldReplace(doc.sections.about.imageUrl)) {
      const aboutUrl = pick(doc, pickOpts("about", { nonce: Date.now() + 1 }));
      doc.sections.about.imageUrl = aboutUrl;
      if (doc.page.material) doc.page.material.aboutImageUrl = aboutUrl;
    }

    const cards = doc.sections && doc.sections.services && doc.sections.services.cards;
    if (Array.isArray(cards)) {
      for (let i = 0; i < Math.min(3, cards.length); i++) {
        if (cards[i] && shouldReplace(cards[i].img)) {
          cards[i].img = pick(doc, pickOpts("card", { cardIndex: i, nonce: Date.now() + 10 + i }));
        }
      }
      if (doc.page.material) {
        doc.page.material.serviceImages = cards.map(function (c) {
          return (c && c.img) || "";
        });
      }
    }

    const imgs = doc.sections && doc.sections.gallery && doc.sections.gallery.images;
    if (Array.isArray(imgs)) {
      const galleryUrls = pickMany(
        doc,
        pickOpts("gallery", { nonce: Date.now() + 20 }),
        Math.min(4, imgs.length),
      );
      for (let j = 0; j < Math.min(4, imgs.length, galleryUrls.length); j++) {
        if (shouldReplace(imgs[j])) imgs[j] = galleryUrls[j];
      }
      if (doc.page.material) {
        doc.page.material.galleryImages = imgs.slice();
      }
    }

    return doc;
  }

  function defaultsFor(industry, template) {
    const doc = { page: { industry: industry, template: template }, sections: {} };
    return {
      heroBgUrl: pick(doc, { section: "hero", industry: industry, template: template, nonce: "def-hero" }),
      about: pick(doc, { section: "about", industry: industry, template: template, nonce: "def-about" }),
      cards: pickMany(doc, { section: "card", industry: industry, template: template, nonce: "def-cards" }, 3),
      gallery: pickMany(doc, { section: "gallery", industry: industry, template: template, nonce: "def-gal" }, 4),
    };
  }

  global.ImageSelectionEngine = {
    buildContext: buildContext,
    buildUrl: buildUrl,
    scoreEntry: scoreEntry,
    pick: pick,
    pickMany: pickMany,
    applyToDocument: applyToDocument,
    defaultsFor: defaultsFor,
    moodForTemplate: moodForTemplate,
    normalizeTemplate: normalizeTemplate,
    isManagedStock: isManagedStock,
    isPlaceholderStock: isPlaceholderStock,
    picsumFallback: picsumFallback,
  };
})(typeof window !== "undefined" ? window : globalThis);
