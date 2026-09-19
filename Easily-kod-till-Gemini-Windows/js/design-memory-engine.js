/**
 * Design Memory Engine — permanent design language for a website.
 *
 * Stored in doc.meta.designMemory (SiteState). Independent of chat history.
 *
 * Flow: Intent Resolution → Design Memory → Edit Session → Execution
 */
(function (global) {
  "use strict";

  const LOG_TAG = "[Easily · design-memory]";
  const SCHEMA_VERSION = 1;
  const MIN_CONSISTENCY = 0.72;
  const MAX_PICK_ATTEMPTS = 7;

  const SECTION_KEYS = {
    "hero:image": { section: "hero", facet: "image" },
    "hero:text": { section: "hero", facet: "text" },
    "hero:cta": { section: "hero", facet: "cta" },
    "about:image": { section: "about", facet: "image" },
    "about:text": { section: "about", facet: "text" },
    "gallery:image": { section: "gallery", facet: "image" },
    "services:image": { section: "services", facet: "image" },
    "page:color": { section: "_tokens", facet: "colors" },
    "header:logo": { section: "_tokens", facet: "logo" },
  };

  function log(stage, payload) {
    const entry = Object.assign({ stage, t: Date.now() }, payload || {});
    try {
      console.info(LOG_TAG, entry);
    } catch (e) {
      /* ignore */
    }
    return entry;
  }

  function approved(value, source) {
    return {
      value: value,
      status: "approved",
      at: new Date().toISOString(),
      source: source || "user_accept",
    };
  }

  function createEmptyMemory() {
    return {
      version: SCHEMA_VERSION,
      updatedAt: new Date().toISOString(),
      global: {},
      sections: {},
      tokens: {},
    };
  }

  function loadRaw(doc) {
    if (!doc || !doc.meta || !doc.meta.designMemory) return null;
    const m = doc.meta.designMemory;
    if (!m || typeof m !== "object") return null;
    return m;
  }

  function persist(memory) {
    const SS = global.SiteState;
    if (!SS || !SS.patch) return memory;
    memory.updatedAt = new Date().toISOString();
    SS.patch(function (d) {
      if (!d.meta) d.meta = {};
      d.meta.designMemory = JSON.parse(JSON.stringify(memory));
      if (global.AppDocument && typeof global.AppDocument.touchMeta === "function") {
        global.AppDocument.touchMeta(d);
      }
    });
    SS.save && SS.save();
    return memory;
  }

  function getMemory() {
    const SS = global.SiteState;
    const doc = SS && SS.get ? SS.get() : null;
    let mem = loadRaw(doc);
    if (!mem) {
      mem = createEmptyMemory();
      if (doc) persist(mem);
    }
    return mem;
  }

  function ensurePath(memory, section, facet) {
    if (section === "_tokens") {
      if (!memory.tokens) memory.tokens = {};
      if (!memory.tokens[facet]) memory.tokens[facet] = {};
      return memory.tokens[facet];
    }
    if (!memory.sections) memory.sections = {};
    if (!memory.sections[section]) memory.sections[section] = {};
    if (!memory.sections[section][facet]) memory.sections[section][facet] = {};
    return memory.sections[section][facet];
  }

  function setGlobal(memory, key, value, source) {
    if (!memory.global) memory.global = {};
    memory.global[key] = approved(value, source);
  }

  function ctxToKey(ctx) {
    if (!ctx || !ctx.section || !ctx.object) return "";
    return ctx.section + ":" + ctx.object;
  }

  function inferMoodFromText(text) {
    const s = String(text || "").toLowerCase();
    if (/premium|exklusiv|lyx|exclusive/.test(s)) return "Premium";
    if (/varm|warm|friendly|välkomn/.test(s)) return "Friendly";
    if (/nordisk|skandinav|scandinavian|minimal|luft/.test(s)) return "Scandinavian";
    if (/modern|contemporary/.test(s)) return "Modern";
    if (/professionell|seriös|corporate/.test(s)) return "Professional";
    return "Balanced";
  }

  function inferLightingFromTheme(theme) {
    if (!theme) return "Natural daylight";
    const id = String(theme.id || theme.label || "").toLowerCase();
    const label = String(theme.label || "").toLowerCase();
    if (/warm|varm|cafe|salon/.test(id + label)) return "Soft warm daylight";
    if (/dark|mork|mörk|kontrast/.test(id + label)) return "Controlled contrast lighting";
    if (/nordic|scandinav|minimal/.test(id + label)) return "Soft Nordic daylight";
    return "Soft warm daylight";
  }

  function inferPhotographyStyle(theme, doc) {
    if (theme && theme.label) return theme.label;
    const DF = global.DesignFamilies;
    const page = doc && doc.page;
    if (DF && page && page.designColorSetId && typeof DF.colorSetLabel === "function") {
      return DF.colorSetLabel(page.designColorSetId, page.industry);
    }
    if (page && page.industry) return String(page.industry) + " photography";
    return "Natural lifestyle";
  }

  function inferComposition(section) {
    if (section === "hero") return "Wide hero";
    if (section === "about") return "Intimate portrait or context";
    if (section === "gallery") return "Consistent gallery grid";
    return "Standard web crop";
  }

  function extractImageTraits(url, section, doc, themeHint) {
    const theme =
      themeHint ||
      (global.MaterialSystem && typeof global.MaterialSystem.parseImageTheme === "function"
        ? global.MaterialSystem.parseImageTheme(String(url || ""))
        : null);
    const photoStyle = inferPhotographyStyle(theme, doc);
    const lighting = inferLightingFromTheme(theme);
    const mood = inferMoodFromText(photoStyle + " " + lighting);
    return {
      url: url || "",
      imageStyle: photoStyle,
      photographyStyle: photoStyle,
      lighting: lighting,
      composition: inferComposition(section),
      mood: mood,
      colorTemperature: /warm|varm|soft warm/.test(lighting.toLowerCase()) ? "Warm" : "Neutral",
      themeId: theme && theme.id ? theme.id : "",
    };
  }

  function extractColorTraits(doc) {
    const page = doc && doc.page;
    if (!page) return {};
    const DF = global.DesignFamilies;
    let label = page.designColorSetId || "";
    if (DF && page.designColorSetId && typeof DF.colorSetLabel === "function") {
      label = DF.colorSetLabel(page.designColorSetId, page.industry) || label;
    }
    let family = page.theme || "";
    if (DF && typeof DF.familyLabel === "function" && page.designFamilyId) {
      family = DF.familyLabel(page.designFamilyId);
    }
    return {
      designColorSetId: page.designColorSetId || "",
      familyId: page.designFamilyId || page.theme || "",
      label: label,
      family: family,
      visualMood: inferMoodFromText(label + " " + family),
    };
  }

  function extractTextTraits(doc, section) {
    const sec = doc && doc.sections && doc.sections[section];
    const content = (sec && sec.content) || {};
    let sample = "";
    if (section === "hero") sample = String(content["hero-title"] || "").trim();
    if (section === "about") sample = String(content["about-h2"] || content["about-p1"] || "").trim();
    return {
      tone: inferMoodFromText(sample),
      sample: sample.slice(0, 120),
    };
  }

  /**
   * Record approved design decision (called on handleKeep).
   */
  function recordAcceptance(ctx, docSnapshot) {
    const key = ctxToKey(ctx);
    if (!key || !docSnapshot) return getMemory();

    const memory = getMemory();
    const mapping = SECTION_KEYS[key];
    const doc = docSnapshot;

    if (mapping && mapping.section === "_tokens" && mapping.facet === "colors") {
      const traits = extractColorTraits(doc);
      const bucket = ensurePath(memory, "_tokens", "colors");
      Object.keys(traits).forEach(function (k) {
        bucket[k] = approved(traits[k], "accept:" + key);
      });
      setGlobal(memory, "visualMood", traits.visualMood, "accept:colors");
      setGlobal(memory, "colorPalette", traits.label || traits.designColorSetId, "accept:colors");
    } else if (mapping && mapping.section === "_tokens" && mapping.facet === "logo") {
      const url = (doc.page && doc.page.logoUrl) || (doc.page && doc.page.material && doc.page.material.logoUrl) || "";
      ensurePath(memory, "_tokens", "logo").url = approved(url, "accept:logo");
    } else if (mapping && mapping.facet === "image") {
      const section = mapping.section;
      let url = "";
      if (section === "hero") url = (doc.page && doc.page.heroBgUrl) || "";
      if (section === "about" && doc.sections && doc.sections.about) url = doc.sections.about.imageUrl || "";
      if (section === "gallery" && doc.sections && doc.sections.gallery && doc.sections.gallery.images) {
        url = (doc.sections.gallery.images[0] || "");
      }
      if (section === "services" && doc.sections && doc.sections.services && doc.sections.services.cards) {
        const c0 = doc.sections.services.cards[0];
        url = (c0 && c0.img) || "";
      }
      const traits = extractImageTraits(url, section, doc);
      const bucket = ensurePath(memory, section, "image");
      Object.keys(traits).forEach(function (k) {
        bucket[k] = approved(traits[k], "accept:" + key);
      });
      setGlobal(memory, "photographyStyle", traits.photographyStyle, "accept:" + key);
      setGlobal(memory, "lighting", traits.lighting, "accept:" + key);
      setGlobal(memory, "visualMood", traits.mood, "accept:" + key);
      if (section === "gallery") {
        setGlobal(memory, "galleryStyle", traits.imageStyle, "accept:gallery");
      }
    } else if (mapping && mapping.facet === "text") {
      const traits = extractTextTraits(doc, mapping.section);
      const bucket = ensurePath(memory, mapping.section, "text");
      Object.keys(traits).forEach(function (k) {
        bucket[k] = approved(traits[k], "accept:" + key);
      });
      setGlobal(memory, "typographyTone", traits.tone, "accept:" + key);
    } else if (mapping && mapping.facet === "cta") {
      const hero = doc.sections && doc.sections.hero && doc.sections.hero.content;
      const label = hero ? String(hero["hero-cta-1-text"] || "").trim() : "";
      ensurePath(memory, "hero", "cta").label = approved(label, "accept:hero:cta");
      setGlobal(memory, "buttonStyle", label ? "Approved CTA copy" : "Primary button", "accept:cta");
    }

    persist(memory);
    log("RECORD", { key: key, memory: summarize(memory) });
    return memory;
  }

  function summarize(memory) {
    return {
      globalKeys: Object.keys(memory.global || {}),
      sections: Object.keys(memory.sections || {}),
      tokens: Object.keys(memory.tokens || {}),
    };
  }

  /** Read flow — constraints for a target key. */
  function getConstraints(targetKey) {
    const memory = getMemory();
    const mapping = SECTION_KEYS[targetKey];
    const out = {
      global: memory.global || {},
      section: null,
      tokens: memory.tokens || {},
      pickHints: [],
    };

    if (mapping) {
      if (mapping.section === "_tokens") {
        out.section = memory.tokens && memory.tokens[mapping.facet];
      } else if (memory.sections && memory.sections[mapping.section]) {
        out.section = memory.sections[mapping.section][mapping.facet];
      }
    }

    ["photographyStyle", "lighting", "visualMood", "colorTemperature", "galleryStyle"].forEach(function (g) {
      const entry = memory.global && memory.global[g];
      if (entry && entry.status === "approved" && entry.value) out.pickHints.push(String(entry.value));
    });

    if (memory.tokens && memory.tokens.colors) {
      const c = memory.tokens.colors;
      if (c.label && c.label.value) out.pickHints.push(String(c.label.value));
      if (c.visualMood && c.visualMood.value) out.pickHints.push(String(c.visualMood.value));
    }

    if (out.section && out.section.mood && out.section.mood.value) {
      out.pickHints.push(String(out.section.mood.value));
    }
    if (out.section && out.section.imageStyle && out.section.imageStyle.value) {
      out.pickHints.push(String(out.section.imageStyle.value));
    }

    out.pickHints = out.pickHints.filter(Boolean);
    return out;
  }

  function normalizeScore(v) {
    return Math.round(Math.max(0, Math.min(1, v)) * 100) / 100;
  }

  function stringSimilarity(a, b) {
    const x = String(a || "")
      .toLowerCase()
      .trim();
    const y = String(b || "")
      .toLowerCase()
      .trim();
    if (!x || !y) return 0.5;
    if (x === y) return 1;
    if (x.indexOf(y) >= 0 || y.indexOf(x) >= 0) return 0.88;
    const wordsX = x.split(/\s+/);
    const wordsY = y.split(/\s+/);
    let hit = 0;
    wordsX.forEach(function (w) {
      if (w.length > 3 && y.indexOf(w) >= 0) hit += 1;
    });
    return normalizeScore(0.45 + (hit / Math.max(wordsX.length, 1)) * 0.5);
  }

  /**
   * Consistency engine — internal scores only.
   */
  function scoreProposal(proposal, targetKey) {
    proposal = proposal || {};
    const memory = getMemory();
    const constraints = getConstraints(targetKey);
    const dims = {};

    const globalPhoto = memory.global && memory.global.photographyStyle;
    const globalMood = memory.global && memory.global.visualMood;
    const globalLight = memory.global && memory.global.lighting;
    const colors = memory.tokens && memory.tokens.colors;

    if (proposal.kind === "image" || /:image$/.test(targetKey || "")) {
      const propStyle = proposal.photographyStyle || proposal.imageStyle || proposal.themeLabel || "";
      dims.photographyStyle = globalPhoto
        ? stringSimilarity(globalPhoto.value, propStyle || proposal.userText)
        : 0.75;
      dims.lighting = globalLight
        ? stringSimilarity(globalLight.value, proposal.lighting || proposal.userText)
        : 0.75;
      dims.mood = globalMood ? stringSimilarity(globalMood.value, proposal.mood || proposal.userText) : 0.75;
      dims.colors = colors && colors.label ? 0.92 : 0.7;
      dims.composition = constraints.section && constraints.section.composition ? 0.9 : 0.75;
    } else if (targetKey === "page:color") {
      dims.colors = 0.95;
      dims.typography = memory.global.typographyTone ? 0.88 : 0.75;
    } else {
      dims.typography = memory.global.typographyTone ? 0.9 : 0.75;
      dims.mood = globalMood ? stringSimilarity(globalMood.value, proposal.tone || "") : 0.7;
    }

    const weights = {
      photographyStyle: 0.28,
      lighting: 0.22,
      mood: 0.18,
      colors: 0.18,
      typography: 0.1,
      composition: 0.04,
    };

    let totalW = 0;
    let sum = 0;
    Object.keys(dims).forEach(function (k) {
      const w = weights[k] || 0.1;
      totalW += w;
      sum += dims[k] * w;
    });

    const overall = totalW > 0 ? normalizeScore(sum / totalW) : 0.5;

    return {
      overall: overall,
      dimensions: dims,
      targetKey: targetKey,
      accepted: overall >= MIN_CONSISTENCY,
    };
  }

  function validateProposal(proposal, targetKey) {
    const score = scoreProposal(proposal, targetKey);
    const result = {
      accepted: score.accepted,
      score: score.overall,
      dimensions: score.dimensions,
      reason: score.accepted ? "consistent" : "conflicts_with_design_memory",
    };
    log("VALIDATE", {
      targetKey: targetKey,
      accepted: result.accepted,
      overall: result.score,
      dimensions: result.dimensions,
      url: proposal && proposal.url ? proposal.url.slice(0, 64) : undefined,
    });
    return result;
  }

  function rawPickImage(kind, opts) {
    opts = opts || {};
    if (global.MaterialSystem && typeof global.MaterialSystem.pickStockImageCandidate === "function") {
      return global.MaterialSystem.pickStockImageCandidate(kind, opts);
    }
    return "";
  }

  function buildProposalFromUrl(url, kind, opts) {
    const doc = global.SiteState && global.SiteState.get ? global.SiteState.get() : null;
    const theme =
      global.MaterialSystem && typeof global.MaterialSystem.parseImageTheme === "function"
        ? global.MaterialSystem.parseImageTheme((opts && opts.userText) || "")
        : null;
    const traits = extractImageTraits(url, kind === "card" ? "services" : kind, doc, theme);
    return {
      kind: "image",
      url: url,
      userText: (opts && opts.userText) || "",
      photographyStyle: traits.photographyStyle,
      imageStyle: traits.imageStyle,
      lighting: traits.lighting,
      mood: traits.mood,
      themeLabel: traits.imageStyle,
    };
  }

  /** Pick image with internal consistency retries. */
  function pickConsistentImageUrl(kind, opts) {
    opts = opts || {};
    const memory = getMemory();
    const hasMemory =
      (memory.global && memory.global.photographyStyle) ||
      (memory.global && memory.global.visualMood) ||
      (memory.sections && Object.keys(memory.sections).length > 0);

    const targetKey =
      kind === "hero"
        ? "hero:image"
        : kind === "about"
          ? "about:image"
          : kind === "gallery"
            ? "gallery:image"
            : kind === "card"
              ? "services:image"
              : kind + ":image";

    const constraints = getConstraints(targetKey);
    const enrichedText = [opts.userText]
      .concat(constraints.pickHints)
      .filter(Boolean)
      .join(" — ");

    if (!hasMemory) {
      return rawPickImage(kind, Object.assign({}, opts, { userText: enrichedText }));
    }

    let lastUrl = "";
    let lastScore = 0;

    for (let attempt = 0; attempt < MAX_PICK_ATTEMPTS; attempt++) {
      const url = rawPickImage(
        kind,
        Object.assign({}, opts, {
          userText: enrichedText,
          nonce: Date.now() + attempt * 991 + Math.random(),
        }),
      );
      if (!url) continue;
      lastUrl = url;
      const proposal = buildProposalFromUrl(url, kind, { userText: enrichedText });
      const validation = validateProposal(proposal, targetKey);
      lastScore = validation.score;
      if (validation.accepted) {
        log("PICK", { kind: kind, attempt: attempt + 1, score: validation.score, accepted: true });
        return url;
      }
      log("PICK_REJECT", {
        kind: kind,
        attempt: attempt + 1,
        score: validation.score,
        dimensions: validation.dimensions,
        reason: "design_language_mismatch",
      });
    }

    log("PICK_FALLBACK", { kind: kind, score: lastScore, url: lastUrl ? lastUrl.slice(0, 48) : "" });
    return lastUrl || rawPickImage(kind, Object.assign({}, opts, { userText: enrichedText }));
  }

  function targetKeyFromAction(action) {
    if (!action) return "";
    const ES = global.EditSession;
    if (action.meta && action.meta.context && ES && ES.getContext) {
      const ctx = action.meta.context;
      return ctx.section + ":" + ctx.object;
    }
    if (action.target === "hero.image" || (action.type && action.type.indexOf("hero.image") === 0)) return "hero:image";
    if (action.target === "about.image") return "about:image";
    if (action.target === "gallery.image") return "gallery:image";
    if (action.target === "design.color") return "page:color";
    if (action.target === "header.logo") return "header:logo";
    return "";
  }

  function enrichCommandWithMemory(text, targetKey) {
    const constraints = getConstraints(targetKey);
    if (!constraints.pickHints.length) return text;
    const base = String(text || "").trim();
    const hints = constraints.pickHints.slice(0, 4).join(", ");
    if (base.toLowerCase().indexOf(hints.toLowerCase().slice(0, 12)) >= 0) return base;
    return base ? base + " — " + hints : hints;
  }

  /**
   * Consult before execution (after Intent Resolution).
   */
  function consultBeforeExecute(action, text, hooks) {
    hooks = hooks || {};
    const targetKey = targetKeyFromAction(action);
    const memory = getMemory();
    const constraints = targetKey ? getConstraints(targetKey) : null;

    const out = {
      action: action,
      text: text,
      context: {
        memory: summarize(memory),
        targetKey: targetKey,
        constraints: constraints,
      },
      adjusted: false,
    };

    if (!targetKey) {
      log("CONSULT", { skipped: true, reason: "no_target" });
      return out;
    }

    const type = action && action.type;
    if (type && /^session\./.test(type)) {
      log("CONSULT", { skipped: true, reason: "session_action" });
      return out;
    }

    if (/image/.test(type || "") || /:image$/.test(targetKey)) {
      const enriched = enrichCommandWithMemory(text, targetKey);
      if (enriched !== text) {
        out.text = enriched;
        out.action = Object.assign({}, action, { command: enriched });
        out.adjusted = true;
      }
    }

    log("CONSULT", {
      targetKey: targetKey,
      adjusted: out.adjusted,
      hints: constraints && constraints.pickHints ? constraints.pickHints.slice(0, 3) : [],
    });

    return out;
  }

  /** Migrate existing document state into design memory. */
  function migrateFromDocument(doc) {
    doc = doc || (global.SiteState && global.SiteState.get && global.SiteState.get());
    if (!doc) return getMemory();

    const memory = getMemory();
    const hasApproved =
      (memory.global && Object.keys(memory.global).length > 0) ||
      (memory.sections && Object.keys(memory.sections).length > 0) ||
      (memory.tokens && Object.keys(memory.tokens).length > 0);

    if (hasApproved) return memory;

    const syntheticCtx = function (section, object) {
      return { page: "home", section: section, object: object };
    };

    if (doc.page && doc.page.heroBgUrl) {
      recordAcceptance(syntheticCtx("hero", "image"), doc);
    }
    if (doc.page && doc.page.designColorSetId) {
      recordAcceptance(syntheticCtx("page", "color"), doc);
    }
    if (doc.page && doc.page.logoUrl) {
      recordAcceptance(syntheticCtx("header", "logo"), doc);
    }
    if (doc.sections && doc.sections.about && doc.sections.about.imageUrl) {
      recordAcceptance(syntheticCtx("about", "image"), doc);
    }
    if (doc.sections && doc.sections.gallery && doc.sections.gallery.images && doc.sections.gallery.images[0]) {
      recordAcceptance(syntheticCtx("gallery", "image"), doc);
    }

    log("MIGRATE", { from: "document", summary: summarize(getMemory()) });
    return getMemory();
  }

  function migrateFromAcceptedLocks(acceptedLocks) {
    if (!acceptedLocks) return getMemory();
    const SS = global.SiteState;
    const doc = SS && SS.get ? SS.get() : null;
    if (!doc) return getMemory();

    Object.keys(acceptedLocks).forEach(function (key) {
      const lock = acceptedLocks[key];
      const ctx = (lock && lock.context) || null;
      if (ctx) recordAcceptance(ctx, doc);
    });

    log("MIGRATE", { from: "acceptedLocks", keys: Object.keys(acceptedLocks) });
    return getMemory();
  }

  function ensureMigrated() {
    const SS = global.SiteState;
    const doc = SS && SS.get ? SS.get() : null;
    migrateFromDocument(doc);
    const ES = global.EditSession;
    if (ES && ES.getSession) {
      const session = ES.getSession();
      if (session && session.acceptedLocks) migrateFromAcceptedLocks(session.acceptedLocks);
    }
    return getMemory();
  }

  global.DesignMemoryEngine = {
    SCHEMA_VERSION: SCHEMA_VERSION,
    MIN_CONSISTENCY: MIN_CONSISTENCY,
    getMemory: getMemory,
    persist: persist,
    recordAcceptance: recordAcceptance,
    getConstraints: getConstraints,
    scoreProposal: scoreProposal,
    validateProposal: validateProposal,
    pickConsistentImageUrl: pickConsistentImageUrl,
    consultBeforeExecute: consultBeforeExecute,
    migrateFromDocument: migrateFromDocument,
    migrateFromAcceptedLocks: migrateFromAcceptedLocks,
    ensureMigrated: ensureMigrated,
    summarize: summarize,
    log: log,
  };
})(typeof window !== "undefined" ? window : globalThis);
