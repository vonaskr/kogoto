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
import { getPoints, getCrabState, feedCrab, getCrabLevelStep, getLatestSession } from "@/lib/store";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RotateCw } from "lucide-react";
import { loadVocabCsv } from "@/lib/vocab"; //
import { CRAB_QUIPS, Quip } from "@/lib/crab-quips";
import { getWeatherTag, type WeatherTag } from "@/lib/weather";

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
  const [quipIndex, setQuipIndex] = useState(0);
  const [meaningsMap, setMeaningsMap] = useState<Record<string, string[]> | null>(null);
  const [lastWrongWord, setLastWrongWord] = useState<string | null>(null);
  const [pinnedQuip, setPinnedQuip] = useState<string | null>(null); // レベルアップ直後の専用一言など
  const [weatherTag, setWeatherTag] = useState<WeatherTag | null>(null);

  const step = getCrabLevelStep(level);
  const affPct = step > 0 ? Math.round((affinity * 10000) / step) / 100 : 0;
  const remainingPts = Math.max(0, step - affinity);
  
  // 条件に合う候補だけ抽出（0件なら全体フォールバック）
  const quipCandidates = useMemo(() => {
    const ok = (q: Quip) => {
      const w = q.when;
      if (!w) return true;
      if (w.minLevel != null && level < w.minLevel) return false;
      if (w.maxRemainPts != null && remainingPts > w.maxRemainPts) return false;
      if (w.weatherTag && w.weatherTag !== weatherTag) return false;
      return true;
    };
    const list = CRAB_QUIPS.filter(ok);
    return list.length ? list : CRAB_QUIPS;
  }, [level, remainingPts, weatherTag]);
  const feedItems = useMemo(
    () => [
      { id: "a", name: "えび",   emoji: "🦐", cost: 10, gain: 10 },
      { id: "b", name: "ホタテ", emoji: "🦪", cost: 18, gain: 18 },
      { id: "c", name: "カニかま", emoji: "🦀", cost: 6,  gain: 6  },
    ],
    []
  );
  
  // 動的（直前ミス引用）… vocab に無い場合でもそのまま表示
  const dynamicQuips: string[] = useMemo(() => {
    const arr: string[] = [];
    if (lastWrongWord) {
    // 古語を <k>…</k> で囲み、下線＋意味ポップオーバー対応
      arr.push(`さっき間違えちゃった，<k>${lastWrongWord}</k> 覚えた〜？`);
    }
    if (pinnedQuip) {
      // pinned は最優先で先頭表示
      arr.unshift(pinnedQuip);
    }
    return arr;
  }, [lastWrongWord, pinnedQuip]);

  // 表示テキスト（優先: pinned → 動的 → 静的候補）
  const allTexts = [
    ...dynamicQuips,
    ...quipCandidates.map(q => q.text),
  ];
  const showQuip = allTexts.length ? allTexts[quipIndex % allTexts.length] : "";
 
  // 候補が変わったら index リセット（pinned 消滅や条件変動に追随）
  useEffect(() => { setQuipIndex(0); }, [allTexts.length]);
  // /app/test と同条件：react-canvas + artboard + stateMachines + layout
  const { rive, RiveComponent } = useRive({
    src: "/crab.riv", 
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
    setAffinity(crab.affinity);
  }, []);

  // 天気を取得（失敗したら null のまま）
  useEffect(() => {
    let alive = true;
    (async () => {
      const tag = await getWeatherTag();
      if (!alive) return;
      setWeatherTag(tag); // "sunny" | "cloudy" | "rainy" | null
    })();
    return () => { alive = false; };
  }, []);

  // vocab.csv 読み込み → { 単語 or 読み: meanings[] } の簡易マップ
  useEffect(() => {
    (async () => {
      try {
        const list = await loadVocabCsv("/vocab.csv");
        const map: Record<string, string[]> = {};
        for (const v of list) {
          map[v.word] = v.meanings;
          if (v.reading) map[v.reading] = v.meanings;
        }
        setMeaningsMap(map);
      } catch {
        setMeaningsMap({});
      }
    })();
  }, []);

  // 直前に間違えた単語を取得（最新セッションの末尾から逆走査）
  useEffect(() => {
    const s = getLatestSession();
    if (!s) { setLastWrongWord(null); return; }
    for (let i = s.items.length - 1; i >= 0; i--) {
      const it = s.items[i];
      if (!it.correct) { setLastWrongWord(it.word); return; }
    }
    setLastWrongWord(null);
  }, []);

  // ご飯処理：ポイント消費→友好加算→UI更新
    const handleFeed = (cost: number, gain: number) => {
    if (points < cost) return;
    const beforeLevel = level;
    const ok = feedCrab(cost, gain); // gain は絶対pt
    if (!ok) return;
    const p = getPoints();
    const crab = getCrabState();
    setPoints(p);
    setLevel(crab.level);
    setAffinity(crab.affinity);
    fireCorrect();
    // レベルアップ検知 → 専用一言をピン留め
    if (crab.level > beforeLevel) {
      setPinnedQuip("また一段と賢くなっちゃった〜，この調子だね");
    }
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

        {/* rive action デバッグ 
        <div className="mt-3 flex flex-wrap gap-2 items-center justify-center">
          <Button size="sm" onClick={fireCorrect} disabled={!onCorrect}>正解トリガ</Button>
          <Button size="sm" variant="surface" onClick={fireWrong} disabled={!onWrong}>誤答トリガ</Button>
        </div>
        */}

        {/* 下段：モード別ビュー（最小実装） */}
        {mode === "talk" ? (
            <div className="mt-4 rounded-[var(--radius-lg)] border-4 border-[var(--border-strong)] bg-[var(--card)] px-4 py-3 select-none">
    {/* 見出し */}
    <div className="mb-2 text-xs opacity-70">カニからの小言</div>

    {/* 小言テキスト：<k>古語</k> を下線＆クリックで意味Popover */}
    <p className="text-sm opacity-90 leading-relaxed font-game">
                {showQuip.split(/(<k>.*?<\/k>)/).map((chunk, i) => {                
                  const m = /^<k>(.*?)<\/k>$/.exec(chunk);
                if (!m) return <span key={i}>{chunk}</span>;
                const word = m[1];
                return (
                  <Popover key={i}>
                    <PopoverTrigger
                      asChild
                      onClick={(e) => e.stopPropagation()} // 親への伝播防止
                    >
                      <span className="underline underline-offset-2 decoration-[var(--border-strong)] cursor-pointer">
                        {word}
                      </span>
                    </PopoverTrigger>
                    <PopoverContent className="p-3 text-sm max-w-xs border-4 border-[var(--border-strong)] bg-[var(--card)] shadow-[var(--shadow-strong)]">
                      <div className="font-semibold mb-1">{word}</div>
                      <div className="opacity-80">
                        {meaningsMap
                          ? (meaningsMap[word] || ["（見つかりませんでした）"]).join(" / ")
                          : "読み込み中…"}
                      </div>
                    </PopoverContent>
                  </Popover>
                );
              })}
            </p>
            {/* 右上：切替ボタン（RotateCw + ラベル） */}
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                aria-label="小言を切り替える"
                  onClick={() => {
                  // pinned があれば一度だけ消してから通常候補へ
                  if (pinnedQuip) setPinnedQuip(null);
                  setQuipIndex((i) => (i + 1) % Math.max(1, allTexts.length));
                }}
                className="inline-flex items-center gap-2 rounded-full border-2 border-[var(--border-strong)] px-4 py-2 shadow-[var(--shadow-strong)] hover:translate-y-[1px] transition text-sm
                           bg-[var(--primary)] text-[var(--primary-foreground)]"
              >
                <RotateCw className="w-4 h-4" />
                切替
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-[var(--radius-lg)] border-4 border-[var(--border-strong)] bg-[var(--card)] px-4 py-4">
          {/* 統計：バッジ化で視線固定 */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border-2 border-[var(--border-strong)] px-3 py-1 bg-[var(--card)] text-sm">
              現在の友好度 : <strong className="tabular-nums">Lv{level}</strong>
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border-2 border-[var(--border-strong)] px-3 py-1 bg-[var(--card)] text-sm">
              所持pt : <strong className="tabular-nums">{points}</strong>
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
              <div className="mt-1 text-xs opacity-70">
                次のレベルまで：{remainingPts}pt
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {feedItems.map((f) => (
                <button
                  key={f.id}
                  onClick={() => handleFeed(f.cost, f.gain)}
                  className="rounded-[var(--radius-lg)] border-4 border-[var(--border-strong)] bg-[var(--card)] shadow-[var(--shadow-strong)] p-3 text-center hover:scale-[0.99] transition disabled:opacity-60"
                  disabled={points < f.cost}
                >
                  <div className="text-2xl">{f.emoji}</div>
                  <div className="text-sm font-semibold mt-1">{f.name}</div>
                  <div className="text-xs opacity-70 mt-1">購入ポイント: {f.cost}pt</div>
                </button>
              ))}
            </div>
          </div>
        )}



      </CardContent>
    </Card>
  );
}

