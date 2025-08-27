// "use client"

// import { useRive } from "@rive-app/react-canvas";

// function App() {
//   const { RiveComponent } = useRive({
//     src: "crab.riv",
//     autoplay: true,
//   });

//   return (
//     <div style={{ width: "500px", height: "500px" }}>
//       <RiveComponent />
//     </div>
//   );
// }

// export default App;

"use client";

//import { useEffect, useMemo, useState } from "react";
//import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRive, useStateMachineInput } from "@rive-app/react-canvas";
//import test from "node:test";

// name
  const ARTBOARD = "Crab";  
  const stateMachineName = "CrabMachine";
  const triggerInputName = "onCorrect";

  export function testStateMachine(){

  // rive files 読み込み
  const { rive, RiveComponent } = useRive({
    src: "/crab.riv",
    artboard: ARTBOARD,  
    stateMachines:stateMachineName,
    autoplay: true,
  });

  //Triggerを取得
  const onCorrect = useStateMachineInput(
    rive, 
    stateMachineName, 
    triggerInputName
  );

  return(
    <div className="w-full h-[220px] sm:h-[260px] md:h-[320px] lg:h-[360px]">
        <Button
        onClick={() =>{
          if(onCorrect){
            onCorrect.fire();
          }
          }}
        >
          正解
        </Button>
        <RiveComponent />
        </div>
  );
}

export default testStateMachine;

  //const { RiveComponent } = useRive({ src: "/crab.riv", autoplay: true })

  // // rive インスタンスが来たら ready 扱い（onLoad が来ない環境の保険）
  // useEffect(() => {
  //   if (rive) onReady?.();
  // }, [rive]); // eslint-disable-line

  // Machineモード時だけinputsを拾う
  // const onCorrect = useStateMachineInput(rive, "CrabMachine", "onCorrect");

  // const onWrong = useStateMachineInput(rive, "CrabMachine", "onWrong");
  // const isWalking = useStateMachineInput(rive, "CrabMachine", "isWalking");
  // const comboTier = useStateMachineInput(rive, "CrabMachine", "comboTier");

    // 親から呼べる正解トリガを window に公開（簡易ブリッジ）
  // useEffect(() => {
  //   (window as any).__kogoto_onCorrect = () => {
  //     try {
  //       onCorrect?.fire?.();
  //     } catch {}
  //   };
  //   return () => {
  //     try { delete (window as any).__kogoto_onCorrect; } catch {}
  //   };
  // }, [onCorrect]);


  // useEffect(() => {
  //   if (!rive) return;
  //   if (isWalking && typeof isWalking.value === "boolean") isWalking.value = false;
  //   if (comboTier && typeof comboTier.value === "number") comboTier.value = 0;
  // }, [rive]); // eslint-disable-line

//   return (
//     <div className="w-full h-[220px] sm:h-[260px] md:h-[320px] lg:h-[360px]">
//       //   return (
//      <div style={{ width: "500px", height: "500px" }}>
//        <RiveComponent />
//      </div>
//       );

//     </div>
//   );
// }

// export function CrabSpotlight() {
//     const [mode, setMode] = useState<"talk" | "feed">("talk");
//     const [ready, setReady] = useState(false);
//     const [points, setPoints] = useState(120);
//     const [affinity, setAffinity] = useState(0.35); // 0..1
//     const feedItems = useMemo(
//       () => [
//         { id: "a", name: "えび", emoji: "🦐", cost: 10, exp: 0.06 },
//         { id: "b", name: "ホタテ", emoji: "🦪", cost: 18, exp: 0.1 },
//         { id: "c", name: "カニかま", emoji: "🦀", cost: 6, exp: 0.035 },
//       ],
//       []
//     );
//     const riveBoxClass = useMemo(


//     () => "w-full h-[220px] sm:h-[260px] md:h-[320px] lg:h-[360px]",
//     []
//   );

//      const handleFeed = (cost: number, exp: number) => {
//       if (points < cost) return; // 足りないときは無視（後でシェイクなど追加）
//       setPoints((p) => p - cost);
//       setAffinity((a) => Math.min(1, a + exp));

//       // Rive が居れば「食べた」演出として正解トリガを撃つ
//       try {
//         // 下の RivePlayer から window にブリッジ（超簡易）
//         (window as any).__kogoto_onCorrect?.();
//       } catch {}
//     };

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
//             mode="machine"
//             onReady={() => {
//               setReady(true);
//               console.log("[Rive] loaded: machine");
//             }}
//             onError={(e) => {
//               console.error("[Rive] onLoadError:", e);
//                           }}
//           />

//         </div>

//                 {/* Talk / Feed 本体（簡易） */}
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
//                   <div className="text-xs opacity-70 mt-1">- {f.cost}pt / +{Math.round(f.exp*100)}%</div>
//                 </button>
//               ))}
//             </div>
//           </div>
//         )}


//         {/* debug: 状態バッジ */}
//         <div className="mt-2 text-xs opacity-60 text-center">
//               <code>
//               loaded:{ready ? "✅" : "⏳"} / mode:machine
//             </code>


//         </div>
//       </CardContent>
//     </Card>
//   );
// }

// export default RivePlayer;
