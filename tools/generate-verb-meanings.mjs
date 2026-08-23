import fs from "node:fs";
import path from "node:path";

const maculaDir = path.resolve("public/macula");
const outputFile = path.join(maculaDir, "verb-meanings.json");
const overridesFile = path.join(maculaDir, "verb-meaning-overrides.json");
const strongsUrl = "https://raw.githubusercontent.com/openscriptures/strongs/master/hebrew/strongs-hebrew-dictionary.js";

function stripNiqqud(value = "") {
  return value.replace(/[\u0591-\u05C7]/g, "");
}

function cleanDefinition(value = "") {
  return value
    .replace(/[{}]/g, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/\bi\.e\./g, "")
    .replace(/\betc\./g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function simpleMeaningFromDefinition(entry) {
  const definition = cleanDefinition(entry?.strongs_def || "");
  const toMatch = definition.match(/\bto\s+([^,;]+)/i);
  if (toMatch) return toMatch[1].trim().toLowerCase();

  const firstKjv = cleanDefinition(entry?.kjv_def || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .find((item) => item && !item.includes("["));
  if (firstKjv) return firstKjv.replace(/\.$/, "");

  return "";
}

async function loadStrongsDictionary() {
  const response = await fetch(strongsUrl);
  if (!response.ok) throw new Error(`Could not download Strong's dictionary: ${response.status}`);

  const text = await response.text();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("};");
  if (start === -1 || end === -1) throw new Error("Could not parse Strong's dictionary");

  return JSON.parse(text.slice(start, end + 1));
}

function loadOverrides() {
  if (!fs.existsSync(overridesFile)) return {};
  return JSON.parse(fs.readFileSync(overridesFile, "utf8"));
}

const roots = new Map();

for (const file of fs.readdirSync(maculaDir)) {
  if (
    !file.endsWith(".json") ||
    file === "index.json" ||
    file === "verb-forms.json" ||
    file === "verb-meanings.json" ||
    file === "verb-meaning-overrides.json"
  ) continue;

  const records = JSON.parse(fs.readFileSync(path.join(maculaDir, file), "utf8"));
  records
    .filter((record) => record.p === "verb")
    .forEach((record) => {
      const root = record.l || record.h;
      const rootKey = stripNiqqud(root);
      if (!roots.has(rootKey)) {
        roots.set(rootKey, {
          root,
          strongs: new Map()
        });
      }

      if (record.s) {
        const group = roots.get(rootKey);
        group.strongs.set(record.s, (group.strongs.get(record.s) || 0) + 1);
      }
    });
}

const dictionary = await loadStrongsDictionary();
const overrides = loadOverrides();
const output = {};

for (const [rootKey, group] of roots) {
  const strong = [...group.strongs.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "";
  const strongEntry = strong ? dictionary[`H${strong}`] : null;
  const override = overrides[rootKey] || (strong ? overrides[`H${strong}`] : "");
  const meaning = override || simpleMeaningFromDefinition(strongEntry);

  if (!meaning) continue;

  output[rootKey] = {
    root: group.root,
    strong: strong ? `H${strong}` : "",
    meaning
  };
}

fs.writeFileSync(outputFile, JSON.stringify(output));
console.log(`Wrote ${outputFile}`);
