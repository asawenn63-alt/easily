/**
 * Studio vänsterpanel — AI / Ändra själv / Material.
 */
(function (global) {
  "use strict";

  const MANUAL_SECTIONS = [
    { id: "hero", label: "Hero" },
    { id: "services", label: "Tjänster" },
    { id: "about", label: "Om oss" },
    { id: "gallery", label: "Galleri" },
    { id: "faq", label: "Vanliga frågor" },
    { id: "booking", label: "Bokning / Meny" },
    { id: "contact", label: "Kontakt" },
    { id: "footer", label: "Sidfot" },
  ];

  const MANUAL_FIELD_DEFS = {
    hero: [
      { key: "hero-title", label: "Rubrik", type: "text", scope: "content" },
      { key: "hero-lead", label: "Text", type: "textarea", scope: "content" },
    ],
    about: [
      { key: "about-title", label: "Rubrik", type: "text", scope: "content" },
      { key: "about-p1", label: "Text", type: "textarea", scope: "content" },
      { key: "about-p2", label: "Text (stycke 2)", type: "textarea", scope: "content" },
    ],
    services: [
      { key: "services-title", label: "Rubrik", type: "text", scope: "content" },
      { key: "services-lead", label: "Text", type: "textarea", scope: "content" },
    ],
    booking: [
      { key: "booking-title", label: "Rubrik", type: "text", scope: "content" },
      { key: "booking-lead", label: "Text", type: "textarea", scope: "content" },
    ],
    contact: [
      { key: "contact-title", label: "Rubrik", type: "text", scope: "content" },
      { key: "contact-phone", label: "Telefon", type: "text", scope: "content" },
      { key: "contact-email", label: "E-post", type: "text", scope: "content" },
      { key: "contact-address", label: "Adress", type: "textarea", scope: "content" },
    ],
    gallery: [
      { key: "gallery-title", label: "Rubrik", type: "text", scope: "content" },
      { key: "gallery-lead", label: "Text", type: "textarea", scope: "content" },
    ],
    faq: [{ key: "faq-title", label: "Rubrik", type: "text", scope: "content" }],
    footer: [
      { key: "footer-brand", label: "Företagsnamn", type: "text", scope: "content", sectionOverride: "footer" },
    ],
  };

  const SECTION_LABELS = {
    hero: "Hero",
    services: "Tjänster",
    about: "Om oss",
    gallery: "Galleri",
    faq: "Vanliga frågor",
    booking: "Bokning / Meny",
    contact: "Kontakt",
    footer: "Sidfot",
  };

  const V2_ADD_CATALOG = [
    { kind: "new-arrivals", label: "Nyheter", description: "En ny visuell del för butikens senaste produkter." },
    { kind: "sale", label: "Rea", description: "En ny visuell del som lyfter prissänkta produkter." },
    { kind: "featured", label: "Utvalda produkter", description: "Ett handplockat produkturval på startsidan." },
    { kind: "favorites", label: "Våra favoriter", description: "Butikens egna favoriter i sidans befintliga uttryck." },
    { kind: "campaign", label: "Kampanj", description: "En kampanjyta med rubrik, bild, text och uppmaning." },
    { kind: "categories", label: "Kategorier", description: "Tydliga visuella ingångar till butikens sortiment." },
    { kind: "about", label: "Om oss", description: "Berättelsen om verksamheten i sidans befintliga formspråk." },
  ];

  function isV2Document(doc) {
    return !!(doc && doc.page && doc.page.createPath === "v2" && doc.page.v2SceneGraph);
  }

  function getVisibleSectionIds() {
    let ids = [];
    if (global.StudioWelcome && typeof global.StudioWelcome.getVisibleSections === "function") {
      ids = global.StudioWelcome.getVisibleSections() || [];
    }
    if (ids.length) return ids;
    const SS = global.SiteState;
    const doc = SS && SS.get ? SS.get() : null;
    if (doc && doc.sections) {
      MANUAL_SECTIONS.forEach(function (s) {
        const sec = doc.sections[s.id];
        if (s.id === "footer" || (sec && !sec.hidden)) ids.push(s.id);
      });
    }
    if (ids.length) return ids;
    return MANUAL_SECTIONS.map(function (s) {
      return s.id;
    });
  }

  function manualSectionHasFields(sectionId) {
    if (sectionId === "faq") return true;
    return !!(MANUAL_FIELD_DEFS[sectionId] && textFieldsOnly(sectionId).length);
  }

  function sectionLabel(id) {
    if (id === "booking") return getBookingSectionLabel();
    return SECTION_LABELS[id] || id;
  }

  function textFieldsOnly(sectionId) {
    return MANUAL_FIELD_DEFS[sectionId] || [];
  }

  function syncManualSectionHighlight(sectionId) {
    const activeId =
      sectionId ||
      (global.StudioWelcome && global.StudioWelcome.getSelectedSection && global.StudioWelcome.getSelectedSection()) ||
      null;
    document.querySelectorAll("[data-manual-section]").forEach(function (box) {
      box.classList.toggle("is-active", box.getAttribute("data-manual-section") === activeId);
    });
    syncSectionNavActive(activeId);
  }

  function syncSectionNavActive(sectionId) {
    const activeId =
      sectionId ||
      (global.StudioWelcome && global.StudioWelcome.getSelectedSection && global.StudioWelcome.getSelectedSection()) ||
      null;
    document.querySelectorAll("[data-section-nav]").forEach(function (btn) {
      btn.classList.toggle("is-active", btn.getAttribute("data-section-nav") === activeId);
    });
  }

  function buildSectionNav() {
    const track = document.getElementById("studioSectionNavTrack");
    if (!track) return;
    track.innerHTML = "";
    const visible = getVisibleSectionIds();
    visible.forEach(function (id) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "studio-section-nav__chip";
      btn.dataset.sectionNav = id;
      btn.textContent = sectionLabel(id);
      track.appendChild(btn);
    });
    syncSectionNavActive();
  }

  function refreshDesignPanel() {
    const ready = hasGeneratedSite();
    const notice = document.getElementById("studioDesignNotice");
    const content = document.getElementById("studioDesignContent");
    if (notice) notice.hidden = ready;
    if (content) content.hidden = !ready;
    if (ready && global.DesignPanel && typeof global.DesignPanel.mount === "function") {
      document.querySelectorAll("[data-design-panel-root]").forEach(function (root) {
        global.DesignPanel.mount(root);
      });
    }
  }

  function refreshSiteChrome() {
    const ready = hasGeneratedSite();
    const liveDocument = document.body.classList.contains("website-document-active");
    const liveState = global.SiteState && global.SiteState.get ? global.SiteState.get() : null;
    const v2Document = !!(liveState && liveState.page && liveState.page.createPath === "v2");
    const tabsNav = document.querySelector(".studio-panel-tabs");
    if (tabsNav) tabsNav.hidden = !ready;
    document.querySelectorAll("[data-studio-tab]").forEach(function (btn) {
      const tab = btn.getAttribute("data-studio-tab");
      if (tab === "ai") return;
      if (liveDocument) btn.hidden = tab === "design" || tab === "material" || tab === "shop";
      else if (v2Document) btn.hidden = !ready || tab === "design" || tab === "material" || tab === "shop";
      else btn.hidden = tab === "add" || !ready;
    });
    if (!ready && activeTab !== "ai") switchTab("ai");
    if (!liveDocument) {
      if (v2Document) renderV2AddCatalog(liveState);
      if (!v2Document) refreshDesignPanel();
      if (activeTab === "manual") refreshManualPanel();
    }
  }

  let activeTab = "ai";
  let bound = false;
  let materialApplyTimer = null;
  let manualLiveTimer = null;
  let manualPreviewSectionId = null;

  function toast(msg, kind) {
    if (typeof global.showStudioToast === "function") global.showStudioToast(msg, kind || "success", 3200);
  }

  function applyV2ResultToState(response) {
    const SS = global.SiteState;
    if (!SS || !SS.patch) return false;
    SS.patch(function (doc) {
      if (!doc.page) doc.page = {};
      doc.page.createPath = "v2";
      doc.page.v2GenerationId = response.generationId;
      doc.page.v2SceneGraph = response.sceneGraph;
      doc.page.v2LockedBlueprint = response.lockedBlueprint;
      doc.page.v2ResolvedProfiles = response.resolvedProfiles;
      doc.page.v2RenderManifests = response.renderManifests;
      doc.page.v2CompiledProfiles = response.compiledProfiles;
    });
    SS.save();
    return true;
  }

  async function addToV2Scene(item, button) {
    const SS = global.SiteState;
    const doc = SS && SS.get ? SS.get() : null;
    if (!doc || !doc.page || doc.page.createPath !== "v2" || !global.SiteApi) return;
    button.disabled = true;
    button.textContent = "Lägger till…";
    try {
      const response = await global.SiteApi.request("/api/v2/edit-scene", {
        method: "POST",
        body: {
          creativeBrief: doc.page.creativeBrief || {},
          sceneGraph: doc.page.v2SceneGraph,
          instruction: "Lägg till " + item.label + " på startsidan som en ny sammanhängande visuell scen. Bevara resten av webbplatsen exakt och integrera den nya scenen i samma formspråk. Använd tydliga platshållare om verkliga produkter saknas.",
        },
        timeoutMs: 600000,
      });
      if (!response || !response.ok || !response.sceneGraph) throw new Error(response && response.error || "v2_add_failed");
      applyV2ResultToState(response);
      if (typeof SS.flushRemoteSave === "function") await SS.flushRemoteSave({ throwOnError: true });
      const EE = global.EditorEngine;
      if (EE && typeof EE.remountAsync === "function") await EE.remountAsync(true);
      else if (EE && EE.remount) EE.remount(true);
      renderV2AddCatalog(SS.get());
      toast(item.label + " har lagts till på samma webbplats.", "success");
    } catch (error) {
      toast(item.label + " kunde inte läggas till. Webbplatsen är oförändrad.", "error");
    } finally {
      button.disabled = false;
      button.textContent = "Lägg till";
    }
  }

  function renderV2AddCatalog(doc) {
    const root = document.getElementById("websiteDocumentAddChoices");
    if (!root || !doc || !doc.page || doc.page.createPath !== "v2") return;
    root.replaceChildren();
    const lead = document.getElementById("websiteDocumentAddLead");
    if (lead) lead.textContent = "Välj vad som ska läggas till. Det blir en ny del av samma visuella scen och visas direkt.";
    V2_ADD_CATALOG.forEach(function (item) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "website-document-add__v2-choice";
      const copy = document.createElement("span");
      copy.className = "website-document-add__copy";
      const title = document.createElement("strong");
      title.textContent = item.label;
      const description = document.createElement("span");
      description.textContent = item.description;
      const action = document.createElement("span");
      action.className = "website-document-add__action";
      action.textContent = "Lägg till";
      copy.append(title, description);
      button.append(copy, action);
      button.addEventListener("click", function () { addToV2Scene(item, button); });
      root.appendChild(button);
    });
  }

  function hasGeneratedSite() {
    const main = document.getElementById("siteMain");
    const hasDom = !!(main && main.querySelector(".site-section, [data-bp-id], .easily-v2-site"));
    const SS = global.SiteState;
    const doc = SS && SS.get ? SS.get() : null;
    const hasBlueprint = !!(doc && doc.page && doc.page.createPath === "blueprint" && doc.page.siteBlueprint);
    const hasV2 = !!(doc && doc.page && doc.page.createPath === "v2" && doc.page.v2SceneGraph && Array.isArray(doc.page.v2CompiledProfiles));
    if (global.StudioWelcome && typeof global.StudioWelcome.hasGeneratedSite === "function") {
      return global.StudioWelcome.hasGeneratedSite() || hasDom || hasBlueprint || hasV2;
    }
    return hasDom || hasBlueprint || hasV2;
  }

  function getBookingSectionLabel() {
    const SS = global.SiteState;
    const ind = SS && SS.get && SS.get()?.page?.industry;
    if (ind === "restaurang" || ind === "cafe") return "Meny";
    return "Bokning / Meny";
  }

  function switchTab(tabId) {
    const liveDocument = document.body.classList.contains("website-document-active");
    if (liveDocument && (tabId === "design" || tabId === "material")) tabId = "manual";
    if (tabId !== "ai" && !hasGeneratedSite()) tabId = "ai";
    activeTab = tabId;
    const visibleTabId = liveDocument && tabId === "shop" ? "add" : tabId;
    document.querySelectorAll("[data-studio-tab]").forEach(function (btn) {
      const on = btn.getAttribute("data-studio-tab") === visibleTabId;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-selected", on ? "true" : "false");
    });
    document.querySelectorAll("[data-studio-panel]").forEach(function (panel) {
      const on = panel.getAttribute("data-studio-panel") === tabId;
      panel.hidden = !on;
    });
    document.body.dataset.studioLeftTab = tabId;
    refreshSiteChrome();
    if (!liveDocument && tabId === "manual") refreshManualPanel();
    if (!liveDocument && tabId === "material") loadMaterialForm({ refresh: true });
    if (!liveDocument && tabId === "design") refreshDesignPanel();
  }

  function readFieldValue(doc, field, sectionId) {
    if (!doc) return "";
    const secId = field.sectionOverride || sectionId;
    if (field.scope === "page") return doc.page && doc.page[field.key] != null ? String(doc.page[field.key]) : "";
    if (field.scope === "faqItem") {
      const m = field.key.match(/^(\d+)-(q|a)$/);
      if (!m) return "";
      const items = doc.sections && doc.sections.faq && doc.sections.faq.items;
      const item = items && items[Number(m[1])];
      return item ? String(item[m[2]] || "") : "";
    }
    if (field.scope === "sectionImage") {
      return doc.sections && doc.sections[secId] && doc.sections[secId].imageUrl
        ? String(doc.sections[secId].imageUrl)
        : "";
    }
    const c = doc.sections && doc.sections[secId] && doc.sections[secId].content;
    return c && c[field.key] != null ? String(c[field.key]) : "";
  }

  function writeFieldValue(doc, field, sectionId, value) {
    const secId = field.sectionOverride || sectionId;
    if (field.scope === "page") {
      if (!doc.page) doc.page = {};
      doc.page[field.key] = value;
      return;
    }
    if (field.scope === "faqItem") {
      const m = field.key.match(/^(\d+)-(q|a)$/);
      if (!m) return;
      if (!doc.sections.faq) doc.sections.faq = { content: {}, items: [] };
      doc.sections.faq.items = doc.sections.faq.items || [];
      const i = Number(m[1]);
      while (doc.sections.faq.items.length <= i) doc.sections.faq.items.push({ q: "", a: "" });
      doc.sections.faq.items[i][m[2]] = value;
      return;
    }
    if (field.scope === "sectionImage") {
      if (!doc.sections[secId]) doc.sections[secId] = { content: {} };
      doc.sections[secId].imageUrl = value;
      return;
    }
    if (!doc.sections[secId]) doc.sections[secId] = { content: {} };
    if (!doc.sections[secId].content) doc.sections[secId].content = {};
    doc.sections[secId].content[field.key] = value;
  }

  const MANUAL_PLACEHOLDERS = {
    "hero-title": "Er rubrik högst upp på sidan",
    "hero-lead": "Kort text under rubriken — vad ni erbjuder",
    "about-title": "Rubrik för om oss-sektionen",
    "about-p1": "Berätta om er verksamhet",
    "about-p2": "Valfritt andra stycke",
    "services-title": "Rubrik för tjänsteavsnittet",
    "services-lead": "Kort introtext till tjänsterna",
    "gallery-title": "Rubrik för galleriet",
    "gallery-lead": "Kort text under gallerirubriken",
    "faq-title": "Rubrik för vanliga frågor",
    "booking-title": "Rubrik för bokning eller meny",
    "booking-lead": "Kort text — t.ex. hur man bokar",
    "contact-title": "Rubrik för kontaktsektionen",
    "contact-phone": "Telefonnummer",
    "contact-email": "E-postadress",
    "contact-address": "Adress",
    "footer-brand": "Företagsnamn i sidfoten",
  };

  function manualPlaceholder(key) {
    if (/^\d+-q$/.test(key)) return "T.ex. Hur bokar jag tid?";
    if (/^\d+-a$/.test(key)) return "T.ex. Via bokningslänken eller telefon";
    return MANUAL_PLACEHOLDERS[key] || "Skriv här…";
  }

  function truncatePlaceholder(text, maxLen) {
    const s = String(text || "").replace(/\s+/g, " ").trim();
    if (!s) return "";
    const limit = maxLen || 72;
    if (s.length <= limit) return s;
    return s.slice(0, limit - 1).trim() + "…";
  }

  function manualFieldPlaceholder(field, currentValue) {
    const val = String(currentValue || "").trim();
    if (val) return truncatePlaceholder(val, field.type === "textarea" ? 96 : 64);
    return manualPlaceholder(field.key);
  }

  function escAttr(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;");
  }

  function manualFieldHtml(field, doc, sectionId) {
    const isArea = field.type === "textarea";
    const current = doc ? readFieldValue(doc, field, sectionId || field.sectionOverride || "") : "";
    const ph = escAttr(manualFieldPlaceholder(field, current));
    return (
      '<label class="studio-field studio-field--compact">' +
      '<span class="studio-field__label">' +
      field.label +
      "</span>" +
      (isArea
        ? '<textarea class="studio-field__input studio-field__textarea" rows="3" data-manual-field="' +
          field.key +
          '" data-manual-scope="' +
          field.scope +
          '" placeholder="' +
          ph +
          '"></textarea>'
        : '<input type="text" class="studio-field__input" data-manual-field="' +
          field.key +
          '" data-manual-scope="' +
          field.scope +
          '" placeholder="' +
          ph +
          '" autocomplete="off" />') +
      "</label>"
    );
  }

  function faqItemCount(doc) {
    const items = doc && doc.sections && doc.sections.faq && doc.sections.faq.items;
    return Math.max(items && items.length ? items.length : 0, 1);
  }

  function manualFaqFieldsHtml(doc) {
    let html = manualFieldHtml({ key: "faq-title", label: "Rubrik", type: "text", scope: "content" }, doc, "faq");
    const count = faqItemCount(doc);
    for (let i = 0; i < count; i++) {
      const qField = { key: i + "-q", label: "Fråga " + (i + 1), type: "text", scope: "faqItem" };
      const aField = { key: i + "-a", label: "Svar " + (i + 1), type: "textarea", scope: "faqItem" };
      html += manualFieldHtml(qField, doc, "faq");
      html += manualFieldHtml(aField, doc, "faq");
    }
    html +=
      '<button type="button" class="studio-manual__btn studio-manual__btn--add" data-faq-add aria-label="Lägg till fråga">+ Lägg till fråga</button>';
    return html;
  }

  function manualSectionFieldsHtml(sectionId, doc) {
    if (sectionId === "faq") return manualFaqFieldsHtml(doc);
    return textFieldsOnly(sectionId)
      .map(function (field) {
        return manualFieldHtml(field, doc, sectionId);
      })
      .join("");
  }

  function manualBoxActionsHtml(sectionId) {
    return (
      '<div class="studio-manual__box-actions">' +
      '<button type="button" class="studio-manual__btn studio-manual__btn--save" data-manual-save="' +
      sectionId +
      '">Spara</button>' +
      '<button type="button" class="studio-manual__btn studio-manual__btn--close" data-manual-close="' +
      sectionId +
      '">Stäng</button>' +
      "</div>"
    );
  }

  function normalizeFaqItems(doc, box, savedHints) {
    if (!doc.sections.faq) doc.sections.faq = { content: {}, items: [] };
    const items = [];
    const indices = new Set();
    const saved = savedHints || {};
    box.querySelectorAll('[data-manual-field][data-manual-scope="faqItem"]').forEach(function (input) {
      const m = input.getAttribute("data-manual-field").match(/^(\d+)-(q|a)$/);
      if (m) indices.add(Number(m[1]));
    });
    Array.from(indices)
      .sort(function (a, b) {
        return a - b;
      })
      .forEach(function (i) {
        const qEl = box.querySelector('[data-manual-field="' + i + '-q"]');
        const aEl = box.querySelector('[data-manual-field="' + i + '-a"]');
        const qRaw = qEl ? qEl.value.trim() : "";
        const aRaw = aEl ? aEl.value.trim() : "";
        items.push({
          q: qRaw || saved[i + "-q"] || "",
          a: aRaw || saved[i + "-a"] || "",
        });
      });
    if (!items.length) items.push({ q: "", a: "" });
    doc.sections.faq.items = items;
  }

  function readManualSaved(box) {
    try {
      return JSON.parse(box.dataset.manualSaved || "{}");
    } catch (e) {
      return {};
    }
  }

  function manualEditableKey(field) {
    const key = field.key;
    if (field.scope === "faqItem") {
      const m = key.match(/^(\d+)-(q|a)$/);
      if (m) return "faq-" + m[1] + "-" + m[2];
    }
    return key;
  }

  function effectiveManualValue(input, saved, key) {
    const trimmed = input.value.trim();
    if (trimmed) return trimmed;
    return saved[key] != null ? String(saved[key]) : "";
  }

  function escapePreviewText(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  const CONTACT_FIELD_LABELS = {
    "contact-phone": "Telefon:",
    "contact-email": "E-post:",
    "contact-address": "Adress:",
  };

  function setPreviewEditableText(el, key, value) {
    if (!el) return;
    const label = CONTACT_FIELD_LABELS[key];
    if (label) {
      el.innerHTML = "<strong>" + label + "</strong> " + escapePreviewText(value);
      return;
    }
    el.textContent = value;
  }

  function updatePreviewForManualField(field, value) {
    const key = manualEditableKey(field);
    const main = document.getElementById("siteMain");
    const footer = document.getElementById("siteFooter");

    if (key === "footer-brand") {
      const headerName =
        document.querySelector(".site-industry-logo__name") ||
        document.querySelector(".site-public-header__text-logo-name");
      if (headerName) headerName.textContent = value;
      const legacy = document.querySelector(".site-public-header__brand");
      if (legacy) legacy.textContent = value;
      const footerBrand = footer && footer.querySelector(".footer__brand");
      if (footerBrand) footerBrand.textContent = value;
      return;
    }

    const sel = '[data-editable="' + key + '"]';
    let el = main && main.querySelector(sel);
    if (!el && footer) el = footer.querySelector(sel);
    if (el) setPreviewEditableText(el, key, value);
  }

  function applyManualBoxLive(box, sectionId) {
    if (!box || !global.SiteState) return;
    const saved = readManualSaved(box);

    global.SiteState.patch(function (doc) {
      box.querySelectorAll("[data-manual-field]").forEach(function (input) {
        const field = {
          key: input.getAttribute("data-manual-field"),
          scope: input.getAttribute("data-manual-scope"),
        };
        writeFieldValue(doc, field, sectionId, effectiveManualValue(input, saved, field.key));
      });
      if (sectionId === "faq") normalizeFaqItems(doc, box, saved);
    });

    box.querySelectorAll("[data-manual-field]").forEach(function (input) {
      const field = {
        key: input.getAttribute("data-manual-field"),
        scope: input.getAttribute("data-manual-scope"),
      };
      updatePreviewForManualField(field, effectiveManualValue(input, saved, field.key));
    });
  }

  function scheduleManualLiveApply(box, sectionId) {
    if (!box || !sectionId) return;
    clearTimeout(manualLiveTimer);
    manualLiveTimer = setTimeout(function () {
      applyManualBoxLive(box, sectionId);
      if (global.SiteState && global.SiteState.save) global.SiteState.save();
    }, 280);
  }

  function patchFaqFromBox(box) {
    if (!global.SiteState || !box) return;
    const saved = readManualSaved(box);
    global.SiteState.patch(function (doc) {
      box.querySelectorAll("[data-manual-field]").forEach(function (input) {
        const trimmed = input.value.trim();
        if (!trimmed) return;
        writeFieldValue(
          doc,
          { key: input.getAttribute("data-manual-field"), scope: input.getAttribute("data-manual-scope") },
          "faq",
          trimmed
        );
      });
      normalizeFaqItems(doc, box, saved);
    });
  }

  function rebuildFaqManualBox(focusIndex) {
    const box = document.querySelector('[data-manual-section="faq"]');
    if (!box) return;
    const doc = global.SiteState && global.SiteState.get ? global.SiteState.get() : null;
    const body = box.querySelector(".studio-manual__group-body");
    if (!body) return;
    body.innerHTML = manualFaqFieldsHtml(doc) + manualBoxActionsHtml("faq");
    fillManualBox(box, "faq");
    if (focusIndex != null) {
      const q = box.querySelector('[data-manual-field="' + focusIndex + '-q"]');
      if (q) q.focus();
    }
  }

  function addFaqItem() {
    const box = document.querySelector('[data-manual-section="faq"]');
    if (!box) return;
    patchFaqFromBox(box);
    let newIndex = 0;
    global.SiteState.patch(function (doc) {
      if (!doc.sections.faq) doc.sections.faq = { content: {}, items: [] };
      doc.sections.faq.items.push({ q: "", a: "" });
      newIndex = doc.sections.faq.items.length - 1;
    });
    rebuildFaqManualBox(newIndex);
  }

  function manualFieldsHtml(sectionId) {
    const doc = global.SiteState && global.SiteState.get ? global.SiteState.get() : null;
    return manualSectionFieldsHtml(sectionId, doc);
  }

  function fillManualBox(box, sectionId) {
    const SS = global.SiteState;
    const doc = SS && SS.get ? SS.get() : null;
    const saved = {};
    box.querySelectorAll("[data-manual-field]").forEach(function (input) {
      const field = {
        key: input.getAttribute("data-manual-field"),
        scope: input.getAttribute("data-manual-scope"),
      };
      const val = readFieldValue(doc, field, sectionId);
      input.value = "";
      input.placeholder = manualFieldPlaceholder(
        { key: field.key, type: input.tagName === "TEXTAREA" ? "textarea" : "text" },
        val
      );
      saved[field.key] = val;
    });
    box.dataset.manualSaved = JSON.stringify(saved);
  }

  function v2ContentText(atom) {
    const value = atom && atom.value;
    if (typeof value === "string" || typeof value === "number") return String(value);
    if (value && typeof value === "object") return String(value.label ?? value.text ?? value.value ?? "");
    return "";
  }

  function buildV2ManualSections(doc) {
    const root = document.getElementById("studioManualSections");
    if (!root) return;
    root.innerHTML = "";
    const graph = doc && doc.page && doc.page.v2SceneGraph;
    if (!graph) return;
    const uses = new Map();
    (graph.scenes || []).forEach(function (scene) {
      (scene.nodes || []).forEach(function (node) {
        if (!node.contentRef) return;
        if (!uses.has(node.contentRef)) uses.set(node.contentRef, []);
        uses.get(node.contentRef).push({ scene: scene, node: node });
      });
    });
    const atoms = (graph.contentAtoms || []).filter(function (atom) {
      return (atom.kind === "text" || atom.kind === "action") && uses.has(atom.id);
    });
    if (!atoms.length) {
      root.innerHTML = '<p class="studio-manual__empty">Den här fria scenen saknar redigerbar text.</p>';
      return;
    }
    atoms.forEach(function (atom) {
      const use = uses.get(atom.id)[0];
      const box = document.createElement("fieldset");
      box.className = "studio-material__group studio-manual__group";
      box.dataset.v2ContentId = atom.id;
      const legend = document.createElement("legend");
      legend.className = "studio-material__legend";
      legend.textContent = use.node.semanticRole || atom.semanticPurpose || "Text";
      const label = document.createElement("label");
      label.className = "studio-field studio-field--compact";
      const caption = document.createElement("span");
      caption.className = "studio-field__label";
      caption.textContent = atom.kind === "action" ? "Knapptext" : "Text";
      const input = document.createElement("textarea");
      input.className = "studio-field__input studio-field__textarea";
      input.rows = 3;
      input.value = v2ContentText(atom);
      input.dataset.v2ContentField = atom.id;
      const save = document.createElement("button");
      save.type = "button";
      save.className = "studio-manual__btn studio-manual__btn--save";
      save.dataset.v2ContentSave = atom.id;
      save.textContent = "Spara på sidan";
      label.append(caption, input);
      box.append(legend, label, save);
      root.appendChild(box);
    });
  }

  async function saveV2Content(contentId, button) {
    const SS = global.SiteState;
    const doc = SS && SS.get ? SS.get() : null;
    const field = document.querySelector('[data-v2-content-field="' + CSS.escape(contentId) + '"]');
    if (!doc || !doc.page || doc.page.createPath !== "v2" || !field || !global.SiteApi) return;
    button.disabled = true;
    button.textContent = "Sparar…";
    try {
      const response = await global.SiteApi.request("/api/v2/replace-content", {
        method: "POST",
        body: {
          sceneGraph: doc.page.v2SceneGraph,
          resolvedProfiles: doc.page.v2ResolvedProfiles,
          contentId: contentId,
          value: field.value,
        },
      });
      if (!response || !response.ok) throw new Error(response && response.error || "v2_content_failed");
      SS.patch(function (next) {
        next.page.createPath = "v2";
        next.page.v2SceneGraph = response.sceneGraph;
        next.page.v2LockedBlueprint = response.lockedBlueprint;
        next.page.v2ResolvedProfiles = response.resolvedProfiles;
        next.page.v2RenderManifests = response.renderManifests;
        next.page.v2CompiledProfiles = response.compiledProfiles;
      });
      SS.save();
      if (typeof SS.flushRemoteSave === "function") await SS.flushRemoteSave({ throwOnError: true });
      const EE = global.EditorEngine;
      if (EE && typeof EE.remountAsync === "function") await EE.remountAsync(true);
      else if (EE && EE.remount) EE.remount(true);
      toast("Texten är sparad på samma webbplats.", "success");
    } catch (error) {
      toast("Texten kunde inte sparas. Webbplatsen är oförändrad.", "error");
    } finally {
      button.disabled = false;
      button.textContent = "Spara på sidan";
    }
  }

  function buildManualSections() {
    const root = document.getElementById("studioManualSections");
    if (!root) return;

    const visible = getVisibleSectionIds().filter(function (id) {
      return manualSectionHasFields(id);
    });

    root.innerHTML = "";
    manualPreviewSectionId = null;
    const SS = global.SiteState;
    const doc = SS && SS.get ? SS.get() : null;

    if (!visible.length) {
      root.innerHTML =
        '<p class="studio-manual__empty">Inga redigerbara fält hittades än. Skapa sidan i AI-fliken först.</p>';
      syncManualSectionHighlight();
      return;
    }
    visible.forEach(function (sectionId) {
      const box = document.createElement("fieldset");
      box.className = "studio-material__group studio-manual__group";
      box.dataset.manualSection = sectionId;

      box.innerHTML =
        '<legend class="studio-material__legend">' +
        sectionLabel(sectionId) +
        "</legend>" +
        '<div class="studio-manual__group-body">' +
        manualSectionFieldsHtml(sectionId, doc) +
        manualBoxActionsHtml(sectionId) +
        "</div>";

      fillManualBox(box, sectionId);
      root.appendChild(box);
    });

    syncManualSectionHighlight();
  }

  function scrollToManualSection(sectionId, opts) {
    const box = document.querySelector('[data-manual-section="' + sectionId + '"]');
    if (!box) return;
    box.classList.remove("is-collapsed");
    box.scrollIntoView({ block: "nearest", behavior: "smooth" });
    if (!(opts && opts.focus === false)) {
      const firstField = box.querySelector("[data-manual-field]");
      if (firstField) firstField.focus();
    }
    syncManualSectionHighlight(sectionId);
  }

  function saveManualSection(sectionId) {
    const box = document.querySelector('[data-manual-section="' + sectionId + '"]');
    if (!box || !global.SiteState) return;

    clearTimeout(manualLiveTimer);
    applyManualBoxLive(box, sectionId);
    global.SiteState.save();
    fillManualBox(box, sectionId);
    toast(sectionLabel(sectionId) + " sparad.", "success");
  }

  function closeManualSection(sectionId) {
    const box = document.querySelector('[data-manual-section="' + sectionId + '"]');
    if (!box) return;
    box.querySelectorAll("[data-manual-field]").forEach(function (input) {
      input.value = "";
    });
    box.classList.add("is-collapsed");
  }

  function syncPreviewToManualSection(sectionId) {
    if (!sectionId) return;
    if (global.StudioWelcome && typeof global.StudioWelcome.selectPreviewSection === "function") {
      global.StudioWelcome.selectPreviewSection(sectionId);
    }
    syncManualSectionHighlight(sectionId);
  }

  function refreshManualPanel() {
    const notice = document.getElementById("studioManualNotice");
    const sections = document.getElementById("studioManualSections");
    const ready = hasGeneratedSite();

    if (!ready) {
      if (notice) notice.hidden = false;
      if (sections) sections.hidden = true;
      refreshSiteChrome();
      return;
    }

    if (notice) notice.hidden = true;
    if (sections) sections.hidden = false;
    const doc = global.SiteState && global.SiteState.get ? global.SiteState.get() : null;
    if (doc && doc.page && doc.page.createPath === "v2") {
      buildV2ManualSections(doc);
      return;
    }
    buildManualSections();
    refreshSiteChrome();
  }

  function openManualSection(sectionId, opts) {
    if (!sectionId || !MANUAL_FIELD_DEFS[sectionId]) return;
    if (activeTab !== "manual") return;

    if (!(opts && opts.skipPreviewScroll)) {
      syncPreviewToManualSection(sectionId);
    }

    scrollToManualSection(sectionId, opts && opts.focus === false ? { focus: false } : undefined);
  }

  function loadMaterialForm(opts) {
    const form = document.getElementById("studioMaterialForm");
    if (!form || !global.MaterialSystem) return;
    const refresh = !!(opts && opts.refresh);
    if (!form.dataset.materialPrefilled || refresh) {
      global.MaterialSystem.fillMaterialForm(form, global.MaterialSystem.getMaterial());
      form.dataset.materialPrefilled = "1";
    }
    global.MaterialSystem.bindFileInputs(form);
    bindServiceCardTabs(form);
  }

  function bindServiceCardTabs(form) {
    if (!form || form.dataset.serviceTabsBound === "1") return;
    form.dataset.serviceTabsBound = "1";
    const tabs = form.querySelectorAll("[data-service-tab]");
    const pages = form.querySelectorAll("[data-service-page]");
    if (!tabs.length || !pages.length) return;

    function activate(tabId) {
      tabs.forEach(function (btn) {
        const active = btn.getAttribute("data-service-tab") === tabId;
        btn.classList.toggle("is-active", active);
        btn.setAttribute("aria-selected", active ? "true" : "false");
      });
      pages.forEach(function (panel) {
        const active = panel.getAttribute("data-service-page") === tabId;
        panel.classList.toggle("is-active", active);
        panel.hidden = !active;
      });
    }

    tabs.forEach(function (btn) {
      btn.addEventListener("click", function () {
        activate(btn.getAttribute("data-service-tab"));
      });
    });
  }

  function saveMaterial(form, quiet) {
    if (!global.MaterialSystem) return;
    global.MaterialSystem.saveFromForm(form);
    if (!quiet) toast(hasGeneratedSite() ? "Bilder och länkar sparade." : "Sparat.", "success");
  }

  function scheduleMaterialApply(form) {
    if (!form) return;
    clearTimeout(materialApplyTimer);
    materialApplyTimer = setTimeout(function () {
      saveMaterial(form, true);
    }, 450);
  }

  function bind() {
    if (bound) return;
    bound = true;

    document.querySelectorAll("[data-studio-tab]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        switchTab(btn.getAttribute("data-studio-tab"));
      });
    });

    document.getElementById("studioManualSections") &&
      document.getElementById("studioManualSections").addEventListener("focusin", function (e) {
        const box = e.target.closest("[data-manual-section]");
        if (!box || activeTab !== "manual") return;
        const sectionId = box.getAttribute("data-manual-section");
        if (sectionId === manualPreviewSectionId) return;
        manualPreviewSectionId = sectionId;
        syncPreviewToManualSection(sectionId);
      });

    document.getElementById("studioManualSections") &&
      document.getElementById("studioManualSections").addEventListener("input", function (e) {
        const input = e.target.closest("[data-manual-field]");
        if (!input || activeTab !== "manual") return;
        const box = input.closest("[data-manual-section]");
        if (!box) return;
        scheduleManualLiveApply(box, box.getAttribute("data-manual-section"));
      });

    document.getElementById("studioManualSections") &&
      document.getElementById("studioManualSections").addEventListener("click", function (e) {
        const v2Save = e.target.closest("[data-v2-content-save]");
        if (v2Save) {
          e.preventDefault();
          saveV2Content(v2Save.getAttribute("data-v2-content-save"), v2Save);
          return;
        }
        const saveBtn = e.target.closest("[data-manual-save]");
        if (saveBtn) {
          e.preventDefault();
          saveManualSection(saveBtn.getAttribute("data-manual-save"));
          return;
        }
        const closeBtn = e.target.closest("[data-manual-close]");
        if (closeBtn) {
          e.preventDefault();
          closeManualSection(closeBtn.getAttribute("data-manual-close"));
          return;
        }
        if (e.target.closest("[data-faq-add]")) {
          e.preventDefault();
          addFaqItem();
          return;
        }
        const legend = e.target.closest(".studio-manual__group .studio-material__legend");
        if (legend) {
          const box = legend.closest(".studio-manual__group");
          if (box && box.classList.contains("is-collapsed")) {
            box.classList.remove("is-collapsed");
          }
          syncPreviewToManualSection(box && box.getAttribute("data-manual-section"));
        }
      });

    document.getElementById("studioSectionNavTrack") &&
      document.getElementById("studioSectionNavTrack").addEventListener("click", function (e) {
        const btn = e.target.closest("[data-section-nav]");
        if (!btn || !hasGeneratedSite()) return;
        const id = btn.getAttribute("data-section-nav");
        if (global.StudioWelcome && typeof global.StudioWelcome.selectPreviewSection === "function") {
          global.StudioWelcome.selectPreviewSection(id);
        }
        if (activeTab === "manual" && MANUAL_FIELD_DEFS[id]) {
          manualPreviewSectionId = id;
          openManualSection(id, { skipPreviewScroll: true, focus: false });
        }
      });

    const materialForm = document.getElementById("studioMaterialForm");
    if (materialForm) {
      materialForm.addEventListener("submit", function (e) {
        e.preventDefault();
        clearTimeout(materialApplyTimer);
        saveMaterial(e.target);
      });
      materialForm.addEventListener("input", function (e) {
        if (e.target && e.target.classList && e.target.classList.contains("studio-material__link-input")) return;
        scheduleMaterialApply(materialForm);
      });
      materialForm.addEventListener(
        "focusout",
        function (e) {
          if (e.target && e.target.classList && e.target.classList.contains("studio-material__link-input")) {
            scheduleMaterialApply(materialForm);
          }
        },
        true
      );
      global.MaterialSystem && global.MaterialSystem.bindFileInputs(materialForm);
      bindServiceCardTabs(materialForm);
    }

    document.addEventListener("studio:section-selected", function (e) {
      syncManualSectionHighlight(e.detail && e.detail.sectionId);
    });

    document.addEventListener("studio:preview-mounted", function () {
      refreshSiteChrome();
      if (!document.body.classList.contains("website-document-active")) {
        if (activeTab === "manual") refreshManualPanel();
        if (!isV2Document(global.SiteState && global.SiteState.get ? global.SiteState.get() : null)) {
          loadMaterialForm();
        }
      }
    });

    switchTab("ai");
  }

  document.addEventListener("studio:ready", function () {
    bind();
  });

  global.StudioPanelModes = {
    switchTab: switchTab,
    refreshManualPanel: refreshManualPanel,
    refreshSiteChrome: refreshSiteChrome,
    openManualSection: openManualSection,
  };
})(typeof window !== "undefined" ? window : globalThis);
