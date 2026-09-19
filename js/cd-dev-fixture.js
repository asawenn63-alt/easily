/**
 * Dev-only helpers för CD Create (ej produktionsmotor).
 */
(function (global) {
  "use strict";

  function readDevTestBriefFlag() {
    try {
      const q = new URLSearchParams(global.location.search);
      const v = q.get("cdTestBrief");
      return v === "1" || v === "true";
    } catch (eUrl) {
      return false;
    }
  }

  function createDevFixture(ctx) {
    ctx = ctx || {};
    const name = String(ctx.createBusinessName || ctx.brand || "Snickare Kalle").trim();
    const location = String(ctx.location || "Sundsvall").trim();
    return {
      briefVersion: "1.0",
      businessFacts: {
        businessName: name,
        location: location,
        industry: "",
        siteGoals: [],
      },
      concept: "Hantverk i detaljen — inte i slogans.",
      emotionalArrival: "Det här håller.",
      forbiddenFeeling: "Billig renoverings-hype.",
      singleMessage: "Precision och tydlighet i varje led.",
      primaryAction: "Beskriv projektet och begär offert.",
      ctaTone: "Inbjudande, låg tröskel, verb + nytta.",
      conversionJourney: "Se kvalitet → förstå arbetssätt → begär offert.",
      emotionalTerritory: "Verkstad, jordnär, tyst stolthet.",
      materialFeel: "Trä, stål, damm i ljus — ärligt.",
      spatialDensity: "generös",
      voice: "Korta meningar, hantverkare, du/ni, saklig.",
      restraintRules: ["Inga superlativ.", "Inga team-smiles.", "Inga placeholders."],
      avoidPhrases: ["Vi hjälper dig vidare…", "Välkommen till vår hemsida"],
      entranceDominant: "detalj/bevis",
      entranceLeadMode: "textledd",
      entranceInformationBudget: "minimal",
      narrativePulse: "Tät start → lugn mitt → enkel slut.",
      narrativePhases: ["bevis", "process", "offert"],
      trustStrategy: "Bevis i finish och konkret erfarenhet — inga badges.",
      photographicDirection: "Närbild trä, händer, verkstad.",
      forbiddenImagery: ["Stock-kök", "Ritning som hero", "Team-smile"],
      heroImageIntent: "Detalj som bevisar hantverk — inte generisk byggbild.",
      signatureMoment: "Synlig finish som igenkänner " + name + ".",
      differentiationTest: name + " ≠ generisk hantverkare-mall trots samma bransch.",
      scope: {
        sections: ["hero", "about", "services", "gallery", "faq", "contact"],
      },
      about: {
        title: "Om " + name,
        p1: "Det här håller. " + name + " — hantverk som syns i finish och arbetssätt.",
        p2: name + " i " + location + ". Trä, stål och precision — inga genvägar.",
      },
      services: {
        title: "Vad " + name + " gör",
        lead: "Det här håller. Tydliga erbjudanden — utan brus.",
        cards: [
          { title: "Finish & detalj", body: "Fogar och ytor som syns — inte generiska paket." },
          { title: "Offert & start", body: "Beskriv projektet — vi återkommer med nästa steg i " + location + "." },
        ],
      },
      gallery: {
        title: "Finish i bild",
        lead: name + " — detaljer och arbete i " + location + ", utan generiska stockbilder.",
      },
      faq: {
        title: "Vanliga frågor",
        lead: "Svar om arbetssätt och offert — " + name + " i " + location + ".",
        items: [
          {
            q: "Hur begär jag offert?",
            a: "Beskriv projektet via kontaktformuläret — " + name + " återkommer med omfattning och nästa steg.",
          },
          {
            q: "Var arbetar ni?",
            a: name + " utgår från " + location + " och tar uppdrag i närområdet efter överenskommelse.",
          },
          {
            q: "Hur ser processen ut?",
            a: "Första kontakt, genomgång, tydlig offert — sedan start enligt plan.",
          },
        ],
      },
      contact: {
        title: "Kontakt",
        lead: name + " i " + location + " — beskriv projektet så återkommer vi med nästa steg.",
      },
      booking: {
        title: "Boka tid",
        lead: "Välj en tid som passar — " + name + " i " + location + ".",
        intro: "Det här håller. Enkelt första steg.",
        description: "Bekräftelse skickas efter bokning — inga dolda steg.",
      },
      hero: {
        title: name + " — hantverk som håller.",
        lead: "Det här håller. " + name + " i " + location + " — precision i varje fog.",
        primaryCta: { text: "Beskriv projektet", href: "#kontakt" },
        secondaryCta: { text: "Se finish", href: "#tjanster" },
      },
      design: {
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
      images: {
        hero: { url: "https://picsum.photos/seed/cd-fixture-hero/1920/1080" },
        about: { url: "https://picsum.photos/seed/cd-fixture-about/800/900" },
        cards: [
          { url: "https://picsum.photos/seed/cd-fixture-card-0/640/400" },
          { url: "https://picsum.photos/seed/cd-fixture-card-1/640/400" },
          { url: "https://picsum.photos/seed/cd-fixture-card-2/640/400" },
        ],
        gallery: [
          { url: "https://picsum.photos/seed/cd-fixture-g0/800/600" },
          { url: "https://picsum.photos/seed/cd-fixture-g1/800/600" },
          { url: "https://picsum.photos/seed/cd-fixture-g2/800/600" },
          { url: "https://picsum.photos/seed/cd-fixture-g3/800/600" },
        ],
      },
    };
  }

  global.CdDevFixture = {
    shouldInstall: readDevTestBriefFlag,
    createDevFixture: createDevFixture,
  };
})(typeof window !== "undefined" ? window : globalThis);
