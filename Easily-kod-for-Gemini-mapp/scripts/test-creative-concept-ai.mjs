import assert from "node:assert/strict";
import { generateCreativeConcept } from "../server/creative-concept-ai.mjs";

const direction = {
  candidates: [0, 1, 2].map((index) => ({
    name: `Riktning ${index + 1} med egen karaktär`,
    thesis: "Ett verksamhetsspecifikt visuellt grepp som bär hela upplevelsen.",
    businessSpecificReason: "Greppet följer direkt ur butikens material, kunder och verkliga erbjudande.",
    obviousApproachRejected: "Den vanliga neutrala butiksmallen med stora stämningsbilder avvisas uttryckligen.",
    compositionSignature: "En egen rytm av täta produktögonblick och lugna förklarande ytor.",
    colorHierarchy: "En neutral bas bär 80 procent, en stödton 15 procent och accenten 5 procent.",
    typographyVoice: "Tydlig typografi med en återkommande detalj som hör till verksamhetens röst.",
    imageWorld: "Verkliga material och händer i arbete fotograferas nära och utan generisk stockkänsla.",
    signatureDetails: ["asymmetrisk beskärning", "tunn signaturlinje", "exakt bildtext", "fyrkantig knapp"],
    risk: "Greppet får inte bli så redaktionellt att det försvårar vägen till sortimentet.",
  })),
  selectedIndex: 1,
  selectionRationale: "Den valda riktningen är mest specifik för verksamheten och tydligast på både dator och mobil.",
  executionMandate: "Behåll den valda rytmen, färghierarkin och minst tre signaturdetaljer genom hela utförandet.",
};

const requests = [];
const result = await generateCreativeConcept({
  customerFacts: { businessName: "Stickarpelle", offer: { summary: "Garner, tyger och tillbehör" } },
}, {
  apiKey: "test-key",
  model: "test-model",
  fetchImpl: async (_url, init) => {
    const request = JSON.parse(init.body);
    requests.push(request);
    if (requests.length === 1) {
      return { ok: true, json: async () => ({ id: "direction_test", output_text: JSON.stringify(direction) }) };
    }
    return { ok: true, json: async () => ({ id: "concept_test", output_text: "{}" }) };
  },
});

assert.equal(result.ok, false);
assert.equal(result.error, "creative-concept-quality");
assert.equal(requests[0].text.format.name, "easily_creative_direction");
assert.match(requests[0].input[1].content, /Stickarpelle/);
assert.match(requests[0].input[1].content, /Garner, tyger och tillbehör/);
assert.equal(requests[1].text.format.name, "easily_creative_concept");
assert.match(requests[1].input[1].content, /Riktning 2/);
assert.match(requests[1].input[0].content, /Rada aldrig upp kundens nämnda färger/);

const missingKey = await generateCreativeConcept({}, {});
assert.equal(missingKey.error, "openai-not-configured");

const rejectedKey = await generateCreativeConcept({}, {
  apiKey: "wrong-key",
  fetchImpl: async () => ({ ok: false, status: 401 }),
});
assert.deepEqual(rejectedKey, { ok: false, error: "openai-invalid-key", status: 401 });

console.log("PASS Creative Brief → selected art direction → structured design execution");
