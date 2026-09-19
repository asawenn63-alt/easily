import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  V2_SCHEMA,
  canonicalSha256,
  selectViewportProfile,
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
          dominantGesture: { type: "string" },
          spatialChoreography: {
            type: "array",
            items: { type: "string" },
          },
          riskCommitments: {
            type: "array",
            items: { type: "string" },
          },
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
          "name", "thesis", "semanticReading", "compositionIdea", "dominantGesture", "spatialChoreography",
          "riskCommitments", "designWorld", "typographyDirection",
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

function representativeViewportForProfile(sceneGraph, profile) {
  const profiles = sceneGraph.responsive?.profiles || [];
  const query = profile.query || {};
  const preferredInline = profile.id === sceneGraph.responsive?.baseProfileId
    ? [1440, 1280, 1024, 900, 768]
    : [390, 430, 600, 768, 900, 1024];
  const preferredBlock = [900, 844, 800, 1024, 720, 667];
  const inlineCandidates = new Set(preferredInline);
  const blockCandidates = new Set(preferredBlock);
  const addBoundaryCandidates = (target, value) => {
    if (!Number.isFinite(value)) return;
    target.add(value);
    if (value > 1) target.add(value - 1);
    target.add(value + 1);
  };
  for (const candidateProfile of profiles) {
    addBoundaryCandidates(inlineCandidates, candidateProfile.query?.minInlinePx);
    addBoundaryCandidates(inlineCandidates, candidateProfile.query?.maxInlinePx);
    addBoundaryCandidates(blockCandidates, candidateProfile.query?.minBlockPx);
    addBoundaryCandidates(blockCandidates, candidateProfile.query?.maxBlockPx);
  }
  if (Number.isFinite(query.minInlinePx) && Number.isFinite(query.maxInlinePx)) {
    inlineCandidates.add((query.minInlinePx + query.maxInlinePx) / 2);
  }
  if (Number.isFinite(query.minBlockPx) && Number.isFinite(query.maxBlockPx)) {
    blockCandidates.add((query.minBlockPx + query.maxBlockPx) / 2);
  }
  for (const inlinePx of inlineCandidates) {
    if (!Number.isFinite(inlinePx) || inlinePx <= 0) continue;
    for (const blockPx of blockCandidates) {
      if (!Number.isFinite(blockPx) || blockPx <= 0) continue;
      try {
        if (selectViewportProfile(sceneGraph, inlinePx, blockPx)?.id === profile.id) {
          return { inlinePx, blockPx };
        }
      } catch {
        // Ambiguous candidates are invalid representatives; keep searching.
      }
    }
  }
  const clampToQuery = (value, min, max) => Math.min(
    Number.isFinite(max) ? max : Number.POSITIVE_INFINITY,
    Math.max(Number.isFinite(min) ? min : 1, value),
  );
  return {
    inlinePx: clampToQuery(profile.id === sceneGraph.responsive?.baseProfileId ? 1440 : 390, query.minInlinePx, query.maxInlinePx),
    blockPx: clampToQuery(900, query.minBlockPx, query.maxBlockPx),
  };
}

function geometrySchemaForProfile(sceneGraph, profile) {
  const schema = structuredClone(FREE_GEOMETRY_OUTPUT_SCHEMA);
  const viewport = representativeViewportForProfile(sceneGraph, profile);
  schema.properties.profiles.minItems = 1;
  schema.properties.profiles.maxItems = 1;
  schema.properties.profiles.items.properties.profileId = { type: "string", const: profile.id };
  schema.properties.profiles.items.properties.viewportInlinePx = { type: "number", const: viewport.inlinePx };
  schema.properties.profiles.items.properties.viewportBlockPx = { type: "number", const: viewport.blockPx };
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

Du bygger inte en webbsida. Tänk som en erfaren grafisk designer och art director i komposition, typografi, bildvärld, material, rytm, detaljer och blickföring.

Utgå från Creative Brief och besluta en fri sidlång visuell berättelse. Kundens innehåll får påverka kompositionens rytm, kapitel och blickföring, men får aldrig översättas till en färdig sektionsmall eller en förutbestämd sektionsordning.

Varje kandidat måste vara en egen designvärld, formulerad som en konkret byggbeskrivning — inte en etikett. För varje kandidat, ange:
- En dominerande materialitet eller textur (exempelvis borstad metall, grovt papper, polerad sten, siden, rå betong).
- En ljussättning (exempelvis skarp sidoljus, mjuk diffus dager, backlight-silhuett, varm golden hour, kallt blänk).
- Ett rumsligt arketypp som kompositionens ryggrad: poster, magasinsuppslag, utställningsvägg, filmstille, produktkatalog, arkitekturenitt, collage, diptik, triptyk, asymmetriskt uppslag. Beskriv den konkreta spatiala arrangementet, inte en adjektiv.
- En färgdominansstrategi: en dominant färg med minst 50 % täckning, en accentfärg med högst 15 % täckning, och hur förgrund och bakgrund förhåller sig. Undvik trygga neutrala fallbacks (beige, sagegrön) när briefen inte kräver dem. Standardläget är modigt: välj den starkaste relevanta idén, inte den tryggaste.
- En typografiparering: ange en display-/rubrikfamilj och en brödtextfamilj, en skala mellan rubrik och brödtext på minst 3:1, och en viktkontraststrategi. Acceptera aldrig "oversized serif hero + letter-spaced uppercase eyebrow + italic accent word" som den enda typografiska idén — det är en autopilot-stereotyp, inte en riktning.
- En bildvärld: ange fotografisk stil (editorial, dokumentär, arkitektonisk, still-life, miljöporträtt, makrodetalj), ljussättning, färgbehandling, och hur bilder relaterar rumsligt till kompositionen (fullblek, infälld, överlappande, beskuren detalj, bakgrundslager, collage).

Kandidaterna måste skilja sig på minst sex konkreta axlar bland komposition, skala, typografi, rytm, densitet, bildspråk, former, materialitet, negativ yta, kontrast, navigationsuttryck och detaljering. En ny palett på samma uppbyggnad räknas inte som en ny riktning. Varje kandidat ska beskriva sin dominantGesture som en konkret spatial handling (exempelvis "asymmetrisk 60/40-delning där bilden överlappar texten", "fullblek poster-hero som övergår i infällt redaktionellt rutnät"), sin spatialChoreography som en blickföringssekvens genom 3–5 brännpunkter, och de synliga riskCommitments som hör till designidén. Varje riktning ska avvisa den mest väntade branschkonventionen och innehålla minst fyra synliga hantverksdetaljer — varje detalj ska vara en konkret, icke-generisk craft-beslut (exempelvis "bildbeskärningar följer 3:4-porträttformat upprepat som rytmiskt motiv", "sektionsövergångar använder en 2px hårlinje i accentfärgen"), inte vagheter som "subtila skuggor" eller "rundade hörn". Använd aldrig dekorativa ordningsnummer, katalognummer eller stegnummer om kunden inte själv har lämnat sådana uppgifter. Hitta aldrig på affärsfakta.`;

const SCENE_PROMPT = `Du är Easilys fria visuella designmotor. Skapa en fullständig V2 sceneGraph från Creative Brief och den valda kreativa riktningen.

Arbeta endast med grafens visuella primitiv: group, text, media, shape, action, input, icon och repeat. Formge med visuella relationer: contain, anchor, align, flow, distribute, size, aspect, overlap, layer, avoid, clip, cropFocus, balance och visibility.

Den fria scenen är den enda auktoriteten för designen. Beskriv varje visuellt beslut, inklusive responsiva beslut, i grafen. Den första webbplatsen ska vara exakt EN sammanhängande, sidlång visuell scen. Mellan Hero och Footer får du skapa valfritt många visuella grupper, kapitel, band, bildfält, pauser, collage, övergångar och berättande områden. De är fria kompositionsbeslut och får inte hämtas från ett sektionsbibliotek, en mall eller ett färdigt layoutrecept. Entré, berättelse, erbjudande, bildmaterial och avslut ska vävas ihop i samma komposition och dela ett medvetet visuellt system.

KOMPOSITIONSPRINCIPER — följ dessa aktivt:
- Skala: Använd dramatiska storleksskillnader. Minst ett element i scenen ska vara 3–5× större än omgivande brödtext för att skapa en tydlig visuell hierarki.
- Densitet: Växla mellan informationsrika kluster och glesa, andningsytiga områden. En sida med enhetlig densitet överallt är en platt sida.
- Rytm: Variera avståndet mellan grupperna meningsfullt — vissa täta kluster, vissa stora luckor — så att sidan får rytm istället för ett monotont avstånd.
- Asymmetri: Undvik att centrera allt. Förskjut nyckelelement för att skapa visuell spänning och rörelse i kompositionen.
- Breddanvändning: Använd hela viewportbredden selektivt. Vissa grupper fullblek, vissa infällda med generösa marginaler, vissa asymmetriskt förskjutna. Enhetlig fullbredd i varje grupp ger en tråkig stapel.
- Rummelig lagring: Använd overlap- och layer-relationer för att skapa djup. Bild kan överlappa text, en shape kan ligga bakom en grupp, ett element kan bryta in i en annans zon.
- Blickföring: Skapa en tydlig focalSequence genom 3–5 brännpunkter. Ögat ska röra sig genom sidan, inte svepa en enhetlig stapel.

TYPOGRAFIHIERARKI:
- Använd minst två distinkta typografiska roller med en skala på minst 2.5:1 mellan rubrik och brödtext.
- Använd typografipareringen från den valda riktningen. Låt display-/rubrikfamiljen och brödtextfamiljen arbeta tillsammans med tydlig viktkontrast.
- Använd line-height som ett rytmverktyg: täta rader i rubriker, avslappnad radavstånd i brödtext.
- Undvik en enda typsnittsfamilj utan skala- eller viktkontrast. Undvik autopilot-stereotypen "letter-spaced uppercase eyebrow + oversized serif headline + italic accent word" som enda typografiska grepp.

BILDSTRATEGI:
- Variera bildernas skala och rumsliga roll: minst en dominerande bild och minst en mindre detalj- eller stödbild.
- Använd fullblek, överlappande, beskuren och infälld bildbehandling. Undvik mönstret "en hero-bild sedan enbart textgrupper".
- Låt bildernas placering följa kompositionens spatiala arketypp, inte en enhetlig vertikal stapel.
- Beskriv varje bilds fotografiska stil och ljussättning i creativeIntent så att bildgenereringen får stark visuell riktning.

FÄRGHIERARKI:
- Tilldela en dominant färg (minst 50 % täckning), en accentfärg (högst 15 % täckning) och tydliga förgrunds-/bakgrundsroller i designLanguage.
- Paletten ska vara intentionell och engagerad, inte en trygg neutral fallback. Beige, sagegrön eller ofärgad neutral som standard när briefen inte kräver det är ett misslyckande, inte en säkerhet.

UNDVIK Dessa AUTOPILATMMÖNSTER:
- Alla grupper centrerade och fullbredda, staplade vertikalt.
- Enhetligt padding mellan alla grupper.
- En hero-bild, sedan enbart textsektioner.
- En enda typsnittsfamilj utan skala- eller viktkontrast.
- Beige/sagegrön/neutral palett som standard när ingen färg specificerats.
- "Letter-spaced uppercase eyebrow + oversized serif headline + italic accent word" som enda typografiska grepp.

Utgå från den valda riktningens dominantGesture, spatialChoreography och riskCommitments. Låt kompositionens grupperingar, rytm, pauser och övergångar följa verksamhetens berättelse och den valda designvärlden. Använd rik variation i skala, densitet, rytm och bildbehandling för att skapa en visuell hierarki. Varje variation ska ha ett kompositionellt syfte.

Hero och footer ska alltid finnas som tydliga grupper i den enda sidlånga kompositionen. Sätt gruppernas semanticRole till exakt "hero" respektive "footer" så att kravet kan valideras. De är inte fristående sektioner eller mallar.

Om Creative Brief innehåller customerFacts.requestedContent anger valda id vilket innehåll webbplatsen behöver, inte hur sidan ska delas upp: about betyder Om oss, services betyder Tjänster, gallery betyder Galleri och contact betyder Kontakt. Innehållet får kombineras, delas, återkomma eller fördelas mellan flera visuella kapitel när det stärker berättelsen. Varje valt innehåll ska gestaltas meningsfullt och får inte reduceras till en ensam etikett endast för att markera att det finns. En visuell grupp är inte legacy på grund av sitt innehåll eller namn. Välj eller återskapa aldrig färdiga sektionstyper, sektionsvarianter, komponentmallar, legacy-ID:n eller en förutbestämd ordning som Hero, Om oss, Tjänster, Galleri, Kontakt. Varje nod får ha exakt en visuell förälder. Saknat faktaunderlag får inte ersättas med påhittade uppgifter.

Den valda designvärlden måste synas i komposition, skala, typografi, rytm, densitet, bildvärld, former, kontrast och signaturdetaljer. Färger ensamma får aldrig bära riktningen. Varje synlig text- eller action-atom du skapar måste placeras i scenen. I varje relation måste subjects och target vara id:n för noder som finns i scenens nodes. Ett scene-id får aldrig användas som relationstarget; använd scenens root group-nod när något ska förankras mot hela scenytan. Skapa aldrig dekorativa ordningsnummer, katalognummer eller stegnummer. Skapa endast innehåll som kan härledas ur briefen; okända affärsfakta ska utelämnas. Håll tekniska rationaler korta, högst 40 ord, så att hela scenen alltid ryms i svaret.

Gör en slutkontroll före svaret: varje contentAtom med kind text eller action måste förekomma som contentRef i minst en synlig nod. Om en sådan atom inte hör till kompositionen ska den inte finnas i contentAtoms.

Alla genererade bildassets ska använda source.origin "generated" och source.uri som börjar med "pending://". Lägg den exakta fotografiska bildprompten i assetens creativeIntent. Bilden får inte innehålla text eller logotyper. Servern, inte du, ansvarar för hashes, manifest-id:n, versionsfält och provenance.

Responsive måste innehålla minst två icke överlappande profiler: en baseProfile för dator och en högre prioriterad mobilprofil. Båda ska bevara samma scener, innehåll och designidé; mobilprofilen får endast uttrycka nödvändiga responsiva operationer.

Första versionen ska inte innehålla interactions eller motion. Femfrågeflödet bygger först en stabil visuell sida; interaktion och rörelse läggs till senare endast på en uttrycklig användarinstruktion.`;

const GEOMETRY_PROMPT = `Du är Easilys geometrimotor. Du får inte designa om den fria scenen.

Översätt exakt de befintliga scenerna, noderna och relationerna till pixelmått för varje efterfrågad viewportprofil. Skapa aldrig nya noder, ta aldrig bort noder och ändra aldrig ordning, typ, innehåll, färg, typografiroll, gruppering eller överlappningsavsikt. Varje authored node ska förekomma exakt en gång i sin scen.

Alla synliga noder måste ligga helt inom scenens bounds. Text och actions måste ha resolvedTypography från sin redan valda typographyRoleId. Beräkna textrutans höjd för hela den verkliga texten efter radbrytning; ingen text får rinna ut ur sin ruta. Två visuella lövnoder får endast överlappa om grafen uttryckligen innehåller en overlap- eller layer-relation mellan dem. En authored layer-relation ska bevaras exakt. Scenens y-positioner ska bilda en sammanhängande vertikal sida. Om grafens required-relationer är olösliga ska du inte hitta på en ersättningsdesign.`;

const GEOMETRY_REPAIR_PROMPT = `Du är Easilys geometrireparationsmotor. Du får inte designa om eller generera om geometrin.

Du får den oföränderliga fria sceneGraphen, den senast lösta geometrin och exakta tekniska konflikter. Returnera samma profiler, scener, noder och ordning. Ändra endast bounds, visible, zIndex eller resolvedTypography för de konfliktberörda noderna och minsta nödvändiga närliggande noder.

Vid text_box_overflow ska hela verkliga texten få plats utan beskärning. Vid node_outside_scene ska noden ligga helt inom samma scen. Vid authored_avoid_violated eller text_collision ska objekten hållas läsbart isär. Vid authored_aspect_violated ska den berörda nodens bounds följa exakt den redan angivna required aspect-relationen; för 3:4 är width/height 0.75. Vid composition_linear_stack ska de angivna innehållsmarkörerna fördelas över minst två tydligt skilda horisontella axlar inom scenens redan beslutade komposition. Vid geometry_numeric_type ska endast det angivna resolvedTypography-fältet rättas till ett JSON-tal utan enhet, sträng eller objekt. Bevara alla uttryckliga layer- och overlap-relationer exakt. Flytta inte orelaterat innehåll och skapa inga nya visuella beslut.`;

const DESIGN_CONFLICT_REVIEW_PROMPT = `Du är Easilys fria visuella designmotor och får tillbaka exakta kompileringskonflikter.

Du får inte skapa, ersätta eller omkomponera layouten. För varje rapporterad unauthorized_overlap ska du endast avgöra om överlappningen redan följer scenens kreativa avsikt eller om objekten enligt scenen måste hållas isär. Svara authorize_overlap när en form är scenens avsedda bakgrund eller när överlappningen är ett annat avsiktligt visuellt lager; detta uttrycker designbeslutet som en ny overlap-relation. Två textbärande objekt får aldrig överlappa varandra; rubrik, brödtext, knapp och inmatning ska alltid hållas läsbart åtskilda. Svara annars keep_separate. Varje konflikt ska få exakt ett beslut och inga andra nodpar får läggas till.`;

const SCENE_EDIT_PROMPT = `Du är Easilys fria visuella scenredigerare. Ändra den befintliga V2-scenen enligt användarens instruktion.

Detta är samma webbplats, inte en nygenerering. Bevara generationId, alla opåverkade scener, noder, relationer, innehållsatomer, assets, designroller och deras id:n exakt. Ändra endast det som krävs av instruktionen. Nya visuella objekt får endast uttryckas med group, text, media, shape, action, input, icon och repeat. Du känner inte till komponenter, sektionstyper, varianter, mallar eller färdiga grids.

Du får ändra kompositionen endast när användaren uttryckligen ber om en visuell eller strukturell ändring. Om användaren bara ändrar text ska geometrin och designen förbli orörd. I relationer får subjects och target endast referera till noder i samma scen, aldrig till scene-id:t; använd scenens root group-nod som scenyta. Genererade nya bildassets ska använda source.origin "generated", pending:// och en exakt bildprompt i creativeIntent. Servern äger hashes, versionsfält och provenance. Hitta aldrig på affärsfakta.`;

const SCENE_CONTRACT_REPAIR_PROMPT = `Du är Easilys kontraktsreparationsmotor, inte en designer.

Du får en befintlig fri sceneGraph och exakta kontraktsfel. Gör minsta möjliga tekniska ändring som gör grafen giltig. Bevara designidé, scener, komposition, innehåll, visuella roller, assets och responsiva beslut. Skapa inte en ny graf från briefen.

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
    console.warn("[free-scene-ai] openai-unreachable:", error?.message || String(error));
    return { ok: false, error: "openai-unreachable" };
  }
  if (!upstream.ok) {
    let upstreamError = null;
    try { upstreamError = await upstream.json(); } catch { /* malformed upstream error */ }
    var _detail = String(upstreamError?.error?.message || "OpenAI rejected the request.");
    console.warn("[free-scene-ai] openai-error:", _detail, "code:", String(upstreamError?.error?.code || ""));
    return {
      ok: false,
      error: upstream.status === 401 ? "openai-invalid-key" : "openai-error",
      status: upstream.status,
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
  const imageWorld = compactPromptPart(selectedVision?.imageWorld, 280);
  const altText = assetAltText(graph, asset);
  const sceneCtx = assetSceneContext(graph, asset?.id);
  const spatialRole = compactPromptPart(asset?.spatialRole || asset?.compositionRole, 200);
  const photoStyle = compactPromptPart(selectedVision?.photographicStyle, 200);
  const lighting = compactPromptPart(selectedVision?.lighting, 160);
  const colorTreatment = compactPromptPart(selectedVision?.colorTreatment, 160);
  const parts = [
    imageWorld,
    photoStyle,
    lighting,
    colorTreatment,
    spatialRole,
    altText,
    sceneCtx,
  ].filter(Boolean);
  if (parts.length) return parts.join(". ");
  const fallbackWorld = imageWorld || "Fotografisk webbplatsbild i vald designvärld";
  return `${fallbackWorld}. Bilden ska vara fotorealistisk, utan text och utan logotyper, och passa det visuella objektet ${String(asset?.id || "utan namn")}.`;
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

function completePendingImageMetadata(asset) {
  if (asset?.kind !== "image"
      || asset?.source?.origin !== "generated"
      || !String(asset.source.uri || "").startsWith("pending://")) return;
  // The materializer below always requests this exact output size. These are
  // therefore transport facts, not dimensions chosen by the compiler.
  asset.intrinsic = {
    ...(asset.intrinsic && typeof asset.intrinsic === "object" ? asset.intrinsic : {}),
    width: 1536,
    height: 1024,
    aspectRatio: 1.5,
  };
}

function normalizeInitialTransportMetadata(graph) {
  if (Array.isArray(graph?.responsive?.profiles)) {
    // A primitive value cannot express a responsive design decision. Removing
    // it is contract sanitation; every authored profile object is preserved.
    graph.responsive.profiles = graph.responsive.profiles.filter((profile) =>
      profile && typeof profile === "object" && !Array.isArray(profile));
  }
  for (const asset of graph?.assetManifest?.assets || []) {
    if (asset?.kind !== "image" || asset?.source?.origin !== "generated" || !asset.id) continue;
    // The model owns creativeIntent, while the server owns the temporary
    // transport URI. A path-form URI stays valid for every encoded asset id.
    asset.source.uri = `pending:///${encodeURIComponent(String(asset.id))}`;
  }
}

function completeNeutralCropSafeRegions(graph) {
  for (const profile of graph?.responsive?.profiles || []) {
    for (const operation of profile.operations || []) {
      const cropIntent = operation?.op === "setCropIntent"
        ? operation.cropIntent
        : operation?.op === "setConstraint" ? operation.override?.cropIntent : null;
      if (cropIntent && !cropIntent.safeRegion) {
        // A full-frame safe region adds no crop preference; it only completes
        // the technical contract for an otherwise authored crop operation.
        cropIntent.safeRegion = { x: 0, y: 0, width: 1, height: 1 };
      }
    }
  }
}

/**
 * Turns the free motor's authored scene into the persisted V2 graph. This may
 * add or remove technical metadata, but never nodes, relations, colors,
 * typography, scene order, or any other aesthetic decision.
 */
export function assembleInitialSceneGraph(authoredSceneGraph, { envelope, selectedVision } = {}) {
  const graph = stampServerMetadata(authoredSceneGraph, envelope);
  normalizeInitialTransportMetadata(graph);
  if (graph.assetManifest && typeof graph.assetManifest === "object") {
    graph.assetManifest.manifestId = `assets.${envelope.generationId}`;
  }
  for (const atom of graph.contentAtoms || []) {
    atom.provenance = conservativeContentProvenance();
  }
  for (const asset of graph.assetManifest?.assets || []) {
    completePendingImageMetadata(asset);
    asset.provenance = assetProvenance(graph, asset, selectedVision);
    delete asset.creativeIntent;
    if (asset.source?.origin === "generated" && String(asset.source.uri || "").startsWith("pending://")) {
      asset.source.contentSha256 = "0".repeat(64);
    }
  }
  completeNeutralCropSafeRegions(graph);
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

function additionContractErrors(sceneGraph, currentSceneGraph, editContext) {
  if (editContext?.type !== "add") return [];
  const errors = [];
  const kind = String(editContext.kind || "").trim();
  const currentSceneIds = new Set((currentSceneGraph.scenes || []).map((scene) => scene.id));
  const addedScenes = (sceneGraph.scenes || []).filter((scene) => !currentSceneIds.has(scene.id));
  if (addedScenes.length !== 1) {
    errors.push({
      source: "add-contract",
      keyword: "oneAddedScene",
      instancePath: "/scenes",
      message: `Add must create exactly one new visual scene; received ${addedScenes.length}.`,
      params: { kind, addedSceneIds: addedScenes.map((scene) => scene.id) },
    });
    return errors;
  }

  const existingScenes = new Map((sceneGraph.scenes || []).map((scene) => [scene.id, scene]));
  for (const currentScene of currentSceneGraph.scenes || []) {
    if (!sameJson(existingScenes.get(currentScene.id), currentScene)) {
      errors.push({
        source: "add-contract",
        keyword: "existingSceneChanged",
        instancePath: `/scenes/${currentScene.id}`,
        message: `Existing scene '${currentScene.id}' must remain byte-for-byte unchanged during Add.`,
        params: { sceneId: currentScene.id },
      });
    }
  }
  for (const field of ["contentAtoms", "designLanguage"]) {
    const before = currentSceneGraph[field];
    const after = sceneGraph[field];
    if (field === "contentAtoms") {
      const afterById = new Map((after || []).map((entry) => [entry.id, entry]));
      for (const entry of before || []) {
        if (!sameJson(afterById.get(entry.id), entry)) {
          errors.push({ source: "add-contract", keyword: "existingContentChanged", instancePath: `/contentAtoms/${entry.id}`, message: `Existing content '${entry.id}' must remain unchanged during Add.`, params: { contentId: entry.id } });
        }
      }
    } else if (!sameJson(before, after)) {
      errors.push({ source: "add-contract", keyword: "designLanguageChanged", instancePath: "/designLanguage", message: "The existing design language must remain unchanged during Add.", params: {} });
    }
  }
  const currentAssets = new Map((currentSceneGraph.assetManifest?.assets || []).map((asset) => [asset.id, asset]));
  const nextAssets = new Map((sceneGraph.assetManifest?.assets || []).map((asset) => [asset.id, asset]));
  for (const [assetId, asset] of currentAssets) {
    if (!sameJson(nextAssets.get(assetId), asset)) {
      errors.push({ source: "add-contract", keyword: "existingAssetChanged", instancePath: `/assetManifest/assets/${assetId}`, message: `Existing asset '${assetId}' must remain unchanged during Add.`, params: { assetId } });
    }
  }

  if (kind !== "campaign") {
    const addedScene = addedScenes[0];
    const mediaNodes = (addedScene.nodes || []).filter((node) => node.kind === "media" && node.assetRef);
    if (mediaNodes.length !== 3) {
      errors.push({
        source: "add-contract",
        keyword: "threePortraitImages",
        instancePath: `/scenes/${addedScene.id}/nodes`,
        message: `Every Add choice except campaign must start with exactly three media images; received ${mediaNodes.length}.`,
        params: { sceneId: addedScene.id, count: mediaNodes.length },
      });
    }
    const assetIds = new Set(mediaNodes.map((node) => node.assetRef));
    if (assetIds.size !== mediaNodes.length) {
      errors.push({ source: "add-contract", keyword: "independentImageAssets", instancePath: `/scenes/${addedScene.id}/nodes`, message: "Each portrait image must use its own independent asset.", params: { sceneId: addedScene.id } });
    }
    for (const node of mediaNodes) {
      const aspect = (addedScene.relations || []).find((relation) =>
        relation.kind === "aspect"
        && relation.strength === "required"
        && (relation.subjects || []).includes(node.id)
        && relation.value?.unit === "ratio"
        && Math.abs(Number(relation.value.value) - 0.75) < 0.001
      );
      if (!aspect) {
        errors.push({
          source: "add-contract",
          keyword: "portraitThreeByFour",
          instancePath: `/scenes/${addedScene.id}/nodes/${node.id}`,
          message: `Media node '${node.id}' must have its own required aspect relation with value 0.75 ratio (3:4).`,
          params: { sceneId: addedScene.id, nodeId: node.id },
        });
      }
    }
  }
  return errors;
}

function extensionContractErrors(sceneGraph, currentSceneGraph, editContext) {
  if (editContext?.type !== "extend") return [];
  const errors = [];
  const sceneId = String(editContext.sceneId || "").trim();
  const expectedCount = Math.max(3, Number(editContext.imageCount) || 3);
  const target = (sceneGraph.scenes || []).find((scene) => scene.id === sceneId);
  if (!target) {
    return [{ source: "add-contract", keyword: "extensionSceneMissing", instancePath: "/scenes", message: `The scene '${sceneId}' to extend is missing.`, params: { sceneId } }];
  }
  const beforeIds = new Set((currentSceneGraph.scenes || []).map((scene) => scene.id));
  const afterIds = new Set((sceneGraph.scenes || []).map((scene) => scene.id));
  if (beforeIds.size !== afterIds.size || [...beforeIds].some((id) => !afterIds.has(id))) {
    errors.push({ source: "add-contract", keyword: "extensionSceneSetChanged", instancePath: "/scenes", message: "Extending images must not add or remove scenes.", params: { sceneId } });
  }
  for (const before of currentSceneGraph.scenes || []) {
    if (before.id === sceneId) continue;
    const after = (sceneGraph.scenes || []).find((scene) => scene.id === before.id);
    if (!sameJson(before, after)) {
      errors.push({ source: "add-contract", keyword: "unrelatedSceneChanged", instancePath: `/scenes/${before.id}`, message: `Unrelated scene '${before.id}' must remain unchanged.`, params: { sceneId: before.id } });
    }
  }
  const mediaNodes = (target.nodes || []).filter((node) => node.kind === "media" && node.assetRef);
  if (mediaNodes.length !== expectedCount) {
    errors.push({ source: "add-contract", keyword: "extensionImageCount", instancePath: `/scenes/${sceneId}/nodes`, message: `The extended scene must contain exactly ${expectedCount} portrait images; received ${mediaNodes.length}.`, params: { sceneId, expectedCount, count: mediaNodes.length } });
  }
  for (const node of mediaNodes) {
    const aspect = (target.relations || []).find((relation) =>
      relation.kind === "aspect"
      && relation.strength === "required"
      && (relation.subjects || []).includes(node.id)
      && relation.value?.unit === "ratio"
      && Math.abs(Number(relation.value.value) - 0.75) < 0.001
    );
    if (!aspect) {
      errors.push({ source: "add-contract", keyword: "portraitThreeByFour", instancePath: `/scenes/${sceneId}/nodes/${node.id}`, message: `Media node '${node.id}' must have a required 0.75 ratio aspect relation.`, params: { sceneId, nodeId: node.id } });
    }
  }
  return errors;
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

async function generateImage(apiKey, prompt, fetchImpl, size = "1536x1024") {
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
          size,
          quality: "medium",
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
  const selectedVision = options.selectedVision;
  const pending = graph.assetManifest.assets.filter((asset) => asset.kind === "image" && String(asset.source?.uri || "").startsWith("pending://"));
  if (!pending.length) return { ok: true, sceneGraph: graph };
  if (!options.imageOutputDir || !options.imagePublicBase) {
    return { ok: false, error: "image-output-not-configured", assetIds: pending.map((asset) => asset.id) };
  }
  fs.mkdirSync(options.imageOutputDir, { recursive: true });
  const portraitAssetIds = new Set();
  for (const scene of graph.scenes || []) {
    const nodes = new Map((scene.nodes || []).map((node) => [node.id, node]));
    for (const relation of scene.relations || []) {
      if (relation.kind !== "aspect" || relation.value?.unit !== "ratio" || Number(relation.value.value) >= 1) continue;
      for (const nodeId of relation.subjects || []) {
        const assetRef = nodes.get(nodeId)?.assetRef;
        if (assetRef) portraitAssetIds.add(assetRef);
      }
    }
  }
  const visionWorld = compactPromptPart(selectedVision?.imageWorld, 200);
  const visionSuffix = visionWorld
    ? ` Fotorealistisk bild i ${visionWorld}. Ingen text, inga logotyper.`
    : " Fotorealistisk webbplatsbild. Ingen text, inga logotyper.";
  const generated = await mapWithConcurrency(pending, 2, async (asset) => {
    const prompt = String(asset.provenance?.rationale || "").trim();
    return prompt
      ? generateImage(
          options.apiKey,
          prompt + visionSuffix,
          options.fetchImpl,
          portraitAssetIds.has(asset.id) ? "1024x1536" : "1536x1024",
        )
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
    const portrait = portraitAssetIds.has(asset.id);
    asset.intrinsic = portrait
      ? { width: 1024, height: 1536, aspectRatio: 1024 / 1536 }
      : { width: 1536, height: 1024, aspectRatio: 1.5 };
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

const REPAIR_OBJECT_REPLACEMENTS = new Set([
  "visual", "intrinsic", "cropIntent", "safeRegion", "focalPoint", "override", "query", "constraints",
]);
const REPAIR_RESTORABLE_ID_ARRAYS = new Set([
  "contentAtoms", "assets", "colorRoles", "typographyRoles", "styleTokens", "motifs", "creativeInitiatives",
]);
const REPAIR_REPLACE_ITEMS_BY_ID_ARRAYS = new Set(["relations"]);

function mergeContractRepair(base, fragment, key = "") {
  if (fragment === undefined) return structuredClone(base);
  if (fragment === null || typeof fragment !== "object") return structuredClone(fragment);
  if (Array.isArray(fragment)) {
    if (!Array.isArray(base)) return structuredClone(fragment);
    const identified = fragment.every((item) => item && typeof item === "object" && !Array.isArray(item) && item.id);
    if (!identified) return structuredClone(fragment);
    const byId = new Map(base.map((item, index) => [item?.id, index]));
    const merged = structuredClone(base);
    for (const item of fragment) {
      const index = byId.get(item.id);
      // Contract repair may update existing authored objects, never introduce
      // a new visual object into the scene. A technical/content object pruned
      // only because of the reported bad reference may be restored by id.
      // Relations are replaced as complete schema objects. Recursively merging
      // them would preserve the very additional property that the repair was
      // asked to remove.
      if (index !== undefined) {
        merged[index] = REPAIR_REPLACE_ITEMS_BY_ID_ARRAYS.has(key)
          ? structuredClone(item)
          : mergeContractRepair(merged[index], item);
      }
      else if (REPAIR_RESTORABLE_ID_ARRAYS.has(key)) merged.push(structuredClone(item));
    }
    return merged;
  }
  if (!base || typeof base !== "object" || Array.isArray(base) || REPAIR_OBJECT_REPLACEMENTS.has(key)) {
    return structuredClone(fragment);
  }
  const patch = fragment.repair && typeof fragment.repair === "object" && !Array.isArray(fragment.repair)
    ? { ...fragment, ...fragment.repair }
    : fragment;
  const merged = structuredClone(base);
  for (const [childKey, value] of Object.entries(patch)) {
    if (childKey === "repair") continue;
    merged[childKey] = mergeContractRepair(merged[childKey], value, childKey);
  }
  return merged;
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

  const requestedContent = new Set(
    (Array.isArray(options.requestedContent) ? options.requestedContent : ["about", "services", "gallery", "contact"])
      .map((value) => String(value || "").trim().toLowerCase())
      .filter(Boolean),
  );
  const categoryPatterns = new Map([
    ["about", /(?:^|[_\-.\s])(about|om[-_\s]?oss)(?:$|[_\-.\s])/i],
    ["services", /(?:^|[_\-.\s])(services?|tjanster|tjänster)(?:$|[_\-.\s])/i],
    ["gallery", /(?:^|[_\-.\s])(gallery|galleri)(?:$|[_\-.\s])/i],
    ["contact", /(?:^|[_\-.\s])(contact|kontakt)(?:$|[_\-.\s])/i],
  ]);
  const contentAtoms = new Map((sceneGraph?.contentAtoms || []).map((atom) => [atom.id, atom]));
  const categoryForNode = (node) => {
    if (!node) return null;
    const atom = contentAtoms.get(node.contentRef);
    const value = typeof atom?.value === "string"
      ? atom.value
      : atom?.value && typeof atom.value === "object" ? JSON.stringify(atom.value) : "";
    const identity = `${node.id || ""} ${node.semanticRole || ""} ${node.contentRef || ""} ${value}`;
    for (const [category, pattern] of categoryPatterns) {
      if (requestedContent.has(category) && pattern.test(identity)) return category;
    }
    return null;
  };

  const presentRequestedContent = new Set();
  for (const scene of sceneGraph?.scenes || []) {
    for (const node of scene.nodes || []) {
      const category = categoryForNode(node);
      if (category) presentRequestedContent.add(category);
    }
  }
  for (const category of requestedContent) {
    if (!categoryPatterns.has(category) || presentRequestedContent.has(category)) continue;
    errors.push({
      source: "quality",
      keyword: "requestedContentMissing",
      instancePath: "/scenes",
      message: `Creative Brief requested '${category}', but no visible content atom for it exists in the free composition.`,
      params: { category },
    });
  }

  for (const scene of sceneGraph?.scenes || []) {
    const nodes = new Map((scene.nodes || []).map((node) => [node.id, node]));
    const parents = new Map();
    for (const group of scene.nodes || []) {
      if (group.kind !== "group") continue;
      for (const childId of group.children || []) {
        if (!parents.has(childId)) parents.set(childId, []);
        parents.get(childId).push(group.id);
      }
    }
    for (const [nodeId, parentIds] of parents) {
      if (new Set(parentIds).size <= 1) continue;
      errors.push({
        source: "quality",
        keyword: "multipleVisualParents",
        instancePath: `/scenes/${scene.id}/nodes/${nodeId}`,
        message: `Node '${nodeId}' has several visual parents (${[...new Set(parentIds)].join(", ")}). Every node must occupy one authored place in the composition.`,
        params: { sceneId: scene.id, nodeId, parentIds: [...new Set(parentIds)] },
      });
    }

    // Group names and composition flow are authored design decisions. The
    // validator checks graph integrity here, not whether a composition looks
    // too much or too little like a traditional section layout.
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

function validateResolvedCompositionFreedom(sceneGraph, resolvedSceneGraph, options = {}) {
  if (String(options.designCourage || "bold") === "safe") return [];
  const requested = new Set(
    (Array.isArray(options.requestedContent) ? options.requestedContent : ["about", "services", "gallery", "contact"])
      .map((value) => String(value || "").trim().toLowerCase()),
  );
  const patterns = new Map([
    ["about", /(?:^|[_\-.\s])(about|om[-_\s]?oss)(?:$|[_\-.\s])/i],
    ["services", /(?:^|[_\-.\s])(services?|tjanster|tjänster)(?:$|[_\-.\s])/i],
    ["gallery", /(?:^|[_\-.\s])(gallery|galleri)(?:$|[_\-.\s])/i],
    ["contact", /(?:^|[_\-.\s])(contact|kontakt)(?:$|[_\-.\s])/i],
  ]);
  const atoms = new Map((sceneGraph.contentAtoms || []).map((atom) => [atom.id, atom]));
  const categoryForNode = (node) => {
    const atom = atoms.get(node?.contentRef);
    const value = typeof atom?.value === "string" ? atom.value : "";
    const identity = `${node?.id || ""} ${node?.semanticRole || ""} ${node?.contentRef || ""} ${value}`;
    for (const [category, pattern] of patterns) {
      if (requested.has(category) && pattern.test(identity)) return category;
    }
    return null;
  };
  const issues = [];
  const authoredScenes = new Map((sceneGraph.scenes || []).map((scene) => [scene.id, scene]));
  for (const resolvedScene of resolvedSceneGraph.scenes || []) {
    const authored = authoredScenes.get(resolvedScene.sceneId);
    if (!authored) continue;
    const resolvedNodes = new Map((resolvedScene.nodes || []).map((node) => [node.nodeId, node]));
    const markers = new Map();
    for (const node of authored.nodes || []) {
      const category = categoryForNode(node);
      const resolved = resolvedNodes.get(node.id);
      if (!category || !resolved?.visible || !resolved.bounds) continue;
      const current = markers.get(category);
      const atomText = String(atoms.get(node.contentRef)?.value || "").trim().toLowerCase();
      const isLabel = patterns.get(category)?.test(atomText) && atomText.length < 20;
      if (!current || isLabel) markers.set(category, { nodeId: node.id, bounds: resolved.bounds, isLabel });
    }
    const points = [...markers.entries()].map(([category, entry]) => ({
      category,
      nodeId: entry.nodeId,
      x: entry.bounds.x + entry.bounds.width / 2,
      y: entry.bounds.y + entry.bounds.height / 2,
      width: entry.bounds.width,
    }));
    if (points.length < 3) continue;
    const xValues = points.map((point) => point.x);
    const yValues = points.map((point) => point.y);
    const xSpread = Math.max(...xValues) - Math.min(...xValues);
    const ySpread = Math.max(...yValues) - Math.min(...yValues);
    const viewportWidth = Number(resolvedSceneGraph.viewportInlinePx) || Number(resolvedScene.bounds?.width) || 1;
    const viewportHeight = Number(resolvedSceneGraph.viewportBlockPx) || Number(resolvedScene.bounds?.height) || 1;
    if (xSpread <= viewportWidth * 0.08 && ySpread >= viewportHeight * 0.22) {
      issues.push({
        source: "quality",
        keyword: "linearContentStack",
        code: "composition_linear_stack",
        instancePath: `/scenes/${resolvedScene.sceneId}/nodes`,
        sceneId: resolvedScene.sceneId,
        nodeId: points[0].nodeId,
        message: "Requested content markers form one vertical section stack instead of a bold spatial composition.",
        details: { categories: points.map((point) => point.category), nodeIds: points.map((point) => point.nodeId), xSpread, ySpread },
      });
    }
  }
  return issues;
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
      model: String(options.model || "gpt-4o").trim(),
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

function authoredFontSizePx(size, draft, field = "preferred") {
  if (!size || !Number.isFinite(size[field])) return null;
  const value = Number(size[field]);
  switch (size.unit) {
    case "px": return value;
    case "rem": return value * 16;
    case "vw": return value * Number(draft.viewportInlinePx) / 100;
    case "vh": return value * Number(draft.viewportBlockPx) / 100;
    case "%": return value * 16 / 100;
    case "ratio":
    case "fr": return value * 16;
    default: return null;
  }
}

function authoredContentText(node, contentById) {
  const value = node.contentRef ? contentById.get(node.contentRef)?.value : "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (value && typeof value === "object") return String(value.label ?? value.text ?? value.value ?? "");
  return "";
}

function estimatedResolvedTextHeight(text, width, fontSizePx, lineHeightPx, letterSpacingPx) {
  if (!text || !Number.isFinite(width) || width <= 0) return 0;
  const averageGlyphWidth = Math.max(1, fontSizePx * 0.46 + Math.max(0, letterSpacingPx));
  const charactersPerLine = Math.max(1, Math.floor(width / averageGlyphWidth));
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
  return lines * lineHeightPx * 0.95;
}

function fittingAuthoredFontSizePx(role, draft, authoredNode, resolvedNode, contentById) {
  const preferred = authoredFontSizePx(role?.size, draft, "preferred");
  const minimum = authoredFontSizePx(role?.size, draft, "min");
  if (!Number.isFinite(preferred) || !Number.isFinite(minimum)) return preferred;
  const lower = Math.min(minimum, preferred);
  const upper = Math.max(minimum, preferred);
  const text = authoredContentText(authoredNode, contentById);
  const lineHeightRatio = Number(role.lineHeight);
  const letterSpacingPx = Number(role.letterSpacing) || 0;
  const fits = (fontSizePx) => {
    const lineHeightPx = fontSizePx * lineHeightRatio;
    const requiredHeight = estimatedResolvedTextHeight(text, resolvedNode.bounds?.width, fontSizePx, lineHeightPx, letterSpacingPx);
    const tolerance = Math.max(2, lineHeightPx * 0.25);
    return requiredHeight <= Number(resolvedNode.bounds?.height) + tolerance;
  };
  if (fits(upper)) return upper;
  if (!fits(lower)) return lower;
  let low = lower;
  let high = upper;
  for (let index = 0; index < 16; index += 1) {
    const middle = (low + high) / 2;
    if (fits(middle)) low = middle;
    else high = middle;
  }
  return low;
}

function completeAuthoredTypography(sceneGraph, drafts) {
  const roles = new Map((sceneGraph.designLanguage?.typographyRoles || []).map((role) => [role.id, role]));
  const contentById = new Map((sceneGraph.contentAtoms || []).map((atom) => [atom.id, atom]));
  const authoredScenes = new Map((sceneGraph.scenes || []).map((scene) => [scene.id, scene]));
  for (const draft of drafts) {
    for (const resolvedScene of draft.scenes || []) {
      const authoredNodes = new Map((authoredScenes.get(resolvedScene.sceneId)?.nodes || []).map((node) => [node.id, node]));
      for (const resolvedNode of resolvedScene.nodes || []) {
        if (resolvedNode.resolvedTypography) continue;
        const authoredNode = authoredNodes.get(resolvedNode.nodeId);
        if (!authoredNode || !["text", "action", "input"].includes(authoredNode.kind)) continue;
        const roleId = authoredNode.visual?.typographyRoleId;
        const role = roles.get(roleId);
        const fontSizePx = fittingAuthoredFontSizePx(role, draft, authoredNode, resolvedNode, contentById);
        if (!role || !Number.isFinite(fontSizePx) || fontSizePx <= 0) continue;
        resolvedNode.resolvedTypography = {
          roleId,
          fontSizePx,
          lineHeightPx: fontSizePx * Number(role.lineHeight),
          letterSpacingPx: Number(role.letterSpacing) || 0,
        };
      }
    }
  }
}

function mergeGeometryRepair(baseDrafts, fragmentDrafts) {
  const fragmentsByProfile = new Map((fragmentDrafts || []).map((profile) => [profile.profileId, profile]));
  return structuredClone(baseDrafts || []).map((baseProfile) => {
    const fragmentProfile = fragmentsByProfile.get(baseProfile.profileId);
    if (!fragmentProfile) return baseProfile;
    const fragmentScenes = new Map((fragmentProfile.scenes || []).map((scene) => [scene.sceneId, scene]));
    const mergedScenes = (baseProfile.scenes || []).map((baseScene) => {
      const fragmentScene = fragmentScenes.get(baseScene.sceneId);
      if (!fragmentScene) return baseScene;
      const fragmentNodes = new Map((fragmentScene.nodes || []).map((node) => [node.nodeId, node]));
      return {
        ...baseScene,
        ...Object.fromEntries(Object.entries(fragmentScene).filter(([key]) => key !== "nodes")),
        nodes: (baseScene.nodes || []).map((baseNode) => {
          const fragmentNode = fragmentNodes.get(baseNode.nodeId);
          return fragmentNode ? { ...baseNode, ...fragmentNode } : baseNode;
        }),
      };
    });
    return {
      ...baseProfile,
      ...Object.fromEntries(Object.entries(fragmentProfile).filter(([key]) => key !== "scenes")),
      scenes: mergedScenes,
    };
  });
}

async function resolveAndCompileScene(sceneGraph, options) {
  const fetchImpl = options.fetchImpl || fetch;
  const apiKey = String(options.apiKey || "").trim();
  const model = String(options.model || "gpt-4o").trim();
  let lastGeometryErrors = [];
  let lastGeometryDrafts = [];
  let lastGeometryResponseId = String(options.initialGeometryResponseId || "");
  const expectedProfiles = sceneGraph.responsive.profiles;
  const expectedProfileIds = new Set(expectedProfiles.map((profile) => profile.id));
  const draftsByProfile = new Map();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const correction = attempt && lastGeometryErrors.length
      ? "\n\nFöregående geometri kunde inte kompileras. Rätta exakt dessa konflikter utan att omkomponera scenen:\n" + JSON.stringify(compactErrors(lastGeometryErrors))
      : "";
    const initialDrafts = attempt === 0 && Array.isArray(options.initialGeometryDrafts)
      ? structuredClone(options.initialGeometryDrafts)
      : null;
    const missingFromLastCoverage = lastGeometryErrors.length === 1 && lastGeometryErrors[0].code === "viewport_profile_coverage"
      ? expectedProfiles.filter((profile) => !(lastGeometryErrors[0].details?.actual || []).includes(profile.id))
      : [];
    const profilesNeedingFullResolution = new Set(lastGeometryErrors
      // A schema-invalid resolved profile is structurally incomplete. Merging
      // a repair into it can never restore a missing scenes/nodes collection,
      // because mergeGeometryRepair intentionally preserves the base shape.
      // Resolve that one profile again in full; reserve minimal merge repair
      // for valid structures with concrete bounds/typography conflicts.
      .filter((error) => error.profileId
        && (["resolvedNodes", "resolvedSceneOrder"].includes(error.keyword) || error.source === "schema"))
      .map((error) => error.profileId));
    const regenerateProfiles = expectedProfiles.filter((profile) => profilesNeedingFullResolution.has(profile.id));
    const repairExistingGeometry = !missingFromLastCoverage.length
      && !regenerateProfiles.length
      && attempt > 0
      && lastGeometryDrafts.length > 0
      && lastGeometryErrors.length > 0;
    let geometryResults;
    if (initialDrafts) {
      geometryResults = [{ ok: true, value: { profiles: initialDrafts }, responseId: lastGeometryResponseId }];
    } else if (missingFromLastCoverage.length || regenerateProfiles.length || !repairExistingGeometry) {
      const profilesToResolve = missingFromLastCoverage.length
        ? missingFromLastCoverage
        : regenerateProfiles.length
          ? regenerateProfiles
          : expectedProfiles;
      geometryResults = await Promise.all(profilesToResolve.map((profile) => structuredResponse({
        apiKey, fetchImpl, model,
        system: GEOMETRY_PROMPT,
        user: "Fri visuell sceneGraph (oföränderlig):\n" + JSON.stringify(sceneGraph)
          + "\n\nSkapa geometri för exakt denna enda profil:\n"
          + JSON.stringify({ id: profile.id, query: profile.query, operations: profile.operations })
          + correction,
        schema: geometrySchemaForProfile(sceneGraph, profile),
        name: "easily_free_scene_geometry_" + profile.id.replace(/[^a-zA-Z0-9_-]/g, "_"),
        maxOutputTokens: 60000,
      })));
    } else {
      const affectedIds = new Set(lastGeometryErrors.map((error) => error.profileId).filter(Boolean));
      const profilesToRepair = expectedProfiles.filter((profile) => !affectedIds.size || affectedIds.has(profile.id));
      geometryResults = await Promise.all(profilesToRepair.map((profile) => structuredResponse({
        apiKey, fetchImpl, model,
        system: GEOMETRY_REPAIR_PROMPT,
        user: "Fri visuell sceneGraph (oföränderlig):\n" + JSON.stringify(sceneGraph)
          + "\n\nBefintlig löst geometri för exakt denna profil:\n"
          + JSON.stringify({ profiles: lastGeometryDrafts.filter((draft) => draft.profileId === profile.id) })
          + "\n\nExakta konflikter för profilen:\n"
          + JSON.stringify(compactErrors(lastGeometryErrors.filter((error) => !error.profileId || error.profileId === profile.id))),
        schema: geometrySchemaForProfile(sceneGraph, profile),
        name: "easily_free_scene_geometry_repair_" + profile.id.replace(/[^a-zA-Z0-9_-]/g, "_"),
        maxOutputTokens: 60000,
      })));
    }
    const failedGeometryResult = geometryResults.find((result) => !result.ok);
    if (failedGeometryResult) return failedGeometryResult;
    if (!missingFromLastCoverage.length && !regenerateProfiles.length) draftsByProfile.clear();
    for (const result of geometryResults) {
      if (result.responseId) lastGeometryResponseId = result.responseId;
    }
    const returnedDrafts = geometryResults.flatMap((result) => result.value.profiles || []);
    const draftsToStore = repairExistingGeometry
      ? mergeGeometryRepair(lastGeometryDrafts, returnedDrafts)
      : returnedDrafts;
    for (const draft of draftsToStore) {
      if (expectedProfileIds.has(draft.profileId)) draftsByProfile.set(draft.profileId, draft);
    }
    const drafts = expectedProfiles.map((profile) => draftsByProfile.get(profile.id)).filter(Boolean);
    // Structured output runs non-strict because the V2 schema deliberately has
    // optional primitive fields. Therefore the model can still return viewport
    // metadata outside the profile it was asked to resolve. The server owns this
    // technical sampling coordinate: bind it deterministically to the authored
    // profile before validation without changing any scene or node geometry.
    for (const draft of drafts) {
      const profile = expectedProfiles.find((candidate) => candidate.id === draft.profileId);
      if (!profile) continue;
      const viewport = representativeViewportForProfile(sceneGraph, profile);
      draft.viewportInlinePx = viewport.inlinePx;
      draft.viewportBlockPx = viewport.blockPx;
    }
    lastGeometryDrafts = structuredClone(drafts);
    const actualProfileIds = new Set(drafts.map((profile) => profile.profileId));
    if (expectedProfileIds.size !== actualProfileIds.size || [...expectedProfileIds].some((id) => !actualProfileIds.has(id))) {
      lastGeometryErrors = [issueForGeometry("viewport_profile_coverage", "Geometry must resolve every authored viewport profile exactly once.", { expected: [...expectedProfileIds], actual: [...actualProfileIds] })];
      continue;
    }

    // The visual motor already chose the typography role. Resolving its authored
    // measurements to pixels is a technical translation, not a design choice.
    // Do it deterministically when the geometry response omits the redundant
    // resolvedTypography object instead of asking AI to invent typography.
    completeAuthoredTypography(sceneGraph, drafts);
    const numericTypeErrors = normalizeUnambiguousGeometryNumbers(drafts);
    lastGeometryDrafts = structuredClone(drafts);
    if (numericTypeErrors.length) {
      lastGeometryErrors = numericTypeErrors;
      continue;
    }

    const resolvedProfiles = drafts.map((draft) => makeResolved(sceneGraph, draft));
    const invalidResolved = resolvedProfiles.flatMap((resolved) => {
      const result = validateResolvedSceneGraph(resolved, { sceneGraph });
      return result.valid ? [] : result.errors.map((error) => ({ ...error, profileId: resolved.profileId }));
    });
    if (invalidResolved.length) {
      lastGeometryErrors = invalidResolved;
      continue;
    }

    const compiledProfiles = resolvedProfiles.map((resolved) => ({
      profileId: resolved.profileId,
      query: structuredClone(sceneGraph.responsive.profiles.find((profile) => profile.id === resolved.profileId)?.query || {}),
      viewportInlinePx: resolved.viewportInlinePx,
      viewportBlockPx: resolved.viewportBlockPx,
      result: compileLayout({ sceneGraph, resolvedSceneGraph: resolved }),
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
      resolvedProfiles,
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

async function resolveWithDesignFeedback(sceneGraph, options) {
  let reviewedGraph = sceneGraph;
  const designConflictResponseIds = [];
  let preservedGeometryDrafts;
  let preservedGeometryResponseId = "";
  let compiled;
  for (let round = 0; round <= 3; round += 1) {
    compiled = await resolveAndCompileScene(reviewedGraph, {
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
  const model = String(options.model || "gpt-4o").trim();
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
  const validationOptions = {
    ...options,
    requestedContent: Array.isArray(creativeBrief?.customerFacts?.requestedContent)
      ? creativeBrief.customerFacts.requestedContent
      : [],
  };
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
    maxOutputTokens: 10000,
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
    const authoredCandidate = needsContractRepair
      ? mergeContractRepair(sceneGraph, sceneResult.value?.sceneGraph)
      : sceneResult.value?.sceneGraph;
    const candidateGraph = assembleInitialSceneGraph(authoredCandidate, {
      envelope,
      selectedVision,
    });
    const candidateValidation = validateGeneratedSceneGraph(candidateGraph, validationOptions);
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

  const images = await materializeImages(sceneGraph, { ...options, apiKey, fetchImpl, selectedVision });
  if (!images.ok) return fail("image-materialization", images);
  sceneGraph = images.sceneGraph;
  graphValidation = validateGeneratedSceneGraph(sceneGraph, validationOptions);
  if (!graphValidation.valid) return fail("free-scene-after-images", { error: "free-scene-after-images", errors: graphValidation.errors });

  const resolution = await resolveWithDesignFeedback(sceneGraph, { ...validationOptions, apiKey, fetchImpl, model });
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
    resolvedProfiles: compiled.resolvedProfiles,
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
  const model = String(options.model || "gpt-4o").trim();
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
    const baseValidation = validateUnresolvedSceneGraph(sceneGraph);
    const operationErrors = [
      ...additionContractErrors(sceneGraph, currentSceneGraph, input?.editContext),
      ...extensionContractErrors(sceneGraph, currentSceneGraph, input?.editContext),
    ];
    graphValidation = { valid: baseValidation.valid && operationErrors.length === 0, errors: [...(baseValidation.errors || []), ...operationErrors] };
    if (graphValidation.valid) break;
  }
  if (!graphValidation?.valid) return { ok: false, error: "free-scene-edit-contract", errors: graphValidation?.errors || [] };

  const images = await materializeImages(sceneGraph, { ...options, apiKey, fetchImpl });
  if (!images.ok) return images;
  sceneGraph = images.sceneGraph;
  graphValidation = validateUnresolvedSceneGraph(sceneGraph);
  if (!graphValidation.valid) return { ok: false, error: "free-scene-edit-after-images", errors: graphValidation.errors };

  const resolution = await resolveWithDesignFeedback(sceneGraph, { ...options, apiKey, fetchImpl, model });
  if (!resolution.ok) return resolution;
  sceneGraph = resolution.sceneGraph;
  const compiled = resolution.compiled;
  return {
    ok: true,
    engineVersion: "v2",
    model,
    generationId: currentSceneGraph.generationId,
    sceneGraph,
    resolvedProfiles: compiled.resolvedProfiles,
    compiledProfiles: compiled.compiledProfiles,
    responseIds: { edit: editResponseId, designConflict: resolution.designConflictResponseIds, geometry: compiled.geometryResponseId },
  };
}

export function reorderFreeScene(input) {
  const currentSceneGraph = input?.sceneGraph;
  const sceneId = String(input?.sceneId || "").trim();
  const direction = String(input?.direction || "").trim();
  const currentValidation = validateUnresolvedSceneGraph(currentSceneGraph);
  if (!currentValidation.valid) return { ok: false, error: "invalid-current-scene", errors: currentValidation.errors };
  const sourceResolved = Array.isArray(input?.resolvedProfiles) ? input.resolvedProfiles : [];
  if (!sourceResolved.length) return { ok: false, error: "resolved-profiles-required" };
  if (direction !== "up" && direction !== "down") return { ok: false, error: "invalid-move-direction" };

  const order = [...(currentSceneGraph.pageFlow?.sceneOrder || [])];
  const index = order.indexOf(sceneId);
  if (index < 1) return { ok: false, error: "added-scene-not-found", sceneId };
  const targetIndex = direction === "up" ? index - 1 : index + 1;
  // The original free composition (index 0) remains fixed because it contains
  // the automatically generated Hero and Footer. Add-scenes move around each other.
  if (targetIndex < 1 || targetIndex >= order.length) return { ok: false, error: "scene-move-boundary", sceneId, direction };
  [order[index], order[targetIndex]] = [order[targetIndex], order[index]];

  const graph = structuredClone(currentSceneGraph);
  const sceneById = new Map(graph.scenes.map((scene) => [scene.id, scene]));
  graph.scenes = order.map((id) => sceneById.get(id));
  graph.pageFlow.sceneOrder = order;
  graph.pageFlow.entrySceneId = order[0];
  graph.pageFlow.closureSceneId = order.at(-1);
  const stamped = stampEditedMetadata(graph, currentSceneGraph, new Date().toISOString());
  const validation = validateUnresolvedSceneGraph(stamped);
  if (!validation.valid) return { ok: false, error: "free-scene-reorder-contract", errors: validation.errors };

  const unresolvedHash = canonicalSha256(stamped);
  const resolvedProfiles = sourceResolved.map((source) => {
    const resolved = structuredClone(source);
    const byId = new Map((resolved.scenes || []).map((scene) => [scene.sceneId, scene]));
    let nextY = 0;
    resolved.scenes = order.map((id) => {
      const scene = byId.get(id);
      const deltaY = nextY - Number(scene.bounds.y || 0);
      scene.bounds.y = nextY;
      for (const node of scene.nodes || []) node.bounds.y += deltaY;
      nextY += Number(scene.bounds.height || 0);
      return scene;
    });
    resolved.generationId = stamped.generationId;
    resolved.unresolvedSceneGraphSha256 = unresolvedHash;
    return resolved;
  });
  const invalidResolved = resolvedProfiles.flatMap((resolved) => {
    const result = validateResolvedSceneGraph(resolved, { sceneGraph: stamped });
    return result.valid ? [] : result.errors;
  });
  if (invalidResolved.length) return { ok: false, error: "resolved-scene-reorder-conflict", errors: invalidResolved };

  const compiledProfiles = resolvedProfiles.map((resolved) => ({
    profileId: resolved.profileId,
    query: structuredClone(stamped.responsive.profiles.find((profile) => profile.id === resolved.profileId)?.query || {}),
    viewportInlinePx: resolved.viewportInlinePx,
    viewportBlockPx: resolved.viewportBlockPx,
    ...compileLayout({ sceneGraph: stamped, resolvedSceneGraph: resolved }),
  }));
  const conflicts = compiledProfiles.filter((profile) => !profile.ok).flatMap((profile) => profile.conflicts || []);
  if (conflicts.length) return { ok: false, error: "layout-compilation-conflict", conflicts };
  return { ok: true, engineVersion: "v2", generationId: stamped.generationId, sceneGraph: stamped, resolvedProfiles, compiledProfiles };
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

  const compiledProfiles = resolvedProfiles.map((resolved) => {
    const result = compileLayout({ sceneGraph: stamped, resolvedSceneGraph: resolved });
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
    resolvedProfiles,
    compiledProfiles,
  };
}

export function replaceFreeSceneAsset(input) {
  const currentSceneGraph = input?.sceneGraph;
  const assetId = String(input?.assetId || "").trim();
  const uri = String(input?.uri || "").trim();
  const currentValidation = validateUnresolvedSceneGraph(currentSceneGraph);
  if (!currentValidation.valid) return { ok: false, error: "invalid-current-scene", errors: currentValidation.errors };
  const currentAsset = currentSceneGraph.assetManifest?.assets?.find((asset) => asset.id === assetId);
  if (!currentAsset) return { ok: false, error: "asset-not-found", assetId };
  if (currentAsset.kind !== "image") return { ok: false, error: "asset-not-editable", assetId };
  if (!uri || /^javascript:/i.test(uri)) return { ok: false, error: "invalid-asset-uri", assetId };

  const sceneGraph = structuredClone(currentSceneGraph);
  const asset = sceneGraph.assetManifest.assets.find((entry) => entry.id === assetId);
  const mimeType = /^image\/(png|jpeg|webp|gif)$/i.test(String(input?.mimeType || ""))
    ? String(input.mimeType).toLowerCase()
    : asset.mimeType;
  asset.mimeType = mimeType;
  asset.source = {
    origin: "supplied",
    uri,
    sourceId: "manual:" + assetId,
    contentSha256: canonicalSha256({ uri, mimeType }),
  };
  asset.provenance = {
    origin: "suppliedAsset",
    claimClass: "none",
    verificationStatus: "verified",
  };
  const width = Number(input?.width);
  const height = Number(input?.height);
  if (Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0) {
    asset.intrinsic = { width, height, aspectRatio: width / height };
  }

  const createdAt = new Date().toISOString();
  const stamped = stampEditedMetadata(sceneGraph, currentSceneGraph, createdAt);
  const validation = validateUnresolvedSceneGraph(stamped);
  if (!validation.valid) return { ok: false, error: "free-scene-asset-contract", errors: validation.errors };

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
  if (invalidResolved.length) return { ok: false, error: "resolved-scene-asset-conflict", errors: invalidResolved };

  const compiledProfiles = resolvedProfiles.map((resolved) => {
    const result = compileLayout({ sceneGraph: stamped, resolvedSceneGraph: resolved });
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
    resolvedProfiles,
    compiledProfiles,
  };
}

export function updateFreeSceneNode(input) {
  const currentSceneGraph = input?.sceneGraph;
  const nodeId = String(input?.nodeId || "").trim();
  const currentValidation = validateUnresolvedSceneGraph(currentSceneGraph);
  if (!currentValidation.valid) return { ok: false, error: "invalid-current-scene", errors: currentValidation.errors };

  const sourceResolved = Array.isArray(input?.resolvedProfiles) ? input.resolvedProfiles : [];
  if (!sourceResolved.length) return { ok: false, error: "resolved-profiles-required" };

  const sourceScene = (currentSceneGraph.scenes || []).find((scene) => (scene.nodes || []).some((node) => node.id === nodeId));
  const sourceNode = sourceScene && sourceScene.nodes.find((node) => node.id === nodeId);
  if (!sourceNode) return { ok: false, error: "scene-node-not-found", nodeId };
  if (sourceNode.editorLock === "full") return { ok: false, error: "scene-node-locked", nodeId };

  const deleteNode = input?.deleteNode === true;
  const scalePercent = Math.max(50, Math.min(150, Number(input?.scalePercent) || 100));
  const marginPx = Math.max(-80, Math.min(80, Number(input?.marginPx) || 0));
  const backgroundColor = String(input?.backgroundColor || "").trim();
  if (backgroundColor && !/^#[0-9a-f]{6}$/i.test(backgroundColor)) {
    return { ok: false, error: "invalid-background-color", nodeId };
  }

  const sceneGraph = structuredClone(currentSceneGraph);
  const scene = sceneGraph.scenes.find((entry) => entry.id === sourceScene.id);
  const node = scene.nodes.find((entry) => entry.id === nodeId);
  const removedRelationIds = new Set();

  if (deleteNode) {
    scene.nodes = scene.nodes.filter((entry) => entry.id !== nodeId);
    scene.focalSequence = (scene.focalSequence || []).filter((id) => id !== nodeId);
    for (const entry of scene.nodes) {
      if (Array.isArray(entry.children)) entry.children = entry.children.filter((id) => id !== nodeId);
    }
    scene.relations = (scene.relations || []).flatMap((relation) => {
      const next = structuredClone(relation);
      if (next.target === nodeId) {
        removedRelationIds.add(next.id);
        return [];
      }
      next.subjects = (next.subjects || []).filter((id) => id !== nodeId);
      if (Array.isArray(next.orderedNodeIds)) next.orderedNodeIds = next.orderedNodeIds.filter((id) => id !== nodeId);
      if (!next.subjects.length || (Array.isArray(next.orderedNodeIds) && !next.orderedNodeIds.length)) {
        removedRelationIds.add(next.id);
        return [];
      }
      return [next];
    });

    for (const profile of sceneGraph.responsive?.profiles || []) {
      profile.operations = (profile.operations || []).flatMap((operation) => {
        if (operation.targetId === nodeId || removedRelationIds.has(operation.relationId)) return [];
        if (Array.isArray(operation.orderedNodeIds)) {
          const next = { ...operation, orderedNodeIds: operation.orderedNodeIds.filter((id) => id !== nodeId) };
          return next.orderedNodeIds.length ? [next] : [];
        }
        return [operation];
      });
    }

    const stillUsesContent = sourceNode.contentRef && sceneGraph.scenes.some((entry) =>
      (entry.nodes || []).some((candidate) => candidate.contentRef === sourceNode.contentRef));
    if (sourceNode.contentRef && !stillUsesContent) {
      sceneGraph.contentAtoms = sceneGraph.contentAtoms.filter((atom) => atom.id !== sourceNode.contentRef);
    }
    const stillUsesAsset = sourceNode.assetRef && sceneGraph.scenes.some((entry) =>
      (entry.nodes || []).some((candidate) => candidate.assetRef === sourceNode.assetRef));
    if (sourceNode.assetRef && !stillUsesAsset) {
      sceneGraph.assetManifest.assets = sceneGraph.assetManifest.assets.filter((asset) => asset.id !== sourceNode.assetRef);
    }
  } else if (backgroundColor) {
    const roleId = "color_manual_" + nodeId.replace(/[^A-Za-z0-9._-]/g, "_");
    let role = sceneGraph.designLanguage.colorRoles.find((entry) => entry.id === roleId);
    if (!role) {
      role = { id: roleId, value: backgroundColor, intent: "Manuellt vald bakgrund för markerat objekt", dominance: 0 };
      sceneGraph.designLanguage.colorRoles.push(role);
    } else {
      role.value = backgroundColor;
    }
    node.visual = { ...(node.visual || {}), backgroundRoleId: roleId };
    for (const profile of sceneGraph.responsive?.profiles || []) {
      for (const operation of profile.operations || []) {
        if (operation.op === "setNodeVisual" && operation.targetId === nodeId) {
          operation.visual = { ...(operation.visual || {}), backgroundRoleId: roleId };
        }
      }
    }
  }

  const createdAt = new Date().toISOString();
  const stamped = stampEditedMetadata(sceneGraph, currentSceneGraph, createdAt);
  const validation = validateUnresolvedSceneGraph(stamped);
  if (!validation.valid) return { ok: false, error: "free-scene-node-contract", errors: validation.errors };

  const unresolvedHash = canonicalSha256(stamped);
  const scale = scalePercent / 100;
  const resolvedProfiles = sourceResolved.map((resolved) => {
    const next = structuredClone(resolved);
    next.generationId = stamped.generationId;
    next.unresolvedSceneGraphSha256 = unresolvedHash;
    for (const resolvedScene of next.scenes || []) {
      if (resolvedScene.sceneId !== sourceScene.id) continue;
      if (deleteNode) {
        resolvedScene.nodes = (resolvedScene.nodes || []).filter((entry) => entry.nodeId !== nodeId);
        resolvedScene.orderedNodeIds = (resolvedScene.orderedNodeIds || []).filter((id) => id !== nodeId);
        continue;
      }
      const resolvedNode = (resolvedScene.nodes || []).find((entry) => entry.nodeId === nodeId);
      if (!resolvedNode) continue;
      const original = resolvedNode.bounds;
      const width = Math.max(8, original.width * scale);
      const height = Math.max(8, original.height * scale);
      const centerX = original.x + original.width / 2;
      const centerY = original.y + original.height / 2 + marginPx;
      const minX = resolvedScene.bounds.x;
      const minY = resolvedScene.bounds.y;
      const maxX = resolvedScene.bounds.x + resolvedScene.bounds.width - width;
      const maxY = resolvedScene.bounds.y + resolvedScene.bounds.height - height;
      resolvedNode.bounds = {
        x: Math.max(minX, Math.min(maxX, centerX - width / 2)),
        y: Math.max(minY, Math.min(maxY, centerY - height / 2)),
        width,
        height,
      };
      if ((sourceNode.kind === "text" || sourceNode.kind === "action") && resolvedNode.resolvedTypography && scale !== 1) {
        resolvedNode.resolvedTypography.fontSizePx *= scale;
        resolvedNode.resolvedTypography.lineHeightPx *= scale;
        resolvedNode.resolvedTypography.letterSpacingPx *= scale;
      }
    }
    if (deleteNode) {
      next.appliedResponsiveOperations = (next.appliedResponsiveOperations || []).flatMap((operation) => {
        if (operation.targetId === nodeId || removedRelationIds.has(operation.relationId)) return [];
        if (Array.isArray(operation.orderedNodeIds)) {
          const updated = { ...operation, orderedNodeIds: operation.orderedNodeIds.filter((id) => id !== nodeId) };
          return updated.orderedNodeIds.length ? [updated] : [];
        }
        return [operation];
      });
      next.sacrificedRelationIds = (next.sacrificedRelationIds || []).filter((id) => !removedRelationIds.has(id));
    }
    return next;
  });

  const invalidResolved = resolvedProfiles.flatMap((resolved) => {
    const result = validateResolvedSceneGraph(resolved, { sceneGraph: stamped });
    return result.valid ? [] : result.errors;
  });
  if (invalidResolved.length) return { ok: false, error: "resolved-scene-node-conflict", errors: invalidResolved };

  const compiledProfiles = resolvedProfiles.map((resolved) => {
    const result = compileLayout({ sceneGraph: stamped, resolvedSceneGraph: resolved });
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
  return { ok: true, engineVersion: "v2", generationId: stamped.generationId, sceneGraph: stamped, resolvedProfiles, compiledProfiles };
}

function issueForGeometry(code, message, details) {
  return { code, message, details, instancePath: "" };
}
