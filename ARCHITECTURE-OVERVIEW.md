# Easily AI Site Builder — Comprehensive Architecture Overview

> **Historisk bakgrund:** Delar av dokumentet nedan beskriver äldre Legacy- och Blueprint-flöden och är inte normerande för den aktiva V2-arkitekturen. Projektets aktuella vision finns i [VISION.md](VISION.md) och den bindande körkedjan i [FIVE-QUESTION-ARCHITECTURE.md](FIVE-QUESTION-ARCHITECTURE.md). Äldre mallar, sektionsgeneratorer och fallbackvägar får inte styra den första AI-genereringen.

## Executive Summary

**Easily** is an AI-powered web design platform that generates and edits websites through intelligent conversations. The system is transitioning from a **Legacy Create Pipeline** to a new **Blueprint Architecture** that enforces strict creative authority and deterministic generation.

### Core Philosophy

- **Creative Director** (CD): Single creative authority that produces locked creative briefs
- **Blueprint**: Technical specification derived from brief — a tree of typed components with locked content
- **Renderer**: Deterministic translation of blueprint to HTML — never makes creative decisions
- **Design Memory**: Persistent design language that evolves with user approvals
- **Intelligence Engines**: Independent systems (Image Intelligence, Text Intelligence, Intent Resolution) that enrich commands and validate against memory

---

## System Overview Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USER INTERACTION                              │
│                    (Chat in /studio.html)                            │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────────────┐
        │   Intent Resolution Engine (IRE)         │
        │  Analyzes user message, scores targets   │
        │  Gathers context from session + memory   │
        └──────────────┬───────────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────────────────┐
        │   AI Design Orchestrator                 │
        │  Plans execution before mutations        │
        │  Consults Design Memory & Intelligence   │
        └──────────────┬───────────────────────────┘
                       │
    ┌──────────────────┴──────────────────┐
    │                                     │
    ▼                                     ▼
[LEGACY PATH]                      [BLUEPRINT PATH]
gate=off                           gate=on (stubs through)
    │                                     │
    ├─ Edit Pipeline                     ├─ Creative Director
    │  (Material System,                 │  (Produces locked Brief)
    │   Text Generation,                 │   
    │   Image Selection)                 ├─ Creative Brief
    │                                     │  (Versionless contract)
    ├─ Site Composition Engine           │
    │  (Legacy structure)                ├─ Site Composition Engine
    │                                     │  (CD-path: deterministic)
    ├─ Design Memory Engine              │
    │                                    ├─ Site Blueprint Builder
    └─ Apply to Document                 │  (Structure → Blueprint)
       (pages, sections, fields)         │
                                        ├─ Site Blueprint
                                         │  (Tree of typed components)
                                         │
                                         ├─ Blueprint Executor(s)
                                         │  CD-path executors:
                                         │   - Hero Executor
                                         │   - About Executor
                                         │   - Contact Executor, etc.
                                         │
                                         └─ Apply to Document
                                            (via Blueprint)
                                            │
                                            ▼
        ┌──────────────────────────────────────────┐
        │    Design Memory Engine                   │
        │  Validates, records acceptances          │
        └──────────────────────────────────────────┘
                        │
                        ▼
        ┌──────────────────────────────────────────┐
        │    Preview + Edit Session State          │
        │  Document mutation, verification         │
        └──────────────┬───────────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────────────────┐
        │    On-Page Rendering                     │
        │   (for edit preview)                     │
        └──────────────────────────────────────────┘
```

---

## 1. Core Intelligence Engines

These are independent subsystems that enrich commands and validate proposals:

### 1.1 Intent Resolution Engine (IRE)

**Purpose**: Understands what the user wants to edit before any action executes.

**Key Responsibility**:
- Analyzes natural language input (Swedish)
- Scores all editable targets (hero:image, hero:text, about:image, page:color, etc.)
- Combines context layers (pending verification, edit focus, recent history, accepted locks)
- Decides: execute immediately, ask one clarifying question, or defer

**Scoring Model**:
- Baseline confidence 0.02 per target
- Boosts applied for:
  - Pending verification (+0.58)
  - Pipeline conversation context (+0.35)
  - Fresh edit session focus (+0.22)
  - Recent edit history (decayed, +0.08–0.55)
  - Explicit mention like "hero-bild" (+0.86–0.92)

**Decision Thresholds**:
- **≥0.72 confidence** with gap ≥0.18 vs next target → **execute**
- **0.40–0.71** → **ask one clarification** (chips/options)
- **<0.40** → **clarify with component picker**

**Output Shape**:
```javascript
{
  intent: "refine.another" | "regenerate" | "color.refine",
  confidence: 0.94,
  target: "hero.image" | "about.text" | "page.color",
  reason: "reject_pending" | "recent_focus" | "explicit",
  selectedAction: { ... },        // pipeline-ready action
  decision: "execute" | "clarify",
  clarify: { message, chips }     // if decision === "clarify"
}
```

### 1.2 Design Memory Engine

**Purpose**: Persistent design language that survives chat close, reload, project save.

**Data Structure** (stored in `doc.meta.designMemory`):
```javascript
{
  version: 1,
  updatedAt: "ISO-8601",
  global: {
    photographyStyle:  { value, status: "approved", at, source },
    lighting:          { ... },
    visualMood:        { ... },
    colorPalette:      { ... },
    typographyTone:    { ... },
    // ... extensible
  },
  sections: {
    hero: {
      image:  { url, imageStyle, lighting, composition, mood, ... },
      text:   { tone, sample, ... },
      cta:    { label, ... }
    },
    about: { ... },
    gallery: { ... },
    // ...
  },
  tokens: {
    colors: { designColorSetId, familyId, label, visualMood },
    logo:   { url, ... }
    // ...
  }
}
```

**Workflow**:
1. User approves edit → "Den här är bra"
2. `EditSession.handleKeep()` captures snapshot
3. `DesignMemoryEngine.recordAcceptance()` extracts traits
4. Global memory updates (photography, lighting, mood propagate)
5. Persists to `SiteState`

**Read Flow** (before execution):
- `consultBeforeExecute(action, text, hooks)` → enriches command with memory hints
- `getConstraints(targetKey)` → provides scoring hints for image/text picking
- `validateProposal(url/text)` → scores consistency against memory

**Validation Dimensions** (weighted):
- photographyStyle (0.28)
- lighting (0.22)
- mood (0.18)
- colors (0.18)
- typography (0.10)
- composition (0.04)

**Quality Gate**: Proposals scoring <0.72 overall are rejected internally; system tries up to 7 candidates.

### 1.3 Image Intelligence Engine

**Purpose**: Professional stock image selection — never naive keyword search.

**Selection Process**:
1. Gather selection context (business, section, design memory, style words)
2. Pool candidates (catalog + generated, up to 64 total)
3. Dedupe by normalized URL
4. Filter rejected (from `doc.meta.imageIntelligence.rejected[section]`)
5. Score each candidate on 14 dimensions
6. Filter weak (overall <0.58 rejected)
7. Diversity pick: highest score from top 12, avoiding recently served IDs

**Scoring Dimensions**:
- businessRelevance
- composition
- lighting
- photographyQuality
- colorHarmony
- brandConsistency
- designMemoryCompatibility
- sectionSuitability
- textOverlaySuitability
- humanQuality
- modernAppearance
- authenticity
- visualFocus

**Section Rules** (weighted boosts):
- **Hero**: landscape, headline space, strong focal point, professional
- **About**: trust, people, authentic, natural lighting
- **Gallery**: completed work, variation, real projects
- **Services (card)**: illustrates service, simple composition, CTA-friendly

**State** (persistent in `doc.meta.imageIntelligence`):
```javascript
{
  rejected: { hero: [...urls], about: [...], ... },
  served:   { hero: [...urls], about: [...], ... }
}
```

**Variant requests** ("igen", "another", "premium", "mörkare"):
- Mark current URL as rejected
- Boost or reduce style weights (e.g., premium → higher min quality, lux moods)
- Retry selection from diversity pool

### 1.4 Text Intelligence Engine

**Purpose**: Professional copywriting — never template pick, always scored candidates.

**Generation Process**:
1. Build writing context (business, brand, location, services, personality, design memory)
2. Translate tone (warmer, professional, less sales, luxurious)
3. Gather 10 writing angles + brief-personalized variants
4. Score each candidate on 11 dimensions
5. Filter weak (overall <0.56)
6. Diversity pick: highest score from top 8, avoiding recently served copy

**Scoring Dimensions**:
- originality
- credibility
- naturalLanguage
- salesStrength
- readability
- seoUsefulness
- trust
- consistencyWithAccepted
- brandConsistency
- localRelevance
- designMemoryCompatibility

**Writing Angles** (10 distinct seeds for diversity):
`trust`, `benefit`, `local`, `story`, `expertise`, `outcome`, `human`, `service`, `calm`, `direct`

**Section Strategies**:
- **Hero**: Short, powerful, clear value proposition, strong CTA
- **About**: Trust, story, experience, human voice
- **Services**: Benefits before features, simple language
- **FAQ**: Reduce objections, clear answers
- **Contact**: Confidence, easy to act

**State** (persistent in `doc.meta.textIntelligence`):
```javascript
{
  rejected: { hero: [...], about: [...], ... },
  served:   { hero: [...], about: [...], ... }
}
```

### 1.5 AI Design Orchestrator

**Purpose**: Single coordinator that runs all intelligence engines _before_ any mutation.

**Execution Lifecycle**:
1. **Understand intent** — from IRE + selected action
2. **Gather context** — Design Memory, Edit Session, locks
3. **Build plan** — ordered steps with internal checklist (never shown)
4. **Plan phase** — pre-validate image/text against memory, consult engines
5. **Execute** — run primary pipeline step + optional companion steps
6. **Validate** — memory + consistency + site review
7. **Quality gate** — internal score ≥0.52 or retry (up to 2×)
8. **Respond** — calm designer response (internal reasoning never exposed)

**Conflict Resolution**:
- When Image Intelligence candidate conflicts with Design Memory validation
- **Policy**: Design Memory wins
- Record rejected URL in Image Intelligence
- Retry selection (up to 4 attempts) before pipeline executes

**Engine Scheduler**:
| Engine | Planning | Execution |
|--------|----------|-----------|
| Intent Resolution | Already resolved | — |
| Design Memory | read, consult, validateProposal | via handleKeep |
| Edit Session | read locks/context | via pipeline |
| Image Intelligence | plan_select with retries | via MaterialSystem |
| Text Intelligence | plan_generate, plan_cta_review | via TextChatCommands |
| Edit Pipeline | — | executeIntentWithMemory |
| Consistency Controller | site_review, quality_gate | internal scoring only |

**Validation Chain**:
- State/DOM changed
- Image matches memory
- Holistic improvement (companion text success)
- Site consistency (hero + image + mood alignment)
- Quality score ≥0.52 or retry

---

## 2. Current Create Pipeline (Legacy)

### Flow Diagram
```
User Input (wizard or manual form)
    ↓
onboardingDescription → buildCtaPlan() + resolveBusinessPlan()
    ↓
Site Composition Engine (archetype-based identity)
    ├─ designFingerprint() → deterministic seed
    ├─ sectionOrder → from plan or user choice
    ├─ cardIntents → primary/secondary CTA mapping
    └─ layout configurations
    ↓
Create Build Plan
    ├─ PRIMARY_CTA
    ├─ SECONDARY_CTA
    ├─ sectionOrder[]
    ├─ cardIntents[]
    └─ buildPlanMetadata
    ↓
AISiteBuilder.runMagicGeneration()
    │
    ├─ fillSection("hero") → TIE.generate() hero copy
    ├─ applyHeroStockImage() → IIE.selectBest("hero")
    ├─ fillSection("about") → TIE.generate() about copy
    ├─ applyAboutStockImage() → IIE.selectBest("about")
    ├─ fillSection("services") → TIE.generate() service copy
    ├─ [other sections as in sectionOrder]
    │
    └─ designFamily + colorSet selection → Material System
    ↓
Design Memory Engine (auto-records approved elements)
    ↓
Document mutation (page.sections, page.fields)
    ↓
Edit Session state update
    ↓
On-screen preview (legacy HTML rendering)
```

### Key Legacy Components

**Site Composition Engine**:
- Determines structure from `buildPlan`
- Maps archetype → design family + theme
- Archetypes: `trade-technical`, `spiritual-boutique`, `shop-boutique`, `hospitality-warm`, etc.
- Outputs: `designFamily`, `template`, `theme`, `heroLayout`, `navPattern`, `servicesLayout`, etc.

**Design Families** (`design-families.js`):
- Pre-defined color palettes + typography + layout rules
- Families: `fotograf`, `cafe`, `salon`, `modern`
- Applied to document via Material System

**Material System** (`material-system.js`):
- Applies design tokens (colors, fonts, spacing) to document
- Selects stock images (IIE + catalog)
- Applies CSS classes and component structure

**Generate Build Plan** (`create-build-plan.js`):
- Input: `onboardingDescription`, `area`, `industry`, `createSiteGoal`, `createSections`
- Output: `{ goal, primaryCta, secondaryCta, sectionOrder, cardIntents, metadata }`

**Legacy Create Bridge** (`create-flow-bridge.js`):
- Maps Create UI selections → Document context
- Resolves plan from AI site builder
- Builds composition snapshot

**Legacy Issues Being Replaced**:
- ❌ Multiple parallel creative sources (archetype + design family + build plan + component pick)
- ❌ Implicit identity inference (no locked creative direction)
- ❌ Self-review/suitability as creative patch (post-generation scoring)
- ❌ Hero text can come from multiple places (TIE vs template vs fallback)
- ❌ No single creative authority

---

## 3. Rendering Pipeline

### Current Rendering (Legacy + Early Blueprint Support)

The system has **two parallel rendering paths**:

#### 3.1 Legacy Rendering (page.sections)

Traditional section-based rendering:
- Document structure: `page.sections[]` where each section is a type (`hero`, `about`, `gallery`, etc.)
- Each section has: `type`, `fields` (title, subtitle, image, body, cta, etc.)
- Rendering: Direct to HTML via `SectionRenderer` or manual component templates
- Used when: `page.createPath !== "blueprint"` or legacy editing

#### 3.2 Blueprint Rendering (page.siteBlueprint)

New tree-based rendering:
```javascript
// Structure
page.siteBlueprint = {
  blueprintVersion: "1.0",
  conceptRef: { conceptVersion: "1.0", lockedAt: "ISO" },
  meta: { businessName, ... },
  root: {
    children: [
      {
        type: "hero",
        variant: "immersive-fullbleed",
        content: {
          title: "...",
          lead: "...",
          cta: { label: "...", link: "..." }
        },
        design: {
          tokens: {
            "color.bg": "#f8f4ef",
            "color.text": "#333",
            ...
          }
        }
      },
      {
        type: "about",
        variant: "two-column",
        content: { ... },
        design: { ... }
      },
      // ... more children, footer last
    ]
  },
  componentDefinitions: {
    // embedded component schemas (optional)
  }
}
```

**BlueprintRenderer** (`blueprint-renderer.js`):
- Entry: `BlueprintRenderer.mount(doc, mainEl, footerEl)`
- Checks: `page.createPath === "blueprint"`
- Reads: `page.siteBlueprint` from document
- Process:
  1. Apply global tokens to container
  2. Iterate `root.children[]`
  3. Delegate to `ComponentRegistry.renderNode(node, ctx, embedded)`
  4. Collect HTML parts (all except footer)
  5. Collect footer HTML last
  6. Return: `{ ok, html, footerHtml }` or error

**ComponentRegistry** (`component-registry.js`):
- Open registry of typed component renderers
- Each component type (hero, about, services, etc.) has:
  - `renderNode(node, ctx, embedded)` → `{ ok, html }` or `{ ok: false, error }`
  - Access to `node.content`, `node.design.tokens`, `node.variant`
- Registry is extensible — no hardcoded list

**Key Principle**: BlueprintRenderer reads _only_ the blueprint, never the legacy sections.

### Rendering Decision Tree

```
page.createPath === "blueprint"
    ├─ YES → BlueprintRenderer.mount()
    │        └─ Reads page.siteBlueprint
    │           └─ Delegates to ComponentRegistry
    └─ NO  → Legacy SectionRenderer
             └─ Reads page.sections[]
```

---

## 4. Blueprint Architecture

The Blueprint system replaces the legacy pipeline with a **three-layer abstraction**:

### 4.1 Layer 1: Creative Concept (Idea)

**Purpose**: Creative direction **before** any blueprint or component.

**Authority**: Creative Director only — produces and locks this.

**Schema** (overview):
```javascript
{
  conceptVersion: "1.0",
  meta: {
    businessName: "Lilla Bo",
    location: "",
    industry: "inredning",
    siteType: "foretag"
  },
  narrative: {
    story: "En liten butik där varje detalj är vald för hemmet.",
    singleMessage: "Handplockat för hemmet — inte massmarket.",
    conversionJourney: "Känn igen stilen → se utbud → besök/kontakta"
  },
  audience: {
    primary: "Människor som söker personliga presenter",
    needs: ["Inspiration", "Kvalitet", "Närhet"],
    relationship: "du"  // du/ni
  },
  feeling: {
    emotionalArrival: "Värme och nyfikenhet",
    forbiddenFeeling: "Katalog, e-handelsmall",
    territory: "Personligt, kuraterat, taktilt"
  },
  informationHierarchy: {
    phases: [
      { id: "arrival", purpose: "Skapa igenkänning", priority: 1 },
      { id: "proof", purpose: "Visa erbjudande", priority: 2 },
      { id: "action", purpose: "Nästa steg", priority: 3 }
    ],
    dominantMoment: "arrival"
  },
  componentStrategy: {
    choices: [
      {
        component: "hero",
        variant: "immersive-fullbleed",
        servesPhase: "arrival",
        why: "Present/inredning säljs genom stämning"
      },
      {
        component: "card-grid",
        variant: "three-up",
        servesPhase: "proof",
        why: "Tre tydliga erbjudanden utan att bli generisk"
      }
    ],
    rejected: [
      {
        component: "pricing-matrix",
        why: "Ingen prislista — sortiment, inte paketjämförelse"
      }
    ]
  },
  designIntent: {
    photographicDirection: "Interiör, detaljer, presenter i miljö",
    tokenRationale: "Varma jordtoner och mjuk typografi",
    forbiddenImagery: ["Kläder", "Mode", "Stock-team"]
  }
}
```

**Validation**:
- `componentStrategy.choices[]` is **mandatory** (at least one)
- Each choice must have `component`, `why`, and ideally `variant` + `servesPhase`
- `rejected[]` is optional but useful for clarity

**Renderer Never Reads This**: Only Creative Director produces it.

### 4.2 Layer 2: Site Blueprint (Technical Spec)

**Purpose**: Exact technical description of what gets built — deterministic from Concept.

**Authority**: Site Blueprint Builder (deterministic, not creative) — reads locked Concept, produces locked Blueprint.

**Contract**: Each blueprint node must have a corresponding choice in Concept with matching `component`, `variant`, `servesPhase`.

**Schema** (detailed):
```javascript
{
  blueprintVersion: "1.0",
  conceptRef: {
    conceptVersion: "1.0",
    lockedAt: "2026-08-14T14:23:45Z"
  },
  meta: {
    businessName: "Lilla Bo",
    location: "",
    industry: "inredning",
    siteType: "foretag"
  },
  root: {
    children: [
      {
        id: "hero-section",
        type: "hero",
        variant: "immersive-fullbleed",
        order: 1,
        content: {
          title: "Handplockat för hemmet",
          lead: "Varje detalj är vald för att din hemmet ska kännas levande.",
          image: {
            url: "https://…stock-image-id-xyz…",
            alt: "Mysig hemvistelse"
          },
          cta: {
            label: "Utforska vårt sortiment",
            link: "/services"
          }
        },
        design: {
          tokens: {
            "color.bg": "#f8f4ef",
            "color.text": "#3d3d3d",
            "color.accent": "#d4a574",
            "typography.title.family": "Georgia",
            "typography.title.size": "48px",
            "spacing.horizontal": "2rem"
          }
        }
      },
      {
        id: "about-section",
        type: "about",
        variant: "two-column",
        order: 2,
        content: {
          title: "Om Lilla Bo",
          body: "Vi är en liten butik…",
          image: {
            url: "https://…",
            alt: "Butiken utifrån"
          }
        },
        design: { tokens: { ... } }
      },
      {
        id: "card-grid-section",
        type: "card-grid",
        variant: "three-up",
        order: 3,
        content: {
          cards: [
            {
              title: "Presenter",
              body: "Personliga gåvor…",
              icon: "gift"
            },
            { ... },
            { ... }
          ]
        },
        design: { tokens: { ... } }
      },
      {
        id: "contact-section",
        type: "contact-block",
        variant: "simple",
        order: 4,
        content: {
          title: "Hitta hit",
          address: "…",
          phone: "…",
          hours: "…",
          cta: { label: "Kontakta oss", link: "/contact" }
        },
        design: { tokens: { ... } }
      },
      {
        id: "footer",
        type: "footer",
        order: 5,
        content: {
          brandLine: "Lilla Bo — handplockat för hemmet",
          links: [ ... ]
        },
        design: { tokens: { ... } }
      }
    ]
  },
  componentDefinitions: {
    // Optional: embed schema overrides for components
  }
}
```

**Key Rules**:
- Every node has `type`, `variant`, `content`, `design.tokens`
- `content` contains only data — never HTML or component logic
- `design.tokens` contains only design decisions (colors, fonts, spacing)
- No legacy fields like `page.template`, `page.artDirectorBrief`, `designArchetype`
- Footer is always last child

**Composition Input Contract** (what CD-path composition reads):
```javascript
// Input to CD-path composition:
{
  conceptRef: {…},
  meta: {…},
  componentStrategy: {
    choices: [
      { component, variant, servesPhase, why },
      ...
    ]
  },
  informationHierarchy: {…},
  narrative: {…}
}

// Output from composition:
{
  root: {
    children: [
      { type, variant, order, content: {...}, design: {...} },
      ...
    ]
  }
}
```

### 4.3 Layer 3: Renderer (Display)

**Purpose**: Faithful, deterministic rendering of blueprint to HTML.

**Authority**: Component Registry only — never makes creative decisions.

**Principle**: Same blueprint = same HTML every time.

**Flow**:
```
Blueprint
  ↓
BlueprintRenderer.mount()
  ├─ getBlueprint(doc) → find root
  ├─ applyTokens(globalTokens)
  ├─ renderTree(blueprint, ctx)
  │    └─ root.children.forEach(node)
  │        └─ ComponentRegistry.renderNode(node, ctx, componentDefs)
  │           ├─ Read node.type → component type
  │           ├─ Read node.variant → specific variant
  │           ├─ Read node.content → data to insert
  │           ├─ Read node.design.tokens → CSS vars
  │           └─ Return { ok: true, html: "..." }
  └─ Collect HTML parts + footer
```

**ComponentRegistry Structure**:
```javascript
ComponentRegistry = {
  renderNode(node, ctx, embedded) {
    const renderer = this.getRenderer(node.type);
    if (!renderer) return { ok: false, error: "unknown_type" };
    return renderer(node, ctx, embedded);
  },

  getRenderer(type) {
    // Returns the handler for hero, about, services, etc.
    // Extensible — new types can be added without core changes
  }
}
```

---

## 5. Create Pipeline Transformation: Legacy → Blueprint

### Phase 0: Feature Gate & Path Isolation

**Goal**: Two isolated create-paths.

**Implementation**:
- `gate = "blueprint"` → CD-path (blueprint create)
- `gate = off` or missing → legacy-path (unchanged)
- Gate stored in Create context and sessionStorage
- Gate parameter: `?blueprintCreate=1` or UI toggle

**State Rules**:
| State | Set by | Requirement |
|-------|--------|------------|
| `briefLocked: true` | Creative Director | Mandatory before composition |
| `compositionLocked: true` | Composition | Only after `briefLocked` |
| CD-path abort | Orchestration | On `briefLocked: false` — no fallback |

**Hard Fails on CD-path**:
- `compositionLocked && !briefLocked`
- Composition started without `briefLocked`
- Executor outside allowlist running on CD-path

### Phase 1: Brief Artifact & Contract

**Goal**: Structured brief object, lock rules, Composition Input Contract, forbidden sources enforcement.

**Brief Contract** (minimal):
```javascript
{
  conceptVersion: "1.0",
  meta: { businessName, industry, siteType },
  narrative: { story, singleMessage, conversionJourney },
  audience: { primary, needs, relationship },
  feeling: { emotionalArrival, forbiddenFeeling, territory },
  informationHierarchy: { phases: [...], dominantMoment },
  componentStrategy: { choices: [...], rejected: [...] }
}
```

**Forbidden Creative Sources on CD-path**:
- ❌ `onboardingDescription` / `createBusinessBrief` (as creative input)
- ❌ `page.artDirectorBrief` / composition art director
- ❌ `SiteCompositionEngine.toGenerationBrief()`
- ❌ `designArchetype` / archetype lexicon
- ❌ `resolveBusinessPlan()` CTA/journey sources
- ❌ `page.siteComposition` / design archetype
- ❌ Build Plan `toGenerationText()` composition preview

**Allowed Sources on CD-path**:
- ✅ `page.creativeBrief` (with `briefLocked: true`)
- ✅ Create-input (wizard answers)
- ✅ `canonicalIndustry`
- ✅ Scope fields (sections, goals)

### Phase 2: Canonical Industry Observation

**Goal**: Single industry value set before CD, no parallel inference.

**Implementation**:
- `canonicalIndustry` set once in create context (from wizard or AI inference)
- CD-path: composition/executors read _only_ this
- Legacy-path: unchanged

### Phase 3: Creative Director v1

**Goal**: CD produces locked `creativeBrief` from create-input + canonical + scope.

**CD Input**:
- Create-input (wizard: businessName, siteType, area)
- Canonical industry
- Scope (sections selected, goals)

**CD Process**:
- Select identity profile (e.g., "warm-craft" for carpenter)
- Infer narrative + audience + feeling from profile + input
- Validate component strategy against selected sections
- Lock brief

**CD Output**:
- `page.creativeBrief` (full contract)
- `briefLocked: true`

**Abort Condition**: If creative stoppage rule fails, `briefLocked: false`, CD-path exits.

### Phase 4: CD Before Composition

**Goal**: Enforce order: input → CD → `briefLocked` → composition.

**Implementation**:
- Create orchestration: call CD first
- Only after CD success: proceed to composition
- Build Plan does NOT generate SCE preview text on CD-path

### Phase 4b: Executor Allowlist (CD-path)

**Goal**: CD-path runs only allowlisted steps; others are skipped or hard-disabled.

**Allowlist by Phase**:

| Phase | Allowed | Forbidden (until Phase 7) |
|-------|---------|---------------------------|
| After 4b | CD, state init, render | — |
| After Phase 5 | + composition | ❌ fillFullSite, fillCompositionBlocks, design family pick, image chain |
| After Phase 6 | + hero executor | ❌ Text regen beyond hero, services/faq fill, post-gen art director score |
| Phase 7+ | + design/image (read-only from brief) | — |

**Hard-Disabled on CD-path** (until explicit expansion):
- ❌ Design families (creative pick)
- ❌ `fillFullSite` (legacy multi-target)
- ❌ `fillCompositionBlocks`
- ❌ Image chain
- ❌ Post-generation art director score
- ❌ Generation integrity **repair** (fail-only til 7)

### Phase 5: Composition as Executor

**Goal**: Composition engine maps brief deterministically → structure.

**Process**:
1. Read `componentStrategy.choices` → determine root.children order
2. Read `informationHierarchy.phases` → map sections to phases
3. Read `narrative` + `feeling` → fill section intents
4. Set `compositionLocked: true`

**Determinism**: Same brief → same structure always.

**CD-path Changes**:
- ❌ Archetype-based identity inference
- ❌ Story template-val
- ❌ Auto-block as default
- ✅ Deterministical mapping brief → `root.children[]`

### Phase 6: Hero as Executor

**Goal**: Hero title + lead **only** from locked brief.

**Hero Executor Process**:
1. Read `creativeBrief.narrative.story` → headline
2. Read `creativeBrief.feeling.emotionalArrival` → lead
3. Write to blueprint node
4. Generate once; no fallback, no parallel text sources

**CD-path Rules**:
- No `pack()` fallback
- No parallel `personalizeHeroFromBrief` + TIE competition
- No `heroCtaSnap` pattern
- Tom hero → hard fail (not placeholder)

### Phase 7: End-to-End & Regression

**Goal**: First working CD-create; allowlist expands to design/image.

**Expansion**:
- Design/image picking: **read-only from `creativeBrief`**, no branch inference
- Composition: verify brief constraints against blueprint
- No manual design family pick on CD-path

**Verification**:
- Kalle → different brief, structure, hero than Olle
- Gate off → regression unchanged
- One creative source: `creativeBrief`
- One branch source: `canonicalIndustry`

---

## 6. Integration Points

### 6.1 Script Load Order

```html
<!-- Core infrastructure -->
<script src="js/registry.js"></script>
<script src="js/component-registry.js"></script>

<!-- Document -->
<script src="js/app-document.js"></script>

<!-- Design & Memory -->
<script src="js/material-system.js"></script>
<script src="js/design-memory-engine.js"></script>

<!-- Image & Text Intelligence -->
<script src="js/image-intelligence-engine.js"></script>
<script src="js/text-intelligence-engine.js"></script>

<!-- Session & Intent -->
<script src="js/edit-session.js"></script>
<script src="js/intent-resolution-engine.js"></script>

<!-- Orchestration -->
<script src="js/ai-design-orchestrator.js"></script>

<!-- Command Pipeline -->
<script src="js/edit-command-pipeline.js"></script>

<!-- Create Path (Blueprint)-->
<script src="js/create-cd-gate.js"></script>
<script src="js/creative-concept-contract.js"></script>
<script src="js/creative-concept-composer.js"></script>
<script src="js/creative-director.js"></script>
<script src="js/site-blueprint-contract.js"></script>
<script src="js/site-blueprint-builder.js"></script>
<script src="js/blueprint-document-bridge.js"></script>
<script src="js/blueprint-renderer.js"></script>

<!-- Executors -->
<script src="js/cd-hero-executor.js"></script>
<script src="js/cd-about-executor.js"></script>
<!-- ... other executors ... -->

<!-- Rendering -->
<script src="js/render.js"></script>

<!-- Final bootstrap -->
<script src="js/site-bootstrap.js"></script>
```

### 6.2 Key File Map

| File | Purpose | Key Export |
|------|---------|------------|
| `creative-director.js` | Produces locked brief | `CreativeDirector.compose(input, hooks)` |
| `site-blueprint-builder.js` | Maps brief → blueprint | `SiteBlueprintBuilder.build(brief)` |
| `blueprint-renderer.js` | Renders blueprint to HTML | `BlueprintRenderer.mount(doc, el, footer)` |
| `blueprint-document-bridge.js` | Stores brief+blueprint on doc | `BlueprintDocumentBridge.store(doc, concept, blueprint)` |
| `cd-*-executor.js` | Fills specific sections | `CdHeroExecutor.execute(blueprint, ctx)` |
| `create-cd-gate.js` | Routes to CD-path or legacy | `CreateCdGate.isBlueprintEnabled()` |
| `creative-concept-contract.js` | Validates concept | `CreativeConceptContract.validate(concept)` |
| `site-blueprint-contract.js` | Validates blueprint | `SiteBlueprintContract.validate(blueprint)` |

---

## 7. Key Principles

### 7.1 Single Creative Authority

- **Creative Director** owns the creative decision.
- No competing identity sources (archetype, design family, build plan inference).
- One brief, one locked state, deterministic downstream.

### 7.2 Separation of Concerns

| Layer | Responsibility | Authority |
|-------|-----------------|-----------|
| Concept | Creative direction | CD only |
| Blueprint | Technical structure | Blueprint Builder (deterministic) |
| Renderer | Display | Component Registry (deterministic) |
| Memory | Consistency validation | Design Memory (enforcement) |

### 7.3 Determinism Guarantees

- Same concept → same blueprint always
- Same blueprint → same HTML always
- No post-generation creative scoring or patches

### 7.4 Design Memory Wins

When Image Intelligence or Text Intelligence conflict with Design Memory:
- Design Memory validation overrides
- Candidate rejected, retry attempt (up to 7 attempts total)
- If no candidate passes, fail explicitly (not fallback)

### 7.5 Locked Gates

- `briefLocked: true` before composition starts
- `compositionLocked: true` before executors run
- Cannot proceed without explicit lock state
- Abort on lock failure, never silent fallback

---

## 8. System State Diagram

```
Create UI (wizard)
    │
    ▼
┌─────────────────────────┐
│ CREATE CONTEXT          │
│ ├─ businessName        │
│ ├─ industry            │
│ ├─ siteGoal            │
│ ├─ createSections      │
│ ├─ area                │
│ └─ gate: "blueprint"   │
└──────────┬──────────────┘
           │
           ▼
    [Gate Check]
    gate === "blueprint" ?
    /          \
   YES          NO
   │            │
   ▼            ▼
[CD-PATH]   [LEGACY-PATH]
   │            │
   ├─▶ Creative Director    ├─▶ (existing pipeline)
   │   ├─ creative concept  │   ├─ archetype selection
   │   ├─ briefLocked=true  │   ├─ material system
   │   └─ creative brief    │   ├─ TIE/IIE
   │                        │   └─ legacy sections
   ├─▶ Site Blueprint       │
   │   └─ root.children[]   │
   │                        │
   ├─▶ CD Executors         │
   │   └─ fill from brief   │
   │                        │
   └─▶ Blueprint Renderer   │
       └─ deterministic HTML│
           │                │
           └────┬───────────┘
                ▼
           [DOCUMENT]
           ├─ page.siteBlueprint OR
           ├─ page.sections
           └─ doc.meta.designMemory
                │
                ▼
           [ON-SCREEN RENDER]
```

---

## 9. Validation & Quality Gates

### 9.1 System Validation Engine

**Module**: `js/system-validation-engine.js`

**Gate**: ≥95% scenario success before product ready.

**Scenarios**:
- 128 flat user utterances (library)
- 3 full workflow scenarios
- Engine audit (all modules loaded)

**Reports**:
- `validation-report.json` (machine)
- `validation-report.txt` (human)

**Running**:
- Browser: `http://localhost:3847/validation.html?run=1`
- CLI: `node scripts/run-validation.mjs`
- Shortcut: `3-VALIDERA-EASILY.bat`

### 9.2 Contract Validation

**Creative Concept**:
- `conceptVersion: "1.0"`
- All required fields present
- `componentStrategy.choices` has at least one entry
- Each choice has `component` and `why`

**Site Blueprint**:
- `blueprintVersion: "1.0"`
- `conceptRef` matches source concept
- `root.children[]` all have `type`, `content`, `design.tokens`
- Every blueprint node corresponds to concept choice

**Composition Input**:
- `briefLocked: true`
- No forbidden sources used
- `canonicalIndustry` set exactly once

### 9.3 Quality Scores

| System | Min Pass |
|--------|----------|
| Design Memory validation | 0.72 |
| Image Intelligence overall | 0.58 |
| Text Intelligence overall | 0.56 |
| Orchestrator quality gate | 0.52 |

---

## Summary

**Easily** is built on intelligent separation of concerns:

1. **User** speaks naturally
2. **Intent Resolution** understands what to edit
3. **Design Memory** validates against approved language
4. **Intelligence Engines** select images and generate text
5. **Orchestrator** coordinates all engines before mutation
6. **Edit Pipeline** applies changes with full traceability
7. **New (Blueprint Path)**:
   - **Creative Director** locks creative intent
   - **Site Blueprint Builder** maps to technical structure
   - **CD Executors** fill content deterministically
   - **Blueprint Renderer** displays without creative decisions

The **Legacy Path** remains fully functional (gate off). The **Blueprint Path** (gate on) enforces strict creative authority and determinism, gradually expanding from hero/about to full site generation as each phase completes validation.

