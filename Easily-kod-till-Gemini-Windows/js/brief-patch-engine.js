/** Brief Patch Engine — enda skrivvägen för Question Engine-kundfakta. */
(function (global) {
  "use strict";
  function clone(v) { return v == null ? v : JSON.parse(JSON.stringify(v)); }
  function ensureLiveBrief(brief) {
    const b = clone(brief) || {};
    if (!Number.isInteger(b.revision) || b.revision < 0) b.revision = 0;
    if (!b.customerFacts || typeof b.customerFacts !== "object") b.customerFacts = {};
    if (!b.customerConstraints || typeof b.customerConstraints !== "object") b.customerConstraints = {};
    if (!b.uncertainties || typeof b.uncertainties !== "object") b.uncertainties = {};
    if (!b.provenance || typeof b.provenance !== "object") b.provenance = {};
    if (!b.derived || typeof b.derived !== "object") b.derived = { basedOnRevision: 0, readiness: "insufficient" };
    return b;
  }
  function apply(doc, question, answer, facts) {
    if (!doc || !doc.page) return { ok: false, errors: ["doc"] };
    if (!question || question.questionId !== answer.questionId) return { ok: false, errors: ["question_mismatch"] };
    const current = ensureLiveBrief(doc.page.creativeBrief);
    if (current.revision !== answer.expectedBriefRevision) {
      return { ok: false, errors: ["stale_brief_revision"], currentRevision: current.revision };
    }
    const allowed = new Set(question.targetFields || []), accepted = [], pending = [];
    for (const fact of facts || []) {
      const v = global.QuestionEngineContracts.validateFactCandidate(fact);
      if (!v.ok) return { ok: false, errors: v.errors };
      if (!allowed.has(fact.targetField)) return { ok: false, errors: ["targetField_not_allowed:" + fact.targetField] };
      if (fact.status === "accepted") accepted.push(fact);
      else if (fact.status === "pending") pending.push(fact);
    }
    const next = clone(current);
    accepted.forEach(function (fact) {
      if (fact.operation === "set") setBriefPath(next, fact.targetField, fact.value);
      next.provenance[fact.targetField] = (next.provenance[fact.targetField] || []).concat([{
        answerId: answer.answerId, questionId: answer.questionId, questionVersion: answer.questionVersion,
        factId: fact.factId, confidence: fact.confidence, evidence: clone(fact.evidence),
      }]);
    });
    pending.forEach(function (fact) { next.uncertainties[fact.factId] = clone(fact); });
    next.revision = current.revision + 1;
    doc.page.creativeBrief = next;
    return { ok: true, brief: clone(next), revision: next.revision, accepted: accepted.length, pending: pending.length };
  }
  function setBriefPath(brief, path, value) {
    const parts = String(path || "").split(".");
    if (parts[0] !== "customerFacts" || parts.length < 2) return false;
    let cursor = brief;
    for (let i = 0; i < parts.length - 1; i++) {
      const key = parts[i];
      if (!cursor[key] || typeof cursor[key] !== "object" || Array.isArray(cursor[key])) cursor[key] = {};
      cursor = cursor[key];
    }
    cursor[parts[parts.length - 1]] = clone(value);
    return true;
  }
  global.BriefPatchEngine = Object.freeze({ ensureLiveBrief: ensureLiveBrief, apply: apply });
})(typeof window !== "undefined" ? window : globalThis);
