// src/lib/face.ts
// MediaPipe Tasks Vision を使って、表情スコア（smile/frownの近似）をストリームで返す薄いAPI。
// 注意: 送信なし・ブラウザ内完結。UI側はこれを購読し、EMA/閾値で確定判定を行う。

let vision: any;
let landmarker: any;
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
  const wasmPath = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm";
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
}

export function startFaceStream(
  video: HTMLVideoElement,
  { onScore, fps = 20, inputSize = 128 }: Options
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

      // MediaPipeにvideoフレームを渡してランドマーク検出
      const result = await landmarker.detectForVideo(
        video,
        performance.now() // DOMHighResTimeStamp を明示的に使用
      );

      // ランドマークが無ければ「中立」に近いスコアを返す（UI側でタイムアウト丸め）
      if (!result?.faceLandmarks?.length) {
        onScore({ smile: 0.5, frown: 0.5 });
        return;
      }

      const lm = result.faceLandmarks[0]; // 468点（Face Mesh相当）

      // --- 超簡易の表情近似指標 ---
      // smile: 口角の横開き＋口角の上がり（左右）
      // frown: 眉間距離の縮み＋眉の下がり
      // ※ 厳密な感情分類ではなく、POS/NEG 二値に足る連続指標を作るのが目的
      const get = (i: number) => lm[i];

      // インデックスは MediaPipe Face Mesh に準拠（口角/眉間付近の代表点）
      // 口角（左=61, 右=291）・上唇中央(13)・下唇中央(14)
      const pL = get(61), pR = get(291), pUp = get(13), pDn = get(14);
      // 眉間（左=67, 右=297）・鼻根(6)・顎先(152)
      const bL = get(67), bR = get(297), nose = get(6), chin = get(152);

      const dist = (a: any, b: any) => Math.hypot(a.x - b.x, a.y - b.y);

      // 正規化用の顔スケール（鼻根-顎）
      const faceScale = Math.max(1e-6, dist(nose, chin));

      // 横開き（口角間距離）/ 縦開き（上下唇距離）
      const mouthW = dist(pL, pR) / faceScale;
      const mouthH = dist(pUp, pDn) / faceScale;

      // 眉間の狭さ（怒り寄り）
      const browGap = dist(bL, bR) / faceScale;

      // 口角の“上がり”（口角と鼻根のy差分の平均：上がると負値→スコア化で反転）
      const avgCornerLift =
        ((pL.y + pR.y) / 2 - nose.y) / Math.max(1e-6, (chin.y - nose.y));

      // スコア設計（0..1 に収めるためのシグモイド近似）
      const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

      // 笑顔: 横開き↑ + 縦開き少し↑ + 口角上がり
      let smile =
        0.6 * norm(mouthW, 0.25, 0.6) +
        0.2 * norm(mouthH, 0.02, 0.18) +
        0.2 * norm(-avgCornerLift, -0.15, 0.15); // 口角が上がる(負)→スコア↑

      // しかめ面: 眉間狭い + 口縦開きは小さめ
      let frown =
        0.7 * norm(0.12 - browGap, -0.05, 0.12) + // 小さいほど↑
        0.3 * (1 - norm(mouthH, 0.02, 0.18));

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
  } catch { }
  landmarker = null;
  vision = null;
}

// 線形正規化の簡易関数：値vが[a,b]にあるとき0..1へ（外側ははみ出さない）
function norm(v: number, a: number, b: number) {
  if (a === b) return 0.5;
  const t = (v - a) / (b - a);
  return Math.max(0, Math.min(1, t));
}
