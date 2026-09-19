# Easilys bindande femfrågearkitektur

## Grundprincip

De fem svaren är absolut sanning om kunden. Creative Director har kreativ frihet inom den sanningen men får aldrig förändra, motsäga eller komplettera kundens fakta.

Creative Director måste göra en semantisk kreativ tolkning. En verksamhet för barnkläder ska exempelvis kunna väcka en egen relevant visuell värld av värme, lek, trygghet, rörelse och mjukhet utan att användaren behöver ange varje designbeslut. Den får däremot inte hitta på priser, material, adress, leveransvillkor eller andra verksamhetsfakta.

## De fem frågorna

1. Typ av webbplats.
2. Företagsnamn, ort och verksamhetsbeskrivning.
3. Kryss för Om oss, Tjänster, Galleri och Kontakt.
4. Önskad designstil samt eventuella egna färgönskemål; annars härleds paletten ur stilvalet och verksamheten.
5. Befintlig webbplats eller eget material.

Ingen sida får genereras före bekräftad fråga 5.
Kryssen väljer innehåll, inte sektionsmallar. Hero och footer skapas alltid. Den fria designmotorn bestämmer en enda sammanhängande första komposition från briefen; nya innehållsdelar läggs till först efteråt via **Lägg till**.

## Bindande körkedja

`Question Engine → Creative Brief → Creative Vision → Fri visuell scen → Deterministisk grafmontering → Contract Validation → Layoutkompilator → Primitiv Renderer → Visual Validation`

### Creative Brief

- Innehåller endast användarens svar och normaliserade fakta.
- Är enda auktoriteten för kundfakta och uttryckliga begränsningar.
- Får inte kompletteras med antaganden som presenteras som fakta.

### Creative Vision

- Börjar med en obligatorisk semantisk läsning av namn, ordval, erbjudande, målgrupp och stilval.
- Översätter de starkaste associationerna till synliga designkonsekvenser. "Hunddagis Rastafari" kan därför leda till varm reggae-energi och röd–gul–grön färgspänning; barnkläder kan leda till mjukhet, pasteller och lekfull fantasi. Det är kreativ inferens, inte en mall.
- Väljer en verklig designvärld. Mörk dramatik, högteknologi, lyx, viktorianskt, retro, editorial, skandinaviskt, brutalism, futurism, lekfullhet, monokromt och cinematisk form är exempel, inte mallnamn.
- Tre kandidater måste skilja sig på minst sex visuella axlar. En annan färgpalett på samma uppbyggnad är inte en annan riktning.
- Tolkar briefens innebörd som en erfaren Creative Director och Art Director.
- Formulerar kärnidé, emotionellt löfte, synvinkel, sinnlig värld, central spänning och besökarens önskade förändring.
- Får inferera kreativ riktning men inte nya kundfakta.
- Beslutas innan visuella grundelement och proportioner placeras.

### Fri visuell scen

- Den första webbplatsen komponeras som en enda sidlång grafisk canvas med hero, valt innehåll och footer.
- Varje scen anger primär fokuspunkt, stöd, blickordning, gruppering, balans och negativ yta.
- Den får endast tänka i text, bild, knapp, yta, grupp, linje, form och mellanrum.
- Den får inte känna till `component`, `variant`, `sectionType`, `componentStrategy`, mallar eller färdiga grids.
- Alla visuella element, relationer, proportioner och responsiva avsikter ska beskrivas innan teknisk kompilering börjar.
- Flera innehållsdelar får tillhöra samma scen när de ska upplevas som ett enda visuellt ögonblick.
- Variation är inte ett mål i sig. Repetition eller variation måste vara kreativt motiverad.

### Deterministisk grafmontering

- Designmotorn producerar visuella beslut och bildavsikter, inte versionsfält, hashvärden, manifest-id:n eller provenancebokföring.
- Servern monterar dessa tekniska fält deterministiskt innan kontraktsvalideringen.
- Modellskapad text utan säker faktakoppling märks konservativt som förslag som kräver bekräftelse; servern får aldrig uppgradera den till verifierat kundfaktum.
- En lös referens i en valfri färgkompatibilitetslista får tas bort utan AI-anrop eftersom den inte är ett visuellt beslut.
- En färgroll som faktiskt används av en nod får aldrig gissas, bytas eller raderas. Saknas rollen går den exakta konflikten tillbaka till scenens kontraktsreparation eller stoppar körningen.
- Grafmonteringen får aldrig skapa, ta bort eller flytta visuella noder, relationer, färger, typografi eller scener.

### Blueprint

- Är ett hash-låst tekniskt paket av den fria visuella scenen, valideringen och dess lösta viewportprofiler.
- Bevarar den fria scenen oförändrad som auktoritativ källa.
- Får inte skapa text, knappar, sidor, sektioner, stil eller layout.

### Layoutkompilator

- Får aldrig skapa, ersätta eller omkomponera en layout.
- Får endast översätta den fria visuella scenen till tekniskt korrekt HTML/CSS och responsiv layout utan att ändra designidén.
- Om den fria scenen inte kan översättas tekniskt ska kompileringen avbrytas.
- Vid avbrott ska den exakta konflikten rapporteras tillbaka till designmotorn.
- Ingen automatisk omdesign, komponentmatchning, sektionsersättning eller estetisk fallback får ske.
- Designmotorns visuella beslut ska bevaras genom hela renderingskedjan.

### Renderer

- Återger låsta beslut utan egna standardval.
- Mappar endast scenens grundelement till stabila DOM-primitiver.
- Väljer exakt den redan lösta viewportprofilen och får inte skapa egna responsiva regler.
- Får inte känna till komponenter, sektionstyper, branscher eller layoutvarianter.

### Visual Validation

Resultatet ska stoppas innan leverans om det har:

- horisontellt överflöd eller klippta kanter,
- okontrollerade kollisioner,
- oläsbar text,
- orimliga tomrum eller skärmhöjder,
- saknad hero eller footer,
- element som bryter mot briefen,
- en viewport-scen utan tydlig fokuspunkt och blickordning.

## Auktoritetsgränser

- Användaren äger fakta, önskemål och begränsningar.
- Creative Director äger den kreativa visionen och samtliga visuella beslut.
- Den fria visuella scenen är enda auktoriteten för kompositionen.
- Servern äger endast deterministisk teknisk grafmetadata och konservativ provenanceklassning.
- Layoutkompilatorn äger endast teknisk översättning och får avbryta vid konflikt.
- Blueprint äger endast låsning, referenser och spårbarhet.
- Renderer äger endast deterministiskt utförande av redan löst geometri.
- Codex utvecklar och testar systemet men deltar inte i körkedjan när en kund genererar en sida.
