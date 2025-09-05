// src/lib/tts.ts
"use client";

export type SpeakOptions = {
  lang?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
};

export function speak(text: string, opts: SpeakOptions = {}) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = opts.lang ?? "ja-JP";
  u.rate = opts.rate ?? 1.0;
  u.pitch = opts.pitch ?? 1.0;
  u.volume = opts.volume ?? 1.0;
  window.speechSynthesis.cancel(); // 直前の読み上げを打ち切る
  window.speechSynthesis.speak(u);
}
