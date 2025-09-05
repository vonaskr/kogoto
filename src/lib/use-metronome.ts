// src/lib/use-metronome.ts
"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import * as Tone from "tone";

/**
 * 4分音符ごと（=1拍）に onBeat を呼ぶメトロノーム。
 * - start() はユーザー操作から呼ぶ（Tone.start()の都合）。
 * - onBeat(beat, time): beat は 1..4 で循環。
 */
export function useMetronome(
  initialBpm = 90,
  onBeat?: (beat: number, time: number) => void
) {
  const [bpm, setBpmState] = useState(initialBpm);
  const [isRunning, setIsRunning] = useState(false);
  const schedIdRef = useRef<number | null>(null);
  const beatRef = useRef(0); // 0..3
  const onBeatRef = useRef<((beat: number, time: number) => void) | null>(null);
  useEffect(() => {
    onBeatRef.current = onBeat ?? null;
  }, [onBeat]);
  
  const clear = useCallback(() => {
    Tone.Transport.cancel();
    if (schedIdRef.current != null) {
      Tone.Transport.clear(schedIdRef.current);
      schedIdRef.current = null;
    }
  }, []);

  const schedule = useCallback(() => {
    clear();
    beatRef.current = 0;
    Tone.Transport.bpm.value = bpm;
    schedIdRef.current = Tone.Transport.scheduleRepeat((time: number) => {
      // 0→1,2,3,4…にして渡す
      beatRef.current = (beatRef.current + 1) % 4;
      const oneBased = beatRef.current + 1; // 1..4
      onBeatRef.current?.(oneBased, time);
    }, "4n"); // quarter note
  }, [bpm, clear]);


  const start = useCallback(async () => {
    await Tone.start();         // ユーザー操作内で呼ぶこと
    schedule();
    Tone.Transport.start("+0.0");
    setIsRunning(true);
  }, [schedule]);

  const stop = useCallback(() => {
    Tone.Transport.stop();
    clear();
    setIsRunning(false);
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, [clear]);

  // BPM変更API
  const setBpm = useCallback((next: number) => {
    setBpmState(next);
    if (isRunning) {
      Tone.Transport.bpm.rampTo(next, 0.05);
    }
  }, [isRunning]);

  // アンマウント時クリーンアップ
  useEffect(() => () => stop(), [stop]);

  return { bpm, setBpm, isRunning, start, stop };
}
