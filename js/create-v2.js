/**
 * Easily 2.0 — Create flow. Kopplar femfrågeformuläret till den fria V2-designmotorn.
 */
(function () {
  "use strict";

  var STYLE_LABELS = {
    minimal: "Minimal — rent och luftigt",
    warm: "Varmt — mjuka toner",
    bold: "Djärvt — stark typografi",
    luxury: "Lyx — elegant och mörkt",
    nature: "Natur — gröna accenter",
    editorial: "Redaktionellt — magasin-känsla",
  };

  var SECTION_LABELS = {
    hero: "Hero",
    about: "Om oss",
    services: "Tjänster",
    gallery: "Galleri",
    pricelist: "Prislista",
    faq: "FAQ",
    contact: "Kontakt",
    blog: "Blogg",
    shop: "Webbutik",
    booking: "Bokning",
  };

  function initSelectableCards(containerId, hiddenInputId, attrName) {
    var grid = document.getElementById(containerId);
    var hidden = document.getElementById(hiddenInputId);
    if (!grid || !hidden) return;

    var cards = grid.querySelectorAll("[role='option']");
    if (!cards.length) return;

    function select(card) {
      cards.forEach(function (c) { c.setAttribute("aria-selected", "false"); });
      card.setAttribute("aria-selected", "true");
      hidden.value = card.getAttribute(attrName) || "";
    }

    cards.forEach(function (card) {
      card.addEventListener("click", function () { select(card); });
      card.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(card); }
      });
    });

    select(cards[0]);
  }

  function getSelectedSections() {
    var checkboxes = document.querySelectorAll('input[name="sections"]:checked');
    var result = [];
    checkboxes.forEach(function (cb) {
      result.push(cb.value);
    });
    return result;
  }

  function buildCreativeBrief() {
    var siteType = document.getElementById("cv2SiteType").value || "foretag";
    var brandName = (document.getElementById("cv2BrandName").value || "").trim();
    var location = (document.getElementById("cv2Location").value || "").trim();
    var description = (document.getElementById("cv2Description").value || "").trim();
    var designStyle = document.getElementById("cv2DesignStyle").value || "minimal";
    var sections = getSelectedSections();

    var styleLabel = STYLE_LABELS[designStyle] || designStyle;
    var sectionNames = sections.map(function (s) { return SECTION_LABELS[s] || s; });

    return {
      schemaVersion: 1,
      source: "Easilys fem frågor",
      answers: [
        { question: "Vilken typ av webbplats vill du skapa?", answer: siteType },
        {
          question: "Företagsinformation",
          answer: {
            companyName: brandName || "Namnlöst företag",
            location: location || "",
            description: description || "En verksamhet som behöver en webbplats.",
          },
        },
        { question: "Vilken stil ska sidan ha?", answer: styleLabel },
        { question: "Vilka sektioner ska webbplatsen innehålla?", answer: sectionNames },
        { question: "Har du redan en webbplats?", answer: "Nej, skapa allt från grunden." },
      ],
      constraints: {
        language: "sv",
        factsPolicy: "Använd endast svaren ovan som företagsfakta. Hitta inte på adress, öppettider, priser, produktlager, telefonnummer eller e-postadress.",
        creativeFreedom: "AI:n får själv skapa art direction, sidberättelse, komposition, typografi, bildvärld, interaktion och relevant rörelse.",
      },
      customerFacts: {
        requestedContent: sections,
      },
    };
  }

  function validateForm() {
    var brandName = (document.getElementById("cv2BrandName").value || "").trim();
    var description = (document.getElementById("cv2Description").value || "").trim();
    var sections = getSelectedSections();
    var errors = [];

    if (!brandName) errors.push("Företagsnamn");
    if (!description) errors.push("Beskrivning av företaget");
    if (sections.length === 0) errors.push("Minst en sektion");

    return errors;
  }

  function showGenerationState(btn) {
    btn.disabled = true;
    btn.textContent = "Skapar din webbplats…";
    var form = document.getElementById("cv2Form");
    if (form) {
      form.style.opacity = "0.5";
      form.style.pointerEvents = "none";
    }

    var existing = document.getElementById("cv2Generating");
    if (existing) existing.remove();

    var overlay = document.createElement("div");
    overlay.id = "cv2Generating";
    overlay.className = "cv2-generating";
    overlay.innerHTML =
      '<div class="cv2-generating__card">' +
      '<div class="cv2-generating__spinner" aria-hidden="true"></div>' +
      '<h2 class="cv2-generating__title">Skapar din webbplats</h2>' +
      '<p class="cv2-generating__text">AI-designern tolkar dina svar, skapar tre unika designriktningar och bygger en fri visuell komposition. Detta kan ta en liten stund.</p>' +
      '<p class="cv2-generating__hint">Lämna inte sidan — resultatet visas här.</p>' +
      '</div>';
    document.body.appendChild(overlay);
  }

  function hideGenerationState() {
    var overlay = document.getElementById("cv2Generating");
    if (overlay) overlay.remove();
    var form = document.getElementById("cv2Form");
    if (form) {
      form.style.opacity = "";
      form.style.pointerEvents = "";
    }
  }

  function showError(message) {
    hideGenerationState();
    var existing = document.getElementById("cv2Error");
    if (existing) existing.remove();

    var main = document.getElementById("cv2-main");
    var errorDiv = document.createElement("div");
    errorDiv.id = "cv2Error";
    errorDiv.className = "cv2-error";
    errorDiv.innerHTML =
      '<div class="cv2-error__card">' +
      '<h2 class="cv2-error__title">Det gick inte att skapa webbplatsen</h2>' +
      '<p class="cv2-error__text">' + escapeHtml(message) + '</p>' +
      '<button type="button" class="cv2-error__retry" id="cv2RetryBtn">Försök igen</button>' +
      '</div>';
    main.appendChild(errorDiv);

    var retry = document.getElementById("cv2RetryBtn");
    if (retry) {
      retry.addEventListener("click", function () {
        errorDiv.remove();
        var btn = document.getElementById("cv2SubmitBtn");
        if (btn) { btn.disabled = false; btn.textContent = "Skapa webbplats"; }
      });
    }

    var btn = document.getElementById("cv2SubmitBtn");
    if (btn) { btn.disabled = false; btn.textContent = "Skapa webbplats"; }
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function showResult(result) {
    hideGenerationState();

    var main = document.getElementById("cv2-main");
    var form = document.getElementById("cv2Form");
    if (form) form.style.display = "none";

    var existing = document.getElementById("cv2Result");
    if (existing) existing.remove();

    var profiles = result.compiledProfiles || [];
    var desktopProfile = null;
    var mobileProfile = null;
    for (var i = 0; i < profiles.length; i++) {
      var p = profiles[i];
      var maxW = p.query && p.query.maxInlinePx;
      if (maxW && maxW <= 500) {
        if (!mobileProfile) mobileProfile = p;
      } else {
        if (!desktopProfile) desktopProfile = p;
      }
    }
    if (!desktopProfile) desktopProfile = profiles[0] || null;

    var vision = result.creativeVision || {};
    var selectedVision = vision.candidates && vision.selectedIndex != null
      ? vision.candidates[vision.selectedIndex]
      : null;

    var resultDiv = document.createElement("div");
    resultDiv.id = "cv2Result";
    resultDiv.className = "cv2-result";

    var visionHtml = "";
    if (selectedVision) {
      visionHtml =
        '<div class="cv2-result__vision">' +
        '<span class="cv2-result__vision-label">Vald designriktning</span>' +
        '<h3 class="cv2-result__vision-name">' + escapeHtml(selectedVision.name || "Unik design") + '</h3>' +
        (selectedVision.thesis
          ? '<p class="cv2-result__vision-thesis">' + escapeHtml(selectedVision.thesis) + '</p>'
          : '') +
        '</div>';
    }

    resultDiv.innerHTML =
      '<div class="cv2-result__header">' +
      '<h1 class="cv2-result__title">Din webbplats är klar</h1>' +
      '<p class="cv2-result__lead">AI-designern har skapat en unik visuell komposition utifrån dina svar. Förhandsgranska nedan.</p>' +
      '</div>' +
      visionHtml +
      '<div class="cv2-result__actions">' +
      '<button type="button" class="cv2-result__btn cv2-result__btn--primary" id="cv2OpenStudio">Öppna i studion</button>' +
      '<button type="button" class="cv2-result__btn cv2-result__btn--secondary" id="cv2NewSite">Skapa ny</button>' +
      '</div>' +
      '<div class="cv2-result__preview-tabs" id="cv2PreviewTabs">' +
      '<button type="button" class="cv2-preview-tab cv2-preview-tab--active" data-viewport="desktop" id="cv2TabDesktop">Dator</button>' +
      '<button type="button" class="cv2-preview-tab" data-viewport="mobile" id="cv2TabMobile">Mobil</button>' +
      '</div>' +
      '<div class="cv2-result__preview-wrap" id="cv2PreviewWrap"></div>';

    main.appendChild(resultDiv);

    renderPreview(desktopProfile, mobileProfile, "desktop");

    var tabDesktop = document.getElementById("cv2TabDesktop");
    var tabMobile = document.getElementById("cv2TabMobile");
    if (tabDesktop) {
      tabDesktop.addEventListener("click", function () {
        tabDesktop.classList.add("cv2-preview-tab--active");
        if (tabMobile) tabMobile.classList.remove("cv2-preview-tab--active");
        renderPreview(desktopProfile, mobileProfile, "desktop");
      });
    }
    if (tabMobile) {
      tabMobile.addEventListener("click", function () {
        tabMobile.classList.add("cv2-preview-tab--active");
        if (tabDesktop) tabDesktop.classList.remove("cv2-preview-tab--active");
        renderPreview(desktopProfile, mobileProfile, "mobile");
      });
    }

    var openBtn = document.getElementById("cv2OpenStudio");
    if (openBtn) {
      openBtn.addEventListener("click", function () {
        saveAndOpenStudio(result);
      });
    }

    var newBtn = document.getElementById("cv2NewSite");
    if (newBtn) {
      newBtn.addEventListener("click", function () {
        window.location.reload();
      });
    }

    resultDiv.scrollIntoView({ behavior: "smooth" });
  }

  function renderPreview(desktopProfile, mobileProfile, viewport) {
    var wrap = document.getElementById("cv2PreviewWrap");
    if (!wrap) return;

    var profile = viewport === "mobile" ? (mobileProfile || desktopProfile) : desktopProfile;
    if (!profile || !profile.html) {
      wrap.innerHTML = '<p class="cv2-result__no-preview">Ingen förhandsvisning tillgänglig.</p>';
      return;
    }

    var isMobile = viewport === "mobile" && mobileProfile;
    var width = isMobile ? 390 : 1280;

    wrap.innerHTML =
      '<div class="cv2-result__preview-frame' + (isMobile ? " cv2-result__preview-frame--mobile" : "") + '">' +
      '<iframe class="cv2-result__iframe" id="cv2PreviewIframe"></iframe>' +
      '</div>';

    var iframe = document.getElementById("cv2PreviewIframe");
    var doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open();
    doc.write(
      '<!DOCTYPE html><html lang="sv"><head><meta charset="UTF-8">' +
      '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
      '<style>' + String(profile.css || "") + '</style>' +
      '<style>' +
      'html,body{margin:0;padding:0;overflow-x:hidden;}' +
      '.easily-v2-site{transform-origin:top left;}' +
      '</style>' +
      '</head><body>' + String(profile.html || "") + '</body></html>'
    );
    doc.close();

    if (isMobile) {
      iframe.style.width = width + "px";
    }
  }

  function saveAndOpenStudio(result) {
    var brief = window.__cv2LastBrief || {};
    var brandName = (document.getElementById("cv2BrandName").value || "").trim() || "Ny webbplats";

    var document = {
      meta: {
        siteId: "",
        slug: "",
        updatedAt: new Date().toISOString(),
        lastSyncedAt: new Date().toISOString(),
        draftRevision: 1,
      },
      page: {
        createPath: "v2",
        v2GenerationId: result.generationId || "",
        v2SceneGraph: result.sceneGraph || null,
        v2CompiledProfiles: (result.compiledProfiles || []).map(function (p) {
          return {
            profileId: p.profileId,
            query: p.query,
            viewportInlinePx: p.viewportInlinePx,
            viewportBlockPx: p.viewportBlockPx,
            ok: true,
            html: p.html,
            css: p.css,
          };
        }),
        v2CreativeVision: result.creativeVision || null,
      },
      sections: {},
    };

    var openBtn = document.getElementById("cv2OpenStudio");
    if (openBtn) {
      openBtn.disabled = true;
      openBtn.textContent = "Sparar…";
    }

    fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: brandName, document: document }),
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data && data.ok && data.id) {
          window.location.href = "/editor/" + data.id;
        } else {
          throw new Error(data && data.error ? data.error : "Kunde inte spara projektet");
        }
      })
      .catch(function (err) {
        if (openBtn) { openBtn.disabled = false; openBtn.textContent = "Öppna i studion"; }
        showError(err.message || "Kunde inte spara projektet");
      });
  }

  function handleSubmit() {
    var btn = document.getElementById("cv2SubmitBtn");
    var form = document.getElementById("cv2Form");
    if (!btn || !form) return;

    btn.addEventListener("click", function (e) {
      e.preventDefault();

      var errors = validateForm();
      if (errors.length) {
        showError("Följande måste fyllas i: " + errors.join(", ") + ".");
        return;
      }

      var brief = buildCreativeBrief();
      window.__cv2LastBrief = brief;

      showGenerationState(btn);

      var controller = new AbortController();
      var timeoutId = setTimeout(function () { controller.abort(); }, 300000);

      fetch("/api/v2/generate-site", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creativeBrief: brief }),
        signal: controller.signal,
      })
        .then(function (res) {
          clearTimeout(timeoutId);
          return res.json();
        })
        .then(function (data) {
          if (data && data.ok) {
            showResult(data);
          } else {
            var msg = data && data.error ? data.error : "Okänt fel vid generering.";
            if (data && data.failureStage) msg = "Fel vid " + data.failureStage + ": " + msg;
            showError(msg);
          }
        })
        .catch(function (err) {
          clearTimeout(timeoutId);
          if (err.name === "AbortError") {
            showError("Servern svarade inte i tid. Försök igen.");
          } else {
            showError(err.message || "Kunde inte nå servern.");
          }
        });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initSelectableCards("cv2TypeGrid", "cv2SiteType", "data-type");
    initSelectableCards("cv2StyleGrid", "cv2DesignStyle", "data-style");
    handleSubmit();
  });
})();
