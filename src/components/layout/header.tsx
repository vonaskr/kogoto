"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function AppHeader({ className }: { className?: string }) {
  return (
    <header className={cn("mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-12 mt-4 mb-6", className)}>
      <div className="flex items-center justify-between gap-3
        bg-[var(--card)] border-4 border-[var(--border-strong)]
        rounded-[var(--radius-lg)] shadow-[var(--shadow-press)] px-3 py-2">
        {/* Left: ロゴ */}
        <Link href="/" className="inline-flex items-center gap-2">
          <span className="inline-grid place-items-center w-8 h-8
            rounded-[10px] border-4 border-[var(--border-strong)]
            bg-[var(--accent)] shadow-[var(--shadow-strong)] font-black">N</span>
          <span className="font-extrabold tracking-tight">こごと / Kogoto</span>
        </Link>

        {/* Center: ピルナビ */}
        <nav className="hidden md:flex items-center gap-2">
          {[
            { href: "/vocab", label: "単語" },
            { href: "/rhythm", label: "リズム" },
            { href: "/ambiguous", label: "曖昧クイズ" },
          ].map((i) => (
            <Link key={i.href}
              href={i.href}
              className="rounded-full px-3 py-1 border-4 border-[var(--border-strong)]
              bg-[var(--card)] shadow-[var(--shadow-strong)] text-sm hover:translate-x-[1px] hover:translate-y-[1px]">
              {i.label}
            </Link>
          ))}
        </nav>

        {/* Right: 将来用（設定） */}
        <div className="flex items-center gap-2">
          <Button variant="surface" size="sm">設定</Button>
        </div>
      </div>
    </header>
  );
}
