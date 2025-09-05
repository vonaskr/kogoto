// src/lib/question-engine.ts
import type { Vocab } from "./vocab";

export type Quiz = { id: number; word: string; choices: string[]; answer: number };

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


export function buildQuizSet(
  vocab: Vocab[],
  count: number,
  weight: Map<number, number> = new Map(),
  opts?: { reviewOnly?: boolean }
) {
  // 1) 候補プールの作成
  let pool = vocab.slice();
  if (opts?.reviewOnly) {
    const wrongIds = new Set([...weight.keys()]);
    pool = pool.filter(v => wrongIds.has(v.id));
  }
  if (!pool.length) return [];

  // 2) 重み（誤答が多いほど選ばれやすい）: base=1, w=1+alpha*count
  const alpha = 2.0;
  const weighted = pool.map(v => {
    const w = 1 + alpha * (weight.get(v.id) ?? 0);
    return { v, w };
  });
  const pickWeighted = () => {
    const total = weighted.reduce((s, x) => s + x.w, 0);
    let r = Math.random() * total;
    for (const x of weighted) {
      if ((r -= x.w) <= 0) return x.v;
    }
    return weighted[weighted.length - 1].v;
  };

  const seen = new Set<number>();
  const picked: Vocab[] = [];
  while (picked.length < count && seen.size < weighted.length) {
    const v = pickWeighted();
    if (seen.has(v.id)) continue;
    seen.add(v.id);
    picked.push(v);
  }

  // 3) 4択生成（同品詞から 1 正解 + 3 誤選択）
  const byPos = new Map<string, Vocab[]>();
  for (const v of vocab) {
    if (!byPos.has(v.part)) byPos.set(v.part, []);
    byPos.get(v.part)!.push(v);
  }
  const makeChoices = (v: Vocab) => {
    const bank = (byPos.get(v.part) ?? vocab).filter(x => x.id !== v.id);
    const wrongs = shuffle(bank).slice(0, 3).map(x => x.meanings[0]);
    const correct = v.meanings[0];
    const arr = shuffle([correct, ...wrongs]);
    const answer = arr.indexOf(correct);
    return { choices: arr, answer };
  };

  return picked.map(v => {
    const { choices, answer } = makeChoices(v);
    return { id: v.id, word: v.word, choices, answer };
  });
}

function shuffle<T>(a: T[]): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

