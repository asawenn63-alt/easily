/**
 * Easily 2.0 — Create flow prototype (UI interactions only).
 * No AI, no backend, no connection to legacy create pipeline.
 */
(function () {
  "use strict";

  function initSelectableCards(containerId, hiddenInputId, attrName) {
    const grid = document.getElementById(containerId);
    const hidden = document.getElementById(hiddenInputId);
    if (!grid || !hidden) return;

    const cards = grid.querySelectorAll("[role='option']");
    if (!cards.length) return;

    function select(card) {
      cards.forEach(function (c) {
        c.setAttribute("aria-selected", "false");
      });
      card.setAttribute("aria-selected", "true");
      hidden.value = card.getAttribute(attrName) || "";
    }

    cards.forEach(function (card) {
      card.addEventListener("click", function () {
        select(card);
      });
      card.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          select(card);
        }
      });
    });

    select(cards[0]);
  }

  function initSubmitButton() {
    const btn = document.getElementById("cv2SubmitBtn");
    const form = document.getElementById("cv2Form");
    if (!btn || !form) return;

    btn.addEventListener("click", function (e) {
      e.preventDefault();
      btn.disabled = true;
      btn.textContent = "Kommer snart…";
      window.setTimeout(function () {
        btn.disabled = false;
        btn.textContent = "Skapa webbplats";
      }, 1200);
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initSelectableCards("cv2TypeGrid", "cv2SiteType", "data-type");
    initSelectableCards("cv2StyleGrid", "cv2DesignStyle", "data-style");
    initSubmitButton();
  });
})();
