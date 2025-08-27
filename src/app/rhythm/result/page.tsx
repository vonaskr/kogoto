import { Container } from "@/components/layout/container";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

export default function RhythmResult() {
  return (
    <Container>
      <Card>
        <CardContent className="p-6 md:p-8">
          <h1 className="h1-fluid mb-4">リザルト（ダミー）</h1>
          <ul className="list-disc pl-5 space-y-1 mb-4">
            <li>正答率：80%</li>
            <li>COMBO：12</li>
            <li>誤答：#3, #9, #14</li>
          </ul>
          <Link className="underline" href="/rhythm">もう一度</Link>
        </CardContent>
      </Card>
    </Container>
  );
}
