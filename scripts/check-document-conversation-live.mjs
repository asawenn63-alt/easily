// Opt-in live regression check. Uses disposable files, never a customer's website.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { createWebsiteDocumentStore } from '../server/website-document.mjs';
import { proposeDocumentEdit } from '../server/website-document-ai.mjs';

if (!process.env.OPENAI_API_KEY) throw Error('OPENAI_API_KEY required');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'easily-chat-regression-'));
try {
  const source = path.join(temp, 'source'); fs.mkdirSync(source);
  const originalHtml = '<!doctype html><html lang="sv"><head><link rel="stylesheet" href="styles.css"></head><body><h1>Min manuellt sparade rubrik</h1><section class="intro"><h2>Inspiration</h2><p>Behåll denna del oförändrad.</p></section><section class="category-banner" aria-label="Sortiment"><p>Present · Porslin · Textil</p></section><script src="site.js"></script></body></html>';
  const originalCss = 'body{font-family:Arial}.intro{padding:24px}.category-banner{overflow:hidden;padding:16px;background:#eee}.category-banner p{margin:0;white-space:nowrap}';
  for (const [name, value] of Object.entries({ 'index.html': originalHtml, 'styles.css': originalCss, 'site.js': '' })) fs.writeFileSync(path.join(source, name), value);
  const id = crypto.randomUUID(), store = createWebsiteDocumentStore(path.join(temp, 'docs'));
  const initial = store.importGeneration(id, source, 'isolated-test');
  // Seed the already completed exchange, then recreate the store as on reload.
  await store.edit(id, { baseRevision: initial.id, requestId: crypto.randomUUID(), instruction: 'Kan jag få en banderoll med present, porslin, textil?' }, async () => ({ message: 'Banderollen med present, porslin och textil finns på sidan.', patches: [] }));
  const reopened = createWebsiteDocumentStore(path.join(temp, 'docs'));
  const result = await reopened.edit(id, { baseRevision: initial.id, requestId: crypto.randomUUID(), instruction: 'en som rör sig' }, input => proposeDocumentEdit({ ...input, apiKey: process.env.OPENAI_API_KEY, model: process.env.EASILY_OPENAI_MODEL || 'gpt-4o' }));
  assert.equal(result.changed, true, 'follow-up must edit the banner, not ask what "en" means');
  const css = reopened.file(id, result.rev, 'styles.css').toString();
  const html = reopened.file(id, result.rev, 'index.html').toString();
  assert.ok(html.includes('<h1>Min manuellt sparade rubrik</h1>'));
  assert.ok(html.includes('<section class="intro"><h2>Inspiration</h2><p>Behåll denna del oförändrad.</p></section>'));
  assert.ok(css.includes('.intro{padding:24px}'));
  assert.match(css, /\.category-banner[^{}]*\{[^}]*animation\s*:/);
  assert.match(css, /prefers-reduced-motion/);
  assert.equal(reopened.conversation(id).length, 2);
  console.log('PASS: live follow-up animated the banner, preserved the heading and intro, and retained both exchanges after reopening.');
  console.log(result.message);
} finally { fs.rmSync(temp, { recursive: true, force: true }); }
