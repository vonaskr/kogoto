"use client";

import { useEffect, useMemo, useState } from "react";
import { Container } from "@/components/layout/container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { loadVocabCsv, type Vocab } from "@/lib/vocab";
import { getLastOutcomeMap, getSeenSet, getWrongWeights } from "@/lib/store";

type Filter = "all" | "unseen" | "review";

type Status = "unseen" | "recentOk" | "review";

// 学習状態は「直近の結果のみ」で判定
// - 未出題: seenにない
// - 直近正解: last === true
// - 復習対象: last === false
function statusOf(
  v: Vocab,
  maps: { wrong: Map<number, number>; last: Map<number, boolean>; seen: Set<number> }
): Status {
  if (!maps.seen.has(v.id)) return "unseen";
  const last = maps.last.get(v.id);
  if (last === true) return "recentOk";
  if (last === false) return "review";
  return "unseen";
}

export default function VocabListPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [all, setAll] = useState<Vocab[]>([]);
  const [filter, setFilter] = useState<Filter>("all");

  // 学習記録の集計
  const maps = useMemo(() => {
    return {
      wrong: getWrongWeights(),
      last: getLastOutcomeMap(),
      seen: getSeenSet(),
    };
  }, []); // ページ入場時のスナップショットでOK

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

  const list = useMemo(() => {
    const enriched = all.map((v) => ({ v, st: statusOf(v, maps) }));
    switch (filter) {
      case "unseen":
        return enriched.filter((x) => x.st === "unseen");
      case "review":
        return enriched.filter((x) => x.st === "review");
      default:
        return enriched;
    }
  }, [all, maps, filter]);

  return (
    <Container>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="h1-fluid">単語リスト</CardTitle>
        </CardHeader>
        <CardContent className="p-6 md:p-8">

          {/* フィルタ */}
          <div className="mb-4 flex gap-2">
            <Button size="sm" variant={filter === "all" ? "primary" : "surface"} onClick={() => setFilter("all")}>
              すべて
            </Button>
            <Button size="sm" variant={filter === "unseen" ? "primary" : "surface"} onClick={() => setFilter("unseen")}>
              未出題
            </Button>
            <Button size="sm" variant={filter === "review" ? "primary" : "surface"} onClick={() => setFilter("review")}>
              復習対象
            </Button>
          </div>

          {loading && <div className="opacity-70">読み込み中…</div>}
          {err && <div className="text-red-600 font-semibold">Error: {err}</div>}

          {!loading && !err && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {list.map(({ v, st }) => {
                // 背景はテーマ変数のみを使用（color-mixでトーンを合わせる）
                const bg =
                  st === "recentOk"
                    ? "color-mix(in srgb, var(--primary) 24%, var(--background) 76%)"
                    : st === "review"
                      ? "color-mix(in srgb, var(--accent) 24%, var(--background) 76%)"
                      : "var(--background)";
                const badgeBg =
                  st === "recentOk"
                    ? "color-mix(in srgb, var(--primary) 36%, var(--background) 64%)"
                    : st === "review"
                      ? "color-mix(in srgb, var(--accent) 36%, var(--background) 64%)"
                      : "var(--card)";
                return (
                  <div
                    key={v.id}
                    className="rounded-[var(--radius-lg)] border-4 border-[var(--border-strong)] shadow-[var(--shadow-strong)] p-4"
                    style={{ background: bg }}
                  >
                    <div className="text-lg font-extrabold text-center leading-snug">{v.word}</div>
                    <div className="text-sm opacity-80 text-center mt-1 break-words">
                      {v.meanings[0] ?? ""}
                    </div>
                    <div className="mt-3 flex justify-center">
                      <span
                        className="inline-flex items-center rounded-full border-2 border-[var(--border-strong)] px-2 py-[2px] text-xs"
                        style={{ background: badgeBg }}
                      >
                        {st === "recentOk" ? "正解" : st === "review" ? "復習対象" : "未出題"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </Container>
  );
}
