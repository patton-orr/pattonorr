import Link from "next/link";

export function AreaCard({
  href,
  title,
  desc,
}: {
  href: string;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-1 rounded-2xl border border-black/[.08] bg-white p-5 transition-colors hover:border-black/[.2] dark:border-white/[.145] dark:bg-black dark:hover:border-white/[.3]"
    >
      <span className="flex items-center gap-1 text-base font-medium text-black dark:text-zinc-50">
        {title}
        <span aria-hidden className="text-zinc-300 transition-transform group-hover:translate-x-0.5 dark:text-zinc-600">
          →
        </span>
      </span>
      <span className="text-sm text-zinc-500">{desc}</span>
    </Link>
  );
}
