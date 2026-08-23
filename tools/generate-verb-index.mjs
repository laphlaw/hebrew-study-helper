import fs from "node:fs";
import path from "node:path";

const maculaDir = path.resolve("public/macula");
const outputFile = path.join(maculaDir, "verb-forms.json");

function stripNiqqud(value = "") {
  return value.replace(/[\u0591-\u05C7]/g, "");
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
          forms: new Map(),
          strongs: new Map()
        });
      }

      const rootGroup = roots.get(rootKey);
      if (record.s) {
        rootGroup.strongs.set(record.s, (rootGroup.strongs.get(record.s) || 0) + 1);
      }

      const formKey = [
        stripNiqqud(record.h),
        record.g || "",
        record.m || ""
      ].join("|");

      if (!rootGroup.forms.has(formKey)) {
        rootGroup.forms.set(formKey, {
          h: record.h,
          g: record.g || "",
          m: record.m || "",
          s: record.s || "",
          refs: []
        });
      }

      const form = rootGroup.forms.get(formKey);
      if (record.r && form.refs.length < 5) form.refs.push(record.r);
    });
}

const output = {};
for (const [rootKey, group] of roots) {
  output[rootKey] = {
    root: group.root,
    strongs: [...group.strongs.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([strong]) => strong),
    forms: [...group.forms.values()]
      .sort((a, b) => (a.g || a.h).localeCompare(b.g || b.h))
  };
}

fs.writeFileSync(outputFile, JSON.stringify(output));
console.log(`Wrote ${outputFile}`);
