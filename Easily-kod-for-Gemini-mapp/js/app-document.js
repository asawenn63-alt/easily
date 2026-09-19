/**
 * AppDocument — schema för framtida API / DB / publicering.
 * documentVersion ökas vid publicerad revision; schemaVersion vid breaking changes.
 */
(function (global) {
  "use strict";

  const SCHEMA_VERSION = 1;

  function deepMerge(target, source) {
    if (!source || typeof source !== "object") return target;
    const out = Array.isArray(target) ? target.slice() : { ...target };
    Object.keys(source).forEach((k) => {
      const sv = source[k];
      const tv = out[k];
      if (sv && typeof sv === "object" && !Array.isArray(sv) && tv && typeof tv === "object" && !Array.isArray(tv)) {
        out[k] = deepMerge(tv, sv);
      } else {
        out[k] = sv;
      }
    });
    return out;
  }

  /** Delar upp «Kalle Snickare i Solna» → namn + ort för textlogotyp. */
  function splitBrandAndLocation(brand, location) {
    let name = String(brand || "").trim();
    let city = String(location || "").trim();
    if (!city && name) {
      const m = name.match(/\s+i\s+([A-ZÅÄÖ][a-zåäöA-ZÅÄÖ&-]+(?:\s+[A-ZÅÄÖ][a-zåäö&-]+)*)\s*$/i);
      if (m) {
        city = m[1].trim();
        name = name
          .replace(/\s+i\s+[A-ZÅÄÖ][a-zåäöA-ZÅÄÖ&-]+(?:\s+[A-ZÅÄÖ][a-zåäö&-]+)*\s*$/i, "")
          .trim();
      }
    } else if (city && name) {
      const esc = city.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      name = name.replace(new RegExp("\\s+i\\s+" + esc + "\\s*$", "i"), "").trim();
    }
    return { brand: name, location: city };
  }

  /** Ignorera platshållare från formuläret — då ska textlogotyp visas i stället. */
  function isRealLogoUrl(url) {
    const u = String(url || "").trim();
    if (!u) return false;
    const stripped = u.replace(/^https?:\/\//i, "").toLowerCase();
    if (/^din-dom[aä]n\.se\/logo\.png$/i.test(stripped)) return false;
    return true;
  }

  /** Bransch → textlogotyp-stil (typografi). */
  function resolveTextLogoStyle(industry) {
    const ind = String(industry || "")
      .toLowerCase()
      .trim();
    if (ind === "byggfirma") return "craftsman";
    if (ind === "advokat") return "legal";
    if (ind === "hunddagis" || ind === "hundsalong") return "playful";
    if (ind === "fotograf") return "creative";
    if (ind === "tarot") return "creative";
    return "classic";
  }

  /** Bransch → andra raden när ort inte passar (t.ex. ADVOKATBYRÅ, PHOTOGRAPHY). */
  function resolveTextLogoTagline(industry) {
    const ind = String(industry || "")
      .toLowerCase()
      .trim();
    if (ind === "advokat") return "Advokatbyrå";
    if (ind === "fotograf") return "Photography";
    if (ind === "tarot") return "Tarot & vägledning";
    return "";
  }

  /**
   * Säkerställ textlogotyp när ingen riktig logotyp finns.
   * Namn + underrad (ort eller bransch-tagline), stil från bransch.
   */
  function ensureTextLogo(doc, opts) {
    opts = opts || {};
    if (!doc || !doc.page) return doc;
    const industry = opts.industry || doc.page.industry || "konsult";
    const brandIn = opts.brand != null ? opts.brand : doc.sections?.footer?.content?.["footer-brand"];
    const locationIn = opts.location != null ? opts.location : doc.page.location;
    const split = splitBrandAndLocation(brandIn, locationIn);
    const hasLogo =
      isRealLogoUrl(doc.page.logoUrl) ||
      (doc.page.material && isRealLogoUrl(doc.page.material.logoUrl));

    if (!doc.sections) doc.sections = {};
    if (!doc.sections.footer) doc.sections.footer = { content: {}, hidden: false };
    if (!doc.sections.footer.content) doc.sections.footer.content = {};

    doc.sections.footer.content["footer-brand"] = split.brand || doc.sections.footer.content["footer-brand"] || "";
    if (split.location) doc.page.location = split.location;

    if (hasLogo) {
      doc.page.textLogoAuto = false;
      return doc;
    }

    if (doc.page.compositionLocked) {
      doc.page.textLogoAuto = true;
      return doc;
    }

    const tagline = resolveTextLogoTagline(industry);
    doc.page.textLogoStyle = resolveTextLogoStyle(industry);
    doc.page.textLogoTagline = tagline;
    doc.page.textLogoSubline = tagline || split.location || String(doc.page.location || "").trim();
    doc.page.textLogoAuto = true;
    doc.page.logoUrl = "";
    if (doc.page.material) doc.page.material.logoUrl = "";
    return doc;
  }

  function createDefaultDocument() {
    const stock =
      global.VisualStock && typeof global.VisualStock.defaultsFor === "function"
        ? global.VisualStock.defaultsFor("verksamhet", "editorial")
        : null;
    const heroBgUrl = stock?.heroBgUrl || "https://picsum.photos/seed/hero-studio/1920/1080";
    const aboutImg = stock?.about || "https://picsum.photos/seed/about-team/800/900";
    const cardImgs =
      stock?.cards && stock.cards.length >= 3
        ? stock.cards
        : [
            "https://picsum.photos/seed/card-brand/640/400",
            "https://picsum.photos/seed/card-web/640/400",
            "https://picsum.photos/seed/card-growth/640/400",
          ];
    const galleryImgs =
      stock?.gallery && stock.gallery.length >= 4
        ? stock.gallery
        : [
            "https://picsum.photos/seed/g1/800/600",
            "https://picsum.photos/seed/g2/800/600",
            "https://picsum.photos/seed/g3/800/600",
            "https://picsum.photos/seed/g4/800/600",
          ];

    return {
      schemaVersion: SCHEMA_VERSION,
      documentVersion: 0,
      /**
       * För framtida backend: DB-id, publicering, ägare, AI API revision.
       * Frontend-only: lämna null / tomt tills API finns.
       * @type {{
       *   siteId?: string | null;
       *   slug?: string | null;
       *   ownerUserId?: string | null;
       *   draftRevision?: number;
       *   publishedRevision?: number | null;
       *   publishedAt?: string | null;
       *   lastSyncedAt?: string | null;
       *   updatedAt?: string | null;
       *   aiModel?: string | null;
       * }}
       */
      meta: {
        siteId: null,
        slug: null,
        ownerUserId: null,
        draftRevision: 0,
        publishedRevision: null,
        publishedAt: null,
        lastSyncedAt: null,
        updatedAt: null,
        aiModel: null,
      },
      page: {
        designFamily: "salon",
        template: "luxury-brand",
        theme: "minimal-white",
        industry: "verksamhet",
        area: "",
        goal: "",
        bookingUrl: "",
        foodoraUrl: "",
        woltUrl: "",
        pickupUrl: "",
        fontPair: "",
        sectionSpacing: "2",
        buttonStyle: "",
        heroLayout: "center",
        heroBgUrl,
        location: "",
        sectionOrder: ["hero", "about", "services", "gallery", "faq", "booking", "contact", "footer"],
      },
      sections: {
        hero: {
          hidden: false,
          dataStyle: "",
          highlights: [],
          content: {
            "hero-title": "Tydligt erbjudande i en mening",
            "hero-lead":
              "Två eller tre meningar om vad ni gör, för vilka kunder och var ni finns. Byt bild så sajten direkt känns er.",
            "hero-cta-1-text": "Kontakta oss",
            "hero-cta-1-href": "#kontakt",
            "hero-cta-2-text": "Se vad vi erbjuder",
            "hero-cta-2-href": "#tjanster",
          },
        },
        about: {
          hidden: false,
          dataStyle: "asymmetric",
          imageUrl: aboutImg,
          highlights: [],
          content: {
            "about-title": "Om oss",
            "about-p1":
              "Vi är ett företag som gillar klara besked och att hålla vad vi lovar — i planering, leverans och uppföljning.",
            "about-p2":
              "Här beskriver ni gärna var ni finns i landet eller staden, era värderingar och vad kunder oftast väljer er för.",
          },
        },
        services: {
          hidden: false,
          dataStyle: "",
          highlights: [],
          content: {
            "services-title": "Det här hjälper vi er med",
            "services-lead": "Tre korta rader över vad kunder oftast vill veta först.",
          },
          cards: [
            {
              icon: "",
              title: "Era tjänster",
              body: "Nämn det viktigaste ni levererar — i butik, på plats eller digitalt.",
              img: cardImgs[0],
              intent: "services",
              ctaText: "Läs mer",
              ctaHref: "#tjanster",
            },
            {
              icon: "",
              title: "Bokning & priser",
              body: "Hur det går till att höra av sig eller boka och hur era priser brukar presenteras.",
              img: cardImgs[1],
              intent: "services",
              ctaText: "Läs mer",
              ctaHref: "#kontakt",
            },
            {
              icon: "",
              title: "Omdöme & referenser",
              body: "Kort vad andra säger eller hur länge ni funnits på marknaden — byt till riktiga namn sedan.",
              img: cardImgs[2],
              intent: "services",
              ctaText: "Läs mer",
              ctaHref: "#fragor",
            },
          ],
        },
        gallery: {
          hidden: false,
          dataStyle: "",
          content: {
            "gallery-title": "Galleri",
            "gallery-lead": "Ett ögonkast på er miljö, ert arbete eller ert lag — byt bilderna mot era egna.",
          },
          images: galleryImgs.slice(),
        },
        faq: {
          hidden: false,
          dataStyle: "",
          content: { "faq-title": "Vanliga frågor" },
          items: [
            {
              q: "Hur når jag er snabbast?",
              a: "Ring eller mejla oss i kontaktblocket nedan — vi återkopplar oftast inom en arbetsdag.",
            },
            {
              q: "Var finns ni och när har ni öppet?",
              a: "Adress och tider står i kontaktblocket — skriv in era ordinarie tider eller bokningsläge här.",
            },
            {
              q: "Vilka betalningar accepterar ni?",
              a: "Lägg in er praxis här: till exempel faktura, kort i kassan eller Swish.",
            },
          ],
        },
        booking: {
          hidden: true,
          dataStyle: "",
          content: {
            "booking-title": "Boka tid",
            "booking-lead": "Välj en tid som passar dig — bekräftelse skickas direkt efter bokning.",
          },
        },
        contact: {
          hidden: false,
          dataStyle: "",
          content: {
            "contact-title": "Kontakt",
            "contact-phone": "+46 70 123 45 67",
            "contact-email": "hej@aisitestudio.se",
            "contact-address": "Birger Jarlsgatan 1, 114 34 Stockholm",
            "form-label-name": "Namn",
            "form-label-email": "E-post",
            "form-label-message": "Meddelande",
            "form-submit-text": "Skicka (demo)",
            "form-hint": "Meddelandet skickas inte någonstans ännu.",
          },
          mapEmbedUrl:
            "https://www.openstreetmap.org/export/embed.html?bbox=18.06%2C59.33%2C18.09%2C59.35&layer=mapnik",
        },
        footer: {
          hidden: false,
          dataStyle: "",
          content: {
            "footer-brand": "",
            "footer-link-1": "Utvalt",
            "footer-link-1-href": "#tjanster",
            "footer-link-2": "Kontakt",
            "footer-link-2-href": "#kontakt",
            "footer-link-3": "Integritet",
            "footer-link-3-href": "#kontakt",
            "footer-social-1": "FB",
            "footer-social-2": "IG",
            "footer-social-3": "in",
            "footer-social-1-href": "https://www.facebook.com/",
            "footer-social-2-href": "https://www.instagram.com/",
            "footer-social-3-href": "https://www.linkedin.com/",
          },
        },
      },
    };
  }

  function validate(doc) {
    if (!doc || typeof doc !== "object") return { ok: false, error: "empty" };
    if (doc.schemaVersion !== SCHEMA_VERSION) return { ok: false, error: "schemaVersion" };
    if (!doc.page || !Array.isArray(doc.page.sectionOrder)) return { ok: false, error: "page.sectionOrder" };
    if (!doc.sections) return { ok: false, error: "sections" };
    return { ok: true };
  }

  const LEGACY_TEMPLATE_MAP = {
    "modern-agency": "editorial",
    "minimal-portfolio": "swiss-grid",
    event: "landmark",
    restaurant: "atelier",
    "neo-brutal": "landmark",
  };
  const ALLOWED_TEMPLATES = new Set(["editorial", "atelier", "swiss-grid", "luxury-brand", "landmark"]);

  function isCdNormalizePath(doc) {
    const CDG = global.CreateCdGate;
    if (CDG && typeof CDG.isV2PathActive === "function" && CDG.isV2PathActive(doc)) {
      return true;
    }
    if (CDG && typeof CDG.isBlueprintPathActive === "function" && CDG.isBlueprintPathActive(doc)) {
      return true;
    }
    if (CDG && typeof CDG.isCdPathActive === "function") {
      return CDG.isCdPathActive(doc);
    }
    return !!(doc && doc.page && (doc.page.createPath === "v2" || doc.page.createPath === "cd" || doc.page.createPath === "blueprint"));
  }

  function createMinimalSectionShell() {
    return { hidden: true, dataStyle: "", content: {} };
  }

  function createMinimalMeta() {
    return {
      siteId: null,
      slug: null,
      ownerUserId: null,
      draftRevision: 0,
      publishedRevision: null,
      publishedAt: null,
      lastSyncedAt: null,
      updatedAt: null,
      aiModel: null,
    };
  }

  /**
   * V2 ägs enbart av den fria scenen. Gamla sektioner, mallar och designfamiljer
   * får aldrig följa med in via dokumentnormaliseringen.
   */
  function normalizeV2Document(doc) {
    const source = JSON.parse(JSON.stringify(doc || {}));
    const page = source.page && typeof source.page === "object" && !Array.isArray(source.page)
      ? source.page
      : {};
    const meta = deepMerge(createMinimalMeta(), source.meta && typeof source.meta === "object" ? source.meta : {});

    page.createPath = "v2";
    page.sectionOrder = [];
    delete page.template;
    delete page.theme;
    delete page.industry;
    delete page.designFamily;
    delete page.designSpec;
    delete page.componentStrategy;
    delete page.sectionType;
    delete page.variant;
    delete page.siteBlueprint;
    delete page.layoutEngine;
    delete page.layoutSpec;
    delete page.siteComposition;

    return {
      schemaVersion: SCHEMA_VERSION,
      documentVersion: Number(source.documentVersion) || 0,
      meta,
      page,
      sections: {},
    };
  }

  /** Create-flöde — tom start utan legacy-copy, demo-kontakt, bilder eller malltexter. */
  function createEmptyCreateDocument() {
    const sectionIds =
      global.SectionRegistry && global.SectionRegistry.SECTION_IDS
        ? global.SectionRegistry.SECTION_IDS.slice()
        : ["hero", "about", "services", "gallery", "faq", "booking", "contact", "footer"];

    const sections = {};
    sectionIds.forEach(function (id) {
      const shell = createMinimalSectionShell();
      shell.hidden = id !== "hero" && id !== "footer";
      shell.content = {};
      shell.highlights = [];
      if (id === "services") shell.cards = [];
      if (id === "gallery") shell.images = [];
      if (id === "faq") shell.items = [];
      sections[id] = shell;
    });

    return {
      schemaVersion: SCHEMA_VERSION,
      documentVersion: 0,
      meta: createMinimalMeta(),
      page: {
        sectionOrder: ["hero", "footer"],
        location: "",
        heroBgUrl: "",
        industry: "",
        area: "",
        goal: "",
        template: "",
        theme: "",
        designFamily: "",
        fontPair: "",
        sectionSpacing: "2",
        buttonStyle: "",
        heroLayout: "",
        bookingUrl: "",
        foodoraUrl: "",
        woltUrl: "",
        pickupUrl: "",
      },
      sections: sections,
    };
  }

  function isCreateFlowEmptyBase(doc) {
    return !!(doc && doc.meta && doc.meta.createFlowGeneration === true);
  }

  function resolveNormalizeBase(doc) {
    if (isCdNormalizePath(doc) || isCreateFlowEmptyBase(doc)) {
      return createEmptyCreateDocument();
    }
    return createDefaultDocument();
  }

  /** CD Create — doc ägs av brief + executors; inga default-copy/identitet från deepMerge. */
  function normalizeCdDocument(doc) {
    if (doc && doc.page && doc.page.createPath === "v2") {
      return normalizeV2Document(doc);
    }
    const merged = JSON.parse(JSON.stringify(doc || {}));
    const blueprintDocument = !!(merged.page && (
      merged.page.createPath === "v2" ||
      merged.page.createPath === "blueprint" ||
      merged.page.blueprintLocked === true ||
      merged.page.siteBlueprint
    ));
    merged.schemaVersion = SCHEMA_VERSION;

    if (!merged.meta || typeof merged.meta !== "object" || Array.isArray(merged.meta)) {
      merged.meta = createMinimalMeta();
    }
    if (!merged.page || typeof merged.page !== "object" || Array.isArray(merged.page)) {
      merged.page = {};
    }
    if (!merged.sections || typeof merged.sections !== "object" || Array.isArray(merged.sections)) {
      merged.sections = {};
    }

    if (!blueprintDocument && merged.page.template) {
      const t = merged.page.template;
      if (LEGACY_TEMPLATE_MAP[t]) merged.page.template = LEGACY_TEMPLATE_MAP[t];
      if (!ALLOWED_TEMPLATES.has(merged.page.template)) merged.page.template = "editorial";
    }

    if (Array.isArray(merged.page.sectionOrder) && global.SectionRegistry) {
      const valid = new Set(global.SectionRegistry.SECTION_IDS);
      merged.page.sectionOrder = merged.page.sectionOrder.filter(function (id) {
        return valid.has(id);
      });
    } else if (!Array.isArray(merged.page.sectionOrder)) {
      merged.page.sectionOrder = [];
    }

    const CDG = global.CreateCdGate;
    if (CDG && typeof CDG.purgeLegacyIdentityFields === "function") {
      CDG.purgeLegacyIdentityFields(merged.page);
    }

    if (!blueprintDocument && global.DesignFamilies && typeof global.DesignFamilies.syncPageDesign === "function") {
      global.DesignFamilies.syncPageDesign(merged.page);
    }

    if (blueprintDocument) {
      delete merged.page.template;
      delete merged.page.theme;
      delete merged.page.designFamily;
      delete merged.page.layoutEngine;
      delete merged.page.layoutSpec;
      delete merged.page.siteComposition;
    }

    if (global.SectionRegistry) {
      global.SectionRegistry.SECTION_IDS.forEach(function (id) {
        if (!merged.sections[id]) {
          merged.sections[id] = createMinimalSectionShell();
        }
      });
    }

    if (merged.sections.services) {
      delete merged.sections.services.contentBlockIntent;
      const crds = merged.sections.services.cards;
      const validIntent = new Set(["pricing", "faq", "packages", "process", "testimonials", "services"]);
      if (Array.isArray(crds)) {
        crds.forEach(function (c) {
          if (!c.intent || !validIntent.has(c.intent)) c.intent = "services";
          if (typeof c.ctaText !== "string") c.ctaText = "";
          if (typeof c.ctaHref !== "string") c.ctaHref = "";
          const icon = String(c.icon || "").trim();
          if (icon) c.icon = "";
        });
      }
      const pl = merged.sections.services.pricelist;
      if (pl && typeof pl === "object") {
        const rows = Array.isArray(pl.rows) ? pl.rows : [];
        merged.sections.services.pricelist = {
          rows: rows.slice(0, 30).map(function (r) {
            return {
              name: String(r?.name != null ? r.name : "").trim(),
              price: String(r?.price != null ? r.price : "").trim(),
            };
          }),
        };
      } else if (pl != null) {
        delete merged.sections.services.pricelist;
      }
    }

    if (merged.sections?.footer?.content && merged.page) {
      const split = splitBrandAndLocation(
        merged.sections.footer.content["footer-brand"],
        merged.page.location,
      );
      merged.sections.footer.content["footer-brand"] = split.brand;
      if (split.location) merged.page.location = split.location;
      else if (merged.page.location == null) merged.page.location = "";
      if (merged.page.logoUrl && !isRealLogoUrl(merged.page.logoUrl)) merged.page.logoUrl = "";
      if (merged.page.material && merged.page.material.logoUrl && !isRealLogoUrl(merged.page.material.logoUrl)) {
        merged.page.material.logoUrl = "";
      }
    }

    return merged;
  }

  function normalize(doc) {
    if (isCdNormalizePath(doc)) {
      return normalizeCdDocument(doc);
    }

    const base = resolveNormalizeBase(doc);
    const merged = deepMerge(base, doc);
    merged.schemaVersion = SCHEMA_VERSION;
    if (!merged.page || typeof merged.page !== "object" || Array.isArray(merged.page)) {
      merged.page = { ...base.page };
    }
    if (!merged.sections || typeof merged.sections !== "object" || Array.isArray(merged.sections)) {
      merged.sections = JSON.parse(JSON.stringify(base.sections));
    }
    if (merged.page && merged.page.template) {
      const t = merged.page.template;
      if (LEGACY_TEMPLATE_MAP[t]) merged.page.template = LEGACY_TEMPLATE_MAP[t];
      if (!ALLOWED_TEMPLATES.has(merged.page.template)) merged.page.template = "editorial";
    }
    if (merged.page) {
      const defaultOrder = base.page.sectionOrder ? base.page.sectionOrder.slice() : [];
      let ord = Array.isArray(merged.page.sectionOrder) ? merged.page.sectionOrder.slice() : [];
      const valid = new Set(defaultOrder);
      ord = ord.filter((id) => valid.has(id));
      for (const id of defaultOrder) {
        if (!ord.includes(id)) ord.push(id);
      }
      merged.page.sectionOrder = ord.length ? ord : defaultOrder;
    }
    if (global.DesignFamilies && typeof global.DesignFamilies.syncPageDesign === "function") {
      global.DesignFamilies.syncPageDesign(merged.page);
    } else if (global.DesignFamilies && typeof global.DesignFamilies.syncPageFromFamily === "function") {
      global.DesignFamilies.syncPageFromFamily(merged.page);
    } else if (!merged.page.designFamily) {
      merged.page.designFamily = "salon";
    }
    if (!global.SectionRegistry) return merged;
    global.SectionRegistry.SECTION_IDS.forEach((id) => {
      if (!merged.sections[id]) merged.sections[id] = base.sections[id];
    });
    const validIntent = new Set(["pricing", "faq", "packages", "process", "testimonials", "services"]);
    if (merged.sections.services) {
      delete merged.sections.services.contentBlockIntent;
      const crds = merged.sections.services.cards;
      if (Array.isArray(crds)) {
        crds.forEach((c) => {
          if (!c.intent || !validIntent.has(c.intent)) c.intent = "services";
          if (typeof c.ctaText !== "string") c.ctaText = "";
          if (typeof c.ctaHref !== "string") c.ctaHref = "";
          const icon = String(c.icon || "").trim();
          if (icon) c.icon = "";
        });
      }
      const pl = merged.sections.services.pricelist;
      if (pl && typeof pl === "object") {
        const rows = Array.isArray(pl.rows) ? pl.rows : [];
        merged.sections.services.pricelist = {
          rows: rows.slice(0, 30).map((r) => ({
            name: String(r?.name != null ? r.name : "").trim(),
            price: String(r?.price != null ? r.price : "").trim(),
          })),
        };
      } else if (pl != null) {
        delete merged.sections.services.pricelist;
      }
    }
    if (merged.sections?.footer?.content && merged.page) {
      const split = splitBrandAndLocation(
        merged.sections.footer.content["footer-brand"],
        merged.page.location
      );
      merged.sections.footer.content["footer-brand"] = split.brand;
      if (split.location) merged.page.location = split.location;
      else if (merged.page.location == null) merged.page.location = "";
      if (merged.page.logoUrl && !isRealLogoUrl(merged.page.logoUrl)) merged.page.logoUrl = "";
      if (merged.page.material && merged.page.material.logoUrl && !isRealLogoUrl(merged.page.material.logoUrl)) {
        merged.page.material.logoUrl = "";
      }
      const hasLogo =
        isRealLogoUrl(merged.page.logoUrl) ||
        (merged.page.material && isRealLogoUrl(merged.page.material.logoUrl));
      if (!hasLogo && merged.page.industry) {
        if (!merged.page.textLogoStyle) {
          merged.page.textLogoStyle = resolveTextLogoStyle(merged.page.industry);
        }
        if (merged.page.textLogoSubline == null || merged.page.textLogoSubline === "") {
          const tag = resolveTextLogoTagline(merged.page.industry);
          merged.page.textLogoSubline = tag || split.location || "";
          if (tag) merged.page.textLogoTagline = tag;
        }
      }
    }
    return merged;
  }

  /**
   * För framtida POST /api/sites/:id/publish — samma payload som autosave.
   */
  function toExportPayload(doc) {
    return JSON.parse(JSON.stringify(doc));
  }

  /** Anropas vid sparning — sätter updatedAt (ISO). */
  function touchMeta(doc) {
    if (!doc.meta) doc.meta = {};
    doc.meta.updatedAt = new Date().toISOString();
  }

  /** För framtida POST /api/sites/:id/publish — öka revision + tidsstämpel. */
  function bumpPublishedMeta(doc) {
    if (!doc.meta) doc.meta = {};
    doc.meta.publishedRevision = (doc.meta.publishedRevision || 0) + 1;
    doc.meta.publishedAt = new Date().toISOString();
    doc.documentVersion = (doc.documentVersion || 0) + 1;
  }

  global.AppDocument = {
    SCHEMA_VERSION,
    createDefaultDocument,
    createEmptyCreateDocument,
    validate,
    normalize,
    deepMerge,
    splitBrandAndLocation,
    isRealLogoUrl,
    resolveTextLogoStyle,
    resolveTextLogoTagline,
    ensureTextLogo,
    toExportPayload,
    touchMeta,
    bumpPublishedMeta,
  };
})(typeof window !== "undefined" ? window : globalThis);
