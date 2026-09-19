/**
 * Hero-bilder: state = rena externa URL:er. Preview provar proxy → direkt → ny stock-bild.
 */
(function (global) {
  "use strict";

  var ALLOWED = /^(images\.unsplash\.com|picsum\.photos|fastly\.picsum\.photos)$/i;

  function isHttpUrl(u) {
    return /^https?:\/\//i.test(String(u || "").trim());
  }

  function isLocalStudio() {
    try {
      return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(global.location.origin);
    } catch (e) {
      return false;
    }
  }

  function isAutoPicsumFallback(raw) {
    return /picsum\.photos\/seed\/fb-hero-/i.test(String(raw || ""));
  }

  function unwrapProxy(raw) {
    var s = String(raw || "").trim();
    for (var i = 0; i < 10; i++) {
      if (!/\/api\/proxy-image/i.test(s)) break;
      try {
        var parsed = new URL(s, global.location.origin);
        var inner = parsed.searchParams.get("url");
        if (!inner) break;
        s = decodeURIComponent(inner);
      } catch (e0) {
        break;
      }
    }
    return s;
  }

  function isCorruptHeroUrl(raw) {
    var s = String(raw || "");
    if (!s) return false;
    if (/\/api\/proxy-image/i.test(s)) return true;
    if (/localhost|127\.0\.0\.1/i.test(s)) return true;
    if (isAutoPicsumFallback(s)) return true;
    if (/picsum\.photos\/seed\/fb-hero-http/i.test(s)) return true;
    if (s.length > 512) return true;
    return false;
  }

  function canonical(raw) {
    var u = unwrapProxy(String(raw || "").trim());
    if (!u || u.startsWith("data:")) return u;
    if (!isHttpUrl(u)) return u;
    var IC = global.ImageCatalog;
    if (IC && typeof IC.isBlockedUrl === "function" && IC.isBlockedUrl(u)) return "";
    if (isCorruptHeroUrl(u)) return "";
    return u;
  }

  function proxyUrl(externalUrl) {
    var u = canonical(externalUrl);
    if (!u || !isHttpUrl(u)) return u || "";
    if (!isLocalStudio()) return u;
    try {
      var parsed = new URL(u);
      if (!ALLOWED.test(parsed.hostname)) return u;
    } catch (e2) {
      return u;
    }
    return global.location.origin + "/api/proxy-image?url=" + encodeURIComponent(u);
  }

  /** Ordning: direkt URL först (referrerpolicy på img) — proxy endast som fallback. */
  function displayCandidates(raw) {
    var canon = canonical(raw);
    if (!canon) return [];
    var out = [canon];
    var proxied = proxyUrl(canon);
    if (proxied && proxied !== canon && out.indexOf(proxied) < 0) out.push(proxied);
    return out;
  }

  function resolve(raw) {
    var cands = displayCandidates(raw);
    return cands.length ? cands[0] : "";
  }

  function recoverHeroUrl(doc) {
    var industry = (doc && doc.page && doc.page.industry) || "verksamhet";
    var ISE = global.ImageSelectionEngine;
    if (ISE && typeof ISE.pick === "function") {
      var url = ISE.pick(doc || { page: { industry: industry } }, {
        section: "hero",
        industry: industry,
        userText: industry === "byggfirma" ? "snickare verktyg trä" : "",
        nonce: Date.now(),
      });
      if (url) return canonical(url);
    }
    var VS = global.VisualStock;
    if (VS && typeof VS.pickUrl === "function") {
      var tpl = (doc && doc.page && doc.page.template) || "editorial";
      var fallbackUrl = VS.pickUrl("hero", industry, tpl, { nonce: Date.now() });
      if (fallbackUrl) return canonical(fallbackUrl);
    }
    return "https://picsum.photos/seed/easily-hero-" + industry + "/1920/1080";
  }

  function sanitizeStored(raw, doc) {
    var IC = global.ImageCatalog;
    if (IC && typeof IC.isBlockedUrl === "function" && IC.isBlockedUrl(raw)) {
      return recoverHeroUrl(doc || null);
    }
    var c = canonical(raw);
    if (c) return c;
    if (!isCorruptHeroUrl(raw) && !isAutoPicsumFallback(raw)) return String(raw || "").trim();
    return recoverHeroUrl(doc || null);
  }

  global.HeroImageUrl = {
    resolve: resolve,
    proxyUrl: proxyUrl,
    canonical: canonical,
    unwrapProxy: unwrapProxy,
    isCorrupt: isCorruptHeroUrl,
    sanitizeStored: sanitizeStored,
    recoverHeroUrl: recoverHeroUrl,
    displayCandidates: displayCandidates,
  };
})(typeof window !== "undefined" ? window : globalThis);
