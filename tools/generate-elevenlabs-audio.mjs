import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { buildElevenLabsCatalog } from "./build-elevenlabs-catalog.mjs";

const root = process.cwd();
const maculaDir = path.join(root, "public", "macula");
const audioDir = path.join(root, "public", "audio", "elevenlabs");
const cacheDir = path.join(audioDir, "cache");
const manifestDir = path.join(audioDir, "manifests");

function loadDotEnvLocal() {
  const envPath = path.join(root, ".env.local");
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;

    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex === -1) return;

    const key = trimmed.slice(0, equalsIndex).trim();
    let value = trimmed.slice(equalsIndex + 1).trim();
    if (!key || process.env[key]) return;

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  });
}

loadDotEnvLocal();

const defaults = {
  book: "Gen",
  chapter: "1",
  modelId: process.env.ELEVENLABS_MODEL_ID || "eleven_v3",
  outputFormat: process.env.ELEVENLABS_OUTPUT_FORMAT || "mp3_44100_128",
  cardVoiceId: process.env.ELEVENLABS_CARD_VOICE_ID || process.env.ELEVENLABS_VOICE_ID || "",
  hebrewVoiceId: process.env.ELEVENLABS_HEBREW_VOICE_ID || process.env.ELEVENLABS_VOICE_ID || "",
  englishVoiceId: process.env.ELEVENLABS_ENGLISH_VOICE_ID || process.env.ELEVENLABS_VOICE_ID || "",
  hebrewRepeats: 2,
  englishRepeats: 1,
  separator: ".",
  plainHebrew: false,
  dryRun: false,
  force: false
};

function parseArgs(argv) {
  const args = { ...defaults };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--book") {
      args.book = next;
      index += 1;
    } else if (arg === "--chapter") {
      args.chapter = next;
      index += 1;
    } else if (arg === "--model") {
      args.modelId = next;
      index += 1;
    } else if (arg === "--output-format") {
      args.outputFormat = next;
      index += 1;
    } else if (arg === "--card-voice") {
      args.cardVoiceId = next;
      index += 1;
    } else if (arg === "--hebrew-voice") {
      args.hebrewVoiceId = next;
      index += 1;
    } else if (arg === "--english-voice") {
      args.englishVoiceId = next;
      index += 1;
    } else if (arg === "--voice") {
      args.cardVoiceId = next;
      args.hebrewVoiceId = next;
      args.englishVoiceId = next;
      index += 1;
    } else if (arg === "--hebrew-repeats") {
      args.hebrewRepeats = clampRepeatCount(next, args.hebrewRepeats);
      index += 1;
    } else if (arg === "--english-repeats") {
      args.englishRepeats = clampRepeatCount(next, args.englishRepeats);
      index += 1;
    } else if (arg === "--separator") {
      args.separator = next;
      index += 1;
    } else if (arg === "--plain-hebrew") {
      args.plainHebrew = true;
    } else if (arg === "--pointed-hebrew") {
      args.plainHebrew = false;
    } else if (arg === "--dry-run") {
      args.dryRun = true;
    } else if (arg === "--force") {
      args.force = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return args;
}

function clampRepeatCount(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  const count = Number.isFinite(parsed) ? parsed : fallback;
  return Math.min(Math.max(count, 0), 10);
}

function stripNiqqud(value = "") {
  return value.replace(/[\u0591-\u05C7]/g, "");
}

function cleanGloss(value = "") {
  return value
    .replace(/\((?:et|ET)\)/g, "")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .trim();
}

function refOrder(ref = "") {
  const match = ref.match(/^\S+\s+(\d+):(\d+):(\d+)$/);
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : [0, 0, 0];
}

function compareRefs(a, b) {
  const left = refOrder(a);
  const right = refOrder(b);
  return left[0] - right[0] || left[1] - right[1] || left[2] - right[2];
}

function hasObjectMarker(records = []) {
  return records.some((record) => stripNiqqud(record.h || "") === "את");
}

function hasNounOrVerb(records = []) {
  return records.some((record) => record.p === "noun" || record.p === "verb");
}

function getChapterPairs(records, { plainHebrew }) {
  const grouped = new Map();

  records.forEach((record) => {
    if (!record.r || !record.h) return;
    if (!grouped.has(record.r)) {
      grouped.set(record.r, {
        ref: record.r,
        records: [],
        hebrewParts: [],
        glossParts: []
      });
    }

    const group = grouped.get(record.r);
    group.records.push(record);
    group.hebrewParts.push(record.h);
    if (record.g) group.glossParts.push(record.g);
  });

  const seenHebrew = new Set();

  return [...grouped.values()]
    .filter((group) => hasNounOrVerb(group.records))
    .filter((group) => !hasObjectMarker(group.records))
    .sort((a, b) => compareRefs(a.ref, b.ref))
    .map((group) => {
      const pointedHebrew = group.hebrewParts.join("");
      const hebrew = plainHebrew ? stripNiqqud(pointedHebrew) : pointedHebrew;
      return {
        ref: group.ref,
        hebrew,
        english: cleanGloss(group.glossParts.join(" "))
      };
    })
    .filter((pair) => pair.hebrew && pair.english)
    .filter((pair) => {
      if (seenHebrew.has(pair.hebrew)) return false;
      seenHebrew.add(pair.hebrew);
      return true;
    });
}

function hashAudioRequest({ voiceId, modelId, outputFormat, text }) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify({ voiceId, modelId, outputFormat, text }))
    .digest("hex")
    .slice(0, 24);
}

function audioRequestFor({ lang, text, voiceId, modelId, outputFormat }) {
  const hash = hashAudioRequest({ voiceId, modelId, outputFormat, text });
  return {
    lang,
    text,
    voiceId,
    modelId,
    outputFormat,
    hash,
    fileName: `${hash}.mp3`,
    publicPath: `public/audio/elevenlabs/cache/${hash}.mp3`,
    filePath: path.join(cacheDir, `${hash}.mp3`)
  };
}

function renderCardText(pair, args) {
  const lines = [];

  for (let index = 0; index < args.hebrewRepeats; index += 1) {
    lines.push(`${pair.hebrew}${args.separator}`);
  }

  for (let index = 0; index < args.englishRepeats; index += 1) {
    lines.push(`${pair.english}${args.separator}`);
  }

  return lines.join("\n");
}

function uniqueRequestsFromPairs(pairs, args) {
  const requests = new Map();

  pairs.forEach((pair) => {
    const request = audioRequestFor({
      lang: "mixed",
      text: renderCardText(pair, args),
      voiceId: args.cardVoiceId,
      modelId: args.modelId,
      outputFormat: args.outputFormat
    });
    request.label = `${pair.hebrew} -> ${pair.english}`;
    requests.set(request.hash, request);
  });

  return [...requests.values()];
}

async function generateAudio(request, apiKey) {
  const body = {
    text: request.text,
    model_id: request.modelId
  };

  if (request.lang !== "mixed" && request.modelId !== "eleven_multilingual_v2") {
    body.language_code = request.lang === "he" ? "he" : "en";
  }

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${request.voiceId}?output_format=${request.outputFormat}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": apiKey
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`ElevenLabs failed for "${request.text}" (${response.status}): ${body}`);
  }

  const data = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(request.filePath, data);
}

function writeManifest({ args, pairs, requestsByHash }) {
  fs.mkdirSync(manifestDir, { recursive: true });

  const manifest = {
    provider: "elevenlabs",
    generatedAt: new Date().toISOString(),
    book: args.book,
    chapter: Number(args.chapter),
    modelId: args.modelId,
    outputFormat: args.outputFormat,
    plainHebrew: args.plainHebrew,
    cardSettings: {
      hebrewRepeats: args.hebrewRepeats,
      englishRepeats: args.englishRepeats,
      separator: args.separator
    },
    voices: {
      card: args.cardVoiceId,
      hebrew: args.hebrewVoiceId,
      english: args.englishVoiceId
    },
    cards: pairs.map((pair) => {
      const card = audioRequestFor({
        lang: "mixed",
        text: renderCardText(pair, args),
        voiceId: args.cardVoiceId,
        modelId: args.modelId,
        outputFormat: args.outputFormat
      });

      return {
        ref: pair.ref,
        hebrew: pair.hebrew,
        english: pair.english,
        text: card.text,
        audio: {
          card: requestsByHash.get(card.hash)?.publicPath || card.publicPath
        }
      };
    })
  };

  const manifestPath = path.join(manifestDir, `${args.book}.${args.chapter}.json`);
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return manifestPath;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const chapterPath = path.join(maculaDir, `${args.book}.${args.chapter}.json`);

  if (!fs.existsSync(chapterPath)) {
    throw new Error(`Missing chapter data: ${chapterPath}`);
  }

  args.cardVoiceId ||= args.hebrewVoiceId || args.englishVoiceId;

  if (!args.dryRun && !args.cardVoiceId) {
    throw new Error("Set ELEVENLABS_VOICE_ID or ELEVENLABS_CARD_VOICE_ID.");
  }

  const records = JSON.parse(fs.readFileSync(chapterPath, "utf8"));
  const pairs = getChapterPairs(records, args);
  const requests = uniqueRequestsFromPairs(pairs, args);
  const missing = requests.filter((request) => args.force || !fs.existsSync(request.filePath));
  const cached = requests.length - missing.length;
  const newCredits = missing.reduce((sum, request) => sum + [...request.text].length, 0);
  const totalCredits = requests.reduce((sum, request) => sum + [...request.text].length, 0);

  console.log(`${args.book} ${args.chapter}`);
  console.log(`${args.plainHebrew ? "Plain" : "Pointed"} Hebrew`);
  console.log(`${pairs.length} unique surface-word cards`);
  console.log(`${requests.length} unique audio files (${cached} cached, ${missing.length} to generate)`);
  console.log(`${newCredits} new credits needed (${totalCredits} total cached deck credits)`);

  requests
    .filter((request) => !args.force && fs.existsSync(request.filePath))
    .forEach((request) => {
      console.log(`cached: ${request.label || request.text.replace(/\s+/g, " ")}`);
    });

  if (args.dryRun) {
    console.log("Dry run only. No audio generated.");
    return;
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error("Set ELEVENLABS_API_KEY or run with --dry-run.");
  }

  fs.mkdirSync(cacheDir, { recursive: true });

  for (const [index, request] of missing.entries()) {
    console.log(`[${index + 1}/${missing.length}] ${request.lang}: ${request.text}`);
    await generateAudio(request, apiKey);
  }

  const requestsByHash = new Map(requests.map((request) => [request.hash, request]));
  const manifestPath = writeManifest({ args, pairs, requestsByHash });
  console.log(`Wrote ${manifestPath}`);
  console.log(`Wrote ${buildElevenLabsCatalog()}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
