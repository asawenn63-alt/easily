import assert from "node:assert/strict";
import test from "node:test";

import { compileLayout } from "../../v2/layout-compiler.mjs";
import {
  validLockedBlueprint,
  validRenderManifest,
  validResolvedSceneGraph,
} from "./fixtures.mjs";
import { canonicalSha256 } from "../../v2/contract-validator.mjs";

function inputs() {
  return {
    lockedBlueprint: structuredClone(validLockedBlueprint),
    resolvedSceneGraph: structuredClone(validResolvedSceneGraph),
    renderManifest: structuredClone(validRenderManifest),
  };
}

function rehash(input) {
  const unresolvedHash = canonicalSha256(input.lockedBlueprint.unresolvedSceneGraph);
  input.lockedBlueprint.unresolvedSceneGraphSha256 = unresolvedHash;
  input.resolvedSceneGraph.unresolvedSceneGraphSha256 = unresolvedHash;
  input.lockedBlueprint.resolvedProfiles[0].resolvedSceneGraph = structuredClone(input.resolvedSceneGraph);
  input.lockedBlueprint.resolvedProfiles[0].resolvedSceneGraphSha256 = canonicalSha256(input.resolvedSceneGraph);
  input.renderManifest.lockedBlueprintSha256 = canonicalSha256(input.lockedBlueprint);
  input.renderManifest.resolvedSceneGraphSha256 = canonicalSha256(input.resolvedSceneGraph);
}

test("compiler renders only authored primitives and preserves source artifacts", () => {
  const input = inputs();
  const before = structuredClone(input);
  const result = compileLayout(input);

  assert.equal(result.ok, true, JSON.stringify(result.conflicts, null, 2));
  assert.deepEqual(input, before, "compiler must not mutate or repair its inputs");
  assert.match(result.html, /data-node-kind="text"/);
  assert.match(result.html, /data-node-kind="media"/);
  assert.match(result.html, /data-node-kind="action"/);
  assert.deepEqual(result.receipt.orderedNodeIds, validRenderManifest.orderedNodeIds);
  assert.doesNotMatch(result.html + result.css, /card-grid|hero-left|sectionType|componentStrategy|data-variant/);
});

test("compiler aborts with the exact node conflict instead of moving it", () => {
  const input = inputs();
  input.resolvedSceneGraph.scenes[0].nodes.find((node) => node.nodeId === "intro.title").bounds.x = -30;
  rehash(input);

  const result = compileLayout(input);
  assert.equal(result.ok, false);
  assert.equal(result.html, null);
  assert.equal(result.css, null);
  assert.ok(result.conflicts.some((entry) => entry.code === "node_outside_scene" && entry.nodeId === "intro.title"));
  assert.equal(input.resolvedSceneGraph.scenes[0].nodes.find((node) => node.nodeId === "intro.title").bounds.x, -30);
});

test("compiler aborts an unauthorised overlap and never creates a fallback layout", () => {
  const input = inputs();
  const cta = input.resolvedSceneGraph.scenes[0].nodes.find((node) => node.nodeId === "intro.cta");
  cta.bounds = { x: 600, y: 400, width: 180, height: 52 };
  rehash(input);

  const result = compileLayout(input);
  assert.equal(result.ok, false);
  assert.equal(result.html, null);
  assert.equal(result.css, null);
  assert.ok(result.conflicts.some((entry) => entry.code === "unauthorized_overlap"
    && new Set([entry.nodeId, entry.details.otherNodeId]).has("intro.media")
    && new Set([entry.nodeId, entry.details.otherNodeId]).has("intro.cta")));
});

test("compiler reports an authored avoid violation as geometry, not a new design decision", () => {
  const input = inputs();
  const cta = input.resolvedSceneGraph.scenes[0].nodes.find((node) => node.nodeId === "intro.cta");
  cta.bounds = { x: 600, y: 400, width: 180, height: 52 };
  input.lockedBlueprint.unresolvedSceneGraph.scenes[0].relations.push({
    id: "relation.intro.keep-apart",
    kind: "avoid",
    subjects: ["intro.cta", "intro.media"],
    strength: "required",
    rationale: "The authored action and image must remain separate.",
  });
  rehash(input);

  const result = compileLayout(input);
  assert.equal(result.ok, false);
  assert.ok(result.conflicts.some((entry) => entry.code === "authored_avoid_violated"
    && new Set([entry.nodeId, entry.details.otherNodeId]).has("intro.media")
    && new Set([entry.nodeId, entry.details.otherNodeId]).has("intro.cta")));
  assert.ok(!result.conflicts.some((entry) => entry.code === "unauthorized_overlap"));
});

test("compiler aborts when text cannot fit its authored box", () => {
  const input = inputs();
  const title = input.resolvedSceneGraph.scenes[0].nodes.find((node) => node.nodeId === "intro.title");
  title.bounds.height = 20;
  rehash(input);

  const result = compileLayout(input);
  assert.equal(result.ok, false);
  assert.equal(result.html, null);
  assert.ok(result.conflicts.some((entry) => entry.code === "text_box_overflow" && entry.nodeId === "intro.title"));
});

test("compiler never permits two readable text-bearing nodes to collide", () => {
  const input = inputs();
  const cta = input.resolvedSceneGraph.scenes[0].nodes.find((node) => node.nodeId === "intro.cta");
  cta.bounds = { x: 80, y: 95, width: 180, height: 52 };
  rehash(input);

  const result = compileLayout(input);
  assert.equal(result.ok, false);
  assert.equal(result.html, null);
  assert.ok(result.conflicts.some((entry) => entry.code === "text_collision"
    && new Set([entry.nodeId, entry.details.otherNodeId]).has("intro.title")
    && new Set([entry.nodeId, entry.details.otherNodeId]).has("intro.cta")));
});

test("compiler preserves an explicitly authored layer without inventing overlap intent", () => {
  const input = inputs();
  const cta = input.resolvedSceneGraph.scenes[0].nodes.find((node) => node.nodeId === "intro.cta");
  cta.bounds = { x: 600, y: 400, width: 180, height: 52 };
  input.lockedBlueprint.unresolvedSceneGraph.scenes[0].relations.push({
    id: "relation.intro.authored-layer",
    kind: "layer",
    subjects: ["intro.cta", "intro.media"],
    axis: "z",
    strength: "required",
    rationale: "The action is authored above the image.",
  });
  rehash(input);

  const result = compileLayout(input);
  assert.equal(result.ok, true, JSON.stringify(result.conflicts, null, 2));
});

test("compiler applies an authored group layer to the group's visible leaves", () => {
  const input = inputs();
  const scene = input.lockedBlueprint.unresolvedSceneGraph.scenes[0];
  scene.nodes.push({
    id: "intro.foreground",
    kind: "group",
    semanticRole: "foreground content",
    children: ["intro.title", "intro.cta"],
  });
  scene.relations.push({
    id: "relation.intro.group-layer",
    kind: "layer",
    subjects: ["intro.foreground", "intro.media"],
    axis: "z",
    strength: "required",
    rationale: "The authored foreground group sits above the image.",
  });
  const title = input.resolvedSceneGraph.scenes[0].nodes.find((node) => node.nodeId === "intro.title");
  const cta = input.resolvedSceneGraph.scenes[0].nodes.find((node) => node.nodeId === "intro.cta");
  title.bounds = { x: 600, y: 120, width: 460, height: 220 };
  cta.bounds = { x: 600, y: 420, width: 180, height: 52 };
  input.resolvedSceneGraph.scenes[0].nodes.push({
    nodeId: "intro.foreground",
    visible: true,
    bounds: { x: 580, y: 100, width: 520, height: 400 },
    zIndex: 2,
  });
  input.resolvedSceneGraph.scenes[0].orderedNodeIds.push("intro.foreground");
  input.renderManifest.orderedNodeIds.splice(
    input.renderManifest.orderedNodeIds.indexOf(input.resolvedSceneGraph.scenes[1].orderedNodeIds[0]),
    0,
    "intro.foreground",
  );
  rehash(input);

  const result = compileLayout(input);
  assert.equal(result.ok, true, JSON.stringify(result.conflicts, null, 2));
});

test("compiler rejects an invalid artifact chain without partial output", () => {
  const input = inputs();
  input.renderManifest.viewportProfileId = "profile.mobile";

  const result = compileLayout(input);
  assert.equal(result.ok, false);
  assert.equal(result.html, null);
  assert.equal(result.css, null);
  assert.ok(result.conflicts.some((entry) => entry.code === "invalid_render_manifest"));
});
