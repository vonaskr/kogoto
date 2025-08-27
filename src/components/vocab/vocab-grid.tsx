// src/components/vocab/vocab-grid.tsx
"use client";

import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";

export type Vocab = {
  id: string;
  word: string;
  reading: string;
  meaning: string[];
  state: "new" | "learned" | "wrong"; // 表示用の簡易状態
};

export function VocabGrid({ items }: { items: Vocab[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {items.map((v) => (
        <Popover key={v.id}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                "aspect-square rounded-[var(--radius-lg)] border-4 shadow-[var(--shadow-strong)]",
                "flex items-center justify-center text-base font-semibold",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                v.state === "new" &&
                "bg-neutral-200/40 border-[var(--border-strong)]",
                v.state === "learned" &&
                "bg-[var(--primary)]/30 border-[var(--border-strong)]",
                v.state === "wrong" &&
                "bg-[var(--accent)]/30 border-[var(--border-strong)]"
              )}
              aria-label={`${v.word} のプレビュー`}
            >
              {v.word}
            </button>
          </PopoverTrigger>
          <PopoverContent
            side="top"
            align="center"
            className="w-[220px] bg-[var(--card)] border-4 border-[var(--border-strong)] rounded-[var(--radius-lg)] shadow-[var(--shadow-strong)]"
          >
            <div className="text-sm font-semibold">{v.word}</div>
            <div className="text-xs opacity-80 mt-0.5">（{v.reading}）</div>
            <ul className="mt-2 list-disc list-inside text-sm">
              {v.meaning.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          </PopoverContent>
        </Popover>
      ))}
    </div>
  );
}
