/**
 * LayoutSpec — CD generativ layout (fas 1). Schema + mapping från composition-plan.
 */
(function (global) {
  "use strict";

  const VERSION = "1";

  /**
   * @param {object} plan — från CdCompositionExecutor.mapBriefToComposition
   * @param {object} brief — creativeBrief
   */
  function buildFromComposition(plan, brief) {
    plan = plan || {};
    const facts = (brief && brief.businessFacts) || {};
    const vertical = String(facts.vertical || "").trim();
    const heroKey = plan.layoutKeys && plan.layoutKeys.hero ? String(plan.layoutKeys.hero) : "center";

    let heroVariant = "immersive";
    if (heroKey === "split" || heroKey === "left") heroVariant = "immersive-split";

    let profile = "default";
    if (vertical === "cafe") profile = "cafe";
    else if (vertical === "butik") profile = "inredning";

    return {
      version: VERSION,
      engine: "generative",
      profile: profile,
      heroVariant: heroVariant,
      sectionOrder: Array.isArray(plan.sectionOrder) ? plan.sectionOrder.slice() : [],
    };
  }

  function validate(spec) {
    const errors = [];
    if (!spec || typeof spec !== "object") {
      errors.push("layoutSpec");
      return { ok: false, errors: errors };
    }
    if (spec.engine !== "generative") errors.push("layoutSpec.engine");
    if (!isNonEmptyString(spec.heroVariant)) errors.push("layoutSpec.heroVariant");
    return { ok: errors.length === 0, errors: errors };
  }

  function isNonEmptyString(v) {
    return typeof v === "string" && v.trim().length > 0;
  }

  global.LayoutSpecContract = {
    VERSION: VERSION,
    buildFromComposition: buildFromComposition,
    validate: validate,
  };
})(typeof window !== "undefined" ? window : globalThis);
