// src/lib/voice.ts
// Web Speech API の最小ラッパ（連続認識）

export type VoiceResult = {
  text: string;
  normalized: string;
  confidence: number;
  at: number; // performance.now() 時刻
};

type Opts = {
  lang?: string;
  onResult?: (r: VoiceResult) => void; // 確定
  onInterim?: (text: string) => void;  // 途中経過
  onError?: (err: string) => void;     // エラー通知
  autoRestart?: boolean;               // 切断時に再起動（既定: true）
  onStart?: () => void;                // 認識開始通知
  onEnd?: () => void;                  // 認識終了通知
};

let rec: SpeechRecognition | undefined;
let stopping = false;

function normalizeJa(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[ぁ-ん]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) + 0x60))
    .replace(/[ー―−‐]/g, "-")
    .replace(/[！-～]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
    .replace(/[\s、。・.,/\\|_*+~^$()[\]{}"'`!?@#:;<>-]/g, "");
}

export function voiceSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    (("webkitSpeechRecognition" in window) || ("SpeechRecognition" in window))
  );
}

// マイク権限を要求（許可ダイアログを出すだけ）
export async function warmupMic(): Promise<boolean> {
  try {
    if (!navigator.mediaDevices?.getUserMedia) return false;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // 取得できたら即停止（権限だけ確保）
    stream.getTracks().forEach((t) => {
      try { t.stop(); } catch {}
    });
    return true;
  } catch {
    // NotAllowedError / NotFoundError など
    return false;
  }
}

// 権限状態の確認（Permissions API）
export async function getMicPermissionState(): Promise<
  "granted" | "denied" | "prompt" | "unsupported"
> {
  try {
    // 一部ブラウザでは 'microphone' が未サポート
    // @ts-ignore
    if (!navigator.permissions?.query) return "unsupported";
    // @ts-ignore
    const st = await navigator.permissions.query({ name: "microphone" as any });
    return (st?.state as any) ?? "unsupported";
  } catch {
    return "unsupported";
  }
}

export function startVoice(opts: Opts = {}): boolean {
  if (!voiceSupported()) return false;

  const SR = (window.SpeechRecognition ??
    (window as any).webkitSpeechRecognition) as typeof SpeechRecognition;
  if (!SR) return false;

  const r = new SR(); // 型は推論で SpeechRecognition
  stopping = false;

  r.lang = opts.lang ?? "ja-JP";
  r.continuous = true;
  r.interimResults = true;
  r.maxAlternatives = 5;

  const autoRestart = opts.autoRestart !== false; // 既定: true

  r.onstart = () => {
    try { opts.onStart?.(); } catch {}
  };

  // 途中経過(interim) も都度流し、確定時(final)は onResult を呼ぶ
  r.onresult = (e: SpeechRecognitionEvent) => {
    // 直近の結果のみ扱う（古いバッファは無視）
    const res = e.results?.[e.resultIndex] ?? e.results?.[e.results.length - 1];
    if (!res) return;

    const alt = res[0];
    const text = String(alt?.transcript ?? "").trim();
    if (!text) return;

    if (res.isFinal) {
      const normalized = normalizeJa(text);
      const confidence = Number(alt?.confidence ?? 0);
      try {
        opts.onResult?.({
          text,
          normalized,
          confidence,
          at: performance.now(),
        });
      } catch {}
    } else {
      // 途中経過
      try { opts.onInterim?.(text); } catch {}
    }
  };

  r.onerror = (ev: any) => {
    const msg =
      (ev && (ev.error || ev.message || ev.type))
        ? String(ev.error || ev.message || ev.type)
        : "unknown";
    try { opts.onError?.(msg); } catch {}

    // 無音 / no-speech 等で止まったら自動再開（明示停止でない場合）
    if (!stopping && autoRestart) {
      try { (r as any).abort?.(); } catch {}
      try { r.start(); } catch {}
    }
  };

  r.onend = () => {
    try { opts.onEnd?.(); } catch {}
    // ユーザーが stopVoice していなければ再開
    if (!stopping && autoRestart) {
      try { r.start(); } catch {}
    }
  };

  try { r.start(); } catch {}

  rec = r;
  return true;
}

export function stopVoice() {
  stopping = true;
  if (rec) {
    try { rec.stop(); } catch {}
    try { (rec as any).abort?.(); } catch {}
  }
  rec = undefined;
}
