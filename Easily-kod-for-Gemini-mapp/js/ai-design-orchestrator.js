/**
 * AI Design Orchestrator — single brain coordinating Easily intelligence engines.
 *
 * Every request: understand → read memory → read session → plan → execute → verify → respond.
 * Never executes engines without an internal execution plan first.
 */
(function (global) {
  "use strict";

  const LOG_TAG = "[Easily · orchestrator]";
  const MAX_QUALITY_RETRIES = 2;
  const MIN_IMPROVEMENT = 0.52;

  const ENGINE_IDS = {
    intent: "Intent Resolution",
    design_memory: "Design Memory",
    edit_session: "Edit Session",
    image_intelligence: "Image Intelligence",
    text_intelligence: "Text Intelligence",
    pipeline: "Edit Pipeline",
    consistency: "Consistency Controller",
  };

  function log(stage, payload) {
    try {
      console.info(LOG_TAG, Object.assign({ stage: stage, t: Date.now() }, payload || {}));
    } catch (e) {
      /* ignore */
    }
  }

  function normalize(text) {
    return String(text || "")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, " ");
  }

  function gatherContext(text, hooks, resolution, explicitAction) {
    const ES = global.EditSession;
    const DM = global.DesignMemoryEngine;
    const SS = global.SiteState;
    const doc = SS && SS.get ? SS.get() : null;
    const action = explicitAction || (resolution && resolution.selectedAction);

    const designMemory =
      DM && typeof DM.getMemory === "function"
        ? DM.getMemory()
        : doc && doc.meta && doc.meta.designMemory
          ? doc.meta.designMemory
          : {};

    const memorySummary = DM && typeof DM.summarize === "function" ? DM.summarize(designMemory) : {};

    const session = ES && typeof ES.getSession === "function" ? ES.getSession() : null;
    const editContext = ES && typeof ES.getContext === "function" ? ES.getContext() : null;
    const pendingVerification =
      ES && typeof ES.getPendingVerification === "function" ? ES.getPendingVerification() : null;

    const locks = ES && ES.acceptedLocks ? ES.acceptedLocks : {};
    const targetKey = targetKeyFromAction(action);

    let constraints = null;
    if (DM && typeof DM.getConstraints === "function" && targetKey) {
      constraints = DM.getConstraints(targetKey);
    }

    return {
      text: String(text || "").trim(),
      normalized: normalize(text),
      resolution: resolution,
      action: action,
      designMemory: designMemory,
      memorySummary: memorySummary,
      constraints: constraints,
      targetKey: targetKey,
      session: session,
      editContext: editContext,
      pendingVerification: pendingVerification,
      locks: locks,
      doc: doc,
      hooks: hooks || {},
    };
  }

  function targetKeyFromAction(action) {
    if (!action) return "";
    const t = action.target || "";
    if (t === "hero.image") return "hero:image";
    if (t === "about.image") return "about:image";
    if (t === "gallery.image") return "gallery:image";
    if (t === "design.color") return "page:color";
    if (t.indexOf("section:") === 0) return t.replace("section:", "") + ":text";
    if (t.indexOf("text:") === 0) return t.replace("text:", "").replace(/:/g, ":");
    return t.replace(/\./g, ":");
  }

  function sectionFromAction(action) {
    if (!action) return "hero";
    if (action.meta && action.meta.sectionId) return action.meta.sectionId;
    const t = action.target || "";
    if (t.indexOf("hero") >= 0) return "hero";
    if (t.indexOf("about") >= 0) return "about";
    if (t.indexOf("gallery") >= 0) return "gallery";
    if (t.indexOf("services") >= 0 || t.indexOf("section:services") >= 0) return "services";
    if (t.indexOf("faq") >= 0) return "faq";
    if (t.indexOf("contact") >= 0) return "contact";
    return "hero";
  }

  function actionNeedsImageEngine(action) {
    const type = action && action.type;
    if (!type) return false;
    if (/image/.test(type)) return true;
    return action.target === "about.image" || action.target === "gallery.image";
  }

  function actionNeedsTextEngine(action, resolution) {
    if (resolution && resolution.suppressTextIntelligence) return false;
    const type = action && action.type;
    if (!type) return false;
    if (/^text\./.test(type)) return true;
    return !!(action.target && action.target.indexOf("section:") === 0);
  }

  function buildExecutionPlan(ctx) {
    const action = ctx.action;
    const resolution = ctx.resolution;
    const section = sectionFromAction(action);
    const steps = [];

    steps.push({ id: "read_design_memory", engine: "design_memory", op: "read", status: "planned" });
    steps.push({ id: "read_edit_session", engine: "edit_session", op: "read", status: "planned" });

    const enginesNeeded = [];

    if (actionNeedsImageEngine(action)) {
      enginesNeeded.push("image_intelligence");
      steps.push({
        id: "plan_image",
        engine: "image_intelligence",
        op: "plan_select",
        kind: imageKindFromAction(action, section),
        userText: ctx.text,
        status: "planned",
      });
    }

    if (actionNeedsTextEngine(action, resolution)) {
      enginesNeeded.push("text_intelligence");
      steps.push({
        id: "plan_text",
        engine: "text_intelligence",
        op: "plan_generate",
        section: section,
        userText: ctx.text,
        status: "planned",
      });
    }

    steps.push({
      id: "memory_consult",
      engine: "design_memory",
      op: "consult",
      targetKey: ctx.targetKey,
      status: "planned",
    });

    steps.push({
      id: "execute_primary",
      engine: "pipeline",
      op: "execute",
      intent: action,
      status: "planned",
    });

    steps.push({ id: "verify_preview", engine: "pipeline", op: "verify", status: "planned" });
    steps.push({ id: "consistency_check", engine: "consistency", op: "site_review", status: "planned" });
    steps.push({ id: "quality_review", engine: "consistency", op: "quality_gate", status: "planned" });

    const checklist = buildInternalChecklist(steps, section);

    return {
      id: "plan-" + Date.now(),
      section: section,
      primaryAction: action,
      enginesNeeded: enginesNeeded,
      steps: steps,
      checklist: checklist,
      conflictPolicy: "design_memory_wins",
      qualityThreshold: MIN_IMPROVEMENT,
      retries: 0,
    };
  }

  function buildInternalChecklist(steps, section) {
    const items = [section + " section"];
    steps.forEach(function (step) {
      if (step.engine === "image_intelligence") items.push("image refinement");
      if (step.engine === "text_intelligence" && step.op !== "plan_cta_review") items.push("headline refinement");
      if (step.op === "site_review") items.push("verify consistency");
      if (step.op === "consult") items.push("read design memory");
    });
    items.push("update memory");
    return items;
  }

  function imageKindFromAction(action, section) {
    if (action && action.target === "about.image") return "about";
    if (action && action.target === "gallery.image") return "gallery";
    if (section === "about") return "about";
    if (section === "gallery") return "gallery";
    return "hero";
  }

  async function runPlanningPhase(plan, ctx) {
    const outcomes = [];
    const DM = global.DesignMemoryEngine;
    const IIE = global.ImageIntelligenceEngine;
    const TIE = global.TextIntelligenceEngine;

    for (let si = 0; si < plan.steps.length; si++) {
      const step = plan.steps[si];
      if (step.op === "read" || step.op === "resolve") {
        step.status = "done";
        outcomes.push({ stepId: step.id, ok: true });
        continue;
      }

      if (step.op === "consult" && DM && typeof DM.consultBeforeExecute === "function") {
        const consult = DM.consultBeforeExecute(plan.primaryAction, ctx.text, ctx.hooks);
        step.status = "done";
        step.result = consult;
        outcomes.push({ stepId: step.id, ok: true, consult: consult });
        continue;
      }

      if (step.op === "plan_select" && IIE) {
        const kind = step.kind || "hero";
        const targetKey =
          kind === "hero" ? "hero:image" : kind === "about" ? "about:image" : kind === "gallery" ? "gallery:image" : "services:image";
        let url = "";
        let validation = { accepted: true, score: 0.7 };
        let attempts = 0;

        while (attempts < 4) {
          url =
            typeof IIE.selectBest === "function"
              ? IIE.selectBest(kind, { userText: step.userText || ctx.text, variant: attempts > 0 ? "another" : undefined })
              : "";
          if (!url) break;
          if (DM && typeof DM.validateProposal === "function") {
            validation = DM.validateProposal({ kind: "image", url: url, userText: ctx.text }, targetKey);
            if (validation.accepted) break;
            const conflict = resolveConflict({
              type: "image_vs_memory",
              candidate: url,
              validation: validation,
              kind: kind,
            });
            if (conflict.action === "retry" && typeof IIE.recordRejected === "function") {
              IIE.recordRejected(kind, url);
            }
            attempts++;
          } else {
            break;
          }
        }

        step.status = "done";
        step.result = { url: url, validation: validation, attempts: attempts };
        outcomes.push({ stepId: step.id, ok: !!url, validation: validation });
        continue;
      }

      if ((step.op === "plan_generate" || step.op === "plan_cta_review") && TIE) {
        if (ctx.resolution && ctx.resolution.suppressTextIntelligence) {
          step.status = "skipped";
          outcomes.push({ stepId: step.id, ok: true, skipped: true });
          continue;
        }
        const context = step.op === "plan_cta_review" ? "cta" : step.section === "about" ? "about" : "hero";
        let preview = null;
        if (typeof TIE.generate === "function") {
          preview = await TIE.generate(context, ctx.text + "|plan", { userText: ctx.text });
        }
        step.status = "done";
        step.result = { preview: preview, context: context };
        outcomes.push({ stepId: step.id, ok: true, preview: !!preview });
      }
    }

    log("PLANNING", { planId: plan.id, outcomes: outcomes.length, checklist: plan.checklist });
    return outcomes;
  }

  function resolveConflict(conflict) {
    log("CONFLICT", {
      type: conflict.type,
      accepted: conflict.validation && conflict.validation.accepted,
      score: conflict.validation && conflict.validation.score,
    });

    if (conflict.type === "image_vs_memory") {
      if (conflict.validation && !conflict.validation.accepted) {
        return { action: "retry", reason: "design_memory_rejected_image", winner: "design_memory" };
      }
    }

    if (conflict.type === "text_vs_memory") {
      if (conflict.validation && !conflict.validation.accepted) {
        return { action: "retry", reason: "design_memory_rejected_text", winner: "design_memory" };
      }
    }

    return { action: "proceed", reason: "no_conflict", winner: "pipeline" };
  }

  async function executePlan(plan, ctx, exec) {
    exec = exec || {};
    const results = [];
    let primaryResult = null;
    let execText = ctx.text;
    let execIntent = plan.primaryAction;

    const planningOutcomes = await runPlanningPhase(plan, ctx);
    results.push({ phase: "planning", outcomes: planningOutcomes });

    const consultStep = plan.steps.find(function (s) {
      return s.op === "consult";
    });
    if (consultStep && consultStep.result) {
      if (consultStep.result.text) execText = consultStep.result.text;
      if (consultStep.result.action) execIntent = consultStep.result.action;
    }

    if (exec.executeIntentWithMemory && execIntent) {
      primaryResult = await exec.executeIntentWithMemory(execIntent, execText, ctx.hooks);
      results.push({ phase: "execute_primary", result: primaryResult });
    }

    return { results: results, primaryResult: primaryResult, execText: execText, execIntent: execIntent };
  }

  function validateChain(plan, execution, exec) {
    exec = exec || {};
    const CP = global.EditCommandPipeline;
    const primary = execution.primaryResult;
    if (!primary) {
      return { ok: false, improved: false, score: 0, reason: "no_primary_result" };
    }

    let score = primary.ok && primary.verified ? 0.78 : primary.ok ? 0.55 : 0.25;

    const DM = global.DesignMemoryEngine;
    if (DM && typeof DM.validateProposal === "function" && primary.after) {
      if (primary.requestedTarget === "hero.image" && primary.after.heroBgUrl) {
        const v = DM.validateProposal(
          { kind: "image", url: primary.after.heroBgUrl, userText: plan.primaryAction && plan.primaryAction.command },
          "hero:image",
        );
        if (v.accepted) score = Math.min(1, score + 0.12);
        else score = Math.max(0, score - 0.2);
      }
    }

    const siteScore = reviewSiteConsistency(plan.section);
    score = score * 0.75 + siteScore * 0.25;

    const improved = score >= plan.qualityThreshold;

    log("VALIDATE", {
      planId: plan.id,
      score: Math.round(score * 1000) / 1000,
      improved: improved,
      verified: primary.verified,
    });

    return {
      ok: primary.ok,
      verified: primary.verified,
      improved: improved,
      score: score,
      siteScore: siteScore,
      reason: improved ? "quality_pass" : "quality_below_threshold",
    };
  }

  function reviewSiteConsistency(focusSection) {
    const DM = global.DesignMemoryEngine;
    const SS = global.SiteState;
    const doc = SS && SS.get ? SS.get() : null;
    if (!doc || !DM || typeof DM.getMemory !== "function") return 0.65;

    const memory = DM.getMemory();
    const hasGlobal =
      (memory.global && memory.global.visualMood) || (memory.global && memory.global.typographyTone);
    if (!hasGlobal) return 0.72;

    let checks = 0;
    let passed = 0;

    if (focusSection === "hero" || !focusSection) {
      checks++;
      const heroTitle =
        doc.sections && doc.sections.hero && doc.sections.hero.content && doc.sections.hero.content["hero-title"];
      const heroUrl = doc.page && doc.page.heroBgUrl;
      if (heroTitle && heroUrl) passed++;
      else if (heroTitle || heroUrl) passed += 0.5;
    }

    if (memory.global.visualMood && memory.global.typographyTone) {
      checks++;
      passed++;
    }

    return checks > 0 ? passed / checks : 0.7;
  }

  async function internalQualityLoop(plan, ctx, exec) {
    let execution = await executePlan(plan, ctx, exec);
    let validation = validateChain(plan, execution, exec);
    let retries = 0;

    while (!validation.improved && validation.ok && retries < MAX_QUALITY_RETRIES) {
      retries++;
      plan.retries = retries;
      log("QUALITY_RETRY", { planId: plan.id, attempt: retries });

      if (plan.primaryAction && /image/.test(plan.primaryAction.type || "")) {
        plan.primaryAction = Object.assign({}, plan.primaryAction, {
          type: "hero.image.retry",
        });
      }

      execution = await executePlan(plan, ctx, exec);
      validation = validateChain(plan, execution, exec);
    }

    return { execution: execution, validation: validation };
  }

  function isSessionOnlyAction(action) {
    if (!action) return false;
    const type = action.type || "";
    if (type === "session.refine") return false;
    return /^session\./.test(type);
  }

  /**
   * Main orchestration entry — called from EditCommandPipeline.run().
   * @param {object} opts text, hooks, resolution, action, exec
   */
  async function run(opts) {
    opts = opts || {};
    const text = opts.text;
    const hooks = opts.hooks || {};
    const resolution = opts.resolution;
    const action = opts.action || (resolution && resolution.selectedAction);
    const exec = opts.exec || {};

    if (!action) {
      return { handled: false, orchestrated: true, ok: false };
    }

    if (isSessionOnlyAction(action)) {
      return { handled: false, orchestrated: true, sessionOnly: true };
    }

    const ctx = gatherContext(text, hooks, resolution, action);
    const plan = buildExecutionPlan(ctx);

    log("PLAN", {
      planId: plan.id,
      section: plan.section,
      engines: plan.enginesNeeded,
      steps: plan.steps.length,
      checklist: plan.checklist,
      action: action.type,
      target: action.target,
    });

    const loop = await internalQualityLoop(plan, ctx, exec);
    const primary = loop.execution.primaryResult;

    if (!primary) {
      if (exec.executeIntentWithMemory && action) {
        const fallback = await exec.executeIntentWithMemory(action, text, hooks);
        if (fallback) {
          fallback.orchestrated = true;
          fallback.planId = plan.id;
          return fallback;
        }
      }
      return { handled: false, orchestrated: true, ok: false, planId: plan.id };
    }

    primary.orchestrated = true;
    primary.planId = plan.id;
    primary.qualityScore = loop.validation.score;
    primary.qualityImproved = loop.validation.improved;

    return primary;
  }

  global.AIDesignOrchestrator = {
    run: run,
    gatherContext: gatherContext,
    buildExecutionPlan: buildExecutionPlan,
    runPlanningPhase: runPlanningPhase,
    executePlan: executePlan,
    validateChain: validateChain,
    resolveConflict: resolveConflict,
    reviewSiteConsistency: reviewSiteConsistency,
    ENGINE_IDS: ENGINE_IDS,
    log: log,
  };
})(typeof window !== "undefined" ? window : globalThis);
