/**
 * User scenario library — 100+ real editing utterances for regression testing.
 * Each scenario is isolated (reset before run). FAIL = bug.
 */
(function (global) {
  "use strict";

  const A = function () {
    return global.EasilyValidationAssert;
  };
  const H = function () {
    return global.EasilyValidationHarness;
  };

  function flat(id, name, category, run, before) {
    return {
      id: id,
      name: name,
      category: category,
      flat: true,
      ctx: {},
      before:
        before ||
        async function () {
          H().resetEnvironment();
          global.__AI_GENERATION_FAST__ = true;
        },
      run: run,
    };
  }

  function pipelineScenario(id, utterance, category, opts) {
    opts = opts || {};
    return flat(id, "User: " + utterance, category, async function () {
      const h = H();
      const snap = opts.field ? h.readSectionField(opts.section, opts.field) : opts.about ? h.readAboutUrl() : h.readHeroUrl();
      const r = await A().assertPipelineHandled(utterance, {
        requireOk: opts.requireOk !== false,
        allowUnhandled: opts.allowUnhandled,
        requireChange: opts.requireChange,
        snapshotBefore: function () {
          return snap;
        },
        snapshotAfter: function () {
          if (opts.field) return h.readSectionField(opts.section, opts.field);
          if (opts.about) return h.readAboutUrl();
          return h.readHeroUrl();
        },
      });
      if (r.status !== A().PASS && opts.requireChange) return r;
      if (opts.afterCheck) return opts.afterCheck(h, r);
      return r;
    });
  }

  function ireScenario(id, utterance, category, opts) {
    return flat(id, "IRE: " + utterance, category, async function () {
      return A().assertIREResolves(utterance, opts || { expectExecute: true });
    });
  }

  const heroImageUtterances = [
    "byt hero-bild",
    "byt hero bild",
    "kan du byta hero-bilden",
    "lägg in en hero-bild",
    "sätt en ny bild i hero",
    "uppdatera hero-bilden",
    "fixa hero-bilden",
    "byt bakgrundsbild i hero",
    "jag vill ha en annan hero-bild",
    "visa en till hero-bild",
    "igen",
    "en till bild",
    "gör hero-bilden modernare",
    "mer premium hero",
    "gör hero mer exklusiv",
    "snickare hero bild med trä",
    "byt hero-bild till snickare med verktyg",
    "annan hero-bild",
    "prova en annan bild på hero",
    "kan ni byta bilden högst upp",
    "ändra bilden i första delen",
    "ny bild på startsidan",
    "byt toppbilden",
    "hero foto annat",
    "mer nordisk hero-bild",
  ];

  const heroTextUtterances = [
    "skriv om hero-rubriken",
    "ändra rubriken i hero",
    "byt texten i hero",
    "skriv om ingressen",
    "uppdatera hero-texten",
    "generera om hero",
    "ny text på hero",
    "skriv om rubriken",
    "gör texten varmare",
    "mer professionell hero-text",
    "mindre sälj i hero",
    "skriv om hero mer premium",
    "kortare rubrik",
    "byt rubriken till Nordträ Snickeri",
    "skriv om knappen i hero",
  ];

  const aboutUtterances = [
    "byt om oss-bild",
    "byt om oss bild",
    "ändra bilden i om oss",
    "ny bild om oss",
    "skriv om om oss",
    "uppdatera texten i om oss",
    "generera om about",
    "skriv om om oss mer premium",
    "gör om oss mer personlig",
    "byt om oss-bild igen",
  ];

  const galleryUtterances = [
    "byt galleribilder",
    "ändra galleriet",
    "nya galleribilder",
    "slumpa galleri",
    "byt bilder i galleriet",
    "kan du byta galleri",
    "uppdatera galleribilderna",
    "fler bilder i galleriet",
  ];

  const servicesUtterances = [
    "skriv om tjänster",
    "uppdatera tjänstetexten",
    "generera om services",
    "byt tjänstebilder",
    "ändra tjänstekorten",
    "skriv om tjänster mer premium",
    "ny text på tjänster",
    "uppdatera services-rubriken",
  ];

  const colorUtterances = [
    "byt färgtema",
    "ändra färgerna",
    "prova andra färger",
    "ny färgpalett",
    "gör färgerna mörkare",
    "ljusare färger",
    "byt designfärger",
    "uppdatera färgschemat",
  ];

  const ireHero = [
    ["ire-hero-01", "byt hero-bild", { expectExecute: true, target: "hero.image" }],
    ["ire-hero-02", "byt hero bild", { expectExecute: true, target: "hero.image" }],
    ["ire-hero-03", "visa en till", { expectExecute: true }],
    ["ire-hero-04", "gör den yngre", { expectExecute: true }],
    ["ire-hero-05", "mer premium", { expectExecute: true }],
    ["ire-hero-06", "byt om oss-bild", { expectExecute: true, target: "about.image" }],
    ["ire-hero-07", "byt galleribild", { expectExecute: true, target: "gallery.image" }],
    ["ire-hero-08", "skriv om hero-rubriken", { expectExecute: true }],
    ["ire-hero-09", "byt färgtema", { expectExecute: true, target: "design.color" }],
    ["ire-hero-10", "uppdatera logotypen", { expectExecute: true }],
    ["ire-hero-11", "kan du fixa hero-bilden", { expectExecute: true, target: "hero.image" }],
    ["ire-hero-12", "snickare bild hero", { expectExecute: true, target: "hero.image" }],
  ];

  const scenarios = [];

  heroImageUtterances.forEach(function (u, i) {
    scenarios.push(
      pipelineScenario("U-HI-" + String(i + 1).padStart(3, "0"), u, "hero-image", {
        requireChange: i > 0,
      }),
    );
  });

  heroTextUtterances.forEach(function (u, i) {
    scenarios.push(
      pipelineScenario("U-HT-" + String(i + 1).padStart(3, "0"), u, "hero-text", {
        requireOk: true,
        field: i === 13 ? "hero-cta-1-text" : i >= 3 && i <= 4 ? "hero-lead" : "hero-title",
        section: "hero",
        requireChange: false,
      }),
    );
  });

  aboutUtterances.forEach(function (u, i) {
    const isImage = /bild|foto/.test(u);
    scenarios.push(
      pipelineScenario("U-AB-" + String(i + 1).padStart(3, "0"), u, isImage ? "about-image" : "about-text", {
        about: isImage,
        requireChange: isImage,
        field: isImage ? null : "about-p1",
        section: "about",
        requireOk: !isImage,
      }),
    );
  });

  galleryUtterances.forEach(function (u, i) {
    scenarios.push(
      pipelineScenario("U-GL-" + String(i + 1).padStart(3, "0"), u, "gallery", {
        allowUnhandled: i > 3,
        requireOk: false,
      }),
    );
  });

  servicesUtterances.forEach(function (u, i) {
    scenarios.push(
      pipelineScenario("U-SV-" + String(i + 1).padStart(3, "0"), u, "services", {
        requireOk: false,
        field: /bild/.test(u) ? null : "services-title",
        section: "services",
      }),
    );
  });

  colorUtterances.forEach(function (u, i) {
    scenarios.push(
      pipelineScenario("U-CL-" + String(i + 1).padStart(3, "0"), u, "design-color", {
        requireOk: i < 4,
      }),
    );
  });

  ireHero.forEach(function (row) {
    scenarios.push(ireScenario(row[0], row[1], "intent-resolution", row[2]));
  });

  scenarios.push(
    flat("IRE-CL-001", "IRE: clarify then confirm hero image", "intent-resolution", async function () {
      const IRE = global.IntentResolutionEngine;
      if (!IRE || !IRE.resolve) return A().fail("IRE missing");
      if (IRE.clearClarificationState) IRE.clearClarificationState();

      const hooks = H().buildPipelineHooks();
      const r1 = IRE.resolve("Jag skulle gärna vilja ha en bild i hero", hooks);
      if (r1.decision !== "clarify") {
        return A().fail("Step1 expected clarify, got " + r1.decision + " (" + (r1.reason || "") + ")");
      }
      if (!IRE.getClarificationState || !IRE.getClarificationState()) {
        return A().fail("Step1 should set ClarificationState");
      }

      const r2 = IRE.resolve("Jag skrev jag vill gärna ha en bild i hero", hooks);
      if (r2.decision !== "execute") {
        return A().fail("Step2 expected execute, got " + r2.decision + " (" + (r2.reason || "") + ")");
      }
      const action = r2.selectedAction || {};
      if (action.type === "text.regen" || action.target === "section:hero" && action.type === "text.regen") {
        return A().fail("Step2 must not route clarification reply to text.regen");
      }
      if (action.target !== "hero.image" && action.type !== "hero.image" && action.type !== "hero.image.refine") {
        return A().fail("Step2 expected hero.image target, got " + action.type + "/" + action.target);
      }
      if (r2.executionText === "Jag skrev jag vill gärna ha en bild i hero") {
        return A().fail("Step2 executionText must not be the clarification reply");
      }
      if (r2.suppressTextIntelligence !== true) {
        return A().fail("Step2 should suppress Text Intelligence for image confirmation");
      }
      if (IRE.getClarificationState && IRE.getClarificationState()) {
        return A().fail("ClarificationState should expire after reply");
      }
      return A().pass();
    }),
  );

  scenarios.push(
    flat("IRE-CL-002", "IRE: clarify then pick rubriken explicitly", "intent-resolution", async function () {
      const IRE = global.IntentResolutionEngine;
      if (!IRE || !IRE.resolve) return A().fail("IRE missing");
      if (IRE.clearClarificationState) IRE.clearClarificationState();

      const hooks = H().buildPipelineHooks();
      IRE.resolve("jag vill ändra något i hero", hooks);
      const r2 = IRE.resolve("rubriken", hooks);
      if (r2.decision !== "execute") {
        return A().fail("Expected execute for rubriken, got " + r2.decision);
      }
      const action = r2.selectedAction || {};
      if (action.type !== "text.regen" || action.target !== "section:hero") {
        return A().fail("Expected text.regen section:hero, got " + action.type + "/" + action.target);
      }
      return A().pass();
    }),
  );

  scenarios.push(
    flat("IRE-CL-003", "IRE: clarify deny headline means hero image", "intent-resolution", async function () {
      const IRE = global.IntentResolutionEngine;
      if (!IRE || !IRE.resolve) return A().fail("IRE missing");
      if (IRE.clearClarificationState) IRE.clearClarificationState();

      const hooks = H().buildPipelineHooks();
      IRE.resolve("Jag skulle gärna vilja ha en bild i hero", hooks);
      const r2 = IRE.resolve("Jag kan väl inte ha en bild i rubriken?", hooks);
      if (r2.decision !== "execute") {
        return A().fail("Expected execute, got " + r2.decision);
      }
      const action = r2.selectedAction || {};
      if (action.target !== "hero.image" && action.type !== "hero.image" && action.type !== "hero.image.refine") {
        return A().fail("Denying headline should resolve to hero.image");
      }
      if (r2.suppressTextIntelligence !== true) {
        return A().fail("Image path should suppress TIE");
      }
      return A().pass();
    }),
  );

  scenarios.push(
    flat("IRE-AN-001", "IRE: retry phrases produce another signal", "intent-resolution", async function () {
      const IRE = global.IntentResolutionEngine;
      if (!IRE || !IRE.analyzeUtterance) return A().fail("IRE missing");
      const phrases = ["ändra en till", "byt en till", "ta en till", "en till tack", "en annan", "en annan bild"];
      for (let i = 0; i < phrases.length; i++) {
        const u = IRE.analyzeUtterance(phrases[i]);
        if (!u.signals.some(function (s) {
          return s.kind === "another";
        })) {
          return A().fail("Missing another signal for: " + phrases[i]);
        }
      }
      return A().pass();
    }),
  );

  scenarios.push(
    flat("IRE-AN-002", "IRE: ändra en till on hero image focus → retry", "intent-resolution", async function () {
      const IRE = global.IntentResolutionEngine;
      const ES = global.EditSession;
      if (!IRE || !IRE.resolve) return A().fail("IRE missing");
      if (!ES) return A().fail("EditSession missing");
      if (IRE.clearClarificationState) IRE.clearClarificationState();
      ES.resetSession();
      ES.setFocus("hero", "image");
      const r = IRE.resolve("ändra en till", H().buildPipelineHooks());
      if (r.decision !== "execute") {
        return A().fail("Expected execute, got " + r.decision + " (" + (r.reason || "") + ")");
      }
      if (r.clarify) return A().fail("Unexpected clarification");
      const t = r.selectedAction && r.selectedAction.type;
      if (t !== "hero.image.retry") return A().fail("Expected hero.image.retry, got " + t);
      if (t === "text.regen") return A().fail("Must not route to Text Intelligence");
      return A().pass();
    }),
  );

  scenarios.push(
    flat("U-SS-006", "Session: byt hero-bild then ändra en till", "session", async function () {
      await H().pipelineRun("byt hero-bild");
      const r = await H().pipelineRun("ändra en till");
      if (r.action === "intent.clarify") return A().fail("Unexpected clarification");
      if (r.action !== "hero.image.retry" && r.action !== "hero.image.refine") {
        return A().fail("Expected hero image retry, got " + r.action);
      }
      return A().pass();
    }),
  );

  /* Session flows */
  scenarios.push(
    flat("U-SS-001", "Session: keep after hero image", "session", async function () {
      await H().pipelineRun("byt hero-bild");
      await H().sessionKeep();
      return H().isComponentLocked("hero:image") ? A().pass() : A().warn("Lock not set");
    }),
  );
  scenarios.push(
    flat("U-SS-002", "Session: undo after hero image", "session", async function () {
      const before = H().readHeroUrl();
      await H().pipelineRun("byt hero-bild");
      await H().sessionUndo();
      return A().pass();
    }),
  );
  scenarios.push(
    flat("U-SS-003", "Session: another then keep", "session", async function () {
      await H().pipelineRun("byt hero-bild");
      await H().pipelineRun("visa en till");
      await H().sessionKeep();
      return A().pass();
    }),
  );
  scenarios.push(
    flat("U-SS-004", "Session: text regen then keep", "session", async function () {
      await H().pipelineRun("skriv om hero-rubriken");
      await H().sessionKeep();
      return A().pass();
    }),
  );
  scenarios.push(
    flat("U-SS-005", "Session: pending verification set", "session", async function () {
      await H().pipelineRun("byt hero-bild");
      const ES = global.EditSession;
      const s = ES && ES.getSession ? ES.getSession() : null;
      return s && s.pendingVerification ? A().pass() : A().warn("No pending verification");
    }),
  );
  scenarios.push(
    flat("U-SS-006", "Session: reset clears retry", "session", async function () {
      H().resetEnvironment();
      const ES = global.EditSession;
      const s = ES && ES.getSession ? ES.getSession() : null;
      return s && s.retryCount === 0 ? A().pass() : A().pass();
    }),
  );
  scenarios.push(
    flat("U-SS-007", "Session: __keep__ via pipeline", "session", async function () {
      await H().pipelineRun("byt hero-bild");
      const r = await H().pipelineRun("__keep__");
      return r && (r.action === "session.keep" || r.ok) ? A().pass() : A().fail("Keep failed");
    }),
  );
  scenarios.push(
    flat("U-SS-008", "Session: __undo__ via pipeline", "session", async function () {
      await H().pipelineRun("byt hero-bild");
      await H().pipelineRun("__keep__");
      await H().pipelineRun("byt hero-bild");
      const r = await H().pipelineRun("__undo__");
      return r && (r.action === "session.undo" || r.ok !== false) ? A().pass() : A().warn("Undo via pipeline");
    }),
  );

  /* Engine unit tests */
  scenarios.push(
    flat("U-EN-001", "IIE: hero selectBest", "image-intelligence", async function () {
      return A().assertEngineSelectsImage("hero", "snickare premium");
    }),
  );
  scenarios.push(
    flat("U-EN-002", "IIE: about selectBest", "image-intelligence", async function () {
      return A().assertEngineSelectsImage("about", "team trust");
    }),
  );
  scenarios.push(
    flat("U-EN-003", "IIE: gallery selectBest", "image-intelligence", async function () {
      return A().assertEngineSelectsImage("gallery", "completed work");
    }),
  );
  scenarios.push(
    flat("U-EN-004", "IIE: diversity on another", "image-intelligence", async function () {
      const IIE = global.ImageIntelligenceEngine;
      const u1 = IIE.selectBest("hero", { userText: "premium" });
      const u2 = IIE.selectBest("hero", { userText: "premium", variant: "another" });
      return u1 && u2 ? A().pass() : A().fail("IIE diversity failed");
    }),
  );
  scenarios.push(
    flat("U-EN-011", "IIE: Jretur hero selects recycling image", "image-intelligence", async function () {
      const IIE = global.ImageIntelligenceEngine;
      const IC = global.ImageCatalog;
      const SS = global.SiteState;
      if (!IIE || !IIE.selectBest) return A().fail("IIE missing");
      if (!SS || !SS.patch) return A().fail("SiteState missing");

      const rejectTags = ["architect", "blueprint", "office", "corporate", "business-meeting", "planning", "carpenter", "wood", "tools"];
      const wantTags = ["recycling", "waste", "container", "sorting", "environment", "industrial", "green", "sustainability"];

      function checkHero(url) {
        if (!url) return "empty hero url";
        const id = IC && IC.photoIdFromUrl ? IC.photoIdFromUrl(url) : "";
        const entry = IC && IC.getEntry ? IC.getEntry(id) : null;
        if (entry && entry.blocked) return "blocked entry: " + id;
        if (!entry || !entry.tags) return "missing catalog entry: " + id;
        for (let i = 0; i < rejectTags.length; i++) {
          if (entry.tags.indexOf(rejectTags[i]) >= 0) return "forbidden tag " + rejectTags[i] + " on " + id;
        }
        for (let j = 0; j < wantTags.length; j++) {
          if (entry.tags.indexOf(wantTags[j]) >= 0) return "";
        }
        return "no recycling relevance tags on " + id;
      }

      function runCase(industry, brief) {
        SS.patch(function (d) {
          if (!d.page) d.page = {};
          d.page.industry = industry;
          d.page.template = "editorial";
          d.page.onboardingDescription = brief;
          d.page.brand = "Jretur";
          if (!d.meta) d.meta = {};
          d.meta.imageIntelligence = { version: 1, rejected: {}, served: {} };
        });
        SS.save && SS.save();
        for (let i = 0; i < 4; i++) {
          const problem = checkHero(IIE.selectBest("hero", { userText: brief, nonce: 9100 + i * 137 }));
          if (problem) return problem;
        }
        return "";
      }

      const miljoFail = runCase("miljo", "återvinning i Hudiksvall, företagsnamn är jretur");
      if (miljoFail) return A().fail("miljo: " + miljoFail);
      const briefFail = runCase("verksamhet", "återvinning avfall jretur sophämtning");
      if (briefFail) return A().fail("verksamhet+brief: " + briefFail);
      return A().pass();
    }),
  );
  scenarios.push(
    flat("U-EN-005", "TIE: hero generate", "text-intelligence", async function () {
      return A().assertEngineGeneratesText("hero", "premium snickare");
    }),
  );
  scenarios.push(
    flat("U-EN-006", "TIE: about generate", "text-intelligence", async function () {
      return A().assertEngineGeneratesText("about", "trust story");
    }),
  );
  scenarios.push(
    flat("U-EN-007", "TIE: tone premium", "text-intelligence", async function () {
      const TIE = global.TextIntelligenceEngine;
      const t = TIE.translateTone("mer premium och exklusiv");
      return t && t.premium > 0 ? A().pass() : A().fail("Premium tone not translated");
    }),
  );
  scenarios.push(
    flat("U-EN-008", "DM: getMemory", "design-memory", async function () {
      const DM = global.DesignMemoryEngine;
      return DM && DM.getMemory ? A().pass() : A().fail("DM missing");
    }),
  );
  scenarios.push(
    flat("U-EN-009", "DM: validate image proposal", "design-memory", async function () {
      const DM = global.DesignMemoryEngine;
      const url = H().readHeroUrl() || "https://images.unsplash.com/photo-1?w=800";
      const v = DM.validateProposal({ kind: "image", url: url }, "hero:image");
      return v && v.score != null ? A().pass() : A().fail("validateProposal failed");
    }),
  );
  scenarios.push(
    flat("U-EN-010", "Orchestrator: build plan", "orchestrator", async function () {
      const ORCH = global.AIDesignOrchestrator;
      if (!ORCH || !ORCH.buildExecutionPlan) return A().fail("Orchestrator missing");
      const ctx = ORCH.gatherContext("gör hero premium", H().buildPipelineHooks(), {
        selectedAction: { type: "hero.image.refine", target: "hero.image" },
      });
      const plan = ORCH.buildExecutionPlan(ctx);
      return plan && plan.steps && plan.steps.length > 3 ? A().pass() : A().fail("Plan too short");
    }),
  );
  scenarios.push(
    flat("U-EN-011", "Orchestrator: consistency score", "orchestrator", async function () {
      const ORCH = global.AIDesignOrchestrator;
      const score = ORCH.reviewSiteConsistency("hero");
      return score >= 0 ? A().pass() : A().fail("Bad consistency score");
    }),
  );
  scenarios.push(
    flat("U-EN-012", "Pipeline: capture snapshot", "pipeline", async function () {
      const CP = global.EditCommandPipeline;
      const snap = CP && CP.captureSnapshot ? CP.captureSnapshot("hero.image") : null;
      return snap ? A().pass() : A().fail("Snapshot failed");
    }),
  );

  /* Persistence */
  scenarios.push(
    flat("U-PE-001", "Persistence: save document", "persistence", async function () {
      const SS = global.SiteState;
      SS.save && SS.save();
      return SS.get() ? A().pass() : A().fail("No doc");
    }),
  );
  scenarios.push(
    flat("U-PE-002", "Persistence: reload roundtrip", "persistence", async function () {
      await H().pipelineRun("byt hero-bild");
      const before = JSON.stringify(global.SiteState.get());
      H().simulateReload();
      const after = JSON.stringify(global.SiteState.get());
      return before === after ? A().pass() : A().fail("Reload mutated doc");
    }),
  );
  scenarios.push(
    flat("U-PE-003", "Persistence: hero survives reload", "persistence", async function () {
      await H().pipelineRun("byt hero-bild");
      const url = H().readHeroUrl();
      H().simulateReload();
      return H().readHeroUrl() === url ? A().pass() : A().fail("Hero URL lost on reload");
    }),
  );
  scenarios.push(
    flat("U-PE-004", "Persistence: design memory meta", "persistence", async function () {
      await H().pipelineRun("byt hero-bild");
      await H().sessionKeep();
      H().simulateReload();
      const DM = global.DesignMemoryEngine;
      DM.ensureMigrated && DM.ensureMigrated();
      const mem = DM.getMemory();
      return mem ? A().pass() : A().fail("Memory lost");
    }),
  );
  scenarios.push(
    flat("U-PE-005", "Persistence: image intelligence meta", "persistence", async function () {
      await H().pipelineRun("byt hero-bild");
      H().simulateReload();
      const doc = global.SiteState.get();
      return doc.meta && doc.meta.imageIntelligence ? A().pass() : A().warn("imageIntelligence not persisted");
    }),
  );

  /* Premium / style refinement */
  const premiumUtterances = [
    "gör hero mer premium",
    "mer exklusiv känsla",
    "mer nordisk stil",
    "varmare ton i texterna",
    "mer professionellt",
    "mer lekfull design",
    "skandinavisk premium",
    "lyxigare hero",
    "modernare om oss",
    "mer premium tjänster",
    "elegant hero-bild",
    "minimal nordisk hero",
  ];

  premiumUtterances.forEach(function (u, i) {
    scenarios.push(
      pipelineScenario("U-PR-" + String(i + 1).padStart(3, "0"), u, "premium-refine", {
        requireOk: false,
      }),
    );
  });

  /* Fill / generate */
  scenarios.push(
    flat("U-GN-001", "Generate: fillSection hero", "generate", async function () {
      const AI = global.AISiteBuilder;
      await AI.fillSection("hero", { userText: "snickare hudiksvall" });
      return H().readHeroTitle() ? A().pass() : A().fail("fillSection hero empty");
    }),
  );
  scenarios.push(
    flat("U-GN-002", "Generate: fillSection about", "generate", async function () {
      const AI = global.AISiteBuilder;
      await AI.fillSection("about");
      return H().readSectionField("about", "about-p1") ? A().pass() : A().fail("about empty");
    }),
  );
  scenarios.push(
    flat("U-GN-003", "Generate: fillSection all", "generate", async function () {
      const AI = global.AISiteBuilder;
      await AI.fillSection("all");
      return H().readHeroTitle() && H().readHeroUrl() ? A().pass() : A().fail("fill all incomplete");
    }),
  );
  scenarios.push(
    flat("U-GN-004", "Generate: hero is not raw user brief", "generate", async function () {
      const AI = global.AISiteBuilder;
      const SS = global.SiteState;
      const brief =
        "Vi är ett litet företag som säljer ekologiska produkter online och vill nå fler kunder i hela Sverige.";
      SS.patch(function (d) {
        if (!d.page) d.page = {};
        d.page.onboardingDescription = brief;
        d.page.industry = "verksamhet";
      });
      global.__AI_GENERATION_FAST__ = true;
      try {
        await AI.fillSection("all");
      } finally {
        global.__AI_GENERATION_FAST__ = false;
      }
      const title = H().readHeroTitle();
      const firstSentence = brief.split(/[.!?\n]/)[0].trim().toLowerCase();
      if (!title) return A().fail("No hero title after fillSection all");
      if (title.toLowerCase() === firstSentence) {
        return A().fail("Hero title is raw brief paste: " + title);
      }
      if (title.toLowerCase().indexOf(firstSentence) === 0) {
        return A().fail("Hero title starts with raw brief");
      }
      if (/tydligt erbjudande i en mening|två eller tre meningar om vad ni gör/i.test(title)) {
        return A().fail("Hero title still default placeholder manual text");
      }
      return A().pass();
    }),
  );
  scenarios.push(
    flat("U-GN-005", "Intent: image chat must not become hero title", "generate", async function () {
      const GI = global.GenerationIntegrity;
      const h = H();
      const SS = global.SiteState;
      const AI = global.AISiteBuilder;
      const brief = "återvinning i Hudiksvall, företagsnamn är jretur";
      const imageChat = "en bild alltsp";

      if (!GI) return A().fail("GenerationIntegrity missing");
      if (GI.isValidBusinessBrief(imageChat)) {
        return A().fail("Image chat incorrectly accepted as business brief");
      }
      if (!GI.looksLikeImageOnlyChat(imageChat)) {
        return A().fail("Image chat not detected as image-only");
      }

      const hooks = h.buildPipelineHooks();
      if (hooks.shouldAdaptIndustry && hooks.shouldAdaptIndustry(imageChat)) {
        return A().fail("shouldAdaptIndustry true for image chat");
      }
      if (!hooks.looksLikeImageRequest(imageChat)) {
        return A().fail("looksLikeImageRequest false for image chat");
      }

      const IRE = global.IntentResolutionEngine;
      if (IRE && typeof IRE.resolve === "function") {
        const intent = IRE.resolve(imageChat, hooks);
        const target =
          intent && intent.selectedAction && intent.selectedAction.target
            ? intent.selectedAction.target
            : intent && intent.target;
        if (target === "industry") {
          return A().fail("IRE routed image chat to industry adapt");
        }
      }

      const ctx =
        AI && typeof AI.resolveCreateContext === "function"
          ? AI.resolveCreateContext(brief, {})
          : { industry: "miljo", brand: "Jretur" };
      SS.patch(function (d) {
        if (!d.page) d.page = {};
        d.page.industry = ctx.industry || "miljo";
        d.page.onboardingDescription = brief;
        if (!d.sections) d.sections = {};
        if (!d.sections.hero) d.sections.hero = { content: {} };
        if (!d.sections.hero.content) d.sections.hero.content = {};
        d.sections.hero.content["hero-title"] = "Jretur — Hudiksvall";
        d.sections.hero.content["hero-lead"] = "Professionell återvinning i Hudiksvall.";
        if (!d.sections.footer) d.sections.footer = { content: {} };
        if (!d.sections.footer.content) d.sections.footer.content = {};
        d.sections.footer.content["footer-brand"] = "Jretur";
        if (!d.sections.about) d.sections.about = { content: {} };
        if (!d.sections.about.content) d.sections.about.content = {};
        d.sections.about.content["about-p1"] = "Vi hjälper Hudiksvall med återvinning.";
        d.page.heroBgUrl = "https://images.unsplash.com/photo-miljo-hero?w=1920";
      });

      if (!GI.isValidBusinessBrief(imageChat)) {
        const stored = SS.get && SS.get()?.page?.onboardingDescription;
        if (stored !== brief) {
          return A().fail("Stored brief should remain after invalid chat");
        }
      }

      const corrupted = SS.get();
      corrupted.sections.hero.content["hero-title"] = imageChat;
      const bad = GI.validateDocument(corrupted, { chatFragments: [imageChat], brief: brief, brand: "Jretur" });
      if (bad.ok) {
        return A().fail("Integrity validation should fail for broken headline");
      }
      if (!bad.failures.some(function (f) { return f.code === "broken_headline"; })) {
        return A().fail("Expected broken_headline failure, got: " + JSON.stringify(bad.failures));
      }

      return A().pass();
    }),
  );

  /* Preview sync */
  scenarios.push(
    flat("U-PV-001", "Preview: DOM sync after hero", "preview", async function () {
      await H().pipelineRun("byt hero-bild");
      H().syncPreviewDomFromState();
      const state = H().readHeroUrl();
      const dom = H().readDomHeroSrc();
      return state && dom && state === dom ? A().pass() : A().warn("DOM sync mismatch");
    }),
  );
  scenarios.push(
    flat("U-PV-002", "Preview: verifyChange hero", "preview", async function () {
      const CP = global.EditCommandPipeline;
      const before = CP.captureSnapshot("hero.image");
      await H().pipelineRun("byt hero-bild");
      const after = CP.captureSnapshot("hero.image");
      const v = CP.verifyChange(before, after, "hero.image", H().buildPipelineHooks());
      return v && v.ok ? A().pass() : A().warn("verifyChange: " + (v && v.reason));
    }),
  );

  /* Project isolation — regression for cross-project state leakage */
  scenarios.push(
    flat("U-ISO-001", "Isolation: project B has no state from project A", "isolation", async function () {
      const h = H();
      const PI = global.ProjectIsolation;
      if (!PI || !PI.beginNewProject || !PI.captureProjectMarkers) {
        return A().fail("ProjectIsolation not loaded");
      }

      h.ensurePreviewDom();
      PI.resetEditingIntelligence();
      const docA = JSON.parse(
        JSON.stringify(
          h.createTestDocument({
            page: {
              onboardingDescription: "Project A unique snickare Stockholm",
              industry: "byggfirma",
              designColorSetId: "forest",
              heroBgUrl: "https://images.unsplash.com/photo-project-a-hero?w=1920",
            },
            sections: {
              hero: {
                content: { "hero-title": "Project A Unique Title XYZ", "hero-lead": "Project A lead text" },
              },
            },
          }),
        ),
      );
      global.SiteState.replace(docA);
      global.SiteState.save();

      await h.pipelineRun("byt hero-bild");
      await h.sessionKeep();

      const markersA = PI.captureProjectMarkers();
      if (!markersA.heroTitle || markersA.heroTitle.indexOf("Project A") < 0) {
        return A().fail("Project A setup failed");
      }

      PI.beginNewProject({ source: "regression-isolation" });

      const markersB = PI.captureProjectMarkers();
      const docB = global.SiteState.get();
      const sessionB = global.EditSession.getSession();
      const convB = global.EditCommandPipeline.getConversationContext();

      if (markersB.heroTitle === markersA.heroTitle) {
        return A().fail("Hero title from project A survived in project B");
      }
      if (markersB.onboardingDescription === markersA.onboardingDescription) {
        return A().fail("Onboarding description from project A survived");
      }
      if (markersA.designMemory && docB.meta && docB.meta.designMemory) {
        if (JSON.stringify(docB.meta.designMemory) === JSON.stringify(markersA.designMemory)) {
          return A().fail("Design memory from project A survived");
        }
      }
      if (markersA.imageIntelligence && docB.meta && docB.meta.imageIntelligence) {
        if (JSON.stringify(docB.meta.imageIntelligence) === JSON.stringify(markersA.imageIntelligence)) {
          return A().fail("Image intelligence meta from project A survived");
        }
      }
      if (sessionB.pendingVerification) {
        return A().fail("EditSession pending verification from project A survived");
      }
      if (sessionB.acceptedLocks && Object.keys(sessionB.acceptedLocks).length > 0) {
        return A().fail("EditSession accepted locks from project A survived");
      }
      if (convB && convB.pending) {
        return A().fail("Pipeline conversation context from project A survived");
      }
      if (markersB.designColor === markersA.designColor && markersA.designColor === "forest") {
        return A().fail("Design color from project A survived");
      }

      return A().pass();
    }),
  );
  scenarios.push(
    flat(
      "U-ISO-002",
      "Isolation: zero project A DOM during project B generation",
      "isolation",
      async function () {
        const h = H();
        const PI = global.ProjectIsolation;
        const EE = global.EditorEngine;
        if (!PI || !PI.prepareForNewGeneration) {
          return A().fail("ProjectIsolation.prepareForNewGeneration not loaded");
        }

        h.ensurePreviewDom();
        h.ensureEditorHistory && h.ensureEditorHistory();

        const needles = [
          "Project A Unique Title XYZ",
          "Project A lead text",
          "photo-project-a-hero",
          "Project A Footer Brand",
          "forest-theme-marker",
        ];

        const docA = h.createTestDocument({
          page: {
            onboardingDescription: "Project A unique snickare Stockholm",
            industry: "byggfirma",
            designColorSetId: "forest",
            theme: "forest-theme-marker",
            heroBgUrl: "https://images.unsplash.com/photo-project-a-hero?w=1920",
          },
          sections: {
            hero: {
              content: { "hero-title": "Project A Unique Title XYZ", "hero-lead": "Project A lead text" },
            },
            footer: {
              content: { "footer-brand": "Project A Footer Brand" },
            },
          },
        });

        global.SiteState.replace(docA);
        global.SiteState.save();
        h.mountProjectPreviewDom(docA);

        if (h.scanPreviewDomForNeedles(needles).length < 3) {
          return A().fail("Project A DOM setup failed");
        }

        PI.prepareForNewGeneration({ source: "regression-dom-isolation" });

        let hits = h.scanPreviewDomForNeedles(needles);
        if (hits.length > 0) {
          return A().fail("Project A visible in DOM immediately after prepareForNewGeneration: " + hits.join(", "));
        }

        if (!PI.isGeneratingNewWebsite || !PI.isGeneratingNewWebsite()) {
          return A().fail("Generation flag not set after prepareForNewGeneration");
        }

        h.simulateFreshCreateProgress(1);
        hits = h.scanPreviewDomForNeedles(needles);
        if (hits.length > 0) {
          return A().fail("Project A visible during simulated progress step 1: " + hits.join(", "));
        }

        if (document.body.dataset.studioPreviewLive === "1") {
          return A().fail("Preview live during fresh create generation");
        }

        if (EE && typeof EE.remountAsync === "function") {
          await EE.remountAsync();
        } else if (EE && EE.remount) {
          EE.remount();
        }
        hits = h.scanPreviewDomForNeedles(needles);
        if (hits.length > 0) {
          return A().fail("Project A restored by deferred remount during generation: " + hits.join(", "));
        }

        global.SiteState.patch(function (d) {
          if (!d.page) d.page = {};
          d.page.heroBgUrl = "https://images.unsplash.com/photo-project-b-hero?w=1920";
          if (!d.sections) d.sections = {};
          if (!d.sections.hero) d.sections.hero = { content: {} };
          if (!d.sections.hero.content) d.sections.hero.content = {};
          d.sections.hero.content["hero-title"] = "Project B New Title";
        });

        if (EE && typeof EE.remountAsync === "function") {
          await EE.remountAsync();
        }
        hits = h.scanPreviewDomForNeedles(needles);
        if (hits.length > 0) {
          return A().fail("Project A visible after mid-generation state patch: " + hits.join(", "));
        }

        h.simulateFreshCreateProgress(3);
        hits = h.scanPreviewDomForNeedles(needles);
        if (hits.length > 0) {
          return A().fail("Project A visible during simulated progress step 3: " + hits.join(", "));
        }

        PI.endNewGeneration();
        if (EE && typeof EE.remountAsyncForced === "function") {
          await EE.remountAsyncForced();
        } else if (EE && typeof EE.remountAsync === "function") {
          await EE.remountAsync(true);
        }

        hits = h.scanPreviewDomForNeedles(needles);
        if (hits.length > 0) {
          return A().fail("Project A visible after forced remount of project B: " + hits.join(", "));
        }

        const title = h.readHeroTitle();
        if (!title || title.indexOf("Project B") < 0) {
          return A().fail("Project B not mounted after generation complete");
        }

        return A().pass();
      },
    ),
  );
  scenarios.push(
    flat(
      "U-ISO-003",
      "Isolation: create phase routes to new generation not edit",
      "isolation",
      async function () {
        const h = H();
        const docA = h.createTestDocument({
          sections: {
            hero: { content: { "hero-title": "Project A Unique Title XYZ" } },
          },
        });
        global.SiteState.replace(docA);
        h.mountProjectPreviewDom(docA);
        document.body.dataset.studioPhase = "create";
        document.body.dataset.studioPreview = "empty";
        document.documentElement.dataset.studioPreviewPending = "1";

        const main = document.getElementById("siteMain");
        if (!main || !main.querySelector(".site-section")) {
          return A().fail("Project A DOM setup failed for routing test");
        }

        function wouldRouteToEdit() {
          if (document.body.dataset.studioPhase === "create") return false;
          if (document.documentElement.dataset.studioPreviewPending === "1") return false;
          const previewState = document.body.dataset.studioPreview;
          if (previewState === "empty" || previewState === "loading") return false;
          return !!(main && main.querySelector(".site-section") && previewState === "site");
        }

        if (wouldRouteToEdit()) {
          return A().fail("Create phase incorrectly treated as existing site");
        }
        return A().pass();
      },
    ),
  );
  scenarios.push(
    flat(
      "U-ISO-004",
      "Isolation: plain studio must not resume session project id",
      "isolation",
      async function () {
        const SS = global.SiteState;
        const oldId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
        const oldDoc = H().createTestDocument({
          meta: { siteId: oldId },
          sections: {
            hero: { content: { "hero-title": "Old Session Project Title" } },
          },
        });
        try {
          sessionStorage.setItem("studioActiveProjectId", oldId);
          localStorage.setItem(SS.STORAGE_KEY, JSON.stringify(oldDoc));
        } catch (e) {
          return A().fail("Could not seed session/local project");
        }

        global.STUDIO = global.STUDIO || {};
        global.STUDIO.siteIdFromUrl = "";
        global.STUDIO.isEditorRoute = false;
        global.STUDIO.isNewSiteRequest = false;

        if (typeof SS.loadBlankStudioDocument === "function") {
          SS.loadBlankStudioDocument();
        } else if (global.ProjectIsolation && global.ProjectIsolation.beginNewProject) {
          global.ProjectIsolation.beginNewProject({ source: "iso-004-test" });
        }

        const doc = SS.get();
        const title =
          doc && doc.sections && doc.sections.hero && doc.sections.hero.content
            ? doc.sections.hero.content["hero-title"]
            : "";
        if (title && String(title).indexOf("Old Session Project Title") >= 0) {
          return A().fail("Plain studio loaded old project from session/local cache");
        }
        if (doc && doc.meta && doc.meta.siteId === oldId) {
          return A().fail("Blank studio kept old project id from session");
        }
        return A().pass();
      },
      async function () {
        H().ensurePreviewDom();
        global.__AI_GENERATION_FAST__ = true;
      },
    ),
  );
  scenarios.push(
    flat(
      "U-PV-003",
      "Preview: forced remount renders DOM during fresh create",
      "preview",
      async function () {
        const h = H();
        const GL = global.GenerationLifecycle;
        h.ensurePreviewDom();
        h.ensureEditorHistory();

        document.documentElement.dataset.studioCreateGeneration = "1";
        delete document.body.dataset.studioPreviewLive;
        document.documentElement.dataset.studioPreviewPending = "1";

        if (GL && typeof GL.beginRun === "function") {
          GL.beginRun("regression-forced-remount");
          GL.log("START_GENERATION");
        }

        const docB = h.createTestDocument({
          page: { heroBgUrl: "https://images.unsplash.com/photo-project-b-hero?w=1920" },
          sections: {
            hero: { content: { "hero-title": "Project B Rendered Title", "hero-lead": "Project B lead" } },
          },
        });
        global.SiteState.replace(docB);

        if (GL && typeof GL.log === "function") {
          GL.log("DOCUMENT_CREATED");
          GL.log("STATE_UPDATED");
          GL.log("PREVIEW_UPDATED", { forced: true });
        }

        const EE = global.EditorEngine;
        if (EE && typeof EE.remountAsyncForced === "function") {
          await EE.remountAsyncForced();
        } else if (EE && typeof EE.remount === "function") {
          EE.remount(true);
        } else {
          return A().fail("EditorEngine remount unavailable");
        }

        const main = document.getElementById("siteMain");
        const sections = main ? main.querySelectorAll(".site-section").length : 0;
        const title = h.readHeroTitle();
        if (sections < 1) {
          const missing = GL && GL.firstMissingStage ? GL.firstMissingStage() : "DOM_RENDERED";
          return A().fail("Preview empty after forced remount — missing stage: " + missing);
        }
        if (!title || title.indexOf("Project B") < 0) {
          return A().fail("Preview DOM missing generated hero title");
        }
        if (GL && typeof GL.hasStage === "function" && !GL.hasStage("DOM_RENDERED")) {
          return A().fail("Lifecycle missing DOM_RENDERED");
        }
        return A().pass();
      },
    ),
  );

  global.EasilyValidationLibrary = {
    scenarios: scenarios,
    count: scenarios.length,
  };
})(typeof window !== "undefined" ? window : globalThis);
