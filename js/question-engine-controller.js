/** Studioflödet för den fria scenarkitekturen. */
(function (global) {
  "use strict";
  const ROOT_ID = "questionEngineWelcome";

  function enabled() {
    return true;
  }
  function uniqueId(prefix) {
    try { if (global.crypto && global.crypto.randomUUID) return global.crypto.randomUUID(); } catch (e) { /* ignore */ }
    return prefix + "-" + Date.now() + "-" + Math.random().toString(36).slice(2);
  }
  function hideQuestionSteps() {
    document.querySelectorAll("#studioChatIntro [data-create-step]").forEach(function (step) { step.hidden = true; });
  }
  function createRoot(question) {
    const intro = document.getElementById("studioChatIntro");
    if (!intro) return null;
    let root = document.getElementById(ROOT_ID);
    if (root) return root;
    root = document.createElement("section");
    root.id = ROOT_ID;
    root.className = "studio-chat__create-step";
    root.dataset.questionId = question.questionId;
    root.innerHTML =
      '<p class="studio-chat__step-heading">Easily Question Engine</p>' +
      '<label class="studio-chat__field-label" for="questionEngineAnswer">' +
      String(question.prompt.text).replace(/&/g, "&amp;").replace(/</g, "&lt;") + "</label>" +
      '<input id="questionEngineAnswer" class="studio-chat__business-name-input" type="text" maxlength="120" autocomplete="organization" />' +
      '<p id="questionEngineStatus" class="studio-chat__step-reassurance" role="status" aria-live="polite">Svaret sparas direkt i Creative Brief.</p>' +
      '<button id="questionEngineSubmit" type="button" class="studio-chat__step-confirm">Spara svar</button>';
    intro.appendChild(root);
    renderQuestion(root, question, "Svaret sparas direkt i Creative Brief.");
    return root;
  }
  function renderQuestion(root, question, statusText) {
    root.dataset.questionId = question.questionId;
    const label = root.querySelector("label[for='questionEngineAnswer']");
    const input = root.querySelector("#questionEngineAnswer");
    const status = root.querySelector("#questionEngineStatus");
    if (label) label.textContent = question.prompt.text;
    if (input) {
      input.value = "";
      input.maxLength = question.inputSpec.maxLength || 600;
      input.focus();
    }
    if (status) status.textContent = statusText || "Svaret sparas direkt i Creative Brief.";
  }
  function commitPreview(SS) {
    const welcome = global.StudioWelcome;
    if (welcome && typeof welcome.showGeneratedSite === "function") welcome.showGeneratedSite();
    else if (welcome && typeof welcome.setPreviewState === "function") welcome.setPreviewState("site");
    const EE = global.EditorEngine;
    if (EE && EE.remount) {
      document.addEventListener("studio:preview-mounted", function revealQuestionEnginePreview() {
        document.documentElement.dataset.questionEnginePreviewReady = "1";
      }, { once: true });
      EE.remount(true);
    } else {
      document.documentElement.dataset.questionEnginePreviewReady = "1";
    }
    showEditorRail();
  }
  async function buildAiPreview(SS, options) {
    options = options || {};
    const PI = global.ProjectIsolation;
    try {
      if (PI && typeof PI.ensureCurrentDocumentProject === "function") {
        await PI.ensureCurrentDocumentProject({
          name: options.projectName || "Ny hemsida",
          source: "question-engine-ai",
        });
      }
    } catch (error) {
      return {
        ok: false,
        reason: "generation_project_persistence_failed",
        detail: String(error && (error.code || error.message) || error || "project_create_failed"),
      };
    }
    const doc = SS && SS.get ? SS.get() : null;
    const brief = doc && doc.page ? doc.page.creativeBrief : null;
    const api = global.SiteApi;
    if (!brief || !api || typeof api.request !== "function") return { ok: false, reason: "v2_free_scene_client_missing" };
    const GL = global.GenerationLifecycle;
    if (GL && typeof GL.beginRun === "function") GL.beginRun("question-engine-v2-free-scene");
    if (SS.save) SS.save();
    let response;
    try {
      response = await api.request("/api/v2/generate-site", {
        method: "POST", body: { creativeBrief: brief }, timeoutMs: 600000,
      });
    } catch (error) {
      const body = error && error.body && typeof error.body === "object" ? error.body : null;
      return {
        ok: false,
        reason: String(body && (body.error || body.reason) || "v2_free_scene_failed"),
        detail: String(body && (body.detail || body.message) || error && (error.code || error.message) || "request_failed"),
        status: Number.isInteger(body && body.status) ? body.status : null,
        upstreamCode: String(body && body.upstreamCode || ""),
        upstreamParam: String(body && body.upstreamParam || ""),
        conflicts: body && Array.isArray(body.conflicts) ? body.conflicts : [],
        errors: body && Array.isArray(body.errors) ? body.errors : [],
      };
    }
    if (!response || !response.ok || !response.sceneGraph || !Array.isArray(response.compiledProfiles)) {
      return {
        ok: false,
        reason: String(response && (response.reason || response.error) || "v2_free_scene_invalid"),
        conflicts: response && response.conflicts || [],
      };
    }
    try {
      SS.patch(function (d) {
        if (!d.meta) d.meta = {};
        const creativeBrief = d.page && d.page.creativeBrief;
        d.page = {
          createPath: "v2",
          creativeBrief: creativeBrief,
          v2GenerationId: response.generationId,
          v2CreativeVision: response.creativeVision,
          v2SceneGraph: response.sceneGraph,
          v2ResolvedProfiles: response.resolvedProfiles,
          v2CompiledProfiles: response.compiledProfiles,
        };
        d.sections = {};
        d.meta.visibleGenerationId = response.generationId;
        d.meta.generationEngine = "v2";
      });
      if (SS.save) SS.save();
      if (typeof SS.flushRemoteSave === "function") {
        const saved = await SS.flushRemoteSave({ throwOnError: true });
        if (!saved || saved.ok === false) throw new Error("v2_generation_persistence_failed");
      }
    } catch (error) {
      return {
        ok: false,
        reason: "generation_persistence_failed",
        detail: String(error && (error.code || error.message) || error || "save_failed"),
      };
    }
    commitPreview(SS);
    return { ok: true, createPath: "v2", generationId: response.generationId };
  }

  function isCreditBalanceExhausted(result) {
    const code = String(result && result.upstreamCode || "");
    const detail = String(result && result.detail || "");
    return code === "credit_balance_exhausted"
      || (Number(result && result.status) === 429 && /no credits remaining|credit balance exhausted/i.test(detail));
  }

  function buildErrorMessage(result) {
    const reason = String(result && result.reason || "");
    if (isCreditBalanceExhausted(result)) return "OpenAI-krediterna är slut. Lägg till API-krediter innan du försöker skapa webbplatsen igen. Dina svar är sparade.";
    if (/project[_-]?persistence/i.test(reason)) return "Projektet kunde inte sparas före AI-bygget. Dina svar är kvar — försök igen.";
    if (/timeout/i.test(reason)) return "AI-bygget tog för lång tid. Dina svar är kvar — försök igen.";
    if (/image/i.test(reason)) return "AI:n kunde inte skapa bilderna. Dina svar är kvar — försök igen.";
    if (/configured|api[_-]?key/i.test(reason)) return "AI-anslutningen saknas. Dina svar är kvar.";
    if (/layout[_-]?compilation[_-]?conflict/i.test(reason)) return "Easily stoppade en tekniskt ogiltig layout. Dina svar är sparade. Försök inte igen just nu. Felkod: layout-compilation-conflict.";
    if (/free[_-]?scene[_-]?contract/i.test(reason)) return "AI:n lämnade en ofullständig design. Ingen trasig sida sparades. Dina svar är kvar — försök igen.";
    return "Webbplatsen kunde inte byggas. Dina svar är sparade. Felkod: " + (reason || "okänt-fel") + ".";
  }
  function bindQuestionSubmit(root) {
    const button = root && root.querySelector("#questionEngineSubmit");
    if (!button || button.dataset.bound === "1") return;
    button.dataset.bound = "1";
    button.addEventListener("click", function () {
      const active = global.QuestionRegistry.get(root.dataset.questionId);
      if (active) submit(root, active).catch(function () {
        const status = root.querySelector("#questionEngineStatus");
        if (status) status.textContent = "Webbplatsen kunde inte byggas just nu. Dina svar är kvar.";
      });
    });
  }
  function showQuestion(question) {
    const root = createRoot(question);
    if (!root) return false;
    root.hidden = false;
    bindQuestionSubmit(root);
    return true;
  }
  function commitValue(question, rawValue) {
    const SS = global.SiteState;
    const doc = SS && SS.get ? SS.get() : null;
    if (!question || !doc || !doc.page || !SS.patch) return { ok: false };
    const brief = global.BriefPatchEngine.ensureLiveBrief(doc.page.creativeBrief);
    const answer = {
      answerId: uniqueId("answer"), sessionId: document.body.dataset.questionEngineSessionId || uniqueId("session"),
      questionId: question.questionId, questionVersion: question.version, rawAnswer: rawValue,
      submittedAt: new Date().toISOString(), expectedBriefRevision: brief.revision,
    };
    document.body.dataset.questionEngineSessionId = answer.sessionId;
    const interpreted = global.AnswerInterpreter.interpret(answer, question, brief);
    if (!interpreted.ok || !interpreted.facts.length) return { ok: false, interpreted: interpreted };
    let commit;
    SS.patch(function (nextDoc) { commit = global.BriefPatchEngine.apply(nextDoc, question, answer, interpreted.facts); });
    if (commit && commit.ok && SS.save) SS.save();
    return commit || { ok: false };
  }
  function submitSiteType(question) {
    const selected = document.querySelector("#studioCreateTypeChoices [data-site-type]:checked");
    const error = document.getElementById("createErrorSiteType");
    if (!selected) {
      if (error) { error.textContent = "Välj vilken typ av webbplats du vill skapa."; error.hidden = false; }
      return false;
    }
    if (error) error.hidden = true;
    const SS = global.SiteState;
    const doc = SS && SS.get ? SS.get() : null;
    if (!doc || !doc.page || !SS.patch) return false;
    const brief = global.BriefPatchEngine.ensureLiveBrief(doc.page.creativeBrief);
    const answer = {
      answerId: uniqueId("answer"), sessionId: document.body.dataset.questionEngineSessionId || uniqueId("session"),
      questionId: question.questionId, questionVersion: question.version, rawAnswer: selected.value,
      submittedAt: new Date().toISOString(), expectedBriefRevision: brief.revision,
    };
    document.body.dataset.questionEngineSessionId = answer.sessionId;
    const interpreted = global.AnswerInterpreter.interpret(answer, question, brief);
    if (!interpreted.ok || !interpreted.facts.length) return false;
    let commit;
    SS.patch(function (nextDoc) { commit = global.BriefPatchEngine.apply(nextDoc, question, answer, interpreted.facts); });
    if (!commit || !commit.ok) return false;
    if (SS.save) SS.save();
    const firstStep = document.getElementById("studioCreateStep1");
    if (firstStep) firstStep.hidden = true;
    return bindBusinessStep();
  }
  function bindSiteTypeStep(question) {
    const step = document.getElementById("studioCreateStep1");
    const choices = step && step.querySelectorAll("[data-site-type]");
    const confirm = document.getElementById("studioCreateConfirm1");
    if (!step || !choices || !confirm) return false;
    step.hidden = false;
    choices.forEach(function (choice) {
      if (choice.dataset.questionEngineBound === "1") return;
      choice.dataset.questionEngineBound = "1";
      choice.addEventListener("change", function () {
        if (!choice.checked) return;
        choices.forEach(function (other) { if (other !== choice) other.checked = false; });
      });
    });
    if (confirm.dataset.questionEngineBound !== "1") {
      confirm.dataset.questionEngineBound = "1";
      confirm.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopImmediatePropagation();
        submitSiteType(question);
      }, true);
    }
    return true;
  }
  function submitBusinessStep() {
    const step = document.getElementById("studioCreateStep2");
    if (step && (step.dataset.flowStatus === "preview" || step.dataset.flowStatus === "complete")) return false;
    const nameInput = document.getElementById("welcomeCreateBusinessName");
    const locationInput = document.getElementById("welcomeCreateBusinessLocation");
    const descriptionInput = document.getElementById("welcomeCreateBusinessDescription");
    const nameError = document.getElementById("createErrorBusinessName");
    const descriptionError = document.getElementById("createErrorBusinessDescription");
    const name = String(nameInput && nameInput.value || "").trim();
    const location = String(locationInput && locationInput.value || "").trim();
    const description = String(descriptionInput && descriptionInput.value || "").trim();
    let valid = true;
    if (name.length < 2) {
      if (nameError) { nameError.textContent = "Företagsnamn saknas."; nameError.hidden = false; }
      valid = false;
    } else if (nameError) nameError.hidden = true;
    if (description.length < 8) {
      if (descriptionError) { descriptionError.textContent = "Beskriv verksamheten innan du fortsätter."; descriptionError.hidden = false; }
      valid = false;
    } else if (descriptionError) descriptionError.hidden = true;
    if (!valid) return false;

    const nameCommit = commitValue(global.QuestionRegistry.get("business.identity.name", 1), name);
    if (!nameCommit.ok) return false;
    if (location) {
      const locationCommit = commitValue(global.QuestionRegistry.get("business.location.primary", 1), location);
      if (!locationCommit.ok) return false;
    }
    const offerCommit = commitValue(global.QuestionRegistry.get("business.offer.core", 1), description);
    if (!offerCommit.ok) return false;
    if (step) step.hidden = true;
    return bindContentStep();
  }
  function bindBusinessStep() {
    const step = document.getElementById("studioCreateStep2");
    const confirm = document.getElementById("studioCreateConfirm2");
    if (!step || !confirm) return false;
    const welcome = global.StudioWelcome;
    if (welcome && typeof welcome.renderCreateSectionChoices === "function") {
      const selectedType = document.querySelector("#studioCreateTypeChoices [data-site-type]:checked");
      welcome.renderCreateSectionChoices(selectedType && (selectedType.dataset.siteType || selectedType.value));
    }
    step.hidden = false;
    if (confirm.dataset.questionEngineBound !== "1") {
      confirm.dataset.questionEngineBound = "1";
      confirm.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopImmediatePropagation();
        submitBusinessStep();
      }, true);
    }
    const nameInput = document.getElementById("welcomeCreateBusinessName");
    if (nameInput) nameInput.focus();
    return true;
  }
  function submitContentStep() {
    const step = document.getElementById("studioCreateStep3");
    if (step && (step.dataset.flowStatus === "preview" || step.dataset.flowStatus === "complete")) return false;
    const requestedContent = Array.from(document.querySelectorAll("#studioCreateSectionChoices [data-section-id]:checked"))
      .map(function (input) { return input.getAttribute("data-section-id"); })
      .filter(Boolean);
    const contentCommit = commitValue(
      global.QuestionRegistry.get("site.content.selection", 1),
      JSON.stringify(requestedContent),
    );
    if (!contentCommit.ok) return false;
    if (step) step.hidden = true;
    return bindDesignStep();
  }

  function bindContentStep() {
    const welcome = global.StudioWelcome;
    if (welcome && typeof welcome.renderCreateSectionChoices === "function") {
      const selectedType = document.querySelector("#studioCreateTypeChoices [data-site-type]:checked");
      welcome.renderCreateSectionChoices(selectedType && (selectedType.dataset.siteType || selectedType.value));
    }
    const step = document.getElementById("studioCreateStep3");
    const confirm = document.getElementById("studioCreateConfirm3");
    if (!step || !confirm) return false;
    step.hidden = false;
    if (confirm.dataset.questionEngineBound !== "1") {
      confirm.dataset.questionEngineBound = "1";
      confirm.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopImmediatePropagation();
        submitContentStep();
      }, true);
    }
    return true;
  }

  function submitDesignStep() {
    const step = document.getElementById("studioCreateStep4");
    if (step && (step.dataset.flowStatus === "preview" || step.dataset.flowStatus === "complete")) return false;
    const selected = document.querySelector("#studioCreateStyleChoices [data-style-id]:checked");
    const customInput = document.getElementById("welcomeCreateCustomColors");
    const error = document.getElementById("createErrorDesignStyle");
    if (!selected) {
      if (error) { error.textContent = "Välj en designstil innan du fortsätter."; error.hidden = false; }
      return false;
    }
    if (error) error.hidden = true;
    const description = String(customInput && customInput.value || "").trim();
    const mode = description ? "custom" : "auto";
    const question = global.QuestionRegistry.get("design.direction.theme", 1);
    const commit = commitValue(question, selected.dataset.styleId || selected.value);
    if (!commit.ok) return false;
    const colorCommit = commitValue(
      global.QuestionRegistry.get("design.color.preferences", 1),
      JSON.stringify({ mode: mode, description: mode === "custom" ? description : "" }),
    );
    if (!colorCommit.ok) return false;
    if (step) step.hidden = true;
    ensureExistingSiteChoices();
    return bindExistingSiteStep();
  }

  function bindDesignStep() {
    const welcome = global.StudioWelcome;
    const styleBox = document.getElementById("studioCreateStyleChoices");
    if (styleBox && !styleBox.querySelector("[data-style-id]")) styleBox.dataset.rendered = "";
    if (welcome && typeof welcome.renderCreateStyleChoices === "function") welcome.renderCreateStyleChoices();
    const step = document.getElementById("studioCreateStep4");
    const styleChoices = step && step.querySelectorAll("[data-style-id]");
    const confirm = document.getElementById("studioCreateConfirm4");
    if (!step || !styleChoices || !styleChoices.length || !confirm) return false;
    step.hidden = false;
    styleChoices.forEach(function (choice) {
      if (choice.dataset.questionEngineBound === "1") return;
      choice.dataset.questionEngineBound = "1";
      choice.addEventListener("change", function () {
        if (!choice.checked) return;
        styleChoices.forEach(function (other) { if (other !== choice) other.checked = false; });
      });
    });
    if (confirm.dataset.questionEngineBound !== "1") {
      confirm.dataset.questionEngineBound = "1";
      confirm.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopImmediatePropagation();
        submitDesignStep();
      }, true);
    }
    return true;
  }

  function bindExistingSiteStep() {
    const step = document.getElementById("studioCreateStep5");
    if (!step) return false;
    ensureExistingSiteChoices();
    step.hidden = false;
    return true;
  }
  async function submit(root, question) {
    if (root.dataset.flowStatus === "preview" || root.dataset.flowStatus === "complete") return;
    const input = root.querySelector("#questionEngineAnswer");
    const status = root.querySelector("#questionEngineStatus");
    const SS = global.SiteState;
    if (!input || !status || !SS || !SS.get || !SS.patch) return;
    const doc = SS.get();
    if (!doc || !doc.page) return;
    const brief = global.BriefPatchEngine.ensureLiveBrief(doc.page.creativeBrief);
    const answer = {
      answerId: uniqueId("answer"), sessionId: document.body.dataset.questionEngineSessionId || uniqueId("session"),
      questionId: question.questionId, questionVersion: question.version, rawAnswer: input.value,
      submittedAt: new Date().toISOString(), expectedBriefRevision: brief.revision,
    };
    document.body.dataset.questionEngineSessionId = answer.sessionId;
    const interpreted = global.AnswerInterpreter.interpret(answer, question, brief);
    if (!interpreted.ok || !interpreted.facts.length) {
      status.textContent = "Jag behöver ett tydligare företagsnamn innan vi fortsätter.";
      root.dataset.commitStatus = "clarify";
      return;
    }
    let commit;
    SS.patch(function (nextDoc) { commit = global.BriefPatchEngine.apply(nextDoc, question, answer, interpreted.facts); });
    if (!commit || !commit.ok) {
      status.textContent = "Svaret kunde inte sparas. Försök igen.";
      root.dataset.commitStatus = "error";
      return;
    }
    if (SS.save) SS.save();
    root.dataset.commitStatus = commit.pending ? "pending" : "accepted";
    root.dataset.briefRevision = String(commit.revision);
    status.textContent = commit.pending
      ? "Namnet skiljer sig från ett tidigare svar och behöver förtydligas."
      : "Sparat i Creative Brief: " + commit.brief.customerFacts.businessName;
    if (!commit.pending && global.QuestionRouter && global.QuestionRouter.resolve) {
      const route = global.QuestionRouter.resolve(question, commit.brief);
      if (route.type === "question" && route.question) {
        renderQuestion(root, route.question, "Föregående svar sparat. Nästa svar uppdaterar samma Creative Brief.");
      } else if (route.type === "complete") {
        const preview = await buildAiPreview(SS);
        input.disabled = true;
        input.setAttribute("aria-disabled", "true");
        const button = root.querySelector("#questionEngineSubmit");
        if (button) {
          button.disabled = true;
          button.setAttribute("aria-disabled", "true");
          button.textContent = "Webbplats skapad";
        }
        status.textContent = preview && preview.ok
          ? "Tack — en första webbplats har byggts från din Creative Brief."
          : "Frågorna är klara, men förhandsvisningen kunde inte byggas ännu.";
        root.dataset.flowStatus = preview && preview.ok ? "preview" : "complete";
        if (preview && preview.ok) root.dataset.previewRevision = String(preview.basedOnRevision);
      }
    }
  }
  function collectFinalAnswers() {
    const siteType = document.querySelector("#studioCreateTypeChoices [data-site-type]:checked");
    const design = document.querySelector("#studioCreateStyleChoices [data-style-id]:checked");
    const source = document.querySelector("#studioCreateExistingChoices [data-existing-id]:checked");
    const name = String(document.getElementById("welcomeCreateBusinessName")?.value || "").trim();
    const location = String(document.getElementById("welcomeCreateBusinessLocation")?.value || "").trim();
    const description = String(document.getElementById("welcomeCreateBusinessDescription")?.value || "").trim();
    const customColors = String(document.getElementById("welcomeCreateCustomColors")?.value || "").trim();
    const url = String(document.getElementById("welcomeCreateExistingUrl")?.value || "").trim();
    const requestedContent = Array.from(document.querySelectorAll("#studioCreateSectionChoices [data-section-id]:checked"))
      .map(function (input) { return input.getAttribute("data-section-id"); })
      .filter(Boolean);
    if (!siteType || name.length < 2 || description.length < 8 || !design || !source) return null;
    if (source.getAttribute("data-existing-id") === "has-website" && !/^https?:\/\//i.test(url)) return null;
    return {
      siteType: siteType.getAttribute("data-site-type") || siteType.value,
      name: name, location: location, description: description,
      requestedContent: requestedContent,
      design: design.getAttribute("data-style-id") || design.value,
      colors: {
        mode: customColors ? "custom" : "auto",
        description: customColors || undefined,
      },
      source: { mode: source.getAttribute("data-existing-id"), url: url || undefined },
    };
  }
  async function buildFromCompletedFlow(button) {
    const answers = collectFinalAnswers();
    const error = document.getElementById("createErrorExistingSite");
    if (!answers) {
      if (error) { error.textContent = "Kontrollera att alla steg är ifyllda innan webbplatsen skapas."; error.hidden = false; }
      return false;
    }
    if (error) error.hidden = true;
    const SS = global.SiteState;
    const PI = global.ProjectIsolation;
    if (!SS || !PI || typeof PI.ensureCurrentDocumentProject !== "function") return false;
    if (button) {
      button.disabled = true;
      button.setAttribute("aria-disabled", "true");
      button.textContent = "AI bygger webbplatsen…";
    }
    const buildStartedAt = Date.now();
    const progressTimer = button ? global.setInterval(function () {
      const elapsedMinutes = Math.max(1, Math.floor((Date.now() - buildStartedAt) / 60000));
      button.textContent = "AI bygger webbplatsen… " + elapsedMinutes + " min";
    }, 15000) : null;
    let preview;
    try {
      const sourceCommit = commitValue(
        global.QuestionRegistry.get("site.source.material", 1),
        JSON.stringify(answers.source),
      );
      if (!sourceCommit.ok) throw new Error("source_answer_commit_failed");
      await PI.ensureCurrentDocumentProject({ name: answers.name, source: "question-engine-v2" });
      SS.patch(function (doc) {
        if (!doc.meta) doc.meta = {};
        doc.meta.generationEngine = "v2";
        doc.meta.createAnswers = JSON.parse(JSON.stringify(answers));
        const creativeBrief = global.BriefPatchEngine.ensureLiveBrief(doc.page && doc.page.creativeBrief);
        doc.page = { createPath: "v2", creativeBrief: creativeBrief };
        doc.sections = {};
      });
      if (SS.save) SS.save();
      preview = await buildAiPreview(SS, { projectName: answers.name });
    } catch (generationError) {
      const detail = String(generationError && generationError.message || generationError || "v2_generation_start_failed");
      try { console.error("[Easily · V2 start]", detail, generationError); } catch (logError) { /* ignore */ }
      preview = { ok: false, reason: detail, detail: detail };
    }
    if (progressTimer) global.clearInterval(progressTimer);
    const step = document.getElementById("studioCreateStep5");
    if (step) {
      step.dataset.flowStatus = preview && preview.ok ? "preview" : "error";
      step.hidden = false;
    }
    if (!(preview && preview.ok) && error) {
      error.textContent = buildErrorMessage(preview);
      error.hidden = false;
    }
    if (button) {
      button.disabled = !!(preview && preview.ok);
      button.setAttribute("aria-disabled", preview && preview.ok ? "true" : "false");
      button.textContent = preview && preview.ok
        ? "Webbplats skapad"
        : isCreditBalanceExhausted(preview)
          ? "Försök igen efter påfyllning"
          : "Försök skapa webbplatsen igen";
    }
    return !!(preview && preview.ok);
  }
  function showEditorRail() {
    const rail = document.getElementById("sceneEditorRail");
    const doc = global.SiteState && global.SiteState.get ? global.SiteState.get() : null;
    if (!rail || !doc || !doc.page || doc.page.createPath !== "v2") return false;
    rail.hidden = false;
    return true;
  }
  function bindEditorRail() {
    const rail = document.getElementById("sceneEditorRail");
    if (!rail || rail.dataset.bound === "1") return false;
    rail.dataset.bound = "1";
    rail.addEventListener("click", function (event) {
      const button = event.target.closest("[data-scene-editor-tool]");
      if (!button || !global.StudioPanelModes || !global.StudioPanelModes.switchTab) return;
      const tool = button.getAttribute("data-scene-editor-tool");
      global.StudioPanelModes.switchTab(tool === "manual" ? "manual" : "ai");
      const pane = document.getElementById("studioCreatePane");
      if (pane) pane.hidden = false;
      if (tool === "ai") {
        const input = document.getElementById("welcomeBusinessDescription");
        if (input) input.focus();
      }
    });
    return true;
  }
  function bindFinalSiteBuild() {
    const button = document.getElementById("studioCreateConfirmV2");
    if (!button || button.dataset.questionEngineFinalBound === "1") return false;
    button.dataset.questionEngineFinalBound = "1";
    button.addEventListener("click", function (event) {
      if (!enabled()) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      buildFromCompletedFlow(button).catch(function () {
        const error = document.getElementById("createErrorExistingSite");
        const step = document.getElementById("studioCreateStep5");
        if (step) { step.dataset.flowStatus = "error"; step.hidden = false; }
        if (error) {
          error.textContent = "Webbplatsen kunde inte byggas just nu. Dina svar är kvar — försök igen.";
          error.hidden = false;
        }
        button.disabled = false;
        button.setAttribute("aria-disabled", "false");
        button.textContent = "Försök skapa webbplatsen igen";
      });
    }, true);
    return true;
  }

  function ensureExistingSiteChoices() {
    const box = document.getElementById("studioCreateExistingChoices");
    if (!box || box.querySelector("[data-existing-id]")) return;
    const options = [
      ["from-scratch", "A", "Nej, skapa allt från grunden.", "AI skapar en helt ny webbplats."],
      ["has-website", "B", "Ja, jag har en webbplats.", "Ange webbadressen så att AI kan analysera innehållet och skapa en modern version."],
      ["own-material", "C", "Jag har inget ännu, men jag har texter och bilder.", "Jag vill använda mitt eget material senare."],
    ];
    options.forEach(function (option) {
      const label = document.createElement("label");
      label.className = "studio-chat__type-check";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.className = "studio-chat__flow-check-input";
      input.setAttribute("data-existing-id", option[0]);
      input.setAttribute("data-existing-letter", option[1]);
      input.setAttribute("data-existing-title", option[2]);
      input.setAttribute("data-existing-description", option[3]);
      const check = document.createElement("span");
      check.className = "studio-chat__type-check-box";
      check.setAttribute("aria-hidden", "true");
      const copy = document.createElement("span");
      copy.className = "studio-chat__type-check-copy";
      const title = document.createElement("span");
      title.className = "studio-chat__type-check-title";
      title.textContent = option[1] + ". " + option[2];
      const description = document.createElement("span");
      description.className = "studio-chat__type-check-desc";
      description.textContent = option[3];
      copy.append(title, description);
      label.append(input, check, copy);
      box.appendChild(label);
    });
  }

  function enforceFreshQuestionEngineCanvas() {
    if (document.documentElement.dataset.questionEngineFreshStart === "1") return;
    document.documentElement.dataset.questionEngineFreshStart = "1";
    const welcome = global.StudioWelcome;
    if (welcome && typeof welcome.clearPreviewSiteDom === "function") welcome.clearPreviewSiteDom();
    if (welcome && typeof welcome.setPreviewState === "function") welcome.setPreviewState("empty");
    document.documentElement.dataset.studioPreviewPending = "1";
  }

  let restoredAnswersProjectId = null;
  function restoreSavedAnswers() {
    const doc = global.SiteState && global.SiteState.get && global.SiteState.get();
    if (!doc) return false;
    const meta = doc.meta || {};
    if (!meta.siteId) return false;
    if (restoredAnswersProjectId === meta.siteId) return true;
    const facts = doc.page && doc.page.creativeBrief && doc.page.creativeBrief.customerFacts || {};
    const saved = meta.createAnswers || {
      siteType: facts.siteType, name: facts.businessName,
      description: facts.offer && facts.offer.summary,
      design: facts.design && facts.design.styleId,
      requestedContent: facts.requestedContent,
    };
    if (!saved.siteType && !saved.name) return false;
    bindSiteTypeStep(global.QuestionRegistry.get("site.intent.type", 1));
    bindBusinessStep();
    bindContentStep();
    bindDesignStep();
    bindExistingSiteStep();
    function check(selector, attribute, values) {
      document.querySelectorAll(selector).forEach(function (input) {
        input.checked = values.indexOf(input.getAttribute(attribute)) >= 0;
      });
    }
    check("#studioCreateTypeChoices [data-site-type]", "data-site-type", [saved.siteType]);
    const savedDesignAliases = {
      "mork-dramatisk": "morkt-dramatiskt",
      cinematisk: "morkt-dramatiskt",
      monokrom: "ljust-luftigt",
      skandinavisk: "ljust-luftigt",
      retro: "varmt-personligt",
      lekfull: "varmt-personligt",
      hogteknologisk: "djarvt-kreativt",
      brutalistisk: "djarvt-kreativt",
      futuristisk: "djarvt-kreativt",
      lyxig: "fri-designvarld",
      viktoriansk: "fri-designvarld",
      "editorial-magasin": "fri-designvarld",
    };
    const restoredDesign = savedDesignAliases[saved.design] || saved.design;
    check("#studioCreateStyleChoices [data-style-id]", "data-style-id", [restoredDesign]);
    const savedContent = (saved.requestedContent || saved.sections || []).map(function (entry) {
      return typeof entry === "string" ? entry : entry && entry.id;
    }).filter(function (id) { return ["about", "services", "gallery", "contact"].includes(id); });
    check("#studioCreateSectionChoices [data-section-id]", "data-section-id", savedContent);
    const savedColors = saved.colors && saved.colors.mode ? saved.colors : { mode: "auto" };
    check("#studioCreateExistingChoices [data-existing-id]", "data-existing-id", [saved.source && saved.source.mode]);
    Object.entries({
      welcomeCreateBusinessName: saved.name,
      welcomeCreateBusinessLocation: saved.location,
      welcomeCreateBusinessDescription: saved.description,
      welcomeCreateCustomColors: savedColors.description,
      welcomeCreateExistingUrl: saved.source && saved.source.url,
    }).forEach(function (entry) {
      const input = document.getElementById(entry[0]);
      if (input) input.value = entry[1] || "";
    });
    const urlWrap = document.getElementById("studioCreateExistingUrlWrap");
    if (urlWrap) urlWrap.hidden = !saved.source || saved.source.mode !== "has-website";
    const contentAnswered = Array.isArray(saved.requestedContent) || Array.isArray(saved.sections);
    const stepNumber = !saved.siteType
      ? 1
      : !saved.name || !saved.description
        ? 2
        : !contentAnswered
          ? 3
          : !saved.design
            ? 4
            : 5;
    for (let i = 1; i <= 5; i++) {
      const step = document.getElementById("studioCreateStep" + i);
      if (step) { step.hidden = i !== stepNumber; delete step.dataset.flowStatus; }
    }
    document.body.dataset.createFlowStep = String(stepNumber);
    const button = document.getElementById("studioCreateConfirmV2");
    if (button) {
      button.disabled = false;
      button.setAttribute("aria-disabled", "false");
      button.textContent = meta.createAnswers ? "Försök skapa webbplatsen igen" : "Bekräfta";
    }
    restoredAnswersProjectId = meta.siteId;
    return true;
  }

  function mount() {
    if (!enabled() || document.body.getAttribute("data-studio-mode") === "readonly") return false;
    // A saved project must finish hydrating before Question Engine decides
    // whether the canvas is empty. Otherwise the early DOMContentLoaded pass
    // can erase a valid V2 preview while SiteState is still loading it.
    if (
      document.documentElement.dataset.questionEngineStudioReady !== "1" &&
      global.STUDIO && String(global.STUDIO.siteIdFromUrl || "").trim()
    ) return false;
    const installed = global.QuestionCatalogCore && global.QuestionCatalogCore.install();
    if (!installed || !installed.ok) return false;
    if (document.documentElement.dataset.questionEnginePreviewListener !== "1") {
      document.documentElement.dataset.questionEnginePreviewListener = "1";
      document.addEventListener("studio:preview-mounted", function () {
        document.documentElement.dataset.questionEnginePreviewReady = "1";
      });
    }
    if (document.documentElement.dataset.questionEngineStudioReady === "1") {
      document.documentElement.dataset.questionEngineActive = "1";
    }
    const currentDoc = global.SiteState && global.SiteState.get && global.SiteState.get();
    const existingGeneratedSite = !!(
      currentDoc && currentDoc.page &&
      (
        (currentDoc.page.createPath === "v2" && currentDoc.page.v2SceneGraph && Array.isArray(currentDoc.page.v2CompiledProfiles))
      )
    );
    if (existingGeneratedSite) {
      hideQuestionSteps();
      bindEditorRail();
      showEditorRail();
      return true;
    }
    enforceFreshQuestionEngineCanvas();
    ensureExistingSiteChoices();
    if (document.documentElement.dataset.questionEngineStudioReady !== "1" || !restoreSavedAnswers()) {
      bindSiteTypeStep(global.QuestionRegistry.get("site.intent.type", 1));
    }
    bindFinalSiteBuild();
    bindEditorRail();
    showEditorRail();
    return true;
  }
  document.addEventListener("studio:ready", function () {
    document.documentElement.dataset.questionEngineStudioReady = "1";
    if (enabled()) requestAnimationFrame(function () { requestAnimationFrame(mount); });
  });
  global.QuestionEngineController = Object.freeze({
    isEnabled: enabled, mount: mount, submit: submit,
    submitSiteType: submitSiteType, submitBusinessStep: submitBusinessStep,
    submitContentStep: submitContentStep, submitDesignStep: submitDesignStep,
    buildFromCompletedFlow: buildFromCompletedFlow,
    restoreSavedAnswers: restoreSavedAnswers,
  });
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount, { once: true });
  } else {
    mount();
  }
  setTimeout(function () {
    if (!enabled() || document.documentElement.dataset.questionEngineActive === "1") return;
    if (
      document.documentElement.dataset.questionEngineStudioReady !== "1" &&
      global.STUDIO && String(global.STUDIO.siteIdFromUrl || "").trim()
    ) return;
    document.documentElement.dataset.questionEngineStudioReady = "1";
    mount();
  }, 1500);
})(typeof window !== "undefined" ? window : globalThis);
