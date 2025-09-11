// src/lib/weather.ts
export type WeatherTag = "sunny" | "cloudy" | "rainy";

function codeToTag(code: number): WeatherTag {
  if (code === 0) return "sunny";
  if (code >= 1 && code <= 3) return "cloudy";
  if ((code >= 51 && code <= 67) ||
    (code >= 71 && code <= 77) ||
    (code >= 80 && code <= 82) ||
    (code >= 85 && code <= 86) ||
    (code >= 95 && code <= 99) ||
    (code >= 61 && code <= 65)) {
    return "rainy";
  }
  return "cloudy";
}

export async function getWeatherTag(): Promise<WeatherTag | null> {
  try {
    const url =
      "https://api.open-meteo.com/v1/forecast?latitude=35.68&longitude=139.76&current=weather_code";
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`weather http ${res.status}`);
    const json = await res.json();
    const code = json?.current?.weather_code;
    if (typeof code !== "number") return null;
    return codeToTag(code);
  } catch {
    return null; // オフラインや失敗時は null
  }
}
