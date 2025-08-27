// src/app/page.tsx
import Link from "next/link";
import { Container } from "@/components/layout/container";
import { ActionsRow } from "@/components/layout/actions-row";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <Container>
      {/* SP: flex + order で 並び替え（学習→カニ→履歴）
          PC: lg:grid で 2カラム（左: 履歴 → 学習 / 右: カニ） */}
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[1fr_420px]">
        {/* 1) 履歴（SPでは3番目、PCでは左上） */}
        <section className="order-3 lg:order-none">
          <Card>
            <CardContent className="p-6 md:p-8">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-extrabold">120</div>
                  <div className="text-sm opacity-80">学習分</div>
                </div>
                <div>
                  <div className="text-2xl font-extrabold">210/315</div>
                  <div className="text-sm opacity-80">習得語</div>
                </div>
                <div>
                  <div className="text-2xl font-extrabold">5</div>
                  <div className="text-sm opacity-80">連続日</div>
                </div>


              </div>
            </CardContent>
          </Card>
        </section>

        {/* 2) カニ（SPでは2番目、PCでは右上 & sticky） */}
        <aside className="order-2 lg:order-none lg:sticky lg:top-6 lg:self-start lg:row-span-2">
          <Card className="min-h-[360px] flex items-center justify-center">
            <CardContent className="p-6 md:p-8 w-full text-center">
              <p className="mb-2 font-semibold">カニ★スポットライト</p>
              <p className="opacity-80">（ここに Rive カニと小言/ご飯モードが入ります）</p>
            </CardContent>
          </Card>
        </aside>

        {/* 3) 学習開始（SPでは1番目、PCでは左の下段） */}
        <section className="order-1 lg:order-none">
          <Card>
            <CardContent className="p-6 md:p-8">
              <h2 className="h1-fluid mb-4">学習をはじめる</h2>
              <ActionsRow>
                <Button asChild block className="sm:flex-1">
                  <Link href="/rhythm">リズム学習（準備中）</Link>
                </Button>
                <Button variant="accent" asChild block className="sm:flex-1">
                  <Link href="/ambiguous">曖昧クイズ（準備中）</Link>
                </Button>
                <Button variant="surface" asChild block className="sm:flex-1">
                  <Link href="/vocab">単語リスト（準備中）</Link>
                </Button>

              </ActionsRow>
            </CardContent>
          </Card>
        </section>
      </div>
    </Container>
  );
}
