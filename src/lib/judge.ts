// 二軸判定：タイミング＆内容一致
export type Grade = 'perfect'|'great'|'good'|'miss';

export function timingGrade(deltaMs: number): Grade {
  const a = Math.abs(deltaMs);
  if (a <= 80) return 'perfect';
  if (a <= 160) return 'great';
  if (a <= 240) return 'good';
  return 'miss';
}

export function score(g: Grade, matched: boolean): number {
  if (!matched || g === 'miss') return 0;
  return g === 'perfect' ? 100 : g === 'great' ? 80 : 50;
}

// ひらがな/カタカナ/全角半角などをゆるく正規化（日本語向け最小版）
export function normalizeJa(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[ぁ-ん]/g, ch => String.fromCharCode(ch.charCodeAt(0) + 0x60)) // かな→カナ
    .replace(/[ー―−‐]/g,'-')
    .replace(/[！-～]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0)) // 全角英数記号→半角
    .replace(/[\s、。・.,/\\|_*+~^$()[\]{}"'`!?@#:;<>-]/g,''); // 記号/空白除去
}

const NUM_MAP: Record<string, string[]> = {
  '0': ['0','zero','ぜろ','れい'],
  '1': ['1','a','いち','ひと','one'],
  '2': ['2','b','に','two','ふた'],
  '3': ['3','c','さん','three','みっ'],
  '4': ['4','d','よん','し','four','よっ'],
};

export type ContentMatchMode = 'choices'|'binary';

export function contentMatch(
  spokenNorm: string,
  choiceTexts: string[],
  mode: ContentMatchMode = 'choices'
): { matchedIndex?: number; confidence: number } {
  // 1) 数字/ABC での選択（常に許可）
  for (const [idxStr, keys] of Object.entries(NUM_MAP)) {
    const idx = Number(idxStr) - 1;
    if (!Number.isFinite(idx) || idx < 0 || idx >= choiceTexts.length) continue;
    for (const k of keys) {
      if (spokenNorm.includes(normalizeJa(k))) {
        return { matchedIndex: idx, confidence: 0.9 };
      }
    }
  }

  if (mode === 'binary') {
    // （今後の二択用に拡張スペース）
    // 例：'はい/いいえ' '○/×' 'ポジ/ネガ' のマッピング
  }

  // 2) キーワード（意味の先頭語を優先、部分一致OK）
  const norms = choiceTexts.map(t => normalizeJa(t));
  for (let i = 0; i < norms.length; i++) {
    const n = norms[i];
    if (!n) continue;
    if (spokenNorm.includes(n) || n.includes(spokenNorm)) {
      return { matchedIndex: i, confidence: Math.min(0.85, spokenNorm.length / (n.length + 1)) };
    }
  }
  return { confidence: 0.0 };
}
