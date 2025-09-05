"use client";

export type SessionItem = {
  vocabId: number;
  word: string;
  correctText: string;
  chosenText: string | null;
  correct: boolean;
};

export type SessionResult = {
  id: string;              // e.g., `${Date.now()}`
  startedAt: number;
  items: SessionItem[];
  correctRate: number;     // 0..1
  comboMax: number;
  earnedPoints: number;
  wrongIds: number[];
};

const SESSIONS_KEY = "kogoto:sessions";
const WRONG_KEY = "kogoto:wrongQueue";

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
function writeJSON<T>(key: string, val: T) {
  localStorage.setItem(key, JSON.stringify(val));
}

export function saveSession(res: SessionResult) {
  const arr = readJSON<SessionResult[]>(SESSIONS_KEY, []);
  arr.push(res);
  // サイズ制限（直近50件）
  while (arr.length > 50) arr.shift();
  writeJSON(SESSIONS_KEY, arr);

  // 直近誤答キュー更新（重複は許容、サイズは100まで）
  const wrong = readJSON<number[]>(WRONG_KEY, []);
  const merged = [...wrong, ...res.wrongIds];
  const tail = merged.slice(-100);
  writeJSON(WRONG_KEY, tail);
}

export function getLatestSession(): SessionResult | null {
  const arr = readJSON<SessionResult[]>(SESSIONS_KEY, []);
  return arr.length ? arr[arr.length - 1] : null;
}

// 直近が×の語だけを復習対象として重み付け
// （※ 過去の誤答はカウントするが、直近が○に戻った語は除外）
export function getWrongWeights(): Map<number, number> {
  const sessions = getAllSessions();
  const wrongCount = new Map<number, number>();
  const last = new Map<number, boolean>();
  for (const s of sessions) {
    for (const it of s.items) {
      if (!it.correct) wrongCount.set(it.vocabId, (wrongCount.get(it.vocabId) ?? 0) + 1);
      last.set(it.vocabId, it.correct);
    }
  }
  // 直近が正解の語は復習対象から外す
  for (const [id, ok] of last) {
    if (ok) wrongCount.delete(id);
  }
  return wrongCount;
}
export function getAllSessions(): SessionResult[] {
  // "use client" 前提だが、SSR 経由で呼ばれても安全に
  if (typeof window === "undefined") return [];
  return readJSON<SessionResult[]>(SESSIONS_KEY, []);
}

// 最後に回答した結果（vocabId -> 最終が正解なら true、誤答なら false）
export function getLastOutcomeMap(): Map<number, boolean> {
  const last = new Map<number, boolean>();
  for (const s of getAllSessions()) {
    for (const it of s.items) {
      last.set(it.vocabId, it.correct);
    }
  }
  return last;
}

// 一度でも出題された語集合
export function getSeenSet(): Set<number> {
  const seen = new Set<number>();
  for (const s of getAllSessions()) {
    for (const it of s.items) seen.add(it.vocabId);
  }
  return seen;
}

// 語ごとの統計（seen/correct/wrong/acc）
export function getStatsMap(): Map<number, { seen: number; correct: number; wrong: number; acc: number }> {
  const map = new Map<number, { seen: number; correct: number; wrong: number; acc: number }>();
  for (const s of getAllSessions()) {
    for (const it of s.items) {
      const cur = map.get(it.vocabId) ?? { seen: 0, correct: 0, wrong: 0, acc: 0 };
      cur.seen += 1;
      if (it.correct) cur.correct += 1; else cur.wrong += 1;
      map.set(it.vocabId, cur);
    }
  }
  // acc（正答率）を後計算
  for (const [id, v] of map) v.acc = v.seen > 0 ? v.correct / v.seen : 0;
  return map;
}

// 学習記録をすべてクリア（未出題へ）
export function clearAllProgress() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSIONS_KEY);
  localStorage.removeItem(WRONG_KEY);
}