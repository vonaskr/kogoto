import Link from "next/link";
import { Container } from "@/components/layout/container";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function RhythmHub() {
  return (
    <Container>
      <Card>
        <CardContent className="p-6 md:p-8">
          <h1 className="h1-fluid mb-4">リズム学習（ハブ）</h1>
          <p className="mb-6 opacity-80">ここから出題に進みます（ダミー）。</p>
          <Button asChild>
             <Link href="/rhythm/play">スタート</Link>
          </Button>
        </CardContent>
      </Card>
    </Container>
  );
}
