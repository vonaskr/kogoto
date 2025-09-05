// src/components/home/history-panel.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export function HistoryPanel() {
  // ダミー値（後でストレージと接続予定）
  const totalStudyMinutes = 42;
  const learnedCount = 210;
  const totalCount = 315;
  const progress = Math.round((learnedCount / totalCount) * 100);

  return (
    <Card pressable={false}>
      <CardHeader className="pb-0">
        <CardTitle>学習履歴</CardTitle>
      </CardHeader>
      <CardContent className="p-6 md:p-8 pt-4">
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Stat label="学習時間" value={`${totalStudyMinutes}分`} />
          <Stat label="習得語数" value={`${learnedCount}/${totalCount}`} />
          <Stat label="連続日数" value={`3日`} />
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
