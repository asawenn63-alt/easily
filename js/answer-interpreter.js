/** Answer Interpreter — ren tolkning till FactCandidate; muterar aldrig state. */
(function (global) {
  "use strict";

  function interpret(answer, question, brief) {
    const C = global.QuestionEngineContracts;
    const av = C.validateAnswerEnvelope(answer);
    if (!av.ok) return { ok: false, errors: av.errors, facts: [] };
    if (!question || question.questionId !== answer.questionId || question.version !== answer.questionVersion) {
      return { ok: false, errors: ["question_mismatch"], facts: [] };
    }
    const raw = typeof answer.rawAnswer === "string" ? answer.rawAnswer : "";
    const value = raw.trim().replace(/\s+/g, " ");
    if (answer.questionId === "site.intent.type" || answer.questionId === "design.direction.theme") {
      const allowed = question.inputSpec && Array.isArray(question.inputSpec.options) ? question.inputSpec.options : [];
      if (!allowed.includes(value)) {
        return { ok: true, facts: [], clarification: { reason: "invalid_site_type" } };
      }
      const suffix = answer.questionId === "site.intent.type" ? "siteType" : "designStyleId";
      const typeFact = makeFact(answer, question.targetFields[0], suffix, value, 1, raw, value);
      typeFact.evidence[0].source = "selected_option";
      const typeValidation = C.validateFactCandidate(typeFact);
      return typeValidation.ok
        ? { ok: true, facts: [typeFact], clarification: null }
        : { ok: false, errors: typeValidation.errors, facts: [] };
    }
    if (answer.questionId === "business.offer.core") {
      if (value.length < 8 || value.length > 600) {
        return { ok: true, facts: [], clarification: { reason: "invalid_business_offer" } };
      }
      const facts = [makeFact(answer, question.targetFields[0], "offerSummary", value, 0.97, raw, value)];
      const audienceMatch = value.match(/\bför\s+([^,.!?;]+)(?=$|[,.!?;])/i);
      if (audienceMatch && audienceMatch[1].trim().length >= 3) {
        const audience = audienceMatch[1].trim();
        facts.push(makeFact(answer, question.targetFields[1], "primaryAudience", audience, 0.93, raw, audience));
      }
      const invalid = facts.map(C.validateFactCandidate).find(function (result) { return !result.ok; });
      return invalid ? { ok: false, errors: invalid.errors, facts: [] } : { ok: true, facts: facts, clarification: null };
    }
    if (answer.questionId === "business.location.primary") {
      if (!value) return { ok: true, facts: [], clarification: null };
      if (value.length < 2 || value.length > 120) {
        return { ok: true, facts: [], clarification: { reason: "invalid_business_location" } };
      }
      const locationFact = makeFact(answer, question.targetFields[0], "primaryLocation", value, 0.99, raw, value);
      const locationValidation = C.validateFactCandidate(locationFact);
      return locationValidation.ok
        ? { ok: true, facts: [locationFact], clarification: null }
        : { ok: false, errors: locationValidation.errors, facts: [] };
    }
    if (answer.questionId === "site.content.selection") {
      let selected;
      try { selected = JSON.parse(raw); } catch (e) { selected = null; }
      const allowed = question.inputSpec && Array.isArray(question.inputSpec.options) ? question.inputSpec.options : [];
      if (!Array.isArray(selected) || selected.some(function (id) { return !allowed.includes(id); })) {
        return { ok: true, facts: [], clarification: { reason: "invalid_content_selection" } };
      }
      const unique = Array.from(new Set(selected));
      const selectionFact = makeFact(answer, question.targetFields[0], "requestedContent", unique, 1, raw, raw);
      selectionFact.evidence[0].source = "selected_option";
      const selectionValidation = C.validateFactCandidate(selectionFact);
      return selectionValidation.ok
        ? { ok: true, facts: [selectionFact], clarification: null }
        : { ok: false, errors: selectionValidation.errors, facts: [] };
    }
    if (answer.questionId === "design.color.preferences") {
      let colors;
      try { colors = JSON.parse(raw); } catch (e) { colors = null; }
      if (!colors || !(question.inputSpec.options || []).includes(colors.mode)) {
        return { ok: true, facts: [], clarification: { reason: "invalid_color_preferences" } };
      }
      const facts = [makeFact(answer, question.targetFields[0], "colorMode", colors.mode, 1, raw, raw)];
      facts[0].evidence[0].source = "selected_option";
      if (String(colors.description || "").trim()) {
        facts.push(makeFact(answer, question.targetFields[1], "colorDescription", String(colors.description).trim(), 0.99, raw, raw));
      }
      const invalid = facts.map(C.validateFactCandidate).find(function (result) { return !result.ok; });
      return invalid ? { ok: false, errors: invalid.errors, facts: [] }
        : { ok: true, facts: facts, clarification: null };
    }
    if (answer.questionId === "site.source.material") {
      let source;
      try { source = JSON.parse(raw); } catch (e) { source = null; }
      if (!source || !(question.inputSpec.options || []).includes(source.mode)) {
        return { ok: true, facts: [], clarification: { reason: "invalid_source_material" } };
      }
      const facts = [makeFact(answer, question.targetFields[0], "sourceMode", source.mode, 1, raw, raw)];
      facts[0].evidence[0].source = "selected_option";
      if (source.url) facts.push(makeFact(answer, question.targetFields[1], "sourceUrl", String(source.url), 0.99, raw, raw));
      const invalid = facts.map(C.validateFactCandidate).find(function (result) { return !result.ok; });
      return invalid ? { ok: false, errors: invalid.errors, facts: [] }
        : { ok: true, facts: facts, clarification: null };
    }
    if (answer.questionId !== "business.identity.name") {
      return { ok: false, errors: ["interpreter_missing:" + answer.questionId], facts: [] };
    }
    if (value.length < 2 || value.length > 120) {
      return { ok: true, facts: [], clarification: { reason: "invalid_business_name" } };
    }
    const current = brief && brief.customerFacts ? String(brief.customerFacts.businessName || "").trim() : "";
    const confidence = current && current !== value ? 0.7 : 0.99;
    const status = confidence >= question.interpretationPolicy.confidenceThresholds.accept ? "accepted" : "pending";
    const start = raw.indexOf(value);
    const fact = {
      factId: answer.answerId + ":businessName",
      targetField: question.targetFields[0], operation: "set", value: value,
      confidence: confidence,
      evidence: [{ source: "answer_text", answerId: answer.answerId, quote: value,
        span: { start: start < 0 ? 0 : start, end: (start < 0 ? 0 : start) + value.length }, supports: "value" }],
      polarity: "positive", status: status,
    };
    const fv = C.validateFactCandidate(fact);
    return fv.ok
      ? { ok: true, facts: [fact], clarification: status === "pending" ? { reason: "conflicting_business_name", factId: fact.factId } : null }
      : { ok: false, errors: fv.errors, facts: [] };
  }

  function makeFact(answer, targetField, suffix, value, confidence, raw, quote) {
    const start = raw.indexOf(quote);
    return {
      factId: answer.answerId + ":" + suffix,
      targetField: targetField, operation: "set", value: value, confidence: confidence,
      evidence: [{ source: "answer_text", answerId: answer.answerId, quote: quote,
        span: { start: start < 0 ? 0 : start, end: (start < 0 ? 0 : start) + quote.length }, supports: "value" }],
      polarity: "positive", status: "accepted",
    };
  }

  global.AnswerInterpreter = Object.freeze({ interpret: interpret });
})(typeof window !== "undefined" ? window : globalThis);
