/**
 * Material — lagring och koppling till SiteState / preview.
 */
(function (global) {
  "use strict";

  const MAX_GALLERY_IMAGES = 4;

  function emptyMaterial() {
    return {
      logoUrl: "",
      logoAlign: "center",
      heroImageUrl: "",
      aboutImageUrl: "",
      serviceImages: ["", "", ""],
      serviceTitles: ["", "", ""],
      serviceBodies: ["", "", ""],
      serviceDetails: ["", "", ""],
      galleryImages: ["", "", "", ""],
      bookingUrl: "",
      existingText: "",
      websiteUrl: "",
      socialFacebook: "",
      socialInstagram: "",
      socialLinkedIn: "",
    };
  }

  function linesFromTextarea(value) {
    return String(value || "")
      .split(/\r?\n/)
      .map(function (s) {
        return s.trim();
      })
      .filter(Boolean);
  }

  function limitGalleryImages(urls) {
    return (urls || []).slice(0, MAX_GALLERY_IMAGES);
  }

  function gallerySlotsFromList(urls) {
    const slots = ["", "", "", ""];
    limitGalleryImages(
      (urls || []).map(function (u) {
        return String(u || "").trim();
      }).filter(Boolean)
    ).forEach(function (url, i) {
      slots[i] = url;
    });
    return slots;
  }

  function galleryUrlsFromSlots(slots) {
    return (slots || []).map(function (u) {
      return String(u || "").trim();
    }).filter(Boolean);
  }

  function parsePricelistLine(line) {
    const m = String(line || "").match(/^(.+?)\s+(\d[\d\s]*)\s*kr?\s*$/i);
    if (m) {
      return { title: m[1].trim(), body: m[2].replace(/\s/g, " ") + " kr" };
    }
    return { title: String(line || "").trim(), body: "" };
  }

  function migratePricelistToServiceCards(m, text) {
    linesFromTextarea(text)
      .slice(0, 3)
      .forEach(function (line, i) {
        if (m.serviceTitles[i] || m.serviceBodies[i]) return;
        const parsed = parsePricelistLine(line);
        m.serviceTitles[i] = parsed.title;
        m.serviceBodies[i] = parsed.body;
      });
  }

  function migrateLongBodyToDetail(m) {
    for (let i = 0; i < 3; i++) {
      if (m.serviceDetails[i]) continue;
      const body = String(m.serviceBodies[i] || "");
      if (body.indexOf("\n") >= 0) {
        m.serviceDetails[i] = body;
        m.serviceBodies[i] = body.split(/\r?\n/).map(function (s) {
          return s.trim();
        }).filter(Boolean)[0] || "";
      }
    }
  }

  function serviceCardsFromDocument(doc) {
    const cards = doc && doc.sections && doc.sections.services && doc.sections.services.cards;
    return Array.isArray(cards) ? cards : [];
  }

  function slot(value) {
    return String(value || "").trim();
  }

  function normalizeMaterialUrl(raw) {
    let u = String(raw || "").trim();
    if (!u) return "";
    const lower = u.toLowerCase();
    if (lower.startsWith("javascript:") || lower.startsWith("data:") || lower.startsWith("blob:")) return u;
    if (/^https?:\/\//i.test(u)) return u;
    if (/^www\./i.test(u)) return "https://" + u;
    if (/^[a-z0-9.-]+\.[a-z]{2,}/i.test(u)) return "https://" + u.replace(/^\/+/, "");
    return "";
  }

  const MATERIAL_URL_FIELDS = [
    "logoUrl",
    "heroImageUrl",
    "aboutImageUrl",
    "serviceImage1",
    "serviceImage2",
    "serviceImage3",
    "galleryImage1",
    "galleryImage2",
    "galleryImage3",
    "galleryImage4",
    "bookingUrl",
    "websiteUrl",
    "socialFacebook",
    "socialInstagram",
    "socialLinkedIn",
  ];

  function clearMaterialUrlInputs(form) {
    if (!form) return;
    MATERIAL_URL_FIELDS.forEach(function (name) {
      if (form.elements[name]) form.elements[name].value = "";
    });
  }

  const MATERIAL_URL_PLACEHOLDERS = {
    logoUrl: "din-domän.se/logo.png",
    heroImageUrl: "din-domän.se/hero.jpg",
    aboutImageUrl: "din-domän.se/om-oss.jpg",
    serviceImage1: "din-domän.se/bild.jpg",
    serviceImage2: "din-domän.se/bild.jpg",
    serviceImage3: "din-domän.se/bild.jpg",
    galleryImage1: "din-domän.se/bild.jpg",
    galleryImage2: "din-domän.se/bild.jpg",
    galleryImage3: "din-domän.se/bild.jpg",
    galleryImage4: "din-domän.se/bild.jpg",
    bookingUrl: "bokadirekt.se/…",
    websiteUrl: "din-domän.se",
    socialFacebook: "facebook.com/dittföretag",
    socialInstagram: "instagram.com/dittkonto",
    socialLinkedIn: "linkedin.com/company/dittföretag",
  };

  function urlForMaterialInput(url) {
    const u = String(url || "").trim();
    if (!u) return "";
    if (/^(data:|blob:)/i.test(u)) return u;
    return u.replace(/^https?:\/\//i, "");
  }

  function fillMaterialUrlHints(form, material) {
    if (!form) return;
    const doc = global.SiteState && global.SiteState.get && global.SiteState.get();
    const m = mergeDocumentIntoMaterial(normalizeMaterial(material), doc);
    const cards = serviceCardsFromDocument(doc);
    const gallery = doc && doc.sections && doc.sections.gallery && doc.sections.gallery.images;
    const footer = doc && doc.sections && doc.sections.footer && doc.sections.footer.content;
    const sources = {
      logoUrl: m.logoUrl || (doc && doc.page && doc.page.logoUrl),
      heroImageUrl: m.heroImageUrl || (doc && doc.page && doc.page.heroBgUrl),
      aboutImageUrl: m.aboutImageUrl || (doc && doc.sections && doc.sections.about && doc.sections.about.imageUrl),
      serviceImage1: m.serviceImages[0] || (cards[0] && cards[0].img),
      serviceImage2: m.serviceImages[1] || (cards[1] && cards[1].img),
      serviceImage3: m.serviceImages[2] || (cards[2] && cards[2].img),
      galleryImage1: m.galleryImages[0] || (gallery && gallery[0]),
      galleryImage2: m.galleryImages[1] || (gallery && gallery[1]),
      galleryImage3: m.galleryImages[2] || (gallery && gallery[2]),
      galleryImage4: m.galleryImages[3] || (gallery && gallery[3]),
      bookingUrl: m.bookingUrl || (doc && doc.page && doc.page.bookingUrl),
      websiteUrl: m.websiteUrl,
      socialFacebook: m.socialFacebook || (footer && footer["footer-social-1-href"]),
      socialInstagram: m.socialInstagram || (footer && footer["footer-social-2-href"]),
      socialLinkedIn: m.socialLinkedIn || (footer && footer["footer-social-3-href"]),
    };
    MATERIAL_URL_FIELDS.forEach(function (name) {
      const el = form.elements[name];
      if (!el) return;
      if (document.activeElement === el) return;
      const draft = String(el.value || "").trim();
      if (draft && !normalizeMaterialUrl(draft)) return;
      const display = urlForMaterialInput(sources[name]);
      el.value = display;
      el.placeholder = MATERIAL_URL_PLACEHOLDERS[name] || "…";
    });
  }

  /** Behåll bilder/text från sidan om Material-fältet är tomt (t.ex. efter prislista). */
  function mergeDocumentIntoMaterial(material, doc) {
    const m = normalizeMaterial(material);
    if (!doc) return m;
    if (!slot(m.heroImageUrl) && doc.page && doc.page.heroBgUrl) {
      m.heroImageUrl = slot(doc.page.heroBgUrl);
    }
    if (!slot(m.aboutImageUrl) && doc.sections && doc.sections.about && doc.sections.about.imageUrl) {
      m.aboutImageUrl = slot(doc.sections.about.imageUrl);
    }
    const cards = serviceCardsFromDocument(doc);
    for (let i = 0; i < 3; i++) {
      const card = cards[i] || {};
      if (!slot(m.serviceImages[i]) && card.img) m.serviceImages[i] = slot(card.img);
      if (!slot(m.serviceTitles[i]) && card.title) m.serviceTitles[i] = slot(card.title);
      if (!slot(m.serviceBodies[i]) && card.body) m.serviceBodies[i] = slot(card.body);
      if (!slot(m.serviceDetails[i]) && card.detail) m.serviceDetails[i] = slot(card.detail);
    }
    const gallery = doc.sections && doc.sections.gallery && doc.sections.gallery.images;
    if (Array.isArray(gallery)) {
      for (let i = 0; i < MAX_GALLERY_IMAGES; i++) {
        if (!slot(m.galleryImages[i]) && gallery[i]) m.galleryImages[i] = slot(gallery[i]);
      }
    }
    const footer = doc.sections && doc.sections.footer && doc.sections.footer.content;
    if (footer) {
      if (!slot(m.socialFacebook) && footer["footer-social-1-href"]) {
        m.socialFacebook = slot(footer["footer-social-1-href"]);
      }
      if (!slot(m.socialInstagram) && footer["footer-social-2-href"]) {
        m.socialInstagram = slot(footer["footer-social-2-href"]);
      }
      if (!slot(m.socialLinkedIn) && footer["footer-social-3-href"]) {
        m.socialLinkedIn = slot(footer["footer-social-3-href"]);
      }
    }
    return m;
  }

  function normalizeLogoAlign(value) {
    const align = String(value || "center").trim().toLowerCase();
    return align === "left" || align === "right" ? align : "center";
  }

  function normalizeMaterial(raw) {
    const m = emptyMaterial();
    if (!raw || typeof raw !== "object") return m;
    m.logoUrl = String(raw.logoUrl || "").trim();
    m.logoAlign = normalizeLogoAlign(raw.logoAlign);
    m.heroImageUrl = String(raw.heroImageUrl || raw.heroUrl || "").trim();
    m.aboutImageUrl = String(raw.aboutImageUrl || "").trim();
    m.bookingUrl = String(raw.bookingUrl || "").trim();
    m.existingText = String(raw.existingText || "").trim();
    m.websiteUrl = String(raw.websiteUrl || "").trim();
    m.socialFacebook = String(raw.socialFacebook || "").trim();
    m.socialInstagram = String(raw.socialInstagram || "").trim();
    m.socialLinkedIn = String(raw.socialLinkedIn || "").trim();
    if (Array.isArray(raw.serviceImages)) {
      raw.serviceImages.forEach(function (url, i) {
        if (i < 3) m.serviceImages[i] = String(url || "").trim();
      });
    }
    if (Array.isArray(raw.serviceTitles)) {
      raw.serviceTitles.forEach(function (title, i) {
        if (i < 3) m.serviceTitles[i] = String(title || "").trim();
      });
    }
    if (Array.isArray(raw.serviceBodies)) {
      raw.serviceBodies.forEach(function (body, i) {
        if (i < 3) m.serviceBodies[i] = String(body || "").trim();
      });
    }
    if (Array.isArray(raw.serviceDetails)) {
      raw.serviceDetails.forEach(function (detail, i) {
        if (i < 3) m.serviceDetails[i] = String(detail || "").trim();
      });
    }
    const legacyPricelist = String(raw.pricelistText || raw.menuText || "").trim();
    if (legacyPricelist) migratePricelistToServiceCards(m, legacyPricelist);
    migrateLongBodyToDetail(m);
    if (Array.isArray(raw.galleryImages)) {
      m.galleryImages = gallerySlotsFromList(raw.galleryImages);
    } else if (Array.isArray(raw.imageUrls)) {
      m.galleryImages = gallerySlotsFromList(raw.imageUrls);
    }
    return m;
  }

  function getMaterial() {
    const SS = global.SiteState;
    if (!SS || !SS.get) return emptyMaterial();
    const d = SS.get();
    const raw = Object.assign({}, (d && d.page && d.page.material) || {});
    if (d && d.page && d.page.logoAlign) raw.logoAlign = d.page.logoAlign;
    return normalizeMaterial(raw);
  }

  function connectBookingToCta(doc, url) {
    const norm = String(url || "").trim();
    if (!norm || !doc.sections) return;
    if (doc.page && doc.page.compositionLocked) return;
    if (doc.sections.booking) doc.sections.booking.hidden = false;
    if (doc.sections.hero && doc.sections.hero.content) {
      doc.sections.hero.content["hero-cta-1-href"] = norm;
      if (!doc.sections.hero.content["hero-cta-1-text"] || doc.sections.hero.content["hero-cta-1-text"] === "Kontakta oss") {
        doc.sections.hero.content["hero-cta-1-text"] = "Boka tid";
      }
    }
  }

  function applyServiceCardsToDocument(doc, material) {
    const m = normalizeMaterial(material);
    if (!doc.sections || !doc.sections.services) return;
    const locked = !!(doc.page && doc.page.compositionLocked);
    const sec = doc.sections.services;
    if (!sec.cards) sec.cards = [];
    if (!sec.content) sec.content = {};
    let any = false;
    let hasPricing = false;

    for (let i = 0; i < 3; i++) {
      const existing = sec.cards[i] || {};
      const matImg = slot(m.serviceImages[i]);
      const matTitle = slot(m.serviceTitles[i]);
      const matBody = slot(m.serviceBodies[i]);
      const matDetail = slot(m.serviceDetails[i]);
      if (!matImg && !matTitle && !matBody && !matDetail) continue;
      any = true;
      if (!sec.cards[i]) {
        sec.cards[i] = { icon: "", title: "", body: "", detail: "", img: "", intent: "services", ctaText: "", ctaHref: "" };
      }
      const card = sec.cards[i];
      if (matImg) card.img = matImg;
      else if (existing.img) card.img = existing.img;
      if (matTitle) card.title = matTitle;
      else if (existing.title) card.title = existing.title;
      if (matBody) card.body = matBody;
      else if (existing.body) card.body = existing.body;
      if (matDetail) card.detail = matDetail;
      else if (existing.detail) card.detail = existing.detail;
      const pricingSource = card.detail || card.body;
      if (!locked && pricingSource && /\d+\s*kr/i.test(pricingSource)) {
        card.intent = "pricing";
        hasPricing = true;
      } else if (!locked && (card.title || card.body || card.detail)) {
        card.intent = card.intent || existing.intent || "services";
      }
    }

    if (any && !locked) {
      sec.hidden = false;
      if (hasPricing && (!sec.content["services-title"] || sec.content["services-title"] === "Utvalt")) {
        sec.content["services-title"] = "Priser";
      }
    }
  }

  function applyPricelistToServices(doc, text) {
    const lines = linesFromTextarea(text).slice(0, 3);
    if (!lines.length || !doc.sections || !doc.sections.services) return;
    const sec = doc.sections.services;
    if (!sec.cards) sec.cards = [];
    if (!sec.content) sec.content = {};
    if (!sec.content["services-title"] || sec.content["services-title"] === "Utvalt") {
      sec.content["services-title"] = "Priser";
    }
    sec.content["services-lead"] = sec.content["services-lead"] || "Våra vanligaste behandlingar.";
    lines.forEach(function (line, i) {
      if (!sec.cards[i]) {
        sec.cards[i] = { icon: "", title: "", body: "", img: "", intent: "pricing", ctaText: "", ctaHref: "" };
      }
      const m = line.match(/^(.+?)\s+(\d[\d\s]*)\s*kr?\s*$/i);
      sec.cards[i].intent = "pricing";
      if (m) {
        sec.cards[i].title = m[1].trim();
        sec.cards[i].body = m[2].replace(/\s/g, " ") + " kr";
      } else {
        sec.cards[i].title = line;
        sec.cards[i].body = sec.cards[i].body || "";
      }
    });
    sec.hidden = false;
  }

  function applySocialLinksToFooter(doc, material) {
    if (!doc.sections || !doc.sections.footer) return;
    const sec = doc.sections.footer;
    if (!sec.content) sec.content = {};
    const pairs = [
      { hrefKey: "footer-social-1-href", value: material.socialFacebook },
      { hrefKey: "footer-social-2-href", value: material.socialInstagram },
      { hrefKey: "footer-social-3-href", value: material.socialLinkedIn },
    ];
    pairs.forEach(function (pair) {
      const norm = normalizeMaterialUrl(pair.value);
      sec.content[pair.hrefKey] = norm || "";
    });
  }

  function isStockHeroUrl(url) {
    const s = String(url || "").trim();
    if (!s) return false;
    return /images\.unsplash\.com|picsum\.photos|fastly\.picsum\.photos/i.test(s);
  }

  function applyMaterialToDocument(doc, material) {
    const m = normalizeMaterial(material);
    if (!doc.page) doc.page = {};
    const locked = !!doc.page.compositionLocked;
    const imagesLocked = !!doc.page.cdImagesLocked;
    doc.page.material = Object.assign({}, m);

    if (m.logoUrl && (!global.AppDocument || !global.AppDocument.isRealLogoUrl || global.AppDocument.isRealLogoUrl(m.logoUrl))) {
      doc.page.logoUrl = m.logoUrl;
      doc.page.textLogoAuto = false;
    } else if (!locked) {
      doc.page.logoUrl = "";
      if (global.AppDocument && typeof global.AppDocument.ensureTextLogo === "function") {
        global.AppDocument.ensureTextLogo(doc);
      }
    }
    if (!locked) {
      doc.page.logoAlign = m.logoAlign;
    }
    if (m.heroImageUrl && !imagesLocked) {
      const current = String(doc.page.heroBgUrl || "").trim();
      const incoming = String(m.heroImageUrl || "").trim();
      const staleStock =
        current &&
        incoming !== current &&
        isStockHeroUrl(incoming) &&
        isStockHeroUrl(current);
      if (!staleStock) doc.page.heroBgUrl = incoming;
    }
    if (m.aboutImageUrl && doc.sections && doc.sections.about && !imagesLocked) {
      doc.sections.about.imageUrl = m.aboutImageUrl;
      if (!locked) doc.sections.about.hidden = false;
    }
    if (doc.sections && doc.sections.services && !imagesLocked) {
      applyServiceCardsToDocument(doc, m);
    }
    const galleryUrls = galleryUrlsFromSlots(m.galleryImages);
    if (galleryUrls.length && doc.sections && doc.sections.gallery && !imagesLocked) {
      doc.sections.gallery.images = galleryUrls;
      if (!locked) doc.sections.gallery.hidden = false;
    }
    if (m.bookingUrl) {
      const norm = normalizeMaterialUrl(m.bookingUrl);
      if (norm) {
        doc.page.bookingUrl = norm;
        if (!locked) connectBookingToCta(doc, norm);
      }
    }
    applySocialLinksToFooter(doc, m);
    return m;
  }

  function readMaterialFromForm(form) {
    const m = emptyMaterial();
    if (!form) return m;
    m.logoUrl = normalizeMaterialUrl(form.elements.logoUrl && form.elements.logoUrl.value);
    const alignEl = form.querySelector('input[name="logoAlign"]:checked');
    m.logoAlign = normalizeLogoAlign(alignEl && alignEl.value);
    m.heroImageUrl = normalizeMaterialUrl(form.elements.heroImageUrl && form.elements.heroImageUrl.value);
    m.aboutImageUrl = normalizeMaterialUrl(form.elements.aboutImageUrl && form.elements.aboutImageUrl.value);
    m.serviceImages = [
      normalizeMaterialUrl(form.elements.serviceImage1 && form.elements.serviceImage1.value),
      normalizeMaterialUrl(form.elements.serviceImage2 && form.elements.serviceImage2.value),
      normalizeMaterialUrl(form.elements.serviceImage3 && form.elements.serviceImage3.value),
    ];
    m.serviceTitles = [
      String(form.elements.serviceTitle1 && form.elements.serviceTitle1.value || "").trim(),
      String(form.elements.serviceTitle2 && form.elements.serviceTitle2.value || "").trim(),
      String(form.elements.serviceTitle3 && form.elements.serviceTitle3.value || "").trim(),
    ];
    m.serviceBodies = [
      String(form.elements.serviceBody1 && form.elements.serviceBody1.value || "").trim(),
      String(form.elements.serviceBody2 && form.elements.serviceBody2.value || "").trim(),
      String(form.elements.serviceBody3 && form.elements.serviceBody3.value || "").trim(),
    ];
    m.serviceDetails = [
      String(form.elements.serviceDetail1 && form.elements.serviceDetail1.value || "").trim(),
      String(form.elements.serviceDetail2 && form.elements.serviceDetail2.value || "").trim(),
      String(form.elements.serviceDetail3 && form.elements.serviceDetail3.value || "").trim(),
    ];
    m.galleryImages = [
      normalizeMaterialUrl(form.elements.galleryImage1 && form.elements.galleryImage1.value),
      normalizeMaterialUrl(form.elements.galleryImage2 && form.elements.galleryImage2.value),
      normalizeMaterialUrl(form.elements.galleryImage3 && form.elements.galleryImage3.value),
      normalizeMaterialUrl(form.elements.galleryImage4 && form.elements.galleryImage4.value),
    ];
    m.bookingUrl = normalizeMaterialUrl(form.elements.bookingUrl && form.elements.bookingUrl.value);
    m.existingText = String(form.elements.existingText && form.elements.existingText.value || "").trim();
    m.websiteUrl = normalizeMaterialUrl(form.elements.websiteUrl && form.elements.websiteUrl.value);
    m.socialFacebook = normalizeMaterialUrl(form.elements.socialFacebook && form.elements.socialFacebook.value);
    m.socialInstagram = normalizeMaterialUrl(form.elements.socialInstagram && form.elements.socialInstagram.value);
    m.socialLinkedIn = normalizeMaterialUrl(form.elements.socialLinkedIn && form.elements.socialLinkedIn.value);
    return m;
  }

  function pickServiceBodyDetail(mBody, mDetail, card) {
    let body = mBody || (card && card.body) || "";
    let detail = mDetail || (card && card.detail) || "";
    if (!detail && body.indexOf("\n") >= 0) {
      detail = body;
      body =
        body
          .split(/\r?\n/)
          .map(function (s) {
            return s.trim();
          })
          .filter(Boolean)[0] || "";
    }
    return { body: body, detail: detail };
  }

  function fillMaterialForm(form, material) {
    if (!form) return;
    const m = normalizeMaterial(material);
    const cards = serviceCardsFromDocument(global.SiteState && global.SiteState.get && global.SiteState.get());
    form.querySelectorAll('input[name="logoAlign"]').forEach(function (radio) {
      radio.checked = radio.value === m.logoAlign;
    });
    if (form.elements.serviceTitle1) {
      form.elements.serviceTitle1.value = m.serviceTitles[0] || (cards[0] && cards[0].title) || "";
    }
    if (form.elements.serviceTitle2) {
      form.elements.serviceTitle2.value = m.serviceTitles[1] || (cards[1] && cards[1].title) || "";
    }
    if (form.elements.serviceTitle3) {
      form.elements.serviceTitle3.value = m.serviceTitles[2] || (cards[2] && cards[2].title) || "";
    }
    if (form.elements.serviceBody1) {
      const picked1 = pickServiceBodyDetail(m.serviceBodies[0], m.serviceDetails[0], cards[0]);
      form.elements.serviceBody1.value = picked1.body;
      if (form.elements.serviceDetail1) form.elements.serviceDetail1.value = picked1.detail;
    }
    if (form.elements.serviceBody2) {
      const picked2 = pickServiceBodyDetail(m.serviceBodies[1], m.serviceDetails[1], cards[1]);
      form.elements.serviceBody2.value = picked2.body;
      if (form.elements.serviceDetail2) form.elements.serviceDetail2.value = picked2.detail;
    }
    if (form.elements.serviceBody3) {
      const picked3 = pickServiceBodyDetail(m.serviceBodies[2], m.serviceDetails[2], cards[2]);
      form.elements.serviceBody3.value = picked3.body;
      if (form.elements.serviceDetail3) form.elements.serviceDetail3.value = picked3.detail;
    }
    if (form.elements.existingText) form.elements.existingText.value = m.existingText;
    fillMaterialUrlHints(form, m);
  }

  function heroDbg() {
    return global.HeroImageDebug || null;
  }

  function applyAndRemount(material) {
    const SS = global.SiteState;
    const EE = global.EditorEngine;
    const dbg = heroDbg();
    if (!SS || !SS.patch) {
      dbg && dbg.log("STATE_SKIP", "SiteState.patch saknas");
      return;
    }
    SS.patch(function (doc) {
      applyMaterialToDocument(doc, material);
    });
    SS.save();
    dbg &&
      dbg.log("STATE_PATCHED", {
        heroBgUrl: SS.get && SS.get()?.page?.heroBgUrl,
        heroImageUrl: material && material.heroImageUrl,
      });
    if (EE && EE.remount) {
      EE.remount();
      dbg && dbg.log("PREVIEW_REMOUNT", "remount() schemalagd");
    }
  }

  /** Hero only — does not touch logo, about, gallery, services, colors. */
  function patchHeroImageInDocument(doc, url) {
    if (!doc.page) doc.page = {};
    const stored = storeHeroUrl(url);
    if (!stored) return false;
    doc.page.heroBgUrl = stored;
    if (!doc.page.material) doc.page.material = {};
    doc.page.material.heroImageUrl = stored;
    return stored;
  }

  function patchAboutImageInDocument(doc, url) {
    if (!url || !doc) return false;
    if (!doc.page) doc.page = {};
    if (!doc.page.material) doc.page.material = {};
    doc.page.material.aboutImageUrl = url;
    if (doc.sections && doc.sections.about) {
      doc.sections.about.imageUrl = url;
      doc.sections.about.hidden = false;
    }
    return true;
  }

  function patchGalleryImagesInDocument(doc, urls) {
    const list = (urls || []).slice(0, MAX_GALLERY_IMAGES).filter(Boolean);
    if (!list.length || !doc) return false;
    if (!doc.page) doc.page = {};
    if (!doc.page.material) doc.page.material = {};
    doc.page.material.galleryImages = gallerySlotsFromList(list);
    if (doc.sections && doc.sections.gallery) {
      doc.sections.gallery.images = list;
      doc.sections.gallery.hidden = false;
    }
    return true;
  }

  function patchServiceImagesInDocument(doc, urls) {
    const list = (urls || []).slice(0, 3).filter(Boolean);
    if (!list.length || !doc || !doc.sections || !doc.sections.services) return false;
    if (!doc.page) doc.page = {};
    if (!doc.page.material) doc.page.material = {};
    doc.page.material.serviceImages = list.slice(0, 3);
    while (doc.page.material.serviceImages.length < 3) doc.page.material.serviceImages.push("");
    applyServiceCardsToDocument(doc, doc.page.material);
    return true;
  }

  function saveAndRefreshPreview(refreshMode) {
    const SS = global.SiteState;
    const EE = global.EditorEngine;
    if (SS && SS.save) SS.save();
    if (refreshMode === "hero") {
      syncHeroPreview(
        SS && SS.get && SS.get()?.page?.heroBgUrl,
      );
      if (EE && typeof EE.syncHeroFromState === "function") EE.syncHeroFromState();
      else if (EE && EE.remount) EE.remount();
      return;
    }
    if (EE && typeof EE.remountAsync === "function") EE.remountAsync();
    else if (EE && EE.remount) EE.remount();
  }

  function syncHeroPreview(url) {
    const EE = global.EditorEngine;
    if (EE && typeof EE.syncHeroFromState === "function") {
      EE.syncHeroFromState();
      return;
    }
    const bg = document.getElementById("heroBg");
    if (bg && url) {
      const safe = String(url).replace(/'/g, "\\'");
      bg.style.setProperty("--hero-bg-image", `url('${safe}')`);
    }
  }

  function saveFromForm(form) {
    let material = readMaterialFromForm(form);
    const SS = global.SiteState;
    if (SS && typeof SS.get === "function") {
      material = mergeDocumentIntoMaterial(material, SS.get());
    }
    applyAndRemount(material);
    fillMaterialForm(form, material);
    return material;
  }

  function readFileAsDataUrl(file, cb) {
    const reader = new FileReader();
    reader.onload = function () {
      cb(typeof reader.result === "string" ? reader.result : "");
    };
    reader.onerror = function () {
      cb("");
    };
    reader.readAsDataURL(file);
  }

  function bindFileInputs(root) {
    if (!root) return;
    root.querySelectorAll("[data-material-file-for]").forEach(function (input) {
      if (input.dataset.materialFileBound === "1") return;
      input.dataset.materialFileBound = "1";
      input.addEventListener("change", function (e) {
        const file = e.target.files && e.target.files[0];
        if (!file || !file.type.startsWith("image/")) return;
        const targetName = input.getAttribute("data-material-file-for");
        const form = input.closest("form");
        const urlInput = form && form.elements[targetName];
        readFileAsDataUrl(file, function (dataUrl) {
          if (urlInput && dataUrl) {
            urlInput.value = dataUrl;
            urlInput.dispatchEvent(new Event("input", { bubbles: true }));
          }
        });
        e.target.value = "";
      });
    });
  }

  function extractUrlFromText(text) {
    const m = String(text || "").match(/https?:\/\/[^\s<>"']+/i);
    return m ? m[0] : null;
  }

  function normHeroUrl(u) {
    return String(u || "")
      .trim()
      .split("?")[0]
      .replace(/\/+$/, "");
  }

  function verifyHeroImageApplied(expectedUrl) {
    const SS = global.SiteState;
    if (!SS || !SS.get || !expectedUrl) return false;
    const doc = SS.get();
    const saved = doc && doc.page && doc.page.heroBgUrl;
    if (!saved) return false;
    const expected = storeHeroUrl(expectedUrl);
    const savedCanon = storeHeroUrl(saved);
    const norm = normHeroUrl;
    return norm(savedCanon) === norm(expected);
  }

  function verifyHeroImageAppliedLoose(expectedUrl) {
    const SS = global.SiteState;
    if (!SS || !SS.get || !expectedUrl) return false;
    const saved = SS.get()?.page?.heroBgUrl;
    if (!saved) return false;
    const expected = storeHeroUrl(expectedUrl);
    const savedCanon = storeHeroUrl(saved);
    if (expected === savedCanon) return true;
    return normHeroUrl(expected) === normHeroUrl(savedCanon);
  }

  function resolveHeroUrl(url) {
    if (global.HeroImageUrl && typeof global.HeroImageUrl.resolve === "function") {
      return global.HeroImageUrl.resolve(url);
    }
    return url;
  }

  function storeHeroUrl(url) {
    if (global.HeroImageUrl && typeof global.HeroImageUrl.canonical === "function") {
      return global.HeroImageUrl.canonical(url) || url;
    }
    return url;
  }

  function applyHeroImage(url) {
    const dbg = heroDbg();
    if (!url) {
      dbg && dbg.log("IMAGE_MISSING", "Ingen URL att applicera");
      return false;
    }
    const stored = storeHeroUrl(url);
    if (!stored) {
      dbg && dbg.log("IMAGE_MISSING", "Ogiltig eller korrupt URL");
      return false;
    }
    dbg && dbg.log("IMAGE_FOUND", stored);
    const SS = global.SiteState;
    if (!SS || !SS.patch) return false;
    SS.patch(function (doc) {
      patchHeroImageInDocument(doc, stored);
    });
    const m = getMaterial();
    m.heroImageUrl = stored;
    const form = document.getElementById("studioMaterialForm");
    if (form && form.elements.heroImageUrl) form.elements.heroImageUrl.value = stored;
    saveAndRefreshPreview("hero");
    const strict = verifyHeroImageApplied(stored);
    const loose = verifyHeroImageAppliedLoose(stored);
    const stateUrl = SS.get && SS.get()?.page?.heroBgUrl;
    dbg &&
      dbg.log("STATE_VERIFY", {
        strict: strict,
        loose: loose,
        heroBgUrl: stateUrl,
      });
    return loose || strict;
  }

  function parseImageTheme(text) {
    const IC = global.ImageCatalog;
    if (IC && typeof IC.parseThemeFromText === "function") {
      return IC.parseThemeFromText(text);
    }
    const VS = global.VisualStock;
    if (VS && typeof VS.parseThemeFromText === "function") {
      return VS.parseThemeFromText(text);
    }
    return null;
  }

  function suggestThemedStockImageUrl(kind, themeId, index) {
    const VS = global.VisualStock;
    if (!VS || typeof VS.pickThemeUrl !== "function" || !themeId) return "";
    const opts = { nonce: Date.now() + Math.random() + (Number(index) || 0) * 31 };
    if (kind === "card") opts.cardIndex = Number(index) || 0;
    if (kind === "gallery") opts.galleryIndex = Number(index) || 0;
    return VS.pickThemeUrl(kind, themeId, opts);
  }

  function suggestThemedStockImageUrls(kind, themeId, count) {
    const urls = [];
    const n = Math.max(1, Number(count) || 1);
    for (let i = 0; i < n; i++) {
      const url = suggestThemedStockImageUrl(kind, themeId, i);
      if (url) urls.push(url);
    }
    return urls;
  }

  function inferImageTarget(cmd) {
    const c = String(cmd || "").toLowerCase();
    if (/alla bilder|allt bild|hela sidan|överallt|overall|everywhere/.test(c)) return "all";
    if (/galleri|gallery/.test(c)) return "gallery";
    if (/tjänstekort|servicekort|tjanstekort|korten|tjänster|services/.test(c)) return "services";
    if (/om oss|about/.test(c)) return "about";
    if (/hero|första|forsta|topp|start|huvud|banner|ovan/.test(c)) return "hero";
    return "hero";
  }

  function wantsThemedImageRequest(cmd) {
    const c = String(cmd || "").toLowerCase();
    const theme = parseImageTheme(c);
    if (!theme) return false;
    const hasImageWord = /(bild|foto|bilder)/.test(c);
    const hasChangeIntent =
      /(byt|ändra|ny|annan|random|slump|kan du|kan ni|kan ju|vill ha|gör|sätt|lägg|ge mig|visa|ta|skaffa|hämta)/.test(c);
    if (hasImageWord && hasChangeIntent) return true;
    if (hasChangeIntent && /(med|på|av|som)\s/.test(c)) return true;
    if (/bild.*med|med.*bild|foto.*med|med.*foto/.test(c)) return true;
    return false;
  }

  function wantsRandomImageShuffle(cmd) {
    const c = String(cmd || "").toLowerCase();
    if (parseImageTheme(c)) return false;
    return (
      /(annan|ny|random|slump|nästa|next)/.test(c) &&
      /(bild|foto|bilder)/.test(c) &&
      /(byt|ändra|kan du|kan ni|vill ha|gör|sätt|ge|visa|ta)/.test(c)
    );
  }

  function applyThemedImages(text, themeRow, target) {
    const themeId = themeRow && themeRow.id;
    if (!themeId) return false;
    const nonce = Date.now() + Math.random();
    const m = getMaterial();
    let any = false;

    function applyHeroThemed() {
      const url = suggestThemedStockImageUrl("hero", themeId, 0);
      if (url && applyHeroImage(url)) any = true;
    }
    function applyAboutThemed() {
      const url = suggestThemedStockImageUrl("about", themeId, 0);
      if (url && applyAboutImage(url)) any = true;
    }
    function applyGalleryThemed() {
      const urls = suggestThemedStockImageUrls("gallery", themeId, MAX_GALLERY_IMAGES);
      if (urls.length && applyGalleryImages(urls)) any = true;
    }
    function applyServicesThemed() {
      const urls = suggestThemedStockImageUrls("card", themeId, 3);
      if (urls.length && applyServiceImages(urls)) any = true;
    }

    if (target === "all") {
      applyHeroThemed();
      m.aboutImageUrl = m.aboutImageUrl || "";
      applyAboutThemed();
      applyGalleryThemed();
      applyServicesThemed();
      return any;
    }
    if (target === "gallery") return applyGalleryImages(suggestThemedStockImageUrls("gallery", themeId, MAX_GALLERY_IMAGES));
    if (target === "services") return applyServiceImages(suggestThemedStockImageUrls("card", themeId, 3));
    if (target === "about") {
      const url = suggestThemedStockImageUrl("about", themeId, 0);
      return url ? applyAboutImage(url) : false;
    }
    return applyHeroImage(suggestThemedStockImageUrl("hero", themeId, 0));
  }

  function themedImageSuccessMessage(themeRow, target) {
    if (target === "all") return "Jag har bytt bilderna på sidan.\n\nVad tycker du?";
    if (target === "gallery") return "Jag har uppdaterat galleribilderna.\n\nVad tycker du?";
    if (target === "services") return "Jag har uppdaterat bilderna på tjänstekorten.\n\nSer det bra ut?";
    if (target === "about") return "Jag har uppdaterat bilden i Om oss.\n\nVad tycker du?";
    return "Hero-bilden är på plats.\n\nVad tycker du?";
  }

  function heroImageFailureMessage() {
    return "Den där satt inte riktigt.\n\nVill du att jag provar igen, eller byter du bild under Bilder & länkar → Hero-bild?";
  }

  function handleThemedImageChatCommand(text) {
    const cmd = String(text || "").toLowerCase();
    const theme = parseImageTheme(text);
    const url = extractUrlFromText(text);
    if (url) return null;

    if (theme && wantsThemedImageRequest(cmd)) {
      const target = inferImageTarget(cmd);
      if (applyThemedImages(text, theme, target)) {
        return { ok: true, message: themedImageSuccessMessage(theme, target) };
      }
      return { ok: false, message: heroImageFailureMessage() };
    }

    if (wantsRandomImageShuffle(cmd)) {
      const target = inferImageTarget(cmd);
      if (target === "gallery") {
        const stock = suggestStockImageUrls("gallery", MAX_GALLERY_IMAGES, { userText: text, variant: "another" });
        if (stock.length && applyGalleryImages(stock)) {
          return { ok: true, message: "Jag har lagt in nya galleribilder.\n\nVad tycker du?" };
        }
      } else if (target === "services") {
        const stock = suggestStockImageUrls("card", 3, { userText: text, variant: "another" });
        if (stock.length && applyServiceImages(stock)) {
          return { ok: true, message: "Jag har bytt bilderna på tjänstekorten.\n\nSer det bra ut?" };
        }
      } else if (target === "about") {
        const stock = suggestStockImageUrl("about", 0, { userText: text, variant: "another" });
        if (stock && applyAboutImage(stock)) {
          return { ok: true, message: "Jag har uppdaterat bilden i Om oss.\n\nVad tycker du?" };
        }
      } else if (applyHeroStockImage(text)) {
        return { ok: true, message: "Jag har uppdaterat hero-bilden.\n\nVad tycker du?" };
      }
      return { ok: false, message: "Det gick inte just nu — vill du att jag provar igen?" };
    }

    return null;
  }

  function pickStockImageCandidate(kind, opts) {
    opts = opts || {};
    const index = opts.index != null ? opts.index : 0;
    const ISE = global.ImageSelectionEngine;
    const SS = global.SiteState;
    const doc = SS && SS.get && SS.get();
    const userText = opts.userText || "";
    const nonce = opts.nonce != null ? opts.nonce : Date.now() + (Number(index) || 0) * 17;
    if (ISE && typeof ISE.pick === "function") {
      return ISE.pick(doc || { page: {} }, {
        section: kind,
        cardIndex: Number(index) || 0,
        galleryIndex: Number(index) || 0,
        userText: userText,
        nonce: nonce,
      });
    }
    const VS = global.VisualStock;
    const industry = (doc && doc.page && doc.page.industry) || "konsult";
    const template = (doc && doc.page && doc.page.template) || "editorial";
    if (VS && typeof VS.pickUrl === "function") {
      const pickOpts = { nonce: nonce, userText: userText };
      if (kind === "card") pickOpts.cardIndex = Number(index) || 0;
      if (kind === "gallery") pickOpts.galleryIndex = Number(index) || 0;
      const url = VS.pickUrl(kind, industry, template, pickOpts);
      if (url) return url;
    }
    const AI = global.AISiteBuilder;
    if (AI && typeof AI.suggestStockImageUrl === "function") {
      return AI.suggestStockImageUrl(kind);
    }
    return "";
  }

  function normalizeSuggestOpts(index, opts) {
    if (index != null && typeof index === "object") {
      return index;
    }
    return Object.assign({}, opts || {}, { index: index != null ? index : 0 });
  }

  function suggestStockImageUrl(kind, index, opts) {
    const pickOpts = normalizeSuggestOpts(index, opts);
    const IIE = global.ImageIntelligenceEngine;
    if (IIE && typeof IIE.selectBest === "function") {
      const url = IIE.selectBest(kind, pickOpts);
      if (url) return url;
    }
    return pickStockImageCandidate(kind, pickOpts);
  }

  function suggestStockImageUrls(kind, count, opts) {
    opts = opts || {};
    const IIE = global.ImageIntelligenceEngine;
    if (IIE && typeof IIE.selectMany === "function") {
      return IIE.selectMany(kind, count, opts);
    }
    const urls = [];
    const n = Math.max(1, Number(count) || 1);
    for (let i = 0; i < n; i++) {
      const u = suggestStockImageUrl(kind, i, opts);
      if (u) urls.push(u);
    }
    return urls;
  }

  function suggestHeroStockUrl(industryOverride, opts) {
    opts = opts || {};
    const SS = global.SiteState;
    const doc = SS && SS.get && SS.get();
    const industry = industryOverride || (doc && doc.page && doc.page.industry) || "";
    const industryText = industry === "byggfirma" ? "snickare verktyg trä" : "";
    const userText = opts.userText || industryText;
    const pickOpts = Object.assign({}, opts, { userText: userText, index: 0 });
    const current = doc && doc.page ? String(doc.page.heroBgUrl || "") : "";
    const IIE = global.ImageIntelligenceEngine;
    if (IIE && typeof IIE.selectBest === "function") {
      let url = IIE.selectBest("hero", pickOpts);
      if (url && current && normalizeUrlForCompare(url) === normalizeUrlForCompare(current) && pickOpts.variant) {
        url = IIE.selectBest("hero", Object.assign({}, pickOpts, { nonce: Date.now() + 7777, index: 1 }));
      }
      if (url) return url;
    }
    return pickStockImageCandidate("hero", pickOpts);
  }

  function normalizeUrlForCompare(url) {
    return String(url || "")
      .replace(/\?.*$/, "")
      .replace(/&w=\d+/g, "")
      .toLowerCase();
  }

  function parseHeroIndustryFromText(text) {
    const c = String(text || "").toLowerCase();
    if (
      /(snickare|sniockare|snick|hammare|hantverk|snickeri|bygg|verktyg|carpenter|hammer|woodwork)/.test(c)
    ) {
      return "byggfirma";
    }
    return null;
  }

  function applyHeroStockImage(text) {
    const raw = String(text || "");
    const industry = raw ? parseHeroIndustryFromText(raw) : null;
    const lower = raw.toLowerCase();
    const variant =
      /(igen|annan|annat alternativ|ett annat|another|en till|visa en till|försök|prova|pröva|retry|modernare|premium|exklusiv|mer )/.test(
        lower,
      )
        ? "another"
        : undefined;
    const url = suggestHeroStockUrl(industry, { userText: raw, variant: variant });
    if (!url) return false;
    return applyHeroImage(url);
  }

  function wantsHeroImageAction(cmd) {
    const c = String(cmd || "").toLowerCase();
    if (/herobild|hero-bild|hero bild|bakgrundsbild/.test(c)) return true;
    if (/första delen/.test(c) && /(bild|foto)/.test(c)) return true;
    if (
      /(lägg|sätt|byt|ändra|uppdatera|fixa|skapa|kan du|kan ni|gör|ge mig|spara|lägga in|sätta in|byta)/.test(c) &&
      /(bild|foto|bilder)/.test(c) &&
      /(hero|första|topp|start|huvud|banner|ovan|överst|snick|snickare|sniock|hantverk|bygg)/.test(c)
    ) {
      return true;
    }
    if (
      /(hero|första delen|bakgrund|toppbild|startbild)/.test(c) &&
      /(bild|foto)/.test(c) &&
      /(lägg|sätt|byt|ändra|uppdatera|fixa|kan du|kan ni|gör|ge|ny|en bild|en foto)/.test(c)
    ) {
      return true;
    }
    return false;
  }

  function handleHeroImageChatCommand(text) {
    const cmd = String(text || "").toLowerCase();
    if (!wantsHeroImageAction(cmd)) return null;
    const url = extractUrlFromText(text);
    if (url) {
      return applyHeroImage(url)
        ? { ok: true, message: "" }
        : { ok: false, message: heroImageFailureMessage() };
    }
    const theme = parseImageTheme(text);
    const industry = parseHeroIndustryFromText(text);
    if (theme && theme.id === "carpenter") {
      const themedUrl = suggestHeroStockUrl("byggfirma");
      if (themedUrl && applyHeroImage(themedUrl)) {
        return {
          ok: true,
          message: "",
        };
      }
    }
    if (industry === "byggfirma") {
      const themedUrl = suggestHeroStockUrl("byggfirma");
      if (themedUrl && applyHeroImage(themedUrl)) {
        return {
          ok: true,
          message: "",
        };
      }
    }
    if (theme) {
      const themedUrl = suggestThemedStockImageUrl("hero", theme.id, 0);
      if (themedUrl && applyHeroImage(themedUrl)) {
        return {
          ok: true,
          message: "",
        };
      }
    }
    if (applyHeroStockImage(text)) {
      if (industry === "byggfirma") {
        return {
          ok: true,
          message: "",
        };
      }
      return {
        ok: true,
        message:
          "",
      };
    }
    return { ok: false, message: "Kunde inte lägga in hero-bild just nu — försök igen." };
  }

  function applyAboutImage(url) {
    if (!url) return false;
    const SS = global.SiteState;
    if (!SS || !SS.patch) return false;
    SS.patch(function (doc) {
      patchAboutImageInDocument(doc, url);
    });
    const m = getMaterial();
    m.aboutImageUrl = url;
    const form = document.getElementById("studioMaterialForm");
    if (form && form.elements.aboutImageUrl) form.elements.aboutImageUrl.value = url;
    saveAndRefreshPreview("about");
    return true;
  }

  function applyGalleryImages(urls) {
    const list = (urls || []).slice(0, MAX_GALLERY_IMAGES).filter(Boolean);
    if (!list.length) return false;
    const SS = global.SiteState;
    if (!SS || !SS.patch) return false;
    SS.patch(function (doc) {
      patchGalleryImagesInDocument(doc, list);
    });
    const m = getMaterial();
    m.galleryImages = gallerySlotsFromList(list);
    const form = document.getElementById("studioMaterialForm");
    if (form) {
      for (let i = 0; i < MAX_GALLERY_IMAGES; i++) {
        const el = form.elements["galleryImage" + (i + 1)];
        if (el) el.value = m.galleryImages[i] || "";
      }
    }
    saveAndRefreshPreview("gallery");
    return true;
  }

  function wantsGalleryImageAction(cmd) {
    const c = String(cmd || "").toLowerCase();
    if (/galleribild|galleri bild|galleri-bild/.test(c)) return true;
    if (/galleri|gallery/.test(c) && /(bild|foto|bilder)/.test(c)) {
      return /(lägg|sätt|byt|uppdatera|fixa|kan du|kan ni|gör|ge|fyll|lägga in|sätta in|byta)/.test(c);
    }
    if (
      /(lägg|sätt|byt|fyll|kan du|kan ni|gör|ge).*(bild|foto|bilder).*(galleri|gallery)/.test(c) ||
      /(galleri|gallery).*(bild|foto|bilder)/.test(c)
    ) {
      return /(lägg|sätt|byt|fyll|kan du|kan ni|gör|ge|fyll i|uppdatera|fixa)/.test(c);
    }
    return false;
  }

  function wantsServiceCardImageAction(cmd) {
    const c = String(cmd || "").toLowerCase();
    if (/tjänstekort|servicekort|tjanstekort|service kort/.test(c) && /(bild|foto|bilder)/.test(c)) return true;
    if (/tre bilder|bilder på korten|bilder till korten|bilder i korten/.test(c)) return true;
    if (
      /(lägg|sätt|byt|fyll|kan du|kan ni|gör|ge|koppla|använd).*(bild|foto|bilder).*(kort|tjänst|tjanst|services)/.test(c)
    ) {
      return true;
    }
    if (
      /(kort|tjänst|tjanst|services).*(bild|foto|bilder)/.test(c) &&
      /(lägg|sätt|byt|fyll|kan du|kan ni|gör|ge|koppla|använd|uppdatera|fixa)/.test(c)
    ) {
      return true;
    }
    if (/^(tre bilder|tjänstekort|servicekort|korten)\b/.test(c)) return true;
    if (/tre bilder|tjänstekort|servicekort|korten/.test(c) && /(lägg|sätt|byt|fyll|kan du|kan ni|gör|koppla|använd)/.test(c)) {
      return true;
    }
    return false;
  }

  function wantsAboutImageAction(cmd) {
    const c = String(cmd || "").toLowerCase();
    if (/om oss-bild|om oss bild|about-bild/.test(c)) return true;
    if (/om oss/.test(c) && /(bild|foto)/.test(c)) {
      return /(lägg|sätt|byt|uppdatera|fixa|kan du|kan ni|gör|ge|lägga in|sätta in)/.test(c);
    }
    return false;
  }

  function handleGalleryImageChatCommand(text) {
    const cmd = String(text || "").toLowerCase();
    if (!wantsGalleryImageAction(cmd)) return null;
    const url = extractUrlFromText(text);
    const m = getMaterial();
    if (url) {
      const slots = m.galleryImages.slice();
      slots[0] = url;
      if (applyGalleryImages(galleryUrlsFromSlots(slots))) {
        return { ok: true, message: "" };
      }
    }
    const existing = galleryUrlsFromSlots(m.galleryImages);
    if (existing.length >= 1 && /(använd|koppla|sätt)/.test(cmd)) {
      if (applyGalleryImages(existing)) {
        return { ok: true, message: "" };
      }
    }
    const countMatch = cmd.match(/(\d)\s*bild/);
    const count = countMatch ? Math.min(MAX_GALLERY_IMAGES, Number(countMatch[1]) || MAX_GALLERY_IMAGES) : MAX_GALLERY_IMAGES;
    const stock = suggestStockImageUrls("gallery", count, { userText: text });
    if (stock.length && applyGalleryImages(stock)) {
      return {
        ok: true,
        message: "",
      };
    }
    return { ok: false, message: "Kunde inte lägga in galleribilder just nu — försök igen." };
  }

  function handleServiceCardImageChatCommand(text) {
    const cmd = String(text || "").toLowerCase();
    if (!wantsServiceCardImageAction(cmd)) return null;
    const url = extractUrlFromText(text);
    const m = getMaterial();
    if (url) {
      if (applyServiceImages([url, url, url])) {
        return { ok: true, message: "Bilden är kopplad till tjänstekorten." };
      }
    }
    const saved = m.serviceImages.filter(Boolean);
    if (saved.length >= 1) {
      if (applyServiceImages(saved)) {
        return { ok: true, message: "Bilderna är kopplade till tjänstekorten." };
      }
    }
    const fromGallery = galleryUrlsFromSlots(m.galleryImages).slice(0, 3);
    if (fromGallery.length >= 1 && /(använd|koppla|från galleri)/.test(cmd)) {
      if (applyServiceImages(fromGallery)) {
        return { ok: true, message: "Bilderna från galleriet är kopplade till tjänstekorten." };
      }
    }
    const stock = suggestStockImageUrls("card", 3, { userText: text });
    if (stock.length && applyServiceImages(stock)) {
      return {
        ok: true,
        message:
          "Jag lade in bilder på tjänstekorten. Egna bilder laddar du upp under Bilder & länkar.",
      };
    }
    return { ok: false, message: "Kunde inte lägga in bilder på tjänstekorten just nu — försök igen." };
  }

  function handleAboutImageChatCommand(text) {
    const cmd = String(text || "").toLowerCase();
    if (!wantsAboutImageAction(cmd)) return null;
    const url = extractUrlFromText(text);
    const m = getMaterial();
    if (url) {
      return { ok: applyAboutImage(url), message: "" };
    }
    if (m.aboutImageUrl) {
      return { ok: applyAboutImage(m.aboutImageUrl), message: "" };
    }
    const stock = suggestStockImageUrl("about", 0, { userText: text });
    if (stock && applyAboutImage(stock)) {
      return {
        ok: true,
        message: "",
      };
    }
    return { ok: false, message: "Kunde inte lägga in Om oss-bild just nu — försök igen." };
  }

  function applyServiceImages(urls) {
    const list = (urls || []).slice(0, 3).filter(Boolean);
    if (!list.length) return false;
    const SS = global.SiteState;
    if (!SS || !SS.patch) return false;
    SS.patch(function (doc) {
      patchServiceImagesInDocument(doc, list);
    });
    const m = getMaterial();
    list.forEach(function (u, i) {
      m.serviceImages[i] = u;
    });
    const form = document.getElementById("studioMaterialForm");
    if (form) {
      for (let i = 0; i < 3; i++) {
        const el = form.elements["serviceImage" + (i + 1)];
        if (el) el.value = m.serviceImages[i] || "";
      }
    }
    saveAndRefreshPreview("services");
    return true;
  }

  function applyPricelistFromMaterial() {
    const m = getMaterial();
    const hasServiceInfo =
      m.serviceTitles.some(Boolean) ||
      m.serviceBodies.some(Boolean) ||
      m.serviceDetails.some(Boolean);
    if (!hasServiceInfo) return false;
    applyAndRemount(m);
    return true;
  }

  function connectBookingFromMaterial() {
    const m = getMaterial();
    const url = m.bookingUrl || (global.SiteState && global.SiteState.get && global.SiteState.get()?.page?.bookingUrl);
    if (!url) return false;
    m.bookingUrl = url;
    applyAndRemount(m);
    fillMaterialForm(document.getElementById("studioMaterialForm"), m);
    return true;
  }

  function handleMaterialChatCommand(text) {
    const dbg = heroDbg();
    dbg && dbg.log("MATERIAL_CMD", text);
    const themedResult = handleThemedImageChatCommand(text);
    if (themedResult) {
      dbg && dbg.log("HANDLER", "handleThemedImageChatCommand");
      return themedResult;
    }

    const heroResult = handleHeroImageChatCommand(text);
    if (heroResult) {
      dbg && dbg.log("HANDLER", "handleHeroImageChatCommand");
      return heroResult;
    }

    const galleryResult = handleGalleryImageChatCommand(text);
    if (galleryResult) return galleryResult;

    const serviceResult = handleServiceCardImageChatCommand(text);
    if (serviceResult) return serviceResult;

    const aboutResult = handleAboutImageChatCommand(text);
    if (aboutResult) return aboutResult;

    const cmd = String(text || "").toLowerCase();
    if (/prislista|prislistan|meny/.test(cmd) && /lägg till|använd|visa|koppla/.test(cmd)) {
      if (applyPricelistFromMaterial()) {
        return { ok: true, message: "Prislistan är tillagd på sidan." };
      }
      return { ok: false, message: "Lägg in information under Tjänstekorten först." };
    }
    if (/boka tid|bokningslänk|booking/.test(cmd) && /koppla|länka|anslut/.test(cmd)) {
      if (connectBookingFromMaterial()) {
        return { ok: true, message: "Boka tid är kopplat till bokningslänken." };
      }
      return { ok: false, message: "Lägg till bokningslänk under Material först." };
    }
    return null;
  }

  global.MaterialSystem = {
    emptyMaterial: emptyMaterial,
    normalizeMaterial: normalizeMaterial,
    getMaterial: getMaterial,
    mergeDocumentIntoMaterial: mergeDocumentIntoMaterial,
    connectBookingToCta: connectBookingToCta,
    applyPricelistToServices: applyPricelistToServices,
    readMaterialFromForm: readMaterialFromForm,
    fillMaterialForm: fillMaterialForm,
    applyAndRemount: applyAndRemount,
    saveFromForm: saveFromForm,
    bindFileInputs: bindFileInputs,
    handleMaterialChatCommand: handleMaterialChatCommand,
    applyHeroImage: applyHeroImage,
    applyHeroStockImage: applyHeroStockImage,
    handleThemedImageChatCommand: handleThemedImageChatCommand,
    handleGalleryImageChatCommand: handleGalleryImageChatCommand,
    handleServiceCardImageChatCommand: handleServiceCardImageChatCommand,
    handleAboutImageChatCommand: handleAboutImageChatCommand,
    applyGalleryImages: applyGalleryImages,
    applyAboutImage: applyAboutImage,
    applyServiceImages: applyServiceImages,
    pickStockImageCandidate: pickStockImageCandidate,
    parseImageTheme: parseImageTheme,
    applyPricelistFromMaterial: applyPricelistFromMaterial,
    connectBookingFromMaterial: connectBookingFromMaterial,
  };
})(typeof window !== "undefined" ? window : globalThis);
