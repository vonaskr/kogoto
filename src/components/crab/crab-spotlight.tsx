// src/components/crab/crab-spotlight.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  useRive,
  useStateMachineInput,
  Layout,
  Fit,
  Alignment,
} from "@rive-app/react-canvas";

// ★ Rive Editor と完全一致させる
const ARTBOARD = "Crab";
const STATE_MACHINE = "CrabMachine";
const TRIGGER = "onCorrect";
const TRIGGER_WRONG = "onWrong";

export function CrabSpotlight() {
  const [mode, setMode] = useState<"talk" | "feed">("talk");
  const [points, setPoints] = useState(120);
  const [affinity, setAffinity] = useState(0.35); // 0..1
  const feedItems = useMemo(
    () => [
      { id: "a", name: "えび",   emoji: "🦐", cost: 10, exp: 0.06 },
      { id: "b", name: "ホタテ", emoji: "🦪", cost: 18, exp: 0.10 },
      { id: "c", name: "カニかま", emoji: "🦀", cost: 6, exp: 0.035 },
    ],
    []
  );  
  
  // /app/test と同条件：react-canvas + artboard + stateMachines + layout
  const { rive, RiveComponent } = useRive({
    src: "/crab.riv", // ← ここは絶対パス。http://localhost:3000/crab.riv で200確認済
    artboard: ARTBOARD,
    stateMachines: STATE_MACHINE,
    autoplay: true,
    layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }),
  });

  // Trigger（ロード前は undefined になり得る）
  const onCorrect = useStateMachineInput(rive, STATE_MACHINE, TRIGGER);
  const onWrong   = useStateMachineInput(rive, STATE_MACHINE, TRIGGER_WRONG);

  //helper
  const fireCorrect = () => onCorrect?.fire?.();
  const fireWrong   = () => onWrong?.fire?.();

  // kani gohan
  const handleFeed = (cost: number, exp: number) => {
    if (points < cost) return; // 足りない時は無視（後でシェイクなど）
    setPoints(p => p - cost);
    setAffinity(a => Math.min(1, a + exp));
    fireCorrect(); // 食べたら小喜び
  };

  // デバッグ：Inputs が本当に見えているかを一度だけログ
  useEffect(() => {
    if (!rive) return;
    try {
      const names = rive
        .stateMachineInputs(STATE_MACHINE)
        ?.map((i: any) => i.name);
      console.log("[RIVE] inputs:", names);
    } catch {}
  }, [rive]);

  // クリックで onCorrect を fire（存在しなければ何もしない）
  const fire = () => {
    if (!onCorrect) {
      console.warn(`Trigger "${TRIGGER}" not ready`);
      return;
    }
    onCorrect.fire();
  };

  return (
    <Card>
      <CardContent className="p-6 md:p-8">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="font-semibold">カニ★スポットライト</p>
          <div className="flex gap-2">
            <Button size="sm" variant={mode === "talk" ? "primary" : "surface"} onClick={() => setMode("talk")}>
              小言
            </Button>
            <Button size="sm" variant={mode === "feed" ? "accent" : "surface"} onClick={() => setMode("feed")}>
              ご飯
            </Button>
          </div>
        </div>

        {/* キャンバスは高さが無いと描画されません → 明示 */}
        <div className="w-full h-[300px]">
          <RiveComponent className="w-full h-full" />
        </div>

                {/* デバッグ操作（必要に応じて残す/隠す） */}
        <div className="mt-3 flex flex-wrap gap-2 items-center justify-center">
          <Button size="sm" onClick={fireCorrect} disabled={!onCorrect}>正解トリガ</Button>
          <Button size="sm" variant="surface" onClick={fireWrong} disabled={!onWrong}>誤答トリガ</Button>
        </div>

        {/* 下段：モード別ビュー（最小実装） */}
        {mode === "talk" ? (
          <div className="mt-4 rounded-[var(--radius-lg)] border-4 border-[var(--border-strong)] bg-[var(--card)] px-4 py-3">
            <p className="text-sm opacity-90">カニ「今日もコツコツ〜」</p>
            <div className="text-xs opacity-60">（タップで次の小言…は後で）</div>
          </div>
        ) : (
          <div className="mt-4 rounded-[var(--radius-lg)] border-4 border-[var(--border-strong)] bg-[var(--card)] px-4 py-4">
            <div className="mb-3 flex flex-wrap gap-2 items-center">
              <span className="inline-flex items-center gap-2 rounded-full border-2 border-[var(--border-strong)] px-3 py-1 bg-[var(--card)] text-sm">
                Pt: <strong>{points}</strong>
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border-2 border-[var(--border-strong)] px-3 py-1 bg-[var(--card)] text-sm">
                友好度: <strong>{Math.round(affinity * 100)}%</strong>
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {feedItems.map((f) => (
                <button
                  key={f.id}
                  onClick={() => handleFeed(f.cost, f.exp)}
                  className="rounded-[var(--radius-lg)] border-4 border-[var(--border-strong)] bg-[var(--card)] shadow-[var(--shadow-strong)] p-3 text-center hover:scale-[0.99] transition"
                >
                  <div className="text-2xl">{f.emoji}</div>
                  <div className="text-sm font-semibold mt-1">{f.name}</div>
                  <div className="text-xs opacity-70 mt-1">- {f.cost}pt / {Math.round(f.exp*100)}%</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ちょいデバッグ */}
        <div className="mt-2 text-xs opacity-60 text-center">
          <code>inputs:{String(Boolean(onCorrect))}/{String(Boolean(onWrong))}</code>
        </div>
        
      </CardContent>
    </Card>
  );
}

// // src/components/crab/crab-spotlight.tsx
// "use client";

// import { useEffect, useMemo, useState } from "react";
// import { Card, CardContent } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import {
//   useRive,
//   useStateMachineInput,
//   Layout,
//   Fit,
//   Alignment,
// } from "@rive-app/react-canvas";

// /** Rive 定数（Rive Editor 側と完全一致させる） */
// const ARTBOARD = "Crab";
// const STATE_MACHINE = "CrabMachine";
// const TRG_CORRECT = "onCorrect";
// const TRG_WRONG = "onWrong";
// const BOOL_WALK = "isWalking";
// const NUM_TIER = "comboTier";

// /** Rive の最小プレイヤー（Machine 固定） */
// function RivePlayer({
//   onReady,
//   onError,
// }: {
//   onReady?: () => void;
//   onError?: (e: unknown) => void;
// }) {
//   const { rive, RiveComponent } = useRive({
    
//     // ★ /app/test と同じ参照に合わせる（これで動作確認済）
//     src: "/crab.riv",
//     artboard: ARTBOARD,
//     stateMachines: STATE_MACHINE,
//     autoplay: true,
//     layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }),
//     onLoad: () => onReady?.(),
//     onLoadError: (e) => onError?.(e),
//   });
//   useEffect(() => {
//   if (!rive) return;
//   try {
//     const names = rive.stateMachineInputs(STATE_MACHINE)?.map((i: any) => i.name) ?? [];
//     console.log("[RIVE] inputs:", names);
//   } catch (e) {
//     console.warn("[RIVE] inputs read failed", e);
//   }
// }, [rive]);


//   // Machine Inputs
//   const onCorrect = useStateMachineInput(rive, STATE_MACHINE, TRG_CORRECT);
//   const onWrong = useStateMachineInput(rive, STATE_MACHINE, TRG_WRONG);
//   const isWalking = useStateMachineInput(rive, STATE_MACHINE, BOOL_WALK);
//   const comboTier = useStateMachineInput(rive, STATE_MACHINE, NUM_TIER);

//   // 初期値（任意）
//   useEffect(() => {
//     if (!rive) return;
//     if (isWalking && typeof isWalking.value === "boolean") isWalking.value = false;
//     if (comboTier && typeof comboTier.value === "number") comboTier.value = 0;
//   }, [rive, isWalking, comboTier]);

//   // 親から呼べる簡易ブリッジ（Feed クリックで正解演出を出す）
//   useEffect(() => {
//     (window as any).__kogoto_onCorrect = () => {
//       try {
//         onCorrect?.fire?.();
//       } catch {}
//     };
//     return () => {
//       try {
//         delete (window as any).__kogoto_onCorrect;
//       } catch {}
//     };
//   }, [onCorrect]);

//   return (
//     <div className="w-full h-[220px] sm:h-[260px] md:h-[320px] lg:h-[360px]">
//       {rive ? (
//         <>
//           <RiveComponent className="w-full h-full" />
//           {/* デバッグ操作（必要なければ削除OK） */}
//           <div className="mt-3 flex flex-wrap gap-8 items-center justify-center">
//             <div className="flex gap-2">
//               <Button size="sm" onClick={() => onCorrect?.fire?.()}>
//                 正解トリガ
//               </Button>
//               <Button size="sm" variant="surface" onClick={() => onWrong?.fire?.()}>
//                 ハサミ（誤答）
//               </Button>
//             </div>
//             <div className="flex gap-2">
//               <Button
//                 size="sm"
//                 variant="accent"
//                 onClick={() => {
//                   if (!isWalking) return;
//                   isWalking.value = !Boolean(isWalking.value);
//                 }}
//               >
//                 {isWalking?.value ? "歩行停止" : "歩行開始"}
//               </Button>
//               <Button
//                 size="sm"
//                 variant="surface"
//                 onClick={() => {
//                   if (!comboTier) return;
//                   const v = Number(comboTier.value) || 0;
//                   comboTier.value = (v + 1) % 5;
//                 }}
//               >
//                 COMBO+1
//               </Button>
//             </div>
//           </div>
//         </>
//       ) : (
//         <div className="w-full h-full rounded-[var(--radius-lg)] border-4 border-[var(--border-strong)] bg-[var(--card)] flex items-center justify-center opacity-70">
//           Loading crab…
//         </div>
//       )}
//     </div>
//   );
// }

// /** 画面本体（既存UIは最小限そのまま） */
// export function CrabSpotlight() {
//   const [mode, setMode] = useState<"talk" | "feed">("talk");
//   const [ready, setReady] = useState(false);

//   // 仮のご飯データ
//   const [points, setPoints] = useState(120);
//   const [affinity, setAffinity] = useState(0.35); // 0..1
//   const feedItems = useMemo(
//     () => [
//       { id: "a", name: "えび", emoji: "🦐", cost: 10, exp: 0.06 },
//       { id: "b", name: "ホタテ", emoji: "🦪", cost: 18, exp: 0.1 },
//       { id: "c", name: "カニかま", emoji: "🦀", cost: 6, exp: 0.035 },
//     ],
//     []
//   );

//   const riveBoxClass = useMemo(
//     () => "w-full h-[220px] sm:h-[260px] md:h-[320px] lg:h-[360px]",
//     []
//   );

//   // Feed：ポイント減算 & 友好度加算 & 正解演出トリガ
//   const handleFeed = (cost: number, exp: number) => {
//     if (points < cost) return;
//     setPoints((p) => p - cost);
//     setAffinity((a) => Math.min(1, a + exp));
//     try {
//       (window as any).__kogoto_onCorrect?.();
//     } catch {}
//   };

//   return (
//     <Card className="min-h-[360px] flex items-center justify-center">
//       <CardContent className="p-6 md:p-8 w-full">
//         <div className="mb-3 flex items-center justify-between gap-2">
//           <p className="font-semibold">カニ★スポットライト</p>
//           <div className="flex gap-2">
//             <Button
//               variant={mode === "talk" ? "primary" : "surface"}
//               size="sm"
//               onClick={() => setMode("talk")}
//             >
//               小言
//             </Button>
//             <Button
//               variant={mode === "feed" ? "accent" : "surface"}
//               size="sm"
//               onClick={() => setMode("feed")}
//             >
//               ご飯
//             </Button>
//           </div>
//         </div>

//         {/* Rive Canvas */}
//         <div className={riveBoxClass}>
//           <RivePlayer
//             onReady={() => {
//               setReady(true);
//               console.log("[Rive] loaded: machine");
//             }}
//             onError={(e) => {
//               console.error("[Rive] onLoadError:", e);
//             }}
//           />
//         </div>

//         {/* Talk / Feed 本体（簡易） */}
//         {mode === "talk" ? (
//           <div className="mt-4 rounded-[var(--radius-lg)] border-4 border-[var(--border-strong)] bg-[var(--card)] px-4 py-4">
//             <p className="text-sm opacity-90 mb-2">カニ「今日もコツコツ〜」</p>
//             <div className="text-xs opacity-60">（タップで次の小言…は後で実装）</div>
//           </div>
//         ) : (
//           <div className="mt-4 rounded-[var(--radius-lg)] border-4 border-[var(--border-strong)] bg-[var(--card)] px-4 py-4">
//             <div className="mb-3 flex flex-wrap gap-2 items-center">
//               <span className="inline-flex items-center gap-2 rounded-full border-2 border-[var(--border-strong)] px-3 py-1 bg-[var(--card)] text-sm">
//                 Pt: <strong>{points}</strong>
//               </span>
//               <span className="inline-flex items-center gap-2 rounded-full border-2 border-[var(--border-strong)] px-3 py-1 bg-[var(--card)] text-sm">
//                 友好度: <strong>{Math.round(affinity * 100)}%</strong>
//               </span>
//             </div>
//             <div className="grid grid-cols-3 gap-3">
//               {feedItems.map((f) => (
//                 <button
//                   key={f.id}
//                   onClick={() => handleFeed(f.cost, f.exp)}
//                   className="rounded-[var(--radius-lg)] border-4 border-[var(--border-strong)] bg-[var(--card)] shadow-[var(--shadow-strong)] p-3 text-center hover:scale-[0.99] transition"
//                 >
//                   <div className="text-2xl">{f.emoji}</div>
//                   <div className="text-sm font-semibold mt-1">{f.name}</div>
//                   <div className="text-xs opacity-70 mt-1">
//                     - {f.cost}pt / +{Math.round(f.exp * 100)}%
//                   </div>
//                 </button>
//               ))}
//             </div>
//           </div>
//         )}

//         {/* debug: 状態バッジ */}
//         <div className="mt-2 text-xs opacity-60 text-center">
//           <code>loaded:{ready ? "✅" : "⏳"} / mode:machine</code>
//         </div>
//       </CardContent>
//     </Card>
//   );
// }
