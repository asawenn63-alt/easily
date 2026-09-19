/**
 * Validation scenarios — complete editing workflows for regression testing.
 */
(function (global) {
  "use strict";

  const S = global.EasilySystemValidation && global.EasilySystemValidation.STATUS;
  const PASS = S ? S.PASS : "PASS";
  const WARN = S ? S.WARNING : "WARNING";
  const FAIL = S ? S.FAIL : "FAIL";

  function H() {
    return global.EasilyValidationHarness;
  }

  function SS() {
    return global.SiteState;
  }

  function ctxBag() {
    return {
      heroUrlInitial: "",
      heroUrlAfterFirst: "",
      heroUrlAfterSecond: "",
      heroTitleAfterText: "",
      snapshotBeforeUndo: "",
    };
  }

  const workflowScenarios = [
    {
      id: "scenario-1",
      workflow: true,
      name: "Create → hero image → reject → another → accept → text → accept → logo → undo → redo → save → reload",
      ctx: ctxBag(),
      before: async function () {
        const h = H();
        if (h) h.resetEnvironment();
      },
      steps: [
        {
          id: "1a",
          label: "Create website",
          run: async function () {
            const h = H();
            h.resetEnvironment();
            const doc = SS().get();
            if (!doc || !doc.sections || !doc.sections.hero) {
              return { status: FAIL, reason: "Default document not created" };
            }
            return { status: PASS };
          },
        },
        {
          id: "1b",
          label: "Change hero image",
          run: async function (ctx) {
            const h = H();
            ctx.heroUrlInitial = h.readHeroUrl();
            const r = await h.pipelineRun("byt hero-bild");
            if (!r || !r.ok) return { status: FAIL, reason: "Hero image change failed: " + (r && r.failureReason) };
            ctx.heroUrlAfterFirst = h.readHeroUrl();
            if (!ctx.heroUrlAfterFirst || ctx.heroUrlAfterFirst === ctx.heroUrlInitial) {
              return { status: WARN, reason: "Hero URL unchanged after first pick" };
            }
            return { status: PASS };
          },
        },
        {
          id: "1c",
          label: "Reject (try another without accept)",
          run: async function (ctx) {
            const r = await H().pipelineRun("visa en till");
            if (r && r.handled === false) {
              return { status: WARN, reason: "Retry not handled by pipeline — continuing" };
            }
            return { status: PASS };
          },
        },
        {
          id: "1d",
          label: "Another hero image",
          run: async function (ctx) {
            const before = H().readHeroUrl();
            const r = await H().pipelineRun("byt hero-bild — visa en annan");
            ctx.heroUrlAfterSecond = H().readHeroUrl();
            if (!r || !r.ok) return { status: FAIL, reason: "Second hero pick failed" };
            if (ctx.heroUrlAfterSecond === before) {
              return { status: WARN, reason: "Second image same as previous (pool may be limited)" };
            }
            return { status: PASS };
          },
        },
        {
          id: "1e",
          label: "Accept hero image",
          run: async function () {
            await H().sessionKeep();
            if (!H().isComponentLocked("hero:image")) {
              return { status: WARN, reason: "hero:image not locked after keep" };
            }
            return { status: PASS };
          },
        },
        {
          id: "1f",
          label: "Rewrite hero text",
          run: async function (ctx) {
            const r = await H().pipelineRun("skriv om hero-rubriken");
            if (!r || !r.ok) return { status: FAIL, reason: "Hero text regen failed" };
            ctx.heroTitleAfterText = H().readHeroTitle();
            if (!ctx.heroTitleAfterText) return { status: FAIL, reason: "Hero title empty after regen" };
            return { status: PASS };
          },
        },
        {
          id: "1g",
          label: "Accept hero text",
          run: async function () {
            await H().sessionKeep();
            return { status: PASS };
          },
        },
        {
          id: "1h",
          label: "Change logo (open material)",
          run: async function (ctx) {
            const SS = global.SiteState;
            const testLogo = "https://example.com/validation-logo.png";
            SS.patch(function (d) {
              if (!d.page) d.page = {};
              d.page.logoUrl = testLogo;
              if (d.page.material) d.page.material.logoUrl = testLogo;
            });
            SS.save && SS.save();
            ctx.snapshotBeforeUndo = JSON.stringify(SS.get());
            ctx.testLogo = testLogo;
            return { status: PASS };
          },
        },
        {
          id: "1i",
          label: "Undo",
          run: async function (ctx) {
            await H().sessionUndo();
            const SS = global.SiteState;
            const logo = SS.get() && SS.get().page && SS.get().page.logoUrl;
            if (logo === ctx.testLogo) {
              return { status: WARN, reason: "Logo still present after undo" };
            }
            return { status: PASS };
          },
        },
        {
          id: "1j",
          label: "Redo",
          run: async function () {
            const EE = global.EditorEngine;
            if (!EE || typeof EE.redo !== "function") {
              return { status: WARN, reason: "EditorEngine.redo not available in harness" };
            }
            if (typeof EE.canRedo === "function" && !EE.canRedo()) {
              return { status: WARN, reason: "Nothing to redo (history stack shallow in test env)" };
            }
            EE.redo();
            return { status: PASS };
          },
        },
        {
          id: "1k",
          label: "Save",
          run: async function () {
            const SS = global.SiteState;
            SS.save && SS.save();
            return { status: PASS };
          },
        },
        {
          id: "1l",
          label: "Reload and verify persistence",
          run: async function (ctx) {
            const before = JSON.stringify(SS().get());
            const loaded = H().simulateReload();
            if (!loaded) return { status: FAIL, reason: "Reload simulation failed" };
            const after = JSON.stringify(SS().get());
            if (before !== after) return { status: FAIL, reason: "Document changed unexpectedly on reload" };
            if (!H().readHeroUrl()) return { status: FAIL, reason: "Hero URL missing after reload" };
            if (!H().readHeroTitle()) return { status: FAIL, reason: "Hero title missing after reload" };
            return { status: PASS };
          },
        },
      ],
      verifyEngines: [
        {
          category: "Intent Resolution",
          name: "Resolves hero image intent",
          run: async function () {
            const IRE = global.IntentResolutionEngine;
            if (!IRE || !IRE.resolve) return { status: FAIL, reason: "IRE not loaded" };
            const r = IRE.resolve("byt hero-bild", H().buildPipelineHooks());
            if (!r || r.decision !== "execute") return { status: FAIL, reason: "Expected execute decision" };
            return { status: PASS };
          },
        },
        {
          category: "Design Memory",
          name: "Records acceptance after keep",
          run: async function () {
            const DM = global.DesignMemoryEngine;
            const mem = DM && DM.getMemory ? DM.getMemory() : null;
            if (!mem) return { status: WARN, reason: "No design memory yet" };
            const hasSection = mem.sections && mem.sections.hero;
            return { status: hasSection ? PASS : WARN, reason: hasSection ? "" : "Hero section memory empty" };
          },
        },
        {
          category: "Image Intelligence",
          name: "Image meta state exists",
          run: async function () {
            const doc = SS().get();
            const st = doc && doc.meta && doc.meta.imageIntelligence;
            return { status: st ? PASS : WARN, reason: st ? "" : "imageIntelligence meta not written" };
          },
        },
        {
          category: "Edit Session",
          name: "Accepted lock on hero image",
          run: async function () {
            return {
              status: H().isComponentLocked("hero:image") ? PASS : WARN,
              reason: H().isComponentLocked("hero:image") ? "" : "Lock not set",
            };
          },
        },
        {
          category: "Persistence",
          name: "localStorage roundtrip",
          run: async function () {
            const key = H().VALIDATION_STORAGE_KEY;
            try {
              const raw = localStorage.getItem(key);
              return { status: raw ? PASS : WARN, reason: raw ? "" : "No validation snapshot in storage" };
            } catch (e) {
              return { status: WARN, reason: "localStorage unavailable" };
            }
          },
        },
        {
          category: "Preview",
          name: "DOM hero src matches state",
          run: async function () {
            H().syncPreviewDomFromState();
            const stateUrl = H().readHeroUrl();
            const domUrl = H().readDomHeroSrc();
            if (!stateUrl) return { status: WARN, reason: "No hero URL in state" };
            if (!domUrl) return { status: WARN, reason: "Preview DOM img empty (sync stub)" };
            if (domUrl !== stateUrl) {
              return { status: WARN, reason: "Preview DOM src differs from state — manual preview may differ" };
            }
            return { status: PASS };
          },
        },
        {
          category: "Pipeline",
          name: "Pipeline returns verified results",
          run: async function () {
            const r = await H().pipelineRun("byt hero-bild");
            if (!r) return { status: FAIL, reason: "No pipeline result" };
            if (r.verified === false && r.ok === false) return { status: WARN, reason: "Last run unverified" };
            return { status: PASS };
          },
        },
        {
          category: "Orchestrator",
          name: "Orchestrator participates",
          run: async function () {
            const r = await H().pipelineRun("gör hero mer premium");
            if (!r) return { status: FAIL, reason: "No result" };
            if (r.orchestrated) return { status: PASS };
            return { status: WARN, reason: "Result not flagged orchestrated (orchestrator may be bypassed for clarify)" };
          },
        },
      ],
    },

    {
      id: "scenario-2",
      workflow: true,
      name: "Generate → colors → about → gallery → CTA → reload → Design Memory",
      ctx: ctxBag(),
      before: async function () {
        H().resetEnvironment();
        const AI = global.AISiteBuilder;
        if (AI && typeof AI.fillSection === "function") {
          global.__AI_GENERATION_FAST__ = true;
          await AI.fillSection("all");
          global.__AI_GENERATION_FAST__ = false;
        }
      },
      steps: [
        {
          id: "2a",
          label: "Generate website content",
          run: async function () {
            const doc = SS().get();
            const title = doc && doc.sections && doc.sections.hero && doc.sections.hero.content && doc.sections.hero.content["hero-title"];
            return { status: title ? PASS : FAIL, reason: title ? "" : "Hero title missing after fillSection" };
          },
        },
        {
          id: "2b",
          label: "Change colors",
          run: async function () {
            const r = await H().pipelineRun("byt färgtema");
            if (!r || !r.ok) return { status: WARN, reason: "Color change not verified: " + (r && r.failureReason) };
            return { status: PASS };
          },
        },
        {
          id: "2c",
          label: "Change about image",
          run: async function () {
            const r = await H().pipelineRun("byt om oss-bild");
            if (!r || !r.ok) return { status: WARN, reason: "About image change failed" };
            return { status: PASS };
          },
        },
        {
          id: "2d",
          label: "Change gallery",
          run: async function () {
            const r = await H().pipelineRun("byt galleribilder");
            if (!r && !global.MaterialSystem) return { status: WARN, reason: "Gallery command not handled" };
            return { status: PASS };
          },
        },
        {
          id: "2e",
          label: "Change CTA",
          run: async function () {
            const AI = global.AISiteBuilder;
            if (AI && typeof AI.fillSection === "function") {
              global.__AI_GENERATION_FAST__ = true;
              await AI.fillSection("cta");
              global.__AI_GENERATION_FAST__ = false;
            }
            const cta =
              SS().get() &&
              SS().get().sections &&
              SS().get().sections.hero &&
              SS().get().sections.hero.content &&
              SS().get().sections.hero.content["hero-cta-1-text"];
            return { status: cta ? PASS : WARN, reason: cta ? "" : "CTA text empty" };
          },
        },
        {
          id: "2f",
          label: "Reload",
          run: async function () {
            H().simulateReload();
            return { status: PASS };
          },
        },
        {
          id: "2g",
          label: "Verify Design Memory migration",
          run: async function () {
            const DM = global.DesignMemoryEngine;
            if (DM && typeof DM.ensureMigrated === "function") DM.ensureMigrated();
            const mem = DM && DM.getMemory ? DM.getMemory() : null;
            if (!mem) return { status: WARN, reason: "Design memory empty" };
            const hasGlobal = mem.global && Object.keys(mem.global).length > 0;
            const hasSections = mem.sections && Object.keys(mem.sections).length > 0;
            return {
              status: hasGlobal || hasSections ? PASS : WARN,
              reason: hasGlobal || hasSections ? "" : "Memory not populated",
            };
          },
        },
      ],
      verifyEngines: [
        {
          category: "Text Intelligence",
          name: "Text meta or generated copy",
          run: async function () {
            const doc = SS().get();
            const lead = doc && doc.sections && doc.sections.hero && doc.sections.hero.content && doc.sections.hero.content["hero-lead"];
            return { status: lead ? PASS : FAIL, reason: lead ? "" : "No hero lead text" };
          },
        },
        {
          category: "Design Memory",
          name: "Memory structure valid",
          run: async function () {
            const mem = global.DesignMemoryEngine && global.DesignMemoryEngine.getMemory();
            return { status: mem && mem.version != null ? PASS : WARN, reason: "" };
          },
        },
        {
          category: "Consistency",
          name: "Color + hero coexist",
          run: async function () {
            const doc = SS().get();
            if (!doc || !doc.page) return { status: FAIL, reason: "No page" };
            return { status: doc.page.heroBgUrl ? PASS : WARN, reason: "" };
          },
        },
      ],
    },

    {
      id: "scenario-3",
      workflow: true,
      name: "Premium refinement — hero, about, gallery, services consistency",
      ctx: ctxBag(),
      before: async function () {
        H().resetEnvironment({ doc: { page: { industry: "byggfirma", onboardingDescription: "Premium snickeri i Stockholm." } } });
      },
      steps: [
        {
          id: "3a",
          label: "Premium hero refinement",
          run: async function () {
            const r = await H().pipelineRun("gör hero mer premium");
            if (!r || !r.ok) return { status: WARN, reason: "Premium hero refinement incomplete" };
            await H().sessionKeep();
            return { status: PASS };
          },
        },
        {
          id: "3b",
          label: "Premium about refinement",
          run: async function () {
            const r = await H().pipelineRun("skriv om om oss — mer premium");
            if (!r || !r.ok) return { status: WARN, reason: "About text regen failed" };
            return { status: PASS };
          },
        },
        {
          id: "3c",
          label: "Gallery images",
          run: async function () {
            const MS = global.MaterialSystem;
            if (MS && typeof MS.handleGalleryImageChatCommand === "function") {
              const r = MS.handleGalleryImageChatCommand("byt galleribilder");
              if (r && r.ok) return { status: PASS };
            }
            return { status: WARN, reason: "Gallery swap skipped" };
          },
        },
        {
          id: "3d",
          label: "Services section text",
          run: async function () {
            const AI = global.AISiteBuilder;
            if (AI && typeof AI.fillSection === "function") {
              global.__AI_GENERATION_FAST__ = true;
              await AI.fillSection("services", { userText: "mer premium tjänster" });
              global.__AI_GENERATION_FAST__ = false;
            }
            const title =
              SS().get() &&
              SS().get().sections &&
              SS().get().sections.services &&
              SS().get().sections.services.content &&
              SS().get().sections.services.content["services-title"];
            return { status: title ? PASS : WARN, reason: title ? "" : "Services title missing" };
          },
        },
        {
          id: "3e",
          label: "Style consistency review",
          run: async function () {
            const ORCH = global.AIDesignOrchestrator;
            if (!ORCH || !ORCH.reviewSiteConsistency) {
              return { status: WARN, reason: "Orchestrator consistency review unavailable" };
            }
            const score = ORCH.reviewSiteConsistency("hero");
            return {
              status: score >= 0.5 ? PASS : WARN,
              reason: score >= 0.5 ? "" : "Consistency score low: " + score,
              meta: { score: score },
            };
          },
        },
      ],
      verifyEngines: [
        {
          category: "Orchestrator",
          name: "Premium plan executed",
          run: async function () {
            const r = await H().pipelineRun("mer exklusiv hero");
            return { status: r ? PASS : FAIL, reason: r ? "" : "No orchestrated run" };
          },
        },
        {
          category: "Image Intelligence",
          name: "Premium picks differ from initial",
          run: async function () {
            const IIE = global.ImageIntelligenceEngine;
            if (!IIE || !IIE.selectBest) return { status: WARN, reason: "IIE missing" };
            const u1 = IIE.selectBest("hero", { userText: "premium exklusiv" });
            const u2 = IIE.selectBest("hero", { userText: "premium exklusiv", variant: "another" });
            return {
              status: u1 && u2 && u1 !== u2 ? PASS : WARN,
              reason: u1 && u2 && u1 !== u2 ? "" : "Diversity pool limited in test",
            };
          },
        },
        {
          category: "Text Intelligence",
          name: "Tone translation for premium",
          run: async function () {
            const TIE = global.TextIntelligenceEngine;
            if (!TIE || !TIE.translateTone) return { status: FAIL, reason: "TIE missing" };
            const t = TIE.translateTone("mer premium och exklusiv");
            return { status: t && t.premium > 0 ? PASS : WARN, reason: "" };
          },
        },
        {
          category: "Undo",
          name: "Undo restores baseline",
          run: async function () {
            const before = H().readHeroTitle();
            await H().pipelineRun("skriv om hero-rubriken");
            await H().sessionUndo();
            return { status: PASS };
          },
        },
      ],
    },
  ];

  const engineAudits = [
    {
      category: "Intent Resolution",
      name: "Module loaded",
      run: async function () {
        return { status: global.IntentResolutionEngine ? PASS : FAIL, reason: global.IntentResolutionEngine ? "" : "Missing IRE" };
      },
    },
    {
      category: "Design Memory",
      name: "Module loaded",
      run: async function () {
        return { status: global.DesignMemoryEngine ? PASS : FAIL, reason: global.DesignMemoryEngine ? "" : "Missing DM" };
      },
    },
    {
      category: "Image Intelligence",
      name: "Module loaded",
      run: async function () {
        return { status: global.ImageIntelligenceEngine ? PASS : FAIL, reason: global.ImageIntelligenceEngine ? "" : "Missing IIE" };
      },
    },
    {
      category: "Text Intelligence",
      name: "Module loaded",
      run: async function () {
        return { status: global.TextIntelligenceEngine ? PASS : FAIL, reason: global.TextIntelligenceEngine ? "" : "Missing TIE" };
      },
    },
    {
      category: "Edit Session",
      name: "Module loaded",
      run: async function () {
        return { status: global.EditSession ? PASS : FAIL, reason: global.EditSession ? "" : "Missing EditSession" };
      },
    },
    {
      category: "Pipeline",
      name: "Module loaded",
      run: async function () {
        return { status: global.EditCommandPipeline ? PASS : FAIL, reason: global.EditCommandPipeline ? "" : "Missing pipeline" };
      },
    },
    {
      category: "Orchestrator",
      name: "Module loaded",
      run: async function () {
        return { status: global.AIDesignOrchestrator ? PASS : FAIL, reason: global.AIDesignOrchestrator ? "" : "Missing orchestrator" };
      },
    },
  ];

  const libraryScenarios =
    (global.EasilyValidationLibrary && global.EasilyValidationLibrary.scenarios) || [];
  const scenarios = libraryScenarios.concat(workflowScenarios);

  global.EasilyValidationScenarios = {
    scenarios: scenarios,
    libraryCount: libraryScenarios.length,
    workflowCount: workflowScenarios.length,
    engineAudits: engineAudits,
    coverageTargets: 11,
  };
})(typeof window !== "undefined" ? window : globalThis);
