"use client";

// Route-level error boundary — an unhandled error in a page (a failed ESV or
// WHOOP fetch, a DB blip) degrades to this instead of a blank crash.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
        Something went wrong
      </h1>
      <p className="max-w-sm text-zinc-600 dark:text-zinc-400">
        That didn&apos;t load. It&apos;s usually temporary — try again.
      </p>
      {error.digest && (
        <p className="font-mono text-xs text-zinc-400">ref: {error.digest}</p>
      )}
      <button
        type="button"
        onClick={reset}
        className="mt-2 rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white dark:bg-zinc-50 dark:text-black"
      >
        Try again
      </button>
    </main>
  );
}
