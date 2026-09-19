/**
 * Kopplar Create-flödet (steg 1–5) till AI-genereringen.
 * Metadata → kontext, sektionsordning, mål, design och dokument.
 */
(function (global) {
  "use strict";

  const CREATE_SITE_GOAL_TO_PLAN_ID = {
    "fler-kunder": "quote",
    bokningar: "bookings",
    "salja-produkter": "sell",
    "visa-arbete": "showcase",
    "dela-information": "trust",
    kontaktforfragan: "quote",
  };

  /** Create UI-sektion → dokumentsektion i AppDocument. */
  const CREATE_SECTION_TO_DOC = {
    hero: "hero",
    services: "services",
    about: "about",
    gallery: "gallery",
    testimonials: "services",
    pricelist: "services",
    faq: "faq",
    contact: "contact",
    footer: "footer",
    "product-categories": "services",
    products: "services",
    campaigns: "services",
    "featured-products": "services",
    reviews: "services",
    "shipping-returns": "faq",
    portfolio: "gallery",
    "case-studies": "gallery",
    menu: "services",
    booking: "booking",
    hours: "contact",
  };

  const DOC_SECTION_IDS = ["hero", "about", "services", "gallery", "faq", "booking", "contact", "footer"];

  const CREATE_DESIGN_STYLE_FAMILY = {
    "nordisk-ren": "salon",
    "modern-professionell": "salon",
    "varm-valkomnande": "cafe",
    "mork-exklusiv": "fotograf",
    "lekfull-kreativ": "cafe",
  };

  const SITE_TYPE_LABELS = {
    foretag: "Företag / Tjänster",
    portfolio: "Portfolio",
    webbutik: "Webbutik",
    restaurang: "Restaurang / Café",
    ovrigt: "Övrigt",
  };

  function mapCreateSectionsToDocumentOrder(createSections) {
    if (!createSections || !createSections.length) return null;
    const seen = new Set();
    const order = [];
    createSections.forEach(function (section) {
      const rawId = section && section.id ? String(section.id) : "";
      const docId = CREATE_SECTION_TO_DOC[rawId] || rawId;
      if (!DOC_SECTION_IDS.includes(docId) || seen.has(docId)) return;
      seen.add(docId);
      order.push(docId);
    });
    return order.length ? order : null;
  }

  function resolvePlanFromCreateFlow(ctx, AI) {
    if (!AI || typeof AI.resolveBusinessPlan !== "function") return ctx.plan || null;
    const area = ctx.area || "other";
    const industry = ctx.industry || "verksamhet";
    const base = AI.resolveBusinessPlan(area, industry);
    const goals =
      ctx.createSiteGoals && ctx.createSiteGoals.length
        ? ctx.createSiteGoals
        : ctx.createSiteGoal
          ? [ctx.createSiteGoal]
          : [];
    const goalKey = goals.length ? goals[0].id : null;
    const planId = goalKey && CREATE_SITE_GOAL_TO_PLAN_ID[goalKey];
    if (!planId || !AI.GOAL_PLANS || !AI.GOAL_PLANS[planId]) return base;
    const goalPlan = AI.GOAL_PLANS[planId];
    const userOrder = mapCreateSectionsToDocumentOrder(ctx.createSections);
    return {
      goal: planId,
      primaryCta: base.primaryCta,
      secondaryCta: goalPlan.secondaryCta,
      sectionOrder: userOrder && userOrder.length ? userOrder.slice() : goalPlan.sectionOrder.slice(),
      cardIntents: goalPlan.cardIntents.slice(),
    };
  }

  function buildCreateFlowSnapshot(ctx) {
    if (ctx.createBuildPlan) {
      const plan = ctx.createBuildPlan;
      return {
        siteType: plan.siteType && plan.siteType.id ? plan.siteType.id : "",
        siteTypeLabel: plan.siteType && plan.siteType.label ? plan.siteType.label : "",
        sections: plan.sections ? plan.sections.slice() : [],
        businessName: plan.businessName || "",
        businessDescription: plan.businessDescription || "",
        businessBrief: plan.businessBrief || "",
        designStyle: plan.designStyle || null,
        siteGoals: plan.siteGoals ? plan.siteGoals.slice() : [],
        existingSite: plan.existingSite || null,
        createBuildPlan: plan,
      };
    }
    return {
      siteType: ctx.siteType || "",
      siteTypeLabel: SITE_TYPE_LABELS[ctx.siteType] || ctx.siteType || "",
      sections: ctx.createSections ? ctx.createSections.slice() : [],
      businessName: ctx.createBusinessName || "",
      businessDescription: ctx.createBusinessDescription || "",
      businessBrief: ctx.createBusinessBrief || "",
      designStyle: ctx.createDesignStyle || null,
      siteGoals: ctx.createSiteGoals && ctx.createSiteGoals.length ? ctx.createSiteGoals.slice() : [],
      existingSite: ctx.createExistingSite || null,
    };
  }

  function composeGenerationUserText(ctx) {
    const BP = global.CreateBuildPlan;
    if (ctx && ctx.createBuildPlan && BP && typeof BP.toGenerationText === "function") {
      return BP.toGenerationText(ctx.createBuildPlan);
    }
    const parts = [];
    const name = String(ctx.createBusinessName || "").trim();
    const desc = String(ctx.createBusinessDescription || ctx.createBusinessBrief || "").trim();
    if (name) parts.push("Företagsnamn: " + name);
    if (desc) parts.push(desc);
    if (ctx.createSiteGoals && ctx.createSiteGoals.length) {
      const goalLines = ctx.createSiteGoals.map(function (goal) {
        return "• " + goal.title + (goal.description ? ": " + goal.description : "");
      });
      parts.push("Webbplatsens mål:\n" + goalLines.join("\n"));
    } else if (ctx.createSiteGoal && ctx.createSiteGoal.title) {
      parts.push("Webbplatsens mål: " + ctx.createSiteGoal.title + ". " + (ctx.createSiteGoal.description || ""));
    }
    if (ctx.createDesignStyle && ctx.createDesignStyle.title) {
      parts.push("Önskad designstil: " + ctx.createDesignStyle.title + ". " + (ctx.createDesignStyle.description || ""));
    }
    if (ctx.siteType && SITE_TYPE_LABELS[ctx.siteType]) {
      parts.push("Typ av webbplats: " + SITE_TYPE_LABELS[ctx.siteType] + ".");
    }
    if (ctx.createExistingSite) {
      if (ctx.createExistingSite.id === "has-website" && ctx.createExistingSite.existingUrl) {
        parts.push(
          "Referenswebbplats (analysera som underlag — skapa en helt ny webbplats): " +
            ctx.createExistingSite.existingUrl +
            ".",
        );
      } else if (ctx.createExistingSite.id === "own-material") {
        parts.push("Kunden har eget material (texter och bilder) att använda senare.");
      } else if (ctx.createExistingSite.id === "from-scratch") {
        parts.push("Skapa allt från grunden — ingen befintlig webbplats.");
      }
    }
    return parts.join("\n\n").slice(0, 1200);
  }

  function applySectionLabelsFromCreateFlow(d, createSections) {
    if (!d || !d.sections || !createSections || !createSections.length) return;
    const ids = createSections.map(function (s) {
      return s.id;
    });
    if (ids.indexOf("menu") !== -1 && d.sections.services && d.sections.services.content) {
      d.sections.services.content["services-title"] = "Meny";
      d.sections.services.content["services-lead"] =
        "Ett ögonkast på vad ni serverar — byt till era rätter, priser och tillval.";
    } else if (ids.indexOf("pricelist") !== -1 && d.sections.services && d.sections.services.content) {
      d.sections.services.content["services-title"] = "Prislista";
      d.sections.services.content["services-lead"] = "Tydliga priser och paket — redigera raderna efter er verksamhet.";
    } else if (
      (ids.indexOf("products") !== -1 || ids.indexOf("featured-products") !== -1) &&
      d.sections.services &&
      d.sections.services.content
    ) {
      d.sections.services.content["services-title"] = "Produkter";
      d.sections.services.content["services-lead"] = "Utvalda produkter och kategorier — byt till ert sortiment.";
    } else if (ids.indexOf("portfolio") !== -1 && d.sections.gallery && d.sections.gallery.content) {
      d.sections.gallery.content["gallery-title"] = "Portfolio";
      d.sections.gallery.content["gallery-lead"] = "Projekt och referenser — byt till era egna bilder och case.";
    }
    if (ids.indexOf("hours") !== -1 && d.sections.contact && d.sections.contact.content) {
      const title = String(d.sections.contact.content["contact-title"] || "Kontakt");
      if (title.indexOf("öppettider") === -1) {
        d.sections.contact.content["contact-title"] = "Kontakt & öppettider";
      }
    }
  }

  function isCdCreatePath(ctx) {
    const CDG = global.CreateCdGate;
    if (CDG && typeof CDG.isCdPath === "function") return CDG.isCdPath(ctx);
    return !!(ctx && ctx.creativeDirectorCreateEnabled);
  }

  function isBlueprintCreatePath(ctx) {
    const CDG = global.CreateCdGate;
    if (CDG && typeof CDG.isBlueprintPath === "function") return CDG.isBlueprintPath(ctx);
    return !!(ctx && ctx.blueprintCreateEnabled);
  }

  function isIsolatedCreatePath(ctx) {
    return isCdCreatePath(ctx) || isBlueprintCreatePath(ctx);
  }

  function stampCdPathOnDocument(d) {
    if (!d) return;
    if (!d.meta) d.meta = {};
    if (!d.page) d.page = {};
    d.meta.creativeDirectorCreateEnabled = true;
    d.page.createPath = "cd";
  }

  function applyCreateFlowToDocument(d, ctx) {
    if (!d || !ctx) return;
    if (!d.page) d.page = {};
    if (!d.sections) return;

    const cdPath = isCdCreatePath(ctx);
    const blueprintPath = isBlueprintCreatePath(ctx);
    const isolatedCreatePath = cdPath || blueprintPath;
    if (cdPath) stampCdPathOnDocument(d);

    const CBS = global.CreativeBriefState;
    if (cdPath && CBS && typeof CBS.initOnDocument === "function") {
      CBS.initOnDocument(d);
    }

    if (ctx.createBuildPlan) {
      try {
        d.page.createBuildPlan = JSON.parse(JSON.stringify(ctx.createBuildPlan));
      } catch (ePlanClone) {
        d.page.createBuildPlan = ctx.createBuildPlan;
      }
    }

    d.page.createFlow = buildCreateFlowSnapshot(ctx);

    const hasBuildPlan = !!(ctx && ctx.createBuildPlan);
    const SCE = global.SiteCompositionEngine;
    const useSce = !isolatedCreatePath && hasBuildPlan && SCE && typeof SCE.applyToDocument === "function";

    /* Isolerad create-väg: createSections sparas som metadata — scope låses av CD/Blueprint. */

    if (!useSce && !isolatedCreatePath) {
      const plan = resolvePlanFromCreateFlow(ctx, global.AISiteBuilder);
      if (plan) {
        ctx.plan = plan;
        d.page.goal = plan.goal;
        d.page.createFlowPlan = {
          goal: plan.goal,
          primaryCta: plan.primaryCta,
          secondaryCta: plan.secondaryCta,
          sectionOrder: plan.sectionOrder.slice(),
          cardIntents: plan.cardIntents.slice(),
        };

        const order = plan.sectionOrder.slice();
        if (order.length) {
          d.page.sectionOrder = order.slice();
          DOC_SECTION_IDS.forEach(function (id) {
            if (!d.sections[id]) return;
            d.sections[id].hidden = order.indexOf(id) === -1;
          });
        }
      }
      applySectionLabelsFromCreateFlow(d, ctx.createSections);
    }

    if (!isolatedCreatePath) {
      const genText = composeGenerationUserText(ctx);
      if (genText) {
        d.page.onboardingDescription = genText.slice(0, 600);
        d.page.createBusinessBrief = String(ctx.createBusinessBrief || genText).slice(0, 600);
      }
    }
    if (ctx.createBusinessName) {
      d.page.createBusinessName = String(ctx.createBusinessName).slice(0, 120);
    }
    if (ctx.createBusinessDescription) {
      d.page.createBusinessDescription = String(ctx.createBusinessDescription).slice(0, 600);
    }

    if (ctx.siteType) d.page.siteType = ctx.siteType;
    if (ctx.createSections && ctx.createSections.length) {
      d.page.createSections = ctx.createSections.map(function (s) {
        return { id: s.id, label: s.label };
      });
    }
    if (!isolatedCreatePath && ctx.createDesignStyle) {
      d.page.createDesignStyle = Object.assign({}, ctx.createDesignStyle);
      const familyId = CREATE_DESIGN_STYLE_FAMILY[ctx.createDesignStyle.id];
      if (familyId) d.page.createDesignStyleFamily = familyId;
    }
    if (ctx.createSiteGoals && ctx.createSiteGoals.length) {
      d.page.createSiteGoals = ctx.createSiteGoals.map(function (goal) {
        return Object.assign({}, goal);
      });
    }
    if (ctx.createExistingSite) {
      d.page.createExistingSite = Object.assign({}, ctx.createExistingSite);
      d.page.createSource = ctx.createExistingSite.id || "";
      if (ctx.createExistingSite.existingUrl) {
        d.page.existingSiteUrl = String(ctx.createExistingSite.existingUrl).slice(0, 256);
      }
    }

    if (useSce) {
      SCE.applyToDocument(d, ctx.createBuildPlan);
    }
  }

  function enrichFromBuildPlan(buildPlan, siteTypeAreas) {
    siteTypeAreas = siteTypeAreas || {};
    const AI = global.AISiteBuilder;
    const siteType = buildPlan && buildPlan.siteType ? buildPlan.siteType.id : "";
    const name = buildPlan ? String(buildPlan.businessName || "").trim() : "";
    const desc = buildPlan ? String(buildPlan.businessDescription || "").trim() : "";
    const brief =
      buildPlan && buildPlan.businessBrief
        ? String(buildPlan.businessBrief).trim()
        : [name, desc].filter(Boolean).join(". ");

    let ctx = {
      industry: "verksamhet",
      area: "other",
      brand: name,
      plan: null,
      siteType: siteType || "",
      createBuildPlan: buildPlan,
      createSections: buildPlan && buildPlan.sections ? buildPlan.sections.slice() : [],
      createBusinessName: name,
      createBusinessDescription: desc,
      createBusinessBrief: brief,
      createDesignStyle: buildPlan && buildPlan.designStyle ? buildPlan.designStyle : null,
      createSiteGoals: buildPlan && buildPlan.siteGoals ? buildPlan.siteGoals.slice() : [],
      createExistingSite: buildPlan && buildPlan.existingSite ? Object.assign({}, buildPlan.existingSite) : null,
    };

    if (AI && typeof AI.resolveCreateContext === "function") {
      ctx = Object.assign(
        ctx,
        AI.resolveCreateContext(brief, { businessBrief: brief, brand: name }),
      );
      ctx.createBuildPlan = buildPlan;
      ctx.createSections = buildPlan && buildPlan.sections ? buildPlan.sections.slice() : [];
      ctx.createBusinessName = name;
      ctx.createBusinessDescription = desc;
      ctx.createBusinessBrief = brief;
      ctx.createDesignStyle = buildPlan && buildPlan.designStyle ? buildPlan.designStyle : null;
      ctx.createSiteGoals = buildPlan && buildPlan.siteGoals ? buildPlan.siteGoals.slice() : [];
      ctx.createExistingSite = buildPlan && buildPlan.existingSite ? Object.assign({}, buildPlan.existingSite) : null;
      if (name) ctx.brand = name;
    }

    const SCE = global.SiteCompositionEngine;
    if (SCE && typeof SCE.resolveIndustryFromBuildPlan === "function") {
      ctx.industry = SCE.resolveIndustryFromBuildPlan(buildPlan, AI);
      if (AI && typeof AI.inferAreaFromIndustry === "function") {
        ctx.area = AI.inferAreaFromIndustry(ctx.industry);
      }
    } else if (ctx.industry === "konsult") {
      ctx.industry = "verksamhet";
    }

    ctx.siteType = siteType || "";
    ctx.createBuildPlan = buildPlan;

    const CDG = global.CreateCdGate;
    if (CDG && typeof CDG.enrichContext === "function") CDG.enrichContext(ctx);

    return ctx;
  }

  function enrichCreateContext(bizDesc, siteType, meta, siteTypeAreas) {
    const BP = global.CreateBuildPlan;
    if (BP && typeof BP.buildFromCreateMetadata === "function") {
      const buildPlan = BP.buildFromCreateMetadata(meta || {}, siteType || "");
      return enrichFromBuildPlan(buildPlan, siteTypeAreas);
    }

    meta = meta || {};
    siteTypeAreas = siteTypeAreas || {};
    const AI = global.AISiteBuilder;
    let ctx = {
      industry: "verksamhet",
      area: "other",
      brand: "",
      plan: null,
      siteType: siteType || "",
    };

    const name = String(meta.createBusinessName || "").trim();
    const desc = String(meta.createBusinessDescription || meta.createBusinessBrief || bizDesc || "").trim();
    const brief = [name, desc].filter(Boolean).join(". ");

    if (AI && typeof AI.resolveCreateContext === "function") {
      ctx = AI.resolveCreateContext(brief, { businessBrief: brief, brand: name });
    }

    const SCE = global.SiteCompositionEngine;
    if (SCE && typeof SCE.resolveIndustryFromBuildPlan === "function" && meta.createBuildPlan) {
      ctx.industry = SCE.resolveIndustryFromBuildPlan(meta.createBuildPlan, AI);
    } else {
      const areaKey = siteType && siteTypeAreas[siteType];
      if (areaKey && AI && typeof AI.inferIndustryWithinArea === "function") {
        ctx.area = areaKey;
        const within = AI.inferIndustryWithinArea(areaKey, brief);
        if (within.source === "description" && within.industry !== "konsult") {
          ctx.industry = within.industry;
        }
        ctx.area = within.area;
      }
      if (ctx.industry === "konsult") ctx.industry = "verksamhet";
    }

    ctx.siteType = siteType || "";
    ctx.createSections = meta.createSections || [];
    ctx.createBusinessName = name;
    ctx.createBusinessDescription = desc;
    ctx.createBusinessBrief = brief;
    if (name) ctx.brand = name;
    ctx.createDesignStyle = meta.createDesignStyle || null;
    ctx.createSiteGoals =
      BP && typeof BP.resolveDefaultSiteGoals === "function"
        ? BP.resolveDefaultSiteGoals(siteType)
        : [];
    ctx.createExistingSite = meta.createExistingSite || null;
    if (!global.CreateCdGate || !global.CreateCdGate.isEnabled || !global.CreateCdGate.isEnabled()) {
      ctx.plan = resolvePlanFromCreateFlow(ctx, AI);
    }

    const CDG = global.CreateCdGate;
    if (CDG && typeof CDG.enrichContext === "function") CDG.enrichContext(ctx);

    return ctx;
  }

  global.CreateFlowBridge = {
    CREATE_SITE_GOAL_TO_PLAN_ID: CREATE_SITE_GOAL_TO_PLAN_ID,
    CREATE_SECTION_TO_DOC: CREATE_SECTION_TO_DOC,
    CREATE_DESIGN_STYLE_FAMILY: CREATE_DESIGN_STYLE_FAMILY,
    mapCreateSectionsToDocumentOrder: mapCreateSectionsToDocumentOrder,
    resolvePlanFromCreateFlow: resolvePlanFromCreateFlow,
    buildCreateFlowSnapshot: buildCreateFlowSnapshot,
    composeGenerationUserText: composeGenerationUserText,
    applyCreateFlowToDocument: applyCreateFlowToDocument,
    isCdCreatePath: isCdCreatePath,
    enrichFromBuildPlan: enrichFromBuildPlan,
    enrichCreateContext: enrichCreateContext,
  };
})(typeof window !== "undefined" ? window : globalThis);
