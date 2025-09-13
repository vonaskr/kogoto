import type { SpeechRecognitionConstructor } from "@/types/speech";

// Web Speech API の最小ラッパ（連続認識）
export type VoiceResult = {
  text: string;
  normalized: string;
  confidence: number;
  at: number; // performance.now() 時刻
};

type Opts = {
  lang?: string;
  onResult?: (r: VoiceResult)=>void;     // 確定
  onInterim?: (text: string)=>void;      // 途中経過
  onError?: (err: string)=>void;         // エラー通知
  autoRestart?: boolean;                 // 切断時に再起動（既定: true）
};

let rec: SpeechRecognition | undefined;

function normalizeJa(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[ぁ-ん]/g, ch => String.fromCharCode(ch.charCodeAt(0) + 0x60))
    .replace(/[ー―−‐]/g,'-')
    .replace(/[！-～]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
    .replace(/[\s、。・.,/\\|_*+~^$()[\]{}"'`!?@#:;<>-]/g,'');
}

export function voiceSupported(): boolean {
  return typeof window !== 'undefined' && (('webkitSpeechRecognition' in window) || ('SpeechRecognition' in window));
}

// マイク権限を要求
export async function warmupMic(): Promise<boolean> {
  try {
    // HTTPS + ユーザー操作直後で呼ぶこと
    if (!navigator.mediaDevices?.getUserMedia) return false;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // 取得できたら即停止（権限だけ確保）
    stream.getTracks().forEach((t) => { try { t.stop(); } catch {} });
    return true;
  } catch (e: unknown) {
    // NotAllowedError / NotFoundError などを静かに false へ
    return false;
  }
}
// 権限状態の確認（Permissions API）
export async function getMicPermissionState(): Promise<'granted'|'denied'|'prompt'|'unsupported'> {
  try {
    // 一部ブラウザは Permissions 未対応
    const perms = (navigator as unknown as { permissions?: { query(desc: PermissionDescriptor): Promise<PermissionStatus> } }).permissions;
    if (!perms?.query) return 'unsupported';
    // 型に 'microphone' が無い環境があるため、PermissionDescriptor として問い合わせ
    const st = await perms.query({ name: 'microphone' as PermissionName });
    return st?.state ?? 'unsupported';
  } catch {
    return 'unsupported';
  }
}

function getSR(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function startVoice(opts: Opts = {}) {
  if (!voiceSupported()) return false;

  const SR = getSR();
  if (!SR) return false;
  const r = new SR();   // ← 型は推論で SpeechRecognition
  r.lang = opts.lang ?? "ja-JP";
  r.continuous = true;
  r.interimResults = true;
  r.maxAlternatives = 5;

  r.onresult = (e: SpeechRecognitionEvent) => {
    const last = e.results?.[e.results.length - 1];
    if (!last?.isFinal) return;
    const alt = last[0];
    const text = String(alt?.transcript ?? "").trim();
    const normalized = normalizeJa(text);
    const confidence = Number(alt?.confidence ?? 0);
    opts.onResult?.({ text, normalized, confidence, at: performance.now() });
  };

     r.onstart = () => {
    // iOS/Safari などで onstart をトリガにUI状態更新したい場合に利用可
  };

  r.onaudiostart = () => {
    // 途中経過が欲しければ onresult 分岐で isFinal=false を拾って opts.onInterim を呼ぶ
  };

  r.onerror = (ev: SpeechRecognitionErrorEvent | Event) => {
    let msg = 'unknown';
    if (typeof (ev as SpeechRecognitionErrorEvent).error === 'string') {
      msg = String((ev as SpeechRecognitionErrorEvent).error);
    } else if (typeof (ev as SpeechRecognitionErrorEvent).message === 'string') {
      msg = String((ev as SpeechRecognitionErrorEvent).message);
    } else if (typeof ev.type === 'string') {
      msg = ev.type;
    }
    opts.onError?.(msg);
  };
  r.onend = () => console.log("SpeechRecognition ended");

  try { r.start(); } catch {}

  rec = r;
  return true;
}

export function stopVoice() {
  if (rec) {
  try { rec.stop(); } catch {}
  }
  rec = undefined;
}
