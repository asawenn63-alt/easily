import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const projectId = String(process.argv[2] || "").trim();
if (!/^[0-9a-f-]{36}$/i.test(projectId)) throw new Error("project-id-required");

const record = JSON.parse(fs.readFileSync(path.join(root, "server", "data", "projects", `${projectId}.json`), "utf8"));
const document = record.draftDocument || record.document;
const creativeBrief = document?.page?.creativeBrief;
if (!creativeBrief) throw new Error("creative-brief-missing");

const response = await fetch("http://127.0.0.1:3847/api/v2/generate-site", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ creativeBrief }),
  signal: AbortSignal.timeout(900_000),
});
const result = await response.json();
const safeError = (entry) => ({
  source: entry?.source || null,
  keyword: entry?.keyword || entry?.code || null,
  instancePath: entry?.instancePath || null,
  sceneId: entry?.sceneId || null,
  nodeId: entry?.nodeId || null,
  message: entry?.message || null,
});

console.log(JSON.stringify({
  httpStatus: response.status,
  ok: result.ok === true,
  error: result.error || null,
  failureStage: result.failureStage || null,
  generationId: result.generationId || null,
  diagnostics: (result.diagnostics || []).map((entry) => ({
    stage: entry.stage,
    attempt: entry.attempt || null,
    ok: entry.ok === true,
    completeSkeleton: entry.completeSkeleton ?? null,
    errors: (entry.errors || []).map(safeError),
  })),
  errors: (result.errors || []).map(safeError),
  conflicts: (result.conflicts || []).map(safeError),
  sceneCount: result.sceneGraph?.scenes?.length || 0,
  nodeCount: (result.sceneGraph?.scenes || []).reduce((sum, scene) => sum + (scene.nodes?.length || 0), 0),
  compiledProfileCount: result.compiledProfiles?.length || 0,
}, null, 2));
