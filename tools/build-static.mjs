import fs from "node:fs";
import path from "node:path";
import { buildElevenLabsCatalog } from "./build-elevenlabs-catalog.mjs";
import "./generate-verb-index.mjs";
import "./generate-verb-meanings.mjs";

const root = process.cwd();
const dist = path.join(root, "dist");

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

for (const file of ["index.html", "styles.css", "script.js"]) {
  fs.copyFileSync(path.join(root, file), path.join(dist, file));
}

buildElevenLabsCatalog();
fs.cpSync(path.join(root, "public"), path.join(dist, "public"), { recursive: true });
