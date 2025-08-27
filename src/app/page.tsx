// src/app/page.tsx
import { Container } from "@/components/layout/container";
import { HistoryPanel } from "@/components/home/history-panel";
import { ModeLaunchers } from "@/components/home/mode-launchers";
import { CrabSpotlight } from "@/components/crab/crab-spotlight";

export default function Home() {
  return (
    <Container>
      {/* SP: 学習→カニ→履歴 / PC: 左=履歴→学習, 右=カニ(sticky, 2行) */}
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[1fr_420px]">
        {/* 履歴（SPでは3番目、PCでは左上） */}
        <section className="order-3 lg:order-none">
          <HistoryPanel />
        </section>

        {/* カニ（SPでは2番目、PCでは右側・stickyで2行） */}
        <aside className="order-2 lg:order-none lg:sticky lg:top-6 lg:self-start lg:row-span-2">
          <CrabSpotlight />
        </aside>

        {/* 学習開始（SPでは1番目、PCでは左下） */}
        <section className="order-1 lg:order-none">
          <ModeLaunchers />
        </section>
      </div>
    </Container>
  );
}
