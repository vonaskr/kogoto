"use client"

import { Container } from "@/components/layout/container";
import { useMemo, useState } from "react";
import { VocabGrid, type Vocab } from "@/components/vocab/vocab-grid";
import { VocabFilterTabs, type VocabFilter } from "@/components/vocab/vocab-filter";

// ダミーデータ（適当に3状態を混ぜる）
const DUMMY: Vocab[] = Array.from({ length: 24 }).map((_, i) => {
  const mod = i % 3;
  const state = mod === 0 ? "new" : mod === 1 ? "learned" : "wrong";
  return {
    id: String(i + 1),
    word: `古語${i + 1}`,
    reading: `こご ${i + 1}`,
    meaning: ["意味その1", "意味その2"],
    state,
  };
});

export default function VocabPage() {
  const [filter, setFilter] = useState<VocabFilter>("all");
  const list = useMemo(() => {
    if (filter === "all") return DUMMY;
    if (filter === "new") return DUMMY.filter((v) => v.state === "new");
    return DUMMY.filter((v) => v.state === "wrong");
  }, [filter]);

  return (
    <Container>
      <h1 className="h1-fluid mb-4">単語リスト</h1>
      <VocabFilterTabs value={filter} onChange={setFilter} className="mb-4" />
      <VocabGrid items={list} />
    </Container>
  );
}