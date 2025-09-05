// src/lib/question-engine.ts
import type { Vocab } from "./vocab";

export type Quiz = { id: number; word: string; correct: string; choices: string[]; answer: number };

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function makeQuestion(target: Vocab, pool: Vocab[], wrongIdsWeight?: Map<number, number>): Quiz | null {
  const samePart = pool.filter(v => v.part === target.part && v.id !== target.id);
  const fallbacks = pool.filter(v => v.part !== target.part && v.id !== target.id);

  // 重み付け（直近誤答をやや出しやすく）
  const pickWrong = (src: Vocab[], need: number): Vocab[] => {
    if (!src.length) return [];
    // 重み付け抽選
    const weighted: { v: Vocab; w: number }[] = src.map(v => ({ v, w: (wrongIdsWeight?.get(v.id) ?? 1) }));
    const out: Vocab[] = [];
    const used = new Set<number>();
    while (out.length < need && weighted.length) {
      const sum = weighted.reduce((s, x) => s + x.w, 0);
      let r = Math.random() * sum;
      let idx = 0;
      for (; idx < weighted.length; idx++) {
        r -= weighted[idx].w;
        if (r <= 0) break;
      }
      const pick = weighted[Math.min(idx, weighted.length - 1)].v;
      weighted.splice(Math.min(idx, weighted.length - 1), 1);
      if (!used.has(pick.id)) { out.push(pick); used.add(pick.id); }
    }
    return out;
  };

  let wrong = pickWrong(samePart, 3);
  if (wrong.length < 3) {
    wrong = wrong.concat(pickWrong(fallbacks, 3 - wrong.length));
  }
  wrong = wrong.slice(0, 3);

  // 正解表示は meanings[0]（第1義）。判定は meanings配列で行う前提（後で拡張可）
  const correctText = target.meanings[0] ?? "";
  if (!correctText) return null;

  const wrongTexts = wrong.map(w => w.meanings[0] ?? "").filter(Boolean);
  const choices = shuffle([correctText, ...wrongTexts]);
  const answer = choices.findIndex(c => c === correctText);
  return { id: target.id, word: target.word, correct: correctText, choices, answer };
}

export function buildQuizSet(pool: Vocab[], count: number, wrongIdsWeight?: Map<number, number>): Quiz[] {
  const chosen = shuffle(pool).slice(0, count);
  const out: Quiz[] = [];
  for (const t of chosen) {
    const q = makeQuestion(t, pool, wrongIdsWeight);
    if (q) out.push(q);
  }
  return out;
}
