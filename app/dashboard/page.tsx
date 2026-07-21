import { getHomeShowWeather } from "@/lib/settings";
import { VerseOfTheDay } from "./verse-of-the-day";
import { WeatherCard } from "./weather-card";

// The private area — the 95%. Chrome (sidebar, identity, sign-out) lives in
// layout.tsx; this is just the Home page content.
export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const showWeather = await getHomeShowWeather();

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
        Home
      </h1>
      {showWeather && <WeatherCard />}
      <VerseOfTheDay />
    </div>
  );
}
