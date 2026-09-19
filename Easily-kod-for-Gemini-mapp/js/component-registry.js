/**
 * Component Registry — öppet register (site-blueprint.md §2).
 * Uppslag: global registry → blueprint.componentDefinitions → fail.
 */
(function (global) {
  "use strict";

  const registry = new Map();

  function esc(v) {
    return String(v == null ? "" : v)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function cssUrl(raw) {
    return String(raw || "")
      .trim()
      .replace(/\\/g, "\\\\")
      .replace(/'/g, "\\'");
  }

  function mediaUrl(media) {
    if (!media) return "";
    if (Array.isArray(media) && media.length) return String(media[0].url || "").trim();
    if (typeof media === "object") return String(media.url || "").trim();
    return "";
  }

  /** Direkt bild-URL — canonical + unwrap proxy; referrerpolicy på img. */
  function resolveDisplayUrl(raw) {
    let u = String(raw || "").trim();
    if (!u) return "";
    const HIU = global.HeroImageUrl;
    if (HIU && typeof HIU.unwrapProxy === "function") {
      u = HIU.unwrapProxy(u) || u;
    }
    if (HIU && typeof HIU.canonical === "function") {
      u = HIU.canonical(u) || u;
    }
    if (!/^https?:\/\//i.test(u) && !u.startsWith("data:") && !u.startsWith("/assets/generated/")) return "";
    return u.replace(/"/g, "%22");
  }

  function renderImg(url, alt, opts) {
    opts = opts || {};
    const src = resolveDisplayUrl(url);
    if (!src) return "";
    let attrs =
      ' src="' +
      esc(src) +
      '" alt="' +
      esc(alt || "") +
      '" decoding="async" referrerpolicy="no-referrer"';
    if (opts.priority) attrs += ' fetchpriority="high"';
    else attrs += ' loading="lazy"';
    return "<img" + attrs + " />";
  }

  function renderActions(actions, escFn) {
    escFn = escFn || esc;
    return (actions || [])
      .map(function (a) {
        if (!a || !a.label) return "";
        const cls = a.emphasis === "primary" ? "gen-btn gen-btn--primary" : "gen-btn gen-btn--ghost";
        const href = escFn(a.href || "#");
        return (
          '<a class="' +
          cls +
          '" href="' +
          href +
          '"><span>' +
          escFn(a.label) +
          "</span></a>"
        );
      })
      .filter(Boolean)
      .join("\n");
  }

  const RENDER_MODULES = {
    "hero/immersive-fullbleed": function (node, ctx) {
      const c = node.content || {};
      const bg = resolveDisplayUrl(mediaUrl(c.media));
      const anchor = c.anchor ? ' id="' + esc(c.anchor) + '"' : ' id="top"';
      const photoHtml = bg
        ? '  <img class="gen-hero__photo" src="' +
          esc(bg) +
          '" alt="" decoding="async" fetchpriority="high" referrerpolicy="no-referrer" />\n'
        : "";
      return (
        '<section class="gen-hero gen-hero--immersive" data-section="hero" data-bp-type="hero" data-bp-id="' +
        esc(node.id) +
        '"' +
        anchor +
        '>\n' +
        photoHtml +
        '  <div class="gen-hero__overlay" aria-hidden="true"></div>\n' +
        '  <div class="gen-hero__content">\n' +
        '    <h1 class="gen-hero__title" contenteditable="true" spellcheck="true" data-editable="hero-title">' +
        esc(c.headline) +
        "</h1>\n" +
        '    <p class="gen-hero__lead" contenteditable="true" spellcheck="true" data-editable="hero-lead">' +
        esc(c.lead) +
        "</p>\n" +
        '    <div class="gen-hero__cta">' +
        renderActions(c.actions) +
        "</div>\n" +
        "  </div>\n" +
        "</section>"
      );
    },
    "hero/text-minimal": function (node) {
      const c = node.content || {};
      const anchor = c.anchor ? ' id="' + esc(c.anchor) + '"' : ' id="top"';
      return (
        '<section class="gen-hero gen-hero--text" data-section="hero" data-bp-type="hero" data-bp-id="' +
        esc(node.id) +
        '"' +
        anchor +
        '>\n' +
        '  <div class="gen-hero__content gen-hero__content--text">\n' +
        '    <h1 class="gen-hero__title" contenteditable="true" data-editable="hero-title">' +
        esc(c.headline) +
        "</h1>\n" +
        '    <p class="gen-hero__lead" contenteditable="true" data-editable="hero-lead">' +
        esc(c.lead) +
        "</p>\n" +
        '    <div class="gen-hero__cta">' +
        renderActions(c.actions) +
        "</div>\n" +
        "  </div>\n" +
        "</section>"
      );
    },
    "brand-header/inline-nav": function (node, ctx) {
      const c = node.content || {};
      const links = c.links || [];
      const linkHtml = links
        .map(function (lnk) {
          return (
            '<a class="gen-nav__link" href="' +
            esc(lnk.href || "#") +
            '">' +
            esc(lnk.label) +
            "</a>"
          );
        })
        .join("");
      return (
        '<header class="gen-brand" data-bp-type="brand-header" data-bp-id="' +
        esc(node.id) +
        '">\n' +
        '  <div class="gen-brand__inner">\n' +
        '    <a class="gen-brand__name" href="#top">' +
        esc(c.brandName || (ctx && ctx.businessName) || "") +
        "</a>\n" +
        (linkHtml ? '    <nav class="gen-nav" aria-label="Sidnavigering">' + linkHtml + "</nav>\n" : "") +
        "  </div>\n" +
        "</header>"
      );
    },
    "content-block/prose-with-media": function (node) {
      const c = node.content || {};
      const img = mediaUrl(c.media);
      const anchor = c.anchor ? ' id="' + esc(c.anchor) + '"' : "";
      const bodies = (c.body || [])
        .map(function (p) {
          return '<p class="gen-prose__p">' + esc(p) + "</p>";
        })
        .join("");
      return (
        '<section class="gen-block gen-block--prose-media" data-bp-type="content-block" data-bp-id="' +
        esc(node.id) +
        '"' +
        anchor +
        '>\n' +
        '  <div class="gen-block__inner">\n' +
        (img
          ? '    <figure class="gen-block__media">' + renderImg(img, c.mediaAlt || c.headline || "") + "</figure>\n"
          : "") +
        '    <div class="gen-block__text">\n' +
        '      <h2 class="gen-block__title">' +
        esc(c.headline) +
        "</h2>\n" +
        (c.lead ? '      <p class="gen-block__lead">' + esc(c.lead) + "</p>\n" : "") +
        bodies +
        "    </div>\n" +
        "  </div>\n" +
        "</section>"
      );
    },
    "content-block/prose-only": function (node) {
      const c = node.content || {};
      const anchor = c.anchor ? ' id="' + esc(c.anchor) + '"' : "";
      const bodies = (c.body || [])
        .map(function (p) {
          return '<p class="gen-prose__p">' + esc(p) + "</p>";
        })
        .join("");
      return (
        '<section class="gen-block gen-block--prose" data-bp-type="content-block" data-bp-id="' +
        esc(node.id) +
        '"' +
        anchor +
        '>\n' +
        '  <div class="gen-block__inner gen-block__inner--narrow">\n' +
        '    <h2 class="gen-block__title">' +
        esc(c.headline) +
        "</h2>\n" +
        (c.lead ? '    <p class="gen-block__lead">' + esc(c.lead) + "</p>\n" : "") +
        bodies +
        "  </div>\n" +
        "</section>"
      );
    },
    "content-block/media-overlap": function (node) {
      return RENDER_MODULES["content-block/prose-with-media"](node)
        .replace("gen-block--prose-media", "gen-block--prose-media gen-block--media-overlap");
    },
    "card-grid/three-up": function (node) {
      return renderCardGrid(node, 3);
    },
    "card-grid/two-up": function (node) {
      return renderCardGrid(node, 2);
    },
    "card-grid/highlight-asymmetric": function (node) {
      return renderCardGrid(node, 3)
        .replace("gen-cards gen-cards--3", "gen-cards gen-cards--3 gen-cards--highlight");
    },
    "product-grid/four-up": function (node) {
      return renderProductGrid(node, 4);
    },
    "product-grid/three-up": function (node) {
      return renderProductGrid(node, 3);
    },
    "trust-strip/inline": function (node) {
      const c = node.content || {};
      const anchor = c.anchor ? ' id="' + esc(c.anchor) + '"' : "";
      const items = (c.items || [])
        .map(function (item) {
          return (
            '<div class="gen-trust__item">\n' +
            '  <span class="gen-trust__label">' +
            esc(item.label) +
            "</span>\n" +
            (item.detail ? '  <span class="gen-trust__detail">' + esc(item.detail) + "</span>\n" : "") +
            "</div>"
          );
        })
        .join("");
      return (
        '<section class="gen-trust" data-bp-type="trust-strip" data-bp-id="' +
        esc(node.id) +
        '"' +
        anchor +
        '>\n' +
        '  <div class="gen-trust__inner">' +
        items +
        "</div>\n" +
        "</section>"
      );
    },
    "featured-banner/split": function (node) {
      const c = node.content || {};
      const img = mediaUrl(c.media);
      const anchor = c.anchor ? ' id="' + esc(c.anchor) + '"' : "";
      const bodies = (c.body || [])
        .map(function (p) {
          return '<p class="gen-prose__p">' + esc(p) + "</p>";
        })
        .join("");
      return (
        '<section class="gen-featured" data-bp-type="featured-banner" data-bp-id="' +
        esc(node.id) +
        '"' +
        anchor +
        '>\n' +
        '  <div class="gen-featured__inner">\n' +
        (img
          ? '    <figure class="gen-featured__media">' + renderImg(img, c.headline || "") + "</figure>\n"
          : "") +
        '    <div class="gen-featured__text">\n' +
        '      <h2 class="gen-block__title">' +
        esc(c.headline) +
        "</h2>\n" +
        (c.lead ? '      <p class="gen-block__lead">' + esc(c.lead) + "</p>\n" : "") +
        bodies +
        (c.actions && c.actions.length
          ? '      <div class="gen-hero__cta">' + renderActions(c.actions) + "</div>\n"
          : "") +
        "    </div>\n" +
        "  </div>\n" +
        "</section>"
      );
    },
    "featured-banner/layered": function (node) {
      return RENDER_MODULES["featured-banner/split"](node)
        .replace("gen-featured\"", "gen-featured gen-featured--layered\"");
    },
    "category-showcase/row": function (node) {
      const c = node.content || {};
      const anchor = c.anchor ? ' id="' + esc(c.anchor) + '"' : "";
      const tiles = (c.categories || [])
        .map(function (cat) {
          const img = mediaUrl(cat.media);
          return (
            '<article class="gen-category">\n' +
            (img ? '  <div class="gen-category__media">' + renderImg(img, cat.title || "") + "</div>\n" : "") +
            '  <h3 class="gen-category__title">' +
            esc(cat.title) +
            "</h3>\n" +
            '  <p class="gen-category__body">' +
            esc(cat.body) +
            "</p>\n" +
            (cat.action && cat.action.label
              ? '  <a class="gen-category__link" href="' +
                esc(cat.action.href || "#") +
                '">' +
                esc(cat.action.label) +
                "</a>\n"
              : "") +
            "</article>"
          );
        })
        .join("");
      return (
        '<section class="gen-categories" data-bp-type="category-showcase" data-bp-id="' +
        esc(node.id) +
        '"' +
        anchor +
        '>\n' +
        '  <div class="gen-block__inner">\n' +
        (c.headline ? '    <h2 class="gen-block__title">' + esc(c.headline) + "</h2>\n" : "") +
        (c.lead ? '    <p class="gen-block__lead">' + esc(c.lead) + "</p>\n" : "") +
        '    <div class="gen-categories__row">' +
        tiles +
        "</div>\n" +
        "  </div>\n" +
        "</section>"
      );
    },
    "category-showcase/feature-mosaic": function (node) {
      return RENDER_MODULES["category-showcase/row"](node)
        .replace("gen-categories\"", "gen-categories gen-categories--mosaic\"");
    },
    "testimonial-strip/simple": function (node) {
      const c = node.content || {};
      const anchor = c.anchor ? ' id="' + esc(c.anchor) + '"' : "";
      const items = (c.items || [])
        .map(function (item) {
          return (
            '<blockquote class="gen-testimonial">\n' +
            '  <p class="gen-testimonial__quote">"' +
            esc(item.quote) +
            '"</p>\n' +
            (item.author ? '  <cite class="gen-testimonial__author">' + esc(item.author) + "</cite>\n" : "") +
            "</blockquote>"
          );
        })
        .join("");
      return (
        '<section class="gen-testimonials" data-bp-type="testimonial-strip" data-bp-id="' +
        esc(node.id) +
        '"' +
        anchor +
        '>\n' +
        '  <div class="gen-block__inner">\n' +
        (c.headline ? '    <h2 class="gen-block__title">' + esc(c.headline) + "</h2>\n" : "") +
        '    <div class="gen-testimonials__grid">' +
        items +
        "</div>\n" +
        "  </div>\n" +
        "</section>"
      );
    },
    "media-gallery/masonry": function (node) {
      const c = node.content || {};
      const anchor = c.anchor ? ' id="' + esc(c.anchor) + '"' : "";
      const items = (c.items || [])
        .map(function (item) {
          const url = mediaUrl(item.media || item);
          if (!url) return "";
          return (
            '<figure class="gen-gallery__item">' + renderImg(url, item.alt || "") + "</figure>"
          );
        })
        .join("");
      return (
        '<section class="gen-gallery" data-bp-type="media-gallery" data-bp-id="' +
        esc(node.id) +
        '"' +
        anchor +
        '>\n' +
        '  <div class="gen-block__inner">\n' +
        (c.headline ? '    <h2 class="gen-block__title">' + esc(c.headline) + "</h2>\n" : "") +
        (c.lead ? '    <p class="gen-block__lead">' + esc(c.lead) + "</p>\n" : "") +
        '    <div class="gen-gallery__grid">' +
        items +
        "</div>\n" +
        "  </div>\n" +
        "</section>"
      );
    },
    "media-gallery/grid-tight": function (node) {
      const html = RENDER_MODULES["media-gallery/masonry"](node);
      return html.replace("gen-gallery__grid", "gen-gallery__grid gen-gallery__grid--tight");
    },
    "media-gallery/full-bleed-collage": function (node) {
      return RENDER_MODULES["media-gallery/masonry"](node)
        .replace("gen-gallery\"", "gen-gallery gen-gallery--fullbleed\"")
        .replace("gen-gallery__grid", "gen-gallery__grid gen-gallery__grid--collage");
    },
    "faq-list/accordion": function (node) {
      const c = node.content || {};
      const anchor = c.anchor ? ' id="' + esc(c.anchor) + '"' : "";
      const items = (c.items || [])
        .map(function (item) {
          return (
            '<details class="gen-faq__item">\n' +
            "  <summary>" +
            esc(item.question) +
            "</summary>\n" +
            "  <p>" +
            esc(item.answer) +
            "</p>\n" +
            "</details>"
          );
        })
        .join("");
      return (
        '<section class="gen-faq" data-bp-type="faq-list" data-bp-id="' +
        esc(node.id) +
        '"' +
        anchor +
        '>\n' +
        '  <div class="gen-block__inner gen-block__inner--narrow">\n' +
        (c.headline ? '    <h2 class="gen-block__title">' + esc(c.headline) + "</h2>\n" : "") +
        items +
        "  </div>\n" +
        "</section>"
      );
    },
    "contact-block/simple": function (node) {
      const c = node.content || {};
      const anchor = c.anchor ? ' id="' + esc(c.anchor) + '"' : ' id="kontakt"';
      return (
        '<section class="gen-contact" data-bp-type="contact-block" data-bp-id="' +
        esc(node.id) +
        '"' +
        anchor +
        '>\n' +
        '  <div class="gen-block__inner gen-block__inner--narrow">\n' +
        '    <h2 class="gen-block__title">' +
        esc(c.headline) +
        "</h2>\n" +
        '    <p class="gen-block__lead">' +
        esc(c.lead) +
        "</p>\n" +
        (c.body && c.body.length ? '    <p class="gen-contact__body">' + esc(c.body[0]) + "</p>\n" : "") +
        (c.actions && c.actions.length
          ? '    <div class="gen-hero__cta">' + renderActions(c.actions) + "</div>\n"
          : "") +
        "  </div>\n" +
        "</section>"
      );
    },
    "cta-band/centered": function (node) {
      const c = node.content || {};
      const anchor = c.anchor ? ' id="' + esc(c.anchor) + '"' : "";
      return (
        '<section class="gen-cta-band" data-bp-type="cta-band" data-bp-id="' +
        esc(node.id) +
        '"' +
        anchor +
        '>\n' +
        '  <div class="gen-block__inner gen-block__inner--narrow gen-cta-band__inner">\n' +
        '    <h2 class="gen-block__title">' +
        esc(c.headline) +
        "</h2>\n" +
        '    <p class="gen-block__lead">' +
        esc(c.lead) +
        "</p>\n" +
        '    <div class="gen-hero__cta gen-hero__cta--center">' +
        renderActions(c.actions) +
        "</div>\n" +
        "  </div>\n" +
        "</section>"
      );
    },
    "footer/minimal": function (node, ctx) {
      const c = node.content || {};
      return (
        '<footer class="gen-footer" data-bp-type="footer" data-bp-id="' +
        esc(node.id) +
        '">\n' +
        '  <div class="gen-footer__inner">\n' +
        '    <span class="gen-footer__brand">' +
        esc(c.brandName || (ctx && ctx.businessName) || "") +
        "</span>\n" +
        (c.tagline ? '    <span class="gen-footer__tagline">' + esc(c.tagline) + "</span>\n" : "") +
        "  </div>\n" +
        "</footer>"
      );
    },
    "footer/editorial": function (node, ctx) {
      const c = node.content || {};
      const links = (c.links || []).map(function (link) {
        return '<a class="gen-footer__link" href="' + esc(link.href || "#") + '">' + esc(link.label) + "</a>";
      }).join("");
      const bodies = (c.body || []).map(function (body) {
        return '<p class="gen-footer__body">' + esc(body) + "</p>";
      }).join("");
      return (
        '<footer class="gen-footer gen-footer--editorial" data-bp-type="footer" data-bp-id="' + esc(node.id) + '">\n' +
        '  <div class="gen-footer__inner gen-footer__inner--editorial">\n' +
        '    <div class="gen-footer__statement"><p class="gen-footer__eyebrow">' + esc(c.brandName || (ctx && ctx.businessName) || "") + '</p><h2 class="gen-footer__headline">' + esc(c.headline || c.tagline || "") + "</h2>" + bodies + "</div>\n" +
        (links ? '    <nav class="gen-footer__links" aria-label="Sidfotsnavigering">' + links + "</nav>\n" : "") +
        (c.actions && c.actions.length ? '    <div class="gen-footer__action">' + renderActions(c.actions) + "</div>\n" : "") +
        "  </div>\n</footer>"
      );
    },
    "footer/split": function (node, ctx) {
      const c = node.content || {};
      const links = (c.links || []).map(function (link) {
        return '<a class="gen-footer__link" href="' + esc(link.href || "#") + '">' + esc(link.label) + "</a>";
      }).join("");
      return (
        '<footer class="gen-footer gen-footer--split" data-bp-type="footer" data-bp-id="' + esc(node.id) + '">\n' +
        '  <div class="gen-footer__inner gen-footer__inner--split">\n' +
        '    <div><span class="gen-footer__brand">' + esc(c.brandName || (ctx && ctx.businessName) || "") + '</span><p class="gen-footer__tagline">' + esc(c.lead || c.tagline || "") + "</p></div>\n" +
        '    <div class="gen-footer__side">' + (links ? '<nav class="gen-footer__links" aria-label="Sidfotsnavigering">' + links + "</nav>" : "") + (c.actions && c.actions.length ? '<div class="gen-footer__action">' + renderActions(c.actions) + "</div>" : "") + "</div>\n" +
        "  </div>\n</footer>"
      );
    },
  };

  function renderProductGrid(node, cols) {
    const c = node.content || {};
    const anchor = c.anchor ? ' id="' + esc(c.anchor) + '"' : "";
    const products = (c.products || [])
      .map(function (product) {
        const img = mediaUrl(product.media);
        return (
          '<article class="gen-product">\n' +
          (img ? '  <div class="gen-product__media">' + renderImg(img, product.title || "") + "</div>\n" : "") +
          (product.badge
            ? '  <span class="gen-product__badge">' + esc(product.badge) + "</span>\n"
            : "") +
          '  <h3 class="gen-product__title">' +
          esc(product.title) +
          "</h3>\n" +
          '  <p class="gen-product__body">' +
          esc(product.body) +
          "</p>\n" +
          (product.priceHint
            ? '  <p class="gen-product__price">' + esc(product.priceHint) + "</p>\n"
            : "") +
          (product.action && product.action.label
            ? '  <a class="gen-product__btn gen-btn gen-btn--primary" href="' +
              esc(product.action.href || "#") +
              '"><span>' +
              esc(product.action.label) +
              "</span></a>\n"
            : "") +
          "</article>"
        );
      })
      .join("");
    return (
      '<section class="gen-products gen-products--' +
      cols +
      '" data-bp-type="product-grid" data-bp-id="' +
      esc(node.id) +
      '"' +
      anchor +
      '>\n' +
      '  <div class="gen-block__inner">\n' +
      (c.headline ? '    <h2 class="gen-block__title">' + esc(c.headline) + "</h2>\n" : "") +
      (c.lead ? '    <p class="gen-block__lead">' + esc(c.lead) + "</p>\n" : "") +
      '    <div class="gen-products__grid">' +
      products +
      "</div>\n" +
      "  </div>\n" +
      "</section>"
    );
  }

  function renderCardGrid(node, cols) {
    const c = node.content || {};
    const anchor = c.anchor ? ' id="' + esc(c.anchor) + '"' : "";
    const cards = (c.cards || [])
      .map(function (card) {
        const img = mediaUrl(card.media);
        return (
          '<article class="gen-card">\n' +
          (img ? '  <div class="gen-card__media">' + renderImg(img, card.title || "") + "</div>\n" : "") +
          '  <h3 class="gen-card__title">' +
          esc(card.title) +
          "</h3>\n" +
          '  <p class="gen-card__body">' +
          esc(card.body) +
          "</p>\n" +
          (card.action && card.action.label
            ? '  <a class="gen-card__link" href="' +
              esc(card.action.href || "#") +
              '">' +
              esc(card.action.label) +
              "</a>\n"
            : "") +
          "</article>"
        );
      })
      .join("");
    return (
      '<section class="gen-cards gen-cards--' +
      cols +
      '" data-bp-type="card-grid" data-bp-id="' +
      esc(node.id) +
      '"' +
      anchor +
      '>\n' +
      '  <div class="gen-block__inner">\n' +
      (c.headline ? '    <h2 class="gen-block__title">' + esc(c.headline) + "</h2>\n" : "") +
      (c.lead ? '    <p class="gen-block__lead">' + esc(c.lead) + "</p>\n" : "") +
      '    <div class="gen-cards__grid">' +
      cards +
      "</div>\n" +
      "  </div>\n" +
      "</section>"
    );
  }

  function register(definition) {
    if (!definition || !definition.type) return false;
    registry.set(String(definition.type), definition);
    return true;
  }

  /**
   * @param {string} type
   * @param {object|null} embeddedDefs map type → definition from blueprint
   */
  function resolve(type, embeddedDefs) {
    const t = String(type || "").trim();
    if (!t) return null;
    if (embeddedDefs && embeddedDefs[t]) return embeddedDefs[t];
    return registry.get(t) || null;
  }

  function listByCapability(capability) {
    const cap = String(capability || "").trim();
    if (!cap) return [];
    const out = [];
    registry.forEach(function (def) {
      if (Array.isArray(def.capabilities) && def.capabilities.indexOf(cap) >= 0) {
        out.push(def);
      }
    });
    return out;
  }

  function renderNode(node, ctx, embeddedDefs) {
    if (!node || !node.type) return { ok: false, error: "missing_node" };
    const def = resolve(node.type, embeddedDefs);
    if (!def) return { ok: false, error: "unknown_type:" + node.type };
    const variantDef = def.variants && def.variants[node.variant];
    if (!variantDef) return { ok: false, error: "unknown_variant:" + node.type + "/" + node.variant };
    const renderKey = variantDef.render;
    const fn = RENDER_MODULES[renderKey];
    if (!fn) return { ok: false, error: "missing_render_module:" + renderKey };
    return { ok: true, html: fn(node, ctx) };
  }

  function registerBuiltins() {
    const builtins = [
      {
        type: "hero",
        version: "1.0",
        label: "Hero",
        intent: "Första intryck och primär budskap",
        capabilities: ["headline", "lead", "actions", "media"],
        variants: {
          "immersive-fullbleed": { render: "hero/immersive-fullbleed" },
          "text-minimal": { render: "hero/text-minimal" },
        },
      },
      {
        type: "brand-header",
        version: "1.0",
        label: "Brand Header",
        intent: "Varumärke och sidnavigering",
        capabilities: ["navigation", "brand"],
        variants: {
          "inline-nav": { render: "brand-header/inline-nav" },
        },
      },
      {
        type: "content-block",
        version: "1.0",
        label: "Content Block",
        intent: "Text och media i block",
        capabilities: ["headline", "body", "media"],
        variants: {
          "prose-with-media": { render: "content-block/prose-with-media" },
          "prose-only": { render: "content-block/prose-only" },
          "media-overlap": { render: "content-block/media-overlap" },
        },
      },
      {
        type: "card-grid",
        version: "1.0",
        label: "Card Grid",
        intent: "Flera erbjudanden eller tjänster i kort",
        capabilities: ["headline", "cards", "actions"],
        variants: {
          "three-up": { render: "card-grid/three-up" },
          "two-up": { render: "card-grid/two-up" },
          "highlight-asymmetric": { render: "card-grid/highlight-asymmetric" },
        },
      },
      {
        type: "product-grid",
        version: "1.0",
        label: "Product Grid",
        intent: "Produktkatalog med pris och köpkänsla",
        capabilities: ["headline", "products", "media", "actions"],
        variants: {
          "four-up": { render: "product-grid/four-up" },
          "three-up": { render: "product-grid/three-up" },
        },
      },
      {
        type: "trust-strip",
        version: "1.0",
        label: "Trust Strip",
        intent: "Förtroendesignaler i rad",
        capabilities: ["items"],
        variants: {
          inline: { render: "trust-strip/inline" },
        },
      },
      {
        type: "featured-banner",
        version: "1.0",
        label: "Featured Banner",
        intent: "Utvalt erbjudande eller kampanj",
        capabilities: ["headline", "body", "media", "actions"],
        variants: {
          split: { render: "featured-banner/split" },
          layered: { render: "featured-banner/layered" },
        },
      },
      {
        type: "category-showcase",
        version: "1.0",
        label: "Category Showcase",
        intent: "Sortimentsingångar i rad",
        capabilities: ["headline", "categories", "media"],
        variants: {
          row: { render: "category-showcase/row" },
          "feature-mosaic": { render: "category-showcase/feature-mosaic" },
        },
      },
      {
        type: "testimonial-strip",
        version: "1.0",
        label: "Testimonial Strip",
        intent: "Kundcitat och social proof",
        capabilities: ["headline", "items"],
        variants: {
          simple: { render: "testimonial-strip/simple" },
        },
      },
      {
        type: "media-gallery",
        version: "1.0",
        label: "Media Gallery",
        intent: "Bildgalleri",
        capabilities: ["headline", "media"],
        variants: {
          masonry: { render: "media-gallery/masonry" },
          "grid-tight": { render: "media-gallery/grid-tight" },
          "full-bleed-collage": { render: "media-gallery/full-bleed-collage" },
        },
      },
      {
        type: "faq-list",
        version: "1.0",
        label: "FAQ List",
        intent: "Vanliga frågor",
        capabilities: ["headline", "faq"],
        variants: {
          accordion: { render: "faq-list/accordion" },
        },
      },
      {
        type: "contact-block",
        version: "1.0",
        label: "Contact Block",
        intent: "Kontakt och nästa steg",
        capabilities: ["headline", "lead", "actions"],
        variants: {
          simple: { render: "contact-block/simple" },
        },
      },
      {
        type: "cta-band",
        version: "1.0",
        label: "CTA Band",
        intent: "Uppmaning till handling",
        capabilities: ["headline", "actions"],
        variants: {
          centered: { render: "cta-band/centered" },
        },
      },
      {
        type: "footer",
        version: "1.0",
        label: "Footer",
        intent: "Sidfot",
        capabilities: ["brand"],
        variants: {
          minimal: { render: "footer/minimal" },
          editorial: { render: "footer/editorial" },
          split: { render: "footer/split" },
        },
      },
    ];
    builtins.forEach(register);
  }

  registerBuiltins();

  global.ComponentRegistry = {
    register: register,
    resolve: resolve,
    listByCapability: listByCapability,
    renderNode: renderNode,
    RENDER_MODULES: RENDER_MODULES,
  };
})(typeof window !== "undefined" ? window : globalThis);
