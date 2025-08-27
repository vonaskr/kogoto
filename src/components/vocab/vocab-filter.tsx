// src/components/vocab/vocab-filter.tsx
"use client";

import { cn } from "@/lib/utils";

export type VocabFilter = "all" | "new" | "review";

export function VocabFilterTabs({
  value,
  onChange,
  className,
}: {
  value: VocabFilter;
  onChange: (v: VocabFilter) => void;
  className?: string;
}) {
  const Item = ({
    v,
    label,
  }: {
    v: VocabFilter;
    label: string;
  }) => (
    <button
      type="button"
      onClick={() => onChange(v)}
      className={cn(
        "px-3 py-1 rounded-lg border-2 border-[var(--border-strong)]",
        "transition-colors",
        value === v
          ? "bg-[var(--primary)]/30"
          : "bg-[var(--card)] hover:bg-[var(--card)]/70"
      )}
    >
      {label}
    </button>
  );

  return (
    <div className={cn("flex gap-2", className)}>
      <Item v="all" label="すべて" />
      <Item v="new" label="未出題" />
      <Item v="review" label="復習対象" />
    </div>
  );
}
