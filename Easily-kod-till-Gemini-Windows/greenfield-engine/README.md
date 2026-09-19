# Easily Greenfield – första vertikala beviset

Den här motorn är fristående från V1 och tidigare V2. Den tar QuriÅsas fem verkliga svar, gör ett enda AI-anrop där modellen är både Creative Director och frontendutvecklare, skapar nya bildassets och visar resultatet i en sandboxad lokal preview.

## Kör

```powershell
cd greenfield-engine
npm run generate:quriasa
npm run preview
```

Miljövariabler:

- `OPENAI_API_KEY` – krävs.
- `EASILY_GREENFIELD_MODEL` – valfri textmodell, standard `gpt-5.6-sol`.
- `EASILY_GREENFIELD_IMAGE_MODEL` – valfri bildmodell, standard `gpt-image-1-mini`.
- `EASILY_GREENFIELD_IMAGE_QUALITY` – standard `medium`.
- `EASILY_GREENFIELD_PORT` – standard `3867`.

AI:n får endast skriva `index.html`, `styles.css` och `site.js`. Externa nätverksresurser och riskfyllda webbläsar-API:er stoppas före preview. Varje körning sparar brief, AI-bundle och den färdiga sajten under `runs/`; den senast lyckade körningen kopieras till `output/quriasa/`.
