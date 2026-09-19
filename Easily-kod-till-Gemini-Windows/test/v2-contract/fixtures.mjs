import { canonicalSha256 } from "../../v2/contract-validator.mjs";

const A = "a".repeat(64);
const B = "b".repeat(64);
const C = "c".repeat(64);
const D = "d".repeat(64);

const provenance = (answerIds = []) => ({
  origin: "creativeExpression",
  claimClass: "creativeExpression",
  verificationStatus: "notRequired",
  answerIds,
  confidence: 0.95,
  rationale: "Authored from the five-question brief.",
});

const measure = (value, unit = "px") => ({ value, unit });

export const validSceneGraph = {
  sceneGraphVersion: "2.0",
  engineVersion: "v2",
  generationId: "gen_fixture_001",
  graphRevision: {
    revisionId: "revision.initial",
    revisionNumber: 0,
    createdAt: "2026-08-25T10:00:00.000Z",
  },
  sourceRefs: {
    creativeBriefArtifactId: "artifact:brief:001",
    creativeVisionArtifactId: "artifact:vision:001",
    compositionIntentArtifactId: "artifact:composition:001",
    briefSha256: A,
  },
  contentAtoms: [
    { id: "content.intro.title", kind: "text", value: "Ett rum att minnas", locale: "sv", semanticPurpose: "opening statement", provenance: provenance(["answer:q1"]) },
    { id: "content.intro.cta", kind: "action", value: { label: "Utforska" }, locale: "sv", semanticPurpose: "primary action", provenance: provenance(["answer:q3"]) },
    { id: "content.intro.alt", kind: "text", value: "Ett komponerat stilleben", locale: "sv", semanticPurpose: "media alternative", provenance: provenance() },
    { id: "content.close.title", kind: "text", value: "Kom in och upptäck", locale: "sv", semanticPurpose: "closure", provenance: provenance(["answer:q5"]) },
    { id: "content.gallery.data", kind: "data", value: [{ id: "one" }, { id: "two" }], semanticPurpose: "repeat source", provenance: provenance() },
  ],
  assetManifest: {
    manifestId: "assets.fixture",
    assets: [
      {
        id: "asset.hero",
        kind: "image",
        mimeType: "image/webp",
        source: { origin: "generated", uri: "assets/fixture-hero.webp", sourceId: "source:image:hero", contentSha256: B },
        intrinsic: { width: 1600, height: 1000, aspectRatio: 1.6 },
        altContentRef: "content.intro.alt",
        provenance: provenance(["answer:q2"]),
      },
      {
        id: "asset.alternate",
        kind: "image",
        mimeType: "image/webp",
        source: { origin: "generated", uri: "assets/fixture-alternate.webp", sourceId: "source:image:alternate", contentSha256: C },
        intrinsic: { width: 1200, height: 1200, aspectRatio: 1 },
        altContentRef: "content.intro.alt",
        provenance: provenance(["answer:q2"]),
      },
      {
        id: "asset.motif",
        kind: "vector",
        mimeType: "image/svg+xml",
        source: { origin: "projectLocal", uri: "assets/fixture-motif.svg", sourceId: "source:vector:motif", contentSha256: D },
        intrinsic: { width: 100, height: 100, aspectRatio: 1, viewBox: { minX: 0, minY: 0, width: 100, height: 100 } },
        provenance: provenance(),
      },
    ],
  },
  designLanguage: {
    colorRoles: [
      { id: "color.ink", value: "#172822", intent: "primary text and deep fields", dominance: 0.65, allowedForegroundRoleIds: ["color.paper"], allowedBackgroundRoleIds: ["color.paper"], maxCoverage: 0.8 },
      { id: "color.paper", value: "#F2EEE4", intent: "quiet surface", dominance: 0.35, allowedForegroundRoleIds: ["color.ink"], allowedBackgroundRoleIds: ["color.ink"], maxCoverage: 0.8 },
    ],
    typographyRoles: [
      { id: "type.display", intent: "dominant display", family: "serif", fallbacks: ["Georgia"], weight: 500, style: "normal", size: { min: 3, preferred: 6, max: 8, unit: "rem", interpolation: "linear" }, lineHeight: 0.95, letterSpacing: -1 },
      { id: "type.body", intent: "supporting copy", family: "sans-serif", fallbacks: ["Arial"], weight: 400, style: "normal", size: { min: 1, preferred: 1.2, max: 1.4, unit: "rem", interpolation: "linear" }, lineHeight: 1.5, letterSpacing: 0 },
    ],
    styleTokens: [
      { id: "style.radius.soft", value: { value: 18, unit: "px" }, intent: "soft media edge" },
      { id: "style.border.hairline", value: { width: 1, colorRoleId: "color.ink" }, intent: "quiet separation" },
    ],
    motifs: [
      { id: "motif.thread", intent: "a continuous line links the scenes", rationale: "Carries attention through the page.", styleRoleIds: ["style.border.hairline"], behaviorRoleIds: [], usageConstraints: ["Never choose a section layout."] },
    ],
    creativeInitiatives: [
      { id: "initiative.journey", intent: "lead from discovery to invitation", whyItBelongs: "Matches the requested welcoming experience.", sceneIds: ["scene.intro", "scene.close"], motifIds: ["motif.thread"] },
    ],
  },
  pageFlow: {
    sceneOrder: ["scene.intro", "scene.close"],
    entrySceneId: "scene.intro",
    closureSceneId: "scene.close",
    energyArc: "A focused opening settles into a quiet invitation.",
    attentionJourney: "Title, image, action, closing message.",
    globalReadingDirection: "ltr",
  },
  scenes: [
    {
      id: "scene.intro",
      experienceRole: "introduce the promise",
      narrativePurpose: "create curiosity",
      creativeRationale: "The image and title share one dominant visual field.",
      energy: 0.8,
      density: 0.55,
      tempo: 0.7,
      focalSequence: ["intro.title", "intro.media", "intro.cta"],
      nodes: [
        { id: "intro.root", kind: "group", semanticRole: "hero", children: ["intro.title", "intro.media", "intro.cta"], motifIds: ["motif.thread"], visual: { backgroundRoleId: "color.paper" } },
        { id: "intro.title", kind: "text", semanticRole: "primary focal point", contentRef: "content.intro.title", children: [], visual: { colorRoleId: "color.ink", typographyRoleId: "type.display" }, accessibility: { headingLevel: 1 } },
        { id: "intro.media", kind: "media", semanticRole: "supporting atmosphere", assetRef: "asset.hero", children: [], visual: { radiusTokenId: "style.radius.soft" }, accessibility: { description: "Ett komponerat stilleben" } },
        { id: "intro.cta", kind: "action", semanticRole: "next step", contentRef: "content.intro.cta", children: [], visual: { colorRoleId: "color.paper", backgroundRoleId: "color.ink", typographyRoleId: "type.body" }, accessibility: { label: "Utforska", tabOrder: 0 } },
      ],
      relations: [
        { id: "relation.intro.contain", kind: "contain", subjects: ["intro.title", "intro.media", "intro.cta"], target: "intro.root", padding: measure(48), strength: "required", rationale: "Keep the scene together." },
        { id: "relation.intro.flow", kind: "flow", subjects: ["intro.title", "intro.media", "intro.cta"], axis: "inline", orderedNodeIds: ["intro.title", "intro.media", "intro.cta"], gap: measure(32), wrap: false, strength: "strong", rationale: "Author the focal order." },
        { id: "relation.intro.crop", kind: "cropFocus", subjects: ["intro.media"], fit: "cover", focalPoint: { x: 0.62, y: 0.45 }, safeRegion: { x: 0.25, y: 0.15, width: 0.6, height: 0.7 }, strength: "required", rationale: "Preserve the authored subject focus." },
      ],
      constraints: { minBlock: measure(520), maxBlock: measure(900), minInline: measure(320), maxInline: measure(1600), overflowPolicy: "expandWithinMax", viewportSpanIntent: { min: 0.65, preferred: 0.9, max: 1.1 } },
      transitionIn: { relationship: "page entrance", continuity: "thread begins", sharedMotifIds: ["motif.thread"] },
      transitionOut: { relationship: "resolve the promise", continuity: "thread continues", sharedMotifIds: ["motif.thread"] },
    },
    {
      id: "scene.close",
      experienceRole: "invite action",
      narrativePurpose: "close with confidence",
      creativeRationale: "A compact typographic ending lowers the tempo.",
      energy: 0.35,
      density: 0.25,
      tempo: 0.3,
      focalSequence: ["close.title"],
      nodes: [
        { id: "close.root", kind: "group", semanticRole: "footer", children: ["close.title", "close.motif"], visual: { backgroundRoleId: "color.ink" } },
        { id: "close.title", kind: "text", semanticRole: "closing focal point", contentRef: "content.close.title", children: [], visual: { colorRoleId: "color.paper", typographyRoleId: "type.display" }, accessibility: { headingLevel: 2 } },
        { id: "close.motif", kind: "media", semanticRole: "decorative continuation", assetRef: "asset.motif", children: [], motifIds: ["motif.thread"], visual: { opacity: 0.45 }, accessibility: { decorative: true } },
        { id: "close.repeat", kind: "repeat", semanticRole: "authored repeated proof", children: [], dataBinding: { sourceContentRef: "content.gallery.data", itemAlias: "item", keyField: "id" }, visual: {} },
      ],
      relations: [
        { id: "relation.close.contain", kind: "contain", subjects: ["close.title", "close.motif", "close.repeat"], target: "close.root", padding: measure(40), strength: "required", rationale: "Keep the closure together." },
        { id: "relation.close.flow", kind: "flow", subjects: ["close.title", "close.motif", "close.repeat"], axis: "block", orderedNodeIds: ["close.title", "close.motif", "close.repeat"], gap: measure(24), wrap: false, strength: "strong", rationale: "A descending closure." },
      ],
      constraints: { minBlock: measure(360), maxBlock: measure(700), minInline: measure(320), maxInline: measure(1600), overflowPolicy: "expandWithinMax", viewportSpanIntent: { min: 0.45, preferred: 0.65, max: 0.9 } },
      transitionIn: { relationship: "receive the opening thread", continuity: "same visual language", sharedMotifIds: ["motif.thread"] },
      transitionOut: { relationship: "page closure", continuity: "thread ends", sharedMotifIds: ["motif.thread"] },
    },
  ],
  interactions: {
    stateMachines: [
      {
        id: "stateMachine.gallery",
        initialState: "state.gallery.default",
        states: [
          { id: "state.gallery.default", patches: [{ op: "setAsset", targetId: "intro.media", assetRef: "asset.hero" }] },
          { id: "state.gallery.alternate", patches: [{ op: "setAsset", targetId: "intro.media", assetRef: "asset.alternate" }] },
        ],
        transitions: [
          { from: "state.gallery.default", event: { kind: "activate", eventTargetId: "intro.cta" }, to: "state.gallery.alternate", timelineId: "timeline.intro.reveal" },
        ],
        accessibilityPolicy: { keyboardEquivalent: true, focusAfterTransition: "announce", announcementContentRef: "content.intro.alt" },
      },
    ],
  },
  motion: {
    timelines: [
      {
        id: "timeline.intro.reveal",
        trigger: { kind: "viewportProgress", sourceSceneId: "scene.intro", startProgress: 0.1, endProgress: 0.9 },
        durationMs: 900,
        delayMs: 0,
        easing: "cubic-bezier(0.2,0.8,0.2,1)",
        direction: "normal",
        iterations: 1,
        tracks: [
          { id: "track.intro.opacity", targetId: "intro.media", property: "opacity", keyframes: [{ offset: 0, value: 0 }, { offset: 1, value: 1 }] },
          { id: "track.intro.translate", targetId: "intro.media", property: "translateBlock", keyframes: [{ offset: 0, value: { value: 24, unit: "px" } }, { offset: 1, value: { value: 0, unit: "px" } }] },
        ],
        coordination: { mode: "sync", syncGroupId: "sync.intro", orderedTrackIds: ["track.intro.opacity", "track.intro.translate"] },
        reducedMotion: { policy: "jumpToEnd" },
      },
    ],
  },
  responsive: {
    baseProfileId: "profile.desktop",
    selectionPolicy: { mode: "highestPriorityMatchingProfile", tieBreak: "error", unmatched: "baseProfile" },
    profiles: [
      { id: "profile.desktop", priority: 0, query: { minInlinePx: 701 }, operations: [] },
      {
        id: "profile.mobile",
        priority: 10,
        query: { maxInlinePx: 700 },
        operations: [
          { op: "setFlowOrder", relationId: "relation.intro.flow", orderedNodeIds: ["intro.title", "intro.media", "intro.cta"], rationale: "Preserve the authored focal sequence in one column." },
          { op: "setMotionPolicy", timelineId: "timeline.intro.reveal", reducedMotion: { policy: "jumpToEnd" }, rationale: "Keep the authored quiet fallback." },
        ],
      },
    ],
  },
};

function resolvedNode(nodeId, x, y, width, height, zIndex, roleId) {
  return {
    nodeId,
    bounds: { x, y, width, height },
    visible: true,
    zIndex,
    ...(roleId ? { resolvedTypography: { roleId, fontSizePx: roleId === "type.display" ? 72 : 18, lineHeightPx: roleId === "type.display" ? 70 : 27, letterSpacingPx: 0 } } : {}),
  };
}

export const validResolvedSceneGraph = {
  schemaVersion: "2.0",
  generationId: validSceneGraph.generationId,
  unresolvedSceneGraphSha256: canonicalSha256(validSceneGraph),
  profileId: "profile.desktop",
  viewportInlinePx: 1440,
  viewportBlockPx: 900,
  appliedResponsiveOperations: [],
  sacrificedRelationIds: [],
  scenes: [
    {
      sceneId: "scene.intro",
      bounds: { x: 0, y: 0, width: 1440, height: 760 },
      orderedNodeIds: ["intro.root", "intro.title", "intro.media", "intro.cta"],
      nodes: [
        resolvedNode("intro.root", 0, 0, 1440, 760, 0),
        resolvedNode("intro.title", 80, 120, 460, 220, 2, "type.display"),
        resolvedNode("intro.media", 560, 70, 760, 620, 1),
        resolvedNode("intro.cta", 80, 390, 180, 52, 3, "type.body"),
      ],
    },
    {
      sceneId: "scene.close",
      bounds: { x: 0, y: 760, width: 1440, height: 520 },
      orderedNodeIds: ["close.root", "close.title", "close.motif", "close.repeat"],
      nodes: [
        resolvedNode("close.root", 0, 760, 1440, 520, 0),
        resolvedNode("close.title", 120, 870, 720, 150, 2, "type.display"),
        resolvedNode("close.motif", 1000, 820, 240, 240, 1),
        resolvedNode("close.repeat", 120, 1060, 900, 120, 2),
      ],
    },
  ],
  resolverDecisionLogArtifactId: "artifact:resolver-log:001",
};

export const validEditorMutationBatch = {
  batchId: "mutation.batch.001",
  generationId: validSceneGraph.generationId,
  baseRevisionId: validSceneGraph.graphRevision.revisionId,
  baseGraphSha256: canonicalSha256(validSceneGraph),
  resultRevisionId: "revision.001",
  resultGraphSha256: C,
  operations: [
    {
      id: "mutation.replace.hero",
      op: "replaceAsset",
      targetId: "intro.media",
      beforeAssetRef: "asset.hero",
      afterAssetRef: "asset.alternate",
      provenance: { actorType: "user", actorId: "user:fixture", createdAt: "2026-08-25T10:05:00.000Z", rationale: "User selected the alternate authored image." },
      reversible: true,
    },
  ],
};

export const validLockedBlueprint = {
  schemaVersion: "2.0",
  blueprintId: "blueprint.fixture.001",
  generationId: validSceneGraph.generationId,
  createdAt: "2026-08-25T10:10:00.000Z",
  unresolvedSceneGraph: validSceneGraph,
  unresolvedSceneGraphSha256: canonicalSha256(validSceneGraph),
  assetManifestSha256: canonicalSha256(validSceneGraph.assetManifest),
  contractValidationReportArtifactId: "artifact:validation-report:001",
  resolvedProfiles: [
    {
      profileId: validResolvedSceneGraph.profileId,
      resolvedSceneGraphSha256: canonicalSha256(validResolvedSceneGraph),
      resolvedSceneGraph: validResolvedSceneGraph,
    },
  ],
};

export const validRenderManifest = {
  schemaVersion: "2.0",
  manifestId: "render.manifest.001",
  generationId: validSceneGraph.generationId,
  createdAt: "2026-08-25T10:15:00.000Z",
  lockedBlueprintArtifactId: "artifact:locked-blueprint:001",
  lockedBlueprintSha256: canonicalSha256(validLockedBlueprint),
  resolvedSceneGraphArtifactId: "artifact:resolved-graph:desktop:001",
  resolvedSceneGraphSha256: canonicalSha256(validResolvedSceneGraph),
  assetManifestSha256: canonicalSha256(validSceneGraph.assetManifest),
  viewportProfileId: validResolvedSceneGraph.profileId,
  orderedSceneIds: validResolvedSceneGraph.scenes.map((scene) => scene.sceneId),
  orderedNodeIds: validResolvedSceneGraph.scenes.flatMap((scene) => scene.orderedNodeIds),
};

function changed(value, mutate) {
  const clone = structuredClone(value);
  mutate(clone);
  return clone;
}

export const positiveFixtures = [
  { name: "free scene graph with assets, state, motion and authored responsive profiles", type: "unresolvedSceneGraph", value: validSceneGraph },
  { name: "typed reversible editor mutation batch", type: "editorMutationBatch", value: validEditorMutationBatch, context: { sceneGraph: validSceneGraph } },
  { name: "resolved scene graph preserving the selected profile", type: "resolvedSceneGraph", value: validResolvedSceneGraph, context: { sceneGraph: validSceneGraph } },
  { name: "locked blueprint with a complete hash chain", type: "lockedBlueprint", value: validLockedBlueprint },
  { name: "render manifest bound to locked and resolved artifacts", type: "renderManifest", value: validRenderManifest, context: { lockedBlueprint: validLockedBlueprint, resolvedSceneGraph: validResolvedSceneGraph } },
];

export const negativeFixtures = [
  {
    name: "sourceId cannot substitute for a content graphId",
    type: "unresolvedSceneGraph",
    value: changed(validSceneGraph, (graph) => {
      graph.assetManifest.assets[0].source.sourceId = "source.image.hero";
      graph.scenes[0].nodes[1].contentRef = "source.image.hero";
    }),
    expectedKeyword: "referenceIntegrity",
  },
  {
    name: "duplicate graphId in a declared ID domain",
    type: "unresolvedSceneGraph",
    value: changed(validSceneGraph, (graph) => { graph.contentAtoms[1].id = graph.contentAtoms[0].id; }),
    expectedKeyword: "uniqueGraphId",
  },
  {
    name: "dangling asset-manifest reference",
    type: "unresolvedSceneGraph",
    value: changed(validSceneGraph, (graph) => { graph.scenes[0].nodes[2].assetRef = "asset.missing"; }),
    expectedKeyword: "referenceIntegrity",
  },
  {
    name: "named layout recipe property",
    type: "unresolvedSceneGraph",
    value: changed(validSceneGraph, (graph) => { graph.scenes[0].layoutType = "hero-left"; }),
    expectedKeyword: "additionalProperties",
  },
  {
    name: "untyped state path/value operation",
    type: "unresolvedSceneGraph",
    value: changed(validSceneGraph, (graph) => { graph.interactions.stateMachines[0].states[0].patches[0] = { op: "replaceContent", targetId: "intro.title", path: "contentRef", value: "content.close.title" }; }),
    expectedKeyword: "oneOf",
  },
  {
    name: "untyped responsive path/value operation",
    type: "unresolvedSceneGraph",
    value: changed(validSceneGraph, (graph) => { graph.responsive.profiles[1].operations[0] = { op: "setConstraint", path: "relations.0.gap", value: 12, rationale: "invalid free operation" }; }),
    expectedKeyword: "oneOf",
  },
  {
    name: "ambiguous viewport profile priority",
    type: "unresolvedSceneGraph",
    value: changed(validSceneGraph, (graph) => { graph.responsive.profiles[1].priority = graph.responsive.profiles[0].priority; }),
    expectedKeyword: "viewportSelection",
  },
  {
    name: "timeline progress range is reversed",
    type: "unresolvedSceneGraph",
    value: changed(validSceneGraph, (graph) => { graph.motion.timelines[0].trigger.startProgress = 0.9; graph.motion.timelines[0].trigger.endProgress = 0.1; }),
    expectedKeyword: "viewportProgress",
  },
  {
    name: "timeline keyframes do not span zero to one",
    type: "unresolvedSceneGraph",
    value: changed(validSceneGraph, (graph) => { graph.motion.timelines[0].tracks[0].keyframes[0].offset = 0.2; }),
    expectedKeyword: "timelineOffsets",
  },
  {
    name: "timeline coordination omits an authored track",
    type: "unresolvedSceneGraph",
    value: changed(validSceneGraph, (graph) => { graph.motion.timelines[0].coordination.orderedTrackIds.pop(); }),
    expectedKeyword: "motionCoordination",
  },
  {
    name: "editor mutation is not reversible",
    type: "editorMutationBatch",
    value: changed(validEditorMutationBatch, (batch) => { batch.operations[0].reversible = false; }),
    context: { sceneGraph: validSceneGraph },
    expectedKeyword: "const",
  },
  {
    name: "editor mutation base hash does not bind to its scene graph",
    type: "editorMutationBatch",
    value: changed(validEditorMutationBatch, (batch) => { batch.baseGraphSha256 = D; }),
    context: { sceneGraph: validSceneGraph },
    expectedKeyword: "hashChain",
  },
  {
    name: "resolved graph selects the wrong viewport profile",
    type: "resolvedSceneGraph",
    value: changed(validResolvedSceneGraph, (resolved) => { resolved.profileId = "profile.mobile"; }),
    context: { sceneGraph: validSceneGraph },
    expectedKeyword: "viewportSelection",
  },
  {
    name: "locked blueprint loses the unresolved graph hash",
    type: "lockedBlueprint",
    value: changed(validLockedBlueprint, (blueprint) => { blueprint.unresolvedSceneGraphSha256 = D; }),
    expectedKeyword: "hashChain",
  },
  {
    name: "render manifest points at another resolved generation",
    type: "renderManifest",
    value: changed(validRenderManifest, (manifest) => { manifest.resolvedSceneGraphSha256 = D; }),
    context: { lockedBlueprint: validLockedBlueprint, resolvedSceneGraph: validResolvedSceneGraph },
    expectedKeyword: "hashChain",
  },
];
