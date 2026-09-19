import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const g = { console, JSON, Object, Array, String, Number, Boolean, Map, Set, RegExp, Error };
const load = (rel) => vm.runInNewContext(fs.readFileSync(path.join(root, rel), "utf8"), g, { filename: rel });
const assert = (ok, msg) => { if (!ok) throw new Error(msg); };

["question-engine-contracts", "question-registry", "question-catalog-core", "question-router", "answer-interpreter", "brief-patch-engine"]
  .forEach((name) => load(`js/${name}.js`));

assert(g.QuestionCatalogCore.install().ok, "registration failed");
assert(g.QuestionRegistry.list().length === 7, "expected seven questions");
assert(!g.QuestionRegistry.register(g.QuestionCatalogCore.BUSINESS_IDENTITY_NAME).ok, "duplicate accepted");

const q = g.QuestionRegistry.get("business.identity.name", 1);
const doc = { page: { creativeBrief: { briefVersion: "1.0", businessFacts: {} } } };
const siteQuestion = g.QuestionRegistry.get("site.intent.type", 1);
const siteAnswer = { answerId: "site-a1", sessionId: "s1", questionId: siteQuestion.questionId,
  questionVersion: siteQuestion.version, rawAnswer: "foretag", submittedAt: "2026-08-16T18:59:00Z", expectedBriefRevision: 0 };
const siteResult = g.AnswerInterpreter.interpret(siteAnswer, siteQuestion, doc.page.creativeBrief);
assert(siteResult.ok && siteResult.facts[0].evidence[0].source === "selected_option", "site type evidence missing");
assert(g.BriefPatchEngine.apply(doc, siteQuestion, siteAnswer, siteResult.facts).revision === 1, "site type commit failed");
assert(doc.page.creativeBrief.customerFacts.siteType === "foretag", "site type missing");
const answer = { answerId: "a1", sessionId: "s1", questionId: q.questionId, questionVersion: q.version,
  rawAnswer: "  Lundgrens Måleri  ", submittedAt: "2026-08-16T19:00:00Z", expectedBriefRevision: 1 };
const before = JSON.stringify(doc);
const result = g.AnswerInterpreter.interpret(answer, q, doc.page.creativeBrief);
assert(result.ok && result.facts.length === 1, "interpretation failed");
assert(JSON.stringify(doc) === before, "interpreter mutated state");
assert(result.facts[0].confidence === 0.99, "confidence wrong");
assert(result.facts[0].evidence[0].quote === "Lundgrens Måleri", "evidence missing");
assert(g.BriefPatchEngine.apply(doc, q, answer, result.facts).revision === 2, "commit failed");
assert(doc.page.creativeBrief.customerFacts.businessName === "Lundgrens Måleri", "fact missing");
assert(doc.page.creativeBrief.provenance["customerFacts.businessName"].length === 1, "provenance missing");
assert(!g.BriefPatchEngine.apply(doc, q, answer, result.facts).ok, "stale revision accepted");

const answer2 = { ...answer, answerId: "a2", rawAnswer: "Malmö Måleri AB", expectedBriefRevision: 2 };
const conflict = g.AnswerInterpreter.interpret(answer2, q, doc.page.creativeBrief);
assert(conflict.facts[0].status === "pending", "conflict not pending");
assert(g.BriefPatchEngine.apply(doc, q, answer2, conflict.facts).pending === 1, "pending fact missing");
assert(doc.page.creativeBrief.customerFacts.businessName === "Lundgrens Måleri", "pending overwrote accepted fact");
assert(doc.page.creativeBrief.revision === 3, "pending revision missing");

const offerQuestion = g.QuestionRegistry.get("business.offer.core", 1);
const routed = g.QuestionRouter.resolve(q, doc.page.creativeBrief);
assert(routed.question.questionId === "business.offer.core", "next question missing");
const offerAnswer = { answerId: "a3", sessionId: "s1", questionId: offerQuestion.questionId,
  questionVersion: 1, rawAnswer: "Målar lägenheter för privatpersoner i Malmö.",
  submittedAt: "2026-08-16T19:02:00Z", expectedBriefRevision: 3 };
const offer = g.AnswerInterpreter.interpret(offerAnswer, offerQuestion, doc.page.creativeBrief);
assert(offer.ok && offer.facts.length === 2, "multiple facts not extracted");
assert(g.BriefPatchEngine.apply(doc, offerQuestion, offerAnswer, offer.facts).accepted === 2, "multiple facts not committed");
assert(doc.page.creativeBrief.customerFacts.offer.summary === offerAnswer.rawAnswer, "offer missing");
assert(doc.page.creativeBrief.customerFacts.audience.primary === "privatpersoner i Malmö", "audience missing");

console.log("PASS question-engine vertical slice");
console.log({ questionId: offerQuestion.questionId, briefRevision: 4, businessName: doc.page.creativeBrief.customerFacts.businessName,
  uncertainties: Object.keys(doc.page.creativeBrief.uncertainties).length });
