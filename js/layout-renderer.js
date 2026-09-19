/**
 * LayoutRenderer — generativ render-väg (fas 1). CD create only.
 * Egen hero-HTML; övriga sektioner via RenderEngine tills fler varianter finns.
 */
(function (global) {
  "use strict";

  function cssUrl(raw) {
    return String(raw || "")
      .trim()
      .replace(/\\/g, "\\\\")
      .replace(/'/g, "\\'");
  }

  function renderImmersiveHero(page, sec, RE) {
    const esc = RE.esc;
    const c = (sec && sec.content) || {};
    const bg = cssUrl(page.heroBgUrl || "");
    const bgStyle = bg ? ' style="--gen-hero-bg: url(\'' + bg + '\')"' : "";
    const splitClass =
      page.layoutSpec && page.layoutSpec.heroVariant === "immersive-split" ? " gen-hero--split" : "";
    return (
      '<section class="gen-hero gen-hero--immersive' +
      splitClass +
      '" id="top" data-section="hero"' +
      bgStyle +
      '>\n' +
      '  <div class="gen-hero__overlay" aria-hidden="true"></div>\n' +
      '  <div class="gen-hero__content">\n' +
      '    <h1 class="gen-hero__title" contenteditable="true" spellcheck="true" data-placeholder="Er huvudrubrik" data-editable="hero-title" data-ai="hero-title">' +
      esc(c["hero-title"]) +
      "</h1>\n" +
      '    <p class="gen-hero__lead" contenteditable="true" spellcheck="true" data-placeholder="Kort intro" data-editable="hero-lead" data-ai="hero-lead">' +
      esc(c["hero-lead"]) +
      "</p>\n" +
      '    <div class="gen-hero__cta">\n' +
      '      <a class="gen-btn gen-btn--primary" href="#kontakt" data-href-key="hero-cta-1-href"><span contenteditable="true" spellcheck="true" data-editable="hero-cta-1-text" data-ai="cta">' +
      esc(c["hero-cta-1-text"]) +
      "</span></a>\n" +
      '      <a class="gen-btn gen-btn--ghost" href="#tjanster" data-href-key="hero-cta-2-href"><span contenteditable="true" spellcheck="true" data-editable="hero-cta-2-text" data-ai="cta">' +
      esc(c["hero-cta-2-text"]) +
      "</span></a>\n" +
      "    </div>\n" +
      "  </div>\n" +
      "</section>"
    );
  }

  /**
   * @returns {boolean} true om generativ mount kördes
   */
  function mount(doc, mainEl, footerEl) {
    const RE = global.RenderEngine;
    if (!RE || !mainEl || !doc || !doc.page) return false;
    if (doc.page.layoutEngine !== "generative") return false;

    const page = doc.page;
    const sections = doc.sections || {};
    const defaultOrder = ["hero", "about", "services", "gallery", "faq", "booking", "contact"];
    let order = (page.sectionOrder || []).filter(function (id) {
      return id !== "footer";
    });
    if (!order.length) order = defaultOrder.slice();

    mainEl.classList.add("gen-site");
    mainEl.dataset.layoutEngine = "generative";
    if (page.layoutSpec && page.layoutSpec.profile) {
      mainEl.dataset.genProfile = page.layoutSpec.profile;
    }

    const brandBar = typeof RE.renderSiteBrandBar === "function" ? RE.renderSiteBrandBar(doc) : "";
    const html = order
      .map(function (id) {
        const sec = sections[id];
        if (!sec) return "";
        if (id === "hero") {
          return renderImmersiveHero(page, sec, RE);
        }
        const fn = RE.RENDERERS && RE.RENDERERS[id];
        return fn ? fn(page, sec) : "";
      })
      .filter(Boolean)
      .join("\n");

    mainEl.innerHTML = (brandBar ? brandBar + "\n" : "") + html;

    if (footerEl && typeof RE.mountSection === "function") {
      RE.mountSection("footer", mainEl, footerEl, doc);
    }
    return true;
  }

  global.LayoutRenderer = {
    mount: mount,
  };
})(typeof window !== "undefined" ? window : globalThis);
