// src/lib/sfx.ts
"use client";

let ctx: AudioContext | null = null;

function ensureCtx() {
  if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  // iOSなどで必要な場合は resume
  if (ctx.state === "suspended") ctx.resume();
  return ctx!;
}

function beep(freq: number, durMs = 90, type: OscillatorType = "sine", gain = 0.05) {
  const ac = ensureCtx();
  const now = ac.currentTime;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.value = gain;
  osc.connect(g).connect(ac.destination);
  osc.start(now);
  osc.stop(now + durMs / 1000);
}

export const sfx = {
  click() { beep(660, 60, "square", 0.04); },
  ok() { beep(880, 100, "sine", 0.05); },
  ng() { beep(220, 140, "sine", 0.06); },
};
