// src/components/home/history-panel.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useEffect, useMemo, useState } from "react";
import { getAllSessions, getSeenSet } from "@/lib/store";
import { loadVocabCsv } from "@/lib/vocab";
export function HistoryPanel() {
  const [totalCount, setTotalCount] = useState(0);
  const [learnedCount, setLearnedCount] = useState(0); // = 一度でも出題された語数
  const [streakDays, setStreakDays] = useState(0);

  useEffect(() => {
    (async () => {
      // 全語数
      const all = await loadVocabCsv("/vocab.csv");
      setTotalCount(all.length);
      // 出題済み
      const seen = getSeenSet();
      setLearnedCount(seen.size);
      // 連続日数（最新日から日付ギャップ1日以内で連続する日数）
      const sessions = getAllSessions();
      const days = new Set(
        sessions.map((s) => {
          const d = new Date(s.startedAt);
          // YYYY-MM-DD
          return `${d.getFullYear()}-${(d.getMonth() + 1)
            .toString()
            .padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
        })
      );
      const today = new Date();
      let streak = 0;
      for (;;) {
        const d = new Date();
        d.setDate(today.getDate() - streak);
        const key = `${d.getFullYear()}-${(d.getMonth() + 1)
          .toString()
          .padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
        if (days.has(key)) streak += 1;
        else break;
      }
      setStreakDays(streak);
    })();
  }, []);

  const progress = useMemo(() => {
    if (totalCount <= 0) return 0;
    return Math.round((learnedCount / totalCount) * 100);
  }, [learnedCount, totalCount]);

  return (
    <Card pressable={false}>
      <CardHeader className="pb-0">
        <CardTitle>学習履歴</CardTitle>
      </CardHeader>
      <CardContent className="p-6 md:p-8 pt-4">
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Stat label="習得語数" value={`${learnedCount}/${totalCount || "—"}`} />
          <Stat label="連続日数" value={`${streakDays}日`} />
        </div>
        <div>
          <div className="text-sm mb-2 opacity-80">進捗 {progress}%</div>
          <Progress value={progress} />
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-lg)] border-4 border-[var(--border-strong)] bg-[var(--card)] py-3 text-center">
      <div className="text-xs opacity-70">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}
