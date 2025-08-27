"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  useRive,
  useStateMachineInput,
  Layout as RiveLayout,
  Fit,
  Alignment,
} from "@rive-app/react-canvas";


type LoadMode = "machine" | "anim";

function RivePlayer({
  mode,
  buffer,
  onReady,
  onError,
}: {
  mode: LoadMode;
  buffer: ArrayBuffer;
  onReady?: () => void;
  onError?: (e: unknown) => void;
}) {
  const params =
    mode === "machine"
      ? {
          buffer,
          artboard: "Crab",
          stateMachines: "CrabMachine",
          autoplay: true,
          layout: new RiveLayout({ fit: Fit.Contain, alignment: Alignment.Center }),
          onLoad: () => onReady?.(),
          onLoadError: (e: unknown) => onError?.(e),
        }
      : {
          buffer,
          // artboard は自動選択に任せる（名前ズレ対策）
          animations: ["idle", "walk_inplace"], // どちらか存在すれば再生
          autoplay: true,
          layout: new RiveLayout({ fit: Fit.Contain, alignment: Alignment.Center }),
          onLoad: () => onReady?.(),
          onLoadError: (e: unknown) => onError?.(e),
        };


    const { rive, RiveComponent } = useRive(params as any);

  // rive インスタンスが来たら ready 扱い（onLoad が来ない環境の保険）
  useEffect(() => {
    if (rive) onReady?.();
  }, [rive]); // eslint-disable-line

  // Machineモード時だけinputsを拾う
  const onCorrect = useStateMachineInput(rive, "CrabMachine", "onCorrect");

  const onWrong = useStateMachineInput(rive, "CrabMachine", "onWrong");
  const isWalking = useStateMachineInput(rive, "CrabMachine", "isWalking");
  const comboTier = useStateMachineInput(rive, "CrabMachine", "comboTier");

  useEffect(() => {
    if (!rive) return;
    if (isWalking && typeof isWalking.value === "boolean") isWalking.value = false;
    if (comboTier && typeof comboTier.value === "number") comboTier.value = 0;
  }, [rive]); // eslint-disable-line

  return (
    <div className="w-full h-[220px] sm:h-[260px] md:h-[320px] lg:h-[360px]">
      {rive ? (
        <>
          <RiveComponent className="w-full h-full" />
          {mode === "machine" && (
            <div className="mt-3 flex flex-wrap gap-8 items-center justify-center">
              <div className="flex gap-2">
                <Button size="sm" onClick={() => onCorrect?.fire?.()}>
                  正解トリガ
                </Button>
                <Button size="sm" variant="surface" onClick={() => onWrong?.fire?.()}>
                  ハサミ（誤答）
                </Button>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="accent"
                  onClick={() => {
                    if (!isWalking) return;
                    isWalking.value = !Boolean(isWalking.value);
                  }}
                >
                  {isWalking?.value ? "歩行停止" : "歩行開始"}
                </Button>
                <Button
                  size="sm"
                  variant="surface"
                  onClick={() => {
                    if (!comboTier) return;
                    const v = Number(comboTier.value) || 0;
                    comboTier.value = (v + 1) % 5;
                  }}
                >
                  COMBO+1
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="w-full h-full rounded-[var(--radius-lg)] border-4 border-[var(--border-strong)] bg-[var(--card)] flex items-center justify-center opacity-70">
          Loading crab…
        </div>
      )}
    </div>
  );
}

export function CrabSpotlight() {
  const [mode, setMode] = useState<"talk" | "feed">("talk");
  const [loadMode, setLoadMode] = useState<LoadMode>("machine");
  const [buf, setBuf] = useState<ArrayBuffer | null>(null);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState<Error | null>(null);
  const riveBoxClass = useMemo(

    () => "w-full h-[220px] sm:h-[260px] md:h-[320px] lg:h-[360px]",
    []
  );

  // Rive WASM の取得先を明示（public/rive.wasm）
  useEffect(() => {
    (async () => {
      try {
        const mod: any = await import("@rive-app/canvas");
        const fn = mod?.setWasmUrl ?? mod?.default?.setWasmUrl;
        if (typeof fn === "function") {
          fn("/rive.wasm");
          // console.log("[Rive] setWasmUrl configured");
        } else {
          console.warn("[Rive] setWasmUrl not found on @rive-app/canvas (continuing)");
        }
      } catch (e) {
        console.error("[Rive] setWasmUrl import failed:", e);
      }
    })();
  }, []);

  // .riv を ArrayBuffer として取得
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/crab.riv");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const ab = await res.arrayBuffer();
        if (alive) setBuf(ab);
      } catch (e) {
        console.error("[Rive] fetch error", e);
        setErr(e as Error);
      }

    })();
    return () => {
      alive = false;
    };
  }, []);

  // 1.5秒で machine → anim にフォールバック
  useEffect(() => {
    if (loadMode !== "machine") return;
    const t = setTimeout(() => setLoadMode("anim"), 1500);
    return () => clearTimeout(t);
  }, [loadMode]);

  return (
    <Card className="min-h-[360px] flex items-center justify-center">
      <CardContent className="p-6 md:p-8 w-full">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="font-semibold">カニ★スポットライト</p>
          <div className="flex gap-2">
            <Button
              variant={mode === "talk" ? "primary" : "surface"}
              size="sm"
              onClick={() => setMode("talk")}
            >
              小言
            </Button>
            <Button
              variant={mode === "feed" ? "accent" : "surface"}
              size="sm"
              onClick={() => setMode("feed")}
            >
              ご飯
            </Button>
          </div>
        </div>

        {/* Rive Canvas */}
        <div className={riveBoxClass}>
          {!buf && !err && (
            <div className="w-full h-full rounded-[var(--radius-lg)] border-4 border-[var(--border-strong)] bg-[var(--card)] flex items-center justify-center opacity-70">
              Loading crab…
            </div>
          )}
          {Boolean(err) && (
            <div className="w-full h-full rounded-[var(--radius-lg)] border-4 border-[var(--border-strong)] bg-[var(--card)] flex items-center justify-center text-center p-4">
              <div>
                <div className="font-semibold mb-1">読み込みに失敗しました</div>
                <div className="text-xs opacity-80">DevTools Console を確認してください。</div>
              </div>
            </div>
          )}

          {buf && !err && (
            <RivePlayer
              mode={loadMode}
              buffer={buf}
              onReady={() => {
                setReady(true);
                console.log("[Rive] loaded:", loadMode);
              }}
              onError={(e) => {
                console.error("[Rive] onLoadError:", e);
                if (loadMode === "machine") setLoadMode("anim");
              }}
            />
          )}
        </div>

        {/* 下部ダミー枠 */}
        <div className="mt-4 rounded-[var(--radius-lg)] border-4 border-[var(--border-strong)] bg-[var(--card)] px-4 py-3 text-center opacity-80">
          {mode === "talk"
            ? "（ここに小言の吹き出しが入ります）"
            : "（ここに餌カード／ポイント表示が入ります）"}
        </div>

        {/* debug: 状態バッジ */}
        <div className="mt-2 text-xs opacity-60 text-center">
            <code>
              buf:{buf ? `✅(${buf.byteLength}B)` : "⏳"} / ready:{ready ? "✅" : "⏳"} / mode:{loadMode}
            </code>

        </div>
      </CardContent>
    </Card>
  );
}
