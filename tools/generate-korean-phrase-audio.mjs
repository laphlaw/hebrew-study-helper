import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { buildElevenLabsCatalog } from "./build-elevenlabs-catalog.mjs";

const root = process.cwd();
const phrasesPath = path.join(root, "public", "korean", "common-phrases.json");
const audioDir = path.join(root, "public", "audio", "elevenlabs");
const cacheDir = path.join(audioDir, "cache");
const manifestDir = path.join(audioDir, "manifests");

const requiredEnglish = [
  "Really??",
  "I'm running late",
  "How was your weekend?",
  "Any plans this weekend?",
  "What time did you wake up?",
  "Did you have dinner yet?",
  "Do you want to get dinner?",
  "What did you have for lunch?",
  "What time are you off work?",
  "How was church?"
];

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

function parseArgs(argv) {
  const args = {
    modelId: process.env.ELEVENLABS_MODEL_ID || "eleven_v3",
    outputFormat: process.env.ELEVENLABS_OUTPUT_FORMAT || "mp3_44100_128",
    voiceId: process.env.ELEVENLABS_KOREAN_VOICE_ID || process.env.ELEVENLABS_CARD_VOICE_ID || process.env.ELEVENLABS_VOICE_ID || "",
    dryRun: false,
    force: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--model") {
      args.modelId = next;
      index += 1;
    } else if (arg === "--output-format") {
      args.outputFormat = next;
      index += 1;
    } else if (arg === "--voice") {
      args.voiceId = next;
      index += 1;
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

function hashAudioRequest({ voiceId, modelId, outputFormat, text }) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify({ voiceId, modelId, outputFormat, text }))
    .digest("hex")
    .slice(0, 24);
}

function lineWithPause(value = "") {
  const trimmed = value.trim();
  return trimmed.endsWith(".") ? trimmed : `${trimmed}.`;
}

function renderCardText(phrase) {
  return [
    lineWithPause(phrase.korean),
    lineWithPause(phrase.korean),
    lineWithPause(phrase.english)
  ].join("\n");
}

function audioRequestFor({ phrase, voiceId, modelId, outputFormat }) {
  const text = renderCardText(phrase);
  const hash = hashAudioRequest({ voiceId, modelId, outputFormat, text });
  return {
    lang: "mixed",
    text,
    voiceId,
    modelId,
    outputFormat,
    hash,
    fileName: `${hash}.mp3`,
    publicPath: `public/audio/elevenlabs/cache/${hash}.mp3`,
    filePath: path.join(cacheDir, `${hash}.mp3`),
    label: `${phrase.korean} -> ${phrase.english}`
  };
}

function selectedPhrases() {
  const deck = JSON.parse(fs.readFileSync(phrasesPath, "utf8"));
  const phrases = Array.isArray(deck.phrases) ? deck.phrases : [];
  const byEnglish = new Map(phrases.map((phrase) => [phrase.english, phrase]));
  const missing = requiredEnglish.filter((english) => !byEnglish.has(english));

  if (missing.length) {
    throw new Error(`Missing required phrases: ${missing.join(", ")}`);
  }

  return requiredEnglish.map((english) => byEnglish.get(english));
}

async function generateAudio(request, apiKey) {
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${request.voiceId}?output_format=${request.outputFormat}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": apiKey
    },
    body: JSON.stringify({
      text: request.text,
      model_id: request.modelId
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`ElevenLabs failed for "${request.label}" (${response.status}): ${body}`);
  }

  const data = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(request.filePath, data);
}

function writeManifest({ args, phrases, requestsByHash }) {
  fs.mkdirSync(manifestDir, { recursive: true });

  const manifest = {
    provider: "elevenlabs",
    generatedAt: new Date().toISOString(),
    language: "ko",
    title: "Korean Everyday Phrases",
    book: "KoreanPhrases",
    chapter: 1,
    modelId: args.modelId,
    outputFormat: args.outputFormat,
    cardSettings: {
      koreanRepeats: 2,
      englishRepeats: 1,
      separator: "."
    },
    voices: {
      card: args.voiceId
    },
    cards: phrases.map((phrase, index) => {
      const card = audioRequestFor({
        phrase,
        voiceId: args.voiceId,
        modelId: args.modelId,
        outputFormat: args.outputFormat
      });

      return {
        key: `ko-phrase-${index + 1}`,
        ref: phrase.category || "phrase",
        language: "ko",
        category: phrase.category || "phrase",
        hebrew: phrase.korean,
        english: phrase.english,
        romanization: phrase.romanization || "",
        text: card.text,
        audio: {
          card: requestsByHash.get(card.hash)?.publicPath || card.publicPath
        }
      };
    })
  };

  const manifestPath = path.join(manifestDir, "KoreanPhrases.1.json");
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return manifestPath;
}

async function main() {
  loadDotEnvLocal();
  const args = parseArgs(process.argv.slice(2));
  const phrases = selectedPhrases();

  if (!args.dryRun && !args.voiceId) {
    throw new Error("Set ELEVENLABS_VOICE_ID, ELEVENLABS_CARD_VOICE_ID, or ELEVENLABS_KOREAN_VOICE_ID.");
  }

  const requests = phrases.map((phrase) => audioRequestFor({
    phrase,
    voiceId: args.voiceId,
    modelId: args.modelId,
    outputFormat: args.outputFormat
  }));
  const missing = requests.filter((request) => args.force || !fs.existsSync(request.filePath));
  const cached = requests.length - missing.length;
  const newCredits = missing.reduce((sum, request) => sum + [...request.text].length, 0);
  const totalCredits = requests.reduce((sum, request) => sum + [...request.text].length, 0);

  console.log("Korean everyday phrases");
  console.log(`${phrases.length} phrase cards`);
  console.log(`${requests.length} unique audio files (${cached} cached, ${missing.length} to generate)`);
  console.log(`${newCredits} new credits needed (${totalCredits} total cached deck credits)`);

  requests
    .filter((request) => !args.force && fs.existsSync(request.filePath))
    .forEach((request) => {
      console.log(`cached: ${request.label}`);
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
    console.log(`[${index + 1}/${missing.length}] ${request.label}`);
    await generateAudio(request, apiKey);
  }

  const requestsByHash = new Map(requests.map((request) => [request.hash, request]));
  const manifestPath = writeManifest({ args, phrases, requestsByHash });
  console.log(`Wrote ${manifestPath}`);
  console.log(`Wrote ${buildElevenLabsCatalog()}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
