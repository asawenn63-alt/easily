/**
 * Highlight Extraction Engine — plockar visuellt värdefulla fakta ur verksamhetsbeskrivningen.
 */
(function (global) {
  "use strict";

  const VERSION = 1;

  const HERO_PLACEMENTS = ["float-tl", "float-tr", "float-bl"];
  const TRUST_ICONS = {
    experience: "★",
    customers: "✔",
    family: "♥",
    certified: "✔",
    offer: "✔",
    hours: "⏰",
    delivery: "⚡",
    local: "📍",
    guarantee: "✔",
    since: "★",
    default: "✔",
  };

  /**
   * @type {Array<{ re: RegExp, score: number, category: string, icon?: string, format: (m: RegExpMatchArray, raw: string) => string }>}
   */
  const PATTERNS = [
    {
      re: /(\d+)\s*\+?\s*års?\s+erfarenhet/i,
      score: 98,
      category: "experience",
      icon: "★",
      format: function (m) {
        return m[1] + " års erfarenhet";
      },
    },
    {
      re: /över\s+(\d[\d\s]*)\s*(?:nöjda\s+)?kunder/i,
      score: 96,
      category: "customers",
      icon: "✔",
      format: function (m) {
        const n = m[1].replace(/\s/g, "");
        return "Över " + n + " nöjda kunder";
      },
    },
    {
      re: /familjeföretag\s+(?:sedan\s+)?(\d{4})/i,
      score: 94,
      category: "family",
      icon: "♥",
      format: function (m) {
        return "Familjeföretag sedan " + m[1];
      },
    },
    {
      re: /familjeföretag/i,
      score: 88,
      category: "family",
      icon: "♥",
      format: function () {
        return "Familjeföretag";
      },
    },
    {
      re: /auktoriserad(?:e)?\s+([a-zåäöA-ZÅÄÖ]+(?:\s+[a-zåäöA-ZÅÄÖ]+)?)(?=\s+i\s|\s*,|\s+och|\s+med|\s+sedan|$)/i,
      score: 95,
      category: "certified",
      format: function (m) {
        const role = m[1].toLowerCase().replace(/\s+i$/, "").trim();
        return "Auktoriserad " + role;
      },
    },
    {
      re: /certifierad(?:\s+([a-zåäöA-ZÅÄÖ]+(?:\s+[a-zåäöA-ZÅÄÖ]+)?))?/i,
      score: 92,
      category: "certified",
      format: function (m) {
        return m[1] ? "Certifierad " + m[1].toLowerCase() : "Certifierad";
      },
    },
    {
      re: /kostnadsfri\s+(offert|konsultation|hembesök|rådgivning)/i,
      score: 90,
      category: "offer",
      format: function (m) {
        return "Kostnadsfri " + m[1].toLowerCase();
      },
    },
    {
      re: /gratis\s+(offert|konsultation|hembesök|rådgivning)/i,
      score: 88,
      category: "offer",
      format: function (m) {
        return "Gratis " + m[1].toLowerCase();
      },
    },
    {
      re: /öppet\s+(dygnet\s+runt|24\s*\/\s*7|24-7)/i,
      score: 91,
      category: "hours",
      icon: "⏰",
      format: function () {
        return "Öppet dygnet runt";
      },
    },
    {
      re: /snabb\s+leverans/i,
      score: 84,
      category: "delivery",
      icon: "⚡",
      format: function () {
        return "Snabb leverans";
      },
    },
    {
      re: /lokalt\s+företag/i,
      score: 82,
      category: "local",
      icon: "📍",
      format: function () {
        return "Lokalt företag";
      },
    },
    {
      re: /prisgaranti/i,
      score: 86,
      category: "guarantee",
      format: function () {
        return "Prisgaranti";
      },
    },
    {
      re: /sedan\s+(\d{4})/i,
      score: 80,
      category: "since",
      icon: "★",
      format: function (m) {
        return "Sedan " + m[1];
      },
    },
    {
      re: /(\d+)\+\s*kunder/i,
      score: 90,
      category: "customers",
      format: function (m) {
        return m[1] + "+ kunder";
      },
    },
    {
      re: /försäkrad(?:\s+([a-zåäö]+))?/i,
      score: 78,
      category: "certified",
      format: function () {
        return "Försäkrad";
      },
    },
    {
      re: /behörig(?:\s+([a-zåäöA-ZÅÄÖ]+(?:\s+[a-zåäöA-ZÅÄÖ]+)?))?/i,
      score: 85,
      category: "certified",
      format: function (m) {
        return m[1] ? "Behörig " + m[1].toLowerCase() : "Behörig installatör";
      },
    },
    {
      re: /miljöcertifierad/i,
      score: 83,
      category: "certified",
      format: function () {
        return "Miljöcertifierad";
      },
    },
    {
      re: /(\d+)\s*%\s*(?:nöjda|tillfreds|rekommenderar)/i,
      score: 87,
      category: "customers",
      format: function (m) {
        return m[1] + "% nöjda kunder";
      },
    },
    {
      re: /garanti\s+på\s+(\d+\s*år|\d+\s*månader?)/i,
      score: 79,
      category: "guarantee",
      format: function (m) {
        return "Garanti " + m[1].toLowerCase();
      },
    },
    {
      re: /same\s?day|samma\s+dag/i,
      score: 81,
      category: "delivery",
      icon: "⚡",
      format: function () {
        return "Leverans samma dag";
      },
    },
  ];

  function normalizeText(raw) {
    return String(raw || "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function capitalizeFirst(s) {
    const t = String(s || "").trim();
    if (!t) return t;
    return t.charAt(0).toUpperCase() + t.slice(1);
  }

  function hintScore(hint) {
    const h = String(hint || "").trim();
    if (!h || h.length < 4) return 0;
    if (h.length > 72) return 10;
    let score = 40;
    if (/\d/.test(h)) score += 25;
    if (/certifier|auktoriser|behörig|försäkr|garanti|kostnadsfri|gratis|nöjd|erfaren|familj|öppet|dygnet|leverans|lokal|sedan/i.test(h)) {
      score += 30;
    }
    if (h.length <= 42) score += 15;
    if (h.length > 52) score -= 25;
    if (/@|mailto|https?:\/\//i.test(h)) score -= 50;
    if (/^(vi|jag|det|som|och|med|för)\s/i.test(h)) score -= 20;
    return score;
  }

  function hintToLabel(hint) {
    let h = String(hint || "").trim();
    h = h.replace(/^(vi (är|har|erbjuder)|det (är|finns)|som)\s+/i, "");
    h = h.replace(/[.!?]+$/, "");
    if (h.length > 56) {
      const cut = h.slice(0, 52);
      const sp = cut.lastIndexOf(" ");
      h = (sp > 20 ? cut.slice(0, sp) : cut) + "…";
    }
    return capitalizeFirst(h);
  }

  function iconForCategory(category, override) {
    if (override) return override;
    return TRUST_ICONS[category] || TRUST_ICONS.default;
  }

  function dedupeKey(label) {
    return String(label || "")
      .toLowerCase()
      .replace(/[^\wåäö]+/g, "")
      .slice(0, 32);
  }

  function labelsOverlap(a, b) {
    const ka = dedupeKey(a);
    const kb = dedupeKey(b);
    if (!ka || !kb) return false;
    if (ka === kb) return true;
    if (ka.length >= 6 && kb.length >= 6 && (ka.includes(kb) || kb.includes(ka))) return true;
    return false;
  }

  function overlapsAny(label, usedLabels) {
    return (usedLabels || []).some(function (other) {
      return labelsOverlap(label, other);
    });
  }

  /**
   * @param {string} brief
   * @param {{ max?: number, exclude?: string[], section?: string }} [opts]
   * @returns {Array<{ label: string, icon: string, category: string, score: number, placement?: string }>}
   */
  function extractFromBrief(brief, opts) {
    opts = opts || {};
    const max = Math.max(1, Math.min(8, Number(opts.max) || 4));
    const exclude = new Set((opts.exclude || []).map(dedupeKey));
    const text = normalizeText(brief);
    if (!text) return [];

    const found = [];
    const seen = new Set();

    PATTERNS.forEach(function (pattern) {
      const m = text.match(pattern.re);
      if (!m) return;
      const label = capitalizeFirst(pattern.format(m, text));
      const key = dedupeKey(label);
      if (seen.has(key) || exclude.has(key)) return;
      seen.add(key);
      found.push({
        label: label,
        icon: iconForCategory(pattern.category, pattern.icon),
        category: pattern.category,
        score: pattern.score,
      });
    });

    const hintParts = text
      .split(/[,;]|\s+och\s+|\.\s+(?=[A-ZÅÄÖa-zåäö])/)
      .map(function (s) {
        return s.trim();
      })
      .filter(function (s) {
        return s.length >= 4 && s.length <= 64;
      });

    hintParts.forEach(function (hint) {
      const score = hintScore(hint);
      if (score < 55) return;
      const label = hintToLabel(hint);
      const key = dedupeKey(label);
      if (seen.has(key) || exclude.has(key)) return;
      if (
        found.some(function (item) {
          return labelsOverlap(item.label, label);
        })
      ) {
        return;
      }
      seen.add(key);
      found.push({
        label: label,
        icon: TRUST_ICONS.default,
        category: "highlight",
        score: score,
      });
    });

    found.sort(function (a, b) {
      return b.score - a.score;
    });

    const result = found.slice(0, max);
    if (opts.section === "hero") {
      return assignHeroPlacements(result);
    }
    return result;
  }

  function assignHeroPlacements(highlights) {
    return (highlights || []).map(function (item, i) {
      return Object.assign({}, item, {
        placement: HERO_PLACEMENTS[i % HERO_PLACEMENTS.length],
      });
    });
  }

  /**
   * Fördela highlights över hero, about och services utan dubbletter.
   * @param {string} brief
   * @returns {{ hero: object[], about: object[], services: object[] }}
   */
  function distributeForSite(brief) {
    const all = extractFromBrief(brief, { max: 8 });
    if (!all.length) return { hero: [], about: [], services: [] };

    const heroCount = Math.min(3, all.length);
    const hero = assignHeroPlacements(all.slice(0, heroCount));
    const usedLabels = hero.map(function (h) {
      return h.label;
    });

    const rest = all.slice(heroCount).filter(function (item) {
      return !overlapsAny(item.label, usedLabels);
    });
    const about = [];
    const services = [];

    rest.forEach(function (item) {
      const bucket = about.length <= services.length ? about : services;
      if (bucket.length >= 3) return;
      if (overlapsAny(item.label, usedLabels)) return;
      bucket.push(item);
      usedLabels.push(item.label);
    });

    return { hero: hero, about: about, services: services };
  }

  function toGenerationBrief(distribution) {
    if (!distribution) return "";
    const parts = [];
    ["hero", "about", "services"].forEach(function (section) {
      const items = distribution[section] || [];
      if (items.length) {
        parts.push(
          section.charAt(0).toUpperCase() +
            section.slice(1) +
            " highlights: " +
            items
              .map(function (h) {
                return h.label;
              })
              .join(", "),
        );
      }
    });
    return parts.length ? "Highlight cards: " + parts.join(" · ") : "";
  }

  global.HighlightExtractionEngine = {
    VERSION: VERSION,
    extractFromBrief: extractFromBrief,
    distributeForSite: distributeForSite,
    assignHeroPlacements: assignHeroPlacements,
    toGenerationBrief: toGenerationBrief,
  };
})(typeof window !== "undefined" ? window : globalThis);
