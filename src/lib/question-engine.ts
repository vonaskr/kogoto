// src/lib/question-engine.ts
// 出題セットのビルダー（通常・復習モード対応）
// - meanings が空/無効な語は除外
// - 直近誤答の weight に基づく重み付き抽選
// - 同品詞優先で誤選択肢を生成し、足りない場合は全体から補完
// - 常に 4択（1正解 + 3誤選択）を保証
// - choiceReadings には CSV の mean_reading（ひらがな）を格納する

import type { Vocab } from "./vocab"; // loadVocabCsv が返す型に合わせる想定

export type Quiz = {
  id: number;
  word: string;
  choices: string[];
  answer: number;           // choices の index
  choiceReadings: string[]; // choices と同じ順序で、各選択肢の「ひらがな読み」（ない場合は ""）
};

type BuildOpts = {
  /** 復習モード：誤答IDのみから出題 */
  reviewOnly?: boolean;
};

/** Vocab から mean_reading を取り出す（CSV 由来の拡張列） */
function readingOf(v: Vocab | undefined): string {
  return v ? String((v as unknown as { mean_reading?: string }).mean_reading ?? "").trim() : "";
}

/**
 * クイズの出題セットを構築
 * @param vocab 語彙全体
 * @param count 問題数
 * @param weight 誤答回数などの重み（vocabId -> count）
 * @param opts { reviewOnly } 復習モードで誤答集合のみから出す
 */
export function buildQuizSet(
  vocab: Vocab[],
  count: number,
  weight: Map<number, number> = new Map(),
  opts?: BuildOpts
): Quiz[] {
  // --- 0) サニタイズ：meaning の無い語を除外 ---
  const valid: Vocab[] = vocab.filter(
    (v) =>
      Array.isArray(v.meanings) &&
      v.meanings.length > 0 &&
      String(v.meanings[0] ?? "").trim() !== ""
  );
  if (!valid.length) {
    if (typeof window !== "undefined") {
      console.warn("[quiz] no valid vocab after sanitize");
    }
    return [];
  }

  // --- 1) 候補プール作成（復習のみなら誤答IDから） ---
  let pool: Vocab[] = valid.slice();
  if (opts?.reviewOnly) {
    const wrongIds = new Set<number>([...weight.keys()]);
    pool = pool.filter((v) => wrongIds.has(v.id));
    if (!pool.length) {
      if (typeof window !== "undefined") {
        console.info("[quiz] reviewOnly requested but no wrongIds pool");
      }
      return []; // 復習対象なし（呼び出し側で文言表示）
    }
  }

  // --- 2) 重みづけ（誤答回数に比例） ---
  const alpha = 2.0; // 誤答 1 回につき base+2 の重み
  const weighted = pool.map((v) => ({
    v,
    w: 1 + alpha * (weight.get(v.id) ?? 0),
  }));

  const pickWeighted = (): Vocab => {
    const total = weighted.reduce((s, x) => s + x.w, 0);
    if (total <= 0) {
      // フォールバック：単純ランダム
      return weighted[(Math.random() * weighted.length) | 0].v;
    }
    let r = Math.random() * total;
    for (const x of weighted) {
      r -= x.w;
      if (r <= 0) return x.v;
    }
    return weighted[weighted.length - 1].v;
  };

  // --- 3) ユニーク選抜（不足時は pool 長に合わせる） ---
  const seen = new Set<number>();
  const need = Math.min(count, Math.max(1, weighted.length));
  const picked: Vocab[] = [];
  let guard = 0;
  while (picked.length < need && guard++ < weighted.length * 3) {
    const v = pickWeighted();
    if (seen.has(v.id)) continue;
    seen.add(v.id);
    picked.push(v);
  }
  // どうしても picked が空なら、valid から先頭をフォールバック
  if (!picked.length) {
    picked.push(valid[0]);
  }

  // --- 4) 4択生成（同品詞優先 → 全体フォールバックで必ず4択に） ---
  const byPos = new Map<string, Vocab[]>();
  for (const v of valid) {
    if (!byPos.has(v.part)) byPos.set(v.part, []);
    byPos.get(v.part)!.push(v);
  }

  // 全体の意味（重複排除）
  const allMeanings: string[] = Array.from(
    new Set(
      valid
        .flatMap((x) => x.meanings)
        .map((m) => String(m).trim())
        .filter(Boolean)
    )
  );

  /** 1問ぶんの選択肢を生成 */
  function makeChoices(v: Vocab): { choices: string[]; choiceReadings: string[]; answer: number } {
    const correctLabel = String(v.meanings[0]).trim();
    const correctReading = readingOf(v);

    const used = new Set<string>([correctLabel]);
    const wrongLabels: string[] = [];
    const wrongReadings: string[] = [];

    const samePos = (byPos.get(v.part) ?? []).filter((x) => x.id !== v.id);

    const addFromVocabs = (arr: Vocab[]): void => {
      for (const cand of shuffle(arr)) {
        const m = String(cand.meanings[0] ?? "").trim();
        if (!m || used.has(m)) continue;
        wrongLabels.push(m);
        wrongReadings.push(readingOf(cand)); // ここで mean_reading を拾う
        used.add(m);
        if (wrongLabels.length >= 3) break;
      }
    };

    const addFromMeanings = (arr: string[]): void => {
      for (const m of shuffle(arr)) {
        const mm = String(m).trim();
        if (!mm || used.has(mm)) continue;
        wrongLabels.push(mm);
        wrongReadings.push(""); // meanings だけから補完した場合は読み不明
        used.add(mm);
        if (wrongLabels.length >= 3) break;
      }
    };

    // まず同品詞から埋める
    addFromVocabs(samePos);
    // 足りなければ全体の語彙から
    if (wrongLabels.length < 3) addFromVocabs(valid.filter((x) => x.id !== v.id));
    // まだ足りなければ全体の意味集合から
    if (wrongLabels.length < 3) addFromMeanings(allMeanings);
    // それでも足りない場合の最後の安全装置
    while (wrongLabels.length < 3) {
      wrongLabels.push("（なし）");
      wrongReadings.push("");
    }

    // choices / choiceReadings を同じ乱数順で並べるため、ペアでシャッフル
    const paired: Array<{ label: string; reading: string; isCorrect: boolean }> = [
      { label: correctLabel, reading: correctReading, isCorrect: true },
      ...wrongLabels.map((w, i) => ({ label: w, reading: wrongReadings[i] ?? "", isCorrect: false })),
    ];

    shuffle(paired);

    const choices: string[] = paired.map((p) => p.label);
    const choiceReadings: string[] = paired.map((p) => p.reading);
    const answer: number = paired.findIndex((p) => p.isCorrect);

    return { choices, choiceReadings, answer };
  }

  const quiz: Quiz[] = picked.map((target: Vocab): Quiz => {
    const { choices, choiceReadings, answer } = makeChoices(target);
    return { id: target.id, word: target.word, choices, answer, choiceReadings };
  });

  if (typeof window !== "undefined") {
    console.info(
      `[quiz] built: picked=${picked.length}, need=${need}, pool=${pool.length}, valid=${valid.length}`
    );
    // コンソールデバッグ：各問の choices を確認（必要なときだけ一時的に）
    quiz.forEach((q: Quiz, i: number) => {
      if (q.choices.includes("（なし）")) {
        console.warn(`[quiz] q${i + 1} has fallback "（なし）":`, q.word, q.choices);
      }
    });
  }
  return quiz;
}

// --- Utils ---
function shuffle<T>(a: T[]): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
