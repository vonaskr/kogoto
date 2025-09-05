"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Container } from "@/components/layout/container";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

import { loadVocabCsv } from "@/lib/vocab";
import { buildQuizSet, type Quiz } from "@/lib/question-engine";
import { useMetronome } from "@/lib/use-metronome";
import { speak } from "@/lib/tts";
import { sfx } from "@/lib/sfx";
import { saveSession, type SessionItem } from "@/lib/store";

const QUIZ_COUNT = 5;
const DEFAULT_BPM = 90;

// フェーズ：拍に同期
type Phase = "ready" | "prompt" | "choices" | "judge" | "interlude";

export default function RhythmPlay() {
  const router = useRouter();

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

  
  // 準備：辞書→問題生成
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const vocab = await loadVocabCsv("/vocab.csv");
        if (!vocab.length) throw new Error("辞書が空です");
        const weight = new Map<number, number>(); // 直近誤答の重み（後で注入）
        const quiz = buildQuizSet(vocab, QUIZ_COUNT, weight);
        if (!quiz.length) throw new Error("問題が生成できませんでした");
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

  // メトロノーム（BPM変更可能）
  const { bpm, setBpm, isRunning, start, stop } = useMetronome(DEFAULT_BPM, (beat /*1..4*/, time) => {
    // 1問 = 2小節（8拍）。ここでは 1小節ぶんだけ管理し、後段で interlude を使って2小節目に遷移。
    // 拍割り：
    //  - 1拍目：Prompt（単語提示＋TTS）
    //  - 3拍目：Choices（4択表示）
    //  - 4拍目：Judge（締切・自動判定）
    //  - 2小節目は Interlude（遷移演出用、ここでは即時で次問へ）
    if (!q) return;

    if (beat === 1) {
      setPhase("prompt");
      // TTSは少し前倒しで呼ぶ（Transport時間は使わず簡易でOK）
      speak(q.word, { lang: "ja-JP", rate: 0.95 });
      sfx.click();
    }
    if (beat === 3) {
      setPhase("choices");
      sfx.click();
    }
    if (beat === 4) {
      // 自動判定（未選択は×）
      setPhase("judge");
      const ok = selected != null && selected === q.answer;
      // SFX
      ok ? sfx.ok() : sfx.ng();
      setCorrect((x) => x + (ok ? 1 : 0));
      setStreak((s) => {
        const ns = ok ? s + 1 : 0;
        setMaxStreak((m) => Math.max(m, ns));
        return ns;
      });
      // セッションアイテム記録
      const chosenText = selected != null ? q.choices[selected] : null;
      itemsRef.current.push({
        vocabId: q.id,
        word: q.word,
        correctText: q.choices[q.answer],
        chosenText,
        correct: ok,
      });
      setSelected(null);
      // ここで次問へ（簡易：インターバル無しで遷移）
      setTimeout(() => {
        if (idx + 1 < qs.length) {
          setIdx((i) => i + 1);
          setPhase("prompt"); // 次拍で上書きされるが初期化
        } else {
          // 終了
          const total = qs.length;
          const nextStreak = ok ? Math.max(maxStreak, streak + 1) : maxStreak;
          const nextCorrect = ok ? correct + 1 : correct;
          stop();
          // セッション保存
          const wrongIds = itemsRef.current.filter(it => !it.correct).map(it => it.vocabId);
          const result = {
            id: String(Date.now()),
            startedAt: startedAtRef.current,
            items: itemsRef.current,
            correctRate: total ? nextCorrect / total : 0,
            comboMax: nextStreak,
            earnedPoints: nextCorrect * 10 + nextStreak * 2, // 仮ポイントロジック
            wrongIds,
          };
          saveSession(result);
          itemsRef.current = [];
          startedAtRef.current = Date.now();
          const p = new URLSearchParams({
            total: String(total),
            correct: String(nextCorrect),
            streak: String(nextStreak),
          });
          router.push(`/rhythm/result?${p.toString()}`);
        }
      }, 60); // 軽い遅延でUIのjudge描画を許可
    }
  });

  // 画面離脱時に必ず停止
  useEffect(() => {
    return () => stop();
  }, [stop]);

  const startPlay = async () => {
    if (!q) return;
    await start();
    setPhase("prompt");
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
                <div className="font-semibold">リズム学習：{idx + 1} / {qs.length}</div>
                <div className="text-sm opacity-70">
                  BPM: {bpm} ／ COMBO: {streak}
                </div>
              </div>
              <Progress value={progress} className="mb-6" />

              {/* コントロール（開始/停止） */}
              <div className="flex gap-2 mb-4">
                {!isRunning ? (
                  <Button onClick={startPlay}>スタート</Button>
                ) : (
                  <Button variant="accent" onClick={stop}>ストップ</Button>
                )}
              </div>

              <div className="text-2xl font-extrabold mb-2">
                「{q.word}」の現代語は？
              </div>
              <div className="text-sm opacity-70 mb-4">
                {phase === "prompt" && "提示中…（拍1）"}
                {phase === "choices" && "選択肢をタップ！（拍3）"}
                {phase === "judge" && "判定中…（拍4）"}
                {phase === "ready" && "スタートを押してね"}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {q.choices.map((txt, idxChoice) => (
                  <Button
                    key={idxChoice}
                    variant="surface"
                    size="lg"
                    disabled={!canAnswer}
                    onClick={() => { setSelected(idxChoice); sfx.click(); }}
                    className={selected === idxChoice ? "outline outline-4" : ""}
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
