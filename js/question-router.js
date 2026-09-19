/** Question Router — utvärderar den committade frågans deklarativa nextQuestion-regler. */
(function (global) {
  "use strict";
  function resolve(question) {
    const rules = question && Array.isArray(question.nextQuestion) ? question.nextQuestion : [];
    const fallback = rules.find(function (rule) { return rule && rule.otherwise; });
    if (!fallback) return { type: "complete", questionId: null };
    const next = global.QuestionRegistry && global.QuestionRegistry.get(fallback.otherwise);
    return next
      ? { type: "question", questionId: next.questionId, question: next }
      : { type: "error", reason: "next_question_missing", questionId: fallback.otherwise };
  }
  global.QuestionRouter = Object.freeze({ resolve: resolve });
})(typeof window !== "undefined" ? window : globalThis);
