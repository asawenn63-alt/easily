/**
 * Creative Brief 1.0 — maskinläsbart kontrakt (implementeringsplan 1.1, steg 1).
 * Schema och validering enligt låst Creative Brief-kontrakt. Ingen CD-logik.
 */
(function (global) {
  "use strict";

  const BRIEF_VERSION = "1.0";

  /** Obligatoriska kreativa fält (Creative Brief 1.0). */
  const REQUIRED_CREATIVE_FIELDS = [
    "concept",
    "emotionalArrival",
    "forbiddenFeeling",
    "singleMessage",
    "primaryAction",
    "ctaTone",
    "conversionJourney",
    "emotionalTerritory",
    "materialFeel",
    "spatialDensity",
    "voice",
    "restraintRules",
    "avoidPhrases",
    "entranceDominant",
    "entranceLeadMode",
    "entranceInformationBudget",
    "narrativePulse",
    "narrativePhases",
    "trustStrategy",
    "photographicDirection",
    "forbiddenImagery",
    "heroImageIntent",
    "signatureMoment",
    "differentiationTest",
  ];

  const ARRAY_FIELDS = new Set(["restraintRules", "avoidPhrases", "narrativePhases", "forbiddenImagery"]);
  const STRING_FIELDS = new Set(REQUIRED_CREATIVE_FIELDS.filter(function (f) {
    return !ARRAY_FIELDS.has(f);
  }));

  function isNonEmptyString(v) {
    return typeof v === "string" && v.trim().length > 0;
  }

  function isNonEmptyStringArray(v) {
    return (
      Array.isArray(v) &&
      v.length > 0 &&
      v.every(function (item) {
        return isNonEmptyString(item);
      })
    );
  }

  function validateBusinessFacts(facts, errors) {
    facts = facts || {};
    if (!isNonEmptyString(facts.businessName)) {
      errors.push("businessFacts.businessName");
    }
  }

  const ALLOWED_TEMPLATES = new Set(["editorial", "atelier", "swiss-grid", "luxury-brand", "landmark"]);
  const ALLOWED_THEMES = new Set(["minimal-white", "beige-lux", "black-gold"]);
  const REQUIRED_COLOR_KEYS = ["bg", "surface", "text", "accent", "primary", "secondary", "border"];

  /** Dokumentsektioner som CD får låsa i brief.scope (ej footer). */
  const ALLOWED_SCOPE_SECTIONS = Object.freeze([
    "hero",
    "about",
    "services",
    "gallery",
    "faq",
    "booking",
    "contact",
  ]);

  function scopeIncludesSection(brief, sectionId) {
    const sections = brief && brief.scope && brief.scope.sections;
    if (!Array.isArray(sections)) return false;
    const target = String(sectionId || "").trim();
    return sections.some(function (id) {
      return String(id).trim() === target;
    });
  }

  function validateScopeDecision(scope, errors) {
    if (!scope || typeof scope !== "object") {
      errors.push("scope");
      return;
    }
    const sections = scope.sections;
    if (!Array.isArray(sections) || sections.length < 1) {
      errors.push("scope.sections");
      return;
    }
    const seen = new Set();
    sections.forEach(function (id, i) {
      const sid = String(id || "").trim();
      if (!ALLOWED_SCOPE_SECTIONS.includes(sid)) {
        errors.push("scope.sections[" + i + "]");
      }
      if (seen.has(sid)) {
        errors.push("scope.sections.duplicate:" + sid);
      }
      seen.add(sid);
    });
    if (!scopeIncludesSection({ scope: scope }, "hero")) {
      errors.push("scope.sections.missing_hero");
    }
  }

  function validateAboutDecision(about, errors, brief) {
    if (!scopeIncludesSection(brief, "about")) return;
    if (!about || typeof about !== "object") {
      errors.push("about");
      return;
    }
    if (!isNonEmptyString(about.title)) errors.push("about.title");
    if (!isNonEmptyString(about.p1)) errors.push("about.p1");
    if (!isNonEmptyString(about.p2)) errors.push("about.p2");
  }

  function validateServicesDecision(services, errors, brief) {
    if (!scopeIncludesSection(brief, "services")) return;
    if (!services || typeof services !== "object") {
      errors.push("services");
      return;
    }
    if (!isNonEmptyString(services.title)) errors.push("services.title");
    if (!isNonEmptyString(services.lead)) errors.push("services.lead");
    if (!Array.isArray(services.cards) || services.cards.length < 1) {
      errors.push("services.cards");
      return;
    }
    services.cards.forEach(function (card, i) {
      if (!card || typeof card !== "object") {
        errors.push("services.cards[" + i + "]");
        return;
      }
      if (!isNonEmptyString(card.title)) errors.push("services.cards[" + i + "].title");
      if (!isNonEmptyString(card.body)) errors.push("services.cards[" + i + "].body");
    });
  }

  function validateGalleryDecision(gallery, errors, brief) {
    if (!scopeIncludesSection(brief, "gallery")) return;
    if (!gallery || typeof gallery !== "object") {
      errors.push("gallery");
      return;
    }
    if (!isNonEmptyString(gallery.title)) errors.push("gallery.title");
    if (!isNonEmptyString(gallery.lead)) errors.push("gallery.lead");
  }

  function validateContactDecision(contact, errors, brief) {
    if (!scopeIncludesSection(brief, "contact")) return;
    if (!contact || typeof contact !== "object") {
      errors.push("contact");
      return;
    }
    if (!isNonEmptyString(contact.title)) errors.push("contact.title");
    if (!isNonEmptyString(contact.lead)) errors.push("contact.lead");
  }

  function validateFaqDecision(faq, errors, brief) {
    if (!scopeIncludesSection(brief, "faq")) return;
    if (!faq || typeof faq !== "object") {
      errors.push("faq");
      return;
    }
    if (!isNonEmptyString(faq.title)) errors.push("faq.title");
    if (!isNonEmptyString(faq.lead)) errors.push("faq.lead");
    if (!Array.isArray(faq.items) || faq.items.length < 1) {
      errors.push("faq.items");
      return;
    }
    faq.items.forEach(function (item, i) {
      if (!item || typeof item !== "object") {
        errors.push("faq.items[" + i + "]");
        return;
      }
      if (!isNonEmptyString(item.q)) errors.push("faq.items[" + i + "].q");
      if (!isNonEmptyString(item.a)) errors.push("faq.items[" + i + "].a");
    });
  }

  function validateBookingDecision(booking, errors, brief) {
    if (!scopeIncludesSection(brief, "booking")) return;
    if (!booking || typeof booking !== "object") {
      errors.push("booking");
      return;
    }
    if (!isNonEmptyString(booking.title)) errors.push("booking.title");
    if (!isNonEmptyString(booking.lead)) errors.push("booking.lead");
    if (booking.intro != null && !isNonEmptyString(booking.intro)) errors.push("booking.intro");
    if (booking.description != null && !isNonEmptyString(booking.description)) {
      errors.push("booking.description");
    }
  }

  function validateHeroDecision(hero, errors) {
    if (!hero || typeof hero !== "object") {
      errors.push("hero");
      return;
    }
    if (!isNonEmptyString(hero.title)) errors.push("hero.title");
    if (!isNonEmptyString(hero.lead)) errors.push("hero.lead");
    const primary = hero.primaryCta;
    if (!primary || typeof primary !== "object") {
      errors.push("hero.primaryCta");
    } else {
      if (!isNonEmptyString(primary.text)) errors.push("hero.primaryCta.text");
      if (!isNonEmptyString(primary.href)) errors.push("hero.primaryCta.href");
    }
    const secondary = hero.secondaryCta;
    if (!secondary || typeof secondary !== "object") {
      errors.push("hero.secondaryCta");
    } else {
      if (!isNonEmptyString(secondary.text)) errors.push("hero.secondaryCta.text");
      if (!isNonEmptyString(secondary.href)) errors.push("hero.secondaryCta.href");
    }
  }

  function validateDesignDecision(design, errors) {
    if (!design || typeof design !== "object") {
      errors.push("design");
      return;
    }
    if (!isNonEmptyString(design.theme) || !ALLOWED_THEMES.has(design.theme)) {
      errors.push("design.theme");
    }
    if (!isNonEmptyString(design.template) || !ALLOWED_TEMPLATES.has(design.template)) {
      errors.push("design.template");
    }
    const colors = design.colors;
    if (!colors || typeof colors !== "object") {
      errors.push("design.colors");
    } else {
      REQUIRED_COLOR_KEYS.forEach(function (key) {
        if (!isNonEmptyString(colors[key])) errors.push("design.colors." + key);
      });
    }
  }

  function isImageUrl(v) {
    if (!isNonEmptyString(v)) return false;
    const u = String(v).trim().toLowerCase();
    return u.startsWith("https://") || u.startsWith("http://");
  }

  function validateImageSlot(slot, path, errors) {
    if (!slot || typeof slot !== "object" || !isImageUrl(slot.url)) {
      errors.push(path);
    }
  }

  function validateImageDecision(images, errors) {
    if (!images || typeof images !== "object") {
      errors.push("images");
      return;
    }
    validateImageSlot(images.hero, "images.hero", errors);
    validateImageSlot(images.about, "images.about", errors);
    if (!Array.isArray(images.cards) || images.cards.length < 1) {
      errors.push("images.cards");
    } else {
      images.cards.forEach(function (slot, i) {
        validateImageSlot(slot, "images.cards[" + i + "]", errors);
      });
    }
    if (!Array.isArray(images.gallery) || images.gallery.length < 1) {
      errors.push("images.gallery");
    } else {
      images.gallery.forEach(function (slot, i) {
        validateImageSlot(slot, "images.gallery[" + i + "]", errors);
      });
    }
  }

  /**
   * @param {object} brief
   * @param {{ requireComplete?: boolean }} opts
   */
  function validateCreativeBrief(brief, opts) {
    opts = opts || {};
    const errors = [];
    if (!brief || typeof brief !== "object") {
      return { ok: false, errors: ["creativeBrief"] };
    }
    if (brief.briefVersion !== BRIEF_VERSION) {
      errors.push("briefVersion");
    }
    validateBusinessFacts(brief.businessFacts, errors);
    if (opts.requireComplete !== false) {
      validateScopeDecision(brief.scope, errors);
      validateHeroDecision(brief.hero, errors);
      validateAboutDecision(brief.about, errors, brief);
      validateServicesDecision(brief.services, errors, brief);
      validateGalleryDecision(brief.gallery, errors, brief);
      validateContactDecision(brief.contact, errors, brief);
      validateFaqDecision(brief.faq, errors, brief);
      validateBookingDecision(brief.booking, errors, brief);
      validateDesignDecision(brief.design, errors);
      validateImageDecision(brief.images, errors);
      REQUIRED_CREATIVE_FIELDS.forEach(function (field) {
        const v = brief[field];
        if (ARRAY_FIELDS.has(field)) {
          if (!isNonEmptyStringArray(v)) errors.push(field);
        } else if (STRING_FIELDS.has(field)) {
          if (!isNonEmptyString(v)) errors.push(field);
        }
      });
    }
    return { ok: errors.length === 0, errors: errors };
  }

  function createEmptyBrief() {
    return {
      briefVersion: BRIEF_VERSION,
      businessFacts: {
        businessName: "",
        location: "",
        industry: "",
        siteGoals: [],
      },
    };
  }

  const COMPOSITION_INPUT_CONTRACT = Object.freeze({
    version: "1.0",
    readsFromBrief: Object.freeze([
      "scope",
      "concept",
      "conversionJourney",
      "narrativePulse",
      "narrativePhases",
      "entranceDominant",
      "entranceLeadMode",
      "entranceInformationBudget",
      "spatialDensity",
      "primaryAction",
      "trustStrategy",
      "signatureMoment",
      "emotionalTerritory",
      "singleMessage",
    ]),
    produces: Object.freeze([
      "sectionOrder",
      "compositionBlocks",
      "cardCount",
      "cardIntents",
      "layoutKeys",
      "compositionLocked",
    ]),
    doesNotProduce: Object.freeze(["heroCopy", "ctaCopy", "colorTerritory", "imageSelection"]),
  });

  const HERO_INPUT_CONTRACT = Object.freeze({
    version: "1.0",
    readsFromBrief: Object.freeze(["hero"]),
    produces: Object.freeze([
      "sections.hero.content.hero-title",
      "sections.hero.content.hero-lead",
      "sections.hero.content.hero-cta-1-text",
      "sections.hero.content.hero-cta-1-href",
      "sections.hero.content.hero-cta-2-text",
      "sections.hero.content.hero-cta-2-href",
    ]),
    doesNotCompose: Object.freeze(true),
  });

  const ABOUT_INPUT_CONTRACT = Object.freeze({
    version: "1.0",
    readsFromBrief: Object.freeze(["about", "scope"]),
    produces: Object.freeze([
      "sections.about.content.about-title",
      "sections.about.content.about-p1",
      "sections.about.content.about-p2",
    ]),
    doesNotCompose: Object.freeze(true),
  });

  const SERVICES_INPUT_CONTRACT = Object.freeze({
    version: "1.0",
    readsFromBrief: Object.freeze(["services", "scope"]),
    produces: Object.freeze([
      "sections.services.content.services-title",
      "sections.services.content.services-lead",
      "sections.services.cards[].title",
      "sections.services.cards[].body",
    ]),
    doesNotCompose: Object.freeze(true),
  });

  const GALLERY_INPUT_CONTRACT = Object.freeze({
    version: "1.0",
    readsFromBrief: Object.freeze(["gallery", "scope"]),
    produces: Object.freeze([
      "sections.gallery.content.gallery-title",
      "sections.gallery.content.gallery-lead",
    ]),
    doesNotCompose: Object.freeze(true),
  });

  const CONTACT_INPUT_CONTRACT = Object.freeze({
    version: "1.0",
    readsFromBrief: Object.freeze(["contact", "scope"]),
    produces: Object.freeze([
      "sections.contact.content.contact-title",
      "sections.contact.content.contact-lead",
    ]),
    doesNotCompose: Object.freeze(true),
  });

  const FAQ_INPUT_CONTRACT = Object.freeze({
    version: "1.0",
    readsFromBrief: Object.freeze(["faq", "scope"]),
    produces: Object.freeze([
      "sections.faq.content.faq-title",
      "sections.faq.content.faq-lead",
      "sections.faq.items[].q",
      "sections.faq.items[].a",
    ]),
    doesNotCompose: Object.freeze(true),
  });

  const BOOKING_INPUT_CONTRACT = Object.freeze({
    version: "1.0",
    readsFromBrief: Object.freeze(["booking", "scope"]),
    produces: Object.freeze([
      "sections.booking.content.booking-title",
      "sections.booking.content.booking-lead",
      "sections.booking.content.booking-intro",
      "sections.booking.content.booking-description",
    ]),
    doesNotCompose: Object.freeze(true),
  });

  const DESIGN_INPUT_CONTRACT = Object.freeze({
    version: "1.0",
    readsFromBrief: Object.freeze(["design"]),
    produces: Object.freeze([
      "page.theme",
      "page.template",
      "page.designColors",
      "page.accentStyle",
      "page.ctaEmphasis",
      "page.buttonStyle",
      "page.fontPair",
      "page.cdDesignLocked",
    ]),
    doesNotCompose: Object.freeze(true),
    doesNotUse: Object.freeze(["DesignFamilies", "designFamily", "createDesignStyle", "industry"]),
  });

  const IMAGE_INPUT_CONTRACT = Object.freeze({
    version: "1.0",
    readsFromBrief: Object.freeze(["images"]),
    produces: Object.freeze([
      "page.heroBgUrl",
      "sections.about.imageUrl",
      "sections.services.cards[].img",
      "sections.gallery.images",
      "page.cdImagesLocked",
    ]),
    doesNotCompose: Object.freeze(true),
    doesNotUse: Object.freeze([
      "ImageSelectionEngine",
      "ImageIntelligenceEngine",
      "VisualStock",
      "onboardingDescription",
      "industry",
    ]),
  });

  global.CreativeBriefContract = {
    BRIEF_VERSION: BRIEF_VERSION,
    REQUIRED_CREATIVE_FIELDS: REQUIRED_CREATIVE_FIELDS.slice(),
    ALLOWED_TEMPLATES: ALLOWED_TEMPLATES,
    ALLOWED_THEMES: ALLOWED_THEMES,
    ALLOWED_SCOPE_SECTIONS: ALLOWED_SCOPE_SECTIONS,
    validateScopeDecision: validateScopeDecision,
    COMPOSITION_INPUT_CONTRACT: COMPOSITION_INPUT_CONTRACT,
    HERO_INPUT_CONTRACT: HERO_INPUT_CONTRACT,
    ABOUT_INPUT_CONTRACT: ABOUT_INPUT_CONTRACT,
    SERVICES_INPUT_CONTRACT: SERVICES_INPUT_CONTRACT,
    GALLERY_INPUT_CONTRACT: GALLERY_INPUT_CONTRACT,
    CONTACT_INPUT_CONTRACT: CONTACT_INPUT_CONTRACT,
    FAQ_INPUT_CONTRACT: FAQ_INPUT_CONTRACT,
    BOOKING_INPUT_CONTRACT: BOOKING_INPUT_CONTRACT,
    DESIGN_INPUT_CONTRACT: DESIGN_INPUT_CONTRACT,
    IMAGE_INPUT_CONTRACT: IMAGE_INPUT_CONTRACT,
    validateCreativeBrief: validateCreativeBrief,
    validateHeroDecision: validateHeroDecision,
    validateAboutDecision: validateAboutDecision,
    validateServicesDecision: validateServicesDecision,
    validateGalleryDecision: validateGalleryDecision,
    validateContactDecision: validateContactDecision,
    validateFaqDecision: validateFaqDecision,
    validateBookingDecision: validateBookingDecision,
    scopeIncludesSection: scopeIncludesSection,
    validateDesignDecision: validateDesignDecision,
    validateImageDecision: validateImageDecision,
    createEmptyBrief: createEmptyBrief,
  };
})(typeof window !== "undefined" ? window : globalThis);
