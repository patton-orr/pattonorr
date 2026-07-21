// Future ideas / roadmap. Each idea carries a relative complexity and a time
// lift, kept up to date whenever a new idea is added.
//
// Rubric:
//   complexity — Low: self-contained UI/content, no new infra or deps.
//                Medium: a new dependency, keys/config, or a platform quirk.
//                High: new infra (DB/queues/auth flows), multi-part, or
//                significant unknowns.
//   timeLift   — rough focused-work estimate to a working version.

type Complexity = "Low" | "Medium" | "High";

type Idea = {
  title: string;
  description: string;
  complexity: Complexity;
  timeLift: string;
};

const ideas: Idea[] = [
  {
    title: "Push Notifications",
    description:
      "Web Push to the installed iOS home-screen app (works on iOS 16.4+ in standalone mode). Needs a service worker, VAPID keys, a subscribe toggle in the dashboard, storage for subscriptions, and a web-push send route.",
    complexity: "Medium",
    timeLift: "~0.5–1 day for a single-device prototype; ~1–2 days with a database and a polished toggle.",
  },
];

const complexityStyles: Record<Complexity, string> = {
  Low: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  Medium: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  High: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
};

export default function Ideas() {
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
