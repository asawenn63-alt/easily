# Design Memory Engine

Permanent design language for each website. Stored in **`doc.meta.designMemory`** via SiteState — survives chat close, reload, and project save.

**Module:** `js/design-memory-engine.js`  
**Not the source of truth:** chat history, EditSession alone, or conversation pipeline.

---

## Architecture

```
User message
    │
    ▼
Intent Resolution Engine
    │
    ▼
Design Memory Engine.consultBeforeExecute()
    │  (enrich commands, attach constraints)
    ▼
Edit Session (beginEdit / verify / keep)
    │
    ▼
Execution (MaterialSystem, DesignPanel, TextChat…)
    │  pickConsistentImageUrl() validates proposals
    ▼
handleKeep → DesignMemory.recordAcceptance()
    │
    ▼
persist → doc.meta.designMemory → SiteState.save()
```

---

## Data model

```javascript
doc.meta.designMemory = {
  version: 1,
  updatedAt: "ISO-8601",
  global: {
    photographyStyle: { value, status: "approved", at, source },
    lighting:         { value, status: "approved", at, source },
    visualMood:       { value, status: "approved", at, source },
    colorPalette:     { … },
    typographyTone:   { … },
    galleryStyle:     { … },
    buttonStyle:      { … },
    // extensible — any key
  },
  sections: {
    hero: {
      image: { url, imageStyle, photographyStyle, lighting, composition, mood, colorTemperature, … },
      text:  { tone, sample, … },
      cta:   { label, … },
    },
    about: { image: {…}, text: {…} },
    gallery: { image: {…} },
    services: { image: {…} },
  },
  tokens: {
    colors: { designColorSetId, familyId, label, family, visualMood, … },
    logo:   { url, … },
    // typography, spacing, layout — add without schema change
  },
}
```

Every property uses the same **approved entry** shape:

| Field | Meaning |
|-------|---------|
| `value` | Approved value |
| `status` | Always `"approved"` when written |
| `at` | ISO timestamp |
| `source` | e.g. `"accept:hero:image"`, `"migrate:document"` |

---

## Update flow (write)

1. User approves edit → **"Den här är bra"** / `__keep__`
2. `EditSession.handleKeep()` locks component + captures document snapshot
3. `DesignMemoryEngine.recordAcceptance(context, snapshot)`
4. Traits extracted per target (image, color, text, logo, CTA)
5. Global memory updated (photography style, lighting, mood propagate)
6. `persist()` → `SiteState.patch` → autosave / API sync

### Example after hero approval

| Scope | Property | Value |
|-------|----------|-------|
| `sections.hero.image` | imageStyle | Warm Scandinavian |
| `sections.hero.image` | lighting | Soft warm daylight |
| `sections.hero.image` | composition | Wide hero |
| `sections.hero.image` | mood | Friendly |
| `global` | photographyStyle | (same) |
| `global` | lighting | (same) |

---

## Read flow

Before execution:

```javascript
DesignMemoryEngine.consultBeforeExecute(action, text, hooks)
```

Returns enriched command text with memory hints (lighting, mood, palette) for image intents.

During image pick:

```javascript
DesignMemoryEngine.getConstraints("about:image")
// → { global, section, tokens, pickHints[] }
```

`MaterialSystem.suggestStockImageUrl` → `pickConsistentImageUrl` → uses hints in `userText` for stock picker.

---

## Validation flow (consistency engine)

Every image candidate:

1. `buildProposalFromUrl(url, kind, opts)`
2. `scoreProposal(proposal, targetKey)` → dimension scores + overall
3. If `overall < 0.72` → reject internally, try next candidate (up to 7 attempts)
4. Log `[Easily · design-memory] PICK_REJECT` — **never shown to user**

### Dimensions (internal)

| Dimension | Weight | Source |
|-----------|--------|--------|
| photographyStyle | 0.28 | global + section |
| lighting | 0.22 | global |
| mood | 0.18 | global + section |
| colors | 0.18 | tokens.colors |
| typography | 0.10 | global |
| composition | 0.04 | section |

Example internal log:

```
overall: 0.97
dimensions: { colors: 0.98, photographyStyle: 0.96, typography: 1.0, … }
```

---

## Integration points

| File | Integration |
|------|-------------|
| `design-memory-engine.js` | Core module |
| `edit-session.js` | `handleKeep` → `recordAcceptance` |
| `edit-command-pipeline.js` | `executeIntentWithMemory` after IRE |
| `material-system.js` | `pickStockImageCandidate`, `pickConsistentImageUrl` in suggest paths |
| `welcome-flow.js` | `ensureMigrated()` on site resume |
| `studio.html` | Script order: edit-session → **design-memory** → IRE → pipeline |

Script order:

```
edit-session.js
design-memory-engine.js
intent-resolution-engine.js
edit-command-pipeline.js
```

---

## Migration

On site resume (`resumeLoadedSite`):

```javascript
DesignMemoryEngine.ensureMigrated()
```

1. If memory empty → infer from current document (hero URL, colors, logo, about/gallery images)
2. Merge `EditSession.acceptedLocks` into memory

Existing sites gain design memory without re-approval.

---

## Extensibility

Add new design properties without architecture changes:

```javascript
// On accept — any facet
ensurePath(memory, "hero", "spacing").padding = approved("generous", "accept:hero:spacing");

// Global
setGlobal(memory, "iconStyle", "Line icons", "accept:icons");
```

Consistency engine: add dimension in `scoreProposal` with weight in `weights` object.

---

## API

| Method | Purpose |
|--------|---------|
| `getMemory()` | Load from SiteState |
| `recordAcceptance(ctx, docSnapshot)` | Write on approve |
| `getConstraints(targetKey)` | Read hints for target |
| `scoreProposal(proposal, targetKey)` | Internal consistency |
| `validateProposal(proposal, targetKey)` | Accept/reject candidate |
| `pickConsistentImageUrl(kind, opts)` | Pick with retry |
| `consultBeforeExecute(action, text, hooks)` | Pre-execution consult |
| `migrateFromDocument(doc)` | Bootstrap from site |
| `ensureMigrated()` | Resume hook |

---

## Testing

1. Hard refresh `Ctrl+Shift+R` (cache `20260803g`)
2. Approve hero image → DevTools filter `[Easily · design-memory] RECORD`
3. Inspect `SiteState.get().meta.designMemory`
4. Request about image → logs `CONSULT` with pickHints; `PICK` with score ≥ 0.72
5. Reload page → memory persists; `ensureMigrated` does not wipe existing memory
