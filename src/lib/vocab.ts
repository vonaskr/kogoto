// src/lib/vocab.ts
export type PartTag =
  | "verb" | "noun" | "adj-i" | "adj-na" | "adv"
  | "adnominal" | "interj" | "particle" | "aux-verb"
  | "set-phrase" | "suffix" | "prefix" | "conj"
  | "proper-noun" | "other";

export type Vocab = {
  id: number;
  word: string;
  reading: string;
  meanings: string[];
  nuance: "pos" | "neg" | "neutral";
  part: PartTag;
  hint?: string;
};

// ---- CSV utils（簡易だがクォート対応） ----
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQ = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQ) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } // "" -> "
        else { inQ = false; }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQ = true;
      } else if (ch === ",") {
        cur.push(field); field = "";
      } else if (ch === "\n") {
        cur.push(field); field = "";
        // skip empty lines
        if (cur.some(v => v.trim().length > 0)) rows.push(cur);
        cur = [];
      } else if (ch === "\r") {
        // ignore
      } else {
        field += ch;
      }
    }
  }
  if (field.length || cur.length) { cur.push(field); rows.push(cur); }
  return rows;
}

const jpToTag: Record<string, PartTag> = {
  "動詞": "verb",
  "名詞": "noun",
  "形容詞": "adj-i",
  "形容動詞": "adj-na",
  "副詞": "adv",
  "連体詞": "adnominal",
  "感動詞": "interj",
  "助詞": "particle",
  "助動詞": "aux-verb",
  "連語": "set-phrase",
  "接尾語": "suffix",
  "接頭語": "prefix",
  "接続詞": "conj",
  "固有名詞": "proper-noun",
};

function normalizePart(input: string): PartTag {
  const s = (input || "").trim()
    .replace(/\s+/g, "")
    .replace("varb", "verb")   // typo補正
    .replace("説尾語", "接尾語"); // 誤字補正
  // 既に英語タグの場合
  const englishTags: PartTag[] = ["verb", "noun", "adj-i", "adj-na", "adv", "adnominal", "interj", "particle", "aux-verb", "set-phrase", "suffix", "prefix", "conj", "proper-noun", "other"];
  if ((englishTags as string[]).includes(s)) return s as PartTag;
  // 日本語→英語
  if (jpToTag[s]) return jpToTag[s];
  return "other";
}

function normalizeNuance(n: string): "pos" | "neg" | "neutral" {
  const s = (n || "").trim().toLowerCase();
  if (s === "pos" || s === "positive" || s === "0") return "pos";
  if (s === "neg" || s === "negative" || s === "1") return "neg";
  return "neutral";
}

function splitMeanings(raw: string): string[] {
  const s = (raw || "").trim();
  if (!s) return [];
  // 優先: パイプ分割
  if (s.includes("|") || s.includes("｜")) return s.split(/[|｜]/).map(t => t.trim()).filter(Boolean);
  // 次点: 和文の区切り
  if (/[、，・／]/.test(s)) return s.split(/[、，・／]/).map(t => t.trim()).filter(Boolean);
  // 最後にカンマ（CSV内の引用で守られている前提）
  if (s.includes(",")) return s.split(",").map(t => t.trim()).filter(Boolean);
  return [s];
}

export async function loadVocabCsv(url = "/vocab.csv"): Promise<Vocab[]> {
  const res = await fetch(url, { cache: "no-store" });
  const text = await res.text();
  const rows = parseCsv(text);

  if (!rows.length) return [];
  // ヘッダ行を検出（id,word,reading,meanings,nuance,part,hint）
  let start = 0;
  const header = rows[0].map(h => h.trim().toLowerCase());
  const looksHeader = header.includes("id") && header.includes("word");
  if (looksHeader) start = 1;

  const out: Vocab[] = [];
  for (let i = start; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length < 6) continue;
    const [id, word, reading, meanings, nuance, part, hint] = r;
    const v: Vocab = {
      id: Number(String(id).trim()),
      word: (word || "").trim(),
      reading: (reading || "").trim(),
      meanings: splitMeanings(meanings),
      nuance: normalizeNuance(nuance),
      part: normalizePart(part),
      hint: (hint || "").trim() || undefined,
    };
    if (!Number.isFinite(v.id) || !v.word) continue;
    out.push(v);
  }
  return out;
}
