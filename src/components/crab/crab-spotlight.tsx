// components/crab/crab-spotlight.tsx
"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function CrabSpotlight() {
  const [mode, setMode] = useState<"talk" | "feed">("talk");

  return (
    <Card className="min-h-[360px] flex items-center justify-center">
      <CardContent className="p-6 md:p-8 w-full">
        {/* タイトル */}
        <p className="mb-2 font-semibold text-center">カニ★スポットライト</p>

        {/* 切替トグル（簡易） */}
        <div className="mb-4 flex gap-2 justify-center">
          <Button
            variant={mode === "talk" ? "primary" : "surface"}
            size="sm"
            onClick={() => setMode("talk")}
          >
            小言モード
          </Button>
          <Button
            variant={mode === "feed" ? "accent" : "surface"}
            size="sm"
            onClick={() => setMode("feed")}
          >
            ご飯モード
          </Button>
        </div>

        {/* 中身（まずはダミー） */}
        <div
          className="rounded-[var(--radius-lg)] border-4 border-[var(--border-strong)] bg-[var(--card)]"
          style={{ minHeight: 180 }}
        >
          {mode === "talk" ? (
            <div className="h-full flex items-center justify-center px-4 text-center opacity-80">
              （ここにRiveカニ＋小言吹き出し）
            </div>
          ) : (
            <div className="h-full flex items-center justify-center px-4 text-center opacity-80">
              （ここに餌カード／ポイント表示）
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
