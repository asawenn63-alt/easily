const aboutSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    eyebrow: { type: 'string' },
    heading: { type: 'string' },
    paragraphs: {
      type: 'array',
      minItems: 2,
      maxItems: 3,
      items: { type: 'string', minLength: 1, maxLength: 1600 }
    }
  },
  required: ['eyebrow', 'heading', 'paragraphs']
};

function clean(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export function fallbackAboutCopy(facts) {
  const businessName = clean(facts?.businessName, 160);
  const description = clean(facts?.description, 4000);
  const location = clean(facts?.location, 240);
  if (!description) return null;
  const paragraphs = businessName ? [`Välkommen till ${businessName}.`, description] : [description];
  if (location) paragraphs.push(`Verksamheten finns i ${location}.`);
  return {
    eyebrow: 'Om verksamheten',
    heading: businessName ? `Om ${businessName}` : 'Om oss',
    paragraphs
  };
}

function validatedCopy(value) {
  const eyebrow = clean(value?.eyebrow, 80);
  const heading = clean(value?.heading, 180);
  const paragraphs = Array.isArray(value?.paragraphs)
    ? value.paragraphs.map(item => clean(item, 1600)).filter(Boolean).slice(0, 3)
    : [];
  return eyebrow && heading && paragraphs.length ? { eyebrow, heading, paragraphs } : null;
}

export async function composeAboutCopy({ apiKey, model, facts, fetchImpl = fetch }) {
  const fallback = fallbackAboutCopy(facts);
  if (!fallback || !apiKey) return fallback;
  const input = {
    businessName: clean(facts.businessName, 160),
    location: clean(facts.location, 240),
    description: clean(facts.description, 4000),
    siteType: clean(facts.siteType, 80),
    designTone: clean(facts.designTone, 160)
  };
  let response;
  try {
    response = await fetchImpl('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(45000),
      body: JSON.stringify({
        model,
        store: false,
        max_output_tokens: 900,
        instructions: `Skriv en färdig Om oss-text på naturlig svenska för den befintliga webbplatsen. Använd hela verksamhetsbeskrivningen som faktagrund. Företagsnamn, ort, verksamhetstyp och beskrivning är verifierade fakta. designTone får endast styra ordval och känsla; det är inte en separat företagsuppgift. Skriv exakt två korta stycken och högst cirka 90 ord totalt. Upprepa inte bara den råa beskrivningen; formulera den till en sammanhängande, välkomnande presentation. Om underlaget är kort får du uttrycka samma innebörd på ett mer levande sätt men aldrig lägga till ägare, historia, adress, öppettider, tjänster, enskilda produkter, priser, löften eller andra fakta som inte uttryckligen finns i underlaget. Skriv inte om hur webbplatsen skapades och nämn inte AI.`,
        input: JSON.stringify(input),
        text: { format: { type: 'json_schema', name: 'about_copy', strict: true, schema: aboutSchema } }
      })
    });
    if (!response.ok) {
      let errorCode = 'unknown';
      try { errorCode = (await response.clone().json())?.error?.code || 'unknown'; } catch { /* no diagnostic body */ }
      console.error(`[about-copy] response ${response.status}; code=${errorCode}`);
      return fallback;
    }
    const payload = await response.json();
    if (payload.status !== 'completed') {
      console.error(`[about-copy] incomplete response; status=${payload.status || 'missing'}`);
      return fallback;
    }
    const output = payload.output?.flatMap(item => item.content || []) || [];
    if (output.some(item => item.type === 'refusal')) return fallback;
    const text = output.filter(item => item.type === 'output_text').map(item => item.text).join('');
    return validatedCopy(JSON.parse(text)) || fallback;
  } catch (error) {
    console.error(`[about-copy] unavailable; reason=${error?.name || 'unknown'}`);
    return fallback;
  }
}
