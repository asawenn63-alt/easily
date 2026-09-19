/**
 * Liten SVG-förhandsbild (skickas med save) — samma temakarta som serverns fallback.
 */
(function (global) {
  "use strict";

  const THEME = {
    "minimal-white": { bg: "#ffffff", fg: "#1c1917", accent: "#3f3f3c" },
    "beige-lux": { bg: "#f8f7f3", fg: "#3a3228", accent: "#9a7224" },
    "black-gold": { bg: "#0a0a0a", fg: "#f5e6c8", accent: "#d4af37" },
    "modern-green": { bg: "#f7f8f5", fg: "#1e2620", accent: "#4f6644" },
    "blue-professional": { bg: "#f8fafc", fg: "#0f172a", accent: "#2563eb" },
    terracotta: { bg: "#f8f7f4", fg: "#2a1e1c", accent: "#6e4338" },
  };

  function esc(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  function buildSvg(doc) {
    if (!doc || !doc.page) return "";
    const familyId = doc.page.designFamily || (global.DesignFamilies && global.DesignFamilies.inferFromLegacy(doc.page));
    const theme = doc.page.theme || "minimal-white";
    const colors = doc.page.designColors;
    const c = colors
      ? { bg: colors.bg, fg: colors.text, accent: colors.accent }
      : THEME[theme] || THEME["minimal-white"];
    const hero = doc.sections && doc.sections.hero && doc.sections.hero.content;
    const rawTitle = (hero && hero["hero-title"]) || "Sajt";
    const name = (doc.meta && doc.meta.slug) || "";
    const gid = "g" + ((Math.random() * 1e9) | 0).toString(36);
    const heroBg = String(doc.page.heroBgUrl || "").trim();
    const heroImg =
      heroBg && /^https?:\/\//i.test(heroBg)
        ? `<image href="${esc(heroBg)}" x="0" y="0" width="320" height="200" preserveAspectRatio="xMidYMid slice"/>`
        : "";
    return (
      `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200" viewBox="0 0 320 200">` +
      `<defs><linearGradient id="${gid}" x1="0%" y1="0%" x2="100%" y2="100%">` +
      `<stop offset="0%" style="stop-color:${c.bg};stop-opacity:1"/>` +
      `<stop offset="100%" style="stop-color:${c.accent};stop-opacity:0.28"/>` +
      `</linearGradient></defs>` +
      (heroImg || `<rect width="320" height="200" fill="url(#${gid})"/>`) +
      `<rect width="320" height="200" fill="${c.bg}" fill-opacity="${heroImg ? "0.42" : "0.9"}"/>` +
      `<text x="24" y="44" fill="${c.accent}" font-family="system-ui,sans-serif" font-size="11" font-weight="600">Webb</text>` +
      `<text x="24" y="118" fill="${c.fg}" font-family="Georgia,serif" font-size="22">${esc(rawTitle.slice(0, 72))}</text>` +
      `<text x="24" y="168" fill="${c.fg}" fill-opacity="0.5" font-family="system-ui,sans-serif" font-size="12">${esc(
        String(name).slice(0, 48)
      )}</text>` +
      `</svg>`
    );
  }

  function stripEditorChrome(root) {
    if (!root) return;
    root.querySelectorAll("[contenteditable]").forEach(function (el) {
      el.removeAttribute("contenteditable");
      el.removeAttribute("spellcheck");
    });
    root.querySelectorAll(
      ".section-edit, .hero-image-tools, .editable-image__toolbar, .section-drag, .section-ai-ribbon, .card-intent-select, .img-upload"
    ).forEach(function (el) {
      el.remove();
    });
    root.querySelectorAll("[draggable]").forEach(function (el) {
      el.removeAttribute("draggable");
    });
  }

  /** Skala ned och visa riktig sajt i projektkort (Mina hemsidor). */
  function mountLivePreview(host, doc) {
    if (!host || !doc || !doc.page || !global.RenderEngine || typeof global.RenderEngine.mount !== "function") {
      return false;
    }
    host.innerHTML = "";
    host.classList.add("is-ready");

    const shell = document.createElement("div");
    shell.className = "studio-project-card__live-shell";
    shell.setAttribute("data-design-family", familyId || "salon");
    shell.setAttribute("data-theme", doc.page.theme || "minimal-white");
    shell.setAttribute("data-template", doc.page.template || "editorial");
    shell.setAttribute("data-industry", doc.page.industry || "konsult");
    shell.setAttribute("data-section-spacing", doc.page.sectionSpacing || "2");
    if (doc.page.fontPair) shell.setAttribute("data-font-pair", doc.page.fontPair);
    if (doc.page.buttonStyle && doc.page.buttonStyle !== "solid") {
      shell.setAttribute("data-button-style", doc.page.buttonStyle);
    }

    const main = document.createElement("main");
    main.className = "site-main";
    shell.appendChild(main);
    host.appendChild(shell);

    try {
      global.RenderEngine.mount(doc, main, null);
      stripEditorChrome(main);
    } catch (e) {
      host.classList.remove("is-ready");
      return false;
    }
    return true;
  }

  global.ProjectThumbnail = { buildSvg, mountLivePreview, stripEditorChrome };
})(typeof window !== "undefined" ? window : globalThis);
