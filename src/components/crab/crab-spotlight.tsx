// src/components/crab/crab-spotlight.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  useRive,
  useStateMachineInput,
  Layout,
  Fit,
  Alignment,
} from "@rive-app/react-canvas";
import { getPoints, getCrabState, feedCrab, getCrabLevelStep } from "@/lib/store";

// Rive Editor と完全一致させる
const ARTBOARD = "Crab";
const STATE_MACHINE = "CrabMachine";
const TRIGGER = "onCorrect";
const TRIGGER_WRONG = "onWrong";

export function CrabSpotlight() {
  const [mode, setMode] = useState<"talk" | "feed">("talk");
  const [points, setPoints] = useState(0);
  const [affinity, setAffinity] = useState(0); // 0..1
  const [level, setLevel] = useState(1);
  const step = getCrabLevelStep();
  const affPct = Math.round((affinity * 10000) / step) / 100; 
  const feedItems = useMemo(
    () => [
      { id: "a", name: "えび",   emoji: "🦐", cost: 10, exp: 0.06 },
      { id: "b", name: "ホタテ", emoji: "🦪", cost: 18, exp: 0.10 },
      { id: "c", name: "カニかま", emoji: "🦀", cost: 6, exp: 0.035 },
    ],
    []
  );  
  
  // /app/test と同条件：react-canvas + artboard + stateMachines + layout
  const { rive, RiveComponent } = useRive({
    src: "/crab.riv", // ← ここは絶対パス。http://localhost:3000/crab.riv で200確認済
    artboard: ARTBOARD,
    stateMachines: STATE_MACHINE,
    autoplay: true,
    layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }),
  });

  // Trigger（ロード前は undefined になり得る）
  const onCorrect = useStateMachineInput(rive, STATE_MACHINE, TRIGGER);
  const onWrong   = useStateMachineInput(rive, STATE_MACHINE, TRIGGER_WRONG);

  //helper
  const fireCorrect = () => onCorrect?.fire?.();
  const fireWrong   = () => onWrong?.fire?.();

  // 初期読込（ポイント/友好）
  useEffect(() => {
    const p = getPoints();
    const crab = getCrabState();
    setPoints(p);
    setLevel(crab.level);
    setAffinity((crab.affinity ?? 0) / 100); // 0..1 に正規化
  }, []);

  // ご飯処理：ポイント消費→友好加算→UI更新
  const handleFeed = (cost: number, exp: number) => {
    if (points < cost) return;
    // exp は 0..1 の割合で来る → ％ポイントへ
    const ok = feedCrab(cost, Math.round(exp * step));
    if (!ok) return;
    const p = getPoints();
    const crab = getCrabState();
    setPoints(p);
    setLevel(crab.level);
    setAffinity((crab.affinity ?? 0) / 100);
    fireCorrect();
  };

  // デバッグ：Inputs が本当に見えているかを一度だけログ
  useEffect(() => {
    if (!rive) return;
    try {
      const names = rive
        .stateMachineInputs(STATE_MACHINE)
        ?.map((i: any) => i.name);
      console.log("[RIVE] inputs:", names);
    } catch {}
  }, [rive]);

  // クリックで onCorrect を fire（存在しなければ何もしない）
  const fire = () => {
    if (!onCorrect) {
      console.warn(`Trigger "${TRIGGER}" not ready`);
      return;
    }
    onCorrect.fire();
  };

  return (
    <Card>
      <CardContent className="p-6 md:p-8">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="font-semibold">カニ★スポットライト</p>
          <div className="flex gap-2">
            <Button size="sm" variant={mode === "talk" ? "primary" : "surface"} onClick={() => setMode("talk")}>
              小言
            </Button>
            <Button size="sm" variant={mode === "feed" ? "accent" : "surface"} onClick={() => setMode("feed")}>
              ご飯
            </Button>
          </div>
        </div>

        {/* キャンバスは高さが無いと描画されません → 明示 */}
        <div className="w-full mx-auto h-[60px] sm:h-[220px] md:h-[260px] lg:h-[300px] max-w-[170px]">
          <RiveComponent className="w-full h-full" />
        </div>

                {/* デバッグ操作（必要に応じて残す/隠す） */}
        <div className="mt-3 flex flex-wrap gap-2 items-center justify-center">
          <Button size="sm" onClick={fireCorrect} disabled={!onCorrect}>正解トリガ</Button>
          <Button size="sm" variant="surface" onClick={fireWrong} disabled={!onWrong}>誤答トリガ</Button>
        </div>

        {/* 下段：モード別ビュー（最小実装） */}
        {mode === "talk" ? (
          <div className="mt-4 rounded-[var(--radius-lg)] border-4 border-[var(--border-strong)] bg-[var(--card)] px-4 py-3">
            <p className="text-sm opacity-90">カニ「今日もコツコツ〜」</p>
            <div className="text-xs opacity-60">（タップで次の小言…は後で）</div>
          </div>
        ) : (
          <div className="mt-4 rounded-[var(--radius-lg)] border-4 border-[var(--border-strong)] bg-[var(--card)] px-4 py-4">
            <div className="mb-3 flex flex-wrap gap-2 items-center">
              <span className="inline-flex items-center gap-2 rounded-full border-2 border-[var(--border-strong)] px-3 py-1 bg-[var(--card)] text-sm">
                Pt: <strong>{points}</strong>
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border-2 border-[var(--border-strong)] px-3 py-1 bg-[var(--card)] text-sm">
                Lv: <strong>{level}</strong>
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border-2 border-[var(--border-strong)] px-3 py-1 bg-[var(--card)] text-sm">
                友好度: <strong>{affPct}%</strong>
              </span>
            </div>
            {/* 次レベルまでのプログレス（テーマトークンのみ使用） */}
            <div className="mb-4">
              <div className="h-3 w-full rounded bg-[color-mix(in_srgb,var(--primary)_14%,var(--background))]">
                <div
                  className="h-3 rounded bg-[var(--primary)]"
                  style={{ width: `${affPct}%` }}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={affPct}
                  role="progressbar"
                />
              </div>
              <div className="mt-1 text-xs opacity-70">次のレベルまで：{Math.max(0, 100 - affPct)}%</div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {feedItems.map((f) => (
                <button
                  key={f.id}
                  onClick={() => handleFeed(f.cost, f.exp)}
                  className="rounded-[var(--radius-lg)] border-4 border-[var(--border-strong)] bg-[var(--card)] shadow-[var(--shadow-strong)] p-3 text-center hover:scale-[0.99] transition disabled:opacity-60"
                  disabled={points < f.cost}
                >
                  <div className="text-2xl">{f.emoji}</div>
                  <div className="text-sm font-semibold mt-1">{f.name}</div>
                  <div className="text-xs opacity-70 mt-1">- {f.cost}pt / {Math.round(f.exp*100)}%</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ちょいデバッグ */}
        <div className="mt-2 text-xs opacity-60 text-center">
          <code>inputs:{String(Boolean(onCorrect))}/{String(Boolean(onWrong))}</code>
        </div>

      </CardContent>
    </Card>
  );
}

