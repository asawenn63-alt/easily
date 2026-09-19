# Intent Resolution Engine

The Intent Resolution Engine (IRE) is the brain of the Easily editor. Every chat edit command passes through it **before** any mutation or pipeline execution.

**Module:** `js/intent-resolution-engine.js`  
**Entry point:** `IntentResolutionEngine.resolve(text, hooks)`  
**Wired in:** `EditCommandPipeline.run()` (before `executeIntent`)

---

## Architecture

```
User message
    │
    ▼
EditCommandPipeline.run()
    │
    ▼
IntentResolutionEngine.resolve(text, hooks)
    │
    ├─ gatherContext()          EditSession, pending verification, locks,
    │                           conversation, recent chat, hook signals
    │
    ├─ analyzeUtterance()       Weighted signals (reject, refine, aesthetic…)
    │
    ├─ scoreTargets()           Confidence per editable target
    │
    ├─ resolveExplicitRoutes()  High-precision paths (image, text, legacy)
    │
    ├─ resolveActionFromSignals()  Conversational short replies
    │
    └─ decide()                 execute | clarify | defer
            │
            ├─ execute ──► executeIntent(selectedAction)
            ├─ clarify ──► one short question + chips
            └─ (never rebuild / never restart flow unless explicit)
```

### Context layers (combined, never regex-only)

| Layer | Source | Used for |
|-------|--------|----------|
| Pending verification | `EditSession.pendingVerification` | “Nej”, “Visa en till” → same candidate |
| Edit focus | `EditSession.currentSection/object` | What user is working on |
| Recent history | `EditSession.eventLog` → `getRecentFocusWeights()` | Last ~8 min of edits |
| Accepted locks | `EditSession.acceptedLocks` | Awareness (future: block wrong target) |
| Pipeline conversation | `EditCommandPipeline.getConversationContext()` | Hero follow-ups |
| Chat signals | `hooks.getConversationSignals()` | Image retry context |
| Recent user lines | Chat thread DOM | Multi-turn patterns |
| Explicit mention | Utterance signals | “hero-bild”, “rubriken”, etc. |

### Scored targets

| Key | Pipeline target | Label |
|-----|-----------------|-------|
| `hero:image` | `hero.image` | hero-bilden |
| `hero:text` | `section:hero` | rubriken |
| `hero:cta` | `section:hero` | knappen |
| `about:image` | `about.image` | bilden i Om oss |
| `about:text` | `section:about` | texten i Om oss |
| `gallery:image` | `gallery.image` | galleribilden |
| `services:image` | `services.image` | tjänstebilden |
| `page:color` | `design.color` | färgerna |
| `header:logo` | `header.logo` | logotypen |

---

## Decision flow

1. **Gather context** from all layers.
2. **Analyze utterance** into weighted signals (not boolean regex).
3. **Score every target** (baseline 0.02, then boosts).
4. **Explicit routes** (image request, industry, legacy) → execute if matched.
5. **Signal routes** (nej, igen, yngre, premium…) → map to focused action.
6. **Confidence decision:**
   - **High** (≥ 0.72, gap ≥ 0.18 vs #2) → **execute**
   - **Medium** (0.40–0.71 or close gap) → **one clarification question**
   - **Low** (< 0.40) → **clarify** with hero / rubrik / färg chips
7. **Log** full decision to `[Easily · intent]`.

---

## Confidence model

Scores are **additive** and capped at 0.99.

| Boost | Amount | When |
|-------|--------|------|
| Pending verification | +0.58 | Target matches `pendingVerification.context` |
| Pipeline conversation | +0.35 | Hero pending in pipeline |
| Edit session focus | +0.22 | Fresh session focus on target |
| Recent edit history | +0.08–0.55 | Decayed over 8 minutes |
| Recent image request | +0.28 | Hook signals |
| Explicit mention | +0.86–0.92 | User named component |
| Reject/refine hint | +0.12×weight | On image targets |
| Aesthetic | +0.32 color, +0.10 image | “premium”, “varmare” |
| Pronoun “den/det” | +0.20 | Inherits current top target |

### Thresholds

```javascript
HIGH_EXECUTE = 0.72   // act immediately
MEDIUM_FLOOR = 0.40   // ask one question
MIN_GAP      = 0.18   // top vs second for auto-execute
```

### Example score snapshot

User has been editing hero image, pending verification active, says **"Nej"**:

| Target | Confidence |
|--------|------------|
| hero:image | **0.96** |
| hero:text | 0.12 |
| gallery:image | 0.03 |

→ **Execute:** `session.refine` → another hero image (never restart flow).

---

## Return shape

```javascript
{
  intent: "refine.another",           // semantic intent id
  confidence: 0.94,
  target: "hero.image",
  reason: "reject_pending",
  candidateActions: [                 // top 6 scored targets
    { key, target, label, confidence, reasons }
  ],
  selectedAction: { ... },          // pipeline-ready intent or null
  decision: "execute" | "clarify",
  clarify: { message, chips }         // only when decision === "clarify"
}
```

Every decision is logged:

```
console.info("[Easily · intent]", { stage: "DECISION", ... })
```

Pipeline also logs:

```
console.info("[Easily · pipeline]", { stage: "IRE", ... })
```

---

## Natural language → actions

| User says | Signals | Action |
|-----------|---------|--------|
| Nej | reject | Another candidate on pending target |
| Igen / Prova igen | retry | Retry same target |
| Visa en till | another | New variant |
| Gör den yngre | refine.age | `byt hero-bild — yngre` |
| Lite mörkare | refine.tone | Image refine darker |
| Mer exklusiv / premium | aesthetic | Color or image refine |
| Mer nordiskt / mer luft | aesthetic.nordic | Color theme shift |
| Mindre text | text.shorter | Regen hero/about text |
| Byt den | swap + pronoun | Swap pending/focus target |
| Lite modernare | refine.style | Contextual refine command |

Commands are built via `EditSession.commandForContext()` when available.

---

## Examples

### High confidence — execute

**Context:** Pending hero image verification.  
**Input:** `"Nej"`  
**Result:** `decision: execute`, `intent: refine.another`, hero.image retry.

### Medium confidence — clarify

**Context:** Fresh session, hero image 0.55, hero text 0.48.  
**Input:** `"Byt den"`  
**Result:** `decision: clarify`, `"Menar du hero-bilden eller rubriken?"`

### Low confidence — clarify

**Input:** `"Hmm"`  
**Result:** Chips: Hero-bild / Rubriken / Färgerna.

### Explicit — bypass scoring

**Input:** `"lägg in en bild på snickare i hero"`  
**Result:** `resolveExplicitRoutes` → `hero.image` at 0.91.

---

## Integration points

| File | Role |
|------|------|
| `intent-resolution-engine.js` | Scoring, signals, decisions |
| `edit-command-pipeline.js` | Calls IRE first in `run()` |
| `edit-session.js` | `getRecentFocusWeights()`, context, commands |
| `welcome-flow.js` | `getConversationSignals` hook |

Legacy `resolveIntent` remains as `resolveIntentLegacy` fallback if IRE is unavailable.

`EditSession.resolveSessionIntent()` is superseded by IRE for chat commands; chip tokens (`__keep__`, etc.) are handled inside IRE.

---

## Future extensibility

1. **New targets** — add row to `TARGETS`, map in `mapToPipelineIntent()`.
2. **New signals** — extend `analyzeUtterance()` with weighted kinds.
3. **ML / LLM assist** — replace or augment `scoreTargets()`; keep same return contract.
4. **Lock enforcement** — reduce score for locked targets unless explicit unlock signal.
5. **Section click** — boost score when user selected section in preview UI.
6. **Multilingual** — add signal packs per locale without changing pipeline.
7. **Telemetry** — ingest `log("DECISION")` payloads for tuning weights.

The engine is intentionally **stateless per call** except for reading EditSession / DOM — safe to test in isolation by mocking `gatherContext()`.

---

## Testing

1. Hard refresh: `Ctrl+Shift+R` (cache `20260803f`).
2. Open DevTools → filter `[Easily · intent]`.
3. Edit hero image → say **Nej** → should log `reject_pending`, execute hero retry.
4. Without context, say **Byt den** → should clarify hero vs rubrik.
5. Say **Mer exklusiv** after color focus → should lean `page:color`.
