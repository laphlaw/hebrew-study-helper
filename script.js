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
let listedWords = [...studyWords];
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
let selectedLanguage = "hebrew";
let currentMode = "study";
let maculaIndex = null;
let koreanVideoIndex = null;
let currentKoreanVideo = null;
let elevenLabsCatalog = null;
let currentChapterRecords = [];
let verbFormIndex = {};
let verbMeaningIndex = {};
let chapterLoadRequestId = 0;
let autoAdvanceTimer = null;
let elevenLabsManifest = null;
let elevenLabsQueue = [];
let elevenLabsQueueIndex = 0;
let elevenLabsIsPlaying = false;
const elevenLabsPlaybackSpeeds = [0.25, 0.5, 0.75, 0.85, 1];
const elevenLabsAudio = new Audio();
let fallbackReadingFullscreen = false;
const chapterStorageKey = "hebrew-study-helper:last-chapter";
const masteredWordsStorageKey = "hebrew-study-helper:mastered-words";
const legacyHiddenWordsStorageKey = "hebrew-study-helper:hidden-words";
const autoAdvanceStorageKey = "hebrew-study-helper:auto-advance";
const orderStorageKey = "hebrew-study-helper:word-order";
const preferencesStorageKey = "hebrew-study-helper:preferences";
const koreanVideoStorageKey = "hebrew-study-helper:korean-video";
const koreanAlphabetPracticeSets = ["all", "consonants", "vowels"];
const flashcardSkippedWordsStorageKey = "hebrew-study-helper:flashcard-skipped-words";
const elevenLabsSkippedWordsStorageKey = "hebrew-study-helper:elevenlabs-skipped-words";
const elevenLabsPlaybackStorageKey = "hebrew-study-helper:elevenlabs-playback";
const masteredWords = loadMasteredWordKeys();
let flashcardSkippedWords = loadFlashcardSkippedWords();
const elevenLabsPlaybackPreferences = loadElevenLabsPlaybackPreferences();
let elevenLabsSkippedWords = loadElevenLabsSkippedWords();
let elevenLabsShuffleEnabled = elevenLabsPlaybackPreferences.shuffle;
let elevenLabsPlaybackSpeed = elevenLabsPlaybackPreferences.speed;
let elevenLabsShuffleOrder = [];

const els = {
  languageSelect: document.querySelector("#language-select"),
  bookSelect: document.querySelector("#book-select"),
  chapterSelect: document.querySelector("#chapter-select"),
  modeSelect: document.querySelector("#mode-select"),
  flashcardSection: document.querySelector("#flashcard-section"),
  readingSection: document.querySelector("#reading-section"),
  audioFlashcardSection: document.querySelector("#audio-flashcard-section"),
  elevenLabsAudioStatus: document.querySelector("#elevenlabs-audio-status"),
  elevenLabsPlayButton: document.querySelector("#elevenlabs-play-button"),
  elevenLabsStopButton: document.querySelector("#elevenlabs-stop-button"),
  elevenLabsNextButton: document.querySelector("#elevenlabs-next-button"),
  elevenLabsSpeedSlider: document.querySelector("#elevenlabs-speed-slider"),
  elevenLabsSpeedLabel: document.querySelector("#elevenlabs-speed-label"),
  elevenLabsCachePanel: document.querySelector("#elevenlabs-cache-panel"),
  elevenLabsCacheStatus: document.querySelector("#elevenlabs-cache-status"),
  elevenLabsCacheList: document.querySelector("#elevenlabs-cache-list"),
  elevenLabsShuffleToggle: document.querySelector("#elevenlabs-shuffle-toggle"),
  elevenLabsCacheAllButton: document.querySelector("#elevenlabs-cache-all-button"),
  elevenLabsCacheNoneButton: document.querySelector("#elevenlabs-cache-none-button"),
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
  themeToggleButton: document.querySelector("#theme-toggle-button"),
  settingsButton: document.querySelector("#settings-button"),
  settingsCloseButton: document.querySelector("#settings-close-button"),
  settingsDialog: document.querySelector("#settings-dialog"),
  settingsSection: document.querySelector("#settings-section"),
  wordListSection: document.querySelector("#word-list-section"),
  wordListStatus: document.querySelector("#word-list-status"),
  wordListAllButton: document.querySelector("#word-list-all-button"),
  wordListNoneButton: document.querySelector("#word-list-none-button"),
  cardButton: document.querySelector("#card-button"),
  revealButton: document.querySelector("#reveal-button"),
  previousWordButton: document.querySelector("#previous-word-button"),
  nextWordButton: document.querySelector("#next-word-button"),
  hebrewWord: document.querySelector("#hebrew-word"),
  englishWord: document.querySelector("#english-word"),
  wordBreakdown: document.querySelector("#word-breakdown"),
  rootWord: document.querySelector("#root-word"),
  cardCount: document.querySelector("#card-count"),
  masterWordButton: document.querySelector("#master-word-button"),
  directionSelect: document.querySelector("#direction-select"),
  posSelect: document.querySelector("#pos-select"),
  searchInput: document.querySelector("#search-input"),
  showMasteredToggle: document.querySelector("#show-mastered-toggle"),
  orderSelect: document.querySelector("#order-select"),
  wordListPosFilter: document.querySelector("#word-list-pos-filter"),
  frequencyOrderOption: document.querySelector("#frequency-order-option"),
  koreanAlphabetFilterLabel: document.querySelector("#korean-alphabet-filter-label"),
  koreanAlphabetFilterSelect: document.querySelector("#korean-alphabet-filter-select"),
  autoAdvanceToggle: document.querySelector("#auto-advance-toggle"),
  autoAdvanceSpeed: document.querySelector("#auto-advance-speed"),
  autoAdvanceLabel: document.querySelector("#auto-advance-label"),
  manageMasteredButton: document.querySelector("#manage-mastered-button"),
  removeAllMasteredButton: document.querySelector("#remove-all-mastered-button"),
  masteredDialog: document.querySelector("#mastered-dialog"),
  masteredSummary: document.querySelector("#mastered-summary"),
  masteredList: document.querySelector("#mastered-list"),
  listTitle: document.querySelector("#list-title"),
  wordTable: document.querySelector("#word-table")
};

const supportedLanguages = {
  hebrew: {
    label: "Hebrew",
    readingLabel: "Hebrew Bible",
    readingDir: "rtl"
  },
  korean: {
    label: "Korean",
    readingLabel: "YouTube Captions",
    readingDir: "ltr"
  }
};

const languageModes = {
  hebrew: ["study", "reading", "audio", "writing", "verbs"],
  korean: ["study", "reading", "alphabet"]
};

const koreanConsonants = [
  { letter: "ㄱ", romanization: "g", group: "basic consonant" },
  { letter: "ㄴ", romanization: "n", group: "basic consonant" },
  { letter: "ㄷ", romanization: "d", group: "basic consonant" },
  { letter: "ㄹ", romanization: "r", group: "basic consonant" },
  { letter: "ㅁ", romanization: "m", group: "basic consonant" },
  { letter: "ㅂ", romanization: "b", group: "basic consonant" },
  { letter: "ㅅ", romanization: "s", group: "basic consonant" },
  { letter: "ㅇ", romanization: "", group: "basic consonant" },
  { letter: "ㅈ", romanization: "j", group: "basic consonant" },
  { letter: "ㅊ", romanization: "ch", group: "basic consonant" },
  { letter: "ㅋ", romanization: "k", group: "basic consonant" },
  { letter: "ㅌ", romanization: "t", group: "basic consonant" },
  { letter: "ㅍ", romanization: "p", group: "basic consonant" },
  { letter: "ㅎ", romanization: "h", group: "basic consonant" },
  { letter: "ㄲ", romanization: "kk", group: "double consonant" },
  { letter: "ㄸ", romanization: "tt", group: "double consonant" },
  { letter: "ㅃ", romanization: "pp", group: "double consonant" },
  { letter: "ㅆ", romanization: "ss", group: "double consonant" },
  { letter: "ㅉ", romanization: "jj", group: "double consonant" }
];

const koreanVowels = [
  { letter: "ㅏ", romanization: "a", group: "basic vowel" },
  { letter: "ㅑ", romanization: "ya", group: "basic vowel" },
  { letter: "ㅓ", romanization: "eo", group: "basic vowel" },
  { letter: "ㅕ", romanization: "yeo", group: "basic vowel" },
  { letter: "ㅗ", romanization: "o", group: "basic vowel" },
  { letter: "ㅛ", romanization: "yo", group: "basic vowel" },
  { letter: "ㅜ", romanization: "u", group: "basic vowel" },
  { letter: "ㅠ", romanization: "yu", group: "basic vowel" },
  { letter: "ㅡ", romanization: "eu", group: "basic vowel" },
  { letter: "ㅣ", romanization: "i", group: "basic vowel" },
  { letter: "ㅐ", romanization: "ae", group: "compound vowel" },
  { letter: "ㅒ", romanization: "yae", group: "compound vowel" },
  { letter: "ㅔ", romanization: "e", group: "compound vowel" },
  { letter: "ㅖ", romanization: "ye", group: "compound vowel" },
  { letter: "ㅘ", romanization: "wa", group: "compound vowel" },
  { letter: "ㅙ", romanization: "wae", group: "compound vowel" },
  { letter: "ㅚ", romanization: "oe", group: "compound vowel" },
  { letter: "ㅝ", romanization: "wo", group: "compound vowel" },
  { letter: "ㅞ", romanization: "we", group: "compound vowel" },
  { letter: "ㅟ", romanization: "wi", group: "compound vowel" },
  { letter: "ㅢ", romanization: "ui", group: "compound vowel" }
];

const koreanInitialIndexes = {
  "ㄱ": 0,
  "ㄲ": 1,
  "ㄴ": 2,
  "ㄷ": 3,
  "ㄸ": 4,
  "ㄹ": 5,
  "ㅁ": 6,
  "ㅂ": 7,
  "ㅃ": 8,
  "ㅅ": 9,
  "ㅆ": 10,
  "ㅇ": 11,
  "ㅈ": 12,
  "ㅉ": 13,
  "ㅊ": 14,
  "ㅋ": 15,
  "ㅌ": 16,
  "ㅍ": 17,
  "ㅎ": 18
};

const koreanVowelIndexes = {
  "ㅏ": 0,
  "ㅐ": 1,
  "ㅑ": 2,
  "ㅒ": 3,
  "ㅓ": 4,
  "ㅔ": 5,
  "ㅕ": 6,
  "ㅖ": 7,
  "ㅗ": 8,
  "ㅘ": 9,
  "ㅙ": 10,
  "ㅚ": 11,
  "ㅛ": 12,
  "ㅜ": 13,
  "ㅝ": 14,
  "ㅞ": 15,
  "ㅟ": 16,
  "ㅠ": 17,
  "ㅡ": 18,
  "ㅢ": 19,
  "ㅣ": 20
};

const koreanFinalIndexes = {
  "ㅇ": 21
};

function wordFromParts(hebrew, english, pos, root, morph = "", refs = [], strong = "", details = {}) {
  return [hebrew, english, pos, root || hebrew, morph, refs, strong, details];
}

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function composeKoreanSyllable(consonant, vowel, finalConsonant = "") {
  const initialIndex = koreanInitialIndexes[consonant.letter];
  const vowelIndex = koreanVowelIndexes[vowel.letter];
  const finalIndex = finalConsonant ? koreanFinalIndexes[finalConsonant] : 0;
  if (initialIndex === undefined || vowelIndex === undefined) return `${consonant.letter}${vowel.letter}`;
  return String.fromCodePoint(0xAC00 + ((initialIndex * 21) + vowelIndex) * 28 + finalIndex);
}

function koreanPronunciationRomanization(consonant, vowel) {
  if (consonant.letter === "ㅅ" && vowel.letter === "ㅣ") return "shi";
  if (consonant.letter === "ㅆ" && vowel.letter === "ㅣ") return "sshi";
  return `${consonant.romanization}${vowel.romanization}`;
}

function koreanAlphabetWordFromParts(syllable, romanization, pos, root, group, components) {
  return wordFromParts(syllable, romanization, pos, root, "", [], "", {
    breakdown: [
      {
        part: components,
        meaning: group
      }
    ]
  });
}

function selectedKoreanAlphabetPracticeSet() {
  return koreanAlphabetPracticeSets.includes(els.koreanAlphabetFilterSelect.value)
    ? els.koreanAlphabetFilterSelect.value
    : "all";
}

function buildKoreanAlphabetCards(practiceSet = selectedKoreanAlphabetPracticeSet()) {
  const basicVowels = koreanVowels.filter((vowel) => vowel.group === "basic vowel");
  const consonantCards = koreanConsonants.map((consonant) => {
    const vowel = randomItem(basicVowels);
    const isIeung = consonant.letter === "ㅇ";
    const syllable = composeKoreanSyllable(consonant, vowel, isIeung ? "ㅇ" : "");
    const romanization = isIeung ? `${vowel.romanization}ng` : koreanPronunciationRomanization(consonant, vowel);
    return koreanAlphabetWordFromParts(
      syllable,
      romanization,
      "consonant",
      consonant.letter,
      `${consonant.group} + ${vowel.group}`,
      isIeung ? `ㅇ + ${vowel.letter} + ㅇ` : `${consonant.letter} + ${vowel.letter}`
    );
  });

  const vowelCards = koreanVowels.map((vowel) => {
    const silentCarrier = { letter: "ㅇ", romanization: "", group: "silent carrier" };
    const syllable = composeKoreanSyllable(silentCarrier, vowel);
    return koreanAlphabetWordFromParts(
      syllable,
      vowel.romanization,
      "vowel",
      vowel.letter,
      vowel.group,
      `ㅇ + ${vowel.letter}`
    );
  });

  if (practiceSet === "consonants") return consonantCards;
  if (practiceSet === "vowels") return vowelCards;
  return [...consonantCards, ...vowelCards];
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

function cleanGloss(value = "") {
  return value
    .replace(/\((?:et|ET)\)/g, "")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .trim();
}

function normalizeMasteredKeyPart(value = "") {
  return stripNiqqud(value).replace(/[־\s]/g, "").toLowerCase();
}

function getWordKey([hebrew, , pos, root]) {
  return `${pos}|${normalizeMasteredKeyPart(root || hebrew)}`;
}

function getFlashcardWordKey([word, , pos, root]) {
  return `${selectedLanguage}|${normalizeMasteredKeyPart(word)}|${pos}|${normalizeMasteredKeyPart(root || word)}`;
}

function loadFlashcardSkippedWords() {
  try {
    const saved = JSON.parse(localStorage.getItem(flashcardSkippedWordsStorageKey) || "[]");
    return new Set(Array.isArray(saved) ? saved.filter(Boolean) : []);
  } catch {
    return new Set();
  }
}

function saveFlashcardSkippedWords() {
  localStorage.setItem(flashcardSkippedWordsStorageKey, JSON.stringify([...flashcardSkippedWords]));
}

function isFlashcardWordEnabled(word) {
  return !flashcardSkippedWords.has(getFlashcardWordKey(word));
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
    const language = saved.language === "korean" ? "korean" : "hebrew";
    const savedMode = ["reading", "alphabet", "nouns", "phrases", "audio", "writing", "verbs"].includes(saved.mode) ? saved.mode : "study";
    const mode = languageModes[language]?.includes(savedMode) ? savedMode : "study";
    return {
      language,
      mode,
      direction: saved.direction === "english" ? "english" : "hebrew",
      partOfSpeech: ["noun", "verb", "other"].includes(saved.partOfSpeech) ? saved.partOfSpeech : "all",
      showMastered: Boolean(saved.showMastered),
      order: ["ordered", "frequency", "random"].includes(saved.order)
        ? saved.order
        : localStorage.getItem(orderStorageKey) === "ordered" ? "ordered" : "random",
      koreanAlphabetPracticeSet: koreanAlphabetPracticeSets.includes(saved.koreanAlphabetPracticeSet)
        ? saved.koreanAlphabetPracticeSet
        : "all",
      theme: saved.theme === "dark" ? "dark" : "light",
      readingFontSize: clampReadingFontSize(saved.readingFontSize),
      autoAdvance: {
        enabled: Boolean(saved.autoAdvance?.enabled ?? legacyAuto.enabled),
        seconds: clampAutoAdvanceSeconds(saved.autoAdvance?.seconds ?? legacyAuto.seconds)
      }
    };
  } catch {
    return {
      language: "hebrew",
      direction: "hebrew",
      mode: "study",
      partOfSpeech: "all",
      showMastered: false,
      order: "random",
      koreanAlphabetPracticeSet: "all",
      theme: "light",
      readingFontSize: 3.2,
      autoAdvance: { enabled: false, seconds: 3 }
    };
  }
}

function savePreferences() {
  localStorage.setItem(preferencesStorageKey, JSON.stringify({
    language: selectedLanguage,
    mode: els.modeSelect.value,
    direction: els.directionSelect.value,
    partOfSpeech: els.posSelect.value,
    showMastered: els.showMasteredToggle.checked,
    order: els.orderSelect.value,
    koreanAlphabetPracticeSet: els.koreanAlphabetFilterSelect.value,
    theme: getCurrentTheme(),
    readingFontSize: getReadingFontSize(),
    autoAdvance: {
      enabled: els.autoAdvanceToggle.checked,
      seconds: getAutoAdvanceSeconds()
    }
  }));
}

function applySavedPreferences() {
  const preferences = getSavedPreferences();
  selectedLanguage = preferences.language;
  currentMode = preferences.mode;
  direction = preferences.direction;
  els.languageSelect.value = preferences.language;
  els.modeSelect.value = preferences.mode;
  els.directionSelect.value = preferences.direction;
  els.posSelect.value = preferences.partOfSpeech;
  els.showMasteredToggle.checked = preferences.showMastered;
  els.orderSelect.value = preferences.order;
  els.koreanAlphabetFilterSelect.value = preferences.koreanAlphabetPracticeSet;
  els.readingFontSize.value = String(preferences.readingFontSize);
  els.autoAdvanceToggle.checked = preferences.autoAdvance.enabled;
  els.autoAdvanceSpeed.value = String(preferences.autoAdvance.seconds);
  applyTheme(preferences.theme);
  updateReadingFontSize();
  updateAutoAdvance();
  renderMode();
}

function getCurrentTheme() {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function applyTheme(theme) {
  const isDark = theme === "dark";
  document.documentElement.dataset.theme = isDark ? "dark" : "light";
  els.themeToggleButton.textContent = isDark ? "Light" : "Dark";
  els.themeToggleButton.setAttribute("aria-pressed", String(isDark));
  els.themeToggleButton.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
}

function toggleTheme() {
  applyTheme(getCurrentTheme() === "dark" ? "light" : "dark");
  savePreferences();
}

function isKoreanSelected() {
  return selectedLanguage === "korean";
}

function isHebrewSelected() {
  return selectedLanguage === "hebrew";
}

function formatBookName(book) {
  return book.name;
}

function updateLanguageLabels() {
  const sourceLabel = isKoreanSelected() ? "Korean" : "Hebrew";
  const verbModeOption = els.modeSelect.querySelector("option[value='verbs']");
  if (verbModeOption) verbModeOption.textContent = "Verb Practice";
  els.directionSelect.options[0].textContent = `${sourceLabel} to English`;
  els.directionSelect.options[1].textContent = `English to ${sourceLabel}`;
  if (isKoreanSelected() && currentMode === "alphabet") {
    els.searchInput.placeholder = "Search Hangul, romanization, or group";
  } else if (isKoreanSelected()) {
    els.searchInput.placeholder = "Search Korean caption words";
  } else {
    els.searchInput.placeholder = `Search ${sourceLabel}, root, or English`;
  }
  els.listTitle.textContent = isKoreanSelected() && currentMode === "study" ? "Words by Frequency" : "Words";
  els.koreanAlphabetFilterLabel.classList.toggle("hidden", !(isKoreanSelected() && currentMode === "alphabet"));
}





function syncLanguageModeAvailability() {
  [...els.modeSelect.options].forEach((option) => {
    const isAvailable = languageModes[selectedLanguage]?.includes(option.value);
    option.disabled = !isAvailable;
    option.hidden = !isAvailable;
  });

  if (!languageModes[selectedLanguage]?.includes(currentMode)) {
    currentMode = "study";
  }

  els.modeSelect.value = currentMode;
  document.documentElement.dataset.studyLanguage = selectedLanguage;
  document.documentElement.dataset.studyMode = currentMode;
  updateLanguageLabels();
}



function selectedLanguageReadingLabel() {
  return supportedLanguages[selectedLanguage]?.readingLabel || supportedLanguages.hebrew.readingLabel;
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

function isLexicalRecord(record) {
  return record?.p === "noun" || record?.p === "verb";
}

function primaryMaculaRecord(records) {
  return records.find(isLexicalRecord) || records.find((record) => record.p !== "other") || records[0] || {};
}

function combinedMaculaGloss(records) {
  const pronounGlosses = new Set(["his", "her", "him", "me", "my", "our", "their", "them", "us", "you", "your"]);
  const parts = [];

  records.forEach((record) => {
    const part = cleanGloss(record.g || "");
    if (!part) return;

    const lowerPart = part.toLowerCase();
    const existing = parts.join(" ").toLowerCase();
    if (pronounGlosses.has(lowerPart) && existing.includes(lowerPart)) return;

    parts.push(part);
  });

  return cleanGloss(parts.join(" "));
}

function coalesceMaculaRecords(records = []) {
  const groups = [];
  let currentGroup = null;

  records.forEach((record) => {
    if (!record?.r || !record.h) return;

    if (!currentGroup || currentGroup.ref !== record.r) {
      currentGroup = { ref: record.r, records: [] };
      groups.push(currentGroup);
    }

    currentGroup.records.push(record);
  });

  return groups.map((group) => {
    const primary = primaryMaculaRecord(group.records);
    const strongRecord = group.records.find((record) => record.s);
    return {
      h: group.records.map((record) => record.h || "").join("").normalize("NFC"),
      l: primary.l || primary.h || "",
      p: primary.p || "other",
      g: combinedMaculaGloss(group.records) || primary.g || primary.l || primary.h || "",
      m: group.records.map((record) => record.m).filter(Boolean).join(", "),
      r: group.ref,
      s: primary.s || strongRecord?.s || ""
    };
  }).filter((record) => record.h && /[\u0590-\u05FF]/.test(record.h));
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
  return [...allWords];
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

function formatBreakdown(parts = []) {
  return parts
    .map((part) => {
      if (typeof part === "string") return part.trim();
      const label = part?.part || "";
      const meaning = part?.meaning || "";
      return [label, meaning].filter(Boolean).join(" = ");
    })
    .filter(Boolean)
    .join(" + ");
}

function fitTextToBox(element, minPixels = 14) {
  if (!element || !element.textContent.trim()) return;

  element.style.fontSize = "";
  let size = Number.parseFloat(getComputedStyle(element).fontSize);
  if (!size || !element.clientWidth || !element.clientHeight) return;
  const maxWidth = Math.max(element.clientWidth - 4, minPixels);
  const maxHeight = Math.max(element.clientHeight - 10, minPixels);

  const clone = element.cloneNode(true);
  const computed = getComputedStyle(element);
  clone.classList.remove("hidden");
  clone.removeAttribute("id");
  Object.assign(clone.style, {
    position: "fixed",
    top: "0",
    left: "-10000px",
    display: "block",
    visibility: "hidden",
    width: `${maxWidth}px`,
    height: "auto",
    maxHeight: "none",
    overflow: "visible",
    padding: computed.padding,
    transform: "none",
    whiteSpace: "normal"
  });
  document.body.append(clone);

  while (
    (clone.scrollWidth > maxWidth || clone.scrollHeight > maxHeight) &&
    size > minPixels
  ) {
    size = Math.max(size * 0.92, minPixels);
    clone.style.fontSize = `${size}px`;
  }

  element.style.fontSize = `${size}px`;
  clone.remove();

  const widthRatio = element.scrollWidth > element.clientWidth + 1
    ? (element.clientWidth - 4) / element.scrollWidth
    : 1;
  const heightRatio = element.scrollHeight > element.clientHeight + 1
    ? (element.clientHeight - 6) / element.scrollHeight
    : 1;
  const finalRatio = Math.min(widthRatio, heightRatio);
  if (finalRatio < 1) {
    element.style.fontSize = `${Math.max(size * Math.max(finalRatio, 0.85), minPixels)}px`;
  }
}

function fitFlashcardText() {
  window.requestAnimationFrame(() => {
    fitTextToBox(els.hebrewWord, currentMode === "alphabet" ? 46 : isKoreanSelected() ? 28 : 34);
    fitTextToBox(els.englishWord, 16);
    fitTextToBox(els.wordBreakdown, 13);
    fitTextToBox(els.rootWord, isKoreanSelected() ? 14 : 20);
  });
}

function showCard(index = currentIndex) {
  if (!visibleWords.length) {
    deckFinished = false;
    els.hebrewWord.textContent = "אין מילים";
    els.englishWord.textContent = "No matching words";
    els.wordBreakdown.textContent = "";
    els.rootWord.textContent = "";
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
  const [hebrew, english, , root, , , , details = {}] = word;
  els.hebrewWord.dir = isKoreanSelected() ? "ltr" : "rtl";
  els.hebrewWord.classList.toggle("is-korean-word", isKoreanSelected());
  els.hebrewWord.classList.toggle("is-korean-letter", currentMode === "alphabet");
  els.rootWord.dir = isKoreanSelected() ? "ltr" : "rtl";
  els.rootWord.classList.toggle("is-korean-word", isKoreanSelected());
  els.hebrewWord.textContent = hebrew;
  els.englishWord.textContent = formatAnswer(english);
  els.wordBreakdown.textContent = formatBreakdown(details.breakdown);
  els.rootWord.textContent = root && root !== hebrew ? root : "";
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
  els.wordBreakdown.textContent = "";
  els.rootWord.textContent = "";
  els.cardCount.textContent = `${visibleWords.length} / ${visibleWords.length}`;
  els.masterWordButton.disabled = true;
  els.masterWordButton.textContent = "Mark as mastered";
  renderRevealState();
}

function renderRevealState() {
  els.cardButton.classList.toggle("is-finished", deckFinished);
  els.cardButton.classList.toggle("is-alphabet-card", currentMode === "alphabet" && !deckFinished);
  els.cardButton.classList.toggle("has-breakdown", Boolean(els.wordBreakdown.textContent));
  if (deckFinished) {
    els.hebrewWord.classList.remove("hidden");
    els.englishWord.classList.remove("hidden");
    els.wordBreakdown.classList.add("hidden");
    els.rootWord.classList.add("hidden");
    els.cardButton.setAttribute("aria-label", "Finished. Start over");
    els.revealButton.disabled = true;
    els.revealButton.textContent = "Show Answer";
    return;
  }

  const showingHebrewFirst = direction === "hebrew";
  els.cardButton.classList.toggle("is-source-english", !showingHebrewFirst);
  els.hebrewWord.classList.toggle("hidden", !showingHebrewFirst && !revealed);
  els.englishWord.classList.toggle("hidden", showingHebrewFirst && !revealed);
  els.wordBreakdown.classList.toggle("hidden", !revealed || !els.wordBreakdown.textContent);
  els.rootWord.classList.toggle("hidden", !revealed || !els.rootWord.textContent);
  els.cardButton.setAttribute("aria-label", "Next word");
  els.revealButton.disabled = !visibleWords.length;
  els.previousWordButton.disabled = !visibleWords.length;
  els.nextWordButton.disabled = !visibleWords.length;
  els.revealButton.textContent = revealed ? "Next Word" : "Show Answer";
  fitFlashcardText();
}

function revealAnswer() {
  if (deckFinished || !visibleWords.length) return;
  if (revealed) {
    moveBy(1);
    return;
  }

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
  syncLanguageModeAvailability();
  const readingMode = currentMode === "reading";
  const audioMode = currentMode === "audio";
  const verbMode = currentMode === "verbs" && isHebrewSelected();
  const writingMode = currentMode === "writing";
  const alphabetMode = currentMode === "alphabet";
  els.flashcardSection.classList.toggle("hidden", readingMode || audioMode || verbMode || writingMode);
  els.audioFlashcardSection.classList.toggle("hidden", !audioMode);
  els.verbPracticeSection.classList.toggle("hidden", !verbMode);
  els.writingSection.classList.toggle("hidden", !writingMode);
  els.settingsButton.classList.toggle("hidden", readingMode || audioMode || verbMode);
  els.wordListSection.classList.toggle("hidden", (currentMode === "reading") || audioMode || verbMode || writingMode);
  if (isKoreanSelected() && currentMode === "study") {
    els.wordListSection.open = false;
  }
  els.readingSection.classList.toggle("hidden", !readingMode);
  els.manageMasteredButton.classList.toggle("hidden", readingMode || audioMode || verbMode || isKoreanSelected());

  if (readingMode || audioMode || verbMode || writingMode || alphabetMode) {
    if (els.settingsDialog.open) {
      els.settingsDialog.close();
    }
    stopAutoAdvance();
    if (!audioMode) stopElevenLabsAudio();
  } else {
    if (isReadingFullscreen()) {
      exitReadingFullscreen().catch(console.error);
    }
    updateAutoAdvance();
    stopElevenLabsAudio();
  }

  if (verbMode) {
    renderVerbPractice();
  }

  if (writingMode) {
    renderWritingCard();
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
  if (els.orderSelect.value === "random") return shuffledWords(words);
  if (els.orderSelect.value === "frequency" && isKoreanSelected() && currentMode === "study") {
    return [...words].sort((a, b) => {
      const aDetails = a[7] || {};
      const bDetails = b[7] || {};
      return (
        (bDetails.frequency || 0) - (aDetails.frequency || 0) ||
        (aDetails.firstTokenIndex || 0) - (bDetails.firstTokenIndex || 0) ||
        a[0].localeCompare(b[0], "ko")
      );
    });
  }
  if (isKoreanSelected() && currentMode === "study") {
    return [...words].sort((a, b) => {
      const aDetails = a[7] || {};
      const bDetails = b[7] || {};
      return (
        (aDetails.firstTokenIndex || 0) - (bDetails.firstTokenIndex || 0) ||
        (aDetails.firstCaptionIndex || 0) - (bDetails.firstCaptionIndex || 0) ||
        a[0].localeCompare(b[0], "ko")
      );
    });
  }
  return [...words];
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
  if (isKoreanSelected() && currentMode === "study") {
    listedWords = orderWords(studyWords
      .filter((word) => {
        const [korean, english, pos, root, , , , details = {}] = word;
        const matchesText = (
          korean.includes(query) ||
          root.toLowerCase().includes(query) ||
          english.toLowerCase().includes(query) ||
          String(details.romanization || "").toLowerCase().includes(query)
        );
        const matchesPartOfSpeech = selectedPos === "all" || pos === selectedPos;
        return matchesText && matchesPartOfSpeech;
      }));
    visibleWords = listedWords.filter(isFlashcardWordEnabled);
    showCard(0);
    renderList();
    return;
  }

  const filteredWords = studyWords.filter((word) => {
    const [hebrew, english, pos, root, , , , details = {}] = word;
    const matchesText =
      hebrew.includes(query) ||
      root.toLowerCase().includes(query) ||
      english.toLowerCase().includes(query) ||
      formatBreakdown(details.breakdown).toLowerCase().includes(query);
    const matchesPartOfSpeech =
      (isKoreanSelected() && currentMode === "alphabet") ||
      selectedPos === "all" ||
      pos === selectedPos;
    const matchesMastered = showMastered || !isWordMastered(word);
    return matchesText && matchesPartOfSpeech && matchesMastered;
  });
  listedWords = orderWords(filteredWords);
  visibleWords = listedWords.filter(isFlashcardWordEnabled);
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
    applyFilter();
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
  const supportsFrequency = isKoreanSelected() && currentMode === "study";
  els.wordListPosFilter.classList.toggle("hidden", currentMode !== "study");
  els.frequencyOrderOption.hidden = !supportsFrequency;
  if (!supportsFrequency && els.orderSelect.value === "frequency") {
    els.orderSelect.value = "ordered";
  }
  els.listTitle.textContent = "Words";
  els.wordListStatus.textContent = `${visibleWords.length} / ${listedWords.length} selected`;
  els.wordListAllButton.disabled = listedWords.length === 0 || visibleWords.length === listedWords.length;
  els.wordListNoneButton.disabled = listedWords.length === 0 || visibleWords.length === 0;

  listedWords.forEach((word) => {
    const [hebrew, english, pos, root, , , , details = {}] = word;
    const mastered = isWordMastered(word);
    const row = document.createElement("div");
    row.className = "word-row";
    row.classList.toggle("is-mastered-word", mastered);
    row.classList.toggle("is-disabled-word", !isFlashcardWordEnabled(word));

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "word-list-checkbox";
    checkbox.checked = isFlashcardWordEnabled(word);
    checkbox.dataset.flashcardKey = getFlashcardWordKey(word);
    checkbox.setAttribute("aria-label", `Include ${hebrew} in flashcards`);

    const hebrewButton = document.createElement("button");
    hebrewButton.type = "button";
    hebrewButton.className = "hebrew";
    hebrewButton.classList.toggle("is-korean-word", isKoreanSelected());
    hebrewButton.dir = isKoreanSelected() ? "ltr" : "rtl";
    hebrewButton.textContent = hebrew;
    hebrewButton.disabled = !isFlashcardWordEnabled(word);
    hebrewButton.addEventListener("click", () => showCard(visibleWords.indexOf(word)));

    const englishButton = document.createElement("button");
    englishButton.type = "button";
    englishButton.textContent = root && root !== hebrew ? `${english} | ${root}` : english;
    englishButton.disabled = !isFlashcardWordEnabled(word);
    englishButton.addEventListener("click", () => showCard(visibleWords.indexOf(word)));

    if (supportsFrequency) {
      const count = document.createElement("span");
      count.className = "korean-frequency-count";
      count.textContent = `${details.frequency || 0}x`;

      const posBadge = document.createElement("span");
      posBadge.className = `pos-badge ${pos}`;
      posBadge.textContent = pos;
      row.classList.add("korean-frequency-row");
      row.append(checkbox, hebrewButton, englishButton, posBadge, count);
      els.wordTable.append(row);
      return;
    }

    const posBadge = document.createElement("span");
    posBadge.className = `pos-badge ${pos}`;
    posBadge.textContent = pos;

    const masterButton = document.createElement("button");
    masterButton.type = "button";
    masterButton.className = "master-row-button";
    masterButton.textContent = mastered ? "Unmaster" : "Master";
    masterButton.addEventListener("click", () => toggleMasteredWord(word));

    row.append(checkbox, hebrewButton, englishButton, posBadge, masterButton);
    els.wordTable.append(row);
  });
}

function refreshFlashcardsFromWordSelection(preferredKey = "") {
  visibleWords = listedWords.filter(isFlashcardWordEnabled);
  const preferredIndex = preferredKey
    ? visibleWords.findIndex((word) => getFlashcardWordKey(word) === preferredKey)
    : -1;
  showCard(preferredIndex >= 0 ? preferredIndex : Math.min(currentIndex, Math.max(visibleWords.length - 1, 0)));
  renderList();
}

function setListedWordsEnabled(enabled) {
  listedWords.forEach((word) => {
    const key = getFlashcardWordKey(word);
    if (enabled) flashcardSkippedWords.delete(key);
    else flashcardSkippedWords.add(key);
  });
  saveFlashcardSkippedWords();
  refreshFlashcardsFromWordSelection();
}

async function initMaculaPicker() {
  const response = await fetch("public/macula/index.json", { cache: "no-store" });
  if (!response.ok) throw new Error("Could not load MACULA index");
  maculaIndex = await response.json();
  await loadVerbFormIndex();
  await loadVerbMeaningIndex();
  await loadElevenLabsCatalog();
  await loadKoreanVideoIndex();

  const savedChapter = getSavedChapter();
  applySavedPreferences();
  renderBookOptions(savedChapter.book);
  renderChapterOptions(savedChapter.chapter);
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

async function loadElevenLabsCatalog() {
  try {
    const response = await fetch("public/audio/elevenlabs/catalog.json", { cache: "no-store" });
    if (!response.ok) {
      elevenLabsCatalog = { chapters: [] };
      return;
    }

    elevenLabsCatalog = await response.json();
  } catch {
    elevenLabsCatalog = { chapters: [] };
  }
}

async function loadKoreanVideoIndex() {
  if (koreanVideoIndex) return koreanVideoIndex;

  const response = await fetch("public/korean/youtube-videos.json", { cache: "no-store" });
  if (!response.ok) throw new Error("Could not load Korean YouTube videos");
  koreanVideoIndex = await response.json();
  return koreanVideoIndex;
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

function getSavedKoreanVideoId() {
  return localStorage.getItem(koreanVideoStorageKey) || "";
}

function saveSelectedChapter(book, chapter) {
  localStorage.setItem(chapterStorageKey, JSON.stringify({ book: book.code, chapter }));
}

function saveSelectedKoreanVideo(videoId) {
  if (videoId) localStorage.setItem(koreanVideoStorageKey, videoId);
}

function audioCatalogEntries() {
  return Array.isArray(elevenLabsCatalog?.chapters) ? elevenLabsCatalog.chapters : [];
}

function audioCatalogModeActive() {
  return isHebrewSelected() && currentMode === "audio";
}

function getSelectableBooks() {
  const books = maculaIndex?.books || [];
  if (!audioCatalogModeActive()) return books;

  const catalogBooks = new Set(audioCatalogEntries().map((entry) => entry.book));
  return books.filter((book) => catalogBooks.has(book.code));
}

function getSelectableChapters(book) {
  if (!book) return [];
  if (!audioCatalogModeActive()) return book.chapters;

  return audioCatalogEntries()
    .filter((entry) => entry.book === book.code)
    .map((entry) => Number(entry.chapter))
    .filter(Boolean)
    .sort((a, b) => a - b);
}

function renderBookOptions(preferredBook = els.bookSelect.value) {
  if (isKoreanSelected()) {
    const videos = Array.isArray(koreanVideoIndex?.videos) ? koreanVideoIndex.videos : [];
    const savedVideoId = getSavedKoreanVideoId();
    const preferredVideo = videos.some((video) => video.id === preferredBook) ? preferredBook : savedVideoId;
    els.bookSelect.innerHTML = "";
    els.bookSelect.setAttribute("aria-label", "YouTube video");

    videos.forEach((video) => {
      const option = document.createElement("option");
      option.value = video.id;
      option.textContent = video.title;
      els.bookSelect.append(option);
    });

    if (videos.some((video) => video.id === preferredVideo)) {
      els.bookSelect.value = preferredVideo;
    } else if (videos[0]) {
      els.bookSelect.value = videos[0].id;
    }
    return;
  }

  const books = getSelectableBooks();
  els.bookSelect.innerHTML = "";
  els.bookSelect.setAttribute("aria-label", "Book");

  books.forEach((book) => {
    const option = document.createElement("option");
    option.value = book.code;
    option.textContent = formatBookName(book);
    els.bookSelect.append(option);
  });

  if (books.some((book) => book.code === preferredBook)) {
    els.bookSelect.value = preferredBook;
  } else if (books[0]) {
    els.bookSelect.value = books[0].code;
  }
}

function renderChapterOptions(preferredChapter = Number(els.chapterSelect.value)) {
  if (isKoreanSelected()) {
    els.chapterSelect.innerHTML = "";
    return;
  }

  const book = maculaIndex?.books.find((item) => item.code === els.bookSelect.value);
  els.chapterSelect.innerHTML = "";
  if (!book) return;

  const chapters = getSelectableChapters(book);
  chapters.forEach((chapter) => {
    const option = document.createElement("option");
    option.value = String(chapter);
    option.textContent = String(chapter);
    els.chapterSelect.append(option);
  });

  if (chapters.includes(Number(preferredChapter))) {
    els.chapterSelect.value = String(preferredChapter);
  } else if (chapters[0]) {
    els.chapterSelect.value = String(chapters[0]);
  }
}

function refreshChapterPicker(preferredBook = els.bookSelect.value, preferredChapter = Number(els.chapterSelect.value)) {
  renderBookOptions(preferredBook);
  renderChapterOptions(preferredChapter);
}

function getAdjacentChapter(delta) {
  if (isKoreanSelected()) {
    const videos = koreanVideos();
    const index = videos.findIndex((video) => video.id === els.bookSelect.value);
    return videos[index + delta] || null;
  }

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

  if (isKoreanSelected()) {
    els.bookSelect.value = target.id;
    await loadCurrentChapter();
    els.readingText.scrollTop = 0;
    return;
  }

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
  return value.replace(/[\u0591-\u05AF\u05BD]/g, "");
}

function elevenLabsManifestUrl() {
  return `public/audio/elevenlabs/manifests/${els.bookSelect.value}.${els.chapterSelect.value}.json`;
}

function audioAssetUrl(path = "") {
  return path.replace(/^\/+/, "");
}

function loadElevenLabsSkippedWords() {
  try {
    const saved = JSON.parse(localStorage.getItem(elevenLabsSkippedWordsStorageKey) || "[]");
    return new Set(Array.isArray(saved) ? saved.filter(Boolean) : []);
  } catch {
    return new Set();
  }
}

function saveElevenLabsSkippedWords() {
  localStorage.setItem(elevenLabsSkippedWordsStorageKey, JSON.stringify([...elevenLabsSkippedWords]));
}

function loadElevenLabsPlaybackPreferences() {
  try {
    const saved = JSON.parse(localStorage.getItem(elevenLabsPlaybackStorageKey) || "{}");
    const savedSpeed = Number(saved.speed);
    return {
      shuffle: saved.shuffle === true,
      speed: elevenLabsPlaybackSpeeds.includes(savedSpeed) ? savedSpeed : 0.85
    };
  } catch {
    return { shuffle: false, speed: 0.85 };
  }
}

function saveElevenLabsPlaybackPreferences() {
  localStorage.setItem(elevenLabsPlaybackStorageKey, JSON.stringify({
    shuffle: elevenLabsShuffleEnabled,
    speed: elevenLabsPlaybackSpeed
  }));
}

function closestElevenLabsSpeedIndex(speed) {
  const target = Number(speed);
  return elevenLabsPlaybackSpeeds.reduce((closestIndex, option, index) => (
    Math.abs(option - target) < Math.abs(elevenLabsPlaybackSpeeds[closestIndex] - target) ? index : closestIndex
  ), 0);
}

function renderElevenLabsSpeedControl() {
  const index = closestElevenLabsSpeedIndex(elevenLabsPlaybackSpeed);
  els.elevenLabsSpeedSlider.value = String(index);
  els.elevenLabsSpeedLabel.textContent = `${elevenLabsPlaybackSpeeds[index]}x`;
  elevenLabsAudio.playbackRate = elevenLabsPlaybackSpeeds[index];
}

function setElevenLabsPlaybackSpeed(speed) {
  const index = closestElevenLabsSpeedIndex(speed);
  elevenLabsPlaybackSpeed = elevenLabsPlaybackSpeeds[index];
  renderElevenLabsSpeedControl();
  saveElevenLabsPlaybackPreferences();
}

function elevenLabsCardKey(card) {
  return card?.key || stripNiqqud(card?.hebrew || "").trim();
}

function isElevenLabsCardCategoryEnabled(card) {
  return Boolean(card);
}

function isElevenLabsCardEnabled(card) {
  const key = elevenLabsCardKey(card);
  return Boolean(key) && isElevenLabsCardCategoryEnabled(card) && !elevenLabsSkippedWords.has(key);
}

function shuffleArray(items) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function resetElevenLabsShuffleOrder() {
  elevenLabsShuffleOrder = shuffleArray((elevenLabsManifest?.cards || []).map((_, index) => index));
}

function orderedElevenLabsCards() {
  const cards = elevenLabsManifest?.cards || [];
  if (!elevenLabsShuffleEnabled) return cards;

  const ordered = elevenLabsShuffleOrder.map((index) => cards[index]).filter(Boolean);
  const orderedIndexes = new Set(elevenLabsShuffleOrder);
  const missing = cards.filter((_, index) => !orderedIndexes.has(index));
  return [...ordered, ...missing];
}

function filteredElevenLabsCards() {
  return orderedElevenLabsCards().filter(isElevenLabsCardCategoryEnabled);
}

function renderElevenLabsPlayerState() {
  const hasAudio = Boolean(elevenLabsQueue.length);
  els.elevenLabsPlayButton.disabled = !hasAudio || elevenLabsIsPlaying;
  els.elevenLabsStopButton.disabled = !elevenLabsIsPlaying;
  els.elevenLabsNextButton.disabled = !hasAudio;
}

function buildElevenLabsQueue() {
  const settings = elevenLabsManifest?.cardSettings || { hebrewRepeats: 2, englishRepeats: 1 };
  elevenLabsQueue = [];

  filteredElevenLabsCards().filter(isElevenLabsCardEnabled).forEach((card) => {
    if (card.audio?.card) {
      elevenLabsQueue.push({
        label: `${card.hebrew} / ${card.english}`,
        src: audioAssetUrl(card.audio.card)
      });
      return;
    }

    for (let index = 0; index < settings.hebrewRepeats; index += 1) {
      elevenLabsQueue.push({
        label: card.hebrew,
        src: audioAssetUrl(card.audio.hebrew)
      });
    }

    for (let index = 0; index < settings.englishRepeats; index += 1) {
      elevenLabsQueue.push({
        label: card.english,
        src: audioAssetUrl(card.audio.english)
      });
    }
  });

  elevenLabsQueueIndex = Math.min(elevenLabsQueueIndex, Math.max(elevenLabsQueue.length - 1, 0));
}

function renderElevenLabsCacheList() {
  const cards = filteredElevenLabsCards();
  els.elevenLabsCacheList.textContent = "";
  els.elevenLabsCachePanel.classList.toggle("hidden", !cards.length);

  if (!cards.length) {
    els.elevenLabsCacheStatus.textContent = "0 selected";
    return;
  }

  const enabledCount = cards.filter(isElevenLabsCardEnabled).length;
  els.elevenLabsCacheStatus.textContent = `${enabledCount} / ${cards.length} selected`;

  const fragment = document.createDocumentFragment();
  cards.forEach((card) => {
    const key = elevenLabsCardKey(card);
    const row = document.createElement("label");
    row.className = "elevenlabs-cache-row";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = !elevenLabsSkippedWords.has(key);
    checkbox.dataset.cacheKey = key;
    checkbox.setAttribute("aria-label", `${card.hebrew} ${card.english}`);

    const hebrew = document.createElement("span");
    hebrew.className = "elevenlabs-cache-hebrew";
    hebrew.classList.toggle("is-korean-word", card.language === "ko");
    hebrew.dir = card.language === "ko" ? "ltr" : "rtl";
    hebrew.textContent = card.hebrew;

    const english = document.createElement("span");
    english.className = "elevenlabs-cache-english";
    english.textContent = card.english;

    row.classList.toggle("has-category", Boolean(card.category));
    if (card.category) {
      const category = document.createElement("span");
      category.className = `elevenlabs-cache-category ${card.category}`;
      category.textContent = card.category;
      row.append(checkbox, category, hebrew, english);
    } else {
      row.append(checkbox, hebrew, english);
    }
    fragment.append(row);
  });

  els.elevenLabsCacheList.append(fragment);
}

function refreshElevenLabsPlaybackFromSelection() {
  buildElevenLabsQueue();
  renderElevenLabsCacheList();
  updateElevenLabsStatus();
  renderElevenLabsPlayerState();
  if (elevenLabsIsPlaying && !elevenLabsQueue.length) {
    stopElevenLabsAudio();
  }
}

function setAllElevenLabsCardsEnabled(enabled) {
  filteredElevenLabsCards().forEach((card) => {
    const key = elevenLabsCardKey(card);
    if (!key) return;
    if (enabled) {
      elevenLabsSkippedWords.delete(key);
    } else {
      elevenLabsSkippedWords.add(key);
    }
  });
  saveElevenLabsSkippedWords();
  refreshElevenLabsPlaybackFromSelection();
}

function updateElevenLabsStatus(message = "") {
  if (message) {
    els.elevenLabsAudioStatus.textContent = message;
    return;
  }

  if (!elevenLabsManifest) {
    els.elevenLabsAudioStatus.textContent = "No generated audio for this chapter yet.";
    return;
  }

  const cardSettings = elevenLabsManifest.cardSettings;
  const enabledCount = filteredElevenLabsCards().filter(isElevenLabsCardEnabled).length;
  const totalCount = filteredElevenLabsCards().length;
  if (cardSettings) {
    els.elevenLabsAudioStatus.textContent =
      `${enabledCount} / ${totalCount} generated audio cards selected.`;
    return;
  }

  els.elevenLabsAudioStatus.textContent = `${enabledCount} / ${totalCount} generated audio cards selected.`;
}

async function loadElevenLabsManifest() {
  stopElevenLabsAudio();
  elevenLabsManifest = null;
  elevenLabsQueue = [];
  elevenLabsShuffleOrder = [];
  renderElevenLabsCacheList();
  updateElevenLabsStatus("Checking for generated audio...");
  renderElevenLabsPlayerState();

  try {
    const response = await fetch(elevenLabsManifestUrl(), { cache: "no-store" });
    if (!response.ok) {
      updateElevenLabsStatus("No generated audio for this chapter yet.");
      renderElevenLabsCacheList();
      renderElevenLabsPlayerState();
      return;
    }

    elevenLabsManifest = await response.json();
    if (elevenLabsShuffleEnabled) resetElevenLabsShuffleOrder();
    buildElevenLabsQueue();
    renderElevenLabsCacheList();
    updateElevenLabsStatus();
    renderElevenLabsPlayerState();
  } catch {
    updateElevenLabsStatus("Could not load generated audio.");
    renderElevenLabsCacheList();
    renderElevenLabsPlayerState();
  }
}

function playCurrentElevenLabsItem() {
  const item = elevenLabsQueue[elevenLabsQueueIndex];
  if (!item) {
    stopElevenLabsAudio();
    return;
  }

  elevenLabsAudio.src = item.src;
  elevenLabsAudio.playbackRate = elevenLabsPlaybackSpeed;
  elevenLabsAudio.play().catch(() => {
    updateElevenLabsStatus("Could not play generated audio.");
    stopElevenLabsAudio();
  });
  els.elevenLabsAudioStatus.textContent = `${elevenLabsQueueIndex + 1} / ${elevenLabsQueue.length}: ${item.label}`;
}

function playElevenLabsAudio() {
  if (!elevenLabsQueue.length) return;
  elevenLabsIsPlaying = true;
  renderElevenLabsPlayerState();
  playCurrentElevenLabsItem();
}

function stopElevenLabsAudio() {
  elevenLabsIsPlaying = false;
  elevenLabsAudio.pause();
  elevenLabsAudio.removeAttribute("src");
  elevenLabsAudio.load();
  renderElevenLabsPlayerState();
}

function nextElevenLabsAudio() {
  if (!elevenLabsQueue.length) return;
  elevenLabsQueueIndex = (elevenLabsQueueIndex + 1) % elevenLabsQueue.length;
  if (elevenLabsIsPlaying) {
    playCurrentElevenLabsItem();
  } else {
    const item = elevenLabsQueue[elevenLabsQueueIndex];
    els.elevenLabsAudioStatus.textContent = `${elevenLabsQueueIndex + 1} / ${elevenLabsQueue.length}: ${item.label}`;
  }
}

function sefariaRef(book, chapter) {
  return `${book.name}.${chapter}`;
}

async function loadReadingChapter(book, chapter, requestId = chapterLoadRequestId) {
  els.readingStatus.textContent = "Loading...";
  els.readingText.innerHTML = "";
  els.readingText.classList.remove("is-korean", "is-korean-caption");
  els.readingText.dir = supportedLanguages.hebrew.readingDir;

  const url = `https://www.sefaria.org/api/texts/${encodeURIComponent(sefariaRef(book, chapter))}?context=0&commentary=0`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load ${book.name} ${chapter} from Sefaria`);
  const data = await response.json();
  if (requestId !== chapterLoadRequestId || !isHebrewSelected()) return;
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

function koreanVideos() {
  return Array.isArray(koreanVideoIndex?.videos) ? koreanVideoIndex.videos : [];
}

function getSelectedKoreanVideo(videoId = els.bookSelect.value) {
  const videos = koreanVideos();
  return videos.find((video) => video.id === videoId) || videos[0] || null;
}

function wordFromKoreanCaptionEntry(entry, video) {
  const word = entry?.word || "";
  const count = Number(entry?.count) || 0;
  const english = entry?.english || "Needs gloss";
  const romanization = entry?.romanization || "";
  const pos = ["noun", "verb", "other"].includes(entry?.pos) ? entry.pos : "other";
  return wordFromParts(word, english, pos, word, "", [video.title], "", {
    breakdown: romanization ? [romanization] : [],
    frequency: count,
    romanization,
    contextEnglish: entry?.contextEnglish || "",
    firstCaptionIndex: Number(entry?.firstCaptionIndex) || 0,
    firstTokenIndex: Number(entry?.firstTokenIndex) || 0
  });
}

function formatCaptionTime(milliseconds = 0) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function renderKoreanCaptionText(video = currentKoreanVideo) {
  els.readingStatus.textContent = video
    ? `${video.title} - ${selectedLanguageReadingLabel()}`
    : "No Korean video selected.";
  els.readingText.innerHTML = "";
  els.readingText.classList.add("is-korean", "is-korean-caption");
  els.readingText.dir = supportedLanguages.korean.readingDir;

  if (!video) {
    els.readingText.append(els.readingNav);
    return;
  }

  (video.captions || []).forEach((caption) => {
    const row = document.createElement("p");
    row.className = "reading-verse korean-caption-line";

    const number = document.createElement("span");
    number.className = "verse-number";
    number.textContent = formatCaptionTime(caption.startMs);

    const text = document.createElement("span");
    text.className = "verse-text";
    text.textContent = caption.text || "";

    row.append(number, text);
    els.readingText.append(row);
  });

  updateReadingNavButtons();
  els.readingText.append(els.readingNav);
}

async function loadKoreanVideo(videoId, requestId = chapterLoadRequestId) {
  await loadKoreanVideoIndex();
  if (requestId !== chapterLoadRequestId || !isKoreanSelected()) return;

  const video = getSelectedKoreanVideo(videoId);
  currentKoreanVideo = video;
  currentChapterRecords = video?.captions || [];
  allWords = (video?.words || [])
    .map((entry) => wordFromKoreanCaptionEntry(entry, video))
    .filter(([korean]) => korean);
  currentIndex = 0;
  currentVerbIndex = 0;
  verbGroups = [];
  renderVerbSelect();
  saveSelectedKoreanVideo(video?.id || "");
  applyFilter();
  if (currentMode === "reading") {
    renderKoreanCaptionText(video);
  }
}

function loadKoreanAlphabetPractice() {
  allWords = buildKoreanAlphabetCards();
  currentChapterRecords = [];
  currentIndex = 0;
  currentVerbIndex = 0;
  verbGroups = [];
  direction = "hebrew";
  els.directionSelect.value = "hebrew";
  els.posSelect.value = "all";
  els.searchInput.value = "";
  renderVerbSelect();
  applyFilter();
}

async function loadSelectedChapter() {
  const book = maculaIndex?.books.find((item) => item.code === els.bookSelect.value);
  const chapter = Number(els.chapterSelect.value);
  if (!book || !chapter) return;

  const response = await fetch(`public/macula/${book.code}.${chapter}.json`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Could not load ${book.name} ${chapter}`);
  const records = await response.json();

  currentChapterRecords = records;
  allWords = uniqueWordsFromMacula(coalesceMaculaRecords(records));
  currentIndex = 0;
  currentVerbIndex = 0;
  verbGroups = buildVerbPracticeGroups();
  if (verbGroups[0]) selectDefaultVerbCombo(verbGroups[0]);
  renderVerbSelect();
  els.searchInput.value = "";
  saveSelectedChapter(book, chapter);
  applyFilter();
  renderVerbPractice();
  await loadElevenLabsManifest();
}

async function loadCurrentChapter() {
  const requestId = ++chapterLoadRequestId;

  if (isKoreanSelected()) {
    syncLanguageModeAvailability();
    if (currentMode === "alphabet") {
      loadKoreanAlphabetPractice();
      return;
    }

    if (!koreanVideoIndex) await loadKoreanVideoIndex();
    if (!els.bookSelect.value) renderBookOptions(getSavedKoreanVideoId());
    await loadKoreanVideo(els.bookSelect.value, requestId);
    return;
  }

  const book = maculaIndex?.books.find((item) => item.code === els.bookSelect.value);
  const chapter = Number(els.chapterSelect.value);
  if (!book || !chapter) {
    if (currentMode === "audio") {
      currentChapterRecords = [];
      elevenLabsManifest = null;
      elevenLabsQueue = [];
      renderElevenLabsCacheList();
      updateElevenLabsStatus("No generated audio chapters in catalog.");
      renderElevenLabsPlayerState();
    }
    return;
  }

  if (currentMode === "reading") {
    saveSelectedChapter(book, chapter);
    await loadReadingChapter(book, chapter, requestId);
    return;
  }

  await loadSelectedChapter();
}

els.languageSelect.addEventListener("change", () => {
  const preferredBook = els.bookSelect.value;
  const preferredChapter = Number(els.chapterSelect.value);
  selectedLanguage = els.languageSelect.value === "korean" ? "korean" : "hebrew";
  syncLanguageModeAvailability();
  refreshChapterPicker(preferredBook, preferredChapter);
  savePreferences();
  renderMode();
  loadCurrentChapter().catch((error) => {
    console.error(error);
    els.readingStatus.textContent = "Could not load reading text.";
    els.readingText.append(els.readingNav);
  });
});

els.bookSelect.addEventListener("change", () => {
  renderChapterOptions(1);
  loadCurrentChapter().catch(console.error);
});
els.chapterSelect.addEventListener("change", () => {
  loadCurrentChapter().catch((error) => {
    console.error(error);
  });
});
els.cardButton.addEventListener("click", cardTapAction);
els.revealButton.addEventListener("click", revealAnswer);
els.previousWordButton.addEventListener("click", () => moveBy(-1));
els.nextWordButton.addEventListener("click", () => moveBy(1));
els.writingCardButton.addEventListener("click", () => moveWritingBy(1));
els.verbCardButton.addEventListener("click", () => moveVerbBy(1));
els.verbSelect.addEventListener("change", () => {
  showVerb(Number(els.verbSelect.value) || 0);
});
els.themeToggleButton.addEventListener("click", toggleTheme);
els.settingsButton.addEventListener("click", () => {
  els.settingsDialog.showModal();
});
els.settingsCloseButton.addEventListener("click", () => {
  els.settingsDialog.close();
});
els.searchInput.addEventListener("input", applyFilter);
els.modeSelect.addEventListener("change", () => {
  const preferredBook = els.bookSelect.value;
  const preferredChapter = Number(els.chapterSelect.value);
  currentMode = els.modeSelect.value;
  refreshChapterPicker(preferredBook, preferredChapter);
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
els.wordTable.addEventListener("change", (event) => {
  const checkbox = event.target.closest("input[type='checkbox'][data-flashcard-key]");
  if (!checkbox) return;
  const currentWord = visibleWords[currentIndex];
  const currentKey = currentWord ? getFlashcardWordKey(currentWord) : "";
  if (checkbox.checked) flashcardSkippedWords.delete(checkbox.dataset.flashcardKey);
  else flashcardSkippedWords.add(checkbox.dataset.flashcardKey);
  saveFlashcardSkippedWords();
  refreshFlashcardsFromWordSelection(currentKey);
});
els.wordListAllButton.addEventListener("click", () => setListedWordsEnabled(true));
els.wordListNoneButton.addEventListener("click", () => setListedWordsEnabled(false));
els.koreanAlphabetFilterSelect.addEventListener("change", () => {
  savePreferences();
  if (isKoreanSelected() && currentMode === "alphabet") {
    loadKoreanAlphabetPractice();
  }
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
els.elevenLabsPlayButton.addEventListener("click", playElevenLabsAudio);
els.elevenLabsStopButton.addEventListener("click", stopElevenLabsAudio);
els.elevenLabsNextButton.addEventListener("click", nextElevenLabsAudio);
els.elevenLabsSpeedSlider.addEventListener("input", () => {
  const speed = elevenLabsPlaybackSpeeds[Number(els.elevenLabsSpeedSlider.value)] || 0.85;
  setElevenLabsPlaybackSpeed(speed);
});
els.elevenLabsCacheList.addEventListener("change", (event) => {
  const checkbox = event.target.closest("input[type='checkbox'][data-cache-key]");
  if (!checkbox) return;

  if (checkbox.checked) {
    elevenLabsSkippedWords.delete(checkbox.dataset.cacheKey);
  } else {
    elevenLabsSkippedWords.add(checkbox.dataset.cacheKey);
  }

  saveElevenLabsSkippedWords();
  refreshElevenLabsPlaybackFromSelection();
});
els.elevenLabsCacheAllButton.addEventListener("click", () => setAllElevenLabsCardsEnabled(true));
els.elevenLabsCacheNoneButton.addEventListener("click", () => setAllElevenLabsCardsEnabled(false));
els.elevenLabsShuffleToggle.addEventListener("change", () => {
  elevenLabsShuffleEnabled = els.elevenLabsShuffleToggle.checked;
  if (elevenLabsShuffleEnabled) resetElevenLabsShuffleOrder();
  elevenLabsQueueIndex = 0;
  saveElevenLabsPlaybackPreferences();
  refreshElevenLabsPlaybackFromSelection();
});
els.manageMasteredButton.addEventListener("click", openMasteredModal);
els.removeAllMasteredButton.addEventListener("click", removeAllMasteredWords);
els.masterWordButton.addEventListener("click", toggleCurrentMasteredWord);
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
  if (currentMode === "verbs" && isHebrewSelected()) {
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
window.addEventListener("resize", fitFlashcardText);
elevenLabsAudio.addEventListener("ended", () => {
  if (elevenLabsIsPlaying) nextElevenLabsAudio();
});
elevenLabsAudio.addEventListener("error", () => {
  updateElevenLabsStatus("Could not play generated audio.");
  stopElevenLabsAudio();
});

applyTheme(getCurrentTheme());
els.elevenLabsShuffleToggle.checked = elevenLabsShuffleEnabled;
renderElevenLabsSpeedControl();
renderElevenLabsPlayerState();
renderHebrewKeyboard();
showCard(0);
showWritingCard(0);
renderList();
initMaculaPicker().catch(() => {
  console.error("Could not load chapter data");
});
