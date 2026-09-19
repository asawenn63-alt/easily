/**
 * Blueprint Document Bridge — sparar låst Concept + Blueprint på dokumentet.
 */
(function (global) {
  "use strict";

  function heroMediaUrl(blueprint) {
    const root = blueprint && blueprint.root;
    if (!root || !Array.isArray(root.children)) return "";
    for (let i = 0; i < root.children.length; i++) {
      const node = root.children[i];
      if (node && node.type === "hero" && node.content && node.content.media) {
        const media = node.content.media;
        if (Array.isArray(media) && media[0] && media[0].url) return String(media[0].url).trim();
      }
    }
    return "";
  }

  /**
   * @param {object} doc
   * @param {object} blueprint
   * @param {object} concept
   */
  function applySiteBlueprintToDocument(doc, blueprint, concept) {
    if (!doc || !doc.page || !blueprint) return { ok: false, reason: "missing_doc" };

    doc.page.siteBlueprint = blueprint;
    doc.page.creativeConcept = concept || null;
    doc.page.designSpec = concept && concept.execution ? concept.execution : null;
    doc.page.createPath = "blueprint";
    doc.page.blueprintLocked = true;
    doc.page.conceptLocked = !!concept;
    doc.page.cdImagesLocked = true;

    const meta = blueprint.meta || {};
    if (meta.businessName) {
      doc.page.createBusinessName = meta.businessName;
      doc.page.textLogo = meta.businessName.slice(0, 48);
    }
    if (meta.location) {
      doc.page.location = meta.location;
      doc.page.textLogoSubline = meta.location;
    }
    if (meta.industry) {
      doc.page.industry = meta.industry;
    }

    const heroSection = doc.page.designSpec && Array.isArray(doc.page.designSpec.sections)
      ? doc.page.designSpec.sections.find(function (section) { return section.component === "hero"; })
      : null;
    const heroUrl = heroSection && Array.isArray(heroSection.imageUrls) ? heroSection.imageUrls[0] : "";
    if (heroUrl) {
      doc.page.heroBgUrl = heroUrl;
    }

    const design = doc.page.designSpec && doc.page.designSpec.design;
    if (design && design.background) doc.page.bgColor = design.background;
    if (design && design.accent) doc.page.accentColor = design.accent;

    const CDG = global.CreateCdGate;
    if (CDG && typeof CDG.purgeLegacyIdentityFields === "function") {
      CDG.purgeLegacyIdentityFields(doc.page);
    }

    delete doc.page.template;
    delete doc.page.layoutEngine;
    delete doc.page.layoutSpec;
    delete doc.page.sectionOrder;
    delete doc.page.designFamily;

    if (doc.meta) {
      doc.meta.blueprintCreateEnabled = true;
      doc.meta.creativeDirectorCreateEnabled = false;
    }

    return { ok: true };
  }

  global.BlueprintDocumentBridge = {
    applySiteBlueprintToDocument: applySiteBlueprintToDocument,
  };
})(typeof window !== "undefined" ? window : globalThis);
