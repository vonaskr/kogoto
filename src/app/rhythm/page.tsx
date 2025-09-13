import Link from "next/link";
import { Container } from "@/components/layout/container";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function RhythmHub() {
  return (
    <Container>
      <Card>
        <CardContent className="p-6 md:p-8">
          <Link href="/voice-transcribe">文字起こしページ</Link>
          <h1 className="h1-fluid mb-4">リズム学習（ハブ）</h1>
          <p className="mb-6 opacity-80">通常／復習のどちらかを選んで開始します。</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button asChild>
              <Link href="/rhythm/play">通常モード</Link>
            </Button>
            <Button asChild variant="accent">
              <Link href="/rhythm/play?mode=review">復習モード</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </Container>
  );
}
