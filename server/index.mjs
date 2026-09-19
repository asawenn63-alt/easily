/**
 * AI Site Studio — lokal backend (fil-lagring), projekt-API och publicering.
 *
 * Start: npm start  (från mappen server/)
 * Miljö: PORT (3847), SITE_STUDIO_API_KEY (valfritt — krävs för skrivande om satt)
 *
 * Statiska filer: ../ (själva studion)
 * Data: ./data/projects/<id>.json
 *
 * API (urval): GET/POST /api/projects, GET /api/projects/:id, GET …/thumbnail.svg,
 * PATCH …/:id, POST …/duplicate, POST …/save, POST …/publish, GET /api/public/:slug,
 * webbsidor: GET / (landing), GET /studio.html (arbetsyta), GET /create-v2 (Easily 2.0 prototyp),
 * GET /site/:slug (publicerat), GET /editor/:id (studio.html + id), GET /s/:slug → /site/…
 */
import http from "http";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

// Ladda .env från projektroten om Node inte redan har variablerna i miljön.
(function loadEnvFile() {
  const envPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", ".env");
  try {
    const content = fs.readFileSync(envPath, "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim();
      if (key && !(key in process.env)) process.env[key] = val;
    }
  } catch {
    /* .env saknas eller är oläslig — hoppa över */
  }
})();

import { createWebsiteDocumentRoutes } from "./website-document.mjs";
import { proposeDocumentEdit } from "./website-document-ai.mjs";
import { generateDocumentImage } from "./website-document-image-ai.mjs";
import { composeAboutCopy } from "./website-document-content-ai.mjs";
import { compileLayout as compileV2Layout } from "../v2/layout-compiler.mjs";
import { editFreeSceneSite, generateFreeSceneSite, reorderFreeScene, replaceFreeSceneAsset, replaceFreeSceneContent, updateFreeSceneNode } from "./free-scene-ai.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA = path.join(__dirname, "data");
const PROJECTS = path.join(DATA, "projects");
const V2_GENERATION_DIAGNOSTICS = path.join(DATA, "v2-generation-diagnostics.jsonl");
const PORT = Number(process.env.PORT) || 3847;
const API_KEY = (process.env.SITE_STUDIO_API_KEY || "").trim();
const OPENAI_API_KEY = (process.env.OPENAI_API_KEY || "").trim();
const EASILY_OPENAI_MODEL = (process.env.EASILY_OPENAI_MODEL || "gpt-5.6-luna").trim();
const GREENFIELD_DIR = path.join(ROOT, "greenfield-engine");
const GREENFIELD_OUTPUT = path.join(GREENFIELD_DIR, "output");
const websiteDocuments = createWebsiteDocumentRoutes({
  dataRoot: DATA, outputRoot: GREENFIELD_OUTPUT, root: ROOT,
  loadProject, requireWriteAuth, parseBody, sendJson,
  proposeEdit: input => proposeDocumentEdit({ ...input, apiKey: OPENAI_API_KEY, model: EASILY_OPENAI_MODEL }),
  generateImage: input => generateDocumentImage({ ...input, apiKey: OPENAI_API_KEY }),
  composeAbout: input => composeAboutCopy({ ...input, apiKey: OPENAI_API_KEY, model: EASILY_OPENAI_MODEL }),
  publishDocument: publishWebsiteDocument,
});

function ensureDirs() {
  fs.mkdirSync(PROJECTS, { recursive: true });
}

function projectPath(id) {
  return path.join(PROJECTS, `${id}.json`);
}

function readJsonSafe(p) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

function writeJsonAtomic(p, obj) {
  const tmp = p + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2), "utf8");
  fs.renameSync(tmp, p);
}

function appendV2GenerationDiagnostic(creativeBrief, result) {
  const safeErrors = (items = []) => items.slice(0, 80).map((entry) => ({
    source: entry?.source || null,
    keyword: entry?.keyword || entry?.code || null,
    instancePath: entry?.instancePath || null,
    sceneId: entry?.sceneId || null,
    nodeId: entry?.nodeId || null,
    message: entry?.message || null,
  }));
  const record = {
    at: new Date().toISOString(),
    briefSha256: crypto.createHash("sha256").update(JSON.stringify(creativeBrief || {})).digest("hex"),
    generationId: result?.generationId || null,
    ok: result?.ok === true,
    error: result?.error || null,
    failureStage: result?.failureStage || null,
    upstreamStatus: Number.isInteger(result?.status) ? result.status : null,
    upstreamCode: result?.upstreamCode || null,
    upstreamParam: result?.upstreamParam || null,
    detail: typeof result?.detail === "string" ? result.detail.slice(0, 1000) : null,
    diagnostics: (result?.diagnostics || []).map((entry) => ({
      stage: entry.stage || null,
      attempt: entry.attempt || null,
      ok: entry.ok === true,
      completeSkeleton: entry.completeSkeleton ?? null,
      responseId: entry.responseId || null,
      error: entry.error || null,
      status: entry.status || null,
      errors: safeErrors(entry.errors),
    })),
    errors: safeErrors(result?.errors),
    conflicts: safeErrors(result?.conflicts),
  };
  try {
    fs.mkdirSync(DATA, { recursive: true });
    fs.appendFileSync(V2_GENERATION_DIAGNOSTICS, JSON.stringify(record) + "\n", "utf8");
  } catch (error) {
    console.warn("[Easily V2 diagnostics] could not write diagnostic record:", error?.message || String(error));
  }
}

function escapeHtmlAttr(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

function isUuidLike(s) {
  return (
    typeof s === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s.trim())
  );
}

function normalizeRecordOnRead(rec) {
  if (!rec || typeof rec !== "object") return rec;
  if (rec.draftDocument == null && rec.document != null) rec.draftDocument = rec.document;
  if (rec.document == null && rec.draftDocument != null) rec.document = rec.draftDocument;
  if (rec.publishedDocument == null && rec.published?.document != null) {
    rec.publishedDocument = rec.published.document;
  }
  if (rec.publishedRevision == null && rec.published?.revision != null) {
    rec.publishedRevision = rec.published.revision;
  }
  if (rec.publishedAt == null && rec.published?.publishedAt != null) {
    rec.publishedAt = rec.published.publishedAt;
  }
  if (rec.title == null && rec.name != null) rec.title = rec.name;
  if (isGreenfieldRecord(rec)) {
    const draft = getDraftDocument(rec);
    if (draft?.page) {
      draft.page.template = "";
      draft.page.theme = "";
      draft.page.industry = "";
      draft.page.heroBgUrl = "";
    }
    const shellHero = draft?.sections?.hero?.content;
    if (shellHero) shellHero["hero-title"] = rec.name || "Webbplats";
    rec.summary = { template: null, theme: null, industry: null };
  }
  return rec;
}

function getDraftDocument(rec) {
  return rec?.draftDocument ?? rec?.document ?? null;
}

function getPublishedDocument(rec) {
  return rec?.publishedDocument ?? rec?.published?.document ?? null;
}

function isGreenfieldRecord(rec) {
  const draft = getDraftDocument(rec);
  return !!(
    rec?.greenfield?.previewPath ||
    draft?.meta?.generationEngine === "greenfield" ||
    draft?.meta?.greenfieldPreviewPath
  );
}

function findProjectRecordBySlug(slug) {
  const metas = listProjectMetas();
  const m = metas.find((x) => x.slug === slug);
  if (!m) return null;
  return loadProject(m.id);
}

function publishWebsiteDocument(projectId, revisionId) {
  const rec = loadProject(projectId);
  if (!rec) throw Object.assign(new Error('project-not-found'), { status: 404 });
  if (!rec.slug) rec.slug = uniqueSlugExcluding(slugify(rec.name || rec.title || 'sajt') || 'sajt', projectId);
  rec.updatedAt = new Date().toISOString();
  rec.websiteDocumentPublication = { revisionId, updatedAt: rec.updatedAt };
  saveProjectRecord(rec);
  const publicPath = `/site/${encodeURIComponent(rec.slug)}/`;
  return { slug: rec.slug, publicPath, liveUrl: publicPath, publishedRevisionId: revisionId };
}

function escapeJsonForHtmlScript(jsonStr) {
  return String(jsonStr).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}

function slugify(name) {
  const base = String(name || "sajt")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return base || "sajt";
}

function uniqueSlug(base) {
  let s = base;
  let n = 0;
  while (true) {
    const hit = listProjectMetas().find((m) => m.slug === s);
    if (!hit) return s;
    n += 1;
    s = `${base}-${n}`;
  }
}

/** Slug unik bland andra projekt än excludeId (för PATCH). */
function uniqueSlugExcluding(base, excludeId) {
  let s = base;
  let n = 0;
  while (true) {
    const hit = listProjectMetas().find((m) => m.slug === s && m.id !== excludeId);
    if (!hit) return s;
    n += 1;
    s = `${base}-${n}`;
  }
}

/** För genererad förhandsbild när inget sparat SVG finns. */
const THEME_PREVIEW_COLORS = {
  "minimal-white": { bg: "#ffffff", fg: "#1c1917", accent: "#3f3f3c" },
  "beige-lux": { bg: "#f8f7f3", fg: "#3a3228", accent: "#9a7224" },
  "black-gold": { bg: "#0a0a0a", fg: "#f5e6c8", accent: "#d4af37" },
  "modern-green": { bg: "#f7f8f5", fg: "#1e2620", accent: "#4f6644" },
  terracotta: { bg: "#f8f7f4", fg: "#2a1e1c", accent: "#6e4338" },
};

function escapeXml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function defaultThumbnailSvgFromRecord(rec) {
  if (isGreenfieldRecord(rec)) {
    const name = escapeXml((rec?.name || "AI-skapad webbplats").slice(0, 48));
    return `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200" viewBox="0 0 320 200">
  <rect width="320" height="200" fill="#f4f1eb"/>
  <rect x="18" y="18" width="284" height="164" rx="8" fill="#ffffff" stroke="#315d49" stroke-opacity="0.24"/>
  <text x="36" y="58" fill="#315d49" font-family="system-ui,sans-serif" font-size="11" font-weight="700">AI-SKAPAD WEBBPLATS</text>
  <text x="36" y="112" fill="#202622" font-family="system-ui,sans-serif" font-size="24" font-weight="650">${name}</text>
  <text x="36" y="151" fill="#526059" font-family="system-ui,sans-serif" font-size="12">Öppna för att se och redigera webbplatsen</text>
</svg>`;
  }
  const page = getDraftDocument(rec)?.page;
  const theme = page?.theme || "minimal-white";
  const colors = THEME_PREVIEW_COLORS[theme] || THEME_PREVIEW_COLORS["minimal-white"];
  const rawTitle =
    rec?.document?.sections?.hero?.content?.["hero-title"] || rec?.name || "Projekt";
  const title = escapeXml(rawTitle.slice(0, 72));
  const name = escapeXml((rec?.name || "").slice(0, 40));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200" viewBox="0 0 320 200">
  <defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" style="stop-color:${colors.bg};stop-opacity:1"/>
    <stop offset="100%" style="stop-color:${colors.accent};stop-opacity:0.25"/>
  </linearGradient></defs>
  <rect width="320" height="200" fill="url(#g)"/>
  <rect x="0" y="0" width="320" height="200" fill="${colors.bg}" fill-opacity="0.92"/>
  <text x="24" y="44" fill="${colors.accent}" font-family="system-ui,sans-serif" font-size="11" font-weight="600">Webb</text>
  <text x="24" y="118" fill="${colors.fg}" font-family="Georgia,serif" font-size="22">${title}</text>
  <text x="24" y="168" fill="${colors.fg}" fill-opacity="0.55" font-family="system-ui,sans-serif" font-size="12">${name}</text>
</svg>`;
}

function thumbnailSvgForRecord(rec) {
  if (!rec) return defaultThumbnailSvgFromRecord({});
  if (isGreenfieldRecord(rec)) return defaultThumbnailSvgFromRecord(rec);
  const t = rec.thumbnailSvg;
  if (typeof t === "string" && t.trim().startsWith("<svg")) return t.trim();
  return defaultThumbnailSvgFromRecord(rec);
}

function pageSummaryFromRecord(j) {
  if (isGreenfieldRecord(j)) {
    return { template: null, theme: null, industry: null };
  }
  const page = getDraftDocument(j)?.page;
  const s = j?.summary;
  return {
    template: s?.template ?? page?.template ?? null,
    theme: s?.theme ?? page?.theme ?? null,
    industry: s?.industry ?? page?.industry ?? null,
  };
}

function listProjectMetas() {
  ensureDirs();
  if (!fs.existsSync(PROJECTS)) return [];
  const out = [];
  for (const f of fs.readdirSync(PROJECTS)) {
    if (!f.endsWith(".json")) continue;
    const p = path.join(PROJECTS, f);
    const j = readJsonSafe(p);
    if (!j || !j.id) continue;
    const sum = pageSummaryFromRecord(j);
    out.push({
      id: j.id,
      name: j.name || "Namnlös",
      slug: j.slug || "",
      updatedAt: j.updatedAt || null,
      createdAt: j.createdAt || null,
      draftRevision: j.draftRevision ?? j.document?.meta?.draftRevision ?? null,
      thumbnailUrl: `/api/projects/${encodeURIComponent(j.id)}/thumbnail.svg`,
      ...sum,
      publishedRevision: j.publishedRevision ?? j.published?.revision ?? null,
      publishedAt: j.publishedAt ?? j.published?.publishedAt ?? null,
    });
  }
  out.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  return out;
}

function loadProject(id) {
  const p = projectPath(id);
  if (!fs.existsSync(p)) return null;
  const rec = readJsonSafe(p);
  if (rec) normalizeRecordOnRead(rec);
  return rec;
}

function saveProjectRecord(rec) {
  const draft = getDraftDocument(rec);
  if (draft) {
    rec.draftDocument = draft;
    rec.document = draft;
  }
  rec.updatedAt = new Date().toISOString();
  if (isGreenfieldRecord(rec)) {
    rec.summary = { template: null, theme: null, industry: null };
  } else if (draft?.page) {
    rec.summary = {
      template: draft.page.template || null,
      theme: draft.page.theme || null,
      industry: draft.page.industry || null,
    };
  }
  writeJsonAtomic(projectPath(rec.id), rec);
  return rec;
}

/** Accepterar rått dokument eller kuvert från SiteState.serializeForApi() */
function extractDocumentFromSaveBody(body) {
  if (!body || typeof body !== "object") return null;
  if (body.document && typeof body.document === "object") return body.document;
  return null;
}

/**
 * Sparar utkast (hela AppDocument). Ökar draftRevision; sätter meta på dokumentet.
 * @returns {{ ok: true, updatedAt: string, draftRevision: number } | { error: string, status: number }}
 */
function patchProjectMeta(id, body) {
  const rec = loadProject(id);
  if (!rec) return { error: "not-found", status: 404 };
  if (body.name != null) {
    const n = String(body.name).trim();
    if (n) rec.name = n;
  }
  if (body.slug != null) {
    const base = slugify(body.slug);
    if (base) {
      const s = uniqueSlugExcluding(base, id);
      rec.slug = s;
      const draft = getDraftDocument(rec);
      if (draft?.meta) draft.meta.slug = s;
    }
  }
  saveProjectRecord(rec);
  return { ok: true, project: rec };
}

function duplicateProjectRecord(id) {
  const rec = loadProject(id);
  if (!rec) return { error: "not-found", status: 404 };
  const newId = crypto.randomUUID();
  const document = JSON.parse(JSON.stringify(getDraftDocument(rec)));
  if (!document || typeof document !== "object") return { error: "missing-draft", status: 400 };
  const baseName = `${(rec.name || "Projekt").trim()} (kopia)`;
  const slug = uniqueSlug(slugify(`${rec.slug || "sajt"}-kopia`));
  const now = new Date().toISOString();
  if (!document.meta) document.meta = {};
  document.meta.siteId = newId;
  document.meta.slug = slug;
  document.meta.draftRevision = 1;
  document.meta.publishedRevision = null;
  document.meta.publishedAt = null;
  document.meta.lastSyncedAt = now;
  document.meta.updatedAt = now;
  const thumb = rec.thumbnailSvg;
  const newRec = {
    id: newId,
    name: baseName,
    title: baseName,
    slug,
    createdAt: now,
    updatedAt: now,
    draftRevision: 1,
    draftDocument: document,
    document,
    published: null,
    publishedDocument: null,
    publishedRevision: null,
    publishedAt: null,
  };
  if (typeof thumb === "string" && thumb.length < 24000) newRec.thumbnailSvg = thumb;
  saveProjectRecord(newRec);
  return { ok: true, id: newId, name: newRec.name, slug, createdAt: now, updatedAt: newRec.updatedAt, draftRevision: 1 };
}

function applyProjectSave(id, body) {
  const document = extractDocumentFromSaveBody(body);
  if (!document || typeof document !== "object") {
    return { error: "missing-document", status: 400 };
  }
  const rec = loadProject(id);
  if (!rec) return { error: "not-found", status: 404 };
  if (!document.meta) document.meta = {};
  const now = new Date().toISOString();
  const prev = Number(rec.draftRevision) || Number(document.meta.draftRevision) || 0;
  const draftRevision = prev + 1;
  rec.draftRevision = draftRevision;
  document.meta.siteId = id;
  document.meta.slug = rec.slug;
  document.meta.draftRevision = draftRevision;
  document.meta.updatedAt = now;
  document.meta.lastSyncedAt = now;
  const generationId = String(document.meta.visibleGenerationId || "");
  const trace = generationId && document.meta.generationTrace?.generations?.[generationId];
  if (trace && trace.generationId === generationId) {
    trace.status = "persisted";
    trace.updatedAt = now;
    trace.persistence = {
      ...(trace.persistence || {}),
      status: "persisted",
      projectId: id,
      draftRevision,
      persistedAt: now,
      error: "",
    };
    document.meta.activeGenerationId = generationId;
    document.meta.persistedGenerationId = generationId;
  }
  rec.draftDocument = document;
  rec.document = document;
  if (body && typeof body.thumbnailSvg === "string") {
    const raw = body.thumbnailSvg.trim();
    if (raw.length < 24000 && (raw.startsWith("<svg") || raw.startsWith("<?xml"))) {
      rec.thumbnailSvg = raw;
    }
  }
  saveProjectRecord(rec);
  return { ok: true, updatedAt: rec.updatedAt, draftRevision, generationId };
}

function requireWriteAuth(req) {
  if (!API_KEY) return true;
  const k = req.headers["x-api-key"];
  return k === API_KEY;
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let buf = "";
    req.on("data", (c) => (buf += c));
    req.on("end", () => {
      if (!buf) return resolve({});
      try {
        resolve(JSON.parse(buf));
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

function mimeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const m = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".ico": "image/x-icon",
    ".woff2": "font/woff2",
  };
  return m[ext] || "application/octet-stream";
}

function send(res, status, body, headers = {}) {
  const h = { "Cache-Control": "no-store", ...headers };
  if (typeof body === "string" && !h["Content-Type"]) h["Content-Type"] = "text/plain; charset=utf-8";
  res.writeHead(status, h);
  res.end(body);
}

function sendJson(res, status, obj) {
  send(res, status, JSON.stringify(obj), { "Content-Type": "application/json; charset=utf-8" });
}

function serveGreenfieldFile(res, slug, relativePath) {
  if (!/^[a-z][a-z0-9-]{1,50}$/.test(slug)) return send(res, 400, "Invalid project");
  const siteDir = path.join(GREENFIELD_OUTPUT, slug);
  const target = path.resolve(siteDir, relativePath || "index.html");
  if (target !== siteDir && !target.startsWith(`${siteDir}${path.sep}`)) return send(res, 403, "Forbidden");
  if (!fs.existsSync(target) || fs.statSync(target).isDirectory()) return send(res, 404, "Not found");
  const csp = "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'none'; font-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'self'";
  const stream = fs.createReadStream(target);
  res.writeHead(200, { "Content-Type": mimeFor(target), "Content-Security-Policy": csp, "X-Content-Type-Options": "nosniff", "Cache-Control": "no-store" });
  stream.pipe(res);
}

function serveStatic(req, res) {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === "/") pathname = "/index.html";
  const filePath = path.normalize(path.join(ROOT, pathname));
  if (!filePath.startsWith(ROOT)) return send(res, 403, "Forbidden");
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) return send(res, 404, "Not found");
  const stream = fs.createReadStream(filePath);
  res.writeHead(200, { "Content-Type": mimeFor(filePath), "Cache-Control": "no-store" });
  stream.pipe(res);
}

function sitePublicHtml(origin, slug, publishedDoc, pageTitle, opts) {
  opts = opts || {};
  const esc = (s) =>
    String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;");
  const payload = escapeJsonForHtmlScript(JSON.stringify(publishedDoc));
  const t = esc(String(pageTitle || slug || "Live").replace(/<[^>]+>/g, "").slice(0, 80));
  const previewBanner = opts.preview
    ? `<p class="studio-preview-banner" role="status">Förhandsgranskning — bara du ser detta tills du publicerar.</p>`
    : "";
  return `<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${t}</title>
  <base href="${esc(origin)}/" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,400&family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400&family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600&family=Manrope:wght@300;400;500;600&family=Outfit:wght@300;400;500;600&family=Playfair+Display:ital,wght@0,400;0,500;1,400&family=Space+Grotesk:wght@400;500;600&family=Syne:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="style.css" />
</head>
<body data-studio-mode="readonly" data-public-site="1" data-create-path="v2"${opts.preview ? ' data-preview-site="1"' : ""}>
  ${previewBanner}
  <script type="application/json" id="studio-published-json">${payload}</script>
  <main class="site-main" id="siteMain"></main>
  <footer class="site-footer" id="siteFooter" data-section="footer" data-section-label="Footer"></footer>
  <script src="js/v2-compiled-renderer.js?v=20260907free1"></script>
  <script src="js/render.js"></script>
  <script src="js/public-site-boot.js" defer></script>
</body>
</html>`;
}

async function handleApi(req, res, url) {
  const pathname = url.pathname;

  if (pathname === "/api/health") {
    return sendJson(res, 200, { ok: true, service: "ai-site-studio", aiConfigured: !!OPENAI_API_KEY, time: new Date().toISOString() });
  }

  if (pathname === "/api/v2/compile-layout" && req.method === "POST") {
    if (!requireWriteAuth(req)) return sendJson(res, 401, { ok: false, error: "unauthorized" });
    let body;
    try { body = await parseBody(req); }
    catch { return sendJson(res, 400, { ok: false, error: "invalid-json" }); }

    const result = compileV2Layout({
      sceneGraph: body?.sceneGraph,
      resolvedSceneGraph: body?.resolvedSceneGraph,
    });
    if (!result.ok) {
      return sendJson(res, 422, {
        ok: false,
        error: "layout-compilation-conflict",
        conflicts: result.conflicts,
        html: null,
        css: null,
      });
    }
    return sendJson(res, 200, result);
  }

  if (pathname === "/api/v2/generate-site" && req.method === "POST") {
    if (!requireWriteAuth(req)) return sendJson(res, 401, { ok: false, error: "unauthorized" });
    let body;
    try { body = await parseBody(req); }
    catch { return sendJson(res, 400, { ok: false, error: "invalid-json" }); }

    const result = await generateFreeSceneSite(body?.creativeBrief, {
      apiKey: OPENAI_API_KEY,
      model: EASILY_OPENAI_MODEL,
      imageOutputDir: path.join(ROOT, "assets", "generated"),
      imagePublicBase: "/assets/generated",
    });
    appendV2GenerationDiagnostic(body?.creativeBrief, result);
    const status = result.ok
      ? 200
      : result.error === "openai-not-configured"
        ? 503
        : result.error === "layout-compilation-conflict" || result.error === "free-scene-contract"
          ? 422
          : 502;
    return sendJson(res, status, result);
  }

  if (pathname === "/api/v2/edit-scene" && req.method === "POST") {
    if (!requireWriteAuth(req)) return sendJson(res, 401, { ok: false, error: "unauthorized" });
    let body;
    try { body = await parseBody(req); }
    catch { return sendJson(res, 400, { ok: false, error: "invalid-json" }); }

    const result = await editFreeSceneSite({
      creativeBrief: body?.creativeBrief,
      sceneGraph: body?.sceneGraph,
      instruction: body?.instruction,
      editContext: body?.editContext,
    }, {
      apiKey: OPENAI_API_KEY,
      model: EASILY_OPENAI_MODEL,
      imageOutputDir: path.join(ROOT, "assets", "generated"),
      imagePublicBase: "/assets/generated",
    });
    const status = result.ok
      ? 200
      : result.error === "openai-not-configured"
        ? 503
        : /conflict|contract|invalid-current-scene/.test(String(result.error || ""))
          ? 422
          : 502;
    return sendJson(res, status, result);
  }

  if (pathname === "/api/v2/reorder-scenes" && req.method === "POST") {
    if (!requireWriteAuth(req)) return sendJson(res, 401, { ok: false, error: "unauthorized" });
    let body;
    try { body = await parseBody(req); }
    catch { return sendJson(res, 400, { ok: false, error: "invalid-json" }); }
    const result = reorderFreeScene({
      sceneGraph: body?.sceneGraph,
      resolvedProfiles: body?.resolvedProfiles,
      sceneId: body?.sceneId,
      direction: body?.direction,
    });
    return sendJson(res, result.ok ? 200 : 422, result);
  }

  if (pathname === "/api/v2/replace-content" && req.method === "POST") {
    if (!requireWriteAuth(req)) return sendJson(res, 401, { ok: false, error: "unauthorized" });
    let body;
    try { body = await parseBody(req); }
    catch { return sendJson(res, 400, { ok: false, error: "invalid-json" }); }
    const result = replaceFreeSceneContent({
      sceneGraph: body?.sceneGraph,
      resolvedProfiles: body?.resolvedProfiles,
      contentId: body?.contentId,
      value: body?.value,
    });
    return sendJson(res, result.ok ? 200 : 422, result);
  }

  if (pathname === "/api/v2/replace-asset" && req.method === "POST") {
    if (!requireWriteAuth(req)) return sendJson(res, 401, { ok: false, error: "unauthorized" });
    let body;
    try { body = await parseBody(req); }
    catch { return sendJson(res, 400, { ok: false, error: "invalid-json" }); }
    const result = replaceFreeSceneAsset({
      sceneGraph: body?.sceneGraph,
      resolvedProfiles: body?.resolvedProfiles,
      assetId: body?.assetId,
      uri: body?.uri,
      mimeType: body?.mimeType,
      width: body?.width,
      height: body?.height,
    });
    return sendJson(res, result.ok ? 200 : 422, result);
  }

  if (pathname === "/api/v2/update-node" && req.method === "POST") {
    if (!requireWriteAuth(req)) return sendJson(res, 401, { ok: false, error: "unauthorized" });
    let body;
    try { body = await parseBody(req); }
    catch { return sendJson(res, 400, { ok: false, error: "invalid-json" }); }
    const result = updateFreeSceneNode({
      sceneGraph: body?.sceneGraph,
      resolvedProfiles: body?.resolvedProfiles,
      nodeId: body?.nodeId,
      scalePercent: body?.scalePercent,
      marginPx: body?.marginPx,
      backgroundColor: body?.backgroundColor,
      deleteNode: body?.deleteNode,
    });
    return sendJson(res, result.ok ? 200 : 422, result);
  }

  if (pathname === "/api/proxy-image" && req.method === "GET") {
    const target = url.searchParams.get("url");
    if (!target) return send(res, 400, "missing url");
    let parsed;
    try {
      parsed = new URL(target);
    } catch {
      return send(res, 400, "bad url");
    }
    const hostOk = /^(images\.unsplash\.com|picsum\.photos|fastly\.picsum\.photos)$/i.test(parsed.hostname);
    if (!hostOk) return send(res, 403, "host not allowed");
    try {
      const upstream = await fetch(target, {
        headers: { "User-Agent": "Easily-Studio/1", Accept: "image/*,*/*" },
        redirect: "follow",
        signal: AbortSignal.timeout(12000),
      });
      if (!upstream.ok) return send(res, upstream.status, "upstream " + upstream.status);
      const ct = upstream.headers.get("content-type") || "image/jpeg";
      const buf = Buffer.from(await upstream.arrayBuffer());
      return send(res, 200, buf, { "Content-Type": ct, "Cache-Control": "public, max-age=86400" });
    } catch (e) {
      console.warn("proxy-image", e);
      return send(res, 502, "proxy failed");
    }
  }

  if (pathname === "/api/projects" && req.method === "GET") {
    return sendJson(res, 200, { ok: true, projects: listProjectMetas() });
  }

  if (pathname === "/api/projects" && req.method === "POST") {
    if (!requireWriteAuth(req)) return sendJson(res, 401, { ok: false, error: "unauthorized" });
    let body = {};
    try {
      body = await parseBody(req);
    } catch {
      return sendJson(res, 400, { ok: false, error: "invalid-json" });
    }
    const id = crypto.randomUUID();
    const name = String(body.name || "Ny sajt").trim() || "Ny sajt";
    const slug = uniqueSlug(slugify(body.slug || name));
    const now = new Date().toISOString();
    const document = body.document || null;
    if (!document || typeof document !== "object") {
      return sendJson(res, 400, { ok: false, error: "missing-document" });
    }
    if (!document.meta) document.meta = {};
    document.meta.siteId = id;
    document.meta.slug = slug;
    document.meta.updatedAt = now;
    document.meta.lastSyncedAt = now;
    document.meta.draftRevision = 1;
    const rec = {
      id,
      name,
      title: name,
      slug,
      createdAt: now,
      updatedAt: now,
      draftRevision: 1,
      draftDocument: document,
      document,
      published: null,
      publishedDocument: null,
      publishedRevision: null,
      publishedAt: null,
    };
    saveProjectRecord(rec);
    return sendJson(res, 201, {
      ok: true,
      id,
      name,
      slug,
      createdAt: now,
      updatedAt: rec.updatedAt,
      draftRevision: 1,
    });
  }

  const pubMatch = pathname.match(/^\/api\/public\/([^/]+)$/);
  if (pubMatch && req.method === "GET") {
    const slug = decodeURIComponent(pubMatch[1]);
    const meta = listProjectMetas().find((m) => m.slug === slug);
    if (!meta) return sendJson(res, 404, { ok: false, error: "not-found" });
    const rec = loadProject(meta.id);
    const pubDoc = getPublishedDocument(rec);
    if (!pubDoc) return sendJson(res, 404, { ok: false, error: "not-published" });
    return sendJson(res, 200, {
      ok: true,
      slug: rec.slug,
      revision: rec.publishedRevision ?? rec.published?.revision ?? null,
      publishedAt: rec.publishedAt ?? rec.published?.publishedAt ?? null,
      document: pubDoc,
    });
  }

  const thumbSvg = pathname.match(/^\/api\/projects\/([^/]+)\/thumbnail\.svg$/);
  if (thumbSvg && req.method === "GET") {
    const id = decodeURIComponent(thumbSvg[1]);
    const rec = loadProject(id);
    if (!rec) return sendJson(res, 404, { ok: false, error: "not-found" });
    const svg = thumbnailSvgForRecord(rec);
    return send(res, 200, svg, { "Content-Type": "image/svg+xml; charset=utf-8", "Cache-Control": "no-store" });
  }

  const getProj = pathname.match(/^\/api\/projects\/([^/]+)$/);
  if (getProj && req.method === "GET") {
    const id = getProj[1];
    const rec = loadProject(id);
    if (!rec) return sendJson(res, 404, { ok: false, error: "not-found" });
    const sum = pageSummaryFromRecord(rec);
    const draft = getDraftDocument(rec);
    const pub = getPublishedDocument(rec);
    const projectOut = { ...rec, document: draft, draftDocument: draft };
    return sendJson(res, 200, {
      ok: true,
      project: projectOut,
      draftRevision: rec.draftRevision ?? draft?.meta?.draftRevision ?? null,
      publishedRevision: rec.publishedRevision ?? rec.published?.revision ?? null,
      publishedAt: rec.publishedAt ?? rec.published?.publishedAt ?? null,
      updatedAt: rec.updatedAt,
      createdAt: rec.createdAt,
      summary: sum,
      livePath: rec.slug ? `/site/${encodeURIComponent(rec.slug)}` : null,
    });
  }

  const postSave = pathname.match(/^\/api\/projects\/([^/]+)\/save$/);
  if (postSave && req.method === "POST") {
    if (!requireWriteAuth(req)) return sendJson(res, 401, { ok: false, error: "unauthorized" });
    const id = postSave[1];
    let body = {};
    try {
      body = await parseBody(req);
    } catch {
      return sendJson(res, 400, { ok: false, error: "invalid-json" });
    }
    const out = applyProjectSave(id, body);
    if (out.error) return sendJson(res, out.status, { ok: false, error: out.error });
    return sendJson(res, 200, {
      ok: true,
      updatedAt: out.updatedAt,
      draftRevision: out.draftRevision,
      generationId: out.generationId,
    });
  }

  const putDoc = pathname.match(/^\/api\/projects\/([^/]+)\/document$/);
  if (putDoc && req.method === "PUT") {
    if (!requireWriteAuth(req)) return sendJson(res, 401, { ok: false, error: "unauthorized" });
    const id = putDoc[1];
    let body = {};
    try {
      body = await parseBody(req);
    } catch {
      return sendJson(res, 400, { ok: false, error: "invalid-json" });
    }
    const out = applyProjectSave(id, body);
    if (out.error) return sendJson(res, out.status, { ok: false, error: out.error });
    return sendJson(res, 200, {
      ok: true,
      updatedAt: out.updatedAt,
      draftRevision: out.draftRevision,
      generationId: out.generationId,
      deprecated: "use POST /api/projects/:id/save",
    });
  }

  const patchProj = pathname.match(/^\/api\/projects\/([^/]+)$/);
  if (patchProj && req.method === "PATCH") {
    if (!requireWriteAuth(req)) return sendJson(res, 401, { ok: false, error: "unauthorized" });
    const id = patchProj[1];
    let body = {};
    try {
      body = await parseBody(req);
    } catch {
      return sendJson(res, 400, { ok: false, error: "invalid-json" });
    }
    const out = patchProjectMeta(id, body);
    if (out.error) return sendJson(res, out.status, { ok: false, error: out.error });
    return sendJson(res, 200, {
      ok: true,
      id,
      name: out.project.name,
      slug: out.project.slug,
      updatedAt: out.project.updatedAt,
    });
  }

  const dupProj = pathname.match(/^\/api\/projects\/([^/]+)\/duplicate$/);
  if (dupProj && req.method === "POST") {
    if (!requireWriteAuth(req)) return sendJson(res, 401, { ok: false, error: "unauthorized" });
    const id = dupProj[1];
    const out = duplicateProjectRecord(id);
    if (out.error) return sendJson(res, out.status, { ok: false, error: out.error });
    return sendJson(res, 201, {
      ok: true,
      id: out.id,
      name: out.name,
      slug: out.slug,
      createdAt: out.createdAt,
      updatedAt: out.updatedAt,
      draftRevision: out.draftRevision,
    });
  }

  const publish = pathname.match(/^\/api\/projects\/([^/]+)\/publish$/);
  if (publish && req.method === "POST") {
    if (!requireWriteAuth(req)) return sendJson(res, 401, { ok: false, error: "unauthorized" });
    const id = publish[1];
    if (websiteDocuments.store.state(id)) return sendJson(res, 409, { ok: false, error: "website-document-publication-not-connected" });
    const rec = loadProject(id);
    if (!rec) return sendJson(res, 404, { ok: false, error: "not-found" });
    const draft = getDraftDocument(rec);
    if (!draft) return sendJson(res, 400, { ok: false, error: "missing-draft" });
    const snap = JSON.parse(JSON.stringify(draft));
    const prev = Number(rec.publishedRevision) || Number(rec.published?.revision) || 0;
    const publishedRevision = prev + 1;
    const publishedAt = new Date().toISOString();
    if (!snap.meta) snap.meta = {};
    snap.meta.publishedRevision = publishedRevision;
    snap.meta.publishedAt = publishedAt;
    snap.documentVersion = (snap.documentVersion || 0) + 1;
    const wasPublished = !!(rec.publishedRevision || rec.published?.revision);
    if (!wasPublished) {
      const base = slugify(rec.slug || rec.name || "sajt");
      const nextSlug = uniqueSlugExcluding(base || "sajt", id);
      rec.slug = nextSlug;
      snap.meta.slug = nextSlug;
      const d = getDraftDocument(rec);
      if (d?.meta) d.meta.slug = nextSlug;
    }
    rec.publishedDocument = JSON.parse(JSON.stringify(snap));
    rec.publishedRevision = publishedRevision;
    rec.publishedAt = publishedAt;
    rec.published = {
      revision: publishedRevision,
      publishedAt,
      document: JSON.parse(JSON.stringify(snap)),
    };
    saveProjectRecord(rec);
    return sendJson(res, 200, {
      ok: true,
      slug: rec.slug,
      revision: publishedRevision,
      publishedRevision,
      publishedAt,
      publicPath: `/site/${encodeURIComponent(rec.slug)}`,
      liveUrl: `/site/${encodeURIComponent(rec.slug)}`,
    });
  }

  sendJson(res, 404, { ok: false, error: "unknown-route" });
}

const server = http.createServer(async (req, res) => {
  try {
    const host = req.headers.host || `localhost:${PORT}`;
    const url = new URL(req.url || "/", `http://${host}`);

    if (await websiteDocuments.handle(req, res, url)) return;

    if (url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url);
      return;
    }

    const origin = `${url.protocol}//${host}`.replace(/\/$/, "");

    const greenfieldSite = url.pathname.match(/^\/greenfield-site\/([a-z][a-z0-9-]{1,50})\/(.*)$/);
    if (greenfieldSite && req.method === "GET") {
      return serveGreenfieldFile(res, greenfieldSite[1], decodeURIComponent(greenfieldSite[2] || "index.html"));
    }

    const previewRoute = url.pathname.match(/^\/preview\/([^/]+)\/?$/);
    if (previewRoute && req.method === "GET") {
      const id = decodeURIComponent(previewRoute[1]);
      if (!isUuidLike(id)) {
        res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" });
        return res.end("Invalid preview id");
      }
      const rec = loadProject(id);
      const draft = rec ? getDraftDocument(rec) : null;
      if (!draft) {
        res.writeHead(404, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
        return res.end(
          `<!DOCTYPE html><html lang="sv"><head><meta charset="utf-8"><title>Hittades inte</title></head><body><p>Hemsidan hittades inte.</p></body></html>`
        );
      }
      const hero =
        draft?.sections?.hero?.content?.["hero-title"] || rec.title || rec.name || rec.slug || id;
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
      return res.end(sitePublicHtml(origin, rec.slug || id, draft, hero, { preview: true }));
    }

    const documentSiteFile = url.pathname.match(/^\/site\/([^/]+)\/(.*)$/);
    if (documentSiteFile && req.method === "GET") {
      const slug = decodeURIComponent(documentSiteFile[1]);
      const rec = findProjectRecordBySlug(slug);
      const documentState = rec ? websiteDocuments.store.state(rec.id) : null;
      if (documentState?.publishedRevisionId) {
        const filename = decodeURIComponent(documentSiteFile[2] || "index.html");
        try {
          const revision = websiteDocuments.store.revision(rec.id, documentState.publishedRevisionId);
          const bytes = websiteDocuments.store.file(rec.id, revision, filename);
          const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.gif': 'image/gif', '.woff': 'font/woff', '.woff2': 'font/woff2' };
          res.writeHead(200, { 'Content-Type': types[path.extname(filename)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; font-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'" });
          return res.end(bytes);
        } catch (error) {
          if (error.status === 404) return send(res, 404, 'Published file not found');
          throw error;
        }
      }
    }

    const siteSlug = url.pathname.match(/^\/site\/([^/]+)\/?$/);
    if (siteSlug && req.method === "GET") {
      const slug = decodeURIComponent(siteSlug[1]);
      const rec = findProjectRecordBySlug(slug);
      const documentState = rec ? websiteDocuments.store.state(rec.id) : null;
      if (documentState?.publishedRevisionId && !url.pathname.endsWith('/')) {
        res.writeHead(302, { Location: `/site/${encodeURIComponent(slug)}/`, 'Cache-Control': 'no-store' });
        return res.end();
      }
      const pub = rec ? getPublishedDocument(rec) : null;
      if (!pub) {
        res.writeHead(404, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
        return res.end(
          `<!DOCTYPE html><html lang="sv"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Inte publicerad</title><link rel="stylesheet" href="style.css" /></head><body data-studio-mode="readonly" data-public-site="1"><main class="site-main" style="padding:3rem 1.5rem"><div class="container"><h1 class="section-title">Sidan finns inte eller är inte publicerad ännu</h1><p>Slug: ${String(
            slug
          )
            .replace(/</g, "&lt;")
            .replace(/&/g, "&amp;")}</p></div></main></body></html>`
        );
      }
      const hero =
        pub?.sections?.hero?.content?.["hero-title"] || rec.title || rec.name || slug;
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
      return res.end(sitePublicHtml(origin, slug, pub, hero));
    }

    const editorRoute = url.pathname.match(/^\/editor\/([^/]+)\/?$/);
    if (editorRoute && req.method === "GET") {
      const id = decodeURIComponent(editorRoute[1]);
      if (!isUuidLike(id)) {
        res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" });
        return res.end("Invalid editor id");
      }
      const studioPath = path.join(ROOT, "studio.html");
      if (!fs.existsSync(studioPath)) return send(res, 404, "studio.html missing");
      let html = fs.readFileSync(studioPath, "utf8");
      if (!/<base\s/i.test(html)) {
        html = html.replace(/<head([^>]*)>/i, `<head$1>\n    <base href="/" />`);
      }
      html = html.replace(
        /<body([^>]*)>/i,
        `<body$1 data-studio-route="editor" data-studio-editor-id="${escapeHtmlAttr(id.trim())}">`
      );
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
      return res.end(html);
    }

    const slugView = url.pathname.match(/^\/s\/([^/]+)\/?$/);
    if (slugView && req.method === "GET") {
      const slug = decodeURIComponent(slugView[1]);
      res.writeHead(302, {
        Location: `/site/${encodeURIComponent(slug)}`,
        "Cache-Control": "no-store",
      });
      return res.end();
    }

    if ((url.pathname === "/create-v2" || url.pathname === "/create-v2/") && req.method === "GET") {
      const createV2Path = path.join(ROOT, "create-v2.html");
      if (!fs.existsSync(createV2Path)) return send(res, 404, "create-v2.html missing");
      let html = fs.readFileSync(createV2Path, "utf8");
      if (!/<base\s/i.test(html)) {
        html = html.replace(/<head([^>]*)>/i, `<head$1>\n    <base href="/" />`);
      }
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
      return res.end(html);
    }

    return serveStatic(req, res);
  } catch (e) {
    console.error(e);
    send(res, 500, "Server error");
  }
});

ensureDirs();
server.listen(PORT, () => {
  const landning = `http://localhost:${PORT}/`;
  console.log("");
  console.log("  AI Site Studio — en server: landning + arbetsyta + sparade hemsidor.");
  console.log(`  Börja här: öppna landning i webbläsaren → ”Börja skapa” → redigeraren.`);
  console.log(`  ${landning}`);
  console.log(`  (Samma adress som F5 uppdaterar — byt inte port om allt ska sitta ihop.)`);
  console.log("");
  console.log(`  Teknik: statiska filer → ${ROOT}`);
  console.log(`  Data (projekt): ${PROJECTS}`);
  console.log(
    "  Sidor: GET / (landning) | GET /studio.html | GET /create-v2 | GET /editor/:id | GET /preview/:id | GET /site/:slug | GET /s/:slug"
  );
  console.log(
    "  API (JSON): /api/health, /api/projects, /api/projects/:id/save, /api/projects/:id/publish med mera"
  );
  if (API_KEY) console.log("  SITE_STUDIO_API_KEY är aktiv — skrivande kräver header x-api-key.");
  console.log(
    "  Redo: servern lyssnar. Inget mer skrivs här tills någon laddar en sida (inget som laddar klart i bakgrunden)."
  );
  console.log("");
});
