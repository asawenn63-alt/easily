import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const ENGINE_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_SLUG = String(process.argv[2] || process.env.EASILY_GREENFIELD_PROJECT || "quriasa").trim();
if (!/^[a-z][a-z0-9-]{1,50}$/.test(PROJECT_SLUG)) throw new Error("Ogiltigt projektnamn.");
const SITE_DIR = path.join(ENGINE_DIR, "output", PROJECT_SLUG);
const PORT = Number(process.env.EASILY_GREENFIELD_PORT || 3867);
const HOST = "127.0.0.1";
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".webp": "image/webp" };
const SITE_CSP = "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'none'; font-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'self'";

function wrapper() {
  return `<!doctype html><html lang="sv"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Easily Greenfield – ${PROJECT_SLUG}</title><style>html,body{margin:0;height:100%;background:#111}iframe{display:block;width:100%;height:100%;border:0}</style></head><body><iframe title="${PROJECT_SLUG} – isolerad AI-preview" sandbox="allow-scripts" src="/site/index.html"></iframe></body></html>`;
}

async function serveFile(urlPath, response) {
  const relative = decodeURIComponent(urlPath.slice("/site/".length) || "index.html");
  const resolved = path.resolve(SITE_DIR, relative);
  if (resolved !== SITE_DIR && !resolved.startsWith(`${SITE_DIR}${path.sep}`)) {
    response.writeHead(403).end("Forbidden");
    return;
  }
  try {
    const body = await fs.readFile(resolved);
    response.writeHead(200, { "Content-Type": TYPES[path.extname(resolved).toLowerCase()] || "application/octet-stream", "Content-Security-Policy": SITE_CSP, "X-Content-Type-Options": "nosniff", "Cache-Control": "no-store" });
    response.end(body);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not found");
  }
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${HOST}:${PORT}`);
  if (url.pathname === "/" || url.pathname === `/preview/${PROJECT_SLUG}/`) {
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Content-Security-Policy": "default-src 'self'; frame-src 'self'; style-src 'unsafe-inline'; object-src 'none'", "Cache-Control": "no-store" });
    response.end(wrapper());
    return;
  }
  if (url.pathname.startsWith("/site/")) return serveFile(url.pathname, response);
  response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not found");
});

server.listen(PORT, HOST, () => console.log(`[greenfield] preview: http://${HOST}:${PORT}/preview/${PROJECT_SLUG}/`));
