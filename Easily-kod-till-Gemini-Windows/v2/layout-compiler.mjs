import {
  canonicalSha256,
  validateLockedBlueprint,
  validateRenderManifest,
  validateResolvedSceneGraph,
} from "./contract-validator.mjs";

const esc = (value) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

const cssString = (value) => String(value ?? "")
  .replaceAll("\\", "\\\\")
  .replaceAll('"', '\\"')
  .replace(/[\r\n]+/g, " ");

function issue(code, message, context = {}) {
  return {
    code,
    message,
    sceneId: context.sceneId || null,
    nodeId: context.nodeId || null,
    relationId: context.relationId || null,
    instancePath: context.instancePath || "",
    details: context.details || {},
  };
}

function schemaIssues(result, artifact) {
  if (result.valid) return [];
  return result.errors.map((error) => issue(
    "invalid_" + artifact,
    error.message,
    { instancePath: error.instancePath, details: { artifact, keyword: error.keyword, params: error.params } },
  ));
}

function isInside(inner, outer) {
  const epsilon = 0.01;
  return inner.x >= outer.x - epsilon
    && inner.y >= outer.y - epsilon
    && inner.x + inner.width <= outer.x + outer.width + epsilon
    && inner.y + inner.height <= outer.y + outer.height + epsilon;
}

function overlapArea(a, b) {
  const width = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const height = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  return width > 0 && height > 0 ? width * height : 0;
}

function pairKey(left, right) {
  return [left, right].sort().join("\u0000");
}

function authoredRelationPairs(scene, acceptedKinds) {
  const pairs = new Set();
  const nodes = new Map((scene.nodes || []).map((node) => [node.id, node]));
  const descendants = (nodeId, visiting = new Set()) => {
    if (visiting.has(nodeId)) return [];
    const node = nodes.get(nodeId);
    if (!node || node.kind !== "group") return [nodeId];
    const nextVisiting = new Set(visiting).add(nodeId);
    return (node.children || []).flatMap((childId) => descendants(childId, nextVisiting));
  };
  for (const relation of scene.relations || []) {
    if (!acceptedKinds.has(relation.kind)) continue;
    const ids = [...(relation.subjects || []), ...(relation.target ? [relation.target] : [])];
    for (let left = 0; left < ids.length; left += 1) {
      for (let right = left + 1; right < ids.length; right += 1) {
        // A relation authored against a transparent group applies to the
        // group's visible leaves. This preserves the authored instruction; it
        // does not infer a new relationship.
        for (const leftId of descendants(ids[left])) {
          for (const rightId of descendants(ids[right])) {
            if (leftId !== rightId) pairs.add(pairKey(leftId, rightId));
          }
        }
      }
    }
  }
  return pairs;
}

function overlapPermissions(scene) {
  return authoredRelationPairs(scene, new Set(["overlap", "layer"]));
}

function separationRequirements(scene) {
  return authoredRelationPairs(scene, new Set(["avoid"]));
}

function isTextBearing(node) {
  return node && (node.kind === "text" || node.kind === "action" || node.kind === "input");
}

function estimatedTextHeight(text, bounds, typography) {
  if (!text || !typography || !Number.isFinite(bounds?.width) || bounds.width <= 0) return 0;
  const fontSize = Number(typography.fontSizePx) || 16;
  const lineHeight = Number(typography.lineHeightPx) || fontSize * 1.2;
  const letterSpacing = Math.max(0, Number(typography.letterSpacingPx) || 0);
  const averageGlyphWidth = Math.max(1, fontSize * 0.46 + letterSpacing);
  const charactersPerLine = Math.max(1, Math.floor(bounds.width / averageGlyphWidth));
  let lines = 1;
  let used = 0;
  for (const word of String(text).trim().split(/\s+/).filter(Boolean)) {
    const length = word.length;
    if (!used) {
      lines += Math.max(0, Math.ceil(length / charactersPerLine) - 1);
      used = length % charactersPerLine || Math.min(length, charactersPerLine);
    } else if (used + 1 + length <= charactersPerLine) {
      used += 1 + length;
    } else {
      lines += 1;
      lines += Math.max(0, Math.ceil(length / charactersPerLine) - 1);
      used = length % charactersPerLine || Math.min(length, charactersPerLine);
    }
  }
  return lines * lineHeight * 0.95;
}

function preflight(sceneGraph, resolvedSceneGraph) {
  const conflicts = [];
  const authoredScenes = new Map(sceneGraph.scenes.map((scene) => [scene.id, scene]));
  const maps = mapsFor(sceneGraph);

  for (const resolvedScene of resolvedSceneGraph.scenes) {
    const authoredScene = authoredScenes.get(resolvedScene.sceneId);
    if (!authoredScene) {
      conflicts.push(issue("scene_missing", "Resolved scene has no authored source scene.", { sceneId: resolvedScene.sceneId }));
      continue;
    }

    if (resolvedScene.bounds.width <= 0 || resolvedScene.bounds.height <= 0) {
      conflicts.push(issue("invalid_scene_bounds", "Scene bounds must have positive width and height.", {
        sceneId: resolvedScene.sceneId,
        details: { bounds: resolvedScene.bounds },
      }));
    }
    if (resolvedScene.bounds.x < 0 || resolvedScene.bounds.x + resolvedScene.bounds.width > resolvedSceneGraph.viewportInlinePx + 0.01) {
      conflicts.push(issue("scene_outside_viewport_inline", "Scene bounds extend outside the resolved viewport width.", {
        sceneId: resolvedScene.sceneId,
        details: { sceneBounds: resolvedScene.bounds, viewportInlinePx: resolvedSceneGraph.viewportInlinePx },
      }));
    }

    const authoredNodes = new Map(authoredScene.nodes.map((node) => [node.id, node]));
    const visibleLeaves = [];
    for (const resolvedNode of resolvedScene.nodes) {
      const authoredNode = authoredNodes.get(resolvedNode.nodeId);
      if (!authoredNode) {
        conflicts.push(issue("node_missing", "Resolved node has no authored source node.", {
          sceneId: resolvedScene.sceneId,
          nodeId: resolvedNode.nodeId,
        }));
        continue;
      }
      if (!resolvedNode.visible) continue;
      if (resolvedNode.bounds.width <= 0 || resolvedNode.bounds.height <= 0) {
        conflicts.push(issue("invalid_node_bounds", "Visible node bounds must have positive width and height.", {
          sceneId: resolvedScene.sceneId,
          nodeId: resolvedNode.nodeId,
          details: { bounds: resolvedNode.bounds },
        }));
      }
      if (!isInside(resolvedNode.bounds, resolvedScene.bounds)) {
        conflicts.push(issue("node_outside_scene", "Node bounds extend outside the authored scene.", {
          sceneId: resolvedScene.sceneId,
          nodeId: resolvedNode.nodeId,
          details: { nodeBounds: resolvedNode.bounds, sceneBounds: resolvedScene.bounds },
        }));
      }
      if ((authoredNode.kind === "text" || authoredNode.kind === "action") && !resolvedNode.resolvedTypography) {
        conflicts.push(issue("typography_unresolved", "A visible text-bearing node has no resolved typography.", {
          sceneId: resolvedScene.sceneId,
          nodeId: resolvedNode.nodeId,
        }));
      }
      if (isTextBearing(authoredNode) && resolvedNode.resolvedTypography) {
        const requiredHeight = estimatedTextHeight(contentText(authoredNode, maps), resolvedNode.bounds, resolvedNode.resolvedTypography);
        if (requiredHeight > resolvedNode.bounds.height + 0.01) {
          conflicts.push(issue("text_box_overflow", "Text cannot fit inside its authored bounds at the resolved typography size.", {
            sceneId: resolvedScene.sceneId,
            nodeId: resolvedNode.nodeId,
            details: { requiredHeight, availableHeight: resolvedNode.bounds.height, width: resolvedNode.bounds.width },
          }));
        }
      }
      if (authoredNode.kind !== "group") visibleLeaves.push({ authoredNode, resolvedNode });
    }

    const permittedOverlaps = overlapPermissions(authoredScene);
    const requiredSeparations = separationRequirements(authoredScene);
    for (let left = 0; left < visibleLeaves.length; left += 1) {
      for (let right = left + 1; right < visibleLeaves.length; right += 1) {
        const a = visibleLeaves[left];
        const b = visibleLeaves[right];
        const area = overlapArea(a.resolvedNode.bounds, b.resolvedNode.bounds);
        if (!area) continue;
        if (isTextBearing(a.authoredNode) && isTextBearing(b.authoredNode)) {
          conflicts.push(issue("text_collision", "Readable text-bearing nodes may not overlap.", {
            sceneId: resolvedScene.sceneId,
            nodeId: a.authoredNode.id,
            details: { otherNodeId: b.authoredNode.id, overlapArea: area },
          }));
          continue;
        }
        const key = pairKey(a.authoredNode.id, b.authoredNode.id);
        if (requiredSeparations.has(key)) {
          conflicts.push(issue("authored_avoid_violated", "Resolved nodes overlap despite an authored avoid relation.", {
            sceneId: resolvedScene.sceneId,
            nodeId: a.authoredNode.id,
            details: { otherNodeId: b.authoredNode.id, overlapArea: area },
          }));
          continue;
        }
        if (permittedOverlaps.has(key)) continue;
        conflicts.push(issue("unauthorized_overlap", "Resolved nodes overlap without an authored overlap relation.", {
          sceneId: resolvedScene.sceneId,
          nodeId: a.authoredNode.id,
          details: { otherNodeId: b.authoredNode.id, overlapArea: area },
        }));
      }
    }
  }

  return conflicts;
}

function mapsFor(sceneGraph) {
  return {
    contents: new Map(sceneGraph.contentAtoms.map((item) => [item.id, item])),
    assets: new Map(sceneGraph.assetManifest.assets.map((item) => [item.id, item])),
    colors: new Map(sceneGraph.designLanguage.colorRoles.map((item) => [item.id, item])),
    typography: new Map(sceneGraph.designLanguage.typographyRoles.map((item) => [item.id, item])),
    styles: new Map(sceneGraph.designLanguage.styleTokens.map((item) => [item.id, item])),
  };
}

function contentValue(node, maps) {
  return node.contentRef ? maps.contents.get(node.contentRef)?.value : "";
}

function contentText(node, maps) {
  const value = contentValue(node, maps);
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (value && typeof value === "object") return String(value.label ?? value.text ?? value.value ?? "");
  return "";
}

function assetAlt(asset, node, maps) {
  if (node.accessibility?.decorative) return "";
  if (node.accessibility?.description) return String(node.accessibility.description);
  if (asset?.altContentRef) return String(maps.contents.get(asset.altContentRef)?.value ?? "");
  return "";
}

function renderNode(node, resolvedNode, maps, parents) {
  const attrs = [
    `class="easily-v2-node easily-v2-node--${esc(node.kind)}"`,
    `data-node-id="${esc(node.id)}"`,
    `data-node-kind="${esc(node.kind)}"`,
    `data-semantic-role="${esc(node.semanticRole)}"`,
    `style="--x:${resolvedNode.bounds.x}px;--y:${resolvedNode.bounds.y}px;--w:${resolvedNode.bounds.width}px;--h:${resolvedNode.bounds.height}px;--z:${resolvedNode.zIndex}"`,
  ];
  if (parents.has(node.id)) attrs.push(`data-parent-id="${esc(parents.get(node.id))}"`);
  if (node.contentRef) attrs.push(`data-content-ref="${esc(node.contentRef)}"`);
  if (node.assetRef) attrs.push(`data-asset-ref="${esc(node.assetRef)}"`);
  if (node.accessibility?.label) attrs.push(`aria-label="${esc(node.accessibility.label)}"`);
  if (node.accessibility?.liveRegion && node.accessibility.liveRegion !== "off") attrs.push(`aria-live="${esc(node.accessibility.liveRegion)}"`);

  if (node.kind === "group" || node.kind === "shape") {
    if (node.accessibility?.decorative || node.kind === "shape") attrs.push('aria-hidden="true"');
    return `<div ${attrs.join(" ")}></div>`;
  }
  if (node.kind === "text") {
    const level = node.accessibility?.headingLevel;
    const tag = level ? `h${level}` : "p";
    return `<${tag} ${attrs.join(" ")}>${esc(contentText(node, maps))}</${tag}>`;
  }
  if (node.kind === "media" || node.kind === "icon") {
    const asset = maps.assets.get(node.assetRef);
    return `<img ${attrs.join(" ")} src="${esc(asset?.source?.uri || "")}" alt="${esc(assetAlt(asset, node, maps))}" />`;
  }
  if (node.kind === "action") {
    const value = contentValue(node, maps);
    const label = contentText(node, maps) || node.accessibility?.label || "";
    const href = value && typeof value === "object" ? value.href : "";
    return href
      ? `<a ${attrs.join(" ")} href="${esc(href)}">${esc(label)}</a>`
      : `<button ${attrs.join(" ")} type="button">${esc(label)}</button>`;
  }
  if (node.kind === "input") {
    const value = contentValue(node, maps);
    const inputType = value && typeof value === "object" ? value.type || "text" : "text";
    const name = value && typeof value === "object" ? value.name || node.id : node.id;
    return `<input ${attrs.join(" ")} type="${esc(inputType)}" name="${esc(name)}" />`;
  }
  if (node.kind === "repeat") {
    return `<div ${attrs.join(" ")} data-repeat-source="${esc(node.dataBinding?.sourceContentRef || "")}"></div>`;
  }
  throw new Error(`unsupported primitive '${node.kind}'`);
}

function measureCss(value) {
  if (!value || typeof value !== "object" || !Number.isFinite(value.value) || !value.unit) return "";
  return `${value.value}${value.unit}`;
}

function nodeCss(node, resolvedNode, sceneBounds, maps, cropRelations) {
  const visual = node.visual || {};
  const declarations = [
    `left:${resolvedNode.bounds.x - sceneBounds.x}px`,
    `top:${resolvedNode.bounds.y - sceneBounds.y}px`,
    `width:${resolvedNode.bounds.width}px`,
    `height:${resolvedNode.bounds.height}px`,
    `z-index:${resolvedNode.zIndex}`,
    `visibility:${resolvedNode.visible ? "visible" : "hidden"}`,
  ];
  const color = maps.colors.get(visual.colorRoleId)?.value;
  const background = maps.colors.get(visual.backgroundRoleId)?.value;
  if (color) declarations.push(`color:${color}`);
  if (background) declarations.push(`background:${background}`);
  if (Number.isFinite(visual.opacity)) declarations.push(`opacity:${visual.opacity}`);
  if (visual.blendMode) declarations.push(`mix-blend-mode:${visual.blendMode}`);

  const radius = maps.styles.get(visual.radiusTokenId)?.value;
  const radiusCss = measureCss(radius);
  if (radiusCss) declarations.push(`border-radius:${radiusCss}`);
  const border = maps.styles.get(visual.borderTokenId)?.value;
  if (border && typeof border === "object") {
    const width = measureCss(border) || (Number.isFinite(border.width) ? `${border.width}px` : "");
    const borderColor = maps.colors.get(border.colorRoleId)?.value;
    if (width && borderColor) declarations.push(`border:${width} solid ${borderColor}`);
  }

  const typography = resolvedNode.resolvedTypography;
  const authoredTypography = typography ? maps.typography.get(typography.roleId) : null;
  if (typography) {
    declarations.push(`font-size:${typography.fontSizePx}px`);
    declarations.push(`line-height:${typography.lineHeightPx}px`);
    declarations.push(`letter-spacing:${typography.letterSpacingPx}px`);
  }
  if (authoredTypography) {
    declarations.push(`font-family:"${cssString(authoredTypography.family)}"${(authoredTypography.fallbacks || []).map((font) => `,"${cssString(font)}"`).join("")}`);
    declarations.push(`font-weight:${authoredTypography.weight}`);
    if (authoredTypography.style) declarations.push(`font-style:${authoredTypography.style}`);
    if (authoredTypography.textTransform) declarations.push(`text-transform:${authoredTypography.textTransform}`);
  }

  const crop = cropRelations.get(node.id);
  if (crop) {
    declarations.push(`object-fit:${crop.fit === "scaleDown" ? "scale-down" : crop.fit}`);
    if (crop.focalPoint) declarations.push(`object-position:${crop.focalPoint.x * 100}% ${crop.focalPoint.y * 100}%`);
  }
  return `[data-node-id="${cssString(node.id)}"]{${declarations.join(";")}}`;
}

function renderArtifacts(sceneGraph, resolvedSceneGraph) {
  const maps = mapsFor(sceneGraph);
  const authoredScenes = new Map(sceneGraph.scenes.map((scene) => [scene.id, scene]));
  const htmlScenes = [];
  const cssRules = [
    ".easily-v2-site{position:relative;margin:0;padding:0;overflow-x:clip}",
    ".easily-v2-scene{position:relative;margin:0;padding:0}",
    ".easily-v2-node{position:absolute;box-sizing:border-box;margin:0}",
    ".easily-v2-node--media,.easily-v2-node--icon{display:block}",
  ];

  for (const resolvedScene of resolvedSceneGraph.scenes) {
    const scene = authoredScenes.get(resolvedScene.sceneId);
    const authoredNodes = new Map(scene.nodes.map((node) => [node.id, node]));
    const resolvedNodes = new Map(resolvedScene.nodes.map((node) => [node.nodeId, node]));
    const parents = new Map();
    for (const node of scene.nodes) for (const child of node.children || []) parents.set(child, node.id);
    const cropRelations = new Map();
    for (const relation of scene.relations || []) {
      if (relation.kind === "cropFocus") for (const subject of relation.subjects || []) cropRelations.set(subject, relation);
    }

    const nodesHtml = resolvedScene.orderedNodeIds.map((nodeId) => {
      const node = authoredNodes.get(nodeId);
      const resolvedNode = resolvedNodes.get(nodeId);
      cssRules.push(nodeCss(node, resolvedNode, resolvedScene.bounds, maps, cropRelations));
      return renderNode(node, resolvedNode, maps, parents);
    }).join("\n");

    cssRules.push(`[data-scene-id="${cssString(scene.id)}"]{height:${resolvedScene.bounds.height}px}`);
    htmlScenes.push(`<section class="easily-v2-scene" data-scene-id="${esc(scene.id)}" data-experience-role="${esc(scene.experienceRole)}">\n${nodesHtml}\n</section>`);
  }

  return {
    html: `<div class="easily-v2-site" data-generation-id="${esc(sceneGraph.generationId)}">\n${htmlScenes.join("\n")}\n</div>`,
    css: cssRules.join("\n"),
  };
}

/**
 * Fail-closed compiler. It never repairs, substitutes or recomposes a scene.
 * A conflict returns no HTML and no CSS.
 */
export function compileLayout({ lockedBlueprint, resolvedSceneGraph, renderManifest }) {
  const conflicts = [
    ...schemaIssues(validateLockedBlueprint(lockedBlueprint), "locked_blueprint"),
    ...schemaIssues(validateResolvedSceneGraph(resolvedSceneGraph, { sceneGraph: lockedBlueprint?.unresolvedSceneGraph }), "resolved_scene_graph"),
    ...schemaIssues(validateRenderManifest(renderManifest, { lockedBlueprint, resolvedSceneGraph }), "render_manifest"),
  ];
  if (conflicts.length) return { ok: false, conflicts, html: null, css: null, receipt: null };

  const sceneGraph = lockedBlueprint.unresolvedSceneGraph;
  conflicts.push(...preflight(sceneGraph, resolvedSceneGraph));
  if (conflicts.length) return { ok: false, conflicts, html: null, css: null, receipt: null };

  let rendered;
  try {
    rendered = renderArtifacts(sceneGraph, resolvedSceneGraph);
  } catch (error) {
    conflicts.push(issue("primitive_render_failed", error?.message || String(error)));
    return { ok: false, conflicts, html: null, css: null, receipt: null };
  }

  const receipt = {
    schemaVersion: "2.0",
    generationId: sceneGraph.generationId,
    viewportProfileId: resolvedSceneGraph.profileId,
    unresolvedSceneGraphSha256: canonicalSha256(sceneGraph),
    lockedBlueprintSha256: canonicalSha256(lockedBlueprint),
    resolvedSceneGraphSha256: canonicalSha256(resolvedSceneGraph),
    renderManifestSha256: canonicalSha256(renderManifest),
    htmlSha256: canonicalSha256(rendered.html),
    cssSha256: canonicalSha256(rendered.css),
    orderedSceneIds: [...renderManifest.orderedSceneIds],
    orderedNodeIds: [...renderManifest.orderedNodeIds],
  };

  return { ok: true, conflicts: [], ...rendered, receipt };
}
