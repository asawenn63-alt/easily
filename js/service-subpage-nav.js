/**
 * Tjänstekort — öppna/stäng undersidor (Läs mer).
 */
(function (global) {
  "use strict";

  function scrollPaddingPx() {
    var header = document.querySelector(".site-public-header");
    var headerH = header ? header.getBoundingClientRect().height : 0;
    return Math.max(20, Math.round(headerH + 16));
  }

  function scrollToEl(el, opts) {
    if (!el) return;
    if (typeof opts === "number") opts = { offsetRatio: opts };
    opts = opts || {};
    var scrollEl = el;
    if (!opts.rawTarget && el.classList && el.classList.contains("site-section")) {
      scrollEl = el.querySelector(".section-title") || el;
    }
    var pane = document.getElementById("studioPreviewPane");
    try {
      if (pane && typeof pane.scrollTo === "function") {
        var paneRect = pane.getBoundingClientRect();
        var elRect = scrollEl.getBoundingClientRect();
        var pad;
        if (typeof opts.offsetPx === "number") pad = opts.offsetPx;
        else if (typeof opts.offsetRatio === "number") pad = paneRect.height * opts.offsetRatio;
        else pad = scrollPaddingPx();
        var targetTop = pane.scrollTop + (elRect.top - paneRect.top) - pad;
        pane.scrollTo({ top: Math.max(0, targetTop), behavior: "smooth" });
        return;
      }
    } catch (e) {
      /* ignore */
    }
    scrollEl.scrollIntoView({ behavior: "smooth", block: "start" });
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

  function handleSubpageNavClick(e, root) {
    if (!root || !root.contains(e.target)) return false;

    var back = e.target.closest(".service-subpage__back");
    if (back) {
      var section = back.closest('[data-section="services"]');
      if (!section) return false;
      var container = section.querySelector(".service-subpages");
      if (!container || container.classList.contains("service-subpages--edit")) return false;
      e.preventDefault();
      e.stopPropagation();
      closeServiceSubpage(section);
      scrollToEl(section.querySelector(".section-title") || section.querySelector(".cards") || section);
      return true;
    }

    var a = e.target.closest('a[href^="#tjanst-kort-"]');
    if (!a) return false;
    var id = decodeURIComponent((a.getAttribute("href") || "").slice(1).split("?")[0]);
    if (!id) return false;
    var subpage = document.getElementById(id);
    if (!subpage || !subpage.classList.contains("service-subpage")) return false;
    if (!openServiceSubpage(subpage)) return false;
    e.preventDefault();
    e.stopPropagation();
    scrollToEl(subpage, { offsetPx: 16, rawTarget: true });
    return true;
  }

  function bindRoot(root) {
    if (!root || root.dataset.serviceSubpageBound === "1") return;
    root.dataset.serviceSubpageBound = "1";
    root.addEventListener(
      "click",
      function (e) {
        handleSubpageNavClick(e, root);
      },
      true
    );
  }

  function bindAll() {
    bindRoot(document.getElementById("siteMain"));
    bindRoot(document.getElementById("siteFooter"));
  }

  document.addEventListener("studio:preview-mounted", bindAll);
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindAll);
  } else {
    bindAll();
  }

  global.ServiceSubpageNav = {
    open: openServiceSubpage,
    close: closeServiceSubpage,
    bind: bindAll,
    scrollTo: scrollToEl,
  };
})(typeof window !== "undefined" ? window : globalThis);
