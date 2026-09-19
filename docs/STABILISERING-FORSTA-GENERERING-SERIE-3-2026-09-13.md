# Stabilisering av första genereringen – serie 3, 2026-09-13

## Avgränsning

Serie 3 hade endast två mål:

1. reparera koddefekten `resolvedNodes is not defined`,
2. reparera återkommande `layout-compilation-conflict` utan att ändra designmotorns estetiska beslut.

Ingen promptprincip, arkitektur, layoutidé eller bildlogik ändrades.

## Genomförda tekniska reparationer

### `resolvedNodes`

`preflight` i `v2/layout-compiler.mjs` använde `resolvedNodes` i kontrollen av obligatoriska bildförhållanden utan att först skapa uppslagstabellen. Tabellen skapas nu från den redan lösta scenens noder innan kontrollen körs.

Den berörda grenen verifierades med en scen som innehåller en obligatorisk `aspect`-relation. Kompileringen passerade och felet har inte återkommit i någon av serie 3-körningarna.

### Responsiv profil och viewport

Ett återkommande layoutfel bestod av att AI-geometrin kunde ange en viewport som hörde till en annan responsiv profil. Servern väljer nu deterministiskt en giltig representativ viewport för varje redan beslutad profil och normaliserar endast profilens tekniska viewport-metadata före validering. Inga nodpositioner, storlekar, färger, texter eller kompositioner ändras.

### Strukturell omgenerering

När ett geometriutkast saknade den kompletta nodsamlingen eller inte bevarade scenordningen försökte reparationsloopen tidigare slå ihop en partiell rättning med en struktur som inte kunde bli giltig. Fel med `resolvedNodes` eller `resolvedSceneOrder` leder nu till full teknisk omgenerering av endast den berörda responsiva profilen. Övriga profiler och den fria visuella scenen lämnas orörda.

Geometriloopen har fem försök i stället för tre. Den får bara rätta rapporterade tekniska konflikter och får inte komponera om scenen.

## Körresultat

Tre mätningar användes under den isolerade reparationen. Rådata finns i:

- `server/data/stabilization/v2-series-3-stabilization-2026-09-13T08-32-24-981Z.jsonl`
- `server/data/stabilization/v2-series-3-stabilization-2026-09-13T09-11-35-396Z.jsonl`
- `server/data/stabilization/v2-series-3-stabilization-2026-09-13T13-22-10-519Z.jsonl`

Första serien efter `resolvedNodes`-reparationen gav 17 lyckade av 20. Ett enda layoutfel återstod: fel responsiv profil/viewport för Fenix Cykelverkstad. Två övriga fel var bildgenereringsfel.

Efter viewport-normaliseringen gav nästa serie 12 lyckade av 20. Den serien påverkades kraftigt av externa OpenAI- och bildfel. Ett enda layoutfel återstod: `resolvedSceneOrder` för Saffran & Rök. Efter den strukturella routingändringen kördes samma brief igen och passerade hela genereringen utan konflikter.

Den avslutande serien gav 9 lyckade av 20 och **0 `layout-compilation-conflict`**. Den råa lyckandefrekvensen, 45 procent, är inte ett rättvist mått på layoutreparationen eftersom 11 körningar stoppades av andra orsaker:

- 9 `openai-error`,
- 1 `image-generation-failed`,
- 1 klient-timeout/`runner-error` efter 305 sekunder.

De nio körningar som nådde hela vägen genom layoutsteget passerade, alltså 9 av 9 i det slutliga giltiga layoutunderlaget. Serien visar däremot inte 90–95 procents stabilitet för hela kedjan; den externa AI-tjänsten blev den dominerande felkällan under den senare delen av körningen.

## Verifiering

- `resolvedNodes is not defined`: 0 förekomster i samtliga tre serie 3-filer.
- `layout-compilation-conflict` i avslutande serie: 0 av 20.
- Riktad omkörning av det sista `resolvedSceneOrder`-fallet: lyckad.
- Syntaxkontroll: `v2/layout-compiler.mjs`, `server/free-scene-ai.mjs` och `tools/run-v2-stabilization.mjs` passerar `node --check`.

## Slutsats

De två avtalade serie 3-felen är reparerade i den observerade körningen. `resolvedNodes`-kraschen är borta och inga layoutkompilatorkonflikter återstod i den avslutande 20-serien.

Det går ännu inte att säga att hela genereringskedjan är stabil, eftersom den avslutande serien i stället stoppades av många externa `openai-error`. Det felet ligger utanför serie 3:s låsta omfattning och har därför inte ändrats eller dolts i denna reparation.
