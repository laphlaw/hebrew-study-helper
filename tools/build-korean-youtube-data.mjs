import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const koreanSourcePath = path.join(root, "audio_analysis", "korean-vlog", "Hv06xQmsM-s.ko.json3");
const englishSourcePath = path.join(root, "audio_analysis", "korean-vlog", "Hv06xQmsM-s.en-US.json3");
const glossesPath = path.join(root, "tools", "korean-vlog-glosses.json");
const outputPath = path.join(root, "public", "korean", "youtube-videos.json");

const video = {
  id: "Hv06xQmsM-s",
  title: "Learn Korean with a Real-Life Vlog",
  url: "https://www.youtube.com/watch?v=Hv06xQmsM-s&t=31s",
  captionLanguage: "ko",
  translationLanguage: "en-US",
  source: "YouTube Korean captions"
};

if (!fs.existsSync(koreanSourcePath) || !fs.existsSync(englishSourcePath)) {
  fs.mkdirSync(path.dirname(koreanSourcePath), { recursive: true });
  execFileSync("yt-dlp", [
    "--skip-download",
    "--write-subs",
    "--sub-langs",
    "ko,en-US",
    "--sub-format",
    "json3",
    "-o",
    path.join(root, "audio_analysis", "korean-vlog", "%(id)s.%(ext)s"),
    video.url
  ], { stdio: "inherit" });
}

function captionTextFromEvent(event) {
  return (event.segs || [])
    .map((segment) => segment.utf8 || "")
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

function koreanTokens(value = "") {
  return value.match(/[가-힣]+/g) || [];
}

function readCaptions(sourcePath) {
  const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
  return (source.events || [])
    .map((event) => ({
      startMs: event.tStartMs || 0,
      durationMs: event.dDurationMs || 0,
      text: captionTextFromEvent(event)
    }))
    .filter((caption) => caption.text);
}

function findAlignedCaption(caption, captionIndex, translatedCaptions) {
  const indexed = translatedCaptions[captionIndex];
  if (indexed && Math.abs(indexed.startMs - caption.startMs) < 500) return indexed;

  const captionEnd = caption.startMs + caption.durationMs;
  return translatedCaptions.find((translated) => {
    const translatedEnd = translated.startMs + translated.durationMs;
    return translated.startMs < captionEnd && translatedEnd > caption.startMs;
  });
}

const koreanCaptions = readCaptions(koreanSourcePath);
const englishCaptions = readCaptions(englishSourcePath);
const glosses = JSON.parse(fs.readFileSync(glossesPath, "utf8"));
const captions = koreanCaptions.map((caption, captionIndex) => ({
  ...caption,
  englishText: findAlignedCaption(caption, captionIndex, englishCaptions)?.text || ""
}));

const counts = new Map();
const firstCaptionIndexes = new Map();
const firstTokenIndexes = new Map();
let tokenIndex = 0;

captions.forEach((caption, captionIndex) => {
  koreanTokens(caption.text).forEach((word) => {
    if (!firstCaptionIndexes.has(word)) firstCaptionIndexes.set(word, captionIndex);
    if (!firstTokenIndexes.has(word)) firstTokenIndexes.set(word, tokenIndex);
    counts.set(word, (counts.get(word) || 0) + 1);
    tokenIndex += 1;
  });
});

const words = [...counts.entries()]
  .map(([word, count]) => ({
    word,
    count,
    english: glosses[word] || "",
    contextEnglish: captions[firstCaptionIndexes.get(word)]?.englishText || "",
    firstCaptionIndex: firstCaptionIndexes.get(word) || 0,
    firstTokenIndex: firstTokenIndexes.get(word) || 0
  }))
  .sort((a, b) => (
    b.count - a.count ||
    a.firstCaptionIndex - b.firstCaptionIndex ||
    a.word.localeCompare(b.word, "ko")
  ));

const missingGlosses = words.filter((entry) => !entry.english).map((entry) => entry.word);
if (missingGlosses.length) {
  throw new Error(`Missing Korean glosses: ${missingGlosses.join(", ")}`);
}

const data = {
  videos: [
    {
      ...video,
      captionText: captions.map((caption) => caption.text).join("\n"),
      captions,
      words
    }
  ]
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(data, null, 2)}\n`);
console.log(`Wrote ${outputPath}`);
console.log(`${captions.length} captions, ${words.length} unique Korean words`);
