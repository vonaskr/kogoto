import Link from "next/link";
import { Container } from "@/components/layout/container";
import { ActionsRow } from "@/components/layout/actions-row";
import { H1 } from "@/components/ui/responsive-heading";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <Container>
      <Card>
        <CardContent className="p-6 md:p-8">
          <H1>こごと — 古語を「身体で覚える」</H1>
          <p className="mb-6">視覚＋聴覚＋発話（＋表情）で、楽しく学ぶ学習アプリのプロトタイプ。</p>

          <ActionsRow>
            <Button asChild block className="sm:flex-1">
              <Link href="/rhythm">リズム学習（準備中）</Link>
            </Button>
            <Button variant="accent" asChild block className="sm:flex-1">
              <Link href="/ambiguous">曖昧クイズ（準備中）</Link>
            </Button>
          </ActionsRow>
        </CardContent>
      </Card>
    </Container>
    
  );
}
