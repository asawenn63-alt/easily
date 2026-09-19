/**
 * Image Intelligence Engine — professional image selection for Easily.
 *
 * Collects candidates, scores against business + section + design memory,
 * rejects weak/repeated images, selects the best.
 *
 * Pipeline: Intent → Design Memory → Edit Session → Execution → IIE.selectBest
 */
(function (global) {
  "use strict";

  const LOG_TAG = "[Easily · image-intel]";
  const SCHEMA_VERSION = 1;
  const MIN_QUALITY = 0.58;
  const MIN_DOMAIN_RELEVANCE = 0.38;
  const CATALOG_POOL = 48;
  const GENERATED_POOL = 16;
  const TOP_CONSIDER = 12;

  /** Tags that signal quality/trust — never count toward business-domain relevance. */
  const GENERIC_QUALITY_TAGS = [
    "professional",
    "authentic",
    "trust",
    "people",
    "natural",
    "relevant",
    "business",
    "team",
    "office-soft",
  ];

  /** Hero layout tags — composition only, not business domain. */
  const LAYOUT_COMPOSITION_TAGS = [
    "landscape",
    "focal-point",
    "headline-space",
    "clean-composition",
    "portrait",
    "square",
    "simple",
    "minimal",
  ];

  const GENERIC_CATCHALL_INDUSTRIES = { verksamhet: true, konsult: true };

  const SECTION_RULES = {
    hero: {
      label: "Hero",
      landscape: true,
      minHeadlineSpace: 6,
      strongFocalPoint: true,
      professionalFirstImpression: true,
      weights: {
        textOverlaySuitability: 0.14,
        visualFocus: 0.12,
        composition: 0.12,
        sectionSuitability: 0.1,
      },
    },
    about: {
      label: "About",
      preferPeople: true,
      trust: true,
      authentic: true,
      natural: true,
      weights: {
        humanQuality: 0.16,
        authenticity: 0.14,
        sectionSuitability: 0.1,
      },
    },
    gallery: {
      label: "Gallery",
      completedWork: true,
      variation: true,
      realProjects: true,
      weights: {
        authenticity: 0.12,
        sectionSuitability: 0.12,
        composition: 0.08,
      },
    },
    card: {
      label: "Services",
      serviceIllustration: true,
      simpleComposition: true,
      cleanBackground: true,
      weights: {
        sectionSuitability: 0.14,
        composition: 0.12,
        visualFocus: 0.08,
      },
    },
  };

  /** Style words → measurable requirements */
  const STYLE_LEXICON = {
    premium: {
      moods: ["lux", "elegant"],
      lighting: "controlled premium",
      minQuality: 7,
      preferTags: ["premium", "luxury", "elegant", "high-end"],
      avoidTags: ["cheap", "clipart", "cartoon"],
      modernBoost: 0.15,
    },
    luxury: {
      moods: ["lux"],
      lighting: "dramatic controlled",
      minQuality: 7,
      preferTags: ["luxury", "premium", "exclusive"],
      avoidTags: ["casual", "snapshot"],
      modernBoost: 0.1,
    },
    nordic: {
      moods: ["soft"],
      lighting: "soft nordic daylight",
      preferTags: ["scandinavian", "nordic", "minimal", "natural light"],
      avoidTags: ["busy", "neon", "cluttered"],
      colorTemp: "cool-neutral",
    },
    scandinavian: {
      moods: ["soft"],
      lighting: "soft nordic daylight",
      preferTags: ["scandinavian", "nordic", "minimal", "bright"],
      avoidTags: ["dark", "heavy"],
      colorTemp: "cool-neutral",
    },
    minimal: {
      moods: ["soft", "sharp"],
      preferTags: ["minimal", "clean", "simple", "white space"],
      avoidTags: ["busy", "cluttered", "crowded"],
      composition: "clean",
    },
    warm: {
      moods: ["soft"],
      lighting: "soft warm daylight",
      preferTags: ["warm", "cozy", "welcoming"],
      colorTemp: "warm",
    },
    modern: {
      moods: ["sharp", "soft"],
      preferTags: ["modern", "contemporary", "clean"],
      avoidTags: ["dated", "vintage-only"],
      modernBoost: 0.2,
    },
    rustic: {
      preferTags: ["rustic", "wood", "natural", "craft", "organic"],
      avoidTags: ["corporate", "office", "tech"],
      authenticityBoost: 0.15,
    },
    industrial: {
      preferTags: ["industrial", "concrete", "metal", "warehouse"],
      avoidTags: ["soft pastel", "salon"],
      mood: "Professional",
    },
    elegant: {
      moods: ["lux", "soft"],
      preferTags: ["elegant", "refined", "sophisticated"],
      minQuality: 6,
      modernBoost: 0.1,
    },
    playful: {
      preferTags: ["playful", "bright", "colorful", "fun"],
      avoidTags: ["corporate", "serious-only"],
      mood: "Friendly",
    },
  };

  function log(stage, payload) {
    try {
      console.info(LOG_TAG, Object.assign({ stage: stage, t: Date.now() }, payload || {}));
    } catch (e) {
      /* ignore */
    }
  }

  /** Structured audit row for every candidate considered. */
  function logCandidateAudit(row) {
    log("CANDIDATE", {
      searchQuery: row.searchQuery || "",
      businessCategory: row.businessCategory || "",
      photoId: row.photoId || "",
      tags: row.tags || [],
      relevanceScore: row.relevanceScore != null ? row.relevanceScore : null,
      rejectionReason: row.rejectionReason || null,
      finalSelectionReason: row.finalSelectionReason || null,
      source: row.source || "",
    });
  }

  function normalizeUrl(url) {
    return String(url || "")
      .trim()
      .split("?")[0]
      .replace(/\/+$/, "");
  }

  function kindToSection(kind) {
    if (kind === "card") return "card";
    if (kind === "services") return "card";
    return kind || "hero";
  }

  function kindToTargetKey(kind) {
    const k = kindToSection(kind);
    if (k === "hero") return "hero:image";
    if (k === "about") return "about:image";
    if (k === "gallery") return "gallery:image";
    if (k === "card") return "services:image";
    return k + ":image";
  }

  function tagOverlap(tags, list) {
    if (!tags || !list || !list.length) return 0;
    let n = 0;
    tags.forEach(function (t) {
      if (list.indexOf(t) >= 0) n++;
    });
    return n;
  }

  function uniqueTags(list) {
    const out = [];
    (list || []).forEach(function (t) {
      if (t && out.indexOf(t) < 0) out.push(t);
    });
    return out;
  }

  /** Strip generic quality + layout tags — only domain-specific tags remain. */
  function domainSpecificTags(list) {
    return uniqueTags(
      (list || []).filter(function (t) {
        return GENERIC_QUALITY_TAGS.indexOf(t) < 0 && LAYOUT_COMPOSITION_TAGS.indexOf(t) < 0;
      }),
    );
  }

  /**
   * Domain context for inferred business — built from catalog industry + theme profiles.
   * Generic for all industries; no hardcoded photo IDs.
   */
  function buildDomainContext(selCtx, bizCategory) {
    bizCategory = bizCategory || resolveBusinessCategory(selCtx);
    const IC = global.ImageCatalog;
    const ctx = (selCtx && selCtx.ctx) || {};
    const industry = bizCategory.industry;
    const industryProfile =
      ctx.industryProfile || (IC && IC.INDUSTRY_PROFILES && IC.INDUSTRY_PROFILES[industry]) || {};
    let themeProfile = ctx.themeProfile || null;
    if (!themeProfile && bizCategory.themeId && IC && IC.THEME_PROFILES) {
      themeProfile = IC.THEME_PROFILES[bizCategory.themeId] || null;
    }

    const domainTags = domainSpecificTags(
      (industryProfile.preferTags || []).concat(themeProfile ? themeProfile.preferTags || [] : []),
    );
    const avoidTags = uniqueTags(
      (industryProfile.avoidTags || []).concat(themeProfile ? themeProfile.avoidTags || [] : []),
    );

    const foreignByIndustry = {};
    if (IC && IC.INDUSTRY_PROFILES) {
      Object.keys(IC.INDUSTRY_PROFILES).forEach(function (key) {
        if (key === industry || GENERIC_CATCHALL_INDUSTRIES[key]) return;
        foreignByIndustry[key] = domainSpecificTags(IC.INDUSTRY_PROFILES[key].preferTags);
      });
    }

    return {
      industry: industry,
      domainTags: domainTags,
      avoidTags: avoidTags,
      foreignByIndustry: foreignByIndustry,
    };
  }

  /** Domain relevance — generic quality tags excluded. */
  function computeDomainRelevance(entry, domainCtx) {
    if (!entry) return 0;
    const tags = entry.tags || [];
    let score = 0;

    if (entry.industries && entry.industries.indexOf(domainCtx.industry) >= 0) {
      score += 0.45;
    }

    const domainHits = tagOverlap(tags, domainCtx.domainTags);
    score += Math.min(0.55, domainHits * 0.14);

    const avoidHits = tagOverlap(tags, domainCtx.avoidTags);
    score -= avoidHits * 0.22;

    return Math.max(0, Math.min(1, Math.round(score * 1000) / 1000));
  }

  function hasExclusiveForeignDomain(entry, domainCtx) {
    const tags = entry.tags || [];
    const industries = entry.industries || [];
    const domainHits = tagOverlap(tags, domainCtx.domainTags);
    const industryMatch = industries.indexOf(domainCtx.industry) >= 0;

    if (industryMatch) return false;

    if (industries.length > 0) {
      const onlyGenericForeign = industries.every(function (ind) {
        return !!GENERIC_CATCHALL_INDUSTRIES[ind];
      });
      if (!onlyGenericForeign && domainHits === 0) return true;
    }

    if (domainHits === 0) {
      const keys = Object.keys(domainCtx.foreignByIndustry);
      for (let i = 0; i < keys.length; i++) {
        if (tagOverlap(tags, domainCtx.foreignByIndustry[keys[i]]) > 0) return true;
      }
    }

    return false;
  }

  /** Whether catalog entry belongs to the inferred business domain (pool filter). */
  function belongsToBusinessDomain(entry, domainCtx) {
    if (!entry || entry.blocked) return false;
    const tags = entry.tags || [];
    const industries = entry.industries || [];

    if (tagOverlap(tags, domainCtx.avoidTags) > 0) return false;

    const domainHits = tagOverlap(tags, domainCtx.domainTags);
    const industryMatch = industries.indexOf(domainCtx.industry) >= 0;

    if (domainHits > 0 || industryMatch) {
      return !hasExclusiveForeignDomain(entry, domainCtx);
    }

    if (GENERIC_CATCHALL_INDUSTRIES[domainCtx.industry]) {
      if (industries.indexOf("verksamhet") >= 0 || industries.indexOf("konsult") >= 0) {
        return !hasExclusiveForeignDomain(entry, domainCtx);
      }
    }

    return false;
  }

  /** Quality-only boost from generic tags — applied after domain gate in composition scoring. */
  function genericQualityBoost(tags) {
    return Math.min(0.18, tagOverlap(tags, GENERIC_QUALITY_TAGS) * 0.04);
  }

  function normalizeSearchText(raw) {
    return String(raw || "")
      .toLowerCase()
      .replace(/å/g, "a")
      .replace(/ä/g, "a")
      .replace(/ö/g, "o")
      .normalize("NFD")
      .replace(/\u0300-\u036f/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function collectBusinessSignals(selCtx) {
    const ctx = selCtx.ctx || {};
    const doc = selCtx.doc || ctx.doc || null;
    const page = (doc && doc.page) || {};
    const parts = [
      selCtx.enrichedText,
      ctx.userText,
      page.onboardingDescription,
      page.brand,
      page.textLogo,
      page.textLogoSubline,
    ];
    const hero = doc && doc.sections && doc.sections.hero && doc.sections.hero.content;
    if (hero) {
      parts.push(hero["hero-title"], hero["hero-lead"]);
    }
    const services = doc && doc.sections && doc.sections.services && doc.sections.services.cards;
    if (Array.isArray(services)) {
      services.slice(0, 3).forEach(function (c) {
        if (c && c.title) parts.push(c.title);
      });
    }
    return {
      doc: doc,
      page: page,
      industry: ctx.industry || page.industry || "verksamhet",
      text: normalizeSearchText(parts.filter(Boolean).join(" ")),
    };
  }

  /** Step 1 — business classification for image selection (theme + page industry only). */
  function inferIndustryFromSignals(signals, themeId) {
    if (signals.industry === "miljo") return "miljo";
    if (themeId === "recycling") return "miljo";
    return signals.industry;
  }

  function applyEffectiveIndustry(selCtx, industry) {
    if (!selCtx || !selCtx.ctx || !industry || selCtx.ctx.industry === industry) return;
    const IC = global.ImageCatalog;
    const ISE = global.ImageSelectionEngine;
    selCtx.ctx.industry = industry;
    selCtx.ctx.industryProfile =
      (IC && IC.INDUSTRY_PROFILES && IC.INDUSTRY_PROFILES[industry]) ||
      selCtx.ctx.industryProfile;
    if (IC && IC.THEME_PROFILES && IC.THEME_PROFILES.recycling && industry === "miljo") {
      selCtx.ctx.theme = { id: "recycling", profile: IC.THEME_PROFILES.recycling };
    }
    if (ISE && selCtx.doc && typeof ISE.buildContext === "function") {
      const rebuilt = ISE.buildContext(selCtx.doc, {
        section: selCtx.section,
        kind: selCtx.section,
        industry: industry,
        userText: selCtx.enrichedText,
        cardIndex: selCtx.ctx.cardIndex,
        galleryIndex: selCtx.ctx.galleryIndex,
        nonce: selCtx.ctx.nonce,
        theme: industry === "miljo" ? { id: "recycling" } : selCtx.ctx.theme,
      });
      selCtx.ctx = rebuilt;
    }
  }

  function resolveBusinessCategory(selCtx) {
    const signals = collectBusinessSignals(selCtx);
    let themeId = selCtx.ctx && selCtx.ctx.theme && selCtx.ctx.theme.id ? selCtx.ctx.theme.id : null;
    const IC = global.ImageCatalog;
    if (!themeId && IC && IC.parseThemeFromText && signals.text) {
      const parsed = IC.parseThemeFromText(signals.text);
      if (parsed && parsed.id) themeId = parsed.id;
    }
    const industry = inferIndustryFromSignals(signals, themeId);
    applyEffectiveIndustry(selCtx, industry);

    return {
      industry: industry,
      themeId: themeId,
      primaryBusiness: industry,
      searchText: signals.text,
    };
  }

  /** Step 2 — search query generation (used for logging + generated pool hints). */
  function buildSearchQuery(selCtx, bizCategory) {
    bizCategory = bizCategory || resolveBusinessCategory(selCtx);
    const ctx = selCtx.ctx || {};
    const profile = ctx.industryProfile || {};
    const prefer = (profile.preferTags || []).slice(0, 4).join(" ");
    const purpose = String(ctx.purpose || "").slice(0, 120);
    return [prefer, purpose, selCtx.enrichedText || ""].filter(Boolean).join(" — ").slice(0, 240);
  }

  function candidatePhotoId(candidate) {
    return photoId(candidate.url);
  }

  function candidateTags(candidate) {
    const entry = candidate.entry || entryFromUrl(candidate.url);
    return (entry && entry.tags) || [];
  }

  /** Step 4/5 — domain gate before scoring and final pick. */
  function evaluateCandidateRejection(candidate, selCtx, bizCategory) {
    bizCategory = bizCategory || resolveBusinessCategory(selCtx);
    const entry = candidate.entry || entryFromUrl(candidate.url);

    if (entry && entry.blocked) {
      return { rejected: true, reason: entry.blockReason || "catalog blocked" };
    }

    if (!entry) {
      return { rejected: true, reason: "unknown catalog entry" };
    }

    const domainCtx = buildDomainContext(selCtx, bizCategory);

    if (!belongsToBusinessDomain(entry, domainCtx)) {
      return { rejected: true, reason: "outside inferred business domain" };
    }

    const domainRelevance = computeDomainRelevance(entry, domainCtx);
    if (domainRelevance < MIN_DOMAIN_RELEVANCE) {
      return { rejected: true, reason: "insufficient domain relevance" };
    }

    return { rejected: false, reason: "", domainRelevance: domainRelevance };
  }

  function normalizeIseScore(raw) {
    return Math.max(0, Math.min(1, (Number(raw) + 8) / 32));
  }

  function loadState(doc) {
    doc = doc || (global.SiteState && global.SiteState.get && global.SiteState.get());
    if (!doc) return { rejected: {}, served: {} };
    if (!doc.meta) doc.meta = {};
    if (!doc.meta.imageIntelligence) {
      doc.meta.imageIntelligence = { version: SCHEMA_VERSION, rejected: {}, served: {} };
    }
    return doc.meta.imageIntelligence;
  }

  function persistState(state) {
    const SS = global.SiteState;
    if (!SS || !SS.patch) return;
    SS.patch(function (d) {
      if (!d.meta) d.meta = {};
      d.meta.imageIntelligence = JSON.parse(JSON.stringify(state));
    });
    SS.save && SS.save();
  }

  function getRejectedSet(kind) {
    const section = kindToSection(kind);
    const state = loadState();
    const list = (state.rejected && state.rejected[section]) || [];
    const set = {};
    list.forEach(function (u) {
      set[normalizeUrl(u)] = true;
    });
    return set;
  }

  function getServedList(kind) {
    const section = kindToSection(kind);
    const state = loadState();
    return ((state.served && state.served[section]) || []).slice();
  }

  function recordRejected(kind, url) {
    if (!url) return;
    const section = kindToSection(kind);
    const SS = global.SiteState;
    SS &&
      SS.patch(function (d) {
        const st = loadState(d);
        if (!st.rejected[section]) st.rejected[section] = [];
        const n = normalizeUrl(url);
        if (!st.rejected[section].some(function (u) {
          return normalizeUrl(u) === n;
        })) {
          st.rejected[section].push(url);
          if (st.rejected[section].length > 80) st.rejected[section].shift();
        }
        d.meta.imageIntelligence = st;
      });
    SS && SS.save && SS.save();
  }

  function recordServed(kind, url) {
    if (!url) return;
    const section = kindToSection(kind);
    const SS = global.SiteState;
    SS &&
      SS.patch(function (d) {
        const st = loadState(d);
        if (!st.served[section]) st.served[section] = [];
        st.served[section].push(url);
        if (st.served[section].length > 24) st.served[section].shift();
        d.meta.imageIntelligence = st;
      });
    SS && SS.save && SS.save();
  }

  function currentSectionUrl(kind) {
    const SS = global.SiteState;
    const doc = SS && SS.get ? SS.get() : null;
    if (!doc) return "";
    const section = kindToSection(kind);
    if (section === "hero") return (doc.page && doc.page.heroBgUrl) || "";
    if (section === "about" && doc.sections && doc.sections.about) return doc.sections.about.imageUrl || "";
    if (section === "gallery" && doc.sections && doc.sections.gallery && doc.sections.gallery.images) {
      return doc.sections.gallery.images[0] || "";
    }
    if (section === "card" && doc.sections && doc.sections.services && doc.sections.services.cards) {
      const c = doc.sections.services.cards[0];
      return (c && c.img) || "";
    }
    return "";
  }

  function isVariantRequest(text, opts) {
    opts = opts || {};
    if (opts.variant === "another" || opts.variant === "retry") return true;
    const s = String(text || "")
      .toLowerCase()
      .trim();
    return /^(igen|retry|pröva|prova|försök|another|en till|visa en till|annan|ny bild|byt den)/.test(s) ||
      /(modernare|premium|exklusiv|yngre|mörkare|ljusare|mer nordisk|mer varm)/.test(s);
  }

  /** Style translation — natural language → requirements */
  function translateStyle(userText) {
    const s = String(userText || "").toLowerCase();
    const merged = {
      moods: [],
      preferTags: [],
      avoidTags: [],
      lighting: "",
      minQuality: 5,
      modernBoost: 0,
      authenticityBoost: 0,
      colorTemp: "",
      mood: "",
    };

    Object.keys(STYLE_LEXICON).forEach(function (key) {
      if (s.indexOf(key) >= 0 || (key === "nordic" && /nordisk/.test(s)) || (key === "scandinavian" && /skandinav/.test(s))) {
        const row = STYLE_LEXICON[key];
        if (row.moods) merged.moods = merged.moods.concat(row.moods);
        if (row.preferTags) merged.preferTags = merged.preferTags.concat(row.preferTags);
        if (row.avoidTags) merged.avoidTags = merged.avoidTags.concat(row.avoidTags);
        if (row.lighting) merged.lighting = row.lighting;
        if (row.minQuality) merged.minQuality = Math.max(merged.minQuality, row.minQuality);
        if (row.modernBoost) merged.modernBoost += row.modernBoost;
        if (row.authenticityBoost) merged.authenticityBoost += row.authenticityBoost;
        if (row.colorTemp) merged.colorTemp = row.colorTemp;
        if (row.mood) merged.mood = row.mood;
      }
    });

    if (/modern/.test(s)) merged.modernBoost += 0.12;
    if (/premium|exklusiv|lyx/.test(s)) merged.minQuality = Math.max(merged.minQuality, 7);
    if (/yngre/.test(s)) merged.preferTags.push("young", "youthful");
    if (/mörk/.test(s)) merged.preferTags.push("dark", "moody");
    if (/ljus/.test(s)) merged.preferTags.push("bright", "light");

    return merged;
  }

  function buildEnrichedUserText(kind, opts) {
    opts = opts || {};
    const parts = [opts.userText];
    const DM = global.DesignMemoryEngine;
    const targetKey = kindToTargetKey(kind);
    if (DM && typeof DM.getConstraints === "function") {
      const c = DM.getConstraints(targetKey);
      if (c && c.pickHints && c.pickHints.length) parts.push(c.pickHints.join(", "));
    }
    const SS = global.SiteState;
    const doc = SS && SS.get ? SS.get() : null;
    if (doc && doc.page && doc.page.onboardingDescription) {
      parts.push(String(doc.page.onboardingDescription).slice(0, 200));
    }
    return parts.filter(Boolean).join(" — ");
  }

  function buildSelectionContext(kind, opts) {
    const ISE = global.ImageSelectionEngine;
    const SS = global.SiteState;
    const doc = SS && SS.get ? SS.get() : null;
    const section = kindToSection(kind);
    const enrichedText = buildEnrichedUserText(kind, opts);
    const styleReq = translateStyle(enrichedText);

    let ctx = { section: section, industry: "verksamhet", userText: enrichedText };
    if (ISE && typeof ISE.buildContext === "function") {
      ctx = ISE.buildContext(doc || { page: {} }, {
        section: section,
        kind: section,
        userText: enrichedText,
        cardIndex: opts.index || 0,
        galleryIndex: opts.index || 0,
        nonce: opts.nonce || Date.now(),
      });
    }

    inheritApprovedHeroStyle(section, styleReq);

    return {
      kind: kind,
      section: section,
      targetKey: kindToTargetKey(kind),
      doc: doc,
      ctx: ctx,
      styleReq: styleReq,
      enrichedText: enrichedText,
      rules: SECTION_RULES[section] || SECTION_RULES.hero,
    };
  }

  /** About/gallery/services inherit hero lighting & mood when hero image was accepted. */
  function inheritApprovedHeroStyle(section, styleReq) {
    if (section === "hero" || !styleReq) return;
    const DM = global.DesignMemoryEngine;
    if (!DM || typeof DM.getMemory !== "function") return;
    const memory = DM.getMemory();
    const heroImg = memory.sections && memory.sections.hero && memory.sections.hero.image;
    if (!heroImg) return;
    if (heroImg.lighting && heroImg.lighting.value && heroImg.lighting.status === "approved") {
      styleReq.lighting = styleReq.lighting || String(heroImg.lighting.value);
    }
    if (heroImg.mood && heroImg.mood.value && heroImg.mood.status === "approved") {
      styleReq.mood = styleReq.mood || String(heroImg.mood.value);
    }
    if (heroImg.photographyStyle && heroImg.photographyStyle.value && heroImg.photographyStyle.status === "approved") {
      styleReq.preferTags.push(String(heroImg.photographyStyle.value).toLowerCase());
    }
    if (heroImg.colorTemperature && heroImg.colorTemperature.value && heroImg.colorTemperature.status === "approved") {
      styleReq.colorTemp = styleReq.colorTemp || String(heroImg.colorTemperature.value);
    }
  }

  function rawPick(kind, opts) {
    if (global.MaterialSystem && typeof global.MaterialSystem.pickStockImageCandidate === "function") {
      return global.MaterialSystem.pickStockImageCandidate(kind, opts);
    }
    const ISE = global.ImageSelectionEngine;
    if (ISE && typeof ISE.pick === "function") {
      const SS = global.SiteState;
      return ISE.pick((SS && SS.get && SS.get()) || { page: {} }, opts);
    }
    return "";
  }

  /** Candidate pipeline — catalog + generated diversity */
  function gatherCandidates(selCtx, opts) {
    opts = opts || {};
    const seen = {};
    const out = [];
    const ISE = global.ImageSelectionEngine;
    const IC = global.ImageCatalog;
    const ctx = selCtx.ctx;
    const section = selCtx.section;
    const bizCategory = resolveBusinessCategory(selCtx);
    const searchQuery = buildSearchQuery(selCtx, bizCategory);

    function push(url, meta) {
      const n = normalizeUrl(url);
      if (!n || seen[n]) return;
      const candidate = Object.assign({ url: url }, meta || {});
      const rejection = evaluateCandidateRejection(candidate, selCtx, bizCategory);
      const scoredPreview = rejection.rejected ? null : scoreCandidate(candidate, selCtx);
      logCandidateAudit({
        searchQuery: searchQuery,
        businessCategory: bizCategory.primaryBusiness,
        photoId: candidatePhotoId(candidate),
        tags: candidateTags(candidate),
        relevanceScore: scoredPreview ? scoredPreview.overall : null,
        rejectionReason: rejection.rejected ? rejection.reason : null,
        source: (meta && meta.source) || "unknown",
      });
      if (rejection.rejected) return;
      seen[n] = true;
      out.push(candidate);
    }

    if (IC && IC.allEntries && ISE && typeof ISE.scoreEntry === "function") {
      const strategy = ctx.strategy || {};
      const dims = strategy.dimensions || { w: 1920, h: 1080 };
      const domainCtx = buildDomainContext(selCtx, bizCategory);
      const entries = IC.allEntries();
      const scored = entries
        .filter(function (entry) {
          if (!entry || entry.blocked) return false;
          return belongsToBusinessDomain(entry, domainCtx);
        })
        .map(function (entry) {
          return {
            entry: entry,
            domainRelevance: computeDomainRelevance(entry, domainCtx),
            iseRaw: ISE.scoreEntry(entry, ctx),
          };
        })
        .sort(function (a, b) {
          if (b.domainRelevance !== a.domainRelevance) return b.domainRelevance - a.domainRelevance;
          return b.iseRaw - a.iseRaw;
        })
        .slice(0, CATALOG_POOL);

      scored.forEach(function (row) {
        const url =
          ISE.buildUrl && row.entry.id
            ? ISE.buildUrl(row.entry.id, dims.w, dims.h)
            : "";
        if (url) {
          push(url, {
            entry: row.entry,
            iseRaw: row.iseRaw,
            domainRelevance: row.domainRelevance,
            source: "catalog",
          });
        }
      });
    }

    for (let i = 0; i < GENERATED_POOL; i++) {
      const url = rawPick(selCtx.kind, {
        userText: searchQuery || selCtx.enrichedText,
        index: opts.index != null ? opts.index : i,
        nonce: Date.now() + i * 7877 + Math.random() * 999,
        section: section,
      });
      if (url) push(url, { source: "generated", iseRaw: 0 });
    }

    return out;
  }

  function entryFromUrl(url) {
    const IC = global.ImageCatalog;
    if (!IC || !IC.photoIdFromUrl || !IC.allEntries) return null;
    const id = IC.photoIdFromUrl(url);
    if (!id) return null;
    const all = IC.allEntries();
    for (let i = 0; i < all.length; i++) {
      if (all[i].id === id) return all[i];
    }
    return null;
  }

  function scoreCandidate(candidate, selCtx) {
    const ctx = selCtx.ctx;
    const styleReq = selCtx.styleReq;
    const rules = selCtx.rules;
    const bizCategory = resolveBusinessCategory(selCtx);
    const domainCtx = buildDomainContext(selCtx, bizCategory);
    const entry = candidate.entry || entryFromUrl(candidate.url);
    const tags = (entry && entry.tags) || [];

    const dims = {};

    const domainRelevance = entry ? computeDomainRelevance(entry, domainCtx) : 0;
    dims.businessRelevance = domainRelevance;
    const domainGatePassed = domainRelevance >= MIN_DOMAIN_RELEVANCE;

    dims.photographyQuality = entry
      ? Math.max(0, Math.min(1, (entry.quality || 6) / 10))
      : 0.55;
    if (dims.photographyQuality < styleReq.minQuality / 10) {
      dims.photographyQuality *= 0.7;
    }
    if (domainGatePassed) {
      dims.photographyQuality = Math.min(1, dims.photographyQuality + genericQualityBoost(tags) * 0.5);
    }

    dims.sectionSuitability = 0.62;
    if (domainGatePassed && entry && rules) {
      if (selCtx.section === "hero") {
        if (entry.orientation === "landscape") dims.sectionSuitability += 0.15;
        if ((entry.headlineSpace || 0) >= (rules.minHeadlineSpace || 5)) dims.sectionSuitability += 0.12;
        if (rules.strongFocalPoint && tagOverlap(tags, ["focal-point", "clean-composition"])) dims.sectionSuitability += 0.08;
        if (entry.hasText) dims.sectionSuitability -= 0.35;
      }
      if (selCtx.section === "about") {
        if (entry.hasPeople) dims.sectionSuitability += 0.2;
        if (tagOverlap(tags, ["trust", "authentic", "natural", "team"])) dims.sectionSuitability += 0.12;
      }
      if (selCtx.section === "gallery") {
        if (tagOverlap(tags, ["project", "completed", "portfolio", "work", "result"])) dims.sectionSuitability += 0.18;
      }
      if (selCtx.section === "card") {
        if (tagOverlap(tags, ["service", "detail", "professional"])) dims.sectionSuitability += 0.15;
        if (tagOverlap(tags, ["crowded", "busy"])) dims.sectionSuitability -= 0.15;
      }
    }
    dims.sectionSuitability = Math.max(0, Math.min(1, dims.sectionSuitability));

    dims.composition =
      domainGatePassed && entry
        ? Math.min(1, 0.45 + tagOverlap(tags, ["clean-composition", "focal-point", "simple", "minimal"]) * 0.12)
        : 0.35;
    dims.lighting = styleReq.lighting ? 0.72 : 0.65;
    if (entry && styleReq.moods.length && entry.moods) {
      styleReq.moods.forEach(function (m) {
        if (entry.moods.indexOf(m) >= 0) dims.lighting = Math.min(1, dims.lighting + 0.12);
      });
    }

    dims.colorHarmony = 0.68;
    const DM = global.DesignMemoryEngine;
    if (DM && typeof DM.getConstraints === "function") {
      const c = DM.getConstraints(selCtx.targetKey);
      if (c.tokens && c.tokens.colors) dims.colorHarmony = 0.88;
      if (c.global && c.global.visualMood) dims.colorHarmony = 0.82;
    }

    dims.brandConsistency = dims.colorHarmony * 0.85 + dims.businessRelevance * 0.15;

    dims.designMemoryCompatibility = 0.7;
    if (DM && typeof DM.validateProposal === "function") {
      const proposal = {
        kind: "image",
        url: candidate.url,
        userText: selCtx.enrichedText,
        photographyStyle: styleReq.lighting,
        mood: styleReq.mood,
      };
      dims.designMemoryCompatibility = DM.validateProposal(proposal, selCtx.targetKey).score;
    }

    dims.textOverlaySuitability =
      domainGatePassed && selCtx.section === "hero"
        ? entry
          ? Math.min(1, ((entry.headlineSpace || 4) / 10) * 0.9 + (entry.hasText ? -0.4 : 0.1))
          : 0.55
        : selCtx.section === "hero"
          ? 0.35
          : 0.75;

    dims.humanQuality =
      domainGatePassed && entry && entry.hasPeople ? 0.88 : selCtx.section === "about" ? 0.35 : 0.62;
    dims.modernAppearance = 0.55 + styleReq.modernBoost + tagOverlap(tags, ["modern", "contemporary", "clean"]) * 0.08;
    dims.modernAppearance = Math.max(0, Math.min(1, dims.modernAppearance));

    dims.authenticity =
      0.55 +
      styleReq.authenticityBoost +
      (domainGatePassed ? genericQualityBoost(tags) : 0) +
      tagOverlap(tags, ["real", "candid"]) * 0.1;
    dims.visualFocus =
      domainGatePassed && tagOverlap(tags, ["focal-point", "clean-composition"]) ? 0.85 : 0.58;

    if (styleReq.preferTags.length) {
      const boost = Math.min(0.25, tagOverlap(tags, styleReq.preferTags) * 0.06);
      dims.modernAppearance = Math.min(1, dims.modernAppearance + boost * 0.5);
    }
    if (styleReq.avoidTags.length && tagOverlap(tags, styleReq.avoidTags) > 0) {
      dims.modernAppearance *= 0.75;
      dims.authenticity *= 0.75;
    }

    const weights = {
      businessRelevance: 0.14,
      composition: 0.1,
      lighting: 0.08,
      photographyQuality: 0.1,
      colorHarmony: 0.08,
      brandConsistency: 0.06,
      designMemoryCompatibility: 0.12,
      sectionSuitability: 0.12,
      textOverlaySuitability: selCtx.section === "hero" ? 0.08 : 0.03,
      humanQuality: selCtx.section === "about" ? 0.06 : 0.02,
      modernAppearance: 0.05,
      authenticity: 0.04,
      visualFocus: 0.04,
    };

    if (rules && rules.weights) {
      Object.keys(rules.weights).forEach(function (k) {
        if (weights[k] != null) weights[k] = Math.max(weights[k], rules.weights[k]);
      });
    }

    let sum = 0;
    let wTotal = 0;
    Object.keys(weights).forEach(function (k) {
      if (dims[k] == null) return;
      sum += dims[k] * weights[k];
      wTotal += weights[k];
    });

    const overall = wTotal > 0 ? Math.round((sum / wTotal) * 1000) / 1000 : 0;

    return { overall: overall, dimensions: dims };
  }

  function photoId(url) {
    const IC = global.ImageCatalog;
    return IC && IC.photoIdFromUrl ? IC.photoIdFromUrl(url) : normalizeUrl(url);
  }

  /** Diversity — prefer highest score among top N that differs from served */
  function pickDiverse(scored, served) {
    if (!scored.length) return null;
    const top = scored.slice(0, TOP_CONSIDER);
    const servedIds = served.map(photoId);

    let best = top[0];
    let bestDiv = -1;

    top.forEach(function (row) {
      const id = photoId(row.url);
      let div = 1;
      servedIds.forEach(function (sid) {
        if (sid === id) div -= 0.95;
      });
      const combined = row.overall + div * 0.08;
      if (combined > best.overall + bestDiv * 0.08 - 0.001 || (combined >= best.overall && div > bestDiv)) {
        best = row;
        bestDiv = div;
      }
    });

    return best;
  }

  /**
   * Select best image URL for section kind.
   * @param {string} kind hero|about|gallery|card
   * @param {object} opts userText, index, variant, nonce
   */
  function selectBest(kind, opts) {
    opts = opts || {};
    const selCtx = buildSelectionContext(kind, opts);
    const bizCategory = resolveBusinessCategory(selCtx);
    const searchQuery = buildSearchQuery(selCtx, bizCategory);

    log("CLASSIFY", {
      kind: kind,
      businessCategory: bizCategory.primaryBusiness,
      industry: bizCategory.industry,
      themeId: bizCategory.themeId,
      searchQuery: searchQuery,
    });

    if (isVariantRequest(opts.userText, opts)) {
      const cur = currentSectionUrl(kind);
      if (cur) recordRejected(kind, cur);
    }

    const rejected = getRejectedSet(kind);
    const served = getServedList(kind);

    let candidates = gatherCandidates(selCtx, opts);
    candidates = candidates.filter(function (c) {
      return !rejected[normalizeUrl(c.url)];
    });

    if (!candidates.length) {
      candidates = gatherCandidates(selCtx, Object.assign({}, opts, { nonce: Date.now() + 99991 }));
      candidates = candidates.filter(function (c) {
        return !rejected[normalizeUrl(c.url)];
      });
    }

    const evaluated = candidates.map(function (c) {
      const rejection = evaluateCandidateRejection(c, selCtx, bizCategory);
      const s = scoreCandidate(c, selCtx);
      const row = {
        url: c.url,
        source: c.source,
        overall: s.overall,
        dimensions: s.dimensions,
        photoId: candidatePhotoId(c),
        tags: candidateTags(c),
        rejectionReason: rejection.rejected ? rejection.reason : "",
        selected: false,
      };
      logCandidateAudit({
        searchQuery: searchQuery,
        businessCategory: bizCategory.primaryBusiness,
        photoId: row.photoId,
        tags: row.tags,
        relevanceScore: s.overall,
        rejectionReason: row.rejectionReason || null,
        source: c.source,
      });
      return row;
    });

    const scored = evaluated
      .filter(function (row) {
        return !row.rejectionReason && row.overall >= MIN_QUALITY;
      })
      .sort(function (a, b) {
        return b.overall - a.overall;
      });

    let chosen = pickDiverse(scored, served);
    let selectionReason =
      "highest scored diverse candidate matching " + bizCategory.primaryBusiness + " hero requirements";

    if (!chosen && candidates.length) {
      const fallback = evaluated
        .filter(function (row) {
          return !row.rejectionReason;
        })
        .sort(function (a, b) {
          return b.overall - a.overall;
        })[0];
      if (fallback && fallback.overall >= MIN_QUALITY * 0.85) {
        chosen = fallback;
        selectionReason = "relaxed quality threshold fallback";
      }
    }

    if (!chosen) {
      const url = rawPick(kind, { userText: searchQuery || selCtx.enrichedText, nonce: Date.now() });
      const rejection = evaluateCandidateRejection({ url: url }, selCtx, bizCategory);
      if (url && !rejection.rejected) {
        log("FALLBACK", { kind: kind, url: url.slice(0, 48), source: "rawPick" });
        return url;
      }
      log("FALLBACK", { kind: kind, url: url ? url.slice(0, 48) : "", rejected: rejection.reason });
      return "";
    }

    if (!chosen || !chosen.url) return "";

    logCandidateAudit({
      searchQuery: searchQuery,
      businessCategory: bizCategory.primaryBusiness,
      photoId: photoId(chosen.url),
      tags: candidateTags({ url: chosen.url, entry: entryFromUrl(chosen.url) }),
      relevanceScore: chosen.overall,
      rejectionReason: null,
      finalSelectionReason: selectionReason,
      source: chosen.source,
    });

    recordServed(kind, chosen.url);
    log("SELECT", {
      kind: kind,
      businessCategory: bizCategory.primaryBusiness,
      searchQuery: searchQuery,
      photoId: photoId(chosen.url),
      overall: chosen.overall,
      source: chosen.source,
      dimensions: chosen.dimensions,
      pool: candidates.length,
      rejected: Object.keys(rejected).length,
      selectionReason: selectionReason,
    });

    return chosen.url;
  }

  function selectMany(kind, count, opts) {
    opts = opts || {};
    count = Math.max(1, Number(count) || 1);
    const urls = [];
    const used = {};
    for (let i = 0; i < count; i++) {
      const url = selectBest(kind, Object.assign({}, opts, { index: i, nonce: Date.now() + i * 9973 }));
      if (url && !used[normalizeUrl(url)]) {
        urls.push(url);
        used[normalizeUrl(url)] = true;
      }
    }
    return urls;
  }

  function applyToDocument(doc, opts) {
    const ISE = global.ImageSelectionEngine;
    if (!doc || !doc.page) return doc;
    opts = opts || {};
    const replaceStock = !!opts.replaceStock;
    const shouldReplace = replaceStock
      ? ISE && typeof ISE.isManagedStock === "function"
        ? ISE.isManagedStock
        : function () {
            return true;
          }
      : ISE && typeof ISE.isPlaceholderStock === "function"
        ? ISE.isPlaceholderStock
        : function (u) {
            return !u;
          };
    const userText = String(opts.userText || doc.page.onboardingDescription || "").trim();
    const baseOpts = { userText: userText };

    if (shouldReplace(doc.page.heroBgUrl)) {
      const heroUrl = selectBest("hero", baseOpts);
      doc.page.heroBgUrl = heroUrl;
      if (doc.page.material) doc.page.material.heroImageUrl = heroUrl;
    }

    if (doc.sections && doc.sections.about && shouldReplace(doc.sections.about.imageUrl)) {
      const aboutUrl = selectBest("about", Object.assign({}, baseOpts, { nonce: Date.now() + 1 }));
      doc.sections.about.imageUrl = aboutUrl;
      if (doc.page.material) doc.page.material.aboutImageUrl = aboutUrl;
    }

    const cards = doc.sections && doc.sections.services && doc.sections.services.cards;
    if (Array.isArray(cards)) {
      for (let i = 0; i < Math.min(3, cards.length); i++) {
        if (cards[i] && shouldReplace(cards[i].img)) {
          cards[i].img = selectBest("card", Object.assign({}, baseOpts, { index: i, nonce: Date.now() + 10 + i }));
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
      const galleryUrls = selectMany(
        "gallery",
        Math.min(4, imgs.length),
        Object.assign({}, baseOpts, { nonce: Date.now() + 20 }),
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

  global.ImageIntelligenceEngine = {
    SCHEMA_VERSION: SCHEMA_VERSION,
    MIN_QUALITY: MIN_QUALITY,
    MIN_DOMAIN_RELEVANCE: MIN_DOMAIN_RELEVANCE,
    GENERIC_QUALITY_TAGS: GENERIC_QUALITY_TAGS,
    SECTION_RULES: SECTION_RULES,
    STYLE_LEXICON: STYLE_LEXICON,
    selectBest: selectBest,
    selectMany: selectMany,
    applyToDocument: applyToDocument,
    translateStyle: translateStyle,
    scoreCandidate: scoreCandidate,
    gatherCandidates: gatherCandidates,
    buildSelectionContext: buildSelectionContext,
    resolveBusinessCategory: resolveBusinessCategory,
    buildSearchQuery: buildSearchQuery,
    evaluateCandidateRejection: evaluateCandidateRejection,
    buildDomainContext: buildDomainContext,
    computeDomainRelevance: computeDomainRelevance,
    belongsToBusinessDomain: belongsToBusinessDomain,
    logCandidateAudit: logCandidateAudit,
    recordRejected: recordRejected,
    log: log,
  };
})(typeof window !== "undefined" ? window : globalThis);
