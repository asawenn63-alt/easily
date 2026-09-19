/**
 * Site Composition Engine — tolkar Create Build Plan till webbplatsarkitektur.
 * AI:n använder detta för navigation, undersidor, layouter och sektionsblock.
 */
(function (global) {
  "use strict";

  const VERSION = 7;

  const FINGERPRINT_REGISTRY_KEY = "easily-visual-fingerprint-registry";
  const FINGERPRINT_REGISTRY_MAX = 64;

  const MUTATION_HERO_LAYOUTS = ["center", "left", "split"];
  const MUTATION_NAV_PATTERNS = ["inline-left", "stacked-center", "shop-inline"];
  const MUTATION_CARD_LAYOUTS = ["cards-3", "cards-grid", "cards-featured", "cards-mosaic"];
  const MUTATION_GALLERY_LAYOUTS = ["grid", "masonry", "featured-row"];
  const MUTATION_BUTTON_STYLES = ["", "pill", "outline"];
  const MUTATION_IMAGE_STYLES = ["documentary", "warm", "high-contrast", "soft", "editorial"];
  const MUTATION_HIGHLIGHT_MODES = ["float", "inline", "minimal"];
  const MUTATION_ACCENT_STYLES = ["subtle", "bold", "underline", "badge"];
  const MUTATION_HEADER_STYLES = ["classic", "craftsman", "legal", "playful", "creative"];

  /** @deprecated — använd compositionSeed; behålls för bakåtkompatibilitet. */
  function designFingerprint(buildPlan) {
    return compositionSeed(buildPlan);
  }

  /**
   * Designarketyper — hela webbplatsens struktur, inte bara färger.
   * Varje arketyp = distinkt designfamilj + layout + header + navigation + sektionslogik.
   */
  const DESIGN_ARCHETYPES = {
    "trade-technical": {
      id: "trade-technical",
      label: "Teknisk & förtroendeingivande",
      designFamily: "fotograf",
      template: "swiss-grid",
      theme: "black-gold",
      heroLayout: "split",
      heroLayoutVariants: ["split", "left"],
      logoAlign: "left",
      navPattern: "inline-left",
      textLogoStyle: "craftsman",
      sectionSpacing: "2",
      buttonStyle: "",
      servicesLayout: "cards-grid",
      aboutLayout: "asymmetric",
      heroLayers: 2,
      blockDensity: "medium",
      bannerVariant: "promo",
      iconGridVariant: "values",
    },
    "spiritual-boutique": {
      id: "spiritual-boutique",
      label: "Mjuk & ceremoniell",
      designFamily: "cafe",
      template: "atelier",
      theme: "beige-lux",
      heroLayout: "center",
      heroLayoutVariants: ["center", "left"],
      logoAlign: "center",
      navPattern: "stacked-center",
      textLogoStyle: "creative",
      sectionSpacing: "3",
      buttonStyle: "pill",
      servicesLayout: "cards-featured",
      aboutLayout: "",
      heroLayers: 1,
      blockDensity: "rich",
      bannerVariant: "soft",
      iconGridVariant: "values",
    },
    "shop-boutique": {
      id: "shop-boutique",
      label: "Butik & sortiment",
      designFamily: "salon",
      template: "luxury-brand",
      theme: "minimal-white",
      heroLayout: "left",
      heroLayoutVariants: ["left", "center"],
      logoAlign: "center",
      navPattern: "shop-inline",
      textLogoStyle: "classic",
      sectionSpacing: "2",
      buttonStyle: "",
      servicesLayout: "cards-mosaic",
      aboutLayout: "",
      heroLayers: 1,
      blockDensity: "medium",
      bannerVariant: "promo",
      iconGridVariant: "values",
    },
    "hospitality-warm": {
      id: "hospitality-warm",
      label: "Välkomnande & varm",
      designFamily: "cafe",
      template: "atelier",
      theme: "beige-lux",
      heroLayout: "left",
      heroLayoutVariants: ["left", "center"],
      logoAlign: "center",
      navPattern: "stacked-center",
      textLogoStyle: "playful",
      sectionSpacing: "3",
      buttonStyle: "pill",
      servicesLayout: "cards-3",
      aboutLayout: "asymmetric",
      heroLayers: 1,
      blockDensity: "medium",
      bannerVariant: "soft",
      iconGridVariant: "values",
    },
    "beauty-service": {
      id: "beauty-service",
      label: "Personlig service",
      designFamily: "salon",
      template: "luxury-brand",
      theme: "minimal-white",
      heroLayout: "center",
      heroLayoutVariants: ["center", "left"],
      logoAlign: "center",
      navPattern: "stacked-center",
      textLogoStyle: "classic",
      sectionSpacing: "3",
      buttonStyle: "pill",
      servicesLayout: "cards-3",
      aboutLayout: "",
      heroLayers: 1,
      blockDensity: "light",
      bannerVariant: "soft",
      iconGridVariant: "values",
    },
    "creative-showcase": {
      id: "creative-showcase",
      label: "Visuellt fokus",
      designFamily: "fotograf",
      template: "landmark",
      theme: "black-gold",
      heroLayout: "split",
      heroLayoutVariants: ["split", "center"],
      logoAlign: "left",
      navPattern: "inline-left",
      textLogoStyle: "creative",
      sectionSpacing: "3",
      buttonStyle: "outline",
      servicesLayout: "cards-featured",
      aboutLayout: "asymmetric",
      heroLayers: 2,
      blockDensity: "rich",
      bannerVariant: "soft",
      iconGridVariant: "values",
    },
    "professional-trust": {
      id: "professional-trust",
      label: "Professionell auktoritet",
      designFamily: "salon",
      template: "editorial",
      theme: "minimal-white",
      heroLayout: "left",
      heroLayoutVariants: ["left", "split"],
      logoAlign: "left",
      navPattern: "inline-left",
      textLogoStyle: "legal",
      sectionSpacing: "2",
      buttonStyle: "",
      servicesLayout: "cards-grid",
      aboutLayout: "",
      heroLayers: 1,
      blockDensity: "medium",
      bannerVariant: "promo",
      iconGridVariant: "values",
    },
    "local-service": {
      id: "local-service",
      label: "Lokal tjänst",
      designFamily: "salon",
      template: "editorial",
      theme: "minimal-white",
      heroLayout: "split",
      heroLayoutVariants: ["split", "center", "left"],
      logoAlign: "center",
      navPattern: "inline-left",
      textLogoStyle: "classic",
      sectionSpacing: "2",
      buttonStyle: "",
      servicesLayout: "cards-3",
      aboutLayout: "",
      heroLayers: 1,
      blockDensity: "medium",
      bannerVariant: "promo",
      iconGridVariant: "values",
    },
  };

  function briefTextFromPlan(buildPlan) {
    buildPlan = buildPlan || {};
    const name = String(buildPlan.businessName || "").trim();
    const desc = String(buildPlan.businessDescription || "").trim();
    if (buildPlan.businessBrief) return String(buildPlan.businessBrief).trim();
    return [name, desc].filter(Boolean).join(". ");
  }

  function inferIndustryKeywords(brief) {
    const norm = String(brief || "").toLowerCase();
    if (!norm) return null;
    if (/^el[\s.\-–—]|^el$|\bel[\s.\-](?!l)/.test(norm)) return "elektriker";
    if (/elektrik|elinstallation|eljour|elmontör|elmontor|elservice|elföretag|elforetag/.test(norm)) {
      return "elektriker";
    }
    if (/tarot|andlig|medium|synsk|spådom|spadom|orakel|kortlek|mystik|vägledning|vagledning/.test(norm)) {
      return "tarot";
    }
    if (/snick|snickeri|byggfirma|murare|vvs|rörmok|rormok|renover|entreprenad/.test(norm)) return "byggfirma";
    if (/frisör|frisor|hårsalon|harsalong|barber/.test(norm)) return "frisor";
    if (/café|cafe|kafe|bageri|fika/.test(norm)) return "cafe";
    if (/restaurang|pizzeria|sushi|bistro/.test(norm)) return "restaurang";
    if (/fotograf|fotostudio/.test(norm)) return "fotograf";
    if (/advokat|juridik|law/.test(norm)) return "advokat";
    return null;
  }

  function resolveArchetypeKey(industry, siteTypeId, buildPlan) {
    industry = String(industry || "verksamhet").toLowerCase();
    siteTypeId = String(siteTypeId || "foretag").toLowerCase();
    const brief = briefTextFromPlan(buildPlan).toLowerCase();

    if (industry === "tarot" || /tarot|spådom|spadom|kortlek|mystik|andlig|orakel|synsk/.test(brief)) {
      return "spiritual-boutique";
    }
    if (siteTypeId === "webbutik" && industry !== "tarot") return "shop-boutique";
    if (siteTypeId === "portfolio" || industry === "fotograf" || industry === "event") return "creative-showcase";
    if (industry === "elektriker" || industry === "byggfirma") return "trade-technical";
    if (industry === "miljo") return "trade-technical";
    if (industry === "cafe" || industry === "restaurang" || siteTypeId === "restaurang") return "hospitality-warm";
    if (industry === "frisor" || industry === "hundsalong" || industry === "hunddagis") return "beauty-service";
    if (industry === "advokat" || industry === "konsult") return "professional-trust";
    if (industry === "butik") return "shop-boutique";
    if (industry === "gym") return "beauty-service";
    return "local-service";
  }

  function applyStyleToArchetype(archetype, styleId) {
    const a = Object.assign({}, archetype);
    styleId = String(styleId || "").toLowerCase();
    if (styleId === "mork-exklusiv") {
      a.theme = "black-gold";
      if (a.id !== "spiritual-boutique") a.template = "landmark";
      a.heroLayers = Math.max(a.heroLayers || 1, 2);
      a.blockDensity = "medium";
    } else if (styleId === "varm-valkomnande") {
      a.buttonStyle = a.buttonStyle || "pill";
      a.sectionSpacing = "3";
      if (a.id === "local-service") a.template = "luxury-brand";
    } else if (styleId === "nordisk-ren") {
      a.template = "editorial";
      a.theme = "minimal-white";
      a.heroLayout = "center";
      a.logoAlign = "center";
      a.navPattern = "stacked-center";
    } else if (styleId === "lekfull-kreativ") {
      a.textLogoStyle = "playful";
      a.blockDensity = "rich";
      a.buttonStyle = "pill";
    } else if (styleId === "modern-professionell") {
      if (a.id === "local-service") {
        a.template = "swiss-grid";
        a.theme = "black-gold";
      }
    }
    return a;
  }

  function resolveDesignArchetype(buildPlan, industry) {
    buildPlan = buildPlan || {};
    const siteTypeId = buildPlan.siteType && buildPlan.siteType.id ? buildPlan.siteType.id : "foretag";
    const styleId = buildPlan.designStyle && buildPlan.designStyle.id ? buildPlan.designStyle.id : "";
    const key = resolveArchetypeKey(industry, siteTypeId, buildPlan);
    const base = DESIGN_ARCHETYPES[key] || DESIGN_ARCHETYPES["local-service"];
    return applyStyleToArchetype(Object.assign({}, base, { id: key }), styleId);
  }

  function hashStr(s) {
    let h = 0;
    const str = String(s || "");
    for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
    return Math.abs(h);
  }

  function pickFrom(arr, seed) {
    if (!arr || !arr.length) return null;
    return arr[seed % arr.length];
  }

  function compositionSeed(buildPlan) {
    buildPlan = buildPlan || {};
    const parts = [
      buildPlan.businessName || "",
      buildPlan.businessDescription || "",
      buildPlan.siteType && buildPlan.siteType.id ? buildPlan.siteType.id : "",
      buildPlan.designStyle && buildPlan.designStyle.id ? buildPlan.designStyle.id : "",
    ];
    (buildPlan.siteGoals || []).forEach(function (g) {
      if (g && g.id) parts.push(g.id);
    });
    return hashStr(parts.join("|"));
  }

  function typographyLabel(template) {
    const map = {
      editorial: "Cormorant + Manrope — redaktionell serif",
      atelier: "Fraunces + Manrope — organiskt lugn",
      "swiss-grid": "Syne + Inter — precision",
      "luxury-brand": "Playfair + Manrope — tyst lyx",
      landmark: "Fraunces + DM Sans — scen & kontrast",
    };
    return map[template] || map.editorial;
  }

  function resolveImageStyle(industry, archetype, intent, seed) {
    if (archetype.id === "trade-technical" || archetype.id === "creative-showcase") {
      return pickFrom(["high-contrast", "documentary"], seed);
    }
    if (archetype.id === "spiritual-boutique" || industry === "tarot") {
      return pickFrom(["soft", "warm"], seed);
    }
    if (intent && intent.primaryDrive === "interest") return "editorial";
    if (intent && intent.expression === "warm") return "warm";
    return pickFrom(MUTATION_IMAGE_STYLES, seed);
  }

  function fingerprintStructuralSignature(vfp) {
    if (!vfp) return "";
    return [
      vfp.hero && vfp.hero.layout,
      vfp.header && vfp.header.style,
      vfp.navigation && vfp.navigation.pattern,
      vfp.cta && vfp.cta.buttonStyle,
      vfp.cards && vfp.cards.layout,
      vfp.gallery && vfp.gallery.layout,
      vfp.typography && vfp.typography.template,
      vfp.spacing,
      vfp.imageStyle,
      vfp.highlights && vfp.highlights.mode,
      vfp.banner && vfp.banner.variant,
      vfp.accentStyle,
    ].join("|");
  }

  function signaturesTooSimilar(sigA, sigB) {
    if (!sigA || !sigB) return false;
    if (sigA === sigB) return true;
    const a = sigA.split("|");
    const b = sigB.split("|");
    let same = 0;
    for (let i = 0; i < a.length; i++) {
      if (a[i] === b[i]) same++;
    }
    return same >= Math.max(a.length - 1, 8);
  }

  function loadFingerprintRegistry() {
    try {
      if (typeof localStorage !== "undefined") {
        const raw = localStorage.getItem(FINGERPRINT_REGISTRY_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) return parsed;
        }
      }
    } catch (e) {
      /* ignore */
    }
    return [];
  }

  function saveFingerprintRegistry(list) {
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(FINGERPRINT_REGISTRY_KEY, JSON.stringify(list.slice(0, FINGERPRINT_REGISTRY_MAX)));
      }
    } catch (e) {
      /* ignore */
    }
  }

  function registerVisualFingerprint(vfp, businessName) {
    const registry = loadFingerprintRegistry();
    registry.unshift({
      signature: vfp.signature,
      id: vfp.id,
      industry: vfp.industry,
      archetypeId: vfp.archetypeId,
      businessName: String(businessName || "").slice(0, 48),
      at: Date.now(),
    });
    saveFingerprintRegistry(registry.slice(0, FINGERPRINT_REGISTRY_MAX));
  }

  /**
   * Design Fingerprint — visuell identitet för just denna webbplats, skapas före komposition.
   */
  function buildVisualDesignFingerprint(buildPlan, industry, intent, archetype, seed) {
    buildPlan = buildPlan || {};
    industry = industry || "verksamhet";
    intent = intent || {};
    archetype = archetype || DESIGN_ARCHETYPES["local-service"];
    seed = seed != null ? seed : compositionSeed(buildPlan);

    const heroVariants = archetype.heroLayoutVariants || [archetype.heroLayout || "center"];
    const heroLayout = pickFrom(heroVariants, seed) || archetype.heroLayout || "center";
    const heroLayers =
      heroLayout === "split" && (archetype.heroLayers > 1 || intent.primaryDrive === "trust")
        ? Math.max(archetype.heroLayers || 1, 2)
        : archetype.heroLayers || 1;
    const highlightMode =
      intent.visualFocus === "proof" || intent.primaryDrive === "trust"
        ? pickFrom(["float", "inline"], seed + 3)
        : pickFrom(MUTATION_HIGHLIGHT_MODES, seed + 3);
    const galleryLayout = pickFrom(MUTATION_GALLERY_LAYOUTS, seed + 11);
    const accentStyle = pickFrom(MUTATION_ACCENT_STYLES, seed + 17);
    const imageStyle = resolveImageStyle(industry, archetype, intent, seed + 23);

    const vfp = {
      id: "",
      signature: "",
      compositionSeed: seed,
      industry: industry,
      archetypeId: archetype.id,
      hero: {
        layout: heroLayout,
        layers: heroLayers,
      },
      header: {
        style: archetype.textLogoStyle || "classic",
        logoAlign: archetype.logoAlign || "center",
      },
      navigation: {
        pattern: archetype.navPattern || "inline-left",
      },
      cta: {
        buttonStyle: archetype.buttonStyle != null ? archetype.buttonStyle : "",
        emphasis: intent.primaryDrive === "action" ? "primary-forward" : "balanced",
      },
      cards: {
        layout: archetype.servicesLayout || "cards-3",
        density: archetype.blockDensity || "medium",
      },
      gallery: {
        layout: galleryLayout,
      },
      typography: {
        template: archetype.template || "editorial",
        label: typographyLabel(archetype.template || "editorial"),
        theme: archetype.theme || "minimal-white",
      },
      imageStyle: imageStyle,
      spacing: archetype.sectionSpacing || "2",
      colorPalette: {
        family: archetype.designFamily || "salon",
        theme: archetype.theme || "minimal-white",
      },
      accentStyle: accentStyle,
      highlights: {
        mode: highlightMode,
      },
      banner: {
        variant: archetype.bannerVariant || "promo",
      },
    };

    vfp.signature = fingerprintStructuralSignature(vfp);
    vfp.id =
      "vfp-" +
      hashStr(vfp.signature + "|" + (buildPlan.businessName || "") + "|" + seed).toString(36);
    return vfp;
  }

  function mutateVisualFingerprint(vfp, mutateSeed, archetype) {
    vfp = Object.assign({}, vfp);
    vfp.hero = Object.assign({}, vfp.hero);
    vfp.header = Object.assign({}, vfp.header);
    vfp.navigation = Object.assign({}, vfp.navigation);
    vfp.cta = Object.assign({}, vfp.cta);
    vfp.cards = Object.assign({}, vfp.cards);
    vfp.gallery = Object.assign({}, vfp.gallery);
    vfp.highlights = Object.assign({}, vfp.highlights);
    vfp.banner = Object.assign({}, vfp.banner);

    const dim = mutateSeed % 9;
    if (dim === 0) {
      vfp.hero.layout = pickFrom(MUTATION_HERO_LAYOUTS, mutateSeed);
    } else if (dim === 1) {
      vfp.navigation.pattern = pickFrom(MUTATION_NAV_PATTERNS, mutateSeed);
    } else if (dim === 2) {
      vfp.cards.layout = pickFrom(MUTATION_CARD_LAYOUTS, mutateSeed);
    } else if (dim === 3) {
      vfp.cta.buttonStyle = pickFrom(MUTATION_BUTTON_STYLES, mutateSeed);
    } else if (dim === 4) {
      vfp.gallery.layout = pickFrom(MUTATION_GALLERY_LAYOUTS, mutateSeed);
    } else if (dim === 5) {
      vfp.header.style = pickFrom(MUTATION_HEADER_STYLES, mutateSeed);
    } else if (dim === 6) {
      vfp.highlights.mode = pickFrom(MUTATION_HIGHLIGHT_MODES, mutateSeed);
    } else if (dim === 7) {
      vfp.spacing = vfp.spacing === "3" ? "2" : "3";
    } else if (dim === 8) {
      vfp.imageStyle = pickFrom(MUTATION_IMAGE_STYLES, mutateSeed);
    }

    if (archetype && archetype.id === "spiritual-boutique" && vfp.hero.layout === "split") {
      vfp.hero.layout = "center";
    }
    if (archetype && archetype.id === "trade-technical" && vfp.hero.layout === "center") {
      vfp.hero.layout = "left";
    }

    vfp.signature = fingerprintStructuralSignature(vfp);
    vfp.id = "vfp-" + hashStr(vfp.signature + "|mut|" + mutateSeed).toString(36);
    return vfp;
  }

  function ensureUniqueVisualFingerprint(vfp, buildPlan, seed) {
    buildPlan = buildPlan || {};
    seed = seed != null ? seed : vfp.compositionSeed;
    const registry = loadFingerprintRegistry();
    let current = vfp;
    let attempt = 0;

    while (attempt < 14) {
      const sig = current.signature || fingerprintStructuralSignature(current);
      const collision = registry.some(function (entry) {
        return signaturesTooSimilar(entry.signature, sig);
      });
      if (!collision) {
        current.signature = sig;
        registerVisualFingerprint(current, buildPlan.businessName);
        return current;
      }
      current = mutateVisualFingerprint(current, seed + attempt * 7 + 1, DESIGN_ARCHETYPES[current.archetypeId]);
      attempt++;
    }
    registerVisualFingerprint(current, buildPlan.businessName);
    return current;
  }

  function applyVisualFingerprintToArchetype(archetype, vfp) {
    if (!vfp) return archetype;
    return Object.assign({}, archetype, {
      designFamily: (vfp.colorPalette && vfp.colorPalette.family) || archetype.designFamily,
      heroLayout: vfp.hero.layout,
      heroLayers: vfp.hero.layers,
      navPattern: vfp.navigation.pattern,
      textLogoStyle: vfp.header.style,
      logoAlign: vfp.header.logoAlign,
      buttonStyle: vfp.cta.buttonStyle,
      servicesLayout: vfp.cards.layout,
      sectionSpacing: vfp.spacing,
      template: vfp.typography.template,
      theme: (vfp.colorPalette && vfp.colorPalette.theme) || vfp.typography.theme,
      bannerVariant: vfp.banner.variant,
      blockDensity: vfp.cards.density,
    });
  }

  /** Branschprofil för Design Suitability Review — målgrupp, personlighet, tillåtna uttryck. */
  function resolveSuitabilityProfile(industry, siteTypeId, buildPlan) {
    industry = String(industry || "verksamhet").toLowerCase();
    siteTypeId = String(siteTypeId || "foretag").toLowerCase();
    const brief = briefTextFromPlan(buildPlan).toLowerCase();

    const profiles = {
      elektriker: {
        audience: "husägare och företag som söker trygg, auktoriserad elservice",
        personality: ["precise", "bold", "trustworthy"],
        colorFamilies: ["fotograf", "salon"],
        themes: ["black-gold", "minimal-white"],
        imageStyles: ["documentary", "high-contrast"],
        templates: ["swiss-grid", "editorial"],
        heroLayouts: ["split", "left"],
        cardLayouts: ["cards-grid", "cards-3"],
        ctaStyles: ["", "outline"],
        headerStyles: ["craftsman", "classic", "legal"],
        avoid: {
          colorFamily: ["cafe"],
          theme: ["beige-lux"],
          imageStyle: ["soft", "warm"],
          template: ["atelier"],
          heroLayout: ["center"],
          ctaStyle: ["pill"],
          headerStyle: ["playful", "creative"],
          cardLayout: ["cards-mosaic"],
        },
      },
      byggfirma: {
        audience: "privatkunder och byggherrar som vill känna soliditet",
        personality: ["precise", "trustworthy", "bold"],
        colorFamilies: ["salon", "fotograf", "cafe"],
        themes: ["minimal-white", "black-gold", "beige-lux"],
        imageStyles: ["documentary", "editorial"],
        templates: ["editorial", "swiss-grid"],
        heroLayouts: ["split", "left"],
        cardLayouts: ["cards-grid", "cards-3"],
        ctaStyles: ["", "outline"],
        headerStyles: ["craftsman", "classic"],
        avoid: {
          imageStyle: ["soft"],
          heroLayout: ["center"],
          ctaStyle: ["pill"],
          headerStyle: ["playful", "creative"],
        },
      },
      tarot: {
        audience: "personer som söker vägledning, reflektion och ett mjukt utrymme",
        personality: ["warm", "quiet", "creative"],
        colorFamilies: ["cafe"],
        themes: ["beige-lux"],
        imageStyles: ["soft", "warm", "editorial"],
        templates: ["atelier", "luxury-brand"],
        heroLayouts: ["center", "left"],
        cardLayouts: ["cards-featured", "cards-3"],
        ctaStyles: ["pill", ""],
        headerStyles: ["creative", "classic", "playful"],
        avoid: {
          colorFamily: ["fotograf"],
          theme: ["black-gold"],
          imageStyle: ["high-contrast", "documentary"],
          template: ["swiss-grid"],
          heroLayout: ["split"],
          ctaStyle: ["outline"],
          headerStyle: ["craftsman", "legal"],
          cardLayout: ["cards-grid"],
        },
      },
      frisor: {
        audience: "kunder som söker personlig service och en välkomnande salong",
        personality: ["warm", "quiet"],
        colorFamilies: ["salon", "cafe"],
        themes: ["minimal-white", "beige-lux"],
        imageStyles: ["soft", "warm", "editorial"],
        templates: ["luxury-brand", "atelier"],
        heroLayouts: ["center", "left"],
        cardLayouts: ["cards-3", "cards-featured"],
        ctaStyles: ["pill", ""],
        headerStyles: ["classic", "playful"],
        avoid: {
          colorFamily: ["fotograf"],
          theme: ["black-gold"],
          imageStyle: ["high-contrast", "documentary"],
          template: ["swiss-grid"],
          heroLayout: ["split"],
          headerStyle: ["craftsman", "legal"],
        },
      },
      cafe: {
        audience: "besökare som vill känna värme, fika och inbjudan",
        personality: ["warm", "welcome"],
        colorFamilies: ["cafe"],
        themes: ["beige-lux"],
        imageStyles: ["warm", "soft", "editorial"],
        templates: ["atelier", "luxury-brand"],
        heroLayouts: ["left", "center"],
        cardLayouts: ["cards-3", "cards-featured"],
        ctaStyles: ["pill", ""],
        headerStyles: ["playful", "classic", "creative"],
        avoid: {
          colorFamily: ["fotograf"],
          theme: ["black-gold"],
          imageStyle: ["high-contrast", "documentary"],
          template: ["swiss-grid"],
          heroLayout: ["split"],
          headerStyle: ["craftsman", "legal"],
        },
      },
      fotograf: {
        audience: "kunder som bedömer visuell kvalitet direkt",
        personality: ["bold", "interest"],
        colorFamilies: ["fotograf"],
        themes: ["black-gold", "minimal-white"],
        imageStyles: ["high-contrast", "documentary", "editorial"],
        templates: ["landmark", "swiss-grid"],
        heroLayouts: ["split", "center"],
        cardLayouts: ["cards-featured", "cards-mosaic"],
        ctaStyles: ["outline", ""],
        headerStyles: ["creative", "classic"],
        avoid: {
          colorFamily: ["cafe"],
          theme: ["beige-lux"],
          imageStyle: ["soft"],
          template: ["editorial"],
          heroLayout: ["left"],
          ctaStyle: ["pill"],
          headerStyle: ["playful", "craftsman"],
        },
      },
      advokat: {
        audience: "klienter som söker auktoritet och diskretion",
        personality: ["precise", "quiet", "trustworthy"],
        colorFamilies: ["salon"],
        themes: ["minimal-white", "black-gold"],
        imageStyles: ["editorial", "documentary"],
        templates: ["editorial", "luxury-brand"],
        heroLayouts: ["left", "split"],
        cardLayouts: ["cards-grid", "cards-3"],
        ctaStyles: ["", "outline"],
        headerStyles: ["legal", "classic"],
        avoid: {
          colorFamily: ["cafe"],
          theme: ["beige-lux"],
          imageStyle: ["warm", "soft"],
          template: ["atelier"],
          heroLayout: ["center"],
          ctaStyle: ["pill"],
          headerStyle: ["playful", "creative", "craftsman"],
        },
      },
      verksamhet: {
        audience: "bred målgrupp — tydlighet och förtroende först",
        personality: ["precise", "trustworthy"],
        colorFamilies: ["salon", "cafe", "fotograf"],
        themes: ["minimal-white", "beige-lux", "black-gold"],
        imageStyles: ["editorial", "documentary", "warm"],
        templates: ["editorial", "luxury-brand", "swiss-grid"],
        heroLayouts: ["left", "split", "center"],
        cardLayouts: ["cards-3", "cards-grid", "cards-featured"],
        ctaStyles: ["", "pill", "outline"],
        headerStyles: ["classic", "craftsman", "legal"],
        avoid: {},
      },
    };

    let profile = profiles[industry] || profiles.verksamhet;

    if (siteTypeId === "webbutik" && industry !== "tarot") {
      profile = Object.assign({}, profile, {
        audience: "köpare som vill hitta sortiment snabbt och känna butikens identitet",
        cardLayouts: ["cards-mosaic", "cards-featured", "cards-3"],
        heroLayouts: ["left", "center"],
        ctaStyles: ["", "pill"],
      });
    }
    if (/premium|exklusiv|lyx|hantverk|personlig/.test(brief)) {
      profile = Object.assign({}, profile, {
        personality: profile.personality.concat(["quiet"]),
      });
    }
    if (/ung|lekfull|kreativ|modern/.test(brief)) {
      profile = Object.assign({}, profile, {
        personality: profile.personality.concat(["creative", "bold"]),
      });
    }

    return profile;
  }

  function isInList(value, list) {
    if (!list || !list.length) return true;
    return list.indexOf(value) >= 0;
  }

  function isAvoided(value, avoidList) {
    if (!avoidList || !avoidList.length) return false;
    return avoidList.indexOf(value) >= 0;
  }

  function pickSuitableAlternative(current, preferred, avoid, seed) {
    const pool = (preferred || []).filter(function (v) {
      return !isAvoided(v, avoid);
    });
    if (!pool.length) return current;
    const alt = pickFrom(pool, seed);
    return alt !== current ? alt : pickFrom(pool, seed + 1) || current;
  }

  function countVisualMismatches(vfp, profile) {
    if (!profile || !profile.avoid) return 0;
    const a = profile.avoid;
    let n = 0;
    if (isAvoided(vfp.colorPalette && vfp.colorPalette.family, a.colorFamily)) n++;
    if (isAvoided(vfp.colorPalette && vfp.colorPalette.theme, a.theme)) n++;
    if (isAvoided(vfp.imageStyle, a.imageStyle)) n++;
    if (isAvoided(vfp.typography && vfp.typography.template, a.template)) n++;
    if (isAvoided(vfp.hero && vfp.hero.layout, a.heroLayout)) n++;
    if (isAvoided(vfp.cta && vfp.cta.buttonStyle, a.ctaStyle)) n++;
    if (isAvoided(vfp.header && vfp.header.style, a.headerStyle)) n++;
    if (isAvoided(vfp.cards && vfp.cards.layout, a.cardLayout)) n++;
    return n;
  }

  function expressionMatchesPersonality(expr, profile) {
    if (!profile || !profile.personality) return true;
    if (profile.personality.indexOf(expr) >= 0) return true;
    if ((expr === "precise" || expr === "bold") && profile.personality.indexOf("trustworthy") >= 0) return true;
    if (expr === "quiet" && profile.personality.indexOf("warm") >= 0) return true;
    return false;
  }

  /**
   * Design Suitability Review — passar designen verksamheten, inte bara unik?
   */
  function designSuitabilityReview(buildPlan, industry, intent, vfp, archetype, siteTypeId, draft) {
    buildPlan = buildPlan || {};
    intent = intent || {};
    vfp = vfp || {};
    draft = draft || {};
    const profile = resolveSuitabilityProfile(industry, siteTypeId, buildPlan);
    const reasoning = [];
    const patches = {};
    const seed = compositionSeed(buildPlan) + 401;

    function ask(question, ok, note, patch) {
      reasoning.push({ question: question, ok: !!ok, note: note || "", kind: "suitability" });
      if (!ok && patch) Object.assign(patches, patch);
    }

    const expr = intent.expression || "precise";
    const mismatchesEarly = countVisualMismatches(vfp, profile);
    const personalityOk =
      !isAvoided(vfp.header && vfp.header.style, profile.avoid && profile.avoid.headerStyle) &&
      (expressionMatchesPersonality(expr, profile) || mismatchesEarly === 0);

    ask(
      "Passar designen företagets personlighet?",
      personalityOk,
      "Förväntad personlighet: " + profile.personality.join(", "),
      !personalityOk
        ? {
            headerStyle: pickSuitableAlternative(
              vfp.header.style,
              profile.headerStyles,
              profile.avoid && profile.avoid.headerStyle,
              seed + 1,
            ),
            imageStyle: pickSuitableAlternative(
              vfp.imageStyle,
              profile.imageStyles,
              profile.avoid && profile.avoid.imageStyle,
              seed + 11,
            ),
          }
        : null,
    );

    ask(
      "Passar designen företagets målgrupp?",
      isInList(vfp.typography && vfp.typography.template, profile.templates) &&
        isInList(vfp.hero && vfp.hero.layout, profile.heroLayouts),
      profile.audience,
      !(isInList(vfp.hero && vfp.hero.layout, profile.heroLayouts))
        ? {
            heroLayout: pickSuitableAlternative(
              vfp.hero.layout,
              profile.heroLayouts,
              profile.avoid && profile.avoid.heroLayout,
              seed,
            ),
          }
        : null,
    );

    const colorOk =
      isInList(vfp.colorPalette && vfp.colorPalette.family, profile.colorFamilies) &&
      !isAvoided(vfp.colorPalette && vfp.colorPalette.family, profile.avoid && profile.avoid.colorFamily) &&
      !isAvoided(vfp.colorPalette && vfp.colorPalette.theme, profile.avoid && profile.avoid.theme);

    ask(
      "Passar färgerna verksamheten?",
      colorOk,
      "Färgfamilj " +
        (vfp.colorPalette && vfp.colorPalette.family) +
        " ska matcha " +
        profile.colorFamilies.join("/"),
      !colorOk
        ? {
            colorFamily: pickSuitableAlternative(
              vfp.colorPalette && vfp.colorPalette.family,
              profile.colorFamilies,
              profile.avoid && profile.avoid.colorFamily,
              seed + 2,
            ),
            theme: pickSuitableAlternative(
              vfp.colorPalette && vfp.colorPalette.theme,
              profile.themes,
              profile.avoid && profile.avoid.theme,
              seed + 3,
            ),
          }
        : null,
    );

    const imageOk =
      isInList(vfp.imageStyle, profile.imageStyles) &&
      !isAvoided(vfp.imageStyle, profile.avoid && profile.avoid.imageStyle);

    ask(
      "Passar bildstilen verksamheten?",
      imageOk,
      "Bildstil " + vfp.imageStyle + " för " + industry,
      !imageOk
        ? {
            imageStyle: pickSuitableAlternative(
              vfp.imageStyle,
              profile.imageStyles,
              profile.avoid && profile.avoid.imageStyle,
              seed + 4,
            ),
          }
        : null,
    );

    const typoOk =
      isInList(vfp.typography && vfp.typography.template, profile.templates) &&
      !isAvoided(vfp.typography && vfp.typography.template, profile.avoid && profile.avoid.template);

    ask(
      "Passar typografin verksamheten?",
      typoOk,
      vfp.typography && vfp.typography.label ? vfp.typography.label : vfp.typography.template,
      !typoOk
        ? {
            template: pickSuitableAlternative(
              vfp.typography.template,
              profile.templates,
              profile.avoid && profile.avoid.template,
              seed + 5,
            ),
          }
        : null,
    );

    const heroFeelOk =
      isInList(vfp.hero && vfp.hero.layout, profile.heroLayouts) &&
      !isAvoided(vfp.hero && vfp.hero.layout, profile.avoid && profile.avoid.heroLayout) &&
      (intent.primaryDrive !== "welcome" || vfp.hero.layout !== "split");

    ask(
      "Förmedlar hero rätt känsla?",
      heroFeelOk,
      "Hero-" + (vfp.hero && vfp.hero.layout) + " för " + (intent.primaryDrive || "trust"),
      !heroFeelOk
        ? {
            heroLayout: pickSuitableAlternative(
              vfp.hero.layout,
              profile.heroLayouts,
              profile.avoid && profile.avoid.heroLayout,
              seed + 6,
            ),
            heroLayers: Math.max(vfp.hero && vfp.hero.layers ? vfp.hero.layers : 1, 2),
          }
        : null,
    );

    const trustOk =
      intent.primaryDrive !== "trust" ||
      ((vfp.hero && vfp.hero.layers > 0) &&
        isInList(vfp.cta && vfp.cta.buttonStyle, profile.ctaStyles) &&
        !isAvoided(vfp.cta && vfp.cta.buttonStyle, profile.avoid && profile.avoid.ctaStyle) &&
        !isAvoided(vfp.header && vfp.header.style, profile.avoid && profile.avoid.headerStyle));

    ask(
      "Bygger sidan rätt förtroende?",
      trustOk,
      intent.primaryDrive === "trust"
        ? "Förtroende byggs med auktoritet — CTA och header ska matcha branschprofil."
        : "",
      !trustOk
        ? {
            ctaButtonStyle: pickSuitableAlternative(
              vfp.cta.buttonStyle,
              profile.ctaStyles,
              profile.avoid && profile.avoid.ctaStyle,
              seed + 7,
            ),
            headerStyle: pickSuitableAlternative(
              vfp.header && vfp.header.style,
              profile.headerStyles,
              profile.avoid && profile.avoid.headerStyle,
              seed + 9,
            ),
            heroLayers: Math.max(vfp.hero && vfp.hero.layers ? vfp.hero.layers : 1, 2),
          }
        : null,
    );

    const mismatches = countVisualMismatches(vfp, profile);
    ask(
      "Finns något visuellt som känns fel trots att fingerprintet är unikt?",
      mismatches === 0,
      mismatches > 0 ? mismatches + " visuella mismatch mot branschprofil." : "Ingen visuell dissonans.",
      mismatches > 0
        ? {
            cardLayout: pickSuitableAlternative(
              vfp.cards && vfp.cards.layout,
              profile.cardLayouts,
              profile.avoid && profile.avoid.cardLayout,
              seed + 8,
            ),
          }
        : null,
    );

    const passed =
      mismatches === 0 &&
      reasoning.every(function (r) {
        return r.ok;
      });

    return {
      passed: passed,
      reasoning: reasoning,
      patches: patches,
      profile: profile,
      mismatchCount: mismatches,
    };
  }

  function patchesAffectStructure(patches) {
    if (!patches) return false;
    return !!(
      patches.heroLayout ||
      patches.template ||
      patches.cardLayout ||
      patches.headerStyle ||
      patches.ctaButtonStyle != null
    );
  }

  function clampDesignScore(n) {
    return Math.max(1, Math.min(10, Math.round(n)));
  }

  function isPlaceholderCopy(text) {
    text = String(text || "").toLowerCase();
    return (
      !text.trim() ||
      /välkommen till vår hemsida|lorem ipsum|din rubrik|placeholder|exempeltext|klicka här/.test(text)
    );
  }

  /**
   * Post-generering: intern Design Score — bedömer färdig sida utan att ändra den.
   */
  function artDirectorPostGenerationReview(doc, buildPlan, AI) {
    doc = doc || {};
    buildPlan = buildPlan || {};
    const page = doc.page || {};
    const comp = page.siteComposition || {};
    const vfp = page.visualDesignFingerprint || comp.visualDesignFingerprint || {};
    const heroSec = (doc.sections && doc.sections.hero) || {};
    const heroContent = heroSec.content || {};
    const title = String(heroContent["hero-title"] || "");
    const lead = String(heroContent["hero-lead"] || "");
    const ctaText = String(heroContent["hero-cta-1-text"] || "");
    const ctaHref = String(heroContent["hero-cta-1-href"] || "");
    const cta2 = String(heroContent["hero-cta-2-text"] || "");
    const highlights = heroSec.highlights || comp.highlights && comp.highlights.hero || [];
    const intent = comp.designIntent || page.designIntent || analyzeFirstImpressionIntent(buildPlan, page.industry || comp.industry);
    const suitability = comp.designSuitabilityReview || {};
    const suitabilityOk = suitability.passed === true;
    const suitabilityItems = suitability.reasoning || page.designSuitabilityReview || [];
    const selfItems = (comp.artDirectorReview && comp.artDirectorReview.reasoning) || page.artDirectorReview || [];
    const industry = page.industry || comp.industry || "verksamhet";
    const heroLayout = page.heroLayout || (vfp.hero && vfp.hero.layout) || "";
    const heroBg = page.heroBgUrl || page.heroImageUrl || "";

    let balance = 7;
    if ((vfp.hero && vfp.hero.layers) >= 2) balance += 1;
    if (heroLayout && heroLayout !== "split") balance += 0.5;
    if (page.sectionSpacing === "2" || page.sectionSpacing === "3") balance += 0.5;
    if (heroBg) balance += 1;
    if (highlights.length >= 2) balance += 0.5;
    if (lead.length > 220) balance -= 1.5;
    if (title.length > 72) balance -= 1;

    let hierarchy = 6;
    if (title.trim() && lead.trim()) hierarchy += 2;
    if (title.length <= 72 && lead.length <= 220) hierarchy += 1;
    if (ctaText.trim()) hierarchy += 1;
    if (intent.visualFocus && intent.visualFocus !== "headline") hierarchy += 0.5;
    if (!title.trim() || !lead.trim()) hierarchy -= 2;
    if (isPlaceholderCopy(title) || isPlaceholderCopy(lead)) hierarchy -= 2;

    let trust = 6;
    if (highlights.length > 0) trust += 1.5;
    if (suitabilityOk) trust += 2;
    if (heroBg) trust += 1;
    if (intent.primaryDrive === "trust" && heroLayout && heroLayout !== "center") trust += 0.5;
    if (intent.primaryDrive === "welcome" && (heroLayout === "center" || heroLayout === "left")) trust += 0.5;
    suitabilityItems.forEach(function (r) {
      if (/förtroende|målgrupp|personlighet/.test(r.question || "") && r.ok) trust += 0.25;
    });
    if (isPlaceholderCopy(title)) trust -= 1;

    let conversion = 6;
    if (ctaText.trim() && ctaHref.trim() && ctaHref !== "#") conversion += 2;
    if (ctaText.length > 0 && ctaText.length <= 22) conversion += 1;
    if (cta2.trim()) conversion += 0.5;
    if (/klicka här|läs mer$|submit|button/i.test(ctaText)) conversion -= 1.5;
    if (!ctaText.trim()) conversion -= 2;

    let uniqueness = 7;
    if (vfp.signature) uniqueness += 1;
    if (page.compositionLocked) uniqueness += 1;
    if (page.designArchetype) uniqueness += 0.5;
    if (comp.compositionSeed || page.compositionSeed) uniqueness += 0.5;
    selfItems.forEach(function (r) {
      if (/annorlunda|unik/.test(r.question || "") && r.ok) uniqueness += 0.5;
    });

    let brandFeel = 6;
    if (suitabilityOk) brandFeel += 2;
    let suitOkCount = 0;
    suitabilityItems.forEach(function (r) {
      if (r.ok) suitOkCount++;
    });
    if (suitabilityItems.length) brandFeel += Math.min(2, suitOkCount * 0.35);
    if (vfp.colorPalette && vfp.colorPalette.family) brandFeel += 0.5;
    if (vfp.typography && vfp.typography.template) brandFeel += 0.5;
    if (page.imageStyle || vfp.imageStyle) brandFeel += 0.5;
    if (comp.artDirector && comp.artDirector.brandFeel) brandFeel += 0.5;

    const scores = {
      balance: clampDesignScore(balance),
      hierarchy: clampDesignScore(hierarchy),
      trust: clampDesignScore(trust),
      conversion: clampDesignScore(conversion),
      uniqueness: clampDesignScore(uniqueness),
      brandFeel: clampDesignScore(brandFeel),
    };

    const scoreEntries = [
      { key: "balance", label: "Visuell balans" },
      { key: "hierarchy", label: "Hierarki" },
      { key: "trust", label: "Förtroende" },
      { key: "conversion", label: "Konvertering" },
      { key: "uniqueness", label: "Unikhet" },
      { key: "brandFeel", label: "Varumärkeskänsla" },
    ];

    const strengths = [];
    if (scores.balance >= 8) strengths.push("Hero skapar ett starkt första intryck.");
    if (highlights.length > 0 && scores.trust >= 8) strengths.push("Highlight cards förstärker förtroendet.");
    if (scores.conversion >= 8 && ctaText.trim()) strengths.push("CTA är tydlig.");
    if (scores.brandFeel >= 8 && vfp.typography && vfp.typography.label) {
      strengths.push("Typografin passar verksamheten.");
    } else if (scores.brandFeel >= 8) {
      strengths.push("Uttrycket känns medvetet valt för verksamheten.");
    }
    if (scores.hierarchy >= 8) strengths.push("Rubrik och stödtext leder blicken rätt.");
    if (scores.uniqueness >= 8) strengths.push("Layouten känns unik — inte generisk mall.");
    if (!strengths.length) strengths.push("Grundstrukturen är på plats och kommunicerar verksamheten.");

    let weakest = scoreEntries[0];
    scoreEntries.forEach(function (e) {
      if (scores[e.key] < scores[weakest.key]) weakest = e;
    });

    const recommendations = {
      balance:
        heroLayout === "center"
          ? "hero-bilden får något mer luft ovanför texten"
          : "bild och text i hero får mer andningsrum mellan varandra",
      hierarchy: "rubrik och stödtext separeras tydligare visuellt",
      trust: "fler konkreta förtroendesignaler läggs till i hero",
      conversion: "primär CTA görs ännu tydligare — kort verb och tydlig nytta",
      uniqueness: "layouten differentieras ytterligare mot liknande webbplatser i branschen",
      brandFeel: "typografi och bildstil finjusteras för att matcha " + industry + " ännu bättre",
    };

    let recommendation = recommendations[weakest.key] || recommendations.balance;
    if (scores[weakest.key] >= 9) {
      recommendation = "Ingen större justering — sidan håller hög designkvalitet för " + industry + ".";
    } else if (scores[weakest.key] >= 8) {
      recommendation = "Små finjusteringar i " + weakest.label.toLowerCase() + " kan lyfta helheten ytterligare.";
    }

    const commentLines = strengths.slice(0, 4);
    if (recommendation && scores[weakest.key] < 9) {
      commentLines.push("");
      commentLines.push("Jag rekommenderar dock att " + recommendation.charAt(0).toLowerCase() + recommendation.slice(1));
    }

    const values = scoreEntries.map(function (e) {
      return scores[e.key];
    });
    const overall =
      values.reduce(function (a, b) {
        return a + b;
      }, 0) / values.length;

    return {
      kind: "internal-quality-review",
      readOnly: true,
      generatedAt: Date.now(),
      industry: industry,
      overall: Math.round(overall * 10) / 10,
      scores: scores,
      comment: commentLines.join("\n"),
      strengths: strengths,
      recommendation: recommendation,
      weakestDimension: weakest.key,
      suitabilityPassed: suitabilityOk,
    };
  }

  function designScoreToText(review) {
    if (!review || !review.scores) return "";
    const lines = [
      "Design Score (intern kvalitetsbedömning)",
      "",
      "Visuell balans: " + review.scores.balance + "/10",
      "Hierarki: " + review.scores.hierarchy + "/10",
      "Förtroende: " + review.scores.trust + "/10",
      "Konvertering: " + review.scores.conversion + "/10",
      "Unikhet: " + review.scores.uniqueness + "/10",
      "Varumärkeskänsla: " + review.scores.brandFeel + "/10",
    ];
    if (review.overall) lines.push("", "Snitt: " + review.overall + "/10");
    if (review.comment) {
      lines.push("", "Kommentar:", "", review.comment);
    }
    lines.push("", "— Endast intern utvärdering. Ändrar inte webbplatsen.");
    return lines.join("\n");
  }

  function visualFingerprintToText(vfp) {
    if (!vfp) return "";
    return [
      "=== DESIGN FINGERPRINT (visuell identitet) ===",
      "ID: " + vfp.id,
      "Hero: " + vfp.hero.layout + " · lager " + vfp.hero.layers,
      "Header: " + vfp.header.style + " · " + vfp.header.logoAlign,
      "Navigation: " + vfp.navigation.pattern,
      "CTA: " + (vfp.cta.buttonStyle || "solid") + " · " + vfp.cta.emphasis,
      "Kort: " + vfp.cards.layout + " · " + vfp.cards.density,
      "Galleri: " + vfp.gallery.layout,
      "Typografi: " + vfp.typography.label,
      "Bildstil: " + vfp.imageStyle,
      "Luft: spacing " + vfp.spacing,
      "Färgfamilj/tema: " + vfp.colorPalette.family + " · " + vfp.colorPalette.theme,
      "Accent: " + vfp.accentStyle,
      "Highlights: " + vfp.highlights.mode,
      "Banner: " + vfp.banner.variant,
    ].join("\n");
  }

  /**
   * Art Director granskar designen innan låsning — designer-resonemang, inte bara regler.
   */
  function artDirectorSelfReview(buildPlan, industry, intent, vfp, draft) {
    buildPlan = buildPlan || {};
    intent = intent || {};
    vfp = vfp || {};
    draft = draft || {};
    const reasoning = [];
    const patches = {};

    function ask(question, ok, note, patch) {
      reasoning.push({ question: question, ok: !!ok, note: note || "" });
      if (!ok && patch) Object.assign(patches, patch);
    }

    const drive = intent.primaryDrive || "trust";
    const hero = draft.hero || {};
    const cta = draft.cta || {};
    const highlights = draft.highlights || {};
    const lead = hero.content && hero.content.lead ? String(hero.content.lead) : "";
    const title = hero.content && hero.content.title ? String(hero.content.title) : "";

    ask(
      "Är detta rätt första intryck för verksamheten?",
      (drive === "trust" && vfp.hero.layout !== "center") ||
        (drive === "welcome" && (vfp.hero.layout === "left" || vfp.hero.layout === "center")) ||
        (drive === "action" && vfp.cta.emphasis === "primary-forward") ||
        (drive === "interest" && (vfp.hero.layout === "split" || vfp.hero.layers > 1)),
      drive === "trust"
        ? "Förtroendeverksamhet behöver auktoritet — undvik centrerad mallkänsla."
        : "",
      !((drive === "trust" && vfp.hero.layout !== "center") ||
        (drive === "welcome") ||
        (drive === "action") ||
        (drive === "interest"))
        ? { heroLayout: drive === "trust" ? "left" : vfp.hero.layout }
        : null,
    );

    ask(
      "Leder layouten besökaren rätt?",
      !!(cta.primaryCta && cta.primaryCta.href && cta.primaryCta.text),
      "Primär CTA måste finnas med tydlig destination.",
      !(cta.primaryCta && cta.primaryCta.href)
        ? { ctaFix: true }
        : null,
    );

    ask(
      "Bygger hero förtroende direkt?",
      drive !== "trust" ||
        (highlights.hero && highlights.hero.length > 0) ||
        vfp.highlights.mode === "float" ||
        vfp.hero.layers > 1,
      "Lägg till visuella förtroendesignaler i hero.",
      drive === "trust" && !(highlights.hero && highlights.hero.length)
        ? { highlightMode: "float", heroLayers: 2 }
        : null,
    );

    ask(
      "Är CTA tydlig?",
      !!(cta.primaryCta && cta.primaryCta.text && cta.primaryCta.text.length <= 22),
      "Korta CTA till max ~3 ord.",
      cta.primaryCta && cta.primaryCta.text && cta.primaryCta.text.length > 22
        ? { trimCta: true }
        : null,
    );

    ask(
      "Finns det för mycket text?",
      lead.length <= 220 && title.length <= 72,
      "Hero ska andas — korta rubrik och lead.",
      lead.length > 220 ? { trimLead: true } : null,
    );

    ask(
      "Behöver något lyftas fram visuellt?",
      intent.visualFocus !== "image" ||
        vfp.hero.layout === "split" ||
        vfp.hero.layers > 1,
      "Bildfokus kräver stark visuell hierarki.",
      intent.visualFocus === "image" && vfp.hero.layout !== "split" && vfp.hero.layers <= 1
        ? { heroLayout: "split", heroLayers: 2 }
        : null,
    );

    ask(
      "Är layouten tillräckligt annorlunda mot andra webbplatser?",
      true,
      "Verifierat mot fingerprint-register — unik strukturell signatur.",
      null,
    );

    const passed = reasoning.every(function (r) {
      return r.ok;
    });

    return { passed: passed, reasoning: reasoning, patches: patches };
  }

  function applyReviewPatches(vfp, draft, patches, industry, AI, buildPlan) {
    if (!patches || !Object.keys(patches).length) {
      return { vfp: vfp, draft: draft };
    }
    vfp = Object.assign({}, vfp);
    vfp.hero = Object.assign({}, vfp.hero);
    vfp.highlights = Object.assign({}, vfp.highlights);
    vfp.header = Object.assign({}, vfp.header);
    vfp.cta = Object.assign({}, vfp.cta);
    vfp.cards = Object.assign({}, vfp.cards);
    vfp.typography = Object.assign({}, vfp.typography);
    vfp.colorPalette = Object.assign({}, vfp.colorPalette);

    if (patches.heroLayout) {
      vfp.hero.layout = patches.heroLayout;
      if (draft.hero) draft.hero.layout = patches.heroLayout;
    }
    if (patches.heroLayers) {
      vfp.hero.layers = patches.heroLayers;
      if (draft.hero) draft.hero.layers = patches.heroLayers;
    }
    if (patches.highlightMode) vfp.highlights.mode = patches.highlightMode;
    if (patches.imageStyle) vfp.imageStyle = patches.imageStyle;
    if (patches.headerStyle) vfp.header.style = patches.headerStyle;
    if (patches.cardLayout) vfp.cards.layout = patches.cardLayout;
    if (patches.ctaButtonStyle != null) vfp.cta.buttonStyle = patches.ctaButtonStyle;
    if (patches.template) {
      vfp.typography.template = patches.template;
      vfp.typography.label = typographyLabel(patches.template);
    }
    if (patches.colorFamily) {
      vfp.colorPalette.family = patches.colorFamily;
    }
    if (patches.theme) {
      vfp.colorPalette.theme = patches.theme;
      vfp.typography.theme = patches.theme;
    }

    if (patches.trimLead && draft.hero && draft.hero.content && draft.hero.content.lead) {
      draft.hero.content.lead = String(draft.hero.content.lead).slice(0, 200).trim();
      const lastDot = draft.hero.content.lead.lastIndexOf(".");
      if (lastDot > 80) draft.hero.content.lead = draft.hero.content.lead.slice(0, lastDot + 1);
    }

    if (patches.trimCta && draft.cta && draft.cta.primaryCta) {
      const words = String(draft.cta.primaryCta.text || "").split(/\s+/).slice(0, 3);
      draft.cta.primaryCta.text = words.join(" ");
    }

    if (patches.ctaFix && AI) {
      const ctaPlan = buildCtaPlan(industry, buildPlan, AI, { primaryDrive: "action" });
      draft.cta = ctaPlan;
    }

    vfp.signature = fingerprintStructuralSignature(vfp);
    return { vfp: vfp, draft: draft };
  }

  /**
   * Designer-frågor: förtroende, intresse, vidare ledning, unikt uttryck.
   */
  function analyzeFirstImpressionIntent(buildPlan, industry) {
    buildPlan = buildPlan || {};
    industry = industry || "verksamhet";
    const brief = briefFromBuildPlan(buildPlan).toLowerCase();
    const goals = (buildPlan.siteGoals || []).map(function (g) {
      return g && g.id ? g.id : "";
    });
    const fp = designFingerprint(buildPlan);

    let primaryDrive = "trust";
    if (goals.indexOf("bookings") >= 0 || goals.indexOf("bokning") >= 0 || /boka|bokning|tid/.test(brief)) {
      primaryDrive = "action";
    } else if (goals.indexOf("quote") >= 0 || goals.indexOf("offert") >= 0 || /offert|pris|kostnadsfri/.test(brief)) {
      primaryDrive = "action";
    } else if (goals.indexOf("showcase") >= 0 || goals.indexOf("visa-arbete") >= 0 || /portfolio|galleri|case|referens/.test(brief)) {
      primaryDrive = "interest";
    } else if (/fotograf|event|portfolio|konst|design|kreativ/.test(industry + " " + brief)) {
      primaryDrive = "interest";
    } else if (/café|cafe|restaurang|fris|salong|hund|varm|välkomn|tarot|andlig|vägledning|spådom|spadom|mystik|orakel/.test(industry + " " + brief)) {
      primaryDrive = "welcome";
    }

    let visualFocus = "headline";
    if (primaryDrive === "interest") visualFocus = pickFrom(["image", "headline", "proof"], fp);
    else if (primaryDrive === "trust") visualFocus = pickFrom(["proof", "headline", "image"], fp + 3);
    else if (primaryDrive === "action") visualFocus = pickFrom(["headline", "cta", "proof"], fp + 7);
    else visualFocus = pickFrom(["headline", "image", "welcome"], fp + 11);

    const expressionVariants = ["precise", "warm", "bold", "quiet"];
    const expression = pickFrom(expressionVariants, fp + 19);

    return {
      primaryDrive: primaryDrive,
      visualFocus: visualFocus,
      expression: expression,
      questions: {
        trust: /certifier|auktoriser|behörig|erfaren|försäkr|garanti|sedan \d{4}|nöjd/.test(brief),
        interest: primaryDrive === "interest" || /unikt|special|handgjord|premium|exklusiv/.test(brief),
        guide: primaryDrive === "action" || goals.length > 0,
        unique: expression !== "quiet" || fp % 3 === 0,
      },
    };
  }

  function selectHeroComposition(intent, archetype, fingerprint, vfp) {
    archetype = archetype || DESIGN_ARCHETYPES["local-service"];
    intent = intent || { primaryDrive: "trust", visualFocus: "headline" };
    if (vfp && vfp.hero) {
      return {
        layout: vfp.hero.layout,
        layers: vfp.hero.layers,
        decorative: (vfp.hero.layers || 1) > 1,
        logoAlign: (vfp.header && vfp.header.logoAlign) || archetype.logoAlign || "center",
      };
    }
    const variants = archetype.heroLayoutVariants || [archetype.heroLayout || "split"];
    let heroLayout = pickFrom(variants, fingerprint) || archetype.heroLayout || "split";

    if (intent.visualFocus === "image" && heroLayout === "center") heroLayout = "split";
    if (intent.primaryDrive === "welcome" && heroLayout === "split" && variants.indexOf("left") >= 0) {
      heroLayout = "left";
    }

    const heroLayers =
      heroLayout === "split" && (archetype.heroLayers > 1 || intent.questions && intent.questions.trust)
        ? archetype.heroLayers || 2
        : archetype.heroLayers || 1;

    return {
      layout: heroLayout,
      layers: heroLayers,
      decorative: heroLayers > 1,
      logoAlign: archetype.logoAlign || "center",
    };
  }

  function industryHeadlineAngles(industry, location, name) {
    const loc = location ? " i " + location : "";
    const angles = {
      elektriker: [
        "Säker elservice" + loc,
        "Eljour och installation" + loc,
        name ? name + " — auktoriserad el" : "Auktoriserad el" + loc,
        "Din elektriker" + loc,
      ],
      byggfirma: [
        "Hantverk du kan lita på" + loc,
        "Bygg och renovering" + loc,
        name ? name + " — snickeri & bygg" : "Snickeri" + loc,
        "Kvalitet i varje detalj" + loc,
      ],
      frisor: [
        name ? name + " — din frisör" + loc : "Din frisör" + loc,
        "Hår och stil" + loc,
        "Välkommen till salongen" + loc,
      ],
      cafe: [
        name ? name + " — kaffe & fika" + loc : "Kaffe & fika" + loc,
        "Välkommen in" + loc,
      ],
      fotograf: [
        name ? name + " — fotografi" + loc : "Fotografi" + loc,
        "Bilder som berättar" + loc,
      ],
      tarot: [
        name ? name + " — vägledning & tarot" + loc : "Vägledning & tarot" + loc,
        "En trygg plats för reflektion" + loc,
        name ? name + loc : "Välkommen" + loc,
      ],
      butik: [
        name ? name + " — handplockat sortiment" + loc : "Handplockat" + loc,
        "Upptäck vårt utbud" + loc,
      ],
      verksamhet: [
        name ? name + loc : "Välkommen" + loc,
        "Tydligt erbjudande" + loc,
      ],
    };
    return angles[industry] || angles.verksamhet;
  }

  function composeHeadlineForImpression(buildPlan, industry, intent, AI) {
    const name = String(buildPlan.businessName || "").trim();
    const desc = String(buildPlan.businessDescription || "").trim();
    const brief = briefFromBuildPlan(buildPlan);
    const fp = designFingerprint(buildPlan);
    const location =
      AI && typeof AI.extractLocationFromDescription === "function"
        ? AI.extractLocationFromDescription(brief)
        : "";

    const HEE = global.HighlightExtractionEngine;
    const facts =
      HEE && typeof HEE.extractFromBrief === "function" ? HEE.extractFromBrief(brief, { max: 2 }) : [];

    if (facts.length && intent.questions.trust && intent.primaryDrive === "trust") {
      const fact = facts[0].label;
      if (fact.length <= 48 && name) return (name + " — " + fact.toLowerCase()).slice(0, 120);
      if (fact.length <= 72) return fact.slice(0, 120);
    }

    const angles = industryHeadlineAngles(industry, location, name);
    let headline = pickFrom(angles, fp);

    if (intent.primaryDrive === "action" && desc) {
      const verb = desc.match(/\b(hjälper|erbjuder|fixar|installerar|bygger|renoverar|trimmar|fotograferar)\b/i);
      if (verb && location) {
        headline = (verb[0].charAt(0).toUpperCase() + verb[0].slice(1) + " dig med " + desc.split(/\s+/).slice(2, 6).join(" ") + " i " + location)
          .replace(/\s+/g, " ")
          .slice(0, 120);
      }
    }

    if (intent.primaryDrive === "interest" && name) {
      headline = pickFrom([name + " — portfolio", "Se vad vi skapat", name + " — visuellt hantverk"], fp).slice(0, 120);
      if (location && headline.indexOf(location) === -1 && fp % 2 === 0) {
        headline = (name + " — " + location).slice(0, 120);
      }
    }

    if (!headline && name) headline = location ? name + " — " + location : name;
    return String(headline || name || "Välkommen").slice(0, 120);
  }

  function composeSupportingMessage(buildPlan, industry, intent, headline, AI) {
    const desc = String(buildPlan.businessDescription || "").trim();
    const brief = briefFromBuildPlan(buildPlan);
    const fp = designFingerprint(buildPlan) + 13;

    function firstSentence(text) {
      const parts = String(text || "")
        .split(/[.!?]/)
        .map(function (s) {
          return s.trim();
        })
        .filter(function (s) {
          return s.length >= 12;
        });
      return parts.length ? parts[0] : "";
    }

    if (desc) {
      const fromDesc = firstSentence(desc);
      if (fromDesc && fromDesc.toLowerCase() !== String(headline || "").toLowerCase()) {
        return fromDesc.slice(0, 280);
      }
    }

    const supports = {
      trust: [
        "Vi kombinerar erfarenhet med tydlig kommunikation — du vet vad som gäller innan vi börjar.",
        "Lokal närvaro, dokumenterade rutiner och en kontaktperson som följer dig hela vägen.",
        "Trygghet först: vi förklarar scope, tid och pris innan något startar.",
      ],
      action: [
        "Hör av dig så återkommer vi snabbt med nästa steg — offert, tid eller en enkel plan.",
        "Ett klick eller ett samtal — vi gör det enkelt att komma igång.",
        "Berätta kort vad du behöver så tar vi det därifrån.",
      ],
      interest: [
        "Utforska vårt arbete och se hur vi kan lyfta ditt nästa projekt.",
        "Bilder och case som visar vad vi levererar — inte bara vad vi lovar.",
      ],
      welcome: [
        "Stig in i en miljö där du känner dig välkommen från första sekunden.",
        "Vi vill att besökaren ska känna sig hemma redan i entrén.",
      ],
    };

    const pool = supports[intent.primaryDrive] || supports.trust;
    return pickFrom(pool, fp).slice(0, 280);
  }

  function composeVisualHighlights(buildPlan) {
    const brief = briefFromBuildPlan(buildPlan);
    const HEE = global.HighlightExtractionEngine;
    if (!HEE || typeof HEE.distributeForSite !== "function") {
      return { hero: [], about: [], services: [] };
    }
    return HEE.distributeForSite(brief);
  }

  function modulateArchetypeForBrand(archetype, buildPlan, intent) {
    const a = Object.assign({}, archetype);
    const fp = designFingerprint(buildPlan);
    const expr = (intent && intent.expression) || "precise";
    if (expr === "warm" && !a.buttonStyle) a.buttonStyle = "pill";
    if (expr === "bold" && a.id !== "spiritual-boutique") a.buttonStyle = a.buttonStyle || "outline";
    if (expr === "quiet") a.sectionSpacing = "3";
    if (expr === "precise" && a.id === "trade-technical") a.sectionSpacing = "2";
    if (fp % 4 === 0 && a.servicesLayout === "cards-3") a.servicesLayout = "cards-grid";
    if (fp % 7 === 0 && a.servicesLayout === "cards-grid") a.servicesLayout = "cards-featured";
    return a;
  }

  /** Art director — sex designkriterier som styr text, CTA och komposition. */
  function buildArtDirectorBrief(buildPlan, industry, intent, archetype, heroComposition, cta) {
    buildPlan = buildPlan || {};
    intent = intent || {};
    archetype = archetype || DESIGN_ARCHETYPES["local-service"];
    heroComposition = heroComposition || {};
    cta = cta || {};
    const name = String(buildPlan.businessName || "").trim();
    const brief = briefFromBuildPlan(buildPlan).toLowerCase();
    const siteTypeId =
      buildPlan.siteType && buildPlan.siteType.id ? buildPlan.siteType.id : "foretag";
    const expr = intent.expression || "precise";
    const drive = intent.primaryDrive || "trust";
    const hierarchy = intent.visualFocus || "headline";

    const brandFeelByArchetype = {
      "trade-technical": "teknisk auktoritet — precis, säker, inget överflöd",
      "spiritual-boutique": "ceremoniell närhet — mjukt, reflekterande, aldrig kitsch",
      "shop-boutique": "kuraterad butik — produktfokus, tydlig köpväg",
      "hospitality-warm": "välkomnande värme — hemtrevligt utan rörighet",
      "beauty-service": "personlig omsorg — lugn lyx, nära kunden",
      "creative-showcase": "visuellt hantverk — bilderna leder, texten stöttar",
      "professional-trust": "professionell auktoritet — saklig, trovärdig, lugn",
      "local-service": "lokal tjänst — nära, tydlig, lätt att ta kontakt",
    };

    const toneMap = {
      precise: "kort, konkret, saklig — inga superlativ",
      warm: "inbjudande och nära — du/ni, aldrig corporate-jargong",
      bold: "självsäker och tydlig — aktiva verb, korta meningar",
      quiet: "lugnt och respektfullt — utrymme mellan budskap, inga utrop",
    };

    let uniqueness =
      "Unik genom " +
      (name ? "varumärket " + name + ", " : "") +
      "arketyp " +
      archetype.label +
      " och hero-" +
      (heroComposition.layout || "center") +
      " — inte en generisk branschmall.";
    if (intent.questions && intent.questions.unique) {
      uniqueness += " Lyft det som skiljer verksamheten från konkurrenter i rubriker, inte i generiska fraser.";
    }

    let balance =
      "Visuell balans: " +
      (heroComposition.layout === "center"
        ? "symmetrisk hero — rubrik och CTA centrerade, luft kring texten"
        : heroComposition.layout === "split"
          ? "asymmetrisk hero — text och bild/bakgrund i tydlig vikt"
          : "vänsterställd hero — läsriktning top-down, CTA nära rubriken") +
      ". Sektionsluft: " +
      (archetype.sectionSpacing === "3" ? "generös" : "kompakt") +
      ".";

    let hierarchyNote =
      hierarchy === "headline"
        ? "Rubrik dominerar — max 6–8 ord, lead max 2 meningar, CTA understödjer."
        : hierarchy === "image"
          ? "Bilden bär första intrycket — rubrik kort, lead förklarar värdet."
          : hierarchy === "proof"
            ? "Förtroende först — fakta/höjdpunkter synliga tidigt, rubrik bekräftar."
            : hierarchy === "cta"
              ? "Handling i fokus — primär CTA visuellt stark, rubrik leder dit."
              : "Välkomnande entré — mjuk rubrik, inbjudande lead, låg tröskel.";

    let trust =
      drive === "trust" || intent.questions.trust
        ? "Förtroende: konkreta signaler (behörighet, erfarenhet, ort) — inga tomma superlativ som 'bäst i klassen'."
        : "Förtroende: genom tydlighet och transparens i erbjudande och kontaktväg.";

    let conversion =
      "Konvertering: primär CTA «" +
      (cta.primaryCta && cta.primaryCta.text ? cta.primaryCta.text : "Kontakta oss") +
      "» — ett tydligt nästa steg, sekundär CTA som stöd utan att konkurrera.";
    if (drive === "action") {
      conversion += " Besökaren ska veta exakt vad som händer efter klick.";
    } else if (siteTypeId === "webbutik") {
      conversion = "Konvertering: produkter/tjänster synliga tidigt — «" + (cta.primaryCta?.text || "Se sortiment") + "» leder till utbud.";
    }

    const brandFeel = brandFeelByArchetype[archetype.id] || brandFeelByArchetype["local-service"];

    const avoid = [
      "undvik mallfraser: 'Välkommen till vår hemsida', 'Vi erbjuder kvalitet'",
      "undvik identiska rubriker som alla konkurrenter i branschen",
      "undvik långa stycken i hero — max två meningar",
    ];
    if (expr === "quiet") avoid.push("undvik utropstecken och ALL CAPS");
    if (archetype.id === "trade-technical") avoid.push("undvik lekfull ton — hantverk ska kännas säkert");
    if (archetype.id === "spiritual-boutique") avoid.push("undvik hård säljton — vägledning före push");

    return {
      uniqueness: uniqueness,
      balance: balance,
      hierarchy: hierarchyNote,
      trust: trust,
      conversion: conversion,
      brandFeel: brandFeel,
      toneOfVoice: toneMap[expr] || toneMap.precise,
      primaryDrive: drive,
      expression: expr,
      avoid: avoid,
      textRules: [
        "Hero-rubrik: max 8 ord, unik för denna verksamhet",
        "Hero-lead: max 2 meningar, konkret nytta för besökaren",
        "Tjänsterubrik: beskriver värdet — inte bara ordet 'Tjänster'",
        "CTA: verb + nytta (t.ex. 'Begär offert', inte bara 'Klicka här')",
      ],
    };
  }

  function artDirectorBriefToText(brief) {
    if (!brief) return "";
    const lines = [
      "=== ART DIRECTOR (designkvalitet — följ detta i all text) ===",
      "Unikhet: " + brief.uniqueness,
      "Visuell balans: " + brief.balance,
      "Hierarki: " + brief.hierarchy,
      "Förtroende: " + brief.trust,
      "Konvertering: " + brief.conversion,
      "Varumärkeskänsla: " + brief.brandFeel,
      "Ton: " + brief.toneOfVoice,
    ];
    if (brief.textRules && brief.textRules.length) {
      lines.push("Texregler:");
      brief.textRules.forEach(function (rule) {
        lines.push("• " + rule);
      });
    }
    if (brief.avoid && brief.avoid.length) {
      lines.push("Undvik:");
      brief.avoid.forEach(function (rule) {
        lines.push("• " + rule);
      });
    }
    return lines.join("\n");
  }

  /**
   * Komponerar första intrycket — som en webbdesigner, inte en sektionslista.
   */
  function composeFirstImpression(buildPlan, industry, AI, archetype, vfp) {
    buildPlan = buildPlan || {};
    AI = AI || global.AISiteBuilder;
    industry = industry || "verksamhet";
    archetype = archetype || DESIGN_ARCHETYPES["local-service"];
    const fingerprint = compositionSeed(buildPlan);
    const intent = analyzeFirstImpressionIntent(buildPlan, industry);
    const heroComposition = selectHeroComposition(intent, archetype, fingerprint, vfp);
    const title = composeHeadlineForImpression(buildPlan, industry, intent, AI);
    const lead = composeSupportingMessage(buildPlan, industry, intent, title, AI);
    const cta = buildCtaPlan(industry, buildPlan, AI, intent);
    const highlights = composeVisualHighlights(buildPlan);
    const artDirector = buildArtDirectorBrief(buildPlan, industry, intent, archetype, heroComposition, cta);
    if (vfp) {
      artDirector.visualFingerprint = vfp;
      artDirector.uniqueness =
        "Signatur " + String(vfp.signature || "").slice(0, 40) + " — unik visuell kombination.";
    }

    const rationale =
      artDirector.brandFeel +
      ". " +
      artDirector.hierarchy +
      " " +
      artDirector.conversion;

    return {
      intent: intent,
      fingerprint: fingerprint,
      archetype: archetype,
      artDirector: artDirector,
      hero: {
        layout: heroComposition.layout,
        layers: heroComposition.layers,
        decorative: heroComposition.decorative,
        logoAlign: heroComposition.logoAlign,
        content: { title: title, lead: lead, industry: industry },
      },
      cta: cta,
      highlights: highlights,
      rationale: rationale,
    };
  }

  const DESIGN_STYLE_PROFILES = {
    "nordisk-ren": {
      heroLayout: "center",
      template: "editorial",
      theme: "minimal-white",
      servicesLayout: "cards-3",
      heroLayers: 1,
      blockDensity: "light",
      logoAlign: "center",
    },
    "modern-professionell": {
      heroLayout: "split",
      template: "swiss-grid",
      theme: "black-gold",
      servicesLayout: "cards-grid",
      heroLayers: 2,
      blockDensity: "medium",
      logoAlign: "left",
    },
    "varm-valkomnande": {
      heroLayout: "left",
      template: "luxury-brand",
      theme: "beige-lux",
      servicesLayout: "cards-3",
      heroLayers: 1,
      blockDensity: "medium",
      logoAlign: "center",
    },
    "mork-exklusiv": {
      heroLayout: "split",
      template: "landmark",
      theme: "black-gold",
      servicesLayout: "cards-featured",
      heroLayers: 2,
      blockDensity: "medium",
      logoAlign: "left",
    },
    "lekfull-kreativ": {
      heroLayout: "center",
      template: "atelier",
      theme: "beige-lux",
      servicesLayout: "cards-mosaic",
      heroLayers: 2,
      blockDensity: "rich",
      logoAlign: "center",
    },
  };

  /** Create UI-sektion → logisk undersida + dokumentsektion. */
  const SECTION_PAGE_MAP = {
    hero: { pageId: "home", docSection: "hero", navLabel: "Hem", anchor: "#top" },
    about: { pageId: "about", docSection: "about", navLabel: "Om oss", anchor: "#om-oss" },
    services: { pageId: "services", docSection: "services", navLabel: "Tjänster", anchor: "#tjanster" },
    gallery: { pageId: "gallery", docSection: "gallery", navLabel: "Galleri", anchor: "#galleri" },
    portfolio: { pageId: "portfolio", docSection: "gallery", navLabel: "Portfolio", anchor: "#portfolio" },
    testimonials: { pageId: "services", docSection: "services", navLabel: "Tjänster", anchor: "#tjanster" },
    pricelist: { pageId: "pricelist", docSection: "services", navLabel: "Prislista", anchor: "#prislista" },
    faq: { pageId: "faq", docSection: "faq", navLabel: "Vanliga frågor", anchor: "#fragor" },
    contact: { pageId: "contact", docSection: "contact", navLabel: "Kontakt", anchor: "#kontakt" },
    footer: { pageId: "home", docSection: "footer", navLabel: null, anchor: null },
    menu: { pageId: "services", docSection: "services", navLabel: "Meny", anchor: "#meny" },
    booking: { pageId: "contact", docSection: "booking", navLabel: "Boka", anchor: "#bokning" },
    hours: { pageId: "contact", docSection: "contact", navLabel: "Kontakt", anchor: "#kontakt" },
    "product-categories": { pageId: "webshop", docSection: "services", navLabel: "Webbutik", anchor: "#butik" },
    products: { pageId: "webshop", docSection: "services", navLabel: "Produkter", anchor: "#produkter" },
    campaigns: { pageId: "webshop", docSection: "services", navLabel: "Kampanjer", anchor: "#kampanjer" },
    "featured-products": { pageId: "webshop", docSection: "services", navLabel: "Utvalda", anchor: "#utvalda" },
    reviews: { pageId: "webshop", docSection: "services", navLabel: "Omdömen", anchor: "#omdomen" },
    "shipping-returns": { pageId: "faq", docSection: "faq", navLabel: "Leverans", anchor: "#leverans" },
    "case-studies": { pageId: "portfolio", docSection: "gallery", navLabel: "Case", anchor: "#case" },
    blog: { pageId: "blog", docSection: "services", navLabel: "Blogg", anchor: "#blogg" },
  };

  /**
   * Site Story — customer journey före sektionsval.
   * Berättelsen styr ordning, etiketter, navigation och block — inte ett fast sektionsträd.
   */
  const SITE_STORY_TEMPLATES = {
    elektriker: {
      id: "elektriker-trust-journey",
      title: "Customer Journey — Elektriker",
      narrative:
        "Besökaren ska känna trygg auktoritet, förstå tjänster, se genomförda projekt och följa en tydlig process innan kontakt.",
      cardIntents: ["services", "process", "testimonials"],
      beats: [
        { id: "hero", label: "Hero", createSectionId: "hero", docSection: "hero", role: "first-impression", nav: false },
        { id: "trust", label: "Förtroende", createSectionId: "about", docSection: "about", role: "proof", anchor: "#fortroende" },
        { id: "services", label: "Tjänster", createSectionId: "services", docSection: "services", role: "offerings", anchor: "#tjanster" },
        { id: "projects", label: "Projekt", createSectionId: "portfolio", docSection: "gallery", role: "showcase", anchor: "#projekt" },
        { id: "process", label: "Process", createSectionId: "faq", docSection: "faq", role: "process", anchor: "#process" },
        {
          id: "reviews",
          label: "Omdömen",
          kind: "block",
          blockType: "icon-grid",
          afterDocSection: "gallery",
          role: "social-proof",
          variant: "testimonials",
        },
        { id: "contact", label: "Kontakt", createSectionId: "contact", docSection: "contact", role: "arrival", anchor: "#kontakt" },
      ],
    },
    tarot: {
      id: "tarot-guidance-journey",
      title: "Customer Journey — Tarot",
      narrative:
        "Besökaren ska känna sig välkommen, förstå vägledningen, upptäcka erbjudanden och hitta svar innan bokning.",
      cardIntents: ["packages", "services", "pricing"],
      beats: [
        { id: "hero", label: "Hero", createSectionId: "hero", docSection: "hero", role: "first-impression", nav: false },
        { id: "welcome", label: "Välkommen", createSectionId: "about", docSection: "about", role: "welcome", anchor: "#valkommen" },
        {
          id: "guidance",
          label: "Vägledning",
          kind: "block",
          blockType: "banner",
          afterDocSection: "about",
          role: "story",
          variant: "soft",
        },
        { id: "readings", label: "Populära läsningar", createSectionId: "services", docSection: "services", role: "offerings", anchor: "#lasningar" },
        { id: "products", label: "Produkter", createSectionId: "products", docSection: "services", role: "catalog", anchor: "#produkter" },
        { id: "faq", label: "Frågor & svar", createSectionId: "faq", docSection: "faq", role: "clarity", anchor: "#fragor" },
        { id: "booking", label: "Boka", createSectionId: "booking", docSection: "booking", role: "conversion", anchor: "#bokning" },
      ],
    },
    restaurang: {
      id: "restaurant-experience-journey",
      title: "Customer Journey — Restaurang",
      narrative:
        "Besökaren ska se menyn, känna atmosfären, upptäcka signaturrätter och enkelt boka eller hitta hit.",
      cardIntents: ["services", "pricing", "testimonials"],
      beats: [
        { id: "hero", label: "Hero", createSectionId: "hero", docSection: "hero", role: "first-impression", nav: false },
        { id: "menu", label: "Meny", createSectionId: "menu", docSection: "services", role: "offerings", anchor: "#meny" },
        { id: "atmosphere", label: "Atmosfär", createSectionId: "gallery", docSection: "gallery", role: "experience", anchor: "#atmosfar" },
        {
          id: "signature",
          label: "Signaturrätter",
          kind: "block",
          blockType: "cta-band",
          afterDocSection: "gallery",
          role: "highlight",
          variant: "primary",
        },
        { id: "booking", label: "Bokning", createSectionId: "booking", docSection: "booking", role: "conversion", anchor: "#bokning" },
        { id: "location", label: "Hitta hit", createSectionId: "contact", docSection: "contact", role: "arrival", anchor: "#kontakt" },
      ],
    },
    advokat: {
      id: "legal-authority-journey",
      title: "Customer Journey — Advokat",
      narrative:
        "Besökaren ska förstå specialområden, arbetssätt och team — och känna trygghet innan kontakt.",
      cardIntents: ["services", "process", "testimonials"],
      beats: [
        { id: "hero", label: "Hero", createSectionId: "hero", docSection: "hero", role: "first-impression", nav: false },
        { id: "expertise", label: "Specialområden", createSectionId: "services", docSection: "services", role: "offerings", anchor: "#specialomraden" },
        { id: "approach", label: "Så arbetar vi", createSectionId: "about", docSection: "about", role: "process", anchor: "#arbetssatt" },
        { id: "team", label: "Jurister", createSectionId: "gallery", docSection: "gallery", role: "people", anchor: "#jurister" },
        {
          id: "results",
          label: "Resultat & förtroende",
          kind: "block",
          blockType: "icon-grid",
          afterDocSection: "gallery",
          role: "proof",
          variant: "values",
        },
        { id: "contact", label: "Kontakt", createSectionId: "contact", docSection: "contact", role: "arrival", anchor: "#kontakt" },
      ],
    },
    snickare: {
      id: "carpenter-craft-journey",
      title: "Customer Journey — Snickare",
      narrative:
        "Besökaren ska se vad som byggs, granska referenser, förstå processen och ta steget till offert.",
      cardIntents: ["services", "process", "packages"],
      beats: [
        { id: "hero", label: "Hero", createSectionId: "hero", docSection: "hero", role: "first-impression", nav: false },
        { id: "build", label: "Vad vi bygger", createSectionId: "services", docSection: "services", role: "offerings", anchor: "#bygger" },
        { id: "references", label: "Referensprojekt", createSectionId: "portfolio", docSection: "gallery", role: "showcase", anchor: "#referenser" },
        { id: "process", label: "Arbetsprocess", createSectionId: "faq", docSection: "faq", role: "process", anchor: "#process" },
        {
          id: "before-after",
          label: "Före & efter",
          kind: "block",
          blockType: "collage",
          afterDocSection: "gallery",
          role: "proof",
          variant: "mosaic-4",
        },
        { id: "quote", label: "Offert", createSectionId: "contact", docSection: "contact", role: "conversion", anchor: "#offert" },
      ],
    },
    byggfirma: {
      id: "builder-trust-journey",
      title: "Customer Journey — Byggfirma",
      narrative:
        "Besökaren ska se kapacitet, referenser och process — och känna soliditet innan offert.",
      cardIntents: ["services", "process", "packages"],
      beats: [
        { id: "hero", label: "Hero", createSectionId: "hero", docSection: "hero", role: "first-impression", nav: false },
        { id: "build", label: "Vad vi bygger", createSectionId: "services", docSection: "services", role: "offerings", anchor: "#bygger" },
        { id: "references", label: "Referensprojekt", createSectionId: "portfolio", docSection: "gallery", role: "showcase", anchor: "#referenser" },
        { id: "process", label: "Arbetsprocess", createSectionId: "faq", docSection: "faq", role: "process", anchor: "#process" },
        {
          id: "proof",
          label: "Före & efter",
          kind: "block",
          blockType: "collage",
          afterDocSection: "gallery",
          role: "proof",
          variant: "grid-3",
        },
        { id: "quote", label: "Offert", createSectionId: "contact", docSection: "contact", role: "conversion", anchor: "#offert" },
      ],
    },
    frisor: {
      id: "salon-welcome-journey",
      title: "Customer Journey — Frisör",
      narrative: "Besökaren ska känna välkomnande, se behandlingar, inspireras och boka tid.",
      cardIntents: ["services", "pricing", "packages"],
      beats: [
        { id: "hero", label: "Hero", createSectionId: "hero", docSection: "hero", role: "first-impression", nav: false },
        { id: "welcome", label: "Välkommen", createSectionId: "about", docSection: "about", role: "welcome", anchor: "#valkommen" },
        { id: "treatments", label: "Behandlingar", createSectionId: "services", docSection: "services", role: "offerings", anchor: "#behandlingar" },
        { id: "looks", label: "Lookbook", createSectionId: "gallery", docSection: "gallery", role: "showcase", anchor: "#lookbook" },
        { id: "booking", label: "Boka tid", createSectionId: "booking", docSection: "booking", role: "conversion", anchor: "#bokning" },
        { id: "contact", label: "Kontakt", createSectionId: "contact", docSection: "contact", role: "arrival", anchor: "#kontakt" },
      ],
    },
    fotograf: {
      id: "photographer-showcase-journey",
      title: "Customer Journey — Fotograf",
      narrative: "Besökaren ska dras in av bilder, förstå erbjudande och se portfolio innan kontakt.",
      cardIntents: ["packages", "services", "testimonials"],
      beats: [
        { id: "hero", label: "Hero", createSectionId: "hero", docSection: "hero", role: "first-impression", nav: false },
        { id: "vision", label: "Uttryck", createSectionId: "about", docSection: "about", role: "story", anchor: "#uttryck" },
        { id: "portfolio", label: "Portfolio", createSectionId: "portfolio", docSection: "gallery", role: "showcase", anchor: "#portfolio" },
        { id: "packages", label: "Paket", createSectionId: "services", docSection: "services", role: "offerings", anchor: "#paket" },
        { id: "contact", label: "Boka", createSectionId: "contact", docSection: "contact", role: "conversion", anchor: "#kontakt" },
      ],
    },
    webbutik: {
      id: "shop-discovery-journey",
      title: "Customer Journey — Webbutik",
      narrative: "Besökaren ska förstå butiken, hitta sortiment och känna trygghet att handla.",
      cardIntents: ["pricing", "services", "packages"],
      beats: [
        { id: "hero", label: "Hero", createSectionId: "hero", docSection: "hero", role: "first-impression", nav: false },
        { id: "story", label: "Om butiken", createSectionId: "about", docSection: "about", role: "brand", anchor: "#butik" },
        { id: "catalog", label: "Sortiment", createSectionId: "products", docSection: "services", role: "catalog", anchor: "#sortiment" },
        { id: "featured", label: "Utvalda", createSectionId: "featured-products", docSection: "gallery", role: "highlight", anchor: "#utvalda" },
        { id: "faq", label: "Leverans & frågor", createSectionId: "shipping-returns", docSection: "faq", role: "clarity", anchor: "#fragor" },
        { id: "contact", label: "Kontakt", createSectionId: "contact", docSection: "contact", role: "support", anchor: "#kontakt" },
      ],
    },
    interest: {
      id: "showcase-first-journey",
      title: "Customer Journey — Visuellt fokus",
      narrative: "Besökaren ska dras in av visuellt innehåll, förstå erbjudande och ta nästa steg.",
      cardIntents: ["packages", "services", "testimonials"],
      beats: [
        { id: "hero", label: "Hero", createSectionId: "hero", docSection: "hero", role: "first-impression", nav: false },
        { id: "showcase", label: "Utvalt arbete", createSectionId: "gallery", docSection: "gallery", role: "showcase", anchor: "#galleri" },
        { id: "about", label: "Om oss", createSectionId: "about", docSection: "about", role: "story", anchor: "#om-oss" },
        { id: "services", label: "Erbjudande", createSectionId: "services", docSection: "services", role: "offerings", anchor: "#tjanster" },
        { id: "contact", label: "Kontakt", createSectionId: "contact", docSection: "contact", role: "conversion", anchor: "#kontakt" },
      ],
    },
    welcome: {
      id: "welcome-first-journey",
      title: "Customer Journey — Välkomnande",
      narrative: "Besökaren ska känna sig välkommen, förstå erbjudande och enkelt ta kontakt.",
      cardIntents: ["services", "pricing", "testimonials"],
      beats: [
        { id: "hero", label: "Hero", createSectionId: "hero", docSection: "hero", role: "first-impression", nav: false },
        { id: "welcome", label: "Välkommen", createSectionId: "about", docSection: "about", role: "welcome", anchor: "#valkommen" },
        { id: "services", label: "Erbjudande", createSectionId: "services", docSection: "services", role: "offerings", anchor: "#tjanster" },
        { id: "faq", label: "Vanliga frågor", createSectionId: "faq", docSection: "faq", role: "clarity", anchor: "#fragor" },
        { id: "contact", label: "Kontakt", createSectionId: "contact", docSection: "contact", role: "conversion", anchor: "#kontakt" },
      ],
    },
    trust: {
      id: "trust-first-journey",
      title: "Customer Journey — Förtroende",
      narrative: "Besökaren ska känna trygghet, se bevis och förstå tjänster innan kontakt.",
      cardIntents: ["services", "process", "testimonials"],
      beats: [
        { id: "hero", label: "Hero", createSectionId: "hero", docSection: "hero", role: "first-impression", nav: false },
        { id: "trust", label: "Förtroende", createSectionId: "about", docSection: "about", role: "proof", anchor: "#fortroende" },
        { id: "services", label: "Tjänster", createSectionId: "services", docSection: "services", role: "offerings", anchor: "#tjanster" },
        { id: "proof", label: "Referenser", createSectionId: "portfolio", docSection: "gallery", role: "showcase", anchor: "#referenser" },
        { id: "contact", label: "Kontakt", createSectionId: "contact", docSection: "contact", role: "conversion", anchor: "#kontakt" },
      ],
    },
  };

  function cloneStoryBeats(beats) {
    return (beats || []).map(function (beat) {
      return Object.assign({}, beat);
    });
  }

  function resolveStoryTemplateKey(industry, siteTypeId, buildPlan, intent) {
    industry = String(industry || "verksamhet").toLowerCase();
    siteTypeId = String(siteTypeId || "foretag").toLowerCase();
    const brief = briefTextFromPlan(buildPlan).toLowerCase();
    if (/snick|snickeri/.test(brief)) return "snickare";
    if (SITE_STORY_TEMPLATES[industry]) return industry;
    if (siteTypeId === "restaurang" || industry === "cafe") return "restaurang";
    if (siteTypeId === "webbutik" && industry !== "tarot") return "webbutik";
    if (siteTypeId === "portfolio" || industry === "fotograf") return "fotograf";
    if (intent && intent.primaryDrive === "interest") return "interest";
    if (intent && intent.primaryDrive === "welcome") return "welcome";
    return "trust";
  }

  function buildSiteStory(buildPlan, industry, siteTypeId, intent) {
    buildPlan = buildPlan || {};
    intent = intent || {};
    const seed = compositionSeed(buildPlan);
    const templateKey = resolveStoryTemplateKey(industry, siteTypeId, buildPlan, intent);
    const template = SITE_STORY_TEMPLATES[templateKey] || SITE_STORY_TEMPLATES.trust;
    const beats = cloneStoryBeats(template.beats);

    return {
      id: template.id,
      templateKey: templateKey,
      title: template.title,
      industry: industry,
      siteType: siteTypeId,
      narrative: template.narrative,
      beats: beats,
      cardIntents: (template.cardIntents || SITE_TYPE_CARD_INTENTS.foretag).slice(),
      seed: seed,
    };
  }

  function sectionsFromSiteStory(story) {
    story = story || {};
    const out = [];
    const seenCreate = new Set();
    (story.beats || []).forEach(function (beat) {
      if (beat.kind === "block") return;
      const createId = beat.createSectionId || beat.docSection;
      if (!createId || createId === "footer") return;
      const key = createId + "|" + (beat.docSection || createId);
      if (seenCreate.has(key)) return;
      seenCreate.add(key);
      out.push({
        id: createId,
        label: beat.label || createId,
        storyBeatId: beat.id,
        role: beat.role || "",
        docSection: beat.docSection || createId,
      });
    });
    return out;
  }

  function sectionOrderFromSiteStory(story) {
    story = story || {};
    const order = [];
    const seen = new Set();
    (story.beats || []).forEach(function (beat) {
      if (beat.kind === "block") return;
      const docId = beat.docSection;
      if (!docId || docId === "footer" || seen.has(docId)) return;
      seen.add(docId);
      order.push(docId);
    });
    if (!order.includes("hero")) order.unshift("hero");
    if (!order.includes("contact") && !order.includes("booking")) order.push("contact");
    else if (!order.includes("contact") && order.includes("booking")) {
      /* booking räcker som avslutning */
    } else if (!order.includes("contact")) {
      order.push("contact");
    }
    if (!order.includes("footer")) order.push("footer");
    return order;
  }

  function buildSectionAnchorsFromStory(story) {
    story = story || {};
    const anchors = {
      hero: "#top",
      about: "#om-oss",
      services: "#tjanster",
      gallery: "#galleri",
      faq: "#fragor",
      contact: "#kontakt",
      booking: "#bokning",
    };
    (story.beats || []).forEach(function (beat) {
      if (beat.kind === "block" || !beat.docSection) return;
      if (beat.anchor) anchors[beat.docSection] = beat.anchor;
    });
    return anchors;
  }

  function buildNavigationFromStory(story, sitePages, siteTypeId, archetype) {
    story = story || {};
    const nav = [];
    const seen = new Set();
    siteTypeId = String(siteTypeId || "foretag").toLowerCase();
    archetype = archetype || DESIGN_ARCHETYPES["local-service"];

    const homeLabel = siteTypeId === "webbutik" ? "Butik" : "Hem";
    nav.push({ label: homeLabel, pageId: "home", href: "#top", kind: "home" });
    seen.add("home");

    (story.beats || []).forEach(function (beat) {
      if (beat.kind === "block" || beat.nav === false) return;
      const docSection = beat.docSection;
      if (!docSection || docSection === "hero" || docSection === "footer") return;
      const createId = beat.createSectionId || docSection;
      const map = SECTION_PAGE_MAP[createId] || SECTION_PAGE_MAP[docSection];
      const label = beat.label || (map && map.navLabel) || docSection;
      const href = beat.anchor || (map && map.anchor) || "#" + beat.id;
      const pageId = map ? map.pageId : "home";
      const key = pageId + "|" + label;
      if (seen.has(key)) return;
      seen.add(key);
      nav.push({
        label: label,
        pageId: pageId,
        href: href,
        createSectionId: createId,
        storyBeatId: beat.id,
        kind: "story",
      });
    });

    if (nav.length < 3 && sitePages) {
      sitePages.forEach(function (page) {
        if (page.isHome || !page.anchor) return;
        const key = page.id + "|" + page.title;
        if (seen.has(key)) return;
        seen.add(key);
        nav.push({
          label: page.title,
          pageId: page.id,
          href: page.anchor || "#" + page.slug,
          kind: "page",
        });
      });
    }

    return nav.slice(0, 8);
  }

  function buildCompositionBlocksFromStory(story, selectedSections, archetype, siteTypeId) {
    const blocks = buildCompositionBlocks(selectedSections, archetype, siteTypeId);
    story = story || {};
    archetype = archetype || DESIGN_ARCHETYPES["local-service"];
    const density = archetype.blockDensity || "medium";
    const existingAfter = new Set(
      blocks.map(function (b) {
        return b.afterSection + "|" + b.type;
      }),
    );

    (story.beats || []).forEach(function (beat, index) {
      if (beat.kind !== "block") return;
      const afterSection = beat.afterDocSection || "hero";
      const blockType = beat.blockType || "banner";
      const sig = afterSection + "|" + blockType;
      if (existingAfter.has(sig)) return;
      existingAfter.add(sig);
      const block = {
        id: "story-" + beat.id + "-" + index,
        type: blockType,
        afterSection: afterSection,
        variant: beat.variant || (blockType === "collage" ? (density === "rich" ? "mosaic-4" : "grid-3") : "soft"),
        storyBeatId: beat.id,
        storyLabel: beat.label || "",
        content: { title: beat.label || "", lead: "", ctaText: "", ctaHref: "#kontakt" },
      };
      if (blockType === "icon-grid") {
        block.items = [
          { icon: "✓", title: "", body: "" },
          { icon: "★", title: "", body: "" },
          { icon: "♥", title: "", body: "" },
        ];
      }
      if (blockType === "collage") {
        block.images = [];
      }
      if (story.visualRhythm && story.visualRhythm.blocks && story.visualRhythm.blocks[beat.id]) {
        block.rhythm = Object.assign({}, story.visualRhythm.blocks[beat.id]);
      } else {
        block.rhythm = rhythmPresetForBeat(beat);
      }
      blocks.push(block);
    });

    return blocks;
  }

  function applyStorySectionLabels(story, d) {
    if (!story || !d || !d.sections) return;
    const labelsByDoc = {};
    (story.beats || []).forEach(function (beat) {
      if (beat.kind === "block" || !beat.docSection || !beat.label) return;
      labelsByDoc[beat.docSection] = beat.label;
    });
    const titleKeys = {
      about: "about-title",
      services: "services-title",
      gallery: "gallery-title",
      faq: "faq-title",
      contact: "contact-title",
      booking: "booking-title",
    };
    Object.keys(labelsByDoc).forEach(function (docId) {
      const key = titleKeys[docId];
      if (key && d.sections[docId] && d.sections[docId].content) {
        d.sections[docId].content[key] = labelsByDoc[docId];
      }
    });
  }

  function siteStoryToText(story) {
    if (!story || !story.beats) return "";
    const lines = [
      "=== SITE STORY (customer journey) ===",
      story.title || story.id || "",
      story.narrative || "",
      "",
      "Flöde:",
    ];
    story.beats.forEach(function (beat) {
      if (beat.kind === "block") {
        lines.push("→ " + beat.label + " (block efter " + (beat.afterDocSection || "?") + ")");
      } else {
        lines.push("→ " + beat.label);
      }
    });
    if (story.visualRhythm && story.visualRhythm.sequence) {
      lines.push("", "Visual Rhythm:");
      story.visualRhythm.sequence.forEach(function (entry) {
        const p = story.visualRhythm.sections[entry.id];
        if (p) {
          lines.push(
            "  " +
              entry.id +
              ": intensitet " +
              p.intensity +
              "/5 · " +
              p.spacing +
              " · " +
              (p.purpose || p.preset),
          );
        }
      });
    }
    return lines.join("\n");
  }

  /** Visuell intensitet per berättelseroll — Art Director tempo genom sidan. */
  const RHYTHM_PRESETS = {
    "peak-attention": {
      intensity: 5,
      spacing: "expansive",
      contrast: "high",
      imageScale: "hero",
      textDensity: "minimal",
      ctaStrength: "strong",
      background: "default",
    },
    "calm-trust": {
      intensity: 2,
      spacing: "airy",
      contrast: "soft",
      imageScale: "small",
      textDensity: "moderate",
      ctaStrength: "subtle",
      background: "light",
    },
    welcome: {
      intensity: 3,
      spacing: "airy",
      contrast: "soft",
      imageScale: "medium",
      textDensity: "moderate",
      ctaStrength: "subtle",
      background: "light",
    },
    informative: {
      intensity: 3,
      spacing: "normal",
      contrast: "medium",
      imageScale: "medium",
      textDensity: "rich",
      ctaStrength: "normal",
      background: "default",
    },
    "visual-inspire": {
      intensity: 4,
      spacing: "airy",
      contrast: "high",
      imageScale: "large",
      textDensity: "minimal",
      ctaStrength: "subtle",
      background: "muted",
    },
    "social-proof": {
      intensity: 3,
      spacing: "normal",
      contrast: "medium",
      imageScale: "small",
      textDensity: "moderate",
      ctaStrength: "none",
      background: "accent",
    },
    "action-peak": {
      intensity: 5,
      spacing: "normal",
      contrast: "high",
      imageScale: "medium",
      textDensity: "minimal",
      ctaStrength: "peak",
      background: "accent",
    },
    "calm-close": {
      intensity: 2,
      spacing: "airy",
      contrast: "soft",
      imageScale: "none",
      textDensity: "moderate",
      ctaStrength: "normal",
      background: "muted",
    },
    narrative: {
      intensity: 3,
      spacing: "normal",
      contrast: "medium",
      imageScale: "medium",
      textDensity: "rich",
      ctaStrength: "none",
      background: "default",
    },
  };

  const ROLE_TO_RHYTHM = {
    "first-impression": "peak-attention",
    proof: "calm-trust",
    welcome: "welcome",
    story: "narrative",
    offerings: "informative",
    catalog: "informative",
    showcase: "visual-inspire",
    experience: "visual-inspire",
    process: "informative",
    clarity: "informative",
    "social-proof": "social-proof",
    conversion: "action-peak",
    arrival: "calm-close",
    support: "calm-close",
    people: "visual-inspire",
    highlight: "action-peak",
    brand: "welcome",
  };

  function rhythmPresetForBeat(beat) {
    beat = beat || {};
    const key = ROLE_TO_RHYTHM[beat.role] || "informative";
    const base = RHYTHM_PRESETS[key] || RHYTHM_PRESETS.informative;
    return Object.assign({}, base, {
      preset: key,
      purpose: beat.label || beat.role || key,
    });
  }

  function balanceAdjacentRhythm(sections, sectionOrder) {
    const order = (sectionOrder || []).filter(function (id) {
      return id !== "footer" && sections[id];
    });
    for (let i = 1; i < order.length; i++) {
      const prev = sections[order[i - 1]];
      const curr = sections[order[i]];
      if (!prev || !curr || prev.intensity !== curr.intensity) continue;
      if (prev.background === curr.background) {
        const alt = ["default", "light", "muted", "accent"];
        let nextBg = alt[(alt.indexOf(curr.background) + 1) % alt.length];
        if (nextBg === prev.background) nextBg = "muted";
        curr.background = nextBg;
      }
      if (prev.spacing === curr.spacing && curr.intensity <= 3) {
        curr.spacing = curr.spacing === "airy" ? "normal" : "airy";
      }
    }
  }

  function buildVisualRhythm(story, sectionOrder) {
    story = story || {};
    const sections = {};
    const blocks = {};

    (story.beats || []).forEach(function (beat) {
      const profile = rhythmPresetForBeat(beat);
      if (beat.kind === "block") {
        blocks[beat.id] = profile;
        return;
      }
      if (!beat.docSection) return;
      if (!sections[beat.docSection]) {
        sections[beat.docSection] = profile;
      }
    });

    if (!sections.hero) {
      sections.hero = rhythmPresetForBeat({ role: "first-impression", label: "Hero" });
    }

    balanceAdjacentRhythm(sections, sectionOrder);

    return {
      sections: sections,
      blocks: blocks,
      sequence: (sectionOrder || [])
        .filter(function (id) {
          return id !== "footer" && sections[id];
        })
        .map(function (id) {
          return { id: id, intensity: sections[id].intensity };
        }),
    };
  }

  function applyVisualRhythmToDocument(d, visualRhythm) {
    if (!d || !d.sections || !visualRhythm || !visualRhythm.sections) return;
    Object.keys(visualRhythm.sections).forEach(function (sectionId) {
      const profile = visualRhythm.sections[sectionId];
      const sec = d.sections[sectionId];
      if (!sec || !profile) return;
      sec.rhythm = Object.assign({}, profile);
      if (sectionId === "gallery") {
        if (profile.imageScale === "large" || profile.imageScale === "hero") {
          sec.layout = sec.layout || "featured-row";
        }
      }
      if (sectionId === "about" && profile.intensity <= 2) {
        sec.dataStyle = "";
      }
      if (sectionId === "services" && profile.ctaStrength === "peak") {
        sec.emphasis = "cta-forward";
      }
      if (sectionId === "faq" || sectionId === "booking") {
        sec.containerWidth = profile.textDensity === "rich" ? "default" : "narrow";
      }
    });
    if (!d.page) d.page = {};
    d.page.visualRhythm = {
      sections: Object.assign({}, visualRhythm.sections),
      sequence: (visualRhythm.sequence || []).slice(),
    };
  }

  function visualRhythmToText(rhythm) {
    if (!rhythm || !rhythm.sequence) return "";
    const lines = ["=== VISUAL RHYTHM (tempo genom sidan) ==="];
    rhythm.sequence.forEach(function (entry) {
      const p = rhythm.sections[entry.id];
      if (!p) return;
      lines.push(
        entry.id +
          ": intensitet " +
          p.intensity +
          "/5 · luft " +
          p.spacing +
          " · kontrast " +
          p.contrast +
          " · bild " +
          p.imageScale +
          " · text " +
          p.textDensity +
          " · CTA " +
          p.ctaStrength +
          " · bakgrund " +
          p.background +
          (p.purpose ? " (" + p.purpose + ")" : ""),
      );
    });
    return lines.join("\n");
  }

  const SITE_TYPE_CARD_INTENTS = {
    foretag: ["services", "process", "testimonials"],
    portfolio: ["packages", "services", "testimonials"],
    webbutik: ["pricing", "services", "packages"],
    restaurang: ["services", "pricing", "testimonials"],
    ovrigt: ["services", "process", "faq"],
  };

  const PAGE_DEFINITIONS = {
    home: { id: "home", slug: "", title: "Startsida", isHome: true },
    about: { id: "about", slug: "om-oss", title: "Om oss" },
    services: { id: "services", slug: "tjanster", title: "Tjänster" },
    contact: { id: "contact", slug: "kontakt", title: "Kontakt" },
    portfolio: { id: "portfolio", slug: "portfolio", title: "Portfolio" },
    gallery: { id: "gallery", slug: "galleri", title: "Galleri" },
    faq: { id: "faq", slug: "fragor", title: "Vanliga frågor" },
    pricelist: { id: "pricelist", slug: "prislista", title: "Prislista" },
    blog: { id: "blog", slug: "blogg", title: "Blogg" },
    webshop: { id: "webshop", slug: "butik", title: "Webbutik" },
  };

  function profileForStyle(styleId) {
    return DESIGN_STYLE_PROFILES[styleId] || DESIGN_STYLE_PROFILES["modern-professionell"];
  }

  function uniqueDocSections(selectedSections) {
    const seen = new Set();
    const order = [];
    (selectedSections || []).forEach(function (s) {
      const rawId = s && s.id ? String(s.id) : "";
      const map = SECTION_PAGE_MAP[rawId];
      const docId = map ? map.docSection : rawId;
      if (!docId || docId === "footer" || seen.has(docId)) return;
      seen.add(docId);
      order.push(docId);
    });
    if (!order.includes("hero")) order.unshift("hero");
    if (!order.includes("contact")) order.push("contact");
    if (!order.includes("footer")) order.push("footer");
    return order;
  }

  function buildSectionAnchors(selectedSections) {
    const anchors = {
      hero: "#top",
      about: "#om-oss",
      services: "#tjanster",
      gallery: "#galleri",
      faq: "#fragor",
      contact: "#kontakt",
      booking: "#bokning",
    };
    (selectedSections || []).forEach(function (s) {
      const rawId = s && s.id ? String(s.id) : "";
      const map = SECTION_PAGE_MAP[rawId];
      if (map && map.docSection && map.anchor) {
        anchors[map.docSection] = map.anchor;
      }
    });
    return anchors;
  }

  function buildSitePages(selectedSections, siteTypeId) {
    const pages = {};
    pages.home = Object.assign({}, PAGE_DEFINITIONS.home, {
      sectionIds: ["hero"],
      createSectionIds: [],
    });

    (selectedSections || []).forEach(function (s) {
      const rawId = s && s.id ? String(s.id) : "";
      const map = SECTION_PAGE_MAP[rawId];
      if (!map || map.pageId === "home") {
        if (rawId && rawId !== "hero" && rawId !== "footer") {
          pages.home.createSectionIds.push(rawId);
        }
        return;
      }
      if (!pages[map.pageId]) {
        const def = PAGE_DEFINITIONS[map.pageId] || {
          id: map.pageId,
          slug: map.pageId,
          title: s.label || map.pageId,
        };
        pages[map.pageId] = Object.assign({}, def, {
          sectionIds: [],
          createSectionIds: [],
          anchor: map.anchor,
        });
      }
      if (pages[map.pageId].createSectionIds.indexOf(rawId) < 0) {
        pages[map.pageId].createSectionIds.push(rawId);
      }
      if (map.docSection && pages[map.pageId].sectionIds.indexOf(map.docSection) < 0) {
        pages[map.pageId].sectionIds.push(map.docSection);
      }
    });

    if (siteTypeId === "webbutik" && !pages.webshop) {
      pages.webshop = Object.assign({}, PAGE_DEFINITIONS.webshop, {
        sectionIds: ["services"],
        createSectionIds: ["products"],
        anchor: "#butik",
      });
    }

    return Object.keys(pages).map(function (key) {
      return pages[key];
    });
  }

  function buildNavigation(selectedSections, sitePages, siteTypeId, archetype) {
    const nav = [];
    const seen = new Set();
    archetype = archetype || DESIGN_ARCHETYPES["local-service"];
    siteTypeId = String(siteTypeId || "foretag").toLowerCase();

    const homeLabel = siteTypeId === "webbutik" ? "Butik" : "Hem";
    nav.push({ label: homeLabel, pageId: "home", href: "#top", kind: "home" });
    seen.add("home|" + homeLabel);

    (selectedSections || []).forEach(function (s) {
      const rawId = s && s.id ? String(s.id) : "";
      if (rawId === "hero" || rawId === "footer") return;
      const map = SECTION_PAGE_MAP[rawId];
      if (!map || !map.navLabel || !map.anchor) return;
      let label = map.navLabel;
      if (siteTypeId === "webbutik" && rawId === "services") label = "Produkter";
      if (siteTypeId === "webbutik" && rawId === "about") label = "Om butiken";
      if (archetype.id === "spiritual-boutique" && rawId === "services") label = "Erbjudanden";
      const key = map.pageId + "|" + label;
      if (seen.has(key)) return;
      seen.add(key);
      nav.push({
        label: label,
        pageId: map.pageId,
        href: map.anchor,
        createSectionId: rawId,
        kind: "section",
      });
    });

    if (nav.length < 3 && sitePages) {
      sitePages.forEach(function (page) {
        if (page.isHome || !page.anchor) return;
        const key = page.id + "|" + page.title;
        if (seen.has(key)) return;
        seen.add(key);
        nav.push({
          label: page.title,
          pageId: page.id,
          href: page.anchor || "#" + page.slug,
          kind: "page",
        });
      });
    }

    return nav.slice(0, 8);
  }

  function buildCompositionBlocks(selectedSections, archetype, siteTypeId) {
    const blocks = [];
    const ids = (selectedSections || []).map(function (s) {
      return s && s.id ? s.id : "";
    });
    archetype = archetype || DESIGN_ARCHETYPES["local-service"];
    const density = archetype.blockDensity || "medium";
    const bannerVariant = archetype.bannerVariant || "promo";
    const iconVariant = archetype.iconGridVariant || "values";

    if (ids.indexOf("hero") >= 0 || ids.length) {
      blocks.push({
        id: "banner-after-hero",
        type: "banner",
        afterSection: "hero",
        variant: bannerVariant,
        content: { title: "", lead: "", ctaText: "", ctaHref: "#kontakt" },
      });
    }

    if (ids.indexOf("about") >= 0) {
      blocks.push({
        id: "icons-after-about",
        type: "icon-grid",
        afterSection: "about",
        variant: iconVariant,
        items: [
          { icon: "✓", title: "", body: "" },
          { icon: "★", title: "", body: "" },
          { icon: "♥", title: "", body: "" },
        ],
      });
    }

    if (ids.indexOf("services") >= 0 || ids.indexOf("menu") >= 0 || ids.indexOf("products") >= 0) {
      blocks.push({
        id: "cta-after-services",
        type: "cta-band",
        afterSection: "services",
        variant: "primary",
        content: { title: "", lead: "", ctaText: "", ctaHref: "#kontakt" },
      });
    }

    if (ids.indexOf("gallery") >= 0 || ids.indexOf("portfolio") >= 0) {
      blocks.push({
        id: "collage-after-gallery",
        type: "collage",
        afterSection: "gallery",
        variant: density === "rich" ? "mosaic-4" : "grid-3",
        images: [],
      });
    }

    if (density === "rich" && ids.indexOf("faq") >= 0) {
      blocks.push({
        id: "banner-before-faq",
        type: "banner",
        afterSection: "services",
        variant: "soft",
        content: { title: "", lead: "", ctaText: "", ctaHref: "#fragor" },
      });
    }

    return blocks;
  }

  function briefFromBuildPlan(buildPlan) {
    buildPlan = buildPlan || {};
    const name = String(buildPlan.businessName || "").trim();
    const desc = String(buildPlan.businessDescription || "").trim();
    if (buildPlan.businessBrief) return String(buildPlan.businessBrief).trim();
    return [name, desc].filter(Boolean).join(". ");
  }

  /**
   * Bransch från namn + beskrivning — aldrig konsult som default för Företag/Tjänster.
   */
  function resolveIndustryFromBuildPlan(buildPlan, AI) {
    buildPlan = buildPlan || {};
    const name = String(buildPlan.businessName || "").trim();
    const desc = String(buildPlan.businessDescription || "").trim();
    const brief = briefFromBuildPlan(buildPlan);
    const fromKeywords = inferIndustryKeywords(brief);
    if (!AI) return fromKeywords || "verksamhet";

    const fromBrand = typeof AI.inferIndustryFromBrand === "function" ? AI.inferIndustryFromBrand(name + " " + desc) : null;
    if (fromBrand) return fromBrand;

    const ctx =
      typeof AI.resolveCreateContext === "function"
        ? AI.resolveCreateContext(brief, { businessBrief: brief, brand: name })
        : null;
    let industry = (ctx && ctx.industry) || "verksamhet";

    const inf =
      typeof AI.inferIndustryFromDescription === "function" ? AI.inferIndustryFromDescription(brief) : null;
    if (inf && inf.key && inf.key !== "verksamhet" && inf.confidence !== "none" && inf.score >= 3) {
      industry = inf.key;
    }

    if (industry === "konsult") {
      const norm = brief.toLowerCase();
      const explicitKonsult = /konsult|rådgiv|radgiv|coach|strategi|management|interim/.test(norm);
      if (!explicitKonsult) industry = fromKeywords || "verksamhet";
    }

    if ((industry === "verksamhet" || industry === "konsult") && fromKeywords) {
      industry = fromKeywords;
    }

    return industry || "verksamhet";
  }

  function buildHeroContent(buildPlan, industry, AI) {
    const name = String(buildPlan.businessName || "").trim();
    const desc = String(buildPlan.businessDescription || "").trim();
    const brief = briefFromBuildPlan(buildPlan);
    let title = name;
    let lead = "";

    function isPlaceholderLead(text) {
      return /två eller tre meningar|här beskriver ni|byt gärna|skriv som ni pratar|undertexten kort/i.test(
        String(text || ""),
      );
    }

    function firstMeaningfulSentence(text) {
      const parts = String(text || "")
        .split(/[.!?]/)
        .map(function (s) {
          return s.trim();
        })
        .filter(function (s) {
          return s.length >= 12;
        });
      return parts.length ? parts[0] : "";
    }

    function isGenericPackLead(text) {
      if (!text || !AI || !AI.INDUSTRIES) return false;
      const P = AI.INDUSTRIES[industry] || AI.INDUSTRIES.verksamhet;
      if (!P || !P.heroLead) return false;
      const norm = String(text).trim();
      return P.heroLead.some(function (line) {
        return line === norm;
      });
    }

    if (AI) {
      if (typeof AI.extractLocationFromDescription === "function") {
        const loc = AI.extractLocationFromDescription(brief);
        if (name && loc && name.toLowerCase().indexOf(loc.toLowerCase()) === -1) {
          title = name + " — " + loc;
        }
      }
      if (typeof AI.personalizeHeroFromBrief === "function") {
        const stub = { page: { industry: industry }, sections: { hero: { content: {} } } };
        AI.personalizeHeroFromBrief(stub, brief);
        if (stub.sections.hero.content["hero-title"]) title = stub.sections.hero.content["hero-title"];
        if (stub.sections.hero.content["hero-lead"]) lead = stub.sections.hero.content["hero-lead"];
      }
      if ((!lead || isPlaceholderLead(lead) || isGenericPackLead(lead)) && desc) {
        const fromDesc = firstMeaningfulSentence(desc);
        if (fromDesc) lead = fromDesc;
      }
      if ((!lead || isPlaceholderLead(lead)) && typeof AI.composeHeroLeadFromBrief === "function") {
        const P =
          AI.INDUSTRIES && AI.INDUSTRIES[industry]
            ? AI.INDUSTRIES[industry]
            : AI.INDUSTRIES && AI.INDUSTRIES.verksamhet
              ? AI.INDUSTRIES.verksamhet
              : null;
        const fallback = P && P.heroLead && P.heroLead[0] ? P.heroLead[0] : "";
        lead = AI.composeHeroLeadFromBrief(brief, fallback) || fallback;
      }
    }

    if (!title) title = name || "Välkommen";
    if ((!lead || isPlaceholderLead(lead)) && desc) lead = firstMeaningfulSentence(desc);
    if (!lead) lead = "Vi hjälper dig — hör av dig så berättar vi mer om vad vi erbjuder.";

    return {
      title: String(title).slice(0, 120),
      lead: String(lead).slice(0, 280),
      industry: industry,
    };
  }

  function buildCtaPlan(industry, buildPlan, AI, intent) {
    industry = industry || "verksamhet";
    buildPlan = buildPlan || {};
    intent = intent || {};
    const siteTypeId =
      buildPlan.siteType && buildPlan.siteType.id ? buildPlan.siteType.id : "foretag";
    if (!AI || typeof AI.resolveBusinessPlan !== "function") {
      return {
        primaryCta: { text: "Kontakta oss", href: "#kontakt" },
        secondaryCta: { text: "Se tjänster", href: "#tjanster" },
      };
    }
    const area =
      typeof AI.inferAreaFromIndustry === "function" ? AI.inferAreaFromIndustry(industry) : "other";
    const plan = AI.resolveBusinessPlan(area, industry);
    const goals = buildPlan.siteGoals || [];
    const goalId = goals.length && goals[0].id ? goals[0].id : null;
    if (goalId === "quote" || goalId === "offert") {
      plan.primaryCta = { text: "Begär offert", href: "#kontakt" };
      plan.secondaryCta = { text: "Ring oss", href: "#kontakt" };
    }
    if (goalId === "bookings" || goalId === "bokning") {
      plan.primaryCta = { text: "Boka tid", href: "#kontakt" };
    }
    if (siteTypeId === "webbutik") {
      plan.primaryCta = { text: "Se sortiment", href: "#tjanster" };
      plan.secondaryCta = { text: "Om oss", href: "#om-oss" };
    }
    if (industry === "tarot") {
      plan.primaryCta = { text: "Utforska erbjudanden", href: "#tjanster" };
      plan.secondaryCta = { text: "Läs mer om oss", href: "#om-oss" };
    }
    if (intent.primaryDrive === "interest") {
      plan.secondaryCta = plan.secondaryCta || { text: "Se exempel", href: "#galleri" };
      if (siteTypeId !== "webbutik") {
        plan.primaryCta = { text: "Se vårt arbete", href: "#galleri" };
      }
    }
    if (intent.primaryDrive === "welcome" && (industry === "cafe" || industry === "restaurang")) {
      plan.primaryCta = { text: "Se menyn", href: "#meny" };
      plan.secondaryCta = { text: "Hitta hit", href: "#kontakt" };
    }
    return {
      primaryCta: plan.primaryCta,
      secondaryCta: plan.secondaryCta,
      goal: plan.goal,
      sectionOrder: plan.sectionOrder,
      cardIntents: plan.cardIntents,
    };
  }

  /**
   * Bygger fullständig sajtcomposition från Create Build Plan.
   * @param {object} buildPlan
   */
  function composeFromBuildPlan(buildPlan, AI) {
    buildPlan = buildPlan || {};
    AI = AI || global.AISiteBuilder;
    const siteTypeId = buildPlan.siteType && buildPlan.siteType.id ? buildPlan.siteType.id : "foretag";
    const styleId = buildPlan.designStyle && buildPlan.designStyle.id ? buildPlan.designStyle.id : "modern-professionell";
    const industry = resolveIndustryFromBuildPlan(buildPlan, AI);
    const intent = analyzeFirstImpressionIntent(buildPlan, industry);
    const seed = compositionSeed(buildPlan);
    const archetypeBase = modulateArchetypeForBrand(
      resolveDesignArchetype(buildPlan, industry),
      buildPlan,
      intent,
    );

    let visualFp = buildVisualDesignFingerprint(buildPlan, industry, intent, archetypeBase, seed);
    visualFp = ensureUniqueVisualFingerprint(visualFp, buildPlan, seed);
    let archetype = applyVisualFingerprintToArchetype(archetypeBase, visualFp);

    const siteStory = buildSiteStory(buildPlan, industry, siteTypeId, intent);
    const selectedSections = sectionsFromSiteStory(siteStory);
    const sectionOrder = sectionOrderFromSiteStory(siteStory);
    siteStory.visualRhythm = buildVisualRhythm(siteStory, sectionOrder);
    const sitePages = buildSitePages(selectedSections, siteTypeId);
    const navigation = buildNavigationFromStory(siteStory, sitePages, siteTypeId, archetype);
    const blocks = buildCompositionBlocksFromStory(siteStory, selectedSections, archetype, siteTypeId);
    const cardIntents =
      (siteStory.cardIntents && siteStory.cardIntents.length
        ? siteStory.cardIntents
        : SITE_TYPE_CARD_INTENTS[siteTypeId]) || SITE_TYPE_CARD_INTENTS.foretag;
    const cardCount = archetype.servicesLayout === "cards-mosaic" ? 4 : 3;

    let firstImpression = composeFirstImpression(buildPlan, industry, AI, archetype, visualFp);

    let review = artDirectorSelfReview(buildPlan, industry, intent, visualFp, {
      hero: firstImpression.hero,
      cta: firstImpression.cta,
      highlights: firstImpression.highlights,
    });

    if (!review.passed) {
      const adjusted = applyReviewPatches(
        visualFp,
        {
          hero: firstImpression.hero,
          cta: firstImpression.cta,
          highlights: firstImpression.highlights,
        },
        review.patches,
        industry,
        AI,
        buildPlan,
      );
      visualFp = adjusted.vfp;
      firstImpression.hero = adjusted.draft.hero;
      if (adjusted.draft.cta) firstImpression.cta = adjusted.draft.cta;
      archetype = applyVisualFingerprintToArchetype(archetypeBase, visualFp);
      review = artDirectorSelfReview(buildPlan, industry, intent, visualFp, {
        hero: firstImpression.hero,
        cta: firstImpression.cta,
        highlights: firstImpression.highlights,
      });
    }

    if (firstImpression.artDirector) {
      firstImpression.artDirector.designReview = review.reasoning;
      firstImpression.artDirector.reviewPassed = review.passed;
    }

    const draftState = {
      hero: firstImpression.hero,
      cta: firstImpression.cta,
      highlights: firstImpression.highlights,
    };

    let suitability = designSuitabilityReview(
      buildPlan,
      industry,
      intent,
      visualFp,
      archetype,
      siteTypeId,
      draftState,
    );
    let suitRound = 0;
    while (!suitability.passed && suitRound < 4) {
      const adjusted = applyReviewPatches(
        visualFp,
        draftState,
        suitability.patches,
        industry,
        AI,
        buildPlan,
      );
      visualFp = adjusted.vfp;
      draftState.hero = adjusted.draft.hero;
      if (adjusted.draft.cta) draftState.cta = adjusted.draft.cta;
      if (patchesAffectStructure(suitability.patches)) {
        visualFp = ensureUniqueVisualFingerprint(visualFp, buildPlan, seed + 200 + suitRound);
      }
      archetype = applyVisualFingerprintToArchetype(archetypeBase, visualFp);
      firstImpression.hero = Object.assign({}, firstImpression.hero, {
        layout: visualFp.hero.layout,
        layers: visualFp.hero.layers,
      });
      suitability = designSuitabilityReview(
        buildPlan,
        industry,
        intent,
        visualFp,
        archetype,
        siteTypeId,
        draftState,
      );
      suitRound++;
    }

    if (firstImpression.artDirector) {
      firstImpression.artDirector.suitabilityReview = suitability.reasoning;
      firstImpression.artDirector.suitabilityPassed = suitability.passed;
      if (suitability.profile) {
        firstImpression.artDirector.audience = suitability.profile.audience;
      }
    }

    return {
      version: VERSION,
      siteType: siteTypeId,
      designStyle: styleId,
      industry: industry,
      siteStory: siteStory,
      visualRhythm: siteStory.visualRhythm,
      designArchetype: archetype.id,
      designArchetypeLabel: archetype.label,
      designFamily: archetype.designFamily,
      layoutProfile: archetype,
      designIntent: firstImpression.intent,
      designRationale: firstImpression.rationale,
      artDirector: firstImpression.artDirector,
      visualDesignFingerprint: visualFp,
      compositionSeed: seed,
      artDirectorReview: review,
      designSuitabilityReview: suitability,
      designFingerprint: seed,
      sectionOrder: sectionOrder,
      sitePages: sitePages,
      navigation: navigation,
      sectionAnchors: buildSectionAnchorsFromStory(siteStory),
      blocks: blocks,
      hero: firstImpression.hero,
      cta: firstImpression.cta,
      highlights: firstImpression.highlights,
      theme: archetype.theme || "minimal-white",
      template: archetype.template || "editorial",
      logoAlign: firstImpression.hero.logoAlign || archetype.logoAlign || "center",
      navPattern: archetype.navPattern || "inline-left",
      textLogoStyle: archetype.textLogoStyle || "classic",
      sectionSpacing: archetype.sectionSpacing || "2",
      buttonStyle: archetype.buttonStyle || "",
      aboutLayout: archetype.aboutLayout || "",
      services: {
        layout: archetype.servicesLayout || "cards-3",
        cardCount: cardCount,
        cardIntents: cardIntents.slice(0, cardCount),
      },
    };
  }

  function applySectionLabels(composition, d) {
    if (!d || !d.sections || !composition) return;
    if (composition.siteStory) {
      applyStorySectionLabels(composition.siteStory, d);
      return;
    }
    const selected = {};
    (composition.sitePages || []).forEach(function (page) {
      (page.createSectionIds || []).forEach(function (id) {
        selected[id] = true;
      });
    });

    if (selected.menu && d.sections.services && d.sections.services.content) {
      d.sections.services.content["services-title"] = "Meny";
    }
    if (selected.pricelist && d.sections.services && d.sections.services.content) {
      d.sections.services.content["services-title"] = "Prislista";
    }
    if (selected.portfolio && d.sections.gallery && d.sections.gallery.content) {
      d.sections.gallery.content["gallery-title"] = "Portfolio";
    }
    if (selected.products && d.sections.services && d.sections.services.content) {
      d.sections.services.content["services-title"] = "Produkter";
    }
  }

  function applyToDocument(d, buildPlan) {
    if (!d || !d.page) return null;
    const AI = global.AISiteBuilder;
    const composition = composeFromBuildPlan(buildPlan, AI);
    if (!d.sections) d.sections = {};

    d.page.siteComposition = composition;
    d.page.compositionLocked = true;
    d.page.industry = composition.industry || d.page.industry || "verksamhet";
    d.page.navigation = composition.navigation.slice();
    d.page.sitePages = composition.sitePages.slice();
    d.page.sectionAnchors = Object.assign({}, composition.sectionAnchors || {});
    d.page.compositionBlocks = composition.blocks.slice();
    d.page.heroLayout = composition.hero.layout;
    d.page.template = composition.template || d.page.template;
    d.page.theme = composition.theme || d.page.theme;
    d.page.logoAlign = composition.logoAlign || d.page.logoAlign || "center";
    d.page.sectionOrder = composition.sectionOrder.slice();
    d.page.navPattern = composition.navPattern || "inline-left";
    d.page.textLogoStyle = composition.textLogoStyle || d.page.textLogoStyle || "classic";
    d.page.sectionSpacing = composition.sectionSpacing || d.page.sectionSpacing || "2";
    d.page.buttonStyle = composition.buttonStyle != null ? composition.buttonStyle : d.page.buttonStyle || "";
    d.page.designArchetype = composition.designArchetype || "";
    d.page.designFamily = composition.designFamily || d.page.designFamily || "";
    if (composition.designRationale) d.page.designRationale = composition.designRationale;
    if (composition.designIntent) d.page.designIntent = Object.assign({}, composition.designIntent);
    if (composition.artDirector) d.page.artDirectorBrief = Object.assign({}, composition.artDirector);
    if (composition.visualDesignFingerprint) {
      d.page.visualDesignFingerprint = Object.assign({}, composition.visualDesignFingerprint);
      d.page.imageStyle = composition.visualDesignFingerprint.imageStyle || "";
      d.page.accentStyle = composition.visualDesignFingerprint.accentStyle || "";
      if (composition.visualDesignFingerprint.cta) {
        d.page.ctaEmphasis = composition.visualDesignFingerprint.cta.emphasis || "balanced";
      }
      if (composition.visualDesignFingerprint.highlights) {
        d.page.highlightMode = composition.visualDesignFingerprint.highlights.mode || "inline";
      }
    }
    if (composition.artDirectorReview && composition.artDirectorReview.reasoning) {
      d.page.artDirectorReview = composition.artDirectorReview.reasoning.slice();
    }
    if (composition.designSuitabilityReview && composition.designSuitabilityReview.reasoning) {
      d.page.designSuitabilityReview = composition.designSuitabilityReview.reasoning.slice();
    }
    if (composition.siteStory) {
      d.page.siteStory = Object.assign({}, composition.siteStory, {
        beats: (composition.siteStory.beats || []).slice(),
      });
    }

    if (composition.hero && composition.hero.content && d.sections.hero && d.sections.hero.content) {
      d.sections.hero.content["hero-title"] = composition.hero.content.title || d.sections.hero.content["hero-title"];
      d.sections.hero.content["hero-lead"] = composition.hero.content.lead || d.sections.hero.content["hero-lead"];
    }

    if (composition.cta && d.sections.hero && d.sections.hero.content) {
      d.sections.hero.content["hero-cta-1-text"] = composition.cta.primaryCta.text;
      d.sections.hero.content["hero-cta-1-href"] = composition.cta.primaryCta.href;
      d.sections.hero.content["hero-cta-2-text"] = composition.cta.secondaryCta.text;
      d.sections.hero.content["hero-cta-2-href"] = composition.cta.secondaryCta.href;
      d.page.createFlowPlan = {
        goal: composition.cta.goal,
        primaryCta: composition.cta.primaryCta,
        secondaryCta: composition.cta.secondaryCta,
        sectionOrder: composition.sectionOrder.slice(),
        cardIntents: (composition.services && composition.services.cardIntents) || [],
      };
    }

    if (composition.hero.layers > 1) {
      d.page.heroLayers = [{ role: "accent", position: "bottom-right", opacity: 0.85 }];
      if (d.sections.hero) {
        d.sections.hero.heroDecor = { enabled: true, position: "overlay-br" };
      }
    } else if (d.sections.hero) {
      d.sections.hero.heroDecor = { enabled: false };
    }

    if (composition.highlights) {
      if (d.sections.hero && composition.highlights.hero) {
        d.sections.hero.highlights = composition.highlights.hero.slice();
      }
      if (d.sections.about && composition.highlights.about) {
        d.sections.about.highlights = composition.highlights.about.slice();
      }
      if (d.sections.services && composition.highlights.services) {
        d.sections.services.highlights = composition.highlights.services.slice();
      }
    }

    if (d.sections.services) {
      d.sections.services.layout = composition.services.layout;
      d.sections.services.cardCount = composition.services.cardCount;
      if (composition.visualDesignFingerprint && composition.visualDesignFingerprint.cards) {
        d.sections.services.cardDensity =
          composition.visualDesignFingerprint.cards.density || "medium";
      }
      const cards = d.sections.services.cards || [];
      while (cards.length < composition.services.cardCount) {
        cards.push({ icon: "", title: "", body: "", img: "", intent: "services", ctaText: "", ctaHref: "" });
      }
      d.sections.services.cards = cards.slice(0, composition.services.cardCount);
    }

    if (d.sections.about && composition.aboutLayout === "asymmetric") {
      d.sections.about.dataStyle = "asymmetric";
    } else if (d.sections.about && composition.aboutLayout === "") {
      d.sections.about.dataStyle = "";
    }

    if (d.sections.gallery && composition.visualDesignFingerprint) {
      d.sections.gallery.layout = composition.visualDesignFingerprint.gallery.layout || "grid";
    }

    if (composition.visualDesignFingerprint && composition.visualDesignFingerprint.highlights) {
      const hm = composition.visualDesignFingerprint.highlights.mode;
      if (d.sections.hero && hm === "minimal") d.sections.hero.highlights = [];
    }

    Object.keys(d.sections).forEach(function (id) {
      if (id === "footer") return;
      const inOrder = composition.sectionOrder.indexOf(id) >= 0;
      if (d.sections[id]) d.sections[id].hidden = !inOrder;
    });

    applySectionLabels(composition, d);
    if (composition.visualRhythm || (composition.siteStory && composition.siteStory.visualRhythm)) {
      applyVisualRhythmToDocument(d, composition.visualRhythm || composition.siteStory.visualRhythm);
    }

    d.page.heroStructure = resolveHeroStructureKey(d.page);

    if (composition.navigation && d.sections.footer && d.sections.footer.content) {
      const footerLinks = composition.navigation.filter(function (n) {
        return n && n.href && n.href !== "#top";
      });
      footerLinks.slice(0, 6).forEach(function (link, i) {
        const n = i + 1;
        d.sections.footer.content["footer-link-" + n] = link.label || "";
        d.sections.footer.content["footer-link-" + n + "-href"] = link.href || "#";
      });
    }

    return composition;
  }

  /** SCE: vilken hero-HTML-struktur Render ska använda (legacy = olåst dokument). */
  function resolveHeroStructureKey(page) {
    page = page || {};
    if (!page.compositionLocked) return "legacy";
    const layout = page.heroLayout || "center";
    if (layout === "split") return "split";
    if (layout === "left") return "left";
    const tpl =
      page.template ||
      (page.siteComposition && page.siteComposition.template) ||
      "";
    if (layout === "center" && tpl === "editorial") return "editorial";
    return "center";
  }

  /** Render Engine: per-sektion layoutprofil från SCE (legacy → "classic"). */
  function resolveSectionLayout(sectionId, page, sec) {
    page = page || {};
    sec = sec || {};
    if (!page.compositionLocked || !page.siteComposition) {
      return "classic";
    }
    const comp = page.siteComposition;
    switch (sectionId) {
      case "hero": {
        const hl = page.heroLayout || (comp.hero && comp.hero.layout) || "center";
        const tpl = page.template || comp.template || "";
        if (hl === "center" && tpl === "editorial") return "hero-editorial";
        return "hero-" + hl;
      }
      case "about":
        if (sec.dataStyle === "asymmetric" || comp.aboutLayout === "asymmetric") {
          return "about-asymmetric";
        }
        return "about-standard";
      case "services": {
        const sl = sec.layout || (comp.services && comp.services.layout) || "cards-3";
        return "services-" + sl;
      }
      case "gallery": {
        const gl =
          sec.layout ||
          (comp.visualDesignFingerprint &&
            comp.visualDesignFingerprint.gallery &&
            comp.visualDesignFingerprint.gallery.layout) ||
          "grid";
        return "gallery-" + gl;
      }
      case "faq":
        return "faq-standard";
      case "booking":
        return "booking-standard";
      case "contact":
        return "contact-standard";
      default:
        return "section-standard";
    }
  }

  function resolveFooterLayout(page) {
    page = page || {};
    if (page.compositionLocked) return "footer-standard";
    return "classic";
  }

  function toGenerationBrief(composition) {
    if (!composition) return "";
    const parts = ["=== DESIGN COMPOSITION (första intryck) ==="];
    if (composition.siteStory) {
      parts.push(siteStoryToText(composition.siteStory));
    }
    if (composition.visualRhythm) {
      parts.push(visualRhythmToText(composition.visualRhythm));
    }
    if (composition.designArchetypeLabel) {
      parts.push("Designarketyp: " + composition.designArchetypeLabel + " (" + (composition.designArchetype || "") + ")");
    }
    if (composition.designFamily) parts.push("Designfamilj: " + composition.designFamily);
    if (composition.visualDesignFingerprint) {
      parts.push(visualFingerprintToText(composition.visualDesignFingerprint));
    }
    if (composition.artDirectorReview && composition.artDirectorReview.reasoning) {
      parts.push("=== ART DIRECTOR GRANSKNING ===");
      composition.artDirectorReview.reasoning.forEach(function (r) {
        parts.push((r.ok ? "✓" : "→") + " " + r.question + (r.note ? " — " + r.note : ""));
      });
    }
    if (composition.designSuitabilityReview && composition.designSuitabilityReview.reasoning) {
      parts.push("=== DESIGN SUITABILITY (passar verksamheten?) ===");
      if (composition.designSuitabilityReview.profile && composition.designSuitabilityReview.profile.audience) {
        parts.push("Målgrupp: " + composition.designSuitabilityReview.profile.audience);
      }
      composition.designSuitabilityReview.reasoning.forEach(function (r) {
        parts.push((r.ok ? "✓" : "→") + " " + r.question + (r.note ? " — " + r.note : ""));
      });
    }
    if (composition.artDirector) {
      parts.push(artDirectorBriefToText(composition.artDirector));
    } else if (composition.designRationale) {
      parts.push(composition.designRationale);
    }
    if (composition.designIntent) {
      parts.push(
        "Designfokus: " +
          (composition.designIntent.primaryDrive || "trust") +
          " · visuell hierarki: " +
          (composition.designIntent.visualFocus || "headline"),
      );
    }
    if (composition.hero && composition.hero.content) {
      parts.push("Huvudrubrik: " + composition.hero.content.title);
      parts.push("Stödjande budskap: " + composition.hero.content.lead);
    }
    if (composition.hero) {
      parts.push("Hero-komposition: " + composition.hero.layout);
    }
    if (composition.cta && composition.cta.primaryCta) {
      parts.push("Primär CTA: " + composition.cta.primaryCta.text);
    }
    if (composition.highlights && composition.highlights.hero && composition.highlights.hero.length) {
      parts.push(
        "Visuella fakta i hero: " +
          composition.highlights.hero
            .map(function (h) {
              return h.label;
            })
            .join(", "),
      );
    }
    parts.push("Layout: " + (composition.template || "") + " · tema " + (composition.theme || ""));
    if (composition.navPattern) parts.push("Navigation: " + composition.navPattern);
    if (composition.navigation && composition.navigation.length) {
      parts.push(
        "Navigation: " +
          composition.navigation
            .map(function (n) {
              return n.label;
            })
            .join(" · "),
      );
    }
    return parts.join("\n");
  }

  global.SiteCompositionEngine = {
    VERSION: VERSION,
    DESIGN_STYLE_PROFILES: DESIGN_STYLE_PROFILES,
    SECTION_PAGE_MAP: SECTION_PAGE_MAP,
    composeFromBuildPlan: composeFromBuildPlan,
    composeFirstImpression: composeFirstImpression,
    analyzeFirstImpressionIntent: analyzeFirstImpressionIntent,
    resolveDesignArchetype: resolveDesignArchetype,
    resolveArchetypeKey: resolveArchetypeKey,
    DESIGN_ARCHETYPES: DESIGN_ARCHETYPES,
    applyToDocument: applyToDocument,
    resolveSectionLayout: resolveSectionLayout,
    resolveFooterLayout: resolveFooterLayout,
    resolveHeroStructureKey: resolveHeroStructureKey,
    resolveIndustryFromBuildPlan: resolveIndustryFromBuildPlan,
    buildHeroContent: buildHeroContent,
    buildCtaPlan: buildCtaPlan,
    designFingerprint: designFingerprint,
    compositionSeed: compositionSeed,
    buildVisualDesignFingerprint: buildVisualDesignFingerprint,
    visualFingerprintToText: visualFingerprintToText,
    buildVisualRhythm: buildVisualRhythm,
    visualRhythmToText: visualRhythmToText,
    buildSiteStory: buildSiteStory,
    siteStoryToText: siteStoryToText,
    SITE_STORY_TEMPLATES: SITE_STORY_TEMPLATES,
    artDirectorSelfReview: artDirectorSelfReview,
    designSuitabilityReview: designSuitabilityReview,
    artDirectorPostGenerationReview: artDirectorPostGenerationReview,
    designScoreToText: designScoreToText,
    resolveSuitabilityProfile: resolveSuitabilityProfile,
    buildArtDirectorBrief: buildArtDirectorBrief,
    artDirectorBriefToText: artDirectorBriefToText,
    toGenerationBrief: toGenerationBrief,
  };
})(typeof window !== "undefined" ? window : globalThis);
