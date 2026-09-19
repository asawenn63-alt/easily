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
    { kind: "services", label: "Tjänster", description: "Verksamhetens tjänster i sidans befintliga formspråk." },
    { kind: "about", label: "Om oss", description: "Berättelsen om verksamheten i sidans befintliga formspråk." },
  ];

  const V2_ADD_ALIASES = {
    "new-arrivals": ["new-arrivals", "new_arrivals", "news", "nyheter", "nyhet"],
    sale: ["sale", "rea", "rabatt"],
    featured: ["featured", "utvalda", "handplock"],
    favorites: ["favorites", "favourites", "favoriter", "favorit"],
    campaign: ["campaign", "kampanj"],
    categories: ["categories", "category", "kategorier", "kategori"],
    services: ["services", "service", "tjanster", "tjänster", "tjänst"],
    about: ["about", "om oss", "om_oss", "om-oss"],
  };

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
  let v2Selection = null;
  let v2AddBusy = false;

  function toast(msg, kind) {
    if (typeof global.showStudioToast === "function") global.showStudioToast(msg, kind || "success", 3200);
  }

  function applyV2ResultToState(response, mutation) {
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
      if (mutation && mutation.kind && mutation.sceneId) {
        const additions = Array.isArray(doc.page.v2Additions) ? doc.page.v2Additions : [];
        const next = additions.filter(function (entry) { return entry && entry.kind !== mutation.kind; });
        next.push({ kind: mutation.kind, sceneId: mutation.sceneId });
        doc.page.v2Additions = next;
      }
    });
    SS.save();
    return true;
  }

  function normalizeV2SearchText(value) {
    return String(value || "").toLocaleLowerCase("sv-SE");
  }

  function requestedV2Content(doc) {
    const requested = doc && doc.page && doc.page.creativeBrief && doc.page.creativeBrief.customerFacts
      ? doc.page.creativeBrief.customerFacts.requestedContent
      : [];
    return new Set((Array.isArray(requested) ? requested : []).map(normalizeV2SearchText));
  }

  function sceneExactContentValues(scene, graph) {
    const content = new Map((graph && graph.contentAtoms || []).map(function (atom) { return [atom.id, atom.value]; }));
    return (scene.nodes || []).map(function (node) {
      const value = content.get(node.contentRef);
      return normalizeV2SearchText(typeof value === "string" ? value.trim() : "");
    }).filter(Boolean);
  }

  function findV2Addition(doc, item) {
    const page = doc && doc.page;
    const graph = page && page.v2SceneGraph;
    if (!graph) return null;
    const recorded = (Array.isArray(page.v2Additions) ? page.v2Additions : []).find(function (entry) {
      return entry && entry.kind === item.kind && (graph.scenes || []).some(function (scene) { return scene.id === entry.sceneId; });
    });
    if (recorded) return { present: true, sceneId: recorded.sceneId, initial: false };

    const aliases = V2_ADD_ALIASES[item.kind] || [item.kind, item.label];
    const scenes = graph.scenes || [];
    const matchingScene = scenes.slice(1).find(function (scene) {
      const sceneId = normalizeV2SearchText(scene.id);
      const exactValues = sceneExactContentValues(scene, graph);
      return aliases.some(function (alias) {
        const normalizedAlias = normalizeV2SearchText(alias);
        return sceneId.includes(normalizedAlias) || exactValues.includes(normalizedAlias);
      });
    });
    if (matchingScene) return { present: true, sceneId: matchingScene.id, initial: false };

    if ((item.kind === "about" || item.kind === "services") && requestedV2Content(doc).has(item.kind)) {
      return { present: true, sceneId: "", initial: true };
    }
    return null;
  }

  function addedSceneId(beforeGraph, afterGraph) {
    const previous = new Set((beforeGraph && beforeGraph.scenes || []).map(function (scene) { return scene.id; }));
    const added = (afterGraph && afterGraph.scenes || []).filter(function (scene) { return !previous.has(scene.id); });
    return added.length === 1 ? added[0].id : "";
  }

  function setV2AddStatus(message, kind) {
    const lead = document.getElementById("websiteDocumentAddLead");
    if (!lead || !lead.parentNode) return;
    let status = document.getElementById("websiteDocumentAddStatus");
    if (!status) {
      status = document.createElement("p");
      status.id = "websiteDocumentAddStatus";
      status.className = "website-document-add__status";
      status.setAttribute("role", "status");
      lead.insertAdjacentElement("afterend", status);
    }
    status.textContent = String(message || "");
    status.dataset.kind = kind || "info";
    status.hidden = !message;
  }

  async function addToV2Scene(item, button) {
    const SS = global.SiteState;
    const doc = SS && SS.get ? SS.get() : null;
    if (!doc || !doc.page || doc.page.createPath !== "v2" || !global.SiteApi) return;
    if (v2AddBusy) {
      setV2AddStatus("Ett tillägg byggs redan. Vänta tills det är klart innan du väljer nästa.", "info");
      return;
    }
    v2AddBusy = true;
    const action = button.querySelector(".website-document-add__action");
    document.querySelectorAll("#websiteDocumentAddChoices .website-document-add__v2-choice").forEach(function (choice) {
      choice.disabled = true;
    });
    button.classList.add("is-busy");
    if (action) action.textContent = "Lägger till…";
    setV2AddStatus("Easily lägger till " + item.label.toLowerCase() + " i samma visuella scen…", "info");
    try {
      const requestedSceneId = "scene_add_" + item.kind.replace(/[^a-z0-9]+/gi, "_");
      const response = await global.SiteApi.request("/api/v2/edit-scene", {
        method: "POST",
        body: {
          creativeBrief: doc.page.creativeBrief || {},
          sceneGraph: doc.page.v2SceneGraph,
          editContext: { type: "add", kind: item.kind, label: item.label },
          instruction: "Lägg till " + item.label + " på startsidan som exakt en ny sammanhängande visuell scen med id " + requestedSceneId + ". Bevara resten av webbplatsen exakt och integrera tillägget i samma formspråk. "
            + (item.kind === "campaign"
              ? "Kampanj är undantaget och ska komponeras fritt efter sitt budskap."
              : "Tillägget ska börja med exakt tre fristående stående bilder i proportionen 3:4. Varje bild ska kunna utökas senare och måste därför vara en egen media-nod med en egen bildasset och en required aspect-relation med värdet 0.75 ratio. ")
            + "Använd tydliga platshållare om verkligt material saknas.",
        },
        timeoutMs: 600000,
      });
      if (!response || !response.ok || !response.sceneGraph) throw new Error(response && response.error || "v2_add_failed");
      applyV2ResultToState(response, { kind: item.kind, sceneId: addedSceneId(doc.page.v2SceneGraph, response.sceneGraph) });
      if (typeof SS.flushRemoteSave === "function") await SS.flushRemoteSave({ throwOnError: true });
      const EE = global.EditorEngine;
      if (EE && typeof EE.remountAsync === "function") await EE.remountAsync(true);
      else if (EE && EE.remount) EE.remount(true);
      renderV2AddCatalog(SS.get());
      setV2AddStatus(item.label + " har lagts till.", "success");
      toast(item.label + " har lagts till på samma webbplats.", "success");
    } catch (error) {
      const code = String(error && error.message || "v2_add_failed");
      setV2AddStatus(item.label + " kunde inte läggas till. Felkod: " + code + ". Webbplatsen är oförändrad.", "error");
      console.warn("v2-add-failed", { kind: item.kind, error: code });
      toast(item.label + " kunde inte läggas till. Webbplatsen är oförändrad.", "error");
    } finally {
      v2AddBusy = false;
      const latestDoc = SS && SS.get ? SS.get() : null;
      document.querySelectorAll("#websiteDocumentAddChoices .website-document-add__v2-choice").forEach(function (choice) {
        const catalogItem = V2_ADD_CATALOG.find(function (entry) { return entry.kind === choice.dataset.addKind; });
        choice.disabled = !!(catalogItem && findV2Addition(latestDoc, catalogItem));
      });
      button.classList.remove("is-busy");
      const currentAction = button.querySelector(".website-document-add__action");
      if (currentAction) currentAction.textContent = "Lägg till";
    }
  }

  function v2SceneMediaCount(doc, sceneId) {
    const scene = doc?.page?.v2SceneGraph?.scenes?.find(function (entry) { return entry.id === sceneId; });
    return scene ? scene.nodes.filter(function (node) { return node.kind === "media" && node.assetRef; }).length : 0;
  }

  function setV2CatalogBusy(busy) {
    v2AddBusy = busy;
    document.querySelectorAll("#websiteDocumentAddChoices button").forEach(function (control) {
      control.disabled = busy || control.dataset.permanentlyDisabled === "1";
    });
  }

  async function moveV2AddedScene(item, sceneId, direction) {
    const SS = global.SiteState;
    const doc = SS && SS.get ? SS.get() : null;
    if (!doc?.page?.v2SceneGraph || !global.SiteApi || v2AddBusy) return;
    setV2CatalogBusy(true);
    setV2AddStatus("Flyttar " + item.label.toLowerCase() + " " + (direction === "up" ? "upp" : "ner") + "…", "info");
    try {
      const response = await global.SiteApi.request("/api/v2/reorder-scenes", {
        method: "POST",
        body: {
          sceneGraph: doc.page.v2SceneGraph,
          resolvedProfiles: doc.page.v2ResolvedProfiles,
          sceneId: sceneId,
          direction: direction,
        },
      });
      if (!response?.ok || !response.sceneGraph) throw new Error(response?.error || "scene_move_failed");
      applyV2ResultToState(response, { kind: item.kind, sceneId: sceneId });
      if (typeof SS.flushRemoteSave === "function") await SS.flushRemoteSave({ throwOnError: true });
      const EE = global.EditorEngine;
      if (EE && typeof EE.remountAsync === "function") await EE.remountAsync(true);
      else if (EE && EE.remount) EE.remount(true);
      renderV2AddCatalog(SS.get());
      setV2AddStatus(item.label + " har flyttats.", "success");
    } catch (error) {
      setV2AddStatus(item.label + " kunde inte flyttas. Felkod: " + String(error?.message || "scene_move_failed") + ".", "error");
    } finally {
      setV2CatalogBusy(false);
      renderV2AddCatalog(SS.get());
    }
  }

  async function extendV2AddedScene(item, sceneId) {
    const SS = global.SiteState;
    const doc = SS && SS.get ? SS.get() : null;
    if (!doc?.page?.v2SceneGraph || !global.SiteApi || v2AddBusy) return;
    const currentCount = v2SceneMediaCount(doc, sceneId);
    const imageCount = Math.max(3, currentCount + 1);
    setV2CatalogBusy(true);
    setV2AddStatus("Utökar " + item.label.toLowerCase() + " med stående 3:4-bilder…", "info");
    try {
      const response = await global.SiteApi.request("/api/v2/edit-scene", {
        method: "POST",
        body: {
          creativeBrief: doc.page.creativeBrief || {},
          sceneGraph: doc.page.v2SceneGraph,
          editContext: { type: "extend", kind: item.kind, sceneId: sceneId, imageCount: imageCount },
          instruction: "Utöka endast scenen " + sceneId + " för " + item.label + " så att den innehåller exakt " + imageCount + " fristående stående bilder i proportionen 3:4. Varje bild ska vara en egen media-nod med egen bildasset och en required aspect-relation med värdet 0.75 ratio. Bevara alla andra scener och allt befintligt innehåll exakt.",
        },
        timeoutMs: 600000,
      });
      if (!response?.ok || !response.sceneGraph) throw new Error(response?.error || "scene_extend_failed");
      applyV2ResultToState(response, { kind: item.kind, sceneId: sceneId });
      if (typeof SS.flushRemoteSave === "function") await SS.flushRemoteSave({ throwOnError: true });
      const EE = global.EditorEngine;
      if (EE && typeof EE.remountAsync === "function") await EE.remountAsync(true);
      else if (EE && EE.remount) EE.remount(true);
      renderV2AddCatalog(SS.get());
      setV2AddStatus(item.label + " har nu " + imageCount + " stående bilder.", "success");
    } catch (error) {
      setV2AddStatus(item.label + " kunde inte utökas. Felkod: " + String(error?.message || "scene_extend_failed") + ". Webbplatsen är oförändrad.", "error");
    } finally {
      setV2CatalogBusy(false);
      renderV2AddCatalog(SS.get());
    }
  }

  function renderV2AddCatalog(doc) {
    const root = document.getElementById("websiteDocumentAddChoices");
    if (!root || !doc || !doc.page || doc.page.createPath !== "v2") return;
    root.replaceChildren();
    const lead = document.getElementById("websiteDocumentAddLead");
    if (lead) lead.textContent = "Välj vad som ska läggas till. Det blir en ny del av samma visuella scen och visas direkt.";
    V2_ADD_CATALOG.forEach(function (item) {
      const existing = findV2Addition(doc, item);
      const card = document.createElement("div");
      card.className = "website-document-add__v2-card";
      card.classList.toggle("is-added", !!existing);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "website-document-add__v2-choice";
      button.dataset.addKind = item.kind;
      button.classList.toggle("is-added", !!existing);
      button.disabled = !!existing || v2AddBusy;
      button.dataset.permanentlyDisabled = existing ? "1" : "0";
      const copy = document.createElement("span");
      copy.className = "website-document-add__copy";
      const title = document.createElement("strong");
      title.textContent = item.label;
      const description = document.createElement("span");
      description.textContent = item.description;
      const action = document.createElement("span");
      action.className = "website-document-add__action";
      action.textContent = existing ? "Finns på sidan" : "Lägg till";
      copy.append(title, description);
      button.append(copy, action);
      button.addEventListener("click", function () { addToV2Scene(item, button); });
      card.appendChild(button);
      if (existing && !existing.initial && existing.sceneId) {
        const controls = document.createElement("div");
        controls.className = "website-document-add__v2-controls";
        const order = doc.page.v2SceneGraph.pageFlow?.sceneOrder || [];
        const sceneIndex = order.indexOf(existing.sceneId);
        if (item.kind !== "campaign") {
          const extend = document.createElement("button");
          extend.type = "button";
          extend.className = "website-document-add__v2-control";
          extend.textContent = v2SceneMediaCount(doc, existing.sceneId) < 3 ? "Fyll till 3 bilder" : "Utöka med en bild";
          extend.addEventListener("click", function () { extendV2AddedScene(item, existing.sceneId); });
          controls.appendChild(extend);
        }
        const up = document.createElement("button");
        up.type = "button";
        up.className = "website-document-add__v2-control";
        up.textContent = "Flytta upp";
        up.disabled = sceneIndex <= 1;
        up.dataset.permanentlyDisabled = up.disabled ? "1" : "0";
        up.addEventListener("click", function () { moveV2AddedScene(item, existing.sceneId, "up"); });
        const down = document.createElement("button");
        down.type = "button";
        down.className = "website-document-add__v2-control";
        down.textContent = "Flytta ner";
        down.disabled = sceneIndex < 1 || sceneIndex >= order.length - 1;
        down.dataset.permanentlyDisabled = down.disabled ? "1" : "0";
        down.addEventListener("click", function () { moveV2AddedScene(item, existing.sceneId, "down"); });
        controls.append(up, down);
        card.appendChild(controls);
      }
      root.appendChild(card);
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

  function restoreV2SelectionHighlight() {
    document.querySelectorAll("#siteMain .is-v2-editor-selected").forEach(function (item) {
      item.classList.remove("is-v2-editor-selected");
    });
    if (!v2Selection) return;
    const selector = v2Selection.nodeId
      ? '[data-node-id="' + CSS.escape(v2Selection.nodeId) + '"]'
      : v2Selection.contentId
        ? '[data-content-ref="' + CSS.escape(v2Selection.contentId) + '"]'
        : v2Selection.assetId
          ? '[data-asset-ref="' + CSS.escape(v2Selection.assetId) + '"]'
          : "";
    const selected = selector && document.querySelector("#siteMain " + selector);
    if (selected) selected.classList.add("is-v2-editor-selected");
  }

  function selectedV2Node(graph) {
    for (const scene of graph && graph.scenes || []) {
      const node = (scene.nodes || []).find(function (candidate) {
        if (v2Selection && v2Selection.nodeId) return candidate.id === v2Selection.nodeId;
        if (v2Selection && v2Selection.contentId) return candidate.contentRef === v2Selection.contentId;
        if (v2Selection && v2Selection.assetId) return candidate.assetRef === v2Selection.assetId;
        return false;
      });
      if (node) return node;
    }
    return null;
  }

  function v2NodeBackground(graph, node) {
    const roleId = node && node.visual && node.visual.backgroundRoleId;
    const role = roleId && graph.designLanguage && (graph.designLanguage.colorRoles || []).find(function (entry) {
      return entry.id === roleId;
    });
    return role && /^#[0-9a-f]{6}$/i.test(String(role.value || "")) ? role.value : "#ffffff";
  }

  function appendV2ObjectControls(box, graph, node) {
    const controls = document.createElement("div");
    controls.className = "studio-v2-object-controls";

    const sizeLabel = document.createElement("label");
    sizeLabel.className = "studio-v2-range";
    sizeLabel.innerHTML = '<span>Storlek <output data-v2-size-output>100%</output></span>';
    const size = document.createElement("input");
    size.type = "range";
    size.min = "50";
    size.max = "150";
    size.step = "5";
    size.value = "100";
    size.dataset.v2NodeSize = node.id;
    sizeLabel.appendChild(size);

    const marginLabel = document.createElement("label");
    marginLabel.className = "studio-v2-range";
    marginLabel.innerHTML = '<span>Marginal <output data-v2-margin-output>0 px</output></span>';
    const margin = document.createElement("input");
    margin.type = "range";
    margin.min = "-80";
    margin.max = "80";
    margin.step = "4";
    margin.value = "0";
    margin.dataset.v2NodeMargin = node.id;
    marginLabel.appendChild(margin);

    const colorLabel = document.createElement("label");
    colorLabel.className = "studio-v2-color";
    const colorCaption = document.createElement("span");
    colorCaption.textContent = "Bakgrund";
    const color = document.createElement("input");
    color.type = "color";
    const originalBackground = v2NodeBackground(graph, node);
    color.value = originalBackground;
    color.dataset.v2OriginalBackground = originalBackground;
    color.dataset.v2HasBackground = node.visual && node.visual.backgroundRoleId ? "1" : "0";
    color.dataset.v2NodeBackground = node.id;
    colorLabel.append(colorCaption, color);

    const apply = document.createElement("button");
    apply.type = "button";
    apply.className = "studio-manual__btn studio-manual__btn--save";
    apply.dataset.v2NodeApply = node.id;
    apply.textContent = "Spara utseendet";

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "studio-manual__btn studio-v2-object-controls__delete";
    remove.dataset.v2NodeDelete = node.id;
    remove.textContent = "Ta bort objektet";

    controls.append(sizeLabel, marginLabel, colorLabel, apply, remove);
    box.appendChild(controls);
  }

  function buildV2ManualSections(doc) {
    const root = document.getElementById("studioManualSections");
    const lead = document.getElementById("studioManualLead");
    if (!root) return;
    root.innerHTML = "";
    const graph = doc && doc.page && doc.page.v2SceneGraph;
    if (!graph) return;
    const node = selectedV2Node(graph);
    if (!v2Selection || !node) {
      if (lead) lead.textContent = "Klicka på en text eller bild i sidan till höger för att ändra den här.";
      root.innerHTML = '<p class="studio-manual__empty">Inget är markerat ännu.</p>';
      return;
    }

    if (node.contentRef) {
      const atom = (graph.contentAtoms || []).find(function (item) { return item.id === node.contentRef; });
      if (!atom || (atom.kind !== "text" && atom.kind !== "action")) {
        root.innerHTML = '<p class="studio-manual__empty">Det markerade objektet kan inte redigeras här.</p>';
        return;
      }
      const textKind = atom.kind === "action"
        ? "Knapptext"
        : node.accessibility && node.accessibility.headingLevel
          ? "Rubrik"
          : "Brödtext";
      if (lead) lead.textContent = "Ändra markerad " + textKind.toLowerCase() + ".";
      const box = document.createElement("fieldset");
      box.className = "studio-material__group studio-manual__group studio-v2-selection";
      const legend = document.createElement("legend");
      legend.className = "studio-material__legend";
      legend.textContent = textKind;
      const label = document.createElement("label");
      label.className = "studio-field studio-field--compact";
      const caption = document.createElement("span");
      caption.className = "studio-field__label";
      caption.textContent = "Innehåll";
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
      appendV2ObjectControls(box, graph, node);
      root.appendChild(box);
      return;
    }

    if (node.assetRef) {
      const asset = graph.assetManifest && (graph.assetManifest.assets || []).find(function (item) { return item.id === node.assetRef; });
      if (!asset || asset.kind !== "image") {
        root.innerHTML = '<p class="studio-manual__empty">Det markerade objektet är inte en redigerbar bild.</p>';
        return;
      }
      if (lead) lead.textContent = "Byt den markerade bilden med en fil eller bildadress.";
      const box = document.createElement("fieldset");
      box.className = "studio-material__group studio-manual__group studio-v2-selection";
      const legend = document.createElement("legend");
      legend.className = "studio-material__legend";
      legend.textContent = "Bild";
      const preview = document.createElement("img");
      preview.className = "studio-v2-selection__preview";
      preview.src = String(asset.source && asset.source.uri || "");
      preview.alt = "Förhandsvisning av markerad bild";
      const urlLabel = document.createElement("label");
      urlLabel.className = "studio-field studio-field--compact";
      const urlCaption = document.createElement("span");
      urlCaption.className = "studio-field__label";
      urlCaption.textContent = "Bildadress";
      const urlInput = document.createElement("input");
      urlInput.type = "text";
      urlInput.className = "studio-field__input";
      urlInput.value = String(asset.source && asset.source.uri || "");
      urlInput.dataset.v2AssetUrl = asset.id;
      urlLabel.append(urlCaption, urlInput);
      const fileLabel = document.createElement("label");
      fileLabel.className = "studio-v2-selection__file";
      const fileCaption = document.createElement("span");
      fileCaption.textContent = "Eller välj en bild från datorn";
      const fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.accept = "image/png,image/jpeg,image/webp,image/gif";
      fileInput.dataset.v2AssetFile = asset.id;
      fileLabel.append(fileCaption, fileInput);
      const save = document.createElement("button");
      save.type = "button";
      save.className = "studio-manual__btn studio-manual__btn--save";
      save.dataset.v2AssetSave = asset.id;
      save.textContent = "Spara bilden";
      box.append(legend, preview, urlLabel, fileLabel, save);
      appendV2ObjectControls(box, graph, node);
      root.appendChild(box);
      return;
    }

    root.innerHTML = '<p class="studio-manual__empty">Det markerade objektet kan inte redigeras här.</p>';
  }

  function selectV2Node(selection) {
    v2Selection = selection && (selection.contentId || selection.assetId) ? {
      nodeId: String(selection.nodeId || ""),
      nodeKind: String(selection.nodeKind || ""),
      semanticRole: String(selection.semanticRole || ""),
      contentId: String(selection.contentId || ""),
      assetId: String(selection.assetId || ""),
    } : null;
    switchTab("manual");
    refreshManualPanel();
    restoreV2SelectionHighlight();
    global.requestAnimationFrame(function () {
      const field = document.querySelector("#studioManualSections textarea, #studioManualSections input:not([type=file])");
      if (field) {
        field.focus();
        if (typeof field.select === "function") field.select();
      }
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
      restoreV2SelectionHighlight();
      toast("Texten är sparad på samma webbplats.", "success");
    } catch (error) {
      toast("Texten kunde inte sparas. Webbplatsen är oförändrad.", "error");
    } finally {
      button.disabled = false;
      button.textContent = "Spara på sidan";
    }
  }

  function prepareV2AssetFile(input) {
    const file = input && input.files && input.files[0];
    if (!file) return;
    if (!/^image\/(png|jpeg|webp|gif)$/i.test(file.type || "")) {
      input.value = "";
      toast("Välj en PNG-, JPG-, WEBP- eller GIF-bild.", "error");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      input.value = "";
      toast("Bilden är för stor. Välj en bild under 8 MB.", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = function () {
      const dataUrl = String(reader.result || "");
      input.dataset.v2AssetDataUrl = dataUrl;
      input.dataset.v2AssetMimeType = file.type;
      const box = input.closest(".studio-v2-selection");
      const preview = box && box.querySelector(".studio-v2-selection__preview");
      if (preview) preview.src = dataUrl;
      const image = new Image();
      image.onload = function () {
        input.dataset.v2AssetWidth = String(image.naturalWidth || "");
        input.dataset.v2AssetHeight = String(image.naturalHeight || "");
      };
      image.src = dataUrl;
    };
    reader.onerror = function () { toast("Bilden kunde inte läsas.", "error"); };
    reader.readAsDataURL(file);
  }

  async function saveV2Asset(assetId, button) {
    const SS = global.SiteState;
    const doc = SS && SS.get ? SS.get() : null;
    const box = button.closest(".studio-v2-selection");
    const urlField = box && box.querySelector('[data-v2-asset-url="' + CSS.escape(assetId) + '"]');
    const fileField = box && box.querySelector('[data-v2-asset-file="' + CSS.escape(assetId) + '"]');
    const fileUri = fileField && fileField.dataset.v2AssetDataUrl || "";
    const uri = fileUri || String(urlField && urlField.value || "").trim();
    if (!doc || !doc.page || doc.page.createPath !== "v2" || !global.SiteApi || !uri) {
      toast("Välj en bild eller ange en bildadress först.", "error");
      return;
    }
    button.disabled = true;
    button.textContent = "Sparar…";
    try {
      const response = await global.SiteApi.request("/api/v2/replace-asset", {
        method: "POST",
        body: {
          sceneGraph: doc.page.v2SceneGraph,
          resolvedProfiles: doc.page.v2ResolvedProfiles,
          assetId: assetId,
          uri: uri,
          mimeType: fileField && fileField.dataset.v2AssetMimeType || "",
          width: Number(fileField && fileField.dataset.v2AssetWidth || 0) || undefined,
          height: Number(fileField && fileField.dataset.v2AssetHeight || 0) || undefined,
        },
        timeoutMs: 30000,
      });
      if (!response || !response.ok) throw new Error(response && response.error || "v2_asset_failed");
      SS.patch(function (next) {
        next.page.createPath = "v2";
        next.page.v2SceneGraph = response.sceneGraph;
        next.page.v2ResolvedProfiles = response.resolvedProfiles;
        next.page.v2CompiledProfiles = response.compiledProfiles;
      });
      SS.save();
      if (typeof SS.flushRemoteSave === "function") await SS.flushRemoteSave({ throwOnError: true });
      const EE = global.EditorEngine;
      if (EE && typeof EE.remountAsync === "function") await EE.remountAsync(true);
      else if (EE && EE.remount) EE.remount(true);
      restoreV2SelectionHighlight();
      toast("Bilden är sparad på samma webbplats.", "success");
    } catch (error) {
      toast("Bilden kunde inte sparas. Webbplatsen är oförändrad.", "error");
    } finally {
      button.disabled = false;
      button.textContent = "Spara bilden";
    }
  }

  async function updateV2Node(nodeId, button, deleteNode) {
    const SS = global.SiteState;
    const doc = SS && SS.get ? SS.get() : null;
    const box = button.closest(".studio-v2-selection");
    const size = box && box.querySelector('[data-v2-node-size="' + CSS.escape(nodeId) + '"]');
    const margin = box && box.querySelector('[data-v2-node-margin="' + CSS.escape(nodeId) + '"]');
    const background = box && box.querySelector('[data-v2-node-background="' + CSS.escape(nodeId) + '"]');
    const backgroundChanged = !!(
      background &&
      (background.dataset.v2HasBackground === "1" || background.value !== background.dataset.v2OriginalBackground)
    );
    if (!doc || !doc.page || doc.page.createPath !== "v2" || !global.SiteApi) return;
    if (deleteNode && !global.confirm("Vill du ta bort det markerade objektet från sidan?")) return;
    const originalLabel = button.textContent;
    button.disabled = true;
    button.textContent = deleteNode ? "Tar bort…" : "Sparar…";
    try {
      const response = await global.SiteApi.request("/api/v2/update-node", {
        method: "POST",
        body: {
          sceneGraph: doc.page.v2SceneGraph,
          resolvedProfiles: doc.page.v2ResolvedProfiles,
          nodeId: nodeId,
          scalePercent: deleteNode ? 100 : Number(size && size.value || 100),
          marginPx: deleteNode ? 0 : Number(margin && margin.value || 0),
          backgroundColor: deleteNode || !backgroundChanged ? "" : String(background.value || ""),
          deleteNode: !!deleteNode,
        },
        timeoutMs: 30000,
      });
      if (!response || !response.ok) throw new Error(response && response.error || "v2_node_update_failed");
      SS.patch(function (next) {
        next.page.createPath = "v2";
        next.page.v2SceneGraph = response.sceneGraph;
        next.page.v2ResolvedProfiles = response.resolvedProfiles;
        next.page.v2CompiledProfiles = response.compiledProfiles;
      });
      SS.save();
      if (typeof SS.flushRemoteSave === "function") await SS.flushRemoteSave({ throwOnError: true });
      if (deleteNode) v2Selection = null;
      const EE = global.EditorEngine;
      if (EE && typeof EE.remountAsync === "function") await EE.remountAsync(true);
      else if (EE && EE.remount) EE.remount(true);
      refreshManualPanel();
      restoreV2SelectionHighlight();
      toast(deleteNode ? "Objektet är borttaget." : "Utseendet är sparat på samma webbplats.", "success");
    } catch (error) {
      toast("Ändringen kunde inte genomföras utan att skada layouten. Webbplatsen är oförändrad.", "error");
    } finally {
      button.disabled = false;
      button.textContent = originalLabel;
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
        const v2NodeDelete = e.target.closest("[data-v2-node-delete]");
        if (v2NodeDelete) {
          e.preventDefault();
          updateV2Node(v2NodeDelete.getAttribute("data-v2-node-delete"), v2NodeDelete, true);
          return;
        }
        const v2NodeApply = e.target.closest("[data-v2-node-apply]");
        if (v2NodeApply) {
          e.preventDefault();
          updateV2Node(v2NodeApply.getAttribute("data-v2-node-apply"), v2NodeApply, false);
          return;
        }
        const v2AssetSave = e.target.closest("[data-v2-asset-save]");
        if (v2AssetSave) {
          e.preventDefault();
          saveV2Asset(v2AssetSave.getAttribute("data-v2-asset-save"), v2AssetSave);
          return;
        }
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

    document.getElementById("studioManualSections") &&
      document.getElementById("studioManualSections").addEventListener("input", function (e) {
        const size = e.target.closest("[data-v2-node-size]");
        if (size) {
          const wrap = size.closest(".studio-v2-range");
          const output = wrap && wrap.querySelector("[data-v2-size-output]");
          if (output) output.textContent = size.value + "%";
          return;
        }
        const margin = e.target.closest("[data-v2-node-margin]");
        if (margin) {
          const wrap = margin.closest(".studio-v2-range");
          const output = wrap && wrap.querySelector("[data-v2-margin-output]");
          if (output) output.textContent = margin.value + " px";
        }
      });

    document.getElementById("studioManualSections") &&
      document.getElementById("studioManualSections").addEventListener("change", function (e) {
        const file = e.target.closest("[data-v2-asset-file]");
        if (file) prepareV2AssetFile(file);
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
    selectV2Node: selectV2Node,
  };
})(typeof window !== "undefined" ? window : globalThis);
