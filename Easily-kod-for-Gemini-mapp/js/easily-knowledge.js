/**
 * EASILY — KUNSKAP & AI-assistentregler
 *
 * AI-assistenten ska:
 * - Förstå avsikt innan svar (mål/känsla → förslag, inte exakta kommandon).
 * - Besvara hjälpfrågor direkt och hänvisa till rätt flik.
 * - Aldrig hitta på funktioner; säg om något saknas.
 * - Aldrig upprepa samma standardsvar.
 * - Ställa naturliga följdfrågor vid behov.
 * - Vara kort, hjälpsam och lösningsorienterad.
 */
(function (global) {
  "use strict";

  const RULES = [
    "Hitta aldrig på funktioner.",
    "Hänvisa bara till funktioner som finns i Easily.",
    "Om en funktion saknas, säg det.",
    "Hur Easily fungerar → svara kort, hänvisa till rätt flik.",
    "AI kan inte automatiskt → öppna eller hänvisa till rätt flik.",
    "Be aldrig användaren göra saker som Easily inte stöder.",
    "Kom ihåg tidigare frågor i samma konversation.",
    "Håll svaren korta och konkreta.",
  ];

  const TABS = [
    { id: "ai", label: "AI" },
    { id: "design", label: "Design" },
    { id: "material", label: "Bilder & länkar" },
    { id: "manual", label: "Ändra själv" },
  ];

  function familyLabels() {
    if (global.DesignFamilies && typeof global.DesignFamilies.familyLabels === "function") {
      return global.DesignFamilies.familyLabels();
    }
    return ["Varm", "Elegant", "Kontrast"];
  }

  function themeLabels() {
    return familyLabels();
  }

  const UNSUPPORTED_THEME_WORDS =
    /röd|rosa|lila|orange|gul|grå|turkos|neon|pastell|mörkblå(?!.*professional)/;

  const recentReplies = [];
  const recentTopics = [];
  const MAX_RECENT = 6;

  function tabLabels() {
    return TABS.map(function (t) {
      return t.label;
    });
  }

  function tabLabel(id) {
    const t = TABS.find(function (x) {
      return x.id === id;
    });
    return t ? t.label : id;
  }

  function normalizeCmd(cmd) {
    return String(cmd || "")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, " ");
  }

  function lastAssistantText() {
    const thread = document.getElementById("studioChatThread");
    const msgs = thread ? thread.querySelectorAll(".studio-chat__msg--assistant p:last-child") : [];
    if (!msgs.length) return "";
    return String(msgs[msgs.length - 1].textContent || "").trim();
  }

  function rememberTopic(cmd, topic) {
    recentTopics.push({ cmd: normalizeCmd(cmd), topic: topic });
    if (recentTopics.length > MAX_RECENT) recentTopics.shift();
  }

  function lastTopic() {
    return recentTopics.length ? recentTopics[recentTopics.length - 1].topic : null;
  }

  function pickFresh(candidates) {
    for (let i = 0; i < candidates.length; i++) {
      if (recentReplies.indexOf(candidates[i]) === -1) return candidates[i];
    }
    return candidates[candidates.length - 1];
  }

  function replyOnce(message) {
    const msg = String(message || "").trim();
    if (!msg) return { handled: false };
    if (recentReplies.indexOf(msg) !== -1 || msg === lastAssistantText()) {
      return {
        handled: true,
        message: pickFresh([
          "Vad vill du göra härnäst?",
          "Vill du fortsätta med design, bilder eller text?",
          "Jag hjälper dig vidare — vad behöver du?",
        ]),
      };
    }
    recentReplies.push(msg);
    if (recentReplies.length > MAX_RECENT) recentReplies.shift();
    return { handled: true, message: msg };
  }

  function openTabAnswer(tabId, message) {
    const r = replyOnce(message);
    r.openTab = tabId;
    return r;
  }

  function offerOpenTab(tabId, message) {
    const r = replyOnce(message);
    r.offerOpen = true;
    r.tabId = tabId;
    return r;
  }

  function findFamilyInText(lower) {
    if (global.DesignFamilies && typeof global.DesignFamilies.findByLabel === "function") {
      const id = global.DesignFamilies.findByLabel(lower);
      if (id) return { id: id, label: global.DesignFamilies.familyLabel(id) };
    }
    if (/café|cafe/.test(lower)) return { id: "cafe", label: "Varm" };
    if (/salong/.test(lower)) return { id: "salon", label: "Elegant" };
    if (/fotograf|foto/.test(lower)) return { id: "fotograf", label: "Kontrast" };
    return null;
  }

  function findThemeInText(lower) {
    return findFamilyInText(lower);
  }

  function matchUnsupportedFeature(lower) {
    if (/pdf|word|docx/.test(lower) && /(importera|ladda upp|prislista)/.test(lower)) {
      return replyOnce(
        "PDF och Word stöds inte för prislista ännu. Använd .csv/.txt, klistra in från Excel, eller skriv «prislista»."
      );
    }
    if (/(tema|färg|palett|färgtema|designfamilj)/.test(lower) && !findFamilyInText(lower) && UNSUPPORTED_THEME_WORDS.test(lower)) {
      return replyOnce(
        "Den färgen finns inte som egen designfamilj ännu. Tillgängliga designfamiljer: " + familyLabels().join(", ") + "."
      );
    }
    if (/eget css|custom css|egen kod|html-kod|javascript/.test(lower)) {
      return replyOnce("Egen CSS eller kod stöds inte i Easily — använd flikarna AI, Design, Bilder & länkar och Ändra själv.");
    }
    if (/flera sidor|undersida|blogg|webshop|e-handel|betala online/.test(lower)) {
      return replyOnce("Flera sidor, webshop och betalning stöds inte i den här versionen av Easily.");
    }
    if (/drag|dra och släpp|flytta sektion/.test(lower)) {
      return replyOnce("Sektioner kan inte flyttas med drag-and-drop i Easily ännu. Du kan dölja sektioner via chatten.");
    }
    return null;
  }

  function matchAffirmativeFollowUp(lower) {
    if (!/^(ja|japp|javisst|gärna|ok|okej|öppna|absolut|visst|gör det)\b/.test(lower)) return null;
    const last = lastAssistantText().toLowerCase();
    if (last.indexOf("bilder & länkar") !== -1) return openTabAnswer("material", tabLabel("material") + " är öppet.");
    if (last.indexOf("design") !== -1) return openTabAnswer("design", tabLabel("design") + " är öppet.");
    if (last.indexOf("ändra själv") !== -1) return openTabAnswer("manual", tabLabel("manual") + " är öppet.");
    if (last.indexOf("ai-fliken") !== -1 || last.indexOf(" ai ") !== -1) {
      return openTabAnswer("ai", tabLabel("ai") + " är öppen.");
    }
    const topic = lastTopic();
    if (topic === "theme" || topic === "design" || topic === "appearance") {
      return openTabAnswer("design", tabLabel("design") + " är öppet.");
    }
    if (topic === "logo" || topic === "hero" || topic === "material") {
      return openTabAnswer("material", tabLabel("material") + " är öppet.");
    }
    if (topic === "manual") return openTabAnswer("manual", tabLabel("manual") + " är öppet.");
    if (topic === "ai") return openTabAnswer("ai", tabLabel("ai") + " är öppen.");
    return null;
  }

  function matchContextFollowUp(lower, cmd) {
    if (!/^(hur|var|visa|öppna|gå till)\b/.test(lower) || lower.length > 48) return null;
    const topic = lastTopic();
    if (!topic) return null;
    if (topic === "logo" || topic === "hero") {
      return offerOpenTab("material", tabLabel("material") + " — där hanterar du bilder. Ska jag öppna fliken?");
    }
    if (topic === "theme" || topic === "design") {
      return offerOpenTab("design", tabLabel("design") + " — där byter du designfamilj. Ska jag öppna fliken?");
    }
    if (topic === "text") {
      return offerOpenTab("manual", tabLabel("manual") + " — där redigerar du text direkt. Ska jag öppna fliken?");
    }
    if (topic === "pricelist") {
      return replyOnce("Skriv «prislista» här i AI-fliken så öppnas tabellverktyget.");
    }
    return null;
  }

  function matchCommand(cmd) {
    const lower = normalizeCmd(cmd);
    if (!lower) return { handled: false };

    if (global.ChatIntent && typeof global.ChatIntent.inDesignConversation === "function") {
      if (global.ChatIntent.inDesignConversation(lower)) {
        return { handled: false };
      }
    }

    const unsupported = matchUnsupportedFeature(lower);
    if (unsupported) return unsupported;

    const affirm = matchAffirmativeFollowUp(lower);
    if (affirm) return affirm;

    const contextFollow = matchContextFollowUp(lower, cmd);
    if (contextFollow) return contextFollow;

    if (/^(öppna|gå till|visa)\s+(design|utseende|designfamilj)/.test(lower) || /^design$/.test(lower) || /^utseende$/.test(lower)) {
      rememberTopic(cmd, "design");
      return openTabAnswer("design", tabLabel("design") + " — välj designfamilj här.");
    }
    if (/^(öppna|gå till|visa)\s+(bilder|länkar|material)/.test(lower) || /^bilder & länkar$/.test(lower)) {
      rememberTopic(cmd, "material");
      return openTabAnswer("material", tabLabel("material") + " — ladda upp bilder och hantera länkar här.");
    }
    if (/^(öppna|gå till|visa)\s+(ändra själv|manual)/.test(lower) || /^ändra själv$/.test(lower)) {
      rememberTopic(cmd, "manual");
      return openTabAnswer("manual", tabLabel("manual") + " — klicka på ett fält och skriv direkt.");
    }
    if (/^(öppna|gå till|visa)\s+ai\b/.test(lower) || /^ai-fliken$/.test(lower)) {
      rememberTopic(cmd, "ai");
      return openTabAnswer("ai", tabLabel("ai") + " — skriv här vad du vill ändra.");
    }

    if (/vilka flikar|vilka tabbar|hur fungerar easily|vad finns i easily/.test(lower)) {
      rememberTopic(cmd, "tabs");
      return replyOnce(
        "Fyra flikar: " +
          tabLabels().join(", ") +
          ". AI för snabba ändringar, Design för designfamiljer, Bilder & länkar för uppladdning, Ändra själv för exakt text."
      );
    }

    if (/vilka design|designfamilj|lista.*design|vilka färg|vilka tema|färgteman/.test(lower)) {
      rememberTopic(cmd, "design");
      return offerOpenTab(
        "design",
        "Designfamiljer: " + familyLabels().join(", ") + ". Välj under " + tabLabel("design") + ". Ska jag öppna fliken?"
      );
    }

    if (
      /textlogotyp|text logotyp|var (är|finns|skapas).*logotyp|var (är|finns|skapas).*loggan|logotyp.*(var|finns|skapas)/.test(
        lower
      )
    ) {
      rememberTopic(cmd, "logo");
      return replyOnce(
        "Easily skapar en tillfällig branschlogotyp högst upp — ikon och namn i din branschfärg. " +
          "Ladda upp egen bildlogotyp under " +
          tabLabel("material") +
          "."
      );
    }

    if (
      (/hur.*(hero|bakgrund|bakgrundsbild|hero-bild)/.test(lower) ||
        /var.*(hero|bakgrund|hero-bild)/.test(lower)) &&
      !/(lägg|sätt|byt|uppdatera|fixa|kan du|kan ni|gör|ge mig|lägga in|sätta in)/.test(lower)
    ) {
      rememberTopic(cmd, "hero");
      return offerOpenTab(
        "material",
        "Hero-bilden byter du under " +
          tabLabel("material") +
          ", eller skriv «lägg in en bild i hero» så väljer jag en åt dig. Ska jag öppna fliken?"
      );
    }

    if (
      /(snickare|hantverk|verktyg|träarbete|snickeri)/.test(lower) &&
      /(bild|hero|foto|ser ut|hur.*ser|stock)/.test(lower)
    ) {
      rememberTopic(cmd, "hero");
      return replyOnce(
        "För snickare väljer jag bilder med verktyg, såg och trä i verkstad — inte ritningar, kontor eller arkitekt. " +
          "Skriv «byt hero-bild till snickare» så byter jag, eller ladda upp egen bild under " +
          tabLabel("material") +
          "."
      );
    }

    if (/hur.*(logotyp|logo)/.test(lower) || /var.*(logotyp|logo)/.test(lower)) {
      rememberTopic(cmd, "logo");
      return offerOpenTab("material", "Bildlogotyp laddar du upp under " + tabLabel("material") + ". Ska jag öppna fliken?");
    }

    if (
      /hur.*(färg|färger|tema|typografi|utseende|palett)/.test(lower) ||
      /var.*(färg|färger|tema|typografi|utseende|palett)/.test(lower)
    ) {
      rememberTopic(cmd, "design");
      return offerOpenTab("design", "Designfamiljer väljer du under " + tabLabel("design") + ". Ska jag öppna fliken?");
    }

    if (
      /hur (redigerar|ändrar|byta|byter).*(text|själv|ord)/.test(lower) &&
      !/(kan du|kan ni|gör|hjälp)/.test(lower)
    ) {
      rememberTopic(cmd, "text");
      return offerOpenTab(
        "manual",
        "Exakt text skriver du under " +
          tabLabel("manual") +
          ". Vill du att AI ska skriva om? Skriv t.ex. «Skriv om hero» eller «Byt rubriken till …». Ska jag öppna Ändra själv?"
      );
    }

    if (/prislista|prislist/.test(lower) && /(hur|var|lägga|skapa|finns)/.test(lower)) {
      rememberTopic(cmd, "pricelist");
      return replyOnce("Skriv «prislista» i " + tabLabel("ai") + " — då får du tabellverktyget.");
    }

    const themeHit = findThemeInText(lower);
    if (themeHit && /(gör|sätt|skapa|byt till|vill ha en|gör om till)\s/.test(lower)) {
      return { handled: false };
    }
    if (themeHit && /(välja|byta|ändra|sätta|använda|design|tema|palett|vill)/.test(lower)) {
      rememberTopic(cmd, "design");
      return offerOpenTab(
        "design",
        "«" + themeHit.label + "» väljer du under " + tabLabel("design") + ". Ska jag öppna fliken?"
      );
    }

    if (
      /(vill|ska|kan).*(välja|byta|ändra).*(design|designfamilj|tema|färg|palett|typsnitt|utseende)/.test(lower) ||
      (/^(byt|ändra)\s+(design|designfamilj|tema|färg|palett|typsnitt)/.test(lower) && !/hero|rubrik/.test(lower))
    ) {
      rememberTopic(cmd, "design");
      return openTabAnswer("design", tabLabel("design") + " är öppet — välj designfamilj.");
    }

    if (
      /(ladda upp|upload).*(bild|logotyp|hero)/.test(lower) ||
      /(egen|eget).*(hero|logotyp)/.test(lower)
    ) {
      rememberTopic(cmd, "material");
      return openTabAnswer("material", tabLabel("material") + " — där laddar du upp filer.");
    }

    if (/ändra själv|redigera själv|texten själv|skriva själv|skriv själv/.test(lower)) {
      rememberTopic(cmd, "manual");
      return openTabAnswer("manual", tabLabel("manual") + " — klicka på fältet du vill redigera.");
    }

    if (/publicera|gå live|domän|dns|ssl|betala/.test(lower) && /(hur|när|kan|fungerar)/.test(lower)) {
      return replyOnce("Publicering och betalning sker utanför studion. Redigera klart sidan här först.");
    }

    return { handled: false };
  }

  function handleCommand(cmd, helpers) {
    helpers = helpers || {};
    const result = matchCommand(cmd);
    if (!result.handled) return false;
    if (result.openTab && typeof helpers.openTab === "function") {
      helpers.openTab(result.openTab);
    }
    if (result.message && typeof helpers.reply === "function") {
      helpers.reply(result.message);
    }
    return true;
  }

  global.EasilyKnowledge = {
    RULES: RULES,
    TABS: TABS,
    familyLabels: familyLabels,
    themeLabels: themeLabels,
    tabLabels: tabLabels,
    matchCommand: matchCommand,
    handleCommand: handleCommand,
  };
})(typeof window !== "undefined" ? window : globalThis);
