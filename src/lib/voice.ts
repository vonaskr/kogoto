// Web Speech API の最小ラッパ（連続認識）
export type VoiceResult = {
  text: string;
  normalized: string;
  confidence: number;
  at: number; // performance.now() 時刻
};
type Opts = { lang?: string; onResult?: (r: VoiceResult)=>void };

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

export function startVoice(opts: Opts = {}) {
  if (!voiceSupported()) return false;
  // コンストラクタの型を明示
  const SR = (window.SpeechRecognition || (window as any).webkitSpeechRecognition) as { new(): SpeechRecognition };
  const r: SpeechRecognition = new SR();   // ← ローカルに確定型で保持
  r.lang = opts.lang ?? 'ja-JP';
  r.continuous = true;
  r.interimResults = true;

  r.onresult = (e: any) => {
    const last = e.results?.[e.results.length - 1];
    if (!last?.isFinal) return;
    const alt = last[0];
    const text = String(alt?.transcript ?? '').trim();
    const normalized = normalizeJa(text);
    const confidence = Number(alt?.confidence ?? 0);
    opts.onResult?.({ text, normalized, confidence, at: performance.now() });
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
