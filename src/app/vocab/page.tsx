import { Container } from "@/components/layout/container";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const dummy = Array.from({ length: 18 }).map((_, i) => {
  const mod = i % 3;
  return { id: String(i + 1), state: mod === 0 ? "new" : mod === 1 ? "learned" : "wrong" } as
    | { id: string; state: "new" | "learned" | "wrong" };
});

export default function VocabPage() {
  return (
    <Container>
      <h1 className="h1-fluid mb-4">単語リスト（ダミー）</h1>

      <div className="mb-4 flex gap-2">
        <button className="px-3 py-1 rounded-lg border-2 border-[var(--border-strong)] bg-[var(--card)]">すべて</button>
        <button className="px-3 py-1 rounded-lg border-2 border-[var(--border-strong)] bg-[var(--card)]">未出題</button>
        <button className="px-3 py-1 rounded-lg border-2 border-[var(--border-strong)] bg-[var(--card)]">復習対象</button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {dummy.map((v) => (
          <div
            key={v.id}
            className={cn(
              "aspect-square rounded-[var(--radius-lg)] border-4 shadow-[var(--shadow-strong)]",
              "flex items-center justify-center text-sm font-semibold",
              v.state === "new" && "bg-neutral-200/40 border-[var(--border-strong)]",
              v.state === "learned" && "bg-[var(--primary)]/30 border-[var(--border-strong)]",
              v.state === "wrong" && "bg-[var(--accent)]/30 border-[var(--border-strong)]"
            )}
          >
            #{v.id}
          </div>
        ))}
      </div>
    </Container>
  );
}
