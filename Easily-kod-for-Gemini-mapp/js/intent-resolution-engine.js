/**
 * Intent Resolution Engine — brain of the Easily editor.
 *
 * Combines EditSession, conversation context, recent actions and utterance signals
 * to resolve what the user wants — even when incomplete or ambiguous.
 *
 * Returns: intent, confidence, target, reason, candidateActions, selectedAction, decision.
 */
(function (global) {
  "use strict";

  const LOG_TAG = "[Easily · intent]";
  const HIGH_EXECUTE = 0.72;
  const MEDIUM_FLOOR = 0.4;
  const MIN_GAP = 0.18;

  /** Editable targets the engine scores. */
  const TARGETS = [
    { key: "hero:image", target: "hero.image", label: "hero-bilden", section: "hero", object: "image" },
    { key: "hero:text", target: "section:hero", label: "rubriken", section: "hero", object: "text" },
    { key: "hero:cta", target: "section:hero", label: "knappen", section: "hero", object: "cta" },
    { key: "about:image", target: "about.image", label: "bilden i Om oss", section: "about", object: "image" },
    { key: "about:text", target: "section:about", label: "texten i Om oss", section: "about", object: "text" },
    { key: "gallery:image", target: "gallery.image", label: "galleribilden", section: "gallery", object: "image" },
    { key: "services:image", target: "services.image", label: "bilden på tjänstekortet", section: "services", object: "image" },
    { key: "page:color", target: "design.color", label: "färgerna", section: "page", object: "color" },
    { key: "header:logo", target: "header.logo", label: "logotypen", section: "header", object: "logo" },
  ];

  function normalize(text) {
    return String(text || "")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, " ");
  }

  function log(stage, payload) {
    const entry = Object.assign({ stage: stage, t: Date.now() }, payload || {});
    try {
      console.info(LOG_TAG, entry);
    } catch (e) {
      /* ignore */
    }
    return entry;
  }

  /** Temporary state — next user message resolves this before normal intent analysis. */
  let clarificationState = null;

  function createClarificationState(questionId, opts) {
    opts = opts || {};
    return {
      questionId: questionId || "clarify.target",
      expectedAnswerType: opts.expectedAnswerType || "target_selection",
      expectedTargets: opts.expectedTargets || [],
      originalUserText: opts.originalUserText || "",
      originalTargetKey: opts.originalTargetKey || "",
      candidateActions: opts.candidateActions || [],
      createdAt: Date.now(),
      expiresAfterReply: opts.expiresAfterReply !== false,
    };
  }

  function setClarificationState(state) {
    clarificationState = state;
    log("CLARIFY_SET", {
      questionId: state && state.questionId,
      expectedTargets: state && state.expectedTargets,
      originalUserText: state && state.originalUserText,
    });
  }

  function getClarificationState() {
    return clarificationState;
  }

  function clearClarificationState() {
    clarificationState = null;
  }

  function inferOriginalTargetKey(utterance, candidates) {
    const s = utterance.s;
    if (/(hero-bild|herobild|hero bild|bakgrundsbild|banner)/.test(s)) return "hero:image";
    if (/(bild|foto)/.test(s) && /(hero|topp|start|banner)/.test(s) && !/(rubrik|headline|ingress|texten)/.test(s)) {
      return "hero:image";
    }
    if (/(rubrik|headline|ingress)/.test(s) && /(skriv|ändra|byt|omformulera|generera)/.test(s) && !/(bild|foto)/.test(s)) {
      return "hero:text";
    }
    if (/(om oss|about)/.test(s) && /(bild|foto)/.test(s)) return "about:image";
    if (/(galleri|gallery)/.test(s) && /(bild|foto)/.test(s)) return "gallery:image";
    if (candidates && candidates[0] && candidates[0].key) return candidates[0].key;
    return "hero:image";
  }

  /** Parse which target the user chose in a clarification reply. */
  function parseClarificationTarget(reply, state) {
    const s = normalize(reply);
    if (!s) return null;

    if (/inte.*rubrik|rubrik.*inte|kan.*inte.*(bild|foto).*rubrik|bild.*inte.*rubrik|inte.*headline|inte i rubriken/.test(s)) {
      return "hero:image";
    }
    if (/menade.*(hero-bild|herobild|hero bild|bakgrundsbild|bilden i hero|hero-bilden)/.test(s)) {
      return "hero:image";
    }
    if (/menade.*(rubrik|headline|ingress)/.test(s) && !/(bild|foto)/.test(s)) {
      return "hero:text";
    }

    if (/(hero-bild|herobild|hero bild|bakgrundsbild|banner|hero-bilden)/.test(s)) return "hero:image";
    if (/(bild|foto)/.test(s) && /(hero|topp|start|banner)/.test(s) && !/(rubrik|headline|ingress|texten)/.test(s)) {
      return "hero:image";
    }
    if (/(rubrik|headline|ingress)/.test(s) && !/(bild|foto)/.test(s)) return "hero:text";
    if (/(om oss|about)/.test(s) && /(bild|foto)/.test(s)) return "about:image";
    if (/(galleri|gallery)/.test(s) && /(bild|foto)/.test(s)) return "gallery:image";
    if (/(tjänst|tjanst|service|kort)/.test(s) && /(bild|foto)/.test(s)) return "services:image";
    if (/(färg|farg|palett|tema)/.test(s) && !/(bild|foto)/.test(s)) return "page:color";
    if (/(logotyp|logo|logga)/.test(s)) return "header:logo";

    const expected = (state && state.expectedTargets) || [];
    for (let i = 0; i < expected.length; i++) {
      const def = targetByKey(expected[i]);
      if (!def) continue;
      const label = normalize(def.label);
      if (label && s.indexOf(label) >= 0) return expected[i];
    }

    return null;
  }

  /** User repeats the original request — treat as confirmation of original intent. */
  function isClarificationConfirmation(reply, state) {
    const s = normalize(reply);
    const orig = normalize(state && state.originalUserText);
    if (!orig || !s) return false;

    if (/(bild|foto)/.test(orig) && /(bild|foto)/.test(s) && /(hero|topp|banner)/.test(s)) return true;

    const origTokens = orig.split(" ").filter(function (w) {
      return w.length > 3;
    });
    if (orig.length >= 10 && s.length >= 10 && origTokens.length) {
      let overlap = 0;
      origTokens.forEach(function (w) {
        if (s.indexOf(w) >= 0) overlap++;
      });
      if (overlap >= Math.min(3, Math.ceil(origTokens.length * 0.4))) return true;
    }
    return false;
  }

  function buildClarificationExecution(targetKey, state) {
    const original = (state && state.originalUserText) || "";
    const object = targetKey.split(":")[1];
    const section = targetKey.split(":")[0];

    if (object === "image") {
      let command = "byt hero-bild";
      if (section === "about") command = "byt om oss-bild";
      else if (section === "gallery") command = "byt galleribild";
      else if (section === "services") command = "byt tjänstebild";
      return {
        command: command,
        executionText: command,
        suppressTextIntelligence: true,
      };
    }

    if (object === "color") {
      return { command: "byt färgtema", executionText: "byt färgtema", suppressTextIntelligence: true };
    }

    if (object === "logo") {
      return { command: "__open_material__", executionText: "__open_material__", suppressTextIntelligence: true };
    }

    return {
      command: "skriv om " + section + "-texten",
      executionText: original || "skriv om " + section + "-texten",
      suppressTextIntelligence: false,
    };
  }

  function resolveClarificationReply(text, hooks, state) {
    const utterance = analyzeUtterance(text);
    let targetKey = parseClarificationTarget(text, state);
    let reason = "clarification_reply:explicit_target";

    if (!targetKey && isClarificationConfirmation(text, state)) {
      targetKey = state.originalTargetKey || inferOriginalTargetKey({ s: normalize(state.originalUserText), signals: [] }, state.candidateActions);
      reason = "clarification_reply:confirmation_repeat";
    }

    if (!targetKey && state.originalTargetKey && /(bild|foto)/.test(normalize(state.originalUserText))) {
      targetKey = state.originalTargetKey;
      reason = "clarification_reply:original_image_intent";
    }

    if (!targetKey) {
      const top = (state.candidateActions && state.candidateActions[0]) || { key: "hero:image", label: "hero-bilden" };
      const second = (state.candidateActions && state.candidateActions[1]) || { key: "hero:text", label: "rubriken" };
      return {
        intent: "clarify.retry",
        confidence: 0.5,
        target: top.target || null,
        reason: "clarification_unresolved",
        candidateActions: state.candidateActions || [],
        selectedAction: null,
        decision: "clarify",
        clarify: {
          message: "Förlåt — menade du " + top.label + " (bakgrundsfoto) eller " + second.label + "?",
          chips: [
            { label: "Hero-bilden", command: "byt hero-bild" },
            { label: "Rubriken", command: "skriv om hero-rubriken" },
          ],
        },
      };
    }

    const exec = buildClarificationExecution(targetKey, state);
    const ctx = gatherContext(hooks);
    const action = {
      type: "session.refine",
      context: pickActiveContext(ctx, targetKey),
      contextKey: targetKey,
      mode: "refine",
      command: exec.command,
      label: targetByKey(targetKey) ? targetByKey(targetKey).label : "",
    };
    const pipelineAction = mapToPipelineIntent(action, hooks);

    if (pipelineAction && pipelineAction.type === "text.regen" && exec.suppressTextIntelligence) {
      const imageAction = mapToPipelineIntent(
        {
          type: "session.refine",
          context: { page: "home", section: "hero", object: "image" },
          contextKey: "hero:image",
          mode: "refine",
          command: "byt hero-bild",
        },
        hooks,
      );
      return {
        intent: "hero.image",
        confidence: 0.96,
        target: "hero.image",
        reason: reason + ":forced_image_not_text",
        candidateActions: state.candidateActions || [],
        selectedAction: imageAction,
        decision: "execute",
        fromClarification: true,
        suppressTextIntelligence: true,
        executionText: "byt hero-bild",
        clarifyResolved: { questionId: state.questionId, targetKey: "hero:image" },
      };
    }

    return {
      intent: pipelineAction ? pipelineAction.type : "refine.context",
      confidence: 0.94,
      target: pipelineAction ? pipelineAction.target : targetKey,
      reason: reason,
      candidateActions: state.candidateActions || [],
      selectedAction: pipelineAction || action,
      decision: "execute",
      fromClarification: true,
      suppressTextIntelligence: exec.suppressTextIntelligence,
      executionText: exec.executionText,
      clarifyResolved: { questionId: state.questionId, targetKey: targetKey },
    };
  }

  function targetByKey(key) {
    for (let i = 0; i < TARGETS.length; i++) {
      if (TARGETS[i].key === key) return TARGETS[i];
    }
    return null;
  }

  function ctxKey(ctx) {
    if (!ctx || !ctx.section || !ctx.object) return "";
    return ctx.section + ":" + ctx.object;
  }

  /** Gather all context layers — never rely on a single source. */
  function gatherContext(hooks) {
    hooks = hooks || {};
    const ES = global.EditSession;
    const CP = global.EditCommandPipeline;
    const session = ES && ES.getSession ? ES.getSession() : null;
    const editCtx = ES && ES.getContext ? ES.getContext() : null;
    const pending = session && session.pendingVerification;
    const pendingCtx = pending && pending.context;
    const conv = CP && CP.getConversationContext ? CP.getConversationContext() : null;
    const recentWeights =
      ES && typeof ES.getRecentFocusWeights === "function" ? ES.getRecentFocusWeights() : {};
    const chatSignals =
      hooks.getConversationSignals && typeof hooks.getConversationSignals === "function"
        ? hooks.getConversationSignals()
        : {};

    const recentUserLines = [];
    try {
      const thread = document.getElementById("studioChatThread");
      const msgs = thread ? thread.querySelectorAll(".studio-chat__msg--user p:last-child") : [];
      for (let i = Math.max(0, msgs.length - 6); i < msgs.length; i++) {
        const t = String(msgs[i].textContent || "").trim();
        if (t) recentUserLines.push(t);
      }
    } catch (e) {
      /* ignore */
    }

    return {
      editCtx: editCtx,
      pending: pending,
      pendingCtx: pendingCtx,
      pendingTarget: pending && pending.target,
      acceptedLocks: (session && session.acceptedLocks) || {},
      lastAccepted: session && session.lastAcceptedChange,
      conversation: conv,
      recentWeights: recentWeights,
      chatSignals: chatSignals,
      recentUserLines: recentUserLines,
      sessionFresh: session && session.at > 0 && Date.now() - session.at < 45 * 60 * 1000,
    };
  }

  /** Utterance signals — weighted hints, not boolean regex gates. */
  function analyzeUtterance(text) {
    const raw = String(text || "").trim();
    const s = normalize(raw);
    const signals = [];

    if (!raw) return { raw: raw, s: s, signals: signals };

    if (/^(__keep__|__accept__|__undo__|__try_another__|__open_material__)$/.test(raw)) {
      signals.push({ kind: "chip", value: raw, weight: 1 });
    }

    if (/^(ja|yes|ok|okej|okay|bra|perfekt|nöjd|nojd|toppen|super|behåll|behall|keep|stämmer|stammer|den är bra|det är bra|ser bra ut|fungerar)$/.test(s)) {
      signals.push({ kind: "accept", weight: 0.98 });
    }
    if (/^(nej|no|inte|inte riktigt|fel|nä|na)$/.test(s)) {
      signals.push({ kind: "reject", weight: 0.96 });
    }
    if (/^(ångra|angra|undo|ta tillbaka|gå tillbaka|ga tillbaka|back)$/.test(s)) {
      signals.push({ kind: "undo", weight: 0.98 });
    }
    if (/^(igen|retry|pröva|prova|försök|forsok|try again|once more)$/.test(s)) {
      signals.push({ kind: "retry", weight: 0.95 });
    }
    if (
      /^(en till|visa en till|en till tack|en till bild|en annan|en annan bild|annan|another|alternativ|nästa|next)$/.test(s) ||
      /^(ändra|byt|ta)\s+en till(\s+tack)?$/.test(s) ||
      /visa en till|prova en annan|en annan variant/.test(s)
    ) {
      signals.push({ kind: "another", weight: 0.94 });
    }
    if (/^byt den|^byt den där|^byt bild|^ny bild|^annan bild/.test(s) || (/\b(den|det)\b/.test(s) && /(byt|ändra|fixa|gör om|visa)/.test(s))) {
      signals.push({ kind: "swap", weight: 0.88 });
    }
    if (/blev inte|inte bra|inte som|satt inte|fungerar inte|gillar inte|hate|fel bild|fel typ/.test(s)) {
      signals.push({ kind: "reject", weight: 0.9 });
    }

    if (/yngre|younger|äldre|eldre|mer ung/.test(s)) signals.push({ kind: "refine", axis: "age", dir: "younger", weight: 0.88 });
    if (/mörk|mork|dark|djupare/.test(s)) signals.push({ kind: "refine", axis: "tone", dir: "dark", weight: 0.85 });
    if (/ljus|light|ljusare|bright/.test(s)) signals.push({ kind: "refine", axis: "tone", dir: "light", weight: 0.85 });
    if (/modern|modernare|contemporary/.test(s)) signals.push({ kind: "refine", axis: "style", dir: "modern", weight: 0.82 });
    if (/exklusiv|premium|lyx|elegant|elegantare|finare|stilren|snyggare|high.?end/.test(s)) {
      signals.push({ kind: "aesthetic", axis: "premium", weight: 0.8 });
    }
    if (/varm|varmare|warm|mjuk|mysig/.test(s)) signals.push({ kind: "aesthetic", axis: "warm", weight: 0.78 });
    if (/nordisk|skandinav|minimal|ren|luft|luftigare|mer luft|enklare/.test(s)) {
      signals.push({ kind: "aesthetic", axis: "nordic", weight: 0.76 });
    }
    if (/mindre text|kortare text|korta ner|färre ord/.test(s)) {
      signals.push({ kind: "text", axis: "shorter", weight: 0.86 });
    }
    if (/mer text|längre text|utveckla text/.test(s)) {
      signals.push({ kind: "text", axis: "longer", weight: 0.84 });
    }

    if (/(hero-bild|hero bild|herobild|bakgrundsbild|banner)/.test(s)) {
      signals.push({ kind: "explicit", target: "hero:image", weight: 0.92 });
    }
    if (/(bild|foto).*(i |på |i$)?(hero|topp|start|banner)|hero.*(bild|foto)/.test(s)) {
      signals.push({ kind: "explicit", target: "hero:image", weight: 0.91 });
    }
    if (/(hero|rubrik|headline|ingress)/.test(s) && /(text|skriv|rubrik|generera om|generera|regenerera|omformulera)/.test(s) && !/(bild|foto)/.test(s)) {
      signals.push({ kind: "explicit", target: "hero:text", weight: 0.88 });
    }
    if (/(om oss|about)/.test(s) && /(personlig|premium|varmare|professionell|skriv om|generera|text)/.test(s) && !/(bild|foto)/.test(s)) {
      signals.push({ kind: "explicit", target: "about:text", weight: 0.9 });
    }
    if (/(hero|ingress|rubrik)/.test(s) && /(mindre sälj|sälj|säljig|mer personlig|varmare ton)/.test(s)) {
      signals.push({ kind: "explicit", target: "hero:text", weight: 0.85 });
    }
    if (/(om oss|about)/.test(s) && /(bild|foto)/.test(s)) {
      signals.push({ kind: "explicit", target: "about:image", weight: 0.9 });
    }
    if (/(galleri|gallery)/.test(s) && /(bild|foto)/.test(s)) {
      signals.push({ kind: "explicit", target: "gallery:image", weight: 0.9 });
    }
    if (/(färg|farg|palett|tema|stämning|stamning)/.test(s) && !/(bild|foto)/.test(s)) {
      signals.push({ kind: "explicit", target: "page:color", weight: 0.86 });
    }
    if (
      /(vill inte ha|inte ha|inte gillar|gillar inte|utan|för mycket|for mycket)/.test(s) &&
      /(bl[aå]|r[oö]d|gr[oö]n|gul|lila|rosa|gr[aå]|m[oö]rk|ljus|f[aä]rg|tema)/.test(s) &&
      !/(bild|foto)/.test(s)
    ) {
      signals.push({ kind: "reject", target: "page:color", weight: 0.92 });
    }
    if (/(logotyp|logo|logga)/.test(s)) {
      signals.push({ kind: "explicit", target: "header:logo", weight: 0.9 });
    }
    if (/(tjänst|tjanst|service|kort)/.test(s) && /(bild|foto)/.test(s)) {
      signals.push({ kind: "explicit", target: "services:image", weight: 0.88 });
    }

    if (signals.length === 0 && s.length <= 36 && /\b(den|det|den där|det där)\b/.test(s)) {
      signals.push({ kind: "pronoun", weight: 0.75 });
    }
    if (signals.length === 0 && s.length <= 28) {
      signals.push({ kind: "short", weight: 0.5 });
    }

    return { raw: raw, s: s, signals: signals };
  }

  function boostScores(scores, key, amount, reason) {
    if (!scores[key]) scores[key] = { key: key, confidence: 0, reasons: [] };
    scores[key].confidence = Math.min(0.99, scores[key].confidence + amount);
    scores[key].reasons.push(reason);
  }

  /** Score every target using combined context — not regex alone. */
  function scoreTargets(utterance, ctx) {
    const scores = {};
    const s = utterance.s;
    const signals = utterance.signals;

    TARGETS.forEach(function (t) {
      scores[t.key] = { key: t.key, target: t.target, label: t.label, confidence: 0.02, reasons: ["baseline"] };
    });

    if (ctx.pendingCtx) {
      const pk = ctxKey(ctx.pendingCtx);
      boostScores(scores, pk, 0.58, "pending_verification");
    }
    if (ctx.editCtx && ctx.sessionFresh) {
      const ek = ctxKey(ctx.editCtx);
      boostScores(scores, ek, 0.22, "edit_session_focus");
    }
    if (ctx.lastAccepted && ctx.lastAccepted.context) {
      const ak = ctxKey(ctx.lastAccepted.context);
      boostScores(scores, ak, 0.06, "last_accepted");
    }
    Object.keys(ctx.recentWeights || {}).forEach(function (key) {
      boostScores(scores, key, ctx.recentWeights[key], "recent_edit_history");
    });
    if (ctx.conversation && ctx.conversation.pending) {
      const dom = ctx.conversation.pending.domain;
      if (dom === "hero.image") boostScores(scores, "hero:image", 0.35, "pipeline_conversation");
    }
    if (ctx.chatSignals.lastUserImageRequest && ctx.chatSignals.hasRecentImageContext) {
      boostScores(scores, "hero:image", 0.28, "recent_image_request");
    }

    signals.forEach(function (sig) {
      if (sig.kind === "explicit" && sig.target) {
        boostScores(scores, sig.target, sig.weight, "explicit_mention");
      }
      if (sig.kind === "refine" || sig.kind === "reject" || sig.kind === "retry" || sig.kind === "another" || sig.kind === "swap") {
        TARGETS.forEach(function (t) {
          if (t.object === "image") boostScores(scores, t.key, 0.12 * sig.weight, sig.kind + "_image_hint");
        });
      }
      if (sig.kind === "aesthetic") {
        if (/hero|topp|start|första|forsta|huvud|banner/.test(s)) {
          boostScores(scores, "hero:image", 0.42 * sig.weight, "aesthetic_hero_explicit");
          boostScores(scores, "hero:text", 0.18 * sig.weight, "aesthetic_hero_text");
        } else {
          boostScores(scores, "page:color", 0.32 * sig.weight, "aesthetic_color");
          boostScores(scores, "hero:image", 0.1 * sig.weight, "aesthetic_image");
          boostScores(scores, "hero:text", 0.08 * sig.weight, "aesthetic_text");
        }
      }
      if (sig.kind === "text" && sig.axis === "shorter") {
        boostScores(scores, "hero:text", 0.35 * sig.weight, "shorter_text");
        boostScores(scores, "about:text", 0.2 * sig.weight, "shorter_text");
      }
    });

    if (signals.some(function (sig) {
      return sig.kind === "pronoun";
    })) {
      const sorted = Object.keys(scores)
        .map(function (k) {
          return scores[k];
        })
        .sort(function (a, b) {
          return b.confidence - a.confidence;
        });
      if (sorted[0]) boostScores(scores, sorted[0].key, 0.2, "pronoun_inherit_top");
    }

    const list = Object.keys(scores)
      .map(function (k) {
        const row = scores[k];
        const def = targetByKey(k);
        return {
          key: k,
          target: def ? def.target : k,
          label: def ? def.label : k,
          confidence: Math.round(row.confidence * 100) / 100,
          reasons: row.reasons || [],
        };
      })
      .sort(function (a, b) {
        return b.confidence - a.confidence;
      });

    return list;
  }

  function refinementPhrase(signals, raw) {
    const parts = [];
    signals.forEach(function (sig) {
      if (sig.kind === "refine" && sig.axis === "age" && sig.dir === "younger") parts.push("yngre");
      if (sig.kind === "refine" && sig.axis === "tone" && sig.dir === "dark") parts.push("lite mörkare");
      if (sig.kind === "refine" && sig.axis === "tone" && sig.dir === "light") parts.push("lite ljusare");
      if (sig.kind === "refine" && sig.axis === "style" && sig.dir === "modern") parts.push("modernare");
      if (sig.kind === "aesthetic" && sig.axis === "premium") parts.push("mer exklusiv och premium");
      if (sig.kind === "aesthetic" && sig.axis === "warm") parts.push("varmare stämning");
      if (sig.kind === "aesthetic" && sig.axis === "nordic") parts.push("mer nordisk och luftig");
    });
    if (parts.length) return parts.join(", ");
    const r = String(raw || "").trim();
    if (r.length <= 40) return r;
    return "";
  }

  function buildCommandForTarget(key, mode, raw, ctx, signals) {
    const ES = global.EditSession;
    const editCtx = ctx.pendingCtx || ctx.editCtx || { section: "hero", object: "image" };
    const section = key.split(":")[0];
    const object = key.split(":")[1];

    if (ES && typeof ES.commandForContext === "function") {
      const c = { page: "home", section: section, object: object };
      if (mode === "another") return ES.commandForContext(c, raw, "another");
      if (mode === "retry") return ES.commandForContext(c, raw, "retry");
      return ES.commandForContext(c, raw, "refine");
    }

    const ref = refinementPhrase(signals, raw);
    if (key === "hero:image") {
      if (mode === "another" || mode === "retry") return "byt hero-bild";
      return ref ? "byt hero-bild — " + ref : "byt hero-bild — " + raw;
    }
    if (key === "page:color") return "byt färgtema" + (ref ? " — " + ref : "");
    if (object === "text") return "skriv om " + section + "-texten" + (ref ? " — " + ref : "");
    return raw;
  }

  function mapToPipelineIntent(action, hooks) {
    if (!action) return null;
    const type = action.type;
    const raw = action.command || "";

    if (type === "session.keep" || type === "session.undo" || type === "session.open_material") {
      return action;
    }
    if (type === "session.refine") {
      const refineKey = action.contextKey || (action.context ? ctxKey(action.context) : "");
      if (!refineKey) {
        return {
          type: "session.refine",
          context: action.context,
          command: action.command,
        };
      }
      action = Object.assign({}, action, { contextKey: refineKey });
    }

    const key = action.contextKey || "";
    if (key === "hero:image") {
      if (action.mode === "retry" || action.mode === "another") {
        return {
          type: "hero.image.retry",
          target: "hero.image",
          command: action.command,
          meta: { refinement: raw, context: action.context },
        };
      }
      return {
        type: "hero.image.refine",
        target: "hero.image",
        command: action.command,
        meta: { refinement: raw, context: action.context },
      };
    }
    if (key === "page:color") {
      return { type: "design.color", target: "design.color", command: action.command };
    }
    if (key === "about:image") {
      return {
        type: "legacy",
        target: "about.image",
        command: action.command || "byt om oss-bild",
        meta: { materialImage: "about", context: action.context },
      };
    }
    if (key === "gallery:image") {
      return {
        type: "legacy",
        target: "gallery.image",
        command: action.command || "byt galleribild",
        meta: { materialImage: "gallery", context: action.context },
      };
    }
    if (key === "header:logo") {
      return { type: "session.open_material", target: "header.logo", command: action.command };
    }
    if (key.indexOf(":text") > 0 || key === "hero:cta") {
      const section = key.split(":")[0];
      return {
        type: "text.regen",
        target: "section:" + section,
        command: action.command,
        meta: { sectionId: section, label: action.label, context: action.context },
      };
    }

    if (hooks) {
      if (hooks.looksLikeImageRequest && hooks.looksLikeImageRequest(raw)) {
        return { type: "hero.image", target: "hero.image", command: raw };
      }
      if (hooks.resolveLegacyIntent) {
        const legacy = hooks.resolveLegacyIntent(raw);
        if (legacy) return legacy;
      }
    }

    return { type: "delegate", target: "unknown", command: raw };
  }

  function hasHeroImageEditFocus(ctx) {
    return !!(ctx.editCtx && ctx.editCtx.section === "hero" && ctx.editCtx.object === "image");
  }

  function pickActiveContext(ctx, topKey) {
    const ES = global.EditSession;
    if (ctx.pendingCtx) return ctx.pendingCtx;
    if (ctx.editCtx && ctxKey(ctx.editCtx) === topKey) return ctx.editCtx;
    const def = targetByKey(topKey);
    if (!def) return ctx.editCtx;
    return { page: "home", section: def.section, object: def.object, task: "change" };
  }

  function buildClarify(top, second) {
    const a = top && top.label ? top.label : "det";
    const b = second && second.label ? second.label : "något annat";
    return {
      message: "Menar du " + a + " eller " + b + "?",
      chips: [
        { label: a.charAt(0).toUpperCase() + a.slice(1), command: "justera " + a },
        { label: b.charAt(0).toUpperCase() + b.slice(1), command: "justera " + b },
      ],
    };
  }

  function resolveActionFromSignals(utterance, ctx, candidates) {
    const signals = utterance.signals;
    const raw = utterance.raw;
    const top = candidates[0];
    const focusKey = top ? top.key : "hero:image";
    const focusCtx = pickActiveContext(ctx, focusKey);

    for (let i = 0; i < signals.length; i++) {
      const sig = signals[i];
      if (sig.kind === "chip") {
        if (sig.value === "__keep__" || sig.value === "__accept__") {
          return { intent: "session.keep", action: { type: "session.keep" }, confidence: 1, reason: "chip_keep" };
        }
        if (sig.value === "__undo__") {
          return { intent: "session.undo", action: { type: "session.undo" }, confidence: 1, reason: "chip_undo" };
        }
        if (sig.value === "__try_another__") {
          return {
            intent: "refine.another",
            action: {
              type: "session.refine",
              context: focusCtx,
              contextKey: focusKey,
              mode: "another",
              command: buildCommandForTarget(focusKey, "another", raw, ctx, signals),
            },
            confidence: 0.99,
            reason: "chip_another",
          };
        }
        if (sig.value === "__open_material__") {
          return { intent: "session.open_material", action: { type: "session.open_material" }, confidence: 1, reason: "chip_material" };
        }
      }
    }

    if (signals.some(function (s) {
      return s.kind === "accept";
    })) {
      return { intent: "session.keep", action: { type: "session.keep" }, confidence: 0.96, reason: "acceptance" };
    }
    if (signals.some(function (s) {
      return s.kind === "undo";
    })) {
      return { intent: "session.undo", action: { type: "session.undo" }, confidence: 0.97, reason: "undo_request" };
    }

    const reject = signals.some(function (s) {
      return s.kind === "reject";
    });
    const another = signals.some(function (s) {
      return s.kind === "another";
    });
    const retry = signals.some(function (s) {
      return s.kind === "retry";
    });
    const swap = signals.some(function (s) {
      return s.kind === "swap";
    });
    const refine = signals.some(function (s) {
      return s.kind === "refine" || s.kind === "aesthetic";
    });

    if (reject || another || retry || swap || refine || (ctx.pendingCtx && utterance.s.length <= 40)) {
      const mode = another ? "another" : retry ? "retry" : reject ? "another" : "refine";
      let pk = ctx.pendingCtx ? ctxKey(ctx.pendingCtx) : focusKey;
      if (another && hasHeroImageEditFocus(ctx)) {
        pk = "hero:image";
      }
      const pCtx = pickActiveContext(ctx, pk);
      const cmd = buildCommandForTarget(pk, mode, raw, ctx, signals);

      if (reject && global.EditSession && typeof global.EditSession.setRefineIntro === "function") {
        global.EditSession.setRefineIntro("Inga problem — jag testar en annan version.\n\n");
      } else if (another && global.EditSession && typeof global.EditSession.setRefineIntro === "function") {
        global.EditSession.setRefineIntro("Absolut — här kommer ett annat förslag.\n\n");
      }

      if (another && hasHeroImageEditFocus(ctx)) {
        return {
          intent: "hero.image.retry",
          action: {
            type: "session.refine",
            context: ctx.editCtx,
            contextKey: "hero:image",
            mode: "another",
            command: cmd,
            label: targetByKey("hero:image") ? targetByKey("hero:image").label : "",
          },
          confidence: 0.96,
          reason: "another_on_hero_image_focus",
        };
      }

      return {
        intent: mode === "another" || reject ? "refine.another" : "refine.adjust",
        action: {
          type: "session.refine",
          context: pCtx,
          contextKey: pk,
          mode: mode,
          command: cmd,
          label: targetByKey(pk) ? targetByKey(pk).label : "",
        },
        confidence: ctx.pendingCtx ? 0.94 : top.confidence,
        reason: reject ? "reject_pending" : mode + "_on_focus",
      };
    }

    if (signals.some(function (s) {
      return s.kind === "text" && s.axis === "shorter";
    })) {
      const tk = top.key.indexOf("text") >= 0 ? top.key : "hero:text";
      return {
        intent: "text.regen",
        action: {
          type: "session.refine",
          context: pickActiveContext(ctx, tk),
          contextKey: tk,
          mode: "refine",
          command: buildCommandForTarget(tk, "refine", raw, ctx, signals),
        },
        confidence: top.confidence,
        reason: "shorter_text",
      };
    }

    if (signals.some(function (s) {
      return s.kind === "aesthetic";
    }) && top.key === "page:color") {
      return {
        intent: "design.color",
        action: {
          type: "design.color",
          target: "design.color",
          command: buildCommandForTarget("page:color", "refine", raw, ctx, signals),
          contextKey: "page:color",
        },
        confidence: top.confidence,
        reason: "aesthetic_to_color",
      };
    }

    return null;
  }

  /** Text command routing — owned by IRE, not TextChatCommands. */
  function resolveTextCommand(text) {
    const raw = String(text || "").trim();
    const cmd = raw.toLowerCase();
    if (!cmd) return null;

    const hasExplicitNewText =
      /(?:till|till:|ska vara|skall vara)\s+\S/.test(raw) ||
      (/:\s*\S/.test(raw) && /(byt|ändra|sätt|skriv)/.test(cmd));
    const wantsDirectTextSet =
      hasExplicitNewText &&
      (/(byt|ändra|sätt|skriv)\s+(rubriken|rubrik|texten|ingressen|ingress|beskrivningen)/.test(cmd) ||
        /rubriken\s+(ska vara|skall vara)/.test(cmd));
    const wantsTextRegeneration =
      !hasExplicitNewText &&
      (/skriv om|generera om|ny text|nytt innehåll|förnya|omformulera|uppdatera text|byt text|byta text|ändra text|ändra innehåll/.test(cmd) ||
        /(kan du|kan ni|kan ju|gör|hjälp mig|snälla|please).*(ändra|byta|skriva om|uppdatera).*(text|rubrik|ingress|innehåll)/.test(cmd) ||
        (/(ändra|byt|uppdatera).*(text|rubrik|ingress)/.test(cmd) && !/(bild|foto|logotyp|logo)/.test(cmd)));

    if (!wantsDirectTextSet && !wantsTextRegeneration) return null;

    const isHeroTextRequest =
      /hero/.test(cmd) &&
      /(rubrik|text|ingress|knapp|cta|skriv om|generera om|byt text|ändra text)/.test(cmd) &&
      !/(hero-bild|hero bild|herobild|bakgrundsbild|hero-foto)/.test(cmd);
    if (/(bild|foto|hero|logotyp|logo|färg|design)/.test(cmd) && !wantsDirectTextSet && !isHeroTextRequest) {
      return null;
    }

    if (wantsDirectTextSet) {
      let sectionId = "hero";
      const aliases = {
        hero: ["hero", "startsida", "start", "huvud"],
        about: ["about", "om oss", "om"],
        services: ["services", "tjänster", "tjanster"],
      };
      Object.keys(aliases).forEach(function (id) {
        if (aliases[id].some(function (term) { return cmd.indexOf(term) !== -1; })) sectionId = id;
      });
      let fieldKey = "hero-title";
      if (/ingress|lead|underrubrik/.test(cmd)) fieldKey = "hero-lead";
      else if (sectionId === "about") fieldKey = /rubrik|titel/.test(cmd) ? "about-title" : "about-p1";
      return {
        type: "text.set",
        target: "text:" + sectionId + ":" + fieldKey,
        command: raw,
        meta: { sectionId: sectionId, fieldKey: fieldKey, label: sectionId },
      };
    }

    let section = "hero";
    if (/om oss|about/.test(cmd)) section = "about";
    else if (/tjänst|tjanst|service/.test(cmd)) section = "services";
    else if (/galleri|gallery/.test(cmd)) section = "gallery";

    return {
      type: "text.regen",
      target: "section:" + section,
      command: raw,
      meta: { sectionId: section, label: section },
    };
  }

  /** Hook-backed explicit routes (image complaint, rebuild, legacy). */
  function resolveExplicitRoutes(text, hooks, ctx) {
    hooks = hooks || {};
    const raw = String(text || "").trim();
    if (!raw) return null;

    if (hooks.looksLikeFullRebuildRequest && hooks.looksLikeFullRebuildRequest(text)) {
      return {
        intent: "site.rebuild",
        confidence: 0.95,
        target: "site",
        reason: "explicit_rebuild",
        selectedAction: { type: "site.rebuild", target: "site", command: raw },
        decision: "execute",
      };
    }

    if (hooks.looksLikeUserCorrection && hooks.looksLikeUserCorrection(text)) {
      if (hooks.isTextIndustryCorrection && hooks.isTextIndustryCorrection(text)) {
        return {
          intent: "industry.adapt",
          confidence: 0.88,
          target: "industry",
          reason: "text_industry_correction",
          selectedAction: { type: "industry.adapt", target: "industry", command: raw, meta: { refreshHero: true } },
          decision: "execute",
        };
      }
      return {
        intent: "hero.image.retry",
        confidence: 0.9,
        target: "hero.image",
        reason: "user_correction_image",
        selectedAction: {
          type: "hero.image.retry",
          target: "hero.image",
          command: (hooks.resolveRetryImageText && hooks.resolveRetryImageText(text)) || raw,
          meta: { correction: true },
        },
        decision: "execute",
      };
    }

    if (hooks.looksLikeMissingHeroImageComplaint && hooks.looksLikeMissingHeroImageComplaint(text)) {
      return {
        intent: "hero.image.retry",
        confidence: 0.92,
        target: "hero.image",
        reason: "missing_hero",
        selectedAction: {
          type: "hero.image.retry",
          target: "hero.image",
          command: (hooks.buildHeroRetryFromDoc && hooks.buildHeroRetryFromDoc()) || "byt hero-bild",
        },
        decision: "execute",
      };
    }

    if (hooks.looksLikeWrongHeroImageFeedback && hooks.looksLikeWrongHeroImageFeedback(text)) {
      return {
        intent: "hero.image",
        confidence: 0.9,
        target: "hero.image",
        reason: "wrong_hero_feedback",
        selectedAction: {
          type: "hero.image",
          target: "hero.image",
          command: (hooks.wrongHeroRetryCommand && hooks.wrongHeroRetryCommand(text)) || "byt hero-bild",
        },
        decision: "execute",
      };
    }

    if (hooks.resolveLegacyIntent) {
      const legacy = hooks.resolveLegacyIntent(text);
      if (legacy) {
        return {
          intent: legacy.type,
          confidence: 0.86,
          target: legacy.target,
          reason: "legacy_intent",
          selectedAction: legacy,
          decision: "execute",
        };
      }
    }

    if (hooks.looksLikeImageRequest && hooks.looksLikeImageRequest(text)) {
      return {
        intent: "hero.image",
        confidence: 0.91,
        target: "hero.image",
        reason: "explicit_image_request",
        selectedAction: { type: "hero.image", target: "hero.image", command: raw },
        decision: "execute",
      };
    }

    const textIntent = resolveTextCommand(text);
    if (textIntent) {
      return {
        intent: textIntent.type,
        confidence: 0.88,
        target: textIntent.target,
        reason: "text_command",
        selectedAction: textIntent,
        decision: "execute",
      };
    }

    if (
      !(ctx.conversation && ctx.conversation.pending) &&
      hooks.looksLikeColorChangeRequest &&
      hooks.looksLikeColorChangeRequest(text)
    ) {
      return {
        intent: "design.color",
        confidence: 0.85,
        target: "design.color",
        reason: "color_change",
        selectedAction: { type: "design.color", target: "design.color", command: raw },
        decision: "execute",
      };
    }

    if (hooks.shouldAdaptIndustry && hooks.shouldAdaptIndustry(text)) {
      return {
        intent: "industry.adapt",
        confidence: 0.82,
        target: "industry",
        reason: "industry_adapt",
        selectedAction: {
          type: "industry.adapt",
          target: "industry",
          command: raw,
          meta: { refreshHero: !!(hooks.looksLikeWrongIndustryComplaint && hooks.looksLikeWrongIndustryComplaint(text)) },
        },
        decision: "execute",
      };
    }

    if (hooks.looksLikeBusinessRebrief && hooks.looksLikeBusinessRebrief(text)) {
      return {
        intent: "site.rebuild",
        confidence: 0.8,
        target: "site",
        reason: "business_rebrief",
        selectedAction: { type: "site.rebuild", target: "site", command: raw },
        decision: "execute",
      };
    }

    return null;
  }

  /**
   * Main entry — every edit command passes through here.
   * @param {string} text
   * @param {object} hooks
   */
  function resolve(text, hooks) {
    hooks = hooks || {};
    const pendingClarification = getClarificationState();
    if (pendingClarification) {
      const clarified = resolveClarificationReply(text, hooks, pendingClarification);
      if (pendingClarification.expiresAfterReply) {
        clearClarificationState();
      }
      if (clarified.decision === "clarify" && clarified.clarify) {
        setClarificationState(
          createClarificationState(clarified.intent || "clarify.retry", {
            expectedAnswerType: "target_selection",
            expectedTargets: pendingClarification.expectedTargets,
            originalUserText: pendingClarification.originalUserText,
            originalTargetKey: pendingClarification.originalTargetKey,
            candidateActions: pendingClarification.candidateActions,
          }),
        );
      }
      log("DECISION", clarified);
      return clarified;
    }

    const utterance = analyzeUtterance(text);
    const ctx = gatherContext(hooks);
    const candidates = scoreTargets(utterance, ctx);

    const explicit = resolveExplicitRoutes(text, hooks, ctx);
    if (explicit) {
      explicit.candidateActions = candidates.slice(0, 6);
      explicit.selectedAction = explicit.selectedAction || mapToPipelineIntent(explicit, hooks);
      log("DECISION", explicit);
      return explicit;
    }

    const signalPick = resolveActionFromSignals(utterance, ctx, candidates);
    if (signalPick) {
      const pipelineAction =
        signalPick.action.type === "session.refine"
          ? mapToPipelineIntent(signalPick.action, hooks) || signalPick.action
          : mapToPipelineIntent(signalPick.action, hooks) || signalPick.action;

      const result = {
        intent: signalPick.intent,
        confidence: signalPick.confidence,
        target: signalPick.action.contextKey || (candidates[0] && candidates[0].target),
        reason: signalPick.reason,
        candidateActions: candidates.slice(0, 6),
        selectedAction: pipelineAction,
        decision: "execute",
      };
      log("DECISION", result);
      return result;
    }

    const top = candidates[0] || { key: "hero:image", target: "hero.image", confidence: 0.1, label: "hero-bilden" };
    const second = candidates[1] || { confidence: 0.02, label: "rubriken" };
    const gap = top.confidence - (second.confidence || 0);

    if (top.confidence >= HIGH_EXECUTE && gap >= MIN_GAP) {
      const key = top.key;
      const action = {
        type: "session.refine",
        context: pickActiveContext(ctx, key),
        contextKey: key,
        mode: "refine",
        command: buildCommandForTarget(key, "refine", utterance.raw, ctx, utterance.signals),
        label: top.label,
      };
      const result = {
        intent: "refine.context",
        confidence: top.confidence,
        target: top.target,
        reason: "high_confidence_focus:" + ((top.reasons && top.reasons[0]) || "focus"),
        candidateActions: candidates.slice(0, 6),
        selectedAction: mapToPipelineIntent(action, hooks),
        decision: "execute",
      };
      log("DECISION", result);
      return result;
    }

    if (top.confidence >= MEDIUM_FLOOR) {
      const result = {
        intent: "clarify.target",
        confidence: top.confidence,
        target: top.target,
        reason: "medium_confidence_gap:" + gap.toFixed(2),
        candidateActions: candidates.slice(0, 6),
        selectedAction: null,
        decision: "clarify",
        clarify: buildClarify(top, second),
      };
      setClarificationState(
        createClarificationState("clarify.target", {
          expectedAnswerType: "target_selection",
          expectedTargets: [top.key, second.key],
          originalUserText: utterance.raw,
          originalTargetKey: inferOriginalTargetKey(utterance, candidates),
          candidateActions: candidates.slice(0, 6),
        }),
      );
      log("DECISION", result);
      return result;
    }

    const result = {
      intent: "clarify.unknown",
      confidence: top.confidence,
      target: null,
      reason: "low_confidence",
      candidateActions: candidates.slice(0, 6),
      selectedAction: null,
      decision: "clarify",
      clarify: {
        message: "Vad vill du justera — hero-bilden, rubriken, färgerna eller något annat?",
        chips: [
          { label: "Hero-bild", command: "byt hero-bild" },
          { label: "Rubriken", command: "skriv om hero-rubriken" },
          { label: "Färgerna", command: "byt färgtema" },
        ],
      },
    };
    setClarificationState(
      createClarificationState("clarify.unknown", {
        expectedAnswerType: "target_selection",
        expectedTargets: ["hero:image", "hero:text", "page:color"],
        originalUserText: utterance.raw,
        originalTargetKey: inferOriginalTargetKey(utterance, candidates),
        candidateActions: candidates.slice(0, 6),
      }),
    );
    log("DECISION", result);
    return result;
  }

  global.IntentResolutionEngine = {
    resolve: resolve,
    analyzeUtterance: analyzeUtterance,
    gatherContext: gatherContext,
    scoreTargets: scoreTargets,
    THRESHOLDS: { HIGH_EXECUTE: HIGH_EXECUTE, MEDIUM_FLOOR: MEDIUM_FLOOR, MIN_GAP: MIN_GAP },
    getClarificationState: getClarificationState,
    setClarificationState: setClarificationState,
    clearClarificationState: clearClarificationState,
    createClarificationState: createClarificationState,
    resolveClarificationReply: resolveClarificationReply,
    parseClarificationTarget: parseClarificationTarget,
    log: log,
  };
})(typeof window !== "undefined" ? window : globalThis);
