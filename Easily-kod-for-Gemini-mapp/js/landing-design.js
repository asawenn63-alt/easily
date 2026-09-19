/**
 * Applicera designfamiljer på landningssidans exempel.
 */
(function () {
  "use strict";
  if (!globalThis.DesignFamilies) return;
  document.querySelectorAll("[data-design-family]").forEach(function (el) {
    DesignFamilies.applyToElement(el, el.getAttribute("data-design-family"));
  });
})();
