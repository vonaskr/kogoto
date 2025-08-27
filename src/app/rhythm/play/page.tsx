"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Container } from "@/components/layout/container";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

type Q = { id: string; word: string; choices: string[]; answer: number };

const DUMMY: Q[] = [
  { id: "1", word: "あやし", choices: ["不思議だ", "嬉しい", "速い", "小さい"], answer: 0 },
  { id: "2", word: "いと", choices: ["たいそう", "いとこ", "糸", "少し"], answer: 0 },
  { id: "3", word: "をかし", choices: ["趣がある", "重い", "鋭い", "赤い"], answer: 0 },
  { id: "4", word: "はべり", choices: ["おります", "走る", "歌う", "笑う"], answer: 0 },
  { id: "5", word: "つれづれ", choices: ["退屈だ", "忙しい", "楽しい", "暑い"], answer: 0 },
];

export default function RhythmPlay() {
  const router = useRouter();
  const qs = useMemo(() => DUMMY.slice(0, 5), []);
  const [i, setI] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);

  const q = qs[i];
  const progress = ((i) / qs.length) * 100;

  const pick = (c: number) => {
    const ok = c === q.answer;
    setCorrect((x) => x + (ok ? 1 : 0));
    setStreak((s) => {
      const ns = ok ? s + 1 : 0;
      setMaxStreak((m) => Math.max(m, ns));
      return ns;
    });

    // 次へ
    if (i + 1 < qs.length) {
      setI(i + 1);
    } else {
      const total = qs.length;
      router.push(`/rhythm/result?total=${total}&correct=${ok ? correct + 1 : correct}&streak=${maxStreak}`);
    }
  };

  return (
    <Container>
      <Card>
        <CardContent className="p-6 md:p-8">
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
        </CardContent>
      </Card>
    </Container>
  );
}
