/**
 * Creative Concept Composer — unikt koncept per verksamhet (ingen branschmall).
 * CD identifierar verksamhetstyp → analyserar nisch → komponerar hierarki + komponenter.
 */
(function (global) {
  "use strict";

  const CONCEPT_VERSION = "1.0";

  function hashStr(s) {
    s = String(s || "");
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function pickFrom(arr, seed) {
    if (!arr || !arr.length) return null;
    return arr[seed % arr.length];
  }

  /** Företagsnamn avslöjar nisch även utan beskrivning — t.ex. Smycka → smycken. */
  function nicheFromBusinessName(name) {
    const n = String(name || "")
      .toLowerCase()
      .replace(/[^a-zåäö0-9]/g, "");
    if (/^(smyck|juvel|jewel|guldsmed)/.test(n) || /smycka$/.test(n)) return "smycken";
    if (/^(mode|stil|boutique|klader|klad)/.test(n)) return "mode";
    if (/^(baby|bebis|barn)/.test(n)) return "baby";
    return null;
  }

  /**
   * @param {object} input
   * @param {{ identifyBusinessType: Function, normalizeBusinessName: Function, resolveLocation: Function, isDigitalBusiness: Function, pickProfile: Function, businessTypeToVertical: Function, industryForBusinessType: Function, buildScopeDecision: Function }} deps
   */
  function analyzeBusinessContext(input, deps) {
    deps = deps || {};
    const businessType =
      input.businessType ||
      (typeof deps.identifyBusinessType === "function" ? deps.identifyBusinessType(input) : "consulting");
    const name =
      typeof deps.normalizeBusinessName === "function"
        ? deps.normalizeBusinessName(input.businessName || "")
        : String(input.businessName || "").trim();
    const desc = String(input.businessDescription || "").trim();
    const blob = (name + " " + desc).toLowerCase();
    const vertical =
      typeof deps.businessTypeToVertical === "function" ? deps.businessTypeToVertical(businessType) : "generic";
    const profile =
      typeof deps.pickProfile === "function"
        ? deps.pickProfile(name + "|" + desc, vertical, businessType)
        : { id: "quiet-precision", concept: "Tydlighet", emotionalArrival: "Klarhet.", forbiddenFeeling: "Rörig mall.", emotionalTerritory: "Nära", voice: "du", photographicDirection: "Naturligt ljus", materialFeel: "Matt" };
    const loc = typeof deps.resolveLocation === "function" ? deps.resolveLocation(input) : "";
    const digital =
      typeof deps.isDigitalBusiness === "function" ? deps.isDigitalBusiness(name, desc) : false;
    const seed = hashStr(name + "|" + desc + "|" + businessType);
    const seedB = hashStr(desc + "|" + name + "|" + profile.id);

    let niche = "generisk";
    let nicheLabel = "verksamheten";
    let customerIntent = "förstå och ta kontakt";

    if (businessType === "ecommerce" || businessType === "retail-inredning") {
      const fromName = nicheFromBusinessName(name);
      if (fromName === "smycken") {
        niche = "smycken";
        nicheLabel = "smycken och accessoarer";
        customerIntent = "hitta rätt smycke med trygghet";
      } else if (fromName === "mode") {
        niche = "mode";
        nicheLabel = "mode och personlig stil";
        customerIntent = "upptäcka stil och shoppa";
      } else if (fromName === "baby" || /\b(baby\w*|bebis\w*|nyfödd\w*|barn\w*|småbarn\w*|spädbarn\w*|leksak\w*)\b/.test(blob)) {
        niche = "baby";
        nicheLabel = "babysaker och barnrumsinredning";
        customerIntent = "hitta trygga, fina produkter för barnets första tid";
      } else if (/\b(smycken|smycka|jewelry|juvel|ring|halsband|örhäng|orhang|armband|accessoar)\b/.test(blob)) {
        niche = "smycken";
        nicheLabel = "smycken och accessoarer";
        customerIntent = "hitta rätt smycke med trygghet";
      } else if (/\b(kläder|klader|klänning|kläd|mode|fashion|boutique|streetwear|skor|garderob)\b/.test(blob)) {
        niche = "mode";
        nicheLabel = "mode och personlig stil";
        customerIntent = "upptäcka stil och shoppa";
      } else if (
        /\b(inredning|hem|keramik|present|interiör|interior|möbel|mobel|dekoration|inredningsbutik|presentbutik)\b/.test(
          blob,
        )
      ) {
        niche = "inredning";
        nicheLabel = "inredning och presenter";
        customerIntent = "känna stämning och hitta detaljer till hemmet";
      } else if (/\b(livsmedel|gourmet|choklad|deli|te |matbox|honung|olivolja)\b/.test(blob)) {
        niche = "gourmet";
        nicheLabel = "smak och utvalda råvaror";
        customerIntent = "upptäcka smaker och handla";
      } else {
        niche = "sortiment";
        nicheLabel = "sortimentet";
        customerIntent = "bläddra och handla";
      }
    } else if (businessType === "salon") {
      niche = /\bbarber\b/.test(blob) ? "barber" : "salong";
      nicheLabel = niche === "barber" ? "barbering" : "salong och behandling";
      customerIntent = "boka tid och känna sig välkommen";
    } else if (businessType === "restaurant") {
      niche = /\b(fine dining|gourmet|michelin)\b/.test(blob) ? "fine-dining" : "restaurang";
      nicheLabel = "mat och upplevelse";
      customerIntent = "känna aptit och boka bord";
    } else if (businessType === "portfolio") {
      niche = /\b(foto|fotograf)\b/.test(blob) ? "foto" : "kreativt";
      nicheLabel = "kreativt arbete";
      customerIntent = "se stil och starta samarbete";
    } else if (businessType === "craft") {
      niche = /\b(electri|el-|elektriker)\b/.test(blob) ? "elektriker" : "hantverk";
      nicheLabel = "hantverk och kvalitet";
      customerIntent = "beskriva uppdraget och få offert";
    } else if (businessType === "consulting") {
      niche = /\b(advokat|jurid)\b/.test(blob) ? "juridik" : "konsult";
      nicheLabel = niche === "juridik" ? "juridisk rådgivning" : "rådgivning";
      customerIntent = "förstå expertis och ta kontakt";
    }

    let industry =
      typeof deps.industryForBusinessType === "function" ? deps.industryForBusinessType(businessType) : "konsult";
    if (niche === "inredning") industry = businessType === "ecommerce" ? "webbutik" : "inredning";
    else if (niche === "baby") industry = "baby";
    else if (niche === "smycken") industry = "smycken";
    else if (niche === "mode") industry = "mode";
    else if (niche === "gourmet") industry = "webbutik";
    else if (niche === "foto") industry = "portfolio";

    const userScope =
      typeof deps.buildScopeDecision === "function" ? deps.buildScopeDecision(input) : { sections: [] };

    return {
      businessType: businessType,
      vertical: vertical,
      profile: profile,
      name: name,
      desc: desc,
      blob: blob,
      loc: loc,
      digital: digital,
      seed: seed,
      seedB: seedB,
      niche: niche,
      nicheLabel: nicheLabel,
      customerIntent: customerIntent,
      industry: industry,
      userScope: userScope,
    };
  }

  function composeInformationHierarchy(ctx) {
    const name = ctx.name;
    const arrivalPurpose =
      ctx.businessType === "ecommerce"
        ? name + " ska kännas som " + ctx.nicheLabel + " redan i entrén — inte generisk e-handelsmall"
        : ctx.businessType === "consulting"
          ? "Tydlig expertis och förtroende för " + name + " direkt"
          : "Skapa igenkänning kring " + ctx.nicheLabel + " utan brus";

    const proofPurpose =
      ctx.businessType === "ecommerce"
        ? "Visa varför " + name + " skiljer sig inom " + ctx.nicheLabel + " — bevis före katalogkänsla"
        : ctx.businessType === "portfolio"
          ? "Låt arbeten bära stilen — galleri som huvudbevis"
          : "Konkret utbud och bevis kopplat till " + ctx.nicheLabel;

    const actionPurpose =
      ctx.businessType === "ecommerce"
        ? "Gör det enkelt att handla, fråga om leverans eller nå kundservice"
        : ctx.businessType === "salon"
          ? "Boka tid eller hitta hit — låg tröskel"
          : "Enkelt nästa steg med " + name;

    let dominantMoment = "proof";
    if (ctx.profile.id === "modern-minimal" || ctx.businessType === "consulting") dominantMoment = "arrival";
    if (ctx.niche === "smycken" || ctx.niche === "mode") dominantMoment = "proof";
    if (ctx.niche === "inredning" && ctx.businessType === "retail-inredning") dominantMoment = "arrival";
    if (ctx.businessType === "portfolio") dominantMoment = "proof";
    if ((ctx.seedB >> 3) % 5 === 0 && ctx.businessType === "ecommerce") {
      dominantMoment = dominantMoment === "arrival" ? "proof" : "arrival";
    }

    return {
      phases: [
        { id: "arrival", purpose: arrivalPurpose, priority: 1 },
        { id: "proof", purpose: proofPurpose, priority: 2 },
        { id: "action", purpose: actionPurpose, priority: 3 },
      ],
      dominantMoment: dominantMoment,
    };
  }

  function composeConversionJourney(ctx) {
    const loc = ctx.loc ? " i " + ctx.loc : "";
    if (ctx.businessType === "ecommerce") {
      const journeys = {
        inredning: "Känn rummet → utforska kategorier → handla eller fråga om leverans",
        baby: "Känn tryggheten → upptäck produkter för första tiden → handla eller fråga om råd",
        smycken: "Förstå stilen → se utvalda smycken → köp eller kontakta rådgivning",
        mode: "Se lookbook → bläddra sortiment → handla eller få storleksråd",
        gourmet: "Upptäck smaker → välj produkter → beställ eller fråga om råvaror",
        sortiment: "Känna igen " + ctx.name + " → se utbud → handla eller kontakta",
      };
      return journeys[ctx.niche] || journeys.sortiment;
    }
    if (ctx.businessType === "retail-inredning") {
      return "Känn butiksstämningen" + loc + " → se sortiment → besök eller kontakta";
    }
    if (ctx.businessType === "salon") {
      return "Känn atmosfären → se behandlingar → boka tid";
    }
    if (ctx.businessType === "restaurant" || ctx.businessType === "cafe") {
      return "Känn stämningen → se utbud → boka eller hitta hit";
    }
    if (ctx.businessType === "portfolio") {
      return "Se stil och ton → bläddra arbeten → starta samtal";
    }
    if (ctx.businessType === "craft") {
      return "Förstå hantverket → se arbetssätt → beskriv projektet";
    }
    return "Förstå vem " + ctx.name + " är → se bevis → ta kontakt";
  }

  function composeAudience(ctx) {
    const needsByType = {
      ecommerce: {
        inredning: ["Inspiration", "Kvalitet", "Trygg leverans"],
        baby: ["Trygghet", "Mjuka material", "Enkel shopping"],
        smycken: ["Stil", "Trygghet", "Personlig känsla"],
        mode: ["Trend", "Passform", "Enkel shopping"],
        gourmet: ["Smak", "Hantverk", "Leverans"],
        sortiment: ["Sortiment", "Trygghet", "Enkel köpupplevelse"],
      },
      consulting: ["Tydlighet", "Förtroende", "Struktur"],
      craft: ["Kvalitet", "Precision", "Nära dialog"],
      salon: ["Styling", "Omsorg", "Enkel bokning"],
      portfolio: ["Stil", "Bevis", "Enkel kontakt"],
    };

    let needs = ["Tydlighet", "Förtroende", "Enkel kontakt"];
    if (ctx.businessType === "ecommerce" && needsByType.ecommerce[ctx.niche]) {
      needs = needsByType.ecommerce[ctx.niche];
    } else if (needsByType[ctx.businessType]) {
      needs = Array.isArray(needsByType[ctx.businessType])
        ? needsByType[ctx.businessType]
        : needsByType[ctx.businessType];
    }

    const primary =
      ctx.businessType === "ecommerce"
        ? "Shoppare som söker " + ctx.nicheLabel + " med tydlig känsla — inte en generisk webshop"
        : ctx.businessType === "consulting"
          ? "Beslutsfattare som behöver " + ctx.nicheLabel + " med tydlig expertis"
          : "Människor som söker " + ctx.nicheLabel + " hos " + ctx.name;

    return {
      primary: primary,
      needs: needs,
      relationship: ctx.profile.voice.indexOf("du") >= 0 ? "du" : "ni",
    };
  }

  /** Kandidat med poäng — väljs och ordnas per verksamhet, inte mall. */
  function buildComponentCandidates(ctx) {
    const name = ctx.name;
    const niche = ctx.niche;
    const bt = ctx.businessType;
    const seed = ctx.seed;
    const seedB = ctx.seedB;
    const list = [];

    function cand(component, variant, phase, score, why) {
      list.push({
        component: component,
        variant: variant,
        servesPhase: phase,
        score: score + (hashStr(component + "|" + name) % 11),
        why: why,
      });
    }

    const heroVariant =
      ctx.profile.id === "modern-minimal" && seed % 6 === 0 ? "text-minimal" : "immersive-fullbleed";
    cand(
      "hero",
      heroVariant,
      "arrival",
      1000,
      heroVariant === "text-minimal"
        ? name + " behöver typografisk tyngd före bild — budskapet bär entrén."
        : name + " säljs genom stämning i " + ctx.nicheLabel + " — hero ska bevisa det direkt.",
    );

    if (bt === "ecommerce") {
      if (niche === "baby") {
        cand("content-block", "prose-with-media", "arrival", 930, "Omsorg, material och vardag behöver synas med en varm bild tidigt.");
        cand("product-grid", "four-up", "proof", 960, "Babysortimentet ska visas med relevanta produktbilder och tydliga användningsområden.");
        cand("media-gallery", "masonry", "proof", 920, "Miljöbilder från barnets första tid gör sidan levande och trovärdig.");
        cand("trust-strip", "inline", "arrival", 850, "Trygga material, leverans och enkla returer är viktiga köpsignaler.");
        cand("featured-banner", "split", "proof", 840, "Ett varmt redaktionellt avbrott ger sortimentet personlighet.");
      } else if (niche === "inredning") {
        cand("trust-strip", "inline", "arrival", 780, "Förtroende kring leverans och kvalitet — viktigt när " + name + " säljer detaljer till hemmet.");
        cand("category-showcase", "row", "proof", 860 + (seedB % 20), "Tre ingångar till sortimentet — inspiration före produktlistor för inredning.");
        cand("content-block", "prose-only", "arrival", 720, "Berättelsen om kurering — " + name + " ska kännas handplockat, inte som marketplace.");
        cand("product-grid", seed % 2 ? "four-up" : "three-up", "proof", 840, "Utvalda produkter med pris — köpbar överblick utan tjänstekort.");
        cand("featured-banner", "split", "proof", 800 + (seed % 15), "Veckans favorit fångar blicken — typiskt för inredning där ett objekt sätter tonen.");
        cand("media-gallery", "masonry", "proof", 830, "Miljöbilder visar hur produkter lever i rum — viktigare än platta katalograder.");
      } else if (niche === "smycken") {
        cand("content-block", "prose-with-media", "arrival", 900, "Smycken säljs via närhet och materialkänsla — berättelse med bild före grid.");
        cand("product-grid", "three-up", "proof", 950, "Utvalda smycken i fokus — få, tydliga produkter med pris.");
        cand("featured-banner", "split", "proof", 920, "Signaturpjäs eller kollektion — smycken behöver ett tydligt hero-objekt.");
        cand("testimonial-strip", "simple", "proof", 860, "Social proof bygger trygghet vid köp av smycken online.");
        cand("media-gallery", "grid-tight", "proof", 880, "Detaljbilder på metall, sten och finish — bevis på hantverk.");
        cand("trust-strip", "inline", "arrival", 650, "Retur och säker betalning — diskret men viktigt efter stilintroduktionen.");
      } else if (niche === "mode") {
        cand("product-grid", "four-up", "proof", 960, "Mode kräver tätt produktflöde — shopparen vill se sortiment snabbt.");
        cand("media-gallery", "grid-tight", "proof", 940, "Lookbook-känsla — outfits och miljö, inte enstaka produktkort.");
        cand("featured-banner", "split", "proof", 900, "Säsongens highlight — driver kampanj och stil för " + name + ".");
        cand("trust-strip", "inline", "arrival", 820, "Frakt, retur och storleksinfo — måste synas tidigt inom mode.");
        cand("content-block", "prose-only", "arrival", 520, "Kort varumärkesintro — mode säljs mer visuellt än genom lång copy.");
      } else if (niche === "gourmet") {
        cand("content-block", "prose-with-media", "arrival", 880, "Smak och ursprung — gourmet behöver berättelse före produktlista.");
        cand("product-grid", "three-up", "proof", 910, "Utvalda produkter — färre rader, mer fokus på kvalitet.");
        cand("featured-banner", "split", "proof", 870, "Säsongens smak eller tillfälligt erbjudande.");
        cand("trust-strip", "inline", "arrival", 840, "Leverans och förvaring — kritiskt för livsmedel online.");
        cand("media-gallery", "masonry", "proof", 790, "Produkt i kontext — servering och råvara som bevis.");
      } else {
        cand("trust-strip", "inline", "arrival", 760 + (seed % 25), "E-handel kräver trygghet — frakt och betalning tidigt för " + name + ".");
        cand("product-grid", seedB % 2 ? "four-up" : "three-up", "proof", 850, "Produktgrid — " + name + " ska kännas som shop, inte tjänstesida.");
        cand("featured-banner", "split", "proof", 780 + (seed % 18), "Utvalt erbjudande bryter monotoni i sortimentet.");
        cand("content-block", seed % 3 ? "prose-only" : "prose-with-media", "arrival", 680, "Varumärkesintro anpassad till " + ctx.nicheLabel + ".");
        cand("media-gallery", seed % 2 ? "grid-tight" : "masonry", "proof", 740, "Visuellt bevis på sortiment — variant växlar per verksamhet.");
        if (seed % 4 === 0) {
          cand("category-showcase", "row", "proof", 710, "Kategorier som ingång — motiverat av sortimentets bredd.");
        }
      }
    } else if (bt === "retail-inredning") {
      cand("trust-strip", "inline", "arrival", 800, "Butikssignaler — handplockat och inslag — direkt efter entrén.");
      cand("content-block", "prose-with-media", "proof", 880, "Butiksidentitet med bild — " + name + " ska kännas fysiskt närvarande.");
      cand("category-showcase", "row", "proof", 860, "Present, inredning och säsong — tre ingångar till butiken.");
      cand("card-grid", "three-up", "proof", 750, "Utvalda sortiment — kort, inte e-handelsgrid.");
      cand("media-gallery", "masonry", "proof", 900, "Miljö och detaljer — inspiration före katalog.");
    } else if (bt === "restaurant" || bt === "cafe") {
      cand("content-block", "prose-with-media", "proof", 850, "Berättelsen bakom " + name + " — mänskligt, inte kedjemall.");
      cand("card-grid", "three-up", "proof", 880, "Meny eller utbud som kort — aptitretande ingångar.");
      cand("media-gallery", "masonry", "proof", 920, "Mat och miljö — aptit före detaljer.");
      cand("cta-band", "centered", "action", 830, "Boka eller hitta hit — tydlig primär handling.");
    } else if (bt === "salon") {
      cand("card-grid", "three-up", "proof", 880, "Behandlingar som tydliga val — inte generiska tjänstekort.");
      cand("content-block", "prose-with-media", "proof", 820, "Salongens personlighet — omsorg synlig i copy och bild.");
      cand("media-gallery", "grid-tight", "proof", 780, "Resultat och miljö — social proof visuellt.");
      cand("cta-band", "centered", "action", 900, "Boka tid — primär konvertering.");
    } else if (bt === "craft") {
      cand("content-block", "prose-with-media", "arrival", 860, "Hantverk och material — vem som utför arbetet före tjänstelista.");
      cand("card-grid", "two-up", "proof", 880, "Två tydliga erbjudanden — hantverk säljs inte i fem katalogkort.");
      cand("media-gallery", "masonry", "proof", 900, "Utförda arbeten som bevis — finish och detaljer.");
      cand("faq-list", "accordion", "action", 750, "Process, garanti och offert — praktiska frågor före kontakt.");
    } else if (bt === "portfolio") {
      cand("content-block", "prose-with-media", "arrival", 820, "Kreativ riktning — vem " + name + " är före galleri.");
      cand("media-gallery", "masonry", "proof", 980, "Portfolio är huvudbevis — galleri före allt annat.");
      cand("testimonial-strip", "simple", "proof", 760, "Uppdragsgivare — social proof efter visuellt bevis.");
      cand("contact-block", "simple", "action", 900, "Enkel kontakt — kreativa uppdrag börjar i dialog.");
    } else {
      cand("content-block", "prose-with-media", "arrival", 880, name + " behöver tydlig expertis före tjänstelista — konsult säljs via förtroende.");
      cand("card-grid", "two-up", "proof", 860, "Två fokuserade erbjudanden — färre kort, mer tyngd.");
      cand("testimonial-strip", "simple", "proof", 800, "Social proof efter tjänsteöversikt.");
      cand("faq-list", "accordion", "action", 780, "Svar på samarbete, pris och process — sänker tröskel.");
    }

    if (bt !== "portfolio") {
      cand("faq-list", "accordion", "action", bt === "ecommerce" ? 820 : 700, bt === "ecommerce" ? "Frakt, retur och betalning — typiskt sista hinder före köp." : "Praktiska frågor före kontakt.");
    }
    if (bt !== "portfolio" || seed % 3 !== 0) {
      cand("contact-block", "simple", "action", 950, name + " — tydlig kontakt utan offertformulär som känns som tjänsteföretag.");
    }
    if (bt === "ecommerce" && seedB % 3 === 0) {
      cand("cta-band", "centered", "action", 720, "Avslutande handlingsuppmaning — utforska sortiment eller handla.");
    }

    return list;
  }

  function assembleComponentChoices(ctx, candidates) {
    const used = new Set();
    const choices = [];
    const phaseLimits = {
      arrival: 2 + (ctx.seed % 2),
      proof: 3 + (ctx.seedB % 3),
      action: 3,
    };

    const hero = candidates.find(function (c) {
      return c.component === "hero";
    });
    if (hero) {
      choices.push({
        component: hero.component,
        variant: hero.variant,
        servesPhase: hero.servesPhase,
        why: hero.why,
      });
      used.add("hero");
    }

    ["arrival", "proof", "action"].forEach(function (phase) {
      const pool = candidates
        .filter(function (c) {
          return c.servesPhase === phase && !used.has(c.component);
        })
        .map(function (c) {
          return {
            component: c.component,
            variant: c.variant,
            servesPhase: c.servesPhase,
            why: c.why,
            sortKey: c.score + (hashStr(c.component + "|" + ctx.name + "|" + phase) % 17),
          };
        })
        .sort(function (a, b) {
          return b.sortKey - a.sortKey;
        });

      const limit = phaseLimits[phase] || 2;
      pool.slice(0, limit).forEach(function (c) {
        if (used.has(c.component)) return;
        choices.push({
          component: c.component,
          variant: c.variant,
          servesPhase: c.servesPhase,
          why: c.why,
        });
        used.add(c.component);
      });
    });

    if (!used.has("contact-block")) {
      choices.push({
        component: "contact-block",
        variant: "simple",
        servesPhase: "action",
        why: ctx.name + " — kontakt ska alltid vara tydlig som sista steg.",
      });
    }

    return choices;
  }

  const USER_SECTION_COMPONENT = {
    about: { component: "content-block", variant: "prose-with-media", phase: "arrival" },
    services: null,
    gallery: { component: "media-gallery", variant: "masonry", phase: "proof" },
    faq: { component: "faq-list", variant: "accordion", phase: "action" },
    contact: { component: "contact-block", variant: "simple", phase: "action" },
    booking: { component: "cta-band", variant: "centered", phase: "action" },
  };

  function applyUserScopeHints(choices, ctx) {
    const sections = (ctx.userScope && ctx.userScope.sections) || [];
    const used = new Set(choices.map(function (c) {
      return c.component;
    }));
    sections.forEach(function (secId) {
      if (secId === "hero" || secId === "footer") return;
      let mapping = USER_SECTION_COMPONENT[secId];
      if (secId === "services" && !mapping) {
        if (ctx.businessType === "ecommerce") {
          mapping = { component: "product-grid", variant: "four-up", phase: "proof" };
        } else {
          mapping = { component: "card-grid", variant: "three-up", phase: "proof" };
        }
      }
      if (!mapping || used.has(mapping.component)) return;
      const insert = {
        component: mapping.component,
        variant: mapping.variant,
        servesPhase: mapping.phase,
        why: "Wizard valde " + secId + " — " + ctx.name + " behöver den sektionen.",
      };
      const contactIdx = choices.findIndex(function (c) {
        return c.component === "contact-block";
      });
      if (contactIdx >= 0) choices.splice(contactIdx, 0, insert);
      else choices.push(insert);
      used.add(mapping.component);
    });
    return choices;
  }

  function composeRejected(ctx, choices) {
    const used = new Set(
      choices.map(function (c) {
        return c.component;
      }),
    );
    const rejected = [];

    function reject(component, why) {
      if (!used.has(component)) rejected.push({ component: component, why: why });
    }

    if (ctx.businessType === "ecommerce") {
      reject("card-grid", ctx.name + " säljer " + ctx.nicheLabel + " — produktgrid, inte tjänstekort.");
      reject("pricing-matrix", "Paketjämförelse passar tjänsteföretag — inte " + ctx.nicheLabel + ".");
    }
    if (ctx.businessType === "consulting" || ctx.businessType === "portfolio") {
      reject("product-grid", "Produktkatalog passar inte " + ctx.nicheLabel + " — fokus på bevis och kontakt.");
    }
    if (ctx.niche === "inredning" && ctx.businessType === "ecommerce") {
      reject("timeline", "Kronologi stör inredningsstämning — sortiment och miljö först.");
    }
    if (ctx.niche === "smycken") {
      reject("card-grid", "Generiska kort — smycken behöver produktgrid och detaljbilder.");
    }
    reject("timeline", "Tidslinje tillför sällan värde för " + ctx.nicheLabel + " hos " + ctx.name + ".");

    return rejected;
  }

  function componentsSignature(choices) {
    return choices
      .map(function (c) {
        return c.component + "/" + c.variant;
      })
      .join(">");
  }

  /**
   * @param {object} input
   * @param {object} deps — CD helpers
   * @returns {object} Creative Concept
   */
  function composeCreativeConcept(input, deps) {
    const ctx = analyzeBusinessContext(input, deps);
    const profile = ctx.profile;
    const conceptStem = profile.concept.split("—")[0].trim();
    const conceptLower =
      conceptStem.charAt(0).toLowerCase() + (conceptStem.length > 1 ? conceptStem.slice(1) : "");

    const informationHierarchy = composeInformationHierarchy(ctx);
    const conversionJourney = composeConversionJourney(ctx);
    const audience = composeAudience(ctx);

    const candidates = buildComponentCandidates(ctx);
    let choices = assembleComponentChoices(ctx, candidates);
    choices = applyUserScopeHints(choices, ctx);

    const rejected = composeRejected(ctx, choices);
    const componentStrategy = { choices: choices };
    if (rejected.length) componentStrategy.rejected = rejected;

    const forbiddenImagery = [];
    if (ctx.businessType === "ecommerce" || ctx.businessType === "retail-inredning") {
      if (ctx.niche === "inredning") forbiddenImagery.push("Kläder", "Mode", "Garderob", "Stock-team");
      else if (ctx.niche === "mode") forbiddenImagery.push("Verkstad", "Ritning", "Stock-team");
      else if (ctx.niche === "smycken") forbiddenImagery.push("Kläder", "Möbler", "Stock-team");
      else forbiddenImagery.push("Stock-team", "Generisk bransch-hero");
    } else if (ctx.businessType === "salon") {
      forbiddenImagery.push("Kontor", "Verkstad", "Stock-team");
    } else {
      forbiddenImagery.push("Stock-team", "Generisk bransch-hero");
    }

    return {
      conceptVersion: CONCEPT_VERSION,
      meta: {
        businessName: ctx.name,
        location: ctx.loc,
        industry: ctx.industry,
        siteType: input.siteType || "",
        businessType: ctx.businessType,
        niche: ctx.niche,
        nicheLabel: ctx.nicheLabel,
        structureSignature: componentsSignature(choices),
      },
      narrative: {
        story:
          profile.emotionalArrival +
          " " +
          ctx.name +
          " — " +
          conceptLower +
          " inom " +
          ctx.nicheLabel +
          (ctx.loc ? " i " + ctx.loc : ctx.digital ? " — digitalt och nära." : "."),
        singleMessage: ctx.name + " — " + conceptStem.toLowerCase() + ".",
        conversionJourney: conversionJourney,
      },
      audience: audience,
      feeling: {
        emotionalArrival: profile.emotionalArrival,
        forbiddenFeeling: profile.forbiddenFeeling,
        territory: profile.emotionalTerritory,
      },
      informationHierarchy: informationHierarchy,
      componentStrategy: componentStrategy,
      designIntent: {
        photographicDirection: profile.photographicDirection,
        tokenRationale:
          ctx.businessType === "ecommerce" || ctx.businessType === "retail-inredning"
            ? "Tokens ska bära " + ctx.nicheLabel + " — inte generisk e-handelsmall."
            : ctx.businessType === "consulting" || ctx.businessType === "portfolio"
              ? "Ren typografi och luft — trovärdighet för " + ctx.name + "."
              : profile.materialFeel + " — tokens som bär " + profile.id + " för " + ctx.nicheLabel + ".",
        forbiddenImagery: forbiddenImagery,
      },
    };
  }

  global.CreativeConceptComposer = {
    CONCEPT_VERSION: CONCEPT_VERSION,
    analyzeBusinessContext: analyzeBusinessContext,
    composeCreativeConcept: composeCreativeConcept,
    componentsSignature: componentsSignature,
  };
})(typeof window !== "undefined" ? window : globalThis);
