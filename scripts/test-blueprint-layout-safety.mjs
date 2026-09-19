import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../js/blueprint-layout-resolver.js", import.meta.url), "utf8");
const context = { console };
context.window = context;
vm.runInNewContext(source, context);

const sectionLayout = {
  headingSize: "clamp(42px, 5vw, 76px)", mediaHeight: "320px", collectionColumns: "none", collectionGap: "20px",
  copyColumn: "2 / 6", mediaColumn: "5 / 13", copyOffsetX: "0", mediaOffsetX: "0",
};
const planEntry = (component, area) => ({
  component, sceneId: "scene", sceneArea: area, relativeHeight: "400px", paddingTop: "40px", paddingBottom: "40px",
  contentWidth: "84%", ctaMode: "inline",
});
const input = {
  designSpecVersion: "7.0",
  sections: [
    { component: "hero", headline: "En rubrik", lead: "En ingress", body: [], layout: { ...sectionLayout }, items: [] },
    { component: "card-grid", headline: "Kort", lead: "Tre kort", body: [], layout: { ...sectionLayout, collectionColumns: "repeat(3, minmax(0, 1fr))" }, items: [1, 2, 3].map((n) => ({ title: String(n), body: "Text", layout: { gridColumn: `${1 + (n - 1) * 4} / ${5 + (n - 1) * 4}`, gridRow: "1", minHeight: "300px", offsetX: "0", offsetY: n === 2 ? "18px" : "0" } })) },
    { component: "contact-block", headline: "Kontakt", lead: "Hör av dig", body: [], primaryAction: { label: "Kontakt" }, layout: { ...sectionLayout }, items: [] },
  ],
  compositionPlan: {
    sections: [planEntry("hero", "1 / 1 / 2 / 13"), planEntry("card-grid", "2 / 1 / 3 / 13"), { ...planEntry("contact-block", "3 / 1 / 4 / 13"), ctaMode: "detached" }],
    viewportScenes: [{ id: "scene", sectionIndexes: [0, 1, 2], minHeight: "900px", gap: "20px", padding: "40px" }],
  },
};

const resolved = context.BlueprintLayoutResolver.resolveDesignSpec(input);
assert.equal(resolved.sections[0].layout.copyColumn, "1 / 7");
assert.equal(resolved.sections[0].layout.mediaColumn, "7 / 13");
assert.equal(resolved.compositionPlan.sections[0].contentWidth, "100%");
assert.ok(resolved.sections[1].items.every((item) => item.layout.gridColumn === "auto" && item.layout.gridRow === "auto"));
assert.equal(resolved.compositionPlan.sections[2].ctaMode, "inline");
assert.equal(
  JSON.stringify(resolved.layoutResolution.corrections.slice(0, 4).map((item) => item.type)),
  JSON.stringify(["hero_columns_stabilized", "hero_content_width_stabilized", "collection_grid_stabilized", "detached_contact_action_stabilized"]),
);

const nestedCollection = {
  designSpecVersion: "7.0",
  sections: [{
    component: "media-gallery", headline: "Se närmare", lead: "Tre bilder", body: ["En publik beskrivning med tillräckligt mycket innehåll för att kräva en läsbar yta."],
    layout: { ...sectionLayout, collectionColumns: "3" },
    items: [1, 2, 3].map((n) => ({ title: `Bild ${n}`, body: "Läsbar bildtext", layout: { gridColumn: `${1 + (n - 1) * 4} / ${5 + (n - 1) * 4}`, gridRow: "1", minHeight: "300px", offsetX: "0", offsetY: "0" } })),
  }],
  compositionPlan: {
    sections: [planEntry("media-gallery", "1 / 6 / 2 / 13")],
    viewportScenes: [{ id: "scene", sectionIndexes: [0], minHeight: "600px", gap: "20px", padding: "40px" }],
  },
};
const nestedResolved = context.BlueprintLayoutResolver.resolveDesignSpec(nestedCollection);
assert.equal(nestedResolved.compositionPlan.sections[0].sceneArea, "1 / 1 / 2 / 13");
assert.equal(nestedResolved.compositionPlan.sections[0].contentWidth, "100%");
assert.equal(nestedResolved.sections[0].layout.collectionColumns, "repeat(3, minmax(0, 1fr))");
assert.ok(nestedResolved.sections[0].items.every((item) => item.layout.gridColumn === "auto"));
console.log("PASS Blueprint layout safety stabilizes invalid AI geometry");
