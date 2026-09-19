/**
 * EditSession — source of truth for what we're editing on the website.
 * The chat is only an interface; this session mirrors the site state.
 *
 * Non-linear: suggestions are optional; the user may jump to any section anytime.
 */
(function (global) {
  "use strict";

  const SESSION_TTL_MS = 45 * 60 * 1000;

  /** @type {EditSessionState} */
  const editingSession = createEmptySession();

  /**
   * @typedef {{
   *   page: string,
   *   section: string|null,
   *   object: string|null,
   *   task: string|null,
   *   label: string
   * }} EditContext
   */

  function createEmptySession() {
    return {
      currentPage: "home",
      currentSection: null,
      currentObject: null,
      currentTask: null,
      pendingVerification: null,
      undoAvailable: false,
      lastAcceptedChange: null,
      acceptedLocks: {},
      editBaseline: null,
      retryCount: 0,
      eventLog: [],
      refineIntro: "",
      at: 0,
    };
  }

  function captureDocSnapshot() {
    const SS = global.SiteState;
    if (!SS || typeof SS.get !== "function") return null;
    try {
      return JSON.parse(JSON.stringify(SS.get()));
    } catch (e) {
      return null;
    }
  }

  function restoreDocSnapshot(snap) {
    const SS = global.SiteState;
    const EE = global.EditorEngine;
    if (!snap || !SS || typeof SS.replace !== "function") return false;
    SS.replace(snap);
    SS.save();
    SS.applyPageToBody && SS.applyPageToBody();
    if (EE && typeof EE.remountAsync === "function") {
      EE.remountAsync();
    } else if (EE && EE.remount) {
      EE.remount();
    }
    return true;
  }

  function isComponentLocked(key) {
    if (!key) return false;
    return !!(editingSession.acceptedLocks && editingSession.acceptedLocks[key]);
  }

  function unlockComponent(key) {
    if (!key || !editingSession.acceptedLocks) return;
    delete editingSession.acceptedLocks[key];
  }

  function lockComponent(ctx) {
    const key = contextKey(ctx);
    if (!key) return;
    if (!editingSession.acceptedLocks) editingSession.acceptedLocks = {};
    editingSession.acceptedLocks[key] = { at: Date.now(), context: ctx };
  }

  function abandonPendingCandidate() {
    const pending = editingSession.pendingVerification;
    const baseline =
      (pending && pending.baselineSnapshot) || editingSession.editBaseline || null;
    if (baseline) restoreDocSnapshot(baseline);
    editingSession.pendingVerification = null;
    editingSession.retryCount = 0;
  }

  const SECTION_LABELS = {
    hero: "Hero",
    about: "Om oss",
    gallery: "Galleri",
    services: "Tjänster",
    contact: "Kontakt",
    footer: "Sidfot",
    page: "Sidan",
    header: "Sidhuvud",
  };

  const OBJECT_LABELS = {
    image: "bilden",
    text: "texten",
    cta: "knappen",
    color: "färgerna",
    logo: "logotypen",
  };

  function normalize(text) {
    return String(text || "")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, " ");
  }

  function fresh() {
    return editingSession.at > 0 && Date.now() - editingSession.at < SESSION_TTL_MS;
  }

  function touch() {
    editingSession.at = Date.now();
  }

  function logEvent(type, detail) {
    editingSession.eventLog.push({ type: type, detail: detail || {}, at: Date.now() });
    if (editingSession.eventLog.length > 80) editingSession.eventLog.shift();
  }

  /** Recent edit focus weights for Intent Resolution Engine (decays over ~8 min). */
  function getRecentFocusWeights() {
    const weights = {};
    const log = editingSession.eventLog || [];
    const now = Date.now();
    for (let i = log.length - 1; i >= 0 && i >= log.length - 24; i--) {
      const e = log[i];
      if (!e || !e.detail) continue;
      const ctx = e.detail.context || e.detail;
      const key = contextKey(ctx);
      if (!key) continue;
      const age = now - (e.at || 0);
      const decay = Math.max(0.08, 1 - age / (8 * 60 * 1000));
      const bump = e.type === "keep" ? 0.28 : e.type === "edit_complete" ? 0.22 : 0.14;
      weights[key] = Math.min(0.55, (weights[key] || 0) + decay * bump);
    }
    if (editingSession.pendingVerification && editingSession.pendingVerification.context) {
      const pk = contextKey(editingSession.pendingVerification.context);
      if (pk) weights[pk] = Math.min(0.65, (weights[pk] || 0) + 0.35);
    }
    return weights;
  }

  function humanDescribe(ctx) {
    if (!ctx || !ctx.section) return "det";
    if (ctx.section === "hero" && ctx.object === "image") return "hero-bilden";
    if (ctx.section === "about" && ctx.object === "image") return "bilden i Om oss";
    if (ctx.section === "gallery" && ctx.object === "image") return "galleribilden";
    if (ctx.section === "services" && ctx.object === "image") return "bilden på tjänstekortet";
    if (ctx.section === "hero" && ctx.object === "text") return "rubriken";
    if (ctx.section === "about" && ctx.object === "text") return "texten i Om oss";
    if (ctx.section === "hero" && ctx.object === "cta") return "knappen";
    if (ctx.object === "color") return "färgerna";
    if (ctx.object === "logo") return "logotypen";
    return contextLabel(ctx);
  }

  function consumeRefineIntro() {
    const intro = editingSession.refineIntro || "";
    editingSession.refineIntro = "";
    return intro;
  }

  function setRefineIntro(text) {
    editingSession.refineIntro = text || "";
  }

  function contextLabel(ctx) {
    if (!ctx) return "det här";
    if (ctx.section === "page" && ctx.object === "color") return "färgerna";
    if (ctx.section === "header" && ctx.object === "logo") return "logotypen";
    const sec = SECTION_LABELS[ctx.section] || ctx.section || "";
    const obj = OBJECT_LABELS[ctx.object] || ctx.object || "";
    if (sec && obj) return sec.toLowerCase() + "-" + obj;
    return sec || obj || "det här";
  }

  function contextKey(ctx) {
    if (!ctx || !ctx.section || !ctx.object) return "";
    return ctx.section + ":" + ctx.object;
  }

  /** @returns {EditContext} */
  function getContext() {
    return {
      page: editingSession.currentPage,
      section: editingSession.currentSection,
      object: editingSession.currentObject,
      task: editingSession.currentTask,
      label: contextLabel({
        section: editingSession.currentSection,
        object: editingSession.currentObject,
      }),
    };
  }

  /** @param {Partial<EditContext>} ctx */
  function setContext(ctx, opts) {
    opts = opts || {};
    if (!ctx) return;
    const newKey = contextKey(ctx);
    const pending = editingSession.pendingVerification;
    if (pending && !opts.keepPending) {
      const pendingKey = contextKey(pending.context);
      if (pendingKey && newKey && pendingKey !== newKey) {
        abandonPendingCandidate();
      }
    }
    if (opts.explicit && newKey) unlockComponent(newKey);
    if (ctx.page) editingSession.currentPage = ctx.page;
    if (ctx.section !== undefined) editingSession.currentSection = ctx.section;
    if (ctx.object !== undefined) editingSession.currentObject = ctx.object;
    if (ctx.task !== undefined) editingSession.currentTask = ctx.task;
    touch();
    logEvent("context_set", getContext());
  }

  /**
   * Parse where on the site the user wants to work. Updates session immediately on explicit mention.
   * @returns {EditContext|null}
   */
  function parseContextFromText(text) {
    const raw = String(text || "").trim();
    const s = normalize(raw);
    if (!raw) return null;

    /** Logo — jump context instantly */
    if (/(logotyp|logo|logga)/.test(s)) {
      const ctx = { page: "home", section: "header", object: "logo", task: "change_image", label: "logotypen" };
      setContext(ctx, { explicit: true });
      return ctx;
    }

    /** Gallery image */
    if (/(galleri|gallery)/.test(s) && /(bild|foto|image|bilder)/.test(s)) {
      const ctx = { page: "home", section: "gallery", object: "image", task: "change_image", label: "galleribilden" };
      setContext(ctx, { explicit: true });
      return ctx;
    }

    /** About image */
    if (/(om oss|about)/.test(s) && /(bild|foto|image)/.test(s)) {
      const ctx = { page: "home", section: "about", object: "image", task: "change_image", label: "om oss-bilden" };
      setContext(ctx, { explicit: true });
      return ctx;
    }

    /** Hero image */
    if (
      /(hero-bild|hero bild|herobild|bakgrundsbild|bakgrund|banner)/.test(s) ||
      (/(hero|topp|start|huvud)/.test(s) && /(bild|foto)/.test(s)) ||
      (/^(byt|ny|annan|visa).*(bild|foto)/.test(s) && !/(om oss|galleri|logo|tjänst)/.test(s))
    ) {
      const ctx = { page: "home", section: "hero", object: "image", task: "change_image", label: "hero-bilden" };
      setContext(ctx, { explicit: true });
      return ctx;
    }

    /** Section text */
    if (/(om oss|about)/.test(s) && /(text|rubrik|ingress|skriv om)/.test(s)) {
      const ctx = { page: "home", section: "about", object: "text", task: "change_text", label: "om oss-texten" };
      setContext(ctx, { explicit: true });
      return ctx;
    }
    if (/(hero|rubrik|ingress|headline)/.test(s) && /(text|skriv|rubrik|ingress)/.test(s) && !/(bild|foto)/.test(s)) {
      const ctx = { page: "home", section: "hero", object: "text", task: "change_text", label: "hero-rubriken" };
      setContext(ctx, { explicit: true });
      return ctx;
    }

    /** CTA / button */
    if (/(knapp|cta|boka|kontakta)/.test(s)) {
      const ctx = { page: "home", section: "hero", object: "cta", task: "change_text", label: "knappen" };
      setContext(ctx, { explicit: true });
      return ctx;
    }

    /** Colors / design */
    if (/(färg|farg|palett|tema|design|stämning|stamning)/.test(s)) {
      const ctx = { page: "home", section: "page", object: "color", task: "change_design", label: "färgerna" };
      setContext(ctx, { explicit: true });
      return ctx;
    }

    /** Service cards */
    if (/(tjänst|tjanst|service|kort)/.test(s) && /(bild|foto)/.test(s)) {
      const ctx = { page: "home", section: "services", object: "image", task: "change_image", label: "tjänstebilden" };
      setContext(ctx, { explicit: true });
      return ctx;
    }

    return null;
  }

  function contextFromPipelineTarget(target, action) {
    if (target === "hero.image" || (action && action.indexOf("hero.image") === 0)) {
      return { page: "home", section: "hero", object: "image", task: "change_image" };
    }
    if (target === "about.image") {
      return { page: "home", section: "about", object: "image", task: "change_image" };
    }
    if (target === "gallery.image") {
      return { page: "home", section: "gallery", object: "image", task: "change_image" };
    }
    if (target === "design.color") {
      return { page: "home", section: "page", object: "color", task: "change_design" };
    }
    if (target && target.indexOf("text:hero:") === 0) {
      return { page: "home", section: "hero", object: "text", task: "change_text" };
    }
    if (target && target.indexOf("section:about") === 0) {
      return { page: "home", section: "about", object: "text", task: "change_text" };
    }
    if (target && target.indexOf("section:hero") === 0) {
      return { page: "home", section: "hero", object: "text", task: "change_text" };
    }
    return getContext();
  }

  function mapTargetToContextKey(target, action) {
    const ctx = contextFromPipelineTarget(target, action);
    return contextKey(ctx);
  }

  function isKeep(s) {
    return /^(ja|yes|ok|okej|okay|bra|perfekt|nöjd|nojd|toppen|super|behåll|behall|keep|stämmer|stammer|den är bra|det är bra|ser bra ut|fungerar)$/.test(
      s,
    );
  }

  function isUndoRequest(s) {
    return /^(ångra|angra|undo|ta tillbaka|gå tillbaka|ga tillbaka|back)$/.test(s);
  }

  function isTryAnother(s) {
    return /(visa|show|another|annan|nästa|nasta|mer|fler|other|alternativ|testa en till|en till|prova en annan|try another)/.test(s);
  }

  function isShortRefinement(s, raw) {
    if (isTryAnother(s) || isUndoRequest(s) || isKeep(s)) return true;
    return (
      /^(nej|no|inte|igen|again|yngre|younger|äldre|aldre|mörk|mork|ljus|modern|annorlunda|different)$/.test(s) ||
      (s.length <= 36 && editingSession.pendingVerification)
    );
  }

  function commandForContext(ctx, text, mode) {
    const raw = String(text || "").trim();
    const s = normalize(raw);
    if (!ctx || !ctx.section) return raw;

    if (ctx.object === "image") {
      if (ctx.section === "hero") {
        if (mode === "another" || isTryAnother(s)) return "byt hero-bild till ett annat alternativ";
        if (raw && /hero|bakgrund|bild/.test(s)) return raw;
        return raw ? "byt hero-bild — " + raw : "byt hero-bild";
      }
      if (ctx.section === "about") {
        if (mode === "another") return "byt om oss-bild till ett annat alternativ";
        return raw.indexOf("om oss") >= 0 ? raw : "byt om oss-bild" + (raw ? " — " + raw : "");
      }
      if (ctx.section === "gallery") {
        if (mode === "another") return "byt galleribild till ett annat alternativ";
        return raw.indexOf("galleri") >= 0 ? raw : "byt galleribild" + (raw ? " — " + raw : "");
      }
      if (ctx.section === "header" && ctx.object === "logo") {
        return "__open_material__";
      }
    }

    if (ctx.object === "text") {
      if (ctx.section === "hero") {
        return raw.indexOf("rubrik") >= 0 || raw.indexOf("hero") >= 0 ? raw : "skriv om hero-rubriken" + (raw ? " — " + raw : "");
      }
      if (ctx.section === "about") {
        return raw.indexOf("om oss") >= 0 ? raw : "skriv om om oss-texten" + (raw ? " — " + raw : "");
      }
    }

    if (ctx.object === "color") {
      return raw.indexOf("färg") >= 0 || raw.indexOf("farg") >= 0 ? raw : "byt färgtema" + (raw ? " — " + raw : "");
    }

    if (ctx.object === "cta") {
      return raw.indexOf("knapp") >= 0 ? raw : "ändra hero-knappen" + (raw ? " — " + raw : "");
    }

    return raw;
  }

  function beginEdit(context) {
    if (context) setContext(context, { keepPending: true });

    if (editingSession.pendingVerification) {
      const baseline = editingSession.pendingVerification.baselineSnapshot;
      if (baseline) restoreDocSnapshot(baseline);
      editingSession.editBaseline = baseline || editingSession.editBaseline;
      logEvent("edit_retry", getContext());
      touch();
      return;
    }

    editingSession.editBaseline = captureDocSnapshot();
    const EE = global.EditorEngine;
    if (EE && typeof EE.pushHistory === "function") {
      EE.pushHistory({ force: true });
      editingSession.undoAvailable = true;
    }
    logEvent("edit_begin", getContext());
    touch();
  }

  function completeEdit(result) {
    const ctx = getContext();
    const baseline = editingSession.editBaseline || captureDocSnapshot();
    editingSession.pendingVerification = {
      context: ctx,
      target: result && result.requestedTarget,
      action: result && result.action,
      baselineSnapshot: baseline,
      at: Date.now(),
    };
    editingSession.undoAvailable = true;
    editingSession.retryCount = 0;
    logEvent("edit_complete", { context: ctx, verified: !!(result && result.verified) });
    touch();
  }

  function recordFailure(reason) {
    editingSession.retryCount += 1;
    logEvent("edit_fail", { reason: reason, context: getContext(), retry: editingSession.retryCount });
    touch();
  }

  function handleKeep() {
    const ctx = editingSession.pendingVerification
      ? editingSession.pendingVerification.context
      : getContext();
    lockComponent(ctx);
    editingSession.lastAcceptedChange = {
      context: ctx,
      at: Date.now(),
    };
    editingSession.pendingVerification = null;
    editingSession.editBaseline = captureDocSnapshot();
    editingSession.retryCount = 0;
    const EE = global.EditorEngine;
    if (EE && typeof EE.pushHistory === "function") {
      EE.pushHistory({ force: true });
      editingSession.undoAvailable = true;
    }
    logEvent("keep", { context: ctx });
    touch();
    const snap = captureDocSnapshot();
    if (global.DesignMemoryEngine && typeof global.DesignMemoryEngine.recordAcceptance === "function" && snap) {
      global.DesignMemoryEngine.recordAcceptance(ctx, snap);
    }
    return buildKeepResponse(ctx);
  }

  function handleUndo() {
    const EE = global.EditorEngine;
    const pending = editingSession.pendingVerification;
    const baseline = (pending && pending.baselineSnapshot) || editingSession.editBaseline;
    let restored = false;
    if (baseline) {
      restored = restoreDocSnapshot(baseline);
    }
    if (!restored && EE && typeof EE.undo === "function") {
      EE.undo();
      if (typeof EE.remountAsync === "function") {
        EE.remountAsync();
      } else if (EE.remount) {
        EE.remount();
      }
      restored = true;
    }
    editingSession.pendingVerification = null;
    editingSession.editBaseline = captureDocSnapshot();
    editingSession.undoAvailable = !!(EE && typeof EE.canUndo === "function" && EE.canUndo());
    logEvent("undo", { restored: restored });
    touch();
    return {
      message:
        "Jag tog tillbaka den versionen.\n\nVill du att jag provar en annan riktning, eller ska vi jobba med något annat på sidan?",
      chips: buildExploreChips().slice(0, 4),
    };
  }

  function verificationChips(ctx) {
    const chips = [
      { label: "Den här är bra", command: "__keep__" },
      { label: "Visa en till", command: "__try_another__" },
    ];
    if (editingSession.undoAvailable) {
      chips.push({ label: "Ta tillbaka", command: "__undo__" });
    }
    if (ctx && ctx.object === "image" && ctx.section === "hero") {
      chips.push({ label: "Gör den yngre", command: "gör hero-bilden yngre" });
    }
    return chips;
  }

  /** Optional ideas — never forced order */
  function buildExploreChips() {
    return [
      { label: "Byt hero-bild", command: "byt hero-bild" },
      { label: "Bild i Om oss", command: "byt om oss-bild" },
      { label: "Galleribild", command: "byt galleribild" },
      { label: "Justera rubriken", command: "skriv om hero-rubriken" },
      { label: "Byt logotyp", command: "uppdatera logotypen" },
      { label: "Prova andra färger", command: "byt färgtema" },
    ];
  }

  function proactiveNotice(ctx) {
    const key = contextKey(ctx);
    if (key === "hero:image") {
      return "En sak jag noterar: rubriken skulle kunna matcha bilden lite bättre. Vill du att jag finslipar den?";
    }
    if (key === "hero:text") {
      return "Rubriken känns stark. Ska vi titta på knappen också — så fler tar nästa steg?";
    }
    if (key === "page:color") {
      return "Färgerna hänger ihop. Har du en logotyp att ladda upp, eller vill du jobba vidare med bilderna?";
    }
    if (key === "about:image") {
      return "Bra. Vill du att vi harmoniserar texten i Om oss med bilden?";
    }
    return null;
  }

  function buildVerifiedMessage(ctx) {
    const intro = consumeRefineIntro();
    const what = humanDescribe(ctx);

    if (ctx.object === "image") {
      if (intro) {
        return intro + "Titta gärna på " + what + ".\n\nVad tycker du?";
      }
      return "Jag har uppdaterat " + what + ".\n\nVad tycker du?";
    }
    if (ctx.object === "text") {
      return (intro || "Jag har justerat " + what + ".\n\n") + "Känns den rätt?";
    }
    if (ctx.object === "color") {
      return "Jag har bytt färgstämningen.\n\nPassar den sidan?";
    }
    if (ctx.object === "logo") {
      return "Logotypen är på plats.\n\nSer den bra ut?";
    }
    return "Jag har gjort ändringen.\n\nVad tycker du?";
  }

  function buildKeepResponse(ctx) {
    const what = humanDescribe(ctx);
    let message = "";

    if (ctx.section === "hero" && ctx.object === "image") {
      message = "Bra — hero-bilden sitter fint nu.";
    } else if (ctx.object === "color") {
      message = "Toppen — färgerna känns rätt.";
    } else {
      message = "Bra — då behåller vi " + what + ".";
    }

    const hint = proactiveNotice(ctx);
    if (hint) {
      message += "\n\n" + hint;
    } else {
      message += "\n\nSäg till när du vill ta nästa del — helt på dina villkor.";
    }

    return {
      message: message,
      chips: buildExploreChips().slice(0, 4),
      context: ctx,
    };
  }

  function buildRetryMessage(ctx) {
    if (editingSession.retryCount >= 2) {
      return (
        "Jag är inte nöjd med det resultatet heller.\n\n" +
        "Vi testar ett annat grepp — beskriv gärna lite mer vad du vill se, så hittar vi rätt."
      );
    }
    if (editingSession.retryCount >= 1) {
      return "Den där blev inte som jag tänkte mig heller.\n\nSka jag prova en annan variant?";
    }
    return "Den där satt inte riktigt.\n\nJag kan prova igen — eller så beskriver du lite mer vad du är ute efter.";
  }

  function retryChips(ctx) {
    return [
      { label: "Prova igen", command: commandForContext(ctx, "igen", "retry") },
      { label: "Visa en till", command: "__try_another__" },
      ...(editingSession.undoAvailable ? [{ label: "Ta tillbaka", command: "__undo__" }] : []),
    ];
  }

  /**
   * Session intents — resolved before pipeline. EditSession is source of truth.
   */
  function resolveSessionIntent(text) {
    const raw = String(text || "").trim();
    const s = normalize(raw);
    if (!raw) return null;

    if (raw === "__keep__" || raw === "__accept__") {
      return { type: "session.keep" };
    }
    if (raw === "__undo__") {
      return { type: "session.undo" };
    }
    if (raw === "__try_another__") {
      const ctx =
        (editingSession.pendingVerification && editingSession.pendingVerification.context) || getContext();
      return {
        type: "session.refine",
        context: ctx,
        command: commandForContext(ctx, "", "another"),
      };
    }
    if (raw === "__open_material__") {
      return { type: "session.open_material" };
    }

    const explicit = parseContextFromText(raw);
    const pendingCtx = editingSession.pendingVerification && editingSession.pendingVerification.context;
    const activeCtx = explicit || pendingCtx || getContext();

    if (isKeep(s) && (editingSession.pendingVerification || fresh())) {
      return { type: "session.keep" };
    }
    if (isUndoRequest(s)) {
      return { type: "session.undo" };
    }

    /** Pending verification: short replies apply to that context */
    if (editingSession.pendingVerification && isShortRefinement(s, raw)) {
      if (/^(nej|no|inte)$/.test(s)) {
        setRefineIntro("Inga problem — jag testar en annan version.\n\n");
      } else if (isTryAnother(s)) {
        setRefineIntro("Absolut — här kommer ett annat förslag.\n\n");
      }
      if (isTryAnother(s)) {
        return {
          type: "session.refine",
          context: pendingCtx,
          command: commandForContext(pendingCtx, raw, "another"),
        };
      }
      return {
        type: "session.refine",
        context: pendingCtx,
        command: commandForContext(pendingCtx, raw, "refine"),
      };
    }

    /** Active context follow-up without re-stating section */
    if (
      !explicit &&
      fresh() &&
      editingSession.currentSection &&
      editingSession.currentObject &&
      isShortRefinement(s, raw) &&
      !editingSession.pendingVerification
    ) {
      return {
        type: "session.refine",
        context: activeCtx,
        command: commandForContext(activeCtx, raw, isTryAnother(s) ? "another" : "refine"),
      };
    }

    /** Explicit new context: session updated; pipeline handles full command */
    if (explicit) {
      return null;
    }

    return null;
  }

  function wrapPipelineResult(result) {
    if (!result) return result;

    const ctx = contextFromPipelineTarget(result.requestedTarget, result.action);
    if (ctx.section) setContext(ctx);

    if (result.ok && result.verified) {
      completeEdit(result);
      let msg = buildVerifiedMessage(getContext());
      if (
        (result.action === "industry.adapt" || result.action === "design.color") &&
        result.message
      ) {
        msg = result.message;
      }
      result.message = msg || result.message;
      result.chips = verificationChips(getContext());
      result.sessionContext = getContext();
      return result;
    }

    if (result.handled !== false && !result.ok) {
      recordFailure(result.failureReason);
      result.message = buildRetryMessage(getContext());
      result.chips = retryChips(getContext());
    }

    return result;
  }

  function getSession() {
    return JSON.parse(
      JSON.stringify({
        currentPage: editingSession.currentPage,
        currentSection: editingSession.currentSection,
        currentObject: editingSession.currentObject,
        currentTask: editingSession.currentTask,
        pendingVerification: editingSession.pendingVerification,
        undoAvailable: editingSession.undoAvailable,
        lastAcceptedChange: editingSession.lastAcceptedChange,
        acceptedLocks: editingSession.acceptedLocks,
        editBaseline: !!editingSession.editBaseline,
        retryCount: editingSession.retryCount,
        context: getContext(),
        at: editingSession.at,
      }),
    );
  }

  function resetSession() {
    Object.assign(editingSession, createEmptySession());
  }

  function setFocus(section, object, task) {
    setContext({
      page: "home",
      section: section || "hero",
      object: object || "image",
      task: task || "change_image",
    });
  }

  global.EditSession = {
    getContext: getContext,
    getSession: getSession,
    setContext: setContext,
    parseContextFromText: parseContextFromText,
    contextFromPipelineTarget: contextFromPipelineTarget,
    mapTargetToContextKey: mapTargetToContextKey,
    resolveSessionIntent: resolveSessionIntent,
    beginEdit: beginEdit,
    completeEdit: completeEdit,
    wrapPipelineResult: wrapPipelineResult,
    handleKeep: handleKeep,
    handleUndo: handleUndo,
    captureDocSnapshot: captureDocSnapshot,
    restoreDocSnapshot: restoreDocSnapshot,
    isComponentLocked: isComponentLocked,
    unlockComponent: unlockComponent,
    lockComponent: lockComponent,
    abandonPendingCandidate: abandonPendingCandidate,
    getRecentFocusWeights: getRecentFocusWeights,
    commandForContext: commandForContext,
    verificationChips: verificationChips,
    buildVerifiedMessage: buildVerifiedMessage,
    buildRetryMessage: buildRetryMessage,
    buildExploreChips: buildExploreChips,
    humanDescribe: humanDescribe,
    proactiveNotice: proactiveNotice,
    resetSession: resetSession,
    setFocus: setFocus,
    contextLabel: contextLabel,
    logEvent: logEvent,
  };
})(typeof window !== "undefined" ? window : globalThis);
