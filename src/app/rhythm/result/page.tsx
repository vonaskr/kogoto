"use client";
import { Container } from "@/components/layout/container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { getLatestSession } from "@/lib/store";

export default function RhythmResult({
  searchParams,
}: {
  searchParams: { total?: string; correct?: string; streak?: string };
}) {
  const total = Number(searchParams.total ?? 0);
  const correct = Number(searchParams.correct ?? 0);
  const streak = Number(searchParams.streak ?? 0);
  const acc = total > 0 ? Math.round((correct / total) * 100) : 0;
  const session = getLatestSession();

  return (
    <Container>
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="h1-fluid">リザルト</CardTitle>
        </CardHeader>
        <CardContent className="p-6 md:p-8 pt-4">
          <ul className="list-disc pl-5 space-y-1 mb-4">
            <li>正答数：{correct} / {total}</li>
            <li>正答率：{acc}%</li>
            <li>最大COMBO：{streak}</li>
          </ul>
          {session?.items?.length ? (
            <div className="mt-4">
              <div className="font-semibold mb-2">今回の問題</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {session.items.map((it, i) => (
                  <div key={i} className="rounded-[var(--radius-lg)] border-4 border-[var(--border-strong)] bg-[var(--card)] p-3">
                    <div className="text-sm opacity-70 mb-1">Q{i+1}</div>
                    <div className="font-bold">「{it.word}」</div>
                    <div className="text-sm mt-1">
                      あなたの答え：{it.chosenText ?? "（未回答）"}
                    </div>
                    <div className="text-sm">
                      正解：{it.correctText}
                    </div>
                    <div className={`mt-1 text-sm font-semibold ${it.correct ? "text-green-700" : "text-red-700"}`}>
                      {it.correct ? "○ 正解" : "× 不正解"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          <div className="flex gap-3">
            <Link className="underline" href="/rhythm">もう一度</Link>
            <Link className="underline" href="/">ホームへ</Link>
          </div>
        </CardContent>
      </Card>
    </Container>
  );
}