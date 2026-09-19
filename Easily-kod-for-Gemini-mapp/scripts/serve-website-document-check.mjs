// Isolated manual browser check: real editor/store, disposable fixture, no AI.
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createWebsiteDocumentRoutes } from '../server/website-document.mjs';
import { proposeDocumentEdit } from '../server/website-document-ai.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'easily-document-browser-'));
const projectId = '00000000-0000-4000-8000-000000000001';
const outputRoot = path.join(temp, 'output');
const source = path.join(outputRoot, 'sample');
fs.mkdirSync(source, { recursive: true });
const files = {
  'index.html': '<!doctype html><html lang="sv"><head><link rel="stylesheet" href="styles.css"></head><body><h1>En rubrik att redigera</h1><h2>Bevara <em>min form</em></h2><p>Isolerat testdokument. Ingen kundsida påverkas.</p><script src="site.js"></script></body></html>',
  'styles.css': 'body{font-family:Arial;padding:32px}h1{color:navy}em{color:purple}',
  'site.js': 'document.body.dataset.loaded="yes";',
  'generation.json': JSON.stringify({ runId: 'browser-check' }),
};
for (const [name, value] of Object.entries(files)) fs.writeFileSync(path.join(source, name), value);
const sendJson = (res, status, data) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)); };
const routes = createWebsiteDocumentRoutes({
  dataRoot: path.join(temp, 'data'), outputRoot, root,
  loadProject: id => id === projectId ? { greenfield: { previewPath: '/greenfield-site/sample/index.html', runId: 'browser-check' } } : null,
  requireWriteAuth: () => true, sendJson,
  proposeEdit: process.env.DOCUMENT_REAL_AI === '1'
    ? input => proposeDocumentEdit({ ...input, apiKey: process.env.OPENAI_API_KEY, model: process.env.EASILY_OPENAI_MODEL || 'gpt-5.6-luna' })
    : async () => ({ message: 'Testsektionen är tillagd (simulerat AI-svar).', patches: [{ file: 'index.html', find: '<p>Isolerat testdokument. Ingen kundsida påverkas.</p>', replace: '<p>Isolerat testdokument. Ingen kundsida påverkas.</p><section><h2>Vanliga frågor</h2><p>En testsektion.</p></section>' }] }),
  parseBody: async req => { let body = ''; for await (const chunk of req) body += chunk; return JSON.parse(body || '{}'); },
});
const shell = `<!doctype html><html lang="sv"><head><title>Isolerad redigeringskontroll</title><link rel="stylesheet" href="/editor.css"><style>iframe{width:100%;height:70vh;border:1px solid #ccc}</style></head><body><h1>Redigeringskontroll – inga kundprojekt</h1><div id="studioChatCompose"><textarea id="welcomeBusinessDescription" aria-label="Skriv till AI"></textarea><button id="welcomeGenerateBtn">Skicka till AI</button></div><main id="studioPreviewPane"></main><script src="/setup.js"></script><script src="/editor.js"></script><script src="/start.js"></script></body></html>`;
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1:3878');
  if (await routes.handle(req, res, url)) return;
  const content = {
    '/': ['text/html', shell],
    '/editor.css': ['text/css', fs.readFileSync(path.join(root, 'css/website-document-editor.css'))],
    '/editor.js': ['text/javascript', fs.readFileSync(path.join(root, 'js/website-document-editor.js'))],
    '/setup.js': ['text/javascript', `window.SiteApi={request:async(url,options)=>{const response=await fetch(url,{method:options.method,headers:{'Content-Type':'application/json'},body:JSON.stringify(options.body)});const data=await response.json();if(!response.ok)throw new Error(data.error);return data;}};`],
    '/start.js': ['text/javascript', `WebsiteDocumentEditor.open('${projectId}','browser-check');`],
  }[url.pathname];
  if (!content) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': content[0] + '; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(content[1]);
});
server.listen(3878, '127.0.0.1', () => console.log('Browser check: http://127.0.0.1:3878/'));
function stop() { server.close(() => { fs.rmSync(temp, { recursive: true, force: true }); process.exit(0); }); }
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
