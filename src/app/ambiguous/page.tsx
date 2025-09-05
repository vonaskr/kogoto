"use client";

import { useEffect, useRef, useState } from "react";
import { Container } from "@/components/layout/container";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { initFace, startFaceStream, stopFaceStream, disposeFace } from "@/lib/face";
import { loadVocabCsv, type Vocab } from "@/lib/vocab";
import { speak } from "@/lib/tts";
import { sfx } from "@/lib/sfx";
import { saveSession } from "@/lib/store";
import { useMetronome } from "@/lib/use-metronome";
import { useRouter } from "next/navigation";

export default function Ambiguous() {
  // ==== カメラ / 表情 ====
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [camReady, setCamReady] = useState<"idle" | "on" | "off" | "error">("idle");
  const [score, setScore] = useState<{ smile: number; frown: number }>({ smile: 0.5, frown: 0.5 });

  // EMA & 連続カウント（誤検知抑制）
  const emaRef = useRef({ smile: 0.5, frown: 0.5, posRun: 0, negRun: 0 });
  const TH = 0.65, RUN = 15, MARGIN = 0.08, ALPHA = 0.25;

  // ==== 出題プール ====
  const [pool, setPool] = useState<Vocab[]>([]);
  const [idx, setIdx] = useState(0);
  const current = pool[idx];

  // ==== リズム & フェーズ ====
  const [phase, setPhase] = useState<"idle" | "prompt" | "answering" | "judge">("idle");
  const beatsInPhaseRef = useRef(0); // そのフェーズ内で経過した拍数
  const [judgeMark, setJudgeMark] = useState<"ok" | "ng" | null>(null); // ○ × オーバーレイ
  const lockRef = useRef(false); // 二重判定防止
  const router = useRouter();
  // ==== セッション蓄積 ====
  type AmbItem = {
    vocabId: number; word: string; correctText: string; chosenText: string | null; correct: boolean;
  };
  const itemsRef = useRef<AmbItem[]>([]);
  const QUESTIONS_PER_SESSION = 5;

  // ==== スコア ====
  const [correctCount, setCorrectCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [combo, setCombo] = useState(0);
  const [comboMax, setComboMax] = useState(0);

  const { start: startMetro, stop: stopMetro, isRunning } = useMetronome(90, (beat) => {
    // 4分音符ごと（=1拍）に呼ばれる
    beatsInPhaseRef.current += 1;

    if (phase === "prompt" && beat === 1 && current) {
      // 1拍目でTTS提示
      speak(current.word, { lang: "ja-JP", rate: 0.95 });
      // すぐ回答フェーズへ（以降 3拍受付）
      setPhase("answering");
      beatsInPhaseRef.current = 0;
      sfx.click(); // 回答フェーズ突入の合図
    } else if (phase === "answering") {
      // 1拍目と3拍目にクリックSE（テンポ感の合図）
      if (beatsInPhaseRef.current === 1 || beatsInPhaseRef.current === 3) {
        sfx.click();
      }
      if (beatsInPhaseRef.current >= 3) {
        // タイムアップ → その瞬間の優位で自動決定
        const chosen: "pos" | "neg" = emaRef.current.smile >= emaRef.current.frown ? "pos" : "neg";
        doJudge(chosen);
      }
    } else if (phase === "judge") {
      // 判定表示は3拍 終わったら次の問題へ
      if (beatsInPhaseRef.current >= 3) {
        setJudgeMark(null);
        beatsInPhaseRef.current = 0;
        lockRef.current = false;
                // 5問到達なら finalize → 結果へ、まだなら次問へ
        if (itemsRef.current.length >= QUESTIONS_PER_SESSION) {
          const summary = finalizeSession();
          stopMetro();
          if (summary) {
            const { total, correct, streak } = summary;
            router.push(`/rhythm/result?total=${total}&correct=${correct}&streak=${streak}`);
          }
          setPhase("idle");
        } else {
          setPhase("prompt");
          next();
        }
      }
    }
  });

  // 画面モード: カメラ利用確認 → クイズ本体
  const [view, setView] = useState<"consent" | "quiz">("consent");

  // ==== カメラ操作 ====
  async function startCamera() {
    setCamReady("idle");
    if (!navigator.mediaDevices?.getUserMedia) {
      console.error("getUserMedia unsupported");
      setCamReady("error");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      if (!videoRef.current) return;
      videoRef.current.srcObject = stream;
      await new Promise<void>((res) => {
        const v = videoRef.current!;
        if (v.readyState >= 2) return res();
        v.onloadedmetadata = () => res();
      });
      await videoRef.current.play();
    } catch (e: any) {
      console.error("Camera error:", e?.name, e?.message, e);
      setCamReady("error");
      return;
    }
    try {
      await initFace();
    } catch (e: any) {
      console.error("MediaPipe init error:", e?.name, e?.message, e);
      setCamReady("error");
      return;
    }
    try {
      startFaceStream(videoRef.current!, {
        onScore: (s) => {
          // EMA更新
          const e = emaRef.current;
          e.smile = e.smile + ALPHA * (s.smile - e.smile);
          e.frown = e.frown + ALPHA * (s.frown - e.frown);
          setScore({ smile: e.smile, frown: e.frown });

          // 追加の自動確定（しきい値 連続RUN）※タイムアップ判定と二段構え
          if (phase === "answering" && !lockRef.current) {
            const posHit = e.smile > TH && e.smile - e.frown > MARGIN;
            const negHit = e.frown > TH && e.frown - e.smile > MARGIN;
            e.posRun = posHit ? e.posRun + 1 : 0;
            e.negRun = negHit ? e.negRun + 1 : 0;
            if (e.posRun >= RUN) doJudge("pos");
            else if (e.negRun >= RUN) doJudge("neg");
          } else {
            // answering 以外では走らせない
            e.posRun = 0; e.negRun = 0;
          }
        },
        fps: 20,
        inputSize: 128,
      });
      setCamReady("on");
    } catch (e: any) {
      console.error("Face stream error:", e?.name, e?.message, e);
      setCamReady("error");
    }
  }

  function stopCamera() {
    try {
      stopFaceStream();
      const tracks = (videoRef.current?.srcObject as MediaStream | null)?.getTracks() ?? [];
      tracks.forEach((t) => t.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
    } finally {
      setCamReady("off");
    }
  }

  // ==== 出題プールロード & クリーンアップ ====
  useEffect(() => {
    (async () => {
      const all = await loadVocabCsv("/vocab.csv");
      // neutral は除外
      const filtered = all.filter((v) => v.nuance === "pos" || v.nuance === "neg");
      // 軽いシャッフル
      setPool(filtered.sort(() => Math.random() - 0.5));
    })();
    return () => {
      finalizeSession();
      stopCamera();
      disposeFace();
      stopMetro();
    };
  }, [stopMetro]);

  // ==== 手動ボタン決定 ====
  function decide(chosen: "pos" | "neg") {
    if (phase !== "answering" || !current) return;
    doJudge(chosen);
  }

  // ==== 判定処理 ====
  function doJudge(chosen: "pos" | "neg") {
    if (lockRef.current || !current) return;
    lockRef.current = true;
    const correct = current.nuance === chosen;
    correct ? sfx.ok() : sfx.ng();
    setJudgeMark(correct ? "ok" : "ng");
    setPhase("judge");
    beatsInPhaseRef.current = 0;

    // スコア更新
    setTotalCount((c) => c + 1);
    if (correct) {
      setCorrectCount((c) => c + 1);
      setCombo((c) => {
        const next = c + 1;
        setComboMax((m) => Math.max(m, next));
        return next;
      });
    } else {
      setCombo(0);
    }

    // セッション保存（最小1問単位）
    saveSession({
      id: `${Date.now()}`,
      startedAt: Date.now(),
      items: [
        {
          vocabId: current.id,
          word: current.word,
          correctText: current.nuance === "pos" ? "ポジティブ" : "ネガティブ",
          chosenText: chosen === "pos" ? "ポジティブ" : "ネガティブ",
          correct,
        },
      ],
      correctRate: correct ? 1 : 0,
      comboMax: correct ? 1 : 0,
      earnedPoints: correct ? 1 : 0,
      wrongIds: correct ? [] : [current.id],
    });
     // セッション項目を蓄積
     const item: AmbItem = {
     vocabId: current.id,
     word: current.word,
     correctText: current.nuance === "pos" ? "ポジティブ" : "ネガティブ",
     chosenText: chosen === "pos" ? "ポジティブ" : "ネガティブ",
     correct,
     };
   itemsRef.current.push(item);
  }

  function finalizeSession() {
    const items = itemsRef.current;
    if (!items.length) return null;
    const correctN = items.filter((it: AmbItem) => it.correct).length;
    const wrongIds = items.filter((it: AmbItem) => !it.correct).map((it) => it.vocabId);
    saveSession({
      id: `${Date.now()}`,
      startedAt: Date.now(),
      items,
      correctRate: items.length ? correctN / items.length : 0,
      comboMax,
      earnedPoints: correctN, // ひとまず正解数=ポイント
      wrongIds,
    });
    itemsRef.current = []; // クリア
    return { total: items.length, correct: correctN, streak: comboMax };
  }

  // ==== 次の問題へ ====
  function next() {
    emaRef.current = { smile: 0.5, frown: 0.5, posRun: 0, negRun: 0 };
    setIdx((i) => (i + 1) % Math.max(1, pool.length));
  }

  // ==== 選択肢ハイライト ====
  const posActive = phase === "answering" && score.smile - score.frown > 0.04;
  const negActive = phase === "answering" && score.frown - score.smile > 0.04;

  // ==== クイズ開始 ====
  function startQuiz() {
    if (!current) return;
    setJudgeMark(null);
    lockRef.current = false;
    beatsInPhaseRef.current = 0;
    setPhase("prompt");
    if (!isRunning) startMetro(); // Tone.start()はボタン押下内
  }

  async function startWithCamera() {
    await startCamera();
    setView("quiz");
    startQuiz();
  }
  function startWithoutCamera() {
    stopCamera(); // 念のため停止状態へ
    setView("quiz");
    startQuiz();
  }

  return (
    <Container>
      {view === "consent" ? (
        <Card pressable={false}>
          <CardContent className="p-6 md:p-8">
            <h1 className="h1-fluid mb-3">カメラを使いますか？</h1>
            <p className="opacity-80 mb-4">
              カメラONだと表情で自動回答できます。OFFでもボタンで回答できます。
            </p>
            <div className="rounded-[var(--radius-lg)] border-4 border-[var(--border-strong)] p-4 mb-5">
              <div className="font-semibold mb-2">表情の作り方</div>
              <ul className="list-disc pl-5 text-sm opacity-80 space-y-1">
                <li>ポジティブ：口角を上げて<span className="font-semibold">笑顔</span></li>
                <li>ネガティブ：<span className="font-semibold">しかめ顔</span>、または<strong>口を開ける</strong>（判定補助）</li>
              </ul>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button onClick={startWithCamera}>カメラOKで開始</Button>
              <Button variant="surface" onClick={startWithoutCamera}>カメラなしで開始</Button>
              <Button variant="surface" onClick={() => history.back()}>戻る</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 出題カード */}
        <Card pressable={false}>
          <CardContent className="p-6 md:p-8 relative">
             <div className="mb-4 flex items-center justify-between">
              <div>
                <h1 className="h1-fluid">曖昧クイズ</h1>
                <p className="text-sm opacity-70">
                  {correctCount}/{totalCount} 正解　
                  コンボ: {combo}（最高 {comboMax}）
                </p>
              </div>
              <div className="flex gap-2">
                 {!isRunning ? (
                    <Button onClick={startQuiz}>開始</Button>
                  ) : (
                       <Button
                        variant="surface"
                        onClick={() => {
                          const summary = finalizeSession();   // ここまでの回答を保存
                          stopMetro();
                          if (summary && summary.total > 0) {
                            const { total, correct, streak } = summary;
                            router.push(`/rhythm/result?total=${total}&correct=${correct}&streak=${streak}`);
                          } else {
                            router.push("/"); // 1問も答えていないときはホーム
                          }
                          setPhase("idle");
                        }}
                      >
                        やめる
                      </Button>
                  )}
              </div>
            </div>

            {/* 単語 */}
            <div className="mb-6 text-4xl md:text-5xl font-bold tracking-wide">
              {current ? current.word : "読み込み中..."}
            </div>

            {/* 選択肢（表情に応じて強調） */}
            <div className="mb-4 flex gap-3">
              <Button
                variant={posActive ? "accent" : "surface"}
                onClick={() => decide("pos")}
                className="flex-1"
              >
                ポジティブ
              </Button>
              <Button
                variant={negActive ? "accent" : "surface"}
                onClick={() => decide("neg")}
                className="flex-1"
              >
                ネガティブ
              </Button>
            </div>


            {/* ビート目盛り（●●●） */}
            <div className="mt-2 flex gap-2">
              {[1,2,3].map((n) => {
                const active = phase === "answering" && beatsInPhaseRef.current >= n;
                return (
                  <div
                    key={n}
                    className="h-2 w-full rounded border-2"
                    style={{
                      borderColor: "var(--border-strong)",
                      background: active
                        ? "color-mix(in srgb, var(--primary) 60%, var(--background))"
                        : "color-mix(in srgb, var(--border) 30%, var(--background))",
                    }}
                  />
                );
              })}
            </div>
            {/* 判定オーバーレイ（○×＋意味） */}
            {judgeMark && (
              <div className="absolute inset-0 grid place-items-center pointer-events-none">
                <div className="text-center">
                  <div
                    className="text-[min(18vw,160px)] font-extrabold animate-scaleIn leading-none"
                    style={{ color: judgeMark === "ok" ? "var(--primary)" : "var(--accent)" }}
                  >
                    {judgeMark === "ok" ? "○" : "×"}
                  </div>
                  {current && (
                    <div className="mt-2 text-xl md:text-2xl font-semibold"
                         style={{ color: "var(--foreground)" }}>
                      {current.meanings?.[0] ?? ""}
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* カメラカード */}
        <Card pressable={false}>
          <CardContent className="p-6 md:p-8">
            <div className="mb-3 flex items-center justify-between">
              <div className="font-semibold">カメラ</div>
              <div className="text-sm opacity-70">
                状態：{camReady === "idle" && "未開始"}
                {camReady === "on" && "動作中"}
                {camReady === "off" && "停止"}
                {camReady === "error" && "エラー/拒否"}
              </div>
            </div>
            <div className="mb-4">
              <video
                ref={videoRef}
                className="w-full h-48 md:h-56 rounded-[var(--radius-lg)] border-4 border-[var(--border-strong)] object-cover bg-[color-mix(in_srgb,var(--card)_70%,var(--background))]"
                muted
                playsInline
                autoPlay
              />
            </div>
            <div className="mb-6 flex gap-2">
              {camReady !== "on" ? (
                <Button onClick={startCamera}>カメラを使う</Button>
              ) : (
                <Button variant="surface" onClick={stopCamera}>カメラを止める</Button>
              )}
            </div>

            {/* 表情ゲージ */}
            <div className="space-y-3">
              <div className="text-sm opacity-70">smile {Math.round(score.smile * 100)}%</div>
              <div className="h-3 w-full rounded bg-[color-mix(in_srgb,var(--primary)_15%,var(--background))]">
                <div
                  className="h-3 rounded bg-[var(--primary)]"
                  style={{ width: `${Math.round(score.smile * 100)}%` }}
                />
              </div>
              <div className="text-sm opacity-70">frown {Math.round(score.frown * 100)}%</div>
              <div className="h-3 w-full rounded bg-[color-mix(in_srgb,var(--accent)_15%,var(--background))]">
                <div
                  className="h-3 rounded bg-[var(--accent)]"
                  style={{ width: `${Math.round(score.frown * 100)}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      )}
    </Container>
  );
}
