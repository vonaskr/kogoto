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

export function getWrongWeights(): Map<number, number> {
  const wrong = readJSON<number[]>(WRONG_KEY, []);
  const m = new Map<number, number>();
  for (const id of wrong) m.set(id, (m.get(id) ?? 0) + 1);
  return m;
}
