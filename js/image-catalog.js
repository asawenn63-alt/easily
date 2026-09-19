/**
 * Data-driven image catalog for Easily.
 * Add industries, themes, and image metadata here — not scattered prompts in chat handlers.
 */
(function (global) {
  "use strict";

  /** @typedef {"hero"|"about"|"card"|"gallery"} SectionKind */
  /** @typedef {"soft"|"lux"|"sharp"} VisualMood */

  /**
   * Per-section selection rules (strategy, not prompts).
   * @type {Record<SectionKind, object>}
   */
  const SECTION_STRATEGIES = {
    hero: {
      label: "Hero",
      orientation: ["landscape"],
      minHeadlineSpace: 6,
      minQuality: 6,
      requireRealistic: true,
      forbidText: true,
      forbidWatermark: true,
      preferTags: ["clean-composition", "focal-point", "headline-space", "landscape"],
      avoidTags: ["blueprint", "blueprints", "office", "architect", "documents", "computer", "embedded-text"],
      dimensions: { w: 1920, h: 1080 },
    },
    about: {
      label: "Om oss",
      orientation: ["portrait", "square", "landscape"],
      minQuality: 5,
      preferPeople: true,
      preferTags: ["people", "team", "trust", "authentic", "natural"],
      avoidTags: ["tools-only", "abstract", "blueprint", "office-only"],
      dimensions: { w: 800, h: 1000 },
    },
    card: {
      label: "Tjänstekort",
      orientation: ["landscape"],
      minQuality: 5,
      preferTags: ["service", "detail", "professional", "relevant"],
      avoidTags: ["blueprint", "embedded-text", "crowded"],
      dimensions: { w: 720, h: 480 },
    },
    gallery: {
      label: "Galleri",
      orientation: ["landscape", "square"],
      minQuality: 5,
      preferVariety: true,
      preferTags: ["project", "result", "completed", "portfolio", "work"],
      avoidTags: ["duplicate-feel", "embedded-text"],
      dimensions: { w: 900, h: 700 },
    },
  };

  /**
   * Industry profiles — tag weights, not hardcoded URLs.
   * @type {Record<string, object>}
   */
  const INDUSTRY_PROFILES = {
    byggfirma: {
      label: "Byggfirma / snickare",
      preferTags: ["carpenter", "wood", "tools", "workshop", "craft", "construction"],
      avoidTags: ["blueprint", "blueprints", "architect", "office", "ritning", "documents"],
      themeAlias: "carpenter",
    },
    elektriker: {
      label: "Elektriker / elinstallation",
      preferTags: ["electric", "electrical", "electrician", "wiring", "installation", "panel", "switchboard"],
      avoidTags: ["carpenter", "wood", "saw", "workshop", "blueprint", "architect", "food", "salon", "dog", "pet"],
      themeAlias: "electrician",
    },
    frisor: {
      label: "Frisör",
      preferTags: ["salon", "hair", "styling", "beauty"],
      avoidTags: ["construction", "food"],
    },
    hundsalong: {
      label: "Hundsalong",
      preferTags: ["dog", "grooming", "pet"],
      avoidTags: ["cat"],
    },
    hunddagis: {
      label: "Hunddagis",
      preferTags: ["dog", "pet", "play"],
      avoidTags: ["cat", "grooming-only"],
    },
    miljo: {
      label: "Återvinning / miljö",
      preferTags: ["recycling", "waste", "environment", "green", "sustainability", "industrial", "container", "sorting"],
      avoidTags: [
        "dog",
        "pet",
        "food",
        "salon",
        "architect",
        "blueprint",
        "office",
        "office-soft",
        "corporate",
        "business-meeting",
        "planning",
        "skyscraper",
        "whiteboard",
        "documents",
        "construction-drawing",
        "carpenter",
        "wood",
        "tools",
      ],
      themeAlias: "recycling",
    },
    cafe: {
      label: "Café",
      preferTags: ["coffee", "cafe", "interior", "food"],
      avoidTags: ["construction"],
    },
    restaurang: {
      label: "Restaurang",
      preferTags: ["food", "restaurant", "dining", "kitchen"],
      avoidTags: ["construction"],
    },
    fotograf: {
      label: "Fotograf",
      preferTags: ["camera", "photography", "creative", "portfolio"],
      avoidTags: [],
    },
    konsult: {
      label: "Konsult",
      preferTags: ["professional", "business", "team", "office-soft"],
      avoidTags: ["messy", "dog", "pet", "grooming", "puppy"],
    },
    verksamhet: {
      label: "Din verksamhet",
      preferTags: ["professional", "authentic", "natural", "trust", "relevant"],
      avoidTags: ["dog", "pet", "blueprint", "embedded-text"],
    },
    gym: {
      label: "Gym",
      preferTags: ["fitness", "training", "sport"],
      avoidTags: ["food"],
    },
    advokat: {
      label: "Advokat",
      preferTags: ["professional", "trust", "business", "law"],
      avoidTags: ["casual-messy"],
    },
    butik: {
      label: "Butik",
      preferTags: ["interior", "home", "gift", "decor", "living-room"],
      avoidTags: ["fashion", "clothing", "apparel", "runway"],
    },
    inredning: {
      label: "Inredning & present",
      preferTags: ["interior", "home", "gift", "decor", "living-room", "present"],
      avoidTags: ["fashion", "clothing", "apparel", "runway", "shoes"],
    },
    event: {
      label: "Event",
      preferTags: ["event", "celebration", "people"],
      avoidTags: [],
    },
    tarot: {
      label: "Tarot",
      preferTags: ["mystic", "spiritual", "candle", "calm"],
      avoidTags: ["construction"],
    },
  };

  /** Chat theme → tag weights (replaces scattered keyword→URL mapping). */
  const THEME_PROFILES = {
    carpenter: {
      label: "snickare och hantverk",
      terms: [
        "snickare",
        "sniockare",
        "hammare",
        "hantverk",
        "hantverkare",
        "snickeri",
        "bygg",
        "verktyg",
        "carpenter",
        "hammer",
        "woodwork",
        "tradarbete",
        "traarbete",
      ],
      preferTags: ["carpenter", "wood", "tools", "workshop"],
      avoidTags: ["blueprint", "office", "architect"],
    },
    cats: { label: "katter", terms: ["katt", "katter", "cat", "cats", "kitten"], preferTags: ["cat"], avoidTags: [] },
    dogs: { label: "hundar", terms: ["hund", "hundar", "dog", "dogs", "puppy"], preferTags: ["dog"], avoidTags: [] },
    nature: {
      label: "natur",
      terms: ["natur", "skog", "landskap", "mountain", "berg"],
      preferTags: ["nature", "forest", "landscape"],
      avoidTags: [],
    },
    coffee: {
      label: "kaffe",
      terms: ["kaffe", "coffee", "espresso", "fika", "latte"],
      preferTags: ["coffee", "cafe"],
      avoidTags: [],
    },
    ocean: {
      label: "hav",
      terms: ["hav", "ocean", "strand", "beach", "vatten"],
      preferTags: ["ocean", "beach", "water"],
      avoidTags: [],
    },
    flowers: {
      label: "blommor",
      terms: ["blomma", "blommor", "flower", "rosor"],
      preferTags: ["flowers", "nature"],
      avoidTags: [],
    },
    mystic: {
      label: "mystik",
      terms: ["tarot", "mystisk", "kristall", "ljus", "candle", "mane", "måne"],
      preferTags: ["mystic", "spiritual"],
      avoidTags: [],
    },
    food: {
      label: "mat",
      terms: ["mat", "food", "middag", "lunch", "restaurangmat"],
      preferTags: ["food", "dining"],
      avoidTags: [],
    },
    recycling: {
      label: "återvinning",
      terms: [
        "atervinning",
        "aterbruk",
        "avfall",
        "sophamt",
        "recycl",
        "miljo",
        "kretslop",
        "deponi",
        "kompost",
        "container",
        "sortering",
        "jretur",
      ],
      preferTags: ["recycling", "waste", "environment", "green", "sustainability", "container", "sorting", "industrial"],
      avoidTags: ["dog", "pet", "food", "salon", "architect", "blueprint", "office", "corporate", "business-meeting", "planning", "carpenter"],
    },
    electrician: {
      label: "elektriker och elinstallation",
      terms: [
        "elektriker",
        "elektrik",
        "elinstallation",
        "eljour",
        "elmontor",
        "elmontör",
        "elservice",
        "elarbete",
        "elcentral",
        "elskap",
        "elsäkerhet",
        "elsakerhet",
        "elnät",
        "elnat",
        "belysning",
        "ström",
        "strom",
        "electrician",
        "electrical",
        "wiring",
        "switchboard",
        "fusebox",
        "circuit",
        "installation",
      ],
      preferTags: ["electric", "electrical", "electrician", "wiring", "installation", "panel", "switchboard"],
      avoidTags: ["carpenter", "wood", "saw", "workshop", "food", "salon", "dog", "pet"],
    },
  };

  /**
   * Curated image metadata. Extend this table — packs reference these IDs.
   * @type {Record<string, object>}
   */
  const IMAGE_ENTRIES = {
    "photo-1503387762-592deb58ef4e": {
      tags: ["carpenter", "wood", "tools", "saw", "workshop", "landscape", "focal-point", "headline-space"],
      quality: 9,
      headlineSpace: 8,
      orientation: "landscape",
      hasPeople: false,
      hasText: false,
      industries: ["byggfirma"],
      sections: ["hero", "gallery", "card"],
      moods: ["soft", "lux", "sharp"],
    },
    "photo-1541753866382-081a052f842a": {
      tags: ["carpenter", "wood", "hands", "craft", "authentic", "people"],
      quality: 8,
      headlineSpace: 5,
      orientation: "landscape",
      hasPeople: true,
      hasText: false,
      industries: ["byggfirma"],
      sections: ["hero", "about", "gallery"],
      moods: ["soft", "lux", "sharp"],
    },
    "photo-1530126523779-a94d246beee0": {
      tags: ["carpenter", "wood", "workshop", "people", "authentic", "trust"],
      quality: 8,
      headlineSpace: 6,
      orientation: "landscape",
      hasPeople: true,
      hasText: false,
      industries: ["byggfirma"],
      sections: ["hero", "about", "gallery"],
      moods: ["soft", "lux"],
    },
    "photo-1621905251189-08cb45d6a269": {
      tags: ["carpenter", "tools", "craft", "people", "professional"],
      quality: 8,
      headlineSpace: 7,
      orientation: "landscape",
      hasPeople: true,
      hasText: false,
      industries: ["byggfirma"],
      sections: ["hero", "gallery", "card"],
      moods: ["soft", "sharp"],
    },
    "photo-1595844730298-6eccf7639344": {
      tags: ["carpenter", "workshop", "wood", "professional"],
      quality: 7,
      headlineSpace: 6,
      orientation: "landscape",
      hasPeople: false,
      hasText: false,
      industries: ["byggfirma"],
      sections: ["hero", "gallery"],
      moods: ["lux", "soft"],
    },
    "photo-1565187928347-8f7755a573b6": {
      tags: ["carpenter", "tools", "wood", "detail"],
      quality: 7,
      headlineSpace: 5,
      orientation: "landscape",
      hasPeople: false,
      hasText: false,
      industries: ["byggfirma"],
      sections: ["hero", "card", "gallery"],
      moods: ["sharp", "soft"],
    },
    "photo-1615874950877-1a56667a2163": {
      tags: ["wood", "workshop", "material", "craft"],
      quality: 7,
      headlineSpace: 6,
      orientation: "landscape",
      hasPeople: false,
      hasText: false,
      industries: ["byggfirma"],
      sections: ["hero", "gallery"],
      moods: ["sharp", "lux"],
    },
    "photo-1486718448742-163732cd1542": {
      tags: ["blueprint", "documents", "architect", "office", "embedded-text"],
      quality: 4,
      headlineSpace: 3,
      orientation: "landscape",
      hasPeople: true,
      hasText: true,
      industries: [],
      sections: [],
      moods: [],
      blocked: true,
      blockReason: "Ritningar/planering — inte snickare i arbete",
    },
    "photo-1504917595217-d4cb5cce14d9": {
      tags: ["construction", "worker", "professional", "landscape"],
      quality: 7,
      headlineSpace: 7,
      orientation: "landscape",
      hasPeople: true,
      hasText: false,
      industries: ["byggfirma"],
      sections: ["gallery", "card"],
      moods: ["soft", "sharp"],
    },
    "photo-1532996122724-e792c0e698ab": {
      tags: ["recycling", "waste", "environment", "green", "container", "sorting", "landscape", "focal-point", "headline-space", "industrial"],
      quality: 8,
      headlineSpace: 7,
      orientation: "landscape",
      hasPeople: false,
      hasText: false,
      industries: ["miljo"],
      sections: ["hero", "gallery", "card"],
      moods: ["soft", "lux", "sharp"],
    },
    "photo-1569163139394-2a1a8915a7a8": {
      tags: ["recycling", "waste", "sorting", "industrial", "environment", "sustainability", "landscape", "focal-point", "headline-space"],
      quality: 8,
      headlineSpace: 7,
      orientation: "landscape",
      hasPeople: false,
      hasText: false,
      industries: ["miljo"],
      sections: ["hero", "gallery", "card"],
      moods: ["soft", "lux", "sharp"],
    },
    "photo-1611280615850-5f43c7a0a7c8": {
      tags: ["recycling", "waste", "circular", "environment", "green", "container", "landscape", "focal-point", "headline-space", "industrial"],
      quality: 8,
      headlineSpace: 7,
      orientation: "landscape",
      hasPeople: false,
      hasText: false,
      industries: ["miljo"],
      sections: ["hero", "gallery", "card"],
      moods: ["soft", "lux", "sharp"],
    },
    "photo-1621905252507-b7627934c31d": {
      tags: ["electric", "electrical", "electrician", "wiring", "installation", "people", "professional", "landscape", "focal-point", "headline-space"],
      quality: 8,
      headlineSpace: 7,
      orientation: "landscape",
      hasPeople: true,
      hasText: false,
      industries: ["elektriker"],
      sections: ["hero", "about", "gallery", "card"],
      moods: ["soft", "lux", "sharp"],
    },
    "photo-1473170466615-6d85025a0f24": {
      tags: ["electric", "electrical", "wiring", "installation", "panel", "detail", "landscape", "focal-point", "headline-space"],
      quality: 8,
      headlineSpace: 8,
      orientation: "landscape",
      hasPeople: false,
      hasText: false,
      industries: ["elektriker"],
      sections: ["hero", "gallery", "card"],
      moods: ["soft", "lux", "sharp"],
    },
    "photo-1625047509168-028903f87f56": {
      tags: ["electric", "electrical", "panel", "switchboard", "installation", "landscape", "focal-point", "headline-space"],
      quality: 8,
      headlineSpace: 7,
      orientation: "landscape",
      hasPeople: false,
      hasText: false,
      industries: ["elektriker"],
      sections: ["hero", "gallery", "card"],
      moods: ["soft", "lux", "sharp"],
    },
    "photo-1581092160562-40aa08e78837": {
      tags: ["electric", "electrical", "electrician", "installation", "panel", "people", "professional", "landscape", "focal-point", "headline-space"],
      quality: 8,
      headlineSpace: 7,
      orientation: "landscape",
      hasPeople: true,
      hasText: false,
      industries: ["elektriker"],
      sections: ["hero", "about", "gallery"],
      moods: ["soft", "lux", "sharp"],
    },
    "photo-1558618666-fcd25c85cd64": {
      tags: ["electric", "electrical", "electrician", "wiring", "installation", "people", "authentic", "landscape", "focal-point", "headline-space"],
      quality: 7,
      headlineSpace: 6,
      orientation: "landscape",
      hasPeople: true,
      hasText: false,
      industries: ["elektriker"],
      sections: ["hero", "gallery", "card"],
      moods: ["soft", "sharp"],
    },
    "photo-1591696205602-4b09021a0b1e": {
      tags: ["electric", "electrical", "wiring", "installation", "switchboard", "detail", "landscape", "focal-point", "headline-space"],
      quality: 7,
      headlineSpace: 6,
      orientation: "landscape",
      hasPeople: false,
      hasText: false,
      industries: ["elektriker"],
      sections: ["hero", "gallery", "card"],
      moods: ["lux", "sharp"],
    },
    "photo-1542601906994-b5d5fb29d4d9": {
      tags: ["office", "corporate", "business-meeting", "professional", "office-soft"],
      quality: 6,
      headlineSpace: 6,
      orientation: "landscape",
      hasPeople: true,
      hasText: false,
      industries: ["konsult", "verksamhet"],
      sections: ["gallery", "card"],
      moods: ["soft", "lux"],
    },
    "photo-1473341304170-971dccb5ac71": {
      tags: ["office", "corporate", "skyscraper", "professional", "business-meeting"],
      quality: 6,
      headlineSpace: 5,
      orientation: "landscape",
      hasPeople: false,
      hasText: false,
      industries: ["konsult", "verksamhet"],
      sections: ["gallery", "card"],
      moods: ["soft", "lux"],
    },
    "photo-1541888946425-d81bb19240f5": {
      tags: ["construction", "site", "professional"],
      quality: 6,
      headlineSpace: 5,
      orientation: "landscape",
      hasPeople: false,
      hasText: false,
      industries: ["byggfirma"],
      sections: ["gallery", "card"],
      moods: ["soft", "lux", "sharp"],
    },
  };

  /** Runtime registry filled from packs + explicit entries. */
  const registry = Object.create(null);

  function photoIdFromUrl(url) {
    const m = String(url || "").match(/(photo-\d+-[a-f0-9]+)/i);
    return m ? m[1] : null;
  }

  function defaultEntry(id, meta) {
    meta = meta || {};
    return {
      id: id,
      tags: meta.tags || ["professional"],
      quality: meta.quality != null ? meta.quality : 6,
      headlineSpace: meta.headlineSpace != null ? meta.headlineSpace : 5,
      orientation: meta.orientation || "landscape",
      hasPeople: !!meta.hasPeople,
      hasText: !!meta.hasText,
      industries: meta.industries || [],
      sections: meta.sections || [],
      moods: meta.moods || ["soft", "lux", "sharp"],
      blocked: !!meta.blocked,
      blockReason: meta.blockReason || "",
    };
  }

  function mergeEntry(id, patch) {
    const base = IMAGE_ENTRIES[id] ? Object.assign({}, IMAGE_ENTRIES[id]) : defaultEntry(id, {});
    const merged = Object.assign(base, patch || {}, { id: id });
    if (IMAGE_ENTRIES[id] && IMAGE_ENTRIES[id].blocked) merged.blocked = true;
    registry[id] = merged;
    return merged;
  }

  function isBlockedUrl(raw) {
    var id = photoIdFromUrl(raw);
    if (!id) return false;
    var entry = registry[id] || IMAGE_ENTRIES[id];
    if (entry && entry.blocked) return true;
    return false;
  }

  function initExplicitEntries() {
    Object.keys(IMAGE_ENTRIES).forEach(function (id) {
      mergeEntry(id, IMAGE_ENTRIES[id]);
    });
  }

  /**
   * Ingest URLs from legacy VisualStock packs into the registry.
   * @param {string} industry
   * @param {VisualMood} mood
   * @param {SectionKind} section
   * @param {string|string[]} urls
   */
  function registerPackUrls(industry, mood, section, urls) {
    const profile = INDUSTRY_PROFILES[industry] || INDUSTRY_PROFILES.konsult;
    const list = Array.isArray(urls) ? urls : [urls];
    list.forEach(function (url) {
      const id = photoIdFromUrl(url);
      if (!id) return;
      const existing = registry[id] || defaultEntry(id, {});
      const industries = existing.industries.indexOf(industry) >= 0 ? existing.industries : existing.industries.concat(industry);
      const sections = existing.sections.indexOf(section) >= 0 ? existing.sections : existing.sections.concat(section);
      const moods = existing.moods.indexOf(mood) >= 0 ? existing.moods : existing.moods.concat(mood);
      const tags = existing.tags.slice();
      (profile.preferTags || []).forEach(function (t) {
        if (tags.indexOf(t) < 0) tags.push(t);
      });
      mergeEntry(id, {
        tags: tags,
        industries: industries,
        sections: sections,
        moods: moods,
        quality: existing.quality,
        headlineSpace: existing.headlineSpace,
      });
    });
  }

  function getEntry(id) {
    return registry[id] || null;
  }

  function allEntries() {
    return Object.keys(registry).map(function (id) {
      return registry[id];
    });
  }

  function normalizeThemeText(raw) {
    return String(raw || "")
      .toLowerCase()
      .replace(/å/g, "a")
      .replace(/ä/g, "a")
      .replace(/ö/g, "o")
      .normalize("NFD")
      .replace(/\u0300-\u036f/g, "")
      .replace(/\s+/g, " ");
  }

  function parseThemeFromText(raw) {
    const normalized = normalizeThemeText(raw);
    if (!normalized) return null;
    let best = null;
    let bestScore = 0;
    Object.keys(THEME_PROFILES).forEach(function (themeId) {
      const row = THEME_PROFILES[themeId];
      let score = 0;
      (row.terms || []).forEach(function (term) {
        const needle = normalizeThemeText(term);
        if (!needle) return;
        if (needle.length >= 4 || needle.indexOf(" ") >= 0) {
          if (normalized.indexOf(needle) >= 0) score += 3;
        } else if (new RegExp("(?:^|[^a-z0-9])" + needle + "(?:$|[^a-z0-9])").test(normalized)) {
          score += 2;
        }
      });
      if (score > bestScore) {
        bestScore = score;
        best = { id: themeId, label: row.label, profile: row };
      }
    });
    return bestScore >= 2 ? best : null;
  }

  function themeLabels() {
    return Object.keys(THEME_PROFILES).map(function (id) {
      return THEME_PROFILES[id].label;
    });
  }

  initExplicitEntries();

  global.ImageCatalog = {
    SECTION_STRATEGIES: SECTION_STRATEGIES,
    INDUSTRY_PROFILES: INDUSTRY_PROFILES,
    THEME_PROFILES: THEME_PROFILES,
    IMAGE_ENTRIES: IMAGE_ENTRIES,
    registerPackUrls: registerPackUrls,
    getEntry: getEntry,
    allEntries: allEntries,
    mergeEntry: mergeEntry,
    photoIdFromUrl: photoIdFromUrl,
    parseThemeFromText: parseThemeFromText,
    themeLabels: themeLabels,
    normalizeThemeText: normalizeThemeText,
    isBlockedUrl: isBlockedUrl,
  };
})(typeof window !== "undefined" ? window : globalThis);
