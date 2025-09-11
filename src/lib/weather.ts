// src/lib/weather.ts
// Open-Meteo の現況天気を取り、"sunny" | "cloudy" | "rainy" に正規化する。
// 失敗時は null を返す（天気条件の小言は無効化される）。

export type WeatherTag = "sunny" | "cloudy" | "rainy";

function codeToTag(code: number): WeatherTag {
  // Open-Meteo weathercode → 粗い3分類
  if (code === 0) return "sunny";                   // Clear sky
  if (code >= 1 && code <= 3) return "cloudy";      // Mainly clear/partly/overcast
  if ((code >= 51 && code <= 67) ||                 // Drizzle/Freezing drizzle
    (code >= 71 && code <= 77) ||                 // Snow
    (code >= 80 && code <= 82) ||                 // Rain showers
    (code >= 85 && code <= 86) ||                 // Snow showers
    (code >= 95 && code <= 99) ||                 // Thunderstorm
    (code >= 61 && code <= 65)) {                // Rain
    return "rainy";
  }
  return "cloudy";
}

export async function getWeatherTag(opts?: {
  // 明示座標（テスト用）。指定なければ Geolocation → 東京の順で試す
  lat?: number; lon?: number; timeoutMs?: number;
}): Promise<WeatherTag | null> {
  const timeoutMs = opts?.timeoutMs ?? 4500;

  // 1) 明示座標 or Geolocation or 東京
  const position = await (async () => {
    if (typeof opts?.lat === "number" && typeof opts?.lon === "number") {
      return { lat: opts.lat, lon: opts.lon };
    }
    if (typeof navigator !== "undefined" && "geolocation" in navigator) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          const id = setTimeout(() => reject(new Error("geolocation timeout")), 2500);
          navigator.geolocation.getCurrentPosition(
            (p) => { clearTimeout(id); resolve(p); },
            (e) => { clearTimeout(id); reject(e); },
            { enableHighAccuracy: false, maximumAge: 5 * 60_000, timeout: 2000 }
          );
        });
        return { lat: pos.coords.latitude, lon: pos.coords.longitude };
      } catch { /* 続行して東京にフォールバック */ }
    }
    return { lat: 35.68, lon: 139.76 }; // 東京
  })();

  // 2) Open-Meteo 叩く（キー不要）
  try {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), timeoutMs);
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${position.lat}&longitude=${position.lon}&current=weather_code`;
    const res = await fetch(url, { signal: ac.signal, cache: "no-store" });
    clearTimeout(t);
    if (!res.ok) throw new Error(`weather http ${res.status}`);
    const json = await res.json();
    const code = json?.current?.weather_code;
    if (typeof code !== "number") return null;
    return codeToTag(code);
  } catch {
    return null; // ネット遮断や失敗は静かに無効化
  }
}
