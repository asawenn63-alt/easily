/**
 * RenderEngine — DOM från AppDocument (data-section, data-editable, data-ai).
 */
(function (global) {
  "use strict";

  function esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function isCdRenderPage(page) {
    const CDG = global.CreateCdGate;
    if (CDG && typeof CDG.isCdRenderPage === "function") {
      return CDG.isCdRenderPage(page);
    }
    return !!(page && (page.createPath === "cd" || page.cdDesignLocked || page.cdImagesLocked));
  }

  function heroIndustryAttr(page) {
    if (isCdRenderPage(page)) return "";
    return String((page && page.industry) || "verksamhet");
  }

  /** URL i CSS url('…') — HTML-escape förstör query-strängar (& → &amp;). */
  function cssUrl(raw) {
    return String(raw ?? "")
      .trim()
      .replace(/\\/g, "\\\\")
      .replace(/'/g, "\\'");
  }

  function rhythmSectionAttrs(sec) {
    const r = sec && sec.rhythm;
    if (!r) return { extraClass: "", extraAttrs: "" };
    const classes = ["rhythm--i" + (r.intensity || 3)];
    if (r.preset) classes.push("rhythm--" + r.preset);
    const attrs = [
      'data-rhythm-intensity="' + esc(String(r.intensity || 3)) + '"',
      'data-rhythm-spacing="' + esc(r.spacing || "normal") + '"',
      'data-rhythm-contrast="' + esc(r.contrast || "medium") + '"',
      'data-rhythm-image="' + esc(r.imageScale || "medium") + '"',
      'data-rhythm-text="' + esc(r.textDensity || "moderate") + '"',
      'data-rhythm-cta="' + esc(r.ctaStrength || "normal") + '"',
      'data-rhythm-bg="' + esc(r.background || "default") + '"',
    ];
    if (r.purpose) attrs.push('data-rhythm-purpose="' + esc(r.purpose) + '"');
    return { extraClass: " " + classes.join(" "), extraAttrs: " " + attrs.join(" ") };
  }

  function rhythmBlockAttrs(block) {
    const r = block && block.rhythm;
    if (!r) return { extraClass: "", extraAttrs: "" };
    const classes = ["rhythm--i" + (r.intensity || 3)];
    if (r.preset) classes.push("rhythm--" + r.preset);
    const attrs = [
      'data-rhythm-intensity="' + esc(String(r.intensity || 3)) + '"',
      'data-rhythm-spacing="' + esc(r.spacing || "normal") + '"',
      'data-rhythm-bg="' + esc(r.background || "default") + '"',
      'data-rhythm-cta="' + esc(r.ctaStrength || "normal") + '"',
    ];
    if (r.purpose) attrs.push('data-rhythm-purpose="' + esc(r.purpose) + '"');
    return { extraClass: " " + classes.join(" "), extraAttrs: " " + attrs.join(" ") };
  }

  /** CD Create: layout endast från cd-composition (page.cdLayoutKeys) — aldrig SCE. */
  function cdSectionLayoutAttr(page, sectionId) {
    const keys = page && page.cdLayoutKeys;
    if (keys && keys[sectionId]) {
      return String(keys[sectionId]);
    }
    return "";
  }

  function sectionLayoutAttr(page, sec, sectionId) {
    if (isCdRenderPage(page)) {
      return cdSectionLayoutAttr(page, sectionId);
    }
    const SCE = global.SiteCompositionEngine;
    if (SCE && typeof SCE.resolveSectionLayout === "function") {
      return SCE.resolveSectionLayout(sectionId, page, sec);
    }
    return "classic";
  }

  function footerLayoutAttr(page) {
    const SCE = global.SiteCompositionEngine;
    if (SCE && typeof SCE.resolveFooterLayout === "function") {
      return SCE.resolveFooterLayout(page);
    }
    return "classic";
  }

  function containerClass(sec, fallback) {
    fallback = fallback || "container";
    const w = sec && sec.containerWidth;
    if (w === "narrow") return "container container--narrow";
    return fallback;
  }

  function heroStructureKey(page) {
    if (page && page.heroStructure) return page.heroStructure;
    const SCE = global.SiteCompositionEngine;
    if (SCE && typeof SCE.resolveHeroStructureKey === "function") {
      return SCE.resolveHeroStructureKey(page);
    }
    return "legacy";
  }

  function hasHeroPhoto(page) {
    const u = String((page && page.heroBgUrl) || "").trim();
    return !!u && !/^none$/i.test(u);
  }

  function safeImgSrc(raw) {
    const HIU = global.HeroImageUrl;
    let u = String(raw ?? "").trim();
    if (HIU && typeof HIU.canonical === "function") {
      u = HIU.canonical(u) || u;
    }
    if (!/^https?:\/\//i.test(u) && !u.startsWith("data:")) return "";
    return String(u).replace(/"/g, "%22");
  }

  /** Href i attribut — blockar javascript:/data:. */
  function escHref(s) {
    const u = String(s ?? "").trim();
    if (!u || u === "#") return "#";
    const lower = u.toLowerCase();
    if (lower.startsWith("javascript:") || lower.startsWith("data:")) return "#";
    return esc(u);
  }

  function sectionDomId(page, sectionKey, fallback) {
    const anchors = page && page.sectionAnchors;
    if (anchors && anchors[sectionKey]) {
      return String(anchors[sectionKey]).replace(/^#+/, "") || fallback;
    }
    return fallback;
  }

  function renderHighlightBadges(items, opts) {
    opts = opts || {};
    const list = (items || []).filter(function (item) {
      return item && String(item.label || "").trim();
    });
    if (!list.length) return "";

    const mode = opts.mode || "inline";
    const ed = showEditorChrome();
    const tag = mode === "float" ? "div" : "ul";
    const itemTag = mode === "float" ? "div" : "li";
    const wrapClass =
      mode === "float"
        ? "hero__highlights"
        : opts.wrapClass || "section-highlights";
    const itemClass =
      mode === "float"
        ? "hero-highlight-badge hero-highlight-badge--"
        : "highlight-badge highlight-badge--";

    const inner = list
      .map(function (item, i) {
        const placement = item.placement || "";
        const posClass = mode === "float" && placement ? itemClass + esc(placement) : itemClass + "inline";
        const editAttrs = ed
          ? ` contenteditable="true" spellcheck="true" data-editable="highlight-${opts.section || "section"}-${i}-label" data-ai="highlights"`
          : "";
        return `<${itemTag} class="${posClass.trim()}" data-highlight-index="${i}">
      <span class="highlight-badge__icon" aria-hidden="true">${esc(item.icon || "✔")}</span>
      <span class="highlight-badge__label"${editAttrs}>${esc(item.label || "")}</span>
    </${itemTag}>`;
      })
      .join("\n    ");

    return `<${tag} class="${wrapClass}" data-highlight-mode="${esc(mode)}" aria-label="Höjdpunkter">
    ${inner}
  </${tag}>`;
  }

  function inStudioEditor() {
    try {
      return (
        typeof document !== "undefined" &&
        document.body &&
        document.body.getAttribute("data-studio-mode") !== "readonly"
      );
    } catch (e) {
      return false;
    }
  }

  /** Chat-edit model: preview renders clean (no toolbars/menus on the page). */
  function showEditorChrome() {
    return false;
  }

  function sectionDragBlock() {
    return "";
  }

  function sectionEditBar(id, page, sec) {
    return "";
  }

  /** Sann konfiguration (inte tom / inte bara #). */
  function isConfiguredSiteHref(href) {
    const u = String(href ?? "").trim();
    if (!u || u === "#") return false;
    const lower = u.toLowerCase();
    if (lower.startsWith("javascript:") || lower.startsWith("data:")) return false;
    if (/^https?:\/\//i.test(u)) return true;
    if (/^mailto:/i.test(u)) return true;
    if (/^tel:/i.test(u)) return true;
    if (u.startsWith("#") && u.length > 1) {
      const frag = decodeURIComponent(u.slice(1).split("?")[0]);
      return /^[a-z][\w-]*$/i.test(frag);
    }
    return false;
  }

  /**
   * Redigeringsläge: visa verklig href (kan vara svag).
   * Live: svaga länkar ersätts med säker ankare så inget känns trasigt.
   */
  function safeHref(raw, opts) {
    opts = opts || {};
    const editor = opts.editor !== undefined ? opts.editor : inStudioEditor();
    const fallback = opts.fallback || "#kontakt";
    const u = String(raw ?? "").trim();
    if (editor) {
      return { href: escHref(u), configured: isConfiguredSiteHref(u) };
    }
    if (isConfiguredSiteHref(u)) return { href: escHref(u), configured: true };
    return { href: escHref(fallback), configured: false };
  }

  function linkTargetClass(configured) {
    return configured ? "link-target--ready" : "link-target--open";
  }

  function hiddenAttr(hidden) {
    return hidden ? ' data-hidden="true"' : "";
  }

  function renderSiteBrandBar(doc) {
    if (!doc || !doc.sections || !doc.sections.footer) return "";
    const page = doc.page || {};
    const brandRaw = (doc.sections.footer.content && doc.sections.footer.content["footer-brand"]) || "";
    const split =
      global.AppDocument && typeof global.AppDocument.splitBrandAndLocation === "function"
        ? global.AppDocument.splitBrandAndLocation(brandRaw, page.location || "")
        : { brand: String(brandRaw).trim(), location: String(page.location || "").trim() };
    const logoUrlRaw = String(page.logoUrl || (page.material && page.material.logoUrl) || "").trim();
    const logoUrl =
      global.AppDocument && typeof global.AppDocument.isRealLogoUrl === "function"
        ? global.AppDocument.isRealLogoUrl(logoUrlRaw)
          ? logoUrlRaw
          : ""
        : logoUrlRaw;
    const logoAlignRaw = page.logoAlign || (page.material && page.material.logoAlign) || "center";
    const logoAlign =
      logoAlignRaw === "left" || logoAlignRaw === "right" ? logoAlignRaw : "center";
    const textLogoStyleRaw = String(page.textLogoStyle || "classic").trim() || "classic";
    const textLogoStyle = /^(craftsman|legal|playful|creative|classic)$/.test(textLogoStyleRaw)
      ? textLogoStyleRaw
      : "classic";
    const subline =
      String(page.textLogoSubline || page.textLogoTagline || split.location || "").trim();
    const inStudio =
      typeof document !== "undefined" &&
      document.body &&
      document.body.getAttribute("data-studio-mode") !== "readonly";
    if (!split.brand && !split.location && !logoUrl && !inStudio) return "";
    const display = split.brand || split.location || "";
    const logoBlock = logoUrl
      ? `<img class="site-public-header__logo" src="${esc(logoUrl)}" alt="${esc(display || "Logotyp")}" width="120" height="40" decoding="async" />`
      : "";
    let brandBlock = "";
    if (!logoUrl) {
      const cdRender = isCdRenderPage(page);
      if (!cdRender && global.IndustryLogo && typeof global.IndustryLogo.shouldUse === "function" && global.IndustryLogo.shouldUse(doc)) {
        brandBlock = global.IndustryLogo.render(doc, { inStudio: inStudio });
      } else {
        const nameHtml = split.brand ? esc(split.brand) : "";
        const cityHtml = subline ? esc(subline) : "";
        const nameAttrs = inStudio
          ? ` contenteditable="true" spellcheck="true" data-editable="footer-brand" data-placeholder="Företagsnamn"`
          : "";
        const cityAttrs = inStudio
          ? ` contenteditable="true" spellcheck="true" data-editable="text-logo-subline" data-placeholder="Ort eller tagline"`
          : "";
        brandBlock = `<div class="site-public-header__text-logo"${inStudio ? ' data-text-logo="1"' : ""}>
    <span class="site-public-header__text-logo-name"${nameAttrs}>${nameHtml}</span>${
          subline || inStudio
            ? `\n    <span class="site-public-header__text-logo-city"${cityAttrs}>${cityHtml}</span>`
            : ""
        }
  </div>`;
        if (inStudio && !cdRender) {
          brandBlock +=
            '\n    <p class="site-public-header__text-logo-hint">Tillfällig logotyp skapad utifrån din bransch. Du kan när som helst ladda upp din egen under Bilder & länkar.</p>';
        }
      }
    }
    const logoModeClass = logoUrl
      ? " site-public-header--has-logo"
      : global.IndustryLogo && global.IndustryLogo.shouldUse(doc)
        ? " site-public-header--industry-logo site-public-header--text-logo-style-" + textLogoStyle
        : " site-public-header--text-logo site-public-header--text-logo-style-" + textLogoStyle;
    const navPattern = String(page.navPattern || "inline-left").trim() || "inline-left";
    const navPatternClass =
      navPattern === "stacked-center"
        ? " site-public-header--nav-stacked"
        : navPattern === "shop-inline"
          ? " site-public-header--nav-shop"
          : "";
    const navItems = page.navigation && page.navigation.length ? page.navigation : [];
    const navHtml =
      navItems.length > 1
        ? `<nav class="site-public-header__nav" aria-label="Webbplatsnavigation">${navItems
            .map(function (item) {
              const href = escHref(item.href || "#top");
              return `<a class="site-public-header__nav-link" href="${href}">${esc(item.label || "")}</a>`;
            })
            .join("")}</nav>`
        : "";
    return `<header class="site-public-header site-public-header--align-${logoAlign}${logoModeClass}${navPatternClass}${subline ? " site-public-header--has-city" : ""}${navHtml ? " site-public-header--has-nav" : ""}" role="banner">
  <div class="container site-public-header__inner">
    ${logoBlock}
    ${brandBlock}
    ${navHtml}
  </div>
</header>`;
  }

  /** Hero «Boka tid» → bokningssektion om länk finns, annars kontakt/e-post. */
  function resolveHeroPrimaryHref(page, c) {
    const raw = String((c && c["hero-cta-1-href"]) || "").trim();
    if (/^https?:\/\//i.test(raw) || /^mailto:/i.test(raw) || /^tel:/i.test(raw)) return raw;
    const hash = raw.startsWith("#") ? raw : raw ? "#" + raw.replace(/^#+/, "") : "#kontakt";
    if (hash === "#bokning" || hash === "#meny") {
      const pres = bookingPresentation(page);
      if (pres.mode === "iframe" || pres.mode === "link") return hash;
      return "#kontakt";
    }
    return hash || "#kontakt";
  }

  /** SCE: hero-HTML-struktur från page.heroStructure (SCE beslutar, Render visar). */
  function buildHeroRenderContext(page, sec) {
    const c = sec.content || {};
    const layout = page.heroLayout || "center";
    const structureKey = heroStructureKey(page);
    const sceStructure = structureKey !== "legacy";
    const locked = !!page.compositionLocked;
    const highlightMode = locked ? page.highlightMode || "minimal" : "";
    const bg = cssUrl(page.heroBgUrl || "");
    const ed = showEditorChrome();
    const cta1 = safeHref(resolveHeroPrimaryHref(page, c), { editor: ed, fallback: "#kontakt" });
    const cta2 = safeHref(c["hero-cta-2-href"], { editor: ed, fallback: "#tjanster" });
    const lc1 = linkTargetClass(cta1.configured);
    const lc2 = linkTargetClass(cta2.configured);
    const href1Raw = String(c["hero-cta-1-href"] || "").trim();
    let cta1ProviderClass = "";
    let cta1Target = "";
    if (!ed && cta1.configured && /^https?:\/\//i.test(href1Raw)) {
      cta1Target = " target=\"_blank\" rel=\"noopener noreferrer\"";
      const bookingNorm = normalizeBookingUrl(page.bookingUrl);
      if (bookingNorm && normalizeBookingUrl(href1Raw) === bookingNorm) {
        cta1ProviderClass = detectBookingProvider(bookingNorm).btnClass || "";
      }
    }
    const heroBgDrop = ed ? " data-hero-bg-drop" : "";
    const heroImageTools = ed
      ? `<div class="hero-image-tools">
    <label class="hero-image-tools__btn hero-image-tools__upload">
      <input type="file" accept="image/*" class="img-upload__input" data-hero-bg-input="1" aria-label="Byt bakgrundsbild" />
      Byt bild
    </label>
    <button type="button" class="hero-image-tools__btn hero-image-tools__ai" data-ai-image-suggest="hero" title="Föreslå ny bakgrundsbild">✦ Förslag</button>
  </div>`
      : "";
    const hasPhoto = hasHeroPhoto(page);
    const heroPhotoImg = hasPhoto
      ? `<img class="hero__photo" src="${safeImgSrc(page.heroBgUrl)}" alt="" decoding="async" fetchpriority="high" referrerpolicy="no-referrer" />`
      : "";
    const heroDecor =
      sec.heroDecor && sec.heroDecor.enabled
        ? `<div class="hero__decor hero__decor--${esc(sec.heroDecor.position || "overlay-br")}" aria-hidden="true"></div>`
        : "";
    const heroHighlightsFloat =
      (highlightMode === "float" || (!locked && sec.highlights && sec.highlights.length)) &&
      structureKey !== "editorial"
        ? renderHighlightBadges(sec.highlights, { mode: "float", section: "hero" })
        : "";
    const heroHighlightsInline =
      structureKey === "editorial" &&
      ((locked && highlightMode && highlightMode !== "minimal") ||
        (!locked && sec.highlights && sec.highlights.length))
        ? renderHighlightBadges(sec.highlights, {
            mode: "inline",
            section: "hero",
            wrapClass: "hero__highlights hero__highlights--inline section-highlights",
          })
        : "";
    const rhythm = rhythmSectionAttrs(sec);
    const layoutAttr = sectionLayoutAttr(page, sec, "hero");
    const highlightClass = heroHighlightsFloat && structureKey !== "editorial" ? " hero--has-highlights" : "";
    const sceClass = sceStructure ? " hero--sce-structure" : "";

    const titleHtml = `<h1 class="hero__title" contenteditable="true" spellcheck="true" data-placeholder="Er huvudrubrik — konkret och inbjudande" data-editable="hero-title" data-ai="hero-title">${esc(c["hero-title"])}</h1>`;
    const leadHtml = `<p class="hero__lead" contenteditable="true" spellcheck="true" data-placeholder="Två–tre meningar: vad ni gör, för vem och vad kunden får ut av att välja er." data-editable="hero-lead" data-ai="hero-lead">${esc(c["hero-lead"])}</p>`;
    const ctaHtml = `<div class="hero__cta">
      <a class="btn btn--primary ${lc1} ${cta1ProviderClass}" href="${cta1.href}" data-href-key="hero-cta-1-href"${cta1Target} title="${ed && !cta1.configured ? "Sätt länk — klicka utanför texten eller följ prompt" : ""}"><span contenteditable="true" spellcheck="true" data-editable="hero-cta-1-text" data-ai="cta">${esc(c["hero-cta-1-text"])}</span></a>
      <a class="btn btn--ghost ${lc2}" href="${cta2.href}" data-href-key="hero-cta-2-href" title="${ed && !cta2.configured ? "Sätt länk — klicka utanför texten eller följ prompt" : ""}"><span contenteditable="true" spellcheck="true" data-editable="hero-cta-2-text" data-ai="cta">${esc(c["hero-cta-2-text"])}</span></a>
    </div>`;

    return {
      page,
      sec,
      layout,
      structureKey,
      sceStructure,
      bg,
      ed,
      heroBgDrop,
      heroImageTools,
      heroPhotoImg,
      heroDecor,
      heroHighlightsFloat,
      heroHighlightsInline,
      rhythm,
      layoutAttr,
      highlightClass,
      sceClass,
      titleHtml,
      leadHtml,
      ctaHtml,
      hasPhoto,
    };
  }

  function heroSectionOpen(ctx) {
    return `<section class="site-section site-section--hero hero-layout--${esc(ctx.layout)}${ctx.highlightClass}${ctx.sceClass}${ctx.rhythm.extraClass}"
  data-section="hero" data-layout="${esc(ctx.layoutAttr)}" data-industry="${esc(heroIndustryAttr(ctx.page))}" data-section-label="Startsida" data-template="${esc(ctx.page.template || "")}" data-style="${esc(ctx.sec.dataStyle || "")}"${ctx.rhythm.extraAttrs}
  draggable="true" id="top"${hiddenAttr(!!ctx.sec.hidden)}>
  ${sectionDragBlock()}
  ${sectionEditBar("hero", ctx.page, ctx.sec)}`;
  }

  function heroSectionClose() {
    return `</section>`;
  }

  function renderHeroLegacy(ctx) {
    return `${heroSectionOpen(ctx)}
  <div class="hero__bg" id="heroBg"${ctx.heroBgDrop} style="--hero-bg-image: url('${ctx.bg}')">${ctx.heroPhotoImg}</div>
  <div class="hero__overlay"></div>
  ${ctx.heroDecor}
  ${ctx.heroHighlightsFloat}
  ${ctx.heroImageTools}
  <div class="hero__inner container">
    ${ctx.titleHtml}
    ${ctx.leadHtml}
    ${ctx.ctaHtml}
  </div>
${heroSectionClose()}`;
  }

  function renderHeroCenterSce(ctx) {
    return `${heroSectionOpen(ctx)}
  <div class="hero__bg" id="heroBg"${ctx.heroBgDrop} style="--hero-bg-image: url('${ctx.bg}')">${ctx.heroPhotoImg}</div>
  <div class="hero__overlay"></div>
  ${ctx.heroDecor}
  ${ctx.heroHighlightsFloat}
  ${ctx.heroImageTools}
  <div class="hero__inner container">
    <div class="hero__stack">
      ${ctx.titleHtml}
      ${ctx.leadHtml}
      ${ctx.ctaHtml}
    </div>
  </div>
${heroSectionClose()}`;
  }

  function renderHeroLeftSce(ctx) {
    return `${heroSectionOpen(ctx)}
  <div class="hero__bg" id="heroBg"${ctx.heroBgDrop} style="--hero-bg-image: url('${ctx.bg}')">${ctx.heroPhotoImg}</div>
  <div class="hero__overlay"></div>
  ${ctx.heroDecor}
  ${ctx.heroHighlightsFloat}
  ${ctx.heroImageTools}
  <div class="hero__inner container hero__inner--align-left">
    <div class="hero__copy">
      ${ctx.titleHtml}
      ${ctx.leadHtml}
      ${ctx.ctaHtml}
    </div>
  </div>
${heroSectionClose()}`;
  }

  function renderHeroSplitSce(ctx) {
    const mediaInner = ctx.heroPhotoImg || `<div class="hero__media-placeholder" aria-hidden="true"></div>`;
    return `${heroSectionOpen(ctx)}
  <div class="hero__bg hero__bg--mood" style="--hero-bg-image: url('${ctx.bg}')"></div>
  <div class="hero__overlay hero__overlay--split"></div>
  ${ctx.heroDecor}
  ${ctx.heroHighlightsFloat}
  ${ctx.heroImageTools}
  <div class="hero__inner container hero__inner--split">
    <div class="hero__copy">
      ${ctx.titleHtml}
      ${ctx.leadHtml}
      ${ctx.ctaHtml}
    </div>
    <aside class="hero__media" id="heroBg"${ctx.heroBgDrop} aria-label="Hero-bild">${mediaInner}</aside>
  </div>
${heroSectionClose()}`;
  }

  function renderHeroEditorialSce(ctx) {
    const asideHtml = ctx.heroHighlightsInline
      ? `<footer class="hero__aside">${ctx.heroHighlightsInline}</footer>`
      : "";
    return `${heroSectionOpen(ctx)}
  <div class="hero__bg" id="heroBg"${ctx.heroBgDrop} style="--hero-bg-image: url('${ctx.bg}')">${ctx.heroPhotoImg}</div>
  <div class="hero__overlay"></div>
  ${ctx.heroDecor}
  ${ctx.heroImageTools}
  <div class="hero__inner container hero__inner--editorial">
    <header class="hero__intro">${ctx.titleHtml}</header>
    <div class="hero__body">
      ${ctx.leadHtml}
      ${ctx.ctaHtml}
    </div>
    ${asideHtml}
  </div>
${heroSectionClose()}`;
  }

  function renderHero(page, sec) {
    const ctx = buildHeroRenderContext(page, sec);
    switch (ctx.structureKey) {
      case "split":
        return renderHeroSplitSce(ctx);
      case "left":
        return renderHeroLeftSce(ctx);
      case "editorial":
        return renderHeroEditorialSce(ctx);
      case "center":
        return renderHeroCenterSce(ctx);
      default:
        return renderHeroLegacy(ctx);
    }
  }

  function renderAbout(page, sec) {
    const c = sec.content || {};
    const asym = sec.dataStyle === "asymmetric" ? " about--asymmetric" : "";
    const img = esc(sec.imageUrl || "");
    const ed = showEditorChrome();
    const aboutFig = ed
      ? `<figure class="about__figure editable-image" data-editable-image>
      <label class="editable-image__hit" aria-label="Byt bild — klicka eller dra bild hit">
        <input type="file" accept="image/*" class="img-upload__input" data-replace-img />
        <img src="${img}" alt="" width="800" height="900" loading="lazy" class="about__img" data-upload-target />
      </label>
      <div class="editable-image__toolbar">
        <button type="button" class="editable-image__btn editable-image__btn--upload" data-trigger-upload title="Välj bild från din enhet">Byt bild</button>
        <button type="button" class="editable-image__btn editable-image__btn--ai" data-ai-image-suggest="about" title="Föreslå ny bild">✦ Förslag</button>
      </div>
    </figure>`
      : `<figure class="about__figure">
      <img src="${img}" alt="" width="800" height="900" loading="lazy" class="about__img" />
    </figure>`;
    const aboutHighlights = renderHighlightBadges(sec.highlights, {
      mode: "inline",
      section: "about",
      wrapClass: "about__highlights section-highlights",
    });
    const rhythm = rhythmSectionAttrs(sec);
    return `<section class="site-section site-section--about${rhythm.extraClass}" data-section="about" data-layout="${esc(sectionLayoutAttr(page, sec, "about"))}" data-section-label="Om oss" data-template="${esc(page.template || "")}" data-style="${esc(sec.dataStyle || "")}"${rhythm.extraAttrs}
  draggable="true" id="om-oss"${hiddenAttr(!!sec.hidden)}>
  ${sectionDragBlock()}
  ${sectionEditBar("about", page, sec)}
  <div class="container about${asym}">
    <div class="about__grid">
      <div class="about__text">
        <h2 class="section-title" contenteditable="true" data-editable="about-title" data-ai="about-title">${esc(c["about-title"])}</h2>
        ${aboutHighlights}
        <p class="about__p" contenteditable="true" spellcheck="true" data-placeholder="Första stycket om ert företag eller er metod." data-editable="about-p1" data-ai="about-body">${esc(c["about-p1"])}</p>
        <p class="about__p" contenteditable="true" spellcheck="true" data-placeholder="Andra stycket — till exempel värderingar, arbetsätt eller vad ni erbjuder härnäst." data-editable="about-p2" data-ai="about-body">${esc(c["about-p2"])}</p>
      </div>
      ${aboutFig}
    </div>
  </div>
</section>`;
  }

  function cardIntentSelect(cardIndex, currentIntent) {
    const ci = currentIntent || "services";
    const opts = [
      ["services", "Tjänst"],
      ["pricing", "Pris"],
      ["faq", "Fråga"],
      ["packages", "Paket"],
      ["process", "Steg"],
      ["testimonials", "Omdöme"],
    ];
    const options = opts
      .map(([v, l]) => `<option value="${v}"${v === ci ? " selected" : ""}>${l}</option>`)
      .join("");
    return `<select class="card-intent-select" data-card-intent-select data-card-index="${cardIndex}" aria-label="Typ av förslag" title="Olika typer hjälper AI skriva rätt ton för det här kortet">${options}</select>`;
  }

  /** Standard länkmål per korttyp om användaren inte satt en egen. */
  function defaultCardCtaHref(intent) {
    const i = String(intent || "services").trim();
    switch (i) {
      case "pricing":
        return "#priser";
      case "faq":
        return "#fragor";
      case "packages":
        return "#tjanster";
      case "process":
        return "#kontakt";
      case "testimonials":
        return "#om-oss";
      default:
        return "#tjanster";
    }
  }

  function renderServiceSubpages(cards, ed) {
    const blocks = cards
      .map(function (card, i) {
        const detail = String(card.detail ?? "").trim();
        if (!detail) return "";
        const anchor = "tjanst-kort-" + (i + 1);
        const title = String(card.title ?? "").trim();
        const img = String(card.img ?? "").trim();
        const imgBlock = img
          ? `<figure class="service-subpage__figure">
        <img class="service-subpage__img" src="${esc(img)}" alt="" loading="lazy" />
      </figure>`
          : "";
        const backLink = `<a class="service-subpage__back" href="#tjanster">← Tillbaka till tjänster</a>`;
        const titleBlock = title
          ? `<h3 class="service-subpage__title"${ed ? ` contenteditable="true" spellcheck="true" data-editable="card-${i}-title" data-ai="services"` : ""}>${esc(title)}</h3>`
          : "";
        return `<article class="service-subpage" id="${anchor}" data-section="services" data-card-index="${i}" data-section-label="${esc(title || "Undersida")}">
      ${backLink}
      <div class="service-subpage__inner">
        ${imgBlock}
        ${titleBlock}
        <div class="service-subpage__body"${ed ? ` contenteditable="true" spellcheck="true" data-editable="card-${i}-detail" data-ai="services"` : ""}>${esc(detail)}</div>
      </div>
    </article>`;
      })
      .filter(Boolean)
      .join("");
    if (!blocks) return "";
    return `<div class="service-subpages${ed ? " service-subpages--edit" : ""}">${blocks}</div>`;
  }

  function normalizeServiceCardIcon(raw) {
    return "";
  }

  function normalizeServiceCardTitle(raw) {
    return String(raw ?? "")
      .trim()
      .replace(/^\d+\.\s+/, "")
      .replace(/^["«""]+|["»""]+$/g, "");
  }

  function resolveCardImage(card, page, index) {
    const raw = String(card?.img ?? "").trim();
    if (raw) return raw;
    if (page && (page.cdImagesLocked || isCdRenderPage(page))) return "";
    try {
      const VS = global.VisualStock;
      if (VS && typeof VS.defaultsFor === "function") {
        const d = VS.defaultsFor(page.industry || "konsult", page.template || "editorial");
        if (d.cards && d.cards[index]) return d.cards[index];
      }
    } catch (e) {}
    return "";
  }

  function renderPricelistBlock(sec) {
    const pl = sec && sec.pricelist;
    if (!pl || !Array.isArray(pl.rows)) return "";
    const rows = pl.rows.filter(function (r) {
      return String(r?.name || "").trim() || String(r?.price || "").trim();
    });
    if (!rows.length) return "";
    const body = rows
      .map(function (r) {
        return "<tr><td>" + esc(r.name) + "</td><td>" + esc(r.price) + "</td></tr>";
      })
      .join("");
    return `<div class="pricelist-block" id="priser">
    <table class="pricelist-table">
      <thead>
        <tr>
          <th scope="col">Tjänst</th>
          <th scope="col">Pris</th>
        </tr>
      </thead>
      <tbody>${body}</tbody>
    </table>
  </div>`;
  }

  function renderServices(page, sec) {
    const c = sec.content || {};
    const cards = sec.cards || [];
    const ed = showEditorChrome();
    const cardsHtml = cards
      .map((card, i) => {
        const cardSrc = resolveCardImage(card, page, i);
        const cardImg = ed
          ? `<figure class="editable-image editable-image--card" data-editable-image>
        <label class="editable-image__hit" aria-label="Byt bild — klicka eller dra hit">
          <input type="file" accept="image/*" class="img-upload__input" data-replace-img />
          <img class="card__thumb" src="${esc(cardSrc)}" alt="" loading="lazy" data-upload-target />
        </label>
        <div class="editable-image__toolbar">
          <button type="button" class="editable-image__btn editable-image__btn--upload" data-trigger-upload title="Välj bild från din enhet">Byt bild</button>
          <button type="button" class="editable-image__btn editable-image__btn--ai" data-ai-image-suggest="card" title="Föreslå ny bild">✦ Förslag</button>
        </div>
      </figure>`
          : `<figure class="editable-image editable-image--card">
        <img class="card__thumb" src="${esc(cardSrc)}" alt="" loading="lazy" />
      </figure>`;
        const intentSel = ed ? cardIntentSelect(i, card.intent) : "";
        const detail = String(card.detail ?? "").trim();
        const detailAnchor = detail ? `tjanst-kort-${i + 1}` : "";
        let ctaBlock = "";
        if (isCdRenderPage(page)) {
          const ctaLabel = String(card.ctaText ?? "").trim();
          const ctaHrefRaw = String(card.ctaHref ?? "").trim();
          const hasDocCta = ctaLabel.length > 0 || ctaHrefRaw.length > 0;
          if (hasDocCta) {
            const ctaHrefInfo = ed
              ? safeHref(ctaHrefRaw, { editor: true, fallback: ctaHrefRaw || "#" })
              : { href: escHref(ctaHrefRaw || "#"), configured: isConfiguredSiteHref(ctaHrefRaw) };
            const ctaLc = linkTargetClass(ctaHrefInfo.configured);
            ctaBlock = `<div class="card__cta-wrap">
        <a class="card__cta ${ctaLc}" href="${ctaHrefInfo.href}" data-href-key="card-${i}-cta-href"${
              ed && !ctaHrefInfo.configured
                ? ` title="Välj vart knappen ska peka — klicka bredvid orden, inte på själva texten"`
                : ""
            }><span${ed ? ` contenteditable="true" spellcheck="true" data-editable="card-${i}-cta-text" data-ai="services"` : ""}>${esc(ctaLabel)}</span></a>
      </div>`;
          }
        } else {
          let ctaLabel = String(card.ctaText ?? "").trim();
          let ctaHrefRaw = String(card.ctaHref ?? "").trim();
          if (detail && !/^https?:\/\//i.test(ctaHrefRaw)) {
            ctaHrefRaw = "#" + detailAnchor;
          } else if (!ctaHrefRaw || ctaHrefRaw === "#") {
            ctaHrefRaw = defaultCardCtaHref(card.intent);
          }
          const ctaFb = ctaHrefRaw;
          const ctaHrefInfo = safeHref(ctaHrefRaw, { editor: ed, fallback: ctaFb });
          const ctaLc = linkTargetClass(ctaHrefInfo.configured);
          if (!ctaLabel && detail) ctaLabel = "Läs mer";
          const showCta = ed ? ctaLabel.length > 0 || !!detail : !!detail;
          ctaBlock = showCta
            ? `<div class="card__cta-wrap">
        <a class="card__cta ${ctaLc}" href="${ctaHrefInfo.href}" data-href-key="card-${i}-cta-href"${
                ed && !ctaHrefInfo.configured ? ` title="Välj vart knappen ska peka — klicka bredvid orden, inte på själva texten"` : ""
              }><span${ed ? ` contenteditable="true" spellcheck="true" data-editable="card-${i}-cta-text" data-ai="services"` : ""} data-placeholder="${
                card.intent === "process" ? "Boka" : "Läs mer"
              }">${esc(ctaLabel)}</span></a>
      </div>`
            : "";
        }
        return `<article class="card" data-card-index="${i}"${detail ? ` data-card-subpage="${detailAnchor}"` : ""}>
        ${cardImg}
        ${intentSel}
        <div class="card__heading">
          <h3 class="card__title" contenteditable="true" data-placeholder="Rubrik på kortet" data-editable="card-${i}-title" data-ai="services">${esc(normalizeServiceCardTitle(card.title))}</h3>
        </div>
        <p contenteditable="true" data-placeholder="Kort beskrivande text — lägg till länk nedan om du vill." data-editable="card-${i}-body" data-ai="services">${esc(card.body)}</p>
        ${ctaBlock}
      </article>`;
      })
      .join("");
    const layoutClass = sec.layout ? " services-layout--" + esc(sec.layout) : "";
    const servicesId = sectionDomId(page, "services", "tjanster");
    const showServicesHighlights =
      !page.compositionLocked || (page.highlightMode || "minimal") === "inline";
    const servicesHighlights = showServicesHighlights
      ? renderHighlightBadges(sec.highlights, {
          mode: "inline",
          section: "services",
          wrapClass: "services__highlights section-highlights",
        })
      : "";
    const rhythm = rhythmSectionAttrs(sec);
    const cardDensityAttr = sec.cardDensity
      ? ' data-card-density="' + esc(sec.cardDensity) + '"'
      : "";
    const emphasisAttr = sec.emphasis ? ' data-section-emphasis="' + esc(sec.emphasis) + '"' : "";
    return `<section class="site-section site-section--services${layoutClass}${rhythm.extraClass}" data-section="services" data-layout="${esc(sectionLayoutAttr(page, sec, "services"))}" data-section-label="Tjänster" data-template="${esc(page.template || "")}" data-style="${esc(sec.dataStyle || "")}"${cardDensityAttr}${emphasisAttr}${rhythm.extraAttrs}
  draggable="true" id="${esc(servicesId)}"${hiddenAttr(!!sec.hidden)}>
  ${sectionDragBlock()}
  ${sectionEditBar("services", page, sec)}
  <div class="container">
    <h2 class="section-title section-title--center" contenteditable="true" spellcheck="true" data-placeholder="Rubrik över korten (valfritt)" data-editable="services-title">${esc(c["services-title"])}</h2>
    <p class="section-lead" contenteditable="true" spellcheck="true" data-placeholder="Använd korten för att visa det viktigaste och länka vidare." data-editable="services-lead">${esc(c["services-lead"])}</p>
    ${servicesHighlights}
    <div class="section-anchor" id="meny" aria-hidden="true"></div>
    <div class="cards">${cardsHtml}</div>
    ${renderPricelistBlock(sec)}
    ${renderServiceSubpages(cards, ed)}
  </div>
</section>`;
  }

  function renderGallery(page, sec) {
    const c = sec.content || {};
    const imgs = sec.images || [];
    const ed = showEditorChrome();
    const items = imgs
      .map(
        (src, i) =>
          ed
            ? `<figure class="gallery__item editable-image" data-gallery-item data-editable-image>
      <label class="editable-image__hit" aria-label="Byt bild — klicka eller dra hit">
        <input type="file" accept="image/*" class="img-upload__input" data-replace-img />
        <img src="${esc(src)}" alt="" loading="lazy" decoding="async" data-upload-target />
      </label>
      <div class="editable-image__toolbar">
        <button type="button" class="editable-image__btn editable-image__btn--upload" data-trigger-upload title="Välj bild från din enhet">Byt bild</button>
        <button type="button" class="editable-image__btn editable-image__btn--ai" data-ai-image-suggest="gallery" title="Föreslå ny bild">✦ Förslag</button>
      </div>
    </figure>`
            : `<figure class="gallery__item" data-gallery-item>
      <img src="${esc(src)}" alt="" loading="lazy" decoding="async" />
    </figure>`
      )
      .join("");
    const galleryId = sectionDomId(page, "gallery", "galleri");
    const galleryLayoutClass = sec.layout ? " gallery-layout--" + esc(sec.layout) : "";
    const rhythm = rhythmSectionAttrs(sec);
    return `<section class="site-section site-section--gallery${galleryLayoutClass}${rhythm.extraClass}" data-section="gallery" data-layout="${esc(sectionLayoutAttr(page, sec, "gallery"))}" data-section-label="Galleri" data-template="${esc(page.template || "")}" data-style="${esc(sec.dataStyle || "")}"${rhythm.extraAttrs}
  draggable="true" id="${esc(galleryId)}"${hiddenAttr(!!sec.hidden)}>
  ${sectionDragBlock()}
  ${sectionEditBar("gallery", page, sec)}
  <div class="container">
    <h2 class="section-title section-title--center" contenteditable="true" data-editable="gallery-title">${esc(c["gallery-title"])}</h2>
    <p class="section-lead" contenteditable="true" data-editable="gallery-lead">${esc(c["gallery-lead"])}</p>
    <div class="gallery" id="galleryGrid">${items}</div>
  </div>
</section>`;
  }

  function renderFaq(page, sec) {
    const c = sec.content || {};
    const items = sec.items || [];
    const details = items
      .map((it, i) => {
        const open = i === 0 ? " open" : "";
        return `<details class="accordion__item"${open}>
      <summary contenteditable="true" data-editable="faq-${i}-q" data-ai="faq">${esc(it.q)}</summary>
      <div class="accordion__body" contenteditable="true" data-editable="faq-${i}-a" data-ai="faq">${esc(it.a)}</div>
    </details>`;
      })
      .join("");
    const rhythm = rhythmSectionAttrs(sec);
    return `<section class="site-section site-section--faq${rhythm.extraClass}" data-section="faq" data-layout="${esc(sectionLayoutAttr(page, sec, "faq"))}" data-section-label="Vanliga frågor" data-template="${esc(page.template || "")}" data-style="${esc(sec.dataStyle || "")}"${rhythm.extraAttrs}
  draggable="true" id="fragor"${hiddenAttr(!!sec.hidden)}>
  ${sectionDragBlock()}
  ${sectionEditBar("faq", page, sec)}
  <div class="${containerClass(sec, "container container--narrow")}">
    <h2 class="section-title section-title--center" contenteditable="true" data-editable="faq-title">${esc(c["faq-title"])}</h2>
    <div class="accordion" id="faqAccordion">${details}</div>
  </div>
</section>`;
  }

  /** Svenska bokningstjänster + Calendly/Cal.com — styr knapptext och om länken går direkt ut. */
  function detectBookingProvider(url) {
    const u = String(url || "").toLowerCase();
    if (u.includes("bokadirekt.se")) {
      return { id: "bokadirekt", text: "Boka klippning via Bokadirekt", btnClass: "booking-btn--bokadirekt", directLink: true };
    }
    if (u.includes("voady.se")) {
      return { id: "voady", text: "Boka tid via Voady", btnClass: "booking-btn--voady", directLink: true };
    }
    if (u.includes("velloboka.se") || u.includes("vello.fi")) {
      return { id: "vello", text: "Boka tid via Vello", btnClass: "booking-btn--vello", directLink: true };
    }
    if (u.includes("bokamera.se")) {
      return { id: "bokamera", text: "Boka tid via BokaMera", btnClass: "booking-btn--bokamera", directLink: true };
    }
    if (u.includes("calendly.com")) {
      return { id: "calendly", text: "Boka tid direkt", btnClass: "booking-btn--calendly", directLink: false };
    }
    if (u.includes("cal.com")) {
      return { id: "calcom", text: "Boka tid direkt", btnClass: "booking-btn--calcom", directLink: false };
    }
    return { id: "generic", text: "Boka tid direkt", btnClass: "booking-btn--generic", directLink: true };
  }

  /** Calendly / Cal.com → inbäddad bokning. Övriga https-länkar → knapp till extern bokning. */
  function normalizeBookingUrl(raw) {
    let u = String(raw || "").trim();
    if (!u) return "";
    const lower = u.toLowerCase();
    if (lower.startsWith("javascript:") || lower.startsWith("data:")) return "";
    if (!/^https?:\/\//i.test(u)) {
      if (/^www\./i.test(u) || /^[a-z0-9.-]+\.[a-z]{2,}/i.test(u)) u = "https://" + u.replace(/^\/+/, "");
      else return "";
    }
    return u;
  }

  function bookingPresentation(page) {
    const raw = normalizeBookingUrl(page && page.bookingUrl);
    if (!raw) return { mode: "empty" };
    try {
      const parsed = new URL(raw);
      const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
      if (host === "calendly.com" || host.endsWith(".calendly.com")) {
        if (!parsed.searchParams.has("embed_domain") && typeof window !== "undefined" && window.location.hostname) {
          parsed.searchParams.set("embed_domain", window.location.hostname);
        }
        return { mode: "iframe", src: parsed.toString() };
      }
      if (host === "cal.com" || host.endsWith(".cal.com")) {
        if (!parsed.pathname.includes("/embed")) {
          parsed.pathname = parsed.pathname.replace(/\/?$/, "") + "/embed";
        }
        return { mode: "iframe", src: parsed.toString() };
      }
      return { mode: "link", href: raw };
    } catch (e) {
      return { mode: "empty" };
    }
  }

  function collectOrderLinks(page) {
    if (!page) return [];
    return [
      { url: page.foodoraUrl, label: "Beställ via Foodora", cls: "order-btn--foodora" },
      { url: page.woltUrl, label: "Beställ via Wolt", cls: "order-btn--wolt" },
      { url: page.pickupUrl, label: "Beställ & hämta", cls: "order-btn--pickup" },
    ]
      .map((row) => ({ ...row, href: normalizeBookingUrl(row.url) }))
      .filter((row) => row.href);
  }

  function isFoodIndustry(page) {
    const ind = String((page && page.industry) || "").trim();
    const area = String((page && page.area) || "").trim();
    return ind === "cafe" || ind === "restaurang" || area === "food";
  }

  function renderOrderLinksBlock(page, ed) {
    const links = collectOrderLinks(page);
    const showPlaceholder = ed && isFoodIndustry(page) && !links.length;
    if (!links.length && !showPlaceholder) return "";
    if (showPlaceholder) {
      return `<div class="booking-order booking-order--placeholder" id="bestall">
        <p class="booking-embed__hint">Öppna <strong>Redigera sektion</strong> här ovan och lägg till Foodora, Wolt eller Beställ &amp; hämta.</p>
      </div>`;
    }
    const btns = links
      .map(
        (row) =>
          `<a class="btn btn--ghost booking-order-btn ${row.cls}" href="${escHref(row.href)}" target="_blank" rel="noopener noreferrer">${esc(row.label)}</a>`
      )
      .join("");
    return `<div class="booking-order" id="bestall">
      <p class="booking-order__label">Beställ &amp; hämta</p>
      <div class="booking-order__row">${btns}</div>
    </div>`;
  }

  function renderBooking(page, sec) {
    const c = sec.content || {};
    const ed = showEditorChrome();
    const pres = bookingPresentation(page);
    let body = "";
    if (pres.mode === "iframe") {
      body = `<div class="booking-embed">
        <iframe title="Boka tid" loading="lazy" src="${esc(pres.src)}" allow="payment"></iframe>
      </div>`;
    } else if (pres.mode === "link") {
      const prov = detectBookingProvider(pres.href);
      body = `<p class="booking-embed__cta-wrap">
        <a class="btn btn--primary btn--lg booking-universal-btn ${prov.btnClass}" href="${escHref(pres.href)}" target="_blank" rel="noopener noreferrer">${esc(prov.text)}</a>
      </p>`;
    } else if (ed) {
      body = `<div class="booking-embed booking-embed--placeholder">
        <p><strong>Koppla ditt bokningssystem</strong></p>
        <p>Klicka <em>Redigera sektion</em> ovan och klistra in länk från Bokadirekt, Calendly eller Cal.com.</p>
      </div>`;
    } else {
      body = `<p class="booking-embed__hint">Ingen onlinebokning ännu — <a href="#kontakt">mejla eller ring oss</a> så bokar vi en tid.</p>`;
    }
    body += renderOrderLinksBlock(page, ed);
    const rhythm = rhythmSectionAttrs(sec);
    return `<section class="site-section site-section--booking${rhythm.extraClass}" data-section="booking" data-layout="${esc(sectionLayoutAttr(page, sec, "booking"))}" data-section-label="Bokning" data-template="${esc(page.template || "")}" data-style="${esc(sec.dataStyle || "")}"${rhythm.extraAttrs}
  draggable="true" id="bokning"${hiddenAttr(!!sec.hidden)}>
  ${sectionDragBlock()}
  ${sectionEditBar("booking", page, sec)}
  <div class="${containerClass(sec, "container container--narrow")}">
    <h2 class="section-title section-title--center" contenteditable="true" data-editable="booking-title">${esc(c["booking-title"])}</h2>
    <p class="section-lead section-lead--center" contenteditable="true" data-editable="booking-lead">${esc(c["booking-lead"])}</p>
    ${body}
  </div>
</section>`;
  }

  /**
   * Sparar bokningslänk och uppdaterar hero-knappen (text + mål) som i kundens admin-panel.
   * @param {object} doc
   * @param {string} rawUrl
   */
  function applyBookingLinkToDocument(doc, rawUrl) {
    if (!doc || !doc.page) return;
    const norm = normalizeBookingUrl(rawUrl);
    doc.page.bookingUrl = norm;
    if (norm && doc.sections && doc.sections.booking) doc.sections.booking.hidden = false;
    if (!norm) return;
    const prov = detectBookingProvider(norm);
    const pres = bookingPresentation({ bookingUrl: norm });
    const hero = doc.sections && doc.sections.hero;
    if (!hero || !hero.content) return;
    const ind = doc.page.industry || "";
    if (ind === "restaurang") {
      hero.content["hero-cta-1-text"] =
        prov.id === "bokadirekt" ? "Boka bord via Bokadirekt" : "Boka bord";
    } else if (ind === "cafe") {
      hero.content["hero-cta-1-text"] = prov.text || "Se meny";
      hero.content["hero-cta-1-href"] = "#meny";
      return;
    } else {
      hero.content["hero-cta-1-text"] = prov.text;
    }
    hero.content["hero-cta-1-href"] = pres.mode === "iframe" ? "#bokning" : norm;
  }

  /**
   * Foodora, Wolt och egen beställ-&-hämta-länk — visas i bokningssektionen (#bestall).
   * @param {object} doc
   * @param {{ foodora?: string; wolt?: string; pickup?: string }} urls
   */
  function applyOrderLinksToDocument(doc, urls) {
    if (!doc || !doc.page) return;
    urls = urls || {};
    doc.page.foodoraUrl = normalizeBookingUrl(urls.foodora);
    doc.page.woltUrl = normalizeBookingUrl(urls.wolt);
    doc.page.pickupUrl = normalizeBookingUrl(urls.pickup);
    const hasAny = !!(doc.page.foodoraUrl || doc.page.woltUrl || doc.page.pickupUrl);
    if (hasAny && doc.sections && doc.sections.booking) {
      doc.sections.booking.hidden = false;
      if (isFoodIndustry(doc.page)) {
        doc.sections.booking.content["booking-title"] = "Boka & beställ";
        doc.sections.booking.content["booking-lead"] =
          "Boka bord, beställ hemleverans eller hämta hos oss — välj vad som passar.";
      }
    }
    const hero = doc.sections && doc.sections.hero && doc.sections.hero.content;
    if (hero && hasAny) {
      hero["hero-cta-2-text"] = "Beställ";
      hero["hero-cta-2-href"] = "#bestall";
    }
  }

  function renderContact(page, sec) {
    const c = sec.content || {};
    const mapUrl = esc(sec.mapEmbedUrl || "");
    const rhythm = rhythmSectionAttrs(sec);
    return `<section class="site-section${rhythm.extraClass}" data-section="contact" data-layout="${esc(sectionLayoutAttr(page, sec, "contact"))}" data-section-label="Kontakt" data-template="${esc(page.template || "")}" data-style="${esc(sec.dataStyle || "")}"${rhythm.extraAttrs}
  draggable="true" id="kontakt"${hiddenAttr(!!sec.hidden)}>
  ${sectionDragBlock()}
  ${sectionEditBar("contact", page, sec)}
  <div class="container">
    <h2 class="section-title section-title--center" contenteditable="true" data-editable="contact-title">${esc(c["contact-title"])}</h2>
    <div class="contact">
      <div class="contact__info">
        <p contenteditable="true" data-editable="contact-phone"><strong>Telefon:</strong> ${esc(c["contact-phone"])}</p>
        <p contenteditable="true" data-editable="contact-email"><strong>E-post:</strong> ${esc(c["contact-email"])}</p>
        <p contenteditable="true" data-editable="contact-address"><strong>Adress:</strong> ${esc(c["contact-address"])}</p>
        <div class="contact__map" aria-label="Karta (exempel)">
          <iframe title="Karta" loading="lazy" src="${mapUrl}"></iframe>
        </div>
      </div>
      <form class="contact__form" id="contactForm" onsubmit="return false;">
        <label>
          <span contenteditable="true" data-editable="form-label-name">${esc(c["form-label-name"])}</span>
          <input type="text" name="name" autocomplete="name" required />
        </label>
        <label>
          <span contenteditable="true" data-editable="form-label-email">${esc(c["form-label-email"])}</span>
          <input type="email" name="email" autocomplete="email" required />
        </label>
        <label>
          <span contenteditable="true" data-editable="form-label-message">${esc(c["form-label-message"])}</span>
          <textarea name="message" rows="4" required></textarea>
        </label>
        <button type="submit" class="btn btn--primary" contenteditable="true" data-editable="form-submit-text">${esc(c["form-submit-text"])}</button>
        <p class="form-hint" contenteditable="true" data-editable="form-hint">${esc(c["form-hint"])}</p>
      </form>
    </div>
  </div>
</section>`;
  }

  function footerNavAnchor(href, text, slug, fallback, editor) {
    const { href: h, configured } = safeHref(href, { editor, fallback });
    const lt = linkTargetClass(configured);
    return `<a href="${h}" class="footer__link ${lt}" data-href-key="footer-link-${slug}-href"${editor && !configured ? ` title="Sätt länk"` : ""}><span contenteditable="true" data-editable="footer-link-${slug}">${esc(text)}</span></a>`;
  }

  function footerSocialEl(href, text, num, aria, editor) {
    const keyHref = `footer-social-${num}-href`;
    const keyText = `footer-social-${num}`;
    const configured = isConfiguredSiteHref(href);
    const inner = `<span contenteditable="true" data-editable="${keyText}">${esc(text)}</span>`;
    if (editor) {
      const { href: h } = safeHref(href, { editor: true, fallback: "#" });
      const lt = linkTargetClass(configured);
      return `<a href="${h}" target="_blank" rel="noopener noreferrer" aria-label="${esc(aria)}" class="social-icon ${lt}" data-href-key="${keyHref}"${!configured ? ` title="Klistra in er riktiga ${esc(aria)}-adress"` : ""}>${inner}</a>`;
    }
    if (configured) {
      return `<a href="${escHref(href)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(aria)}" class="social-icon link-target--ready">${inner}</a>`;
    }
    return `<span class="social-icon social-icon--inactive" aria-label="${esc(aria)} (ingen länk än)">${inner}</span>`;
  }

  function renderFooterNav(page, c, ed) {
    const navItems =
      page.compositionLocked && page.navigation && page.navigation.length
        ? page.navigation.filter(function (item) {
            return item && item.href && item.href !== "#top";
          })
        : null;
    if (navItems && navItems.length) {
      return navItems
        .slice(0, 6)
        .map(function (item, i) {
          return footerNavAnchor(item.href, item.label, String(i + 1), item.href || "#kontakt", ed);
        })
        .join("\n      ");
    }
    return [
      footerNavAnchor(c["footer-link-1-href"], c["footer-link-1"], "1", "#tjanster", ed),
      footerNavAnchor(c["footer-link-2-href"], c["footer-link-2"], "2", "#kontakt", ed),
      footerNavAnchor(c["footer-link-3-href"], c["footer-link-3"], "3", "#kontakt", ed),
    ].join("\n      ");
  }

  function renderFooterInner(page, sec) {
    const c = sec.content || {};
    const brandRaw = (c["footer-brand"] != null ? String(c["footer-brand"]) : "").trim();
    const split =
      global.AppDocument && typeof global.AppDocument.splitBrandAndLocation === "function"
        ? global.AppDocument.splitBrandAndLocation(brandRaw, page.location || "")
        : { brand: brandRaw, location: String(page.location || "").trim() };
    const brandRow = split.brand ? `<div class="footer__brand">${esc(split.brand)}</div>` : "";
    const ed = showEditorChrome();
    return `<div class="container footer">
    ${brandRow}
    <nav class="footer__nav" aria-label="Sidfot">
      ${renderFooterNav(page, c, ed)}
    </nav>
    <div class="footer__social">
      ${footerSocialEl(c["footer-social-1-href"], c["footer-social-1"], 1, "Facebook", ed)}
      ${footerSocialEl(c["footer-social-2-href"], c["footer-social-2"], 2, "Instagram", ed)}
      ${footerSocialEl(c["footer-social-3-href"], c["footer-social-3"], 3, "LinkedIn", ed)}
    </div>
  </div>`;
  }

  const RENDERERS = {
    hero: renderHero,
    about: renderAbout,
    services: renderServices,
    gallery: renderGallery,
    faq: renderFaq,
    booking: renderBooking,
    contact: renderContact,
  };

  function renderSectionHTML(id, doc) {
    if (!doc || !doc.page || !doc.sections) return "";
    const page = doc.page;
    const sec = doc.sections[id];
    if (!sec) return "";
    if (id === "footer") return renderFooterInner(page, sec);
    const fn = RENDERERS[id];
    return fn ? fn(page, sec) : "";
  }

  /**
   * Byt ut en sektion i DOM (t.ex. efter AI eller delvis publicering).
   * @param {string} id
   * @param {HTMLElement} mainEl
   * @param {HTMLElement | null} footerEl
   * @param {object} doc
   */
  function mountSection(id, mainEl, footerEl, doc) {
    if (id === "footer") {
      if (footerEl) {
        const page = doc && doc.page && typeof doc.page === "object" ? doc.page : {};
        const fsec =
          doc && doc.sections && typeof doc.sections === "object" && doc.sections.footer
            ? doc.sections.footer
            : {};
        footerEl.className = "site-footer";
        footerEl.setAttribute("data-section", "footer");
        footerEl.setAttribute("data-section-label", "Sidfot");
        footerEl.setAttribute("data-layout", footerLayoutAttr(page));
        footerEl.setAttribute("data-template", page.template || "");
        footerEl.setAttribute("data-style", fsec.dataStyle || "");
        if (fsec.hidden) footerEl.setAttribute("data-hidden", "true");
        else footerEl.removeAttribute("data-hidden");
        footerEl.innerHTML = renderFooterInner(page, fsec);
      }
      return;
    }
    if (!mainEl) return;
    const el = mainEl.querySelector(`[data-section="${id}"]`);
    const html = renderSectionHTML(id, doc);
    if (el && html) {
      el.outerHTML = html;
    }
  }

  function renderCompositionBlock(block, page) {
    if (!block || !block.type) return "";
    const c = block.content || {};
    const ed = showEditorChrome();
    const cdRender = isCdRenderPage(page);

    if (block.type === "banner") {
      const variant = block.variant || "promo";
      const rhythm = rhythmBlockAttrs(block);
      let ctaHtml = "";
      if (cdRender) {
        const ctaText = String(c.ctaText ?? "").trim();
        const ctaHrefRaw = String(c.ctaHref ?? "").trim();
        if (ctaText || ctaHrefRaw) {
          const ctaHrefInfo = ed
            ? safeHref(ctaHrefRaw, { editor: true, fallback: ctaHrefRaw || "#" })
            : { href: escHref(ctaHrefRaw || "#"), configured: isConfiguredSiteHref(ctaHrefRaw) };
          ctaHtml = `<a class="btn btn--primary ${linkTargetClass(ctaHrefInfo.configured)}" href="${ctaHrefInfo.href}">${esc(ctaText)}</a>`;
        }
      } else {
        const cta = safeHref(c.ctaHref || "#kontakt", { editor: ed, fallback: "#kontakt" });
        ctaHtml = `<a class="btn btn--primary ${linkTargetClass(cta.configured)}" href="${cta.href}">${esc(c.ctaText || "Läs mer")}</a>`;
      }
      return `<aside class="site-composition-block site-composition-block--banner site-composition-block--${esc(variant)}${rhythm.extraClass}" data-composition-block="${esc(block.id || "")}"${rhythm.extraAttrs}>
  <div class="container site-composition-block__inner">
    <div class="site-composition-block__copy">
      <p class="site-composition-block__title">${esc(c.title || "")}</p>
      <p class="site-composition-block__lead">${esc(c.lead || "")}</p>
    </div>
    ${ctaHtml}
  </div>
</aside>`;
    }

    if (block.type === "cta-band") {
      const rhythm = rhythmBlockAttrs(block);
      let ctaHtml = "";
      if (cdRender) {
        const ctaText = String(c.ctaText ?? "").trim();
        const ctaHrefRaw = String(c.ctaHref ?? "").trim();
        if (ctaText || ctaHrefRaw) {
          const ctaHrefInfo = ed
            ? safeHref(ctaHrefRaw, { editor: true, fallback: ctaHrefRaw || "#" })
            : { href: escHref(ctaHrefRaw || "#"), configured: isConfiguredSiteHref(ctaHrefRaw) };
          ctaHtml = `<a class="btn btn--primary ${linkTargetClass(ctaHrefInfo.configured)}" href="${ctaHrefInfo.href}">${esc(ctaText)}</a>`;
        }
      } else {
        const cta = safeHref(c.ctaHref || "#kontakt", { editor: ed, fallback: "#kontakt" });
        ctaHtml = `<a class="btn btn--primary ${linkTargetClass(cta.configured)}" href="${cta.href}">${esc(c.ctaText || "Kom igång")}</a>`;
      }
      return `<aside class="site-composition-block site-composition-block--cta-band${rhythm.extraClass}" data-composition-block="${esc(block.id || "")}"${rhythm.extraAttrs}>
  <div class="container site-composition-block__inner site-composition-block__inner--center">
    <h2 class="site-composition-block__title">${esc(c.title || "")}</h2>
    <p class="site-composition-block__lead">${esc(c.lead || "")}</p>
    ${ctaHtml}
  </div>
</aside>`;
    }

    if (block.type === "icon-grid" && block.items && block.items.length) {
      const items = block.items
        .map(function (item) {
          const icon = cdRender ? String(item.icon ?? "").trim() : item.icon || "✓";
          return `<div class="site-composition-block__icon-item">
      <span class="site-composition-block__icon" aria-hidden="true">${esc(icon)}</span>
      <h3 class="site-composition-block__icon-title">${esc(item.title || "")}</h3>
      <p class="site-composition-block__icon-body">${esc(item.body || "")}</p>
    </div>`;
        })
        .join("");
      const rhythm = rhythmBlockAttrs(block);
      return `<aside class="site-composition-block site-composition-block--icon-grid${rhythm.extraClass}" data-composition-block="${esc(block.id || "")}"${rhythm.extraAttrs}>
  <div class="container site-composition-block__icon-grid">${items}</div>
</aside>`;
    }

    if (block.type === "collage" && block.images && block.images.length) {
      const cells = block.images
        .map(function (url, i) {
          const src = safeImgSrc(url);
          if (!src) return "";
          return `<figure class="site-composition-block__collage-cell site-composition-block__collage-cell--${i + 1}">
      <img src="${esc(src)}" alt="" loading="lazy" decoding="async" />
    </figure>`;
        })
        .join("");
      if (!cells) return "";
      const variant = block.variant || "grid-3";
      const rhythm = rhythmBlockAttrs(block);
      return `<aside class="site-composition-block site-composition-block--collage site-composition-block--${esc(variant)}${rhythm.extraClass}" data-composition-block="${esc(block.id || "")}"${rhythm.extraAttrs}>
  <div class="container site-composition-block__collage">${cells}</div>
</aside>`;
    }

    return "";
  }

  function compositionBlocksAfter(sectionId, page) {
    const blocks = (page && page.compositionBlocks) || [];
    return blocks
      .filter(function (b) {
        return b && b.afterSection === sectionId;
      })
      .map(function (b) {
        return renderCompositionBlock(b, page);
      })
      .join("\n");
  }

  function mount(doc, mainEl, footerEl) {
    if (!mainEl || !doc || !doc.page) return;
    const page = doc.page;
    if (
      page.createPath === "v2" &&
      global.V2CompiledRenderer &&
      typeof global.V2CompiledRenderer.mount === "function" &&
      global.V2CompiledRenderer.mount(doc, mainEl, footerEl)
    ) {
      return;
    }
    if (
      page.createPath === "blueprint" &&
      global.BlueprintRenderer &&
      typeof global.BlueprintRenderer.mount === "function" &&
      global.BlueprintRenderer.mount(doc, mainEl, footerEl)
    ) {
      return;
    }
    if (
      page.layoutEngine === "generative" &&
      global.LayoutRenderer &&
      typeof global.LayoutRenderer.mount === "function" &&
      global.LayoutRenderer.mount(doc, mainEl, footerEl)
    ) {
      return;
    }
    const sections = doc && doc.sections && typeof doc.sections === "object" && !Array.isArray(doc.sections) ? doc.sections : {};
    const defaultMainOrder = ["hero", "about", "services", "gallery", "faq", "booking", "contact"];
    let order = (page.sectionOrder || []).filter((id) => id !== "footer");
    if (!order.length) order = defaultMainOrder.slice();
    const brandBar = renderSiteBrandBar(doc);
    mainEl.innerHTML =
      (brandBar ? brandBar + "\n" : "") +
      order
        .map((id) => {
          const sec = sections[id];
          if (!sec) return compositionBlocksAfter(id, page);
          const fn = RENDERERS[id];
          const sectionHtml = fn ? fn(page, sec) : "";
          const blocksHtml = compositionBlocksAfter(id, page);
          return [sectionHtml, blocksHtml].filter(Boolean).join("\n");
        })
        .join("\n");
    if (footerEl) {
      mountSection("footer", mainEl, footerEl, doc);
    }
  }

  global.RenderEngine = {
    esc,
    mount,
    mountSection,
    renderSectionHTML,
    renderSiteBrandBar,
    RENDERERS,
    inStudioEditor,
    isConfiguredSiteHref,
    safeHref,
    defaultCardHrefForIntent: defaultCardCtaHref,
    normalizeBookingUrl,
    bookingPresentation,
    detectBookingProvider,
    applyBookingLinkToDocument,
    applyOrderLinksToDocument,
    collectOrderLinks,
  };
})(typeof window !== "undefined" ? window : globalThis);
