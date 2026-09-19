/**
 * Prislista — formulär när det är snabbare än chat.
 * Tre vägar: AI-förslag, import (text/CSV), tom tabell (30 rader).
 */
(function (global) {
  "use strict";

  const ROW_COUNT = 30;

  const INDUSTRY_SUGGESTIONS = {
    byggfirma: [
      { name: "Timpris snickare", price: "650 kr" },
      { name: "Timpris elektriker", price: "750 kr" },
      { name: "Köksrenovering", price: "från 85 000 kr" },
      { name: "Badrumsrenovering", price: "från 95 000 kr" },
      { name: "Målning lägenhet", price: "från 12 000 kr" },
      { name: "Altan / trädäck", price: "från 35 000 kr" },
      { name: "Fönsterbyte", price: "från 8 500 kr/st" },
      { name: "ROT-rådgivning", price: "Kostnadsfritt" },
      { name: "Akut jour", price: "från 1 200 kr" },
      { name: "Besiktning & offert", price: "Kostnadsfritt" },
    ],
    frisor: [
      { name: "Herrklippning", price: "350 kr" },
      { name: "Damklippning", price: "450 kr" },
      { name: "Barnklippning", price: "320 kr" },
      { name: "Färgning", price: "från 890 kr" },
      { name: "Slingor", price: "från 1 200 kr" },
      { name: "Behandling", price: "från 250 kr" },
      { name: "Skäggtrim", price: "150 kr" },
      { name: "Styling", price: "400 kr" },
    ],
    hundsalong: [
      { name: "Bad & borstning", price: "450 kr" },
      { name: "Klippning liten hund", price: "550 kr" },
      { name: "Klippning stor hund", price: "750 kr" },
      { name: "Trimning", price: "650 kr" },
      { name: "Klotång", price: "200 kr" },
    ],
    restaurang: [
      { name: "Lunch", price: "145 kr" },
      { name: "Dagens rätt", price: "165 kr" },
      { name: "Förrätt", price: "95 kr" },
      { name: "Huvudrätt", price: "245 kr" },
      { name: "Dessert", price: "85 kr" },
      { name: "Vegetariskt", price: "195 kr" },
    ],
    cafe: [
      { name: "Espresso", price: "35 kr" },
      { name: "Cappuccino", price: "45 kr" },
      { name: "Latte", price: "48 kr" },
      { name: "Kanelbulle", price: "38 kr" },
      { name: "Smörgås", price: "65 kr" },
      { name: "Sallad", price: "95 kr" },
    ],
    gym: [
      { name: "Månadskort", price: "399 kr" },
      { name: "Årskort", price: "3 990 kr" },
      { name: "Drop-in", price: "120 kr" },
      { name: "PT pass", price: "650 kr" },
      { name: "Gruppträning", price: "150 kr" },
    ],
    tarot: [
      { name: "Kort session (30 min)", price: "450 kr" },
      { name: "Tarotläsning (60 min)", price: "750 kr" },
      { name: "Relations- & vägval", price: "850 kr" },
      { name: "Online-session", price: "650 kr" },
      { name: "Par-session", price: "1 200 kr" },
    ],
  };

  const DEFAULT_SUGGESTIONS = [
    { name: "Bas", price: "från 500 kr" },
    { name: "Standard", price: "från 1 200 kr" },
    { name: "Premium", price: "från 2 500 kr" },
    { name: "Offert på mått", price: "Kontakta oss" },
  ];

  let choicesBound = false;

  function emptyRows() {
    const rows = [];
    for (let i = 0; i < ROW_COUNT; i++) rows.push({ name: "", price: "" });
    return rows;
  }

  function normalizeRows(raw) {
    const rows = emptyRows();
    if (!Array.isArray(raw)) return rows;
    for (let i = 0; i < Math.min(ROW_COUNT, raw.length); i++) {
      const r = raw[i] || {};
      rows[i] = {
        name: String(r.name != null ? r.name : r.service || "").trim(),
        price: String(r.price != null ? r.price : "").trim(),
      };
    }
    return rows;
  }

  function getIndustry() {
    try {
      return String(global.SiteState?.get?.()?.page?.industry || "konsult").trim() || "konsult";
    } catch (e) {
      return "konsult";
    }
  }

  function suggestRowsForIndustry(industry) {
    const key = String(industry || "konsult").trim();
    const src = INDUSTRY_SUGGESTIONS[key] || DEFAULT_SUGGESTIONS;
    const rows = emptyRows();
    src.forEach(function (item, i) {
      if (i < ROW_COUNT) rows[i] = { name: item.name, price: item.price };
    });
    const AI = global.AISiteBuilder;
    if (AI && AI.INDUSTRIES && AI.INDUSTRIES[key] && Array.isArray(AI.INDUSTRIES[key].services)) {
      AI.INDUSTRIES[key].services.forEach(function (svc, i) {
        const idx = src.length + i;
        if (idx >= ROW_COUNT) return;
        if (rows[idx].name) return;
        rows[idx] = { name: String(svc.title || "").trim(), price: "från — kr" };
      });
    }
    return rows;
  }

  function parseLinesToRows(text) {
    const rows = emptyRows();
    const lines = String(text || "")
      .split(/\r?\n/)
      .map(function (l) {
        return l.trim();
      })
      .filter(Boolean);
    let i = 0;
    lines.forEach(function (line) {
      if (i >= ROW_COUNT) return;
      if (/^tjänst|^service|^pris|^namn/i.test(line) && line.length < 40) return;
      let name = "";
      let price = "";
      if (line.indexOf("\t") !== -1) {
        const p = line.split("\t");
        name = p[0].trim();
        price = p.slice(1).join(" ").trim();
      } else {
        const m = line.match(/^(.+?)\s+(\d[\d\s.,]*\s*(?:kr|:-)?)\s*$/i);
        if (m) {
          name = m[1].trim();
          price = m[2].replace(/\s+/g, " ").trim();
          if (!/kr/i.test(price)) price += " kr";
        } else if (line.indexOf(";") !== -1) {
          const p = line.split(";");
          name = p[0].trim();
          price = (p[1] || "").trim();
        } else {
          name = line;
        }
      }
      rows[i] = { name: name, price: price };
      i += 1;
    });
    return rows;
  }

  function looksLikeBulkPriceList(text) {
    const lines = String(text || "")
      .split(/\r?\n/)
      .map(function (l) {
        return l.trim();
      })
      .filter(Boolean);
    if (lines.length < 3) return false;
    const priced = lines.filter(function (l) {
      return /\d[\d\s.,]*\s*(?:kr|:-)?/i.test(l) || l.indexOf("\t") !== -1;
    });
    return priced.length >= 3;
  }

  function applyRowsToSite(rows) {
    const SS = global.SiteState;
    const EE = global.EditorEngine;
    if (!SS || !SS.patch) return false;
    const clean = normalizeRows(rows).filter(function (r) {
      return r.name || r.price;
    });
    SS.patch(function (d) {
      if (!d.sections) d.sections = {};
      if (!d.sections.services) d.sections.services = { cards: [], content: {} };
      const sec = d.sections.services;
      if (!sec.content) sec.content = {};
      sec.pricelist = { rows: normalizeRows(rows) };
      sec.hidden = false;
      if (!sec.content["services-title"] || sec.content["services-title"] === "Utvalt") {
        sec.content["services-title"] = "Priser";
      }
      if (!sec.content["services-lead"]) {
        sec.content["services-lead"] = "Här är våra priser — justera gärna det som inte stämmer.";
      }
      if (!sec.cards) sec.cards = [];
      if (!sec.cards[0]) {
        sec.cards[0] = { icon: "", title: "", body: "", img: "", intent: "pricing", ctaText: "", ctaHref: "" };
      }
      sec.cards[0].intent = "pricing";
      sec.cards[0].title = sec.cards[0].title || "Se prislista";
      sec.cards[0].body = sec.cards[0].body || clean.length + " rader";
      sec.cards[0].ctaText = sec.cards[0].ctaText || "Se prislista";
      sec.cards[0].ctaHref = "#priser";
    });
    SS.save();
    if (EE && typeof EE.remount === "function") EE.remount();
    const priserEl = document.getElementById("priser");
    if (priserEl && global.StudioWelcome && typeof global.StudioWelcome.scrollPreviewToElement === "function") {
      global.StudioWelcome.scrollPreviewToElement(priserEl, { offsetRatio: 0.18 });
    }
    return true;
  }

  function dialogEl() {
    return document.getElementById("studioPricelistDialog");
  }

  function readRowsFromEditorTable() {
    const tbody = document.getElementById("studioPricelistRows");
    if (!tbody) return emptyRows();
    const rows = emptyRows();
    tbody.querySelectorAll("tr[data-pricelist-row]").forEach(function (tr) {
      const idx = Number(tr.getAttribute("data-pricelist-row"));
      if (idx < 0 || idx >= ROW_COUNT) return;
      const nameEl = tr.querySelector('[data-field="name"]');
      const priceEl = tr.querySelector('[data-field="price"]');
      rows[idx] = {
        name: String(nameEl && nameEl.value ? nameEl.value : "").trim(),
        price: String(priceEl && priceEl.value ? priceEl.value : "").trim(),
      };
    });
    return rows;
  }

  function fillEditorTable(rows) {
    const tbody = document.getElementById("studioPricelistRows");
    if (!tbody) return;
    const norm = normalizeRows(rows);
    tbody.querySelectorAll("tr[data-pricelist-row]").forEach(function (tr) {
      const idx = Number(tr.getAttribute("data-pricelist-row"));
      const nameEl = tr.querySelector('[data-field="name"]');
      const priceEl = tr.querySelector('[data-field="price"]');
      if (nameEl) nameEl.value = norm[idx]?.name || "";
      if (priceEl) priceEl.value = norm[idx]?.price || "";
    });
  }

  function openEditor(opts) {
    opts = opts || {};
    const dlg = dialogEl();
    if (!dlg) return;
    // Keep the 30-row editor out of the initial page DOM. Creating it here
    // avoids 60 inactive inputs in every Studio session while preserving the
    // full paste/import capacity once the dialog is actually used.
    initDialogRows();
    const titleEl = document.getElementById("studioPricelistDialogTitle");
    const hintEl = document.getElementById("studioPricelistDialogHint");
    const importBlock = document.getElementById("studioPricelistImport");
    if (titleEl) {
      titleEl.textContent = opts.title || "Prislista";
    }
    if (hintEl) {
      hintEl.textContent =
        opts.hint ||
        "Fyll i tjänst och pris. Tab hoppar mellan rader — klistra in från Excel fungerar.";
    }
    if (importBlock) importBlock.hidden = opts.mode !== "import";
    fillEditorTable(opts.rows || emptyRows());
    if (typeof dlg.showModal === "function") dlg.showModal();
    else dlg.setAttribute("open", "open");
    const first = dlg.querySelector('[data-field="name"]');
    if (first) {
      try {
        first.focus({ preventScroll: true });
      } catch (e) {
        /* ignore */
      }
    }
  }

  function closeEditor() {
    const dlg = dialogEl();
    if (!dlg) return;
    if (typeof dlg.close === "function") dlg.close();
    else dlg.removeAttribute("open");
  }

  function bindEditorOnce() {
    const dlg = dialogEl();
    if (!dlg || dlg.dataset.pricelistBound === "1") return;
    dlg.dataset.pricelistBound = "1";

    dlg.querySelectorAll("[data-pricelist-close]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        closeEditor();
      });
    });

    const saveBtn = document.getElementById("studioPricelistSave");
    if (saveBtn) {
      saveBtn.addEventListener("click", function () {
        const rows = readRowsFromEditorTable();
        applyRowsToSite(rows);
        closeEditor();
        if (typeof global.showStudioToast === "function") {
          global.showStudioToast("Prislistan är sparad på sidan.", "success", 3200);
        }
      });
    }

    const tbody = document.getElementById("studioPricelistRows");
    if (tbody) {
      tbody.addEventListener("paste", function (e) {
        const text = (e.clipboardData || global.clipboardData)?.getData("text") || "";
        if (!text || text.indexOf("\n") === -1) return;
        e.preventDefault();
        fillEditorTable(parseLinesToRows(text));
      });
    }

    const fileInput = document.getElementById("studioPricelistFile");
    if (fileInput) {
      fileInput.addEventListener("change", function () {
        const file = fileInput.files && fileInput.files[0];
        if (!file) return;
        const name = String(file.name || "").toLowerCase();
        if (/\.(txt|csv|tsv)$/i.test(name)) {
          const reader = new FileReader();
          reader.onload = function () {
            fillEditorTable(parseLinesToRows(String(reader.result || "")));
            if (typeof global.showStudioToast === "function") {
              global.showStudioToast("Filen är inläst — granska raderna och spara.", "info", 3600);
            }
          };
          reader.readAsText(file, "UTF-8");
          return;
        }
        if (typeof global.showStudioToast === "function") {
          global.showStudioToast(
            "PDF och Word stöds snart. Spara som .csv/.txt eller klistra in i tabellen.",
            "info",
            4200
          );
        }
        fileInput.value = "";
      });
    }
  }

  function appendChoiceMessage(onReply) {
    const thread = document.getElementById("studioChatThread");
    if (!thread) return;
    const msg = document.createElement("div");
    msg.className = "studio-chat__msg studio-chat__msg--assistant studio-chat__msg--pricelist";
    msg.innerHTML =
      '<img class="studio-chat__avatar" src="assets/easily-mark.svg" alt="" width="28" height="28" decoding="async" />' +
      '<div class="studio-chat__bubble studio-chat__bubble--choices">' +
      '<p class="studio-chat__name">Easily</p>' +
      "<p><strong>Behöver du en prislista?</strong></p>" +
      '<div class="studio-chat__choices">' +
      '<button type="button" class="studio-chat__choice" data-pricelist-choice="suggest">Ja, skapa ett förslag</button>' +
      '<button type="button" class="studio-chat__choice" data-pricelist-choice="import">Jag har redan en prislista</button>' +
      '<button type="button" class="studio-chat__choice" data-pricelist-choice="manual">Jag vill fylla i själv</button>' +
      "</div></div>";
    thread.appendChild(msg);
    thread.scrollTop = thread.scrollHeight;
    if (typeof onReply === "function") onReply("");
    if (global.StudioWelcome && typeof global.StudioWelcome.updateChatLayout === "function") {
      global.StudioWelcome.updateChatLayout();
    } else {
      thread.hidden = false;
    }
  }

  function bindChoicesOnce() {
    if (choicesBound) return;
    choicesBound = true;
    document.addEventListener("click", function (e) {
      const btn = e.target.closest("[data-pricelist-choice]");
      if (!btn) return;
      const choice = btn.getAttribute("data-pricelist-choice");
      bindEditorOnce();
      if (choice === "suggest") {
        const rows = suggestRowsForIndustry(getIndustry());
        openEditor({
          rows: rows,
          title: "Förslag — justera priserna",
          hint: "AI har fyllt i rimliga tjänster för din bransch. Ändra det som inte stämmer.",
        });
        return;
      }
      if (choice === "import") {
        openEditor({
          rows: emptyRows(),
          mode: "import",
          title: "Importera prislista",
          hint: "Ladda upp .csv eller .txt — eller klistra in från Excel i tabellen.",
        });
        const fileInput = document.getElementById("studioPricelistFile");
        if (fileInput) fileInput.click();
        return;
      }
      if (choice === "manual") {
        openEditor({
          rows: emptyRows(),
          title: "Prislista",
          hint: "30 tomma rader — Tab, skriv snabbt, eller klistra in från Excel.",
        });
      }
    });
  }

  function offerFromChat() {
    bindChoicesOnce();
    bindEditorOnce();
    appendChoiceMessage();
  }

  function openEditorWithPaste(text) {
    bindEditorOnce();
    openEditor({
      rows: parseLinesToRows(text),
      title: "Prislista",
      hint: "Vi klistrade in det du skrev — granska och spara.",
    });
  }

  function wantsPricelistIntent(text) {
    const lower = String(text || "").toLowerCase().trim();
    return /prislista|prislist|lägg till en prislista|visa priser|meny|priserna/.test(lower);
  }

  function handleEditCommand(text) {
    if (looksLikeBulkPriceList(text)) {
      return {
        handled: true,
        message:
          "Det där ser ut som en prislista. Jag öppnar tabellen — där går det snabbare att klistra in och redigera.",
        action: "paste",
      };
    }
    if (wantsPricelistIntent(text)) {
      return { handled: true, action: "offer" };
    }
    return { handled: false };
  }

  function buildEditorRowsHtml() {
    let html = "";
    for (let i = 0; i < ROW_COUNT; i++) {
      html +=
        '<tr data-pricelist-row="' +
        i +
        '">' +
        '<td><input type="text" class="studio-pricelist__input" data-field="name" autocomplete="off" spellcheck="false" aria-label="Tjänst rad ' +
        (i + 1) +
        '" /></td>' +
        '<td><input type="text" class="studio-pricelist__input" data-field="price" autocomplete="off" spellcheck="false" aria-label="Pris rad ' +
        (i + 1) +
        '" /></td>' +
        "</tr>";
    }
    return html;
  }

  function initDialogRows() {
    const tbody = document.getElementById("studioPricelistRows");
    if (!tbody || tbody.children.length) return;
    tbody.innerHTML = buildEditorRowsHtml();
  }

  global.PricelistFlow = {
    ROW_COUNT: ROW_COUNT,
    emptyRows: emptyRows,
    normalizeRows: normalizeRows,
    suggestRowsForIndustry: suggestRowsForIndustry,
    applyRowsToSite: applyRowsToSite,
    openEditor: openEditor,
    offerFromChat: offerFromChat,
    openEditorWithPaste: openEditorWithPaste,
    handleEditCommand: handleEditCommand,
    looksLikeBulkPriceList: looksLikeBulkPriceList,
    init: function () {
      bindChoicesOnce();
      bindEditorOnce();
    },
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      global.PricelistFlow.init();
    });
  } else {
    global.PricelistFlow.init();
  }
})(typeof window !== "undefined" ? window : globalThis);
