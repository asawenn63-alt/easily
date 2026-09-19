import fs from "node:fs";
import path from "node:path";

const endpoint = "http://127.0.0.1:3847/api/v2/generate-site";
const outputDir = path.resolve("server", "data", "stabilization");
fs.mkdirSync(outputDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const outputPath = path.join(outputDir, `v2-series-3-stabilization-${stamp}.jsonl`);

const cases = [
  ["Hamnkvarteret Kaffe", "restaurang", "Litet kafé med egenrostade bönor, frukost och utsikt över hamnen.", "boende, pendlare och helgbesökare", ["about", "services", "gallery", "contact"], "varmt-personligt"],
  ["Alva Familjejuridik", "foretag", "Juridisk rådgivning inom familjerätt, arv och framtidsfullmakter.", "privatpersoner och familjer", ["about", "services", "contact"], "ljust-luftigt"],
  ["Tass & Vila", "foretag", "Hunddagis med små grupper, skogspromenader och lugn vila.", "hundägare i närområdet", ["about", "services", "gallery", "contact"], "varmt-personligt"],
  ["Ljusrum Linnea", "portfolio", "Fotograf för porträtt, små bröllop och redaktionella uppdrag.", "par, familjer och redaktioner", ["about", "services", "gallery", "contact"], "fri-designvarld"],
  ["Klippverket", "foretag", "Frisörstudio för precisa klippningar, färg och personlig rådgivning.", "vuxna som söker ett modernt hantverk", ["about", "services", "gallery", "contact"], "djarvt-kreativt"],
  ["Ek & Spån", "foretag", "Snickeri som bygger platsbyggda kök och förvaringar i massivt trä.", "husägare och mindre arkitektkontor", ["about", "services", "gallery", "contact"], "fri-designvarld"],
  ["Ateljé Mossa", "portfolio", "Konstnär som arbetar med textil, pigment och organiska installationer.", "gallerier, samlare och utställningsbesökare", ["about", "gallery", "contact"], "djarvt-kreativt"],
  ["Norrport Bilservice", "foretag", "Bilverkstad för service, diagnostik och reparation av personbilar.", "bilägare och lokala företag", ["about", "services", "gallery", "contact"], "morkt-dramatiskt"],
  ["Saffran & Rök", "restaurang", "Restaurang med nordiska råvaror, öppen eld och en meny som följer säsongen.", "middagssällskap och matintresserade", ["about", "services", "gallery", "contact"], "morkt-dramatiskt"],
  ["Havskanten Keramik", "webbutik", "Småskalig keramikstudio med handdrejade koppar, fat och vaser.", "kunder som söker brukskeramik med tydlig form", ["about", "services", "gallery", "contact"], "ljust-luftigt"],
  ["Fjällkod", "foretag", "Mjukvarustudio som bygger enkla bokningssystem för små besöksföretag.", "hotell, guider och aktivitetsföretag", ["about", "services", "contact"], "djarvt-kreativt"],
  ["Brofästet Rörelse", "foretag", "Naprapatmottagning för vardagsbesvär, idrottsskador och hållbar rörelse.", "motionärer och yrkesverksamma", ["about", "services", "contact"], "ljust-luftigt"],
  ["Vinterträdgården", "webbutik", "Blomsterstudio med säsongsbuketter, krukväxter och blomsterabonnemang.", "privatpersoner och mindre kontor", ["about", "services", "gallery", "contact"], "varmt-personligt"],
  ["Lilla Scenen", "ovrigt", "Fri teatergrupp som skapar nära föreställningar för unga och vuxna.", "publik, skolor och arrangörer", ["about", "services", "gallery", "contact"], "morkt-dramatiskt"],
  ["Nya Vågen Redovisning", "foretag", "Redovisningsbyrå som hjälper små företag med bokföring och ekonomisk överblick.", "företagare och föreningar", ["about", "services", "contact"], "ljust-luftigt"],
  ["Ugglans Lärstudio", "foretag", "Studieverkstad med läxhjälp och individuell planering för högstadieelever.", "elever och vårdnadshavare", ["about", "services", "gallery", "contact"], "varmt-personligt"],
  ["Fenix Cykelverkstad", "foretag", "Cykelverkstad för vardagscyklar, lastcyklar och snabb service.", "pendlare och barnfamiljer", ["about", "services", "gallery", "contact"], "djarvt-kreativt"],
  ["Korn & Kittel", "webbutik", "Butik med köksredskap, bakformar och noga utvalda vardagsverktyg.", "hemmakockar och bakintresserade", ["about", "services", "gallery", "contact"], "fri-designvarld"],
  ["Arkiv 47", "webbutik", "Butik för vintagekläder, unika accessoarer och handplockade fynd.", "kunder som söker personliga plagg", ["about", "services", "gallery", "contact"], "morkt-dramatiskt"],
  ["Stillpunkt", "foretag", "Meditationsstudio med introduktionskurser, tysta pass och återhämtning.", "nybörjare och erfarna deltagare", ["about", "services", "gallery", "contact"], "fri-designvarld"],
];

function creativeBrief(entry, index) {
  const [businessName, siteType, summary, audience, requestedContent, styleId] = entry;
  return {
    revision: index + 1,
    customerFacts: {
      siteType,
      businessName,
      offer: { summary },
      audience: { primary: audience },
      requestedContent,
      design: { styleId },
      colors: { mode: "auto" },
      source: { mode: "from-scratch" },
    },
    customerConstraints: {},
    uncertainties: {},
    provenance: {},
    derived: { basedOnRevision: index + 1, readiness: "ready" },
  };
}

function countBy(items, keyFn) {
  const counts = {};
  for (const item of items) {
    const key = keyFn(item);
    if (key) counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

function summarize(entry, index, result, status, elapsedMs) {
  const brief = creativeBrief(entry, index);
  const graph = result?.sceneGraph || {};
  const scenes = Array.isArray(graph.scenes) ? graph.scenes : [];
  const nodes = scenes.flatMap((scene) => Array.isArray(scene.nodes) ? scene.nodes : []);
  const atoms = Array.isArray(graph.contentAtoms) ? graph.contentAtoms : [];
  const atomValues = atoms.map((atom) => typeof atom.value === "string" ? atom.value : JSON.stringify(atom.value ?? ""));
  const assetRefs = nodes.map((node) => node.assetRef).filter(Boolean);
  const assetUse = countBy(assetRefs, (value) => value);
  const repeatedAssets = Object.entries(assetUse).filter(([, count]) => count > 1).map(([assetRef, count]) => ({ assetRef, count }));
  const selected = result?.creativeVision?.candidates?.[result?.creativeVision?.selectedIndex] || null;
  return {
    run: index + 1,
    case: brief.customerFacts.businessName,
    brief,
    startedResultAt: new Date().toISOString(),
    elapsedMs,
    httpStatus: status,
    ok: result?.ok === true,
    error: result?.error || null,
    failureStage: result?.failureStage || null,
    upstreamStatus: Number.isInteger(result?.status) ? result.status : null,
    upstreamCode: result?.upstreamCode || null,
    upstreamParam: result?.upstreamParam || null,
    detail: typeof result?.detail === "string" ? result.detail.slice(0, 1000) : null,
    generationId: result?.generationId || null,
    diagnosticAttempts: (result?.diagnostics || []).map((item) => ({ stage: item.stage, attempt: item.attempt, ok: item.ok, errors: item.errors || [] })),
    designWorld: selected?.designWorld || null,
    sceneCount: scenes.length,
    nodeCount: nodes.length,
    nodeKinds: countBy(nodes, (node) => node.kind),
    groupRoles: nodes.filter((node) => node.kind === "group").map((node) => ({ id: node.id, role: node.semanticRole || "", children: Array.isArray(node.children) ? node.children.length : 0 })),
    literalBackslashNewlines: atomValues.filter((value) => value.includes("\\n")),
    actualNewlines: atomValues.filter((value) => value.includes("\n")),
    repeatedAssets,
    textAtoms: atoms.filter((atom) => atom.kind === "text" || atom.kind === "action").map((atom) => ({ id: atom.id, kind: atom.kind, value: atom.value })),
    colors: graph.designLanguage?.colorRoles || [],
    typography: graph.designLanguage?.typographyRoles || [],
  };
}

async function runCase(entry, index) {
  const brief = creativeBrief(entry, index);
  const started = Date.now();
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ creativeBrief: brief }),
    });
    const responseText = await response.text();
    let body;
    try {
      body = JSON.parse(responseText);
    } catch {
      return {
        run: index + 1,
        case: brief.customerFacts.businessName,
        brief,
        elapsedMs: Date.now() - started,
        httpStatus: response.status,
        ok: false,
        error: "non-json-server-response",
        failureStage: null,
        message: responseText.slice(0, 500),
      };
    }
    return summarize(entry, index, body, response.status, Date.now() - started);
  } catch (error) {
    return {
      run: index + 1,
      case: brief.customerFacts.businessName,
      brief,
      elapsedMs: Date.now() - started,
      httpStatus: null,
      ok: false,
      error: "runner-error",
      failureStage: null,
      message: error?.message || String(error),
    };
  }
}

let nextIndex = 0;
let completed = 0;
async function worker(workerId) {
  while (true) {
    const index = nextIndex++;
    if (index >= cases.length) return;
    const name = cases[index][0];
    process.stdout.write(`[worker ${workerId}] start ${index + 1}/20 ${name}\n`);
    const summary = await runCase(cases[index], index);
    fs.appendFileSync(outputPath, JSON.stringify(summary) + "\n", "utf8");
    completed += 1;
    process.stdout.write(`[worker ${workerId}] done ${index + 1}/20 ${name}: ${summary.ok ? "OK" : summary.error} (${Math.round(summary.elapsedMs / 1000)}s), completed ${completed}/${cases.length}\n`);
  }
}

process.stdout.write(`RESULT_FILE=${outputPath}\n`);
await Promise.all([worker(1), worker(2)]);
process.stdout.write(`COMPLETE ${completed}/${cases.length} new generations\n`);
