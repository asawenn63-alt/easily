/**
 * Designpanel — branschfärger + valfria typsnitt (färger och typsnitt är separata val).
 */
(function (global) {
  "use strict";

  const TYPOGRAPHY_TEMPLATES = [
    {
      id: "editorial",
      mood: "Mjuk nordisk",
      heading: '"Cormorant Garamond", Georgia, serif',
      body: '"Manrope", system-ui, sans-serif',
      headingName: "Cormorant Garamond",
      bodyName: "Manrope",
    },
    {
      id: "atelier",
      mood: "Organiskt lugn",
      heading: '"Fraunces", Georgia, serif',
      body: '"Manrope", system-ui, sans-serif',
      headingName: "Fraunces",
      bodyName: "Manrope",
    },
    {
      id: "swiss-grid",
      mood: "Ren precision",
      heading: '"Syne", system-ui, sans-serif',
      body: '"Inter", system-ui, sans-serif',
      headingName: "Syne",
      bodyName: "Inter",
    },
    {
      id: "luxury-brand",
      mood: "Tyst lyx",
      heading: '"Playfair Display", Georgia, serif',
      body: '"Manrope", system-ui, sans-serif',
      headingName: "Playfair Display",
      bodyName: "Manrope",
    },
    {
      id: "landmark",
      mood: "Scen & kontrast",
      heading: '"Fraunces", Georgia, serif',
      body: '"DM Sans", system-ui, sans-serif',
      headingName: "Fraunces",
      bodyName: "DM Sans",
    },
  ];

  function esc(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function currentPage() {
    const doc = global.SiteState && global.SiteState.get ? global.SiteState.get() : null;
    return doc && doc.page ? doc.page : null;
  }

  function currentDoc() {
    return global.SiteState && global.SiteState.get ? global.SiteState.get() : null;
  }

  function currentColorSetId() {
    const page = currentPage();
    if (!page) return null;
    if (page.designColorSetId) return page.designColorSetId;
    const DF = global.DesignFamilies;
    if (DF && typeof DF.recommendForIndustry === "function") {
      const bucket = DF.recommendForIndustry(page.industry);
      if (bucket && bucket.primary) return bucket.primary.id;
    }
    return null;
  }

  function currentTemplateId() {
    const page = currentPage();
    return (page && page.template) || "editorial";
  }

  function getRecommendations() {
    const page = currentPage();
    const industry = (page && page.industry) || "konsult";
    if (global.DesignFamilies && typeof global.DesignFamilies.recommendForIndustry === "function") {
      return global.DesignFamilies.recommendForIndustry(industry);
    }
    return { ids: [], industryName: "din verksamhet", primary: null, secondary: null };
  }

  function previewHeroTitle() {
    const doc = currentDoc();
    const t = doc && doc.sections && doc.sections.hero && doc.sections.hero.content && doc.sections.hero.content["hero-title"];
    const s = t && String(t).trim();
    return s ? s.slice(0, 48) : "Din rubrik";
  }

  function previewTypography(page) {
    const templateId = (page && page.template) || "editorial";
    const DF = global.DesignFamilies;
    if (DF && typeof DF.typographyForTemplate === "function") {
      return Object.assign({ template: templateId }, DF.typographyForTemplate(templateId));
    }
    const t = TYPOGRAPHY_TEMPLATES.find(function (x) {
      return x.id === templateId;
    });
    return t
      ? { template: templateId, heading: t.heading, body: t.body, headingName: t.headingName, bodyName: t.bodyName }
      : { template: "editorial", heading: TYPOGRAPHY_TEMPLATES[0].heading, body: TYPOGRAPHY_TEMPLATES[0].body };
  }

  function applyColorSet(setId, opts) {
    opts = opts || {};
    const DF = global.DesignFamilies;
    const SS = global.SiteState;
    const EE = global.EditorEngine;
    if (!DF || !SS || !SS.patch) return false;

    SS.patch(function (doc) {
      if (!doc.page) doc.page = {};
      if (typeof DF.applyCohesiveDesignToPage === "function") {
        DF.applyCohesiveDesignToPage(doc.page, setId, doc.page.industry, {
          preserveSiteComposition: !!doc.page.compositionLocked,
        });
      } else if (typeof DF.applyColorSetToPage === "function") {
        DF.applyColorSetToPage(doc.page, setId, doc.page.industry, { applyFamilyTokens: false });
      } else {
        DF.applyToPage(doc.page, setId, { industry: doc.page.industry });
      }
    });
    if (DF.applyToPreviewDOM && SS.get) {
      const page = SS.get().page;
      if (page) DF.applyToPreviewDOM(page);
    } else if (SS.applyPageToBody) {
      SS.applyPageToBody();
    }
    if (EE && typeof EE.remount === "function") {
      EE.remount();
    } else if (EE && typeof EE.syncHeroFromState === "function") {
      EE.syncHeroFromState();
    }
    if (!opts.skipSave) SS.save();

    syncColorCardSelection(setId);
    return true;
  }

  function applyTemplate(templateId, opts) {
    opts = opts || {};
    const SS = global.SiteState;
    const DF = global.DesignFamilies;
    if (!SS || !SS.patch) return false;

    SS.patch(function (doc) {
      if (!doc.page) doc.page = {};
      doc.page.template = templateId;
      doc.page.fontPair = "";
    });
    if (DF && DF.applyToPreviewDOM && SS.get) {
      const page = SS.get().page;
      if (page) DF.applyToPreviewDOM(page);
    } else if (SS.applyPageToBody) {
      SS.applyPageToBody();
    }
    if (!opts.skipSave) SS.save();

    syncTypographySelection(templateId);
    refreshColorPreviews();
    return true;
  }

  function syncColorCardSelection(activeId) {
    document.querySelectorAll("[data-design-color-card]").forEach(function (card) {
      const on = card.getAttribute("data-design-color-card") === activeId;
      card.classList.toggle("is-active", on);
      card.setAttribute("aria-checked", on ? "true" : "false");
    });
  }

  function syncTypographySelection(templateId) {
    document.querySelectorAll("[data-design-template-chip]").forEach(function (chip) {
      const on = chip.getAttribute("data-design-template-chip") === templateId;
      chip.classList.toggle("is-active", on);
      chip.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  function createSitePreview(colorSet, page) {
    const colors = colorSet.colors || {};
    const type = previewTypography(page);
    const DF = global.DesignFamilies;
    const shimmer =
      DF && typeof DF.heroShimmerFromColors === "function" ? DF.heroShimmerFromColors(colors) : "";
    const isDarkBg =
      colors.bg &&
      (function (bg) {
        const raw = String(bg).replace("#", "");
        if (raw.length < 3) return false;
        const r = parseInt(raw.length === 3 ? raw[0] + raw[0] : raw.slice(0, 2), 16);
        const g = parseInt(raw.length === 3 ? raw[1] + raw[1] : raw.slice(2, 4), 16);
        const b = parseInt(raw.length === 3 ? raw[2] + raw[2] : raw.slice(4, 6), 16);
        return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.42;
      })(colors.bg);

    const wrap = document.createElement("div");
    wrap.className = "design-family-card__preview";
    wrap.setAttribute("aria-hidden", "true");

    const pageEl = document.createElement("div");
    pageEl.className = "landing-ex-page landing-ex-page--design-preview";
    if (isDarkBg) pageEl.classList.add("landing-ex-page--dark");

    pageEl.innerHTML =
      '<div class="landing-ex-page__hero">' +
      '<div class="landing-ex-page__hero-photo"></div>' +
      '<p class="landing-ex-page__hero-title"></p>' +
      '<p class="landing-ex-page__hero-lead">Kort beskrivning av ert erbjudande.</p>' +
      '<span class="landing-ex-studio-card__cta">Kontakta oss</span>' +
      "</div>" +
      '<span class="landing-ex-page__label">Det här erbjuder vi</span>' +
      '<div class="landing-ex-studio-cards landing-ex-studio-cards--example">' +
      '<article class="landing-ex-studio-card">' +
      '<span class="landing-ex-studio-card__thumb"></span>' +
      '<span class="landing-ex-studio-card__title">Tjänst</span>' +
      '<span class="landing-ex-studio-card__body">Kort beskrivning.</span>' +
      '<span class="landing-ex-studio-card__cta">Läs mer</span>' +
      "</article>" +
      '<article class="landing-ex-studio-card">' +
      '<span class="landing-ex-studio-card__thumb"></span>' +
      '<span class="landing-ex-studio-card__title">Tjänst</span>' +
      '<span class="landing-ex-studio-card__body">Kort beskrivning.</span>' +
      '<span class="landing-ex-studio-card__cta">Läs mer</span>' +
      "</article>" +
      '<article class="landing-ex-studio-card">' +
      '<span class="landing-ex-studio-card__thumb"></span>' +
      '<span class="landing-ex-studio-card__title">Kontakt</span>' +
      '<span class="landing-ex-studio-card__body">Hör av dig till oss.</span>' +
      '<span class="landing-ex-studio-card__cta">Kontakt</span>' +
      "</article>" +
      "</div>";

    if (DF && typeof DF.applyPreviewTokensToElement === "function") {
      DF.applyPreviewTokensToElement(pageEl, colors);
    }
    pageEl.style.setProperty("--font-heading", type.heading);
    pageEl.style.setProperty("--font-body", type.body);
    pageEl.style.setProperty("--heading-weight", type.weight || "600");

    const photo = pageEl.querySelector(".landing-ex-page__hero-photo");
    if (photo && shimmer) photo.style.background = shimmer;

    const titleEl = pageEl.querySelector(".landing-ex-page__hero-title");
    if (titleEl) titleEl.textContent = previewHeroTitle();

    wrap.appendChild(pageEl);
    return wrap;
  }

  function buildColorCard(colorSet, activeId, badge, page) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "design-family-card";
    card.dataset.designColorCard = colorSet.id;
    card.setAttribute("role", "radio");
    card.setAttribute("aria-checked", colorSet.id === activeId ? "true" : "false");
    if (colorSet.id === activeId) card.classList.add("is-active");
    card.setAttribute("aria-label", colorSet.label + " — " + colorSet.tagline);

    card.appendChild(createSitePreview(colorSet, page));

    const meta = document.createElement("div");
    meta.className = "design-family-card__meta";
    meta.innerHTML =
      (badge ? '<span class="design-family-card__badge">' + esc(badge) + "</span>" : "") +
      '<strong class="design-family-card__label">' +
      esc(colorSet.label) +
      '</strong><span class="design-family-card__tagline">' +
      esc(colorSet.tagline) +
      "</span>";

    card.appendChild(meta);
    card.addEventListener("click", function () {
      applyColorSet(colorSet.id);
    });
    return card;
  }

  function buildTypographyChip(t, activeTemplate) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "studio-left-template-chip";
    btn.dataset.designTemplateChip = t.id;
    btn.setAttribute("aria-pressed", t.id === activeTemplate ? "true" : "false");
    if (t.id === activeTemplate) btn.classList.add("is-active");
    btn.title = t.headingName + " + " + t.bodyName + " — " + t.mood;

    const preview = document.createElement("div");
    preview.className = "studio-left-template-chip__preview";
    preview.style.setProperty("--tm-heading-font", t.heading);
    preview.style.setProperty("--tm-body-font", t.body);

    const hEl = document.createElement("span");
    hEl.className = "studio-left-template-chip__preview__h";
    hEl.style.fontFamily = t.heading;
    hEl.textContent = t.headingName;

    const bEl = document.createElement("span");
    bEl.className = "studio-left-template-chip__preview__b";
    bEl.style.fontFamily = t.body;
    bEl.textContent = t.bodyName;

    preview.append(hEl, bEl);

    const mood = document.createElement("span");
    mood.className = "studio-left-template-chip__mood";
    mood.style.fontFamily = t.body;
    mood.textContent = t.mood;

    btn.append(preview, mood);
    btn.addEventListener("click", function () {
      applyTemplate(t.id);
    });
    return btn;
  }

  function refreshColorPreviews() {
    const page = currentPage();
    document.querySelectorAll("[data-design-color-card]").forEach(function (card) {
      const setId = card.getAttribute("data-design-color-card");
      const rec = getRecommendations();
      const colorSet = [rec.primary, rec.secondary].filter(Boolean).find(function (s) {
        return s && s.id === setId;
      });
      if (!colorSet) return;
      const old = card.querySelector(".design-family-card__preview");
      const meta = card.querySelector(".design-family-card__meta");
      const next = createSitePreview(colorSet, page);
      if (old) old.replaceWith(next);
      else if (meta) card.insertBefore(next, meta);
    });
  }

  function mountTypographySection(root, activeTemplate) {
    let section = root.querySelector("[data-design-typography-section]");
    if (!section) {
      section = document.createElement("section");
      section.className = "design-typography-section";
      section.dataset.designTypographySection = "1";
      root.appendChild(section);
    }
    section.innerHTML = "";

    const head = document.createElement("div");
    head.className = "design-typography-section__head";
    head.innerHTML =
      "<h3 class=\"design-typography-section__title\">Typsnitt</h3>" +
      '<p class="design-typography-section__lead">Följer layoutstilen från Create — rubriker och brödtext är avstämda med resten av designen.</p>';
    section.appendChild(head);

    const grid = document.createElement("div");
    grid.className = "design-typography-section__grid studio-left-templates";
    grid.setAttribute("role", "group");
    grid.setAttribute("aria-label", "Typsnitt");
    TYPOGRAPHY_TEMPLATES.forEach(function (t) {
      grid.appendChild(buildTypographyChip(t, activeTemplate));
    });
    section.appendChild(grid);
  }

  function mount(root) {
    if (!root || !global.DesignFamilies) return;
    const page = currentPage();
    const activeId = currentColorSetId();
    const activeTemplate = currentTemplateId();
    const rec = getRecommendations();
    const DF = global.DesignFamilies;
    const activeSet =
      (activeId && DF && typeof DF.findColorSet === "function"
        ? (function () {
            const raw = DF.findColorSet(page && page.industry, activeId);
            return raw && typeof DF.publicColorSetView === "function"
              ? DF.publicColorSetView(raw)
              : raw;
          })()
        : null) ||
      rec.primary;
    root.innerHTML = "";
    root.classList.add("design-family-panel");

    const intro = document.createElement("p");
    intro.className = "studio-panel__lead design-family-panel__lead";
    const motivation =
      (page && page.designMotivation) ||
      (activeSet && activeSet.motivation) ||
      "Easily valde ett färgtema som passar " + rec.industryName + ".";
    intro.textContent =
      motivation + " Skriv i chatten om du vill byta hela temat, t.ex. «jag vill inte ha blått».";
    root.appendChild(intro);

    const grid = document.createElement("div");
    grid.className = "design-family-grid";
    grid.setAttribute("role", "group");
    grid.setAttribute("aria-label", "Aktiv design");

    if (activeSet) {
      grid.appendChild(buildColorCard(activeSet, activeId, "Din design", page));
    }

    root.appendChild(grid);
    mountTypographySection(root, activeTemplate);
    root.dataset.designPanelMounted = "1";
  }

  function refresh() {
    document.querySelectorAll("[data-design-panel-root]").forEach(function (root) {
      mount(root);
    });
  }

  global.DesignPanel = {
    mount: mount,
    refresh: refresh,
    applyColorSet: applyColorSet,
    applyTemplate: applyTemplate,
    applyFamily: applyColorSet,
    currentColorSetId: currentColorSetId,
    currentFamilyId: currentColorSetId,
    getRecommendations: getRecommendations,
  };
})(typeof window !== "undefined" ? window : globalThis);
