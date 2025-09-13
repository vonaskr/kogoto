// src/lib/sfx.ts
"use client";

let ctx: AudioContext | null = null;

type AudioContextCtor = { new(): AudioContext };
function getAudioContextCtor(): AudioContextCtor {
  const w = window as unknown as { webkitAudioContext?: AudioContextCtor };
  return (window.AudioContext ?? w.webkitAudioContext!) as AudioContextCtor;
}
function ensureCtx(): AudioContext {
  if (!ctx) ctx = new (getAudioContextCtor())();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function beep(freq: number, durMs = 90, type: OscillatorType = "sine", gain = 0.05) {
  const ac = ensureCtx();
  const now = ac.currentTime;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  g.gain.value = gain;
  osc.connect(g).connect(ac.destination);
  osc.start(now);
  osc.stop(now + durMs / 1000);
}

export const sfx = {
  click() { beep(740, 40, "square", 0.03); },
  // 正解：短い高音→少し低い音（倍音少なめ）
  ok() {
    const ac = ensureCtx();
    const now = ac.currentTime;
    // ピン
    const osc1 = ac.createOscillator();
    const g1 = ac.createGain();
    osc1.type = "sine";
    osc1.frequency.value = 1200;
    g1.gain.value = 0.05;
    osc1.connect(g1).connect(ac.destination);
    osc1.start(now);
    g1.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    osc1.stop(now + 0.14);
    // ポーン
    const osc2 = ac.createOscillator();
    const g2 = ac.createGain();
    osc2.type = "sine";
    osc2.frequency.value = 880;
    g2.gain.value = 0.05;
    osc2.connect(g2).connect(ac.destination);
    osc2.start(now + 0.12);
    g2.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
    osc2.stop(now + 0.34);
  },
  // 不正解：低音ノコギリでビビり
  ng() {
    const ac = ensureCtx();
    const now = ac.currentTime;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = "sawtooth";
    osc.frequency.value = 180;
    g.gain.value = 0.045;
    osc.connect(g).connect(ac.destination);
    osc.start(now);
    // ブッ・ブー（ゲートで2回に切る）
    g.gain.setValueAtTime(0.045, now);
    g.gain.setValueAtTime(0.0, now + 0.12);
    g.gain.setValueAtTime(0.045, now + 0.18);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
    osc.stop(now + 0.44);
  },
};
