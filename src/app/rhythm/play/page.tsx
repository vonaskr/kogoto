"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Container } from "@/components/layout/container";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

import { loadVocabCsv } from "@/lib/vocab";
import { buildQuizSet, type Quiz } from "@/lib/question-engine";
import { useMetronome } from "@/lib/use-metronome";
import { speak } from "@/lib/tts";
import { sfx } from "@/lib/sfx";
import { startVoice, stopVoice, voiceSupported } from "@/lib/voice";
import { timingGrade, contentMatch, normalizeJa } from "@/lib/judge";
import { getLatencyOffset, calibrateOnce } from "@/lib/latency";
import { saveSession, type SessionItem, getWrongWeights } from "@/lib/store";

const QUIZ_COUNT = 5;
const DEFAULT_BPM = 90;

type Phase = "ready" | "prompt" | "choices" | "judge" | "interlude";

export default function RhythmPlay() {
  const router = useRouter();
  const sp = useSearchParams();

  const reviewMode = (sp.get("mode") === "review");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [qs, setQs] = useState<Quiz[]>([]);
  const [idx, setIdx] = useState(0);

  const [phase, setPhase] = useState<Phase>("ready");
  const [selected, setSelected] = useState<number | null>(null);
  const itemsRef = useRef<SessionItem[]>([]);
  const startedAtRef = useRef<number>(Date.now());

  const [correct, setCorrect] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const justStartedRef = useRef(false);

  const barBeatRef = useRef(0);              // 1..8 管理
  const judgedThisCycleRef = useRef(false);  // 二重判定防止
  const answerCenterAtRef = useRef<number>(0); // 声判定の中心時刻(ms)
  const latencyRef = useRef<number>(0);
  const [micOn, setMicOn] = useState(false);
  const [lastHeard, setLastHeard] = useState<string>("");
  const [debugRhythm, setDebugRhythm] = useState(false);
  const [lastDeltaMs, setLastDeltaMs] = useState<number | null>(null);
  const [lastGrade, setLastGrade] = useState<'perfect'|'great'|'good'|'miss'|null>(null);
  const [centerAtMs, setCenterAtMs] = useState<number | null>(null);

  // 辞書ロードと問題生成
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const vocab = await loadVocabCsv("/vocab.csv");
        if (!vocab.length) throw new Error("辞書が空です");
        const weight = getWrongWeights(); // ★ 直近誤答の重み
        const quiz = buildQuizSet(vocab, QUIZ_COUNT, weight, { reviewOnly: reviewMode });
        if (!quiz.length) {
          if (reviewMode) {
            throw new Error("復習対象がありません（誤答履歴が空です）");
          } else {
            throw new Error("問題が生成できませんでした");
          }
        } else {
          setQs(quiz);
          setIdx(0);
          setPhase("ready");
          setErr(null);
        }
      } catch (e: any) {
        setErr(e?.message ?? "読み込みに失敗しました");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const q = qs[idx];
  const progress = qs.length ? (idx / qs.length) * 100 : 0;

  // 判定処理（即時 or 自動）
  const judgeNow = (ok: boolean) => {
    if (!q || judgedThisCycleRef.current) return;
    setPhase("judge");
    judgedThisCycleRef.current = true;

    ok ? sfx.ok() : sfx.ng();

    setCorrect((x) => x + (ok ? 1 : 0));
    setStreak((s) => {
      const ns = ok ? s + 1 : 0;
      setMaxStreak((m: number) => Math.max(m, ns));
      return ns;
    });

    const chosenText = selected != null ? q.choices[selected] : null;
    itemsRef.current.push({
      vocabId: q.id,
      word: q.word,
      correctText: q.choices[q.answer],
      chosenText,
      correct: ok,
    });

    // 演出を見せてから次へ
    setTimeout(() => {
      if (idx + 1 < qs.length) {
        setIdx((i) => i + 1);
        setPhase("interlude");
        barBeatRef.current = 0;
        setSelected(null);
      } else {
        // 全問終了
        const total = qs.length;
        const nextStreakLocal = ok ? Math.max(maxStreak, streak + 1) : maxStreak;
        const nextCorrectLocal = ok ? correct + 1 : correct;
        stop();
        const wrongIds = itemsRef.current.filter((it) => !it.correct).map((it) => it.vocabId);
        saveSession({
          id: String(Date.now()),
          startedAt: startedAtRef.current,
          items: itemsRef.current,
          correctRate: total ? nextCorrectLocal / total : 0,
          comboMax: nextStreakLocal,
          earnedPoints: nextCorrectLocal * 10 + nextStreakLocal * 2,
          wrongIds,
        });
        itemsRef.current = [];
        startedAtRef.current = Date.now();
        const p = new URLSearchParams({
          total: String(total),
          correct: String(nextCorrectLocal),
          streak: String(nextStreakLocal),
        });
        router.push(`/rhythm/result?${p.toString()}`);
      }
    }, 380);
  };

  // 音声結果ハンドラ：タイミング(±ms)＋内容一致 → judgeNow()
  const onVoice = (spoken: { normalized: string; confidence: number; at: number }) => {
    if (!q || phase !== "choices" || judgedThisCycleRef.current) return;
    // 低信頼は無視（緩め）
    if (spoken.confidence < 0.5) return;
    setLastHeard(spoken.normalized);
    // 内容一致
    const { matchedIndex } = contentMatch(spoken.normalized, q.choices, 'choices');
    if (matchedIndex == null) return;
    setSelected(matchedIndex);
    // タイミング
    const delta = (spoken.at + latencyRef.current) - answerCenterAtRef.current; // ms
    const g = timingGrade(delta);
    setLastDeltaMs(Math.round(delta));
    setLastGrade(g);
    const ok = (matchedIndex === q.answer) && g !== 'miss';
    sfx.click();
    judgeNow(ok);
  };

  // メトロノーム
  const { bpm, isRunning, start, stop } = useMetronome(DEFAULT_BPM, (beat /*1..4*/) => {
    if (!q) return;
    barBeatRef.current = ((barBeatRef.current % 8) + 1);
    const b = barBeatRef.current;

    if (b === 1) {
      setPhase("prompt");
      judgedThisCycleRef.current = false;
      if (justStartedRef.current) {
        justStartedRef.current = false;
      } else {
        speak(q.word, { lang: "ja-JP", rate: 0.95 });
      }
      sfx.click();
    }

    if (b === 2 || b === 3) {
      sfx.click();
    }

    if (b === 4) {
      setPhase("choices");
      sfx.click();
      // 回答受付ウィンドウの中心時刻（b=4から半拍後）を記録
      const beatMs = 60000 / bpm;
      answerCenterAtRef.current = performance.now() + beatMs * 0.5;
      setCenterAtMs(Math.round(answerCenterAtRef.current));
      // 新しい小問に入ったので、直前の判定可視化をリセット
      setLastDeltaMs(null);
      setLastGrade(null);
    }

    if (b === 8 && !judgedThisCycleRef.current) {
      judgeNow(false); // 未回答は×
    }
  });

  useEffect(() => {
      return () => {
      stop();
      stopVoice();
      // アンマウント時なので setMicOn は必須ではないが、開発時のホットリロード対策として明示
      try { setMicOn(false); } catch {}
    };
  }, [stop]);
  // デバッグ表示トグル: localStorage.kogoto:debugRhythm === "1" でON
  useEffect(() => {
    try {
      const v = localStorage.getItem("kogoto:debugRhythm");
      setDebugRhythm(v === "1");
    } catch {}
  }, []);

  const startPlay = async () => {
    if (!q) return;
        // 一度だけ遅延オフセットを確保（将来：手拍子校正に差し替え）
    if (!latencyRef.current) latencyRef.current = getLatencyOffset() || (await calibrateOnce(120));
     await start();
    // 音声有効なら起動（常にタップは併用可）
    if (voiceSupported() && !micOn) {
      const ok = startVoice({
        lang: 'ja-JP',
        onResult: (r) => onVoice({ normalized: r.normalized, confidence: r.confidence, at: r.at }),
      });
      if (ok) setMicOn(true);
    }
    await start();
    speak(q.word, { lang: "ja-JP", rate: 0.95 });
    justStartedRef.current = true;
    setPhase("prompt");
    barBeatRef.current = 0;
  };

  const canAnswer = phase === "choices" && isRunning;

  return (
    <Container>
      <Card>
        <CardContent className="p-6 md:p-8">
          {loading && <div className="opacity-70">辞書を読み込んでいます…</div>}
          {err && <div className="text-red-600 font-semibold">Error: {err}</div>}

          {!loading && !err && q && (
            <>
              <div className="flex items-center justify-between mb-4">
                <div className="font-semibold">
                  リズム学習：{idx + 1} / {qs.length}
                </div>
                  <div className="text-sm opacity-70 flex items-center gap-3">
                  <span>BPM: {bpm} ／ COMBO: {streak}</span>
                  <span className="px-2 py-0.5 rounded border border-[var(--border-strong)] bg-[var(--card)]">
                    マイク: {voiceSupported() ? (micOn ? "ON" : "OFF") : "未対応"}
                  </span>
                </div>
              </div>
              <Progress value={progress} className="mb-6" />

              <div className="flex gap-2 mb-4">
                {!isRunning ? (
                  <Button onClick={startPlay} disabled={!!err}>
                    {reviewMode ? "復習スタート" : "スタート"}
                  </Button>
                ) : (
                  <Button
                    variant="accent"
                    onClick={() => {
                      stop();
                      stopVoice();
                      setMicOn(false);
                    }}
                  >
                    ストップ
                  </Button>
                )}
              </div>

              <div className="text-2xl font-extrabold mb-2">「{q.word}」の現代語は？</div>
              <div className="text-sm opacity-70 mb-4">
                {phase === "prompt" && "提示中…（拍1）"}
                {phase === "choices" && "選択肢をタップ！or 声で「1/2/3/4」や意味キーワード！"}
                {phase === "judge" && "判定中！"}
                {phase === "ready" && (reviewMode ? "復習対象から出題します" : "スタートを押してね")}
              </div>
              {lastHeard && (
                <div className="text-xs opacity-60 mb-2">
                  音声: {lastHeard}
                </div>
              )}
              {debugRhythm && (
                <div className="text-xs mb-3 px-2 py-1 inline-flex gap-3 rounded border border-[var(--border-strong)] bg-[var(--card)]">
                  <span>判定センター(ms): {centerAtMs ?? "—"}</span>
                  <span>Δ(ms): {lastDeltaMs ?? "—"}</span>
                  <span>GRADE: {lastGrade ?? "—"}</span>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {q.choices.map((txt, idxChoice) => (
                  <Button
                    key={idxChoice}
                    variant="surface"
                    size="lg"
                    disabled={!canAnswer}
                    onClick={() => {
                      if (!canAnswer) return;
                      setSelected(idxChoice);
                      sfx.click();
                      judgeNow(idxChoice === q.answer);
                    }}
                    className={
                      phase === "judge"
                        ? idxChoice === q.answer
                          ? "bg-green-300"
                          : selected === idxChoice
                          ? "bg-red-300"
                          : "opacity-70"
                        : selected === idxChoice
                        ? "outline outline-4"
                        : ""
                    }
                  >
                    {txt}
                  </Button>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </Container>
  );
}
