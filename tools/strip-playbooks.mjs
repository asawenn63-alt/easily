import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const target = path.join(__dirname, "..", "js", "creative-director.js");
let s = fs.readFileSync(target, "utf8");
const start = '  const CONCEPT_VERSION = "1.0";\n\n  /**\n   * Verksamhetstyp';
const end = "  function conceptComposerDeps() {";
const i = s.indexOf(start);
const j = s.indexOf(end);
if (i < 0 || j < 0 || j <= i) {
  console.error("markers not found", i, j);
  process.exit(1);
}
s = s.slice(0, i) + s.slice(j);
fs.writeFileSync(target, s);
console.log("removed", j - i, "bytes");
