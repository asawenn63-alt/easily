import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const schemaUrl = new URL("../docs/V2-SCENE-GRAPH.schema.json", import.meta.url);
export const V2_SCHEMA = JSON.parse(readFileSync(fileURLToPath(schemaUrl), "utf8"));

const ajv = new Ajv2020({ allErrors: true, strict: false, validateFormats: true });
addFormats(ajv);
ajv.addSchema(V2_SCHEMA);

const schemaValidators = new Map();

function schemaValidator(definition) {
  const key = definition || "sceneGraph";
  if (!schemaValidators.has(key)) {
    const ref = definition ? `${V2_SCHEMA.$id}#/$defs/${definition}` : V2_SCHEMA.$id;
    schemaValidators.set(key, ajv.compile({ $ref: ref }));
  }
  return schemaValidators.get(key);
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, stableValue(value[key])]),
    );
  }
  return value;
}

export function canonicalSha256(value) {
  return createHash("sha256").update(JSON.stringify(stableValue(value))).digest("hex");
}

function schemaErrors(validate) {
  return (validate.errors || []).map((error) => ({
    source: "schema",
    keyword: error.keyword,
    instancePath: error.instancePath || "",
    message: error.message || "schema validation failed",
    params: error.params || {},
  }));
}

function semanticError(errors, keyword, instancePath, message, params = {}) {
  errors.push({ source: "semantic", keyword, instancePath, message, params });
}

function validateBySchema(definition, value) {
  const validate = schemaValidator(definition);
  const valid = validate(value);
  return valid ? [] : schemaErrors(validate);
}

function sameMembers(left, right) {
  return left.length === right.length && left.every((value) => right.includes(value));
}

function uniqueDomain(errors, domainName, items, getId = (item) => item.id) {
  const seen = new Set();
  const map = new Map();
  items.forEach((item, index) => {
    const id = getId(item);
    if (seen.has(id)) {
      semanticError(errors, "uniqueGraphId", `/${domainName}/${index}/id`, `duplicate graphId '${id}' in ${domainName}`, {
        domain: domainName,
        id,
      });
    }
    seen.add(id);
    map.set(id, item);
  });
  return map;
}

function requireRef(errors, map, value, instancePath, domain) {
  if (value !== undefined && !map.has(value)) {
    semanticError(errors, "referenceIntegrity", instancePath, `reference '${value}' does not resolve in ${domain}`, {
      domain,
      value,
    });
  }
}

function requireRefs(errors, map, values, instancePath, domain) {
  (values || []).forEach((value, index) => requireRef(errors, map, value, `${instancePath}/${index}`, domain));
}

function isOpaquePayloadPath(path) {
  return (
    /^\/contentAtoms\/\d+\/(value|variants)(\/|$)/.test(path) ||
    /^\/designLanguage\/styleTokens\/\d+\/value(\/|$)/.test(path)
  );
}

function validateRecipePolicy(value, errors) {
  const forbidden = new Set(V2_SCHEMA["x-easily-contract"].recipePolicy.forbiddenStructuralPropertyNames);
  const visit = (current, path) => {
    if (isOpaquePayloadPath(path) || current === null || typeof current !== "object") return;
    if (Array.isArray(current)) {
      current.forEach((item, index) => visit(item, `${path}/${index}`));
      return;
    }
    for (const [key, child] of Object.entries(current)) {
      const childPath = `${path}/${key}`;
      if (forbidden.has(key)) {
        semanticError(errors, "recipePolicy", childPath, `forbidden structural recipe property '${key}'`, { property: key });
      }
      visit(child, childPath);
    }
  };
  visit(value, "");
}

function queryMatches(query, inlinePx, blockPx) {
  if (query.minInlinePx !== undefined && inlinePx < query.minInlinePx) return false;
  if (query.maxInlinePx !== undefined && inlinePx > query.maxInlinePx) return false;
  if (query.minBlockPx !== undefined && blockPx < query.minBlockPx) return false;
  if (query.maxBlockPx !== undefined && blockPx > query.maxBlockPx) return false;
  return true;
}

export function selectViewportProfile(sceneGraph, inlinePx, blockPx) {
  const matches = sceneGraph.responsive.profiles.filter((profile) => queryMatches(profile.query, inlinePx, blockPx));
  if (!matches.length) {
    return sceneGraph.responsive.profiles.find((profile) => profile.id === sceneGraph.responsive.baseProfileId) || null;
  }
  const highest = Math.max(...matches.map((profile) => profile.priority));
  const winners = matches.filter((profile) => profile.priority === highest);
  if (winners.length !== 1) {
    throw new Error(`ambiguous viewport profile selection at ${inlinePx}x${blockPx}: ${winners.map((p) => p.id).join(", ")}`);
  }
  return winners[0];
}

function rangesOverlap(aMin, aMax, bMin, bMax) {
  const leftMin = aMin ?? Number.NEGATIVE_INFINITY;
  const leftMax = aMax ?? Number.POSITIVE_INFINITY;
  const rightMin = bMin ?? Number.NEGATIVE_INFINITY;
  const rightMax = bMax ?? Number.POSITIVE_INFINITY;
  return leftMin <= rightMax && rightMin <= leftMax;
}

function queriesOverlap(left, right) {
  return (
    rangesOverlap(left.minInlinePx, left.maxInlinePx, right.minInlinePx, right.maxInlinePx) &&
    rangesOverlap(left.minBlockPx, left.maxBlockPx, right.minBlockPx, right.maxBlockPx)
  );
}

function validateTimeline(errors, timeline, index, domains) {
  const path = `/motion/timelines/${index}`;
  const trackMap = uniqueDomain(errors, `motion/timelines/${index}/tracks`, timeline.tracks || []);
  requireRefs(errors, domains.nodes, (timeline.tracks || []).map((track) => track.targetId), `${path}/tracks`, "scenes.nodes");

  for (const [trackIndex, track] of (timeline.tracks || []).entries()) {
    if (track.relationId !== undefined) {
      requireRef(errors, domains.relations, track.relationId, `${path}/tracks/${trackIndex}/relationId`, "scenes.relations");
    }
    const offsets = (track.keyframes || []).map((keyframe) => keyframe.offset);
    if (offsets.length && (offsets[0] !== 0 || offsets.at(-1) !== 1)) {
      semanticError(errors, "timelineOffsets", `${path}/tracks/${trackIndex}/keyframes`, "keyframes must start at offset 0 and end at offset 1");
    }
    for (let keyframeIndex = 1; keyframeIndex < offsets.length; keyframeIndex += 1) {
      if (offsets[keyframeIndex] <= offsets[keyframeIndex - 1]) {
        semanticError(errors, "timelineOffsets", `${path}/tracks/${trackIndex}/keyframes/${keyframeIndex}/offset`, "keyframe offsets must be strictly ascending");
      }
    }
  }

  const orderedTrackIds = timeline.coordination?.orderedTrackIds || [];
  if (!sameMembers([...trackMap.keys()], orderedTrackIds)) {
    semanticError(errors, "motionCoordination", `${path}/coordination/orderedTrackIds`, "orderedTrackIds must contain every timeline track id exactly once");
  }

  const trigger = timeline.trigger || {};
  if (trigger.sourceSceneId !== undefined) {
    requireRef(errors, domains.scenes, trigger.sourceSceneId, `${path}/trigger/sourceSceneId`, "scenes");
  }
  if (trigger.kind === "viewportProgress" && !(trigger.startProgress < trigger.endProgress)) {
    semanticError(errors, "viewportProgress", `${path}/trigger`, "startProgress must be less than endProgress");
  }
  if (trigger.stateMachineId !== undefined) {
    requireRef(errors, domains.stateMachines, trigger.stateMachineId, `${path}/trigger/stateMachineId`, "interactions.stateMachines");
    const machine = domains.stateMachines.get(trigger.stateMachineId);
    const states = new Set((machine?.states || []).map((state) => state.id));
    if (!states.has(trigger.fromStateId)) semanticError(errors, "referenceIntegrity", `${path}/trigger/fromStateId`, "fromStateId does not resolve in the trigger state machine");
    if (!states.has(trigger.toStateId)) semanticError(errors, "referenceIntegrity", `${path}/trigger/toStateId`, "toStateId does not resolve in the trigger state machine");
  }
  if (trigger.eventTargetId !== undefined) {
    requireRef(errors, domains.nodes, trigger.eventTargetId, `${path}/trigger/eventTargetId`, "scenes.nodes");
  }
}

function validateOperationReferences(errors, operation, path, domains) {
  if (operation.targetId !== undefined) requireRef(errors, domains.nodes, operation.targetId, `${path}/targetId`, "scenes.nodes");
  if (operation.relationId !== undefined) requireRef(errors, domains.relations, operation.relationId, `${path}/relationId`, "scenes.relations");
  if (operation.timelineId !== undefined) requireRef(errors, domains.timelines, operation.timelineId, `${path}/timelineId`, "motion.timelines");
  if (operation.contentRef !== undefined) requireRef(errors, domains.content, operation.contentRef, `${path}/contentRef`, "contentAtoms");
  if (operation.assetRef !== undefined) requireRef(errors, domains.assets, operation.assetRef, `${path}/assetRef`, "assetManifest.assets");
  requireRefs(errors, domains.nodes, operation.orderedNodeIds, `${path}/orderedNodeIds`, "scenes.nodes");
  if (operation.override?.orderedNodeIds) requireRefs(errors, domains.nodes, operation.override.orderedNodeIds, `${path}/override/orderedNodeIds`, "scenes.nodes");
  const reduced = operation.reducedMotion;
  if (reduced) validateReducedMotion(errors, reduced, `${path}/reducedMotion`, domains.timelines);
}

function validateReducedMotion(errors, reducedMotion, path, timelines) {
  if (reducedMotion.policy === "replaceTimeline") {
    if (!reducedMotion.replacementTimelineId) {
      semanticError(errors, "reducedMotion", path, "replaceTimeline requires replacementTimelineId");
    } else {
      requireRef(errors, timelines, reducedMotion.replacementTimelineId, `${path}/replacementTimelineId`, "motion.timelines");
    }
  } else if (reducedMotion.replacementTimelineId !== undefined) {
    semanticError(errors, "reducedMotion", `${path}/replacementTimelineId`, "replacementTimelineId is only allowed for replaceTimeline");
  }
}

function buildDomains(sceneGraph, errors) {
  const scenes = uniqueDomain(errors, "scenes", sceneGraph.scenes || []);
  const nodes = uniqueDomain(errors, "scenes.nodes", (sceneGraph.scenes || []).flatMap((scene) => scene.nodes || []));
  const relations = uniqueDomain(errors, "scenes.relations", (sceneGraph.scenes || []).flatMap((scene) => scene.relations || []));
  const stateMachines = uniqueDomain(errors, "interactions/stateMachines", sceneGraph.interactions?.stateMachines || []);
  const states = uniqueDomain(errors, "interactions/stateMachines/states", (sceneGraph.interactions?.stateMachines || []).flatMap((machine) => machine.states || []));
  const timelines = uniqueDomain(errors, "motion/timelines", sceneGraph.motion?.timelines || []);
  const tracks = uniqueDomain(errors, "motion/timelines/tracks", (sceneGraph.motion?.timelines || []).flatMap((timeline) => timeline.tracks || []));
  const profiles = uniqueDomain(errors, "responsive/profiles", sceneGraph.responsive?.profiles || []);
  return {
    content: uniqueDomain(errors, "contentAtoms", sceneGraph.contentAtoms || []),
    assets: uniqueDomain(errors, "assetManifest/assets", sceneGraph.assetManifest?.assets || []),
    colors: uniqueDomain(errors, "designLanguage/colorRoles", sceneGraph.designLanguage?.colorRoles || []),
    typography: uniqueDomain(errors, "designLanguage/typographyRoles", sceneGraph.designLanguage?.typographyRoles || []),
    styles: uniqueDomain(errors, "designLanguage/styleTokens", sceneGraph.designLanguage?.styleTokens || []),
    motifs: uniqueDomain(errors, "designLanguage/motifs", sceneGraph.designLanguage?.motifs || []),
    initiatives: uniqueDomain(errors, "designLanguage/creativeInitiatives", sceneGraph.designLanguage?.creativeInitiatives || []),
    scenes,
    nodes,
    relations,
    stateMachines,
    states,
    timelines,
    tracks,
    profiles,
  };
}

function validateGraphSemantics(sceneGraph) {
  const errors = [];
  validateRecipePolicy(sceneGraph, errors);
  const domains = buildDomains(sceneGraph, errors);

  for (const [index, asset] of (sceneGraph.assetManifest?.assets || []).entries()) {
    if (asset.altContentRef !== undefined) requireRef(errors, domains.content, asset.altContentRef, `/assetManifest/assets/${index}/altContentRef`, "contentAtoms");
  }

  for (const [index, color] of (sceneGraph.designLanguage?.colorRoles || []).entries()) {
    requireRefs(errors, domains.colors, color.allowedForegroundRoleIds, `/designLanguage/colorRoles/${index}/allowedForegroundRoleIds`, "designLanguage.colorRoles");
    requireRefs(errors, domains.colors, color.allowedBackgroundRoleIds, `/designLanguage/colorRoles/${index}/allowedBackgroundRoleIds`, "designLanguage.colorRoles");
  }
  for (const [index, motif] of (sceneGraph.designLanguage?.motifs || []).entries()) {
    requireRefs(errors, domains.styles, motif.styleRoleIds, `/designLanguage/motifs/${index}/styleRoleIds`, "designLanguage.styleTokens");
  }
  for (const [index, initiative] of (sceneGraph.designLanguage?.creativeInitiatives || []).entries()) {
    requireRefs(errors, domains.scenes, initiative.sceneIds, `/designLanguage/creativeInitiatives/${index}/sceneIds`, "scenes");
    requireRefs(errors, domains.motifs, initiative.motifIds, `/designLanguage/creativeInitiatives/${index}/motifIds`, "designLanguage.motifs");
  }

  const sceneOrder = sceneGraph.pageFlow?.sceneOrder || [];
  requireRefs(errors, domains.scenes, sceneOrder, "/pageFlow/sceneOrder", "scenes");
  if (!sameMembers([...domains.scenes.keys()], sceneOrder)) {
    semanticError(errors, "pageFlow", "/pageFlow/sceneOrder", "sceneOrder must contain every scene id exactly once");
  }
  requireRef(errors, domains.scenes, sceneGraph.pageFlow?.entrySceneId, "/pageFlow/entrySceneId", "scenes");
  requireRef(errors, domains.scenes, sceneGraph.pageFlow?.closureSceneId, "/pageFlow/closureSceneId", "scenes");
  if (sceneOrder.length && sceneGraph.pageFlow?.entrySceneId !== sceneOrder[0]) semanticError(errors, "pageFlow", "/pageFlow/entrySceneId", "entrySceneId must be the first scene in sceneOrder");
  if (sceneOrder.length && sceneGraph.pageFlow?.closureSceneId !== sceneOrder.at(-1)) semanticError(errors, "pageFlow", "/pageFlow/closureSceneId", "closureSceneId must be the last scene in sceneOrder");

  for (const [sceneIndex, scene] of (sceneGraph.scenes || []).entries()) {
    const sceneNodeMap = new Map((scene.nodes || []).map((node) => [node.id, node]));
    requireRefs(errors, sceneNodeMap, scene.focalSequence, `/scenes/${sceneIndex}/focalSequence`, `scenes[${scene.id}].nodes`);
    requireRefs(errors, domains.motifs, scene.transitionIn?.sharedMotifIds, `/scenes/${sceneIndex}/transitionIn/sharedMotifIds`, "designLanguage.motifs");
    requireRefs(errors, domains.motifs, scene.transitionOut?.sharedMotifIds, `/scenes/${sceneIndex}/transitionOut/sharedMotifIds`, "designLanguage.motifs");
    for (const [nodeIndex, node] of (scene.nodes || []).entries()) {
      const path = `/scenes/${sceneIndex}/nodes/${nodeIndex}`;
      requireRefs(errors, sceneNodeMap, node.children, `${path}/children`, `scenes[${scene.id}].nodes`);
      if (node.contentRef !== undefined) requireRef(errors, domains.content, node.contentRef, `${path}/contentRef`, "contentAtoms");
      if (node.assetRef !== undefined) requireRef(errors, domains.assets, node.assetRef, `${path}/assetRef`, "assetManifest.assets");
      if (node.dataBinding) {
        requireRef(errors, domains.content, node.dataBinding.sourceContentRef, `${path}/dataBinding/sourceContentRef`, "contentAtoms");
        const atom = domains.content.get(node.dataBinding.sourceContentRef);
        if (atom && atom.kind !== "data") semanticError(errors, "dataBinding", `${path}/dataBinding/sourceContentRef`, "repeat dataBinding must reference a data content atom");
      }
      requireRefs(errors, domains.motifs, node.motifIds, `${path}/motifIds`, "designLanguage.motifs");
      if (node.visual?.colorRoleId) requireRef(errors, domains.colors, node.visual.colorRoleId, `${path}/visual/colorRoleId`, "designLanguage.colorRoles");
      if (node.visual?.backgroundRoleId) requireRef(errors, domains.colors, node.visual.backgroundRoleId, `${path}/visual/backgroundRoleId`, "designLanguage.colorRoles");
      if (node.visual?.typographyRoleId) requireRef(errors, domains.typography, node.visual.typographyRoleId, `${path}/visual/typographyRoleId`, "designLanguage.typographyRoles");
      requireRefs(errors, domains.styles, node.visual?.styleRoleIds, `${path}/visual/styleRoleIds`, "designLanguage.styleTokens");
      if (node.visual?.radiusTokenId) requireRef(errors, domains.styles, node.visual.radiusTokenId, `${path}/visual/radiusTokenId`, "designLanguage.styleTokens");
      if (node.visual?.borderTokenId) requireRef(errors, domains.styles, node.visual.borderTokenId, `${path}/visual/borderTokenId`, "designLanguage.styleTokens");
    }
    for (const [relationIndex, relation] of (scene.relations || []).entries()) {
      const path = `/scenes/${sceneIndex}/relations/${relationIndex}`;
      requireRefs(errors, sceneNodeMap, relation.subjects, `${path}/subjects`, `scenes[${scene.id}].nodes`);
      if (relation.target !== undefined) requireRef(errors, sceneNodeMap, relation.target, `${path}/target`, `scenes[${scene.id}].nodes`);
      requireRefs(errors, sceneNodeMap, relation.orderedNodeIds, `${path}/orderedNodeIds`, `scenes[${scene.id}].nodes`);
    }
  }

  for (const [machineIndex, machine] of (sceneGraph.interactions?.stateMachines || []).entries()) {
    const stateMap = new Map((machine.states || []).map((state) => [state.id, state]));
    requireRef(errors, stateMap, machine.initialState, `/interactions/stateMachines/${machineIndex}/initialState`, `stateMachine[${machine.id}].states`);
    for (const [stateIndex, state] of (machine.states || []).entries()) {
      for (const [patchIndex, patch] of (state.patches || []).entries()) {
        const path = `/interactions/stateMachines/${machineIndex}/states/${stateIndex}/patches/${patchIndex}`;
        validateOperationReferences(errors, patch, path, domains);
        if (patch.op === "setRelation") {
          requireRefs(errors, domains.nodes, patch.relation.subjects, `${path}/relation/subjects`, "scenes.nodes");
          if (patch.relation.target) requireRef(errors, domains.nodes, patch.relation.target, `${path}/relation/target`, "scenes.nodes");
        }
      }
    }
    for (const [transitionIndex, transition] of (machine.transitions || []).entries()) {
      const path = `/interactions/stateMachines/${machineIndex}/transitions/${transitionIndex}`;
      requireRef(errors, stateMap, transition.from, `${path}/from`, `stateMachine[${machine.id}].states`);
      requireRef(errors, stateMap, transition.to, `${path}/to`, `stateMachine[${machine.id}].states`);
      if (transition.event?.eventTargetId) requireRef(errors, domains.nodes, transition.event.eventTargetId, `${path}/event/eventTargetId`, "scenes.nodes");
      if (transition.event?.sourceSceneId) requireRef(errors, domains.scenes, transition.event.sourceSceneId, `${path}/event/sourceSceneId`, "scenes");
      if (transition.timelineId) requireRef(errors, domains.timelines, transition.timelineId, `${path}/timelineId`, "motion.timelines");
    }
    if (machine.accessibilityPolicy?.announcementContentRef) requireRef(errors, domains.content, machine.accessibilityPolicy.announcementContentRef, `/interactions/stateMachines/${machineIndex}/accessibilityPolicy/announcementContentRef`, "contentAtoms");
  }

  (sceneGraph.motion?.timelines || []).forEach((timeline, index) => validateTimeline(errors, timeline, index, domains));
  for (const [index, timeline] of (sceneGraph.motion?.timelines || []).entries()) {
    validateReducedMotion(errors, timeline.reducedMotion, `/motion/timelines/${index}/reducedMotion`, domains.timelines);
  }

  requireRef(errors, domains.profiles, sceneGraph.responsive?.baseProfileId, "/responsive/baseProfileId", "responsive.profiles");
  const profiles = sceneGraph.responsive?.profiles || [];
  const priorities = new Set();
  for (const [profileIndex, profile] of profiles.entries()) {
    if (priorities.has(profile.priority)) semanticError(errors, "viewportSelection", `/responsive/profiles/${profileIndex}/priority`, `duplicate viewport priority '${profile.priority}'`);
    priorities.add(profile.priority);
    if (profile.query.minInlinePx !== undefined && profile.query.maxInlinePx !== undefined && profile.query.minInlinePx > profile.query.maxInlinePx) semanticError(errors, "viewportQuery", `/responsive/profiles/${profileIndex}/query`, "minInlinePx must not exceed maxInlinePx");
    if (profile.query.minBlockPx !== undefined && profile.query.maxBlockPx !== undefined && profile.query.minBlockPx > profile.query.maxBlockPx) semanticError(errors, "viewportQuery", `/responsive/profiles/${profileIndex}/query`, "minBlockPx must not exceed maxBlockPx");
    (profile.operations || []).forEach((operation, operationIndex) => validateOperationReferences(errors, operation, `/responsive/profiles/${profileIndex}/operations/${operationIndex}`, domains));
  }
  for (let left = 0; left < profiles.length; left += 1) {
    for (let right = left + 1; right < profiles.length; right += 1) {
      if (profiles[left].priority === profiles[right].priority && queriesOverlap(profiles[left].query, profiles[right].query)) {
        semanticError(errors, "viewportSelection", `/responsive/profiles/${right}`, `profiles '${profiles[left].id}' and '${profiles[right].id}' can tie for the same viewport`);
      }
    }
  }

  return { errors, domains };
}

export function validateUnresolvedSceneGraph(sceneGraph) {
  const errors = validateBySchema(null, sceneGraph);
  if (!errors.length) errors.push(...validateGraphSemantics(sceneGraph).errors);
  return { valid: errors.length === 0, errors };
}

export function validateEditorMutationBatch(batch, { sceneGraph } = {}) {
  const errors = validateBySchema("editorMutationBatch", batch);
  if (!errors.length && sceneGraph) {
    const graphResult = validateUnresolvedSceneGraph(sceneGraph);
    if (!graphResult.valid) semanticError(errors, "context", "", "sceneGraph context is invalid");
    const { domains } = validateGraphSemantics(sceneGraph);
    if (batch.generationId !== sceneGraph.generationId) semanticError(errors, "generationChain", "/generationId", "editor batch generationId must match scene graph generationId");
    if (batch.baseRevisionId !== sceneGraph.graphRevision.revisionId) semanticError(errors, "revisionChain", "/baseRevisionId", "baseRevisionId must match the scene graph revisionId");
    if (batch.baseGraphSha256 !== canonicalSha256(sceneGraph)) semanticError(errors, "hashChain", "/baseGraphSha256", "baseGraphSha256 must match the canonical scene graph hash");
    if (batch.resultRevisionId === batch.baseRevisionId) semanticError(errors, "revisionChain", "/resultRevisionId", "resultRevisionId must advance the revision chain");
    for (const [index, operation] of batch.operations.entries()) {
      const path = `/operations/${index}`;
      if (operation.targetId) requireRef(errors, domains.nodes, operation.targetId, `${path}/targetId`, "scenes.nodes");
      if (operation.relationId) requireRef(errors, domains.relations, operation.relationId, `${path}/relationId`, "scenes.relations");
      if (operation.beforeContentRef) requireRef(errors, domains.content, operation.beforeContentRef, `${path}/beforeContentRef`, "contentAtoms");
      if (operation.afterContentRef) requireRef(errors, domains.content, operation.afterContentRef, `${path}/afterContentRef`, "contentAtoms");
      if (operation.beforeAssetRef) requireRef(errors, domains.assets, operation.beforeAssetRef, `${path}/beforeAssetRef`, "assetManifest.assets");
      if (operation.afterAssetRef) requireRef(errors, domains.assets, operation.afterAssetRef, `${path}/afterAssetRef`, "assetManifest.assets");
      if (operation.stateMachineId) requireRef(errors, domains.stateMachines, operation.stateMachineId, `${path}/stateMachineId`, "interactions.stateMachines");
      if (operation.timelineId) requireRef(errors, domains.timelines, operation.timelineId, `${path}/timelineId`, "motion.timelines");
      if (operation.op === "replaceTimeline" && (operation.before.id !== operation.timelineId || operation.after.id !== operation.timelineId)) semanticError(errors, "reversibility", path, "replaceTimeline before and after ids must match timelineId");
    }
  }
  return { valid: errors.length === 0, errors };
}

export function validateResolvedSceneGraph(resolved, { sceneGraph } = {}) {
  const errors = validateBySchema("resolvedSceneGraph", resolved);
  if (!errors.length && sceneGraph) {
    const graphResult = validateUnresolvedSceneGraph(sceneGraph);
    if (!graphResult.valid) semanticError(errors, "context", "", "sceneGraph context is invalid");
    const { domains } = validateGraphSemantics(sceneGraph);
    if (resolved.generationId !== sceneGraph.generationId) semanticError(errors, "generationChain", "/generationId", "resolvedSceneGraph generationId must match scene graph generationId");
    if (resolved.unresolvedSceneGraphSha256 !== canonicalSha256(sceneGraph)) semanticError(errors, "hashChain", "/unresolvedSceneGraphSha256", "unresolvedSceneGraphSha256 must match the canonical scene graph hash");
    requireRef(errors, domains.profiles, resolved.profileId, "/profileId", "responsive.profiles");
    try {
      const selected = selectViewportProfile(sceneGraph, resolved.viewportInlinePx, resolved.viewportBlockPx);
      if (selected?.id !== resolved.profileId) semanticError(errors, "viewportSelection", "/profileId", `profileId must be '${selected?.id}' for the declared viewport`);
      if (selected && JSON.stringify(resolved.appliedResponsiveOperations) !== JSON.stringify(selected.operations)) semanticError(errors, "responsiveOperations", "/appliedResponsiveOperations", "appliedResponsiveOperations must exactly match the selected authored profile operations");
    } catch (error) {
      semanticError(errors, "viewportSelection", "/profileId", error.message);
    }
    requireRefs(errors, domains.relations, resolved.sacrificedRelationIds, "/sacrificedRelationIds", "scenes.relations");
    const expectedScenes = sceneGraph.pageFlow.sceneOrder;
    const actualScenes = resolved.scenes.map((scene) => scene.sceneId);
    if (JSON.stringify(expectedScenes) !== JSON.stringify(actualScenes)) semanticError(errors, "resolvedSceneOrder", "/scenes", "resolved scenes must preserve pageFlow.sceneOrder");
    for (const [sceneIndex, resolvedScene] of resolved.scenes.entries()) {
      const sourceScene = domains.scenes.get(resolvedScene.sceneId);
      if (!sourceScene) continue;
      const expectedNodes = sourceScene.nodes.map((node) => node.id);
      if (!sameMembers(expectedNodes, resolvedScene.orderedNodeIds)) semanticError(errors, "resolvedNodes", `/scenes/${sceneIndex}/orderedNodeIds`, "orderedNodeIds must contain every authored scene node exactly once");
      if (!sameMembers(expectedNodes, resolvedScene.nodes.map((node) => node.nodeId))) semanticError(errors, "resolvedNodes", `/scenes/${sceneIndex}/nodes`, "resolved nodes must contain every authored scene node exactly once");
      for (const [nodeIndex, node] of resolvedScene.nodes.entries()) {
        if (node.resolvedTypography) requireRef(errors, domains.typography, node.resolvedTypography.roleId, `/scenes/${sceneIndex}/nodes/${nodeIndex}/resolvedTypography/roleId`, "designLanguage.typographyRoles");
      }
    }
  }
  return { valid: errors.length === 0, errors };
}

export function validateLockedBlueprint(lockedBlueprint) {
  const errors = validateBySchema("lockedBlueprint", lockedBlueprint);
  if (!errors.length) {
    const sceneGraph = lockedBlueprint.unresolvedSceneGraph;
    const graphResult = validateUnresolvedSceneGraph(sceneGraph);
    if (!graphResult.valid) semanticError(errors, "context", "/unresolvedSceneGraph", "embedded unresolvedSceneGraph is invalid", { errors: graphResult.errors });
    if (lockedBlueprint.generationId !== sceneGraph.generationId) semanticError(errors, "generationChain", "/generationId", "lockedBlueprint generationId must match unresolvedSceneGraph generationId");
    if (lockedBlueprint.unresolvedSceneGraphSha256 !== canonicalSha256(sceneGraph)) semanticError(errors, "hashChain", "/unresolvedSceneGraphSha256", "unresolvedSceneGraphSha256 must match the embedded graph");
    if (lockedBlueprint.assetManifestSha256 !== canonicalSha256(sceneGraph.assetManifest)) semanticError(errors, "hashChain", "/assetManifestSha256", "assetManifestSha256 must match the embedded asset manifest");
    for (const [index, entry] of lockedBlueprint.resolvedProfiles.entries()) {
      if (entry.profileId !== entry.resolvedSceneGraph.profileId) semanticError(errors, "profileChain", `/resolvedProfiles/${index}/profileId`, "resolved profile entry id must match its resolvedSceneGraph profileId");
      if (entry.resolvedSceneGraphSha256 !== canonicalSha256(entry.resolvedSceneGraph)) semanticError(errors, "hashChain", `/resolvedProfiles/${index}/resolvedSceneGraphSha256`, "resolvedSceneGraphSha256 must match the embedded resolved scene graph");
      const resolvedResult = validateResolvedSceneGraph(entry.resolvedSceneGraph, { sceneGraph });
      if (!resolvedResult.valid) semanticError(errors, "resolvedProfile", `/resolvedProfiles/${index}/resolvedSceneGraph`, "resolvedSceneGraph fails contract validation", { errors: resolvedResult.errors });
    }
  }
  return { valid: errors.length === 0, errors };
}

export function validateRenderManifest(renderManifest, { lockedBlueprint, resolvedSceneGraph } = {}) {
  const errors = validateBySchema("renderManifest", renderManifest);
  if (!errors.length && lockedBlueprint && resolvedSceneGraph) {
    const lockedResult = validateLockedBlueprint(lockedBlueprint);
    if (!lockedResult.valid) semanticError(errors, "context", "", "lockedBlueprint context is invalid");
    const sceneGraph = lockedBlueprint.unresolvedSceneGraph;
    if (renderManifest.generationId !== lockedBlueprint.generationId || renderManifest.generationId !== resolvedSceneGraph.generationId) semanticError(errors, "generationChain", "/generationId", "renderManifest generationId must match lockedBlueprint and resolvedSceneGraph");
    if (renderManifest.lockedBlueprintSha256 !== canonicalSha256(lockedBlueprint)) semanticError(errors, "hashChain", "/lockedBlueprintSha256", "lockedBlueprintSha256 must match lockedBlueprint");
    if (renderManifest.resolvedSceneGraphSha256 !== canonicalSha256(resolvedSceneGraph)) semanticError(errors, "hashChain", "/resolvedSceneGraphSha256", "resolvedSceneGraphSha256 must match resolvedSceneGraph");
    if (renderManifest.assetManifestSha256 !== canonicalSha256(sceneGraph.assetManifest)) semanticError(errors, "hashChain", "/assetManifestSha256", "assetManifestSha256 must match the locked asset manifest");
    if (renderManifest.viewportProfileId !== resolvedSceneGraph.profileId) semanticError(errors, "profileChain", "/viewportProfileId", "viewportProfileId must match resolvedSceneGraph.profileId");
    const expectedScenes = resolvedSceneGraph.scenes.map((scene) => scene.sceneId);
    const expectedNodes = resolvedSceneGraph.scenes.flatMap((scene) => scene.orderedNodeIds);
    if (JSON.stringify(renderManifest.orderedSceneIds) !== JSON.stringify(expectedScenes)) semanticError(errors, "renderOrder", "/orderedSceneIds", "orderedSceneIds must exactly match the resolved scene order");
    if (JSON.stringify(renderManifest.orderedNodeIds) !== JSON.stringify(expectedNodes)) semanticError(errors, "renderOrder", "/orderedNodeIds", "orderedNodeIds must exactly match the resolved node order");
  }
  return { valid: errors.length === 0, errors };
}

export function validateArtifact(type, value, context = {}) {
  switch (type) {
    case "unresolvedSceneGraph": return validateUnresolvedSceneGraph(value);
    case "editorMutationBatch": return validateEditorMutationBatch(value, context);
    case "resolvedSceneGraph": return validateResolvedSceneGraph(value, context);
    case "lockedBlueprint": return validateLockedBlueprint(value);
    case "renderManifest": return validateRenderManifest(value, context);
    default: return { valid: false, errors: [{ source: "validator", keyword: "artifactType", instancePath: "", message: `unknown V2 artifact type '${type}'`, params: { type } }] };
  }
}

