// src/app/page.tsx
import { Container } from "@/components/layout/container";
import { HistoryPanel } from "@/components/home/history-panel";
import { ModeLaunchers } from "@/components/home/mode-launchers";
import { CrabSpotlight } from "@/components/crab/crab-spotlight";

export default function Home() {
  return (
    <Container>
      {/* SP: 1カラム → カニ / 履歴 / 学習 の順
          PC: 2カラム → 左に履歴+学習、右にカニ(sticky) */}
      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        {/* カニ（SPでは先頭。PCでは右カラム＆追従） */}
        <aside className="lg:col-start-2 lg:row-start-1 lg:sticky lg:top-6">
          <CrabSpotlight />
        </aside>

        {/* 左カラム（PC）/ 2番目以降（SP） */}
        <div className="space-y-6">
          <HistoryPanel />
          <ModeLaunchers />
        </div>
      </div>
    </Container>
  );
}
