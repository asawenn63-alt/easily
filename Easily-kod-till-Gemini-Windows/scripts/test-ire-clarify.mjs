import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import vm from "vm";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function load(rel) {
  vm.runInThisContext(fs.readFileSync(path.join(ROOT, rel), "utf8"), { filename: rel });
}

load("js/intent-resolution-engine.js");

const IRE = globalThis.IntentResolutionEngine;

function assert(name, fn) {
  IRE.clearClarificationState();
  try {
    fn();
    console.log("OK", name);
  } catch (e) {
    console.error("FAIL", name, e.message);
    process.exitCode = 1;
  }
}

assert("clarify then confirm image", () => {
  const r1 = IRE.resolve("Jag skulle gärna vilja ha en bild i hero", {});
  if (r1.decision !== "clarify") throw new Error("step1 " + r1.decision);
  const r2 = IRE.resolve("Jag skrev jag vill gärna ha en bild i hero", {});
  if (r2.decision !== "execute") throw new Error("step2 " + r2.decision);
  if (r2.selectedAction.type === "text.regen") throw new Error("text.regen");
  if (r2.executionText.includes("Jag skrev")) throw new Error("bad executionText");
});

assert("deny headline -> image", () => {
  IRE.resolve("Jag skulle gärna vilja ha en bild i hero", {});
  const r2 = IRE.resolve("Jag kan väl inte ha en bild i rubriken?", {});
  if (r2.selectedAction.target !== "hero.image") throw new Error(r2.selectedAction.target);
});

assert("explicit rubriken -> text", () => {
  IRE.resolve("jag vill ändra något i hero", {});
  const r2 = IRE.resolve("rubriken", {});
  if (r2.selectedAction.type !== "text.regen") throw new Error(r2.selectedAction.type);
});

assert("another phrase on hero focus executes retry", () => {
  vm.runInThisContext(fs.readFileSync(path.join(ROOT, "js/edit-session.js"), "utf8"), { filename: "edit-session.js" });
  const ES = globalThis.EditSession;
  ES.resetSession();
  ES.setFocus("hero", "image");
  IRE.clearClarificationState();
  const r = IRE.resolve("ändra en till", {});
  if (r.decision !== "execute") throw new Error("decision " + r.decision);
  if (r.clarify) throw new Error("unexpected clarify");
  if (r.selectedAction.type !== "hero.image.retry") throw new Error("type " + r.selectedAction.type);
});

if (!process.exitCode) console.log("ALL PASS");
