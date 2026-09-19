/**

 * Tillfällig logotyp — initialer + företagsnamn tills användaren laddar upp egen under Bilder & länkar.

 */

(function (global) {

  "use strict";



  function esc(s) {

    return String(s || "")

      .replace(/&/g, "&amp;")

      .replace(/</g, "&lt;")

      .replace(/>/g, "&gt;")

      .replace(/"/g, "&quot;");

  }



  function initials(brand) {

    const parts = String(brand || "")

      .trim()

      .split(/\s+/)

      .filter(Boolean);

    if (!parts.length) return "";

    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();

  }



  /**

   * @param {object} doc

   * @param {{ inStudio?: boolean }} opts

   * @returns {string}

   */

  function render(doc, opts) {

    opts = opts || {};

    if (!doc || !doc.page) return "";

    const page = doc.page;

    const style = String(page.textLogoStyle || "classic").trim() || "classic";

    const brandRaw = (doc.sections && doc.sections.footer && doc.sections.footer.content && doc.sections.footer.content["footer-brand"]) || "";

    const split =

      global.AppDocument && typeof global.AppDocument.splitBrandAndLocation === "function"

        ? global.AppDocument.splitBrandAndLocation(brandRaw, page.location || "")

        : { brand: String(brandRaw).trim(), location: String(page.location || "").trim() };

    const subline = String(page.textLogoSubline || page.textLogoTagline || split.location || "").trim();

    const name = split.brand || "";

    const inStudio = !!opts.inStudio;

    const init = initials(name);



    const nameAttrs = inStudio

      ? ' contenteditable="true" spellcheck="true" data-editable="footer-brand" data-placeholder="Företagsnamn"'

      : "";

    const cityAttrs = inStudio

      ? ' contenteditable="true" spellcheck="true" data-editable="text-logo-subline" data-placeholder="Ort eller tagline"'

      : "";



    const hint = inStudio

      ? '<p class="site-industry-logo__hint">Tillfällig logotyp med dina initialer. Du kan när som helst ladda upp din egen under Bilder &amp; länkar.</p>'

      : "";



    const initialsHtml = init

      ? '<span class="site-industry-logo__initials" aria-hidden="true">' + esc(init) + "</span>"

      : '<span class="site-industry-logo__initials site-industry-logo__initials--empty" aria-hidden="true">?</span>';



    return (

      '<div class="site-industry-logo-block' +

      (inStudio ? " site-industry-logo-block--studio" : "") +

      '">' +

      '<div class="site-industry-logo site-industry-logo--style-' +

      esc(style) +

      '"' +

      (inStudio ? ' data-industry-logo="1"' : "") +

      ' role="img" aria-label="' +

      esc(name || init || "Logotyp") +

      '">' +

      '<span class="site-industry-logo__mark">' +

      initialsHtml +

      "</span>" +

      '<div class="site-industry-logo__text">' +

      '<span class="site-industry-logo__name"' +

      nameAttrs +

      ">" +

      (name ? esc(name) : "") +

      "</span>" +

      (subline || inStudio

        ? '<span class="site-industry-logo__sub"' + cityAttrs + ">" + (subline ? esc(subline) : "") + "</span>"

        : "") +

      "</div>" +

      "</div>" +

      hint +

      "</div>"

    );

  }



  function shouldUse(doc) {

    if (!doc || !doc.page) return false;

    if (doc.page.textLogoAuto === false) return false;

    const logoUrl = String(doc.page.logoUrl || (doc.page.material && doc.page.material.logoUrl) || "").trim();

    if (global.AppDocument && typeof global.AppDocument.isRealLogoUrl === "function") {

      return !global.AppDocument.isRealLogoUrl(logoUrl);

    }

    return !logoUrl;

  }



  global.IndustryLogo = {

    render: render,

    shouldUse: shouldUse,

    initials: initials,

  };

})(typeof window !== "undefined" ? window : globalThis);


