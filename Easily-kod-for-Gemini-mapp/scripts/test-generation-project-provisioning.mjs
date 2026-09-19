import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const createdPayloads = [];
const syncedUrls = [];
const rememberedIds = [];
let state = {
  meta: {},
  page: {
    creativeBrief: {
      answers: [
        { questionId: "business.identity.name", rawAnswer: "QuriÅsadesign" },
        { questionId: "design.direction.theme", rawAnswer: "varm men sober" },
      ],
    },
  },
  sections: {},
};

const clone = (value) => JSON.parse(JSON.stringify(value));
const context = {
  console,
  JSON,
  Promise,
  document: { getElementById: () => null, documentElement: { dataset: {} } },
  localStorage: { removeItem() {} },
  sessionStorage: { removeItem() {}, setItem() {} },
  SiteState: {
    get: () => clone(state),
    patch: (mutator) => { const next = clone(state); mutator(next); state = next; },
    save() {},
    rememberLastProjectId: (id) => rememberedIds.push(id),
    STORAGE_KEY: "test-document",
    SESSION_PROJECT_KEY: "test-project",
  },
  SiteApi: {
    getApiBase: () => "http://127.0.0.1:3847",
    createProject: async (payload) => {
      createdPayloads.push(clone(payload));
      return {
        ok: true,
        id: "project-provisioned-once",
        slug: "quriasadesign",
        draftRevision: 1,
        updatedAt: "2026-08-24T12:00:00.000Z",
      };
    },
  },
  EditorEngine: {
    syncProjectUrl: (id) => syncedUrls.push(id),
    resetHistoryForDocument() {},
  },
};
context.window = context;
context.globalThis = context;

vm.runInNewContext(
  fs.readFileSync(path.join(root, "js/project-isolation.js"), "utf8"),
  context,
  { filename: "js/project-isolation.js" },
);

const before = clone(state.page.creativeBrief);
const first = await context.ProjectIsolation.ensureCurrentDocumentProject({
  name: "QuriÅsadesign",
  source: "unit-test",
});
const second = await context.ProjectIsolation.ensureCurrentDocumentProject({
  name: "Ska inte skapa ett nytt projekt",
  source: "unit-test-repeat",
});

assert.equal(first.created, true);
assert.equal(second.created, false);
assert.equal(first.projectId, "project-provisioned-once");
assert.equal(state.meta.siteId, "project-provisioned-once");
assert.equal(state.meta.slug, "quriasadesign");
assert.deepEqual(state.page.creativeBrief, before, "the five-question brief must survive project provisioning unchanged");
assert.deepEqual(createdPayloads[0].document.page.creativeBrief, before, "server project must receive the collected brief");
assert.equal(createdPayloads.length, 1, "retries must reuse the attached project instead of creating duplicates");
assert.deepEqual(syncedUrls, ["project-provisioned-once"]);
assert.deepEqual(rememberedIds, ["project-provisioned-once"]);

console.log("PASS project provisioning preserves the brief and creates exactly one durable project");
