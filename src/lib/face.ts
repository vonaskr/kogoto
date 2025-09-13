// src/lib/face.ts
// MediaPipe Tasks Vision を使って、表情スコア（smile/frownの近似）をストリームで返す薄いAPI。
// 注意: 送信なし・ブラウザ内完結。UI側はこれを購読し、EMA/閾値で確定判定を行う。

import type {
  FaceLandmarker,
  FaceLandmarkerResult,
  FilesetResolver,
} from "@mediapipe/tasks-vision";

let vision: typeof import("@mediapipe/tasks-vision") | null = null;
let landmarker: FaceLandmarker | null = null;
let running = false;
let rafId: number | null = null;

type Score = { smile: number; frown: number }; // 0..1
type Options = {
  onScore: (score: Score) => void;
  fps?: number;            // 推論上限fps（既定 20）
  inputSize?: number;      // 推論用に縮小する辺（既定 128）
};

export async function initFace() {
  if (vision && landmarker) return;
  const mp = await import("@mediapipe/tasks-vision");
  vision = mp;
  const wasmPath =
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm";

  // Mediapipe が INFO を stderr に流すため Next の赤Nが点く → 既知文言のみ握りつぶし
  const origErr = console.error;
  console.error = (msg?: unknown, ...rest: unknown[]) => {
    const text = String(msg ?? "");
    if (
      text.includes("Created TensorFlow Lite XNNPACK delegate for CPU.") ||
      text.includes(
        "Feedback manager requires a model with a single signature inference"
      )
    ) {
      return console.debug("[mediapipe]", text, ...rest);
    }
    return origErr(msg, ...rest);
  };

  const fileset = await mp.FilesetResolver.forVisionTasks(wasmPath);
  landmarker = await mp.FaceLandmarker.createFromOptions(fileset, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
    },
    runningMode: "VIDEO",
    numFaces: 1,
    outputFacialTransformationMatrixes: true,
  });
  console.error = origErr;
}

export function startFaceStream(
  video: HTMLVideoElement,
  { onScore, fps = 20 }: Options
) {
  if (!landmarker) throw new Error("call initFace() first");
  if (running) return;
  running = true;

  let lastTs = 0;
  const frameInterval = 1000 / fps;

  const loop = async (t: number) => {
    rafId = requestAnimationFrame(loop);
    if (!running) return;

    if (!lastTs || t - lastTs >= frameInterval) {
      lastTs = t;

      // フレーム準備ガード（メタデータ未読み込み・サイズ0はスキップ）
      if (
        !video ||
        video.readyState < 2 ||
        !video.videoWidth ||
        !video.videoHeight
      ) {
        onScore({ smile: 0.5, frown: 0.5 });
        return;
      }
      let result: FaceLandmarkerResult | null = null;
      try {
        // MediaPipeにvideoフレームを渡してランドマーク検出
        result = await landmarker.detectForVideo(video, performance.now());
      } catch (e) {
        // 稀に内部例外が投げられるので握りつぶさずスキップ
        const err = e as Error;
        console.warn("detectForVideo error:", err.name, err.message);
        onScore({ smile: 0.5, frown: 0.5 });
        return;
      }

      // ランドマークが無ければ「中立」に近いスコアを返す
      if (!result?.faceLandmarks?.length) {
        onScore({ smile: 0.5, frown: 0.5 });
        return;
      }

      const lm = result.faceLandmarks[0]; // 468点（Face Mesh相当）

      // --- 超簡易の表情近似指標 ---
      const get = (i: number) => lm[i];

      // インデックスは MediaPipe Face Mesh に準拠
      const pL = get(61),
        pR = get(291),
        pUp = get(13),
        pDn = get(14);
      const bL = get(67),
        bR = get(297),
        nose = get(6),
        chin = get(152);

      const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
        Math.hypot(a.x - b.x, a.y - b.y);

      // 正規化用の顔スケール（鼻根-顎）
      const faceScale = Math.max(1e-6, dist(nose, chin));

      // 横開き（口角間距離）/ 縦開き（上下唇距離）
      const mouthW = dist(pL, pR) / faceScale;
      const mouthH = dist(pUp, pDn) / faceScale;

      // 眉間の狭さ（怒り寄り）
      const browGap = dist(bL, bR) / faceScale;

      // 口角の“上がり”
      const avgCornerLift =
        ((pL.y + pR.y) / 2 - nose.y) / Math.max(1e-6, chin.y - nose.y);

      const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

      // 笑顔スコア
      let smile =
        0.6 * norm(mouthW, 0.25, 0.6) +
        0.2 * norm(mouthH, 0.02, 0.18) +
        0.2 * norm(-avgCornerLift, -0.15, 0.15);

      // しかめ面スコア
      let frown =
        0.7 * norm(0.12 - browGap, -0.05, 0.12) +
        0.3 * (1 - norm(mouthH, 0.02, 0.18));

      // 口を大きく開けている場合はネガ寄りに補助
      const mouthOpenBoost = norm(mouthH, 0.22, 0.45);
      frown = Math.max(frown, mouthOpenBoost);

      smile = clamp01(smile);
      frown = clamp01(frown);

      onScore({ smile, frown });
    }
  };

  rafId = requestAnimationFrame(loop);
}

export function stopFaceStream() {
  running = false;
  if (rafId != null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}

export async function disposeFace() {
  stopFaceStream();
  try {
    await landmarker?.close();
  } catch {}
  landmarker = null;
  vision = null;
}

// 線形正規化の簡易関数
function norm(v: number, a: number, b: number) {
  if (a === b) return 0.5;
  const t = (v - a) / (b - a);
  return Math.max(0, Math.min(1, t));
}
