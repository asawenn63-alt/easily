/**
 * Edit Command Pipeline — one verified action per user message.
 *
 * Rules enforced:
 * 1. Resolve to ONE specific action (target + type).
 * 2. Never mutate targets outside the resolved action.
 * 3. Never report success until preview/state confirms the change.
 * 4. On failure: explain, offer retry — never suggest full rebuild.
 * 5. Conversation context: follow-ups ("nej", "yngre") stay on pending target.
 * 6. Every run returns { requestedTarget, action, ok, verified, before, after, message }.
 * 7. Structured logging via console.info("[Easily · pipeline]", …).
 */
(function (global) {
  "use strict";

  const LOG_TAG = "[Easily · pipeline]";
  const CONTEXT_TTL_MS = 30 * 60 * 1000;

  /** @type {{ pending: object|null, lastResult: object|null, at: number }} */
  const conversation = {
    pending: null,
    lastResult: null,
    at: 0,
  };

  function normalize(text) {
    return String(text || "")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, " ");
  }

  function log(stage, payload) {
    const entry = Object.assign({ stage, t: Date.now() }, payload || {});
    try {
      console.info(LOG_TAG, entry);
    } catch (e) {
      /* ignore */
    }
    if (global.HeroImageDebug && typeof global.HeroImageDebug.log === "function") {
      global.HeroImageDebug.log("PIPELINE_" + stage, payload);
    }
    return entry;
  }

  function contextFresh() {
    return conversation.at > 0 && Date.now() - conversation.at < CONTEXT_TTL_MS;
  }

  function setPending(pending) {
    conversation.pending = Object.assign({}, pending, { at: Date.now() });
    conversation.at = Date.now();
    log("CONTEXT_SET", { pending: conversation.pending });
  }

  function clearPending() {
    conversation.pending = null;
    log("CONTEXT_CLEAR", {});
  }

  function resetConversation() {
    conversation.pending = null;
    conversation.lastResult = null;
    conversation.at = 0;
    log("CONVERSATION_RESET", {});
  }

  function readDomHeroSrc() {
    const img = document.querySelector(
      "#siteMain .site-hero img, #siteMain [data-section='hero'] img, #siteMain .hero__media img"
    );
    if (!img) return "";
    return String(img.getAttribute("src") || img.currentSrc || "").trim();
  }

  function readStateHeroUrl() {
    const SS = global.SiteState;
    const doc = SS && SS.get ? SS.get() : null;
    return doc && doc.page ? String(doc.page.heroBgUrl || "").trim() : "";
  }

  function readSectionText(sectionId, key) {
    const SS = global.SiteState;
    const doc = SS && SS.get ? SS.get() : null;
    if (!doc || !doc.sections || !doc.sections[sectionId]) return "";
    const content = doc.sections[sectionId].content || {};
    return String(content[key] || "").trim();
  }

  function hashSection(doc, sectionId) {
    const sec = doc && doc.sections && doc.sections[sectionId];
    if (!sec) return "";
    return JSON.stringify(sec.content || {}) + "|" + (sec.hidden ? "1" : "0");
  }

  /** @param {string} target */
  function captureSnapshot(target) {
    const SS = global.SiteState;
    const doc = SS && SS.get ? SS.get() : null;
    const snap = { target: target, at: Date.now() };

    if (!doc) return snap;

    if (target === "hero.image") {
      snap.heroBgUrl = readStateHeroUrl();
      snap.heroDomSrc = readDomHeroSrc();
    }
    if (target === "design.color") {
      snap.designColorSetId = (doc.page && doc.page.designColorSetId) || "";
    }
    if (target === "industry") {
      snap.industry = (doc.page && doc.page.industry) || "";
      snap.heroTitle = readSectionText("hero", "hero-title");
    }
    if (target && target.indexOf("text:") === 0) {
      const parts = target.split(":");
      snap.sectionId = parts[1];
      snap.fieldKey = parts[2];
      snap.textValue = readSectionText(parts[1], parts[2]);
    }
    if (target && target.indexOf("section:") === 0) {
      snap.sectionId = target.split(":")[1];
      snap.sectionHash = hashSection(doc, snap.sectionId);
    }
    return snap;
  }

  function verifyHeroChange(before, after, hooks) {
    const stateChanged = !!after.heroBgUrl && before.heroBgUrl !== after.heroBgUrl;
    const dbg = global.HeroImageDebug;
    let previewCheck = { ok: false };
    if (dbg && typeof dbg.verifyPreview === "function") {
      previewCheck = dbg.verifyPreview();
    }
    if (hooks && typeof hooks.heroPipelineOk === "function") {
      if (hooks.heroPipelineOk(after.heroBgUrl, previewCheck)) {
        return { ok: true, reason: "hero_verified" };
      }
    }
    if (stateChanged && previewCheck && previewCheck.ok) {
      return { ok: true, reason: "hero_verified" };
    }
    if (stateChanged) {
      return { ok: true, reason: "hero_state_changed", partial: !previewCheck.ok };
    }
    return { ok: false, reason: "hero_unchanged" };
  }

  function verifyChange(before, after, target, hooks) {
    if (!before || !after) return { ok: false, reason: "missing_snapshot" };
    if (target === "hero.image") return verifyHeroChange(before, after, hooks);
    if (target === "design.color") {
      if (before.designColorSetId !== after.designColorSetId && after.designColorSetId) {
        return { ok: true, reason: "color_changed" };
      }
      return { ok: false, reason: "color_unchanged" };
    }
    if (target === "industry") {
      const industryChanged = before.industry !== after.industry;
      const copyChanged = before.heroTitle !== after.heroTitle;
      if (industryChanged || copyChanged) return { ok: true, reason: "industry_updated" };
      return { ok: false, reason: "industry_unchanged" };
    }
    if (target && target.indexOf("text:") === 0) {
      if (before.textValue !== after.textValue && after.textValue) {
        return { ok: true, reason: "text_changed" };
      }
      return { ok: false, reason: "text_unchanged" };
    }
    if (target && target.indexOf("section:") === 0) {
      if (before.sectionHash !== after.sectionHash) {
        return { ok: true, reason: "section_changed" };
      }
      return { ok: false, reason: "section_unchanged" };
    }
    return { ok: true, reason: "no_verifier" };
  }

  async function syncPreview(target) {
    const EE = global.EditorEngine;
    if (!EE) return;
    if (target === "hero.image") {
      if (typeof EE.remountAsync === "function") await EE.remountAsync();
      else if (EE.remount) EE.remount();
      if (typeof EE.syncHeroFromState === "function") EE.syncHeroFromState();
      const dbg = global.HeroImageDebug;
      if (dbg && typeof dbg.waitForHeroPhotoLoad === "function") {
        await dbg.waitForHeroPhotoLoad();
      }
      return;
    }
    if (typeof EE.remountAsync === "function") await EE.remountAsync();
    else if (EE.remount) EE.remount();
  }

  function isRefinementFollowUp(s, pending) {
    if (!pending) return false;
    if (/^(igen|retry|pröva|prova|försök|forsok|try again|once more)$/.test(s)) return true;
    if (/^(nej|no|inte|fel|younger|yngre|äldre|mer|mindre|annan|mörk|ljus|exklusiv|modern|snyggare|enklare)/.test(s)) {
      return true;
    }
    if (pending.domain === "hero.image" && s.length <= 56) return true;
    return false;
  }

  function refineCommand(baseCommand, refinement) {
    const base = String(baseCommand || "byt hero-bild").trim();
    const ref = String(refinement || "").trim();
    if (!ref || /^(nej|no|inte riktigt|fel)$/.test(ref.toLowerCase())) return base;
    if (/^(igen|retry|pröva|prova|försök)$/.test(ref.toLowerCase())) return base;
    if (base.toLowerCase().indexOf(ref.toLowerCase()) >= 0) return base;
    return base + " — " + ref;
  }

  function failureMessage(target, reason) {
    if (target === "hero.image") {
      return (
        "Den där satt inte riktigt.\n\n" +
        "Vill du att jag provar igen, eller beskriver du bilden lite annorlunda? (Bilder & länkar → Hero-bild fungerar också.)"
      );
    }
    if (target === "design.color") {
      return "Färgerna ändrades inte som jag tänkte.\n\nSka jag prova igen?";
    }
    if (target === "industry") {
      return "Det där blev inte rätt ännu.\n\nSkriv gärna kort vad verksamheten heter och gör — t.ex. «återvinning Jretur» — så försöker jag igen.";
    }
    return "Det där blev inte som jag tänkte.\n\nVill du att jag provar igen?";
  }

  function successMessage(intent) {
    switch (intent.type) {
      case "hero.image":
      case "hero.image.retry":
        return "";
      case "hero.image.refine":
        return "";
      case "design.color":
        return intent.meta && intent.meta.motivation
          ? intent.meta.motivation + " Hela webbplatsen följer det nya temat."
          : intent.meta && intent.meta.label
            ? "Jag har bytt till " + intent.meta.label + " — header, knappar, kort och bakgrunder följer samma tema."
            : "Jag har bytt färgtemat på hela webbplatsen.";
      case "industry.adapt":
        return "Jag har anpassat innehåll och bilder till din verksamhet.\n\nKänns det rätt?";
      case "site.rebuild":
        return "Jag har byggt om hela sidan utifrån din beskrivning.\n\nVad tycker du om helheten?";
      case "text.set":
        return "";
      case "text.regen":
        return "";
      default:
        return intent.meta && intent.meta.message ? intent.meta.message : "";
    }
  }

  /**
   * @param {{ type: string, target: string, command?: string, meta?: object }} intent
   * @param {string} text
   * @param {object} hooks
   */
  async function executeIntent(intent, text, hooks) {
    hooks = hooks || {};
    const ES = global.EditSession;
    if (ES && typeof ES.beginEdit === "function") {
      const ctx =
        (intent.meta && intent.meta.context) ||
        (ES.contextFromPipelineTarget && ES.contextFromPipelineTarget(intent.target, intent.type));
      ES.beginEdit(ctx);
    }

    const result = await executeIntentInner(intent, text, hooks);

    conversation.lastResult = result;
    conversation.at = Date.now();
    log("RESULT", {
      action: result.action,
      target: result.requestedTarget,
      ok: result.ok,
      verified: result.verified,
      failureReason: result.failureReason,
      session: ES && ES.getSession ? ES.getSession() : null,
    });
    return result;
  }

  async function executeIntentInner(intent, text, hooks) {
    hooks = hooks || {};
    const result = {
      requestedTarget: intent.target,
      action: intent.type,
      ok: false,
      verified: false,
      before: null,
      after: null,
      message: "",
      failureReason: null,
      handled: true,
    };

    switch (intent.type) {
      case "hero.image":
      case "hero.image.retry":
      case "hero.image.refine": {
        result.before = captureSnapshot("hero.image");
        if (hooks.rememberUserImageRequest) hooks.rememberUserImageRequest(intent.command || text);
        const execOk =
          hooks.executeHeroImage &&
          (await hooks.executeHeroImage(intent.command || text, { skipMessage: true }));
        await syncPreview("hero.image");
        result.after = captureSnapshot("hero.image");
        const verification = verifyChange(result.before, result.after, "hero.image", hooks);
        result.verified = verification.ok;
        result.ok = !!execOk && verification.ok;
        result.failureReason = verification.reason;
        if (result.ok) {
          result.message = successMessage(intent);
          setPending({ domain: "hero.image", target: "hero.image", lastCommand: intent.command || text });
          if (hooks.noteImageRequestHandled) hooks.noteImageRequestHandled(intent.command || text);
        } else {
          result.message = failureMessage("hero.image", verification.reason);
          if (hooks.noteAssistantAction) hooks.noteAssistantAction("image_failed");
        }
        break;
      }

      case "design.color": {
        result.before = captureSnapshot("design.color");
        const colorResult =
          hooks.applyColorChange && (await hooks.applyColorChange(intent.command || text));
        await syncPreview("design.color");
        result.after = captureSnapshot("design.color");
        const verification = verifyChange(result.before, result.after, "design.color", hooks);
        result.verified = verification.ok;
        result.ok = !!(colorResult && colorResult.ok !== false) && verification.ok;
        result.failureReason = verification.reason;
        if (result.ok) {
          intent.meta = intent.meta || {};
          intent.meta.label = colorResult && colorResult.label;
          intent.meta.motivation = colorResult && colorResult.motivation;
          result.message = successMessage(intent);
          clearPending();
          if (hooks.noteAssistantAction) hooks.noteAssistantAction("color_ok");
        } else {
          result.message = failureMessage("design.color", verification.reason);
          if (hooks.noteAssistantAction) hooks.noteAssistantAction("color_failed");
        }
        break;
      }

      case "text.set":
      case "text.regen": {
        const targetKey = intent.target || (intent.meta && intent.meta.targetKey);
        result.before = captureSnapshot(targetKey);
        const textResult =
          global.TextChatCommands &&
          typeof global.TextChatCommands.executeIntent === "function" &&
          (await global.TextChatCommands.executeIntent(intent, text));
        await syncPreview(targetKey);
        result.after = captureSnapshot(targetKey);
        const verification = verifyChange(result.before, result.after, targetKey, hooks);
        result.verified = textResult && textResult.verified !== false && verification.ok;
        result.ok = !!(textResult && textResult.ok) && result.verified;
        result.failureReason = textResult && textResult.failureReason ? textResult.failureReason : verification.reason;
        if (result.ok) {
          result.message = (textResult && textResult.message) || successMessage(intent);
          setPending({
            domain: "text",
            target: targetKey,
            lastCommand: text,
            sectionId: intent.meta && intent.meta.sectionId,
          });
        } else {
          result.message =
            (textResult && textResult.message) ||
            failureMessage(targetKey, result.failureReason);
        }
        break;
      }

      case "industry.adapt": {
        result.before = captureSnapshot("industry");
        const adaptOk =
          hooks.adaptIndustry &&
          (await hooks.adaptIndustry(intent.command || text, {
            refreshHero: !!(intent.meta && intent.meta.refreshHero),
            quiet: true,
            pipeline: true,
          }));
        await syncPreview("industry");
        result.after = captureSnapshot("industry");
        const verification = verifyChange(result.before, result.after, "industry", hooks);
        result.verified = verification.ok;
        result.ok = !!adaptOk && verification.ok;
        result.failureReason = verification.reason;
        result.message = result.ok ? successMessage(intent) : failureMessage("industry", verification.reason);
        if (result.ok) clearPending();
        break;
      }

      case "site.rebuild": {
        result.before = captureSnapshot("industry");
        const rebuildOk = hooks.rebuildSite && (await hooks.rebuildSite(intent.command || text, { pipeline: true }));
        await syncPreview("industry");
        result.after = captureSnapshot("industry");
        const verification = verifyChange(result.before, result.after, "industry", hooks);
        result.verified = verification.ok;
        result.ok = !!rebuildOk;
        result.message = result.ok ? successMessage(intent) : "Det gick inte att bygga om hela sidan just nu. Vill du att jag provar igen, eller berättar du vad som ska ändras?";
        if (result.ok) clearPending();
        break;
      }

      case "legacy": {
        if (hooks.runLegacyHandler) {
          const legacyResult = await hooks.runLegacyHandler(intent, text);
          return legacyResult || { handled: false, ok: false, action: "legacy", requestedTarget: intent.target };
        }
        result.handled = false;
        break;
      }

      case "delegate":
      default:
        result.handled = false;
        break;
    }

    return result;
  }

  function sessionIntentToPipeline(sessionIntent) {
    const ctx = sessionIntent.context || (global.EditSession && global.EditSession.getContext());
    const cmd = sessionIntent.command || "";
    if (!ctx || !ctx.section) return null;

    if (ctx.section === "hero" && ctx.object === "image") {
      return {
        type: /igen|annan|another|alternativ/.test(normalize(cmd)) ? "hero.image.retry" : "hero.image.refine",
        target: "hero.image",
        command: cmd,
        meta: { refinement: cmd, fromSession: true, context: ctx },
      };
    }
    if (ctx.section === "about" && ctx.object === "image") {
      return {
        type: "legacy",
        target: "about.image",
        command: cmd || "byt om oss-bild",
        meta: { materialImage: "about", context: ctx },
      };
    }
    if (ctx.section === "gallery" && ctx.object === "image") {
      return {
        type: "legacy",
        target: "gallery.image",
        command: cmd || "byt galleribild",
        meta: { materialImage: "gallery", context: ctx },
      };
    }
    if (ctx.section === "hero" && ctx.object === "text") {
      return {
        type: "text.regen",
        target: "section:hero",
        command: cmd,
        meta: { sectionId: "hero", label: "Hero", fromSession: true, context: ctx },
      };
    }
    if (ctx.section === "about" && ctx.object === "text") {
      return {
        type: "text.regen",
        target: "section:about",
        command: cmd,
        meta: { sectionId: "about", label: "Om oss", fromSession: true, context: ctx },
      };
    }
    if (ctx.object === "color") {
      return { type: "design.color", target: "design.color", command: cmd || "byt färgtema", meta: { fromSession: true, context: ctx } };
    }
    if (ctx.section === "hero" && ctx.object === "cta") {
      return {
        type: "text.regen",
        target: "section:hero",
        command: cmd || "skriv om hero-knappen",
        meta: { sectionId: "hero", label: "Knappen", fromSession: true, context: ctx },
      };
    }
    if (ctx.section === "header" && ctx.object === "logo") {
      return { type: "session.open_material", target: "header.logo", command: cmd, meta: { context: ctx } };
    }
    return null;
  }

  async function orchestrateExecution(text, hooks, resolution, action) {
    const execText =
      (resolution && resolution.executionText) ||
      (resolution && resolution.fromClarification && action && action.command) ||
      text;
    const ORCH = global.AIDesignOrchestrator;
    if (ORCH && typeof ORCH.run === "function" && action && !/^session\./.test(action.type || "")) {
      const orchestrated = await ORCH.run({
        text: execText,
        hooks: hooks,
        resolution: resolution,
        action: action,
        exec: { executeIntentWithMemory: executeIntentWithMemory },
      });
      if (orchestrated && orchestrated.orchestrated !== false) {
        return orchestrated;
      }
    }
    return executeIntentWithMemory(action, execText, hooks);
  }

  async function executeIntentWithMemory(intent, text, hooks) {
    hooks = hooks || {};
    const DM = global.DesignMemoryEngine;
    let execText = text;
    let execIntent = intent;
    if (DM && typeof DM.consultBeforeExecute === "function" && intent && !/^session\./.test(intent.type || "")) {
      const consult = DM.consultBeforeExecute(intent, text, hooks);
      log("DESIGN_MEMORY", consult.context || {});
      if (consult.text) execText = consult.text;
      if (consult.action) execIntent = consult.action;
      hooks = Object.assign({}, hooks, { designMemory: consult.context });
    }
    return executeIntent(execIntent, execText, hooks);
  }

  /**
   * @param {string} text
   * @param {object} hooks
   */
  async function run(text, hooks) {
    hooks = hooks || {};
    const ES = global.EditSession;
    const IRE = global.IntentResolutionEngine;
    log("RECEIVED", { text: text, session: ES && ES.getSession ? ES.getSession() : null });

    if (IRE && typeof IRE.resolve === "function") {
      const resolution = IRE.resolve(text, hooks);
      log("IRE", {
        intent: resolution.intent,
        confidence: resolution.confidence,
        target: resolution.target,
        reason: resolution.reason,
        decision: resolution.decision,
        candidates: resolution.candidateActions,
      });

      if (resolution.decision === "clarify" && resolution.clarify) {
        return {
          handled: true,
          ok: false,
          verified: false,
          action: "intent.clarify",
          requestedTarget: resolution.target,
          message: resolution.clarify.message,
          chips: resolution.clarify.chips || [],
          intentResolution: resolution,
        };
      }

      const action = resolution.selectedAction;
      if (action) {
        if (action.type === "session.keep") {
          const followUp = ES.handleKeep();
          return {
            handled: true,
            ok: true,
            verified: true,
            action: "session.keep",
            requestedTarget: followUp.context && ES.contextLabel ? ES.contextLabel(followUp.context) : null,
            message: followUp.message,
            chips: followUp.chips || [],
            sessionContext: ES.getContext && ES.getContext(),
            intentResolution: resolution,
          };
        }

        if (action.type === "session.undo") {
          const undoResult = ES.handleUndo();
          return {
            handled: true,
            ok: true,
            verified: true,
            action: "session.undo",
            requestedTarget: null,
            message: undoResult.message,
            chips: undoResult.chips || [],
            intentResolution: resolution,
          };
        }

        if (action.type === "session.open_material") {
          if (global.StudioPanelModes && typeof global.StudioPanelModes.switchTab === "function") {
            global.StudioPanelModes.switchTab("material");
          }
          return {
            handled: true,
            ok: true,
            verified: true,
            action: "session.open_material",
            requestedTarget: "header.logo",
            message: "Öppnade Bilder & länkar — ladda upp logotypen där, så tittar vi på den tillsammans.",
            chips: [{ label: "Logotypen är klar", command: "__keep__" }],
            sessionContext: ES.getContext && ES.getContext(),
            intentResolution: resolution,
          };
        }

        if (action.type === "session.refine") {
          const mapped = sessionIntentToPipeline(action);
          if (mapped) {
            if (mapped.type === "session.open_material") {
              return run("__open_material__", hooks);
            }
            log("INTENT", mapped);
            const execText = resolution.executionText || text;
            const result = await orchestrateExecution(execText, hooks, resolution, mapped);
            result.intentResolution = resolution;
            return ES.wrapPipelineResult(result);
          }
        }

        log("INTENT", action);
        const execText = resolution.executionText || text;
        const result = await orchestrateExecution(execText, hooks, resolution, action);
        if (ES && result && result.handled !== false && result.action !== "site.rebuild") {
          result.intentResolution = resolution;
          return ES.wrapPipelineResult(result);
        }
        result.intentResolution = resolution;
        return result;
      }
    }

    if (String(text || "").trim() === "__open_material__") {
      if (global.StudioPanelModes && typeof global.StudioPanelModes.switchTab === "function") {
        global.StudioPanelModes.switchTab("material");
      }
      return {
        handled: true,
        ok: true,
        verified: true,
        action: "session.open_material",
        requestedTarget: "material.logo",
        message: "Öppnade Bilder & länkar — ladda upp logotyp där, så tittar vi på den tillsammans.",
        chips: [{ label: "Logotypen är klar", command: "__accept__" }],
      };
    }

    if (hooks.runLegacyHandler) {
      const legacy = await hooks.runLegacyHandler({ type: "delegate", target: "unknown", command: text }, text);
      return ES && legacy && legacy.ok ? ES.wrapPipelineResult(legacy) : legacy;
    }

    return { handled: false, ok: false, action: "none", requestedTarget: null, message: "" };
  }

  global.EditCommandPipeline = {
    run: run,
    resolveIntent: function (text, hooks) {
      const IRE = global.IntentResolutionEngine;
      if (IRE && typeof IRE.resolve === "function") {
        const r = IRE.resolve(text, hooks);
        return r.selectedAction || null;
      }
      return null;
    },
    captureSnapshot: captureSnapshot,
    verifyChange: verifyChange,
    syncPreview: syncPreview,
    getConversationContext: function () {
      return JSON.parse(JSON.stringify(conversation));
    },
    resetConversation: resetConversation,
    log: log,
  };
})(typeof window !== "undefined" ? window : globalThis);
