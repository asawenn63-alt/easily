/**

 * Create Build Plan — strukturerad byggplan från Create-flödet (steg 1–5).

 * Enda ingången till AI-genereringen; läser inte formulärfält direkt.

 */

(function (global) {

  "use strict";



  const VERSION = 1;



  const SITE_TYPE_LABELS = {

    foretag: "Företag / Tjänster",

    portfolio: "Portfolio",

    webbutik: "Webbutik",

    restaurang: "Restaurang / Café",

    ovrigt: "Övrigt",

  };



  /** Standardmål per webbplatstyp — sätts automatiskt, inget användarval. */

  const DEFAULT_SITE_GOALS_BY_TYPE = {

    foretag: [

      {

        id: "fler-kunder",

        letter: "A",

        title: "Få fler kunder",

        description: "Skapa fler förfrågningar och affärer.",

      },

      {

        id: "kontaktforfragan",

        letter: "B",

        title: "Kontaktförfrågningar",

        description: "Gör det enkelt för besökare att ta kontakt.",

      },

    ],

    portfolio: [

      {

        id: "visa-arbete",

        letter: "A",

        title: "Visa upp arbeten",

        description: "Presentera projekt, referenser och tidigare arbeten.",

      },

      {

        id: "fler-kunder",

        letter: "B",

        title: "Få fler kunder",

        description: "Skapa fler förfrågningar och affärer.",

      },

    ],

    webbutik: [

      {

        id: "salja-produkter",

        letter: "A",

        title: "Sälja produkter",

        description: "Bygg en webbplats med fokus på försäljning.",

      },

    ],

    restaurang: [

      {

        id: "visa-meny",

        letter: "A",

        title: "Visa meny",

        description: "Presentera meny, rätter och erbjudanden.",

      },

      {

        id: "bokningar",

        letter: "B",

        title: "Ta emot bokningar",

        description: "Låt besökare boka bord eller reservera direkt.",

      },

    ],

    ovrigt: [

      {

        id: "dela-information",

        letter: "A",

        title: "Informera",

        description: "Informera besökare om verksamheten eller organisationen.",

      },

      {

        id: "kontaktforfragan",

        letter: "B",

        title: "Kontakt",

        description: "Gör det enkelt för besökare att ta kontakt.",

      },

    ],

  };



  function cloneGoal(goal) {

    if (!goal) return null;

    return {

      id: goal.id || "",

      letter: goal.letter || "",

      title: goal.title || "",

      description: goal.description || "",

    };

  }



  function resolveDefaultSiteGoals(siteTypeId) {

    const typeId = siteTypeId ? String(siteTypeId).trim() : "";

    const goals = DEFAULT_SITE_GOALS_BY_TYPE[typeId];

    if (!goals || !goals.length) return [];

    return goals.map(cloneGoal);

  }



  function cloneDesignStyle(style) {

    if (!style) return null;

    return {

      id: style.id || "",

      letter: style.letter || "",

      title: style.title || "",

      description: style.description || "",

    };

  }



  function cloneExistingSite(existing, existingUrl) {

    if (!existing) return null;

    const out = {

      id: existing.id || "",

      letter: existing.letter || "",

      title: existing.title || "",

      description: existing.description || "",

    };

    if (existingUrl) out.existingUrl = existingUrl;

    return out;

  }



  function buildBusinessBrief(name, description) {

    const n = String(name || "").trim();

    const d = String(description || "").trim();

    if (n && d) return n + ". " + d;

    return n || d;

  }



  /**

   * Bygger en strukturerad Create Build Plan från insamlad Create-metadata.

   * @param {object} meta — från collectCreateFlowMetadata()

   * @param {string} siteTypeId — t.ex. "foretag"

   */

  function buildFromCreateMetadata(meta, siteTypeId) {

    meta = meta || {};

    const typeId = siteTypeId ? String(siteTypeId).trim() : "";

    const businessName = String(meta.createBusinessName || "").trim();

    const businessLocation = String(meta.createBusinessLocation || "").trim();

    const businessDescription = String(meta.createBusinessDescription || "").trim();

    const existingRaw = meta.createExistingSite || null;

    let existingSiteUrl = null;

    if (existingRaw && existingRaw.id === "has-website" && existingRaw.existingUrl) {

      existingSiteUrl = String(existingRaw.existingUrl).trim();

    }



    const sections = (meta.createSections || [])

      .filter(function (s) {

        return s && s.id;

      })

      .map(function (s) {

        return { id: String(s.id), label: String(s.label || s.id) };

      });



    const siteGoals = resolveDefaultSiteGoals(typeId);



    return {

      version: VERSION,

      siteType: {

        id: typeId,

        label: SITE_TYPE_LABELS[typeId] || typeId,

      },

      businessName: businessName,

      businessLocation: businessLocation,

      businessDescription: businessDescription,

      businessBrief: buildBusinessBrief(businessName, businessDescription),

      sections: sections,

      designStyle: cloneDesignStyle(meta.createDesignStyle),

      siteGoals: siteGoals,

      existingSite: cloneExistingSite(existingRaw, existingSiteUrl),

      existingSiteUrl: existingSiteUrl,

    };

  }



  const VALIDATION_MESSAGES = {

    plan: "Create Build Plan saknas.",

    siteType: "Välj typ av webbplats innan du fortsätter.",

    businessName: "Företagsnamn saknas.",

    businessDescription: "Beskriv verksamheten innan du fortsätter.",

    sections: "Välj minst en sektion.",

    designStyle: "Välj en designstil innan du fortsätter.",

    existingSite: "Välj om du har en befintlig webbplats.",

    existingSiteUrl: "Ange webbadressen till din befintlig webbplats.",

  };



  const VALIDATION_LIST_LABELS = {

    siteType: "Typ av webbplats",

    businessName: "Företagsnamn",

    businessDescription: "Beskrivning av verksamheten",

    sections: "Minst en sektion",

    designStyle: "Designstil",

    existingSite: "Befintlig webbplats",

    existingSiteUrl: "Webbadress till befintlig webbplats",

  };



  function validationMessage(errors) {

    if (!errors || !errors.length) return "";

    if (errors.length === 1) {

      return VALIDATION_MESSAGES[errors[0]] || "Create Build Plan är ofullständig.";

    }

    const labels = errors

      .filter(function (key) {

        return key !== "plan";

      })

      .map(function (key) {

        return VALIDATION_LIST_LABELS[key] || VALIDATION_MESSAGES[key] || key;

      });

    if (!labels.length) return "Create Build Plan är ofullständig.";

    return "Fyll i följande innan du fortsätter:\n\n" + labels.join("\n");

  }



  function validate(plan) {

    const errors = [];

    if (!plan || typeof plan !== "object") {

      return { ok: false, errors: ["plan"], message: VALIDATION_MESSAGES.plan };

    }

    if (!plan.siteType || !plan.siteType.id) errors.push("siteType");

    if (!plan.businessName) errors.push("businessName");

    if (!plan.businessDescription) errors.push("businessDescription");

    if (!plan.sections || !plan.sections.length) errors.push("sections");

    if (!plan.designStyle || !plan.designStyle.id) errors.push("designStyle");

    if (!plan.existingSite || !plan.existingSite.id) errors.push("existingSite");

    if (plan.existingSite && plan.existingSite.id === "has-website" && !plan.existingSiteUrl) {

      errors.push("existingSiteUrl");

    }

    return {

      ok: errors.length === 0,

      errors: errors,

      message: validationMessage(errors),

    };

  }



  /**

   * Text som skickas till AI-motorn — enda användar-/create-ingången vid generering.

   */

  function toGenerationText(plan) {

    if (!plan) return "";

    const parts = ["=== CREATE BUILD PLAN ==="];



    if (plan.siteType && plan.siteType.label) {

      parts.push("Webbplatstyp: " + plan.siteType.label);

    }

    if (plan.businessName) {

      parts.push("Företagsnamn: " + plan.businessName);

    }

    if (plan.businessLocation) {

      parts.push("Ort: " + plan.businessLocation);

    }

    if (plan.businessDescription) {

      parts.push("Verksamhetsbeskrivning: " + plan.businessDescription);

    }

    if (plan.sections && plan.sections.length) {

      parts.push(

        "Valda sektioner: " +

          plan.sections

            .map(function (s) {

              return s.label;

            })

            .join(", "),

      );

    }

    if (plan.designStyle && plan.designStyle.title) {

      parts.push(

        "Designstil: " +

          plan.designStyle.title +

          (plan.designStyle.description ? " — " + plan.designStyle.description : ""),

      );

    }

    if (plan.siteGoals && plan.siteGoals.length) {

      const goalLines = plan.siteGoals.map(function (goal) {

        return "• " + goal.title + (goal.description ? ": " + goal.description : "");

      });

      parts.push("Standardmål (automatiskt):\n" + goalLines.join("\n"));

    }

    if (plan.existingSite && plan.existingSite.title) {

      parts.push("Befintlig webbplats: " + plan.existingSite.title);

      if (plan.existingSite.description) {

        parts.push(plan.existingSite.description);

      }

    }

    if (plan.existingSiteUrl) {
      parts.push("Webbadress: " + plan.existingSiteUrl);
    }

    const SCE = global.SiteCompositionEngine;
    if (SCE && typeof SCE.composeFromBuildPlan === "function" && typeof SCE.toGenerationBrief === "function") {
      const compositionBrief = SCE.toGenerationBrief(SCE.composeFromBuildPlan(plan));
      if (compositionBrief) parts.push(compositionBrief);
    }

    const HEE = global.HighlightExtractionEngine;
    if (HEE && typeof HEE.distributeForSite === "function" && typeof HEE.toGenerationBrief === "function") {
      const desc = plan.businessDescription || "";
      if (desc) {
        const highlightBrief = HEE.toGenerationBrief(HEE.distributeForSite(desc));
        if (highlightBrief) parts.push(highlightBrief);
      }
    }

    return parts.join("\n\n").slice(0, 1800);

  }



  /** Payload som skickas vidare till AI-motorn (struktur + text). */

  function toGenerationPayload(plan) {

    return {

      createBuildPlan: plan,

      userText: toGenerationText(plan),

    };

  }



  global.CreateBuildPlan = {

    VERSION: VERSION,

    SITE_TYPE_LABELS: SITE_TYPE_LABELS,

    DEFAULT_SITE_GOALS_BY_TYPE: DEFAULT_SITE_GOALS_BY_TYPE,

    resolveDefaultSiteGoals: resolveDefaultSiteGoals,

    buildFromCreateMetadata: buildFromCreateMetadata,

    validate: validate,

    validationMessage: validationMessage,

    VALIDATION_MESSAGES: VALIDATION_MESSAGES,

    toGenerationText: toGenerationText,

    toGenerationPayload: toGenerationPayload,

  };

})(typeof window !== "undefined" ? window : globalThis);

