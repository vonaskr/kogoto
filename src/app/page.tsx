import Link from "next/link";
import { Container } from "@/components/layout/container";
import { ActionsRow } from "@/components/layout/actions-row";
import { H1 } from "@/components/ui/responsive-heading";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <Container>
      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        {/* Left: content column */}
        <div className="space-y-6">
          {/* HistoryPanel（ダミー箱） */}
          <Card>
            <CardContent className="p-6 md:p-8">
              <H1>こごと — 古語を「身体で覚える」</H1>
              <p className="mb-6">
                視覚＋聴覚＋発話（＋表情）で、楽しく学ぶ学習アプリのプロトタイプ。
              </p>
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

          {/* ModeLaunchers（ダミー箱：既存ボタン流用） */}
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
        </div>

        {/* Right: CrabSpotlight placeholder */}
        <aside className="lg:sticky lg:top-6">
          <Card className="min-h-[360px] flex items-center justify-center">
            <CardContent className="p-6 md:p-8 w-full text-center">
              <p className="mb-2 font-semibold">カニ★スポットライト</p>
              <p className="opacity-80">（ここに Rive カニと小言/ご飯モードが入ります）</p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </Container>
  );
}
