import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  V2_SCHEMA,
  selectViewportProfile,
  validateArtifact,
} from "../../v2/contract-validator.mjs";
import {
  negativeFixtures,
  positiveFixtures,
  validSceneGraph,
} from "./fixtures.mjs";

test("V2 schema is valid JSON and all local refs resolve", () => {
  const reparsed = JSON.parse(readFileSync(new URL("../../docs/V2-SCENE-GRAPH.schema.json", import.meta.url), "utf8"));
  assert.equal(reparsed.$id, V2_SCHEMA.$id);

  const refs = [];
  const visit = (value) => {
    if (!value || typeof value !== "object") return;
    if (typeof value.$ref === "string" && value.$ref.startsWith("#/$defs/")) refs.push(value.$ref);
    Object.values(value).forEach(visit);
  };
  visit(reparsed);

  for (const ref of refs) {
    const definition = ref.slice("#/$defs/".length);
    assert.ok(reparsed.$defs[definition], `missing local schema definition ${definition}`);
  }
  assert.ok(refs.length > 0);
});

test("recipePolicy exposes a closed and machine-readable structural vocabulary", () => {
  const policy = V2_SCHEMA["x-easily-contract"].recipePolicy;
  assert.equal(policy.mode, "closedStructuralVocabulary");
  assert.ok(policy.structuralDiscriminatorJsonPointers.length >= 8);
  for (const forbidden of ["template", "recipe", "layoutType", "sectionType", "component", "componentStrategy", "variant", "preset"]) {
    assert.ok(policy.forbiddenStructuralPropertyNames.includes(forbidden));
  }
});

test("transparent groups may omit visual styling while visible leaf nodes may not", () => {
  const transparentGroup = structuredClone(validSceneGraph);
  delete transparentGroup.scenes[0].nodes.find((node) => node.kind === "group").visual;
  assert.equal(validateArtifact("unresolvedSceneGraph", transparentGroup).valid, true);

  const unstyledText = structuredClone(validSceneGraph);
  delete unstyledText.scenes[0].nodes.find((node) => node.kind === "text").visual;
  const result = validateArtifact("unresolvedSceneGraph", unstyledText);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.keyword === "required" && error.params?.missingProperty === "visual"));
});

for (const fixture of positiveFixtures) {
  test(`PASS fixture: ${fixture.name}`, () => {
    const result = validateArtifact(fixture.type, fixture.value, fixture.context);
    assert.equal(result.valid, true, JSON.stringify(result.errors, null, 2));
    assert.deepEqual(result.errors, []);
  });
}

for (const fixture of negativeFixtures) {
  test(`FAIL fixture: ${fixture.name}`, () => {
    const result = validateArtifact(fixture.type, fixture.value, fixture.context);
    assert.equal(result.valid, false, "negative fixture was incorrectly accepted");
    assert.ok(
      result.errors.some((error) => error.keyword === fixture.expectedKeyword),
      `expected ${fixture.expectedKeyword}; received ${JSON.stringify(result.errors, null, 2)}`,
    );
  });
}

test("viewport selection is deterministic for authored desktop and mobile profiles", () => {
  assert.equal(selectViewportProfile(validSceneGraph, 1440, 900).id, "profile.desktop");
  assert.equal(selectViewportProfile(validSceneGraph, 390, 844).id, "profile.mobile");
});

test("unknown V2 artifact types fail closed", () => {
  const result = validateArtifact("futureArtifact", {});
  assert.equal(result.valid, false);
  assert.equal(result.errors[0].keyword, "artifactType");
});
