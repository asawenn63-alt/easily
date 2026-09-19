/**
 * AI-actions — data-ai="section" + data-ai-target → AISiteBuilder + sync till SiteState.
 */
(function (global) {
  "use strict";

  let globalBound = false;
  let sectionAiRunning = false;

  const MACRO_SECTION_TARGETS = new Set(["hero", "about", "services", "gallery"]);

  async function runSectionTarget(target) {
    const AI = global.AISiteBuilder;
    if (!AI || !target) return;

    const run = async () => {
      if (target === "hero") {
        await AI.fillHero();
        await AI.fillSection("cta");
      } else {
        await AI.fillSection(target);
      }
      global.EditorEngine?.remount?.();
      global.SiteState.save();
    };

    if (MACRO_SECTION_TARGETS.has(target) && typeof AI.withMacroGeneration === "function") {
      await AI.withMacroGeneration(run);
    } else {
      await run();
    }
  }

  function bind(onAfterAi) {
    if (globalBound) return;
    globalBound = true;
    document.addEventListener("click", async (e) => {
      const btn = e.target.closest('#siteMain [data-ai="section"], #siteFooter [data-ai="section"]');
      if (!btn) return;
      const target = btn.getAttribute("data-ai-target");
      if (!target) return;
      if (sectionAiRunning || btn.disabled) return;
      e.preventDefault();
      sectionAiRunning = true;
      btn.disabled = true;
      btn.classList.add("is-busy");
      try {
        await runSectionTarget(target);
        onAfterAi?.();
      } finally {
        sectionAiRunning = false;
        btn.disabled = false;
        btn.classList.remove("is-busy");
      }
    });
  }

  global.AIActions = {
    runSectionTarget,
    bind,
  };
})(typeof window !== "undefined" ? window : globalThis);
