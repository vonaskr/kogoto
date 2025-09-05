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

export default function Ambiguous() {
   const videoRef = useRef<HTMLVideoElement | null>(null);
   const [camReady, setCamReady] = useState<"idle" | "on" | "off" | "error">("idle");
   const [score, setScore] = useState<{ smile: number; frown: number }>({ smile: 0.5, frown: 0.5 });
   const [pool, setPool] = useState<Vocab[]>([]);
   const [idx, setIdx] = useState(0);
   const current = pool[idx];

   // EMA & 連続カウント（誤検知抑制）
   const emaRef = useRef({ smile: 0.5, frown: 0.5, posRun: 0, negRun: 0 });
   const TH = 0.65, RUN = 15, MARGIN = 0.08, ALPHA = 0.25;

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
       // メタデータ読み込み後に play（たまに必要）
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
           // しきい値＋連続判定
           const posHit = e.smile > TH && e.smile - e.frown > MARGIN;
           const negHit = e.frown > TH && e.frown - e.smile > MARGIN;
           e.posRun = posHit ? e.posRun + 1 : 0;
           e.negRun = negHit ? e.negRun + 1 : 0;
           if (e.posRun >= RUN) decide("pos");
           else if (e.negRun >= RUN) decide("neg");
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

   useEffect(() => {
     // 出題プール読み込み（neutralは除外・軽くシャッフル）
     (async () => {
       const all = await loadVocabCsv("/vocab.csv");
       const filtered = all.filter(v => v.nuance === "pos" || v.nuance === "neg");
       setPool(filtered.sort(() => Math.random() - 0.5));
     })();
     return () => { stopCamera(); disposeFace(); };
   }, []);

   useEffect(() => {
     if (current) speak(current.word, { lang: "ja-JP", rate: 0.95 });
   }, [idx]); // 次の語でTTS

   function next() {
     emaRef.current = { smile: 0.5, frown: 0.5, posRun: 0, negRun: 0 };
     setIdx((i) => (i + 1) % Math.max(1, pool.length));
   }

   function decide(chosen: "pos" | "neg") {
     if (!current) return;
     const correct = current.nuance === chosen;
     correct ? sfx.ok() : sfx.ng();
     // 1問=1セッションで最小保存（後でまとめ保存に変更可）
     saveSession({
       id: `${Date.now()}`,
       startedAt: Date.now(),
       items: [{
         vocabId: current.id,
         word: current.word,
         correctText: current.nuance === "pos" ? "ポジ" : "ネガ",
         chosenText: chosen === "pos" ? "ポジ" : "ネガ",
         correct,
       }],
       correctRate: correct ? 1 : 0,
       comboMax: correct ? 1 : 0,
       earnedPoints: correct ? 1 : 0,
       wrongIds: correct ? [] : [current.id],
     });
     next();
   }

  return (
    <Container>
      <Card>
        <CardContent className="p-6 md:p-8">
          <h1 className="h1-fluid mb-4">曖昧クイズ（MVP配線）</h1>
           <p className="mb-4 opacity-80">
             カメラ許諾→表情スコア（smile/frown）を取得。拒否やエラー時はボタンで回答。
           </p>
            {current && (
              <div className="mb-4 text-2xl font-bold">{current.word}</div>
            )}
           {/* カメラ操作行 */}
           <div className="mb-4 flex flex-wrap items-center gap-3">
             {camReady !== "on" ? (
               <Button onClick={startCamera}>カメラを使う</Button>
             ) : (
               <Button variant="surface" onClick={stopCamera}>カメラを止める</Button>
             )}
             <span className="text-sm opacity-70">
               状態: {camReady === "idle" && "未開始"}
               {camReady === "on" && "動作中"}
               {camReady === "off" && "停止"}
               {camReady === "error" && "エラー/拒否"}
             </span>
           </div>

           {/* プレビュー＆ゲージ（負荷を抑えるため小さめ） */}
           <div className="mb-6 flex items-end gap-4">
             <video
               ref={videoRef}
               className="h-28 w-36 rounded-[var(--radius-lg)] border-4 border-[var(--border-strong)] object-cover"
               muted
               playsInline
               autoPlay
             />
             <div className="flex-1">
               <div className="mb-2 text-sm opacity-70">smile {Math.round(score.smile * 100)}%</div>
               <div className="mb-3 h-3 w-full rounded bg-[color-mix(in_srgb,var(--primary)_15%,var(--background))]">
                 <div
                   className="h-3 rounded bg-[var(--primary)]"
                   style={{ width: `${Math.round(score.smile * 100)}%` }}
                 />
               </div>
               <div className="mb-2 text-sm opacity-70">frown {Math.round(score.frown * 100)}%</div>
               <div className="h-3 w-full rounded bg-[color-mix(in_srgb,var(--accent)_15%,var(--background))]">
                 <div
                   className="h-3 rounded bg-[var(--accent)]"
                   style={{ width: `${Math.round(score.frown * 100)}%` }}
                 />
               </div>
             </div>
           </div>

            {/* 回答UI：カメラOKでも手動入力できるよう残す */}
           <div className="flex gap-3">
             <Button variant="accent" onClick={() => decide("pos")}>ポジ</Button>
             <Button variant="surface" onClick={() => decide("neg")}>ネガ</Button>
           </div>
          </CardContent>
        </Card>
      </Container>
    );
  }
