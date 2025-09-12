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
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return false;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(t => t.stop());
    return true;
  } catch (e: any) {
    return false;
  }
}

export function startVoice(opts: Opts = {}) {
  if (!voiceSupported()) return false;
  // コンストラクタの型を明示
  const SR = (window.SpeechRecognition || (window as any).webkitSpeechRecognition) as { new(): SpeechRecognition };
  const r: SpeechRecognition = new SR();   // ← ローカルに確定型で保持
  r.lang = opts.lang ?? 'ja-JP';
  r.continuous = true;
  r.interimResults = true;
  const autoRestart = opts.autoRestart ?? true;

  r.onresult = (e: any) => {
    const last = e.results?.[e.results.length - 1];
    if (!last) return;
    // interim
    if (!last.isFinal) {
      const alt0 = last[0];
      const txt = String(alt0?.transcript ?? '').trim();
      if (txt) opts.onInterim?.(txt);
      return;
    }
    // final
    const alt = last[0];
    const text = String(alt?.transcript ?? '').trim();
    const normalized = normalizeJa(text);
    const confidence = Number(alt?.confidence ?? 0);
    opts.onResult?.({ text, normalized, confidence, at: performance.now() });
  };
  r.onerror = (ev: any) => {
    const msg = String(ev?.error ?? 'unknown');
    opts.onError?.(msg);
  };
  r.onend = () => {
    // マイクが切れがちな環境向け: 自動で復帰
    if (autoRestart) {
      try { r.start(); } catch {}
    }
  };
  try { r.start(); } catch {}
  rec = r; // 最後に保存
  return true;
}

export function stopVoice() {
  if (rec) {
  try { rec.stop(); } catch {}
  }
  rec = undefined;
}
