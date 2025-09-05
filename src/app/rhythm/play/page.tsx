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

  // 辞書ロードと問題生成
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const vocab = await loadVocabCsv("/vocab.csv");
        if (!vocab.length) throw new Error("辞書が空です");
        const weight = getWrongWeights(); // ★ 直近誤答の重み
        const quiz = buildQuizSet(vocab, QUIZ_COUNT, weight, { reviewOnly: reviewMode });
        if (reviewMode) {
            throw new Error("復習対象がありません（誤答履歴が空です）");
          } else {
            throw new Error("問題が生成できませんでした");
          }
        setQs(quiz);
        setIdx(0);
        setPhase("ready");
        setErr(null);
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
    }

    if (b === 8 && !judgedThisCycleRef.current) {
      judgeNow(false); // 未回答は×
    }
  });

  useEffect(() => {
    return () => stop();
  }, [stop]);

  const startPlay = async () => {
    if (!q) return;
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
                <div className="text-sm opacity-70">
                  BPM: {bpm} ／ COMBO: {streak}
                </div>
              </div>
              <Progress value={progress} className="mb-6" />

              <div className="flex gap-2 mb-4">
                {!isRunning ? (
                  <Button onClick={startPlay} disabled={!!err}>
                    {reviewMode ? "復習スタート" : "スタート"}
                  </Button>
                ) : (
                  <Button variant="accent" onClick={stop}>
                    ストップ
                  </Button>
                )}
              </div>

              <div className="text-2xl font-extrabold mb-2">「{q.word}」の現代語は？</div>
              <div className="text-sm opacity-70 mb-4">
                {phase === "prompt" && "提示中…（拍1）"}
                {phase === "choices" && "選択肢をタップ！（拍4〜）"}
                {phase === "judge" && "判定中！"}
                {phase === "ready" && (reviewMode ? "復習対象から出題します" : "スタートを押してね")}
              </div>

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
