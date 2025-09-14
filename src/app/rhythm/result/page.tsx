"use client";

import {  Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Container } from "@/components/layout/container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getLatestSession, addPoints, getPoints } from "@/lib/store";
import { useRive, useStateMachineInput, Layout, Fit, Alignment } from "@rive-app/react-canvas";

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

function RhythmResultInner() {
  // ① クエリはクライアントで取得
  const sp = useSearchParams();
  const total = Number(sp.get("total") ?? 0);
  const correct = Number(sp.get("correct") ?? 0);
  const comboMax = Number(sp.get("streak") ?? 0);
  const acc = total > 0 ? Math.round((correct / total) * 100) : 0;

  const [earned, setEarned] = useState(0);
  const [points, setPoints] = useState(0);
  const { rive, RiveComponent } = useRive({
    src: "/crab.riv",
    artboard: "Crab",
    stateMachines: "CrabMachine",
    autoplay: true,
    layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }),
  });
  const onCorrectTrig = useStateMachineInput(rive, "CrabMachine", "onCorrect");
  // ② セッションはクライアント側で後から取得（初期は null で固定レンダリング）
  const [session, setSession] = useState<Session | null>(null);
    // 正答数に応じた紙吹雪（継続的）
  useEffect(() => {
    if (correct < 3) return; // 2問未満はなし
    let active = true;
    let timer: NodeJS.Timeout;
    (async () => {
      const confetti = (await import("canvas-confetti")).default;
      const power =
        correct >= 5 ? 1 :
        correct >= 4 ? 0.7 :
        0.45;
      const launch = () => {
        if (!active) return;
        confetti({ particleCount: Math.round(160 * power), spread: 70, origin: { y: 0.25 }, scalar: 1 + power * 0.4 });
        confetti({ particleCount: Math.round(100 * power), angle: 60,  spread: 55, origin: { x: 0, y: 0.4 }, scalar: 0.9 + power * 0.3 });
        confetti({ particleCount: Math.round(100 * power), angle: 120, spread: 55, origin: { x: 1, y: 0.4 }, scalar: 0.9 + power * 0.3 });
      };
      launch(); // 初回すぐ
      timer = setInterval(launch, 2000); // 2秒ごと
    })();
    return () => { active = false; clearInterval(timer); };
  }, [correct]);

  useEffect(() => {
    // getLatestSession はクライアント専用想定
    const s = getLatestSession?.();
    if (s) setSession(s as Session);
  }, []);

  // 一度だけポイント加算（同じセッションで二重加算防止）
  useEffect(() => {
    const s = session as any;
    if (!s?.id) return;
    const key = "kogoto:lastAwardedSessionId";
    if (localStorage.getItem(key) === s.id) { setPoints(getPoints()); return; }
    // 加点ルール：正答×10 + コンボ段階(>=5:+50, >=4:+30, >=2:+10)
    const combo = Number(sp.get("streak") ?? 0);
    const comboBonus = combo >= 5 ? 50 : combo >= 4 ? 30 : combo >= 2 ? 10 : 0;
    const add = correct * 10 + comboBonus;
    addPoints(add);
    localStorage.setItem(key, s.id);
    setEarned(add);
    setPoints(getPoints());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);
  // Riveお祝い：正答に応じて数回fire（2〜6回）
  useEffect(() => {
    if (!onCorrectTrig) return;
    const n = Math.max(0, Math.min(6, correct + (correct >= 5 ? 1 : 0))) - 1; // 0〜5回
    if (n <= 0) return;
    let i = 0;
    const id = setInterval(() => {
      onCorrectTrig.fire?.();
      if (++i >= n) clearInterval(id);
    }, 500);
    return () => clearInterval(id);
  }, [onCorrectTrig, correct]);
  // 表示用にメモ化（初回は null → その後に反映）
  const items = useMemo(() => session?.items ?? [], [session]);

  return (
    <Container>
      <Card>
        <CardHeader className="relative">
          <CardTitle className="h1-fluid">リザルト</CardTitle>
          {/* 右上に小さめカニ */}
          <div className="absolute right-4 top-3 w-[90px] h-[70px] md:w-[120px] md:h-[90px] pointer-events-none">
            <RiveComponent className="w-full h-full" />
          </div>
        </CardHeader>
        <CardContent className="p-6 md:p-8">
          {/* スコアカード（Neo-brutalism風） */}
          <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-[var(--radius-lg)] border-4 border-[var(--border-strong)] bg-[var(--card)] p-4 text-center">
              <div className="text-sm opacity-70 mb-1">獲得ポイント</div>
              <div className="text-3xl font-extrabold">{earned || (correct*10 + (comboMax>=10?50:comboMax>=6?30:comboMax>=3?10:0))}pt</div>
            </div>
            <div className="rounded-[var(--radius-lg)] border-4 border-[var(--border-strong)] bg-[var(--card)] p-4 text-center">
              <div className="text-sm opacity-70 mb-1">正答</div>
              <div className="text-3xl font-extrabold">{correct}/{total}</div>
            </div>
            <div className="rounded-[var(--radius-lg)] border-4 border-[var(--border-strong)] bg-[var(--card)] p-4 text-center">
              <div className="text-sm opacity-70 mb-1">最大COMBO</div>
              <div className="text-3xl font-extrabold">{comboMax}</div>
            </div>
          </div>
          {/*}
          <ul className="list-disc pl-5 space-y-1 mb-4">
            <li>正答数：{correct} / {total}</li>
            <li>正答率：{acc}%</li>
            <li>最大COMBO：{comboMax}</li>
            <li>今回の獲得：{earned || (correct*10 + (comboMax>=10?50:comboMax>=6?30:comboMax>=3?10:0))} pt</li>
           <li>所持ポイント：{points} pt</li>
          </ul>
          */}

          {/* 操作ボタン（統一UI） */}
          <div className="flex gap-3 mb-6">
            <Link href="/rhythm"><Button>もう一度</Button></Link>
            <Link href="/"><Button variant="surface">ホームへ</Button></Link>
          </div>
 

          {/* セッション詳細（後からクライアントで追加されても、ページ自体は同じ構造） */}
          {items.length > 0 && (
            <div className="mt-2">
              <div className="font-semibold mb-2">今回の問題</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {items.map((it, i) => (
                  <div
                    key={i}
                    className={
                      `rounded-[var(--radius-lg)] border-4 border-[var(--border-strong)] p-3 ` +
                      (it.correct
                        ? "bg-[color-mix(in_srgb,var(--primary)_18%,var(--background))]"
                        : "bg-[color-mix(in_srgb,var(--accent)_20%,var(--background))]"
                      )
                    }
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-sm opacity-70">Q{i + 1}</div>
                      <span
                        className={
                          "text-xs font-semibold px-2 py-0.5 rounded " +
                          (it.correct
                            ? "bg-[var(--primary)] text-[var(--background)]"
                            : "bg-[var(--accent)] text-[var(--background)]")
                        }
                      >
                        {it.correct ? "正解" : "不正解"}
                      </span>
                    </div>
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

// CSR フォールバックを明示（next export対策）
export default function Page() {
  return (
    <Suspense fallback={<div className="p-6 opacity-70">結果を読み込み中…</div>}>
      <RhythmResultInner />
    </Suspense>
  );
}