# Easily Generation Engine V2 — bindande specifikation

**Status:** Bindande och implementerad som V2-generationsväg.

**Evidensbas:**

1. Easilys beständiga P0-trace för QuriAsadesign, generation `gen_d09509af-226b-4e8c-8c60-d586ced56fa5`.
2. Bolt-projektet `asawenn63-alt/quriasa-design`, gren `main`, granskat read-only.
3. Det oberoende Cursor-resultatet som användaren visat visuellt och beskrivit interaktivt.

Bolt och Cursor är **golden references för förmåga**, inte visuella facit. V2 får inte kopiera deras komponenter, CSS, färger, innehåll eller QuriAsa-specifika kompositioner.

---

## 0. Beslut

V2 ska byggas som en ny, avgränsad generationskärna bredvid V1. Följande behålls:

- Question Engine och de fem frågorna
- Creative Brief och dess faktaprovenance
- projektlagring, publicering och projektisolering
- P0:s `generationId` och preview/persistens-bindning
- neutral AI-, bild- och editorinfrastruktur där den kan arbeta mot V2-kontraktet

Följande ersätts i V2:

- namngivna sektions- och layoutrecept
- `componentStrategy` som väljer `hero`, `card-grid`, `media-gallery`, `contact-block` och liknande renderfamiljer
- Blueprint-noder som huvudsakligen refererar till ett separat designobjekt
- enbildsrepresentation för grupper, collage och produktvärldar
- höjdexpansion som huvudsaklig geometrilösning
- renderer-DOM som bestäms av komponentnamn

V2 är inte en omskrivning av hela Easily. Det är en ersättning av generationskärnans representations- och exekveringslager.

---

## 1. Vad kontrollproven bevisar

### 1.1 P0-tracen: intentionen finns men överlever inte

Den spårade Easily-generationen visar:

- Creative Vision specificerar en sammanhängande, dämpad, redaktionell och taktil QuriAsa-värld.
- Composition Plan efterfrågar asymmetri, varierad rytm, olika scenroller och ett faktiskt collage.
- Sen execution väljer ändå namngivna komponentfamiljer.
- Kortgruppen har tre innehållsobjekt men bara en `imageUrl`.
- Galleriet beskriver en dominant bild och två mindre utsnitt men har bara en `imageUrl`.
- Blueprint före geometrilösning bär främst `type`, `designSpecRef` och `compositionPlanRef`; den kan inte själv uttrycka scenen.
- Geometry Resolver expanderar främst höjder, bland annat kontakt `620px → 748px`, utan att omkomponera innehållet.
- Renderer producerar samma generella struktur `section → media → copy → collection` och har en fast footergren.

Första informationsförlusten uppstår alltså i övergången från Creative Directors kompositionsintention till sen execution. Blueprint-kontraktet kan därefter inte återställa den förlorade informationen.

### 1.2 Bolt: samma brief kan ge rikare byggbar komposition

Bolt-koden visar generella förmågor som saknas i V1-kontraktet:

- flera samtidiga mediatillgångar med olika spatial vikt
- en dominant medieyta och mindre stödytor i samma komposition
- text som placeras i eller över mediefält
- överlappande quote-/textyta förankrad i en bild
- en typografiburen scen utan obligatorisk bild eller kort
- explicit bildproportion och crop per medieelement
- responsiva förändringar som är författade, inte gissade vid renderingen
- scroll-reveal som del av upplevelsen

Bolt-kodens komponentnamn och Tailwind-klasser är inte V2-arkitektur. De används bara som bevis för vilka elementrelationer ett färdigt resultat behöver kunna bära.

### 1.3 Cursor: samma brief kan ge en annan men lika sammanhängande värld

Cursor-resultatet visar ytterligare förmågor:

- ett återkommande rörligt text-/objektmotiv över sidans bredd
- en bildmosaik med olika storlek, beskärning och dominans
- filterval som förändrar synligt bildinnehåll
- en presentguide med tillståndsbaserade val
- sektioner som ändrar densitet och fokus utan att byta visuellt språk
- en asymmetrisk bildgrupp där bilder visuellt hör ihop
- en avslutning där en stor typografisk signatur är del av kompositionen, inte en klassisk standardfooter
- egna kreativa designgester som inte uttryckligen beställts i briefen men som stödjer helheten

Bolt och Cursor liknar inte varandra. Det är önskvärt. Tillsammans visar de att V2 behöver ett uttrycksspråk, inte en katalog av “bra” layouter.

### 1.4 Ytterligare referens: branschspecifik informationsdensitet

De visade byggannonserna visar att samma identitet kan varieras över flera kompositioner genom:

- ett stabilt huvudmotiv och färgspråk
- varierande fokusordning och proportioner
- tät men grupperad fakta
- text integrerad i bildytan
- en tydlig avslutande handlingsyta

V2 ska kunna uttrycka denna relationella logik utan en `construction-poster`-typ.

---

## 2. Bindande principer

1. **De fem svaren är sanningen om kunden.**
2. **Creative Director är ensam kreativ auktoritet.** Den ska tolka, formge, överraska och tillföra relevanta idéer.
3. **Kreativ generositet är ett krav.** En sida får innehålla motiverade designgester, interaktioner, rörelser och berättargrepp som användaren inte uttryckligen beställt.
4. **Affärsfakta är inte kreativt material.** Priser, öppettider, adresser, årtal, tjänster och garantier måste ha provenance eller markeras som förslag.
5. **Scene graph beskriver element och relationer, inte sektionsrecept.**
6. **Blueprint ska bära hela Creative Directors beslut.** Ingen nödvändig designinformation får finnas endast i prompttext eller lösa referenser.
7. **Validation får avvisa men inte designa.**
8. **Resolver får lösa värden inom uttryckliga constraints men inte ändra intention, topologi eller estetik.**
9. **Renderer får verkställa men aldrig välja layout, färg, typografi, media, interaktion eller rörelse.**
10. **Samma Blueprint och samma viewportprofil ska ge samma renderresultat.**
11. **Ingen tyst fallback till V1, legacy eller närmaste komponenttyp.**

---

## 3. V2:s fullständiga dataflöde

```text
Question Engine
  └─ fem svar + answer provenance
       ↓
Creative Brief 2.0 (låst faktakontrakt)
       ↓
Creative Director 2.0
  ├─ Semantic Reading
  ├─ Creative Vision
  ├─ Narrative / energy arc
  ├─ Design Language + motif system
  ├─ Creative Initiatives / surprise moments
  ├─ Content & media plan med provenance
  ├─ Unresolved Scene Graph
  ├─ Responsive intent
  └─ Interaction + motion choreography
       ↓
Contract & Semantic Validation
  ├─ schema
  ├─ provenance
  ├─ referential integrity
  ├─ accessibility intent
  ├─ no-recipe / no-legacy gate
  └─ buildability preflight
       ↓
Geometry Resolver 2.0
  ├─ applicerar endast CD-författade responsive operations
  ├─ löser constraints till geometri per viewportprofil
  ├─ väljer crop inom tillåten safe region
  ├─ loggar varje frihetsgrad som utnyttjas
  └─ failar vid olöslig konflikt
       ↓
Blueprint Lock / Compiler
  ├─ oförändrad unresolved graph
  ├─ resolved graph per viewportprofil
  ├─ innehålls- och assetmanifest
  ├─ interaktionsmaskiner
  ├─ rörelsetidslinjer
  └─ kryptografiska artifact-hashar
       ↓
Renderer 2.0
  ├─ primitiv DOM-mappning
  ├─ deterministisk style/token-mappning
  ├─ deterministisk state/motion-runtime
  └─ render receipt
       ↓
Visual + Behavioral Validation
  ├─ overflow, kollision, kontrast, crop och tomyta
  ├─ fokusordning och scenintegritet
  ├─ keyboard/reduced-motion
  └─ render-manifest ↔ DOM-bevis
       ↓
Persistenscommit
       ↓
Preview commit av exakt samma generationId
```

Begreppet **Blueprint** avser det låsta paketet efter resolver. Creative Directors unresolved scene graph förblir separat och oförändrad inuti paketet, så att resolvern aldrig kan skriva över originalintentionen.

---

## 4. Normativt scene graph-kontrakt

Det maskinläsbara JSON-schemat finns i [V2-SCENE-GRAPH.schema.json](./V2-SCENE-GRAPH.schema.json).

### 4.1 Dokumentnivå

```json
{
  "sceneGraphVersion": "2.0",
  "engineVersion": "v2",
  "generationId": "gen_...",
  "graphRevision": {
    "revisionId": "revision.initial",
    "revisionNumber": 0,
    "createdAt": "..."
  },
  "sourceRefs": {
    "creativeBriefArtifactId": "artifact_...",
    "creativeVisionArtifactId": "artifact_..."
  },
  "contentAtoms": [],
  "assetManifest": {
    "manifestId": "assets.primary",
    "assets": []
  },
  "designLanguage": {},
  "pageFlow": {},
  "scenes": [],
  "interactions": {},
  "motion": {},
  "responsive": {}
}
```

`graphId` och `sourceId` är separata identitetsdomäner. `graphId` används endast för objekt som ägs av V2-grafen: scener, noder, relationer, content atoms, assets, roller, state machines, timelines, tracks och viewportprofiler. `sourceId` används för externa artifact-ID:n, femfrågornas `answerId`, användar-/editoraktörer och andra ursprungskällor. Ett externt UUID behöver därför aldrig uppfylla grafens ID-mönster.

`graphRevision` identifierar den redigerbara grafrevisionen. För efterföljande revisioner krävs både `parentRevisionId` och `parentGraphSha256`.

Strukturell auktoritet är maskinläsbart låst av `x-easily-contract.recipePolicy` i schemat. Endast de slutna enum-fälten för primitiv, relation, operation, trigger och motion property får styra struktur. Alla andra fria strängar är semantik eller innehåll och får inte läsas av resolver eller renderer som layoutväljare. Okända egenskaper såsom `layoutType`, `sectionType`, `componentStrategy`, `template` eller `preset` avvisas av det stängda schemat. Ett semantiskt ord som “hero” får beskriva upplevelserollen men kan aldrig välja en renderfamilj.

### 4.2 Primitiva nodtyper

Tillåtna grafprimitiver:

- `group` — grupperar element och skapar en gemensam spatial kontext
- `text` — typografiskt element med innehållsreferens och typografiroll
- `media` — bild, video eller illustration med separat asset- och crop-intention
- `shape` — färgplan, linje, mask eller dekorativ yta
- `action` — länk eller knapp som ingår i kompositionen
- `input` — redigerbart formulärfält eller valkontroll
- `icon` — ikonografiskt element
- `repeat` — återger en datamängd genom en explicit barnstruktur; är inte en kortlayout

Det finns inga nodtyper för `hero`, `about`, `services`, `card`, `gallery`, `mosaic`, `contact`, `footer`, `media-left` eller andra layout-/sektionsrecept. “Hero” och “footer” är semantiska upplevelsekrav: första scenen ska fungera som entré och sista som avslutning, men deras grafstruktur är fri.

### 4.3 Scen

En scen är en sammanhängande grafisk canvas och får omfatta mindre än, ungefär eller flera viewport-höjder.

Varje scen innehåller:

- `experienceRole` — fri semantisk roll, exempelvis `entry`, `discovery`, `proof`, `action`, `closure`
- `narrativePurpose`
- `energy`, `density` och `tempo`
- `focalSequence` — exakt blickordning som nodreferenser
- `nodes` — visuella primitiv
- `relations` — spatiala och hierarkiska relationer
- `constraints` — scenens tillåtna geometriintervall
- `transitionIn` och `transitionOut` — relation till föregående/nästa scen
- `creativeRationale` — varför scenen behövs i helheten

### 4.4 Relationer

Relationer är förstaklassdata. Minsta uppsättning:

- `contain` — element hör till samma kompositionsyta
- `anchor` — ett ankare på ett element binds till ett ankare på ett annat
- `align` — kanter, mittlinjer eller textbaslinjer sammanfaller
- `flow` — ordning, axel, gap och wrap för en grupp
- `distribute` — utrymme fördelas mellan flera element
- `size` — absolut, intrinsisk eller relativ storleksrelation
- `aspect` — proportion eller tillåtet proportionsintervall
- `overlap` — medveten överlappning, riktning, mängd och lagerordning
- `layer` — explicit z-ordning
- `avoid` — element får inte kollidera eller måste hålla minimiavstånd
- `clip` — maskering eller beskärning mot en annan form
- `cropFocus` — mediefokus, safe region, fit och tillåten crop-förskjutning
- `balance` — avsedd visuell tyngd mellan grupper
- `visibility` — explicit villkorad synlighet, aldrig renderer-gissning

Varje constraint har `strength`: `required`, `strong`, `medium` eller `weak`. Resolvern får endast offra en svagare constraint för en starkare och måste logga det. `required` får aldrig brytas.

### 4.5 Fria collage och asymmetri

Ett collage är inte en typ. Det representeras som:

- flera fristående `media`-noder
- en gemensam `group`
- individuella `size`, `aspect`, `anchor`, `overlap`, `layer` och `cropFocus`
- en `focalSequence`
- en eller flera `balance`-relationer

En mosaik är samma mekanism utan krav på överlapp. En text ovanpå en bild är en `text`-nod, en `media`-nod, en gemensam grupp, `contain`, `anchor`, `layer` och kontrastconstraint.

### 4.6 Typografisk hierarki

Typografi uttrycks med fria roller i `designLanguage.typographyRoles`, exempelvis `displayPrimary`, `editorialQuote`, `bodyQuiet` eller ett annat CD-skapat id. Roller innehåller familj, vikt, storleksintervall, radavstånd, teckenavstånd och avsedd funktion.

Noder refererar roller; renderern väljer aldrig en roll. Storlek kan vara fluid inom ett CD-angivet intervall. Resolvern väljer ett byggbart värde inom intervallet.

### 4.7 Färgroller

Färgpaletten uttrycks som semantiska, fria roller med:

- färgvärde
- avsedd användning
- tillåtna bakgrunds-/förgrundspar
- dominansnivå
- maximal förekomst om CD vill begränsa accenten

Renderer får inte ljusa upp, mätta, byta eller “förbättra” en färg. Validation får stoppa en otillgänglig kombination; Creative Director måste då korrigera beslutet.

### 4.8 Innehåll och kreativ inferens

Allt synligt innehåll ligger i `contentAtoms`. Varje atom har provenance:

- `briefFact` — direkt från de fem svaren
- `suppliedAsset` — användarens material
- `creativeExpression` — rubrik, metafor eller berättande copy
- `safeInference` — låg-risk slutsats som inte låtsas vara ny affärsfakta
- `creativeProposal` — en ny idé som ska kunna redigeras eller bekräftas
- `verifiedExternalFact` — verifierad källa med källreferens

Kreativa initiativ uppmuntras. Påståenden om pris, adress, öppettider, årtal, garantier, lagerstatus eller erbjudna tjänster får inte markeras `creativeExpression`; de kräver faktaprovenance eller `creativeProposal`.

### 4.9 Asset-manifest

Alla `node.assetRef`, state-operationer av typen `setAsset` och editormutationer som byter asset måste referera ett unikt `assetManifest.assets[].id`.

Varje asset innehåller:

- intern `graphId`
- `kind`: `image`, `video` eller `vector`
- MIME-typ
- källa med URI eller externt `sourceId` och obligatorisk innehållshash
- intrinsisk bredd, höjd och proportion
- `viewBox` för vector assets
- provenance och valfri alt-textreferens

Vector assets är den neutrala bäraren för fria illustrativa och dekorativa former som inte kan beskrivas med en enkel `shape`-primitiv. Renderer får visa asseten men inte rita om eller välja ett ersättningsmotiv.

---

## 5. Ansvarsgränser

### 5.1 Creative Director

Creative Director äger:

- semantisk läsning av de fem svaren
- kreativ vision, synvinkel, sinnlig värld och emotionellt löfte
- sidans narrativa och energetiska kurva
- alla scener och deras relation till helheten
- alla noder och spatiala relationer
- typografi- och färgroller
- mediaantal, motiv, crop-intention och fokus
- interaktionsidé, tillstånd och övergångar
- motion, tempo och återkommande motiv
- responsiva kompositionsbeslut
- kreativa initiativ och överraskningsögonblick

Creative Director får skapa relevanta idéer som briefen inte uttryckligen beställt. Den får inte skapa obestyrkta affärsfakta som om de vore sanna.

### 5.2 Contract & Semantic Validation

Validation får:

- kontrollera schema, referenser, constraints och provenance
- upptäcka recept-/legacyord i strukturella fält
- kontrollera att entry och closure finns
- kontrollera att focal sequence, kontrastintention, alt-text, keyboardväg och reduced-motion-policy finns
- bedöma om grafen är lösbar innan resolver körs
- stoppa och returnera exakta fel till Creative Director

Validation får inte:

- lägga till noder
- välja färg, font, crop, storlek eller layout
- ersätta en olöslig scen med en enklare scen
- skriva fallback-copy

### 5.3 Geometry Resolver

Resolvern får:

- välja numeriska värden inom CD:s intervall
- lösa ankare, flöden, proportioner och överlapp
- applicera CD-författade responsive operations
- välja crop-position inom angiven safe region
- expandera eller komprimera inom scenens explicita min/max och overflow-policy
- rapportera vilka svaga constraints som behövde offras

Resolvern får inte:

- ändra nodtopologi eller scenordning
- skapa, ta bort eller ersätta element
- ändra visuella roller eller innehåll
- ändra mediaantal
- byta design vid mobilbredd
- göra en asymmetrisk komposition symmetrisk om inte en responsive operation uttryckligen säger det

Olöslig `required`-konflikt är ett hårt fel, inte en fallback.

### 5.4 Blueprint Lock / Compiler

Compiler är icke-kreativ. Den paketerar och hash-låser:

- unresolved graph
- validation report
- resolved profiles
- assets och content
- state machines och timelines
- resolver decision log

Den får inte normalisera bort information som renderern behöver.

#### Bindande kompilatorinvariant

Layoutkompilatorn får aldrig skapa, ersätta eller omkomponera en layout. Den får endast översätta den fria visuella scenen till tekniskt korrekt HTML/CSS och responsiv layout utan att ändra designidén eller något av Creative Directors visuella beslut.

Om scenen eller någon viewportprofil inte kan översättas tekniskt ska kompileringen avbrytas. Kompilatorn ska då returnera en strukturerad felrapport som identifierar exakt scen, nod, relation eller constraint som orsakar konflikten och skicka den tillbaka till Creative Director för ett nytt visuellt beslut.

Kompilatorn får aldrig försöka rädda en konflikt genom att:

- skapa, ta bort, flytta eller ersätta noder
- välja en närmaste komponent eller renderingsvariant
- ersätta den fria scenen med färdiga sektioner
- ändra hierarki, proportioner, överlappning, gruppering eller scenordning
- införa en estetisk fallback eller automatisk omdesign

Denna invariant gäller hela kedjan från unresolved scene graph till färdig HTML/CSS. Tekniskt olöslig design ger ett explicit kompileringsfel; den ger aldrig en annan design.

Tre maskinläsbara kontrakt låser överlämningen:

- `resolvedSceneGraph` refererar unresolved-grafens hash och den valda profil-ID:n och innehåller viewportmått, samtliga applicerade responsive operations, offrade icke-required relationer samt resolved bounds, z-index, synlighet, crop och typografi per nod.
- `lockedBlueprint` innehåller hela unresolved scene graphen, dess hash, asset-manifestets hash, validation artifact-ID och samtliga hashade resolved profiler. Den kreativa grafen ersätts alltså aldrig av en reducerad geometry-payload.
- `renderManifest` innehåller endast entydiga artifact-ID:n och hashvärden för exakt locked Blueprint, resolved scene graph och asset-manifest samt vald profil och ordnad scen-/nodlista.

Generation-ID och alla hashkedjor måste matcha. Renderer får inte starta om någon referens eller hash avviker.

### 5.5 Renderer

Renderer får:

- mappa primitiv nodtyp till stabil DOM-primitiv
- applicera resolved bounds, tokens och constraints deterministiskt
- binda events till specificerade state machines
- köra specificerade timelines
- välja rätt redan-resolved viewportprofil
- läsa exakt det `renderManifest` som pekar på samma låsta Blueprint, resolved profil och asset-manifest
- producera render receipt

Renderer får inte:

- känna till QuriAsa, snickare, café eller branscher
- känna till `hero-left`, `card-grid`, `gallery-mosaic` eller liknande
- välja ny layout, nytt media, ny CTA, ny text eller estetisk fallback
- lägga till rundning, stor knapp, standardfooter eller standardluft

---

## 6. Responsivitet utan ny design i renderern

Creative Director författar en basgraf och explicit responsiv avsikt.

### 6.1 Viewportprofiler

Profiler definieras av inline-/blockintervall, inte enbart “desktop/tablet/mobile”. För varje profil lagras:

- unik intern profil-ID och unik numerisk `priority`
- aktiva constraints
- avaktiverade constraints
- explicit ordning
- synlighet
- crop-safe-region
- tillåtna storleksintervall
- motion policy

### 6.2 Responsive operations

Tillåtna operationer är deklarativa:

- `setConstraint`
- `disableConstraint`
- `setNodeVisual`
- `setFlowOrder`
- `setVisibility`
- `setContentVariant`
- `setCropIntent`
- `setMotionPolicy`

Varje operation har en op-specifik payload. Det finns inga fria `path/value`: constraint-operationer bär en typad relationsoverride, flödesoperationen bär en ordnad nodlista, crop-operationen bär `fit`, `focalPoint` och `safeRegion`, och motion-operationen bär en full reduced-motion-policy.

Operationerna skapas av Creative Director före resolver. Renderer kör inga mediabaserade designheuristiker.

Profilval är deterministiskt: alla matchande profiler jämförs med `priority`, högst prioritet vinner, lika prioritet är ett kontraktsfel och utebliven match använder den explicit angivna `baseProfileId`. Validatorn måste dessutom kontrollera att profil-ID:n och prioriteter är unika.

### 6.3 Resolverbevis

Varje resolved profil innehåller:

- bounds för varje nod
- slutlig crop
- applicerade operationer
- offrade icke-required constraints
- overflow- och kollisionsrapport

Det gör att mobilkompositionen kan jämföras med CD:s avsikt och spåras i P0.

---

## 7. Interaktion och rörelse

### 7.1 State machines

Filter, presentguide, bildbyte, expanderat innehåll och formulär uttrycks som tillståndsmaskiner:

- namngivet initialt tillstånd
- möjliga tillstånd
- typade events: targetbundna `activate`, `change`, `submit`, `focus` och `blur`; scen, progress och riktning för `scrollThreshold`; eller explicit millisekundfördröjning för `timer`
- exakta op-typade graf-/innehållspatches per tillstånd: `replaceContent`, `setVisibility`, `setAsset`, `setRelation` eller `disableRelation`
- tillåtna övergångar
- fokus- och keyboardpolicy
- återställningsbeteende

“Klicka på Gåvor och visa fler bilder” är alltså en state transition som ändrar synlighet eller content binding för redan specificerade mediaelement. Renderer uppfinner inte filtreringen.

State patches har inga fria `path/value`. `replaceContent` bär ett giltigt content-ID, `setAsset` ett giltigt asset-ID, `setVisibility` ett booleanvärde och relationsoperationerna en full relation eller ett relation-ID. Referensintegriteten valideras före resolver.

### 7.2 Motion timelines

Motion är förstaklassdata med:

- typad trigger med källa: scen-ID för `sceneEnter`/`loop`, scen-ID och start-/slutprogress för `viewportProgress`, state-machine och från-/tillstånd för `stateTransition`, eller event och event-target för `userAction`
- targetnoder
- property-typade keyframes: progressvärden 0–1, translationsvärden med enhet, skala som tal och rotation som vinkel med `deg`, `rad` eller `turn`
- duration, delay, easing, direction och iterations
- explicit coordination: `independent`, `sync` med sync-grupp eller `stagger` med ordnad tracklista och millisekundintervall
- `reducedMotion`-utfall

En rörlig objektramsa uttrycks som en `repeat`-nod i en klippt grupp och en loopad translations-timeline. Det finns ingen `ticker`- eller `marquee`-layouttyp.

---

## 8. Editor mot samma representation

Editorn ska redigera V2-grafen, inte en separat DOM-modell.

### 8.1 Direktmanipulation

- markering i preview mappar via `data-v2-node-id` till exakt grafnod
- drag ändrar eller skapar anchor-/offsetconstraints, inte fri CSS
- resize ändrar size-/aspectconstraints inom tillåtna intervall
- lagerpanel visar grafens groups och layerrelationer
- textedit ändrar content atom
- bildbyte ändrar assetref och crop-intention
- färg-/typografibyte ändrar rollreferens eller rollvärde

### 8.2 Interaktionsredigering

Editorn kan växla mellan state-machine-tillstånd och redigera varje tillstånds patch. Motion kan förhandsgranskas, pausas och ersättas med reduced-motion-läge.

### 8.3 Round-trip-regel

`Blueprint → editor mutation → Blueprint → render` får inte förlora relationer som editorn inte rörde. Varje mutation är en typed operation med egen provenance och undo/redo.

Det maskinläsbara kontraktet `editorMutationBatch` innehåller `generationId`, basrevision och bashash, resultatrevision och resultathash samt en ordnad lista mutationer. Tillåtna mutationer är `moveNode`, `resizeNode`, `setCropIntent`, `replaceContent`, `replaceAsset`, `setNodeVisual`, `replaceStatePatch` och `replaceTimeline`.

Varje mutation innehåller en intern mutations-ID, explicit target, typad `before` och `after`, editorprovenance och `reversible: true`. Undo applicerar samma operationers `before` i omvänd ordning; redo applicerar `after`. En batch får endast appliceras om både `baseRevisionId` och `baseGraphSha256` matchar aktuell graf.

Större omtag (“gör hela sidan mer dramatisk”) går tillbaka till Creative Director med nuvarande graf och användarens låsta ändringar. Renderer eller editor får inte själva art directa om sidan.

---

## 9. P0-trace för V2

Samma stabila `generationId` ska följa hela körningen. P0 utökas, inte ersätts.

### 9.1 V2-artifacts

1. `questionAnswersSnapshot`
2. `creativeBrief`
3. `creativeVision`
4. `compositionIntent` — page arc, design language, motifs och creative initiatives
5. `contentAndAssetPlan`
6. `unresolvedSceneGraph`
7. `contractValidationReport`
8. `resolverInput`
9. `resolvedSceneGraph`
10. `resolverDecisionLog`
11. `lockedBlueprint`
12. `renderManifest`
13. `renderReceipt`
14. `visualBehavioralValidationReport`
15. `persistenceReceipt`

`V2-SCENE-GRAPH.schema.json` definierar både unresolved scene graph som rotkontrakt och de separata maskinläsbara `$defs`-kontrakten `resolvedSceneGraph`, `lockedBlueprint`, `renderManifest` och `editorMutationBatch`. Fas A ska validera varje artifact mot rätt `$ref`; de får inte behandlas som fria payloads.

Varje artifact har:

- `artifactId`
- `generationId`
- `artifactType`
- `schemaVersion`
- `createdAt`
- `producer` med modell-/kodversion
- `inputArtifactIds`
- `sha256`
- payload

### 9.2 Preview ↔ generation ↔ persistens

- `renderManifest` innehåller hash för exakt locked Blueprint och assetmanifest.
- `renderReceipt` innehåller samma generationId, Blueprint-hash, viewportprofil, node-id-lista och DOM/style-checksum.
- Preview får endast committas när render receipt och persisted generation matchar.
- Autosave efteråt får skapa ny draftrevision men får inte ändra `previewGenerationId` utan en ny giltig render receipt.
- Sparfel behåller diagnostiken, markerar generationen `persistence-failed` och får inte visa framgång.

### 9.3 Shadow provenance

V1 och V2 får varsitt generationId men delar ett immutable `briefSnapshotId` och `briefSha256`. Därmed kan de jämföras utan att påstås vara samma generation.

---

## 10. Shadow-mode-migration

### Fas A — kontrakt och fixtures

- implementera V2-schema och validator utan UI-koppling
- skapa fixtures för QuriAsa, snickare, barnkläder och café
- förbjud V1-komponent- och variantvokabulär i V2-strukturfält
- testa serialization och editoroperationer

### Fas B — V2 shadow generation

- V1 förblir synlig och produktionstrogen
- samma immutable Creative Brief skickas separat till V2
- V2 genererar vision, unresolved graph, validation och resolverresultat
- V2 får inte mutera projektets V1-dokument
- P0 kopplar båda till samma briefSnapshotId

### Fas C — intern V2 preview

- neutral renderer kör i separat host/iframe
- bara utvecklarläge visar V2
- automatiska och mänskliga jämförelser körs
- ingen tyst V1-fallback om V2 misslyckas

### Fas D — opt-in för nya projekt

- feature flag per ny generation, inte globalt CSS-läge
- befintliga V1-projekt fortsätter renderas av V1
- användaren kan uttryckligen regenerera en kopia i V2
- originalet förblir återställningsbart

### Fas E — V2 primary

- aktiveras först när acceptance gates är uppfyllda över flera briefer och viewportprofiler
- V1 fryses för befintliga V1-dokument
- V1 tas inte bort förrän migrering och rollback har bevisats

---

## 11. Acceptance tests

### 11.1 Kontrakt och auktoritet

- Schema accepterar fria kompositioner utan namngiven layouttyp.
- Schema och semantic validation tillåter strukturella val endast genom den maskinläsbara slutna vokabulären i `x-easily-contract.recipePolicy`. Okända receptfält och receptvärden i strukturella discriminators avvisas; fria semantiska etiketter är uttryckligen icke-strukturella.
- Interna `graphId` och externa `sourceId`/`answerId` valideras i separata identitetsdomäner.
- Alla nod-, content-, asset-, state- och timeline-referenser är giltiga.
- State-, responsive- och editormutationer avvisar fria `path/value` och accepterar endast op-specifika typade payloads.
- Viewportprofilval ger exakt en vinnare eller ett kontraktsfel; renderer gör aldrig ett tie-break.
- `resolvedSceneGraph`, `lockedBlueprint` och `renderManifest` bildar en obruten hashkedja till rendererinput.
- Creative Director-output kan serialiseras till locked Blueprint utan borttagna beslut.
- Resolvern kan endast ändra numeriska värden inom uttryckliga constraints.
- Mutationstest visar att renderer-output ändras endast när Blueprint ändras.
- Renderer har ingen bransch-, sektions- eller estetisk väljarkod.

### 11.2 Obligatoriskt QuriAsa-test

Input är exakt samma femfrågebrief:

- webbplatstyp: webbutik
- namn: QuriAsadesign
- verksamhet: present- och inredningsbutik mitt i stan, för alla åldrar
- ort: Hudiksvall
- stil: varm och välkomnande
- önskad struktur enligt de fem svaren
- från grunden

Godkänt kräver inte Bolts eller Cursors stil eller identiska layout. Det kräver:

1. En sammanhängande Creative Vision som är spårbar till briefen.
2. Ett genomgående men varierbart motivsystem.
3. En tydlig page arc med förändrad energi och densitet.
4. Sektions-/scendifferentiering som kan mätas i olika relationsgrafer, inte bara olika copy.
5. Minst en bildkomposition med tre eller fler separata mediaelement, olika spatial vikt och explicit focal/crop-intention.
6. Minst en asymmetrisk scen med definierad blickordning.
7. Kontrollerade proportioner utan oförklarade viewport-stora tomytor.
8. Typografisk hierarki med minst tre funktionella roller och en enda primär dominant nivå per scen.
9. Minst ett motiverat kreativt initiativ som inte uttryckligen beställts men stöder visionen, exempelvis rörelse, interaktion, oväntad typografisk gest eller berättargrepp.
10. Om filter eller bildval används: full keyboard-, fokus- och state-machine-specifikation.
11. Om kontinuerlig rörelse används: specificerad reduced-motion-version.
12. Ingen QuriAsa-sträng, QuriAsa-komponent eller golden-reference-layout i motorkoden.

Bedömningen görs mot förmågedimensionerna kompositionsfrihet, proportionell kontroll, scendifferentiering och kreativ koherens. Pixel- eller stilmatchning mot Bolt/Cursor är förbjuden.

### 11.3 Variationsbredd

Kör minst följande briefer utan motorkodändring:

- snickare: robust, trovärdig, branschspecifik, inte automatiskt beige/brun
- barnkläder: varm, lekfull och trygg utan generisk pastellmall
- café: identitet utifrån verksamhet och sammanhang, inte automatisk gul/grön “sommar”
- professionell tjänst: hög informationsklarhet utan att återanvända butikens komposition

Tester ska kontrollera att graferna inte är topologiskt isomorfa efter att text och färg ignorerats. Samtidigt får systemet återanvända visuella principer när Creative Vision motiverar det.

### 11.4 Responsivitet

- Desktop, smal desktop, tablet och mobil löses från samma authored responsive intent.
- Inga avklippta kanter, horisontell overflow eller oläsbara textkolumner.
- Focal sequence och innehållsprioritet överlever varje profil.
- Resolvern ändrar inte topologi utan en explicit responsive operation.
- Crop håller focal point inom safe region.

### 11.5 Interaktion och rörelse

- State transitions är deterministiska och återställningsbara.
- Filter visar exakt de content bindings som Blueprint anger.
- Keyboard och pointer ger samma funktion.
- Scroll-reveal respekterar ordning och reduced motion.
- Loopad rörelse kan pausas och skapar inte layout shift.

### 11.6 Editor round-trip

- Flytt, resize, crop, textbyte och färgrollsbyte skapar typed graph operations.
- Undo/redo återställer identisk Blueprint-hash.
- Orelaterade constraints överlever varje mutation byte-identiskt.
- Alla state-machine-tillstånd kan redigeras och förhandsgranskas.

### 11.7 Trace och persistens

- Samma generationId finns i samtliga 15 artifacts.
- Artifact-hashkedjan är obruten.
- Render receipt matchar exakt synlig DOM och viewportprofil.
- Persistensfel blockerar framgångsstatus.
- Autosave kan inte göra synlig generations provenance tvetydig.
- Shadow V1/V2 kan jämföras via samma immutable brief hash utan att dela generationId.

---

## 12. Risker och motåtgärder

### Scene graph blir fri CSS

**Risk:** CD producerar pixelkoordinater utan redigerbar semantik.  
**Motåtgärd:** relationer och constraints är primära; resolved bounds är resolver-output, aldrig Creative Director-kontrakt.

### Scene graph blir en ny komponentkatalog

**Risk:** recept göms som `sceneKind`, `variant` eller motif-id.  
**Motåtgärd:** strukturella enums begränsas till visuella primitiv och relationer. Motifs får bära stil-/beteendereferenser men aldrig ett färdigt nodträd.

### Olösliga eller ömtåliga kompositioner

**Risk:** hög frihet ger kollisioner och extrema höjder.  
**Motåtgärd:** required/strong/medium/weak, preflight, explicita min/max, fail-fast och resolver decision log.

### Responsiv design förlorar intention

**Risk:** mobil blir automatiskt en staplad standardlayout.  
**Motåtgärd:** authored responsive operations och resolved profiler som trace-artifacts.

### Fantasi förväxlas med fakta

**Risk:** en levande sida innehåller obestyrkta priser, tjänster eller årtal.  
**Motåtgärd:** content provenance per atom; kreativa förslag är tillåtna men identifierbara och redigerbara.

### För mycket rörelse

**Risk:** upplevelsen blir störig eller otillgänglig.  
**Motåtgärd:** motion rationale, per-scen dominans, reduced-motion och behavioral validation. Validation stoppar; renderer tonar inte själv ned.

### Editor kan inte bära friheten

**Risk:** genereringen lyckas men sidan går inte att redigera.  
**Motåtgärd:** typed graph operations och editor round-trip ingår från första kontraktstestet, inte som senare adapter.

### Latens och kostnad

**Risk:** rik CD-output, flera media och flera viewportlösningar kostar mer.  
**Motåtgärd:** separata steg, artifact-cache via hash, återanvändbar brief/vision, shadow-budget och mätning innan rollout.

### Golden-reference-överanpassning

**Risk:** V2 lär sig QuriAsa, mörk guldestetik eller byggannonsens uttryck.  
**Motåtgärd:** förmågebaserade tester, förbjuden pixelmatchning och variationssvit över helt andra briefer.

---

## 13. Implementationsordning efter godkännande

1. Frys V1 till säkerhets-, data- och tracefixar.
2. Inför V2-schema, parser, validator och fixtures utan renderer.
3. Lägg V2-artifacts i P0 med separat engine-/artifact-version.
4. Implementera constraint resolver och dess beslutlogg mot handskrivna fixtures.
5. Implementera neutral primitive renderer.
6. Implementera state-machine- och motion-runtime.
7. Kör QuriAsa samt variationssviten i shadow mode.
8. Lägg editoroperationer och round-trip.
9. Aktivera intern V2-preview först efter gröna contract-, resolver-, renderer- och tracegates.

**Stoppregel:** Ingen V2-implementation ska börja genom att skapa hero-, card-, gallery-, service- eller footerkomponenter. Första fungerande vertikala snittet ska gå genom primitiv graf → resolver → primitive renderer → trace.
