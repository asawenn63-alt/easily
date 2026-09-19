# QuriAsa: typografi och komponentbeslut, ett separat test

## Avgränsning och ändring

Endast två prompttexter i `greenfield-engine/generate.mjs` ändrades. Art Direction ombeds skilja sina tre alternativ även i typografisk hierarki/komponentuttryck, ange font-stack och storleksrelationer samt fatta separata beslut om etiketter, numrering och footer. Kodprompten ombeds bevara dessa beslut och uttryckliga bortval. Inget typsnitt, ingen palett och ingen branschstil föreskrivs eller förbjuds.

Jämförelse av hela generatorfilen med de två promptkropparna borttagna var identisk före/efter. Schema, säkerhetskontroll, API-anrop, bildgenerering, modeller och körlogik är oförändrade. Ingen V1-/V2-/editor-/serverändring.

OpenAI Docs användes för att hålla ändringen avgränsad och utvärdera den mot faktiskt resultat, inte anta att instruktionen räcker: https://developers.openai.com/api/docs/guides/latest-model#prompting-best-practices

## Låst input och konfiguration

- Samma befintliga brief, inte en ändrad kopia: `briefs/quriasa-romantic-clarified-20260827.json`.
- Briefens fil-SHA256: `775c65f3ea8829bdcda470caa42b66cf2b0ba4e9abb39f8b2529ed01f3431079`.
- Semantisk brief-hash i generation.json: `c258741b0952aba1d5ca998ce4e3f861b202466bd0b86cbba3558d4619665aac`.
- Generatorfilens SHA256 vid körningen: `c1147b1dfdb58ffb5498c7d1b228ec866193076777b66f8386cdde338324550b`.
- Modell: `gpt-5.6-sol`, befintliga parametrar oförändrade.
- Bilder: `gpt-image-1-mini`, medium, WebP, befintliga aspect-ratio-storlekar.
- Ingen extern fontladdning eller nya lokala fontassets infördes; befintlig isolering kvarstår.

## Körning

Kommandot var `node greenfield-engine/generate.mjs briefs/quriasa-romantic-clarified-20260827.json quriasa-type-decisions-20260827`.

Försök `quriasa-type-decisions-20260827-2026-08-27T18-04-32-335Z` stoppades med `fetch failed` innan något AI-resultat mottogs. Ett tekniskt omförsök med samma input och nätverksåtkomst gjordes. Ingen kreativ retry eller efterhandskorrigering.

- Lyckad run: `quriasa-type-decisions-20260827-2026-08-27T18-08-05-856Z`.
- Färdig: `2026-08-27T18:12:07.041Z`.
- Vald riktning: `direction-a`, Den romantiska butikssalongen.
- Output: `greenfield-engine/output/quriasa-type-decisions-20260827/`.
- Preview: http://127.0.0.1:3870/preview/quriasa-type-decisions-20260827/
- AI skapade index.html, styles.css, site.js och fyra WebP-assets. Plan, bundle och manifest finns i run-mappen.
- HTML SHA256: `39d6690f782a37cbfbf69f8ed22af46cd57dcfac67a64c97a2c797335f895cf3`.
- CSS SHA256: `7a7ce0b8a8514ecfa18e0211468962b2d33d5855a0fab707d50048105ee77ce1`.
- JS SHA256: `a0a2daf02cf6d4d3b28f47e03fac04d8148af778f3cd1c88706634145207f2e4`.

## Verifiering och utfall

- `node --check` för generator och genererad site.js: PASS.
- Motorns befintliga isoleringskontroll: PASS under generationen.
- 46 före/efter-hashar för golden-run/output, föregående romantiska run/output och testbrief: alla identiska.
- Browser: hero och kontakt/footer inspekterades i isolerad iframe, kontaktlänken fungerade. Ingen full responsiv testsvit genomfördes.
- Ljusa footer-ytan och bortvald dekorativ numrering följde planen. Navigation och etiketter har vanlig versalisering, inte genomgående versaler.
- Huvudproblemet kvarstår: Georgia, mycket stor rubrik, kursivt rosa nyckelord samt sage/puderrosa återkommer. Alla tre Art Direction-alternativ valde seriffer, trots begäran om skillnad i typografisk hierarki/komponentuttryck.
- Konkret avvikelse: planen anger huvudrubrik cirka 3,5 gånger brödtexten; CSS använder body 16px och hero clamp(3.5rem,7vw,7.4rem), vilket exempelvis vid 1280px blir 89,6px, alltså 5,6 gånger. Plantextens slut är dessutom ofullständigt i flera längdbegränsade fält. Inget av detta korrigerades i testet.

**Bedömning: delvis förbättring, inte PASS för bruten typografisk standardlösning.** En körning kan inte bevisa generell variation eller isolera slumpmässig variation från promptens effekt. Ingen ny generation, automatisk fix eller vidare arkitektur ingår.
