# Stabilisering av första genereringen – baslinje 2026-09-12

## Syfte

Verifiera den låsta principen för fri visuell komposition genom 20 verkliga genereringar utan att ändra motorn mellan försöken.

QuriÅsa-sidan med generation `gen_8517b1413ac84295aa6978aa0b403896` används som referens 1. Därefter kördes 19 nya Creative Briefs genom den aktiva V2-kedjan. Fallen varierade verksamhetstyp, målgrupp, efterfrågat innehåll och samtliga fem designval.

Rådata för de 19 nya körningarna finns i `server/data/stabilization/v2-prompt-stabilization-2026-09-12T17-42-48-733Z.jsonl`.

## Resultat

- Totalt: 20 genereringar.
- Lyckade: 15 av 20, 75 procent.
- Misslyckade: 5 av 20, 25 procent.
- De 19 nya körningarna tog i genomsnitt 194 sekunder.
- Snabbaste nya körning: 103 sekunder.
- Långsammaste nya körning: 295 sekunder.

Alla 14 lyckade nya körningar skapade exakt en första V2-scen. De innehöll i genomsnitt 32 noder, med ett spann från 22 till 47 noder.

De lyckade scenerna använde fria berättande grupper såsom materialintroduktion, bildpassage, råvarans berättelse, koncentrerat verksamhetsmanifest, fragmenterat bildfält, kontaktpunkt och stilla landning. Resultatet stöder därför att den nya promptprincipen åter har gett designmotorn tillgång till kapitel, rytm och berättande områden.

## Återkommande observationer

### Fler bilder än den aktiva gränsen

Två oberoende genereringar, Velociped 72 och Floralia, stoppades med `too-many-generated-images`. Den aktiva bildkedjan avvisar en scen som innehåller fler än fem väntande AI-bilder.

Detta är seriens första återkommande felklass och ska utredas som ett generellt stabilitetsproblem, inte lösas genom ett specialfall för verksamheterna.

### Samma bild används flera gånger

Tre av 14 lyckade nya genereringar återanvände minst en bildasset i flera bildnoder:

- Nordform Arkitektur.
- Råverket.
- Svartlinje.

Detta är ett återkommande visuellt mönster. Det är inte ett byggfel, men kan minska känslan av en rik bildberättelse.

### Genereringstiden

Samtliga nya körningar tog mellan 103 och 295 sekunder. Den långa och varierande väntan är därför ett verkligt systembeteende, inte enbart en upplevelse från ett enstaka försök.

## Enstaka fel

- Mira Hårateljé: `layout-compilation-conflict` på grund av en kvarstående `text_collision` i Hero.
- Andrum Studio: `image-generation-failed` under bildmaterialiseringen.
- Mikrokosmos: `free-scene-contract`. Första försöket saknade Tjänster. Reparationsförsöken producerade bland annat negativa `tabOrder`-värden och ett otillåtet `repairPatch`-fält.
- QuriÅsa-referensen visade sammanslagna ord runt manuella radbrytningar. Ingen av de 14 lyckade nya körningarna innehöll samma bokstavliga `\\n`-mönster, så detta är ännu inte ett återkommande fel i den nya serien.

## Låst slutsats efter baslinjen

Promptändringen ska inte rullas tillbaka. De lyckade resultaten visar att den fria scenen kan skapa egna visuella berättelser utan legacy-sektioner.

Ingen produktionskod ändrades som reaktion på testresultaten. Nästa åtgärd ska väljas utifrån återkommande fel, med bildtaket och upprepad bildanvändning som de första generella kandidaterna för teknisk orsaksanalys.
