// Reader skeleton while the ESV passage + per-user notes load.
export default function Loading() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4" aria-hidden>
      <div className="h-7 w-40 animate-pulse rounded-md bg-black/[.06] dark:bg-white/[.08]" />
      <div className="mt-2 flex flex-col gap-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="h-4 animate-pulse rounded bg-black/[.05] dark:bg-white/[.07]"
            style={{ width: `${70 + ((i * 7) % 30)}%` }}
          />
        ))}
      </div>
    </div>
  );
}
