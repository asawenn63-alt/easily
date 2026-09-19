/**
 * Site Blueprint Builder — deterministisk översättning Concept → Blueprint.
 */
(function (global) {
  "use strict";

  function hashStr(s) {
    s = String(s || "");
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(16).slice(0, 6);
  }

  function cmpId(prefix, seed) {
    return "cmp_" + prefix + "_" + hashStr(seed);
  }

  function anchorForComponent(component, index) {
    const map = {
      hero: "top",
      "content-block": "om",
      "card-grid": "utbud",
      "product-grid": "utbud",
      "category-showcase": "kategorier",
      "featured-banner": "favorit",
      "trust-strip": "trygghet",
      "testimonial-strip": "omdomen",
      "media-gallery": "galleri",
      "faq-list": "faq",
      "contact-block": "kontakt",
      "cta-band": "boka",
    };
    return map[component] || "sec-" + index;
  }

  function imageUrl(images, kind, index) {
    const pack = images || {};
    const heroFallback = pack.hero && pack.hero.url ? pack.hero.url : "";
    if (kind === "hero") return heroFallback;
    if (kind === "about") return (pack.about && pack.about.url) || heroFallback;
    if (kind === "card") {
      const arr = pack.cards || [];
      const item = arr[index] || arr[index % Math.max(arr.length, 1)] || {};
      return item.url || heroFallback;
    }
    if (kind === "gallery") {
      const arr = pack.gallery || [];
      const item = arr[index] || arr[index % Math.max(arr.length, 1)];
      if (!item) return heroFallback;
      return typeof item === "string" ? item : item.url || heroFallback;
    }
    return heroFallback;
  }

  function designToTokens(design) {
    design = design || {};
    return {
      "color.bg": design.background,
      "color.surface": design.surface,
      "color.text": design.text,
      "color.accent": design.accent,
      "color.primary": design.primary,
      "color.border": design.border,
      "font.heading": design.headingFont,
      "font.body": design.bodyFont,
      "radius.button": design.buttonRadius,
      "spacing.section": design.sectionSpacing,
      "layout.maxWidth": design.maxWidth,
    };
  }

  function contentFromExecution(section, name, index) {
    const component = section.component;
    const action = section.primaryAction && section.primaryAction.label ? [section.primaryAction] : [];
    const urls = Array.isArray(section.imageUrls) ? section.imageUrls : [];
    const media = urls.map(function (url, imageIndex) { return { url: url, alt: name + " " + (imageIndex + 1) }; });
    const base = { headline: section.headline, lead: section.lead, body: section.body, anchor: anchorForComponent(component, index) };
    if (component === "brand-header") return Object.assign(base, { brandName: section.headline || name, actions: action });
    if (component === "footer") return Object.assign(base, { brandName: name, tagline: section.lead, actions: action });
    if (component === "hero") return Object.assign(base, { actions: action, media: media.map(function (item) { return Object.assign({}, item, { role: "hero-background" }); }) });
    if (component === "product-grid") return Object.assign(base, { products: section.items.map(function (item, i) { return Object.assign({}, item, { media: media[i] || undefined, action: action[0] }); }) });
    if (component === "category-showcase") return Object.assign(base, { categories: section.items.map(function (item, i) { return { title: item.title, body: item.body, media: media[i] || undefined, action: action[0] }; }) });
    if (component === "card-grid") return Object.assign(base, { cards: section.items.map(function (item, i) { return { title: item.title, body: item.body, media: media[i] || undefined, action: action[0] }; }) });
    if (component === "media-gallery") return Object.assign(base, { items: media.map(function (item) { return { media: item, alt: item.alt }; }) });
    if (component === "trust-strip" || component === "testimonial-strip") return Object.assign(base, { items: section.items });
    if (component === "faq-list") return Object.assign(base, { items: section.items.map(function (item) { return { question: item.title, answer: item.body }; }) });
    if (component === "content-block" || component === "featured-banner") return Object.assign(base, { media: media, actions: action });
    if (component === "contact-block" || component === "cta-band") return Object.assign(base, { actions: action });
    return base;
  }

  function buildNavLinks(children) {
    const links = [];
    (children || []).forEach(function (node) {
      if (!node || !node.content) return;
      const anchor = node.content.anchor;
      const headline = node.content.headline;
      if (!anchor || anchor === "top") return;
      if (node.type === "contact-block" || node.type === "cta-band") {
        links.push({ label: headline || "Kontakt", href: "#" + anchor });
      } else if (headline) {
        links.push({ label: String(headline).slice(0, 32), href: "#" + anchor });
      }
    });
    return links.slice(0, 5);
  }

  function contentForChoice(choice, brief, index, name, loc, concept) {
    const component = choice.component;
    const anchor = anchorForComponent(component, index);
    const narrative = (concept && concept.narrative) || {};
    const storyFallback = narrative.story || "";
    const leadFallback = narrative.singleMessage || narrative.conversionJourney || "";

    if (component === "hero") {
      const h = brief.hero || {};
      const img = imageUrl(brief.images, "hero");
      return {
        headline: h.title || name,
        lead: h.lead || leadFallback || storyFallback,
        actions: [
          h.primaryCta ? { label: h.primaryCta.text, href: h.primaryCta.href || "#kontakt", emphasis: "primary" } : null,
          h.secondaryCta ? { label: h.secondaryCta.text, href: h.secondaryCta.href || "#utbud", emphasis: "secondary" } : null,
        ].filter(Boolean),
        media: img ? [{ url: img, alt: name, role: "hero-background" }] : [],
        anchor: anchor,
      };
    }

    if (component === "content-block") {
      if (brief.about) {
        const a = brief.about;
        const img = imageUrl(brief.images, "about");
        return {
          headline: a.title || "Om " + name,
          lead: a.lead || leadFallback,
          body: [a.p1, a.p2].filter(Boolean).length ? [a.p1, a.p2].filter(Boolean) : storyFallback ? [storyFallback] : [],
          media: choice.variant === "prose-with-media" && img ? [{ url: img, alt: name }] : [],
          anchor: anchor,
        };
      }
    }

    if (component === "product-grid") {
      const shop = brief.shop || {};
      const source = shop.products || (brief.services && brief.services.cards) || [];
      const products = source.map(function (item, pi) {
        const img = imageUrl(brief.images, "card", pi);
        return {
          title: item.title || "",
          body: item.body || "",
          badge: item.badge || "",
          priceHint: item.priceHint || "",
          media: img ? { url: img } : undefined,
          action: { label: "Se produkt", href: "#kontakt" },
        };
      });
      return {
        headline: shop.title || (brief.services && brief.services.title) || "Sortiment",
        lead: shop.lead || (brief.services && brief.services.lead) || leadFallback,
        products: products,
        anchor: anchor,
      };
    }

    if (component === "trust-strip") {
      const t = brief.trust || {};
      return {
        items: t.items || [],
        anchor: anchor,
      };
    }

    if (component === "featured-banner") {
      const f = brief.featured || {};
      const img = imageUrl(brief.images, "card", 0) || imageUrl(brief.images, "hero");
      return {
        headline: f.headline || "Utvalt",
        lead: f.lead || "",
        body: f.body ? [f.body] : [],
        media: img ? [{ url: img, alt: name }] : [],
        actions: f.action ? [f.action] : [],
        anchor: anchor,
      };
    }

    if (component === "category-showcase") {
      const cat = brief.categories || {};
      const categories = (cat.categories || []).map(function (item, ci) {
        const img = imageUrl(brief.images, "card", ci);
        return {
          title: item.title || "",
          body: item.body || "",
          media: img ? { url: img } : undefined,
          action: { label: "Utforska", href: "#utbud" },
        };
      });
      return {
        headline: cat.title || "Kategorier",
        lead: cat.lead || leadFallback,
        categories: categories,
        anchor: anchor,
      };
    }

    if (component === "testimonial-strip") {
      const tm = brief.testimonials || {};
      return {
        headline: tm.title || "Omdömen",
        items: tm.items || [],
        anchor: anchor,
      };
    }

    if (component === "card-grid") {
      const s = brief.services;
      const cards = s
        ? (s.cards || []).map(function (card, ci) {
            const img = imageUrl(brief.images, "card", ci);
            return {
              title: card.title || "",
              body: card.body || "",
              media: img ? { url: img } : undefined,
              action: card.href ? { label: "Läs mer", href: card.href } : undefined,
            };
          })
        : [];
      return {
        headline: (s && s.title) || "Utbud",
        lead: (s && s.lead) || leadFallback,
        cards: cards,
        anchor: anchor,
      };
    }

    if (component === "media-gallery") {
      const g = brief.gallery;
      const items = [];
      for (let gi = 0; gi < 4; gi++) {
        const url = imageUrl(brief.images, "gallery", gi);
        if (url) items.push({ media: { url: url }, alt: name + " " + (gi + 1) });
      }
      return {
        headline: (g && g.title) || "Galleri",
        lead: (g && g.lead) || leadFallback,
        items: items,
        anchor: anchor,
      };
    }

    if (component === "faq-list" && brief.faq) {
      const f = brief.faq;
      return {
        headline: f.title || "Vanliga frågor",
        items: (f.items || []).map(function (item) {
          return { question: item.q || item.question || "", answer: item.a || item.answer || "" };
        }),
        anchor: anchor,
      };
    }

    if (component === "contact-block" && brief.contact) {
      const c = brief.contact;
      const body = loc ? ["Vi finns i " + loc + "."] : [];
      return {
        headline: c.title || "Kontakt",
        lead: c.lead || "",
        body: body,
        actions: [{ label: "Hör av dig", href: "mailto:info@" + name.toLowerCase().replace(/\s+/g, "") + ".se", emphasis: "primary" }],
        anchor: anchor,
      };
    }

    if (component === "cta-band" && brief.booking) {
      const b = brief.booking;
      return {
        headline: b.title || "Boka tid",
        lead: b.lead || b.intro || "",
        actions: [{ label: "Boka tid", href: "#kontakt", emphasis: "primary" }],
        anchor: anchor,
      };
    }

    return {
      headline: name,
      lead: leadFallback,
      body: storyFallback ? [storyFallback] : [],
      anchor: anchor,
    };
  }

  function layoutForChoice(choice) {
    const component = choice.component;
    if (component === "hero") {
      return {
        width: choice.variant === "immersive-fullbleed" ? "full-bleed" : "contained",
        paddingY: "generous",
        mediaPosition: choice.variant === "immersive-fullbleed" ? "background" : undefined,
      };
    }
    if (component === "card-grid") {
      return { width: "contained", columns: choice.variant === "two-up" ? 2 : 3, gap: "md", paddingY: "generous" };
    }
    if (component === "product-grid") {
      return {
        width: "contained",
        columns: choice.variant === "three-up" ? 3 : 4,
        gap: "md",
        paddingY: "generous",
      };
    }
    if (component === "trust-strip") {
      return { width: "contained", paddingY: "compact" };
    }
    if (component === "featured-banner") {
      return { width: "contained", paddingY: "generous" };
    }
    if (component === "category-showcase") {
      return { width: "contained", columns: 3, gap: "md", paddingY: "generous" };
    }
    if (component === "testimonial-strip") {
      return { width: "contained", paddingY: "generous" };
    }
    if (component === "media-gallery") {
      return { width: "contained", paddingY: "generous", gap: "md" };
    }
    return { width: "contained", maxWidth: "lg", paddingY: "generous" };
  }

  /**
   * @param {object} concept — låst Creative Concept
   * @param {{ brief?: object, input?: object }} opts — contentPack från CD (brief)
   */
  function buildSiteBlueprint(concept) {
    const name = (concept.meta && concept.meta.businessName) || "";
    const loc = (concept.meta && concept.meta.location) || "";
    const choices =
      (concept.execution && concept.execution.componentStrategy && concept.execution.componentStrategy.choices) ||
      (concept.componentStrategy && concept.componentStrategy.choices) ||
      [];
    const execution = concept.execution || {};
    const executionSections = Array.isArray(execution.sections) ? execution.sections : [];
    if (!execution.design) throw new Error("creative_design_spec_missing");
    if (!executionSections.length || executionSections.length !== choices.length) {
      throw new Error("creative_execution_sections_incomplete");
    }
    const firstContentIndex = choices[0] && choices[0].component === "brand-header" ? 1 : 0;
    if (!choices[firstContentIndex] || choices[firstContentIndex].component !== "hero") {
      throw new Error("creative_execution_hero_required_first");
    }
    if (!choices[choices.length - 1] || choices[choices.length - 1].component !== "footer") {
      throw new Error("creative_execution_footer_required_last");
    }

    const children = choices.map(function (choice, index) {
      const section = executionSections[index];
      if (!section || section.component !== choice.component) {
        throw new Error("creative_execution_section_mismatch:" + choice.component);
      }
      const node = {
        id: cmpId(choice.component, name + "|" + index),
        type: choice.component,
        designSpecRef: "sections[" + index + "]",
        children: [],
      };
      if (["3.0", "4.0", "5.0", "6.0", "7.0"].includes(execution.designSpecVersion)) node.compositionPlanRef = "compositionPlan.sections[" + index + "]";
      if (!["2.0", "3.0", "4.0", "5.0", "6.0", "7.0"].includes(execution.designSpecVersion)) {
        node.layout = Object.assign({}, section.layout);
      }
      return node;
    });

    return {
      blueprintVersion: "1.0",
      conceptRef: {
        conceptVersion: concept.conceptVersion || "1.0",
        lockedAt: new Date().toISOString(),
      },
      designSpecRef: "page.designSpec",
      compositionPlanRef: ["3.0", "4.0", "5.0", "6.0", "7.0"].includes(execution.designSpecVersion) ? "page.designSpec.compositionPlan" : undefined,
      meta: {
        businessName: name,
        location: loc,
        industry: (concept.meta && concept.meta.industry) || "",
        businessType: (concept.meta && concept.meta.businessType) || "",
        locale: "sv-SE",
        createPath: "blueprint",
      },
      root: {
        id: "page",
        type: "page",
        children: children,
      },
    };
  }

  global.SiteBlueprintBuilder = {
    buildSiteBlueprint: buildSiteBlueprint,
  };
})(typeof window !== "undefined" ? window : globalThis);
