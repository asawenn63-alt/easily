/**
 * BlueprintRenderer — läser endast Site Blueprint (site-blueprint.md).
 */
(function (global) {
  "use strict";

  function applyTokens(el, tokens) {
    if (!el || !tokens) return;
    Object.keys(tokens).forEach(function (key) {
      const cssVar = "--bp-" + key.replace(/\./g, "-");
      el.style.setProperty(cssVar, tokens[key]);
    });
    if (tokens["color.bg"]) el.style.setProperty("--color-bg", tokens["color.bg"]);
    if (tokens["color.surface"]) el.style.setProperty("--color-surface", tokens["color.surface"]);
    if (tokens["color.text"]) el.style.setProperty("--color-text", tokens["color.text"]);
    if (tokens["color.accent"]) el.style.setProperty("--color-accent", tokens["color.accent"]);
    if (tokens["color.primary"]) el.style.setProperty("--color-primary", tokens["color.primary"]);
    el.style.backgroundColor = tokens["color.bg"] || "";
    el.style.color = tokens["color.text"] || "";
  }

  function getBlueprint(doc) {
    if (!doc) return null;
    if (doc.page && doc.page.siteBlueprint) return doc.page.siteBlueprint;
    if (doc.siteBlueprint) return doc.siteBlueprint;
    return null;
  }

  function designToTokens(design) {
    function fontStack(value, role) {
      const family = String(value || "").trim().replace(/["';{}]/g, "");
      const quoted = family ? '"' + family + '"' : "";
      if (role === "heading") {
        const serifFamilies = new Set(["Fraunces", "Cormorant Garamond", "Instrument Serif", "Playfair Display"]);
        const fallback = serifFamilies.has(family) ? ['Georgia', 'serif'] : ['Arial', 'sans-serif'];
        return [quoted].concat(fallback).filter(Boolean).join(", ");
      }
      return [quoted, '"Inter"', 'Arial', 'sans-serif'].filter(Boolean).join(", ");
    }
    return {
      "color.bg": design.background,
      "color.surface": design.surface,
      "color.text": design.text,
      "color.accent": design.accent,
      "color.primary": design.primary,
      "color.border": design.border,
      "font.heading": fontStack(design.headingFont, "heading"),
      "font.body": fontStack(design.bodyFont, "body"),
      "radius.button": design.buttonRadius,
      "spacing.section": design.sectionSpacing,
      "layout.maxWidth": design.maxWidth,
    };
  }

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function safeToken(value) {
    return String(value || "").toLowerCase().replace(/[^a-z0-9_-]/g, "-").slice(0, 64);
  }

  function cssValue(value, field) {
    const text = String(value == null ? "" : value).trim();
    if (!text || /[;{}]/.test(text)) throw new Error("invalid_design_value:" + field);
    return esc(text);
  }

  function renderActions(actions) {
    return (actions || []).map(function (action, index) {
      if (!action || !action.label) return "";
      return '<a class="bp-action' + (index === 0 ? ' bp-action--primary' : '') + '" href="' + esc(action.href || "#") + '">' + esc(action.label) + "</a>";
    }).join("");
  }

  function renderMedia(media, headline) {
    return (media || []).map(function (item, index) {
      const url = item && item.url ? item.url : item && item.media && item.media.url ? item.media.url : "";
      if (!url) return "";
      return '<figure class="bp-media bp-media--' + index + '"><img src="' + esc(url) + '" alt="' + esc(item.alt || headline || "") + '" decoding="async" loading="' + (index ? "lazy" : "eager") + '" referrerpolicy="no-referrer" /></figure>';
    }).join("");
  }

  function collectionItems(content) {
    return content.cards || content.products || content.categories || content.items || [];
  }

  function itemStyle(item) {
    const layout = item && item.layout;
    if (!layout) return "";
    const values = [
      "--bp-item-column:" + cssValue(layout.gridColumn, "item.gridColumn"),
      "--bp-item-row:" + cssValue(layout.gridRow, "item.gridRow"),
      "--bp-item-min-height:" + cssValue(layout.minHeight, "item.minHeight"),
      "--bp-item-padding:" + cssValue(layout.padding, "item.padding"),
      "--bp-item-media-height:" + cssValue(layout.mediaHeight, "item.mediaHeight"),
      "--bp-item-media-aspect:" + cssValue(layout.mediaAspect, "item.mediaAspect"),
      "--bp-item-media-fit:" + cssValue(layout.mediaFit, "item.mediaFit"),
      "--bp-item-x:" + cssValue(layout.offsetX, "item.offsetX"),
      "--bp-item-y:" + cssValue(layout.offsetY, "item.offsetY"),
      "--bp-item-z:" + Number(layout.zIndex),
      "--bp-item-bg:" + cssValue(layout.background, "item.background"),
      "--bp-item-color:" + cssValue(layout.color, "item.color"),
    ];
    if (layout.radius != null) values.push("--bp-item-radius:" + cssValue(layout.radius, "item.radius"));
    if (layout.border != null) values.push("--bp-item-border:" + cssValue(layout.border, "item.border"));
    return ' style="' + values.join(";") + '"';
  }

  function renderCollection(content) {
    return collectionItems(content).map(function (item) {
      const media = item && item.media ? renderMedia([item.media], item.title) : "";
      const title = item && (item.title || item.question || item.label) || "";
      const body = item && (item.body || item.answer || item.detail) || "";
      return '<article class="bp-card"' + itemStyle(item) + '>' + media + '<div class="bp-card__copy">' + (title ? '<h3>' + esc(title) + '</h3>' : '') + (body ? '<p>' + esc(body) + '</p>' : '') + (item && item.badge ? '<span class="bp-card__badge">' + esc(item.badge) + '</span>' : '') + (item && item.priceHint ? '<span class="bp-card__price">' + esc(item.priceHint) + '</span>' : '') + '</div></article>';
    }).join("");
  }

  function publicCopy(value) {
    const text = String(value || "").trim();
    if (!text) return "";
    const internalInstruction = /(kategorierna|bildmaterialet|kontaktuppgifterna|produktbild).*(ska|fyllas|visas|presenteras|produktinformation)|ska\s+(fyllas|presenteras|ersättas|läggas in)|läggs in när|när (verkliga|verifierade|lokala) .*(finns|tillgängliga)|exakt adress.*(bekräftad|läggs in)|använd kontaktfältet som/i;
    return internalInstruction.test(text) ? "" : text;
  }

  function contentFromDesignSpec(section, businessName, index) {
    const actions = section.primaryAction && section.primaryAction.label ? [section.primaryAction] : [];
    const media = (section.imageUrls || []).map(function (url, imageIndex) {
      return { url: url, alt: (section.headline || businessName) + " " + (imageIndex + 1) };
    });
    const items = (section.items || []).map(function (item, itemIndex) {
      const safeItem = Object.assign({}, item, { media: media[itemIndex] || undefined });
      if (safeItem.body != null) safeItem.body = publicCopy(safeItem.body);
      if (safeItem.answer != null) safeItem.answer = publicCopy(safeItem.answer);
      if (safeItem.detail != null) safeItem.detail = publicCopy(safeItem.detail);
      return safeItem;
    });
    const collectionComponent = ["card-grid", "product-grid", "category-showcase", "media-gallery", "trust-strip", "testimonial-strip", "faq-list"].includes(section.component);
    return {
      brandName: businessName,
      headline: publicCopy(section.headline),
      lead: publicCopy(section.lead),
      body: (section.body || []).map(publicCopy).filter(Boolean),
      actions: actions,
      media: collectionComponent ? [] : media,
      cards: items,
      anchor: section.component === "hero" ? "top" : "section-" + index,
    };
  }

  function resolveSection(node, ctx) {
    const match = /^sections\[(\d+)\]$/.exec(String(node.designSpecRef || ""));
    const index = match ? Number(match[1]) : -1;
    const section = index >= 0 && ctx.designSpec.sections[index];
    if (!section || section.component !== node.type) throw new Error("design_spec_mismatch:" + node.type);
    return { section: section, index: index };
  }

  function resolvePlan(node, ctx, index) {
    const match = /^compositionPlan\.sections\[(\d+)\]$/.exec(String(node.compositionPlanRef || ""));
    const planIndex = match ? Number(match[1]) : -1;
    const plan = ctx.designSpec.compositionPlan;
    const entry = planIndex === index && plan && Array.isArray(plan.sections) ? plan.sections[index] : null;
    if (!entry || entry.component !== node.type) throw new Error("composition_plan_mismatch:" + node.type);
    return entry;
  }

  function headingCap(type, weight) {
    return "144px";
  }

  function layoutAttributes(layout) {
    layout = layout || {};
    const columns = Math.max(1, Math.min(12, Number(layout.columns) || 1));
    const style = [
      "--bp-columns:" + columns,
      "--bp-gap:" + esc(layout.gap || "clamp(1rem,3vw,3rem)"),
      "--bp-min-height:" + esc(layout.minHeight || "auto"),
      "--bp-image-aspect:" + esc(layout.imageAspect || "auto"),
    ].join(";");
    return ' data-width="' + safeToken(layout.width) + '" data-align="' + safeToken(layout.alignment) + '" data-media-position="' + safeToken(layout.mediaPosition) + '" data-composition="' + safeToken(layout.composition) + '" data-emphasis="' + safeToken(layout.emphasis) + '" data-overlap="' + (layout.overlap ? "true" : "false") + '" style="' + style + '"';
  }

  function strictLayoutAttributes(layout) {
    if (!layout || typeof layout !== "object") throw new Error("design_layout_missing");
    const style = [
      "--bp-section-width:" + cssValue(layout.width, "width"),
      "--bp-min-height:" + cssValue(layout.minHeight, "minHeight"),
      "--bp-pad-top:" + cssValue(layout.paddingTop, "paddingTop"),
      "--bp-pad-bottom:" + cssValue(layout.paddingBottom, "paddingBottom"),
      "--bp-margin-top:" + cssValue(layout.marginTop, "marginTop"),
      "--bp-margin-bottom:" + cssValue(layout.marginBottom, "marginBottom"),
      "--bp-grid:" + cssValue(layout.gridTemplate, "gridTemplate"),
      "--bp-gap:" + cssValue(layout.gap, "gap"),
      "--bp-align-items:" + cssValue(layout.alignItems, "alignItems"),
      "--bp-copy-column:" + cssValue(layout.copyColumn, "copyColumn"),
      "--bp-copy-row:" + cssValue(layout.copyRow, "copyRow"),
      "--bp-copy-max:" + cssValue(layout.copyMaxWidth, "copyMaxWidth"),
      "--bp-copy-x:" + cssValue(layout.copyOffsetX, "copyOffsetX"),
      "--bp-copy-y:" + cssValue(layout.copyOffsetY, "copyOffsetY"),
      "--bp-copy-z:" + Number(layout.copyZIndex),
      "--bp-heading-size:" + cssValue(layout.headingSize, "headingSize"),
      "--bp-heading-line:" + cssValue(layout.headingLineHeight, "headingLineHeight"),
      "--bp-text-align:" + cssValue(layout.textAlign, "textAlign"),
      "--bp-media-column:" + cssValue(layout.mediaColumn, "mediaColumn"),
      "--bp-media-row:" + cssValue(layout.mediaRow, "mediaRow"),
      "--bp-media-width:" + cssValue(layout.mediaWidth, "mediaWidth"),
      "--bp-media-height:" + cssValue(layout.mediaHeight, "mediaHeight"),
      "--bp-image-aspect:" + cssValue(layout.mediaAspect, "mediaAspect"),
      "--bp-media-fit:" + cssValue(layout.mediaFit, "mediaFit"),
      "--bp-object-position:" + cssValue(layout.mediaObjectPosition, "mediaObjectPosition"),
      "--bp-media-x:" + cssValue(layout.mediaOffsetX, "mediaOffsetX"),
      "--bp-media-y:" + cssValue(layout.mediaOffsetY, "mediaOffsetY"),
      "--bp-media-z:" + Number(layout.mediaZIndex),
      "--bp-media-radius:" + cssValue(layout.mediaRadius, "mediaRadius"),
      "--bp-collection-column:" + cssValue(layout.collectionColumn, "collectionColumn"),
      "--bp-collection-grid:" + cssValue(layout.collectionColumns, "collectionColumns"),
      "--bp-collection-gap:" + cssValue(layout.collectionGap, "collectionGap"),
      "--bp-action-align:" + cssValue(layout.actionAlign, "actionAlign"),
      "--bp-section-bg:" + cssValue(layout.background, "background"),
      "--bp-section-color:" + cssValue(layout.color, "color"),
    ].join(";");
    return ' data-design-spec="2.0" data-composition="' + safeToken(layout.composition) + '" data-relation-before="' + safeToken(layout.relationBefore) + '" data-relation-after="' + safeToken(layout.relationAfter) + '" style="' + style + '"';
  }

  function plannedLayoutAttributes(layout, plan, type, version) {
    if (!layout || !plan) throw new Error("complete_composition_plan_required");
    const style = [
      "--bp-section-width:" + cssValue(layout.width, "width"),
      "--bp-plan-height:" + cssValue(plan.resolvedMinHeight || plan.relativeHeight, "plan.relativeHeight"),
      "--bp-plan-space-before:" + cssValue(plan.spaceBefore, "plan.spaceBefore"),
      "--bp-plan-space-after:" + cssValue(plan.spaceAfter, "plan.spaceAfter"),
      "--bp-plan-pad-top:" + cssValue(plan.paddingTop, "plan.paddingTop"),
      "--bp-plan-pad-bottom:" + cssValue(plan.paddingBottom, "plan.paddingBottom"),
      "--bp-plan-media-scale:" + cssValue(plan.mediaScale, "plan.mediaScale"),
      "--bp-plan-content-width:" + cssValue(plan.contentWidth || "100%", "plan.contentWidth"),
      "--bp-scene-area:" + cssValue(plan.sceneArea || "auto", "plan.sceneArea"),
      "--bp-heading-cap:" + headingCap(type, plan.visualWeight),
      "--bp-grid:" + cssValue(layout.gridTemplate, "gridTemplate"),
      "--bp-gap:" + cssValue(layout.gap, "gap"),
      "--bp-align-items:" + cssValue(layout.alignItems, "alignItems"),
      "--bp-copy-column:" + cssValue(layout.copyColumn, "copyColumn"),
      "--bp-copy-row:" + cssValue(layout.copyRow, "copyRow"),
      "--bp-copy-max:" + cssValue(layout.copyMaxWidth, "copyMaxWidth"),
      "--bp-copy-x:" + cssValue(layout.copyOffsetX, "copyOffsetX"),
      "--bp-copy-y:" + cssValue(layout.copyOffsetY, "copyOffsetY"),
      "--bp-copy-z:" + Number(layout.copyZIndex),
      "--bp-heading-size:" + cssValue(layout.headingSize, "headingSize"),
      "--bp-heading-line:" + cssValue(layout.headingLineHeight, "headingLineHeight"),
      "--bp-text-align:" + cssValue(layout.textAlign, "textAlign"),
      "--bp-media-column:" + cssValue(layout.mediaColumn, "mediaColumn"),
      "--bp-media-row:" + cssValue(layout.mediaRow, "mediaRow"),
      "--bp-media-width:" + cssValue(layout.mediaWidth, "mediaWidth"),
      "--bp-media-height:" + cssValue(layout.mediaHeight, "mediaHeight"),
      "--bp-image-aspect:" + cssValue(layout.mediaAspect, "mediaAspect"),
      "--bp-media-fit:" + cssValue(layout.mediaFit, "mediaFit"),
      "--bp-object-position:" + cssValue(layout.mediaObjectPosition, "mediaObjectPosition"),
      "--bp-media-x:" + cssValue(layout.mediaOffsetX, "mediaOffsetX"),
      "--bp-media-y:" + cssValue(layout.mediaOffsetY, "mediaOffsetY"),
      "--bp-media-z:" + Number(layout.mediaZIndex),
      "--bp-media-radius:" + cssValue(layout.mediaRadius, "mediaRadius"),
      "--bp-collection-column:" + cssValue(layout.collectionColumn, "collectionColumn"),
      "--bp-collection-grid:" + cssValue(layout.collectionColumns, "collectionColumns"),
      "--bp-collection-gap:" + cssValue(layout.collectionGap, "collectionGap"),
      "--bp-action-align:" + cssValue(plan.ctaPlacement, "plan.ctaPlacement"),
      "--bp-action-padding:" + cssValue(layout.actionPadding, "actionPadding"),
      "--bp-action-radius:" + cssValue(layout.actionRadius, "actionRadius"),
      "--bp-action-font-size:" + cssValue(layout.actionFontSize, "actionFontSize"),
      "--bp-section-bg:" + cssValue(layout.background, "background"),
      "--bp-section-color:" + cssValue(layout.color, "color"),
    ].join(";");
    return ' data-design-spec="3.0" data-source-design-spec="' + esc(version || "3.0") + '" data-scene-id="' + safeToken(plan.sceneId || "") + '" data-surface-mode="' + safeToken(plan.surfaceMode || "transparent") + '" data-plan-weight="' + Number(plan.visualWeight) + '" data-plan-layout="' + safeToken(plan.layoutIntent) + '" data-content-align="' + safeToken(plan.contentAlignment || "center") + '" data-cta-mode="' + safeToken(plan.ctaMode || "inline") + '" data-transition-in="' + safeToken(plan.transitionIn) + '" data-transition-out="' + safeToken(plan.transitionOut) + '" style="' + style + '"';
  }

  function validateCompositionPlan(blueprint, ctx) {
    if (!["3.0", "4.0", "5.0", "6.0", "7.0"].includes(ctx.designSpec.designSpecVersion)) return;
    const nodes = blueprint.root.children || [];
    const plan = ctx.designSpec.compositionPlan;
    if (!plan || !Array.isArray(plan.sections) || plan.sections.length !== nodes.length) throw new Error("composition_plan_incomplete");
    if (["6.0", "7.0"].includes(ctx.designSpec.designSpecVersion)) {
      const vision = ctx.designSpec.creativeVision;
      const translation = plan.visionTranslation;
      if (!vision || !vision.coreIdea || !vision.emotionalPromise || !vision.pointOfView || !vision.centralTension || !vision.sensoryWorld || !vision.visitorTransformation) throw new Error("creative_vision_incomplete");
      if (!translation || !translation.compositionPrinciple || !translation.rhythmLogic || !translation.sectionRoleLogic || !translation.proportionLogic) throw new Error("vision_translation_incomplete");
    }
    if (["5.0", "6.0", "7.0"].includes(ctx.designSpec.designSpecVersion)) {
      const vision = plan.pageVision;
      if (!vision || !vision.intendedFeeling || !vision.tempo || !vision.energyArc || !vision.attentionJourney || !vision.visualLanguage || !Array.isArray(vision.focusMoments) || vision.focusMoments.length < 2) {
        throw new Error("page_vision_incomplete");
      }
    }
    plan.sections.forEach(function (entry, index) {
      if (!entry || entry.component !== nodes[index].type) throw new Error("composition_plan_order:" + index);
      if (["5.0", "6.0", "7.0"].includes(ctx.designSpec.designSpecVersion)) {
        ["narrativeRole", "visualFunction", "purposeInWhole", "reasonForPosition", "receivesFromPrevious", "preparesNext", "gazeDirection", "energyShift"].forEach(function (key) {
          if (!String(entry[key] || "").trim()) throw new Error("section_direction_incomplete:" + index + ":" + key);
        });
      }
      if (["6.0", "7.0"].includes(ctx.designSpec.designSpecVersion) && !String(entry.proportionRationale || "").trim()) throw new Error("proportion_rationale_missing:" + index);
      if (ctx.designSpec.designSpecVersion === "7.0" && (!String(entry.sceneId || "").trim() || !String(entry.sceneArea || "").trim() || !String(entry.sceneContribution || "").trim())) throw new Error("viewport_scene_member_incomplete:" + index);
    });
    if (ctx.designSpec.designSpecVersion === "7.0") {
      const scenes = plan.viewportScenes;
      if (!Array.isArray(scenes) || !scenes.length) throw new Error("viewport_scenes_incomplete");
      const covered = [];
      scenes.forEach(function (scene) {
        if (!scene || !scene.id || !scene.primaryFocalPoint || !Array.isArray(scene.eyePath) || scene.eyePath.length < 3) throw new Error("viewport_scene_direction_incomplete");
        (scene.sectionIndexes || []).forEach(function (index) {
          if (plan.sections[index]?.sceneId !== scene.id) throw new Error("viewport_scene_reference:" + index);
          covered.push(index);
        });
      });
      if (covered.length !== nodes.length || covered.some(function (value, index) { return value !== index; })) throw new Error("viewport_scene_coverage");
    }
    // Rytmen ägs av Creative Director. Renderaren får inte kräva en generell
    // kvot av stora, medelstora och små sektioner.
  }

  function renderSpecifiedNode(node, ctx) {
    const resolved = resolveSection(node, ctx);
    const content = contentFromDesignSpec(resolved.section, ctx.businessName, resolved.index);
    const type = String(node.type || "");
    const version = ctx.designSpec.designSpecVersion;
    const attrs = (version === "3.0" || version === "4.0" || version === "5.0" || version === "6.0" || version === "7.0")
      ? plannedLayoutAttributes(resolved.section.layout, resolvePlan(node, ctx, resolved.index), type, version)
      : version === "2.0" ? strictLayoutAttributes(resolved.section.layout) : layoutAttributes(node.layout);
    if (type === "brand-header") {
      const links = (content.links || []).map(function (link) { return '<a href="' + esc(link.href || "#") + '">' + esc(link.label) + '</a>'; }).join("");
      return '<header class="bp-header" data-bp-id="' + esc(node.id) + '"' + attrs + '><a class="bp-header__brand" href="#top">' + esc(content.brandName || content.headline || (ctx && ctx.businessName) || "") + '</a>' + (links ? '<nav class="bp-header__nav">' + links + '</nav>' : '') + '</header>';
    }
    if (type === "footer") {
      return '<footer class="bp-footer" data-bp-id="' + esc(node.id) + '"' + attrs + '><div class="bp-footer__inner"><strong>' + esc(content.brandName || (ctx && ctx.businessName) || "") + '</strong>' + (content.tagline || content.lead ? '<p>' + esc(content.tagline || content.lead) + '</p>' : '') + '<div class="bp-actions">' + renderActions(content.actions) + '</div></div></footer>';
    }

    const ownMedia = content.media || [];
    const body = (content.body || []).map(function (paragraph) { return '<p>' + esc(paragraph) + '</p>'; }).join("");
    const collection = renderCollection(content);
    const copy = '<div class="bp-section__copy">' + (content.headline ? '<h' + (type === "hero" ? '1' : '2') + '>' + esc(content.headline) + '</h' + (type === "hero" ? '1' : '2') + '>' : '') + (content.lead ? '<p class="bp-section__lead">' + esc(content.lead) + '</p>' : '') + body + '<div class="bp-actions">' + renderActions(content.actions) + '</div></div>';
    return '<section class="bp-section bp-section--' + safeToken(type) + '" id="' + esc(content.anchor || node.id) + '" data-bp-id="' + esc(node.id) + '"' + attrs + '><div class="bp-section__inner">' + renderMedia(ownMedia, content.headline) + copy + (collection ? '<div class="bp-collection">' + collection + '</div>' : '') + '</div></section>';
  }

  function renderTree(blueprint, ctx) {
    const root = blueprint.root;
    if (!root || !Array.isArray(root.children)) {
      return { ok: false, error: "empty_tree" };
    }

    try { validateCompositionPlan(blueprint, ctx); }
    catch (error) { return { ok: false, error: String(error && error.message || error) }; }
    const parts = [];
    const errors = [];

    if (ctx.designSpec.designSpecVersion === "7.0") {
      (ctx.designSpec.compositionPlan.viewportScenes || []).forEach(function (scene) {
        const sceneParts = [];
        (scene.sectionIndexes || []).forEach(function (index) {
          const node = root.children[index];
          if (!node) return;
          try { sceneParts.push(renderSpecifiedNode(node, ctx)); }
          catch (error) { errors.push(String(error && error.message || error)); }
        });
        const sceneStyle = [
          "--bp-scene-min-height:" + cssValue(scene.resolvedMinHeight || scene.minHeight, "scene.minHeight"),
          "--bp-scene-grid:" + cssValue(scene.gridTemplate, "scene.gridTemplate"),
          "--bp-scene-rows:" + cssValue(scene.resolvedGridTemplateRows || scene.gridTemplateRows, "scene.gridTemplateRows"),
          "--bp-scene-gap:" + cssValue(scene.gap, "scene.gap"),
          "--bp-scene-padding:" + cssValue(scene.padding, "scene.padding"),
          "--bp-scene-bg:" + cssValue(scene.background, "scene.background"),
          "--bp-scene-color:" + cssValue(scene.color, "scene.color"),
        ].join(";");
        parts.push('<div class="bp-scene" data-scene-id="' + safeToken(scene.id) + '" style="' + sceneStyle + '">' + sceneParts.join("\n") + '</div>');
      });
    } else {
      root.children.forEach(function (node) {
        if (!node) return;
        if (node.type === "footer") return;
        try { parts.push(renderSpecifiedNode(node, ctx)); }
        catch (error) { errors.push(String(error && error.message || error)); }
      });
    }

    let footerHtml = "";
    root.children.forEach(function (node) {
      if (node && node.type === "footer") {
        if (ctx.designSpec.designSpecVersion === "7.0") return;
        try { footerHtml = renderSpecifiedNode(node, ctx); }
        catch (error) { errors.push(String(error && error.message || error)); }
      }
    });

    if (errors.length) {
      return { ok: false, error: errors.join("; "), partial: parts.join("\n"), footerHtml: footerHtml };
    }
    return { ok: true, html: parts.join("\n"), footerHtml: footerHtml };
  }

  function validateRenderedGeometry(mainEl, version) {
    if (!mainEl || version !== "7.0") return [];
    const errors = [];
    const view = mainEl.ownerDocument && mainEl.ownerDocument.defaultView;
    const viewportHeight = Math.max(600, Number(view && view.innerHeight) || 800);
    if (mainEl.scrollWidth > mainEl.clientWidth + 2) errors.push("horizontal_overflow");
    const scenes = Array.from(mainEl.querySelectorAll(":scope > .bp-scene"));
    if (!scenes.length) errors.push("viewport_scenes_missing");
    scenes.forEach(function (scene, sceneIndex) {
      const rect = scene.getBoundingClientRect();
      const members = Array.from(scene.querySelectorAll(":scope > [data-source-design-spec=\"7.0\"]"));
      if (!members.length) errors.push("scene_empty:" + sceneIndex);
      const allowedSceneHeight = Math.max(1200, viewportHeight * Math.max(1.65, members.length * 0.95));
      // På den smala editor-/mobilduken staplas scenmedlemmarna. Då är en
      // hög scen naturlig och ska inte felklassas som ett tomt jättesjok.
      if (mainEl.clientWidth > 700 && rect.height > allowedSceneHeight) errors.push("scene_too_tall:" + sceneIndex);
      members.forEach(function (member, memberIndex) {
        const memberRect = member.getBoundingClientRect();
        if (memberRect.left < rect.left - 2 || memberRect.right > rect.right + 2) errors.push("scene_member_clipped:" + sceneIndex + ":" + memberIndex);
      });
      scene.querySelectorAll(".bp-action").forEach(function (action, actionIndex) {
        const actionRect = action.getBoundingClientRect();
        if (actionRect.left < rect.left - 2 || actionRect.right > rect.right + 2 || actionRect.top < rect.top - 2 || actionRect.bottom > rect.bottom + 2) errors.push("scene_action_clipped:" + sceneIndex + ":" + actionIndex);
      });
    });
    mainEl.querySelectorAll(".bp-section h1, .bp-section h2").forEach(function (heading, index) {
      const size = parseFloat((view && view.getComputedStyle(heading).fontSize) || "0");
      if (size > 144.5) errors.push("heading_scale:" + index);
    });
    if (!mainEl.querySelector(".bp-section--hero")) errors.push("hero_missing");
    if (!mainEl.querySelector(".bp-footer")) errors.push("footer_missing");
    return errors;
  }

  /**
   * @returns {boolean}
   */
  function mount(doc, mainEl, footerEl) {
    if (!mainEl || !doc || !doc.page) return false;
    const page = doc.page;
    if (page.createPath !== "blueprint") return false;

    const blueprint = getBlueprint(doc);
    if (!blueprint) return false;
    const sourceDesignSpec = page.designSpec || (page.creativeConcept && page.creativeConcept.execution);
    const resolver = global.BlueprintLayoutResolver;
    const designSpec = resolver && typeof resolver.resolveDesignSpec === "function"
      ? resolver.resolveDesignSpec(sourceDesignSpec)
      : sourceDesignSpec;
    if (!designSpec || !designSpec.design || !Array.isArray(designSpec.sections)) {
      mainEl.innerHTML = '<div class="gen-blueprint-error" role="alert">Creative Director DesignSpec saknas.</div>';
      return true;
    }

    const generationId = String(doc.meta && doc.meta.visibleGenerationId || "");
    const generationTrace = generationId && global.GenerationTrace
      ? global.GenerationTrace.getTrace(doc, generationId)
      : null;
    if (generationTrace) {
      const renderManifest = global.GenerationTrace.createRenderManifest(doc, generationId, blueprint, designSpec);
      const requiresExactCommit = String(doc.meta && doc.meta.generationCommitPending || "") === generationId;
      const traceCheck = requiresExactCommit
        ? global.GenerationTrace.verifyRenderManifest(doc, generationId, renderManifest)
        : { ok: generationTrace.status === "persisted", reason: "generation_not_persisted" };
      if (!traceCheck.ok) {
        delete mainEl.dataset.generationId;
        if (footerEl) delete footerEl.dataset.generationId;
        mainEl.innerHTML =
          '<div class="gen-blueprint-error" role="alert">Generation trace mismatch: ' +
          String(traceCheck.reason || "unknown") +
          "</div>";
        return true;
      }
    }

    const ctx = {
      businessName: (blueprint.meta && blueprint.meta.businessName) || page.createBusinessName || "",
      location: (blueprint.meta && blueprint.meta.location) || "",
      designSpec: designSpec,
    };

    const result = renderTree(blueprint, ctx);
    if (!result.ok && !result.partial) {
      mainEl.innerHTML =
        '<div class="gen-blueprint-error" role="alert">Blueprint render failed: ' +
        String(result.error || "unknown") +
        "</div>";
      return true;
    }

    mainEl.classList.add("gen-site", "gen-site--blueprint");
    mainEl.dataset.layoutEngine = "blueprint";
    mainEl.dataset.createPath = "blueprint";
    if (generationTrace) {
      mainEl.dataset.generationId = generationId;
      document.documentElement.dataset.previewGenerationId = generationId;
    } else {
      delete mainEl.dataset.generationId;
      delete document.documentElement.dataset.previewGenerationId;
    }

    applyTokens(mainEl, designToTokens(designSpec.design));
    if (blueprint.meta && blueprint.meta.industry) {
      mainEl.dataset.genProfile = blueprint.meta.industry;
    }

    mainEl.innerHTML = result.html || result.partial || "";

    const visualErrors = validateRenderedGeometry(mainEl, designSpec.designSpecVersion);
    if (visualErrors.length) {
      mainEl.dataset.visualValidation = "failed";
      mainEl.dataset.visualValidationErrors = visualErrors.join(",");
      try { console.warn("Easily visual validation", visualErrors); } catch (e) { /* ignore */ }
    } else {
      mainEl.dataset.visualValidation = "passed";
    }

    mainEl.querySelectorAll("img").forEach(function (img) {
      function showFallback() {
        const host = img.closest("figure");
        if (host) host.classList.add("is-image-unavailable");
        img.remove();
      }
      img.addEventListener("error", showFallback, { once: true });
      if (img.complete && !img.naturalWidth) showFallback();
    });

    if (footerEl) {
      if (generationTrace) footerEl.dataset.generationId = generationId;
      else delete footerEl.dataset.generationId;
      if (result.footerHtml) {
        footerEl.hidden = false;
        footerEl.innerHTML = result.footerHtml;
        footerEl.classList.add("gen-footer-host");
      } else {
        footerEl.innerHTML = "";
        footerEl.hidden = true;
        footerEl.classList.remove("gen-footer-host");
      }
    }

    if (generationTrace && String(doc.meta && doc.meta.generationCommitPending || "") === generationId) {
      const SS = global.SiteState;
      if (SS && typeof SS.patch === "function") {
        SS.patch(function (current) {
          if (!current.meta || current.meta.generationCommitPending !== generationId) return;
          delete current.meta.generationCommitPending;
          current.meta.previewGenerationId = generationId;
        });
        if (typeof SS.save === "function") SS.save();
      }
    }

    return true;
  }

  global.BlueprintRenderer = {
    mount: mount,
    getBlueprint: getBlueprint,
    renderTree: renderTree,
    applyTokens: applyTokens,
    renderSpecifiedNode: renderSpecifiedNode,
    validateRenderedGeometry: validateRenderedGeometry,
  };
})(typeof window !== "undefined" ? window : globalThis);
