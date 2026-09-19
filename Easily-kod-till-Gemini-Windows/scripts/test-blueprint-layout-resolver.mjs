import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../js/blueprint-layout-resolver.js", import.meta.url), "utf8");
const context = { globalThis: {} };
vm.runInNewContext(source, context);
const resolve = context.globalThis.BlueprintLayoutResolver.resolveDesignSpec;

const input = {
  designSpecVersion: "7.0",
  compositionPlan: {
    sections: [
      { relativeHeight: "180px", paddingTop: "40px", paddingBottom: "40px", sceneArea: "1 / 1 / 2 / 7" },
      { relativeHeight: "220px", paddingTop: "40px", paddingBottom: "40px", sceneArea: "2 / 1 / 3 / 13" },
    ],
    viewportScenes: [{ id: "opening", sectionIndexes: [0, 1], minHeight: "360px", gap: "24px", padding: "32px", gridTemplateRows: "1fr 1fr" }],
  },
  sections: [
    { headline: "En längre rubrik som behöver verklig plats", lead: "Introduktion", body: ["Text ".repeat(80)], primaryAction: { label: "Läs mer" }, imageUrls: ["hero.webp"], layout: { headingSize: "64px", mediaHeight: "420px", collectionColumns: "1fr", collectionGap: "20px" }, items: [] },
    { headline: "Utbud", lead: "Tre tydliga val", body: [], primaryAction: { label: "" }, imageUrls: [], layout: { headingSize: "42px", collectionColumns: "repeat(3, 1fr)", collectionGap: "24px" }, items: [1, 2, 3].map((n) => ({ title: String(n), layout: { minHeight: "260px" } })) },
  ],
};

const output = resolve(input);
assert.notEqual(output, input);
assert.equal(input.compositionPlan.sections[0].resolvedMinHeight, undefined, "resolver must not mutate Creative Director output");
assert.ok(parseInt(output.compositionPlan.sections[0].resolvedMinHeight) >= 500, "media/text must fit");
assert.ok(parseInt(output.compositionPlan.viewportScenes[0].resolvedMinHeight) > 360, "scene must expand instead of clip");
assert.match(output.compositionPlan.viewportScenes[0].resolvedGridTemplateRows, /minmax\(/);
assert.ok(output.layoutResolution.corrections.length >= 2);
console.log("PASS Blueprint layout resolver expands impossible geometry without changing creative choices");
