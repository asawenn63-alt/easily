/**
 * Text — AI-chatten kan byta text direkt (inte bara hänvisa till Ändra själv).
 */
(function (global) {
  "use strict";

  const SECTION_ALIASES = {
    hero: ["hero", "startsida", "start", "huvud", "första delen", "forsta delen"],
    about: ["about", "om oss", "om"],
    services: ["services", "tjänster", "tjanster", "meny", "priser", "tjänstekort", "tjanstekort"],
    gallery: ["gallery", "galleri"],
    faq: ["faq", "frågor", "fragor", "vanliga frågor"],
    booking: ["booking", "bokning", "boka"],
    contact: ["contact", "kontakt"],
    footer: ["footer", "sidfot"],
  };

  const SECTION_LABELS = {
    hero: "Hero",
    about: "Om oss",
    services: "Tjänster",
    gallery: "Galleri",
    faq: "Vanliga frågor",
    booking: "Bokning",
    contact: "Kontakt",
    footer: "Sidfot",
  };

  function inferSection(cmd) {
    const lower = String(cmd || "").toLowerCase();
    for (const id in SECTION_ALIASES) {
      if (SECTION_ALIASES[id].some(function (term) {
        return lower.indexOf(term) !== -1;
      })) {
        return id;
      }
    }
    return null;
  }

  function hasExplicitNewText(raw, cmd) {
    if (/(?:till|till:|ska vara|skall vara)\s+\S/.test(raw)) return true;
    if (/:\s*\S/.test(raw) && /(byt|ändra|sätt|skriv)/.test(cmd)) return true;
    return false;
  }

  function extractNewText(raw) {
    const s = String(raw || "").trim();
    const patterns = [
      /(?:byt|ändra|sätt|skriv)\s+(?:[\wåäöÅÄÖ\s-]+?\s+)?(?:till|till:)\s+["']?(.+?)["']?\s*$/i,
      /(?:rubriken|rubrik|texten|ingressen)\s+(?:ska vara|skall vara)\s+["']?(.+?)["']?\s*$/i,
      /(?:byt|ändra|sätt)\s+(?:texten|rubriken)\s*:\s*["']?(.+?)["']?\s*$/i,
    ];
    for (let i = 0; i < patterns.length; i++) {
      const m = s.match(patterns[i]);
      if (m && m[1]) return m[1].trim().slice(0, 2000);
    }
    return "";
  }

  function resolveField(cmd, sectionId) {
    const c = String(cmd || "").toLowerCase();
    const section = sectionId || "hero";

    if (/ingress|lead|underrubrik|text under|brödtext|brodtext/.test(c)) {
      return { section: "hero", key: "hero-lead" };
    }
    if (/om oss/.test(c) || section === "about") {
      if (/rubrik|titel|title/.test(c)) return { section: "about", key: "about-title" };
      if (/stycke 2|andra stycket|p2/.test(c)) return { section: "about", key: "about-p2" };
      return { section: "about", key: "about-p1" };
    }
    if (/tjänst|tjanst|service|meny|pris/.test(c) || section === "services") {
      if (/rubrik|titel|title/.test(c)) return { section: "services", key: "services-title" };
      return { section: "services", key: "services-lead" };
    }
    if (/galleri|gallery/.test(c) || section === "gallery") {
      if (/rubrik|titel|title/.test(c)) return { section: "gallery", key: "gallery-title" };
      return { section: "gallery", key: "gallery-lead" };
    }
    if (/faq|frågor|fragor/.test(c) || section === "faq") {
      return { section: "faq", key: "faq-title" };
    }
    if (/bokning|booking|meny/.test(c) || section === "booking") {
      if (/rubrik|titel|title/.test(c)) return { section: "booking", key: "booking-title" };
      return { section: "booking", key: "booking-lead" };
    }
    if (/kontakt|contact/.test(c) || section === "contact") {
      if (/telefon|phone/.test(c)) return { section: "contact", key: "contact-phone" };
      if (/e-?post|email|mail/.test(c)) return { section: "contact", key: "contact-email" };
      if (/adress|address/.test(c)) return { section: "contact", key: "contact-address" };
      if (/rubrik|titel|title/.test(c)) return { section: "contact", key: "contact-title" };
      return { section: "contact", key: "contact-lead" };
    }
    if (/footer|sidfot|företagsnamn|foretagsnamn/.test(c) || section === "footer") {
      return { section: "footer", key: "footer-brand" };
    }
    if (/rubrik|titel|headline|huvudrubrik/.test(c)) {
      return { section: "hero", key: "hero-title" };
    }
    if (/text|ingress|beskrivning/.test(c)) {
      return { section: "hero", key: "hero-lead" };
    }
    return { section: section || "hero", key: "hero-title" };
  }

  function applyContentField(sectionId, key, value) {
    const SS = global.SiteState;
    const EE = global.EditorEngine;
    if (!SS || !SS.patch || !value) return false;
    SS.patch(function (doc) {
      if (!doc.sections) doc.sections = {};
      if (!doc.sections[sectionId]) doc.sections[sectionId] = { content: {}, hidden: false };
      if (!doc.sections[sectionId].content) doc.sections[sectionId].content = {};
      doc.sections[sectionId].content[key] = value;
      if (sectionId === "footer" && key === "footer-brand" && global.AppDocument && typeof global.AppDocument.ensureTextLogo === "function") {
        global.AppDocument.ensureTextLogo(doc, { brand: value });
      }
    });
    SS.save();
    if (EE && EE.remount) EE.remount();
    return true;
  }

  function wantsDirectTextSet(cmd, raw) {
    if (!hasExplicitNewText(raw, cmd)) return false;
    return /(byt|ändra|sätt|skriv)\s+(rubriken|rubrik|texten|ingressen|ingress|beskrivningen)/.test(cmd) ||
      /rubriken\s+(ska vara|skall vara)/.test(cmd);
  }

  function wantsTextRegeneration(cmd, raw) {
    if (hasExplicitNewText(raw, cmd)) return false;
    if (/skriv om|generera om|ny text|nytt innehåll|förnya|omformulera|uppdatera text|byt text|byta text|ändra text|ändra innehåll/.test(cmd)) {
      return true;
    }
    if (/(kan du|kan ni|kan ju|gör|hjälp mig|snälla|please).*(ändra|byta|skriva om|uppdatera).*(text|rubrik|ingress|innehåll)/.test(cmd)) {
      return true;
    }
    if (/(ändra|byt|uppdatera).*(text|rubrik|ingress)/.test(cmd) && !/(bild|foto|logotyp|logo)/.test(cmd)) {
      return true;
    }
    return false;
  }

  function wantsTextAction(cmd, raw) {
    return wantsDirectTextSet(cmd, raw) || wantsTextRegeneration(cmd, raw);
  }

  async function regenerateSection(sectionId, opts) {
    opts = opts || {};
    const AIActions = global.AIActions;
    const AI = global.AISiteBuilder;
    const EE = global.EditorEngine;
    const SS = global.SiteState;
    const ES = global.EditSession;
    const target = sectionId || "hero";
    const lockKey = target + ":text";
    if (ES && typeof ES.isComponentLocked === "function" && ES.isComponentLocked(lockKey)) {
      return { ok: false, verified: false, failureReason: "locked" };
    }
    const userText = String(opts.userText || "").trim();
    const variant =
      opts.variant ||
      (/igen|annan|another|ny version|skriv om|omformulera|varmare|professionell|vänligare|lyxigare|mindre sälj/.test(
        userText.toLowerCase(),
      )
        ? "another"
        : undefined);
    const fillOpts = { userText: userText, variant: variant, nonce: Date.now() };
    if (AIActions && typeof AIActions.runSectionTarget === "function") {
      await AIActions.runSectionTarget(target);
    } else if (AI && typeof AI.fillHero === "function" && target === "hero") {
      const run = function () {
        return AI.fillHero(fillOpts);
      };
      if (typeof AI.withMacroGeneration === "function") {
        await AI.withMacroGeneration(run);
      } else {
        await run();
      }
      SS && SS.save && SS.save();
      EE && EE.remount && EE.remount();
    } else if (AI && typeof AI.fillSection === "function") {
      await AI.fillSection(target, fillOpts);
      SS && SS.save && SS.save();
      EE && EE.remount && EE.remount();
    } else {
      return { ok: false, verified: false, failureReason: "no_ai" };
    }
    if (typeof EE.remountAsync === "function") await EE.remountAsync();
    else if (EE && EE.remount) EE.remount();
    return { ok: true, verified: true };
  }

  /** @deprecated Intent classification moved to Intent Resolution Engine. Execution only. */
  function parseIntent(text) {
    return null;
  }

  /** Pipeline: execute text intent with verification. */
  async function executeIntent(intent, text) {
    const raw = String(text || "").trim();
    const cmd = raw.toLowerCase();

    if (intent.type === "text.set") {
      const value = extractNewText(raw);
      if (!value) {
        return {
          ok: false,
          verified: false,
          message: "Skriv vad texten ska vara — till exempel «Byt rubriken till …».",
          failureReason: "missing_value",
        };
      }
      const sectionId = intent.meta.sectionId;
      const fieldKey = intent.meta.fieldKey;
      const applied = applyContentField(sectionId, fieldKey, value);
      const EE = global.EditorEngine;
      if (typeof EE.remountAsync === "function") await EE.remountAsync();
      const after = readSectionText(sectionId, fieldKey);
      const ok = applied && after === value;
      return {
        ok: ok,
        verified: ok,
        message: ok
          ? ""
          : "Det där blev inte som jag tänkte.\n\nVill du att jag provar igen?",
        failureReason: ok ? null : "text_unchanged",
      };
    }

    if (intent.type === "text.regen") {
      const sectionId = intent.meta.sectionId || "hero";
      const execText = String(intent.command || raw).trim();
      const before = hashSection(global.SiteState && global.SiteState.get && global.SiteState.get(), sectionId);
      const regen = await regenerateSection(sectionId, { userText: execText, variant: "another" });
      const afterDoc = global.SiteState && global.SiteState.get && global.SiteState.get();
      const after = hashSection(afterDoc, sectionId);
      const changed = before !== after;
      const ok = regen.ok !== false && changed;
      return {
        ok: ok,
        verified: ok,
        message: ok
          ? ""
          : "Det där satt inte riktigt.\n\nVill du att jag provar igen, eller skriver du exakt text med «Byt rubriken till …»?",
        failureReason: ok ? null : "section_unchanged",
      };
    }

    return { ok: false, verified: false, failureReason: "unknown_text_intent" };
  }

  function readSectionText(sectionId, key) {
    const SS = global.SiteState;
    const doc = SS && SS.get ? SS.get() : null;
    if (!doc || !doc.sections || !doc.sections[sectionId]) return "";
    return String((doc.sections[sectionId].content || {})[key] || "").trim();
  }

  function hashSection(doc, sectionId) {
    const sec = doc && doc.sections && doc.sections[sectionId];
    if (!sec) return "";
    return JSON.stringify(sec.content || {}) + "|" + (sec.hidden ? "1" : "0");
  }

  function handleTextChatCommand(text) {
    const raw = String(text || "").trim();
    const cmd = raw.toLowerCase();
    if (!cmd || !wantsTextAction(cmd, raw)) return null;

    if (wantsDirectTextSet(cmd, raw)) {
      const value = extractNewText(raw);
      if (!value) {
        return {
          handled: true,
          message: "Skriv vad texten ska vara — till exempel «Byt rubriken till Vägledning när du behöver klarhet».",
        };
      }
      const sectionHint = inferSection(cmd);
      const field = resolveField(cmd, sectionHint);
      if (applyContentField(field.section, field.key, value)) {
        const label = SECTION_LABELS[field.section] || field.section;
        return { handled: true, message: "" };
      }
      return { handled: true, message: "Det gick inte just nu — vill du att jag provar igen?" };
    }

    const section = inferSection(cmd) || "hero";
    const label = SECTION_LABELS[section] || section;
    return {
      handled: true,
      async: true,
      run: function () {
        return regenerateSection(section, { userText: raw, variant: "another" });
      },
      message:
        "Jag skriver om " + label.toLowerCase() + ".\n\nInte som du tänkte dig? Skriv exakt text med «Byt rubriken till …», eller tryck Ctrl+Z.",
    };
  }

  global.TextChatCommands = {
    inferSection: inferSection,
    applyContentField: applyContentField,
    handleTextChatCommand: handleTextChatCommand,
    wantsTextAction: wantsTextAction,
    parseIntent: parseIntent,
    executeIntent: executeIntent,
  };
})(typeof window !== "undefined" ? window : globalThis);
