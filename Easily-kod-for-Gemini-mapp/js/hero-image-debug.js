/**
 * Steg-för-steg-loggning för hero-bild via AI-chat.
 * Öppna DevTools (F12) → Console och filtrera på "Hero-bild".
 */
(function (global) {
  "use strict";

  const steps = [];

  function ts() {
    return new Date().toISOString().slice(11, 23);
  }

  function log(step, detail) {
    const entry = { step: step, detail: detail, at: Date.now() };
    steps.push(entry);
    if (typeof console === "undefined" || !console.info) return entry;
    const extra =
      detail === undefined || detail === null
        ? ""
        : typeof detail === "object"
          ? " " + JSON.stringify(detail)
          : " " + String(detail);
    console.info("[Easily · Hero-bild · " + ts() + "] " + step + extra);
    return entry;
  }

  function readStateHeroUrl() {
    const SS = global.SiteState;
    if (!SS || !SS.get) return "";
    const doc = SS.get();
    return String((doc && doc.page && doc.page.heroBgUrl) || "").trim();
  }

  function verifyPreview() {
    const bg = document.getElementById("heroBg");
    if (!bg) {
      return { ok: false, reason: "Saknar #heroBg i preview-DOM" };
    }
    const img = bg.querySelector(".hero__photo");
    const heroSec = bg.closest(".site-section--hero");
    const photoMode = heroSec && heroSec.classList.contains("hero--has-photo");
    const imgSrc = img ? String(img.currentSrc || img.getAttribute("src") || img.src || "").trim() : "";

    if (img && img.complete && img.naturalWidth > 0) {
      return { ok: true, via: "img", src: imgSrc.slice(0, 120) };
    }
    if (img && imgSrc) {
      return {
        ok: false,
        pending: !img.complete,
        via: "img",
        src: imgSrc.slice(0, 120),
        reason: img.complete
          ? "Bild-URL satt men fotot laddades inte (kolla nätverk/proxy)"
          : "Hero-bild laddas…",
      };
    }
    if (photoMode) {
      return { ok: false, reason: "Hero markerad med bild men <img> saknas i preview" };
    }

    const cssVar = bg.style.getPropertyValue("--hero-bg-image") || "";
    let computed = "";
    try {
      computed = global.getComputedStyle(bg).backgroundImage || "";
    } catch (e) {
      computed = "";
    }
    const hasVar = /url\s*\(/i.test(cssVar);
    const hasComputed = /url\s*\(/i.test(computed) && !/^none$/i.test(computed.trim());
    const ok = hasVar || hasComputed;
    return {
      ok: ok,
      via: ok ? "css-bg" : "none",
      cssVar: cssVar.slice(0, 120),
      computed: computed.slice(0, 120),
      reason: ok ? "CSS-bakgrund satt men fotot syns inte ännu" : "Ingen bakgrundsbild i preview",
    };
  }

  function printChainSummary(opts) {
    opts = opts || {};
    const stateUrl = opts.stateUrl || readStateHeroUrl();
    const preview = opts.preview || verifyPreview();
    const lines = [
      "── Hero-bild kedja ──",
      "1. AI command received" + (opts.command ? " → «" + opts.command + "»" : ""),
      "2. Image handler" + (opts.handler ? " → " + opts.handler : opts.imageUrl ? " → OK" : " → ?"),
    ];
    if (opts.imageUrl) lines.push("3. Hero image URL = " + opts.imageUrl);
    else lines.push("3. Hero image URL = (ingen)");
    lines.push(
      "4. State updated → heroBgUrl " +
        (stateUrl ? stateUrl.slice(0, 100) + (stateUrl.length > 100 ? "…" : "") : "(tom)")
    );
    lines.push(
      "5. Preview re-rendered → " +
        (preview.ok ? "BILD SYNLIG i #heroBg" : "EJ SYNLIG — " + (preview.reason || "okänt"))
    );
    if (opts.success === true) lines.push("✓ Kedjan OK");
    else if (opts.success === false) lines.push("✗ Kedjan bruten");
    lines.push("────────────────────");
    if (typeof console !== "undefined" && console.info) {
      console.info("[Easily · Hero-bild]\n" + lines.join("\n"));
    }
    return { stateUrl: stateUrl, preview: preview, lines: lines };
  }

  function clear() {
    steps.length = 0;
  }

  function waitForHeroPhotoLoad(timeoutMs) {
    timeoutMs = timeoutMs || 15000;
    const start = Date.now();
    return new Promise(function (resolve) {
      function check() {
        const result = verifyPreview();
        if (result.ok) {
          resolve(result);
          return;
        }
        if (result.pending && Date.now() - start < timeoutMs) {
          setTimeout(check, 150);
          return;
        }
        if (Date.now() - start >= timeoutMs) {
          resolve(result);
          return;
        }
        setTimeout(check, 150);
      }
      check();
    });
  }

  global.HeroImageDebug = {
    log: log,
    steps: function () {
      return steps.slice();
    },
    clear: clear,
    readStateHeroUrl: readStateHeroUrl,
    verifyPreview: verifyPreview,
    waitForHeroPhotoLoad: waitForHeroPhotoLoad,
    printChainSummary: printChainSummary,
  };
})(typeof window !== "undefined" ? window : globalThis);
