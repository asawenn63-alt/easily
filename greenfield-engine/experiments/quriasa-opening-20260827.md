# QuriAsa — innehållsdriven öppning, ett separat försök

## Avgränsning och utfall

En promptändring testades med samma befintliga brief. Inga genererade filer korrigerades. Ingen kreativ retry gjordes. **FAIL för målet att bryta det återkommande hero-paketet.** Det betyder inte att hela sajten är oanvändbar eller att generativ variation är omöjlig.

Efter observation återställdes endast försöksändringen i generate.mjs. Motorns SHA-256 är åter exakt utgångsvärdet: `c1147b1dfdb58ffb5498c7d1b228ec866193076777b66f8386cdde338324550b`. Testets två systemprompter finns bevarade i `quriasa-opening-20260827.prompts.json` bredvid denna rapport. Den testade generatorns SHA-256 var `be03db7b839b7368fba902eb2838e60d190000dfd69086460650d8440fbdbd04`.

Ändringen lät Art Direction ange besökarens förståelse, upptäckt och handling före rubrikbehandling/dekor, och lät kodinstruktionen betona dessa innehållsrelationer. Inga namngivna ersättningslayouter infördes. Jämförelse av källtext med de två promptkropparna undantagna var identisk. Modeller, schema, säkerhetskontroll, API-parametrar, bildgenerering och server ändrades inte.

## Input och körning

- Brief: `briefs/quriasa-romantic-clarified-20260827.json`, oförändrad.
- Filens SHA-256: `775c65f3ea8829bdcda470caa42b66cf2b0ba4e9abb39f8b2529ed01f3431079`.
- Serialiserad brief-hash i generation.json: `c258741b0952aba1d5ca998ce4e3f861b202466bd0b86cbba3558d4619665aac`.
- Kommando: `node greenfield-engine/generate.mjs briefs/quriasa-romantic-clarified-20260827.json quriasa-opening-20260827`.
- Teknisk start `quriasa-opening-20260827-2026-08-27T19-47-53-139Z`: `fetch failed`, inget sparat Art Direction-resultat.
- Identisk teknisk retry med nätverksåtkomst: **`quriasa-opening-20260827-2026-08-27T19-49-44-772Z`**.
- Textmodell: `gpt-5.6-sol`. Bildmodell: `gpt-image-1-mini`, medium, WebP. Inga EASILY_GREENFIELD-miljöoverrides var satta vid genereringen.
- Vald riktning: direction-c, “Presentbordet med spets och porslin”.
- Resultat: index.html, styles.css, site.js och fem bildassets. Källartefakter finns i run-mappen; en separat kopia i `output/quriasa-opening-20260827`.
- Preview: http://127.0.0.1:3871/preview/quriasa-opening-20260827/

## Konkreta observationer

Art Direction väljer själv text/bord ungefär 40/60 på desktop, Baskerville, kursiv betoning samt rosa/salvia. Det återkommande mönstret finns alltså redan i designbeslutet, inte bara i kodgenereringen. Några beskrivningar slutar mitt i meningar vid fältgränserna; detta ändrades inte under försöket.

HTML rad 57–58 har versaletiketten “Shabby chic i Hudiksvall” och rubriken “Fint till hemmet, fint att ge bort”, med andra frasen i em. CSS rad 50 anger text/bild-grid; rad 52 anger spärrade versaler, rad 54 serifrubrikens skala och rad 55 färgad em i både h1 och h2. Samma betoning återkommer i flera sektionsrubriker. Numrerade kategorier 01–04 finns också kvar. Modellen bytte öppningens namn och innehållsidé men övergav inte det visuella paketet.

Den synliga smala förhandsvisningen bekräftade serif, kursiv salviafärgad andra fras, spärrad versal och rosa/salvia-knappar. Desktopens text/bild-delning kontrollerades i genererad HTML/CSS, inte genom en desktop-skärmbild. Detta är en begränsad kontroll, inte en full visuell eller responsiv testsuit.

## Verifiering och stopp

- Generatorns syntax före körning och efter återställning: PASS.
- Den genererade JavaScript-filens syntax: PASS.
- Befintlig assertSafeBundle passerade i den verkliga körningen.
- Browser: sidan laddad; “Handla till hemmet” klickad; “02 Textilier” växlade till expanded medan “01 Småmöbler” stängdes. Fliken återfördes till startsidan och markerades som leverans.
- Browseranslutningen fick först timeout; ny flik efter synliggörande anslöt. Detta var inte en generationsretry.
- SHA-256-jämförelse av samtliga **244 befintliga filer** i runs, output och briefs före/efter körningen: inga ändringar. Inkluderar QuriAsa golden proof och tidigare tester.
- Ingen V1-, V2-, renderer-, asset- eller säkerhetsändring. Inga ytterligare generationer eller korrigeringsrundor.

Output SHA-256:

- index.html: `24b9751f99b4218f4119a38b9b6005b22e5f2cbcfdb221339de8c3a4b0cc0fa1`
- styles.css: `c9134a8de2de8295e10f80b5d300252168756a7309ce9fd7ac7a42fb8e903fa0`
- site.js: `d566949e95f865f51fba50f1a22a9fe1117d237cc603be60c573874ca80627db`

**Stopp:** en verklig kreativ körning genomförd. Ingen lösning på huvudmönstret påstås. Den misslyckade promptändringen ligger inte kvar i motorn.
