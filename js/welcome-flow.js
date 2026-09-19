/**
 * Enkel skapa-chatt vänster, live-förhandsvisning höger.
 */
(function (global) {
  "use strict";

  try {
    if (new URL(window.location.href).searchParams.get("new") === "1") {
      document.documentElement.dataset.studioPreviewPending = "1";
    }
  } catch (e) {
    /* ignore */
  }

  const STORAGE_KEY = "studioPremiumWelcomeV1";
  const GENERATION_TIMEOUT_MS = 45000;
  const PROGRESS_STEPS = [
    "Tolkar verksamheten…",
    "Skapar sidstruktur…",
    "Skriver innehåll…",
    "Bygger förhandsvisning…",
  ];

  const CREATE_WELCOME_MSG = "Vilken typ av webbplats vill du skapa?";
  const CREATE_AFTER_TYPE_MSG =
    "Steg 2: verksamhet och innehåll. Steg 3: designstil. Steg 4: färger. Steg 5: befintlig webbplats.";
  const CREATE_BUSINESS_NAME_PLACEHOLDER = "Exempel: Snickare Kalle AB";
  const CREATE_BUSINESS_DESCRIPTION_PLACEHOLDER = "Beskriv kort vad ditt företag gör.";
  const CREATE_EXISTING_URL_PLACEHOLDER = "https://www.dittforetag.se";
  const EDIT_WELCOME_MSG = "Hej! Jag är din webbdesigner — skriv vad du vill ändra.";
  const EDIT_PLACEHOLDER = "Skriv här…";

  /** Övergripande webbplatstyp (steg 1) — bransch kommer senare via fri beskrivning. */
  const SITE_TYPE_AREAS = {
    foretag: "services",
    portfolio: "creative",
    webbutik: "shop",
    restaurang: "food",
    ovrigt: "other",
  };

  const SITE_TYPE_LABELS = {
    foretag: "Företag / Tjänster",
    portfolio: "Portfolio",
    webbutik: "Webbutik",
    restaurang: "Restaurang / Café",
    ovrigt: "Övrigt",
  };

  /** Valbart innehåll i företagsfrågan (hero + footer ingår alltid och visas inte här). */
  const CREATE_ALWAYS_SECTIONS = [
    { id: "hero", label: "Hero" },
    { id: "footer", label: "Footer" },
  ];

  const CREATE_OPTIONAL_SECTIONS = [
    { id: "about", label: "Om oss", defaultChecked: false },
    { id: "services", label: "Tjänster", defaultChecked: false },
    { id: "gallery", label: "Galleri", defaultChecked: false },
    { id: "contact", label: "Kontakt", defaultChecked: false },
  ];

  /** Steg 3 — fem enkla önskemål. Designvärldarna väljs inne i AI-motorn. */
  const CREATE_DESIGN_STYLES = [
    {
      id: "fri-designvarld",
      letter: "A",
      title: "Låt AI:n välja",
      description: "AI-designern väljer en unik riktning utifrån verksamheten.",
    },
    {
      id: "ljust-luftigt",
      letter: "B",
      title: "Ljust & luftigt",
      description: "Gott om rymd, tydlighet och ett lätt uttryck.",
    },
    {
      id: "varmt-personligt",
      letter: "C",
      title: "Varmt & personligt",
      description: "Mjuka möten, närhet och en mänsklig känsla.",
    },
    {
      id: "morkt-dramatiskt",
      letter: "D",
      title: "Mörkt & dramatiskt",
      description: "Djup, spänning och tydlig visuell kontrast.",
    },
    {
      id: "djarvt-kreativt",
      letter: "E",
      title: "Djärvt & kreativt",
      description: "Oväntad komposition, energi och ett starkt uttryck.",
    },
  ];

  /** Steg 5 — befintlig webbplats (UI only). */
  const CREATE_EXISTING_SITE_OPTIONS = [
    {
      id: "from-scratch",
      letter: "A",
      title: "Nej, skapa allt från grunden.",
      description: "AI skapar en helt ny webbplats.",
      needsUrl: false,
    },
    {
      id: "has-website",
      letter: "B",
      title: "Ja, jag har en webbplats.",
      description: "Ange webbadressen så att AI kan analysera innehållet och skapa en modern version.",
      needsUrl: true,
    },
    {
      id: "own-material",
      letter: "C",
      title: "Jag har inget ännu, men jag har texter och bilder.",
      description: "Jag vill använda mitt eget material senare.",
      needsUrl: false,
    },
  ];

  const CHAT_TIPS = {
    create: [
      "Steg 1–5: typ, företagsinformation och innehåll, designvärld, färger och befintligt material.",
      "Ingen logotyp? Easily skapar en tillfällig — ladda upp egen under Bilder & länkar.",
      "Ju tydligare du beskriver verksamheten, desto bättre blir sidan.",
    ],
    edit: [
      "Ingen uppladdad logotyp? En tillfällig logotyp visas högst upp — anpassad efter bransch.",
      "Klicka på text, en knapp, en länk eller en bild för att öppna rätt verktyg under Ändra själv.",
      "Skriv «prislista» så öppnas tabellverktyget — snabbare än att skriva priser i chatten.",
      "Egna bilder och logotyp laddar du upp under Bilder & länkar.",
    ],
  };

  let chatTipsTimer = null;
  let chatTipsIndex = 0;
  let createFlowStep = 1;

  function buildFlowCheckHtml(title, desc, dataAttrs) {
    dataAttrs = dataAttrs || "";
    const safeTitle = String(title || "")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;");
    const safeDesc = desc
      ? String(desc)
          .replace(/&/g, "&amp;")
          .replace(/"/g, "&quot;")
          .replace(/</g, "&lt;")
      : "";
    return (
      '<label class="studio-chat__type-check">' +
      '<input type="checkbox" class="studio-chat__flow-check-input" ' +
      dataAttrs +
      " />" +
      '<span class="studio-chat__type-check-box" aria-hidden="true"></span>' +
      '<span class="studio-chat__type-check-copy">' +
      '<span class="studio-chat__type-check-title">' +
      safeTitle +
      "</span>" +
      (safeDesc ? '<span class="studio-chat__type-check-desc">' + safeDesc + "</span>" : "") +
      "</span></label>"
    );
  }

  function setCreateFlowStep(step) {
    createFlowStep = step;
    document.body.dataset.createFlowStep = String(step);
    for (let i = 1; i <= 5; i++) {
      const el = document.getElementById("studioCreateStep" + i);
      if (el) el.hidden = i !== step;
    }
    const footer = document.querySelector(".studio-chat__footer");
    if (footer) footer.scrollTop = 0;
  }

  function bindCreateFlowConfirmButtons() {
    const map = [
      {
        id: "studioCreateConfirm1",
        validate: function () {
          return validateCreateFlowFields(["siteType"]);
        },
        advance: function () {
          renderCreateStyleChoices();
          renderCreateSectionChoices(getSelectedSiteType());
          renderCreateExistingSiteChoices();
          setCreateFlowStep(2);
          focusCreateBusinessName();
        },
      },
      {
        id: "studioCreateConfirm2",
        validate: function () {
          if (!validateCreateFlowFields(["businessName", "businessDescription"])) return false;
          syncCreateBusinessInfoHidden();
          return true;
        },
        advance: function () {
          setCreateFlowStep(3);
        },
      },
      {
        id: "studioCreateConfirm3",
        validate: function () {
          return validateCreateFlowFields(["designStyle"]);
        },
        advance: function () {
          renderCreateSectionChoices(getSelectedSiteType());
          setCreateFlowStep(4);
        },
      },
      {
        id: "studioCreateConfirm4",
        validate: function () {
          return validateCreateFlowFields(["sections"]);
        },
        advance: function () {
          setCreateFlowStep(5);
        },
      },
      {
        id: "studioCreateConfirm5",
        validate: function () {
          const check = validateCreateFlowComplete();
          if (!check.ok) {
            applyCreateFlowValidationErrors(check.errors);
            return false;
          }
          clearCreateFieldErrors();
          syncCreateExistingSiteHidden();
          return true;
        },
        advance: function () {
          return startCreateFlowGeneration();
        },
      },
    ];

    map.forEach(function (item) {
      const btn = document.getElementById(item.id);
      if (!btn || btn.dataset.bound === "1") return;
      btn.dataset.bound = "1";
      btn.addEventListener("click", async function () {
        if (!isCreateChatPhase()) return;
        if (!item.validate()) return;
        await Promise.resolve(item.advance());
      });
    });
  }

  function triggerCreateFlowConfirm() {
    const btn = document.getElementById("studioCreateConfirm" + createFlowStep);
    if (btn && !btn.disabled) btn.click();
  }

  function bindCreateFlowEnterKey() {
    if (document.body.dataset.createEnterBound === "1") return;
    document.body.dataset.createEnterBound = "1";
    document.addEventListener("keydown", function (e) {
      if (!isCreateChatPhase()) return;
      if (e.key !== "Enter" || e.isComposing) return;
      if (e.altKey) return;

      const active = document.activeElement;
      const tag = active && active.tagName ? active.tagName.toLowerCase() : "";
      if (tag === "button") return;

      if (tag === "textarea") {
        if (!(e.ctrlKey || e.metaKey)) return;
        e.preventDefault();
      } else {
        e.preventDefault();
      }

      triggerCreateFlowConfirm();
    });
  }

  /** Minns senaste bildbegäran och felaktig åtgärd (t.ex. färg i stället för hero). */
  const chatActionContext = {
    lastUserImageRequest: null,
    lastWrongAction: null,
    lastAssistantAction: null,
    imageRequestHandled: false,
    at: 0,
  };

  const CHAT_CONTEXT_TTL_MS = 30 * 60 * 1000;

  /** När bildbyte misslyckas — aldrig «bygg om sidan» (det river allt). */
  const IMAGE_FAIL_HINT =
    "Vill du att jag provar igen, eller beskriver du bilden på ett annat sätt? Du kan också byta bild under Bilder & länkar → Hero-bild.";

  const INDUSTRY_LABELS = {
    frisor: "frisörsalong",
    hundsalong: "hundsalong",
    hunddagis: "hunddagis",
    gym: "gym",
    cafe: "café",
    restaurang: "restaurang",
    byggfirma: "byggfirma",
    fotograf: "fotograf",
    event: "eventbyrå",
    butik: "butik",
    verksamhet: "verksamhet",
    konsult: "konsultverksamhet",
    advokat: "advokatbyrå",
    miljo: "återvinningsföretag",
    tarot: "tarot- och vägledningsverksamhet",
  };

  function logStudioTestDebug(payload) {
    if (typeof console === "undefined" || !console.info) return;
    try {
      console.info("[Easily Studio · test]", payload);
    } catch (e) {
      /* ignore */
    }
  }

  function industryLabel(key) {
    return INDUSTRY_LABELS[key] || "verksamhet";
  }

  function createAckMessage(desc, ctx) {
    ctx = ctx || {};
    const brand = String(ctx.brand || "").trim();
    const location = String(ctx.location || "").trim();
    const type = industryLabel(ctx.industry);
    const SCE = global.SiteCompositionEngine;
    let feel = "";
    if (SCE && ctx.createBuildPlan && typeof SCE.composeFromBuildPlan === "function") {
      const preview = SCE.composeFromBuildPlan(ctx.createBuildPlan, global.AISiteBuilder);
      if (preview && preview.artDirector && preview.artDirector.brandFeel) {
        feel = preview.artDirector.brandFeel.split("—")[0].trim();
      }
    }

    if (brand && location) {
      return (
        "Jag tänker som art director för " +
        brand +
        " — " +
        type +
        " i " +
        location +
        ". " +
        (feel ? "Känsla: " + feel + ". " : "") +
        "Unik komposition, tydlig hierarki och CTA utifrån verksamheten — inte en färdig mall."
      );
    }
    if (brand) {
      return (
        "Jag tänker som art director för " +
        brand +
        " — " +
        (feel ? feel + ", " : "") +
        "unik layout och konverteringsfokus utifrån verksamheten."
      );
    }
    const d = String(desc || "").trim();
    if (!d) return "Jag komponerar din webbplats som art director…";
    return "Jag komponerar utifrån sex designkriterier — unikhet, balans, hierarki, förtroende, konvertering och varumärkeskänsla.";
  }

  function applyBriefToDocument(desc, ctx, brand) {
    const SS = global.SiteState;
    const AI = global.AISiteBuilder;
    if (!SS || !SS.patch) return;
    const location = ctx && ctx.location;
    const services = (ctx && ctx.offeredServices) || [];
    const bookingHint = ctx && ctx.bookingHint;
    const plan = ctx && ctx.plan;
    const resolvedBrand =
      String(brand || "").trim() ||
      (ctx && ctx.brand) ||
      (AI && typeof AI.extractBrandFromDescription === "function"
        ? AI.extractBrandFromDescription(desc)
        : "");

    SS.patch(function (d) {
      if (!d.page) d.page = {};
      if (location) d.page.location = location;
      let brandToApply = resolvedBrand;
      if (!brandToApply && d.sections && d.sections.hero && d.sections.hero.content) {
        const fromHero = String(d.sections.hero.content["hero-title"] || "")
          .split(/[—–-]/)[0]
          .trim();
        if (fromHero.length >= 2) brandToApply = fromHero;
      }
      if (!brandToApply && location && ctx && ctx.industry && ctx.industry !== "verksamhet") {
        brandToApply = industryLabel(ctx.industry) + " " + location;
      }
      if (brandToApply && d.sections && d.sections.footer && d.sections.footer.content) {
        d.sections.footer.content["footer-brand"] = brandToApply.slice(0, 48);
      }
      if (location && d.sections && d.sections.about && d.sections.about.content) {
        const p2 = String(d.sections.about.content["about-p2"] || "").trim();
        if (p2 && p2.indexOf(location) === -1) {
          d.sections.about.content["about-p2"] = p2.replace(/\.$/, "") + ". Vi finns i " + location + ".";
        } else if (!p2) {
          d.sections.about.content["about-p2"] = "Vi finns i " + location + ".";
        }
      }
      if (location && d.sections && d.sections.contact && d.sections.contact.content) {
        const addr = String(d.sections.contact.content["contact-address"] || "").trim();
        if (!addr || addr.indexOf(location) === -1) {
          d.sections.contact.content["contact-address"] = location;
        }
      }
      if (!d.page.compositionLocked && services.length && d.sections && d.sections.services && d.sections.services.cards) {
        services.forEach(function (name, i) {
          if (d.sections.services.cards[i]) {
            d.sections.services.cards[i].title = name;
            d.sections.services.cards[i].intent = "services";
          }
        });
      }
      if (bookingHint) {
        if (!d.page.material) d.page.material = {};
        d.page.material.bookingNote = bookingHint;
      }
      if (!d.page.compositionLocked) {
        if (plan && plan.goal === "bookings" && d.sections && d.sections.booking) {
          d.sections.booking.hidden = false;
        }
        if (plan && plan.primaryCta && d.sections && d.sections.hero && d.sections.hero.content) {
          d.sections.hero.content["hero-cta-1-text"] = plan.primaryCta.text;
          d.sections.hero.content["hero-cta-1-href"] = plan.primaryCta.href;
        }
      }
      if (global.AppDocument && typeof global.AppDocument.ensureTextLogo === "function") {
        global.AppDocument.ensureTextLogo(d, {
          industry: (ctx && ctx.industry) || d.page.industry,
          brand:
            brandToApply ||
            resolvedBrand ||
            (d.sections.footer && d.sections.footer.content && d.sections.footer.content["footer-brand"]),
          location: location || d.page.location,
        });
      }
    });
  }

  function isNewSiteRequest() {
    try {
      return new URL(window.location.href).searchParams.get("new") === "1";
    } catch (e) {
      return false;
    }
  }

  function isQuestionEngineRequest() {
    try {
      if (document.documentElement.dataset.questionEngineRequested === "1") return true;
      const params = new URL(window.location.href).searchParams;
      if (params.get("questionEngine") === "1") return true;
      // Alla vanliga nyskapanden ägs av Question Engine. Den gamla
      // generatorn får inte ta över bara för att länken saknar en intern
      // testparameter.
      return params.get("new") === "1" && !!(
        global.CreateCdGate &&
        typeof global.CreateCdGate.isQuestionEngineEnabled === "function" &&
        global.CreateCdGate.isQuestionEngineEnabled()
      );
    } catch (e) {
      return false;
    }
  }

  function clearNewParam() {
    try {
      var u = new URL(window.location.href);
      if (
        u.searchParams.get("new") === "1" &&
        global.CreateCdGate &&
        typeof global.CreateCdGate.isQuestionEngineEnabled === "function" &&
        global.CreateCdGate.isQuestionEngineEnabled()
      ) {
        document.documentElement.dataset.questionEngineRequested = "1";
      }
      u.searchParams.delete("new");
      window.history.replaceState({}, "", u.pathname + (u.search || ""));
    } catch (e) {
      /* ignore */
    }
  }

  function shouldOffer() {
    try {
      if (document.body.getAttribute("data-studio-mode") === "readonly") return false;
      if (isNewSiteRequest()) return true;
      if (global.STUDIO && global.STUDIO.siteIdFromUrl) return false;
      if (global.STUDIO && global.STUDIO.openProjectsFromUrl) return false;
      return true;
    } catch (e) {
      return false;
    }
  }

  function shouldResumeLoadedProject() {
    if (isNewSiteRequest()) return false;
    if (document.documentElement.dataset.studioCreateGeneration === "1") return false;
    if (document.body.getAttribute("data-studio-mode") === "readonly") return false;
    if (!global.STUDIO || !String(global.STUDIO.siteIdFromUrl || "").trim()) return false;
    return true;
  }

  const PREVIEW = { EMPTY: "empty", LOADING: "loading", SITE: "site" };
  let chatPhase = "create";
  let selectedSectionId = null;

  const SECTION_ALIASES = {
    hero: ["hero", "startsida", "start", "huvud"],
    about: ["about", "om oss", "om"],
    services: ["services", "tjänster", "tjanster", "meny", "priser"],
    gallery: ["gallery", "galleri", "bilder"],
    faq: ["faq", "frågor", "fragor", "vanliga frågor"],
    booking: ["booking", "bokning", "boka"],
    contact: ["contact", "kontakt"],
    footer: ["footer", "sidfot"],
  };

  const SECTION_MAP_LABELS = {
    hero: "Hero / första delen",
    services: "Tjänster",
    about: "Om oss",
    gallery: "Galleri",
    faq: "Vanliga frågor",
    booking: "Bokning",
    contact: "Kontakt",
    footer: "Sidfot",
  };

  const SECTION_CHIP_LABELS = {
    hero: "Hero",
    services: "Tjänster",
    about: "Om oss",
    booking: "Bokning",
    contact: "Kontakt",
    gallery: "Galleri",
    faq: "FAQ",
    footer: "Sidfot",
  };

  function escChatHtml(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function getVisibleSections() {
    const SS = global.SiteState;
    if (!SS || typeof SS.get !== "function") return [];
    let d;
    try {
      d = SS.get();
    } catch (e) {
      return [];
    }
    if (!d || !d.page) return [];
    const order = (d.page.sectionOrder || []).filter(function (id) {
      return id !== "footer";
    });
    const ids = [];
    order.forEach(function (id) {
      if (d.sections && d.sections[id] && !d.sections[id].hidden) ids.push(id);
    });
    if (d.sections && d.sections.footer && !d.sections.footer.hidden) ids.push("footer");

    if (!ids.length && d.sections) {
      ["hero", "about", "services", "gallery", "faq", "booking", "contact"].forEach(function (id) {
        if (d.sections[id] && !d.sections[id].hidden) ids.push(id);
      });
      if (d.sections.footer && !d.sections.footer.hidden) ids.push("footer");
    }
    return ids;
  }

  function appendSectionMapMessage() {
    const thread = document.getElementById("studioChatThread");
    if (!thread) return;
    const visible = getVisibleSections();
    if (!visible.length) return;

    const listItems = visible
      .map(function (id) {
        const label = SECTION_MAP_LABELS[id] || id;
        return (
          '<li><button type="button" class="studio-chat__section-pick" data-section-chip="' +
          escChatHtml(id) +
          '">' +
          escChatHtml(label) +
          "</button></li>"
        );
      })
      .join("");

    const msg = document.createElement("div");
    msg.className = "studio-chat__msg studio-chat__msg--assistant studio-chat__msg--section-map";
    msg.innerHTML =
      '<img class="studio-chat__avatar" src="assets/easily-mark.svg" alt="" width="28" height="28" decoding="async" />' +
      '<div class="studio-chat__bubble studio-chat__bubble--section-map">' +
      '<p class="studio-chat__name">Easily</p>' +
      '<p class="studio-chat__section-map-title">Din sida innehåller:</p>' +
      '<p class="studio-chat__section-map-hint">Vill du ändra något i en sektion? Klicka på valfri sektion nedan — eller på samma del i sidan till höger. Skriv sedan vad du vill ändra och tryck Skicka.</p>' +
      '<ul class="studio-chat__section-list">' +
      listItems +
      "</ul>" +
      "</div>";

    thread.appendChild(msg);
    thread.scrollTop = thread.scrollHeight;
    updateChatLayout();
  }

  function activateSectionChip(sectionId) {
    if (!sectionId) return;
    const el = document.querySelector('[data-section="' + sectionId + '"]');
    if (el) {
      highlightPreviewSection(el);
      try {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      } catch (e) {
        /* ignore */
      }
    } else {
      selectedSectionId = sectionId;
    }
    const descArea = document.getElementById("welcomeBusinessDescription");
    const chipLabel = SECTION_CHIP_LABELS[sectionId] || sectionId;
    if (descArea) {
      descArea.value = "Ändra " + chipLabel;
      descArea.focus();
    }
  }

  function bindEditChipDelegation() {
    const thread = document.getElementById("studioChatThread");
    if (!thread || thread.dataset.editChipBound === "1") return;
    thread.dataset.editChipBound = "1";
    thread.addEventListener("click", function (e) {
      const btn = e.target.closest("[data-edit-chip]");
      if (!btn) return;
      e.preventDefault();
      const cmd = btn.getAttribute("data-edit-chip");
      if (!cmd) return;
      if (cmd === "byt hero-bild — ") {
        const descArea = document.getElementById("welcomeBusinessDescription");
        if (descArea) {
          descArea.value = "byt hero-bild — ";
          descArea.focus();
        }
        return;
      }
      appendUserMessage(btn.textContent.trim());
      handleEditCommand(cmd, { skipUserAppend: true });
    });
  }

  function bindSectionChipDelegation() {
    bindEditChipDelegation();
    const thread = document.getElementById("studioChatThread");
    if (!thread || thread.dataset.chipBound === "1") return;
    thread.dataset.chipBound = "1";
    thread.addEventListener("click", function (e) {
      const btn = e.target.closest("[data-section-chip]");
      if (!btn) return;
      e.preventDefault();
      activateSectionChip(btn.getAttribute("data-section-chip"));
    });
  }

  function clearPreviewHoverLabels() {
    document.querySelectorAll(".studio-section-hover-label").forEach(function (el) {
      el.remove();
    });
    document.querySelectorAll(".has-hover-label").forEach(function (el) {
      el.classList.remove("has-hover-label");
    });
  }

  function showPreviewHoverLabel(section) {
    if (!section || !hasGeneratedSite()) return;
    clearPreviewHoverLabels();
    const id = section.getAttribute("data-section");
    const label = SECTION_CHIP_LABELS[id] || section.getAttribute("data-section-label") || id;
    const tag = document.createElement("span");
    tag.className = "studio-section-hover-label";
    tag.textContent = label;
    if (getComputedStyle(section).position === "static") section.style.position = "relative";
    section.appendChild(tag);
    section.classList.add("has-hover-label");
  }

  function bindPreviewSectionHover() {
    const pane = document.getElementById("studioPreviewPane");
    if (!pane || pane.dataset.previewHoverBound === "1") return;
    pane.dataset.previewHoverBound = "1";

    pane.addEventListener("mouseover", function (e) {
      if (!hasGeneratedSite()) return;
      const section = e.target.closest("[data-section]");
      if (!section || !pane.contains(section)) return;
      showPreviewHoverLabel(section);
    });

    pane.addEventListener("mouseout", function (e) {
      const section = e.target.closest("[data-section]");
      if (!section) return;
      if (section.contains(e.relatedTarget)) return;
      const label = section.querySelector(".studio-section-hover-label");
      if (label) label.remove();
      section.classList.remove("has-hover-label");
    });
  }

  function hasGeneratedSite() {
    if (global.GreenfieldAdapter && global.GreenfieldAdapter.handlesPreview()) {
      const doc = global.SiteState && global.SiteState.get();
      return !!(doc && doc.meta && doc.meta.greenfieldPreviewPath);
    }
    if (document.body.classList.contains("studio-shell--generating")) return false;
    if (document.documentElement.dataset.studioPreviewPending === "1") return false;
    if (isCreateChatPhase()) return false;

    const main = document.getElementById("siteMain");
    if (!main || !main.querySelector(".site-section, .easily-v2-site")) return false;

    const previewState = document.body.dataset.studioPreview;
    if (previewState === "empty" || previewState === "loading") return false;
    if (previewState === "site") return true;

    return false;
  }

  function setChatIntro(text) {
    const intro = document.getElementById("studioChatIntro");
    const introText = document.getElementById("studioChatIntroText");
    if (introText) introText.textContent = text;
    if (intro) intro.hidden = false;
    updateChatLayout();
  }

  function stopChatTipsRotation() {
    if (chatTipsTimer) {
      clearInterval(chatTipsTimer);
      chatTipsTimer = null;
    }
    showChatTip("");
  }

  function showChatTip(text) {
    const el = document.getElementById("studioChatTipsText");
    const box = document.getElementById("studioChatTips");
    const msg = String(text || "").trim();
    if (el) el.textContent = msg;
    if (box) box.hidden = !msg;
  }

  function startChatTipsRotation() {
    stopChatTipsRotation();
    const tips = CHAT_TIPS[chatPhase === "edit" ? "edit" : "create"];
    if (!tips || !tips.length) {
      showChatTip("");
      return;
    }
    chatTipsIndex = 0;
    showChatTip(tips[0]);
    chatTipsTimer = setInterval(function () {
      chatTipsIndex = (chatTipsIndex + 1) % tips.length;
      showChatTip(tips[chatTipsIndex]);
    }, 8000);
  }

  function setCreateTypeChoicesVisible(visible) {
    const box = document.getElementById("studioCreateTypeChoices");
    if (box) box.hidden = !visible;
  }

  function setCreateSectionsStepVisible(visible) {
    const step = document.getElementById("studioCreateSectionsStep");
    if (step) step.hidden = !visible;
  }

  function setCreateBusinessStepVisible(visible) {
    const step = document.getElementById("studioCreateBusinessStep");
    if (step) step.hidden = !visible;
  }

  function setCreateStyleStepVisible(visible) {
    const step = document.getElementById("studioCreateStyleStep");
    if (step) step.hidden = !visible;
  }

  function syncCreateDesignStyleHidden() {
    const hidden = document.getElementById("welcomeCreateDesignStyle");
    if (!hidden) return;
    const selected = getSelectedCreateDesignStyle();
    hidden.value = selected ? JSON.stringify(selected) : "";
  }

  function getSelectedCreateDesignStyle() {
    const box = document.getElementById("studioCreateStyleChoices");
    if (!box) return null;
    const input = box.querySelector(".studio-chat__flow-check-input:checked");
    if (!input) return null;
    const id = input.getAttribute("data-style-id");
    if (!id) return null;
    return {
      id: id,
      letter: input.getAttribute("data-style-letter") || "",
      title: input.getAttribute("data-style-title") || "",
      description: input.getAttribute("data-style-description") || "",
    };
  }

  function setSelectedCreateDesignStyle(styleId) {
    const box = document.getElementById("studioCreateStyleChoices");
    if (!box) return;
    box.querySelectorAll(".studio-chat__flow-check-input").forEach(function (input) {
      input.checked = !!(styleId && input.getAttribute("data-style-id") === styleId);
    });
    syncCreateDesignStyleHidden();
  }

  function clearCreateDesignStyle() {
    setSelectedCreateDesignStyle("");
    syncCreateDesignStyleHidden();
  }

  function renderCreateStyleChoices() {
    const box = document.getElementById("studioCreateStyleChoices");
    if (!box) return;
    if (box.dataset.rendered === "1") return;
    box.dataset.rendered = "1";
    box.replaceChildren();
    CREATE_DESIGN_STYLES.forEach(function (style) {
      const wrap = document.createElement("div");
      wrap.innerHTML = buildFlowCheckHtml(
        style.letter + ". " + style.title,
        style.description,
        'data-style-id="' +
          style.id +
          '" data-style-letter="' +
          style.letter +
          '" data-style-title="' +
          style.title.replace(/"/g, "&quot;") +
          '" data-style-description="' +
          style.description.replace(/"/g, "&quot;") +
          '"',
      );
      box.appendChild(wrap.firstChild);
    });
    syncCreateDesignStyleHidden();
  }

  function bindCreateStyleChoices() {
    const box = document.getElementById("studioCreateStyleChoices");
    if (!box || box.dataset.bound === "1") return;
    box.dataset.bound = "1";
    box.addEventListener("change", function (e) {
      if (!isCreateChatPhase()) return;
      const input = e.target.closest(".studio-chat__flow-check-input");
      if (!input || !box.contains(input)) return;
      if (!input.checked) {
        setSelectedCreateDesignStyle("");
        return;
      }
      box.querySelectorAll(".studio-chat__flow-check-input").forEach(function (other) {
        if (other !== input) other.checked = false;
      });
      setSelectedCreateDesignStyle(input.getAttribute("data-style-id") || "");
    });
  }

  function focusCreateDesignStyle() {
    setCreateFlowStep(3);
  }

  function setCreateExistingStepVisible(visible) {
    const step = document.getElementById("studioCreateExistingStep");
    if (step) step.hidden = !visible;
  }

  function getCreateExistingSiteUrl() {
    const input = document.getElementById("welcomeCreateExistingUrl");
    return input && input.value ? String(input.value).trim() : "";
  }

  function updateCreateExistingUrlVisibility(selectedId) {
    const wrap = document.getElementById("studioCreateExistingUrlWrap");
    const input = document.getElementById("welcomeCreateExistingUrl");
    if (!wrap) return;
    const show = selectedId === "has-website";
    wrap.hidden = !show;
    if (!show && input) input.value = "";
    if (show && input) {
      try {
        input.focus({ preventScroll: true });
      } catch (eFocusUrl) {
        /* ignore */
      }
    }
    syncCreateExistingSiteHidden();
  }

  function syncCreateExistingSiteHidden() {
    const hidden = document.getElementById("welcomeCreateExistingSite");
    if (!hidden) return;
    const selected = getSelectedCreateExistingSite();
    hidden.value = selected ? JSON.stringify(selected) : "";
  }

  function getSelectedCreateExistingSite() {
    const box = document.getElementById("studioCreateExistingChoices");
    if (!box) return null;
    const input = box.querySelector(".studio-chat__flow-check-input:checked");
    if (!input) return null;
    const id = input.getAttribute("data-existing-id");
    if (!id) return null;
    const out = {
      id: id,
      letter: input.getAttribute("data-existing-letter") || "",
      title: input.getAttribute("data-existing-title") || "",
      description: input.getAttribute("data-existing-description") || "",
    };
    if (id === "has-website") {
      const url = getCreateExistingSiteUrl();
      if (url) out.existingUrl = url;
    }
    return out;
  }

  function setSelectedCreateExistingSite(optionId) {
    const box = document.getElementById("studioCreateExistingChoices");
    if (!box) return;
    box.querySelectorAll(".studio-chat__flow-check-input").forEach(function (input) {
      input.checked = !!(optionId && input.getAttribute("data-existing-id") === optionId);
    });
    updateCreateExistingUrlVisibility(optionId || "");
    syncCreateExistingSiteHidden();
  }

  function clearCreateExistingSite() {
    setSelectedCreateExistingSite("");
    const input = document.getElementById("welcomeCreateExistingUrl");
    if (input) input.value = "";
    syncCreateExistingSiteHidden();
  }

  function renderCreateExistingSiteChoices() {
    const box = document.getElementById("studioCreateExistingChoices");
    if (!box) return;
    if (box.dataset.rendered === "1") return;
    box.dataset.rendered = "1";
    box.replaceChildren();
    CREATE_EXISTING_SITE_OPTIONS.forEach(function (option) {
      const wrap = document.createElement("div");
      wrap.innerHTML = buildFlowCheckHtml(
        option.letter + ". " + option.title,
        option.description,
        'data-existing-id="' +
          option.id +
          '" data-existing-letter="' +
          option.letter +
          '" data-existing-title="' +
          option.title.replace(/"/g, "&quot;") +
          '" data-existing-description="' +
          option.description.replace(/"/g, "&quot;") +
          '"',
      );
      box.appendChild(wrap.firstChild);
    });
    syncCreateExistingSiteHidden();
  }

  function bindCreateExistingSiteChoices() {
    const box = document.getElementById("studioCreateExistingChoices");
    if (!box || box.dataset.bound === "1") return;
    box.dataset.bound = "1";
    box.addEventListener("change", function (e) {
      if (!isCreateChatPhase()) return;
      const input = e.target.closest(".studio-chat__flow-check-input");
      if (!input || !box.contains(input)) return;
      if (!input.checked) {
        setSelectedCreateExistingSite("");
        return;
      }
      box.querySelectorAll(".studio-chat__flow-check-input").forEach(function (other) {
        if (other !== input) other.checked = false;
      });
      setSelectedCreateExistingSite(input.getAttribute("data-existing-id") || "");
    });
  }

  function bindCreateExistingSiteUrl() {
    const input = document.getElementById("welcomeCreateExistingUrl");
    if (!input || input.dataset.bound === "1") return;
    input.dataset.bound = "1";
    input.addEventListener("input", function () {
      if (!isCreateChatPhase()) return;
      syncCreateExistingSiteHidden();
    });
  }

  function focusCreateExistingSite() {
    const step = document.getElementById("studioCreateExistingStep");
    if (!step) return;
    try {
      step.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } catch (eScrollExisting) {
      /* ignore */
    }
  }

  function focusCreateExistingSiteUrl() {
    const input = document.getElementById("welcomeCreateExistingUrl");
    const wrap = document.getElementById("studioCreateExistingUrlWrap");
    if (wrap) wrap.hidden = false;
    if (!input) return;
    try {
      input.focus({ preventScroll: true });
      input.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } catch (eFocusExistingUrl) {
      /* ignore */
    }
  }

  function buildCreateBusinessBrief() {
    const name = getCreateBusinessName();
    const desc = getCreateBusinessDescription();
    if (name && desc) return name + ". " + desc;
    return name || desc;
  }

  function syncCreateBusinessInfoHidden() {
    const nameHidden = document.getElementById("welcomeCreateBusinessNameMeta");
    const locHidden = document.getElementById("welcomeCreateBusinessLocationMeta");
    const descHidden = document.getElementById("welcomeCreateBusinessDescriptionMeta");
    if (nameHidden) nameHidden.value = getCreateBusinessName();
    if (locHidden) locHidden.value = getCreateBusinessLocation();
    if (descHidden) descHidden.value = getCreateBusinessDescription();
  }

  function getCreateBusinessName() {
    const input = document.getElementById("welcomeCreateBusinessName");
    return input && input.value ? String(input.value).trim() : "";
  }

  function getCreateBusinessLocation() {
    const input = document.getElementById("welcomeCreateBusinessLocation");
    return input && input.value ? String(input.value).trim() : "";
  }

  function getCreateBusinessDescription() {
    const area = document.getElementById("welcomeCreateBusinessDescription");
    return area && area.value ? String(area.value).trim() : "";
  }

  function getCreateBusinessBrief() {
    return buildCreateBusinessBrief();
  }

  function clearCreateBusinessBrief() {
    const nameInput = document.getElementById("welcomeCreateBusinessName");
    const locInput = document.getElementById("welcomeCreateBusinessLocation");
    const descArea = document.getElementById("welcomeCreateBusinessDescription");
    if (nameInput) nameInput.value = "";
    if (locInput) locInput.value = "";
    if (descArea) descArea.value = "";
    syncCreateBusinessInfoHidden();
  }

  function bindCreateBusinessBrief() {
    const nameInput = document.getElementById("welcomeCreateBusinessName");
    const locInput = document.getElementById("welcomeCreateBusinessLocation");
    const descArea = document.getElementById("welcomeCreateBusinessDescription");
    if (!nameInput || !descArea || nameInput.dataset.bound === "1") return;
    nameInput.dataset.bound = "1";
    descArea.dataset.bound = "1";
    if (locInput) locInput.dataset.bound = "1";
    function onInput() {
      if (!isCreateChatPhase()) return;
      syncCreateBusinessInfoHidden();
    }
    nameInput.addEventListener("input", onInput);
    if (locInput) locInput.addEventListener("input", onInput);
    descArea.addEventListener("input", onInput);
  }

  function getBusinessDescriptionForSubmit() {
    if (isCreateChatPhase() && !hasGeneratedSite()) {
      return buildCreateBusinessBrief();
    }
    const descArea = document.getElementById("welcomeBusinessDescription");
    return descArea && descArea.value ? String(descArea.value).trim() : "";
  }

  function focusCreateBusinessName() {
    const input = document.getElementById("welcomeCreateBusinessName");
    if (!input) return;
    try {
      input.focus({ preventScroll: true });
      input.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } catch (eFocusName) {
      /* ignore */
    }
  }

  function focusCreateBusinessDescription() {
    const area = document.getElementById("welcomeCreateBusinessDescription");
    if (!area) return;
    try {
      area.focus({ preventScroll: true });
      area.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } catch (eFocusDesc) {
      /* ignore */
    }
  }

  function focusCreateBusinessBrief() {
    if (!getCreateBusinessName()) {
      focusCreateBusinessName();
      return;
    }
    focusCreateBusinessDescription();
  }

  function syncCreateSectionsHidden() {
    const hidden = document.getElementById("welcomeCreateSections");
    if (!hidden) return;
    const selected = getSelectedCreateSections();
    hidden.value = selected.length ? JSON.stringify(selected) : "";
  }

  function getSelectedCreateSections() {
    const box = document.getElementById("studioCreateSectionChoices");
    const optional = [];
    if (box) {
      box.querySelectorAll(".studio-chat__flow-check-input:checked").forEach(function (input) {
        const id = input.getAttribute("data-section-id");
        const label = input.getAttribute("data-section-label") || id;
        if (id) optional.push({ id: id, label: label });
      });
    }
    const order = CREATE_OPTIONAL_SECTIONS.map(function (section) {
      return section.id;
    });
    optional.sort(function (a, b) {
      return order.indexOf(a.id) - order.indexOf(b.id);
    });
    return [CREATE_ALWAYS_SECTIONS[0]].concat(optional).concat([CREATE_ALWAYS_SECTIONS[1]]);
  }

  function renderCreateSectionChoices(siteType) {
    const box = document.getElementById("studioCreateSectionChoices");
    if (!box) return;
    box.replaceChildren();
    CREATE_OPTIONAL_SECTIONS.forEach(function (section) {
      const wrap = document.createElement("div");
      const checkedAttr = section.defaultChecked ? ' checked="checked"' : "";
      wrap.innerHTML = buildFlowCheckHtml(
        section.label,
        section.description || "",
        'data-section-id="' +
          section.id +
          '" data-section-label="' +
          section.label.replace(/"/g, "&quot;") +
          '"' +
          checkedAttr,
      );
      const label = wrap.firstChild;
      if (label) box.appendChild(label);
    });
    syncCreateSectionsHidden();
  }

  function clearCreateSectionChoices() {
    const box = document.getElementById("studioCreateSectionChoices");
    if (box) box.replaceChildren();
    syncCreateSectionsHidden();
  }

  function bindCreateSectionChoices() {
    const box = document.getElementById("studioCreateSectionChoices");
    if (!box || box.dataset.bound === "1") return;
    box.dataset.bound = "1";
    box.addEventListener("change", function () {
      if (!isCreateChatPhase()) return;
      syncCreateSectionsHidden();
    });
  }

  function getSelectedSiteType() {
    const hidden = document.getElementById("welcomeSiteType");
    return hidden && hidden.value ? String(hidden.value).trim() : "";
  }

  function setSelectedSiteType(typeId) {
    const hidden = document.getElementById("welcomeSiteType");
    if (hidden) hidden.value = typeId || "";
    const box = document.getElementById("studioCreateTypeChoices");
    if (!box) return;
    box.querySelectorAll(".studio-chat__type-check-input").forEach(function (input) {
      input.checked = input.getAttribute("data-site-type") === typeId;
    });
    setChatIntro(typeId ? CREATE_AFTER_TYPE_MSG : CREATE_WELCOME_MSG);
  }

  function bindCreateTypeChoices() {
    const box = document.getElementById("studioCreateTypeChoices");
    if (!box || box.dataset.bound === "1") return;
    box.dataset.bound = "1";
    box.addEventListener("change", function (e) {
      if (!isCreateChatPhase()) return;
      const input = e.target.closest(".studio-chat__type-check-input");
      if (!input || !box.contains(input)) return;
      if (!input.checked) {
        setSelectedSiteType("");
        return;
      }
      const typeId = input.getAttribute("data-site-type") || "";
      box.querySelectorAll(".studio-chat__type-check-input").forEach(function (other) {
        if (other !== input) other.checked = false;
      });
      setSelectedSiteType(typeId);
    });
  }

  const CREATE_FIELD_ERROR_IDS = {
    siteType: "createErrorSiteType",
    businessName: "createErrorBusinessName",
    businessDescription: "createErrorBusinessDescription",
    designStyle: "createErrorDesignStyle",
    sections: "createErrorSections",
    existingSite: "createErrorExistingSite",
    existingSiteUrl: "createErrorExistingSiteUrl",
  };

  const CREATE_FIELD_ERROR_STEPS = {
    siteType: 1,
    businessName: 2,
    businessDescription: 2,
    designStyle: 3,
    sections: 4,
    existingSite: 5,
    existingSiteUrl: 5,
    plan: 1,
  };

  function getCreateValidationMessage(errorKey) {
    const BP = global.CreateBuildPlan;
    if (BP && BP.VALIDATION_MESSAGES && BP.VALIDATION_MESSAGES[errorKey]) {
      return BP.VALIDATION_MESSAGES[errorKey];
    }
    return "";
  }

  function clearCreateFieldError(errorKey) {
    const id = CREATE_FIELD_ERROR_IDS[errorKey];
    const el = id ? document.getElementById(id) : null;
    if (el) {
      el.hidden = true;
      el.textContent = "";
    }
    unmarkCreateFieldInvalid(errorKey);
  }

  function clearCreateFieldErrors() {
    Object.keys(CREATE_FIELD_ERROR_IDS).forEach(clearCreateFieldError);
  }

  function unmarkCreateFieldInvalid(errorKey) {
    switch (errorKey) {
      case "siteType":
        document.getElementById("studioCreateTypeChoices")?.classList.remove("studio-chat__field-invalid");
        break;
      case "businessName":
        document.getElementById("welcomeCreateBusinessName")?.classList.remove("studio-chat__field-invalid");
        break;
      case "businessDescription":
        document.getElementById("welcomeCreateBusinessDescription")?.classList.remove("studio-chat__field-invalid");
        break;
      case "designStyle":
        document.getElementById("studioCreateStyleChoices")?.classList.remove("studio-chat__field-invalid");
        break;
      case "sections":
        document.getElementById("studioCreateSectionChoices")?.classList.remove("studio-chat__field-invalid");
        break;
      case "existingSite":
        document.getElementById("studioCreateExistingChoices")?.classList.remove("studio-chat__field-invalid");
        break;
      case "existingSiteUrl":
        document.getElementById("welcomeCreateExistingUrl")?.classList.remove("studio-chat__field-invalid");
        break;
      default:
        break;
    }
  }

  function markCreateFieldInvalid(errorKey) {
    switch (errorKey) {
      case "siteType":
        document.getElementById("studioCreateTypeChoices")?.classList.add("studio-chat__field-invalid");
        break;
      case "businessName":
        document.getElementById("welcomeCreateBusinessName")?.classList.add("studio-chat__field-invalid");
        break;
      case "businessDescription":
        document.getElementById("welcomeCreateBusinessDescription")?.classList.add("studio-chat__field-invalid");
        break;
      case "designStyle":
        document.getElementById("studioCreateStyleChoices")?.classList.add("studio-chat__field-invalid");
        break;
      case "sections":
        document.getElementById("studioCreateSectionChoices")?.classList.add("studio-chat__field-invalid");
        break;
      case "existingSite":
        document.getElementById("studioCreateExistingChoices")?.classList.add("studio-chat__field-invalid");
        break;
      case "existingSiteUrl":
        document.getElementById("welcomeCreateExistingUrl")?.classList.add("studio-chat__field-invalid");
        break;
      default:
        break;
    }
  }

  function showCreateFieldError(errorKey, message) {
    const text = message || getCreateValidationMessage(errorKey);
    const id = CREATE_FIELD_ERROR_IDS[errorKey];
    const el = id ? document.getElementById(id) : null;
    if (el && text) {
      el.textContent = text;
      el.hidden = false;
    }
    markCreateFieldInvalid(errorKey);
  }

  function validateCreateFlowComplete() {
    const BP = global.CreateBuildPlan;
    if (!BP || typeof BP.validate !== "function") {
      return {
        ok: false,
        errors: [{ key: "plan", message: "Create Build Plan saknas.", step: 1 }],
        buildPlan: null,
      };
    }
    const buildPlan = buildCreateBuildPlanFromUi();
    const result = BP.validate(buildPlan);
    if (result.ok) {
      return { ok: true, errors: [], buildPlan: buildPlan };
    }
    const errors = (result.errors || []).map(function (key) {
      return {
        key: key,
        message: getCreateValidationMessage(key) || result.message || "",
        step: CREATE_FIELD_ERROR_STEPS[key] || 1,
      };
    });
    return { ok: false, errors: errors, buildPlan: null };
  }

  function applyCreateFlowValidationErrors(errors) {
    if (!errors || !errors.length) return;
    clearCreateFieldErrors();
    errors.forEach(function (err) {
      showCreateFieldError(err.key, err.message);
    });
    const first = errors[0];
    if (first) {
      setCreateFlowStep(first.step);
      focusCreateFieldForPlanError(first.key);
    }
  }

  function validateCreateFlowFields(fieldKeys) {
    const check = validateCreateFlowComplete();
    const filtered = check.errors.filter(function (err) {
      return fieldKeys.indexOf(err.key) >= 0;
    });
    clearCreateFieldErrors();
    if (filtered.length) {
      applyCreateFlowValidationErrors(filtered);
      return false;
    }
    return true;
  }

  function bindCreateFlowValidationClearing() {
    if (document.body.dataset.createValidationClearBound === "1") return;
    document.body.dataset.createValidationClearBound = "1";

    const typeBox = document.getElementById("studioCreateTypeChoices");
    if (typeBox) {
      typeBox.addEventListener("change", function () {
        if (!isCreateChatPhase()) return;
        clearCreateFieldError("siteType");
      });
    }

    const nameInput = document.getElementById("welcomeCreateBusinessName");
    if (nameInput) {
      nameInput.addEventListener("input", function () {
        if (!isCreateChatPhase()) return;
        clearCreateFieldError("businessName");
      });
    }

    const descArea = document.getElementById("welcomeCreateBusinessDescription");
    if (descArea) {
      descArea.addEventListener("input", function () {
        if (!isCreateChatPhase()) return;
        clearCreateFieldError("businessDescription");
      });
    }

    const styleBox = document.getElementById("studioCreateStyleChoices");
    if (styleBox) {
      styleBox.addEventListener("change", function () {
        if (!isCreateChatPhase()) return;
        clearCreateFieldError("designStyle");
      });
    }

    const sectionBox = document.getElementById("studioCreateSectionChoices");
    if (sectionBox) {
      sectionBox.addEventListener("change", function () {
        if (!isCreateChatPhase()) return;
        clearCreateFieldError("sections");
      });
    }

    const existingBox = document.getElementById("studioCreateExistingChoices");
    if (existingBox) {
      existingBox.addEventListener("change", function () {
        if (!isCreateChatPhase()) return;
        clearCreateFieldError("existingSite");
        clearCreateFieldError("existingSiteUrl");
      });
    }

    const existingUrl = document.getElementById("welcomeCreateExistingUrl");
    if (existingUrl) {
      existingUrl.addEventListener("input", function () {
        if (!isCreateChatPhase()) return;
        clearCreateFieldError("existingSiteUrl");
      });
    }
  }

  function focusCreateFieldForPlanError(errorKey) {
    if (!errorKey) return;
    switch (errorKey) {
      case "siteType":
        setCreateFlowStep(1);
        break;
      case "businessName":
        setCreateFlowStep(2);
        focusCreateBusinessName();
        break;
      case "businessDescription":
        setCreateFlowStep(2);
        focusCreateBusinessDescription();
        break;
      case "designStyle":
        setCreateFlowStep(3);
        focusCreateDesignStyle();
        break;
      case "sections":
        setCreateFlowStep(4);
        break;
      case "existingSite":
      case "existingSiteUrl":
        setCreateFlowStep(5);
        if (errorKey === "existingSiteUrl") focusCreateExistingSiteUrl();
        break;
      default:
        break;
    }
  }

  function buildCreateBuildPlanFromUi() {
    const BP = global.CreateBuildPlan;
    if (!BP || typeof BP.buildFromCreateMetadata !== "function") return null;
    return BP.buildFromCreateMetadata(collectCreateFlowMetadata(), getSelectedSiteType());
  }

  function resolveCreateContextFromBuildPlan(buildPlan) {
    const Bridge = global.CreateFlowBridge;
    if (Bridge && typeof Bridge.enrichFromBuildPlan === "function") {
      return Bridge.enrichFromBuildPlan(buildPlan, SITE_TYPE_AREAS);
    }
    return {
      industry: "verksamhet",
      area: "other",
      brand: buildPlan && buildPlan.businessName ? buildPlan.businessName : "",
      plan: null,
      createBuildPlan: buildPlan,
    };
  }

  function resolveCreateContextWithSiteType(bizDesc, siteType, createMeta) {
    const BP = global.CreateBuildPlan;
    const Bridge = global.CreateFlowBridge;
    if (BP && Bridge && typeof Bridge.enrichFromBuildPlan === "function") {
      const buildPlan = BP.buildFromCreateMetadata(createMeta || {}, siteType || "");
      return Bridge.enrichFromBuildPlan(buildPlan, SITE_TYPE_AREAS);
    }
    if (Bridge && typeof Bridge.enrichCreateContext === "function") {
      return Bridge.enrichCreateContext(bizDesc, siteType, createMeta || {}, SITE_TYPE_AREAS);
    }
    const AI = global.AISiteBuilder;
    let ctx = { industry: "verksamhet", area: "other", brand: "", plan: null };
    if (!AI || typeof AI.resolveCreateContext !== "function") return ctx;
    ctx = AI.resolveCreateContext(bizDesc);
    const areaKey = siteType && SITE_TYPE_AREAS[siteType];
    if (areaKey && typeof AI.inferIndustryWithinArea === "function") {
      const within = AI.inferIndustryWithinArea(areaKey, bizDesc);
      if (within.source === "description" && within.industry !== "konsult") {
        ctx.industry = within.industry;
      }
      ctx.area = within.area;
    }
    if (ctx.industry === "konsult") ctx.industry = "verksamhet";
    ctx.siteType = siteType || "";
    const CDG = global.CreateCdGate;
    if (CDG && typeof CDG.enrichContext === "function") CDG.enrichContext(ctx);
    return ctx;
  }

  function collectCreateFlowMetadata() {
    return {
      createSections: getSelectedCreateSections(),
      createBusinessName: getCreateBusinessName(),
      createBusinessLocation: getCreateBusinessLocation(),
      createBusinessDescription: getCreateBusinessDescription(),
      createBusinessBrief: buildCreateBusinessBrief(),
      createDesignStyle: getSelectedCreateDesignStyle(),
      createExistingSite: getSelectedCreateExistingSite(),
    };
  }

  function applyCreateComposeUi() {
    chatPhase = "create";
    document.body.dataset.studioPhase = "create";
    const editDescArea = document.getElementById("welcomeBusinessDescription");
    const nameInput = document.getElementById("welcomeCreateBusinessName");
    const locInput = document.getElementById("welcomeCreateBusinessLocation");
    const descArea = document.getElementById("welcomeCreateBusinessDescription");
    const btn = document.getElementById("welcomeGenerateBtn");
    const skip = document.getElementById("welcomeSkipBtn");
    const disclaimer = document.querySelector(".studio-chat__disclaimer");
    if (editDescArea) {
      editDescArea.value = "";
      editDescArea.placeholder = EDIT_PLACEHOLDER;
    }
    if (nameInput) {
      nameInput.value = "";
      nameInput.placeholder = CREATE_BUSINESS_NAME_PLACEHOLDER;
    }
    if (locInput) {
      locInput.value = "";
      locInput.placeholder = "Fysisk ort, t.ex. Stockholm — lämna tom för digital verksamhet";
    }
    if (descArea) {
      descArea.value = "";
      descArea.placeholder = CREATE_BUSINESS_DESCRIPTION_PLACEHOLDER;
    }
    if (btn) btn.textContent = "Skapa min hemsida";
    if (skip) skip.hidden = true;
    clearSectionSelection();
    if (disclaimer) {
      disclaimer.textContent =
        "Ju tydligare du beskriver verksamheten, desto bättre blir sidan. Granska gärna resultatet innan du publicerar.";
    }
    setSelectedSiteType("");
    clearCreateSectionChoices();
    clearCreateBusinessBrief();
    clearCreateDesignStyle();
    clearCreateExistingSite();
    const styleBox = document.getElementById("studioCreateStyleChoices");
    if (styleBox) {
      delete styleBox.dataset.rendered;
      styleBox.replaceChildren();
    }
    const existingBox = document.getElementById("studioCreateExistingChoices");
    if (existingBox) {
      delete existingBox.dataset.rendered;
      existingBox.replaceChildren();
    }
    const existingUrl = document.getElementById("welcomeCreateExistingUrl");
    if (existingUrl) {
      existingUrl.value = "";
      existingUrl.placeholder = CREATE_EXISTING_URL_PLACEHOLDER;
    }
    const existingUrlWrap = document.getElementById("studioCreateExistingUrlWrap");
    if (existingUrlWrap) existingUrlWrap.hidden = true;
    bindCreateTypeChoices();
    bindCreateSectionChoices();
    bindCreateBusinessBrief();
    bindCreateStyleChoices();
    bindCreateExistingSiteChoices();
    bindCreateExistingSiteUrl();
    bindCreateFlowConfirmButtons();
    bindCreateFlowEnterKey();
    bindCreateFlowValidationClearing();
    clearCreateFieldErrors();
    setCreateFlowStep(1);
    setChatIntro(CREATE_WELCOME_MSG);
    stopChatTipsRotation();
  }

  function resetChatState() {
    chatActionContext.lastUserImageRequest = null;
    chatActionContext.lastWrongAction = null;
    chatActionContext.lastAssistantAction = null;
    chatActionContext.imageRequestHandled = false;
    chatActionContext.at = 0;
    chatPhase = "create";
    selectedSectionId = null;
    if (chatTipsTimer) {
      clearInterval(chatTipsTimer);
      chatTipsTimer = null;
    }
    chatTipsIndex = 0;
    const thread = document.getElementById("studioChatThread");
    if (thread) thread.replaceChildren();
    const descArea = document.getElementById("welcomeBusinessDescription");
    if (descArea) descArea.value = "";
    setSelectedSiteType("");
    clearCreateSectionChoices();
    clearCreateBusinessBrief();
    clearCreateDesignStyle();
    clearCreateExistingSite();
    stopChatTipsRotation();
  }

  function clearPreviewSiteDom() {
    const main = document.getElementById("siteMain");
    const footer = document.getElementById("siteFooter");
    if (main) main.replaceChildren();
    if (footer) footer.replaceChildren();
  }

  function setPreviewState(state) {
    if (global.GreenfieldAdapter && global.GreenfieldAdapter.handlesPreview()) {
      global.GreenfieldAdapter.restore();
      return;
    }
    const empty = document.getElementById("studioPreviewEmpty");
    const loading = document.getElementById("studioPreviewLoading");
    document.body.dataset.studioPreview = state;
    if (state === PREVIEW.SITE) {
      delete document.documentElement.dataset.studioPreviewPending;
    }
    if (empty) empty.hidden = state !== PREVIEW.EMPTY;
    if (loading) {
      loading.hidden = state !== PREVIEW.LOADING;
      loading.setAttribute("aria-busy", state === PREVIEW.LOADING ? "true" : "false");
    }
  }

  function setPreviewLoadingText(stepIndex) {
    const textEl = document.getElementById("studioPreviewLoadingText");
    if (textEl) textEl.textContent = PROGRESS_STEPS[stepIndex] || PROGRESS_STEPS[0];
  }

  function getCreatePane() {
    return document.getElementById("studioCreatePane");
  }

  function isCreateChatPhase() {
    return chatPhase === "create" || document.body.dataset.studioPhase === "create";
  }

  function showCreatePane() {
    const pane = getCreatePane();
    if (!pane) return;
    pane.hidden = false;
    document.body.classList.add("studio-shell--create-active");
    applyCreateComposeUi();
    const inlineToolbar = document.getElementById("inlineToolbar");
    if (inlineToolbar) inlineToolbar.hidden = true;
    const EE = global.EditorEngine;
    if (EE && typeof EE.cancelPendingRemounts === "function") {
      EE.cancelPendingRemounts();
    }
    setPreviewLive(false);
    document.documentElement.dataset.studioPreviewPending = "1";
    clearPreviewSiteDom();
    setPreviewState(PREVIEW.EMPTY);
  }

  function hideCreatePane() {
    const pane = getCreatePane();
    if (pane) pane.hidden = true;
    document.body.classList.remove("studio-shell--create-active", "studio-shell--generating");
    if (pane) pane.classList.remove("is-generating");
    hideProgress();
  }

  function appendAssistantMessage(text, chips) {
    const thread = document.getElementById("studioChatThread");
    if (!thread || !text) return;
    const msg = document.createElement("div");
    msg.className = "studio-chat__msg studio-chat__msg--assistant";
    msg.innerHTML =
      '<img class="studio-chat__avatar" src="assets/easily-mark.svg" alt="" width="28" height="28" decoding="async" />' +
      '<div class="studio-chat__bubble"><p class="studio-chat__name">Easily</p><p></p></div>';
    const bubble = msg.querySelector(".studio-chat__bubble");
    const p = msg.querySelector("p:last-child");
    p.style.whiteSpace = "pre-line";
    p.textContent = text;
    if (chips && chips.length) {
      const wrap = document.createElement("div");
      wrap.className = "studio-chat__chips";
      wrap.setAttribute("role", "group");
      wrap.setAttribute("aria-label", "Snabbval");
      chips.forEach(function (chip) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "studio-chat__chip";
        btn.textContent = chip.label;
        btn.setAttribute("data-edit-chip", chip.command || chip.label);
        wrap.appendChild(btn);
      });
      bubble.appendChild(wrap);
    }
    thread.appendChild(msg);
    thread.scrollTop = thread.scrollHeight;
    updateChatLayout();
  }

  function clearPreviewSelection() {
    selectedSectionId = null;
    document.querySelectorAll(".is-preview-selected").forEach(function (el) {
      el.classList.remove("is-preview-selected");
    });
    document.querySelectorAll(".studio-section-pin").forEach(function (el) {
      el.remove();
    });
    document.querySelectorAll(".studio-chat__section-pick.is-selected").forEach(function (el) {
      el.classList.remove("is-selected");
    });
    clearPreviewHoverLabels();
    updateSectionSelectionUi();
  }

  function updateSectionSelectionUi() {
    const bar = document.getElementById("studioSectionSelection");
    const labelEl = document.getElementById("studioSectionSelectionLabel");
    const descArea = document.getElementById("welcomeBusinessDescription");
    if (!bar) return;

    if (!selectedSectionId || chatPhase !== "edit") {
      bar.hidden = true;
      if (descArea && chatPhase === "edit") {
        descArea.placeholder = EDIT_PLACEHOLDER;
      }
      return;
    }

    const label =
      SECTION_CHIP_LABELS[selectedSectionId] ||
      SECTION_MAP_LABELS[selectedSectionId] ||
      selectedSectionId;
    bar.hidden = false;
    if (labelEl) labelEl.textContent = label + " vald";
    if (descArea) {
      descArea.placeholder = "Skriv vad du vill ändra i " + label.toLowerCase() + "…";
    }

    document.querySelectorAll(".studio-chat__section-pick").forEach(function (btn) {
      btn.classList.toggle("is-selected", btn.getAttribute("data-section-chip") === selectedSectionId);
    });
  }

  function clearSectionSelection() {
    highlightPreviewSection(null, { dispatch: true, scroll: false });
    updateSectionSelectionUi();
  }

  function bindSectionSelectionClose() {
    const closeBtn = document.getElementById("studioSectionSelectionClose");
    if (!closeBtn || closeBtn.dataset.bound === "1") return;
    closeBtn.dataset.bound = "1";
    closeBtn.addEventListener("click", function () {
      clearSectionSelection();
    });
  }

  function highlightPreviewSection(el) {
    clearPreviewSelection();
    if (!el) {
      selectedSectionId = null;
      return;
    }
    selectedSectionId = el.getAttribute("data-section");
    if (selectedSectionId && global.EditSession && typeof global.EditSession.setContext === "function") {
      global.EditSession.setContext({
        page: "home",
        section: selectedSectionId,
        object: "text",
        task: "change_text",
      });
    }
    el.classList.add("is-preview-selected");
    const label = el.getAttribute("data-section-label") || selectedSectionId || "";
    if (!label) return;
    const pin = document.createElement("span");
    pin.className = "studio-section-pin";
    pin.textContent = label;
    if (getComputedStyle(el).position === "static") el.style.position = "relative";
    el.appendChild(pin);
    document.dispatchEvent(
      new CustomEvent("studio:section-selected", { detail: { sectionId: selectedSectionId } })
    );
  }

  function bindPreviewSectionSelect() {
    const main = document.getElementById("siteMain");
    const foot = document.getElementById("siteFooter");
    if (!main || main.dataset.previewSelectBound === "1") return;
    main.dataset.previewSelectBound = "1";

    function onSectionClick(e) {
      if (!hasGeneratedSite()) return;
      const section = e.target.closest("[data-section]");
      if (!section) return;
      if (!main.contains(section) && section !== foot) return;
      e.preventDefault();
      highlightPreviewSection(section);
    }

    main.addEventListener("click", onSectionClick);
    if (foot) foot.addEventListener("click", onSectionClick);
  }

  function inferSectionFromCommand(cmd) {
    const lower = cmd.toLowerCase();
    for (const id in SECTION_ALIASES) {
      if (SECTION_ALIASES[id].some(function (term) { return lower.indexOf(term) !== -1; })) return id;
    }
    return null;
  }

  function wantsSectionRegeneration(cmd) {
    return /skriv om|generera om|ny text|nytt innehåll|förnya|gör om|uppdatera med ny|byt text/i.test(cmd);
  }

  /** Bara «välj hero» / «uppdatera tjänster» utan att säga vad — markera, ändra inte. */
  function isSectionSelectOnly(cmd, sectionId) {
    if (!sectionId) return false;
    if (wantsSectionRegeneration(cmd)) return false;
    const lower = cmd.toLowerCase().trim();
    if (/(bild|foto|hero-bild|herobild)/.test(lower)) return false;
    const label = (SECTION_CHIP_LABELS[sectionId] || sectionId).toLowerCase();
    if (/^(välj|uppdatera|ändra|edit)\s+/.test(lower)) {
      const rest = lower.replace(/^(välj|uppdatera|ändra|edit)\s+/, "").trim();
      if (rest === label || rest === sectionId) return true;
      if (SECTION_ALIASES[sectionId]?.some(function (term) { return rest === term; })) return true;
    }
    if (lower === label || lower === sectionId) return true;
    return false;
  }

  function selectSectionForEditing(sectionId, opts) {
    opts = opts || {};
    if (!sectionId) return;
    releaseChatUi();
    selectedSectionId = sectionId;
    const el = document.querySelector('[data-section="' + sectionId + '"]');
    if (el) highlightPreviewSection(el, { fromUser: true });

    const chipLabel = SECTION_CHIP_LABELS[sectionId] || sectionId;
    const descArea = document.getElementById("welcomeBusinessDescription");
    if (descArea) descArea.value = "";

    updateSectionSelectionUi();

    if (opts.assistantMessage !== false) {
      appendAssistantMessage(
        chipLabel +
          " är vald. Inget har ändrats än. Skriv vad du vill ha annorlunda och tryck Skicka — klicka Stäng om du valde fel.",
      );
    }
  }

  function enterEditMode(opts) {
    opts = opts || {};
    chatPhase = "edit";
    const pane = getCreatePane();
    if (pane) pane.hidden = false;
    document.body.classList.add("studio-shell--create-active");
    document.body.dataset.studioPhase = "edit";

    const descArea = document.getElementById("welcomeBusinessDescription");
    const btn = document.getElementById("welcomeGenerateBtn");
    const skip = document.getElementById("welcomeSkipBtn");
    const disclaimer = document.querySelector(".studio-chat__disclaimer");

    if (descArea) {
      descArea.placeholder = EDIT_PLACEHOLDER;
    }
    if (btn) btn.textContent = "Skicka";
    if (skip) skip.hidden = true;
    updateRebuildButtonVisibility();
    if (disclaimer) {
      disclaimer.textContent = "Ctrl+Z ångrar. AI kan byta text och bilder — exakt redigering under Ändra själv.";
    }

    for (let step = 1; step <= 5; step++) {
      const stepEl = document.getElementById("studioCreateStep" + step);
      if (stepEl) stepEl.hidden = true;
    }

    bindSectionSelectionClose();

    if (global.StudioPanelModes && typeof global.StudioPanelModes.refreshManualPanel === "function") {
      global.StudioPanelModes.refreshManualPanel();
    }

    setChatIntro(EDIT_WELCOME_MSG);
    startChatTipsRotation();
    prefillEditDescriptionFromSite();
    updateRebuildButtonVisibility();

    if (!opts.skipIntro) {
      const explore =
        global.EditSession && typeof global.EditSession.buildExploreChips === "function"
          ? global.EditSession.buildExploreChips()
          : [
              { label: "Byt hero-bild", command: "byt hero-bild" },
              { label: "Bild i Om oss", command: "byt om oss-bild" },
              { label: "Justera rubriken", command: "skriv om hero-rubriken" },
              { label: "Byt logotyp", command: "uppdatera logotypen" },
            ];
      appendAssistantMessage(
        "Jag är din webbdesigner — säg vad du vill ändra, var som helst på sidan.\n\nVi kan börja här, eller hoppa direkt till något annat:",
        explore.slice(0, 5),
      );
      if (global.EditSession && typeof global.EditSession.setFocus === "function") {
        global.EditSession.setFocus("hero", "image", "change_image");
      }
    }

    requestAnimationFrame(function () {
      try {
        if (descArea) descArea.focus({ preventScroll: true });
      } catch (e) {
        /* ignore */
      }
    });
  }

  function showGeneratedSite() {
    if (global.ProjectIsolation && typeof global.ProjectIsolation.endNewGeneration === "function") {
      global.ProjectIsolation.endNewGeneration();
    }
    delete document.documentElement.dataset.studioPreviewPending;
    setPreviewLive(true);
    setPreviewState(PREVIEW.SITE);
    enterEditMode({ skipIntro: true });
    requestAnimationFrame(function () {
      if (global.StudioPanelModes && typeof global.StudioPanelModes.refreshManualPanel === "function") {
        global.StudioPanelModes.refreshManualPanel();
      }
    });
  }

  function toast(msg, kind, ms) {
    if (typeof global.showStudioToast === "function") global.showStudioToast(msg, kind, ms);
  }

  function isCdCreateNotReadyError(err) {
    const code = global.CreateCdGate && global.CreateCdGate.CD_NOT_READY;
    return !!(
      err &&
      (err.message === "cd_create_not_ready" ||
        err.code === "cd_create_not_ready" ||
        (code && err.message === code))
    );
  }

  function isCdBriefGuardError(err) {
    const G = global.CdExecutorGuard;
    if (!err) return false;
    const codes = [
      "cd_brief_not_locked",
      "cd_forbidden_creative_source",
      "cd_invalid_brief_state",
    ];
    if (G) {
      if (G.CD_BRIEF_NOT_LOCKED) codes.push(G.CD_BRIEF_NOT_LOCKED);
      if (G.CD_FORBIDDEN_CREATIVE_SOURCE) codes.push(G.CD_FORBIDDEN_CREATIVE_SOURCE);
      if (G.CD_INVALID_BRIEF_STATE) codes.push(G.CD_INVALID_BRIEF_STATE);
    }
    return codes.indexOf(err.message) !== -1 || codes.indexOf(err.code) !== -1;
  }

  function toastGenerationError(err) {
    if (isCdCreateNotReadyError(err)) {
      toast(
        "Creative Director-create är aktiverat men inte redo än. Använd ?cdCreate=0 för legacy-läge.",
        "info",
        5200,
      );
      return;
    }
    if (isCdBriefGuardError(err)) {
      if (err.code === "cd_brief_not_locked" || err.message === "cd_brief_not_locked") {
        toast(
          "Brief är inte låst — executors körs inte på CD-vägen. Dev: ?cdTestBrief=1",
          "info",
          5200,
        );
      } else if (
        err.code === "cd_forbidden_creative_source" ||
        err.message === "cd_forbidden_creative_source"
      ) {
        toast("Förbjuden kreativ källa på CD-vägen.", "info", 4800);
      } else {
        toast("Ogiltigt brief-tillstånd på CD-vägen.", "info", 4800);
      }
      return;
    }
    if (err && err.message === "timeout") {
      toast("Det tog för lång tid. Försök igen.", "info", 4200);
      return;
    }
    if (err && err.message === "generation_integrity_failed" && err.integrity) {
      toast(
        "Sidan blev inte komplett — prova igen med t.ex. verksamhet, ort och företagsnamn.",
        "info",
        4800,
      );
      return;
    }
    toast("Något gick fel. Försök igen.", "info", 3600);
  }

  function getCreateMode() {
    const hidden = document.getElementById("welcomeCreateMode");
    if (hidden && hidden.value === "improve") return "improve";
    return "new";
  }

  function appendUserMessage(text) {
    const thread = document.getElementById("studioChatThread");
    if (!thread || !text) return;
    const msg = document.createElement("div");
    msg.className = "studio-chat__msg studio-chat__msg--user";
    msg.innerHTML =
      '<div class="studio-chat__bubble"><p class="studio-chat__name">Du</p><p></p></div>';
    msg.querySelector("p:last-child").textContent = text;
    thread.appendChild(msg);
    thread.scrollTop = thread.scrollHeight;
    updateChatLayout();
  }

  function setPreviewLive(live) {
    if (live) document.body.dataset.studioPreviewLive = "1";
    else delete document.body.dataset.studioPreviewLive;
  }

  /** Neutral loading canvas — preview DOM hidden, no previous project visible. */
  function enterGenerationCanvas() {
    clearPreviewSiteDom();
    setPreviewState(PREVIEW.LOADING);
    setPreviewLive(false);
    document.documentElement.dataset.studioPreviewPending = "1";
    const EE = global.EditorEngine;
    if (EE && typeof EE.cancelPendingRemounts === "function") {
      EE.cancelPendingRemounts();
    }
  }

  function showProgress(stepIndex) {
    const el = document.getElementById("studioCreateProgress");
    const textEl = document.getElementById("studioCreateProgressText");
    const pane = getCreatePane();
    const compose = document.getElementById("studioChatCompose");
    if (!el) return;
    el.hidden = false;
    el.setAttribute("aria-busy", "true");
    if (pane) pane.classList.add("is-generating");
    if (compose) compose.hidden = true;
    document.body.classList.add("studio-shell--generating");
    setPreviewState(PREVIEW.LOADING);
    const freshCreate =
      document.documentElement.dataset.studioCreateGeneration === "1" ||
      (global.ProjectIsolation && global.ProjectIsolation.isGeneratingNewWebsite &&
        global.ProjectIsolation.isGeneratingNewWebsite());
    setPreviewLive(!freshCreate && stepIndex >= 1);
    setPreviewLoadingText(stepIndex);
    if (textEl) textEl.textContent = PROGRESS_STEPS[stepIndex] || PROGRESS_STEPS[0];
    const thread = document.getElementById("studioChatThread");
    if (thread) thread.scrollTop = thread.scrollHeight;
  }

  function hideProgress() {
    const el = document.getElementById("studioCreateProgress");
    const pane = getCreatePane();
    const compose = document.getElementById("studioChatCompose");
    if (!el) return;
    el.hidden = true;
    el.setAttribute("aria-busy", "false");
    if (pane) pane.classList.remove("is-generating");
    if (compose) compose.hidden = false;
    document.body.classList.remove("studio-shell--generating");
    document.documentElement.classList.remove("studio-is-generating");
    const inlineToolbar = document.getElementById("inlineToolbar");
    if (inlineToolbar) inlineToolbar.hidden = true;
    setPreviewLive(false);
    if (
      document.body.dataset.studioPreview === "loading" &&
      document.body.dataset.studioPhase === "edit"
    ) {
      const main = document.getElementById("siteMain");
      if (main && main.querySelector(".site-section")) {
        setPreviewState(PREVIEW.SITE);
      }
    }
  }

  /** Släpper skicka-knapp, chat-ruta och ev. laddningsläge efter varje AI-svar. */
  function releaseChatUi() {
    hideProgress();
    const btn = document.getElementById("welcomeGenerateBtn");
    if (btn) {
      btn.disabled = false;
      btn.classList.remove("is-busy");
      btn.removeAttribute("aria-busy");
    }
    const compose = document.getElementById("studioChatCompose");
    if (compose) compose.hidden = false;
    const main = document.getElementById("siteMain");
    if (main && main.querySelector(".site-section")) {
      setPreviewState(PREVIEW.SITE);
    }
  }

  function prefillEditDescriptionFromSite() {
    const descArea = document.getElementById("welcomeBusinessDescription");
    const rebuildBtn = document.getElementById("welcomeRebuildBtn");
    const AI = global.AISiteBuilder;
    const SS = global.SiteState;
    if (!SS || !AI || typeof AI.guessBriefFromDocument !== "function") return;
    const doc = SS.get && SS.get();
    const guess = AI.guessBriefFromDocument(doc);
    if (!guess) return;
    if (looksLikeImageRequest(guess)) return;
    if (rebuildBtn) rebuildBtn.dataset.rebuildBrief = guess;
    if (descArea) {
      descArea.value = "";
      descArea.placeholder = EDIT_PLACEHOLDER;
    }
  }

  function heroDbg() {
    return global.HeroImageDebug || null;
  }

  async function refreshPreviewAfterHeroChange() {
    const EE = global.EditorEngine;
    const dbg = heroDbg();
    if (EE && typeof EE.remountAsync === "function") {
      await EE.remountAsync();
    } else if (EE && typeof EE.remount === "function") {
      EE.remount();
      await new Promise(function (resolve) {
        setTimeout(resolve, 80);
      });
    }
    if (EE && typeof EE.syncHeroFromState === "function") {
      EE.syncHeroFromState();
      dbg && dbg.log("PREVIEW_SYNC", "syncHeroFromState() efter remount");
    }
    scrollPreviewToTop();
    if (dbg && typeof dbg.waitForHeroPhotoLoad === "function") {
      return dbg.waitForHeroPhotoLoad();
    }
    return dbg ? dbg.verifyPreview() : { ok: true };
  }

  function heroPipelineOk(stateUrl, previewCheck) {
    return !!(stateUrl && previewCheck && previewCheck.ok);
  }

  function updateRebuildButtonVisibility() {
    const rebuildBtn = document.getElementById("welcomeRebuildBtn");
    if (!rebuildBtn) return;
    rebuildBtn.hidden = !hasGeneratedSite();
  }

  function syncSiteIndustryFromSignals() {
    const AI = global.AISiteBuilder;
    const SS = global.SiteState;
    const EE = global.EditorEngine;
    if (!AI || !SS || !SS.patch || typeof AI.syncIndustryInDocument !== "function") return false;
    let changed = false;
    SS.patch(function (d) {
      changed = AI.syncIndustryInDocument(d);
    });
    if (changed) {
      SS.save();
      SS.applyPageToBody && SS.applyPageToBody();
      EE && EE.remount && EE.remount();
    }
    return changed;
  }

  /** Stock images only for components the user has not accepted yet. */
  function applyStockImagesRespectingLocks(doc, opts) {
    const VS = global.VisualStock;
    const ES = global.EditSession;
    if (!doc || !VS || typeof VS.applyToDocument !== "function") return;
    const lock = ES && typeof ES.isComponentLocked === "function" ? ES.isComponentLocked.bind(ES) : function () {
      return false;
    };
    const keep = {
      hero: lock("hero:image") ? String((doc.page && doc.page.heroBgUrl) || "") : "",
      about: lock("about:image") ? String((doc.sections && doc.sections.about && doc.sections.about.imageUrl) || "") : "",
      gallery:
        lock("gallery:image") && doc.sections && doc.sections.gallery && doc.sections.gallery.images
          ? doc.sections.gallery.images.slice()
          : null,
      services:
        lock("services:image") && doc.sections && doc.sections.services && doc.sections.services.cards
          ? doc.sections.services.cards.map(function (c) {
              return (c && c.img) || "";
            })
          : null,
    };
    VS.applyToDocument(doc, opts);
    if (keep.hero && doc.page) {
      doc.page.heroBgUrl = keep.hero;
      if (doc.page.material) doc.page.material.heroImageUrl = keep.hero;
    }
    if (keep.about && doc.sections && doc.sections.about) {
      doc.sections.about.imageUrl = keep.about;
      if (doc.page && doc.page.material) doc.page.material.aboutImageUrl = keep.about;
    }
    if (keep.gallery && doc.sections && doc.sections.gallery) {
      doc.sections.gallery.images = keep.gallery.slice();
      if (doc.page && doc.page.material) doc.page.material.galleryImages = keep.gallery.slice();
    }
    if (keep.services && doc.sections && doc.sections.services && Array.isArray(doc.sections.services.cards)) {
      keep.services.forEach(function (url, i) {
        if (doc.sections.services.cards[i] && url) doc.sections.services.cards[i].img = url;
      });
      if (doc.page && doc.page.material) {
        doc.page.material.serviceImages = keep.services.slice();
      }
    }
  }

  async function fillSectionIfUnlocked(AI, sectionId) {
    const ES = global.EditSession;
    const key = sectionId + ":text";
    if (ES && typeof ES.isComponentLocked === "function" && ES.isComponentLocked(key)) return;
    if (AI && typeof AI.fillSection === "function") await AI.fillSection(sectionId);
  }

  function chatContextFresh() {
    return chatActionContext.at > 0 && Date.now() - chatActionContext.at < CHAT_CONTEXT_TTL_MS;
  }

  function lastUserMessageInThread() {
    const thread = document.getElementById("studioChatThread");
    const msgs = thread ? thread.querySelectorAll(".studio-chat__msg--user p:last-child") : [];
    if (!msgs.length) return "";
    return String(msgs[msgs.length - 1].textContent || "").trim();
  }

  function findLastUserImageRequestInThread() {
    const thread = document.getElementById("studioChatThread");
    if (!thread) return null;
    const msgs = thread.querySelectorAll(".studio-chat__msg--user p:last-child");
    for (let i = msgs.length - 1; i >= 0; i--) {
      const t = String(msgs[i].textContent || "").trim();
      if (looksLikeImageRequest(t)) return t;
    }
    return null;
  }

  function looksLikeImageRetry(text) {
    const s = String(text || "").trim().toLowerCase();
    return /^(pröva|prova|försök|forsok|try)\s+(igen|om|på nytt|pa nytt)|^igen$|^retry$|^once more$/.test(s);
  }

  function looksLikeImageRequest(text) {
    const raw = String(text || "").trim();
    const s = raw.toLowerCase();
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
    if (/(bild|foto|hero).*(lägg|sätt|byt|ändra|in|snickare|sniock|hammare|bakgrund|hantverk|galleri|kort)/.test(s)) {
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

  function normalizeImageCommand(text) {
    const t = String(text || "").trim();
    const lower = t.toLowerCase();
    if (!t) return t;
    if (/hero|topp|första|start|banner|huvud/.test(lower)) return t;
    if (/(galleri|gallery)/.test(lower)) return t;
    if (/(tjänstekort|servicekort|kort)/.test(lower)) return t;
    if (/(om oss|about)/.test(lower)) return t;
    return t + " i hero";
  }

  async function executeImageRequestFromChat(text, opts) {
    opts = opts || {};
    const MS = global.MaterialSystem;
    const dbg = heroDbg();
    dbg && dbg.clear();
    dbg && dbg.log("AI_COMMAND", text);

    if (!MS) {
      dbg && dbg.log("ABORT", "MaterialSystem saknas");
      return false;
    }

    const raw = String(text || "").trim();
    if (!raw) {
      dbg && dbg.log("ABORT", "Tomt kommando");
      return false;
    }

    rememberUserImageRequest(raw);

    const HIU = global.HeroImageUrl;
    const SS0 = global.SiteState;
    if (HIU && SS0 && SS0.get && SS0.patch && typeof HIU.isCorrupt === "function") {
      const doc0 = SS0.get();
      const corrupt = doc0 && doc0.page && doc0.page.heroBgUrl;
      if (corrupt && HIU.isCorrupt(corrupt)) {
        dbg && dbg.log("SANITIZE_CORRUPT", corrupt.slice(0, 80));
        const fixed = HIU.sanitizeStored(corrupt, doc0);
        if (fixed) {
          SS0.patch(function (doc) {
            if (!doc.page) doc.page = {};
            doc.page.heroBgUrl = fixed;
            if (doc.page.material) doc.page.material.heroImageUrl = fixed;
          });
          SS0.save();
        }
      }
    }

    let handlerName = "";
    let imageUrl = "";
    let handlerMessage = "";

    async function finalizeOk(sourceText, message) {
      const previewCheck = await refreshPreviewAfterHeroChange();
      const stateUrl = dbg ? dbg.readStateHeroUrl() : "";
      const ok = heroPipelineOk(stateUrl, previewCheck);
      dbg &&
        dbg.printChainSummary({
          command: raw,
          handler: handlerName,
          imageUrl: imageUrl || stateUrl,
          preview: previewCheck,
          success: ok,
        });
      if (ok) {
        noteImageRequestHandled(sourceText || raw);
        if (!opts.skipMessage) {
          appendAssistantMessage(message || "Jag har uppdaterat hero-bilden.\n\nVad tycker du?");
        }
        return true;
      }
      dbg && dbg.log("CHAIN_FAIL", { stateUrl: stateUrl, preview: previewCheck });
      return false;
    }

    if (typeof MS.handleMaterialChatCommand === "function") {
      let result = MS.handleMaterialChatCommand(raw);
      if (result) {
        handlerName = "MaterialSystem.handleMaterialChatCommand";
        handlerMessage = result.message || "";
        imageUrl = dbg ? dbg.readStateHeroUrl() : "";
        if (result.ok !== false) {
          return finalizeOk(raw, handlerMessage);
        }
        dbg && dbg.log("HANDLER_FAIL", handlerMessage);
      }

      const normalized = normalizeImageCommand(raw);
      if (normalized !== raw) {
        dbg && dbg.log("NORMALIZED_CMD", normalized);
        result = MS.handleMaterialChatCommand(normalized);
        if (result) {
          handlerName = "MaterialSystem (normaliserat)";
          handlerMessage = result.message || "";
          imageUrl = dbg ? dbg.readStateHeroUrl() : "";
          if (result.ok !== false) {
            return finalizeOk(raw, handlerMessage);
          }
        }
      }
    }

    if (typeof MS.handleHeroImageChatCommand === "function") {
      const heroResult = MS.handleHeroImageChatCommand(normalizeImageCommand(raw));
      if (heroResult && heroResult.ok !== false) {
        handlerName = "handleHeroImageChatCommand";
        handlerMessage = heroResult.message || "";
        imageUrl = dbg ? dbg.readStateHeroUrl() : "";
        return finalizeOk(raw, handlerMessage);
      }
    }

    if (typeof MS.applyHeroStockImage === "function" && MS.applyHeroStockImage(raw)) {
      handlerName = "applyHeroStockImage";
      imageUrl = dbg ? dbg.readStateHeroUrl() : "";
      dbg && dbg.log("IMAGE_FOUND", imageUrl);
      return finalizeOk(raw, "Jag har lagt in en hero-bild som passar sidan.\n\nVad tycker du?");
    }

    const failPreview = await refreshPreviewAfterHeroChange();
    const failStateUrl = dbg ? dbg.readStateHeroUrl() : "";
    dbg &&
      dbg.printChainSummary({
        command: raw,
        handler: handlerName || "ingen",
        imageUrl: imageUrl || "",
        preview: failPreview,
        success: heroPipelineOk(failStateUrl, failPreview) && !!handlerName,
      });
    return false;
  }

  function rememberUserImageRequest(text) {
    const t = String(text || "").trim();
    if (!t || !looksLikeImageRequest(t)) return;
    chatActionContext.lastUserImageRequest = t;
    chatActionContext.imageRequestHandled = false;
    chatActionContext.at = Date.now();
  }

  function noteAssistantAction(action) {
    chatActionContext.lastAssistantAction = action;
    chatActionContext.at = Date.now();
    const lastUser = lastUserMessageInThread();
    if (looksLikeImageRequest(lastUser)) {
      chatActionContext.lastUserImageRequest = lastUser;
      chatActionContext.imageRequestHandled = false;
      if (action === "design" || action === "color" || action === "design_ask" || action === "generic_reply") {
        chatActionContext.lastWrongAction = action === "design_ask" ? "design" : action;
      }
      if (action === "rebuild") {
        chatActionContext.lastWrongAction = "rebuild";
      }
    }
  }

  function noteImageRequestHandled(text) {
    rememberUserImageRequest(text);
    chatActionContext.imageRequestHandled = true;
    chatActionContext.lastWrongAction = null;
    chatActionContext.lastAssistantAction = "image_ok";
  }

  function hasRecentImageRequest() {
    const retryText =
      chatActionContext.lastUserImageRequest || findLastUserImageRequestInThread();
    return !!(retryText && chatContextFresh() && !chatActionContext.imageRequestHandled);
  }

  function hasPendingImageCorrection() {
    if (!hasRecentImageRequest()) return false;
    if (chatActionContext.lastWrongAction) return true;
    return (
      chatActionContext.lastAssistantAction === "design" ||
      chatActionContext.lastAssistantAction === "design_ask" ||
      chatActionContext.lastAssistantAction === "generic_reply" ||
      chatActionContext.lastAssistantAction === "color" ||
      chatActionContext.lastAssistantAction === "rebuild" ||
      chatActionContext.lastAssistantAction === "image_failed"
    );
  }

  function resolveRetryImageText(text) {
    if (looksLikeWrongHeroImageFeedback(text)) {
      return "byt hero-bild till snickare med verktyg och trä";
    }
    if (looksLikeMissingHeroImageComplaint(text)) {
      return buildHeroRetryFromDoc();
    }
    return (
      chatActionContext.lastUserImageRequest ||
      findLastUserImageRequestInThread() ||
      (looksLikeImageRequest(text) ? String(text || "").trim() : null) ||
      buildHeroRetryFromDoc()
    );
  }

  function looksLikeColorChangeRequest(text) {
    const s = String(text || "").toLowerCase().trim();
    if (!s) return false;
    if (/^(byt|ändra|väl|välj|change)\s+(färg|färger|färgtema|palett|färguppsättning)/.test(s)) return true;
    if (/färgerna|färgtema|färguppsättning|färgschema/.test(s) && /(byt|ändra|väl|välj|annan|ny|inte|går inte|fungerar inte)/.test(s)) {
      return true;
    }
    if (/går inte.*byta färg|kan inte.*byta färg|färg.*går inte|färg.*fungerar inte/.test(s)) return true;
    if (
      /(vill inte ha|inte ha|inte gillar|gillar inte|utan|för mycket|for mycket)/.test(s) &&
      /(bl[aå]|r[oö]d|gr[oö]n|gul|lila|rosa|gr[aå]|m[oö]rk|ljus|f[aä]rg|tema|stämning|stamning)/.test(s)
    ) {
      return true;
    }
    if (/(bl[aå]|r[oö]d|gr[oö]n|gul|lila|f[aä]rg|tema)/.test(s) && /(inte|annan|annat|byt|ändra|vill)/.test(s)) {
      return true;
    }
    return false;
  }

  function applyColorChangeFromChat(opts) {
    opts = opts || {};
    const userText = String((opts && (opts.userText || opts.command)) || "").trim();
    const SS = global.SiteState;
    const DF = global.DesignFamilies;
    const EE = global.EditorEngine;
    if (!SS || !SS.patch) {
      return { ok: false, label: "" };
    }
    const page = SS.get && SS.get()?.page;
    if (!page) return { ok: false, label: "" };

    const cur = page.designColorSetId;
    let nextSet = null;
    if (DF && typeof DF.pickAlternativeColorSet === "function") {
      nextSet = DF.pickAlternativeColorSet(page.industry, cur, userText);
    }
    if (!nextSet && DF && typeof DF.recommendForIndustry === "function") {
      const rec = DF.recommendForIndustry(page.industry);
      nextSet = rec.secondary && rec.secondary.id !== cur ? rec.secondary : rec.primary;
    }
    if (!nextSet || !nextSet.id) return { ok: false, label: "" };

    chatActionContext.imageRequestHandled = true;
    chatActionContext.lastWrongAction = null;
    noteAssistantAction("color");

    SS.patch(function (doc) {
      if (!doc.page) doc.page = {};
      if (DF && typeof DF.applyCohesiveDesignToPage === "function") {
        DF.applyCohesiveDesignToPage(doc.page, nextSet.id, doc.page.industry, {
          preserveSiteComposition: true,
        });
      } else if (global.DesignPanel && typeof global.DesignPanel.applyFamily === "function") {
        global.DesignPanel.applyFamily(nextSet.id, { skipSave: true });
      }
    });
    if (DF && typeof DF.applyToPreviewDOM === "function" && SS.get) {
      const after = SS.get().page;
      if (after) DF.applyToPreviewDOM(after);
    } else if (SS.applyPageToBody) {
      SS.applyPageToBody();
    }
    if (EE && typeof EE.remount === "function") {
      EE.remount();
    }
    if (global.DesignPanel && typeof global.DesignPanel.refresh === "function") {
      global.DesignPanel.refresh();
    }
    SS.save();

    const motivation =
      nextSet.motivation ||
      (SS.get && SS.get()?.page && SS.get().page.designMotivation) ||
      "";
    const label =
      nextSet.label ||
      (DF && typeof DF.colorSetLabel === "function"
        ? DF.colorSetLabel(nextSet.id, page.industry)
        : nextSet.id);
    if (!opts.skipMessage) {
      appendAssistantMessage(
        motivation ||
          "Jag bytte till " + label + " — hela webbplatsen följer det nya temat.",
      );
    }
    return { ok: true, label: label, motivation: motivation, setId: nextSet.id };
  }

  function looksLikeWrongHeroImageFeedback(text) {
    const s = String(text || "").toLowerCase().trim();
    if (/känns inte som en snickare|kans inte som en snickare/.test(s)) return true;
    if (/vet inte.*(snickare|ai)|hur en snickare ser|inte som snickare|fel typ av bild|ai vet inte/.test(s)) {
      return true;
    }
    if (
      /(känns inte|kans inte|inte som en|fel bild|inte en snickare|inte snickare|mer som|för abstrakt|ritning|arkitekt|planritning|kontor)/.test(
        s
      ) &&
      /(snickare|hantverk|bild|hero|foto|verktyg|trä|tra|bygg|snick)/.test(s)
    ) {
      return true;
    }
    return false;
  }

  function isChatComplaintNotBrief(text) {
    if (looksLikeMissingHeroImageComplaint(text)) return true;
    const s = String(text || "").toLowerCase().trim();
    if (/^(det finns|det saknas|varför|ingen bild|inga bilder|saknas bild)/.test(s)) return true;
    if (/inga bilder|finns inga bild|saknas bilder|utan bilder|tom hero|gr[aå] bakgrund|gr[aå] hero/.test(s)) return true;
    return false;
  }

  function isValidBusinessBrief(text) {
    const GI = global.GenerationIntegrity;
    if (GI && typeof GI.isValidBusinessBrief === "function") {
      return GI.isValidBusinessBrief(text);
    }
    const raw = String(text || "").trim();
    return raw.length >= 8 && !looksLikeImageRequest(raw);
  }

  function resolveBusinessBrief(text, doc) {
    const raw = String(text || "").trim();
    const AI = global.AISiteBuilder;
    const stored = doc && doc.page && doc.page.onboardingDescription;
    const storedBrief = stored ? String(stored).trim() : "";

    if (raw && isValidBusinessBrief(raw) && !isChatComplaintNotBrief(raw)) {
      return raw;
    }
    if (storedBrief && isValidBusinessBrief(storedBrief)) {
      return storedBrief;
    }
    if (AI && typeof AI.guessBriefFromDocument === "function") {
      const guessed = AI.guessBriefFromDocument(doc) || "";
      if (isValidBusinessBrief(guessed)) return guessed;
    }
    return "";
  }

  function buildHeroRetryFromDoc() {
    const SS = global.SiteState;
    const doc = SS && SS.get && SS.get();
    const page = doc && doc.page;
    const brief = String((page && page.onboardingDescription) || "").trim();
    const ind = page && page.industry;
    if (brief.length >= 8) return "byt hero-bild — " + brief.slice(0, 140);
    if (ind === "miljo") return "byt hero-bild till återvinning och miljö";
    if (ind === "byggfirma") return "byt hero-bild till snickare och hantverk";
    if (ind === "hunddagis" || ind === "hundsalong") return "byt hero-bild till hundar och trygg miljö";
    return "byt hero-bild";
  }

  function looksLikeMissingHeroImageComplaint(text) {
    const s = String(text || "").toLowerCase();
    if (/^ingen bild$|^ingen bild där$|^ingen bild syns/.test(s.trim())) return true;
    if (/inga bilder|finns inga bild|saknas bilder|utan bilder|det finns inga/.test(s)) return true;
    if (/inte bytt|ej bytt|samma bild|ingen skillnad/.test(s)) return true;
    return (
      (/(ingen|inte|inget|saknas|syns inte|finns inte|funkar inte|fungerar inte|gjorde fel|fel du|menade inte|istället för|retar|sa att|fixade)/.test(
        s
      ) &&
        /(bild|foto|hero|bakgrund|grå)/.test(s)) ||
      /färg istället för bild|bytte färg.*bild|bild.*istället för färg/.test(s)
    );
  }

  function looksLikeUserCorrection(text) {
    const s = String(text || "").toLowerCase();
    if (!s) return false;

    if (/(gjorde fel|du gjorde fel|fel du|menade inte|inte det jag|istället för|du har rätt|det var fel|det blev fel)/.test(s)) {
      if (/(bild|foto|hero|färg|färger|design|snickare|hammare|grå)/.test(s)) return true;
    }
    if (/bytte färg.*bild|färg istället för bild|bild istället för färg/.test(s)) return true;
    if (/inte bytt|ej bytt|samma bild|ingen skillnad/.test(s)) return true;
    if (looksLikeWrongHeroImageFeedback(text)) return true;
    if (looksLikeMissingHeroImageComplaint(text)) return true;

    if (looksLikeColorChangeRequest(text)) return false;

    if (chatContextFresh() && (chatActionContext.lastWrongAction || chatActionContext.lastUserImageRequest)) {
      if (
        /(nej|du har rätt|retar|syns inte|finns inte|fungerar inte|funkar inte|fortfarande|grå|tom|sa att|fixade|lögn|inget hände|inte bytt|ej bytt)/.test(
          s
        )
      ) {
        return true;
      }
    }

    return false;
  }

  function correctionAckMessage() {
    const wrong = chatActionContext.lastWrongAction;
    const last = chatActionContext.lastAssistantAction;
    if (wrong === "rebuild" || last === "rebuild") {
      return "Jag fokuserar på hero-bilden nu.";
    }
    if (wrong === "design" || wrong === "color") {
      return "Vi tittar på hero-bilden i stället — jag testar igen.";
    }
    if (last === "image_ok" || last === "image_failed" || wrong === "image_failed") {
      return "Jag lägger in hero-bilden igen.";
    }
    return "Jag fixar hero-bilden nu.";
  }

  async function retryImageWithFeedback(retryText, ackMessage) {
    if (ackMessage) appendAssistantMessage(ackMessage);
    const ok = await executeImageRequestFromChat(retryText, { skipMessage: true });
    if (ok) {
      scrollPreviewToTop();
      const ES = global.EditSession;
      appendAssistantMessage(
        ES && typeof ES.buildVerifiedMessage === "function"
          ? ES.buildVerifiedMessage(ES.getContext())
          : "Jag har uppdaterat hero-bilden.\n\nVad tycker du?",
        ES && typeof ES.verificationChips === "function" ? ES.verificationChips(ES.getContext()) : undefined,
      );
      chatActionContext.lastWrongAction = null;
    } else {
      const ES = global.EditSession;
      appendAssistantMessage(
        ES && typeof ES.buildRetryMessage === "function"
          ? ES.buildRetryMessage(ES.getContext())
          : "Jag är inte nöjd med det resultatet heller.\n\nVill du att jag provar igen, eller beskriver du bilden på ett annat sätt?",
      );
      noteAssistantAction("image_failed");
    }
    return ok;
  }

  async function handleUserCorrection(text) {
    const s = String(text || "").toLowerCase();

    if (/fel.*text|konsult|inte snickare|blandas/.test(s) && !looksLikeMissingHeroImageComplaint(text)) {
      if (looksLikeFullRebuildRequest(text)) {
        await rebuildSiteFromBrief(text);
      } else {
        await adaptIndustryFromBrief(text, { refreshHero: true });
      }
      return true;
    }

    const retryText = resolveRetryImageText(text);
    if (!retryText) {
      appendAssistantMessage(
        "Jag hittar inte bildbegäran i chatten — skriv t.ex. «lägg in en bild på en snickare i hero».",
      );
      return true;
    }

    await retryImageWithFeedback(retryText, correctionAckMessage());
    return true;
  }

  function looksLikeWrongIndustryComplaint(text) {
    const s = String(text || "").toLowerCase();
    if (/(gör om|bygg om|hela sidan|allt är fel|blandas|blandat)/.test(s)) return true;
    if (/(inte snickare|inte en snickare|inte hantverk|fel bransch|konsulttext|konsult)/.test(s)) return true;
    if (/(whiteboard|mätbar effekt|workshop)/.test(s)) return true;
    return false;
  }

  /** Uttrycklig önskan om att riva och göra om allt — inte bara byta bransch/bilder. */
  function looksLikeFullRebuildRequest(text) {
    const s = String(text || "").trim().toLowerCase();
    if (!s) return false;
    if (/bygg om hela|gör om hela|hela sidan om|allt från början|riv och börja om|ny sida från scratch|starta om helt/.test(s)) {
      return true;
    }
    if (/^bygg om sidan$|^gör om sidan$/.test(s)) return true;
    return false;
  }

  function looksLikeBusinessRebrief(text) {
    const s = String(text || "").trim().toLowerCase();
    if (looksLikeImageRequest(text)) return false;
    if (/(lägg|sätt|byt|uppdatera|fixa|kan du|kan ni|gör).*(bild|foto|hero)/.test(s)) return false;
    if (/(bild|foto|hero).*(lägg|sätt|byt|in|på)/.test(s)) return false;
    if (/^(byt bild|ändra rubrik|ta bort|dölj|skriv om hero|skriv om tjänster|lägg in)/.test(s)) return false;
    if (looksLikeFullRebuildRequest(text)) return true;
    if (/(gör om|bygg om|anpassa sidan|ny verksamhet|ändra till)/.test(s)) return true;
    if (s.length < 18) return false;
    const hasBiz =
      /(jag har|jag h[aå]r|vi är|heter|håller till|finns i|verksamhet|företag|firma)/.test(s);
    const hasTrade =
      /(snick|bygg|frisör|salong|hund|restaurang|kafe|konsult|elektrik|vvs|tatuer|foto|gym|advokat|målare|tak|atervinning|återvinning|avfall|milj[oö]|recycl|sophämt)/.test(
        s,
      );
    return hasBiz && hasTrade;
  }

  function looksLikeIndustryBrief(text) {
    const raw = String(text || "").trim();
    if (!raw || raw.length < 8 || looksLikeImageRequest(raw)) return false;
    if (isChatComplaintNotBrief(raw)) return false;
    if (/^(byt bild|ändra rubrik|ta bort|dölj|gör elegant|pröva igen|bygg om hela)/i.test(raw)) return false;
    return isValidBusinessBrief(raw);
  }

  function shouldAdaptIndustryFromBrief(text) {
    if (!looksLikeIndustryBrief(text)) return false;
    const SS = global.SiteState;
    const AI = global.AISiteBuilder;
    if (!SS || !AI || typeof AI.inferIndustryFromDescription !== "function") return false;
    const doc = SS.get && SS.get();
    const prev = String((doc && doc.page && doc.page.onboardingDescription) || "")
      .trim()
      .toLowerCase();
    const next = String(text || "").trim();
    if (!isValidBusinessBrief(next)) return false;
    if (prev !== next.toLowerCase()) return true;
    const cur = (doc && doc.page && doc.page.industry) || "verksamhet";
    const inf = AI.inferIndustryFromDescription(text);
    return !!(inf && inf.key && inf.key !== cur);
  }

  /**
   * Byter bransch + stockbilder utan att röra texter du redan finslipat.
   * Hel ombyggnad: skriv «bygg om hela sidan» eller klicka «Bygg om hela sidan».
   */
  async function adaptIndustryFromBrief(briefText, opts) {
    opts = opts || {};
    const GL = global.GenerationLifecycle;
    const GI = global.GenerationIntegrity;
    if (GL && typeof GL.logPipelineStage === "function") {
      GL.logPipelineStage("INTENT", {
        input: { command: briefText, source: opts.pipeline ? "pipeline" : "chat" },
        output: null,
        validation: { ok: true },
      });
    }
    if (looksLikeImageRequest(briefText)) {
      if (GL && typeof GL.logPipelineStage === "function") {
        GL.logPipelineStage("INTENT", {
          input: { command: briefText },
          output: { routed: "hero.image" },
          validation: { ok: true, reason: "image_request_not_industry_brief" },
        });
      }
      if (opts.pipeline) {
        return executeImageRequestFromChat(briefText, { skipMessage: true });
      }
      return executeImageRequestFromChat(briefText);
    }
    if (isChatComplaintNotBrief(briefText)) {
      if (opts.resume) return false;
      await retryImageWithFeedback(
        buildHeroRetryFromDoc(),
        "Jag lägger in hero-bilden nu.",
      );
      return true;
    }
    const AI = global.AISiteBuilder;
    const SS = global.SiteState;
    const EE = global.EditorEngine;
    if (!AI || !SS) return false;

    const doc = SS.get && SS.get();
    const footer = doc && doc.sections && doc.sections.footer && doc.sections.footer.content;
    const siteBrand = footer && footer["footer-brand"];
    const brief =
      resolveBusinessBrief(briefText, doc) ||
      (typeof AI.guessBriefFromDocument === "function" ? AI.guessBriefFromDocument(doc) : "");
    if (GL && typeof GL.logPipelineStage === "function") {
      GL.logPipelineStage("BUSINESS_BRIEF", {
        input: { chat: briefText, stored: doc && doc.page && doc.page.onboardingDescription },
        output: { brief: brief },
        validation: {
          ok: !!(brief && isValidBusinessBrief(brief)),
          reason: brief ? "" : "no_valid_brief",
        },
      });
    }
    if (!brief || !isValidBusinessBrief(brief)) {
      if (!opts.pipeline && !opts.quiet) {
        appendAssistantMessage(
          "Skriv kort vilken verksamhet det gäller — t.ex. «återvinning OVH» eller «snickare i Solna».",
        );
      }
      return false;
    }

    const ctx =
      typeof AI.resolveCreateContext === "function"
        ? AI.resolveCreateContext(brief, { siteBrand: siteBrand })
        : { industry: "verksamhet", area: "other", brand: siteBrand || "", plan: null };

    const curIndustry = (doc && doc.page && doc.page.industry) || "verksamhet";
    const copyMismatch =
      typeof AI.siteHasIndustryCopyMismatch === "function" && AI.siteHasIndustryCopyMismatch(doc);
    if (ctx.industry === curIndustry && !opts.force && !copyMismatch) {
      if (!opts.pipeline && !opts.quiet) {
        appendAssistantMessage(
          "Sidan känns redan som en " +
            industryLabel(ctx.industry) +
            ". Vill du byta bilder, skriv t.ex. «byt hero-bild». Vill du göra om all text: «bygg om hela sidan».",
        );
      }
      return false;
    }

    if (!opts.pipeline && !opts.quiet) {
      appendAssistantMessage(
        copyMismatch
          ? "Jag anpassar texter och bilder så de matchar " + (ctx.brand || "företaget") + "."
          : "Jag ställer in sidan för " +
              industryLabel(ctx.industry) +
              (ctx.brand ? " — " + ctx.brand : "") +
              ". Nya bilder, men texter du redan skrivit lämnar jag.",
      );
    }

    showProgress(2);
    try {
      const ES = global.EditSession;
      SS.patch(function (d) {
        if (!d.page) d.page = {};
        d.page.industry = ctx.industry;
        d.page.area = ctx.area;
        d.page.onboardingDescription = brief.slice(0, 600);
        applyStockImagesRespectingLocks(d, { replaceStock: true, userText: brief });
        if (d.page.heroBgUrl) {
          if (!d.page.material) d.page.material = {};
          d.page.material.heroImageUrl = d.page.heroBgUrl;
        }
        if (
          (opts.refreshHero || copyMismatch || ctx.industry === "verksamhet") &&
          AI &&
          typeof AI.personalizeHeroFromBrief === "function" &&
          !(ES && ES.isComponentLocked && ES.isComponentLocked("hero:text"))
        ) {
          AI.personalizeHeroFromBrief(d, brief);
        }
      });
      applyBriefToDocument(brief, ctx, ctx.brand || siteBrand || "");
      SS.applyPageToBody && SS.applyPageToBody();

      const refreshText = opts.refreshHero || copyMismatch;
      if (refreshText && AI && typeof AI.fillSection === "function") {
        const runSections = async function () {
          if (copyMismatch) {
            await fillSectionIfUnlocked(AI, "hero");
            await fillSectionIfUnlocked(AI, "about");
            await fillSectionIfUnlocked(AI, "services");
          } else {
            await fillSectionIfUnlocked(AI, "hero");
          }
        };
        if (typeof AI.withMacroGeneration === "function") {
          await AI.withMacroGeneration(runSections);
        } else {
          await runSections();
        }
      }

      SS.save();
      if (EE && typeof EE.remountAsync === "function") {
        await EE.remountAsync();
      } else if (EE && EE.remount) {
        EE.remount();
      }
      if (EE && typeof EE.syncHeroFromState === "function") {
        EE.syncHeroFromState();
      }
      scrollPreviewToTop();
    } finally {
      hideProgress();
    }

    const integrityCtx = {
      brief: brief,
      brand: ctx.brand || siteBrand || "",
      industry: ctx.industry,
      chatFragments: [String(briefText || "").trim()].filter(Boolean),
    };
    const integrity =
      GI && typeof GI.validateDocument === "function"
        ? GI.validateDocument(SS.get && SS.get(), integrityCtx)
        : { ok: true, failures: [] };
    if (GL && typeof GL.logPipelineStage === "function") {
      GL.logPipelineStage("FINAL_VALIDATION", {
        input: integrityCtx,
        output: SS.get && SS.get(),
        validation: integrity,
      });
    }
    if (!integrity.ok) {
      if (!opts.pipeline && !opts.quiet) {
        appendAssistantMessage(
          "Jag kunde inte bekräfta att sidan blev korrekt — prova igen eller beskriv verksamheten tydligare.",
        );
      }
      return false;
    }

    if (!opts.pipeline && !opts.quiet) {
      appendAssistantMessage(
        "Klart — bilder och innehåll är uppdaterade. Rubriker och stycken du redan ändrat är kvar.\n\nVill du justera något mer?",
      );
    }
    return true;
  }

  async function rebuildSiteFromBrief(briefText, opts) {
    opts = opts || {};
    if (isChatComplaintNotBrief(briefText)) {
      await retryImageWithFeedback(
        buildHeroRetryFromDoc(),
        "Jag lägger in bilderna nu — du behöver inte göra om hela sidan för det.",
      );
      return true;
    }
    if (!opts.force && looksLikeImageRequest(briefText)) {
      const ok = await executeImageRequestFromChat(briefText);
      if (!ok) {
        appendAssistantMessage(
          "Jag kunde inte lägga in bilden just nu.\n\n" + IMAGE_FAIL_HINT,
        );
        noteAssistantAction("image_failed");
      }
      return ok;
    }
    const lastUser = lastUserMessageInThread();
    if (looksLikeImageRequest(lastUser)) {
      noteAssistantAction("rebuild");
    }
    const AI = global.AISiteBuilder;
    const SS = global.SiteState;
    if (!AI || !SS) return false;
    const doc = SS.get && SS.get();
    const footer = doc && doc.sections && doc.sections.footer && doc.sections.footer.content;
    const siteBrand = footer && footer["footer-brand"];
    const brief =
      resolveBusinessBrief(briefText, doc) ||
      (typeof AI.guessBriefFromDocument === "function" ? AI.guessBriefFromDocument(doc) : "");
    if (!brief) {
      if (!opts.pipeline && !opts.quiet) {
        appendAssistantMessage("Skriv kort vad verksamheten heter och gör — t.ex. «Snickerifirma Kalle Snickare i Solna».");
      }
      return false;
    }
    const ctx =
      typeof AI.resolveCreateContext === "function"
        ? AI.resolveCreateContext(brief, { siteBrand: siteBrand })
        : { industry: "verksamhet", area: "other", brand: siteBrand || "", plan: null };
    if (!opts.pipeline && !opts.quiet) {
      appendAssistantMessage(
        "Jag bygger om hela sidan som " +
          industryLabel(ctx.industry) +
          (ctx.brand ? " för " + ctx.brand : "") +
          " — all text, tjänster och bilder.",
      );
    }
    if (global.ProjectIsolation && typeof global.ProjectIsolation.prepareForNewGeneration === "function") {
      global.ProjectIsolation.prepareForNewGeneration({ source: "rebuild-from-brief", skipBeginNewProject: true });
    } else {
      enterGenerationCanvas();
    }
    try {
      await runMagicGeneration(ctx, ctx.brand || siteBrand || "", brief, "new");
    } catch (errRebuild) {
      if (isCdCreateNotReadyError(errRebuild)) {
        if (!opts.pipeline && !opts.quiet) {
          appendAssistantMessage(
            "Creative Director-create är aktiverat men inte redo än. Stäng av med ?cdCreate=0.",
          );
        }
        toastGenerationError(errRebuild);
        return false;
      }
      throw errRebuild;
    }
    showGeneratedSite();
    if (!opts.pipeline && !opts.quiet) {
      appendAssistantMessage("Jag har byggt om hela sidan.\n\nVad tycker du om helheten?");
    }
    return true;
  }

  async function retryHeroImageFromChat(text, opts) {
    opts = opts || {};
    const MS = global.MaterialSystem;
    const EE = global.EditorEngine;
    if (!MS) return false;
    syncSiteIndustryFromSignals();
    const retryText =
      String(text || "").trim() ||
      chatActionContext.lastUserImageRequest ||
      findLastUserImageRequestInThread() ||
      "lägg in en hero-bild med snickare och hantverk";
    if (typeof MS.handleMaterialChatCommand === "function") {
      const result = MS.handleMaterialChatCommand(retryText);
      if (result && result.ok) {
        EE && EE.remount && EE.remount();
        noteImageRequestHandled(retryText);
        if (!opts.skipResultMessage) {
          appendAssistantMessage(
            (result.message || "Jag har uppdaterat hero-bilden.") + "\n\nVad tycker du?",
          );
        }
        return true;
      }
    }
    if (typeof MS.applyHeroStockImage === "function" && MS.applyHeroStockImage(retryText)) {
      EE && EE.remount && EE.remount();
      noteImageRequestHandled(retryText);
      if (!opts.skipResultMessage) {
        appendAssistantMessage("Jag har lagt in hero-bilden igen.\n\nSer den bättre ut?");
      }
      return true;
    }
    appendAssistantMessage(
      "Jag är inte nöjd med det resultatet heller.\n\n" + IMAGE_FAIL_HINT,
    );
    return false;
  }

  function withTimeout(promise, ms) {
    return new Promise(function (resolve, reject) {
      const timer = setTimeout(function () {
        reject(new Error("timeout"));
      }, ms);
      promise.then(
        function (v) {
          clearTimeout(timer);
          resolve(v);
        },
        function (e) {
          clearTimeout(timer);
          reject(e);
        }
      );
    });
  }

  function replaceWithFreshCreateDocument(projectId) {
    const PI = global.ProjectIsolation;
    const SS = global.SiteState;
    const AD = global.AppDocument;
    if (!SS || typeof SS.replace !== "function") return null;

    let fresh =
      AD && typeof AD.createEmptyCreateDocument === "function"
        ? AD.createEmptyCreateDocument()
        : { page: {}, sections: {}, meta: {} };

    if (!fresh.meta) fresh.meta = {};
    if (projectId) fresh.meta.siteId = projectId;
    fresh.meta.createFlowGeneration = true;

    if (PI && typeof PI.createIsolatedDocument === "function") {
      fresh = PI.createIsolatedDocument(fresh);
      if (!fresh.meta) fresh.meta = {};
      fresh.meta.createFlowGeneration = true;
      if (projectId) fresh.meta.siteId = projectId;
    }

    SS.replace(fresh);
    if (typeof SS.save === "function") SS.save();

    const EE = global.EditorEngine;
    if (EE && typeof EE.resetHistoryForDocument === "function") {
      EE.resetHistoryForDocument(fresh);
    }

    return fresh;
  }

  async function prepareFreshWebsiteForCreateFlow(brandName) {
    const PI = global.ProjectIsolation;
    const brand = String(brandName || "").trim();
    let projectId = "";

    if (PI && typeof PI.beginNewEditorProject === "function") {
      const created = await PI.beginNewEditorProject({
        name: brand || "Ny hemsida",
        source: "create-flow-bekrafta",
        skipPreviewClear: true,
        skipChatReset: true,
      });
      projectId = created && created.projectId ? created.projectId : "";
    } else if (PI && typeof PI.beginNewProject === "function") {
      PI.beginNewProject({ source: "create-flow-bekrafta", skipChatReset: true });
    } else {
      replaceWithFreshCreateDocument("");
    }

    replaceWithFreshCreateDocument(projectId);

    if (PI && typeof PI.prepareForNewGeneration === "function") {
      PI.prepareForNewGeneration({
        source: "create-flow-bekrafta",
        skipBeginNewProject: true,
        skipChatReset: true,
      });
    } else {
      enterGenerationCanvas();
      clearPreviewSiteDom();
      document.documentElement.dataset.studioCreateGeneration = "1";
      document.documentElement.dataset.studioPreviewPending = "1";
    }
  }

  async function startCreateFlowGeneration(createBuildPlan) {
    // Question Engine owns the complete five-question flow. The old local
    // generator must never run when the new flow is active.
    if (isQuestionEngineRequest()) {
      const controller = global.QuestionEngineController;
      const button = document.getElementById("studioCreateConfirmV2");
      if (controller && typeof controller.buildFromCompletedFlow === "function") {
        return controller.buildFromCompletedFlow(button);
      }
      return false;
    }
    const check = validateCreateFlowComplete();
    if (!check.ok) {
      applyCreateFlowValidationErrors(check.errors);
      showCreatePane();
      return false;
    }

    createBuildPlan = check.buildPlan || createBuildPlan;
    if (!createBuildPlan) return false;

    const ctx = resolveCreateContextFromBuildPlan(createBuildPlan);
    ctx.createBuildPlan = createBuildPlan;

    const brand = createBuildPlan.businessName || ctx.brand || "";
    const generationBrief = createBuildPlan.businessBrief || "";
    const brandInput = document.getElementById("welcomeBrandName");
    const descArea = document.getElementById("welcomeBusinessDescription");
    const btn = document.getElementById("welcomeGenerateBtn");

    if (brandInput && brand) brandInput.value = brand;

    logStudioTestDebug({
      mode: "create",
      businessType: ctx.industry,
      businessName: brand || ctx.brand || null,
      location: ctx.location || null,
      customerGoal:
        (createBuildPlan.siteGoals && createBuildPlan.siteGoals[0] && createBuildPlan.siteGoals[0].id) ||
        null,
      createBuildPlan: createBuildPlan,
      createFlow: global.CreateFlowBridge ? global.CreateFlowBridge.buildCreateFlowSnapshot(ctx) : null,
      offeredServices: ctx.offeredServices,
      bookingHint: ctx.bookingHint || null,
    });

    if (btn) {
      btn.disabled = true;
      btn.classList.add("is-busy");
      btn.setAttribute("aria-busy", "true");
    }

    try {
      await prepareFreshWebsiteForCreateFlow(brand);

      const SS = global.SiteState;
      if (SS && typeof SS.patch === "function") {
        SS.patch(function (d) {
          if (!d.meta) d.meta = {};
          d.meta.createFlowGeneration = true;
          if (!d.page) d.page = {};
          d.page.createMode = "new";
          d.page.createSource =
            createBuildPlan.existingSite && createBuildPlan.existingSite.id
              ? createBuildPlan.existingSite.id
              : "from-scratch";
        });
      }

      showProgress(0);
      for (let step = 1; step <= 5; step++) {
        const stepEl = document.getElementById("studioCreateStep" + step);
        if (stepEl) stepEl.hidden = true;
      }

      appendUserMessage(generationBrief);
      appendAssistantMessage(createAckMessage(generationBrief, ctx));
      if (descArea) descArea.value = "";

      await runMagicGeneration(ctx, brand, generationBrief, "new");

      try {
        localStorage.setItem(STORAGE_KEY, "1");
      } catch (eStorage) {
        /* ignore */
      }

      showGeneratedSite();

      const DF = global.DesignFamilies;
      const pageAfter = global.SiteState.get && global.SiteState.get()?.page;
      const CDG = global.CreateCdGate;
      const isCdPage =
        CDG && typeof CDG.isCdRenderPage === "function" && pageAfter && CDG.isCdRenderPage(pageAfter);
      const setId = pageAfter && (pageAfter.designColorSetId || pageAfter.designFamily);
      if (!isCdPage && DF && setId && typeof DF.getCreationBrief === "function") {
        appendAssistantMessage(DF.getCreationBrief(setId, ctx));
      } else if (!isCdPage && DF && setId && typeof DF.getMotivation === "function") {
        appendAssistantMessage(DF.getMotivation(setId, ctx));
      }

      const SCE = global.SiteCompositionEngine;
      if (
        !isCdPage &&
        SCE &&
        pageAfter &&
        pageAfter.artDirectorDesignScore &&
        typeof SCE.designScoreToText === "function"
      ) {
        appendAssistantMessage(SCE.designScoreToText(pageAfter.artDirectorDesignScore));
      }

      logStudioTestDebug({
        mode: "edit",
        note: "Site generated — next messages route to edit",
        visibleSections: getVisibleSections(),
        primaryCta: global.SiteState.get()?.sections?.hero?.content?.["hero-cta-1-text"],
      });
      toast("Klart — din hemsida är redo att finslipa.", "success", 3600);
      return true;
    } catch (err) {
      hideProgress();
      if (global.ProjectIsolation && typeof global.ProjectIsolation.endNewGeneration === "function") {
        global.ProjectIsolation.endNewGeneration();
      }
      if (err && err.message === "generation_integrity_failed") {
        if (global.ProjectIsolation && typeof global.ProjectIsolation.beginNewProject === "function") {
          global.ProjectIsolation.beginNewProject({ source: "integrity-failed-reset" });
        }
      }
      clearPreviewSiteDom();
      setPreviewState(PREVIEW.EMPTY);
      console.warn("create-flow generation", err);
      toastGenerationError(err);
      showCreatePane();
      setCreateFlowStep(5);
      return false;
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.classList.remove("is-busy");
        btn.removeAttribute("aria-busy");
      }
    }
  }

  function cdRemountPreview(SS) {
    const Render = global.RenderEngine;
    const doc = SS && SS.get ? SS.get() : null;
    const mainEl = document.getElementById("siteMain");
    const footerEl = document.getElementById("siteFooter");
    if (Render && typeof Render.mount === "function" && mainEl && doc) {
      Render.mount(doc, mainEl, footerEl);
    }
  }

  async function cdRemountPreviewAsync(SS) {
    cdRemountPreview(SS);
    const EE = global.EditorEngine;
    if (EE && typeof EE.remountAsyncForced === "function") {
      await EE.remountAsyncForced();
      return;
    }
    if (EE && typeof EE.remountAsync === "function") {
      await EE.remountAsync(true);
      return;
    }
    if (EE && typeof EE.remount === "function") {
      EE.remount(true);
    }
  }

  async function finalizeCdCreateDocument(ctx, brand) {
    const SS = global.SiteState;
    const GL = global.GenerationLifecycle;
    const CDG = global.CreateCdGate;
    if (!SS) return;

    showProgress(2);

    SS.patch(function (d) {
      const brief = d.page && d.page.creativeBrief;
      const facts = brief && brief.businessFacts ? brief.businessFacts : {};
      const name = String(facts.businessName || brand || "").trim();
      const locRaw = String(facts.location || d.page.location || "").trim();
      const loc = /^okänd\s+ort$/i.test(locRaw) ? "" : locRaw;
      if (name && d.sections && d.sections.footer && d.sections.footer.content) {
        d.sections.footer.content["footer-brand"] = name.slice(0, 48);
      }
      if (loc) {
        d.page.location = loc;
        d.page.textLogoSubline = loc;
        if (d.sections.contact && d.sections.contact.content) {
          d.sections.contact.content["contact-address"] = loc;
        }
      }
      const industry = String(facts.industry || "").trim();
      if (industry) d.page.industry = industry;
      d.page.createPath = "cd";
      if (CDG && typeof CDG.purgeLegacyIdentityFields === "function") {
        CDG.purgeLegacyIdentityFields(d.page);
      }
      d.page.textLogoAuto = false;
    });

    if (global.MaterialSystem && typeof global.MaterialSystem.applyMaterialToDocument === "function") {
      SS.patch(function (d) {
        if (d.page && d.page.cdImagesLocked) return;
        global.MaterialSystem.applyMaterialToDocument(d, global.MaterialSystem.getMaterial());
      });
    }

    SS.save();

    if (GL && typeof GL.logPipelineStage === "function") {
      const docFinal = SS.get && SS.get();
      GL.logPipelineStage("CD_CREATE_PATH", {
        input: { createPath: "cd" },
        output: {
          status: "complete",
          heroTitle: docFinal && docFinal.sections && docFinal.sections.hero && docFinal.sections.hero.content
            ? docFinal.sections.hero.content["hero-title"]
            : "",
          heroBgUrl: docFinal && docFinal.page ? docFinal.page.heroBgUrl : "",
          template: docFinal && docFinal.page ? docFinal.page.template : "",
        },
        validation: { ok: true },
      });
      GL.logPipelineStage("FINAL_RENDER", {
        input: { createPath: "cd" },
        output: { remount: true },
        validation: { ok: true },
      });
    }

    await cdRemountPreviewAsync(SS);
  }

  async function runFreeSceneCreate(ctx, brandName, businessDescription, createMode) {
    const CDG = global.CreateCdGate;
    const SS = global.SiteState;
    if (!SS) {
      throw CDG && typeof CDG.createNotReadyError === "function"
        ? CDG.createNotReadyError()
        : new Error("cd_create_not_ready");
    }

    const brand = brandName || (ctx && ctx.brand) || "";
    const desc = businessDescription != null ? String(businessDescription).trim() : "";
    const GL = global.GenerationLifecycle;
    if (GL && typeof GL.beginRun === "function") GL.beginRun("v2-free-scene-create");

    if (GL && typeof GL.logPipelineStage === "function") {
      GL.logPipelineStage("CD_CREATE_PATH", {
        input: { createPath: "v2", brand: brand, description: desc.slice(0, 120) },
        output: { status: "entered" },
        validation: { ok: true },
      });
    }

    try {
      console.info("[Easily · V2 free scene] gate on — component and legacy executors skipped");
    } catch (eLog) {
      /* ignore */
    }

    const Bridge = global.CreateFlowBridge;
    if (Bridge && typeof Bridge.applyCreateFlowToDocument === "function") {
      SS.patch(function (d) {
        Bridge.applyCreateFlowToDocument(d, ctx);
        if (!d.page) d.page = {};
        d.page.createMode = createMode || "new";
        if (brand) d.page.createBusinessName = String(brand).slice(0, 120);
        if (desc) d.page.createBusinessDescription = desc.slice(0, 600);
        if (CDG && typeof CDG.purgeLegacyIdentityFields === "function") {
          CDG.purgeLegacyIdentityFields(d.page);
        }
        d.page.createPath = "v2";
      });
      SS.applyPageToBody && SS.applyPageToBody();
    }

    const customerBrief = {
      briefVersion: "1.0",
      revision: 1,
      customerFacts: {
        businessName: brand,
        location: {
          primary: String(
            (ctx && ctx.createBusinessLocation) ||
              (ctx && ctx.createBuildPlan && ctx.createBuildPlan.location) ||
              "",
          ).trim(),
        },
        offer: { summary: desc },
        audience: { primary: "" },
        sections: {
          requested: ((ctx && ctx.createSections) || []).map(function (section) {
            return section && section.id ? String(section.id) : "";
          }).filter(Boolean),
        },
        siteType: String((ctx && ctx.siteType) || "").trim(),
        design: {
          styleId: String(
            (ctx && ctx.createDesignStyle && ctx.createDesignStyle.id) ||
              (ctx && ctx.createBuildPlan && ctx.createBuildPlan.designStyle && ctx.createBuildPlan.designStyle.id) ||
              "",
          ).trim(),
        },
      },
    };

    const Api = global.SiteApi;
    if (!Api || typeof Api.request !== "function") {
      throw new Error("v2_free_scene_client_missing");
    }

    const sceneResponse = await Api.request("/api/v2/generate-site", {
      method: "POST",
      body: { creativeBrief: customerBrief },
      timeoutMs: 600000,
    });
    if (!sceneResponse || !sceneResponse.ok || !sceneResponse.sceneGraph || !Array.isArray(sceneResponse.compiledProfiles)) {
      const firstConflict = sceneResponse && Array.isArray(sceneResponse.conflicts) && sceneResponse.conflicts[0];
      const sceneError = new Error(
        String(
          (firstConflict && (firstConflict.message || firstConflict.code)) ||
          (sceneResponse && (sceneResponse.reason || sceneResponse.error)) ||
          "v2_free_scene_invalid",
        ),
      );
      sceneError.code = "v2_free_scene_failed";
      sceneError.conflicts = sceneResponse && sceneResponse.conflicts || [];
      throw sceneError;
    }

    SS.patch(function (d) {
      if (!d.page) d.page = {};
      if (!d.meta) d.meta = {};
      delete d.page.siteBlueprint;
      delete d.page.creativeConcept;
      delete d.page.designSpec;
      delete d.page.componentStrategy;
      delete d.page.template;
      delete d.page.variant;
      d.page.createPath = "v2";
      d.page.creativeBrief = customerBrief;
      d.page.v2GenerationId = sceneResponse.generationId;
      d.page.v2CreativeVision = sceneResponse.creativeVision;
      d.page.v2SceneGraph = sceneResponse.sceneGraph;
      d.page.v2LockedBlueprint = sceneResponse.lockedBlueprint;
      d.page.v2ResolvedProfiles = sceneResponse.resolvedProfiles;
      d.page.v2RenderManifests = sceneResponse.renderManifests;
      d.page.v2CompiledProfiles = sceneResponse.compiledProfiles;
      d.meta.visibleGenerationId = sceneResponse.generationId;
      d.meta.generationEngine = "v2";
    });

    if (GL && typeof GL.logPipelineStage === "function") {
      GL.logPipelineStage("CREATIVE_DIRECTOR", {
          input: { brand: brand, description: desc.slice(0, 120), path: "v2" },
        output: {
          ok: true,
          sceneLocked: true,
          compilerFallback: false,
        },
        validation: { ok: true },
      });
    }

    showProgress(1);
    SS.applyPageToBody && SS.applyPageToBody();
    SS.save();
    if (typeof SS.flushRemoteSave === "function") {
      const saved = await SS.flushRemoteSave({ throwOnError: true });
      if (!saved || saved.ok === false) throw new Error("v2_generation_persistence_failed");
    }
    await cdRemountPreviewAsync(SS);
    showProgress(2);

    if (GL && typeof GL.logPipelineStage === "function") {
      GL.logPipelineStage("FINAL_RENDER", {
        input: { createPath: "v2", generationId: sceneResponse.generationId },
        output: { remount: true },
        validation: { ok: true },
      });
      GL.logPipelineStage("CD_CREATE_PATH", {
        input: { createPath: "v2" },
        output: { status: "complete" },
        validation: { ok: true },
      });
    }
  }

  async function runCreativeDirectorCreate(ctx, brandName, businessDescription, createMode) {
    const CDG = global.CreateCdGate;
    const SS = global.SiteState;
    if (!SS) {
      throw CDG && typeof CDG.createNotReadyError === "function"
        ? CDG.createNotReadyError()
        : new Error("cd_create_not_ready");
    }

    const brand = brandName || (ctx && ctx.brand) || "";
    const desc = businessDescription != null ? String(businessDescription).trim() : "";
    const GL = global.GenerationLifecycle;

    if (GL && typeof GL.logPipelineStage === "function") {
      GL.logPipelineStage("CD_CREATE_PATH", {
        input: { createPath: "cd", brand: brand, description: desc.slice(0, 120) },
        output: { status: "entered" },
        validation: { ok: true },
      });
    }

    try {
      console.info("[Easily · CD create] gate on — legacy pipeline skipped");
    } catch (eLog) {
      /* ignore */
    }

    const Bridge = global.CreateFlowBridge;
    if (Bridge && typeof Bridge.applyCreateFlowToDocument === "function") {
      SS.patch(function (d) {
        Bridge.applyCreateFlowToDocument(d, ctx);
        if (!d.page) d.page = {};
        d.page.createMode = createMode || "new";
        if (brand) d.page.createBusinessName = String(brand).slice(0, 120);
        if (desc) d.page.createBusinessDescription = desc.slice(0, 600);
        if (CDG && typeof CDG.purgeLegacyIdentityFields === "function") {
          CDG.purgeLegacyIdentityFields(d.page);
        }
        d.page.createPath = "cd";
      });
      SS.applyPageToBody && SS.applyPageToBody();
    }

    const CBS = global.CreativeBriefState;
    const CD = global.CreativeDirector;
    const DevFx = global.CdDevFixture;

    let cdResult = null;
    if (DevFx && typeof DevFx.shouldInstall === "function" && DevFx.shouldInstall()) {
      SS.patch(function (d) {
        if (CBS && typeof CBS.setCreativeBrief === "function" && typeof DevFx.createDevFixture === "function") {
          CBS.setCreativeBrief(d, DevFx.createDevFixture(ctx), { locked: true, requireValid: true });
        }
      });
      cdResult = { ok: true, briefLocked: true, source: "dev-fixture" };
    } else if (CD && typeof CD.run === "function") {
      cdResult = CD.run({ ctx: ctx });
      if (!cdResult.ok) {
        throw CDG && typeof CDG.createNotReadyError === "function"
          ? CDG.createNotReadyError("Creative Director: " + (cdResult.reason || "abort"))
          : new Error("cd_create_not_ready");
      }
      SS.patch(function (d) {
        if (CBS && typeof CBS.setCreativeBrief === "function") {
          CBS.setCreativeBrief(d, cdResult.creativeBrief, { locked: true, requireValid: true });
        }
      });
    } else {
      throw CDG && typeof CDG.createNotReadyError === "function"
        ? CDG.createNotReadyError("Creative Director saknas — ladda om sidan.")
        : new Error("cd_create_not_ready");
    }

    if (GL && typeof GL.logPipelineStage === "function") {
      GL.logPipelineStage("CREATIVE_DIRECTOR", {
        input: { brand: brand, description: desc.slice(0, 120) },
        output: cdResult,
        validation: { ok: !!(cdResult && cdResult.ok) },
      });
    }

    const docNow = SS.get && SS.get();
    const Guard = global.CdExecutorGuard;
    if (Guard && typeof Guard.canExecutorStart === "function") {
      const compCheck = Guard.canExecutorStart("composition", docNow);
      if (GL && typeof GL.logPipelineStage === "function") {
        GL.logPipelineStage("CD_EXECUTOR_GUARD", {
          input: { executor: "composition", briefLocked: !!(docNow && docNow.page && docNow.page.briefLocked) },
          output: compCheck,
          validation: { ok: !!compCheck.ok },
        });
      }
      if (!compCheck.ok) {
        throw Guard.createGuardError(
          compCheck.code || Guard.CD_BRIEF_NOT_LOCKED,
          compCheck.message || "composition executor refused",
          { executorId: "composition" },
        );
      }
    }

    showProgress(0);

    const Comp = global.CdCompositionExecutor;
    let compResult = null;
    if (Comp && typeof Comp.applyToDocument === "function") {
      SS.patch(function (d) {
        compResult = Comp.applyToDocument(d);
      });
      if (!compResult || !compResult.ok) {
        throw CDG && typeof CDG.createNotReadyError === "function"
          ? CDG.createNotReadyError("Komposition: " + ((compResult && compResult.reason) || "abort"))
          : new Error("cd_create_not_ready");
      }
      SS.applyPageToBody && SS.applyPageToBody();
      cdRemountPreview(SS);
    } else {
      throw CDG && typeof CDG.createNotReadyError === "function"
        ? CDG.createNotReadyError("Brief låst — komposition-executor saknas.")
        : new Error("cd_create_not_ready");
    }

    if (GL && typeof GL.logPipelineStage === "function") {
      GL.logPipelineStage("CD_COMPOSITION", {
        input: { executor: "composition", briefLocked: true },
        output: compResult,
        validation: { ok: true },
      });
    }

    const docAfterComp = SS.get && SS.get();
    if (Guard && typeof Guard.canExecutorStart === "function") {
      const heroCheck = Guard.canExecutorStart("hero-copy", docAfterComp);
      if (GL && typeof GL.logPipelineStage === "function") {
        GL.logPipelineStage("CD_EXECUTOR_GUARD", {
          input: { executor: "hero-copy", briefLocked: !!(docAfterComp && docAfterComp.page && docAfterComp.page.briefLocked) },
          output: heroCheck,
          validation: { ok: !!heroCheck.ok },
        });
      }
      if (!heroCheck.ok) {
        throw Guard.createGuardError(
          heroCheck.code || Guard.CD_BRIEF_NOT_LOCKED,
          heroCheck.message || "hero executor refused",
          { executorId: "hero-copy" },
        );
      }
    }

    const HeroExec = global.CdHeroExecutor;
    let heroResult = null;
    if (HeroExec && typeof HeroExec.applyToDocument === "function") {
      SS.patch(function (d) {
        heroResult = HeroExec.applyToDocument(d);
      });
      if (!heroResult || !heroResult.ok) {
        throw CDG && typeof CDG.createNotReadyError === "function"
          ? CDG.createNotReadyError("Hero: " + ((heroResult && heroResult.reason) || "abort"))
          : new Error("cd_create_not_ready");
      }
      showProgress(1);
      SS.applyPageToBody && SS.applyPageToBody();
      cdRemountPreview(SS);
    } else {
      throw CDG && typeof CDG.createNotReadyError === "function"
        ? CDG.createNotReadyError("Komposition klar — hero-executor saknas.")
        : new Error("cd_create_not_ready");
    }

    if (GL && typeof GL.logPipelineStage === "function") {
      GL.logPipelineStage("CD_HERO", {
        input: { executor: "hero-copy", briefLocked: true },
        output: heroResult,
        validation: { ok: true },
      });
    }

    const docAfterHero = SS.get && SS.get();
    if (Guard && typeof Guard.canExecutorStart === "function") {
      const aboutCheck = Guard.canExecutorStart("about-copy", docAfterHero);
      if (GL && typeof GL.logPipelineStage === "function") {
        GL.logPipelineStage("CD_EXECUTOR_GUARD", {
          input: { executor: "about-copy", briefLocked: !!(docAfterHero && docAfterHero.page && docAfterHero.page.briefLocked) },
          output: aboutCheck,
          validation: { ok: !!aboutCheck.ok },
        });
      }
      if (!aboutCheck.ok) {
        throw Guard.createGuardError(
          aboutCheck.code || Guard.CD_BRIEF_NOT_LOCKED,
          aboutCheck.message || "about executor refused",
          { executorId: "about-copy" },
        );
      }
    }

    const AboutExec = global.CdAboutExecutor;
    let aboutResult = null;
    if (AboutExec && typeof AboutExec.applyToDocument === "function") {
      SS.patch(function (d) {
        aboutResult = AboutExec.applyToDocument(d);
      });
      if (!aboutResult || !aboutResult.ok) {
        throw CDG && typeof CDG.createNotReadyError === "function"
          ? CDG.createNotReadyError("About: " + ((aboutResult && aboutResult.reason) || "abort"))
          : new Error("cd_create_not_ready");
      }
      if (!aboutResult.skipped) {
        cdRemountPreview(SS);
      }
    } else {
      throw CDG && typeof CDG.createNotReadyError === "function"
        ? CDG.createNotReadyError("Hero klar — about-executor saknas.")
        : new Error("cd_create_not_ready");
    }

    if (GL && typeof GL.logPipelineStage === "function") {
      GL.logPipelineStage("CD_ABOUT", {
        input: { executor: "about-copy", briefLocked: true },
        output: aboutResult,
        validation: { ok: true },
      });
    }

    const docAfterAbout = SS.get && SS.get();
    if (Guard && typeof Guard.canExecutorStart === "function") {
      const servicesCheck = Guard.canExecutorStart("services-copy", docAfterAbout);
      if (GL && typeof GL.logPipelineStage === "function") {
        GL.logPipelineStage("CD_EXECUTOR_GUARD", {
          input: { executor: "services-copy", briefLocked: !!(docAfterAbout && docAfterAbout.page && docAfterAbout.page.briefLocked) },
          output: servicesCheck,
          validation: { ok: !!servicesCheck.ok },
        });
      }
      if (!servicesCheck.ok) {
        throw Guard.createGuardError(
          servicesCheck.code || Guard.CD_BRIEF_NOT_LOCKED,
          servicesCheck.message || "services executor refused",
          { executorId: "services-copy" },
        );
      }
    }

    const ServicesExec = global.CdServicesExecutor;
    let servicesResult = null;
    if (ServicesExec && typeof ServicesExec.applyToDocument === "function") {
      SS.patch(function (d) {
        servicesResult = ServicesExec.applyToDocument(d);
      });
      if (!servicesResult || !servicesResult.ok) {
        throw CDG && typeof CDG.createNotReadyError === "function"
          ? CDG.createNotReadyError("Services: " + ((servicesResult && servicesResult.reason) || "abort"))
          : new Error("cd_create_not_ready");
      }
      if (!servicesResult.skipped) {
        cdRemountPreview(SS);
      }
    } else {
      throw CDG && typeof CDG.createNotReadyError === "function"
        ? CDG.createNotReadyError("About klar — services-executor saknas.")
        : new Error("cd_create_not_ready");
    }

    if (GL && typeof GL.logPipelineStage === "function") {
      GL.logPipelineStage("CD_SERVICES", {
        input: { executor: "services-copy", briefLocked: true },
        output: servicesResult,
        validation: { ok: true },
      });
    }

    const docAfterServices = SS.get && SS.get();
    if (Guard && typeof Guard.canExecutorStart === "function") {
      const galleryCheck = Guard.canExecutorStart("gallery-copy", docAfterServices);
      if (GL && typeof GL.logPipelineStage === "function") {
        GL.logPipelineStage("CD_EXECUTOR_GUARD", {
          input: { executor: "gallery-copy", briefLocked: !!(docAfterServices && docAfterServices.page && docAfterServices.page.briefLocked) },
          output: galleryCheck,
          validation: { ok: !!galleryCheck.ok },
        });
      }
      if (!galleryCheck.ok) {
        throw Guard.createGuardError(
          galleryCheck.code || Guard.CD_BRIEF_NOT_LOCKED,
          galleryCheck.message || "gallery executor refused",
          { executorId: "gallery-copy" },
        );
      }
    }

    const GalleryExec = global.CdGalleryExecutor;
    let galleryResult = null;
    if (GalleryExec && typeof GalleryExec.applyToDocument === "function") {
      SS.patch(function (d) {
        galleryResult = GalleryExec.applyToDocument(d);
      });
      if (!galleryResult || !galleryResult.ok) {
        throw CDG && typeof CDG.createNotReadyError === "function"
          ? CDG.createNotReadyError("Gallery: " + ((galleryResult && galleryResult.reason) || "abort"))
          : new Error("cd_create_not_ready");
      }
      if (!galleryResult.skipped) {
        cdRemountPreview(SS);
      }
    } else {
      throw CDG && typeof CDG.createNotReadyError === "function"
        ? CDG.createNotReadyError("Services klar — gallery-executor saknas.")
        : new Error("cd_create_not_ready");
    }

    if (GL && typeof GL.logPipelineStage === "function") {
      GL.logPipelineStage("CD_GALLERY", {
        input: { executor: "gallery-copy", briefLocked: true },
        output: galleryResult,
        validation: { ok: true },
      });
    }

    const docAfterGallery = SS.get && SS.get();
    if (Guard && typeof Guard.canExecutorStart === "function") {
      const faqCheck = Guard.canExecutorStart("faq-copy", docAfterGallery);
      if (GL && typeof GL.logPipelineStage === "function") {
        GL.logPipelineStage("CD_EXECUTOR_GUARD", {
          input: { executor: "faq-copy", briefLocked: !!(docAfterGallery && docAfterGallery.page && docAfterGallery.page.briefLocked) },
          output: faqCheck,
          validation: { ok: !!faqCheck.ok },
        });
      }
      if (!faqCheck.ok) {
        throw Guard.createGuardError(
          faqCheck.code || Guard.CD_BRIEF_NOT_LOCKED,
          faqCheck.message || "faq executor refused",
          { executorId: "faq-copy" },
        );
      }
    }

    const FaqExec = global.CdFaqExecutor;
    let faqResult = null;
    if (FaqExec && typeof FaqExec.applyToDocument === "function") {
      SS.patch(function (d) {
        faqResult = FaqExec.applyToDocument(d);
      });
      if (!faqResult || !faqResult.ok) {
        throw CDG && typeof CDG.createNotReadyError === "function"
          ? CDG.createNotReadyError("FAQ: " + ((faqResult && faqResult.reason) || "abort"))
          : new Error("cd_create_not_ready");
      }
      if (!faqResult.skipped) {
        cdRemountPreview(SS);
      }
    } else {
      throw CDG && typeof CDG.createNotReadyError === "function"
        ? CDG.createNotReadyError("Gallery klar — faq-executor saknas.")
        : new Error("cd_create_not_ready");
    }

    if (GL && typeof GL.logPipelineStage === "function") {
      GL.logPipelineStage("CD_FAQ", {
        input: { executor: "faq-copy", briefLocked: true },
        output: faqResult,
        validation: { ok: true },
      });
    }

    const docAfterFaq = SS.get && SS.get();
    if (Guard && typeof Guard.canExecutorStart === "function") {
      const bookingCheck = Guard.canExecutorStart("booking-copy", docAfterFaq);
      if (GL && typeof GL.logPipelineStage === "function") {
        GL.logPipelineStage("CD_EXECUTOR_GUARD", {
          input: { executor: "booking-copy", briefLocked: !!(docAfterFaq && docAfterFaq.page && docAfterFaq.page.briefLocked) },
          output: bookingCheck,
          validation: { ok: !!bookingCheck.ok },
        });
      }
      if (!bookingCheck.ok) {
        throw Guard.createGuardError(
          bookingCheck.code || Guard.CD_BRIEF_NOT_LOCKED,
          bookingCheck.message || "booking executor refused",
          { executorId: "booking-copy" },
        );
      }
    }

    const BookingExec = global.CdBookingExecutor;
    let bookingResult = null;
    if (BookingExec && typeof BookingExec.applyToDocument === "function") {
      SS.patch(function (d) {
        bookingResult = BookingExec.applyToDocument(d);
      });
      if (!bookingResult || !bookingResult.ok) {
        throw CDG && typeof CDG.createNotReadyError === "function"
          ? CDG.createNotReadyError("Booking: " + ((bookingResult && bookingResult.reason) || "abort"))
          : new Error("cd_create_not_ready");
      }
      if (!bookingResult.skipped) {
        cdRemountPreview(SS);
      }
    } else {
      throw CDG && typeof CDG.createNotReadyError === "function"
        ? CDG.createNotReadyError("FAQ klar — booking-executor saknas.")
        : new Error("cd_create_not_ready");
    }

    if (GL && typeof GL.logPipelineStage === "function") {
      GL.logPipelineStage("CD_BOOKING", {
        input: { executor: "booking-copy", briefLocked: true },
        output: bookingResult,
        validation: { ok: true },
      });
    }

    const docAfterBooking = SS.get && SS.get();
    if (Guard && typeof Guard.canExecutorStart === "function") {
      const contactCheck = Guard.canExecutorStart("contact-copy", docAfterBooking);
      if (GL && typeof GL.logPipelineStage === "function") {
        GL.logPipelineStage("CD_EXECUTOR_GUARD", {
          input: { executor: "contact-copy", briefLocked: !!(docAfterBooking && docAfterBooking.page && docAfterBooking.page.briefLocked) },
          output: contactCheck,
          validation: { ok: !!contactCheck.ok },
        });
      }
      if (!contactCheck.ok) {
        throw Guard.createGuardError(
          contactCheck.code || Guard.CD_BRIEF_NOT_LOCKED,
          contactCheck.message || "contact executor refused",
          { executorId: "contact-copy" },
        );
      }
    }

    const ContactExec = global.CdContactExecutor;
    let contactResult = null;
    if (ContactExec && typeof ContactExec.applyToDocument === "function") {
      SS.patch(function (d) {
        contactResult = ContactExec.applyToDocument(d);
      });
      if (!contactResult || !contactResult.ok) {
        throw CDG && typeof CDG.createNotReadyError === "function"
          ? CDG.createNotReadyError("Contact: " + ((contactResult && contactResult.reason) || "abort"))
          : new Error("cd_create_not_ready");
      }
      if (!contactResult.skipped) {
        cdRemountPreview(SS);
      }
    } else {
      throw CDG && typeof CDG.createNotReadyError === "function"
        ? CDG.createNotReadyError("Gallery klar — contact-executor saknas.")
        : new Error("cd_create_not_ready");
    }

    if (GL && typeof GL.logPipelineStage === "function") {
      GL.logPipelineStage("CD_CONTACT", {
        input: { executor: "contact-copy", briefLocked: true },
        output: contactResult,
        validation: { ok: true },
      });
    }

    const docAfterContact = SS.get && SS.get();
    if (Guard && typeof Guard.canExecutorStart === "function") {
      const designCheck = Guard.canExecutorStart("design", docAfterContact);
      if (GL && typeof GL.logPipelineStage === "function") {
        GL.logPipelineStage("CD_EXECUTOR_GUARD", {
          input: { executor: "design", briefLocked: !!(docAfterContact && docAfterContact.page && docAfterContact.page.briefLocked) },
          output: designCheck,
          validation: { ok: !!designCheck.ok },
        });
      }
      if (!designCheck.ok) {
        throw Guard.createGuardError(
          designCheck.code || Guard.CD_BRIEF_NOT_LOCKED,
          designCheck.message || "design executor refused",
          { executorId: "design" },
        );
      }
    }

    const DesignExec = global.CdDesignExecutor;
    let designResult = null;
    if (DesignExec && typeof DesignExec.applyToDocument === "function") {
      SS.patch(function (d) {
        designResult = DesignExec.applyToDocument(d);
      });
      if (!designResult || !designResult.ok) {
        throw CDG && typeof CDG.createNotReadyError === "function"
          ? CDG.createNotReadyError("Design: " + ((designResult && designResult.reason) || "abort"))
          : new Error("cd_create_not_ready");
      }
      showProgress(2);
      SS.applyPageToBody && SS.applyPageToBody();
      cdRemountPreview(SS);
    } else {
      throw CDG && typeof CDG.createNotReadyError === "function"
        ? CDG.createNotReadyError("Hero klar — design-executor saknas.")
        : new Error("cd_create_not_ready");
    }

    if (GL && typeof GL.logPipelineStage === "function") {
      GL.logPipelineStage("CD_DESIGN", {
        input: { executor: "design", briefLocked: true },
        output: designResult,
        validation: { ok: true },
      });
    }

    const docAfterDesign = SS.get && SS.get();
    if (Guard && typeof Guard.canExecutorStart === "function") {
      const imageCheck = Guard.canExecutorStart("images", docAfterDesign);
      if (GL && typeof GL.logPipelineStage === "function") {
        GL.logPipelineStage("CD_EXECUTOR_GUARD", {
          input: { executor: "images", briefLocked: !!(docAfterDesign && docAfterDesign.page && docAfterDesign.page.briefLocked) },
          output: imageCheck,
          validation: { ok: !!imageCheck.ok },
        });
      }
      if (!imageCheck.ok) {
        throw Guard.createGuardError(
          imageCheck.code || Guard.CD_BRIEF_NOT_LOCKED,
          imageCheck.message || "image executor refused",
          { executorId: "images" },
        );
      }
    }

    const ImageExec = global.CdImageExecutor;
    let imageResult = null;
    if (ImageExec && typeof ImageExec.applyToDocument === "function") {
      SS.patch(function (d) {
        imageResult = ImageExec.applyToDocument(d);
      });
      if (!imageResult || !imageResult.ok) {
        throw CDG && typeof CDG.createNotReadyError === "function"
          ? CDG.createNotReadyError("Bilder: " + ((imageResult && imageResult.reason) || "abort"))
          : new Error("cd_create_not_ready");
      }
      SS.applyPageToBody && SS.applyPageToBody();
      cdRemountPreview(SS);
    } else {
      throw CDG && typeof CDG.createNotReadyError === "function"
        ? CDG.createNotReadyError("Design klar — image-executor saknas.")
        : new Error("cd_create_not_ready");
    }

    if (GL && typeof GL.logPipelineStage === "function") {
      GL.logPipelineStage("CD_IMAGES", {
        input: { executor: "images", briefLocked: true },
        output: imageResult,
        validation: { ok: true },
      });
    }

    await finalizeCdCreateDocument(ctx, brand);
  }

  async function runMagicGeneration(ctx, brandName, businessDescription, createMode) {
    const CDG = global.CreateCdGate;
    if (CDG && typeof CDG.enrichContext === "function") {
      CDG.enrichContext(ctx);
    } else if (ctx) {
      ctx.createPath = "legacy";
      ctx.creativeDirectorCreateEnabled = false;
    }

    // A brand-new website is only built after the five-question flow has
    // completed. At that point the component-free V2 scene graph is the sole
    // create path. Feature
    // flags may still control experimental UI, but a missing browser flag
    // must never make a new website silently fall back to legacy templates.
    // Existing legacy documents remain readable/editable because this only
    // applies to new generation.
    if (ctx && createMode === "new") {
      ctx.createPath = "v2";
      ctx.v2CreateEnabled = true;
      ctx.blueprintCreateEnabled = false;
      ctx.creativeDirectorCreateEnabled = false;
    }

    if (ctx && ctx.v2CreateEnabled) {
      global.__STUDIO_BRAND__ = brandName || (ctx && ctx.brand) || "";
      try {
        document.documentElement.classList.add("studio-is-generating");
        await runFreeSceneCreate(ctx, brandName, businessDescription, createMode);
      } finally {
        global.__STUDIO_BRAND__ = null;
        hideProgress();
        document.documentElement.classList.remove("studio-is-generating");
      }
      return;
    }

    // Safety invariant: new generation may never continue into the legacy
    // AISiteBuilder/template pipeline below. Older documents can still use
    // that code for compatibility while they are open in the editor.
    if (createMode === "new") {
      throw new Error("new_generation_requires_v2_free_scene");
    }

    const AI = global.AISiteBuilder;
    const SS = global.SiteState;
    const EE = global.EditorEngine;
    if (!AI || !SS || !EE) return;

    const buildPlan = ctx && ctx.createBuildPlan;

    const freshCreate =
      !!(buildPlan && createMode === "new") ||
      document.documentElement.dataset.studioCreateGeneration === "1" ||
      (global.ProjectIsolation &&
        global.ProjectIsolation.isGeneratingNewWebsite &&
        global.ProjectIsolation.isGeneratingNewWebsite());

    if (buildPlan && createMode === "new") {
      const currentDoc = SS.get && SS.get();
      const isFreshCreateDoc =
        currentDoc &&
        currentDoc.meta &&
        currentDoc.meta.createFlowGeneration === true;
      if (!isFreshCreateDoc) {
        const projectId =
          currentDoc && currentDoc.meta && currentDoc.meta.siteId
            ? String(currentDoc.meta.siteId)
            : "";
        replaceWithFreshCreateDocument(projectId);
        SS.patch(function (d) {
          if (!d.meta) d.meta = {};
          d.meta.createFlowGeneration = true;
          if (!d.page) d.page = {};
          d.page.createMode = "new";
        });
      }
    }

    const industry = ctx.industry || "verksamhet";
    const area = ctx.area;
    const brand = brandName || ctx.brand || "";
    const desc = businessDescription != null ? String(businessDescription).trim() : "";

    global.__STUDIO_BRAND__ = brand ? String(brand).trim().slice(0, 48) : null;

    showProgress(0);

    const run = async function () {
      const GL = global.GenerationLifecycle;
      const GI = global.GenerationIntegrity;
      if (GL && typeof GL.logPipelineStage === "function") {
        const planCheck =
          buildPlan && global.CreateBuildPlan
            ? global.CreateBuildPlan.validate(buildPlan)
            : { ok: false, reason: "missing_build_plan" };
        GL.logPipelineStage("BUSINESS_BRIEF", {
          input: {
            createBuildPlan: buildPlan || null,
            description: desc,
            brand: brand,
            industry: industry,
            area: area,
            createFlow: global.CreateFlowBridge ? global.CreateFlowBridge.buildCreateFlowSnapshot(ctx) : null,
          },
          output: { ctx: ctx },
          validation: {
            ok: planCheck.ok,
            reason: planCheck.ok ? "" : (planCheck.errors && planCheck.errors[0]) || "invalid_build_plan",
          },
        });
      }

      showProgress(0);
      const Bridge = global.CreateFlowBridge;
      if (Bridge && typeof Bridge.applyCreateFlowToDocument === "function") {
        SS.patch(function (d) {
          Bridge.applyCreateFlowToDocument(d, ctx);
        });
        SS.applyPageToBody && SS.applyPageToBody();
        const afterBridge = SS.get && SS.get();
        if (afterBridge && afterBridge.page && afterBridge.page.industry) {
          ctx.industry = afterBridge.page.industry;
        }
      }

      let genIndustry = ctx.industry || industry || "verksamhet";

      const DF = global.DesignFamilies;
      if (DF && typeof DF.pickForComposition === "function") {
        const afterBridge = SS.get && SS.get();
        const pageForPick = afterBridge && afterBridge.page ? afterBridge.page : {};
        const picked = DF.pickForComposition(pageForPick, ctx, businessDescription);
        SS.patch(function (d) {
          if (!d.page) d.page = {};
          d.page.industry = genIndustry;
          if (typeof DF.applyCohesiveDesignToPage === "function") {
            DF.applyCohesiveDesignToPage(d.page, picked.id, genIndustry, {
              preserveSiteComposition: !!d.page.compositionLocked,
            });
          } else if (typeof DF.applyColorSetToPage === "function") {
            DF.applyColorSetToPage(d.page, picked.id, genIndustry, {
              applyFamilyTokens: true,
              preserveSiteComposition: !!d.page.compositionLocked,
            });
          } else {
            DF.applyToPage(d.page, picked.id, { industry: genIndustry });
          }
        });
        if (typeof DF.applyToPreviewDOM === "function") {
          const afterPick = SS.get && SS.get();
          if (afterPick && afterPick.page) DF.applyToPreviewDOM(afterPick.page);
        }
        SS.applyPageToBody && SS.applyPageToBody();
      } else if (DF && typeof DF.pickForContext === "function") {
        const picked = DF.pickForContext(ctx, businessDescription);
        SS.patch(function (d) {
          if (!d.page) d.page = {};
          d.page.industry = genIndustry;
          if (typeof DF.applyCohesiveDesignToPage === "function") {
            DF.applyCohesiveDesignToPage(d.page, picked.id, genIndustry, {
              preserveSiteComposition: !!d.page.compositionLocked,
            });
          } else if (typeof DF.applyColorSetToPage === "function") {
            DF.applyColorSetToPage(d.page, picked.id, genIndustry, {
              applyFamilyTokens: true,
              preserveSiteComposition: !!d.page.compositionLocked,
            });
          } else {
            DF.applyToPage(d.page, picked.id, { industry: genIndustry });
          }
        });
        if (typeof DF.applyToPreviewDOM === "function") {
          const afterPick = SS.get && SS.get();
          if (afterPick && afterPick.page) DF.applyToPreviewDOM(afterPick.page);
        }
        SS.applyPageToBody && SS.applyPageToBody();
      }

      SS.patch(function (d) {
        if (!d.page) d.page = {};
        d.page.industry = genIndustry;
        d.page.area = area;
        d.page.createMode = createMode;
        if (ctx.siteType) d.page.siteType = ctx.siteType;
        if (ctx.createSections && ctx.createSections.length) {
          d.page.createSections = ctx.createSections.map(function (s) {
            return { id: s.id, label: s.label };
          });
        }
        if (ctx.createBusinessName) {
          d.page.createBusinessName = String(ctx.createBusinessName).slice(0, 120);
        }
        if (ctx.createBusinessDescription) {
          d.page.createBusinessDescription = String(ctx.createBusinessDescription).slice(0, 600);
        }
        if (ctx.createBusinessBrief) {
          d.page.createBusinessBrief = String(ctx.createBusinessBrief).slice(0, 600);
        }
        if (ctx.createDesignStyle) {
          d.page.createDesignStyle = {
            id: ctx.createDesignStyle.id,
            letter: ctx.createDesignStyle.letter,
            title: ctx.createDesignStyle.title,
            description: ctx.createDesignStyle.description,
          };
        }
        if (ctx.createSiteGoals && ctx.createSiteGoals.length) {
          d.page.createSiteGoals = ctx.createSiteGoals.map(function (goal) {
            return {
              id: goal.id,
              letter: goal.letter,
              title: goal.title,
              description: goal.description,
            };
          });
        }
        if (ctx.createExistingSite) {
          d.page.createExistingSite = {
            id: ctx.createExistingSite.id,
            letter: ctx.createExistingSite.letter,
            title: ctx.createExistingSite.title,
            description: ctx.createExistingSite.description,
          };
          if (ctx.createExistingSite.existingUrl) {
            d.page.createExistingSite.existingUrl = String(ctx.createExistingSite.existingUrl).slice(0, 256);
          }
        }
        if (desc) {
          d.page.onboardingDescription = desc.slice(0, 600);
        } else {
          try {
            delete d.page.onboardingDescription;
          } catch (e2) {
            d.page.onboardingDescription = "";
          }
        }
        if (d.page.createFlowPlan && d.page.createFlowPlan.goal) {
          d.page.goal = d.page.createFlowPlan.goal;
        } else if (ctx.plan && ctx.plan.goal) {
          d.page.goal = ctx.plan.goal;
        }
      });
      SS.applyPageToBody();

      showProgress(1);
      if (!freshCreate) {
        if (typeof EE.remountAsync === "function") {
          await EE.remountAsync();
        } else {
          EE.remount();
        }
      }

      await AI.fillFullSite({
        userText: (function () {
          let base =
            Bridge && typeof Bridge.composeGenerationUserText === "function"
              ? Bridge.composeGenerationUserText(ctx)
              : desc;
          const SCE = global.SiteCompositionEngine;
          const docNow = SS.get && SS.get();
          const comp = docNow && docNow.page && docNow.page.siteComposition;
          if (comp && SCE && typeof SCE.toGenerationBrief === "function") {
            base = (base ? base + "\n\n" : "") + SCE.toGenerationBrief(comp);
          }
          return base;
        })(),
        onPhase: async function (phase) {
          showProgress(phase >= 3 ? 3 : phase);
          if (!freshCreate && phase >= 3 && typeof EE.remountAsync === "function") {
            await EE.remountAsync();
          }
        },
      });

      if (GL && typeof GL.logPipelineStage === "function") {
        GL.logPipelineStage("SITE_GENERATION", {
          input: { industry: industry, desc: desc },
          output: { phase: "fillFullSite_complete" },
          validation: { ok: true },
        });
        GL.logPipelineStage("IMAGE_INTELLIGENCE", {
          input: { industry: industry },
          output: { heroBgUrl: SS.get && SS.get()?.page?.heroBgUrl },
          validation: { ok: !!(SS.get && SS.get()?.page?.heroBgUrl) },
        });
        GL.logPipelineStage("TEXT_INTELLIGENCE", {
          input: { brand: brand, desc: desc },
          output: {
            heroTitle: SS.get && SS.get()?.sections?.hero?.content?.["hero-title"],
          },
          validation: {
            ok: !!(SS.get && SS.get()?.sections?.hero?.content?.["hero-title"]),
          },
        });
      }

      applyBriefToDocument(desc, ctx, brand);

      if (GL && typeof GL.logPipelineStage === "function") {
        GL.logPipelineStage("COMPANY_IDENTITY", {
          input: { brand: brand, ctxBrand: ctx.brand },
          output: {
            footerBrand: SS.get && SS.get()?.sections?.footer?.content?.["footer-brand"],
          },
          validation: {
            ok:
              !GI || typeof GI.isPlaceholderBrand !== "function"
                ? true
                : !GI.isPlaceholderBrand(
                    (SS.get && SS.get()?.sections?.footer?.content?.["footer-brand"]) || "",
                  ),
          },
        });
        GL.logPipelineStage("PLACEHOLDER_REPLACEMENT", {
          input: { desc: desc },
          output: {
            heroTitle: SS.get && SS.get()?.sections?.hero?.content?.["hero-title"],
          },
          validation: { ok: true },
        });
      }

      if (global.MaterialSystem && typeof global.MaterialSystem.applyMaterialToDocument === "function") {
        SS.patch(function (d) {
          global.MaterialSystem.applyMaterialToDocument(d, global.MaterialSystem.getMaterial());
        });
      }

      const integrityCtx = {
        brief: desc,
        brand: brand || ctx.brand || "",
        industry: industry,
      };
      if (GI && typeof GI.repairDocumentForCreate === "function") {
        SS.patch(function (d) {
          GI.repairDocumentForCreate(d, integrityCtx);
        });
      }
      if (GI && typeof GI.assertGenerationIntegrity === "function") {
        let docCheck = SS.get && SS.get();
        let validation = GI.validateDocument(docCheck, integrityCtx);
        if (!validation.ok && GI.repairDocumentForCreate) {
          SS.patch(function (d) {
            GI.repairDocumentForCreate(d, integrityCtx);
          });
          docCheck = SS.get && SS.get();
          validation = GI.validateDocument(docCheck, integrityCtx);
        }
        GI.assertGenerationIntegrity(docCheck, integrityCtx);
      }
      if (GL && typeof GL.logPipelineStage === "function") {
        GL.logPipelineStage("FINAL_VALIDATION", {
          input: integrityCtx,
          output: { ok: true },
          validation: { ok: true },
        });
      }

      const SCE = global.SiteCompositionEngine;
      if (SCE && typeof SCE.artDirectorPostGenerationReview === "function") {
        let designScore = null;
        SS.patch(function (d) {
          designScore = SCE.artDirectorPostGenerationReview(d, buildPlan, AI);
          if (!d.page) d.page = {};
          d.page.artDirectorDesignScore = designScore;
        });
        if (designScore) {
          try {
            console.info("[Easily · art-director]", designScore);
          } catch (eLog) {
            /* ignore */
          }
          if (GL && typeof GL.logPipelineStage === "function") {
            GL.logPipelineStage("ART_DIRECTOR_SCORE", {
              input: { brand: brand, industry: industry },
              output: designScore,
              validation: { ok: true },
            });
          }
        }
      }

      SS.save();
      if (GL && typeof GL.log === "function") {
        GL.log("DOCUMENT_CREATED", {
          heroTitle: SS.get && SS.get()?.sections?.hero?.content?.["hero-title"],
        });
        GL.log("STATE_UPDATED", { saved: true });
        GL.log("PREVIEW_UPDATED", { forced: true });
      }
      if (GL && typeof GL.logPipelineStage === "function") {
        GL.logPipelineStage("FINAL_RENDER", {
          input: { forced: true },
          output: null,
          validation: { ok: true },
        });
      }
      if (typeof EE.remountAsyncForced === "function") {
        await EE.remountAsyncForced();
      } else if (typeof EE.remountAsync === "function") {
        await EE.remountAsync(true);
      } else {
        EE.remount(true);
      }
    };

    try {
      if (typeof AI.withMacroGeneration === "function") {
        await withTimeout(AI.withMacroGeneration(run), GENERATION_TIMEOUT_MS);
      } else {
        document.documentElement.classList.add("studio-is-generating");
        try {
          await withTimeout(run(), GENERATION_TIMEOUT_MS);
        } finally {
          document.documentElement.classList.remove("studio-is-generating");
        }
      }
    } finally {
      global.__STUDIO_BRAND__ = null;
      hideProgress();
      document.documentElement.classList.remove("studio-is-generating");
    }
  }

  function handleImproveOnly(description) {
    const SS = global.SiteState;
    if (SS && SS.patch) {
      SS.patch(function (d) {
        if (!d.page) d.page = {};
        d.page.createMode = "improve";
        if (description) d.page.onboardingDescription = String(description).trim().slice(0, 600);
      });
      SS.save();
    }
    toast(
      "Beskrivning sparad — skriv i chatten till vänster vad du vill ändra på sidan.",
      "success",
      4200
    );
  }

  function buildPipelineHooks() {
    return {
      getConversationSignals: function () {
        return {
          lastAssistantAction: chatActionContext.lastAssistantAction,
          lastUserImageRequest: chatActionContext.lastUserImageRequest,
          lastWrongAction: chatActionContext.lastWrongAction,
          hasRecentImageContext:
            hasRecentImageRequest() ||
            hasPendingImageCorrection() ||
            chatActionContext.lastAssistantAction === "image_failed",
        };
      },
      looksLikeImageRequest: looksLikeImageRequest,
      looksLikeImageRetry: looksLikeImageRetry,
      looksLikeMissingHeroImageComplaint: looksLikeMissingHeroImageComplaint,
      looksLikeWrongHeroImageFeedback: looksLikeWrongHeroImageFeedback,
      looksLikeUserCorrection: looksLikeUserCorrection,
      looksLikeColorChangeRequest: looksLikeColorChangeRequest,
      looksLikeFullRebuildRequest: looksLikeFullRebuildRequest,
      looksLikeBusinessRebrief: looksLikeBusinessRebrief,
      looksLikeWrongIndustryComplaint: looksLikeWrongIndustryComplaint,
      hasRecentImageContext: function () {
        return (
          hasRecentImageRequest() ||
          hasPendingImageCorrection() ||
          chatActionContext.lastAssistantAction === "image_failed"
        );
      },
      resolveRetryImageText: resolveRetryImageText,
      buildHeroRetryFromDoc: buildHeroRetryFromDoc,
      wrongHeroRetryCommand: function () {
        return "byt hero-bild till snickare med verktyg och trä";
      },
      isTextIndustryCorrection: function (text) {
        const s = String(text || "").toLowerCase();
        return /fel.*text|konsult|inte snickare|blandas/.test(s) && !looksLikeMissingHeroImageComplaint(text);
      },
      shouldAdaptIndustry: function (text) {
        if (isChatComplaintNotBrief(text)) return false;
        if (looksLikeImageRequest(text)) return false;
        if (looksLikeWrongIndustryComplaint(text)) return true;
        return shouldAdaptIndustryFromBrief(text);
      },
      rememberUserImageRequest: rememberUserImageRequest,
      syncSiteIndustryFromSignals: syncSiteIndustryFromSignals,
      executeHeroImage: executeImageRequestFromChat,
      heroPipelineOk: heroPipelineOk,
      applyColorChange: function (cmdText) {
        return Promise.resolve(
          applyColorChangeFromChat({ skipMessage: true, userText: cmdText }),
        );
      },
      adaptIndustry: adaptIndustryFromBrief,
      rebuildSite: rebuildSiteFromBrief,
      noteImageRequestHandled: noteImageRequestHandled,
      noteAssistantAction: noteAssistantAction,
      resolveLegacyIntent: function (text) {
        const cmd = String(text || "").toLowerCase().trim();
        const target = selectedSectionId || inferSectionFromCommand(cmd);
        if (/prislista|lägg till en prislista|visa priser/.test(cmd)) {
          return { type: "legacy", target: "pricelist", command: text };
        }
        if (/ta bort|dölj sektion|dölj den|hide section/.test(cmd)) {
          return { type: "legacy", target: "section:" + (target || "hero"), command: text, meta: { hide: true } };
        }
        if (/lägg till bokning|visa bokning|aktivera bokning/.test(cmd)) {
          return { type: "legacy", target: "section:booking", command: text, meta: { showBooking: true } };
        }
        if (/hunddagis|hundpassning|hundpassa|hundpension|dagis.*hund|hund.*dagis/.test(cmd)) {
          return { type: "legacy", target: "industry:hunddagis", command: text };
        }
        if (target && wantsSectionRegeneration(cmd)) {
          return { type: "legacy", target: "section:" + target, command: text, meta: { regen: true, sectionId: target } };
        }
        return null;
      },
      runLegacyHandler: runLegacyEditCommand,
    };
  }

  async function runLegacyEditCommand(intent, text) {
    const cmd = String(text || "").toLowerCase().trim();
    const AI = global.AISiteBuilder;
    const SS = global.SiteState;
    const EE = global.EditorEngine;
    const ES = global.EditSession;
    const CP = global.EditCommandPipeline;
    const target = selectedSectionId || inferSectionFromCommand(cmd);

    if (intent && (intent.target === "about.image" || intent.target === "gallery.image")) {
      const MS = global.MaterialSystem;
      const command = (intent && intent.command) || text;
      let matResult = null;
      if (MS && typeof MS.handleMaterialChatCommand === "function") {
        matResult = MS.handleMaterialChatCommand(command);
      }
      if (CP && typeof CP.syncPreview === "function") {
        await CP.syncPreview(intent.target);
      } else if (EE && EE.remountAsync) {
        await EE.remountAsync();
      } else if (EE && EE.remount) {
        EE.remount();
      }
      SS && SS.save && SS.save();
      const ok = !!(matResult && matResult.ok !== false);
      const result = {
        handled: true,
        ok: ok,
        verified: ok,
        action: intent.target === "about.image" ? "about.image" : "gallery.image",
        requestedTarget: intent.target,
        message: (matResult && matResult.message) || "",
        failureReason: ok ? null : "material_failed",
      };
      return ES && ES.wrapPipelineResult ? ES.wrapPipelineResult(result) : result;
    }

    if (intent && intent.type === "legacy" && intent.meta && intent.meta.regen) {
      showProgress(2);
      try {
        const sectionId = intent.meta.sectionId || target || "hero";
        const lockKey = sectionId + ":text";
        if (ES && ES.isComponentLocked && ES.isComponentLocked(lockKey)) {
          return ES && ES.wrapPipelineResult
            ? ES.wrapPipelineResult({
                handled: true,
                ok: false,
                verified: false,
                action: "section.regen",
                requestedTarget: "section:" + sectionId,
                message: "",
                failureReason: "locked",
              })
            : {
                handled: true,
                ok: false,
                verified: false,
                action: "section.regen",
                requestedTarget: "section:" + sectionId,
                message: "",
              };
        }
        const before = global.EditCommandPipeline
          ? global.EditCommandPipeline.captureSnapshot("section:" + sectionId)
          : null;
        if (global.AIActions && typeof global.AIActions.runSectionTarget === "function") {
          await global.AIActions.runSectionTarget(sectionId);
        }
        if (global.EditCommandPipeline) await global.EditCommandPipeline.syncPreview("section:" + sectionId);
        else EE && EE.remount && EE.remount();
        const after = global.EditCommandPipeline
          ? global.EditCommandPipeline.captureSnapshot("section:" + sectionId)
          : null;
        const verified =
          before && after && global.EditCommandPipeline
            ? global.EditCommandPipeline.verifyChange(before, after, "section:" + sectionId).ok
            : true;
        const result = {
          handled: true,
          ok: verified,
          verified: verified,
          action: "section.regen",
          requestedTarget: "section:" + sectionId,
          message: verified
            ? ""
            : "Det där blev inte som jag tänkte.\n\nVill du att jag provar igen?",
        };
        return ES && ES.wrapPipelineResult ? ES.wrapPipelineResult(result) : result;
      } finally {
        hideProgress();
      }
    }

    if (global.MaterialSystem && typeof global.MaterialSystem.handleMaterialChatCommand === "function") {
      const matResult = global.MaterialSystem.handleMaterialChatCommand(text);
      if (matResult && !looksLikeImageRequest(text)) {
        if (matResult.ok && global.EditCommandPipeline) await global.EditCommandPipeline.syncPreview("hero.image");
        return {
          handled: true,
          ok: !!matResult.ok,
          verified: !!matResult.ok,
          action: "material",
          requestedTarget: "material",
          message: matResult.message || "",
        };
      }
    }

    if (global.PricelistFlow) {
      const pr = global.PricelistFlow.handleEditCommand(text);
      if (pr.handled) {
        if (pr.action === "paste") {
          global.PricelistFlow.openEditorWithPaste(text);
        } else if (pr.action === "offer") {
          global.PricelistFlow.offerFromChat();
        }
        return {
          handled: true,
          ok: true,
          verified: true,
          action: "pricelist",
          requestedTarget: "pricelist",
          message: pr.message || "",
        };
      }
    }

    if (intent && intent.type === "legacy" && intent.meta && intent.meta.hide) {
      const id = (intent.target && intent.target.split(":")[1]) || target || "hero";
      if (SS && SS.patch) {
        SS.patch(function (d) {
          if (d.sections && d.sections[id]) d.sections[id].hidden = true;
        });
        SS.save();
      }
      clearPreviewSelection();
      if (EE && EE.syncVisibilityFromState) EE.syncVisibilityFromState();
      else EE && EE.remount && EE.remount();
      return {
        handled: true,
        ok: true,
        verified: true,
        action: "section.hide",
        requestedTarget: "section:" + id,
        message: "Sektionen är borttagen från sidan.",
      };
    }

    if (intent && intent.meta && intent.meta.showBooking) {
      if (SS && SS.patch) {
        SS.patch(function (d) {
          if (d.sections && d.sections.booking) d.sections.booking.hidden = false;
        });
        SS.save();
      }
      EE && EE.remount && EE.remount();
      return {
        handled: true,
        ok: true,
        verified: true,
        action: "section.show",
        requestedTarget: "section:booking",
        message: "Bokningssektionen är tillagd.",
      };
    }

    if (intent && intent.target === "industry:hunddagis" && AI && SS) {
      showProgress(2);
      try {
        SS.patch(function (d) {
          if (!d.page) d.page = {};
          d.page.industry = "hunddagis";
        });
        SS.applyPageToBody && SS.applyPageToBody();
        const run = function () {
          return AI.fillFullSite();
        };
        if (typeof AI.withMacroGeneration === "function") {
          await AI.withMacroGeneration(run);
        } else {
          await run();
        }
        SS.save();
        if (global.EditCommandPipeline) await global.EditCommandPipeline.syncPreview("industry");
        else EE && EE.remount && EE.remount();
        return {
          handled: true,
          ok: true,
          verified: true,
          action: "industry.adapt",
          requestedTarget: "industry",
          message: "Sidan känns mer som ett hunddagis nu.\n\nVad tycker du?",
        };
      } finally {
        hideProgress();
      }
    }

    if (target && isSectionSelectOnly(cmd, target)) {
      selectSectionForEditing(target, { assistantMessage: false });
      return {
        handled: true,
        ok: true,
        verified: true,
        action: "section.select",
        requestedTarget: "section:" + target,
        message:
          (SECTION_CHIP_LABELS[target] || target) +
          " är vald — inget har ändrats. Skriv vad du vill ha annorlunda.",
      };
    }

    if (!looksLikeImageRequest(text) && !(global.EditCommandPipeline && global.EditCommandPipeline.getConversationContext().pending)) {
      if (await dispatchChatIntent(text)) {
        return { handled: true, ok: true, verified: false, action: "design.intent", requestedTarget: "design", message: "" };
      }
    }

    if (tryAnswerHowToQuestion(text) && !looksLikeImageRequest(text)) {
      return { handled: true, ok: true, verified: true, action: "help", requestedTarget: "help", message: "" };
    }

    await dispatchChatIntent(text, { fallback: true });
    return { handled: true, ok: false, verified: false, action: "fallback", requestedTarget: null, message: "" };
  }

  async function handleEditCommand(text, opts) {
    opts = opts || {};
    if (!hasGeneratedSite()) return;

    const descArea = document.getElementById("welcomeBusinessDescription");
    const btn = document.getElementById("welcomeGenerateBtn");

    logStudioTestDebug({
      mode: "edit",
      command: text,
      selectedSection: selectedSectionId || inferSectionFromCommand(String(text || "").toLowerCase().trim()),
    });
    const dbg = heroDbg();
    dbg && dbg.log("CHAT_RECEIVED", text);

    if (!opts.skipUserAppend) {
      appendUserMessage(text);
    }
    if (descArea) descArea.value = "";

    if (btn) {
      btn.disabled = true;
      btn.classList.add("is-busy");
      btn.setAttribute("aria-busy", "true");
    }

    try {
      const liveDoc = global.SiteState && global.SiteState.get ? global.SiteState.get() : null;
      if (liveDoc && liveDoc.page && liveDoc.page.createPath === "v2") {
        const Api = global.SiteApi;
        const SS = global.SiteState;
        if (!Api || typeof Api.request !== "function" || !SS || !SS.patch) {
          appendAssistantMessage("AI-redigeringen kunde inte starta. Webbplatsen har inte ändrats.");
          return;
        }
        const response = await Api.request("/api/v2/edit-scene", {
          method: "POST",
          body: {
            creativeBrief: liveDoc.page.creativeBrief || {},
            sceneGraph: liveDoc.page.v2SceneGraph,
            instruction: String(text || "").trim(),
          },
          timeoutMs: 600000,
        });
        if (!response || !response.ok || !response.sceneGraph || !Array.isArray(response.compiledProfiles)) {
          const conflict = response && Array.isArray(response.conflicts) && response.conflicts[0];
          appendAssistantMessage(
            conflict && conflict.message
              ? "Ändringen gick inte att genomföra tekniskt: " + conflict.message + " Webbplatsen är oförändrad."
              : "AI kunde inte genomföra ändringen. Webbplatsen är oförändrad och din instruktion finns kvar i chatten.",
          );
          return;
        }
        SS.patch(function (doc) {
          if (!doc.page) doc.page = {};
          if (!doc.meta) doc.meta = {};
          doc.page.createPath = "v2";
          doc.page.v2GenerationId = response.generationId;
          doc.page.v2SceneGraph = response.sceneGraph;
          doc.page.v2LockedBlueprint = response.lockedBlueprint;
          doc.page.v2ResolvedProfiles = response.resolvedProfiles;
          doc.page.v2RenderManifests = response.renderManifests;
          doc.page.v2CompiledProfiles = response.compiledProfiles;
          doc.meta.visibleGenerationId = response.generationId;
          doc.meta.generationEngine = "v2";
        });
        SS.save();
        if (typeof SS.flushRemoteSave === "function") {
          const saved = await SS.flushRemoteSave({ throwOnError: true });
          if (!saved || saved.ok === false) throw new Error("v2_edit_persistence_failed");
        }
        await cdRemountPreviewAsync(SS);
        appendAssistantMessage("Klart — jag ändrade den befintliga webbplatsen. Ingen ny sida eller gammal mall skapades.");
        return;
      }

      const pipeline = global.EditCommandPipeline;
      if (pipeline && typeof pipeline.run === "function") {
        const result = await pipeline.run(text, buildPipelineHooks());
        logStudioTestDebug({
          mode: "edit_result",
          action: result && result.action,
          target: result && result.requestedTarget,
          ok: result && result.ok,
          verified: result && result.verified,
        });
        if (result && result.handled !== false && result.message) {
          appendAssistantMessage(result.message, result.chips);
        }
        if (result && result.ok && result.action && result.action.indexOf("hero.image") === 0) {
          scrollPreviewToTop();
        }
        return;
      }

      /* Fallback om pipeline saknas */
      if (looksLikeImageRequest(text)) {
        rememberUserImageRequest(text);
        const ok = await executeImageRequestFromChat(text);
        if (!ok) {
          appendAssistantMessage("Jag kunde inte lägga in bilden just nu.\n\n" + IMAGE_FAIL_HINT);
          noteAssistantAction("image_failed");
        }
        return;
      }
      await dispatchChatIntent(text, { fallback: true });
    } catch (err) {
      console.warn("welcome-flow edit", err);
      appendAssistantMessage("Det gick inte just nu — vill du att jag provar igen?");
    } finally {
      releaseChatUi();
    }
  }

  function bindWelcome() {
    const pane = getCreatePane();
    const descArea = document.getElementById("welcomeBusinessDescription");
    const brandInput = document.getElementById("welcomeBrandName");
    const btn = document.getElementById("welcomeGenerateBtn");
    const skip = document.getElementById("welcomeSkipBtn");
    if (!pane || !btn || !descArea) return;
    if (pane.dataset.welcomeBound === "1") return;
    pane.dataset.welcomeBound = "1";

    skip &&
      skip.addEventListener("click", function () {
        try {
          localStorage.setItem(STORAGE_KEY, "1");
        } catch (e) {
          /* ignore */
        }
        const EE = global.EditorEngine;
        if (EE && EE.remount) EE.remount();
        setPreviewState(PREVIEW.SITE);
        enterEditMode({ skipIntro: true });
      });

    bindSectionChipDelegation();

    const rebuildBtn = document.getElementById("welcomeRebuildBtn");
    if (rebuildBtn) {
      rebuildBtn.addEventListener("click", async function () {
        if (!hasGeneratedSite()) return;
        const descArea = document.getElementById("welcomeBusinessDescription");
        const brief =
          (descArea && descArea.value ? descArea.value.trim() : "") ||
          rebuildBtn.dataset.rebuildBrief ||
          "";
        rebuildBtn.disabled = true;
        try {
          await rebuildSiteFromBrief(brief, { quiet: false });
        } finally {
          rebuildBtn.disabled = false;
        }
      });
    }

    descArea.addEventListener("keydown", function (ev) {
      if (ev.key === "Enter" && !ev.shiftKey) {
        ev.preventDefault();
        if (!btn.disabled && !btn.classList.contains("is-busy")) btn.click();
      }
    });

    btn.addEventListener("click", async function () {
      const bizDesc = getBusinessDescriptionForSubmit();
      const createMode = getCreateMode();
      const AI = global.AISiteBuilder;

      if (!hasGeneratedSite() && isCreateChatPhase()) {
        await startCreateFlowGeneration();
        return;
      } else if (!bizDesc) {
        toast(hasGeneratedSite() ? "Skriv vad du vill ändra." : "Skriv en kort beskrivning först.", "info", 2800);
        descArea.focus();
        return;
      }

      const isEdit = !isCreateChatPhase() && hasGeneratedSite();
      logStudioTestDebug({ mode: isEdit ? "edit" : "create", messagePreview: bizDesc.slice(0, 80) });

      if (isEdit) {
        await handleEditCommand(bizDesc);
        return;
      }

      if (createMode === "improve" && !isNewSiteRequest()) {
        try {
          localStorage.setItem(STORAGE_KEY, "1");
        } catch (e2) {
          /* ignore */
        }
        setPreviewState(PREVIEW.SITE);
        handleImproveOnly(bizDesc);
        enterEditMode({ skipIntro: true });
        return;
      }

      let ctx = resolveCreateContextWithSiteType(bizDesc, getSelectedSiteType(), collectCreateFlowMetadata());
      const brand = ctx.brand || "";
      const generationBrief = bizDesc;

      if (brandInput && brand) brandInput.value = brand;

      logStudioTestDebug({
        mode: "create",
        businessType: ctx.industry,
        businessName: brand || ctx.brand || null,
        messagePreview: bizDesc.slice(0, 80),
      });

      btn.disabled = true;
      btn.classList.add("is-busy");
      btn.setAttribute("aria-busy", "true");

      try {
        await prepareFreshWebsiteForCreateFlow(brand || bizDesc.slice(0, 48) || "Ny hemsida");
        showProgress(0);
        appendUserMessage(generationBrief);
        appendAssistantMessage(createAckMessage(generationBrief, ctx));
        descArea.value = "";
        await runMagicGeneration(ctx, brand, generationBrief, "new");
        try {
          localStorage.setItem(STORAGE_KEY, "1");
        } catch (e2) {
          /* ignore */
        }
        showGeneratedSite();
        const pageAfterAlt = global.SiteState.get && global.SiteState.get()?.page;
        const SCEAlt = global.SiteCompositionEngine;
        if (
          SCEAlt &&
          pageAfterAlt &&
          pageAfterAlt.artDirectorDesignScore &&
          typeof SCEAlt.designScoreToText === "function"
        ) {
          appendAssistantMessage(SCEAlt.designScoreToText(pageAfterAlt.artDirectorDesignScore));
        }
        toast("Klart — din hemsida är redo att finslipa.", "success", 3600);
      } catch (err) {
        hideProgress();
        if (global.ProjectIsolation && typeof global.ProjectIsolation.endNewGeneration === "function") {
          global.ProjectIsolation.endNewGeneration();
        }
        clearPreviewSiteDom();
        setPreviewState(PREVIEW.EMPTY);
        console.warn("welcome-flow", err);
        toastGenerationError(err);
        showCreatePane();
      } finally {
        btn.disabled = false;
        btn.classList.remove("is-busy");
        btn.removeAttribute("aria-busy");
      }
    });
  }

  function openWelcome() {
    bindWelcome();
    showCreatePane();
    const descArea = document.getElementById("welcomeBusinessDescription");
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        try {
          if (descArea) descArea.focus({ preventScroll: true });
        } catch (e2) {
          /* ignore */
        }
      });
    });
  }

  document.addEventListener(
    "studio:ready",
    function () {
      if (document.body.getAttribute("data-studio-mode") !== "readonly" && shouldResumeLoadedProject()) {
        delete document.documentElement.dataset.studioPreviewPending;
        requestAnimationFrame(function () {
          resumeLoadedSite();
        });
        return;
      }

      if (!shouldOffer()) {
        delete document.documentElement.dataset.studioPreviewPending;
        if (document.body.getAttribute("data-studio-mode") !== "readonly") {
          requestAnimationFrame(function () {
            bindWelcome();
            if (hasGeneratedSite()) {
              setPreviewState(PREVIEW.SITE);
              enterEditMode({ skipIntro: true });
            } else {
              const main = document.getElementById("siteMain");
              if (main && main.querySelector(".site-section")) {
                setPreviewState(PREVIEW.SITE);
                enterEditMode({ skipIntro: true });
              } else {
                openWelcome();
              }
            }
          });
        }
        return;
      }

      document.documentElement.dataset.studioPreviewPending = "1";
      clearPreviewSiteDom();

      if (isNewSiteRequest()) {
        clearNewParam();
      }

      if (global.ProjectIsolation && typeof global.ProjectIsolation.beginNewProject === "function") {
        global.ProjectIsolation.beginNewProject({
          source: isNewSiteRequest() ? "studio-ready-new-url" : "studio-ready-create-offer",
          skipChatReset: true,
        });
      } else {
        var docKey = global.SiteState && global.SiteState.STORAGE_KEY;
        if (docKey) {
          try {
            localStorage.removeItem(docKey);
          } catch (e) {
            /* ignore */
          }
        }
        if (global.SiteState && global.SiteState.replace && global.AppDocument && global.AppDocument.normalize) {
          global.SiteState.replace(global.AppDocument.normalize({}));
        }
      }
      clearPreviewSiteDom();
      setPreviewState(PREVIEW.EMPTY);

      requestAnimationFrame(function () {
        openWelcome();
      });
    },
    { once: true }
  );

  function scrollPreviewToElement(el, opts) {
    if (typeof opts === "number") opts = { offsetRatio: opts };
    opts = opts || {};
    if (!el) return false;
    const scrollEl =
      opts.rawTarget || !el.querySelector ? el : el.querySelector(".section-title") || el;
    const pane = document.getElementById("studioPreviewPane");
    try {
      if (pane && typeof pane.scrollTo === "function") {
        const paneRect = pane.getBoundingClientRect();
        const elRect = scrollEl.getBoundingClientRect();
        let pad = 24;
        if (typeof opts.offsetPx === "number") pad = opts.offsetPx;
        else if (typeof opts.offsetRatio === "number") pad = paneRect.height * opts.offsetRatio;
        pane.scrollTo({
          top: Math.max(0, pane.scrollTop + (elRect.top - paneRect.top) - pad),
          behavior: opts.behavior || "smooth",
        });
        return true;
      }
      scrollEl.scrollIntoView({ behavior: opts.behavior || "smooth", block: opts.block || "start" });
      return true;
    } catch (e) {
      return false;
    }
  }

  function scrollPreviewToTop() {
    const pane = document.getElementById("studioPreviewPane");
    if (pane) pane.scrollTop = 0;
  }

  function navigateSiteHash(href) {
    const hrefStr = String(href || "").trim();
    if (!hrefStr.startsWith("#") || hrefStr.length < 2) return false;
    const id = decodeURIComponent(hrefStr.slice(1).split("?")[0]);
    const target = document.getElementById(id);
    if (!target) return false;
    scrollPreviewToElement(target);
    return true;
  }

  function updateChatLayout() {
    const chat = document.querySelector(".studio-chat");
    const thread = document.getElementById("studioChatThread");
    const intro = document.getElementById("studioChatIntro");
    if (!chat || !thread) return;
    const inCreateWizard = isCreateChatPhase();
    const hasConversation = thread.children.length > 0;
    chat.classList.toggle("studio-chat--conversation", hasConversation && !inCreateWizard);
    thread.hidden = !hasConversation || inCreateWizard;
    if (intro) intro.hidden = hasConversation && !inCreateWizard;
  }

  async function repairSitePreviewOnResume() {
    const SS = global.SiteState;
    const EE = global.EditorEngine;
    const AI = global.AISiteBuilder;
    const GI = global.GenerationIntegrity;
    if (!SS || !SS.patch || !SS.get) return;

    const doc = SS.get();
    if (!doc) return;

    if (doc.page && doc.page.onboardingDescription) {
      const ob = String(doc.page.onboardingDescription).trim();
      if (!isValidBusinessBrief(ob)) {
        SS.patch(function (d) {
          if (!d.page) d.page = {};
          const guessed =
            AI && typeof AI.guessBriefFromDocument === "function" ? AI.guessBriefFromDocument(d) : "";
          if (guessed && isValidBusinessBrief(guessed)) {
            d.page.onboardingDescription = guessed;
          } else {
            try {
              delete d.page.onboardingDescription;
            } catch (e2) {
              d.page.onboardingDescription = "";
            }
          }
        });
      }
    }

    const refreshed = SS.get();
    const brief =
      (refreshed.page && refreshed.page.onboardingDescription) ||
      (AI && typeof AI.guessBriefFromDocument === "function" ? AI.guessBriefFromDocument(refreshed) : "");
    const ctx =
      brief && AI && typeof AI.resolveCreateContext === "function"
        ? AI.resolveCreateContext(brief, {})
        : { industry: refreshed.page && refreshed.page.industry, brand: "", location: refreshed.page && refreshed.page.location };

    applyBriefToDocument(brief, ctx, ctx.brand || "");

    SS.patch(function (d) {
      if (GI && typeof GI.repairDocumentForCreate === "function") {
        GI.repairDocumentForCreate(d, {
          brief: brief,
          brand: ctx.brand,
          industry: ctx.industry || d.page.industry,
        });
      } else if (global.VisualStock && typeof global.VisualStock.applyToDocument === "function") {
        global.VisualStock.applyToDocument(d, {
          replaceStock: true,
          userText: String(d.page.onboardingDescription || brief || "").trim(),
        });
      }
    });
    SS.save();
    SS.applyPageToBody && SS.applyPageToBody();

    if (EE && typeof EE.remountAsync === "function") {
      await EE.remountAsync(true);
    } else if (EE && EE.remount) {
      EE.remount(true);
    }
    if (EE && typeof EE.syncHeroFromState === "function") {
      EE.syncHeroFromState();
    }
  }

  async function resumeLoadedSite() {
    bindWelcome();
    const AI = global.AISiteBuilder;
    const SS = global.SiteState;
    const loadedDoc = SS && SS.get ? SS.get() : null;
    const isCompiledV2 = !!(
      loadedDoc && loadedDoc.page &&
      loadedDoc.page.createPath === "v2" &&
      loadedDoc.page.v2SceneGraph &&
      Array.isArray(loadedDoc.page.v2CompiledProfiles)
    );
    if (isCompiledV2) {
      if (global.EditorEngine && typeof global.EditorEngine.remount === "function") {
        global.EditorEngine.remount();
      }
      setPreviewState(PREVIEW.SITE);
      enterEditMode({ skipIntro: true });
      return;
    }
    if (global.GreenfieldAdapter && global.GreenfieldAdapter.handlesPreview(loadedDoc)) {
      if (loadedDoc && loadedDoc.meta && loadedDoc.meta.greenfieldPreviewPath) {
        enterEditMode({ skipIntro: true });
      } else {
        showCreatePane();
        if (global.QuestionEngineController && global.QuestionEngineController.restoreSavedAnswers) {
          global.QuestionEngineController.restoreSavedAnswers();
        }
      }
      global.GreenfieldAdapter.restore();
      return;
    }
    const incompleteBlueprint = !!(
      loadedDoc && loadedDoc.page && loadedDoc.page.createPath === "blueprint" &&
      (!loadedDoc.page.designSpec || !loadedDoc.page.siteBlueprint)
    );
    if (incompleteBlueprint) {
      enterGenerationCanvas();
      const Bridge = global.CreateFlowBridge;
      const buildPlan = loadedDoc.page.createBuildPlan || (loadedDoc.page.createFlow && loadedDoc.page.createFlow.createBuildPlan);
      if (!Bridge || typeof Bridge.enrichFromBuildPlan !== "function" || !buildPlan) {
        setPreviewState(PREVIEW.EMPTY);
        showCreatePane();
        toast("Generationens svar finns kvar, men byggplanen kunde inte återställas.", "error", 5200);
        return;
      }
      const ctx = Bridge.enrichFromBuildPlan(buildPlan, {});
      const brand = String(ctx.createBusinessName || ctx.brand || "").trim();
      const desc = String(ctx.createBusinessDescription || "").trim();
      showProgress(0);
      try {
        await runMagicGeneration(ctx, brand, desc, "new");
        if (global.ProjectIsolation && typeof global.ProjectIsolation.endNewGeneration === "function") {
          global.ProjectIsolation.endNewGeneration();
        }
        hideProgress();
        setPreviewState(PREVIEW.SITE);
        enterEditMode({ skipIntro: true });
        toast("Generation återupptagen — din hemsida är klar.", "success", 3600);
      } catch (error) {
        hideProgress();
        clearPreviewSiteDom();
        setPreviewState(PREVIEW.EMPTY);
        console.warn("resume-incomplete-blueprint", error);
        toastGenerationError(error);
        showCreatePane();
      }
      return;
    }
    syncSiteIndustryFromSignals();
    prefillEditDescriptionFromSite();
    updateRebuildButtonVisibility();
    if (SS && SS.get) {
      const doc = SS.get();
      if (doc && doc.meta && doc.meta.siteId && global.EditorEngine && global.EditorEngine.syncProjectUrl) {
        global.EditorEngine.syncProjectUrl(doc.meta.siteId);
      }
    }

    await repairSitePreviewOnResume();

    if (AI && SS && typeof AI.siteHasIndustryCopyMismatch === "function") {
      const doc = SS.get && SS.get();
      if (doc && AI.siteHasIndustryCopyMismatch(doc)) {
        const brief =
          resolveBusinessBrief("", doc) ||
          (typeof AI.guessBriefFromDocument === "function" ? AI.guessBriefFromDocument(doc) : "");
        if (brief && isValidBusinessBrief(brief)) {
          await adaptIndustryFromBrief(brief, {
            quiet: true,
            force: true,
            refreshHero: true,
            resume: true,
          });
          toast(
            "Texten passade inte verksamheten — jag har anpassat innehåll och bilder utifrån " +
              (brief.split("—")[0].trim() || "ditt företag") +
              ".",
            "info",
            5600,
          );
        } else {
          toast(
            "Texten känns inte helt rätt än — skriv t.ex. «återvinning Jretur» i chatten så justerar jag utan att röra det du redan skrivit.",
            "info",
            5200,
          );
        }
      }
    }
    setPreviewState(PREVIEW.SITE);
    if (global.DesignMemoryEngine && typeof global.DesignMemoryEngine.ensureMigrated === "function") {
      global.DesignMemoryEngine.ensureMigrated();
    }
    enterEditMode({ skipIntro: true });
    scrollPreviewToTop();
  }

  function inDesignChat(text) {
    if (!global.ChatIntent || typeof global.ChatIntent.inDesignConversation !== "function") return false;
    return global.ChatIntent.inDesignConversation(String(text || "").toLowerCase().trim());
  }

  function tryAnswerHowToQuestion(cmd) {
    if (global.EasilyKnowledge && typeof global.EasilyKnowledge.handleCommand === "function") {
      return global.EasilyKnowledge.handleCommand(cmd, {
        openTab: function (tabId) {
          if (global.StudioPanelModes && typeof global.StudioPanelModes.switchTab === "function") {
            global.StudioPanelModes.switchTab(tabId);
          }
        },
        reply: appendAssistantMessage,
      });
    }
    return false;
  }

  function applyDesignFamily(familyId) {
    noteAssistantAction("design");
    if (global.DesignPanel && typeof global.DesignPanel.applyFamily === "function") {
      return global.DesignPanel.applyFamily(familyId);
    }
    return false;
  }

  function applySiteTheme(themeId) {
    const SS = global.SiteState;
    const EE = global.EditorEngine;
    if (!SS || !SS.patch) return false;
    SS.patch(function (d) {
      if (!d.page) d.page = {};
      d.page.theme = themeId;
    });
    SS.applyPageToBody && SS.applyPageToBody();
    SS.save();
    EE && EE.remount && EE.remount();
    return true;
  }

  function applyExclusiveDesign() {
    const SS = global.SiteState;
    const EE = global.EditorEngine;
    if (!SS || !SS.patch) return false;
    SS.patch(function (d) {
      if (!d.page) d.page = {};
      d.page.template = "editorial";
      d.page.theme = "beige-lux";
    });
    SS.applyPageToBody && SS.applyPageToBody();
    SS.save();
    EE && EE.remount && EE.remount();
    return true;
  }

  async function dispatchChatIntent(cmd, opts) {
    opts = opts || {};
    if (!global.ChatIntent || typeof global.ChatIntent.resolve !== "function") return false;

    if (looksLikeImageRequest(cmd)) {
      const ok = await executeImageRequestFromChat(resolveRetryImageText(cmd) || cmd);
      return ok;
    }

    const result = global.ChatIntent.resolve(cmd);
    if (!result.handled) {
      if (opts.fallback) {
        if (looksLikeImageRetry(cmd) && (hasRecentImageRequest() || chatActionContext.lastAssistantAction === "image_failed")) {
          await retryImageWithFeedback(
            resolveRetryImageText(cmd) || "byt hero-bild till snickare",
            "Jag försöker hero-bilden igen.",
          );
          return true;
        }
        if (
          looksLikeUserCorrection(cmd) ||
          hasPendingImageCorrection() ||
          (hasRecentImageRequest() &&
            /(nej|fortfarande|grå|hero|bild|fel|syns|finns|retar|fungerar)/.test(String(cmd || "").toLowerCase()))
        ) {
          await handleUserCorrection(cmd);
          return true;
        }
        if (result.fallback) {
          if (/bild|foto|hero/.test(String(cmd || "").toLowerCase())) {
            noteAssistantAction("generic_reply");
          }
          appendAssistantMessage(result.fallback);
          return true;
        }
        if (hasRecentImageRequest()) {
          await handleUserCorrection(cmd);
          return true;
        }
      }
      return false;
    }

    if (
      (result.action === "apply_design_family" ||
        result.action === "apply_exclusive_design" ||
        result.action === "apply_theme") &&
      (looksLikeImageRequest(cmd) || hasRecentImageRequest() || hasPendingImageCorrection())
    ) {
      await handleUserCorrection(cmd);
      return true;
    }

    if (result.action === "reply" && /design|känsla|exklusiv|elegant|varm|kontrast/i.test(result.message || "")) {
      noteAssistantAction("design_ask");
    }

    if (result.action === "apply_design_family") applyDesignFamily(result.familyId);
    else if (result.action === "apply_exclusive_design") applyDesignFamily(result.familyId || "cafe");
    else if (result.action === "apply_theme") applyDesignFamily(result.familyId || "cafe");
    else if (result.action === "open_tab" && global.StudioPanelModes) {
      if (result.tabId === "material" && hasRecentImageRequest()) {
        await executeImageRequestFromChat(resolveRetryImageText(cmd) || cmd);
        return true;
      }
      global.StudioPanelModes.switchTab(result.tabId);
    }
    if (result.message) appendAssistantMessage(result.message);
    return true;
  }

  document.addEventListener("studio:preview-mounted", function () {
    if (!hasGeneratedSite() || !selectedSectionId) return;
    const el = document.querySelector('[data-section="' + selectedSectionId + '"]');
    if (el) highlightPreviewSection(el);
  });

  global.StudioWelcome = {
    hasGeneratedSite: hasGeneratedSite,
    getVisibleSections: getVisibleSections,
    resumeLoadedSite: resumeLoadedSite,
    openWelcome: openWelcome,
    resetChatState: resetChatState,
    clearPreviewSiteDom: clearPreviewSiteDom,
    enterGenerationCanvas: enterGenerationCanvas,
    setPreviewState: setPreviewState,
    showGeneratedSite: showGeneratedSite,
    appendUserMessage: appendUserMessage,
    appendAssistantMessage: appendAssistantMessage,
    releaseChatUi: releaseChatUi,
    renderCreateStyleChoices: renderCreateStyleChoices,
    renderCreateSectionChoices: renderCreateSectionChoices,
    buildPipelineHooks: buildPipelineHooks,
    getSelectedSection: function () {
      return selectedSectionId;
    },
    selectPreviewSection: function (sectionId) {
      if (!sectionId) return;
      const el = document.querySelector('[data-section="' + sectionId + '"]');
      if (el) highlightPreviewSection(el);
    },
    clearPreviewSelection: clearPreviewSelection,
    scrollPreviewToElement: scrollPreviewToElement,
    navigateSiteHash: navigateSiteHash,
    updateChatLayout: updateChatLayout,
    isChatCorrection: looksLikeUserCorrection,
    hasPendingImageCorrection: hasPendingImageCorrection,
    hasRecentImageRequest: hasRecentImageRequest,
    noteAssistantReply: noteAssistantAction,
  };

  global.WelcomeFlow = {
    buildPipelineHooks: buildPipelineHooks,
  };
})(typeof window !== "undefined" ? window : globalThis);
