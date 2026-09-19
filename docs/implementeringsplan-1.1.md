# Implementeringsplan 1.1 — Create-kedja med Creative Director

**Bindande BLOCKER:** P21, P26, P8, P24, P1, P2, P11, P9  
**Princip:** Legacy create oförändrad tills gate är på. CD-vägen kör endast allowlistade executors. Inga parallella kreativa källor på CD-vägen.

**Målbild:** Create-input → Creative Director → låst brief → komposition (executor) → hero-copy från brief → synlig sajt.

---

## Översikt — steg och BLOCKER

| Steg | Namn | BLOCKER |
|---|---|---|
| 0 | Feature gate & vägisolering | P24 |
| 1 | Brief-artefakt, lås & kontrakt | P21, P26, P8 |
| 2 | Canonical observation (bransch) | P11 |
| 3 | Creative Director v1 | P21 |
| 4 | Koppla CD före komposition | P26, P8 |
| 4b | Executor allowlist (CD-väg) | P24, P21, P8 |
| 5 | Komposition som executor | P1, P2 |
| 6 | Hero som executor | P9 |
| 7 | End-to-end & regression | alla |

---

## Maskinella kontrakt (gäller CD-vägen)

### State-regler

| Tillstånd | Sätts av | Krav |
|---|---|---|
| `briefLocked: true` | Creative Director (steg 3–4) | Obligatoriskt före komposition |
| `compositionLocked: true` | Komposition (steg 5) | Endast efter `briefLocked` |
| CD-väg abort | Orkestrering | Vid `briefLocked: false` efter CD — avbryt, **ingen** fallback till legacy på samma körning |
| Legacy-väg | Gate off | Ignorerar `creativeBrief`, `briefLocked`; befintlig semantik oförändrad |

**Otillåtna tillstånd på CD-väg (hard fail):**  
`compositionLocked && !briefLocked` · komposition startad utan `briefLocked` · executor utanför allowlist körs.

### Förbjudna kreativa källor (P21)

Executorer på CD-vägen får **inte** läsa eller härleda identitet från:

- `onboardingDescription` / `createBusinessBrief` (som kreativ input)
- `page.artDirectorBrief` / `composition.artDirector`
- `SiteCompositionEngine.toGenerationBrief()` / kompositionssammanfattning som text
- `AISiteBuilder.pack()` och branschmallar
- UI `createDesignStyle` / `createDesignStyleFamily` (som kreativ input)
- `page.siteComposition` / `designArchetype` / archetype-lexikon (som identitetskälla)
- `resolveBusinessPlan()` / `buildCtaPlan()` (som kreativ CTA/resa-källa)
- `buildArtDirectorBrief()` och dess efterföljare
- Build Plan `toGenerationText()` kompositions-/SCE-preview-del

**Tillåten kreativ källa:** `page.creativeBrief` med `briefLocked: true`.

**Tillåten icke-kreativ input:** create-input, `canonicalIndustry`, scope-fält (sektioner, mål), gate-flagga.

### Composition Input Contract (steg 1)

Referens till låst Creative Brief-kontrakt — **inga nya fält**.

Komposition (steg 5) läser **endast** från `creativeBrief` och producerar:

- sektionsordning
- kompositionsblock (typ + placering enligt deterministisk mapping)
- card count + card intents
- layout-nycklar (hero-struktur, spacing, highlight-läge)
- `compositionLocked`

Komposition producerar **inte** hero-copy, CTA-copy, färgterritorium eller bildval.

---

## Steg 0 — Feature gate & vägisolering

**Mål:** Två isolerade create-vägar.

**BLOCKER löst:** P24

**Moduler påverkade:** Create-orkestrering, create context (gate-flagga).

**Beroenden:** Inga.

**Slutkriterium:**

- Legacy (`gate = off`): identiskt beteende med idag.
- CD-väg (`gate = on`): separat kodgren; får avbryta med tydligt fel tills senare steg är klara — **ingen** fallback till legacy på samma körning.

**Verifierbart:**

- Samma input, gate off vs on: off = dagens resultat; on = kontrollerat fel eller definierad CD-gren.
- Gate-flagga når orkestrering och bridge.

---

## Steg 1 — Brief-artefakt, lås & kontrakt

**Mål:** Maskinläsbart brief-objekt, låsregler, Composition Input Contract, förbjudna källor som enforcement.

**BLOCKER löst:** P21 (struktur), P26, P8 (grund)

**Moduler påverkade:** Page-state, gemensam guard (executor gate), komposition (läser regler senare).

**Beroenden:** Steg 0.

**Slutkriterium:**

- `creativeBrief` (strukturerat, versionerat enligt låst brief-kontrakt).
- `briefLocked: boolean`.
- Composition Input Contract dokumenterad och bindande (se ovan).
- Förbjudna kreativa källor enforced på CD-väg (guard kan no-op:a tills executors finns — **vägrar** om förbjuden källa används).
- State-regler enligt maskinella kontrakt.

**Verifierbart:**

- Gate on + `briefLocked: false` → komposition/executor **vägrar**.
- Gate on + manuell låst testbrief (dev) → komposition **får** starta (steg 5+).
- Gate off → ignorerar brief-fält.
- Förbjuden källa i executor → hard fail på CD-väg.

---

## Steg 2 — Canonical observation (bransch)

**Mål:** En bransch sätts en gång före CD.

**BLOCKER löst:** P11

**Moduler påverkade:** Branschupplösning (AI site builder), create bridge, komposition (CD-väg: ingen egen inferens).

**Beroenden:** Steg 0.

**Slutkriterium:**

- `canonicalIndustry` (eller motsvarande single field) i create-context **före** CD.
- CD-väg: komposition och efterföljande executors läser **endast** canonical — ingen parallell inferens i kedjan.
- Legacy-väg: oförändrad.

**Verifierbart:**

- Trace: exakt ett branschvärde från input till CD-input på CD-väg.

---

## Steg 3 — Creative Director v1

**Mål:** CD producerar låst `creativeBrief` enligt låst modell + stoppregel.

**BLOCKER löst:** P21 (full)

**Moduler påverkade:** Creative Director (ny modul), create-orkestrering (anrop).

**Beroenden:** Steg 1 (schema + state), Steg 2 (canonical input).

**Slutkriterium:**

- CD-input: **endast** create-input + canonical observation + scope — **inte** `siteComposition`, `artDirectorBrief`, komposition preview.
- CD-output: alla obligatoriska brief-fält enligt låst kontrakt.
- `briefLocked: true` endast när stoppregel passerar; annars abort.
- Ingen komposition, AI, design, bild inuti CD.

**Verifierbart:**

- Isolerat: given input → `creativeBrief` + `briefLocked`.
- Kalle vs Olle → olika brief (manuell granskning).
- CD fail → `briefLocked: false`, CD-väg avbryts.

---

## Steg 4 — Koppla CD före komposition

**Mål:** Ordning på CD-väg: input → CD → `briefLocked` → därefter bridge/komposition.

**BLOCKER löst:** P26, P8 (full)

**Moduler påverkade:** Create-orkestrering, create flow bridge.

**Beroenden:** Steg 0, 1, 3.

**Slutkriterium:**

- CD-väg: SCE/komposition **anropas inte** före CD.
- Efter CD: exakt **ett** brief-objekt; inga parallella generation texts som kreativ input.
- Build Plan genererar **inte** SCE-preview/`toGenerationText` kompositionsdel på CD-väg.

**Verifierbart:**

- Trace: CD complete → `briefLocked` → komposition start.
- CD-väg: ingen `buildArtDirectorBrief`, ingen `toGenerationBrief` till executors.

---

## Steg 4b — Executor allowlist (CD-väg)

**Mål:** CD-vägen kör **endast** allowlistade steg; övriga legacy-steg hoppas över eller hard-disabled.

**BLOCKER löst:** P24, P21, P8 (förstärkt)

**Moduler påverkade:** Create-orkestrering (`runMagicGeneration` och motsvarande).

**Beroenden:** Steg 4.

**Slutkriterium — allowlist per fas:**

| Fas | Tillåtet på CD-väg |
|---|---|
| Efter steg 4b (initial) | CD, state/doc init, render/state apply |
| Efter steg 5 | + komposition (executor) |
| Efter steg 6 | + hero-copy executor |
| Steg 7 | + utökning enligt steg 7 (design/bild **läs-only** från brief) |

**Hard-disabled på CD-väg tills explicit utökad i steg 7:**

- Designfamiljer (kreativ pick)
- `fillFullSite` (alla targets utom hero efter steg 6)
- `fillCompositionBlocks`
- Bildkedja
- Post-generation art director score (kreativ del)
- Generation integrity **repair** som fyller generisk copy (fail-only till steg 7)

**Verifierbart:**

- Trace på CD-väg: endast allowlistade moduler körs.
- Förbjudna steg körs **inte** (loggar "skipped: not on allowlist").
- Ingen dual brief på page (`artDirectorBrief` skrivs inte på CD-väg).

---

## Steg 5 — Komposition som executor

**Mål:** Komposition tolkar brief deterministiskt till struktur.

**BLOCKER löst:** P1, P2

**Moduler påverkade:** Site Composition Engine (CD-vägs-gren), create flow bridge.

**Beroenden:** Steg 1 (Composition Input Contract), Steg 4, **Steg 4b verifierad**.

**Slutkriterium:**

- CD-väg **bort:** archetype som identitet, story template-val, auto-block som default-identitet, `buildArtDirectorBrief`, hero headline/lead, self-review/suitability som kreativ patch.
- CD-väg **kvar:** deterministisk mapping brief → struktur enligt Composition Input Contract; `compositionLocked` efter mapping.
- Samma brief → identisk struktur.
- Olika brief (Kalle vs Olle) → mätbar strukturskillnad.
- Legacy-väg: oförändrad.

**Verifierbart:**

- Struktur-diff Kalle vs Olle.
- `compositionLocked` endast efter mapping och endast om `briefLocked`.
- Allowlist inkluderar komposition; inga förbjudna källor i SCE gated branch.

---

## Steg 6 — Hero som executor

**Mål:** Hero title + lead **endast** från låst brief.

**BLOCKER löst:** P9

**Moduler påverkade:** AI site builder (`fillFullSite` / `fillSection`), text intelligence (CD-vägs-guard).

**Beroenden:** Steg 4b, Steg 5.

**Slutkriterium:**

- CD-väg: hero skrivs från brief **en gång**; ingen `pack()` fallback, ingen parallell `personalizeHeroFromBrief` + TIE-konkurrens, inget `heroCtaSnap`-mönster.
- Allowlist: hero är **enda** text-genereringssteg på CD-väg (services, faq, blocks = inte kördes).
- Tom hero → hard fail, inte mallsträng.

**Verifierbart:**

- Hero equals brief-fält.
- Trace: inga andra `fillSection`-targets på CD-väg.
- Kalle vs Olle: olika hero från brief.

---

## Steg 7 — End-to-end & regression

**Mål:** Första fungerande CD-create; legacy orörd.

**BLOCKER löst:** Verifierar P21–P26, P8, P24, P1, P2, P11, P9.

**Moduler påverkade:** Hela CD-väg; allowlist **utökas** — inte hela legacy-pipelinen.

**Beroenden:** Steg 0–6.

**Slutkriterium:**

- Gate on: Kalle → färdig synlig sajt; Olle → fundamentalt olika (minst tre skillnader: brief, struktur, hero).
- Gate off: regression oförändrad.
- Allowlist utökad för design/bild: **läs-only** från `creativeBrief` — **ingen** bransch som primär identitetskälla.
- Inga placeholders som bryter brief constraints (eller synlig fail).

**Verifierbart:**

- Side-by-side Kalle/Olle.
- Legacy smoke (gate off).
- Trace: en brief-källa, en bransch, `briefLocked` före `compositionLocked`, allowlist respected.

---

## Beroendegraf

```
Steg 0 (P24)
  → Steg 1 (P21, P26, P8 + Composition Input Contract + förbjudna källor)
    → Steg 2 (P11)
      → Steg 3 (P21 full)
        → Steg 4 (P26, P8)
          → Steg 4b (allowlist — P24, P21, P8)
            → Steg 5 (P1, P2)  [kräver 4b]
              → Steg 6 (P9)
                → Steg 7 (allowlist expansion + regression)
```

---

## Definition of Done — första fungerande CD-create

| BLOCKER | Bevis |
|---|---|
| P24 | Gate; legacy + CD isolerade; allowlist |
| P21 | Strukturerad brief; förbjudna källor enforced |
| P26 | `briefLocked` före `compositionLocked` |
| P8 | En brief-källa |
| P11 | En canonical bransch |
| P1 | Card semantics från brief |
| P2 | Deterministisk block-mapping |
| P9 | Hero endast från brief |

---

## Medvetet utanför steg 0–7 (ingen scope-ändring)

- Full services/FAQ/block-copy från brief (efter steg 7, samma gate/allowlist-mönster).
- Legacy-vägens avveckling.
- Cutover gate off → on som default.
