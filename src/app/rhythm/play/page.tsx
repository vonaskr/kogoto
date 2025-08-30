// src/app/rhythm/play/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Container } from "@/components/layout/container";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { loadVocabCsv, type Vocab } from "@/lib/vocab";
import { buildQuizSet, type Quiz } from "@/lib/question-engine";

const QUIZ_COUNT = 5;

export default function RhythmPlay() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [qs, setQs] = useState<Quiz[]>([]);
  const [i, setI] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const vocab = await loadVocabCsv("/vocab.csv");
        if (!vocab.length) throw new Error("辞書が空です");
        // 直近誤答の重み（今は空でOK。SRS導入時に注入）
        const weight = new Map<number, number>();
        const quiz = buildQuizSet(vocab, QUIZ_COUNT, weight);
        setQs(quiz);
        setI(0); setCorrect(0); setStreak(0); setMaxStreak(0);
        setErr(null);
      } catch (e: any) {
        setErr(e?.message ?? "読み込みに失敗しました");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const q = qs[i];
  const progress = qs.length ? (i / qs.length) * 100 : 0;

  const pick = (c: number) => {
    if (!q) return;
    const ok = c === q.answer;
    setCorrect((x) => x + (ok ? 1 : 0));
    setStreak((s) => {
      const ns = ok ? s + 1 : 0;
      setMaxStreak((m) => Math.max(m, ns));
      return ns;
    });

    if (i + 1 < qs.length) {
      setI(i + 1);
    } else {
      const total = qs.length;
      // maxStreakは1テンポ遅れる可能性があるので、この場で計算
      const nextStreak = ok ? Math.max(maxStreak, streak + 1) : maxStreak;
      const nextCorrect = ok ? correct + 1 : correct;
      const p = new URLSearchParams({
        total: String(total),
        correct: String(nextCorrect),
        streak: String(nextStreak),
      });
      router.push(`/rhythm/result?${p.toString()}`);
    }
  };

  return (
    <Container>
      <Card>
        <CardContent className="p-6 md:p-8">
          {loading && <div className="opacity-70">辞書を読み込んでいます…</div>}
          {err && <div className="text-red-600 font-semibold">Error: {err}</div>}
          {!loading && !err && q && (
            <>
              <div className="flex items-center justify-between mb-4">
                <div className="font-semibold">リズム学習：{i + 1} / {qs.length}</div>
                <div className="text-sm opacity-70">COMBO: {streak}</div>
              </div>
              <Progress value={progress} className="mb-6" />

              <div className="text-2xl font-extrabold mb-4">「{q.word}」の現代語は？</div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {q.choices.map((txt, idx) => (
                  <Button key={idx} variant="surface" size="lg" onClick={() => pick(idx)}>
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
