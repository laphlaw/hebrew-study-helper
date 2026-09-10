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

const hangulStart = 0xac00;
const hangulEnd = 0xd7a3;
const initialRomanizations = [
  "g", "kk", "n", "d", "tt", "r", "m", "b", "pp", "s",
  "ss", "", "j", "jj", "ch", "k", "t", "p", "h"
];
const initialJamo = [
  "ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ",
  "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"
];
const medialRomanizations = [
  "a", "ae", "ya", "yae", "eo", "e", "yeo", "ye", "o", "wa",
  "wae", "oe", "yo", "u", "wo", "we", "wi", "yu", "eu", "ui", "i"
];
const finalRomanizations = [
  "", "k", "k", "ks", "n", "nj", "nh", "t", "l", "lk",
  "lm", "lb", "ls", "lt", "lp", "lh", "m", "p", "ps", "t",
  "t", "ng", "t", "t", "k", "t", "p", "h"
];
const finalJamo = [
  "", "ㄱ", "ㄲ", "ㄳ", "ㄴ", "ㄵ", "ㄶ", "ㄷ", "ㄹ", "ㄺ",
  "ㄻ", "ㄼ", "ㄽ", "ㄾ", "ㄿ", "ㅀ", "ㅁ", "ㅂ", "ㅄ", "ㅅ",
  "ㅆ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"
];
const finalIndexByJamo = new Map(finalJamo.map((jamo, index) => [jamo, index]));
const initialIndexByJamo = new Map(initialJamo.map((jamo, index) => [jamo, index]));
const carriedFinalsBeforeIeung = new Map([
  ["ㄱ", ["", "ㄱ"]],
  ["ㄲ", ["", "ㄲ"]],
  ["ㄳ", ["ㄱ", "ㅅ"]],
  ["ㄴ", ["", "ㄴ"]],
  ["ㄵ", ["ㄴ", "ㅈ"]],
  ["ㄶ", ["", "ㄴ"]],
  ["ㄷ", ["", "ㄷ"]],
  ["ㄹ", ["", "ㄹ"]],
  ["ㄺ", ["ㄹ", "ㄱ"]],
  ["ㄻ", ["ㄹ", "ㅁ"]],
  ["ㄼ", ["ㄹ", "ㅂ"]],
  ["ㄽ", ["ㄹ", "ㅅ"]],
  ["ㄾ", ["ㄹ", "ㅌ"]],
  ["ㄿ", ["ㄹ", "ㅍ"]],
  ["ㅀ", ["", "ㄹ"]],
  ["ㅁ", ["", "ㅁ"]],
  ["ㅂ", ["", "ㅂ"]],
  ["ㅄ", ["ㅂ", "ㅅ"]],
  ["ㅅ", ["", "ㅅ"]],
  ["ㅆ", ["", "ㅆ"]],
  ["ㅈ", ["", "ㅈ"]],
  ["ㅊ", ["", "ㅊ"]],
  ["ㅋ", ["", "ㅋ"]],
  ["ㅌ", ["", "ㅌ"]],
  ["ㅍ", ["", "ㅍ"]],
  ["ㅎ", ["", "ㅇ"]]
]);

function decomposeHangul(character) {
  const codePoint = character.codePointAt(0);
  if (codePoint < hangulStart || codePoint > hangulEnd) return null;

  const syllableIndex = codePoint - hangulStart;
  return {
    initialIndex: Math.floor(syllableIndex / 588),
    medialIndex: Math.floor((syllableIndex % 588) / 28),
    finalIndex: syllableIndex % 28
  };
}

function romanizeSyllable(parts) {
  return [
    initialRomanizations[parts.initialIndex],
    medialRomanizations[parts.medialIndex],
    finalRomanizations[parts.finalIndex]
  ].join("");
}

function romanizeHangul(value = "") {
  const syllables = [...value].map((character) => ({
    character,
    parts: decomposeHangul(character)
  }));

  syllables.forEach((syllable, index) => {
    const nextSyllable = syllables[index + 1];
    if (!syllable.parts || !nextSyllable?.parts || !syllable.parts.finalIndex) return;
    if (nextSyllable.parts.initialIndex !== initialIndexByJamo.get("ㅇ")) return;

    const carried = carriedFinalsBeforeIeung.get(finalJamo[syllable.parts.finalIndex]);
    if (!carried) return;

    const [remainingFinal, nextInitial] = carried;
    syllable.parts.finalIndex = finalIndexByJamo.get(remainingFinal);
    nextSyllable.parts.initialIndex = initialIndexByJamo.get(nextInitial);
  });

  return syllables
    .map(({ character, parts }) => parts ? romanizeSyllable(parts) : character)
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

// Classify each complete spoken form, including any attached particles.
// Descriptive predicates are grouped with verbs for the app's three-part filter.
const koreanVlogNouns = new Set(`
  기차를 파리에 오늘 오늘은 것 카페에서 숙소에 날씨가 햇빛이 분 카페에 조식을
  커피를 엽서를 걸 도시가 스페인어도 기차 책도 아침에 브런치를 숙소에서 내일
  여행지에서 시간이 시간 서점에 마음에 사실 빨래를 아침을 게 숙소로 짐을
  노트북으로 일을 아메리카노를 아이스 친구들도 사람들이 에너지가 프랑스어를
  안에서 브런치도 이상 해가 실내에서도 에어컨이 에어컨을 여름에 한국에서는
  실내가 저녁 근처 식당에 관광지에 관광지가 사람에게 정도 바르셀로나가 파리하고
  분위기도 사람들도 매력이 서점에서 서점은 영어 책을 엽서가 저녁을 세탁기하고
  건조기가 하루를 기분이 여행이 아침은 계란 빵 조식은 치즈 햄 어제는 오후에
  산책을 때 잔 커피도 시에 바르셀로나를 샤워를 기차역으로 목이 라떼를 매일
  요거트도 바르셀로나에는 사람이 카페를 건 스페인을 월에 파리를 파리가 빵도
  빵집에서 카페에도 산책도 관광은 파리에서도 일상을 도시는 번 스페인어로
  스페인어를 수 것도 기차역에서 줄이 시 동안 그저께 스페인에서 기차가 물이
  생수로 손을 이를 여행을 여행에서 이번 스페인만 계획을 프랑스어도
`.trim().split(/\s+/));

const koreanVlogVerbs = new Set(`
  싶어요 있어요 거예요 같아요 가서 먹고 나왔어요 산책하고 했는데 일어나서 먹었어요
  가고 더워요 쉬고 더워서 추워요 있었어요 구경하고 했어요 가는 생각했어요 달라요
  다르고 있는 돼요 좋아요 없을 타고 돌아가서 싸고 일하는 넘쳐요 왔어요 도착했어요
  일어났어요 피곤했어요 읽고 싶었어요 산책하려고 강하고 걸어요 들어가서 될 쉬어야
  져서 세지 않아서 틀어요 추운데 시간이에요 먹으려고 먹었는데 맛있었어요 가는데
  보고 싶은 했지 마시면서 썼어요 사랑하는 쓰는 행복해요 읽었어요 쉬다가 좋아해요
  들러서 돌아갈 들어요 거라고 비슷할 다른 서점이에요 파는 구경했는데 많았어요
  재미있는 보면 사고 샀어요 구경할 거에요 먹을 해야 있어서 쉴 보내고 여유로운
  스타일이에요 간단한 강해서 못했어요 싶어서 걷고 걷다가 마시고 타야 떠나요 가요
  마신 갈 앉아 하면서 마셔요 좋아하는데 더우니까 말라요 주문하지만 마셨어요 타러
  하다가 출발할 많아요 맞는다고 좋아하고 앉아서 좋아해서 편했어요 떠나는 슬프지만
  기대돼요 떠난 그리웠어요 맛있는 사먹고 가던 만날 할 즐기고 들었는데 멋있어요
  오고 예쁜 들으면 말하는 못하지만 아름다워요 배운 배울 있었으면 좋겠어요 걸릴
  배우는 배우고 기다리고 길어요 타요 탈 지연돼서 힘들었지만 나와서 닦았어요 씻고
  해봤어요 어땠어요 가려고 바꿨어요 만나고 연습하고 만나요
`.trim().split(/\s+/));

const koreanVlogVerbRootGroups = {
  "가다": "가서 가고 가는 가는데 가요 갈 가려고 가던",
  "같다": "같아요",
  "걷다": "걸어요 걷고 걷다가",
  "걸리다": "걸릴",
  "구경하다": "구경하고 구경했는데 구경할",
  "그립다": "그리웠어요",
  "기다리다": "기다리고",
  "기대되다": "기대돼요",
  "길다": "길어요",
  "나오다": "나왔어요 나와서",
  "넘치다": "넘쳐요",
  "다르다": "달라요 다르고 다른",
  "닦다": "닦았어요",
  "덥다": "더워요 더워서 더우니까",
  "되다": "돼요 될",
  "도착하다": "도착했어요",
  "돌아가다": "돌아가서 돌아갈",
  "들다": "들어요 들었는데 들으면",
  "들르다": "들러서",
  "들어가다": "들어가서",
  "마르다": "말라요",
  "마시다": "마시면서 마시고 마신 마셔요 마셨어요",
  "맞다": "맞는다고",
  "많다": "많았어요 많아요",
  "말하다": "말하는",
  "맛있다": "맛있었어요 맛있는",
  "먹다": "먹고 먹었어요 먹으려고 먹었는데 먹을",
  "멋있다": "멋있어요",
  "못하다": "못했어요 못하지만",
  "바꾸다": "바꿨어요",
  "배우다": "배운 배울 배우는 배우고",
  "보다": "보고 보면",
  "보내다": "보내고",
  "비슷하다": "비슷할",
  "사다": "사고 샀어요",
  "사랑하다": "사랑하는",
  "사먹다": "사먹고",
  "산책하다": "산책하고 산책하려고",
  "생각하다": "생각했어요",
  "세다": "세지",
  "쉬다": "쉬고 쉬어야 쉬다가 쉴",
  "슬프다": "슬프지만",
  "싶다": "싶어요 싶었어요 싶은 싶어서",
  "싸다": "싸고",
  "씻다": "씻고",
  "아름답다": "아름다워요",
  "않다": "않아서",
  "앉다": "앉아 앉아서",
  "어떻다": "어땠어요",
  "여유롭다": "여유로운",
  "예쁘다": "예쁜",
  "오다": "왔어요 오고",
  "이다": "거예요 시간이에요 거라고 서점이에요 거에요 스타일이에요",
  "일어나다": "일어나서 일어났어요",
  "일하다": "일하는",
  "있다": "있어요 있었어요 있는 있어서 있었으면",
  "재미있다": "재미있는",
  "좋다": "좋아요 좋겠어요",
  "좋아하다": "좋아해요 좋아하는데 좋아하고 좋아해서",
  "주문하다": "주문하지만",
  "즐기다": "즐기고",
  "지다": "져서",
  "지연되다": "지연돼서",
  "출발하다": "출발할",
  "춥다": "추워요 추운데",
  "타다": "타고 타야 타러 타요 탈",
  "틀다": "틀어요",
  "팔다": "파는",
  "편하다": "편했어요",
  "피곤하다": "피곤했어요",
  "하다": "했는데 했어요 했지 해야 하면서 하다가 할 해봤어요",
  "행복하다": "행복해요",
  "힘들다": "힘들었지만",
  "읽다": "읽고 읽었어요",
  "쓰다": "썼어요 쓰는",
  "연습하다": "연습하고",
  "만나다": "만날 만나고 만나요",
  "간단하다": "간단한",
  "강하다": "강하고 강해서",
  "없다": "없을",
  "떠나다": "떠나요 떠나는 떠난"
};

const duplicateKoreanVlogVerbRootWords = [];
const koreanVlogVerbRoots = new Map();
Object.entries(koreanVlogVerbRootGroups).forEach(([root, words]) => {
  words.trim().split(/\s+/).forEach((word) => {
    if (koreanVlogVerbRoots.has(word)) duplicateKoreanVlogVerbRootWords.push(word);
    koreanVlogVerbRoots.set(word, root);
  });
});

function koreanVlogPartOfSpeech(word) {
  if (koreanVlogNouns.has(word)) return "noun";
  if (koreanVlogVerbs.has(word)) return "verb";
  return "other";
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
  .map(([word, count]) => {
    const pos = koreanVlogPartOfSpeech(word);
    return {
      word,
      count,
      pos,
      english: glosses[word] || "",
      root: pos === "verb" ? koreanVlogVerbRoots.get(word) : undefined,
      romanization: romanizeHangul(word),
      contextEnglish: captions[firstCaptionIndexes.get(word)]?.englishText || "",
      firstCaptionIndex: firstCaptionIndexes.get(word) || 0,
      firstTokenIndex: firstTokenIndexes.get(word) || 0
    };
  })
  .sort((a, b) => (
    b.count - a.count ||
    a.firstCaptionIndex - b.firstCaptionIndex ||
    a.word.localeCompare(b.word, "ko")
  ));

const missingGlosses = words.filter((entry) => !entry.english).map((entry) => entry.word);
if (missingGlosses.length) {
  throw new Error(`Missing Korean glosses: ${missingGlosses.join(", ")}`);
}

const sourceWords = new Set(words.map((entry) => entry.word));
const unknownTaggedWords = [...koreanVlogNouns, ...koreanVlogVerbs].filter((word) => !sourceWords.has(word));
const overlappingTaggedWords = [...koreanVlogNouns].filter((word) => koreanVlogVerbs.has(word));
const unknownRootWords = [...koreanVlogVerbRoots.keys()].filter((word) => !koreanVlogVerbs.has(word));
const missingVerbRoots = [...koreanVlogVerbs].filter((word) => sourceWords.has(word) && !koreanVlogVerbRoots.has(word));
if (
  unknownTaggedWords.length ||
  overlappingTaggedWords.length ||
  unknownRootWords.length ||
  missingVerbRoots.length ||
  duplicateKoreanVlogVerbRootWords.length
) {
  throw new Error([
    unknownTaggedWords.length && `Unknown POS words: ${unknownTaggedWords.join(", ")}`,
    overlappingTaggedWords.length && `Overlapping POS words: ${overlappingTaggedWords.join(", ")}`,
    unknownRootWords.length && `Unknown verb root words: ${unknownRootWords.join(", ")}`,
    missingVerbRoots.length && `Missing verb roots: ${missingVerbRoots.join(", ")}`,
    duplicateKoreanVlogVerbRootWords.length && `Duplicate verb root words: ${duplicateKoreanVlogVerbRootWords.join(", ")}`
  ].filter(Boolean).join("\n"));
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
