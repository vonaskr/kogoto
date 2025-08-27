// components/home/history-panel.tsx
import { Card, CardContent } from "@/components/ui/card";

type Props = {
  minutes?: number;
  learned?: number;
  total?: number;
  streak?: number;
};

export function HistoryPanel({
  minutes = 120,
  learned = 210,
  total = 315,
  streak = 5,
}: Props) {
  return (
    <Card>
      <CardContent className="p-6 md:p-8">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-extrabold">{minutes}</div>
            <div className="text-sm opacity-80">学習分</div>
          </div>
          <div>
            <div className="text-2xl font-extrabold">
              {learned}/{total}
            </div>
            <div className="text-sm opacity-80">習得語</div>
          </div>
          <div>
            <div className="text-2xl font-extrabold">{streak}</div>
            <div className="text-sm opacity-80">連続日</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
