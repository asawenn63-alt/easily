/**
 * Designfamiljer — förstaklassobjekt i Easily.
 * Användaren ser känslobaserade namn (Varm, Elegant, Kontrast) — inte bransch-exempel.
 * Landningssidan använder exampleLabel (Café, Salong, Fotograf) enbart som demo.
 */
(function (global) {
  "use strict";

  /** @typedef {{ id: string; label: string; exampleLabel: string; tagline: string; description: string; source: string; version: number; premium: boolean; internal: object; preview: object; industries: string[]; keywords: string[]; motivations: object }} DesignFamily */

  const BUILTIN = [
    {
      id: "cafe",
      label: "Varm",
      exampleLabel: "Café",
      tagline: "Välkomnande och hemtrevlig",
      description: "Mjuka färger och rund typografi — känns inbjudande.",
      source: "builtin",
      version: 1,
      premium: false,
      internal: {
        theme: "beige-lux",
        template: "atelier",
        buttonStyle: "pill",
        heroLayout: "center",
      },
      preview: {
        swatches: ["#c4922a", "#3a3228", "#f8f7f3", "#e8c878"],
        headingFont: "Fraunces",
        bodyFont: "Manrope",
      },
      industries: ["cafe", "restaurang", "byggfirma"],
      keywords: [
        "café",
        "cafe",
        "kaffe",
        "fika",
        "restaurang",
        "bistro",
        "bakery",
        "bageri",
        "brunch",
        "mat",
        "lunch",
        "middag",
        "bar",
        "pub",
        "varm",
        "välkomnande",
        "hemtrevlig",
        "snickare",
        "hantverk",
      ],
      motivations: {
        default:
          "Jag valde Varm eftersom designen signalerar välkomnande och hemtrevligt — bra när besökare ska känna sig trygga direkt.",
        cafe: "Jag valde Varm eftersom verksamheten mår bra av en inbjudande och avslappnad känsla.",
        restaurang: "Jag valde Varm eftersom varma färger och mjuk typografi passar mat och möten.",
        byggfirma:
          "Jag valde Varm eftersom hantverkare ofta vill kännas tillgängliga och jordnära — inte kalla eller distanserade.",
      },
    },
    {
      id: "salon",
      label: "Elegant",
      exampleLabel: "Salong",
      tagline: "Ljus och professionell",
      description: "Luftig layout och tydlig typografi — förtroende från första klick.",
      source: "builtin",
      version: 1,
      premium: false,
      internal: {
        theme: "minimal-white",
        template: "luxury-brand",
        buttonStyle: "",
        heroLayout: "center",
      },
      preview: {
        swatches: ["#1c1917", "#78716c", "#ffffff", "#d6d3d1"],
        headingFont: "Playfair Display",
        bodyFont: "Manrope",
      },
      industries: ["frisor", "hundsalong", "hunddagis", "konsult", "advokat", "byggfirma", "miljo", "verksamhet", "tarot"],
      keywords: [
        "salong",
        "frisör",
        "frisor",
        "hår",
        "klipp",
        "skönhet",
        "spa",
        "wellness",
        "behandling",
        "bokning",
        "personlig",
        "service",
        "konsult",
        "byrå",
        "advokat",
        "elegant",
        "professionell",
        "förtroende",
        "seriös",
        "snickare",
        "bygg",
        "hantverkare",
        "tarot",
        "andlig",
        "vägledning",
      ],
      motivations: {
        default:
          "Jag valde Elegant eftersom designen är ljus, tydlig och förtroendeingivande — utan att kännas stel.",
        frisor: "Jag valde Elegant eftersom personlig service mår bra av ett raffinerat och välkomnande uttryck.",
        hundsalong: "Jag valde Elegant eftersom omsorgsfull service behöver ett lugnt och professionellt intryck.",
        konsult: "Jag valde Elegant eftersom verksamheten behöver ett rent och förtroendeingivande uttryck.",
        miljo: "Jag valde Elegant eftersom miljö- och återvinningsföretag behöver ett seriöst och tydligt uttryck.",
        byggfirma:
          "Jag valde Elegant eftersom kunder vill känna förtroende för hantverkaren — tydligt, proffsigt och lätt att ta in.",
        advokat: "Jag valde Elegant eftersom seriösa tjänster behöver ett lugnt och trovärdigt uttryck.",
      },
    },
    {
      id: "fotograf",
      label: "Kontrast",
      exampleLabel: "Fotograf",
      tagline: "Tydlig och bildfokuserad",
      description: "Stark kontrast och skarp typografi — bilderna får ta plats.",
      source: "builtin",
      version: 1,
      premium: false,
      internal: {
        theme: "black-gold",
        template: "swiss-grid",
        buttonStyle: "outline",
        heroLayout: "split",
      },
      preview: {
        swatches: ["#e6c04a", "#0a0a0a", "#1a1a1a", "#f5e6c8"],
        headingFont: "Syne",
        bodyFont: "Inter",
      },
      industries: ["fotograf", "event"],
      keywords: [
        "foto",
        "fotograf",
        "photography",
        "portfolio",
        "bild",
        "bilder",
        "kreativ",
        "studio",
        "bröllop",
        "porträtt",
        "event",
        "film",
        "video",
        "konst",
        "designbyrå",
        "kontrast",
        "modern",
        "dramatisk",
      ],
      motivations: {
        default:
          "Jag valde Kontrast eftersom designen låter bilder och innehåll sticka ut med tydlighet och styrka.",
        fotograf: "Jag valde Kontrast eftersom starka bilder behöver ett rent och skarpt visuellt ramverk.",
        event: "Jag valde Kontrast eftersom visuellt innehåll ska dominera utan att kännas rörigt.",
      },
    },
  ];

  const byId = Object.create(null);
  BUILTIN.forEach(function (f) {
    byId[f.id] = f;
  });

  /** @deprecated — ersatt av INDUSTRY_COLOR_SETS */
  const INDUSTRY_PICKS = {
    byggfirma: { primary: "salon", secondary: "cafe" },
    default: { primary: "salon", secondary: "cafe" },
  };

  const INDUSTRY_NAMES = {
    byggfirma: "snickare och hantverkare",
    elektriker: "elföretag",
    frisor: "frisörer",
    hundsalong: "hundsalonger",
    hunddagis: "hunddagis",
    cafe: "caféer",
    restaurang: "restauranger",
    fotograf: "fotografer",
    event: "eventföretag",
    konsult: "konsulter",
    advokat: "advokatbyråer",
    butik: "butiker",
    gym: "gym",
    tarot: "tarot & vägledning",
    verksamhet: "din verksamhet",
    miljo: "miljö- och avfallsföretag",
  };

  /** Explicita färguppsättningar per bransch — två förslag, inga generiska palettnamn. */
  function cs(id, label, tagline, colors, family, motivation) {
    return { id: id, label: label, tagline: tagline, colors: colors, family: family, motivation: motivation };
  }

  const INDUSTRY_COLOR_SETS = {
    byggfirma: {
      primary: cs(
        "bygg-blagra",
        "Blågrå",
        "Mörk blågrå — proffsig och solid",
        {
          bg: "#f4f6f8",
          surface: "#e8ecf0",
          text: "#1c2530",
          accent: "#3d4f5f",
          primary: "#2c3e50",
          secondary: "#5a6b7a",
          border: "rgba(61, 79, 95, 0.14)",
        },
        "salon",
        "Jag valde Blågrå — mörk blågrå som signalerar soliditet och förtroende för hantverkaren."
      ),
      secondary: cs(
        "bygg-skogsgron",
        "Skogsgrön",
        "Skogsgrön accent — naturlig och jordnär",
        {
          bg: "#f4f7f5",
          surface: "#e8efe9",
          text: "#1a2e24",
          accent: "#2d4a3e",
          primary: "#1e3a2f",
          secondary: "#5a7268",
          border: "rgba(45, 74, 62, 0.14)",
        },
        "cafe",
        "Jag valde Skogsgrön — naturlig grön som passar hantverk och utomhusarbete."
      ),
    },
    elektriker: {
      primary: cs(
        "el-marin",
        "Marinblå",
        "Marinblå — trygg och professionell elservice",
        {
          bg: "#f4f7fb",
          surface: "#e8eef6",
          text: "#0f172a",
          accent: "#1e3a5f",
          primary: "#0f172a",
          secondary: "#64748b",
          border: "rgba(30, 58, 95, 0.12)",
        },
        "salon",
        "Jag valde marinblå eftersom den signalerar trygghet och passar ett elföretag."
      ),
      secondary: cs(
        "el-kontrast",
        "Kontrast & guld",
        "Mörk bakgrund med guldaccenter — teknisk och kraftfull",
        {
          bg: "#0f1419",
          surface: "#1a222c",
          text: "#f5f7fa",
          accent: "#c9a227",
          primary: "#e8eef5",
          secondary: "#64748b",
          border: "rgba(201, 162, 39, 0.2)",
        },
        "fotograf",
        "Jag valde Kontrast & guld — mörk och teknisk känsla som passar ett elföretag."
      ),
    },
    verksamhet: {
      primary: cs(
        "verksamhet-marin",
        "Marinblå",
        "Marinblå — neutral och förtroendeingivande",
        {
          bg: "#f8fafc",
          surface: "#eef2f7",
          text: "#0f172a",
          accent: "#1e40af",
          primary: "#0f172a",
          secondary: "#64748b",
          border: "rgba(15, 23, 42, 0.09)",
        },
        "salon",
        "Jag valde marinblå — tydligt och förtroendeingivande utan att låsa fast vid en bransch."
      ),
      secondary: cs(
        "verksamhet-varm",
        "Varm sand",
        "Varm sand — inbjudande och jordnära",
        {
          bg: "#faf7f2",
          surface: "#f2ece3",
          text: "#2a241c",
          accent: "#a0896b",
          primary: "#3a3228",
          secondary: "#8a7f72",
          border: "rgba(58, 50, 40, 0.11)",
        },
        "cafe",
        "Jag valde varm sand — välkomnande och jordnär när du vill undvika kalla färger."
      ),
    },
    frisor: {
      primary: cs(
        "frisor-beige",
        "Mjuk beige",
        "Mjuk beige — välkomnande salong",
        {
          bg: "#faf6f1",
          surface: "#f2ece4",
          text: "#2a241c",
          accent: "#a89585",
          primary: "#3a3228",
          secondary: "#8a7f72",
          border: "rgba(58, 50, 40, 0.11)",
        },
        "salon",
        "Jag valde Mjuk beige — varm och inbjudande, som en modern salong."
      ),
      secondary: cs(
        "frisor-puderrosa",
        "Puderrosa",
        "Puderrosa accent — mjuk och feminin",
        {
          bg: "#fdf8f8",
          surface: "#f8f0f0",
          text: "#2c2424",
          accent: "#c9a0a0",
          primary: "#3a2e2e",
          secondary: "#8a7575",
          border: "rgba(201, 160, 160, 0.18)",
        },
        "cafe",
        "Jag valde Puderrosa — mjukt och personligt uttryck."
      ),
    },
    hundsalong: {
      primary: cs(
        "hund-sand",
        "Varm sand",
        "Varm sand — hemtrevlig och trygg",
        {
          bg: "#f7f3ec",
          surface: "#efe8dc",
          text: "#2c2419",
          accent: "#b8956a",
          primary: "#3a3228",
          secondary: "#8a7f72",
          border: "rgba(58, 50, 40, 0.11)",
        },
        "cafe",
        "Jag valde Varm sand — hemtrevliga toner som känns trygga för djurägare."
      ),
      secondary: cs(
        "hund-salvia",
        "Salviagrön",
        "Salviagrön — lugn och omsorgsfull",
        {
          bg: "#f6f8f5",
          surface: "#ecf0e8",
          text: "#1e2a22",
          accent: "#7a9b76",
          primary: "#1a2e24",
          secondary: "#5c7368",
          border: "rgba(122, 155, 118, 0.16)",
        },
        "salon",
        "Jag valde Salviagrön — lugn grön som signalerar omsorg."
      ),
    },
    hunddagis: {
      primary: cs(
        "hunddagis-gron",
        "Ljus grön",
        "Ljus grön — glad och naturlig",
        {
          bg: "#f5faf5",
          surface: "#eaf2ea",
          text: "#1e2a1c",
          accent: "#6b9e6b",
          primary: "#1e3a1e",
          secondary: "#5c6b52",
          border: "rgba(107, 158, 107, 0.16)",
        },
        "cafe",
        "Jag valde Ljus grön — fräsch och glad, perfekt för hunddagis."
      ),
      secondary: cs(
        "hunddagis-gul",
        "Varm gul",
        "Varm gul — lekfull och energisk",
        {
          bg: "#fffdf5",
          surface: "#faf5e4",
          text: "#2a2410",
          accent: "#c9a227",
          primary: "#3a3220",
          secondary: "#8a7f60",
          border: "rgba(201, 162, 39, 0.18)",
        },
        "salon",
        "Jag valde Varm gul — lekfull energi som passar hundar och aktivitet."
      ),
    },
    gym: {
      primary: cs(
        "gym-grafit",
        "Grafit",
        "Grafit och svart — kraftfull",
        {
          bg: "#1a1d21",
          surface: "#252a30",
          text: "#f0f4f8",
          accent: "#64748b",
          primary: "#f0f4f8",
          secondary: "#94a3b8",
          border: "rgba(100, 116, 139, 0.28)",
        },
        "fotograf",
        "Jag valde Grafit — mörk och kraftfull, som ett modernt gym."
      ),
      secondary: cs(
        "gym-morkrod",
        "Mörk röd",
        "Mörk röd accent — energi och drive",
        {
          bg: "#141414",
          surface: "#1f1f1f",
          text: "#f5f5f5",
          accent: "#9f1239",
          primary: "#f5f5f5",
          secondary: "#a3a3a3",
          border: "rgba(159, 18, 57, 0.28)",
        },
        "fotograf",
        "Jag valde Mörk röd — intensiv accent som driver energi."
      ),
    },
    cafe: {
      primary: cs(
        "cafe-kaffebrun",
        "Kaffebrun",
        "Kaffebrun — varm och inbjudande",
        {
          bg: "#f6f1ea",
          surface: "#ebe3d8",
          text: "#2a2018",
          accent: "#6f4e37",
          primary: "#3a2a1e",
          secondary: "#8a7560",
          border: "rgba(58, 50, 40, 0.11)",
        },
        "cafe",
        "Jag valde Kaffebrun — varma bruna toner som doftar fika och kaffe."
      ),
      secondary: cs(
        "cafe-beige",
        "Varm beige",
        "Varm beige — avslappnad cafékänsla",
        {
          bg: "#faf7f2",
          surface: "#f2ece3",
          text: "#2a241c",
          accent: "#a0896b",
          primary: "#3a3228",
          secondary: "#8a7f72",
          border: "rgba(58, 50, 40, 0.11)",
        },
        "salon",
        "Jag valde Varm beige — ljus och avslappnad caféstämning."
      ),
    },
    restaurang: {
      primary: cs(
        "rest-vinrod",
        "Vinröd",
        "Vinröd accent — klassisk restaurang",
        {
          bg: "#faf6f4",
          surface: "#f0e8e4",
          text: "#2a1e1c",
          accent: "#7f1d1d",
          primary: "#2a1e1c",
          secondary: "#7a6b65",
          border: "rgba(127, 29, 29, 0.14)",
        },
        "cafe",
        "Jag valde Vinröd — klassisk restaurangkänsla för mat och middag."
      ),
      secondary: cs(
        "rest-morkgron",
        "Mörk grön",
        "Mörk grön — naturlig och sofistikerad",
        {
          bg: "#f4f7f5",
          surface: "#e8efe9",
          text: "#1a2e24",
          accent: "#2d4a3e",
          primary: "#1e3a2f",
          secondary: "#5a7268",
          border: "rgba(45, 74, 62, 0.14)",
        },
        "salon",
        "Jag valde Mörk grön — naturlig och sofistikerad restaurangkänsla."
      ),
    },
    fotograf: {
      primary: cs(
        "foto-svart",
        "Svart",
        "Svart — bilderna i fokus",
        {
          bg: "#0a0a0a",
          surface: "#141414",
          text: "#f5f5f5",
          accent: "#e5e5e5",
          primary: "#f5f5f5",
          secondary: "#a3a3a3",
          border: "rgba(255, 255, 255, 0.12)",
        },
        "fotograf",
        "Jag valde Svart — mörk bakgrund så bilderna får ta all plats."
      ),
      secondary: cs(
        "foto-grafit",
        "Mörk grafit",
        "Vit yta och mörk grafit",
        {
          bg: "#ffffff",
          surface: "#f5f5f4",
          text: "#1c1917",
          accent: "#374151",
          primary: "#1c1917",
          secondary: "#6b7280",
          border: "rgba(55, 65, 81, 0.12)",
        },
        "salon",
        "Jag valde Mörk grafit — rent och neutralt ramverk för fotografier."
      ),
    },
    event: {
      primary: cs(
        "event-lila",
        "Djup lila",
        "Djup lila — festlig och exklusiv",
        {
          bg: "#1a1428",
          surface: "#251e38",
          text: "#f5f0fa",
          accent: "#7c3aed",
          primary: "#f5f0fa",
          secondary: "#a89bc4",
          border: "rgba(124, 58, 237, 0.22)",
        },
        "fotograf",
        "Jag valde Djup lila — festlig och exklusiv känsla för event."
      ),
      secondary: cs(
        "event-midnatt",
        "Midnattsblå",
        "Midnattsblå — elegant kvällston",
        {
          bg: "#0f1729",
          surface: "#1a2438",
          text: "#f0f4fa",
          accent: "#1e3a5f",
          primary: "#f0f4fa",
          secondary: "#8899b4",
          border: "rgba(30, 58, 95, 0.22)",
        },
        "fotograf",
        "Jag valde Midnattsblå — elegant och stilren för evenemang."
      ),
    },
    butik: {
      primary: cs(
        "butik-beige",
        "Beige",
        "Beige — varm och inbjudande butik",
        {
          bg: "#faf7f4",
          surface: "#f0ebe5",
          text: "#2a241c",
          accent: "#a89585",
          primary: "#2a241c",
          secondary: "#8a7f72",
          border: "rgba(58, 50, 40, 0.11)",
        },
        "salon",
        "Jag valde Beige — varma neutrala toner som lyfter produkterna."
      ),
      secondary: cs(
        "butik-svart",
        "Svart",
        "Svart accent — elegant och tydlig",
        {
          bg: "#fafafa",
          surface: "#f0f0f0",
          text: "#1c1917",
          accent: "#1c1917",
          primary: "#1c1917",
          secondary: "#6b7280",
          border: "rgba(28, 25, 23, 0.09)",
        },
        "fotograf",
        "Jag valde Svart — elegant kontrast som lyfter produkterna."
      ),
    },
    konsult: {
      primary: cs(
        "konsult-marin",
        "Marinblå",
        "Marinblå — förtroende och seriositet",
        {
          bg: "#f8fafc",
          surface: "#eef2f7",
          text: "#0f172a",
          accent: "#1e40af",
          primary: "#0f172a",
          secondary: "#64748b",
          border: "rgba(30, 64, 175, 0.12)",
        },
        "salon",
        "Jag valde Marinblå — signalerar förtroende och professionalism."
      ),
      secondary: cs(
        "konsult-grafit",
        "Grafit",
        "Grafit — neutral och trovärdig",
        {
          bg: "#f4f5f6",
          surface: "#e8eaed",
          text: "#1c1917",
          accent: "#475569",
          primary: "#1c1917",
          secondary: "#64748b",
          border: "rgba(71, 85, 105, 0.12)",
        },
        "salon",
        "Jag valde Grafit — neutral och trovärdig utan att kännas kall."
      ),
    },
    advokat: {
      primary: cs(
        "advokat-marin",
        "Marinblå",
        "Marinblå — juridisk tyngd",
        {
          bg: "#f8f9fb",
          surface: "#eef1f6",
          text: "#0f172a",
          accent: "#1e3a5f",
          primary: "#0f172a",
          secondary: "#64748b",
          border: "rgba(30, 58, 95, 0.12)",
        },
        "salon",
        "Jag valde Marinblå — traditionell färg för juridisk seriositet."
      ),
      secondary: cs(
        "advokat-vinrod",
        "Mörk vinröd",
        "Mörk vinröd — klassisk och auktoritativ",
        {
          bg: "#faf8f6",
          surface: "#f0ece8",
          text: "#1c1917",
          accent: "#581c1c",
          primary: "#1c1917",
          secondary: "#78716c",
          border: "rgba(88, 28, 28, 0.14)",
        },
        "fotograf",
        "Jag valde Mörk vinröd — klassisk och auktoritativ advokatkänsla."
      ),
    },
    tarot: {
      primary: cs(
        "tarot-midnattslila",
        "Midnattslila",
        "Mörk lila — mystisk och lugn",
        {
          bg: "#120f18",
          surface: "#1a1624",
          text: "#f5f0fa",
          accent: "#b794f6",
          primary: "#e9d5ff",
          secondary: "#a78bfa",
          border: "rgba(183, 148, 246, 0.18)",
        },
        "fotograf",
        "Jag valde Midnattslila — dämpad mystik som känns trygg, inte överdriven."
      ),
      secondary: cs(
        "tarot-varm",
        "Varm sand & lila",
        "Mjuk beige med doft av lila — ceremoniell butikskänsla",
        {
          bg: "#faf6f1",
          surface: "#f2ece4",
          text: "#2a2018",
          accent: "#8b6faf",
          primary: "#3a2a1e",
          secondary: "#9a8578",
          border: "rgba(139, 111, 175, 0.16)",
        },
        "cafe",
        "Jag valde Varm sand & lila — mjukt och ceremoniellt utan mörk mystik."
      ),
    },
    default: {
      primary: cs(
        "default-marin",
        "Marinblå",
        "Marinblå — neutral och proffsig",
        {
          bg: "#f8fafc",
          surface: "#eef2f7",
          text: "#0f172a",
          accent: "#1e40af",
          primary: "#0f172a",
          secondary: "#64748b",
          border: "rgba(15, 23, 42, 0.09)",
        },
        "salon",
        "Jag valde Marinblå — tydligt och förtroendeingivande som standard."
      ),
      secondary: cs(
        "default-grafit",
        "Grafit",
        "Grafit — neutral grå",
        {
          bg: "#f4f5f6",
          surface: "#e8eaed",
          text: "#1c1917",
          accent: "#475569",
          primary: "#1c1917",
          secondary: "#64748b",
          border: "rgba(71, 85, 105, 0.12)",
        },
        "salon",
        "Jag valde Grafit — neutral och lätt att ta in."
      ),
    },
  };

  const COLOR_VAR_KEYS = ["bg", "surface", "text", "accent", "primary", "secondary", "border"];

  const TEMPLATE_TYPOGRAPHY = {
    editorial: {
      heading: '"Cormorant Garamond", Georgia, serif',
      body: '"Manrope", system-ui, sans-serif',
      weight: "400",
    },
    "luxury-brand": {
      heading: '"Playfair Display", Georgia, serif',
      body: '"Manrope", system-ui, sans-serif',
      weight: "400",
    },
    atelier: {
      heading: '"Fraunces", Georgia, serif',
      body: '"Manrope", system-ui, sans-serif',
      weight: "500",
    },
    "swiss-grid": {
      heading: '"Syne", system-ui, sans-serif',
      body: '"Inter", system-ui, sans-serif',
      weight: "600",
    },
    landmark: {
      heading: '"Fraunces", Georgia, serif',
      body: '"DM Sans", system-ui, sans-serif',
      weight: "500",
    },
  };

  function typographyForTemplate(template) {
    return TEMPLATE_TYPOGRAPHY[template] || TEMPLATE_TYPOGRAPHY.editorial;
  }

  function miniPageColorsFromDesignColors(colors) {
    if (!colors) {
      return {
        bg: "#ffffff",
        hero: "#f5f5f4",
        text: "#1c1917",
        muted: "#78716c",
        border: "#d6d3d1",
        accent: "#1c1917",
        accent2: "#78716c",
        card: "#ffffff",
        footer: "#d6d3d1",
      };
    }
    return {
      bg: colors.bg,
      hero: colors.surface || colors.bg,
      text: colors.text,
      muted: colors.secondary || colors.primary,
      border: colors.border || "rgba(0,0,0,0.1)",
      accent: colors.accent,
      accent2: colors.primary || colors.accent,
      card: colors.surface || colors.bg,
      footer: colors.secondary || colors.border || colors.primary,
    };
  }

  function applyTypographyToElement(el, template) {
    if (!el) return;
    const type = typographyForTemplate(template);
    el.style.setProperty("--font-heading", type.heading);
    el.style.setProperty("--font-body", type.body);
    el.style.setProperty("--heading-weight", type.weight);
  }

  function parseHexColor(hex) {
    const raw = String(hex || "").trim().replace("#", "");
    if (raw.length === 3) {
      return {
        r: parseInt(raw[0] + raw[0], 16),
        g: parseInt(raw[1] + raw[1], 16),
        b: parseInt(raw[2] + raw[2], 16),
      };
    }
    if (raw.length >= 6) {
      return {
        r: parseInt(raw.slice(0, 2), 16),
        g: parseInt(raw.slice(2, 4), 16),
        b: parseInt(raw.slice(4, 6), 16),
      };
    }
    return null;
  }

  function isColorDark(hex) {
    const rgb = parseHexColor(hex);
    if (!rgb) return false;
    const lum = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
    return lum < 0.42;
  }

  /** Skimrande hero-gradient utifrån branschfärger — samma känsla som landningssidan. */
  function heroShimmerFromColors(colors) {
    if (!colors) return null;
    const accent = colors.accent || "#3d4f5f";
    const primary = colors.primary || accent;
    const bg = colors.bg || "#f4f6f8";
    const dark = isColorDark(bg);

    if (dark) {
      return (
        "radial-gradient(circle at 30% 70%, color-mix(in srgb, " +
        accent +
        " 42%, white), transparent 50%), " +
        "radial-gradient(circle at 82% 18%, color-mix(in srgb, " +
        primary +
        " 28%, white), transparent 44%), " +
        "linear-gradient(145deg, color-mix(in srgb, " +
        primary +
        " 92%, black) 0%, " +
        accent +
        " 52%, color-mix(in srgb, " +
        primary +
        " 82%, black) 100%)"
      );
    }

    return (
      "radial-gradient(circle at 72% 28%, color-mix(in srgb, " +
      accent +
      " 32%, white), transparent 42%), " +
      "radial-gradient(circle at 18% 80%, color-mix(in srgb, " +
      primary +
      " 34%, transparent), transparent 48%), " +
      "linear-gradient(130deg, " +
      primary +
      " 0%, " +
      accent +
      " 48%, color-mix(in srgb, " +
      primary +
      " 88%, black) 100%)"
    );
  }

  function cardThumbGradient(colors, index) {
    if (!colors) return "linear-gradient(135deg, #8a7968 0%, #c8b8a8 100%)";
    const accent = colors.accent || "#3d4f5f";
    const primary = colors.primary || accent;
    const variants = [
      "linear-gradient(to bottom right, rgba(255,255,255,0.35), transparent 50%), linear-gradient(135deg, " +
        primary +
        " 0%, " +
        accent +
        " 100%)",
      "linear-gradient(to bottom right, rgba(255,255,255,0.3), transparent 50%), linear-gradient(135deg, color-mix(in srgb, " +
        accent +
        " 72%, white) 0%, " +
        accent +
        " 100%)",
      "linear-gradient(to bottom right, rgba(255,255,255,0.28), transparent 50%), linear-gradient(135deg, color-mix(in srgb, " +
        primary +
        " 78%, black) 0%, " +
        primary +
        " 100%)",
    ];
    return variants[index % variants.length] || variants[0];
  }

  /** Skimmer-gradienter för alla ytor — hero, sektioner, kort, footer m.m. */
  function applyShimmerTokensToElement(el, colors) {
    if (!el || !colors) return;
    const accent = colors.accent || "#3d4f5f";
    const primary = colors.primary || accent;
    const bg = colors.bg || "#f4f6f8";
    const surface = colors.surface || bg;
    const secondary = colors.secondary || primary;

    el.style.setProperty("--hero-shimmer-bg", heroShimmerFromColors(colors));

    el.style.setProperty(
      "--page-shimmer-bg",
      "radial-gradient(ellipse 120% 70% at 100% 0%, color-mix(in srgb, " +
        accent +
        " 10%, transparent) 0%, transparent 55%), radial-gradient(ellipse 90% 55% at 0% 100%, color-mix(in srgb, " +
        primary +
        " 8%, transparent) 0%, transparent 50%), " +
        bg
    );

    el.style.setProperty(
      "--surface-shimmer-bg",
      "radial-gradient(ellipse 100% 80% at 12% 0%, color-mix(in srgb, " +
        accent +
        " 14%, transparent) 0%, transparent 58%), radial-gradient(ellipse 80% 60% at 92% 100%, color-mix(in srgb, " +
        primary +
        " 10%, transparent) 0%, transparent 52%), color-mix(in srgb, " +
        surface +
        " 90%, " +
        bg +
        ")"
    );

    el.style.setProperty(
      "--footer-shimmer-bg",
      "radial-gradient(ellipse 90% 120% at 50% -20%, color-mix(in srgb, " +
        accent +
        " 13%, transparent) 0%, transparent 50%), radial-gradient(ellipse 70% 80% at 100% 100%, color-mix(in srgb, " +
        secondary +
        " 9%, transparent) 0%, transparent 45%), color-mix(in srgb, " +
        surface +
        " 24%, " +
        bg +
        ")"
    );

    el.style.setProperty(
      "--contact-shimmer-bg",
      "radial-gradient(ellipse 120% 80% at 18% -10%, color-mix(in srgb, " +
        accent +
        " 13%, transparent) 0%, transparent 55%), radial-gradient(ellipse 85% 65% at 100% 100%, color-mix(in srgb, " +
        primary +
        " 8%, transparent) 0%, transparent 48%), color-mix(in srgb, " +
        surface +
        " 40%, " +
        bg +
        ")"
    );

    el.style.setProperty(
      "--gallery-shimmer-bg",
      "radial-gradient(ellipse 90% 70% at 85% 15%, color-mix(in srgb, " +
        accent +
        " 11%, transparent) 0%, transparent 52%), radial-gradient(ellipse 80% 60% at 10% 90%, color-mix(in srgb, " +
        primary +
        " 7%, transparent) 0%, transparent 50%), color-mix(in srgb, " +
        bg +
        " 58%, " +
        surface +
        ")"
    );

    el.style.setProperty(
      "--card-shimmer-bg",
      "radial-gradient(ellipse 85% 65% at 0% 0%, color-mix(in srgb, " +
        accent +
        " 9%, transparent) 0%, transparent 52%), radial-gradient(ellipse 70% 55% at 100% 100%, color-mix(in srgb, " +
        primary +
        " 6%, transparent) 0%, transparent 48%), color-mix(in srgb, " +
        bg +
        " 72%, " +
        surface +
        ")"
    );

    el.style.setProperty(
      "--header-shimmer-bg",
      "radial-gradient(ellipse 100% 90% at 50% -30%, color-mix(in srgb, " +
        accent +
        " 10%, transparent) 0%, transparent 55%), " +
        bg
    );

    el.style.setProperty(
      "--btn-shimmer-bg",
      "linear-gradient(135deg, color-mix(in srgb, " +
        accent +
        " 94%, white) 0%, " +
        accent +
        " 46%, color-mix(in srgb, " +
        primary +
        " 86%, black) 100%)"
    );

    el.style.setProperty("--card-shimmer-a", cardThumbGradient(colors, 0));
    el.style.setProperty("--card-shimmer-b", cardThumbGradient(colors, 1));
    el.style.setProperty("--card-shimmer-c", cardThumbGradient(colors, 2));
    el.style.setProperty("--palette-accent-glow", "color-mix(in srgb, " + accent + " 32%, transparent)");
  }

  function applyPreviewTokensToElement(el, colors) {
    applyColorsToElement(el, colors);
  }

  function resolveIndustryColorSets(industry) {
    const ind = String(industry || "").toLowerCase();
    return INDUSTRY_COLOR_SETS[ind] || INDUSTRY_COLOR_SETS.default;
  }

  function findColorSet(industry, setId) {
    if (!setId) return null;
    const bucket = resolveIndustryColorSets(industry);
    if (bucket.primary && bucket.primary.id === setId) return bucket.primary;
    if (bucket.secondary && bucket.secondary.id === setId) return bucket.secondary;
    const def = INDUSTRY_COLOR_SETS.default;
    if (def.primary && def.primary.id === setId) return def.primary;
    if (def.secondary && def.secondary.id === setId) return def.secondary;
    return null;
  }

  function swatchesFromColors(colors) {
    if (!colors) return [];
    return [colors.accent, colors.primary, colors.bg, colors.surface].filter(Boolean);
  }

  function publicColorSetView(set) {
    if (!set) return null;
    const family = byId[set.family];
    const template = family && family.internal ? family.internal.template : "editorial";
    const type = typographyForTemplate(template);
    return {
      id: set.id,
      label: set.label,
      tagline: set.tagline,
      motivation: set.motivation || "",
      colors: Object.assign({}, set.colors),
      swatches: swatchesFromColors(set.colors),
      family: set.family,
      template: template,
      typography: type,
      preview: family
        ? {
            swatches: swatchesFromColors(set.colors),
            headingFont: family.preview.headingFont,
            bodyFont: family.preview.bodyFont,
            headingStack: type.heading,
            bodyStack: type.body,
          }
        : {
            swatches: swatchesFromColors(set.colors),
            headingFont: "Manrope",
            bodyFont: "Manrope",
            headingStack: type.heading,
            bodyStack: type.body,
          },
    };
  }

  function inferColorSetFromPage(page) {
    if (!page) return INDUSTRY_COLOR_SETS.default.primary;
    const ind = String(page.industry || "konsult").toLowerCase();
    const bucket = resolveIndustryColorSets(ind);
    if (page.designColorSetId) {
      const found = findColorSet(ind, page.designColorSetId);
      if (found) return found;
    }
    if (page.designFamily) {
      if (bucket.primary && bucket.primary.family === page.designFamily) return bucket.primary;
      if (bucket.secondary && bucket.secondary.family === page.designFamily) return bucket.secondary;
    }
    return bucket.primary || INDUSTRY_COLOR_SETS.default.primary;
  }

  function applyColorsToElement(el, colors) {
    if (!el || !colors) return;
    COLOR_VAR_KEYS.forEach(function (key) {
      if (colors[key] != null) el.style.setProperty("--" + key, colors[key]);
    });
    applyShimmerTokensToElement(el, colors);
  }

  function applyColorSetToPage(page, setId, industry, opts) {
    opts = opts || {};
    const ind = String((industry != null ? industry : page && page.industry) || "verksamhet").toLowerCase();
    let set = findColorSet(ind, setId);
    if (!set) set = inferColorSetFromPage(page);
    if (!page || !set) return false;
    const preserveLayout = opts.preserveSiteComposition !== false && !!page.compositionLocked;
    const lockedFamily = preserveLayout ? String(page.designFamily || "").trim() : "";
    page.designColorSetId = set.id;
    page.designColors = Object.assign({}, set.colors);
    page.designFamily = lockedFamily || set.family;
    page.designColorLabel = set.label || "";
    page.designMotivation = set.motivation || "";
    if (opts.applyFamilyTokens && !preserveLayout) {
      const family = byId[set.family];
      if (family) applyInternalTokens(page, family, opts);
    }
    return true;
  }

  function isDarkColorSet(set) {
    const bg = set && set.colors && set.colors.bg;
    if (!bg || bg.charAt(0) !== "#") return false;
    const raw = bg.replace("#", "");
    if (raw.length < 3) return false;
    const channel = parseInt(raw.charAt(0), 16);
    return channel < 8;
  }

  function colorSetHueTags(set) {
    const blob = [
      set && set.id,
      set && set.label,
      set && set.tagline,
      set && set.colors && set.colors.accent,
      set && set.colors && set.colors.primary,
      set && set.colors && set.colors.bg,
    ]
      .join(" ")
      .toLowerCase();
    const tags = [];
    if (/marin|bl[aå]|navy|cyan|indigo|teal|blagra|blågrå/.test(blob)) tags.push("blue");
    if (/gr[oö]n|salvia|skog|oliv|mint|gron/.test(blob)) tags.push("green");
    if (/r[oö]d|vinr[oö]d|rosa|pink|korall|rod/.test(blob)) tags.push("red");
    if (/gul|guld|orange|amber|beige|brun|sand|kaffe|varm/.test(blob)) tags.push("warm");
    if (/lila|lil|purple|violett|midnatt/.test(blob)) tags.push("purple");
    if (/gr[aå]|grafit|svart|mork|mörk|svar/.test(blob)) tags.push("gray");
    if (isDarkColorSet(set)) tags.push("dark");
    else tags.push("light");
    return tags;
  }

  function listSetsForIndustry(industry) {
    const bucket = resolveIndustryColorSets(industry);
    const out = [];
    [bucket.primary, bucket.secondary].forEach(function (set) {
      if (set && !out.some(function (x) { return x.id === set.id; })) out.push(set);
    });
    return out;
  }

  function detectAvoidColorTags(text) {
    const s = String(text || "").toLowerCase();
    const avoid = [];
    if (/vill inte ha|inte ha|inte gillar|gillar inte|utan|skippar|för mycket|for mycket/.test(s)) {
      if (/bl[aå]|blatt|blatt|marin|navy|cyan|turkos|indigo/.test(s)) avoid.push("blue");
      if (/gr[oö]n|gron|salvia|skogs|oliv|mint/.test(s)) avoid.push("green");
      if (/r[oö]d|rod|vinr[oö]d|rosa|pink|korall/.test(s)) avoid.push("red");
      if (/gul|guld|orange|beige|brun|sand|varm/.test(s)) avoid.push("warm");
      if (/lila|lil|purple|violett/.test(s)) avoid.push("purple");
      if (/gr[aå]|grafit|gr[aå]a/.test(s)) avoid.push("gray");
      if (/m[oö]rk|svart|mork/.test(s)) avoid.push("dark");
      if (/ljus|ljusare|vit|bright/.test(s)) avoid.push("light");
    }
    if (/varmare|varmare|mjukare|hemtrev/.test(s)) avoid.push("blue", "gray", "dark");
    if (/mer profession|proffsig|seri[oö]s|neutral/.test(s)) avoid.push("warm", "purple");
    return avoid;
  }

  function pickAlternativeColorSet(industry, currentSetId, userText) {
    const ind = String(industry || "verksamhet").toLowerCase();
    const avoid = detectAvoidColorTags(userText);
    const cur = String(currentSetId || "").trim();

    function scoreSet(set, bonus) {
      if (!set) return -999;
      let score = set.id === cur ? -1 : 2;
      score += bonus || 0;
      const tags = colorSetHueTags(set);
      avoid.forEach(function (tag) {
        if (tags.indexOf(tag) >= 0) score -= 12;
      });
      if (avoid.length && tags.indexOf("warm") >= 0 && avoid.indexOf("blue") >= 0) score += 3;
      if (avoid.indexOf("dark") >= 0 && tags.indexOf("light") >= 0) score += 4;
      if (avoid.indexOf("light") >= 0 && tags.indexOf("dark") >= 0) score += 4;
      return score;
    }

    function bestFrom(sets, bonus) {
      let best = null;
      let bestScore = -999;
      sets.forEach(function (set) {
        const score = scoreSet(set, bonus);
        if (score > bestScore) {
          bestScore = score;
          best = set;
        }
      });
      return best;
    }

    const industrySets = listSetsForIndustry(ind);
    let best = bestFrom(industrySets, 5);
    if (!best || best.id === cur) {
      const fallback = bestFrom(listSetsForIndustry("default"), 0);
      if (fallback && fallback.id !== cur) best = fallback;
    }
    if (!best || best.id === cur) {
      best = industrySets.find(function (set) { return set.id !== cur; }) || best || industrySets[0];
    }
    return best ? publicColorSetView(best) : null;
  }

  /**
   * Applicerar färger, typografi, knappstil och luft som ett sammanhängande paket.
   * Layout (heroLayout/template) styrs av Site Composition Engine när compositionLocked.
   */
  function applyCohesiveDesignToPage(page, setId, industry, opts) {
    opts = opts || {};
    if (!page) return false;
    const ind = String((industry != null ? industry : page.industry) || "verksamhet").toLowerCase();
    const preserveLayout = opts.preserveSiteComposition !== false && !!page.compositionLocked;
    const applied = applyColorSetToPage(page, setId, ind, {
      applyFamilyTokens: false,
      preserveSiteComposition: preserveLayout,
    });
    if (!applied) return false;

    const set = findColorSet(ind, page.designColorSetId);
    const family = set && byId[set.family];
    if (!preserveLayout && family && family.internal && family.internal.buttonStyle) {
      page.buttonStyle = family.internal.buttonStyle;
    }
    if (!preserveLayout && family && family.internal && family.internal.template) {
      page.template = family.internal.template;
    }
    if (!preserveLayout) {
      page.sectionSpacing = isDarkColorSet(set) ? "3" : "2";
    }
    page.fontPair = "";
    return true;
  }

  function listAllColorSets() {
    const out = [];
    Object.keys(INDUSTRY_COLOR_SETS).forEach(function (key) {
      const bucket = INDUSTRY_COLOR_SETS[key];
      [bucket.primary, bucket.secondary].forEach(function (set) {
        if (set && !out.some(function (x) {
          return x.id === set.id;
        })) out.push(set);
      });
    });
    return out;
  }

  function scoreColorSetForComposition(set, page, localSets) {
    if (!set) return -999;
    const familyId = String(
      (page && page.designFamily) ||
        (page && page.siteComposition && page.siteComposition.designFamily) ||
        ""
    ).trim();
    const theme = String(
      (page && page.theme) || (page && page.siteComposition && page.siteComposition.theme) || ""
    ).trim();
    let score = 0;
    if (familyId && set.family === familyId) score += 25;
    if (theme === "black-gold") {
      if (isDarkColorSet(set)) score += 18;
      if (set.family === "fotograf") score += 8;
    } else if (theme === "beige-lux") {
      if (set.family === "cafe") score += 15;
      if (!isDarkColorSet(set)) score += 10;
    } else if (theme === "minimal-white") {
      if (!isDarkColorSet(set)) score += 12;
      if (set.family === "salon") score += 5;
    }
    if (localSets && localSets.indexOf(set) >= 0) score += 10;
    const expr =
      (page && page.artDirectorBrief && page.artDirectorBrief.expression) ||
      (page && page.siteComposition && page.siteComposition.artDirector && page.siteComposition.artDirector.expression) ||
      "";
    if (expr === "warm" && set.family === "cafe") score += 8;
    if (expr === "bold" && (set.family === "fotograf" || isDarkColorSet(set))) score += 8;
    if (expr === "quiet" && !isDarkColorSet(set)) score += 6;
    const ind = String((page && page.industry) || "").toLowerCase();
    const indPrefix = {
      elektriker: "el-",
      tarot: "tarot-",
      byggfirma: "bygg-",
      frisor: "frisor-",
      cafe: "cafe-",
      fotograf: "foto-",
    };
    const pfx = indPrefix[ind];
    if (pfx && set.id && String(set.id).indexOf(pfx) === 0) score += 14;
    return score;
  }

  /** Välj färgset utifrån SCE:s designfamilj och tema — skriver inte över layout. */
  function pickForComposition(page, ctx, description) {
    page = page || {};
    ctx = ctx || {};
    if (!page.compositionLocked) return pickForContext(ctx, description);

    const ind = String(page.industry || (ctx && ctx.industry) || "verksamhet").toLowerCase();
    const bucket = resolveIndustryColorSets(ind);
    const local = [bucket.primary, bucket.secondary].filter(Boolean);
    const all = listAllColorSets();
    const pool = local.concat(
      all.filter(function (set) {
        return local.indexOf(set) < 0;
      })
    );

    let best = null;
    let bestScore = -999;
    pool.forEach(function (set) {
      const score = scoreColorSetForComposition(set, page, local);
      if (score > bestScore) {
        bestScore = score;
        best = set;
      }
    });

    if (best) return publicColorSetView(best);
    return pickForContext(ctx, description);
  }

  function syncPageDesign(page) {
    if (!page) return page;
    if (page.cdDesignLocked && page.designColors) return page;
    if (isCdRenderPage(page)) return page;
    const inferred = inferColorSetFromPage(page);
    if (!page.designColorSetId) page.designColorSetId = inferred.id;
    const set = findColorSet(page.industry, page.designColorSetId) || inferred;
    if (set) {
      page.designColors = Object.assign({}, set.colors);
      if (!page.designFamily) page.designFamily = set.family;
    }
    return page;
  }

  const LEGACY_PAIRS = [
    { theme: "beige-lux", template: "atelier", id: "cafe" },
    { theme: "minimal-white", template: "luxury-brand", id: "salon" },
    { theme: "black-gold", template: "swiss-grid", id: "fotograf" },
    { theme: "black-gold", template: "landmark", id: "fotograf" },
    { theme: "minimal-white", template: "editorial", id: "salon" },
  ];

  function list(opts) {
    opts = opts || {};
    let items = BUILTIN.slice();
    if (opts.builtinOnly) items = items.filter(function (f) {
      return f.source === "builtin";
    });
    if (opts.includePremium === false) items = items.filter(function (f) {
      return !f.premium;
    });
    return items.map(publicView);
  }

  function get(id) {
    return byId[id] ? publicView(byId[id]) : null;
  }

  function getRaw(id) {
    return byId[id] || null;
  }

  function publicView(family) {
    if (!family) return null;
    return {
      id: family.id,
      label: family.label,
      tagline: family.tagline,
      description: family.description,
      source: family.source,
      version: family.version,
      premium: family.premium,
      preview: family.preview,
      industries: family.industries.slice(),
    };
  }

  function inferFromLegacy(page) {
    if (!page) return "cafe";
    if (page.designFamily && byId[page.designFamily]) return page.designFamily;
    const theme = page.theme || "minimal-white";
    const template = page.template || "editorial";
    for (let i = 0; i < LEGACY_PAIRS.length; i++) {
      const p = LEGACY_PAIRS[i];
      if (p.theme === theme && p.template === template) return p.id;
    }
    if (theme === "beige-lux" || template === "atelier") return "cafe";
    if (theme === "minimal-white" || template === "luxury-brand") return "salon";
    if (theme === "black-gold" || template === "swiss-grid" || template === "landmark") return "fotograf";
    return "cafe";
  }

  function applyInternalTokens(page, family, opts) {
    opts = opts || {};
    if (!page || !family) return page;
    page.designFamily = family.id;
    if (page.compositionLocked || page.siteComposition) {
      if (!opts.forceOverride) {
        if (family.internal.buttonStyle && !page.buttonStyle) {
          page.buttonStyle = family.internal.buttonStyle;
        }
        return page;
      }
    }
    page.designFamily = family.id;
    page.theme = family.internal.theme;
    page.template = family.internal.template;
    page.buttonStyle = family.internal.buttonStyle || "";
    if (family.internal.heroLayout) page.heroLayout = family.internal.heroLayout;
    page.fontPair = "";
    return page;
  }

  function applyToPage(page, familyOrSetId, opts) {
    opts = opts || {};
    if (!page) return false;
    if (page.compositionLocked && !opts.forceOverride) {
      return applyColorSetToPage(page, familyOrSetId, opts.industry != null ? opts.industry : page.industry, {
        preserveSiteComposition: true,
      });
    }
    const industry = opts.industry != null ? opts.industry : page.industry;
    const asSet = findColorSet(industry, familyOrSetId);
    if (asSet) return applyColorSetToPage(page, asSet.id, industry, opts);
    const family = byId[familyOrSetId];
    if (!family) return false;
    applyInternalTokens(page, family);
    const inferred = inferColorSetFromPage(page);
    if (inferred) {
      page.designColorSetId = inferred.id;
      page.designColors = Object.assign({}, inferred.colors);
    }
    return true;
  }

  function syncPageFromFamily(page) {
    return syncPageDesign(page);
  }

  function applyToElement(el, familyId) {
    const family = byId[familyId];
    if (!el || !family) return false;
    el.setAttribute("data-design-family", family.id);
    el.setAttribute("data-theme", family.internal.theme);
    el.setAttribute("data-template", family.internal.template);
    if (family.internal.buttonStyle) el.setAttribute("data-button-style", family.internal.buttonStyle);
    else el.removeAttribute("data-button-style");
    return true;
  }

  function isCdRenderPage(page) {
    const CDG = global.CreateCdGate;
    if (CDG && typeof CDG.isCdRenderPage === "function") {
      return CDG.isCdRenderPage(page);
    }
    return !!(page && (page.createPath === "cd" || page.cdDesignLocked));
  }

  /** Applicera aktiv designfamilj på hela preview-trädet i studion. */
  function applyToPreviewDOM(page) {
    if (!page || typeof document === "undefined") return false;
    syncPageDesign(page);

    const cdRender = isCdRenderPage(page);
    const familyId = cdRender ? "" : page.designFamily || inferFromLegacy(page);
    const theme = page.theme || "minimal-white";
    const template = page.template || "editorial";
    const industry = cdRender ? "" : page.industry || "konsult";
    const spacing = page.sectionSpacing || "2";
    const colors = cdRender
      ? page.designColors || null
      : page.designColors || inferColorSetFromPage(page).colors;
    const legacyFonts = ["inter-dm", "fraunces-inter", "playfair"];
    const isStudioShell = document.body.classList.contains("studio-shell");
    const isReadonly = document.body.getAttribute("data-studio-mode") === "readonly";
    const previewPane = document.getElementById("studioPreviewPane");
    const siteMain = document.getElementById("siteMain");
    const siteFooter = document.getElementById("siteFooter");

    function paint(el) {
      if (!el) return;
      if (familyId) el.setAttribute("data-design-family", familyId);
      else el.removeAttribute("data-design-family");
      if (page.designColorSetId && !cdRender) el.setAttribute("data-color-set", page.designColorSetId);
      else el.removeAttribute("data-color-set");
      el.setAttribute("data-theme", theme);
      el.setAttribute("data-template", template);
      if (industry) el.setAttribute("data-industry", industry);
      else el.removeAttribute("data-industry");
      el.setAttribute("data-section-spacing", spacing);
      if (!page.fontPair || legacyFonts.includes(page.fontPair)) el.removeAttribute("data-font-pair");
      else el.setAttribute("data-font-pair", page.fontPair);
      if (!page.buttonStyle || page.buttonStyle === "solid") el.removeAttribute("data-button-style");
      else el.setAttribute("data-button-style", page.buttonStyle);
      if (page.accentStyle) el.setAttribute("data-accent-style", page.accentStyle);
      else el.removeAttribute("data-accent-style");
      if (page.ctaEmphasis && page.ctaEmphasis !== "balanced") {
        el.setAttribute("data-cta-emphasis", page.ctaEmphasis);
      } else {
        el.removeAttribute("data-cta-emphasis");
      }
      applyColorsToElement(el, colors);
      applyTypographyToElement(el, template);
    }

    if (isStudioShell && !isReadonly && previewPane) {
      paint(previewPane);
      paint(siteMain);
      paint(siteFooter);
      if (siteMain) {
        siteMain.querySelectorAll("[data-section], .site-public-header").forEach(function (sec) {
          paint(sec);
        });
      }
      [
        "data-design-family",
        "data-theme",
        "data-template",
        "data-section-spacing",
        "data-font-pair",
        "data-button-style",
      ].forEach(function (key) {
        document.body.removeAttribute(key);
      });
      if (industry) document.body.setAttribute("data-industry", industry);
      else document.body.removeAttribute("data-industry");
      return true;
    }

    paint(document.body);
    if (siteMain) {
      siteMain.querySelectorAll("[data-section], .site-public-header").forEach(function (sec) {
        paint(sec);
      });
    }
    if (siteFooter) paint(siteFooter);
    return true;
  }

  function scoreFamily(family, ctx, descLower) {
    let score = 0;
    const industry = String((ctx && ctx.industry) || "").toLowerCase();
    if (industry && family.industries.indexOf(industry) !== -1) score += 12;
    family.keywords.forEach(function (kw) {
      if (descLower.indexOf(kw) !== -1) score += kw.length > 5 ? 4 : 2;
    });
    if (ctx && ctx.plan && ctx.plan.goal === "bookings" && family.id === "salon") score += 2;
    return score;
  }

  /** Create-flöde steg 4 → designfamilj (färg/typografi-känsla). */
  const CREATE_DESIGN_STYLE_FAMILY = {
    "nordisk-ren": "salon",
    "modern-professionell": "salon",
    "varm-valkomnande": "cafe",
    "mork-exklusiv": "fotograf",
    "lekfull-kreativ": "cafe",
  };

  function pickForContext(ctx, description) {
    const ind = String((ctx && ctx.industry) || "").toLowerCase();
    const bucket = resolveIndustryColorSets(ind);
    const descLower = String(description || (ctx && ctx.description) || "")
      .toLowerCase()
      .trim();
    const styleId = ctx && ctx.createDesignStyle && ctx.createDesignStyle.id;

    if (/elektrik|eljour|elservice|elforetag|elföretag/.test(descLower) && bucket.primary) {
      return publicColorSetView(bucket.primary);
    }
    if (/varm|trä|tra|jordnär|hemtrev|brun|sand|fika|café|cafe/.test(descLower) && bucket.secondary) {
      return publicColorSetView(bucket.secondary);
    }
    if (/blå|bla|marin|proff|seriös|serios|trygg|förtroende|fortroende/.test(descLower) && bucket.primary) {
      return publicColorSetView(bucket.primary);
    }

    if (styleId && CREATE_DESIGN_STYLE_FAMILY[styleId]) {
      if (styleId === "varm-valkomnande" || styleId === "lekfull-kreativ") {
        return publicColorSetView(bucket.secondary || bucket.primary || INDUSTRY_COLOR_SETS.default.primary);
      }
      if (styleId === "mork-exklusiv") {
        const sets = [bucket.primary, bucket.secondary].filter(Boolean);
        for (let i = 0; i < sets.length; i++) {
          if (isDarkColorSet(sets[i])) return publicColorSetView(sets[i]);
        }
      }
      if (styleId === "nordisk-ren") {
        return publicColorSetView(bucket.primary || INDUSTRY_COLOR_SETS.default.primary);
      }
    }

    if (/mörk|mork|kontrast|dramatisk|kraft/.test(descLower)) {
      const sets = [bucket.primary, bucket.secondary].filter(Boolean);
      for (let i = 0; i < sets.length; i++) {
        if (isDarkColorSet(sets[i])) return publicColorSetView(sets[i]);
      }
    }

    if (ind === "elektriker" || ind === "byggfirma" || ind === "advokat" || ind === "konsult") {
      return publicColorSetView(bucket.primary || INDUSTRY_COLOR_SETS.default.primary);
    }
    if (/fris|salong|hund|café|cafe|restaurang|foto|tarot/.test(ind) && bucket.secondary) {
      return publicColorSetView(bucket.secondary);
    }
    return publicColorSetView(bucket.primary || INDUSTRY_COLOR_SETS.default.primary);
  }

  function recommendForIndustry(industry) {
    const ind = String(industry || "").toLowerCase();
    const bucket = resolveIndustryColorSets(ind);
    const primary = bucket.primary ? publicColorSetView(bucket.primary) : null;
    const secondary = bucket.secondary ? publicColorSetView(bucket.secondary) : null;
    return {
      industry: ind,
      industryName: INDUSTRY_NAMES[ind] || "din verksamhet",
      primary: primary,
      secondary: secondary,
      ids: [primary && primary.id, secondary && secondary.id].filter(function (id, i, arr) {
        return id && arr.indexOf(id) === i;
      }),
    };
  }

  function getCreationBrief(setId, ctx) {
    const ind = String((ctx && ctx.industry) || "verksamhet").toLowerCase();
    let set = findColorSet(ind, setId);
    if (!set && setId && byId[setId]) {
      set = inferColorSetFromPage({ industry: ind, designFamily: setId });
    }
    if (!set && setId) set = findColorSet("default", setId);
    const motivation =
      (set && set.motivation) ||
      (ctx && ctx.page && ctx.page.designMotivation) ||
      getMotivation(set && set.family, ctx);
    if (motivation) {
      const ad =
        ctx && ctx.page && ctx.page.artDirectorBrief
          ? ctx.page.artDirectorBrief
          : null;
      const brandLine = ad && ad.brandFeel ? " Varumärkeskänsla: " + ad.brandFeel.split("—")[0].trim() + "." : "";
      return (
        motivation +
        brandLine +
        " Hela webbplatsen — header, knappar, kort och bakgrunder — följer samma tema."
      );
    }
    const label = set && set.label ? set.label : "ett färgtema";
    const indName = INDUSTRY_NAMES[ind] || "din verksamhet";
    return (
      "Jag valde " +
      label +
      " eftersom det passar " +
      indName +
      ". Hela webbplatsen följer samma design."
    );
  }

  function getMotivation(familyId, ctx) {
    const ind = String((ctx && ctx.industry) || "").toLowerCase();
    const pageSetId = ctx && ctx.designColorSetId;
    if (pageSetId) {
      const set = findColorSet(ind, pageSetId);
      if (set && set.motivation) return set.motivation;
    }
    const family = byId[familyId];
    if (!family) return "";
    const industry = ind;
    if (industry && family.motivations[industry]) return family.motivations[industry];
    return family.motivations.default || "";
  }

  function colorSetLabel(setId, industry) {
    const set = findColorSet(industry, setId);
    return set ? set.label : setId;
  }

  function suggestForGoal(lower) {
    if (/exklusiv|exklusive|premium|lyx|elegant|finare|stilren|lyxigare|varm|välkomnande|fika|café|cafe/.test(lower)) {
      return "cafe";
    }
    if (/professionell|proffsig|seriös|förtroende|trovärdig|personlig|salong|frisör|frisor/.test(lower)) {
      return "salon";
    }
    if (/modern|ren|minimal|bild|foto|fotograf|portfolio|kontrast|kreativ|dramatisk/.test(lower)) {
      return "fotograf";
    }
    return "salon";
  }

  function familyLabel(id) {
    const f = byId[id];
    return f ? f.label : id;
  }

  function familyLabels() {
    return BUILTIN.map(function (f) {
      return f.label;
    });
  }

  function findByLabel(text) {
    const lower = String(text || "").toLowerCase();
    for (let i = 0; i < BUILTIN.length; i++) {
      const f = BUILTIN[i];
      if (lower.indexOf(f.id) !== -1 || lower.indexOf(f.label.toLowerCase()) !== -1) return f.id;
      if (f.exampleLabel && lower.indexOf(f.exampleLabel.toLowerCase()) !== -1) return f.id;
    }
    if (/varm|välkomnande|hemtrevlig/.test(lower)) return "cafe";
    if (/elegant|professionell|förtroende|ljus och/.test(lower)) return "salon";
    if (/kontrast|bildfokus|dramatisk/.test(lower)) return "fotograf";
    return null;
  }

  global.DesignFamilies = {
    list: list,
    get: get,
    getRaw: getRaw,
    applyToPage: applyToPage,
    applyColorSetToPage: applyColorSetToPage,
    applyToElement: applyToElement,
    applyToPreviewDOM: applyToPreviewDOM,
    syncPageFromFamily: syncPageFromFamily,
    syncPageDesign: syncPageDesign,
    inferFromLegacy: inferFromLegacy,
    pickForContext: pickForContext,
    pickForComposition: pickForComposition,
    pickAlternativeColorSet: pickAlternativeColorSet,
    applyCohesiveDesignToPage: applyCohesiveDesignToPage,
    recommendForIndustry: recommendForIndustry,
    getCreationBrief: getCreationBrief,
    getMotivation: getMotivation,
    findColorSet: findColorSet,
    publicColorSetView: publicColorSetView,
    typographyForTemplate: typographyForTemplate,
    miniPageColorsFromDesignColors: miniPageColorsFromDesignColors,
    heroShimmerFromColors: heroShimmerFromColors,
    cardThumbGradient: cardThumbGradient,
    applyShimmerTokensToElement: applyShimmerTokensToElement,
    applyPreviewTokensToElement: applyPreviewTokensToElement,
    applyTypographyToElement: applyTypographyToElement,
    colorSetLabel: colorSetLabel,
    suggestForGoal: suggestForGoal,
    familyLabel: familyLabel,
    familyLabels: familyLabels,
    findByLabel: findByLabel,
    DEFAULT_ID: "cafe",
  };
})(typeof window !== "undefined" ? window : globalThis);
