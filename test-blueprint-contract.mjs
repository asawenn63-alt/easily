import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

globalThis.window = globalThis;
for (const file of ["js/site-blueprint-contract.js", "js/site-blueprint-builder.js", "js/blueprint-renderer.js"]) {
  vm.runInThisContext(fs.readFileSync(new URL(file, import.meta.url), "utf8"), { filename: file });
}

const layout = {
  width: "100%", gridTemplate: "minmax(0,1.25fr) minmax(18rem,.75fr)",
  gap: "clamp(2rem,6vw,7rem)", alignItems: "center", copyColumn: "2", copyRow: "1",
  copyMaxWidth: "34rem", copyOffsetX: "-4rem", copyOffsetY: "2rem", copyZIndex: 3,
  headingSize: "clamp(4rem,9vw,9rem)", headingLineHeight: ".88", textAlign: "left",
  mediaColumn: "1", mediaRow: "1", mediaWidth: "110%", mediaHeight: "75vh", mediaAspect: "4/3",
  mediaFit: "cover", mediaObjectPosition: "50% 50%", mediaOffsetX: "0", mediaOffsetY: "0",
  mediaZIndex: 1, mediaRadius: "0", collectionColumn: "1 / -1",
  collectionColumns: "repeat(3,minmax(0,1fr))", collectionGap: "2rem", actionAlign: "flex-start",
  actionPadding: ".8rem 1.2rem", actionRadius: "2px", actionFontSize: "1rem",
  background: "#f6efe5", color: "#17332d", composition: "asymmetric editorial overlap",
  relationBefore: "opening", relationAfter: "overlap-next",
};
const section = (component, headline, imageUrls = []) => ({
  component, headline, lead: "Ett levande uttryck", body: ["Innehåll från Creative Director."],
  items: [], primaryAction: { label: "Upptäck", href: "#kontakt" }, imageUrls, layout,
});
const concept = {
  conceptVersion: "1.0",
  meta: { businessName: "Testateljén", location: "Stockholm", industry: "design" },
  componentStrategy: { choices: [{ component: "hero" }, { component: "content-block" }, { component: "footer" }] },
  execution: {
    designSpecVersion: "3.0",
    compositionPlan: {
      rhythmIntent: "stort, lugnt, avslut", narrativeArc: "öppning till fördjupning till slut",
      dominantSectionIndexes: [0], quietSectionIndexes: [2],
      sections: [
        { component: "hero", narrativeRole: "öppning", visualWeight: 5, relativeHeight: "88svh", spaceBefore: "0", spaceAfter: "-2rem", paddingTop: "4rem", paddingBottom: "3rem", layoutIntent: "immersiv öppning", mediaScale: "115%", ctaPlacement: "flex-start", transitionIn: "none", transitionOut: "overlap" },
        { component: "content-block", narrativeRole: "fördjupning", visualWeight: 3, relativeHeight: "62svh", spaceBefore: "0", spaceAfter: "2rem", paddingTop: "3rem", paddingBottom: "4rem", layoutIntent: "lugn textfördjupning", mediaScale: "80%", ctaPlacement: "center", transitionIn: "overlap", transitionOut: "pause" },
        { component: "footer", narrativeRole: "avslut", visualWeight: 1, relativeHeight: "28svh", spaceBefore: "1rem", spaceAfter: "0", paddingTop: "2rem", paddingBottom: "2rem", layoutIntent: "kompakt avslut", mediaScale: "0", ctaPlacement: "flex-end", transitionIn: "pause", transitionOut: "none" },
      ],
    },
    design: {
      background: "#f6efe5", surface: "#d7ebe4", text: "#17332d", primary: "#a23e68",
      accent: "#cf795a", border: "#809c91", headingFont: "Georgia", bodyFont: "Arial",
      buttonRadius: "999px", sectionSpacing: "6rem", maxWidth: "1280px",
    },
    sections: [section("hero", "Form som tar plats", ["/generated/test.webp"]), section("content-block", "Materialet leder vidare"), section("footer", "Testateljén")],
  },
};

const blueprint = SiteBlueprintBuilder.buildSiteBlueprint(concept);
assert.equal(SiteBlueprintContract.validateSiteBlueprint(blueprint, { requireComplete: true }).ok, true);
assert.equal(JSON.stringify(blueprint).includes("variant"), false);
assert.equal(JSON.stringify(blueprint).includes("#f6efe5"), false);
assert.equal(JSON.stringify(blueprint).includes("Form som tar plats"), false);
const rendered = BlueprintRenderer.renderTree(blueprint, { businessName: "Testateljén", designSpec: concept.execution });
assert.equal(rendered.ok, true);
assert.match(rendered.html, /data-design-spec="3.0"/);
assert.match(rendered.html, /data-plan-weight="5"/);
assert.match(rendered.html, /--bp-grid:minmax\(0,1\.25fr\) minmax\(18rem,\.75fr\)/);
assert.match(rendered.html, /Form som tar plats/);
console.log("Blueprint contract + renderer: OK");

// Den sena komponentstrategin i execution är auktoritativ. Ett äldre sparat
// toppnivåfält får inte styra en ny Blueprint.
const lateStrategyConcept = JSON.parse(JSON.stringify(concept));
lateStrategyConcept.execution.componentStrategy = {
  choices: [{ component: "hero" }, { component: "media-gallery" }, { component: "contact-block" }, { component: "footer" }],
  rejected: [],
};
lateStrategyConcept.execution.sections = [
  section("hero", "Media först", ["/generated/test.webp"]),
  section("media-gallery", "Berättelsen i bilder", ["/generated/test.webp"]),
  section("contact-block", "Nästa steg"),
  section("footer", "Testateljén"),
];
lateStrategyConcept.execution.compositionPlan.sections = lateStrategyConcept.execution.componentStrategy.choices.map((choice, index) => ({
  ...lateStrategyConcept.execution.compositionPlan.sections[Math.min(index, 2)],
  component: choice.component,
}));
const lateBlueprint = SiteBlueprintBuilder.buildSiteBlueprint(lateStrategyConcept);
assert.deepEqual(lateBlueprint.root.children.map((node) => node.type), ["hero", "media-gallery", "contact-block", "footer"]);
console.log("Execution composition -> late component strategy: OK");
