// components/home/mode-launchers.tsx
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { ActionsRow } from "@/components/layout/actions-row";
import { Button } from "@/components/ui/button";

export function ModeLaunchers() {
  return (
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
  );
}
