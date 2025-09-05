// src/lib/vocab.ts
// CSV を読み込んで Vocab[] に正規化するユーティリティ（ブラウザ側）
// - meanings を必ず string[] 化（,，、 で分割）
// - part を英語ラベルへ正規化（日本語→英語、タイプミス修正）
// - nuance を pos|neg|neutral に正規化
// - 余分な空白/全角空白/BOM を除去
//
// 期待CSVヘッダ：id,word,reading,meanings,nuance,part,hint

export type Nuance = "pos" | "neg" | "neutral";

export type Vocab = {
  id: number;
  word: string;
  reading: string;
  meanings: string[];         // 正規化後は必ず配列
  nuance: Nuance;
  part: string;               // 正規化後の英語ラベル（verb/noun/adj/adv/interj/conj/particle/phrase/suffix/prefix/determiner/aux/other…）
  hint?: string | null;
};

const SEP_REGEX = /[,\uFF0C\u3001]/; // , ， 、

// CSV一行をクォート対応で分解
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let i = 0;
  let inQuotes = false;

  while (i < line.length) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          // 連続ダブルクォートはエスケープ
          cur += '"';
          i += 2;
          continue;
        } else {
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        cur += ch;
        i++;
        continue;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
        continue;
      }
      if (ch === ",") {
        out.push(cur);
        cur = "";
        i++;
        continue;
      }
      cur += ch;
      i++;
    }
  }
  out.push(cur);
  return out;
}

function trimAll(s: string | null | undefined): string {
  if (!s) return "";
  // 全角空白も削る
  return s.replace(/^\uFEFF/, "").replace(/[\s\u3000]+$/g, "").replace(/^[\s\u3000]+/g, "");
}

// part 正規化（日本語→英語、表記ゆれ吸収）
function normalizePart(raw: string): string {
  const s = trimAll(raw).toLowerCase();

  // タイプミス補正
  if (s === "varb") return "verb";

  // 日本語系
  const jpMap: Record<string, string> = {
    "動詞": "verb",
    "名詞": "noun",
    "形容詞": "adj",
    "副詞": "adv",
    "形容動詞": "adj-na",
    "連語": "phrase",
    "連体詞": "determiner",
    "感動詞": "interj",
    "接続詞": "conj",
    "助詞": "particle",
    "助動詞": "aux",
    "接尾語": "suffix",
    "接頭語": "prefix",
    // 誤記ゆれ（CSVにあった「説尾語」は接尾語の誤りと解釈）
    "説尾語": "suffix",
  };
  if (jpMap[raw]) return jpMap[raw];

  // 英語/ラテン略の受け入れ
  const table: Record<string, string> = {
    verb: "verb",
    v: "verb",
    noun: "noun",
    n: "noun",
    adj: "adj",
    adjective: "adj",
    adv: "adv",
    adverb: "adv",
    "adj-na": "adj-na",
    determiner: "determiner",
    interj: "interj",
    interjection: "interj",
    conj: "conj",
    conjunction: "conj",
    particle: "particle",
    aux: "aux",
    auxiliary: "aux",
    phrase: "phrase",
    suffix: "suffix",
    prefix: "prefix",
    other: "other",
  };
  return table[s] ?? "other";
}

function normalizeNuance(raw: string): Nuance {
  const s = trimAll(raw).toLowerCase();
  if (s === "pos" || s === "positive" || s === "ポジ" || s === "ポジティブ") return "pos";
  if (s === "neg" || s === "negative" || s === "ネガ" || s === "ネガティブ") return "neg";
  return "neutral";
}

/**
 * meanings列を配列に（, ， 、 で分割）し、空要素を除去
 */
function splitMeanings(raw: string): string[] {
  const t = trimAll(raw);
  if (!t) return [];
  return t
    .split(SEP_REGEX)
    .map((x) => trimAll(x))
    .filter((x) => x.length > 0);
}

export async function loadVocabCsv(path: string): Promise<Vocab[]> {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`CSVの取得に失敗: ${res.status}`);

  const text = await res.text();
  const lines = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((l) => trimAll(l).length > 0);

  if (lines.length <= 1) return [];

  // ヘッダ
  const header = parseCsvLine(lines[0]).map((h) => trimAll(h).toLowerCase());
  // 必須列のインデックス
  const col = (name: string) => header.indexOf(name);
  const idxId = col("id");
  const idxWord = col("word");
  const idxReading = col("reading");
  const idxMeanings = col("meanings");
  const idxNuance = col("nuance");
  const idxPart = col("part");
  const idxHint = col("hint");

  const out: Vocab[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = parseCsvLine(lines[i]);
    const get = (idx: number) => (idx >= 0 && idx < row.length ? row[idx] : "");

    const idStr = trimAll(get(idxId));
    const id = Number(idStr);
    if (!Number.isFinite(id)) continue;

    const word = trimAll(get(idxWord));
    const reading = trimAll(get(idxReading));
    const meaningsArr = splitMeanings(get(idxMeanings));
    const nuance = normalizeNuance(get(idxNuance));
    const part = normalizePart(get(idxPart));
    const hintRaw = trimAll(get(idxHint));
    const hint = hintRaw ? hintRaw : null;

    out.push({
      id,
      word,
      reading,
      meanings: meaningsArr,
      nuance,
      part,
      hint,
    });
  }

  // 開発支援：コンソールに件数を出す（本番でも害はない）
  if (typeof window !== "undefined") {
    const emptyMeanings = out.filter((v) => v.meanings.length === 0).length;
    console.info(
      `[vocab] loaded=${out.length}, emptyMeanings=${emptyMeanings}, parts=${Array.from(
        new Set(out.map((v) => v.part))
      ).join(", ")}`
    );
  }

  return out;
}
