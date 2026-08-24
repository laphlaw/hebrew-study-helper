const sampleWords = [
  ["בְּרֵאשִׁית", "beginning", "noun", "רֵאשִׁית", "", []],
  ["אוֹר", "light", "noun", "אוֹר", "", []],
  ["טוֹב", "good", "other", "טוֹב", "", []],
  ["שָׁלוֹם", "peace", "noun", "שָׁלוֹם", "", []],
  ["חֶסֶד", "steadfast love", "noun", "חֶסֶד", "", []],
  ["אֱמֶת", "truth", "noun", "אֱמֶת", "", []],
  ["מֶלֶךְ", "king", "noun", "מֶלֶךְ", "", []],
  ["בַּיִת", "house", "noun", "בַּיִת", "", []],
  ["דָּבָר", "word, thing", "noun", "דָּבָר", "", []],
  ["רוּחַ", "spirit, wind", "noun", "רוּחַ", "", []]
];

let allWords = [...sampleWords];
let studyWords = [...allWords];
let visibleWords = [...studyWords];
let verbGroups = [];
let currentVerbIndex = 0;
let selectedVerbPerson = "he";
let selectedVerbAspect = "complete";
let currentIndex = 0;
let writingInput = [];
let revealed = false;
let deckFinished = false;
let direction = "hebrew";
let formMode = "root";
let currentMode = "study";
let maculaIndex = null;
let currentChapterRecords = [];
let verbFormIndex = {};
let verbMeaningIndex = {};
let autoAdvanceTimer = null;
let fallbackReadingFullscreen = false;
const chapterStorageKey = "hebrew-study-helper:last-chapter";
const masteredWordsStorageKey = "hebrew-study-helper:mastered-words";
const legacyHiddenWordsStorageKey = "hebrew-study-helper:hidden-words";
const autoAdvanceStorageKey = "hebrew-study-helper:auto-advance";
const orderStorageKey = "hebrew-study-helper:word-order";
const preferencesStorageKey = "hebrew-study-helper:preferences";
const audioFlashcardSettingsStorageKey = "hebrew-study-helper:audio-flashcards";
const masteredWords = loadMasteredWordKeys();

const els = {
  bookSelect: document.querySelector("#book-select"),
  chapterSelect: document.querySelector("#chapter-select"),
  modeSelect: document.querySelector("#mode-select"),
  flashcardSection: document.querySelector("#flashcard-section"),
  readingSection: document.querySelector("#reading-section"),
  audioFlashcardSection: document.querySelector("#audio-flashcard-section"),
  audioFlashcardStatus: document.querySelector("#audio-flashcard-status"),
  audioFlashcardText: document.querySelector("#audio-flashcard-text"),
  audioFlashcardSelectButton: document.querySelector("#audio-flashcard-select-button"),
  audioFlashcardCopyButton: document.querySelector("#audio-flashcard-copy-button"),
  audioHebrewRepeat: document.querySelector("#audio-hebrew-repeat"),
  audioEnglishRepeat: document.querySelector("#audio-english-repeat"),
  audioLineSeparator: document.querySelector("#audio-line-separator"),
  audioPlainHebrewToggle: document.querySelector("#audio-plain-hebrew-toggle"),
  verbPracticeSection: document.querySelector("#verb-practice-section"),
  writingSection: document.querySelector("#writing-section"),
  writingCardButton: document.querySelector("#writing-card-button"),
  writingPrompt: document.querySelector("#writing-prompt"),
  writingSlots: document.querySelector("#writing-slots"),
  writingStatus: document.querySelector("#writing-status"),
  writingCount: document.querySelector("#writing-count"),
  hebrewKeyboard: document.querySelector("#hebrew-keyboard"),
  verbSelect: document.querySelector("#verb-select"),
  readingStatus: document.querySelector("#reading-status"),
  readingText: document.querySelector("#reading-text"),
  readingFontSize: document.querySelector("#reading-font-size"),
  readingFontLabel: document.querySelector("#reading-font-label"),
  readingFullscreenButton: document.querySelector("#reading-fullscreen-button"),
  readingExitFullscreenButton: document.querySelector("#reading-exit-fullscreen-button"),
  readingNav: document.querySelector("#reading-nav"),
  readingPrevButton: document.querySelector("#reading-prev-button"),
  readingNextButton: document.querySelector("#reading-next-button"),
  verbCardButton: document.querySelector("#verb-card-button"),
  verbRoot: document.querySelector("#verb-root"),
  verbGloss: document.querySelector("#verb-gloss"),
  verbSelectionLabel: document.querySelector("#verb-selection-label"),
  verbAspectHelp: document.querySelector("#verb-aspect-help"),
  verbAnswerGloss: document.querySelector("#verb-answer-gloss"),
  verbPersonOptions: document.querySelector("#verb-person-options"),
  verbAspectOptions: document.querySelector("#verb-aspect-options"),
  verbCount: document.querySelector("#verb-count"),
  settingsButton: document.querySelector("#settings-button"),
  settingsCloseButton: document.querySelector("#settings-close-button"),
  settingsDialog: document.querySelector("#settings-dialog"),
  settingsSection: document.querySelector("#settings-section"),
  wordListSection: document.querySelector("#word-list-section"),
  cardButton: document.querySelector("#card-button"),
  revealButton: document.querySelector("#reveal-button"),
  hebrewWord: document.querySelector("#hebrew-word"),
  englishWord: document.querySelector("#english-word"),
  cardCount: document.querySelector("#card-count"),
  masterWordButton: document.querySelector("#master-word-button"),
  directionSelect: document.querySelector("#direction-select"),
  formSelect: document.querySelector("#form-select"),
  posSelect: document.querySelector("#pos-select"),
  searchInput: document.querySelector("#search-input"),
  showMasteredToggle: document.querySelector("#show-mastered-toggle"),
  orderSelect: document.querySelector("#order-select"),
  autoAdvanceToggle: document.querySelector("#auto-advance-toggle"),
  autoAdvanceSpeed: document.querySelector("#auto-advance-speed"),
  autoAdvanceLabel: document.querySelector("#auto-advance-label"),
  manageMasteredButton: document.querySelector("#manage-mastered-button"),
  removeAllMasteredButton: document.querySelector("#remove-all-mastered-button"),
  masteredDialog: document.querySelector("#mastered-dialog"),
  masteredSummary: document.querySelector("#mastered-summary"),
  masteredList: document.querySelector("#mastered-list"),
  wordTable: document.querySelector("#word-table")
};

function wordFromParts(hebrew, english, pos, root, morph = "", refs = [], strong = "") {
  return [hebrew, english, pos, root || hebrew, morph, refs, strong];
}

function parseWords(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const parts = line.includes("\t")
        ? line.split("\t")
        : line.includes(",")
          ? line.split(",")
          : line.split(/\s+=\s+|\s+-\s+|\s+:\s+/);

      const hebrew = (parts[0] || "").trim();
      const possiblePos = normalizePartOfSpeech(parts.at(-1), false);
      const hasPartOfSpeech = Boolean(possiblePos);
      const possibleRootIndex = hasPartOfSpeech ? parts.length - 2 : parts.length - 1;
      const possibleRoot = (parts[possibleRootIndex] || "").trim();
      const hasExplicitRoot = possibleRootIndex > 1 && containsHebrew(possibleRoot);
      const englishEnd = hasExplicitRoot ? possibleRootIndex : hasPartOfSpeech ? parts.length - 1 : parts.length;
      const english = parts.slice(1, englishEnd).join(",").trim();
      const pos = possiblePos || "other";
      const root = hasExplicitRoot ? possibleRoot : deriveHeadword(hebrew, pos);
      return wordFromParts(hebrew, english, pos, root);
    })
    .filter(([hebrew, english]) => hebrew && english);
}

function normalizePartOfSpeech(value = "", useFallback = true) {
  const pos = value.trim().toLowerCase();
  if (["n", "noun", "proper noun", "name"].includes(pos)) return "noun";
  if (["v", "verb", "participle", "infinitive"].includes(pos)) return "verb";
  if (pos === "other") return "other";
  return useFallback ? "other" : "";
}

function containsHebrew(value = "") {
  return /[\u0590-\u05FF]/.test(value);
}

function stripNiqqud(value = "") {
  return value.replace(/[\u0591-\u05C7]/g, "");
}

function normalizeMasteredKeyPart(value = "") {
  return stripNiqqud(value).replace(/[־\s]/g, "").toLowerCase();
}

function getWordKey([hebrew, , pos, root]) {
  return `${pos}|${normalizeMasteredKeyPart(root || hebrew)}`;
}

function isWordMastered(word) {
  return masteredWords.has(getWordKey(word));
}

function loadMasteredWordKeys() {
  try {
    const savedText =
      localStorage.getItem(masteredWordsStorageKey) ||
      localStorage.getItem(legacyHiddenWordsStorageKey) ||
      "[]";
    const saved = JSON.parse(savedText);
    const entries = Array.isArray(saved) ? saved : [];
    return new Map(entries.map((entry) => {
      if (typeof entry === "string") {
        const [, root = entry] = entry.split("|");
        return [entry, { key: entry, hebrew: root, root, english: "", pos: entry.split("|")[0] || "other" }];
      }

      return [entry.key, entry];
    }).filter(([key]) => key));
  } catch {
    return new Map();
  }
}

function saveMasteredWordKeys() {
  localStorage.setItem(masteredWordsStorageKey, JSON.stringify([...masteredWords.values()]));
}

function getSavedPreferences() {
  try {
    const saved = JSON.parse(localStorage.getItem(preferencesStorageKey) || "{}");
    const legacyAuto = JSON.parse(localStorage.getItem(autoAdvanceStorageKey) || "{}");
    return {
      mode: ["reading", "audio", "writing", "verbs"].includes(saved.mode) ? saved.mode : "study",
      direction: saved.direction === "english" ? "english" : "hebrew",
      formMode: saved.formMode === "text" ? "text" : "root",
      partOfSpeech: ["noun", "verb", "other"].includes(saved.partOfSpeech) ? saved.partOfSpeech : "all",
      showMastered: Boolean(saved.showMastered),
      order: saved.order === "ordered" || localStorage.getItem(orderStorageKey) === "ordered" ? "ordered" : "random",
      readingFontSize: clampReadingFontSize(saved.readingFontSize),
      autoAdvance: {
        enabled: Boolean(saved.autoAdvance?.enabled ?? legacyAuto.enabled),
        seconds: clampAutoAdvanceSeconds(saved.autoAdvance?.seconds ?? legacyAuto.seconds)
      }
    };
  } catch {
    return {
      direction: "hebrew",
      mode: "study",
      formMode: "root",
      partOfSpeech: "all",
      showMastered: false,
      order: "random",
      readingFontSize: 3.2,
      autoAdvance: { enabled: false, seconds: 3 }
    };
  }
}

function savePreferences() {
  localStorage.setItem(preferencesStorageKey, JSON.stringify({
    mode: els.modeSelect.value,
    direction: els.directionSelect.value,
    formMode: els.formSelect.value,
    partOfSpeech: els.posSelect.value,
    showMastered: els.showMasteredToggle.checked,
    order: els.orderSelect.value,
    readingFontSize: getReadingFontSize(),
    autoAdvance: {
      enabled: els.autoAdvanceToggle.checked,
      seconds: getAutoAdvanceSeconds()
    }
  }));
}

function applySavedPreferences() {
  const preferences = getSavedPreferences();
  currentMode = preferences.mode;
  direction = preferences.direction;
  formMode = preferences.formMode;
  els.modeSelect.value = preferences.mode;
  els.directionSelect.value = preferences.direction;
  els.formSelect.value = preferences.formMode;
  els.posSelect.value = preferences.partOfSpeech;
  els.showMasteredToggle.checked = preferences.showMastered;
  els.orderSelect.value = preferences.order;
  els.readingFontSize.value = String(preferences.readingFontSize);
  els.autoAdvanceToggle.checked = preferences.autoAdvance.enabled;
  els.autoAdvanceSpeed.value = String(preferences.autoAdvance.seconds);
  updateReadingFontSize();
  updateAutoAdvance();
  renderMode();
}

function saveAutoAdvanceSettings() {
  savePreferences();
}

function clampAutoAdvanceSeconds(value) {
  return Math.min(Math.max(Number(value) || 3, 0.1), 5);
}

function getAutoAdvanceSeconds() {
  return clampAutoAdvanceSeconds(els.autoAdvanceSpeed.value);
}

function formatAutoAdvanceSeconds(seconds) {
  return seconds >= 1 ? `${seconds.toFixed(seconds % 1 ? 1 : 0)}s` : `${Math.round(seconds * 1000)}ms`;
}

function clampReadingFontSize(value) {
  return Math.min(Math.max(Number(value) || 3.2, 1.6), 5.5);
}

function getReadingFontSize() {
  return clampReadingFontSize(els.readingFontSize.value);
}

function updateReadingFontSize() {
  const size = getReadingFontSize();
  els.readingFontSize.value = String(size);
  els.readingFontLabel.textContent = `${size.toFixed(1)}rem`;
  els.readingText.style.setProperty("--reading-font-size", `${size}rem`);
}

function isReadingFullscreen() {
  return document.fullscreenElement === els.readingSection || fallbackReadingFullscreen;
}

function renderReadingFullscreenState() {
  els.readingSection.classList.toggle("is-fullscreen", fallbackReadingFullscreen);
  els.readingFullscreenButton.textContent = isReadingFullscreen() ? "Exit fullscreen" : "Fullscreen";
}

async function enterReadingFullscreen() {
  if (document.fullscreenElement === els.readingSection) return;

  try {
    if (els.readingSection.requestFullscreen) {
      await els.readingSection.requestFullscreen();
    } else {
      fallbackReadingFullscreen = true;
    }
  } catch {
    fallbackReadingFullscreen = true;
  }

  renderReadingFullscreenState();
}

async function exitReadingFullscreen() {
  if (document.fullscreenElement && document.exitFullscreen) {
    await document.exitFullscreen();
  }

  fallbackReadingFullscreen = false;
  renderReadingFullscreenState();
}

function toggleReadingFullscreen() {
  if (isReadingFullscreen()) {
    exitReadingFullscreen().catch(console.error);
    return;
  }

  enterReadingFullscreen().catch(console.error);
}

function wordToMasteredRecord(word) {
  const [hebrew, english, pos, root] = word;
  return {
    key: getWordKey(word),
    hebrew,
    root: root || hebrew,
    english: formatAnswer(english),
    pos
  };
}

function deriveHeadword(hebrew, pos) {
  if (pos === "verb") return hebrew.replace(/^ו[\u0591-\u05C7]*(?=[א-ת])/, "");

  let root = hebrew.trim();
  root = root.replace(/^ו[\u0591-\u05C7]*(?=[א-ת])/, "");
  root = root.replace(/^[בלכ][\u0591-\u05C7]*(?=[א-ת])/, "");
  root = root.replace(/^ה[\u0591-\u05C7]*(?=[א-ת])/, "");
  return root || hebrew;
}

function uniqueWordsFromMacula(records) {
  const grouped = new Map();

  records.forEach((record) => {
    const hebrew = record.h;
    const root = record.l || record.h;
    const pos = record.p || "other";
    const key = `${stripNiqqud(hebrew)}|${stripNiqqud(root)}|${pos}`;

    if (!grouped.has(key)) {
      grouped.set(key, {
        hebrew,
        root,
        pos,
        glosses: new Set(),
        morphs: new Set(),
        refs: new Set(),
        strongs: new Set()
      });
    }

    const group = grouped.get(key);
    if (record.g) group.glosses.add(record.g);
    if (record.m) group.morphs.add(record.m);
    if (record.r) group.refs.add(record.r);
    if (record.s) group.strongs.add(record.s);
  });

  return [...grouped.values()].map((group) => {
    const english = [...group.glosses].join("; ") || group.root;
    return wordFromParts(group.hebrew, english, group.pos, group.root, [...group.morphs].join(", "), [...group.refs], [...group.strongs][0] || "");
  });
}

function getStudyWords() {
  if (formMode === "text") return [...allWords];

  const grouped = new Map();
  allWords.forEach(([hebrew, english, pos, root, morph, refs = [], strong = ""]) => {
    const key = `${stripNiqqud(root)}|${pos}`;
    if (!grouped.has(key)) {
      grouped.set(key, {
        hebrew: root,
        english: new Set(),
        pos,
        root,
        forms: new Set(),
        morphs: new Set(),
        refs: new Set(),
        strongs: new Set()
      });
    }

    const group = grouped.get(key);
    group.english.add(english);
    group.forms.add(hebrew);
    if (morph) group.morphs.add(morph);
    refs.forEach((ref) => group.refs.add(ref));
    if (strong) group.strongs.add(strong);
  });

  return [...grouped.values()].map((group) => {
    const forms = [...group.forms];
    const glosses = [...group.english];
    const english = glosses.length === 1 ? glosses[0] : glosses.join("; ");
    const formNote = forms.length > 1 ? ` (Forms: ${forms.join(" / ")})` : "";
    return wordFromParts(group.hebrew, `${english}${formNote}`, group.pos, group.root, [...group.morphs].join(", "), [...group.refs], [...group.strongs][0] || "");
  });
}

const verbPeople = [
  { value: "i", label: "I" },
  { value: "he", label: "he" },
  { value: "she", label: "she" },
  { value: "we", label: "we" },
  { value: "you", label: "you" },
  { value: "they", label: "they" }
];

const verbAspects = [
  { value: "complete", label: "Complete" },
  { value: "incomplete", label: "Incomplete" },
  { value: "wayyiqtol", label: "Wayyiqtol" },
  { value: "participle", label: "Participle" }
];

const verbAspectHelpText = {
  complete: "finished action, often translated as past",
  incomplete: "unfinished or expected action",
  wayyiqtol: "story sequence, often translated \"and then...\"",
  participle: "ongoing or describing action"
};

function decodeVerbMorph(morph = "") {
  const match = morph.match(/^V.([A-Za-z])((?:[123][a-z]{1,2})|[a-z]{2,3})?/);
  const aspectCode = match?.[1] || "";
  const personCode = match?.[2] || "";
  const aspectMap = {
    p: "complete",
    i: "incomplete",
    w: "wayyiqtol",
    r: "participle"
  };
  const personMap = {
    "1cs": "i",
    "1cp": "we",
    "2ms": "you",
    "2fs": "you",
    "2mp": "you",
    "2fp": "you",
    "3ms": "he",
    "3fs": "she",
    "3mp": "they",
    "3fp": "they",
    ms: "he",
    msa: "he",
    mp: "they",
    mpa: "they",
    fs: "she",
    fsa: "she",
    fp: "they",
    fpa: "they"
  };

  return {
    aspect: aspectMap[aspectCode] || "",
    person: personMap[personCode] || ""
  };
}

function getVerbStem(morph = "") {
  return morph.startsWith("V") ? morph[1] || "" : "";
}

function singularizeSimpleVerb(value = "") {
  if (value.endsWith("ies")) return `${value.slice(0, -3)}y`;
  if (value.endsWith("ss")) return value;
  if (value.endsWith("es")) return value.slice(0, -2);
  if (value.endsWith("s") && value.length > 3) return value.slice(0, -1);
  return value;
}

function cleanBaseMeaning(gloss = "") {
  const irregular = new Map([
    ["arisen", "rise"],
    ["arose", "rise"],
    ["ate", "eat"],
    ["became", "become"],
    ["been", "be"],
    ["began", "begin"],
    ["bless", "bless"],
    ["blessed", "bless"],
    ["brought", "bring"],
    ["came", "come"],
    ["commanded", "command"],
    ["created", "create"],
    ["did", "do"],
    ["died", "die"],
    ["gave", "give"],
    ["gone", "go"],
    ["made", "make"],
    ["said", "say"],
    ["saw", "see"],
    ["shone", "shine"],
    ["spoken", "speak"],
    ["took", "take"],
    ["went", "go"],
    ["was", "be"]
  ]);
  let value = gloss
    .toLowerCase()
    .replace(/\[[^\]]*\]/g, "")
    .replace(/[;,.?]/g, "")
    .replace(/^(and|then)\s+/, "")
    .replace(/^(i|you|he|she|it|we|they)\s+/, "")
    .replace(/^(did|do|does|has|have|had|will|shall|may|might|can|could|should|would|is|are|was|were|be|been)\s+/, "")
    .replace(/^(to|as)\s+/, "")
    .trim();

  const words = value.split(/\s+/).filter(Boolean);
  if (!words.length) return "";
  if (["give", "make"].includes(words[0]) && words[1]) return `${words[0]} ${words[1]}`;
  if (["come", "go", "bring", "draw", "set"].includes(words[0]) && ["up", "down", "out", "in", "back", "near"].includes(words[1])) {
    return `${words[0]} ${words[1]}`;
  }

  value = words[0];
  if (irregular.has(value)) return irregular.get(value);
  if (value.endsWith("ing") && value.length > 5) {
    const stem = value.slice(0, -3);
    return stem.endsWith("y") ? `${stem.slice(0, -1)}ie` : stem;
  }
  if (value.endsWith("ed") && value.length > 4) {
    const stem = value.slice(0, -2);
    if (stem.endsWith("at") || stem.endsWith("it") || stem.endsWith("id")) return `${stem}e`;
    return stem;
  }
  return singularizeSimpleVerb(value);
}

function deriveRootMeaning(forms = [], fallbackGlosses = []) {
  const candidates = [
    ...forms.map((form) => form.g),
    ...fallbackGlosses
  ]
    .map(cleanBaseMeaning)
    .filter(Boolean)
    .filter((meaning) => meaning.length > 1);

  if (!candidates.length) return "do";

  const counts = new Map();
  candidates.forEach((candidate) => counts.set(candidate, (counts.get(candidate) || 0) + 1));
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].length - b[0].length || a[0].localeCompare(b[0]))[0][0];
}

function getVerbMeaning(rootKey, forms = [], fallbackGlosses = []) {
  const lexiconMeaning = verbMeaningIndex[rootKey]?.meaning;
  return lexiconMeaning || deriveRootMeaning(forms, fallbackGlosses);
}

function pastEnglishVerb(base = "") {
  const words = base.split(/\s+/).filter(Boolean);
  if (words.length > 1) return [pastEnglishVerb(words[0]), ...words.slice(1)].join(" ");

  const irregular = new Map([
    ["be", "was"],
    ["begin", "began"],
    ["bring", "brought"],
    ["come", "came"],
    ["do", "did"],
    ["eat", "ate"],
    ["give", "gave"],
    ["go", "went"],
    ["make", "made"],
    ["rise", "rose"],
    ["say", "said"],
    ["see", "saw"],
    ["shine", "shone"],
    ["speak", "spoke"],
    ["take", "took"],
    ["tread", "trod"]
  ]);
  if (irregular.has(base)) return irregular.get(base);
  if (base.endsWith("e")) return `${base}d`;
  return `${base}ed`;
}

function progressiveEnglishVerb(base = "") {
  const words = base.split(/\s+/).filter(Boolean);
  if (words.length > 1) return [progressiveEnglishVerb(words[0]), ...words.slice(1)].join(" ");

  if (base.endsWith("ie")) return `${base.slice(0, -2)}ying`;
  if (base.endsWith("e") && base !== "be") return `${base.slice(0, -1)}ing`;
  return `${base}ing`;
}

function beginnerVerbGloss(baseMeaning = "") {
  const person = verbPeople.find((item) => item.value === selectedVerbPerson)?.label || selectedVerbPerson;
  if (selectedVerbAspect === "complete") return `${person} ${pastEnglishVerb(baseMeaning)}`;
  if (selectedVerbAspect === "incomplete") return `${person} will ${baseMeaning}`;
  if (selectedVerbAspect === "wayyiqtol") return `and ${person} ${pastEnglishVerb(baseMeaning)}`;
  if (selectedVerbAspect === "participle") {
    const be = selectedVerbPerson === "i" ? "am" : ["we", "you", "they"].includes(selectedVerbPerson) ? "are" : "is";
    return `${person} ${be} ${progressiveEnglishVerb(baseMeaning)}`;
  }
  return `${person} ${baseMeaning}`;
}

function displayHebrewVerbForm(hebrew = "", aspect = "") {
  if (aspect === "wayyiqtol" && hebrew && !/^ו/.test(stripNiqqud(hebrew))) {
    return `וַ${hebrew}`;
  }
  return hebrew;
}

function formDisplayScore(hebrew = "", person = "", aspect = "", refs = []) {
  const plainHebrew = stripNiqqud(hebrew);
  let score = 0;
  const hasLeadingVav = /^ו/.test(plainHebrew);
  if (aspect === "wayyiqtol" && !hasLeadingVav) score += 20;
  if (aspect !== "wayyiqtol" && hasLeadingVav) score += 8;
  if (person === "i" && aspect === "complete" && !plainHebrew.endsWith("תי")) score += 20;
  if (refs.length && refs.every((ref) => /^(DAN|EZR)\b/.test(ref))) score += 10;
  score += Math.max(plainHebrew.length - 5, 0);
  return score;
}

function addVerbForm(formMap, label, hebrew, morph = "", refs = []) {
  const { person, aspect } = decodeVerbMorph(morph);
  if (!person || !aspect) return;

  const key = `${person}|${aspect}`;
  if (!formMap.has(key)) {
    formMap.set(key, {
      person,
      aspect,
      forms: new Set(),
      glosses: new Set(),
      morphs: new Set(),
      refs: new Set()
    });
  }

  const form = formMap.get(key);
  const currentScore = form.bestForm ? formDisplayScore(form.bestForm, person, aspect, [...form.refs]) : Infinity;
  const nextScore = formDisplayScore(hebrew, person, aspect, refs);
  if (!form.bestForm || nextScore < currentScore) {
    form.bestForm = hebrew;
  }
  form.forms.add(hebrew);
  form.glosses.add(formatAnswer(label).trim() || "verb form");
  if (morph) form.morphs.add(morph);
  refs.forEach((ref) => form.refs.add(ref));
}

function getVerbSelectorRoot(group, rootAlsoAppearsAsNoun) {
  if (!rootAlsoAppearsAsNoun) return group.root;

  const rootKey = stripNiqqud(group.root);
  return [...group.chapterForms].find((form) => stripNiqqud(form) !== rootKey) || group.root;
}

function buildVerbPracticeGroups() {
  const groupedRoots = new Map();
  const nounKeys = new Set(allWords
    .filter(([, , pos]) => pos === "noun")
    .map(([hebrew, , , root]) => stripNiqqud(root || hebrew)));

  allWords
    .filter(([, , pos]) => pos === "verb")
    .forEach(([hebrew, english, , root, morph, refs = []]) => {
      const rootKey = stripNiqqud(root || hebrew);
      if (!groupedRoots.has(rootKey)) {
        groupedRoots.set(rootKey, {
          root: root || hebrew,
          chapterForms: new Set(),
          glosses: new Set(),
          stems: new Set()
        });
      }

      const group = groupedRoots.get(rootKey);
      group.chapterForms.add(hebrew);
      group.glosses.add(formatAnswer(english) || "verb form");
      morph.split(/,\s*/).map(getVerbStem).filter(Boolean).forEach((stem) => group.stems.add(stem));
    });

  return [...groupedRoots.values()]
    .map((group) => {
      const rootKey = stripNiqqud(group.root);
      const indexGroup = verbFormIndex[rootKey];
      const formMap = new Map();
      const indexedForms = Array.isArray(indexGroup?.forms) ? indexGroup.forms : [];
      const chapterStems = group.stems.size ? group.stems : new Set(indexedForms.map((form) => getVerbStem(form.m)).filter(Boolean));
      const matchingStemForms = indexedForms.filter((form) => chapterStems.has(getVerbStem(form.m)));

      matchingStemForms.forEach((form) => addVerbForm(formMap, form.g, form.h, form.m, form.refs || []));

      if (!formMap.size) {
        allWords
          .filter(([, , pos, root]) => pos === "verb" && stripNiqqud(root) === rootKey)
          .forEach(([hebrew, english, , , morph, refs = []]) => addVerbForm(formMap, english, hebrew, morph, refs));
      }

      return {
        root: indexGroup?.root || group.root,
        selectorRoot: getVerbSelectorRoot(group, nounKeys.has(rootKey)),
        meaning: getVerbMeaning(rootKey, matchingStemForms, [...group.glosses]),
        forms: formMap
      };
    })
    .filter((group) => group.forms.size)
    .sort((a, b) => (
      a.meaning.localeCompare(b.meaning) ||
      stripNiqqud(a.root).localeCompare(stripNiqqud(b.root))
    ));
}

function renderVerbSelect() {
  els.verbSelect.innerHTML = "";
  els.verbSelect.disabled = !verbGroups.length;

  verbGroups.forEach((group, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = `${group.meaning} - ${group.selectorRoot || group.root}`;
    els.verbSelect.append(option);
  });

  if (verbGroups.length) {
    els.verbSelect.value = String(currentVerbIndex);
  }
}

function renderVerbPractice() {
  if (!verbGroups.length) {
    renderVerbSelect();
    els.verbRoot.textContent = "אין פעלים";
    els.verbGloss.textContent = "";
    els.verbSelectionLabel.textContent = "";
    els.verbAspectHelp.textContent = "";
    els.verbAnswerGloss.textContent = "";
    els.verbGloss.classList.add("hidden");
    els.verbSelectionLabel.classList.add("hidden");
    els.verbAspectHelp.classList.add("hidden");
    els.verbAnswerGloss.classList.add("hidden");
    els.verbPersonOptions.innerHTML = "";
    els.verbAspectOptions.innerHTML = "";
    els.verbCount.textContent = "0 / 0";
    return;
  }

  currentVerbIndex = (currentVerbIndex + verbGroups.length) % verbGroups.length;
  const group = verbGroups[currentVerbIndex];
  if (els.verbSelect.value !== String(currentVerbIndex)) {
    els.verbSelect.value = String(currentVerbIndex);
  }
  els.verbGloss.textContent = "";
  els.verbSelectionLabel.textContent = "";
  els.verbAspectHelp.textContent = "";
  els.verbGloss.classList.add("hidden");
  els.verbSelectionLabel.classList.add("hidden");
  els.verbAspectHelp.classList.add("hidden");
  els.verbCount.textContent = `${currentVerbIndex + 1} / ${verbGroups.length}`;
  renderVerbOptionButtons(group);

  renderVerbAnswer();
}

function getVerbFormForSelection(group = verbGroups[currentVerbIndex]) {
  return group?.forms.get(`${selectedVerbPerson}|${selectedVerbAspect}`);
}

function firstAvailableAspectForPerson(group, person) {
  return verbAspects.find((aspect) => group.forms.has(`${person}|${aspect.value}`))?.value || "";
}

function renderVerbOptionButtons(group) {
  els.verbPersonOptions.innerHTML = "";
  els.verbAspectOptions.innerHTML = "";

  verbPeople.forEach((person) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "verb-option-button";
    button.textContent = person.label;
    button.classList.toggle("is-selected", person.value === selectedVerbPerson);
    button.classList.toggle("has-form", hasVerbFormForPerson(group, person.value));
    button.addEventListener("click", () => {
      selectedVerbPerson = person.value;
      if (!group.forms.has(`${selectedVerbPerson}|${selectedVerbAspect}`)) {
        selectedVerbAspect = firstAvailableAspectForPerson(group, selectedVerbPerson) || selectedVerbAspect;
      }
      renderVerbPractice();
    });
    els.verbPersonOptions.append(button);
  });

  verbAspects.forEach((aspect) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "verb-option-button";
    button.textContent = aspect.label;
    const hasSelectedPersonForm = group.forms.has(`${selectedVerbPerson}|${aspect.value}`);
    button.classList.toggle("is-selected", aspect.value === selectedVerbAspect);
    button.classList.toggle("has-form", hasVerbFormForAspect(group, aspect.value));
    button.disabled = !hasSelectedPersonForm;
    button.addEventListener("click", () => {
      if (!hasSelectedPersonForm) return;
      selectedVerbAspect = aspect.value;
      renderVerbPractice();
    });
    els.verbAspectOptions.append(button);
  });
}

function hasVerbFormForPerson(group, person) {
  return verbAspects.some((aspect) => group.forms.has(`${person}|${aspect.value}`));
}

function hasVerbFormForAspect(group, aspect) {
  return verbPeople.some((person) => group.forms.has(`${person.value}|${aspect}`));
}

function selectedVerbLabel() {
  const person = verbPeople.find((item) => item.value === selectedVerbPerson)?.label || selectedVerbPerson;
  const aspect = verbAspects.find((item) => item.value === selectedVerbAspect)?.label || selectedVerbAspect;
  return `${person} - ${aspect}`;
}

function renderVerbAnswer() {
  const group = verbGroups[currentVerbIndex];
  const form = getVerbFormForSelection();
  els.verbSelectionLabel.textContent = "";
  els.verbAspectHelp.textContent = "";
  els.verbSelectionLabel.classList.add("hidden");
  els.verbAspectHelp.classList.add("hidden");

  if (!form) {
    els.verbRoot.textContent = "Not found";
    els.verbRoot.dir = "ltr";
    els.verbRoot.classList.add("is-missing-form");
    els.verbAnswerGloss.textContent = "";
    els.verbAnswerGloss.classList.add("hidden");
    return;
  }

  els.verbRoot.dir = "rtl";
  els.verbRoot.classList.remove("is-missing-form");
  els.verbRoot.textContent = displayHebrewVerbForm(form.bestForm || [...form.forms][0] || "", selectedVerbAspect);
  els.verbAnswerGloss.textContent = beginnerVerbGloss(group.meaning);
  els.verbAnswerGloss.classList.remove("hidden");
}

function selectDefaultVerbCombo(group) {
  const preferred = [
    ["he", "complete"],
    ["he", "wayyiqtol"],
    ["he", "incomplete"],
    ["she", "complete"],
    ["they", "complete"],
    ["i", "complete"]
  ];
  const match = preferred.find(([person, aspect]) => group.forms.has(`${person}|${aspect}`));
  if (match) {
    [selectedVerbPerson, selectedVerbAspect] = match;
    return;
  }

  for (const person of verbPeople) {
    for (const aspect of verbAspects) {
      if (group.forms.has(`${person.value}|${aspect.value}`)) {
        selectedVerbPerson = person.value;
        selectedVerbAspect = aspect.value;
        return;
      }
    }
  }
}

function showVerb(index = currentVerbIndex) {
  currentVerbIndex = index;
  const group = verbGroups[(currentVerbIndex + verbGroups.length) % verbGroups.length];
  if (group) selectDefaultVerbCombo(group);
  renderVerbPractice();
}

function moveVerbBy(delta) {
  if (!verbGroups.length) return;
  showVerb(currentVerbIndex + delta);
}

function formatAnswer(english) {
  const formMatch = english.match(/\s+\(Forms: ([^)]+)\)$/);
  return formMatch ? english.replace(formMatch[0], "") : english;
}

function showCard(index = currentIndex) {
  if (!visibleWords.length) {
    deckFinished = false;
    els.hebrewWord.textContent = "אין מילים";
    els.englishWord.textContent = "No matching words";
    els.cardCount.textContent = "0 / 0";
    els.masterWordButton.disabled = true;
    els.masterWordButton.textContent = "Mark as mastered";
    revealed = true;
    renderRevealState();
    return;
  }

  if (index >= visibleWords.length) {
    showFinishedCard();
    return;
  }

  deckFinished = false;
  currentIndex = (index + visibleWords.length) % visibleWords.length;
  revealed = false;
  const word = visibleWords[currentIndex];
  const [hebrew, english] = word;
  els.hebrewWord.textContent = hebrew;
  els.englishWord.textContent = formatAnswer(english);
  els.cardCount.textContent = `${currentIndex + 1} / ${visibleWords.length}`;
  els.masterWordButton.disabled = false;
  els.masterWordButton.textContent = isWordMastered(word) ? "Unmaster" : "Mark as mastered";
  renderRevealState();
}

function showFinishedCard() {
  deckFinished = true;
  revealed = true;
  els.hebrewWord.textContent = "Finished";
  els.englishWord.textContent = "Next starts over";
  els.cardCount.textContent = `${visibleWords.length} / ${visibleWords.length}`;
  els.masterWordButton.disabled = true;
  els.masterWordButton.textContent = "Mark as mastered";
  renderRevealState();
}

function renderRevealState() {
  els.cardButton.classList.toggle("is-finished", deckFinished);
  if (deckFinished) {
    els.hebrewWord.classList.remove("hidden");
    els.englishWord.classList.remove("hidden");
    els.cardButton.setAttribute("aria-label", "Finished. Start over");
    els.revealButton.disabled = true;
    return;
  }

  const showingHebrewFirst = direction === "hebrew";
  els.hebrewWord.classList.toggle("hidden", !showingHebrewFirst && !revealed);
  els.englishWord.classList.toggle("hidden", showingHebrewFirst && !revealed);
  els.cardButton.setAttribute("aria-label", "Next word");
  els.revealButton.disabled = revealed || !visibleWords.length;
}

function revealAnswer() {
  if (deckFinished || !visibleWords.length || revealed) return;
  revealed = true;
  renderRevealState();
}

function moveBy(delta) {
  if (deckFinished) {
    showCard(delta < 0 ? visibleWords.length - 1 : 0);
    return;
  }

  showCard(currentIndex + delta);
}

function autoAdvanceStep() {
  if (!visibleWords.length) return;
  moveBy(1);
}

function cardTapAction() {
  if (deckFinished) {
    showCard(0);
    return;
  }

  moveBy(1);
}

function stopAutoAdvance() {
  if (!autoAdvanceTimer) return;
  clearInterval(autoAdvanceTimer);
  autoAdvanceTimer = null;
}

function updateAutoAdvance() {
  stopAutoAdvance();
  const seconds = getAutoAdvanceSeconds();
  els.autoAdvanceSpeed.value = String(seconds);
  els.autoAdvanceLabel.textContent = formatAutoAdvanceSeconds(seconds);

  if (!els.autoAdvanceToggle.checked) {
    return;
  }

  autoAdvanceTimer = setInterval(autoAdvanceStep, seconds * 1000);
}

function handleAutoAdvanceChange() {
  saveAutoAdvanceSettings();
  updateAutoAdvance();
}

function renderMode() {
  const readingMode = currentMode === "reading";
  const audioMode = currentMode === "audio";
  const verbMode = currentMode === "verbs";
  const writingMode = currentMode === "writing";
  els.flashcardSection.classList.toggle("hidden", readingMode || audioMode || verbMode || writingMode);
  els.audioFlashcardSection.classList.toggle("hidden", !audioMode);
  els.verbPracticeSection.classList.toggle("hidden", !verbMode);
  els.writingSection.classList.toggle("hidden", !writingMode);
  els.settingsButton.classList.toggle("hidden", readingMode || audioMode || verbMode);
  els.wordListSection.classList.toggle("hidden", readingMode || audioMode || verbMode || writingMode);
  els.readingSection.classList.toggle("hidden", !readingMode);
  els.manageMasteredButton.classList.toggle("hidden", readingMode || audioMode || verbMode);

  if (readingMode || audioMode || verbMode || writingMode) {
    if (els.settingsDialog.open) {
      els.settingsDialog.close();
    }
    stopAutoAdvance();
  } else {
    if (isReadingFullscreen()) {
      exitReadingFullscreen().catch(console.error);
    }
    updateAutoAdvance();
  }

  if (verbMode) {
    renderVerbPractice();
  }

  if (writingMode) {
    renderWritingCard();
  }

  if (audioMode) {
    renderAudioFlashcards();
  }
}

function spaceAction() {
  if (deckFinished) {
    showCard(0);
    return;
  }

  if (revealed) {
    moveBy(1);
    return;
  }

  revealAnswer();
}

function shuffleWords() {
  visibleWords = visibleWords
    .map((word) => ({ word, order: Math.random() }))
    .sort((a, b) => a.order - b.order)
    .map(({ word }) => word);
  showCard(0);
  renderList();
}

function shuffledWords(words) {
  return words
    .map((word) => ({ word, order: Math.random() }))
    .sort((a, b) => a.order - b.order)
    .map(({ word }) => word);
}

function orderWords(words) {
  return els.orderSelect.value === "random" ? shuffledWords(words) : [...words];
}

const hebrewKeyboardRows = [
  ["א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט"],
  ["י", "כ", "ך", "ל", "מ", "ם", "נ", "ן", "ס"],
  ["ע", "פ", "ף", "צ", "ץ", "ק", "ר", "ש", "ת"]
];

const hebrewMarkKeys = [
  { label: "◌ּ", value: "\u05BC", title: "Dagesh" },
  { label: "◌ׁ", value: "\u05C1", title: "Shin dot" },
  { label: "◌ׂ", value: "\u05C2", title: "Sin dot" },
  { label: "◌ְ", value: "\u05B0", title: "Sheva" },
  { label: "◌ִ", value: "\u05B4", title: "Hiriq" },
  { label: "◌ֵ", value: "\u05B5", title: "Tsere" },
  { label: "◌ֶ", value: "\u05B6", title: "Segol" },
  { label: "◌ַ", value: "\u05B7", title: "Patah" },
  { label: "◌ָ", value: "\u05B8", title: "Qamats" },
  { label: "◌ֹ", value: "\u05B9", title: "Holam" },
  { label: "◌ֻ", value: "\u05BB", title: "Qubuts" }
];

function hebrewLetterClusters(value = "") {
  return [...value.normalize("NFC").matchAll(/[א-ת][\u0591-\u05C7]*/g)].map((match) => match[0]);
}

function writingTargetClusters(word = visibleWords[currentIndex]) {
  return hebrewLetterClusters(word?.[0] || "");
}

function writingConsonants(value = "") {
  return stripNiqqud(value).replace(/[^א-ת]/g, "");
}

function currentWritingWord() {
  return visibleWords[currentIndex];
}

function writingIsCorrect() {
  const target = writingConsonants(currentWritingWord()?.[0] || "");
  return Boolean(target) && writingConsonants(writingInput.join("")) === target;
}

function addWritingLetter(letter) {
  if (!visibleWords.length) return;
  const targetLength = writingTargetClusters().length;
  if (writingInput.length >= targetLength) return;

  writingInput.push(letter);
  renderWritingCard();
}

function addWritingMark(mark) {
  if (!writingInput.length) return;
  const lastIndex = writingInput.length - 1;
  if (writingInput[lastIndex].includes(mark)) return;
  writingInput[lastIndex] = `${writingInput[lastIndex]}${mark}`;
  renderWritingCard();
}

function removeWritingInput() {
  writingInput.pop();
  renderWritingCard();
}

function clearWritingInput() {
  writingInput = [];
  renderWritingCard();
}

function fillWritingHint() {
  const target = writingTargetClusters();
  if (!target.length || writingInput.length >= target.length) return;
  writingInput.push(target[writingInput.length]);
  renderWritingCard();
}

function showWritingCard(index = currentIndex) {
  if (!visibleWords.length) {
    writingInput = [];
    els.writingPrompt.textContent = "No matching words";
    els.writingSlots.innerHTML = "";
    els.writingStatus.textContent = "";
    els.writingCount.textContent = "0 / 0";
    return;
  }

  currentIndex = (index + visibleWords.length) % visibleWords.length;
  writingInput = [];
  renderWritingCard();
}

function moveWritingBy(delta) {
  if (!visibleWords.length) return;
  showWritingCard(currentIndex + delta);
}

function renderWritingCard() {
  const word = currentWritingWord();
  if (!word) {
    showWritingCard(0);
    return;
  }

  const [, english] = word;
  const target = writingTargetClusters(word);
  const correct = writingIsCorrect();
  els.writingPrompt.textContent = formatAnswer(english);
  els.writingSlots.innerHTML = "";
  els.writingStatus.textContent = correct ? "Correct" : "";
  els.writingCount.textContent = `${currentIndex + 1} / ${visibleWords.length}`;
  els.writingCardButton.classList.toggle("is-correct", correct);

  target.forEach((targetCluster, index) => {
    const slot = document.createElement("span");
    const typed = writingInput[index] || "";
    slot.className = "writing-slot";
    slot.classList.toggle("is-filled", Boolean(typed));
    slot.classList.toggle("is-current", index === writingInput.length && !correct);
    slot.classList.toggle("is-wrong", Boolean(typed) && writingConsonants(typed) !== writingConsonants(targetCluster));
    slot.textContent = typed || "";
    els.writingSlots.append(slot);
  });
}

function renderHebrewKeyboard() {
  els.hebrewKeyboard.innerHTML = "";

  hebrewKeyboardRows.forEach((row) => {
    const rowElement = document.createElement("div");
    rowElement.className = "keyboard-row";
    row.forEach((letter) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "hebrew-key";
      button.dir = "rtl";
      button.textContent = letter;
      button.addEventListener("click", () => addWritingLetter(letter));
      rowElement.append(button);
    });
    els.hebrewKeyboard.append(rowElement);
  });

  const marksRow = document.createElement("div");
  marksRow.className = "keyboard-row mark-row";
  hebrewMarkKeys.forEach((mark) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "hebrew-key mark-key";
    button.textContent = mark.label;
    button.title = mark.title;
    button.setAttribute("aria-label", mark.title);
    button.addEventListener("click", () => addWritingMark(mark.value));
    marksRow.append(button);
  });
  els.hebrewKeyboard.append(marksRow);

  const actionRow = document.createElement("div");
  actionRow.className = "keyboard-row action-row";
  [
    ["Back", removeWritingInput],
    ["Clear", clearWritingInput],
    ["Hint", fillWritingHint],
    ["Next", () => moveWritingBy(1)]
  ].forEach(([label, action]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "keyboard-action";
    button.textContent = label;
    button.addEventListener("click", action);
    actionRow.append(button);
  });
  els.hebrewKeyboard.append(actionRow);
}

function applyFilter() {
  const query = els.searchInput.value.trim().toLowerCase();
  const selectedPos = els.posSelect.value;
  const showMastered = els.showMasteredToggle.checked;
  studyWords = getStudyWords();
  const filteredWords = studyWords.filter((word) => {
    const [hebrew, english, pos, root] = word;
    const matchesText =
      hebrew.includes(query) ||
      root.includes(query) ||
      english.toLowerCase().includes(query);
    const matchesPartOfSpeech = selectedPos === "all" || pos === selectedPos;
    const matchesMastered = showMastered || !isWordMastered(word);
    return matchesText && matchesPartOfSpeech && matchesMastered;
  });
  visibleWords = orderWords(filteredWords);
  showCard(0);
  if (currentMode === "writing") {
    showWritingCard(0);
  }
  renderList();
}

function toggleMasteredWord(word) {
  const key = getWordKey(word);
  const willMaster = !masteredWords.has(key);
  if (masteredWords.has(key)) {
    masteredWords.delete(key);
  } else {
    masteredWords.set(key, wordToMasteredRecord(word));
  }

  saveMasteredWordKeys();
  renderMasteredModal();
  if (willMaster && !els.showMasteredToggle.checked) {
    visibleWords = visibleWords.filter((visibleWord) => getWordKey(visibleWord) !== key);
    showCard(Math.min(currentIndex, visibleWords.length - 1));
    renderList();
    return;
  }

  showCard(currentIndex);
  renderList();
}

function unmasterWordByKey(key) {
  masteredWords.delete(key);
  saveMasteredWordKeys();
  applyFilter();
  renderMasteredModal();
}

function getMasteredRecords() {
  return [...masteredWords.values()]
    .sort((a, b) => stripNiqqud(a.root || a.hebrew).localeCompare(stripNiqqud(b.root || b.hebrew)));
}

function renderMasteredModal() {
  els.masteredSummary.textContent = `${masteredWords.size} mastered ${masteredWords.size === 1 ? "word" : "words"}`;
  els.removeAllMasteredButton.disabled = masteredWords.size === 0;
  els.masteredList.innerHTML = "";

  const records = getMasteredRecords();
  if (!records.length) {
    const empty = document.createElement("p");
    empty.className = "empty-mastered";
    empty.textContent = "No mastered words yet.";
    els.masteredList.append(empty);
    return;
  }

  records.forEach((record) => {
    const row = document.createElement("div");
    row.className = "mastered-row";

    const hebrew = document.createElement("span");
    hebrew.className = "mastered-hebrew";
    hebrew.dir = "rtl";
    hebrew.textContent = record.hebrew || record.root || record.key;

    const details = document.createElement("span");
    details.className = "mastered-details";
    details.textContent = [record.english, record.root && `Root: ${record.root}`, record.pos].filter(Boolean).join(" | ");

    const action = document.createElement("button");
    action.type = "button";
    action.className = "secondary-button";
    action.textContent = "Remove";
    action.addEventListener("click", () => unmasterWordByKey(record.key));

    row.append(hebrew, details, action);
    els.masteredList.append(row);
  });
}

function removeAllMasteredWords() {
  masteredWords.clear();
  saveMasteredWordKeys();
  applyFilter();
  renderMasteredModal();
}

function openMasteredModal() {
  renderMasteredModal();
  els.masteredDialog.showModal();
}

function toggleCurrentMasteredWord() {
  if (!visibleWords.length || deckFinished) return;
  toggleMasteredWord(visibleWords[currentIndex]);
}

function renderList() {
  els.wordTable.innerHTML = "";

  visibleWords.forEach((word, index) => {
    const [hebrew, english, pos, root] = word;
    const mastered = isWordMastered(word);
    const row = document.createElement("div");
    row.className = "word-row";
    row.classList.toggle("is-mastered-word", mastered);

    const hebrewButton = document.createElement("button");
    hebrewButton.type = "button";
    hebrewButton.className = "hebrew";
    hebrewButton.dir = "rtl";
    hebrewButton.textContent = hebrew;
    hebrewButton.addEventListener("click", () => showCard(index));

    const englishButton = document.createElement("button");
    englishButton.type = "button";
    englishButton.textContent = formMode === "text" && root && root !== hebrew ? `${english} | ${root}` : english;
    englishButton.addEventListener("click", () => showCard(index));

    const posBadge = document.createElement("span");
    posBadge.className = `pos-badge ${pos}`;
    posBadge.textContent = pos;

    const masterButton = document.createElement("button");
    masterButton.type = "button";
    masterButton.className = "master-row-button";
    masterButton.textContent = mastered ? "Unmaster" : "Master";
    masterButton.addEventListener("click", () => toggleMasteredWord(word));

    row.append(hebrewButton, englishButton, posBadge, masterButton);
    els.wordTable.append(row);
  });
}

async function initMaculaPicker() {
  const response = await fetch("public/macula/index.json", { cache: "no-store" });
  if (!response.ok) throw new Error("Could not load MACULA index");
  maculaIndex = await response.json();
  await loadVerbFormIndex();
  await loadVerbMeaningIndex();

  els.bookSelect.innerHTML = "";
  maculaIndex.books.forEach((book) => {
    const option = document.createElement("option");
    option.value = book.code;
    option.textContent = book.name;
    els.bookSelect.append(option);
  });

  const savedChapter = getSavedChapter();
  const savedBook = maculaIndex.books.find((book) => book.code === savedChapter.book);
  els.bookSelect.value = savedBook ? savedChapter.book : "Gen";
  applySavedPreferences();
  renderChapterOptions();
  const currentBook = maculaIndex.books.find((book) => book.code === els.bookSelect.value);
  els.chapterSelect.value = currentBook?.chapters.includes(savedChapter.chapter)
    ? String(savedChapter.chapter)
    : "1";
  await loadCurrentChapter();
}

async function loadVerbFormIndex() {
  const response = await fetch("public/macula/verb-forms.json", { cache: "no-store" });
  if (!response.ok) throw new Error("Could not load verb forms");
  verbFormIndex = await response.json();
}

async function loadVerbMeaningIndex() {
  const response = await fetch("public/macula/verb-meanings.json", { cache: "no-store" });
  if (!response.ok) throw new Error("Could not load verb meanings");
  verbMeaningIndex = await response.json();
}

function getSavedChapter() {
  try {
    const saved = JSON.parse(localStorage.getItem(chapterStorageKey) || "{}");
    return {
      book: saved.book || "Gen",
      chapter: Number(saved.chapter) || 1
    };
  } catch {
    return { book: "Gen", chapter: 1 };
  }
}

function saveSelectedChapter(book, chapter) {
  localStorage.setItem(chapterStorageKey, JSON.stringify({ book: book.code, chapter }));
}

function renderChapterOptions() {
  const book = maculaIndex?.books.find((item) => item.code === els.bookSelect.value);
  els.chapterSelect.innerHTML = "";
  if (!book) return;

  book.chapters.forEach((chapter) => {
    const option = document.createElement("option");
    option.value = String(chapter);
    option.textContent = String(chapter);
    els.chapterSelect.append(option);
  });
}

function getAdjacentChapter(delta) {
  const books = maculaIndex?.books || [];
  const bookIndex = books.findIndex((item) => item.code === els.bookSelect.value);
  const book = books[bookIndex];
  const chapter = Number(els.chapterSelect.value);
  if (!book || !chapter) return null;

  const chapterIndex = book.chapters.indexOf(chapter);
  const nextChapter = book.chapters[chapterIndex + delta];
  if (nextChapter) return { book, chapter: nextChapter };

  const adjacentBook = books[bookIndex + delta];
  if (!adjacentBook) return null;

  return {
    book: adjacentBook,
    chapter: delta > 0 ? adjacentBook.chapters[0] : adjacentBook.chapters.at(-1)
  };
}

function updateReadingNavButtons() {
  els.readingPrevButton.disabled = !getAdjacentChapter(-1);
  els.readingNextButton.disabled = !getAdjacentChapter(1);
}

async function moveReadingChapter(delta) {
  const target = getAdjacentChapter(delta);
  if (!target) return;

  els.bookSelect.value = target.book.code;
  renderChapterOptions();
  els.chapterSelect.value = String(target.chapter);
  await loadCurrentChapter();
  els.readingText.scrollTop = 0;
}

function stripMarkup(value = "") {
  const template = document.createElement("template");
  template.innerHTML = value;
  return template.content.textContent.trim();
}

function stripCantillation(value = "") {
  return value.replace(/[\u0591-\u05AF]/g, "");
}

function audioFlashcardRefOrder(ref = "") {
  const match = ref.match(/^\S+\s+(\d+):(\d+):(\d+)$/);
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : [0, 0, 0];
}

function compareAudioFlashcardRefs(a, b) {
  const left = audioFlashcardRefOrder(a);
  const right = audioFlashcardRefOrder(b);
  return left[0] - right[0] || left[1] - right[1] || left[2] - right[2];
}

function cleanAudioFlashcardGloss(value = "") {
  return value
    .replace(/\((?:et|ET)\)/g, "")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .trim();
}

function audioFlashcardHasObjectMarker(records = []) {
  return records.some((record) => stripNiqqud(record.h || "") === "את");
}

function audioFlashcardHasNounOrVerb(records = []) {
  return records.some((record) => record.p === "noun" || record.p === "verb");
}

function clampAudioRepeatCount(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  const count = Number.isFinite(parsed) ? parsed : fallback;
  return Math.min(Math.max(count, 0), 10);
}

function loadAudioFlashcardSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(audioFlashcardSettingsStorageKey) || "{}");
    return {
      hebrewRepeats: clampAudioRepeatCount(saved.hebrewRepeats, 2),
      englishRepeats: clampAudioRepeatCount(saved.englishRepeats, 1),
      separator: typeof saved.separator === "string" ? saved.separator : ".",
      plainHebrew: saved.plainHebrew !== false
    };
  } catch {
    return {
      hebrewRepeats: 2,
      englishRepeats: 1,
      separator: ".",
      plainHebrew: true
    };
  }
}

function getAudioFlashcardSettings() {
  return {
    hebrewRepeats: clampAudioRepeatCount(els.audioHebrewRepeat.value, 2),
    englishRepeats: clampAudioRepeatCount(els.audioEnglishRepeat.value, 1),
    separator: els.audioLineSeparator.value,
    plainHebrew: els.audioPlainHebrewToggle.checked
  };
}

function saveAudioFlashcardSettings() {
  localStorage.setItem(audioFlashcardSettingsStorageKey, JSON.stringify(getAudioFlashcardSettings()));
}

function applyAudioFlashcardSettings() {
  const settings = loadAudioFlashcardSettings();
  els.audioHebrewRepeat.value = String(settings.hebrewRepeats);
  els.audioEnglishRepeat.value = String(settings.englishRepeats);
  els.audioLineSeparator.value = settings.separator;
  els.audioPlainHebrewToggle.checked = settings.plainHebrew;
}

function audioHebrewText(value, settings) {
  return settings.plainHebrew ? stripNiqqud(value) : value;
}

function renderAudioFlashcardPair(pair, settings) {
  const lines = [];
  const hebrew = audioHebrewText(pair.hebrew, settings);

  for (let index = 0; index < settings.hebrewRepeats; index += 1) {
    lines.push(`${hebrew}${settings.separator}`);
  }

  for (let index = 0; index < settings.englishRepeats; index += 1) {
    lines.push(`${pair.english}${settings.separator}`);
  }

  return lines.join("\n");
}

function handleAudioFlashcardSettingsChange() {
  saveAudioFlashcardSettings();
  renderAudioFlashcards();
}

function getAudioFlashcardPairs(records = currentChapterRecords) {
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

  return [...grouped.values()]
    .filter((group) => audioFlashcardHasNounOrVerb(group.records))
    .filter((group) => !audioFlashcardHasObjectMarker(group.records))
    .sort((a, b) => compareAudioFlashcardRefs(a.ref, b.ref))
    .map((group) => ({
      hebrew: group.hebrewParts.join(""),
      english: cleanAudioFlashcardGloss(group.glossParts.join(" "))
    }))
    .filter((pair) => pair.hebrew && pair.english);
}

function renderAudioFlashcards() {
  const pairs = getAudioFlashcardPairs();
  const settings = getAudioFlashcardSettings();
  els.audioFlashcardText.value = pairs.map((pair) => renderAudioFlashcardPair(pair, settings)).filter(Boolean).join("\n\n");
  const book = maculaIndex?.books.find((item) => item.code === els.bookSelect.value);
  const chapter = Number(els.chapterSelect.value);
  const label = book && chapter ? `${book.name} ${chapter}` : "Current chapter";
  els.audioFlashcardStatus.textContent = `${label}: ${pairs.length} word audio prompts`;
}

function selectAudioFlashcardText() {
  els.audioFlashcardText.focus();
  els.audioFlashcardText.select();
}

async function copyAudioFlashcardText() {
  selectAudioFlashcardText();

  try {
    await navigator.clipboard.writeText(els.audioFlashcardText.value);
    els.audioFlashcardCopyButton.textContent = "Copied";
    window.setTimeout(() => {
      els.audioFlashcardCopyButton.textContent = "Copy";
    }, 1400);
  } catch {
    document.execCommand("copy");
  }
}

function sefariaRef(book, chapter) {
  return `${book.name}.${chapter}`;
}

async function loadReadingChapter(book, chapter) {
  els.readingStatus.textContent = "Loading...";
  els.readingText.innerHTML = "";

  const url = `https://www.sefaria.org/api/texts/${encodeURIComponent(sefariaRef(book, chapter))}?context=0&commentary=0`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load ${book.name} ${chapter} from Sefaria`);
  const data = await response.json();
  const verses = Array.isArray(data.he) ? data.he : [];

  els.readingStatus.textContent = data.heRef || `${book.name} ${chapter}`;
  els.readingText.innerHTML = "";

  verses.forEach((verse, index) => {
    const row = document.createElement("p");
    row.className = "reading-verse";

    const number = document.createElement("span");
    number.className = "verse-number";
    number.textContent = String(index + 1);

    const text = document.createElement("span");
    text.className = "verse-text";
    text.textContent = stripCantillation(stripMarkup(verse));

    row.append(number, text);
    els.readingText.append(row);
  });

  updateReadingNavButtons();
  els.readingText.append(els.readingNav);
}

async function loadSelectedChapter() {
  const book = maculaIndex?.books.find((item) => item.code === els.bookSelect.value);
  const chapter = Number(els.chapterSelect.value);
  if (!book || !chapter) return;

  const response = await fetch(`public/macula/${book.code}.${chapter}.json`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Could not load ${book.name} ${chapter}`);
  const records = await response.json();

  currentChapterRecords = records;
  allWords = uniqueWordsFromMacula(records);
  currentIndex = 0;
  currentVerbIndex = 0;
  verbGroups = buildVerbPracticeGroups();
  if (verbGroups[0]) selectDefaultVerbCombo(verbGroups[0]);
  renderVerbSelect();
  els.searchInput.value = "";
  saveSelectedChapter(book, chapter);
  applyFilter();
  renderVerbPractice();
  renderAudioFlashcards();
}

async function loadCurrentChapter() {
  const book = maculaIndex?.books.find((item) => item.code === els.bookSelect.value);
  const chapter = Number(els.chapterSelect.value);
  if (!book || !chapter) return;

  if (currentMode === "reading") {
    saveSelectedChapter(book, chapter);
    await loadReadingChapter(book, chapter);
    return;
  }

  await loadSelectedChapter();
}

els.bookSelect.addEventListener("change", () => {
  renderChapterOptions();
  loadCurrentChapter().catch(console.error);
});
els.chapterSelect.addEventListener("change", () => {
  loadCurrentChapter().catch((error) => {
    console.error(error);
  });
});
els.cardButton.addEventListener("click", cardTapAction);
els.revealButton.addEventListener("click", revealAnswer);
els.writingCardButton.addEventListener("click", () => moveWritingBy(1));
els.verbCardButton.addEventListener("click", () => moveVerbBy(1));
els.verbSelect.addEventListener("change", () => {
  showVerb(Number(els.verbSelect.value) || 0);
});
els.settingsButton.addEventListener("click", () => {
  els.settingsDialog.showModal();
});
els.settingsCloseButton.addEventListener("click", () => {
  els.settingsDialog.close();
});
els.searchInput.addEventListener("input", applyFilter);
els.modeSelect.addEventListener("change", () => {
  currentMode = els.modeSelect.value;
  savePreferences();
  renderMode();
  loadCurrentChapter().catch((error) => {
    console.error(error);
    els.readingStatus.textContent = "Could not load reading text.";
    els.readingText.append(els.readingNav);
  });
});
els.posSelect.addEventListener("change", () => {
  savePreferences();
  applyFilter();
});
els.showMasteredToggle.addEventListener("change", () => {
  savePreferences();
  applyFilter();
});
els.orderSelect.addEventListener("change", () => {
  savePreferences();
  applyFilter();
});
els.autoAdvanceToggle.addEventListener("change", handleAutoAdvanceChange);
els.autoAdvanceSpeed.addEventListener("change", handleAutoAdvanceChange);
els.autoAdvanceSpeed.addEventListener("input", handleAutoAdvanceChange);
els.readingFontSize.addEventListener("input", () => {
  updateReadingFontSize();
  savePreferences();
});
els.readingFontSize.addEventListener("change", () => {
  updateReadingFontSize();
  savePreferences();
});
els.readingFullscreenButton.addEventListener("click", toggleReadingFullscreen);
els.readingExitFullscreenButton.addEventListener("click", () => {
  exitReadingFullscreen().catch(console.error);
});
els.readingPrevButton.addEventListener("click", () => {
  moveReadingChapter(-1).catch(console.error);
});
els.readingNextButton.addEventListener("click", () => {
  moveReadingChapter(1).catch(console.error);
});
els.audioFlashcardSelectButton.addEventListener("click", selectAudioFlashcardText);
els.audioFlashcardCopyButton.addEventListener("click", () => {
  copyAudioFlashcardText().catch(console.error);
});
[
  els.audioHebrewRepeat,
  els.audioEnglishRepeat,
  els.audioLineSeparator,
  els.audioPlainHebrewToggle
].forEach((control) => {
  control.addEventListener("input", handleAudioFlashcardSettingsChange);
  control.addEventListener("change", handleAudioFlashcardSettingsChange);
});
els.manageMasteredButton.addEventListener("click", openMasteredModal);
els.removeAllMasteredButton.addEventListener("click", removeAllMasteredWords);
els.masterWordButton.addEventListener("click", toggleCurrentMasteredWord);
els.formSelect.addEventListener("change", (event) => {
  formMode = event.target.value;
  savePreferences();
  applyFilter();
});
els.directionSelect.addEventListener("change", (event) => {
  direction = event.target.value;
  savePreferences();
  showCard(currentIndex);
});

document.addEventListener("keydown", (event) => {
  if (event.target.matches("input, select")) return;
  if (event.key === "Escape" && els.readingSection.classList.contains("is-fullscreen")) {
    exitReadingFullscreen().catch(console.error);
    return;
  }
  if (currentMode === "reading" || currentMode === "audio") return;
  if (currentMode === "writing") {
    if (/^[א-ת]$/.test(event.key)) {
      event.preventDefault();
      addWritingLetter(event.key);
      return;
    }
    if (event.key === "Backspace") {
      event.preventDefault();
      removeWritingInput();
      return;
    }
    if (event.key === " " || event.key === "ArrowRight") {
      event.preventDefault();
      moveWritingBy(1);
      return;
    }
    if (event.key === "ArrowLeft") moveWritingBy(-1);
    return;
  }
  if (currentMode === "verbs") {
    if (event.key === " " || event.key === "ArrowRight") {
      event.preventDefault();
      moveVerbBy(1);
    }
    if (event.key === "ArrowLeft") moveVerbBy(-1);
    return;
  }
  if (event.key === " ") {
    event.preventDefault();
    spaceAction();
  }
  if (event.key === "ArrowRight") moveBy(1);
  if (event.key === "ArrowLeft") moveBy(-1);
  if (event.key.toLowerCase() === "h") toggleCurrentMasteredWord();
});

document.addEventListener("fullscreenchange", renderReadingFullscreenState);

applyAudioFlashcardSettings();
renderHebrewKeyboard();
showCard(0);
showWritingCard(0);
renderList();
initMaculaPicker().catch(() => {
  console.error("Could not load chapter data");
});
