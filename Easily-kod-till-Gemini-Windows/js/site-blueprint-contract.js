/**
 * Site Blueprint 1.0 — schema + validering (site-blueprint.md).
 */
(function (global) {
  "use strict";

  const BLUEPRINT_VERSION = "1.0";

  const LEGACY_NODE_TYPES = new Set(["about", "services", "gallery"]);

  function isNonEmptyString(v) {
    return typeof v === "string" && v.trim().length > 0;
  }

  function validateComponentDefinition(def, errors, prefix) {
    prefix = prefix || "componentDefinition";
    if (!def || typeof def !== "object") {
      errors.push(prefix);
      return;
    }
    if (!isNonEmptyString(def.type)) errors.push(prefix + ".type");
    if (!def.variants || typeof def.variants !== "object" || !Object.keys(def.variants).length) {
      errors.push(prefix + ".variants");
    }
  }

  function validateBlueprintNode(node, errors, path) {
    path = path || "root";
    if (!node || typeof node !== "object") {
      errors.push(path);
      return;
    }
    if (!isNonEmptyString(node.id)) errors.push(path + ".id");
    const type = String(node.type || "").trim();
    if (!type) errors.push(path + ".type");
    if (LEGACY_NODE_TYPES.has(type)) errors.push(path + ".legacy_type:" + type);
    if (type !== "page" && !isNonEmptyString(node.designSpecRef)) errors.push(path + ".designSpecRef");
    if (type !== "page" && node.compositionPlanRef != null && !isNonEmptyString(node.compositionPlanRef)) errors.push(path + ".compositionPlanRef");
    if (Object.prototype.hasOwnProperty.call(node, "variant")) errors.push(path + ".variant.forbidden");
    if (Object.prototype.hasOwnProperty.call(node, "content")) errors.push(path + ".content.forbidden");
    if (Object.prototype.hasOwnProperty.call(node, "style")) errors.push(path + ".style.forbidden");
    if (Array.isArray(node.children)) {
      node.children.forEach(function (child, i) {
        validateBlueprintNode(child, errors, path + ".children[" + i + "]");
      });
    }
  }

  /**
   * @param {object} blueprint
   * @param {{ requireComplete?: boolean, registry?: object }} opts
   */
  function validateSiteBlueprint(blueprint, opts) {
    opts = opts || {};
    const errors = [];
    if (!blueprint || typeof blueprint !== "object") {
      return { ok: false, errors: ["siteBlueprint"] };
    }
    if (blueprint.blueprintVersion !== BLUEPRINT_VERSION) {
      errors.push("blueprintVersion");
    }
    if (opts.requireComplete !== false) {
      if (!blueprint.conceptRef || !isNonEmptyString(blueprint.conceptRef.conceptVersion)) {
        errors.push("conceptRef");
      }
      if (!blueprint.meta || !isNonEmptyString(blueprint.meta.businessName)) {
        errors.push("meta.businessName");
      }
      if (!isNonEmptyString(blueprint.designSpecRef)) errors.push("designSpecRef");
      if (blueprint.compositionPlanRef) {
        const missingPlanRefs = blueprint.root && Array.isArray(blueprint.root.children)
          ? blueprint.root.children.some(function (node) { return !isNonEmptyString(node.compositionPlanRef); })
          : true;
        if (missingPlanRefs) errors.push("root.children.compositionPlanRef");
      }
      if (blueprint.design) errors.push("design.forbidden");
      if (!blueprint.root) {
        errors.push("root");
      } else {
        validateBlueprintNode(blueprint.root, errors, "root");
        if (!Array.isArray(blueprint.root.children) || blueprint.root.children.length < 1) {
          errors.push("root.children");
        } else {
          const children = blueprint.root.children;
          const firstContentIndex = children[0] && children[0].type === "brand-header" ? 1 : 0;
          if (!children[firstContentIndex] || children[firstContentIndex].type !== "hero") {
            errors.push("root.children.hero_required_first");
          }
          if (!children[children.length - 1] || children[children.length - 1].type !== "footer") {
            errors.push("root.children.footer_required_last");
          }
        }
      }
      if (blueprint.componentDefinitions) {
        Object.keys(blueprint.componentDefinitions).forEach(function (key) {
          validateComponentDefinition(blueprint.componentDefinitions[key], errors, "componentDefinitions." + key);
        });
      }
    }
    return { ok: errors.length === 0, errors: errors };
  }

  function createEmptyBlueprint() {
    return {
      blueprintVersion: BLUEPRINT_VERSION,
      conceptRef: { conceptVersion: "1.0", lockedAt: "" },
      meta: { businessName: "", location: "", industry: "", locale: "sv-SE", createPath: "blueprint" },
      designSpecRef: "page.designSpec",
      root: { id: "page", type: "page", children: [] },
    };
  }

  global.SiteBlueprintContract = {
    BLUEPRINT_VERSION: BLUEPRINT_VERSION,
    LEGACY_NODE_TYPES: LEGACY_NODE_TYPES,
    validateSiteBlueprint: validateSiteBlueprint,
    validateComponentDefinition: validateComponentDefinition,
    createEmptyBlueprint: createEmptyBlueprint,
  };
})(typeof window !== "undefined" ? window : globalThis);
