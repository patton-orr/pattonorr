import { auth } from "@/auth";
import { isAdmin } from "@/lib/access-config";
import { currentUserId } from "@/lib/current-user";
import { getHomeShowWeather } from "@/lib/settings";
import { VerseOfTheDay } from "./verse-of-the-day";
import { WeatherCard } from "./weather-card";

// The private area — the 95%. Chrome (nav, identity, sign-out) lives in
// layout.tsx; this is the Home page content. Guests get a boilerplate welcome;
// the admin (owner) gets the full home.
export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const session = await auth();

  if (!isAdmin(session?.user?.email)) {
    const first = session?.user?.name?.trim().split(/\s+/)[0];
    return (
      <div className="flex max-w-2xl flex-col gap-4">
        <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Welcome{first ? `, ${first}` : ""}
        </h1>
        <p className="leading-relaxed text-zinc-600 dark:text-zinc-400">
          You&apos;re signed in to Patton Orr&apos;s site. Use the menu above to
          visit the sections you have access to.
        </p>
      </div>
    );
  }

  const showWeather = await getHomeShowWeather(await currentUserId());

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
