// src/components/home/mode-launchers.tsx
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActionsRow } from "@/components/layout/actions-row";
import { Button as NbButton } from "@/components/ui/nb-button";

export function ModeLaunchers() {
  return (
    <Card pressable={false}>
      <CardHeader className="pb-0">
        <CardTitle>学習をはじめる</CardTitle>
      </CardHeader>
      <CardContent className="p-6 md:p-8 pt-4">
        <ActionsRow>
          <NbButton asChild>
            <Link href="/rhythm">リズム学習</Link>
          </NbButton>
          <NbButton asChild variant="accent">
            <Link href="/ambiguous">曖昧クイズ</Link>
          </NbButton>
          <NbButton asChild variant="neutral">
            <Link href="/vocab">単語リスト</Link>
          </NbButton>
        </ActionsRow>
      </CardContent>
    </Card>
  );
}
