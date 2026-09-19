/**
 * Creative Concept 1.0 — schema + validering (site-blueprint.md).
 */
(function (global) {
  "use strict";

  const CONCEPT_VERSION = "1.0";

  const LEGACY_COMPONENT_IDS = new Set([
    "about",
    "services",
    "gallery",
    "hero",
    "contact",
    "faq",
    "booking",
  ]);

  function isNonEmptyString(v) {
    return typeof v === "string" && v.trim().length > 0;
  }

  function validateMeta(meta, errors) {
    meta = meta || {};
    if (!isNonEmptyString(meta.businessName)) errors.push("meta.businessName");
  }

  function validateNarrative(narrative, errors) {
    narrative = narrative || {};
    if (!isNonEmptyString(narrative.story)) errors.push("narrative.story");
    if (!isNonEmptyString(narrative.singleMessage)) errors.push("narrative.singleMessage");
    if (!isNonEmptyString(narrative.conversionJourney)) errors.push("narrative.conversionJourney");
  }

  function validateAudience(audience, errors) {
    audience = audience || {};
    if (!isNonEmptyString(audience.primary)) errors.push("audience.primary");
    if (!Array.isArray(audience.needs) || !audience.needs.length) errors.push("audience.needs");
    if (!isNonEmptyString(audience.relationship)) errors.push("audience.relationship");
  }

  function validateFeeling(feeling, errors) {
    feeling = feeling || {};
    if (!isNonEmptyString(feeling.emotionalArrival)) errors.push("feeling.emotionalArrival");
    if (!isNonEmptyString(feeling.forbiddenFeeling)) errors.push("feeling.forbiddenFeeling");
    if (!isNonEmptyString(feeling.territory)) errors.push("feeling.territory");
  }

  function validateInformationHierarchy(ih, errors) {
    ih = ih || {};
    if (!Array.isArray(ih.phases) || ih.phases.length < 1) {
      errors.push("informationHierarchy.phases");
      return;
    }
    ih.phases.forEach(function (phase, i) {
      if (!phase || typeof phase !== "object") {
        errors.push("informationHierarchy.phases[" + i + "]");
        return;
      }
      if (!isNonEmptyString(phase.id)) errors.push("informationHierarchy.phases[" + i + "].id");
      if (!isNonEmptyString(phase.purpose)) errors.push("informationHierarchy.phases[" + i + "].purpose");
    });
    if (!isNonEmptyString(ih.dominantMoment)) errors.push("informationHierarchy.dominantMoment");
  }

  function validateComponentStrategy(strategy, errors) {
    strategy = strategy || {};
    const choices = strategy.choices;
    if (!Array.isArray(choices) || choices.length < 1) {
      errors.push("componentStrategy.choices");
      return;
    }
    choices.forEach(function (choice, i) {
      if (!choice || typeof choice !== "object") {
        errors.push("componentStrategy.choices[" + i + "]");
        return;
      }
      const comp = String(choice.component || "").trim();
      if (!comp) errors.push("componentStrategy.choices[" + i + "].component");
      if (!isNonEmptyString(choice.why)) errors.push("componentStrategy.choices[" + i + "].why");
      if (LEGACY_COMPONENT_IDS.has(comp) && comp !== "hero") {
        errors.push("componentStrategy.choices[" + i + "].legacy_component:" + comp);
      }
    });
    if (Array.isArray(strategy.rejected)) {
      strategy.rejected.forEach(function (rej, i) {
        if (!rej || typeof rej !== "object") {
          errors.push("componentStrategy.rejected[" + i + "]");
          return;
        }
        if (!isNonEmptyString(rej.component)) errors.push("componentStrategy.rejected[" + i + "].component");
        if (!isNonEmptyString(rej.why)) errors.push("componentStrategy.rejected[" + i + "].why");
      });
    }
  }

  function validateDesignIntent(designIntent, errors) {
    designIntent = designIntent || {};
    if (!isNonEmptyString(designIntent.photographicDirection)) errors.push("designIntent.photographicDirection");
    if (!isNonEmptyString(designIntent.tokenRationale)) errors.push("designIntent.tokenRationale");
    if (!Array.isArray(designIntent.forbiddenImagery)) errors.push("designIntent.forbiddenImagery");
  }

  /**
   * @param {object} concept
   * @param {{ requireComplete?: boolean }} opts
   */
  function validateCreativeConcept(concept, opts) {
    opts = opts || {};
    const errors = [];
    if (!concept || typeof concept !== "object") {
      return { ok: false, errors: ["creativeConcept"] };
    }
    if (concept.conceptVersion !== CONCEPT_VERSION) {
      errors.push("conceptVersion");
    }
    if (opts.requireComplete !== false) {
      validateMeta(concept.meta, errors);
      validateNarrative(concept.narrative, errors);
      validateAudience(concept.audience, errors);
      validateFeeling(concept.feeling, errors);
      validateInformationHierarchy(concept.informationHierarchy, errors);
      validateComponentStrategy(
        (concept.execution && concept.execution.componentStrategy) || concept.componentStrategy,
        errors,
      );
      validateDesignIntent(concept.designIntent, errors);
    }
    return { ok: errors.length === 0, errors: errors };
  }

  function createEmptyConcept() {
    return {
      conceptVersion: CONCEPT_VERSION,
      meta: { businessName: "", location: "", industry: "", siteType: "" },
      narrative: { story: "", singleMessage: "", conversionJourney: "" },
      audience: { primary: "", needs: [], relationship: "du" },
      feeling: { emotionalArrival: "", forbiddenFeeling: "", territory: "" },
      informationHierarchy: { phases: [], dominantMoment: "" },
      componentStrategy: { choices: [] },
      designIntent: { photographicDirection: "", tokenRationale: "", forbiddenImagery: [] },
    };
  }

  global.CreativeConceptContract = {
    CONCEPT_VERSION: CONCEPT_VERSION,
    LEGACY_COMPONENT_IDS: LEGACY_COMPONENT_IDS,
    validateCreativeConcept: validateCreativeConcept,
    createEmptyConcept: createEmptyConcept,
  };
})(typeof window !== "undefined" ? window : globalThis);
