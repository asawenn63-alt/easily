/**

 * Easily AI-assistent — avsikt först, förslag istället för exakta kommandon.

 *

 * Regler:

 * - Förstå avsikt innan svar.

 * - Mål/känsla → ge förslag och naturlig följdfråga (aldrig «skriv mer konkret»).

 * - Hjälpfrågor → EasilyKnowledge (körs efter avsikts- och designföljdsvar).

 * - Saknas funktion → säg det; hitta aldrig på funktioner.

 * - Upprepa aldrig samma svar i rad.

 * - Kort, hjälpsam, lösningsorienterad.

 */

(function (global) {

  "use strict";



  const FOLLOW_UP_MARKERS = [

    "hel design eller börjar",

    "börjar med en del",

    "börjar med någon särskild del",

    "vad vill du börja",

    "föreslår en hel design",

    "designfamilj",

    "mer exklusiv",

    "professionell känsla",

    "enklare och luftigare",

    "vilken känsla vill du",

  ];



  const recentReplies = [];

  const MAX_RECENT = 8;



  function normalize(cmd) {

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



  function rememberReply(text) {

    const msg = String(text || "").trim();

    if (!msg) return;

    recentReplies.push(msg);

    if (recentReplies.length > MAX_RECENT) recentReplies.shift();

  }



  function pickFresh(candidates) {

    const last = lastAssistantText();

    for (let i = 0; i < candidates.length; i++) {

      if (recentReplies.indexOf(candidates[i]) === -1 && candidates[i] !== last) return candidates[i];

    }

    return candidates[candidates.length - 1];

  }



  function familyLabel(id) {

    return global.DesignFamilies ? global.DesignFamilies.familyLabel(id) : id;

  }



  function suggestFamily(lower) {

    return global.DesignFamilies ? global.DesignFamilies.suggestForGoal(lower) : "salon";

  }



  function isDesignFollowUp(lower, lastLower) {

    if (!lastLower) return false;

    for (let i = 0; i < FOLLOW_UP_MARKERS.length; i++) {

      if (lastLower.indexOf(FOLLOW_UP_MARKERS[i]) !== -1) return true;

    }

    if (/vill du finjustera|vill du prova en annan|säg till om du vill justera/.test(lastLower)) {

      return true;

    }

    return false;

  }



  function inDesignConversation(lower) {

    return isDesignFollowUp(lower, lastAssistantText().toLowerCase());

  }



  function looksLikeDesignGoal(lower) {

    return (

      /exklusiv|exklusive|premium|lyx|elegant|finare|stilren|snyggare|lyxigare/.test(lower) ||

      /professionell|proffsig|seriös|förtroende|trovärdig/.test(lower) ||

      /enkel|luft|minimal|ren|modern|lekfull|varm|mjuk|tuff|kaxig|snygg/.test(lower) ||

      /känns|känsla|intryck|uttryck/.test(lower)

    );

  }



  function pendingImageContext() {
    const SW = global.StudioWelcome;
    if (!SW) return false;
    if (typeof SW.hasPendingImageCorrection === "function" && SW.hasPendingImageCorrection()) return true;
    if (typeof SW.hasRecentImageRequest === "function" && SW.hasRecentImageRequest()) return true;
    return false;
  }



  function looksLikeDesignIntent(lower) {

    if (pendingImageContext()) return false;

    if (/(bild|foto|hero|hammare|snickare|galleri).*(lägg|sätt|byt|in)|((lägg|sätt|byt).*(bild|foto|hero))/.test(lower)) {
      return false;
    }

    if (!looksLikeDesignGoal(lower)) return false;

    if (/^mer |jag vill|gör den|gör det|känns |känsla/.test(lower)) return true;

    return (

      /(kan du|kan ni|gör|göra|vill|hjälp|hjälpa|få|behöver|önskar)/.test(lower) ||

      /(sidan|sida|design|utseende|hemsidan|webb|webbsida)/.test(lower)

    );

  }



  function designGoalReply(lower) {

    if (/exklusiv|exklusive|premium|lyx|elegant|finare|stilren|lyxigare/.test(lower)) {

      return (

        "Absolut! Vi kan byta designkänsla — till exempel Varm eller Elegant. Samma text och bilder, annat uttryck. " +

        "Vill du att jag sätter en direkt, eller börjar vi med bilder eller text?"

      );

    }

    if (/professionell|proffsig|seriös|förtroende|trovärdig/.test(lower)) {

      return (

        "Absolut! Elegant ger ett professionellt och förtroendeingivande uttryck. " +

        "Vill du att jag sätter den direkt, eller börjar vi med en del i taget?"

      );

    }

    if (/modern/.test(lower)) {

      return (

        "Jag kan hjälpa dig med det. Prova Kontrast för ett modernt, tydligt uttryck — eller säg vilken känsla du vill ha."

      );

    }

    if (/enkel|luft|minimal|ren/.test(lower)) {

      return (

        "Vi kan göra sidan enklare och luftigare — Elegant är ljus och luftig, Kontrast är ren och tydlig. " +

        "Vill du att jag sätter en design direkt?"

      );

    }

    if (/lekfull|varm|mjuk/.test(lower)) {

      return (

        "Varm passar välkomnande sidor. " +

        "Vill du att jag sätter den, eller börjar vi med bilder eller text?"

      );

    }

    return pickFresh([

      "Vilken känsla vill du skapa — varm, elegant eller tydlig kontrast? Då föreslår jag nästa steg.",

      "Berätta kort vilken känsla du vill ha, så tar vi nästa steg.",

    ]);

  }



  function fallbackReply(lower) {

    if (
      /(gjorde fel|fel du|istället för|menade inte|bytte färg|syns inte|finns inte|retar|du har rätt|fixade|sa att|fortfarande grå)/.test(
        lower
      )
    ) {
      return null;
    }

    if (global.StudioWelcome && typeof global.StudioWelcome.isChatCorrection === "function") {
      if (global.StudioWelcome.isChatCorrection(lower)) return null;
    }

    const candidates = [];

    if (/(gjorde fel|fel du|istället för|menade inte|inte det jag|bytte färg)/.test(lower)) {
      return null;
    }

    if (/bild|foto|hero|logotyp|logo/.test(lower)) {
      if (
        global.StudioWelcome &&
        typeof global.StudioWelcome.hasRecentImageRequest === "function" &&
        global.StudioWelcome.hasRecentImageRequest()
      ) {
        return null;
      }
      if (
        global.StudioWelcome &&
        typeof global.StudioWelcome.hasPendingImageCorrection === "function" &&
        global.StudioWelcome.hasPendingImageCorrection()
      ) {
        return null;
      }

      if (
        !/(kan du|kan ni|lägg|sätt|byt|uppdatera|fixa|gör|ge mig|lägga in)/.test(lower) ||
        !/(hero|första|topp|bakgrund|start|galleri|tjänstekort|servicekort|kort|om oss)/.test(lower)
      ) {
        candidates.push(

          "Vill du byta bilder? Skriv t.ex. «lägg in en bild i hero», «lägg in bilder i galleriet» eller «lägg in bilder på tjänstekorten» — egna filer laddar du upp under Bilder & länkar."

        );
      }

    }

    if (/färg|tema|utseende|design|känsla|exklusiv|modern|snygg|professionell|lyx|designfamilj/.test(lower)) {

      candidates.push(

        "Easily har tre designval: Varm, Elegant och Kontrast. Samma innehåll — olika känsla. Vilken vill du prova?"

      );

    }

    if (/text|rubrik|innehåll|skriv|omskriv|formulering/.test(lower)) {

      if (
        !/(kan du|kan ni|byt|ändra|sätt|skriv om|uppdatera|omformulera)/.test(lower) ||
        /(bild|foto|logotyp|logo)/.test(lower)
      ) {
        candidates.push(

          "Skriv t.ex. «Byt rubriken till …» eller «Skriv om om oss» — då ändrar jag texten. Exakt redigering finns under Ändra själv."

        );
      }

    }

    if (/pris|meny|lista|kostnad/.test(lower)) {

      candidates.push("Skriv «prislista» så öppnar jag tabellverktyget — snabbare än att skriva alla priser här.");

    }

    if (/ta bort|dölj|rensa|mindre/.test(lower)) {

      candidates.push("Vilken sektion vill du ta bort eller förenkla?");

    }



    if (candidates.length) return pickFresh(candidates);



    return pickFresh([

      "Vad vill du uppnå med sidan? Jag kan hjälpa med design, text, bilder och prislista.",

      "Berätta kort vad du vill ändra — jag föreslår nästa steg.",

      "Vill du jobba med design, innehåll eller bilder?",

      "Vad känns viktigast just nu — design, text eller bilder?",

    ]);

  }



  function resolveFamilyFromText(lower) {

    if (global.DesignFamilies && typeof global.DesignFamilies.findByLabel === "function") {

      const hit = global.DesignFamilies.findByLabel(lower);

      if (hit) return hit;

    }

    if (/café|cafe|fika|kaffe|restaurang/.test(lower)) return "cafe";

    if (/salong|frisör|frisor|hår|skönhet/.test(lower)) return "salon";

    if (/foto|fotograf|portfolio|bildfokus/.test(lower)) return "fotograf";

    return suggestFamily(lower);

  }



  function resolve(cmd) {

    const lower = normalize(cmd);

    if (!lower) return { handled: false };

    if (
      /(gjorde fel|fel du|istället för|menade inte|bytte färg|färg istället för bild|syns inte|finns inte|retar|du har rätt|fixade|sa att)/.test(
        lower
      )
    ) {
      return { handled: false, fallback: null };
    }

    if (global.StudioWelcome && typeof global.StudioWelcome.isChatCorrection === "function") {
      if (global.StudioWelcome.isChatCorrection(lower)) {
        return { handled: false, fallback: null };
      }
    }

    if (
      /(lägg|sätt|byt|kan du|kan ni|gör|ge mig|lägga in).*(bild|foto|hero)/.test(lower) ||
      /(bild|foto|hero).*(lägg|sätt|byt|in|snickare|hammare)/.test(lower)
    ) {
      return { handled: false };
    }

    const lastLower = lastAssistantText().toLowerCase();



    if (isDesignFollowUp(lower, lastLower)) {

      if (/hela design|hel design|allt|gör allt|kör igång|föreslå allt|ja.*allt|alltihop/.test(lower)) {

        const fid = suggestFamily(lower);

        return {

          handled: true,

          action: "apply_design_family",

          familyId: fid,

          message:

            "Klart — jag satte " +

            familyLabel(fid) +

            ". Titta i förhandsvisningen. Vill du finjustera? Öppna Design.",

        };

      }

      if (/börja med|en del|del för del|någon del/.test(lower) && !/design|bild|text|typo/.test(lower)) {

        return {

          handled: true,

          action: "reply",

          message: "Bra — vill du börja med design, bilder eller text?",

        };

      }

      if (/design|designfamilj|utseende|känsla/.test(lower)) {

        const fid = resolveFamilyFromText(lower);

        return {

          handled: true,

          action: "apply_design_family",

          familyId: fid,

          message: "Jag satte " + familyLabel(fid) + ". Samma text och bilder — ny känsla. Vill du prova en annan? Öppna Design.",

        };

      }

      if (/typografi|typsnitt|font/.test(lower)) {

        return {

          handled: true,

          action: "open_tab",

          tabId: "design",

          message: "Design är öppet — där byter du känsla (Varm, Elegant, Kontrast).",

        };

      }

      if (/bild|hero|foto|layout|luft/.test(lower)) {

        if (pendingImageContext()) {
          return { handled: false, fallback: null };
        }

        return {

          handled: true,

          action: "open_tab",

          tabId: "material",

          message: "Bilder & länkar är öppet — där byter du hero-bild och laddar upp egna bilder.",

        };

      }

      if (/text|innehåll|rubrik/.test(lower)) {

        if (
          /(kan du|kan ni|byt|ändra|sätt|skriv om|uppdatera|omformulera)/.test(lower) &&
          !/(bild|foto|logotyp|logo)/.test(lower)
        ) {
          return { handled: false };
        }

        return {

          handled: true,

          action: "open_tab",

          tabId: "manual",

          message: "Ändra själv är öppet — klicka på fältet du vill redigera.",

        };

      }

      if (/^(ja|japp|gärna|ok|okej|absolut|visst|toppen|perfekt|bra)\b|låter bra|det låter/.test(lower)) {

        if (pendingImageContext()) {
          return { handled: false, fallback: null };
        }

        const fid = suggestFamily(lastLower || lower);

        return {

          handled: true,

          action: "apply_design_family",

          familyId: fid,

          message:

            "Klart — jag satte " +

            familyLabel(fid) +

            ". Säg till om du vill justera design, bilder eller text.",

        };

      }

      return {

        handled: true,

        action: "reply",

        message: pickFresh([

          "Vill du att jag sätter en design direkt, eller börjar vi med bilder eller text?",

          "Ska jag köra igång med en ny känsla, eller tar vi en del i taget?",

        ]),

      };

    }



    if (/(gör|skapa|sätt|byt till|vill ha|gör om till).*(café|cafe|salong|fotograf|foto)/.test(lower)) {

      const fid = resolveFamilyFromText(lower);

      return {

        handled: true,

        action: "apply_design_family",

        familyId: fid,

        message: familyLabel(fid) + " är satt. Vill du finjustera mer? Öppna Design.",

      };

    }



    if (looksLikeDesignIntent(lower)) {

      return { handled: true, action: "reply", message: designGoalReply(lower) };

    }



    if (/(vad kan du|vad kan jag|jag vet inte|fastnar)/.test(lower) && !inDesignConversation(lower)) {

      return {

        handled: true,

        action: "reply",

        message: pickFresh([

          "Jag kan hjälpa med design, text, bilder och prislista. Berätta vad du vill uppnå.",

          "Jag hjälper dig bygga och förbättra sidan — design, innehåll och bilder. Vad vill du börja med?",

        ]),

      };

    }



    if (/^(hjälp mig|hur gör jag)\b/.test(lower) && !inDesignConversation(lower)) {

      return {

        handled: true,

        action: "reply",

        message: pickFresh([

          "Jag kan hjälpa med design, text, bilder och prislista. Berätta vad du vill uppnå.",

          "Jag hjälper dig bygga och förbättra sidan — design, innehåll och bilder. Vad vill du börja med?",

        ]),

      };

    }



    return { handled: false, fallback: fallbackReply(lower) };

  }



  function handle(cmd, exec) {

    exec = exec || {};

    const result = resolve(cmd);

    if (result.fallback && !result.handled) {

      if (typeof exec.reply === "function") {

        exec.reply(result.fallback);

        rememberReply(result.fallback);

      }

      return true;

    }

    if (!result.handled) return false;



    if (result.action === "apply_design_family" && typeof exec.applyDesignFamily === "function") {

      exec.applyDesignFamily(result.familyId);

    } else if (result.action === "apply_exclusive_design" && typeof exec.applyDesignFamily === "function") {

      exec.applyDesignFamily(result.familyId || "cafe");

    } else if (result.action === "apply_theme" && typeof exec.applyDesignFamily === "function") {

      exec.applyDesignFamily(result.familyId || "cafe");

    } else if (result.action === "open_tab" && typeof exec.openTab === "function") {

      exec.openTab(result.tabId);

    }



    if (result.message && typeof exec.reply === "function") {

      exec.reply(result.message);

      rememberReply(result.message);

    }

    return true;

  }



  global.ChatIntent = {

    resolve: resolve,

    handle: handle,

    lastAssistantText: lastAssistantText,

    isDesignFollowUp: isDesignFollowUp,

    inDesignConversation: inDesignConversation,

  };

})(typeof window !== "undefined" ? window : globalThis);

