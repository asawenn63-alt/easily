/** Första körbara Question-objektet. Katalogen utökas först efter vertikal verifiering. */
(function (global) {
  "use strict";

  const siteType = Object.freeze({
    questionId: "site.intent.type",
    version: 1,
    prompt: { locale: "sv-SE", text: "Vilken typ av webbplats vill du skapa?" },
    inputSpec: { type: "single-choice", options: ["foretag", "portfolio", "webbutik", "restaurang", "ovrigt"] },
    targetFields: ["customerFacts.siteType"],
    extractionSchema: { siteType: { type: "string", required: true } },
    interpretationPolicy: {
      preserveRawAnswer: true,
      allowMultipleFacts: false,
      confidenceThresholds: { accept: 0.9, clarify: 0.55 },
      conflictPolicy: "clarify",
    },
    validationRules: [{ rule: "allowedOption" }],
    nextQuestion: [{ otherwise: "business.identity.name" }],
    completionContribution: ["customerFacts.siteType"],
  });

  const businessName = Object.freeze({
    questionId: "business.identity.name",
    version: 1,
    prompt: { locale: "sv-SE", text: "Vad heter verksamheten?" },
    inputSpec: { type: "text", minLength: 2, maxLength: 120 },
    targetFields: ["customerFacts.businessName"],
    extractionSchema: { businessName: { type: "string", required: true } },
    interpretationPolicy: {
      preserveRawAnswer: true,
      allowMultipleFacts: false,
      confidenceThresholds: { accept: 0.9, clarify: 0.55 },
      conflictPolicy: "clarify",
    },
    validationRules: [{ rule: "nonEmptyTrimmedString" }],
    nextQuestion: [{ otherwise: "business.offer.core" }],
    completionContribution: ["customerFacts.businessName"],
  });

  const businessOffer = Object.freeze({
    questionId: "business.offer.core",
    version: 1,
    prompt: { locale: "sv-SE", text: "Vad erbjuder verksamheten, och till vem?" },
    inputSpec: { type: "text", minLength: 8, maxLength: 600 },
    targetFields: ["customerFacts.offer.summary", "customerFacts.audience.primary"],
    extractionSchema: {
      offerSummary: { type: "string", required: true },
      primaryAudience: { type: "string", required: false },
    },
    interpretationPolicy: {
      preserveRawAnswer: true,
      allowMultipleFacts: true,
      confidenceThresholds: { accept: 0.9, clarify: 0.55 },
      conflictPolicy: "clarify",
    },
    validationRules: [{ rule: "nonEmptyTrimmedString" }],
    nextQuestion: [],
    completionContribution: ["customerFacts.offer.summary"],
  });

  const businessLocation = Object.freeze({
    questionId: "business.location.primary",
    version: 1,
    prompt: { locale: "sv-SE", text: "Var finns verksamheten?" },
    inputSpec: { type: "text", minLength: 2, maxLength: 120, optional: true },
    targetFields: ["customerFacts.location.primary"],
    extractionSchema: { primaryLocation: { type: "string", required: false } },
    interpretationPolicy: {
      preserveRawAnswer: true,
      allowMultipleFacts: false,
      confidenceThresholds: { accept: 0.9, clarify: 0.55 },
      conflictPolicy: "clarify",
    },
    validationRules: [{ rule: "optionalTrimmedString" }],
    nextQuestion: [],
    completionContribution: [],
  });

  const requestedContent = Object.freeze({
    questionId: "site.content.selection",
    version: 1,
    prompt: { locale: "sv-SE", text: "Vilket extra innehåll ska finnas på sidan?" },
    inputSpec: { type: "multiple-choice", options: ["about", "services", "gallery", "contact"], optional: true },
    targetFields: ["customerFacts.requestedContent"],
    extractionSchema: { requestedContent: { type: "array", required: false } },
    interpretationPolicy: {
      preserveRawAnswer: true,
      allowMultipleFacts: false,
      confidenceThresholds: { accept: 0.9, clarify: 0.55 },
      conflictPolicy: "clarify",
    },
    validationRules: [{ rule: "allowedOptions" }],
    nextQuestion: [],
    completionContribution: [],
  });

  const designTheme = Object.freeze({
    questionId: "design.direction.theme",
    version: 1,
    prompt: { locale: "sv-SE", text: "Vilken designstil ska sidan ha?" },
    inputSpec: {
      type: "single-choice",
      options: ["nordisk-ren", "modern-professionell", "varm-valkomnande", "mork-exklusiv", "lekfull-kreativ"],
    },
    targetFields: ["customerFacts.design.styleId"],
    extractionSchema: { designStyleId: { type: "string", required: true } },
    interpretationPolicy: {
      preserveRawAnswer: true,
      allowMultipleFacts: false,
      confidenceThresholds: { accept: 0.9, clarify: 0.55 },
      conflictPolicy: "clarify",
    },
    validationRules: [{ rule: "allowedOption" }],
    nextQuestion: [],
    completionContribution: ["customerFacts.design.styleId"],
  });

  const colorPreferences = Object.freeze({
    questionId: "design.color.preferences",
    version: 1,
    prompt: { locale: "sv-SE", text: "Har du önskemål om färger?" },
    inputSpec: { type: "structured-choice", options: ["auto", "custom", "brand-assets"] },
    targetFields: ["customerFacts.colors.mode", "customerFacts.colors.description"],
    extractionSchema: {
      mode: { type: "string", required: true },
      description: { type: "string", required: false },
    },
    interpretationPolicy: {
      preserveRawAnswer: true, allowMultipleFacts: true,
      confidenceThresholds: { accept: 0.9, clarify: 0.55 }, conflictPolicy: "clarify",
    },
    validationRules: [{ rule: "allowedOption" }], nextQuestion: [],
    completionContribution: ["customerFacts.colors.mode"],
  });

  const sourceMaterial = Object.freeze({
    questionId: "site.source.material",
    version: 1,
    prompt: { locale: "sv-SE", text: "Ska webbplatsen skapas från grunden eller från befintligt material?" },
    inputSpec: { type: "structured-choice", options: ["from-scratch", "has-website", "own-material"] },
    targetFields: ["customerFacts.source.mode", "customerFacts.source.url"],
    extractionSchema: { mode: { type: "string", required: true }, url: { type: "string", required: false } },
    interpretationPolicy: {
      preserveRawAnswer: true, allowMultipleFacts: true,
      confidenceThresholds: { accept: 0.9, clarify: 0.55 }, conflictPolicy: "clarify",
    },
    validationRules: [{ rule: "allowedOption" }], nextQuestion: [],
    completionContribution: ["customerFacts.source.mode"],
  });

  function install() {
    if (!global.QuestionRegistry || typeof global.QuestionRegistry.register !== "function") {
      return { ok: false, errors: ["question_registry_missing"] };
    }
    const results = [
      siteType, businessName, businessOffer, businessLocation,
      requestedContent,
      designTheme, colorPreferences, sourceMaterial,
    ].map(function (question) {
      const existing = global.QuestionRegistry.get(question.questionId, question.version);
      return existing ? { ok: true, question: existing, alreadyRegistered: true } : global.QuestionRegistry.register(question);
    });
    const failed = results.find(function (result) { return !result.ok; });
    return failed || { ok: true, questions: results.map(function (result) { return result.question; }) };
  }

  global.QuestionCatalogCore = Object.freeze({
    SITE_INTENT_TYPE: siteType,
    BUSINESS_IDENTITY_NAME: businessName,
    BUSINESS_OFFER_CORE: businessOffer,
    BUSINESS_LOCATION_PRIMARY: businessLocation,
    SITE_CONTENT_SELECTION: requestedContent,
    DESIGN_DIRECTION_THEME: designTheme,
    DESIGN_COLOR_PREFERENCES: colorPreferences,
    SITE_SOURCE_MATERIAL: sourceMaterial,
    install: install,
  });
})(typeof window !== "undefined" ? window : globalThis);
