/**
 * Validation harness — test environment for System Validation Engine.
 * Sets up document, DOM preview stubs, pipeline hooks. No UX changes.
 */
(function (global) {
  "use strict";

  const VALIDATION_STORAGE_KEY = "easily-validation-doc-v1";

  function ensurePreviewDom() {
    if (!document.getElementById("siteMain")) {
      const main = document.createElement("main");
      main.id = "siteMain";
      main.innerHTML =
        '<section class="site-hero" data-section="hero">' +
        '<div class="hero__media"><img src="" alt="" /></div>' +
        "</section>";
      document.body.appendChild(main);
    }
    if (!document.getElementById("siteFooter")) {
      const footer = document.createElement("footer");
      footer.id = "siteFooter";
      document.body.appendChild(footer);
    }
    if (!document.body.getAttribute("data-industry")) {
      document.body.setAttribute("data-industry", "verksamhet");
      document.body.setAttribute("data-template", "editorial");
      document.body.setAttribute("data-theme", "minimal-white");
    }
  }

  function shouldDeferPreviewRemount() {
    return (
      document.documentElement.dataset.studioCreateGeneration === "1" &&
      document.body.dataset.studioPreviewLive !== "1"
    );
  }

  let remountEpoch = 0;

  function cancelPendingRemounts() {
    remountEpoch++;
  }

  function mountProjectPreviewDom(doc) {
    ensurePreviewDom();
    const main = document.getElementById("siteMain");
    const footer = document.getElementById("siteFooter");
    if (!main) return;
    const heroTitle =
      doc && doc.sections && doc.sections.hero && doc.sections.hero.content
        ? String(doc.sections.hero.content["hero-title"] || "")
        : "";
    const heroUrl = doc && doc.page ? String(doc.page.heroBgUrl || "") : "";
    const aboutUrl =
      doc && doc.sections && doc.sections.about ? String(doc.sections.about.imageUrl || "") : "";
    main.innerHTML =
      '<section class="site-section site-hero" data-section="hero">' +
      '<div class="hero__media"><img class="hero-bg" src="' +
      heroUrl.replace(/"/g, "&quot;") +
      '" alt="" /></div>' +
      '<h1 data-editable="hero-title">' +
      heroTitle.replace(/</g, "&lt;") +
      "</h1>" +
      (aboutUrl
        ? '<section class="site-section site-about" data-section="about"><img src="' +
          aboutUrl.replace(/"/g, "&quot;") +
          '" alt="" /></section>'
        : "") +
      "</section>";
    if (footer) {
      footer.innerHTML =
        '<div class="site-footer" data-section="footer">' +
        '<span data-editable="footer-brand">' +
        (doc && doc.sections && doc.sections.footer && doc.sections.footer.content
          ? String(doc.sections.footer.content["footer-brand"] || "")
          : ""
        ).replace(/</g, "&lt;") +
        "</span></div>";
    }
    if (doc && doc.page) {
      if (doc.page.industry) document.body.setAttribute("data-industry", doc.page.industry);
      if (doc.page.theme) document.body.setAttribute("data-theme", doc.page.theme);
      if (doc.page.template) document.body.setAttribute("data-template", doc.page.template);
    }
    document.body.dataset.studioPreview = "site";
    document.body.dataset.studioPreviewLive = "1";
  }

  function scanPreviewDomForNeedles(needles) {
    const hits = [];
    const main = document.getElementById("siteMain");
    const footer = document.getElementById("siteFooter");
    const chunks = [];
    if (main) chunks.push(main.innerHTML, main.textContent || "");
    if (footer) chunks.push(footer.innerHTML, footer.textContent || "");
    chunks.push(
      document.body.getAttribute("data-industry") || "",
      document.body.getAttribute("data-theme") || "",
      document.body.getAttribute("data-template") || "",
    );
    main &&
      main.querySelectorAll("img[src]").forEach(function (img) {
        chunks.push(img.getAttribute("src") || "");
      });
    const haystack = chunks.join("\n");
    (needles || []).forEach(function (needle) {
      if (needle && haystack.indexOf(needle) >= 0) hits.push(needle);
    });
    return hits;
  }

  function simulateFreshCreateProgress(stepIndex) {
    document.body.classList.add("studio-shell--generating");
    document.body.dataset.studioPreview = "loading";
    document.documentElement.dataset.studioPreviewPending = "1";
    const freshCreate = document.documentElement.dataset.studioCreateGeneration === "1";
    if (freshCreate || stepIndex < 1) {
      delete document.body.dataset.studioPreviewLive;
    } else {
      document.body.dataset.studioPreviewLive = "1";
    }
  }

  function ensureEditorHistory() {
    const EE = global.EditorEngine;
    if (!EE || typeof EE.pushHistory !== "function") {
      const stack = [];
      global.EditorEngine = {
        pushHistory: function () {
          const SS = global.SiteState;
          if (SS && SS.get) stack.push(JSON.stringify(SS.get()));
        },
        canUndo: function () {
          return stack.length > 1;
        },
        canRedo: function () {
          return false;
        },
        undo: function () {
          const SS = global.SiteState;
          if (stack.length > 1 && SS && SS.replace) {
            stack.pop();
            SS.replace(JSON.parse(stack[stack.length - 1]));
          }
        },
        redo: function () {},
        cancelPendingRemounts: cancelPendingRemounts,
        remount: function (force) {
          if (!force && shouldDeferPreviewRemount()) return;
          syncPreviewDomFromState();
          if (global.GenerationLifecycle && typeof global.GenerationLifecycle.log === "function") {
            global.GenerationLifecycle.log("DOM_RENDERED", {
              sections: document.querySelectorAll("#siteMain .site-section").length,
            });
          }
        },
        remountAsync: async function (force) {
          if (!force && shouldDeferPreviewRemount()) return;
          syncPreviewDomFromState();
          if (global.GenerationLifecycle && typeof global.GenerationLifecycle.log === "function") {
            global.GenerationLifecycle.log("DOM_RENDERED", {
              sections: document.querySelectorAll("#siteMain .site-section").length,
            });
          }
        },
        remountAsyncForced: async function () {
          syncPreviewDomFromState();
          if (global.GenerationLifecycle && typeof global.GenerationLifecycle.log === "function") {
            global.GenerationLifecycle.log("DOM_RENDERED", {
              sections: document.querySelectorAll("#siteMain .site-section").length,
            });
          }
        },
      };
      return;
    }
    if (typeof EE.pushHistory === "function") {
      try {
        EE.pushHistory({ force: true });
      } catch (e) {
        /* ignore */
      }
    }
  }

  function syncPreviewDomFromState() {
    const SS = global.SiteState;
    const doc = SS && SS.get ? SS.get() : null;
    if (!doc) return;
    const main = document.getElementById("siteMain");
    if (main && !main.querySelector(".site-section")) {
      mountProjectPreviewDom(doc);
      return;
    }
    const img = document.querySelector("#siteMain .site-hero img, #siteMain [data-section='hero'] img");
    if (img && doc.page && doc.page.heroBgUrl) {
      img.setAttribute("src", doc.page.heroBgUrl);
    }
    const titleEl = document.querySelector("#siteMain [data-editable='hero-title'], #siteMain h1");
    const heroTitle =
      doc.sections && doc.sections.hero && doc.sections.hero.content
        ? String(doc.sections.hero.content["hero-title"] || "")
        : "";
    if (titleEl && heroTitle) titleEl.textContent = heroTitle;
  }

  function createTestDocument(overrides) {
    const AD = global.AppDocument;
    const base = AD && typeof AD.createDefaultDocument === "function" ? AD.createDefaultDocument() : { page: {}, sections: {}, meta: {} };
    if (overrides) {
      Object.keys(overrides).forEach(function (k) {
        base[k] = overrides[k];
      });
    }
    if (base.page) {
      base.page.onboardingDescription =
        base.page.onboardingDescription || "Snickare i Hudiksvall som heter Nordträ. Vi erbjuder kök, altan och renovering.";
      base.page.industry = base.page.industry || "byggfirma";
    }
    return AD && typeof AD.normalize === "function" ? AD.normalize(base) : base;
  }

  function resetEnvironment(opts) {
    opts = opts || {};
    ensurePreviewDom();
    if (global.ProjectIsolation && typeof global.ProjectIsolation.beginNewProject === "function") {
      const doc = global.ProjectIsolation.beginNewProject({
        document: createTestDocument(opts.doc),
        source: "validation-harness",
        skipPreviewClear: false,
      });
      ensureEditorHistory();
      syncPreviewDomFromState();
      return doc;
    }
    const doc = createTestDocument(opts.doc);
    const SS = global.SiteState;
    if (SS && typeof SS.replace === "function") {
      SS.replace(doc);
    }
    if (SS && typeof SS.save === "function") {
      try {
        SS.save();
      } catch (e) {
        /* ignore */
      }
    }
    const ES = global.EditSession;
    if (ES && typeof ES.resetSession === "function") {
      ES.resetSession();
    }
    const DM = global.DesignMemoryEngine;
    if (DM && typeof DM.ensureMigrated === "function") {
      DM.ensureMigrated();
    }
    ensureEditorHistory();
    syncPreviewDomFromState();
    return doc;
  }

  function simulateReload() {
    const SS = global.SiteState;
    if (!SS || !SS.get || !SS.replace) return null;
    const serialized = JSON.stringify(SS.get());
    try {
      localStorage.setItem(VALIDATION_STORAGE_KEY, serialized);
    } catch (e) {
      /* ignore */
    }
    let loaded = null;
    try {
      loaded = JSON.parse(localStorage.getItem(VALIDATION_STORAGE_KEY) || serialized);
    } catch (e2) {
      loaded = JSON.parse(serialized);
    }
    SS.replace(loaded);
    syncPreviewDomFromState();
    return loaded;
  }

  function normalizeCmd(text) {
    return String(text || "")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, " ");
  }

  function validationLooksLikeImageRequest(text) {
    const raw = String(text || "").trim();
    const s = normalizeCmd(text);
    const GI = global.GenerationIntegrity;
    if (GI && typeof GI.looksLikeImageOnlyChat === "function" && GI.looksLikeImageOnlyChat(raw)) {
      return true;
    }
    if (/(om oss|about|galleri|gallery|tjänst|tjanst|service)/.test(s) && /(bild|foto|bilder)/.test(s)) {
      return false;
    }
    if (/(lägg|sätt|byt|ändra|kan du|kan ni|gör|ge mig|lägga in|uppdatera|fixa|skapa|spara).*(bild|foto|hero)/.test(s)) {
      return true;
    }
    if (/(bild|foto|hero).*(lägg|sätt|byt|ändra|in|snickare|hammare|bakgrund|hantverk|galleri|kort)/.test(s)) {
      return true;
    }
    if (/hero-bild|bakgrundsbild|ny bild|byt bild|herobild|herobilden/.test(s)) return true;
    if (/bild.*med|med.*bild|foto.*med/.test(s) && /(lägg|sätt|byt|kan|gör|ge|fixa|uppdatera|in)/.test(s)) {
      return true;
    }
    if (/(snickare|hammare|hantverk|bygg|snick)/.test(s) && /(bild|foto|hero)/.test(s)) return true;
    if (/^(en|ett)\s+bild\b/.test(s)) return true;
    if (/^bild\s+(allts[aå]|alltsp|alltså|tack|snälla|snalla)?\.?$/i.test(raw)) return true;
    return false;
  }

  function validationLooksLikeColorChangeRequest(text) {
    const s = normalizeCmd(text);
    if (!s) return false;
    if (/^(byt|ändra|väl|välj|change)\s+(färg|färger|färgtema|palett|färguppsättning)/.test(s)) return true;
    if (/färgerna|färgtema|färguppsättning|färgschema/.test(s) && /(byt|ändra|väl|välj|annan|ny|mörk|ljus|ljusare)/.test(s)) {
      return true;
    }
    return false;
  }

  function validationResolveLegacyIntent(text) {
    const cmd = normalizeCmd(text);
    if (/(om oss|about)/.test(cmd) && /(bild|foto)/.test(cmd)) {
      return { type: "legacy", target: "about.image", command: text, meta: { materialImage: "about" } };
    }
    if (/(galleri|gallery)/.test(cmd) && /(bild|foto|bilder)/.test(cmd)) {
      return { type: "legacy", target: "gallery.image", command: text, meta: { materialImage: "gallery" } };
    }
    if (/(tjänst|tjanst|service)/.test(cmd) && /(bild|foto)/.test(cmd)) {
      return { type: "legacy", target: "services.image", command: text, meta: { materialImage: "services" } };
    }
    return null;
  }

  function buildPipelineHooks() {
    const MS = global.MaterialSystem;
    const WF = global.WelcomeFlow;
    if (WF && typeof WF.buildPipelineHooks === "function") {
      return WF.buildPipelineHooks();
    }
    return {
      rememberUserImageRequest: function () {},
      looksLikeImageRequest: validationLooksLikeImageRequest,
      looksLikeColorChangeRequest: validationLooksLikeColorChangeRequest,
      looksLikeImageRetry: function (text) {
        const s = normalizeCmd(text);
        return /^(pröva|prova|försök|forsok|try)\s+(igen|om|på nytt|pa nytt)|^igen$|^retry$/.test(s);
      },
      looksLikeMissingHeroImageComplaint: function () {
        return false;
      },
      looksLikeWrongHeroImageFeedback: function () {
        return false;
      },
      looksLikeUserCorrection: function () {
        return false;
      },
      looksLikeFullRebuildRequest: function () {
        return false;
      },
      looksLikeBusinessRebrief: function () {
        return false;
      },
      shouldAdaptIndustry: function (text) {
        const GI = global.GenerationIntegrity;
        if (GI && typeof GI.looksLikeImageOnlyChat === "function" && GI.looksLikeImageOnlyChat(text)) {
          return false;
        }
        if (validationLooksLikeImageRequest(text)) return false;
        if (GI && typeof GI.isValidBusinessBrief === "function") {
          return GI.isValidBusinessBrief(text);
        }
        return false;
      },
      resolveLegacyIntent: validationResolveLegacyIntent,
      executeHeroImage: async function (text) {
        if (MS && typeof MS.applyHeroStockImage === "function") {
          return MS.applyHeroStockImage(text);
        }
        return false;
      },
      heroPipelineOk: function (url) {
        return !!url;
      },
      applyColorChange: async function () {
        const SS = global.SiteState;
        if (!SS || !SS.patch) return { ok: false };
        SS.patch(function (d) {
          if (!d.page) d.page = {};
          d.page.designColorSetId = d.page.designColorSetId === "forest" ? "ocean" : "forest";
        });
        SS.save && SS.save();
        syncPreviewDomFromState();
        return { ok: true, label: "Test palette" };
      },
      noteImageRequestHandled: function () {},
      noteAssistantAction: function () {},
      runLegacyHandler: async function (intent, text) {
        const MS = global.MaterialSystem;
        const cmd = text || (intent && intent.command) || "";
        let r = null;
        if (MS && typeof MS.handleMaterialChatCommand === "function") {
          r = MS.handleMaterialChatCommand(cmd);
        }
        if ((!r || r.ok === false) && MS && intent && intent.target === "about.image") {
          if (typeof MS.handleAboutImageChatCommand === "function") {
            r = MS.handleAboutImageChatCommand(cmd);
          }
        }
        if ((!r || r.ok === false) && MS && intent && intent.target === "gallery.image") {
          if (typeof MS.handleGalleryImageChatCommand === "function") {
            r = MS.handleGalleryImageChatCommand(cmd);
          }
        }
        syncPreviewDomFromState();
        const EE = global.EditorEngine;
        if (EE && EE.remount) EE.remount();
        const target = (intent && intent.target) || "legacy";
        const ok = !!(r && r.ok !== false);
        return {
          handled: true,
          ok: ok,
          verified: ok,
          action: target,
          requestedTarget: target,
          message: (r && r.message) || "",
        };
      },
      getConversationSignals: function () {
        return {};
      },
    };
  }

  async function pipelineRun(text) {
    const CP = global.EditCommandPipeline;
    if (!CP || typeof CP.run !== "function") {
      return { handled: false, ok: false, failureReason: "no_pipeline" };
    }
    return CP.run(text, buildPipelineHooks());
  }

  async function sessionKeep() {
    const CP = global.EditCommandPipeline;
    if (CP && typeof CP.run === "function") {
      const r = await CP.run("__keep__", buildPipelineHooks());
      if (r && (r.action === "session.keep" || r.ok)) return r;
    }
    const ES = global.EditSession;
    if (ES && typeof ES.handleKeep === "function") {
      return ES.handleKeep();
    }
    return null;
  }

  async function sessionUndo() {
    const CP = global.EditCommandPipeline;
    if (CP && typeof CP.run === "function") {
      const r = await CP.run("__undo__", buildPipelineHooks());
      if (r && (r.action === "session.undo" || r.ok)) return r;
    }
    const ES = global.EditSession;
    if (ES && typeof ES.handleUndo === "function") {
      return ES.handleUndo();
    }
    return null;
  }

  function readDomHeroSrc() {
    const img = document.querySelector("#siteMain .site-hero img, #siteMain [data-section='hero'] img");
    return img ? String(img.getAttribute("src") || "") : "";
  }

  function readHeroUrl() {
    const SS = global.SiteState;
    const doc = SS && SS.get ? SS.get() : null;
    return doc && doc.page ? String(doc.page.heroBgUrl || "") : "";
  }

  function readHeroTitle() {
    const SS = global.SiteState;
    const doc = SS && SS.get ? SS.get() : null;
    return doc && doc.sections && doc.sections.hero && doc.sections.hero.content
      ? String(doc.sections.hero.content["hero-title"] || "")
      : "";
  }

  function readAboutUrl() {
    const SS = global.SiteState;
    const doc = SS && SS.get ? SS.get() : null;
    return doc && doc.sections && doc.sections.about ? String(doc.sections.about.imageUrl || "") : "";
  }

  function readGalleryUrls() {
    const SS = global.SiteState;
    const doc = SS && SS.get ? SS.get() : null;
    const imgs = doc && doc.sections && doc.sections.gallery && doc.sections.gallery.images;
    return Array.isArray(imgs) ? imgs.filter(Boolean) : [];
  }

  function readSectionField(section, key) {
    const SS = global.SiteState;
    const doc = SS && SS.get ? SS.get() : null;
    if (!doc || !doc.sections || !doc.sections[section]) return "";
    return String((doc.sections[section].content || {})[key] || "").trim();
  }

  async function resolveIntent(text) {
    const IRE = global.IntentResolutionEngine;
    if (!IRE || !IRE.resolve) return null;
    return IRE.resolve(text, buildPipelineHooks());
  }

  async function legacyRun(intent, text) {
    const hooks = buildPipelineHooks();
    if (hooks.runLegacyHandler) {
      return hooks.runLegacyHandler(intent, text);
    }
    return null;
  }

  function isComponentLocked(key) {
    const ES = global.EditSession;
    return ES && typeof ES.isComponentLocked === "function" ? ES.isComponentLocked(key) : false;
  }

  global.EasilyValidationHarness = {
    VALIDATION_STORAGE_KEY: VALIDATION_STORAGE_KEY,
    ensurePreviewDom: ensurePreviewDom,
    ensureEditorHistory: ensureEditorHistory,
    resetEnvironment: resetEnvironment,
    simulateReload: simulateReload,
    buildPipelineHooks: buildPipelineHooks,
    pipelineRun: pipelineRun,
    sessionKeep: sessionKeep,
    sessionUndo: sessionUndo,
    syncPreviewDomFromState: syncPreviewDomFromState,
    mountProjectPreviewDom: mountProjectPreviewDom,
    scanPreviewDomForNeedles: scanPreviewDomForNeedles,
    simulateFreshCreateProgress: simulateFreshCreateProgress,
    shouldDeferPreviewRemount: shouldDeferPreviewRemount,
    readHeroUrl: readHeroUrl,
    readHeroTitle: readHeroTitle,
    readAboutUrl: readAboutUrl,
    readGalleryUrls: readGalleryUrls,
    readSectionField: readSectionField,
    readDomHeroSrc: readDomHeroSrc,
    resolveIntent: resolveIntent,
    legacyRun: legacyRun,
    isComponentLocked: isComponentLocked,
    createTestDocument: createTestDocument,
  };
})(typeof window !== "undefined" ? window : globalThis);
