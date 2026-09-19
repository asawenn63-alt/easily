# Stabilisering av första genereringen – serie 2, 2026-09-13

## Avgränsning

Den enda ändringen i den aktiva genereringskedjan inför denna serie var att ta bort det hårdkodade stoppet `too-many-generated-images` i bildmaterialiseringen. Den befintliga kön med två samtidiga bildjobb behölls.

Prompten, arkitekturen, layoutkompilatorn och reglerna för bildåteranvändning ändrades inte.

Serien körde 20 nya Creative Briefs genom `/api/v2/generate-site`. Rådata finns i `server/data/stabilization/v2-prompt-stabilization-2026-09-13T06-44-46-247Z.jsonl`.

## Resultat

- Totalt: 20 körningar.
- Lyckade: 15 av 20, 75 procent.
- Misslyckade: 5 av 20, 25 procent.
- `too-many-generated-images`: 0 av 20.
- Genomsnittlig tid för alla körningar: 224 sekunder.
- Genomsnittlig tid för lyckade körningar: 223 sekunder.
- Snabbaste körning: 159 sekunder.
- Långsammaste körning: 305 sekunder.
- De 15 lyckade scenerna innehöll i genomsnitt 34,4 noder, med ett spann från 23 till 46.

## Verifiering av bildtakets borttagning

De två Creative Briefs som stoppades av bildtaket i baslinjen lyckades nu:

- Velociped 72: lyckad, 30 noder och 5 medianoder.
- Floralia: lyckad, 33 noder och 6 medianoder med 6 olika bildreferenser.

Floralia verifierar att en giltig scen med fler än fem bilder nu passerar materialiseringen. Inget försök i serie 2 gav `too-many-generated-images`.

Den isolerade ändringen uppnådde därför sitt avsedda resultat och ska behållas.

## Jämförelse med baslinjen

Baslinjen bestod av QuriÅsa-referensen och 19 nya körningar. De 19 nya körningarna gav 14 lyckade och 5 misslyckade. Serie 2 består av 20 helt nya körningar och gav 15 lyckade och 5 misslyckade.

Felbilden förändrades:

- `too-many-generated-images`: från 2 till 0.
- `free-scene-contract`: från 1 till 0.
- `image-generation-failed`: från 1 till 0.
- `layout-compilation-conflict`: från 1 till 3.
- körnings-/transportfel: från 0 till 2.

Den totala lyckandefrekvensen är nästan oförändrad, men det åtgärdade kontraktsfelet har försvunnit. De återstående misslyckandena har andra orsaker och ska inte blandas ihop med bildtaket.

## Återkommande layoutkompilatorfel

Tre körningar stoppades i `geometry-and-layout`:

- Vildmarksljus: textöverlappning för `node_landscape_caption`.
- Söder Juridik: flera textöverlappningar samt noder utanför den skapade scenens gränser.
- Nattfrekvens: fel profil-id för deklarerad viewport och avvikelse mellan tillämpade och förväntade responsiva operationer.

Detta är nu ett återkommande felmönster. Det analyseras separat efter serien; ingen kompilatorkod ändrades under körningen.

## Körnings- och transportfel

Två körningar gav `runner-error`:

- Andrum Studio: servern svarade med vanlig text (`Server error`) i stället för JSON.
- Byggnadsvård Berg: klientanropet slutade med `fetch failed`.

Serverloggen fångade dessutom `ReferenceError: resolvedNodes is not defined` från `preflight` i `v2/layout-compiler.mjs`. Felet är en konkret koddefekt och kan förklara minst ett av serverfelen. Det ska utredas separat från AI-resultat och externa transportfel.

## Bildåteranvändning – endast observation

Fem av 15 lyckade sidor återanvände minst en bildreferens:

- Grön Sked.
- Mikrokosmos.
- Flowmetric.
- Svartlinje.
- Motorverket.

Mönstret är vanligare än i baslinjen, där tre av 14 lyckade nya sidor gjorde det. Ingen regel har införts och ingen kod har ändrats, eftersom serien inte avgör om varje enskild repetition är avsiktlig eller oavsiktlig.

## Slutsats

Stoppet `too-many-generated-images` är borttaget och den befintliga kön kan nu materialisera fler än fem giltiga bildassets. Den ändringen är verifierad.

Nästa återkommande tekniska problem är `layout-compilation-conflict`, inklusive den separata `resolvedNodes`-defekten. Bildåteranvändning ska fortsatt behandlas som en kvalitetsobservation tills avsiktlig repetition kan skiljas från oavsiktlig bildbrist.
