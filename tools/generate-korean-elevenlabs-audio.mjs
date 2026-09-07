import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = process.cwd();
const scriptPath = path.join(root, "script.js");
const audioDir = path.join(root, "public", "audio", "elevenlabs");
const cacheDir = path.join(audioDir, "cache");
const manifestPath = path.join(audioDir, "korean-bank.json");
const vlogWordsSourcePath = path.join(audioDir, "korean-vlog-words-source.json");

function loadDotEnvLocal() {
  const envPath = path.join(root, ".env.local");
  if (!fs.existsSync(envPath)) return;

  fs.readFileSync(envPath, "utf8").split(/\r?\n/).forEach((line) => {
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
  modelId: process.env.ELEVENLABS_MODEL_ID || "eleven_v3",
  outputFormat: process.env.ELEVENLABS_OUTPUT_FORMAT || "mp3_44100_128",
  voiceId: process.env.ELEVENLABS_KOREAN_VOICE_ID || "bhH6z2isuapS6ely1oMG",
  koreanRepeats: 2,
  englishRepeats: 1,
  separator: ".",
  dryRun: false,
  force: false
};

const koreanVerbTenses = {
  past: { label: "past", formIndex: 3, romanizationIndex: 7 },
  present: { label: "present", formIndex: 2, romanizationIndex: 6 },
  future: { label: "future", formIndex: 4, romanizationIndex: 8 }
};

function parseArgs(argv) {
  const args = { ...defaults };

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
    } else if (arg === "--korean-repeats") {
      args.koreanRepeats = clampRepeatCount(next, args.koreanRepeats);
      index += 1;
    } else if (arg === "--english-repeats") {
      args.englishRepeats = clampRepeatCount(next, args.englishRepeats);
      index += 1;
    } else if (arg === "--separator") {
      args.separator = next;
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

function clampRepeatCount(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  const count = Number.isFinite(parsed) ? parsed : fallback;
  return Math.min(Math.max(count, 0), 10);
}

function extractArraySource(source, constName) {
  const marker = `const ${constName} =`;
  const start = source.indexOf(marker);
  if (start === -1) throw new Error(`Could not find ${constName} in script.js`);

  const arrayStart = source.indexOf("[", start);
  if (arrayStart === -1) throw new Error(`Could not find ${constName} array start`);

  let depth = 0;
  let quote = "";
  let escaped = false;
  for (let index = arrayStart; index < source.length; index += 1) {
    const char = source[index];

    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        quote = "";
      }
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
    } else if (char === "[") {
      depth += 1;
    } else if (char === "]") {
      depth -= 1;
      if (depth === 0) return source.slice(arrayStart, index + 1);
    }
  }

  throw new Error(`Could not find ${constName} array end`);
}

function loadKoreanBank() {
  const source = fs.readFileSync(scriptPath, "utf8");
  return {
    phrases: vm.runInNewContext(extractArraySource(source, "koreanPhraseCards")),
    nouns: vm.runInNewContext(extractArraySource(source, "koreanNounCards")),
    verbs: vm.runInNewContext(extractArraySource(source, "koreanVerbCards")),
    vlogWords: loadKoreanVlogWords()
  };
}

function loadKoreanVlogWords() {
  if (!fs.existsSync(vlogWordsSourcePath)) return [];
  const source = JSON.parse(fs.readFileSync(vlogWordsSourcePath, "utf8"));
  return Array.isArray(source.cards) ? source.cards : [];
}

function hashAudioRequest({ voiceId, modelId, outputFormat, text }) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify({ voiceId, modelId, outputFormat, text }))
    .digest("hex")
    .slice(0, 24);
}

function audioRequestFor({ text, voiceId, modelId, outputFormat }) {
  const hash = hashAudioRequest({ voiceId, modelId, outputFormat, text });
  return {
    text,
    voiceId,
    modelId,
    outputFormat,
    hash,
    publicPath: `public/audio/elevenlabs/cache/${hash}.mp3`,
    filePath: path.join(cacheDir, `${hash}.mp3`)
  };
}

function renderCardText(card, args) {
  const lines = [];

  for (let index = 0; index < args.koreanRepeats; index += 1) {
    lines.push(audioLine(card.hebrew, args.separator));
  }

  for (let index = 0; index < args.englishRepeats; index += 1) {
    lines.push(audioLine(card.english, args.separator));
  }

  return lines.join("\n");
}

function audioLine(value, separator) {
  const text = String(value || "").trim();
  if (!text) return "";
  return /[.!?]$/.test(text) ? text : `${text}${separator}`;
}

function koreanCardsFromBank(bank) {
  const phraseCards = bank.phrases.map(([hebrew, english, romanization]) => ({
    key: `ko:phrase:${hebrew}`,
    category: "phrase",
    language: "ko",
    hebrew,
    english,
    romanization
  }));

  const nounCards = bank.nouns.map(([hebrew, english, romanization]) => ({
    key: `ko:noun:${hebrew}`,
    category: "noun",
    language: "ko",
    hebrew,
    english,
    romanization
  }));

  const vlogWordCards = bank.vlogWords.map((card) => ({
    key: `ko:vlog-word:${card.hebrew}`,
    category: "vlog-word",
    language: "ko",
    hebrew: card.hebrew,
    english: card.english,
    romanization: card.romanization,
    frequency: card.frequency,
    rank: card.rank,
    source: card.source,
    videoId: card.videoId
  }));

  const verbCards = bank.verbs.flatMap((card) => (
    Object.entries(koreanVerbTenses).map(([tense, config]) => ({
      key: `ko:verb:${card[0]}:${tense}`,
      category: "verb",
      language: "ko",
      tense,
      hebrew: card[config.formIndex],
      english: `${card[1]} (${config.label})`,
      romanization: card[config.romanizationIndex]
    }))
  ));

  return [...phraseCards, ...vlogWordCards, ...nounCards, ...verbCards];
}

function formatCategoryCounts(counts) {
  return Object.entries(counts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([category, count]) => `${count} ${category}`)
    .join(", ");
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
    throw new Error(`ElevenLabs failed for "${request.text}" (${response.status}): ${body}`);
  }

  const data = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(request.filePath, data);
}

function writeManifest({ args, cards, requestsByKey }) {
  fs.mkdirSync(audioDir, { recursive: true });

  const manifest = {
    provider: "elevenlabs",
    generatedAt: new Date().toISOString(),
    language: "ko",
    title: "Korean word bank",
    modelId: args.modelId,
    outputFormat: args.outputFormat,
    cardSettings: {
      koreanRepeats: args.koreanRepeats,
      englishRepeats: args.englishRepeats,
      separator: args.separator
    },
    voices: {
      card: args.voiceId
    },
    cards: cards.map((card) => ({
      ...card,
      text: requestsByKey.get(card.key).text,
      audio: {
        card: requestsByKey.get(card.key).publicPath
      }
    }))
  };

  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return manifestPath;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  args.voiceId ||= process.env.ELEVENLABS_KOREAN_VOICE_ID || "bhH6z2isuapS6ely1oMG";

  if (!args.dryRun && !args.voiceId) {
    throw new Error("Set ELEVENLABS_KOREAN_VOICE_ID, ELEVENLABS_VOICE_ID, or run with --dry-run.");
  }

  const cards = koreanCardsFromBank(loadKoreanBank());
  const requestsByKey = new Map(cards.map((card) => [
    card.key,
    audioRequestFor({
      text: renderCardText(card, args),
      voiceId: args.voiceId,
      modelId: args.modelId,
      outputFormat: args.outputFormat
    })
  ]));
  const requests = [...requestsByKey.values()];
  const missing = requests.filter((request) => args.force || !fs.existsSync(request.filePath));
  const cached = requests.length - missing.length;
  const counts = cards.reduce((total, card) => {
    total[card.category] = (total[card.category] || 0) + 1;
    return total;
  }, {});
  const newCredits = missing.reduce((sum, request) => sum + [...request.text].length, 0);
  const totalCredits = requests.reduce((sum, request) => sum + [...request.text].length, 0);

  console.log("Korean word bank");
  console.log(`Voice: ${args.voiceId}`);
  console.log(`${cards.length} cards (${formatCategoryCounts(counts)})`);
  console.log(`${requests.length} unique audio files (${cached} cached, ${missing.length} to generate)`);
  console.log(`${newCredits} new credits needed (${totalCredits} total cached deck credits)`);

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
    console.log(`[${index + 1}/${missing.length}] ${request.text.replace(/\s+/g, " ")}`);
    await generateAudio(request, apiKey);
  }

  console.log(`Wrote ${writeManifest({ args, cards, requestsByKey })}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
