import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <p className="text-sm font-medium tracking-wide text-zinc-500 uppercase">
        404
      </p>
      <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
        Page not found
      </h1>
      <p className="max-w-sm text-zinc-600 dark:text-zinc-400">
        That page doesn&apos;t exist, or you don&apos;t have access to it.
      </p>
      <Link
        href="/"
        className="mt-2 rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white dark:bg-zinc-50 dark:text-black"
      >
        Go home
      </Link>
    </main>
  );
}
