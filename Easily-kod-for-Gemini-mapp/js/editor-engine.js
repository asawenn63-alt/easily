/**
 * Editor engine — panel, historik (dokument-JSON), remount via RenderEngine + Bindings.
 */
(function () {
  "use strict";

  const MAX_HISTORY = 40;

  const PALETTES = [
    {
      id: "minimal-white",
      label: "Minimal Vit",
      swatches: ["#1c1917", "#78716c", "#d6d3d1", "#ffffff"],
      strip: ["#1c1917", "#78716c", "#d6d3d1", "#ffffff"],
    },
    {
      id: "beige-lux",
      label: "Beige / Lyx",
      swatches: ["#c4922a", "#3a3228", "#f8f7f3", "#e8c878"],
      strip: ["#c4922a", "#3a3228", "#f8f7f3", "#e8c878"],
    },
    {
      id: "black-gold",
      label: "Svart / Guld",
      swatches: ["#e6c04a", "#000000", "#1a1a1a", "#f5e6c8"],
      strip: ["#e6c04a", "#000000", "#1a1a1a", "#f5e6c8"],
    },
    {
      id: "modern-green",
      label: "Sage / oliv",
      swatches: ["#5a7c50", "#1e2620", "#f7f8f5", "#9bb890"],
      strip: ["#5a7c50", "#1e2620", "#f7f8f5", "#9bb890"],
    },
    {
      id: "blue-professional",
      label: "Blå / Professional",
      swatches: ["#2563eb", "#0f172a", "#f8fafc", "#93c5fd"],
      strip: ["#2563eb", "#0f172a", "#f8fafc", "#93c5fd"],
    },
  ];

  function paletteStripColors(p) {
    return (p.strip || p.swatches).slice(0, 4);
  }

  function hexToRgb(hex) {
    const h = String(hex || "").replace("#", "");
    if (h.length !== 6) return null;
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }

  function luminance(hex) {
    const rgb = hexToRgb(hex);
    if (!rgb) return 0.5;
    const lin = rgb.map(function (v) {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
  }

  function palettePageColors(p) {
    switch (p.id) {
      case "minimal-white":
        return {
          bg: "#ffffff",
          hero: "#ffffff",
          text: "#1c1917",
          muted: "#a8a29e",
          border: "#ebebeb",
          accent: "#1c1917",
          accent2: "#d6d3d1",
          card: "#ffffff",
          footer: "#f5f5f4",
        };
      case "beige-lux":
        return {
          bg: "#f8f7f3",
          hero: "#f3f0ea",
          text: "#3a3228",
          muted: "#8a7f72",
          border: "#e5dfd4",
          accent: "#c4922a",
          accent2: "#e8c878",
          card: "#fffdf8",
          footer: "#ece6dc",
        };
      case "black-gold":
        return {
          bg: "#0a0a0a",
          hero: "#141414",
          text: "#f5e6c8",
          muted: "#b8a574",
          border: "#2a2a2a",
          accent: "#e6c04a",
          accent2: "#f5e6c8",
          card: "#1a1a1a",
          footer: "#111111",
        };
      case "modern-green":
        return {
          bg: "#f7f8f5",
          hero: "#eef3eb",
          text: "#1e2620",
          muted: "#5a7c50",
          border: "#d4ddd0",
          accent: "#5a7c50",
          accent2: "#9bb890",
          card: "#f3f6f1",
          footer: "#dfe8da",
        };
      case "blue-professional":
        return {
          bg: "#f8fafc",
          hero: "#eff6ff",
          text: "#0f172a",
          muted: "#64748b",
          border: "#dbeafe",
          accent: "#2563eb",
          accent2: "#93c5fd",
          card: "#ffffff",
          footer: "#e2e8f0",
        };
      default: {
        const colors = paletteStripColors(p);
        const accent = colors[0];
        const c1 = colors[1];
        const c2 = colors[2];
        const c3 = colors[3];
        const dark = luminance(c1) < 0.2;
        if (dark) {
          return {
            bg: c2 || c1,
            hero: c1,
            text: c3 || "#f5f5f4",
            muted: c3 || c2,
            border: c1,
            accent: accent,
            accent2: c3,
            card: c1,
            footer: c1,
          };
        }
        return {
          bg: c3 || "#ffffff",
          hero: c3 || "#ffffff",
          text: c1 || accent,
          muted: colors[1] || "#78716c",
          border: c2 || "#d6d3d1",
          accent: accent,
          accent2: c2,
          card: c3 || "#ffffff",
          footer: c2 || "#d6d3d1",
        };
      }
    }
  }

  function getHeroPreviewTitle() {
    const d = window.SiteState && window.SiteState.get && window.SiteState.get();
    const t = d && d.sections && d.sections.hero && d.sections.hero.content && d.sections.hero.content["hero-title"];
    const s = t && String(t).trim();
    return s || "Din rubrik";
  }

  function buildPaletteThemePreviewInner(themeId) {
    const pal = PALETTES.find(function (x) {
      return x.id === themeId;
    }) || PALETTES[0];
    const colors = palettePageColors(pal);
    const wrap = document.createElement("div");
    wrap.className = "palette-theme-preview palette-theme-preview--" + pal.id;
    wrap.innerHTML =
      '<p class="palette-theme-preview__caption">' +
      escTemplateLabel(pal.label) +
      "</p>" +
      '<div class="palette-theme-preview__device">' +
      '<div class="palette-theme-preview__screen" data-theme="' +
      escTemplateLabel(pal.id) +
      '">' +
      '<header class="ptp-nav">' +
      '<span class="ptp-nav__logo"></span>' +
      '<span class="ptp-nav__links"><span></span><span></span><span></span></span>' +
      "</header>" +
      '<section class="ptp-hero">' +
      '<h2 class="ptp-hero__title"></h2>' +
      '<p class="ptp-hero__lead">Kort beskrivning av ert erbjudande.</p>' +
      '<span class="ptp-btn ptp-btn--primary">Kom igång</span>' +
      "</section>" +
      '<section class="ptp-cards">' +
      "<article></article><article></article><article></article>" +
      "</section>" +
      '<footer class="ptp-footer"></footer>' +
      "</div></div>";
    const screen = wrap.querySelector(".palette-theme-preview__screen");
    if (screen) {
      screen.style.setProperty("--ptp-hero", colors.hero);
      screen.style.setProperty("--ptp-accent", colors.accent);
      screen.style.setProperty("--ptp-accent2", colors.accent2);
      screen.style.setProperty("--ptp-card", colors.card);
      screen.style.setProperty("--ptp-footer", colors.footer);
      screen.style.setProperty("--ptp-border", colors.border);
    }
    const titleEl = wrap.querySelector(".ptp-hero__title");
    if (titleEl) titleEl.textContent = getHeroPreviewTitle().slice(0, 52);
    return wrap;
  }

  function updatePaletteThemePreview(themeId) {
    document.querySelectorAll("[data-palette-theme-preview]").forEach(function (host) {
      host.innerHTML = "";
      host.appendChild(buildPaletteThemePreviewInner(themeId));
    });
  }

  function attachPaletteChipPreviewHover(btn, themeId) {
    btn.addEventListener("mouseenter", function () {
      updatePaletteThemePreview(themeId);
    });
    btn.addEventListener("mouseleave", function () {
      const d = window.SiteState && window.SiteState.get && window.SiteState.get();
      updatePaletteThemePreview((d && d.page && d.page.theme) || "minimal-white");
    });
  }

  function createPaletteChipButton(p, compact) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "palette-chip" + (compact ? " palette-chip--compact" : "");
    btn.dataset.theme = p.id;
    btn.setAttribute("aria-pressed", "false");
    btn.title = p.label;
    btn.append(createPaletteMiniPage(p));
    const check = document.createElement("span");
    check.className = "palette-chip__check";
    check.setAttribute("aria-hidden", "true");
    check.textContent = "✓";
    btn.append(check);
    const label = document.createElement("span");
    label.className = "palette-chip__label";
    label.textContent = p.label;
    btn.append(label);
    btn.addEventListener("click", function () {
      window.SiteState.patch(function (doc) {
        doc.page.theme = p.id;
      });
      pushHistory();
      syncPanelFromDoc();
      syncPaletteChipSelection(p.id);
      updatePaletteThemePreview(p.id);
      window.SiteState.save();
    });
    attachPaletteChipPreviewHover(btn, p.id);
    return btn;
  }

  function createPaletteMiniPage(p) {
    const colors = palettePageColors(p);
    const wrap = document.createElement("span");
    wrap.className = "palette-mini-page palette-mini-page--" + p.id;
    wrap.setAttribute("aria-hidden", "true");
    wrap.innerHTML =
      '<span class="palette-mini-page__frame">' +
      '<span class="palette-mini-page__header">' +
      '<span class="palette-mini-page__logo"></span>' +
      '<span class="palette-mini-page__menu"></span>' +
      "</span>" +
      '<span class="palette-mini-page__hero">' +
      '<span class="palette-mini-page__title"></span>' +
      '<span class="palette-mini-page__btn"></span>' +
      "</span>" +
      '<span class="palette-mini-page__cards">' +
      "<span></span><span></span><span></span>" +
      "</span>" +
      '<span class="palette-mini-page__footer"></span>' +
      "</span>";
    const frame = wrap.querySelector(".palette-mini-page__frame");
    if (frame) {
      frame.style.setProperty("--p-bg", colors.bg);
      frame.style.setProperty("--p-hero", colors.hero);
      frame.style.setProperty("--p-text", colors.text);
      frame.style.setProperty("--p-muted", colors.muted);
      frame.style.setProperty("--p-border", colors.border);
      frame.style.setProperty("--p-accent", colors.accent);
      frame.style.setProperty("--p-accent2", colors.accent2);
      frame.style.setProperty("--p-card", colors.card);
      frame.style.setProperty("--p-footer", colors.footer);
    }
    return wrap;
  }

  function fillPaletteStrip(strip, colors) {
    strip.innerHTML = "";
    const stops = colors
      .map(function (c, i) {
        const start = (i / colors.length) * 100;
        const end = ((i + 1) / colors.length) * 100;
        return c + " " + start + "% " + end + "%";
      })
      .join(", ");
    strip.style.background = "linear-gradient(90deg, " + stops + ")";
    colors.forEach(function (c) {
      const seg = document.createElement("span");
      seg.className = "palette-chip__seg";
      seg.style.backgroundColor = c;
      strip.appendChild(seg);
    });
  }
  const TEMPLATES = [
    {
      id: "editorial",
      mood: "Mjuk nordisk",
      headingFont: '"Cormorant Garamond", Georgia, serif',
      bodyFont: '"Manrope", system-ui, sans-serif',
      swatches: ["#f5f1ea", "#2a2420", "#7d5e47", "#c9b08f"],
    },
    {
      id: "atelier",
      mood: "Organiskt lugn",
      headingFont: '"Fraunces", Georgia, serif',
      bodyFont: '"Manrope", system-ui, sans-serif',
      swatches: ["#f2ebe3", "#362f2a", "#8b5a3c", "#a89f96"],
    },
    {
      id: "swiss-grid",
      mood: "Ren precision",
      headingFont: '"Syne", system-ui, sans-serif',
      bodyFont: '"Inter", system-ui, sans-serif',
      swatches: ["#f4f4f4", "#111111", "#3a3a3a", "#8a8a8a"],
    },
    {
      id: "luxury-brand",
      mood: "Tyst lyx",
      headingFont: '"Playfair Display", Georgia, serif',
      bodyFont: '"Manrope", system-ui, sans-serif',
      swatches: ["#1a1816", "#f3ede3", "#c9a962", "#5c5348"],
    },
    {
      id: "landmark",
      mood: "Scen & kontrast",
      headingFont: '"Fraunces", Georgia, serif',
      bodyFont: '"DM Sans", system-ui, sans-serif',
      swatches: ["#faf7f2", "#14120f", "#3d342b", "#6e6258"],
    },
  ];
  const HERO_LAYOUTS = [
    { id: "center", label: "Centrerad", className: "hero-layout--center" },
    { id: "left", label: "Vänster", className: "hero-layout--left" },
    { id: "split", label: "Bild + text", className: "hero-layout--split" },
  ];

  /** Matchar `data-button-style` i style.css (solid = standard / ingen attribut). */
  const BUTTON_STYLES = [
    { id: "solid", label: "Klassisk" },
    { id: "pill", label: "Rund" },
    { id: "outline", label: "Kontur" },
    { id: "soft", label: "Mjuk" },
  ];
  const SPACING_LABELS = ["Tät", "Kompakt", "Normal", "Luftig", "Extra luftig"];

  /** Första teckensnittet i en font-stack (visningsnamn på kort). */
  function primaryFontName(stack) {
    const s = String(stack || "").trim();
    const quoted = s.match(/"([^"]+)"/);
    if (quoted) return quoted[1].trim();
    const part = s.split(",")[0].replace(/^['"]|['"]$/g, "").trim();
    return part || "Typsnitt";
  }

  function templatePairTitle(t) {
    return primaryFontName(t.headingFont) + " + " + primaryFontName(t.bodyFont);
  }

  function applyTemplateFontVars(el, t) {
    if (!el || !t) return;
    el.style.setProperty("--tm-heading-font", t.headingFont);
    el.style.setProperty("--tm-body-font", t.bodyFont);
  }

  function createTemplateTypePreview(t, previewClass) {
    const preview = document.createElement("div");
    preview.className = previewClass;
    applyTemplateFontVars(preview, t);
    const hEl = document.createElement("span");
    hEl.className = previewClass + "__h";
    hEl.textContent = primaryFontName(t.headingFont);
    const bEl = document.createElement("span");
    bEl.className = previewClass + "__b";
    bEl.textContent = primaryFontName(t.bodyFont);
    preview.append(hEl, bEl);
    return preview;
  }

  const fab = document.getElementById("editorFab");
  const panel = document.getElementById("editorPanel");
  const closeBtn = document.getElementById("editorClose");
  const siteMain = document.getElementById("siteMain");
  const footer = document.querySelector(".site-footer");
  const inlineToolbar = document.getElementById("inlineToolbar");

  /** Telefon / e-post / adress — ska inte ersättas med långa AI-brödtexter. */
  const STRUCTURED_FACT_FIELDS = new Set(["contact-phone", "contact-email", "contact-address"]);

  function isStructuredFactField(el) {
    return el instanceof Element && STRUCTURED_FACT_FIELDS.has(el.getAttribute("data-editable") || "");
  }

  let history = [];
  let historyIndex = -1;
  let isApplyingHistory = false;
  let saveTimer = null;
  let remountRaf = 0;
  let remountEpoch = 0;

  function cancelPendingRemounts() {
    remountEpoch++;
    if (remountRaf) {
      cancelAnimationFrame(remountRaf);
      remountRaf = 0;
    }
  }

  function shouldDeferPreviewRemount() {
    return (
      document.documentElement.dataset.studioCreateGeneration === "1" &&
      document.body.dataset.studioPreviewLive !== "1"
    );
  }
  let toolbarRaf = null;
  let toolbarPositioning = false;

  function isInlineToolbarSuppressed() {
    if (document.body.classList.contains("studio-shell--create-active")) return true;
    if (document.body.classList.contains("studio-shell--generating")) return true;
    if (document.documentElement.classList.contains("studio-is-generating")) return true;
    if (document.body.getAttribute("data-studio-mode") === "readonly") return true;
    const pane = document.getElementById("studioCreatePane");
    if (pane && !pane.hidden) return true;
    return false;
  }

  function hideInlineToolbar() {
    if (inlineToolbar && !inlineToolbar.hidden) inlineToolbar.hidden = true;
  }

  function scheduleToolbarPosition() {
    if (isInlineToolbarSuppressed()) {
      hideInlineToolbar();
      return;
    }
    if (toolbarRaf != null) cancelAnimationFrame(toolbarRaf);
    toolbarRaf = requestAnimationFrame(() => {
      toolbarRaf = null;
      positionToolbar();
    });
  }

  function bindingHooks() {
    return {
      /** Kör efter sync från DOM så pushHistory ser uppdaterat dokument. */
      onCommitHistory: pushHistory,
      onPersist: () => {
        window.SiteState.save();
        persistSoon();
      },
    };
  }

  function normalizeUserLinkInput(raw) {
    let v = String(raw ?? "").trim();
    if (!v) return "#kontakt";
    const lower = v.toLowerCase();
    if (lower.startsWith("javascript:") || lower.startsWith("data:")) return "#kontakt";
    if (v.startsWith("#")) {
      const frag = v.slice(1).split("?")[0].trim();
      if (!frag) return "#kontakt";
      return "#" + frag;
    }
    if (/^https?:\/\//i.test(v)) return v;
    if (/^mailto:/i.test(v)) return v;
    if (/^tel:/i.test(v)) return v;
    if (/^[\w+\-.]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(v)) return "mailto:" + v;
    if (/^[+()\d.\s-]{7,}$/.test(v)) return "tel:" + v.replace(/\s/g, "");
    if (!/^[.#/]/.test(v) && /^[\w.-]+\.[a-z]{2,}([/?#].*)?$/i.test(v)) return "https://" + v.replace(/^\/+/, "");
    if (/^[a-z][\w-]*$/i.test(v)) return "#" + v;
    return v;
  }

  function scrollPreviewHashLink(hrefNow) {
    const href = String(hrefNow || "").trim();
    if (!href.startsWith("#") || href.length < 2) return false;
    const id = decodeURIComponent(href.slice(1).split("?")[0]);
    if (!id) return false;
    let target = document.getElementById(id);
    if (!target) {
      try {
        target = document.querySelector('.site-section[id="' + CSS.escape(id) + '"]');
      } catch (e2) {
        target = document.querySelector('.site-section[id="' + id.replace(/"/g, "") + '"]');
      }
    }
    if (!target) return false;
    if (target.classList.contains("service-subpage")) {
      if (window.ServiceSubpageNav && typeof window.ServiceSubpageNav.open === "function") {
        window.ServiceSubpageNav.open(target);
      } else if (window.StudioWelcome && typeof window.StudioWelcome.navigateSiteHash === "function") {
        window.StudioWelcome.navigateSiteHash(href);
        return true;
      }
    }
    const scrollFn = window.StudioWelcome && window.StudioWelcome.scrollPreviewToElement;
    if (typeof scrollFn === "function") {
      scrollFn(
        target,
        target.classList.contains("service-subpage") ? { offsetPx: 16, rawTarget: true } : undefined
      );
      return true;
    }
    const pane = document.getElementById("studioPreviewPane");
    if (pane && pane.contains(target)) {
      const paneRect = pane.getBoundingClientRect();
      const elRect = (target.querySelector(".section-title") || target).getBoundingClientRect();
      pane.scrollTo({ top: Math.max(0, pane.scrollTop + (elRect.top - paneRect.top) - 24), behavior: "smooth" });
      return true;
    }
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    return true;
  }

  function bindPreviewHashNavigationOnce() {
    if (document.documentElement.dataset.studioHashNavBound === "1") return;
    document.documentElement.dataset.studioHashNavBound = "1";
    document.addEventListener(
      "click",
      function (e) {
        if (document.body.getAttribute("data-studio-mode") === "readonly") return;
        if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
        const t = e.target;
        if (!t || typeof t.closest !== "function") return;
        const a = t.closest("a[href^='#']");
        if (!a) return;
        const main = document.getElementById("siteMain");
        const foot = document.getElementById("siteFooter");
        if (!(main && main.contains(a)) && !(foot && foot.contains(a))) return;
        const href = (a.getAttribute("href") || "").trim();
        if (href.length < 2 || href === "#") return;
        e.preventDefault();
        e.stopPropagation();
        scrollPreviewHashLink(href);
      },
      true
    );
  }

  function bindLinkPlaceholdersOnce() {
    if (document.documentElement.dataset.studioLinkPlaceBound === "1") return;
    document.documentElement.dataset.studioLinkPlaceBound = "1";
    document.addEventListener(
      "click",
      function (e) {
        if (document.body.getAttribute("data-studio-mode") === "readonly") return;
        if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
        const t = e.target;
        if (!t || typeof t.closest !== "function") return;
        const a = t.closest("a[data-href-key]");
        if (!a) return;
        const inMain = siteMain && siteMain.contains(a);
        const inFoot = footer && footer.contains(a);
        if (!inMain && !inFoot) return;
        const RE = window.RenderEngine;
        const ce = t.closest("[contenteditable='true']");
        const hrefNow = (a.getAttribute("href") || "").trim();
        if (hrefNow.startsWith("#")) {
          if (hrefNow.length >= 2) {
            e.preventDefault();
            e.stopPropagation();
            scrollPreviewHashLink(hrefNow);
          }
          return;
        }

        const isConf =
          RE && typeof RE.isConfiguredSiteHref === "function" && RE.isConfiguredSiteHref(hrefNow);

        if (isConf) return;

        if (ce && a.contains(ce)) return;

        e.preventDefault();
        e.stopPropagation();
        const key = a.getAttribute("data-href-key");
        let suggest = "#kontakt";
        if (key === "hero-cta-2-href") suggest = "#tjanster";
        else if (key && /^card-\d+-cta-href$/.test(key)) {
          const m = key.match(/^card-(\d+)-cta-href$/);
          const idx = m ? Number(m[1]) : 0;
          const cards = window.SiteState?.get()?.sections?.services?.cards || [];
          const intent = cards[idx]?.intent;
          const defFn = window.RenderEngine?.defaultCardHrefForIntent;
          if (intent && typeof defFn === "function") suggest = defFn(intent);
        } else if (key && key.indexOf("social") >= 0) suggest = "https://";
        const cur = hrefNow.trim();
        const defv = cur === "#" || !cur ? suggest : cur;
        const v = window.prompt(
          "Vart ska länken leda? (Till exempel kontakt, en annan del av sidan eller en webbadress.)",
          defv
        );
        if (v == null) return;
        const next = normalizeUserLinkInput(v);
        a.setAttribute("href", next);
        const ok = RE && typeof RE.isConfiguredSiteHref === "function" && RE.isConfiguredSiteHref(next);
        a.classList.toggle("link-target--open", !ok);
        a.classList.toggle("link-target--ready", ok);
        window.EditableBindings.syncDocumentFromDom(siteMain, footer);
        pushHistory();
        window.SiteState.save();
        if (typeof window.showStudioToast === "function") {
          window.showStudioToast(
            ok ? "Länk sparad — den följer med när du publicerar." : "Kontrollera länken om något ser konstigt ut.",
            ok ? "success" : null,
            2800
          );
        }
      },
      true
    );
  }

  /** Fliknamn = kundens rubrik eller namn — inte byggarvarumärke. */
  function syncBrowserTitleFromSite() {
    if (document.body.getAttribute("data-studio-mode") === "readonly") return;
    const d = window.SiteState.get();
    if (!d) return;
    const strip = (s) =>
      String(s ?? "")
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();
    const hero = strip(d.sections?.hero?.content?.["hero-title"]);
    const brand = strip(d.sections?.footer?.content?.["footer-brand"]);
    if (hero) document.title = hero.slice(0, 72);
    else if (brand) document.title = brand.slice(0, 72);
    else document.title = "Din sida";
  }

  function remount(force) {
    if (!force && shouldDeferPreviewRemount()) {
      return;
    }
    const epoch = remountEpoch;
    if (remountRaf) cancelAnimationFrame(remountRaf);
    remountRaf = requestAnimationFrame(() => {
      remountRaf = 0;
      if (epoch !== remountEpoch) return;
      const run = () => {
        if (epoch !== remountEpoch) return;
        let d = window.SiteState.get();
        if (!d) {
          try {
            window.SiteState.load();
            d = window.SiteState.get();
          } catch (e) {
            console.warn("remount: kunde inte ladda dokument", e);
            return;
          }
        }
        if (!d) return;
        const readOnly = document.body.getAttribute("data-studio-mode") === "readonly";
        if (window.GreenfieldAdapter && window.GreenfieldAdapter.restore()) {
          syncPanelFromDoc();
          syncBrowserTitleFromSite();
          document.dispatchEvent(new CustomEvent("studio:preview-mounted"));
          return;
        }
        window.RenderEngine.mount(d, siteMain, footer);
        const hooks = readOnly
          ? { onCommitHistory: function () {}, onPersist: function () {} }
          : bindingHooks();
        window.EditableBindings.rebindAll(siteMain, footer, hooks, { readOnly });
        cleanPreviewDom(siteMain, footer);
        if (window.SiteState && typeof window.SiteState.applyPageToBody === "function") {
          window.SiteState.applyPageToBody();
        }
        syncPanelFromDoc();
        syncBrowserTitleFromSite();
        syncHeroFromState();
        if (window.GenerationLifecycle && typeof window.GenerationLifecycle.log === "function") {
          window.GenerationLifecycle.log("DOM_RENDERED", {
            sections: siteMain ? siteMain.querySelectorAll(".site-section").length : 0,
          });
        }
        document.dispatchEvent(new CustomEvent("studio:preview-mounted"));
      };
      if (typeof document.startViewTransition === "function") {
        try {
          document.startViewTransition(run);
        } catch (e) {
          run();
        }
      } else {
        run();
      }
    });
  }

  function remountAsync(force) {
    if (!force && shouldDeferPreviewRemount()) {
      return Promise.resolve();
    }
    const epoch = remountEpoch;
    return new Promise(function (resolve) {
      function done() {
        document.removeEventListener("studio:preview-mounted", done);
        resolve();
      }
      document.addEventListener("studio:preview-mounted", done);
      remount(force);
      setTimeout(function () {
        if (epoch !== remountEpoch) {
          document.removeEventListener("studio:preview-mounted", done);
          resolve();
          return;
        }
        document.removeEventListener("studio:preview-mounted", done);
        resolve();
      }, 500);
    });
  }

  function remountAsyncForced() {
    return remountAsync(true);
  }

  /** Synkar hero-layout + bakgrundsbild utan full ommount (snabbare). */
  function cleanPreviewDom(mainEl, footerEl) {
    if (!document.body.classList.contains("studio-shell--create-active")) return;
    [mainEl, footerEl].filter(Boolean).forEach((root) => {
      root.querySelectorAll("[contenteditable]").forEach((el) => {
        el.removeAttribute("contenteditable");
        el.removeAttribute("spellcheck");
      });
      root.querySelectorAll(
        ".section-edit, .hero-image-tools, .editable-image__toolbar, .section-drag, .section-ai-ribbon, .card-intent-select"
      ).forEach((el) => el.remove());
      root.querySelectorAll("[draggable]").forEach((el) => el.removeAttribute("draggable"));
    });
    if (inlineToolbar) inlineToolbar.hidden = true;
  }

  function syncEditorFabVisibility() {
    if (!fab) return;
    if (document.body.getAttribute("data-studio-mode") === "readonly") {
      fab.hidden = true;
      return;
    }
    const hasSite = !!siteMain?.querySelector(".site-section");
    const generating =
      document.body.classList.contains("studio-shell--generating") ||
      document.documentElement.classList.contains("studio-is-generating");
    fab.hidden = !hasSite || generating;
  }

  function syncHeroFromState() {
    const d = window.SiteState.get();
    if (!d?.page) return;
    if (d.page.createPath === "blueprint" || d.page.createPath === "v2") return;
    const lay = d.page.heroLayout || "center";
    const hero = siteMain?.querySelector(".site-section--hero");
    if (hero) {
      ["center", "left", "split"].forEach((id) => hero.classList.remove(`hero-layout--${id}`));
      hero.classList.add(`hero-layout--${lay}`);
    }
    const HIU = window.HeroImageUrl;
    let heroUrl = d.page.heroBgUrl;
    if (HIU && typeof HIU.sanitizeStored === "function") {
      const clean = HIU.sanitizeStored(heroUrl, d);
      if (clean && clean !== heroUrl && window.SiteState.patch) {
        window.SiteState.patch(function (doc) {
          if (!doc.page) doc.page = {};
          doc.page.heroBgUrl = clean;
          if (doc.page.material) doc.page.material.heroImageUrl = clean;
        });
        window.SiteState.save();
        heroUrl = clean;
      } else if (clean) {
        heroUrl = clean;
      }
    }
    applyHeroPhotoToDom(document.getElementById("heroBg"), hero, heroUrl);
  }

  function applyHeroPhotoToDom(bgEl, heroSec, url) {
    const HIU = window.HeroImageUrl;
    let heroUrl =
      HIU && typeof HIU.canonical === "function" ? HIU.canonical(url) || "" : url && String(url).trim();
    const has = !!(heroUrl && !/^none$/i.test(heroUrl));

    function showGradientFallback() {
      if (heroSec) heroSec.classList.remove("hero--has-photo");
      if (!bgEl) return;
      bgEl.style.removeProperty("--hero-bg-image");
      bgEl.style.backgroundImage = "";
      const img = bgEl.querySelector(".hero__photo");
      if (img) img.style.display = "none";
    }

    function applyBgDisplay(displayUrl) {
      if (!bgEl || !displayUrl) return;
      const cssSafe = String(displayUrl).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
      bgEl.style.setProperty("--hero-bg-image", "url('" + cssSafe + "')");
      bgEl.style.backgroundImage = 'url("' + String(displayUrl).replace(/"/g, '\\"') + '")';
      bgEl.style.backgroundSize = "cover";
      bgEl.style.backgroundPosition = "center";
    }

    if (!has) {
      showGradientFallback();
      if (bgEl) {
        const img = bgEl.querySelector(".hero__photo");
        if (img) img.remove();
      }
      return;
    }

    if (!bgEl) return;

    let img = bgEl.querySelector(".hero__photo");
    if (!img) {
      img = document.createElement("img");
      img.className = "hero__photo";
      img.alt = "";
      img.decoding = "async";
      img.referrerPolicy = "no-referrer";
      bgEl.appendChild(img);
    }

    let candidates = HIU && HIU.displayCandidates ? HIU.displayCandidates(heroUrl) : [heroUrl];
    let candidateIdx = 0;
    let triedRecover = false;
    let persistOnLoad = null;

    img.onload = function () {
      if (heroSec) heroSec.classList.add("hero--has-photo");
      img.style.display = "";
      if (persistOnLoad && window.SiteState && window.SiteState.patch) {
        const toStore = persistOnLoad;
        window.SiteState.patch(function (doc) {
          if (!doc.page) doc.page = {};
          doc.page.heroBgUrl = toStore;
          if (doc.page.material) doc.page.material.heroImageUrl = toStore;
        });
        window.SiteState.save();
        persistOnLoad = null;
      }
    };

    function tryNextSrc() {
      if (candidateIdx < candidates.length) {
        const src = candidates[candidateIdx++];
        applyBgDisplay(src);
        if (img.getAttribute("src") !== src) {
          img.src = src;
        } else if (img.complete) {
          if (img.naturalWidth > 0) img.onload();
          else img.onerror();
        }
        return;
      }
      if (!triedRecover && HIU && typeof HIU.recoverHeroUrl === "function") {
        triedRecover = true;
        const doc = window.SiteState && window.SiteState.get ? window.SiteState.get() : null;
        const fresh = HIU.recoverHeroUrl(doc);
        if (fresh && fresh !== heroUrl) {
          heroUrl = fresh;
          persistOnLoad = fresh;
          candidates = HIU.displayCandidates ? HIU.displayCandidates(fresh) : [fresh];
          candidateIdx = 0;
          tryNextSrc();
          return;
        }
      }
      showGradientFallback();
    }

    img.onerror = function () {
      tryNextSrc();
    };

    candidateIdx = 0;
    tryNextSrc();
  }

  /** Synkar data-hidden från dokument utan full ommount. */
  function syncVisibilityFromState() {
    const d = window.SiteState.get();
    if (!d?.sections) return;
    siteMain?.querySelectorAll(".site-section[data-section]").forEach((el) => {
      const id = el.getAttribute("data-section");
      if (!id) return;
      if (d.sections[id]?.hidden) el.setAttribute("data-hidden", "true");
      else el.removeAttribute("data-hidden");
    });
    const foot = footer || document.querySelector(".site-footer");
    if (foot && d.sections.footer) {
      if (d.sections.footer.hidden) foot.setAttribute("data-hidden", "true");
      else foot.removeAttribute("data-hidden");
    }
  }

  function pushHistory(opts) {
    opts = opts || {};
    if (document.body.getAttribute("data-studio-mode") === "readonly") return;
    if (isApplyingHistory) return;
    const snap = window.SiteState.get();
    if (
      !opts.force &&
      history.length &&
      JSON.stringify(history[historyIndex]) === JSON.stringify(snap)
    ) {
      return;
    }
    history = history.slice(0, historyIndex + 1);
    history.push(snap);
    if (history.length > MAX_HISTORY) history.shift();
    historyIndex = history.length - 1;
  }

  function canUndo() {
    return historyIndex > 0;
  }

  function canRedo() {
    return historyIndex < history.length - 1;
  }

  function applyHistorySnapshot(snap) {
    if (!snap) return;
    isApplyingHistory = true;
    try {
      window.SiteState.replace(snap);
      remount();
    } finally {
      isApplyingHistory = false;
    }
  }

  function undo() {
    if (historyIndex <= 0) return;
    historyIndex--;
    applyHistorySnapshot(history[historyIndex]);
    window.SiteState.save();
  }

  function redo() {
    if (historyIndex >= history.length - 1) return;
    historyIndex++;
    applyHistorySnapshot(history[historyIndex]);
    window.SiteState.save();
  }

  function persistSoon() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => window.SiteState.save(), 350);
  }

  function syncPanelFromDoc() {
    const d = window.SiteState.get();
    if (!d) return;
    const p = d.page;

    document.querySelectorAll("#paletteChoices .palette-chip").forEach((b) => {
      const active = b.dataset.theme === p.theme;
      b.classList.toggle("is-active", active);
      b.setAttribute("aria-pressed", active ? "true" : "false");
    });
    syncPaletteChipSelection(p.theme);
    updatePaletteThemePreview(p.theme || "minimal-white");

    const tplId = p.template || "editorial";
    const tpl = document.getElementById("templateSelect");
    if (tpl) tpl.value = tplId;
    syncTemplateMoodSelection(tplId);
    syncLeftTemplateSelection(tplId);
    const ind = document.getElementById("industrySelect");
    if (ind) ind.value = p.industry || "konsult";

    const spacing = document.getElementById("sectionSpacing");
    const spVal = p.sectionSpacing || "2";
    if (spacing) {
      spacing.value = spVal;
      const lab = document.getElementById("sectionSpacingLabel");
      if (lab) lab.textContent = SPACING_LABELS[Number(spVal)] || "";
    }

    const heroLay = p.heroLayout || "center";
    document.querySelectorAll("[data-hero-layout]").forEach((b) => {
      b.classList.toggle("is-active", b.dataset.heroLayout === heroLay);
    });

    const btnStyleNorm = !p.buttonStyle || p.buttonStyle === "solid" ? "solid" : p.buttonStyle;
    document.querySelectorAll("[data-button-style-choice]").forEach((b) => {
      const id = b.getAttribute("data-button-style-choice") || "solid";
      const on = id === btnStyleNorm;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });

    const fc = d.sections?.footer?.content;
    if (fc) {
      const s1 = document.getElementById("footerSocial1Url");
      const s2 = document.getElementById("footerSocial2Url");
      const s3 = document.getElementById("footerSocial3Url");
      if (s1) s1.value = fc["footer-social-1-href"] || "";
      if (s2) s2.value = fc["footer-social-2-href"] || "";
      if (s3) s3.value = fc["footer-social-3-href"] || "";
    }

    const bookingInput = document.getElementById("pageBookingUrl");
    if (bookingInput) bookingInput.value = p.bookingUrl || "";
    const foodoraInput = document.getElementById("pageFoodoraUrl");
    const woltInput = document.getElementById("pageWoltUrl");
    const pickupInput = document.getElementById("pagePickupUrl");
    if (foodoraInput) foodoraInput.value = p.foodoraUrl || "";
    if (woltInput) woltInput.value = p.woltUrl || "";
    if (pickupInput) pickupInput.value = p.pickupUrl || "";

    buildSectionToggles();
  }

  function buildSectionToggles() {
    const host = document.getElementById("sectionToggles");
    if (!host || !window.SectionRegistry) return;
    host.innerHTML = "";
    const d = window.SiteState.get();
    window.SectionRegistry.SECTION_IDS.forEach((id) => {
      const meta = window.SectionRegistry.getMeta(id);
      const row = document.createElement("label");
      const span = document.createElement("span");
      span.textContent = meta?.label || id;
      const input = document.createElement("input");
      input.type = "checkbox";
      const hidden = d.sections[id]?.hidden;
      input.checked = !hidden;
      input.addEventListener("change", () => {
        window.SiteState.patch((doc) => {
          if (doc.sections[id]) doc.sections[id].hidden = !input.checked;
        });
        pushHistory();
        syncVisibilityFromState();
        window.SiteState.save();
      });
      row.append(span, input);
      host.appendChild(row);
    });
  }

  function syncEditorPanelToViewport() {
    if (!panel || !window.visualViewport) return;
    if (window.matchMedia("(min-width: 521px)").matches) {
      panel.style.removeProperty("max-height");
      return;
    }
    if (!panel.classList.contains("is-open")) return;
    const vv = window.visualViewport;
    const reserve = 96;
    const h = Math.floor(Math.max(220, vv.height - reserve));
    panel.style.maxHeight = h + "px";
  }

  function openPanel() {
    panel.hidden = false;
    panel.setAttribute("aria-hidden", "false");
    panel.classList.add("is-open");
    fab.setAttribute("aria-expanded", "true");
    requestAnimationFrame(() => {
      syncEditorPanelToViewport();
      try {
        panel.querySelector(".editor-panel__scroll")?.focus?.({ preventScroll: true });
      } catch (e) {
        panel.querySelector(".editor-panel__scroll")?.focus?.();
      }
    });
  }

  function closePanel() {
    panel.style.removeProperty("max-height");
    panel.classList.remove("is-open");
    panel.setAttribute("aria-hidden", "true");
    fab.setAttribute("aria-expanded", "false");
    setTimeout(() => {
      if (!panel.classList.contains("is-open")) panel.hidden = true;
    }, 320);
  }

  function syncPaletteChipSelection(themeId) {
    document.querySelectorAll(".palette-chip").forEach(function (b) {
      const active = b.dataset.theme === themeId;
      b.classList.toggle("is-active", active);
      b.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function syncLeftTemplateSelection(tplId) {
    document.querySelectorAll(".studio-left-template-chip").forEach(function (btn) {
      const on = btn.dataset.template === tplId;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  function mountLeftPanelPalette(root) {
    if (!root) return;
    const paletteHost = root.querySelector("#studioLeftPaletteChoices") || root;
    if (paletteHost.dataset.paletteMounted === "1") {
      const d = window.SiteState.get();
      if (d && d.page) {
        syncPaletteChipSelection(d.page.theme || "minimal-white");
        updatePaletteThemePreview(d.page.theme || "minimal-white");
      }
      return;
    }
    paletteHost.dataset.paletteMounted = "1";
    if (!paletteHost.id) {
      paletteHost.id = "studioLeftPaletteChoices";
      paletteHost.className = "studio-left-palettes";
    }
    paletteHost.innerHTML = "";
    PALETTES.forEach(function (p) {
      paletteHost.appendChild(createPaletteChipButton(p, true));
    });
    const d = window.SiteState.get();
    if (d && d.page) {
      syncPaletteChipSelection(d.page.theme || "minimal-white");
      updatePaletteThemePreview(d.page.theme || "minimal-white");
    }
  }

  function mountLeftPanelTypography(root) {
    if (!root) return;
    const templateHost = root.querySelector("#studioLeftTemplateChoices") || root;
    if (templateHost.dataset.typographyMounted === "1") {
      const d = window.SiteState.get();
      if (d && d.page) syncLeftTemplateSelection(d.page.template || "editorial");
      return;
    }
    templateHost.dataset.typographyMounted = "1";
    if (!templateHost.id) {
      templateHost.id = "studioLeftTemplateChoices";
      templateHost.className = "studio-left-templates";
    }
    templateHost.innerHTML = "";
    TEMPLATES.forEach(function (t) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "studio-left-template-chip";
      btn.dataset.template = t.id;
      btn.setAttribute("aria-pressed", "false");
      btn.title = templatePairTitle(t) + " — " + t.mood;
      btn.append(createTemplateTypePreview(t, "studio-left-template-chip__preview"));
      const mood = document.createElement("span");
      mood.className = "studio-left-template-chip__mood";
      mood.style.fontFamily = t.bodyFont;
      mood.textContent = t.mood;
      btn.append(mood);
      btn.addEventListener("click", function () {
        applyTemplateToDoc(t.id);
        syncLeftTemplateSelection(t.id);
      });
      templateHost.appendChild(btn);
    });
    const d = window.SiteState.get();
    if (d && d.page) syncLeftTemplateSelection(d.page.template || "editorial");
  }

  function mountLeftPanelAppearance(root) {
    mountLeftPanelPalette(root);
    mountLeftPanelTypography(root);
  }

  function escTemplateLabel(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function buildPaletteUI() {
    const wrap = document.getElementById("paletteChoices");
    if (!wrap) return;
    wrap.innerHTML = "";
    PALETTES.forEach((p) => {
      wrap.appendChild(createPaletteChipButton(p, false));
    });
    const d = window.SiteState.get();
    if (d && d.page) {
      updatePaletteThemePreview(d.page.theme || "minimal-white");
    }
  }

  function applyTemplateToDoc(tpl) {
    window.SiteState.patch((doc) => {
      doc.page.template = tpl;
      doc.page.fontPair = "";
    });
    siteMain?.querySelectorAll("[data-section]").forEach((el) => el.setAttribute("data-template", tpl));
    if (footer) footer.setAttribute("data-template", tpl);
    pushHistory();
    syncPanelFromDoc();
    window.SiteState.save();
  }

  function syncTemplateMoodSelection(tplId) {
    const grid = document.getElementById("templateMoodGrid");
    if (!grid) return;
    grid.querySelectorAll(".template-mood-card").forEach((card) => {
      const on = card.dataset.template === tplId;
      card.classList.toggle("is-active", on);
      card.setAttribute("aria-checked", on ? "true" : "false");
    });
  }

  function buildTemplateMoodGrid() {
    const grid = document.getElementById("templateMoodGrid");
    const sel = document.getElementById("templateSelect");
    if (!grid || !sel || grid.dataset.bound) return;
    grid.dataset.bound = "1";
    sel.innerHTML = "";
    sel.dataset.bound = "1";

    TEMPLATES.forEach((t) => {
      const o = document.createElement("option");
      o.value = t.id;
      o.textContent = templatePairTitle(t) + " — " + t.mood;
      sel.appendChild(o);
    });

    TEMPLATES.forEach((t) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "template-mood-card";
      card.dataset.template = t.id;
      card.setAttribute("role", "radio");
      card.setAttribute("aria-checked", "false");
      const pairLabel = templatePairTitle(t);
      card.setAttribute("aria-label", pairLabel + ", " + t.mood);

      const preview = document.createElement("div");
      preview.className = "template-mood-card__preview";
      applyTemplateFontVars(preview, t);

      const typeDemo = document.createElement("div");
      typeDemo.className = "template-mood-card__type";
      const hEl = document.createElement("span");
      hEl.className = "template-mood-card__h";
      hEl.textContent = primaryFontName(t.headingFont);
      const bEl = document.createElement("span");
      bEl.className = "template-mood-card__b";
      bEl.textContent = primaryFontName(t.bodyFont);
      typeDemo.append(hEl, bEl);
      preview.append(typeDemo);

      const mood = document.createElement("span");
      mood.className = "template-mood-card__mood";
      mood.style.fontFamily = t.bodyFont;
      mood.textContent = t.mood;

      card.append(preview, mood);
      card.addEventListener("click", () => {
        sel.value = t.id;
        applyTemplateToDoc(t.id);
      });
      grid.appendChild(card);
    });

    sel.addEventListener("change", () => {
      applyTemplateToDoc(sel.value);
      syncTemplateMoodSelection(sel.value);
    });

    grid.addEventListener("keydown", (e) => {
      const cards = [...grid.querySelectorAll(".template-mood-card")];
      if (!cards.length) return;
      const i = cards.indexOf(document.activeElement);
      if (i < 0) return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        const n = cards[(i + 1) % cards.length];
        n.focus();
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        const n = cards[(i - 1 + cards.length) % cards.length];
        n.focus();
      }
    });
  }

  function buildIndustrySelect() {
    const sel = document.getElementById("industrySelect");
    if (!sel || sel.dataset.bound) return;
    sel.dataset.bound = "1";
    const IND = window.AISiteBuilder && window.AISiteBuilder.INDUSTRIES;
    const keys =
      IND && Object.keys(IND).length
        ? Object.keys(IND)
        : ["konsult", "frisor", "cafe", "byggfirma", "fotograf", "event", "restaurang", "butik", "advokat", "gym"];
    keys.forEach((key) => {
      const o = document.createElement("option");
      o.value = key;
      o.textContent = IND && IND[key] && IND[key].label ? IND[key].label : key;
      sel.appendChild(o);
    });
    sel.addEventListener("change", () => {
      window.SiteState.patch((doc) => {
        doc.page.industry = sel.value;
      });
      document.body.setAttribute("data-industry", sel.value);
      pushHistory();
      syncPanelFromDoc();
      window.SiteState.save();
    });
  }

  function buildHeroLayouts() {
    const wrap = document.getElementById("heroLayoutChoices");
    if (!wrap) return;
    wrap.innerHTML = "";
    HERO_LAYOUTS.forEach((L) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "editor-btn editor-btn--secondary";
      btn.dataset.heroLayout = L.id;
      btn.textContent = L.label;
      btn.addEventListener("click", () => {
        window.SiteState.patch((doc) => {
          doc.page.heroLayout = L.id;
        });
        pushHistory();
        syncHeroFromState();
        window.SiteState.save();
      });
      wrap.appendChild(btn);
    });
  }

  function buildButtonStyleChoices() {
    const wrap = document.getElementById("buttonStyleChoices");
    if (!wrap) return;
    wrap.innerHTML = "";
    BUTTON_STYLES.forEach((S) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "editor-btn editor-btn--secondary";
      btn.setAttribute("data-button-style-choice", S.id);
      btn.setAttribute("aria-pressed", "false");
      btn.textContent = S.label;
      btn.addEventListener("click", () => {
        window.SiteState.patch((doc) => {
          doc.page.buttonStyle = S.id === "solid" ? "" : S.id;
        });
        pushHistory();
        syncPanelFromDoc();
        window.SiteState.save();
      });
      wrap.appendChild(btn);
    });
  }

  function bindEditorPanelControls() {
    document.getElementById("sectionSpacing")?.addEventListener("input", (e) => {
      const v = e.target.value;
      document.body.setAttribute("data-section-spacing", v);
      const lab = document.getElementById("sectionSpacingLabel");
      if (lab) lab.textContent = SPACING_LABELS[Number(v)] || "";
    });
    document.getElementById("sectionSpacing")?.addEventListener("change", (e) => {
      const v = e.target.value;
      window.SiteState.patch((doc) => {
        doc.page.sectionSpacing = v;
      });
      pushHistory();
      syncPanelFromDoc();
      window.SiteState.save();
    });

    document.getElementById("heroBgFile")?.addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      if (!file || !file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result;
        if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:")) return;
        window.SiteState.patch((doc) => {
          doc.page.heroBgUrl = dataUrl;
        });
        pushHistory();
        syncHeroFromState();
        window.SiteState.save();
      };
      reader.readAsDataURL(file);
      e.target.value = "";
    });

    function normFooterSocialUrl(raw) {
      let u = String(raw || "").trim();
      if (!u) return "#";
      const lower = u.toLowerCase();
      if (lower.startsWith("javascript:") || lower.startsWith("data:")) return "#";
      if (!/^https?:\/\//i.test(u)) {
        if (/^www\./i.test(u)) u = "https://" + u;
        else if (/^[a-z0-9.-]+\.[a-z]{2,}\/?/i.test(u)) u = "https://" + u.replace(/^\/+/, "");
      }
      return u;
    }

    document.getElementById("footerSocialApply")?.addEventListener("click", () => {
      const v1 = normFooterSocialUrl(document.getElementById("footerSocial1Url")?.value);
      const v2 = normFooterSocialUrl(document.getElementById("footerSocial2Url")?.value);
      const v3 = normFooterSocialUrl(document.getElementById("footerSocial3Url")?.value);
      window.SiteState.patch((doc) => {
        const c = doc.sections?.footer?.content;
        if (!c) return;
        c["footer-social-1-href"] = v1;
        c["footer-social-2-href"] = v2;
        c["footer-social-3-href"] = v3;
      });
      pushHistory();
      remount();
      window.SiteState.save();
      showStudioToast("Sociala länkar sparade.", "success", 2800);
    });

    document.getElementById("pageBookingApply")?.addEventListener("click", () => {
      const raw = document.getElementById("pageBookingUrl")?.value;
      if (!String(raw || "").trim()) {
        showStudioToast("Klistra in en bokningslänk först.", "info", 2800);
        return;
      }
      window.SiteState.patch((doc) => {
        if (window.RenderEngine && typeof window.RenderEngine.applyBookingLinkToDocument === "function") {
          window.RenderEngine.applyBookingLinkToDocument(doc, raw);
        } else {
          const norm =
            window.RenderEngine && typeof window.RenderEngine.normalizeBookingUrl === "function"
              ? window.RenderEngine.normalizeBookingUrl(raw)
              : String(raw || "").trim();
          doc.page.bookingUrl = norm;
          if (norm && doc.sections && doc.sections.booking) doc.sections.booking.hidden = false;
        }
      });
      pushHistory();
      remount();
      window.SiteState.save();
      showStudioToast("Hemsidan är uppdaterad — knappen pekar på din bokning.", "success", 3200);
    });

    document.getElementById("pageOrderApply")?.addEventListener("click", () => {
      const foodora = document.getElementById("pageFoodoraUrl")?.value;
      const wolt = document.getElementById("pageWoltUrl")?.value;
      const pickup = document.getElementById("pagePickupUrl")?.value;
      if (!String(foodora || "").trim() && !String(wolt || "").trim() && !String(pickup || "").trim()) {
        showStudioToast("Klistra in minst en länk (Foodora, Wolt eller Beställ & hämta).", "info", 3200);
        return;
      }
      window.SiteState.patch((doc) => {
        if (window.RenderEngine && typeof window.RenderEngine.applyOrderLinksToDocument === "function") {
          window.RenderEngine.applyOrderLinksToDocument(doc, { foodora, wolt, pickup });
        } else {
          const norm =
            window.RenderEngine && typeof window.RenderEngine.normalizeBookingUrl === "function"
              ? window.RenderEngine.normalizeBookingUrl
              : (s) => String(s || "").trim();
          doc.page.foodoraUrl = norm(foodora);
          doc.page.woltUrl = norm(wolt);
          doc.page.pickupUrl = norm(pickup);
          if (doc.sections && doc.sections.booking) doc.sections.booking.hidden = false;
        }
      });
      pushHistory();
      remount();
      window.SiteState.save();
      showStudioToast("Beställningslänkar sparade — se sektionen Boka & beställ.", "success", 3200);
    });

    document.getElementById("undoBtn")?.addEventListener("click", undo);
    document.getElementById("redoBtn")?.addEventListener("click", redo);

    document.getElementById("contactForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      alert("Demo — formuläret skickas inte.");
    });
  }

  function execCmd(cmd) {
    document.execCommand(cmd, false, null);
    window.EditableBindings.syncDocumentFromDom(siteMain, footer);
    pushHistory();
    window.SiteState.save();
  }

  /** Webbläsarens steg ångra/gör om i det aktiva textfältet (samma kö som Ctrl+Z / Ctrl+Y). */
  function execContentUndoRedo(cmd) {
    try {
      document.execCommand(cmd, false, null);
    } catch (e) {
      /* ignore */
    }
    window.EditableBindings.syncDocumentFromDom(siteMain, footer);
    window.SiteState.save();
  }

  /**
   * em relativt befintlig rubrik/styckestorlek. XL ska märkas utan att spåra ur (särskilt i hero).
   */
  const TOOLBAR_FONT_EM = { "1": "0.86em", "3": "1em", "5": "1.1em", "7": "1.18em" };
  const TOOLBAR_FONT_EM_HERO = { "1": "0.88em", "3": "1em", "5": "1.12em", "7": "1.36em" };

  function applyToolbarFontSize(sizeKey) {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (range.collapsed) return;
    let ancestor = range.commonAncestorContainer;
    if (ancestor.nodeType === Node.TEXT_NODE) ancestor = ancestor.parentElement;
    if (!ancestor || !ancestor.closest || !ancestor.closest("#siteMain, .site-footer")) return;

    const inHeroTypography = ancestor.closest(".hero__title, .hero__lead");
    const map = inHeroTypography ? TOOLBAR_FONT_EM_HERO : TOOLBAR_FONT_EM;
    const em = map[sizeKey];
    if (!em) return;

    const span = document.createElement("span");
    span.style.fontSize = em;
    span.setAttribute("data-editor-font-size", sizeKey);

    try {
      range.surroundContents(span);
    } catch (e) {
      const contents = range.extractContents();
      span.appendChild(contents);
      range.insertNode(span);
    }

    sel.removeAllRanges();
    const nextRange = document.createRange();
    nextRange.selectNodeContents(span);
    sel.addRange(nextRange);

    window.EditableBindings.syncDocumentFromDom(siteMain, footer);
    pushHistory();
    window.SiteState.save();
  }

  function studioAppBarBottomPx() {
    try {
      if (document.body.getAttribute("data-studio-mode") === "readonly") return 0;
      const bar = document.querySelector(".studio-app-bar");
      if (!bar) return 0;
      const st = getComputedStyle(bar);
      if (st.display === "none") return 0;
      return bar.getBoundingClientRect().bottom;
    } catch (e) {
      return 0;
    }
  }

  function positionToolbar() {
    if (toolbarPositioning) return;
    if (isInlineToolbarSuppressed()) {
      hideInlineToolbar();
      return;
    }
    if (!inlineToolbar) return;

    toolbarPositioning = true;
    try {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
        hideInlineToolbar();
        return;
      }
      const range = sel.getRangeAt(0);
      let node = range.commonAncestorContainer;
      if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
      if (
        !node ||
        !node.closest ||
        !node.closest("#siteMain, .site-footer") ||
        node.closest("#studioCreatePane, #studioChatCompose, #inlineToolbar, .editor-panel")
      ) {
        hideInlineToolbar();
        return;
      }
      const rect = range.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        hideInlineToolbar();
        return;
      }
      inlineToolbar.hidden = false;

      const chromeBottom = studioAppBarBottomPx();
      const minTopBelowChrome = chromeBottom > 0 ? chromeBottom + 8 : 12;

      const narrow = window.matchMedia("(max-width: 640px)").matches;
      if (narrow) {
        inlineToolbar.style.left = "50%";
        inlineToolbar.style.right = "auto";
        inlineToolbar.style.top = "auto";
        const vv = window.visualViewport;
        const kb = vv ? Math.max(0, window.innerHeight - vv.height - vv.offsetTop) : 0;
        inlineToolbar.style.bottom =
          "max(6.25rem, calc(env(safe-area-inset-bottom, 0px) + 5.25rem + " + kb + "px))";
        inlineToolbar.style.transform = "translateX(-50%)";
        return;
      }

      inlineToolbar.style.bottom = "";
      const cx = rect.left + rect.width / 2;
      const anchorTop = rect.top;
      const anchorBottom = rect.bottom;
      /** Raden flyttas med translate(-100%) uppåt — räkna med ~56px höjd så inget sticker upp bakom menyn */
      const TOOLBAR_APPROX = 56;

      if (chromeBottom > 0 && anchorTop < chromeBottom + TOOLBAR_APPROX) {
        inlineToolbar.style.left = `${cx}px`;
        inlineToolbar.style.transform = "translateX(-50%)";
        inlineToolbar.style.top = `${Math.max(chromeBottom + 6, anchorBottom + 10)}px`;
        requestAnimationFrame(() => {
          if (isInlineToolbarSuppressed() || inlineToolbar.hidden) return;
          let left = cx;
          const b = inlineToolbar.getBoundingClientRect();
          if (b.left < 8) left += 8 - b.left;
          if (b.right > window.innerWidth - 8) left -= b.right - (window.innerWidth - 8);
          inlineToolbar.style.left = `${left}px`;
          const b2 = inlineToolbar.getBoundingClientRect();
          if (b2.top < chromeBottom + 2) {
            hideInlineToolbar();
          }
        });
        return;
      }

      inlineToolbar.style.left = `${cx}px`;
      inlineToolbar.style.top = `${Math.max(minTopBelowChrome, anchorTop - 10)}px`;
      inlineToolbar.style.transform = "translate(-50%, -100%)";

      requestAnimationFrame(() => {
        if (isInlineToolbarSuppressed() || inlineToolbar.hidden) return;
        const b = inlineToolbar.getBoundingClientRect();
        let left = cx;
        let top = Math.max(minTopBelowChrome, anchorTop - 10);
        const flipIfObstructed = chromeBottom > 0 && b.top < chromeBottom + 4;
        let flipBelow = flipIfObstructed || b.top < 8;
        if (b.left < 8) left += 8 - b.left;
        if (b.right > window.innerWidth - 8) left -= b.right - (window.innerWidth - 8);
        inlineToolbar.style.left = `${left}px`;
        if (flipBelow) {
          inlineToolbar.style.transform = "translateX(-50%)";
          inlineToolbar.style.top = `${Math.max(chromeBottom + 6, rect.bottom + 10)}px`;
        } else {
          inlineToolbar.style.transform = "translate(-50%, -100%)";
          inlineToolbar.style.top = `${top}px`;
          const b2 = inlineToolbar.getBoundingClientRect();
          if (chromeBottom > 0 && b2.top < chromeBottom + 4) {
            inlineToolbar.style.transform = "translateX(-50%)";
            inlineToolbar.style.top = `${Math.max(chromeBottom + 6, rect.bottom + 10)}px`;
          } else if (b2.bottom > window.innerHeight - 8) {
            inlineToolbar.style.transform = "translateX(-50%)";
            inlineToolbar.style.top = `${Math.max(chromeBottom + 6, rect.bottom + 10)}px`;
          }
        }
        requestAnimationFrame(() => {
          if (isInlineToolbarSuppressed() || inlineToolbar.hidden) return;
          const b3 = inlineToolbar.getBoundingClientRect();
          if (chromeBottom > 0 && b3.top < chromeBottom + 2 && !inlineToolbar.hidden) {
            inlineToolbar.style.transform = "translateX(-50%)";
            inlineToolbar.style.top = `${Math.max(chromeBottom + 6, rect.bottom + 10)}px`;
            const b4 = inlineToolbar.getBoundingClientRect();
            if (b4.top < chromeBottom + 2) hideInlineToolbar();
          }
        });
      });
    } finally {
      toolbarPositioning = false;
    }
  }

  function bindInlineToolbar() {
    if (document.documentElement.dataset.inlineToolbarBound === "1") return;
    document.documentElement.dataset.inlineToolbarBound = "1";

    document.addEventListener("selectionchange", () => {
      if (isInlineToolbarSuppressed()) {
        hideInlineToolbar();
        return;
      }
      scheduleToolbarPosition();
    });
    window.addEventListener("resize", () => scheduleToolbarPosition());
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", () => scheduleToolbarPosition());
      window.visualViewport.addEventListener("scroll", () => scheduleToolbarPosition());
    }

    /** Klick utanför sidan/panel: dölj raden (markering kan annars ligga kvar tills en annan rad markeras). */
    document.addEventListener(
      "pointerdown",
      (e) => {
        if (!inlineToolbar || inlineToolbar.hidden) return;
        const t = e.target;
        if (!(t instanceof Element)) {
          inlineToolbar.hidden = true;
          return;
        }
        if (t.closest("#inlineToolbar")) return;
        if (t.closest('#siteMain [contenteditable="true"], .site-footer [contenteditable="true"]')) return;
        inlineToolbar.hidden = true;
      },
      true
    );

    /** Efter mus släppt: fånga infälld markör i samma ruta där selectionchange ibland uteblir. */
    document.addEventListener(
      "mouseup",
      () => {
        requestAnimationFrame(() => scheduleToolbarPosition());
      },
      true
    );

    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      if (!inlineToolbar || inlineToolbar.hidden) return;
      inlineToolbar.hidden = true;
    });
    const fieldUndo = document.getElementById("toolbarFieldUndo");
    const fieldRedo = document.getElementById("toolbarFieldRedo");
    if (fieldUndo && !fieldUndo.dataset.boundFieldHistory) {
      fieldUndo.dataset.boundFieldHistory = "1";
      fieldUndo.addEventListener("mousedown", (e) => e.preventDefault());
      fieldUndo.addEventListener("click", () => execContentUndoRedo("undo"));
    }
    if (fieldRedo && !fieldRedo.dataset.boundFieldHistory) {
      fieldRedo.dataset.boundFieldHistory = "1";
      fieldRedo.addEventListener("mousedown", (e) => e.preventDefault());
      fieldRedo.addEventListener("click", () => execContentUndoRedo("redo"));
    }
    inlineToolbar.querySelectorAll("[data-cmd]").forEach((btn) => {
      btn.addEventListener("mousedown", (e) => e.preventDefault());
      btn.addEventListener("click", () => execCmd(btn.getAttribute("data-cmd")));
    });
    const fs = document.getElementById("toolbarFontSize");
    if (fs && !fs.dataset.bound) {
      fs.dataset.bound = "1";
      fs.addEventListener("mousedown", (e) => e.stopPropagation());
      fs.addEventListener("change", () => {
        if (!fs.value) return;
        applyToolbarFontSize(fs.value);
        fs.value = "";
      });
    }
    inlineToolbar.querySelectorAll("[data-fore-color]").forEach((sw) => {
      sw.addEventListener("mousedown", (e) => e.preventDefault());
      sw.addEventListener("click", () => {
        const c = sw.getAttribute("data-fore-color");
        if (!c) return;
        document.execCommand("foreColor", false, c);
        window.EditableBindings.syncDocumentFromDom(siteMain, footer);
        pushHistory();
        window.SiteState.save();
      });
    });
    const toolbarAi = document.getElementById("toolbarAiImprove");
    if (toolbarAi && !toolbarAi.dataset.boundAi) {
      toolbarAi.dataset.boundAi = "1";
      toolbarAi.addEventListener("mousedown", (e) => e.preventDefault());
      toolbarAi.addEventListener("click", async () => {
        const AI = window.AISiteBuilder;
        if (!AI) return;
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) {
          showStudioToast("Markera text, eller ställ markören i en textruta på sidan.", null, 3600);
          return;
        }
        const range = sel.getRangeAt(0).cloneRange();
        let node = range.commonAncestorContainer;
        if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
        if (!node || !node.closest || !node.closest("#siteMain, .site-footer")) {
          showStudioToast("Markera text i själva sidan.", null, 3200);
          return;
        }
        const ce = node.closest("[contenteditable=true]");
        if (!ce) {
          showStudioToast("Här går det inte att redigera text med AI.", null, 3200);
          return;
        }
        if (isStructuredFactField(ce)) {
          showStudioToast(
            "Här är telefon, mejl eller adress — skriv dem för hand. Använd ✦ AI i ett stycke med löptext i stället.",
            null,
            4800
          );
          return;
        }
        try {
          if (range.collapsed) {
            const plain = AI.stripHtml(await AI.improve(ce.innerHTML));
            ce.textContent = plain;
          } else {
            const wrap = document.createElement("div");
            wrap.appendChild(range.cloneContents());
            const plain = AI.stripHtml(await AI.improve(wrap.innerHTML));
            range.deleteContents();
            range.insertNode(document.createTextNode(plain));
            sel.removeAllRanges();
            const nr = document.createRange();
            nr.selectNodeContents(ce);
            nr.collapse(false);
            sel.addRange(nr);
          }
          window.EditableBindings.syncDocumentFromDom(siteMain, footer);
          pushHistory();
          window.SiteState.save();
        } catch (e) {
          console.warn("Verktygsfält AI", e);
          showStudioToast("Något gick fel. Försök igen.", null, 3500);
        }
      });
    }
  }

  function setProjectStatus(msg) {
    const el = document.getElementById("projectSyncStatus");
    if (el) el.textContent = msg || "";
  }

  function setMerStatus(msg) {
    const el = document.getElementById("merPanelStatus");
    if (el) el.textContent = msg || "";
  }

  function isStudioDebugMode() {
    try {
      const q = new URLSearchParams(window.location.search);
      if (q.get("debug") === "1" || q.get("dev") === "1") return true;
    } catch (e) {
      /* ignore */
    }
    try {
      return window.localStorage.getItem("easilyStudioDebug") === "1";
    } catch (e2) {
      return false;
    }
  }

  function mountStudioDebugPanel() {
    const mount = document.getElementById("studioDebugMount");
    if (!mount || !isStudioDebugMode()) return null;
    mount.hidden = false;
    mount.removeAttribute("aria-hidden");
    mount.innerHTML =
      '<details class="editor-panel__section editor-panel__section--debug" open>' +
      '<summary class="editor-panel__section-summary">' +
      '<span class="editor-panel__section-toggle" aria-hidden="true"></span>' +
      '<span class="editor-panel__section-head">' +
      '<span class="editor-panel__section-title">Debug</span>' +
      '<span class="editor-panel__section-hint">?debug=1</span>' +
      "</span></summary>" +
      '<div class="editor-panel__section-body">' +
      '<div class="editor-panel__nested-stack">' +
      '<label class="editor-hint editor-hint--tight" for="studioApiBase">Server-URL</label>' +
      '<input type="url" class="editor-input" id="studioApiBase" autocomplete="off" />' +
      '<label class="editor-hint editor-hint--tight" for="studioApiKey">Åtkomstkod</label>' +
      '<input type="password" class="editor-input" id="studioApiKey" placeholder="Valfritt" autocomplete="off" />' +
      '<button type="button" class="editor-btn editor-btn--compact" id="studioApiPing">Testa anslutning</button>' +
      '<p class="editor-hint editor-hint--micro editor-hint--tight" id="merPanelStatus" aria-live="polite"></p>' +
      '<p class="editor-hint editor-hint--public-url editor-hint--url-break">' +
      '<span id="projectPublicUrl">—</span></p>' +
      "</div></div></details>";
    return mount;
  }

  let toastTimer = null;
  function showStudioToast(message, variant, durationMs) {
    const el = document.getElementById("studioToast");
    if (!el) return;
    el.textContent = message || "";
    el.classList.remove("studio-toast--success");
    if (variant === "success") el.classList.add("studio-toast--success");
    el.hidden = false;
    void el.offsetWidth;
    el.classList.add("is-visible");
    clearTimeout(toastTimer);
    const ms =
      durationMs != null
        ? durationMs
        : variant === "success"
          ? 3800
          : 3200;
    toastTimer = setTimeout(function () {
      el.classList.remove("is-visible");
      setTimeout(function () {
        el.hidden = true;
      }, 420);
    }, ms);
  }

  window.showStudioToast = showStudioToast;

  function getStudioOrigin() {
    let base = (window.SiteApi && window.SiteApi.getApiBase && window.SiteApi.getApiBase()) || "";
    try {
      if (!base && window.location.protocol.indexOf("http") === 0) base = window.location.origin;
    } catch (e) {
      /* ignore */
    }
    return base.replace(/\/+$/, "");
  }

  function isLocalStudioHost() {
    try {
      const host = window.location.hostname || "";
      return host === "localhost" || host === "127.0.0.1";
    } catch (e) {
      return false;
    }
  }

  function getLiveSiteUrl() {
    const slug = window.SiteState.get() && window.SiteState.get().meta && window.SiteState.get().meta.slug;
    if (!slug) return "";
    const base = getStudioOrigin();
    if (!base) return "";
    return base + "/site/" + encodeURIComponent(slug);
  }

  function getPreviewSiteUrl() {
    const id = window.SiteState.get() && window.SiteState.get().meta && window.SiteState.get().meta.siteId;
    if (!id || !isLocalStudioHost()) return "";
    const base = getStudioOrigin();
    if (!base) return "";
    return base + "/preview/" + encodeURIComponent(String(id).trim());
  }

  function getOpenSiteUrl() {
    const d = window.SiteState.get();
    const meta = d && d.meta;
    if (meta && meta.publishedRevision) {
      const live = getLiveSiteUrl();
      if (live) return live;
    }
    return getPreviewSiteUrl();
  }

  function syncPublishUi() {
    const d = window.SiteState.get();
    const meta = d && d.meta;
    const hasLive = !!(meta && meta.publishedRevision);
    const statusEl = document.getElementById("projectPublishStatus");
    const copyBtn = document.getElementById("projectCopyLiveUrlBtn");
    const viewBtn = document.getElementById("projectViewLiveBtn");
    const btnPublish = document.getElementById("projectPublishBtn");
    if (statusEl) {
      statusEl.textContent = hasLive ? "Publicerad" : "Inte publicerad";
      statusEl.classList.toggle("editor-publish-status--live", hasLive);
    }
    const openUrl = getOpenSiteUrl();
    const canOpen = !!openUrl;
    if (copyBtn) copyBtn.disabled = !canOpen;
    if (viewBtn) {
      viewBtn.disabled = !canOpen;
      viewBtn.textContent = hasLive ? "Öppna hemsidan" : "Förhandsgranska i Chrome";
    }
    if (btnPublish && !btnPublish.classList.contains("is-busy") && btnPublish.getAttribute("aria-busy") !== "true") {
      btnPublish.textContent = hasLive ? "Publicera ändringar" : "Publicera hemsidan";
    }
  }

  function updatePublicUrlHint(el, slug, publicPath) {
    if (!el) return;
    el.textContent = "";
    if (!slug) {
      el.textContent = "Ingen adress än — publicera först.";
      return;
    }
    var base = (window.SiteApi && window.SiteApi.getApiBase && window.SiteApi.getApiBase()) || "";
    try {
      if (!base && window.location.protocol.indexOf("http") === 0) base = window.location.origin;
    } catch (e2) {
      /* ignore */
    }
    if (!base) {
      el.textContent = "Ingen adress tillgänglig än.";
      return;
    }
    var path = publicPath || "/site/" + encodeURIComponent(slug);
    var url = base.replace(/\/+$/, "") + path;
    var a = document.createElement("a");
    a.href = url;
    a.textContent = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    el.appendChild(a);
  }

  /** Gör F5 stabil: alltid /editor/:id (servern tjänar samma studio.html + id), inte bara ?site= på studio.html. */
  function replaceStudioBrowserUrlForProject(id) {
    if (!id) return;
    const trimmed = String(id).trim();
    try {
      sessionStorage.setItem("studioActiveProjectId", trimmed);
    } catch (e0) {
      /* ignore */
    }
    if (window.STUDIO) window.STUDIO.siteIdFromUrl = trimmed;
    try {
      const u = new URL(window.location.href);
      const api = u.searchParams.get("api");
      u.pathname = "/editor/" + encodeURIComponent(trimmed);
      u.search = "";
      if (api) u.searchParams.set("api", api);
      window.history.replaceState({}, "", u.pathname + u.search);
    } catch (e) {
      /* ignore */
    }
    if (window.SiteState && typeof window.SiteState.rememberLastProjectId === "function") {
      window.SiteState.rememberLastProjectId(trimmed);
    }
  }

  function syncProjectUrlFromLoadedState() {
    try {
      const doc = window.SiteState && window.SiteState.get && window.SiteState.get();
      const id = doc && doc.meta && doc.meta.siteId;
      if (!id) return;
      const explicit = window.STUDIO && String(window.STUDIO.siteIdFromUrl || "").trim();
      if (explicit && explicit !== String(id).trim()) return;
      if (window.STUDIO && window.STUDIO.isEditorRoute) {
        replaceStudioBrowserUrlForProject(id);
        return;
      }
      if (explicit) {
        replaceStudioBrowserUrlForProject(id);
      }
    } catch (e) {
      /* ignore */
    }
  }

  function resetHistoryForDocument(doc) {
    const snap = doc ? JSON.parse(JSON.stringify(doc)) : window.SiteState && window.SiteState.get();
    history = snap ? [snap] : [];
    historyIndex = snap ? 0 : -1;
  }

  async function loadRemoteProjectIntoEditor(id, opts) {
    opts = opts || {};
    const data = await window.SiteApi.getProject(id);
    const p = data.project;
    let merged = window.AppDocument.normalize(p.document);
    merged.meta = merged.meta || {};
    merged.meta.siteId = p.id;
    merged.meta.slug = p.slug;
    if (data.publishedRevision != null) merged.meta.publishedRevision = data.publishedRevision;
    if (data.publishedAt) merged.meta.publishedAt = data.publishedAt;
    if (window.ProjectIsolation && typeof window.ProjectIsolation.switchToProject === "function") {
      window.ProjectIsolation.switchToProject(merged, { source: "load-remote" });
    } else {
      window.SiteState.replace(merged);
      window.SiteState.save();
      resetHistoryForDocument(merged);
    }
    remount();
    syncPanelFromDoc();
    if (window.StudioWelcome && typeof window.StudioWelcome.resumeLoadedSite === "function") {
      window.StudioWelcome.resumeLoadedSite();
    }
    if (!opts.quiet) setProjectStatus("Redo att redigeras. Spara och publicera när du vill.");
    const publicUrlEl = document.getElementById("projectPublicUrl");
    updatePublicUrlHint(publicUrlEl, p.slug);
    syncPublishUi();
    const projectSel = document.getElementById("projectListSelect");
    if (projectSel) projectSel.value = p.id;
    if (opts.updateUrl !== false) replaceStudioBrowserUrlForProject(id);
  }

  async function createNewProjectOnServer() {
    // Namnet samlas in i frågeflödet. Ett native prompt här blockerade
    // in-app-webbläsaren och gjorde att "Ny hemsida" föll tillbaka till fel.
    const name = "Ny hemsida";
    const d = window.AppDocument.createDefaultDocument();
    const res = await window.SiteApi.createProject({ name: (name || "").trim() || "Ny hemsida", document: d });
    const data = await window.SiteApi.getProject(res.id);
    const p = data.project;
    let merged = window.AppDocument.normalize(p.document);
    merged.meta = merged.meta || {};
    merged.meta.siteId = p.id;
    merged.meta.slug = p.slug;
    if (data.publishedRevision != null) merged.meta.publishedRevision = data.publishedRevision;
    if (data.publishedAt) merged.meta.publishedAt = data.publishedAt;
    if (window.ProjectIsolation && typeof window.ProjectIsolation.beginNewProject === "function") {
      window.ProjectIsolation.beginNewProject({ document: merged, source: "server-create" });
    } else {
      window.SiteState.replace(merged);
      window.SiteState.save();
      resetHistoryForDocument(merged);
    }
    syncPanelFromDoc();
    const sel = document.getElementById("projectListSelect");
    await refreshProjectList(sel);
    if (sel) sel.value = p.id;
    setProjectStatus("Ny hemsida skapad. Du betalar först när du publicerar.");
    const publicUrlEl = document.getElementById("projectPublicUrl");
    updatePublicUrlHint(publicUrlEl, p.slug);
    syncPublishUi();
    replaceStudioBrowserUrlForProject(p.id);
    if (window.StudioWelcome && typeof window.StudioWelcome.openWelcome === "function") {
      if (typeof window.StudioWelcome.enterGenerationCanvas === "function") {
        window.StudioWelcome.enterGenerationCanvas();
      }
      window.StudioWelcome.openWelcome();
    } else if (window.StudioPanelModes && typeof window.StudioPanelModes.refreshSiteChrome === "function") {
      window.StudioPanelModes.refreshSiteChrome();
    }
  }

  async function refreshProjectList(selectEl) {
    if (!selectEl || !window.SiteApi || !window.SiteApi.listProjects) return;
    if (!window.SiteApi.getApiBase()) return;
    try {
      const data = await window.SiteApi.listProjects();
      selectEl.innerHTML = "";
      const opt0 = document.createElement("option");
      opt0.value = "";
      opt0.textContent = "Välj en sparad hemsida…";
      selectEl.appendChild(opt0);
      (data.projects || []).forEach(function (p) {
        const o = document.createElement("option");
        o.value = p.id;
        o.textContent = p.name || p.slug || p.id;
        selectEl.appendChild(o);
      });
    } catch (e) {
      console.warn("Kunde inte hämta sparade hemsidor.", e);
    }
  }

  async function bindProjectBackend() {
    mountStudioDebugPanel();

    const baseInput = document.getElementById("studioApiBase");
    const keyInput = document.getElementById("studioApiKey");
    const btnPing = document.getElementById("studioApiPing");
    const sel = document.getElementById("projectListSelect");
    const btnLoad = document.getElementById("projectLoadBtn");
    const btnNew = document.getElementById("projectNewBtn");
    const btnSave = document.getElementById("projectSaveRemoteBtn");
    const btnPublish = document.getElementById("projectPublishBtn");
    const btnCopyLive = document.getElementById("projectCopyLiveUrlBtn");
    const btnViewLive = document.getElementById("projectViewLiveBtn");
    const publicUrlEl = document.getElementById("projectPublicUrl");

    if (baseInput) {
      baseInput.value = window.SiteApi.getApiBase() || "http://localhost:3847";
      if (keyInput) keyInput.value = window.SiteApi.getApiKey();
    }

    if (btnPing && baseInput) {
      btnPing.addEventListener("click", async function () {
        window.SiteApi.setApiBase(baseInput.value.trim());
        window.SiteApi.setApiKey(keyInput && keyInput.value ? keyInput.value.trim() : "");
        try {
          await window.SiteApi.request("/api/health", { method: "GET" });
          setMerStatus("Kontakten fungerar.");
          await refreshProjectList(sel);
        } catch (e) {
          setMerStatus("Kontakten misslyckades. Kontrollera adressen.");
        }
      });
    }

    btnLoad &&
      btnLoad.addEventListener("click", async function () {
        const id = sel && sel.value;
        if (!id) return;
        try {
          await loadRemoteProjectIntoEditor(id, { quiet: false });
        } catch (e) {
        setProjectStatus("Kunde inte öppna hemsidan.");
        }
      });

    btnNew &&
      btnNew.addEventListener("click", async function () {
        try {
          await createNewProjectOnServer();
        } catch (e) {
          setProjectStatus("Kunde inte skapa hemsidan.");
        }
      });

    btnSave &&
      btnSave.addEventListener("click", async function () {
        setProjectStatus("Sparar…");
        try {
          await window.SiteState.flushRemoteSave();
          setProjectStatus("Sparat. Publicera när du vill att besökare ska se ändringarna.");
        } catch (e) {
          setProjectStatus("Kunde inte spara.");
        }
      });

    btnCopyLive &&
      btnCopyLive.addEventListener("click", async function () {
        const u = getOpenSiteUrl();
        if (!u) return;
        try {
          await navigator.clipboard.writeText(u);
          showStudioToast("Länk kopierad.", "success");
        } catch (e) {
          window.prompt("Kopiera denna adress", u);
        }
      });

    btnViewLive &&
      btnViewLive.addEventListener("click", function () {
        const u = getOpenSiteUrl();
        if (u) window.open(u, "_blank", "noopener,noreferrer");
      });

    btnPublish &&
      btnPublish.addEventListener("click", async function () {
        const id = window.SiteState.get() && window.SiteState.get().meta && window.SiteState.get().meta.siteId;
        if (!id) {
          window.alert(
            "Publicera kräver att hemsidan är sparad online. Välj eller skapa en hemsida under Mina hemsidor och tryck Fortsätt redigera."
          );
          return;
        }
        btnPublish.disabled = true;
        btnPublish.classList.add("is-busy");
        btnPublish.setAttribute("aria-busy", "true");
        btnPublish.textContent = "Publicerar…";
        try {
          await window.SiteState.flushRemoteSave();
          const out = await window.SiteApi.publishProject(id);
          window.SiteState.patch(function (d) {
            if (!d.meta) d.meta = {};
            const rev = out.publishedRevision != null ? out.publishedRevision : out.revision;
            if (rev != null) d.meta.publishedRevision = rev;
            if (out.publishedAt) d.meta.publishedAt = out.publishedAt;
            if (out.slug) d.meta.slug = out.slug;
          });
          window.SiteState.save();
          remount();
          syncPanelFromDoc();
          syncPublishUi();
          const statusPulse = document.getElementById("projectPublishStatus");
          if (statusPulse) {
            statusPulse.classList.remove("editor-publish-status--pulse");
            void statusPulse.offsetWidth;
            statusPulse.classList.add("editor-publish-status--pulse");
            setTimeout(function () {
              statusPulse.classList.remove("editor-publish-status--pulse");
            }, 2000);
          }
          const slug = window.SiteState.get().meta && window.SiteState.get().meta.slug;
          updatePublicUrlHint(publicUrlEl, slug, out.publicPath || out.liveUrl);
          setProjectStatus("Publicerat.");
          requestAnimationFrame(function () {
            showStudioToast("Klart. Din hemsida är uppdaterad för besökare.", "success", 4200);
          });
        } catch (e) {
          setProjectStatus("Kunde inte publicera — försök igen om en stund.");
        } finally {
          btnPublish.disabled = false;
          btnPublish.classList.remove("is-busy");
          btnPublish.removeAttribute("aria-busy");
          syncPublishUi();
        }
      });

    if (window.SiteApi.getApiBase()) {
      await refreshProjectList(sel);
      const cur = window.SiteState.get() && window.SiteState.get().meta && window.SiteState.get().meta.siteId;
      if (cur && sel) sel.value = cur;
      if (publicUrlEl) {
        updatePublicUrlHint(
          publicUrlEl,
          window.SiteState.get() && window.SiteState.get().meta && window.SiteState.get().meta.slug
        );
      }
      syncPublishUi();
    }

    if (window.ProjectsHub && window.ProjectsHub.bind) {
      window.ProjectsHub.bind({
        loadRemoteProjectIntoEditor,
        refreshProjectList: function () {
          return refreshProjectList(sel);
        },
        setProjectStatus,
        createNewProject: createNewProjectOnServer,
      });
    }
  }

  async function init() {
    document.documentElement.classList.remove("studio-is-generating");
    const readOnlyBefore = document.body.getAttribute("data-studio-mode") === "readonly";
    try {
      if (window.SiteState.hydrateFromUrl) {
        await window.SiteState.hydrateFromUrl();
      } else {
        window.SiteState.load();
      }
      syncProjectUrlFromLoadedState();
    } catch (e) {
      console.warn("Studion: kunde inte hydrera från URL/server — laddar lokalt utkast.", e);
      try {
        window.SiteState.load();
      } catch (e2) {
        console.error("Studion: load() misslyckades", e2);
      }
    }
    const readOnly = document.body.getAttribute("data-studio-mode") === "readonly" || readOnlyBefore;

    try {
      remount();
    } catch (e) {
      console.warn("Studion: första remount misslyckades — laddar standarddokument och försöker igen.", e);
      try {
        window.SiteState.load();
        remount();
      } catch (e2) {
        console.error("Studion: remount återhämtning misslyckades", e2);
      }
    }
    history = [window.SiteState.get()];
    historyIndex = 0;

    if (!readOnly) {
      buildPaletteUI();
      buildTemplateMoodGrid();
      buildIndustrySelect();
      buildHeroLayouts();
      buildButtonStyleChoices();
      syncPanelFromDoc();

      fab?.addEventListener("click", () => (panel.classList.contains("is-open") ? closePanel() : openPanel()));
      closeBtn?.addEventListener("click", closePanel);
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && panel?.classList.contains("is-open")) closePanel();
      });

      function isTextEditingShortcutTarget(el) {
        if (!el || el.nodeType !== Node.ELEMENT_NODE) return false;
        if (el.isContentEditable || el.getAttribute("contenteditable") === "true") return true;
        const tag = el.tagName;
        if (tag === "TEXTAREA" || tag === "SELECT") return true;
        if (tag === "INPUT") {
          const type = (el.getAttribute("type") || "text").toLowerCase();
          if (
            type === "checkbox" ||
            type === "radio" ||
            type === "button" ||
            type === "submit" ||
            type === "reset" ||
            type === "file" ||
            type === "range" ||
            type === "color"
          )
            return false;
          return true;
        }
        return false;
      }

      document.addEventListener(
        "keydown",
        (e) => {
          if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "z" || e.altKey) return;
          const t = e.target;
          const a = document.activeElement;
          if (isTextEditingShortcutTarget(t) || isTextEditingShortcutTarget(a)) return;
          e.preventDefault();
          if (e.shiftKey) redo();
          else undo();
        },
        true
      );

      bindEditorPanelControls();
      bindInlineToolbar();
      bindLinkPlaceholdersOnce();
      bindPreviewHashNavigationOnce();
      bindProjectBackend();

      if (window.visualViewport) {
        window.visualViewport.addEventListener("resize", () =>
          requestAnimationFrame(syncEditorPanelToViewport)
        );
        window.visualViewport.addEventListener("scroll", () =>
          requestAnimationFrame(syncEditorPanelToViewport)
        );
      }

      syncPublishUi();

      if (window.ProjectsHub && window.STUDIO && window.STUDIO.openProjectsFromUrl) {
        window.ProjectsHub.openDialog();
        try {
          const u = new URL(window.location.href);
          if (u.searchParams.get("projects") === "1") {
            u.searchParams.delete("projects");
            window.history.replaceState({}, "", u.pathname + (u.searchParams.toString() ? "?" + u.searchParams.toString() : ""));
          }
        } catch (eRm) {
          /* ignore */
        }
      }

      window.EditorEngine = {
        undo,
        redo,
        canUndo,
        canRedo,
        remount,
        remountAsync,
        remountAsyncForced,
        cancelPendingRemounts,
        syncHeroFromState,
        applyHeroPhotoToDom,
        syncVisibilityFromState,
        syncProjectUrl: replaceStudioBrowserUrlForProject,
        pushHistory,
        resetHistoryForDocument,
        mountLeftPanelAppearance,
        mountLeftPanelPalette,
        mountLeftPanelTypography,
      };

      window.AIActions.bind(() => {
        pushHistory();
        window.SiteState.save();
      });

      document.addEventListener(
        "input",
        (e) => {
          if (e.target?.getAttribute?.("contenteditable") === "true") persistSoon();
        },
        true
      );

      queueMicrotask(function () {
        document.dispatchEvent(new CustomEvent("studio:ready", { detail: { readOnly: false } }));
      });
    } else {
      if (fab) fab.style.display = "none";
      if (panel) {
        panel.hidden = true;
        panel.style.display = "none";
      }
      if (inlineToolbar) inlineToolbar.hidden = true;

      window.EditorEngine = {
        undo,
        redo,
        canUndo,
        canRedo,
        remount,
        remountAsync,
        remountAsyncForced,
        cancelPendingRemounts,
        syncHeroFromState,
        applyHeroPhotoToDom,
        syncVisibilityFromState,
        syncProjectUrl: replaceStudioBrowserUrlForProject,
        pushHistory,
        resetHistoryForDocument,
        mountLeftPanelAppearance,
        mountLeftPanelPalette,
        mountLeftPanelTypography,
      };
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      init().catch(function (e) {
        console.error(e);
      });
    });
  } else {
    init().catch(function (e) {
      console.error(e);
    });
  }
})();
