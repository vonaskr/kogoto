"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Container } from "@/components/layout/container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getLatestSession } from "@/lib/store";

// 最低限の型（store の実体に合わせて緩めに）
type Item = {
  word: string;
  correctText: string;
  chosenText: string | null;
  correct: boolean;
};
type Session = {
  items: Item[];
};

export default function RhythmResult() {
  // ① クエリはクライアントで取得
  const sp = useSearchParams();
  const total = Number(sp.get("total") ?? 0);
  const correct = Number(sp.get("correct") ?? 0);
  const comboMax = Number(sp.get("streak") ?? 0);
  const acc = total > 0 ? Math.round((correct / total) * 100) : 0;

  // ② セッションはクライアント側で後から取得（初期は null で固定レンダリング）
  const [session, setSession] = useState<Session | null>(null);
  useEffect(() => {
    // getLatestSession はクライアント専用想定
    const s = getLatestSession?.();
    if (s) setSession(s as Session);
  }, []);

  // 表示用にメモ化（初回は null → その後に反映）
  const items = useMemo(() => session?.items ?? [], [session]);

  return (
    <Container>
      <Card>
        <CardHeader>
          <CardTitle className="h1-fluid">リザルト</CardTitle>
        </CardHeader>
        <CardContent className="p-6 md:p-8">
          <ul className="list-disc pl-5 space-y-1 mb-4">
            <li>正答数：{correct} / {total}</li>
            <li>正答率：{acc}%</li>
            <li>最大COMBO：{comboMax}</li>
          </ul>

          {/* リンク行（常に同じマークアップで出す：Hydration差分を避ける） */}
          <div className="flex gap-3 mb-6">
            <Link className="underline" href="/rhythm">もう一度</Link>
            <Link className="underline" href="/">ホームへ</Link>
          </div>

          {/* セッション詳細（後からクライアントで追加されても、ページ自体は同じ構造） */}
          {items.length > 0 && (
            <div className="mt-2">
              <div className="font-semibold mb-2">今回の問題</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {items.map((it, i) => (
                  <div
                    key={i}
                    className="rounded-[var(--radius-lg)] border-4 border-[var(--border-strong)] bg-[var(--card)] p-3"
                  >
                    <div className="text-sm opacity-70 mb-1">Q{i + 1}</div>
                    <div className="font-semibold">「{it.word}」</div>
                    <div className="text-sm mt-1">
                      正解：<span className="font-medium">{it.correctText}</span>
                    </div>
                    <div className="text-sm">
                      あなたの回答：
                      <span className={it.correct ? "font-medium" : "font-medium line-through opacity-80"}>
                        {it.chosenText ?? "（未回答）"}
                      </span>
                      {!it.correct && (
                        <span className="ml-2">→ <span className="font-medium">{it.correctText}</span></span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </Container>
  );
}
