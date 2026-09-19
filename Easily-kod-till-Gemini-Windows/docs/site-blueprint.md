# Site Blueprint — specifikation v1

Styrdokument enligt [EASILY.md](../EASILY.md).

**Creative Director** är enda kreativa auktoriteten.  
CD producerar först ett låst **Creative Concept** (idén), sedan ett låst **Site Blueprint** (den tekniska lösningen).  
**Renderer** visar exakt blueprinten — inga kreativa beslut.

Legacy (fast mall, SCE, DesignFamilies, `sectionOrder`, `page.template`) får **inte** förekomma.

---

## Flöde

```
Input (wizard-svar)
    ↓
Creative Director
    ↓
Creative Concept   ← kreativ idé (varför, för vem, vilken känsla)
    ↓
Site Blueprint     ← teknisk beskrivning (exakt vad som ska byggas)
    ↓
BlueprintRenderer
    ↓
Editor
```

| Lager | Natur | Läser |
|-------|--------|--------|
| **Creative Concept** | Strategi, berättelse, avsikt | CD (skapar), Blueprint Builder (översätter) |
| **Site Blueprint** | Komponentträd, content, layout, tokens | Renderer, Editor |
| **Renderer** | Visning | Endast Blueprint |

Renderer läser **aldrig** Creative Concept.

---

## Creative Concept — kreativ idé (före Blueprint)

Creative Concept svarar på **varför** sidan ska se ut och kännas som den gör — innan någon komponent eller copy skrivs i blueprint-form.

Det är inte en mall. Det är den **kreativa riktningen** som Blueprint sedan implementerar exakt.

### Schema (översikt)

```json
{
  "conceptVersion": "1.0",
  "meta": {
    "businessName": "Lilla Bo",
    "location": "",
    "industry": "inredning",
    "siteType": "foretag"
  },
  "narrative": {
    "story": "En liten butik där varje detalj är vald för att hemmet ska kännas levande.",
    "singleMessage": "Handplockat för hemmet — inte massmarket.",
    "conversionJourney": "Känn igen stilen → se utbud → besök eller kontakta"
  },
  "audience": {
    "primary": "Människor som söker personliga presenter och inredning med känsla",
    "needs": ["Inspiration", "Kvalitet", "Närhet"],
    "relationship": "du"
  },
  "feeling": {
    "emotionalArrival": "Värme och nyfikenhet — som att kliva in i butiken",
    "forbiddenFeeling": "Katalog, e-handelsmall, hantverkare-estetik",
    "territory": "Personligt, kuraterat, taktilt"
  },
  "informationHierarchy": {
    "phases": [
      {
        "id": "arrival",
        "purpose": "Skapa igenkänning och stämning direkt",
        "priority": 1
      },
      {
        "id": "proof",
        "purpose": "Visa vad butiken erbjuder utan att bli katalog",
        "priority": 2
      },
      {
        "id": "action",
        "purpose": "Gör det enkelt att ta nästa steg",
        "priority": 3
      }
    ],
    "dominantMoment": "arrival"
  },
  "componentStrategy": {
    "choices": [
      {
        "component": "hero",
        "variant": "immersive-fullbleed",
        "servesPhase": "arrival",
        "why": "Present/inredning säljs genom stämning — besökaren ska känna rummet före produktlistor"
      },
      {
        "component": "card-grid",
        "variant": "three-up",
        "servesPhase": "proof",
        "why": "Tre tydliga erbjudanden (present, inredning, besök) utan att bli en generisk tjänstesida"
      },
      {
        "component": "contact-block",
        "variant": "simple",
        "servesPhase": "action",
        "why": "Låg tröskel — fysisk butik vill ha 'hitta hit', inte långa formulär"
      }
    ],
    "rejected": [
      {
        "component": "pricing-matrix",
        "why": "Ingen prislista — sortiment och upplevelse, inte paketjämförelse"
      }
    ]
  },
  "designIntent": {
    "photographicDirection": "Interiör, detaljer, presenter i miljö — aldrig klädbutik eller kontor",
    "tokenRationale": "Varma jordtoner och mjuk typografi — hemtrevnad, inte lyx-katalog",
    "forbiddenImagery": ["Kläder", "Mode", "Stock-team"]
  }
}
```

### Vad varje del beskriver

| Fält | Besvarar |
|------|----------|
| **narrative.story** | Berättelsen — vad är denna verksamhet i ett stycke? |
| **narrative.singleMessage** | Det enda budskapet sidan ska bära |
| **narrative.conversionJourney** | Resan besökaren ska göra (känslomässig, inte bara klick) |
| **audience** | Målgrupp, behov, tilltal (du/ni) |
| **feeling** | Känsla vid ankomst, förbjuden känsla, emotionellt territorium |
| **informationHierarchy** | Vilken information först, sedan, sist — och varför |
| **componentStrategy.choices** | Vilka komponenter + **varför just dessa** (`why` obligatorisk per val) |
| **componentStrategy.rejected** | *(Valfritt)* Vad CD medvetet **inte** valde — och varför |
| **designIntent** | Bild-, färg- och stilintention (inte hex-koder — de kommer i Blueprint) |

### Validering — componentStrategy

| Fält | Obligatorisk? |
|------|----------------|
| `componentStrategy.choices` | ✅ Ja — minst ett val |
| `choices[].component` | ✅ Ja |
| `choices[].why` | ✅ Ja |
| `choices[].variant`, `choices[].servesPhase` | Rekommenderat (Blueprint Builder behöver dem) |
| `componentStrategy.rejected` | ❌ Nej — valfritt |
| `rejected[].component`, `rejected[].why` | Obligatoriska **om** `rejected` finns |

### Regler för Creative Concept

1. **CD skapar och låser Concept före Blueprint.** Ingen renderer, ingen legacy-pipeline.
2. **Concept innehåller inga URL:er, ingen HTML, inga hex-färger.** Det är idé, inte implementation.
3. **`componentStrategy.choices` är avsikten.** Blueprint ska implementera exakt dessa val (`component` + `variant` + fas), plus content/layout/tokens.
4. **`rejected` är valfritt** — använd när det hjälper (t.ex. för att undvika fel komponent nästa gång), inte som krav varje gång.
5. **Öppen catalog gäller här.** CD får föreslå `timeline`, `testimonials-carousel`, etc. om det passar berättelsen — med `why` i choices.
6. **Förbjudet:** att Concept listar legacy-sektioner (`about`, `services`) som struktur. Faserna är `arrival` / `proof` / `action` — inte sektionsnamn.

### Relation Concept → Blueprint

```
Creative Concept                    Site Blueprint
─────────────────                   ─────────────────
"Varför hero immersive?"     →      { type: "hero", variant: "immersive-fullbleed", content: {...} }
"Vilken berättelse i lead?"  →      content.lead: "..."
"Varma jordtoner"            →      design.tokens.color.bg: "#f8f4ef"
"Tre erbjudanden, inte fem"  →      card-grid med exakt 3 cards i content
```

**Blueprint Builder** (deterministisk, inte kreativ) översätter låst Concept → låst Blueprint:

- Läser `componentStrategy.choices` → skapar `root.children[]`
- Läser `narrative` + `feeling` → fyller `content` (copy kan genereras i detta steg utifrån Concept — fortfarande under CD-auktoritet, inte renderer)
- Läser `designIntent` → sätter `design.tokens`
- Validerar: varje blueprint-nod ska ha motsvarande `choice` med matchande `component`, `variant`, `servesPhase`

Om Blueprint inte går att härleda från Concept → fel, inte gissning.

---

## Site Blueprint — teknisk beskrivning

Blueprint är **implementeringen** av Creative Concept. Samma sida som tidigare i specen — nu explicit underordnad Concept.


## 1. Hur representeras en sida?

En sida är **ett rot-träd av komponenter** plus sid‑metadata och designtokens — den tekniska formen av ett redan låst Creative Concept.

```json
{
  "blueprintVersion": "1.0",
  "conceptRef": {
    "conceptVersion": "1.0",
    "lockedAt": "2026-08-14T…"
  },
  "meta": {
    "businessName": "Lilla Bo",
    "location": "",
    "industry": "inredning",
    "locale": "sv-SE",
    "createPath": "blueprint"
  },
  "design": {
    "tokens": { }
  },
  "root": {
    "id": "page",
    "type": "page",
    "children": [ ]
  }
}
```

| Fält | Betydelse |
|------|-----------|
| `conceptRef` | Referens till låst Creative Concept som denna blueprint implementerar |
| `blueprintVersion` | Schemaversion — renderer vägrar okända versioner |
| `meta` | Fakta om verksamheten — **inte** layout eller copy |
| `design.tokens` | Globala styling‑tokens (färger, typografi, spacing) |
| `root` | Rotnod; all synlig struktur finns i trädet under `root` |

**En sida är inte** en lista `["hero","about","services"]`.  
**En sida är** ett komponentträd.

---

## 2. Hur representeras en komponent?

Varje nod i trädet är en **komponent** med fast schema:

```json
{
  "id": "cmp_7f3a",
  "type": "content-block",
  "variant": "prose-with-media",
  "content": { },
  "layout": { },
  "style": { },
  "children": [ ]
}
```

| Fält | Betydelse |
|------|-----------|
| `id` | Stabil identifierare (redigering, diff, anchor) |
| `type` | Typ‑identifierare (öppen sträng) — t.ex. `hero`, `content-block`, `pricing-matrix` |
| `variant` | Visuell/layout‑variant inom typen (se §3) |
| `content` | All copy och media för denna nod (se §6) |
| `layout` | Geometri och placering för denna nod (se §5) |
| `style` | Token‑överskridanden, endast för denna nod (se §7) |
| `children` | Underkomponenter (valfritt; vissa typer tillåter 0..n barn) |

### Component Catalog — öppen, utbyggbar

Catalogen är **inte sluten**. Den är ett **register** av komponentdefinitioner som kan växa över tid utan att core byggs om.

**Grundidé:** CD väljer `type` utifrån **avsikt** (vad sidan behöver), inte utifrån “vilka lådor finns i dag”.  
Om rätt typ saknas skapas den — den mappas **aldrig** till “närmaste befintliga komponent”.

#### Component Definition (manifest)

Varje typ beskrivs av ett manifest (registry eller inbäddat i blueprint):

```json
{
  "type": "pricing-matrix",
  "version": "1.0",
  "label": "Pricing Matrix",
  "intent": "Jämför paket eller prisnivåer i kolumner",
  "capabilities": ["headline", "columns", "actions", "emphasis"],
  "contentSchema": { },
  "layoutSchema": { },
  "variants": {
    "three-tier": { "render": "pricing-matrix/three-tier" },
    "two-tier": { "render": "pricing-matrix/two-tier" }
  }
}
```

| Fält | Betydelse |
|------|-----------|
| `type` | Stabil slug (`pricing-matrix`, `team-mosaic`) |
| `version` | Manifestversion — renderer kan ladda flera |
| `intent` | Vad komponenten är till för (CD läser, människa förstår) |
| `capabilities` | Abstrakta förmågor — sökning utan hårdkodad typlista |
| `contentSchema` | JSON Schema för `content` |
| `layoutSchema` | JSON Schema för `layout` |
| `variants` | Tillåtna varianter + render‑referens |

#### Tre källor (uppslag i ordning)

1. **Global registry** — inbyggda + installerade komponenter (Hero, Card Grid, …)
2. **`blueprint.componentDefinitions`** — typer CD introducerar i just denna blueprint
3. **Stopp** — okänd typ utan definition → render‑fel (inte fallback)

```json
{
  "blueprintVersion": "1.0",
  "componentDefinitions": {
    "instagram-feed": {
      "type": "instagram-feed",
      "version": "1.0",
      "intent": "Visa senaste inlägg från Instagram",
      "contentSchema": { },
      "variants": { "grid": { "render": "instagram-feed/grid" } }
    }
  },
  "root": {
    "children": [
      { "type": "instagram-feed", "variant": "grid", "content": { } }
    ]
  }
}
```

När en ny typ fungerar i produktion kan manifestet **promoveras** till global registry — utan att ändra blueprint‑formatet.

#### Så läggs en ny komponent till (utan ombyggnad av core)

| Steg | Vem | Vad |
|------|-----|-----|
| 1 | CD / produkt | Väljer eller skapar `type` + `variant` utifrån behov |
| 2 | CD | Fyller `content` enligt schema; ev. `componentDefinitions` om typen är ny |
| 3 | Utvecklare (parallellt) | Lägger render‑modul + manifest i registry — **plugin, inte core‑patch** |
| 4 | Renderer | Registrerar modulen; nästa sida med samma `type` behöver inte inbäddad definition |

Exempel på tidslinje:

| Idag (registry) | Nästa år (samma mekanism) |
|-----------------|---------------------------|
| `hero` | `timeline` |
| `card-grid` | `comparison` |
| `media-gallery` | `pricing-matrix` |
| `cta-band` | `testimonials-carousel` |
| `footer` | `map-cluster`, `podcast-player`, `video-story`, … |

Ingen av “nästa år”-typerna är specialfall i schemat — de är nya manifest + render‑modul.

#### Förbjudna mönster (legacy‑tänk)

| ❌ Förbjudet | Varför |
|--------------|--------|
| `type: "about"` / `"services"` / `"gallery"` | Legacy‑sektions‑ID |
| “Närmaste komponent är card-grid…” | Tvingar mall, inte avsikt |
| `typeAliases: { about: "content-block" }` | Döljer legacy i stället för att lämna det |
| Renderer som gissar layout/copy | Bryter “renderer fattar inga kreativa beslut” |
| Sluten enum som CD måste välja inom | Tvingar samma misstag om ett år |

#### Tillåtet

- CD använder **`pricing-matrix`** för att jämföra paket — även om den typen inte fanns när Easily lanserades.
- CD använder **`content-block`** när en enkel text+media‑yta räcker — av **avsikt**, inte för att “about inte finns längre som sektion”.
- Tom sida med två noder: `hero` + `contact-block`. Inga obligatoriska mellanled.

---

## 3. Hur representeras en variant?

`variant` är en **nyckel inom en typ** som pekar på exakt render‑mall i renderern.

```json
{
  "type": "hero",
  "variant": "immersive-fullbleed"
}
```

Regler:

- Varje `type` har varianter definierade i **Component Definition** (registry eller `componentDefinitions`).
- CD **väljer** variant utifrån brief — inte “default mall”.
- Renderer **slår upp** definition → `variants[variant].render` → render‑modul. Ingen logik utöver lookup + validering.
- Okänd `type` utan definition → **fel** (inte närmaste granne, inte legacy‑sektion).
- Okänd `variant` för känd `type` → **fel** (inte tyst fallback).

Exempel (registry idag — imorgon kan listan vara annorlunda):

| type | variant | Betydelse |
|------|---------|-----------|
| `hero` | `immersive-fullbleed` | Bild bakom text, full bredd |
| `hero` | `split-media-right` | Text vänster, media höger |
| `hero` | `text-minimal` | Ingen bild, typografi bär |
| `content-block` | `prose-with-media` | Brödtext + sidobild |
| `content-block` | `prose-only` | Endast text |
| `card-grid` | `three-up` | Tre kort i rad |
| `card-grid` | `two-up` | Två kort |
| `media-gallery` | `masonry` | Masonry‑galleri |
| `media-gallery` | `grid-tight` | Tät grid |
| `pricing-matrix` | `three-tier` | Tre prisnivåer (ny typ — samma mekanism) |
| `timeline` | `vertical` | Tidslinje (ny typ — samma mekanism) |

Variant ≠ `page.template`. Variant är **per komponent**, inte en global mall.

---

## 4. Hur representeras ordning?

Ordning = **trädets sekvens** — först `root.children[0]`, sedan `[1]`, osv. Nästlade barn renderas depth‑first efter förälderns öppning (regler per typ definierar om barn renderas inuti föräldern eller som syskon).

```json
"root": {
  "type": "page",
  "children": [
    { "id": "h1", "type": "brand-header", "variant": "inline-nav", "children": [] },
    { "id": "h2", "type": "hero", "variant": "immersive-fullbleed", "children": [] },
    { "id": "c1", "type": "content-block", "variant": "prose-with-media", "children": [] },
    { "id": "g1", "type": "card-grid", "variant": "three-up", "children": [] },
    { "id": "f1", "type": "footer", "variant": "minimal", "children": [] }
  ]
}
```

Regler:

- **Ingen** `sectionOrder`, **ingen** obligatorisk ordning i schemat.
- CD kan producera en sida med **endast** `hero` + `contact-block` om det passar verksamheten.
- Navigation (`brand-header.content.links`) härleds från komponenter med `anchor` i content, eller anges explicit i header‑nodens content — inte från legacy `page.navigation`.

---

## 5. Hur representeras layout?

Layout beskriver **geometri och yta** för en nod — inte global mall.

```json
"layout": {
  "width": "contained",
  "maxWidth": "lg",
  "paddingY": "generous",
  "columns": 2,
  "mediaPosition": "left",
  "align": "start",
  "gap": "md"
}
```

| Fält | Värden | Betydelse |
|------|--------|-----------|
| `width` | `contained` \| `full-bleed` | Boxad vs kant‑till‑kant |
| `maxWidth` | token‑nyckel | Max bredd |
| `paddingY` | spacing‑token | Vertikal luft |
| `columns` | 1..4 | Rutnät (card-grid, split) |
| `mediaPosition` | `left` \| `right` \| `background` | Media vs text |
| `align` | `start` \| `center` \| `end` | Innehållsjustering |
| `gap` | spacing‑token | Mellanrum |

Regler:

- Layout sätts av **CD** i blueprint (eller härleds deterministiskt från `variant` i catalogen — samma input → samma layout; renderer härleder inte själv).
- **Ingen** `page.template`, **ingen** `data-template`, **ingen** `heroLayout` på page‑nivå.
- `layout` påverkar endast noden den sitter på.

---

## 6. Hur representeras innehåll?

`content` är **typad payload** per komponenttyp. Renderer skriver aldrig copy.

### Gemensamma content‑fält (återanvänds där det passar)

```json
{
  "headline": "Lilla Bo.",
  "lead": "Handplockat för hemmet.",
  "body": ["Stycke ett.", "Stycke två."],
  "actions": [
    { "label": "Besök oss", "href": "#kontakt", "emphasis": "primary" },
    { "label": "Se mer", "href": "#utbud", "emphasis": "secondary" }
  ],
  "media": [
    { "url": "https://…", "alt": "", "role": "hero-background" }
  ],
  "anchor": "om-oss"
}
```

### Typ‑specifikt (exempel)

**card-grid.content**
```json
{
  "headline": "Present & inredning",
  "lead": "Handplockat med omsorg.",
  "cards": [
    { "title": "Presenter", "body": "…", "media": { "url": "…" }, "action": { "label": "…", "href": "…" } }
  ]
}
```

**faq-list.content**
```json
{
  "headline": "Vanliga frågor",
  "items": [{ "question": "…", "answer": "…" }]
}
```

Regler:

- All text och alla bild‑URL:er som syns i preview **måste** finnas i `content`.
- Tom sträng = medvetet tomt (redigerbart i editor), inte renderer‑placeholder.
- `content` valideras mot `contentSchema` i Component Definition (registry eller inbäddad).

---

## 7. Hur representeras styling?

Tre lager — alla från blueprint, ingen renderer‑tolkning av “bransch”.

### 7a. Site tokens (globalt)

```json
"design": {
  "tokens": {
    "color.bg": "#f8f4ef",
    "color.surface": "#efe6da",
    "color.text": "#3d3228",
    "color.accent": "#b8863a",
    "font.heading": "Fraunces",
    "font.body": "Inter",
    "radius.button": "pill",
    "spacing.section": "generous"
  }
}
```

CD väljer tokens utifrån brief. Renderer mappar tokens → CSS variables på rot (`--bp-color-bg`, etc.).

### 7b. Render‑modul (mekaniskt, inte kreativt)

Varje `variants[variant].render` pekar på en **render‑modul** (plugin): fast HTML/CSS‑struktur för just den varianten.  
Modulen läser endast nodens `content`, `layout`, `style` och site `tokens` — den fattar inga affärsbeslut.

Nya komponenter = ny modul + manifest i registry. Core‑renderer ändras inte.

### 7c. Komponent‑överskridanden (valfritt)

```json
"style": {
  "tokenOverrides": {
    "color.accent": "#9a7342"
  }
}
```

Endast token‑nycklar — inte fri CSS, inte `template`.

**Förbjudet:** `design.template`, `design.theme`, `designFamily`, `page.template`.

---

## Flöde (detalj)

```
Wizard-svar
    ↓
Creative Director
    ├─→ Creative Concept (låst)     berättelse, målgrupp, känsla, hierarki, varför
    └─→ Blueprint Builder           deterministisk översättning — ingen ny kreativitet
            ↓
        Site Blueprint (låst)       komponentträd, content, layout, tokens
            ↓
        BlueprintRenderer           plugin per nod; zero legacy
            ↓
        Editor                      muterar blueprint-noder
```

---

## Legacy‑test

| Om blueprint innehåller… | Bedömning |
|--------------------------|-----------|
| `sectionOrder: ["hero","about","services"]` | ❌ Legacy |
| `type: "about"` | ❌ Legacy |
| `page.template: "atelier"` | ❌ Legacy |
| `root.children[]` med godtycklig `type` + manifest | ✅ Öppet komponentträd |
| CD mappar behov → `pricing-matrix` (ny typ) | ✅ Avsint, inte närmaste granne |
| CD väljer 0..n komponenter | ✅ Ingen obligatorisk sektion |
| “Timeline ≈ card-grid” i renderer | ❌ Legacy‑tänk |
| CD hoppar över Concept → Blueprint direkt | ❌ Saknar kreativt lager |
| Concept med `choices[].why` (obligatorisk) | ✅ Kreativ idé dokumenterad |
| Concept utan `rejected` | ✅ Tillåtet |
| Blueprint utan `conceptRef` | ❌ Implementation utan idé |

---

## Svar på de sju frågorna (Site Blueprint)

| Fråga | Svar |
|-------|------|
| **Sida** | Rot‑träd (`root`) + `meta` + `design.tokens` + `conceptRef` |
| **Komponent** | Nod: `id`, `type` (öppen), `variant`, `content`, `layout`, `style`, `children` |
| **Variant** | Nyckel inom typens manifest → render‑modul |
| **Ordning** | Sekvens i `root.children` (träd), inga fasta sektioner |
| **Layout** | Per nod i `layout` — width, columns, mediaPosition, spacing |
| **Innehåll** | Per nod i `content` — headline, body, actions, media, cards, … |
| **Styling** | Globala `design.tokens` + valfria `style.tokenOverrides` per nod |

### Creative Concept (parallellt — läses inte av renderer)

| Fråga | Svar |
|-------|------|
| **Berättelse** | `narrative.story`, `singleMessage`, `conversionJourney` |
| **Målgrupp** | `audience.primary`, `needs`, `relationship` |
| **Känsla** | `feeling.emotionalArrival`, `forbiddenFeeling`, `territory` |
| **Informationshierarki** | `informationHierarchy.phases`, `dominantMoment` |
| **Varför dessa komponenter** | `componentStrategy.choices[].why` (obligatorisk); `rejected[].why` om rejected finns |

---

## Nästa steg (efter godkännande — inte nu)

1. `creative-concept-contract.js` — schema + validator för Concept  
2. `site-blueprint-contract.js` — blueprint + Component Definition schema  
3. `component-registry.js` — öppet register (load/register/listByCapability)  
4. CD: `buildCreativeConcept(input)` → lås → `buildSiteBlueprint(concept)`  
5. `blueprint-renderer.js` — plugin‑render; läser **endast** Blueprint  
6. Editor: muterar blueprint-noder; större omtag → ny Concept via CD  

**Status:** Concept-schemat godkänt för implementation (narrative, audience, feeling, informationHierarchy, componentStrategy enligt ovan).

**Ingen kod förrän implementation startar explicit.**
