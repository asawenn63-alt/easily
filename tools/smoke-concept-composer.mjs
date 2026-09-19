import fs from "fs";
import vm from "vm";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const g = { console, Math, Date, Array, Object, String, Number, Boolean, JSON, Map, parseInt, parseFloat, isNaN, RegExp, Error };

function load(rel) {
  vm.runInNewContext(fs.readFileSync(path.join(root, rel), "utf8"), g);
}

load("js/visual-stock.js");
load("js/creative-concept-composer.js");
load("js/creative-concept-contract.js");
load("js/component-registry.js");
load("js/site-blueprint-contract.js");
load("js/site-blueprint-builder.js");
load("js/creative-brief-contract.js");
load("js/creative-director.js");

function run(name, desc) {
  return g.CreativeDirector.runBlueprint({
    ctx: {
      createBusinessName: name,
      createBusinessDescription: desc,
      createBusinessLocation: "Stockholm",
      createSections: [{ id: "contact" }],
    },
  });
}

const inredning = run("Lilla Bo", "webbutik med inredning och presenter online");
const smycken = run("Nordic Gems", "webbutik med smycken och accessoarer online");
const mode = run("Stilrum", "webbutik med klader och mode online");
const baby = run("Lilla Frö", "webbutik med hållbara babysaker och barnrumsinredning för nyblivna föräldrar");

for (const [label, r] of [
  ["inredning", inredning],
  ["smycken", smycken],
  ["mode", mode],
  ["baby", baby],
]) {
  if (!r.ok) {
    console.error("FAIL", label, r.reason, r.errors);
    process.exit(1);
  }
  const sig = r.creativeConcept.meta.structureSignature;
  const niche = r.creativeConcept.meta.niche;
  const types = r.creativeConcept.componentStrategy.choices.map((c) => c.component).join(" > ");
  console.log(label + ":", "niche=" + niche, "sig=" + sig);
  console.log("  flow:", types);
}

if (baby.creativeConcept.meta.niche !== "baby") {
  console.error("FAIL: baby business was not understood as baby niche");
  process.exit(1);
}
if (!/första tiden|babysaker/i.test(baby.creativeBrief.hero.lead)) {
  console.error("FAIL: baby answer did not affect hero copy");
  process.exit(1);
}
if (!/photo-1519689680058|photo-1522771930|photo-1602030028438/.test(baby.creativeBrief.images.hero.url)) {
  console.error("FAIL: baby answer did not select relevant image pack");
  process.exit(1);
}
if (!baby.creativeBrief.shop || baby.creativeBrief.shop.products[0].title !== "Mjuk start") {
  console.error("FAIL: baby answer did not affect product content");
  process.exit(1);
}
if (inredning.creativeConcept.meta.niche !== "inredning") {
  console.error("FAIL: present/inredning business was not understood as inredning niche");
  process.exit(1);
}
if (inredning.creativeConcept.meta.structureSignature === baby.creativeConcept.meta.structureSignature) {
  console.error("FAIL: present/inredning reused the baby page structure");
  process.exit(1);
}
if (inredning.creativeBrief.design.colors.accent === baby.creativeBrief.design.colors.accent) {
  console.error("FAIL: present/inredning reused the baby color family");
  process.exit(1);
}

const sigs = new Set([
  inredning.creativeConcept.meta.structureSignature,
  smycken.creativeConcept.meta.structureSignature,
  mode.creativeConcept.meta.structureSignature,
]);
if (sigs.size < 3) {
  console.error("FAIL: structures not unique enough", sigs.size);
  process.exit(1);
}
console.log("OK: three distinct structures");
console.log("OK: baby brief drives copy, products and images");
console.log("OK: present/inredning differs from baby in structure and color family");
