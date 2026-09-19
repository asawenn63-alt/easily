/**
 * Question Engine — frysta kärnkontrakt och runtime-validering.
 * Ingen state-, UI- eller Creative Director-logik.
 */
(function (global) {
  "use strict";

  const OPERATIONS = Object.freeze(["set", "append", "remove", "qualify"]);
  const POLARITIES = Object.freeze(["positive", "negative"]);
  const STATUSES = Object.freeze(["accepted", "pending", "rejected"]);
  const EVIDENCE_SOURCES = Object.freeze(["answer_text", "selected_option", "uploaded_asset"]);

  function isObject(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
  }

  function isStableId(value) {
    return typeof value === "string" && /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)+$/.test(value);
  }

  function isBriefPath(value) {
    return typeof value === "string" && /^[a-z][A-Za-z0-9]*(?:\.[a-z][A-Za-z0-9]*)+$/.test(value);
  }

  function validateQuestion(question) {
    const errors = [];
    if (!isObject(question)) return { ok: false, errors: ["question"] };
    if (!isStableId(question.questionId)) errors.push("questionId");
    if (!Number.isInteger(question.version) || question.version < 1) errors.push("version");
    if (!isObject(question.prompt) || !String(question.prompt.text || "").trim()) errors.push("prompt.text");
    if (!isObject(question.inputSpec) || !String(question.inputSpec.type || "").trim()) errors.push("inputSpec.type");
    if (!Array.isArray(question.targetFields) || !question.targetFields.length) errors.push("targetFields");
    else {
      question.targetFields.forEach(function (path, index) {
        if (!isBriefPath(path)) errors.push("targetFields[" + index + "]");
      });
    }
    if (!isObject(question.extractionSchema)) errors.push("extractionSchema");
    if (!isObject(question.interpretationPolicy)) errors.push("interpretationPolicy");
    if (!Array.isArray(question.validationRules)) errors.push("validationRules");
    if (!Array.isArray(question.nextQuestion)) errors.push("nextQuestion");
    if (!Array.isArray(question.completionContribution)) errors.push("completionContribution");
    return { ok: errors.length === 0, errors: errors };
  }

  function validateAnswerEnvelope(answer) {
    const errors = [];
    if (!isObject(answer)) return { ok: false, errors: ["answer"] };
    if (!String(answer.answerId || "").trim()) errors.push("answerId");
    if (!String(answer.sessionId || "").trim()) errors.push("sessionId");
    if (!isStableId(answer.questionId)) errors.push("questionId");
    if (!Number.isInteger(answer.questionVersion) || answer.questionVersion < 1) errors.push("questionVersion");
    if (!Number.isInteger(answer.expectedBriefRevision) || answer.expectedBriefRevision < 0) {
      errors.push("expectedBriefRevision");
    }
    return { ok: errors.length === 0, errors: errors };
  }

  function validateFactCandidate(fact) {
    const errors = [];
    if (!isObject(fact)) return { ok: false, errors: ["fact"] };
    if (!String(fact.factId || "").trim()) errors.push("factId");
    if (!isBriefPath(fact.targetField)) errors.push("targetField");
    if (!OPERATIONS.includes(fact.operation)) errors.push("operation");
    if (typeof fact.confidence !== "number" || fact.confidence < 0 || fact.confidence > 1) errors.push("confidence");
    if (!Array.isArray(fact.evidence) || !fact.evidence.length) errors.push("evidence");
    if (!POLARITIES.includes(fact.polarity)) errors.push("polarity");
    if (!STATUSES.includes(fact.status)) errors.push("status");
    return { ok: errors.length === 0, errors: errors };
  }

  global.QuestionEngineContracts = Object.freeze({
    OPERATIONS: OPERATIONS,
    POLARITIES: POLARITIES,
    STATUSES: STATUSES,
    EVIDENCE_SOURCES: EVIDENCE_SOURCES,
    isStableId: isStableId,
    isBriefPath: isBriefPath,
    validateQuestion: validateQuestion,
    validateAnswerEnvelope: validateAnswerEnvelope,
    validateFactCandidate: validateFactCandidate,
  });
})(typeof window !== "undefined" ? window : globalThis);
