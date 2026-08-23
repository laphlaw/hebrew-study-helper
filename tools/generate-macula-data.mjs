import fs from "node:fs";
import path from "node:path";

const sourceDir = path.resolve("data-sources/macula-hebrew/WLC/lowfat");
const outputDir = path.resolve("public/macula");
const indexFile = path.join(outputDir, "index.json");

const bookNames = {
  Gen: "Genesis",
  Exo: "Exodus",
  Lev: "Leviticus",
  Num: "Numbers",
  Deu: "Deuteronomy",
  Jos: "Joshua",
  Jdg: "Judges",
  Rut: "Ruth",
  "1Sa": "1 Samuel",
  "2Sa": "2 Samuel",
  "1Ki": "1 Kings",
  "2Ki": "2 Kings",
  "1Ch": "1 Chronicles",
  "2Ch": "2 Chronicles",
  Ezr: "Ezra",
  Neh: "Nehemiah",
  Est: "Esther",
  Job: "Job",
  Psa: "Psalms",
  Pro: "Proverbs",
  Ecc: "Ecclesiastes",
  Sng: "Song of Songs",
  Isa: "Isaiah",
  Jer: "Jeremiah",
  Lam: "Lamentations",
  Ezk: "Ezekiel",
  Dan: "Daniel",
  Hos: "Hosea",
  Jol: "Joel",
  Amo: "Amos",
  Oba: "Obadiah",
  Jon: "Jonah",
  Mic: "Micah",
  Nam: "Nahum",
  Hab: "Habakkuk",
  Zep: "Zephaniah",
  Hag: "Haggai",
  Zec: "Zechariah",
  Mal: "Malachi"
};

function decodeXml(value = "") {
  return value
    .replaceAll("&quot;", "\"")
    .replaceAll("&apos;", "'")
    .replaceAll("&gt;", ">")
    .replaceAll("&lt;", "<")
    .replaceAll("&amp;", "&");
}

function attr(tag, name) {
  const match = tag.match(new RegExp(`\\s${name}="([^"]*)"`));
  return match ? decodeXml(match[1]) : "";
}

function cleanHebrew(value = "") {
  return value
    .replace(/[\u0591-\u05AF\u05BD\u05BF\u05C0\u05C4\u05C5]/g, "")
    .replace(/[־׃\s]+$/g, "")
    .trim();
}

function simplifyPos(pos, morph) {
  if (pos === "verb" || morph.startsWith("V")) return "verb";
  if (pos === "noun" || pos === "proper-noun" || morph.startsWith("N")) return "noun";
  return "other";
}

function parseWords(xml) {
  const words = [];
  const wordPattern = /<w\b([\s\S]*?)>([\s\S]*?)<\/w>/g;
  let match;

  while ((match = wordPattern.exec(xml))) {
    const tag = match[1];
    const inner = match[2].replace(/<[^>]+>/g, "");
    const surface = cleanHebrew(attr(tag, "unicode") || inner);
    const lemma = cleanHebrew(attr(tag, "lemma") || attr(tag, "stronglemma") || surface);
    const morph = attr(tag, "morph");
    const pos = simplifyPos(attr(tag, "pos"), morph);
    const gloss = attr(tag, "gloss") || attr(tag, "english") || lemma;
    const ref = attr(tag, "ref").replace("!", ":");

    if (!surface || !/[\u0590-\u05FF]/.test(surface)) continue;

    words.push({
      h: surface,
      l: lemma,
      p: pos,
      g: gloss.replaceAll(".", " "),
      m: morph,
      r: ref
    });
  }

  return words;
}

const files = fs
  .readdirSync(sourceDir)
  .filter((file) => /^\d{2}-[1-3]?[A-Za-z]{2,3}-\d{3}-lowfat\.xml$/.test(file))
  .sort();

const books = [];
const bookIndex = new Map();
let chapterCount = 0;
let wordCount = 0;

for (const file of files) {
  const [, order, bookCode, chapterText] = file.match(/^(\d{2})-([1-3]?[A-Za-z]{2,3})-(\d{3})-lowfat\.xml$/);
  const chapter = Number(chapterText);
  const bookName = bookNames[bookCode] || bookCode;
  const key = `${bookCode}.${chapter}`;
  const xml = fs.readFileSync(path.join(sourceDir, file), "utf8");
  const words = parseWords(xml);

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, `${key}.json`), JSON.stringify(words));
  chapterCount += 1;
  wordCount += words.length;

  if (!bookIndex.has(bookCode)) {
    const book = { code: bookCode, name: bookName, order: Number(order), chapters: [] };
    bookIndex.set(bookCode, book);
    books.push(book);
  }
  bookIndex.get(bookCode).chapters.push(chapter);
}

books.sort((a, b) => a.order - b.order);
for (const book of books) {
  book.chapters.sort((a, b) => a - b);
}

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(indexFile, JSON.stringify({ books }));

console.log(`Wrote ${indexFile}`);
console.log(`${books.length} books, ${chapterCount} chapters, ${wordCount} word records`);
