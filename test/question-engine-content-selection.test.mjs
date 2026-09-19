import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

function loadBrowserScript(context, relativePath) {
  const source = fs.readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");
  vm.runInContext(source, context, { filename: relativePath });
}

function questionEngineContext() {
  const context = vm.createContext({ console });
  loadBrowserScript(context, "js/question-engine-contracts.js");
  loadBrowserScript(context, "js/question-registry.js");
  loadBrowserScript(context, "js/question-catalog-core.js");
  loadBrowserScript(context, "js/answer-interpreter.js");
  const installed = context.QuestionCatalogCore.install();
  assert.equal(installed.ok, true);
  return context;
}

test("optional page content is one checkbox selection fact, not four extra questions", () => {
  const context = questionEngineContext();
  const question = context.QuestionRegistry.get("site.content.selection", 1);
  const interpreted = context.AnswerInterpreter.interpret({
    answerId: "answer-content-1",
    sessionId: "session-content-1",
    questionId: question.questionId,
    questionVersion: question.version,
    rawAnswer: JSON.stringify(["about", "gallery"]),
    expectedBriefRevision: 0,
  }, question, { customerFacts: {} });

  assert.equal(interpreted.ok, true);
  assert.equal(interpreted.facts.length, 1);
  assert.equal(interpreted.facts[0].targetField, "customerFacts.requestedContent");
  assert.equal(JSON.stringify(interpreted.facts[0].value), JSON.stringify(["about", "gallery"]));
});

test("design choice exposes genuinely different worlds while remaining one question", () => {
  const context = questionEngineContext();
  const question = context.QuestionRegistry.get("design.direction.theme", 1);
  assert.ok(question.inputSpec.options.includes("fri-designvarld"));
  assert.ok(question.inputSpec.options.includes("viktoriansk"));
  assert.ok(question.inputSpec.options.includes("brutalistisk"));
  assert.ok(question.inputSpec.options.includes("cinematisk"));
});

test("the fifth from-scratch answer produces a valid source fact", () => {
  const context = questionEngineContext();
  const question = context.QuestionRegistry.get("site.source.material", 1);
  const interpreted = context.AnswerInterpreter.interpret({
    answerId: "answer-source-1",
    sessionId: "session-source-1",
    questionId: question.questionId,
    questionVersion: question.version,
    rawAnswer: JSON.stringify({ mode: "from-scratch" }),
    expectedBriefRevision: 6,
  }, question, { customerFacts: {} });

  assert.equal(interpreted.ok, true);
  assert.equal(interpreted.facts.length, 1);
  assert.equal(interpreted.facts[0].targetField, "customerFacts.source.mode");
  assert.equal(interpreted.facts[0].value, "from-scratch");
});
