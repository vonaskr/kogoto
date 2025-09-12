const KEY = 'kogoto:latency';

export function getLatencyOffset(): number {
  const v = Number(localStorage.getItem(KEY) ?? '0');
  return Number.isFinite(v) ? v : 0;
}

// まずは固定値でOK。後で手拍子校正に置き換え可能。
export async function calibrateOnce(defaultMs = 120): Promise<number> {
  localStorage.setItem(KEY, String(defaultMs));
  return defaultMs;
}
