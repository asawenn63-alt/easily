/** Public boot for compiled free-scene sites. */
(function (global) {
  "use strict";

  function run() {
    const payload = document.getElementById("studio-published-json");
    const siteMain = document.getElementById("siteMain");
    const footer = document.getElementById("siteFooter");
    if (!payload || !payload.textContent || !siteMain) return;
    let doc;
    try {
      doc = JSON.parse(payload.textContent);
    } catch (error) {
      siteMain.textContent = "Den publicerade fria scenen kunde inte läsas.";
      return;
    }
    if (!global.RenderEngine || typeof global.RenderEngine.mount !== "function") {
      siteMain.textContent = "Renderaren för den fria scenen saknas.";
      return;
    }
    global.RenderEngine.mount(doc, siteMain, footer);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
})(typeof window !== "undefined" ? window : globalThis);
