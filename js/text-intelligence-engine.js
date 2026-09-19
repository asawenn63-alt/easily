/**
 * Text Intelligence Engine — professional copywriting for Easily.
 *
 * Collects candidates, scores against business + brand + design memory,
 * rejects weak/generic copy, selects the best.
 *
 * Pipeline: Intent → Design Memory → Edit Session → Execution → TIE.generate
 */
(function (global) {
  "use strict";

  const LOG_TAG = "[Easily · text-intel]";
  const SCHEMA_VERSION = 1;
  const MIN_QUALITY = 0.56;
  const CANDIDATE_ANGLES = 10;
  const TOP_CONSIDER = 8;

  const GENERIC_PHRASES = [
    "din partner",
    "unik upplevelse",
    "världsunik",
    "vi brinner för",
    "one stop",
    "marknadsledande",
    "i världsklass",
    "din one-stop",
    "lösningar för alla",
    "högsta kvalitet varje gång",
    "magiska ögonblick",
    "förvandla dig",
    "revolutionerande",
    "banbrytande",
    "i framkant",
    "din framgång är vår",
  ];

  const SECTION_RULES = {
    hero: {
      label: "Hero",
      short: true,
      powerful: true,
      valueProposition: true,
      strongCta: true,
      maxTitleWords: 14,
      maxLeadWords: 38,
      salesWeight: 0.12,
      trustWeight: 0.08,
    },
    about: {
      label: "About",
      trust: true,
      story: true,
      experience: true,
      human: true,
      maxWords: 90,
      salesWeight: 0.04,
      trustWeight: 0.16,
    },
    services: {
      label: "Services",
      benefitsBeforeFeatures: true,
      simpleLanguage: true,
      maxTitleWords: 8,
      maxBodyWords: 32,
      salesWeight: 0.1,
      trustWeight: 0.08,
    },
    faq: {
      label: "FAQ",
      reduceObjections: true,
      maxAnswerWords: 45,
      salesWeight: 0.03,
      trustWeight: 0.14,
    },
    contact: {
      label: "Contact",
      confidence: true,
      easyToAct: true,
      maxWords: 35,
      salesWeight: 0.05,
      trustWeight: 0.12,
    },
    gallery: {
      label: "Gallery",
      descriptive: true,
      maxTitleWords: 6,
      maxLeadWords: 22,
    },
    cta: {
      label: "CTA",
      action: true,
      maxWords: 4,
      salesWeight: 0.14,
    },
    footer: {
      label: "Footer",
      concise: true,
      maxWords: 6,
    },
  };

  const FIELD_RULES = {
    "hero-title": { section: "hero", kind: "headline", maxWords: 14 },
    "hero-lead": { section: "hero", kind: "subheadline", maxWords: 38 },
    "hero-cta-1-text": { section: "cta", kind: "cta", maxWords: 4 },
    "hero-cta-2-text": { section: "cta", kind: "cta", maxWords: 5 },
    "about-title": { section: "about", kind: "headline", maxWords: 10 },
    "about-p1": { section: "about", kind: "body", maxWords: 90 },
    "about-p2": { section: "about", kind: "body", maxWords: 90 },
    "services-title": { section: "services", kind: "headline", maxWords: 8 },
    "services-lead": { section: "services", kind: "subheadline", maxWords: 32 },
    "gallery-title": { section: "gallery", kind: "headline", maxWords: 6 },
    "gallery-lead": { section: "gallery", kind: "subheadline", maxWords: 22 },
    "faq-title": { section: "faq", kind: "headline", maxWords: 6 },
    "faq-lead": { section: "faq", kind: "subheadline", maxWords: 28 },
    "contact-title": { section: "contact", kind: "headline", maxWords: 5 },
    "contact-lead": { section: "contact", kind: "subheadline", maxWords: 35 },
    "footer-brand": { section: "footer", kind: "headline", maxWords: 6 },
  };

  const TONE_LEXICON = {
    warm: {
      warmth: 0.35,
      formality: -0.15,
      sales: -0.08,
      preferWords: ["välkommen", "trivs", "mjukt", "lugn", "omsorg"],
      avoidWords: ["aggressiv", "maximera", "dominera"],
    },
    warmer: {
      warmth: 0.4,
      formality: -0.2,
      sales: -0.1,
      preferWords: ["välkommen", "varmt", "nära", "personlig"],
      avoidWords: ["formellt", "strikt"],
    },
    professional: {
      formality: 0.35,
      warmth: -0.1,
      sales: -0.05,
      preferWords: ["tydlig", "strukturerad", "erfaren", "kvalitet"],
      avoidWords: ["kul", "grymt", "mega"],
    },
    less_sales: {
      sales: -0.45,
      trust: 0.2,
      preferWords: ["ärlig", "transparent", "rådgivning"],
      avoidWords: ["köp nu", "bästa pris", "erbjudande", "sista chansen"],
    },
    friendlier: {
      warmth: 0.38,
      formality: -0.25,
      preferWords: ["hej", "kul", "enkelt", "gärna"],
      avoidWords: ["härvid", "akten"],
    },
    luxurious: {
      premium: 0.35,
      formality: 0.2,
      warmth: 0.05,
      preferWords: ["exklusiv", "förfinad", "signatur", "kuraterad"],
      avoidWords: ["billig", "snabbfix", "budget"],
    },
    luxury: {
      premium: 0.4,
      formality: 0.25,
      preferWords: ["exklusiv", "premium", "signatur"],
      avoidWords: ["billig", "enkel"],
    },
    playful: {
      warmth: 0.25,
      formality: -0.2,
      preferWords: ["lekfull", "glad", "färg", "energi"],
      avoidWords: ["formell", "strikt", "corporate"],
    },
    minimal: {
      formality: 0.1,
      sales: -0.15,
      preferWords: ["enkel", "ren", "tydlig", "fokus"],
      avoidWords: ["massor", "allt du behöver", "komplett"],
    },
    nordic: {
      warmth: 0.1,
      formality: 0.05,
      preferWords: ["naturlig", "hållbar", "nordisk", "ljus"],
      avoidWords: ["flashy", "bling"],
    },
    scandinavian: {
      warmth: 0.1,
      preferWords: ["skandinavisk", "ljus", "ren", "funktion"],
      avoidWords: ["överdriven", "flashy"],
    },
  };

  const WRITING_ANGLES = [
    { id: "trust", label: "Trust", boost: { trust: 0.15, credibility: 0.1 } },
    { id: "benefit", label: "Benefit", boost: { salesStrength: 0.12, readability: 0.05 } },
    { id: "local", label: "Local", boost: { localRelevance: 0.2 } },
    { id: "story", label: "Story", boost: { originality: 0.1, trust: 0.08 } },
    { id: "expertise", label: "Expertise", boost: { credibility: 0.15, brandConsistency: 0.05 } },
    { id: "outcome", label: "Outcome", boost: { salesStrength: 0.08, readability: 0.08 } },
    { id: "human", label: "Human", boost: { trust: 0.12, naturalLanguage: 0.1 } },
    { id: "service", label: "Service", boost: { seoUsefulness: 0.1, brandConsistency: 0.08 } },
    { id: "calm", label: "Calm", boost: { trust: 0.1, naturalLanguage: 0.08 } },
    { id: "direct", label: "Direct", boost: { readability: 0.12, salesStrength: 0.06 } },
  ];

  function log(stage, payload) {
    try {
      console.info(LOG_TAG, Object.assign({ stage: stage, t: Date.now() }, payload || {}));
    } catch (e) {
      /* ignore */
    }
  }

  function hashStr(s) {
    let h = 0;
    const str = String(s || "");
    for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
    return Math.abs(h);
  }

  function wordCount(text) {
    return String(text || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;
  }

  function normalizeText(text) {
    return String(text || "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function contextToSection(context) {
    if (!context) return "hero";
    if (context.indexOf("hero") >= 0 || context === "cta") return context === "cta" ? "cta" : "hero";
    if (context.indexOf("about") >= 0) return "about";
    if (context.indexOf("services") >= 0) return "services";
    if (context.indexOf("faq") >= 0) return "faq";
    if (context.indexOf("gallery") >= 0) return "gallery";
    if (context.indexOf("contact") >= 0) return "contact";
    return "hero";
  }

  function contextToTargetKey(context) {
    const section = contextToSection(context);
    if (section === "hero" || section === "cta") return "hero:text";
    if (section === "about") return "about:text";
    if (section === "services") return "about:text";
    if (section === "faq") return "about:text";
    if (section === "contact") return "about:text";
    return "hero:text";
  }

  function loadState(doc) {
    doc = doc || (global.SiteState && global.SiteState.get && global.SiteState.get());
    if (!doc) return { rejected: {}, served: {} };
    if (!doc.meta) doc.meta = {};
    if (!doc.meta.textIntelligence) {
      doc.meta.textIntelligence = { version: SCHEMA_VERSION, rejected: {}, served: {} };
    }
    return doc.meta.textIntelligence;
  }

  function persistState(state) {
    const SS = global.SiteState;
    if (!SS || !SS.patch) return;
    SS.patch(function (d) {
      if (!d.meta) d.meta = {};
      d.meta.textIntelligence = JSON.parse(JSON.stringify(state));
    });
    SS.save && SS.save();
  }

  function getRejectedSet(section) {
    const state = loadState();
    const list = (state.rejected && state.rejected[section]) || [];
    const set = {};
    list.forEach(function (t) {
      set[normalizeText(t)] = true;
    });
    return set;
  }

  function getServedList(section) {
    const state = loadState();
    return ((state.served && state.served[section]) || []).slice();
  }

  function recordRejected(section, text) {
    if (!text) return;
    const SS = global.SiteState;
    SS &&
      SS.patch(function (d) {
        const st = loadState(d);
        if (!st.rejected[section]) st.rejected[section] = [];
        const n = normalizeText(text);
        if (
          !st.rejected[section].some(function (t) {
            return normalizeText(t) === n;
          })
        ) {
          st.rejected[section].push(String(text).slice(0, 500));
          if (st.rejected[section].length > 60) st.rejected[section].shift();
        }
        d.meta.textIntelligence = st;
      });
    SS && SS.save && SS.save();
  }

  function recordServed(section, text) {
    if (!text) return;
    const SS = global.SiteState;
    SS &&
      SS.patch(function (d) {
        const st = loadState(d);
        if (!st.served[section]) st.served[section] = [];
        st.served[section].push(String(text).slice(0, 500));
        if (st.served[section].length > 30) st.served[section].shift();
        d.meta.textIntelligence = st;
      });
    SS && SS.save && SS.save();
  }

  function isVariantRequest(text, opts) {
    opts = opts || {};
    if (opts.variant === "another" || opts.variant === "retry") return true;
    const s = String(text || "")
      .toLowerCase()
      .trim();
    return (
      /^(igen|retry|pröva|prova|försök|another|en till|ny version|annan version|skriv om|omformulera)/.test(s) ||
      /(varmare|professionell|mindre sälj|vänligare|lyxigare|mer premium|mer personlig|mer formell)/.test(s)
    );
  }

  function currentSectionText(section) {
    const SS = global.SiteState;
    const doc = SS && SS.get ? SS.get() : null;
    if (!doc || !doc.sections) return "";
    const sec = doc.sections[section];
    if (!sec || !sec.content) return "";
    if (section === "hero") {
      return String(sec.content["hero-title"] || "") + " " + String(sec.content["hero-lead"] || "");
    }
    if (section === "about") {
      return String(sec.content["about-p1"] || "") + " " + String(sec.content["about-p2"] || "");
    }
    return JSON.stringify(sec.content);
  }

  /** Style/tone words → measurable writing requirements */
  function translateTone(userText) {
    const s = String(userText || "").toLowerCase();
    const merged = {
      warmth: 0,
      formality: 0,
      sales: 0,
      trust: 0,
      premium: 0,
      preferWords: [],
      avoidWords: [],
    };

    Object.keys(TONE_LEXICON).forEach(function (key) {
      const hit =
        s.indexOf(key) >= 0 ||
        (key === "warm" && /varmare|varmare|varmare/.test(s)) ||
        (key === "professional" && /professionell/.test(s)) ||
        (key === "less_sales" && /(mindre sälj|mindre salj|inte så sälj)/.test(s)) ||
        (key === "friendlier" && /vänligare|vanligare/.test(s)) ||
        (key === "luxurious" && /(lyxigare|mer lyx|exklusiv)/.test(s));
      if (hit) {
        const row = TONE_LEXICON[key];
        if (row.warmth) merged.warmth += row.warmth;
        if (row.formality) merged.formality += row.formality;
        if (row.sales) merged.sales += row.sales;
        if (row.trust) merged.trust += row.trust;
        if (row.premium) merged.premium += row.premium;
        if (row.preferWords) merged.preferWords = merged.preferWords.concat(row.preferWords);
        if (row.avoidWords) merged.avoidWords = merged.avoidWords.concat(row.avoidWords);
      }
    });

    if (/personlig/.test(s)) merged.warmth += 0.15;
    if (/formell/.test(s)) merged.formality += 0.2;
    if (/kortare/.test(s)) merged.formality += 0.05;

    return merged;
  }

  function buildWritingContext(doc, opts) {
    opts = opts || {};
    doc = doc || (global.SiteState && global.SiteState.get && global.SiteState.get()) || { page: {}, sections: {} };
    const AI = global.AISiteBuilder;
    const page = doc.page || {};
    const brief = String(opts.userText || page.onboardingDescription || "").trim();
    const brand =
      String((doc.sections && doc.sections.footer && doc.sections.footer.content && doc.sections.footer.content["footer-brand"]) || "").trim() ||
      (AI && typeof AI.extractBrandFromDescription === "function" ? AI.extractBrandFromDescription(brief) : "");
    const location =
      String(page.location || "").trim() ||
      (AI && typeof AI.extractLocationFromDescription === "function" ? AI.extractLocationFromDescription(brief) : "");
    const services =
      AI && typeof AI.parseOfferedServicesFromDescription === "function"
        ? AI.parseOfferedServicesFromDescription(brief)
        : [];
    const industry = page.industry || (AI && typeof AI.getIndustry === "function" ? AI.getIndustry() : "verksamhet");
    const template = page.template || (AI && typeof AI.getTemplate === "function" ? AI.getTemplate() : "editorial");

    const cardTitles = [];
    const cards = doc.sections && doc.sections.services && doc.sections.services.cards;
    if (Array.isArray(cards)) {
      cards.forEach(function (c) {
        if (c && c.title) cardTitles.push(String(c.title).trim());
      });
    }

    const toneReq = translateTone(brief);
    const approvedTone = "";
    const acceptedSamples = [];
    let designStyle = template;

    const DM = global.DesignMemoryEngine;
    if (DM && typeof DM.getMemory === "function") {
      const memory = DM.getMemory();
      if (memory.global && memory.global.typographyTone && memory.global.typographyTone.value) {
        toneReq.preferWords.push(String(memory.global.typographyTone.value).toLowerCase());
      }
      if (memory.global && memory.global.visualMood && memory.global.visualMood.value) {
        designStyle = designStyle + " " + memory.global.visualMood.value;
        if (/playful|friendly|varm|warm/.test(String(memory.global.visualMood.value).toLowerCase())) {
          toneReq.warmth += 0.1;
        }
        if (/lux|premium|elegant/.test(String(memory.global.visualMood.value).toLowerCase())) {
          toneReq.premium += 0.15;
        }
        if (/nordic|scandinavian|minimal/.test(String(memory.global.visualMood.value).toLowerCase())) {
          toneReq.formality += 0.05;
          toneReq.sales -= 0.08;
        }
      }
      Object.keys(memory.sections || {}).forEach(function (sec) {
        const textBucket = memory.sections[sec] && memory.sections[sec].text;
        if (textBucket && textBucket.sample && textBucket.sample.value) {
          acceptedSamples.push(String(textBucket.sample.value));
        }
        if (textBucket && textBucket.tone && textBucket.tone.value) {
          acceptedSamples.push(String(textBucket.tone.value));
        }
      });
    }

    if (DM && typeof DM.getConstraints === "function") {
      const hints = DM.getConstraints("hero:text").pickHints || [];
      hints.forEach(function (h) {
        toneReq.preferWords.push(String(h).toLowerCase());
      });
    }

    const personality = inferPersonality(brief, industry);
    const companySize = inferCompanySize(brief);
    const companyAge = inferCompanyAge(brief);

    return {
      doc: doc,
      brief: brief,
      brand: brand,
      location: location,
      services: services,
      cardTitles: cardTitles,
      industry: industry,
      template: template,
      designStyle: designStyle,
      toneReq: toneReq,
      approvedTone: approvedTone,
      acceptedSamples: acceptedSamples,
      personality: personality,
      companySize: companySize,
      companyAge: companyAge,
      localMarket: location || "",
    };
  }

  function inferPersonality(brief, industry) {
    const s = String(brief || "").toLowerCase();
    if (/familj|personlig|varm|hemtrev/.test(s)) return "warm";
    if (/premium|exklusiv|lyx/.test(s)) return "premium";
    if (/lekfull|glad|ung/.test(s)) return "playful";
    if (/professionell|seriös|formell/.test(s)) return "professional";
    if (industry === "advokat" || industry === "konsult") return "professional";
    if (industry === "cafe" || industry === "hunddagis") return "warm";
    return "balanced";
  }

  function inferCompanySize(brief) {
    const s = String(brief || "").toLowerCase();
    if (/litet team|en person|solo|mig själv| ensam /.test(s)) return "solo";
    if (/team|medarbetare|kollegor|anställda/.test(s)) return "team";
    return "small";
  }

  function inferCompanyAge(brief) {
    const s = String(brief || "").toLowerCase();
    const m = s.match(/(\d+)\s*år/i);
    if (m) return m[1] + " years";
    if (/nyetablerad|ny start|nystartad|nyöppnad/.test(s)) return "new";
    if (/sedan|etablerad|erfarenhet/.test(s)) return "established";
    return "";
  }

  function rawGenerate(context, seedText) {
    const AI = global.AISiteBuilder;
    if (AI && typeof AI.generateTemplate === "function") {
      return AI.generateTemplate(context, seedText);
    }
    if (AI && typeof AI.generate === "function") {
      return AI.generate(context, seedText);
    }
    return { text: "" };
  }

  function applyToneTransform(text, toneReq, rules) {
    let t = String(text || "").trim();
    if (!t) return t;

    if (toneReq.warmth > 0.2) {
      t = t.replace(/\bProfessionell\b/g, "Personlig");
      t = t.replace(/\bEffektiv\b/g, "Omsorgsfull");
      if (!/välkommen|varmt|nära/i.test(t) && wordCount(t) > 6) {
        t = t.replace(/^([A-ZÅÄÖ])/, function (m) {
          return m;
        });
      }
    }

    if (toneReq.formality > 0.2) {
      t = t.replace(/\bgrymt\b/gi, "mycket bra");
      t = t.replace(/\bkul\b/gi, "trevligt");
      t = t.replace(/\bhej\b/gi, "Välkommen");
    }

    if (toneReq.formality < -0.15) {
      t = t.replace(/\bVi erbjuder\b/g, "Vi fixar");
      t = t.replace(/\bKontakta oss\b/g, "Hör av dig");
    }

    if (toneReq.sales < -0.2) {
      t = t.replace(/!+/g, ".");
      t = t.replace(/\b(bästa|billigaste|unik[a]?)\b/gi, "");
      t = t.replace(/\s+/g, " ").trim();
    }

    if (toneReq.premium > 0.2) {
      t = t.replace(/\benkel\b/gi, "förfinad");
      t = t.replace(/\bbra\b/gi, "genomtänkt");
    }

    if (toneReq.avoidWords && toneReq.avoidWords.length) {
      toneReq.avoidWords.forEach(function (w) {
        const re = new RegExp("\\b" + w + "\\b", "gi");
        t = t.replace(re, "");
      });
      t = t.replace(/\s+/g, " ").trim();
    }

    if (rules && rules.maxWords && wordCount(t) > rules.maxWords) {
      const words = t.split(/\s+/);
      t = words.slice(0, rules.maxWords).join(" ");
      if (!/[.!?…]$/.test(t)) t += " …";
    }

    return t;
  }

  function injectBrand(text, brand, kind) {
    if (!brand || !text) return text;
    const t = String(text);
    if (t.toLowerCase().indexOf(brand.toLowerCase()) >= 0) return t;
    if (kind === "headline" && wordCount(t) <= 10) {
      return brand + " — " + t.charAt(0).toLowerCase() + t.slice(1);
    }
    return t;
  }

  function injectLocation(text, location, angle) {
    if (!location || !text) return text;
    const t = String(text);
    if (t.toLowerCase().indexOf(location.toLowerCase()) >= 0) return t;
    if (angle === "local" || angle === "trust") {
      return t.replace(/\.\s*$/, "") + " i " + location + ".";
    }
    return t;
  }

  function injectServices(text, services) {
    if (!services || !services.length || !text) return text;
    const t = String(text);
    const svc = services[0];
    if (t.toLowerCase().indexOf(svc.toLowerCase()) >= 0) return t;
    if (wordCount(t) < 20) {
      return t.replace(/\.\s*$/, "") + " — " + svc.toLowerCase() + " och mer.";
    }
    return t;
  }

  function personalizeCandidate(raw, writeCtx, angle, fieldKey) {
    let text = "";
    if (typeof raw === "string") text = raw;
    else if (raw && raw.title) text = raw.title;
    else if (raw && raw.lead) text = raw.lead;
    else if (raw && raw.p1) text = raw.p1;
    else if (raw && raw.text) text = raw.text;
    else if (raw && raw.label) text = raw.label;
    else if (raw && raw.body) text = raw.body;
    else if (raw && raw.q) text = raw.q;
    else text = JSON.stringify(raw);

    const fieldRule = FIELD_RULES[fieldKey] || {};
    const fieldKind = fieldRule.kind || "body";

    if (writeCtx.brand && (fieldKind === "headline" || angle === "story")) {
      text = injectBrand(text, writeCtx.brand, fieldKind);
    }
    if (writeCtx.location && (angle === "local" || angle === "trust")) {
      text = injectLocation(text, writeCtx.location, angle);
    }
    if (writeCtx.services.length && (angle === "service" || angle === "benefit")) {
      text = injectServices(text, writeCtx.services);
    }

    text = applyToneTransform(text, writeCtx.toneReq, fieldRule);
    return text;
  }

  function gatherCandidates(context, seedText, writeCtx, opts) {
    opts = opts || {};
    const section = contextToSection(context);
    const candidates = [];
    const seen = {};

    function pushCandidate(raw, angle, index) {
      const fields = flattenRawToFields(raw, context);
      Object.keys(fields).forEach(function (fieldKey) {
        const text = personalizeCandidate(fields[fieldKey], writeCtx, angle.id, fieldKey);
        const sig = normalizeText(text);
        if (!text || seen[sig]) return;
        seen[sig] = true;
        candidates.push({
          raw: raw,
          text: text,
          fieldKey: fieldKey,
          angle: angle.id,
          index: index,
          source: "generated",
        });
      });
    }

    for (let i = 0; i < CANDIDATE_ANGLES; i++) {
      const angle = WRITING_ANGLES[i % WRITING_ANGLES.length];
      const salt = seedText + "|" + context + "|" + angle.id + "|" + i + "|" + (opts.nonce || Date.now());
      const raw = rawGenerate(context, salt);
      pushCandidate(raw, angle, i);
    }

    if (writeCtx.brief && writeCtx.brief.length > 12 && !global.__AI_GENERATION_FAST__) {
      const AI = global.AISiteBuilder;
      if (AI && typeof AI.composeAboutFromBrief === "function" && (context === "about" || section === "about")) {
        ["p1", "p2"].forEach(function (p, idx) {
          const composed = AI.composeAboutFromBrief(writeCtx.brief, {
            brand: writeCtx.brand,
            location: writeCtx.location,
            paragraph: p,
          });
          const raw = p === "p1" ? { p1: composed } : { p2: composed };
          pushCandidate(raw, WRITING_ANGLES[(idx + 2) % WRITING_ANGLES.length], 100 + idx);
        });
      }
      if (AI && typeof AI.personalizeHeroFromBrief === "function" && context === "hero") {
        const clone = JSON.parse(JSON.stringify(writeCtx.doc));
        AI.personalizeHeroFromBrief(clone, writeCtx.brief);
        const c = clone.sections && clone.sections.hero && clone.sections.hero.content;
        if (c) {
          pushCandidate({ title: c["hero-title"], lead: c["hero-lead"] }, WRITING_ANGLES[3], 200);
        }
      }
    }

    return candidates;
  }

  function flattenRawToFields(raw, context) {
    const out = {};
    if (!raw) return out;
    switch (context) {
      case "hero":
        if (raw.title) out["hero-title"] = raw.title;
        if (raw.lead) out["hero-lead"] = raw.lead;
        break;
      case "about":
        if (raw.p1) out["about-p1"] = raw.p1;
        if (raw.p2) out["about-p2"] = raw.p2;
        break;
      case "services-heading":
        if (raw.title) out["services-title"] = raw.title;
        if (raw.lead) out["services-lead"] = raw.lead;
        break;
      case "gallery-heading":
        if (raw.title) out["gallery-title"] = raw.title;
        if (raw.lead) out["gallery-lead"] = raw.lead;
        break;
      case "faq-heading":
        if (raw.title) out["faq-title"] = raw.title;
        break;
      case "services":
        if (raw.title) out["services-card-title"] = raw.title;
        if (raw.body) out["services-card-body"] = raw.body;
        break;
      case "faq":
        if (raw.q) out["faq-q"] = raw.q;
        if (raw.a) out["faq-a"] = raw.a;
        break;
      case "cta":
        if (raw.label) out["hero-cta-1-text"] = raw.label;
        break;
      default:
        if (raw.text) out["generic"] = raw.text;
    }
    return out;
  }

  function countGenericPhrases(text) {
    const s = normalizeText(text);
    let n = 0;
    GENERIC_PHRASES.forEach(function (p) {
      if (s.indexOf(p) >= 0) n++;
    });
    return n;
  }

  function scoreText(text, context, writeCtx, angleId) {
    const section = contextToSection(context);
    const rules = SECTION_RULES[section] || SECTION_RULES.hero;
    const angle = WRITING_ANGLES.find(function (a) {
      return a.id === angleId;
    }) || WRITING_ANGLES[0];
    const dims = {};

    const genericCount = countGenericPhrases(text);
    dims.originality = Math.max(0, Math.min(1, 0.92 - genericCount * 0.18));

    dims.credibility = 0.62;
    if (writeCtx.brand && text.toLowerCase().indexOf(writeCtx.brand.toLowerCase()) >= 0) dims.credibility += 0.12;
    if (writeCtx.services.length && writeCtx.services.some(function (s) {
      return text.toLowerCase().indexOf(s.toLowerCase()) >= 0;
    })) {
      dims.credibility += 0.1;
    }
    if (/\d+\s*(år|ar|min|kr|%)/i.test(text)) dims.credibility += 0.08;
    if (genericCount > 0) dims.credibility -= genericCount * 0.12;
    dims.credibility = Math.max(0, Math.min(1, dims.credibility));

    const wc = wordCount(text);
    dims.naturalLanguage = wc >= 4 && wc <= 45 ? 0.82 : wc < 4 ? 0.45 : 0.65;
    if (/ — | – /.test(text)) dims.naturalLanguage += 0.05;
    dims.naturalLanguage = Math.min(1, dims.naturalLanguage);

    dims.salesStrength = section === "hero" || section === "cta" ? 0.68 : section === "services" ? 0.58 : 0.42;
    if (toneReqPenalty(writeCtx.toneReq, text, "sales")) dims.salesStrength *= 0.7;
    if (angle.boost && angle.boost.salesStrength) dims.salesStrength = Math.min(1, dims.salesStrength + angle.boost.salesStrength);

    dims.readability = wc <= (rules.maxWords || 40) ? 0.85 : 0.55;
    if (text.length > 320) dims.readability = 0.4;

    const AI = global.AISiteBuilder;
    const keywords =
      AI && AI.INDUSTRIES && AI.INDUSTRIES[writeCtx.industry] && AI.INDUSTRIES[writeCtx.industry].keywords
        ? AI.INDUSTRIES[writeCtx.industry].keywords
        : [];
    dims.seoUsefulness = 0.5;
    keywords.forEach(function (kw) {
      if (text.toLowerCase().indexOf(String(kw).toLowerCase()) >= 0) dims.seoUsefulness += 0.08;
    });
    dims.seoUsefulness = Math.min(1, dims.seoUsefulness);

    dims.trust = 0.6;
    if (/trygg|tydlig|ärlig|erfaren|sedan|rutin|certifierad/i.test(text)) dims.trust += 0.15;
    if (genericCount > 1) dims.trust -= 0.15;
    dims.trust = Math.max(0, Math.min(1, dims.trust));

    dims.consistencyWithAccepted = 0.72;
    if (writeCtx.acceptedSamples.length) {
      let best = 0;
      writeCtx.acceptedSamples.forEach(function (sample) {
        best = Math.max(best, textSimilarity(text, sample));
      });
      dims.consistencyWithAccepted = 0.45 + best * 0.55;
    }

    dims.brandConsistency = 0.65;
    if (writeCtx.brand && text.toLowerCase().indexOf(writeCtx.brand.toLowerCase()) >= 0) dims.brandConsistency += 0.2;
    if (writeCtx.personality === "premium" && /exklusiv|signatur|förfinad/i.test(text)) dims.brandConsistency += 0.1;
    if (writeCtx.personality === "warm" && /välkommen|varm|nära/i.test(text)) dims.brandConsistency += 0.1;
    dims.brandConsistency = Math.min(1, dims.brandConsistency);

    dims.localRelevance = writeCtx.location ? 0.45 : 0.55;
    if (writeCtx.location && text.toLowerCase().indexOf(writeCtx.location.toLowerCase()) >= 0) {
      dims.localRelevance = 0.92;
    }

    const DM = global.DesignMemoryEngine;
    if (DM && typeof DM.validateProposal === "function") {
      const proposal = {
        kind: "text",
        userText: text,
        tone: writeCtx.personality,
        mood: writeCtx.designStyle,
      };
      dims.designMemoryCompatibility = DM.validateProposal(proposal, contextToTargetKey(context)).score;
    } else {
      dims.designMemoryCompatibility = 0.7;
    }

    if (writeCtx.toneReq.preferWords.length) {
      writeCtx.toneReq.preferWords.forEach(function (w) {
        if (text.toLowerCase().indexOf(w) >= 0) dims.brandConsistency = Math.min(1, dims.brandConsistency + 0.04);
      });
    }

    const weights = {
      originality: 0.12,
      credibility: 0.12,
      naturalLanguage: 0.1,
      salesStrength: rules.salesWeight || 0.06,
      readability: 0.1,
      seoUsefulness: 0.06,
      trust: rules.trustWeight || 0.1,
      consistencyWithAccepted: 0.1,
      brandConsistency: 0.1,
      localRelevance: writeCtx.location ? 0.08 : 0.03,
      designMemoryCompatibility: 0.11,
    };

    let sum = 0;
    let wTotal = 0;
    Object.keys(weights).forEach(function (k) {
      if (dims[k] == null) return;
      sum += dims[k] * weights[k];
      wTotal += weights[k];
    });

    const overall = wTotal > 0 ? Math.round((sum / wTotal) * 1000) / 1000 : 0;
    return { overall: overall, dimensions: dims };
  }

  function toneReqPenalty(toneReq, text, axis) {
    if (!toneReq || !toneReq.avoidWords) return false;
    const s = text.toLowerCase();
    if (axis === "sales" && toneReq.sales < -0.15) {
      return /köp|erbjudande|bästa pris|sista chansen|unik/i.test(s);
    }
    return toneReq.avoidWords.some(function (w) {
      return s.indexOf(w) >= 0;
    });
  }

  function textSimilarity(a, b) {
    const x = normalizeText(a);
    const y = normalizeText(b);
    if (!x || !y) return 0.5;
    if (x === y) return 1;
    const ax = x.split(/\s+/);
    const by = y.split(/\s+/);
    let overlap = 0;
    ax.forEach(function (w) {
      if (by.indexOf(w) >= 0) overlap++;
    });
    return overlap / Math.max(ax.length, by.length, 1);
  }

  function pickDiverse(scored, served) {
    if (!scored.length) return null;
    const top = scored.slice(0, TOP_CONSIDER);
    const servedNorm = served.map(normalizeText);
    let best = top[0];
    let bestDiv = -1;

    top.forEach(function (row) {
      let div = 1;
      servedNorm.forEach(function (s) {
        if (textSimilarity(row.primaryText || row.text, s) > 0.72) div -= 0.95;
      });
      const combined = row.overall + div * 0.07;
      if (combined > best.overall + bestDiv * 0.07 - 0.001 || (combined >= best.overall && div > bestDiv)) {
        best = row;
        bestDiv = div;
      }
    });

    return best;
  }

  function selectBestFields(candidates, context, writeCtx, opts) {
    opts = opts || {};
    const section = contextToSection(context);
    const rejected = getRejectedSet(section);
    const served = getServedList(section);

    const fieldGroups = {};
    candidates.forEach(function (c) {
      if (!fieldGroups[c.fieldKey]) fieldGroups[c.fieldKey] = [];
      fieldGroups[c.fieldKey].push(c);
    });

    const chosen = {};
    Object.keys(fieldGroups).forEach(function (fieldKey) {
      const scored = fieldGroups[fieldKey]
        .filter(function (c) {
          return !rejected[normalizeText(c.text)];
        })
        .map(function (c) {
          const s = scoreText(c.text, context, writeCtx, c.angle);
          return Object.assign({}, c, { overall: s.overall, dimensions: s.dimensions, primaryText: c.text });
        })
        .filter(function (row) {
          return row.overall >= MIN_QUALITY;
        })
        .sort(function (a, b) {
          return b.overall - a.overall;
        });

      let pick = pickDiverse(scored, served);
      if (!pick && fieldGroups[fieldKey].length) {
        const fallback = fieldGroups[fieldKey]
          .map(function (c) {
            const s = scoreText(c.text, context, writeCtx, c.angle);
            return Object.assign({}, c, { overall: s.overall, dimensions: s.dimensions, primaryText: c.text });
          })
          .sort(function (a, b) {
            return b.overall - a.overall;
          })[0];
        if (fallback && fallback.overall >= MIN_QUALITY * 0.85) pick = fallback;
      }
      if (pick) chosen[fieldKey] = pick;
    });

    return chosen;
  }

  function assembleResult(chosen, context) {
    const out = {};
    switch (context) {
      case "hero":
        if (chosen["hero-title"]) out.title = chosen["hero-title"].text;
        if (chosen["hero-lead"]) out.lead = chosen["hero-lead"].text;
        break;
      case "about":
        if (chosen["about-p1"]) out.p1 = chosen["about-p1"].text;
        if (chosen["about-p2"]) out.p2 = chosen["about-p2"].text;
        break;
      case "services-heading":
        if (chosen["services-title"]) out.title = chosen["services-title"].text;
        if (chosen["services-lead"]) out.lead = chosen["services-lead"].text;
        break;
      case "gallery-heading":
        if (chosen["gallery-title"]) out.title = chosen["gallery-title"].text;
        if (chosen["gallery-lead"]) out.lead = chosen["gallery-lead"].text;
        break;
      case "faq-heading":
        if (chosen["faq-title"]) out.title = chosen["faq-title"].text;
        break;
      case "services":
        if (chosen["services-card-title"]) out.title = chosen["services-card-title"].text;
        if (chosen["services-card-body"]) out.body = chosen["services-card-body"].text;
        break;
      case "faq":
        if (chosen["faq-q"]) out.q = chosen["faq-q"].text;
        if (chosen["faq-a"]) out.a = chosen["faq-a"].text;
        break;
      case "cta":
        if (chosen["hero-cta-1-text"]) out.label = chosen["hero-cta-1-text"].text;
        break;
      default:
        if (chosen.generic) out.text = chosen.generic.text;
    }

    if (Object.keys(out).length === 0) {
      return rawGenerate(context, "fallback-" + Date.now());
    }
    return out;
  }

  /**
   * Main entry — same return shape as AISiteBuilder.generateTemplate.
   * @param {string} context
   * @param {string} seedText
   * @param {object} [opts] userText, variant, nonce
   */
  async function generate(context, seedText, opts) {
    opts = opts || {};
    const writeCtx = buildWritingContext(null, opts);
    const section = contextToSection(context);

    if (isVariantRequest(opts.userText, opts)) {
      const cur = currentSectionText(section === "cta" ? "hero" : section);
      if (cur.trim()) recordRejected(section, cur.trim());
    }

    const candidates = gatherCandidates(context, seedText, writeCtx, opts);
    const chosen = selectBestFields(candidates, context, writeCtx, opts);
    const result = assembleResult(chosen, context);

    const servedText = [result.title, result.lead, result.p1, result.p2, result.text, result.label, result.body, result.q]
      .filter(Boolean)
      .join(" ");
    if (servedText) recordServed(section, servedText);

    const bestScore =
      Object.keys(chosen).length > 0
        ? Math.max.apply(
            null,
            Object.keys(chosen).map(function (k) {
              return chosen[k].overall || 0;
            }),
          )
        : 0;

    log("SELECT", {
      context: context,
      overall: bestScore,
      fields: Object.keys(chosen),
      pool: candidates.length,
      brand: writeCtx.brand ? writeCtx.brand.slice(0, 24) : undefined,
      angle: opts.variant || "default",
    });

    return result;
  }

  global.TextIntelligenceEngine = {
    SCHEMA_VERSION: SCHEMA_VERSION,
    MIN_QUALITY: MIN_QUALITY,
    SECTION_RULES: SECTION_RULES,
    FIELD_RULES: FIELD_RULES,
    TONE_LEXICON: TONE_LEXICON,
    WRITING_ANGLES: WRITING_ANGLES,
    generate: generate,
    translateTone: translateTone,
    buildWritingContext: buildWritingContext,
    gatherCandidates: gatherCandidates,
    scoreText: scoreText,
    applyToneTransform: applyToneTransform,
    recordRejected: recordRejected,
    log: log,
  };
})(typeof window !== "undefined" ? window : globalThis);
