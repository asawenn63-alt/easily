/** Question Registry — stabil identitet och versionsuppslag för Question-objekt. */
(function (global) {
  "use strict";

  const byId = new Map();

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function register(question) {
    const contracts = global.QuestionEngineContracts;
    const validation = contracts && contracts.validateQuestion
      ? contracts.validateQuestion(question)
      : { ok: false, errors: ["contracts_missing"] };
    if (!validation.ok) return validation;
    if (byId.has(question.questionId)) {
      return { ok: false, errors: ["duplicate_questionId:" + question.questionId] };
    }
    byId.set(question.questionId, clone(question));
    return { ok: true, question: clone(question) };
  }

  function get(questionId, version) {
    const question = byId.get(String(questionId || ""));
    if (!question) return null;
    if (version != null && question.version !== version) return null;
    return clone(question);
  }

  function list() {
    return Array.from(byId.values()).map(clone);
  }

  function clear() {
    byId.clear();
  }

  global.QuestionRegistry = Object.freeze({ register: register, get: get, list: list, clear: clear });
})(typeof window !== "undefined" ? window : globalThis);
