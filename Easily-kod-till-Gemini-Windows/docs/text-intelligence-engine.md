# Text Intelligence Engine

Professional copywriting for Easily. Every generated text flows through the Text Intelligence Engine (TIE) — never a single random template pick.

**Module:** `js/text-intelligence-engine.js`  
**Entry point:** `TextIntelligenceEngine.generate(context, seedText, opts)`  
**Wired in:** `AISiteBuilder.generate`, `fillSection`, `TextChatCommands.regenerateSection`

---

## Architecture

```
User message / onboarding / section regen
    │
    ▼
Intent Resolution Engine          (text.regen, text.set)
    │
    ▼
Design Memory Engine              (typographyTone, accepted text samples, pickHints)
    │
    ▼
Edit Session                      (locks on section:text)
    │
    ▼
AISiteBuilder.fillSection / generate
    │
    ▼
TextIntelligenceEngine.generate()
    │
    ├─ buildWritingContext()      business, brand, services, personality, design memory
    ├─ translateTone()            warmer, professional, less sales, luxurious…
    ├─ gatherCandidates()         10 writing angles + brief-personalized variants
    ├─ scoreText()                11 weighted dimensions per candidate
    ├─ filter weak                overall < MIN_QUALITY (0.56) rejected
    ├─ pickDiverse()              top 8, avoid served/rejected copy
    └─ recordServed / recordRejected
            │
            ▼
        best copy (scores never shown to user)
```

---

## Writing context

The engine reads:

| Signal | Source |
|--------|--------|
| Business brief | `page.onboardingDescription`, user command |
| Brand | Footer brand, `extractBrandFromDescription` |
| Location | `page.location`, description parsing |
| Services | `parseOfferedServicesFromDescription` |
| Industry & template | `page.industry`, `page.template` |
| Personality | Inferred from brief (warm, premium, playful, professional) |
| Company size / age | Inferred from brief keywords |
| Design style | Template + Design Memory visual mood |
| Accepted tone | `doc.meta.designMemory` text buckets + typographyTone |
| Local market | Location when present |

---

## Scoring dimensions

| Dimension | Role |
|-----------|------|
| `originality` | Penalizes generic phrases (“din partner”, “unik upplevelse”, …) |
| `credibility` | Brand/services mention, concrete details, no empty hype |
| `naturalLanguage` | Word count, Swedish flow |
| `salesStrength` | Section-appropriate (hero higher, about lower) |
| `readability` | Length vs section rules |
| `seoUsefulness` | Industry keyword overlap |
| `trust` | Trust vocabulary, low hype |
| `consistencyWithAccepted` | Similarity to approved text samples |
| `brandConsistency` | Brand name, personality match |
| `localRelevance` | Location mention when relevant |
| `designMemoryCompatibility` | `DesignMemoryEngine.validateProposal()` |

---

## Section writing strategies

| Section | Strategy |
|---------|----------|
| **Hero** | Short, powerful, clear value proposition, strong CTA alignment |
| **About** | Trust, story, experience, human voice |
| **Services** | Benefits before features, simple language |
| **FAQ** | Reduce objections, clear answers |
| **Contact** | Confidence, easy to act |
| **Gallery** | Descriptive captions |
| **CTA** | Action-oriented, ≤4 words |
| **Footer** | Concise brand line |

Field-level rules in `FIELD_RULES` cover headline, subheadline, body, and CTA variants.

---

## Tone translation

| User phrase | Effect |
|-------------|--------|
| Varmare / warmer | +warmth, −formality |
| Mer professionell | +formality, −slang |
| Mindre sälj | −sales language, +trust |
| Vänligare | +warmth, conversational |
| Mer lyxig / luxurious | +premium vocabulary |
| Minimal / nordic / scandinavian | Clean, restrained sales tone |

Applied via `applyToneTransform()` on each candidate.

---

## Writing angles (diversity)

Ten distinct angles generate separate candidates:

`trust`, `benefit`, `local`, `story`, `expertise`, `outcome`, `human`, `service`, `calm`, `direct`

Each angle uses a different seed and boosts relevant score dimensions. On “skriv om” / “another version”, current section text is rejected and a new angle wins among top scorers.

State in `doc.meta.textIntelligence`:

```javascript
{
  version: 1,
  rejected: { hero: [...], about: [...], ... },
  served:   { hero: [...], about: [...], ... }
}
```

---

## Design Memory integration

- **Read:** typographyTone, visualMood, section text samples → tone preferWords
- **Score:** `validateProposal({ kind: 'text', … })` → designMemoryCompatibility
- **Inherit:** Premium Scandinavian / playful moods adjust warmth, premium, and sales weights automatically

---

## Integration map

| Caller | Path |
|--------|------|
| `AISiteBuilder.generate` | → `TIE.generate` |
| `AISiteBuilder.fillSection(target, opts)` | passes `userText`, `variant` into each `generate` call |
| `TextChatCommands.regenerateSection` | passes command text + `variant: "another"` |
| `EditCommandPipeline` → `TextChatCommands.executeIntent` | text.regen path |

**Raw generator (no TIE loop):** `AISiteBuilder.generateTemplate` — industry pack picker used inside candidate pool.

---

## Public API

| Method | Purpose |
|--------|---------|
| `generate(context, seedText, opts)` | Main entry; same return shape as `generateTemplate` |
| `translateTone(text)` | Style words → measurable adjustments |
| `buildWritingContext(doc, opts)` | Full business/brand context object |
| `gatherCandidates(...)` | Expose pipeline for debug |
| `scoreText(...)` | Expose scoring for debug |
| `applyToneTransform(text, toneReq, rules)` | Tone engine |
| `recordRejected(section, text)` | Manual rejection |

### Options

| Option | Meaning |
|--------|---------|
| `userText` | User command or onboarding brief (tone + personalization) |
| `variant: "another"` | Reject current copy, force diverse rewrite |
| `nonce` | Salt for candidate diversity |

---

## Logging

```
[Easily · text-intel] { stage: "SELECT", context, overall, fields, pool, brand, angle }
```

Internal quality scores are for engine use only.
