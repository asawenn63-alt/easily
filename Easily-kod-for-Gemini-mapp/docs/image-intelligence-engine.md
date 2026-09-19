# Image Intelligence Engine

Professional image selection for Easily. Every stock image pick flows through the Image Intelligence Engine (IIE) — never a naive keyword search or “first match”.

**Module:** `js/image-intelligence-engine.js`  
**Entry point:** `ImageIntelligenceEngine.selectBest(kind, opts)`  
**Wired in:** `MaterialSystem.suggestStockImageUrl`, `suggestHeroStockUrl`, `suggestStockImageUrls`, and `ImageSelectionEngine.applyToDocument`

---

## Architecture

```
User message / onboarding / edit command
    │
    ▼
Intent Resolution Engine          (target: hero.image, about.image…)
    │
    ▼
Design Memory Engine              (pickHints, validateProposal, hero inheritance)
    │
    ▼
Edit Session                      (locks, accepted components)
    │
    ▼
MaterialSystem / ISE.applyToDocument
    │
    ▼
ImageIntelligenceEngine.selectBest()
    │
    ├─ buildSelectionContext()    business, section, design memory, style words
    ├─ gatherCandidates()         catalog pool + generated pool (never first match)
    ├─ scoreCandidate()           14 weighted dimensions per candidate
    ├─ filter weak                overall < MIN_QUALITY (0.58) rejected
    ├─ pickDiverse()              top 12, avoid served/rejected IDs
    └─ recordServed / recordRejected
            │
            ▼
        best URL (scores never shown to user)
```

---

## Candidate pipeline

1. **Catalog pool** — up to 48 entries from `ImageCatalog`, pre-ranked by `ImageSelectionEngine.scoreEntry`.
2. **Generated pool** — up to 16 URLs from `MaterialSystem.pickStockImageCandidate` (raw ISE/VisualStock, no IIE loop).
3. **Dedupe** by normalized URL.
4. **Reject filter** — URLs in `doc.meta.imageIntelligence.rejected[section]` are excluded.
5. **Score every remaining candidate** — no early exit on first acceptable match.
6. **Quality gate** — candidates below `MIN_QUALITY` (0.58) are dropped internally.
7. **Diversity pick** — highest score among top 12 that differs from recently served photo IDs.

---

## Scoring dimensions

| Dimension | Role |
|-----------|------|
| `businessRelevance` | Industry, services, onboarding text (ISE base score) |
| `composition` | Clean layout, focal point, section rules |
| `lighting` | Style lexicon + Design Memory + entry moods |
| `photographyQuality` | Catalog quality rating + style minimums |
| `colorHarmony` | Approved palette / visual mood tokens |
| `brandConsistency` | Colors + business fit |
| `designMemoryCompatibility` | `DesignMemoryEngine.validateProposal()` |
| `sectionSuitability` | Hero / About / Gallery / Services rules |
| `textOverlaySuitability` | Headline space (hero), no burned-in text |
| `humanQuality` | People presence when About needs trust |
| `modernAppearance` | Style words + contemporary tags |
| `authenticity` | Real projects, candid, natural |
| `visualFocus` | Strong focal point for hero and cards |

Section-specific weight boosts are defined in `SECTION_RULES`.

---

## Section rules

| Section | Priorities |
|---------|------------|
| **Hero** | Landscape, headline space, strong focal point, professional first impression, text overlay |
| **About** | Trust, people, authentic, natural lighting |
| **Gallery** | Completed work, variation, real projects |
| **Services (card)** | Illustrates service, simple composition, clean background (CTA-friendly) |

---

## Style translation

Natural-language style words map to measurable requirements in `STYLE_LEXICON`:

| Word | Effect |
|------|--------|
| Premium / Luxury | Higher min quality, lux moods, avoid casual/snapshot |
| Nordic / Scandinavian | Soft daylight, cool-neutral, minimal tags |
| Minimal | Clean composition, avoid busy/cluttered |
| Warm | Soft warm light, cozy tags |
| Modern | Contemporary boost, avoid dated |
| Rustic | Wood, craft, authenticity boost |
| Industrial | Concrete, metal, professional mood |
| Elegant | Refined tags, quality floor |
| Playful | Bright, colorful, friendly |

User refinements (`modernare`, `premium`, `mörkare`, `ljusare`, `yngre`) adjust the same structure at runtime.

---

## Design Memory integration

- **Read:** `getConstraints(targetKey).pickHints` merged into enriched user text.
- **Score:** `validateProposal()` contributes `designMemoryCompatibility`.
- **Inherit:** When hero image is approved, About/Gallery/Services inherit hero lighting, mood, photography style, and color temperature unless the user explicitly overrides via new style words.

---

## Diversity & “Another”

State persisted in `doc.meta.imageIntelligence`:

```javascript
{
  version: 1,
  rejected: { hero: [...], about: [...], gallery: [...], card: [...] },
  served:   { hero: [...], about: [...], gallery: [...], card: [...] }
}
```

- **Variant requests** (`igen`, `annan`, `another`, `modernare`, `premium`…) mark the current section URL as rejected before picking.
- **Served history** drives diversity among top-scoring candidates.
- Seven consecutive “another” requests should yield seven different photo IDs when the catalog allows.

Scores and rejection reasons are logged only as `[Easily · image-intel]` — never shown in chat.

---

## Integration map

| Caller | Path |
|--------|------|
| `MaterialSystem.suggestStockImageUrl` | → `IIE.selectBest` |
| `MaterialSystem.suggestStockImageUrls` | → `IIE.selectMany` |
| `MaterialSystem.suggestHeroStockUrl` | → `IIE.selectBest("hero")` |
| `MaterialSystem.applyHeroStockImage` | passes `userText` + `variant: "another"` on retry phrases |
| `ImageSelectionEngine.applyToDocument` | delegates to `IIE.applyToDocument` |
| `VisualStock.applyToDocument` | unchanged entry → ISE → IIE |

**Raw generator (no IIE):** `MaterialSystem.pickStockImageCandidate` — used only inside IIE candidate pool to avoid circular calls.

---

## Public API

| Method | Purpose |
|--------|---------|
| `selectBest(kind, opts)` | Single best URL for `hero` \| `about` \| `gallery` \| `card` |
| `selectMany(kind, count, opts)` | Diverse batch (gallery, service cards) |
| `applyToDocument(doc, opts)` | Fill all unlocked image slots on a document |
| `translateStyle(text)` | Style words → requirements object |
| `gatherCandidates(selCtx, opts)` | Expose pipeline for tests/debug |
| `scoreCandidate(candidate, selCtx)` | Expose scoring for tests/debug |
| `recordRejected(kind, url)` | Manual rejection (rare) |

### Options

| Option | Meaning |
|--------|---------|
| `userText` | User command or onboarding brief |
| `index` | Card/gallery slot index |
| `variant: "another"` | Force new candidate, reject current |
| `nonce` | Salt for generated pool diversity |

---

## Logging

```
[Easily · image-intel] { stage: "SELECT", kind, overall, source, dimensions, pool, rejected }
[Easily · image-intel] { stage: "FALLBACK", kind, url }
```

Internal quality scores are for engine use only.
