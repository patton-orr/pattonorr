// Shown while a dashboard page resolves its server data (auth + DB + any
// upstream fetch). The nav from the layout stays put; only the content column
// shows this skeleton.
export default function Loading() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4" aria-hidden>
      <div className="h-8 w-48 animate-pulse rounded-md bg-black/[.06] dark:bg-white/[.08]" />
      <div className="h-4 w-72 animate-pulse rounded bg-black/[.06] dark:bg-white/[.08]" />
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-2xl bg-black/[.04] dark:bg-white/[.06]"
          />
        ))}
      </div>
    </div>
  );
}
