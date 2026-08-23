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
let direction = "hebrew";
let formMode = "root";
let maculaIndex = null;
const chapterStorageKey = "hebrew-study-helper:last-chapter";
const masteredWordsStorageKey = "hebrew-study-helper:mastered-words";
const legacyHiddenWordsStorageKey = "hebrew-study-helper:hidden-words";
const masteredWords = loadMasteredWordKeys();

const els = {
  bookSelect: document.querySelector("#book-select"),
  chapterSelect: document.querySelector("#chapter-select"),
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
    els.hebrewWord.textContent = "אין מילים";
    els.englishWord.textContent = "No matching words";
    els.cardCount.textContent = "0 / 0";
    els.masterWordButton.disabled = true;
    els.masterWordButton.textContent = "Mark as mastered";
    revealed = true;
    renderRevealState();
    return;
  }

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

function renderRevealState() {
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
  showCard(currentIndex + delta);
}

function spaceAction() {
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

function applyFilter() {
  const query = els.searchInput.value.trim().toLowerCase();
  const selectedPos = els.posSelect.value;
  const showMastered = els.showMasteredToggle.checked;
  studyWords = getStudyWords();
  visibleWords = studyWords.filter((word) => {
    const [hebrew, english, pos, root] = word;
    const matchesText =
      hebrew.includes(query) ||
      root.includes(query) ||
      english.toLowerCase().includes(query);
    const matchesPartOfSpeech = selectedPos === "all" || pos === selectedPos;
    const matchesMastered = showMastered || !isWordMastered(word);
    return matchesText && matchesPartOfSpeech && matchesMastered;
  });
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
  if (!visibleWords.length) return;
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
  els.formSelect.value = "root";
  formMode = "root";
  renderChapterOptions();
  const currentBook = maculaIndex.books.find((book) => book.code === els.bookSelect.value);
  els.chapterSelect.value = currentBook?.chapters.includes(savedChapter.chapter)
    ? String(savedChapter.chapter)
    : "1";
  await loadSelectedChapter();
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

async function loadSelectedChapter() {
  const book = maculaIndex?.books.find((item) => item.code === els.bookSelect.value);
  const chapter = Number(els.chapterSelect.value);
  if (!book || !chapter) return;

  const response = await fetch(`public/macula/${book.code}.${chapter}.json`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Could not load ${book.name} ${chapter}`);
  const records = await response.json();

  allWords = uniqueWordsFromMacula(records);
  studyWords = getStudyWords();
  visibleWords = shuffledWords(studyWords.filter((word) => els.showMasteredToggle.checked || !isWordMastered(word)));
  currentIndex = 0;
  els.searchInput.value = "";
  saveSelectedChapter(book, chapter);
  showCard(0);
  renderList();
}

els.bookSelect.addEventListener("change", () => {
  renderChapterOptions();
  loadSelectedChapter().catch(console.error);
});
els.chapterSelect.addEventListener("change", () => {
  loadSelectedChapter().catch((error) => {
    console.error(error);
  });
});
els.cardButton.addEventListener("click", spaceAction);
els.searchInput.addEventListener("input", applyFilter);
els.posSelect.addEventListener("change", applyFilter);
els.showMasteredToggle.addEventListener("change", applyFilter);
els.manageMasteredButton.addEventListener("click", openMasteredModal);
els.removeAllMasteredButton.addEventListener("click", removeAllMasteredWords);
els.masterWordButton.addEventListener("click", toggleCurrentMasteredWord);
els.formSelect.addEventListener("change", (event) => {
  formMode = event.target.value;
  applyFilter();
});
els.directionSelect.addEventListener("change", (event) => {
  direction = event.target.value;
  showCard(currentIndex);
});

document.addEventListener("keydown", (event) => {
  if (event.target.matches("input, select")) return;
  if (event.key === " ") {
    event.preventDefault();
    spaceAction();
  }
  if (event.key === "ArrowRight") moveBy(1);
  if (event.key === "ArrowLeft") moveBy(-1);
  if (event.key.toLowerCase() === "h") toggleCurrentMasteredWord();
});

showCard(0);
renderList();
initMaculaPicker().catch(() => {
  console.error("Could not load chapter data");
});
