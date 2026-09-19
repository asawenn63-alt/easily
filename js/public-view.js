/**
 * Public readonly-vy: laddar publicerat dokument och renderar utan editor.
 */
(function (global) {
  "use strict";

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

  async function run() {
    var slug = global.__VIEW_SLUG__;
    if (!slug) return;

    document.body.setAttribute("data-studio-mode", "readonly");
    document.body.setAttribute("data-public-site", "1");

    var origin = global.__VIEW_ORIGIN__ || "";
    try {
      if (origin && global.SiteApi && typeof global.SiteApi.setApiBase === "function") {
        global.SiteApi.setApiBase(origin);
      }
    } catch (e) {
      /* ignore */
    }

    var data;
    try {
      data = await global.SiteApi.fetchPublicDocument(slug);
    } catch (err) {
      var main = document.getElementById("siteMain");
      if (main) {
        main.innerHTML =
          '<section class="site-section"><div class="container"><h1 class="section-title">Sidan finns inte</h1><p>Vi hittade inte den här sidan. Kontrollera länken eller publicera sajten på nytt från studion.</p></div></section>';
      }
      return;
    }

    var doc = data.document;
    if (global.AppDocument && global.AppDocument.normalize) doc = global.AppDocument.normalize(doc);
    if (global.SiteState && global.SiteState.replace) global.SiteState.replace(doc);

    var siteMain = document.getElementById("siteMain");
    var footer = document.querySelector(".site-footer");
    if (global.RenderEngine && global.RenderEngine.mount) {
      global.RenderEngine.mount(global.SiteState.get(), siteMain, footer);
    }

    function stripEditing(root) {
      if (!root) return;
      root.querySelectorAll("[contenteditable]").forEach(function (el) {
        el.setAttribute("contenteditable", "false");
      });
      root.querySelectorAll(".section-drag").forEach(function (el) {
        el.setAttribute("hidden", "true");
      });
      root.querySelectorAll(".section-ai-ribbon, .section-edit").forEach(function (el) {
        el.setAttribute("hidden", "true");
      });
      root.querySelectorAll(".img-upload, .hero-image-tools, .editable-image__toolbar, .card-intent-select").forEach(function (el) {
        el.setAttribute("hidden", "true");
      });
      root.querySelectorAll(".site-section[data-section]").forEach(function (sec) {
        sec.setAttribute("draggable", "false");
      });
    }

    stripEditing(siteMain);
    stripEditing(footer);

    function stripLiveHints(root) {
      if (!root) return;
      root.querySelectorAll("[data-ai]").forEach(function (el) {
        el.removeAttribute("data-ai");
      });
      root.querySelectorAll("[data-editable]").forEach(function (el) {
        el.removeAttribute("data-editable");
      });
      root.querySelectorAll("[data-placeholder]").forEach(function (el) {
        el.removeAttribute("data-placeholder");
      });
      root.querySelectorAll("[data-href-key]").forEach(function (el) {
        el.removeAttribute("data-href-key");
      });
      root.querySelectorAll(".link-target--open, .link-target--ready").forEach(function (el) {
        el.classList.remove("link-target--open", "link-target--ready");
      });
    }

    stripLiveHints(siteMain);
    stripLiveHints(footer);

    bindServiceSubpageNav(siteMain);

    var heroTitle =
      doc.sections &&
      doc.sections.hero &&
      doc.sections.hero.content &&
      doc.sections.hero.content["hero-title"];
    var footerBrand =
      doc.sections && doc.sections.footer && doc.sections.footer.content && doc.sections.footer.content["footer-brand"];
    function cleanTitle(s) {
      return String(s || "")
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();
    }
    var ht = cleanTitle(heroTitle);
    var bt = cleanTitle(footerBrand);
    if (ht) document.title = ht.slice(0, 72);
    else if (bt) document.title = bt.slice(0, 72);
    else document.title = "Sida";

    if (global.EditableBindings && global.EditableBindings.rebindAll) {
      global.EditableBindings.rebindAll(siteMain, footer, {}, { readOnly: true });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
})(typeof window !== "undefined" ? window : globalThis);
