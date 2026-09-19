/**
 * Generation integrity — fail generation when placeholders, broken copy, or bad images remain.
 */
(function (global) {
  "use strict";

  const LOG_TAG = "[Easily · integrity]";

  const PLACEHOLDER_BRAND_RE = /^(företagsnamn|foretagsnamn|fÖRETAGSNAMN|\?)$/i;

  const DEFAULT_HERO_TITLES = [
    "tydligt erbjudande i en mening",
    "er huvudrubrik — konkret och inbjudande",
  ];

  const DEFAULT_HERO_LEADS = [
    "två eller tre meningar om vad ni gör",
    "två–tre meningar: vad ni gör",
  ];

  const DEFAULT_ABOUT_SNIPPETS = [
    "vi är ett företag som gillar klara besked",
    "här beskriver ni gärna var ni finns",
  ];

  const TRADE_KEYWORDS =
    /(snick|bygg|frisör|frisor|salong|hund|restaurang|kafe|cafe|konsult|elektrik|vvs|tatuer|foto|gym|advokat|målare|tak|atervinning|återvinning|avfall|milj[oö]|recycl|sophämt|retur|container|sorter)/i;

  const BIZ_SIGNALS =
    /(jag har|jag h[aå]r|vi är|heter|håller till|finns i|verksamhet|företag|firma|företagsnamn|foretagsnamn|varumärke|kunder|erbjuder|specialiser|driver)/i;

  /** Casual image-only chat — not a business brief. */
  function looksLikeImageOnlyChat(text) {
    const raw = String(text || "").trim();
    const s = raw.toLowerCase();
    if (!s) return false;
    if (/^(en|ett)\s+bild\b/.test(s)) return true;
    if (/^bild\s+(allts[aå]|alltsp|alltså|tack|snälla|snalla)?\.?$/i.test(raw)) return true;
    if (/^(jag vill ha|ge mig|kan du ge|kan ni ge|jag behöver|behöver)\s+(en|ett)\s+bild/.test(s)) return true;
    if (/^(en|ett)\s+bild\s+(allts[aå]|alltsp|alltså|tack|snälla|snalla)?\.?$/i.test(raw)) return true;
    if (s.length <= 28 && /\bbild\b/.test(s) && !BIZ_SIGNALS.test(s) && !TRADE_KEYWORDS.test(s)) return true;
    return false;
  }

  /** True when text can drive industry adaptation / hero personalization. */
  function isValidBusinessBrief(text) {
    const raw = String(text || "").trim();
    if (!raw || raw.length < 8) return false;
    if (looksLikeImageOnlyChat(raw)) return false;
    if (/^(byt bild|ändra rubrik|ta bort|dölj|gör elegant|pröva igen|bygg om hela|igen$|retry$)/i.test(raw)) {
      return false;
    }
    if (BIZ_SIGNALS.test(raw) || TRADE_KEYWORDS.test(raw)) return true;
    if (raw.length >= 24 && /[,;.]/.test(raw)) return true;
    return false;
  }

  function normalizeCompare(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
  }

  function isPlaceholderHeroTitle(title) {
    const t = normalizeCompare(title);
    if (!t) return true;
    return DEFAULT_HERO_TITLES.some(function (p) {
      return t === p || t.indexOf(p) === 0;
    });
  }

  function isPlaceholderHeroLead(lead) {
    const t = normalizeCompare(lead);
    if (!t) return true;
    return DEFAULT_HERO_LEADS.some(function (p) {
      return t === p || t.indexOf(p) === 0;
    });
  }

  function isPlaceholderBrand(brand) {
    const b = normalizeCompare(brand);
    if (!b) return true;
    return PLACEHOLDER_BRAND_RE.test(b);
  }

  function isBrokenHeadline(title, ctx) {
    ctx = ctx || {};
    const t = normalizeCompare(title);
    if (!t || t.length < 3) return true;
    if (looksLikeImageOnlyChat(t)) return true;
    const fragments = ctx.chatFragments || ctx.rejectedChat || [];
    for (let i = 0; i < fragments.length; i++) {
      const frag = normalizeCompare(fragments[i]);
      if (frag && (t === frag || t.indexOf(frag) === 0)) return true;
    }
    if (ctx.brief) {
      const briefFirst = normalizeCompare(String(ctx.brief).split(/[.!?\n]/)[0]);
      if (briefFirst && t === briefFirst && !isValidBusinessBrief(ctx.brief)) return true;
    }
    if (/^en bild\b/.test(t)) return true;
    return false;
  }

  function isPlaceholderStockUrl(url) {
    const u = String(url || "").trim().toLowerCase();
    if (!u) return true;
    return isGenericEditorHero(url);
  }

  function isGenericEditorHero(url) {
    const u = String(url || "").trim().toLowerCase();
    return /picsum\.photos\/seed\/(hero-studio|card-brand|card-web|card-growth)/.test(u);
  }

  function heroImageIntegrity(doc, ctx) {
    const url = doc && doc.page ? String(doc.page.heroBgUrl || "").trim() : "";
    if (!url) {
      return { ok: false, code: "missing_hero_image", message: "Hero image missing" };
    }
    if (isPlaceholderStockUrl(url)) {
      return { ok: false, code: "placeholder_hero_image", message: "Hero image is placeholder stock" };
    }
    const industry = (doc && doc.page && doc.page.industry) || (ctx && ctx.industry) || "";
    if (industry && industry !== "verksamhet" && isGenericEditorHero(url)) {
      return { ok: false, code: "unrelated_hero_image", message: "Hero image not adapted to industry" };
    }
    return { ok: true };
  }

  function missingSectionData(doc) {
    const failures = [];
    if (!doc || !doc.sections) {
      failures.push({ code: "missing_sections", message: "Document sections missing", stage: "SITE_GENERATION" });
      return failures;
    }
    const hero = doc.sections.hero && doc.sections.hero.content;
    if (!hero || !String(hero["hero-title"] || "").trim()) {
      failures.push({ code: "missing_hero_title", message: "Hero title missing", stage: "TEXT_INTELLIGENCE" });
    }
    if (!hero || !String(hero["hero-lead"] || "").trim()) {
      failures.push({ code: "missing_hero_lead", message: "Hero lead missing", stage: "TEXT_INTELLIGENCE" });
    }
    const about = doc.sections.about && doc.sections.about.content;
    if (!about || !String(about["about-p1"] || "").trim()) {
      failures.push({ code: "missing_about", message: "About section missing", stage: "TEXT_INTELLIGENCE" });
    }
    return failures;
  }

  function validateDocument(doc, ctx) {
    ctx = ctx || {};
    const failures = [];
    let firstFailedStage = null;

    function add(stage, code, message) {
      failures.push({ stage: stage, code: code, message: message });
      if (!firstFailedStage) firstFailedStage = stage;
    }

    if (!doc) {
      add("SITE_GENERATION", "missing_document", "Document missing");
      return { ok: false, failures: failures, firstFailedStage: firstFailedStage };
    }

    const brand =
      (doc.sections &&
        doc.sections.footer &&
        doc.sections.footer.content &&
        doc.sections.footer.content["footer-brand"]) ||
      "";
    if (isPlaceholderBrand(brand)) {
      add("COMPANY_IDENTITY", "placeholder_company_name", "Company name is placeholder or empty");
    }

    const heroTitle =
      doc.sections && doc.sections.hero && doc.sections.hero.content
        ? doc.sections.hero.content["hero-title"]
        : "";
    const heroLead =
      doc.sections && doc.sections.hero && doc.sections.hero.content
        ? doc.sections.hero.content["hero-lead"]
        : "";

    if (isPlaceholderHeroTitle(heroTitle)) {
      add("PLACEHOLDER_REPLACEMENT", "placeholder_hero_title", "Hero title is default placeholder");
    }
    if (isBrokenHeadline(heroTitle, ctx)) {
      add("INTENT", "broken_headline", "Hero headline looks like chat garbage or image request");
    }
    if (isPlaceholderHeroLead(heroLead)) {
      add("PLACEHOLDER_REPLACEMENT", "placeholder_hero_lead", "Hero lead is default placeholder");
    }

    const aboutP1 =
      doc.sections && doc.sections.about && doc.sections.about.content
        ? doc.sections.about.content["about-p1"]
        : "";
    const aboutNorm = normalizeCompare(aboutP1);
    if (
      aboutNorm &&
      DEFAULT_ABOUT_SNIPPETS.some(function (p) {
        return aboutNorm.indexOf(p) === 0;
      })
    ) {
      add("PLACEHOLDER_REPLACEMENT", "placeholder_about", "About text is default placeholder");
    }

    missingSectionData(doc).forEach(function (f) {
      add(f.stage, f.code, f.message);
    });

    const heroImg = heroImageIntegrity(doc, ctx);
    if (!heroImg.ok) {
      add("IMAGE_INTELLIGENCE", heroImg.code, heroImg.message);
    }

    const result = {
      ok: failures.length === 0,
      failures: failures,
      firstFailedStage: firstFailedStage,
    };

    try {
      console.info(LOG_TAG, "validate", result.ok ? "PASS" : "FAIL", failures);
    } catch (e) {
      /* ignore */
    }

    return result;
  }

  function assertGenerationIntegrity(doc, ctx) {
    const result = validateDocument(doc, ctx);
    if (!result.ok) {
      const err = new Error("generation_integrity_failed");
      err.integrity = result;
      throw err;
    }
    return result;
  }

  /**
   * Apply in-place fixes for common create/resume gaps before validation.
   * @returns {boolean} true if anything changed
   */
  function repairDocumentForCreate(doc, ctx) {
    ctx = ctx || {};
    if (!doc || !doc.page) return false;
    let changed = false;

    const AI = global.AISiteBuilder;
    const desc = String(ctx.brief || doc.page.onboardingDescription || "").trim();
    const brandIn =
      String(ctx.brand || "").trim() ||
      (AI && typeof AI.extractBrandFromDescription === "function" ? AI.extractBrandFromDescription(desc) : "") ||
      (doc.sections &&
        doc.sections.footer &&
        doc.sections.footer.content &&
        doc.sections.footer.content["footer-brand"]) ||
      "";

    if (!doc.sections) doc.sections = {};
    if (!doc.sections.footer) doc.sections.footer = { content: {}, hidden: false };
    if (!doc.sections.footer.content) doc.sections.footer.content = {};

    let brand = String(doc.sections.footer.content["footer-brand"] || brandIn || "").trim();
    if (isPlaceholderBrand(brand)) {
      const heroTitle =
        doc.sections.hero && doc.sections.hero.content ? doc.sections.hero.content["hero-title"] : "";
      const fromHero = String(heroTitle || "")
        .split(/[—–-]/)[0]
        .trim();
      if (fromHero && !isPlaceholderHeroTitle(fromHero) && !isBrokenHeadline(fromHero, ctx)) {
        brand = fromHero;
      }
    }
    if (isPlaceholderBrand(brand) && desc) {
      const loc =
        doc.page.location ||
        (AI && typeof AI.extractLocationFromDescription === "function"
          ? AI.extractLocationFromDescription(desc)
          : "");
      const ind = doc.page.industry || ctx.industry || "verksamhet";
      if (loc && ind && ind !== "verksamhet") {
        brand = String(ind).charAt(0).toUpperCase() + String(ind).slice(1) + " " + loc;
      }
    }
    if (brand && isPlaceholderBrand(doc.sections.footer.content["footer-brand"])) {
      doc.sections.footer.content["footer-brand"] = brand.slice(0, 48);
      changed = true;
    }

    const heroImg = heroImageIntegrity(doc, ctx);
    if (!heroImg.ok && global.VisualStock && typeof global.VisualStock.applyToDocument === "function") {
      global.VisualStock.applyToDocument(doc, { replaceStock: true, userText: desc });
      changed = true;
    }

    if (global.AppDocument && typeof global.AppDocument.ensureTextLogo === "function") {
      global.AppDocument.ensureTextLogo(doc, {
        industry: doc.page.industry || ctx.industry,
        brand: doc.sections.footer.content["footer-brand"] || brand,
        location: doc.page.location,
      });
      changed = true;
    }

    return changed;
  }

  global.GenerationIntegrity = {
    looksLikeImageOnlyChat: looksLikeImageOnlyChat,
    isValidBusinessBrief: isValidBusinessBrief,
    isPlaceholderBrand: isPlaceholderBrand,
    isBrokenHeadline: isBrokenHeadline,
    validateDocument: validateDocument,
    assertGenerationIntegrity: assertGenerationIntegrity,
    repairDocumentForCreate: repairDocumentForCreate,
  };
})(typeof window !== "undefined" ? window : globalThis);
