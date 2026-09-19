/**
 * Endast live-sajt: inbäddat publicerat dokument, render, ingen editor/state/bindings/AI.
 */
(function (global) {
  "use strict";

  function applyDesignColors(el, colors) {
    if (!el || !colors) return;
    ["bg", "surface", "text", "accent", "primary", "secondary", "border"].forEach(function (key) {
      if (colors[key] != null) el.style.setProperty("--" + key, colors[key]);
    });
  }

  function applyPageToBody(doc) {
    if (!doc || !doc.page) return;
    const p = doc.page;
    if (global.DesignFamilies && typeof global.DesignFamilies.applyToPreviewDOM === "function") {
      global.DesignFamilies.applyToPreviewDOM(p);
      return;
    }
    document.body.setAttribute("data-theme", p.theme || "minimal-white");
    document.body.setAttribute("data-template", p.template || "editorial");
    document.body.setAttribute("data-industry", p.industry || "konsult");
    document.body.setAttribute("data-section-spacing", p.sectionSpacing || "2");
    const legacyFonts = ["inter-dm", "fraunces-inter", "playfair"];
    if (!p.fontPair || legacyFonts.includes(p.fontPair)) document.body.removeAttribute("data-font-pair");
    else document.body.setAttribute("data-font-pair", p.fontPair);
    if (!p.buttonStyle || p.buttonStyle === "solid") document.body.removeAttribute("data-button-style");
    else document.body.setAttribute("data-button-style", p.buttonStyle);
    if (p.designColorSetId) document.body.setAttribute("data-color-set", p.designColorSetId);
    applyDesignColors(document.body, p.designColors);
    document.querySelectorAll(".site-public-header, #siteMain [data-section], #siteFooter").forEach(function (el) {
      applyDesignColors(el, p.designColors);
    });
  }

  function stripPublicChrome(root) {
    if (!root) return;
    root.querySelectorAll("[contenteditable]").forEach(function (el) {
      el.removeAttribute("contenteditable");
      el.removeAttribute("spellcheck");
    });
    root.querySelectorAll("[data-ai]").forEach(function (el) {
      el.removeAttribute("data-ai");
    });
    root.querySelectorAll("[data-editable]").forEach(function (el) {
      el.removeAttribute("data-editable");
    });
    root.querySelectorAll("[data-href-key]").forEach(function (el) {
      el.removeAttribute("data-href-key");
    });
    root.querySelectorAll(".link-target--open, .link-target--ready").forEach(function (el) {
      el.classList.remove("link-target--open", "link-target--ready");
    });
      root.querySelectorAll(".section-drag, .section-ai-ribbon, .section-edit, .img-upload, .hero-image-tools, .editable-image__toolbar, .card-intent-select").forEach(function (el) {
      el.setAttribute("hidden", "true");
    });
    root.querySelectorAll(".site-section[data-section]").forEach(function (sec) {
      sec.setAttribute("draggable", "false");
    });
  }

  function openServiceSubpage(subpage) {
    if (!subpage || !subpage.classList.contains("service-subpage")) return false;
    var container = subpage.closest(".service-subpages");
    var section = subpage.closest('[data-section="services"]');
    if (!container || !section || container.classList.contains("service-subpages--edit")) return false;
    container.querySelectorAll(".service-subpage").forEach(function (el) {
      el.classList.remove("is-active");
    });
    subpage.classList.add("is-active");
    container.classList.add("is-subpage-open");
    section.classList.add("is-subpage-view");
    return true;
  }

  function closeServiceSubpage(section) {
    if (!section) return;
    var container = section.querySelector(".service-subpages");
    if (!container || container.classList.contains("service-subpages--edit")) return;
    container.classList.remove("is-subpage-open");
    container.querySelectorAll(".service-subpage").forEach(function (el) {
      el.classList.remove("is-active");
    });
    section.classList.remove("is-subpage-view");
  }

  function bindServiceSubpageNav(root) {
    if (!root || root.dataset.serviceSubpageBound === "1") return;
    root.dataset.serviceSubpageBound = "1";
    root.addEventListener(
      "click",
      function (e) {
        var back = e.target.closest(".service-subpage__back");
        if (back) {
          var section = back.closest('[data-section="services"]');
          if (!section) return;
          var container = section.querySelector(".service-subpages");
          if (!container || container.classList.contains("service-subpages--edit")) return;
          e.preventDefault();
          closeServiceSubpage(section);
          var cards = section.querySelector(".cards");
          if (cards) cards.scrollIntoView({ behavior: "smooth", block: "start" });
          return;
        }

        var a = e.target.closest('a[href^="#tjanst-kort-"]');
        if (!a || !root.contains(a)) return;
        var id = decodeURIComponent((a.getAttribute("href") || "").slice(1).split("?")[0]);
        if (!id) return;
        var subpage = document.getElementById(id);
        if (!subpage || !openServiceSubpage(subpage)) return;
        e.preventDefault();
        subpage.scrollIntoView({ behavior: "smooth", block: "start" });
      },
      true
    );
  }

  function bindPublicHashLinks(root) {
    if (!root || root.dataset.publicHashBound === "1") return;
    root.dataset.publicHashBound = "1";
    root.addEventListener(
      "click",
      function (e) {
        if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
        const a = e.target.closest('a[href^="#"]');
        if (!a || !root.contains(a)) return;
        const href = (a.getAttribute("href") || "").trim();
        if (href.length < 2 || href === "#") return;
        const id = decodeURIComponent(href.slice(1).split("?")[0]);
        const target = document.getElementById(id);
        if (!target) return;
        e.preventDefault();
        if (target.classList.contains("service-subpage")) {
          if (!openServiceSubpage(target)) return;
          target.scrollIntoView({ behavior: "smooth", block: "start" });
          return;
        }
        const scrollTarget = target.querySelector(".section-title") || target;
        scrollTarget.scrollIntoView({ behavior: "smooth", block: "start" });
      },
      true
    );
  }

  function run() {
    var el = document.getElementById("studio-published-json");
    if (!el || !el.textContent) return;
    var doc;
    try {
      doc = JSON.parse(el.textContent);
    } catch (e) {
      console.warn("public-site-boot parse", e);
      return;
    }
    if (global.AppDocument && global.AppDocument.normalize) doc = global.AppDocument.normalize(doc);
    applyPageToBody(doc);
    var siteMain = document.getElementById("siteMain");
    var footer = document.querySelector(".site-footer");
    if (global.RenderEngine && global.RenderEngine.mount) {
      global.RenderEngine.mount(doc, siteMain, footer);
    }
    stripPublicChrome(siteMain);
    stripPublicChrome(footer);
    bindPublicHashLinks(siteMain);
    if (footer) bindPublicHashLinks(footer);
    if (global.ServiceSubpageNav && typeof global.ServiceSubpageNav.bind === "function") {
      global.ServiceSubpageNav.bind();
    }
    var hero = doc.sections && doc.sections.hero && doc.sections.hero.content && doc.sections.hero.content["hero-title"];
    if (hero) document.title = String(hero).replace(/<[^>]+>/g, "").trim().slice(0, 72);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
})(typeof window !== "undefined" ? window : globalThis);
