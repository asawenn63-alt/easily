import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { createWebsiteDocumentStore, createWebsiteDocumentRoutes, businessFactsFromProject, editHeading, editText, editLink, editButtonTarget, editElementStyle, editImagePresentation, headingSources, textSources, imageSources, editorHtml } from '../server/website-document.mjs';
import { proposeDocumentEdit } from '../server/website-document-ai.mjs';
import { generateDocumentImage } from '../server/website-document-image-ai.mjs';
import { composeAboutCopy, fallbackAboutCopy } from '../server/website-document-content-ai.mjs';

const project = '00000000-0000-4000-8000-000000000001';
const other = '00000000-0000-4000-8000-000000000002';
const html = '<!doctype html><html lang="sv"><head><link rel="stylesheet" href="styles.css"></head><body><h1 class="title">Hej <em>världen &amp; alla</em></h1><h2>En rubrik</h2><img src="assets/picture.svg"><script src="site.js"></script></body></html>';
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'easily-document-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const source = path.join(root, 'output', 'sample');
  fs.mkdirSync(path.join(source, 'assets'), { recursive: true });
  for (const [name, value] of Object.entries({ 'index.html': html, 'styles.css': 'h1{color:navy} em{color:purple}', 'site.js': 'document.body.dataset.ready="yes";', 'assets/picture.svg': '<svg xmlns="http://www.w3.org/2000/svg"/>', 'generation.json': JSON.stringify({ runId: 'test-run' }) })) fs.writeFileSync(path.join(source, name), value);
  const dataRoot = path.join(root, 'data');
  const storeRoot = path.join(dataRoot, 'website-documents');
  const store = createWebsiteDocumentStore(storeRoot);
  const initial = store.importGeneration(project, source, 'test-run');
  return { root, source, dataRoot, storeRoot, store, initial };
}
function change(baseRevision, text = 'Ny rubrik') { return { baseRevision, heading: '0', textIndex: 0, text }; }
const addSection = { message: 'Sektionen är tillagd.', patches: [{ file: 'index.html', find: '<h2>En rubrik</h2>', replace: '<h2>En rubrik</h2><section><h2>Vanliga frågor</h2><p>Kontakta oss för mer information.</p></section>' }] };
function aiChange(baseRevision) { return { baseRevision, requestId: other, instruction: 'Lägg till vanliga frågor utan att ändra min rubrik.' }; }

test('follow-up receives persisted conversation and current manual edits after reopening', async t => {
  const f = fixture(t);
  const first = await f.store.edit(project, { ...aiChange(f.initial.id), instruction: 'Lägg till en banderoll.' }, async () => ({ ...addSection, message: 'Banderollen är tillagd.' }));
  const manual = f.store.saveHeading(project, change(first.rev.id, 'Behåll min rubrik'));
  const reopened = createWebsiteDocumentStore(f.storeRoot);
  await reopened.edit(project, { baseRevision: manual.id, requestId: crypto.randomUUID(), instruction: 'en som rör sig' }, async input => {
    assert.deepEqual(input.history, [{ instruction: 'Lägg till en banderoll.', message: 'Banderollen är tillagd.', changed: true }]);
    assert.match(input.files['index.html'], /Behåll min rubrik/);
    return { message: 'Vilken hastighet vill du ha på banderollen?', patches: [] };
  });
  assert.equal(reopened.conversation(project).length, 2);
  assert.equal(reopened.state(project).headRevision, manual.id);
});
test('clarifications persist without website revisions, are replay-safe and reach the next turn', async t => {
  const f = fixture(t), request = aiChange(f.initial.id);
  const answer = { message: 'Vilken text ska banderollen ha?', patches: [] };
  await f.store.edit(project, request, async () => answer);
  await f.store.edit(project, request, () => assert.fail('replay must not call model'));
  const reopened = createWebsiteDocumentStore(f.storeRoot);
  assert.equal(reopened.state(project).revisionIds.length, 1);
  assert.equal(reopened.conversation(project).length, 1);
  await reopened.edit(project, { ...request, requestId: crypto.randomUUID(), instruction: 'Presenter och textil' }, async input => {
    assert.equal(input.history[0].message, answer.message);
    return { message: 'Tack!', patches: [] };
  });
  const result = await call(routes(f), `/api/website-documents/${project}/open`);
  assert.equal(result.body.conversation.length, 2);
  assert.match(result.body.conversationVersion, /^[a-f0-9]{64}$/);
});
test('legacy revision exchanges are restored without changing the website', async t => {
  const f = fixture(t);
  const edited = await f.store.edit(project, aiChange(f.initial.id), async () => addSection);
  const current = f.store.state(project); delete current.conversation;
  fs.writeFileSync(path.join(f.storeRoot, project, 'state.json'), JSON.stringify(current));
  const reopened = createWebsiteDocumentStore(f.storeRoot);
  assert.equal(reopened.conversation(project)[0].instruction, aiChange(f.initial.id).instruction);
  assert.equal(reopened.state(project).headRevision, edited.rev.id);
});
test('two concurrent no-change turns cannot overwrite conversation; stale chat version is rejected', async t => {
  const f = fixture(t);
  const original = (await call(routes(f), `/api/website-documents/${project}/open`)).body.conversationVersion;
  await assert.rejects(f.store.edit(project, aiChange(f.initial.id), async () => {
    await f.store.edit(project, { ...aiChange(f.initial.id), requestId: crypto.randomUUID() }, async () => ({ message: 'Nyaste svaret', patches: [] }));
    return { message: 'Föråldrat svar', patches: [] };
  }), /conversation-conflict/);
  assert.equal(f.store.conversation(project)[0].message, 'Nyaste svaret');
  await assert.rejects(f.store.edit(project, { ...aiChange(f.initial.id), conversationVersion: original }, () => assert.fail()), /conversation-conflict/);
});
test('conversation stays project-local and model history is bounded; client history is ignored', async t => {
  const f = fixture(t);
  f.store.importGeneration(other, f.source, 'other-run');
  for (let n = 0; n < 14; n++) await f.store.edit(project, { ...aiChange(f.initial.id), requestId: crypto.randomUUID(), instruction: `Fråga ${n}` }, async () => ({ message: `Svar ${n}`, patches: [] }));
  await f.store.edit(project, { ...aiChange(f.initial.id), requestId: crypto.randomUUID(), history: [{ instruction: 'forged' }] }, async input => {
    assert.equal(input.history.length, 12); assert.equal(input.history[0].instruction, 'Fråga 2');
    return { message: 'Okej', patches: [] };
  });
  await f.store.edit(other, { ...aiChange(f.store.state(other).headRevision), requestId: crypto.randomUUID() }, async input => {
    assert.deepEqual(input.history, []); return { message: 'Annat projekt', patches: [] };
  });
});
test('failed conversation persistence leaves both head and prior chat intact', async t => {
  const f = fixture(t), before = f.store.state(project);
  t.mock.method(fs, 'renameSync', () => { throw Error('disk failure'); });
  await assert.rejects(f.store.edit(project, aiChange(f.initial.id), async () => ({ message: 'Inte sparat', patches: [] })), /disk failure/);
  assert.deepEqual(f.store.state(project), before);
});
test('undo and redo create reversible revisions without changing the conversation', async t => {
  const f = fixture(t);
  const edited = f.store.saveHeading(project, change(f.initial.id));
  const beforeConversation = f.store.conversation(project);
  const undone = f.store.restore(project, { baseRevision: edited.id, targetRevision: f.initial.id, reason: 'undo' });
  assert.equal(f.store.file(project, undone, 'index.html').toString(), html);
  assert.equal(undone.parentRevision, edited.id);
  assert.equal(undone.operation.sourceRevision, edited.id);
  const redone = f.store.restore(project, { baseRevision: undone.id, targetRevision: edited.id, reason: 'redo' });
  assert.match(f.store.file(project, redone, 'index.html').toString(), /Ny rubrik/);
  assert.equal(redone.parentRevision, undone.id);
  assert.deepEqual(f.store.conversation(project), beforeConversation);
});
test('an arbitrary saved version can be restored and then undone', t => {
  const f = fixture(t);
  const first = f.store.saveHeading(project, change(f.initial.id, 'Första'));
  const second = f.store.saveHeading(project, change(first.id, 'Andra'));
  const restored = f.store.restore(project, { baseRevision: second.id, targetRevision: f.initial.id, reason: 'history' });
  assert.equal(f.store.file(project, restored, 'index.html').toString(), html);
  const reversed = f.store.restore(project, { baseRevision: restored.id, targetRevision: second.id, reason: 'undo' });
  assert.match(f.store.file(project, reversed, 'index.html').toString(), /Andra/);
});
test('restore rejects stale heads, invalid undo/redo and cross-project targets', t => {
  const f = fixture(t), edited = f.store.saveHeading(project, change(f.initial.id));
  const otherInitial = f.store.importGeneration(other, f.source, 'other-run');
  assert.throws(() => f.store.restore(project, { baseRevision: f.initial.id, targetRevision: f.initial.id, reason: 'undo' }), /revision-conflict/);
  assert.throws(() => f.store.restore(project, { baseRevision: edited.id, targetRevision: otherInitial.id, reason: 'history' }), /invalid-restore/);
  assert.throws(() => f.store.restore(project, { baseRevision: edited.id, targetRevision: f.initial.id, reason: 'redo' }), /invalid-redo/);
});
test('restore API returns version history and survives reopening', async t => {
  const f = fixture(t), r = routes(f);
  const saved = f.store.saveHeading(project, change(f.initial.id));
  const restored = await call(r, `/api/website-documents/${project}/restore`, { baseRevision: saved.id, targetRevision: f.initial.id, reason: 'undo' });
  assert.equal(restored.status, 200); assert.equal(restored.body.canUndo, true);
  assert.equal(restored.body.redoRevision, saved.id);
  assert.equal(restored.body.versions.at(-1).operation.reason, 'undo');
  assert.equal((await call(r, `/api/website-documents/${project}/open`)).body.revisionId, restored.body.revisionId);
});
test('publishing a selected saved version does not change the editable head', t => {
  const f = fixture(t), edited = f.store.saveHeading(project, change(f.initial.id));
  const published = f.store.publish(project, f.initial.id);
  assert.equal(published.id, f.initial.id);
  assert.equal(f.store.state(project).headRevision, edited.id);
  assert.equal(f.store.state(project).publishedRevisionId, f.initial.id);
  assert.equal(f.store.versions(project).find(item => item.published).id, f.initial.id);
  const reopened = createWebsiteDocumentStore(f.storeRoot);
  assert.equal(reopened.state(project).publishedRevisionId, f.initial.id);
});
test('publish rejects unknown and cross-project revisions', t => {
  const f = fixture(t), foreign = f.store.importGeneration(other, f.source, 'other-run');
  assert.throws(() => f.store.publish(project, foreign.id), /invalid-publish-version/);
  assert.throws(() => f.store.publish(project, crypto.randomUUID()), /invalid-publish-version/);
  assert.equal(f.store.state(project).publishedRevisionId, undefined);
});
test('publish API returns the public path and marks exactly the selected version', async t => {
  const f = fixture(t), selected = f.store.saveHeading(project, change(f.initial.id));
  let callback;
  const r = routes(f, { publishDocument: (projectId, revisionId) => { callback = { projectId, revisionId }; return { slug: 'sample', publicPath: '/site/sample/', liveUrl: '/site/sample/' }; } });
  const result = await call(r, `/api/website-documents/${project}/publish`, { revisionId: f.initial.id });
  assert.equal(result.status, 200); assert.equal(result.body.publicPath, '/site/sample/');
  assert.deepEqual(callback, { projectId: project, revisionId: f.initial.id });
  assert.equal(result.body.versions.find(item => item.published).id, f.initial.id);
  assert.equal(result.body.revisionId, f.initial.id);
  assert.equal(f.store.state(project).headRevision, selected.id);
});
test('publish requires authentication and configuration before changing state', async t => {
  const f = fixture(t);
  const missing = await call(routes(f), `/api/website-documents/${project}/publish`, { revisionId: f.initial.id });
  assert.equal(missing.status, 503); assert.equal(f.store.state(project).publishedRevisionId, undefined);
  const denied = await call(routes(f, { requireWriteAuth: () => false, publishDocument: () => assert.fail() }), `/api/website-documents/${project}/publish`, { revisionId: f.initial.id });
  assert.equal(denied.status, 401); assert.equal(f.store.state(project).publishedRevisionId, undefined);
});
test('image source parsing ignores raw content and instruments self-closing images safely', () => {
  const source = '<script>"<img src=\"fake.png\">"</script><template><img src="fake.png"></template><img alt="A" src="assets/a.png"/><img src=\'assets/b.webp\'>';
  assert.deepEqual(imageSources(source).map(item => [item.src, item.alt]), [['assets/a.png', 'A'], ['assets/b.webp', '']]);
  const view = editorHtml(source, other, project);
  assert.match(view, /<img alt="A" src="assets\/a\.png" data-easily-image="0"\/>/);
  assert.match(view, /<img src='assets\/b\.webp' data-easily-image="1">/);
});
test('paragraphs, buttons and standalone links are editable without flattening nested markup', () => {
  const source = '<script>"<p>fake</p>"</script><p>Hej <em>världen</em></p><button><span>Köp nu</span></button><a href="/mer">Läs mer</a>';
  assert.deepEqual(textSources(source).map(item => item.tag), ['p', 'button', 'a']);
  const changed = editText(source, { element: '0', textIndex: 1, text: 'alla & fler' });
  assert.match(changed, /<p>Hej <em>alla &amp; fler<\/em><\/p>/);
  assert.match(changed, /<button><span>Köp nu<\/span><\/button>/);
  const view = editorHtml(source, other, project);
  assert.match(view, /<p data-easily-text="0" data-easily-kind="p" data-easily-texts="[^"]+">/);
  assert.match(view, /<button data-easily-text="1" data-easily-kind="button" data-easily-texts="[^"]+">/);
  assert.match(view, /<a href="\/mer" data-easily-text="2" data-easily-kind="a" data-easily-texts="[^"]+">/);
  assert.doesNotMatch(view, />\s*data-easily-(?:text|kind|texts)=/);
});
test('ordinary text edit creates a reversible revision in the same document', async t => {
  const f = fixture(t);
  const withParagraph = await f.store.edit(project, aiChange(f.initial.id), async () => addSection);
  const edited = f.store.saveText(project, { baseRevision: withParagraph.rev.id, element: '0', textIndex: 0, text: 'Ny kontakttext' });
  assert.equal(edited.parentRevision, withParagraph.rev.id);
  assert.equal(edited.operation.type, 'text-edit');
  assert.match(f.store.file(project, edited, 'index.html').toString(), /<p>Ny kontakttext<\/p>/);
  const undone = f.store.restore(project, { baseRevision: edited.id, targetRevision: withParagraph.rev.id, reason: 'undo' });
  assert.match(f.store.file(project, undone, 'index.html').toString(), /Kontakta oss för mer information/);
});
test('link destinations are safely editable and versioned without changing link text', async t => {
  const source = '<a class="cta" href="#start">Läs mer</a><a class="other">Kontakt</a>';
  assert.equal(editLink(source, { element: '0', href: 'https://example.com/path?a=1&b=2' }), '<a class="cta" href="https://example.com/path?a=1&amp;b=2">Läs mer</a><a class="other">Kontakt</a>');
  assert.equal(editLink(source, { element: '1', href: 'mailto:test@example.com' }), '<a class="cta" href="#start">Läs mer</a><a class="other" href="mailto:test@example.com">Kontakt</a>');
  assert.equal(editLink(source, { element: '0', href: '' }), '<a class="cta">Läs mer</a><a class="other">Kontakt</a>');
  for (const href of ['javascript:alert(1)', 'data:text/html,x', '//evil.example']) assert.throws(() => editLink(source, { element: '0', href }), /invalid-link/);

  const f = fixture(t);
  const withLink = await f.store.edit(project, aiChange(f.initial.id), async () => ({ message: 'Länk tillagd', patches: [{ file: 'index.html', find: '<h2>En rubrik</h2>', replace: '<h2>En rubrik</h2><a href="#start">Läs mer</a>' }] }));
  const edited = f.store.saveLink(project, { baseRevision: withLink.rev.id, element: '0', href: '/kontakt' });
  assert.equal(edited.operation.type, 'link-edit');
  assert.match(f.store.file(project, edited, 'index.html').toString(), /<a href="\/kontakt">Läs mer<\/a>/);
});
test('font, size, color, weight and italic style are safely editable on the selected element', async t => {
  const source = '<h2 class="title" style="margin-top: 2rem; color: #111111">Rubrik</h2><p>Text</p>';
  const styled = editElementStyle(source, { kind: 'heading', key: '0', fontFamily: 'playful', fontSize: 42, color: '#cc0077', fontWeight: '700', fontStyle: 'italic' });
  assert.match(styled, /font-family: Segoe Print, Bradley Hand, Comic Sans MS, cursive/);
  assert.match(styled, /font-style: italic/);
  const reset = editElementStyle(styled, { kind: 'heading', key: '0', fontFamily: '', fontSize: '', color: '', fontWeight: '', fontStyle: '' });
  assert.match(reset, /style="margin-top: 2rem"/);
  for (const bad of [
    { fontFamily: 'url', fontSize: 16, color: '#000000', fontWeight: '400' },
    { fontFamily: '', fontSize: 500, color: '#000000', fontWeight: '400' },
    { fontFamily: '', fontSize: 16, color: 'red', fontWeight: '400' },
    { fontFamily: '', fontSize: 16, color: '#000000', fontWeight: 'bold' },
    { fontFamily: '', fontSize: 16, color: '#000000', fontWeight: '400', fontStyle: 'sideways' }
  ]) assert.throws(() => editElementStyle(source, { kind: 'heading', key: '0', ...bad }), /invalid-style-edit/);

  const f = fixture(t);
  const edited = f.store.saveStyle(project, { baseRevision: f.initial.id, kind: 'heading', key: '0', fontFamily: 'system', fontSize: 36, color: '#123456', fontWeight: '600' });
  assert.equal(edited.operation.type, 'style-edit');
  assert.match(f.store.file(project, edited, 'index.html').toString(), /font-size: 36px/);
});
test('button targets navigate safely and are saved with a single shared runtime', async t => {
  const source = '<button class="cta">Köp nu</button><button data-easily-href="#old">Mer</button>';
  assert.equal(editButtonTarget(source, { element: '0', href: '/butik' }), '<button class="cta" data-easily-href="/butik">Köp nu</button><button data-easily-href="#old">Mer</button>');
  assert.equal(editButtonTarget(source, { element: '1', href: '' }), '<button class="cta">Köp nu</button><button>Mer</button>');
  assert.throws(() => editButtonTarget(source, { element: '0', href: 'javascript:alert(1)' }), /invalid-link/);

  const f = fixture(t);
  const withButtons = await f.store.edit(project, aiChange(f.initial.id), async () => ({ message: 'Knappar tillagda', patches: [{ file: 'index.html', find: '<h2>En rubrik</h2>', replace: '<h2>En rubrik</h2><button>Köp</button><button>Kontakt</button>' }] }));
  const first = f.store.saveTarget(project, { baseRevision: withButtons.rev.id, kind: 'button', element: '0', href: '/butik' });
  assert.match(f.store.file(project, first, 'index.html').toString(), /data-easily-href="\/butik"/);
  assert.equal((f.store.file(project, first, 'site.js').toString().match(/easily-button-targets/g) || []).length, 1);
  const second = f.store.saveTarget(project, { baseRevision: first.id, kind: 'button', element: '1', href: '#kontakt' });
  assert.equal((f.store.file(project, second, 'site.js').toString().match(/easily-button-targets/g) || []).length, 1);
  assert.equal(second.operation.type, 'target-edit');
});
test('replacing an image saves exact bytes in the same document and survives reopening', t => {
  const f = fixture(t), bytes = Buffer.from('89504e470d0a1a0a00000000', 'hex');
  const dataUrl = `data:image/png;base64,${bytes.toString('base64')}`;
  const edited = f.store.saveImage(project, { baseRevision: f.initial.id, image: '0', dataUrl, fit: 'contain', position: 'center', alt: 'Mjuk nalle', clearCaption: true });
  assert.equal(edited.parentRevision, f.initial.id); assert.equal(edited.operation.type, 'image-edit');
  const result = f.store.file(project, edited, 'index.html').toString();
  const name = imageSources(result)[0].src;
  assert.match(name, /^assets\/user-[0-9a-f-]+\.png$/);
  assert.match(result, /style="object-fit: contain; object-position: center"/);
  assert.match(result, /alt="Mjuk nalle"/);
  assert.deepEqual(f.store.file(project, edited, name), bytes);
  assert.equal(edited.files['assets/picture.svg'], f.initial.files['assets/picture.svg']);
  const reopened = createWebsiteDocumentStore(f.storeRoot);
  assert.equal(reopened.state(project).headRevision, edited.id);
  assert.equal(reopened.versions(project).at(-1).operation.type, 'image-edit');
});
test('own image presentation shows the complete image and removes a stale generated caption', () => {
  const source = '<button><img class="photo" src="old.png" alt="Gammal beskrivning"><span class="image-note">Inspiration · papperscollage</span></button>';
  const edited = editImagePresentation(source, { image: '0', fit: 'contain', position: 'top', alt: 'Nalle', clearCaption: true });
  assert.match(edited, /style="object-fit: contain; object-position: top"/);
  assert.match(edited, /alt="Nalle"/);
  assert.doesNotMatch(edited, /papperscollage|image-note/);
});
test('image view and position are versioned in the same document', t => {
  const f = fixture(t);
  const edited = f.store.saveImageStyle(project, { baseRevision: f.initial.id, image: '0', fit: 'cover', position: 'bottom' });
  assert.equal(edited.operation.type, 'image-style-edit');
  assert.match(f.store.file(project, edited, 'index.html').toString(), /style="object-fit: cover; object-position: bottom"/);
  assert.throws(() => f.store.saveImageStyle(project, { baseRevision: edited.id, image: '0', fit: 'stretch', position: 'center' }), /invalid-image-style/);
});
test('image replacement rejects stale, invalid, oversized and missing-image writes', t => {
  const f = fixture(t), good = 'data:image/png;base64,aGVq';
  assert.throws(() => f.store.saveImage(project, { baseRevision: f.initial.id, image: '9', dataUrl: good }), /image-not-found/);
  assert.throws(() => f.store.saveImage(project, { baseRevision: f.initial.id, image: '0', dataUrl: 'data:image/svg+xml;base64,PHN2Zz4=' }), /invalid-image/);
  assert.throws(() => f.store.saveImage(project, { baseRevision: f.initial.id, image: '0', dataUrl: 'data:image/png;base64,***' }), /invalid-image/);
  assert.throws(() => f.store.saveImage(project, { baseRevision: f.initial.id, image: '0', dataUrl: 'x'.repeat(7_000_001) }), /invalid-image/);
  const saved = f.store.saveHeading(project, change(f.initial.id));
  assert.throws(() => f.store.saveImage(project, { baseRevision: f.initial.id, image: '0', dataUrl: good }), /revision-conflict/);
  assert.equal(f.store.state(project).headRevision, saved.id);
});
test('image API requires authentication and returns a reloadable revision', async t => {
  const f = fixture(t), dataUrl = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
  const r = routes(f), result = await call(r, `/api/website-documents/${project}/image`, { baseRevision: f.initial.id, image: '0', dataUrl });
  assert.equal(result.status, 200); assert.equal(result.body.versions.at(-1).operation.type, 'image-edit');
  assert.equal((await call(r, `/api/website-documents/${project}/open`)).body.revisionId, result.body.revisionId);
  const styled = await call(r, `/api/website-documents/${project}/image-style`, { baseRevision: result.body.revisionId, image: '0', fit: 'cover', position: 'right' });
  assert.equal(styled.status, 200);
  assert.equal(f.store.versions(project).at(-1).operation.type, 'image-style-edit');
  const denied = await call(routes(f, { requireWriteAuth: () => false }), `/api/website-documents/${project}/image`, { baseRevision: result.body.revisionId, image: '0', dataUrl });
  assert.equal(denied.status, 401);
});
test('GPT Image request uses the current image API and returns verified PNG bytes', async () => {
  const bytes = Buffer.from('generated image bytes');
  const result = await generateDocumentImage({ apiKey: 'test-only', prompt: 'En varm verkstadsbild', aspectRatio: 1.5, fetchImpl: async (url, options) => {
    const body = JSON.parse(options.body);
    assert.equal(url, 'https://api.openai.com/v1/images/generations');
    assert.equal(body.model, 'gpt-image-2');
    assert.equal(body.size, '1536x1024');
    assert.equal(body.quality, 'low');
    assert.match(body.prompt, /utan text|Do not add words/i);
    return { ok: true, headers: { get: key => key === 'x-request-id' ? 'image-request' : null }, json: async () => ({ data: [{ b64_json: bytes.toString('base64') }] }) };
  } });
  assert.deepEqual(result.bytes, bytes);
  assert.equal(result.mimeType, 'image/png');
  assert.equal(result.providerRequestId, 'image-request');
});
test('AI-generated image is saved as a reversible revision in the same document', async t => {
  const f = fixture(t), bytes = Buffer.from('generated image bytes');
  const requestId = crypto.randomUUID();
  const r = routes(f, { generateImage: async input => {
    assert.equal(input.prompt, 'Ljust foto av trä');
    return { bytes, mimeType: 'image/png', providerRequestId: 'provider-id' };
  } });
  const result = await call(r, `/api/website-documents/${project}/generate-image`, { baseRevision: f.initial.id, image: '0', prompt: 'Ljust foto av trä', aspectRatio: 1.4, requestId });
  assert.equal(result.status, 200);
  const rev = f.store.revision(project, result.body.revisionId);
  assert.equal(rev.operation.type, 'ai-image-edit');
  assert.equal(rev.operation.requestId, requestId);
  const name = imageSources(f.store.file(project, rev, 'index.html').toString())[0].src;
  assert.match(name, /^assets\/generated-[0-9a-f-]+\.png$/);
  assert.deepEqual(f.store.file(project, rev, name), bytes);
  assert.equal(f.store.file(project, f.initial, 'index.html').toString(), html);
  const undone = f.store.restore(project, { baseRevision: rev.id, targetRevision: f.initial.id, reason: 'undo' });
  assert.match(f.store.file(project, undone, 'index.html').toString(), /assets\/picture\.svg/);
});
test('AI image replay is idempotent and stale generation cannot replace a newer edit', async t => {
  const f = fixture(t), bytes = Buffer.from('generated image bytes'), requestId = crypto.randomUUID();
  let calls = 0;
  const r = routes(f, { generateImage: async () => { calls++; return { bytes, mimeType: 'image/png' }; } });
  const body = { baseRevision: f.initial.id, image: '0', prompt: 'En bild', requestId };
  const first = await call(r, `/api/website-documents/${project}/generate-image`, body);
  const replay = await call(r, `/api/website-documents/${project}/generate-image`, body);
  assert.equal(replay.body.revisionId, first.body.revisionId);
  assert.equal(calls, 1);

  const f2 = fixture(t), newer = { current: null };
  const stale = routes(f2, { generateImage: async () => {
    newer.current = f2.store.saveHeading(project, change(f2.initial.id, 'Nyare rubrik'));
    return { bytes, mimeType: 'image/png' };
  } });
  const result = await call(stale, `/api/website-documents/${project}/generate-image`, { ...body, baseRevision: f2.initial.id, requestId: crypto.randomUUID() });
  assert.equal(result.status, 409);
  assert.equal(f2.store.state(project).headRevision, newer.current.id);
  assert.match(f2.store.file(project, newer.current, 'index.html').toString(), /Nyare rubrik/);
});
test('AI image errors and missing configuration leave the document unchanged', async t => {
  const f = fixture(t), body = { baseRevision: f.initial.id, image: '0', prompt: 'En bild', requestId: crypto.randomUUID() };
  const missing = await call(routes(f), `/api/website-documents/${project}/generate-image`, body);
  assert.equal(missing.status, 503);
  const failed = await call(routes(f, { generateImage: async () => { throw Object.assign(new Error('image-generation-blocked'), { status: 400 }); } }), `/api/website-documents/${project}/generate-image`, body);
  assert.equal(failed.status, 400);
  assert.equal(f.store.state(project).headRevision, f.initial.id);
  await assert.rejects(generateDocumentImage({ apiKey: '', prompt: 'En bild', fetchImpl: () => assert.fail() }), /image-ai-not-configured/);
  await assert.rejects(generateDocumentImage({ apiKey: 'x', prompt: '', fetchImpl: () => assert.fail() }), /invalid-image-prompt/);
});

test('AI reads the manually edited head and saves a section in the SAME document; replay is idempotent', async t => {
  const f = fixture(t);
  const manual = f.store.saveHeading(project, change(f.initial.id, 'Min egen rubrik '));
  let calls = 0;
  const propose = async input => { calls++; assert.match(input.files['index.html'], /Min egen rubrik/); return addSection; };
  const edited = await f.store.edit(project, aiChange(manual.id), propose);
  assert.equal(edited.rev.parentRevision, manual.id);
  for (const name of ['styles.css', 'site.js', 'assets/picture.svg']) assert.equal(edited.rev.files[name], manual.files[name]);
  const reopened = createWebsiteDocumentStore(f.storeRoot);
  assert.equal(reopened.state(project).headRevision, edited.rev.id);
  const result = reopened.file(project, edited.rev, 'index.html').toString();
  assert.match(result, /Min egen rubrik/); assert.match(result, /Vanliga frågor/); assert.match(result, /<em>världen &amp; alla<\/em>/);
  assert.equal((await f.store.edit(project, aiChange(manual.id), propose)).rev.id, edited.rev.id);
  assert.equal(calls, 1);
});
test('AI cannot save an empty section shell', async t => {
  const f = fixture(t);
  await assert.rejects(f.store.edit(project, aiChange(f.initial.id), async () => ({
    message: 'FAQ tillagd.',
    patches: [{ file: 'index.html', find: '<h2>En rubrik</h2>', replace: '<h2>En rubrik</h2><section><h2>Vanliga frågor</h2></section>' }]
  })), /incomplete-ai-section/);
  assert.equal(f.store.state(project).headRevision, f.initial.id);
});
test('AI cannot overwrite a manual change that completed during the request', async t => {
  const f = fixture(t);
  let manual;
  await assert.rejects(f.store.edit(project, aiChange(f.initial.id), async () => {
    manual = f.store.saveHeading(project, change(f.initial.id)); return addSection;
  }), /revision-conflict/);
  assert.equal(f.store.state(project).headRevision, manual.id);
});
test('stale AI request is rejected before calling the model', async t => {
  const f = fixture(t); f.store.saveHeading(project, change(f.initial.id));
  await assert.rejects(f.store.edit(project, aiChange(f.initial.id), () => assert.fail('must not call AI')), /revision-conflict/);
});
test('failed, malformed, ambiguous and active-content AI patches leave the saved document unchanged', async t => {
  const f = fixture(t);
  for (const result of [null, { message: 'x', patches: [{ file: 'site.js', find: 'x', replace: 'x' }] },
    { message: 'x', patches: [{ file: 'index.html', find: 'not found', replace: 'x' }] },
    { message: 'x', patches: [{ file: 'index.html', find: 'rubrik', replace: '<script>alert(1)</script>' }] },
    { message: 'x', patches: [{ file: 'index.html', find: 'rubrik', replace: '<img src=x onerror=alert(1)>' }] },
    { message: 'x', patches: [{ file: 'index.html', find: 'h2', replace: 'h3' }] }]) {
    await assert.rejects(f.store.edit(project, aiChange(f.initial.id), async () => result));
    assert.equal(f.store.state(project).headRevision, f.initial.id);
  }
  await assert.rejects(f.store.edit(project, aiChange(f.initial.id), async () => { throw Error('network failure'); }));
  assert.equal(f.store.state(project).headRevision, f.initial.id);
});
test('AI answer without changes creates no revision', async t => {
  const f = fixture(t);
  const result = await f.store.edit(project, aiChange(f.initial.id), async () => ({ message: 'Vilken text vill du ha?', patches: [] }));
  assert.equal(result.changed, false); assert.equal(result.rev.id, f.initial.id);
});
test('edit API is authenticated and returns the saved head on reopen', async t => {
  const f = fixture(t), r = routes(f, { proposeEdit: async () => addSection });
  const result = await call(r, `/api/website-documents/${project}/edit`, aiChange(f.initial.id));
  assert.equal(result.status, 200); assert.equal(result.body.changed, true);
  assert.equal((await call(r, `/api/website-documents/${project}/open`)).body.revisionId, result.body.revisionId);
  const denied = routes(f, { requireWriteAuth: () => false, proposeEdit: () => assert.fail() });
  assert.equal((await call(denied, `/api/website-documents/${project}/edit`, aiChange(result.body.revisionId))).status, 401);
});
test('product registry saves without placement, then placement and removal are reversible', async t => {
  const f = fixture(t);
  const r = routes(f, { proposeEdit: async input => {
    const asset = input.assets.find(name => name.startsWith('assets/product-'));
    assert.ok(asset);
    assert.match(input.instruction, /Testprodukt/);
    return { message: 'Produkten är tillagd.', patches: [{
      file: 'index.html',
      find: '<h2>En rubrik</h2>',
      replace: `<h2>En rubrik</h2><section><h2>Testprodukt</h2><img src="${asset}" alt="Testbild"><p>En verifierad produktbeskrivning med tillräckligt innehåll.</p><p>249 kr</p></section>`
    }] };
  } });
  const imageBytes = Buffer.from('test-image-bytes');
  const result = await call(r, `/api/website-documents/${project}/product`, {
    baseRevision: f.initial.id,
    requestId: crypto.randomUUID(),
    name: 'Testprodukt',
    description: 'En verifierad produktbeskrivning med tillräckligt innehåll.',
    price: '249 kr',
    category: 'Presenter',
    imageAlt: 'Testbild',
    imageDataUrl: `data:image/png;base64,${imageBytes.toString('base64')}`
  });
  assert.equal(result.status, 200);
  assert.equal(result.body.conversation.length, 0);
  const rev = r.store.revision(project, result.body.revisionId);
  assert.equal(rev.operation.type, 'product-add');
  assert.ok(rev.files['products.json']);
  const asset = Object.keys(rev.files).find(name => name.startsWith('assets/product-'));
  assert.deepEqual(r.store.file(project, rev, asset), imageBytes);
  assert.doesNotMatch(r.store.file(project, rev, 'index.html').toString(), new RegExp(asset.replaceAll('.', '\\.')));
  const listed = await call(r, `/api/website-documents/${project}/products`, {});
  assert.equal(listed.body.products.length, 1);
  assert.equal(listed.body.products[0].name, 'Testprodukt');
  assert.equal(listed.body.products[0].placed, false);
  const placed = await call(r, `/api/website-documents/${project}/product-section`, { baseRevision: rev.id, conversationVersion: listed.body.conversationVersion, requestId: crypto.randomUUID(), productId: listed.body.products[0].id });
  assert.equal(placed.status, 200);
  const placedRev = r.store.revision(project, placed.body.revisionId);
  assert.equal(placedRev.operation.type, 'product-place');
  assert.match(r.store.file(project, placedRev, 'index.html').toString(), new RegExp(asset.replaceAll('.', '\\.')));
  const removed = await call(r, `/api/website-documents/${project}/product-remove`, { baseRevision: placedRev.id, productId: listed.body.products[0].id });
  assert.equal(removed.status, 200);
  const removedRev = r.store.revision(project, removed.body.revisionId);
  assert.equal(removedRev.operation.type, 'product-remove');
  assert.doesNotMatch(r.store.file(project, removedRev, 'index.html').toString(), /Testprodukt/);
  assert.equal((await call(r, `/api/website-documents/${project}/products`, {})).body.products.length, 0);
  const restored = await call(r, `/api/website-documents/${project}/restore`, { baseRevision: removedRev.id, targetRevision: placedRev.id, reason: 'undo' });
  assert.equal((await call(r, `/api/website-documents/${project}/products`, {})).body.products[0].name, 'Testprodukt');
  assert.equal(restored.status, 200);
});
test('invalid product form cannot call AI or change the document', async t => {
  const f = fixture(t), r = routes(f, { proposeEdit: () => assert.fail('invalid product must not call AI') });
  const result = await call(r, `/api/website-documents/${project}/product`, { baseRevision: f.initial.id, requestId: crypto.randomUUID(), name: '', description: '', price: '', imageDataUrl: 'bad' });
  assert.equal(result.status, 400);
  assert.equal(result.body.error, 'invalid-product');
  assert.equal(r.store.state(project).headRevision, f.initial.id);
});
test('Responses request uses structured patches and rejects incomplete/refused responses', async () => {
  const input = { apiKey: 'test-only', model: 'configured-model', instruction: 'Test', files: {}, assets: [], history: [{ instruction: 'Banderoll', message: 'Tillagd', changed: true }] };
  const answer = { status: 'completed', output: [{ content: [{ type: 'output_text', text: JSON.stringify(addSection) }] }] };
  const result = await proposeDocumentEdit({ ...input, fetchImpl: async (url, options) => {
    const request = JSON.parse(options.body);
    assert.equal(url, 'https://api.openai.com/v1/responses'); assert.equal(request.model, input.model);
    assert.equal(request.store, false); assert.equal(request.text.format.strict, true);
    assert.match(request.instructions, /complete and useful, never an empty shell/);
    assert.match(request.instructions, /three genuine question-and-answer pairs/);
    assert.match(request.instructions, /Do not add a moving banner/);
    assert.match(request.instructions, /instead of adding a duplicate/);
    assert.match(request.instructions, /never persist editing attributes/);
    assert.match(request.instructions, /must be a real img element/);
    assert.deepEqual(JSON.parse(request.input).recent_conversation, input.history);
    return { ok: true, json: async () => answer };
  } });
  assert.deepEqual(result, addSection);
  for (const payload of [{ status: 'incomplete' }, { status: 'completed', output: [{ content: [{ type: 'refusal' }] }] }]) {
    await assert.rejects(proposeDocumentEdit({ ...input, fetchImpl: async () => ({ ok: true, json: async () => payload }) }));
  }
});

test('import preserves exact HTML/CSS/JS/assets and excludes generation metadata', t => {
  const f = fixture(t);
  assert.equal(Object.keys(f.initial.files).length, 4);
  for (const name of Object.keys(f.initial.files)) assert.deepEqual(f.store.file(project, f.initial, name), fs.readFileSync(path.join(f.source, name)));
  assert.equal(f.initial.sourceRunId, 'test-run');
});
test('heading edit creates a child revision and preserves styling, script, assets and inline markup', t => {
  const f = fixture(t);
  const next = f.store.saveHeading(project, { ...change(f.initial.id), textIndex: 1, text: 'en ny värld' });
  assert.equal(next.parentRevision, f.initial.id);
  assert.equal(next.sourceRunId, 'test-run');
  assert.equal(f.store.file(project, next, 'index.html').toString(), html.replace('världen &amp; alla', 'en ny värld'));
  for (const name of ['styles.css', 'site.js', 'assets/picture.svg']) assert.equal(next.files[name], f.initial.files[name]);
  assert.equal(fs.readFileSync(path.join(f.source, 'index.html'), 'utf8'), html);
});
test('reopening the store loads the edited head, not generation output', t => {
  const f = fixture(t);
  const saved = f.store.saveHeading(project, change(f.initial.id));
  const reopened = createWebsiteDocumentStore(f.storeRoot);
  assert.equal(reopened.state(project).headRevision, saved.id);
  assert.equal(reopened.importGeneration(project, f.source, 'old-run').id, saved.id);
});
test('stale tab cannot overwrite current revision', t => {
  const f = fixture(t);
  const saved = f.store.saveHeading(project, change(f.initial.id));
  assert.throws(() => f.store.saveHeading(project, change(f.initial.id, 'Gammal flik')), { message: 'revision-conflict', status: 409 });
  assert.equal(f.store.state(project).headRevision, saved.id);
});
test('long generation cannot replace edits made after it started', t => {
  const f = fixture(t);
  const saved = f.store.saveHeading(project, change(f.initial.id));
  assert.throws(() => f.store.importGeneration(project, f.source, 'new-run', true, f.initial.id), { message: 'revision-conflict' });
  assert.equal(f.store.state(project).headRevision, saved.id);
});
test('text is escaped, not interpreted as markup', () => {
  const result = editHeading(html, change(null, '<img src=x onerror=alert(1)> &'));
  assert.ok(result.includes('&lt;img src=x onerror=alert(1)&gt; &amp;'));
  assert.equal(headingSources(result).length, 2);
});
test('invalid indices, missing headings and oversized text are rejected', () => {
  for (const bad of [{ textIndex: -1 }, { textIndex: 1.5 }, { heading: '999' }, { text: 'x'.repeat(4001) }]) assert.throws(() => editHeading(html, { ...change(null), ...bad }));
});
test('raw scripts and templates are not editable headings', () => {
  const source = '<script>const a="<h1>fake</h1>";</script><template><h2>fake</h2></template><!-- <h1>fake</h1> --><h3 title="a>b">Real</h3>';
  assert.equal(headingSources(source).length, 1);
  assert.equal(editHeading(source, change(null)), source.replace('Real', 'Ny rubrik'));
});
test('editor instrumentation is ephemeral, not stored in a revision', t => {
  const f = fixture(t);
  const editedView = editorHtml(html, other, f.initial.id);
  assert.ok(editedView.includes('data-easily-heading="0"'));
  assert.ok(editedView.includes('/_website-editor/bridge.js'));
  assert.equal(f.store.file(project, f.initial, 'index.html').toString(), html);
});
test('storefront templates are complete placeholders, versioned and editor-only until products exist', async t => {
  const f = fixture(t), r = routes(f);
  let revisionId = f.initial.id;
  const kinds = ['new-arrivals', 'sale', 'featured', 'favorites', 'campaign', 'categories'];
  for (const kind of kinds) {
    const added = await call(r, `/api/website-documents/${project}/storefront-section`, { baseRevision: revisionId, kind });
    assert.equal(added.status, 200);
    revisionId = added.body.revisionId;
  }
  const revision = f.store.revision(project, revisionId);
  const page = f.store.file(project, revision, 'index.html').toString('utf8');
  const css = f.store.file(project, revision, 'styles.css').toString('utf8');
  for (const kind of kinds) assert.match(page, new RegExp(`data-easily-storefront-section="${kind}"`));
  assert.match(page, /Produktnamn/);
  assert.match(page, /Kampanjrubrik/);
  assert.match(page, /Kategori 1/);
  assert.match(page, /assets\/easily-product-placeholder\.svg/);
  assert.equal((css.match(/\/\* easily-storefront-sections \*\//g) || []).length, 1);
  assert.match(css, /data-easily-placeholder-section="true"\]\{display:none!important\}/);
  assert.match(css, /color:inherit/);
  assert.doesNotMatch(css, /easily-storefront-(?:header h2|card h3|campaign__copy h2)\{[^}]*font:inherit/);
  assert.match(css, /aspect-ratio:3\/4;object-fit:contain/);
  assert.match(css, /easily-storefront-category img\{aspect-ratio:4\/3;object-fit:cover\}/);
  assert.match(page, /data-easily-item-count="4"/);
  assert.match(page, /data-easily-width="normal"/);
  assert.ok(revision.files['assets/easily-product-placeholder.svg']);
  const publicPage = await call(r, `/website-document/${project}/${revisionId}/index.html`, null, 'GET');
  assert.doesNotMatch(publicPage.body.toString(), /data-easily-editor-only/);
  const editorPage = await call(r, `/website-document/${project}/${revisionId}/index.html?edit=${other}`, null, 'GET');
  assert.match(editorPage.body.toString(), /data-easily-editor-only/);
  assert.match(editorPage.body.toString(), /display:block!important/);
  const duplicate = await call(r, `/api/website-documents/${project}/storefront-section`, { baseRevision: revisionId, kind: 'categories' });
  assert.equal(duplicate.status, 409);
  assert.equal(duplicate.body.error, 'storefront-section-exists');
  const undone = await call(r, `/api/website-documents/${project}/restore`, { baseRevision: revisionId, targetRevision: revision.parentRevision, reason: 'undo' });
  const undoneHtml = f.store.file(project, f.store.revision(project, undone.body.revisionId), 'index.html').toString('utf8');
  assert.doesNotMatch(undoneHtml, /data-easily-storefront-section="categories"/);
});
test('a storefront section can be removed without discarding later edits and the removal is undoable', async t => {
  const f = fixture(t), r = routes(f);
  const added = await call(r, `/api/website-documents/${project}/storefront-section`, { baseRevision: f.initial.id, kind: 'featured' });
  assert.equal(added.status, 200);
  const edited = await call(r, `/api/website-documents/${project}/heading`, change(added.body.revisionId, 'Senare rubrik'));
  assert.equal(edited.status, 200);
  const removed = await call(r, `/api/website-documents/${project}/storefront-remove`, { baseRevision: edited.body.revisionId, kind: 'featured' });
  assert.equal(removed.status, 200);
  const removedRevision = f.store.revision(project, removed.body.revisionId);
  const removedHtml = f.store.file(project, removedRevision, 'index.html').toString('utf8');
  assert.doesNotMatch(removedHtml, /data-easily-storefront-section="featured"/);
  assert.match(removedHtml, /Senare rubrik/);
  assert.equal(removedRevision.operation.type, 'storefront-section-remove');
  const restored = await call(r, `/api/website-documents/${project}/restore`, { baseRevision: removed.body.revisionId, targetRevision: removedRevision.parentRevision, reason: 'undo' });
  const restoredHtml = f.store.file(project, f.store.revision(project, restored.body.revisionId), 'index.html').toString('utf8');
  assert.match(restoredHtml, /data-easily-storefront-section="featured"/);
  assert.match(restoredHtml, /Senare rubrik/);
});
test('Om oss is a complete company section in the same editable and undoable document', async t => {
  const f = fixture(t), r = routes(f);
  const added = await call(r, `/api/website-documents/${project}/content-section`, { baseRevision: f.initial.id, kind: 'about' });
  assert.equal(added.status, 200);
  const revision = f.store.revision(project, added.body.revisionId);
  const page = f.store.file(project, revision, 'index.html').toString('utf8');
  const css = f.store.file(project, revision, 'styles.css').toString('utf8');
  assert.match(page, /data-easily-content-section="about"/);
  assert.match(page, /<h2>Om Exempel &amp; Co<\/h2>/);
  assert.match(page, /En varm butik med presenter och inredning\./);
  assert.doesNotMatch(page, /Berätta kort|Byt ut den här texten/);
  assert.match(page, /assets\/easily-content-placeholder\.svg/);
  assert.match(css, /\/\* easily-content-sections \*\//);
  assert.ok(revision.files['assets/easily-content-placeholder.svg']);
  const publicPage = await call(r, `/website-document/${project}/${revision.id}/index.html`, null, 'GET');
  assert.match(publicPage.body.toString(), /data-easily-content-section="about"/);
  const duplicate = await call(r, `/api/website-documents/${project}/content-section`, { baseRevision: revision.id, kind: 'about' });
  assert.equal(duplicate.status, 409);
  assert.equal(duplicate.body.error, 'content-section-exists');
  const removed = await call(r, `/api/website-documents/${project}/content-remove`, { baseRevision: revision.id, kind: 'about' });
  assert.equal(removed.status, 200);
  const removedRevision = f.store.revision(project, removed.body.revisionId);
  assert.doesNotMatch(f.store.file(project, removedRevision, 'index.html').toString('utf8'), /data-easily-content-section="about"/);
  const restored = await call(r, `/api/website-documents/${project}/restore`, { baseRevision: removed.body.revisionId, targetRevision: removedRevision.parentRevision, reason: 'undo' });
  assert.match(f.store.file(project, f.store.revision(project, restored.body.revisionId), 'index.html').toString('utf8'), /data-easily-content-section="about"/);
});
test('Om oss uses project answers, lets AI formulate them and can refresh the same section', async t => {
  const f = fixture(t);
  const seen = [];
  const r = routes(f, {
    composeAbout: async ({ facts }) => {
      seen.push(facts);
      return { eyebrow: 'Välkommen in', heading: `Om ${facts.businessName}`, paragraphs: [`${facts.description} Mysigt och varmt.`, `Version ${seen.length} av ett andra stycke utan nya företagsfakta.`] };
    }
  });
  const added = await call(r, `/api/website-documents/${project}/content-section`, { baseRevision: f.initial.id, kind: 'about' });
  const first = f.store.revision(project, added.body.revisionId);
  const firstHtml = f.store.file(project, first, 'index.html').toString('utf8');
  assert.equal(seen[0].businessName, 'Exempel & Co');
  assert.equal(seen[0].description, 'En varm butik med presenter och inredning.');
  assert.match(firstHtml, /Välkommen in/);
  assert.match(firstHtml, /Mysigt och varmt/);
  const refreshed = await call(r, `/api/website-documents/${project}/content-section`, { baseRevision: first.id, kind: 'about', refresh: true });
  const refreshedRevision = f.store.revision(project, refreshed.body.revisionId);
  assert.equal(refreshedRevision.operation.type, 'content-section-refresh');
  assert.equal((f.store.file(project, refreshedRevision, 'index.html').toString('utf8').match(/data-easily-content-section="about"/g) || []).length, 1);
});
test('business answers are extracted without treating design choices as facts', () => {
  const facts = businessFactsFromProject({ name: 'Fallback', draftDocument: { meta: { greenfieldAnswers: { name: 'Butik <ett>', location: 'Malmö', description: 'Handgjorda saker.', siteType: 'webbutik', design: 'varm-valkomnande' } } } });
  assert.deepEqual(facts, { businessName: 'Butik <ett>', location: 'Malmö', description: 'Handgjorda saker.', siteType: 'webbutik', designTone: 'varm-valkomnande' });
  assert.deepEqual(fallbackAboutCopy(facts), { eyebrow: 'Om verksamheten', heading: 'Om Butik <ett>', paragraphs: ['Välkommen till Butik <ett>.', 'Handgjorda saker.', 'Verksamheten finns i Malmö.'] });
});
test('about copy AI receives only the saved brief fields and falls back when unavailable', async () => {
  const facts = { businessName: 'Exempel', location: '', description: 'En liten butik.', siteType: 'webbutik', designTone: 'varm-valkomnande' };
  const generated = await composeAboutCopy({ apiKey: 'test', model: 'test-model', facts, fetchImpl: async (url, options) => {
    const body = JSON.parse(options.body);
    assert.equal(url, 'https://api.openai.com/v1/responses');
    assert.deepEqual(JSON.parse(body.input), facts);
    return { ok: true, json: async () => ({ status: 'completed', output: [{ content: [{ type: 'output_text', text: JSON.stringify({ eyebrow: 'Välkommen', heading: 'Om Exempel', paragraphs: ['En varm presentation.'] }) }] }] }) };
  } });
  assert.equal(generated.paragraphs[0], 'En varm presentation.');
  assert.deepEqual(await composeAboutCopy({ apiKey: '', model: 'test', facts }), fallbackAboutCopy(facts));
});
test('managed sections can be reordered, reopened and undone without rebuilding the page', async t => {
  const f = fixture(t), r = routes(f);
  const about = await call(r, `/api/website-documents/${project}/content-section`, { baseRevision: f.initial.id, kind: 'about' });
  const sale = await call(r, `/api/website-documents/${project}/storefront-section`, { baseRevision: about.body.revisionId, kind: 'sale' });
  const featured = await call(r, `/api/website-documents/${project}/storefront-section`, { baseRevision: sale.body.revisionId, kind: 'featured' });
  const moved = await call(r, `/api/website-documents/${project}/section-move`, { baseRevision: featured.body.revisionId, sectionType: 'storefront', kind: 'featured', direction: 'top' });
  assert.equal(moved.status, 200);
  const movedRevision = f.store.revision(project, moved.body.revisionId);
  const movedHtml = f.store.file(project, movedRevision, 'index.html').toString('utf8');
  assert.ok(movedHtml.indexOf('data-easily-storefront-section="featured"') < movedHtml.indexOf('data-easily-content-section="about"'));
  assert.ok(movedHtml.indexOf('data-easily-content-section="about"') < movedHtml.indexOf('data-easily-storefront-section="sale"'));
  const reopened = createWebsiteDocumentStore(f.storeRoot);
  assert.equal(reopened.state(project).headRevision, moved.body.revisionId);
  assert.ok(reopened.file(project, reopened.revision(project, moved.body.revisionId), 'index.html').toString('utf8').indexOf('data-easily-storefront-section="featured"') < reopened.file(project, reopened.revision(project, moved.body.revisionId), 'index.html').toString('utf8').indexOf('data-easily-content-section="about"'));
  const undone = await call(r, `/api/website-documents/${project}/restore`, { baseRevision: moved.body.revisionId, targetRevision: movedRevision.parentRevision, reason: 'undo' });
  const undoneHtml = f.store.file(project, f.store.revision(project, undone.body.revisionId), 'index.html').toString('utf8');
  assert.ok(undoneHtml.indexOf('data-easily-storefront-section="featured"') > undoneHtml.indexOf('data-easily-storefront-section="sale"'));
});
test('an AI-created team section can become the one managed Om oss section', async t => {
  const f = fixture(t), r = routes(f);
  const base = await f.store.edit(project, { baseRevision: f.initial.id, requestId: crypto.randomUUID(), instruction: 'Lägg till personal.' }, async () => ({
    message: 'Tillagd.',
    patches: [{ file: 'index.html', find: '</body>', replace: '<section class="team-section" id="team"><h2>Om företaget</h2><p>En fullständig presentation av företaget och människorna som arbetar här.</p><img src="assets/picture.svg" alt="Personal"></section></body>' }]
  }));
  const adopted = await call(r, `/api/website-documents/${project}/content-adopt`, { baseRevision: base.rev.id, kind: 'about' });
  assert.equal(adopted.status, 200);
  const revision = f.store.revision(project, adopted.body.revisionId);
  const page = f.store.file(project, revision, 'index.html').toString('utf8');
  assert.match(page, /<section class="team-section" id="om" data-easily-content-section="about">/);
  assert.doesNotMatch(page, /id="team"/);
  assert.equal(revision.operation.type, 'content-section-adopt');
  const duplicate = await call(r, `/api/website-documents/${project}/content-section`, { baseRevision: revision.id, kind: 'about' });
  assert.equal(duplicate.status, 409);
});
test('an existing storefront can adopt the shared portrait product frame as an undoable version', async t => {
  const f = fixture(t);
  const added = f.store.saveStorefrontSection(project, { baseRevision: f.initial.id, kind: 'sale' });
  const currentRule = '.easily-storefront-image{display:block;width:100%;aspect-ratio:3/4;object-fit:contain;background:#e8ebe9}';
  const oldRule = '.easily-storefront-image{display:block;width:100%;aspect-ratio:4/5;object-fit:cover;background:#e8ebe9}';
  const legacy = await f.store.edit(project, { baseRevision: added.id, requestId: crypto.randomUUID(), instruction: 'Simulera tidigare bildram.' }, async () => ({ message: 'Äldre ram.', patches: [{ file: 'styles.css', find: currentRule, replace: oldRule }] }));
  const updated = f.store.normalizeStorefrontFrame(project, { baseRevision: legacy.rev.id });
  const css = f.store.file(project, updated, 'styles.css').toString('utf8');
  assert.match(css, /\.easily-storefront-image\{[^}]*aspect-ratio:3\/4;object-fit:contain/);
  assert.doesNotMatch(css, /aspect-ratio:4\/5;object-fit:cover/);
  assert.match(css, /\/\* easily-shared-product-frame \*\/[\s\S]*\.product-image-wrap\{[^}]*aspect-ratio:3\/4/);
  assert.doesNotMatch(css, /easily-storefront-(?:header h2|card h3|campaign__copy h2)\{[^}]*font:inherit/);
  assert.equal(updated.operation.type, 'storefront-frame-update');
  const undone = f.store.restore(project, { baseRevision: updated.id, targetRevision: updated.parentRevision, reason: 'undo' });
  assert.match(f.store.file(project, undone, 'styles.css').toString('utf8'), /aspect-ratio:4\/5;object-fit:cover/);
});
test('mixed image and heading instrumentation stays inside the correct tags', () => {
  const source = '<main><img src="before.png"><p>Intro</p><h2>Rubrik</h2><img src="after.png"/><h3><span>Nästa</span></h3></main>';
  const view = editorHtml(source, other, project);
  assert.match(view, /<img src="before\.png" data-easily-image="0">/);
  assert.match(view, /<h2 data-easily-heading="0" data-easily-texts="[^"]+">Rubrik<\/h2>/);
  assert.match(view, /<img src="after\.png" data-easily-image="1"\/>/);
  assert.match(view, /<h3 data-easily-heading="1" data-easily-texts="[^"]+"><span>Nästa<\/span><\/h3>/);
  assert.doesNotMatch(view, />\s*data-easily-(?:heading|image)=/);
});
test('unchanged text creates no redundant revision', t => {
  const f = fixture(t);
  assert.equal(f.store.saveHeading(project, change(f.initial.id, 'Hej ')).id, f.initial.id);
  assert.equal(f.store.state(project).revisionIds.length, 1);
});
test('failed revision write leaves the previous head intact', t => {
  const f = fixture(t);
  const revisions = path.join(f.storeRoot, project, 'revisions');
  fs.renameSync(revisions, revisions + '.saved');
  fs.writeFileSync(revisions, 'simulate storage failure');
  assert.throws(() => f.store.saveHeading(project, change(f.initial.id)));
  assert.equal(f.store.state(project).headRevision, f.initial.id);
});
test('corrupt persisted state never silently resets to generation output', t => {
  const f = fixture(t);
  fs.writeFileSync(path.join(f.storeRoot, project, 'state.json'), '{broken');
  assert.throws(() => f.store.importGeneration(project, f.source, 'test-run'));
});
test('blob tampering is detected and project boundaries are enforced', t => {
  const f = fixture(t);
  assert.throws(() => f.store.state('../escape'));
  assert.throws(() => f.store.revision(other, f.initial.id));
  fs.writeFileSync(path.join(f.storeRoot, project, 'blobs', f.initial.files['index.html']), 'tampered');
  assert.throws(() => f.store.file(project, f.initial, 'index.html'), { message: 'document-integrity-failed' });
});

function routes(f, overrides = {}) {
  return createWebsiteDocumentRoutes({ dataRoot: f.dataRoot, outputRoot: path.join(f.root, 'output'), root: path.resolve(import.meta.dirname, '..'),
    loadProject: id => ({ id, name: 'Exempel & Co', greenfield: { previewPath: '/greenfield-site/sample/index.html', runId: 'test-run' }, draftDocument: { meta: { greenfieldAnswers: { siteType: 'webbutik', name: 'Exempel & Co', location: '', description: 'En varm butik med presenter och inredning.', design: 'varm-valkomnande' } } } }),
    requireWriteAuth: () => true, parseBody: async req => req.body,
    sendJson: (res, status, body) => { res.status = status; res.body = body; }, ...overrides });
}
async function call(r, pathname, body, method = 'POST') {
  const res = { writeHead(status, headers) { this.status = status; this.headers = headers; }, end(bytes) { this.body = bytes; } };
  await r.handle({ method, body }, res, new URL(pathname, 'http://127.0.0.1'));
  return res;
}
test('API open/save/reopen return the same saved document revision', async t => {
  const f = fixture(t), r = routes(f);
  const saved = await call(r, `/api/website-documents/${project}/heading`, change(f.initial.id));
  assert.equal(saved.status, 200);
  const reopened = await call(r, `/api/website-documents/${project}/open`);
  assert.equal(reopened.body.revisionId, saved.body.revisionId);
  const page = await call(r, saved.body.path, null, 'GET');
  assert.ok(page.body.toString().includes('Ny rubrik'));
  assert.ok(!page.body.toString().includes('_website-editor'));
  assert.match(page.headers['Content-Security-Policy'], /connect-src 'none'/);
});
test('source run mismatch is refused before import', async t => {
  const f = fixture(t), r = routes(f, { loadProject: () => ({ greenfield: { previewPath: '/greenfield-site/sample/index.html', runId: 'wrong-run' } }) });
  const result = await call(r, `/api/website-documents/${other}/open`);
  assert.equal(result.status, 409);
  assert.equal(result.body.error, 'generation-source-mismatch');
  assert.equal(r.store.state(other), null);
});
test('writes require authentication; guessed revisions and file traversal are not served', async t => {
  const f = fixture(t), r = routes(f, { requireWriteAuth: () => false });
  assert.equal((await call(r, `/api/website-documents/${project}/open`)).status, 401);
  assert.equal((await call(r, `/website-document/${other}/${f.initial.id}/index.html`, null, 'GET')).status, 404);
  assert.equal((await call(r, `/website-document/${project}/${f.initial.id}/assets%2f..%2fstate.json`, null, 'GET')).status, 404);
});

test('the live workspace exposes only directly insertable storefront sections', () => {
  const studio = fs.readFileSync(new URL('../studio.html', import.meta.url), 'utf8');
  const editor = fs.readFileSync(new URL('../js/website-document-editor.js', import.meta.url), 'utf8');
  assert.match(studio, /data-studio-tab="add"/);
  assert.match(studio, /id="websiteDocumentProductForm"/);
  assert.match(studio, /Produktnamn/);
  assert.match(studio, /Produktbild/);
  assert.match(studio, /data-studio-tab="shop"/);
  assert.match(studio, /Här lägger du in och hanterar butikens riktiga varor/);
  assert.match(editor, /Visa på sidan/);
  assert.match(editor, /storefrontCatalog/);
  assert.match(editor, /contentCatalog/);
  assert.match(editor, /Webbsida/);
  assert.match(editor, /Placering: längst ned på startsidan/);
  assert.match(editor, /Lägg till direkt/);
  assert.match(editor, /Visa och redigera/);
  for (const section of ['Nyheter', 'Rea', 'Utvalda produkter', 'Våra favoriter', 'Kampanj', 'Kategorier']) assert.match(editor, new RegExp(section));
  assert.match(editor, /data-storefront-kind/);
  assert.match(editor, /\/storefront-section/);
  assert.match(editor, /scroll-storefront/);
  assert.match(studio, />AI-hjälp</);
  assert.match(studio, />Ändra själv</);
  assert.match(studio, /AI arbetar med/);
  assert.match(editor, /showAddedStorefrontChoices/);
  assert.match(editor, /recoverSectionAdd/);
  assert.match(editor, /retrySectionAdd/);
  assert.match(editor, /Tillbaka till alla sektioner/);
  assert.match(editor, /resetAddPanelScroll/);
  assert.match(editor, /Anpassa med AI/);
  assert.match(editor, /följer webbplatsens färger och typsnitt/);
  assert.match(editor, /data-easily-storefront-section/);
  const bridge = fs.readFileSync(new URL('../js/website-document-bridge.js', import.meta.url), 'utf8');
  assert.match(bridge, /scrollIntoView/);
  assert.match(bridge, /scroll-position/);
  assert.match(bridge, /restore-scroll/);
  assert.match(editor, /restoreScrollY/);
  assert.match(bridge, /scrollY:/);
  assert.match(editor, /Handskrivet/);
  assert.match(editor, /Kursiv/);
  assert.match(editor, /Skriv direkt på sidan/);
  assert.match(bridge, /storefrontKinds/);
  assert.match(bridge, /contentKinds/);
  assert.match(bridge, /Ta bort sektion/);
  assert.match(bridge, /Redigera sektion/);
  assert.match(editor, /\/section-move/);
  for (const action of ['Flytta högst upp', 'Flytta upp', 'Flytta ner', 'Flytta längst ner']) assert.match(editor, new RegExp(action));
  assert.match(editor, /\/storefront-remove/);
  assert.doesNotMatch(editor, /title\.textContent = 'Förslag för din sida'/);
  assert.match(editor, /data-document-add-label/);
  assert.doesNotMatch(studio, /websiteDocumentAddReview/);
  assert.doesNotMatch(studio, /Kontrollera valet och fyll/);
  assert.doesNotMatch(studio, /Uppgifter eller önskemål/);
  for (const unfinished of ['Meny', 'Delningslänkar', 'Kontaktuppgifter och öppettider']) assert.doesNotMatch(editor, new RegExp(unfinished));
  assert.match(editor, /chatMessage\('Du: ' \+ displayInstruction\)/);
  assert.match(editor, /turn\.displayInstruction \|\| turn\.instruction/);
  assert.doesNotMatch(editor, /typeof instructionOverride === 'string'\) input\.value = instruction/);
});
