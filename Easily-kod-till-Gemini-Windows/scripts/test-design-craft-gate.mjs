import assert from "node:assert/strict";
import { reviewDesignCraft } from "../server/creative-concept-ai.mjs";

const direction = {
  selectedIndex: 0,
  candidates: [{ signatureDetails: ["crop", "rule", "caption", "button"] }],
};

function conceptWithBackgrounds(backgrounds) {
  return {
    execution: {
      creativeVision: { signatureMoments: ["crop", "rule", "caption"] },
      design: {
        background: "#ddd4ca",
        surface: "#eee8e0",
        primary: "#7a2638",
        accent: "#879a83",
      },
      compositionPlan: {
        viewportScenes: backgrounds.map((background) => ({ background })),
      },
      sections: backgrounds.map((background) => ({ layout: { background } })),
    },
  };
}

const paletteParade = reviewDesignCraft(
  conceptWithBackgrounds(["#7a2638", "#eee8e0", "#879a83"]),
  direction,
);
assert.equal(paletteParade.ok, false);
assert.ok(paletteParade.errors.includes("design.palette_used_as_section_blocks"));

const designedHierarchy = reviewDesignCraft(
  conceptWithBackgrounds(["#ddd4ca", "#eee8e0", "#ddd4ca", "#eee8e0"]),
  direction,
);
assert.deepEqual(designedHierarchy, { ok: true, errors: [] });

const missingCraft = reviewDesignCraft({
  execution: {
    creativeVision: { signatureMoments: ["only one"] },
    design: {}, compositionPlan: { viewportScenes: [] }, sections: [],
  },
}, direction);
assert.equal(missingCraft.ok, false);
assert.ok(missingCraft.errors.includes("execution.signature_craft_missing"));

const leakedInstruction = conceptWithBackgrounds(["#ddd4ca"]);
leakedInstruction.execution.sections[0].body = ["Kategorierna ska fyllas med riktiga produkter senare."];
const leakedReview = reviewDesignCraft(leakedInstruction, direction);
assert.equal(leakedReview.ok, false);
assert.ok(leakedReview.errors.includes("content.internal_instruction_leak"));

console.log("PASS Creative Director rejects palette parades and craftless concepts");
