import assert from "node:assert/strict";
import test from "node:test";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

import {
  assembleInitialSceneGraph,
  editFreeSceneSite,
  generateFreeSceneSite as generateFreeSceneSiteProduction,
  replaceFreeSceneContent,
} from "../../server/free-scene-ai.mjs";
import { validateUnresolvedSceneGraph } from "../../v2/contract-validator.mjs";
import { validResolvedSceneGraph, validSceneGraph } from "./fixtures.mjs";

const vision = {
  candidates: [0, 1, 2].map((index) => ({
    name: `Riktning ${index + 1}`,
    thesis: "En verksamhetsspecifik och sammanhängande visuell idé.",
    semanticReading: "Kundens ord blir rytm, kontrast och en tydlig bildvärld.",
    compositionIdea: "Asymmetriska visuella fält binds samman av en återkommande linje.",
    designWorld: index === 0 ? "cinematisk materialitet" : index === 1 ? "brutalistisk redaktion" : "lekfull futurism",
    typographyDirection: "Tydlig displaytypografi möter lågmäld och läsbar brödtext.",
    colorSystem: "En bärande mörk ton, en lugn pappersyta och sparsamma accenter.",
    imageWorld: "Närvarande materialstudier med riktat ljus och mänsklig skala.",
    signatureDetails: ["förskjuten baslinje", "tunn följelinje", "snäv beskärning", "liten kantnot"],
    differentiationAxes: ["komposition", "skala", "typografi", "rytm", "bildspråk", "materialitet"],
    rejectedConvention: "Avvisar generiska kortgrids och symmetriska standardsektioner.",
    risk: "Asymmetrin kräver exakt geometri för att förbli läsbar.",
  })),
  selectedIndex: 0,
  selectionRationale: "Den första riktningen har tydligast egen identitet och kan spåras till briefen.",
  executionMandate: "Bevara linjen, asymmetrin och den återhållna färghierarkin genom hela scenen.",
};

// Contract fixtures intentionally retain two scenes to exercise cross-scene
// references. Production generation defaults to exactly one initial scene.
function generateFreeSceneSite(creativeBrief, options = {}) {
  return generateFreeSceneSiteProduction(creativeBrief, {
    ...options,
    expectedInitialSceneCount: 2,
  });
}

function geometryDraft(mutator) {
  const desktopScenes = structuredClone(validResolvedSceneGraph.scenes);
  if (mutator) mutator(desktopScenes);
  const mobileScenes = structuredClone(validResolvedSceneGraph.scenes).map((scene) => ({
    ...scene,
    bounds: { ...scene.bounds, x: scene.bounds.x * (390 / 1440), width: scene.bounds.width * (390 / 1440) },
    nodes: scene.nodes.map((node) => ({
      ...node,
      bounds: { ...node.bounds, x: node.bounds.x * (390 / 1440), width: node.bounds.width * (390 / 1440) },
      resolvedTypography: node.resolvedTypography ? {
        ...node.resolvedTypography,
        fontSizePx: node.resolvedTypography.fontSizePx * 0.45,
        lineHeightPx: node.resolvedTypography.lineHeightPx * 0.45,
        letterSpacingPx: node.resolvedTypography.letterSpacingPx * 0.45,
      } : undefined,
    })),
  }));
  return {
    profiles: [
      { profileId: "profile.desktop", viewportInlinePx: 1440, viewportBlockPx: 900, scenes: desktopScenes },
      { profileId: "profile.mobile", viewportInlinePx: 390, viewportBlockPx: 844, scenes: mobileScenes },
    ],
  };
}

function response(value, id) {
  return { ok: true, status: 200, json: async () => ({ id, output_text: JSON.stringify(value) }) };
}

function fetchSequence(values) {
  const queue = [...values];
  const requests = [];
  return {
    requests,
    fetch: async (url, init) => {
      requests.push({ url, body: JSON.parse(init.body) });
      assert.ok(queue.length, "unexpected upstream request");
      return response(queue.shift(), `response-${requests.length}`);
    },
  };
}

test("specialised V2 motors produce a component-free scene and compile it without fallback", async () => {
  const graph = structuredClone(validSceneGraph);
  const upstream = fetchSequence([
    vision,
    { sceneGraph: graph },
    geometryDraft(),
  ]);

  const result = await generateFreeSceneSite({ answers: ["ett", "två", "tre", "fyra", "fem"] }, {
    apiKey: "test-key",
    model: "test-model",
    fetchImpl: upstream.fetch,
    minimumGeneratedScenes: 2,
  });

  assert.equal(result.ok, true, JSON.stringify(result, null, 2));
  assert.equal(result.engineVersion, "v2");
  assert.equal(result.compiledProfiles.length, 2);
  assert.match(result.compiledProfiles[0].html, /data-node-kind="text"/);
  assert.doesNotMatch(JSON.stringify(result.sceneGraph), /"component"|"variant"|"sectionType"|"componentStrategy"/);
  assert.equal(upstream.requests.length, 3, "vision, free scene and geometry must be separate motor calls");
  assert.match(upstream.requests[1].body.input[0].content, /känner över huvud taget inte till komponenter/);
  assert.equal(upstream.requests[1].body.text.format.schema.$defs.sceneGraph.properties.scenes.minItems, 1);
  assert.equal(upstream.requests[1].body.text.format.schema.$defs.sceneGraph.properties.scenes.maxItems, 1);
  assert.equal(upstream.requests[1].body.text.format.schema.$defs.pageFlow.properties.sceneOrder.maxItems, 1);
  assert.match(upstream.requests[2].body.input[0].content, /får inte designa om/);
});

test("a missing mobile geometry profile is generated separately and remains mandatory", async () => {
  const graph = structuredClone(validSceneGraph);
  const completeGeometry = geometryDraft();
  const upstream = fetchSequence([
    vision,
    { sceneGraph: graph },
    { profiles: [completeGeometry.profiles[0]] },
    { profiles: [completeGeometry.profiles[1]] },
  ]);

  const result = await generateFreeSceneSite({ answers: ["ett", "två", "tre", "fyra", "fem"] }, {
    apiKey: "test-key",
    model: "test-model",
    fetchImpl: upstream.fetch,
    minimumGeneratedScenes: 2,
  });

  assert.equal(result.ok, true, JSON.stringify(result, null, 2));
  assert.equal(result.compiledProfiles.length, 2);
  assert.match(upstream.requests[3].body.input[1].content, /denna enda saknade profil/);
  assert.equal(
    upstream.requests[3].body.text.format.schema.properties.profiles.items.properties.profileId.const,
    "profile.mobile",
  );
  assert.equal(upstream.requests.length, 4);
});

test("first-site prompt treats optional choices as content and keeps hero and footer mandatory", async () => {
  const graph = structuredClone(validSceneGraph);
  const upstream = fetchSequence([vision, { sceneGraph: graph }, geometryDraft()]);

  const result = await generateFreeSceneSite({
    customerFacts: { siteType: "webbutik", requestedContent: ["about", "gallery"] },
  }, {
    apiKey: "test-key",
    model: "test-model",
    fetchImpl: upstream.fetch,
    minimumGeneratedScenes: 2,
  });

  assert.equal(result.ok, true, JSON.stringify(result, null, 2));
  const scenePrompt = upstream.requests[1].body.input[0].content;
  assert.match(scenePrompt, /Hero och footer ska alltid finnas/);
  assert.match(scenePrompt, /Kryssen anger innehåll, aldrig sektionsbeställningar/);
});

test("technical scene contract errors repair the same graph instead of regenerating its design", async () => {
  const invalid = structuredClone(validSceneGraph);
  invalid.scenes[0].nodes.find((node) => node.id === "intro.title").contentRef = "content.missing";
  const upstream = fetchSequence([
    vision,
    { sceneGraph: invalid },
    { sceneGraph: structuredClone(validSceneGraph) },
    geometryDraft(),
  ]);

  const result = await generateFreeSceneSite({ answers: ["ett", "två", "tre", "fyra", "fem"] }, {
    apiKey: "test-key",
    model: "test-model",
    fetchImpl: upstream.fetch,
    minimumGeneratedScenes: 2,
  });

  assert.equal(result.ok, true, JSON.stringify(result, null, 2));
  assert.match(upstream.requests[2].body.input[0].content, /kontraktsreparationsmotor/);
  assert.match(upstream.requests[2].body.input[1].content, /content\.missing/);
  assert.equal(upstream.requests.length, 4);
});

test("an incomplete scene shell is regenerated from the same direction instead of sent to the patch repair motor", async () => {
  const incomplete = {
    scenes: structuredClone(validSceneGraph.scenes).map((scene) => ({
      id: scene.id,
      constraints: {},
    })),
  };
  const upstream = fetchSequence([
    vision,
    { sceneGraph: incomplete },
    { sceneGraph: structuredClone(validSceneGraph) },
    geometryDraft(),
  ]);

  const result = await generateFreeSceneSite({ answers: ["ett", "två", "tre", "fyra", "fem"] }, {
    apiKey: "test-key",
    model: "test-model",
    fetchImpl: upstream.fetch,
    minimumGeneratedScenes: 2,
  });

  assert.equal(result.ok, true, JSON.stringify(result, null, 2));
  assert.match(upstream.requests[2].body.input[0].content, /fria visuella designmotor/);
  assert.doesNotMatch(upstream.requests[2].body.input[0].content, /kontraktsreparationsmotor/);
  assert.match(upstream.requests[2].body.input[1].content, /inte en fullständig V2 sceneGraph/);
  assert.match(upstream.requests[2].body.input[1].content, /contentAtoms, assetManifest, designLanguage, pageFlow, scenes och responsive/);
});

test("a malformed repair response cannot replace the last complete scene skeleton", async () => {
  const invalid = structuredClone(validSceneGraph);
  invalid.scenes[0].nodes.find((node) => node.id === "intro.title").contentRef = "content.missing";
  const incomplete = { scenes: [{ id: "scene.broken", constraints: {} }] };
  const upstream = fetchSequence([
    vision,
    { sceneGraph: invalid },
    { sceneGraph: incomplete },
    { sceneGraph: structuredClone(validSceneGraph) },
    geometryDraft(),
  ]);

  const result = await generateFreeSceneSite({ answers: ["ett", "två", "tre", "fyra", "fem"] }, {
    apiKey: "test-key",
    model: "test-model",
    fetchImpl: upstream.fetch,
    minimumGeneratedScenes: 2,
  });

  assert.equal(result.ok, true, JSON.stringify(result, null, 2));
  assert.match(upstream.requests[2].body.input[0].content, /kontraktsreparationsmotor/);
  assert.match(upstream.requests[3].body.input[0].content, /kontraktsreparationsmotor/);
  assert.match(upstream.requests[3].body.input[1].content, /content\.missing/);
});

test("a partial contract repair is merged into the existing scene by id", async () => {
  const invalid = structuredClone(validSceneGraph);
  const title = invalid.scenes[0].nodes.find((node) => node.id === "intro.title");
  title.visual.size = "large";
  const repairedVisual = structuredClone(title.visual);
  delete repairedVisual.size;
  const repairFragment = {
    scenes: [{
      id: invalid.scenes[0].id,
      nodes: [{ id: title.id, visual: repairedVisual }],
    }],
  };
  const upstream = fetchSequence([
    vision,
    { sceneGraph: invalid },
    { sceneGraph: repairFragment },
    geometryDraft(),
  ]);

  const result = await generateFreeSceneSite({ answers: ["ett", "två", "tre", "fyra", "fem"] }, {
    apiKey: "test-key",
    model: "test-model",
    fetchImpl: upstream.fetch,
    minimumGeneratedScenes: 2,
  });

  assert.equal(result.ok, true, JSON.stringify(result, null, 2));
  assert.equal(result.sceneGraph.scenes[0].nodes.find((node) => node.id === "intro.title").visual.size, undefined);
  assert.equal(result.sceneGraph.scenes.length, validSceneGraph.scenes.length);
  assert.equal(upstream.requests.length, 4);
});

test("a dangling optional color compatibility reference is pruned without redesign", async () => {
  const graph = structuredClone(validSceneGraph);
  graph.designLanguage.colorRoles[0].allowedBackgroundRoleIds = ["color.does-not-exist"];
  const upstream = fetchSequence([
    vision,
    { sceneGraph: graph },
    geometryDraft(),
  ]);

  const result = await generateFreeSceneSite({ answers: ["ett", "två", "tre", "fyra", "fem"] }, {
    apiKey: "test-key",
    model: "test-model",
    fetchImpl: upstream.fetch,
    minimumGeneratedScenes: 2,
  });

  assert.equal(result.ok, true, JSON.stringify(result, null, 2));
  assert.deepEqual(result.sceneGraph.designLanguage.colorRoles[0].allowedBackgroundRoleIds, []);
  assert.equal(upstream.requests.length, 3, "removing a meaningless dangling allow-list id must not invoke a redesign motor");
});

test("unrendered content and cross-domain motif metadata cannot trigger a redesign", async () => {
  const graph = structuredClone(validSceneGraph);
  graph.contentAtoms.push({
    id: "txt_label_home",
    kind: "text",
    value: "Hem",
    provenance: structuredClone(graph.contentAtoms[0].provenance),
  });
  graph.designLanguage.motifs[0].styleRoleIds.push("color_teal", "type_micro");
  graph.designLanguage.creativeInitiatives[0].motifIds.push("motif_missing");
  graph.scenes[0].focalSequence.push("curated_labels");
  graph.scenes[0].nodes[0].motifIds.push("motif_missing");
  const upstream = fetchSequence([
    vision,
    { sceneGraph: graph },
    geometryDraft(),
  ]);

  const result = await generateFreeSceneSite({ answers: ["ett", "två", "tre", "fyra", "fem"] }, {
    apiKey: "test-key",
    model: "test-model",
    fetchImpl: upstream.fetch,
    minimumGeneratedScenes: 2,
  });

  assert.equal(result.ok, true, JSON.stringify(result, null, 2));
  assert.equal(result.sceneGraph.contentAtoms.some((atom) => atom.id === "txt_label_home"), false);
  assert.deepEqual(result.sceneGraph.designLanguage.motifs[0].styleRoleIds, ["style.border.hairline"]);
  assert.deepEqual(result.sceneGraph.designLanguage.creativeInitiatives[0].motifIds, ["motif.thread"]);
  assert.equal(result.sceneGraph.scenes[0].focalSequence.includes("curated_labels"), false);
  assert.equal(result.sceneGraph.scenes[0].nodes[0].motifIds.includes("motif_missing"), false);
  assert.equal(upstream.requests.length, 3, "invisible optional metadata must be normalized without another design call");
});

test("server assembles root metadata and provenance outside the free design motor", async () => {
  const authored = structuredClone(validSceneGraph);
  for (const field of ["sceneGraphVersion", "engineVersion", "generationId", "graphRevision", "sourceRefs"]) {
    delete authored[field];
  }
  delete authored.interactions;
  delete authored.motion;
  authored.responsive.profiles.forEach((profile) => {
    profile.operations = profile.operations.filter((operation) => operation.timelineId === undefined);
  });
  delete authored.assetManifest.manifestId;
  authored.contentAtoms.forEach((atom) => { delete atom.provenance; });
  authored.assetManifest.assets.forEach((asset) => { delete asset.provenance; });
  const upstream = fetchSequence([
    vision,
    { sceneGraph: authored },
    geometryDraft(),
  ]);

  const result = await generateFreeSceneSite({ answers: ["ett", "två", "tre", "fyra", "fem"] }, {
    apiKey: "test-key",
    model: "test-model",
    fetchImpl: upstream.fetch,
    minimumGeneratedScenes: 2,
  });

  assert.equal(result.ok, true, JSON.stringify(result, null, 2));
  assert.equal(result.sceneGraph.sceneGraphVersion, "2.0");
  assert.match(result.sceneGraph.generationId, /^gen_/);
  assert.equal(result.sceneGraph.assetManifest.manifestId, `assets.${result.sceneGraph.generationId}`);
  assert.ok(result.sceneGraph.contentAtoms.every((atom) =>
    atom.provenance.origin === "creativeProposal"
    && atom.provenance.verificationStatus === "requiresConfirmation"));
  assert.ok(result.sceneGraph.assetManifest.assets.every((asset) => asset.provenance));
  assert.equal(upstream.requests.length, 3, "technical assembly must not spend an AI repair call");

  const authoredSchema = upstream.requests[1].body.text.format.schema;
  assert.equal(authoredSchema.$defs.sceneGraph.properties.generationId, undefined);
  assert.equal(authoredSchema.$defs.contentAtom.properties.provenance, undefined);
  assert.equal(authoredSchema.$defs.asset.properties.provenance, undefined);
  assert.ok(authoredSchema.$defs.asset.properties.creativeIntent);
  const ajv = new Ajv2020({ strict: false });
  addFormats(ajv);
  const validateAuthored = ajv.compile(authoredSchema);
  assert.equal(typeof validateAuthored, "function", "the reduced authoring schema itself must compile");
});

test("an absent sceneGraph is rejected and retried without crashing", async () => {
  const upstream = fetchSequence([
    vision,
    {},
    { sceneGraph: structuredClone(validSceneGraph) },
    geometryDraft(),
  ]);

  const result = await generateFreeSceneSite({ answers: ["ett", "två", "tre", "fyra", "fem"] }, {
    apiKey: "test-key",
    model: "test-model",
    fetchImpl: upstream.fetch,
    minimumGeneratedScenes: 2,
  });

  assert.equal(result.ok, true, JSON.stringify(result, null, 2));
  assert.match(upstream.requests[2].body.input[1].content, /inte en fullständig V2 sceneGraph/);
  assert.equal(upstream.requests.length, 4);
});

test("pending generated assets receive deterministic hash and image provenance", () => {
  const authored = structuredClone(validSceneGraph);
  const asset = authored.assetManifest.assets.find((entry) => entry.id === "asset.hero");
  asset.source.uri = "pending://hero";
  delete asset.source.contentSha256;
  delete asset.provenance;
  asset.intrinsic = { aspectRatio: 1.5 };
  const envelope = {
    generationId: "gen_pending_asset",
    createdAt: "2026-09-09T10:00:00.000Z",
    briefArtifactId: "artifact:brief:pending",
    visionArtifactId: "artifact:vision:pending",
    compositionArtifactId: "artifact:composition:pending",
    briefSha256: "e".repeat(64),
  };

  const graph = assembleInitialSceneGraph(authored, {
    envelope,
    selectedVision: { imageWorld: "Mjukt dagsljus över handgjorda material i en varm lokal butik" },
  });

  const assembled = graph.assetManifest.assets.find((entry) => entry.id === "asset.hero");
  assert.equal(assembled.source.contentSha256, "0".repeat(64));
  assert.deepEqual(assembled.intrinsic, { width: 1536, height: 1024, aspectRatio: 1.5 });
  assert.equal(assembled.provenance.origin, "creativeExpression");
  assert.match(assembled.provenance.rationale, /Mjukt dagsljus/);
  assert.equal(assembled.creativeIntent, undefined);
  assert.equal(validateUnresolvedSceneGraph(graph).valid, true);
});

test("initial assembly sanitizes generated transport URIs and non-object responsive entries", () => {
  const authored = structuredClone(validSceneGraph);
  const asset = authored.assetManifest.assets.find((entry) => entry.id === "asset.hero");
  asset.source.uri = "pending://bild med ogiltiga blanksteg";
  delete asset.source.contentSha256;
  delete asset.provenance;
  authored.responsive.profiles.push("profile-mobile-extra");
  const envelope = {
    generationId: "gen_transport_sanitation",
    createdAt: "2026-09-14T14:30:00.000Z",
    briefArtifactId: "artifact:brief:transport",
    visionArtifactId: "artifact:vision:transport",
    compositionArtifactId: "artifact:composition:transport",
    briefSha256: "f".repeat(64),
  };

  const graph = assembleInitialSceneGraph(authored, {
    envelope,
    selectedVision: { imageWorld: "Den befintliga fria bildvärlden bevaras." },
  });

  const assembled = graph.assetManifest.assets.find((entry) => entry.id === "asset.hero");
  assert.equal(assembled.source.uri, "pending:///asset.hero");
  assert.equal(assembled.source.contentSha256, "0".repeat(64));
  assert.equal(graph.responsive.profiles.length, validSceneGraph.responsive.profiles.length);
  assert.ok(graph.responsive.profiles.every((profile) => profile && typeof profile === "object" && !Array.isArray(profile)));
  assert.equal(validateUnresolvedSceneGraph(graph).valid, true);
});

test("an omitted crop safe region is completed as the neutral full frame", () => {
  const authored = structuredClone(validSceneGraph);
  const mobile = authored.responsive.profiles.find((profile) => profile.id === "profile.mobile");
  const operation = {
    op: "setConstraint",
    relationId: "relation.intro.crop",
    override: {
      cropIntent: {
        fit: "cover",
        focalPoint: { x: 0.5, y: 0.5 },
      },
    },
    rationale: "Keep the authored focal point on mobile.",
  };
  mobile.operations.push(operation);
  const envelope = {
    generationId: "gen_neutral_crop",
    createdAt: "2026-09-09T10:00:00.000Z",
    briefArtifactId: "artifact:brief:neutral-crop",
    visionArtifactId: "artifact:vision:neutral-crop",
    compositionArtifactId: "artifact:composition:neutral-crop",
    briefSha256: "f".repeat(64),
  };

  const graph = assembleInitialSceneGraph(authored, { envelope, selectedVision: {} });
  const assembledOperation = graph.responsive.profiles
    .find((profile) => profile.id === "profile.mobile").operations.at(-1);
  assert.deepEqual(assembledOperation.override.cropIntent.safeRegion, { x: 0, y: 0, width: 1, height: 1 });
});

test("a color used by the composition is never guessed or silently removed", async () => {
  const invalid = structuredClone(validSceneGraph);
  invalid.scenes[0].nodes.find((node) => node.id === "intro.title").visual.colorRoleId = "color.ivy";
  const upstream = fetchSequence([
    vision,
    { sceneGraph: invalid },
    { sceneGraph: structuredClone(validSceneGraph) },
    geometryDraft(),
  ]);

  const result = await generateFreeSceneSite({ answers: ["ett", "två", "tre", "fyra", "fem"] }, {
    apiKey: "test-key",
    model: "test-model",
    fetchImpl: upstream.fetch,
    minimumGeneratedScenes: 2,
  });

  assert.equal(result.ok, true, JSON.stringify(result, null, 2));
  assert.match(upstream.requests[2].body.input[0].content, /kontraktsreparationsmotor/);
  assert.match(upstream.requests[2].body.input[1].content, /color\.ivy/);
  assert.equal(upstream.requests.length, 4);
});

test("geometry conflicts return to the geometry motor and never invoke a legacy design fallback", async () => {
  const graph = structuredClone(validSceneGraph);
  const broken = geometryDraft((scenes) => {
    scenes[0].nodes.find((node) => node.nodeId === "intro.title").bounds.x = -50;
  });
  const upstream = fetchSequence([
    vision,
    { sceneGraph: graph },
    broken,
    broken,
    broken,
  ]);

  const result = await generateFreeSceneSite({ answers: ["ett", "två", "tre", "fyra", "fem"] }, {
    apiKey: "test-key",
    model: "test-model",
    fetchImpl: upstream.fetch,
    minimumGeneratedScenes: 2,
  });

  assert.equal(result.ok, false);
  assert.equal(result.error, "layout-compilation-conflict");
  assert.ok(result.conflicts.some((entry) => entry.code === "node_outside_scene" && entry.nodeId === "intro.title"));
  assert.equal(result.feedback.target, "free-visual-design-engine");
  assert.deepEqual(result.feedback.conflicts, result.conflicts);
  assert.equal(upstream.requests.length, 5);
  assert.match(upstream.requests[3].body.input[0].content, /geometrireparationsmotor/);
  assert.match(upstream.requests[3].body.input[1].content, /node_outside_scene/);
  assert.ok(upstream.requests.every((request) => request.url.endsWith("/v1/responses")), "no image or legacy fallback request is allowed");
});

test("a partial geometry repair patches the existing resolved geometry", async () => {
  const graph = structuredClone(validSceneGraph);
  const invalid = geometryDraft((scenes) => {
    scenes[0].nodes.find((node) => node.nodeId === "intro.title").bounds.x = 1400;
  });
  const partialRepair = {
    profiles: [{
      profileId: "profile.desktop",
      scenes: [{
        sceneId: "scene.intro",
        nodes: [{ nodeId: "intro.title", bounds: { x: 80, y: 120, width: 460, height: 220 } }],
      }],
    }],
  };
  const upstream = fetchSequence([
    vision,
    { sceneGraph: graph },
    invalid,
    partialRepair,
  ]);

  const result = await generateFreeSceneSite({ answers: ["ett", "två", "tre", "fyra", "fem"] }, {
    apiKey: "test-key",
    model: "test-model",
    fetchImpl: upstream.fetch,
    minimumGeneratedScenes: 2,
  });

  assert.equal(result.ok, true, JSON.stringify(result, null, 2));
  assert.equal(result.resolvedProfiles[0].scenes[0].nodes.find((node) => node.nodeId === "intro.title").visible, true);
  assert.equal(result.resolvedProfiles[0].scenes[0].nodes.find((node) => node.nodeId === "intro.title").zIndex, 2);
});

test("an unambiguous numeric typography string is coerced without an aesthetic decision", async () => {
  const graph = structuredClone(validSceneGraph);
  const numericString = geometryDraft();
  const title = numericString.profiles[0].scenes[0].nodes.find((node) => node.nodeId === "intro.title");
  title.resolvedTypography.fontSizePx = String(title.resolvedTypography.fontSizePx);
  const upstream = fetchSequence([
    vision,
    { sceneGraph: graph },
    numericString,
  ]);

  const result = await generateFreeSceneSite({ answers: ["ett", "två", "tre", "fyra", "fem"] }, {
    apiKey: "test-key",
    model: "test-model",
    fetchImpl: upstream.fetch,
    minimumGeneratedScenes: 2,
  });

  assert.equal(result.ok, true, JSON.stringify(result, null, 2));
  assert.equal(typeof result.resolvedProfiles[0].scenes[0].nodes.find((node) => node.nodeId === "intro.title").resolvedTypography.fontSizePx, "number");
  assert.equal(upstream.requests.length, 3, "safe type coercion must not spend a repair call");
});

test("missing resolved typography is translated from the authored typography role", async () => {
  const graph = structuredClone(validSceneGraph);
  const missingTypography = geometryDraft();
  const cta = missingTypography.profiles[0].scenes[0].nodes.find((node) => node.nodeId === "intro.cta");
  delete cta.resolvedTypography;
  const upstream = fetchSequence([
    vision,
    { sceneGraph: graph },
    missingTypography,
  ]);

  const result = await generateFreeSceneSite({ answers: ["ett", "två", "tre", "fyra", "fem"] }, {
    apiKey: "test-key",
    model: "test-model",
    fetchImpl: upstream.fetch,
    minimumGeneratedScenes: 2,
  });

  assert.equal(result.ok, true, JSON.stringify(result, null, 2));
  assert.deepEqual(
    result.resolvedProfiles[0].scenes[0].nodes.find((node) => node.nodeId === "intro.cta").resolvedTypography,
    { roleId: "type.body", fontSizePx: 19.2, lineHeightPx: 28.799999999999997, letterSpacingPx: 0 },
  );
  assert.equal(upstream.requests.length, 3, "technical typography translation must not spend a repair call");
});

test("an ambiguous typography value is returned to the geometry repair motor", async () => {
  const graph = structuredClone(validSceneGraph);
  const invalid = geometryDraft();
  invalid.profiles[0].scenes[0].nodes.find((node) => node.nodeId === "intro.title").resolvedTypography.fontSizePx = "clamp(40px, 5vw, 72px)";
  const upstream = fetchSequence([
    vision,
    { sceneGraph: graph },
    invalid,
    geometryDraft(),
  ]);

  const result = await generateFreeSceneSite({ answers: ["ett", "två", "tre", "fyra", "fem"] }, {
    apiKey: "test-key",
    model: "test-model",
    fetchImpl: upstream.fetch,
    minimumGeneratedScenes: 2,
  });

  assert.equal(result.ok, true, JSON.stringify(result, null, 2));
  assert.match(upstream.requests[3].body.input[0].content, /geometrireparationsmotor/);
  assert.match(upstream.requests[3].body.input[1].content, /geometry_numeric_type/);
  assert.match(upstream.requests[3].body.input[1].content, /fontSizePx/);
  assert.equal(upstream.requests.length, 4);
});

test("an unrepaired ambiguous typography value fails closed", async () => {
  const graph = structuredClone(validSceneGraph);
  const invalid = geometryDraft();
  invalid.profiles[0].scenes[0].nodes.find((node) => node.nodeId === "intro.title").resolvedTypography.fontSizePx = { preferred: 72 };
  const upstream = fetchSequence([
    vision,
    { sceneGraph: graph },
    invalid,
    invalid,
    invalid,
  ]);

  const result = await generateFreeSceneSite({ answers: ["ett", "två", "tre", "fyra", "fem"] }, {
    apiKey: "test-key",
    model: "test-model",
    fetchImpl: upstream.fetch,
    minimumGeneratedScenes: 2,
  });

  assert.equal(result.ok, false);
  assert.equal(result.error, "layout-compilation-conflict");
  assert.ok(result.conflicts.some((entry) => entry.code === "geometry_numeric_type"
    && entry.details?.field === "fontSizePx"
    && entry.nodeId === "intro.title"));
  assert.equal(upstream.requests.length, 5);
});

test("geometry repair receives conflicts beyond the former sixteen-item cutoff", async () => {
  const graph = structuredClone(validSceneGraph);
  const intro = graph.scenes[0];
  const root = intro.nodes.find((node) => node.id === "intro.root");
  for (let index = 0; index < 20; index += 1) {
    const id = `bulk.node.${index}`;
    intro.nodes.push({
      id,
      kind: "media",
      semanticRole: "decorative bulk test node",
      assetRef: "asset.motif",
      children: [],
      visual: {},
      accessibility: { decorative: true },
    });
    root.children.push(id);
  }
  const broken = geometryDraft();
  for (const profile of broken.profiles) {
    const scene = profile.scenes.find((entry) => entry.sceneId === "scene.intro");
    for (let index = 0; index < 20; index += 1) {
      scene.orderedNodeIds.push(`bulk.node.${index}`);
      scene.nodes.push({
        nodeId: `bulk.node.${index}`,
        bounds: { x: -30, y: scene.bounds.y + 480 + (index * 10), width: 8, height: 8 },
        visible: true,
        zIndex: 1,
      });
    }
  }
  const upstream = fetchSequence([
    vision,
    { sceneGraph: graph },
    broken,
    broken,
    broken,
  ]);

  const result = await generateFreeSceneSite({ answers: ["ett", "två", "tre", "fyra", "fem"] }, {
    apiKey: "test-key",
    model: "test-model",
    fetchImpl: upstream.fetch,
    minimumGeneratedScenes: 2,
  });

  assert.equal(result.ok, false);
  assert.equal(result.error, "layout-compilation-conflict");
  assert.match(upstream.requests[3].body.input[1].content, /bulk\.node\.19/);
});

test("exact overlap conflicts return to the design motor before geometry retries the same scene", async () => {
  const graph = structuredClone(validSceneGraph);
  const overlapping = geometryDraft((scenes) => {
    scenes[0].nodes.find((node) => node.nodeId === "intro.title").bounds.x = 600;
  });
  const upstream = fetchSequence([
    vision,
    { sceneGraph: graph },
    overlapping,
    {
      decisions: [{
        sceneId: "scene.intro",
        nodeA: "intro.title",
        nodeB: "intro.media",
        decision: "authorize_overlap",
        rationale: "Rubriken är ett avsiktligt lager över den bärande bilden.",
      }],
    },
    overlapping,
  ]);

  const result = await generateFreeSceneSite({ answers: ["ett", "två", "tre", "fyra", "fem"] }, {
    apiKey: "test-key",
    model: "test-model",
    fetchImpl: upstream.fetch,
    minimumGeneratedScenes: 2,
  });

  assert.equal(result.ok, true, JSON.stringify(result, null, 2));
  assert.ok(result.sceneGraph.scenes[0].relations.some((relation) =>
    relation.kind === "overlap" && relation.subjects.includes("intro.title") && relation.subjects.includes("intro.media"),
  ));
  assert.match(upstream.requests[3].body.input[0].content, /får tillbaka exakta kompileringskonflikter/);
  assert.match(upstream.requests[3].body.input[1].content, /unauthorized_overlap/);
  assert.equal(upstream.requests.length, 4, "the reviewed design must recompile the same geometry instead of generating a replacement");
});

test("the same authored overlap reported by desktop and mobile is reviewed only once", async () => {
  const graph = structuredClone(validSceneGraph);
  const overlapping = geometryDraft();
  overlapping.profiles[0].scenes[0].nodes.find((node) => node.nodeId === "intro.title").bounds.x = 600;
  overlapping.profiles[1].scenes[0].nodes.find((node) => node.nodeId === "intro.title").bounds.x = 165;
  const upstream = fetchSequence([
    vision,
    { sceneGraph: graph },
    overlapping,
    {
      decisions: [{
        sceneId: "scene.intro",
        nodeA: "intro.title",
        nodeB: "intro.media",
        decision: "authorize_overlap",
        rationale: "Samma avsiktliga rubriklager används i båda profilerna.",
      }],
    },
  ]);

  const result = await generateFreeSceneSite({ answers: ["ett", "två", "tre", "fyra", "fem"] }, {
    apiKey: "test-key",
    model: "test-model",
    fetchImpl: upstream.fetch,
    minimumGeneratedScenes: 2,
  });

  assert.equal(result.ok, true, JSON.stringify(result, null, 2));
  assert.equal(upstream.requests.length, 4);
});

test("overlap decisions still reach the design motor when technical geometry conflicts are reported beside them", async () => {
  const graph = structuredClone(validSceneGraph);
  const mixedConflicts = geometryDraft((scenes) => {
    scenes[0].nodes.find((node) => node.nodeId === "intro.title").bounds.x = 600;
    scenes[1].nodes.find((node) => node.nodeId === "close.title").bounds.x = -20;
  });
  const upstream = fetchSequence([
    vision,
    { sceneGraph: graph },
    mixedConflicts,
    {
      decisions: [{
        sceneId: "scene.intro",
        nodeA: "intro.title",
        nodeB: "intro.media",
        decision: "authorize_overlap",
        rationale: "Rubriken är avsiktligt placerad över bilden.",
      }],
    },
    geometryDraft(),
  ]);

  const result = await generateFreeSceneSite({ answers: ["ett", "två", "tre", "fyra", "fem"] }, {
    apiKey: "test-key",
    model: "test-model",
    fetchImpl: upstream.fetch,
    minimumGeneratedScenes: 2,
  });

  assert.equal(result.ok, true, JSON.stringify(result, null, 2));
  assert.ok(result.sceneGraph.scenes[0].relations.some((relation) => relation.kind === "overlap"));
  assert.match(upstream.requests[3].body.input[1].content, /unauthorized_overlap/);
  assert.doesNotMatch(upstream.requests[3].body.input[1].content, /node_outside_scene/);
  assert.match(upstream.requests[4].body.input[0].content, /får inte designa om/);
});

test("AI editing changes the same scene revision and recompiles without a blueprint fallback", async () => {
  const edited = structuredClone(validSceneGraph);
  edited.contentAtoms.find((item) => item.id === "content.intro.title").value = "En ny rubrik på samma sida";
  for (const field of ["sceneGraphVersion", "engineVersion", "generationId", "graphRevision", "sourceRefs"]) {
    delete edited[field];
  }
  delete edited.assetManifest.manifestId;
  edited.contentAtoms.forEach((atom) => { delete atom.provenance; });
  edited.assetManifest.assets.forEach((asset) => { delete asset.provenance; });
  const upstream = fetchSequence([
    { sceneGraph: edited },
    geometryDraft(),
  ]);

  const result = await editFreeSceneSite({
    creativeBrief: { answers: ["ett", "två", "tre", "fyra", "fem"] },
    sceneGraph: validSceneGraph,
    instruction: "Ändra huvudrubriken till En ny rubrik på samma sida",
  }, {
    apiKey: "test-key",
    model: "test-model",
    fetchImpl: upstream.fetch,
  });

  assert.equal(result.ok, true, JSON.stringify(result, null, 2));
  assert.equal(result.generationId, validSceneGraph.generationId, "editing must keep the website generation identity");
  assert.equal(result.sceneGraph.graphRevision.revisionNumber, 1);
  assert.equal(result.sceneGraph.contentAtoms.find((item) => item.id === "content.intro.title").value, "En ny rubrik på samma sida");
  assert.equal(result.sceneGraph.contentAtoms.find((item) => item.id === "content.intro.title").provenance.origin, "creativeProposal");
  assert.equal(result.sceneGraph.contentAtoms.find((item) => item.id === "content.close.title").provenance.rationale, validSceneGraph.contentAtoms.find((item) => item.id === "content.close.title").provenance.rationale);
  assert.ok(result.sceneGraph.assetManifest.assets.every((asset) => asset.provenance));
  assert.match(result.compiledProfiles[0].html, /En ny rubrik på samma sida/);
  assert.equal(upstream.requests.length, 2, "edit motor and geometry motor must be separate calls");
  assert.match(upstream.requests[0].body.input[0].content, /samma webbplats/);
  assert.equal(upstream.requests[0].body.text.format.schema.$defs.contentAtom.properties.provenance, undefined);
  assert.match(upstream.requests[1].body.input[0].content, /får inte designa om/);
  assert.ok(upstream.requests.every((request) => request.url.endsWith("/v1/responses")));
});

test("manual text editing patches the same scene deterministically without calling AI", () => {
  const result = replaceFreeSceneContent({
    sceneGraph: validSceneGraph,
    resolvedProfiles: [validResolvedSceneGraph],
    contentId: "content.intro.title",
    value: "Sparad direkt i samma scen",
  });

  assert.equal(result.ok, true, JSON.stringify(result, null, 2));
  assert.equal(result.generationId, validSceneGraph.generationId);
  assert.equal(result.sceneGraph.graphRevision.revisionNumber, 1);
  assert.equal(validSceneGraph.contentAtoms.find((item) => item.id === "content.intro.title").value, "Ett rum att minnas", "source graph must stay immutable");
  assert.match(result.compiledProfiles[0].html, /Sparad direkt i samma scen/);
  assert.doesNotMatch(JSON.stringify(result.sceneGraph), /"component"|"variant"|"sectionType"|"componentStrategy"/);
});
