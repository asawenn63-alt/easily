// Isolated one-call experiment. Does not import or invoke the generation entrypoint.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const engine = path.dirname(here);
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const sourceBytes = await fs.readFile(path.join(engine, 'generate.mjs'));
if (sha(sourceBytes) !== 'c1147b1dfdb58ffb5498c7d1b228ec866193076777b66f8386cdde338324550b') throw new Error('Engine changed; stop.');
const source = sourceBytes.toString('utf8');
const briefBytes = await fs.readFile(path.join(engine, 'briefs/quriasa-romantic-clarified-20260827.json'));
if (sha(briefBytes) !== '775c65f3ea8829bdcda470caa42b66cf2b0ba4e9abb39f8b2529ed01f3431079') throw new Error('Brief changed; stop.');
const brief = JSON.parse(briefBytes);
const baselineRun = 'quriasa-opening-20260827-2026-08-27T19-49-44-772Z';
const baseline = JSON.parse(await fs.readFile(path.join(engine, 'runs', baselineRun, 'art-direction.json'), 'utf8'));
const baselineBrief = JSON.parse(await fs.readFile(path.join(engine, 'runs', baselineRun, 'brief.json'), 'utf8'));
if (JSON.stringify(brief) !== JSON.stringify(baselineBrief)) throw new Error('Baseline brief differs; stop.');
const baselinePrompts = JSON.parse(await fs.readFile(path.join(here, 'quriasa-opening-20260827.prompts.json'), 'utf8'));
const baselineGeneration = JSON.parse(await fs.readFile(path.join(engine, 'runs', baselineRun, 'site/generation.json'), 'utf8'));
const model = process.env.EASILY_GREENFIELD_MODEL || 'gpt-5.6-sol';
if (model !== 'gpt-5.6-sol' || model !== baselineGeneration.model) throw new Error('Model mismatch; stop.');
const apiKey = String(process.env.OPENAI_API_KEY || '').trim();
if (!apiKey) throw new Error('OPENAI_API_KEY missing.');

const leanPrompt = `Du formger webbplatser utifrån användarens fem svar.
Skapa exakt tre olika, genomförbara Art Directions och välj den som bäst motsvarar verksamheten och användarens önskemål. Konkreta stilpreciseringar väger tyngre än breda känsloord. Skilj användarens uppgifter från dina egna designbeslut; hitta inte på företagsfakta.
Beskriv varje riktning konkret och sammanhängande i kontraktets fält, inklusive desktop och mobil. Ange lokalt tillgänglig font-stack, typografiska storleksrelationer och betoning. Motivera riktningen utifrån briefen. Skriv fullständiga beslut inom fältens längdgränser. avoids får vara tom.
Returnera endast JSON enligt kontraktet.`;

// Extract only the existing schema and two existing functions, byte-for-byte.
// No main(), code generation, image generation, output publishing or renderer is loaded.
function between(start, end) {
  const i = source.indexOf(start);
  const j = source.indexOf(end, i + start.length);
  if (i < 0 || j < 0) throw new Error('Extraction boundary missing; stop.');
  return source.slice(i, j);
}
const schemaSource = between('const ART_DIRECTION_SCHEMA =', 'const ART_DIRECTION_SYSTEM_PROMPT =');
const responseSource = between('function responseText(', 'function assertSafeBundle(');
const generationSource = between('async function generateArtDirection(', 'function imageSize(');
const isolatedModule = `${schemaSource}\nconst ART_DIRECTION_SYSTEM_PROMPT = ${JSON.stringify(leanPrompt)};\n${responseSource}\n${generationSource}\nexport { generateArtDirection, ART_DIRECTION_SCHEMA };`;
const isolated = await import(`data:text/javascript;base64,${Buffer.from(isolatedModule).toString('base64')}`);
const runId = `quriasa-lean-direction-${new Date().toISOString().replace(/[:.]/g, '-')}`;
const runDir = path.join(here, runId);
await fs.mkdir(runDir);
const writeJson = (name, data) => fs.writeFile(path.join(runDir, name), JSON.stringify(data, null, 2), { flag: 'wx' });

// Hash existing engine inputs, scripts, and all prior generated pages before the call.
const protectedFiles = [];
async function collect(folder) {
  for (const entry of await fs.readdir(folder, { withFileTypes: true })) {
    const full = path.join(folder, entry.name);
    if (entry.isDirectory()) await collect(full);
    else if (entry.isFile()) protectedFiles.push({ path: path.relative(engine, full), sha256: sha(await fs.readFile(full)) });
  }
}
for (const folder of ['briefs', 'runs', 'output']) await collect(path.join(engine, folder));
for (const filename of ['generate.mjs', 'serve.mjs']) protectedFiles.push({ path: filename, sha256: sha(await fs.readFile(path.join(engine, filename))) });
await writeJson('protected-before.json', protectedFiles);
await writeJson('baseline.json', { runId: baselineRun, responseId: baselineGeneration.artDirectionResponseId, plan: baseline });
await writeJson('brief.json', brief);

let calls = 0;
let responseMetadata = null;
const originalFetch = globalThis.fetch;
globalThis.fetch = async (url, options) => {
  if (++calls !== 1 || url !== 'https://api.openai.com/v1/responses' || options.method !== 'POST') throw new Error('Only one design request is allowed.');
  const request = JSON.parse(options.body);
  if (request.model !== model || request.max_output_tokens !== 7000 || request.store !== false || request.text.format.name !== 'greenfield_art_direction') throw new Error('Request differs from design-only configuration.');
  const reconstructedBaselineRequest = structuredClone(request);
  reconstructedBaselineRequest.input[0].content = baselinePrompts.artDirectionSystemPrompt;
  await writeJson('request.json', request);
  await writeJson('baseline-request-reconstructed.json', reconstructedBaselineRequest);
  await writeJson('experiment.json', {
    runId, baselineRun, model, engineSha256: sha(sourceBytes), briefSha256: sha(briefBytes),
    schemaSha256: sha(JSON.stringify(isolated.ART_DIRECTION_SCHEMA)),
    oldSystemPromptSha256: sha(baselinePrompts.artDirectionSystemPrompt), newSystemPromptSha256: sha(leanPrompt),
    changedRequestFields: ['input[0].content'], maxCreativeCalls: 1,
    baselineRequestNote: 'Reconstructed from saved prompt, matching brief and unchanged generateArtDirection function, not an archived wire request.',
    limitation: 'One new design-only sample against a saved sample; not a causal proof or a rendered quality assessment.'
  });
  console.log(JSON.stringify({ status: 'requesting-design-only', runId, model, oldPromptChars: baselinePrompts.artDirectionSystemPrompt.length, newPromptChars: leanPrompt.length }));
  const response = await originalFetch(url, options);
  const body = await response.clone().json();
  await writeJson('response.json', body);
  responseMetadata = { responseId: body.id, status: body.status, model: body.model, usage: body.usage };
  if (response.ok && body.status !== 'completed') throw new Error(`Incomplete response: ${body.status}`);
  return response;
};

let error = null;
try {
  const result = await isolated.generateArtDirection(apiKey, model, brief);
  await writeJson('art-direction.json', result.plan);
  console.log(JSON.stringify({ status: 'design-only-complete', runId, responseId: result.responseId, selected: result.selected }));
} catch (failure) {
  error = failure.message;
  console.error(`Design-only experiment stopped: ${error}`);
  process.exitCode = 1;
} finally {
  globalThis.fetch = originalFetch;
  const changed = [];
  for (const item of protectedFiles) {
    try { if (sha(await fs.readFile(path.join(engine, item.path))) !== item.sha256) changed.push(item.path); }
    catch { changed.push(item.path); }
  }
  await writeJson('result.json', { runId, calls, error, response: responseMetadata, protectedCount: protectedFiles.length, changedProtectedFiles: changed, websiteGenerated: false, imagesGenerated: false });
  if (changed.length) process.exitCode = 1;
  console.log(JSON.stringify({ runDir, calls, protectedCount: protectedFiles.length, changedProtectedFiles: changed }));
}
