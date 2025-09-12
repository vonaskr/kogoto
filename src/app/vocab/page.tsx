"use client";

import { useEffect, useMemo, useState } from "react";
import { Container } from "@/components/layout/container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { loadVocabCsv, type Vocab } from "@/lib/vocab";
import {
  getLastOutcomeMap,
  getSeenSet,
  getWrongWeights,
  getStatsMap,
  clearAllProgress,
} from "@/lib/store";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"; // 既存の shadcn Popover を想定

type Filter = "all" | "unseen" | "review";
type Status = "unseen" | "recentOk" | "review";
type SortKey = "kana" | "acc" | "correct" | "part";

function statusOf(
  v: Vocab,
  maps: { last: Map<number, boolean>; seen: Set<number> }
): Status {
  if (!maps.seen.has(v.id)) return "unseen";
  const last = maps.last.get(v.id);
  if (last === true) return "recentOk";
  if (last === false) return "review";
  return "unseen";
}

function statusBg(st: Status) {
  // テーマ変数のみで配色（color-mix）
  if (st === "recentOk")
    return "color-mix(in srgb, var(--primary) 90%, var(--background) 10%)";
  if (st === "review")
    return "color-mix(in srgb, var(--accent) 90%, var(--background) 10%)";
  return "var(--background)";
}
function badgeBg(st: Status) {
  if (st === "recentOk")
    return "color-mix(in srgb, var(--primary) 80%, var(--background) 20%)";
  if (st === "review")
    return "color-mix(in srgb, var(--accent) 80%, var(--background) 20%)";
  return "var(--card)";
}

export default function VocabListPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [all, setAll] = useState<Vocab[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("kana");

  // 学習記録（スナップショット）
  const maps = useMemo(() => {
    return {
      last: getLastOutcomeMap(),
      seen: getSeenSet(),
      wrong: getWrongWeights(), // 使うのは review 抽出時のみ
      stats: getStatsMap(), // ④ 正答率/回数のための集計
    };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const vocab = await loadVocabCsv("/vocab.csv");
        setAll(vocab);
        setErr(null);
      } catch (e: any) {
        setErr(e?.message ?? "読み込みに失敗しました");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const enriched = useMemo(() => {
    return all.map((v) => {
      const st = statusOf(v, { last: maps.last, seen: maps.seen });
      const s = maps.stats.get(v.id) ?? { seen: 0, correct: 0, wrong: 0, acc: 0 };
      return { v, st, s };
    });
  }, [all, maps.last, maps.seen, maps.stats]);

  const filtered = useMemo(() => {
    switch (filter) {
      case "unseen":
        return enriched.filter((x) => x.st === "unseen");
      case "review":
        return enriched.filter((x) => x.st === "review");
      default:
        return enriched;
    }
  }, [enriched, filter]);

  const sorted = useMemo(() => {
    const arr = filtered.slice();
    arr.sort((a, b) => {
      switch (sortKey) {
        case "kana": {
          // 読み（なければ word）で日本語ロケール比較
          const ak = (a.v.reading || a.v.word || "").toString();
          const bk = (b.v.reading || b.v.word || "").toString();
          const cmp = ak.localeCompare(bk, "ja");
          return cmp !== 0 ? cmp : a.v.id - b.v.id;
        }
        case "acc":
          return (b.s.acc ?? 0) - (a.s.acc ?? 0);
        case "correct":
          return (b.s.correct ?? 0) - (a.s.correct ?? 0);
        case "part":
          return a.v.part.localeCompare(b.v.part) || a.v.id - b.v.id;
        default:
          return a.v.id - b.v.id;
      }
    });
    return arr;
  }, [filtered, sortKey]);

  const onReset = () => {
    if (!confirm("学習記録をすべて未出題状態に戻します。よろしいですか？")) return;
    clearAllProgress();
    // 再読込（最新スナップショットにするため）
    location.reload();
  };

  return (
    <Container>
      <Card >
        <CardHeader className="pb-3">
          <CardTitle className="h1-fluid">単語リスト</CardTitle>
        </CardHeader>
        <CardContent className="p-6 md:p-8">
          {/* フィルタ群 */}
          <div className="mb-4 flex flex-wrap gap-2 items-center">
            <Button size="sm" variant={filter === "all" ? "primary" : "surface"} onClick={() => setFilter("all")}>
              すべて
            </Button>
            <Button size="sm" variant={filter === "unseen" ? "primary" : "surface"} onClick={() => setFilter("unseen")}>
              未出題
            </Button>
            <Button size="sm" variant={filter === "review" ? "primary" : "surface"} onClick={() => setFilter("review")}>
              復習対象
            </Button>

            {/* ④ ソート */}
            <div className="ml-auto flex items-center gap-2">
              <span className="text-sm opacity-70">並び替え</span>
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                className="rounded-[var(--radius-lg)] border-4 border-[var(--border-strong)] bg-[var(--card)] px-2 py-1 text-sm"
              >
                <option value="kana">あいうえお順</option>
                <option value="acc">正答率（高）</option>
                <option value="correct">正解数（多）</option>
                <option value="part">品詞</option>
              </select>
              {/* ③ リセット */}
              <Button size="sm" variant="surface" onClick={onReset}>リセット</Button>
            </div>
          </div>

          {loading && <div className="opacity-70">読み込み中…</div>}
          {err && <div className="text-red-600 font-semibold">Error: {err}</div>}

          {!loading && !err && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {sorted.map(({ v, st, s }) => (
                <Popover key={v.id}>
                  <PopoverTrigger asChild>
                    {/* 各単語カード：押し込みはここにだけ付与 */}
                    <div
                      className="pressable rounded-[var(--radius-lg)] border-4 border-[var(--border-strong)] shadow-[var(--shadow-strong)] p-4 cursor-pointer"
                      style={{ background: statusBg(st) }}
                      title="詳細を見る"
                    >
                      <div className="text-lg font-extrabold text-center leading-snug">{v.word}</div>
                      <div className="text-sm opacity-80 text-center mt-1 break-words">
                        {v.meanings[0] ?? ""}
                      </div>
                      <div className="mt-3 flex justify-center">
                        <span
                          className="inline-flex items-center rounded-full border-2 border-[var(--border-strong)] px-2 py-[2px] text-xs"
                          style={{ background: badgeBg(st) }}
                        >
                          {st === "recentOk" ? "直近正解" : st === "review" ? "復習対象" : "未出題"}
                        </span>
                      </div>
                    </div>
                  </PopoverTrigger>
                  <PopoverContent
                    align="center"
                    className="rounded-[var(--radius-lg)] border-4 border-[var(--border-strong)] bg-[var(--card)] shadow-[var(--shadow-strong)] p-4 w-80"
                  >
                    <div className="text-sm opacity-80">すべての意味：{v.meanings.join(" / ")}</div>
                    <div className="text-sm mt-2">
                      正解数：<b>{s.correct}</b>　誤答数：<b>{s.wrong}</b>　出題：<b>{s.seen}</b>
                    </div>
                    <div className="text-sm">
                      正答率：<b>{Math.round((s.acc ?? 0) * 100)}%</b>
                    </div>
                    {v.hint && (
                      <div className="text-sm mt-2">
                        例：<span className="opacity-90">{v.hint}</span>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </Container>
  );
}
