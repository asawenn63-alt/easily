import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const ENGINE_DIR = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_ROOT = path.join(ENGINE_DIR, "output");
const RUNS_DIR = path.join(ENGINE_DIR, "runs");
const ALLOWED_FILES = new Set(["index.html", "styles.css", "site.js"]);

const SITE_BUNDLE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["creativeDirection", "assetPlan", "files"],
  properties: {
    creativeDirection: { type: "string", minLength: 80, maxLength: 1600 },
    assetPlan: {
      type: "array",
      minItems: 0,
      maxItems: 6,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "filename", "prompt", "alt", "aspectRatio"],
        properties: {
          id: { type: "string", pattern: "^[a-z][a-z0-9-]{1,40}$" },
          filename: { type: "string", pattern: "^[a-z][a-z0-9-]{1,50}\\.webp$" },
          prompt: { type: "string", minLength: 80, maxLength: 1200 },
          alt: { type: "string", minLength: 8, maxLength: 180 },
          aspectRatio: { type: "string", enum: ["landscape", "portrait", "square"] }
        }
      }
    },
    files: {
      type: "object",
      additionalProperties: false,
      required: ["index.html", "styles.css", "site.js"],
      properties: {
        "index.html": { type: "string", minLength: 1000, maxLength: 50000 },
        "styles.css": { type: "string", minLength: 2500, maxLength: 80000 },
        "site.js": { type: "string", minLength: 100, maxLength: 30000 }
      }
    }
  }
};

const ART_DIRECTION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["candidates"],
  properties: {
    candidates: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "name", "rationale", "hierarchy", "typography", "colorLogic", "composition", "imageRole", "copyVoice", "navigation", "motion", "avoids"],
        properties: {
          id: { type: "string", enum: ["direction-a", "direction-b", "direction-c"] },
          name: { type: "string", minLength: 3, maxLength: 80 },
          rationale: { type: "string", minLength: 40, maxLength: 500 },
          hierarchy: { type: "string", minLength: 30, maxLength: 400 },
          typography: { type: "string", minLength: 30, maxLength: 400 },
          colorLogic: { type: "string", minLength: 30, maxLength: 400 },
          composition: { type: "string", minLength: 30, maxLength: 500 },
          imageRole: { type: "string", minLength: 30, maxLength: 400 },
          copyVoice: { type: "string", minLength: 30, maxLength: 400 },
          navigation: { type: "string", minLength: 20, maxLength: 300 },
          motion: { type: "string", minLength: 20, maxLength: 300 },
          avoids: {
            type: "array",
            minItems: 0,
            maxItems: 10,
            items: { type: "string", minLength: 3, maxLength: 120 }
          }
        }
      }
    }
  }
};

const ART_DIRECTION_SELECTION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["selectedId", "selectionReason"],
  properties: {
    selectedId: { type: "string", enum: ["direction-a", "direction-b", "direction-c"] },
    selectionReason: { type: "string", minLength: 50, maxLength: 600 }
  }
};

const ART_DIRECTION_SYSTEM_PROMPT = `Du formger webbplatser utifrån användarens verksamhet och önskade uttryck.

Skapa exakt tre genomförbara Art Directions. Välj ingen vinnare och rangordna inte alternativen. Användarens konkreta stilbeskrivning och preciseringar väger tyngre än breda känsloord. Skilj uttryckliga önskemål från din egen tolkning. Alternativen ska erbjuda olika sätt att uppleva innehållet, inte olika färger på samma sida; de ska alla bevara användarens stilönskemål.

Behandla ett brett stilval som ett önskat upplevelsemål, aldrig som ett färdigt formspråk. Stilordet får inte ensamt motivera något synligt designbeslut. Varje sådant beslut är endast giltigt när det har en konkret och specifik koppling till verksamhetens innehåll, namn, användningssituation eller informationsbehov.

Inled rationale med riktningens företagsspecifika bärande idé: en kort beskrivning av varför just denna verksamhet ska organiseras och upplevas på detta sätt. Koppla därefter varje synligt kännetecken till den bärande idén och de faktiska svaren. Motiveringar som enbart säger att ett grepp är ”lekfullt”, ”varmt”, ”modernt”, ”kreativt”, ”exklusivt” eller ”professionellt” är ogiltiga.

Fatta självständiga och sammanhängande beslut i samtliga fält. Varje beslut ska kunna härledas till briefen, verksamhetens innehåll eller den företagsspecifika bärande idén; inget uttryck, komponentmönster eller designgrepp är förvalt. Ett fält är en plats för att dokumentera beslutet, inte en uppmaning att lägga till ett visuellt grepp. Om något inte behövs ska fältet ange detta och varför. Skriv fullständiga, konkreta beslut inom fältens längdgränser.

De tre alternativen ska utgå från genuint olika bärande idéer, informationsflöden och användningssituationer, inte från en återanvänd lista av designingredienser. Skillnaden mellan alternativen ska märkas i hur innehållet organiseras, vad som dominerar, hur besökaren rör sig genom sidan, typografins funktion, bildens roll och eventuell interaktion — inte främst i dekorativa motiv eller färgbyten. Ange en konkret lokalt tillgänglig font-stack och läsbara storleksrelationer i typography, men härled typografins karaktär och betoning från respektive riktning. Låt övriga fält beskriva riktningens egen hierarki, färglogik, komposition, bildroll, copyton, navigation och eventuella rörelse. Motion ska ange om rörelse är motiverad och i så fall varför; ett uttryckligt beslut att avstå är giltigt. Välj riktning efter spårbar överensstämmelse med briefen och företagsspecifik identitet, inte efter trendighet, maximal dramatik, stilordets vanligaste visuella klichéer eller din vanligaste estetiska lösning. Uppfinn inte statistik eller företagsfakta.

Det finns ingen föreskriven palett, typografisk tradition, bilddominans eller branschlayout. En typografisk eller illustrerad komposition är lika tillåten som en fotografisk. Stilträffsäkerhet är viktigare än att göra uttrycket mer återhållsamt, exklusivt eller trendigt. avoids får vara tom; ange endast bortval som stöds av användarens önskemål eller en konkret motsägelse mot briefen.

Om verkliga produktbilder eller produktdata saknas får riktningen använda ärlig kategoriillustration, materialstudier eller stämningsskapande bildvärld som inte utger sig för att visa ett faktiskt lager. Ersätt inte automatiskt saknat material med tomma standardkort eller anonyma färgrutor.

Returnera endast JSON enligt kontraktet.`;

const ART_DIRECTION_SELECTION_SYSTEM_PROMPT = `Du är en oberoende urvalsgranskare. Du får en användarbrief och tre redan färdigformulerade Art Directions.

Välj den riktning vars beslut tydligast kan beläggas av användarens faktiska svar, verksamhetens funktion och en företagsspecifik bärande idé. Bedöm uttryckliga önskemål, informationsbehov, användbarhet, intern sammanhållning och om formspråket verkligen hör till just denna verksamhet.

Avvisa en riktning som huvudsakligen översätter ett brett stilord till ett invant visuellt formspråk. Varje synligt grepp måste stödjas av verksamhetens konkreta innehåll, namn, användningssituation eller informationsbehov. Belöna inte en riktning för att den känns trendig, dramatisk, exklusiv eller bekant. Lägg inte till, skriv inte om och förbättra inte någon riktning. Urvalet är en bedömning, inte ett nytt kreativt steg.

Returnera endast JSON enligt kontraktet.`;

const SYSTEM_PROMPT = `Du är designer och frontendutvecklare. Skapa ett sammanhängande, personligt designarbete från användarens fem svar.

Den bifogade Art Direction är ett bindande designkontrakt. Genomför endast dess beslut om hierarki, typografi, färglogik, komposition, bildroll, copyton, navigation och rörelse i HTML/CSS/JS och assetPlan. Bevara användarens konkreta stilönskemål även i detaljerna. Introducera inga egna synliga designmotiv, komponentstilar eller estetiska lösningar. Du får endast fatta tekniska implementeringsbeslut som krävs för fungerande, säker och responsiv HTML/CSS/JS. Om ingen Art Direction bifogas härleder du själv besluten från svaren.

Krav på resultatet:
- Skriv en komplett fristående, responsiv webbplats i exakt tre filer: index.html, styles.css och site.js.
- Använd semantisk HTML och svenska texter.
- Alla angivna sektioner ska finnas, plus hero, navigation och footer.
- Komponera hela visuella scener, inte en stapel återkommande text-bild-sektioner eller generiska kort.
- Låt rytm, skala, visuell vikt och komposition följa innehållets roll i den valda riktningen.
- Verkställ riktningens beslut konsekvent även i de små komponenterna. Ett uttryckligt bortval ska förbli frånvarande. Saknas en detalj, utgå från elementets faktiska information och funktion inom riktningen, inte från ett färdigt komponentpaket eller ett tidigare designresultat.
- Media kan vara huvudmotiv, stöd eller dekor enligt den valda Art Direction. Typografi kan bära kompositionen när riktningen uttryckligen beslutar det. Lägg inte till visuella element eller motiv som saknas i riktningen. Bildassets används via relativa sökvägar assets/filnamn.webp.
- Använd interaktion och rörelse endast när riktningen eller innehållets funktion motiverar det. Om rörelse används ska den höra ihop med idén och respektera prefers-reduced-motion.
- Mobilversionen ska vara avsiktligt formgiven, inte bara en hoptryckt desktop.
- Form, färg och storlek på navigation och knappar ska stödja riktningen och vara läsbara och användbara.
- Hitta inte på företagsfakta som inte finns i briefen. Kontaktsektionen får bjuda in till kontakt men får inte fabricera kontaktuppgifter.

Säker och isolerad leverans:
- Ingen extern CSS, font, bild, video, iframe, script eller nätverksadress.
- Ingen fetch, XMLHttpRequest, WebSocket, EventSource, eval, Function, cookies eller lagring.
- Ingen formulärsändning. Kontakt kan använda en neutral knapp eller informationsyta utan falsk destination.
- JavaScript får endast styra lokal presentation och interaktion.
- Referera endast till de bilder du själv anger i assetPlan.

AssetPlan:
- Beställ endast de bildassets som den valda Art Direction uttryckligen behöver, högst 6; assetPlan får vara tom. Varje assets medium, funktion och visuella behandling ska komma från riktningen och får inte hittas på av kodgeneratorn.
- Varje prompt ska fungera fristående för en bildmodell, beskriva medium, komposition, relevanta material och färger samt utsnitt. För fotografi: även ljus och miljö. Säg uttryckligen: ingen text, ingen logotyp, inget vattenmärke.
- Filnamnen ska vara unika och användas i HTML/CSS.

Returnera endast det JSON-dokument som kontraktet kräver.`;

function responseText(payload) {
  if (typeof payload?.output_text === "string") return payload.output_text;
  for (const item of payload?.output || []) {
    for (const content of item?.content || []) {
      if (content?.type === "output_text" && typeof content.text === "string") return content.text;
    }
  }
  return "";
}

function assertSafeBundle(bundle) {
  const errors = [];
  const files = bundle?.files || {};
  if (Object.keys(files).some((name) => !ALLOWED_FILES.has(name))) errors.push("otillåtet filnamn");

  const html = String(files["index.html"] || "");
  const css = String(files["styles.css"] || "");
  const js = String(files["site.js"] || "");
  const combined = `${html}\n${css}\n${js}`;

  const forbidden = [
    [/https?:\/\//i, "extern nätverksadress"],
    [/<(?:iframe|object|embed)\b/i, "inbäddat externt innehåll"],
    [/<form[^>]+action\s*=/i, "formulärdestination"],
    [/\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|eval)\s*\(/, "nätverks- eller eval-anrop"],
    [/\bnew\s+Function\b|document\.cookie|localStorage|sessionStorage/, "otillåten webbläsaråtkomst"],
    [/javascript:/i, "javascript-URL"]
  ];
  for (const [pattern, label] of forbidden) if (pattern.test(combined)) errors.push(label);

  if (!/href=["']styles\.css["']/i.test(html)) errors.push("styles.css är inte länkad");
  if (!/src=["']site\.js["']/i.test(html)) errors.push("site.js är inte länkad");
  if (!/prefers-reduced-motion/i.test(css)) errors.push("reduced-motion saknas");

  const plan = Array.isArray(bundle?.assetPlan) ? bundle.assetPlan : [];
  const names = new Set();
  for (const asset of plan) {
    if (names.has(asset.filename)) errors.push(`dubbelt assetnamn: ${asset.filename}`);
    names.add(asset.filename);
    if (!combined.includes(`assets/${asset.filename}`)) errors.push(`asset används inte: ${asset.filename}`);
  }
  const undeclared = [...combined.matchAll(/assets\/([a-z0-9-]+\.webp)/gi)].map((match) => match[1]).filter((name) => !names.has(name));
  if (undeclared.length) errors.push(`odeklarerade assets: ${[...new Set(undeclared)].join(", ")}`);
  if (errors.length) throw new Error(`AI-leveransen stoppades av isoleringskontrollen: ${errors.join("; ")}`);
}

async function generateBundle(apiKey, model, brief, selectedDirection) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(300000),
    body: JSON.stringify({
      model,
      store: false,
      input: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Här är de fem verkliga svaren. De är enda källan till företagsfakta:\n${JSON.stringify(brief, null, 2)}\n\nHär är den valda Art Direction som ska styra hela designen. Följ dess hierarki, typografi, färglogik, komposition, bildroll, copyton, navigation, rörelse och uttryckliga undvikanden. Ersätt den inte med en generell premium-editorial standard:\n${JSON.stringify(selectedDirection, null, 2)}`
        }
      ],
      text: { format: { type: "json_schema", name: "greenfield_site_bundle", strict: true, schema: SITE_BUNDLE_SCHEMA } },
      max_output_tokens: 40000
    })
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Design- och kodgenereringen misslyckades (${response.status}): ${detail.slice(0, 800)}`);
  }
  const payload = await response.json();
  const text = responseText(payload);
  if (!text) throw new Error("AI-svaret saknade webbplatsdata.");
  return { bundle: JSON.parse(text), responseId: payload.id || null };
}

async function generateArtDirection(apiKey, model, brief) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(180000),
    body: JSON.stringify({
      model,
      store: false,
      input: [
        { role: "system", content: ART_DIRECTION_SYSTEM_PROMPT },
        { role: "user", content: `Skapa tre olika, stiltrogna Art Directions för denna brief. Välj eller rangordna dem inte:\n${JSON.stringify(brief, null, 2)}` }
      ],
      text: { format: { type: "json_schema", name: "greenfield_art_direction", strict: true, schema: ART_DIRECTION_SCHEMA } },
      max_output_tokens: 7000
    })
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Art Direction-genereringen misslyckades (${response.status}): ${detail.slice(0, 800)}`);
  }
  const payload = await response.json();
  const text = responseText(payload);
  if (!text) throw new Error("Art Direction-svaret saknade data.");
  const plan = JSON.parse(text);

  const selectionResponse = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(180000),
    body: JSON.stringify({
      model,
      store: false,
      input: [
        { role: "system", content: ART_DIRECTION_SELECTION_SYSTEM_PROMPT },
        { role: "user", content: `Välj en riktning för briefen utan att ändra alternativen.\n\nBRIEF:\n${JSON.stringify(brief, null, 2)}\n\nALTERNATIV:\n${JSON.stringify(plan.candidates, null, 2)}` }
      ],
      text: { format: { type: "json_schema", name: "greenfield_art_direction_selection", strict: true, schema: ART_DIRECTION_SELECTION_SCHEMA } },
      max_output_tokens: 1200
    })
  });
  if (!selectionResponse.ok) {
    const detail = await selectionResponse.text();
    throw new Error(`Art Direction-urvalet misslyckades (${selectionResponse.status}): ${detail.slice(0, 800)}`);
  }
  const selectionPayload = await selectionResponse.json();
  const selectionText = responseText(selectionPayload);
  if (!selectionText) throw new Error("Art Direction-urvalet saknade data.");
  const selection = JSON.parse(selectionText);
  const selected = plan.candidates.find((candidate) => candidate.id === selection.selectedId);
  if (!selected) throw new Error("Art Direction-valet pekade inte på en kandidat.");
  return {
    plan: { ...plan, ...selection },
    selected,
    responseId: payload.id || null,
    selectionResponseId: selectionPayload.id || null
  };
}

function imageSize(aspectRatio) {
  if (aspectRatio === "portrait") return "1024x1536";
  if (aspectRatio === "square") return "1024x1024";
  return "1536x1024";
}

async function generateImage(apiKey, asset, outputDir) {
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(240000),
    body: JSON.stringify({
      model: process.env.EASILY_GREENFIELD_IMAGE_MODEL || "gpt-image-1-mini",
      prompt: asset.prompt,
      size: imageSize(asset.aspectRatio),
      quality: process.env.EASILY_GREENFIELD_IMAGE_QUALITY || "medium",
      output_format: "webp"
    })
  });
  if (!response.ok) throw new Error(`Bilden ${asset.id} misslyckades (${response.status}): ${(await response.text()).slice(0, 500)}`);
  const payload = await response.json();
  const encoded = payload?.data?.[0]?.b64_json;
  if (!encoded) throw new Error(`Bilden ${asset.id} saknade bilddata.`);
  await fs.writeFile(path.join(outputDir, asset.filename), Buffer.from(encoded, "base64"));
  return { id: asset.id, filename: asset.filename, bytes: Buffer.byteLength(encoded, "base64") };
}

async function main() {
  const apiKey = String(process.env.OPENAI_API_KEY || "").trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY saknas.");

  const briefArgument = process.argv[2] || "briefs/quriasa.json";
  const projectSlug = String(process.argv[3] || "").trim();
  if (!/^[a-z][a-z0-9-]{1,50}$/.test(projectSlug)) {
    throw new Error("Ett giltigt projektnamn måste anges som andra argument.");
  }
  if (projectSlug === "quriasa") {
    throw new Error("QuriÅsa är immutable golden proof och får inte regenereras.");
  }
  const outputArgument = process.argv[4] || projectSlug;
  const outputDir = path.resolve(OUTPUT_ROOT, outputArgument);
  if (!outputDir.startsWith(`${OUTPUT_ROOT}${path.sep}`)) {
    throw new Error("Outputvägen måste ligga i greenfield-engine/output.");
  }
  const briefPath = path.resolve(ENGINE_DIR, briefArgument);
  const brief = JSON.parse(await fs.readFile(briefPath, "utf8"));
  const model = process.env.EASILY_GREENFIELD_MODEL || "gpt-5.6-sol";
  const runId = `${projectSlug}-${new Date().toISOString().replace(/[:.]/g, "-")}`;
  const runDir = path.join(RUNS_DIR, runId);
  await fs.mkdir(runDir, { recursive: true });
  await fs.writeFile(path.join(runDir, "brief.json"), JSON.stringify(brief, null, 2));

  console.log(`[greenfield] ${runId}: väljer verksamhetsspecifik Art Direction med ${model}`);
  const artDirection = await generateArtDirection(apiKey, model, brief);
  await fs.writeFile(path.join(runDir, "art-direction.json"), JSON.stringify(artDirection.plan, null, 2));

  console.log(`[greenfield] ${runId}: bygger vald riktning “${artDirection.selected.name}”`);
  const { bundle, responseId } = await generateBundle(apiKey, model, brief, artDirection.selected);
  assertSafeBundle(bundle);
  await fs.writeFile(path.join(runDir, "ai-bundle.json"), JSON.stringify(bundle, null, 2));

  const stagingDir = path.join(runDir, "site");
  const assetDir = path.join(stagingDir, "assets");
  await fs.mkdir(assetDir, { recursive: true });
  for (const name of ALLOWED_FILES) await fs.writeFile(path.join(stagingDir, name), bundle.files[name], "utf8");

  console.log(`[greenfield] skapar ${bundle.assetPlan.length} nya bildassets`);
  const assets = await Promise.all(bundle.assetPlan.map((asset) => generateImage(apiKey, asset, assetDir)));
  const briefHash = crypto.createHash("sha256").update(JSON.stringify(brief)).digest("hex");
  const manifest = {
    runId,
    projectSlug,
    createdAt: new Date().toISOString(),
    model,
    responseId,
    artDirectionResponseId: artDirection.responseId,
    artDirectionSelectionResponseId: artDirection.selectionResponseId,
    selectedArtDirectionId: artDirection.selected.id,
    selectedArtDirectionName: artDirection.selected.name,
    briefHash,
    creativeDirection: bundle.creativeDirection,
    files: [...ALLOWED_FILES],
    assets
  };
  await fs.writeFile(path.join(stagingDir, "generation.json"), JSON.stringify(manifest, null, 2));

  await fs.mkdir(path.dirname(outputDir), { recursive: true });
  await fs.rm(outputDir, { recursive: true, force: true });
  await fs.cp(stagingDir, outputDir, { recursive: true });
  console.log(`[greenfield] klar: ${outputDir}`);
}

main().catch((error) => {
  console.error(`[greenfield] FEL: ${error.message}`);
  process.exitCode = 1;
});
