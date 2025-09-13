"use client";

import { useState } from "react";
import { Container } from "@/components/layout/container";
import { CardGrid } from "@/components/layout/card-grid";
import { ActionsRow } from "@/components/layout/actions-row";
import { H1 } from "@/components/ui/responsive-heading";

import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

type Palette = {
  id: string;
  name: string;
  vars: Record<string, string>; // CSS variables
};

const PALETTES: Palette[] = [
  {
    id: "sui",
    name: "① Sui風（未来感）",
    vars: {
      "--background": "#F2F6FF",
      "--foreground": "#0B0F19",
      "--primary": "#3B82F6",
      "--primary-foreground": "#FFFFFF",
      "--accent": "#FACC15",
      "--card": "#EDEFFC",
      "--border-strong": "#1A1A1A",
    },
  },
  {
    id: "pop",
    name: "② ポップ（楽しい学習）",
    vars: {
      "--background": "#FFFBE6",
      "--foreground": "#1A1A1A",
      "--primary": "#FF5C8A",
      "--primary-foreground": "#111111",
      "--accent": "#00C2FF",
      "--card": "#FFF2B3",
      "--border-strong": "#1A1A1A",
    },
  },
  {
    id: "retro",
    name: "③ レトロPC風（落ち着き）",
    vars: {
      "--background": "#F7F7F2",
      "--foreground": "#000000",
      "--primary": "#006666",
      "--primary-foreground": "#FFFFFF",
      "--accent": "#FF4D00",
      "--card": "#EDEDE6",
      "--border-strong": "#000000",
    },
  },
];

export default function PalettePage() {
  const [activeId, setActiveId] = useState("pop");
  const active = PALETTES.find((p) => p.id === activeId)!;

  return (
    <Container className="max-w-7xl lg:px-16">
      {/* 配色切替ボタン群（レイアウトのみ調整） */}
      <div className="flex flex-wrap gap-2 mb-4">
        {PALETTES.map((p) => (
          <button
            key={p.id}
            onClick={() => setActiveId(p.id)}
            className={`px-4 py-2 rounded-lg border text-sm font-medium ${
              activeId === p.id ? "bg-black text-white" : "bg-white hover:bg-neutral-100"
            }`}
            aria-pressed={activeId === p.id}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* プレビュー全体にテーマを適用（この style はプレビュー専用） */}
      <TooltipProvider>
        <section style={active.vars as React.CSSProperties} className="rounded-2xl border p-4 sm:p-6 lg:p-8">
          <div className="rounded-xl p-4 sm:p-6 lg:p-8 grid-bg" style={{ background: "var(--background)", color: "var(--foreground)" }}>
            {/* ヘッダー */}
            <header className="flex items-center justify-between mb-4 sm:mb-6">
              <H1>こごと — Theme Preview</H1>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button>Primary</Button>
                </TooltipTrigger>
                <TooltipContent>主ボタン（原色＋太枠）</TooltipContent>
              </Tooltip>
            </header>

            {/* カード群：1→2→3列 */}
            <CardGrid  className="max-w-none">
              {/* 学習履歴 */}
              <BrutCard title="学習履歴">
                <div className="space-y-2">
                  <div className="text-sm opacity-80">Total Time</div>
                  <div className="text-2xl font-bold">2h 35m</div>
                  <div className="text-sm opacity-80 mt-3">単語クリア</div>
                  <Progress value={68} className="h-3" />
                </div>
              </BrutCard>

              {/* 今日の小言 */}
              <BrutCard title="今日の小言">
                <CrabSpeech
                  text={
                    <>
                      もう葉月も終わりか… まだこんなに暑いのは{" "}
                      <span className="px-1.5 py-0.5 rounded-md ml-1" style={{ background: "var(--accent)" }}>
                        わりなし
                      </span>{" "}
                      だね…
                    </>
                  }
                />
                <Button variant="surface">ほかの小言を見る</Button>
              </BrutCard>

              {/* クイック開始 */}
              <BrutCard title="クイック開始">
                <Tabs defaultValue="rhythm" className="w-full">
                  <TabsList className="grid grid-cols-3 sm:flex sm:gap-2">
                    <TabsTrigger value="rhythm" className="sm:flex-1">リズム</TabsTrigger>
                    <TabsTrigger value="amb" className="sm:flex-1">曖昧</TabsTrigger>
                    <TabsTrigger value="review" className="sm:flex-1">復習</TabsTrigger>
                  </TabsList>

                  <TabsContent value="rhythm" className="mt-4">
                    <ActionsRow>
                       <Button >リズムを始める</Button>
                       <Button variant="surface" >練習</Button>
                    </ActionsRow>
                  </TabsContent>

                  <TabsContent value="amb" className="mt-4">
                    <ActionsRow>
                      <Input placeholder="ポジ/ネガ判定の単語セット名" className="sm:flex-1" />
                      <Button variant="accent" className="sm:w-auto">始める</Button>
                    </ActionsRow>
                  </TabsContent>

                  <TabsContent value="review" className="mt-4">
                    <p className="opacity-80 text-sm">「間違えた問題リスト」から出題します。</p>
                  </TabsContent>
                </Tabs>
              </BrutCard>
            </CardGrid>

            {/* カニの居住エリア：高さいい感じに可変 */}
            <CrabPlayground />

            {/* ボタン/文字/バッジ比較（レイアウトだけ） */}
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <DemoButtons />
              <DemoTypography />
              <DemoChips />
            </div>

            {/* フッター的バナー */}
            <div className="mt-10 flex items-center justify-between rounded-xl p-4 border-4"
                 style={{ background: "var(--card)", borderColor: "var(--border-strong)" }}>
              <span className="font-semibold">ポイント：1,240</span>
              <Button variant="accent">カニにご飯をあげる</Button>
            </div>

            <div className="mt-8">
            <div className="font-semibold mb-2">Popover demo</div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="surface">豆知識を開く</Button>
              </PopoverTrigger>
              <PopoverContent>
                <div className="space-y-2">
                  <div className="font-bold">古語メモ</div>
                  <p className="text-sm opacity-80">「わりなし」＝ひどい・道理に合わない など。</p>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          </div>
        </section>
      </TooltipProvider>
    </Container>
  );
}


/* =================== 小さめのデモUI =================== */

function BrutCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card
      className="border-4 rounded-2xl shadow-none"
      style={{
        borderColor: "var(--border-strong)",
        background: "var(--card)",
        boxShadow: `6px 6px 0 var(--border-strong)`,
      }}
    >
      <CardHeader className="pb-3">
        <CardTitle className="tracking-tight">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  );
}

/* 吹き出し（しっぽは回転した小さな四角で表現） */
function CrabSpeech({ text }: { text: React.ReactNode }) {
  return (
    <div className="relative">
      <div
        className="inline-block max-w-full border-4 rounded-2xl px-4 py-3"
        style={{
          background: "var(--card)",
          borderColor: "var(--border-strong)",
          boxShadow: `6px 6px 0 var(--border-strong)`,
        }}
      >
        {text}
      </div>
      {/* しっぽ */}
      <div
        className="absolute -bottom-2 left-10 w-4 h-4 rotate-45 border-4"
        style={{
          background: "var(--card)",
          borderColor: "var(--border-strong)",
          borderTopColor: "transparent",
          borderLeftColor: "transparent",
          boxShadow: `3px 3px 0 var(--border-strong)`,
        }}
        aria-hidden
      />
    </div>
  );
}

/* カニの居住エリア（ドット背景＋簡易キャラ） */
function CrabPlayground() {
  return (
    <div className="mt-8">
      <h2 className="text-xl font-bold mb-3">カニの居住エリア</h2>
      <div
        className="relative h-56 rounded-2xl border-4 overflow-hidden"
        style={{
          borderColor: "var(--border-strong)",
          background:
            "radial-gradient(circle at 1px 1px, rgba(0,0,0,0.12) 1px, transparent 1px)",
          backgroundSize: "16px 16px",
        }}
      >
        {/* 砂地っぽい地面 */}
        <div
          className="absolute bottom-0 left-0 right-0 h-20 border-t-4"
          style={{
            background: "var(--card)",
            borderColor: "var(--border-strong)",
          }}
        />
        {/* カニ（仮：丸い胴体＋目） */}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-16">
          <div
            className="w-16 h-16 rounded-full border-4 flex items-center justify-center text-2xl"
            style={{
              background: "var(--primary)",
              color: "var(--primary-foreground)",
              borderColor: "var(--border-strong)",
              boxShadow: `6px 6px 0 var(--border-strong)`,
            }}
          >
            🦀
          </div>
        </div>
        {/* 吹き出し */}
        <div className="absolute left-6 top-6">
          <CrabSpeech text={<>がんばってるね！今日は「いと」覚える？</>} />
        </div>
      </div>
    </div>
  );
}

function DemoButtons() {
  return (
    <div className="space-y-3">
      <div className="font-semibold">Buttons</div>
      <div className="flex flex-wrap gap-3">
        <Button
          className="border-4 rounded-xl"
          style={{
            background: "var(--primary)",
            color: "var(--primary-foreground)",
            borderColor: "var(--border-strong)",
          }}
        >
          Primary
        </Button>
        <Button
          className="border-4 rounded-xl"
          style={{
            background: "var(--card)",
            color: "var(--foreground)",
            borderColor: "var(--border-strong)",
          }}
        >
          Surface
        </Button>
        <Button
          className="border-4 rounded-xl"
          style={{
            background: "var(--accent)",
            color: "var(--foreground)",
            borderColor: "var(--border-strong)",
          }}
        >
          Accent
        </Button>
        <Button variant="surface">キャンセル</Button>
        <Button variant="accent">特別アクション</Button>
        <Button size="sm">小ボタン</Button>
        <Button size="lg">大ボタン</Button>
        <Button className="w-full">幅いっぱいにする</Button>
        <Button variant="surface" className="rounded-full">丸型に変える</Button>


      </div>
    </div>
  );
}

function DemoTypography() {
  return (
    <div className="space-y-2">
      <div className="font-semibold">Typography</div>
      <h2 className="text-2xl font-bold">見出し H2 / Heading</h2>
      <p className="opacity-80">
        説明テキスト。配色のコントラストや可読性をここで確認します。
      </p>
      <Input
        placeholder="Input のフォーカスや枠線もチェック"
        className="border-4 rounded-xl"
        style={{ borderColor: "var(--border-strong)" }}
      />
    </div>
  );
}

function DemoChips() {
  return (
    <div className="space-y-3">
      <div className="font-semibold">Badges</div>
      <div className="flex flex-wrap gap-2">
        <span
          className="px-3 py-1 rounded-full border-4 text-sm"
          style={{
            background: "var(--card)",
            borderColor: "var(--border-strong)",
          }}
        >
          未学習
        </span>
        <span
          className="px-3 py-1 rounded-full border-4 text-sm"
          style={{
            background: "var(--primary)",
            color: "var(--primary-foreground)",
            borderColor: "var(--border-strong)",
          }}
        >
          習得中
        </span>
        <span
          className="px-3 py-1 rounded-full border-4 text-sm"
          style={{
            background: "var(--accent)",
            borderColor: "var(--border-strong)",
          }}
        >
          復習
        </span>
      </div>
    </div>
  );
}

