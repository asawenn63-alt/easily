# Analys av `openai-error` – 2026-09-13

## Vad datan faktiskt visar

Den avslutande stabiliseringsserien gav nio `openai-error`. Felen inträffade i flera olika steg:

- sex i `creative-vision`,
- två i `free-visual-scene`,
- ett i `geometry-and-layout`.

De första nio fullständiga genereringarna lyckades. Därefter kom en tydlig felklunga omkring 13:43. Sex anrop avvisades efter cirka en sekund, medan tre fel kom efter längre pågående arbete.

Mönstret talar emot ett specifikt scen-, prompt- eller layoutfel: samma felklass uppstod före scenen, under scenen och under geometrin. De omedelbara avvisningarna är förenliga med ett externt API-avslag, exempelvis kapacitets-, kvot- eller hastighetsbegränsning, men den exakta orsaken kan inte bevisas från den sparade serien.

## Varför exakt orsak saknades

`structuredResponse` i `server/free-scene-ai.mjs` läser redan OpenAI-svarets:

- HTTP-status,
- felmeddelande,
- felkod,
- felparameter.

Men `appendV2GenerationDiagnostic` i `server/index.mjs` sparade inte dessa toppnivåfält. Stabiliseringsköraren i `tools/run-v2-stabilization.mjs` tog inte heller med dem i rådata. Alla externa API-avslag kollapsade därför till etiketten `openai-error`.

Den historiska informationen går inte att återskapa i efterhand. Det vore därför fel att redan nu påstå att samtliga nio fel var exempelvis HTTP 429.

## Genomförd diagnostikändring

Följande fält sparas nu både i serverdiagnostiken och i kommande stabiliseringsdata:

- `upstreamStatus`,
- `upstreamCode`,
- `upstreamParam`,
- `detail`.

Ändringen påverkar inte anrop, modeller, timeout, återförsök, prompt, scen, layout eller bildlogik. Den bevarar endast den felinformation som tidigare kastades bort.

Servern har startats om så att diagnostiken är aktiv.

## Nästa bevispunkt

Ingen ny 20-serie behövs nu. Nästa verkliga generering som får `openai-error` kommer att visa den exakta upstream-statusen och felkoden. Först då går det att välja rätt åtgärd utan gissningar, exempelvis:

- kontrollerad väntan vid HTTP 429,
- särskild hantering av kapacitetsfel,
- rättning av en ogiltig API-parameter,
- eller ingen kodändring alls om felet är ett tillfälligt tjänstfel.

## Slutsats

`openai-error` är för närvarande en samlingsetikett, inte en teknisk rotorsak. Tidsmönstret pekar mot externa API-avslag efter en längre belastning, men den tidigare loggningen var otillräcklig för säker klassificering. Diagnostiken är nu komplett och nästa verkliga fel kan analyseras utan en ny stor testserie.
