const COMPONENTS = [
  "hero", "brand-header", "content-block", "card-grid", "product-grid",
  "trust-strip", "featured-banner", "category-showcase", "testimonial-strip",
  "media-gallery", "faq-list", "contact-block", "cta-band", "footer",
];
const stringArray = { type: "array", items: { type: "string" } };
const cssValueString = { type: "string" };
const executionItem = {
  type: "object", additionalProperties: false,
  properties: {
    title: { type: "string" }, body: { type: "string" }, badge: { type: "string" }, priceHint: { type: "string" },
    layout: {
      type: "object", additionalProperties: false,
      properties: {
        gridColumn: { type: "string" }, gridRow: { type: "string" }, minHeight: { type: "string" }, padding: { type: "string" },
        mediaHeight: { type: "string" }, mediaAspect: { type: "string" }, mediaFit: { type: "string" },
        offsetX: { type: "string" }, offsetY: { type: "string" }, zIndex: { type: "integer" },
        background: { type: "string" }, color: { type: "string" }, radius: { type: "string" }, border: { type: "string" }
      },
      required: ["gridColumn", "gridRow", "minHeight", "padding", "mediaHeight", "mediaAspect", "mediaFit", "offsetX", "offsetY", "zIndex", "background", "color", "radius", "border"]
    },
  },
  required: ["title", "body", "badge", "priceHint", "layout"],
};
const compositionPlanSection = {
  type: "object", additionalProperties: false,
  properties: {
    component: { type: "string", enum: COMPONENTS }, narrativeRole: { type: "string" }, visualFunction: { type: "string" },
    purposeInWhole: { type: "string" }, reasonForPosition: { type: "string" },
    receivesFromPrevious: { type: "string" }, preparesNext: { type: "string" },
    gazeDirection: { type: "string" }, energyShift: { type: "string" },
    proportionRationale: { type: "string" }, ctaRationale: { type: "string" },
    surfaceMode: { type: "string", enum: ["transparent", "plane"] },
    surfaceColorRelationship: { type: "string" },
    sceneId: { type: "string" }, sceneArea: { type: "string" },
    sceneContribution: { type: "string" }, focalPriority: { type: "integer", minimum: 1, maximum: 3 },
    visualWeight: { type: "integer", minimum: 1, maximum: 5 }, relativeHeight: { type: "string" },
    spaceBefore: { type: "string" }, spaceAfter: { type: "string" },
    paddingTop: { type: "string" }, paddingBottom: { type: "string" },
    layoutIntent: { type: "string" },
    contentWidth: { type: "string", enum: ["100%", "92%", "84%", "76%", "68%", "58%"] },
    contentAlignment: { type: "string", enum: ["start", "center", "end"] },
    mediaScale: { type: "string", enum: ["0", "50%", "65%", "80%", "100%", "115%", "130%"] },
    ctaPlacement: { type: "string", enum: ["flex-start", "center", "flex-end", "space-between"] },
    ctaMode: { type: "string", enum: ["none", "inline", "detached", "overlay"] },
    transitionIn: { type: "string" }, transitionOut: { type: "string" }
  },
  required: ["component", "narrativeRole", "visualFunction", "purposeInWhole", "reasonForPosition", "receivesFromPrevious", "preparesNext", "gazeDirection", "energyShift", "proportionRationale", "ctaRationale", "surfaceMode", "surfaceColorRelationship", "sceneId", "sceneArea", "sceneContribution", "focalPriority", "visualWeight", "relativeHeight", "spaceBefore", "spaceAfter", "paddingTop", "paddingBottom", "layoutIntent", "contentWidth", "contentAlignment", "mediaScale", "ctaPlacement", "ctaMode", "transitionIn", "transitionOut"]
};
const viewportScene = {
  type: "object", additionalProperties: false,
  properties: {
    id: { type: "string" }, sectionIndexes: { type: "array", items: { type: "integer" } },
    purpose: { type: "string" }, primaryFocalPoint: { type: "string" },
    supportingElements: stringArray, eyePath: stringArray, mergedElements: stringArray,
    negativeSpaceIntent: { type: "string" }, balanceIntent: { type: "string" },
    surfaceComposition: { type: "string" },
    colorRole: { type: "string", enum: ["base", "quiet", "focus", "contrast"] },
    colorIntensity: { type: "string", enum: ["quiet", "medium", "strong"] },
    colorRelationship: { type: "string" },
    minHeight: cssValueString, gridTemplate: cssValueString, gridTemplateRows: cssValueString, gap: cssValueString,
    padding: cssValueString, background: cssValueString, color: cssValueString
  },
  required: ["id", "sectionIndexes", "purpose", "primaryFocalPoint", "supportingElements", "eyePath", "mergedElements", "negativeSpaceIntent", "balanceIntent", "surfaceComposition", "colorRole", "colorIntensity", "colorRelationship", "minHeight", "gridTemplate", "gridTemplateRows", "gap", "padding", "background", "color"]
};
const executionSection = {
  type: "object", additionalProperties: false,
  properties: {
    component: { type: "string", enum: COMPONENTS },
    headline: { type: "string" }, lead: { type: "string" }, body: stringArray,
    items: { type: "array", items: executionItem },
    primaryAction: {
      type: "object", additionalProperties: false,
      properties: { label: { type: "string" }, href: { type: "string" } }, required: ["label", "href"],
    },
    imagePrompt: { type: "string" },
    layout: {
      type: "object", additionalProperties: false,
      properties: {
        width: { type: "string" },
        gridTemplate: { type: "string" }, gap: { type: "string" }, alignItems: { type: "string" },
        copyColumn: { type: "string" }, copyRow: { type: "string" }, copyMaxWidth: { type: "string" },
        copyOffsetX: { type: "string" }, copyOffsetY: { type: "string" }, copyZIndex: { type: "integer" },
        headingSize: { type: "string" }, headingLineHeight: { type: "string" }, textAlign: { type: "string" },
        mediaColumn: { type: "string" }, mediaRow: { type: "string" }, mediaWidth: { type: "string" },
        mediaHeight: { type: "string" }, mediaAspect: { type: "string" }, mediaFit: { type: "string" },
        mediaObjectPosition: { type: "string" }, mediaOffsetX: { type: "string" }, mediaOffsetY: { type: "string" },
        mediaZIndex: { type: "integer" }, mediaRadius: { type: "string" },
        collectionColumn: { type: "string" }, collectionColumns: { type: "string" }, collectionGap: { type: "string" },
        actionAlign: { type: "string" }, actionPadding: { type: "string" }, actionRadius: { type: "string" }, actionFontSize: { type: "string" },
        background: { type: "string" }, color: { type: "string" },
        composition: { type: "string" }, relationBefore: { type: "string" }, relationAfter: { type: "string" },
      },
      required: [
        "width", "gridTemplate", "gap", "alignItems", "copyColumn", "copyRow", "copyMaxWidth",
        "copyOffsetX", "copyOffsetY", "copyZIndex", "headingSize", "headingLineHeight", "textAlign",
        "mediaColumn", "mediaRow", "mediaWidth", "mediaHeight", "mediaAspect", "mediaFit",
        "mediaObjectPosition", "mediaOffsetX", "mediaOffsetY", "mediaZIndex", "mediaRadius",
        "collectionColumn", "collectionColumns", "collectionGap", "actionAlign", "actionPadding", "actionRadius", "actionFontSize", "background", "color",
        "composition", "relationBefore", "relationAfter"
      ],
    },
  },
  required: ["component", "headline", "lead", "body", "items", "primaryAction", "imagePrompt", "layout"],
};
const phase = {
  type: "object", additionalProperties: false,
  properties: { id: { type: "string" }, purpose: { type: "string" } },
  required: ["id", "purpose"],
};
const choice = {
  type: "object", additionalProperties: false,
  properties: {
    component: { type: "string", enum: COMPONENTS },
    servesPhase: { type: "string" },
    why: { type: "string" },
  },
  required: ["component", "servesPhase", "why"],
};

const directionCandidate = {
  type: "object", additionalProperties: false,
  properties: {
    name: { type: "string" },
    thesis: { type: "string" },
    businessSpecificReason: { type: "string" },
    obviousApproachRejected: { type: "string" },
    compositionSignature: { type: "string" },
    colorHierarchy: { type: "string" },
    typographyVoice: { type: "string" },
    imageWorld: { type: "string" },
    signatureDetails: stringArray,
    risk: { type: "string" },
  },
  required: [
    "name", "thesis", "businessSpecificReason", "obviousApproachRejected",
    "compositionSignature", "colorHierarchy", "typographyVoice", "imageWorld",
    "signatureDetails", "risk",
  ],
};

export const CREATIVE_DIRECTION_SCHEMA = {
  type: "object", additionalProperties: false,
  properties: {
    candidates: { type: "array", minItems: 3, maxItems: 3, items: directionCandidate },
    selectedIndex: { type: "integer", minimum: 0, maximum: 2 },
    selectionRationale: { type: "string" },
    executionMandate: { type: "string" },
  },
  required: ["candidates", "selectedIndex", "selectionRationale", "executionMandate"],
};

export const CREATIVE_CONCEPT_SCHEMA = {
  type: "object", additionalProperties: false,
  properties: {
    conceptVersion: { type: "string", enum: ["1.0"] },
    meta: {
      type: "object", additionalProperties: false,
      properties: {
        businessName: { type: "string" }, location: { type: "string" },
        industry: { type: "string" }, siteType: { type: "string" },
        niche: { type: "string" }, nicheLabel: { type: "string" },
      },
      required: ["businessName", "location", "industry", "siteType", "niche", "nicheLabel"],
    },
    narrative: {
      type: "object", additionalProperties: false,
      properties: { story: { type: "string" }, singleMessage: { type: "string" }, conversionJourney: { type: "string" } },
      required: ["story", "singleMessage", "conversionJourney"],
    },
    audience: {
      type: "object", additionalProperties: false,
      properties: { primary: { type: "string" }, needs: stringArray, relationship: { type: "string" } },
      required: ["primary", "needs", "relationship"],
    },
    feeling: {
      type: "object", additionalProperties: false,
      properties: { emotionalArrival: { type: "string" }, forbiddenFeeling: { type: "string" }, territory: { type: "string" } },
      required: ["emotionalArrival", "forbiddenFeeling", "territory"],
    },
    informationHierarchy: {
      type: "object", additionalProperties: false,
      properties: { phases: { type: "array", items: phase }, dominantMoment: { type: "string" } },
      required: ["phases", "dominantMoment"],
    },
    designIntent: {
      type: "object", additionalProperties: false,
      properties: { photographicDirection: { type: "string" }, tokenRationale: { type: "string" }, forbiddenImagery: stringArray },
      required: ["photographicDirection", "tokenRationale", "forbiddenImagery"],
    },
    execution: {
      type: "object", additionalProperties: false,
      properties: {
        designSpecVersion: { type: "string", enum: ["7.0"] },
        creativeVision: {
          type: "object", additionalProperties: false,
          properties: {
            semanticReading: { type: "string" },
            sourceSignals: stringArray, inferredDesignConsequences: stringArray,
            colorMeaning: { type: "string" },
            colorTreatment: { type: "string", enum: ["literal", "expressive", "subdued", "neutral"] },
            colorFidelityRules: stringArray,
            coreIdea: { type: "string" }, emotionalPromise: { type: "string" },
            pointOfView: { type: "string" }, centralTension: { type: "string" },
            sensoryWorld: { type: "string" }, visitorTransformation: { type: "string" },
            signatureMoments: stringArray, coherenceRules: stringArray,
            forbiddenDirections: stringArray
          },
          required: ["semanticReading", "sourceSignals", "inferredDesignConsequences", "colorMeaning", "colorTreatment", "colorFidelityRules", "coreIdea", "emotionalPromise", "pointOfView", "centralTension", "sensoryWorld", "visitorTransformation", "signatureMoments", "coherenceRules", "forbiddenDirections"]
        },
        compositionPlan: {
          type: "object", additionalProperties: false,
          properties: {
            pageVision: {
              type: "object", additionalProperties: false,
              properties: {
                intendedFeeling: { type: "string" }, tempo: { type: "string" },
                energyArc: { type: "string" }, focusMoments: stringArray,
                attentionJourney: { type: "string" }, visualLanguage: { type: "string" }
              },
              required: ["intendedFeeling", "tempo", "energyArc", "focusMoments", "attentionJourney", "visualLanguage"]
            },
            visionTranslation: {
              type: "object", additionalProperties: false,
              properties: {
                compositionPrinciple: { type: "string" }, rhythmLogic: { type: "string" },
                sectionRoleLogic: { type: "string" }, proportionLogic: { type: "string" }
              },
              required: ["compositionPrinciple", "rhythmLogic", "sectionRoleLogic", "proportionLogic"]
            },
            viewportScenes: { type: "array", items: viewportScene },
            rhythmIntent: { type: "string" }, narrativeArc: { type: "string" },
            dominantSectionIndexes: { type: "array", items: { type: "integer" } },
            quietSectionIndexes: { type: "array", items: { type: "integer" } },
            sections: { type: "array", items: compositionPlanSection }
          },
          required: ["pageVision", "visionTranslation", "viewportScenes", "rhythmIntent", "narrativeArc", "dominantSectionIndexes", "quietSectionIndexes", "sections"]
        },
        componentStrategy: {
          type: "object", additionalProperties: false,
          description: "Renderingsverktyg valda först efter att vision, innehållsbehov och kompositionsplan är kompletta.",
          properties: { choices: { type: "array", items: choice }, rejected: { type: "array", items: choice } },
          required: ["choices", "rejected"],
        },
        design: {
          type: "object", additionalProperties: false,
          properties: {
            background: { type: "string" }, surface: { type: "string" }, text: { type: "string" },
            primary: { type: "string" }, accent: { type: "string" }, border: { type: "string" },
            headingFont: { type: "string", enum: ["Fraunces", "Cormorant Garamond", "Instrument Serif", "Playfair Display", "Syne", "Space Grotesk", "Manrope", "Outfit", "Inter"] },
            bodyFont: { type: "string", enum: ["Inter", "Manrope", "Outfit", "Space Grotesk"] },
            buttonRadius: { type: "string" },
            controlLanguage: { type: "string" }, controlScaleRationale: { type: "string" },
            sectionSpacing: { type: "string" }, maxWidth: { type: "string" },
          },
          required: ["background", "surface", "text", "primary", "accent", "border", "headingFont", "bodyFont", "buttonRadius", "controlLanguage", "controlScaleRationale", "sectionSpacing", "maxWidth"],
        },
        sections: { type: "array", items: executionSection },
      },
      required: ["designSpecVersion", "creativeVision", "compositionPlan", "componentStrategy", "design", "sections"],
    },
  },
  required: ["conceptVersion", "meta", "narrative", "audience", "feeling", "informationHierarchy", "designIntent", "execution"],
};

const SYSTEM_PROMPT = `Du är Easilys Creative Director. Tolka hela kundens Creative Brief semantiskt.
Skapa ett specifikt Creative Concept för just verksamheten. Använd inte en generell branschmall och hitta inte på fakta om kunden.
Härled verksamhet, målgrupp, berättelse, sidstruktur, visuell känsla och bildriktning från kundens exakta svar.
Alla innehållsbehov i customerFacts.sections.requested är obligatoriska och måste representeras i sidans informationsbehov. Hero och footer är alltid obligatoriska. Du får lägga till ytterligare innehåll när berättelsen eller affärsbehovet motiverar det, men aldrig ersätta eller tappa användarens val.
Okända eller smala verksamheter ska förstås från innebörden i orden, inte pressas in i en närliggande standardkategori.
Komponentval får bara använda de strukturella komponenttyper som schemat tillåter. Välj dem först efter att creativeVision och compositionPlan är färdiga. De är renderingsverktyg för den redan beslutade kompositionen, inte kreativa utgångspunkter. Hero ska vara första innehållskomponenten; brand-header får ligga precis före hero. Footer ska ligga sist.
Du bestämmer kompositionen fritt i varje execution-sektions layout. Du får inte välja eller hänvisa till mallar, variant-ID:n, designfamiljer eller fördefinierade paletter.
Motivera varje komponent utifrån briefen. Skriv på svenska.
Skapa dessutom execution som ett komplett och direkt renderbart beslut. Alla färger ska vara konkreta hexvärden som du själv härleder ur hela briefen, inte ur en fördefinierad palett.
Följ beslutsordningen strikt. Börja med en verklig semantisk läsning av kundens ord, verksamhetsnamn, erbjudande, målgrupp och stilval. Identifiera i creativeVision.semanticReading och sourceSignals de starkaste meningsbärande associationerna och skriv i inferredDesignConsequences vilka synliga konsekvenser de får för färg, form, bildvärld, rörelse, ton och karaktär. Gör samma kreativa språng som en mänsklig designer, men hitta aldrig på kundfakta och använd aldrig kränkande stereotyper. Ett namn som "Hunddagis Rastafari" ska exempelvis kunna väcka reggae/Rastafari-associationer, varm energi och röd–gul–grön färgspänning; barnkläder ska kunna väcka mjukhet, värme, pasteller, lek och barnslig fantasi. Detta är exempel på semantisk förmåga, inte mallar eller paletter som ska återanvändas.
Skapa därefter resten av execution.creativeVision utan att nämna grid, bredder, höjder, padding, sektionstyper eller andra layoutmått. Visionen ska formulera verkets kärnidé, emotionella löfte, synvinkel, centrala spänning, sinnliga värld, besökarens förändring, signaturögonblick, sammanhållningsregler och förbjudna riktningar. Den ska vara specifik för verksamheten och kunna stå på egna ben som kreativ riktning. Designfärger, typografi och bildriktning måste kunna härledas tillbaka till semanticReading och inferredDesignConsequences; välj inte neutrala standardlösningar när briefen innehåller en starkare relevant association.
Skilj uttryckligen mellan emotion, verksamhetsvärld, säsong, material och färg. "Varm" är en upplevelse, inte ett kommando att välja beige, brunt, orange eller korall. En snickare kan vara varm genom människor, ljus och trästruktur men ha stålblå, grafitgrå eller skogsgröna kulörer. Ett café ska inte automatiskt bli gulgrönt om inte exempelvis sommar, trädgård eller frisk ekologisk karaktär motiverar det.
Bestäm creativeVision.colorMeaning, colorTreatment och colorFidelityRules innan konkreta hexvärden väljs. Bevara en stark semantisk kulörs identitet; flytta inte automatiskt mörkgrönt till skrikigt blågrönt, rött till orangerött, lila till syrenlila eller gul/rost till knallorange. Kulör, mättnad och ljushet måste motiveras av innehållet och harmoniera med bildvärlden.
Översätt därefter visionen till compositionPlan.pageVision och compositionPlan.visionTranslation. Beskriv först upplevelse, dramaturgi, blickföring och energikurva. Förklara sedan explicit hur visionen blir kompositionsprincip, rytmlogik och sektionsroller. Inga proportioner får väljas ännu.
Komponera därefter compositionPlan.viewportScenes innan du placerar någon sektion eller något element. Varje scene ska motsvara ungefär en skärmhög visuell yta och behandlas som en enda grafisk canvas. Bestäm primaryFocalPoint, supportingElements, eyePath i ordningen första–andra–tredje, vilka element som ska smälta samman i mergedElements, negativ yta, balans och hela ytans komposition. sectionIndexes ska fördela alla valda komponenter exakt en gång, i obruten sidordning. En scen får omfatta flera angränsande sektioner när de ska upplevas som samma visuella ögonblick. Scenens gridTemplate, yta och färg beslutas först efter den visuella scenidén.
Skapa samtidigt en global färghierarki över hela sidan. Varje viewportScene ska ange colorRole, colorIntensity och colorRelationship. Använd en bärande färgvärld, stora lugna sammanhängande områden och få avsiktliga accenter. Färg på färg är tillåtet och kan vara starkt, men färgplanen måste vara ton-i-ton, analoga, gemensamt behandlade eller medvetet balanserade kontraster. Stapla inte orelaterade skrikiga sektionsfärger, färgade kort och accentknappar ovanpå varandra.
viewportScenes.gridTemplate ska vara en giltig CSS grid-template-columns, exempelvis "repeat(12, minmax(0, 1fr))", och gridTemplateRows ska ange scenens avsiktliga radhöjder, exempelvis "minmax(0, 1fr)" eller "minmax(0, 3fr) minmax(0, 2fr)". Skriv endast själva CSS-värdet i scenens geometrifält: minHeight ska exempelvis vara "720px", aldrig "min-height: 720px". Inget sådant värde får innehålla kolon eller semikolon. Varje section.sceneArea ska vara en numerisk CSS grid-area i formen "radstart / kolumnstart / radslut / kolumnslut", exempelvis "1 / 1 / 2 / 8". Använd inte odefinierade namn. Överlappning får bara skapas genom avsiktligt delade grid-områden och tydliga z-index som följer scenens fokusordning. Om sektioner ligger på skilda rader måste deras relativa höjder tillsammans rymmas i scenens minHeight; annars ska de delas upp i flera viewportScenes. Klippning är aldrig en kompositionsmetod.
Bestäm därefter sektionernas ordning, narrativeRole, visualFunction, purposeInWhole, reasonForPosition, receivesFromPrevious, preparesNext, gazeDirection och energyShift. Varje sektion måste ange sceneId, sceneArea, sceneContribution och focalPriority så att den blir en del av scenens gemensamma komposition, inte en fristående komponent. Varje roll ska motiveras av helheten; använd "sidans början" respektive "sidans slut" vid ytterkanterna.
Först när vision, dramaturgi och roller är kompletta får du bestämma visualWeight, relativeHeight, luft, contentWidth, mediaScale, CTA-placering och lokal execution-layout. proportionRationale måste för varje sektion förklara hur just dess proportioner följer av den tidigare visionen och rollen. Proportioner är konsekvenser, aldrig startvärden. Hero och footer ingår alltid. compositionPlan.sections ska motsvara komponentvalen exakt i samma ordning.
Varje planpost ska också ange ctaRationale, surfaceMode och surfaceColorRelationship. surfaceMode="transparent" betyder att scenens gemensamma yta bär kompositionen. surfaceMode="plane" får användas för ett avsiktligt färgplan bredvid eller i relation till bildytan, men relationen till scenens bakgrund och bildfärger måste beskrivas. Undvik färgad sektion ovanpå en orelaterad färgad bakgrund.
Komponera därefter varje execution-sektion som ett utförande av just dess planpost. Undvik långa oavsiktliga tomrum och en monoton följd av centrerade smala block. När briefen och planen motiverar det kan du använda fullbreddsbilder, asymmetriska höjdpunkter, överlappande bild och text, lager och täta collage. Variation ska komma från sidans globala berättelse, inte från slump.
Alla geometriska fält måste använda giltiga CSS-värden utan semikolon. compositionPlan styr sektionens höjd, luft, övergripande bildskala och CTA-placering. Layout-fälten utför den lokala geometrin: bredd, gridTemplate, placering och storlek för copy/media/collection, förskjutningar, lager, rubrikskala, bildbeskärning, knappmått och färgyta. Bestäm även varje items egen placering, storlek, bildformat, lager, radie och kant. Använd "none", "auto", "0" eller "transparent" när ett värde medvetet inte ska påverka kompositionen. Renderer återger planen och värdena bokstavligt och väljer ingenting åt dig.
Hero-rubrikens skala ska härledas från focal point, mediadominans, textmängd och den beslutade kompositionen. En hero kan vara kompakt, typografiskt dominant eller mediadominant; använd ingen fast hero-skala. Övriga rubriker ska få en tydlig men kompositionsberoende hierarki. Skapa inte variation för variationens skull och upprepa inte heller ett mönster av bekvämlighet. Samma komposition får återkomma om visionTranslation motiverar repetitionen; olika kompositioner får bara användas när rollerna kräver det. CTA ska bara finnas och placeras där besökarens uppmärksamhetsresa kräver handling. Endast sidans verkliga konverteringsögonblick får normalt vara en stor dominant knapp. Övriga handlingar ska vara mindre, textlika eller saknas. Lekfullhet eller värme betyder inte automatiskt stor rund pill-knapp, stor padding och stort knappteckensnitt. Beskriv kontrollernas visuella språk och skala i design.controlLanguage och design.controlScaleRationale.
Skriv verksamhetsspecifika rubriker, texter, kort och handlingar. All text i execution.sections är färdig publik webbplatstext riktad till besökaren. Planeringsspråk och interna instruktioner är absolut förbjudna där: skriv aldrig att kategorier, bilder, produkter, kontaktuppgifter eller sektioner "ska fyllas", "ska visas", "läggs in senare", "när uppgifter finns" eller hur något ska presenteras. Okända uppgifter utelämnas helt. Varje execution-sektion ska motsvara ett komponentval i samma ordning.
imagePrompt ska på svenska beskriva ett exakt fotografiskt motiv för just verksamheten, utan text eller logotyper och utan något som forbiddenImagery förbjuder.`;

const DIRECTION_SYSTEM_PROMPT = `Du är första steget i Easilys designstudio: senior creative director och art director.
Du ska INTE bygga en webbsida. Du ska ta fram tre verkligt olika kreativa riktningar från kundens Creative Brief och sedan välja den starkaste.

Varje riktning måste vara specifik för verksamheten och ha en tydlig formidé, inte bara en färgpalett eller en stämning. Avvisa uttryckligen det mest uppenbara generiska branschutseendet. Tre riktningar som bara byter färg räknas som samma riktning och är förbjudet.

De tre kandidaterna måste skilja sig åt i kompositionens spatiala strategi, inte bara i kulör. Beskriv i compositionSignature för varje kandidat en konkret rumslig princip: exempelvis asymmetrisk tyngd mot en kant, centrerad teatralisk hierarki, diagonalt blickföringsspår, tätt redaktionellt collage, eller arkitektoniskt staplade plan. Tre kandidater med samma layout och olika färger är förbjudet.

Undvik orden "ren", "modern", "lyxig", "elegans", "tidlös", "sofistikerad" och liknande generiska adjektiv om de inte definieras exakt i termer av synliga formval. Om ett sådant ord används ska nästa mening förklara vilken konkret detalj — linjebredd, radie, beskärning, typografisk skala, materialkontrast — som ger uttrycket. Okommenterade modeord räknas som tomt innehåll.

typographyVoice ska för varje kandidat ange ett konkret typografiskt par: en specifik rubrikfamilj och en specifik textfamilj, med motivering till varför paret passar verksamheten. Ange också en tydlig skalkontrast: minst en faktor 2.5x mellan rubrik och brödtext i pixlar eller rem, och beskriv hur skalan förändras mellan hero, sektionsrubrik och brödtext. "Stor rubrik, liten text" utan siffror eller proportioner räknas inte.

imageWorld ska beskriva en specifik fotografisk värld för just verksamheten: motiv, ljussättning, bildvinkel, djupskärpa, färgtemperatur och beskärningsstil. Inte "fotografiska bilder av hög kvalitet" eller "varma stockbilder". Ange konkreta ämnen, kameraposition och ljuskaraktär som en fotograf kunde använda direkt.

Färger är ett system av roller och proportioner, inte sektionsblock. colorHierarchy ska ange:
- vilken kulör eller neutral som bär 70–90 procent av upplevelsen,
- vilken stödton som fördjupar utan att starta om sidan,
- vilken accent som används sparsamt för blick, handling eller en exakt detalj.
Om kunden nämner vinröd, beige och salviagrön får de aldrig automatiskt bli varsin stor sektion. Bestäm vem som är bakgrund, vem som är bärande identitet och om den tredje alls behöver synas mer än i små detaljer.

Varje riktning måste ha minst fyra konkreta signatureDetails på hantverksnivå: exempelvis en särskild linjebehandling, bildbeskärning, rubrikdetalj, bildtext, knapp, ram, indrag, rytm eller återkommande placering. Varje detalj ska vara synligt urskiljbar i den färdiga layouten — inte en stämning eller en adjektiv. Skriv vad som syns, var det sitter och hur det görs. Detaljer som "varm känsla" eller "ren stil" utan synbar form räknas inte. Detaljerna ska komma ur samma idé och kännas som medveten formgivning, inte pynt.

Undvik autopiloten "stor serifrubrik + beige bakgrund + mjuka stockbilder + rundade kort" om inte briefens exakta innehåll ger ett ovanligt och tydligt skäl. Välj den riktning som både har starkast egen identitet och går att genomföra läsbart på dator och mobil. Skriv på svenska.`;

const EXECUTION_GUARDRAIL = `Det valda art-directorbeslutet nedan är bindande. Översätt det till en sammanhängande sida; hitta inte på en ny riktning under utförandet.
Använd färger enligt deras roller och proportioner. Rada aldrig upp kundens nämnda färger som varsin fullbreddssektion. En accent är i första hand typografi, linje, kontroll eller liten fokalyta — inte automatiskt en hel bakgrund.
Minst tre av riktningens signatureDetails ska synas konkret i compositionPlan och execution-layouten. De ska påverka beskärning, typografi, linjer, rytm, kontroller eller placering, inte bara beskrivas i text.
Om resultatet kan sammanfattas som en generisk stämningssida med ny färgpalett har uppdraget misslyckats.`;

function responseText(payload) {
  if (typeof payload?.output_text === "string") return payload.output_text;
  for (const item of payload?.output || []) {
    for (const content of item?.content || []) {
      if (content?.type === "output_text" && typeof content.text === "string") return content.text;
    }
  }
  return "";
}

function validateCreativeDirection(direction) {
  const errors = [];
  if (!direction || !Array.isArray(direction.candidates) || direction.candidates.length !== 3) {
    errors.push("direction.candidates");
    return { ok: false, errors };
  }
  if (!Number.isInteger(direction.selectedIndex) || direction.selectedIndex < 0 || direction.selectedIndex > 2) {
    errors.push("direction.selectedIndex");
  }
  direction.candidates.forEach((candidate, index) => {
    if (String(candidate?.name || "").trim().length < 3) errors.push(`direction.candidates[${index}].name`);
    ["thesis", "businessSpecificReason", "obviousApproachRejected", "compositionSignature", "colorHierarchy", "typographyVoice", "imageWorld", "risk"].forEach((key) => {
      if (String(candidate?.[key] || "").trim().length < 12) errors.push(`direction.candidates[${index}].${key}`);
    });
    if (!Array.isArray(candidate?.signatureDetails) || candidate.signatureDetails.length < 4) {
      errors.push(`direction.candidates[${index}].signatureDetails`);
    }
  });
  if (String(direction.selectionRationale || "").trim().length < 12) errors.push("direction.selectionRationale");
  if (String(direction.executionMandate || "").trim().length < 12) errors.push("direction.executionMandate");
  return { ok: errors.length === 0, errors };
}

async function generateCreativeDirection(brief, { apiKey, fetchImpl, model }) {
  let lastFailure = { error: "creative-direction-quality", errors: [] };
  for (let attempt = 0; attempt < 3; attempt++) {
    let upstream;
    const correction = attempt && lastFailure.errors?.length
      ? "\nFöregående riktning avvisades internt. Rätta dessa formkrav och gör ett nytt självständigt designval: " + lastFailure.errors.join(", ")
      : "";
    try {
      upstream = await fetchImpl("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        signal: AbortSignal.timeout(120000),
        body: JSON.stringify({
          model,
          store: false,
          input: [
            { role: "system", content: DIRECTION_SYSTEM_PROMPT },
            { role: "user", content: "Creative Brief:\n" + JSON.stringify(brief) + correction },
          ],
          text: { format: { type: "json_schema", name: "easily_creative_direction", strict: true, schema: CREATIVE_DIRECTION_SCHEMA } },
          max_output_tokens: 5000,
        }),
      });
    } catch (error) {
      return { ok: false, error: "openai-unreachable", detail: error?.message || String(error) };
    }
    if (!upstream.ok) return { ok: false, error: upstream.status === 401 ? "openai-invalid-key" : "openai-error", status: upstream.status };
    const payload = await upstream.json();
    const output = responseText(payload);
    if (!output) {
      lastFailure = { error: "openai-empty-direction", errors: ["returnera ett komplett designriktningsdokument"] };
      continue;
    }
    let direction;
    try { direction = JSON.parse(output); }
    catch {
      lastFailure = { error: "creative-direction-json", errors: ["returnera giltig och fullständig JSON"] };
      continue;
    }
    const validation = validateCreativeDirection(direction);
    if (!validation.ok) {
      lastFailure = { error: "creative-direction-quality", errors: validation.errors };
      continue;
    }
    return { ok: true, direction, responseId: payload.id || "" };
  }
  return { ok: false, ...lastFailure };
}

function normalizeColor(value) {
  return String(value || "").trim().toLowerCase();
}

export function reviewDesignCraft(concept, direction) {
  const errors = [];
  const selected = direction?.candidates?.[direction?.selectedIndex];
  if (!selected || !Array.isArray(selected.signatureDetails) || selected.signatureDetails.length < 4) {
    errors.push("artDirection.signatureDetails");
  }
  const moments = concept?.execution?.creativeVision?.signatureMoments;
  if (!Array.isArray(moments) || moments.length < 3) errors.push("execution.signature_craft_missing");

  const design = concept?.execution?.design || {};
  const background = normalizeColor(design.background);
  const surface = normalizeColor(design.surface);
  const primary = normalizeColor(design.primary);
  const accent = normalizeColor(design.accent);
  const palette = new Set([background, surface, primary, accent].filter(Boolean));
  const scenes = concept?.execution?.compositionPlan?.viewportScenes || [];
  const planes = scenes.map((scene) => normalizeColor(scene?.background)).filter((color) => palette.has(color));
  const usesIdentityAsLargePlanes = planes.includes(primary) && planes.includes(accent);
  const distinctLargePlanes = new Set(planes).size;
  if (usesIdentityAsLargePlanes && distinctLargePlanes >= 3) errors.push("design.palette_used_as_section_blocks");

  const sectionPlanes = (concept?.execution?.sections || [])
    .map((section) => normalizeColor(section?.layout?.background))
    .filter((color) => palette.has(color));
  if (sectionPlanes.includes(primary) && sectionPlanes.includes(accent) && new Set(sectionPlanes).size >= 3) {
    errors.push("design.palette_used_as_component_blocks");
  }
  const publicStrings = [];
  (concept?.execution?.sections || []).forEach((section) => {
    publicStrings.push(section?.headline, section?.lead, ...(section?.body || []));
    (section?.items || []).forEach((item) => publicStrings.push(item?.title, item?.body, item?.badge, item?.priceHint));
  });
  const internalCopy = /(kategorierna|bildmaterialet|kontaktuppgifterna|produktbild).*(ska|fyllas|visas|presenteras|produktinformation)|ska\s+(fyllas|presenteras|ersättas|läggas in)|läggs in när|när (verkliga|verifierade|lokala) .*(finns|tillgängliga)|exakt adress.*(bekräftad|läggs in)|använd kontaktfältet som/i;
  if (publicStrings.some((value) => internalCopy.test(String(value || "")))) errors.push("content.internal_instruction_leak");
  return { ok: errors.length === 0, errors };
}

export function validateGeneratedConcept(concept) {
  const errors = [];
  if (!concept || concept.conceptVersion !== "1.0") errors.push("conceptVersion");
  const industry = String(concept?.meta?.industry || "").trim().toLowerCase();
  // Branschmetadata hjälper sökning och etiketter, men får aldrig blockera ett
  // i övrigt komplett kreativt koncept. Den semantiska specificiteten finns
  // också i niche, narrative, designIntent och execution.
  if (!industry) errors.push("meta.industry.missing");
  const choices = concept?.execution?.componentStrategy?.choices || concept?.componentStrategy?.choices;
  if (!Array.isArray(choices) || choices.length < 4) errors.push("componentStrategy.choices");
  if (Array.isArray(choices)) {
    const firstContentIndex = choices[0]?.component === "brand-header" ? 1 : 0;
    if (choices[firstContentIndex]?.component !== "hero") errors.push("componentStrategy.hero_first");
    if (choices[choices.length - 1]?.component !== "footer") errors.push("componentStrategy.footer_last");
    choices.forEach((item, index) => {
      if (!COMPONENTS.includes(item?.component)) errors.push(`componentStrategy.choices[${index}].component`);
    });
  }
  const execution = concept?.execution;
  if (execution?.designSpecVersion !== "7.0") errors.push("execution.designSpecVersion");
  const creativeVision = execution?.creativeVision;
  if (!creativeVision || ["semanticReading", "colorMeaning", "coreIdea", "emotionalPromise", "pointOfView", "centralTension", "sensoryWorld", "visitorTransformation"].some((key) => String(creativeVision?.[key] || "").trim().length < 20) || !Array.isArray(creativeVision?.sourceSignals) || creativeVision.sourceSignals.length < 2 || !Array.isArray(creativeVision?.inferredDesignConsequences) || creativeVision.inferredDesignConsequences.length < 3 || !Array.isArray(creativeVision?.colorFidelityRules) || creativeVision.colorFidelityRules.length < 2 || !Array.isArray(creativeVision?.signatureMoments) || creativeVision.signatureMoments.length < 3 || !Array.isArray(creativeVision?.coherenceRules) || creativeVision.coherenceRules.length < 2) {
    errors.push("execution.creativeVision");
  }
  const pageVision = execution?.compositionPlan?.pageVision;
  if (!pageVision || ["intendedFeeling", "tempo", "energyArc", "attentionJourney", "visualLanguage"].some((key) => String(pageVision?.[key] || "").trim().length < 20) || !Array.isArray(pageVision?.focusMoments) || pageVision.focusMoments.length < 2) {
    errors.push("execution.compositionPlan.pageVision");
  }
  const visionTranslation = execution?.compositionPlan?.visionTranslation;
  if (!visionTranslation || ["compositionPrinciple", "rhythmLogic", "sectionRoleLogic", "proportionLogic"].some((key) => String(visionTranslation?.[key] || "").trim().length < 20)) errors.push("execution.compositionPlan.visionTranslation");
  const viewportScenes = execution?.compositionPlan?.viewportScenes;
  if (!Array.isArray(viewportScenes) || !viewportScenes.length) {
    errors.push("execution.compositionPlan.viewportScenes");
  } else if (Array.isArray(choices)) {
    const covered = viewportScenes.flatMap((scene) => Array.isArray(scene?.sectionIndexes) ? scene.sectionIndexes : []);
    if (covered.length !== choices.length || covered.some((value, index) => value !== index)) errors.push("execution.compositionPlan.viewportScenes.coverage");
    viewportScenes.forEach((scene, index) => {
      if (!scene?.id || !scene?.primaryFocalPoint || !Array.isArray(scene?.eyePath) || scene.eyePath.length < 3 || !Array.isArray(scene?.mergedElements) || !scene.mergedElements.length) errors.push(`execution.compositionPlan.viewportScenes[${index}]`);
      if (!scene?.colorRole || !scene?.colorIntensity || String(scene?.colorRelationship || "").trim().length < 12) errors.push(`execution.compositionPlan.viewportScenes[${index}].colorDirection`);
      ["minHeight", "gridTemplate", "gridTemplateRows", "gap", "padding", "background", "color"].forEach((key) => {
        const value = String(scene?.[key] || "");
        if (!value || /[:;]/.test(value)) errors.push(`execution.compositionPlan.viewportScenes[${index}].${key}`);
      });
    });
  }
  const compositionSections = execution?.compositionPlan?.sections;
  if (!Array.isArray(compositionSections) || !Array.isArray(choices) || compositionSections.length !== choices.length) {
    errors.push("execution.compositionPlan.sections");
  } else {
    choices.forEach((item, index) => {
      if (compositionSections[index]?.component !== item.component) errors.push(`execution.compositionPlan.sections[${index}].component`);
      ["visualFunction", "purposeInWhole", "reasonForPosition", "receivesFromPrevious", "preparesNext", "gazeDirection", "energyShift", "proportionRationale", "ctaRationale", "surfaceColorRelationship", "sceneArea", "sceneContribution"].forEach((key) => {
        if (String(compositionSections[index]?.[key] || "").trim().length < 8) errors.push(`execution.compositionPlan.sections[${index}].${key}`);
      });
      if (!["transparent", "plane"].includes(compositionSections[index]?.surfaceMode)) errors.push(`execution.compositionPlan.sections[${index}].surfaceMode`);
      ["narrativeRole", "sceneId"].forEach((key) => {
        if (String(compositionSections[index]?.[key] || "").trim().length < 2) errors.push(`execution.compositionPlan.sections[${index}].${key}`);
      });
      const scene = Array.isArray(viewportScenes) ? viewportScenes.find((candidate) => candidate?.id === compositionSections[index]?.sceneId) : null;
      if (!scene || !scene.sectionIndexes.includes(index)) errors.push(`execution.compositionPlan.sections[${index}].sceneRef`);
    });
    if (new Set(compositionSections.map((item) => String(item?.narrativeRole || "").trim().toLowerCase())).size !== compositionSections.length) errors.push("execution.compositionPlan.narrativeRole_unique");
    const dominant = compositionSections.filter((item) => Number(item?.visualWeight) >= 4).length;
    const quiet = compositionSections.filter((item) => Number(item?.visualWeight) <= 2).length;
    if (!dominant) errors.push("execution.compositionPlan.dominant_missing");
    if (!quiet) errors.push("execution.compositionPlan.quiet_missing");
    // Exakta höjder behöver inte vara matematiskt perfekta i modellsvaret.
    // BlueprintLayoutResolver löser minsta genomförbara geometri före render.
  }
  const design = execution?.design;
  if (!design || !["background", "surface", "text", "primary", "accent", "border"].every((key) => /^#[0-9a-f]{6}$/i.test(String(design[key] || "")))) {
    errors.push("execution.design.colors");
  }
  const sections = execution?.sections;
  if (!Array.isArray(sections) || !Array.isArray(choices) || sections.length !== choices.length) {
    errors.push("execution.sections");
  } else {
    choices.forEach((item, index) => {
      if (sections[index]?.component !== item.component) errors.push(`execution.sections[${index}].component`);
      const headingSize = String(sections[index]?.layout?.headingSize || "").trim();
      if (!headingSize || /[;{}]/.test(headingSize)) errors.push(`execution.sections[${index}].heading_scale`);
    });
  }
  return { ok: errors.length === 0, errors };
}

async function generateOneImage(apiKey, prompt, fetchImpl) {
  const response = await fetchImpl("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(90000),
    body: JSON.stringify({ model: "gpt-image-1-mini", prompt, size: "1536x1024", quality: "low", output_format: "webp" }),
  });
  if (!response.ok) return null;
  const payload = await response.json();
  return payload?.data?.[0]?.b64_json || null;
}

async function attachGeneratedImages(concept, options) {
  if (!options.imageOutputDir || !options.imagePublicBase) return { ok: true };
  const sections = concept.execution.sections;
  const jobs = [];
  sections.forEach((section, sectionIndex) => {
    if (!section.imagePrompt || section.component === "brand-header" || section.component === "footer") return;
    const count = section.component === "media-gallery" || section.component === "product-grid" || section.component === "category-showcase"
      ? Math.min(3, Math.max(1, section.items.length)) : 1;
    for (let imageIndex = 0; imageIndex < count && jobs.length < 5; imageIndex++) {
      const subject = section.items[imageIndex]?.title || "";
      jobs.push({ sectionIndex, prompt: section.imagePrompt + (subject ? " Motivets fokus: " + subject + "." : "") + " Fotorealistiskt webbplatsfoto, utan text och utan logotyper." });
    }
  });
  fs.mkdirSync(options.imageOutputDir, { recursive: true });
  const results = await Promise.all(jobs.map(async (job) => ({ job, data: await generateOneImage(options.apiKey, job.prompt, options.fetchImpl || fetch) })));
  sections.forEach((section) => { section.imageUrls = []; });
  for (const result of results) {
    if (!result.data) continue;
    const fileName = crypto.randomUUID() + ".webp";
    fs.writeFileSync(path.join(options.imageOutputDir, fileName), Buffer.from(result.data, "base64"));
    sections[result.job.sectionIndex].imageUrls.push(options.imagePublicBase.replace(/\/$/, "") + "/" + fileName);
  }
  const hero = sections.find((section) => section.component === "hero");
  return hero?.imageUrls?.length ? { ok: true } : { ok: false, error: "hero-image-generation-failed" };
}

export async function generateCreativeConcept(brief, options = {}) {
  const apiKey = String(options.apiKey || "").trim();
  if (!apiKey) return { ok: false, error: "openai-not-configured" };
  if (!brief || typeof brief !== "object") return { ok: false, error: "invalid-creative-brief" };
  const fetchImpl = options.fetchImpl || fetch;
  const model = String(options.model || "gpt-4o").trim();
  const directionResult = await generateCreativeDirection(brief, { apiKey, fetchImpl, model });
  if (!directionResult.ok) return directionResult;
  const direction = directionResult.direction;
  const selectedDirection = direction.candidates[direction.selectedIndex];
  let concept = null;
  let payload = null;
  let validation = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    let upstream;
    const correction = attempt && validation && validation.errors.length
      ? "\nFöregående utförande underkändes av Easilys kvalitetsgranskning. Korrigera exakt dessa fel utan att byta den valda kreativa riktningen eller förenkla kompositionsplanen: " + validation.errors.join(", ")
      : "";
    try {
      upstream = await fetchImpl("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        signal: AbortSignal.timeout(180000),
        body: JSON.stringify({
          model,
          store: false,
          input: [
            { role: "system", content: SYSTEM_PROMPT + "\n\n" + EXECUTION_GUARDRAIL },
            {
              role: "user",
              content: "Creative Brief:\n" + JSON.stringify(brief)
                + "\n\nVald kreativ riktning:\n" + JSON.stringify(selectedDirection)
                + "\n\nArt directorns utförandemandat:\n" + direction.executionMandate
                + correction,
            },
          ],
          text: { format: { type: "json_schema", name: "easily_creative_concept", strict: true, schema: CREATIVE_CONCEPT_SCHEMA } },
          max_output_tokens: 20000,
        }),
      });
    } catch (error) {
      return { ok: false, error: "openai-unreachable", detail: error?.message || String(error) };
    }
    if (!upstream.ok) {
      return { ok: false, error: upstream.status === 401 ? "openai-invalid-key" : "openai-error", status: upstream.status };
    }
    payload = await upstream.json();
    const text = responseText(payload);
    if (!text) return { ok: false, error: "openai-empty-response" };
    try {
      concept = JSON.parse(text);
      // Runtime-kompatibilitet för äldre klientkontrakt. Den kanoniska
      // strategin ägs av execution och skapas efter compositionPlan.
      if (concept.execution?.componentStrategy) concept.componentStrategy = concept.execution.componentStrategy;
    } catch {
      validation = { ok: false, errors: ["returnera ett komplett JSON-dokument; föregående svar blev avklippt eller ofullständigt"] };
      continue;
    }
    validation = validateGeneratedConcept(concept);
    if (validation.ok) {
      const craftReview = reviewDesignCraft(concept, direction);
      if (!craftReview.ok) validation = craftReview;
    }
    if (validation.ok) break;
  }
  if (!validation || !validation.ok) return { ok: false, error: "creative-concept-quality", errors: validation ? validation.errors : [] };
  concept.artDirection = {
    selected: selectedDirection,
    selectionRationale: direction.selectionRationale,
    executionMandate: direction.executionMandate,
  };
  concept.qualityReview = {
    ok: true,
    checks: ["distinct_direction", "signature_craft", "color_role_hierarchy"],
  };
  const images = await attachGeneratedImages(concept, { ...options, apiKey, fetchImpl });
  return {
    ok: true,
    concept,
    artDirection: concept.artDirection,
    qualityReview: concept.qualityReview,
    model,
    responseId: payload.id || "",
    directionResponseId: directionResult.responseId,
    warnings: images.ok ? [] : [images.error || "image-generation-incomplete"],
  };
}
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
