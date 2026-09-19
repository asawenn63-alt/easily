/**
 * AI Site Studio — mockad motor med bransch-, mall- och sektionskontext.
 * Läs `data-industry` och `data-template` från document.body (sätts i editorn).
 * Byt mot riktigt API: behåll samma publika metoder (generate, fillSection, …).
 *
 * Sidlayout, typografi och sektionskomposition styrs av tema + mall + bransch (CSS + visual-stock).
 * Här väljs mestadels texter från kuraterade listor; bildförslag går via VisualStock.
 */
(function (global) {
  "use strict";

  const delay = (ms) => new Promise((r) => setTimeout(r, ms));

  /** Ökar vid varje AI-körning (utom snabb makro i onboarding) så samma sektion kan ge ny text vid nästa klick. */
  let aiFillNonce = 0;

  function hashStr(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
    return Math.abs(h);
  }

  function collectSiteIndustryText(doc) {
    if (!doc || !doc.page) return "";
    const parts = [];
    if (doc.page.onboardingDescription) parts.push(doc.page.onboardingDescription);
    if (doc.page.location) parts.push(doc.page.location);
    if (doc.page.textLogoSubline) parts.push(doc.page.textLogoSubline);
    const footer = doc.sections && doc.sections.footer && doc.sections.footer.content;
    if (footer && footer["footer-brand"]) parts.push(footer["footer-brand"]);
    const hero = doc.sections && doc.sections.hero && doc.sections.hero.content;
    if (hero && hero["hero-title"]) parts.push(hero["hero-title"]);
    if (hero && hero["hero-lead"]) parts.push(hero["hero-lead"]);
    return parts.join(" ");
  }

  const KONSULT_HERO_MARKERS = /whiteboard|mätbar effekt|strategi|workshop|boka intro|organisation|beslut/i;

  function resolveExpectedIndustryFromDoc(doc) {
    if (!doc || !doc.page) return null;
    const blob = collectSiteIndustryText(doc);
    const fromBrand = inferIndustryFromBrand(blob);
    if (fromBrand) return fromBrand;
    const desc = String(doc.page.onboardingDescription || "").trim();
    const inf = inferIndustryFromDescription(desc || blob);
    if (inf.key && inf.key !== "verksamhet" && inf.key !== "konsult") {
      if (inf.confidence === "high" || inf.confidence === "medium") return inf.key;
      if (inf.score >= 3) return inf.key;
    }
    if (inf.key === "miljo" && inf.score >= 2) return "miljo";
    return null;
  }

  /** Rätta page.industry när logotyp/namn/beskrivning säger annat än sparad bransch. */
  function syncIndustryInDocument(doc) {
    if (!doc || !doc.page) return false;
    if (doc.page.compositionLocked) return false;
    const blob = collectSiteIndustryText(doc);
    let fromSignals = inferIndustryFromBrand(blob);
    const desc = String(doc.page.onboardingDescription || "").trim();
    if (desc) {
      const inf = inferIndustryFromDescription(desc);
      if (inf.key && inf.key !== "verksamhet") {
        const strong = inf.confidence === "high" || inf.confidence === "medium";
        const trade = inf.key !== "konsult" && inf.score >= 3;
        if (strong || (trade && (!fromSignals || fromSignals === "konsult"))) {
          fromSignals = inf.key;
        } else if (inf.key === "miljo" && inf.score >= 2 && !fromSignals) {
          fromSignals = "miljo";
        }
      }
    }
    if (!fromSignals) return false;
    const cur = String(doc.page.industry || "verksamhet").trim() || "verksamhet";
    if (fromSignals === cur) return false;
    const tradeLocked =
      cur !== "konsult" &&
      cur !== "verksamhet" &&
      inferIndustryFromBrand(cur) === cur &&
      !/(snick|snickeri|bygg|hantverk|atervinn|återvinn|jretur|retur|avfall)/.test(blob.toLowerCase());
    if (tradeLocked) return false;
    doc.page.industry = fromSignals;
    return true;
  }

  function guessBriefFromDocument(doc) {
    if (!doc || !doc.page) return "";
    const GI = global.GenerationIntegrity;
    const isValidBrief = function (text) {
      if (GI && typeof GI.isValidBusinessBrief === "function") {
        return GI.isValidBusinessBrief(text);
      }
      const raw = String(text || "").trim();
      return raw.length >= 8;
    };
    const ob = String(doc.page.onboardingDescription || "").trim();
    if (ob && isValidBrief(ob)) return ob;
    const footer = doc.sections && doc.sections.footer && doc.sections.footer.content;
    const brand = footer && String(footer["footer-brand"] || "").trim();
    const loc = String(doc.page.location || "").trim();
    const ind = String(doc.page.industry || "").trim();
    if (brand && /snick|snickeri|bygg|hantverk/i.test(brand + " " + ind)) {
      return (
        "Snickerifirma " +
        brand +
        (loc && brand.toLowerCase().indexOf(loc.toLowerCase()) < 0 ? " i " + loc : "") +
        " — bygg, renovering och kök"
      );
    }
    if (brand && /jretur|retur|atervinn|återvinn|ovh|avfall|sophamt/i.test(brand + " " + ind)) {
      return (
        "Återvinning " +
        brand +
        (loc && brand.toLowerCase().indexOf(loc.toLowerCase()) < 0 ? " i " + loc : "") +
        " — hämtning, sortering och container"
      );
    }
    if (brand) {
      return brand + (loc ? " i " + loc : "") + " — " + (ind || "verksamhet");
    }
    return "";
  }

  function siteHasIndustryCopyMismatch(doc) {
    if (!doc || !doc.page) return false;
    const ind = String(doc.page.industry || "konsult").trim() || "konsult";
    const heroTitle = String(doc.sections?.hero?.content?.["hero-title"] || "");
    const heroLead = String(doc.sections?.hero?.content?.["hero-lead"] || "");
    const heroBlob = heroTitle + " " + heroLead;
    const hasKonsultCopy = KONSULT_HERO_MARKERS.test(heroBlob);
    const expected = resolveExpectedIndustryFromDoc(doc);

    if (hasKonsultCopy && expected && expected !== ind) return true;
    if (hasKonsultCopy && ind !== "konsult" && ind !== "verksamhet") return true;
    if (ind === "byggfirma" && hasKonsultCopy) return true;
    if (ind === "miljo" && hasKonsultCopy) return true;
    return false;
  }

  /** Läs bransch från state — mutera inte state mitt i generering (sync körs explicit före/efter). */
  function getIndustry() {
    if (global.__AI_INDUSTRY_FROZEN__) return global.__AI_INDUSTRY_FROZEN__;
    try {
      const d = global.SiteState?.get?.();
      if (d?.page?.industry) return d.page.industry;
    } catch (e) {
      /* ignore */
    }
    return document.body.getAttribute("data-industry") || "verksamhet";
  }

  const LEGACY_TEMPLATE_IDS = {
    "modern-agency": "editorial",
    "minimal-portfolio": "swiss-grid",
    event: "landmark",
    restaurant: "atelier",
    "neo-brutal": "landmark",
  };
  const ALLOWED_TEMPLATE_IDS = new Set(["editorial", "atelier", "swiss-grid", "luxury-brand", "landmark"]);

  function normalizeTemplateId(raw) {
    const r = (raw || "editorial").trim();
    const mapped = LEGACY_TEMPLATE_IDS[r] || r;
    return ALLOWED_TEMPLATE_IDS.has(mapped) ? mapped : "editorial";
  }

  function getTemplate() {
    try {
      const d = global.SiteState?.get?.();
      if (d?.page?.template) return normalizeTemplateId(d.page.template);
    } catch (e) {
      /* ignore */
    }
    return normalizeTemplateId(document.body.getAttribute("data-template"));
  }

  /**
   * @typedef {{
   *   label: string;
   *   copyTone: string;
   *   heroTitle: string[];
   *   heroLead: string[];
   *   about: string[];
   *   servicesTitle: string[];
   *   servicesLead: string[];
   *   services: { title: string; body: string }[];
   *   galleryTitle: string[];
   *   galleryLead: string[];
   *   faqTitle: string[];
   *   faq: { q: string; a: string }[];
   *   cta: string[];
   *   keywords: string[];
   * }} IndustryPack
   */

  /** @type {Record<string, IndustryPack>} */
  const INDUSTRIES = {
    frisor: {
      label: "Frisör",
      copyTone: "salong: trygghet, hantverk, bokning — aldrig “förvandla dig”-språk",
      heroTitle: [
        "Stil som känns — från första klippet",
        "Ditt hår, vår konstnärliga signatur",
        "Salong med lugn lyx i centrum",
        "Klippning och färg med tid att lyssna",
      ],
      heroLead: [
        "Boka tid online. Vi jobbar med utvalda professionella serier och anpassar behandlingen efter din textur och vardag.",
        "Från konsultation till finish — mjuk service, tydliga priser och inga överraskningar i kassan.",
        "Vi tar oss tid för rådgivning innan sax eller färg — resultatet ska hålla hemma också.",
      ],
      about: [
        "Vi är ett litet team med stort hjärta för hantverk och detaljer. Hos oss får du landa innan saxen möter håret.",
        "Hållbar skönhet: vi väljer produkter med omsorg och visar enkel hemmavård som faktiskt funkar.",
        "Vår filosofi är enkel: ärlig rådgivning, inga trender som inte passar din botten eller livsstil.",
      ],
      servicesTitle: ["Behandlingar", "Våra tjänster", "Boka det du behöver"],
      servicesLead: [
        "Tre kort som visar vad som är viktigast — skriv mer längre ned på sidan vid behov.",
        "Korten kan handla om priser, galleri eller bokning — länka vidare om ni vill.",
      ],
      services: [
        { title: "Klipp & styling", body: "Konsultation, tvätt, klipp och finish anpassad efter ansiktsform och hur du stylar hemma." },
        { title: "Färg & toner", body: "Balayage, helfärg och glossing med milda serier — vi dokumenterar blandningen för nästa besök." },
        { title: "Vård & spa", body: "Djup återfuktning, hårbottenkur och avkopplande massage — bra mellan säsong och färg." },
      ],
      galleryTitle: ["Salongen", "Stämning & hantverk", "Före / efter"],
      galleryLead: [
        "Ett ögonkast på ljuset, stolen och materialen — så här känns det hos oss.",
        "Byt gärna bilderna mot era egna — behåll känslan av lugn och precision.",
      ],
      faqTitle: ["Vanliga frågor", "Bokning & priser", "Allt du undrar innan du kommer"],
      faq: [
        { q: "Hur bokar jag tid?", a: "Via bokningslänken eller telefon. Avboka senast 24 timmar för att undvika debitering enligt våra villkor." },
        { q: "Har ni studentrabatt?", a: "Ja på utvalda vardagar — fråga i receptionen eller skriv det i meddelandet vid onlinebokning." },
        { q: "Vilka produkter använder ni?", a: "Professionella serier utan onödiga tillsatser. Vid känslig hårbotten anpassar vi protokollet." },
        { q: "Får jag komma med inspiration?", a: "Gärna — bilder hjälper oss förstå form och färgton, vi landar i något som funkar för dig." },
      ],
      cta: ["Boka tid", "Se prislista", "Hitta hit", "Kontakta oss", "Fråga om färg"],
      keywords: ["frisör", "salong", "klippning", "boka online", "hårvård"],
    },
    hundsalong: {
      label: "Hundtrim / hundsalong",
      copyTone: "trygg pälsvård, lugnt tempo, tydlig bokning — fokus på hundens välmående, aldrig skuld eller trendhets",
      heroTitle: [
        "Klok pälsvård — med tid för er hund",
        "Trim & bad med mjuk hand och tydliga besked",
        "Hundsalong där lugnet får ta plats",
        "Från tovig till fräsch — på hundens villkor",
      ],
      heroLead: [
        "Vi bokar lagom många tider per dag så ingen behöver stressa i badkaret. Berätta gärna om päls, allergier och vad som känns ovant.",
        "Du får väntetid som går att förutse, tydliga prisintervall och råd om enkel skötsel hemma mellan besöken.",
        "Första gången tar vi lite extra tid: vi tittar på pälsbotten, beteende och vilken teknik som passar just den här hunden.",
      ],
      about: [
        "Vi jobbar med hundar som är blyga, livliga och allt däremellan. Långa pauser, vatten i lagom temperatur och inga brådskor.",
        "Redo att svara på frågor om schampo, borstar och hur ofta trim kan behövas — utan att sätta press på dig som ägare.",
        "Säkerhet först: vi anpassar remmar, bad och tork utefter hundens storlek och temperament.",
      ],
      servicesTitle: ["Våra tjänster", "Bad, trim & rådgivning", "Boka det som passar"],
      servicesLead: [
        "Från bad och fån till maskinklipp och handtrim — vi reder ut vad som passar pälstyp och säsong.",
        "Osäker? Börja med konsultation så får ni en enkel plan innan ni bokar full behandling.",
      ],
      services: [
        { title: "Bad & fön", body: "Milt schampo, genomarbetad päls och tork som inte stressar — passar under fällperiod och efter lera." },
        { title: "Trim & klippning", body: "Rastävvd eller kort sommarfrisyr — vi anpassar teknik efter päls och hur ofta ni vill komma tillbaka." },
        { title: "Valpintro & rådgivning", body: "Mjuk start i salongsmiljö, enkel borstteknik och tips som gör vardagen lättare hemma." },
      ],
      galleryTitle: ["I salongen", "Lugn stämning", "Före & efter"],
      galleryLead: [
        "Visa gärna era egna bilder — lugna ytor, säkra remmar och glada nosar funkar bäst.",
        "Tips: en bild på bad och en på trim ger besökaren en känsla av rutin och omsorg.",
      ],
      faqTitle: ["Vanliga frågor", "Bokning & lugnet i salongen", "Innan besöket"],
      faq: [
        { q: "Hur bokar jag?", a: "Via knappen på sajten, mejl eller telefon. Hör av er om hunden är ovan eller väldigt stressad — då kan vi lägga in längre tid." },
        { q: "Kan jag stanna kvar?", a: "Det varierar — vissa hundar mår bäst utan publik. Vi berättar vad som brukar funka efter en kort avstämning." },
        { q: "Hur ofta ska min hund trimmas?", a: "Beror på päls och säsong. Vi ger ett enkelt intervall efter första besöket och justerar när vädret eller fäll byter fart." },
        { q: "Vad om min hund är rädd?", a: "Vi tar korta pass, pausar vid behov och använder inga hårda metoder — målet är att nästa besök ska kännas tryggare." },
      ],
      cta: ["Boka trim", "Fråga om päls", "Prislista", "Hitta hit", "Första besöket"],
      keywords: ["hundtrim", "hundsalong", "pälsvård", "boka tid", "trim"],
    },
    hunddagis: {
      label: "Hunddagis / hundpassning",
      copyTone: "trygg vardagsomsorg, lek och promenader — fokus på hundens trivsel och tydlig kommunikation med ägare",
      heroTitle: [
        "Trygg vardag för er hund — med lek och promenader",
        "Hunddagis där lugnet och leken får plats",
        "Passning och dagis när ni jobbar eller reser",
        "Glada hundar, tydliga rutiner och omtänksam personal",
      ],
      heroLead: [
        "Vi tar emot hundar som trivs i grupp och behöver aktivering under dagen. Ni får en enkel start med provdag och tydlig info om rutiner.",
        "Promenader, lek och vila i lagom tempo — vi anpassar dagen efter hundens behov och energi.",
        "Berätta gärna om mat, medicin och beteende så vi kan skapa en trygg vardag från första dagen.",
      ],
      about: [
        "Vi jobbar med små grupper så varje hund får uppmärksamhet. Säkra ytor, tydliga rutiner och personal som känner hundarnas temp.",
        "Oavsett om det handlar om dagis några dagar i veckan eller passning vid resa — ni får tydlig återkoppling och enkel bokning.",
        "Trygghet först: vi går igenom provdag, gruppdynamik och vad som passar just er hund innan ni bokar regelbundet.",
      ],
      servicesTitle: ["Våra tjänster", "Dagis, passning & promenader", "Välj det som passar"],
      servicesLead: [
        "Halvdag, hel dag eller promenadsgrupp — vi hjälper er hitta rätt nivå utifrån hundens ålder och energi.",
        "Osäker? Börja med provdag så ser vi tillsammans hur hunden trivs i gruppen.",
      ],
      services: [
        { title: "Hunddagis", body: "Hel- eller halvdag med lek, vila och promenad — trygg rutin medan ni jobbar." },
        { title: "Hundpassning", body: "Passning hemma hos er eller hos oss — flexibelt när ni reser eller behöver extra hjälp." },
        { title: "Promenadsgrupp", body: "Längre promenader i mindre grupp — bra för hundar som behöver mer rörelse under dagen." },
      ],
      galleryTitle: ["I vardagen", "Lek & promenad", "Trygg miljö"],
      galleryLead: [
        "Visa gärna era egna bilder från gården, lekytan eller promenader — det ger föräldrar en trygg känsla.",
        "En bild på lek och en på promenad räcker långt för att visa hur dagen ser ut.",
      ],
      faqTitle: ["Vanliga frågor", "Bokning & provdag", "Innan första dagen"],
      faq: [
        { q: "Hur bokar jag?", a: "Via knappen på sajten, mejl eller telefon. Vi börjar gärna med en provdag innan fast schema." },
        { q: "Vilka hundar passar?", a: "Vi tar emot sociala hundar som trivs i grupp. Vi går igenom beteende och provdag tillsammans." },
        { q: "Vad ska jag ta med?", a: "Koppel, favoritleksak om ni vill, mat om hunden äter under dagen — vi skickar en enkel checklista vid bokning." },
        { q: "Vad händer vid regn eller kyla?", a: "Vi anpassar promenader och lek inomhus eller utomhus efter väder — hundarna ska vara bekväma hela dagen." },
      ],
      cta: ["Boka provdag", "Se priser", "Kontakta oss", "Hitta hit", "Fråga om passning"],
      keywords: ["hunddagis", "hundpassning", "hundpassa", "dagis", "promenad", "hundomsorg"],
    },
    cafe: {
      label: "Café",
      copyTone: "vardagsnära: doft, ljud, tempo — undvik “världsunik”",
      heroTitle: [
        "Morgonljus & nyrostat kaffe",
        "Ett café byggt på enkla ritualer",
        "Små batcher. Stora smaker.",
        "Fika som inte stressar klockan",
      ],
      heroLead: [
        "Surdegsbröd från lokala bagerier, filter med karaktär och en stund att landa innan mötet.",
        "Menyn följer säsong — favoriterna står kvar bredvid det som just nu smakar mest.",
        "Vi rostar ofta, brygger lugnt och berättar gärna varför just den här bönan är på fatet.",
      ],
      about: [
        "Vi tror på långsamma processer: bönor som rostas varsamt, mjölk vi kan spåra och personal som hinner säga hej.",
        "Hos oss räcker en espresso lika bra som en hel eftermiddag med bok och cappuccino.",
        "Öppet kök mot disk — du ser när mackan rostas och när kaffet vägs.",
      ],
      servicesTitle: ["Meny & upplevelser", "Så fikar ni hos oss", "Utbud"],
      servicesLead: [
        "Frukost, fika och catering — alltid med tydliga allergenmärkningar.",
        "Tre spår: morgon, rosteri och till er arbetsplats eller release.",
      ],
      services: [
        { title: "Frukost & brunch", body: "Surdegsmackor, gröt och ägg — perfekt innan möte eller promenad." },
        { title: "Kafferosteri", body: "Singelursprung och blend — smakbeskrivningar utan snobberi, gärna provsmakning." },
        { title: "Catering", body: "Kaffebar till event eller kontor — med barista, återbrukbar servis och enkel logistik." },
      ],
      galleryTitle: ["I lokalen", "Mat & dryck", "Detaljer"],
      galleryLead: [
        "Byt bilderna mot era egna — behåll känslan av värme och enkel komposition.",
        "Tips: en bild på fatet, en på rosteriet och en på gäster i naturligt ljus.",
      ],
      faqTitle: ["Frågor & svar", "Allergier & öppettider", "Praktiskt"],
      faq: [
        { q: "Har ni veganska alternativ?", a: "Ja — växlar mellan havre och ärtbaserade drycker samt veganska bakverk. Säg till vid allergi." },
        { q: "Kan jag jobba här en stund?", a: "Lugnast förmiddag. Eftermiddag kan det bli mer liv. Wifi finns, ingen köptid." },
        { q: "Öppet på helgen?", a: "Lör–sön med utökade tider — se footern; vid helgdagar kan tiderna justeras." },
        { q: "Tar ni emot större sällskap?", a: "Mejla oss med datum och antal så reserverar vi bord eller mingelyta." },
      ],
      cta: ["Se meny", "Beställ takeaway", "Öppettider", "Catering till kontoret", "Hitta hit"],
      keywords: ["café", "kaffe", "brunch", "specialkaffe", "fika"],
    },
    byggfirma: {
      label: "Byggfirma",
      copyTone: "trygghet, tidplan, dokumentation — undvik vaga superlativ",
      heroTitle: [
        "Tryggt byggande. Tydliga besked.",
        "Vi levererar — från offert till nyckel",
        "Hantverk med dokumenterad kvalitet",
        "Renovering med en kontaktperson",
      ],
      heroLead: [
        "ROT-avdrag, etapper du kan följa och fast kontaktperson. Vi bygger bostäder och lokaler med fokus på tidplan.",
        "Säkerhet först, estetik nära inpå — vi pratar klarspråk kring risk, kostnad och byte.",
        "Digital dokumentation: ni ser beslut, ändringar och nästa steg utan att jaga mailtrådar.",
      ],
      about: [
        "Sedan starten har vi växt genom nöjda kunder och återkommande uppdrag. Teamen är certifierade och samarbetar med besiktningsmän.",
        "Vi undviker byggjargong: veckosammanfattning, tydliga beslutsunderlag och rimliga förbehåll i offerten.",
        "Hållbarhet för oss är hållbara materialval, spillminimering och återbruk där lag och brandskydd tillåter.",
      ],
      servicesTitle: ["Våra uppdrag", "Entreprenad & service", "Så arbetar vi"],
      servicesLead: [
        "Totalentreprenad, renovering och jour — samma struktur oavsett projektstorlek.",
        "Vi delar referenser och nästa lediga kapacitet redan i första svaret.",
      ],
      services: [
        { title: "Totalentreprenad", body: "Planering, projektledning och utförande i ett spår — en faktura, ett ansvar, tydligt ansvarsfördelning." },
        { title: "Renovering", body: "Lägenheter, radhus och lokaler — skydd, städning och granninformation ingår i rutinen." },
        { title: "Service & underhåll", body: "Akutjour, årlig kontroll och mindre åtgärder med spårbar kommunikation i ärendet." },
      ],
      galleryTitle: ["Referenser", "Platsbesök & detaljer", "Före / under / efter"],
      galleryLead: [
        "Ersätt med era egna projektfoton — visa både helhet och hantverksdetaljer.",
        "Tips: en bild på skyddad arbetsplats signalerar ordning för kunder.",
      ],
      faqTitle: ["Offert & villkor", "Vanliga frågor", "Trygghet"],
      faq: [
        { q: "Erbjuder ni fri offert?", a: "Ja — platsbesök och kostnadsfri offert vid större projekt inom vårt upptagningsområde." },
        { q: "Har ni försäkringar?", a: "Uppdaterade ansvarsförsäkringar och personal med ID06 enligt krav på arbetsplats." },
        { q: "Hur lång är väntetid?", a: "Varierar med säsong — vi återkommer inom tre arbetsdagar med preliminär start och flaskhalsar." },
        { q: "Hur hanterar ni ändringar i projektet?", a: "Skriftligt tillägg med pris och tid innan arbetet påbörjas — inga överraskningar." },
      ],
      cta: ["Begär offert", "Se referenser", "Ring oss", "ROT-info", "Boka platsbesök"],
      keywords: ["byggfirma", "renovering", "rot-avdrag", "entreprenad", "stockholm"],
    },
    elektriker: {
      label: "Elektriker",
      copyTone: "säker elinstallation, jour och tydliga besked — undvik vaga superlativ",
      heroTitle: [
        "Säker elinstallation — från offert till driftsatt anläggning",
        "Elektriker med jour och tydlig kommunikation",
        "Elarbete du kan lita på",
        "Installation, service och felsökning",
      ],
      heroLead: [
        "Elinstallation, ombyggnad och jour med dokumenterade rutiner och fast kontaktperson.",
        "Vi pratar klarspråk kring säkerhet, tidplan och kostnad — innan arbetet startar.",
        "Certifierade elektriker för bostad, lokal och industri — från elcentral till belysning.",
      ],
      about: [
        "Vi kombinerar erfarenhet från fältet med tydlig kommunikation — inga oklara avtal eller dolda tillägg.",
        "Säkerhet först: vi följer gällande regler och dokumenterar installationer så att ni kan följa upp internt.",
        "Lokal närvaro med kapacitet för både akut jour och planerade projekt.",
      ],
      servicesTitle: ["Våra tjänster", "Installation & service", "Så arbetar vi"],
      servicesLead: [
        "Elinstallation, ombyggnad och jour — samma struktur oavsett uppdragets storlek.",
        "Vi återkommer snabbt med preliminär tid och nästa steg redan i första svaret.",
      ],
      services: [
        { title: "Elinstallation", body: "Nyinstallation och ombyggnad i bostad och lokal — dokumentation och säkerhetsgenomgång ingår." },
        { title: "Service & felsökning", body: "Felsökning, utbyte och uppgradering av elcentral, belysning och uttag." },
        { title: "Jour & akut", body: "Akut eljour när det behövs — tydlig taxa och spårbar kommunikation i ärendet." },
      ],
      galleryTitle: ["Referenser", "Installation & detaljer", "I arbete"],
      galleryLead: [
        "Ersätt med era egna projektfoton — visa både helhet och installationsdetaljer.",
        "Tips: en bild på elcentral eller kabeldragning signalerar ordning och kompetens.",
      ],
      faqTitle: ["Offert & villkor", "Vanliga frågor", "Trygghet"],
      faq: [
        { q: "Erbjuder ni fri offert?", a: "Ja — platsbesök och kostnadsfri offert vid större uppdrag inom vårt upptagningsområde." },
        { q: "Har ni behörighet och försäkring?", a: "Ja — auktoriserade elektriker med uppdaterade försäkringar enligt branschkrav." },
        { q: "Har ni jour?", a: "Ja — akut eljour enligt överenskommen taxa och tillgänglighet." },
        { q: "Hur hanterar ni ändringar i projektet?", a: "Skriftligt tillägg med pris och tid innan arbetet påbörjas — inga överraskningar." },
      ],
      cta: ["Begär offert", "Ring jour", "Kontakta oss", "Se tjänster", "Boka besök"],
      keywords: ["elektriker", "elinstallation", "eljour", "elektriker stockholm", "el"],
    },
    fotograf: {
      label: "Fotograf",
      copyTone: "konkret leverans, tidslinje, känsla — undvik “magiska ögonblick”",
      heroTitle: [
        "Ljus, känsla, ögonblick",
        "Porträtt & varumärke i samma bildspråk",
        "Din berättelse — i stilla färger",
        "Bilder som håller i både pitch och print",
      ],
      heroLead: [
        "Editorial, bröllop och kommersiellt innehåll med filmisk ton. Leverans med webbgalleri och tryckfärdiga filer.",
        "Jag jobbar lugnt i bakgrunden så att ni kan vara närvarande framför kameran.",
        "Färgbearbetning med konsekvent LUT — så att kampanj och webb känns som samma värld.",
      ],
      about: [
        "Med bakgrund från mode och reportage söker jag det ärliga uttrycket. Tekniken ska inte skrika — bilden ska andas.",
        "Baserad i Stockholm, uppdrag i Norden. Reseplan och backup ingår i offerten.",
        "Leveransplan med preview, revision och arkivering — ni vet alltid vad som händer härnäst.",
      ],
      servicesTitle: ["Paket", "Arbetssätt", "Boka"],
      servicesLead: [
        "Välj omfattning efter er dag och hur ni ska använda bilderna.",
        "Alla paket inkluderar kort planeringssamtal och tydliga filformat.",
      ],
      services: [
        { title: "Bröllop", body: "Heldag eller intimate — timeline, backup och retusch enligt överenskommen stilreferens." },
        { title: "Företag", body: "Teamporträtt, miljö och kampanjmaterial för webb och print med enhetlig färghantering." },
        { title: "Privat & fine art", body: "Personliga serier och begränsade upplagor — papper och ram rekommenderas utifrån motiv." },
      ],
      galleryTitle: ["Portfolio", "Utvalt arbete", "Stämning"],
      galleryLead: [
        "Byt till egna serier — håll samma crop och ljus så sidan känns enhetlig.",
        "Tips: blanda bredd och höjd men håll färgtonen konsekvent.",
      ],
      faqTitle: ["Leverans & priser", "Vanliga frågor", "Före bokning"],
      faq: [
        { q: "Hur snabbt får vi bilder?", a: "Preview inom 72 timmar om inget annat avtalas; full leverans beror på omfattning och säsong." },
        { q: "Reser ni?", a: "Ja, mot reseersättning enligt schablon som skickas med offerten." },
        { q: "Kan vi köpa råfiler?", a: "Tillval per paket — vi rekommenderar retusch för enhetlig känsla i alla kanaler." },
        { q: "Vem äger rättigheterna?", a: "Anges i avtal: vanligtvis full användning för er verksamhet med angiven tid och geografi." },
      ],
      cta: ["Se portfolio", "Boka samtal", "Priser", "Kontakt", "Begär offert"],
      keywords: ["fotograf", "bröllop", "porträtt", "varumärke", "stockholm"],
    },
    event: {
      label: "Event",
      copyTone: "logistik + känsla: tidslinje, ansvar, säkerhet",
      heroTitle: [
        "Scen, ljud, människor — i ett flöde",
        "Event som känns designade, inte dekorerade",
        "Från koncept till genomförande",
        "Hybrid eller live — samma tydliga showcaller",
      ],
      heroLead: [
        "Konferenser, lanseringar och galor med teknisk precision och varm värdskap.",
        "Vi bygger runt ert budskap — gästen minns känslan, inte bara logotypen.",
        "Rigg, säkerhet och publikflöden dokumenteras så att beslut kan tas i realtid.",
      ],
      about: [
        "Produktionsteam med bakgrund från scen, ljus och digitala upplevelser. Vi planerar för oväder — bokstavligt och bildligt.",
        "Hållbarhet: återbrukbara scenmaterial och lokala leverantörer där det går utan att kompromissa säkerhet.",
        "En ansvarig showcaller per tillfälle — tydlig eskalering och backupplan för nyckelroller.",
      ],
      servicesTitle: ["Produktion", "Våra spår", "Era format"],
      servicesLead: [
        "Koncept, digitalt och logistik — välj helhet eller förstärk ert interna team.",
        "Vi följer svensk säkerhetsstandard och uppdaterar riskbedömning vid ändringar.",
      ],
      services: [
        { title: "Koncept & produktion", body: "Storyboard, scenografi, teknikrider och genomförande med namngiven showcaller." },
        { title: "Digitalt & hybrid", body: "Streaming, interaktion och talarmix för deltagare på plats och online." },
        { title: "Logistik", body: "Transporter, tillstånd och säkerhetsplan — samordnat med plats och kommuner vid behov." },
      ],
      galleryTitle: ["Case & miljöer", "Scen & ljus", "Ögonblicksbilder"],
      galleryLead: [
        "Visa gärna både publikytor och backstage som signalerar professionalitet.",
        "Byt bilder mot era senaste produktioner — behåll kontrast och läsbarhet på mobil.",
      ],
      faqTitle: ["Produktion & bokning", "Vanliga frågor", "Budget & tid"],
      faq: [
        { q: "Hur tidigt ska vi boka?", a: "Större produktioner 4–6 månader; mindre event ofta 6–8 veckor beroende på teknikbehov." },
        { q: "Kan ni ta akutuppdrag?", a: "Beroende på kapacitet — ring direktlinjen så återkommer vi inom en timme med ärligt svar." },
        { q: "Vad ingår i offerten?", a: "Postlista: personal, utrustning, resor, licenser och eventuella väderskydd — inga dolda poster." },
        { q: "Hur jobbar ni med säkerhet?", a: "Riskinventering före rigg, utrymningsplan och samordning med värd och ordningsmakt." },
      ],
      cta: ["Boka möte", "Se case", "Budgetguide", "Kontakt", "Begär rider"],
      keywords: ["event", "produktion", "konferens", "gala", "hybridevent"],
    },
    restaurang: {
      label: "Restaurang",
      copyTone: "smak, råvaror, bokning — undvik “unik upplevelse” utan konkretion",
      heroTitle: [
        "Säsong. Eld. Bord att minnas.",
        "Nordiska råvaror — global precision",
        "Kvällar som smakar av något nytt",
        "Meny driven av det som levererats idag",
      ],
      heroLead: [
        "À la carte och avsmakningsmeny med naturliga viner. Boka online — vi tar hänsyn till allergier och preferenser.",
        "Köket öppet mot salen — upplevelsen börjar innan första tuggan.",
        "Korta rätter med tydlig teknik — ni ser vad som är i säsong på tallriken.",
      ],
      about: [
        "Vi samarbetar med småskaliga odlare och fiskare. Menyn skrivs om ofta — det som inte finns på tallriken finns inte i kylen.",
        "Service i avslappnad takt — aldrig stressad, alltid uppmärksam på tempo vid bordet.",
        "Vinlistan uppdateras löpande med korta beskrivningar som hjälper utan att skryta.",
      ],
      servicesTitle: ["Meny & vin", "Upplevelser", "Bord & privata kvällar"],
      servicesLead: [
        "Tre vägar in: à la carte, vin och mindre sällskap med egen menylinje.",
        "Specialkost meddelas vid bokning så köket kan förbereda säkert.",
      ],
      services: [
        { title: "À la carte", body: "Klassiker och experiment sida vid sida — alltid tydligt vegetariskt alternativ." },
        { title: "Vin", body: "Naturliga producenter, korta beskrivningar och glas som matchar säsong och intensitet." },
        { title: "Privata middagar", body: "8–14 gäster med egen menylinje och dedikerad servering — boka i god tid." },
      ],
      galleryTitle: ["Rätter & rum", "Från köket", "Stämning"],
      galleryLead: [
        "Byt till egna matbilder — håll varm färgton och närbilder som visar textur.",
        "Tips: en bild på vinlistan och en på teamet ökar förtroendet.",
      ],
      faqTitle: ["Bokning & allergi", "Vanliga frågor", "Praktiskt"],
      faq: [
        { q: "Tar ni emot större sällskap?", a: "Ja — kontakta oss för meny och bordsdisposition samt förskottsbetalning vid större grupper." },
        { q: "Allergier?", a: "Meddela vid bokning så anpassar köket säkert; vi kan inte garantera spårfrån andra serveringar i öppet kök." },
        { q: "Presentkort?", a: "Digitalt och fysiskt — giltiga tolv månader om inget annat anges på kortet." },
        { q: "Avbokning?", a: "Sen avbokning kan debiteras enligt bokningsvillkor — se bekräftelsen du får via e-post." },
      ],
      cta: ["Boka bord", "Meny", "Presentkort", "Öppettider", "Privat middag"],
      keywords: ["restaurang", "middag", "boka bord", "vin", "säsongsmeny"],
    },
    miljo: {
      label: "Återvinning / miljö",
      copyTone: "hållbar hantering, tydliga rutiner och spårbarhet — cirkulärt utan grönmålning",
      heroTitle: [
        "Smart återvinning — från avfall till resurs",
        "Hållbar hantering med tydliga rutiner",
        "Er partner för återvinning och kretslopp",
        "Avfall som blir något nytt — tryggt och spårbart",
      ],
      heroLead: [
        "Vi hjälper företag och fastigheter sortera, transportera och återvinna på ett sätt som följer regler och minskar onödig belastning.",
        "Tydliga rutiner, rapportering och kontakt som svarar — så att avfallshanteringen känns enkel i vardagen.",
        "Från containrar och hämtning till rådgivning om sortering — vi anpassar upplägget efter er verksamhet och volymer.",
      ],
      about: [
        "Vi kombinerar erfarenhet från fältet med tydlig kommunikation — inga onödiga lager av mellanhänder eller oklara avtal.",
        "Säkerhet och miljö går hand i hand: vi dokumenterar flöden och följer gällande krav för transport och mottagning.",
        "Lokal närvaro med kapacitet att växa — oavsett om ni behöver regelbunden hämtning eller projektstöd vid ombyggnad.",
      ],
      servicesTitle: ["Våra tjänster", "Återvinning & hantering", "Det vi erbjuder"],
      servicesLead: [
        "Hämtning, sortering och rådgivning — välj det som passar er volym och verksamhet.",
        "Vi hjälper er hitta rätt lösning innan ni binder er — prova gärna med en enkel behovsanalys.",
      ],
      services: [
        { title: "Hämtning & transport", body: "Regelbunden eller enstaka hämtning av rest-, well- och fraktionerat avfall — med tydliga tider och kontakt." },
        { title: "Sortering & rådgivning", body: "Stöd vid källsortering, märkning och rutiner så att mer material går till återvinning istället för deponi." },
        { title: "Containrar & projekt", body: "Containeruthyrning och lösningar vid renovering, rivning eller större städ — flexibelt efter projektets längd." },
      ],
      galleryTitle: ["I verksamheten", "Sortering & flöden", "Hållbar hantering"],
      galleryLead: [
        "Visa gärna era egna bilder från anläggning, fordon eller sorteringsstation — det bygger förtroende.",
        "Byt stockbilder mot miljöer där kunden känner igen er vardag.",
      ],
      faqTitle: ["Vanliga frågor", "Hämtning & avtal", "Praktiskt"],
      faq: [
        { q: "Vilka fraktioner tar ni emot?", a: "Det beror på er ort och volym — kontakta oss så går vi igenom vad som gäller för just er verksamhet." },
        { q: "Hur ofta kan ni hämta?", a: "Veckovis, varannan vecka eller efter behov — vi anpassar schema efter säsong och volym." },
        { q: "Får vi rapport eller statistik?", a: "Ja, vi kan sammanfatta mängder och fraktioner så att ni kan följa upp ert miljöarbete internt." },
        { q: "Hur snabbt kan vi komma igång?", a: "Ofta inom några dagar efter avstämning — vi börjar gärna med en enkel genomgång av era behov." },
      ],
      cta: ["Begär offert", "Boka hämtning", "Kontakta oss", "Behovsanalys", "Se tjänster"],
      keywords: ["återvinning", "avfall", "miljö", "sophämtning", "container"],
    },
    verksamhet: {
      label: "Din verksamhet",
      copyTone: "neutral och tydlig — följ kundens egna ord, ingen förvald bransch",
      heroTitle: [
        "Välkommen — så kan vi hjälpa er",
        "Tydligt erbjudande för era kunder",
        "Er verksamhet, tydligt presenterad",
        "Det här erbjuder vi",
      ],
      heroLead: [
        "Här beskriver ni kort vad ni gör, för vem och var ni finns — byt gärna till era egna ord.",
        "Två eller tre meningar om ert erbjudande räcker — besökaren ska förstå direkt varför de ska välja er.",
        "Skriv som ni pratar med en ny kund: vad ni gör, hur man bokar eller kontaktar er.",
      ],
      about: [
        "Vi är ett företag som gillar klara besked och att hålla vad vi lovar — i planering, leverans och uppföljning.",
        "Här berättar ni gärna er historia, var ni finns och vad kunder oftast väljer er för.",
        "Byt texten mot det som stämmer för er — det viktigaste är att det känns äkta.",
      ],
      servicesTitle: ["Vad vi erbjuder", "Våra tjänster", "Utvalt"],
      servicesLead: [
        "Tre kort som visar det viktigaste — ni kan byta rubriker, text och bilder.",
        "Korten kan handla om priser, bokning eller exempel på uppdrag.",
      ],
      services: [
        { title: "Tjänst ett", body: "Beskriv ert viktigaste erbjudande — vad kunden får och hur det går till." },
        { title: "Tjänst två", body: "Ett till exempel på vad ni gör — håll det kort och konkret." },
        { title: "Tjänst tre", body: "Tredje kortet kan vara pris, bokning eller något kunder ofta frågar om." },
      ],
      galleryTitle: ["Bilder från verksamheten", "I vardagen", "Ögonblicksbilder"],
      galleryLead: [
        "Byt till egna bilder så sidan känns er — miljö, resultat eller team funkar bra.",
        "Ett ögonkast på hur det ser ut hos er bygger förtroende.",
      ],
      faqTitle: ["Vanliga frågor", "Innan du hör av dig", "Praktiskt"],
      faq: [
        { q: "Hur kontaktar jag er?", a: "Via formuläret, mejl eller telefon — vi återkommer så snart vi kan." },
        { q: "Var finns ni?", a: "Se kontaktuppgifterna längre ned — skriv gärna er adress och öppettider." },
        { q: "Vad kostar det?", a: "Det beror på uppdraget — hör av er så tar vi fram ett förslag." },
        { q: "Hur bokar jag?", a: "Klicka på knappen högst upp eller skriv till oss — vi guidar er vidare." },
      ],
      cta: ["Kontakta oss", "Se tjänster", "Begär offert", "Hitta hit", "Boka tid"],
      keywords: ["företag", "tjänster", "kontakt", "erbjudande"],
    },
    konsult: {
      label: "Konsult",
      copyTone: "beslutsstöd: tydliga leverabler, risk, nästa steg — undvik tom strategi",
      heroTitle: [
        "När strategi faktiskt landar i organisationen",
        "Klarhet där beslut annars drunknar",
        "Ert tempo — vår struktur",
        "Från whiteboard till mätbar effekt",
      ],
      heroLead: [
        "Vi sätter ramarna så att ledning och team kan röra sig snabbare: tydliga leverabler, risk synliggjord, nästa steg alltid namngivet.",
        "Workshoppar som inte dör i luren — uppföljning, demos och små korrigeringar som håller momentum vecka för vecka.",
        "Vi möter er där ni är: backlog, intäktsmål eller kultur — och översätter det till något era människor kan agera på direkt.",
      ],
      about: [
        "Våra konsulter har bakgrund från scale-ups och börsbolag. Vi talar samma språk som både ledning och produktteam.",
        "Transparent arbetssätt: gemensamma mål, veckovisa demos och mätbara leverabler som ni kan granska.",
        "Säkerhet och datahantering enligt er policy — vi dokumenterar vem som gör vad och varför.",
      ],
      servicesTitle: ["Erbjudanden", "Samarbetsformer", "Våra spår"],
      servicesLead: [
        "Strategi, produkt och förändring — välj helhet eller förstärkning av ert team.",
        "Vi föreslår alltid en tydlig start- och avslutningsbild så att ni vet vad ni köper.",
      ],
      services: [
        { title: "Strategi & positionering", body: "Marknad, erbjudande och narrativ som går att operationalisera i sälj och produkt direkt." },
        { title: "Produkt & tech", body: "Roadmap, prioritering och modernisering — fokus på värdeskapande sprintar och minskad skuld." },
        { title: "Förändringsledning", body: "Utbildning, kommunikation och KPI-uppföljning som gör strategin levande i vardagen." },
      ],
      galleryTitle: ["Arbetssätt", "Material & workshop", "Resultat"],
      galleryLead: [
        "Visa gärna whiteboard, mallar och riktiga team — inte bara stock.",
        "Byt till bilder från era sessioner (anonymisera vid behov).",
      ],
      faqTitle: ["Samarbete & start", "Vanliga frågor", "Säkerhet"],
      faq: [
        { q: "Hur startar ett uppdrag?", a: "Kickoff-workshop, gemensam backlog och tydlig ansvarsfördelning första veckan." },
        { q: "Arbetar ni remote?", a: "Ja — blandat format utifrån teamets behov och uppdragets känslighet." },
        { q: "Vilka branscher?", a: "Finans, retail, tech och offentlig sektor — referenser delas under NDA." },
        { q: "Hur prissätter ni?", a: "Fast pris, retainer eller time & materials — vi rekommenderar det som minskar oklarhet för er." },
      ],
      cta: ["Boka intro", "Case", "Metod", "Kontakt", "Begär NDA"],
      keywords: ["konsult", "strategi", "förändring", "ledning", "produkt"],
    },
    butik: {
      label: "Butik",
      copyTone: "service, sortiment, trygg köpupplevelse — undvik “lifestyle” utan substans",
      heroTitle: [
        "Utvalt sortiment — personlig service",
        "Detaljer som gör hemmet komplett",
        "Handla lugnt, levereras snabbt",
        "Kurerat — testat av oss först",
      ],
      heroLead: [
        "Vi kuraterar varumärken med hållbar profil och tidlös estetik. Fri frakt över enkel nivå.",
        "Besök oss i butiken för stylingtips eller handla online med samma omsorg i packningen.",
        "Returpolicy utan krångel — vi vill att ni ska känna er trygga med varje köp.",
      ],
      about: [
        "Familjeägt sedan starten. Vi testar varje produktserie själva innan den får plats på hyllan.",
        "Personalen får tid för rådgivning — ni slipper jaga någon som “bara jobbar extra”.",
        "Lojalitet och reparationer där det går — vi vill att saker håller, inte bara säljer.",
      ],
      servicesTitle: ["Tjänster i butik", "Kundresa", "Utvalt"],
      servicesLead: [
        "Styling, presenter och företag — samma omsorg oavsett kanal.",
        "Vi hjälper er hitta rätt storlek, färg och material utan stress.",
      ],
      services: [
        { title: "Personlig styling", body: "Boka tid för hem eller garderob — vi tar med prover och konkreta förslag." },
        { title: "Present & monogram", body: "Vackra paket och gravyr på utvalda artiklar med tydliga leveranstider." },
        { title: "Företagsgåvor", body: "Volymorder med logotyp och spårbar leverans inom Sverige." },
      ],
      galleryTitle: ["Butiken", "Produkter", "Inspiration"],
      galleryLead: [
        "Visa hyllmiljö och närbilder på material — kunder vill känna kvalitet.",
        "Byt till egna bilder men behåll jämn belysning mellan rutorna.",
      ],
      faqTitle: ["Leverans & retur", "Vanliga frågor", "Medlem"],
      faq: [
        { q: "Leveranstid?", a: "1–3 dagar inom Sverige om varan finns i lager — annars visas estimat i checkout." },
        { q: "Kan jag returnera onlineköp i butik?", a: "Ja — ta med orderbekräftelse så löser vi retur eller byte direkt." },
        { q: "Lojalitetsprogram?", a: "Poäng på köp — registrera i kassan eller online; villkor finns på webben." },
        { q: "Reservera i butik?", a: "Ring eller mejla artikelnummer så ligger produkten väntande i upp till 48 timmar." },
      ],
      cta: ["Shoppa nu", "Butiker", "Guider", "Kundservice", "Boka styling"],
      keywords: ["butik", "inredning", "online", "gåvor", "stockholm"],
    },
    advokat: {
      label: "Advokatbyrå",
      copyTone: "formellt lättläst: ansvar, sekretess, nästa steg — inga löften om utgång",
      heroTitle: [
        "Rådgivning med tydlig nästa steg",
        "Erfarenhet inom affärsjuridik",
        "Trygg partner i komplexa frågor",
        "Vi förenklar — utan att tumma på noggrannheten",
      ],
      heroLead: [
        "Avtal, bolag och tvister med strukturerad process och förutsägbara kostnadsbilder.",
        "Ni får en namngiven handläggare och tydliga underlag inför varje beslut.",
        "Vi prioriterar proportionalitet: rätt insats för risken och affärens värde.",
      ],
      about: [
        "Byrån arbetar nära ägda bolag och växande organisationer. Vi kombinerar specialistkompetens med praktisk kommunikation.",
        "Sekretess och dokumentation enligt branschpraxis — ni vet vad som delas och med vem.",
        "Vi föreslår alltid minst ett alternativ med risk-nytto innan vi går vidare.",
      ],
      servicesTitle: ["Kompetensområden", "Våra tjänster", "Rådgivning"],
      servicesLead: [
        "Avtal, bolagsrätt och tvist — med tydliga milstolpar och budskap till styrelse.",
        "Begär möte för att avgöra om vi är rätt match innan vi startar formellt uppdrag.",
      ],
      services: [
        { title: "Avtal & transaktioner", body: "Due diligence, avtalsskrivning och förhandling med fokus på affärsskydd och genomförbarhet." },
        { title: "Bolagsstyrning", body: "Bolagsordning, styrelsearbete och dokumentation som håller vid revision och finansiering." },
        { title: "Tvist & process", body: "Strategi för förhandling, medling eller domstol — kostnad och tid planeras i förväg." },
      ],
      galleryTitle: ["Byrån", "Arbetssätt", "Miljö"],
      galleryLead: [
        "Använd diskreta miljöbilder — undvik känsliga dokument i bild.",
        "Tips: teamfoto och mötesrum signalerar tillgänglighet utan att avslöja klienter.",
      ],
      faqTitle: ["Kontakt & arvode", "Vanliga frågor", "Sekretess"],
      faq: [
        { q: "Hur bokar jag möte?", a: "Ring eller använd formuläret. Första avstämningen är inriktad på att avgöra om vi kan ta uppdraget." },
        { q: "Hur debiteras arvode?", a: "Enligt offert eller timtaxa — vi beskriver arbetssteg och befarad omfattning skriftligt." },
        { q: "Kan ni garantera utgång?", a: "Nej — juridik bär alltid risk. Vi redovisar osäkerheter och alternativ innan ni beslutar." },
        { q: "Hur hanterar ni personuppgifter?", a: "Enligt GDPR och interna rutiner; biträdesavtal tecknas vid behov." },
      ],
      cta: ["Boka rådgivning", "Kontakt", "Om oss", "Karriär", "Publiceringar"],
      keywords: ["advokat", "bolag", "avtal", "tvist", "rådgivning"],
    },
    gym: {
      label: "Gym / PT",
      copyTone: "motiverande men realistiskt: progression, återhämtning, säkerhet",
      heroTitle: [
        "Träna smartare — inte hårdare",
        "Din plan. Vår coachning.",
        "Styrka, rörlighet, återhämtning",
        "Resultat som håller i vardagen",
      ],
      heroLead: [
        "Personligt program, teknikcoachning och uppföljning som passar både nybörjare och erfarna.",
        "Lokalen är utformad för flöde: gott om yta, tydliga zoner och utrustning i toppskick.",
        "Vi mäter progression med enkla tester — inte bara spegel och vibb.",
      ],
      about: [
        "Vi tror på hållbar belastning: teknik först, volym sedan. Coaches är utbildade i skadeprevention.",
        "Gemenskap utan tävlingshets — alla får plats oavsett mål, förutom respekt för andras tid.",
        "Kost och sömn ingår i samtalen när det passar — inte som tvång utan som stöd.",
      ],
      servicesTitle: ["Medlemskap", "Tjänster", "Kom igång"],
      servicesLead: [
        "Drop-in, månad eller PT-paket — vi hjälper er välja utifrån vana och tid.",
        "Provpass bokas online; kom i tid så hinner vi visa runt.",
      ],
      services: [
        { title: "Medlemskap", body: "Tillgång till gym, bokningsapp och introprogram för nya medlemmar." },
        { title: "Personlig träning", body: "Teknik, periodisering och uppföljning — kortare pass med hög kvalitet." },
        { title: "Smågrupp", body: "Max åtta deltagare, tydligt fokus per pass — socialt utan att tappa precision." },
      ],
      galleryTitle: ["Lokalen", "Pass & utrustning", "Community"],
      galleryLead: [
        "Visa ljusa ytor och riktiga människor — undvik överdriven filtrering.",
        "Tips: en bild på fri vikt och en på gruppträning ger balans.",
      ],
      faqTitle: ["Medlemskap & bokning", "Vanliga frågor", "Trygghet"],
      faq: [
        { q: "Kan jag provträna?", a: "Ja — boka provpass via sajten; kom i träningskläder och vattenflaska." },
        { q: "Vad ingår i PT?", a: "Program, teknikpass och uppföljning — omfattning enligt paket ni väljer." },
        { q: "Har ni bindningstid?", a: "Varierar per medlemskap — vi redovisar villkor tydligt innan ni signerar." },
        { q: "Hur stor är lokalen?", a: "Se bilder och planlösning på sidan; vid rusning sprider vi ut starttider." },
      ],
      cta: ["Boka provpass", "Se schema", "Priser", "Kontakt", "PT-boka"],
      keywords: ["gym", "pt", "träning", "styrka", "hälsa"],
    },
    tarot: {
      label: "Tarot & andlig vägledning",
      copyTone: "varm, respektfull, jordnära — inga garantier om framtiden, inget skrämmande språk",
      heroTitle: [
        "Vägledning när du behöver klarhet",
        "Tarot med omsorg och respekt",
        "Lyssna inåt — med stöd vid sidan",
        "Klarhet i det som känns oklart",
      ],
      heroLead: [
        "Privata läsningar och guidade sessioner i lugn miljö — online eller på plats, alltid med respekt för din integritet.",
        "Jag möter dig där du är: relationer, val, riktning eller bara behovet av att få ordning på tankarna.",
        "Tarot som spegel och samtal — inte spådom som låser framtiden, utan stöd för dina egna beslut.",
      ],
      about: [
        "Jag har läst tarot i många år och utbildat mig inom etik och kommunikation kring andlig vägledning.",
        "Sessionerna sker i lugn takt — du får ställa frågor, pausa och stämma av det som landar.",
        "Online via video eller på plats; allt som sägs mellan oss stannar mellan oss.",
      ],
      servicesTitle: ["Sessioner", "Erbjudanden", "Sätt att mötas"],
      servicesLead: [
        "Välj det format som passar dig — kortare avstämning eller djupare session.",
        "Boka via länken nedan; vid frågor är du välkommen att höra av dig först.",
      ],
      services: [
        { title: "Tarotläsning", body: "Ca 45–60 min — fokus på din fråga, tydlig genomgång av korten och utrymme för samtal." },
        { title: "Relations- & vägval", body: "För dig som står inför ett val eller vill förstå dynamiken i en relation bättre." },
        { title: "Online-session", body: "Via video i lugn miljö — samma upplägg som på plats, med inspelning endast om du uttryckligen önskar." },
      ],
      galleryTitle: ["Stämning", "Sessioner", "Miljö"],
      galleryLead: [
        "Byt gärna till egna bilder — kort, ljus och lugn miljö passar bäst.",
        "Undvik överdrivet mystiska filter; äkta och varm känsla bygger förtroende.",
      ],
      faqTitle: ["Bokning & session", "Vanliga frågor", "Trygghet"],
      faq: [
        { q: "Kan tarot förutsäga framtiden?", a: "Nej — korten speglar nuläget och möjliga riktningar. Du behåller alltid makten över dina val." },
        { q: "Hur bokar jag?", a: "Via bokningslänken eller kontaktformuläret. Du får bekräftelse med tid och hur sessionen genomförs." },
        { q: "Kan jag ställa vilken fråga som helst?", a: "Ja, inom rimlighet och respekt. Vid medicinska eller juridiska frågor hänvisar jag till rätt expert." },
        { q: "Erbjuder du sessioner online?", a: "Ja — vi använder video och du behöver bara en lugn plats och stabil uppkoppling." },
      ],
      cta: ["Boka session", "Se erbjudanden", "Om mig", "Kontakt", "Frågor"],
      keywords: ["tarot", "spå", "vägledning", "andlig", "session", "medium"],
    },
  };

  /** Normalisering för nyckelordsmatchning (ASCII-liknande, små bokstäver). */
  function normalizeBizDescription(raw) {
    let s = String(raw || "")
      .toLowerCase()
      .trim()
      .replace(/å/g, "a")
      .replace(/ä/g, "a")
      .replace(/ö/g, "o")
      .normalize("NFD")
      .replace(/\u0300-\u036f/g, "");
    return s.replace(/\s+/g, " ").trim();
  }

  /**
   * Nyckelord per bransch — användarens fria text mappas mjukt internt till befintliga pack.
   * Vid tvekan: neutral konsult/premium (konsult-pack).
   */
  const INDUSTRY_HINT_PHRASES = [
    { key: "byggfirma", phrases: ["vvs i", " vvs ", "rorlagg", "rorlag", "snickerifirma", "snickare i"] },
    { key: "elektriker", phrases: ["elektriker i", " elinstallation", " eljour", "elmontor i", "elmontör i", "elservice"] },
    { key: "restaurang", phrases: ["matstudio", "vinbar"] },
    { key: "fotograf", phrases: ["brollopsfoto", "brollop foto"] },
    { key: "gym", phrases: ["yoga studio", "yogastudio", "halsa studio", "pt studio", "pilatesstudio"] },
    { key: "cafe", phrases: ["kaffe bar", "kaffebar"] },
    { key: "miljo", phrases: ["atervinning", "avfallshantering", "sophamtning", "miljotjanst", "kretslopp"] },
    { key: "konsult", phrases: ["redovisningsbyra", "ekonomibyra", "hr konsult"] },
    { key: "hundsalong", phrases: ["hund trim", "hundtrim", "hund salong", "hundsalong", "hundfrisor", "hundfrisör", "hundklipp", "trim hund", "hund spa"] },
    { key: "tarot", phrases: ["tarot lasning", "tarotlasning", "spa i tarot", "spå i tarot", "tarot lasare", "tarotlasare", "andlig vagled", "andlig lasning", "synsk lasning"] },
    { key: "hunddagis", phrases: ["hund dagis", "hunddagis", "hundpassning", "hund passning", "hundpassa", "hund pension", "hundpensionat", "hundomsorg", "daghem hund"] },
  ];

  const INDUSTRY_HINT_TERMS = {
    frisor: [
      "frisor",
      "frisör",
      "salong",
      "barber",
      "klipp",
      "slinga",
      "balayage",
      "toning",
      "foliesatt",
      "foliesätt",
      "harsalong",
      "hårsalong",
      "permanent",
      "barbershop",
      "skagg",
      "skägg",
    ],
    cafe: ["cafe", "kafe", "kaffe", "espresso", "barista", "bageri", "fika", "brygg", "konditori", "bistro"],
    byggfirma: [
      "vvs",
      "rormok",
      "rörmok",
      "rormokare",
      "rörmokare",
      "akut",
      "jour",
      "bygg",
      "snick",
      "snickare",
      "snickeri",
      "snickerifirma",
      "hantverk",
      "plattsatt",
      "plattsätt",
      "renover",
      "taklagg",
      "taklägg",
      "murar",
      "fasad",
      "anlagg",
      "anlägg",
      "ventilations",
      "golv",
      "badru",
      "badrum",
    ],
    elektriker: [
      "elektrik",
      "elektriker",
      "elinstallation",
      "eljour",
      "elmontor",
      "elmontör",
      "elservice",
      "elarbete",
      "elcentral",
      "elskap",
      "elsakerhet",
      "elsäkerhet",
      "elnät",
      "elnat",
      "belysning",
      "strom",
      "ström",
      "electrical",
      "electrician",
      "wiring",
      "switchboard",
      "fusebox",
      "circuit",
      "installation",
    ],
    fotograf: [
      "foto",
      "fotograf",
      "portratt",
      "porträtt",
      "bröllop",
      "brollop",
      "drön",
      "video",
      "studiofoto",
      "fotostudio",
    ],
    event: ["event", "fest", "konfer", "kongress", "mingel", "moderator", "festlokal", "gala", "utstall", "utställ"],
    restaurang: [
      "restaurang",
      "restaurant",
      "lunch",
      "middag",
      "meny",
      "catering",
      "sushi",
      "pizza",
      "tapas",
      "vin ",
      "gastro",
      "pub",
      "ramen",
      "steak",
      "kokk",
      "kock",
    ],
    miljo: [
      "atervinning",
      "aterbruk",
      "avfall",
      "sophamt",
      "deponi",
      "kompost",
      "kretslop",
      "recycl",
      "miljo",
      "miljotjanst",
      "miljoteknik",
      "containeruthyr",
      "sorterings",
      "fraktion",
      "restavfall",
      "wellpap",
      "skrot",
      "cirkular",
    ],
    konsult: [
      "konsult",
      "radgiv",
      "rådgiv",
      "coach",
      "hr ",
      " hr",
      "personal",
      "strateg",
      "redovis",
      "bokfor",
      "bokför",
      "revision",
      "ekonom",
      "interim",
      "management",
      "verksamhets",
    ],
    butik: ["butik", "boutique", "detaljhandel", "klader", "kläder", "inredning", "second hand", "vintage"],
    advokat: ["advokat", "juridik", "jurist", "avtal", "brott", "familjeratt", "familjerätt", "process"],
    gym: [
      "gym",
      "yoga",
      "pilates",
      "crossfit",
      "pt ",
      " pt",
      "tranar",
      "tränar",
      "training",
      "traning",
      "fitness",
      "wellness",
      "styrke",
      "medlemskap",
    ],
    hundsalong: [
      "hundtrim",
      "hundsalong",
      "hundfrisor",
      "hundfrisör",
      "hundklipp",
      "palsvard",
      "pälsvård",
      "palsvård",
      "trimhund",
      "hundbad",
      "hund spa",
      "grooming",
    ],
    hunddagis: [
      "hunddagis",
      "hundpassning",
      "hundpassa",
      "hundpassar",
      "hundpensionat",
      "hundpension",
      "hundomsorg",
      "hundhotell",
      "daghem",
      "dagis",
      "promenadgrupp",
      "hundrastning",
      "passning",
    ],
    tarot: [
      "tarot",
      "tarotkort",
      "tarotlas",
      "spådom",
      "spadom",
      "medium",
      "andlig",
      "synsk",
      "synska",
      "vägled",
      "vagled",
      "healer",
      "healing",
      "chakra",
      "astrolog",
      "horoskop",
      "runor",
      "englar",
      "orakel",
      "oracle",
      "spiritual",
      "mystik",
      "witch",
      "haxa",
    ],
  };

  function scoreIndustryFromHints(key, normalized) {
    if (/inga bilder|finns inga bild|saknas bilder|det finns inga bild|ingen bild syns|bild syns inte|gr[aå] hero|tom hero/.test(normalized)) {
      if (key === "fotograf") return 0;
    }
    let score = 0;
    const terms = INDUSTRY_HINT_TERMS[key];
    if (terms) {
      for (const t of terms) {
        const needle = normalizeBizDescription(t);
        if (!needle) continue;
        if (needle.length >= 4 || needle.includes(" ")) {
          if (normalized.includes(needle)) score += 3;
        } else {
          const re = new RegExp(`(?:^|[^a-z0-9])${needle}(?:$|[^a-z0-9])`);
          if (re.test(normalized)) score += 2;
        }
      }
    }
    for (const row of INDUSTRY_HINT_PHRASES) {
      if (row.key !== key) continue;
      for (const ph of row.phrases || []) {
        const p = normalizeBizDescription(ph).replace(/\s+/g, " ");
        if (p.length >= 3 && normalized.includes(p)) score += 4;
      }
    }
    if (key === "konsult") {
      if (/\btatuer|\btatuering|\btattoo|\bpiercing\b/.test(normalized)) score = Math.min(score, 1);
    }
    return score;
  }

  /**
   * @param {string} raw
   * @returns {{ key: string; confidence: "high"|"medium"|"low"|"none"; score: number; secondScore?: number; tied?: boolean; suggestedKey?: string }}
   */
  function inferIndustryFromDescription(raw) {
    const normalized = normalizeBizDescription(raw);
    if (!normalized) {
      return { key: "verksamhet", confidence: "none", score: 0 };
    }
    const scores = {};
    for (const key of Object.keys(INDUSTRIES)) {
      scores[key] = scoreIndustryFromHints(key, normalized);
    }
    /** Tatuerare / hudkonst — kreativ tjänst, eget pack nära foto/konst. */
    if (
      /\btatuer|\btatuering|\btattoo|\bpiercing\b/.test(normalized) ||
      normalized.includes("tatuer") ||
      normalized.includes("tatuering")
    ) {
      scores.fotograf += 5;
      scores.konsult = Math.min(scores.konsult || 0, 0);
    }
    /** Bilvård — neutral premiumtjänst, inte bygg-pack. */
    if (
      normalized.includes("bilvard") ||
      normalized.includes("biltvatt") ||
      normalized.includes("bilrekond") ||
      (normalized.includes("bil") &&
        (normalized.includes("rekond") || normalized.includes("lack") || normalized.includes("tvatt") || normalized.includes("detailing")))
    ) {
      scores.konsult += 5;
      scores.byggfirma = Math.min(scores.byggfirma || 0, 1);
    }
    /** Hunddagis / passning — eget pack (inte trim/salong). */
    if (
      normalized.includes("hunddagis") ||
      normalized.includes("hundpassning") ||
      normalized.includes("hundpassa") ||
      normalized.includes("hundpension") ||
      (normalized.includes("hund") && normalized.includes("dagis")) ||
      (normalized.includes("hund") && normalized.includes("passning")) ||
      (normalized.includes("hund") && normalized.includes("daghem"))
    ) {
      scores.hunddagis = (scores.hunddagis || 0) + 8;
      scores.hundsalong = Math.min(scores.hundsalong || 0, 1);
      scores.konsult = Math.min(scores.konsult || 0, 1);
    }
    /** Hundtrim / pälsvård — eget pack med tydlig etikett i listan (undvik “konsult”). */
    if (
      normalized.includes("hundtrim") ||
      (normalized.includes("hund") && (normalized.includes("trim") || normalized.includes("klipp") || normalized.includes("pals") || normalized.includes("bad"))) ||
      normalized.includes("hundsalong") ||
      normalized.includes("hundfrisor") ||
      (normalized.includes("hund") && normalized.includes("salong"))
    ) {
      scores.hundsalong = (scores.hundsalong || 0) + 8;
      scores.frisor = Math.min(scores.frisor || 0, 0);
      scores.konsult = Math.min(scores.konsult || 0, 1);
    }

    /** Snickeri / hantverk — tydligt bygg-pack, inte konsult. */
    if (
      normalized.includes("snickerifirma") ||
      normalized.includes("snickare") ||
      normalized.includes("snickeri") ||
      (normalized.includes("snick") && !normalized.includes("snickare") && normalized.includes("firma"))
    ) {
      scores.byggfirma = (scores.byggfirma || 0) + 8;
      scores.konsult = Math.min(scores.konsult || 0, 1);
    }

    /** Elektriker / elinstallation — eget pack, inte snickare/bygg. */
    if (
      normalized.includes("elektriker") ||
      normalized.includes("elinstallation") ||
      normalized.includes("eljour") ||
      normalized.includes("elmontor") ||
      normalized.includes("elmontör") ||
      normalized.includes("elservice") ||
      (normalized.includes("el") && normalized.includes("central"))
    ) {
      scores.elektriker = (scores.elektriker || 0) + 8;
      scores.byggfirma = Math.min(scores.byggfirma || 0, 1);
      scores.konsult = Math.min(scores.konsult || 0, 1);
    }

    /** Återvinning / miljö — eget pack, inte generisk konsult. */
    if (
      normalized.includes("jretur") ||
      normalized.includes("atervinning") ||
      normalized.includes("avfallshantering") ||
      normalized.includes("sophamtning") ||
      (normalized.includes("avfall") && !normalized.includes("hund")) ||
      (normalized.includes("miljo") && !normalized.includes("hund"))
    ) {
      scores.miljo = (scores.miljo || 0) + 8;
      scores.konsult = Math.min(scores.konsult || 0, 1);
      scores.hunddagis = Math.min(scores.hunddagis || 0, 0);
      scores.hundsalong = Math.min(scores.hundsalong || 0, 0);
    }

    const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const [topKey, topScore] = ranked[0];
    const secondScore = ranked.length > 1 ? ranked[1][1] : 0;

    if (topScore < 2) {
      return { key: "verksamhet", confidence: "none", score: topScore, secondScore };
    }
    if (topScore === secondScore && topScore > 0) {
      return { key: "verksamhet", confidence: "low", score: topScore, secondScore, tied: true, suggestedKey: topKey };
    }
    const confidence = topScore >= 6 ? "high" : topScore >= 3 ? "medium" : "low";
    /** Osäker match → följ beskrivningen (verksamhet), inte konsult/foto/hund i blindo. */
    if (confidence === "low") {
      if (topScore >= 3 && secondScore === 0 && topKey !== "konsult" && topKey !== "verksamhet") {
        return { key: topKey, confidence: "medium", score: topScore, secondScore };
      }
      if (topScore >= 2 && topKey !== "konsult") {
        return { key: topKey, confidence: "low", score: topScore, secondScore };
      }
      return { key: "verksamhet", confidence: "low", score: topScore, secondScore, suggestedKey: topKey };
    }
    return { key: topKey, confidence, score: topScore, secondScore };
  }

  /**
   * Breda områden som användaren väljer i onboarding (steg 1).
   * Område = grov riktning. Beskrivningen (steg 3) avgör exakt bransch inom området.
   * `industries` = kandidat-pack inom området; `default` = används när beskrivningen är otydlig.
   * "other" har inga kandidater → fri tolkning av beskrivningen (följ texten).
   * @type {Record<string, { label: string; industries: string[]; default: string }>}
   */
  const AREAS = {
    beauty: { label: "Skönhet & hälsa", industries: ["frisor", "gym", "tarot"], default: "frisor" },
    food: { label: "Mat & café", industries: ["cafe", "restaurang"], default: "cafe" },
    craft: { label: "Hantverk & bygg", industries: ["byggfirma", "elektriker"], default: "byggfirma" },
    shop: { label: "Butik & produkter", industries: ["butik"], default: "butik" },
    services: { label: "Konsult & tjänster", industries: ["konsult", "advokat", "miljo"], default: "verksamhet" },
    creative: { label: "Kreativt & foto", industries: ["fotograf", "event"], default: "fotograf" },
    animals: { label: "Djur & omsorg", industries: ["hunddagis", "hundsalong"], default: "hunddagis" },
    other: { label: "Annat", industries: [], default: "verksamhet" },
  };

  /**
   * Steg 1 (område) + steg 3 (beskrivning) → exakt bransch-pack som styr text/bild/kort/ton.
   *
   * - "other" eller okänt område: fri tolkning av beskrivningen över alla branscher.
   * - Område med en kandidat: området ÄR branschen.
   * - Område med flera kandidater: beskrivningen väljer inom området; vid otydlig text
   *   används områdets default (aldrig generisk konsult såvida inte området är tjänster).
   *
   * @param {string} areaKey
   * @param {string} description
   * @returns {{ industry: string; area: string; source: "description"|"area"|"free" }}
   */
  function inferIndustryWithinArea(areaKey, description) {
    const key = String(areaKey || "").trim();
    const area = AREAS[key];

    // Okänt område eller "Annat" → följ beskrivningen fritt (full tolkning).
    if (!area || key === "other" || !area.industries.length) {
      const inf = inferIndustryFromDescription(description);
      return { industry: inf.key, area: area ? key : "other", source: "free" };
    }

    // Ett enda kandidat-pack → området är branschen.
    if (area.industries.length === 1) {
      return { industry: area.industries[0], area: key, source: "area" };
    }

    // Flera kandidater → låt beskrivningen välja inom området.
    const normalized = normalizeBizDescription(description);
    let best = area.default;
    let bestScore = -1;
    if (normalized) {
      for (const cand of area.industries) {
        const s = scoreIndustryFromHints(cand, normalized);
        if (s > bestScore) {
          bestScore = s;
          best = cand;
        }
      }
    }
    if (bestScore < 2) {
      return { industry: area.default, area: key, source: "area" };
    }
    return { industry: best, area: key, source: "description" };
  }

  function inferAreaFromIndustry(industry) {
    const ind = String(industry || "").trim();
    for (const [key, area] of Object.entries(AREAS)) {
      if (area.industries && area.industries.includes(ind)) return key;
    }
    return "other";
  }

  /**
   * Härled företagsnamn ur fri beskrivning (t.ex. "som heter Heta håret").
   * @param {string} raw
   * @returns {string}
   */
  function extractBrandFromDescription(raw) {
    const s = String(raw || "").trim();
    if (!s) return "";
    let m = s.match(/\bföretags(?:namn)?\s*(?:är|:)\s*["']?([^."'\n,]+)/i);
    if (m) return m[1].trim().slice(0, 48);
    m = s.match(/\bvarumärke\s*(?:är|:)\s*["']?([^."'\n,]+)/i);
    if (m) return m[1].trim().slice(0, 48);
    m = s.match(/\b(?:heter|called|namn(?:et|n)?(?:\s+är)?)\s+["']?([^."'\n,]+)/i);
    if (m) return m[1].trim().slice(0, 48);
    m = s.match(/["']([^"']{2,48})["']/);
    if (m) return m[1].trim();
    m = s.match(/\bsom heter\s+([^.\n,]+)/i);
    if (m) return m[1].trim().slice(0, 48);
    return "";
  }

  /** Ort/stad från beskrivning — t.ex. "i Hudiksvall". */
  function extractLocationFromDescription(raw) {
    const s = String(raw || "").trim();
    if (!s) return "";
    let m = s.match(/\bi\s+([A-ZÅÄÖ][a-zåäöA-ZÅÄÖ-]+(?:\s+[A-ZÅÄÖ][a-zåäö-]+)?)\b/);
    if (m) return m[1].trim().slice(0, 48);
    m = s.match(/\b(?:stad|ort|plats)[:\s]+([^.\n,]+)/i);
    if (m) return m[1].trim().slice(0, 48);
    return "";
  }

  /** Tjänster efter "erbjuder" — t.ex. klippning, färg, styling. */
  function parseOfferedServicesFromDescription(raw) {
    const s = String(raw || "").trim();
    if (!s) return [];
    const m = s.match(/\berbjuder\s+([^.\n]+)/i);
    if (!m) return [];
    return m[1]
      .split(/\s*,\s*|\s+\boch\s+\b/i)
      .map(function (part) {
        return part.trim().replace(/^och\s+/i, "");
      })
      .filter(Boolean)
      .slice(0, 3)
      .map(function (part) {
        return part.charAt(0).toUpperCase() + part.slice(1);
      });
  }

  function extractBookingHintFromDescription(raw) {
    const s = String(raw || "").trim();
    if (!s) return "";
    if (/bokadirekt/i.test(s)) return "BokaDirekt";
    if (/calendly/i.test(s)) return "Calendly";
    if (/cal\.com/i.test(s)) return "Cal.com";
    if (/boka(?:direkt|ning)?/i.test(s)) return "booking";
    return "";
  }

  function inferIndustryFromBrand(raw) {
    const normalized = normalizeBizDescription(raw);
    if (!normalized) return null;
    if (/^el[\s.\-–—]|^el$|\bel[\s.\-](?!l)/.test(normalized)) return "elektriker";
    if (/snick|snickeri|byggfirma|byggfirma|murare|taklagg|taklägg|vvs|rormok|rörmok|renover|entreprenad/.test(normalized)) {
      return "byggfirma";
    }
    if (/elektrik|elinstallation|eljour|elmontor|elmontör|elservice/.test(normalized)) {
      return "elektriker";
    }
    if (/frisör|frisor|salong|barber|hårsalon|harsalong/.test(normalized)) return "frisor";
    if (/hunddagis|hundpass/.test(normalized)) return "hunddagis";
    if (/hundtrim|hundsalong|hundfris/.test(normalized)) return "hundsalong";
    if (/restaurang|pizzeria|sushi|bistro/.test(normalized)) return "restaurang";
    if (/café|cafe|kafe|bageri|fika/.test(normalized)) return "cafe";
    if (/fotograf|foto studio/.test(normalized)) return "fotograf";
    if (/tarot|andlig|medium|synsk|spådom|orakel/.test(normalized)) return "tarot";
    if (/jretur|j\s*retur|atervinningscentral|returcentral|returstation/.test(normalized)) return "miljo";
    if (/atervinning|avfall|sophamt|miljotjanst|recycl/.test(normalized)) return "miljo";
    if (/\bretur\b/.test(normalized) && /avfall|sophamt|container|sorter|ovh|milj/.test(normalized)) return "miljo";
    return null;
  }

  /**
   * Beskrivning → bransch, område, varumärke och affärsplan (mål, CTA, sektioner).
   * @param {string} description
   */
  function resolveCreateContext(description, opts) {
    opts = opts || {};
    const desc = String(description || "").trim();
    const rawBrand = extractBrandFromDescription(desc) || String(opts.siteBrand || "").trim();
    const rawLocation = extractLocationFromDescription(desc);
    const split =
      global.AppDocument && typeof global.AppDocument.splitBrandAndLocation === "function"
        ? global.AppDocument.splitBrandAndLocation(rawBrand, rawLocation)
        : { brand: rawBrand, location: rawLocation };
    const brand = split.brand;
    const location = split.location;
    const offeredServices = parseOfferedServicesFromDescription(desc);
    const bookingHint = extractBookingHintFromDescription(desc);
    const inf = inferIndustryFromDescription(desc);
    let industryKey = inf.key;
    const fromBrand = inferIndustryFromBrand(brand || desc);
    if (fromBrand) {
      if (industryKey === "verksamhet" || industryKey === "konsult" || inf.confidence === "none" || inf.confidence === "low") {
        industryKey = fromBrand;
      }
    }
    const areaGuess = inferAreaFromIndustry(industryKey);
    const within = inferIndustryWithinArea(areaGuess, desc);
    if (industryKey !== inf.key && (inf.confidence === "none" || inf.confidence === "low")) {
      within.industry = industryKey;
    }
    const plan = resolveBusinessPlan(within.area, within.industry);
    return {
      industry: within.industry,
      area: within.area,
      brand,
      location,
      offeredServices,
      bookingHint,
      plan,
      confidence: inf.confidence,
      source: within.source,
    };
  }

  /**
   * Kundmål per mål-id. Easily bygger inte bara en snygg sajt — sajten ska hjälpa
   * verksamheten få kunder. Målet styr sektionernas ordning, korttyper och sekundär CTA.
   * (Primär CTA sätts per bransch nedan så den blir konkret, t.ex. "Boka tid".)
   */
  const GOAL_PLANS = {
    bookings: {
      secondaryCta: { text: "Se tjänster", href: "#tjanster" },
      sectionOrder: ["hero", "services", "gallery", "about", "faq", "booking", "contact", "footer"],
      cardIntents: ["services", "services", "testimonials"],
    },
    quote: {
      secondaryCta: { text: "Ring oss", href: "#kontakt" },
      sectionOrder: ["hero", "services", "about", "gallery", "faq", "contact", "footer"],
      cardIntents: ["services", "services", "services"],
    },
    visit: {
      secondaryCta: { text: "Se meny", href: "#meny" },
      sectionOrder: ["hero", "services", "gallery", "about", "faq", "booking", "contact", "footer"],
      cardIntents: ["pricing", "pricing", "services"],
    },
    sell: {
      secondaryCta: { text: "Kontakta oss", href: "#kontakt" },
      sectionOrder: ["hero", "services", "gallery", "about", "faq", "contact", "footer"],
      cardIntents: ["services", "services", "testimonials"],
    },
    trust: {
      secondaryCta: { text: "Om oss", href: "#om-oss" },
      sectionOrder: ["hero", "about", "services", "faq", "gallery", "contact", "footer"],
      cardIntents: ["services", "process", "testimonials"],
    },
    showcase: {
      secondaryCta: { text: "Kontakta oss", href: "#kontakt" },
      sectionOrder: ["hero", "gallery", "services", "about", "faq", "contact", "footer"],
      cardIntents: ["services", "packages", "testimonials"],
    },
  };

  /** Område → kundmål (steg 1 styr målet). */
  const AREA_GOAL = {
    beauty: "bookings",
    craft: "quote",
    food: "visit",
    shop: "sell",
    services: "trust",
    creative: "showcase",
    animals: "bookings",
  };

  /** Bransch → kundmål (används för "Annat" och för att finjustera inom område). */
  const INDUSTRY_GOAL = {
    frisor: "bookings",
    hundsalong: "bookings",
    hunddagis: "bookings",
    gym: "bookings",
    tarot: "bookings",
    cafe: "visit",
    restaurang: "visit",
    byggfirma: "quote",
    elektriker: "quote",
    fotograf: "showcase",
    event: "showcase",
    butik: "sell",
    konsult: "trust",
    advokat: "trust",
  };

  /** Bransch → konkret primär CTA som matchar kundmålet (scrollar till befintlig sektion). */
  const INDUSTRY_PRIMARY_CTA = {
    frisor: { text: "Boka tid", href: "#bokning" },
    hundsalong: { text: "Boka tid", href: "#bokning" },
    hunddagis: { text: "Boka provdag", href: "#bokning" },
    gym: { text: "Boka provpass", href: "#bokning" },
    tarot: { text: "Boka session", href: "#bokning" },
    cafe: { text: "Se meny", href: "#meny" },
    restaurang: { text: "Boka bord", href: "#bokning" },
    byggfirma: { text: "Begär offert", href: "#kontakt" },
    elektriker: { text: "Begär offert", href: "#kontakt" },
    fotograf: { text: "Se portfolio", href: "#galleri" },
    event: { text: "Boka möte", href: "#kontakt" },
    butik: { text: "Se produkter", href: "#tjanster" },
    konsult: { text: "Boka intro", href: "#kontakt" },
    advokat: { text: "Boka rådgivning", href: "#kontakt" },
  };

  /**
   * Översätter (område + bransch) → konkret affärsplan för sajten:
   * kundmål, primär/sekundär CTA, sektionsordning och korttyper.
   *
   * @param {string} areaKey  Valt område (steg 1). "other"/okänt → mål härleds ur branschen.
   * @param {string} industry Upplöst bransch (styr text/bild/ton).
   * @returns {{ goal: string; primaryCta: {text:string,href:string}; secondaryCta: {text:string,href:string}; sectionOrder: string[]; cardIntents: string[] }}
   */
  function resolveBusinessPlan(areaKey, industry) {
    const ind = String(industry || "verksamhet").trim() || "verksamhet";
    const area = String(areaKey || "").trim();
    let goalId = AREA_GOAL[area];
    if (!goalId || area === "other") {
      goalId = INDUSTRY_GOAL[ind] || "trust";
    }
    const plan = GOAL_PLANS[goalId] || GOAL_PLANS.trust;
    const primary = INDUSTRY_PRIMARY_CTA[ind] || { text: "Kontakta oss", href: "#kontakt" };
    return {
      goal: goalId,
      primaryCta: { text: primary.text, href: primary.href },
      secondaryCta: { text: plan.secondaryCta.text, href: plan.secondaryCta.href },
      sectionOrder: plan.sectionOrder.slice(),
      cardIntents: plan.cardIntents.slice(),
    };
  }

  function pack(industryKey) {
    const key = industryKey || getIndustry();
    return INDUSTRIES[key] || INDUSTRIES.verksamhet || INDUSTRIES.konsult;
  }

  /** Hero-rubrik och ingress från kundens fria beskrivning — inte förvald branschcopy. */
  function personalizeHeroFromBrief(doc, brief) {
    if (!doc || !doc.sections || !doc.sections.hero) return;
    const text = String(brief || (doc.page && doc.page.onboardingDescription) || "").trim();
    if (text.length < 6) return;
    const c = doc.sections.hero.content || (doc.sections.hero.content = {});
    const indKey = (doc.page && doc.page.industry) || getIndustry();
    const P = pack(indKey);
    const brand = extractBrandFromDescription(text);
    const location = extractLocationFromDescription(text);
    if (brand) {
      c["hero-title"] = (location ? brand + " — " + location : brand).slice(0, 120);
    } else {
      const first = text.split(/[.!?\n]/)[0].trim();
      if (first.length >= 8) c["hero-title"] = first.slice(0, 120);
    }
    c["hero-lead"] = composeHeroLeadFromBrief(text, c["hero-lead"] || pick(P.heroLead, hashStr(text))).slice(
      0,
      280,
    );
  }

  function shouldPersonalizeFromBrief(page) {
    if (global.__AI_GENERATION_FAST__) return false;
    if (!page) return false;
    const brief = String(page.onboardingDescription || "").trim();
    if (brief.length < 6) return false;
    const ind = String(page.industry || "verksamhet");
    if (ind === "verksamhet") return true;
    const inf = inferIndustryFromDescription(brief);
    return inf.confidence === "none" || inf.confidence === "low";
  }

  /** Blandas med branschtext i kortsektionen så rubriker/ingress inte känns tjänst- eller malllåsta. */
  const FLEX_BLOCK_TITLES = [
    "Utvalt",
    "Erbjudanden & paket",
    "Tre saker att veta",
    "Höjdpunkter",
    "Byggstenar du formar själv",
    "Så kan vi hjälpa",
    "Rader du byter ut hur du vill",
    "Meny & tillval",
    "Siffror & löften",
    "Process & praktik",
  ];
  const FLEX_BLOCK_LEADS = [
    "Tre rader som gör det lätt att förstå vad ni erbjuder på några sekunder.",
    "Korten kan visa pris, öppettider, garanti eller annat kunder ofta undrar över.",
    "Håll undertexten kort och konkret — känslan kommer från er bild och era rubriker.",
    "En tydlig struktur som besökarna känner igen från andra välskötta webbplatser.",
  ];

  /** Vilken sorts kort väljs styr vilken textsamling AI hämtar från — ett val per kort. */
  const CONTENT_BLOCK_INTENTS = ["pricing", "faq", "packages", "process", "testimonials", "services"];

  function normalizeContentBlockIntent(raw) {
    const r = String(raw || "").trim();
    return CONTENT_BLOCK_INTENTS.includes(r) ? r : "services";
  }

  const INTENT_SECTION_HEADINGS = {
    pricing: {
      titles: ["Priser & paket", "Kom igång med prisbilden", "Så är priserna uppdelade"],
      leads: [
        "Tre rader för att göra det enkelt att hitta prisvägen — inte hela tabellen på en gång.",
        "En rad per tema; stor lista eller offert får ligga bredvid eller efter vid behov.",
      ],
    },
    faq: {
      titles: ["Vanliga frågor", "Snabba svar", "Det många undrar över först"],
      leads: [
        "Tre korta rader nedan kan leda ner till FAQ med fulla svar.",
        "Rubrik som lockar läsaren vidare — ni bestämmer vad som visas var.",
      ],
    },
    packages: {
      titles: ["Paket", "Kliv in på rätt nivå", "Välj vad som matchar"],
      leads: ["Ni visar vad som finns — läs mer läggs gärna längre ner på sidan."],
    },
    process: {
      titles: ["Så kommer ni igång", "Stegen", "Er väg hit"],
      leads: ["Kort vad som händer först och hur man tar nästa steg."],
    },
    testimonials: {
      titles: ["Omdömen", "Röster i korthet", "Nöjda på ett ögonkast"],
      leads: [
        "Tre korta intryck; byt till riktiga citat när ni vill och hänvisa vidare vid behov.",
      ],
    },
    services: { titles: [], leads: [] },
  };

  const PRICING_FALLBACK = [
    {
      title: "Prislista",
      body: "Se exempel på nivåer och tillval — era riktiga belopp placerar du i ett större avsnitt eller vid bokning.",
    },
    {
      title: "Nivåer & tillval",
      body: "Kort hur ni tänker runt bas, standard och lyx — detaljlistan ligger ett steg bort för den som vill läsa vidare.",
    },
    {
      title: "Offert & volym",
      body: "Större uppdrag prissätts på riktigt behov — tipsa hur man tar kontakt eller går vidare nedan på sidan.",
    },
    {
      title: "Kampanjer",
      body: "Berätta kort om ett erbjudande; villkor skriver ni ut där det finns plats.",
    },
    {
      title: "Medlemskap / abonnemang",
      body: "En rad om hur modellen känns; bindning och exakta nivåer hör hemma i längre text.",
    },
    {
      title: "Betalning & avbokning",
      body: "Hänvisa till tydliga villkor i FAQ eller policy när besökaren behöver alla detaljer.",
    },
  ];

  const PRICING_EXTRA = {
    cafe: [
      {
        title: "Kaffe",
        body: "Espresso, cappuccino och filter — lägg in era priser här.",
      },
      {
        title: "Fika & bakverk",
        body: "Kanelbullar, bakverk och söta tillbehör — uppdatera efter säsong.",
      },
      {
        title: "Lunch",
        body: "Smörgåsar, sallad och varm mat — byt till dagens rätter.",
      },
    ],
    frisor: [
      {
        title: "Behandlingar",
        body: "Klippning, färg och styling för vardag och fest — inte hela prislistan, bara en mjuk ingång.",
      },
      {
        title: "Pris & tid",
        body: "Pris följer hår, produkt och tid — detaljer visas vid bokning eller i prisavsnitt nedanför.",
      },
      {
        title: "Tillval & vård",
        body: "Kur, inpackning och små extras i kortform; full översikt där besökaren förväntar sig mer text.",
      },
    ],
    gym: [
      {
        title: "Medlemskap",
        body: "Prov, månad och längre pass i översikt — siffrorna där de hör hemma, inte i tre små rutor.",
      },
      {
        title: "PT & klasser",
        body: "Berätta vad som finns; scheman och paket länkar du vidare till.",
      },
      {
        title: "Frys & uppsägning",
        body: "Hänvisa till FAQ eller policy där reglerna beskrivs i lugn takt.",
      },
    ],
    konsult: [
      {
        title: "Arvodemodell",
        body: "Projekt, sprint eller retainer i korthet; omfattning och offert i större texter eller möte.",
      },
      {
        title: "Startpaket",
        body: "Förtroende på en rad — vad som ingår punkt för punkt kan ligga i bilaga eller vid kontakt.",
      },
      {
        title: "Leverans & support",
        body: "Hur ni följer upp efter första steget — SLA och djupdetaljer någon annanstans.",
      },
    ],
    fotograf: [
      {
        title: "Paket & timmar",
        body: "Halvdag, heldag och tillägg i korthet — bilder och stil visar resten.",
      },
      {
        title: "Leverans & licens",
        body: "Peka läsaren till var filformat och användning beskrivs i fulltext.",
      },
      {
        title: "Resa & logistik",
        body: "Ni åker dit det behövs — körtid och kost tas upp i offerten, inte här på några rader.",
      },
    ],
    restaurang: [
      {
        title: "À la carte",
        body: "Säsongens rätter — byt till era egna namn och priser i kortet.",
      },
      {
        title: "Vin & dryck",
        body: "Kort urval från vinlistan — länka till full meny eller PDF vid behov.",
      },
      {
        title: "Lunch",
        body: "Vardagslunch vardagar — uppdatera rätter och pris här.",
      },
    ],
    byggfirma: [
      {
        title: "Prisnivåer",
        body: "ROT, etapper och säkerhet i korthet; siffrorna alltid i skriven offert.",
      },
      {
        title: "Jour & småjobb",
        body: "Hur snabbt ni kan rycka in — full taxa och villkor i dokumentation.",
      },
      {
        title: "Större projekt",
        body: "Möte och genomgång innan siffra sätts — tipsa om nästa steg.",
      },
    ],
    event: [
      {
        title: "Format",
        body: "Från intimt till arena — peka besökaren till case eller offertsteg.",
      },
      {
        title: "Teknik & scen",
        body: "Ljud, ljus och känsla i en rad; specifikationer i bifogat material.",
      },
      {
        title: "Budgetspann",
        body: "Ni jobbar i intervall mot brief — exakt offert efter avstämning.",
      },
    ],
    hundsalong: [
      {
        title: "Bad & trim",
        body: "Storlek och pälstyp styr tid och pris — hela spannet beskriver ni i längre avsnitt.",
      },
      {
        title: "Valp & första besök",
        body: "Mjuk start i salongen i kortform; rutiner och pris där det passar bättre.",
      },
      {
        title: "Tillägg",
        body: "T.ex. specialschampo eller extra borsttid — hänvisa vidare för full lista.",
      },
    ],
    hunddagis: [
      {
        title: "Halvdag & hel dag",
        body: "Olika nivåer beroende på hur länge hunden stannar — full prisbild i längre avsnitt.",
      },
      {
        title: "Provdag",
        body: "Första besöket i kortform — ni beskriver hur provdag och intro funkar på sidan.",
      },
      {
        title: "Promenad & tillägg",
        body: "Extra promenad eller helgpass — hänvisa till full lista vid behov.",
      },
    ],
    tarot: [
      {
        title: "Kort session",
        body: "Ca 30 min — en tydlig fråga och genomgång av korten i lugn takt.",
      },
      {
        title: "Djupare läsning",
        body: "Ca 60 min — mer utrymme för samtal, uppföljning och reflektion.",
      },
      {
        title: "Online",
        body: "Samma upplägg via video — boka tid som passar dig hemifrån.",
      },
    ],
    butik: [
      {
        title: "Tjänster i butik",
        body: "Styling eller montering på en rad; timtaxa och paket längre ned.",
      },
      {
        title: "Presentkort & kampanj",
        body: "Ett enkelt erbjudande här — villkor och belopp utan för mycket finstilt i samma kort.",
      },
      {
        title: "Frakt & leverans",
        body: "Gräns för fri frakt eller upphämtning — detaljerad policy för den som scrollar vidare.",
      },
    ],
    advokat: [
      {
        title: "Inledande kontakt",
        body: "Hur ett första möte funkar och vad som händer sedan — tariffer i informationsblad eller offert.",
      },
      {
        title: "Arvode",
        body: "Timme eller fast pris i korthet; komplettera med standardtext om kostnad där det passar.",
      },
      {
        title: "Liten fast modul",
        body: "Om ni säljer spårmallar eller checklistor — vad som ingår i det stora.",
      },
    ],
  };

  const PACKAGES_FALLBACK = [
    { title: "Start", body: "Det nödvändigaste: tidsram, vad som ingår och hur ni kommer igång." },
    { title: "Plus", body: "Mer omfattning, snabbare svar eller extra leverans — beskriv skillnaden." },
    { title: "Komplett", body: "Helhetslösning med uppföljning — skriv vad som skiljer från Plus." },
    { title: "Essential", body: "Ett komprimerat paket för mindre behov eller test." },
    { title: "Scale", body: "För team eller volym — lägg till er definition." },
    { title: "Enterprise", body: "Skräddat: kontakt, workshop och dedikerad kontakt." },
  ];

  const PACKAGES_EXTRA = {
    cafe: [
      { title: "Fika till kontoret", body: "Kaffe + bakverk för 10–40 pers — logistik och prisintervall." },
      { title: "Rosteribesök", body: "Provsmakning och genomgång av utbud — bokning och varaktighet." },
    ],
    fotograf: [
      { title: "Bröllop standard", body: "8 tim, två fotografer, webbgalleri + USB med högupplöst." },
      { title: "Företag halvdag", body: "Miljö + porträtt, leverans inom 10 arbetsdagar." },
    ],
    gym: [
      { title: "Startpaket", body: "Introduktion + träningsprogram första månaden." },
      { title: "PT-boost", body: "Fyra PT-pass inom 30 dagar — eller er standard." },
    ],
    konsult: [
      { title: "Beslutssprint", body: "1 vecka: workshop, dokument och prioriterad backlog." },
      { title: "Kontinuitet", body: "Månadsvis råd och uppföljning — omfattning enligt avtal." },
    ],
    event: [
      { title: "Konferenspaket", body: "Scen, ljud, moderator och tidsplan — ange vad som ingår." },
    ],
  };

  const PROCESS_STEPS = {
    _default: [
      { title: "1. Kontakt", body: "Ni hör av er — vi bokar tid eller svarar med nästa steg." },
      { title: "2. Avstämning", body: "Kort genomgång av behov, budget och tidsram." },
      { title: "3. Förslag", body: "Offert, meny eller plan — ni får något konkret att ta ställning till." },
      { title: "4. Genomförande", body: "Leverans, besök eller produktion enligt överenskommelse." },
      { title: "5. Uppföljning", body: "Vi säkerställer att resultatet känns rätt och fångar feedback." },
      { title: "6. Löpande", body: "Vid behov: återkommande bokning, abonnemang eller retainer." },
    ],
    konsult: [
      { title: "1. Kartläggning", body: "Mål, nuläge och beslut som ska fattas — kort workshopsession." },
      { title: "2. Analys & underlag", body: "Data, intervjuer och skiss till vägval." },
      { title: "3. Beslutsunderlag", body: "Alt. A/B med tydliga konsekvenser och rekommendation." },
      { title: "4. Plan för genomförande", body: "Vecka för vecka: ansvar, milstolpar, risker." },
      { title: "5. Utrullning & stöd", body: "Facilitering, spårning och justering under resans gång." },
    ],
    cafe: [
      { title: "1. Välj & beställ", body: "Vänlig disken eller app — vi guidar vid allergi." },
      { title: "2. Brygg & tillagning", body: "Nyrostat kaffe och färska råvaror enligt beställning." },
      { title: "3. Servering", body: "Tydlig presentation och avslappnat tempo." },
      { title: "4. Ät & fika", body: "Plats att landa — wifi och musik i lagom nivå." },
      { title: "5. Återkom", body: "Stämpelkort, nyheter på tavlan eller nybryggt nästa gång." },
    ],
    gym: [
      { title: "1. Provträna", body: "Gratis eller reducerat första pass — ni sätter reglerna." },
      { title: "2. Introduktion", body: "Genomgång av lokaler, säkerhet och enkel plan." },
      { title: "3. Program", body: "Klasser och gymtid som matchar nivå och mål." },
      { title: "4. Uppföljning", body: "Coach check-in eller mätning efter 4–6 veckor." },
      { title: "5. Medlem över tid", body: "Event, frystid och förnya — tydlig kommunikation." },
    ],
    frisor: [
      { title: "1. Boka & förbered", body: "Inspiration och allergi/test vid färg — ni anger rutin." },
      { title: "2. Konsultation", body: "Textur, livsstil och realistisk förväntan." },
      { title: "3. Behandling", body: "Klipp, färg eller vård — steg för steg i lugn takt." },
      { title: "4. Styling & hemma-tips", body: "Produkter och enkel skötsel tills nästa besök." },
      { title: "5. Återbokning", body: "Intervall som passar färg och klippning." },
    ],
    fotograf: [
      { title: "1. Behov & stil", body: "Samtal om känsla, referenser och logistik." },
      { title: "2. Plan & shotlist", body: "Tidslinje, platser och contingens vid väder." },
      { title: "3. Fotografering", body: "Lugnt tempo med tydlig kommunikation under dagen." },
      { title: "4. Redigering", body: "Färghantering och urval enligt överenskommelse." },
      { title: "5. Leverans", body: "Galleri, filer och tryckfärdiga vid behov." },
    ],
    restaurang: [
      { title: "1. Boka", body: "Allergier och sällskapsstorlek — bekräftelse direkt." },
      { title: "2. Välkommen", body: "Coat, bord och första drycken." },
      { title: "3. Servering", body: "Meny som följer säsong och tempo vid bordet." },
      { title: "4. Avrundning", body: "Efterrätt, kaffe och betalning smidigt." },
      { title: "5. Återkom", body: "Nyheter, presentkort eller nästa bokning." },
    ],
  };

  const TESTIMONIALS_FALLBACK = [
    { title: "\"Äntligen tydlighet\"", body: "— Företagskund, 2025. Byt till äkta namn och tillstånd." },
    { title: "\"Professionellt och lugnt\"", body: "— Privatkund. Justera citat och kontext." },
    { title: "\"Rekommenderar varmt\"", body: "— Samarbetspartner. Lägg till bransch eller roll." },
    { title: "\"Snabb återkoppling\"", body: "— Beställare. Byt till verkligt case." },
    { title: "\"Kände mig sedd\"", body: "— Kund efter första besöket." },
    { title: "\"Leveransen höll\"", body: "— Projekt i tid och budget enligt plan." },
  ];

  const TESTIMONIALS_EXTRA = {
    cafe: [
      { title: "\"Bästa cappuccin på länge\"", body: "— Stammis, vår. Byt till ert citat." },
    ],
    gym: [
      { title: "\"Bra coaching och stämning\"", body: "— Medlem sedan 2024." },
    ],
    fotograf: [
      { title: "\"Bilderna fångade dagen\"", body: "— Bröllopspar, sommar." },
    ],
    frisor: [
      { title: "\"Går alltid härifrån nöjd\"", body: "— Kund i tre år." },
    ],
  };

  const FAQ_CARD_FALLBACK = [
    {
      title: "Hur funkar bokning?",
      body: "Bokning, avbokning och vad du behöver veta innan besöket — läs vidare i frågelistan nedanför.",
    },
    {
      title: "Vad ingår i priset?",
      body: "Översikt här — exakta poster och meny längre ned eller när du bokar.",
    },
    {
      title: "Policy & trygghet",
      body: "Kort att ni har tydliga villkor; hela policyn hör hemma i ett större stycke, inte i tre rutor.",
    },
    {
      title: "För företag",
      body: "Ni tar emot företagskunder — beskriv volym och offert där det passar bättre.",
    },
    {
      title: "Öppettider & avvikelser",
      body: "Tipsa om var tiderna alltid är uppdaterade så besökaren scrollar rätt.",
    },
  ];

  function pricingPool(k) {
    const extra = PRICING_EXTRA[k] || [];
    return [...extra, ...PRICING_FALLBACK];
  }

  function packagesPool(k) {
    const extra = PACKAGES_EXTRA[k] || [];
    return [...extra, ...PACKAGES_FALLBACK];
  }

  function processPool(k) {
    return (PROCESS_STEPS[k] && PROCESS_STEPS[k].length >= 3 ? PROCESS_STEPS[k] : PROCESS_STEPS._default).slice();
  }

  function testimonialsPool(k) {
    const extra = TESTIMONIALS_EXTRA[k] || [];
    return [...extra, ...TESTIMONIALS_FALLBACK];
  }

  function faqCardPool(P, k) {
    const fromPack = (P.faq || []).map((f) => ({ title: f.q, body: f.a }));
    const merged = [...fromPack, ...FAQ_CARD_FALLBACK];
    if (merged.length >= 3) return merged;
    const K = INDUSTRIES.konsult;
    return [...merged, ...(K.faq || []).map((f) => ({ title: f.q, body: f.a }))];
  }

  function servicesPool(P) {
    const rows = Array.isArray(P.services) && P.services.length ? P.services : INDUSTRIES.konsult.services;
    return rows.slice();
  }

  function intentBlockPool(intent, industryKey) {
    const k = String(industryKey || "konsult").trim() || "konsult";
    const P = INDUSTRIES[k] || INDUSTRIES.konsult;
    const inorm = normalizeContentBlockIntent(intent);
    switch (inorm) {
      case "pricing":
        return pricingPool(k);
      case "faq":
        return faqCardPool(P, k);
      case "packages":
        return packagesPool(k);
      case "process":
        return processPool(k);
      case "testimonials":
        return testimonialsPool(k);
      case "services":
      default:
        return servicesPool(P);
    }
  }

  function pickBlockRow(pool, seed) {
    if (!pool || !pool.length) return { title: "Rubrik", body: "Skriv det som passar här." };
    return pool[seed % pool.length];
  }

  /** Korta rader för kort — inte långa brödtexter eller hela FAQ-svar. */
  function asCardTeaserBody(s, maxLen) {
    const max = maxLen || 150;
    let t = String(s || "")
      .replace(/\s+/g, " ")
      .trim();
    if (!t) return t;
    if (t.length <= max) return t;
    const cut = t.slice(0, max);
    const lastPeriod = cut.lastIndexOf(".");
    if (lastPeriod > 48) return cut.slice(0, lastPeriod + 1);
    const lastSpace = cut.lastIndexOf(" ");
    return (lastSpace > 44 ? cut.slice(0, lastSpace) : cut).trim() + " …";
  }

  function defaultCardCtaDefaults(intent) {
    const i = normalizeContentBlockIntent(intent);
    switch (i) {
      case "pricing":
        return { ctaText: "Läs mer", ctaHref: "#priser" };
      case "faq":
        return { ctaText: "Läs mer", ctaHref: "#fragor" };
      case "packages":
        return { ctaText: "Se mer", ctaHref: "#tjanster" };
      case "process":
        return { ctaText: "Boka", ctaHref: "#kontakt" };
      case "testimonials":
        return { ctaText: "Läs mer", ctaHref: "#om-oss" };
      default:
        return { ctaText: "Läs mer", ctaHref: "#tjanster" };
    }
  }

  function pickThreeBlockRows(pool, seedBase) {
    const used = new Set();
    const out = [];
    for (let i = 0; i < 3; i++) {
      let hi = hashStr(seedBase + "|svc-card-" + i);
      let row = pickBlockRow(pool, hi);
      let guard = 0;
      while (row && row.title && used.has(row.title) && guard < 28) {
        guard++;
        hi += 1021 + guard * 47;
        row = pickBlockRow(pool, hi);
      }
      if (row && row.title) used.add(row.title);
      out.push(row);
    }
    return out;
  }

  function pick(arr, seed) {
    if (!arr || !arr.length) return "";
    return arr[seed % arr.length];
  }

  function pickDistinct(arr, seed, offset) {
    if (!arr || !arr.length) return "";
    if (arr.length === 1) return arr[0];
    const a = pick(arr, seed);
    let b = pick(arr, seed + (offset || 17));
    let guard = 0;
    while (b === a && guard < 12) {
      guard++;
      b = pick(arr, seed + (offset || 17) + guard * 31);
    }
    return b;
  }

  /** Roterar index 0..len-1 utifrån seed */
  function rotateStart(len, seed) {
    if (len <= 0) return 0;
    return seed % len;
  }

  function stripHtml(html) {
    const d = document.createElement("div");
    d.innerHTML = html;
    return d.textContent || d.innerText || "";
  }

  /** Ta bort äldre demotext som lades in i rutan (ska aldrig synas för besökare). */
  function stripLegacyAiMeta(s) {
    if (!s || typeof s !== "string") return "";
    let out = s.split(/\s*—\s*Finjusterat\s+för\b/i)[0];
    out = out.split(/\s*—\s*SEO-hint\s*\(demo\)/i)[0];
    return out
      .replace(/\s*;\s*mallröst:[^.]*\.?/gi, "")
      .replace(/\s*Behåll era siffror[^.]*\./gi, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * @param {"hero"|"about"|"services"|"services-heading"|"gallery-heading"|"faq"|"faq-heading"|"cta"|"generic"} context
   */
  async function generateTemplate(context, seedText) {
    const fast = !!global.__AI_GENERATION_FAST__;
    await delay((fast ? 28 : 260) + (hashStr(seedText + getIndustry()) % (fast ? 50 : 180)));
    const P = pack();
    const tpl = getTemplate();
    const h = hashStr(seedText + context + tpl + getIndustry());

    switch (context) {
      case "hero":
        return {
          title: pick(P.heroTitle, h),
          lead: pick(P.heroLead, h + 1),
        };
      case "about":
        return {
          p1: pick(P.about, h),
          p2: pickDistinct(P.about, h + 3, 19),
        };
      case "services-heading": {
        const titles = [...FLEX_BLOCK_TITLES, ...(P.servicesTitle || [])];
        const leads = [...FLEX_BLOCK_LEADS, ...(P.servicesLead || [])];
        return {
          title: pick(titles, h),
          lead: pick(leads, h + 2),
        };
      }
      case "gallery-heading":
        return {
          title: pick(P.galleryTitle, h),
          lead: pick(P.galleryLead, h + 5),
        };
      case "faq-heading":
        return {
          title: pick(P.faqTitle, h),
        };
      case "services": {
        const pool = intentBlockPool("services", getIndustry());
        const row = pickBlockRow(pool, h);
        return {
          title: row.title,
          body: row.body,
        };
      }
      case "faq": {
        const start = rotateStart(P.faq.length, h);
        const row = P.faq[start % P.faq.length];
        return { q: row.q, a: row.a };
      }
      case "cta":
        return { label: pick(P.cta, h) };
      case "generic": {
        const stripped = stripHtml(String(seedText ?? ""))
          .replace(/\s+/g, " ")
          .trim();
        if (!stripped) return { text: pick(P.about, h) };
        /** Undvik att byta ut telefon/e-post mot lång brödtext om panelen ändå träffar fel fält. */
        const compact = stripped.replace(/\s/g, "");
        if (/^[+()\d\s.-]{6,30}$/.test(stripped)) return { text: stripped };
        if (compact.includes("@") && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(compact) && stripped.length < 96) {
          return { text: stripped };
        }
        return { text: pick(P.about, h) };
      }
      default:
        return { text: pick(P.about, h) };
    }
  }

  async function generate(context, seedText, opts) {
    opts = opts || {};
    const fallback = await generateTemplate(context, seedText);
    const TIE = global.TextIntelligenceEngine;
    if (!TIE || typeof TIE.generate !== "function") {
      return fallback;
    }
    const tieResult = await TIE.generate(context, seedText, opts);
    return mergeGenerateWithFallback(context, tieResult, fallback);
  }

  function mergeGenerateWithFallback(context, tieResult, fallback) {
    tieResult = tieResult || {};
    fallback = fallback || {};
    switch (context) {
      case "hero":
        return {
          title: tieResult.title || fallback.title,
          lead: tieResult.lead || fallback.lead,
        };
      case "about":
        return {
          p1: tieResult.p1 || fallback.p1,
          p2: tieResult.p2 || fallback.p2,
        };
      case "services-heading":
      case "gallery-heading":
      case "faq-heading":
        return {
          title: tieResult.title || fallback.title,
          lead: tieResult.lead != null ? tieResult.lead : fallback.lead,
        };
      case "services":
        return {
          title: tieResult.title || fallback.title,
          body: tieResult.body || fallback.body,
        };
      case "faq":
        return {
          q: tieResult.q || fallback.q,
          a: tieResult.a || fallback.a,
        };
      case "cta":
        return { label: tieResult.label || fallback.label };
      default:
        return Object.assign({}, fallback, tieResult);
    }
  }

  function shortenSmart(t, maxWords) {
    const s = t.replace(/\s+/g, " ").trim();
    if (!s) return s;
    const parts = s.split(/(?<=[.!?])\s+/);
    if (parts[0] && parts[0].length >= 24) return parts[0].trim();
    const words = s.split(/\s+/);
    const cap = maxWords || Math.max(8, Math.floor(words.length * 0.5));
    if (words.length <= cap) return s;
    return words.slice(0, cap).join(" ") + " …";
  }

  async function improve(text) {
    await delay(220);
    let t = stripLegacyAiMeta(stripHtml(text).trim());
    const P = pack();
    const h = hashStr((t || "") + getIndustry() + "|improve");
    if (!t) {
      return pick(P.about, h);
    }
    const normalized = t.replace(/\s+/g, " ").trim();
    if (normalized.length < 72) {
      return pickDistinct(P.about, h, 17);
    }
    if (!/[.!?…]$/.test(normalized)) {
      return normalized + ".";
    }
    return normalized;
  }

  async function shorten(text) {
    await delay(160);
    const t = stripLegacyAiMeta(stripHtml(text).trim());
    if (!t) return t;
    return shortenSmart(t, null);
  }

  async function seo(text) {
    await delay(220);
    let t = stripLegacyAiMeta(stripHtml(text).trim());
    if (!t) return pick(P.heroLead, hashStr(getIndustry() + "|seo"));
    const P = pack();
    const h = hashStr(t + "|seo");
    const base = t.replace(/\s+/g, " ").replace(/\.$/, "").trim();
    const extra = pick(P.heroLead, h + 5).replace(/\s+/g, " ").replace(/\s*\.$/, "").trim();
    if (!extra) return base.endsWith(".") ? base : base + ".";
    return (base.endsWith(".") ? base.slice(0, -1) : base) + ". " + (extra.endsWith(".") ? extra : extra + ".");
  }

  function ensureSentenceEnd(s) {
    const t = String(s || "").trim();
    if (!t) return t;
    return /[.!?…]$/.test(t) ? t : t + ".";
  }

  function capitalizeSentence(s) {
    const t = String(s || "").trim();
    if (!t) return t;
    return t.charAt(0).toUpperCase() + t.slice(1);
  }

  function parseBriefHints(brief) {
    let t = stripLegacyAiMeta(stripHtml(String(brief || "")))
      .replace(/\s+/g, " ")
      .trim();
    t = t.replace(
      /^(jag vill|det ska|texten ska|nämna|ta med|handla om|skriv att|lägg till|berätta om|fokus på)\s+/i,
      ""
    );
    const parts = t
      .split(/[,;]|\s+och\s+|\.\s+(?=[A-ZÅÄÖa-zåäö])/)
      .map(function (s) {
        return s.trim();
      })
      .filter(function (s) {
        return s.length >= 2;
      });
    if (parts.length) return parts;
    return t ? [t] : [];
  }

  function themeHintIntoSentence(hint) {
    const raw = String(hint || "").trim();
    const h = raw.toLowerCase();
    if (!raw || raw.length < 2) return "";

    if (/^\d+\s*(\+?\s*)?år/.test(h) || /sedan \d+|över \d+ år/i.test(h)) {
      const years = h.match(/\d+/);
      const n = years ? years[0] : "många";
      return "Med över " + n + " års erfarenhet har vi byggt upp ett rykte för kvalitet och tydlig kommunikation";
    }
    if (/familjeföretag|familieägt|familjeägt|familje\s*ägt/i.test(h)) {
      return "Som familjeföretag tar vi personligt ansvar — samma kontaktperson följer er från offert till färdigt resultat";
    }
    if (/specialis|fokus(erar|) på|jobbar (mest|primärt) med|inriktade på/i.test(h)) {
      const topic = raw
        .replace(/.*?(specialiserade på|specialiserar oss på|fokus på|fokuserar på|jobbar (mest|primärt) med|inriktade på)\s+/i, "")
        .trim();
      if (topic) {
        return capitalizeSentence(
          "Vårt fokus ligger på " + topic.toLowerCase() + " — med noggrann planering och tydliga besked"
        );
      }
    }
    if (/kök|bad|renovering|snickeri|bygg|montage|inredning|tak|altan|uterum|garage/i.test(h) && raw.length < 72) {
      return capitalizeSentence(
        "Vi hjälper er med " + raw.toLowerCase() + " — strukturerat, dokumenterat och med tydliga besked längs vägen"
      );
    }
    if (/(^|\s)(i\s+)?[a-zåäö]+(?:\s+[a-zåäö]+)?$/.test(h) && raw.length < 36 && !/år|mail|@|offert/.test(h)) {
      if (/^el[\s.\-]|^el$|\bel[\s.\-]/.test(h)) return "";
      if (raw.split(/\s+/).length <= 2 && raw.length < 24) return "";
      const place = raw.replace(/^i\s+/i, "").trim();
      return capitalizeSentence("Verksamheten är etablerad i " + place.toLowerCase());
    }
    if (/certifier|auktoriser|behörig|id06|försäkr/i.test(h)) {
      return capitalizeSentence("Teamet är " + raw.toLowerCase() + " — så att ni kan känna er trygga i varje steg");
    }
    if (/@|mail|e-post|telefon|tel\b|ring/i.test(h)) return "";
    if (raw.length <= 52 && !/[.!?]/.test(raw)) {
      return capitalizeSentence("Ett viktigt inslag hos oss är " + raw.toLowerCase());
    }
    return "";
  }

  function composeAboutFromBrief(brief, opts) {
    opts = opts || {};
    const hints = parseBriefHints(brief);
    const brand = String(opts.brand || "").trim();
    const location = String(opts.location || "").trim();
    const P = pack();
    const h = hashStr(brief + getIndustry() + String(opts.paragraph || "p1"));
    const sentences = [];
    const used = new Set();

    function pushSentence(s) {
      const line = ensureSentenceEnd(String(s || "").trim());
      if (!line || line.length < 12) return;
      const key = line.slice(0, 28).toLowerCase();
      if (used.has(key)) return;
      used.add(key);
      sentences.push(line);
    }

    if (opts.paragraph !== "p2" && brand) {
      const locPart =
        location && brand.toLowerCase().indexOf(location.toLowerCase()) === -1 ? " i " + location : "";
      pushSentence(brand + locPart + " — " + pick(P.about, h + 3).replace(/\.$/, "").toLowerCase());
    }

    hints.forEach(function (hint) {
      if (sentences.length >= 2) return;
      pushSentence(themeHintIntoSentence(hint));
    });

    if (opts.paragraph === "p2") {
      if (!sentences.length) pushSentence(pickDistinct(P.about, h + 5, 13));
      if (sentences.length < 2) pushSentence(pickDistinct(P.about, h + 11, 23));
    } else {
      if (!sentences.length) pushSentence(pick(P.about, h));
      if (sentences.length < 2) pushSentence(pickDistinct(P.about, h + 7, 17));
    }

    return sentences.slice(0, 2).join(" ").slice(0, 600);
  }

  function composeHeroLeadFromBrief(brief, fallbackLead) {
    const hints = parseBriefHints(brief);
    const themed = [];
    hints.forEach(function (hint) {
      const line = themeHintIntoSentence(hint);
      if (line) themed.push(line.replace(/\.$/, ""));
    });
    if (themed.length) {
      return ensureSentenceEnd(themed.slice(0, 2).join(". ") + ". " + String(fallbackLead || "").replace(/\.$/, ""));
    }
    for (let i = 0; i < hints.length; i++) {
      const hint = String(hints[i] || "").trim();
      if (hint.length < 12) continue;
      if (/^(el olle|[a-zåäö]{2,}\s+[a-zåäö]{2,})$/i.test(hint) && hint.split(/\s+/).length <= 3) continue;
      return ensureSentenceEnd(hint);
    }
    return fallbackLead;
  }

  /**
   * Skriver om en sektion utifrån stödord i chatten — skapar ny text, klistrar inte in råinput.
   * @param {"hero"|"about"|"services"|"contact"|"faq"} target
   * @param {string} briefText
   */
  async function fillSectionFromBrief(target, briefText) {
    const SS = global.SiteState;
    if (!SS?.patch || !SS.get) return false;

    const brief = stripLegacyAiMeta(stripHtml(String(briefText || ""))).trim();
    if (!brief || brief.length < 8) return false;
    if (["about", "hero", "services", "contact", "faq"].indexOf(target) === -1) return false;

    const d0 = SS.get();
    if (!d0?.sections?.[target]) return false;

    const brand = String(d0.sections?.footer?.content?.["footer-brand"] || "").trim();
    const location = String(d0.page?.location || "").trim();
    const seedBase = (d0.page?.industry || "konsult") + "|" + brief;

    const fast = !!global.__AI_GENERATION_FAST__;
    await delay((fast ? 40 : 280) + (hashStr(brief + target) % (fast ? 60 : 160)));

    if (target === "about") {
      SS.patch(function (d) {
        const c = (d.sections.about.content = d.sections.about.content || {});
        c["about-p1"] = composeAboutFromBrief(brief, { brand, location, paragraph: "p1" });
        c["about-p2"] = composeAboutFromBrief(brief, { brand, location, paragraph: "p2" });
        d.sections.about.hidden = false;
      });
    } else if (target === "hero") {
      const g = await generate("hero", seedBase + "|hero-brief");
      SS.patch(function (d) {
        const c = (d.sections.hero.content = d.sections.hero.content || {});
        c["hero-title"] = String(g.title || "").slice(0, 120);
        c["hero-lead"] = composeHeroLeadFromBrief(brief, g.lead).slice(0, 280);
        d.sections.hero.hidden = false;
      });
    } else if (target === "services") {
      const head = await generate("services-heading", seedBase + "|svc-brief");
      SS.patch(function (d) {
        const c = (d.sections.services.content = d.sections.services.content || {});
        c["services-title"] = String(head.title || c["services-title"] || "").slice(0, 120);
        c["services-lead"] = composeHeroLeadFromBrief(brief, head.lead).slice(0, 280);
        d.sections.services.hidden = false;
      });
    } else if (target === "contact") {
      SS.patch(function (d) {
        const c = (d.sections.contact.content = d.sections.contact.content || {});
        c["contact-lead"] = composeHeroLeadFromBrief(brief, pick(pack().about, hashStr(brief + "|contact"))).slice(0, 280);
        d.sections.contact.hidden = false;
      });
    } else if (target === "faq") {
      SS.patch(function (d) {
        const c = (d.sections.faq.content = d.sections.faq.content || {});
        c["faq-lead"] = composeHeroLeadFromBrief(brief, pick(pack().servicesLead || pack().about, hashStr(brief + "|faq"))).slice(
          0,
          220
        );
        d.sections.faq.hidden = false;
      });
    }

    SS.save();
    return true;
  }

  function applyHighlightsFromBrief(d, brief) {
    const HEE = global.HighlightExtractionEngine;
    if (!HEE || typeof HEE.distributeForSite !== "function" || !d || !d.sections) return;
    const text = String(
      brief ||
        (d.page && d.page.createBusinessDescription) ||
        (d.page && d.page.onboardingDescription) ||
        "",
    ).trim();
    if (!text) return;
    const dist = HEE.distributeForSite(text);
    if (d.sections.hero) d.sections.hero.highlights = (dist.hero || []).slice();
    if (d.sections.about) d.sections.about.highlights = (dist.about || []).slice();
    if (d.sections.services) d.sections.services.highlights = (dist.services || []).slice();
  }

  /**
   * Uppdaterar AppDocument via SiteState (single source of truth).
   * @param {"hero"|"about"|"services"|"faq"|"cta"|"all"} target
   */
  async function fillSection(target, opts) {
    opts = opts || {};
    const SS = global.SiteState;
    if (!SS?.patch || !SS.get) return;

    SS.patch(function (d) {
      syncIndustryInDocument(d);
    });
    SS.save();

    const d0 = SS.get();
    if (!d0?.sections || !d0.page) return;

    const page = d0.page;
    const industryKey = String(page.industry || "verksamhet").trim() || "verksamhet";
    const nonce = global.__AI_GENERATION_FAST__ ? "" : "|" + String(++aiFillNonce);
    const seedBase =
      industryKey + "|" + (page.template || "editorial") + "|" + (page.theme || "") + nonce;

    const sceComposed = !!page.compositionLocked || !!page.createFlowPlan;
    const composition = page.siteComposition;
    const plan = sceComposed ? null : target === "all" ? resolveBusinessPlan(page.area, industryKey) : null;

    const updaters = [];
    const briefText = String(
      opts.userText ||
        page.onboardingDescription ||
        page.createBusinessDescription ||
        "",
    ).trim();

    const genOpts = {
      userText:
        opts.userText ||
        (global.CreateFlowBridge && typeof global.CreateFlowBridge.composeGenerationUserText === "function"
          ? global.CreateFlowBridge.composeGenerationUserText({
              createBusinessBrief: page.onboardingDescription,
              createBusinessName: page.createBusinessName,
              createBusinessDescription: page.createBusinessDescription,
              createSiteGoals: page.createSiteGoals,
              createDesignStyle: page.createDesignStyle,
              createExistingSite: page.createExistingSite,
              siteType: page.siteType,
            })
          : "") ||
        (page && page.onboardingDescription) ||
        "",
      variant: opts.variant,
      nonce: opts.nonce || Date.now(),
    };

    const SCE = global.SiteCompositionEngine;
    const adBrief =
      page.artDirectorBrief ||
      (page.siteComposition && page.siteComposition.artDirector) ||
      null;
    if (adBrief && SCE && typeof SCE.artDirectorBriefToText === "function") {
      genOpts.userText = (genOpts.userText ? genOpts.userText + "\n\n" : "") + SCE.artDirectorBriefToText(adBrief);
    } else if (page.siteComposition && SCE && typeof SCE.toGenerationBrief === "function") {
      const compBrief = SCE.toGenerationBrief(page.siteComposition);
      if (compBrief) {
        genOpts.userText = (genOpts.userText ? genOpts.userText + "\n\n" : "") + compBrief;
      }
    }

    if (target === "hero" || target === "all") {
      const heroCtaSnap =
        sceComposed && d0.sections.hero && d0.sections.hero.content
          ? {
              t1: d0.sections.hero.content["hero-cta-1-text"],
              h1: d0.sections.hero.content["hero-cta-1-href"],
              t2: d0.sections.hero.content["hero-cta-2-text"],
              h2: d0.sections.hero.content["hero-cta-2-href"],
            }
          : null;

      if (briefText.length >= 6) {
        updaters.push(function (d) {
          personalizeHeroFromBrief(d, briefText);
          const t = String(d.sections.hero.content["hero-title"] || "").trim();
          if (!t || t === "Tydligt erbjudande i en mening") {
            const P = pack();
            d.sections.hero.content["hero-title"] = pick(P.heroTitle, hashStr(briefText + industryKey));
          }
          const l = String(d.sections.hero.content["hero-lead"] || "").trim();
          if (!l || l.indexOf("Två eller tre meningar") === 0) {
            const P = pack();
            d.sections.hero.content["hero-lead"] = composeHeroLeadFromBrief(
              briefText,
              pick(P.heroLead, hashStr(briefText + "|lead")),
            );
          }
          if (heroCtaSnap) {
            const hc = d.sections.hero.content;
            if (heroCtaSnap.t1) hc["hero-cta-1-text"] = heroCtaSnap.t1;
            if (heroCtaSnap.h1) hc["hero-cta-1-href"] = heroCtaSnap.h1;
            if (heroCtaSnap.t2) hc["hero-cta-2-text"] = heroCtaSnap.t2;
            if (heroCtaSnap.h2) hc["hero-cta-2-href"] = heroCtaSnap.h2;
          }
        });
      } else {
        const g = await generate("hero", seedBase + "|hero", genOpts);
        updaters.push(function (d) {
          d.sections.hero.content["hero-title"] = g.title;
          d.sections.hero.content["hero-lead"] = g.lead;
          if (heroCtaSnap) {
            const hc = d.sections.hero.content;
            if (heroCtaSnap.t1) hc["hero-cta-1-text"] = heroCtaSnap.t1;
            if (heroCtaSnap.h1) hc["hero-cta-1-href"] = heroCtaSnap.h1;
            if (heroCtaSnap.t2) hc["hero-cta-2-text"] = heroCtaSnap.t2;
            if (heroCtaSnap.h2) hc["hero-cta-2-href"] = heroCtaSnap.h2;
          }
        });
      }
    }

    if (target === "about" || target === "all") {
      if (sceComposed && briefText.length >= 8) {
        const brand = String(page.createBusinessName || page.createBusinessBrief || "").trim();
        const location = extractLocationFromDescription(briefText);
        updaters.push(function (d) {
          d.sections.about.content["about-p1"] = composeAboutFromBrief(briefText, {
            brand: brand,
            location: location,
            paragraph: "p1",
          });
          d.sections.about.content["about-p2"] = composeAboutFromBrief(briefText, {
            brand: brand,
            location: location,
            paragraph: "p2",
          });
        });
      } else {
        const g = await generate("about", seedBase + "|about", genOpts);
        updaters.push(function (d) {
          d.sections.about.content["about-p1"] = g.p1;
          d.sections.about.content["about-p2"] = g.p2;
        });
      }
    }

    if (target === "services" || target === "all") {
      const industry = industryKey;
      const cardIntents = sceComposed
        ? (composition && composition.services && composition.services.cardIntents) ||
          (d0.sections.services && d0.sections.services.cards
            ? d0.sections.services.cards.map(function (c) {
                return c.intent || "services";
              })
            : null) ||
          ["services", "services", "services"]
        : (plan && plan.cardIntents) || ["services", "services", "services"];
      const cardCount = sceComposed
        ? (composition && composition.services && composition.services.cardCount) ||
          (d0.sections.services && d0.sections.services.cardCount) ||
          3
        : (d0.sections.services && d0.sections.services.cardCount) || 3;

      let head = null;
      if (!sceComposed) {
        head = await generate("services-heading", seedBase + "|svc-head", genOpts);
      }

      const storyHead =
        sceComposed && d0.sections.services && d0.sections.services.content
          ? {
              title: d0.sections.services.content["services-title"],
              lead: d0.sections.services.content["services-lead"],
            }
          : null;

      updaters.push((d) => {
        if (!sceComposed && head) {
          d.sections.services.content["services-title"] = head.title;
          d.sections.services.content["services-lead"] = head.lead;
        } else if (storyHead) {
          if (storyHead.title) d.sections.services.content["services-title"] = storyHead.title;
          if (storyHead.lead) d.sections.services.content["services-lead"] = storyHead.lead;
        }
        const cards = d.sections.services.cards || [];
        for (let i = 0; i < cardCount; i++) {
          const cardIntent = cardIntents[i] || cardIntents[0] || "services";
          const pool = intentBlockPool(cardIntent, industry);
          const cardSeed = seedBase + "|card-" + i + "|" + cardIntent;
          const row = pickBlockRow(pool, hashStr(cardSeed));
          if (!cards[i]) {
            cards[i] = { icon: "", title: "", body: "", img: "", intent: cardIntent, ctaText: "", ctaHref: "" };
          }
          cards[i].icon = "";
          cards[i].title = row.title;
          cards[i].body = asCardTeaserBody(row.body, 130);
          cards[i].intent = cardIntent;
          cards[i].detail = "";
          cards[i].ctaText = "";
          cards[i].ctaHref = "";
        }
        d.sections.services.cards = cards.slice(0, cardCount);
        if (!sceComposed) {
          d.sections.services.cardCount = cardCount;
        }
      });
    }

    if (target === "faq" || target === "all") {
      const P = pack();
      const faqSeed = hashStr(seedBase + "|faq-items");
      const offset = rotateStart(P.faq.length, faqSeed);
      let faqTitle = null;
      if (!sceComposed) {
        const fh = await generate("faq-heading", seedBase + "|faq-head", genOpts);
        faqTitle = fh.title;
      } else if (d0.sections.faq && d0.sections.faq.content) {
        faqTitle = d0.sections.faq.content["faq-title"];
      }

      updaters.push((d) => {
        if (faqTitle) d.sections.faq.content["faq-title"] = faqTitle;
        const items = d.sections.faq.items || [];
        for (let i = 0; i < 3; i++) {
          const row = P.faq[(offset + i) % P.faq.length];
          if (!items[i]) items[i] = { q: "", a: "" };
          items[i].q = row.q;
          items[i].a = row.a;
        }
        d.sections.faq.items = items;
      });
    }

    if (target === "gallery" || target === "all") {
      if (!sceComposed) {
        const gh = await generate("gallery-heading", seedBase + "|gal-head", genOpts);
        updaters.push((d) => {
          if (d.sections.gallery?.content) {
            d.sections.gallery.content["gallery-title"] = gh.title;
            d.sections.gallery.content["gallery-lead"] = gh.lead;
          }
        });
      }
    }

    if (!sceComposed) {
      if (plan) {
        updaters.push((d) => {
          d.sections.hero.content["hero-cta-1-text"] = plan.primaryCta.text;
          d.sections.hero.content["hero-cta-1-href"] = plan.primaryCta.href;
          d.sections.hero.content["hero-cta-2-text"] = plan.secondaryCta.text;
          d.sections.hero.content["hero-cta-2-href"] = plan.secondaryCta.href;
        });
      } else if (target === "cta") {
        const P = pack();
        const g0 = await generate("cta", seedBase + "|cta0", genOpts);
        let second = (await generate("cta", seedBase + "|cta1", genOpts)).label;
        if (second === g0.label) second = pickDistinct(P.cta, hashStr(seedBase + "|cta1b"), 6);
        if (second === g0.label) second = pick(P.cta, hashStr(seedBase + "|cta1c") + 99);
        updaters.push((d) => {
          d.sections.hero.content["hero-cta-1-text"] = g0.label;
          d.sections.hero.content["hero-cta-2-text"] = second;
        });
      }

      if (plan) {
        updaters.push((d) => {
          d.page.goal = plan.goal;
          const valid = new Set(d.page.sectionOrder || []);
          const reordered = plan.sectionOrder.filter((id) => valid.has(id));
          for (const id of d.page.sectionOrder || []) {
            if (!reordered.includes(id)) reordered.push(id);
          }
          if (reordered.length) d.page.sectionOrder = reordered;
          if (plan.goal === "bookings" && d.sections.booking) {
            d.sections.booking.hidden = false;
            d.sections.booking.content["booking-title"] = "Boka tid";
            d.sections.booking.content["booking-lead"] =
              "Välj en tid som passar — bekräftelse skickas direkt efter bokning.";
          }
          if (plan.goal === "visit" && d.sections.booking) {
            d.sections.booking.hidden = false;
            const ind = d.page.industry || "cafe";
            d.sections.booking.content["booking-title"] = "Boka & beställ";
            d.sections.booking.content["booking-lead"] =
              ind === "restaurang"
                ? "Boka bord, beställ hemleverans eller hämta hos oss — välj vad som passar."
                : "Beställ takeaway, hämta hos oss eller boka bord om ni tar emot sällskap.";
          }
          if (plan.goal === "visit" && d.sections.services) {
            const ind = d.page.industry || "cafe";
            d.sections.services.content["services-title"] = ind === "restaurang" ? "Meny" : "Meny & fika";
            d.sections.services.content["services-lead"] =
              ind === "restaurang"
                ? "Ett ögonkast på köket — byt till era rätter och priser i korten nedan."
                : "Kaffe, bakverk och lunch — redigera korten med era egna rätter och priser.";
          }
        });
      }
    }

    if (target === "contact" || target === "all") {
      const h = hashStr(seedBase + "|contact");
      const titles = ["Kontakt", "Säg hej", "Boka samtal", "Vi finns här"];
      const submits = ["Skicka meddelande", "Starta en dialog", "Mejla oss"];
      const hints = [
        "Vi återkommer inom 1–2 arbetsdagar.",
        "Vardagar svarar vi snabbt — helgmeddelanden följer upp måndag morgon.",
      ];
      const storyContactTitle =
        sceComposed && d0.sections.contact && d0.sections.contact.content
          ? d0.sections.contact.content["contact-title"]
          : null;
      updaters.push((d) => {
        const c = d.sections.contact && d.sections.contact.content;
        if (!c) return;
        c["contact-title"] = storyContactTitle || pick(titles, h);
        c["form-submit-text"] = pick(submits, h + 2);
        c["form-hint"] = pick(hints, h + 4);
      });
    }

    if ((target === "all" || target === "brand") && global.__STUDIO_BRAND__) {
      const brand = String(global.__STUDIO_BRAND__).trim();
      if (brand)
        updaters.push((d) => {
          if (d.sections.footer && d.sections.footer.content) {
            d.sections.footer.content["footer-brand"] = brand;
          }
        });
    }

    if (target === "all" || target === "hero" || target === "about" || target === "services") {
      if (sceComposed) {
        updaters.push(function (d) {
          if (d0.sections.hero && d0.sections.hero.highlights) {
            d.sections.hero.highlights = d0.sections.hero.highlights.slice();
          }
          if (d0.sections.about && d0.sections.about.highlights) {
            d.sections.about.highlights = d0.sections.about.highlights.slice();
          }
          if (d0.sections.services && d0.sections.services.highlights) {
            d.sections.services.highlights = d0.sections.services.highlights.slice();
          }
        });
      } else {
        updaters.push(function (d) {
          applyHighlightsFromBrief(d, genOpts.userText);
        });
      }
    }

    SS.patch((d) => {
      syncIndustryInDocument(d);
      updaters.forEach((fn) => fn(d));
      if (global.VisualStock && typeof global.VisualStock.applyToDocument === "function") {
        const briefText = String(d.page.onboardingDescription || "").trim();
        const imgOpts = { replaceStock: target === "all" || target === "hero", userText: briefText };
        if (target === "all") {
          global.VisualStock.applyToDocument(d, imgOpts);
        } else if (target === "hero") {
          global.VisualStock.applyToDocument(d, imgOpts);
        } else if (target === "services") {
          global.VisualStock.applyToDocument(d, { replaceStock: false, userText: briefText });
        }
      }
      if (d.page && d.page.heroBgUrl && d.page.material) {
        d.page.material.heroImageUrl = d.page.heroBgUrl;
      }
    });
    SS.save();
  }

  async function waitMacroRevealFrames() {
    const reduce =
      global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const n = reduce ? 1 : 2;
    for (let i = 0; i < n; i++) {
      await new Promise((r) => requestAnimationFrame(r));
    }
  }

  /**
   * Makro-generering: shimmer + dim (onboarding, hel sajt, hero, stora sektioner).
   * Används inte för FAQ, CTA, improve/shorten/seo eller små inline-AI — de ska kännas lätta.
   */
  async function withMacroGeneration(callback) {
    document.documentElement.classList.add("studio-is-generating");
    try {
      return await Promise.resolve(callback());
    } finally {
      await waitMacroRevealFrames();
      document.documentElement.classList.remove("studio-is-generating");
    }
  }

  async function fillCompositionBlocks(opts) {
    opts = opts || {};
    const SS = global.SiteState;
    if (!SS?.patch || !SS.get) return;
    const d0 = SS.get();
    const blocks = d0?.page?.compositionBlocks;
    if (!blocks || !blocks.length) return;

    const page = d0.page || {};
    const seedBase =
      (page.industry || "konsult") + "|blocks|" + (page.template || "editorial");
    const genOpts = {
      userText: opts.userText || page.onboardingDescription || "",
      nonce: opts.nonce || Date.now(),
    };

    const filled = [];
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      const copy = JSON.parse(JSON.stringify(block));
      const seed = seedBase + "|" + block.type + "|" + i;

      if (block.type === "banner" || block.type === "cta-band") {
        const g = await generate("cta", seed, genOpts);
        copy.content = copy.content || {};
        copy.content.title = copy.content.title || g.label || "Välkommen";
        copy.content.lead =
          copy.content.lead ||
          "Vi hjälper dig vidare — hör av dig så tar vi nästa steg tillsammans.";
        copy.content.ctaText = copy.content.ctaText || g.label || "Kontakta oss";
        copy.content.ctaHref = copy.content.ctaHref || "#kontakt";
      }

      if (block.type === "icon-grid" && copy.items) {
        const HEE = global.HighlightExtractionEngine;
        const extracted =
          HEE && typeof HEE.extractFromBrief === "function"
            ? HEE.extractFromBrief(genOpts.userText, { max: copy.items.length })
            : [];
        const titles = ["Kvalitet", "Erfarenhet", "Personlig service", "Snabb leverans"];
        const bodies = [
          "Vi håller hög standard i varje uppdrag.",
          "Lång erfarenhet och tydliga processer.",
          "Du får en kontaktperson som följer dig hela vägen.",
          "Vi svarar snabbt och håller vad vi lovar.",
        ];
        for (let j = 0; j < copy.items.length; j++) {
          if (extracted[j]) {
            copy.items[j].title = extracted[j].label;
            copy.items[j].icon = extracted[j].icon || copy.items[j].icon || "✔";
            copy.items[j].body = copy.items[j].body || "";
          } else {
            copy.items[j].title = copy.items[j].title || pick(titles, hashStr(seed + "|t" + j));
            copy.items[j].body = copy.items[j].body || pick(bodies, hashStr(seed + "|b" + j));
          }
        }
      }

      if (block.type === "collage") {
        copy.images = copy.images && copy.images.length ? copy.images : [];
        const galleryImgs = d0.sections?.gallery?.images || [];
        const count = block.variant === "mosaic-4" ? 4 : 3;
        while (copy.images.length < count) {
          const gi = galleryImgs[copy.images.length];
          copy.images.push(gi || "");
        }
        const missing = copy.images.some(function (u) {
          return !String(u || "").trim();
        });
        if (missing && global.MaterialSystem && typeof global.MaterialSystem.suggestStockImageUrls === "function") {
          const stock = global.MaterialSystem.suggestStockImageUrls("gallery", count, {
            userText: genOpts.userText,
            nonce: genOpts.nonce,
          });
          for (let k = 0; k < copy.images.length; k++) {
            if (!String(copy.images[k] || "").trim() && stock && stock[k]) {
              copy.images[k] = stock[k];
            }
          }
        }
      }

      filled.push(copy);
    }

    SS.patch(function (d) {
      d.page.compositionBlocks = filled;
    });
    SS.save();
  }

  async function fillFullSite(opts) {
    const SS = global.SiteState;
    if (!SS?.patch || !SS.get) return;
    const onPhase = opts && typeof opts.onPhase === "function" ? opts.onPhase : null;
    global.__AI_GENERATION_FAST__ = true;
    const doc0 = SS.get();
    global.__AI_INDUSTRY_FROZEN__ = String(doc0?.page?.industry || "verksamhet").trim() || "verksamhet";
    try {
      if (onPhase) onPhase(2);
      await fillSection("all", opts);
      await fillCompositionBlocks(opts);
      if (onPhase) onPhase(3);
    } finally {
      global.__AI_INDUSTRY_FROZEN__ = null;
      global.__AI_GENERATION_FAST__ = false;
    }
  }

  async function fillHero(opts) {
    await fillSection("hero", opts);
  }
  async function fillFAQ() {
    await fillSection("faq");
  }

  /**
   * Ny bild: bransch + mallstämning (VisualStock). Context-knappen används för kort/galleriplats.
   * @param {"hero"|"about"|"card"|"gallery"} kind
   * @param {HTMLElement} [contextEl]
   */
  function suggestStockImageUrl(kind, contextEl) {
    const industry = getIndustry();
    const template = getTemplate();
    const ISE = global.ImageSelectionEngine;
    const SS = global.SiteState;
    const doc = SS && SS.get ? SS.get() : { page: { industry, template } };
    if (ISE && typeof ISE.pick === "function") {
      const opts = { section: kind, industry: industry, template: template, nonce: Date.now() };
      if (kind === "card" && contextEl && typeof contextEl.closest === "function") {
        const wrap = contextEl.closest("[data-card-index]");
        opts.cardIndex = Number(wrap && wrap.getAttribute("data-card-index")) || 0;
      }
      if (kind === "gallery" && contextEl && typeof contextEl.closest === "function") {
        const fig = contextEl.closest("[data-gallery-item]");
        if (fig && fig.parentElement) {
          const sibs = fig.parentElement.querySelectorAll(":scope > [data-gallery-item]");
          opts.galleryIndex = Array.prototype.indexOf.call(sibs, fig);
          if (opts.galleryIndex < 0) opts.galleryIndex = 0;
        }
      }
      const url = ISE.pick(doc, opts);
      if (url) return url;
    }
    const VS = global.VisualStock;
    if (VS && typeof VS.pickUrl === "function") {
      const opts = { nonce: Date.now() };
      if (kind === "card" && contextEl && typeof contextEl.closest === "function") {
        const wrap = contextEl.closest("[data-card-index]");
        opts.cardIndex = Number(wrap && wrap.getAttribute("data-card-index")) || 0;
      }
      if (kind === "gallery" && contextEl && typeof contextEl.closest === "function") {
        const fig = contextEl.closest("[data-gallery-item]");
        if (fig && fig.parentElement) {
          const sibs = fig.parentElement.querySelectorAll(":scope > [data-gallery-item]");
          opts.galleryIndex = Array.prototype.indexOf.call(sibs, fig);
          if (opts.galleryIndex < 0) opts.galleryIndex = 0;
        }
      }
      const url = VS.pickUrl(kind, industry, template, opts);
      if (url) return url;
    }
    const seed =
      "stock-" +
      kind +
      "-" +
      Date.now().toString(36) +
      "-" +
      Math.random().toString(36).slice(2, 10);
    const enc = encodeURIComponent(seed);
    const dim =
      kind === "hero" ? "1920/1080" : kind === "about" ? "800/900" : kind === "card" ? "640/400" : "800/600";
    return `https://picsum.photos/seed/${enc}/${dim}`;
  }

  global.AISiteBuilder = {
    generate,
    generateTemplate,
    improve,
    shorten,
    seo,
    fillSection,
    fillSectionFromBrief,
    fillFullSite,
    fillHero,
    fillFAQ,
    stripHtml,
    getIndustry,
    getTemplate,
    pack,
    INDUSTRIES,
    AREAS,
    GOAL_PLANS,
    inferIndustryFromDescription,
    inferIndustryFromBrand,
    syncIndustryInDocument,
    resolveExpectedIndustryFromDoc,
    guessBriefFromDocument,
    siteHasIndustryCopyMismatch,
    inferIndustryWithinArea,
    inferAreaFromIndustry,
    extractBrandFromDescription,
    extractLocationFromDescription,
    splitBrandAndLocation:
      global.AppDocument && typeof global.AppDocument.splitBrandAndLocation === "function"
        ? global.AppDocument.splitBrandAndLocation.bind(global.AppDocument)
        : function (brand, location) {
            return { brand: String(brand || "").trim(), location: String(location || "").trim() };
          },
    parseOfferedServicesFromDescription,
    extractBookingHintFromDescription,
    resolveCreateContext,
    resolveBusinessPlan,
    personalizeHeroFromBrief,
    composeAboutFromBrief,
    composeHeroLeadFromBrief,
    shouldPersonalizeFromBrief,
    withMacroGeneration,
    suggestStockImageUrl,
    CONTENT_BLOCK_INTENTS,
    normalizeContentBlockIntent,
  };
})(typeof window !== "undefined" ? window : globalThis);
