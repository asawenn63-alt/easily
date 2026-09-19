/**
 * Komponentregister — vilka sektioner som finns, metadata för editor/AI/render.
 * Samma register för alla mallar (data-template styr endast CSS).
 */
(function (global) {
  "use strict";

  /** @type {readonly string[]} */
  const SECTION_IDS = ["hero", "about", "services", "gallery", "faq", "booking", "contact", "footer"];

  /**
   * @typedef {Object} SectionMeta
   * @property {string} id
   * @property {string} label
   * @property {boolean} movable
   * @property {boolean} aiSection — kan fyllas via AISiteBuilder.fillSection / ai-actions
   * @property {string} [aiContext] — nyckel till ai.js generate/fill (hero|about|services|faq|cta|gallery|contact|footer)
   * @property {string[]} editableKeys — platta nycklar under section.content (för sync från DOM)
   */

  /** @type {Record<string, SectionMeta>} */
  const REGISTRY = {
    hero: {
      id: "hero",
      label: "Startsida",
      movable: true,
      aiSection: true,
      aiContext: "hero",
      editableKeys: ["hero-title", "hero-lead", "hero-cta-1-text", "hero-cta-2-text"],
    },
    about: {
      id: "about",
      label: "Om oss",
      movable: true,
      aiSection: true,
      aiContext: "about",
      editableKeys: ["about-title", "about-p1", "about-p2"],
    },
    services: {
      id: "services",
      label: "Tjänster",
      movable: true,
      aiSection: true,
      aiContext: "services",
      editableKeys: [
        "services-title",
        "services-lead",
        "card-0-icon",
        "card-0-title",
        "card-0-body",
        "card-0-cta-text",
        "card-1-icon",
        "card-1-title",
        "card-1-body",
        "card-1-cta-text",
        "card-2-icon",
        "card-2-title",
        "card-2-body",
        "card-2-cta-text",
      ],
    },
    gallery: {
      id: "gallery",
      label: "Galleri",
      movable: true,
      aiSection: false,
      aiContext: "gallery",
      editableKeys: ["gallery-title", "gallery-lead"],
    },
    faq: {
      id: "faq",
      label: "Vanliga frågor",
      movable: true,
      aiSection: true,
      aiContext: "faq",
      editableKeys: ["faq-title", "faq-0-q", "faq-0-a", "faq-1-q", "faq-1-a", "faq-2-q", "faq-2-a"],
    },
    booking: {
      id: "booking",
      label: "Bokning",
      movable: true,
      aiSection: false,
      aiContext: "booking",
      editableKeys: ["booking-title", "booking-lead"],
    },
    contact: {
      id: "contact",
      label: "Kontakt",
      movable: true,
      aiSection: false,
      aiContext: "contact",
      editableKeys: [
        "contact-title",
        "contact-phone",
        "contact-email",
        "contact-address",
        "form-label-name",
        "form-label-email",
        "form-label-message",
        "form-submit-text",
        "form-hint",
      ],
    },
    footer: {
      id: "footer",
      label: "Sidfot",
      movable: false,
      aiSection: false,
      aiContext: "footer",
      // footer-brand: redigeras i sidhuvud ovanför hero; synkas dit vid render.
      editableKeys: [
        "footer-link-1",
        "footer-link-1-href",
        "footer-link-2",
        "footer-link-2-href",
        "footer-link-3",
        "footer-link-3-href",
        "footer-social-1",
        "footer-social-2",
        "footer-social-3",
        "footer-social-1-href",
        "footer-social-2-href",
        "footer-social-3-href",
      ],
    },
  };

  function validateSectionId(id) {
    return SECTION_IDS.includes(id);
  }

  function getMeta(id) {
    return REGISTRY[id] || null;
  }

  /**
   * Bekvämt API — samma nycklar som data-section / AppDocument.sections.
   * @type {Record<string, SectionMeta>}
   */
  const sections = {
    hero: REGISTRY.hero,
    about: REGISTRY.about,
    services: REGISTRY.services,
    gallery: REGISTRY.gallery,
    faq: REGISTRY.faq,
    contact: REGISTRY.contact,
    footer: REGISTRY.footer,
  };

  global.SectionRegistry = {
    SECTION_IDS,
    REGISTRY,
    sections,
    validateSectionId,
    getMeta,
  };
})(typeof window !== "undefined" ? window : globalThis);
