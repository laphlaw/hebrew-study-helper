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
let currentIndex = 0;
let revealed = false;
let deckFinished = false;
let direction = "hebrew";
let formMode = "root";
let currentMode = "study";
let maculaIndex = null;
let autoAdvanceTimer = null;
let fallbackReadingFullscreen = false;
const chapterStorageKey = "hebrew-study-helper:last-chapter";
const masteredWordsStorageKey = "hebrew-study-helper:mastered-words";
const legacyHiddenWordsStorageKey = "hebrew-study-helper:hidden-words";
const autoAdvanceStorageKey = "hebrew-study-helper:auto-advance";
const orderStorageKey = "hebrew-study-helper:word-order";
const preferencesStorageKey = "hebrew-study-helper:preferences";
const masteredWords = loadMasteredWordKeys();

const els = {
  bookSelect: document.querySelector("#book-select"),
  chapterSelect: document.querySelector("#chapter-select"),
  modeSelect: document.querySelector("#mode-select"),
  flashcardSection: document.querySelector("#flashcard-section"),
  readingSection: document.querySelector("#reading-section"),
  readingStatus: document.querySelector("#reading-status"),
  readingText: document.querySelector("#reading-text"),
  readingFontSize: document.querySelector("#reading-font-size"),
  readingFontLabel: document.querySelector("#reading-font-label"),
  readingFullscreenButton: document.querySelector("#reading-fullscreen-button"),
  readingExitFullscreenButton: document.querySelector("#reading-exit-fullscreen-button"),
  readingNav: document.querySelector("#reading-nav"),
  readingPrevButton: document.querySelector("#reading-prev-button"),
  readingNextButton: document.querySelector("#reading-next-button"),
  settingsButton: document.querySelector("#settings-button"),
  settingsCloseButton: document.querySelector("#settings-close-button"),
  settingsDialog: document.querySelector("#settings-dialog"),
  settingsSection: document.querySelector("#settings-section"),
  wordListSection: document.querySelector("#word-list-section"),
  cardButton: document.querySelector("#card-button"),
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

function wordFromParts(hebrew, english, pos, root, morph = "", refs = []) {
  return [hebrew, english, pos, root || hebrew, morph, refs];
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
      mode: saved.mode === "reading" ? "reading" : "study",
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
        refs: new Set()
      });
    }

    const group = grouped.get(key);
    if (record.g) group.glosses.add(record.g);
    if (record.m) group.morphs.add(record.m);
    if (record.r) group.refs.add(record.r);
  });

  return [...grouped.values()].map((group) => {
    const english = [...group.glosses].join("; ") || group.root;
    return wordFromParts(group.hebrew, english, group.pos, group.root, [...group.morphs].join(", "), [...group.refs]);
  });
}

function getStudyWords() {
  if (formMode === "text") return [...allWords];

  const grouped = new Map();
  allWords.forEach(([hebrew, english, pos, root, morph, refs = []]) => {
    const key = `${stripNiqqud(root)}|${pos}`;
    if (!grouped.has(key)) {
      grouped.set(key, {
        hebrew: root,
        english: new Set(),
        pos,
        root,
        forms: new Set(),
        morphs: new Set(),
        refs: new Set()
      });
    }

    const group = grouped.get(key);
    group.english.add(english);
    group.forms.add(hebrew);
    if (morph) group.morphs.add(morph);
    refs.forEach((ref) => group.refs.add(ref));
  });

  return [...grouped.values()].map((group) => {
    const forms = [...group.forms];
    const glosses = [...group.english];
    const english = glosses.length === 1 ? glosses[0] : glosses.join("; ");
    const formNote = forms.length > 1 ? ` (Forms: ${forms.join(" / ")})` : "";
    return wordFromParts(group.hebrew, `${english}${formNote}`, group.pos, group.root, [...group.morphs].join(", "), [...group.refs]);
  });
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
    return;
  }

  const showingHebrewFirst = direction === "hebrew";
  els.hebrewWord.classList.toggle("hidden", !showingHebrewFirst && !revealed);
  els.englishWord.classList.toggle("hidden", showingHebrewFirst && !revealed);
  els.cardButton.setAttribute("aria-label", revealed ? "Hide answer" : "Reveal answer");
}

function revealToggle() {
  revealed = !revealed;
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
  els.flashcardSection.classList.toggle("hidden", readingMode);
  els.settingsButton.classList.toggle("hidden", readingMode);
  els.wordListSection.classList.toggle("hidden", readingMode);
  els.readingSection.classList.toggle("hidden", !readingMode);
  els.manageMasteredButton.classList.toggle("hidden", readingMode);

  if (readingMode) {
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

  revealToggle();
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

  allWords = uniqueWordsFromMacula(records);
  studyWords = getStudyWords();
  visibleWords = orderWords(studyWords.filter((word) => els.showMasteredToggle.checked || !isWordMastered(word)));
  currentIndex = 0;
  els.searchInput.value = "";
  saveSelectedChapter(book, chapter);
  showCard(0);
  renderList();
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
els.cardButton.addEventListener("click", spaceAction);
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
  if (currentMode === "reading") return;
  if (event.key === " ") {
    event.preventDefault();
    spaceAction();
  }
  if (event.key === "ArrowRight") moveBy(1);
  if (event.key === "ArrowLeft") moveBy(-1);
  if (event.key.toLowerCase() === "h") toggleCurrentMasteredWord();
});

document.addEventListener("fullscreenchange", renderReadingFullscreenState);

showCard(0);
renderList();
initMaculaPicker().catch(() => {
  console.error("Could not load chapter data");
});
