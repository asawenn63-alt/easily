/**
 * CD Composition Executor — deterministisk brief → struktur (CD Create).
 * Läser endast låst creativeBrief. Anropar inte SCE.
 */
(function (global) {
  "use strict";

  const MOTOR = "cd-composition-executor-v1";

  const DOC_SECTION_IDS = ["hero", "about", "services", "gallery", "faq", "booking", "contact", "footer"];

  const NAV_LABELS = {
    about: "Om oss",
    services: "Tjänster",
    gallery: "Galleri",
    faq: "Frågor",
    booking: "Bokning",
    contact: "Kontakt",
  };

  const ANCHOR_BY_SECTION = {
    about: "#om-oss",
    services: "#tjanster",
    gallery: "#galleri",
    faq: "#fragor",
    booking: "#bokning",
    contact: "#kontakt",
  };

  const PHASE_SECTION_PRIORITY = {
    identitet: ["about"],
    bevis: ["services", "gallery", "faq"],
    kontakt: ["contact", "booking"],
  };

  function hashStr(s) {
    s = String(s || "");
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function resolveScopeFromBrief(brief) {
    const scope = brief && brief.scope;
    const sections = scope && Array.isArray(scope.sections) ? scope.sections.slice() : [];
    const filtered = sections.filter(function (id) {
      return DOC_SECTION_IDS.includes(id) && id !== "footer";
    });
    if (!filtered.length) {
      return null;
    }
    return filtered;
  }

  function buildSectionOrder(scopeIds, brief) {
    const phases = brief.narrativePhases && brief.narrativePhases.length
      ? brief.narrativePhases.slice()
      : ["identitet", "bevis", "kontakt"];
    const ordered = [];
    const seen = new Set();

    if (scopeIds.indexOf("hero") >= 0) {
      ordered.push("hero");
      seen.add("hero");
    }

    phases.forEach(function (phase) {
      const key = String(phase || "").toLowerCase();
      const candidates = PHASE_SECTION_PRIORITY[key] || [];
      candidates.forEach(function (id) {
        if (scopeIds.indexOf(id) >= 0 && !seen.has(id)) {
          ordered.push(id);
          seen.add(id);
        }
      });
    });

    scopeIds.forEach(function (id) {
      if (id === "footer" || seen.has(id)) return;
      ordered.push(id);
      seen.add(id);
    });

    return ordered;
  }

  function resolveHeroLayout(brief) {
    const dominant = String(brief.entranceDominant || "").toLowerCase();
    const leadMode = String(brief.entranceLeadMode || "").toLowerCase();
    const budget = String(brief.entranceInformationBudget || "").toLowerCase();

    let heroLayout = "center";
    let heroStructure = "center";

    if (dominant.indexOf("detalj") >= 0 || dominant.indexOf("material") >= 0) {
      heroLayout = "split";
      heroStructure = "split";
    } else if (dominant.indexOf("bevis") >= 0) {
      heroLayout = leadMode.indexOf("text") >= 0 ? "left" : "split";
      heroStructure = heroLayout;
    } else if (dominant.indexOf("luft") >= 0) {
      heroLayout = "center";
      heroStructure = budget.indexOf("minimal") >= 0 ? "editorial" : "center";
    } else {
      heroLayout = "center";
      heroStructure = "center";
    }

    return { heroLayout: heroLayout, heroStructure: heroStructure };
  }

  function resolveCardCount(brief) {
    const density = String(brief.spatialDensity || "").toLowerCase();
    if (density.indexOf("gener") >= 0) return 2;
    if (density.indexOf("tät") >= 0 || density.indexOf("tat") >= 0) return 3;
    const h = hashStr(brief.concept);
    return h % 5 === 0 ? 2 : 3;
  }

  function resolveServicesLayout(cardCount, brief) {
    const density = String(brief.spatialDensity || "").toLowerCase();
    if (cardCount <= 2) return "cards-2";
    if (density.indexOf("tät") >= 0 || density.indexOf("tat") >= 0) return "cards-2";
    return "cards-3";
  }

  function resolveCardIntents(brief, cardCount) {
    const phases = brief.narrativePhases || [];
    const pool = [];
    phases.forEach(function (phase) {
      const key = String(phase || "").toLowerCase();
      if (key === "identitet") pool.push("process");
      if (key === "bevis") {
        pool.push("services");
        pool.push("testimonials");
      }
      if (key === "kontakt") pool.push("process");
    });
    if (!pool.length) pool.push("services", "process", "testimonials");

    const intents = [];
    for (let i = 0; i < cardCount; i++) {
      intents.push(pool[i % pool.length]);
    }
    return intents;
  }

  function resolveAboutLayout(brief) {
    const territory = String(brief.emotionalTerritory || "").toLowerCase();
    const material = String(brief.materialFeel || "").toLowerCase();
    if (
      territory.indexOf("tradition") >= 0 ||
      material.indexOf("massivt") >= 0 ||
      material.indexOf("patina") >= 0
    ) {
      return "asymmetric";
    }
    const h = hashStr(brief.concept + "|about");
    return h % 3 === 0 ? "asymmetric" : "standard";
  }

  function resolveGalleryLayout(brief) {
    const density = String(brief.spatialDensity || "").toLowerCase();
    if (density.indexOf("gener") >= 0) return "masonry";
    if (density.indexOf("tät") >= 0 || density.indexOf("tat") >= 0) return "grid-tight";
    return "grid";
  }

  function resolveHighlightMode(brief) {
    const trust = String(brief.trustStrategy || "").toLowerCase();
    if (trust.indexOf("konkret") >= 0 || trust.indexOf("signal") >= 0) return "inline";
    const h = hashStr(brief.trustStrategy + brief.signatureMoment);
    return h % 2 === 0 ? "minimal" : "inline";
  }

  function resolveSectionSpacing(brief) {
    const density = String(brief.spatialDensity || "").toLowerCase();
    if (density.indexOf("gener") >= 0) return "3";
    if (density.indexOf("tät") >= 0 || density.indexOf("tat") >= 0) return "1";
    return "2";
  }

  function resolveCompositionBlocks(sectionOrder, brief) {
    const blocks = [];
    const seed = hashStr(
      [
        brief.concept,
        brief.conversionJourney,
        brief.signatureMoment,
        brief.trustStrategy,
        sectionOrder.join(","),
      ].join("|"),
    );

    const bevisSection = sectionOrder.find(function (id) {
      return id === "services" || id === "gallery";
    });
    if (bevisSection && String(brief.signatureMoment || "").trim()) {
      blocks.push({
        id: "cd-signature-" + seed.toString(36),
        type: "banner",
        variant: seed % 2 === 0 ? "promo" : "trust",
        afterSection: bevisSection,
        content: {},
      });
    }

    const journey = String(brief.conversionJourney || "").toLowerCase();
    const contactIdx = sectionOrder.indexOf("contact");
    if (contactIdx > 0 && (journey.indexOf("kontakt") >= 0 || journey.indexOf("→") >= 0)) {
      const afterSection = sectionOrder[contactIdx - 1] || "services";
      blocks.push({
        id: "cd-journey-" + seed.toString(36),
        type: "cta-band",
        afterSection: afterSection,
        content: {},
      });
    }

    return blocks;
  }

  function buildNavigation(sectionOrder) {
    return sectionOrder
      .filter(function (id) {
        return id !== "hero" && NAV_LABELS[id];
      })
      .map(function (id) {
        return {
          label: NAV_LABELS[id],
          href: ANCHOR_BY_SECTION[id] || "#" + id,
        };
      });
  }

  function buildSectionAnchors(sectionOrder) {
    const anchors = {};
    sectionOrder.forEach(function (id) {
      if (ANCHOR_BY_SECTION[id]) anchors[id] = ANCHOR_BY_SECTION[id];
    });
    return anchors;
  }

  function ensureServiceCards(sec, cardCount, cardIntents) {
    if (!sec) return;
    if (!sec.cards || !Array.isArray(sec.cards)) sec.cards = [];
    while (sec.cards.length < cardCount) {
      sec.cards.push({
        title: "",
        body: "",
        intent: "services",
        imageUrl: "",
      });
    }
    sec.cards = sec.cards.slice(0, cardCount);
    sec.cards.forEach(function (card, i) {
      if (!card || typeof card !== "object") sec.cards[i] = { title: "", body: "", intent: "services" };
      sec.cards[i].intent = cardIntents[i] || "services";
    });
    sec.cardCount = cardCount;
  }

  /**
   * Deterministisk mapping brief → struktur enligt Composition Input Contract.
   * @param {object} brief — från CdExecutorGuard.readAllowedCreativeBrief
   */
  function mapBriefToComposition(brief) {
    const scopeIds = resolveScopeFromBrief(brief);
    if (!scopeIds || !scopeIds.length) {
      return null;
    }
    const sectionOrder = buildSectionOrder(scopeIds, brief);
    const hero = resolveHeroLayout(brief);
    const cardCount = resolveCardCount(brief);
    const cardIntents = resolveCardIntents(brief, cardCount);
    const servicesLayout = resolveServicesLayout(cardCount, brief);
    const aboutLayout = resolveAboutLayout(brief);
    const galleryLayout = resolveGalleryLayout(brief);
    const compositionBlocks = resolveCompositionBlocks(sectionOrder, brief);

    const layoutKeys = {
      hero: hero.heroStructure,
      about: aboutLayout === "asymmetric" ? "about-asymmetric" : "about-standard",
      services: "services-" + servicesLayout,
      gallery: "gallery-" + galleryLayout,
    };

    return {
      sectionOrder: sectionOrder,
      compositionBlocks: compositionBlocks,
      cardCount: cardCount,
      cardIntents: cardIntents,
      layoutKeys: layoutKeys,
      heroLayout: hero.heroLayout,
      heroStructure: hero.heroStructure,
      servicesLayout: servicesLayout,
      aboutLayout: aboutLayout,
      galleryLayout: galleryLayout,
      highlightMode: resolveHighlightMode(brief),
      sectionSpacing: resolveSectionSpacing(brief),
      navigation: buildNavigation(sectionOrder),
      sectionAnchors: buildSectionAnchors(sectionOrder),
    };
  }

  function applyCompositionToDocument(doc, plan) {
    if (!doc || !doc.page || !plan) return doc;
    const page = doc.page;
    const sections = doc.sections || {};

    page.sectionOrder = plan.sectionOrder.slice();
    page.compositionBlocks = plan.compositionBlocks.slice();
    page.compositionLocked = true;
    page.heroLayout = plan.heroLayout;
    page.heroStructure = plan.heroStructure;
    page.highlightMode = plan.highlightMode;
    page.sectionSpacing = plan.sectionSpacing;
    page.navigation = plan.navigation.slice();
    page.sectionAnchors = Object.assign({}, plan.sectionAnchors);
    page.cdLayoutKeys = Object.assign({}, plan.layoutKeys);
    page.cdCompositionMeta = {
      motor: MOTOR,
      cardCount: plan.cardCount,
      cardIntents: plan.cardIntents.slice(),
      layoutKeys: plan.layoutKeys,
    };

    DOC_SECTION_IDS.forEach(function (id) {
      if (!sections[id]) return;
      sections[id].hidden = plan.sectionOrder.indexOf(id) === -1;
    });

    if (sections.about) {
      sections.about.dataStyle = plan.aboutLayout === "asymmetric" ? "asymmetric" : "";
    }
    if (sections.services) {
      sections.services.layout = plan.servicesLayout;
      ensureServiceCards(sections.services, plan.cardCount, plan.cardIntents);
    }
    if (sections.gallery) {
      sections.gallery.layout = plan.galleryLayout;
    }

    return doc;
  }

  /**
   * @param {object} doc
   * @returns {{ ok: boolean, plan?: object, reason?: string }}
   */
  function applyToDocument(doc) {
    const Guard = global.CdExecutorGuard;
    if (!Guard || typeof Guard.guardExecutor !== "function") {
      return { ok: false, reason: "cd_executor_guard_missing" };
    }
    if (!doc || !doc.page) {
      return { ok: false, reason: "missing_document" };
    }

    let plan = null;
    Guard.guardExecutor("composition", doc, function (brief) {
      plan = mapBriefToComposition(brief);
      if (plan) {
        applyCompositionToDocument(doc, plan);
        const LSC = global.LayoutSpecContract;
        if (LSC && typeof LSC.buildFromComposition === "function") {
          doc.page.layoutEngine = "generative";
          doc.page.layoutSpec = LSC.buildFromComposition(plan, brief);
        }
      }
    });

    if (!plan) {
      return { ok: false, reason: "composition_mapping_failed" };
    }

    return { ok: true, plan: plan };
  }

  global.CdCompositionExecutor = {
    MOTOR: MOTOR,
    mapBriefToComposition: mapBriefToComposition,
    applyToDocument: applyToDocument,
  };
})(typeof window !== "undefined" ? window : globalThis);
