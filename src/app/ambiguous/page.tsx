import { Container } from "@/components/layout/container";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Ambiguous() {
  return (
    <Container>
      <Card>
        <CardContent className="p-6 md:p-8">
          <h1 className="h1-fluid mb-4">曖昧クイズ（ダミー）</h1>
          <p className="mb-4 opacity-80">表情で「ポジ／ネガ」を選ぶ想定。いまはボタンで代用。</p>
          <div className="flex gap-3">
            <Button variant="accent">ポジ</Button>
            <Button variant="surface">ネガ</Button>
          </div>
        </CardContent>
      </Card>
    </Container>
  );
}
