/**
 * Creative Director — ny create-motor (CD Create).
 * Input → Creative Brief → briefLocked. Ingen komposition, design, text eller bild.
 */
(function (global) {
  "use strict";

  const BRIEF_VERSION = "1.0";

  const IDENTITY_PROFILES = [
    {
      id: "quiet-precision",
      concept: "Tyst precision — arbetet talar, inte slogans.",
      emotionalArrival: "Det här håller.",
      forbiddenFeeling: "Billig renoverings-hype eller stressig säljton.",
      emotionalTerritory: "Verkstad, jordnär, tyst stolthet.",
      materialFeel: "Trä, stål, damm i ljus — ärligt.",
      voice: "Korta meningar, saklig, du/ni.",
      entranceDominant: "detalj/bevis",
      photographicDirection: "Närbild finish, händer i arbete.",
    },
    {
      id: "warm-craft",
      concept: "Varm familjehantverkare — nära, trygg, jordnära.",
      emotionalArrival: "Här är det mänskligt.",
      forbiddenFeeling: "Corporate, kall expertis, utrop.",
      emotionalTerritory: "Hemmet, värme, tillit utan skrik.",
      materialFeel: "Trä, textil, naturligt ljus.",
      voice: "Nära och inbjudande, du-form.",
      entranceDominant: "rubrik/välkomnande",
      photographicDirection: "Vardagsnära miljö, aldrig stock-smile.",
    },
    {
      id: "uncompromising-detail",
      concept: "Kompromisslös detaljperfektionist — inget lämnas åt slump.",
      emotionalArrival: "Precision syns direkt.",
      forbiddenFeeling: "Slarv, generisk hantverkare-mall.",
      emotionalTerritory: "Exakt, reserverad, självsäker.",
      materialFeel: "Skarpa kanter, ren yta, kontrollerat ljus.",
      voice: "Kort, exakt, inga superlativ.",
      entranceDominant: "bevis/finish",
      photographicDirection: "Extrem närbild, detalj som bevis.",
    },
    {
      id: "traditional-master",
      concept: "Traditionell finsnickare — arv, tid, hantverkets heder.",
      emotionalArrival: "Respekt för materialet.",
      forbiddenFeeling: "Trendig renoverings-estetik.",
      emotionalTerritory: "Tradition, långsamhet, kvalitet över tid.",
      materialFeel: "Massivt trä, patina, verktyg.",
      voice: "Vördnad för hantverk, saklig respekt.",
      entranceDominant: "material/tradition",
      photographicDirection: "Verktyg, fogar, träets ålder.",
    },
    {
      id: "modern-minimal",
      concept: "Modern minimalism — luft, linje, få element.",
      emotionalArrival: "Lugn kontroll.",
      forbiddenFeeling: "Rörig branschmall, dekorativt brus.",
      emotionalTerritory: "Skandinavisk restraint, vit luft.",
      materialFeel: "Ljus yta, få material, ren geometri.",
      voice: "Minimal prosa, varje ord bär vikt.",
      entranceDominant: "rubrik/luft",
      photographicDirection: "Stor negative space, en tydlig detalj.",
    },
  ];

  const CRAFT_TRADE_PROFILES = {
    carpenter: [
      {
        id: "snickare-presicion-custom",
        concept: "Snickeriarbete med precisionsanpassning — custom lösningar, ingen standard.",
        emotionalArrival: "Ditt projekt framför allt.",
        forbiddenFeeling: "Möbelkedja-estetik, massmöbler, DIY-känsla.",
        emotionalTerritory: "Handgjort, personligt, respekt för hemmet.",
        materialFeel: "Massivt trä, rätt fernissa, exponerade konstruktioner.",
        voice: "Saklig, precis, personlig konsultation.",
        professionalServices: [
          "Köksskåp på mått",
          "Garderober och inbyggd förvaring",
          "Trappor och räcke",
          "Dörrar och reglar",
          "Trävaror och finish",
        ],
        professionalProjects: [
          "Renovering av 70-talskök — ny front, nytt arbetsplan.",
          "Badrumsrenovering med trädetaljer.",
          "Öppning mellan rum — nya vägg- och taklösningar.",
          "Egendesignerad möbel efter kundens skiss.",
        ],
        photographicDirection: "Detaljer av trä, foghantering, framförande av hantverk — aldrig svepande rums-stock.",
      },
      {
        id: "snickare-restoration",
        concept: "Renovering och bevarande — gamla hus, gamla möbler, gamla traditioner.",
        emotionalArrival: "Vi håller hemmet vid liv.",
        forbiddenFeeling: "Allt nytt, trendig minimal-design, IKEA-estetik.",
        emotionalTerritory: "Traditioner, möjligheter, respekt för det gamla.",
        materialFeel: "Patinerat trä, originaldetaljer, autentisk finish.",
        voice: "Kunskap, omsorg, långsiktighet.",
        professionalServices: [
          "Restaurering av gamla möbler",
          "Borttagning och bevarande av original-detaljer",
          "Anpassning till gammalt hus",
          "Nya lösningar i gammal stil",
        ],
        professionalProjects: [
          "1930-talshus: nya snickeriet i original-stil.",
          "Möbelåterställning: gamla kök räddat från 50-talet.",
          "Trapprenövering med bevarade räcken.",
        ],
        photographicDirection: "Före-efter, detaljer av gamla förbindelser, hands-on bevarande.",
      },
    ],
    electrician: [
      {
        id: "elektriker-installation-modern",
        concept: "Eldistribution för moderna hem — säkerhet, effektivitet, framtid.",
        emotionalArrival: "El som funkar utan drama.",
        forbiddenFeeling: "Gammal skyddskabeltrossa, felaktig dimensionering, ständiga strömbrutalfäll.",
        emotionalTerritory: "Säkerhet först, modern teknik, professionell övervakning.",
        materialFeel: "Ny kabeldragning, tydlig beteckning, snygga installationer.",
        voice: "Saklig, säkerhet i fokus, regelbok.",
        professionalServices: [
          "Eldistribution och säkerhet (automatsäkringar)",
          "Nya eltavlor och modernisering",
          "Kabel- och ledningsdragning",
          "Jordfelsbrytare och FI-skydd",
          "Smarta hem-integration",
        ],
        professionalProjects: [
          "Kökrenövering: ny el för induktionsspis och högkvalitativ utrustning.",
          "Badrumsmodernisering med fuktsäker eldragning.",
          "Hela husets modernisering: gammal kopparkabel bytt till ny ledning.",
        ],
        photographicDirection: "Nytilllagd el, tavlor, närvårdade och märkta system — ingen röra.",
      },
    ],
    plumber: [
      {
        id: "rorlare-precision-vatten",
        concept: "Vatten- och avloppsteknik utan svinn och damp — noggrann arbetsplanering.",
        emotionalArrival: "Vattnet flödar rätt vägen.",
        forbiddenFeeling: "Läckage, dålig lukt, felanslutningar, köpt-rätt-nu-felen senare.",
        emotionalTerritory: "Funktionell säkerhet, korrekt dimension, långsiktig lösning.",
        materialFeel: "Koppar- eller plastledning korrekt dimensionerad, rostfritt material.",
        voice: "Teknisk kunskap, saklig dimensionering, förebyggande.",
        professionalServices: [
          "Installation av kök och spis",
          "Badrumsrenövering (dusch, toalett, handfat)",
          "Värme och varmvattensystem",
          "Avloppssystem och skydd",
          "Underhåll och avhjälpande av fel",
        ],
        professionalProjects: [
          "Kökrenövering: nya vattenledningar för diskho, blandare, och diskmaskin.",
          "Badrumsrenövering: väggmonterad toalett med nytt avlopp, dusch med termostat.",
          "Värmerenövering: radiatorer bytta till värmepump.",
        ],
        photographicDirection: "Nytilllagda rör (dolda), snygga monteringar, fungerande system.",
      },
    ],
    painter: [
      {
        id: "malare-finish-quality",
        concept: "Ytor som håller — preparation är allt, färgen är slutpunkten.",
        emotionalArrival: "En vägg som sparar in på framtida målning.",
        forbiddenFeeling: "Dåligt förbered underlag, felaktig färgtyp, snabba lösningar.",
        emotionalTerritory: "Grundlighet, rätt val av färg för miljö, långsiktig kvalitet.",
        materialFeel: "Slätt underlag, rätt färgton för ljus och rum, matt eller silkig finish.",
        voice: "Praktisk kunskap, färgkonsultation, grundlighetsfokus.",
        professionalServices: [
          "Vägg-, tak- och altanmålning",
          "Förpreparation och spackling",
          "Färgkonsultation för hemmet",
          "Specialfärger (mattfärg, plast, lackkvalitet)",
          "Fasadbeskydding",
        ],
        professionalProjects: [
          "Helt renoverad lägenhet: vägg- och takmålning i rätt färgval för ljus.",
          "Villa: ny fasadmålning för väderbeständighet.",
          "Renoveringsprojekt: väggborttagning och omålning för öppnare rum.",
        ],
        photographicDirection: "Före-efter av väggyta, färgval i ljus, släta ytor.",
      },
    ],
    roofer: [
      {
        id: "taklaggare-waterproofing",
        concept: "Takskydd för livslängd — täta fog, rätt lutning, väderbeständighet.",
        emotionalArrival: "Regnet stannar på taket, inte i loftet.",
        forbiddenFeeling: "Läckande fogar, felaktig lutning, billig tilllappning.",
        emotionalTerritory: "Långsiktigt skydd, grundlighet under synlig yta, väderbeständighet.",
        materialFeel: "Täta fog, rätt underlag, modern takbeläggning.",
        voice: "Praktisk väderbeskyddning, granskning före arbete.",
        professionalServices: [
          "Takrenövering (nya takpannor eller takskivor)",
          "Läckage- och fogreparation",
          "Takfönster och ventilation",
          "Snöskydd och räcken",
          "Renovering av gamla tak",
        ],
        professionalProjects: [
          "Helt nytt tak: från gamla pantiles till modern takskivor med värmereglering.",
          "Läckage-jakt och reparation: gamla fogar täta igen.",
          "Fastighetens takfönster: nya fönster med rätt fogning.",
        ],
        photographicDirection: "Taken från insida (torr och tätt), nya takdetaljer, ventilation.",
      },
    ],
  };

  const CAFE_IDENTITY_PROFILES = [
    {
      id: "warm-cafe",
      concept: "Mysigt café — kaffe, doft och värme.",
      emotionalArrival: "Välkommen in.",
      forbiddenFeeling: "Snabbmat-kedja, sterilt, hantverkare-mall.",
      emotionalTerritory: "Fika, värme, långsam stund.",
      materialFeel: "Trä, keramik, ångande kopp.",
      voice: "Varm, enkel, inbjudande.",
      entranceDominant: "stämning",
      photographicDirection: "Kaffe, bakverk och cafémiljö — aldrig generisk stock.",
    },
    {
      id: "neighborhood-cafe",
      concept: "Grannskapscafé — enkelt, gott, nära.",
      emotionalArrival: "Här tar man sin tid.",
      forbiddenFeeling: "Corporate kedja, fel branschton.",
      emotionalTerritory: "Lokal närvaro, vardagslyx.",
      materialFeel: "Naturligt ljus, avslappnad inredning.",
      voice: "Nära och jordnära.",
      entranceDominant: "välkomnande",
      photographicDirection: "Cafébord, kaffe, lokalt — inte strand eller lifeguard.",
    },
  ];

  const BUTIK_IDENTITY_PROFILES = [
    {
      id: "warm-shop",
      concept: "Present och inredning — handplockat med omsorg.",
      emotionalArrival: "Hitta något som känns rätt.",
      forbiddenFeeling: "Massmarket, hantverkare-mall, fel bransch.",
      emotionalTerritory: "Personligt, varmt, inspirerande.",
      materialFeel: "Textur, keramik, mjuka färger.",
      voice: "Inbjudande, personlig.",
      entranceDominant: "produkter/stämning",
      photographicDirection: "Butiksmiljö, inredning, presenter — aldrig verkstad eller strand.",
    },
    {
      id: "curated-interior",
      concept: "Kuraterad inredning — utvalt för hemmet.",
      emotionalArrival: "Rum att trivas i.",
      forbiddenFeeling: "Generisk e-handel, snickeri-estetik.",
      emotionalTerritory: "Lugn inspiration, kvalitet.",
      materialFeel: "Naturliga material, varma toner.",
      voice: "Saklig värme, du/ni.",
      entranceDominant: "inspiration",
      photographicDirection: "Interiör, detaljer, produkter i miljö.",
    },
  ];

  const GENERIC_IDENTITY_PROFILES = [
    {
      id: "modern-minimal",
      concept: "Tydlig verksamhet — enkelt och proffsigt.",
      emotionalArrival: "Lugn kontroll.",
      forbiddenFeeling: "Generisk branschmall, fel hantverkston.",
      emotionalTerritory: "Skandinavisk enkelhet.",
      materialFeel: "Ljus yta, få element.",
      voice: "Minimal prosa, tydligt.",
      entranceDominant: "rubrik",
      photographicDirection: "Relevant miljö för verksamheten — inte slumpmässig stock.",
    },
  ];

  const DESIGN_STYLE_TO_STOCK = {
    "nordisk-ren": "sharp",
    "modern-professionell": "sharp",
    "varm-valkomnande": "soft",
    "mork-exklusiv": "lux",
    "lekfull-kreativ": "soft",
  };

  const VERTICAL_INDUSTRY = {
    cafe: "cafe",
    butik: "inredning",
    craft: "byggfirma",
    generic: "konsult",
  };

  const BUSINESS_TYPE_INDUSTRY = {
    ecommerce: "webbutik",
    "retail-inredning": "inredning",
    cafe: "cafe",
    restaurant: "restaurang",
    salon: "salong",
    craft: "byggfirma",
    consulting: "konsult",
    portfolio: "portfolio",
  };

  /** Titelversalisering — t.ex. "lilla bo" → "Lilla Bo", "LILLA BO" → "Lilla Bo". */
  function normalizeBusinessName(raw) {
    const s = String(raw || "").trim().replace(/\s+/g, " ");
    if (!s) return "";
    const SMALL_WORDS = new Set([
      "och",
      "i",
      "på",
      "av",
      "för",
      "med",
      "till",
      "den",
      "det",
      "en",
      "et",
      "as",
      "ab",
      "hb",
      "kb",
    ]);
    return s
      .split(" ")
      .map(function (word, index) {
        if (/^(ab|hb|kb)$/i.test(word)) return word.toUpperCase();
        if (word.indexOf("-") >= 0) {
          return word
            .split("-")
            .map(function (part) {
              if (!part) return part;
              return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
            })
            .join("-");
        }
        const lower = word.toLowerCase();
        if (index > 0 && SMALL_WORDS.has(lower)) return lower;
        if (word === word.toUpperCase() && word.length > 1) {
          return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        }
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(" ");
  }

  /**
   * Identifierar verksamhetstyp före Concept/Blueprint — avgör komponentstrategi.
   * @returns {string} ecommerce | retail-inredning | restaurant | cafe | salon | craft | consulting | portfolio
   */
  function identifyBusinessType(input) {
    input = input || {};
    const siteType = String(input.siteType || "").toLowerCase();
    const name = String(input.businessName || "");
    const desc = String(input.businessDescription || "");
    const blob = (name + " " + desc).toLowerCase();

    if (siteType === "portfolio" || /\b(fotograf|foto|portfolio|videograf|illustratör|illustrator|kreativ byrå|kreativ byra)\b/.test(blob)) {
      return "portfolio";
    }
    if (
      siteType === "webbutik" ||
      /\b(e-handel|ehandel|webshop|webbutik|onlinebutik|nätbutik|natbutik|ecommerce)\b/.test(blob)
    ) {
      return "ecommerce";
    }
    if (siteType === "restaurang" || /\b(restaurang|matställe|matstalle|fine dining|a la carte)\b/.test(blob)) {
      return "restaurant";
    }
    if (/\b(caf[eé]|café|kaffe|fika|espresso|bistro|bageri|patisserie|konditori)\b/.test(blob)) {
      return "cafe";
    }
    if (/\b(frisör|frisor|frisörssalong|frisorsalong|salong|hårsalong|harsalong|barber|barbershop|skönhet|skonhet|naglar|spa|hudvård|hudvard|kosmetik|makeup)\b/.test(blob)) {
      return "salon";
    }
    if (isPresentInredningBusiness(name, desc) || (/\b(butik|present|inredning|gåva|gavor)\b/.test(blob) && siteType !== "webbutik")) {
      return "retail-inredning";
    }
    if (/\b(hantverk|snickare|bygg|elektriker|rörmokare|rorl|målare|malar|hantverkare|vvs|takläggare|taklaggare|murare|installatör)\b/.test(blob)) {
      return "craft";
    }
    if (
      siteType === "foretag" ||
      /\b(konsult|byrå|byra|advokat|revisor|redovisning|coaching|it-konsult|it-tjänst|it-tjanst|bokföring|bokforing|juridik|ekonomi|hr|rådgivning|radgivning)\b/.test(blob)
    ) {
      return "consulting";
    }
    return "consulting";
  }

  function businessTypeToVertical(businessType) {
    const map = {
      cafe: "cafe",
      restaurant: "cafe",
      "retail-inredning": "butik",
      ecommerce: "butik",
      craft: "craft",
      salon: "generic",
      consulting: "generic",
      portfolio: "generic",
    };
    return map[businessType] || "generic";
  }

  function industryForBusinessType(businessType) {
    return BUSINESS_TYPE_INDUSTRY[businessType] || "konsult";
  }

  function isPresentInredningBusiness(name, desc) {
    const blob = (String(name || "") + " " + String(desc || "")).toLowerCase();
    return /\b(present|presenter|inredning|inrednings|interiör|interior|hemtextil|gåvor|gavor|heminredning|inredningsbutik|presentbutik|dekoration|keramik|hemaccessoar|inredningsdetalj|inredningsbutik)\b/.test(
      blob,
    );
  }

  function resolveBusinessVertical(input) {
    const businessType = input && input.businessType ? input.businessType : identifyBusinessType(input);
    return businessTypeToVertical(businessType);
  }

  function mapDesignStyleToStock(designStyleId) {
    const id = String(designStyleId || "").trim();
    return DESIGN_STYLE_TO_STOCK[id] || "soft";
  }

  function hashStr(s) {
    s = String(s || "");
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function detectCraftTrade(name, description) {
    const blob = (String(name || "") + " " + String(description || "")).toLowerCase();
    if (/\b(snickare|snickeri|trä|möbel|kök|garderob|säng|bord|stol|laminat|träarbete|möbelsnickeri|inredningssnickare|finsnickare)\b/.test(blob)) {
      return "carpenter";
    }
    if (/\b(elektriker|elarbete|eltjänster|ledning|säkerhet|automats|jordfels|elavverkare|el-|elinstallation)\b/.test(blob)) {
      return "electrician";
    }
    if (/\b(rörmokare|vattne|avlopp|rör|varmvatten|värme|värme|värmesystem|rör-|vvs|sanitet|badrum|toalett|handfat)\b/.test(blob)) {
      return "plumber";
    }
    if (/\b(målare|måleri|måling|vägg|tak|färg|lackkvalitet|fasad|målningsarbete|målarpojke|målararbete)\b/.test(blob)) {
      return "painter";
    }
    if (/\b(takläggare|tak|panel|takskivor|pantile|takrenovering|tak-|takmaterial|väderbeständighet|läckage|fog|takfönster)\b/.test(blob)) {
      return "roofer";
    }
    return null;
  }

  function pickCraftProfile(seedText, craftTrade) {
    const profiles = CRAFT_TRADE_PROFILES[craftTrade];
    if (!profiles || !Array.isArray(profiles)) return null;
    const h = hashStr(seedText);
    return profiles[h % profiles.length];
  }

  function pickProfile(seedText, vertical, businessType) {
    const h = hashStr(seedText);
    businessType = businessType || "";
    let pool = GENERIC_IDENTITY_PROFILES;
    if (businessType === "ecommerce" || businessType === "retail-inredning") pool = BUTIK_IDENTITY_PROFILES;
    else if (vertical === "cafe") pool = CAFE_IDENTITY_PROFILES;
    else if (vertical === "butik") pool = BUTIK_IDENTITY_PROFILES;
    else if (vertical === "craft") pool = IDENTITY_PROFILES;
    return pool[h % pool.length];
  }

  /** Create UI-sektion → dokumentsektion (samma mapping som composition, endast CD-input). */
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

  const DEFAULT_SCOPE_SECTIONS = ["hero", "about", "services", "gallery", "faq", "contact"];

  function mapRawScopeToDocIds(rawIds) {
    const CBC = global.CreativeBriefContract;
    const allowed =
      CBC && CBC.ALLOWED_SCOPE_SECTIONS
        ? CBC.ALLOWED_SCOPE_SECTIONS
        : DEFAULT_SCOPE_SECTIONS;
    const seen = new Set();
    const order = [];
    (rawIds || []).forEach(function (rawId) {
      const docId = CREATE_SECTION_TO_DOC[String(rawId || "").trim()] || String(rawId || "").trim();
      if (!allowed.includes(docId) || seen.has(docId)) return;
      seen.add(docId);
      order.push(docId);
    });
    return order;
  }

  /** CD beslutar scope — executors läser endast brief.scope. */
  function buildScopeDecision(input) {
    let sections = mapRawScopeToDocIds(input.scopeSections);
    if (!sections.length) {
      sections = DEFAULT_SCOPE_SECTIONS.slice();
    }
    if (sections.indexOf("hero") === -1) {
      sections.unshift("hero");
    }
    return { sections: sections };
  }

  /** Säkerställ att blueprint får tillräckligt innehåll per verksamhetstyp. */
  function ensureBlueprintScope(scope, businessType) {
    const SECTION_ORDER = ["hero", "about", "services", "gallery", "faq", "booking", "contact"];
    const MIN_BY_TYPE = {
      ecommerce: ["hero", "about", "services", "gallery", "faq", "contact"],
      "retail-inredning": ["hero", "about", "services", "gallery", "contact"],
      restaurant: ["hero", "about", "services", "gallery", "contact"],
      cafe: ["hero", "about", "services", "gallery", "contact"],
      salon: ["hero", "about", "services", "gallery", "booking", "contact"],
      craft: ["hero", "about", "services", "gallery", "faq", "contact"],
      consulting: ["hero", "about", "services", "faq", "contact"],
      portfolio: ["hero", "about", "gallery", "contact"],
    };
    const min = MIN_BY_TYPE[businessType] || MIN_BY_TYPE.consulting;
    const sections = (scope && scope.sections ? scope.sections.slice() : ["hero"]).filter(Boolean);
    const seen = new Set(sections);
    min.forEach(function (id) {
      if (!seen.has(id)) {
        sections.push(id);
        seen.add(id);
      }
    });
    if (sections.indexOf("hero") === -1) sections.unshift("hero");
    sections.sort(function (a, b) {
      const ia = SECTION_ORDER.indexOf(a);
      const ib = SECTION_ORDER.indexOf(b);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
    return { sections: sections };
  }

  function extractLocation(name, desc) {
    const combined = [name, desc].filter(Boolean).join(" ");
    const m = combined.match(/\bi\s+([A-ZÅÄÖ][a-zåäöA-ZÅÄÖ&-]+(?:\s+[A-ZÅÄÖ][a-zåäö&-]+)*)\b/i);
    if (m) return m[1].trim();
    const mLoc = combined.match(
      /\b(?:finns|belägen|ligger|verksam|öppnat|öppnade)\s+i\s+([A-ZÅÄÖ][a-zåäö]+(?:\s+[A-ZÅÄÖ][a-zåäö]+)*)\b/i,
    );
    if (mLoc) return mLoc[1].trim();
    const m2 = combined.match(/\b([A-ZÅÄÖ][a-zåäö]+(?:\s+[A-ZÅÄÖ][a-zåäö]+)*)\s*[.,]?\s*$/);
    if (m2 && m2[1].length < 24) return m2[1].trim();
    return "";
  }

  function resolveLocation(input) {
    input = input || {};
    const explicit = String(input.location || "").trim();
    if (explicit) return explicit;
    return extractLocation(input.businessName || "", input.businessDescription || "");
  }

  function locIn(loc) {
    const l = String(loc || "").trim();
    return l ? " i " + l : "";
  }

  function locDash(loc) {
    const l = String(loc || "").trim();
    return l ? " — " + l : "";
  }

  function hasLoc(loc) {
    return !!String(loc || "").trim();
  }

  function isDigitalBusiness(name, desc) {
    const blob = (String(name || "") + " " + String(desc || "")).toLowerCase();
    return /\b(digital[a]?|online|webb|e-handel|ehandel|distans|remote|saas|appen|plattform|virtuell[a]?|nätet|internet|fjärr|virtuellt)\b/.test(
      blob,
    );
  }

  /** About p2 — ort om angiven, annars materialkänsla (digital variant utan ort). */
  function aboutP2(loc, materialFeel, digital) {
    const l = String(loc || "").trim();
    if (l) return "Vi finns i " + l + ". " + materialFeel;
    if (digital) return materialFeel + " Verksamheten är digital — tillgänglig var du än är.";
    return materialFeel;
  }

  function nameInLoc(name, loc) {
    const l = String(loc || "").trim();
    return l ? name + " i " + l : name;
  }

  /** Avslutar mening med « i ort.» om ort finns, annars fallback. */
  function inLocOr(base, loc, noLocText) {
    const l = String(loc || "").trim();
    if (l) return base + " i " + l + ".";
    return noLocText || base + ".";
  }

  function contactLead(name, loc, tail, digital) {
    const l = String(loc || "").trim();
    if (l) return name + " i " + l + " — " + tail;
    if (digital) return name + " — " + tail;
    return name + " — " + tail;
  }

  function faqWhereWeWork(name, loc, digital) {
    const l = String(loc || "").trim();
    if (l) {
      return {
        q: "Var arbetar ni?",
        a: name + " utgår från " + l + " och tar uppdrag i närområdet efter överenskommelse.",
      };
    }
    if (digital) {
      return {
        q: "Var finns ni?",
        a: name + " är en digital verksamhet — vi tar uppdrag och möten på distans.",
      };
    }
    return {
      q: "Var finns ni?",
      a: "Hör av dig via kontaktformuläret — vi berättar gärna mer om hur vi kan hjälpa.",
    };
  }

  function faqWorksInArea(name, loc) {
    const l = String(loc || "").trim();
    if (!l) return null;
    return {
      q: "Jobbar ni i " + l + "?",
      a: "Ja — " + name + " finns i " + l + " och tar uppdrag i närområdet.",
    };
  }

  function faqAreaOnly(loc, digital) {
    const l = String(loc || "").trim();
    if (l) return l + " och närområde.";
    if (digital) return "Vi arbetar digitalt och tar uppdrag på distans.";
    return "Hör av dig — vi återkommer om hur vi kan hjälpa dig.";
  }

  function buildInput(ctx) {
    ctx = ctx || {};
    const plan = ctx.createBuildPlan || {};
    const name = normalizeBusinessName(
      plan.businessName || ctx.createBusinessName || ctx.brand || "",
    );
    const desc = String(
      plan.businessDescription || ctx.createBusinessDescription || plan.businessBrief || ctx.createBusinessBrief || "",
    ).trim();
    const location =
      String(plan.location || plan.businessLocation || ctx.createBusinessLocation || "").trim() ||
      extractLocation(name, desc);
    const scopeSections =
      plan.sections && plan.sections.length
        ? plan.sections.map(function (s) {
            return s && s.id ? String(s.id) : "";
          })
        : ctx.createSections
          ? ctx.createSections.map(function (s) {
              return s && s.id ? String(s.id) : "";
            })
          : [];
    const siteType = plan.siteType && plan.siteType.id ? plan.siteType.id : ctx.siteType || "";
    const draft = {
      businessName: name,
      businessDescription: desc,
      location: location,
      scopeSections: scopeSections.filter(Boolean),
      siteType: siteType,
      designStyleId: plan.designStyle && plan.designStyle.id ? plan.designStyle.id : "",
    };
    draft.businessType = identifyBusinessType(draft);
    return draft;
  }

  function buildInputFromCreativeBrief(brief) {
    const facts = brief && brief.customerFacts ? brief.customerFacts : {};
    const offer = facts.offer && facts.offer.summary ? String(facts.offer.summary).trim() : "";
    const audience = facts.audience && facts.audience.primary ? String(facts.audience.primary).trim() : "";
    const description = audience && offer.toLowerCase().indexOf(audience.toLowerCase()) === -1
      ? offer + " För " + audience + "."
      : offer;
    const input = {
      businessName: normalizeBusinessName(facts.businessName || ""),
      businessDescription: description,
      location: facts.location && facts.location.primary ? String(facts.location.primary).trim() : "",
      scopeSections: facts.sections && Array.isArray(facts.sections.requested)
        ? facts.sections.requested.slice()
        : [],
      siteType: facts.siteType ? String(facts.siteType).trim() : "",
      designStyleId: facts.design && facts.design.styleId ? String(facts.design.styleId).trim() : "",
    };
    input.businessType = identifyBusinessType(input);
    return input;
  }

  function runStopRule(input, briefValidation) {
    if (!input.businessName) {
      return { pass: false, reason: "missing_business_name" };
    }
    if (!input.businessDescription) {
      return { pass: false, reason: "missing_business_description" };
    }
    if (!briefValidation.ok) {
      return { pass: false, reason: "incomplete_brief", errors: briefValidation.errors };
    }
    return { pass: true };
  }

  /** Generera unik koppling mellan namn och bransch för originell hero-titel. */
  function generateHeroTitle(name, businessType, craftService) {
    // Craft-specific: name + specific service (not just profile concept)
    if (businessType === "craft" && craftService) {
      return name + " — " + craftService.toLowerCase() + ".";
    }
    // Use name alone for authority
    return name + ".";
  }

  /** Generera originell, affärsspecifik hero-lead utan generiska fraser. */
  function generateHeroLead(profile, name, loc, businessType, craftService) {
    const emotion = profile.emotionalArrival || "";
    const l = String(loc || "").trim();
    
    if (businessType === "craft" && craftService) {
      // Craft: lead with concrete benefit, location context
      const locPhrase = l ? " i " + l : "";
      return emotion + " " + craftService + " som håller." + (l ? locPhrase + "." : "");
    }
    
    // Non-craft: avoid generic phrases, use context
    if (emotion.indexOf("Vi hjälper") >= 0 || emotion.indexOf("Välkommen") >= 0) {
      // Replace generic openings with specific value
      return emotion.replace(/Vi hjälper|Välkommen/g, "") + " Specialiserad expertis" + (l ? " i " + l : "") + ".";
    }
    
    return emotion + (l ? " i " + l : "") + ".";
  }

  /** CD beslutar hero-copy — executorn renderar endast brief.hero. */
  function buildHeroDecision(profile, name, loc, vertical, businessType, niche) {
    businessType = businessType || "";
    niche = niche || "";
    const conceptStem = profile.concept.split("—")[0].trim();
    const conceptLower =
      conceptStem.charAt(0).toLowerCase() + (conceptStem.length > 1 ? conceptStem.slice(1) : "");

    // Craft trade specific hero
    if (businessType === "craft" && profile.professionalServices) {
      const primaryService = profile.professionalServices[0] || "Hantverk";
      const secondaryService = profile.professionalServices[1] || "Renovering";
      return {
        title: generateHeroTitle(name, businessType, primaryService),
        lead: primaryService + " på mått" + (loc ? " i " + loc : "") + ". " + secondaryService + " efter dina behov.",
        primaryCta: { text: "Beskriv projektet", href: "#kontakt" },
        secondaryCta: { text: "Se tidigare arbeten", href: "#galleri" },
      };
    }

    if (businessType === "ecommerce" && niche === "smycken") {
      return {
        title: name + ".",
        lead: "Smycken som stannar kvar. Inte massmöbler — personliga detaljer i ädelmetall och halvädla.",
        primaryCta: { text: "Se samlingen", href: "#utbud" },
        secondaryCta: { text: "Om oss", href: "#om" },
      };
    }
    if (businessType === "ecommerce" && niche === "mode") {
      return {
        title: name + " — plagg med riktning.",
        lead: "Inte trender som försvinner nästa vecka. Mode som håller form och betydelse.",
        primaryCta: { text: "Utforska", href: "#utbud" },
        secondaryCta: { text: "Ny kollektionen", href: "#nyheter" },
      };
    }
    if (businessType === "ecommerce" && niche === "inredning") {
      return {
        title: name + ".",
        lead: "Inredning som förändrar rum. Inte bara möbler — välvalda detaljer som höjer vardagen.",
        primaryCta: { text: "Shoppa", href: "#utbud" },
        secondaryCta: { text: "Inspiration", href: "#inspiration" },
      };
    }
    if (businessType === "ecommerce" && niche === "baby") {
      return {
        eyebrow: "För den första tiden",
        title: name + ".",
        lead: "Trygga babysaker och mjuk barnrumsinredning — utvalt för små människor och stora stunder" + (loc ? " i " + loc : "") + ".",
        primaryCta: { text: "Upptäck sortimentet", href: "#utbud" },
        secondaryCta: { text: "Vår omtanke", href: "#om" },
      };
    }
    if (businessType === "ecommerce") {
      return {
        title: name + ".",
        lead: "Handplockat sortiment med tydlig kvalitet — saker som är valda för att användas och hålla.",
        primaryCta: { text: "Se sortiment", href: "#utbud" },
        secondaryCta: { text: "Kontakt", href: "#kontakt" },
      };
    }
    if (businessType === "salon") {
      const locPhrase = loc ? " i " + loc : "";
      return {
        title: name + ".",
        lead: "Hår- och skönhetsbehandlingar gjorda med omsorg" + locPhrase + ". Personlig rådgivning, inte mall.",
        primaryCta: { text: "Boka tid", href: "#boka" },
        secondaryCta: { text: "Våra tjänster", href: "#tjanster" },
      };
    }
    if (businessType === "consulting") {
      const locPhrase = loc ? " — baserad i " + loc : "";
      return {
        title: name + ".",
        lead: "Rådgivning som bygger på kunskap, inte checklista" + locPhrase + ".",
        primaryCta: { text: "Boka konsultation", href: "#kontakt" },
        secondaryCta: { text: "Vad vi gör", href: "#tjanster" },
      };
    }
    if (businessType === "portfolio") {
      return {
        title: name + ".",
        lead: "Utvalda projekt som visar arbetssätt och resultat. Inget filler.",
        primaryCta: { text: "Se arbeten", href: "#galleri" },
        secondaryCta: { text: "Kontakta", href: "#kontakt" },
      };
    }

    if (vertical === "cafe") {
      const locPhrase = loc ? " i " + loc : "";
      return {
        title: name + ".",
        lead: "Kaffe och bakverk gjort utan försäljningshysteri" + locPhrase + ".",
        primaryCta: { text: "Hitta oss", href: "#kontakt" },
        secondaryCta: { text: "Vad vi serverar", href: "#meny" },
      };
    }
    if (vertical === "butik") {
      const locPhrase = loc ? " i " + loc : "";
      return {
        title: name + ".",
        lead: "Presenter och inredning funna för att hålla — inte trendade denna vecka" + locPhrase + ".",
        primaryCta: { text: "Besök oss", href: "#besok" },
        secondaryCta: { text: "Vad vi erbjuder", href: "#sortiment" },
      };
    }

    // Fallback without generic phrases
    return {
      title: name + ".",
      lead: "Specialiserad verksamhet. Expertis i fokus.",
      primaryCta: { text: "Kontakta oss", href: "#kontakt" },
      secondaryCta: { text: "Se mer", href: "#om" },
    };
  }

  /** Generera autentisk about-text utan generiska fraser. */
  function generateAboutParagraph(name, businessType, profile, location, projectExample) {
    if (businessType === "craft" && profile.professionalServices) {
      // Craft: concrete offer + example
      const services = profile.professionalServices.slice(0, 2).join(" och ");
      const locPhrase = location ? " i " + location : "";
      return name + " erbjuder " + services.toLowerCase() + locPhrase + ". Ett exempel: " + (projectExample || "Projekt anpassat efter dina behov").toLowerCase() + ".";
    }
    
    // Non-craft: business personality
    if (businessType === "ecommerce") {
      return name + " är inte en webbutik — det är ett personligt val av varer gjorda för att hålla och växa i värde.";
    }
    if (businessType === "salon") {
      const locPhrase = location ? location : "hemorten";
      return "I " + locPhrase + " är " + name + " känd för att lyssna innan beslut fattas — och att resultatet håller.";
    }
    if (businessType === "consulting") {
      return name + " arbetar med verkliga problem, inte presentationsmallär. Resultat innan rapporter.";
    }
    
    return name + " gör sitt arbete med fokus på resultat. Inget fluff.";
  }

  /** CD beslutar about-copy — executorn renderar endast brief.about. */
  function buildAboutDecision(profile, name, loc, vertical, digital, niche, businessType) {
    niche = niche || "";
    const l = String(loc || "").trim();

    // Craft trade specific about
    if (profile.professionalServices && profile.professionalProjects) {
      const proj = profile.professionalProjects[0] || "";
      return {
        title: "Om " + name,
        p1: generateAboutParagraph(name, "craft", profile, l, proj),
        p2: proj ? "Exempel på tidigare projekt: " + proj.toLowerCase() + "." : "Varje uppdrag anpassas efter dina behov och husets möjligheter.",
      };
    }

    if (niche === "smycken") {
      return {
        title: "Varför " + name,
        p1: name + " kuraterar smycken — varje del väljs för material, form och hållbarhet.",
        p2: l
          ? "Baserad i " + l + ". Personlig service när du har frågor om storlek, skötsel eller design."
          : "Vi svarar snabbt på frågor om material, storlek och passform.",
      };
    }
    if (niche === "mode") {
      return {
        title: "Vem är " + name,
        p1: name + " är inte en trend-diktatör — det är en urval av plagg med egen röst.",
        p2: l ? "Verksam i " + l + " sedan många år." : "Online med fokus på snabb service och enkla returer.",
      };
    }
    if (niche === "inredning") {
      return {
        title: "Om " + name,
        p1: name + " väljer möbler och detaljer för att förbättra rum, inte för att sälja mest.",
        p2: l ? "Butik i " + l + "." : "Online med personlig rådgivning.",
      };
    }
    if (niche === "baby") {
      return {
        eyebrow: "Omsorg i varje detalj",
        title: "Utvalt för barnets första år",
        lead: "Genomtänkta babysaker för sömn, lek och livet mitt emellan.",
        p1: name + " samlar mjuka, praktiska och fina saker för vardagen med en liten — utan att barnrummet behöver kännas opersonligt.",
        p2: "Material, funktion och lugna uttryck får styra urvalet. Varje produkt ska vara enkel att tycka om och lätt att använda.",
      };
    }

    if (vertical === "cafe") {
      const locPhrase = l ? " i " + l : "";
      return {
        title: "Om " + name,
        p1: "Kaffe och bakverk gjort utan automater eller kedjeregler" + locPhrase + ".",
        p2: "Vi öppnar för att en lokal behöver stans att sitta, dricka och andas — inte för försäljningstal.",
      };
    }
    if (vertical === "butik") {
      const locPhrase = l ? " i " + l : "";
      return {
        title: "Om " + name,
        p1: "Presenter och inredningsdetaljer valda för att hålla — inte för att sälja mycket snabbt" + locPhrase + ".",
        p2: "Vi litar på att goda saker säljer sig själva.",
      };
    }

    if (businessType === "salon") {
      const locPhrase = l ? " i " + l : "";
      return {
        title: "Om " + name,
        p1: "Varje besök börjar med lyssnande — vad vill du, hur ser ditt hår ut, vad fungerar i verkligheten" + locPhrase + ".",
        p2: "Vi använder produkter utan skit och arbetar för att resultatet håller mellan besöken.",
      };
    }
    if (businessType === "consulting") {
      return {
        title: "Om " + name,
        p1: name + " är inte en byrå — vi är ett litet team med djup kunskap om en sak.",
        p2: "Vi tar på oss uppdrag vi kan leverera väl, inte allt någon frågar efter.",
      };
    }

    const aboutByProfile = {
      "quiet-precision": {
        title: "Om " + name,
        p1: name + " — precision är inte snålhet. Det är respekt för materialet och tiden.",
        p2: l ? l + ". " + profile.materialFeel : profile.materialFeel,
      },
      "warm-craft": {
        title: "Om " + name,
        p1: profile.emotionalArrival + " " + name + ".",
        p2: l ? "Bas i " + l + "." : "Vi tar både små och stora uppdrag.",
      },
      "uncompromising-detail": {
        title: "Om " + name,
        p1: name + " — precision syns. Vi lämnar ingen detalj åt slump.",
        p2: l ? l + "." : "Precision över tid.",
      },
      "traditional-master": {
        title: "Om " + name,
        p1: "Traditionella tekniker + modern precision = " + name,
        p2: l ? "Verksam i " + l + "." : "Vi arbetar långsiktigt.",
      },
      "modern-minimal": {
        title: "Om " + name,
        p1: name + ". Tydlighet i fokus.",
        p2: l ? "Baserad i " + l + "." : "Enkelt och effektivt.",
      },
    };

    return aboutByProfile[profile.id] || {
      title: "Om " + name,
      p1: name + " — verksamhet utan onödiga omsvep.",
      p2: l ? "Etablerad i " + l + "." : "Vi gör arbetet väl.",
    };
  }

  /** Samma cardCount-logik som cd-composition-executor.resolveCardCount. */
  function resolveServicesCardCount(spatialDensity, concept) {
    const density = String(spatialDensity || "").toLowerCase();
    if (density.indexOf("gener") >= 0) return 2;
    if (density.indexOf("tät") >= 0 || density.indexOf("tat") >= 0) return 3;
    const h = hashStr(concept);
    return h % 5 === 0 ? 2 : 3;
  }

  /** Generera unik service card för hantverk utan generiska fraser. */
  function generateCraftServiceCard(service, profile, name) {
    // Concrete benefit without "Vi hjälper"
    const descriptions = {
      "Köksskåp på mått": "Dimensionerat för ditt kök, din budget, din stil — inte en försäljare på IKEA.",
      "Garderober och inbyggd förvaring": "Säker förvaring som inte bultar eller går sönder — justering ingår.",
      "Dörrar och reglar": "Handgjort eller reparerat — passform och finish som håller.",
      "Trappor och räcke": "Säkerhet först, design andra — eller omvänt, efter dina önskemål.",
      "Eldistribution och säkerhet": "Ny el eller uppdatering av gammal — allt märkt och dimensionerat rätt.",
      "Badrumsrenövering": "Från liten reparation till helt nya badrum — torrt och funktionellt.",
      "Vägg-, tak- och altanmålning": "Preparation gör arbetet — rätt färg för rum och ljus, finish som håller.",
      "Takrenövering": "Från gamla pantiles till ny beläggning — regnet stannar på taket, inte i loftet.",
    };
    
    return descriptions[service] || service + " gjort väl.";
  }

  /** CD beslutar services-copy — executorn renderar endast brief.services. */
  function buildServicesDecision(profile, name, loc, spatialDensity, concept, vertical, digital, businessType) {
    businessType = businessType || "";
    const cardCount = resolveServicesCardCount(spatialDensity, concept);
    const l = String(loc || "").trim();

    // Craft trade specific services
    if (businessType === "craft" && profile.professionalServices && profile.professionalServices.length > 0) {
      const services = profile.professionalServices;
      const cards = services.map(function (service) {
        return {
          title: service,
          body: generateCraftServiceCard(service, profile, name),
        };
      });
      return {
        title: "Vad vi gör",
        lead: "Konkreta tjänster utan jargong.",
        cards: cards.slice(0, cardCount),
      };
    }

    if (businessType === "ecommerce") {
      const cards = [
        { title: "Nyinkomna", body: "Senaste tillskottet — vi uppdaterar med varor vi tycker om." },
        { title: "Säsonger", body: "Höst, vinter, gåvor — sortiment som passar året." },
        { title: "Material & stil", body: "Smycken, mode, inredning — allt grupperat för att du ska hitta ditt." },
      ];
      return {
        title: "Shoppa efter",
        lead: "Tre sätt att utforska sortimentet.",
        cards: cards.slice(0, cardCount),
      };
    }
    if (businessType === "salon") {
      const cards = [
        { title: "Klipp och styling", body: "Rådgivning från start — vad passar ditt hår och din stil?" },
        { title: "Färg", body: "Vi använder produkter utan dåliga kemikalier och gör färgen som håller." },
        { title: "Boka", body: "Ring eller mejla — vi passar in dig när det går för oss." },
      ];
      return {
        title: "Tjänster",
        lead: "Det vi erbjuder.",
        cards: cards.slice(0, cardCount),
      };
    }
    if (businessType === "consulting") {
      const cards = [
        { title: "Konsultation", body: "Första mötet är gratis — vi hör vad du behöver innan något blir dyrt." },
        { title: "Genomförande", body: "Vi gör arbetet själva, inte delegerar det vidare till någon utan erfarenhet." },
      ];
      return {
        title: "Så arbetar vi",
        lead: "Enkelt och direkt.",
        cards: cards,
      };
    }

    if (vertical === "cafe") {
      const cards = [
        { title: "Kaffe", body: "Ordentligt brygg — inte automatkaffebryggare." },
        { title: "Bakverk", body: "Hembakat eller från en lokal bagare — aldrig fryst från fabrik." },
        { title: "Fika", body: "En stund för sig själv, eller samtal — vi stör aldrig." },
      ];
      return {
        title: "Det vi serverar",
        lead: "Enkelt och gjort väl.",
        cards: cards.slice(0, cardCount),
      };
    }
    if (vertical === "butik") {
      const cards = [
        { title: "Presenter", body: "Gåvor för väl valda tillfällen — vi hjälper dig välja." },
        { title: "Inredning", body: "Möbler och detaljer som gör rum levande — inte trendig décor." },
        { title: "Säsong", body: "Ny sak regelbundet — vi uppdaterar när något i nya är värt det." },
      ];
      return {
        title: "Det vi erbjuder",
        lead: "Handplockat för hemmet.",
        cards: cards.slice(0, cardCount),
      };
    }

    // Fallback without generics
    return {
      title: name + " — tjänster",
      lead: "Vad vi gör och hur vi arbetar.",
      cards: [
        { title: "Tjänst ett", body: "En konkret tjänst — utan överflödig komplexitet." },
        { title: "Tjänst två", body: "Något till vi är bra på — resultat fokus." },
      ].slice(0, cardCount),
    };
  }
  /** CD beslutar gallery-copy — executorn renderar endast brief.gallery. */
  function buildGalleryDecision(profile, name, loc, niche) {
    const l = String(loc || "").trim();
    if (niche === "baby") {
      return {
        title: "Små ögonblick, stora minnen",
        lead: "Mjuka stunder, nyfiken lek och detaljer som får följa med genom den första tiden.",
      };
    }
    const galleryByProfile = {
      "quiet-precision": {
        title: "Finish i bild",
        lead: l
          ? name + " — detaljer och arbete i " + l + ", utan generiska stockbilder."
          : name + " — detaljer och arbete, utan generiska stockbilder.",
      },
      "warm-craft": {
        title: "Galleri",
        lead: l
          ? profile.emotionalArrival + " Ögonblicksbilder från " + name + " i " + l + "."
          : profile.emotionalArrival + " Ögonblicksbilder från " + name + ".",
      },
      "uncompromising-detail": {
        title: "Bevis i bild",
        lead: "Detaljer som syns — " + name + ", inte branschgenerisk dekoration.",
      },
      "traditional-master": {
        title: "Arbeten & miljö",
        lead: l
          ? profile.materialFeel + " Bilder som bär " + name + " i " + l + "."
          : profile.materialFeel + " Bilder som bär " + name + ".",
      },
      "modern-minimal": {
        title: name,
        lead: profile.emotionalArrival + " Få, tydliga bilder.",
      },
    };

    return (
      galleryByProfile[profile.id] || {
        title: "Galleri",
        lead: l ? name + " — arbete och miljö i " + l + "." : name + " — arbete och miljö.",
      }
    );
  }

  /** CD beslutar faq-copy — executorn renderar endast brief.faq. */
  function buildFaqDecision(profile, name, loc, digital, niche) {
    const l = String(loc || "").trim();
    if (niche === "baby") {
      return {
        title: "Bra att veta",
        lead: "Svar om material, leverans och hur du väljer rätt för en liten.",
        items: [
          { q: "Hur väljer ni produkter?", a: "Vi tittar på funktion, material och hur produkten fungerar i en riktig småbarnsvardag." },
          { q: "Kan jag få hjälp att välja?", a: "Ja. Berätta barnets ålder och vad du söker, så hjälper vi dig att hitta rätt." },
          { q: "Hur fungerar leverans och retur?", a: "Vi packar omsorgsfullt, skickar snabbt och erbjuder 30 dagars öppet köp." },
        ],
      };
    }
    const headerByProfile = {
      "quiet-precision": {
        title: "Vanliga frågor",
        lead: l
          ? "Svar om arbetssätt och offert — " + nameInLoc(name, loc) + "."
          : "Svar om arbetssätt och offert — " + name + ".",
      },
      "warm-craft": {
        title: "Frågor & svar",
        lead: profile.emotionalArrival + " Det du undrar innan du hör av dig.",
      },
      "uncompromising-detail": {
        title: "Frågor",
        lead: "Tydliga svar — inga generiska formuleringar.",
      },
      "traditional-master": {
        title: "Vanliga frågor",
        lead: "Om arbetssätt, material och hur du tar kontakt med " + name + ".",
      },
      "modern-minimal": {
        title: "FAQ",
        lead: name + " — kort svar på det viktigaste.",
      },
    };

    const areaFaq = faqWorksInArea(name, loc);
    const whereFaq = faqWhereWeWork(name, loc, digital);

    const itemsByProfile = {
      "quiet-precision": [
        {
          q: "Hur begär jag offert?",
          a: "Beskriv projektet via kontaktformuläret — " + name + " återkommer med omfattning och nästa steg.",
        },
        whereFaq,
        {
          q: "Hur ser processen ut?",
          a: "Första kontakt, genomgång, tydlig offert — sedan start enligt plan.",
        },
      ],
      "warm-craft": [
        {
          q: "Hur når jag " + name + "?",
          a: "Ring eller skriv via kontaktformuläret — vi återkopplar så snart vi kan.",
        },
        {
          q: "Vad behöver ni veta innan offert?",
          a: "Kort beskrivning av uppdraget, ungefärlig omfattning och önskad tidpunkt räcker som start.",
        },
      ].concat(
        areaFaq
          ? [areaFaq]
          : [
              {
                q: digital ? "Arbetar ni digitalt?" : "Var finns ni?",
                a: digital
                  ? "Ja — " + name + " tar uppdrag och möten på distans."
                  : "Hör av dig — vi berättar gärna mer om hur vi kan hjälpa.",
              },
            ],
      ),
      "uncompromising-detail": [
        {
          q: "Vad ingår i en offert?",
          a: "Omfattning, material, tidplan och villkor — inget dolt i små text.",
        },
        {
          q: "Hur lång tid tar ett typiskt uppdrag?",
          a: "Beror på omfattning. Efter genomgång får du en realistisk tidsplan.",
        },
        {
          q: "Kan jag se referenser?",
          a: "Bevis finns i galleriet och tjänstebeskrivningen — fråga gärna om liknande projekt.",
        },
      ],
      "traditional-master": [
        {
          q: "Vilka material arbetar ni med?",
          a: profile.materialFeel + " " + name + " väljer material som håller över tid.",
        },
        {
          q: "Hur bokar jag ett första samtal?",
          a: "Kontakta oss via formuläret — vi bokar ett kort samtal om ditt projekt.",
        },
      ].concat(
        l
          ? [
              {
                q: "Arbetar ni endast i " + l + "?",
                a: "Bas i " + l + " — större uppdrag kan diskuteras efter omfattning.",
              },
            ]
          : [
              {
                q: digital ? "Arbetar ni digitalt?" : "Var arbetar ni?",
                a: digital
                  ? name + " tar uppdrag på distans — möten sker digitalt vid behov."
                  : "Hör av dig — vi berättar gärna mer om hur vi kan hjälpa.",
              },
            ],
      ),
      "modern-minimal": [
        {
          q: "Offert?",
          a: "Skicka kort beskrivning — svar med tydlig omfattning.",
        },
        {
          q: "Område?",
          a: faqAreaOnly(loc, digital),
        },
        {
          q: "Nästa steg?",
          a: "Kontakt → genomgång → start enligt plan.",
        },
      ],
    };

    const header = headerByProfile[profile.id] || {
      title: "Vanliga frågor",
      lead: l
        ? nameInLoc(name, loc) + " — svar på det du undrar innan kontakt."
        : name + " — svar på det du undrar innan kontakt.",
    };
    const pool = itemsByProfile[profile.id] || itemsByProfile["quiet-precision"];

    return {
      title: header.title,
      lead: header.lead,
      items: pool.slice(),
    };
  }

  /** CD beslutar booking-copy — executorn renderar endast brief.booking. */
  function buildBookingDecision(profile, name, loc) {
    const l = String(loc || "").trim();
    const locPhrase = l ? " i " + l : "";
    
    // Avoid generic "Välj tid som passar"
    const bookingByProfile = {
      "quiet-precision": {
        title: "Boka tid",
        lead: "Du väljer när — " + name + locPhrase + ".",
        intro: "Bekräftelse samma dag.",
        description: "Vi presenterar inga överraskningar senare.",
      },
      "warm-craft": {
        title: "Ring eller mejla",
        lead: "Vi tar din tid på allvar" + locPhrase + ".",
        intro: "Berätta kort vad du behöver — vi återkommer nästa dag.",
      },
      "uncompromising-detail": {
        title: "Första mötet",
        lead: "Här definieras omfattning och tidplan — inget blir oklarare senare.",
        description: "Vi går aldrig in i ett projekt utan tydlig avtalstext.",
      },
      "traditional-master": {
        title: "Ta kontakt",
        lead: "Vi bokar in dig när det passar både dig och oss.",
        intro: "Första samtal är kostnadsfrits — vi pratar igenom allt.",
      },
      "modern-minimal": {
        title: "Boka",
        lead: "Enkel process" + locPhrase + ".",
        intro: "Bekräftelse omedelbar.",
      },
    };

    return (
      bookingByProfile[profile.id] || {
        title: "Boka tid",
        lead: "Vi bokar in dig när det passar.",
        intro: "Bekräftelse skickas direkt.",
      }
    );
  }

  /** CD beslutar contact-copy — executorn renderar endast brief.contact. */
  function buildContactDecision(profile, name, loc, digital) {
    const l = String(loc || "").trim();
    const locPhrase = l ? " i " + l : "";
    
    // Avoid "Vi hjälper" and "Välkommen" generics
    const contactByProfile = {
      "quiet-precision": {
        title: "Kontakt",
        lead: "Beskriv vad du behöver — vi svarar med omfattning och nästa steg.",
      },
      "warm-craft": {
        title: "Kontakta oss",
        lead: "Ring direkt eller skicka en beskrivning" + locPhrase + " — vi återkommer samma dag.",
      },
      "uncompromising-detail": {
        title: "Skicka underlag",
        lead: "Foto eller beskrivning av projektet — " + name + " svarar med exakt omfattning och pris.",
      },
      "traditional-master": {
        title: "Kontakt",
        lead: "Berätta om projektet — vi tar hand om resten.",
      },
      "modern-minimal": {
        title: "Kontakt",
        lead: "Enkel väg till svar" + locPhrase + ".",
      },
    };

    return (
      contactByProfile[profile.id] || {
        title: "Kontakt",
        lead: "Beskriv vad du söker — vi svarar snabbt.",
      }
    );
  }

  /** CD beslutar design — executorn renderar endast brief.design. */
  function buildDesignDecision(profile, businessType, niche, designStyleId) {
    businessType = businessType || "";
    niche = niche || "";
    if (niche === "baby") {
      const dark = designStyleId === "mork-exklusiv";
      return dark
        ? {
            theme: "baby-evening", template: "editorial",
            colors: { bg: "#192b30", surface: "#254048", text: "#fff8ed", accent: "#ffb35c", primary: "#f47f6b", secondary: "#b9d7cf", border: "rgba(255, 248, 237, 0.16)" },
            accentStyle: "playful", ctaEmphasis: "strong", buttonStyle: "pill",
          }
        : {
            theme: "baby-play", template: "editorial",
            colors: { bg: "#fffaf1", surface: "#dff4ee", text: "#263a3a", accent: "#f47f6b", primary: "#157a74", secondary: "#6b6f72", border: "rgba(21, 122, 116, 0.18)" },
            accentStyle: "playful", ctaEmphasis: "strong", buttonStyle: "pill",
          };
    }
    if (niche === "inredning") {
      const interiorDirections = {
        "nordisk-ren": {
          theme: "interior-nordic", template: "swiss-grid",
          colors: { bg: "#f5f3ed", surface: "#e4e7df", text: "#26302b", accent: "#9a7651", primary: "#385046", secondary: "#77766f", border: "rgba(56, 80, 70, 0.16)" },
          accentStyle: "calm", ctaEmphasis: "balanced", buttonStyle: "",
        },
        "modern-professionell": {
          theme: "interior-gallery", template: "editorial",
          colors: { bg: "#f2f0eb", surface: "#dedbd2", text: "#262421", accent: "#a45f3f", primary: "#313b3b", secondary: "#716c65", border: "rgba(49, 59, 59, 0.16)" },
          accentStyle: "clear", ctaEmphasis: "strong", buttonStyle: "",
        },
        "varm-valkomnande": {
          theme: "interior-terracotta", template: "atelier",
          colors: { bg: "#fbf2e5", surface: "#ead6bd", text: "#442f27", accent: "#c35f3c", primary: "#6c4939", secondary: "#8b6f5c", border: "rgba(108, 73, 57, 0.18)" },
          accentStyle: "warm", ctaEmphasis: "balanced", buttonStyle: "pill",
        },
        "mork-exklusiv": {
          theme: "interior-nocturne", template: "luxury-brand",
          colors: { bg: "#191c19", surface: "#292e29", text: "#f4efe3", accent: "#c69a59", primary: "#dfc18d", secondary: "#aaa497", border: "rgba(244, 239, 227, 0.16)" },
          accentStyle: "luxury", ctaEmphasis: "strong", buttonStyle: "",
        },
        "lekfull-kreativ": {
          theme: "interior-color-studio", template: "editorial",
          colors: { bg: "#fff7e8", surface: "#dce9df", text: "#302c35", accent: "#d85f45", primary: "#356b62", secondary: "#8a6d83", border: "rgba(53, 107, 98, 0.18)" },
          accentStyle: "playful", ctaEmphasis: "strong", buttonStyle: "pill",
        },
      };
      return interiorDirections[designStyleId] || interiorDirections["varm-valkomnande"];
    }
    const designDirections = {
      "nordisk-ren": {
        theme: "nordic-light", template: "swiss-grid",
        colors: { bg: "#f7f8f5", surface: "#e9ede7", text: "#1f2923", accent: "#6f8b78", primary: "#2f4538", secondary: "#68736b", border: "rgba(47, 69, 56, 0.12)" },
        accentStyle: "calm", ctaEmphasis: "balanced", buttonStyle: "",
      },
      "modern-professionell": {
        theme: "modern-professional", template: "editorial",
        colors: { bg: "#f4f7fb", surface: "#e6ebf2", text: "#172033", accent: "#315f8c", primary: "#1d3550", secondary: "#66758a", border: "rgba(29, 53, 80, 0.13)" },
        accentStyle: "clear", ctaEmphasis: "strong", buttonStyle: "",
      },
      "varm-valkomnande": {
        theme: "warm-welcome", template: "atelier",
        colors: { bg: "#fbf6ef", surface: "#f0e4d5", text: "#3d2b24", accent: "#c46f4a", primary: "#704737", secondary: "#846b5e", border: "rgba(112, 71, 55, 0.13)" },
        accentStyle: "warm", ctaEmphasis: "balanced", buttonStyle: "pill",
      },
      "mork-exklusiv": {
        theme: "dark-exclusive", template: "luxury-brand",
        colors: { bg: "#17171b", surface: "#24242b", text: "#f5f1e8", accent: "#c6a15b", primary: "#e0c27c", secondary: "#aaa39a", border: "rgba(245, 241, 232, 0.15)" },
        accentStyle: "luxury", ctaEmphasis: "strong", buttonStyle: "",
      },
      "lekfull-kreativ": {
        theme: "playful-creative", template: "editorial",
        colors: { bg: "#fff8ef", surface: "#f3e8ff", text: "#2b2040", accent: "#e05d8f", primary: "#6546a8", secondary: "#796b8c", border: "rgba(101, 70, 168, 0.14)" },
        accentStyle: "playful", ctaEmphasis: "strong", buttonStyle: "pill",
      },
    };
    if (designDirections[designStyleId]) return designDirections[designStyleId];
    const nicheDesigns = {
      smycken: {
        theme: "minimal-white",
        template: "luxury-brand",
        colors: {
          bg: "#faf8f5",
          surface: "#f0ebe3",
          text: "#1a1814",
          accent: "#a38754",
          primary: "#1a1814",
          secondary: "#6b6560",
          border: "rgba(26, 24, 20, 0.1)",
        },
        accentStyle: "warm",
        ctaEmphasis: "balanced",
        buttonStyle: "pill",
      },
      mode: {
        theme: "minimal-white",
        template: "editorial",
        colors: {
          bg: "#ffffff",
          surface: "#f4f4f5",
          text: "#09090b",
          accent: "#18181b",
          primary: "#09090b",
          secondary: "#71717a",
          border: "rgba(9, 9, 11, 0.12)",
        },
        accentStyle: "",
        ctaEmphasis: "strong",
        buttonStyle: "",
      },
      inredning: {
        theme: "beige-lux",
        template: "luxury-brand",
        colors: {
          bg: "#f9f6f1",
          surface: "#f0e8dc",
          text: "#3a3228",
          accent: "#c4922a",
          primary: "#3a3228",
          secondary: "#7a6f63",
          border: "rgba(58, 50, 40, 0.12)",
        },
        accentStyle: "warm",
        ctaEmphasis: "balanced",
        buttonStyle: "pill",
      },
      gourmet: {
        theme: "beige-lux",
        template: "atelier",
        colors: {
          bg: "#f6f3ec",
          surface: "#e8e0d0",
          text: "#2a2820",
          accent: "#6b7c4c",
          primary: "#2a2820",
          secondary: "#6a665c",
          border: "rgba(42, 40, 32, 0.12)",
        },
        accentStyle: "warm",
        ctaEmphasis: "balanced",
        buttonStyle: "pill",
      },
    };
    if (niche && nicheDesigns[niche]) return nicheDesigns[niche];
    const designs = {
      "quiet-precision": {
        theme: "minimal-white",
        template: "swiss-grid",
        colors: {
          bg: "#f4f6f8",
          surface: "#e8ecf0",
          text: "#1c2530",
          accent: "#3d4f5f",
          primary: "#2c3e50",
          secondary: "#5a6b7a",
          border: "rgba(61, 79, 95, 0.14)",
        },
        accentStyle: "",
        ctaEmphasis: "balanced",
        buttonStyle: "",
      },
      "warm-craft": {
        theme: "beige-lux",
        template: "atelier",
        colors: {
          bg: "#f8f7f3",
          surface: "#efe9df",
          text: "#3a3228",
          accent: "#c4922a",
          primary: "#3a3228",
          secondary: "#7a6f63",
          border: "rgba(58, 50, 40, 0.12)",
        },
        accentStyle: "warm",
        ctaEmphasis: "balanced",
        buttonStyle: "pill",
      },
      "uncompromising-detail": {
        theme: "minimal-white",
        template: "swiss-grid",
        colors: {
          bg: "#f8f9fa",
          surface: "#eef0f2",
          text: "#111827",
          accent: "#374151",
          primary: "#111827",
          secondary: "#6b7280",
          border: "rgba(17, 24, 39, 0.12)",
        },
        accentStyle: "",
        ctaEmphasis: "strong",
        buttonStyle: "",
      },
      "traditional-master": {
        theme: "beige-lux",
        template: "landmark",
        colors: {
          bg: "#f5f0e8",
          surface: "#e8dfd0",
          text: "#2c2419",
          accent: "#8b6914",
          primary: "#2c2419",
          secondary: "#6b5d4d",
          border: "rgba(44, 36, 25, 0.14)",
        },
        accentStyle: "warm",
        ctaEmphasis: "balanced",
        buttonStyle: "",
      },
      "modern-minimal": {
        theme: "minimal-white",
        template: "editorial",
        colors: {
          bg: "#ffffff",
          surface: "#f5f5f4",
          text: "#1c1917",
          accent: "#57534e",
          primary: "#1c1917",
          secondary: "#78716c",
          border: "rgba(28, 25, 23, 0.1)",
        },
        accentStyle: "",
        ctaEmphasis: "subtle",
        buttonStyle: "",
      },
      "warm-cafe": {
        theme: "beige-lux",
        template: "atelier",
        colors: {
          bg: "#f8f4ef",
          surface: "#efe6da",
          text: "#3d3228",
          accent: "#b8863a",
          primary: "#3d3228",
          secondary: "#7a6b5c",
          border: "rgba(61, 50, 40, 0.12)",
        },
        accentStyle: "warm",
        ctaEmphasis: "balanced",
        buttonStyle: "pill",
      },
      "neighborhood-cafe": {
        theme: "beige-lux",
        template: "atelier",
        colors: {
          bg: "#f7f3ed",
          surface: "#ebe3d6",
          text: "#2f2a24",
          accent: "#a67c3d",
          primary: "#2f2a24",
          secondary: "#6f655a",
          border: "rgba(47, 42, 36, 0.12)",
        },
        accentStyle: "warm",
        ctaEmphasis: "balanced",
        buttonStyle: "pill",
      },
      "warm-shop": {
        theme: "beige-lux",
        template: "luxury-brand",
        colors: {
          bg: "#f9f6f1",
          surface: "#f0e8dc",
          text: "#3a3228",
          accent: "#c4922a",
          primary: "#3a3228",
          secondary: "#7a6f63",
          border: "rgba(58, 50, 40, 0.12)",
        },
        accentStyle: "warm",
        ctaEmphasis: "balanced",
        buttonStyle: "pill",
      },
      "curated-interior": {
        theme: "beige-lux",
        template: "luxury-brand",
        colors: {
          bg: "#f6f2eb",
          surface: "#e9e0d2",
          text: "#2c2822",
          accent: "#9a7342",
          primary: "#2c2822",
          secondary: "#6e6559",
          border: "rgba(44, 40, 34, 0.12)",
        },
        accentStyle: "warm",
        ctaEmphasis: "balanced",
        buttonStyle: "",
      },
    };
    if (businessType === "ecommerce" || businessType === "retail-inredning") {
      return designs["warm-shop"] || designs["curated-interior"];
    }
    return designs[profile.id] || designs["quiet-precision"];
  }

  function pickStockHeroUrl(stockDefaults, seed) {
    if (!stockDefaults) return "";
    if (stockDefaults.heroBgUrl) return String(stockDefaults.heroBgUrl).trim();
    const hero = stockDefaults.hero;
    if (Array.isArray(hero) && hero.length) {
      return hero[hashStr(seed) % hero.length];
    }
    return "";
  }

  /** Säkerställ minst en URL per slot — hero, kort (3) och galleri (4). */
  function ensureImagePack(raw, profile, name, businessType) {
    const seed = hashStr(profile.id + "|" + name + "|" + businessType);
    const heroUrl =
      (raw && raw.hero && raw.hero.url) ||
      "https://picsum.photos/seed/cd-" + seed + "-hero/1920/1080";
    const aboutUrl =
      (raw && raw.about && raw.about.url) || heroUrl;

    const cards = ((raw && raw.cards) || []).slice();
    while (cards.length < 3) {
      const i = cards.length;
      cards.push({
        url: "https://picsum.photos/seed/cd-" + seed + "-c" + i + "/640/480",
        alt: name + " " + (i + 1),
      });
    }
    cards.forEach(function (c, i) {
      if (!c || !c.url) {
        cards[i] = {
          url: "https://picsum.photos/seed/cd-" + seed + "-c" + i + "/640/480",
          alt: name + " " + (i + 1),
        };
      }
    });

    const gallery = ((raw && raw.gallery) || []).slice();
    while (gallery.length < 4) {
      const i = gallery.length;
      gallery.push({
        url: "https://picsum.photos/seed/cd-" + seed + "-g" + i + "/800/600",
        alt: name + " galleri " + (i + 1),
      });
    }
    gallery.forEach(function (g, i) {
      const url = typeof g === "string" ? g : g && g.url;
      if (!url) {
        gallery[i] = {
          url: "https://picsum.photos/seed/cd-" + seed + "-g" + i + "/800/600",
          alt: name + " galleri " + (i + 1),
        };
      }
    });

    return {
      hero: { url: heroUrl, alt: name },
      about: { url: aboutUrl, alt: name },
      cards: cards,
      gallery: gallery,
    };
  }

  /** CD beslutar bild-URL:er — kuraterade branschpaket, inte ISE/picsum. */
  function buildImageDecision(profile, name, businessType, stockMood, industryOverride) {
    const VS = global.VisualStock;
    const industry = industryOverride || industryForBusinessType(businessType);
    const tpl = stockMood || "soft";
    let raw = null;
    if (VS && typeof VS.resolvePack === "function") {
      const pack = VS.resolvePack(industry, tpl);
      const heroArr = pack.hero || [];
      const seed = name + "|" + profile.id + "|" + businessType;
      const heroUrl = heroArr.length ? heroArr[hashStr(seed) % heroArr.length] : "";
      if (heroUrl) {
        raw = {
          hero: { url: heroUrl },
          about: { url: pack.about || heroUrl },
          cards: (pack.cards || []).slice(0, 6).map(function (url, i) {
            return { url: url || heroUrl, alt: name + " " + (i + 1) };
          }),
          gallery: (pack.gallery || []).slice(0, 6).map(function (url, i) {
            return { url: url || heroUrl, alt: name + " galleri " + (i + 1) };
          }),
        };
      }
    }
    if (!raw) {
      const seed = hashStr(profile.id + "|" + name + "|" + businessType) % 99991;
      raw = {
        hero: { url: "https://picsum.photos/seed/cd-" + profile.id + "-hero-" + seed + "/1920/1080" },
        about: { url: "https://picsum.photos/seed/cd-" + profile.id + "-about-" + seed + "/800/900" },
        cards: [
          { url: "https://picsum.photos/seed/cd-" + profile.id + "-c0-" + seed + "/640/400" },
          { url: "https://picsum.photos/seed/cd-" + profile.id + "-c1-" + seed + "/640/400" },
          { url: "https://picsum.photos/seed/cd-" + profile.id + "-c2-" + seed + "/640/400" },
        ],
        gallery: [
          { url: "https://picsum.photos/seed/cd-" + profile.id + "-g0-" + seed + "/800/600" },
          { url: "https://picsum.photos/seed/cd-" + profile.id + "-g1-" + seed + "/800/600" },
          { url: "https://picsum.photos/seed/cd-" + profile.id + "-g2-" + seed + "/800/600" },
          { url: "https://picsum.photos/seed/cd-" + profile.id + "-g3-" + seed + "/800/600" },
        ],
      };
    }
    return ensureImagePack(raw, profile, name, businessType);
  }

  function buildTrustDecision(businessType, name) {
    if (businessType === "ecommerce") {
      return {
        items: [
          { label: "Snabb frakt", detail: "Leverans inom 1–3 dagar" },
          { label: "Enkel retur", detail: "30 dagars öppet köp" },
          { label: "Säker betalning", detail: "Klarna, kort & Swish" },
          { label: "Kundservice", detail: "Vi svarar inom 24 h" },
        ],
      };
    }
    if (businessType === "retail-inredning") {
      return {
        items: [
          { label: "Handplockat", detail: "Kuraterat sortiment" },
          { label: "Presentinslag", detail: "Vackert inslagna gåvor" },
          { label: "Butik i " + (name || "stan"), detail: "Välkommen in" },
        ],
      };
    }
    return undefined;
  }

  function buildShopDecision(profile, name, businessType, niche) {
    if (businessType !== "ecommerce") return undefined;
    niche = niche || "";
    if (niche === "smycken") {
      return {
        title: "Utvalda smycken",
        lead: "Handplockade favoriter — material och finish i fokus.",
        products: [
          { title: "Signetring", body: "Mässing med patina — tidlös vardagsdetalj.", badge: "Nyhet", priceHint: "från 890 kr" },
          { title: "Örhängen", body: "Lätta former — subtil lyster till vardags.", badge: "", priceHint: "649 kr" },
          { title: "Halsband", body: "Kedja i varm ton — lager på lager.", badge: "Bestseller", priceHint: "799 kr" },
          { title: "Armband", body: "Justerbar passform — enkel att bära solo.", badge: "", priceHint: "549 kr" },
        ],
      };
    }
    if (niche === "mode") {
      return {
        title: "Nyheter i sortimentet",
        lead: "Plagg med tydlig silhuett — kuraterat, inte överfullt.",
        products: [
          { title: "Ullkappa", body: "Varm struktur — neutral bas i garderoben.", badge: "Nyhet", priceHint: "1 890 kr" },
          { title: "Skjorta", body: "Avslappnad passform — linne och bomull.", badge: "", priceHint: "749 kr" },
          { title: "Stickad tröja", body: "Mjuk yta — lager under kappa.", badge: "", priceHint: "899 kr" },
          { title: "Wide leg", body: "Hög midja — ren linje.", badge: "Bestseller", priceHint: "1 050 kr" },
        ],
      };
    }
    if (niche === "inredning") {
      return {
        title: "Populärt just nu",
        lead: profile.emotionalArrival + " Detaljer till hemmet — kuraterat sortiment.",
        products: [
          { title: "Keramikvas", body: "Handgjord form i varma jordtoner.", badge: "Nyhet", priceHint: "från 349 kr" },
          { title: "Linnekudde", body: "Mjuk struktur — naturliga färger.", badge: "", priceHint: "449 kr" },
          { title: "Doftljus", body: "Lång brinntid, subtil doft.", badge: "Bestseller", priceHint: "279 kr" },
          { title: "Serveringsbricka", body: "Trä och mässing — tidlös detalj.", badge: "", priceHint: "599 kr" },
        ],
      };
    }
    if (niche === "baby") {
      return {
        title: "För små stunder som betyder mycket",
        lead: "Ett genomtänkt urval för sömn, lek, måltider och ett mjukt barnrum.",
        products: [
          { title: "Mjuk start", body: "Filtar, snuttefiltar och textilier i behagliga material.", badge: "Omsorgsfullt valt", priceHint: "från 249 kr" },
          { title: "Lugna sovstunder", body: "Detaljer som gör kvällsrutinen trygg och enkel.", badge: "Populärt", priceHint: "från 329 kr" },
          { title: "Lek & upptäck", body: "Färger, former och leksaker för nyfikna små händer.", badge: "Nyhet", priceHint: "från 199 kr" },
          { title: "Barnrummet", body: "Förvaring och inredning med ett varmt, lekfullt uttryck.", badge: "", priceHint: "från 399 kr" },
        ],
      };
    }
    return {
      title: "Populärt just nu",
      lead: profile.emotionalArrival + " Utvalda produkter från sortimentet.",
      products: [
        {
          title: "Keramikvas",
          body: "Handgjord form i varma jordtoner.",
          badge: "Nyhet",
          priceHint: "från 349 kr",
        },
        {
          title: "Linnekudde",
          body: "Mjuk struktur — naturliga färger.",
          badge: "",
          priceHint: "449 kr",
        },
        {
          title: "Doftljus",
          body: "Lång brinntid, subtil doft.",
          badge: "Bestseller",
          priceHint: "279 kr",
        },
        {
          title: "Serveringsbricka",
          body: "Trä och mässing — tidlös detalj.",
          badge: "",
          priceHint: "599 kr",
        },
      ],
    };
  }

  function buildFeaturedDecision(profile, name, businessType, niche) {
    if (businessType !== "ecommerce") return undefined;
    if (niche === "baby") {
      return {
        headline: "Veckans lilla favorit",
        lead: "En extra omtyckt sak för mys, lek eller vila.",
        body: "Utvald för att vara enkel att använda, fin att leva med och uppskattad länge.",
        action: { label: "Se favoriten", href: "#utbud", emphasis: "primary" },
      };
    }
    return {
      headline: "Veckans favorit",
      lead: "Ett handplockat val från sortimentet — begränsat antal.",
      body: profile.emotionalArrival + " Kvalitet du kan känna redan på bild.",
      action: { label: "Se produkten", href: "#utbud", emphasis: "primary" },
    };
  }

  function buildCategoryDecision(profile, name, businessType) {
    if (businessType !== "retail-inredning") return undefined;
    return {
      title: "Utforska sortimentet",
      lead: profile.emotionalArrival + " Tre ingångar till butiken.",
      categories: [
        { title: "Presenter", body: "Personliga gåvor för stora och små tillfällen." },
        { title: "Inredning", body: "Detaljer som lyfter rummet — kuraterat med omsorg." },
        { title: "Säsong", body: "Nyheter och limited edition — handplockat." },
      ],
    };
  }

  function buildTestimonialDecision(profile, name, businessType) {
    if (businessType !== "consulting" && businessType !== "salon") return undefined;
    const verb = businessType === "salon" ? "besök" : "samarbete";
    return {
      title: "Det säger våra kunder",
      items: [
        {
          quote: "Professionellt och personligt — " + verb + "et kändes tryggt från start.",
          author: "Anna K.",
        },
        {
          quote: name + " levererade mer än vi förväntade oss. Tydlig kommunikation hela vägen.",
          author: "Marcus L.",
        },
      ],
    };
  }

  function buildBrief(input, opts) {
    opts = opts || {};
    const concept = opts.concept || null;
    const businessType = input.businessType || identifyBusinessType(input);
    const vertical = businessTypeToVertical(businessType);
    
    // Detect specific craft trade and use profession-specific profile
    let profile = null;
    if (businessType === "craft") {
      const craftTrade = detectCraftTrade(input.businessName, input.businessDescription);
      if (craftTrade) {
        profile = pickCraftProfile(input.businessName + "|" + input.businessDescription, craftTrade);
      }
    }
    
    // Fall back to generic profile if not craft-specific
    if (!profile) {
      profile = pickProfile(input.businessName + "|" + input.businessDescription, vertical, businessType);
    }
    
    const name = normalizeBusinessName(input.businessName || "");
    const loc = resolveLocation(input);
    const digital = isDigitalBusiness(name, input.businessDescription);
    const stockMood = mapDesignStyleToStock(input.designStyleId);
    const conceptComponents = concept
      ? (concept.componentStrategy && concept.componentStrategy.choices
          ? concept.componentStrategy.choices.map(function (c) {
              return c.component;
            })
          : [])
      : null;
    function hasComponent(type) {
      return conceptComponents ? conceptComponents.indexOf(type) >= 0 : true;
    }
    const scope = conceptComponents
      ? {
          sections: ["hero"]
            .concat(
              conceptComponents.filter(function (c) {
                return c !== "hero" && c !== "brand-header" && c !== "footer";
              }),
            )
            .concat(["contact"]),
        }
      : ensureBlueprintScope(buildScopeDecision(input), businessType);
    const spatialDensity = profile.id === "modern-minimal" ? "generös" : "måttlig";
    const niche = concept && concept.meta ? concept.meta.niche || "" : "";
    const industry =
      (concept && concept.meta && concept.meta.industry) || industryForBusinessType(businessType);
    const hero = buildHeroDecision(profile, name, loc, vertical, businessType, niche);
    const design = buildDesignDecision(profile, businessType, niche, input.designStyleId);
    const images = buildImageDecision(profile, name, businessType, stockMood, industry);
    return {
      briefVersion: BRIEF_VERSION,
      businessFacts: {
        businessName: name,
        location: loc,
        industry: industry,
        siteGoals: [],
        siteType: input.siteType || "",
        vertical: vertical,
        businessType: businessType,
        niche: concept && concept.meta ? concept.meta.niche : "",
      },
      scope: scope,
      concept: profile.concept,
      emotionalArrival: profile.emotionalArrival,
      forbiddenFeeling: profile.forbiddenFeeling,
      singleMessage:
        (concept && concept.narrative && concept.narrative.singleMessage) ||
        name + " — " + profile.concept.split("—")[0].trim().toLowerCase() + ".",
      primaryAction: "Beskriv behovet och ta kontakt.",
      ctaTone: "Inbjudande, låg tröskel, tydligt nästa steg.",
      conversionJourney:
        (concept && concept.narrative && concept.narrative.conversionJourney) ||
        "Förstå vem " + name + " är → se bevis → ta kontakt.",
      emotionalTerritory: profile.emotionalTerritory,
      materialFeel: profile.materialFeel,
      spatialDensity: spatialDensity,
      voice: profile.voice,
      restraintRules: [
        "Inga branschmallfraser.",
        "Inga placeholders.",
        "Inga superlativ som bär hela budskapet.",
      ],
      avoidPhrases: ["Vi hjälper dig vidare…", "Välkommen till vår hemsida", "Din partner"],
      entranceDominant: profile.entranceDominant,
      entranceLeadMode: profile.id === "modern-minimal" ? "textledd" : "balanserad",
      entranceInformationBudget: "minimal",
      narrativePulse: "Tydlig start → lugn mitt → enkel kontakt.",
      narrativePhases: ["identitet", "bevis", "kontakt"],
      trustStrategy: "Konkreta signaler kopplade till " + name + " — inga generiska badges.",
      photographicDirection: profile.photographicDirection,
      forbiddenImagery:
        vertical === "butik" || vertical === "cafe"
          ? ["Kläder", "Mode", "Garderob", "Stock-team", "Generisk bransch-hero", "Ritning som dekoration"]
          : ["Stock-team", "Generisk bransch-hero", "Ritning som dekoration"],
      heroImageIntent: "Entrébild som bevisar " + profile.id + " — inte branschgenerisk.",
      signatureMoment: profile.concept + " synligt i minst ett moment för " + name + ".",
      differentiationTest:
        name +
        " ska skilja sig från annat företag i samma bransch genom identitet (" +
        profile.id +
        "), inte bara namn/ort.",
      hero: hasComponent("hero") ? hero : undefined,
      about: hasComponent("content-block")
        ? buildAboutDecision(profile, name, loc, vertical, digital, niche, businessType)
        : undefined,
      services:
        hasComponent("card-grid") || hasComponent("product-grid")
          ? buildServicesDecision(profile, name, loc, spatialDensity, profile.concept, vertical, digital, businessType)
          : undefined,
      gallery: hasComponent("media-gallery") ? buildGalleryDecision(profile, name, loc, niche) : undefined,
      faq: hasComponent("faq-list") ? buildFaqDecision(profile, name, loc, digital, niche) : undefined,
      booking: hasComponent("cta-band") ? buildBookingDecision(profile, name, loc) : undefined,
      contact: hasComponent("contact-block") ? buildContactDecision(profile, name, loc, digital) : undefined,
      shop: hasComponent("product-grid") ? buildShopDecision(profile, name, businessType, niche) : undefined,
      trust: hasComponent("trust-strip") ? buildTrustDecision(businessType, loc || name) : undefined,
      featured: hasComponent("featured-banner") ? buildFeaturedDecision(profile, name, businessType, niche) : undefined,
      categories: hasComponent("category-showcase") ? buildCategoryDecision(profile, name, businessType) : undefined,
      testimonials: hasComponent("testimonial-strip")
        ? buildTestimonialDecision(profile, name, businessType)
        : undefined,
      design: design,
      images: images,
      _cdMeta: { profileId: profile.id, motor: "creative-director-v1", vertical: vertical, businessType: businessType },
    };
  }

  function conceptComposerDeps() {
    return {
      identifyBusinessType: identifyBusinessType,
      normalizeBusinessName: normalizeBusinessName,
      resolveLocation: resolveLocation,
      isDigitalBusiness: isDigitalBusiness,
      pickProfile: pickProfile,
      businessTypeToVertical: businessTypeToVertical,
      industryForBusinessType: industryForBusinessType,
      buildScopeDecision: buildScopeDecision,
    };
  }

  /**
   * @param {object} input — från buildInput
   * @returns {object} Creative Concept — unikt per verksamhet (ingen branschmall)
   */
  function buildCreativeConcept(input) {
    const Composer = global.CreativeConceptComposer;
    if (!Composer || typeof Composer.composeCreativeConcept !== "function") {
      throw new Error("creative_concept_composer_missing");
    }
    return Composer.composeCreativeConcept(input || {}, conceptComposerDeps());
  }

  /**
   * @param {{ ctx?: object }} opts
   * @returns {{ ok: boolean, conceptLocked?: boolean, blueprintLocked?: boolean, creativeConcept?: object, siteBlueprint?: object, reason?: string, errors?: string[] }}
   */
  function runBlueprint(opts) {
    opts = opts || {};
    const input = opts.customerBrief ? buildInputFromCreativeBrief(opts.customerBrief) : buildInput(opts.ctx);
    if (!input.businessName) {
      return { ok: false, reason: "missing_business_name", errors: ["businessName"] };
    }
    if (!input.businessDescription) {
      return { ok: false, reason: "missing_business_description", errors: ["businessDescription"] };
    }

    const concept = opts.creativeConcept || buildCreativeConcept(input);
    if (opts.creativeConcept && (!concept.execution || typeof concept.execution !== "object")) {
      return {
        ok: false,
        conceptLocked: true,
        blueprintLocked: false,
        creativeConcept: concept,
        reason: "ai_execution_missing",
        errors: ["creativeConcept.execution"],
      };
    }
    const CCC = global.CreativeConceptContract;
    const conceptVal =
      CCC && typeof CCC.validateCreativeConcept === "function"
        ? CCC.validateCreativeConcept(concept, { requireComplete: true })
        : { ok: true, errors: [] };
    if (!conceptVal.ok) {
      return {
        ok: false,
        conceptLocked: false,
        creativeConcept: concept,
        reason: "incomplete_concept",
        errors: conceptVal.errors,
      };
    }

    const brief = opts.creativeConcept
      ? {
          briefVersion: BRIEF_VERSION,
          businessFacts: {
            businessName: concept.meta.businessName,
            location: concept.meta.location,
            industry: concept.meta.industry,
            siteType: concept.meta.siteType,
            niche: concept.meta.niche,
          },
          design: concept.execution.design,
          _cdMeta: { motor: "openai-creative-director", noCreativeFallbacks: true },
        }
      : buildBrief(input, { concept: concept });
    const SBB = global.SiteBlueprintBuilder;
    if (!SBB || typeof SBB.buildSiteBlueprint !== "function") {
      return { ok: false, reason: "blueprint_builder_missing" };
    }
    const blueprint = SBB.buildSiteBlueprint(concept, { brief: brief, input: input });
    const SBC = global.SiteBlueprintContract;
    const bpVal =
      SBC && typeof SBC.validateSiteBlueprint === "function"
        ? SBC.validateSiteBlueprint(blueprint, { requireComplete: true })
        : { ok: true, errors: [] };
    if (!bpVal.ok) {
      return {
        ok: false,
        conceptLocked: true,
        blueprintLocked: false,
        creativeConcept: concept,
        siteBlueprint: blueprint,
        reason: "incomplete_blueprint",
        errors: bpVal.errors,
      };
    }

    return {
      ok: true,
      conceptLocked: true,
      blueprintLocked: true,
      creativeConcept: concept,
      siteBlueprint: blueprint,
      creativeBrief: brief,
    };
  }

  /**
   * @param {{ ctx?: object }} opts
   * @returns {{ ok: boolean, briefLocked: boolean, creativeBrief?: object, reason?: string, errors?: string[] }}
   */
  function run(opts) {
    opts = opts || {};
    const input = opts.customerBrief ? buildInputFromCreativeBrief(opts.customerBrief) : buildInput(opts.ctx);
    const brief = buildBrief(input);
    const CBC = global.CreativeBriefContract;
    const validation =
      CBC && typeof CBC.validateCreativeBrief === "function"
        ? CBC.validateCreativeBrief(brief, { requireComplete: true })
        : { ok: true, errors: [] };
    const stop = runStopRule(input, validation);
    if (!stop.pass) {
      return {
        ok: false,
        briefLocked: false,
        creativeBrief: brief,
        reason: stop.reason,
        errors: stop.errors || validation.errors,
      };
    }
    return {
      ok: true,
      briefLocked: true,
      creativeBrief: brief,
    };
  }

  global.CreativeDirector = {
    run: run,
    runBlueprint: runBlueprint,
    buildInput: buildInput,
    buildInputFromCreativeBrief: buildInputFromCreativeBrief,
    buildCreativeConcept: buildCreativeConcept,
    identifyBusinessType: identifyBusinessType,
    normalizeBusinessName: normalizeBusinessName,
  };
})(typeof window !== "undefined" ? window : globalThis);
