import { headers } from "next/headers";

// Current weather from Open-Meteo (no API key). Location comes from Vercel's
// IP geolocation headers — no browser permission prompt. Falls back to a
// default city in local dev, where those headers aren't present.

export type Weather = {
  city: string;
  tempF: number;
  feelsF: number;
  humidity: number;
  windMph: number;
  code: number;
  isDay: boolean;
  hiF: number;
  loF: number;
};

const FALLBACK = { lat: "40.7128", lon: "-74.006", city: "New York" };

export async function getWeather(): Promise<Weather | null> {
  const h = await headers();
  const lat = h.get("x-vercel-ip-latitude") ?? FALLBACK.lat;
  const lon = h.get("x-vercel-ip-longitude") ?? FALLBACK.lon;
  const cityHeader = h.get("x-vercel-ip-city");
  const city = cityHeader ? decodeURIComponent(cityHeader) : FALLBACK.city;

  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,is_day` +
    `&daily=temperature_2m_max,temperature_2m_min` +
    `&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto&forecast_days=1`;

  try {
    // Cache the upstream response ~10 min so repeat loads don't re-hit the API.
    const res = await fetch(url, { next: { revalidate: 600 } });
    if (!res.ok) return null;
    const d = await res.json();
    const c = d?.current;
    const day = d?.daily;
    if (!c || !day) return null;
    return {
      city,
      tempF: Math.round(c.temperature_2m),
      feelsF: Math.round(c.apparent_temperature),
      humidity: Math.round(c.relative_humidity_2m),
      windMph: Math.round(c.wind_speed_10m),
      code: c.weather_code,
      isDay: c.is_day === 1,
      hiF: Math.round(day.temperature_2m_max?.[0]),
      loF: Math.round(day.temperature_2m_min?.[0]),
    };
  } catch {
    return null;
  }
}

// WMO weather-code → a short label and an emoji (day/night aware for clear sky).
export function describeWeather(
  code: number,
  isDay = true,
): { label: string; emoji: string } {
  const map: Record<number, { label: string; emoji: string }> = {
    0: { label: "Clear sky", emoji: isDay ? "☀️" : "🌙" },
    1: { label: "Mainly clear", emoji: isDay ? "🌤️" : "🌙" },
    2: { label: "Partly cloudy", emoji: isDay ? "⛅" : "☁️" },
    3: { label: "Overcast", emoji: "☁️" },
    45: { label: "Fog", emoji: "🌫️" },
    48: { label: "Rime fog", emoji: "🌫️" },
    51: { label: "Light drizzle", emoji: "🌦️" },
    53: { label: "Drizzle", emoji: "🌦️" },
    55: { label: "Heavy drizzle", emoji: "🌦️" },
    56: { label: "Freezing drizzle", emoji: "🌧️" },
    57: { label: "Freezing drizzle", emoji: "🌧️" },
    61: { label: "Light rain", emoji: "🌧️" },
    63: { label: "Rain", emoji: "🌧️" },
    65: { label: "Heavy rain", emoji: "🌧️" },
    66: { label: "Freezing rain", emoji: "🌧️" },
    67: { label: "Freezing rain", emoji: "🌧️" },
    71: { label: "Light snow", emoji: "🌨️" },
    73: { label: "Snow", emoji: "🌨️" },
    75: { label: "Heavy snow", emoji: "❄️" },
    77: { label: "Snow grains", emoji: "🌨️" },
    80: { label: "Light showers", emoji: "🌦️" },
    81: { label: "Showers", emoji: "🌦️" },
    82: { label: "Violent showers", emoji: "⛈️" },
    85: { label: "Snow showers", emoji: "🌨️" },
    86: { label: "Snow showers", emoji: "🌨️" },
    95: { label: "Thunderstorm", emoji: "⛈️" },
    96: { label: "Thunderstorm, hail", emoji: "⛈️" },
    99: { label: "Thunderstorm, hail", emoji: "⛈️" },
  };
  return map[code] ?? { label: "—", emoji: "🌡️" };
}
