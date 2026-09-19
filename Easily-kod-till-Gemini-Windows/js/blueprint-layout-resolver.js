/** Deterministisk geometri mellan Creative Directors intention och DOM. */
(function (global) {
  "use strict";
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function px(value) { const m = String(value || "").trim().match(/^(\d+(?:\.\d+)?)px$/i); return m ? Number(m[1]) : NaN; }
  function cssPx(value) { return Math.max(0, Math.round(value)) + "px"; }
  function gridRange(value) {
    const match = String(value || "").trim().match(/^(\d+)\s*\/\s*(\d+)$/);
    if (!match) return null;
    const start = Number(match[1]), end = Number(match[2]);
    return end > start ? { start: start, end: end, span: end - start } : null;
  }
  function repeatCount(value) {
    const match = String(value || "").match(/repeat\(\s*(\d+)/i);
    return match ? Math.max(1, Number(match[1])) : 0;
  }
  function sceneArea(value) {
    const parts = String(value || "").split("/").map(function (part) { return Number(part.trim()); });
    if (parts.length !== 4 || parts.some(function (part) { return !Number.isFinite(part); })) return null;
    return parts[2] > parts[0] && parts[3] > parts[1]
      ? { rowStart: parts[0], columnStart: parts[1], rowEnd: parts[2], columnEnd: parts[3], columnSpan: parts[3] - parts[1] }
      : null;
  }
  function normalizeCollectionGrid(layout, itemCount, index, corrections) {
    if (!layout || !itemCount) return;
    const raw = String(layout.collectionColumns || "").trim();
    if (/^\d+$/.test(raw)) {
      const count = Math.max(1, Math.min(itemCount, Number(raw)));
      layout.collectionColumns = "repeat(" + count + ", minmax(0, 1fr))";
      corrections.push({ type: "collection_template_normalized", sectionIndex: index, from: raw, to: layout.collectionColumns });
    }
  }
  function percent(value) {
    const match = String(value || "").trim().match(/^(\d+(?:\.\d+)?)%$/);
    return match ? Number(match[1]) : NaN;
  }
  function stabilizeSection(section, entry, index, corrections) {
    if (!section || !section.layout || !entry) return;
    const layout = section.layout;
    const items = Array.isArray(section.items) ? section.items : [];
    normalizeCollectionGrid(layout, items.length, index, corrections);
    const area = sceneArea(entry.sceneArea);
    const contentHeavy = String(section.headline || "").length + String(section.lead || "").length
      + (section.body || []).join(" ").length > 120 || items.length > 1;
    if (area && area.columnSpan < 9 && contentHeavy) {
      const from = entry.sceneArea;
      entry.sceneArea = area.rowStart + " / 1 / " + area.rowEnd + " / 13";
      corrections.push({ type: "nested_scene_width_stabilized", sectionIndex: index, from: from, to: entry.sceneArea });
    }
    const contentWidth = percent(entry.contentWidth);
    if (area && area.columnSpan < 9 && (!Number.isFinite(contentWidth) || contentWidth < 100)) {
      corrections.push({ type: "nested_content_width_stabilized", sectionIndex: index, from: entry.contentWidth, to: "100%" });
      entry.contentWidth = "100%";
    }
    if (section.component === "hero") {
      const copy = gridRange(layout.copyColumn), media = gridRange(layout.mediaColumn);
      const tooNarrow = !copy || copy.span < 5;
      const overlaps = copy && media && copy.end > media.start;
      if (tooNarrow || overlaps) {
        corrections.push({ type: "hero_columns_stabilized", sectionIndex: index, from: { copy: layout.copyColumn, media: layout.mediaColumn }, to: { copy: "1 / 7", media: "7 / 13" } });
        layout.copyColumn = "1 / 7";
        layout.mediaColumn = "7 / 13";
        layout.copyOffsetX = "0";
        layout.mediaOffsetX = "0";
      }
      const heroContentWidth = percent(entry.contentWidth);
      if (!Number.isFinite(heroContentWidth) || heroContentWidth < 92) {
        corrections.push({ type: "hero_content_width_stabilized", sectionIndex: index, from: entry.contentWidth, to: "100%" });
        entry.contentWidth = "100%";
      }
    }
    if (["card-grid", "product-grid", "category-showcase", "media-gallery", "trust-strip", "testimonial-strip", "faq-list", "content-block"].includes(section.component)) {
      const columns = repeatCount(layout.collectionColumns);
      const incompatible = columns > 0 && items.some(function (item) {
        const range = gridRange(item && item.layout && item.layout.gridColumn);
        return range && (range.end > columns + 1 || range.span > columns);
      });
      if (incompatible) {
        items.forEach(function (item) {
          if (!item || !item.layout) return;
          item.layout.gridColumn = "auto";
          item.layout.gridRow = "auto";
          item.layout.offsetX = "0";
          item.layout.offsetY = "0";
        });
        corrections.push({ type: "collection_grid_stabilized", sectionIndex: index, columns: columns });
      }
    }
    if (section.component === "contact-block" && entry.ctaMode === "detached") {
      entry.ctaMode = "inline";
      corrections.push({ type: "detached_contact_action_stabilized", sectionIndex: index });
    }
  }
  function textHeight(section) {
    const headline = String(section.headline || "");
    const rest = [section.lead].concat(section.body || []).join(" ");
    const heading = Math.min(144, Math.max(18, px(section.layout && section.layout.headingSize) || 42));
    return Math.ceil(Math.max(1, Math.ceil(headline.length / Math.max(10, 720 / heading))) * heading * 1.08 + Math.ceil(rest.length / 58) * 25 + (section.primaryAction && section.primaryAction.label ? 72 : 24));
  }
  function collectionHeight(section) {
    const items = Array.isArray(section.items) ? section.items : [];
    if (!items.length) return 0;
    const repeat = String(section.layout && section.layout.collectionColumns || "").match(/repeat\((\d+)/i);
    const columns = repeat ? Math.max(1, Number(repeat[1])) : 1;
    const rows = Math.ceil(items.length / columns);
    const tallest = items.reduce(function (h, item) { return Math.max(h, px(item && item.layout && item.layout.minHeight) || 220); }, 0);
    return rows * tallest + Math.max(0, rows - 1) * (px(section.layout && section.layout.collectionGap) || 24);
  }
  function requiredSectionHeight(section, plan) {
    const padding = (px(plan.paddingTop) || 0) + (px(plan.paddingBottom) || 0);
    const media = Array.isArray(section.imageUrls) && section.imageUrls.length ? (px(section.layout && section.layout.mediaHeight) || 320) : 0;
    return Math.max(96, Math.max(textHeight(section), media, collectionHeight(section)) + padding);
  }
  function resolveDesignSpec(input) {
    if (!input || input.designSpecVersion !== "7.0") return input;
    const spec = clone(input), plan = spec.compositionPlan, corrections = [];
    (plan.sections || []).forEach(function (entry, index) {
      stabilizeSection(spec.sections[index], entry, index, corrections);
      const required = requiredSectionHeight(spec.sections[index] || {}, entry), intended = px(entry.relativeHeight);
      const resolved = Math.max(Number.isFinite(intended) ? intended : 0, required);
      entry.resolvedMinHeight = cssPx(resolved);
      if (!Number.isFinite(intended) || resolved > intended + 1) corrections.push({ type: "section_expanded", sectionIndex: index, from: entry.relativeHeight, to: entry.resolvedMinHeight });
    });
    (plan.viewportScenes || []).forEach(function (scene) {
      const rowHeights = new Map();
      (scene.sectionIndexes || []).forEach(function (index) {
        const entry = plan.sections[index], row = Math.max(1, Number(String(entry && entry.sceneArea || "1").split("/")[0].trim()) || 1);
        rowHeights.set(row, Math.max(rowHeights.get(row) || 0, px(entry && entry.resolvedMinHeight) || 0));
      });
      const usedRows = Array.from(rowHeights.keys()).sort(function (a, b) { return a - b; });
      const maxRow = usedRows.length ? usedRows[usedRows.length - 1] : 0;
      const rows = Array.from({ length: maxRow }, function (_, index) { return index + 1; });
      const padding = String(scene.padding || "").match(/\d+(?:\.\d+)?px/g) || [];
      const required = rows.reduce(function (sum, row) { return sum + (rowHeights.get(row) || 0); }, 0) + Math.max(0, rows.length - 1) * (px(scene.gap) || 0) + 2 * (px(padding[0]) || 0);
      const intended = px(scene.minHeight), resolved = Math.max(Number.isFinite(intended) ? intended : 0, required);
      scene.resolvedMinHeight = cssPx(resolved);
      scene.resolvedGridTemplateRows = rows.length ? rows.map(function (row) { return rowHeights.has(row) ? "minmax(" + cssPx(rowHeights.get(row)) + ", auto)" : "minmax(0, auto)"; }).join(" ") : "auto";
      if (!Number.isFinite(intended) || resolved > intended + 1) corrections.push({ type: "scene_expanded", sceneId: scene.id, from: scene.minHeight, to: scene.resolvedMinHeight });
    });
    spec.layoutResolution = { version: "1.0", corrections: corrections };
    return spec;
  }
  global.BlueprintLayoutResolver = { resolveDesignSpec: resolveDesignSpec };
})(typeof window !== "undefined" ? window : globalThis);
