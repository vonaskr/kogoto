import { Container } from "@/components/layout/container";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

export default function RhythmResult({
  searchParams,
}: {
  searchParams: { total?: string; correct?: string; streak?: string };
}) {
  const total = Number(searchParams.total ?? 0);
  const correct = Number(searchParams.correct ?? 0);
  const streak = Number(searchParams.streak ?? 0);
  const acc = total > 0 ? Math.round((correct / total) * 100) : 0;

  return (
    <Container>
      <Card>
        <CardContent className="p-6 md:p-8">
          <h1 className="h1-fluid mb-4">リザルト</h1>
          <ul className="list-disc pl-5 space-y-1 mb-4">
            <li>正答数：{correct} / {total}</li>
            <li>正答率：{acc}%</li>
            <li>最大COMBO：{streak}</li>
          </ul>
          <div className="flex gap-3">
            <Link className="underline" href="/rhythm">もう一度</Link>
            <Link className="underline" href="/">ホームへ</Link>
          </div>
        </CardContent>
      </Card>
    </Container>
  );
}