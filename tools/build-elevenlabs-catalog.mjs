import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const audioDir = path.join(root, "public", "audio", "elevenlabs");
const manifestDir = path.join(audioDir, "manifests");
const catalogPath = path.join(audioDir, "catalog.json");

function compareCatalogEntries(a, b) {
  return a.book.localeCompare(b.book) || a.chapter - b.chapter;
}

export function buildElevenLabsCatalog() {
  fs.mkdirSync(audioDir, { recursive: true });

  const chapters = [];
  if (fs.existsSync(manifestDir)) {
    fs.readdirSync(manifestDir)
      .filter((fileName) => fileName.endsWith(".json"))
      .forEach((fileName) => {
        const match = fileName.match(/^(.+)\.(\d+)\.json$/);
        if (!match) return;

        const manifestPath = path.join(manifestDir, fileName);
        const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
        chapters.push({
          book: manifest.book || match[1],
          chapter: Number(manifest.chapter || match[2]),
          manifest: `public/audio/elevenlabs/manifests/${fileName}`,
          cards: Array.isArray(manifest.cards) ? manifest.cards.length : 0,
          modelId: manifest.modelId || "",
          outputFormat: manifest.outputFormat || "",
          generatedAt: manifest.generatedAt || ""
        });
      });
  }

  const catalog = {
    provider: "elevenlabs",
    generatedAt: new Date().toISOString(),
    chapters: chapters.sort(compareCatalogEntries)
  };

  fs.writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
  return catalogPath;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const writtenPath = buildElevenLabsCatalog();
  console.log(`Wrote ${writtenPath}`);
}
