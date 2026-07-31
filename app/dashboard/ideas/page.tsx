// Future ideas / roadmap. Each idea carries a relative complexity and a time
// lift, kept up to date whenever a new idea is added.
//
// Rubric:
//   complexity — Low: self-contained UI/content, no new infra or deps.
//                Medium: a new dependency, keys/config, or a platform quirk.
//                High: new infra (DB/queues/auth flows), multi-part, or
//                significant unknowns.
//   timeLift   — rough focused-work estimate to a working version.

import { requireSection } from "@/lib/require-access";

type Complexity = "Low" | "Medium" | "High";

type Idea = {
  title: string;
  description: string;
  complexity: Complexity;
  timeLift: string;
};

const ideas: Idea[] = [
  {
    title: "App-style mobile navigation",
    description:
      "On phones, swap the top bar for a native-app feel: a fixed bottom navigation bar with icons for the top-level sections (Home, Health, Faith, …), and icons throughout the nav generally. Desktop keeps the current top bar. Needs an icon set, a mobile-breakpoint layout, active-state styling, and iOS safe-area handling for the home indicator.",
    complexity: "Medium",
    timeLift:
      "~half a day for a bottom bar with icons on the main sections; more to bring icons across the whole nav and polish transitions.",
  },
  {
    title: "Push Notifications",
    description:
      "Web Push to the installed iOS home-screen app (works on iOS 16.4+ in standalone mode). Needs a service worker, VAPID keys, a subscribe toggle in the dashboard, storage for subscriptions, and a web-push send route.",
    complexity: "Medium",
    timeLift: "~0.5–1 day for a single-device prototype; ~1–2 days with a database and a polished toggle.",
  },
  {
    title: "Environment strategy (PRD / POC / SUP / PJX)",
    description:
      "Replace localhost with hosted Vercel environments, modeled on Epic. PRD = production (main). POC = a build/playground branch on a stable domain (the localhost replacement). SUP = daily fast-forward copy of prod; PJX = an infrequent copy — both only meaningful once there's a database, since they'd otherwise be identical to prod. Needs Vercel custom environments, per-environment env-var scopes, a Google OAuth redirect URI per domain, scheduled branch-sync (GitHub Action), and eventually branchable data (e.g. Neon).",
    complexity: "High",
    timeLift: "~1–2 hrs for POC + PRD alone; ~1–2 days for SUP/PJX with a branchable database and scheduled sync (gated on adding a database first).",
  },
  {
    title: "YouTube viewer (my own account)",
    description:
      "Surface my own YouTube account in the dashboard — playlists and a subscriptions feed — with videos playing inline via the IFrame player, tagged to a life area and annotatable like scripture notes. Needs OAuth with added YouTube scopes on the existing Google sign-in, a Google Cloud project + API key, and token storage. Three things shape the build: (1) Watch Later is NOT retrievable — the API has returned an empty list for it since 2016, so it can't be mirrored; (2) search.list costs 100 quota units against 10,000/day (~100 searches/day), so search can't drive browsing — lean on playlistItems.list and videos.list at 1 unit each, cached in Postgres; (3) the free oEmbed endpoint gives title/channel/thumbnail with no API key at all, so a save-by-URL library is a zero-quota fallback if the OAuth path stalls. Adding sensitive scopes may trigger Google verification — a real risk given the app's publishing-status history. Playback details: youtube-nocookie host, playsinline=1, and no autoplay on iOS.",
    complexity: "High",
    timeLift:
      "~half a day for a save-by-URL library with inline playback and notes (no key, no OAuth); ~1 day more for API-key enrichment and following channels/playlists; ~2+ days for the full own-account version, plus unbounded time if Google verification is required.",
  },
];

const complexityStyles: Record<Complexity, string> = {
  Low: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  Medium: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  High: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
};

export default async function Ideas() {
  await requireSection("ideas");
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Future ideas
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Things to build, with a rough complexity and time lift for each.
        </p>
      </div>

      <ul className="flex flex-col gap-4">
        {ideas.map((idea) => (
          <li
            key={idea.title}
            className="flex flex-col gap-3 rounded-2xl border border-black/[.08] bg-white p-5 dark:border-white/[.145] dark:bg-black"
          >
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-lg font-medium text-black dark:text-zinc-50">
                {idea.title}
              </h2>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${complexityStyles[idea.complexity]}`}
              >
                {idea.complexity} complexity
              </span>
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {idea.description}
            </p>
            <p className="text-sm text-zinc-500 dark:text-zinc-500">
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                Time lift:
              </span>{" "}
              {idea.timeLift}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
