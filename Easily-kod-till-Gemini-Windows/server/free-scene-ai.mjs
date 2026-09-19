import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  V2_SCHEMA,
  canonicalSha256,
  validateResolvedSceneGraph,
  validateUnresolvedSceneGraph,
} from "../v2/contract-validator.mjs";
import { compileLayout } from "../v2/layout-compiler.mjs";

const stringArray = { type: "array", items: { type: "string" } };

export const FREE_CREATIVE_VISION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    candidates: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          thesis: { type: "string" },
          semanticReading: { type: "string" },
          compositionIdea: { type: "string" },
          designWorld: { type: "string" },
          typographyDirection: { type: "string" },
          colorSystem: { type: "string" },
          imageWorld: { type: "string" },
          signatureDetails: stringArray,
          differentiationAxes: {
            type: "array",
            minItems: 6,
            items: { type: "string" },
          },
          rejectedConvention: { type: "string" },
          risk: { type: "string" },
        },
        required: [
          "name", "thesis", "semanticReading", "compositionIdea", "designWorld", "typographyDirection",
          "colorSystem", "imageWorld", "signatureDetails", "differentiationAxes", "rejectedConvention", "risk",
        ],
      },
    },
    selectedIndex: { type: "integer", minimum: 0, maximum: 2 },
    selectionRationale: { type: "string" },
    executionMandate: { type: "string" },
  },
  required: ["candidates", "selectedIndex", "selectionRationale", "executionMandate"],
};

const sceneRoot = structuredClone(V2_SCHEMA);
delete sceneRoot.$schema;
delete sceneRoot.$id;
delete sceneRoot.title;
delete sceneRoot.$defs;
sceneRoot.properties.scenes.minItems = 1;
delete sceneRoot.properties.scenes.maxItems;

export const FREE_SCENE_OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    sceneGraph: { $ref: "#/$defs/sceneGraph" },
  },
  required: ["sceneGraph"],
  $defs: { ...structuredClone(V2_SCHEMA.$defs), sceneGraph: sceneRoot },
};
FREE_SCENE_OUTPUT_SCHEMA.$defs.relation.properties.subjects.description =
  "Every id must be a node id declared inside the same scene; never use a scene id.";
FREE_SCENE_OUTPUT_SCHEMA.$defs.relation.properties.target.description =
  "Must be a node id declared inside the same scene. To target the canvas, use that scene's root group node, never the scene id.";
FREE_SCENE_OUTPUT_SCHEMA.$defs.assetSource.properties.origin.description =
  "Use generated for an AI-generated pending image.";
FREE_SCENE_OUTPUT_SCHEMA.$defs.asset.properties.provenance.description =
  "For an AI-proposed image use origin creativeExpression; put the exact photographic prompt in rationale.";
FREE_SCENE_OUTPUT_SCHEMA.$defs.responsive.properties.profiles.description =
  "Create at least two non-ambiguous profiles: a desktop base profile and a higher-priority mobile profile.";

// The free design motor authors the visual scene. Persistence metadata belongs
// to the server and must not consume creative output budget or be trusted to a
// probabilistic producer. The transient creativeIntent carries the one piece
// of authored information the image materializer needs; it is converted to
// contract provenance and removed before validation.
function authoredSceneOutputSchema({ initial = false } = {}) {
  const schema = structuredClone(FREE_SCENE_OUTPUT_SCHEMA);
  if (initial) {
    delete schema.$defs.sceneGraph.properties.interactions;
    delete schema.$defs.sceneGraph.properties.motion;
  }
  for (const field of ["sceneGraphVersion", "engineVersion", "generationId", "graphRevision", "sourceRefs"]) {
    delete schema.$defs.sceneGraph.properties[field];
    schema.$defs.sceneGraph.required = schema.$defs.sceneGraph.required.filter((entry) => entry !== field);
  }
  schema.$defs.contentAtom.required =
    schema.$defs.contentAtom.required.filter((entry) => entry !== "provenance");
  delete schema.$defs.contentAtom.properties.provenance;
  schema.$defs.asset.required =
    schema.$defs.asset.required.filter((entry) => entry !== "provenance");
  delete schema.$defs.asset.properties.provenance;
  schema.$defs.asset.properties.creativeIntent = {
    type: "string",
    minLength: 1,
    description: "Exact visual intent or photographic prompt for this authored asset.",
  };
  schema.$defs.assetSource.required =
    schema.$defs.assetSource.required.filter((entry) => entry !== "contentSha256");
  schema.$defs.assetManifest.required =
    schema.$defs.assetManifest.required.filter((entry) => entry !== "manifestId");
  return schema;
}

export const FREE_INITIAL_SCENE_OUTPUT_SCHEMA = authoredSceneOutputSchema({ initial: true });
FREE_INITIAL_SCENE_OUTPUT_SCHEMA.$defs.sceneGraph.properties.scenes.minItems = 1;
FREE_INITIAL_SCENE_OUTPUT_SCHEMA.$defs.sceneGraph.properties.scenes.maxItems = 1;
FREE_INITIAL_SCENE_OUTPUT_SCHEMA.$defs.pageFlow.properties.sceneOrder.minItems = 1;
FREE_INITIAL_SCENE_OUTPUT_SCHEMA.$defs.pageFlow.properties.sceneOrder.maxItems = 1;
export const FREE_EDIT_SCENE_OUTPUT_SCHEMA = authoredSceneOutputSchema();

export const FREE_GEOMETRY_OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    profiles: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          profileId: { $ref: "#/$defs/graphId" },
          viewportInlinePx: { type: "number", exclusiveMinimum: 0 },
          viewportBlockPx: { type: "number", exclusiveMinimum: 0 },
          scenes: { type: "array", minItems: 1, items: { $ref: "#/$defs/resolvedScene" } },
        },
        required: ["profileId", "viewportInlinePx", "viewportBlockPx", "scenes"],
      },
    },
  },
  required: ["profiles"],
  $defs: structuredClone(V2_SCHEMA.$defs),
};

function geometrySchemaForProfile(profileId) {
  const schema = structuredClone(FREE_GEOMETRY_OUTPUT_SCHEMA);
  schema.properties.profiles.minItems = 1;
  schema.properties.profiles.maxItems = 1;
  schema.properties.profiles.items.properties.profileId = { type: "string", const: profileId };
  return schema;
}

const DESIGN_CONFLICT_REVIEW_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    decisions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          sceneId: { type: "string" },
          nodeA: { type: "string" },
          nodeB: { type: "string" },
          decision: { enum: ["authorize_overlap", "keep_separate"] },
          rationale: { type: "string" },
        },
        required: ["sceneId", "nodeA", "nodeB", "decision", "rationale"],
      },
    },
  },
  required: ["decisions"],
};

const VISION_PROMPT = `Du är Easilys Creative Director. Tolka kundens fem svar och skapa tre verkligt olika kreativa riktningar. Välj den starkaste.

Du bygger inte en webbsida och känner inte till några webbkomponenter, sektionsbibliotek, varianter eller mallar. Tänk som en erfaren grafisk designer och art director i komposition, typografi, bildvärld, material, rytm, detaljer och blickföring.

Varje kandidat måste vara en egen designvärld. Möjliga världar är exempelvis mörk och dramatisk, högteknologisk, lyxig, viktoriansk, retro, editorial/magasin, skandinavisk, brutalistisk, futuristisk, lekfull, monokrom eller cinematisk, men du får även formulera en ny relevant värld. Välj inte automatiskt skandinavisk, beige eller sagegrön bara för att kunden inte har specificerat färg.

Kandidaterna måste skilja sig på minst sex konkreta axlar bland komposition, skala, typografi, rytm, densitet, bildspråk, former, materialitet, negativ yta, kontrast, navigationsuttryck och detaljering. En ny palett på samma uppbyggnad räknas inte som en ny riktning. Varje riktning ska avvisa den mest väntade branschkonventionen och innehålla minst fyra synliga hantverksdetaljer. Använd aldrig dekorativa ordningsnummer, katalognummer eller stegnummer om kunden inte själv har lämnat sådana uppgifter. Hitta aldrig på affärsfakta.`;

const SCENE_PROMPT = `Du är Easilys fria visuella designmotor. Skapa en fullständig V2 sceneGraph från Creative Brief och den valda kreativa riktningen.

Du känner över huvud taget inte till komponenter, sektionstyper, varianter, mallar, recept eller färdiga grids. Använd endast grafens tillåtna primitiv: group, text, media, shape, action, input, icon och repeat. Formge med visuella relationer: contain, anchor, align, flow, distribute, size, aspect, overlap, layer, avoid, clip, cropFocus, balance och visibility.

Den fria scenen är den enda auktoriteten för designen. Beskriv varje visuellt beslut, inklusive responsiva beslut, i grafen. Den första webbplatsen ska vara exakt EN sammanhängande, sidlång visuell scen. Den får ha valfritt många grupper och visuella områden, men de får inte modelleras eller komponeras som fristående webbsektioner. Entré, berättelse, erbjudande, galleri och avslut ska vid behov flöda inom samma komposition och dela ett medvetet visuellt system. Upprepa inte samma text-vänster/bild-höger-upplägg i staplade block.

Hero och footer ska alltid finnas som tydliga grupper i den enda sidlånga kompositionen. Sätt gruppernas semanticRole till exakt "hero" respektive "footer" så att kravet kan valideras. De är inte fristående sektioner eller mallar.

Om Creative Brief innehåller customerFacts.requestedContent ska varje valt id gestaltas som en meningsfull grupp eller del av flödet i samma scen: about betyder Om oss, services betyder Tjänster, gallery betyder Galleri och contact betyder Kontakt. Kryssen anger innehåll, aldrig sektionsbeställningar. Saknat faktaunderlag får inte ersättas med påhittade uppgifter.

Den valda designvärlden måste synas i komposition, skala, typografi, rytm, densitet, bildvärld, former, kontrast och signaturdetaljer. Färger ensamma får aldrig bära riktningen. Varje synlig text- eller action-atom du skapar måste placeras i scenen. I varje relation måste subjects och target vara id:n för noder som finns i scenens nodes. Ett scene-id får aldrig användas som relationstarget; använd scenens root group-nod när något ska förankras mot hela scenytan. Skapa aldrig dekorativa ordningsnummer, katalognummer eller stegnummer. Skapa endast innehåll som kan härledas ur briefen; okända affärsfakta ska utelämnas. Håll tekniska rationaler korta, högst 18 ord, så att hela scenen alltid ryms i svaret.

Gör en slutkontroll före svaret: varje contentAtom med kind text eller action måste förekomma som contentRef i minst en synlig nod. Om en sådan atom inte hör till kompositionen ska den inte finnas i contentAtoms.

Alla genererade bildassets ska använda source.origin "generated" och source.uri som börjar med "pending://". Lägg den exakta fotografiska bildprompten i assetens creativeIntent. Bilden får inte innehålla text eller logotyper. Servern, inte du, ansvarar för hashes, manifest-id:n, versionsfält och provenance.

Responsive måste innehålla minst två icke överlappande profiler: en baseProfile för dator och en högre prioriterad mobilprofil. Båda ska bevara samma scener, innehåll och designidé; mobilprofilen får endast uttrycka nödvändiga responsiva operationer.

Första versionen ska inte innehålla interactions eller motion. Femfrågeflödet bygger först en stabil visuell sida; interaktion och rörelse läggs till senare endast på en uttrycklig användarinstruktion.

Strukturella fält med namn som component, variant, sectionType, componentStrategy, template, preset eller layout är förbjudna.`;

const GEOMETRY_PROMPT = `Du är Easilys geometrimotor. Du får inte designa om den fria scenen.

Översätt exakt de befintliga scenerna, noderna och relationerna till pixelmått för varje efterfrågad viewportprofil. Skapa aldrig nya noder, ta aldrig bort noder och ändra aldrig ordning, typ, innehåll, färg, typografiroll, gruppering eller överlappningsavsikt. Varje authored node ska förekomma exakt en gång i sin scen.

Alla synliga noder måste ligga helt inom scenens bounds. Text och actions måste ha resolvedTypography från sin redan valda typographyRoleId. Beräkna textrutans höjd för hela den verkliga texten efter radbrytning; ingen text får rinna ut ur sin ruta. Två visuella lövnoder får endast överlappa om grafen uttryckligen innehåller en overlap- eller layer-relation mellan dem. En authored layer-relation ska bevaras exakt. Scenens y-positioner ska bilda en sammanhängande vertikal sida. Om grafens required-relationer är olösliga ska du inte hitta på en ersättningsdesign.`;

const GEOMETRY_REPAIR_PROMPT = `Du är Easilys geometrireparationsmotor. Du får inte designa om eller generera om geometrin.

Du får den oföränderliga fria sceneGraphen, den senast lösta geometrin och exakta tekniska konflikter. Returnera samma profiler, scener, noder och ordning. Ändra endast bounds, visible, zIndex eller resolvedTypography för de konfliktberörda noderna och minsta nödvändiga närliggande noder.

Vid text_box_overflow ska hela verkliga texten få plats utan beskärning. Vid node_outside_scene ska noden ligga helt inom samma scen. Vid authored_avoid_violated eller text_collision ska objekten hållas läsbart isär. Vid geometry_numeric_type ska endast det angivna resolvedTypography-fältet rättas till ett JSON-tal utan enhet, sträng eller objekt. Bevara alla uttryckliga layer- och overlap-relationer exakt. Flytta inte orelaterat innehåll och skapa inga nya visuella beslut.`;

const DESIGN_CONFLICT_REVIEW_PROMPT = `Du är Easilys fria visuella designmotor och får tillbaka exakta kompileringskonflikter.

Du får inte skapa, ersätta eller omkomponera layouten. För varje rapporterad unauthorized_overlap ska du endast avgöra om överlappningen redan följer scenens kreativa avsikt eller om objekten enligt scenen måste hållas isär. Svara authorize_overlap när en form är scenens avsedda bakgrund eller när överlappningen är ett annat avsiktligt visuellt lager; detta uttrycker designbeslutet som en ny overlap-relation. Två textbärande objekt får aldrig överlappa varandra; rubrik, brödtext, knapp och inmatning ska alltid hållas läsbart åtskilda. Svara annars keep_separate. Varje konflikt ska få exakt ett beslut och inga andra nodpar får läggas till.`;

const SCENE_EDIT_PROMPT = `Du är Easilys fria visuella scenredigerare. Ändra den befintliga V2-scenen enligt användarens instruktion.

Detta är samma webbplats, inte en nygenerering. Bevara generationId, alla opåverkade scener, noder, relationer, innehållsatomer, assets, designroller och deras id:n exakt. Ändra endast det som krävs av instruktionen. Nya visuella objekt får endast uttryckas med group, text, media, shape, action, input, icon och repeat. Du känner inte till komponenter, sektionstyper, varianter, mallar eller färdiga grids.

Du får ändra kompositionen endast när användaren uttryckligen ber om en visuell eller strukturell ändring. Om användaren bara ändrar text ska geometrin och designen förbli orörd. I relationer får subjects och target endast referera till noder i samma scen, aldrig till scene-id:t; använd scenens root group-nod som scenyta. Genererade nya bildassets ska använda source.origin "generated", pending:// och en exakt bildprompt i creativeIntent. Servern äger hashes, versionsfält, manifest-id:n och provenance. Hitta aldrig på affärsfakta.`;

const SCENE_CONTRACT_REPAIR_PROMPT = `Du är Easilys kontraktsreparationsmotor, inte en designer.

Du får en befintlig fri sceneGraph och exakta kontraktsfel. Gör minsta möjliga tekniska ändring som gör grafen giltig. Bevara designidé, scener, komposition, innehåll, visuella roller, assets och responsiva beslut. Skapa inte en ny graf från briefen och använd inga komponenter eller mallar.

Vid en ogiltig referens: rätta till ett befintligt avsett nod-id endast när det är entydigt, annars ta bort endast den ogiltiga referensen. Vid saknat eller förbjudet schemafält: ändra endast den felande posten till kontraktets tillåtna form eller ta bort just den valfria ogiltiga posten. Gör inga estetiska förbättringar.`;

function responseText(payload) {
  if (typeof payload?.output_text === "string") return payload.output_text;
  for (const item of payload?.output || []) {
    for (const content of item?.content || []) {
      if (content?.type === "output_text" && typeof content.text === "string") return content.text;
    }
  }
  return "";
}

async function structuredResponse({ apiKey, fetchImpl, model, system, user, schema, name, maxOutputTokens }) {
  let upstream;
  try {
    upstream = await fetchImpl("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(180000),
      body: JSON.stringify({
        model,
        store: false,
        input: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        // V2-kontraktet har avsiktligt valfria primitivfält. OpenAI strict mode
        // kräver däremot alla properties i required. Vår egen validator är den
        // bindande fail-closed-gränsen efter svaret.
        text: { format: { type: "json_schema", name, strict: false, schema } },
        max_output_tokens: maxOutputTokens,
      }),
    });
  } catch (error) {
    return { ok: false, error: "openai-unreachable", detail: error?.message || String(error) };
  }
  if (!upstream.ok) {
    let upstreamError = null;
    try { upstreamError = await upstream.json(); } catch { /* malformed upstream error */ }
    return {
      ok: false,
      error: upstream.status === 401 ? "openai-invalid-key" : "openai-error",
      status: upstream.status,
      detail: String(upstreamError?.error?.message || "OpenAI rejected the request."),
      upstreamCode: String(upstreamError?.error?.code || ""),
      upstreamParam: String(upstreamError?.error?.param || ""),
    };
  }
  const payload = await upstream.json();
  const output = responseText(payload);
  if (!output) return { ok: false, error: "openai-empty-response" };
  try {
    return { ok: true, value: JSON.parse(output), responseId: payload.id || "" };
  } catch {
    return { ok: false, error: "openai-invalid-json" };
  }
}

function stampServerMetadata(sceneGraph, envelope) {
  const graph = sceneGraph && typeof sceneGraph === "object" && !Array.isArray(sceneGraph)
    ? structuredClone(sceneGraph)
    : {};
  graph.sceneGraphVersion = "2.0";
  graph.engineVersion = "v2";
  graph.generationId = envelope.generationId;
  graph.graphRevision = {
    revisionId: "revision.initial",
    revisionNumber: 0,
    createdAt: envelope.createdAt,
  };
  graph.sourceRefs = {
    creativeBriefArtifactId: envelope.briefArtifactId,
    creativeVisionArtifactId: envelope.visionArtifactId,
    compositionIntentArtifactId: envelope.compositionArtifactId,
    briefSha256: envelope.briefSha256,
  };
  return graph;
}

function compactPromptPart(value, maxLength = 500) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function assetSceneContext(graph, assetId) {
  for (const scene of graph.scenes || []) {
    if ((scene.nodes || []).some((node) => node.assetRef === assetId)) {
      return compactPromptPart(scene.creativeRationale || scene.narrativePurpose, 280);
    }
  }
  return "";
}

function assetAltText(graph, asset) {
  if (!asset?.altContentRef) return "";
  const atom = (graph.contentAtoms || []).find((entry) => entry.id === asset.altContentRef);
  return typeof atom?.value === "string" ? compactPromptPart(atom.value, 220) : "";
}

function generatedAssetPrompt(graph, asset, selectedVision) {
  const authoredIntent = compactPromptPart(asset?.creativeIntent, 700);
  if (authoredIntent) return authoredIntent;
  const parts = [
    compactPromptPart(selectedVision?.imageWorld, 280),
    assetAltText(graph, asset),
    assetSceneContext(graph, asset?.id),
  ].filter(Boolean);
  return parts.join(". ") || `Webbplatsbild för det visuella objektet ${String(asset?.id || "utan namn")}.`;
}

function conservativeContentProvenance() {
  return {
    origin: "creativeProposal",
    claimClass: "proposal",
    verificationStatus: "requiresConfirmation",
    rationale: "Server-added conservative provenance for content authored from the Creative Brief.",
  };
}

function assetProvenance(graph, asset, selectedVision) {
  const generated = asset?.source?.origin === "generated";
  return generated
    ? {
        origin: "creativeExpression",
        claimClass: "creativeExpression",
        verificationStatus: "notRequired",
        rationale: generatedAssetPrompt(graph, asset, selectedVision),
      }
    : {
        origin: "suppliedAsset",
        claimClass: "none",
        verificationStatus: "requiresConfirmation",
        rationale: "Server-preserved non-generated asset declared by the authored scene.",
      };
}

/**
 * Turns the free motor's authored scene into the persisted V2 graph. This may
 * add or remove technical metadata, but never nodes, relations, colors,
 * typography, scene order, or any other aesthetic decision.
 */
export function assembleInitialSceneGraph(authoredSceneGraph, { envelope, selectedVision } = {}) {
  const graph = stampServerMetadata(authoredSceneGraph, envelope);
  if (graph.assetManifest && typeof graph.assetManifest === "object") {
    graph.assetManifest.manifestId = `assets.${envelope.generationId}`;
  }
  for (const atom of graph.contentAtoms || []) {
    atom.provenance = conservativeContentProvenance();
  }
  for (const asset of graph.assetManifest?.assets || []) {
    asset.provenance = assetProvenance(graph, asset, selectedVision);
    delete asset.creativeIntent;
    if (asset.source?.origin === "generated" && String(asset.source.uri || "").startsWith("pending://")) {
      asset.source.contentSha256 = "0".repeat(64);
    }
  }
  return pruneDanglingOptionalMetadataRefs(pruneUnrenderedVisibleContent(graph));
}

function stampEditedMetadata(sceneGraph, currentSceneGraph, createdAt) {
  const graph = sceneGraph && typeof sceneGraph === "object" && !Array.isArray(sceneGraph)
    ? structuredClone(sceneGraph)
    : {};
  const nextRevision = Number(currentSceneGraph.graphRevision?.revisionNumber || 0) + 1;
  graph.sceneGraphVersion = "2.0";
  graph.engineVersion = "v2";
  graph.generationId = currentSceneGraph.generationId;
  graph.graphRevision = {
    revisionId: `revision.${nextRevision}`,
    revisionNumber: nextRevision,
    createdAt,
  };
  graph.sourceRefs = structuredClone(currentSceneGraph.sourceRefs);
  return graph;
}

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function assembleEditedSceneGraph(authoredSceneGraph, currentSceneGraph, { createdAt, selectedVision } = {}) {
  const graph = stampEditedMetadata(authoredSceneGraph, currentSceneGraph, createdAt);
  if (graph.interactions === undefined && currentSceneGraph.interactions !== undefined) {
    graph.interactions = structuredClone(currentSceneGraph.interactions);
  }
  if (graph.motion === undefined && currentSceneGraph.motion !== undefined) {
    graph.motion = structuredClone(currentSceneGraph.motion);
  }
  if (graph.assetManifest && typeof graph.assetManifest === "object") {
    graph.assetManifest.manifestId = currentSceneGraph.assetManifest?.manifestId
      || `assets.${currentSceneGraph.generationId}`;
  }

  const currentAtoms = new Map((currentSceneGraph.contentAtoms || []).map((atom) => [atom.id, atom]));
  for (const atom of graph.contentAtoms || []) {
    const previous = currentAtoms.get(atom.id);
    atom.provenance = previous && sameJson(previous.value, atom.value)
      ? structuredClone(previous.provenance)
      : conservativeContentProvenance();
  }

  const currentAssets = new Map((currentSceneGraph.assetManifest?.assets || []).map((asset) => [asset.id, asset]));
  for (const asset of graph.assetManifest?.assets || []) {
    const previous = currentAssets.get(asset.id);
    const sameSource = previous
      && previous.source?.origin === asset.source?.origin
      && previous.source?.uri === asset.source?.uri;
    if (sameSource) {
      for (const field of ["sourceId", "contentSha256", "licenseRef"]) {
        if (asset.source[field] === undefined && previous.source[field] !== undefined) {
          asset.source[field] = previous.source[field];
        }
      }
      asset.provenance = structuredClone(previous.provenance);
    } else {
      asset.provenance = assetProvenance(graph, asset, selectedVision);
    }
    delete asset.creativeIntent;
    if (asset.source?.origin === "generated" && String(asset.source.uri || "").startsWith("pending://")) {
      asset.source.contentSha256 = "0".repeat(64);
    }
  }
  return pruneDanglingOptionalMetadataRefs(pruneUnrenderedVisibleContent(graph));
}

async function generateImage(apiKey, prompt, fetchImpl) {
  let lastFailure = { status: null, reason: "image-response-empty" };
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetchImpl("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        signal: AbortSignal.timeout(120000),
        body: JSON.stringify({
          model: "gpt-image-1-mini",
          prompt,
          size: "1536x1024",
          quality: "low",
          output_format: "webp",
        }),
      });
      const payload = await response.json().catch(() => ({}));
      const data = payload?.data?.[0]?.b64_json || null;
      if (response.ok && data) return { ok: true, data };
      lastFailure = {
        status: response.status || null,
        reason: String(payload?.error?.code || payload?.error?.type || (response.ok ? "image-response-empty" : "image-request-failed")),
      };
      const retryable = response.status === 408 || response.status === 409 || response.status === 429 || response.status >= 500;
      if (!retryable) break;
    } catch (error) {
      lastFailure = { status: null, reason: error?.name === "TimeoutError" ? "image-timeout" : "image-network-error" };
    }
    if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 750 * (attempt + 1)));
  }
  return { ok: false, ...lastFailure };
}

async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;
  async function run() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => run()));
  return results;
}

async function materializeImages(sceneGraph, options) {
  const graph = structuredClone(sceneGraph);
  const pending = graph.assetManifest.assets.filter((asset) => asset.kind === "image" && String(asset.source?.uri || "").startsWith("pending://"));
  if (!pending.length) return { ok: true, sceneGraph: graph };
  if (!options.imageOutputDir || !options.imagePublicBase) {
    return { ok: false, error: "image-output-not-configured", assetIds: pending.map((asset) => asset.id) };
  }
  if (pending.length > 5) return { ok: false, error: "too-many-generated-images", assetIds: pending.map((asset) => asset.id) };
  fs.mkdirSync(options.imageOutputDir, { recursive: true });
  const generated = await mapWithConcurrency(pending, 2, async (asset) => {
    const prompt = String(asset.provenance?.rationale || "").trim();
    return prompt
      ? generateImage(options.apiKey, prompt + " Fotorealistiskt webbplatsfoto utan text och utan logotyper.", options.fetchImpl)
      : { ok: false, status: null, reason: "image-prompt-missing" };
  });
  const missingIndex = generated.findIndex((result) => !result?.ok);
  if (missingIndex >= 0) {
    const promptMissing = !String(pending[missingIndex].provenance?.rationale || "").trim();
    return {
      ok: false,
      error: promptMissing ? "image-prompt-missing" : "image-generation-failed",
      assetId: pending[missingIndex].id,
      status: generated[missingIndex]?.status || null,
      reason: generated[missingIndex]?.reason || "image-generation-failed",
    };
  }
  for (let index = 0; index < pending.length; index += 1) {
    const asset = pending[index];
    const data = generated[index].data;
    const bytes = Buffer.from(data, "base64");
    const fileName = crypto.randomUUID() + ".webp";
    fs.writeFileSync(path.join(options.imageOutputDir, fileName), bytes);
    asset.mimeType = "image/webp";
    asset.source.uri = options.imagePublicBase.replace(/\/$/, "") + "/" + fileName;
    asset.source.sourceId = "source:image:" + fileName;
    asset.source.contentSha256 = crypto.createHash("sha256").update(bytes).digest("hex");
    asset.intrinsic = { width: 1536, height: 1024, aspectRatio: 1.5 };
  }
  return { ok: true, sceneGraph: graph };
}

function makeResolved(sceneGraph, draft) {
  const profile = sceneGraph.responsive.profiles.find((item) => item.id === draft.profileId);
  return {
    schemaVersion: "2.0",
    generationId: sceneGraph.generationId,
    unresolvedSceneGraphSha256: canonicalSha256(sceneGraph),
    profileId: draft.profileId,
    viewportInlinePx: draft.viewportInlinePx,
    viewportBlockPx: draft.viewportBlockPx,
    appliedResponsiveOperations: structuredClone(profile?.operations || []),
    sacrificedRelationIds: [],
    scenes: structuredClone(draft.scenes),
    resolverDecisionLogArtifactId: `artifact:resolver-log:${sceneGraph.generationId}:${draft.profileId}`,
  };
}

function buildArtifacts(sceneGraph, resolvedProfiles, envelope) {
  const lockedBlueprint = {
    schemaVersion: "2.0",
    blueprintId: `blueprint.${envelope.generationId}`,
    generationId: envelope.generationId,
    createdAt: envelope.createdAt,
    unresolvedSceneGraph: sceneGraph,
    unresolvedSceneGraphSha256: canonicalSha256(sceneGraph),
    assetManifestSha256: canonicalSha256(sceneGraph.assetManifest),
    contractValidationReportArtifactId: `artifact:validation:${envelope.generationId}`,
    resolvedProfiles: resolvedProfiles.map((resolved) => ({
      profileId: resolved.profileId,
      resolvedSceneGraphSha256: canonicalSha256(resolved),
      resolvedSceneGraph: resolved,
    })),
  };
  const manifests = resolvedProfiles.map((resolved) => ({
    schemaVersion: "2.0",
    manifestId: `render.manifest.${envelope.generationId}.${resolved.profileId}`,
    generationId: envelope.generationId,
    createdAt: envelope.createdAt,
    lockedBlueprintArtifactId: `artifact:locked-blueprint:${envelope.generationId}`,
    lockedBlueprintSha256: canonicalSha256(lockedBlueprint),
    resolvedSceneGraphArtifactId: `artifact:resolved-graph:${envelope.generationId}:${resolved.profileId}`,
    resolvedSceneGraphSha256: canonicalSha256(resolved),
    assetManifestSha256: canonicalSha256(sceneGraph.assetManifest),
    viewportProfileId: resolved.profileId,
    orderedSceneIds: resolved.scenes.map((scene) => scene.sceneId),
    orderedNodeIds: resolved.scenes.flatMap((scene) => scene.orderedNodeIds),
  }));
  return { lockedBlueprint, manifests };
}

function compactErrors(errors) {
  // A generated page can legitimately contain dozens of visible nodes across
  // two viewport profiles. Capping this list at 16 hid later conflicts from
  // the repair motor, so a run with e.g. 60 violations could never converge.
  // Keep a defensive ceiling for prompt size, but include a complete normal
  // site in one repair turn.
  return errors.slice(0, 64).map((error) => ({
    code: error.code || null,
    keyword: error.keyword || error.code,
    instancePath: error.instancePath || "",
    sceneId: error.sceneId || null,
    nodeId: error.nodeId || null,
    message: error.message,
    details: error.details || {},
    params: error.params || {},
  }));
}

function hasCompleteSceneSkeleton(sceneGraph) {
  if (!sceneGraph || typeof sceneGraph !== "object") return false;
  if (!Array.isArray(sceneGraph.contentAtoms)) return false;
  if (!sceneGraph.assetManifest || !Array.isArray(sceneGraph.assetManifest.assets)) return false;
  if (!sceneGraph.designLanguage || typeof sceneGraph.designLanguage !== "object") return false;
  if (!sceneGraph.pageFlow || typeof sceneGraph.pageFlow !== "object") return false;
  if (!sceneGraph.responsive || typeof sceneGraph.responsive !== "object") return false;
  if (!Array.isArray(sceneGraph.scenes) || !sceneGraph.scenes.length) return false;
  return sceneGraph.scenes.every((scene) => (
    scene
    && typeof scene === "object"
    && typeof scene.id === "string"
    && typeof scene.experienceRole === "string"
    && typeof scene.narrativePurpose === "string"
    && typeof scene.creativeRationale === "string"
    && typeof scene.energy === "number"
    && typeof scene.density === "number"
    && typeof scene.tempo === "number"
    && Array.isArray(scene.focalSequence)
    && Array.isArray(scene.nodes)
    && Array.isArray(scene.relations)
    && scene.constraints
    && typeof scene.constraints === "object"
    && scene.constraints.minBlock
    && typeof scene.constraints.overflowPolicy === "string"
  ));
}

function pruneUnrenderedVisibleContent(sceneGraph) {
  if (!Array.isArray(sceneGraph?.contentAtoms)) return sceneGraph;
  const referenced = new Set();
  for (const scene of sceneGraph.scenes || []) {
    for (const node of scene.nodes || []) {
      if (node.contentRef) referenced.add(node.contentRef);
      if (node.dataBinding?.sourceContentRef) referenced.add(node.dataBinding.sourceContentRef);
    }
  }
  for (const asset of sceneGraph.assetManifest?.assets || []) {
    if (asset.altContentRef) referenced.add(asset.altContentRef);
  }
  sceneGraph.contentAtoms = sceneGraph.contentAtoms.filter((atom) =>
    atom.kind !== "text" && atom.kind !== "action" || referenced.has(atom.id));
  return sceneGraph;
}

function pruneDanglingOptionalMetadataRefs(sceneGraph) {
  const roles = sceneGraph?.designLanguage?.colorRoles;
  if (Array.isArray(roles)) {
    const knownRoleIds = new Set(roles.map((role) => role?.id).filter(Boolean));
    for (const role of roles) {
      for (const field of ["allowedForegroundRoleIds", "allowedBackgroundRoleIds"]) {
        if (!Array.isArray(role?.[field])) continue;
        role[field] = role[field].filter((id) => knownRoleIds.has(id));
      }
    }
  }
  const knownStyleIds = new Set((sceneGraph?.designLanguage?.styleTokens || []).map((token) => token?.id).filter(Boolean));
  const knownMotifIds = new Set((sceneGraph?.designLanguage?.motifs || []).map((motif) => motif?.id).filter(Boolean));
  for (const motif of sceneGraph?.designLanguage?.motifs || []) {
    if (Array.isArray(motif.styleRoleIds)) {
      motif.styleRoleIds = motif.styleRoleIds.filter((id) => knownStyleIds.has(id));
    }
  }
  for (const initiative of sceneGraph?.designLanguage?.creativeInitiatives || []) {
    if (Array.isArray(initiative.motifIds)) {
      initiative.motifIds = initiative.motifIds.filter((id) => knownMotifIds.has(id));
    }
  }
  for (const scene of sceneGraph?.scenes || []) {
    const nodeIds = new Set((scene.nodes || []).map((node) => node?.id).filter(Boolean));
    if (Array.isArray(scene.focalSequence)) {
      scene.focalSequence = scene.focalSequence.filter((id) => nodeIds.has(id));
    }
    for (const node of scene.nodes || []) {
      if (Array.isArray(node.motifIds)) {
        node.motifIds = node.motifIds.filter((id) => knownMotifIds.has(id));
      }
    }
    for (const transition of [scene.transitionIn, scene.transitionOut]) {
      if (Array.isArray(transition?.sharedMotifIds)) {
        transition.sharedMotifIds = transition.sharedMotifIds.filter((id) => knownMotifIds.has(id));
      }
    }
  }
  return sceneGraph;
}

function validateGeneratedSceneGraph(sceneGraph, options = {}) {
  const contract = validateUnresolvedSceneGraph(sceneGraph);
  const errors = [...(contract.errors || [])];

  const expectedInitialSceneCount = Number.isInteger(options.expectedInitialSceneCount)
    ? options.expectedInitialSceneCount
    : 1;
  if (Array.isArray(sceneGraph?.scenes) && sceneGraph.scenes.length !== expectedInitialSceneCount) {
    errors.push({
      source: "quality",
      keyword: "initialCompositionSceneCount",
      instancePath: "/scenes",
      message: `The first website must be one continuous free scene; received ${sceneGraph.scenes.length}.`,
      params: { expectedScenes: expectedInitialSceneCount, actualScenes: sceneGraph.scenes.length },
    });
  }

  const groupRoles = (sceneGraph?.scenes || []).flatMap((scene) => scene.nodes || [])
    .filter((node) => node?.kind === "group")
    .map((node) => String(node.semanticRole || "").trim().toLowerCase());
  for (const requiredRole of ["hero", "footer"]) {
    if (!groupRoles.includes(requiredRole)) {
      errors.push({
        source: "quality",
        keyword: requiredRole === "hero" ? "mandatoryHero" : "mandatoryFooter",
        instancePath: "/scenes",
        message: `The single free composition must contain a group with semanticRole '${requiredRole}'.`,
        params: { requiredRole },
      });
    }
  }

  const referencedContent = new Set();
  for (const scene of sceneGraph?.scenes || []) {
    for (const node of scene.nodes || []) {
      if (node.contentRef) referencedContent.add(node.contentRef);
      if (node.dataBinding?.sourceContentRef) referencedContent.add(node.dataBinding.sourceContentRef);
    }
  }
  for (const asset of sceneGraph?.assetManifest?.assets || []) {
    if (asset.altContentRef) referencedContent.add(asset.altContentRef);
  }
  for (const atom of sceneGraph?.contentAtoms || []) {
    if ((atom.kind === "text" || atom.kind === "action") && !referencedContent.has(atom.id)) {
      errors.push({
        source: "quality",
        keyword: "unusedVisibleContent",
        instancePath: "/contentAtoms",
        message: `Visible content '${atom.id}' was created but never placed in the visual scene.`,
        params: { contentId: atom.id },
      });
    }
    const value = typeof atom.value === "string" ? atom.value.trim() : "";
    if (/^\d{1,3}$/.test(value) && atom.provenance?.origin !== "briefFact") {
      errors.push({
        source: "quality",
        keyword: "decorativeNumber",
        instancePath: "/contentAtoms",
        message: `Decorative numeric marker '${atom.id}' is not allowed unless it comes from a customer fact.`,
        params: { contentId: atom.id, value },
      });
    }
  }
  return { valid: errors.length === 0, errors };
}

function conflictPairKey(sceneId, nodeA, nodeB) {
  return [String(sceneId), ...[String(nodeA), String(nodeB)].sort()].join("\u0000");
}

async function applyDesignConflictFeedback(sceneGraph, conflicts, options) {
  const overlapConflicts = (conflicts || []).filter((entry) => entry.code === "unauthorized_overlap" && entry.sceneId && entry.nodeId && entry.details?.otherNodeId);
  if (!overlapConflicts.length) {
    return { ok: false, error: "design-feedback-not-applicable" };
  }
  const expected = new Map(overlapConflicts.map((entry) => [
    conflictPairKey(entry.sceneId, entry.nodeId, entry.details.otherNodeId),
    entry,
  ]));
  // The visual decision belongs to the authored scene, not to a viewport.
  // The same pair may therefore be reported by desktop and mobile but must be
  // reviewed exactly once and then apply to both profiles.
  const uniqueOverlapConflicts = [...expected.values()];
  const decisions = [];
  const responseIds = [];
  for (let index = 0; index < uniqueOverlapConflicts.length; index += 10) {
    const batch = uniqueOverlapConflicts.slice(index, index + 10);
    const batchExpected = new Set(batch.map((entry) => conflictPairKey(entry.sceneId, entry.nodeId, entry.details.otherNodeId)));
    const result = await structuredResponse({
      apiKey: String(options.apiKey || "").trim(),
      fetchImpl: options.fetchImpl || fetch,
      model: String(options.model || "gpt-5.6-luna").trim(),
      system: DESIGN_CONFLICT_REVIEW_PROMPT,
      user: "Oföränderlig fri sceneGraph:\n" + JSON.stringify(sceneGraph)
        + "\n\nDetta är en avgränsad grupp. Besluta om exakt vart och ett av dessa nodpar, inga andra:\n"
        + JSON.stringify(compactErrors(batch)),
      schema: DESIGN_CONFLICT_REVIEW_SCHEMA,
      name: `easily_design_conflict_review_${Math.floor(index / 10) + 1}`,
      maxOutputTokens: 5000,
    });
    if (!result.ok) return result;
    const batchDecisions = Array.isArray(result.value?.decisions) ? result.value.decisions : [];
    const batchKeys = batchDecisions.map((decision) => conflictPairKey(decision.sceneId, decision.nodeA, decision.nodeB));
    if (batchDecisions.length !== batchExpected.size
      || new Set(batchKeys).size !== batchExpected.size
      || batchKeys.some((key) => !batchExpected.has(key))) {
      return {
        ok: false,
        error: "design-feedback-incomplete",
        expectedDecisions: batchExpected.size,
        actualDecisions: batchDecisions.length,
        batch: Math.floor(index / 10) + 1,
      };
    }
    decisions.push(...batchDecisions);
    if (result.responseId) responseIds.push(result.responseId);
  }
  if (decisions.length !== expected.size) return { ok: false, error: "design-feedback-incomplete" };

  const reviewed = structuredClone(sceneGraph);
  const seen = new Set();
  let relationIndex = 0;
  const relationIds = new Set(reviewed.scenes.flatMap((scene) => (scene.relations || []).map((relation) => relation.id)));
  for (const decision of decisions) {
    const key = conflictPairKey(decision.sceneId, decision.nodeA, decision.nodeB);
    if (!expected.has(key) || seen.has(key)) return { ok: false, error: "design-feedback-invalid-pair" };
    seen.add(key);
    const scene = reviewed.scenes.find((entry) => entry.id === decision.sceneId);
    if (!scene) return { ok: false, error: "design-feedback-scene-missing" };
    const kind = decision.decision === "authorize_overlap" ? "overlap" : "avoid";
    const pair = [decision.nodeA, decision.nodeB];
    const alreadyAuthored = (scene.relations || []).some((relation) =>
      relation.kind === kind && pair.every((nodeId) => [...(relation.subjects || []), relation.target].includes(nodeId)),
    );
    if (!alreadyAuthored) {
      let relationId;
      do {
        relationIndex += 1;
        relationId = `relation.design_feedback.${relationIndex}`;
      } while (relationIds.has(relationId));
      relationIds.add(relationId);
      scene.relations.push({
        id: relationId,
        kind,
        subjects: pair,
        strength: "required",
        rationale: String(decision.rationale || "Designmotorns beslut efter exakt kompileringskonflikt."),
      });
    }
  }
  if (seen.size !== expected.size) return { ok: false, error: "design-feedback-incomplete" };
  const validation = validateUnresolvedSceneGraph(reviewed);
  if (!validation.valid) return { ok: false, error: "design-feedback-contract", errors: validation.errors };
  return { ok: true, sceneGraph: reviewed, responseIds };
}

function normalizeUnambiguousGeometryNumbers(drafts) {
  const numericText = /^-?(?:\d+(?:\.\d+)?|\.\d+)$/;
  const fields = ["fontSizePx", "lineHeightPx", "letterSpacingPx"];
  const errors = [];
  for (const [profileIndex, profile] of drafts.entries()) {
    for (const [sceneIndex, scene] of (profile.scenes || []).entries()) {
      for (const [nodeIndex, node] of (scene.nodes || []).entries()) {
        if (!node.resolvedTypography) continue;
        for (const field of fields) {
          const value = node.resolvedTypography[field];
          if (typeof value === "number" && Number.isFinite(value)) continue;
          if (typeof value === "string" && numericText.test(value.trim())) {
            node.resolvedTypography[field] = Number(value.trim());
            continue;
          }
          errors.push({
            source: "geometry",
            code: "geometry_numeric_type",
            keyword: "type",
            instancePath: `/profiles/${profileIndex}/scenes/${sceneIndex}/nodes/${nodeIndex}/resolvedTypography/${field}`,
            sceneId: scene.sceneId || null,
            nodeId: node.nodeId || null,
            message: `${field} must be a finite JSON number without a unit.`,
            details: { profileId: profile.profileId, field, actualType: value === null ? "null" : typeof value },
          });
        }
      }
    }
  }
  return errors;
}

async function resolveAndCompileScene(sceneGraph, envelope, options) {
  const fetchImpl = options.fetchImpl || fetch;
  const apiKey = String(options.apiKey || "").trim();
  const model = String(options.model || "gpt-5.6-luna").trim();
  let lastGeometryErrors = [];
  let lastGeometryDrafts = [];
  let lastGeometryResponseId = String(options.initialGeometryResponseId || "");
  const expectedProfiles = sceneGraph.responsive.profiles;
  const expectedProfileIds = new Set(expectedProfiles.map((profile) => profile.id));
  const draftsByProfile = new Map();
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const correction = attempt && lastGeometryErrors.length
      ? "\n\nFöregående geometri kunde inte kompileras. Rätta exakt dessa konflikter utan att omkomponera scenen:\n" + JSON.stringify(compactErrors(lastGeometryErrors))
      : "";
    const initialDrafts = attempt === 0 && Array.isArray(options.initialGeometryDrafts)
      ? structuredClone(options.initialGeometryDrafts)
      : null;
    const missingFromLastCoverage = lastGeometryErrors.length === 1 && lastGeometryErrors[0].code === "viewport_profile_coverage"
      ? expectedProfiles.filter((profile) => !(lastGeometryErrors[0].details?.actual || []).includes(profile.id))
      : [];
    let geometryResults;
    if (initialDrafts) {
      geometryResults = [{ ok: true, value: { profiles: initialDrafts }, responseId: lastGeometryResponseId }];
    } else if (missingFromLastCoverage.length) {
      geometryResults = await Promise.all(missingFromLastCoverage.map((profile) => structuredResponse({
        apiKey, fetchImpl, model,
        system: GEOMETRY_PROMPT,
        user: "Fri visuell sceneGraph (oföränderlig):\n" + JSON.stringify(sceneGraph)
          + "\n\nSkapa geometri för exakt denna enda saknade profil:\n"
          + JSON.stringify({ id: profile.id, query: profile.query, operations: profile.operations })
          + correction,
        schema: geometrySchemaForProfile(profile.id),
        name: "easily_free_scene_geometry_" + profile.id.replace(/[^a-zA-Z0-9_-]/g, "_"),
        maxOutputTokens: 60000,
      })));
    } else {
      const repairExistingGeometry = attempt > 0 && lastGeometryDrafts.length > 0 && lastGeometryErrors.length > 0;
      geometryResults = [await structuredResponse({
        apiKey, fetchImpl, model,
        system: repairExistingGeometry ? GEOMETRY_REPAIR_PROMPT : GEOMETRY_PROMPT,
        user: repairExistingGeometry
          ? "Fri visuell sceneGraph (oföränderlig):\n" + JSON.stringify(sceneGraph)
            + "\n\nBefintlig löst geometri att reparera utan omgenerering:\n" + JSON.stringify({ profiles: lastGeometryDrafts })
            + "\n\nExakta konflikter:\n" + JSON.stringify(compactErrors(lastGeometryErrors))
          : "Fri visuell sceneGraph (oföränderlig):\n" + JSON.stringify(sceneGraph)
            + "\n\nSkapa geometri för exakt dessa profiler:\n"
            + JSON.stringify(expectedProfiles.map((profile) => ({ id: profile.id, query: profile.query, operations: profile.operations })))
            + correction,
        schema: FREE_GEOMETRY_OUTPUT_SCHEMA,
        name: "easily_free_scene_geometry",
        maxOutputTokens: 60000,
      })];
    }
    const failedGeometryResult = geometryResults.find((result) => !result.ok);
    if (failedGeometryResult) return failedGeometryResult;
    if (!missingFromLastCoverage.length) draftsByProfile.clear();
    for (const result of geometryResults) {
      if (result.responseId) lastGeometryResponseId = result.responseId;
      for (const draft of result.value.profiles || []) {
        if (expectedProfileIds.has(draft.profileId)) draftsByProfile.set(draft.profileId, draft);
      }
    }
    const drafts = expectedProfiles.map((profile) => draftsByProfile.get(profile.id)).filter(Boolean);
    lastGeometryDrafts = structuredClone(drafts);
    const actualProfileIds = new Set(drafts.map((profile) => profile.profileId));
    if (expectedProfileIds.size !== actualProfileIds.size || [...expectedProfileIds].some((id) => !actualProfileIds.has(id))) {
      lastGeometryErrors = [issueForGeometry("viewport_profile_coverage", "Geometry must resolve every authored viewport profile exactly once.", { expected: [...expectedProfileIds], actual: [...actualProfileIds] })];
      continue;
    }

    const numericTypeErrors = normalizeUnambiguousGeometryNumbers(drafts);
    lastGeometryDrafts = structuredClone(drafts);
    if (numericTypeErrors.length) {
      lastGeometryErrors = numericTypeErrors;
      continue;
    }

    const resolvedProfiles = drafts.map((draft) => makeResolved(sceneGraph, draft));
    const invalidResolved = resolvedProfiles.flatMap((resolved) => {
      const result = validateResolvedSceneGraph(resolved, { sceneGraph });
      return result.valid ? [] : result.errors;
    });
    if (invalidResolved.length) {
      lastGeometryErrors = invalidResolved;
      continue;
    }

    const { lockedBlueprint, manifests } = buildArtifacts(sceneGraph, resolvedProfiles, envelope);
    const compiledProfiles = resolvedProfiles.map((resolved, index) => ({
      profileId: resolved.profileId,
      query: structuredClone(sceneGraph.responsive.profiles.find((profile) => profile.id === resolved.profileId)?.query || {}),
      viewportInlinePx: resolved.viewportInlinePx,
      viewportBlockPx: resolved.viewportBlockPx,
      result: compileLayout({ lockedBlueprint, resolvedSceneGraph: resolved, renderManifest: manifests[index] }),
    }));
    const failed = compiledProfiles.filter((profile) => !profile.result.ok);
    if (failed.length) {
      lastGeometryErrors = failed.flatMap((profile) => profile.result.conflicts.map((entry) => ({ ...entry, profileId: profile.profileId })));
      // An overlap is an aesthetic decision. Stop geometry retries immediately
      // and return the exact conflict to the free visual design motor.
      if (lastGeometryErrors.some((entry) => entry.code === "unauthorized_overlap")) break;
      continue;
    }

    return {
      ok: true,
      lockedBlueprint,
      resolvedProfiles,
      renderManifests: manifests,
      compiledProfiles: compiledProfiles.map((profile) => ({ ...profile, ...profile.result, result: undefined })),
      geometryResponseId: lastGeometryResponseId,
    };
  }
  return {
    ok: false,
    error: "layout-compilation-conflict",
    conflicts: lastGeometryErrors,
    feedback: {
      target: "free-visual-design-engine",
      instruction: "Resolve the exact reported scene conflict without replacing or recomposing the design.",
      conflicts: lastGeometryErrors,
    },
    geometryDrafts: lastGeometryDrafts,
    geometryResponseId: lastGeometryResponseId,
  };
}

async function resolveWithDesignFeedback(sceneGraph, envelope, options) {
  let reviewedGraph = sceneGraph;
  const designConflictResponseIds = [];
  let preservedGeometryDrafts;
  let preservedGeometryResponseId = "";
  let compiled;
  for (let round = 0; round <= 3; round += 1) {
    compiled = await resolveAndCompileScene(reviewedGraph, envelope, {
      ...options,
      initialGeometryDrafts: preservedGeometryDrafts,
      initialGeometryResponseId: preservedGeometryResponseId,
    });
    if (compiled.ok) {
      return { ok: true, sceneGraph: reviewedGraph, compiled, designConflictResponseIds };
    }
    if (compiled.error !== "layout-compilation-conflict") return compiled;
    // Three design-feedback rounds are allowed, but every accepted round must
    // be followed by a real compilation attempt before returning its result.
    if (round === 3) {
      const { geometryDrafts: _drafts, ...publicFailure } = compiled;
      return publicFailure;
    }
    const reviewed = await applyDesignConflictFeedback(reviewedGraph, compiled.conflicts, options);
    if (!reviewed.ok) {
      const { geometryDrafts: _drafts, ...publicFailure } = compiled;
      return {
        ...publicFailure,
        designFeedbackError: reviewed.error,
        designFeedbackDetails: {
          expectedDecisions: reviewed.expectedDecisions || null,
          actualDecisions: reviewed.actualDecisions || null,
          batch: reviewed.batch || null,
        },
      };
    }
    reviewedGraph = reviewed.sceneGraph;
    preservedGeometryDrafts = compiled.geometryDrafts;
    preservedGeometryResponseId = compiled.geometryResponseId || preservedGeometryResponseId;
    designConflictResponseIds.push(...(reviewed.responseIds || []));
  }
  return compiled;
}

export async function generateFreeSceneSite(creativeBrief, options = {}) {
  const apiKey = String(options.apiKey || "").trim();
  if (!apiKey) return { ok: false, error: "openai-not-configured" };
  if (!creativeBrief || typeof creativeBrief !== "object") return { ok: false, error: "invalid-creative-brief" };
  const fetchImpl = options.fetchImpl || fetch;
  const model = String(options.model || "gpt-5.6-luna").trim();
  const generationId = "gen_" + crypto.randomUUID().replaceAll("-", "");
  const createdAt = new Date().toISOString();
  const envelope = {
    generationId,
    createdAt,
    briefSha256: canonicalSha256(creativeBrief),
    briefArtifactId: `artifact:brief:${generationId}`,
    visionArtifactId: `artifact:vision:${generationId}`,
    compositionArtifactId: `artifact:composition:${generationId}`,
  };
  const diagnostics = [];
  const fail = (stage, result) => ({
    ...result,
    ok: false,
    generationId,
    failureStage: stage,
    diagnostics,
  });

  const visionResult = await structuredResponse({
    apiKey, fetchImpl, model,
    system: VISION_PROMPT,
    user: "Creative Brief:\n" + JSON.stringify(creativeBrief),
    schema: FREE_CREATIVE_VISION_SCHEMA,
    name: "easily_free_creative_vision",
    maxOutputTokens: 6000,
  });
  if (!visionResult.ok) return fail("creative-vision", visionResult);
  diagnostics.push({ stage: "creative-vision", ok: true, responseId: visionResult.responseId || "" });
  const vision = visionResult.value;
  const selectedVision = vision.candidates?.[vision.selectedIndex];
  if (!selectedVision
      || !String(selectedVision.designWorld || "").trim()
      || !Array.isArray(selectedVision.signatureDetails)
      || selectedVision.signatureDetails.length < 4
      || !Array.isArray(selectedVision.differentiationAxes)
      || selectedVision.differentiationAxes.length < 6) {
    return fail("creative-vision-quality", { error: "creative-vision-quality" });
  }

  let sceneGraph;
  let graphValidation;
  let sceneResponseId = "";
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const needsContractRepair = attempt > 0
      && hasCompleteSceneSkeleton(sceneGraph)
      && graphValidation
      && !graphValidation.valid
      && graphValidation.errors.every((error) => error.source !== "quality");
    const correction = attempt && graphValidation && !graphValidation.valid && !needsContractRepair
      ? "\n\nFöregående svar var inte en fullständig V2 sceneGraph. Skapa samma valda designriktning på nytt som en komplett graf. Svaret måste vara exakt ett objekt med nyckeln sceneGraph. sceneGraph måste innehålla contentAtoms, assetManifest, designLanguage, pageFlow, scenes och responsive. Varje scen måste innehålla id, experienceRole, narrativePurpose, creativeRationale, energy, density, tempo, focalSequence, nodes, relations och constraints med minBlock samt overflowPolicy. Utelämna aldrig obligatoriska delar. Vid unusedVisibleContent: placera exakt contentId som contentRef i en passande synlig nod, eller ta bort atomen om den är överflödig. Exakta fel från föregående svar:\n" + JSON.stringify(compactErrors(graphValidation.errors))
      : "";
    const sceneResult = await structuredResponse({
      apiKey, fetchImpl, model,
      system: needsContractRepair ? SCENE_CONTRACT_REPAIR_PROMPT : SCENE_PROMPT,
      user: needsContractRepair
        ? "Befintlig fri sceneGraph (bevara):\n" + JSON.stringify(sceneGraph)
          + "\n\nExakta kontraktsfel att reparera:\n" + JSON.stringify(compactErrors(graphValidation.errors))
        : "Server envelope (kopiera exakt):\n" + JSON.stringify(envelope)
          + "\n\nCreative Brief:\n" + JSON.stringify(creativeBrief)
          + "\n\nVald kreativ riktning:\n" + JSON.stringify(selectedVision)
          + "\n\nUtförandemandat:\n" + String(vision.executionMandate || "")
          + correction,
      schema: FREE_INITIAL_SCENE_OUTPUT_SCHEMA,
      name: "easily_free_visual_scene",
      maxOutputTokens: 60000,
    });
    if (!sceneResult.ok) {
      diagnostics.push({ stage: "free-visual-scene", attempt: attempt + 1, ok: false, error: sceneResult.error, status: sceneResult.status || null });
      return fail("free-visual-scene", sceneResult);
    }
    const candidateGraph = assembleInitialSceneGraph(sceneResult.value?.sceneGraph, {
      envelope,
      selectedVision,
    });
    const candidateValidation = validateGeneratedSceneGraph(candidateGraph, options);
    diagnostics.push({
      stage: needsContractRepair ? "scene-contract-repair" : "free-visual-scene",
      attempt: attempt + 1,
      ok: candidateValidation.valid,
      completeSkeleton: hasCompleteSceneSkeleton(candidateGraph),
      responseId: sceneResult.responseId || "",
      errors: compactErrors(candidateValidation.errors || []),
    });
    const preserveRepairTarget = needsContractRepair
      && !hasCompleteSceneSkeleton(candidateGraph)
      && hasCompleteSceneSkeleton(sceneGraph);
    sceneResponseId = sceneResult.responseId;
    if (!preserveRepairTarget) {
      sceneGraph = candidateGraph;
      graphValidation = candidateValidation;
    }
    if (graphValidation.valid) break;
  }
  if (!graphValidation?.valid) return fail("free-scene-contract", { error: "free-scene-contract", errors: graphValidation?.errors || [] });

  const images = await materializeImages(sceneGraph, { ...options, apiKey, fetchImpl });
  if (!images.ok) return fail("image-materialization", images);
  sceneGraph = images.sceneGraph;
  graphValidation = validateGeneratedSceneGraph(sceneGraph, options);
  if (!graphValidation.valid) return fail("free-scene-after-images", { error: "free-scene-after-images", errors: graphValidation.errors });

  const resolution = await resolveWithDesignFeedback(sceneGraph, envelope, { ...options, apiKey, fetchImpl, model });
  if (!resolution.ok) return fail("geometry-and-layout", resolution);
  sceneGraph = resolution.sceneGraph;
  const compiled = resolution.compiled;
  return {
    ok: true,
    engineVersion: "v2",
    model,
    generationId,
    diagnostics,
    creativeVision: vision,
    sceneGraph,
    lockedBlueprint: compiled.lockedBlueprint,
    resolvedProfiles: compiled.resolvedProfiles,
    renderManifests: compiled.renderManifests,
    compiledProfiles: compiled.compiledProfiles,
    responseIds: {
      vision: visionResult.responseId,
      scene: sceneResponseId,
      designConflict: resolution.designConflictResponseIds,
      geometry: compiled.geometryResponseId,
    },
  };
}

export async function editFreeSceneSite(input, options = {}) {
  const apiKey = String(options.apiKey || "").trim();
  const instruction = String(input?.instruction || "").trim();
  const currentSceneGraph = input?.sceneGraph;
  if (!apiKey) return { ok: false, error: "openai-not-configured" };
  if (!instruction) return { ok: false, error: "edit-instruction-required" };
  const currentValidation = validateUnresolvedSceneGraph(currentSceneGraph);
  if (!currentValidation.valid) return { ok: false, error: "invalid-current-scene", errors: currentValidation.errors };

  const fetchImpl = options.fetchImpl || fetch;
  const model = String(options.model || "gpt-5.6-luna").trim();
  const createdAt = new Date().toISOString();
  let sceneGraph;
  let graphValidation;
  let editResponseId = "";
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const correction = attempt && graphValidation && !graphValidation.valid
      ? "\n\nFöregående ändring bröt scenkontraktet. Rätta endast dessa fel och behåll samma webbplats:\n" + JSON.stringify(compactErrors(graphValidation.errors))
      : "";
    const editResult = await structuredResponse({
      apiKey, fetchImpl, model,
      system: SCENE_EDIT_PROMPT,
      user: "Creative Brief:\n" + JSON.stringify(input?.creativeBrief || {})
        + "\n\nBefintlig fri sceneGraph:\n" + JSON.stringify(currentSceneGraph)
        + "\n\nAnvändarens ändring:\n" + instruction
        + correction,
      schema: FREE_EDIT_SCENE_OUTPUT_SCHEMA,
      name: "easily_free_scene_edit",
      maxOutputTokens: 30000,
    });
    if (!editResult.ok) return editResult;
    editResponseId = editResult.responseId;
    sceneGraph = assembleEditedSceneGraph(editResult.value?.sceneGraph, currentSceneGraph, { createdAt });
    graphValidation = validateUnresolvedSceneGraph(sceneGraph);
    if (graphValidation.valid) break;
  }
  if (!graphValidation?.valid) return { ok: false, error: "free-scene-edit-contract", errors: graphValidation?.errors || [] };

  const images = await materializeImages(sceneGraph, { ...options, apiKey, fetchImpl });
  if (!images.ok) return images;
  sceneGraph = images.sceneGraph;
  graphValidation = validateUnresolvedSceneGraph(sceneGraph);
  if (!graphValidation.valid) return { ok: false, error: "free-scene-edit-after-images", errors: graphValidation.errors };

  const envelope = { generationId: currentSceneGraph.generationId, createdAt };
  const resolution = await resolveWithDesignFeedback(sceneGraph, envelope, { ...options, apiKey, fetchImpl, model });
  if (!resolution.ok) return resolution;
  sceneGraph = resolution.sceneGraph;
  const compiled = resolution.compiled;
  return {
    ok: true,
    engineVersion: "v2",
    model,
    generationId: currentSceneGraph.generationId,
    sceneGraph,
    lockedBlueprint: compiled.lockedBlueprint,
    resolvedProfiles: compiled.resolvedProfiles,
    renderManifests: compiled.renderManifests,
    compiledProfiles: compiled.compiledProfiles,
    responseIds: { edit: editResponseId, designConflict: resolution.designConflictResponseIds, geometry: compiled.geometryResponseId },
  };
}

export function replaceFreeSceneContent(input) {
  const currentSceneGraph = input?.sceneGraph;
  const contentId = String(input?.contentId || "").trim();
  const currentValidation = validateUnresolvedSceneGraph(currentSceneGraph);
  if (!currentValidation.valid) return { ok: false, error: "invalid-current-scene", errors: currentValidation.errors };
  const currentAtom = currentSceneGraph.contentAtoms.find((atom) => atom.id === contentId);
  if (!currentAtom) return { ok: false, error: "content-atom-not-found", contentId };
  if (currentAtom.kind !== "text" && currentAtom.kind !== "action") {
    return { ok: false, error: "content-atom-not-editable", contentId };
  }

  const sceneGraph = structuredClone(currentSceneGraph);
  const atom = sceneGraph.contentAtoms.find((entry) => entry.id === contentId);
  if (typeof atom.value === "string" || typeof atom.value === "number") {
    atom.value = String(input?.value ?? "");
  } else if (atom.value && typeof atom.value === "object") {
    const key = Object.hasOwn(atom.value, "label") ? "label" : Object.hasOwn(atom.value, "text") ? "text" : "value";
    atom.value[key] = String(input?.value ?? "");
  } else {
    atom.value = String(input?.value ?? "");
  }
  const createdAt = new Date().toISOString();
  const stamped = stampEditedMetadata(sceneGraph, currentSceneGraph, createdAt);
  const validation = validateUnresolvedSceneGraph(stamped);
  if (!validation.valid) return { ok: false, error: "free-scene-content-contract", errors: validation.errors };

  const sourceResolved = Array.isArray(input?.resolvedProfiles) ? input.resolvedProfiles : [];
  if (!sourceResolved.length) return { ok: false, error: "resolved-profiles-required" };
  const unresolvedHash = canonicalSha256(stamped);
  const resolvedProfiles = sourceResolved.map((resolved) => ({
    ...structuredClone(resolved),
    generationId: stamped.generationId,
    unresolvedSceneGraphSha256: unresolvedHash,
  }));
  const invalidResolved = resolvedProfiles.flatMap((resolved) => {
    const result = validateResolvedSceneGraph(resolved, { sceneGraph: stamped });
    return result.valid ? [] : result.errors;
  });
  if (invalidResolved.length) return { ok: false, error: "resolved-scene-content-conflict", errors: invalidResolved };

  const envelope = { generationId: stamped.generationId, createdAt };
  const { lockedBlueprint, manifests } = buildArtifacts(stamped, resolvedProfiles, envelope);
  const compiledProfiles = resolvedProfiles.map((resolved, index) => {
    const result = compileLayout({ lockedBlueprint, resolvedSceneGraph: resolved, renderManifest: manifests[index] });
    return {
      profileId: resolved.profileId,
      query: structuredClone(stamped.responsive.profiles.find((profile) => profile.id === resolved.profileId)?.query || {}),
      viewportInlinePx: resolved.viewportInlinePx,
      viewportBlockPx: resolved.viewportBlockPx,
      ...result,
    };
  });
  const conflicts = compiledProfiles.filter((profile) => !profile.ok).flatMap((profile) =>
    (profile.conflicts || []).map((conflict) => ({ ...conflict, profileId: profile.profileId })),
  );
  if (conflicts.length) return { ok: false, error: "layout-compilation-conflict", conflicts };
  return {
    ok: true,
    engineVersion: "v2",
    generationId: stamped.generationId,
    sceneGraph: stamped,
    lockedBlueprint,
    resolvedProfiles,
    renderManifests: manifests,
    compiledProfiles,
  };
}

function issueForGeometry(code, message, details) {
  return { code, message, details, instancePath: "" };
}
